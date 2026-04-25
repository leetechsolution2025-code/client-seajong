import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const conn = await prisma.socialConnection.findUnique({ where: { platform: "instagram" } });
  const fbConn = await prisma.socialConnection.findUnique({ where: { platform: "facebook" } });

  const connected = conn ? !!conn.pageToken : false;
  const appId = conn?.appId || fbConn?.appId;
  const configured = !!appId && (!!conn?.appSecret || !!fbConn?.appSecret);

  const isExpired = conn?.expiresAt ? conn.expiresAt < new Date() : false;
  
  return NextResponse.json({
    connected,
    configured,
    expired: isExpired,
    pageName: conn?.pageName,
    appId,
    webhookActive: conn?.webhookActive,
    expiresAt: conn?.expiresAt,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { appId, appSecret } = body;
  const platform = "instagram";

  await prisma.socialConnection.upsert({
    where: { platform },
    update: { appId, appSecret },
    create: { platform, appId, appSecret },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  await prisma.socialConnection.deleteMany({ where: { platform: "instagram" } });
  return NextResponse.json({ success: true });
}
