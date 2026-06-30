-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('TIME_SLOT', 'DATE_RANGE', 'CAPACITY');
CREATE TYPE "ResourceType" AS ENUM ('HUMAN', 'ROOM', 'TABLE', 'EQUIPMENT', 'UNIT');

-- AlterTable: Service gains booking-mode + inventory/capacity
ALTER TABLE "Service" ADD COLUMN "bookingMode" "BookingMode" NOT NULL DEFAULT 'TIME_SLOT';
ALTER TABLE "Service" ADD COLUMN "capacity" INTEGER;
ALTER TABLE "Service" ADD COLUMN "inventory" INTEGER;

-- AlterTable: StaffProfile becomes a generic resource
ALTER TABLE "StaffProfile" ADD COLUMN "resourceType" "ResourceType" NOT NULL DEFAULT 'HUMAN';
ALTER TABLE "StaffProfile" ADD COLUMN "capacity" INTEGER;

-- AlterTable: Appointment + AppointmentItem gain party-size / quantity
ALTER TABLE "Appointment" ADD COLUMN "partySize" INTEGER;
ALTER TABLE "AppointmentItem" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
