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
      interviewNotes,
      draftOnly,
      customHtml,
      customSubject
    } = body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: "Chưa chọn ứng viên" }, { status: 400 });
    }

    if (!selectedInterviewers || !Array.isArray(selectedInterviewers) || selectedInterviewers.length === 0) {
      return NextResponse.json({ error: "Chưa chọn người phỏng vấn" }, { status: 400 });
    }

    const candidates = await (prisma as any).candidate.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, name: true, position: true, email: true }
    });

    if (candidates.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy ứng viên để gửi thông báo" }, { status: 404 });
    }

    if (draftOnly) {
      const config = await (prisma as any).emailConfig.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" }
      });
      const company = await (prisma as any).companyInfo.findFirst();
      const companyName = company?.name || config?.fromName || "Công ty";
      const companySlogan = company?.slogan || "";
      const companyAddress = company?.address || "";
      const companyPhone = company?.phone || "";
      const companyWebsite = company?.website || "";

      const formattedDate = new Date(interviewDate).toLocaleString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const candidateNames = candidates.map((c: any) => c.name).join(", ");
      const subject = `Mời bạn tham gia phỏng vấn – ${candidates[0]?.position} tại ${companyName}`;
      
      const htmlContent = `
        <div style="background-color: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e6ebf1;">
            
            <!-- Header with Branding -->
            <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #f0f4f8;">
              ${company?.logoUrl ? `
                <div style="margin-bottom: 15px;">
                  <img src="cid:company-logo-cid" alt="Logo" style="max-height: 60px; width: auto; display: inline-block; border: 0;">
                </div>
              ` : ""}
              <div style="font-size: 16px; font-weight: 600; color: #003087; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3;">${companyName}</div>
              ${companySlogan ? `<div style="font-size: 13px; color: #718096; font-style: italic; margin-top: 6px;">${companySlogan}</div>` : ""}
            </div>

            <!-- Banner -->
            <div style="background: #003087; color: #ffffff; padding: 18px; text-align: center;">
              <h1 style="margin: 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Thư Mời Phỏng Vấn</h1>
            </div>

            <!-- Body -->
            <div style="padding: 35px 30px; color: #4a5568;">
              <p style="font-size: 15px; margin-top: 0;">Xin chào <strong>${candidateNames}</strong>,</p>
              
              <p style="font-size: 14px; line-height: 1.7;">Cảm ơn bạn đã dành thời gian ứng tuyển vào vị trí <strong>${candidates[0]?.position}</strong> tại <strong>${companyName}</strong>! Chúng tôi đã xem xét hồ sơ của bạn và rất ấn tượng với những gì bạn đã thể hiện. Vì vậy, chúng tôi trân trọng mời bạn tham gia buổi phỏng vấn trực tiếp để cùng trao đổi sâu hơn về cơ hội hợp tác.</p>
              
              <!-- Information Box -->
              <div style="background-color: #f8fafc; border-radius: 10px; padding: 22px; margin: 30px 0; border: 1px solid #edf2f7;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">🕒</span></td>
                    <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Thời gian:</strong><br><span style="color: #4a5568; font-size: 14px;">${formattedDate}</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">📍</span></td>
                    <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Địa điểm:</strong><br><span style="color: #4a5568; font-size: 14px;">${interviewLocation}</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">👤</span></td>
                    <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Người liên hệ:</strong><br><span style="color: #4a5568; font-size: 14px;">${config?.fromName || "Ban Nhân sự"} (${config?.fromEmail || ""})</span></td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 14px; line-height: 1.7;">Nếu thời gian trên chưa phù hợp, bạn vui lòng phản hồi lại email này để chúng tôi có thể sắp xếp lại lịch phỏng vấn. Hãy xác nhận sự tham gia của bạn trước khi buổi phỏng vấn diễn ra.</p>

              ${interviewNotes ? `
                <div style="background-color: #fffaf0; padding: 15px; border-radius: 8px; border-left: 4px solid #f6ad55; margin: 20px 0;">
                  <p style="margin: 0; font-size: 13px; color: #744210;"><strong>📝 Ghi chú từ nhà tuyển dụng:</strong><br>${interviewNotes}</p>
                </div>
              ` : ""}

              <p style="margin-top: 30px; font-size: 14px;">Chúng tôi rất mong được gặp bạn!</p>
              
              <div style="margin-top: 45px; border-top: 1px solid #edf2f7; padding-top: 20px;">
                <p style="margin: 0; font-size: 13px; color: #a0aec0;">Trân trọng,</p>
                <p style="margin: 5px 0; font-size: 15px; font-weight: bold; color: #003087;">Ban Tuyển dụng ${companyName}</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f7fafc; padding: 30px 25px; text-align: center; border-top: 1px solid #edf2f7;">
              ${companyAddress ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #718096; line-height: 1.5;">📍 ${companyAddress}</p>` : ""}
              <p style="margin: 0; font-size: 12px; color: #718096;">
                ${companyPhone ? `📞 ${companyPhone}` : ""} 
                ${companyWebsite ? ` &nbsp;|&nbsp; 🌐 ${companyWebsite}` : ""}
                ${config?.fromEmail ? ` &nbsp;|&nbsp; 📧 ${config.fromEmail}` : ""}
              </p>
            </div>
          </div>
        </div>
      `;

      const defaultIntro = `Cảm ơn bạn đã dành thời gian ứng tuyển vào vị trí ${candidates[0]?.position || ""} tại ${companyName}! Chúng tôi đã xem xét hồ sơ của bạn và rất ấn tượng với những gì bạn đã thể hiện. Vì vậy, chúng tôi trân trọng mời bạn tham gia buổi phỏng vấn trực tiếp để cùng trao đổi sâu hơn về cơ hội hợp tác.`;
      const defaultClosing = `Nếu thời gian trên chưa phù hợp, bạn vui lòng phản hồi lại email này để chúng tôi có thể sắp xếp lại lịch phỏng vấn. Hãy xác nhận sự tham gia của bạn trước khi buổi phỏng vấn diễn ra.`;

      return NextResponse.json({
        success: true,
        subject,
        html: htmlContent,
        companyName,
        companySlogan,
        companyAddress,
        companyPhone,
        companyWebsite,
        logoUrl: company?.logoUrl || "",
        fromEmail: config?.fromEmail || "",
        fromName: config?.fromName || "Ban Nhân sự",
        candidateNames,
        position: candidates[0]?.position || "",
        formattedDate,
        location: interviewLocation,
        defaultIntro,
        defaultClosing,
        notes: interviewNotes || ""
      });
    }

    const interviewerNames = selectedInterviewers.map((i: any) => i.fullName).join(", ");
    const participants = selectedInterviewers.map((i: any) => ({
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
          baseUrl: baseUrl,
          customHtml,
          customSubject
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
