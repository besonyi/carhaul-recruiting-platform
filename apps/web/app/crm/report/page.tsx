import { staffData } from '../../../lib/api';
import { label, stages, tracks } from '../../../lib/labels';

type Report = {
  from: string;
  through: string;
  candidates: number;
  hired: number;
  applications: number;
  byStage: Record<string, number>;
  bySource: Array<{ source: string; count: number }>;
  trend: Array<{ day: string; count: number }>;
};

export const metadata = { title: 'Recruiting report' };

const periods = ['7', '30', '90'];
const counts = new Intl.NumberFormat('en-US');
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

function Breakdown({ title, rows }: { title: string; rows: Array<{ name: string; count: number }> }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return <section className="panel">
    <h2 className="text-xl font-extrabold">{title}</h2>
    <ul className="mt-4 grid gap-3 text-sm">
      {rows.map(({ name, count }) => <li key={name}>
        <div className="flex items-baseline justify-between gap-3">
          <span>{name}</span><span className="font-semibold tabular-nums">{counts.format(count)}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-200" aria-hidden>
          <div className="h-full bg-[#157384]" style={{ width: total ? (count / total * 100) + '%' : '0%' }} />
        </div>
      </li>)}
    </ul>
  </section>;
}

export default async function RecruitingReport({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const days = typeof params.days === 'string' && periods.includes(params.days) ? params.days : '30';
  const track = typeof params.track === 'string' && Object.hasOwn(tracks, params.track) ? params.track : '';
  const query = new URLSearchParams({ days });
  if (track) query.set('track', track);
  const data = await staffData<Report>('/report?' + query);
  const peak = Math.max(1, ...data.trend.map(item => item.count));
  const metrics = [
    { label: 'New candidates', value: data.candidates },
    { label: 'Quick applications received', value: data.applications },
    { label: 'Currently hired in this group', value: data.hired },
  ];
  return <section>
    <h1 className="display mb-3 text-4xl sm:text-5xl">Recruiting report</h1>
    <p className="max-w-3xl text-slate-700">
      Candidates first received in the selected period. Stage counts reflect their current status.
    </p>
    <form className="my-6 flex flex-wrap items-end gap-3">
      <label className="field grow sm:grow-0">Period
        <select name="days" defaultValue={days}>
          {periods.map(period => <option key={period} value={period}>Last {period} days</option>)}
        </select>
      </label>
      <label className="field grow sm:grow-0">Driving path
        <select name="track" defaultValue={track}>
          <option value="">All driving paths</option>
          {Object.entries(tracks).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
        </select>
      </label>
      <button className="button">Apply filters</button>
    </form>
    <p className="mb-3 text-sm text-slate-700">
      {fullDate.format(new Date(data.from))} through {fullDate.format(new Date(data.through))} UTC
    </p>
    <dl className="grid gap-3 sm:grid-cols-3">{metrics.map(metric => <div className="panel" key={metric.label}>
      <dt className="text-sm font-semibold text-slate-700">{metric.label}</dt>
      <dd className="mt-2 text-3xl font-bold tabular-nums">{counts.format(metric.value)}</dd>
    </div>)}</dl>
    <p className="mt-2 text-sm text-slate-700">Quick applications can include repeat submissions and applications from existing candidates.</p>

    <section className="panel my-5">
      <h2 className="text-xl font-extrabold">New candidates by day</h2>
      {data.candidates === 0 ? <p className="mt-3 text-slate-700">No new candidates for these filters.</p> : <>
        <div className="mt-4 flex h-32 items-end gap-px border-b border-slate-400 sm:gap-1" aria-hidden>
          {data.trend.map(item => <div className="flex h-full min-w-0 flex-1 items-end bg-slate-100"
            key={item.day} title={fullDate.format(new Date(item.day)) + ': ' + counts.format(item.count)}>
            <div className="w-full bg-[#157384]" style={{ height: (item.count / peak * 100) + '%' }} />
          </div>)}
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-700" aria-hidden>
          <span>{shortDate.format(new Date(data.trend[0].day))}</span>
          <span>{shortDate.format(new Date(data.trend.at(-1)!.day))}</span>
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold underline">View daily counts</summary>
          <table className="mt-2 w-full tabular-nums">
            <thead className="text-left"><tr><th scope="col">Date (UTC)</th><th scope="col" className="text-right">Candidates</th></tr></thead>
            <tbody>{data.trend.map(item => <tr key={item.day} className="border-t border-slate-200">
              <th scope="row" className="py-1 text-left font-normal">{fullDate.format(new Date(item.day))}</th>
              <td className="text-right">{counts.format(item.count)}</td>
            </tr>)}</tbody>
          </table>
        </details>
      </>}
    </section>
    <div className="grid gap-4 md:grid-cols-2">
      <Breakdown title="Current pipeline stages" rows={stages.map(stage => ({ name: label(stage), count: data.byStage[stage] ?? 0 }))} />
      <Breakdown title="First-application sources" rows={data.bySource.map(source => ({ name: source.source, count: source.count }))} />
    </div>
  </section>;
}
