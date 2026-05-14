import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInterviewEmail } from "@/lib/mail-utils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      candidateIds,
      interviewDate,
      selectedInterviewers, // [{ userId: string, fullName: string }]
      interviewLocation,
      interviewNotes
    } = body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: "Chưa chọn ứng viên" }, { status: 400 });
    }

    if (!selectedInterviewers || !Array.isArray(selectedInterviewers) || selectedInterviewers.length === 0) {
      return NextResponse.json({ error: "Chưa chọn người phỏng vấn" }, { status: 400 });
    }

    const interviewerNames = selectedInterviewers.map(i => i.fullName).join(", ");
    const participants = selectedInterviewers.map(i => ({
      userId: i.userId,
      fullName: i.fullName,
      status: "pending"
    }));

    // 1. Cập nhật trạng thái và thông tin phỏng vấn
    try {
      await (prisma as any).candidate.updateMany({
        where: { id: { in: candidateIds } },
        data: {
          status: "Interviewing",
          interviewDate: interviewDate ? new Date(interviewDate) : null,
          interviewer: interviewerNames,
          interviewLocation,
          interviewNotes,
          interviewParticipants: JSON.stringify(participants)
        }
      });
    } catch (dbErr: any) {
      console.error("[SCHEDULE_INTERVIEW] DB Update Error:", dbErr);
      throw new Error(`Lỗi cập nhật Database: ${dbErr.message}`);
    }

    const candidates = await (prisma as any).candidate.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, name: true, position: true, email: true }
    });

    if (candidates.length === 0) {
      throw new Error("Không tìm thấy ứng viên để gửi thông báo");
    }

    const candidateNames = candidates.map((c: any) => c.name).join(", ");

    // 2. Gửi thông báo đến từng người phỏng vấn (Hệ thống nội bộ)
    for (const inter of selectedInterviewers) {
      if (!inter.userId) continue;
      try {
        await (prisma as any).notification.create({
          data: {
            title: `[Mời phỏng vấn] Bạn có lịch phỏng vấn mới`,
            content: `Chào **${inter.fullName}**,\n\nBạn được mời tham gia phỏng vấn cho ứng viên: **${candidateNames}**.\nVị trí: **${candidates[0]?.position}**\nThời gian: **${new Date(interviewDate).toLocaleString('vi-VN')}**\nĐịa điểm: **${interviewLocation}**\n\nGhi chú: ${interviewNotes || "Không có"}`,
            type: "document",
            priority: "high",
            audienceType: "individual",
            audienceValue: inter.userId,
            createdById: session.user.id,
            recipients: { create: { userId: inter.userId } },
            attachments: JSON.stringify([{
              name: "Xác nhận lịch phỏng vấn",
              url: "#",
              type: "interview_invite",
              candidateIds: candidateIds,
              interviewDate: interviewDate
            }])
          }
        });
      } catch (notifErr) { console.error("Internal notif error:", notifErr); }
    }

    // 3. Gửi Email tự động cho từng ứng viên (Sử dụng SMTP Config)
    let emailSuccessCount = 0;
    let lastEmailError = null;

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    for (const cand of candidates) {
      if (cand.email) {
        const mailRes = await sendInterviewEmail({
          to: cand.email,
          candidateName: cand.name,
          position: cand.position,
          date: interviewDate,
          location: interviewLocation,
          notes: interviewNotes,
          interviewers: interviewerNames,
          baseUrl: baseUrl
        });
        if (mailRes.success) {
          emailSuccessCount++;
        } else {
          lastEmailError = mailRes.error;
          console.error(`Email failed for ${cand.name}:`, mailRes.error);
        }
      }
    }

    if (candidates.length > 0 && emailSuccessCount === 0 && candidates.some((c: any) => c.email)) {
      const errorMsg = lastEmailError instanceof Error ? lastEmailError.message : (typeof lastEmailError === 'string' ? lastEmailError : "Lỗi gửi thư không xác định");
      return NextResponse.json({
        message: `Đã lên lịch nhưng KHÔNG gửi được email nào. Chi tiết: ${errorMsg}`
      }, { status: 500 });
    }

    return NextResponse.json({
      message: `Đã lên lịch thành công. Đã gửi ${emailSuccessCount}/${candidates.length} email mời phỏng vấn.`
    });

  } catch (error: any) {
    console.error("[SCHEDULE_INTERVIEW_POST] ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
