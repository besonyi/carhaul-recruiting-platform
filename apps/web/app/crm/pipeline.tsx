'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { searchPipeline } from '../actions';
import type { Track } from '../../lib/api';
import { label, stages, tracks } from '../../lib/labels';

type Candidate = { id: string; name: string; stage: string; state?: string; track: Track };
export type PipelineData = { candidates: Candidate[]; counts: Record<string, number> };
export type PipelineState = {
  data: PipelineData;
  page: number;
  filters: { q?: string; track?: string };
  message?: string;
};

export function Pipeline({ initial }: { initial: PipelineData }) {
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState('');
  const [state, submit, pending] = useActionState(searchPipeline, { data: initial, page: 1, filters: {} });
  const { candidates, counts } = state.data;
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return <section>
    <h1 className="display text-5xl">Recruitment pipeline</h1>
    <p className="mt-2 text-slate-700" role="status">{total} matching candidates</p>
    <form action={submit} className="my-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="field">Search candidates<input name="q" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, email, phone or state" maxLength={120} /></label>
      <label className="field">Driving path<select name="track" value={track} onChange={event => setTrack(event.target.value)}><option value="">All paths</option>{Object.entries(tracks).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
      <button className="button" disabled={pending}>{pending ? 'Searching…' : 'Search'}</button>
      {state.message && <p className="text-red-800 sm:col-span-full" role="alert">{state.message}</p>}
    </form>
    {(state.page > 1 || (total > state.page * 50 && state.page < 10000)) &&
      <form action={submit} aria-label="Candidate result pages" className="mb-6 flex flex-wrap items-center gap-4">
        {state.page > 1 && <button className="cursor-pointer underline" name="page" value={state.page - 1} disabled={pending}>Previous page</button>}
        <span>Page {state.page}</span>
        {total > state.page * 50 && state.page < 10000 && <button className="cursor-pointer underline" name="page" value={state.page + 1} disabled={pending}>Next page</button>}
      </form>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stages.map(stage => <section key={stage} className="panel">
      <h2 className="font-extrabold">{label(stage)} <span className="text-slate-600">· {counts[stage] || 0}</span></h2>
      <ul className="mt-3 grid gap-2">{candidates.filter(candidate => candidate.stage === stage).map(candidate => <li key={candidate.id} className="rounded bg-slate-100 p-3">
        <Link className="font-semibold underline" href={'/crm/candidates/' + candidate.id}>{candidate.name}</Link>
        <p className="text-sm">{tracks[candidate.track].label}{candidate.state ? ' · ' + candidate.state : ''}</p>
      </li>)}</ul>
    </section>)}</div>
  </section>;
}
