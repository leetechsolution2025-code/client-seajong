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
      updatedData = { hrApproved: true, hrNote: "Đã trình lãnh đạo" };
      notificationTitle = "🚀 Đề xuất cần phê duyệt";
      notificationContent = `Có một đề xuất từ ${request.employee.fullName} cần bạn phê duyệt.`;
      notifyTarget = "DIRECTOR";
    } else {
      return new NextResponse("Invalid action", { status: 400 });
    }

    const updatedRequest = await prisma.personalRequest.update({
      where: { id },
      data: updatedData
    });

    if (notifyTarget === "USER" && request.employee.userId) {
      await notifyUser(request.employee.userId, notificationTitle, notificationContent, session.user.id);
    } else if (notifyTarget === "DIRECTOR") {
      await notifyDirector(notificationTitle, notificationContent, session.user.id);
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
    if (request.status === "APPROVED") return new NextResponse("Không thể xóa đơn đã duyệt", { status: 400 });

    await prisma.personalRequest.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[APPROVAL_DELETE]", error);
    return new NextResponse(error?.message || "Internal Error", { status: 500 });
  }
}
