import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPurchaseNotification } from "@/lib/sendPurchaseNotification";

/**
 * POST /api/plan-finance/purchase-requests/[id]/create-orders
 * Body: { assignments: Array<{ itemId, supplierId, donGia, skip }> }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: purchaseRequestId } = await params;

  try {
    const body = await req.json();
    const { assignments } = body as {
      assignments: Array<{
        itemId: string;
        supplierId: string | null;
        donGia: number;
        skip: boolean;
        ngayGiao?: string;
      }>;
    };

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: "Thiếu dữ liệu phân công" }, { status: 400 });
    }

    const ids = purchaseRequestId.split(",");

    // Xác nhận phiếu YC tồn tại
    const purchaseRequests = await prisma.purchaseRequest.findMany({
      where: { id: { in: ids } },
      include: { items: true },
    });

    if (purchaseRequests.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy phiếu yêu cầu" }, { status: 404 });
    }

    // Map itemId → thông tin item gốc across all requests
    const allItems = purchaseRequests.flatMap((pr) => pr.items);
    const itemMap = new Map(allItems.map((i) => [i.id, i]));

    // ── Phân nhóm theo NCC ──────────────────────────────────────────────────────
    const supplierGroups = new Map<string, typeof assignments>();
    const skippedIds: string[] = [];

    for (const a of assignments) {
      if (a.skip) {
        skippedIds.push(a.itemId);
      } else if (a.supplierId) {
        const group = supplierGroups.get(a.supplierId) ?? [];
        group.push(a);
        supplierGroups.set(a.supplierId, group);
      }
    }

    const createdOrders: { code: string | null; supplierName: string; soMatHang: number }[] = [];
    const orderedItemDetails: {
      code: string;
      supplierName: string;
      tongTien: number;
      items: { tenHang: string; soLuong: number; donVi: string | null; donGia: number; thanhTien: number }[];
    }[] = [];

    // ── Tạo đơn mua cho mỗi NCC ─────────────────────────────────────────────────
    for (const [supplierId, group] of supplierGroups.entries()) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { name: true } });

      // Sinh mã đơn mua
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
      const existing = await prisma.purchaseOrder.count({ where: { code: { startsWith: `DH-${dateStr}` } } });
      const code = `DH-${dateStr}-${String(existing + 1).padStart(4, "0")}`;

      const orderItems = group.map((a, idx) => {
        const item = itemMap.get(a.itemId)!;
        const donGia = a.donGia ?? item.donGiaDK;
        return {
          inventoryItemId: item.inventoryItemId,
          tenHang:    item.tenHang,
          donVi:      item.donVi,
          soLuong:    item.soLuong,
          donGia,
          thanhTien:  item.soLuong * donGia,
          ghiChu:     item.ghiChu,
          sortOrder:  idx,
          ngayGiao:   a.ngayGiao ? new Date(a.ngayGiao) : null,
        };
      });

      const tongTien = orderItems.reduce((s, i) => s + i.thanhTien, 0);
      const supplierName = supplier?.name ?? supplierId;

      const firstNgayGiao = group[0]?.ngayGiao;
      const ngayNhanVal = firstNgayGiao ? new Date(firstNgayGiao) : null;

      const order = await (prisma as any).purchaseOrder.create({
        data: {
          code,
          trangThai: "draft",
          tongTien,
          supplierId: supplierId || null,
          purchaseRequestId: purchaseRequestId.includes(",") ? null : purchaseRequestId,
          items: { create: orderItems },
          ngayDat: new Date(),
          ngayNhan: ngayNhanVal,
        },
        include: { items: true },
      }) as { id: string; items: { id: string }[] };

      // Tạo ApprovalRequest cho đơn mua hàng này
      try {
        const userId = session.user.id;
        const userName = session.user.name || "Hệ thống";
        const supplierNameStr = supplierName || "Chưa xác định";

        await prisma.approvalRequest.create({
          data: {
            entityType: "purchase_order",
            entityId: order.id,
            entityCode: code,
            entityTitle: `Phê duyệt đơn mua hàng ${code} - Nhà cung cấp: ${supplierNameStr}`,
            status: "pending",
            priority: "high",
            requestedById: userId,
            requestedByName: userName,
            metadata: JSON.stringify({
              supplierId: supplierId || null,
              supplierName: supplierNameStr,
              totalAmount: tongTien,
            }),
            comments: {
              create: [
                {
                  authorId: userId,
                  authorName: userName,
                  authorRole: "requester",
                  content: `📤 **${userName}** đã trình phê duyệt đơn mua hàng **${code}** trị giá **${tongTien.toLocaleString("vi-VN")} đ** lên Trưởng phòng Tài chính - Kế toán.`,
                  isSystem: true
                }
              ]
            }
          }
        });

        // Tìm Trưởng phòng kế toán và gửi thông báo
        const accountingManagers = await prisma.employee.findMany({
          where: {
            status: "active",
            OR: [
              { departmentCode: "finance" },
              { departmentName: { contains: "Kế toán" } },
              { departmentName: { contains: "Tài chính" } }
            ],
            position: "vtr-20260401-1964-sbmg" // Trưởng phòng
          },
          select: { userId: true, fullName: true }
        });

        for (const manager of accountingManagers) {
          if (!manager.userId) continue;

          await prisma.notification.create({
            data: {
              title: "⚡ Trình phê duyệt đơn mua hàng (Tài chính - Kế toán)",
              content: `## ĐỀ XUẤT PHÊ DUYỆT ĐƠN MUA HÀNG MỚI\n---\n**${userName}** vừa trình phê duyệt đơn mua hàng **${code}** trị giá **${tongTien.toLocaleString("vi-VN")} đ**.\n\nVui lòng xem xét và duyệt yêu cầu tại Trung tâm phê duyệt.`,
              type: "warning",
              priority: "high",
              audienceType: "individual",
              audienceValue: manager.userId,
              createdById: userId,
              attachments: JSON.stringify([{
                 name: "Trung tâm phê duyệt",
                 type: "link",
                 url: "/board/approvals"
              }]),
              recipients: {
                create: { userId: manager.userId }
              }
            }
          });
        }
      } catch (err) {
        console.error("Failed to create approval request or notify for purchase order:", err);
      }

      // Cập nhật PurchaseRequestItem: link sang PurchaseOrderItem + set trangThaiXuLy
      for (let i = 0; i < group.length; i++) {
        const a = group[i];
        const poItem = order.items[i];
        await (prisma as any).purchaseRequestItem.update({
          where: { id: a.itemId },
          data: {
            trangThaiXuLy: "da-tao-don",
            supplierId,
            purchaseOrderItemId: poItem?.id ?? null,
          },
        });
      }

      createdOrders.push({ code, supplierName, soMatHang: group.length });
      orderedItemDetails.push({
        code, supplierName, tongTien,
        items: orderItems.map(i => ({ tenHang: i.tenHang, soLuong: i.soLuong, donVi: i.donVi, donGia: i.donGia, thanhTien: i.thanhTien })),
      });
    }

    // ── Cập nhật dòng bỏ qua ────────────────────────────────────────────────────
    if (skippedIds.length > 0) {
      await (prisma as any).purchaseRequestItem.updateMany({
        where: { id: { in: skippedIds } },
        data: { trangThaiXuLy: "bo-qua" },
      });
    }

    // ── Auto-compute trạng thái phiếu YC cho từng phiếu ─────────────────────────
    let firstNewStatus = "da-xu-ly";
    for (const prId of ids) {
      const prItems = await (prisma as any).purchaseRequestItem.findMany({
        where: { purchaseRequestId: prId },
        select: { trangThaiXuLy: true },
      }) as { trangThaiXuLy: string }[];
      
      const allDone    = prItems.every((i) => i.trangThaiXuLy === "da-tao-don" || i.trangThaiXuLy === "bo-qua");
      const anyPending = prItems.some((i) => i.trangThaiXuLy === "cho-xu-ly");
      const newStatus  = allDone ? "da-xu-ly" : anyPending ? "dang-xu-ly" : "da-xu-ly";

      if (prId === ids[0]) {
        firstNewStatus = newStatus;
      }

      await (prisma as any).purchaseRequest.update({
        where: { id: prId },
        data: { trangThai: newStatus },
      });
    }

    // ── Gửi thông báo chi tiết cho người tạo phiếu cho từng phiếu ───────────────
    for (const pr of purchaseRequests) {
      if (pr.createdById) {
        const fmtVND = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";
        
        // Tìm các đơn đặt hàng liên quan đến phiếu yêu cầu này
        const prOrderedOrders = orderedItemDetails.map(ord => {
          const ordItems = ord.items.filter(it => {
            return pr.items.some(x => x.tenHang === it.tenHang);
          });
          return {
            ...ord,
            items: ordItems,
            tongTien: ordItems.reduce((s, x) => s + x.thanhTien, 0)
          };
        }).filter(ord => ord.items.length > 0);

        const prAllItems = await (prisma as any).purchaseRequestItem.findMany({
          where: { purchaseRequestId: pr.id },
          select: { trangThaiXuLy: true },
        }) as { trangThaiXuLy: string }[];
        
        const prAllDone = prAllItems.every((i) => i.trangThaiXuLy === "da-tao-don" || i.trangThaiXuLy === "bo-qua");
        const prAnyPending = prAllItems.some((i) => i.trangThaiXuLy === "cho-xu-ly");
        const prNewStatus = prAllDone ? "da-xu-ly" : prAnyPending ? "dang-xu-ly" : "da-xu-ly";

        // Hàng chưa đặt được
        const pendingItems = await (prisma as any).purchaseRequestItem.findMany({
          where: { purchaseRequestId: pr.id, trangThaiXuLy: "cho-xu-ly" },
          select: { tenHang: true, soLuong: true, donVi: true },
        }) as { tenHang: string; soLuong: number; donVi: string | null }[];

        const totalOrdered = prAllItems.filter(i => i.trangThaiXuLy === "da-tao-don").length;
        const totalItems = pr.items.length;

        const title = prAllDone
          ? `Phiếu ${pr.code ?? ""} đã được xử lý hoàn tất ✓`
          : `Đã đặt ${totalOrdered}/${totalItems} mặt hàng — Phiếu ${pr.code ?? ""}`;

        const lines: string[] = [];

        if (prAllDone) {
          lines.push(`Tất cả **${totalItems} mặt hàng** trong phiếu **${pr.code}** đã được đặt hàng thành công.`);
        } else {
          lines.push(`**${totalOrdered}/${totalItems} mặt hàng** đã được đặt. Còn **${pendingItems.length} mặt hàng** chờ xử lý.`);
        }
        lines.push("");

        lines.push(`## ĐƠN MUA HÀNG ĐÃ TẠO`);
        lines.push("---");
        for (const ord of prOrderedOrders) {
          lines.push(`### ${ord.code}`);
          lines.push(`@ ${ord.supplierName}`);
          for (const it of ord.items) {
            const priceStr = it.donGia > 0
              ? `${it.soLuong}${it.donVi ? " " + it.donVi : ""} × ${fmtVND(it.donGia)} = **${fmtVND(it.thanhTien)}**`
              : `${it.soLuong}${it.donVi ? " " + it.donVi : ""}`;
            lines.push(`◦ ${it.tenHang}: ${priceStr}`);
          }
          lines.push(`→ Tổng phần đơn: **${fmtVND(ord.tongTien)}**`);
          lines.push("");
        }

        if (pendingItems.length > 0) {
          lines.push(`## HÀNG CHƯA ĐẶT ĐƯỢC`);
          lines.push("---");
          for (const it of pendingItems) {
            lines.push(`◦ ${it.tenHang}: ${it.soLuong}${it.donVi ? " " + it.donVi : ""}`);
          }
        }

        const content = lines.join("\n");

        console.log(`[create-orders] Sending notification → ${pr.createdById}, status=${prNewStatus}`);
        await sendPurchaseNotification({
          purchaseRequestId: pr.id,
          actorId: session.user.id,
          title,
          content,
          type:     prAllDone ? "success" : "info",
          priority: prAllDone ? "high"    : "normal",
        });
      }
    }

    return NextResponse.json({
      success: true,
      createdOrders,
      purchaseRequestStatus: firstNewStatus,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-orders] Unhandled error:", err);
    return NextResponse.json({ error: `Lỗi server: ${message}` }, { status: 500 });
  }
}
