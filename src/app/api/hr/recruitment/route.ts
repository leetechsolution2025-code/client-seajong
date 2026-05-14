import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requests = await (prisma as any).recruitmentRequest.findMany({
      include: { 
        candidates: true,
        requester: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET Recruitment Error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch recruitment requests", 
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Parse requirements if it comes as a string from client, or use individual fields
    const reqs = typeof body.requirements === 'string' ? JSON.parse(body.requirements) : (body.requirements || {});

    // Create new request with ALL fields mapped to DB columns
    const newRequest = await (prisma as any).recruitmentRequest.create({
      data: {
        department: body.department,
        position: body.position,
        specialty: body.specialty,
        quantity: body.quantity || 1,
        requesterId: body.requesterId,
        deadline: body.deadline ? new Date(body.deadline) : null,
        status: body.status || "Pending",
        priority: body.priority || "Normal",
        description: body.description,
        
        // Map new standardized fields
        salaryMin: reqs.salaryMin || null,
        salaryMax: reqs.salaryMax || null,
        workType: reqs.workType || null,
        experience: reqs.experience || null,
        education: reqs.education || null,
        gender: reqs.gender || null,
        ageMin: reqs.ageMin || null,
        ageMax: reqs.ageMax || null,
        level: reqs.level || null,
        skills: reqs.skills || null,

        // Keep requirements JSON for backward compatibility / deep storage
        requirements: typeof body.requirements === 'string' ? body.requirements : JSON.stringify(reqs)
      }
    });
    // 2. Tạo yêu cầu phê duyệt (ApprovalRequest) cho Giám đốc
    try {
      const requesterName = body.requestedBy || "Một quản lý";
      const approvalRequest = await prisma.approvalRequest.create({
        data: {
          entityType: "RECRUITMENT",
          entityId: newRequest.id,
          entityTitle: `Yêu cầu tuyển dụng: ${newRequest.position}`,
          status: "pending",
          priority: body.priority?.toLowerCase() || "normal",
          requestedById: body.requesterId,
          requestedByName: requesterName,
          department: body.department,
        }
      });

      // 3. Gửi thông báo cho Giám đốc
      const { notifyDirector } = await import("@/lib/hr-notifications");
      
      // Metadata để Frontend hiển thị nút Chi tiết
      const attachments = [
        {
          name: "Xem chi tiết yêu cầu",
          type: "recruitment_approval",
          url: `/hr/recruitment?approvalId=${approvalRequest.id}`,
          approvalId: approvalRequest.id,
          entityId: newRequest.id
        }
      ];

      await notifyDirector(
        "Yêu cầu tuyển dụng mới cần phê duyệt",
        `**${requesterName}** vừa gửi yêu cầu tuyển dụng cho vị trí **${newRequest.position}** (Số lượng: **${newRequest.quantity}**).\n\nVui lòng xem xét và phê duyệt để bộ phận Nhân sự có thể triển khai tìm kiếm ứng viên.`,
        body.requesterId,
        JSON.stringify(attachments)
      );
    } catch (e) {
      console.error("Approval/Notification Error:", e);
    }
    
    return NextResponse.json(newRequest);
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json({ error: "Failed to create recruitment request" }, { status: 500 });
  }
}
