import type { ErrorCode, ErrorDetail } from '@catalogue/contracts';

/** Contract error codes plus the failures that only the client can see. */
export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE';

/** The one error type the UI deals with, whatever went wrong underneath. */
export class ApiError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message: string,
    readonly status?: number,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNotFound(): boolean {
    return this.code === 'NOT_FOUND';
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    return new ApiError('INTERNAL', error instanceof Error ? error.message : 'Unexpected error');
  }
}
