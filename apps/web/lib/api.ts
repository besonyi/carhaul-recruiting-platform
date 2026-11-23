import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const cookie = 'recruiting_session';
export type Track = 'COMPANY_DRIVER' | 'OWNER_OPERATOR';
export type Job = {
  id: string; slug: string; title: string; track: Track; region: string; requirements: string;
  schedule: string; equipment: string; compensation?: string | null; status?: string;
};
export type Site = { carrier: string; notice: { version: string; statement: string; agreement: string } | null };
export async function api(path: string, opts: {
  method?: string; data?: unknown; auth?: boolean; token?: string; timeoutMs?: number; rateLimited?: boolean;
} = {}) {
  const token = opts.auth ? (await cookies()).get(cookie)?.value : opts.token;
  const hostport = process.env.API_HOSTPORT;
  const baseUrl = process.env.API_URL || (hostport ? 'http://' + hostport + '/api' : 'http://127.0.0.1:4000/api');
  const clientHeaders: Record<string, string> = {};
  const proxySecret = process.env.RECRUITING_PROXY_SECRET;
  if (opts.rateLimited && process.env.RENDER === 'true' && proxySecret) {
    const visitor = (await headers()).get('cf-connecting-ip')?.trim();
    if (visitor && isIP(visitor)) {
      clientHeaders['X-Carhaul-Client-IP'] = visitor;
      clientHeaders['X-Carhaul-Client-Signature'] = createHmac('sha256', proxySecret).update(visitor).digest('hex');
    }
  }
  try {
    return await fetch(baseUrl + path, {
      method: opts.method || 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
      headers: {
        ...clientHeaders,
        ...(token && { Authorization: 'Bearer ' + token }),
        ...(opts.data !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: opts.data === undefined ? undefined : JSON.stringify(opts.data),
    });
  } catch { return new Response(null, { status: 503 }); }
}

export async function staffData<T>(path: string): Promise<T> {
  const response = await api('/crm' + path, { auth: true });
  if (response.status === 401) redirect('/crm/login');
  if (!response.ok) throw new Error('Could not load recruiting data.');
  return response.json();
}
export async function siteData(): Promise<Site> {
  const response = await api('/site');
  return response.ok ? response.json() : { carrier: '', notice: null };
}
