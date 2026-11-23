'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { openInvitation, sendExtendedApplication } from '../actions';
import { operatingModels, ownerTrailers, routes, trailers, type InvitationContext } from '../../lib/invitation';
import { tracks } from '../../lib/labels';

export function ContinueApplication({ context, unavailable }: { context?: InvitationContext; unavailable: boolean }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const attempted = useRef<string>(null);
  const router = useRouter();

  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!token || attempted.current === token) return;
    attempted.current = token;
    setChecking(true);
    openInvitation(token).then(result => {
      if (result.success) {
        window.history.replaceState(null, '', window.location.pathname);
        router.refresh();
      } else {
        setError(result.message);
      }
    }).catch(() => setError('Could not open the invitation. Reload this link to try again.'))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) return <p role="status">Checking invitation…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (unavailable) return <p role="alert">Applications are temporarily unavailable. Try refreshing this page.</p>;
  if (!context) return <p>Open the invitation link shared by recruiting to continue.</p>;
  return <ExtendedForm key={context.invitationId} context={context} />;
}

function SelectField({ name, label, options, defaultValue = '', onChange }: {
  name: string; label: string; options: Record<string, string>; defaultValue?: string; onChange?: (value: string) => void;
}) {
  return <label className="field">{label}<select name={name} required defaultValue={defaultValue} onChange={event => onChange?.(event.target.value)}>
    <option value="" disabled>Select one</option>
    {Object.entries(options).map(([key, value]) => <option value={key} key={key}>{value}</option>)}
  </select></label>;
}

function ExtendedForm({ context }: { context: InvitationContext }) {
  const [state, submit, pending] = useActionState(sendExtendedApplication, {
    success: false, message: '', revision: context.revision, draftSavedAt: context.draftSavedAt,
  });
  const draft = context.draft;
  const [trailerType, setTrailerType] = useState(draft?.trailerType || '');
  const yesNo = { yes: 'Yes', no: 'No' };
  const yesNoValue = (answer?: boolean) => answer === undefined ? '' : answer ? 'yes' : 'no';
  return <form action={submit} className="grid gap-5" onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => submit(data));
  }}>
    <input type="hidden" name="invitationId" value={context.invitationId} />
    <input type="hidden" name="revision" value={state.revision} />
    <h2 className="text-xl font-bold">{tracks[context.track].label}</h2>
    {context.track === 'COMPANY_DRIVER' ? <>
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold">Trailer experience (select all that apply)</legend>
        {Object.entries(trailers).map(([key, value]) => <label key={key} className="flex items-center gap-2">
          <input type="checkbox" name="trailerTypes" value={key} defaultChecked={draft?.trailerTypes?.includes(key)} />{value}
        </label>)}
      </fieldset>
      <SelectField name="loadsIndependently" label="Can you load and unload vehicles independently?" options={yesNo} defaultValue={yesNoValue(draft?.loadsIndependently)} />
      <SelectField name="securesIndependently" label="Can you secure vehicles independently?" options={yesNo} defaultValue={yesNoValue(draft?.securesIndependently)} />
      <SelectField name="routePreference" label="Preferred route type" options={routes} defaultValue={draft?.routePreference} />
    </> : <>
      <SelectField name="trailerType" label="Trailer type" options={ownerTrailers} defaultValue={draft?.trailerType} onChange={setTrailerType} />
      {trailerType !== 'NONE' && <label className="field">Trailer capacity (vehicles)<input name="capacity" type="number" min={1} max={99} defaultValue={draft?.capacity} required /></label>}
      <label className="field">Truck model year (optional)<input name="truckYear" type="number" min={1900} max={new Date().getUTCFullYear() + 1} defaultValue={draft?.truckYear} /></label>
      <SelectField name="operatingModel" label="Preferred operating arrangement" options={operatingModels} defaultValue={draft?.operatingModel} />
    </>}
    {state.message
      ? <p role={state.success ? 'status' : 'alert'} className={state.success ? 'text-green-800' : 'text-red-800'}>{state.message}</p>
      : state.draftSavedAt && <p role="status">Saved draft loaded.</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button className="button" name="intent" value="submit" disabled={pending || state.stale}>Submit extended application</button>
      <button className="min-h-11 cursor-pointer rounded border border-slate-600 px-4 font-semibold disabled:opacity-50"
        name="intent" value="draft" formNoValidate disabled={pending || state.stale}>Save draft</button>
      {pending && <span role="status">Saving…</span>}
      {state.stale && <button className="cursor-pointer underline" type="button" onClick={() => window.location.reload()}>Reload saved draft</button>}
    </div>
  </form>;
}
