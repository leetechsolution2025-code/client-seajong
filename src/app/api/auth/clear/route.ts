import { NextResponse } from "next/server";

export async function GET() {
  const res = NextResponse.redirect("http://localhost:3000/login");
  // Xóa tất cả next-auth cookies
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Secure-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
  ];
  for (const name of cookieNames) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
  return res;
}
