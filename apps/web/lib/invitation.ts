import type { Track } from './api';

export const invitationCookie = 'extended_application';
export const invitationPath = '/continue';
export const invitationApiPath = '/applications/extended';
export type InvitationContext = { track: Track; invitationId: string; expiresAt: string };
export type InvitationResult = { success: boolean; message: string; link?: string };

export const trailers = {
  STINGER_STEER: 'Stinger-steer',
  HIGH_MOUNT: 'High-mount',
  WEDGE: 'Wedge',
  OTHER: 'Other',
};
export const ownerTrailers = { ...trailers, NONE: 'No trailer yet' };
export const routes = {
  LOCAL: 'Local', REGIONAL: 'Regional', OVER_THE_ROAD: 'Over the road', FLEXIBLE: 'Flexible',
};
export const operatingModels = {
  LEASE_ON: 'Lease on', OWN_AUTHORITY: 'Own authority', OPEN_TO_EITHER: 'Open to either',
};
