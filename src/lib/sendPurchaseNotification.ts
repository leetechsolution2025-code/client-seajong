import { prisma } from "@/lib/prisma";

/**
 * Gửi thông báo đến người tạo phiếu yêu cầu mua hàng.
 * Không throw — lỗi chỉ log ra console, không ảnh hưởng flow chính.
 */
export async function sendPurchaseNotification({
  purchaseRequestId,
  actorId,
  title,
  content,
  type = "info",
  priority = "normal",
}: {
  purchaseRequestId: string;
  actorId: string;
  title: string;
  content: string;
  type?: "info" | "success" | "warning" | "error";
  priority?: "normal" | "high" | "urgent";
}) {
  try {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      select: { createdById: true, code: true },
    });

    console.log(`[notif] req=${purchaseRequestId} createdBy=${pr?.createdById} actor=${actorId}`);

    if (!pr?.createdById) {
      console.warn(`[notif] No createdById — skip`);
      return;
    }

    const recipientId = pr.createdById;

    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        type,
        priority,
        audienceType:  "individual",
        audienceValue: recipientId,
        createdById:   actorId,
      },
    });

    await prisma.notificationRecipient.upsert({
      where:  { notificationId_userId: { notificationId: notification.id, userId: recipientId } },
      update: {},
      create: { notificationId: notification.id, userId: recipientId },
    });

    console.log(`[notif] Created ${notification.id} → ${recipientId}`);
  } catch (err) {
    console.error("[notif] Error:", err);
  }
}

// ── Nội dung chuẩn cho từng sự kiện ─────────────────────────────────────────

export function notifyContent(
  event: "tu-choi" | "khoi-phuc" | "dang-xu-ly" | "da-xu-ly" | "tao-don" | "tao-don-mot-phan",
  code: string | null,
  extra?: string
) {
  const ma = code ? `**${code}**` : "của bạn";
  switch (event) {
    case "tu-choi":
      return {
        title:    `Phiếu yêu cầu ${code ?? ""} bị từ chối`,
        content:  `Phiếu yêu cầu mua hàng ${ma} đã bị **từ chối**. Vui lòng liên hệ phòng mua hàng để biết thêm chi tiết.`,
        type:     "error"   as const,
        priority: "high"    as const,
      };
    case "khoi-phuc":
      return {
        title:    `Phiếu yêu cầu ${code ?? ""} được khôi phục`,
        content:  `Phiếu yêu cầu mua hàng ${ma} đã được **khôi phục** về trạng thái "Chưa xử lý".`,
        type:     "info"    as const,
        priority: "normal"  as const,
      };
    case "dang-xu-ly":
      return {
        title:    `Phiếu yêu cầu ${code ?? ""} đang được xử lý`,
        content:  `Phiếu yêu cầu mua hàng ${ma} đang được phòng mua hàng **xử lý**.`,
        type:     "info"    as const,
        priority: "normal"  as const,
      };
    case "tao-don-mot-phan":
      return {
        title:    `Đơn mua đã tạo từ phiếu ${code ?? ""}`,
        content:  `Một phần hàng hóa trong phiếu ${ma} đã được đặt hàng${extra ? `: ${extra}` : ""}. Một số mặt hàng vẫn đang chờ xử lý.`,
        type:     "success" as const,
        priority: "normal"  as const,
      };
    case "tao-don":
    case "da-xu-ly":
      return {
        title:    `Phiếu yêu cầu ${code ?? ""} đã xử lý hoàn tất`,
        content:  `Tất cả hàng hóa trong phiếu ${ma} đã được **đặt hàng** xong${extra ? `: ${extra}` : ""}.`,
        type:     "success" as const,
        priority: "high"    as const,
      };
  }
}
