import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/board/tasks
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: { comments: { orderBy: { createdAt: "desc" } } },
    });

    const userIds = [...new Set([
      ...tasks.map(t => t.assigneeId),
      ...tasks.map(t => t.creatorId),
    ])];
    const [users, allUsers, priorityCategories, statusCategories, departments] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
      // allUsers: chỉ lấy user CÓ Employee record (bỏ tài khoản admin không có hồ sơ nhân viên)
      prisma.user.findMany({
        where: { employee: { isNot: null } },
        select: {
          id: true, name: true, email: true, role: true,
          employee: { select: { departmentCode: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { type: "m_c_u_ti_n", isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { code: true, name: true, color: true },
      }),
      prisma.category.findMany({
        where: { type: "tr_ng_th_i_c_ng_vi_c", isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { code: true, name: true, color: true },
      }),
      prisma.departmentCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { code: true, nameVi: true },
      }),
    ]);

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // Flatten deptCode vào allUsers
    const allUsersFlat = allUsers.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      deptCode: u.employee?.departmentCode ?? null,
    }));

    const enriched = tasks.map(t => ({
      ...t,
      assignee: userMap[t.assigneeId] ?? null,
      creator:  userMap[t.creatorId]  ?? null,
    }));

    return NextResponse.json({ success: true, tasks: enriched, users: allUsersFlat, priorityCategories, statusCategories, departments });

  } catch (err) {
    console.error("[tasks GET]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// POST /api/board/tasks
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { title, description, assigneeId, deptCode, dueDate, priority } = body;

    if (!title?.trim() || !assigneeId) {
      return NextResponse.json({ error: "Thiếu tiêu đề hoặc người thực hiện" }, { status: 400 });
    }

    const creatorId = (session?.user as { id?: string })?.id ?? assigneeId;

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? null,
        assigneeId,
        creatorId,
        deptCode: deptCode ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority ?? "medium",
        status: "pending",
      },
    });

    // ── Gửi thông báo ─────────────────────────────────────────────────────────
    try {
      // Tìm Employee của người được giao việc
      const assigneeEmp = await prisma.employee.findFirst({
        where: { userId: assigneeId },
        select: { fullName: true, level: true, manager: true, departmentName: true },
      });

      // Chỉ thông báo nếu người nhận là nhân viên (không phải quản lý cấp cao tự giao)
      const recipientIds: string[] = [assigneeId];

      // Tìm trưởng phòng qua employee.manager (mã NV của quản lý trực tiếp)
      if (assigneeEmp?.manager) {
        const managerEmp = await prisma.employee.findFirst({
          where: { code: assigneeEmp.manager },
          select: { userId: true },
        });
        if (managerEmp?.userId && managerEmp.userId !== assigneeId) {
          recipientIds.push(managerEmp.userId);
        }
      }

      const dueDateStr = dueDate
        ? new Date(dueDate).toLocaleDateString("vi-VN")
        : "Không có deadline";

      const assigneeName = assigneeEmp?.fullName ?? "Nhân viên";
      const deptName     = assigneeEmp?.departmentName ?? "";

      // Tạo notification
      const notification = await prisma.notification.create({
        data: {
          title:        "📋 Công việc mới được giao",
          content:      `Công việc "${title.trim()}" đã được giao cho ${assigneeName}${deptName ? ` (${deptName})` : ""}. Deadline: ${dueDateStr}.`,
          type:         "info",
          priority:     "normal",
          audienceType: "group",
          audienceValue: JSON.stringify(recipientIds),
          createdById:  creatorId,
        },
      });

      // Tạo recipient records
      await Promise.allSettled(
        [...new Set(recipientIds)].map(uid =>
          prisma.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notification.id, userId: uid } },
            update: {},
            create: { notificationId: notification.id, userId: uid },
          })
        )
      );
    } catch (notifErr) {
      // Không để lỗi notification làm hỏng tạo task
      console.error("[tasks POST] notification error:", notifErr);
    }

    return NextResponse.json({ success: true, task });
  } catch (err) {
    console.error("[tasks POST]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
