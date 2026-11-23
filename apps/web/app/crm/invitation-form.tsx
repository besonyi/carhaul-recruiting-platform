'use client';

import { useActionState, useState } from 'react';
import { manageInvitation } from '../actions';

export function InvitationForm({ candidateId, active }: { candidateId: string; active: boolean }) {
  const [state, submit, pending] = useActionState(manageInvitation, { success: false, message: '' });
  const [copiedLink, setCopiedLink] = useState('');
  return <form action={submit} className="grid gap-3">
    <input type="hidden" name="id" value={candidateId} />
    <div className="flex flex-wrap items-center gap-4">
      <button className="button" name="intent" value="issue" disabled={pending}>{active ? 'Replace invitation' : 'Create invitation'}</button>
      {active && <button className="cursor-pointer font-semibold underline" name="intent" value="revoke" disabled={pending}>Revoke invitation</button>}
    </div>
    {state.message && <p role={state.success ? 'status' : 'alert'}>{state.message}</p>}
    {state.link && <div className="grid gap-2">
      <label className="field">Candidate invitation link<input readOnly value={state.link} onFocus={event => event.currentTarget.select()} /></label>
      <button type="button" className="justify-self-start cursor-pointer font-semibold underline" onClick={async () => {
        if (!state.link) return;
        try {
          await navigator.clipboard.writeText(state.link);
          setCopiedLink(state.link);
        } catch {
          setCopiedLink('');
        }
      }}>{copiedLink === state.link ? 'Copied' : 'Copy link'}</button>
    </div>}
  </form>;
}
