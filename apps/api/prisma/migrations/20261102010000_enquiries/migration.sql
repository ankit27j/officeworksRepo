-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('RECEIVED', 'EMAILED', 'EMAIL_FAILED');

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_title" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(30),
    "message" VARCHAR(2000) NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'RECEIVED',
    "email_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enquiries_status_created_at_idx" ON "enquiries"("status", "created_at");

