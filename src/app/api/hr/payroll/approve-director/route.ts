import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const userName = session.user.name || session.user.email || "Giám đốc";

    const { month, year, note } = await req.json();

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
    }

    const payrollRecords = await prisma.payroll.findMany({
      where: { thang: month, nam: year },
    });

    if (payrollRecords.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy dữ liệu bảng lương tháng này để duyệt." },
        { status: 404 }
      );
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("vi-VN");
    const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái tất cả bản ghi Payroll sang "Đã duyệt"
      await tx.payroll.updateMany({
        where: { thang: month, nam: year },
        data: {
          trangThai: "Đã duyệt",
          ghiChu: `Giám đốc (${userName}) đã phê duyệt ngày ${dateStr}${note ? `: ${note}` : ""}`,
        },
      });

      // 2. Cập nhật hoặc tạo ApprovalRequest
      const entityId = `payroll-${month}-${year}`;
      const existingReq = await tx.approvalRequest.findFirst({
        where: { entityType: "PAYROLL", entityId },
      });

      const systemMsg = `✅ **${userName}** (Giám đốc) đã **PHÊ DUYỆT** bảng lương tháng ${month}/${year} lúc ${timeStr} ngày ${dateStr}.${note ? ` Ghi chú: _"${note}"_` : ""}`;

      if (existingReq) {
        await tx.approvalRequest.update({
          where: { id: existingReq.id },
          data: {
            status: "approved",
            approvedById: userId,
            approvedAt: now,
            note: note || existingReq.note,
            comments: {
              create: {
                authorId: userId,
                authorName: userName,
                authorRole: "approver",
                content: systemMsg,
                isSystem: true,
              },
            },
          },
        });

        // Gửi thông báo cho người lập yêu cầu
        if (existingReq.requestedById) {
          await tx.notification.create({
            data: {
              title: `✅ Bảng lương tháng ${month}/${year} đã được phê duyệt`,
              content: `Bảng lương tháng ${month}/${year} đã được **${userName}** (Giám đốc) phê duyệt thành công.`,
              type: "success",
              priority: "normal",
              audienceType: "individual",
              audienceValue: existingReq.requestedById,
              createdById: userId,
              attachments: JSON.stringify([
                {
                  name: "Xem bảng lương",
                  type: "link",
                  url: "/hr/attendance-payroll",
                },
              ]),
              recipients: {
                create: {
                  userId: existingReq.requestedById,
                },
              },
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Đã phê duyệt bảng lương tháng ${month}/${year} thành công. Trạng thái đã chuyển thành "Đã duyệt".`,
    });
  } catch (error: any) {
    console.error("Approve Director Payroll Error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi nội bộ hệ thống.", details: error.message },
      { status: 500 }
    );
  }
}
