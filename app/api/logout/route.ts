import { NextResponse } from "next/server";

export async function POST() {
  // Create a response
  const response = NextResponse.json({ success: true }, { status: 200 });

  // Set the cookie with an expiration date in the past to delete it
  response.cookies.set("session", "", {
    expires: new Date(0),
    path: "/",
  });

  console.log("User logged out.");
  return response;
}
