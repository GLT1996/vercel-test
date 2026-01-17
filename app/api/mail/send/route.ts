import { NextResponse } from 'next/server';
import { normalizeEmail, normalizeSubject, normalizeText, sendMail } from '@/lib/mail';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

type SendMailBody = {
  to?: unknown;
  subject?: unknown;
  text?: unknown;
};

function getClientIp(request: Request) {
  // Best-effort. On Vercel, this is usually set.
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function checkApiKey(request: Request) {
  const expected = process.env.MAIL_API_KEY;
  if (!expected) return true; // allow if not configured

  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1] || request.headers.get('x-api-key') || '';

  return token && token === expected;
}

export async function POST(request: Request) {
  try {
    if (!checkApiKey(request)) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rl = rateLimit(`mail:${ip}`, { windowMs: 60_000, max: 10 });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, message: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAtMs - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = (await request.json().catch(() => ({}))) as SendMailBody;

    const to = normalizeEmail(String(body.to ?? ''));
    const subject = normalizeSubject(String(body.subject ?? ''));
    const text = normalizeText(String(body.text ?? ''));

    const info = await sendMail({ to, subject, text });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status =
      msg.startsWith('Missing environment variable') ||
      msg === 'Invalid recipient email' ||
      msg === 'Subject is required' ||
      msg.startsWith('Subject too long') ||
      msg === 'Text is required' ||
      msg.startsWith('Text too long') ||
      msg.startsWith('Invalid ')
        ? 400
        : 500;

    // Avoid leaking SMTP details to clients.
    if (status === 500) {
      console.error('send mail failed:', err);
      return NextResponse.json({ ok: false, message: 'Failed to send email' }, { status });
    }

    return NextResponse.json({ ok: false, message: msg }, { status });
  }
}
