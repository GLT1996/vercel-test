import { NextResponse } from 'next/server';

export const runtime = 'nodejs';



function checkCronKey(request: Request) {
  const expected = process.env.CRON_API_KEY;
  if (!expected) return false; // must be configured


  // 2) Header token (useful for curl / external schedulers)
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1] || request.headers.get('x-api-key') || '';

  return Boolean(token) && token === expected;
}

function absoluteUrl(request: Request, path: string) {
  // Prefer an explicit public URL (works for server-to-server in cron).
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (base) return new URL(path, base).toString();

  // Fallback to the request's origin.
  const origin = request.headers.get('origin');
  if (origin) return new URL(path, origin).toString();

  // last resort: infer from host
  const host = request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}${path}`;

  return path;
}

export async function GET(request: Request) {
  try {
    if (!checkCronKey(request)) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const mailKey = process.env.MAIL_API_KEY;
    if (!mailKey) {
      // The mail endpoint allows missing key, but cron should be explicit.
      return NextResponse.json(
        { ok: false, message: 'Missing environment variable: MAIL_API_KEY' },
        { status: 500 }
      );
    }

    const to = process.env.CRON_MAIL_TO || '';
    const subject = process.env.CRON_MAIL_SUBJECT || 'Daily email';
    const text = process.env.CRON_MAIL_TEXT || 'Daily email (content TBD)';

    const url = absoluteUrl(request, '/api/mail/send');
    console.log('daily-mail cron sending to:', to, 'via', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${mailKey}`,
      },
      body: JSON.stringify({ to, subject, text }),
    });
    console.log('daily-mail cron upstream status:', res);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: 'Upstream mail endpoint failed', upstreamStatus: res.status, upstream: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, upstream: data });
  } catch (err) {
    console.error('daily-mail cron failed:', err);
    return NextResponse.json({ ok: false, message: 'Cron failed' }, { status: 500 });
  }
}
