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

    const comments = await prisma.approvalComment.findMany({
      where: { requestId: id, parentId: null },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: comments });
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

    const request = await prisma.approvalRequest.findUnique({ where: { id } });
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

      // 1. Gửi cho người tạo (nếu không phải chính họ vừa nhắn)
      if (request.requestedById && request.requestedById !== userId) {
        recipientIds.add(request.requestedById);
      }

      // 2. Gửi cho Giám đốc / Approver nếu không phải chính họ vừa nhắn
      if (request.approverId && request.approverId !== userId) {
        recipientIds.add(request.approverId);
      } else if (authorRole !== "director") {
        // Tìm các tài khoản Ban Giám đốc / Admin để thông báo
        const directors = await prisma.user.findMany({
          where: {
            OR: [
              { role: "admin" },
              { employee: { departmentCode: "BGD" } }
            ]
          },
          select: { id: true }
        });
        directors.forEach((d) => {
          if (d.id !== userId) recipientIds.add(d.id);
        });
      }

      if (recipientIds.size > 0) {
        const recipientsList = Array.from(recipientIds).map((uid) => ({ userId: uid }));
        await prisma.notification.create({
          data: {
            title: `💬 Trao đổi mới từ ${userName}: ${request.entityTitle}`,
            content: content.trim().substring(0, 180),
            type: "info",
            priority: "normal",
            audienceType: "individual",
            createdById: userId,
            recipients: {
              create: recipientsList
            }
          }
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
