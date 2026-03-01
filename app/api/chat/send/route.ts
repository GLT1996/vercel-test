import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatSSEBus } from "@/lib/chatSSE";

export async function POST(req: NextRequest) {
  try {
    const { room, nickname, content } = await req.json();

    if (!room || typeof room !== "string" || room.trim().length === 0) {
      return NextResponse.json({ error: "room 不能为空" }, { status: 400 });
    }
    if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) {
      return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "消息内容不能超过 2000 字符" }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        room: room.trim(),
        nickname: nickname.trim(),
        content: content.trim(),
      },
    });

    // 通知同房间所有 SSE 订阅者
    chatSSEBus.notify(room.trim(), {
      id: message.id,
      nickname: message.nickname,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    });

    return NextResponse.json({ ok: true, message });
  } catch (e) {
    console.error("chat send error:", e);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}

