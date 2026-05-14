import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyHRManager } from "@/lib/hr-notifications";

export async function GET() {
  try {
    const [data, departments, positions] = await Promise.all([
      (prisma as any).salaryAdjustmentRequest.findMany({
        include: {
          employee: {
            select: { fullName: true, code: true, avatarUrl: true, departmentName: true, position: true, departmentCode: true }
          },
          requester: {
            select: { fullName: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.departmentCategory.findMany({ select: { code: true, nameVi: true } }),
      prisma.category.findMany({ where: { type: "position" }, select: { code: true, name: true } })
    ]);

    const deptMap = Object.fromEntries(departments.map(d => [d.code, d.nameVi]));
    const posMap = Object.fromEntries(positions.map(p => [p.code, p.name]));

    const result = data.map((item: any) => ({
      ...item,
      employee: {
        ...item.employee,
        departmentName: deptMap[item.employee?.departmentCode] || item.employee?.departmentName || "N/A",
        positionName: posMap[item.employee?.position] || item.employee?.position || "N/A"
      }
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET salary-adjustment error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { employee: true }
    });

    const body = await req.json();
    const { employeeId, adjustmentType, currentBaseSalary, proposedBaseSalary,
      currentAllowances, proposedAllowances, reason, effectiveDate, requesterId } = body;

    const created = await (prisma as any).salaryAdjustmentRequest.create({
      data: {
        employeeId,
        adjustmentType,
        currentBaseSalary: currentBaseSalary ? Number(currentBaseSalary) : null,
        proposedBaseSalary: proposedBaseSalary ? Number(proposedBaseSalary) : null,
        currentAllowances: currentAllowances ? JSON.stringify(currentAllowances) : null,
        proposedAllowances: proposedAllowances ? JSON.stringify(proposedAllowances) : null,
        reason,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        requesterId: requesterId || user?.employee?.id || null,
        status: "PENDING"
      }
    });

    // Notify HR Manager with detail link
    const requesterName = session.user.name || user?.employee?.fullName || "Hệ thống";
    const senderId = (session.user as any).id; 
    const typeLabel = adjustmentType === "INCREASE" ? "tăng lương" : adjustmentType === "DECREASE" ? "giảm lương" : "tái cơ cấu thu nhập";

    const emp = await (prisma as any).employee.findUnique({
      where: { id: employeeId },
      select: { fullName: true }
    });

    const attachments = JSON.stringify([
      {
        name: "Chi tiết",
        type: "link",
        url: `/hr/salary-adjustments?id=${created.id}`
      }
    ]);

    await notifyHRManager(
      `Yêu cầu điều chỉnh thu nhập mới`,
      `**${requesterName}** vừa gửi yêu cầu **${typeLabel}** cho nhân sự **${emp?.fullName || "N/A"}**.\n\nVui lòng xem xét và xử lý yêu cầu này.`,
      senderId,
      attachments
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST salary-adjustment error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
