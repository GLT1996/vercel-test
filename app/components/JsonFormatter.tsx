"use client";

import { useMemo, useState } from "react";

// 递归折叠视图组件：支持对象/数组展开折叠
function CollapsibleJsonView({ value, label, depth = 0 }: { value: unknown; label?: string; depth?: number }) {
  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isContainer = isObject || isArray;

  const [open, setOpen] = useState<boolean>(true);

  const indentCls = depth > 0 ? "pl-4" : "";

  if (!isContainer) {
    const primitive = typeof value === "string" ? `"${value}"` : String(value);
    return (
      <div className={`font-mono text-sm ${indentCls}`}>
        {label !== undefined ? (
          <span className="text-slate-700">{label}: </span>
        ) : null}
        <span className={typeof value === "string" ? "text-green-700" : "text-blue-700"}>{primitive}</span>
      </div>
    );
  }

  const entries = isObject ? Object.entries(value as Record<string, unknown>) : (value as unknown[]).map((v, i) => [i, v]);
  const bracketOpen = isObject ? "{" : "[";
  const bracketClose = isObject ? "}" : "]";

  return (
    <div className={`font-mono text-sm ${indentCls}`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? "-" : "+"}
        </button>
        {label !== undefined ? <span className="text-slate-700 mr-1">{label}:</span> : null}
        <span className="text-slate-500">{bracketOpen}</span>
        {!open && <span className="ml-1 text-slate-400">{isObject ? `${entries.length} keys` : `${entries.length} items`}</span>}
      </div>
      {open && (
        <div className="mt-1">
          {entries.length === 0 ? (
            <div className="text-slate-400">empty</div>
          ) : (
            entries.map(([k, v], idx) => (
              <div key={String(k)} className="">
                <CollapsibleJsonView value={v} label={isObject ? String(k) : undefined} depth={depth + 1} />
                {idx < entries.length - 1 ? <span className="text-slate-500">,</span> : null}
              </div>
            ))
          )}
        </div>
      )}
      <div className="text-slate-500">{bracketClose}</div>
    </div>
  );
}

export default function JsonFormatter() {
  const [input, setInput] = useState<string>(`{
  // 支持注释、单引号、尾随逗号等常见扩展
  'hello': 'world',
  trailing: [1, 2, 3,],
  nested: { a: 1, b: 2, arr: [ { x: 1 }, { x: 2 } ] },
}`);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");

  // 轻量规范化：支持常见 JSON 扩展（类似 JSON5）
  const normalizeToStrictJson = (raw: string): string => {
    let s = raw;

    // 1) 去除 // 和 /* */ 注释
    s = s
      // 去除多行注释
      .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, "")
      // 去除行注释
      .replace(/(^|\s)\/\/.*$/gm, (m) => {
        // 保留前导空白，去掉注释内容
        return m.match(/^\s*/)?.[0] ?? "";
      });

    // 2) 将单引号字符串转为双引号（不处理模板字符串）
    // 尽量只匹配 JSON 中的简单字符串：'...'
    s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, inner) => {
      // 保留转义字符，替换为双引号包装
      return '"' + inner.replace(/"/g, '\\"') + '"';
    });

    // 3) 为对象键补充双引号（未带引号的简单键）
    // 仅处理由字母、数字、下划线、$ 组成的键：key: value
    s = s.replace(/([,{\s])([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, (m, pre, key) => {
      return `${pre}"${key}":`;
    });

    // 4) 移除尾随逗号（对象和数组）
    s = s
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\s+,\s*([}\]])/g, "$1");

    // 5) 去除多余空白行
    s = s.replace(/\n\s*\n+/g, "\n");

    return s;
  };

  const format = () => {
    setError("");
    try {
      // 先尝试标准 JSON
      const parsed = JSON.parse(input);
      const pretty = JSON.stringify(parsed, null, 2);
      setOutput(pretty);
      return;
    } catch {
      // 回退到扩展输入的规范化
    }

    try {
      const normalized = normalizeToStrictJson(input);
      const parsed = JSON.parse(normalized);
      const pretty = JSON.stringify(parsed, null, 2);
      setOutput(pretty);
    } catch (e: unknown) {
      setOutput("");
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setError(message + " (提示：支持注释/单引号/尾随逗号等扩展，但复杂情况可能失败)");
    }
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  const parsedValue = useMemo(() => {
    try {
      return JSON.parse(input);
    } catch {
      try {
        return JSON.parse(normalizeToStrictJson(input));
      } catch {
        return undefined;
      }
    }
  }, [input]);

  return (
    <div className="mt-10 w-full max-w-3xl">
      <h2 className="text-lg font-semibold mb-2">JSON Formatter</h2>
      <p className="text-sm text-gray-500 mb-3">输入 JSON 文本并点击 Format 自动格式化。支持常见扩展（注释、单引号、未加引号的键、尾随逗号）。此外，点击 +/- 可折叠对象体或数组。</p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="在这里粘贴 JSON 或对象字面量"
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

      {parsedValue !== undefined ? (
        <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs text-gray-500 mb-2">结构视图（可折叠）：</div>
          <CollapsibleJsonView value={parsedValue} />
        </div>
      ) : (
        <div className="mt-4 text-sm text-gray-500">无法解析为结构视图。</div>
      )}

      <div className="mt-4">
        <div className="text-xs text-gray-500 mb-2">格式化输出：</div>
        <pre className="w-full rounded border border-gray-200 bg-gray-50 p-3 font-mono text-sm whitespace-pre-wrap">
          {output}
        </pre>
      </div>
    </div>
  );
}
