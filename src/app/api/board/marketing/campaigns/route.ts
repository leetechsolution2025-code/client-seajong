import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const [campaigns, insights, contracts, categories] = await Promise.all([
      prisma.marketingCampaign.findMany(),
      prisma.marketingInsight.findMany(),
      prisma.contract.findMany({
        select: {
          giaTriHopDong: true,
          ngayKy: true,
          createdAt: true
        }
      }),
      prisma.category.findMany({
        where: { type: "nen_tang" }
      })
    ]);

    return NextResponse.json({
      success: true,
      campaigns,
      insights,
      contracts,
      categories
    });
  } catch (err) {
    console.error("[marketing-campaigns] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
