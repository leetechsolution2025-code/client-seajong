import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const conn = await prisma.socialConnection.findUnique({ where: { platform: "youtube" } }).catch(() => null);
  const appId = conn?.appId || process.env.YOUTUBE_CLIENT_ID;
  if (!appId) {
    return NextResponse.json({ error: "Chưa cấu hình Client ID" }, { status: 400 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/youtube/callback`;
  const scope = "https://www.googleapis.com/auth/youtube.readonly";

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", "youtube_connect");

  return NextResponse.redirect(url.toString());
}
