import { randomBytes, createHmac } from 'crypto';
import { type PrismaClient } from '@prisma/client';

/**
 * Seed idempotente con 10 bares/antros reales de Cuernavaca, Morelos.
 * Datos compilados de fuentes públicas (visitmorelos.mx, reservandonos,
 * tripadvisor, guiaturisticacuernavaca.com). Las coordenadas son aproximaciones
 * razonables — el admin debería refinarlas desde el panel cuando onboardee
 * cada local de verdad.
 *
 * Cada venue se siembra sin owner (status ACTIVE, listo para ser asignado
 * a un dueño real desde el panel de admin → /admin/locales).
 *
 * Idempotency: upsert por slug. Re-runs no duplican; campos no editables
 * permanecen estables.
 */

const UNSPLASH_NIGHTCLUB_PHOTOS = [
  'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1545128485-c400e7702796?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1600&q=80&auto=format&fit=crop',
];

interface SeedVenue {
  slug: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  priceFromCents: number;
  categories: string[];
  musicTypes: string[];
  minAge: number;
  dressCode: string | null;
  capacity: number;
  geofenceRadiusM: number;
  /** True → rotamos checkin QR para que puedas probar scan inmediatamente. */
  withCheckinQr?: boolean;
}

const VENUES: SeedVenue[] = [
  {
    slug: 'kaova-club-cuernavaca',
    name: 'Kaova Club',
    address: 'Av. Morelos 241, Centro, Cuernavaca, Mor.',
    latitude: 18.9269,
    longitude: -99.2351,
    description:
      'Discoteca clásica con dos pistas, música desde los 70 hasta los 2000s. Ambiente de fin de semana, multitudes mixtas, pop, rock, electrónica de los buenos tiempos.',
    priceFromCents: 25000,
    categories: ['Discoteca', 'Pista', 'Multinivel'],
    musicTypes: ['Pop', 'Rock', 'Electrónica', 'Retro'],
    minAge: 18,
    dressCode: 'Casual elegante',
    capacity: 800,
    geofenceRadiusM: 120,
    withCheckinQr: true,
  },
  {
    slug: 'republica-cuernavaca',
    name: 'República',
    address: 'Av. Teopanzolco 503, Col. Vista Hermosa, Cuernavaca, Mor.',
    latitude: 18.9377,
    longitude: -99.2330,
    description:
      'Antro de la zona dorada de Cuernavaca. Reggaeton, hip-hop y electrónica. Pista grande, mesas VIP, ambiente intenso los fines de semana.',
    priceFromCents: 35000,
    categories: ['Antro', 'Pista', 'VIP'],
    musicTypes: ['Reggaeton', 'Hip-hop', 'Electrónica'],
    minAge: 18,
    dressCode: 'Smart casual — no shorts ni sandalias',
    capacity: 1200,
    geofenceRadiusM: 150,
    withCheckinQr: true,
  },
  {
    slug: 'soho-social-club',
    name: 'Soho Social Club',
    address: 'Forum Cuernavaca, Av. Diana 25, Cuernavaca, Mor.',
    latitude: 18.9072,
    longitude: -99.2371,
    description:
      'Social club con vibra contemporánea. Reggaeton, comercial, latina. Pista central, mesas alrededor, después de las 23h se llena.',
    priceFromCents: 30000,
    categories: ['Social Club', 'Pista'],
    musicTypes: ['Reggaeton', 'Comercial', 'Latina'],
    minAge: 18,
    dressCode: 'Casual',
    capacity: 600,
    geofenceRadiusM: 100,
    withCheckinQr: true,
  },
  {
    slug: 'baby-blue-cuernavaca',
    name: 'Baby Blue',
    address: 'Ricardo Flores Magón, Forum Cuernavaca, Cuernavaca, Mor.',
    latitude: 18.9068,
    longitude: -99.2367,
    description:
      'Bar sofisticado con interior moderno y energía relajada. Música en vivo: pop, rock y grupos norteños locales. Cocina de mariscos y cortes.',
    priceFromCents: 15000,
    categories: ['Bar', 'Restaurante', 'Música en vivo'],
    musicTypes: ['Pop', 'Rock', 'Norteño', 'Live music'],
    minAge: 18,
    dressCode: null,
    capacity: 250,
    geofenceRadiusM: 80,
    withCheckinQr: true,
  },
  {
    slug: 'la-bikina-cuernavaca',
    name: 'La Bikina',
    address: 'Centro Comercial Averanda, Villas del Lago, Cuernavaca, Mor.',
    latitude: 18.9067,
    longitude: -99.2342,
    description:
      'Homenaje a la cantina mexicana clásica de los 60. Mariachi en vivo, grupo pop de los 90s y 2000s. Cocina mexicana auténtica con toques internacionales.',
    priceFromCents: 0,
    categories: ['Cantina', 'Restaurante', 'Música en vivo'],
    musicTypes: ['Mariachi', 'Pop', 'Mexicana'],
    minAge: 18,
    dressCode: null,
    capacity: 200,
    geofenceRadiusM: 80,
    withCheckinQr: true,
  },
  {
    slug: 'paradiso-lounge-bar',
    name: 'Paradiso Lounge Bar',
    address: 'Av. Plan de Ayala 1100, Lomas del Mirador, Cuernavaca, Mor.',
    latitude: 18.9156,
    longitude: -99.2098,
    description:
      'Lounge bar con chimenea, atmósfera romántica y cócteles creativos. Ideal para una noche tranquila sin pista grande. Música ambiente, jazz, lounge.',
    priceFromCents: 10000,
    categories: ['Lounge', 'Bar', 'Cócteles'],
    musicTypes: ['Lounge', 'Jazz', 'Chill'],
    minAge: 21,
    dressCode: 'Smart casual',
    capacity: 120,
    geofenceRadiusM: 60,
  },
  {
    slug: 'zero-club-cuernavaca',
    name: 'Zero Club',
    address: 'Plaza Cuernavaca, Av. Vicente Guerrero 110, Cuernavaca, Mor.',
    latitude: 18.9112,
    longitude: -99.2298,
    description:
      'Club nocturno con vibra electrónica. House, techno melódico y comercial los fines de semana. Pista techo bajo, luces y ambiente intenso.',
    priceFromCents: 30000,
    categories: ['Club', 'Electrónica', 'Pista'],
    musicTypes: ['House', 'Techno', 'EDM'],
    minAge: 18,
    dressCode: 'No shorts',
    capacity: 500,
    geofenceRadiusM: 100,
    withCheckinQr: true,
  },
  {
    slug: 'lucrecia-cuernavaca',
    name: 'Lucrecia',
    address: 'Calle Río Mayo 1207, Vista Hermosa, Cuernavaca, Mor.',
    latitude: 18.9358,
    longitude: -99.2367,
    description:
      'Antro femenino-friendly con identidad propia. Reggaeton, perreo, hits comerciales. Pista pequeña pero llena toda la noche.',
    priceFromCents: 25000,
    categories: ['Antro', 'Pista'],
    musicTypes: ['Reggaeton', 'Perreo', 'Comercial'],
    minAge: 18,
    dressCode: 'Casual',
    capacity: 400,
    geofenceRadiusM: 90,
  },
  {
    slug: 'juarez-bar-cuernavaca',
    name: 'Juárez',
    address: 'Av. Benito Juárez 17, Centro, Cuernavaca, Mor.',
    latitude: 18.9219,
    longitude: -99.2348,
    description:
      'Bar de barrio en el centro histórico. Cerveza artesanal, mezcalería curada (18 marcas), patio interior y terraza con vista. Bandas locales algunos jueves.',
    priceFromCents: 8000,
    categories: ['Bar', 'Mezcalería', 'Terraza'],
    musicTypes: ['Indie', 'Alternativa', 'Latina'],
    minAge: 18,
    dressCode: null,
    capacity: 150,
    geofenceRadiusM: 70,
  },
  {
    slug: 'runa-cuernavaca',
    name: 'Runa',
    address: 'Av. Río Mayo 1100, Vista Hermosa, Cuernavaca, Mor.',
    latitude: 18.9362,
    longitude: -99.2371,
    description:
      'Rooftop con vista panorámica de Cuernavaca. Cócteles de autor, DJ house y deep al atardecer, ambiente fiesta privada después de las 23h.',
    priceFromCents: 20000,
    categories: ['Rooftop', 'Lounge', 'Cócteles'],
    musicTypes: ['Deep House', 'House', 'Indie dance'],
    minAge: 21,
    dressCode: 'Smart casual',
    capacity: 200,
    geofenceRadiusM: 80,
    withCheckinQr: true,
  },
];

