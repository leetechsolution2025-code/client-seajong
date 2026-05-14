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
      }>;
    };

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: "Thiếu dữ liệu phân công" }, { status: 400 });
    }

    // Xác nhận phiếu YC tồn tại
    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      include: { items: true },
    });

    if (!purchaseRequest) {
      return NextResponse.json({ error: "Không tìm thấy phiếu yêu cầu" }, { status: 404 });
    }

    // Map itemId → thông tin item gốc
    const itemMap = new Map(purchaseRequest.items.map((i) => [i.id, i]));

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
        };
      });

      const tongTien = orderItems.reduce((s, i) => s + i.thanhTien, 0);
      const supplierName = supplier?.name ?? supplierId;

      const order = await (prisma as any).purchaseOrder.create({
        data: {
          code,
          trangThai: "draft",
          tongTien,
          supplierId: supplierId || null,
          purchaseRequestId,
          items: { create: orderItems },
        },
        include: { items: true },
      }) as { id: string; items: { id: string }[] };

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

    // ── Auto-compute trạng thái phiếu YC ────────────────────────────────────────
    const allItems = await (prisma as any).purchaseRequestItem.findMany({
      where: { purchaseRequestId },
      select: { trangThaiXuLy: true },
    }) as { trangThaiXuLy: string }[];
    const allDone    = allItems.every((i) => i.trangThaiXuLy === "da-tao-don" || i.trangThaiXuLy === "bo-qua");
    const anyPending = allItems.some((i) => i.trangThaiXuLy === "cho-xu-ly");
    const newStatus  = allDone ? "da-xu-ly" : anyPending ? "dang-xu-ly" : "da-xu-ly";

    await (prisma as any).purchaseRequest.update({
      where: { id: purchaseRequestId },
      data: { trangThai: newStatus },
    });

    // ── Gửi thông báo chi tiết cho người tạo phiếu ──────────────────────────────
    const prInfo = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      select: { code: true, createdById: true },
    });

    if (prInfo?.createdById) {
      const fmtVND = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";
      const isAllDone = newStatus === "da-xu-ly";

      // Hàng chưa đặt được
      const pendingItems = await (prisma as any).purchaseRequestItem.findMany({
        where: { purchaseRequestId, trangThaiXuLy: "cho-xu-ly" },
        select: { tenHang: true, soLuong: true, donVi: true },
      }) as { tenHang: string; soLuong: number; donVi: string | null }[];

      const totalOrdered = orderedItemDetails.reduce((s, o) => s + o.items.length, 0);
      const totalItems = purchaseRequest.items.length;

      // Title súc tích
      const title = isAllDone
        ? `Phiếu ${prInfo.code ?? ""} đã được xử lý hoàn tất ✓`
        : `Đã đặt ${totalOrdered}/${totalItems} mặt hàng — Phiếu ${prInfo.code ?? ""}`;

      // Nội dung có cấu trúc rõ ràng, dùng ## / ### / ◦ / → làm marker để renderer parse
      const lines: string[] = [];

      // Mở đầu
      if (isAllDone) {
        lines.push(`Tất cả **${totalItems} mặt hàng** trong phiếu **${prInfo.code}** đã được đặt hàng thành công.`);
      } else {
        lines.push(`**${totalOrdered}/${totalItems} mặt hàng** đã được đặt. Còn **${pendingItems.length} mặt hàng** chờ xử lý.`);
      }
      lines.push("");

      // Đơn đã tạo
      lines.push(`## ĐƠN MUA HÀNG ĐÃ TẠO`);
      lines.push("---");
      for (const ord of orderedItemDetails) {
        lines.push(`### ${ord.code}`);
        lines.push(`@ ${ord.supplierName}`);
        for (const it of ord.items) {
          const priceStr = it.donGia > 0
            ? `${it.soLuong}${it.donVi ? " " + it.donVi : ""} × ${fmtVND(it.donGia)} = **${fmtVND(it.thanhTien)}**`
            : `${it.soLuong}${it.donVi ? " " + it.donVi : ""}`;
          lines.push(`◦ ${it.tenHang}: ${priceStr}`);
        }
        lines.push(`→ Tổng đơn: **${fmtVND(ord.tongTien)}**`);
        lines.push("");
      }

      // Hàng chưa đặt
      if (pendingItems.length > 0) {
        lines.push(`## HÀNG CHƯA ĐẶT ĐƯỢC`);
        lines.push("---");
        for (const it of pendingItems) {
          lines.push(`◦ ${it.tenHang}: ${it.soLuong}${it.donVi ? " " + it.donVi : ""}`);
        }
      }

      const content = lines.join("\n");

      console.log(`[create-orders] Sending notification → ${prInfo.createdById}, status=${newStatus}`);
      await sendPurchaseNotification({
        purchaseRequestId,
        actorId: session.user.id,
        title,
        content,
        type:     isAllDone ? "success" : "info",
        priority: isAllDone ? "high"    : "normal",
      });
    }

    return NextResponse.json({
      success: true,
      createdOrders,
      purchaseRequestStatus: newStatus,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-orders] Unhandled error:", err);
    return NextResponse.json({ error: `Lỗi server: ${message}` }, { status: 500 });
  }
}
