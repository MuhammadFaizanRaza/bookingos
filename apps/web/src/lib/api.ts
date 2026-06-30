// Shared API client for BookingOS.
// - Base URL from NEXT_PUBLIC_API_URL, all routes under /api/v1.
// - Injects `x-tenant-slug` header and a bearer token when present.
// - Provides typed helpers for the resources the frontend uses.

import type {
  Appointment,
  AuthResponse,
  Client,
  Location,
  Paginated,
  PlanUsage,
  Review,
  Service,
  ServiceCategory,
  Slot,
  StaffMember,
  Tenant,
} from './types';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const API_PREFIX = '/api/v1';
export const DEMO_TENANT_SLUG = 'lumiere';
// Abort requests that take too long so the UI falls back to mock data quickly.
const REQUEST_TIMEOUT_MS = 2500;

const TOKEN_KEY = 'bookingos.token';
const REFRESH_KEY = 'bookingos.refresh';

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string, refresh?: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TOKEN_KEY, token);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  getRefresh(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  clear() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  tenantSlug?: string;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    body,
    tenantSlug,
    auth = true,
    query,
    headers,
    ...rest
  } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-slug': tenantSlug ?? DEMO_TENANT_SLUG,
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = tokenStore.get();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  // Fail fast (and fall back to mock data) when the API is slow/unreachable.
  const res = await fetch(buildUrl(path, query), {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: rest.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = undefined;
    }
    const message =
      (parsed as { message?: string })?.message ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, parsed);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Typed helpers ---------------------------------------------------------

