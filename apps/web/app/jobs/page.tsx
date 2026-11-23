import Link from 'next/link';
import { api, type Job } from '../../lib/api';
import { tracks } from '../../lib/labels';

export const metadata = { title: 'Open jobs' };
export default async function Jobs({ searchParams }: { searchParams: Promise<{ track?: string; region?: string; utm_source?: string; utm_campaign?: string; utm_medium?: string }> }) {
  const { track, region, ...utm } = await searchParams;
  const query = new URLSearchParams();
  if (track && Object.hasOwn(tracks, track)) query.set('track', track);
  if (region) query.set('region', region.slice(0, 120));
  const tracking = new URLSearchParams();
  for (const [key, value] of Object.entries(utm)) if (key.startsWith('utm_') && typeof value === 'string') tracking.set(key, value.slice(0, 100));
  const response = await api('/jobs?' + query);
  const jobs: Job[] = response.ok ? await response.json() : [];
  return <section className="shell py-12">
    <h1 className="display text-5xl uppercase">Open jobs</h1>
    <form className="my-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {Array.from(tracking).map(([key, value]) => <input type="hidden" key={key} name={key} value={value} />)}
      <label className="field">Driving path<select name="track" defaultValue={query.get('track') || ''}><option value="">All opportunities</option>{Object.entries(tracks).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
      <label className="field">Hiring region<input name="region" defaultValue={region} maxLength={120} /></label>
      <button className="button">Filter jobs</button>
    </form>
    {!response.ok && <p role="status">Job listings are temporarily unavailable.</p>}
    {response.ok && !jobs.length && <p>No published jobs match your search.</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{jobs.map(job => <article className="panel" key={job.id}>
      <p className="text-sm font-semibold text-slate-700">{tracks[job.track].label} · {job.region}</p>
      <h2 className="my-2 text-xl font-extrabold"><Link className="underline" href={'/jobs/' + job.slug + (tracking.size ? '?' + tracking : '')}>{job.title}</Link></h2>
      <p>{job.schedule}</p>
    </article>)}</div>
  </section>;
}
