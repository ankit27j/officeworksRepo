import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import type { PrismaService } from '../../prisma/prisma.service';
import { InMemoryEnquiryRepository } from './adapters/in-memory-enquiry.repository';
import { PrismaEnquiryRepository } from './adapters/prisma-enquiry.repository';
import type { EnquiryRepository } from './ports/enquiry.repository.port';

/** Picks where enquiries are stored, from `STORAGE`. */
export function createEnquiryRepository(
  config: ConfigService<Env, true>,
  prisma: PrismaService,
): EnquiryRepository {
  const storage = config.get('STORAGE', { infer: true });
  switch (storage) {
    case 'memory':
      return new InMemoryEnquiryRepository();
    case 'postgres':
      return new PrismaEnquiryRepository(prisma);
    default: {
      const unsupported: never = storage;
      throw new Error(`Unsupported STORAGE: ${String(unsupported)}`);
    }
  }
}
