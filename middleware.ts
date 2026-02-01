import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

// 1. Specify protected and public routes
const protectedRoutes = ["/ai-qa"];
const publicRoutes = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 2. Check if the route is protected
  const isProtectedRoute =
    protectedRoutes.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.startsWith("/api/ai-qa");

  if (isProtectedRoute) {
    // 3. Get the session cookie
    const cookie = request.cookies.get("session");

    // 4. Redirect to login if cookie is missing
    if (!cookie?.value) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      const absoluteURL = new URL("/login", request.nextUrl.origin);
      absoluteURL.searchParams.set("from", pathname);
      return NextResponse.redirect(absoluteURL.toString());
    }

    // 5. Verify the session
    try {
      const session = await decrypt(cookie.value);
      if (!session?.user) {
        throw new Error("Invalid session");
      }
      // 6. If session is valid, continue
      return NextResponse.next();
    } catch (err) {
      // 7. If session is invalid, delete the cookie and redirect to login
      console.log("Invalid session, redirecting to login.");
      const response = NextResponse.redirect(new URL("/login", request.nextUrl.origin));
      response.cookies.delete("session");
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