function signVenueCheckin(venueId: string, secret: string): string {
  const hmac = createHmac('sha256', secret).update(`checkin:${venueId}`).digest('hex');
  return `np_checkin_${venueId}_${hmac}`;
}

export async function seedCuernavacaVenues(prisma: PrismaClient): Promise<void> {
  console.log('🏙️  Sembrando 10 bares reales de Cuernavaca...\n');

  let created = 0;
  let updated = 0;
  let qrsRotated = 0;
  const printable: string[] = [];

  for (let i = 0; i < VENUES.length; i++) {
    const v = VENUES[i];
    const photo = UNSPLASH_NIGHTCLUB_PHOTOS[i % UNSPLASH_NIGHTCLUB_PHOTOS.length];

    const existing = await prisma.venue.findUnique({ where: { slug: v.slug } });

    const data = {
      slug: v.slug,
      name: v.name,
      city: 'Cuernavaca',
      address: v.address,
      latitude: v.latitude,
      longitude: v.longitude,
      description: v.description,
      priceFromCents: v.priceFromCents > 0 ? v.priceFromCents : null,
      currency: v.priceFromCents > 0 ? 'mxn' : null,
      categories: v.categories,
      musicTypes: v.musicTypes,
      minAge: v.minAge,
      dressCode: v.dressCode,
      capacity: v.capacity,
      geofenceRadiusM: v.geofenceRadiusM,
      coverImageUrl: photo,
      status: 'ACTIVE' as const,
    };

    const venue = await prisma.venue.upsert({
      where: { slug: v.slug },
      update: data,
      create: data,
    });

    if (existing) updated++;
    else created++;

    if (v.withCheckinQr) {
      if (!venue.checkinQrSecret) {
        const secret = randomBytes(32).toString('hex');
        await prisma.venue.update({
          where: { id: venue.id },
          data: { checkinQrSecret: secret, checkinQrIssuedAt: new Date() },
        });
        const payload = signVenueCheckin(venue.id, secret);
        printable.push(`   ${v.name.padEnd(28)} → ${payload}`);
        qrsRotated++;
      }
    }
  }

  console.log(
    `   ${created} venues creados · ${updated} actualizados · ${qrsRotated} QR check-in rotados\n`,
  );

  if (printable.length > 0) {
    console.log('🎟️  QR check-in payloads (para test manual):');
    for (const line of printable) console.log(line);
    console.log();
  }
}
