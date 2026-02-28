import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room");
    const after = searchParams.get("after"); // ISO timestamp cursor

    if (!room) {
      return NextResponse.json({ error: "room 不能为空" }, { status: 400 });
    }

    const where: Record<string, unknown> = { room };

    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        nickname: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (e) {
    console.error("chat messages error:", e);
    return NextResponse.json({ error: "获取消息失败" }, { status: 500 });
  }
}

