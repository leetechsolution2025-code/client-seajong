import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyHRManager } from "@/lib/hr-notifications";

// ── GET /api/approvals/[id] ────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const item = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            replies: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!item) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    return NextResponse.json({ success: true, data: item });
  } catch (e: any) {
    console.error("[GET /api/approvals/[id]]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── PATCH /api/approvals/[id] ─────────────────────────────────────────────────
// body: { action: "approve"|"reject"|"recall"|"on_hold", note?, rejectedReason? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action, note, rejectedReason, candidateDecisions } = body;

    const userId = session.user.id as string;
    const userName = session.user.name || session.user.email || "Người dùng";

    const existing = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    let newStatus: string;
    let systemMsg: string;
    let systemEmoji: string;

    switch (action) {
      case "approve":
        newStatus = "approved";
        systemEmoji = "✅";
        systemMsg = `${systemEmoji} **${userName}** đã **PHÊ DUYỆT** hồ sơ.${note ? ` Ghi chú: _"${note}"_` : ""}`;
        if (existing.entityType === "RECRUITMENT_REPORT" && candidateDecisions) {
          const accepted = Object.values(candidateDecisions).filter(v => v === "HIRE").length;
          const rejected = Object.values(candidateDecisions).filter(v => v === "REJECT").length;
          systemMsg += `\n\n**Kết quả tuyển dụng:**\n- Chấp nhận: ${accepted}\n- Từ chối: ${rejected}`;
        }
        break;
      case "reject":
        newStatus = "rejected";
        systemEmoji = "❌";
        systemMsg = `${systemEmoji} **${userName}** đã **TỪ CHỐI** hồ sơ.${rejectedReason ? ` Lý do: _"${rejectedReason}"_` : ""}`;
        break;
      case "recall":
        newStatus = "recalled";
        systemEmoji = "↩️";
        systemMsg = `${systemEmoji} **${userName}** đã **THU HỒI** yêu cầu phê duyệt.`;
        break;
      case "on_hold":
        newStatus = "on_hold";
        systemEmoji = "⏸️";
        systemMsg = `${systemEmoji} **${userName}** đã đặt hồ sơ vào trạng thái **TẠM GIỮ**.${note ? ` Ghi chú: _"${note}"_` : ""}`;
        break;
      default:
        return NextResponse.json({ error: "action không hợp lệ" }, { status: 400 });
    }

    // Update ApprovalRequest
    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById: action === "approve" || action === "reject" ? userId : existing.approvedById,
        approvedAt: action === "approve" || action === "reject" ? new Date() : existing.approvedAt,
        note: note || existing.note,
        rejectedReason: action === "reject" ? rejectedReason : existing.rejectedReason,
        comments: {
          create: {
            authorId: userId,
            authorName: userName as string,
            authorRole: "approver",
            content: systemMsg,
            isSystem: true,
          },
        },
      },
    });

    // Đồng bộ ngược về model gốc
    await syncEntityStatus(existing.entityType, existing.entityId, action, userId, note, rejectedReason, candidateDecisions);

    // ── Gửi thông báo tự động cho người gửi yêu cầu ──────────────────────────
    try {
      if (action === "approve" || action === "reject") {
        const now = new Date();
        const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        const dateStr = now.toLocaleDateString("vi-VN");

        const isApprove = action === "approve";
        const notifTitle = isApprove ? "Hồ sơ đã được phê duyệt" : "Hồ sơ bị từ chối";
        const statusText = isApprove ? "đã được phê duyệt" : "đã bị từ chối";

        let notifContent = `Kế hoạch **"${existing.entityTitle}"** của bạn ${statusText} bởi **${userName}** lúc ${timeStr} ngày ${dateStr}.`;
        if (isApprove && existing.entityType === "RECRUITMENT_REPORT" && candidateDecisions) {
          const accepted = Object.values(candidateDecisions).filter(v => v === "HIRE").length;
          const rejected = Object.values(candidateDecisions).filter(v => v === "REJECT").length;
          notifContent += `\n\n**Kết quả nhân sự:** Chấp nhận ${accepted}, Từ chối ${rejected}.`;
        }
        if (!isApprove && rejectedReason) {
          notifContent += `\nLý do: _"${rejectedReason}"_`;
        }

        await prisma.notification.create({
          data: {
            title: notifTitle,
            content: notifContent,
            type: isApprove ? "success" : "error",
            priority: isApprove ? "normal" : "high",
            audienceType: "individual",
            audienceValue: existing.requestedById,
            createdById: userId,
            recipients: {
              create: {
                userId: existing.requestedById
              }
            }
          }
        });
      }
    } catch (notifErr) {
      console.error("[Notification Error]", notifErr);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    console.error("[PATCH /api/approvals/[id]]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { processPlanSubmission, syncMonthlyExecutionToMonthlyPlan } from "@/lib/marketing-plan";

// ── Đồng bộ status về model gốc ───────────────────────────────────────────────
async function syncEntityStatus(
  entityType: string,
  entityId: string,
  action: string,
  userId: string,
  note?: string,
  rejectedReason?: string,
  candidateDecisions?: Record<string, string>
) {
  try {
    switch (entityType) {
      case "RECRUITMENT_REPORT": {
        if (action === "approve" && candidateDecisions) {
          // Cập nhật từng ứng viên theo quyết định riêng lẻ
          for (const [candidateId, decision] of Object.entries(candidateDecisions)) {
            await (prisma as any).candidate.update({
              where: { id: candidateId },
              data: { status: decision === "HIRE" ? "Đang thử việc" : "Từ chối tiếp nhận" }
            });
          }
        } else if (action === "reject") {
          // Nếu bác bỏ toàn bộ báo cáo, chuyển tất cả ứng viên trong báo cáo đó sang trạng thái từ chối
          const existing = await prisma.approvalRequest.findUnique({ where: { id: entityId } });
          const metadata = existing?.metadata as any;
          if (metadata?.candidates) {
            const ids = metadata.candidates.map((c: any) => c.id);
            await (prisma as any).candidate.updateMany({
              where: { id: { in: ids } },
              data: { status: "Từ chối tiếp nhận" }
            });
          }
        }
        break;
      }
      case "marketing_yearly_plan": {
        const STATUS_APPROVED = "ttpd-20260423-0480-zegu"; // Đã phê duyệt
        const STATUS_REJECTED = "ttpd-20260423-9580-elhm"; // Không phê duyệt
        const STATUS_DRAFT = "ttpd-20260423-0646-ubge"; // Chưa phê duyệt

        const statusMap: Record<string, string> = {
          approve: STATUS_APPROVED,
          reject: STATUS_REJECTED,
          recall: STATUS_DRAFT,
          on_hold: STATUS_DRAFT, // Revert to draft if on hold
        };

        const targetStatus = statusMap[action] || STATUS_DRAFT;

        let updateData: any = { status: targetStatus };
        if (action === "approve") {
          updateData.approvedAt = new Date();
          updateData.approvedById = userId;
        }

        const plan = await prisma.marketingYearlyPlan.findUnique({ where: { id: entityId } }) as any;
        if (action === "approve" && plan && plan.revisionData) {
          const draftData = JSON.parse(plan.revisionData);
          // Hợp nhất dữ liệu nháp vào các bảng chính
          await processPlanSubmission(entityId, { ...draftData, ...updateData });
          return;
        }

        await prisma.marketingYearlyPlan.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      }
      case "expense": {
        const statusMap: Record<string, string> = {
          approve: "approved",
          reject: "rejected",
          recall: "pending",
          on_hold: "pending",
        };
        await prisma.expense.update({
          where: { id: entityId },
          data: { trangThai: statusMap[action] || "pending" },
        });
        break;
      }
      case "marketing_monthly_execution": {
        if (action === "approve") {
          // entityId: `${planId}-m${monthNum}-${taskName}`
          const parts = entityId.split("-");
          if (parts.length >= 3) {
            const planId = parts.slice(0, parts.length - 2).join("-");
            const monthStr = parts[parts.length - 2].replace("m", "");
            const monthNum = parseInt(monthStr);
            const taskName = parts[parts.length - 1];

            await syncMonthlyExecutionToMonthlyPlan(planId, monthNum, taskName);
          }
        }
        break;
      }
      case "SALARY_ADJUSTMENT": {
        const statusMap: Record<string, string> = {
          approve: "APPROVED",
          reject: "REJECTED",
          recall: "SUBMITTED",
          on_hold: "WAITING_APPROVAL",
        };
        await (prisma as any).salaryAdjustmentRequest.update({
          where: { id: entityId },
          data: { status: statusMap[action] || "WAITING_APPROVAL" },
        });
        break;
      }
      case "RECRUITMENT": {
        const statusMap: Record<string, string> = {
          approve: "Approved",
          reject: "Rejected",
          recall: "Pending",
          on_hold: "Pending",
        };
        const updated = await (prisma as any).recruitmentRequest.update({
          where: { id: entityId },
          data: { status: statusMap[action] || "Pending" },
        });

        if (action === "approve") {
          await notifyHRManager(
            "Yêu cầu tuyển dụng đã được chấp nhận",
            `Yêu cầu tuyển dụng vị trí ${updated.position} đã được Giám đốc chấp thuận. Hãy bắt đầu quy trình tìm kiếm ứng viên.`,
            userId
          );
        }
        break;
      }
      case "PROMOTION":
      case "TRANSFER": {
        if (action === "approve") {
          await (prisma as any).promotionRequest.update({
            where: { id: entityId },
            data: {
              status: "CONCLUSION",
              directorApproved: true,
              directorNote: note
            }
          });
        } else if (action === "reject") {
          await (prisma as any).promotionRequest.update({
            where: { id: entityId },
            data: {
              status: "CONCLUSION",
              directorApproved: false,
              directorNote: rejectedReason || note
            }
          });
        } else if (action === "recall") {
          await (prisma as any).promotionRequest.update({
            where: { id: entityId },
            data: { status: "INTERVIEWING" }
          });
        }
        break;
      }
      // Mở rộng thêm các entityType khác ở đây
      default:
        break;
    }
  } catch (e) {
    console.error(`[syncEntityStatus] entityType=${entityType} id=${entityId}`, e);
  }
}
