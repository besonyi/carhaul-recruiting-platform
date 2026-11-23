'use client';

import { useEffect, useState } from 'react';

export function LocalDateTimeField({ name, label, required }: { name: string; label: string; required?: boolean }) {
  const [timestamp, setTimestamp] = useState('');
  return <>
    <label className="field">{label}
      <input required={required} type="datetime-local" onChange={event => {
        const value = new Date(event.target.value);
        setTimestamp(Number.isNaN(value.getTime()) ? '' : value.toISOString());
      }} />
    </label>
    <input type="hidden" name={name} value={timestamp} />
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
