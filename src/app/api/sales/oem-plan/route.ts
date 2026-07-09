import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "");
  if (isNaN(year)) {
    return NextResponse.json({ error: "Năm không hợp lệ" }, { status: 400 });
  }

  try {
    const plan = await prisma.oemSalesYearlyPlan.findUnique({
      where: { year },
    });
    if (!plan) {
      return NextResponse.json({ message: "Không tìm thấy kế hoạch OEM" }, {
        status: 404,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        }
      });
    }
    return NextResponse.json({
      ...plan,
      planRows: plan.planRows ? JSON.parse(plan.planRows) : null,
      staffRows: plan.staffRows ? JSON.parse(plan.staffRows) : null,
      monthlyTargets: plan.monthlyTargets ? JSON.parse(plan.monthlyTargets) : null,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, {
      status: 500,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, createdDate, planRows, staffRows, monthlyTargets, status } = body;

    if (!year) {
      return NextResponse.json({ error: "Thiếu thông tin năm kế hoạch" }, { status: 400 });
    }

    const plan = await prisma.oemSalesYearlyPlan.upsert({
      where: { year: parseInt(year) },
      update: {
        createdDate,
        planRows: planRows ? (typeof planRows === 'string' ? planRows : JSON.stringify(planRows)) : undefined,
        staffRows: staffRows ? (typeof staffRows === 'string' ? staffRows : JSON.stringify(staffRows)) : undefined,
        monthlyTargets: monthlyTargets ? (typeof monthlyTargets === 'string' ? monthlyTargets : JSON.stringify(monthlyTargets)) : undefined,
        status: status || "ban-nhap",
      },
      create: {
        year: parseInt(year),
        createdDate,
        planRows: typeof planRows === 'string' ? planRows : JSON.stringify(planRows || []),
        staffRows: typeof staffRows === 'string' ? staffRows : JSON.stringify(staffRows || []),
        monthlyTargets: typeof monthlyTargets === 'string' ? monthlyTargets : JSON.stringify(monthlyTargets || {}),
        status: status || "ban-nhap",
      },
    });

    return NextResponse.json({
      ...plan,
      planRows: plan.planRows ? JSON.parse(plan.planRows) : null,
      staffRows: plan.staffRows ? JSON.parse(plan.staffRows) : null,
      monthlyTargets: plan.monthlyTargets ? JSON.parse(plan.monthlyTargets) : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
