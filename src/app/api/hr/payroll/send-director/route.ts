import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceData } from "@/components/hr/attendance-actions";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { month, year } = await req.json();

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "Kế toán / Nhân sự";

    // 1. Fetch attendance & payroll data
    const attendanceData = await getAttendanceData(month, year);
    if (!attendanceData || attendanceData.departments.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy dữ liệu bảng lương tháng này." },
        { status: 404 }
      );
    }

    // 2. Calculate totals
    const daysInMonthCount = new Date(year, month, 0).getDate();
    let sundaysCount = 0;
    for (let d = 1; d <= daysInMonthCount; d++) {
      const day = new Date(year, month - 1, d);
      if (day.getDay() === 0) sundaysCount++;
    }
    const standardWorkDays = daysInMonthCount - sundaysCount || 1;

    let totalEmployees = 0;
    let totalWorkDays = 0;
    let totalNet = 0;

    for (const dept of attendanceData.departments) {
      for (const emp of dept.employees) {
        const cong = emp.attendance.reduce((acc: number, a: any) => acc + (a?.workday || 0), 0);
        const ot = emp.attendance.reduce((acc: number, a: any) => acc + (a?.otHours || 0), 0);
        const salary = emp.baseSalary || 0;
        const mealTotal = (emp.mealAllowance || 0) * cong;
        const allowances = mealTotal + (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
        const salaryTheoCong = (salary / standardWorkDays) * cong;
        const otSalary = ot * (salary / standardWorkDays / 8);
        const khauTruBH = emp.insuranceDeduction ?? 0;
        const net = salaryTheoCong + allowances + otSalary - khauTruBH;

        totalEmployees++;
        totalWorkDays += cong;
        totalNet += net;
      }
    }

    // 3. Find Directors (Ban Giám đốc / Giám đốc)
    const directors = await prisma.employee.findMany({
      where: {
        status: "active",
        OR: [
          { position: "Giám đốc" },
          { position: "vtr-20260401-8730-eauc" },
          { departmentName: "Ban Giám đốc" },
          { departmentCode: "board" },
        ],
      },
      select: { userId: true, fullName: true, position: true },
    });

    const validDirectorUserIds = Array.from(
      new Set(directors.map((d) => d.userId).filter(Boolean))
    ) as string[];

    if (validDirectorUserIds.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản Ban Giám đốc để trình phê duyệt." },
        { status: 404 }
      );
    }

    // 4. Create ApprovalRequest for tracking in /board/approvals
    const approval = await prisma.approvalRequest.create({
      data: {
        entityType: "PAYROLL",
        entityId: `payroll-${month}-${year}`,
        entityTitle: `Bảng lương tháng ${month}/${year}`,
        entityCode: `BL-${String(month).padStart(2, "0")}/${year}`,
        status: "pending",
        priority: "high",
        department: "Tài chính - Kế toán",
        requestedById: userId,
        requestedByName: userName,
        metadata: JSON.stringify({
          month,
          year,
          totalEmployees,
          totalNet: Math.round(totalNet),
          standardWorkDays,
        }),
        comments: {
          create: [
            {
              authorId: userId,
              authorName: userName,
              authorRole: "requester",
              content: `📤 **${userName}** đã trình Ban Giám đốc phê duyệt chi quỹ lương tháng ${month}/${year} với tổng thực lĩnh **${Math.round(totalNet).toLocaleString("vi-VN")} đ** (${totalEmployees} nhân sự).`,
            },
          ],
        },
      },
    });

    // 5. Send notification to all Directors
    const title = `💼 Trình duyệt bảng lương tháng ${month}/${year}`;
    const content =
      `## ĐỀ XUẤT PHÊ DUYỆT BẢNG LƯƠNG - THÁNG ${month}/${year}\n---\n` +
      `Kính gửi Ban Giám đốc,\n\n` +
      `Phòng Kế toán & Nhân sự đã tổng hợp và thẩm định xong bảng lương tháng ${month}/${year}. Dưới đây là thông tin tổng quan đề xuất phê duyệt:\n\n` +
      `◦ **Tổng số nhân viên**: ${totalEmployees} người\n` +
      `◦ **Tổng ngày công thực tế**: ${totalWorkDays.toFixed(1)} ngày công\n` +
      `◦ **Tổng quỹ lương thực lĩnh**: ${Math.round(totalNet).toLocaleString("vi-VN")} đ\n\n` +
      `---\n` +
      `Vui lòng nhấn nút **"Xem chi tiết bảng lương"** bên dưới để kiểm tra toàn bộ danh sách hoặc duyệt tại Trung tâm phê duyệt.\n\n` +
      `[ACCOUNTING_PAYROLL_DETAILS]:${JSON.stringify({ month, year })}\n\n` +
      `Trân trọng!`;

    await prisma.$transaction(async (tx) => {
      const notif = await tx.notification.create({
        data: {
          title,
          content,
          type: "warning",
          priority: "high",
          audienceType: validDirectorUserIds.length > 1 ? "group" : "individual",
          audienceValue:
            validDirectorUserIds.length > 1
              ? JSON.stringify(validDirectorUserIds)
              : validDirectorUserIds[0],
          createdById: userId,
          attachments: JSON.stringify([
            {
              name: "Xem và duyệt bảng lương",
              type: "link",
              url: `/board/approvals?id=${approval.id}`,
            },
          ]),
        },
      });

      await Promise.all(
        validDirectorUserIds.map((dirUserId) =>
          tx.notificationRecipient.create({
            data: {
              notificationId: notif.id,
              userId: dirUserId,
              isRead: false,
            },
          })
        )
      );

      // 6. Update Payroll status in DB
      await tx.payroll.updateMany({
        where: { thang: month, nam: year },
        data: {
          trangThai: "Chờ Giám đốc duyệt",
          ghiChu: `Đã trình Ban Giám đốc ngày ${new Date().toLocaleDateString("vi-VN")}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Đã trình Ban Giám đốc phê duyệt bảng lương tháng ${month}/${year} thành công!`,
      approvalId: approval.id,
    });
  } catch (error: any) {
    console.error("[SendDirector Error]:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi trình duyệt bảng lương." },
      { status: 500 }
    );
  }
}
