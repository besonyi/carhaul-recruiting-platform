import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const stepMilliseconds = 30_000;

export function readMfaKey(value: string | undefined) {
  if (!value) return undefined;
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('STAFF_MFA_KEY must be 32 bytes encoded as base64.');
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== value) throw new Error('STAFF_MFA_KEY must be 32 bytes encoded as base64.');
  return decoded;
}

export function authenticatorKey(secret: Buffer) {
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of secret) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += base32[(value >>> bits) & 31];
    }
  }
  if (bits) result += base32[(value << (5 - bits)) & 31];
  return result;
}

export function encryptMfaSecret(secret: Buffer, key: Buffer, staffId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv).setAAD(Buffer.from(staffId));
  const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function decryptMfaSecret(value: string, key: Buffer, staffId: string) {
  const data = Buffer.from(value, 'base64url');
  if (data.length !== 48) throw new Error('Invalid MFA record.');
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12))
    .setAAD(Buffer.from(staffId)).setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
}

// RFC 6238 with the six-digit settings commonly supported by authenticator apps.
export function matchingTotpStep(secret: Buffer, code: string | undefined, now = Date.now()) {
  if (!code || !/^\d{6}$/.test(code)) return null;
  const received = Buffer.from(code);
  const current = Math.floor(now / stepMilliseconds);
  for (const step of [current, current - 1, current + 1]) {
    if (step < 0) continue;
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const digest = createHmac('sha1', secret).update(counter).digest();
    const offset = digest[digest.length - 1] & 15;
    const digits = ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
    if (timingSafeEqual(received, Buffer.from(digits))) return step;
  }
  return null;
}
