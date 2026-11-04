import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import type { Env } from '../config/env.schema';

/**
 * Connects lazily on first query, so the API boots even if the DB is briefly unavailable.
 * With STORAGE=memory nothing queries it, so it never connects.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    const url = config.get('DATABASE_URL', { infer: true });
    super(url ? { datasourceUrl: url } : {});
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
