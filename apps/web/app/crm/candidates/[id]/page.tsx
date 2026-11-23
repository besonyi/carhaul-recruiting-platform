import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { notFound, redirect } from 'next/navigation';
import { api, staffData, type Track } from '../../../../lib/api';
import { contactChannels, contactDirections, contactOutcomes } from '../../../../lib/contacts';
import { interviewFormats, interviewStatuses, type Interview } from '../../../../lib/interviews';
import { operatingModels, ownerTrailers, routes } from '../../../../lib/invitation';
import { label, stages, tracks } from '../../../../lib/labels';
import { ActionForm } from '../../forms';
import { LocalDateTimeField, LocalDateTime } from '../../follow-up-fields';
import { ContactForm } from '../../contact-form';
import { InterviewForm } from '../../interview-form';
import { OfferForm } from '../../offer-form';
import { InvitationForm } from '../../invitation-form';

type Profile = {
  id: string; name: string; email: string; phone: string; state?: string; zip?: string;
  stage: string; stageReason?: string; track: Track; recruiterId?: string;
  applications: Array<{ id: string; createdAt: string; job?: { title: string }; details: Record<string, unknown>; consent?: { version: string; statement: string; acceptedAt: string } }>;
  extendedApplication: { expiresAt: string; revokedAt?: string; submittedAt?: string; draftSavedAt?: string; answers?: Record<string, unknown> } | null;
  notes: Array<{ id: string; body: string; authorId: string; createdAt: string }>;
  contacts: Array<{
    id: string; channel: keyof typeof contactChannels; direction: keyof typeof contactDirections;
    outcome: keyof typeof contactOutcomes; summary: string | null; occurredAt: string; author: { email: string };
  }>;
  interviews: Interview[];
  offers?: Array<{
    id: string; position: string; terms: string | null; responseDueAt: string | null; createdAt: string;
    status: 'OPEN' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'; resolvedAt: string | null;
    outcome: string | null; author: { email: string };
  }>;
  followUps: Array<{ id: string; title: string; assigneeId: string; dueAt: string; completedAt: string | null; canceledAt: string | null }>;
  audit: Array<{ id: string; action: string; actorId?: string; createdAt: string; data?: { previous?: string; stage?: string; reason?: string; recruiterId?: string } }>;
};
const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)) + ' UTC';
const fields = {
  name: 'Full name', email: 'Email', phone: 'Phone', state: 'State', zip: 'ZIP', cdl: 'CDL status',
  drivingYears: 'Commercial driving (years)', haulingYears: 'Car hauling (years)', startDate: 'Available from',
  routes: 'Preferred routes', ownsTruck: 'Owns truck', ownsTrailer: 'Owns trailer', equipment: 'Equipment',
  source: 'Source', medium: 'Medium', campaign: 'Campaign',
};
const actions: Record<string, string> = {
  'application.received': 'Application received', 'candidate.stageChanged': 'Stage changed',
  'candidate.assigned': 'Assignment changed', 'candidate.noteAdded': 'Note added',
  'candidate.contactLogged': 'Contact recorded',
  'extended.invited': 'Extended application invitation created',
  'extended.revoked': 'Extended application invitation revoked',
  'extended.submitted': 'Extended application submitted',
  'extended.draftStarted': 'Candidate started an extended application draft',
  'followUp.created': 'Follow-up scheduled',
  'followUp.completed': 'Follow-up completed',
  'followUp.canceled': 'Follow-up canceled',
  'interview.scheduled': 'Interview scheduled',
  'interview.rescheduled': 'Interview rescheduled',
  'interview.completed': 'Interview completed',
  'interview.no_show': 'Interview recorded as no-show',
  'interview.canceled': 'Interview canceled',
  'offer.recorded': 'Offer recorded',
  'offer.accepted': 'Offer accepted',
  'offer.declined': 'Offer declined',
  'offer.withdrawn': 'Offer withdrawn',
};
const extendedFields = {
  trailerTypes: 'Trailer experience', loadsIndependently: 'Can load and unload independently',
  securesIndependently: 'Can secure vehicles independently', routePreference: 'Preferred route',
  trailerType: 'Trailer type', capacity: 'Trailer capacity (vehicles)', truckYear: 'Truck model year',
  operatingModel: 'Preferred operating arrangement',
};
const answerLabels: Record<string, string> = { ...ownerTrailers, ...routes, ...operatingModels };

