import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendOfferEmail } from "@/lib/mail-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    
    // 1. Fetch candidate and related data
    const candidate = await (prisma as any).candidate.findUnique({
      where: { id },
      include: {
        scorecards: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!candidate) return NextResponse.json({ error: "Ứng viên không tồn tại" }, { status: 404 });

    const scorecard = candidate.scorecards?.[0];
    
    // 2. Prepare email data (use defaults if missing)
    const emailData = {
      to: candidate.email || "",
      candidateName: candidate.name,
      position: candidate.position,
      salary: scorecard?.salarySuggest ? `${scorecard.salarySuggest.toLocaleString('vi-VN')} VNĐ` : (candidate.desiredSalary || "Thỏa thuận"),
      startDate: "Ngày làm việc đầu tiên (Vui lòng phản hồi để thống nhất)",
      startTime: "08:30 AM",
      location: candidate.interviewLocation || "Văn phòng công ty",
      benefits: "BHXH, Thưởng lễ tết, Chế độ phúc lợi theo quy định công ty",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN'), // 3 days from now
      phone: "024.xxxx.xxxx",
      email: session.user.email || "hr@company.com",
      senderName: session.user.name || "Ban Tuyển dụng",
    };

    if (!emailData.to) {
      return NextResponse.json({ error: "Ứng viên chưa cập nhật email" }, { status: 400 });
    }

    // 3. Send Email
    const mailResult = await sendOfferEmail(emailData);
    if (!mailResult.success) {
      return NextResponse.json({ error: "Lỗi khi gửi email: " + mailResult.error?.message }, { status: 500 });
    }

    // 4. Update status
    await (prisma as any).candidate.update({
      where: { id },
      data: { status: "Đã gửi thư mời" }
    });

    return NextResponse.json({ success: true, message: "Đã gửi thư mời và cập nhật trạng thái thành công" });
  } catch (error: any) {
    console.error("[SEND_OFFER_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
