import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.ACCESS_PASSWORD;

    if (!correctPassword) {
      console.error("ACCESS_PASSWORD not set in environment variables");
      return NextResponse.json(
        { message: "Server misconfiguration" },
        { status: 500 }
      );
    }

    if (password === correctPassword) {
      // Valid for 7 days
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const cookieStore = await cookies();
      cookieStore.set("auth_token", "valid_session", {
        expires,
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "密码错误" }, { status: 401 });
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

