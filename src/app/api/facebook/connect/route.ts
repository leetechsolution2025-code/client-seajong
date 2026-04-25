import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Đọc từ DB trước, fallback sang env
  const conn = await prisma.socialConnection.findUnique({ where: { platform: "facebook" } }).catch(() => null);
  const appId = conn?.appId || process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "Chưa cấu hình App ID" }, { status: 400 });
  }

  // Tự động nhận diện domain từ Request header để hỗ trợ deploy cho nhiều khách hàng khác nhau
  const host = req.headers.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
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
