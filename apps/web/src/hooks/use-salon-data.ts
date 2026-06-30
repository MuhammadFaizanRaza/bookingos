'use client';

import { useQuery } from '@tanstack/react-query';
import { api, DEMO_TENANT_SLUG } from '@/lib/api';
import {
  mockAppointments,
  mockCategories,
  mockClients,
  mockLocations,
  mockServices,
  mockSlots,
  mockStaff,
  mockTenant,
} from '@/lib/mock';
import type {
  Appointment,
  Client,
  Location,
  Paginated,
  PlanUsage,
  Service,
  ServiceCategory,
  Slot,
  StaffMember,
  Tenant,
} from '@/lib/types';
import { planDef, isUnlimited } from '@/lib/plans';

// Each hook tries the API first and gracefully falls back to realistic mock
// data so every screen renders during a demo, even with the API offline.

export function useServiceCategories() {
  return useQuery<ServiceCategory[]>({
    queryKey: ['service-categories'],
    queryFn: async () => {
      try {
        const data = await api.serviceCategories.list();
        return data.length ? data : mockCategories;
      } catch {
        return mockCategories;
      }
    },
  });
}

export function usePublicServices(slug = DEMO_TENANT_SLUG) {
  return useQuery<Service[]>({
    queryKey: ['public', 'services', slug],
    queryFn: async () => {
      try {
        const data = await api.public.getServices(slug);
        return data.length ? data : mockServices;
      } catch {
        return mockServices;
      }
    },
  });
}

export function usePublicStaff(slug = DEMO_TENANT_SLUG) {
  return useQuery<StaffMember[]>({
    queryKey: ['public', 'staff', slug],
    queryFn: async () => {
      try {
        const data = await api.public.getStaff(slug);
        return data.length ? data : mockStaff;
      } catch {
        return mockStaff;
      }
    },
  });
}

export function useAvailability(input: {
  serviceId?: string;
  date: string;
  staffId?: string;
  slug?: string;
  enabled?: boolean;
}) {
  return useQuery<Slot[]>({
    queryKey: ['availability', input.serviceId, input.date, input.staffId],
    enabled: input.enabled !== false && !!input.serviceId,
    staleTime: 0,       // always refetch when re-enabled (e.g. after a booking)
    refetchOnMount: true,
    queryFn: async () => {
      // Public booking flow: always use /public/availability (no auth needed).
      // Dashboard flow (no slug): use /bookings/availability (requires auth).
      if (input.slug) {
        // Never fall back to mock here — caller must see real availability.
        return await api.public.getAvailability(input.slug, {
          serviceId: input.serviceId!,
          date: input.date,
          staffId: input.staffId,
        });
      }
      try {
        return await api.bookings.availability({
          serviceId: input.serviceId!,
          date: input.date,
          staffId: input.staffId,
        });
      } catch {
        return mockSlots(input.date);
      }
    },
  });
}

export function useTenant() {
  return useQuery<Tenant>({
    queryKey: ['tenant'],
    queryFn: async () => {
      try {
        return await api.tenant.current();
      } catch {
        return mockTenant;
      }
    },
  });
}

export function useServices() {
  return useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        const data = await api.services.list();
        return data.length ? data : mockServices;
      } catch {
        return mockServices;
      }
    },
  });
}

export function useStaff() {
  return useQuery<StaffMember[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      try {
        const data = await api.staff.list();
        return data.length ? data : mockStaff;
      } catch {
        return mockStaff;
      }
    },
  });
}

export function useClients(q: string) {
  return useQuery<Paginated<Client>>({
    queryKey: ['clients', q],
    queryFn: async () => {
      try {
        return await api.clients.list({ q, pageSize: 50 });
      } catch {
        const filtered = q
          ? mockClients.filter((c) =>
              `${c.name} ${c.email ?? ''} ${c.phone ?? ''}`
                .toLowerCase()
                .includes(q.toLowerCase()),
            )
          : mockClients;
        return {
          data: filtered,
          meta: {
            page: 1,
            pageSize: 50,
            total: filtered.length,
            totalPages: 1,
          },
        };
      }
    },
  });
}

export function useBillingUsage() {
  const { data: tenant } = useTenant();
  const { data: staff = [] } = useStaff();

  return useQuery<PlanUsage>({
    queryKey: ['billing', 'usage', tenant?.plan, staff.length],
    queryFn: async () => {
      const def = planDef(tenant?.plan);
      const fallback: PlanUsage = {
        plan: tenant?.plan ?? 'STARTER',
        status: tenant?.status ?? 'ACTIVE',
        staff: { used: staff.length, limit: def.maxStaff },
        locations: { used: 1, limit: def.maxLocations },
        currentPeriodEnd: null,
      };
      try {
        const data = await api.billing.usage();
        return data ?? fallback;
      } catch {
        return fallback;
      }
    },
  });
}

export { isUnlimited };

export function useLocations() {
  return useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const data = await api.locations.list();
        return data.length ? data : mockLocations;
      } catch {
        return mockLocations;
      }
    },
  });
}

export function useAppointments(opts?: { from?: string; to?: string }) {
  return useQuery<Appointment[]>({
    queryKey: ['appointments', opts?.from, opts?.to],
    queryFn: async () => {
      try {
        // Always return real data (including empty array); only fall back on API error
        return await api.bookings.list(opts);
      } catch {
        return mockAppointments;
      }
    },
  });
}

export function useReportData(from: string, to: string, bucket: 'day' | 'week' | 'month') {
  return useQuery({
    queryKey: ['reports', from, to, bucket],
    queryFn: async () => {
      try {
        const [summary, revenue, byService, byStaff, byStatus, topClients] = await Promise.all([
          api.reports.summary({ from, to }),
          api.reports.revenue({ from, to, bucket }),
          api.reports.revenueByService({ from, to }),
          api.reports.revenueByStaff({ from, to }),
          api.reports.appointmentsByStatus({ from, to }),
          api.reports.topClients({ from, to }),
        ]);
        return { summary, revenue, byService, byStaff, byStatus, topClients };
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useNotifications() {
  return useQuery<Array<{ id: string; title: string; body: string; type: 'booking'; createdAt: string }>>({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        return await api.notifications.list();
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
