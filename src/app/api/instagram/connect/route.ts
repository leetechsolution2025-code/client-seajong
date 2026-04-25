import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  let conn = await prisma.socialConnection.findUnique({ where: { platform: "instagram" } }).catch(() => null);
  if (!conn || !conn.appId) {
    conn = await prisma.socialConnection.findUnique({ where: { platform: "facebook" } }).catch(() => null);
  }
  
  const appId = conn?.appId || process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "Chưa cấu hình App ID" }, { status: 400 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;
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
  url.searchParams.set("state", "instagram_connect");

  return NextResponse.redirect(url.toString());
}
