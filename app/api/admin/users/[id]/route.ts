import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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
    
    if (session.user.id === id) {
        return NextResponse.json({ message: "Admin cannot delete itself" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    console.log(`Admin ${session.user.username} deleted user with id: ${id}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
