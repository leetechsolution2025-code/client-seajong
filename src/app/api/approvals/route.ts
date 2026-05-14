import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET /api/approvals ─────────────────────────────────────────────────────────
// Params:
//   ?view=inbox        → chờ tôi duyệt (mặc định)
//   ?view=mine         → tôi đã gửi
//   ?status=pending    → lọc status
//   ?dept=marketing    → lọc phòng ban
//   ?entityType=xxx    → lọc loại hồ sơ
//   ?page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const view       = searchParams.get("view") || "inbox";
    const status     = searchParams.get("status") || "";
    const dept       = searchParams.get("dept") || "";
    const entityType = searchParams.get("entityType") || "";
    const page       = Math.max(1, Number(searchParams.get("page") || 1));
    const limit      = Math.min(50, Number(searchParams.get("limit") || 20));
    const skip       = (page - 1) * limit;

    const userId = session.user.id as string;

    // Build where clause
    const where: any = {};

    if (view === "mine") {
      where.requestedById = userId;
    } else {
      // inbox: hồ sơ assign cho tôi HOẶC broadcast (approverId = null) + tôi có quyền duyệt
      where.OR = [
        { approverId: userId },
        { approverId: null },
      ];
    }

    if (status) where.status = status;
    if (dept) where.department = dept;
    if (entityType) {
      if (entityType.includes(",")) {
        where.entityType = { in: entityType.split(",") };
      } else {
        where.entityType = entityType;
      }
    }

    const [items, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        include: {
          comments: {
            where: { isSystem: false },
            select: { id: true },
          },
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.approvalRequest.count({ where }),
    ]);

    const data = items.map((item: any) => ({
      ...item,
      commentCount: item.comments.length,
      comments: undefined,
    }));

    return NextResponse.json({ success: true, data, total, page, limit });
  } catch (e: any) {
    console.error("[GET /api/approvals]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── POST /api/approvals ────────────────────────────────────────────────────────
// Tạo hồ sơ phê duyệt mới + auto-comment sự kiện
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      entityType, entityId, entityCode, entityTitle,
      priority = "normal", dueDate,
      department, metadata,
      approverId, autoAssignManager, message
    } = body;

    if (!entityType || !entityId || !entityTitle) {
      return NextResponse.json({ error: "entityType, entityId, entityTitle là bắt buộc" }, { status: 400 });
    }

    const userId   = session.user.id as string;
    const userName = session.user.name || session.user.email || "Người dùng";

    // Kiểm tra xem đã có pending request chưa
    const existing = await prisma.approvalRequest.findFirst({
      where: { entityType, entityId, status: "pending" },
    });
    if (existing) {
      return NextResponse.json({ error: "Hồ sơ này đang có yêu cầu phê duyệt chưa xử lý", existingId: existing.id }, { status: 409 });
    }

    let finalApproverId = approverId || null;
    let finalApproverName: string | null = null;

    // Gán cho quản lý trực tiếp
    if (autoAssignManager) {
      const employee = await prisma.employee.findUnique({
        where: { userId: userId }
      });
      if (employee?.manager) {
        const managerEmp = await prisma.employee.findFirst({
          where: { code: employee.manager }
        });
        if (managerEmp?.userId) {
          finalApproverId = managerEmp.userId;
          finalApproverName = managerEmp.fullName;
        }
      }
    }

    let finalMetadata = metadata || {};
    if (finalMetadata.isRevision) {
      const revCount = await prisma.approvalRequest.count({
        where: { entityType, entityId }
      });
      finalMetadata.revisionCount = revCount + 1;
    }

    const request = await prisma.approvalRequest.create({
      data: {
        entityType,
        entityId,
        entityCode:      entityCode || null,
        entityTitle,
        status:          "pending",
        priority,
        dueDate:         dueDate ? new Date(dueDate) : null,
        department:      department || null,
        metadata:        finalMetadata ? JSON.stringify(finalMetadata) : null,
        requestedById:   userId,
        requestedByName: userName as string,
        approverId:      finalApproverId,
        comments: {
          create: [
            {
              authorId:   userId,
              authorName: userName as string,
              authorRole: "requester",
              content:    `📤 **${userName}** đã gửi hồ sơ để phê duyệt.`,
              isSystem:   true,
            },
            ...(message ? [{
              authorId:   userId,
              authorName: userName as string,
              authorRole: "requester",
              content:    message,
              isSystem:   false,
            }] : [])
          ] as any,
        },
      },
    });

    // Tạo Notification nếu có người duyệt cụ thể
    if (finalApproverId) {
      await prisma.notification.create({
        data: {
          title: "Yêu cầu phê duyệt mới",
          content: `Bạn có yêu cầu phê duyệt mới từ **${userName}**: ${entityTitle}`,
          type: "warning",
          createdById: userId,
          recipients: {
            create: { userId: finalApproverId }
          }
        }
      });
    }

    return NextResponse.json({ success: true, data: request }, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/approvals]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
