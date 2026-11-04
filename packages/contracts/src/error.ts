import { z } from 'zod';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorDetailSchema = z.object({
  /** Dotted path of the offending field, e.g. "email". Empty for non-field errors. */
  path: z.string(),
  message: z.string(),
});
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

/** Every non-2xx response from the API has this shape. */
export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(ErrorCode),
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
