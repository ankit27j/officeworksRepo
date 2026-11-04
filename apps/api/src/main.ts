import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import type { Env } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  configureApp(app, config);

  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);
  Logger.log(
    `API listening on http://localhost:${port} (product source: ${config.get('PRODUCT_SOURCE', { infer: true })}, ` +
      `storage: ${config.get('STORAGE', { infer: true })}, mailer: ${config.get('MAILER', { infer: true })})`,
    'Bootstrap',
  );
}

void bootstrap();
