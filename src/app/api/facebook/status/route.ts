import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Lấy trạng thái + check config
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") || "facebook";

  const conn = await prisma.socialConnection.findUnique({ where: { platform } });
  if (!conn) {
    return NextResponse.json({ connected: false, configured: false });
  }

  const isExpired = conn.expiresAt ? conn.expiresAt < new Date() : false;
  return NextResponse.json({
    connected: !!conn.pageToken,
    configured: !!(conn.appId && conn.appSecret),
    expired: isExpired,
    pageId: conn.pageId,
    pageName: conn.pageName,
    appId: conn.appId,
    webhookActive: conn.webhookActive,
    expiresAt: conn.expiresAt,
  });
}

// PATCH - Lưu App ID + App Secret từ giao diện
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { platform = "facebook", appId, appSecret, verifyToken } = body;

  await prisma.socialConnection.upsert({
    where: { platform },
    update: { appId, appSecret, verifyToken: verifyToken || `leetech_verify_${Date.now()}` },
    create: { platform, appId, appSecret, verifyToken: verifyToken || `leetech_verify_${Date.now()}` },
  });

  return NextResponse.json({ success: true });
}

// DELETE - Ngắt kết nối
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") || "facebook";

  await prisma.socialConnection.deleteMany({ where: { platform } });
  return NextResponse.json({ success: true });
}
