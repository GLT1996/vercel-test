"use client";

import { useMemo, useState } from "react";

// 递归折叠视图组件：支持对象/数组展开折叠
function CollapsibleJsonView({
  value,
  label,
  depth = 0,
  query,
  forceShow = false,
}: {
  value: unknown;
  label?: string;
  depth?: number;
  query?: string;
  forceShow?: boolean;
}) {
  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isContainer = isObject || isArray;

  const [open, setOpen] = useState<boolean>(true);

  const indentCls = depth > 0 ? "pl-4" : "";

  const normalizedQuery = (query ?? "").trim().toLowerCase();

  const matchesText = (text: string) => {
    if (!normalizedQuery) return true;
    return text.toLowerCase().includes(normalizedQuery);
  };

  const highlight = (text: string) => {
    if (!normalizedQuery) return <>{text}</>;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(normalizedQuery);
    if (idx === -1) return <>{text}</>;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + normalizedQuery.length);
    const after = text.slice(idx + normalizedQuery.length);

    return (
      <>
        {before}
        <mark className="rounded bg-yellow-200 px-0.5 text-inherit">{match}</mark>
        {after}
      </>
    );
  };

  const valueAsSearchText = (v: unknown): string => {
    if (v === null) return "null";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
    if (typeof v === "undefined") return "undefined";
    // object / array
    try {
      return JSON.stringify(v);
    } catch {
      return "[unserializable]";
    }
  };

  const probe = (vv: unknown): boolean => {
    if (!normalizedQuery) return true;
    if (vv === null || typeof vv !== "object") return matchesText(valueAsSearchText(vv));
    if (Array.isArray(vv)) return vv.some((x) => probe(x));
    return Object.entries(vv as Record<string, unknown>).some(([kk, xx]) => matchesText(kk) || probe(xx));
  };

  // 当前节点是否应该显示：自己或任意子节点命中 query；如果父级已命中（forceShow），则直接展示
  const nodeMatchesInfo = (() => {
    if (forceShow) return { show: true, keyHit: false };
    if (!normalizedQuery) return { show: true, keyHit: false };

    const keyHit = label !== undefined ? matchesText(label) : false;

    if (!isContainer) {
      const valText = valueAsSearchText(value);
      const show = keyHit || matchesText(valText);
      return { show, keyHit };
    }

    // 容器节点：自己命中 或 任一子节点命中
    const show = keyHit || probe(value);
    return { show, keyHit };
  })();

  if (!nodeMatchesInfo.show) return null;

  if (!isContainer) {
    return (
      <div className={`font-mono text-sm ${indentCls}`}>
        {label !== undefined ? <span className="text-slate-700">{highlight(label)}: </span> : null}
        <span className={typeof value === "string" ? "text-green-700" : "text-blue-700"}>
          {typeof value === "string" ? (
            <>
              {'"'}
              {highlight(value)}
              {'"'}
            </>
          ) : (
            highlight(String(value))
          )}
        </span>
      </div>
    );
  }

  const entries = isObject
    ? Object.entries(value as Record<string, unknown>)
    : (value as unknown[]).map((v, i) => [i, v] as const);

  // 容器命中时，为了完整展示其内容，子项不过滤；未命中时按子树匹配过滤
  const filteredEntries = !normalizedQuery || nodeMatchesInfo.keyHit || forceShow
    ? entries
    : entries.filter(([k, v]) => {
        const keyText = isObject ? String(k) : "";
        const keyHit = isObject ? matchesText(keyText) : false;
        if (keyHit) return true;
        return probe(v);
      });

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
        {label !== undefined ? <span className="text-slate-700 mr-1">{highlight(label)}:</span> : null}
        <span className="text-slate-500">{bracketOpen}</span>
        {!open && (
          <span className="ml-1 text-slate-400">{isObject ? `${filteredEntries.length} keys` : `${filteredEntries.length} items`}</span>
        )}
      </div>
      {open && (
        <div className="mt-1">
          {filteredEntries.length === 0 ? (
            <div className="text-slate-400">empty</div>
          ) : (
            filteredEntries.map(([k, v], idx) => (
              <div key={String(k)} className="">
                <CollapsibleJsonView
                  value={v}
                  label={isObject ? String(k) : undefined}
                  depth={depth + 1}
                  query={query}
                  forceShow={forceShow || nodeMatchesInfo.keyHit}
                />
                {idx < filteredEntries.length - 1 ? <span className="text-slate-500">,</span> : null}
              </div>
            ))
          )}
        </div>
      )}
      <div className="text-slate-500">{bracketClose}</div>
    </div>
  );
}

function RootSearchableJsonView({ value }: { value: unknown }) {
  const [query, setQuery] = useState<string>("");

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="搜索 key / value（支持折叠视图过滤和高亮）"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="shrink-0 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Clear
          </button>
        ) : null}
      </div>

      <CollapsibleJsonView value={value} query={query} />
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
      // 格式化输出不再单独展示，仅用于结构视图
      JSON.stringify(parsed, null, 2);
      return;
    } catch {
      // 回退到扩展输入的规范化
    }

    try {
      const normalized = normalizeToStrictJson(input);
      const parsed = JSON.parse(normalized);
      JSON.stringify(parsed, null, 2);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setError(message + " (提示：支持注释/单引号/尾随逗号等扩展，但复杂情况可能失败)");
    }
  };

  const clear = () => {
    setInput("");
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
          <RootSearchableJsonView value={parsedValue} />
        </div>
      ) : (
        <div className="mt-4 text-sm text-gray-500">无法解析为结构视图。</div>
      )}
    </div>
  );
}
