import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import { createAutoJournal }         from "@/lib/accounting-engine";

/**
 * POST /api/plan-finance/stock-movements/batch
 *
 * Nhập kho nhiều mặt hàng cùng lúc.
 *
 * Body:
 * {
 *   type:            "nhap"
 *   toWarehouseId:   string          // kho nhận
 *   soChungTu?:      string          // mã phiếu
 *   lyDo?:           string          // lý do / ghi chú chung
 *   nguoiThucHien?:  string
 *   purchaseOrderId?: string         // PO liên kết (nếu có)
 *   lines: [
 *     {
 *       inventoryItemId: string
 *       soLuong:         number      (> 0)
 *       donGia?:         number
 *       viTriHang?:      string      // vị trí kho: Hàng
 *       viTriCot?:       string      //             Cột
 *       viTriTang?:      string      //             Tầng
 *       ghiChu?:         string
 *     }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      toWarehouseId,
      soChungTu,
      lyDo,
      nguoiThucHien,
      purchaseOrderId,
      lines = [],
    }: {
      toWarehouseId:   string;
      soChungTu?:      string;
      lyDo?:           string;
      nguoiThucHien?:  string;
      purchaseOrderId?: string;
      lines: {
        inventoryItemId: string;
        soLuong:         number;   // SL thực tế nhập
        soLuongCT?:      number;   // SL theo chứng từ (optional)
        donGia?:         number;
        viTriHang?:      string;
        viTriCot?:       string;
        viTriTang?:      string;
        ghiChu?:         string;
      }[];
    } = body;

    if (!toWarehouseId)    return NextResponse.json({ error: "toWarehouseId bắt buộc" }, { status: 400 });
    if (!lines.length)     return NextResponse.json({ error: "Cần ít nhất 1 dòng hàng hoá" }, { status: 400 });

    const movements = [];
    let totalBatchValue = 0; // Tính tổng giá trị nhập kho để hạch toán

    for (const line of lines) {
      const { inventoryItemId, soLuong, soLuongCT, donGia, viTriHang, viTriCot, viTriTang, ghiChu } = line;

      if (!inventoryItemId) continue;
      if (!soLuong || soLuong <= 0) continue;
      
      if (donGia) {
        totalBatchValue += soLuong * donGia;
      }

      // Lấy tồn hiện tại
      const existing = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: toWarehouseId } },
      });

      const soLuongTruoc = existing?.soLuong ?? 0;
      const soLuongSau   = soLuongTruoc + soLuong;

      // Upsert InventoryStock (cập nhật số lượng + vị trí nếu có)
      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: toWarehouseId } },
        create: {
          inventoryItemId,
          warehouseId: toWarehouseId,
          soLuong: soLuongSau,
          ...(viTriHang && { viTriHang }),
          ...(viTriCot  && { viTriCot }),
          ...(viTriTang && { viTriTang }),
          ...(ghiChu    && { ghiChu }),
        },
        update: {
          soLuong: soLuongSau,
          ...(viTriHang !== undefined && { viTriHang: viTriHang || null }),
          ...(viTriCot  !== undefined && { viTriCot:  viTriCot  || null }),
          ...(viTriTang !== undefined && { viTriTang: viTriTang || null }),
          ...(ghiChu    !== undefined && { ghiChu:    ghiChu    || null }),
        },
      });

      // Ghi StockMovement
      const mv = await prisma.stockMovement.create({
        data: {
          inventoryItemId,
          type: "nhap",
          toWarehouseId,
          soLuong,
          soLuongCT:     soLuongCT     || undefined,
          soLuongTruoc,
          soLuongSau,
          donGia:          donGia          || undefined,
          lyDo:            lyDo            || ghiChu || undefined,
          soChungTu:       soChungTu       || undefined,
          nguoiThucHien:   nguoiThucHien   || undefined,
          purchaseOrderId: purchaseOrderId || undefined,
        },
      });

      movements.push(mv);

      // Cập nhật trangThai + soLuong tổng trên InventoryItem
      const allStocks = await prisma.inventoryStock.findMany({
        where: { inventoryItemId },
        include: { inventoryItem: { select: { soLuongMin: true } } },
      });
      const tongSoLuong = allStocks.reduce((s, st) => s + st.soLuong, 0);
      const soLuongMin  = allStocks[0]?.inventoryItem.soLuongMin ?? 0;
      const trangThai   = tongSoLuong === 0 ? "het-hang"
                        : soLuongMin > 0 && tongSoLuong <= soLuongMin ? "sap-het"
                        : "con-hang";

      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data:  { 
          soLuong: tongSoLuong, 
          trangThai,
          ...(donGia !== undefined && donGia > 0 && { giaNhap: donGia }),
        },
      });
    }

    if (purchaseOrderId) {
      try {
        // 1. Chuyển trạng thái đơn hàng sang Hoàn thành và ghi log hoạt động
        const po = await prisma.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: {
            trangThai: "completed",
            activities: {
              create: {
                loai: "system",
                ngay: new Date(),
                nguoiThucHien: session.user?.name ?? nguoiThucHien ?? "Hệ thống",
                ketQua: `Trạng thái đơn hàng thay đổi sang [Hoàn thành] sau khi nhập kho.`,
              }
            }
          },
          include: {
            supplier: { select: { name: true } },
            items: true
          }
        });

        if (po) {
          const poCode = po.code ?? purchaseOrderId;
          const supplierName = po.supplier?.name ?? "Nhà cung cấp";
          const ngayNhanStr = po.ngayNhan ? new Date(po.ngayNhan).toLocaleDateString("vi-VN") : "Chưa xác định";

          // 2. Kiểm tra lệch số lượng giữa thực tế và chứng từ để báo cáo Trưởng phòng mua hàng
          const discrepantLines = [];
          
          const invItems = await prisma.inventoryItem.findMany({
            where: { id: { in: lines.map(l => l.inventoryItemId) } },
            select: { id: true, tenHang: true, donVi: true }
          });
          const invItemMap = new Map(invItems.map(i => [i.id, i]));

          for (const line of lines) {
            const actualQty = line.soLuong;
            const docQty = line.soLuongCT ?? actualQty;
            if (actualQty !== docQty) {
              const itemInfo = invItemMap.get(line.inventoryItemId);
              discrepantLines.push({
                tenHang: itemInfo?.tenHang ?? "Hàng hoá",
                soLuongNhap: actualQty,
                soLuongCT: docQty,
                donVi: itemInfo?.donVi ?? ""
              });
            }
          }

          if (discrepantLines.length > 0) {
            // Tìm Trưởng phòng mua hàng
            let purchaseHead = await prisma.employee.findFirst({
              where: {
                departmentCode: "purchase",
                position: "vtr-20260401-1964-sbmg"
              },
              select: { userId: true }
            });

            if (!purchaseHead) {
              purchaseHead = await prisma.employee.findFirst({
                where: {
                  departmentCode: "purchase",
                  OR: [
                    { position: { contains: "Trưởng phòng" } },
                    { position: { contains: "Trưởng bộ phận" } }
                  ]
                },
                select: { userId: true }
              });
            }

            if (!purchaseHead) {
              purchaseHead = await prisma.employee.findFirst({
                where: { departmentCode: "purchase" },
                select: { userId: true }
              });
            }

            if (purchaseHead?.userId) {
              const headNotifTitle = `Lệch số lượng nhập kho - Đơn hàng ${poCode}`;
              const headNotifContent = `Đơn mua hàng **${poCode}** từ nhà cung cấp **${supplierName}** đã được nhập kho bởi **${nguoiThucHien ?? "Thủ kho"}**.\n` +
                `Hệ thống phát hiện **sai lệch số lượng** giữa thực tế nhập kho và chứng từ:\n\n` +
                discrepantLines.map(line => 
                  `• **${line.tenHang}**: Thực tế nhập **${line.soLuongNhap}** / Chứng từ **${line.soLuongCT}** ${line.donVi}`
                ).join("\n");

              // Fallback user lookup to prevent database foreign key violation if session has no ID
              const creatorUserId = session.user?.id || (await prisma.user.findFirst({ select: { id: true } }))?.id || "system";

              const headNotif = await prisma.notification.create({
                data: {
                  title: headNotifTitle,
                  content: headNotifContent,
                  type: "warning",
                  priority: "high",
                  audienceType: "individual",
                  audienceValue: purchaseHead.userId,
                  createdById: creatorUserId,
                }
              });

              await prisma.notificationRecipient.create({
                data: { notificationId: headNotif.id, userId: purchaseHead.userId }
              });
            }
          }

          // 3. Gửi thông báo cho người tạo yêu cầu mua hàng (PR Creators)
          const creatorMap = new Map<string, {
            prCodes: Set<string>;
            items: Map<string, {
              tenHang: string;
              soLuongYeuCau: number;
              soLuongNhapKho: number;
              donVi: string | null;
            }>;
          }>();

          if (po.purchaseRequestId) {
            const pr = await prisma.purchaseRequest.findUnique({
              where: { id: po.purchaseRequestId },
              select: { id: true, code: true, createdById: true }
            });
            if (pr?.createdById) {
              const prItems = await prisma.purchaseRequestItem.findMany({
                where: { purchaseRequestId: pr.id },
                select: { inventoryItemId: true, tenHang: true, soLuong: true, donVi: true }
              });

              const itemsMap = new Map<string, {
                tenHang: string;
                soLuongYeuCau: number;
                soLuongNhapKho: number;
                donVi: string | null;
              }>();

              for (const prItem of prItems) {
                const key = prItem.inventoryItemId || prItem.tenHang;
                if (!itemsMap.has(key)) {
                  const inboundLine = lines.find(l => l.inventoryItemId === prItem.inventoryItemId);
                  itemsMap.set(key, {
                    tenHang: prItem.tenHang,
                    soLuongYeuCau: 0,
                    soLuongNhapKho: inboundLine?.soLuong ?? 0,
                    donVi: prItem.donVi
                  });
                }
                itemsMap.get(key)!.soLuongYeuCau += prItem.soLuong;
              }

              creatorMap.set(pr.createdById, {
                prCodes: new Set(pr.code ? [pr.code] : []),
                items: itemsMap
              });
            }
          } else {
            // Find matching PR items
            const matchingPrItems = await prisma.purchaseRequestItem.findMany({
              where: {
                inventoryItemId: { in: lines.map(l => l.inventoryItemId) },
                supplierId: po.supplierId,
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
                creatorMap.set(creatorId, { prCodes: new Set(), items: new Map() });
              }
              const entry = creatorMap.get(creatorId)!;
              if (prItem.purchaseRequest.code) {
                entry.prCodes.add(prItem.purchaseRequest.code);
              }

              const key = prItem.inventoryItemId || prItem.tenHang;
              if (!entry.items.has(key)) {
                const inboundLine = lines.find(l => l.inventoryItemId === prItem.inventoryItemId);
                entry.items.set(key, {
                  tenHang: prItem.tenHang,
                  soLuongYeuCau: 0,
                  soLuongNhapKho: inboundLine?.soLuong ?? 0,
                  donVi: prItem.donVi
                });
              }

              const itemEntry = entry.items.get(key)!;
              itemEntry.soLuongYeuCau += prItem.soLuong;
            }
          }

          // Send creator notifications
          for (const [creatorId, entry] of creatorMap.entries()) {
            const prCodesStr = Array.from(entry.prCodes).join(", ");
            const notifTitle = `Hàng bạn yêu cầu đã được nhập kho (Đơn hàng ${poCode})`;
            const notifContent = `Các mặt hàng bạn yêu cầu trong phiếu **${prCodesStr || "yêu cầu mua hàng"}** đã được nhập kho thành công.\n\n` +
              `Chi tiết số lượng nhập kho:\n` +
              Array.from(entry.items.values()).map(i => 
                `• **${i.tenHang}**: Đã nhập **${i.soLuongNhapKho}** / Yêu cầu **${i.soLuongYeuCau}** ${i.donVi ?? ""}`
              ).join("\n");

            const creatorUserId = session.user?.id || (await prisma.user.findFirst({ select: { id: true } }))?.id || "system";

            const creatorNotif = await prisma.notification.create({
              data: {
                title: notifTitle,
                content: notifContent,
                type: "success",
                priority: "high",
                audienceType: "individual",
                audienceValue: creatorId,
                createdById: creatorUserId,
              }
            });

            await prisma.notificationRecipient.create({
              data: { notificationId: creatorNotif.id, userId: creatorId }
            });
          }
        }
      } catch (err: any) {
        console.error("Lỗi hoàn thành PO:", err.message);
      }
    }

    // [ACCOUNTING ENGINE] Tự động hạch toán Nhập Kho
    if (totalBatchValue > 0) {
      await createAutoJournal({
        event: "INVENTORY_RECEIPT",
        amount: totalBatchValue,
        referenceCode: soChungTu,
        description: lyDo || `Nhập kho theo chứng từ ${soChungTu || 'N/A'}`
      });
    }

    return NextResponse.json({ success: true, count: lines.length, movements }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /stock-movements/batch]", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