export const api = {
  auth: {
    register: (input: {
      salonName: string;
      slug: string;
      ownerName: string;
      email: string;
      password: string;
    }) =>
      apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        auth: false,
        body: input,
      }),
    login: (input: { email: string; password: string; slug?: string }) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        tenantSlug: input.slug ?? DEMO_TENANT_SLUG,
        body: input,
      }),
    me: () => apiFetch<AuthResponse['user']>('/auth/me'),
  },
  tenant: {
    current: () => apiFetch<Tenant>('/tenant'),
    update: (input: Partial<Tenant>) =>
      apiFetch<Tenant>('/tenant', { method: 'PATCH', body: input }),
  },
  services: {
    list: (opts?: { tenantSlug?: string; activeOnly?: boolean }) =>
      apiFetch<Service[]>('/services', {
        auth: !opts?.tenantSlug,
        tenantSlug: opts?.tenantSlug,
        query: { activeOnly: opts?.activeOnly },
      }),
    create: (input: Partial<Service>) =>
      apiFetch<Service>('/services', { method: 'POST', body: input }),
    update: (id: string, input: Partial<Service>) =>
      apiFetch<Service>(`/services/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) =>
      apiFetch<void>(`/services/${id}`, { method: 'DELETE' }),
  },
  staff: {
    list: (opts?: { tenantSlug?: string }) =>
      apiFetch<StaffMember[]>('/staff', {
        auth: !opts?.tenantSlug,
        tenantSlug: opts?.tenantSlug,
      }),
    create: (input: {
      name: string;
      email: string;
      title?: string;
      bio?: string;
      color?: string;
      commissionRate?: number;
      isBookable?: boolean;
      serviceIds?: string[];
    }) => apiFetch<StaffMember>('/staff', { method: 'POST', body: input }),
    update: (
      id: string,
      input: Partial<{
        name: string;
        title: string;
        bio: string;
        color: string;
        commissionRate: number;
        isBookable: boolean;
        role: string;
        serviceIds: string[];
      }>,
    ) => apiFetch<StaffMember>(`/staff/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) =>
      apiFetch<void>(`/staff/${id}`, { method: 'DELETE' }),
    setWorkingHours: (
      id: string,
      hours: { dayOfWeek: number; startMin: number; endMin: number }[],
    ) =>
      apiFetch<void>(`/staff/${id}/working-hours`, {
        method: 'PUT',
        body: { hours },
      }),
  },
  clients: {
    list: (opts?: { q?: string; page?: number; pageSize?: number }) =>
      apiFetch<Paginated<Client>>('/clients', {
        query: {
          q: opts?.q,
          page: opts?.page,
          pageSize: opts?.pageSize,
        },
      }),
    create: (input: {
      name: string;
      email?: string;
      phone?: string;
    }) => apiFetch<Client>('/clients', { method: 'POST', body: input }),
    remove: (id: string) =>
      apiFetch<void>(`/clients/${id}`, { method: 'DELETE' }),
  },
  serviceCategories: {
    list: () => apiFetch<ServiceCategory[]>('/service-categories'),
    create: (input: { name: string }) =>
      apiFetch<ServiceCategory>('/service-categories', { method: 'POST', body: input }),
  },
  sales: {
    create: (input: {
      clientId?: string;
      items: { type: 'SERVICE' | 'PRODUCT'; refId?: string; name: string; quantity: number; unitPrice: number; staffId?: string }[];
      discountPercent?: number;
      method?: 'CARD' | 'CASH' | 'WALLET';
    }) => apiFetch<{ id: string; number: number; total: number }>('/sales', { method: 'POST', body: input }),
  },
  billing: {
    subscription: () => apiFetch<{ plan: string; status: string; currentPeriodEnd?: string }>('/billing/subscription'),
    usage: () => apiFetch<PlanUsage>('/billing/usage'),
    checkout: (plan: string) =>
      apiFetch<{ url: string }>('/billing/checkout', { method: 'POST', body: { plan } }),
    portal: () => apiFetch<{ url: string }>('/billing/portal', { method: 'POST' }),
  },
  locations: {
    list: () => apiFetch<Location[]>('/locations'),
    create: (input: {
      name: string;
      address?: string;
      city?: string;
      country?: string;
      phone?: string;
      email?: string;
      timezone?: string;
      isActive?: boolean;
    }) => apiFetch<Location>('/locations', { method: 'POST', body: input }),
    update: (
      id: string,
      input: {
        name?: string;
        address?: string;
        city?: string;
        country?: string;
        phone?: string;
        email?: string;
        timezone?: string;
        isActive?: boolean;
      },
    ) => apiFetch<Location>(`/locations/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) => apiFetch<void>(`/locations/${id}`, { method: 'DELETE' }),
  },
  public: {
    getSite: (slug: string) =>
      apiFetch<Tenant>('/public/site', { auth: false, tenantSlug: slug }),
    getServices: (slug: string) =>
      apiFetch<Service[]>('/public/services', { auth: false, tenantSlug: slug }),
    getStaff: (slug: string) =>
      apiFetch<StaffMember[]>('/public/staff', { auth: false, tenantSlug: slug }),
    getLocations: (slug: string) =>
      apiFetch<Location[]>('/public/locations', { auth: false, tenantSlug: slug }),
    getReviews: (slug: string) =>
      apiFetch<Review[]>('/public/reviews', { auth: false, tenantSlug: slug }),
    getAvailability: (slug: string, input: { serviceId: string; date: string; staffId?: string }) =>
      apiFetch<Slot[]>('/public/availability', {
        auth: false,
        tenantSlug: slug,
        query: { serviceId: input.serviceId, date: input.date, staffId: input.staffId },
      }),
    createBooking: (
      slug: string,
      dto: {
        name: string;
        email?: string;
        phone?: string;
        notes?: string;
        items: { serviceId: string; staffId?: string; startsAt: string }[];
      },
    ) =>
      apiFetch<Appointment>('/public/bookings', {
        method: 'POST',
        auth: false,
        tenantSlug: slug,
        body: dto,
      }),
  },
  bookings: {
    availability: (input: {
      serviceId: string;
      date: string;
      staffId?: string;
      tenantSlug?: string;
    }) =>
      apiFetch<Slot[]>('/bookings/availability', {
        auth: !input.tenantSlug,
        tenantSlug: input.tenantSlug,
        query: {
          serviceId: input.serviceId,
          date: input.date,
          staffId: input.staffId,
        },
      }),
    create: (input: {
      clientId?: string;
      notes?: string;
      source?: string;
      items: { serviceId: string; staffId?: string; startsAt: string }[];
      tenantSlug?: string;
    }) =>
      apiFetch<Appointment>('/bookings', {
        method: 'POST',
        auth: !input.tenantSlug,
        tenantSlug: input.tenantSlug,
        body: input,
      }),
    list: (opts?: { from?: string; to?: string; staffId?: string }) =>
      apiFetch<Appointment[]>('/bookings', { query: opts }),
    updateStatus: (id: string, status: string) =>
      apiFetch<Appointment>(`/bookings/${id}/status`, { method: 'PATCH', body: { status } }),
  },
  notifications: {
    list: () =>
      apiFetch<Array<{ id: string; title: string; body: string; type: 'booking'; createdAt: string }>>('/bookings/notifications'),
  },
  reports: {
    summary: (opts?: { from?: string; to?: string }) =>
      apiFetch<{ revenue: number; sales: number; appointments: number; newClients: number; averageTicket: number }>(
        '/reports/summary', { query: opts },
      ),
    revenue: (opts?: { from?: string; to?: string; bucket?: 'day' | 'week' | 'month' }) =>
      apiFetch<Array<{ bucket: string; revenue: number; sales: number }>>('/reports/revenue', { query: opts }),
    revenueByService: (opts?: { from?: string; to?: string }) =>
      apiFetch<Array<{ name: string; revenue: number; quantity: number }>>('/reports/revenue-by-service', { query: opts }),
    revenueByStaff: (opts?: { from?: string; to?: string }) =>
      apiFetch<Array<{ staffId: string | null; name: string | null; revenue: number }>>('/reports/revenue-by-staff', { query: opts }),
    appointmentsByStatus: (opts?: { from?: string; to?: string }) =>
      apiFetch<Array<{ status: string; count: number }>>('/reports/appointments-by-status', { query: opts }),
    topClients: (opts?: { from?: string; to?: string }) =>
      apiFetch<Array<{ clientId: string; name: string; revenue: number; visits: number }>>('/reports/top-clients', { query: opts }),
    utilization: (opts?: { from?: string; to?: string }) =>
      apiFetch<Array<{ staffId: string; name: string; availableMin: number; bookedMin: number; utilization: number }>>('/reports/utilization', { query: opts }),
  },
};
