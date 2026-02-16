"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";

type Props = {
  label: string;
  value: string;
  onChangeAction: (next: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  readOnly?: boolean;
};

// A small wrapper around Monaco so we can use multi-cursor / column selection.
// Users can typically use:
// - Alt + Shift + Drag (column selection)
// - Ctrl + Alt + Down/Up (add cursor)
// Mouse middle-button column selection varies by OS/driver; Monaco focuses on the key combos above.
export default function MonacoTextarea({
  label,
  value,
  onChangeAction,
  placeholder,
  rows = 10,
  id,
  readOnly,
}: Props) {
  const mountedRef = useRef(false);
  const lastValueRef = useRef(value);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  const height = useMemo(() => {
    // approx: 22px per line + chrome
    return Math.max(240, rows * 22 + 24);
  }, [rows]);

  const handleMount: OnMount = (editor) => {
    editor.updateOptions({
      readOnly: !!readOnly,
      wordWrap: "off",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      multiCursorModifier: "alt", // Alt+click to add cursor
    });

    // Show placeholder when empty (simple implementation)
    if (placeholder) {
      const updatePlaceholder = () => {
        const model = editor.getModel();
        if (!model) return;
        const isEmpty = model.getValueLength() === 0;
        editor.updateOptions({
          ariaLabel: isEmpty ? placeholder : label,
        });
      };
      updatePlaceholder();
      editor.onDidChangeModelContent(updatePlaceholder);
    }
  };

  // First render fallback: textarea.
  // In practice this is shown very briefly; Monaco will mount on client.
  if (!mountedRef.current) {
    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
        <textarea
          id={id}
          rows={rows}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          value={value}
          onChange={(e) => onChangeAction(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="mt-1 overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
        <Editor
          height={height}
          defaultLanguage="plaintext"
          value={value}
          onChange={(v: string | undefined) => {
            const next = v ?? "";
            if (next !== lastValueRef.current) onChangeAction(next);
          }}
          onMount={handleMount}
          options={{
            fontSize: 14,
            lineNumbers: "off",
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        多行同列编辑：推荐用 Alt+Shift+拖拽（列选择）或 Alt+点击（多光标）。鼠标中键列选择是否可用取决于系统/驱动设置。
      </p>
    </div>
  );
}
