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
        let notifTitle = isApprove ? "Hồ sơ đã được phê duyệt" : "Hồ sơ bị từ chối";
        const statusText = isApprove ? "đã được phê duyệt" : "đã bị từ chối";

        let notifContent = "";
        if (existing.entityType === "purchase_order") {
          notifTitle = isApprove ? "Đơn mua hàng đã được phê duyệt" : "Đơn mua hàng bị từ chối";
          notifContent = `Yêu cầu phê duyệt đơn mua hàng **${existing.entityCode || existing.entityTitle}** của bạn ${statusText} bởi **${userName}** lúc ${timeStr} ngày ${dateStr}.`;
          if (!isApprove && rejectedReason) {
            notifContent += `\nLý do: _"${rejectedReason}"_`;
          }
        } else {
          notifContent = `Kế hoạch **"${existing.entityTitle}"** của bạn ${statusText} bởi **${userName}** lúc ${timeStr} ngày ${dateStr}.`;
          if (isApprove && existing.entityType === "RECRUITMENT_REPORT" && candidateDecisions) {
            const accepted = Object.values(candidateDecisions).filter(v => v === "HIRE").length;
            const rejected = Object.values(candidateDecisions).filter(v => v === "REJECT").length;
            notifContent += `\n\n**Kết quả nhân sự:** Chấp nhận ${accepted}, Từ chối ${rejected}.`;
          }
          if (!isApprove && rejectedReason) {
            notifContent += `\nLý do: _"${rejectedReason}"_`;
          }
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

function parseAssigneeName(description: string): string | null {
  if (!description) return null;
  const regex = /Người thực hiện:\s*([^|.]+)/i;
  const match = description.match(regex);
  return match ? match[1].trim() : null;
}

function calculateDueDate(year: number, month: number, description: string): Date {
  const lastDay = new Date(year, month, 0, 23, 59, 59);
  if (!description) return lastDay;

  const regex = /Thời\s*gian\s*thực\s*hiện:\s*Tuần\s*([\d,\s]+)/i;
  const match = description.match(regex);
  if (!match) return lastDay;

  const weeks = match[1]
    .split(",")
    .map(w => parseInt(w.trim(), 10))
    .filter(w => !isNaN(w));

  if (weeks.length === 0) return lastDay;

  const maxWeek = Math.max(...weeks);
  if (maxWeek === 1) {
    return new Date(year, month - 1, 7, 23, 59, 59);
  } else if (maxWeek === 2) {
    return new Date(year, month - 1, 14, 23, 59, 59);
  } else if (maxWeek === 3) {
    return new Date(year, month - 1, 21, 23, 59, 59);
  } else {
    return lastDay;
  }
}

async function processAndCreateTask({
  label,
  description,
  notes,
  planCode,
  month,
  year,
  approverId
}: {
  label: string;
  description: string;
  notes?: string;
  planCode: string;
  month: any;
  year: any;
  approverId: string;
}) {
  const assigneeName = parseAssigneeName(description);
  if (!assigneeName) return;

  try {
    let employee = await prisma.employee.findFirst({
      where: { fullName: assigneeName },
      select: { userId: true }
    });

    if (!employee) {
      const allEmps = await prisma.employee.findMany({
        select: { fullName: true, userId: true }
      });
      const matched = allEmps.find(e => e.fullName.toLowerCase() === assigneeName.toLowerCase());
      if (matched) {
        employee = { userId: matched.userId };
      }
    }

    if (!employee || !employee.userId) {
      console.log(`[syncEntityStatus] No active user account found for employee: ${assigneeName}`);
      return;
    }

    const taskTitle = `[KH MKT] ${label}`;
    const taskDescription = `Hạng mục: ${label}\n` +
      `Chi tiết: ${description || "—"}\n` +
      (notes ? `Ghi chú: ${notes}\n` : "") +
      `\n---\n` +
      `Thông tin phê duyệt:\n` +
      `- Kế hoạch: ${planCode} (Tháng ${month}/${year})\n` +
      `- Trạng thái: Đã phê duyệt và giao việc tự động`;

    const existingTask = await prisma.task.findFirst({
      where: {
        assigneeId: employee.userId,
        title: taskTitle,
        description: {
          contains: `Kế hoạch: ${planCode}`
        }
      }
    });

    const parsedYear = parseInt(year, 10);
    const parsedMonth = parseInt(month, 10);
    const dueDate = calculateDueDate(parsedYear, parsedMonth, description);

    if (existingTask) {
      await prisma.task.update({
        where: { id: existingTask.id },
        data: {
          description: taskDescription,
          dueDate: dueDate,
          creatorId: approverId
        }
      });
      console.log(`[syncEntityStatus] Updated existing task for ${assigneeName}: ${taskTitle}`);
    } else {
      await prisma.task.create({
        data: {
          title: taskTitle,
          description: taskDescription,
          status: "pending",
          priority: "medium",
          assigneeId: employee.userId,
          creatorId: approverId,
          dueDate: dueDate
        }
      });
      console.log(`[syncEntityStatus] Created new task for ${assigneeName}: ${taskTitle}`);
    }
  } catch (err) {
    console.error(`[syncEntityStatus] Error creating task for ${assigneeName}:`, err);
  }
}

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
      case "STATIONERY_PURCHASE": {
        const statusMap: Record<string, string> = {
          approve: "ACCOUNTING_APPROVED",
          reject: "REJECTED",
          recall: "PENDING",
          on_hold: "PENDING",
        };
        await (prisma as any).hrSupplyRequest.update({
          where: { id: entityId },
          data: { status: statusMap[action] || "PENDING" },
        });
        break;
      }
      case "STATIONERY_PURCHASE_DIRECTOR": {
        const statusMap: Record<string, string> = {
          approve: "APPROVED",
          reject: "REJECTED",
          recall: "ACCOUNTING_APPROVED",
          on_hold: "ACCOUNTING_APPROVED",
        };
        await (prisma as any).hrSupplyRequest.update({
          where: { id: entityId },
          data: { status: statusMap[action] || "ACCOUNTING_APPROVED" },
        });
        break;
      }
      case "purchase_order": {
        const statusMap: Record<string, string> = {
          approve: "ordered",
          reject: "cancelled",
          recall: "draft",
          on_hold: "draft",
        };
        const nextStatus = statusMap[action] || "draft";

        const po = await prisma.purchaseOrder.findUnique({
          where: { id: entityId },
          select: { trangThai: true, code: true, supplierId: true, purchaseRequestId: true }
        });
        if (po && po.trangThai !== nextStatus) {
          const statusLabels: Record<string, string> = {
            "draft": "Đang tạo đơn",
            "ordered": "Đã đặt hàng",
            "received": "Đã nhận hàng",
            "disputed": "Đang khiếu nại",
            "completed": "Hoàn thành",
            "paused": "Tạm dừng",
            "cancelled": "Huỷ bỏ",
          };
          const oldLabel = statusLabels[po.trangThai] ?? po.trangThai;
          const newLabel = statusLabels[nextStatus] ?? nextStatus;

          await prisma.$transaction([
            prisma.purchaseOrder.update({
              where: { id: entityId },
              data: { trangThai: nextStatus }
            }),
            prisma.purchaseOrderActivity.create({
              data: {
                purchaseOrderId: entityId,
                loai: "system",
                ngay: new Date(),
                nguoiThucHien: "Tài chính - Kế toán",
                ketQua: `Trạng thái đơn hàng thay đổi từ [${oldLabel}] sang [${newLabel}] (Phê duyệt ngân sách).`,
              }
            })
          ]);

          // Gửi thông báo khi đơn hàng được chuyển sang trạng thái Đặt hàng (ordered)
          if (nextStatus === "ordered") {
            try {
              const poFull = await prisma.purchaseOrder.findUnique({
                where: { id: entityId },
                include: {
                  items: true,
                  supplier: { select: { name: true } }
                }
              });
              if (poFull) {
                const poCode = poFull.code ?? entityId;
                const supplierName = poFull.supplier?.name ?? "Nhà cung cấp";
                const ngayNhanStr = poFull.ngayNhan ? new Date(poFull.ngayNhan).toLocaleDateString("vi-VN") : "Chưa xác định";

                 // 1. Gửi thông báo cho thủ kho (các user thuộc bộ phận Kho/Logistics/Thủ kho)
                 const storekeepers = await prisma.employee.findMany({
                   where: {
                     OR: [
                       { departmentName: { contains: "Kho" } },
                       { departmentCode: { contains: "logistics" } },
                       { departmentCode: { contains: "inventory" } },
                       { position: { contains: "Thủ kho" } }
                     ],
                     userId: { not: null }
                   },
                   select: { userId: true }
                 });
                 const storekeeperUserIds = storekeepers.map(s => s.userId).filter(Boolean) as string[];
                 const uniqueStorekeeperIds = [...new Set(storekeeperUserIds)];

                 const logisNotifTitle = `📦 Ngày nhận hàng dự kiến đơn hàng ${poCode}`;
                 const logisNotifContent = `Đơn mua hàng **${poCode}** đã được duyệt ngân sách và đặt hàng từ nhà cung cấp **${supplierName}**.\n` +
                   `**Ngày nhận hàng dự kiến: ${ngayNhanStr}**.\n\n` +
                   `Chi tiết các mặt hàng đã đặt:\n` +
                   poFull.items.map((i: any) => `• ${i.tenHang}: ${i.soLuong} ${i.donVi ?? ""}${i.ngayGiao ? ` (Dự kiến giao: ${new Date(i.ngayGiao).toLocaleDateString("vi-VN")})` : ""}`).join("\n");

                 if (uniqueStorekeeperIds.length > 0) {
                   const logisNotif = await prisma.notification.create({
                     data: {
                       title: logisNotifTitle,
                       content: logisNotifContent,
                       type: "info",
                       priority: "normal",
                       audienceType: "group",
                       audienceValue: JSON.stringify(uniqueStorekeeperIds),
                       createdById: userId,
                     }
                   });

                   await Promise.allSettled(
                     uniqueStorekeeperIds.map(uid =>
                       prisma.notificationRecipient.create({
                         data: { notificationId: logisNotif.id, userId: uid }
                       })
                     )
                   );

                    // 1.2 Tự động tạo công việc cá nhân cho các thủ kho
                    await Promise.allSettled(
                      uniqueStorekeeperIds.map(async (skId) => {
                        try {
                          const skTaskTitle = `[Nhập kho] Đơn mua hàng ${poCode}`;
                          const existingSkTask = await prisma.task.findFirst({
                            where: { assigneeId: skId, title: skTaskTitle }
                          });

                          const skTaskDescription = `Đơn mua hàng **${poCode}** từ nhà cung cấp **${supplierName}** đã được duyệt ngân sách và đặt hàng.\n` +
                            `**Ngày nhận hàng dự kiến: ${ngayNhanStr}**.\n\n` +
                            `Chi tiết mặt hàng:\n` +
                            poFull.items.map((i: any) => `• ${i.tenHang}: ${i.soLuong} ${i.donVi ?? ""}`).join("\n") +
                            `\n\nVui lòng chuẩn bị kho bãi, theo dõi tiến độ giao nhận và thực hiện làm thủ tục nhập kho khi hàng về.`;

                          if (existingSkTask) {
                            await prisma.task.update({
                              where: { id: existingSkTask.id },
                              data: {
                                description: skTaskDescription,
                                dueDate: poFull.ngayNhan || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                                creatorId: userId,
                              }
                            });
                          } else {
                            await prisma.task.create({
                              data: {
                                title: skTaskTitle,
                                description: skTaskDescription,
                                status: "pending",
                                priority: "medium",
                                assigneeId: skId,
                                creatorId: userId,
                                dueDate: poFull.ngayNhan || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                              }
                            });
                          }
                        } catch (skTaskErr) {
                          console.error(`[syncEntityStatus] Failed to create task for storekeeper ${skId}:`, skTaskErr);
                        }
                      })
                    );
                  }

                // 2. Gửi thông báo cho người tạo yêu cầu mua hàng (PR Creators)
                const creatorMap = new Map<string, { prCodes: Set<string>; items: Array<{ tenHang: string; soLuong: number; donVi: string | null }> }>();

                if (poFull.purchaseRequestId) {
                  const pr = await prisma.purchaseRequest.findUnique({
                    where: { id: poFull.purchaseRequestId },
                    select: { id: true, code: true, createdById: true }
                  });
                  if (pr?.createdById) {
                    creatorMap.set(pr.createdById, {
                      prCodes: new Set(pr.code ? [pr.code] : []),
                      items: poFull.items.map((i: any) => ({ tenHang: i.tenHang, soLuong: i.soLuong, donVi: i.donVi }))
                    });
                  }
                } else {
                  const matchingPrItems = await prisma.purchaseRequestItem.findMany({
                    where: {
                      tenHang: { in: poFull.items.map((i: any) => i.tenHang) },
                      supplierId: poFull.supplierId,
                      trangThaiXuLy: "da-tao-don"
                    },
                    include: {
                      purchaseRequest: {
                        select: {
                          id: true,
                          code: true,
                          createdById: true
                        }
                      }
                    }
                  });

                  for (const prItem of matchingPrItems) {
                    const creatorId = prItem.purchaseRequest?.createdById;
                    if (!creatorId) continue;

                    if (!creatorMap.has(creatorId)) {
                      creatorMap.set(creatorId, { prCodes: new Set(), items: [] });
                    }
                    const entry = creatorMap.get(creatorId)!;
                    if (prItem.purchaseRequest.code) {
                      entry.prCodes.add(prItem.purchaseRequest.code);
                    }
                    const poItem = poFull.items.find((i: any) => i.tenHang === prItem.tenHang);
                    entry.items.push({
                      tenHang: prItem.tenHang,
                      soLuong: poItem?.soLuong ?? prItem.soLuong,
                      donVi: poItem?.donVi ?? prItem.donVi
                    });
                  }
                }

                for (const [creatorId, entry] of creatorMap.entries()) {
                  const prCodesStr = Array.from(entry.prCodes).join(", ");
                  const creatorNotifTitle = `Mặt hàng bạn yêu cầu đã được đặt (Đơn hàng ${poCode})`;
                  const creatorNotifContent = `Các mặt hàng bạn yêu cầu trong phiếu **${prCodesStr || "yêu cầu mua hàng"}** đã được đặt hàng thành công trong đơn mua hàng **${poCode}**.\n` +
                    `Ngày giao hàng dự kiến: **${ngayNhanStr}**.\n\n` +
                    `Chi tiết các mặt hàng:\n` +
                    entry.items.map(i => `• ${i.tenHang}: ${i.soLuong} ${i.donVi ?? ""}`).join("\n");

                  const creatorNotif = await prisma.notification.create({
                    data: {
                      title: creatorNotifTitle,
                      content: creatorNotifContent,
                      type: "success",
                      priority: "normal",
                      audienceType: "individual",
                      audienceValue: creatorId,
                      createdById: userId,
                    }
                  });

                  await prisma.notificationRecipient.create({
                    data: { notificationId: creatorNotif.id, userId: creatorId }
                  });
                }

                // 3. Tự động cập nhật công nợ nhà cung cấp (Debt)
                try {
                  const refId = poFull.code || entityId;
                  const statusVal = poFull.daThanhToan >= poFull.tongTien
                    ? "PAID"
                    : poFull.daThanhToan > 0
                      ? "PARTIAL"
                      : "UNPAID";

                  const existingDebt = await prisma.debt.findFirst({
                    where: { referenceId: refId, type: "phai-tra" }
                  });

                  if (existingDebt) {
                    await prisma.debt.update({
                      where: { id: existingDebt.id },
                      data: {
                        partnerName: supplierName,
                        amount: poFull.tongTien,
                        paidAmount: poFull.daThanhToan,
                        dueDate: poFull.ngayNhan,
                        status: statusVal,
                        description: `Công nợ từ đơn mua hàng ${refId}`,
                      }
                    });
                  } else {
                    await prisma.debt.create({
                      data: {
                        type: "phai-tra",
                        partnerName: supplierName,
                        amount: poFull.tongTien,
                        paidAmount: poFull.daThanhToan,
                        dueDate: poFull.ngayNhan,
                        status: statusVal,
                        description: `Công nợ từ đơn mua hàng ${refId}`,
                        referenceId: refId,
                      }
                    });
                  }
                } catch (debtErr) {
                  console.error("[syncEntityStatus] Failed to sync supplier debt:", debtErr);
                }

                // 4. Tạo công việc cá nhân cho người tạo yêu cầu (requesterId)
                try {
                  const approvalReq = await prisma.approvalRequest.findFirst({
                    where: { entityType: "purchase_order", entityId: entityId },
                    select: { requestedById: true }
                  });
                  const requesterId = approvalReq?.requestedById;

                  if (requesterId) {
                    const taskTitle = `Thực hiện đơn mua hàng ${poCode}`;
                    const existingTask = await prisma.task.findFirst({
                      where: { assigneeId: requesterId, title: taskTitle }
                    });

                    const taskDescription = `Đơn mua hàng **${poCode}** trị giá **${poFull.tongTien.toLocaleString("vi-VN")} đ** từ nhà cung cấp **${supplierName}** đã được phê duyệt ngân sách.\n` +
                      `Ngày giao hàng dự kiến: **${ngayNhanStr}**.\n\n` +
                      `Vui lòng theo dõi tiến độ giao nhận hàng, kiểm kho và làm thủ tục thanh toán.`;

                    if (existingTask) {
                      await prisma.task.update({
                        where: { id: existingTask.id },
                        data: {
                          description: taskDescription,
                          dueDate: poFull.ngayNhan || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                          creatorId: userId,
                        }
                      });
                    } else {
                      await prisma.task.create({
                        data: {
                          title: taskTitle,
                          description: taskDescription,
                          status: "pending",
                          priority: "high",
                          assigneeId: requesterId,
                          creatorId: userId,
                          dueDate: poFull.ngayNhan || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                        }
                      });
                    }
                  }
                } catch (taskErr) {
                  console.error("[syncEntityStatus] Failed to create personal task:", taskErr);
                }
              }
            } catch (err) {
              console.error("[syncEntityStatus] Failed to send ordered notifications:", err);
            }
          }
        }
        break;
      }
      case "marketing_proposal": {
        const statusMap: Record<string, string> = {
          approve: "approved",
          reject: "rejected",
          recall: "draft",
          on_hold: "draft",
        };
        const nextStatus = statusMap[action] || "draft";

        const appReq = await prisma.approvalRequest.findFirst({
          where: {
            entityType: "marketing_proposal",
            entityId: entityId
          }
        });

        if (appReq && appReq.metadata) {
          try {
            const { year, month } = JSON.parse(appReq.metadata);
            if (year && month) {
              const plan = await prisma.masterYearlyPlan.findUnique({
                where: { year: parseInt(year, 10) }
              });
              if (plan) {
                const planObj = JSON.parse(plan.planData) || {};
                if (planObj.mkt_proposals && planObj.mkt_proposals[month]) {
                  planObj.mkt_proposals[month].status = nextStatus;

                  await prisma.masterYearlyPlan.update({
                    where: { year: parseInt(year, 10) },
                    data: {
                      planData: JSON.stringify(planObj)
                    }
                  });
                }
              }
            }
          } catch (jsonErr) {
            console.error("[syncEntityStatus] Error parsing metadata or updating master plan:", jsonErr);
          }
        }
        break;
      }
      case "marketing_monthly_plan": {
        const statusMap: Record<string, string> = {
          approve: "approved",
          reject: "rejected",
          recall: "draft",
          on_hold: "draft",
        };
        const nextStatus = statusMap[action] || "draft";

        const appReq = await prisma.approvalRequest.findFirst({
          where: {
            entityType: "marketing_monthly_plan",
            entityId: entityId
          }
        });

        if (appReq && appReq.metadata) {
          try {
            const { year, month } = JSON.parse(appReq.metadata);
            if (year && month) {
              const plan = await prisma.masterYearlyPlan.findUnique({
                where: { year: parseInt(year, 10) }
              });
              if (plan) {
                const planObj = JSON.parse(plan.planData) || {};
                if (!planObj.mkt_monthly_plans) {
                  planObj.mkt_monthly_plans = {};
                }
                if (!planObj.mkt_monthly_plans[month]) {
                  planObj.mkt_monthly_plans[month] = {};
                }
                planObj.mkt_monthly_plans[month].status = nextStatus;

                await prisma.masterYearlyPlan.update({
                  where: { year: parseInt(year, 10) },
                  data: {
                    planData: JSON.stringify(planObj)
                  }
                });

                if (action === "approve") {
                  const mPlan = planObj.mkt_monthly_plans[month];
                  const planCode = mPlan?.code || appReq.entityCode || `KH-MKT-${month}${year}`;

                  if (mPlan && mPlan.items) {
                    for (const [key, mainTask] of Object.entries(mPlan.items) as any) {
                      // Process main task
                      await processAndCreateTask({
                        label: mainTask.label,
                        description: mainTask.description,
                        notes: mainTask.notes,
                        planCode,
                        month,
                        year,
                        approverId: userId
                      });

                      // Process subtasks
                      if (mainTask.subTasks && mainTask.subTasks.length > 0) {
                        for (const sub of mainTask.subTasks) {
                          await processAndCreateTask({
                            label: `${mainTask.label} - ${sub.label}`,
                            description: sub.description,
                            notes: sub.notes,
                            planCode,
                            month,
                            year,
                            approverId: userId
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (jsonErr) {
            console.error("[syncEntityStatus] Error parsing metadata or updating monthly plan:", jsonErr);
          }
        }
        break;
      }
      // Mở rộng thêm các entityType khác ở đây
      case "master_yearly_plan": {
        const statusMap: Record<string, string> = {
          approve: "approved",
          reject: "rejected",
          recall: "draft",
          on_hold: "draft",
        };
        const nextStatus = statusMap[action] || "draft";

        const appReq = await prisma.approvalRequest.findFirst({
          where: {
            entityType: "master_yearly_plan",
            entityId: entityId
          }
        });

        if (appReq && appReq.metadata) {
          try {
            const { year } = JSON.parse(appReq.metadata);
            if (year) {
              await prisma.masterYearlyPlan.update({
                where: { year: parseInt(year, 10) },
                data: {
                  status: nextStatus
                }
              });
            }
          } catch (jsonErr) {
            console.error("[syncEntityStatus] Error parsing metadata or updating master plan status:", jsonErr);
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error(`[syncEntityStatus] entityType=${entityType} id=${entityId}`, e);
  }
}
