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

/**
 * Fails fast if the JWT signing secrets are absent, too short, or still the
 * shipped `change-me-*` placeholders. Skipped only when explicitly allowed for
 * local throwaway runs (ALLOW_WEAK_SECRETS=true).
 */
function assertStrongSecrets(config: ConfigService): void {
  if (config.get<string>('ALLOW_WEAK_SECRETS') === 'true') return;

  const weak = (name: string): string | null => {
    const value = config.get<string>(name) ?? '';
    if (!value) return `${name} is not set`;
    if (/change-me|placeholder|secret-here|^changeme/i.test(value)) {
      return `${name} is still a default placeholder`;
    }
    if (value.length < 32) {
      return `${name} is too short (need ≥ 32 chars; generate with \`openssl rand -hex 32\`)`;
    }
    return null;
  };

  const problems = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']
    .map(weak)
    .filter((p): p is string => p !== null);

  if (problems.length > 0) {
    throw new Error(
      `Insecure JWT configuration — refusing to start:\n  - ${problems.join(
        '\n  - ',
      )}\nSet strong secrets in .env (or ALLOW_WEAK_SECRETS=true for local throwaway runs only).`,
    );
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Capture the raw body so the Stripe webhook can verify signatures.
    rawBody: true,
    bodyParser: false,
  });
  const config = app.get(ConfigService);

  // --- Secret hardening ---------------------------------------------------
  // Refuse to boot with missing, default, or weak JWT secrets. The .env.example
  // ships `change-me-*` placeholders; deploying with those would let anyone who
  // has seen the repo forge a valid token for any user/role.
  assertStrongSecrets(config);

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
    .setTitle('BookingOS API')
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
  console.log(`🚀 BookingOS API on http://localhost:${port} (docs: /docs)`);
}

void bootstrap();
