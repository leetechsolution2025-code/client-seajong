import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { action, note, rejectedReason } = body;

    const userId   = session.user.id as string;
    const userName = session.user.name || session.user.email || "Người dùng";

    const existing = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    let newStatus: string;
    let systemMsg: string;
    let systemEmoji: string;

    switch (action) {
      case "approve":
        newStatus  = "approved";
        systemEmoji = "✅";
        systemMsg  = `${systemEmoji} **${userName}** đã **PHÊ DUYỆT** hồ sơ.${note ? ` Ghi chú: _"${note}"_` : ""}`;
        break;
      case "reject":
        newStatus  = "rejected";
        systemEmoji = "❌";
        systemMsg  = `${systemEmoji} **${userName}** đã **TỪ CHỐI** hồ sơ.${rejectedReason ? ` Lý do: _"${rejectedReason}"_` : ""}`;
        break;
      case "recall":
        newStatus  = "recalled";
        systemEmoji = "↩️";
        systemMsg  = `${systemEmoji} **${userName}** đã **THU HỒI** yêu cầu phê duyệt.`;
        break;
      case "on_hold":
        newStatus  = "on_hold";
        systemEmoji = "⏸️";
        systemMsg  = `${systemEmoji} **${userName}** đã đặt hồ sơ vào trạng thái **TẠM GIỮ**.${note ? ` Ghi chú: _"${note}"_` : ""}`;
        break;
      default:
        return NextResponse.json({ error: "action không hợp lệ" }, { status: 400 });
    }

    // Update ApprovalRequest
    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status:        newStatus,
        approvedById:  action === "approve" || action === "reject" ? userId : existing.approvedById,
        approvedAt:    action === "approve" || action === "reject" ? new Date() : existing.approvedAt,
        note:          note || existing.note,
        rejectedReason: action === "reject" ? rejectedReason : existing.rejectedReason,
        comments: {
          create: {
            authorId:   userId,
            authorName: userName as string,
            authorRole: "approver",
            content:    systemMsg,
            isSystem:   true,
          },
        },
      },
    });

    // Đồng bộ ngược về model gốc
    await syncEntityStatus(existing.entityType, existing.entityId, action, userId, rejectedReason);

    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    console.error("[PATCH /api/approvals/[id]]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { processPlanSubmission } from "@/lib/marketing-plan";

// ── Đồng bộ status về model gốc ───────────────────────────────────────────────
async function syncEntityStatus(
  entityType: string,
  entityId: string,
  action: string,
  userId: string,
  rejectedReason?: string
) {
  try {
    switch (entityType) {
      case "marketing_yearly_plan": {
        const STATUS_APPROVED = "ttpd-20260423-0480-zegu"; // Đã phê duyệt
        const STATUS_REJECTED = "ttpd-20260423-9580-elhm"; // Không phê duyệt
        const STATUS_DRAFT    = "ttpd-20260423-0646-ubge"; // Chưa phê duyệt

        const statusMap: Record<string, string> = {
          approve: STATUS_APPROVED,
          reject:  STATUS_REJECTED, 
          recall:  STATUS_DRAFT, 
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
          reject:  "rejected",
          recall:  "pending",
          on_hold: "pending",
        };
        await prisma.expense.update({
          where: { id: entityId },
          data: { trangThai: statusMap[action] || "pending" },
        });
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
