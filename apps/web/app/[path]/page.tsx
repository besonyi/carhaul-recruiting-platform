import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { siteData, type Track } from '../../lib/api';
import { tracks } from '../../lib/labels';
import { Apply } from './quick-apply';

type Props = {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ job?: string; utm_source?: string; utm_campaign?: string; utm_medium?: string }>;
};
function trackFor(path: string) {
  return (Object.keys(tracks) as Track[]).find(track => tracks[track].slug === path);
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const track = trackFor(path);
  return { title: track ? tracks[track].label : 'Application privacy' };
}
export default async function Landing({ params, searchParams }: Props) {
  const { path } = await params;
  const track = trackFor(path);
  if (!track && path !== 'privacy') notFound();
  const { notice } = await siteData();
  if (!track) return <section className="shell py-12"><h1 className="display text-4xl">Application privacy</h1>
    <div className="panel mt-5 max-w-2xl">
      <p>Quick Apply collects contact and driving information for staff to review your interest and follow up about car hauling opportunities.</p>
      {notice && <p className="mt-4 whitespace-pre-wrap">{notice.statement}</p>}
    </div>
  </section>;
  const item = tracks[track];
  const query = await searchParams;
  return <>
    <section className="hero"><div className="shell py-12 sm:py-18">
      <p className="mb-4 font-bold uppercase tracking-widest text-amber-300">CDL-A · Auto Transport</p>
      <h1 className="display text-5xl uppercase sm:text-7xl">{item.label}</h1>
      <p className="mt-4 max-w-xl text-lg text-slate-200">{item.description}</p>
      <Link className="mt-6 inline-block font-bold underline" href={'/jobs?track=' + track}>Browse matching jobs</Link>
    </div></section>
    <section className="shell py-10"><div className="panel mx-auto max-w-3xl">
      <h2 className="display mb-5 text-3xl">Quick Apply</h2>
      {notice ? <Apply notice={notice} track={track} job={query.job} source={query.utm_source} campaign={query.utm_campaign} medium={query.utm_medium} />
        : <p>Online applications are currently unavailable.</p>}
    </div></section>
  </>;
}
