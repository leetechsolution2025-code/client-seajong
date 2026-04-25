import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const pathname = req.nextUrl.pathname;

    // /company: chỉ ADMIN được vào
    if (pathname.startsWith("/company")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/company/:path*",
    "/my/:path*",
    "/finance/:path*",
    "/admin_ops/:path*",
    "/board/:path*",
    "/sales/:path*",
    "/marketing/:path*",
    "/logistics/:path*",
    "/purchase/:path*",
    "/production/:path*",
    "/qa/:path*",
  ],
};
