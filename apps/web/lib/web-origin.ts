import 'server-only';

export function webOrigin() {
  return process.env.WEB_ORIGIN || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
}
