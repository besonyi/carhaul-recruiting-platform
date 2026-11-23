import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { readMfaKey } from './staff-mfa';

export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
export const carrier = process.env.CARRIER_NAME?.trim() || '';
export const notice = {
  version: process.env.CONTACT_NOTICE_VERSION?.trim() || '',
  statement: process.env.CONTACT_NOTICE_TEXT?.trim() || '',
  agreement: `I agree to be contacted by ${carrier} about my application.`,
};
export const quickApplyEnabled = Boolean(carrier && notice.version && notice.statement);
export const mfaKey = readMfaKey(process.env.STAFF_MFA_KEY);
export const mfaRequired = process.env.STAFF_MFA_REQUIRED === 'true';
if (mfaRequired && !mfaKey) throw new Error('STAFF_MFA_REQUIRED needs a valid STAFF_MFA_KEY.');
