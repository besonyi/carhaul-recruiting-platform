'use client';

import { startTransition, useActionState } from 'react';
import { submitApplication } from '../actions';
import type { Track } from '../../lib/api';

export function Apply({ notice, track, job, source, campaign, medium }: {
  notice: { version: string; statement: string; agreement: string }; track: Track;
  job?: string; source?: string; campaign?: string; medium?: string;
}) {
  const [result, submit, pending] = useActionState(submitApplication, { message: '', success: false });
  if (result.success) return <p className="text-lg" role="status">Application received. Thank you for your interest.</p>;
  return <form action={submit} className="grid gap-4 sm:grid-cols-2" onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => submit(data));
  }}>
    <input type="hidden" name="track" value={track} /><input type="hidden" name="jobId" value={job || ''} />
    <input type="hidden" name="noticeVersion" value={notice.version} />
    <input type="hidden" name="source" value={source || ''} /><input type="hidden" name="campaign" value={campaign || ''} />
    <input type="hidden" name="medium" value={medium || ''} />
    <label className="field">Full name<input name="name" required maxLength={120} autoComplete="name" /></label>
    <label className="field">Phone<input name="phone" required type="tel" maxLength={32} autoComplete="tel" /></label>
    <label className="field">Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
    <label className="field">State (optional)<input name="state" placeholder="TX" maxLength={2} autoComplete="address-level1" /></label>
    <label className="field">ZIP code (optional)<input name="zip" inputMode="numeric" pattern="[0-9]{5}" autoComplete="postal-code" /></label>
    <label className="field">CDL status<select name="cdl" required defaultValue=""><option value="" disabled>Select status</option><option value="ACTIVE_A">Active CDL-A</option><option value="A_PENDING">CDL-A pending</option><option value="OTHER">Other</option></select></label>
    <label className="field">Years driving commercially<input name="drivingYears" required type="number" min={0} max={80} /></label>
    <label className="field">Years hauling cars<input name="haulingYears" required type="number" min={0} max={80} /></label>
    <label className="field">Available start date (optional)<input name="startDate" type="date" /></label>
    <label className="field">Preferred routes (optional)<input name="routes" maxLength={160} /></label>
    {track === 'OWNER_OPERATOR' && <>
      <label className="field">Own a truck?<select name="ownsTruck" required defaultValue=""><option value="" disabled>Select one</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      <label className="field">Own a trailer?<select name="ownsTrailer" required defaultValue=""><option value="" disabled>Select one</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      <label className="field sm:col-span-2">Equipment type (optional)<input name="equipment" maxLength={160} /></label>
    </>}
    <div className="sm:col-span-2">
      <p className="mb-3 whitespace-pre-wrap text-sm text-slate-700" id="notice">{notice.statement}</p>
      <label className="flex items-start gap-2"><input className="mt-1 size-4" type="checkbox" name="accepted" required aria-describedby="notice" />{notice.agreement}</label>
    </div>
    {result.message && <p role="alert" className="text-red-800 sm:col-span-2">{result.message}</p>}
    <div className="sm:col-span-2"><button className="button" disabled={pending}>{pending ? 'Submitting…' : 'Submit application'}</button></div>
  </form>;
}
