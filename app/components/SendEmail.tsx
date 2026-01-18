'use client';

import { useMemo, useState } from 'react';

type ApiOk = { ok: true; messageId?: string };

type ApiErr = { ok: false; message: string };

type ApiResponse = ApiOk | ApiErr;

type AttachmentPayload = {
  filename: string;
  contentBase64: string;
  contentType?: string;
  size: number;
};

function isApiResponse(v: unknown): v is ApiResponse {
  if (!v || typeof v !== 'object') return false;
  if (!('ok' in v)) return false;
  const ok = (v as { ok?: unknown }).ok;
  if (typeof ok !== 'boolean') return false;
  if (ok) return true;
  return typeof (v as { message?: unknown }).message === 'string';
}

function bufferToBase64(buf: ArrayBuffer) {
  // Browser-safe base64 for binary data
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export default function SendEmail() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const canSubmit = useMemo(() => {
    return to.trim() && subject.trim() && text.trim() && !loading;
  }, [to, subject, text, loading]);

  const attachmentTotalBytes = useMemo(() => attachments.reduce((sum, a) => sum + a.size, 0), [attachments]);

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    // basic client-side guardrails (server also validates)
    const MAX_ATTACHMENTS = 3;
    const MAX_ATTACHMENT_BYTES = 1_000_000;

    const picked = Array.from(files);
    const next: AttachmentPayload[] = [];

    for (const f of picked) {
      if (attachments.length + next.length >= MAX_ATTACHMENTS) break;
      if (f.size > MAX_ATTACHMENT_BYTES) {
        setResult({ ok: false, message: `附件过大：${f.name}（最大 1MB）` });
        continue;
      }

      const buf = await f.arrayBuffer();
      next.push({
        filename: f.name,
        contentBase64: bufferToBase64(buf),
        contentType: f.type || undefined,
        size: f.size,
      });
    }

    if (next.length) {
      setAttachments((prev) => [...prev, ...next]);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSend() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
        },
        body: JSON.stringify({
          to,
          subject,
          text,
          attachments: attachments.map(({ filename, contentBase64, contentType }) => ({
            filename,
            contentBase64,
            ...(contentType ? { contentType } : {}),
          })),
        }),
      });

      const raw: unknown = await res.json().catch(() => null);
      if (!isApiResponse(raw)) {
        setResult({ ok: false, message: `Unexpected response (HTTP ${res.status})` });
        return;
      }

      if (!res.ok) {
        setResult({ ok: false, message: raw.ok ? `HTTP ${res.status}` : raw.message });
        return;
      }

      setResult(raw);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setResult({ ok: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-3xl space-y-4 mx-auto">
      <div>
        <h2 className="text-xl font-semibold">发邮件（Gmail）</h2>
        <p className="text-sm text-gray-500">填写收件人/主题/正文，点击发送即可触发后端 Gmail SMTP 发信。</p>
      </div>

      <div className="rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900 p-4 space-y-3">
        <div className="space-y-1">
          <div className="text-sm text-gray-600 dark:text-gray-300">收件人 (To)</div>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="someone@example.com"
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm text-gray-600 dark:text-gray-300">主题 (Subject)</div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Hello"
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm text-gray-600 dark:text-gray-300">正文 (Text)</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write something..."
            rows={8}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-sm text-gray-700">（可选）附件（最多 3 个，每个 ≤ 1MB）</div>
          <input
            type="file"
            multiple
            onChange={(e) => {
              void onPickFiles(e.target.files);
              // allow picking same file again
              e.currentTarget.value = '';
            }}
            className="block w-full text-sm"
          />

          {attachments.length ? (
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                已选择 {attachments.length} 个附件，总大小 {(attachmentTotalBytes / 1024).toFixed(1)} KB
              </div>
              <ul className="space-y-1">
                {attachments.map((a, idx) => (
                  <li key={`${a.filename}-${idx}`} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.filename}</div>
                      <div className="text-xs text-gray-500">{(a.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      disabled={loading}
                      className="ml-3 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      移除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <details className="rounded border border-gray-200 bg-gray-50 p-3">
          <summary className="cursor-pointer text-sm text-gray-700">（可选）API Key</summary>
          <p className="mt-2 text-xs text-gray-600">
            如果你配置了 <code>MAIL_API_KEY</code>，这里填相同的值才能发送；未配置则可留空。
          </p>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="MAIL_API_KEY"
            className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </details>

        <button
          type="button"
          onClick={onSend}
          disabled={!canSubmit}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? 'Sending…' : 'Send'}
        </button>

        {result ? (
          result.ok ? (
            <div className="rounded border border-green-200 bg-green-50 p-3 text-sm">
              <div className="font-semibold text-green-800">发送成功</div>
              <div className="text-green-800/80">messageId: {result.messageId || '(none)'}</div>
            </div>
          ) : (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
              <div className="font-semibold text-red-700">发送失败</div>
              <div className="text-red-700/80">{result.message}</div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
