import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicationInput, jobInput, stageInput } from '../src/domain';
import { passwordHash, sessionHash, sessionToken, verifyPassword } from '../src/security';
import { extendedAnswers } from '../src/extended-application';

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
