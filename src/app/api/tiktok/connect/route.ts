import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const conn = await prisma.socialConnection.findUnique({ where: { platform: "tiktok" } }).catch(() => null);
  const appId = conn?.appId || process.env.TIKTOK_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "Chưa cấu hình App ID" }, { status: 400 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/tiktok/callback`;
  const url = new URL("https://business-api.tiktok.com/portal/auth");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("state", "tiktok_connect");
  url.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(url.toString());
}
