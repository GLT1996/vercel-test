import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // 1. 从 query 参数获取 admin key
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  // 2. 验证 key
  if (!key || key !== process.env.CHAT_ADMIN_KEY) {
    return NextResponse.json({ error: "无权限" }, { status: 401 });
  }

  // 3. 聚合查询所有房间
  const rooms = await prisma.chatMessage.groupBy({
    by: ["room"],
    _count: { id: true },
    _max: { createdAt: true },
    orderBy: { room: "asc" },
  });

  // 4. 返回结果
  return NextResponse.json({
    rooms: rooms.map((r) => ({
      room: r.room,
      messageCount: r._count.id,
      lastMessageAt: r._max.createdAt?.toISOString(),
    })),
  });
}