import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { year, month, pdfUrl, proposalCode, proposerName, proposedAmount, isYearly, isMonthlyPlan } = body;

    let entityType = "marketing_proposal";
    if (isYearly) {
      entityType = "master_yearly_plan";
    } else if (isMonthlyPlan) {
      entityType = "marketing_monthly_plan";
    }

    if (isYearly) {
      if (!year || !pdfUrl || !proposalCode || !proposerName || proposedAmount === undefined) {
        return NextResponse.json({ error: "Thiếu thông tin trình duyệt kế hoạch" }, { status: 400 });
      }
    } else if (isMonthlyPlan) {
      if (!year || !month || !pdfUrl || !proposalCode || !proposerName || proposedAmount === undefined) {
        return NextResponse.json({ error: "Thiếu thông tin trình duyệt kế hoạch tháng" }, { status: 400 });
      }
    } else {
      if (!year || !month || !pdfUrl || !proposalCode || !proposerName || proposedAmount === undefined) {
        return NextResponse.json({ error: "Thiếu thông tin trình duyệt đề xuất" }, { status: 400 });
      }
    }

    // 0. Check if this proposal/plan has already been submitted and is pending
    const existingRequest = await prisma.approvalRequest.findFirst({
      where: {
        entityType,
        entityId: proposalCode,
        status: "pending"
      }
    });

    if (existingRequest) {
      return NextResponse.json({ 
        error: isYearly 
          ? "Kế hoạch năm này đã được gửi trình duyệt trước đó và đang ở trạng thái chờ duyệt."
          : isMonthlyPlan
            ? "Kế hoạch tháng này đã được gửi trình duyệt trước đó và đang ở trạng thái chờ duyệt."
            : "Đề xuất này đã được gửi trình duyệt trước đó và đang ở trạng thái chờ duyệt." 
      }, { status: 400 });
    }

    // 1. Find Accounting managers (Trưởng phòng Tài chính - Kế toán)
    const accountingManagers = await prisma.employee.findMany({
      where: {
        status: "active",
        OR: [
          { departmentCode: "finance" },
          { departmentName: { contains: "Kế toán" } },
          { departmentName: { contains: "Tài chính" } }
        ],
        position: "vtr-20260401-1964-sbmg" // Trưởng phòng
      },
      select: { userId: true }
    });

    // 2. Find Directors (Giám đốc)
    const directors = await prisma.employee.findMany({
      where: {
        status: "active",
        OR: [
          { position: "Giám đốc" },
          { position: "vtr-20260401-8730-eauc" }
        ]
      },
      select: { userId: true }
    });

    const recipientUserIds = Array.from(
      new Set([
        ...accountingManagers.map((m) => m.userId),
        ...directors.map((d) => d.userId)
      ])
    ).filter(Boolean) as string[];

    if (recipientUserIds.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản Trưởng phòng Tài chính - Kế toán hoặc Giám đốc để gửi thông báo." }, { status: 404 });
    }

    // 3. Create Notification
    const title = isYearly
      ? `📄 Kế hoạch Marketing mới cần duyệt - Năm ${year}`
      : isMonthlyPlan
        ? `📄 Kế hoạch Marketing mới cần duyệt - Tháng ${month}/${year}`
        : `📄 Đề xuất chi phí Marketing mới cần duyệt - Tháng ${month}/${year}`;

    const content = isYearly
      ? `Kính gửi Ban giám đốc và Phòng Tài chính - Kế toán,\n\nNhân viên **${proposerName}** đã gửi trình duyệt Kế hoạch Marketing năm ${year}.\n\n- **Số hiệu kế hoạch**: ${proposalCode}\n- **Tổng ngân sách kế hoạch**: ${proposedAmount.toLocaleString("vi-VN")} đồng\n\nVui lòng xem chi tiết trong file PDF đính kèm.`
      : isMonthlyPlan
        ? `Kính gửi Ban giám đốc và Phòng Tài chính - Kế toán,\n\nNhân viên **${proposerName}** đã gửi trình duyệt Kế hoạch Marketing tháng ${month}/${year}.\n\n- **Số hiệu kế hoạch**: ${proposalCode}\n- **Tổng kinh phí dự kiến**: ${proposedAmount.toLocaleString("vi-VN")} đồng\n\nVui lòng xem chi tiết trong file PDF đính kèm.`
        : `Kính gửi Ban giám đốc và Phòng Tài chính - Kế toán,\n\nNhân viên **${proposerName}** đã gửi trình duyệt đề xuất chi phí hoạt động Marketing tháng ${month}/${year}.\n\n- **Số hiệu đề xuất**: ${proposalCode}\n- **Tổng kinh phí đề xuất**: ${proposedAmount.toLocaleString("vi-VN")} đồng\n\nVui lòng xem chi tiết trong file PDF đính kèm.`;

    const attachments = [
      {
        name: isYearly
          ? `Ke_hoach_MKT_nam_${year}.pdf`
          : isMonthlyPlan
            ? `Ke_hoach_MKT_thang_${month}_${year}.pdf`
            : `De_xuat_chi_phi_MKT_${proposalCode}.pdf`,
        url: pdfUrl,
        type: "application/pdf"
      }
    ];

    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        type: "document",
        priority: "high",
        audienceType: "group",
        audienceValue: JSON.stringify(recipientUserIds),
        attachments: JSON.stringify(attachments),
        createdById: session.user.id
      }
    });

    // 4. Create NotificationRecipients
    await Promise.allSettled(
      recipientUserIds.map((uid) =>
        prisma.notificationRecipient.upsert({
          where: { notificationId_userId: { notificationId: notification.id, userId: uid } },
          update: {},
          create: { notificationId: notification.id, userId: uid }
        })
      )
    );

    // 5. Create ApprovalRequest record so it shows up in the Finance Dashboard request center
    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        entityType,
        entityId:        proposalCode,
        entityCode:      proposalCode,
        entityTitle:     isYearly
          ? `Phê duyệt Kế hoạch Marketing tổng thể và ngân sách năm ${year}`
          : isMonthlyPlan
            ? `Phê duyệt Kế hoạch Marketing tháng ${month}/${year}`
            : `Phê duyệt Đề xuất chi phí hoạt động Marketing tháng ${month}/${year}`,
        status:          "pending",
        priority:        "high",
        department:      "Marketing",
        metadata:        JSON.stringify(isYearly ? { year, pdfUrl } : { year, month, pdfUrl, isMonthlyPlan }),
        requestedById:   session.user.id,
        requestedByName: proposerName,
        approverId:      null // Broadcast to department managers / Director
      }
    });

    return NextResponse.json({ 
      success: true, 
      notificationId: notification.id, 
      recipientsCount: recipientUserIds.length,
      approvalRequestId: approvalRequest.id 
    });
  } catch (err: any) {
    console.error("[POST /api/plan-finance/master-plan/submit-approval] Error:", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
