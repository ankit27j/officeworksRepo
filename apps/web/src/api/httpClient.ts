import axios, { type AxiosInstance, isAxiosError } from 'axios';
import { ApiErrorBodySchema } from '@catalogue/contracts';
import type { z } from 'zod';
import { APP_CONFIG } from '../config/app';
import { ApiError } from './ApiError';

/**
 * The only place that talks HTTP. Every response is checked against the shared contract schema,
 * and every failure becomes an ApiError, so services and stores never see axios.
 */
export class HttpClient {
  private readonly axios: AxiosInstance;

  constructor(baseURL: string = APP_CONFIG.apiBaseUrl) {
    this.axios = axios.create({
      baseURL,
      timeout: APP_CONFIG.requestTimeoutMs,
      headers: { Accept: 'application/json' },
    });
  }

  async get<TSchema extends z.ZodType>(
    url: string,
    schema: TSchema,
    params?: Record<string, string>,
  ): Promise<z.output<TSchema>> {
    return this.request(schema, () => this.axios.get<unknown>(url, { params }));
  }

  async post<TSchema extends z.ZodType>(
    url: string,
    body: unknown,
    schema: TSchema,
  ): Promise<z.output<TSchema>> {
    return this.request(schema, () => this.axios.post<unknown>(url, body));
  }

  private async request<TSchema extends z.ZodType>(
    schema: TSchema,
    send: () => Promise<{ data: unknown }>,
  ): Promise<z.output<TSchema>> {
    let data: unknown;
    try {
      ({ data } = await send());
    } catch (error) {
      throw toApiError(error);
    }

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError('INVALID_RESPONSE', 'The server sent an unexpected response.');
    }
    return parsed.data;
  }
}

function toApiError(error: unknown): ApiError {
  if (!isAxiosError(error)) return ApiError.from(error);

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError('TIMEOUT', 'The server took too long to respond.');
  }
  if (!error.response) {
    return new ApiError('NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  const body = ApiErrorBodySchema.safeParse(error.response.data);
  if (body.success) {
    const { code, message, details } = body.data.error;
    return new ApiError(code, message, error.response.status, details);
  }
  return new ApiError('INTERNAL', 'Something went wrong. Please try again.', error.response.status);
}
