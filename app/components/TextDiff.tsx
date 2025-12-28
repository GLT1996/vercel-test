"use client";
import React, { useMemo, useState } from "react";

// Line-level diff using LCS
function diffLines(a: string, b: string) {
  const aLines = a.split(/\r?\n/);
  const bLines = b.split(/\r?\n/);

  const dp: number[][] = Array(aLines.length + 1)
    .fill(0)
    .map(() => Array(bLines.length + 1).fill(0));

  for (let i = aLines.length - 1; i >= 0; i--) {
    for (let j = bLines.length - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  type LineToken = {
    left?: string;
    right?: string;
    type: "equal" | "removed" | "added" | "changed";
  };

  const result: LineToken[] = [];
  let i = 0, j = 0;
  while (i < aLines.length && j < bLines.length) {
    if (aLines[i] === bLines[j]) {
      result.push({ left: aLines[i], right: bLines[j], type: "equal" });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // removed line
      result.push({ left: aLines[i], type: "removed" });
      i++;
    } else {
      // added line
      result.push({ right: bLines[j], type: "added" });
      j++;
    }
  }
  while (i < aLines.length) {
    result.push({ left: aLines[i], type: "removed" });
    i++;
  }
  while (j < bLines.length) {
    result.push({ right: bLines[j], type: "added" });
    j++;
  }

  // Merge consecutive removed+added pairs into changed for better UX
  const merged: LineToken[] = [];
  for (let k = 0; k < result.length; k++) {
    const cur = result[k];
    const next = result[k + 1];
    if (cur?.type === "removed" && next?.type === "added") {
      merged.push({ left: cur.left, right: next.right, type: "changed" });
      k++; // skip next
    } else {
      merged.push(cur);
    }
  }

  return merged;
}

// Word-level diff for changed lines
function diffWordsInline(a: string, b: string) {
  const aWords = a.split(/(\s+)/);
  const bWords = b.split(/(\s+)/);

  const dp: number[][] = Array(aWords.length + 1)
    .fill(0)
    .map(() => Array(bWords.length + 1).fill(0));

  for (let i = aWords.length - 1; i >= 0; i--) {
    for (let j = bWords.length - 1; j >= 0; j--) {
      dp[i][j] = aWords[i] === bWords[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  type Token = { text: string; type: "equal" | "removed" | "added" };
  const result: Token[] = [];
  let i = 0, j = 0;
  while (i < aWords.length && j < bWords.length) {
    if (aWords[i] === bWords[j]) {
      result.push({ text: aWords[i], type: "equal" });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ text: aWords[i], type: "removed" });
      i++;
    } else {
      result.push({ text: bWords[j], type: "added" });
      j++;
    }
  }
  while (i < aWords.length) {
    result.push({ text: aWords[i], type: "removed" });
    i++;
  }
  while (j < bWords.length) {
    result.push({ text: bWords[j], type: "added" });
    j++;
  }
  return result;
}

export default function TextDiff() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  const lines = useMemo(() => diffLines(left, right), [left, right]);

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold mb-4">文本差异对比</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <textarea
          className="w-full h-40 p-3 rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900"
          placeholder="左侧文本"
          value={left}
          onChange={(e) => setLeft(e.target.value)}
        />
        <textarea
          className="w-full h-40 p-3 rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900"
          placeholder="右侧文本"
          value={right}
          onChange={(e) => setRight(e.target.value)}
        />
      </div>

      <div className="rounded border border-black/10 dark:border-white/20 p-4 bg-white dark:bg-neutral-900">
        <h2 className="text-lg font-medium mb-2">Git 风格 Diff</h2>

        {/* Side-by-side view */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left pane */}
          <div className="rounded border border-black/10 dark:border-white/20">
            <div className="text-sm font-medium px-3 py-2 bg-neutral-100 dark:bg-neutral-800">左侧</div>
            <div className="text-sm">
              {lines.map((ln, idx) => {
                if (ln.type === "equal") {
                  return (
                    <div key={idx} className="px-3 py-1">
                      <span className="text-neutral-500 mr-2"> </span>
                      <span>{ln.left}</span>
                    </div>
                  );
                }
                if (ln.type === "removed") {
                  return (
                    <div key={idx} className="px-3 py-1 bg-red-50 dark:bg-red-900/20">
                      <span className="text-red-600 mr-2">-</span>
                      <span className="bg-yellow-200 dark:bg-yellow-400/40">{ln.left}</span>
                    </div>
                  );
                }
                if (ln.type === "changed") {
                  const tokens = diffWordsInline(ln.left ?? "", ln.right ?? "");
                  return (
                    <div key={idx} className="px-3 py-1 bg-red-50 dark:bg-red-900/20">
                      <span className="text-red-600 mr-2">-</span>
                      <span>
                        {tokens.map((t, i2) => (
                          <span
                            key={i2}
                            className={t.type === "removed" ? "bg-yellow-200 dark:bg-yellow-400/40" : ""}
                          >
                            {t.type !== "added" ? t.text : null}
                          </span>
                        ))}
                      </span>
                    </div>
                  );
                }
                // added line has no content in left pane
                return (
                  <div key={idx} className="px-3 py-1">
                    <span className="text-green-600 mr-2">+</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right pane */}
          <div className="rounded border border-black/10 dark:border-white/20">
            <div className="text-sm font-medium px-3 py-2 bg-neutral-100 dark:bg-neutral-800">右侧</div>
            <div className="text-sm">
              {lines.map((ln, idx) => {
                if (ln.type === "equal") {
                  return (
                    <div key={idx} className="px-3 py-1">
                      <span className="text-neutral-500 mr-2"> </span>
                      <span>{ln.right}</span>
                    </div>
                  );
                }
                if (ln.type === "added") {
                  return (
                    <div key={idx} className="px-3 py-1 bg-green-50 dark:bg-green-900/20">
                      <span className="text-green-600 mr-2">+</span>
                      <span className="bg-yellow-200 dark:bg-yellow-400/40">{ln.right}</span>
                    </div>
                  );
                }
                if (ln.type === "changed") {
                  const tokens = diffWordsInline(ln.left ?? "", ln.right ?? "");
                  return (
                    <div key={idx} className="px-3 py-1 bg-green-50 dark:bg-green-900/20">
                      <span className="text-green-600 mr-2">+</span>
                      <span>
                        {tokens.map((t, i2) => (
                          <span
                            key={i2}
                            className={t.type === "added" ? "bg-yellow-200 dark:bg-yellow-400/40" : ""}
                          >
                            {t.type !== "removed" ? t.text : null}
                          </span>
                        ))}
                      </span>
                    </div>
                  );
                }
                // removed line has no content in right pane
                return (
                  <div key={idx} className="px-3 py-1">
                    <span className="text-red-600 mr-2">-</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inline unified view (optional) */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">统一视图</h3>
          <div className="text-sm">
            {lines.map((ln, idx) => {
              if (ln.type === "equal") {
                return (
                  <div key={idx} className="px-3 py-1">
                    <span className="text-neutral-500 mr-2"> </span>
                    <span>{ln.left}</span>
                  </div>
                );
              }
              if (ln.type === "removed") {
                return (
                  <div key={idx} className="px-3 py-1 bg-red-50 dark:bg-red-900/20">
                    <span className="text-red-600 mr-2">-</span>
                    <span className="bg-yellow-200 dark:bg-yellow-400/40">{ln.left}</span>
                  </div>
                );
              }
              if (ln.type === "added") {
                return (
                  <div key={idx} className="px-3 py-1 bg-green-50 dark:bg-green-900/20">
                    <span className="text-green-600 mr-2">+</span>
                    <span className="bg-yellow-200 dark:bg-yellow-400/40">{ln.right}</span>
                  </div>
                );
              }
              const tokens = diffWordsInline(ln.left ?? "", ln.right ?? "");
              return (
                <div key={idx} className="px-3 py-1">
                  <span className="text-yellow-600 mr-2">±</span>
                  {tokens.map((t, i2) => (
                    <span
                      key={i2}
                      className={t.type !== "equal" ? "bg-yellow-200 dark:bg-yellow-400/40" : ""}
                    >
                      {t.text}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

