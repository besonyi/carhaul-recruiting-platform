'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, cookie } from '../lib/api';
import { webOrigin } from '../lib/web-origin';
import type { PipelineData, PipelineState } from './crm/pipeline';
import { invitationApiPath, invitationCookie, invitationPath, type ExtendedFormState, type InvitationContext, type InvitationResult } from '../lib/invitation';

type Result = { success: boolean; message: string };
const get = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const optional = (form: FormData, key: string) => get(form, key) || undefined;

async function result(response: Response): Promise<Result> {
  if (response.ok) return { success: true, message: 'Saved.' };
  if (response.status >= 500) return { success: false, message: 'Temporarily unavailable. Please try again.' };
  const payload = await response.json().catch(() => ({}));
  const message = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message;
  return { success: false, message: typeof message === 'string' ? message : 'The request could not be completed.' };
}

export async function submitApplication(_: Result, form: FormData) {
  const track = get(form, 'track');
  const data = {
    track, name: get(form, 'name'), email: get(form, 'email'), phone: get(form, 'phone'),
    state: optional(form, 'state')?.toUpperCase(), zip: optional(form, 'zip'),
    cdl: get(form, 'cdl'),
    drivingYears: Number(optional(form, 'drivingYears') ?? NaN),
    haulingYears: Number(optional(form, 'haulingYears') ?? NaN),
    startDate: optional(form, 'startDate'), routes: optional(form, 'routes'),
    accepted: form.get('accepted') === 'on', noticeVersion: get(form, 'noticeVersion'),
    jobId: optional(form, 'jobId'), source: optional(form, 'source'),
    medium: optional(form, 'medium'), campaign: optional(form, 'campaign'),
    ...(track === 'OWNER_OPERATOR' ? {
      ownsTruck: optional(form, 'ownsTruck') && get(form, 'ownsTruck') === 'yes',
      ownsTrailer: optional(form, 'ownsTrailer') && get(form, 'ownsTrailer') === 'yes',
      equipment: optional(form, 'equipment'),
    } : {}),
  };
  return result(await api('/applications', { method: 'POST', data, rateLimited: true }));
}

export async function login(_: Result, form: FormData) {
  const response = await api('/crm/login', {
    method: 'POST', rateLimited: true, data: {
      email: get(form, 'email'), password: String(form.get('password') ?? ''), code: optional(form, 'code'),
    },
  });
  if (!response.ok) return result(response);
  const { token, expiresAt } = await response.json();
  await (await cookies()).set(cookie, token, {
    httpOnly: true, sameSite: 'lax', secure: webOrigin().startsWith('https://'),
    expires: new Date(expiresAt), path: '/',
  });
  redirect('/crm');
}

export async function logout() {
  const response = await api('/crm/logout', { method: 'POST', auth: true });
  if (!response.ok) throw new Error('Could not revoke the session. Please try signing out again.');
  (await cookies()).delete(cookie);
  redirect('/crm/login');
}

export async function searchPipeline(previous: PipelineState, form: FormData): Promise<PipelineState> {
  const data = {
    q: optional(form, 'q'),
    track: optional(form, 'track'),
    page: Number(optional(form, 'page') || 1),
  };
  const response = await api('/crm/candidates/search', { method: 'POST', auth: true, data });
  if (response.status === 401) redirect('/crm/login');
  if (!response.ok) return { ...previous, message: (await result(response)).message };
  return { data: await response.json() as PipelineData, page: data.page };
}

export async function saveJob(_: Result, form: FormData) {
  const id = optional(form, 'id');
  const data = Object.fromEntries(['slug', 'title', 'track', 'region', 'requirements', 'schedule', 'equipment', 'status'].map(key => [key, get(form, key)]));
  const response = await api('/crm/jobs' + (id ? '/' + encodeURIComponent(id) : ''), {
    auth: true, method: id ? 'PATCH' : 'POST', data: { ...data, compensation: optional(form, 'compensation') ?? null },
  });
  if (response.ok) { revalidatePath('/crm/jobs'); revalidatePath('/jobs'); }
  return result(response);
}

export async function saveCandidate(_: Result, form: FormData) {
  const id = encodeURIComponent(get(form, 'id'));
  const action = get(form, 'action');
  const path = '/crm/candidates/' + id;
  let response: Response;
  switch (action) {
    case 'stage':
      response = await api(path + '/stage', { auth: true, method: 'PATCH', data: {
        previous: get(form, 'previous'), stage: get(form, 'stage'), reason: optional(form, 'reason'),
      } });
      break;
    case 'assignment':
      response = await api(path + '/assignment', { auth: true, method: 'PATCH', data: { recruiterId: optional(form, 'recruiterId') ?? null } });
      break;
    case 'notes':
      response = await api(path + '/notes', { auth: true, method: 'POST', data: { body: get(form, 'body') } });
      break;
    case 'follow-up':
      response = await api(path + '/follow-ups', { auth: true, method: 'POST', data: {
        title: get(form, 'title'), assigneeId: get(form, 'assigneeId'), dueAt: get(form, 'dueAt'),
      } });
      break;
    case 'complete-follow-up':
    case 'cancel-follow-up':
      response = await api(path + '/follow-ups/' + encodeURIComponent(get(form, 'followUpId')), {
        auth: true, method: 'PATCH', data: { action: action === 'cancel-follow-up' ? 'cancel' : 'complete' },
      });
      break;
    case 'interview-outcome':
      response = await api(path + '/interviews/' + encodeURIComponent(get(form, 'interviewId')), {
        auth: true, method: 'PATCH', data: {
          action: 'close', revision: Number(get(form, 'revision')), status: get(form, 'status'), outcome: optional(form, 'outcome'),
        },
      });
      break;
    default: return { success: false, message: 'Unknown action.' };
  }
  if (response.ok) {
    revalidatePath(path);
    if (action === 'follow-up' || action.endsWith('-follow-up')) revalidatePath('/crm/follow-ups');
    else if (action === 'interview-outcome') revalidatePath('/crm/interviews');
    else revalidatePath('/crm');
  }
  return result(response);
}

