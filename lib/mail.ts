import * as nodemailer from 'nodemailer';

export type MailAttachment = {
  filename?: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  cid?: string;
};

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
};

type NodemailerAttachments = nodemailer.SendMailOptions['attachments'];

type NodemailerAttachmentItem = {
  filename?: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  cid?: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export function assertNoHeaderInjection(value: string, fieldName: string) {
  if (/[\r\n]/.test(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
}

export function normalizeEmail(raw: string): string {
  const email = raw.trim();
  // A pragmatic validation — better than nothing, avoids obvious junk.
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!ok) throw new Error('Invalid recipient email');
  assertNoHeaderInjection(email, 'email');
  return email;
}

export function normalizeSubject(raw: string): string {
  const subject = raw.trim();
  if (!subject) throw new Error('Subject is required');
  if (subject.length > 200) throw new Error('Subject too long (max 200)');
  assertNoHeaderInjection(subject, 'subject');
  return subject;
}

export function normalizeText(raw: string): string {
  const text = raw.replace(/\r\n/g, '\n');
  if (!text.trim()) throw new Error('Text is required');
  if (text.length > 10000) throw new Error('Text too long (max 10000)');
  return text;
}

function normalizeAttachments(raw: SendMailInput['attachments']): NodemailerAttachments | undefined {
  if (!raw || raw.length === 0) return undefined;

  const mapped: NodemailerAttachmentItem[] = raw.map((a, idx) => {
    if (!a || typeof a !== 'object') throw new Error(`Invalid attachment at index ${idx}`);

    const hasContent = typeof a.content !== 'undefined';
    const hasPath = typeof a.path !== 'undefined';
    if (!hasContent && !hasPath) {
      throw new Error(`Invalid attachment at index ${idx}: content or path is required`);
    }

    if (typeof a.filename === 'string') assertNoHeaderInjection(a.filename, 'attachment filename');
    if (typeof a.cid === 'string') assertNoHeaderInjection(a.cid, 'attachment cid');

    return {
      filename: a.filename,
      content: a.content,
      path: a.path,
      contentType: a.contentType,
      cid: a.cid,
    };
  });

  return mapped as unknown as NodemailerAttachments;
}

export async function sendMail(input: SendMailInput) {
  const user = requiredEnv('GMAIL_USER');
  const pass = requiredEnv('GMAIL_APP_PASSWORD');
  const fromName = process.env.MAIL_FROM_NAME?.trim() || 'My Next.js App';

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    debug: true, // 显示详细调试信息
    logger: true, // 将日志输出到控制台
  });

  return transporter.sendMail({
    from: `"${fromName}" <${user}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachments: normalizeAttachments(input.attachments),
  });
}
