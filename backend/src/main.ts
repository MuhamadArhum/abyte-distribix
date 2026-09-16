import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

try {
  // Dev convenience: load backend/.env into process.env (Node 20.6+ built-in).
  // No-op if the file doesn't exist (e.g. inside the packaged Electron app,
  // which instead passes JWT_SECRET directly via the spawn() env).
  (process as any).loadEnvFile?.();
} catch {
  /* .env not present — fine, env vars may already be set by the host process */
}

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is not set. Refusing to start with a fallback secret. ' +
      'Set JWT_SECRET in backend/.env (dev) or pass it as an environment variable to the backend process.',
    );
  }

  const app = await NestFactory.create(AppModule);
  // API-only backend (no HTML served here), so the default CSP is disabled
  // to avoid interfering with plain JSON responses — the other headers
  // (X-Content-Type-Options, X-Frame-Options, HSTS, etc.) still apply.
  app.use(helmet({ contentSecurityPolicy: false }));

  // The packaged Electron app loads the UI from a `file://` page, which
  // Chromium sends as the literal Origin "null" on cross-origin requests —
  // not a wildcard, and not something to special-case away. `undefined`
  // covers non-browser callers (curl, health checks) that send no Origin
  // header at all. Extra origins (e.g. a future hosted deployment) can be
  // added via CORS_ALLOWED_ORIGINS without another code change.
  const extraOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  const allowedOrigins = new Set(['null', 'http://localhost:5176', ...extraOrigins]);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) callback(null, true);
      else callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.setGlobalPrefix('api');
  await app.listen(3005);
  console.log('AbyteDistribix backend running on http://localhost:3005');
}
bootstrap();
