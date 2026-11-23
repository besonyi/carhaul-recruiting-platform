import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt) as (password: string, salt: string, length: number) => Promise<Buffer>;
export const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const sessionToken = () => randomBytes(32).toString('base64url');
export const passwordHash = async (password: string) => {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await derive(password, salt, 64)).toString('hex');
};
export async function verifyPassword(password: string, stored: string) {
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)) return false;
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(await derive(password, salt, 64), Buffer.from(hash, 'hex'));
}
