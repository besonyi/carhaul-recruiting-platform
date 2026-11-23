import { Role } from '@prisma/client';
import { db } from './config';
import { passwordHash } from './security';
import { z } from 'zod';

async function main() {
  const email = z.email().max(254).parse(process.argv[2]).toLowerCase();
  const role = z.enum(Role).parse(process.argv[3]);
  const password = process.env.STAFF_INITIAL_PASSWORD;
  if (!password || password.length < 14 || password.length > 256) throw new Error('Set STAFF_INITIAL_PASSWORD to a strong password of 14–256 characters.');
  const hash = await passwordHash(password);
  await db.$transaction(async tx => {
    const staff = await tx.staff.create({ data: { email, role, passwordHash: hash } });
    await tx.audit.create({ data: { action: 'staff.created', subjectId: staff.id, data: { role } } });
  });
  console.log('Staff account created.');
}
main().catch(() => { console.error('Could not create staff. Check input, database access and whether the email already exists.'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
