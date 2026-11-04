import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import type { PrismaService } from '../../prisma/prisma.service';
import { InMemoryFeaturedRepository } from './adapters/in-memory-featured.repository';
import { PrismaFeaturedRepository } from './adapters/prisma-featured.repository';
import { CATEGORY_PICKS, HOME_PICKS } from './featured-picks';
import type { FeaturedRepository } from './ports/featured.repository.port';

/** Picks where the featured products are stored, from `STORAGE`. */
export function createFeaturedRepository(
  config: ConfigService<Env, true>,
  prisma: PrismaService,
): FeaturedRepository {
  const storage = config.get('STORAGE', { infer: true });
  switch (storage) {
    case 'memory':
      return new InMemoryFeaturedRepository(HOME_PICKS, CATEGORY_PICKS);
    case 'postgres':
      return new PrismaFeaturedRepository(prisma);
    default: {
      const unsupported: never = storage;
      throw new Error(`Unsupported STORAGE: ${String(unsupported)}`);
    }
  }
}
