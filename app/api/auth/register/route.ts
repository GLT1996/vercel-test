import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, verificationCode } = await request.json();

    if (!username || !email || !password || !verificationCode) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { email },
    });

    if (!verificationToken || verificationToken.token !== verificationCode) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    }

    // Check if the token has expired
    if (new Date() > verificationToken.expires) {
      return NextResponse.json({ message: "Verification code has expired" }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });

    // Delete the verification token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return NextResponse.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during registration:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    // Check for unique constraint violation
    if (errorMessage.includes("Unique constraint failed")) {
      return NextResponse.json({ message: "Username or email already exists" }, { status: 409 });
    }
    return NextResponse.json({ message: "Failed to register user", error: errorMessage }, { status: 500 });
  }
}
