-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "about" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "whatsapp" TEXT;
