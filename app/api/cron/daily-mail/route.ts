import { NextResponse } from 'next/server';
import { normalizeEmail, normalizeSubject, normalizeText, sendMail } from '@/lib/mail';

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

export async function GET(request: Request) {
  try {
    if (!checkCronKey(request)) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    // These come from cron env vars (content can be defined later).
    const toRaw = process.env.CRON_MAIL_TO || '';
    const subjectRaw = process.env.CRON_MAIL_SUBJECT || 'Daily email';
    const textRaw = process.env.CRON_MAIL_TEXT || 'Daily email (content TBD)';

    // Reuse the same validation/normalization rules as the public API.
    const to = normalizeEmail(String(toRaw));
    const subject = normalizeSubject(String(subjectRaw));
    const text = normalizeText(String(textRaw));

    console.log('daily-mail cron sending to:', to);
    const info = await sendMail({ to, subject, text });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err: unknown) {
    console.error('daily-mail cron failed:', err);
    const msg = err instanceof Error ? err.message : 'Cron failed';

    // Keep parity with /api/mail/send error mapping.
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

    return NextResponse.json({ ok: false, message: status === 500 ? 'Cron failed' : msg }, { status });
  }
}
