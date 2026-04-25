import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const dashboardUrl = `${process.env.NEXTAUTH_URL}/marketing/campaigns`;

  if (error || !code) {
    return NextResponse.redirect(`${dashboardUrl}?fb_error=access_denied`);
  }

  // Đọc cấu hình từ DB (người dùng đã nhập qua giao diện)
  const savedConn = await prisma.socialConnection.findUnique({ where: { platform: "facebook" } });
  const appId = savedConn?.appId || process.env.FACEBOOK_APP_ID;
  const appSecret = savedConn?.appSecret || process.env.FACEBOOK_APP_SECRET;
  const host = req.headers.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/facebook/callback`;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${dashboardUrl}?fb_error=missing_credentials`);
  }

  try {
    // 1. Đổi code lấy short-lived User Access Token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${dashboardUrl}?fb_error=token_failed`);
    }
    const shortToken = tokenData.access_token;

    // 2. Đổi sang Long-lived User Token (sống 60 ngày)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();
    const longToken = longData.access_token || shortToken;

    // 3. Lấy danh sách Pages & Page Access Token
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}&fields=id,name,access_token`
    );
    const pagesData = await pagesRes.json();
    const pages: Array<{ id: string; name: string; access_token: string }> = pagesData.data || [];

    // Lấy page đầu tiên (hoặc bạn có thể thêm logic chọn page sau)
    const targetPage = pages[0];

    if (!targetPage) {
      return NextResponse.redirect(`${dashboardUrl}?fb_error=no_page_found`);
    }

    // 4. Lưu vào database
    const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || `leetech_verify_${Date.now()}`;
    await prisma.socialConnection.upsert({
      where: { platform: "facebook" },
      update: {
        pageId: targetPage.id,
        pageName: targetPage.name,
        pageToken: targetPage.access_token,
        userToken: longToken,
        appId,
        verifyToken,
        webhookActive: false,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 ngày
      },
      create: {
        platform: "facebook",
        pageId: targetPage.id,
        pageName: targetPage.name,
        pageToken: targetPage.access_token,
        userToken: longToken,
        appId,
        verifyToken,
        webhookActive: false,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Chuyển hướng về Dashboard với thông báo thành công
    return NextResponse.redirect(`${dashboardUrl}?fb_success=1&page_name=${encodeURIComponent(targetPage.name)}`);
  } catch (err) {
    console.error("[Facebook Callback Error]", err);
    return NextResponse.redirect(`${dashboardUrl}?fb_error=server_error`);
  }
}
