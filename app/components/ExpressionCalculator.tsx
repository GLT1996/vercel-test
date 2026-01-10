"use client";

import { useMemo, useState } from "react";

type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "paren"; value: "(" | ")" };

function isDigit(ch: string) {
  return ch >= "0" && ch <= "9";
}

function tokenize(expr: string): Token[] {
  const s = expr.replace(/\s+/g, "");
  const tokens: Token[] = [];

  let i = 0;
  while (i < s.length) {
    const ch = s[i];

    if (ch === "+" || ch === "*" || ch === "/" || ch === "^") {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }

    if (ch === "-") {
      // Decide unary minus vs binary minus.
      // Unary if at start or after an operator or after '('
      const prev = tokens[tokens.length - 1];
      const isUnary =
        !prev ||
        (prev.type === "op") ||
        (prev.type === "paren" && prev.value === "(");

      if (isUnary) {
        // If next is a number, parse as a negative number.
        const next = s[i + 1];
        if (next && (isDigit(next) || next === ".")) {
          let j = i + 1;
          let numStr = "-";
          while (j < s.length && (isDigit(s[j]) || s[j] === ".")) {
            numStr += s[j];
            j++;
          }
          const value = Number(numStr);
          if (!Number.isFinite(value)) throw new Error("非法数字");
          tokens.push({ type: "number", value });
          i = j;
          continue;
        }

        // If next is '(', represent as 0 - (...)
        if (next === "(") {
          tokens.push({ type: "number", value: 0 });
          tokens.push({ type: "op", value: "-" });
          i++;
          continue;
        }

        throw new Error("一元负号位置不合法");
      }

      tokens.push({ type: "op", value: "-" });
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "paren", value: "(" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "paren", value: ")" });
      i++;
      continue;
    }

    if (isDigit(ch) || ch === ".") {
      let j = i;
      let numStr = "";
      while (j < s.length && (isDigit(s[j]) || s[j] === ".")) {
        numStr += s[j];
        j++;
      }
      const value = Number(numStr);
      if (!Number.isFinite(value)) throw new Error("非法数字");
      tokens.push({ type: "number", value });
      i = j;
      continue;
    }

    throw new Error(`不支持的字符: ${ch}`);
  }

  return tokens;
}

function precedence(op: Token & { type: "op" }) {
  switch (op.value) {
    case "^":
      return 3;
    case "*":
    case "/":
      return 2;
    case "+":
    case "-":
      return 1;
  }
}

function isRightAssociative(op: Token & { type: "op" }) {
  return op.value === "^";
}

function toRpn(tokens: Token[]) {
  const output: Token[] = [];
  const stack: Token[] = [];

  for (const t of tokens) {
    if (t.type === "number") {
      output.push(t);
      continue;
    }

    if (t.type === "op") {
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.type !== "op") break;

        const pTop = precedence(top);
        const pCur = precedence(t);

        const shouldPop = isRightAssociative(t) ? pTop > pCur : pTop >= pCur;
        if (!shouldPop) break;

        output.push(stack.pop() as Token);
      }
      stack.push(t);
      continue;
    }

    // parentheses
    if (t.type === "paren" && t.value === "(") {
      stack.push(t);
      continue;
    }

    if (t.type === "paren" && t.value === ")") {
      let found = false;
      while (stack.length > 0) {
        const top = stack.pop() as Token;
        if (top.type === "paren" && top.value === "(") {
          found = true;
          break;
        }
        output.push(top);
      }
      if (!found) throw new Error("括号不匹配");
    }
  }

  while (stack.length > 0) {
    const top = stack.pop() as Token;
    if (top.type === "paren") throw new Error("括号不匹配");
    output.push(top);
  }

  return output;
}

function evalRpn(rpn: Token[]) {
  const st: number[] = [];
  for (let i = 0; i < rpn.length; i++) {
    const t = rpn[i];

    if (t.type === "number") {
      st.push(t.value);
      continue;
    }

    if (t.type !== "op") {
      throw new Error("非法表达式");
    }

    const b = st.pop();
    const a = st.pop();
    if (a === undefined || b === undefined) throw new Error("表达式不完整");

    let v: number;
    switch (t.value) {
      case "+":
        v = a + b;
        break;
      case "-":
        v = a - b;
        break;
      case "*":
        v = a * b;
        break;
      case "/":
        if (b === 0) throw new Error("除数不能为 0");
        v = a / b;
        break;
      case "^":
        v = Math.pow(a, b);
        break;
    }

    if (!Number.isFinite(v)) throw new Error("结果超出范围");
    st.push(v);
  }

  if (st.length !== 1) throw new Error("表达式不完整");
  return st[0];
}

function evaluateExpression(expr: string) {
  const tokens = tokenize(expr);
  const rpn = toRpn(tokens);
  return evalRpn(rpn);
}

export default function ExpressionCalculator() {
  const [expr, setExpr] = useState<string>("");

  const { result, error } = useMemo(() => {
    const t = expr.trim();
    if (!t) return { result: "", error: "" };

    try {
      const v = evaluateExpression(t);
      return { result: String(v), error: "" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "表达式错误";
      return { result: "", error: msg };
    }
  }, [expr]);

  const append = (s: string) => setExpr((prev) => prev + s);
  const backspace = () => setExpr((prev) => prev.slice(0, -1));
  const clear = () => setExpr("");

  const calc = () => {
    if (!result) return;
    setExpr(result);
  };

  const buttons: Array<{ label: string; onClick: () => void; className?: string }> = [
    { label: "(", onClick: () => append("(") },
    { label: ")", onClick: () => append(")") },
    { label: "^", onClick: () => append("^") },
    { label: "←", onClick: () => backspace(), className: "text-red-700" },

    { label: "7", onClick: () => append("7") },
    { label: "8", onClick: () => append("8") },
    { label: "9", onClick: () => append("9") },
    { label: "/", onClick: () => append("/") },

    { label: "4", onClick: () => append("4") },
    { label: "5", onClick: () => append("5") },
    { label: "6", onClick: () => append("6") },
    { label: "*", onClick: () => append("*") },

    { label: "1", onClick: () => append("1") },
    { label: "2", onClick: () => append("2") },
    { label: "3", onClick: () => append("3") },
    { label: "-", onClick: () => append("-") },

    { label: "0", onClick: () => append("0") },
    { label: ".", onClick: () => append(".") },
    { label: "C", onClick: () => clear(), className: "text-red-700" },
    { label: "+", onClick: () => append("+") },
  ];

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">表达式计算器</h2>
          <p className="text-sm text-gray-500">支持 + - * / ^ 以及括号，例如： (1+2)^3/2</p>
        </div>
        <button
          type="button"
          onClick={calc}
          disabled={!result || !!error}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          =
        </button>
      </div>

      <div className="rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900 p-4 space-y-3">
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="输入表达式"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="grid grid-cols-4 gap-2">
          {buttons.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.onClick}
              className={`rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 ${
                b.className ?? ""
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-800 dark:text-gray-100">
          {result ? (
            <div>
              结果：<span className="font-mono">{result}</span>
            </div>
          ) : (
            "结果将在这里显示"
          )}
        </div>
      </div>
    </div>
  );
}
