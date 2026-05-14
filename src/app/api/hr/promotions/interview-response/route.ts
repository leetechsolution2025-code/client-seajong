import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { promotionId, decision, role, notificationId } = await req.json();

    if (!promotionId || !decision || !role || !notificationId) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Lấy thông tin promotion
    const promotion = await (prisma as any).promotionRequest.findUnique({
      where: { id: promotionId },
      include: { employee: true }
    });

    if (!promotion) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu đề bạt" }, { status: 404 });
    }

    // Lấy thông tin thông báo gốc để biết người gửi
    const originalNotif = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { createdById: true }
    });
    const senderId = originalNotif?.createdById;

    // Lấy thông tin nhân viên thực hiện hành động
    const actorEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });
    const actorName = actorEmployee?.fullName || session.user.name || "Hệ thống";

    if (decision === "accept") {
      // Thêm vào danh sách công việc cá nhân (Task) nếu là "interviewer"
      if (role === "interviewer") {
        try {
          await (prisma as any).task.create({
            data: {
              title: `Phỏng vấn đề bạt – ${promotion.employee.fullName}`,
              description: `Bạn đã xác nhận tham gia phỏng vấn cho nhân sự ${promotion.employee.fullName}.\nThời gian: ${promotion.interviewDate ? new Date(promotion.interviewDate).toLocaleDateString("vi-VN") : "Chưa xác định"}\nĐịa điểm: ${promotion.interviewLocation || "Chưa xác định"}`,
              status: "pending",
              priority: "high",
              assigneeId: session.user.id,
              dueDate: promotion.interviewDate,
              creatorId: session.user.id,
            }
          });
        } catch (taskErr) {
          console.warn("Không tạo được task, bỏ qua:", taskErr);
        }
      }

      // Gửi thông báo lại cho người tạo lịch (HR)
      if (senderId) {
        const hrNotifTitle = role === "interviewer"
          ? `${actorName} đã xác nhận lịch phỏng vấn`
          : `${promotion.employee.fullName} đã xác nhận tham gia phỏng vấn`;
        const hrNotifContent = role === "interviewer"
          ? `**${actorName}** đã xác nhận tham gia phỏng vấn nhân sự **${promotion.employee.fullName}** vào **${promotion.interviewDate ? new Date(promotion.interviewDate).toLocaleDateString("vi-VN") : "ngày đã hẹn"}**.`
          : `Nhân sự **${promotion.employee.fullName}** đã xác nhận tham gia buổi phỏng vấn đề bạt vào **${promotion.interviewDate ? new Date(promotion.interviewDate).toLocaleDateString("vi-VN") : "ngày đã hẹn"}**.`;

        const notif = await prisma.notification.create({
          data: {
            title: hrNotifTitle,
            content: hrNotifContent,
            type: "success",
            priority: "normal",
            audienceType: "individual",
            audienceValue: senderId,
            createdById: session.user.id,
          }
        });
        await prisma.notificationRecipient.create({
          data: { notificationId: notif.id, userId: senderId }
        });
      }

    } else if (decision === "decline") {
      // Gửi thông báo từ chối cho HR
      if (senderId) {
        const declineTitle = role === "interviewer"
          ? `${actorName} đã từ chối lịch phỏng vấn`
          : `${promotion.employee.fullName} đã từ chối tham gia phỏng vấn`;
        const declineContent = role === "interviewer"
          ? `**${actorName}** đã từ từ chối tham gia phỏng vấn nhân sự **${promotion.employee.fullName}**. Vui lòng liên hệ để xác nhận lại lịch.`
          : `Nhân sự **${promotion.employee.fullName}** đã từ chối tham gia buổi phỏng vấn đề bạt. Vui lòng liên hệ để xác nhận lại.`;

        const notif = await prisma.notification.create({
          data: {
            title: declineTitle,
            content: declineContent,
            type: "error",
            priority: "high",
            audienceType: "individual",
            audienceValue: senderId,
            createdById: session.user.id,
          }
        });
        await prisma.notificationRecipient.create({
          data: { notificationId: notif.id, userId: senderId }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/hr/promotions/interview-response]", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
