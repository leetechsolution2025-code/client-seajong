import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const search = searchParams.get("search") || "";
  const department = searchParams.get("department") || "all";

  try {
    const benefits = await (prisma as any).insuranceBenefit.findMany({
      where: {
        ...(type !== "all" ? { regimeType: type } : {}),
        employee: {
          OR: [
            { fullName: { contains: search } },
            { code: { contains: search } },
          ],
          ...(department !== "all" ? { departmentCode: department } : {}),
        },
      },
      include: {
        employee: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(benefits)));
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch benefits" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const benefit = await (prisma as any).insuranceBenefit.create({
      data: {
        employeeId: data.employeeId,
        regimeType: data.regimeType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        amount: data.amount,
        status: "pending",
        notes: data.notes,
      },
    });
    return NextResponse.json(benefit);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create benefit" }, { status: 500 });
  }
}
