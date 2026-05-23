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

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
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

  await app.register(fastifyMultipart);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = config.get<number>('PORT') ?? 7101;

  await app.listen(port, '0.0.0.0');
  Logger.log(`NightPass API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

bootstrap();
