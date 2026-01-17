import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './route';

function makeRequest(url = 'https://example.com/api/cron/daily-mail', headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

describe('GET /api/cron/daily-mail', () => {
  const env = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it('returns 401 if CRON_API_KEY is missing or invalid', async () => {
    process.env.CRON_API_KEY = 'cron-secret';

    const res = await GET(makeRequest('https://example.com', { authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('calls upstream /api/mail/send with MAIL_API_KEY and payload from env', async () => {
    process.env.CRON_API_KEY = 'cron-secret';
    process.env.MAIL_API_KEY = 'mail-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    process.env.CRON_MAIL_TO = 'someone@example.com';
    process.env.CRON_MAIL_SUBJECT = 'Daily';
    process.env.CRON_MAIL_TEXT = 'Hello';

    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>(async () => {
      return new Response(JSON.stringify({ ok: true, messageId: '123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const res = await GET(makeRequest('https://example.com/api/cron/daily-mail', { authorization: 'Bearer cron-secret' }));
    expect(res.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeTruthy();

    const url = (firstCall?.[0] ?? '') as string | URL;
    const init = (firstCall?.[1] ?? {}) as RequestInit;

    expect(String(url)).toBe('https://example.com/api/mail/send');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer mail-secret');

    const body = JSON.parse(String(init.body));
    expect(body).toEqual({ to: 'someone@example.com', subject: 'Daily', text: 'Hello' });

    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
