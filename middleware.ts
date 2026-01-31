import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that require authentication
  if (pathname.startsWith("/ai-qa") || pathname.startsWith("/api/ai-qa")) {
    const authToken = request.cookies.get("auth_token");

    if (!authToken || authToken.value !== "valid_session") {
      // If it's an API call, return 401
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      // Otherwise redirect to login page
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ai-qa/:path*",
    "/api/ai-qa/:path*"
  ],
};

