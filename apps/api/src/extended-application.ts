import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Track } from '@prisma/client';
import { z } from 'zod';
import { db } from './config';
import { sessionHash, sessionToken } from './security';

const invitationLifetime = 72 * 60 * 60 * 1000;
const trailerType = z.enum(['STINGER_STEER', 'HIGH_MOUNT', 'WEDGE', 'OTHER']);
const companyDriver = z.strictObject({
  trailerTypes: z.array(trailerType).max(4).refine(values => new Set(values).size === values.length, 'Choose each trailer type once.'),
  loadsIndependently: z.boolean(),
  securesIndependently: z.boolean(),
  routePreference: z.enum(['LOCAL', 'REGIONAL', 'OVER_THE_ROAD', 'FLEXIBLE']),
});
const ownerOperator = z.strictObject({
  trailerType: z.enum([...trailerType.options, 'NONE']),
  capacity: z.number().int().min(1).max(99).optional(),
  truckYear: z.number().int().min(1900).max(new Date().getUTCFullYear() + 1).optional(),
  operatingModel: z.enum(['LEASE_ON', 'OWN_AUTHORITY', 'OPEN_TO_EITHER']),
}).refine(
  answers => (answers.trailerType === 'NONE') === (answers.capacity === undefined),
  { path: ['capacity'], message: 'Enter the vehicle capacity if you have a trailer.' },
);

export const extendedAnswers = {
  [Track.COMPANY_DRIVER]: companyDriver,
  [Track.OWNER_OPERATOR]: ownerOperator,
};

export const extendedProfileFields = {
  issuedAt: true, expiresAt: true, revokedAt: true, submittedAt: true, answers: true,
} as const;

const invalidInvitation = () => new UnauthorizedException('This invitation is unavailable. Ask recruiting for a current link.');

export async function issueInvitation(candidateId: string, actorId: string) {
  const token = sessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + invitationLifetime);
  const data = { invitationId: randomUUID(), tokenHash: sessionHash(token), issuedAt: now, expiresAt, revokedAt: null };

  await db.$transaction(async tx => {
    if (!(await tx.candidate.findUnique({ where: { id: candidateId }, select: { id: true } }))) throw new NotFoundException();
    const created = await tx.extendedApplication.createMany({ data: [{ candidateId, ...data }], skipDuplicates: true });
    if (!created.count) {
      const replaced = await tx.extendedApplication.updateMany({ where: { candidateId, submittedAt: null }, data });
      if (!replaced.count) throw new ConflictException('The extended application has already been submitted.');
    }
    await tx.audit.create({ data: { candidateId, actorId, action: 'extended.invited', subjectId: data.invitationId } });
  });
  return { token, expiresAt };
}

export async function revokeInvitation(candidateId: string, actorId: string) {
  await db.$transaction(async tx => {
    const now = new Date();
    const revoked = await tx.extendedApplication.updateManyAndReturn({
      where: { candidateId, revokedAt: null, submittedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now }, select: { invitationId: true },
    });
    if (!revoked.length) throw new ConflictException('There is no active invitation to revoke.');
    await tx.audit.create({ data: { candidateId, actorId, action: 'extended.revoked', subjectId: revoked[0].invitationId } });
  });
}

export async function invitationFor(token: string | undefined) {
  if (!token) throw invalidInvitation();
  const tokenHash = sessionHash(token);
  const invitation = await db.extendedApplication.findFirst({
    where: { tokenHash, revokedAt: null, submittedAt: null, expiresAt: { gt: new Date() } },
    select: { candidateId: true, invitationId: true, expiresAt: true, candidate: { select: { track: true } } },
  });
  if (!invitation) throw invalidInvitation();
  return { ...invitation, tokenHash };
}

export async function submitExtended(
  invitation: Awaited<ReturnType<typeof invitationFor>>,
  answers: z.infer<typeof companyDriver> | z.infer<typeof ownerOperator>,
) {
  const { candidateId, invitationId, tokenHash } = invitation;
  await db.$transaction(async tx => {
    const now = new Date();
    const submitted = await tx.extendedApplication.updateMany({
      where: { candidateId, invitationId, tokenHash, revokedAt: null, submittedAt: null, expiresAt: { gt: now } },
      data: { submittedAt: now, answers },
    });
    if (!submitted.count) throw invalidInvitation();
    await tx.audit.create({ data: { candidateId, action: 'extended.submitted', subjectId: invitationId } });
  });
  return { received: true };
}
