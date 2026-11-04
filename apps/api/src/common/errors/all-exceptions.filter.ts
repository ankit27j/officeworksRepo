import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type ApiErrorBody, ErrorCode } from '@catalogue/contracts';
import type { Response } from 'express';
import { AppError } from './app-errors';

interface ErrorResponse {
  status: number;
  body: ApiErrorBody;
}

/** Maps every thrown error to the contract error body. Never leaks stack traces or internals. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = this.toErrorResponse(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const cause = exception instanceof Error ? (exception.cause ?? exception) : exception;
      this.logger.error(body.error.message, cause instanceof Error ? cause.stack : String(cause));
    }

    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private toErrorResponse(exception: unknown): ErrorResponse {
    if (exception instanceof AppError) {
      return {
        status: exception.status,
        body: { error: { code: exception.code, message: exception.message, details: exception.details } },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status < HttpStatus.INTERNAL_SERVER_ERROR) {
        return { status, body: { error: { code: codeForClientStatus(status), message: exception.message } } };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { error: { code: ErrorCode.INTERNAL, message: 'Something went wrong. Please try again.' } },
    };
  }
}

function codeForClientStatus(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    default:
      return ErrorCode.VALIDATION_ERROR;
  }
}
