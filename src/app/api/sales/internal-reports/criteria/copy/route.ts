import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");

    if (!monthStr || !yearStr) {
      return NextResponse.json({ success: false, error: "Missing month or year" }, { status: 400 });
    }

    let month = parseInt(monthStr, 10);
    let year = parseInt(yearStr, 10);

    // Get previous month
    if (month === 1) {
      month = 12;
      year = year - 1;
    } else {
      month = month - 1;
    }

    const criteria = await prisma.internalKpiCriteria.findMany({
      where: { month, year },
      orderBy: { createdAt: "asc" },
    });

    const managerCriteria = criteria.filter((c: any) => c.type === "MANAGER");
    const staffCriteria = criteria.filter((c: any) => c.type === "STAFF");

    return NextResponse.json({
      success: true,
      data: {
        manager: managerCriteria,
        staff: staffCriteria,
      },
    });
  } catch (error: any) {
    console.error("API Error - GET /criteria/copy:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
