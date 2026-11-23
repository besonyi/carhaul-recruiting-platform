import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { promisify } from 'node:util';

const derive = promisify(scrypt) as (password: string, salt: string, length: number) => Promise<Buffer>;
export const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const sessionToken = () => randomBytes(32).toString('base64url');

export function rateLimitClient(
  peer: string | undefined,
  forwarded: string | string[] | undefined,
  signature: string | string[] | undefined,
  secret: string | undefined,
) {
  if (secret && typeof forwarded === 'string' && isIP(forwarded) && typeof signature === 'string' && /^[a-f0-9]{64}$/.test(signature)) {
    const expected = createHmac('sha256', secret).update(forwarded).digest();
    if (timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return 'visitor:' + signature;
  }
  return 'peer:' + sessionHash(peer || 'unknown');
}
export const passwordHash = async (password: string) => {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await derive(password, salt, 64)).toString('hex');
};
export async function verifyPassword(password: string, stored: string) {
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)) return false;
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(await derive(password, salt, 64), Buffer.from(hash, 'hex'));
}
