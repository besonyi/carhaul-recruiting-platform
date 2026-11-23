import Link from 'next/link';
import { staffData } from '../../../lib/api';
import { interviewFormats } from '../../../lib/interviews';
import { LocalDateTime } from '../follow-up-fields';

type QueueItem = {
  id: string;
  format: keyof typeof interviewFormats;
  scheduledAt: string;
  minutes: number;
  candidate: { id: string; name: string };
};

export default async function MyInterviewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const requested = Number((await searchParams).page);
  const page = Number.isInteger(requested) && requested >= 1 && requested <= 10000 ? requested : 1;
  const { items, hasNext } = await staffData<{ items: QueueItem[]; hasNext: boolean }>('/interviews?page=' + page);
  const now = Date.now();
  return <section>
    <h1 className="display mb-6 text-4xl sm:text-5xl">My interviews</h1>
    {items.length === 0 && <p>No scheduled interviews on this page.</p>}
    <ul className="grid gap-3">
      {items.map(item => <li key={item.id} className="panel">
        <h2 className="text-lg font-bold"><Link className="underline" href={'/crm/candidates/' + item.candidate.id}>{item.candidate.name}</Link></h2>
        <p className="mt-1 text-sm">{interviewFormats[item.format]} · <LocalDateTime value={item.scheduledAt} /> · {item.minutes} min
          {Date.parse(item.scheduledAt) + item.minutes * 60_000 < now && <span className="ml-2 font-semibold">Outcome pending</span>}
        </p>
      </li>)}
    </ul>
    <nav className="mt-6 flex gap-5" aria-label="Interview pages">
      {page > 1 && <Link className="underline" href={'/crm/interviews?page=' + (page - 1)}>Previous page</Link>}
      {hasNext && page < 10000 && <Link className="underline" href={'/crm/interviews?page=' + (page + 1)}>Next page</Link>}
    </nav>
  </section>;
}
