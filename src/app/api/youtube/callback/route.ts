import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const dashboardUrl = `${process.env.NEXTAUTH_URL}/marketing/campaigns`;

  if (error || !code) {
    return NextResponse.redirect(`${dashboardUrl}?yt_error=access_denied`);
  }

  const savedConn = await prisma.socialConnection.findUnique({ where: { platform: "youtube" } });
  const appId = savedConn?.appId || process.env.YOUTUBE_CLIENT_ID;
  const appSecret = savedConn?.appSecret || process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/youtube/callback`;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${dashboardUrl}?yt_error=missing_credentials`);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${dashboardUrl}?yt_error=token_failed`);
    }

    // Lấy thông tin user
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    // Lưu vào database
    await prisma.socialConnection.upsert({
      where: { platform: "youtube" },
      update: {
        pageToken: tokenData.refresh_token || savedConn?.pageToken,
        userToken: tokenData.access_token,
        appId,
        appSecret,
        pageName: userData.email || "Google Account",
        expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
      },
      create: {
        platform: "youtube",
        pageToken: tokenData.refresh_token || null,
        userToken: tokenData.access_token,
        appId,
        appSecret,
        pageName: userData.email || "Google Account",
        expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
      },
    });

    return NextResponse.redirect(`${dashboardUrl}?yt_success=1&page_name=${encodeURIComponent(userData.email || "Google Account")}`);
  } catch (err) {
    console.error("[Youtube Callback Error]", err);
    return NextResponse.redirect(`${dashboardUrl}?yt_error=server_error`);
  }
}
