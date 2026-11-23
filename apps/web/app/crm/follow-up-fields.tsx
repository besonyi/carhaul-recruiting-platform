'use client';

import { useEffect, useRef, useState } from 'react';

export function LocalDateTimeField({ name, label, required, initial }: { name: string; label: string; required?: boolean; initial?: string }) {
  const [timestamp, setTimestamp] = useState(initial ?? '');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!initial || !input.current) return;
    const date = new Date(initial);
    input.current.value = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }, [initial]);
  return <>
    <label className="field">{label}
      <input ref={input} required={required} type="datetime-local" onChange={event => {
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
