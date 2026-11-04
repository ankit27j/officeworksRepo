import { Injectable } from '@nestjs/common';
import { FeaturedScope } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FeaturedRepository } from '../ports/featured.repository.port';

@Injectable()
export class PrismaFeaturedRepository extends FeaturedRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override findHomeProductIds(): Promise<string[]> {
    return this.findIds(FeaturedScope.HOME, null);
  }

  override findCategoryProductIds(categorySlug: string): Promise<string[]> {
    return this.findIds(FeaturedScope.CATEGORY, categorySlug);
  }

  private async findIds(scope: FeaturedScope, categorySlug: string | null): Promise<string[]> {
    const rows = await this.prisma.featuredProduct.findMany({
      where: { scope, categorySlug },
      orderBy: { position: 'asc' },
      select: { productId: true },
    });
    return rows.map((row) => row.productId);
  }
}
