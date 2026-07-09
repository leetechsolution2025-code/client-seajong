import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
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
    /*
     * Chặn TẤT CẢ các đường dẫn, NGOẠI TRỪ:
     * - api: (để không chặn các webhook, public api)
     * - _next/static, _next/image: (các file build của Next.js)
     * - favicon.ico: (icon web)
     * - login: (trang đăng nhập)
     * - Các định dạng file tĩnh (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
