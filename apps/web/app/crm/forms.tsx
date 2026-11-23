'use client';

import { useActionState } from 'react';
import { login, saveCandidate, saveJob } from '../actions';

const actions = { login, candidate: saveCandidate, job: saveJob };

export function ActionForm({ action, children, submit, className = 'grid gap-4', secondary = false }: {
  action: keyof typeof actions; children: React.ReactNode; submit: string; className?: string; secondary?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(actions[action], { success: false, message: '' });
  return <form action={dispatch} className={className}>
    {children}
    <div className="sm:col-span-full">
      <button className={secondary ? 'min-h-11 cursor-pointer px-3 font-semibold underline' : 'button'} disabled={pending}>{pending ? 'Saving…' : submit}</button>
      {state.message && <p className={'mt-2 ' + (state.success ? 'text-green-800' : 'text-red-800')} role={state.success ? 'status' : 'alert'}>{state.message}</p>}
    </div>
  </form>;
}
