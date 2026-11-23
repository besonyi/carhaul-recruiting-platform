import { redirect } from 'next/navigation';
import { api } from '../../../lib/api';
import { ActionForm } from '../forms';

export default async function Login() {
  if ((await api('/crm/me', { auth: true })).ok) redirect('/crm');
  return <section className="panel mx-auto max-w-md">
    <h1 className="display mb-6 text-4xl">Recruiting sign in</h1>
    <ActionForm action="login" submit="Sign in">
      <label className="field">Work email<input name="email" type="email" autoComplete="username" required /></label>
      <label className="field">Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
      <label className="field">Authenticator code (if configured)
        <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} />
      </label>
    </ActionForm>
  </section>;
}
