import { NextResponse } from 'next/server';
import { normalizeEmail, normalizeSubject, normalizeText, sendMail, type MailAttachment } from '@/lib/mail';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

type AttachmentBody = {
  filename?: unknown;
  contentBase64?: unknown;
  contentText?: unknown;
  contentType?: unknown;
};

type SendMailBody = {
  to?: unknown;
  subject?: unknown;
  text?: unknown;
  attachments?: unknown;
};

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 1_000_000; // 1MB each (base64 decoded)

function parseAttachments(raw: unknown): MailAttachment[] | undefined {
  if (typeof raw === 'undefined' || raw === null) return undefined;
  if (!Array.isArray(raw)) throw new Error('Invalid attachments');
  if (raw.length > MAX_ATTACHMENTS) throw new Error(`Too many attachments (max ${MAX_ATTACHMENTS})`);

  const out: MailAttachment[] = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i] as AttachmentBody;
    if (!a || typeof a !== 'object') throw new Error(`Invalid attachment at index ${i}`);

    const filename = typeof a.filename === 'string' ? a.filename.trim() : '';
    const contentType = typeof a.contentType === 'string' ? a.contentType.trim() : undefined;

    const hasBase64 = typeof a.contentBase64 === 'string' && a.contentBase64.trim().length > 0;
    const hasText = typeof a.contentText === 'string' && a.contentText.length > 0;

    if (!filename) throw new Error(`Invalid attachment at index ${i}: filename is required`);
    if (!hasBase64 && !hasText) {
      throw new Error(`Invalid attachment at index ${i}: contentBase64 or contentText is required`);
    }

    let content: Buffer;
    if (hasBase64) {
      // Strip optional data URL prefix: data:<mime>;base64,xxxx
      const base64 = (a.contentBase64 as string).trim().replace(/^data:[^;]+;base64,/, '');
      content = Buffer.from(base64, 'base64');
      // Basic sanity check: reject obviously invalid base64 producing empty buffer.
      if (content.length === 0) throw new Error(`Invalid attachment at index ${i}: invalid base64`);
    } else {
      content = Buffer.from(String(a.contentText), 'utf8');
    }

    if (content.length > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Attachment too large at index ${i} (max ${MAX_ATTACHMENT_BYTES} bytes)`);
    }

    out.push({ filename, content, contentType });
  }

  return out.length ? out : undefined;
}

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
    console.log('Mail API route received a request.' + request);
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
    const attachments = parseAttachments(body.attachments);

    const info = await sendMail({ to, subject, text, attachments });

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
      msg.startsWith('Invalid attachments') ||
      msg.startsWith('Invalid attachment') ||
      msg.startsWith('Too many attachments') ||
      msg.startsWith('Attachment too large') ||
      msg.startsWith('Invalid ')
        ? 400
        : 500;

    // Avoid leaking SMTP details to clients.
    if (status === 500) {
      console.error('send mail failed:', err);
      return NextResponse.json({ ok: false, message: 'Failed to send email' }, { status });
    }

    return NextResponse.json({ ok: false, message: msg }, { status });
  } finally {
    console.log('Mail API route processed a request.' + request);
  }
}
