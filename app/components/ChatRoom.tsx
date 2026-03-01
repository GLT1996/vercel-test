"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMsg {
  id: string;
  nickname: string;
  content: string;
  createdAt: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function ChatRoom() {
  // --- join state ---
  const [token, setToken] = useState("");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState("");

  // --- chat state ---
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // --- join ---
  const handleJoin = () => {
    if (!token.trim()) {
      setJoinError("请输入房间 Token");
      return;
    }
    if (!nickname.trim()) {
      setJoinError("请输入昵称");
      return;
    }
    setJoinError("");
    setJoined(true);
  };

  // --- SSE connection ---
  useEffect(() => {
    if (!joined) return;

    const room = token.trim();
    const url = `/api/chat/stream?room=${encodeURIComponent(room)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    const seenIds = new Set<string>();

    es.onopen = () => {
      setConnected(true);
    };

    // 默认 "message" 事件 => 新消息
    es.onmessage = (event) => {
      try {
        const msg: ChatMsg = JSON.parse(event.data);
        if (seenIds.has(msg.id)) return; // 去重
        seenIds.add(msg.id);
        setMessages((prev) => [...prev, msg]);
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource 会自动重连，无需手动处理
    };

    // 收到 history-done 事件（可选用途，这里仅做标记）
    es.addEventListener("history-done", () => {
      // 历史消息已全部加载完毕
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [joined, token]);

  // --- auto scroll ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- send message ---
  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: token.trim(),
          nickname: nickname.trim(),
          content: text,
        }),
      });
      if (res.ok) {
        setInput("");
        // 新消息会通过 SSE 自动推送过来，无需手动 fetch
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- leave ---
  const handleLeave = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setJoined(false);
    setMessages([]);
    setConnected(false);
  };

  // ======================== JOIN SCREEN ========================
  if (!joined) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">聊天室</h1>
          <p className="text-sm text-gray-500">输入相同 Token 即可进入同一房间实时聊天</p>
        </div>

        <div className="rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900 p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">房间 Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="输入房间 Token（任意字符串）"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-500">相同 Token 的用户会进入同一个聊天室</div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">昵称</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
          </div>

          {joinError && <div className="text-sm text-red-600">{joinError}</div>}

          <button
            type="button"
            onClick={handleJoin}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            进入聊天室
          </button>
        </div>
      </div>
    );
  }

  // ======================== CHAT SCREEN ========================
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      {/* header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/20">
        <div>
          <h1 className="text-xl font-semibold">
            聊天室{" "}
            <span className="text-sm font-normal text-gray-500">
              Token: {token.trim()}
            </span>
          </h1>
          <p className="text-xs text-gray-500">
            昵称：{nickname.trim()}
            {connected ? (
              <span className="ml-2 text-green-500">● SSE 已连接</span>
            ) : (
              <span className="ml-2 text-red-500">● 连接中…</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          className="rounded border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
        >
          退出
        </button>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-10">
            暂无消息，发送第一条消息吧 👋
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.nickname === nickname.trim();
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  isMe
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
                }`}
              >
                {!isMe && (
                  <div className="text-xs font-medium mb-1 text-blue-600 dark:text-blue-400">
                    {msg.nickname}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                <div
                  className={`text-[10px] mt-1 ${
                    isMe ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="border-t border-black/10 dark:border-white/20 pt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，按 Enter 发送…"
          disabled={sending}
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          发送
        </button>
      </div>
    </div>
  );
}

