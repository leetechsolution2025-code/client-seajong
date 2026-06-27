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
    const { summaryDate, lunchList, totalLunch, totalDinner } = body;

    if (!summaryDate) {
      return NextResponse.json({ error: "Thiếu ngày tổng hợp" }, { status: 400 });
    }

    const dateStr = new Date(summaryDate).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // 1. Tìm các chức vụ có tên "Tạp vụ"
    const tapVuCategories = await prisma.category.findMany({
      where: {
        type: "position",
        name: {
          contains: "Tạp vụ",
        },
      },
      select: { code: true },
    });
    const positionCodes = tapVuCategories.map((c) => c.code);

    // 2. Tìm nhân viên có chức vụ là "Tạp vụ"
    const tapVuEmployees = await prisma.employee.findMany({
      where: {
        OR: [
          { position: { in: positionCodes } },
          { position: "Tạp vụ" },
        ],
      },
      select: { userId: true },
    });

    const recipientUserIds = tapVuEmployees
      .map((e) => e.userId)
      .filter(Boolean) as string[];

    // 3. Fallback nếu không có nhân viên Tạp vụ nào trong hệ thống
    let finalUserIds = [...new Set(recipientUserIds)];
    let audienceType = "group";

    if (finalUserIds.length === 0) {
      // Tìm các nhân viên thuộc bộ phận CSVC/Hành chính/Lễ tân
      const fallbackEmployees = await prisma.employee.findMany({
        where: {
          OR: [
            { departmentCode: { contains: "facility" } },
            { departmentCode: { contains: "hr" } },
            { departmentName: { contains: "Hành chính" } },
          ],
        },
        select: { userId: true },
      });
      finalUserIds = fallbackEmployees
        .map((e) => e.userId)
        .filter(Boolean) as string[];
      
      if (finalUserIds.length === 0) {
        // Gửi cho tất cả mọi người
        audienceType = "all";
      }
    }

    const title = `[Suất ăn] Đăng ký suất ăn ngày ${new Date(summaryDate).toLocaleDateString("vi-VN")}`;
    
    // Tạo nội dung chi tiết đăng ký suất ăn
    let content = `Báo cáo đăng ký suất ăn ngày ${dateStr}:\n`;
    content += `- Tổng số suất ăn trưa: ${totalLunch} suất.\n`;
    content += `- Tổng số suất ăn tối: ${totalDinner} suất.\n\n`;
    
    if (lunchList && lunchList.length > 0) {
      content += `Chi tiết danh sách đăng ký:\n`;
      lunchList.forEach((e: any, idx: number) => {
        const mealInfo = [];
        if (e.lunch) mealInfo.push("Trưa");
        if (e.dinner) mealInfo.push("Tối");
        content += `${idx + 1}. ${e.fullName} (${e.deptName}) - Đăng ký: ${mealInfo.join(", ") || "Không"}\n`;
      });
    } else {
      content += `Không có nhân viên nào đăng ký suất ăn trong ngày này.\n`;
    }

    // 4. Tạo Notification record
    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        type: "lunch",
        priority: "normal",
        audienceType,
        audienceValue: audienceType === "group" ? JSON.stringify(finalUserIds) : null,
        clientId: null,
        createdById: session.user.id,
      },
    });

    // 5. Tạo NotificationRecipient
    if (audienceType === "group" && finalUserIds.length > 0) {
      await Promise.allSettled(
        finalUserIds.map((uid) =>
          prisma.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notification.id, userId: uid } },
            update: {},
            create: { notificationId: notification.id, userId: uid },
          })
        )
      );
    } else if (audienceType === "all") {
      const allUsers = await prisma.user.findMany({ select: { id: true } });
      const allUserIds = allUsers.map((u) => u.id);
      await Promise.allSettled(
        allUserIds.map((uid) =>
          prisma.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notification.id, userId: uid } },
            update: {},
            create: { notificationId: notification.id, userId: uid },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      recipients: finalUserIds.length,
    });
  } catch (error: any) {
    console.error("[POST /api/hr/attendance/lunch-notification] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi máy chủ nội bộ" },
      { status: 500 }
    );
  }
}
