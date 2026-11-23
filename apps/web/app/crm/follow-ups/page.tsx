import Link from 'next/link';
import { staffData } from '../../../lib/api';
import { LocalDateTime } from '../follow-up-fields';
import { ActionForm } from '../forms';

type QueueItem = { id: string; title: string; dueAt: string; candidate: { id: string; name: string } };

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const requestedPage = Number((await searchParams).page);
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 10000 ? requestedPage : 1;
  const { items, hasNext } = await staffData<{ items: QueueItem[]; hasNext: boolean }>('/follow-ups?page=' + page);
  const now = Date.now();

  return <section>
    <h1 className="display mb-6 text-4xl sm:text-5xl">My follow-ups</h1>
    {items.length === 0 && <p>No pending follow-ups on this page.</p>}
    <ul className="grid gap-3">
      {items.map(item => <li key={item.id} className="panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">{item.title}</h2>
          <Link className="underline" href={'/crm/candidates/' + item.candidate.id}>{item.candidate.name}</Link>
          <p className="mt-1 text-sm">Due <LocalDateTime value={item.dueAt} />
            {Date.parse(item.dueAt) < now && <span className="ml-2 font-bold text-red-800">Overdue</span>}
          </p>
        </div>
        <ActionForm action="candidate" submit="Mark complete">
          <input type="hidden" name="id" value={item.candidate.id} />
          <input type="hidden" name="followUpId" value={item.id} />
          <input type="hidden" name="action" value="complete-follow-up" />
        </ActionForm>
      </li>)}
    </ul>
    <nav className="mt-6 flex gap-5" aria-label="Follow-up pages">
      {page > 1 && <Link className="underline" href={'/crm/follow-ups?page=' + (page - 1)}>Previous page</Link>}
      {hasNext && page < 10000 && <Link className="underline" href={'/crm/follow-ups?page=' + (page + 1)}>Next page</Link>}
    </nav>
  </section>;
}
