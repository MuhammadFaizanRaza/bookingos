// ============================================================================
//  Vertical term-packs
//  One BookingOS codebase serves many industries. The data model and booking
//  engine are shared; only the *labels* change per tenant. A tenant picks a
//  `vertical` at signup; the UI then renders industry-appropriate terminology
//  for the same underlying concepts (resource / offering / customer / booking).
//
//  These are English base strings. For non-English locales the UI still falls
//  back to the next-intl `dashboard.nav` translations where a term-pack value
//  is not provided. See useTerms() in src/hooks/use-terms.ts.
// ============================================================================

import type { Vertical } from './types';

/** The canonical bookable concepts, relabelled per industry. */
export interface VerticalTerms {
  /** The bookable provider / unit (person, room, table, piece of equipment). */
  resource: string;
  resourcePlural: string;
  /** The bookable offering (service, treatment, class, room type, event). */
  offering: string;
  offeringPlural: string;
  /** Grouping of offerings. */
  category: string;
  categoryPlural: string;
  /** The end customer. */
  customer: string;
  customerPlural: string;
  /** A single reservation/appointment. */
  booking: string;
  bookingPlural: string;
  /** Call-to-action verb: Book / Reserve / Schedule / Register. */
  bookVerb: string;
}

export interface VerticalDef {
  id: Vertical;
  /** Human label shown in the industry picker. */
  label: string;
  /** One-line description for the picker. */
  description: string;
  /** lucide-react icon name (resolved by the consumer). */
  icon: string;
  terms: VerticalTerms;
}

const GENERAL_TERMS: VerticalTerms = {
  resource: 'Resource',
  resourcePlural: 'Resources',
  offering: 'Service',
  offeringPlural: 'Services',
  category: 'Category',
  categoryPlural: 'Categories',
  customer: 'Customer',
  customerPlural: 'Customers',
  booking: 'Booking',
  bookingPlural: 'Bookings',
  bookVerb: 'Book',
};

export const VERTICALS: Record<Vertical, VerticalDef> = {
  SALON: {
    id: 'SALON',
    label: 'Salon & Spa',
    description: 'Hair, beauty, nails, barber, spa',
    icon: 'Scissors',
    terms: {
      resource: 'Staff',
      resourcePlural: 'Staff',
      offering: 'Service',
      offeringPlural: 'Services',
      category: 'Category',
      categoryPlural: 'Categories',
      customer: 'Client',
      customerPlural: 'Clients',
      booking: 'Appointment',
      bookingPlural: 'Appointments',
      bookVerb: 'Book',
    },
  },
  CLINIC: {
    id: 'CLINIC',
    label: 'Clinic & Health',
    description: 'Medical, dental, therapy, wellness',
    icon: 'Stethoscope',
    terms: {
      resource: 'Practitioner',
      resourcePlural: 'Practitioners',
      offering: 'Treatment',
      offeringPlural: 'Treatments',
      category: 'Specialty',
      categoryPlural: 'Specialties',
      customer: 'Patient',
      customerPlural: 'Patients',
      booking: 'Appointment',
      bookingPlural: 'Appointments',
      bookVerb: 'Book',
    },
  },
  FITNESS: {
    id: 'FITNESS',
    label: 'Fitness & Studio',
    description: 'Gym, PT, yoga, pilates, classes',
    icon: 'Dumbbell',
    terms: {
      resource: 'Trainer',
      resourcePlural: 'Trainers',
      offering: 'Class',
      offeringPlural: 'Classes',
      category: 'Program',
      categoryPlural: 'Programs',
      customer: 'Member',
      customerPlural: 'Members',
      booking: 'Session',
      bookingPlural: 'Sessions',
      bookVerb: 'Book',
    },
  },
  HOTEL: {
    id: 'HOTEL',
    label: 'Hotel & Stays',
    description: 'Rooms & accommodation (per night)',
    icon: 'BedDouble',
    terms: {
      resource: 'Room',
      resourcePlural: 'Rooms',
      offering: 'Room Type',
      offeringPlural: 'Room Types',
      category: 'Category',
      categoryPlural: 'Categories',
      customer: 'Guest',
      customerPlural: 'Guests',
      booking: 'Reservation',
      bookingPlural: 'Reservations',
      bookVerb: 'Reserve',
    },
  },
  RENTAL: {
    id: 'RENTAL',
    label: 'Rentals',
    description: 'Equipment, vehicles, spaces (per day)',
    icon: 'Package',
    terms: {
      resource: 'Unit',
      resourcePlural: 'Units',
      offering: 'Rental Item',
      offeringPlural: 'Rental Items',
      category: 'Category',
      categoryPlural: 'Categories',
      customer: 'Customer',
      customerPlural: 'Customers',
      booking: 'Rental',
      bookingPlural: 'Rentals',
      bookVerb: 'Reserve',
    },
  },
  RESTAURANT: {
    id: 'RESTAURANT',
    label: 'Restaurant',
    description: 'Table reservations (party size)',
    icon: 'UtensilsCrossed',
    terms: {
      resource: 'Table',
      resourcePlural: 'Tables',
      offering: 'Experience',
      offeringPlural: 'Experiences',
      category: 'Section',
      categoryPlural: 'Sections',
      customer: 'Guest',
      customerPlural: 'Guests',
      booking: 'Reservation',
      bookingPlural: 'Reservations',
      bookVerb: 'Reserve',
    },
  },
  EVENTS: {
    id: 'EVENTS',
    label: 'Events & Tickets',
    description: 'Workshops, classes, ticketed events',
    icon: 'Ticket',
    terms: {
      resource: 'Host',
      resourcePlural: 'Hosts',
      offering: 'Event',
      offeringPlural: 'Events',
      category: 'Track',
      categoryPlural: 'Tracks',
      customer: 'Attendee',
      customerPlural: 'Attendees',
      booking: 'Ticket',
      bookingPlural: 'Tickets',
      bookVerb: 'Register',
    },
  },
  SERVICES: {
    id: 'SERVICES',
    label: 'Home & Field Services',
    description: 'Plumber, electrician, cleaning, repair',
    icon: 'Wrench',
    terms: {
      resource: 'Technician',
      resourcePlural: 'Technicians',
      offering: 'Service',
      offeringPlural: 'Services',
      category: 'Service Type',
      categoryPlural: 'Service Types',
      customer: 'Customer',
      customerPlural: 'Customers',
      booking: 'Job',
      bookingPlural: 'Jobs',
      bookVerb: 'Book',
    },
  },
  GENERAL: {
    id: 'GENERAL',
    label: 'General / Other',
    description: 'Neutral terminology for any business',
    icon: 'CalendarCheck',
    terms: GENERAL_TERMS,
  },
};

export const VERTICAL_LIST: VerticalDef[] = Object.values(VERTICALS);

export const DEFAULT_VERTICAL: Vertical = 'SALON';

/** Resolve the term-pack for a vertical, falling back to GENERAL. */
export function getTerms(vertical?: Vertical | null): VerticalTerms {
  return (vertical && VERTICALS[vertical]?.terms) || GENERAL_TERMS;
}

/** Resolve the full definition for a vertical, falling back to GENERAL. */
export function getVertical(vertical?: Vertical | null): VerticalDef {
  return (vertical && VERTICALS[vertical]) || VERTICALS.GENERAL;
}
