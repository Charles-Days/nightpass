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
  // Los seeders crean usuarios con contraseñas conocidas (admin@nightpass.local
  // / AdminTest123, etc.) y FUERZAN role=ADMIN. Correr esto contra producción
  // crearía un admin con credenciales públicas → takeover total. Abortamos salvo
  // override explícito.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    // eslint-disable-next-line no-console
    console.error(
      '⛔ Seed bloqueado en producción. Usa ALLOW_PROD_SEED=true solo si sabes lo que haces.',
    );
    process.exit(1);
  }

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
