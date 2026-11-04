import type { ConfigService } from '@nestjs/config';
import { InMemoryFeaturedRepository } from '../modules/catalog/adapters/in-memory-featured.repository';
import { PrismaFeaturedRepository } from '../modules/catalog/adapters/prisma-featured.repository';
import { createFeaturedRepository } from '../modules/catalog/featured-repository.factory';
import { InMemoryEnquiryRepository } from '../modules/enquiries/adapters/in-memory-enquiry.repository';
import { PrismaEnquiryRepository } from '../modules/enquiries/adapters/prisma-enquiry.repository';
import { createEnquiryRepository } from '../modules/enquiries/enquiry-repository.factory';
import type { PrismaService } from '../prisma/prisma.service';
import type { Env } from './env.schema';

describe('storage factories (STORAGE)', () => {
  const configWith = (storage: Env['STORAGE']) =>
    ({ get: () => storage }) as unknown as ConfigService<Env, true>;
  const prisma = {} as PrismaService;

  it('uses in-memory adapters for STORAGE=memory', () => {
    expect(createFeaturedRepository(configWith('memory'), prisma)).toBeInstanceOf(InMemoryFeaturedRepository);
    expect(createEnquiryRepository(configWith('memory'), prisma)).toBeInstanceOf(InMemoryEnquiryRepository);
  });

  it('uses Prisma adapters for STORAGE=postgres', () => {
    expect(createFeaturedRepository(configWith('postgres'), prisma)).toBeInstanceOf(PrismaFeaturedRepository);
    expect(createEnquiryRepository(configWith('postgres'), prisma)).toBeInstanceOf(PrismaEnquiryRepository);
  });
});
