import { redirect } from 'next/navigation';
import { staffData, type Job } from '../../../lib/api';
import { label, tracks } from '../../../lib/labels';
import { ActionForm } from '../forms';

function JobForm({ job }: { job?: Job }) {
  return <ActionForm action="job" submit={job ? 'Save changes' : 'Create job'} className="mt-4 grid gap-4 sm:grid-cols-2">
    {job && <input type="hidden" name="id" value={job.id} />}
    <label className="field">Job title<input name="title" required maxLength={140} defaultValue={job?.title} /></label>
    <label className="field">URL slug<input name="slug" required minLength={3} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={job?.slug} /></label>
    <label className="field">Driving path<select name="track" defaultValue={job?.track}>{Object.entries(tracks).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
    <label className="field">Hiring region<input name="region" required defaultValue={job?.region} maxLength={120} /></label>
    <label className="field sm:col-span-2">Requirements<textarea name="requirements" required defaultValue={job?.requirements} maxLength={4000} /></label>
    <label className="field">Schedule<input name="schedule" required defaultValue={job?.schedule} maxLength={300} /></label>
    <label className="field">Equipment<input name="equipment" required defaultValue={job?.equipment} maxLength={300} /></label>
    <label className="field">Verified compensation (optional)<input name="compensation" defaultValue={job?.compensation || ''} maxLength={500} /></label>
    <label className="field">Status<select name="status" defaultValue={job?.status || 'DRAFT'}>{['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'].map(status => <option key={status} value={status}>{label(status)}</option>)}</select></label>
  </ActionForm>;
}

export default async function ManageJobs() {
  const user = await staffData<{ role: string }>('/me');
  if (user.role !== 'ADMIN') redirect('/crm');
  const jobs = await staffData<Job[]>('/jobs');
  return <section>
    <h1 className="display mb-6 text-5xl">Manage jobs</h1>
    <details className="panel mb-4"><summary className="cursor-pointer text-xl font-extrabold">Create a job</summary><JobForm /></details>
    <div className="grid gap-3">{jobs.map(job => <details className="panel" key={job.id}>
      <summary className="cursor-pointer font-extrabold">{job.title} · {label(job.status || 'DRAFT')}</summary><JobForm job={job} />
    </details>)}</div>
  </section>;
}
