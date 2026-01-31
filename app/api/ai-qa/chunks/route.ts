import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const chunks = await prisma.documentChunk.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        metadata: true,
        createdAt: true,
        // We don't select 'embedding' to save bandwidth
      }
    });
    return NextResponse.json(chunks);
  } catch (error) {
    console.error("Fetch chunks error:", error);
    return NextResponse.json({ error: "Failed to fetch chunks" }, { status: 500 });
  }
}

