"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/ai-qa");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Login failed");
      }
    } catch {
      setError("An error occurred");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="w-full max-w-md p-8 bg-white dark:bg-[#111] rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-6 text-center text-zinc-900 dark:text-zinc-100">
          访问受限
        </h1>
        <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
          请输入访问密码以进入 AI 问答系统
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-black text-white dark:bg-white dark:text-black rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}

