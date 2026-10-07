import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET /api/approvals/[id]/comments ──────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Tìm approvalRequest theo id hoặc entityId (mã YC-...)
    const appReq = await prisma.approvalRequest.findFirst({
      where: {
        OR: [{ id }, { entityId: id }, { entityCode: id }],
      },
    });

    if (!appReq) {
      return NextResponse.json({ success: true, data: [], approvalRequestId: null });
    }

    const comments = await prisma.approvalComment.findMany({
      where: { requestId: appReq.id, parentId: null },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: comments, approvalRequestId: appReq.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── POST /api/approvals/[id]/comments ─────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { content, parentId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Nội dung không được để trống" }, { status: 400 });
    }

    // Tìm approvalRequest theo id hoặc entityId (mã YC-...)
    let request = await prisma.approvalRequest.findFirst({
      where: {
        OR: [{ id }, { entityId: id }, { entityCode: id }],
      },
    });

    // Nếu chưa có ApprovalRequest (đơn chưa trình sếp), tự động tạo bản ghi để lưu luồng trao đổi
    if (!request) {
      const pReq = await prisma.personalRequest.findFirst({
        where: { id },
        include: { employee: true },
      });
      if (pReq) {
        request = await prisma.approvalRequest.create({
          data: {
            entityType: "PERSONAL_REQUEST",
            entityId: pReq.id,
            entityCode: pReq.id,
            entityTitle: `Đề xuất: ${pReq.type} - ${pReq.employee?.fullName || "Nhân viên"}`,
            status: pReq.status || "pending",
            requestedById: pReq.employee?.userId || session.user.id as string,
            requestedByName: pReq.employee?.fullName || session.user.name || "Nhân viên",
            department: pReq.employee?.departmentName || "Phòng ban",
          },
        });
      }
    }

    if (!request) return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });

    const userId   = session.user.id as string;
    const userName = session.user.name || session.user.email || "Người dùng";
    const userRole = (session.user as any).role || "";
    const userDept = ((session.user as any).departmentCode || "").toUpperCase();
    const userDeptName = ((session.user as any).departmentName || "").toLowerCase();
    const userPos  = ((session.user as any).position || (session.user as any).positionName || "").toLowerCase();

    // Xác định role chuẩn xác
    let authorRole = "observer";
    if (
      userRole === "admin" ||
      userDept === "BGD" ||
      userDept === "BOD" ||
      userPos.includes("giám đốc") ||
      request.approverId === userId ||
      request.approvedById === userId
    ) {
      authorRole = "director";
    } else if (
      userDept === "HR" ||
      userDept === "HCNS" ||
      userDeptName.includes("nhân sự") ||
      userPos.includes("nhân sự") ||
      request.requestedByName.includes("Nhân sự")
    ) {
      authorRole = "hr";
    } else if (request.requestedById === userId) {
      authorRole = "requester";
    }

    const comment = await prisma.approvalComment.create({
      data: {
        requestId:  request.id,
        authorId:   userId,
        authorName: userName as string,
        authorRole,
        content:    content.trim(),
        parentId:   parentId || null,
        isSystem:   false,
      },
    });

    // ── Khi có trao đổi mới từ Giám đốc ──
    if (authorRole === "director") {
      try {
        const pReq = await prisma.personalRequest.findFirst({
          where: {
            OR: [{ id: request.entityId }, { id }],
          },
        });
        if (pReq) {
          let curDetails: any = {};
          try {
            curDetails = typeof pReq.details === "string" ? JSON.parse(pReq.details) : (pReq.details || {});
          } catch {}
          curDetails.hasDirectorFeedback = true;
          curDetails.latestDirectorFeedback = content.trim();
          curDetails.directorFeedbackAt = new Date().toISOString();
          await prisma.personalRequest.update({
            where: { id: pReq.id },
            data: { details: JSON.stringify(curDetails) },
          });
        }
      } catch (err) {
        console.error("Lỗi cập nhật directorFeedback vào PersonalRequest:", err);
      }

      // Theo yêu cầu: Khi có trao đổi mới từ giám đốc, không cần gửi thông báo lên quả chuông nữa
      return NextResponse.json({ success: true, data: comment }, { status: 201 });
    }

    // ── Gửi thông báo tự động cho các bên liên quan ──
    try {
      const recipientIds = new Set<string>();

      // 1. Tìm Người tạo yêu cầu gốc (Requester / Nhân viên)
      let requesterUserId: string | null = null;
      if (
        request.entityType === "PERSONAL_REQUEST" ||
        request.entityType === "SALARY_ADVANCE" ||
        request.entityId?.startsWith("YC-")
      ) {
        const pReq = await prisma.personalRequest.findUnique({
          where: { id: request.entityId },
          include: { employee: true },
        });
        if (pReq?.employee?.userId) {
          requesterUserId = pReq.employee.userId;
        }
      }

      if (!requesterUserId && request.requestedById) {
        requesterUserId = request.requestedById;
      }

      if (requesterUserId && requesterUserId !== userId) {
        recipientIds.add(requesterUserId);
      }

      // 2. Tìm Trưởng phòng Nhân sự (HR Manager)
      const isHrRelated =
        request.entityType === "PERSONAL_REQUEST" ||
        request.entityType === "SALARY_ADVANCE" ||
        request.entityType === "RECRUITMENT" ||
        request.department?.toLowerCase().includes("nhân sự") ||
        request.requestedByName?.toLowerCase().includes("nhân sự");

      if (isHrRelated) {
        const hrManagers = await prisma.employee.findMany({
          where: {
            status: "active",
            OR: [
              { departmentName: { in: ["Nhân sự", "Phòng Nhân sự", "Hành chính Nhân sự", "Hành chính - Nhân sự"] } },
              { position: { contains: "Trưởng phòng Nhân sự" } },
              { position: { contains: "TPNS" } },
              { position: { contains: "vtr-20260401-1964-sbmg" } },
            ],
          },
          select: { userId: true },
        });

        hrManagers.forEach((m) => {
          if (m.userId && m.userId !== userId) {
            recipientIds.add(m.userId);
          }
        });
      }

      // 3. Tìm Ban Giám đốc (nếu người gửi không phải Ban Giám đốc)
      if (authorRole !== "director") {
        const directors = await prisma.employee.findMany({
          where: {
            status: "active",
            OR: [
              { position: { contains: "Giám đốc" } },
              { position: { contains: "Tổng Giám đốc" } },
              { position: { contains: "vtr-20260401-8730-eauc" } },
              { departmentName: { in: ["Ban Giám đốc", "Ban Lãnh đạo", "Ban Điều hành"] } },
            ],
          },
          select: { userId: true },
        });

        directors.forEach((d) => {
          if (d.userId && d.userId !== userId) {
            recipientIds.add(d.userId);
          }
        });

        // Bổ sung tài khoản admin
        const adminUsers = await prisma.user.findMany({
          where: { role: "admin" },
          select: { id: true },
        });
        adminUsers.forEach((a) => {
          if (a.id !== userId) recipientIds.add(a.id);
        });
      }

      // 4. Tạo Notification kèm Recipients
      if (recipientIds.size > 0) {
        const recipientsList = Array.from(recipientIds).map((uid) => ({ userId: uid }));
        await prisma.notification.create({
          data: {
            title: `💬 [Trao đổi] ${userName} nhắn trong: ${request.entityTitle}`,
            content: content.trim().substring(0, 250),
            type: "info",
            priority: "high",
            audienceType: recipientsList.length > 1 ? "group" : "individual",
            audienceValue:
              recipientsList.length > 1
                ? JSON.stringify(recipientsList.map((r) => r.userId))
                : recipientsList[0].userId,
            createdById: userId,
            attachments: JSON.stringify([
              {
                name: "Mở đơn tại trang Đề xuất cá nhân",
                type: "chat_link",
                url: `/my/leave-request?requestId=${request.entityId}&tab=comments`,
                target: "personal",
                entityId: request.entityId,
              },
              {
                name: "Mở trao đổi tại Phòng Nhân sự",
                type: "chat_link",
                url: `/hr?requestId=${request.entityId}&tab=comments`,
                target: "hr",
                entityId: request.entityId,
              },
              {
                name: "Mở tại Trung tâm phê duyệt (Giám đốc)",
                type: "chat_link",
                url: `/board/approvals?id=${request.id}&tab=comments`,
                target: "approval",
                approvalId: request.id,
              },
            ]),
            recipients: {
              create: recipientsList,
            },
          },
        });
      }
    } catch (notifErr) {
      console.error("Lỗi gửi notification comment:", notifErr);
    }

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
