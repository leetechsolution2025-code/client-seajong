import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // 1. Fetch the request details
    const request = await (prisma as any).salaryAdjustmentRequest.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.status !== "APPROVED" && request.status !== "DECIDED") {
      return NextResponse.json({ error: "Chỉ hồ sơ đã phê duyệt mới có thể cập nhật vào DB" }, { status: 400 });
    }

    const proposedAllowances = request.proposedAllowances ? JSON.parse(request.proposedAllowances) : {};

    // 2. Start Transaction
    await prisma.$transaction(async (tx) => {
      // a. Update Employee Record
      await tx.employee.update({
        where: { id: request.employeeId },
        data: {
          baseSalary: request.proposedBaseSalary,
          mealAllowance: proposedAllowances.meal ? Number(proposedAllowances.meal) : undefined,
          fuelAllowance: proposedAllowances.fuel ? Number(proposedAllowances.fuel) : undefined,
          phoneAllowance: proposedAllowances.phone ? Number(proposedAllowances.phone) : undefined,
          seniorityAllowance: proposedAllowances.seniority ? Number(proposedAllowances.seniority) : undefined,
        }
      });

      // b. Create EmploymentHistory (Quá trình công tác)
      await tx.employmentHistory.create({
        data: {
          employeeId: request.employeeId,
          type: "ADJUSTMENT",
          effectiveDate: request.effectiveDate || new Date(),
          notes: `Điều chỉnh thu nhập: ${request.adjustmentType}. Lý do: ${request.reason}. Lương mới: ${request.proposedBaseSalary?.toLocaleString()}đ`,
        }
      });

      // c. Mark request as COMPLETED
      await (tx as any).salaryAdjustmentRequest.update({
        where: { id },
        data: { status: "COMPLETED" }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST finalize adjustment] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
