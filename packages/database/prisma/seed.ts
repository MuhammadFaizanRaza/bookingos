/**
 * BookingOS seed — creates fully-populated demo data for EVERY industry
 * vertical so the product is instantly demoable for any business type after
 * `pnpm db:seed`.
 *
 * All demo logins use the password:  Passw0rd!
 *
 * ┌──────────────┬────────────┬───────────────────────────┬────────────────────────────┐
 * │ Business     │ Vertical   │ Owner login               │ Public booking site        │
 * ├──────────────┼────────────┼───────────────────────────┼────────────────────────────┤
 * │ Lumière      │ SALON      │ owner@lumiere.demo        │ /lumiere   (lumiere.*)     │
 * │ Bloom & Glow │ SALON      │ owner@bloom.demo          │ /bloom     (bloom.*)       │
 * │ MediCare     │ CLINIC     │ owner@medicare.demo       │ /medicare  (medicare.*)    │
 * │ Pulse Fitness│ FITNESS    │ owner@pulse.demo          │ /pulse     (pulse.*)       │
 * │ Azure Bay    │ HOTEL      │ owner@azure.demo          │ /azure     (azure.*)       │
 * │ GearUp       │ RENTAL     │ owner@gearup.demo         │ /gearup    (gearup.*)      │
 * │ Tavola       │ RESTAURANT │ owner@tavola.demo         │ /tavola    (tavola.*)      │
 * │ Summit       │ EVENTS     │ owner@summit.demo         │ /summit    (summit.*)      │
 * │ FixIt        │ SERVICES   │ owner@fixit.demo          │ /fixit     (fixit.*)       │
 * └──────────────┴────────────┴───────────────────────────┴────────────────────────────┘
 *
 * Public booking URL forms (web app, port 3000):
 *   subdomain:  http://<slug>.localhost:3000
 *   query:      http://localhost:3000?tenant=<slug>
 *
 * Every staff/resource user also logs in with Passw0rd! (e.g. amir@lumiere.demo).
 */
import {
  PrismaClient,
  Role,
  Vertical,
  BookingMode,
  ResourceType,
  AppointmentStatus,
  BookingSource,
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
  SaleItemType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_TIMEZONE = 'Asia/Karachi'; // default tz for the original salon tenants

const DAY = 24 * 60 * 60 * 1000;

/**
 * Returns a Date for `daysFromNow` days at `hour:min` in timezone `tz`.
 * Slots/appointments created by seed will appear at the correct local time
 * regardless of which timezone the Node process runs in.
 */
function at(
  daysFromNow: number,
  hour: number,
  min = 0,
  tz: string = SEED_TIMEZONE,
): Date {
  const now = new Date();
  // Compute today's date string in the target timezone (YYYY-MM-DD)
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [y, m, d] = dateStr.split('-').map(Number);
  // Midnight in tz expressed as UTC
  const noonUTC = Date.UTC(y, m - 1, d, 12);
  const offset = (() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parse = (parts: Intl.DateTimeFormatPart[]) => {
      const p = (t: string) =>
        Number(parts.find((x) => x.type === t)?.value ?? '0');
      const h = p('hour') === 24 ? 0 : p('hour');
      return Date.UTC(
        p('year'),
        p('month') - 1,
        p('day'),
        h,
        p('minute'),
        p('second'),
      );
    };
    const d2 = new Date(noonUTC);
    const local = parse(fmt.formatToParts(d2));
    const utc = parse(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(d2),
    );
    return local - utc; // ms east of UTC
  })();
  const midnightLocal = Date.UTC(y, m - 1, d) - offset;
  return new Date(
    midnightLocal + daysFromNow * DAY + (hour * 60 + min) * 60 * 1000,
  );
}

// ============================================================================
//  Generic vertical seeder
//  Drives every non-salon tenant from a declarative config so each vertical
//  gets a believable, complete dataset (catalogue + clients + past/future
//  bookings + sales/payments/reviews).
// ============================================================================

interface ResourceDef {
  email: string;
  name: string;
  title: string;
  bio?: string;
  color: string;
  resourceType?: ResourceType; // default HUMAN
  capacity?: number; // ROOM occupancy / TABLE seats
  commissionRate?: number;
}

interface ServiceDef {
  name: string;
  cat: number; // index into categories[]
  description?: string;
  bookingMode?: BookingMode; // default TIME_SLOT
  durationMin: number; // TIME_SLOT/CAPACITY slot length; DATE_RANGE ignored
  price: number; // per booking | per night/day | per seat/ticket
  capacity?: number; // CAPACITY: max seats/covers/tickets
  inventory?: number; // DATE_RANGE: identical units available
  color: string;
  deposit?: number;
}

interface ProductDef {
  name: string;
  sku: string;
  price: number;
  cost?: number;
  stockQty: number;
  lowStockAt?: number;
}

interface ApptDef {
  client: number; // index into clients[]
  svc: number; // index into services[]
  staff: number; // index into resources[]
  day: number; // daysFromNow for start / check-in
  hour: number;
  status: AppointmentStatus;
  // CAPACITY:
  partySize?: number; // seats / covers / tickets
  // DATE_RANGE:
  nights?: number; // nights/days for the stay/rental
  checkoutHour?: number; // local hour for check-out (default 11)
  // misc:
  quantity?: number; // units/rooms (DATE_RANGE) — defaults to 1
  source?: BookingSource;
  method?: PaymentMethod;
  rating?: number;
  comment?: string;
  notes?: string;
}

interface TenantCfg {
  name: string;
  slug: string;
  vertical: Vertical;
  currency: string;
  timezone: string;
  primaryColor: string;
  tagline: string;
  about: string;
  phone: string;
  address: string;
  locale?: string;
  plan?: 'STARTER' | 'PRO' | 'BUSINESS';
  seats?: number;
  instagramUrl?: string;
  hours?: { startMin: number; endMin: number; days?: number[] };
  locations: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
  }[];
  owner: { email: string; name: string };
  resources: ResourceDef[];
  categories: string[];
  services: ServiceDef[];
  clients: { name: string; email: string; phone: string }[];
  products?: ProductDef[];
  appts: ApptDef[];
  discount?: {
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    usageLimit?: number;
  };
}

