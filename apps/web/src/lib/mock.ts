// Realistic demo data for "Lumière Beauty Lounge".
// Every dashboard / booking screen falls back to this when the API is
// unavailable so the product always demos cleanly. Keep mock data isolated here.

import type {
  AppNotification,
  Appointment,
  AppointmentStatus,
  Client,
  Location,
  Review,
  Service,
  ServiceCategory,
  Slot,
  StaffMember,
  Tenant,
} from './types';

export const mockCategories: ServiceCategory[] = [
  { id: 'c1', name: 'Hair', sortOrder: 1 },
  { id: 'c2', name: 'Nails', sortOrder: 2 },
  { id: 'c3', name: 'Skin', sortOrder: 3 },
  { id: 'c4', name: 'Spa', sortOrder: 4 },
];

export const mockTenant: Tenant = {
  id: 'tnt_lumiere',
  name: 'Lumière Beauty Lounge',
  slug: 'lumiere',
  plan: 'PRO',
  status: 'ACTIVE',
  locale: 'en',
  currency: 'USD',
  timezone: 'America/New_York',
  logoUrl: null,
  primaryColor: '#7C3AED',
  tagline: 'Where beauty meets artistry',
  about: 'Lumière Beauty Lounge is a premier luxury salon in the heart of New York City. For over a decade we have crafted bespoke beauty experiences for thousands of clients — from precision haircuts and vivid colour transformations to rejuvenating facials and relaxing spa treatments. Our team of award-winning specialists is dedicated to making you look and feel your absolute best.',
  phone: '+1 (212) 555-0100',
  address: '123 Madison Avenue, New York, NY 10016',
  instagramUrl: 'https://instagram.com/lumierebeauty',
  facebookUrl: 'https://facebook.com/lumierebeauty',
  whatsapp: '+12125550100',
  coverImageUrl: null,
  bookingEnabled: true,
};

export const mockServices: Service[] = [
  { id: 'svc_1', name: 'Signature Haircut & Style', description: 'A bespoke cut with wash, blow-dry and finish.', durationMin: 60, price: 75, color: '#7C3AED', category: { id: 'c1', name: 'Hair' }, onlineBookable: true, depositRequired: true, depositAmount: 15, isActive: true },
  { id: 'svc_2', name: 'Balayage & Gloss', description: 'Hand-painted highlights for a sun-kissed glow.', durationMin: 150, price: 220, color: '#A855F7', category: { id: 'c1', name: 'Hair' }, onlineBookable: true, depositRequired: true, depositAmount: 50, isActive: true },
  { id: 'svc_3', name: 'Luxury Manicure', description: 'Shape, cuticle care, massage and polish.', durationMin: 45, price: 45, color: '#D946EF', category: { id: 'c2', name: 'Nails' }, onlineBookable: true, depositRequired: false, isActive: true },
  { id: 'svc_4', name: 'Gel Pedicure', description: 'Spa pedicure with long-lasting gel finish.', durationMin: 60, price: 60, color: '#EC4899', category: { id: 'c2', name: 'Nails' }, onlineBookable: true, depositRequired: false, isActive: true },
  { id: 'svc_5', name: 'Radiance Facial', description: 'Deep-cleansing facial tailored to your skin.', durationMin: 75, price: 110, color: '#8B5CF6', category: { id: 'c3', name: 'Skin' }, onlineBookable: true, depositRequired: true, depositAmount: 25, isActive: true },
  { id: 'svc_6', name: 'Hot Stone Massage', description: '60 minutes of pure, warming relaxation.', durationMin: 60, price: 95, color: '#6366F1', category: { id: 'c4', name: 'Spa' }, onlineBookable: true, depositRequired: false, isActive: true },
  { id: 'svc_7', name: 'Bridal Glam Package', description: 'Hair and makeup for your special day.', durationMin: 120, price: 280, color: '#F472B6', category: { id: 'c3', name: 'Skin' }, onlineBookable: true, depositRequired: true, depositAmount: 80, isActive: true },
  { id: 'svc_8', name: 'Brow Lamination', description: 'Fuller, fluffier brows that last weeks.', durationMin: 30, price: 40, color: '#C084FC', category: { id: 'c3', name: 'Skin' }, onlineBookable: true, depositRequired: false, isActive: true },
];

