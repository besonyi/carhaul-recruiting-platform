import Link from 'next/link';
import { api } from '../../lib/api';
import { logout } from '../actions';

export const metadata = { title: 'Recruiting workspace', robots: { index: false, follow: false } };
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const response = await api('/crm/me', { auth: true });
  const user = response.ok ? await response.json() : null;
  return <div className="shell py-8">
    {user && <nav className="mb-6 flex flex-wrap items-center gap-5 border-b border-slate-300 pb-4 font-semibold" aria-label="Staff navigation">
      <Link href="/crm">Pipeline</Link>
      <Link href="/crm/follow-ups">My follow-ups</Link>
      <Link href="/crm/interviews">My interviews</Link>
      <Link href="/crm/report">Recruiting report</Link>
      {user.role === 'ADMIN' && <Link href="/crm/jobs">Manage jobs</Link>}
      <form action={logout} className="ml-auto"><button className="cursor-pointer underline">Sign out</button></form>
    </nav>}
    {children}
  </div>;
}
