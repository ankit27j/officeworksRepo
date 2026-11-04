import type { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { API_PREFIX } from '@catalogue/contracts';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import type { Env } from './config/env.schema';

/** HTTP setup shared by main.ts and the integration tests, so tests run against the real pipeline. */
export function configureApp(app: NestExpressApplication, config: ConfigService<Env, true>): void {
  const proxyHops = config.get('TRUST_PROXY_HOPS', { infer: true });
  if (proxyHops > 0) app.set('trust proxy', proxyHops);
  app.use(helmet());
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }), methods: ['GET', 'POST'] });
  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''), { exclude: ['health'] });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}
