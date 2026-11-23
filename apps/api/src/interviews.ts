import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InterviewFormat, InterviewStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from './config';
import { uuid } from './domain';

const details = z.string().trim().min(1).max(1000).optional();
const scheduling = {
  assigneeId: uuid,
  format: z.enum(InterviewFormat),
  scheduledAt: z.iso.datetime({ offset: true }).transform(value => new Date(value)),
  minutes: z.number().int().min(1).max(1440),
  logistics: details,
};
const revision = z.number().int().min(0).max(2147483646);

export const scheduleInterviewInput = z.strictObject({ id: uuid, ...scheduling });
export const updateInterviewInput = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('reschedule'), revision, ...scheduling }),
  z.strictObject({
    action: z.literal('close'), revision,
    status: z.enum([InterviewStatus.COMPLETED, InterviewStatus.NO_SHOW, InterviewStatus.CANCELED]),
    outcome: details,
  }),
]);

async function ensureSchedule(tx: Prisma.TransactionClient, assigneeId: string, scheduledAt: Date) {
  if (scheduledAt.getTime() <= Date.now()) throw new BadRequestException('Choose an interview time in the future.');
  if (!(await tx.staff.findFirst({ where: { id: assigneeId, active: true }, select: { id: true } }))) {
    throw new BadRequestException('Select an active staff member.');
  }
}

export async function scheduleInterview(candidateId: string, actorId: string, input: z.infer<typeof scheduleInterviewInput>) {
  return db.$transaction(async tx => {
    if (!(await tx.candidate.findUnique({ where: { id: candidateId }, select: { id: true } }))) throw new NotFoundException();
    await ensureSchedule(tx, input.assigneeId, input.scheduledAt);
    const created = await tx.candidateInterview.createMany({ data: [{ ...input, candidateId }], skipDuplicates: true });
    if (created.count) {
      await tx.audit.create({ data: { candidateId, actorId, subjectId: input.id, action: 'interview.scheduled' } });
    } else {
      const saved = await tx.candidateInterview.findUnique({ where: { id: input.id } });
      if (!saved || saved.candidateId !== candidateId || saved.assigneeId !== input.assigneeId
        || saved.scheduledAt.getTime() !== input.scheduledAt.getTime() || saved.format !== input.format
        || saved.minutes !== input.minutes || saved.logistics !== (input.logistics ?? null)) {
        throw new ConflictException('That interview submission is already in use. Reload the page and try again.');
      }
    }
    return { id: input.id };
  });
}

export async function updateInterview(candidateId: string, id: string, actorId: string, input: z.infer<typeof updateInterviewInput>) {
  await db.$transaction(async tx => {
    const where = { id, candidateId, status: InterviewStatus.SCHEDULED, revision: input.revision };
    let data: Prisma.CandidateInterviewUncheckedUpdateManyInput;
    let action: string;
    if (input.action === 'reschedule') {
      await ensureSchedule(tx, input.assigneeId, input.scheduledAt);
      data = {
        assigneeId: input.assigneeId, scheduledAt: input.scheduledAt, format: input.format,
        minutes: input.minutes, logistics: input.logistics ?? null,
      };
      action = 'interview.rescheduled';
    } else {
      if (input.status === InterviewStatus.NO_SHOW) {
        const scheduled = await tx.candidateInterview.findFirst({
          where, select: { scheduledAt: true, minutes: true },
        });
        if (scheduled && scheduled.scheduledAt.getTime() + scheduled.minutes * 60_000 > Date.now()) {
          throw new BadRequestException('You can record a no-show after the scheduled interview ends.');
        }
      }
      data = { status: input.status, outcome: input.outcome ?? null };
      action = 'interview.' + input.status.toLowerCase();
    }
    const result = await tx.candidateInterview.updateMany({ where, data: { ...data, revision: { increment: 1 } } });
    if (!result.count) throw new ConflictException('This interview changed or closed. Reload the page and try again.');
    await tx.audit.create({ data: { candidateId, actorId, subjectId: id, action } });
  });
  return { updated: true };
}

export async function assignedInterviews(assigneeId: string, page: number) {
  const items = await db.candidateInterview.findMany({
    where: { assigneeId, status: InterviewStatus.SCHEDULED },
    orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true, scheduledAt: true, format: true, minutes: true,
      candidate: { select: { id: true, name: true } },
    },
    skip: (page - 1) * 50, take: 51,
  });
  return { items: items.slice(0, 50), hasNext: items.length > 50 };
}
