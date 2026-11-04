-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FeaturedScope" AS ENUM ('HOME', 'CATEGORY');

-- CreateTable
CREATE TABLE "featured_products" (
    "id" TEXT NOT NULL,
    "scope" "FeaturedScope" NOT NULL,
    "category_slug" TEXT,
    "product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "featured_products_scope_category_slug_position_idx" ON "featured_products"("scope", "category_slug", "position");

-- CreateIndex
CREATE UNIQUE INDEX "featured_products_scope_category_slug_product_id_key" ON "featured_products"("scope", "category_slug", "product_id");

