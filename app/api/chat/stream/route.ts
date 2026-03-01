import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatSSEBus, ChatPayload } from "@/lib/chatSSE";

export const runtime = "nodejs";
// SSE 连接不应被缓存
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room");

  if (!room) {
    return new Response("room is required", { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // ---- 1. 发送历史消息（初始加载） ----
      try {
        const history = await prisma.chatMessage.findMany({
          where: { room },
          orderBy: { createdAt: "asc" },
          take: 200,
          select: { id: true, nickname: true, content: true, createdAt: true },
        });

        for (const msg of history) {
          if (closed) return;
          const payload: ChatPayload = {
            id: msg.id,
            nickname: msg.nickname,
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        }

        // 发一个特殊事件表示历史消息加载完毕
        controller.enqueue(encoder.encode(`event: history-done\ndata: {}\n\n`));
      } catch (e) {
        console.error("SSE history error:", e);
      }

      // ---- 2. 订阅新消息实时推送 ----
      const listener = (msg: ChatPayload) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(msg)}\n\n`)
          );
        } catch {
          // 连接已断开
          closed = true;
        }
      };

      chatSSEBus.subscribe(room, listener);

      // ---- 3. 心跳保活，防止连接超时 ----
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 15_000);

      // ---- 4. 客户端断开时清理 ----
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        chatSSEBus.unsubscribe(room, listener);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx 不缓冲
    },
  });
}

