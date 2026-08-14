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
      include: { activities: { orderBy: { createdAt: 'desc' } } }
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
    
    let overrideBomCode = null;
    if (defect.orderNumber) {
      if (defect.orderNumber.startsWith("QC-")) {
        const inspection = await prisma.qualityInspection.findUnique({ where: { code: defect.orderNumber } });
        if (inspection && inspection.metadata) {
          try {
            const meta = JSON.parse(inspection.metadata);
            if (meta.bomCode) overrideBomCode = meta.bomCode;
          } catch (e) {}
        }
      } else if (defect.orderNumber.startsWith("SO-")) {
        const saleOrder = await (prisma as any).saleOrder.findUnique({
          where: { code: defect.orderNumber },
          include: { saleOrderItems: { include: { inventoryItem: true, dinhMuc: true } } }
        });
        if (saleOrder) {
          const item = saleOrder.saleOrderItems.find((i: any) => i.inventoryItem?.code === defect.productCode || i.inventoryItem?.model === defect.productCode);
          if (item && item.dinhMuc) overrideBomCode = item.dinhMuc.code;
        }
      }
    }

    if (overrideBomCode) {
      const specificDinhMuc = await prisma.dinhMuc.findUnique({
        where: { code: overrideBomCode },
        include: {
          vatTu: {
            include: {
              inventoryItem: { select: { soLuong: true, tenHang: true } }
            }
          }
        }
      });
      if (specificDinhMuc) {
        bomCode = specificDinhMuc.code;
        bomItems = specificDinhMuc.vatTu.map((vt: any) => ({
          id: vt.maVatTu || vt.id,
          realInventoryItemId: vt.inventoryItem?.id,
          name: vt.inventoryItem?.tenHang || vt.tenVatTu,
          unit: vt.donViTinh || 'Cái',
          qty: vt.soLuong,
          stock: vt.inventoryItem?.soLuong || 0
        }));
      }
    }



    return NextResponse.json({
      ...defect,
      customerName: customerInfo?.name || defect.customerName,
      customerPhone: customerInfo?.dienThoai || defect.customerPhone,
      customerAddress: customerInfo?.address || defect.customerAddress,
      bomCode,
      bomItems,
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
