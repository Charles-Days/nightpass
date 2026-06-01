-- AlterTable
ALTER TABLE "promoters" ALTER COLUMN "platformFeePct" DROP NOT NULL,
ALTER COLUMN "platformFeePct" DROP DEFAULT;

-- AlterTable
ALTER TABLE "venues" ALTER COLUMN "platformFeePct" DROP NOT NULL,
ALTER COLUMN "platformFeePct" DROP DEFAULT;

-- Preserva el comportamiento actual: quienes estaban en 0 (= "usa global" bajo
-- la semántica vieja) pasan a NULL para seguir cobrando la comisión global.
-- A partir de ahora 0 significa cero real.
UPDATE "promoters" SET "platformFeePct" = NULL WHERE "platformFeePct" = 0;
UPDATE "venues" SET "platformFeePct" = NULL WHERE "platformFeePct" = 0;
