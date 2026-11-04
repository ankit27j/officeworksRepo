import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ValidationError } from '../errors/app-errors';

/**
 * Validates and normalises a request part (body/query/param) with a shared contract schema.
 * Usage: `@Query(new ZodValidationPipe(SearchQuerySchema)) query: SearchQuery`
 */
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<TSchema>
> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError(
        'Request validation failed',
        result.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      );
    }
    return result.data;
  }
}
