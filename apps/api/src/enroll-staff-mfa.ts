import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { z } from 'zod';
import { db, mfaKey } from './config';
import { authenticatorKey, encryptMfaSecret, matchingTotpStep } from './staff-mfa';

class EnrollmentError extends Error {}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new EnrollmentError('Use a private interactive terminal to enroll staff MFA.');
  if (!mfaKey) throw new EnrollmentError('Configure STAFF_MFA_KEY before enrolling staff.');
  const email = z.email().max(254).parse(process.argv[2]).toLowerCase();
  const account = await db.staff.findFirst({
    where: { email, active: true }, select: { id: true, mfaCiphertext: true },
  });
  if (!account) throw new EnrollmentError('Active staff account not found.');

  const secret = randomBytes(20);
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let code: string;
  try {
    console.log('Add a time-based entry in the authenticator for Car Hauling Careers (' + email + ').');
    console.log('Setup key (displayed once): ' + authenticatorKey(secret));
    code = (await prompt.question('Enter the six-digit code from the authenticator: ')).trim();
  } finally {
    prompt.close();
  }
  const step = matchingTotpStep(secret, code);
  if (step === null) throw new EnrollmentError('The authenticator code did not match. Run enrollment again.');
  const mfaCiphertext = encryptMfaSecret(secret, mfaKey, account.id);
  await db.$transaction(async tx => {
    const enrolled = await tx.staff.updateMany({
      where: { id: account.id, active: true, mfaCiphertext: account.mfaCiphertext },
      data: { mfaCiphertext, mfaLastStep: step },
    });
    if (!enrolled.count) throw new EnrollmentError('The account changed during enrollment. Run enrollment again.');
    await tx.session.deleteMany({ where: { staffId: account.id } });
    await tx.audit.create({ data: { action: account.mfaCiphertext ? 'staff.mfaReplaced' : 'staff.mfaEnrolled', subjectId: account.id } });
  });
  console.log('Staff MFA is active. Sign in with the next code from the authenticator.');
}

main().catch(error => {
  if (error instanceof EnrollmentError) console.error(error.message);
  else if (error instanceof z.ZodError) console.error('Enter a valid staff email.');
  else console.error('Could not enroll MFA. Check the database connection and migrations.');
  process.exitCode = 1;
})
  .finally(() => db.$disconnect());
