import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { FeaturedRepository } from '../../src/modules/catalog/ports/featured.repository.port';
import { EnquiryRepository } from '../../src/modules/enquiries/ports/enquiry.repository.port';
import { Mailer } from '../../src/modules/enquiries/ports/mailer.port';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FakeMailer } from '../fakes/fake-mailer';
import { InMemoryEnquiryRepository } from '../../src/modules/enquiries/adapters/in-memory-enquiry.repository';
import { InMemoryFeaturedRepository } from '../../src/modules/catalog/adapters/in-memory-featured.repository';

export interface TestApp {
  app: NestExpressApplication;
  featured: InMemoryFeaturedRepository;
  enquiries: InMemoryEnquiryRepository;
  mailer: FakeMailer;
  db: { healthy: boolean };
}

/**
 * The real AppModule and HTTP pipeline (prefix, validation, error filter, guards) with the fixture
 * product source. Only the DB and email adapters are replaced, so no Postgres, SMTP or network is needed.
 */
export async function createTestApp(options: { rateLimit?: boolean } = {}): Promise<TestApp> {
  const featured = new InMemoryFeaturedRepository(['3', '5', '11', '18', '999'], { electronics: ['12'] });
  const enquiries = new InMemoryEnquiryRepository();
  const mailer = new FakeMailer();
  const db = { healthy: true };

  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(FeaturedRepository)
    .useValue(featured)
    .overrideProvider(EnquiryRepository)
    .useValue(enquiries)
    .overrideProvider(Mailer)
    .useValue(mailer)
    .overrideProvider(PrismaService)
    .useValue({ isHealthy: async () => db.healthy, $disconnect: async () => undefined });

  // Most suites send many requests from one IP; only the rate-limit suite keeps the real guard.
  if (!options.rateLimit) {
    builder = builder.overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true });
  }

  const app = (await builder.compile()).createNestApplication<NestExpressApplication>();
  configureApp(app, app.get(ConfigService));
  await app.init();
  return { app, featured, enquiries, mailer, db };
}
