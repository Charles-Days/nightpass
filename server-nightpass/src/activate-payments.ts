import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- FORZANDO ACTIVACIÓN DE PAGOS EN TODOS LOS LOCALES ---');
  
  const venues = await prisma.venue.findMany();
  console.log(`Encontrados ${venues.length} locales.`);

  for (const venue of venues) {
    // Buscar si ya tiene StripeAccount
    const existing = await prisma.stripeAccount.findUnique({
      where: { venueId: venue.id }
    });

    if (!existing) {
      const dummyId = `acct_dummy_venue_${venue.slug.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 32);
      await prisma.stripeAccount.create({
        data: {
          venueId: venue.id,
          stripeAccountId: dummyId,
          chargesEnabled: true,
          detailsSubmitted: true
        }
      });
      console.log(`✅ Pagos activados para: ${venue.name} (${venue.id}) -> Stripe ID: ${dummyId}`);
    } else if (!existing.chargesEnabled || !existing.detailsSubmitted) {
      await prisma.stripeAccount.update({
        where: { id: existing.id },
        data: {
          chargesEnabled: true,
          detailsSubmitted: true
        }
      });
      console.log(`⚡ Pagos forzados a activo para: ${venue.name} (${venue.id})`);
    } else {
      console.log(`ℹ️ ${venue.name} ya tenía los pagos habilitados.`);
    }
  }

  // Hacer lo mismo con Promotores
  const promoters = await prisma.promoter.findMany();
  for (const promoter of promoters) {
    const existing = await prisma.stripeAccount.findUnique({
      where: { promoterId: promoter.id }
    });

    if (!existing) {
      const dummyId = `acct_dummy_prom_${promoter.slug.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 32);
      await prisma.stripeAccount.create({
        data: {
          promoterId: promoter.id,
          stripeAccountId: dummyId,
          chargesEnabled: true,
          detailsSubmitted: true
        }
      });
      console.log(`✅ Pagos activados para el promotor: ${promoter.name}`);
    }
  }

  console.log('--- PROCESO COMPLETADO ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
