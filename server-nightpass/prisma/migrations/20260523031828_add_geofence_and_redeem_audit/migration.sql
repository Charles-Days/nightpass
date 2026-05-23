-- AlterTable
ALTER TABLE "passes" ADD COLUMN     "redeemedAccuracyM" INTEGER,
ADD COLUMN     "redeemedDistanceM" INTEGER;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "geofenceRadiusM" INTEGER NOT NULL DEFAULT 100;
