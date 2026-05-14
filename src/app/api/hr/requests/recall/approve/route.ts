import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });

    // 1. Fetch info before deleting
    let requestTitle = "";
    let requesterId = "";
    let interviewers: string[] = [];
    let isApprovedByDirector = false;

    if (type === "RECRUITMENT") {
      const rec = await prisma.recruitmentRequest.findUnique({
        where: { id },
        include: { candidates: true }
      });
      if (rec) {
        requestTitle = rec.position;
        requesterId = rec.requesterId || "";
        isApprovedByDirector = !["Pending", "PENDING", "New", "Mới"].includes(rec.status);
        
        // Extract interviewers from candidates
        rec.candidates.forEach((c: any) => {
           if (c.interviewParticipants) {
             try {
               const parts = JSON.parse(c.interviewParticipants);
               parts.forEach((p: any) => {
                 if (p.userId && !interviewers.includes(p.userId)) {
                   interviewers.push(p.userId);
                 }
               });
             } catch(e) {}
           }
        });
      }
    } else if (type === "TRAINING") {
      const tr = await (prisma as any).trainingRequest.findUnique({ where: { id } });
      if (tr) {
        requestTitle = tr.topic;
        requesterId = tr.requesterId || "";
        isApprovedByDirector = !["Pending", "PENDING", "New", "Mới"].includes(tr.status);
      }
    } else if (type === "SALARY") {
      const sa = await (prisma as any).salaryAdjustmentRequest.findUnique({ where: { id } });
      if (sa) {
        requestTitle = "Điều chỉnh thu nhập";
        requesterId = sa.requesterId || "";
        isApprovedByDirector = !["WAITING_APPROVAL", "SUBMITTED"].includes(sa.status);
      }
    } else if (type === "PROMOTION") {
      const pr = await (prisma as any).promotionRequest.findUnique({ where: { id } });
      if (pr) {
        requestTitle = `Đề bạt/Thuyên chuyển: ${pr.employeeName}`;
        requesterId = pr.requesterId || "";
        isApprovedByDirector = pr.status !== "PENDING";
      }
    }

    // 2. Perform deletion and notifications in a transaction
    await prisma.$transaction(async (tx) => {
      // Notify Requester
      if (requesterId) {
        const notif = await tx.notification.create({
          data: {
            title: `Yêu cầu thu hồi đã được chấp nhận`,
            content: `Yêu cầu **"${requestTitle}"** của bạn đã được thu hồi và xóa khỏi hệ thống.`,
            type: "success",
            priority: "normal",
            audienceType: "individual",
            audienceValue: requesterId,
            createdById: (session.user as any).id || "system"
          }
        });
        await tx.notificationRecipient.create({ data: { notificationId: notif.id, userId: requesterId } });
      }

      // Scenario B: Already approved -> Notify Director and Interviewers
      if (isApprovedByDirector) {
        // Notify Director (Finding Director userId)
        const director = await tx.employee.findFirst({
           where: { position: { contains: "Giám đốc" }, status: "active" },
           select: { userId: true }
        });
        if (director?.userId) {
           const dNotif = await tx.notification.create({
             data: {
               title: `Thông báo thu hồi yêu cầu`,
               content: `Yêu cầu **"${requestTitle}"** (đã duyệt trước đó) đã được thu hồi bởi bộ phận nhân sự và xóa khỏi hệ thống.`,
               type: "info",
               priority: "normal",
               audienceType: "individual",
               audienceValue: director.userId,
               createdById: (session.user as any).id || "system"
             }
           });
           await tx.notificationRecipient.create({ data: { notificationId: dNotif.id, userId: director.userId } });
        }

        // Notify Interviewers and delete their Tasks
        for (const userId of interviewers) {
           const iNotif = await tx.notification.create({
             data: {
               title: `Hủy lịch phỏng vấn`,
               content: `Yêu cầu tuyển dụng **"${requestTitle}"** đã bị thu hồi. Lịch phỏng vấn liên quan của bạn đã bị hủy.`,
               type: "warning",
               priority: "high",
               audienceType: "individual",
               audienceValue: userId,
               createdById: (session.user as any).id || "system"
             }
           });
           await tx.notificationRecipient.create({ data: { notificationId: iNotif.id, userId } });

           // Delete tasks for this user related to this request
           await (tx as any).task.deleteMany({
             where: {
               assigneeId: userId,
               OR: [
                 { title: { contains: requestTitle } },
                 { description: { contains: requestTitle } }
               ]
             }
           });
        }
      }

      // 3. Final Deletion
      if (type === "RECRUITMENT") {
        await (tx as any).candidate.deleteMany({ where: { requestId: id } });
        await (tx as any).recruitmentRequest.delete({ where: { id } });
      } else if (type === "TRAINING") {
        await (tx as any).trainingRequest.delete({ where: { id } });
      } else if (type === "SALARY") {
        await (tx as any).salaryAdjustmentRequest.delete({ where: { id } });
      } else if (type === "PROMOTION") {
        await tx.approvalRequest.deleteMany({
          where: { entityId: id, entityType: { in: ["PROMOTION", "TRANSFER", "DEMOTION"] } }
        });
        await (tx as any).promotionRequest.delete({ where: { id } });
      }
    });

    const redirectUrl = new URL('/my/hr-requests?toast=recall_approved', req.url);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("Recall approve error:", error);
    return NextResponse.json({ error: "Lỗi khi xóa yêu cầu" }, { status: 500 });
  }
}
