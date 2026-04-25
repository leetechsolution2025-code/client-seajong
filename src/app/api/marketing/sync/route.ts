import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncFacebook, syncTiktok, syncGoogle } from "@/lib/marketing-sync";

/**
 * API đồng bộ thủ công hoặc theo Cron
 * Quét toàn bộ social connection và fetch dữ liệu mới nhất
 */
export async function POST(req: NextRequest) {
  try {
    const connections = await prisma.socialConnection.findMany();
    const results: Record<string, any> = {};

    for (const conn of connections) {
      if (!conn.userToken) continue;

      switch (conn.platform) {
        case "facebook":
          results.facebook = await syncFacebook(conn.userToken);
          break;
        case "tiktok":
          results.tiktok = await syncTiktok(conn.userToken);
          break;
        case "youtube":
        case "google":
          results.google = await syncGoogle(conn.userToken);
          break;
        default:
          break;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error: any) {
    console.error("[Marketing Sync All] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
