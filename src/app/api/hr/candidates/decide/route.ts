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

    const { candidateId, decision, notificationId } = await request.json();

    if (!candidateId || !decision) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const isDirector = session.user.role === "DIRECTOR" || session.user.role === "ADMIN";
    
    let status = decision === "approve" ? "DeptApproved" : "DeptRejected";
    if (isDirector) {
      status = decision === "approve" ? "Đã tiếp nhận" : "Từ chối tiếp nhận";
    }

    // 1. Cập nhật trạng thái ứng viên
    const updatedCandidate = await (prisma as any).candidate.update({
      where: { id: candidateId },
      data: { status },
      include: {
        request: {
          select: {
            position: true,
            requesterId: true,
            requestedBy: true
          }
        }
      }
    });

    // 2. Tìm người gửi thông báo gốc (HR) để gửi phản hồi
    // Chúng ta lấy HR từ notificationId hoặc mặc định gửi cho requesterId của request
    let hrUserId = null;
    if (notificationId) {
      const originalNotif = await (prisma as any).notification.findUnique({
        where: { id: notificationId },
        select: { createdById: true }
      });
      hrUserId = originalNotif?.createdById;
    }

    // Nếu không tìm thấy người gửi thông báo, gửi cho người quản lý yêu cầu (nếu có)
    if (!hrUserId) {
      // Logic này tùy thuộc vào việc ai là người quản lý quy trình, tạm thời lấy session user nếu HR rỗng là không đúng
      // Thực tế HR thường là Admin hoặc người có quyền quản lý recruitment
    }

    if (hrUserId && hrUserId !== session.user.id) {
      const roleLabel = isDirector ? "Giám đốc" : "Trưởng phòng";
      const decisionLabel = decision === "approve" ? "ĐÃ TIẾP NHẬN" : "TỪ CHỐI TIẾP NHẬN";
      const title = `[Kết quả] ${roleLabel} ${decisionLabel} ứng viên ${updatedCandidate.name}`;
      const content = `${roleLabel} **${session.user.name}** đã ${decision === "approve" ? "đồng ý tiếp nhận" : "từ chối tiếp nhận"} ứng viên **${updatedCandidate.name}** cho vị trí **${updatedCandidate.request?.position}**.\n\nBạn có thể vào mục Quản lý Tuyển dụng để kiểm tra chi tiết.`;

      await (prisma as any).notification.create({
        data: {
          title,
          content,
          type: decision === "approve" ? "success" : "warning",
          priority: "normal",
          audienceType: "individual",
          audienceValue: hrUserId,
          createdById: session.user.id,
          recipients: {
            create: { userId: hrUserId }
          }
        }
      });
    }

    return NextResponse.json({ 
      message: "Quyết định đã được ghi nhận",
      newStatus: status 
    });

  } catch (error: any) {
    console.error("[CANDIDATE_DECIDE_POST]", error);
    return NextResponse.json(
      { error: "Lỗi Server", details: error.message },
      { status: 500 }
    );
  }
}
