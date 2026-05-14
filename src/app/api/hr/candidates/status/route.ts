import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { ids, status, message: hrMessage } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return NextResponse.json(
        { error: "Danh sách ứng viên hoặc trạng thái không hợp lệ." },
        { status: 400 }
      );
    }

    await (prisma as any).candidate.updateMany({
      where: { id: { in: ids } },
      data: { status }
    });

    // Gửi thông báo cho trưởng phòng khi chuyển duyệt
    if (status === "DeptReview") {
      // Lấy thông tin các ứng viên vừa cập nhật + yêu cầu tuyển dụng liên quan
      const candidates = await (prisma as any).candidate.findMany({
        where: { id: { in: ids } },
        include: {
          request: {
            select: {
              id: true,
              position: true,
              department: true,
              requestedBy: true,
              requesterId: true,
            }
          }
        }
      });

      // Nhóm ứng viên theo từng yêu cầu tuyển dụng
      const byRequest = new Map<string, { request: any; candidates: any[] }>();
      for (const c of candidates) {
        if (!c.request) continue;
        const key = c.request.id;
        if (!byRequest.has(key)) {
          byRequest.set(key, { request: c.request, candidates: [] });
        }
        byRequest.get(key)!.candidates.push(c);
      }

      const senderName = session?.user?.name || "Phòng Nhân sự";

      // Gửi thông báo riêng cho từng nhóm yêu cầu
      for (const [, group] of byRequest) {
        const { request: req, candidates: groupCandidates } = group;
        
        // Ưu tiên requesterId, fallback tra theo tên requestedBy
        let recipientUserId: string | null = req.requesterId || null;
        if (!recipientUserId && req.requestedBy) {
          const emp = await (prisma as any).employee.findFirst({
            where: { fullName: { contains: req.requestedBy } },
            select: { userId: true }
          });
          recipientUserId = emp?.userId || null;
        }
        if (!recipientUserId) continue;

        const candidateList = groupCandidates
          .map((c: any) => `• ${c.name} — ${c.experience || "Chưa xác định kinh nghiệm"}`)
          .join("\n");

        const cvLinks = groupCandidates
          .filter((c: any) => c.cvUrl || c.profileUrl)
          .map((c: any) => ({
            name: `Xem CV - ${c.name}`,
            url: c.cvUrl || c.profileUrl,
            type: "recruitment_action",
            candidateId: c.id,
            candidateName: c.name
          }));

        const title = `[Yêu cầu xét duyệt] ${groupCandidates.length} ứng viên vị trí ${req.position}`;
        let content = `${senderName} đã chuyển ${groupCandidates.length} hồ sơ ứng viên cho vị trí **${req.position}** (${req.department}) để Trưởng bộ phận xem xét trước khi quyết định phỏng vấn.\n\nDanh sách ứng viên:\n${candidateList}`;
        
        if (hrMessage) {
          content += `\n\n**Lời nhắn từ HR:**\n${hrMessage}`;
        }
        
        content += `\n\nVui lòng xem xét và phản hồi sớm.`;

        await (prisma as any).notification.create({
          data: {
            title,
            content,
            type: "task",
            priority: "high",
            audienceType: "individual",
            audienceValue: recipientUserId,
            attachments: cvLinks.length > 0 ? JSON.stringify(cvLinks) : null,
            clientId: null,
            createdById: session?.user?.id || recipientUserId,
            recipients: {
              create: { userId: recipientUserId }
            }
          }
        });
      }
    }

    return NextResponse.json({ message: "Cập nhật trạng thái thành công" });
  } catch (error: any) {
    console.error("[CANDIDATE_STATUS_PATCH]", error);
    return NextResponse.json(
      { error: "Lỗi Server Nội bộ", details: error.message },
      { status: 500 }
    );
  }
}
