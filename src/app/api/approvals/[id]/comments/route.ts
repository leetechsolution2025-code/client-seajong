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

    const targetRequestId = appReq ? appReq.id : id;

    const comments = await prisma.approvalComment.findMany({
      where: { requestId: targetRequestId, parentId: null },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: comments, approvalRequestId: targetRequestId });
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
    const request = await prisma.approvalRequest.findFirst({
      where: {
        OR: [{ id }, { entityId: id }, { entityCode: id }],
      },
    });
    if (!request) return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });

    const userId   = session.user.id as string;
    const userName = session.user.name || session.user.email || "Người dùng";
    const userRole = (session.user as any).role || "";
    const userDept = (session.user as any).departmentCode || "";
    const userPos  = (session.user as any).position || (session.user as any).positionName || "";

    // Xác định role chuẩn xác
    let authorRole = "observer";
    if (
      userRole === "admin" ||
      userDept === "BGD" ||
      userPos.toLowerCase().includes("giám đốc") ||
      request.approverId === userId ||
      request.approvedById === userId
    ) {
      authorRole = "director";
    } else if (
      userDept === "HR" ||
      userDept === "HCNS" ||
      userPos.toLowerCase().includes("nhân sự") ||
      request.requestedByName.includes("Nhân sự")
    ) {
      authorRole = "hr";
    } else if (request.requestedById === userId) {
      authorRole = "requester";
    }

    const comment = await prisma.approvalComment.create({
      data: {
        requestId:  id,
        authorId:   userId,
        authorName: userName as string,
        authorRole,
        content:    content.trim(),
        parentId:   parentId || null,
        isSystem:   false,
      },
    });

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
              { name: "Trung tâm phê duyệt", type: "link", url: `/board/approvals?id=${id}` },
              { name: "Phòng Nhân sự", type: "link", url: `/hr` },
              { name: "Yêu cầu cá nhân", type: "link", url: `/personal/requests` },
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
