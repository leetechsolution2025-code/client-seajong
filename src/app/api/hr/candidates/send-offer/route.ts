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
      deadline
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

    const mailRes = await sendOfferEmail({
      to: candidate.email,
      candidateName: candidate.name,
      position: candidate.position,
      salary: salary || (avgSalaryVal ? `${Number(avgSalaryVal).toLocaleString('vi-VN')} đ` : "sẽ được thỏa thuận"),
      startDate: startDate || "Sớm nhất có thể",
      startTime: startTime || "08:00 AM",
      location: location || company?.address || "Văn phòng công ty",
      benefits: benefits || "Bảo hiểm, đi lại, ăn uống, và các chế độ đãi ngộ khác của công ty",
      deadline: deadline || "3 ngày kể từ khi nhận được email này",
      phone: company?.phone || "",
      email: config?.fromEmail || company?.email || "",
      senderName: session.user.name || "Ban Nhân sự"
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
