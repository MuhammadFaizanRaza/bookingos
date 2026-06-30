// Shared domain types mirroring the BookingOS API responses.

export type Plan = 'STARTER' | 'PRO' | 'BUSINESS';

export type Vertical =
  | 'SALON'
  | 'CLINIC'
  | 'FITNESS'
  | 'HOTEL'
  | 'RENTAL'
  | 'RESTAURANT'
  | 'EVENTS'
  | 'SERVICES'
  | 'GENERAL';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type Role =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'MANAGER'
  | 'STAFF'
  | 'RECEPTIONIST'
  | 'CLIENT';

export interface AuthUser {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  locale?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  vertical?: Vertical;
  status: string;
  locale: string;
  currency: string;
  timezone: string;
  logoUrl?: string | null;
  primaryColor: string;
  tagline?: string | null;
  // Booking-site customization
  coverImageUrl?: string | null;
  about?: string | null;
  phone?: string | null;
  address?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  whatsapp?: string | null;
  bookingEnabled?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  type: 'booking' | 'payment' | 'review' | 'system';
}

export interface PlanUsage {
  plan: Plan;
  status: string;
  staff: { used: number; limit: number };
  locations: { used: number; limit: number };
  currentPeriodEnd?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  tenant?: Tenant;
  accessToken: string;
  refreshToken: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  durationMin: number;
  price: number | string;
  color: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  imageUrl?: string | null;
  onlineBookable: boolean;
  depositRequired: boolean;
  depositAmount?: number | string | null;
  isActive: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface StaffMember {
  id: string;
  title?: string | null;
  bio?: string | null;
  color: string;
  isBookable: boolean;
  commissionRate?: number | string;
  user: { id: string; name: string; avatarUrl?: string | null; email?: string; role?: Role };
  services?: { id: string; name: string }[];
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  loyaltyPoints: number;
  tags: string[];
  createdAt: string;
  _count?: { appointments?: number; sales?: number };
  totalSpent?: number;
  lastVisit?: string | null;
}

export interface Slot {
  start: string;
  end: string;
  staffId: string;
  available?: boolean; // false = blocked/booked; undefined treated as available (backwards compat)
}

export interface AppointmentItem {
  id: string;
  serviceId: string;
  service?: Service;
  staffId?: string | null;
  staff?: StaffMember | null;
  startsAt: string;
  endsAt: string;
  price: number | string;
  durationMin: number;
}

export interface Appointment {
  id: string;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  total: number | string;
  notes?: string | null;
  client?: Client | null;
  items: AppointmentItem[];
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface Location {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
  isActive: boolean;
  workingHours?: { dayOfWeek: number; startMin: number; endMin: number }[];
}

export interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment?: string | null;
  staffName?: string | null;
  serviceName?: string | null;
  createdAt: string;
}
