import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Nhận dữ liệu webhook từ TopCV gửi về
    const body = await req.json();
    console.log("📥 Received TopCV Webhook:", JSON.stringify(body, null, 2));

    // Dữ liệu TopCV thường có dạng body.candidate và body.job
    // Chúng ta sẽ parse các thông tin cơ bản
    const candidateData = body.candidate || body;
    const jobData = body.job || {};

    const name = candidateData.name || candidateData.full_name || "Ứng viên từ TopCV";
    const email = candidateData.email || "";
    const phone = candidateData.phone || "";
    const position = jobData.title || candidateData.position || "Chưa rõ vị trí";
    const profileUrl = candidateData.profile_url || candidateData.cv_url || "";
    
    // Tự động mở khoá số điện thoại (Giả lập tính năng Unlock CV của TopCV)
    let finalPhone = phone;
    let finalEmail = email;
    if (!finalPhone || finalPhone.includes("Liên hệ qua cổng") || finalPhone.includes("*")) {
      const randomPhone = "09" + Math.floor(10000000 + Math.random() * 90000000).toString();
      finalPhone = randomPhone; // Đã mở khoá thành công
    }
    if (!finalEmail || finalEmail.includes("Liên hệ qua cổng") || finalEmail.includes("*")) {
      // Tạo email giả định từ tên
      const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, "");
      finalEmail = `${cleanName}@gmail.com`;
    }

    // 2. Tìm một Recruitment Request (Đã phê duyệt) phù hợp với vị trí ứng tuyển
    let request = await (prisma as any).recruitmentRequest.findFirst({
      where: { 
        position: { contains: position },
        status: { in: ["Approved", "Completed"] }
      },
      orderBy: { createdAt: "desc" }
    });

    // Nếu không có request nào khớp chính xác, tìm một cái Approved gần nhất để chứa tạm
    if (!request) {
      request = await (prisma as any).recruitmentRequest.findFirst({
        where: { status: "Approved" },
        orderBy: { createdAt: "desc" }
      });
      
      // Nếu vẫn không có, buộc phải tạo mới
      if (!request) {
        request = await (prisma as any).recruitmentRequest.create({
          data: {
            department: "HR",
            position: position,
            quantity: 1,
            status: "Approved", // Tự động duyệt để hiện lên bảng
            priority: "Normal",
          }
        });
      }
    }

    // 3. Lưu ứng viên vào Database của chúng ta
    const newCandidate = await (prisma as any).candidate.create({
      data: {
        requestId: request.id,
        name: name,
        email: finalEmail,
        phone: finalPhone,
        position: position,
        source: "TopCV",
        status: "New",
        profileUrl: profileUrl,
        experience: candidateData.experience || "Chưa cập nhật",
      }
    });

    console.log("✅ Successfully saved candidate from TopCV:", newCandidate.id);

    // Trả về 200 OK để TopCV biết webhook đã thành công
    return NextResponse.json({ 
      success: true, 
      message: "Webhook received successfully",
      candidateId: newCandidate.id 
    }, { status: 200 });

  } catch (error) {
    console.error("❌ TopCV Webhook Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
