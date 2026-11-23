import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type Job } from '../../../lib/api';
import { tracks } from '../../../lib/labels';

const readJob = cache(async (slug: string): Promise<Job> => {
  const response = await api('/jobs/' + encodeURIComponent(slug));
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Job listings are temporarily unavailable.');
  return response.json();
});
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };
export async function generateMetadata({ params }: Props) {
  const job = await readJob((await params).slug);
  return { title: job.title, description: job.requirements.slice(0, 160) };
}
export default async function JobPage({ params, searchParams }: Props) {
  const job = await readJob((await params).slug);
  const query = new URLSearchParams({ job: job.id });
  const search = await searchParams;
  for (const key of ['utm_source', 'utm_campaign', 'utm_medium']) {
    if (typeof search[key] === 'string') query.set(key, search[key].slice(0, 100));
  }
  return <section className="shell py-12">
    <Link className="underline" href="/jobs">← Open jobs</Link>
    <article className="panel mt-5 max-w-3xl">
      <p className="font-semibold">{tracks[job.track].label} · {job.region}</p>
      <h1 className="display my-4 text-4xl sm:text-5xl">{job.title}</h1>
      <dl className="grid gap-4">{Object.entries({
        Requirements: job.requirements, Schedule: job.schedule, Equipment: job.equipment, Compensation: job.compensation,
      }).map(([key, value]) => value && <div key={key}><dt className="font-bold">{key}</dt><dd className="whitespace-pre-wrap">{value}</dd></div>)}</dl>
      <Link className="button mt-6" href={'/' + tracks[job.track].slug + '?' + query}>Quick Apply</Link>
    </article>
  </section>;
}
