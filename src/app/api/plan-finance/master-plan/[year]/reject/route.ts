import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ year: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { year } = await params;
    const yearInt = parseInt(year);

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const isFinanceManager = employee.position === "vtr-20260401-1964-sbmg" && 
      (employee.departmentCode === "finance" || employee.departmentName?.includes("Kế toán") || employee.departmentName?.includes("Tài chính"));
    const isDirector = employee.position === "Giám đốc" || employee.position === "vtr-20260401-8730-eauc";

    if (!isFinanceManager && !isDirector) {
      return NextResponse.json({ error: "Không có quyền từ chối" }, { status: 403 });
    }

    const plan = await prisma.masterYearlyPlan.findUnique({ where: { year: yearInt } });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = {
      status: "rejected"
    };

    if (isFinanceManager) {
      updateData.financeApprovalStatus = "rejected";
    }
    if (isDirector) {
      updateData.directorApprovalStatus = "rejected";
    }

    const updatedPlan = await prisma.masterYearlyPlan.update({
      where: { year: yearInt },
      data: updateData
    });

    await prisma.approvalRequest.updateMany({
      where: { entityType: "master_yearly_plan", status: "pending" },
      data: { status: "rejected", rejectedReason: "Bị từ chối bởi người phê duyệt" }
    });

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
