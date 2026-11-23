'use client';

import { startTransition, useActionState, useId } from 'react';
import { interviewFormats, type Interview } from '../../lib/interviews';
import { saveInterview } from '../actions';
import { LocalDateTimeField } from './follow-up-fields';

export function InterviewForm({ candidateId, initialId, staff, defaultAssignee, interview }: {
  candidateId: string;
  initialId: string;
  staff: Array<{ id: string; email: string }>;
  defaultAssignee?: string;
  interview?: Interview;
}) {
  const fieldId = useId();
  const [state, dispatch, pending] = useActionState(saveInterview, { id: initialId, success: false, message: '' });
  const assignee = interview?.assigneeId ?? defaultAssignee;
  return <form action={dispatch} className="grid gap-3" onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }}>
    <input type="hidden" name="candidateId" value={candidateId} />
    {interview && <>
      <input type="hidden" name="interviewId" value={interview.id} />
      <input type="hidden" name="revision" value={interview.revision} />
    </>}
    <div className="grid gap-3 sm:grid-cols-2" key={state.id + ':' + (interview?.revision ?? 0)}>
      <div className="field">
        <label htmlFor={fieldId + '-assignee'}>Interviewer</label>
        <select id={fieldId + '-assignee'} name="assigneeId" required defaultValue={staff.some(user => user.id === assignee) ? assignee : ''}>
          <option value="" disabled>Select staff member</option>
          {staff.map(user => <option key={user.id} value={user.id}>{user.email}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor={fieldId + '-format'}>Interview format</label>
        <select id={fieldId + '-format'} name="format" defaultValue={interview?.format ?? 'PHONE'}>
          {Object.entries(interviewFormats).map(([key, value]) => <option value={key} key={key}>{value}</option>)}
        </select>
      </div>
      <LocalDateTimeField name="scheduledAt" label="Interview start (your local time)" initial={interview?.scheduledAt} required />
      <label className="field">Duration (minutes)<input type="number" name="minutes" min={1} max={1440} defaultValue={interview?.minutes ?? 30} required /></label>
      <label className="field sm:col-span-2">Meeting details (optional)
        <textarea name="logistics" maxLength={1000} defaultValue={interview?.logistics ?? ''} />
      </label>
    </div>
    <div><button className="button" disabled={pending}>{interview ? 'Save new schedule' : 'Schedule interview'}</button></div>
    {state.message && <p className={state.success ? 'text-green-800' : 'text-red-800'} role={state.success ? 'status' : 'alert'}>{state.message}</p>}
  </form>;
}
