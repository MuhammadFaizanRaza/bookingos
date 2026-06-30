import type { Role } from './types';

export type Section =
  | 'overview'
  | 'calendar'
  | 'clients'
  | 'services'
  | 'staff'
  | 'pos'
  | 'reports'
  | 'settings';

export const ROLE_SECTIONS: Record<Role, Section[]> = {
  SUPER_ADMIN: ['overview', 'calendar', 'clients', 'services', 'staff', 'pos', 'reports', 'settings'],
  OWNER: ['overview', 'calendar', 'clients', 'services', 'staff', 'pos', 'reports', 'settings'],
  MANAGER: ['overview', 'calendar', 'clients', 'services', 'staff', 'pos', 'reports'],
  RECEPTIONIST: ['overview', 'calendar', 'clients', 'pos'],
  STAFF: ['overview', 'calendar', 'pos'],
  CLIENT: [],
};

export const SECTION_LABELS: Record<Section, string> = {
  overview: 'Overview',
  calendar: 'Calendar',
  clients: 'Clients',
  services: 'Services',
  staff: 'Staff',
  pos: 'Point of Sale',
  reports: 'Reports',
  settings: 'Settings',
};

export const ASSIGNABLE_ROLES: Array<{ value: Role; label: string; description: string }> = [
  { value: 'MANAGER', label: 'Manager', description: 'Calendar, clients, services, staff, POS & reports' },
  { value: 'RECEPTIONIST', label: 'Receptionist', description: 'Calendar, clients and POS only' },
  { value: 'STAFF', label: 'Staff', description: 'Calendar and POS only' },
];

export function getAllowedSections(role: Role): Section[] {
  return ROLE_SECTIONS[role] ?? ROLE_SECTIONS.STAFF;
}
