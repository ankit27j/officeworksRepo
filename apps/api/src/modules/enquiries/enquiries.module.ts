import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsModule } from '../products/products.module';
import { EnquiriesController } from './enquiries.controller';
import { EnquiriesService } from './enquiries.service';
import { createEnquiryRepository } from './enquiry-repository.factory';
import { createMailer } from './mailer.factory';
import { EnquiryRepository } from './ports/enquiry.repository.port';
import { Mailer } from './ports/mailer.port';

@Module({
  imports: [
    ProductsModule,
    // Per-IP limit on enquiries. In-memory storage: swap for a Redis store when running several instances.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ ttl: 60_000, limit: config.get('ENQUIRY_RATE_LIMIT_PER_MIN', { infer: true }) }],
        errorMessage: 'Too many enquiries. Please wait a minute and try again.',
      }),
    }),
  ],
  controllers: [EnquiriesController],
  providers: [
    EnquiriesService,
    {
      provide: EnquiryRepository,
      inject: [ConfigService, PrismaService],
      useFactory: createEnquiryRepository,
    },
    { provide: Mailer, inject: [ConfigService], useFactory: createMailer },
  ],
})
export class EnquiriesModule {}
