import { cookies } from 'next/headers';
import { api } from '../../lib/api';
import { invitationApiPath, invitationCookie, type InvitationContext } from '../../lib/invitation';
import { ContinueApplication } from './form';

export const metadata = { title: 'Continue your application', robots: { index: false, follow: false } };

export default async function ContinuePage() {
  const token = (await cookies()).get(invitationCookie)?.value;
  const response = token ? await api(invitationApiPath, { token }) : undefined;
  const context = response?.ok ? await response.json() as InvitationContext : undefined;

  return <section className="shell py-10"><div className="panel mx-auto max-w-2xl">
    <h1 className="display mb-5 text-4xl sm:text-5xl">Continue your application</h1>
    <ContinueApplication context={context} unavailable={Boolean(response && response.status >= 500)} />
  </div></section>;
}