export const mockStaff: StaffMember[] = [
  { id: 'stf_1', title: 'Master Stylist', bio: '15 years crafting effortless, modern looks.', color: '#7C3AED', isBookable: true, commissionRate: 40, user: { id: 'u1', name: 'Isabella Rossi', avatarUrl: 'https://i.pravatar.cc/150?img=47', email: 'bella@lumiere.demo' } },
  { id: 'stf_2', title: 'Colour Specialist', bio: 'Balayage and dimensional colour expert.', color: '#A855F7', isBookable: true, commissionRate: 35, user: { id: 'u2', name: 'Maya Chen', avatarUrl: 'https://i.pravatar.cc/150?img=32', email: 'maya@lumiere.demo' } },
  { id: 'stf_3', title: 'Nail Artist', bio: 'Detail-obsessed manicures and nail art.', color: '#D946EF', isBookable: true, commissionRate: 30, user: { id: 'u3', name: 'Priya Sharma', avatarUrl: 'https://i.pravatar.cc/150?img=45', email: 'priya@lumiere.demo' } },
  { id: 'stf_4', title: 'Esthetician', bio: 'Glowing-skin facials and brow design.', color: '#8B5CF6', isBookable: true, commissionRate: 35, user: { id: 'u4', name: 'Leila Haddad', avatarUrl: 'https://i.pravatar.cc/150?img=20', email: 'leila@lumiere.demo' } },
];

export const mockClients: Client[] = [
  { id: 'cl_1', name: 'Emma Thompson', email: 'emma.t@example.com', phone: '+1 202 555 0142', loyaltyPoints: 320, tags: ['VIP'], createdAt: '2025-01-12', totalSpent: 1840, lastVisit: '2026-06-08', _count: { appointments: 18 } },
  { id: 'cl_2', name: 'Olivia Martinez', email: 'olivia.m@example.com', phone: '+1 202 555 0177', loyaltyPoints: 140, tags: ['Colour'], createdAt: '2025-03-04', totalSpent: 920, lastVisit: '2026-06-01', _count: { appointments: 9 } },
  { id: 'cl_3', name: 'Sophia Williams', email: 'sophia.w@example.com', phone: '+1 202 555 0190', loyaltyPoints: 75, tags: [], createdAt: '2025-09-21', totalSpent: 410, lastVisit: '2026-05-22', _count: { appointments: 5 } },
  { id: 'cl_4', name: 'Aisha Rahman', email: 'aisha.r@example.com', phone: '+1 202 555 0163', loyaltyPoints: 500, tags: ['VIP', 'Bridal'], createdAt: '2024-11-02', totalSpent: 3120, lastVisit: '2026-06-11', _count: { appointments: 27 } },
  { id: 'cl_5', name: 'Grace Kim', email: 'grace.k@example.com', phone: '+1 202 555 0118', loyaltyPoints: 60, tags: [], createdAt: '2026-02-15', totalSpent: 285, lastVisit: '2026-05-30', _count: { appointments: 3 } },
  { id: 'cl_6', name: 'Layla Hassan', email: 'layla.h@example.com', phone: '+1 202 555 0124', loyaltyPoints: 210, tags: ['Nails'], createdAt: '2025-06-19', totalSpent: 760, lastVisit: '2026-06-09', _count: { appointments: 12 } },
  { id: 'cl_7', name: 'Chloe Dubois', email: 'chloe.d@example.com', phone: '+1 202 555 0155', loyaltyPoints: 30, tags: [], createdAt: '2026-04-01', totalSpent: 150, lastVisit: '2026-05-18', _count: { appointments: 2 } },
];

