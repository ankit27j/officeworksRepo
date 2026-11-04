import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { Env } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductSource } from '../products/ports/product-source.port';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  storage: Env['STORAGE'];
  /** `disabled` with STORAGE=memory. */
  db: 'up' | 'down' | 'disabled';
  productSource: string;
}

/** GET /health (outside /api/v1). For Docker/ALB health checks. Returns 503 when the DB is in use but unreachable. */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductSource,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthStatus> {
    const storage = this.config.get('STORAGE', { infer: true });
    const productSource = this.products.name;
    if (storage === 'memory') return { status: 'ok', storage, db: 'disabled', productSource };

    const dbUp = await this.prisma.isHealthy();
    res.status(dbUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: dbUp ? 'ok' : 'degraded', storage, db: dbUp ? 'up' : 'down', productSource };
  }
}
