import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOfferEmail } from "@/lib/mail-utils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      candidateId,
      salary,
      startDate,
      startTime,
      location,
      benefits,
      deadline,
      draftOnly,
      customHtml,
      customSubject
    } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "Chưa chọn ứng viên" }, { status: 400 });
    }

    const candidate = await (prisma as any).candidate.findUnique({
      where: { id: candidateId },
      include: { 
        request: true,
        scorecards: true
      }
    });

    if (!candidate) {
      return NextResponse.json({ error: "Không tìm thấy ứng viên" }, { status: 404 });
    }

    // Tính toán mức lương trung bình từ các phiếu đánh giá
    const scorecards = candidate.scorecards || [];
    const avgSalaryVal = scorecards.filter((s: any) => s.salarySuggest).length
      ? Math.round(scorecards.reduce((sum: number, s: any) => sum + (s.salarySuggest || 0), 0) / scorecards.filter((s: any) => s.salarySuggest).length)
      : null;

    if (!candidate.email) {
      return NextResponse.json({ error: "Ứng viên không có địa chỉ email" }, { status: 400 });
    }

    const company = await (prisma as any).companyInfo.findFirst();
    const config = await (prisma as any).emailConfig.findFirst({ where: { isActive: true } });

    const finalSalary = salary || (avgSalaryVal ? `${Number(avgSalaryVal).toLocaleString('vi-VN')} đ` : "sẽ được thỏa thuận");
    const finalStartDate = startDate || "Sớm nhất có thể";
    const finalStartTime = startTime || "08:00 AM";
    const finalLocation = location || company?.address || "Văn phòng công ty";
    const finalBenefits = benefits || "Bảo hiểm, đi lại, ăn uống, và các chế độ đãi ngộ khác của công ty";
    const finalDeadline = deadline || "3 ngày kể từ khi nhận được email này";
    const phone = company?.phone || "";
    const email = config?.fromEmail || company?.email || "";
    const senderName = session.user.name || "Ban Nhân sự";

    if (draftOnly) {
      const companyName = company?.name || config?.fromName || "Công ty";
      const subject = `${companyName} _ Thư mời làm việc`;
      
      const htmlContent = `
        <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="padding: 30px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              ${company?.logoUrl ? `<img src="cid:company-logo-cid" alt="Logo" style="height: 50px; margin-bottom: 15px;">` : ""}
              <h2 style="margin: 0; color: #003087; font-size: 20px; text-transform: uppercase;">Thư Mời Làm Việc</h2>
            </div>
            <div style="padding: 40px 30px;">
              <p>Bạn <strong>${candidate.name}</strong> thân mến,</p>
              <p>Lời đầu tiên, chúng tôi vô cùng cảm ơn vì bạn đã quan tâm và dành thời gian ứng tuyển vị trí <strong>${candidate.position}</strong> tại công ty chúng tôi. Thông qua buổi phỏng vấn cũng như trao đổi, chúng tôi đánh giá cao kinh nghiệm và kỹ năng của bạn.</p>
              <p>Bởi vậy, chúng tôi xin trân trọng mời bạn gia nhập vào đội ngũ công ty <strong>${companyName}</strong>, với vị trí <strong>${candidate.position}</strong>. Bạn vui lòng bắt đầu đến nhận việc vào <strong>${finalStartDate}</strong>, từ <strong>${finalStartTime}</strong>, tại <strong>${finalLocation}</strong>.</p>
              <p>Như đã thỏa thuận, mức lương khởi điểm bạn sẽ nhận được là <strong>${finalSalary}</strong>, kèm theo các chính sách hỗ trợ khác như <strong>${finalBenefits}</strong>.</p>
              <p>Bạn vui lòng xác nhận lại cho chúng tôi chậm nhất là sau <strong>${finalDeadline}</strong>. Nếu có bất cứ thắc mắc nào, bạn hãy liên hệ với chúng tôi qua số điện thoại <strong>${phone}</strong> hoặc email <strong>${email}</strong>.</p>
              <p>Chúng tôi rất mong đợi được đón tiếp bạn như một thành viên của đội ngũ. Xin chân thành cảm ơn bạn!</p>
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0;">Trân trọng,</p>
                <p style="margin: 5px 0; font-weight: bold; color: #003087;">${senderName}</p>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
              <p style="margin: 0;">📍 ${company?.address || ""}</p>
              <p style="margin: 5px 0;">📞 ${company?.phone || ""}</p>
            </div>
          </div>
        </div>
      `;
      
      return NextResponse.json({ 
        success: true, 
        subject, 
        html: htmlContent,
        candidateName: candidate.name,
        position: candidate.position,
        companyName,
        salary: finalSalary,
        startDate: finalStartDate,
        startTime: finalStartTime,
        location: finalLocation,
        benefits: finalBenefits,
        deadline: finalDeadline,
        companyAddress: company?.address || "",
        companyPhone: phone,
        companyEmail: email,
        logoUrl: company?.logoUrl || "",
        senderName
      });
    }

    const mailRes = await sendOfferEmail({
      to: candidate.email,
      candidateName: candidate.name,
      position: candidate.position,
      salary: finalSalary,
      startDate: finalStartDate,
      startTime: finalStartTime,
      location: finalLocation,
      benefits: finalBenefits,
      deadline: finalDeadline,
      phone,
      email,
      senderName,
      customHtml,
      customSubject
    });

    if (!mailRes.success) {
      throw new Error(mailRes.error?.message || "Lỗi gửi email");
    }

    // Cập nhật trạng thái ứng viên
    await (prisma as any).candidate.update({
      where: { id: candidateId },
      data: { status: "Đã gửi thư mời" }
    });

    return NextResponse.json({ success: true, message: "Đã gửi thư mời làm việc thành công!" });

  } catch (error: any) {
    console.error("[SEND_OFFER_POST] ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