function formatAnswer(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(item => answerLabels[String(item)] || String(item)).join(', ') || 'None selected';
  return answerLabels[String(value)] || String(value);
}

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await api('/crm/candidates/' + encodeURIComponent(id), { auth: true });
  if (response.status === 401) redirect('/crm/login');
  if (response.status === 404 || response.status === 400) notFound();
  if (!response.ok) throw new Error('Could not load candidate.');
  const candidate: Profile = await response.json();
  const staff = await staffData<Array<{ id: string; email: string }>>('/staff');
  const person = (staffId?: string) => staff.find(user => user.id === staffId)?.email || 'Staff member';
  const extended = candidate.extendedApplication;
  const offers = candidate.offers ?? [];
  const invitationActive = Boolean(extended && !extended.revokedAt && !extended.submittedAt && Date.parse(extended.expiresAt) > Date.now());
  return <div>
    <Link className="underline" href="/crm">← Recruitment pipeline</Link>
    <h1 className="display mb-2 mt-4 text-5xl">{candidate.name}</h1>
    <p className="mb-6">{tracks[candidate.track].label} · {label(candidate.stage)}</p>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="panel"><h2 className="mb-3 text-xl font-extrabold">Contact</h2>
        <p><a className="underline" href={'tel:' + candidate.phone}>{candidate.phone}</a></p>
        <p><a className="underline" href={'mailto:' + candidate.email}>{candidate.email}</a></p>
        <p>{[candidate.state, candidate.zip].filter(Boolean).join(' ')}</p>
        <h3 className="my-3 font-bold">Recruiter assignment</h3>
        <ActionForm action="candidate" submit="Save assignment">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="assignment" />
          <label className="field">Assigned to<select name="recruiterId" defaultValue={candidate.recruiterId || ''}><option value="">Unassigned</option>
            {staff.map(user => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label>
        </ActionForm>
      </section>
      <section className="panel"><h2 className="mb-3 text-xl font-extrabold">Pipeline stage</h2>
        {candidate.stageReason && <p className="mb-3"><strong>Current reason</strong> {candidate.stageReason}</p>}
        <ActionForm key={candidate.stage} action="candidate" submit="Update stage">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="stage" />
          <input type="hidden" name="previous" value={candidate.stage} />
          <label className="field">Stage<select name="stage" defaultValue={candidate.stage}>{stages.map(stage => <option key={stage} value={stage}>{label(stage)}</option>)}</select></label>
          <label className="field">Reason (required for closed applications)<textarea name="reason" maxLength={500} /></label>
        </ActionForm>
      </section>
      <section className="panel"><h2 className="mb-3 text-xl font-extrabold">Applications</h2>
        {candidate.applications.map(item => <details key={item.id} className="border-b border-slate-200 py-3">
          <summary className="cursor-pointer font-semibold">{item.job?.title || 'General application'} · {formatDate(item.createdAt)}</summary>
          <dl className="my-3 grid gap-2">{Object.entries(fields).map(([key, title]) => {
            const value = item.details[key];
            if (value === undefined || value === null) return null;
            return <div key={key}><dt className="font-bold">{title}</dt><dd>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : key === 'cdl' ? label(String(value)) : String(value)}</dd></div>;
          })}</dl>
          {item.consent && <p className="whitespace-pre-wrap text-sm"><strong>Consent {item.consent.version}</strong> · {formatDate(item.consent.acceptedAt)}<br />{item.consent.statement}</p>}
        </details>)}
      </section>
      <section className="panel"><h2 className="mb-3 text-xl font-extrabold">Extended application</h2>
        {extended?.submittedAt ? <>
          <p>Submitted {formatDate(extended.submittedAt)}</p>
          <dl className="mt-3 grid gap-2">{Object.entries(extendedFields).map(([key, title]) => {
            const value = extended.answers?.[key];
            if (value === undefined || value === null) return null;
            return <div key={key}><dt className="font-bold">{title}</dt><dd>{formatAnswer(value)}</dd></div>;
          })}</dl>
        </> : <>
          {extended?.draftSavedAt && <p className="mb-2 font-semibold">Draft last saved {formatDate(extended.draftSavedAt)}</p>}
          <p className="mb-3">{invitationActive && extended ? 'Invitation expires ' + formatDate(extended.expiresAt)
            : extended?.revokedAt ? 'The last invitation was revoked.'
            : extended ? 'The last invitation expired.' : 'No invitation issued.'}</p>
          <InvitationForm candidateId={id} active={invitationActive} />
        </>}
      </section>
      <section className="panel"><h2 className="mb-3 text-xl font-extrabold">Recruiter notes</h2>
        <ActionForm action="candidate" submit="Add note">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="notes" />
          <label className="field">New note<textarea name="body" required maxLength={2000} /></label>
        </ActionForm>
        {candidate.notes.map(note => <article key={note.id} className="mt-4 border-t border-slate-200 pt-3">
          <p className="text-sm font-semibold">{person(note.authorId)} · {formatDate(note.createdAt)}</p><p className="whitespace-pre-wrap">{note.body}</p>
        </article>)}
      </section>
      <section className="panel lg:col-span-2"><h2 className="mb-3 text-xl font-extrabold">Contact history</h2>
        <ContactForm candidateId={id} initialId={randomUUID()} />
        {candidate.contacts.length === 0 && <p className="mt-4 text-sm text-slate-700">No contacts recorded yet.</p>}
        <ul className="mt-4 grid gap-3">{candidate.contacts.map(item => <li key={item.id} className="border-t border-slate-200 pt-3">
          <p className="font-bold">{contactChannels[item.channel]} · {contactDirections[item.direction]} · {contactOutcomes[item.outcome]}</p>
          <p className="break-words text-sm text-slate-700"><LocalDateTime value={item.occurredAt} /> · {item.author.email}</p>
          {item.summary && <p className="mt-1 whitespace-pre-wrap wrap-anywhere">{item.summary}</p>}
        </li>)}</ul>
      </section>
      <section className="panel lg:col-span-2"><h2 className="mb-3 text-xl font-extrabold">Interviews</h2>
        <details className="mb-4">
          <summary className="cursor-pointer font-semibold underline">New interview</summary>
          <div className="mt-3"><InterviewForm candidateId={id} initialId={randomUUID()} staff={staff} defaultAssignee={candidate.recruiterId} /></div>
        </details>
        {candidate.interviews.length === 0 && <p className="text-sm text-slate-700">No interviews recorded yet.</p>}
        <ul className="grid gap-4">{candidate.interviews.map(item => <li key={item.id} className="border-t border-slate-200 pt-3">
          <p className="font-bold">{interviewFormats[item.format]} interview · {interviewStatuses[item.status]}</p>
          <p className="break-words text-sm text-slate-700">
            <LocalDateTime value={item.scheduledAt} /> · {item.minutes} min · {item.assignee.email}
          </p>
          {item.logistics && <p className="mt-2 whitespace-pre-wrap wrap-anywhere">{item.logistics}</p>}
          {item.outcome && <p className="mt-2 whitespace-pre-wrap wrap-anywhere">{item.outcome}</p>}
          {item.status === 'SCHEDULED' && <div className="mt-3 grid gap-2">
            <details><summary className="cursor-pointer font-semibold underline">Reschedule interview</summary>
              <div className="mt-3"><InterviewForm candidateId={id} initialId={item.id} staff={staff} interview={item} /></div>
            </details>
            <details><summary className="cursor-pointer font-semibold underline">Record interview outcome</summary>
              <ActionForm key={item.revision} action="candidate" submit="Save outcome" className="mt-3 grid gap-3">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="action" value="interview-outcome" />
                <input type="hidden" name="interviewId" value={item.id} />
                <input type="hidden" name="revision" value={item.revision} />
                <label className="field">Interview result<select name="status" defaultValue="" required>
                  <option value="" disabled>Select a result</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="NO_SHOW">No-show</option>
                  <option value="CANCELED">Canceled</option>
                </select></label>
                <label className="field">Outcome notes (optional)<textarea name="outcome" maxLength={1000} /></label>
              </ActionForm>
            </details>
          </div>}
        </li>)}</ul>
      </section>
      <section className="panel lg:col-span-2"><h2 className="mb-3 text-xl font-extrabold">Offers</h2>
        <details className="mb-4">
          <summary className="cursor-pointer font-semibold underline">New offer</summary>
          <div className="mt-3"><OfferForm candidateId={id} initialId={randomUUID()} /></div>
        </details>
        {offers.length === 0 && <p className="text-sm text-slate-700">No offers recorded yet.</p>}
        <ul className="grid gap-4">{offers.map(offer => <li key={offer.id} className="border-t border-slate-200 pt-3">
          <p className="font-bold wrap-anywhere">{offer.position} · {offer.status === 'OPEN' ? 'Awaiting response' : label(offer.status)}</p>
          <p className="break-words text-sm text-slate-700">Recorded <LocalDateTime value={offer.createdAt} /> · {offer.author.email}</p>
          {offer.responseDueAt && <p className="text-sm">
            Reply deadline <LocalDateTime value={offer.responseDueAt} />
            {offer.status === 'OPEN' && Date.parse(offer.responseDueAt) < Date.now() && <span className="ml-2 font-semibold">Deadline passed</span>}
          </p>}
          {offer.resolvedAt && <p className="text-sm">Outcome recorded <LocalDateTime value={offer.resolvedAt} /></p>}
          {offer.terms && <p className="mt-2 whitespace-pre-wrap wrap-anywhere">{offer.terms}</p>}
          {offer.outcome && <p className="mt-2 whitespace-pre-wrap wrap-anywhere">{offer.outcome}</p>}
          {offer.status === 'OPEN' && <details className="mt-3">
            <summary className="cursor-pointer font-semibold underline">Record offer outcome</summary>
            <ActionForm action="candidate" submit="Save offer outcome" className="mt-3 grid gap-3">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="action" value="offer-outcome" />
              <input type="hidden" name="offerId" value={offer.id} />
              <label className="field">Offer result<select name="status" defaultValue="" required>
                <option value="" disabled>Select a result</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="DECLINED">Declined</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select></label>
              <label className="field">Offer outcome notes (optional)<textarea name="outcome" maxLength={1000} /></label>
            </ActionForm>
          </details>}
        </li>)}</ul>
      </section>
      <section className="panel lg:col-span-2"><h2 className="mb-3 text-xl font-extrabold">Follow-ups</h2>
        <ActionForm action="candidate" submit="Schedule follow-up" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="action" value="follow-up" />
          <label className="field">Task<input name="title" maxLength={160} required /></label>
          <label className="field">Assign follow-up to<select name="assigneeId" defaultValue={candidate.recruiterId || ''} required>
            <option value="" disabled>Select staff member</option>
            {staff.map(user => <option key={user.id} value={user.id}>{user.email}</option>)}
          </select></label>
          <LocalDateTimeField name="dueAt" label="Due date and time (your local time)" required />
        </ActionForm>
        <ul className="mt-4 grid gap-3">{candidate.followUps.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <div>
            <p className="font-bold">{item.title}</p>
            <p className="text-sm">{person(item.assigneeId)} · {item.completedAt ? 'Completed ' : item.canceledAt ? 'Canceled ' : 'Due '}
              <LocalDateTime value={item.completedAt || item.canceledAt || item.dueAt} /></p>
          </div>
          {!item.completedAt && !item.canceledAt && <div className="flex flex-wrap items-center gap-2">
            <ActionForm action="candidate" submit="Mark complete">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="followUpId" value={item.id} />
              <input type="hidden" name="action" value="complete-follow-up" />
            </ActionForm>
            <ActionForm action="candidate" submit="Cancel task" secondary>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="followUpId" value={item.id} />
              <input type="hidden" name="action" value="cancel-follow-up" />
            </ActionForm>
          </div>}
        </li>)}</ul>
      </section>
      <section className="panel lg:col-span-2"><h2 className="mb-3 text-xl font-extrabold">Activity</h2>
        <ul className="grid gap-3">{candidate.audit.map(item => <li key={item.id} className="border-b border-slate-200 pb-2">
          <strong>{actions[item.action] || item.action}</strong>
          {item.data?.stage && <> · {label(item.data.previous || '')} → {label(item.data.stage)}</>}
          {item.action === 'candidate.assigned' && <> · {item.data?.recruiterId ? person(item.data.recruiterId) : 'Unassigned'}</>}
          {item.data?.reason && <p className="whitespace-pre-wrap">{item.data.reason}</p>}
          <p className="text-sm">{formatDate(item.createdAt)}{item.actorId && ' · ' + person(item.actorId)}</p>
        </li>)}</ul>
      </section>
    </div>
  </div>;
}
