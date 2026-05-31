-- DropIndex
DROP INDEX "passes_orderId_key";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;
