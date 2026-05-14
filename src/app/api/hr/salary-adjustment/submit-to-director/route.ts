import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { ids } = body; // Array of SalaryAdjustmentRequest IDs

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    // Find Active Directors (by string or by position code)
    const directors = await prisma.employee.findMany({
      where: { 
        status: "active",
        OR: [
          { position: "Giám đốc" },
          { position: "vtr-20260401-8730-eauc" } 
        ]
      },
      select: { userId: true, fullName: true }
    });

    if (directors.length === 0) {
      return NextResponse.json({ error: "Director not found" }, { status: 404 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "HR Manager";

    const results = await Promise.all(ids.map(async (id) => {
      // 1. Check for existing pending approval request to prevent duplicates
      const existingPending = await prisma.approvalRequest.findFirst({
        where: {
          entityType: "SALARY_ADJUSTMENT",
          entityId: id,
          status: "pending"
        }
      });

      if (existingPending) {
        throw new Error(`Hồ sơ ID ${id} đã được trình phê duyệt trước đó và đang chờ xử lý.`);
      }

      // 2. Update status to "WAITING_APPROVAL" (Under Director Review)
      const request = await (prisma as any).salaryAdjustmentRequest.update({
        where: { id },
        data: { status: "WAITING_APPROVAL" },
        include: { employee: true }
      });

      // 2. Create ApprovalRequest for the first director (or all? usually one is enough for tracking)
      // We assign to the first director found, but broadcast notification to all.
      const primaryDirector = directors[0];
      
      await prisma.approvalRequest.create({
        data: {
          entityType: "SALARY_ADJUSTMENT",
          entityId: id,
          entityTitle: `Điều chỉnh thu nhập: ${request.employee?.fullName}`,
          entityCode: request.employee?.code,
          status: "pending",
          priority: "high",
          requestedById: userId,
          requestedByName: userName,
          approverId: null, // Broadcast to all eligible approvers if null, or set to specific
          metadata: JSON.stringify({
            employeeName: request.employee?.fullName,
            adjustmentType: request.adjustmentType,
            proposedBaseSalary: request.proposedBaseSalary
          }),
          comments: {
            create: [
              {
                authorId: userId,
                authorName: userName,
                authorRole: "requester",
                content: `📤 **${userName}** đã trình phê duyệt điều chỉnh thu nhập cho nhân sự **${request.employee?.fullName}**.`,
                isSystem: true
              }
            ]
          }
        }
      });

      return request;
    }));

    console.log(`[SubmitToDirector] Notifying ${directors.length} Directors`);

    // 3. Notify all Directors
    for (const director of directors) {
      if (!director.userId) continue;
      
      await prisma.notification.create({
        data: {
          title: "⚡ Trình phê duyệt điều chỉnh thu nhập",
          content: `## CÓ ${ids.length} HỒ SƠ MỚI\n---\n**${userName}** vừa trình phê duyệt danh sách hồ sơ điều chỉnh thu nhập nhân sự.\n\nVui lòng xem xét và cho ý kiến tại Trung tâm phê duyệt.`,
          type: "warning",
          priority: "high",
          audienceType: "individual",
          audienceValue: director.userId,
          createdById: userId,
          attachments: JSON.stringify([{
             name: "Trung tâm phê duyệt",
             type: "link",
             url: "/board/approvals"
          }]),
          recipients: {
            create: { userId: director.userId }
          }
        }
      });
    }

    console.log(`[SubmitToDirector] ${directors.length} notifications created successfully.`);

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error: any) {
    console.error("[SubmitToDirector] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