function isoAt(dayOffset: number, hour: number, min = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

export const mockAppointments: Appointment[] = [
  {
    id: 'apt_1', status: 'CONFIRMED', startsAt: isoAt(0, 9, 30), endsAt: isoAt(0, 10, 30), total: 75,
    client: mockClients[0],
    items: [{ id: 'i1', serviceId: 'svc_1', service: mockServices[0], staffId: 'stf_1', staff: mockStaff[0], startsAt: isoAt(0, 9, 30), endsAt: isoAt(0, 10, 30), price: 75, durationMin: 60 }],
  },
  {
    id: 'apt_2', status: 'CHECKED_IN', startsAt: isoAt(0, 11, 0), endsAt: isoAt(0, 13, 30), total: 220,
    client: mockClients[1],
    items: [{ id: 'i2', serviceId: 'svc_2', service: mockServices[1], staffId: 'stf_2', staff: mockStaff[1], startsAt: isoAt(0, 11, 0), endsAt: isoAt(0, 13, 30), price: 220, durationMin: 150 }],
  },
  {
    id: 'apt_3', status: 'CONFIRMED', startsAt: isoAt(0, 13, 0), endsAt: isoAt(0, 13, 45), total: 45,
    client: mockClients[5],
    items: [{ id: 'i3', serviceId: 'svc_3', service: mockServices[2], staffId: 'stf_3', staff: mockStaff[2], startsAt: isoAt(0, 13, 0), endsAt: isoAt(0, 13, 45), price: 45, durationMin: 45 }],
  },
  {
    id: 'apt_4', status: 'PENDING', startsAt: isoAt(0, 14, 30), endsAt: isoAt(0, 15, 45), total: 110,
    client: mockClients[2],
    items: [{ id: 'i4', serviceId: 'svc_5', service: mockServices[4], staffId: 'stf_4', staff: mockStaff[3], startsAt: isoAt(0, 14, 30), endsAt: isoAt(0, 15, 45), price: 110, durationMin: 75 }],
  },
  {
    id: 'apt_5', status: 'CONFIRMED', startsAt: isoAt(0, 16, 0), endsAt: isoAt(0, 17, 0), total: 95,
    client: mockClients[3],
    items: [{ id: 'i5', serviceId: 'svc_6', service: mockServices[5], staffId: 'stf_1', staff: mockStaff[0], startsAt: isoAt(0, 16, 0), endsAt: isoAt(0, 17, 0), price: 95, durationMin: 60 }],
  },
  {
    id: 'apt_6', status: 'CONFIRMED', startsAt: isoAt(1, 10, 0), endsAt: isoAt(1, 12, 0), total: 280,
    client: mockClients[3],
    items: [{ id: 'i6', serviceId: 'svc_7', service: mockServices[6], staffId: 'stf_4', staff: mockStaff[3], startsAt: isoAt(1, 10, 0), endsAt: isoAt(1, 12, 0), price: 280, durationMin: 120 }],
  },
  {
    id: 'apt_7', status: 'CONFIRMED', startsAt: isoAt(1, 12, 30), endsAt: isoAt(1, 13, 30), total: 60,
    client: mockClients[4],
    items: [{ id: 'i7', serviceId: 'svc_4', service: mockServices[3], staffId: 'stf_3', staff: mockStaff[2], startsAt: isoAt(1, 12, 30), endsAt: isoAt(1, 13, 30), price: 60, durationMin: 60 }],
  },
];

// Demo working hours (matches the seeded staff schedule: 09:00–19:00, closed
// Sundays). Slots are generated in LOCAL time (no trailing "Z") so the booking
// UI shows exactly these hours regardless of the viewer's timezone — there are
// never any midnight / out-of-hours slots.
const OPEN_HOUR = 9;
const CLOSE_HOUR = 19;
const STEP_MIN = 30;
const LUNCH_HOUR = 13; // closed 13:00–14:00
const HHMM = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

export function mockSlots(date: string): Slot[] {
  const slots: Slot[] = [];
  const staffIds = mockStaff.map((s) => s.id);

  const day = new Date(`${date}T00:00:00`);
  if (day.getDay() === 0) return []; // closed on Sundays

  const now = new Date();
  const isToday = date === toLocalDateStr(now);

  for (let mins = OPEN_HOUR * 60; mins < CLOSE_HOUR * 60; mins += STEP_MIN) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === LUNCH_HOUR) continue; // lunch break
    // Hide slots already in the past for today.
    if (isToday && mins <= now.getHours() * 60 + now.getMinutes()) continue;
    // Deterministically mark a few slots as already booked.
    if ((mins / STEP_MIN) % 5 === 0) continue;

    const endMins = mins + STEP_MIN;
    const start = `${date}T${HHMM(h, m)}:00`;
    const end = `${date}T${HHMM(Math.floor(endMins / 60), endMins % 60)}:00`;
    slots.push({ start, end, staffId: staffIds[(mins / STEP_MIN) % staffIds.length], available: true });
  }
  return slots;
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---- Reports / KPIs --------------------------------------------------------

