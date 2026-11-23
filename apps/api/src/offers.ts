import { ConflictException, NotFoundException } from '@nestjs/common';
import { OfferStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from './config';
import { uuid } from './domain';

export const offerInput = z.strictObject({
  id: uuid,
  position: z.string().trim().min(1).max(160),
  terms: z.string().trim().min(1).max(2000).optional(),
  responseDueAt: z.iso.datetime({ offset: true }).transform(value => new Date(value)).optional(),
});

export const offerOutcomeInput = z.strictObject({
  status: z.enum([OfferStatus.ACCEPTED, OfferStatus.DECLINED, OfferStatus.WITHDRAWN]),
  outcome: z.string().trim().min(1).max(1000).optional(),
});

export async function recordOffer(candidateId: string, actorId: string, input: z.infer<typeof offerInput>) {
  return db.$transaction(async tx => {
    if (!(await tx.candidate.findUnique({ where: { id: candidateId }, select: { id: true } }))) throw new NotFoundException();
    const created = await tx.candidateOffer.createMany({ data: [{ ...input, candidateId, authorId: actorId }], skipDuplicates: true });
    if (created.count) {
      await tx.audit.create({ data: { candidateId, actorId, subjectId: input.id, action: 'offer.recorded' } });
    } else {
      const saved = await tx.candidateOffer.findUnique({ where: { id: input.id } });
      if (!saved || saved.candidateId !== candidateId || saved.authorId !== actorId || saved.position !== input.position
        || saved.terms !== (input.terms ?? null) || saved.responseDueAt?.getTime() !== input.responseDueAt?.getTime()) {
        throw new ConflictException('That offer submission is already in use. Reload the page and try again.');
      }
    }
    return { id: input.id };
  });
}

export async function resolveOffer(candidateId: string, id: string, actorId: string, input: z.infer<typeof offerOutcomeInput>) {
  await db.$transaction(async tx => {
    const where = { id, candidateId };
    const outcome = input.outcome ?? null;
    const updated = await tx.candidateOffer.updateMany({
      where: { ...where, status: OfferStatus.OPEN },
      data: { status: input.status, outcome, resolvedAt: new Date() },
    });
    if (updated.count) {
      await tx.audit.create({ data: { candidateId, actorId, subjectId: id, action: 'offer.' + input.status.toLowerCase() } });
    } else {
      const saved = await tx.candidateOffer.findFirst({ where, select: { status: true, outcome: true } });
      if (!saved) throw new NotFoundException();
      if (saved.status !== input.status || saved.outcome !== outcome) {
        throw new ConflictException('This offer already has a result. Reload the candidate to see it.');
      }
    }
  });
  return { updated: true };
}
