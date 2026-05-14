import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const auth_code = searchParams.get("auth_code"); // TikTok uses auth_code instead of code
  const error = searchParams.get("error");

  const dashboardUrl = `${process.env.NEXTAUTH_URL}/marketing/campaigns`;

  if (error || !auth_code) {
    return NextResponse.redirect(`${dashboardUrl}?tt_error=access_denied`);
  }

  const savedConn = await prisma.socialConnection.findUnique({ where: { platform: "tiktok" } });
  const appId = savedConn?.appId || process.env.TIKTOK_APP_ID;
  const appSecret = savedConn?.appSecret || process.env.TIKTOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${dashboardUrl}?tt_error=missing_credentials`);
  }

  try {
    const tokenRes = await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: appId,
        secret: appSecret,
        auth_code: auth_code
      })
    });
    
    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      return NextResponse.redirect(`${dashboardUrl}?tt_error=token_failed`);
    }

    // Lưu vào database
    await prisma.socialConnection.upsert({
      where: { platform: "tiktok" },
      update: {
        userToken: tokenData.data.access_token,
        pageToken: tokenData.data.access_token,
        appId,
        appSecret,
        pageName: "TikTok Account",
      },
      create: {
        platform: "tiktok",
        userToken: tokenData.data.access_token,
        pageToken: tokenData.data.access_token,
        appId,
        appSecret,
        pageName: "TikTok Account",
      },
    });

    return NextResponse.redirect(`${dashboardUrl}?tt_success=1&page_name=TikTok_Account`);
  } catch (err) {
    console.error("[TikTok Callback Error]", err);
    return NextResponse.redirect(`${dashboardUrl}?tt_error=server_error`);
  }
}
