"use client";

import { useMemo, useState } from "react";

function formatDate(ms: number) {
  const d = new Date(ms);
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export default function TimeConverter() {
  const [raw, setRaw] = useState<string>("");
  const [unit, setUnit] = useState<"ms" | "s">("ms");
  const [error, setError] = useState<string>("");

  const result = useMemo(() => {
    if (!raw.trim()) {
      setError("");
      return "";
    }

    const num = Number(raw.trim());
    if (!Number.isFinite(num)) {
      setError("请输入合法的数字");
      return "";
    }

    const ms = unit === "ms" ? num : num * 1000;
    if (ms < 0 || !Number.isFinite(ms)) {
      setError("时间戳超出范围");
      return "";
    }

    const formatted = formatDate(ms);
    setError("");
    return formatted;
  }, [raw, unit]);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
    } catch (e) {
      console.error("copy failed", e);
    }
  };

  const clear = () => {
    setRaw("");
    setError("");
  };

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">时间戳转换</h1>
          <p className="text-sm text-gray-500">毫秒或秒 → 本地时间 yyyy-MM-dd HH:mm:ss.SSS</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            复制结果
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
          >
            清空
          </button>
        </div>
      </div>

      <div className="rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900 p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="输入毫秒或秒时间戳"
            className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as "ms" | "s")}
            className="w-32 rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ms">毫秒</option>
            <option value="s">秒</option>
          </select>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-800 dark:text-gray-100">
          {result || "结果将在这里显示"}
        </div>
      </div>
    </div>
  );
}