async function seedTenant(cfg: TenantCfg, passwordHash: string) {
  const tz = cfg.timezone;

  const tenant = await prisma.tenant.create({
    data: {
      name: cfg.name,
      slug: cfg.slug,
      status: 'ACTIVE',
      plan: cfg.plan ?? 'PRO',
      vertical: cfg.vertical,
      locale: cfg.locale ?? 'en',
      currency: cfg.currency,
      timezone: tz,
      primaryColor: cfg.primaryColor,
      tagline: cfg.tagline,
      about: cfg.about,
      phone: cfg.phone,
      address: cfg.address,
      instagramUrl: cfg.instagramUrl,
      bookingEnabled: true,
      subscription: {
        create: {
          plan: cfg.plan ?? 'PRO',
          status: 'ACTIVE',
          seats: cfg.seats ?? 10,
          currentPeriodEnd: new Date(Date.now() + 30 * DAY),
        },
      },
    },
  });

  // Locations
  const locations = [];
  for (const l of cfg.locations) {
    locations.push(
      await prisma.location.create({
        data: {
          tenantId: tenant.id,
          name: l.name,
          phone: l.phone ?? cfg.phone,
          email: l.email ?? `hello@${cfg.slug}.demo`,
          address: l.address,
          city: l.city,
          country: l.country,
          timezone: tz,
        },
      }),
    );
  }
  const primaryLoc = locations[0];

  // Owner
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: cfg.owner.email,
      name: cfg.owner.name,
      role: Role.OWNER,
      passwordHash,
      locale: cfg.locale ?? 'en',
    },
  });

  // Resources (staff / rooms / tables / equipment) — each needs a backing User
  const humanHours = cfg.hours ?? {
    startMin: 9 * 60,
    endMin: 18 * 60,
    days: [1, 2, 3, 4, 5, 6],
  };
  const resources: { id: string; resourceType: ResourceType }[] = [];
  for (const r of cfg.resources) {
    const rt = r.resourceType ?? ResourceType.HUMAN;
    const u = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: r.email,
        name: r.name,
        role: Role.STAFF,
        passwordHash,
        locale: cfg.locale ?? 'en',
      },
    });
    const workingHours =
      rt === ResourceType.HUMAN
        ? (humanHours.days ?? [1, 2, 3, 4, 5, 6]).map((d) => ({
            dayOfWeek: d,
            startMin: humanHours.startMin,
            endMin: humanHours.endMin,
          }))
        : [0, 1, 2, 3, 4, 5, 6].map((d) => ({
            dayOfWeek: d,
            startMin: 0,
            endMin: 1439,
          }));
    const sp = await prisma.staffProfile.create({
      data: {
        tenantId: tenant.id,
        userId: u.id,
        locationId: primaryLoc.id,
        title: r.title,
        bio: r.bio,
        resourceType: rt,
        capacity: r.capacity,
        color: r.color,
        commissionRate: r.commissionRate ?? 0,
        workingHours: { create: workingHours },
      },
    });
    resources.push({ id: sp.id, resourceType: rt });
  }

  // Categories
  const categories = [];
  for (let i = 0; i < cfg.categories.length; i++) {
    categories.push(
      await prisma.serviceCategory.create({
        data: { tenantId: tenant.id, name: cfg.categories[i], sortOrder: i + 1 },
      }),
    );
  }

  // Services (kept alongside their numeric def for downstream math)
  const services: { rec: { id: string; name: string }; def: ServiceDef }[] = [];
  for (const s of cfg.services) {
    const rec = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[s.cat]?.id,
        name: s.name,
        description: s.description,
        bookingMode: s.bookingMode ?? BookingMode.TIME_SLOT,
        durationMin: s.durationMin,
        price: s.price,
        capacity: s.capacity,
        inventory: s.inventory,
        color: s.color,
        onlineBookable: true,
        depositRequired: (s.deposit ?? 0) > 0,
        depositAmount: (s.deposit ?? 0) > 0 ? s.deposit : null,
        staff: { connect: resources.map((r) => ({ id: r.id })) },
      },
    });
    services.push({ rec, def: s });
  }

  // Products (optional retail / inventory)
  if (cfg.products?.length) {
    await prisma.product.createMany({
      data: cfg.products.map((p) => ({
        tenantId: tenant.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        cost: p.cost,
        stockQty: p.stockQty,
        lowStockAt: p.lowStockAt ?? 5,
      })),
    });
  }

  // Clients
  const clients = [];
  for (const c of cfg.clients) {
    clients.push(
      await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          loyaltyPoints: 100,
          marketingOptIn: true,
        },
      }),
    );
  }

  // Appointments + (for completed) sale / payment / review
  for (const a of cfg.appts) {
    const { rec, def } = services[a.svc];
    const mode = def.bookingMode ?? BookingMode.TIME_SLOT;
    const resource = resources[a.staff];

    const start = at(a.day, a.hour, 0, tz);
    let end: Date;
    let durationMin: number;
    let quantity: number;
    let unitPrice: number;
    let partySize: number | undefined;

    if (mode === BookingMode.DATE_RANGE) {
      const nights = a.nights ?? 1;
      end = at(a.day + nights, a.checkoutHour ?? 11, 0, tz);
      durationMin = nights * 1440;
      quantity = a.quantity ?? 1; // rooms / units
      unitPrice = def.price * nights; // per-unit price across the stay
    } else if (mode === BookingMode.CAPACITY) {
      end = new Date(start.getTime() + def.durationMin * 60 * 1000);
      durationMin = def.durationMin;
      quantity = a.quantity ?? a.partySize ?? 1; // seats / covers / tickets
      partySize = a.partySize ?? quantity;
      unitPrice = def.price; // per seat/ticket
    } else {
      end = new Date(start.getTime() + def.durationMin * 60 * 1000);
      durationMin = def.durationMin;
      quantity = 1;
      unitPrice = def.price;
    }

    const lineTotal = unitPrice * quantity;

    const appt = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        locationId: primaryLoc.id,
        clientId: clients[a.client].id,
        status: a.status,
        source: a.source ?? BookingSource.ONLINE,
        startsAt: start,
        endsAt: end,
        partySize,
        notes: a.notes,
        total: lineTotal,
        items: {
          create: [
            {
              serviceId: rec.id,
              staffId: resource.id,
              startsAt: start,
              endsAt: end,
              quantity,
              price: unitPrice,
              durationMin,
            },
          ],
        },
      },
    });

    if (a.status === AppointmentStatus.COMPLETED) {
      const sale = await prisma.sale.create({
        data: {
          tenantId: tenant.id,
          locationId: primaryLoc.id,
          clientId: clients[a.client].id,
          appointmentId: appt.id,
          status: SaleStatus.PAID,
          subtotal: lineTotal,
          total: lineTotal,
          currency: cfg.currency,
          items: {
            create: [
              {
                type: SaleItemType.SERVICE,
                refId: rec.id,
                name: rec.name,
                quantity,
                unitPrice,
                total: lineTotal,
                staffId: resource.id,
              },
            ],
          },
        },
      });
      await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          saleId: sale.id,
          method: a.method ?? PaymentMethod.CARD,
          status: PaymentStatus.SUCCEEDED,
          amount: lineTotal,
          currency: cfg.currency,
        },
      });
      await prisma.review.create({
        data: {
          tenantId: tenant.id,
          clientId: clients[a.client].id,
          staffId:
            resource.resourceType === ResourceType.HUMAN ? resource.id : null,
          rating: a.rating ?? 5,
          comment: a.comment ?? 'Excellent experience — highly recommend!',
        },
      });
    }
  }

  // Discount
  if (cfg.discount) {
    await prisma.discount.create({
      data: {
        tenantId: tenant.id,
        code: cfg.discount.code,
        type: cfg.discount.type,
        value: cfg.discount.value,
        isActive: true,
        usageLimit: cfg.discount.usageLimit ?? 200,
      },
    });
  }

  return tenant;
}

