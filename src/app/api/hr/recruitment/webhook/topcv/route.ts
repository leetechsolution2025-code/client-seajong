import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * XÁC NHẬN WEBHOOK ĐANG HOẠT ĐỘNG (Dành cho trình duyệt)
 */
export async function GET() {
  return NextResponse.json({ 
    status: "Active", 
    message: "Webhook tiếp nhận CV TopCV đã sẵn sàng. Vui lòng sử dụng phương thức POST để gửi dữ liệu.",
    instruction: "Để kết nối từ TopCV về máy local, bạn cần dùng ngrok để public port 3000."
  });
}

/**
 * WEBHOOK TIẾP NHẬN ỨNG VIÊN TỪ TOPCV
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[Webhook TopCV] Received data:", body);

    // Dữ liệu mẫu thường có từ TopCV:
    // {
    //    "candidate_name": "Nguyen Van A",
    //    "job_title": "Nhân viên bán hàng",
    //    "phone": "0912345678",
    //    "email": "a@gmail.com",
    //    "cv_url": "...",
    //    "skills": "...",
    //    ...
    // }

    const jobTitle = body.job_title || body.position_name;
    if (!jobTitle) {
      return NextResponse.json({ error: "Missing job title for matching" }, { status: 400 });
    }

    // 1. Tìm tin tuyển dụng tương ứng trong hệ thống (Matching by Position Title)
    // Giống cơ chế của Base: Khớp theo tiêu đề
    const recruitmentRequest = await prisma.recruitmentRequest.findFirst({
      where: {
        position: {
          contains: jobTitle,
          // Chế độ không phân biệt hoa thường nếu dùng Postgres, 
          // SQLite mặc định không phân biệt hoa thường với cảm biến 'contains'
        },
        status: "Approved"
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Tạo bản ghi ứng viên
    const candidateData = {
      name: body.candidate_name || body.fullname || "Ứng viên TopCV",
      position: jobTitle,
      source: "TOPCV (Webhook)",
      phone: body.phone || body.mobile || "N/A",
      email: body.email || "N/A",
      profileUrl: body.cv_url || body.link_cv || "",
      experience: body.experience || "Theo hồ sơ TopCV",
      summary: body.summary || `Ứng tuyển tự động từ TopCV qua vị trí: ${jobTitle}`,
      matchScore: 100, // Thường ứng tuyển trực tiếp được coi là phù hợp cao
      status: "New" as any,
    };

    if (recruitmentRequest) {
      // Gắn vào tin tuyển dụng đã tìm thấy
      await prisma.candidate.create({
        data: {
          ...candidateData,
          requestId: recruitmentRequest.id,
        }
      });
      console.log(`[Webhook TopCV] Matched and added candidate to Request ID: ${recruitmentRequest.id}`);
    } else {
      // Nếu không tìm thấy tin, cho vào "Pending Pool" (Một Request ảo hoặc xử lý riêng)
      // Ở đây chúng ta sẽ tạo một Request mặc định hoặc ghi log
      console.warn(`[Webhook TopCV] No matching request found for title: ${jobTitle}. CV stored in Pending state.`);
      
      // Tìm hoặc tạo một Request "Pending Pool"
      let pendingRequest = await prisma.recruitmentRequest.findFirst({
        where: { position: "Pending Pool" }
      });
      
      if (!pendingRequest) {
        pendingRequest = await prisma.recruitmentRequest.create({
          data: {
            position: "Pending Pool",
            department: "Hệ thống",
            requestedBy: "Hệ thống (Tự động)",
            status: "Approved",
            description: "Nơi chứa các CV từ nguồn ngoài không khớp tiêu đề"
          }
        });
      }

      await prisma.candidate.create({
        data: {
          ...candidateData,
          requestId: pendingRequest.id,
        }
      });
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("[Webhook TopCV] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
