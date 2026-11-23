import { Prisma, Stage, Track } from '@prisma/client';
import { db } from './config';

export const reportPeriods = ['7', '30', '90'] as const;
export type ReportPeriod = (typeof reportPeriods)[number];

const dayMs = 86_400_000;
const sources = ['Search', 'Social', 'Job boards', 'Referral', 'Email', 'Other', 'Unattributed'] as const;
type Source = (typeof sources)[number];
type ReportRow = { stage: Stage; day: string; source: Source; total: bigint };

export function reportWindow(period: ReportPeriod, now: Date) {
  const days = Number(period);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = new Date(today - (days - 1) * dayMs);
  const trend = Array.from({ length: days }, (_, offset) => ({
    day: new Date(start.getTime() + offset * dayMs).toISOString().slice(0, 10),
    count: 0,
  }));
  return { start, end: now, trend };
}

export function summarizeReport(rows: ReportRow[], period: ReportPeriod, now: Date) {
  const { start, end, trend } = reportWindow(period, now);
  const byDay = new Map(trend.map(item => [item.day, item]));
  const byStage = Object.fromEntries(Object.values(Stage).map(stage => [stage, 0])) as Record<Stage, number>;
  const bySource = new Map<Source, number>(sources.map(source => [source, 0]));
  let candidates = 0;
  for (const row of rows) {
    const count = Number(row.total);
    candidates += count;
    byStage[row.stage] += count;
    bySource.set(row.source, (bySource.get(row.source) ?? 0) + count);
    const day = byDay.get(row.day);
    if (day) day.count += count;
  }
  return {
    from: start.toISOString(), through: end.toISOString(), candidates, hired: byStage.HIRED, byStage, trend,
    bySource: Array.from(bySource, ([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
  };
}

export async function recruitingReport(period: ReportPeriod, track?: Track) {
  const now = new Date();
  const { start, end } = reportWindow(period, now);
  const filter = track ? Prisma.sql`AND c."track" = ${track}::"Track"` : Prisma.empty;
  const [rows, applications] = await db.$transaction([
    db.$queryRaw<ReportRow[]>`
      SELECT c."stage", c."createdAt"::date::text AS day,
        CASE
          WHEN first.source IN ('google', 'bing', 'yahoo') THEN 'Search'
          WHEN first.source IN ('facebook', 'fb', 'instagram', 'ig', 'linkedin', 'tiktok') THEN 'Social'
          WHEN first.source IN ('indeed', 'ziprecruiter', 'driverpulse', 'tenstreet') THEN 'Job boards'
          WHEN first.source IN ('referral', 'driver-referral') THEN 'Referral'
          WHEN first.source IN ('email', 'newsletter') THEN 'Email'
          WHEN first.source IS NULL OR first.source = '' THEN 'Unattributed'
          ELSE 'Other'
        END AS source,
        count(*) AS total
      FROM "Candidate" c
      LEFT JOIN LATERAL (
        SELECT lower(btrim(a.details->>'source')) AS source
        FROM "Application" a
        WHERE a."candidateId" = c.id
        ORDER BY a."createdAt", a.id
        LIMIT 1
      ) AS first ON true
      WHERE c."createdAt" >= ${start} AND c."createdAt" < ${end}
      ${filter}
      GROUP BY 1, 2, 3
    `,
    db.application.count({
      where: { createdAt: { gte: start, lt: end }, ...(track ? { candidate: { track } } : {}) },
    }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { ...summarizeReport(rows, period, now), applications };
}
