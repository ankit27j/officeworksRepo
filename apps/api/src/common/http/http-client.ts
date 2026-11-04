import { Injectable } from '@nestjs/common';
import { UpstreamUnavailableError } from '../errors/app-errors';

export interface GetJsonOptions {
  timeoutMs: number;
  /** Extra attempts after the first, for network errors, timeouts and 5xx. 4xx is never retried. */
  retries: number;
}

/** Outbound HTTP for adapters: timeout, bounded retry, and one error type for callers. */
@Injectable()
export class HttpClient {
  async getJson(url: string, { timeoutMs, retries }: GetJsonOptions): Promise<unknown> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.ok) return await response.json();

        lastError = new Error(`GET ${url} responded ${response.status}`);
        if (response.status < 500) break;
      } catch (error) {
        lastError = error;
      }
    }

    throw new UpstreamUnavailableError({ cause: lastError });
  }
}
