export const interviewFormats = { PHONE: 'Phone', VIDEO: 'Video', IN_PERSON: 'In person' };
export const interviewStatuses = {
  SCHEDULED: 'Scheduled', COMPLETED: 'Completed', NO_SHOW: 'No-show', CANCELED: 'Canceled',
};
export type Interview = {
  id: string;
  assigneeId: string;
  format: keyof typeof interviewFormats;
  status: keyof typeof interviewStatuses;
  scheduledAt: string;
  minutes: number;
  logistics: string | null;
  outcome: string | null;
  revision: number;
  assignee: { email: string };
};
