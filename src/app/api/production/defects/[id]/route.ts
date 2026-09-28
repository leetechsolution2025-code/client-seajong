import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const defect = await (prisma as any).defectRecord.findUnique({
      where: { id },
      include: { 
        activities: { orderBy: { createdAt: 'desc' } },
        logisticsTickets: {
          include: {
            items: {
              include: {
                inventoryItem: true
              }
            }
          }
        }
      }
    });

    if (!defect) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let customerInfo = null;
    if (defect.customerId) {
      customerInfo = await (prisma as any).customer.findUnique({
        where: { id: defect.customerId },
        select: { dienThoai: true, address: true, name: true }
      });
    }

    let bomCode = null;
    let bomItems: any[] = [];
    let saleOrder: any = null;
    let foundDinhMuc: any = null;

    if (defect.orderNumber) {
      if (defect.orderNumber.startsWith("QC-")) {
        const inspection = await prisma.qualityInspection.findUnique({ where: { code: defect.orderNumber } });
        if (inspection && inspection.metadata) {
          try {
            const meta = JSON.parse(inspection.metadata);
            if (meta.bomCode) {
              foundDinhMuc = await prisma.dinhMuc.findFirst({
                where: { OR: [{ code: meta.bomCode }, { id: meta.bomCode }] },
                include: {
                  vatTu: {
                    include: { inventoryItem: { select: { id: true, soLuong: true, tenHang: true, donVi: true } } }
                  }
                }
              });
            }
          } catch (e) {}
        }
      } else {
        // Sale Order (DBH-, SO-, DH-, or ID)
        saleOrder = await (prisma as any).saleOrder.findFirst({
          where: {
            OR: [
              { code: defect.orderNumber },
              { id: defect.orderNumber }
            ]
          },
          include: {
            customer: true,
            saleOrderItems: {
              include: {
                inventoryItem: {
                  include: {
                    dinhMucs: {
                      orderBy: { createdAt: "desc" },
                      include: {
                        vatTu: {
                          include: { inventoryItem: { select: { id: true, soLuong: true, tenHang: true, donVi: true } } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });

        if (saleOrder) {
          const matchingItems = (saleOrder.saleOrderItems || []).filter((i: any) =>
            (i.inventoryItem?.code && i.inventoryItem.code === defect.productCode) ||
            (i.inventoryItem?.model && i.inventoryItem.model === defect.productCode) ||
            (i.tenHang && defect.productCode && i.tenHang.toLowerCase().includes(defect.productCode.toLowerCase())) ||
            (i.tenHang && defect.productName && i.tenHang.trim() === defect.productName.trim())
          );

          // 1st pass: Look for specific DinhMuc specified in order items
          for (const item of matchingItems) {
            let parsedGhiChu: any = {};
            if (item.ghiChu) {
              try { parsedGhiChu = JSON.parse(item.ghiChu); } catch (e) {}
            }

            const candidates = [
              item.dinhMucId,
              parsedGhiChu?.bomCode,
              parsedGhiChu?.dinhMucId,
              (typeof parsedGhiChu?.code === "string" && parsedGhiChu.code.startsWith("DM-") ? parsedGhiChu.code : null)
            ].filter(Boolean);

            for (const cand of candidates) {
              const dm = await prisma.dinhMuc.findFirst({
                where: { OR: [{ id: cand }, { code: cand }] },
                include: {
                  vatTu: {
                    include: { inventoryItem: { select: { id: true, soLuong: true, tenHang: true, donVi: true } } }
                  }
                }
              });
              if (dm) {
                foundDinhMuc = dm;
                break;
              }
            }
            if (foundDinhMuc) break;
          }

          // 2nd pass: Look in item's inventoryItem.dinhMucs
          if (!foundDinhMuc) {
            for (const item of matchingItems) {
              if (item.inventoryItem?.dinhMucs?.length > 0) {
                foundDinhMuc = item.inventoryItem.dinhMucs[0];
                break;
              }
            }
          }
        }
      }
    }

    // Fallback 1: Lookup default DinhMuc from InventoryItem
    if (!foundDinhMuc) {
      const invItem = await prisma.inventoryItem.findFirst({
        where: {
          OR: [
            { code: defect.productCode },
            { model: defect.productCode },
            { tenHang: defect.productName }
          ]
        },
        include: {
          dinhMucs: {
            orderBy: { createdAt: "desc" },
            include: {
              vatTu: {
                include: { inventoryItem: { select: { id: true, soLuong: true, tenHang: true, donVi: true } } }
              }
            }
          }
        }
      });
      if (invItem?.dinhMucs?.length) {
        foundDinhMuc = invItem.dinhMucs[0];
      }
    }

    // Fallback 2: Direct lookup by productCode in DinhMuc table
    if (!foundDinhMuc && defect.productCode) {
      foundDinhMuc = await prisma.dinhMuc.findFirst({
        where: {
          OR: [
            { code: `DM-${defect.productCode}` },
            { code: { contains: defect.productCode } },
            { tenDinhMuc: { contains: defect.productCode } }
          ]
        },
        include: {
          vatTu: {
            include: { inventoryItem: { select: { id: true, soLuong: true, tenHang: true, donVi: true } } }
          }
        }
      });
    }

    if (foundDinhMuc) {
      bomCode = foundDinhMuc.code;
      bomItems = (foundDinhMuc.vatTu || []).map((vt: any) => ({
        id: vt.maVatTu || vt.id,
        realInventoryItemId: vt.inventoryItem?.id || vt.inventoryItemId,
        name: vt.inventoryItem?.tenHang || vt.tenVatTu,
        unit: vt.donViTinh || vt.inventoryItem?.donVi || 'Cái',
        qty: vt.soLuong,
        stock: vt.inventoryItem?.soLuong || 0
      }));
    }

    const customerName = customerInfo?.name || saleOrder?.customer?.name || defect.customerName;
    const customerPhone = customerInfo?.dienThoai || saleOrder?.customer?.dienThoai || defect.customerPhone;
    const customerAddress = customerInfo?.address || saleOrder?.customer?.address || defect.customerAddress;
    const purchaseDate = defect.purchaseDate || saleOrder?.ngayGiao || saleOrder?.ngayDat || null;

    // Lấy thông tin phê duyệt và tác vụ liên quan
    const [approval, task] = await Promise.all([
      (prisma as any).approvalRequest.findFirst({
        where: { entityId: id },
        orderBy: { createdAt: 'desc' }
      }),
      (prisma as any).task.findFirst({
        where: {
          OR: [
            { description: { contains: defect.code } },
            { title: { contains: defect.code } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Tìm quyết định và mức xử lý
    const decisionActivity = defect.activities?.find((a: any) => a.action?.startsWith('QUYẾT ĐỊNH:'));
    let resolution = 'Sửa chữa tại chỗ';
    if (decisionActivity) {
      if (decisionActivity.action.includes('THAY LINH KIỆN')) resolution = 'Thay linh kiện';
      else if (decisionActivity.action.includes('PHÂN RÃ')) resolution = 'Phân rã thu hồi vật tư linh kiện';
      else if (decisionActivity.action.includes('HUỶ BỎ')) resolution = 'Huỷ bỏ thay thế bằng hàng hoá mới';
      else if (decisionActivity.action.includes('NHẬP LẠI KHO')) resolution = 'Nhập lại kho';
      else if (decisionActivity.action.includes('SỬA CHỮA')) resolution = 'Sửa chữa tại chỗ';
    } else if (approval?.entityType === 'DEFECT_MATERIAL_EXPORT') {
      resolution = 'Thay linh kiện';
    } else if (approval?.entityType === 'DEFECT_PRODUCT_EXPORT') {
      resolution = 'Huỷ bỏ thay thế bằng hàng hoá mới';
    } else if (task) {
      resolution = 'Phân rã thu hồi vật tư linh kiện';
    }

    // Trích xuất các linh kiện đã được chọn
    const rawSelectedKeys: string[] = [];
    const editedQuantities: Record<string, number> = {};

    if (approval?.metadata) {
      try {
        const items = JSON.parse(approval.metadata);
        if (Array.isArray(items)) {
          items.forEach((it: any) => {
            const key = it.id || it.code;
            if (key) {
              rawSelectedKeys.push(key);
              if (it.inventoryItemId) rawSelectedKeys.push(it.inventoryItemId);
              editedQuantities[key] = it.quantity || it.qty || 1;
            }
          });
        }
      } catch (e) {}
    }

    if (rawSelectedKeys.length === 0 && task?.actualResult) {
      try {
        const items = JSON.parse(task.actualResult);
        if (Array.isArray(items)) {
          items.forEach((it: any) => {
            const key = it.code || it.name;
            if (key) {
              rawSelectedKeys.push(key);
              editedQuantities[key] = it.soLuong || it.quantity || 1;
            }
          });
        }
      } catch (e) {}
    }

    if (rawSelectedKeys.length === 0 && defect.logisticsTickets?.length > 0) {
      defect.logisticsTickets.forEach((t: any) => {
        t.items?.forEach((it: any) => {
          const key = it.inventoryItem?.code || it.inventoryItemId;
          if (key) {
            rawSelectedKeys.push(key);
            if (it.inventoryItem?.code) rawSelectedKeys.push(it.inventoryItem.code);
            editedQuantities[key] = it.requestedQty || 1;
          }
        });
      });
    }

    // Khớp danh sách key với bomItems để lấy đúng id trong bảng bomItems
    const selectedBomItemIds: string[] = [];
    bomItems.forEach((b: any) => {
      const isMatched = rawSelectedKeys.includes(b.id) ||
        (b.realInventoryItemId && rawSelectedKeys.includes(b.realInventoryItemId)) ||
        (b.name && rawSelectedKeys.includes(b.name));
      if (isMatched) {
        selectedBomItemIds.push(b.id);
        if (editedQuantities[b.id]) {
          editedQuantities[b.id] = editedQuantities[b.id];
        } else if (b.realInventoryItemId && editedQuantities[b.realInventoryItemId]) {
          editedQuantities[b.id] = editedQuantities[b.realInventoryItemId];
        }
      }
    });

    const repairPlan = defect.repairPlan || decisionActivity?.description || approval?.note || '';

    const qcInspection = await prisma.qualityInspection.findFirst({
      where: {
        OR: [
          { metadata: { contains: defect.code } },
          { metadata: { contains: defect.id } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      ...defect,
      customerName,
      customerPhone,
      customerAddress,
      purchaseDate,
      bomCode,
      bomItems,
      resolution,
      repairPlan,
      selectedBomItemIds,
      editedQuantities,
      qcInspection,
      mediaUrls: defect.mediaUrls ? JSON.parse(defect.mediaUrls) : []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const defect = await (prisma as any).defectRecord.findUnique({
      where: { id }
    });

    if (!defect) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Parse media URLs and delete physical files
    if (defect.mediaUrls) {
      try {
        const urls: string[] = JSON.parse(defect.mediaUrls);
        
        urls.forEach(url => {
          // Only delete local files that start with /uploads/defects/
          if (url.startsWith('/uploads/defects/')) {
            const filePath = path.join(process.cwd(), 'public', url);
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
                console.log(`Deleted file: ${filePath}`);
              } catch (err) {
                console.error(`Failed to delete file: ${filePath}`, err);
              }
            }
          }
        });
      } catch (parseError) {
        console.error('Failed to parse mediaUrls', parseError);
      }
    }

    // Delete the record from DB
    await (prisma as any).defectRecord.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting defect:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
