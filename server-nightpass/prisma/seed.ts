import { PrismaClient } from '@prisma/client';
import { seedAdmin } from './seeds/admin';
import { seedVenueOwner } from './seeds/venue-owner';
import { seedVenueStaff } from './seeds/venue-staff';
import { seedCustomer } from './seeds/customer';
import { seedLoyalty } from './seeds/loyalty';
import { seedCuernavacaVenues } from './seeds/cuernavaca-venues';
import { seedPromoterApplication } from './seeds/promoter-application';
import { seedPromoterOwner } from './seeds/promoter-owner';

async function main() {
  const prisma = new PrismaClient();
  try {
    // eslint-disable-next-line no-console
    console.log('🌱 Sembrando datos iniciales...\n');

    await seedAdmin(prisma);
    await seedVenueOwner(prisma);
    await seedVenueStaff(prisma);
    await seedCustomer(prisma);
    await seedCuernavacaVenues(prisma);
    await seedPromoterOwner(prisma);
    await seedPromoterApplication(prisma);
    await seedLoyalty(prisma);

    // eslint-disable-next-line no-console
    console.log('✅ Seed completado.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Seed falló:', err instanceof Error ? err.message : err);
  process.exit(1);
});
