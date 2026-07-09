import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year");
    if (!yearStr) return NextResponse.json({ error: "Thiếu năm" }, { status: 400 });

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) return NextResponse.json({ error: "Năm không hợp lệ" }, { status: 400 });

    const plan = await prisma.oemMasterYearlyPlan.findUnique({
      where: { year }
    });

    return NextResponse.json({ success: true, plan }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (e: unknown) {
    console.error("[GET /api/plan-finance/oem-master-plan]", e);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { year, planData, status = "draft" } = body;

    if (!year || typeof year !== "number") {
      return NextResponse.json({ error: "Thiếu năm hoặc năm không hợp lệ" }, { status: 400 });
    }

    if (!planData || typeof planData !== "string") {
      return NextResponse.json({ error: "Thiếu dữ liệu kế hoạch" }, { status: 400 });
    }

    const plan = await prisma.oemMasterYearlyPlan.upsert({
      where: { year },
      update: {
        planData,
        status,
        updatedAt: new Date()
      },
      create: {
        year,
        planData,
        status
      }
    });

    return NextResponse.json({ success: true, plan });
  } catch (e: unknown) {
    console.error("[POST /api/plan-finance/oem-master-plan]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
