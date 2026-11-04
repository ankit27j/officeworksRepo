import './utils/use-memory-storage';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { CategoryPageSchema, EnquiryCreatedSchema, FeaturedProductsSchema } from '@catalogue/contracts';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { InMemoryEnquiryRepository } from '../src/modules/enquiries/adapters/in-memory-enquiry.repository';
import { EnquiryRepository } from '../src/modules/enquiries/ports/enquiry.repository.port';
import { Mailer } from '../src/modules/enquiries/ports/mailer.port';
import { CATEGORY_PICKS, HOME_PICKS } from '../src/modules/catalog/featured-picks';
import { FakeMailer } from './fakes/fake-mailer';

/** STORAGE=memory with the real storage adapters (only email is faked): the API runs with no database. */
describe('STORAGE=memory (integration)', () => {
  let app: NestExpressApplication;
  const mailer = new FakeMailer();
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Mailer)
      .useValue(mailer)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports healthy with the database disabled', async () => {
    const res = await api().get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', storage: 'memory', db: 'disabled', productSource: 'fixture' });
  });

  it('serves the chosen picks from featured-picks.ts', async () => {
    const home = FeaturedProductsSchema.parse((await api().get('/api/v1/catalog/featured').expect(200)).body);
    expect(home.map((p) => p.id)).toEqual(HOME_PICKS);

    const page = CategoryPageSchema.parse(
      (await api().get('/api/v1/categories/electronics').expect(200)).body,
    );
    expect(page.topRated.map((p) => p.id)).toEqual(CATEGORY_PICKS.electronics);
  });

  it('keeps the enquiry in memory and emails the sales inbox', async () => {
    const res = await api()
      .post('/api/v1/enquiries')
      .send({ productId: '3', name: 'Jane', email: 'jane@example.com', message: 'Hi' })
      .expect(201);

    const { id } = EnquiryCreatedSchema.parse(res.body);
    const repository = app.get(EnquiryRepository);
    expect(repository).toBeInstanceOf(InMemoryEnquiryRepository);
    expect((repository as InMemoryEnquiryRepository).records).toEqual([
      expect.objectContaining({ id, status: 'EMAILED' }),
    ]);
    expect(mailer.sent).toHaveLength(1);
  });
});
