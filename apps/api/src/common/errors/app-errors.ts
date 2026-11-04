import { ErrorCode, type ErrorDetail } from '@catalogue/contracts';

/**
 * Domain errors thrown by services/adapters. The global exception filter maps them to the
 * contract error body, so business code never deals with HTTP details.
 */
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: number;

  constructor(
    message: string,
    readonly details?: ErrorDetail[],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly code = ErrorCode.VALIDATION_ERROR;
  readonly status = 400;
}

export class NotFoundError extends AppError {
  readonly code = ErrorCode.NOT_FOUND;
  readonly status = 404;
}

/** The product data source failed. The message goes to clients, so keep it generic. */
export class UpstreamUnavailableError extends AppError {
  readonly code = ErrorCode.UPSTREAM_UNAVAILABLE;
  readonly status = 502;

  constructor(options?: ErrorOptions) {
    super('Product data is temporarily unavailable. Please try again shortly.', undefined, options);
  }
}
