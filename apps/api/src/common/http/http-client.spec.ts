import { UpstreamUnavailableError } from '../errors/app-errors';
import { HttpClient } from './http-client';

const jsonResponse = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('HttpClient.getJson', () => {
  const client = new HttpClient();
  const options = { timeoutMs: 1000, retries: 1 };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('returns parsed JSON on success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [{ id: 1 }]));
    await expect(client.getJson('https://x.test/a', options)).resolves.toEqual([{ id: 1 }]);
  });

  it('retries a 5xx once and then succeeds', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503)).mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    await expect(client.getJson('https://x.test/a', options)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries network errors, then gives up with UpstreamUnavailableError', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(client.getJson('https://x.test/a', options)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 4xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404));
    await expect(client.getJson('https://x.test/a', options)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
