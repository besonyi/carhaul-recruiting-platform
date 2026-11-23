import { api } from '../../lib/api';

export async function GET() {
  const response = await api('/health', { timeoutMs: 3500 });
  return new Response(null, {
    status: response.status === 204 ? 204 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
