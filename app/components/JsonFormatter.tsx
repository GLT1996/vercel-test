"use client";

import { useState } from "react";

export default function JsonFormatter() {
  const [input, setInput] = useState<string>(`{
  "hello": "world"
}`);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");

  const format = () => {
    setError("");
    try {
      const parsed = JSON.parse(input);
      const pretty = JSON.stringify(parsed, null, 2);
      setOutput(pretty);
    } catch (e: unknown) {
      setOutput("");
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setError(message);
    }
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <div className="mt-10 w-full max-w-3xl">
      <h2 className="text-lg font-semibold mb-2">JSON Formatter</h2>
      <p className="text-sm text-gray-500 mb-3">输入 JSON 文本并点击 Format 自动格式化。</p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="在这里粘贴 JSON"
        className="w-full h-40 rounded border border-gray-300 p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={format}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Format
        </button>
        <button
          onClick={clear}
          className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600">错误：{error}</div>
      )}

      <pre className="mt-4 w-full rounded border border-gray-200 bg-gray-50 p-3 font-mono text-sm whitespace-pre-wrap">
        {output}
      </pre>
    </div>
  );
}