export const mockKpis = {
  revenueToday: 1245,
  revenueTodayDelta: 12.4,
  appointmentsToday: 14,
  appointmentsDelta: 3,
  newClients: 4,
  newClientsDelta: 1,
  occupancy: 78,
  occupancyDelta: 6,
};

export const mockRevenueSeries = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  const base = 800 + Math.round(Math.sin(i / 2) * 250 + i * 28);
  return {
    date: d.toISOString().slice(5, 10),
    revenue: base + (i % 7 === 5 || i % 7 === 6 ? 380 : 0),
    appointments: 8 + (i % 5) + (i % 7 === 6 ? 6 : 0),
  };
});

export const mockRevenueByService = [
  { name: 'Balayage', value: 6400 },
  { name: 'Haircut', value: 4200 },
  { name: 'Facial', value: 3100 },
  { name: 'Manicure', value: 2300 },
  { name: 'Massage', value: 1900 },
  { name: 'Bridal', value: 1600 },
];

export const mockRevenueByStaff = mockStaff.map((s, i) => ({
  name: s.user.name.split(' ')[0],
  value: [7200, 6100, 4300, 3800][i] ?? 2000,
}));

export const mockStatusBreakdown = [
  { name: 'Completed', value: 142, color: '#22C55E' },
  { name: 'Confirmed', value: 38, color: '#7C3AED' },
  { name: 'Cancelled', value: 12, color: '#F97316' },
  { name: 'No-show', value: 6, color: '#EF4444' },
];

export const mockActivity: { id: string; text: string; time: string; type: string }[] = [
  { id: 'a1', text: 'Aisha Rahman booked Bridal Glam Package', time: '6m ago', type: 'booking' },
  { id: 'a2', text: 'Payment of $220 received from Olivia Martinez', time: '24m ago', type: 'payment' },
  { id: 'a3', text: 'Emma Thompson left a 5-star review', time: '1h ago', type: 'review' },
  { id: 'a4', text: 'Grace Kim joined as a new client', time: '2h ago', type: 'client' },
  { id: 'a5', text: 'Maya Chen completed Balayage & Gloss', time: '3h ago', type: 'done' },
];

function minsAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

export const mockNotifications: AppNotification[] = [
  {
    id: 'ntf_1',
    type: 'booking',
    title: 'New booking',
    body: 'Aisha Rahman booked Bridal Glam Package for tomorrow at 10:00.',
    createdAt: minsAgo(6),
    read: false,
  },
  {
    id: 'ntf_2',
    type: 'payment',
    title: 'Payment received',
    body: '$220 payment received from Olivia Martinez for Balayage & Gloss.',
    createdAt: minsAgo(24),
    read: false,
  },
  {
    id: 'ntf_3',
    type: 'review',
    title: 'New 5-star review',
    body: 'Emma Thompson left a glowing 5-star review for Isabella Rossi.',
    createdAt: minsAgo(70),
    read: false,
  },
  {
    id: 'ntf_4',
    type: 'system',
    title: 'Low stock alert',
    body: 'Argan Repair Oil is running low — only 3 units left in stock.',
    createdAt: minsAgo(180),
    read: true,
  },
];

