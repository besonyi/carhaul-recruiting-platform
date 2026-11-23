'use client';

import { startTransition, useActionState } from 'react';
import { saveOffer } from '../actions';
import { LocalDateTimeField } from './follow-up-fields';

export function OfferForm({ candidateId, initialId }: { candidateId: string; initialId: string }) {
  const [state, dispatch, pending] = useActionState(saveOffer, { id: initialId, success: false, message: '' });
  return <form action={dispatch} className="grid gap-3" onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }}>
    <input type="hidden" name="candidateId" value={candidateId} />
    <div className="grid gap-3 sm:grid-cols-2" key={state.id}>
      <label className="field">Offered position<input name="position" maxLength={160} required /></label>
      <LocalDateTimeField name="responseDueAt" label="Reply deadline (optional, your local time)" />
      <label className="field sm:col-span-2">Terms summary (optional)<textarea name="terms" maxLength={2000} /></label>
    </div>
    <div><button className="button" disabled={pending}>Record offer</button></div>
    {state.message && <p className={state.success ? 'text-green-800' : 'text-red-800'}
      role={state.success ? 'status' : 'alert'}>{state.message}</p>}
  </form>;
}
