import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const updateData: any = { ...body };
    
    if (updateData.effectiveDate) updateData.effectiveDate = new Date(updateData.effectiveDate);
    if (updateData.currentBaseSalary !== undefined) updateData.currentBaseSalary = Number(updateData.currentBaseSalary);
    if (updateData.proposedBaseSalary !== undefined) updateData.proposedBaseSalary = Number(updateData.proposedBaseSalary);
    if (updateData.currentAllowances && typeof updateData.currentAllowances === "object") updateData.currentAllowances = JSON.stringify(updateData.currentAllowances);
    if (updateData.proposedAllowances && typeof updateData.proposedAllowances === "object") updateData.proposedAllowances = JSON.stringify(updateData.proposedAllowances);

    // Get old data to know requester and employee
    const old = await (prisma as any).salaryAdjustmentRequest.findUnique({
      where: { id },
      include: { 
        employee: { select: { fullName: true } },
        requester: { include: { user: { select: { id: true } } } }
      }
    });

    const updated = await (prisma as any).salaryAdjustmentRequest.update({ 
      where: { id }, 
      data: updateData 
    });

    // Notify requester if status changed
    if (updateData.status && updateData.status !== old.status) {
      const requesterUserId = old.requester?.user?.id;
      if (requesterUserId) {
        let title = "";
        let content = "";
        let type = "info";

        if (updateData.status === "REJECTED") {
          title = "Yêu cầu điều chỉnh lương bị từ chối";
          content = `Yêu cầu điều chỉnh lương cho nhân sự **${old.employee?.fullName}** đã bị từ chối bởi HR Manager.`;
          type = "error";
        } else if (updateData.status === "SUBMITTED") {
          title = "Yêu cầu điều chỉnh lương đã được xử lý";
          content = `Yêu cầu điều chỉnh lương cho nhân sự **${old.employee?.fullName}** đã được xử lý và chuyển sang bước 2 (Xét duyệt).`;
          type = "success";
        }

        if (title) {
          await prisma.notification.create({
            data: {
              title,
              content,
              type,
              priority: "high",
              audienceType: "individual",
              audienceValue: requesterUserId,
              createdById: (session.user as any).id,
              attachments: JSON.stringify([{
                name: "Xem chi tiết",
                type: "link",
                url: `/my/hr-requests?id=${id}`
              }]),
              recipients: {
                create: {
                  userId: requesterUserId
                }
              }
            }
          });
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH salary-adjustment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await (prisma as any).salaryAdjustmentRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
