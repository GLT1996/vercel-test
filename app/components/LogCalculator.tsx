"use client";

import { useMemo, useState } from "react";
import ExpressionCalculator from "./ExpressionCalculator";

function computeLogBase(a: number, b: number) {
  // 支持自然底数：当 a 为 e 时，直接返回 ln(b)
  if (a === Math.E) {
    return Math.log(b);
  }
  // log_a(b) = ln(b) / ln(a)
  return Math.log(b) / Math.log(a);
}

function parseNumberOrConst(raw: string): number {
  const s = raw.trim();
  if (!s) return NaN;

  const lower = s.toLowerCase();
  if (lower === "e") return Math.E;
  if (lower === "pi" || s === "π") return Math.PI;

  // Support underscores and common comma formatting in pasted numbers
  const normalized = s.replace(/_/g, "").replace(/,/g, "");
  return Number(normalized);
}

export default function LogCalculator() {
  const [aRaw, setARaw] = useState<string>("");
  const [bRaw, setBRaw] = useState<string>("");

  const { result, error } = useMemo(() => {
    const aTrim = aRaw.trim();
    const bTrim = bRaw.trim();

    if (!aTrim && !bTrim) return { result: "", error: "" };

    if (!aTrim || !bTrim) {
      return { result: "", error: "请输入 a 和 b" };
    }

    const a = parseNumberOrConst(aTrim);
    const b = parseNumberOrConst(bTrim);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return { result: "", error: "请输入合法的数字（支持 e / π）" };
    }

    // Domain constraints
    if (a <= 0) return { result: "", error: "底数 a 必须 > 0" };
    if (a === 1) return { result: "", error: "底数 a 不能等于 1" };
    if (b <= 0) return { result: "", error: "真数 b 必须 > 0" };

    const value = computeLogBase(a, b);
    if (!Number.isFinite(value)) {
      return { result: "", error: "结果超出范围" };
    }

    // Keep a sensible readable format while preserving precision.
    const pretty = `${value}`;

    return { result: pretty, error: "" };
  }, [aRaw, bRaw]);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      // ignore
    }
  };

  const clear = () => {
    setARaw("");
    setBRaw("");
  };

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">对数计算器</h1>
          <p className="text-sm text-gray-500">计算 logₐ(b)（a 为底数，b 为真数）</p>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">底数 a</label>
            <input
              value={aRaw}
              onChange={(e) => setARaw(e.target.value)}
              placeholder="例如：10 / 2 / e"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-500">要求：a &gt; 0 且 a ≠ 1（支持常量：e / π）</div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">真数 b</label>
            <input
              value={bRaw}
              onChange={(e) => setBRaw(e.target.value)}
              placeholder="例如：100 / 8"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-500">要求：b &gt; 0（支持常量：e / π）</div>
          </div>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-800 dark:text-gray-100">
          {result ? (
            <div className="space-y-1">
              <div>
                结果：<span className="font-mono">{result}</span>
              </div>
              <div className="text-xs text-gray-500">计算公式：logₐ(b) = ln(b) / ln(a)</div>
            </div>
          ) : (
            "结果将在这里显示"
          )}
        </div>
      </div>

      <div className="my-2 w-full border-t border-black/10 dark:border-white/20" />

      <ExpressionCalculator />
    </div>
  );
}
