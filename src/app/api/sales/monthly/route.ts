import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "");
  const month = parseInt(searchParams.get("month") || "");
  if (isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: "Năm hoặc tháng không hợp lệ" }, { status: 400 });
  }

  try {
    const plan = await prisma.salesMonthlyPlan.findUnique({
      where: {
        year_month: { year, month }
      },
    });
    if (!plan) {
      return NextResponse.json({ message: "Không tìm thấy kế hoạch" }, { status: 404 });
    }
    return NextResponse.json({
      ...plan,
      planRows: JSON.parse(plan.planRows),
      staffRows: JSON.parse(plan.staffRows),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, month, createdDate, planRows, staffRows, status } = body;

    if (!year || !month) {
      return NextResponse.json({ error: "Thiếu thông tin năm hoặc tháng kế hoạch" }, { status: 400 });
    }

    const plan = await prisma.salesMonthlyPlan.upsert({
      where: {
        year_month: { year: parseInt(year), month: parseInt(month) }
      },
      update: {
        createdDate,
        planRows: JSON.stringify(planRows),
        staffRows: JSON.stringify(staffRows),
        status: status || "ban-nhap",
      },
      create: {
        year: parseInt(year),
        month: parseInt(month),
        createdDate,
        planRows: JSON.stringify(planRows),
        staffRows: JSON.stringify(staffRows),
        status: status || "ban-nhap",
      },
    });

    return NextResponse.json({
      ...plan,
      planRows: JSON.parse(plan.planRows),
      staffRows: JSON.parse(plan.staffRows),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
