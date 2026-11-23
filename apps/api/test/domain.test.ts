import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { applicationInput, followUpInput, jobInput, stageInput } from '../src/domain';
import { passwordHash, rateLimitClient, sessionHash, sessionToken, verifyPassword } from '../src/security';
import { draftAnswers, extendedAnswers, extendedSubmission } from '../src/extended-application';
import { authenticatorKey, decryptMfaSecret, encryptMfaSecret, matchingTotpStep, readMfaKey } from '../src/staff-mfa';
import { reportWindow, summarizeReport } from '../src/recruiting-report';

const applicant = {
  name: 'Test Applicant', phone: '(202) 555-0101', email: 'Applicant@example.test',
  cdl: 'ACTIVE_A', drivingYears: 7, haulingYears: 2, accepted: true,
  noticeVersion: 'test-v1', track: 'COMPANY_DRIVER',
};
test('normalizes contact details and validates qualification fields', () => {
  const parsed = applicationInput.parse(applicant);
  assert.equal(parsed.phone, '+12025550101');
  assert.equal(parsed.email, 'applicant@example.test');
  assert.equal(applicationInput.safeParse({ ...applicant, state: 'XX' }).success, false);
  assert.equal(applicationInput.safeParse({ ...applicant, haulingYears: 8 }).success, false);
});
test('requires consent and rejects out-of-scope applicant fields', () => {
  assert.equal(applicationInput.safeParse({ ...applicant, accepted: false }).success, false);
  assert.equal(applicationInput.safeParse({ ...applicant, ssn: 'synthetic' }).success, false);
  assert.equal(applicationInput.safeParse({ ...applicant, stage: 'HIRED' }).success, false);
});
test('requires ownership answers for owner operators only', () => {
  const owner = { ...applicant, track: 'OWNER_OPERATOR' };
  assert.equal(applicationInput.safeParse(owner).success, false);
  assert.equal(applicationInput.safeParse({ ...owner, ownsTruck: true, ownsTrailer: false }).success, true);
  assert.equal(applicationInput.safeParse({ ...applicant, ownsTruck: true }).success, false);
});
test('requires a reason for closed stages', () => {
  assert.equal(stageInput.safeParse({ previous: 'NEW_LEAD', stage: 'REJECTED' }).success, false);
  assert.equal(stageInput.safeParse({ previous: 'NEW_LEAD', stage: 'REJECTED', reason: 'Position filled' }).success, true);
  assert.equal(stageInput.safeParse({ previous: 'NEW_LEAD', stage: 'QUALIFIED' }).success, true);
});
test('validates job lifecycle fields without requiring compensation', () => {
  const job = { title: 'Test role', slug: 'test-role', track: 'COMPANY_DRIVER', region: 'Test',
    requirements: 'CDL-A', equipment: 'Car carrier', schedule: 'By arrangement', compensation: null, status: 'DRAFT' };
  assert.equal(jobInput.safeParse(job).success, true);
  assert.equal(jobInput.safeParse({ ...job, slug: '../test' }).success, false);
  assert.equal(jobInput.safeParse({ ...job, status: 'OPEN' }).success, false);
});
test('salts passwords, verifies credentials and hashes session tokens', async () => {
  const password = 'local-only test credential';
  const hash = await passwordHash(password);
  assert.notEqual(hash, await passwordHash(password));
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('incorrect', hash), false);
  assert.equal(await verifyPassword(password, 'invalid'), false);
  const token = sessionToken();
  assert.equal(token.length, 43);
  assert.equal(sessionHash(token).length, 64);
  assert.notEqual(token, sessionHash(token));
});

test('extended company driver answers support applicants with no trailer experience', () => {
  const answers = { trailerTypes: [], loadsIndependently: false, securesIndependently: false, routePreference: 'FLEXIBLE' };
  assert.equal(extendedAnswers.COMPANY_DRIVER.safeParse(answers).success, true);
  assert.equal(extendedAnswers.COMPANY_DRIVER.safeParse({ ...answers, trailerTypes: ['WEDGE', 'WEDGE'] }).success, false);
  assert.equal(extendedAnswers.COMPANY_DRIVER.safeParse({ ...answers, licenseNumber: 'fixture' }).success, false);
});

test('extended owner operator answers validate equipment and operating model', () => {
  const answers = { trailerType: 'HIGH_MOUNT', capacity: 7, truckYear: 2020, operatingModel: 'LEASE_ON' };
  assert.equal(extendedAnswers.OWNER_OPERATOR.safeParse(answers).success, true);
  assert.equal(extendedAnswers.OWNER_OPERATOR.safeParse({ ...answers, capacity: 0 }).success, false);
  assert.equal(extendedAnswers.OWNER_OPERATOR.safeParse({ ...answers, truckYear: 3000 }).success, false);
  assert.equal(extendedAnswers.OWNER_OPERATOR.safeParse({ ...answers, capacity: undefined }).success, false);
  assert.equal(extendedAnswers.OWNER_OPERATOR.safeParse({ trailerType: 'NONE', operatingModel: 'OPEN_TO_EITHER' }).success, true);
  assert.equal(extendedAnswers.OWNER_OPERATOR.safeParse({ ...answers, trailerType: 'NONE' }).success, false);
  assert.equal(extendedAnswers.COMPANY_DRIVER.safeParse(answers).success, false);
});

