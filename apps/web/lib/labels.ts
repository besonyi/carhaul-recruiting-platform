import type { Track } from './api';

export const tracks: Record<Track, { slug: string; label: string; description: string }> = {
  COMPANY_DRIVER: { slug: 'company-drivers', label: 'Company Drivers', description: 'Explore CDL-A positions driving company equipment. Tell recruiting about your driving and auto transport experience.' },
  OWNER_OPERATOR: { slug: 'owner-operators', label: 'Owner Operators', description: 'Explore car hauling opportunities with your own equipment. Share your truck and trailer setup with recruiting.' },
};
export const stages = ['NEW_LEAD', 'CONTACTED', 'QUALIFIED', 'INTERVIEW', 'OFFER', 'HIRED', 'ON_HOLD', 'REJECTED', 'WITHDRAWN', 'UNRESPONSIVE', 'DUPLICATE'] as const;
export const label = (key: string) => key.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
