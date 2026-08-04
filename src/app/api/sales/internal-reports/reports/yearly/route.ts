export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear() + "");
    const type = searchParams.get("type"); // "MANAGER" or "STAFF"
    const employeeId = searchParams.get("employeeId");

    let whereClause: any = { year };
    if (type) whereClause.type = type;
    if (employeeId) whereClause.employeeId = employeeId;

    const reports = await prisma.internalKpiReport.findMany({
      where: whereClause,
      select: {
        month: true,
        totalScore: true
      }
    });

    // Xây dựng mảng 12 tháng (1 -> 12), nếu chưa có dữ liệu thì null
    const yearlyData = Array.from({ length: 12 }, (_, i) => {
      const report = reports.find((r: any) => r.month === i + 1);
      return report ? report.totalScore : null;
    });

    return NextResponse.json({
      success: true,
      data: yearlyData
    });

  } catch (error: any) {
    console.error("API Error - GET /reports/yearly:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
