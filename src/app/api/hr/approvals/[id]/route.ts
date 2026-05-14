import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notifyUser, notifyDirector } from "@/lib/hr-notifications";
import { eachDayOfInterval, format } from "date-fns";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action, note } = body;

    const request = await prisma.personalRequest.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!request) {
      return new NextResponse("Request not found", { status: 404 });
    }

    let updatedData: any = {};
    let notificationTitle = "";
    let notificationContent = "";
    let notifyTarget: "USER" | "DIRECTOR" | "NONE" = "NONE";

    if (action === "APPROVE") {
      updatedData = { status: "APPROVED", hrApproved: true };
      notificationTitle = "✅ Đề xuất được phê duyệt";
      notificationContent = `Đề xuất của bạn đã được phê duyệt bởi ${session.user.name}.`;
      notifyTarget = "USER";

      // ── LOGIC ĐỒNG BỘ BẢNG CÔNG ───────────────────────────────────────────
      // Nếu là các loại nghỉ hoặc công tác, tự động tạo/cập nhật bảng Attendance
      const autoSyncTypes = ["leave", "unpaid_leave", "business-trip", "work", "late", "early"];
      if (autoSyncTypes.includes(request.type) && request.startDate && request.endDate) {
        const days = eachDayOfInterval({
          start: new Date(request.startDate),
          end: new Date(request.endDate)
        });

        const attendanceStatus = "P"; // 'P' là mã chuẩn cho Nghỉ phép/Công tác trong bảng công

        await Promise.all(days.map(async (day) => {
          // Reset giờ về 0 để so sánh ngày
          const dateOnly = new Date(day.setHours(0, 0, 0, 0));
          
          return prisma.attendance.upsert({
            where: {
              employeeId_date: {
                employeeId: request.employeeId,
                date: dateOnly
              }
            },
            update: {
              status: attendanceStatus,
              note: `Đã duyệt đơn: ${request.reason || ""}`
            },
            create: {
              employeeId: request.employeeId,
              date: dateOnly,
              status: attendanceStatus,
              note: `Đã duyệt đơn: ${request.reason || ""}`
            }
          });
        }));
      }
      // ──────────────────────────────────────────────────────────────────────
      
    } else if (action === "REJECT") {
      updatedData = { status: "REJECTED", hrNote: note };
      notificationTitle = "❌ Đề xuất bị từ chối";
      notificationContent = `Đề xuất của bạn đã bị từ chối. Lý do: ${note || "Không có lý do chi tiết"}`;
      notifyTarget = "USER";
    } else if (action === "FORWARD_DIRECTOR") {
      updatedData = { hrApproved: true, hrNote: "Đã trình lãnh đạo" };
      notificationTitle = "🚀 Đề xuất cần phê duyệt";
      notificationContent = `Có một đề xuất từ ${request.employee.fullName} cần bạn phê duyệt.`;
      notifyTarget = "DIRECTOR";
    } else {
      return new NextResponse("Invalid action", { status: 400 });
    }

    const updatedRequest = await prisma.personalRequest.update({
      where: { id },
      data: updatedData
    });

    if (notifyTarget === "USER" && request.employee.userId) {
      await notifyUser(request.employee.userId, notificationTitle, notificationContent, session.user.id);
    } else if (notifyTarget === "DIRECTOR") {
      await notifyDirector(notificationTitle, notificationContent, session.user.id);
    }

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error("[APPROVAL_PATCH]", error);
    return new NextResponse(error?.message || "Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    if (!id) return new NextResponse("Missing ID", { status: 400 });

    const request = await prisma.personalRequest.findUnique({ where: { id } });
    if (!request) return new NextResponse("Yêu cầu không tồn tại", { status: 404 });
    if (request.status === "APPROVED") return new NextResponse("Không thể xóa đơn đã duyệt", { status: 400 });

    await prisma.personalRequest.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[APPROVAL_DELETE]", error);
    return new NextResponse(error?.message || "Internal Error", { status: 500 });
  }
}
