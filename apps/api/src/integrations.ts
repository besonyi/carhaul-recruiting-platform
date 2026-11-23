import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 1, enableOfflineQueue: false,
});

export async function withinLimit(key: string, limit: number, seconds: number) {
  const count = await redis.eval(
    "local n = redis.call('incr', KEYS[1]); if n == 1 then redis.call('expire', KEYS[1], ARGV[1]) end; return n",
    1, 'recruiting:limit:' + key, seconds,
  );
  return Number(count) <= limit;
}

// Future workers receive record IDs and look up only authorized data.
export type RecruitingEvent =
  | { kind: 'application.received'; applicationId: string }
  | { kind: 'candidate.stageChanged'; candidateId: string };
export const recruitingQueue = () => new Queue<RecruitingEvent>('recruiting', { connection: redis.duplicate() });

// AI produces review material. Pipeline mutations remain staff-only.
export interface RecruitingAssistant {
  summarize(input: { experience: string; equipment?: string }): Promise<{ summary: string }>;
}
