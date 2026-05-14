import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const dashboardUrl = `${process.env.NEXTAUTH_URL}/marketing/campaigns`;

  if (error || !code) {
    return NextResponse.redirect(`${dashboardUrl}?ig_error=access_denied`);
  }

  let savedConn = await prisma.socialConnection.findUnique({ where: { platform: "instagram" } });
  if (!savedConn || !savedConn.appId || !savedConn.appSecret) {
    savedConn = await prisma.socialConnection.findUnique({ where: { platform: "facebook" } });
  }
  
  const appId = savedConn?.appId || process.env.INSTAGRAM_APP_ID;
  const appSecret = savedConn?.appSecret || process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${dashboardUrl}?ig_error=missing_credentials`);
  }

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${dashboardUrl}?ig_error=token_failed`);
    }
    const shortToken = tokenData.access_token;

    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();
    const longToken = longData.access_token || shortToken;

    // Phỏng đoán lấy một page bất kỳ (tương tự FB) hoặc sau này yêu cầu chọn tài sản
    await prisma.socialConnection.upsert({
      where: { platform: "instagram" },
      update: {
        pageToken: longToken, // Dùng tạm cho IG
        userToken: longToken,
        appId,
        pageName: "Instagram Account",
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 ngày
      },
      create: {
        platform: "instagram",
        pageToken: longToken,
        userToken: longToken,
        appId,
        appSecret,
        pageName: "Instagram Account",
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.redirect(`${dashboardUrl}?ig_success=1&page_name=Instagram_Account`);
  } catch (err) {
    console.error("[Instagram Callback Error]", err);
    return NextResponse.redirect(`${dashboardUrl}?ig_error=server_error`);
  }
}
