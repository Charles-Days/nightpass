import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Interpreta TRUST_PROXY a lo que espera Fastify (ver env.schema.ts).
 * Default 'true' para no romper dev/local; en prod definir número o lista de
 * IPs confiables — si no, X-Forwarded-For es falsificable y evade el rate-limit.
 */
function parseTrustProxy(raw?: string): boolean | number | string[] {
  if (raw === undefined || raw.trim() === '') return true;
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
      // Anti-DoS: corta payloads gigantes (OOM), requests colgadas (agotan FDs)
      // y sockets zombie. 12MB cubre subida local de imágenes (modo fallback);
      // en prod las imágenes van directo a R2 vía presigned y no tocan la API.
      bodyLimit: 12 * 1024 * 1024,
      requestTimeout: 30_000,
      keepAliveTimeout: 65_000,
    }),
    // rawBody: true → Nest expone req.rawBody (Buffer) en cualquier controlador
    // que use @RawBodyRequest. Necesario para verificar firmas de Stripe webhooks.
    { rawBody: true },
  );

  // Permitir subida de archivos binarios (imágenes) sin procesar para el modo local
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addContentTypeParser(
    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    (req, payload, done) => {
      done(null, payload);
    },
  );

  await app.register(helmet);

  const config = app.get(ConfigService);
  const corsOriginsRaw = config.get<string>('CORS_ORIGINS');
  const corsOrigins = corsOriginsRaw
    ? corsOriginsRaw
        .split(',')
        .map((o: string) => o.trim())
        .filter(Boolean)
    : [];
  const isProd = process.env.NODE_ENV === 'production';
  if (corsOrigins.length === 0 && isProd) {
    throw new Error('CORS_ORIGINS must be set in production');
  }
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });

  // Servir archivos estáticos (uploads)
  const uploadsPath = config.get<string>('LOCAL_UPLOADS_PATH') || './uploads';
  const absoluteUploadsPath = join(process.cwd(), uploadsPath);
  
  await app.register(fastifyStatic, {
    root: absoluteUploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
    allowedPath: (pathName) => {
      // Opcional: registrar logs para depuración si fuera necesario
      return true;
    },
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  });

  await app.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 6 },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Cierre ordenado: drena requests en vuelo y cierra Prisma/Redis en deploy/restart.
  app.enableShutdownHooks();

  app.setGlobalPrefix('api/v1');

  const port = config.get<number>('PORT') ?? 7101;

  await app.listen(port, '0.0.0.0');
  Logger.log(`NightPass API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

// Una promesa rechazada o excepción sin capturar no debe matar el proceso en
// silencio: log con contexto. uncaughtException sí termina (estado corrupto),
// pero ordenadamente y con rastro.
process.on('unhandledRejection', (reason) => {
  Logger.error(
    `unhandledRejection: ${reason instanceof Error ? reason.stack : String(reason)}`,
    'Process',
  );
});
process.on('uncaughtException', (err) => {
  Logger.error(`uncaughtException: ${err.stack ?? err.message}`, 'Process');
  process.exit(1);
});

bootstrap();
