// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAutoJournalByReference } from "@/lib/accounting-engine";
import { attachWebImages } from "@/lib/sync-utils";

function parseGuestInfo(ghiChu: string | null | undefined): { name: string; dienThoai: string; address: string } | null {
  if (!ghiChu) return null;
  const match = ghiChu.match(/\[GuestInfo:(.*?)\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      return {
        name: parsed.tenHang || parsed.name || "",
        dienThoai: parsed.dienThoai || "",
        address: parsed.address || ""
      };
    } catch {
      return null;
    }
  }
  return null;
}

function cleanGhiChu(ghiChu: string | null | undefined): string {
  if (!ghiChu) return "";
  return ghiChu.replace(/\[GuestInfo:(.*?)\]\n?/, "").trim();
}

// GET /api/plan-finance/sales/[id] — chi tiết đơn bán hàng kèm items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // const session = await getServerSession(authOptions);
    // if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, dienThoai: true, address: true, hanMucCongNo: true, nhom: true } },
        saleOrderItems: {
          include: {
            inventoryItem: { select: { imageUrl: true, code: true, loai: true, webProductId: true, color: true, giaBan: true } }
          }
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });

    let staffName = "Hệ thống";
    if (order.nguoiPhuTrach) {
      const emp = await prisma.employee.findUnique({
        where: { id: order.nguoiPhuTrach },
        select: { fullName: true }
      });
      if (emp) {
        staffName = emp.fullName;
      } else {
        const usr = await prisma.user.findUnique({
          where: { id: order.nguoiPhuTrach },
          select: { name: true }
        });
        if (usr?.name) {
          staffName = usr.name;
        } else {
          staffName = "Chưa rõ";
        }
      }
    }

    // Query related PurchaseRequest
    const pr = await prisma.purchaseRequest.findFirst({
      where: {
        lyDo: { contains: order.code || "" }
      },
      select: { code: true }
    });

    // Query related StockMovement (to get the XK- code if storekeeper processed it)
    const sm = await prisma.stockMovement.findFirst({
      where: {
        OR: [
          { soChungTu: { contains: order.code || "" } },
          { lyDo: { contains: order.code || "" } }
        ]
      },
      select: { soChungTu: true }
    });

    // Query related Notification (must be created on or after order.ngayDat to avoid matches with old deleted orders sharing the same code)
    const notif = await prisma.notification.findFirst({
      where: {
        title: { contains: order.code || "" },
        OR: [
          { title: { contains: "Lệnh xuất kho" } },
          { content: { contains: "xuất kho" } }
        ],
        ...(order.ngayDat ? { createdAt: { gte: order.ngayDat } } : {})
      },
      select: { id: true }
    });

    // Fetch items from the corresponding won quotation and also get the discount
    let orderItems: any[] = [];
    let orderDiscount = 0;
    let orderVat = 0;
    
    // First, try to find the matching quotation by code
    const matchingQuotation = await prisma.quotation.findFirst({
      where: { code: order.code || "" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" }
    });
    
    if (order.discount !== undefined && order.discount !== null && order.discount > 0) {
      orderDiscount = order.discount;
    } else if (matchingQuotation) {
      orderDiscount = matchingQuotation.discount || 0;
    }

    if ((order as any).vat !== undefined && (order as any).vat !== null && (order as any).vat > 0) {
      orderVat = (order as any).vat;
    } else if (matchingQuotation) {
      orderVat = matchingQuotation.vat || 0;
    }

    if (order.saleOrderItems && order.saleOrderItems.length > 0) {
      orderItems = order.saleOrderItems;
    } else {
      if (matchingQuotation && matchingQuotation.items) {
        orderItems = matchingQuotation.items;
      } else {
        // Fallback to Quotation by customerId / ghiChu
        const quotation = await prisma.quotation.findFirst({
          where: order.customerId ? {
            customerId: order.customerId,
            thanhTien: order.tongTien,
            trangThai: "won"
          } : {
            thanhTien: order.tongTien,
            ghiChu: order.ghiChu,
            trangThai: "won"
          },
          include: { items: { orderBy: { sortOrder: "asc" } } },
          orderBy: { createdAt: "desc" }
        });
        if (quotation && quotation.items) {
          orderItems = quotation.items;
          orderDiscount = quotation.discount || 0;
        }
      }
    }

    // Fallback: Populate missing inventoryItem details by matching tenHang
    for (const item of orderItems) {
      if (!item.inventoryItem && item.tenHang) {
        const invItem = await prisma.inventoryItem.findFirst({
          where: { tenHang: item.tenHang },
          select: { id: true, imageUrl: true, code: true, soLuong: true, dinhMucs: { take: 1, select: { id: true } }, loai: true, webProductId: true }
        });
        if (invItem) {
          item.inventoryItem = invItem;
        } else {
          const matItem = await (prisma as any).inventoryItem.findFirst({
            where: { tenHang: item.tenHang },
            select: { 
              imageUrl: true, 
              code: true, 
              stocks: { select: { soLuong: true } }
            }
          });
          if (matItem) {
            const soLuong = matItem.stocks ? matItem.stocks.reduce((acc: number, curr: any) => acc + (curr.soLuong || 0), 0) : 0;
            item.inventoryItem = { ...matItem, soLuong };
          }
        }
      }
    }

    // Tính toán số lượng thiếu và kiểm tra kho vật tư
    for (const item of orderItems) {
      const requiredQty = item.soLuong || 1;
      const currentStock = item.inventoryItem?.soLuong || 0;
      const missingQty = Math.max(0, requiredQty - currentStock);
      
      item.missingQty = missingQty;
      item.canProduce = false;
      
      // Tìm BOM để biết có thể sản xuất hay không
      let resolvedDinhMucId = item.dinhMucId || item.inventoryItem?.dinhMucId || null;
      let warehouseCode = "KHO-CHINH";
      if (!resolvedDinhMucId && item.inventoryItem) {
        const dm = await prisma.dinhMuc.findFirst({
          where: { inventoryItemId: item.inventoryItem.id }
        });
        if (dm) resolvedDinhMucId = dm.id;
      }
      
      item.warehouseCode = warehouseCode;
      item.isManufactured = !!resolvedDinhMucId;
      
      if (missingQty > 0) {
        if (resolvedDinhMucId) {
          // Fetch BOM materials
          const bom = await prisma.dinhMuc.findUnique({
            where: { id: resolvedDinhMucId },
            include: { vatTu: true }
          });
          
          if (bom && bom.vatTu && bom.vatTu.length > 0) {
            let hasEnoughMaterials = true;
            for (const vt of bom.vatTu) {
              const neededMat = (vt.soLuong || 1) * missingQty;
              const matStock = await prisma.inventoryStock.aggregate({
                where: { inventoryItemId: vt.inventoryItemId || "" },
                _sum: { soLuong: true }
              });
              const stockMat = matStock._sum.soLuong || 0;
              if (stockMat < neededMat) {
                hasEnoughMaterials = false;
                break;
              }
            }
            item.canProduce = hasEnoughMaterials;
            item.dinhMucId = resolvedDinhMucId;
          }
        }
      }
    }

    const guest = parseGuestInfo(order.ghiChu);

    // Fetch logistics task to get actual logisticsItems (must be created on or after order.ngayDat)
    const logisticsTask = await prisma.task.findFirst({
      where: {
        deptCode: "logistics",
        title: { contains: order.code || "" },
        ...(order.ngayDat ? { createdAt: { gte: order.ngayDat } } : {})
      }
    });
    
    let logisticsItems = null;
    if (logisticsTask && logisticsTask.actualResult) {
      try {
        logisticsItems = JSON.parse(logisticsTask.actualResult);
      } catch (e) { }
    }
    
    // Fetch production task to get actual productionItems (must be created on or after order.ngayDat)
    const prodTask = await prisma.task.findFirst({
      where: {
        deptCode: "production",
        title: { contains: order.code || "" },
        ...(order.ngayDat ? { createdAt: { gte: order.ngayDat } } : {})
      }
    });

    let productionItemIds: string[] = [];
    if (prodTask && prodTask.actualResult) {
      try {
        const prodItems = JSON.parse(prodTask.actualResult);
        productionItemIds = prodItems.map((pi: any) => pi.saleOrderItemId).filter(Boolean);
      } catch (e) {}
    }

    const resolvedOrder = {
      ...order,
      ghiChu: cleanGhiChu(order.ghiChu),
      nguoiPhuTrach: staffName,
      purchaseRequestCode: pr?.code || null,
      stockMovementCode: sm?.soChungTu || null,
      hasLệnhXuatKho: !!notif || (order.keToanDuyet === "approved" && order.trangThaiKho === "in_stock"),
      items: await attachWebImages(orderItems),
      logisticsItems,
      productionItemIds,
      customer: order.customer || (guest ? {
        id: null,
        name: guest.name,
        dienThoai: guest.dienThoai,
        address: guest.address,
      } : null),
      discount: orderDiscount,
      vat: orderVat
    };

    // Calculate total receivable debt
    const customerName = resolvedOrder.customer?.name;
    const customerId = resolvedOrder.customer?.id;
    let tongNoCu = 0;
    let totalDebt = 0;
    if (customerId) {
      const debts = await prisma.debt.findMany({
        where: {
          type: { in: ["phai-thu", "RECEIVABLE"] },
          customerId: customerId, // Sử dụng mã khách hàng
          createdAt: { lt: order.createdAt }, // Chỉ lấy nợ phát sinh TRƯỚC đơn hàng này
        },
        select: { amount: true, paidAmount: true, referenceId: true }
      });
      const orderIds = [order.code, order.id].filter(Boolean) as string[];
      let debtFromDebts = debts.filter(d => !orderIds.includes(d.referenceId!)).reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
      let totalDebtFromDebts = debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
      
      // DO NOT query unpaidOrders here because the Debt table is the single source of truth 
      // and already automatically tracks all receivables from SaleOrders.
      // Summing unpaidOrders again will cause double-counting!
      let debtFromOrders = 0;
      let totalDebtFromOrders = 0;
      
      tongNoCu = debtFromDebts + debtFromOrders;
      totalDebt = totalDebtFromDebts + totalDebtFromOrders;
    }
    
    // Add to payload
    (resolvedOrder as any).tongNoCu = tongNoCu;
    if (resolvedOrder.customer) {
      (resolvedOrder.customer as any).outstandingDebt = totalDebt;
      (resolvedOrder.customer as any).creditLimit = order.customer?.hanMucCongNo || 0;
    }

    return NextResponse.json(resolvedOrder);
  } catch (e: unknown) {
    console.error("[GET /sales/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// PATCH /api/plan-finance/sales/[id] — cập nhật thông tin đơn bán hàng
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { keToanDuyet, decision, decisions, ngayGiao, ngayHoanThanhSanXuat, daThanhToan, trangThai, ghiChu, tongTien, discount, vat, items, productionItemIds = [] } = body;

    if (keToanDuyet !== undefined && !["pending", "approved", "rejected"].includes(keToanDuyet)) {
      return NextResponse.json({ error: "Trạng thái duyệt không hợp lệ" }, { status: 400 });
    }

    const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: { customer: true, saleOrderItems: { include: { inventoryItem: true } } }
    });

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    const isTransitioningToApproved = keToanDuyet === "approved" && order.keToanDuyet !== "approved";

    const updated = await prisma.$transaction(async (tx) => {
      let orderUpdate = await tx.saleOrder.update({
        where: { id },
        data: {
          ...(keToanDuyet !== undefined && { keToanDuyet }),
          ...(ngayGiao !== undefined && { ngayGiao: ngayGiao ? new Date(ngayGiao) : null }),
          ...(ngayHoanThanhSanXuat !== undefined && { ngayHoanThanhSanXuat: ngayHoanThanhSanXuat ? new Date(ngayHoanThanhSanXuat) : null }),
          ...(daThanhToan !== undefined && { daThanhToan: parseFloat(String(daThanhToan)) }),
          ...(trangThai !== undefined && { trangThai }),
          ...(ghiChu !== undefined && { ghiChu }),
          ...(tongTien !== undefined && { tongTien: parseFloat(String(tongTien)) }),
          ...(discount !== undefined && { discount: parseFloat(String(discount)) }),
          ...(vat !== undefined && { vat: parseFloat(String(vat)) }),
        } as any,
      });

      if (Array.isArray(items)) {
        await tx.saleOrderItem.deleteMany({ where: { saleOrderId: id } });
        if (items.length > 0) {
          await tx.saleOrderItem.createMany({
            data: items.map((it: any) => {
              const ghiChuObj = (() => { try { return JSON.parse(it.ghiChu || "{}"); } catch(e) { return {}; } })();
              return {
                saleOrderId: id,
                tenHang: it.tenHang ?? "",
                soLuong: parseFloat(String(it.soLuong ?? 1)),
                donGia: parseFloat(String(it.donGia ?? 0)),
                thanhTien: parseFloat(String(it.thanhTien ?? 0)),
                dinhMucId: ghiChuObj.dinhMucId || null,
                ghiChu: it.ghiChu ?? null,
              };
            })
          });
        }
      }

      // Thông báo khi bộ phận sản xuất hoàn thành (in_production -> approved)
      if (trangThai === "approved" && order.trangThai === "in_production") {
        const storekeepers = await tx.employee.findMany({
          where: {
            OR: [
              { departmentName: { contains: "Kho" } },
              { departmentCode: { contains: "logistics" } },
              { position: { contains: "Thủ kho" } }
            ],
            userId: { not: null }
          },
          select: { userId: true }
        });
        const storekeeperUserIds = storekeepers.map(s => s.userId).filter(Boolean) as string[];

        if (storekeeperUserIds.length > 0) {
          const notif = await tx.notification.create({
            data: {
              title: `📦 Hàng lắp ráp đã xong, lệnh xuất kho cho đơn ${order.code}`,
              content: `Bộ phận sản xuất đã hoàn thành lắp ráp cho đơn bán hàng ${order.code}. Vui lòng tiến hành xuất kho.`,
              type: "info",
              priority: "high",
              audienceType: "group",
              audienceValue: JSON.stringify(storekeeperUserIds),
              createdById: session.user.id ?? "system"
            }
          });
          await Promise.all(storekeeperUserIds.map(uid =>
            tx.notificationRecipient.upsert({
              where: { notificationId_userId: { notificationId: notif.id, userId: uid } },
              update: {},
              create: { notificationId: notif.id, userId: uid }
            })
          ));
        }

        // Notify Kinh doanh
        if (order.nguoiPhuTrach) {
          const notifKD = await tx.notification.create({
            data: {
              title: `✅ Sản xuất hoàn tất cho đơn ${order.code}`,
              content: `Bộ phận sản xuất đã hoàn thành đơn hàng ${order.code} và đã gửi yêu cầu xuất kho cho Thủ kho.`,
              type: "success",
              priority: "normal",
              audienceType: "individual",
              audienceValue: order.nguoiPhuTrach,
              createdById: session.user.id ?? "system"
            }
          });
          await tx.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notifKD.id, userId: order.nguoiPhuTrach } },
            update: {},
            create: { notificationId: notifKD.id, userId: order.nguoiPhuTrach }
          });
        }
      }

      // Thông báo khi thủ kho xuất hàng (-> shipped)
      if (trangThai === "shipped" && order.trangThai !== "shipped") {
        if (order.nguoiPhuTrach) {
          const notifKD = await tx.notification.create({
            data: {
              title: `🚚 Đơn hàng ${order.code} đã được xuất kho`,
              content: `Thủ kho đã xuất kho thành công cho đơn hàng ${order.code}. Đơn hàng đang trên đường giao.`,
              type: "success",
              priority: "normal",
              audienceType: "individual",
              audienceValue: order.nguoiPhuTrach,
              createdById: session.user.id ?? "system"
            }
          });
          await tx.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notifKD.id, userId: order.nguoiPhuTrach } },
            update: {},
            create: { notificationId: notifKD.id, userId: order.nguoiPhuTrach }
          });
        }
      }

      // Cập nhật Debt liên quan nếu daThanhToan thay đổi và Debt tồn tại
      if (daThanhToan !== undefined) {
        const amt = parseFloat(String(daThanhToan));
        const status = amt >= order.tongTien ? "PAID" : amt === 0 ? "UNPAID" : "PARTIAL";
        if (order.code) {
          await tx.debt.updateMany({
            where: { referenceId: order.code },
            data: { paidAmount: amt, status }
          });
        }
        await tx.debt.updateMany({
          where: { referenceId: order.id },
          data: { paidAmount: amt, status }
        });
      }

      if (isTransitioningToApproved) {
        // Tự động tạo bản ghi Debt khi kế toán duyệt đơn hàng
        const conNo = order.tongTien - order.daThanhToan;
        if (conNo > 0) {
          const doiTuong = order.customer?.name 
            ? `${order.customer.name}${order.customer.dienThoai ? " – " + order.customer.dienThoai : ""}`
            : `Khách hàng lẻ – Đơn ${order.code || order.id}`;
          
          await (tx.debt as any).create({
            data: {
              type: "phai-thu",
              partnerName: doiTuong,
              customerId: order.customerId || null,
              amount: order.tongTien,
              paidAmount: order.daThanhToan,
              status: order.daThanhToan === 0 ? "UNPAID" : "PARTIAL",
              dueDate: order.ngayGiao ? new Date(order.ngayGiao) : new Date(),
              referenceId: order.code || order.id,
              description: `Công nợ tự động phát sinh từ đơn hàng ${order.code || order.id}`,
            }
          });
        }

        const isPurchase = decisions?.purchase ?? (decision === "purchase");
        const isProduction = decisions?.production ?? (decision === "production");

        // GỬI LỆNH XUẤT KHO THÀNH PHẨM CHO THỦ KHO (Luôn luôn gửi khi kế toán duyệt)
        const storekeepers = await tx.employee.findMany({
          where: {
            OR: [
              { departmentName: { contains: "Kho" } },
              { departmentCode: { contains: "logistics" } },
              { position: { contains: "Thủ kho" } }
            ],
            userId: { not: null }
          },
          select: { userId: true }
        });
        const storekeeperUserIds = storekeepers.map(s => s.userId).filter(Boolean) as string[];

        if (storekeeperUserIds.length > 0) {
          const notifMsg = order.trangThaiKho === "in_stock" 
            ? `Đơn bán hàng ${order.code} của khách hàng ${order.customer?.name ?? "Khách vãng lai"} đã được phê duyệt và đủ hàng trong kho. Vui lòng tiến hành xuất kho.`
            : `Đơn bán hàng ${order.code} của khách hàng ${order.customer?.name ?? "Khách vãng lai"} đã được phê duyệt. Vui lòng xuất các mặt hàng có sẵn, phần thiếu sẽ được xử lý.`;
            
          const notifStorekeeper = await tx.notification.create({
            data: {
              title: `📦 Lệnh xuất kho cho đơn hàng ${order.code}`,
              content: notifMsg,
              type: "info",
              priority: "high",
              audienceType: "group",
              audienceValue: JSON.stringify(storekeeperUserIds),
              createdById: session.user.id ?? "system"
            }
          });
          await Promise.all(
            storekeeperUserIds.map(uid =>
              tx.notificationRecipient.upsert({
                where: { notificationId_userId: { notificationId: notifStorekeeper.id, userId: uid } },
                update: {},
                create: { notificationId: notifStorekeeper.id, userId: uid }
              })
            )
          );
        }

        // GỬI THÔNG BÁO CHO KINH DOANH
        if (order.nguoiPhuTrach) {
          const notifKD = await tx.notification.create({
            data: {
              title: `✅ Đơn hàng ${order.code} đã được phê duyệt`,
              content: `Đơn bán hàng ${order.code} của khách hàng ${order.customer?.name ?? "Khách vãng lai"} đã được kế toán phê duyệt.`,
              type: "success",
              priority: "normal",
              audienceType: "individual",
              audienceValue: order.nguoiPhuTrach,
              createdById: session.user.id ?? "system"
            }
          });
          await tx.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notifKD.id, userId: order.nguoiPhuTrach } },
            update: {},
            create: { notificationId: notifKD.id, userId: order.nguoiPhuTrach }
          });
        }

        // Bỏ qua rẽ nhánh in_stock hay out_of_stock, xử lý chung để bóc tách vật tư và tạo lệnh xuất kho
        const prItemsToCreate: any[] = [];
        const extractedMaterials: any[] = [];
        const itemsToExport: any[] = [];
        const missingThanhPhamItems: any[] = [];
          
          // Phân loại các mặt hàng trong đơn
          for (const item of order.saleOrderItems) {
            let warehouseCode = "KHO-CHINH";
            
            // Tự động match inventoryItemId nếu bị thiếu (do frontend không gửi)
            let matchedInvItemId = item.inventoryItemId;
            if (!matchedInvItemId && item.tenHang) {
               const matched = await tx.inventoryItem.findFirst({
                 where: {
                   OR: [
                     { code: item.tenHang },
                     { tenHang: item.tenHang }
                   ]
                 }
               });
               if (matched) {
                 matchedInvItemId = matched.id;
                 await tx.saleOrderItem.update({ where: { id: item.id }, data: { inventoryItemId: matchedInvItemId } });
               }
            }

            const invItem = matchedInvItemId ? await tx.inventoryItem.findFirst({ where: { id: matchedInvItemId } }) : null;
            let resolvedDinhMucId = (item as any).dinhMucId || (invItem as any)?.dinhMucId || null;
            
            if (!resolvedDinhMucId && invItem) {
              const dm = await tx.dinhMuc.findFirst({
                where: { inventoryItemId: invItem.id }
              });
              if (dm) resolvedDinhMucId = dm.id;
            }

            const requiredQty = item.soLuong;
            const isSelectedForProduction = productionItemIds.includes(item.id);

            let bomId = resolvedDinhMucId;

            const availableStock = invItem ? invItem.soLuong : 0;
            const actualMissingQty = Math.max(0, requiredQty - availableStock);
            const actualExportQty = Math.min(requiredQty, availableStock);

            // BƯỚC 1: XÁC ĐỊNH HÀNG CẦN SẢN XUẤT
            if (isSelectedForProduction && actualMissingQty > 0) {
              // CASE A: Sản xuất phần thiếu -> Bóc tách vật tư
              missingThanhPhamItems.push({
                saleOrderItemId: item.id,
                tenHang: item.tenHang || "Hàng hoá",
                donVi: invItem?.donVi || "cái",
                missingQty: actualMissingQty,
                dinhMucId: bomId // có thể null nếu sản xuất ngoài định mức
              });
            } else if (actualMissingQty > 0) {
              // CASE B: Không sản xuất nhưng thiếu hàng -> Mua bù phần thiếu
              prItemsToCreate.push({
                inventoryItemId: invItem?.id || null,
                tenHang: item.tenHang || "Hàng hoá",
                soLuong: actualMissingQty,
                donVi: invItem?.donVi || "cái",
                ghiChu: `Mua bù hàng thiếu cho đơn ${order.code} [Từ ${warehouseCode}]`
              });
            }

            // BƯỚC 2: TẤT CẢ CÁC MẶT HÀNG ĐỀU PHẢI ĐƯA VÀO LỆNH XUẤT KHO CHO LOGISTICS
            // Logistics cần biết tổng số lượng khách đặt để xuất kho (hoặc chờ hàng về để xuất)
            const isShortage = availableStock < requiredQty;
            itemsToExport.push({
              tenHang: item.tenHang || "Hàng hoá",
              soLuong: requiredQty,
              donVi: invItem?.donVi || "cái",
              kho: warehouseCode === "KHO-CHINH" ? "Kho Hàng Hoá (KHO-CHINH)" : "Kho Vật Tư Phụ Kiện (KVP)",
              inventoryItemId: invItem?.id || null,
              isShortage
            });
          }

          // B. XỬ LÝ SẢN XUẤT VÀ BÓC TÁCH VẬT TƯ (Cho các item có tick sản xuất)
          const newTrangThai = missingThanhPhamItems.length > 0 ? "in_production" : "approved";
          orderUpdate = await tx.saleOrder.update({ where: { id: order.id }, data: { trangThai: newTrangThai } });

          if (missingThanhPhamItems.length > 0) {

            const allMaterials: any[] = [];
            for (const item of missingThanhPhamItems) {
              if (item.dinhMucId) {
                const dm = await tx.dinhMuc.findUnique({
                  where: { id: item.dinhMucId },
                  include: { vatTu: { include: { inventoryItem: true } } }
                });
                if (dm && dm.vatTu) {
                for (const m of dm.vatTu) {
                  let matId = m.inventoryItemId;
                  let matName = m.inventoryItem?.tenHang || m.tenVatTu || "Vật tư không xác định";
                  let matUnit = m.inventoryItem?.donVi || m.donViTinh || "cái";

                  // Nếu chưa có inventoryItemId, tự động tìm trong bảng MaterialItem theo mã hoặc tên
                  if (!matId && m.tenVatTu) {
                    const matchedMat = await tx.inventoryItem.findFirst({
                      where: {
                        OR: [
                          { code: m.tenVatTu },
                          { tenHang: m.tenVatTu }
                        ]
                      }
                    });
                    if (matchedMat) {
                      matId = matchedMat.id;
                      matName = matchedMat.tenHang;
                      if (matchedMat.donVi) matUnit = matchedMat.donVi;
                    }
                  }

                  allMaterials.push({
                    inventoryItemId: matId,
                    tenVatTu: matName,
                    donVi: matUnit,
                    soLuongCan: m.soLuong * item.missingQty
                  });
                }
              }
            }
          }

            const groupedMaterials = allMaterials.reduce((acc, curr) => {
              const key = curr.inventoryItemId || curr.tenVatTu;
              if (!acc[key]) acc[key] = { ...curr };
              else acc[key].soLuongCan += curr.soLuongCan;
              return acc;
            }, {});

            for (const mat of Object.values(groupedMaterials) as any[]) {
              if (!mat.inventoryItemId) {
                throw new Error(`Phát hiện vật tư "${mat.tenVatTu}" trong định mức sản xuất nhưng chưa được liên kết mã trong CSDL. Vui lòng cập nhật định mức trước khi duyệt.`);
              }
              // Lấy tồn kho vật tư từ MaterialStock
              const matStock = await tx.inventoryStock.aggregate({
                where: { inventoryItemId: mat.inventoryItemId },
                _sum: { soLuong: true }
              });
              const currentStock = matStock._sum.soLuong || 0;
              
              const isShortage = currentStock < mat.soLuongCan;
              
              extractedMaterials.push({
                inventoryItemId: mat.inventoryItemId,
                tenVatTu: mat.tenVatTu,
                donVi: mat.donVi,
                soLuong: mat.soLuongCan,
                kho: "Kho Vật Tư Phụ Kiện (KVP)",
                isShortage
              });

              if (isShortage) {
                prItemsToCreate.push({
                  inventoryItemId: null, // PR cho vật tư không liên kết InventoryItem
                  tenHang: mat.tenVatTu,
                  soLuong: mat.soLuongCan - currentStock,
                  donVi: mat.donVi,
                  ghiChu: `Bù vật tư KVP thiếu để sản xuất đơn ${order.code}`
                });
              }
            }

            // Gửi lệnh sản xuất
            const prodHead = await tx.employee.findFirst({
              where: {
                status: "active",
                OR: [
                  { departmentName: { contains: "Sản xuất" }, position: { contains: "Trưởng" } },
                  { departmentCode: { contains: "production" }, position: { contains: "Trưởng" } }
                ]
              },
              select: { userId: true }
            });

            let desc = `Yêu cầu sản xuất cho đơn hàng ${order.code}.\nCác mặt hàng:\n`;
            missingThanhPhamItems.forEach(i => desc += `- ${i.tenHang}: ${i.missingQty} ${i.donVi}\n`);

            let dueDate;
            if (order.ngayGiao) {
              dueDate = new Date(order.ngayGiao);
            }

            const prodTask = await tx.task.create({
              data: {
                title: `Lệnh sản xuất cho đơn hàng ${order.code}`,
                description: desc,
                assigneeId: prodHead?.userId || session.user.id,
                creatorId: session.user.id,
                deptCode: "production",
                priority: "high",
                status: "pending",
                actualResult: JSON.stringify(missingThanhPhamItems),
                ...(dueDate && { dueDate })
              }
            });

            if (prodHead?.userId) {
              const prodNotif = await tx.notification.create({
                data: {
                  title: `🏭 Yêu cầu sản xuất lắp ráp cho đơn ${order.code}`,
                  content: `Đơn bán hàng ${order.code} cần sản xuất lắp ráp. Đã tạo lệnh: "${prodTask.title}".`,
                  type: "warning",
                  priority: "high",
                  audienceType: "individual",
                  audienceValue: prodHead.userId,
                  createdById: session.user.id
                }
              });
              await tx.notificationRecipient.upsert({
                where: { notificationId_userId: { notificationId: prodNotif.id, userId: prodHead.userId } },
                update: {},
                create: { notificationId: prodNotif.id, userId: prodHead.userId }
              });
            }
          }

          // C. TẠO LỆNH XUẤT KHO CHUNG (Hàng gốc không sản xuất + Vật tư sản xuất)
          if (itemsToExport.length > 0 || extractedMaterials.length > 0) {
            let materialDesc = `Yêu cầu xuất kho cho đơn hàng ${order.code}.\n\n`;
            
            if (itemsToExport.length > 0) {
              materialDesc += `📦 1. HÀNG HOÁ GIAO KHÁCH:\n`;
              itemsToExport.forEach(m => materialDesc += `- ${m.tenHang}: ${m.soLuong} ${m.donVi} [${m.kho}]\n`);
              materialDesc += `\n`;
            }

            if (extractedMaterials.length > 0) {
              materialDesc += `🔧 2. VẬT TƯ SẢN XUẤT:\n`;
              extractedMaterials.forEach(m => materialDesc += `- ${m.tenVatTu}: ${m.soLuong} ${m.donVi} [${m.kho}]\n`);
            }

            // Combine everything into a JSON array to display in the Logistics UI
            const combinedLogisticsItems = [
              ...itemsToExport.map(i => ({ tenHang: i.tenHang, soLuong: i.soLuong, donVi: i.donVi || "cái", type: i.kho, isShortage: i.isShortage })),
              ...extractedMaterials.map(m => ({ tenHang: m.tenVatTu, soLuong: m.soLuong, donVi: m.donVi || "cái", type: m.kho, isShortage: m.isShortage }))
            ];

            // TẠO PHIẾU ĐIỀU PHỐI (LOGISTICS TICKETS) CHO MÀN HÌNH KHO
            if (itemsToExport.length > 0) {
              const bCode = "PK-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + Math.floor(1000 + Math.random() * 9000);
              await (tx as any).logisticsTicket.create({
                data: {
                  code: bCode,
                  type: "BATCH_PACKING",
                  saleOrderId: order.id,
                  status: "PENDING",
                  assignedToId: null,
                  items: {
                    create: itemsToExport
                      .filter(i => i.inventoryItemId)
                      .map(i => ({
                        inventoryItemId: i.inventoryItemId,
                        requestedQty: i.soLuong,
                      }))
                  }
                }
              });
            }

            if (extractedMaterials.length > 0) {
              const mCode = "CP-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + Math.floor(1000 + Math.random() * 9000);
              await (tx as any).logisticsTicket.create({
                data: {
                  code: mCode,
                  type: "MATERIAL_PICKING",
                  saleOrderId: order.id,
                  status: "PENDING",
                  assignedToId: null,
                  items: {
                    create: extractedMaterials
                      .filter(m => m.inventoryItemId)
                      .map(m => ({
                        inventoryItemId: m.inventoryItemId,
                        requestedQty: m.soLuong,
                      }))
                  }
                }
              });
            }

            const khoTask = await tx.task.create({
              data: {
                title: `Lệnh xuất kho cho đơn hàng ${order.code}`,
                description: materialDesc,
                assigneeId: storekeeperUserIds[0] || session.user.id,
                creatorId: session.user.id,
                deptCode: "logistics",
                priority: "high",
                status: "pending",
                actualResult: JSON.stringify(combinedLogisticsItems)
              }
            });

            // Gửi thông báo Lệnh Xuất Kho
            if (storekeeperUserIds.length > 0) {
              const khoNotif = await tx.notification.create({
                data: {
                  title: `📦 Lệnh xuất kho mới (${order.code})`,
                  content: `Đã tạo Lệnh xuất kho cho đơn hàng ${order.code}. Xem chi tiết trong module Công việc.`,
                  type: "info",
                  priority: "high",
                  audienceType: "group",
                  audienceValue: JSON.stringify(storekeeperUserIds),
                  createdById: session.user.id
                }
              });
              await Promise.all(
                storekeeperUserIds.map(uid =>
                  tx.notificationRecipient.upsert({
                    where: { notificationId_userId: { notificationId: khoNotif.id, userId: uid } },
                    update: {},
                    create: { notificationId: khoNotif.id, userId: uid }
                  })
                )
              );
            }
          }

          // D. TẠO YÊU CẦU MUA HÀNG (Cho hàng hoá thiếu và vật tư thiếu)
          if (prItemsToCreate.length > 0) {
            // Find PR manager
            const prHead = await tx.employee.findFirst({
              where: {
                status: "active",
                OR: [
                  { departmentName: { contains: "Mua hàng" }, position: { contains: "Trưởng" } },
                  { departmentCode: { contains: "purchase" }, position: { contains: "Trưởng" } }
                ]
              },
              select: { userId: true }
            });

            const code = "YC-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + Math.floor(1000 + Math.random() * 9000);
            const pr = await tx.purchaseRequest.create({
              data: {
                code,
                nguoiYeuCau: session.user.name ?? "Tài chính Kế toán",
                donVi: "Tài chính Kế toán",
                createdById: session.user.id,
                trangThai: "chua-xu-ly",
                lyDo: `Bổ sung hàng hoá/vật tư do thiếu cho đơn ${order.code}`,
                items: { create: prItemsToCreate }
              }
            });

            if (prHead?.userId) {
              const prNotif = await tx.notification.create({
                data: {
                  title: `🛒 Yêu cầu mua hàng mới từ Tài chính`,
                  content: `Có yêu cầu mua hàng mới (${code}) để bổ sung cho đơn bán hàng ${order.code}.`,
                  type: "info",
                  priority: "high",
                  audienceType: "individual",
                  audienceValue: prHead.userId,
                  createdById: session.user.id
                }
              });
              await tx.notificationRecipient.upsert({
                where: { notificationId_userId: { notificationId: prNotif.id, userId: prHead.userId } },
                update: {},
                create: { notificationId: prNotif.id, userId: prHead.userId }
              });
            }
          }
        }
      // [ACCOUNTING] Ghi nhận công nợ và doanh thu chưa thực hiện (Nợ 131 / Có 3387) khi DUYỆT ĐƠN
      if (orderUpdate && (orderUpdate.trangThai === "approved" || orderUpdate.trangThai === "in_production") && order.trangThai !== "approved" && order.trangThai !== "in_production") {
        if (orderUpdate.tongTien > 0) {
          // 1. Tạo bản ghi Debt (Công nợ)
          const existingDebt = await tx.debt.findFirst({ where: { referenceId: orderUpdate.code || "" } });
          if (!existingDebt) {
            await tx.debt.create({
              data: {
                type: "phai-thu",
                partnerName: order.customer?.name || "Khách hàng lẻ",
                customerId: order.customerId || null,
                amount: orderUpdate.tongTien,
                paidAmount: orderUpdate.daThanhToan || 0,
                status: (orderUpdate.daThanhToan || 0) >= orderUpdate.tongTien ? "PAID" : "UNPAID",
                dueDate: orderUpdate.ngayGiao || new Date(),
                referenceId: orderUpdate.code || undefined,
                description: `Công nợ đơn hàng bán ${orderUpdate.code}`,
              }
            });

            // 2. Gọi engine hạch toán (Nợ 131 / Có 3387)
            const { createAutoJournal } = require("@/lib/accounting-engine");
            await createAutoJournal({
              event: "SALES_REVENUE",
              overrideDebitCode: "131",
              overrideCreditCode: "3387",
              amount: orderUpdate.tongTien,
              referenceCode: orderUpdate.code || undefined,
              description: `Ghi nhận công nợ (Doanh thu chưa thực hiện) đơn hàng ${orderUpdate.code}`
            });
          }
        }
      }

      return orderUpdate;
    });

    const guest = parseGuestInfo(updated.ghiChu);
    const resolvedUpdated = {
      ...updated,
      ghiChu: cleanGhiChu(updated.ghiChu),
      customer: order.customer || (guest ? {
        id: null,
        name: guest.name,
        dienThoai: guest.dienThoai,
        address: guest.address,
      } : null)
    };

    return NextResponse.json(resolvedUpdated);
  } catch (e: unknown) {
    console.error("[PATCH /sales/[id]]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/plan-finance/sales/[id] — xoá đơn bán hàng và công nợ liên quan
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const order = await prisma.saleOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Xoá bút toán kế toán
      if (order.code) {
        await deleteAutoJournalByReference(order.code, "Huỷ/xoá đơn hàng bán");
      }
      // Xoá công nợ liên quan nếu có
      if (order.code) {
        await tx.debt.deleteMany({
          where: { referenceId: order.code },
        });

        // Xoá yêu cầu mua hàng liên quan
        await tx.purchaseRequest.deleteMany({
          where: { lyDo: { contains: order.code } }
        });

        // Lấy danh sách phiếu LogisticsTicket liên quan sẽ bị xoá
        const ticketsToDelete = await tx.logisticsTicket.findMany({
          where: { saleOrderId: id },
          select: { id: true }
        });
        const ticketIdsToDelete = ticketsToDelete.map(t => t.id);

        // Xử lý lệnh sản xuất / xuất kho KVP (Task) liên quan
        const relatedTasks = await tx.task.findMany({
          where: { title: { contains: order.code } }
        });

        for (const task of relatedTasks) {
          if (task.title.startsWith("Gom hàng:")) {
            // Xử lý actualResult để xoá ticketId tương ứng
            let parsedResult = [];
            try { parsedResult = JSON.parse(task.actualResult || "[]"); } catch(e) {}
            let updatedResult = parsedResult;
            if (Array.isArray(parsedResult)) {
              updatedResult = parsedResult.filter(tid => !ticketIdsToDelete.includes(tid));
            }

            // Xoá mã đơn hàng khỏi title và description
            let newTitle = task.title.replace(order.code, "").replace(/,\s*,/g, ",").replace(/:\s*,/, ": ").replace(/,\s*$/, "").trim();
            let newDesc = (task.description || "").replace(order.code, "").replace(/,\s*,/g, ",").replace(/:\s*,/, ": ").replace(/,\s*$/, "").trim();

            if (newTitle === "Gom hàng:" || (Array.isArray(parsedResult) && parsedResult.length > 0 && updatedResult.length === 0)) {
              // Nếu không còn đơn nào thì xoá luôn task
              await tx.task.delete({ where: { id: task.id } });
            } else {
              // Cập nhật lại task để giữ lại các đơn còn lại
              await tx.task.update({
                where: { id: task.id },
                data: { title: newTitle, description: newDesc, actualResult: JSON.stringify(updatedResult) }
              });
            }
          } else {
            // Đối với các loại task khác (như Lệnh sản xuất) thì xoá luôn
            await tx.task.delete({ where: { id: task.id } });
          }
        }
      }
      await tx.debt.deleteMany({
        where: { referenceId: order.id },
      });

      // Xoá đơn hàng và các phiếu logistics liên đới
      await tx.logisticsTicket.deleteMany({
        where: { saleOrderId: id }
      });
      // Huỷ liên kết các thanh toán (PaymentNotification)
      await tx.paymentNotification.updateMany({
        where: { saleOrderId: id },
        data: { saleOrderId: null }
      });
      await tx.saleOrder.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DELETE /sales/[id]]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
