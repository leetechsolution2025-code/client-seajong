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

    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

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
    console.error("API Error - GET /criteria:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { month, year, applyAllYear, manager, staff } = body;

    if (!month || !year) {
      return NextResponse.json({ success: false, error: "Missing month or year" }, { status: 400 });
    }

    const monthsToApply = applyAllYear ? Array.from({ length: 12 }, (_, i) => i + 1) : [month];

    await prisma.$transaction(async (tx) => {
      for (const m of monthsToApply) {
        // Delete all old criteria for this month
        await tx.internalKpiCriteria.deleteMany({
          where: { month: m, year: year }
        });

        const dataToInsert: any[] = [];

        if (manager && Array.isArray(manager)) {
          manager.forEach((item) => {
            if (item.name) {
              dataToInsert.push({
                month: m,
                year: year,
                name: item.name,
                type: "MANAGER",
                targetValue: Number(item.targetValue) || 0,
                weight: Number(item.weight) || 0,
              });
            }
          });
        }

        if (staff && Array.isArray(staff)) {
          staff.forEach((item) => {
            if (item.name) {
              dataToInsert.push({
                month: m,
                year: year,
                name: item.name,
                type: "STAFF",
                targetValue: Number(item.targetValue) || 0,
                weight: Number(item.weight) || 0,
              });
            }
          });
        }

        if (dataToInsert.length > 0) {
          await tx.internalKpiCriteria.createMany({
            data: dataToInsert
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Configuration updated successfully" });
  } catch (error: any) {
    console.error("API Error - POST /criteria:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
