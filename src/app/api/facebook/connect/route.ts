import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Đọc từ DB trước, fallback sang env
  const conn = await prisma.socialConnection.findUnique({ where: { platform: "facebook" } }).catch(() => null);
  const appId = conn?.appId || process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "Chưa cấu hình App ID" }, { status: 400 });
  }

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || req.nextUrl.host;
  // Cho phép HTTP với localhost và các IP nội bộ (192.168.x.x, 10.x.x.x, v.v.), còn lại ép dùng HTTPS
  const isLocal = host.includes("localhost") || host.match(/^127\./) || host.match(/^192\.168\./) || host.match(/^10\./) || host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
  const protocol = forwardedProto || (isLocal ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/facebook/callback`;
  const scope = [
    "pages_show_list",
    "pages_read_engagement",
    "ads_read",
    "ads_management",
    "business_management",
  ].join(",");

  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", "facebook_connect");

  return NextResponse.redirect(url.toString());
}
