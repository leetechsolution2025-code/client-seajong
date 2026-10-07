import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notifyUser, notifyDirector } from "@/lib/hr-notifications";
import { eachDayOfInterval, format } from "date-fns";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action, note } = body;

    // Handle recruitment/training/promotion/salary adjustment requests
    if (id.startsWith("stationery-")) {
      const realId = id.substring(11);
      const reqRecord = await (prisma as any).hrSupplyRequest.findUnique({
        where: { id: realId },
        include: { requester: true }
      });
      if (!reqRecord) return new NextResponse("Request not found", { status: 404 });

      let newStatus = "PENDING";
      let rejectionNote = "";
      let notificationTitle = "";
      let notificationContent = "";
      let notifyTarget = "NONE";

      if (action === "APPROVE") {
        newStatus = "APPROVED";
        notificationTitle = "✅ Yêu cầu văn phòng phẩm của bạn đã được duyệt";
        notificationContent = `Yêu cầu văn phòng phẩm (Mã: ${reqRecord.code}) đã được duyệt bởi Trưởng phòng nhân sự ${session.user.name}. Trạng thái hiện tại: Văn phòng đang xử lý.`;
        notifyTarget = "USER";
      } else if (action === "REJECT") {
        newStatus = "REJECTED";
        rejectionNote = note || "Bị từ chối";
        notificationTitle = "❌ Yêu cầu văn phòng phẩm của bạn bị từ chối";
        notificationContent = `Yêu cầu văn phòng phẩm (Mã: ${reqRecord.code}) đã bị từ chối. Lý do: ${note || "Không có lý do chi tiết"}. Trạng thái hiện tại: Văn phòng đang xử lý.`;
        notifyTarget = "USER";
      }

      const updated = await (prisma as any).hrSupplyRequest.update({
        where: { id: realId },
        data: {
          status: newStatus,
          rejectionNote: action === "REJECT" ? rejectionNote : undefined
        }
      });

      if (notifyTarget === "USER" && reqRecord.requester?.userId) {
        await notifyUser(reqRecord.requester.userId, notificationTitle, notificationContent, session.user.id);
      }

      return NextResponse.json(updated);
    }

    if (id.startsWith("rec-")) {
      const realId = id.substring(4);
      let newStatus = "Pending";
      if (action === "APPROVE" || action === "FORWARD_DIRECTOR") newStatus = "Approved";
      else if (action === "REJECT") newStatus = "Rejected";

      const updated = await (prisma as any).recruitmentRequest.update({
        where: { id: realId },
        data: { status: newStatus }
      });
      return NextResponse.json(updated);
    }

    if (id.startsWith("train-")) {
      const realId = id.substring(6);
      let newStatus = "PENDING";
      if (action === "APPROVE") newStatus = "APPROVED";
      else if (action === "REJECT") newStatus = "REJECTED";

      const updated = await (prisma as any).trainingRequest.update({
        where: { id: realId },
        data: { status: newStatus }
      });
      return NextResponse.json(updated);
    }

    if (id.startsWith("promo-")) {
      const realId = id.substring(6);
      let data: any = {};
      if (action === "APPROVE") {
        data = { status: "CONCLUSION", hrApproved: true, directorApproved: true };
      } else if (action === "REJECT") {
        data = { status: "CONCLUSION", hrApproved: false, directorApproved: false, hrNote: note };
      } else if (action === "FORWARD_DIRECTOR") {
        data = { hrApproved: true, hrNote: "Đã trình lãnh đạo" };
      }

      const updated = await (prisma as any).promotionRequest.update({
        where: { id: realId },
        data
      });
      return NextResponse.json(updated);
    }

    if (id.startsWith("salary-")) {
      const realId = id.substring(7);
      let newStatus = "PENDING";
      let hrNote = note || "";
      if (action === "APPROVE") {
        newStatus = "APPROVED";
      } else if (action === "REJECT") {
        newStatus = "REJECTED";
      } else if (action === "FORWARD_DIRECTOR") {
        newStatus = "PENDING";
        hrNote = "Đã trình lãnh đạo";
      }

      const updated = await (prisma as any).salaryAdjustmentRequest.update({
        where: { id: realId },
        data: { status: newStatus, hrNote }
      });
      return NextResponse.json(updated);
    }

    const request = await prisma.personalRequest.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!request) {
      return new NextResponse("Request not found", { status: 404 });
    }

    let updatedData: any = {};
    let notificationTitle = "";
    let notificationContent = "";
    let notifyTarget: "USER" | "DIRECTOR" | "NONE" = "NONE";

    if (action === "APPROVE") {
      updatedData = { status: "APPROVED", hrApproved: true };
      notificationTitle = "✅ Đề xuất được phê duyệt";
      notificationContent = `Đề xuất của bạn đã được phê duyệt bởi ${session.user.name}.`;
      notifyTarget = "USER";

      // ── LOGIC ĐỒNG BỘ BẢNG CÔNG ───────────────────────────────────────────
      // Nếu là các loại nghỉ hoặc công tác, tự động tạo/cập nhật bảng Attendance
      const autoSyncTypes = ["leave", "unpaid_leave", "business-trip", "work"];
      if (autoSyncTypes.includes(request.type) && request.startDate && request.endDate) {
        const days = eachDayOfInterval({
          start: new Date(request.startDate),
          end: new Date(request.endDate)
        });

        let attendanceStatus = "P"; // 'P' là mã chuẩn cho Nghỉ phép/Công tác trong bảng công
        if (request.details) {
          try {
            const parsed = typeof request.details === "string" ? JSON.parse(request.details) : request.details;
            if (parsed.leaveType === "Nghỉ không lương") {
              attendanceStatus = "KL";
            } else if (parsed.leaveType === "Nghỉ ốm có BHXH") {
              attendanceStatus = "BHXH";
            }
          } catch (e) {}
        }

        await Promise.all(days.map(async (day) => {
          // Reset giờ về 0 để so sánh ngày
          const dateOnly = new Date(day.setHours(0, 0, 0, 0));
          
          return prisma.attendance.upsert({
            where: {
              employeeId_date: {
                employeeId: request.employeeId,
                date: dateOnly
              }
            },
            update: {
              status: attendanceStatus,
              note: `Đã duyệt đơn: ${request.reason || ""}`
            },
            create: {
              employeeId: request.employeeId,
              date: dateOnly,
              status: attendanceStatus,
              note: `Đã duyệt đơn: ${request.reason || ""}`
            }
          });
        }));
      }
      // ──────────────────────────────────────────────────────────────────────
      
    } else if (action === "REJECT") {
      updatedData = { status: "REJECTED", hrNote: note };
      notificationTitle = "❌ Đề xuất bị từ chối";
      notificationContent = `Đề xuất của bạn đã bị từ chối. Lý do: ${note || "Không có lý do chi tiết"}`;
      notifyTarget = "USER";
    } else if (action === "FORWARD_DIRECTOR") {
      updatedData = { hrApproved: true, hrNote: note || "Đã trình lãnh đạo" };
      
      // Parse details
      let details: any = {};
      if (request.details) {
        try {
          details = typeof request.details === "string" ? JSON.parse(request.details) : request.details;
        } catch (e) {
          details = {};
        }
      }

      const typeKey = request.type.toLowerCase();
      let loaiText = "Đề xuất cá nhân";
      let entityTitle = "";
      let chiTietTomTat = "";

      if (typeKey === "salary-advance") {
        loaiText = "Tạm ứng lương";
        const amount = Number(details.amount || 0);
        const amountStr = amount > 0 ? `${amount.toLocaleString("vi-VN")} đ` : "";
        entityTitle = `Tạm ứng lương: ${request.employee.fullName} (${amountStr})`;
        chiTietTomTat = `Số tiền: **${amountStr}** | Khấu trừ vào lương tháng **${details.salaryMonth || "Hiện tại"}** | Hình thức nhận: **${details.paymentMethod || "Chuyển khoản"}**${details.bankAccount ? ` (STK: \`${details.bankAccount}\` - ${details.bankName || ""})` : ""}`;
      } else if (typeKey === "advance-refund") {
        const isAdvance = details.subType !== "Hoàn ứng" && details.subType !== "Quyết toán";
        loaiText = details.subType || (isAdvance ? "Tạm ứng công việc" : "Hoàn ứng quyết toán");
        const amount = Number(details.amount || 0);
        const amountStr = amount > 0 ? `${amount.toLocaleString("vi-VN")} đ` : "";
        entityTitle = `${loaiText}: ${request.employee.fullName} (${amountStr})`;
        chiTietTomTat = `Số tiền: **${amountStr}** | Mục đích: ${details.purpose || details.reason || request.reason || "Công tác/Công việc"}${details.bankAccount ? ` (STK: \`${details.bankAccount}\` - ${details.bankName || ""})` : ""}`;
      } else if (typeKey === "sick-leave") {
        loaiText = "Nghỉ ốm (BHXH)";
        const days = details.numberOfDays || request.totalDays || 1;
        entityTitle = `Nghỉ ốm BHXH (${days} ngày): ${request.employee.fullName}`;
        const dateRange = request.startDate && request.endDate ? `${format(new Date(request.startDate), "dd/MM/yyyy")} - ${format(new Date(request.endDate), "dd/MM/yyyy")}` : "";
        chiTietTomTat = `Chế độ: **Nghỉ ốm có BHXH** | Thời gian: **${days} ngày** (${dateRange})${details.medicalFacility ? ` | Nơi khám: ${details.medicalFacility}` : ""}`;
      } else if (typeKey === "leave" || typeKey === "unpaid_leave") {
        loaiText = details.leaveType || (typeKey === "unpaid_leave" ? "Nghỉ không lương" : "Nghỉ phép năm");
        const days = details.numberOfDays || request.totalDays || 1;
        entityTitle = `Nghỉ phép (${days} ngày): ${request.employee.fullName}`;
        const dateRange = request.startDate && request.endDate ? `${format(new Date(request.startDate), "dd/MM/yyyy")} - ${format(new Date(request.endDate), "dd/MM/yyyy")}` : "";
        chiTietTomTat = `Loại phép: **${loaiText}** | Thời gian: **${days} ngày** (${dateRange})`;
      } else if (typeKey === "overtime") {
        loaiText = "Làm thêm giờ (OT)";
        const hours = details.hours || request.totalHours || 0;
        entityTitle = `Làm thêm giờ (${hours}h): ${request.employee.fullName}`;
        const dateStr = request.startDate ? format(new Date(request.startDate), "dd/MM/yyyy") : "";
        chiTietTomTat = `Số giờ: **${hours} giờ** | Ca: **${details.overtimeType || "Ngày thường"}** | Khung giờ: **${details.startTime || ""} - ${details.endTime || ""}** (${dateStr})`;
      } else if (typeKey === "late" || typeKey === "early") {
        loaiText = details.type || (typeKey === "late" ? "Đi muộn" : "Về sớm");
        const mins = details.minutes || 0;
        entityTitle = `${loaiText} (${mins} phút): ${request.employee.fullName}`;
        const dateStr = request.startDate ? format(new Date(request.startDate), "dd/MM/yyyy") : "";
        chiTietTomTat = `Hình thức: **${loaiText}** | Thời lượng: **${mins} phút** | Ngày: ${dateStr}`;
      } else {
        entityTitle = `Đề xuất cá nhân: ${request.employee.fullName}`;
        chiTietTomTat = `Nội dung: ${request.reason || "Đề xuất cá nhân"}`;
      }

      // ── 1. Tạo hoặc cập nhật hồ sơ vào TRUNG TÂM PHÊ DUYỆT (ApprovalRequest) ──
      const metadataObj = {
        personalRequestId: request.id,
        employeeId: request.employee.id,
        employeeName: request.employee.fullName,
        employeeCode: request.employee.code,
        departmentName: request.employee.departmentName,
        type: request.type,
        loaiText,
        details,
        reason: request.reason,
        startDate: request.startDate,
        endDate: request.endDate,
        forwardedBy: session.user.name,
        forwardedAt: new Date().toISOString(),
        hrNote: note || "Đã trình lãnh đạo"
      };

      const existingApproval = await prisma.approvalRequest.findFirst({
        where: {
          entityType: "PERSONAL_REQUEST",
          entityId: request.id
        }
      });

      if (existingApproval) {
        await prisma.approvalRequest.update({
          where: { id: existingApproval.id },
          data: {
            status: "pending",
            entityTitle,
            entityCode: request.id,
            metadata: JSON.stringify(metadataObj),
            updatedAt: new Date(),
            comments: {
              create: {
                authorId: session.user.id,
                authorName: session.user.name || "Phòng Nhân sự",
                authorRole: "hr",
                content: `📤 **${session.user.name}** (Phòng Nhân sự) đã trình lại Ban Giám đốc phê duyệt yêu cầu **${entityTitle}** của nhân sự **${request.employee.fullName}**${note ? `.\n\n**Ghi chú của Nhân sự:** _"${note}"_` : "."}`,
                isSystem: true
              }
            }
          }
        });
      } else {
        await prisma.approvalRequest.create({
          data: {
            entityType: "PERSONAL_REQUEST",
            entityId: request.id,
            entityCode: request.id,
            entityTitle,
            status: "pending",
            priority: "high",
            department: request.employee.departmentName || null,
            requestedById: session.user.id,
            requestedByName: `${session.user.name} (Phòng Nhân sự)`,
            metadata: JSON.stringify(metadataObj),
            comments: {
              create: [
                {
                  authorId: session.user.id,
                  authorName: session.user.name || "Phòng Nhân sự",
                  authorRole: "hr",
                  content: `📤 **${session.user.name}** (Phòng Nhân sự) đã trình Ban Giám đốc phê duyệt yêu cầu **${entityTitle}** của nhân sự **${request.employee.fullName}**${note ? `.\n\n**Ghi chú của Nhân sự:** _"${note}"_` : "."}`,
                  isSystem: true
                }
              ]
            }
          }
        });
      }

      // ── 2. Gửi thông báo tự động với nội dung chi tiết cho Ban Giám đốc ──
      const notifTitle = `⚡ Trình phê duyệt: ${loaiText} - ${request.employee.fullName}`;
      const notifContent = [
        `## ĐỀ XUẤT CẦN BAN GIÁM ĐỐC PHÊ DUYỆT`,
        `---`,
        `- **Mã yêu cầu:** \`${request.id}\``,
        `- **Nhân sự đề xuất:** **${request.employee.fullName}** (${request.employee.departmentName})`,
        `- **Loại yêu cầu:** **${loaiText}**`,
        `- **Thông tin:** ${chiTietTomTat}`,
        `- **Lý do đề xuất:** ${request.reason || details.reason || "Không có lý do chi tiết"}`,
        note ? `- **Ghi chú của Nhân sự:** _"${note}"_` : "",
        `- **Người trình duyệt:** **${session.user.name}** (Phòng Nhân sự)`,
        ``,
        `👉 Vui lòng mở **Trung tâm phê duyệt** để xem xét và đưa ra quyết định.`
      ].filter(Boolean).join("\n");

      const notifAttachments = JSON.stringify([
        {
          name: "Trung tâm phê duyệt",
          type: "link",
          url: "/board/approvals"
        },
        {
          name: "Chi tiết yêu cầu",
          type: "link",
          url: "/hr?fromAdmin=true"
        }
      ]);

      await notifyDirector(notifTitle, notifContent, session.user.id, notifAttachments);
      notifyTarget = "NONE"; // Đã gửi notifyDirector trực tiếp với nội dung phong phú
    } else {
      return new NextResponse("Invalid action", { status: 400 });
    }

    const updatedRequest = await prisma.personalRequest.update({
      where: { id },
      data: updatedData
    });

    if (notifyTarget === "USER" && request.employee.userId) {
      await notifyUser(request.employee.userId, notificationTitle, notificationContent, session.user.id);
    }

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error("[APPROVAL_PATCH]", error);
    return new NextResponse(error?.message || "Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    if (!id) return new NextResponse("Missing ID", { status: 400 });

    if (id.startsWith("stationery-")) {
      const realId = id.substring(11);
      await (prisma as any).hrSupplyRequest.delete({ where: { id: realId } });
      return NextResponse.json({ message: "Deleted successfully" });
    }

    if (id.startsWith("rec-")) {
      const realId = id.substring(4);
      await (prisma as any).recruitmentRequest.delete({ where: { id: realId } });
      return NextResponse.json({ message: "Deleted successfully" });
    }
    if (id.startsWith("train-")) {
      const realId = id.substring(6);
      await (prisma as any).trainingRequest.delete({ where: { id: realId } });
      return NextResponse.json({ message: "Deleted successfully" });
    }
    if (id.startsWith("promo-")) {
      const realId = id.substring(6);
      await prisma.$transaction(async (tx) => {
        await (tx as any).approvalRequest.deleteMany({
          where: { entityId: realId, entityType: { in: ["PROMOTION", "TRANSFER", "DEMOTION"] } }
        });
        await (tx as any).promotionRequest.delete({ where: { id: realId } });
      });
      return NextResponse.json({ message: "Deleted successfully" });
    }
    if (id.startsWith("salary-")) {
      const realId = id.substring(7);
      await (prisma as any).salaryAdjustmentRequest.delete({ where: { id: realId } });
      return NextResponse.json({ message: "Deleted successfully" });
    }

    const request = await prisma.personalRequest.findUnique({ where: { id } });
    if (!request) return new NextResponse("Yêu cầu không tồn tại", { status: 404 });

    await prisma.personalRequest.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[APPROVAL_DELETE]", error);
    return new NextResponse(error?.message || "Internal Error", { status: 500 });
  }
}