export async function saveContact(previous: Result & { id: string }, form: FormData) {
  const path = '/crm/candidates/' + encodeURIComponent(get(form, 'candidateId'));
  const response = await api(path + '/contacts', {
    method: 'POST',
    auth: true,
    data: {
      id: previous.id,
      channel: get(form, 'channel'),
      direction: get(form, 'direction'),
      outcome: get(form, 'outcome'),
      summary: optional(form, 'summary'),
      occurredAt: optional(form, 'occurredAt'),
    },
  });
  if (!response.ok) return { ...await result(response), id: previous.id };
  revalidatePath(path);
  return { success: true, message: 'Contact recorded.', id: randomUUID() };
}

export async function saveInterview(previous: Result & { id: string }, form: FormData) {
  const path = '/crm/candidates/' + encodeURIComponent(get(form, 'candidateId'));
  const id = optional(form, 'interviewId');
  const scheduling = {
    assigneeId: get(form, 'assigneeId'), format: get(form, 'format'), scheduledAt: get(form, 'scheduledAt'),
    minutes: Number(get(form, 'minutes')), logistics: optional(form, 'logistics'),
  };
  const response = await api(path + '/interviews' + (id ? '/' + encodeURIComponent(id) : ''), {
    auth: true,
    method: id ? 'PATCH' : 'POST',
    data: id ? { ...scheduling, action: 'reschedule', revision: Number(get(form, 'revision')) } : { ...scheduling, id: previous.id },
  });
  if (!response.ok) return { ...await result(response), id: previous.id };
  revalidatePath(path);
  revalidatePath('/crm/interviews');
  return { success: true, message: id ? 'Interview rescheduled.' : 'Interview scheduled.', id: id ?? randomUUID() };
}

export async function manageInvitation(_: InvitationResult, form: FormData): Promise<InvitationResult> {
  const id = encodeURIComponent(get(form, 'id'));
  const issue = get(form, 'intent') === 'issue';
  const method = issue ? 'POST' : 'PATCH';
  const url = URL.parse(invitationPath, webOrigin());
  const loopback = url && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (issue && (!url || url.username || url.password || (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')))) {
    return { success: false, message: 'Configure an HTTPS web origin to issue invitations.' };
  }
  const candidatePath = '/crm/candidates/' + id;
  const response = await api(candidatePath + '/invitation', { method, auth: true });
  if (!response.ok) return result(response);
  revalidatePath(candidatePath);
  if (!issue || !url) return { success: true, message: 'Invitation revoked.' };
  const { token } = await response.json() as { token: string };
  url.hash = token;
  return { success: true, message: 'Invitation created. Copy it now to share with this candidate.', link: url.href };
}

export async function openInvitation(token: string): Promise<Result> {
  if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) {
    return { success: false, message: 'This invitation is unavailable. Ask recruiting for a current link.' };
  }
  const response = await api(invitationApiPath, { token });
  if (!response.ok) return result(response);
  const { expiresAt } = await response.json() as InvitationContext;
  (await cookies()).set(invitationCookie, token, { ...invitationCookieOptions(), expires: new Date(expiresAt) });
  return { success: true, message: '' };
}

function invitationCookieOptions() {
  return {
    path: invitationPath, httpOnly: true, sameSite: 'lax' as const,
    secure: webOrigin().startsWith('https://'),
  };
}

export async function sendExtendedApplication(previous: ExtendedFormState, form: FormData): Promise<ExtendedFormState> {
  const jar = await cookies();
  const token = jar.get(invitationCookie)?.value;
  const context = await api(invitationApiPath, { token });
  if (!context.ok) return { ...previous, ...await result(context) };
  const { track } = await context.json() as InvitationContext;
  const savingDraft = get(form, 'intent') === 'draft';
  const capacity = optional(form, 'capacity');
  const truckYear = optional(form, 'truckYear');
  const answers = track === 'COMPANY_DRIVER' ? {
    trailerTypes: form.getAll('trailerTypes').map(String),
    loadsIndependently: readYesNo(form, 'loadsIndependently'),
    securesIndependently: readYesNo(form, 'securesIndependently'),
    routePreference: optional(form, 'routePreference'),
  } : {
    trailerType: optional(form, 'trailerType'),
    capacity: capacity ? Number(capacity) : undefined,
    truckYear: truckYear ? Number(truckYear) : undefined,
    operatingModel: optional(form, 'operatingModel'),
  };
  const response = await api(invitationApiPath, {
    method: savingDraft ? 'PATCH' : 'POST',
    token,
    data: { invitationId: get(form, 'invitationId'), revision: Number(get(form, 'revision')), answers },
  });
  if (!response.ok) return { ...previous, ...await result(response), stale: response.status === 409 };
  if (savingDraft) {
    const saved = await response.json() as Pick<ExtendedFormState, 'revision' | 'draftSavedAt'>;
    return { ...saved, success: true, message: 'Draft saved.' };
  }
  jar.set(invitationCookie, '', { ...invitationCookieOptions(), maxAge: 0 });
  redirect(invitationPath + '/received');
}

function readYesNo(form: FormData, key: string) {
  const value = get(form, key);
  return value === 'yes' ? true : value === 'no' ? false : undefined;
}
