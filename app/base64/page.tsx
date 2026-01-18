"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

function encodeBase64Utf8(input: string) {
  // btoa 仅支持 Latin1，这里转成 UTF-8 bytes 再编码
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decodeBase64Utf8(input: string) {
  const binary = atob(input.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export default function Base64Page() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canCopy = useMemo(() => output.length > 0, [output]);

  const onEncode = () => {
    try {
      setError(null);
      setOutput(encodeBase64Utf8(input));
    } catch (e: any) {
      setError(e?.message ?? "编码失败");
    }
  };

  const onDecode = () => {
    try {
      setError(null);
      setOutput(decodeBase64Utf8(input));
    } catch (e: any) {
      setError(e?.message ?? "解码失败：请确认输入是合法 Base64");
    }
  };

  const onSwap = () => {
    setError(null);
    setInput(output);
    setOutput("");
  };

  const onClear = () => {
    setError(null);
    setInput("");
    setOutput("");
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      // 忽略复制失败（例如非安全上下文）
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col items-center justify-center py-10 px-4 bg-white dark:bg-black md:px-8 lg:px-16">
        <div className="w-full max-w-3xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Base64 编码 / 解码
            </h1>
            <Link
              href="/"
              className="text-sm underline text-zinc-700 dark:text-zinc-300"
            >
              返回首页
            </Link>
          </div>

          <div className="grid gap-3">
            <label className="text-sm text-zinc-700 dark:text-zinc-300">
              输入
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入要编码/解码的内容（支持中文/UTF-8）"
              className="min-h-40 w-full rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:focus:ring-zinc-800"
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={onEncode}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                编码 → Base64
              </button>
              <button
                onClick={onDecode}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                解码 → 文本
              </button>
              <button
                onClick={onSwap}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                将输出放回输入
              </button>
              <button
                onClick={onClear}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                清空
              </button>
              <button
                onClick={onCopy}
                disabled={!canCopy}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                复制输出
              </button>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <label className="text-sm text-zinc-700 dark:text-zinc-300">
              输出
            </label>
            <textarea
              value={output}
              readOnly
              placeholder="结果会显示在这里"
              className="min-h-40 w-full rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:bg-black dark:text-zinc-100"
            />

            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              提示：解码时会自动忽略空白字符；UTF-8 文本使用 TextEncoder/TextDecoder 处理。
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