export const mockLocations: Location[] = [
  {
    id: 'loc_1',
    name: 'Madison Avenue Flagship',
    phone: '+1 (212) 555-0100',
    address: '123 Madison Avenue',
    city: 'New York, NY 10016',
    country: 'US',
    isActive: true,
    workingHours: [
      { dayOfWeek: 1, startMin: 540, endMin: 1140 },
      { dayOfWeek: 2, startMin: 540, endMin: 1140 },
      { dayOfWeek: 3, startMin: 540, endMin: 1140 },
      { dayOfWeek: 4, startMin: 540, endMin: 1200 },
      { dayOfWeek: 5, startMin: 540, endMin: 1200 },
      { dayOfWeek: 6, startMin: 600, endMin: 1080 },
    ],
  },
  {
    id: 'loc_2',
    name: 'Upper East Side',
    phone: '+1 (212) 555-0200',
    address: '456 Park Avenue',
    city: 'New York, NY 10065',
    country: 'US',
    isActive: true,
    workingHours: [
      { dayOfWeek: 1, startMin: 540, endMin: 1140 },
      { dayOfWeek: 2, startMin: 540, endMin: 1140 },
      { dayOfWeek: 3, startMin: 540, endMin: 1140 },
      { dayOfWeek: 4, startMin: 540, endMin: 1140 },
      { dayOfWeek: 5, startMin: 540, endMin: 1140 },
      { dayOfWeek: 6, startMin: 600, endMin: 1020 },
    ],
  },
];

export const mockReviews: Review[] = [
  { id: 'rev_1', clientName: 'Emma Thompson', rating: 5, comment: 'Absolutely incredible experience. Isabella gave me the best haircut I\'ve ever had — she really listened to what I wanted and delivered beyond my expectations.', staffName: 'Isabella Rossi', serviceName: 'Signature Haircut & Style', createdAt: '2026-06-08' },
  { id: 'rev_2', clientName: 'Aisha Rahman', rating: 5, comment: 'Maya is a colour genius. My balayage looks so natural and the gloss treatment left my hair incredibly shiny. I\'ve been going to Lumière for 2 years and will never switch.', staffName: 'Maya Chen', serviceName: 'Balayage & Gloss', createdAt: '2026-06-11' },
  { id: 'rev_3', clientName: 'Sophia Williams', rating: 5, comment: 'The Radiance Facial was exactly what my skin needed. Leila was so knowledgeable and my skin has been glowing all week. Already booked my next appointment!', staffName: 'Leila Haddad', serviceName: 'Radiance Facial', createdAt: '2026-05-22' },
  { id: 'rev_4', clientName: 'Grace Kim', rating: 4, comment: 'Priya\'s nail art is second to none. The gel pedicure lasted 3 weeks without a chip. The salon itself is beautiful and very calming.', staffName: 'Priya Sharma', serviceName: 'Gel Pedicure', createdAt: '2026-05-30' },
  { id: 'rev_5', clientName: 'Olivia Martinez', rating: 5, comment: 'Came in for the Bridal Glam Package and looked absolutely stunning on my wedding day. The entire team went above and beyond to make it special. 100% recommend!', staffName: 'Isabella Rossi', serviceName: 'Bridal Glam Package', createdAt: '2026-06-01' },
  { id: 'rev_6', clientName: 'Layla Hassan', rating: 5, comment: 'Hot stone massage was so relaxing I fell asleep! The ambiance, the staff, the results — everything is 10/10. Lumière is worth every penny.', staffName: null, serviceName: 'Hot Stone Massage', createdAt: '2026-06-09' },
];

export const statusColors: Record<AppointmentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  CONFIRMED: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  CHECKED_IN: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  NO_SHOW: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300',
};
