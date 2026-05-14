import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { employeeId, month, year } = await req.json();

    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const existing = await (prisma as any).payrollConfirmation.findUnique({
      where: {
        employeeId_month_year: { employeeId, month, year }
      }
    });

    if (existing) {
      return NextResponse.json({ success: true, message: "Already confirmed" });
    }

    const conf = await (prisma as any).payrollConfirmation.create({
      data: { employeeId, month, year }
    });

    return NextResponse.json({ success: true, confirmation: conf });
  } catch (error: any) {
    console.error("Payroll confirm error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
