import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import { createAutoJournal }         from "@/lib/accounting-engine";

/**
 * POST /api/plan-finance/stock-movements/batch-xuat
 *
 * Xuất kho nhiều mặt hàng cùng lúc.
 * Kiểm tra tồn kho trước – trả lỗi nếu SL xuất > tồn.
 *
 * Body:
 * {
 *   fromWarehouseId: string
 *   soChungTu?:      string
 *   lyDo?:           string
 *   nguoiThucHien?:  string
 *   salesOrderId?:   string   // đơn bán hàng liên kết (nếu có)
 *   workOrderId?:    string   // lệnh sản xuất liên kết (nếu có)
 *   lines: [
 *     {
 *       inventoryItemId: string
 *       soLuong:         number   // SL thực xuất (> 0)
 *       soLuongYC?:      number   // SL yêu cầu theo lệnh / đơn
 *       donGia?:         number   // giá vốn (nếu biết)
 *       viTriHang?:      string
 *       viTriCot?:       string
 *       viTriTang?:      string
 *       ghiChu?:         string
 *     }
 *   ]
 * }
 *
 * Trả về:
 *   200 { ok, count, movements }
 *   400 { error, insufficient?: [{ inventoryItemId, tenHang, soLuong, soLuongTon }] }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      fromWarehouseId,
      soChungTu,
      lyDo,
      nguoiThucHien,
      salesOrderId,
      workOrderId,
      ticketId,
      lines = [],
    }: {
      fromWarehouseId: string;
      soChungTu?:      string;
      lyDo?:           string;
      nguoiThucHien?:  string;
      salesOrderId?:   string;
      workOrderId?:    string;
      ticketId?:       string;
      lines: {
        inventoryItemId: string;
        soLuong:         number;
        soLuongYC?:      number;
        donGia?:         number;
        viTriHang?:      string;
        viTriCot?:       string;
        viTriTang?:      string;
        ghiChu?:         string;
      }[];
    } = body;

    if (!fromWarehouseId) return NextResponse.json({ error: "fromWarehouseId bắt buộc" }, { status: 400 });
    if (!lines.length)    return NextResponse.json({ error: "Cần ít nhất 1 dòng hàng hoá" }, { status: 400 });

    // ── Guard check: Chặn xuất kho lặp lại ───────────────────────────────────
    if (ticketId) {
      const existingTicket = await prisma.logisticsTicket.findUnique({
        where: { id: ticketId },
        select: { id: true, code: true, status: true, saleOrderId: true }
      });
      if (existingTicket && existingTicket.status === "COMPLETED") {
        return NextResponse.json({
          error: `Phiếu xuất kho ${existingTicket.code || ticketId} đã hoàn tất xuất kho trước đó, không thể xuất lại.`
        }, { status: 400 });
      }
    }

    if (salesOrderId) {
      const existingOrder = await prisma.saleOrder.findUnique({
        where: { id: salesOrderId },
        select: { id: true, code: true, trangThaiKho: true }
      });
      if (existingOrder && existingOrder.trangThaiKho === "exported") {
        return NextResponse.json({
          error: `Đơn bán hàng ${existingOrder.code || salesOrderId} đã hoàn tất xuất kho trước đó, không thể xuất lại.`
        }, { status: 400 });
      }
    }

    // ── Bước 1: Kiểm tra tồn kho trước khi ghi ──────────────────────────────
    const insufficient: { inventoryItemId: string; tenHang: string; soLuong: number; soLuongTon: number }[] = [];
    let totalBatchValue = 0; // Tính tổng giá trị xuất kho (giá vốn)

    for (const line of lines) {
      if (!line.inventoryItemId || !line.soLuong || line.soLuong <= 0) continue;
      
      if (line.donGia) {
        totalBatchValue += line.soLuong * line.donGia;
      }

      // Lấy InventoryStock theo kho cụ thể
      const stock = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId: line.inventoryItemId, warehouseId: fromWarehouseId } },
        include: { inventoryItem: { select: { tenHang: true, soLuong: true } } },
      });

      let soLuongTon: number;
      let tenHang: string;

      if (stock) {
        // Đã có InventoryStock cho kho này → dùng số chính xác
        soLuongTon = stock.soLuong;
        tenHang    = stock.inventoryItem.tenHang;
      } else {
        // Chưa có InventoryStock (dữ liệu legacy) → fallback về InventoryItem.soLuong
        const legacyItem = await prisma.inventoryItem.findUnique({
          where:  { id: line.inventoryItemId },
          select: { tenHang: true, soLuong: true },
        });
        soLuongTon = legacyItem?.soLuong ?? 0;
        tenHang    = legacyItem?.tenHang ?? line.inventoryItemId;
      }

      if (line.soLuong > soLuongTon) {
        insufficient.push({
          inventoryItemId: line.inventoryItemId,
          tenHang,
          soLuong:    line.soLuong,
          soLuongTon,
        });
      }

    }

    if (insufficient.length > 0) {
      return NextResponse.json(
        { error: "Một số mặt hàng không đủ tồn kho để xuất", insufficient },
        { status: 400 }
      );
    }

    // ── Bước 2: Ghi từng dòng ────────────────────────────────────────────────
    const movements = [];

    for (const line of lines) {
      const { inventoryItemId, soLuong, soLuongYC, donGia, viTriHang, viTriCot, viTriTang, ghiChu } = line;

      if (!inventoryItemId || !soLuong || soLuong <= 0) continue;

      // Lấy tồn hiện tại theo kho; nếu chưa có InventoryStock → dùng soLuong legacy của InventoryItem
      const existing = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: fromWarehouseId } },
      });

      let soLuongTruoc: number;
      if (existing) {
        soLuongTruoc = existing.soLuong;
      } else {
        // Dữ liệu legacy: lấy từ InventoryItem.soLuong
        const legacyItem = await prisma.inventoryItem.findUnique({
          where:  { id: inventoryItemId },
          select: { soLuong: true },
        });
        soLuongTruoc = legacyItem?.soLuong ?? 0;
      }
      
      // Khôi phục số lượng Đã giữ nếu có (InventoryReservation)
      let deductGiuQty = 0;
      if (existing) {
        let ticketsToCheck: string[] = [];
        if (body.ticketId) {
          ticketsToCheck.push(body.ticketId);
        } else if (salesOrderId) {
          const tickets = await prisma.logisticsTicket.findMany({ where: { saleOrderId: salesOrderId } });
          ticketsToCheck.push(...tickets.map(t => t.id));
        }

        if (ticketsToCheck.length > 0) {
           const reservations = await prisma.inventoryReservation.findMany({
              where: { 
                 inventoryStockId: existing.id,
                 ticketItem: { ticketId: { in: ticketsToCheck } },
                 reservedQty: { gt: 0 }
              }
           });
           
           let remainingToDeduct = soLuong;
           for (const res of reservations) {
              if (remainingToDeduct <= 0) break;
              const deduct = Math.min(res.reservedQty, remainingToDeduct);
              await prisma.inventoryReservation.update({
                 where: { id: res.id },
                 data: { reservedQty: res.reservedQty - deduct }
              });
              deductGiuQty += deduct;
              remainingToDeduct -= deduct;
           }
        }
      }

      const soLuongSau   = soLuongTruoc - soLuong;
      const soLuongGiuSau = existing ? Math.max(0, (existing.soLuongGiu || 0) - deductGiuQty) : 0;

      // Cập nhật InventoryStock
      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: fromWarehouseId } },
        create: { inventoryItemId, warehouseId: fromWarehouseId, soLuong: Math.max(0, soLuongSau) },
        update: { soLuong: Math.max(0, soLuongSau), soLuongGiu: soLuongGiuSau },
      });

      // Ghi StockMovement
      const mv = await prisma.stockMovement.create({
        data: {
          inventoryItemId,
          type:           "xuat",
          fromWarehouseId,
          soLuong,
          soLuongCT:      soLuongYC      || undefined,
          soLuongTruoc,
          soLuongSau:     Math.max(0, soLuongSau),
          donGia:         donGia         || undefined,
          lyDo:           lyDo           || ghiChu || undefined,
          soChungTu:      soChungTu      || undefined,
          nguoiThucHien:  nguoiThucHien  || undefined,
          // salesOrderId / workOrderId nếu schema có — bỏ qua nếu chưa có
        },
      });

      movements.push(mv);

      // Cập nhật trạng thái tổng trên InventoryItem
      const allStocks = await prisma.inventoryStock.findMany({
        where: { inventoryItemId },
        include: { inventoryItem: { select: { soLuongMin: true } }, warehouse: { select: { code: true } } },
      });
      const validStocks = allStocks.filter((st: any) => st.warehouse?.code !== 'KHO-LOI');
      const tongSoLuong = validStocks.reduce((s, st) => s + st.soLuong, 0);
      const soLuongMin  = allStocks[0]?.inventoryItem.soLuongMin ?? 0;
      const trangThai   = tongSoLuong === 0 ? "het-hang"
                        : soLuongMin > 0 && tongSoLuong <= soLuongMin ? "sap-het"
                        : "con-hang";

      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data:  { soLuong: tongSoLuong, trangThai },
      });
    }

    // [ACCOUNTING ENGINE] Tự động hạch toán Xuất Kho
    if (totalBatchValue > 0) {
      await createAutoJournal({
        event: "INVENTORY_ISSUE",
        amount: totalBatchValue,
        referenceCode: soChungTu,
        description: `Xuất kho hàng hoá/vật tư - Phiếu ${soChungTu || 'N/A'}`
      });
    }

    // Cập nhật trạng thái ticket và đơn hàng liên quan
    const effectiveTicketId = ticketId || body.ticketId;
    let targetSaleOrderId = salesOrderId || body.salesOrderId;

    if (effectiveTicketId) {
      try {
        const updatedTicket = await prisma.logisticsTicket.update({
          where: { id: effectiveTicketId },
          data: { status: "COMPLETED" }
        });

        if (!targetSaleOrderId && updatedTicket.saleOrderId) {
          targetSaleOrderId = updatedTicket.saleOrderId;
        }

        if (updatedTicket.defectRecordId) {
          await (prisma as any).defectActivity.create({
            data: {
              defectId: updatedTicket.defectRecordId,
              action: "XUẤT KHO VẬT TƯ",
              description: `Đã hoàn tất xuất kho vật tư theo phiếu ${soChungTu || updatedTicket.code}`,
              performedBy: nguoiThucHien || "Thủ kho"
            }
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to update ticket status:", err);
      }
    }

    if (targetSaleOrderId) {
      try {
        // Nếu xuất theo đơn hàng hoặc ticket đã hoàn thành, kiểm tra và cập nhật toàn diện
        if (!effectiveTicketId) {
          await prisma.logisticsTicket.updateMany({
            where: {
              saleOrderId: targetSaleOrderId,
              status: { not: "COMPLETED" }
            },
            data: { status: "COMPLETED" }
          });
        } else {
          // Kiểm tra xem đơn hàng còn ticket nào chưa hoàn thành không
          const remaining = await prisma.logisticsTicket.count({
            where: {
              saleOrderId: targetSaleOrderId,
              status: { not: "COMPLETED" }
            }
          });
          if (remaining === 0) {
            await prisma.saleOrder.update({
              where: { id: targetSaleOrderId },
              data: { trangThaiKho: "exported" }
            });
          }
        }

        // Cập nhật trangThaiKho nếu không còn ticket nào pending
        const pendingCount = await prisma.logisticsTicket.count({
          where: {
            saleOrderId: targetSaleOrderId,
            status: { not: "COMPLETED" }
          }
        });
        if (pendingCount === 0) {
          const so = await prisma.saleOrder.update({
            where: { id: targetSaleOrderId },
            data: { trangThaiKho: "exported" },
            select: { code: true }
          });

          if (so?.code) {
            await prisma.task.updateMany({
              where: {
                deptCode: "logistics",
                status: "pending",
                title: { contains: so.code }
              },
              data: { status: "done", completedAt: new Date() }
            });
          }
        }
      } catch (errSo) {
        console.error("Failed to update sale order status:", errSo);
      }
    }

    if (workOrderId) {
      try {
        await prisma.task.updateMany({
          where: {
            deptCode: "logistics",
            status: "pending",
            title: { contains: workOrderId }
          },
          data: { status: "done", completedAt: new Date() }
        });
      } catch (errWo) {
        console.error("Failed to update work order tasks:", errWo);
      }
    }

    return NextResponse.json({ ok: true, count: lines.length, movements });
  } catch (e: any) {
    console.error("[POST /stock-movements/batch-xuat]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
