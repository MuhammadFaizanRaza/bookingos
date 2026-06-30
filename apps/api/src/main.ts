import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import helmet from 'helmet';
import type { RequestWithTenant } from './common/types';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Capture the raw body so the Stripe webhook can verify signatures.
    rawBody: true,
    bodyParser: false,
  });
  const config = app.get(ConfigService);

  // --- Body parsing -------------------------------------------------------
  // Stripe webhook needs the untouched raw buffer; everything else is JSON.
  app.use(
    '/api/v1/webhooks/stripe',
    express.raw({ type: '*/*', limit: '2mb' }),
    (req: RequestWithTenant, _res: express.Response, next: express.NextFunction) => {
      if (Buffer.isBuffer(req.body)) {
        req.rawBody = req.body;
      }
      next();
    },
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // --- Security & CORS ----------------------------------------------------
  app.use(helmet());
  app.enableCors({
    origin: [
      config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug'],
  });

  // --- Global pipes -------------------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.setGlobalPrefix('api/v1');

  // --- Swagger ------------------------------------------------------------
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SalonOS API')
    .setDescription(
      'Multi-tenant salon management API. Send the x-tenant-slug header (or use a tenant subdomain) for tenant-scoped routes.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'x-tenant-slug',
      in: 'header',
      required: false,
      schema: { type: 'string', example: 'lumiere' },
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(config.get<string>('API_PORT') ?? 4000);
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`🚀 SalonOS API on http://localhost:${port} (docs: /docs)`);
}

void bootstrap();
