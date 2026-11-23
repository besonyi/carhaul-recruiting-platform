'use client';

import { startTransition, useActionState, useId, useState } from 'react';
import { contactChannels, contactDirections, contactOutcomes } from '../../lib/contacts';
import { saveContact } from '../actions';
import { LocalDateTimeField } from './follow-up-fields';

function ContactFields() {
  const fieldId = useId();
  const [channel, setChannel] = useState('CALL');
  const [direction, setDirection] = useState('OUTBOUND');
  const outcomes = channel === 'CALL'
    ? { REACHED: contactOutcomes.REACHED, NO_RESPONSE: contactOutcomes.NO_RESPONSE, VOICEMAIL: contactOutcomes.VOICEMAIL }
    : direction === 'INBOUND' ? { MESSAGE_RECEIVED: contactOutcomes.MESSAGE_RECEIVED }
      : { MESSAGE_SENT: contactOutcomes.MESSAGE_SENT, NO_RESPONSE: contactOutcomes.NO_RESPONSE };
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div className="field"><label htmlFor={fieldId + '-channel'}>Channel</label>
      <select id={fieldId + '-channel'} name="channel" value={channel} onChange={event => setChannel(event.target.value)}>
        {Object.entries(contactChannels).map(([key, value]) => <option value={key} key={key}>{value}</option>)}
      </select></div>
      <div className="field"><label htmlFor={fieldId + '-direction'}>Direction</label>
      <select id={fieldId + '-direction'} name="direction" value={direction} onChange={event => setDirection(event.target.value)}>
        {Object.entries(contactDirections).map(([key, value]) => <option value={key} key={key}>{value}</option>)}
      </select></div>
      <div className="field"><label htmlFor={fieldId + '-outcome'}>Outcome</label>
      <select id={fieldId + '-outcome'} name="outcome" key={channel + direction}>
        {Object.entries(outcomes).map(([key, value]) => <option value={key} key={key}>{value}</option>)}
      </select></div>
    </div>
    <LocalDateTimeField name="occurredAt" label="Contact time (optional, defaults to now)" />
    <label className="field">Summary (optional)<textarea name="summary" maxLength={1000} /></label>
  </>;
}

export function ContactForm({ candidateId, initialId }: { candidateId: string; initialId: string }) {
  const [state, dispatch, pending] = useActionState(saveContact, { id: initialId, success: false, message: '' });
  return <form action={dispatch} className="grid gap-3" onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }}>
    <input type="hidden" name="candidateId" value={candidateId} />
    <ContactFields key={state.id} />
    <div><button className="button" disabled={pending}>Record contact</button></div>
    {state.message && <p className={state.success ? 'text-green-800' : 'text-red-800'} role={state.success ? 'status' : 'alert'}>{state.message}</p>}
  </form>;
}
