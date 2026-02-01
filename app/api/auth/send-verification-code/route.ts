import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { randomInt } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Generate a 6-digit verification code
    const token = randomInt(100000, 999999).toString();
    const expires = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 minutes

    // Store the token in the database
    // We use upsert to handle cases where the user requests a code multiple times
    await prisma.verificationToken.upsert({
      where: { email },
      update: { token, expires },
      create: { email, token, expires },
    });

    // Send the email
    await sendMail({
      to: email,
      subject: "您的验证码",
      text: `您的验证码是: ${token}`,
      html: `<p>您的验证码是: <strong>${token}</strong></p>`,
    });

    return NextResponse.json({ message: "Verification code sent." });
  } catch (error) {
    console.error("Error sending verification code:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ message: "Failed to send verification code", error: errorMessage }, { status: 500 });
  }
}
