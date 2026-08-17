export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || new Date().getMonth() + 1 + "");
    const year = parseInt(searchParams.get("year") || new Date().getFullYear() + "");
    const type = searchParams.get("type"); // "MANAGER" or "STAFF"
    const employeeId = searchParams.get("employeeId");

    let whereClause: any = { month, year };
    if (type) whereClause.type = type;
    if (employeeId) whereClause.employeeId = employeeId;

    let income = await prisma.internalIncomeReport.findFirst({
      where: whereClause
    });

    let actualWorkingDays = 0;
    if (employeeId) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      actualWorkingDays = await prisma.attendance.count({
        where: {
          employeeId,
          date: {
            gte: startDate,
            lt: endDate
          }
        }
      });
    }

    if (!income) {
      // Return 0 values if no income report exists for the month
      return NextResponse.json({
        success: true,
        data: {
          baseSalary: 0,
          performanceBonus: 0,
          allowance: 0,
          salesCommission: 0,
          totalIncome: 0,
          actualWorkingDays
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        baseSalary: income.baseSalary,
        performanceBonus: income.performanceBonus,
        allowance: income.allowance,
        salesCommission: income.salesCommission,
        totalIncome: income.totalIncome,
        actualWorkingDays
      }
    });

  } catch (error: any) {
    console.error("API Error - GET /income:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
