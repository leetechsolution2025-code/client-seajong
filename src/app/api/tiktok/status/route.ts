import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const conn = await prisma.socialConnection.findUnique({ where: { platform: "tiktok" } });
  if (!conn) {
    return NextResponse.json({ connected: false, configured: false });
  }

  const isExpired = conn.expiresAt ? conn.expiresAt < new Date() : false;
  return NextResponse.json({
    connected: !!conn.pageToken,
    configured: !!(conn.appId && conn.appSecret),
    expired: isExpired,
    pageName: conn.pageName,
    appId: conn.appId,
    webhookActive: conn.webhookActive,
    expiresAt: conn.expiresAt,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { appId, appSecret } = body;
  const platform = "tiktok";

  await prisma.socialConnection.upsert({
    where: { platform },
    update: { appId, appSecret },
    create: { platform, appId, appSecret },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  await prisma.socialConnection.deleteMany({ where: { platform: "tiktok" } });
  return NextResponse.json({ success: true });
}
