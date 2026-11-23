import { ContactChannel, ContactDirection, ContactOutcome, JobStatus, Stage, Track } from '@prisma/client';
import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const optional = (max: number) => text(max).optional();
export const uuid = z.uuid();
const state = z.enum('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const phone = z.string().max(32).transform(value => value.replace(/[().\s-]/g, ''))
  .pipe(z.string().regex(/^(?:\+?1)?[2-9]\d{2}[2-9]\d{6}$/))
  .transform(value => '+1' + value.slice(-10));
const base = {
  name: text(120), email: z.email().max(254).transform(value => value.toLowerCase()), phone,
  state: state.optional(), zip: z.string().regex(/^\d{5}$/).optional(),
  cdl: z.enum(['ACTIVE_A', 'A_PENDING', 'OTHER']),
  drivingYears: z.number().int().min(0).max(80),
  haulingYears: z.number().int().min(0).max(80),
  startDate: z.iso.date().optional(), routes: optional(160),
  jobId: uuid.optional(), accepted: z.literal(true), noticeVersion: text(80),
  source: optional(100), campaign: optional(100), medium: optional(100),
};
export const applicationInput = z.discriminatedUnion('track', [
  z.strictObject({ ...base, track: z.literal(Track.COMPANY_DRIVER) }),
  z.strictObject({
    ...base, track: z.literal(Track.OWNER_OPERATOR),
    ownsTruck: z.boolean(), ownsTrailer: z.boolean(), equipment: optional(160),
  }),
]).refine(value => value.haulingYears <= value.drivingYears, 'Car hauling experience must fit within driving experience.');
export const jobInput = z.strictObject({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text(140), track: z.enum(Track), region: text(120),
  requirements: text(4000), schedule: text(300), equipment: text(300),
  compensation: text(500).nullable(), status: z.enum(JobStatus),
});
export const closingStages = new Set<Stage>([Stage.REJECTED, Stage.WITHDRAWN, Stage.UNRESPONSIVE, Stage.DUPLICATE]);
export const stageInput = z.strictObject({
  stage: z.enum(Stage), reason: optional(500), previous: z.enum(Stage),
}).refine(value => !closingStages.has(value.stage) || Boolean(value.reason), 'A reason is required to close a candidate.');
export const staffLogin = z.strictObject({
  email: z.email().max(254), password: z.string().min(1).max(256),
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit authenticator code.').optional(),
});
export const noteInput = z.strictObject({ body: text(2000) });
export const contactInput = z.strictObject({
  id: uuid,
  channel: z.enum(ContactChannel),
  direction: z.enum(ContactDirection),
  outcome: z.enum(ContactOutcome),
  summary: optional(1000),
  occurredAt: z.iso.datetime({ offset: true }).transform(value => new Date(value))
    .refine(date => date.getTime() <= Date.now(), 'Contact time must be in the past.').optional(),
}).superRefine(({ channel, direction, outcome }, ctx) => {
  const call = channel === ContactChannel.CALL;
  if (outcome === ContactOutcome.VOICEMAIL && !call) {
    ctx.addIssue({ code: 'custom', path: ['outcome'], message: 'Voicemail requires a call.' });
  }
  if ((outcome === ContactOutcome.MESSAGE_SENT && (call || direction !== ContactDirection.OUTBOUND))
    || (outcome === ContactOutcome.MESSAGE_RECEIVED && (call || direction !== ContactDirection.INBOUND))) {
    ctx.addIssue({ code: 'custom', path: ['outcome'], message: 'Select an outcome that matches the channel and direction.' });
  }
});
export const assignmentInput = z.strictObject({ recruiterId: uuid.nullable() });
export const followUpInput = z.strictObject({
  title: text(160),
  assigneeId: uuid,
  dueAt: z.iso.datetime({ offset: true }).transform(value => new Date(value)),
});
