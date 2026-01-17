'use client';

import { useMemo, useState } from 'react';

type ApiOk = { ok: true; messageId?: string };

type ApiErr = { ok: false; message: string };

type ApiResponse = ApiOk | ApiErr;

function isApiResponse(v: unknown): v is ApiResponse {
  if (!v || typeof v !== 'object') return false;
  if (!('ok' in v)) return false;
  const ok = (v as { ok?: unknown }).ok;
  if (typeof ok !== 'boolean') return false;
  if (ok) return true;
  return typeof (v as { message?: unknown }).message === 'string';
}

export default function SendEmail() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const canSubmit = useMemo(() => {
    return to.trim() && subject.trim() && text.trim() && !loading;
  }, [to, subject, text, loading]);

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
        body: JSON.stringify({ to, subject, text }),
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
        <p className="text-sm text-gray-500">
          填写收件人/主题/正文，点击发送即可触发后端 Gmail SMTP 发信。
        </p>
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