async function main() {
  console.log('🌱  Seeding BookingOS demo data (all verticals)…');

  // Clean slate (dev only) — FK-safe order. (Tenant cascade would also clear
  // children, but we delete explicitly for clarity / partial re-seeds.)
  await prisma.$transaction([
    prisma.appointmentItem.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.review.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.product.deleteMany(),
    prisma.discount.deleteMany(),
    prisma.timeOff.deleteMany(),
    prisma.workingHours.deleteMany(),
    prisma.service.deleteMany(),
    prisma.serviceCategory.deleteMany(),
    prisma.client.deleteMany(),
    prisma.staffProfile.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.location.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash('Passw0rd!', 10);

  // ── Tenant 1: Lumière Beauty Lounge (SALON) ───────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Lumière Beauty Lounge',
      slug: 'lumiere',
      status: 'ACTIVE',
      plan: 'PRO',
      vertical: Vertical.SALON,
      locale: 'en',
      currency: 'PKR',
      timezone: SEED_TIMEZONE,
      primaryColor: '#7C3AED',
      tagline: 'Where every look becomes art.',
      subscription: {
        create: {
          plan: 'PRO',
          status: 'ACTIVE',
          seats: 10,
          currentPeriodEnd: new Date(Date.now() + 30 * DAY),
        },
      },
    },
  });

  const location = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Branch',
      phone: '+92 300 555 0101',
      email: 'hello@lumiere.demo',
      address: '120 Main Boulevard',
      city: 'Karachi',
      country: 'PK',
      timezone: SEED_TIMEZONE,
    },
  });

  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'owner@lumiere.demo',
      name: 'Sofia Marchetti',
      role: Role.OWNER,
      passwordHash,
      locale: 'en',
    },
  });
  void owner;

  // Staff
  const staffSeed = [
    {
      email: 'amir@lumiere.demo',
      name: 'Amir Khan',
      title: 'Senior Barber',
      color: '#0EA5E9',
    },
    {
      email: 'lena@lumiere.demo',
      name: 'Lena Park',
      title: 'Color Specialist',
      color: '#EC4899',
    },
    {
      email: 'yusra@lumiere.demo',
      name: 'Yusra Ali',
      title: 'Nail Artist',
      color: '#F59E0B',
    },
  ];
  const staff = [];
  for (const s of staffSeed) {
    const u = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: s.email,
        name: s.name,
        role: Role.STAFF,
        passwordHash,
        locale: 'en',
      },
    });
    const sp = await prisma.staffProfile.create({
      data: {
        tenantId: tenant.id,
        userId: u.id,
        locationId: location.id,
        title: s.title,
        color: s.color,
        commissionRate: 30,
        workingHours: {
          create: [1, 2, 3, 4, 5, 6].map((d) => ({
            dayOfWeek: d,
            startMin: 9 * 60,
            endMin: 19 * 60,
          })),
        },
      },
    });
    staff.push(sp);
  }

  // Catalogue
  const catHair = await prisma.serviceCategory.create({
    data: { tenantId: tenant.id, name: 'Hair', sortOrder: 1 },
  });
  const catColor = await prisma.serviceCategory.create({
    data: { tenantId: tenant.id, name: 'Color', sortOrder: 2 },
  });
  const catNails = await prisma.serviceCategory.create({
    data: { tenantId: tenant.id, name: 'Nails', sortOrder: 3 },
  });

  const serviceSeed = [
    {
      name: "Women's Haircut & Style",
      cat: catHair.id,
      duration: 60,
      price: 75,
      color: '#7C3AED',
    },
    {
      name: "Men's Cut & Fade",
      cat: catHair.id,
      duration: 45,
      price: 45,
      color: '#0EA5E9',
    },
    {
      name: 'Full Highlights',
      cat: catColor.id,
      duration: 120,
      price: 180,
      color: '#EC4899',
    },
    {
      name: 'Root Touch-Up',
      cat: catColor.id,
      duration: 75,
      price: 95,
      color: '#F472B6',
    },
    {
      name: 'Gel Manicure',
      cat: catNails.id,
      duration: 45,
      price: 40,
      color: '#F59E0B',
    },
    {
      name: 'Luxury Pedicure',
      cat: catNails.id,
      duration: 60,
      price: 55,
      color: '#10B981',
    },
  ];
  const services = [];
  for (const s of serviceSeed) {
    const svc = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        categoryId: s.cat,
        name: s.name,
        durationMin: s.duration,
        price: s.price,
        color: s.color,
        onlineBookable: true,
        staff: { connect: staff.map((st) => ({ id: st.id })) },
      },
    });
    services.push(svc);
  }

  // Products
  await prisma.product.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: 'Argan Repair Shampoo',
        sku: 'SHMP-01',
        price: 28,
        cost: 11,
        stockQty: 40,
      },
      {
        tenantId: tenant.id,
        name: 'Hydrating Conditioner',
        sku: 'COND-01',
        price: 26,
        cost: 10,
        stockQty: 35,
      },
      {
        tenantId: tenant.id,
        name: 'Heat Protect Spray',
        sku: 'SPRY-01',
        price: 22,
        cost: 8,
        stockQty: 4,
      },
    ],
  });

  // Clients
  const clientSeed = [
    {
      name: 'Emma Wilson',
      email: 'emma@example.com',
      phone: '+1 212 555 1001',
    },
    { name: 'Noah Davis', email: 'noah@example.com', phone: '+1 212 555 1002' },
    {
      name: 'Aisha Rahman',
      email: 'aisha@example.com',
      phone: '+1 212 555 1003',
    },
    { name: 'Liam Chen', email: 'liam@example.com', phone: '+1 212 555 1004' },
  ];
  const clients = [];
  for (const c of clientSeed) {
    clients.push(
      await prisma.client.create({
        data: {
          tenantId: tenant.id,
          ...c,
          loyaltyPoints: 120,
          marketingOptIn: true,
        },
      }),
    );
  }

  // Appointments (past completed + upcoming) + one sale/payment
  const apptPlan = [
    {
      client: 0,
      svc: 0,
      staff: 1,
      day: -2,
      hour: 11,
      status: AppointmentStatus.COMPLETED,
    },
    {
      client: 1,
      svc: 1,
      staff: 0,
      day: -1,
      hour: 14,
      status: AppointmentStatus.COMPLETED,
    },
    {
      client: 2,
      svc: 2,
      staff: 1,
      day: 0,
      hour: 13,
      status: AppointmentStatus.CONFIRMED,
    },
    {
      client: 3,
      svc: 4,
      staff: 2,
      day: 1,
      hour: 10,
      status: AppointmentStatus.CONFIRMED,
    },
    {
      client: 0,
      svc: 5,
      staff: 2,
      day: 2,
      hour: 16,
      status: AppointmentStatus.PENDING,
    },
  ];

  for (const p of apptPlan) {
    const svc = services[p.svc];
    const start = at(p.day, p.hour);
    const end = new Date(start.getTime() + svc.durationMin * 60 * 1000);
    const appt = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        locationId: location.id,
        clientId: clients[p.client].id,
        status: p.status,
        source: BookingSource.ONLINE,
        startsAt: start,
        endsAt: end,
        total: svc.price,
        items: {
          create: [
            {
              serviceId: svc.id,
              staffId: staff[p.staff].id,
              startsAt: start,
              endsAt: end,
              price: svc.price,
              durationMin: svc.durationMin,
            },
          ],
        },
      },
    });

    if (p.status === AppointmentStatus.COMPLETED) {
      const sale = await prisma.sale.create({
        data: {
          tenantId: tenant.id,
          locationId: location.id,
          clientId: clients[p.client].id,
          appointmentId: appt.id,
          status: SaleStatus.PAID,
          subtotal: svc.price,
          total: svc.price,
          currency: 'USD',
          items: {
            create: [
              {
                type: SaleItemType.SERVICE,
                refId: svc.id,
                name: svc.name,
                quantity: 1,
                unitPrice: svc.price,
                total: svc.price,
                staffId: staff[p.staff].id,
              },
            ],
          },
        },
      });
      await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          saleId: sale.id,
          method: PaymentMethod.CARD,
          status: PaymentStatus.SUCCEEDED,
          amount: svc.price,
          currency: 'USD',
        },
      });
      await prisma.review.create({
        data: {
          tenantId: tenant.id,
          clientId: clients[p.client].id,
          staffId: staff[p.staff].id,
          rating: 5,
          comment: 'Absolutely loved it!',
        },
      });
    }
  }

  await prisma.discount.create({
    data: {
      tenantId: tenant.id,
      code: 'WELCOME10',
      type: 'PERCENT',
      value: 10,
      isActive: true,
      usageLimit: 500,
    },
  });

  // ── Tenant 2: Bloom & Glow Studio (SALON) ─────────────────────────────────
  const bloom = await prisma.tenant.create({
    data: {
      name: 'Bloom & Glow Studio',
      slug: 'bloom',
      status: 'ACTIVE',
      plan: 'STARTER',
      vertical: Vertical.SALON,
      locale: 'en',
      currency: 'USD',
      timezone: 'America/Los_Angeles',
      primaryColor: '#059669',
      tagline: 'Radiant skin, effortless nails.',
      about:
        "Bloom & Glow Studio is Beverly Hills' favourite destination for glowing skin and flawless nails. Our expert estheticians and nail artists specialise in customised facials, organic waxing, and precision nail art — all in a calm, spa-like atmosphere.",
      phone: '+1 (310) 555-0200',
      address: '9200 Sunset Boulevard, West Hollywood, CA 90069',
      instagramUrl: 'https://instagram.com/bloomglowstudio',
      bookingEnabled: true,
      subscription: {
        create: {
          plan: 'STARTER',
          status: 'ACTIVE',
          seats: 5,
          currentPeriodEnd: new Date(Date.now() + 30 * DAY),
        },
      },
    },
  });

  const bloomLoc1 = await prisma.location.create({
    data: {
      tenantId: bloom.id,
      name: 'West Hollywood Studio',
      phone: '+1 (310) 555-0200',
      email: 'hello@bloom.demo',
      address: '9200 Sunset Boulevard',
      city: 'West Hollywood',
      country: 'US',
      timezone: 'America/Los_Angeles',
    },
  });

  const bloomLoc2 = await prisma.location.create({
    data: {
      tenantId: bloom.id,
      name: 'Beverly Hills Lounge',
      phone: '+1 (310) 555-0210',
      email: 'beverlyhills@bloom.demo',
      address: '462 N Bedford Drive',
      city: 'Beverly Hills',
      country: 'US',
      timezone: 'America/Los_Angeles',
    },
  });
  void bloomLoc2;

  const bloomOwner = await prisma.user.create({
    data: {
      tenantId: bloom.id,
      email: 'owner@bloom.demo',
      name: 'Camille Dubois',
      role: Role.OWNER,
      passwordHash,
      locale: 'en',
    },
  });
  void bloomOwner;

  const bloomStaffSeed = [
    {
      email: 'jade@bloom.demo',
      name: 'Jade Rivera',
      title: 'Lead Esthetician',
      color: '#059669',
    },
    {
      email: 'mei@bloom.demo',
      name: 'Mei Tanaka',
      title: 'Nail Artist',
      color: '#10B981',
    },
    {
      email: 'zara@bloom.demo',
      name: 'Zara Okafor',
      title: 'Wax Specialist',
      color: '#34D399',
    },
  ];
  const bloomStaff = [];
  for (const s of bloomStaffSeed) {
    const u = await prisma.user.create({
      data: {
        tenantId: bloom.id,
        email: s.email,
        name: s.name,
        role: Role.STAFF,
        passwordHash,
        locale: 'en',
      },
    });
    const sp = await prisma.staffProfile.create({
      data: {
        tenantId: bloom.id,
        userId: u.id,
        locationId: bloomLoc1.id,
        title: s.title,
        color: s.color,
        commissionRate: 30,
        workingHours: {
          create: [1, 2, 3, 4, 5, 6].map((d) => ({
            dayOfWeek: d,
            startMin: 9 * 60,
            endMin: 18 * 60,
          })),
        },
      },
    });
    bloomStaff.push(sp);
  }

  const bloomCatSkin = await prisma.serviceCategory.create({
    data: { tenantId: bloom.id, name: 'Skin', sortOrder: 1 },
  });
  const bloomCatNails = await prisma.serviceCategory.create({
    data: { tenantId: bloom.id, name: 'Nails', sortOrder: 2 },
  });
  const bloomCatWax = await prisma.serviceCategory.create({
    data: { tenantId: bloom.id, name: 'Waxing', sortOrder: 3 },
  });
  const bloomCatBrow = await prisma.serviceCategory.create({
    data: { tenantId: bloom.id, name: 'Brows', sortOrder: 4 },
  });

  const bloomServiceSeed = [
    {
      name: 'Radiance Facial',
      cat: bloomCatSkin.id,
      duration: 75,
      price: 120,
      color: '#059669',
      deposit: 30,
    },
    {
      name: 'Deep Cleanse Facial',
      cat: bloomCatSkin.id,
      duration: 60,
      price: 90,
      color: '#10B981',
      deposit: 0,
    },
    {
      name: 'Gel Manicure',
      cat: bloomCatNails.id,
      duration: 45,
      price: 50,
      color: '#34D399',
      deposit: 0,
    },
    {
      name: 'Signature Pedicure',
      cat: bloomCatNails.id,
      duration: 60,
      price: 65,
      color: '#6EE7B7',
      deposit: 0,
    },
    {
      name: 'Nail Art (per nail)',
      cat: bloomCatNails.id,
      duration: 30,
      price: 25,
      color: '#A7F3D0',
      deposit: 0,
    },
    {
      name: 'Full Leg Wax',
      cat: bloomCatWax.id,
      duration: 45,
      price: 70,
      color: '#047857',
      deposit: 0,
    },
    {
      name: 'Brow Lamination',
      cat: bloomCatBrow.id,
      duration: 45,
      price: 55,
      color: '#065F46',
      deposit: 0,
    },
    {
      name: 'Lash Lift & Tint',
      cat: bloomCatBrow.id,
      duration: 60,
      price: 80,
      color: '#064E3B',
      deposit: 20,
    },
  ];
  const bloomServices = [];
  for (const s of bloomServiceSeed) {
    const svc = await prisma.service.create({
      data: {
        tenantId: bloom.id,
        categoryId: s.cat,
        name: s.name,
        durationMin: s.duration,
        price: s.price,
        color: s.color,
        onlineBookable: true,
        depositRequired: s.deposit > 0,
        depositAmount: s.deposit > 0 ? s.deposit : null,
        staff: { connect: bloomStaff.map((st) => ({ id: st.id })) },
      },
    });
    bloomServices.push(svc);
  }

  const bloomClientSeed = [
    {
      name: 'Sofia Reyes',
      email: 'sofia@example.com',
      phone: '+1 310 555 2001',
    },
    { name: 'Ava Johnson', email: 'ava@example.com', phone: '+1 310 555 2002' },
    { name: 'Mia Patel', email: 'mia@example.com', phone: '+1 310 555 2003' },
  ];
  const bloomClients = [];
  for (const c of bloomClientSeed) {
    bloomClients.push(
      await prisma.client.create({
        data: { tenantId: bloom.id, ...c, loyaltyPoints: 80 },
      }),
    );
  }

  const bloomApptPlan = [
    {
      client: 0,
      svc: 0,
      staff: 0,
      day: -1,
      hour: 10,
      status: AppointmentStatus.COMPLETED,
    },
    {
      client: 1,
      svc: 2,
      staff: 1,
      day: 0,
      hour: 11,
      status: AppointmentStatus.CONFIRMED,
    },
    {
      client: 2,
      svc: 6,
      staff: 2,
      day: 1,
      hour: 14,
      status: AppointmentStatus.PENDING,
    },
  ];
  for (const p of bloomApptPlan) {
    const svc = bloomServices[p.svc];
    const start = at(p.day, p.hour);
    const end = new Date(start.getTime() + svc.durationMin * 60 * 1000);
    const appt = await prisma.appointment.create({
      data: {
        tenantId: bloom.id,
        locationId: bloomLoc1.id,
        clientId: bloomClients[p.client].id,
        status: p.status,
        source: BookingSource.ONLINE,
        startsAt: start,
        endsAt: end,
        total: svc.price,
        items: {
          create: [
            {
              serviceId: svc.id,
              staffId: bloomStaff[p.staff].id,
              startsAt: start,
              endsAt: end,
              price: svc.price,
              durationMin: svc.durationMin,
            },
          ],
        },
      },
    });
    if (p.status === AppointmentStatus.COMPLETED) {
      const sale = await prisma.sale.create({
        data: {
          tenantId: bloom.id,
          locationId: bloomLoc1.id,
          clientId: bloomClients[p.client].id,
          appointmentId: appt.id,
          status: SaleStatus.PAID,
          subtotal: svc.price,
          total: svc.price,
          currency: 'USD',
          items: {
            create: [
              {
                type: SaleItemType.SERVICE,
                refId: svc.id,
                name: svc.name,
                quantity: 1,
                unitPrice: svc.price,
                total: svc.price,
                staffId: bloomStaff[p.staff].id,
              },
            ],
          },
        },
      });
      await prisma.payment.create({
        data: {
          tenantId: bloom.id,
          saleId: sale.id,
          method: PaymentMethod.CARD,
          status: PaymentStatus.SUCCEEDED,
          amount: svc.price,
          currency: 'USD',
        },
      });
      await prisma.review.create({
        data: {
          tenantId: bloom.id,
          clientId: bloomClients[p.client].id,
          staffId: bloomStaff[p.staff].id,
          rating: 5,
          comment: 'Best facial ever, my skin is glowing!',
        },
      });
    }
  }

  await prisma.discount.create({
    data: {
      tenantId: bloom.id,
      code: 'BLOOM15',
      type: 'PERCENT',
      value: 15,
      isActive: true,
      usageLimit: 200,
    },
  });

  // ── Tenant 3: MediCare Family Clinic (CLINIC) ─────────────────────────────
  await seedTenant(
    {
      name: 'MediCare Family Clinic',
      slug: 'medicare',
      vertical: Vertical.CLINIC,
      currency: 'USD',
      timezone: 'America/New_York',
      primaryColor: '#0EA5E9',
      tagline: 'Trusted care for the whole family.',
      about:
        'MediCare Family Clinic provides comprehensive primary and specialist care with same-day appointments, on-site diagnostics, and a patient-first approach. Our board-certified practitioners are here for every stage of your health journey.',
      phone: '+1 (617) 555-0300',
      address: '88 Beacon Street, Boston, MA 02108',
      plan: 'PRO',
      hours: { startMin: 8 * 60, endMin: 17 * 60, days: [1, 2, 3, 4, 5] },
      locations: [
        {
          name: 'Beacon Hill Clinic',
          city: 'Boston',
          country: 'US',
          address: '88 Beacon Street',
        },
      ],
      owner: { email: 'owner@medicare.demo', name: 'Dr. Eleanor Voss' },
      resources: [
        {
          email: 'dr.patel@medicare.demo',
          name: 'Dr. Rajan Patel',
          title: 'General Practitioner',
          bio: 'Family medicine, 15 years experience.',
          color: '#0EA5E9',
        },
        {
          email: 'dr.nguyen@medicare.demo',
          name: 'Dr. Linh Nguyen',
          title: 'Dermatologist',
          bio: 'Medical & cosmetic dermatology.',
          color: '#6366F1',
        },
        {
          email: 'nurse.cole@medicare.demo',
          name: 'Sarah Cole, RN',
          title: 'Nurse Practitioner',
          color: '#22D3EE',
        },
      ],
      categories: ['Primary Care', 'Specialist'],
      services: [
        {
          name: 'General Consultation',
          cat: 0,
          durationMin: 30,
          price: 120,
          color: '#0EA5E9',
          description: 'Standard primary-care consultation.',
        },
        {
          name: 'Follow-up Visit',
          cat: 0,
          durationMin: 20,
          price: 80,
          color: '#38BDF8',
        },
        {
          name: 'Annual Physical Exam',
          cat: 0,
          durationMin: 45,
          price: 250,
          color: '#0284C7',
        },
        {
          name: 'Dermatology Consultation',
          cat: 1,
          durationMin: 40,
          price: 180,
          color: '#6366F1',
          deposit: 50,
        },
        {
          name: 'Minor Skin Procedure',
          cat: 1,
          durationMin: 60,
          price: 320,
          color: '#818CF8',
        },
      ],
      clients: [
        {
          name: 'Robert Hayes',
          email: 'robert.h@example.com',
          phone: '+1 617 555 3101',
        },
        {
          name: 'Maria Gomez',
          email: 'maria.g@example.com',
          phone: '+1 617 555 3102',
        },
        {
          name: 'James Carter',
          email: 'james.c@example.com',
          phone: '+1 617 555 3103',
        },
        {
          name: 'Priya Sharma',
          email: 'priya.s@example.com',
          phone: '+1 617 555 3104',
        },
      ],
      products: [
        {
          name: 'Vitamin D3 Supplement',
          sku: 'MED-VITD',
          price: 18,
          cost: 7,
          stockQty: 30,
        },
        {
          name: 'Medical Compression Sleeve',
          sku: 'MED-COMP',
          price: 45,
          cost: 18,
          stockQty: 3,
          lowStockAt: 5,
        },
      ],
      appts: [
        {
          client: 0,
          svc: 0,
          staff: 0,
          day: -3,
          hour: 9,
          status: AppointmentStatus.COMPLETED,
          rating: 5,
          comment: 'Dr. Patel was thorough and reassuring.',
        },
        {
          client: 1,
          svc: 3,
          staff: 1,
          day: -1,
          hour: 11,
          status: AppointmentStatus.COMPLETED,
          rating: 4,
          comment: 'Great care, short wait.',
        },
        {
          client: 2,
          svc: 2,
          staff: 0,
          day: 0,
          hour: 14,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 3,
          svc: 1,
          staff: 2,
          day: 1,
          hour: 10,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 0,
          svc: 4,
          staff: 1,
          day: 3,
          hour: 13,
          status: AppointmentStatus.PENDING,
        },
      ],
      discount: { code: 'NEWPATIENT', type: 'FIXED', value: 25, usageLimit: 300 },
    },
    passwordHash,
  );

  // ── Tenant 4: Pulse Fitness Studio (FITNESS) ──────────────────────────────
  await seedTenant(
    {
      name: 'Pulse Fitness Studio',
      slug: 'pulse',
      vertical: Vertical.FITNESS,
      currency: 'GBP',
      timezone: 'Europe/London',
      primaryColor: '#F97316',
      tagline: 'Find your rhythm. Power your day.',
      about:
        'Pulse Fitness Studio offers high-energy group classes led by certified trainers — from HIIT and spin to yoga and pilates. Small class sizes, big results. Drop in or go unlimited.',
      phone: '+44 20 7946 0400',
      address: '15 Shoreditch High Street, London E1 6PG',
      plan: 'PRO',
      instagramUrl: 'https://instagram.com/pulsefitnessldn',
      hours: { startMin: 6 * 60, endMin: 21 * 60, days: [0, 1, 2, 3, 4, 5, 6] },
      locations: [
        {
          name: 'Shoreditch Studio',
          city: 'London',
          country: 'GB',
          address: '15 Shoreditch High Street',
        },
      ],
      owner: { email: 'owner@pulse.demo', name: 'Marcus Bell' },
      resources: [
        {
          email: 'tara@pulse.demo',
          name: 'Tara Lindqvist',
          title: 'HIIT & Strength Coach',
          color: '#F97316',
        },
        {
          email: 'dev@pulse.demo',
          name: 'Dev Anand',
          title: 'Spin Instructor',
          color: '#FB923C',
        },
        {
          email: 'naomi@pulse.demo',
          name: 'Naomi Clarke',
          title: 'Yoga & Pilates Teacher',
          color: '#FDBA74',
        },
      ],
      categories: ['Cardio', 'Strength', 'Mind & Body'],
      services: [
        {
          name: 'HIIT Blast (45 min)',
          cat: 0,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 45,
          price: 18,
          capacity: 16,
          color: '#F97316',
          description: 'High-intensity interval training for all levels.',
        },
        {
          name: 'Spin Ride (45 min)',
          cat: 0,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 45,
          price: 16,
          capacity: 20,
          color: '#FB923C',
        },
        {
          name: 'Strength & Conditioning',
          cat: 1,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 60,
          price: 20,
          capacity: 12,
          color: '#EA580C',
        },
        {
          name: 'Vinyasa Yoga',
          cat: 2,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 60,
          price: 15,
          capacity: 18,
          color: '#FDBA74',
        },
        {
          name: 'Reformer Pilates',
          cat: 2,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 50,
          price: 22,
          capacity: 10,
          color: '#FED7AA',
        },
      ],
      clients: [
        {
          name: 'Olivia Bennett',
          email: 'olivia.b@example.com',
          phone: '+44 7700 900401',
        },
        {
          name: 'Tom Hughes',
          email: 'tom.h@example.com',
          phone: '+44 7700 900402',
        },
        {
          name: 'Fatima Noor',
          email: 'fatima.n@example.com',
          phone: '+44 7700 900403',
        },
        {
          name: 'Daniel Kim',
          email: 'daniel.k@example.com',
          phone: '+44 7700 900404',
        },
      ],
      products: [
        {
          name: 'Pulse Whey Protein 1kg',
          sku: 'PUL-WHEY',
          price: 35,
          cost: 16,
          stockQty: 24,
        },
        {
          name: 'Pulse Branded Water Bottle',
          sku: 'PUL-BTL',
          price: 12,
          cost: 4,
          stockQty: 2,
          lowStockAt: 5,
        },
      ],
      appts: [
        {
          client: 0,
          svc: 0,
          staff: 0,
          day: -2,
          hour: 7,
          status: AppointmentStatus.COMPLETED,
          partySize: 2,
          rating: 5,
          comment: 'Tara pushed us hard — loved it!',
        },
        {
          client: 1,
          svc: 1,
          staff: 1,
          day: -1,
          hour: 18,
          status: AppointmentStatus.COMPLETED,
          partySize: 1,
          rating: 5,
          comment: 'Best spin class in London.',
        },
        {
          client: 2,
          svc: 3,
          staff: 2,
          day: 0,
          hour: 9,
          status: AppointmentStatus.CONFIRMED,
          partySize: 1,
        },
        {
          client: 3,
          svc: 4,
          staff: 2,
          day: 1,
          hour: 19,
          status: AppointmentStatus.CONFIRMED,
          partySize: 2,
        },
        {
          client: 0,
          svc: 2,
          staff: 0,
          day: 2,
          hour: 8,
          status: AppointmentStatus.PENDING,
          partySize: 1,
        },
      ],
      discount: { code: 'FIRSTCLASS', type: 'PERCENT', value: 100, usageLimit: 500 },
    },
    passwordHash,
  );

  // ── Tenant 5: Azure Bay Hotel (HOTEL) ─────────────────────────────────────
  await seedTenant(
    {
      name: 'Azure Bay Hotel',
      slug: 'azure',
      vertical: Vertical.HOTEL,
      currency: 'EUR',
      timezone: 'Europe/Paris',
      primaryColor: '#2563EB',
      tagline: 'Your seaside escape on the Côte d’Azur.',
      about:
        'Azure Bay Hotel is a boutique seafront retreat in Nice offering elegantly appointed rooms, a rooftop pool, and Michelin-recommended dining. Every stay comes with sweeping Mediterranean views.',
      phone: '+33 4 93 00 0500',
      address: '7 Promenade des Anglais, 06000 Nice, France',
      plan: 'BUSINESS',
      seats: 15,
      locations: [
        {
          name: 'Azure Bay — Nice',
          city: 'Nice',
          country: 'FR',
          address: '7 Promenade des Anglais',
        },
      ],
      owner: { email: 'owner@azure.demo', name: 'Camille Laurent' },
      resources: [
        {
          email: 'standard@azure.demo',
          name: 'Standard Double Room',
          title: 'Standard Double',
          resourceType: ResourceType.ROOM,
          capacity: 2,
          color: '#93C5FD',
        },
        {
          email: 'deluxe@azure.demo',
          name: 'Deluxe King Room',
          title: 'Deluxe King',
          resourceType: ResourceType.ROOM,
          capacity: 2,
          color: '#3B82F6',
        },
        {
          email: 'suite@azure.demo',
          name: 'Sea-View Suite',
          title: 'Sea-View Suite',
          resourceType: ResourceType.ROOM,
          capacity: 4,
          color: '#1D4ED8',
        },
      ],
      categories: ['Rooms', 'Suites'],
      services: [
        {
          name: 'Standard Double Room',
          cat: 0,
          bookingMode: BookingMode.DATE_RANGE,
          durationMin: 1440,
          price: 120,
          inventory: 10,
          color: '#93C5FD',
          description: 'Cozy double room with city view. Per night.',
        },
        {
          name: 'Deluxe King Room',
          cat: 0,
          bookingMode: BookingMode.DATE_RANGE,
          durationMin: 1440,
          price: 180,
          inventory: 8,
          color: '#3B82F6',
          description: 'Spacious king room with balcony. Per night.',
          deposit: 90,
        },
        {
          name: 'Sea-View Suite',
          cat: 1,
          bookingMode: BookingMode.DATE_RANGE,
          durationMin: 1440,
          price: 320,
          inventory: 4,
          color: '#1D4ED8',
          description: 'Premium suite with panoramic sea views. Per night.',
          deposit: 160,
        },
      ],
      clients: [
        {
          name: 'Henri Dubois',
          email: 'henri.d@example.com',
          phone: '+33 6 12 34 5601',
        },
        {
          name: 'Greta Schmidt',
          email: 'greta.s@example.com',
          phone: '+49 151 2345601',
        },
        {
          name: 'William Brooks',
          email: 'william.b@example.com',
          phone: '+44 7700 900501',
        },
        {
          name: 'Lucia Romano',
          email: 'lucia.r@example.com',
          phone: '+39 333 555 0601',
        },
      ],
      appts: [
        {
          client: 0,
          svc: 1,
          staff: 1,
          day: -7,
          hour: 15,
          nights: 3,
          checkoutHour: 11,
          quantity: 1,
          status: AppointmentStatus.COMPLETED,
          rating: 5,
          comment: 'Stunning views and impeccable service.',
        },
        {
          client: 1,
          svc: 2,
          staff: 2,
          day: -4,
          hour: 15,
          nights: 2,
          checkoutHour: 11,
          quantity: 1,
          status: AppointmentStatus.COMPLETED,
          rating: 5,
          comment: 'The suite was worth every euro.',
        },
        {
          client: 2,
          svc: 0,
          staff: 0,
          day: 2,
          hour: 15,
          nights: 4,
          checkoutHour: 11,
          quantity: 2,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 3,
          svc: 1,
          staff: 1,
          day: 6,
          hour: 15,
          nights: 5,
          checkoutHour: 11,
          quantity: 1,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 0,
          svc: 2,
          staff: 2,
          day: 14,
          hour: 15,
          nights: 2,
          checkoutHour: 11,
          quantity: 1,
          status: AppointmentStatus.PENDING,
        },
      ],
      discount: { code: 'STAYLONGER', type: 'PERCENT', value: 12, usageLimit: 100 },
    },
    passwordHash,
  );

  // ── Tenant 6: GearUp Outdoor Rentals (RENTAL) ─────────────────────────────
  await seedTenant(
    {
      name: 'GearUp Outdoor Rentals',
      slug: 'gearup',
      vertical: Vertical.RENTAL,
      currency: 'USD',
      timezone: 'America/Denver',
      primaryColor: '#16A34A',
      tagline: 'Gear up. Get out. Explore more.',
      about:
        'GearUp rents premium outdoor equipment for your next adventure — mountain bikes, kayaks, camping kits and more. Daily and multi-day rates, free delivery within Boulder, and gear maintained to the highest standard.',
      phone: '+1 (303) 555-0600',
      address: '1100 Pearl Street, Boulder, CO 80302',
      plan: 'STARTER',
      seats: 5,
      locations: [
        {
          name: 'Boulder Depot',
          city: 'Boulder',
          country: 'US',
          address: '1100 Pearl Street',
        },
      ],
      owner: { email: 'owner@gearup.demo', name: 'Hannah Brooks' },
      resources: [
        {
          email: 'bikes@gearup.demo',
          name: 'Mountain Bike Fleet',
          title: 'Mountain Bikes',
          resourceType: ResourceType.EQUIPMENT,
          color: '#16A34A',
        },
        {
          email: 'kayaks@gearup.demo',
          name: 'Kayak Fleet',
          title: 'Kayaks',
          resourceType: ResourceType.EQUIPMENT,
          color: '#22C55E',
        },
        {
          email: 'camping@gearup.demo',
          name: 'Camping Gear',
          title: 'Camping Kits',
          resourceType: ResourceType.UNIT,
          color: '#4ADE80',
        },
      ],
      categories: ['Cycling', 'Watersports', 'Camping'],
      services: [
        {
          name: 'Mountain Bike (per day)',
          cat: 0,
          bookingMode: BookingMode.DATE_RANGE,
          durationMin: 1440,
          price: 45,
          inventory: 12,
          color: '#16A34A',
          description: 'Full-suspension trail bike. Helmet included.',
        },
        {
          name: 'E-Bike (per day)',
          cat: 0,
          bookingMode: BookingMode.DATE_RANGE,
          durationMin: 1440,
          price: 65,
          inventory: 6,
          color: '#15803D',
          deposit: 50,
        },
        {
          name: 'Sea Kayak (per day)',
          cat: 1,
          bookingMode: BookingMode.DATE_RANGE,
          durationMin: 1440,
          price: 35,
          inventory: 8,
          color: '#22C55E',
        },
        {
          name: '4-Person Camping Kit (per day)',
          cat: 2,
          bookingMode: BookingMode.DATE_RANGE,
          durationMin: 1440,
          price: 40,
          inventory: 15,
          color: '#4ADE80',
          description: 'Tent, sleeping bags, stove and lantern.',
        },
      ],
      clients: [
        {
          name: 'Ethan Wright',
          email: 'ethan.w@example.com',
          phone: '+1 303 555 6101',
        },
        {
          name: 'Sophie Turner',
          email: 'sophie.t@example.com',
          phone: '+1 303 555 6102',
        },
        {
          name: 'Carlos Mendez',
          email: 'carlos.m@example.com',
          phone: '+1 303 555 6103',
        },
        {
          name: 'Nina Petrova',
          email: 'nina.p@example.com',
          phone: '+1 303 555 6104',
        },
      ],
      products: [
        {
          name: 'Trail Repair Kit',
          sku: 'GEAR-RPR',
          price: 24,
          cost: 9,
          stockQty: 18,
        },
        {
          name: 'Insulated Water Bladder 2L',
          sku: 'GEAR-H2O',
          price: 30,
          cost: 12,
          stockQty: 4,
          lowStockAt: 5,
        },
      ],
      appts: [
        {
          client: 0,
          svc: 0,
          staff: 0,
          day: -5,
          hour: 9,
          nights: 2,
          checkoutHour: 17,
          quantity: 2,
          status: AppointmentStatus.COMPLETED,
          rating: 5,
          comment: 'Bikes were in perfect condition.',
        },
        {
          client: 1,
          svc: 2,
          staff: 1,
          day: -2,
          hour: 8,
          nights: 1,
          checkoutHour: 18,
          quantity: 1,
          status: AppointmentStatus.COMPLETED,
          rating: 4,
          comment: 'Great kayak, easy pickup.',
        },
        {
          client: 2,
          svc: 3,
          staff: 2,
          day: 1,
          hour: 10,
          nights: 3,
          checkoutHour: 17,
          quantity: 1,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 3,
          svc: 1,
          staff: 0,
          day: 3,
          hour: 9,
          nights: 2,
          checkoutHour: 17,
          quantity: 2,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 0,
          svc: 0,
          staff: 0,
          day: 7,
          hour: 9,
          nights: 1,
          checkoutHour: 18,
          quantity: 1,
          status: AppointmentStatus.PENDING,
        },
      ],
      discount: { code: 'WEEKEND10', type: 'PERCENT', value: 10, usageLimit: 250 },
    },
    passwordHash,
  );

  // ── Tenant 7: Tavola Trattoria (RESTAURANT) ───────────────────────────────
  await seedTenant(
    {
      name: 'Tavola Trattoria',
      slug: 'tavola',
      vertical: Vertical.RESTAURANT,
      currency: 'EUR',
      timezone: 'Europe/Rome',
      primaryColor: '#DC2626',
      tagline: 'Authentic Italian, made for sharing.',
      about:
        'Tavola Trattoria serves rustic Italian classics in the heart of Rome — handmade pasta, wood-fired pizza, and an all-Italian wine list. Reserve your table for lunch or dinner.',
      phone: '+39 06 555 0700',
      address: 'Via dei Coronari 24, 00186 Roma RM, Italy',
      plan: 'PRO',
      instagramUrl: 'https://instagram.com/tavolaroma',
      hours: { startMin: 12 * 60, endMin: 23 * 60, days: [0, 1, 2, 3, 4, 5, 6] },
      locations: [
        {
          name: 'Tavola — Centro Storico',
          city: 'Rome',
          country: 'IT',
          address: 'Via dei Coronari 24',
        },
      ],
      owner: { email: 'owner@tavola.demo', name: 'Giulia Conti' },
      resources: [
        {
          email: 'table-window@tavola.demo',
          name: 'Window Table',
          title: 'Window Table (2)',
          resourceType: ResourceType.TABLE,
          capacity: 2,
          color: '#DC2626',
        },
        {
          email: 'table-main@tavola.demo',
          name: 'Main Hall Table',
          title: 'Main Hall Table (4)',
          resourceType: ResourceType.TABLE,
          capacity: 4,
          color: '#EF4444',
        },
        {
          email: 'table-terrace@tavola.demo',
          name: 'Terrace Table',
          title: 'Terrace Table (6)',
          resourceType: ResourceType.TABLE,
          capacity: 6,
          color: '#F87171',
        },
      ],
      categories: ['Dining'],
      services: [
        {
          name: 'Lunch Reservation',
          cat: 0,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 90,
          price: 28,
          capacity: 40,
          color: '#DC2626',
          description: 'Two-course set lunch, per cover.',
        },
        {
          name: 'Dinner Reservation',
          cat: 0,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 120,
          price: 45,
          capacity: 40,
          color: '#EF4444',
          description: 'À la carte dinner, per cover.',
        },
        {
          name: "Chef's Tasting Menu",
          cat: 0,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 150,
          price: 85,
          capacity: 16,
          color: '#B91C1C',
          description: 'Seven-course tasting menu, per cover.',
          deposit: 30,
        },
      ],
      clients: [
        {
          name: 'Marco Bianchi',
          email: 'marco.b@example.com',
          phone: '+39 333 555 7101',
        },
        {
          name: 'Elena Rossi',
          email: 'elena.r@example.com',
          phone: '+39 333 555 7102',
        },
        {
          name: 'Tobias Weber',
          email: 'tobias.w@example.com',
          phone: '+49 151 7700702',
        },
        {
          name: 'Amélie Moreau',
          email: 'amelie.m@example.com',
          phone: '+33 6 12 34 7103',
        },
      ],
      appts: [
        {
          client: 0,
          svc: 1,
          staff: 1,
          day: -2,
          hour: 20,
          partySize: 4,
          status: AppointmentStatus.COMPLETED,
          rating: 5,
          comment: 'The cacio e pepe was unforgettable.',
        },
        {
          client: 1,
          svc: 0,
          staff: 0,
          day: -1,
          hour: 13,
          partySize: 2,
          status: AppointmentStatus.COMPLETED,
          rating: 5,
          comment: 'Lovely lunch by the window.',
        },
        {
          client: 2,
          svc: 2,
          staff: 2,
          day: 0,
          hour: 20,
          partySize: 6,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 3,
          svc: 1,
          staff: 1,
          day: 1,
          hour: 21,
          partySize: 3,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 0,
          svc: 0,
          staff: 0,
          day: 3,
          hour: 13,
          partySize: 2,
          status: AppointmentStatus.PENDING,
        },
      ],
      discount: { code: 'BENVENUTO', type: 'PERCENT', value: 10, usageLimit: 300 },
    },
    passwordHash,
  );

  // ── Tenant 8: Summit Events & Workshops (EVENTS) ──────────────────────────
  await seedTenant(
    {
      name: 'Summit Events & Workshops',
      slug: 'summit',
      vertical: Vertical.EVENTS,
      currency: 'USD',
      timezone: 'America/Los_Angeles',
      primaryColor: '#9333EA',
      tagline: 'Where ideas meet ambition.',
      about:
        'Summit produces conferences, workshops, and masterclasses for founders, creatives, and technologists. Buy tickets to our flagship events or book a seat in an intimate hands-on workshop.',
      phone: '+1 (415) 555-0800',
      address: '500 Howard Street, San Francisco, CA 94105',
      plan: 'BUSINESS',
      seats: 15,
      instagramUrl: 'https://instagram.com/summitevents',
      hours: { startMin: 8 * 60, endMin: 20 * 60, days: [0, 1, 2, 3, 4, 5, 6] },
      locations: [
        {
          name: 'Summit Hall SF',
          city: 'San Francisco',
          country: 'US',
          address: '500 Howard Street',
        },
      ],
      owner: { email: 'owner@summit.demo', name: 'Andre Foster' },
      resources: [
        {
          email: 'host.kim@summit.demo',
          name: 'Dr. Grace Kim',
          title: 'Keynote Host',
          color: '#9333EA',
        },
        {
          email: 'host.reed@summit.demo',
          name: 'Liam Reed',
          title: 'Workshop Facilitator',
          color: '#A855F7',
        },
      ],
      categories: ['Conferences', 'Workshops'],
      services: [
        {
          name: 'Founders Summit 2026 — Ticket',
          cat: 0,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 480,
          price: 299,
          capacity: 200,
          color: '#9333EA',
          description: 'Full-day conference pass with keynotes and networking.',
        },
        {
          name: 'AI Product Masterclass — Ticket',
          cat: 1,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 180,
          price: 149,
          capacity: 40,
          color: '#A855F7',
          description: 'Hands-on workshop, limited seats.',
          deposit: 50,
        },
        {
          name: 'Public Speaking Bootcamp — Ticket',
          cat: 1,
          bookingMode: BookingMode.CAPACITY,
          durationMin: 240,
          price: 99,
          capacity: 25,
          color: '#C084FC',
        },
      ],
      clients: [
        {
          name: 'Rachel Green',
          email: 'rachel.g@example.com',
          phone: '+1 415 555 8101',
        },
        {
          name: 'Kwame Mensah',
          email: 'kwame.m@example.com',
          phone: '+1 415 555 8102',
        },
        {
          name: 'Yuki Sato',
          email: 'yuki.s@example.com',
          phone: '+1 415 555 8103',
        },
        {
          name: 'Isabella Cruz',
          email: 'isabella.c@example.com',
          phone: '+1 415 555 8104',
        },
      ],
      appts: [
        {
          client: 0,
          svc: 1,
          staff: 1,
          day: -10,
          hour: 9,
          partySize: 2,
          status: AppointmentStatus.COMPLETED,
          rating: 5,
          comment: 'Practical, fast-paced, and worth every cent.',
        },
        {
          client: 1,
          svc: 2,
          staff: 1,
          day: -5,
          hour: 13,
          partySize: 1,
          status: AppointmentStatus.COMPLETED,
          rating: 4,
          comment: 'Gained real confidence on stage.',
        },
        {
          client: 2,
          svc: 0,
          staff: 0,
          day: 12,
          hour: 9,
          partySize: 3,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 3,
          svc: 0,
          staff: 0,
          day: 12,
          hour: 9,
          partySize: 2,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 0,
          svc: 1,
          staff: 1,
          day: 20,
          hour: 13,
          partySize: 1,
          status: AppointmentStatus.PENDING,
        },
      ],
      discount: { code: 'EARLYBIRD', type: 'PERCENT', value: 20, usageLimit: 150 },
    },
    passwordHash,
  );

  // ── Tenant 9: FixIt Home Services (SERVICES) ──────────────────────────────
  await seedTenant(
    {
      name: 'FixIt Home Services',
      slug: 'fixit',
      vertical: Vertical.SERVICES,
      currency: 'USD',
      timezone: 'America/Chicago',
      primaryColor: '#CA8A04',
      tagline: 'Reliable repairs, right at your door.',
      about:
        'FixIt Home Services dispatches licensed plumbers, electricians, and handymen across the metro area. Book a time window online and our technicians arrive fully equipped — upfront pricing, no surprises.',
      phone: '+1 (312) 555-0900',
      address: '210 W Kinzie Street, Chicago, IL 60654',
      plan: 'PRO',
      hours: { startMin: 7 * 60, endMin: 19 * 60, days: [1, 2, 3, 4, 5, 6] },
      locations: [
        {
          name: 'Chicago Dispatch',
          city: 'Chicago',
          country: 'US',
          address: '210 W Kinzie Street',
        },
      ],
      owner: { email: 'owner@fixit.demo', name: 'Derek Olsson' },
      resources: [
        {
          email: 'mike@fixit.demo',
          name: 'Mike Sullivan',
          title: 'Master Plumber',
          color: '#CA8A04',
          commissionRate: 40,
        },
        {
          email: 'rosa@fixit.demo',
          name: 'Rosa Delgado',
          title: 'Licensed Electrician',
          color: '#EAB308',
          commissionRate: 40,
        },
        {
          email: 'ben@fixit.demo',
          name: 'Ben Carter',
          title: 'Handyman',
          color: '#FACC15',
          commissionRate: 35,
        },
      ],
      categories: ['Plumbing', 'Electrical', 'General'],
      services: [
        {
          name: 'Plumbing Repair',
          cat: 0,
          durationMin: 90,
          price: 140,
          color: '#CA8A04',
          description: 'Leaks, fixtures, and pipe repairs.',
        },
        {
          name: 'Drain Cleaning',
          cat: 0,
          durationMin: 60,
          price: 95,
          color: '#A16207',
        },
        {
          name: 'Electrical Installation',
          cat: 1,
          durationMin: 120,
          price: 180,
          color: '#EAB308',
          deposit: 50,
        },
        {
          name: 'Emergency Callout',
          cat: 1,
          durationMin: 60,
          price: 220,
          color: '#FACC15',
        },
        {
          name: 'Handyman — Hourly',
          cat: 2,
          durationMin: 60,
          price: 75,
          color: '#FDE047',
        },
      ],
      clients: [
        {
          name: 'Karen Mitchell',
          email: 'karen.m@example.com',
          phone: '+1 312 555 9101',
        },
        {
          name: 'Paul Adeyemi',
          email: 'paul.a@example.com',
          phone: '+1 312 555 9102',
        },
        {
          name: 'Susan Park',
          email: 'susan.p@example.com',
          phone: '+1 312 555 9103',
        },
        {
          name: 'Hassan Ali',
          email: 'hassan.a@example.com',
          phone: '+1 312 555 9104',
        },
      ],
      products: [
        {
          name: 'Replacement Faucet Cartridge',
          sku: 'FIX-CART',
          price: 28,
          cost: 11,
          stockQty: 22,
        },
        {
          name: 'GFCI Outlet',
          sku: 'FIX-GFCI',
          price: 19,
          cost: 7,
          stockQty: 3,
          lowStockAt: 5,
        },
      ],
      appts: [
        {
          client: 0,
          svc: 0,
          staff: 0,
          day: -3,
          hour: 9,
          status: AppointmentStatus.COMPLETED,
          method: PaymentMethod.CASH,
          rating: 5,
          comment: 'Mike fixed the leak in 30 minutes. Lifesaver!',
        },
        {
          client: 1,
          svc: 2,
          staff: 1,
          day: -1,
          hour: 13,
          status: AppointmentStatus.COMPLETED,
          rating: 5,
          comment: 'Clean, professional electrical work.',
        },
        {
          client: 2,
          svc: 1,
          staff: 0,
          day: 0,
          hour: 11,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 3,
          svc: 4,
          staff: 2,
          day: 1,
          hour: 15,
          status: AppointmentStatus.CONFIRMED,
        },
        {
          client: 0,
          svc: 3,
          staff: 1,
          day: 2,
          hour: 8,
          status: AppointmentStatus.PENDING,
        },
      ],
      discount: { code: 'FIXIT20', type: 'FIXED', value: 20, usageLimit: 400 },
    },
    passwordHash,
  );

  console.log('✅  Seed complete. Demo logins (password: Passw0rd!):');
  console.log('    SALON      Lumière Beauty Lounge   owner@lumiere.demo   /lumiere');
  console.log('    SALON      Bloom & Glow Studio     owner@bloom.demo     /bloom');
  console.log('    CLINIC     MediCare Family Clinic  owner@medicare.demo  /medicare');
  console.log('    FITNESS    Pulse Fitness Studio    owner@pulse.demo     /pulse');
  console.log('    HOTEL      Azure Bay Hotel         owner@azure.demo     /azure');
  console.log('    RENTAL     GearUp Outdoor Rentals  owner@gearup.demo    /gearup');
  console.log('    RESTAURANT Tavola Trattoria        owner@tavola.demo    /tavola');
  console.log('    EVENTS     Summit Events           owner@summit.demo    /summit');
  console.log('    SERVICES   FixIt Home Services     owner@fixit.demo     /fixit');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
