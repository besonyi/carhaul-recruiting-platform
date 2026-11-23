'use client';

import { useEffect, useState } from 'react';

export function FollowUpDueField() {
  const [dueAt, setDueAt] = useState('');
  return <>
    <label className="field">Due date and time (your local time)
      <input required type="datetime-local" onChange={event => {
        const value = new Date(event.target.value);
        setDueAt(Number.isNaN(value.getTime()) ? '' : value.toISOString());
      }} />
    </label>
    <input type="hidden" name="dueAt" value={dueAt} />
  </>;
}

export function LocalDateTime({ value }: { value: string }) {
  const [local, setLocal] = useState(false);
  useEffect(() => setLocal(true), []);
  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: local ? undefined : 'UTC',
  });
  return <time dateTime={value}>{formatter.format(new Date(value))}{local ? '' : ' UTC'}</time>;
}