test('drafts preserve partial answers without allowing uncontrolled fields or final submission', () => {
  const draft = { loadsIndependently: false, trailerTypes: ['STINGER_STEER'] };
  assert.deepEqual(draftAnswers.COMPANY_DRIVER.parse(draft), draft);
  assert.equal(extendedAnswers.COMPANY_DRIVER.safeParse(draft).success, false);
  assert.equal(draftAnswers.COMPANY_DRIVER.safeParse({ ...draft, document: 'fixture' }).success, false);
  assert.equal(draftAnswers.OWNER_OPERATOR.safeParse({ trailerType: 'WEDGE' }).success, true);
  assert.equal(draftAnswers.OWNER_OPERATOR.safeParse({ trailerType: 'NONE', capacity: 5 }).success, false);
});

test('extended form writes validate draft revisions and support the initial revision', () => {
  const body = { invitationId: crypto.randomUUID(), answers: {} };
  assert.equal(extendedSubmission.parse(body).revision, 0);
  assert.equal(extendedSubmission.parse({ ...body, revision: 2 }).revision, 2);
  assert.equal(extendedSubmission.safeParse({ ...body, revision: -1 }).success, false);
});

test('follow-up times require an offset and normalize to an absolute timestamp', () => {
  const input = { title: '  Schedule a recruiting call  ', assigneeId: crypto.randomUUID(), dueAt: '2026-11-24T10:00:00-06:00' };
  const item = followUpInput.parse(input);
  assert.equal(item.title, 'Schedule a recruiting call');
  assert.equal(item.dueAt.toISOString(), '2026-11-24T16:00:00.000Z');
  assert.equal(followUpInput.safeParse({ ...input, dueAt: '2026-11-24T10:00:00' }).success, false);
  assert.equal(followUpInput.safeParse({ ...input, assigneeId: 'someone' }).success, false);
});

test('separates authenticated visitor quotas and falls back to the peer for unverified metadata', () => {
  const secret = 'test-only signing key';
  const peer = '10.0.0.2';
  const first = '192.0.2.10';
  const second = '2001:db8::20';
  const sign = (address: string) => createHmac('sha256', secret).update(address).digest('hex');
  const fallback = rateLimitClient(peer, undefined, undefined, secret);
  const firstClient = rateLimitClient(peer, first, sign(first), secret);
  assert.notEqual(firstClient, fallback);
  assert.notEqual(firstClient, rateLimitClient(peer, second, sign(second), secret));
  assert.equal(rateLimitClient(peer, first, sign(second), secret), fallback);
  assert.equal(rateLimitClient(peer, first, sign(first), undefined), fallback);
  assert.equal(rateLimitClient(peer, [first, second], sign(first), secret), fallback);
  assert.equal(rateLimitClient(peer, 'invalid', sign('invalid'), secret), fallback);
  assert.equal(firstClient.includes(first), false);
});

test('uses the RFC 6238 code vectors and accepts only nearby time steps', () => {
  const secret = Buffer.from('12345678901234567890');
  assert.equal(authenticatorKey(secret), 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.equal(matchingTotpStep(secret, '287082', 59_000), 1);
  assert.equal(matchingTotpStep(secret, '287082', 89_000), 1);
  assert.equal(matchingTotpStep(secret, '287082', 119_000), null);
  assert.equal(matchingTotpStep(secret, '081804', 1_111_111_109_000), 37_037_036);
});

test('binds encrypted authenticator secrets to the staff account and encryption key', () => {
  const key = Buffer.alloc(32, 1);
  const secret = Buffer.alloc(20, 5);
  const ciphertext = encryptMfaSecret(secret, key, 'staff-a');
  assert.notEqual(ciphertext, encryptMfaSecret(secret, key, 'staff-a'));
  assert.deepEqual(decryptMfaSecret(ciphertext, key, 'staff-a'), secret);
  assert.throws(() => decryptMfaSecret(ciphertext, key, 'staff-b'));
  assert.throws(() => decryptMfaSecret(ciphertext, Buffer.alloc(32, 2), 'staff-a'));
  assert.deepEqual(readMfaKey(key.toString('base64')), key);
  assert.throws(() => readMfaKey('too short'));
});

test('report windows include today and use UTC day boundaries', () => {
  const now = new Date('2026-11-02T01:00:00-04:00');
  const window = reportWindow('7', now);
  assert.equal(window.start.toISOString(), '2026-10-27T00:00:00.000Z');
  assert.equal(window.end.toISOString(), '2026-11-02T05:00:00.000Z');
  assert.equal(window.trend.length, 7);
  assert.equal(window.trend.at(-1)?.day, '2026-11-02');
});

test('report totals use cohort counts, current stages and zero-filled days', () => {
  const summary = summarizeReport([
    { stage: 'HIRED', day: '2026-11-01', source: 'Search', total: 2n },
    { stage: 'NEW_LEAD', day: '2026-11-01', source: 'Referral', total: 1n },
    { stage: 'QUALIFIED', day: '2026-11-02', source: 'Referral', total: 2n },
  ], '7', new Date('2026-11-02T16:00:00Z'));
  assert.equal(summary.candidates, 5);
  assert.equal(summary.hired, 2);
  assert.equal(summary.byStage.INTERVIEW, 0);
  assert.deepEqual(summary.bySource.slice(0, 2), [{ source: 'Referral', count: 3 }, { source: 'Search', count: 2 }]);
  assert.deepEqual(summary.trend.map(item => item.count), [0, 0, 0, 0, 0, 3, 2]);
});
