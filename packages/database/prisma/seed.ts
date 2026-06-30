/**
 * BookingOS seed — creates a fully-populated demo salon so the product is
 * instantly demoable after `pnpm db:seed`.
 *
 * Demo login (owner):  owner@lumiere.demo  /  Passw0rd!
 * Demo booking site:   http://lumiere.localhost:3000  (or ?tenant=lumiere)
 */
import {
  PrismaClient,
  Role,
  AppointmentStatus,
  BookingSource,
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
  SaleItemType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_TIMEZONE = 'Asia/Karachi'; // Change to match your salon's timezone

const DAY = 24 * 60 * 60 * 1000;

/**
 * Returns a Date for `daysFromNow` days at `hour:min` in SEED_TIMEZONE.
 * Slots/appointments created by seed will appear at the correct local time
 * regardless of which timezone the Node process runs in.
 */
function at(daysFromNow: number, hour: number, min = 0): Date {
  const now = new Date();
  // Compute today's date string in the target timezone (YYYY-MM-DD)
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEED_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [y, m, d] = dateStr.split('-').map(Number);
  // Midnight in SEED_TIMEZONE expressed as UTC
  const noonUTC = Date.UTC(y, m - 1, d, 12);
  const offset = (() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: SEED_TIMEZONE,
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

async function main() {
  console.log('🌱  Seeding BookingOS demo data…');

  // Clean slate (dev only)
  await prisma.$transaction([
    prisma.appointmentItem.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.review.deleteMany(),
    prisma.workingHours.deleteMany(),
    prisma.service.deleteMany(),
    prisma.serviceCategory.deleteMany(),
    prisma.product.deleteMany(),
    prisma.client.deleteMany(),
    prisma.staffProfile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.location.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Lumière Beauty Lounge',
      slug: 'lumiere',
      status: 'ACTIVE',
      plan: 'PRO',
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

  const passwordHash = await bcrypt.hash('Passw0rd!', 10);

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

  // ── Tenant 2: Bloom & Glow Studio ─────────────────────────────────────────
  const bloom = await prisma.tenant.create({
    data: {
      name: 'Bloom & Glow Studio',
      slug: 'bloom',
      status: 'ACTIVE',
      plan: 'STARTER',
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

  console.log('✅  Seed complete.');
  console.log('    Tenant 1: Lumière Beauty Lounge (slug: lumiere)');
  console.log('             owner@lumiere.demo / Passw0rd!');
  console.log('    Tenant 2: Bloom & Glow Studio (slug: bloom)');
  console.log('             owner@bloom.demo / Passw0rd!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
