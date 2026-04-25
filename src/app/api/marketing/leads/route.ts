import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");

    // @ts-ignore - Prisma auto-generation might be lagging in IDE
    const leads = await (prisma as any).marketingLead.findMany({
      where: {
        campaignId: campaignId || undefined,
        status: status || undefined,
      },
      include: {
        campaign: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(leads);
  } catch (error: any) {
    console.error("[Leads API Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Cập nhật status hoặc gán lead
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes } = body;

    // @ts-ignore
    const lead = await (prisma as any).marketingLead.update({
      where: { id },
      data: {
        status: status || undefined,
        notes: notes || undefined
      }
    });

    return NextResponse.json(lead);
  } catch (error: any) {
    console.error("[Leads API PATCH Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
