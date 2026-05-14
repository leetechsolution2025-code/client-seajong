import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { candidateIds, decision, notificationId, reason } = await request.json();

    if (!candidateIds || !Array.isArray(candidateIds) || !decision) {
      return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
    }

    // 1. Lấy thông tin ứng viên để làm Title cho Task
    const candidates = await (prisma as any).candidate.findMany({
      where: { id: { in: candidateIds } },
      select: { name: true, position: true }
    });
    const candidateNames = candidates.map((c: any) => c.name).join(", ");

    for (const cid of candidateIds) {
      const candidate = await (prisma as any).candidate.findUnique({
        where: { id: cid },
        select: { interviewParticipants: true }
      });

      if (!candidate) continue;

      let participants = [];
      try {
        participants = candidate.interviewParticipants ? JSON.parse(candidate.interviewParticipants) : [];
      } catch (e) {
        participants = [];
      }

      // Cập nhật trạng thái của user hiện tại trong danh sách participant
      const updatedParticipants = participants.map((p: any) => {
        if (p.userId === session.user.id) {
          return { 
            ...p, 
            status: decision === "accept" ? "accepted" : "declined",
            reason: decision === "decline" ? reason : undefined
          };
        }
        return p;
      });

      await (prisma as any).candidate.update({
        where: { id: cid },
        data: {
          interviewParticipants: JSON.stringify(updatedParticipants)
        }
      });
    }

    // 2. Nếu ĐỒNG Ý -> Tự động thêm vào Công việc cá nhân (Task)
    if (decision === "accept") {
      let interviewDate = new Date();
      if (notificationId) {
        const notif = await (prisma as any).notification.findUnique({
          where: { id: notificationId },
          select: { attachments: true }
        });
        if (notif?.attachments) {
          try {
            const atts = JSON.parse(notif.attachments);
            if (atts[0]?.interviewDate) {
              interviewDate = new Date(atts[0].interviewDate);
            }
          } catch (e) {}
        }
      }

      await (prisma as any).task.create({
        data: {
          title: `Phỏng vấn ứng viên: ${candidateNames}`,
          description: `Bạn có lịch phỏng vấn cho vị trí ${candidates[0]?.position || "Tuyển dụng"}.\nỨng viên: ${candidateNames}`,
          status: "pending",
          priority: "high",
          assigneeId: session.user.id,
          creatorId: session.user.id,
          dueDate: interviewDate,
        }
      });
    }

    // 3. Gửi thông báo lại cho HR (người tạo notification gốc)
    if (notificationId) {
      const originalNotif = await (prisma as any).notification.findUnique({
        where: { id: notificationId },
        select: { createdById: true }
      });

      if (originalNotif?.createdById && originalNotif.createdById !== session.user.id) {
        let content = `Người phỏng vấn **${session.user.name}** đã ${decision === "accept" ? "xác nhận tham gia" : "từ chối"} buổi phỏng vấn của các ứng viên: ${candidateNames}.`;
        if (decision === "decline" && reason) {
          content += `\n\n**Lý do từ chối:** ${reason}`;
        }

        await (prisma as any).notification.create({
          data: {
            title: `[Phản hồi PV] ${session.user.name} đã ${decision === "accept" ? "ĐỒNG Ý" : "TỪ CHỐI"}`,
            content: content,
            type: decision === "accept" ? "success" : "warning",
            priority: "normal",
            audienceType: "individual",
            audienceValue: originalNotif.createdById,
            createdById: session.user.id,
            recipients: {
              create: { userId: originalNotif.createdById }
            }
          }
        });
      }
    }

    return NextResponse.json({ message: "Phản hồi đã được ghi nhận" });

  } catch (error: any) {
    console.error("[INTERVIEW_RESPONSE_POST]", error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}
