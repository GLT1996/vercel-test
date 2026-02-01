import { encrypt } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      // 1. Create the session
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
      const session = await encrypt({
        user: { id: user.id, username: user.username },
        expires,
      });

      // 2. Create the response and set the cookie
      const response = NextResponse.json({ success: true }, { status: 200 });
      response.cookies.set("session", session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      console.log(`User '${username}' logged in successfully.`);
      return response;
    }

    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  } catch (e) {
    const error = e as Error;
    console.error("An error occurred during login:", error.message);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
