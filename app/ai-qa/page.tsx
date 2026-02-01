"use client";

import { useState } from "react";

export default function AIQAPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [showKb, setShowKb] = useState(false);
  const [chunks, setChunks] = useState<Chunk[]>([]);

  interface Chunk {
    id: string;
    createdAt: string;
    content: string;
    metadata?: object;
  }

  const fetchChunks = async () => {
    try {
      const res = await fetch("/api/ai-qa/chunks");
      if (res.ok) {
        const data = await res.json();
        setChunks(data);
      }
    } catch (error) {
      console.error("Failed to fetch chunks", error);
    }
  };

  const deleteChunk = async (id: string) => {
    if (!confirm("确定要删除这条知识库数据吗？")) return;

    try {
      const res = await fetch(`/api/ai-qa/chunks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setChunks(prev => prev.filter(c => c.id !== id));
      } else {
        alert("删除失败");
      }
    } catch (error) {
      console.error("Failed to delete chunk", error);
      alert("删除出错");
    }
  };

  const toggleKb = () => {
    if (!showKb) {
      fetchChunks();
    }
    setShowKb(!showKb);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    setUploadStatus("正在上传并处理...");

    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await fetch("/api/ai-qa/ingest", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUploadStatus(`成功处理文件: ${data.added} 个`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setUploadStatus(`上传失败: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage = query.trim();
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-qa/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, { role: "user", content: userMessage }] }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `出错啦: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 gap-6">
      <header className="flex flex-col gap-4 p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold mb-2">私有知识库问答</h1>
          <p className="text-zinc-500">
            上传文档（PDF/TXT），让 AI 基于你的知识库回答问题。
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
            <span>{uploading ? "处理中..." : "上传文档"}</span>
            <input
              type="file"
              multiple
              accept=".txt,.md,.pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <button
             onClick={toggleKb}
             className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
          >
             {showKb ? "隐藏知识库" : "查看知识库"}
          </button>

          {uploadStatus && (
            <span className="text-sm text-zinc-500 animate-pulse">
              {uploadStatus}
            </span>
          )}
        </div>
      </header>

      {/* Knowledge Base Viewer */}
      {showKb && (
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col p-4">
          <h2 className="text-xl font-bold mb-4">知识库片段 ({chunks.length})</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
             {chunks.length === 0 ? (
               <p className="text-gray-500">知识库为空，请先上传文档。</p>
             ) : (
               chunks.map((chunk) => (
                 <div key={chunk.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 relative group">
                    <button
                      onClick={() => deleteChunk(chunk.id)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                    <div className="flex justify-between items-start mb-2 pr-8">
                       <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-100">
                         {chunk.id.slice(0, 8)}...
                       </span>
                       <span className="text-xs text-gray-500">
                         {new Date(chunk.createdAt).toLocaleString()}
                       </span>
                    </div>
                    {chunk.metadata && (
                      <div className="mb-2 text-xs text-gray-500">
                        来源: {JSON.stringify(chunk.metadata)}
                      </div>
                    )}
                    <p className="text-sm dark:text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {chunk.content}
                    </p>
                 </div>
               ))
             )}
          </div>
        </div>
      )}

      {!showKb && (
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-400 mt-20">
              👋 上传文档后，开始提问吧！
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-lg text-zinc-500">
                思考中...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入你的问题..."
            className="flex-1 px-4 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </form>
      </div>
      )}
    </div>
  );
}
