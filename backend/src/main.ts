import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
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
  app.enableCors({ origin: '*' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.setGlobalPrefix('api');
  await app.listen(3005);
  console.log('AbyteDistribix backend running on http://localhost:3005');
}
bootstrap();
