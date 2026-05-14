import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyHRManager, notifyDirector } from "@/lib/hr-notifications";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, type, title } = body;
    
    if (!id || !type) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    // Fetch the actual request to check status
    let currentStatus = "Pending";
    if (type === "RECRUITMENT") {
      const rec = await prisma.recruitmentRequest.findUnique({ where: { id } });
      if (rec) currentStatus = rec.status;
    } else if (type === "TRAINING") {
      const tr = await (prisma as any).trainingRequest.findUnique({ where: { id } });
      if (tr) currentStatus = tr.status;
    } else if (type === "SALARY") {
      const sa = await (prisma as any).salaryAdjustmentRequest.findUnique({ where: { id } });
      if (sa) currentStatus = sa.status;
    } else if (type === "PROMOTION") {
      const pr = await (prisma as any).promotionRequest.findUnique({ where: { id } });
      if (pr) currentStatus = pr.status;
    }

    const requester = session.user.name;
    const senderId = (session.user as any).id || "system";

    const content = `Nhân sự **${requester}** vừa gửi yêu cầu thu hồi đối với yêu cầu: **${title}**.\n\nVui lòng xác nhận để xóa yêu cầu này khỏi hệ thống.`;
    
    const attachments = JSON.stringify([
      {
        name: "Đồng ý thu hồi",
        type: "link",
        url: `/api/hr/requests/recall/approve?type=${type}&id=${id}`
      }
    ]);

    // Scenario A: Pending -> Notify Director
    if (["Pending", "PENDING", "New", "Mới"].includes(currentStatus)) {
      await notifyDirector(
        `Yêu cầu thu hồi (Chờ duyệt): ${title}`,
        content,
        senderId,
        attachments
      );
    } 
    // Scenario B: Already approved or in progress -> Notify HR Manager
    else {
      await notifyHRManager(
        `Yêu cầu thu hồi (Đang triển khai): ${title}`,
        content,
        senderId,
        attachments
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Recall request error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
