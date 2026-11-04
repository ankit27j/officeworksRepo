import { ProductSchema } from '@catalogue/contracts';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../test/fixtures';
import { errorBody } from '../test/handlers';
import { server } from '../test/server';
import { ApiError } from './ApiError';
import { HttpClient } from './httpClient';

const client = new HttpClient('/api/v1');
const url = '*/api/v1/products/1';

describe('HttpClient', () => {
  it('returns contract-valid data', async () => {
    await expect(client.get('/products/1', ProductSchema)).resolves.toEqual(PRODUCTS[0]);
  });

  it('maps the API error body to an ApiError', async () => {
    server.use(
      http.get(url, () => HttpResponse.json(errorBody('NOT_FOUND', 'Product not found'), { status: 404 })),
    );

    const error = await client.get('/products/1', ProductSchema).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Product not found',
      isNotFound: true,
    });
  });

  it('rejects a response that does not match the contract', async () => {
    server.use(http.get(url, () => HttpResponse.json({ id: 1, name: 'wrong shape' })));
    await expect(client.get('/products/1', ProductSchema)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('reports a network failure', async () => {
    server.use(http.get(url, () => HttpResponse.error()));
    await expect(client.get('/products/1', ProductSchema)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('handles a non-contract error body (e.g. a proxy error page)', async () => {
    server.use(http.get(url, () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })));
    await expect(client.get('/products/1', ProductSchema)).rejects.toMatchObject({
      code: 'INTERNAL',
      status: 502,
    });
  });
});
