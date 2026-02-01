import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  //Hacky way to get session from cookie
  const sessionCookie = cookie.split(';').find(c => c.trim().startsWith('session='));
  if (!sessionCookie) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const sessionValue = sessionCookie.split('=')[1];

  try {
    const session = await decrypt(sessionValue);
    if (session?.user?.username !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });
    console.log("Admin fetched users:", users);
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
