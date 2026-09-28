import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const defects = await (prisma as any).defectRecord.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const productCodes = [...new Set(defects.map((d: any) => d.productCode).filter(Boolean))] as string[];
    const orderNumbers = [...new Set(defects.map((d: any) => d.orderNumber).filter(Boolean))] as string[];
    const qcCodes = orderNumbers.filter(c => c.startsWith("QC-"));
    const nonQcOrderNumbers = orderNumbers.filter(c => !c.startsWith("QC-"));

    const [items, inspections, saleOrders] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: {
          OR: [
            { code: { in: productCodes } },
            { model: { in: productCodes } }
          ]
        },
        include: {
          dinhMucs: {
            orderBy: { createdAt: 'desc' },
            select: { code: true }
          }
        }
      }),
      qcCodes.length > 0 ? prisma.qualityInspection.findMany({
        where: { code: { in: qcCodes } },
        select: { code: true, metadata: true }
      }) : Promise.resolve([]),
      nonQcOrderNumbers.length > 0 ? (prisma as any).saleOrder.findMany({
        where: {
          OR: [
            { code: { in: nonQcOrderNumbers } },
            { id: { in: nonQcOrderNumbers } }
          ]
        },
        include: {
          saleOrderItems: {
            include: {
              inventoryItem: {
                include: {
                  dinhMucs: {
                    orderBy: { createdAt: 'desc' },
                    select: { code: true }
                  }
                }
              }
            }
          }
        }
      }) : Promise.resolve([])
    ]);

    const bomMap: Record<string, string> = {};
    items.forEach(item => {
      const bom = item.dinhMucs?.[0]?.code;
      if (bom) {
        if (item.code) bomMap[item.code] = bom;
        if (item.model) bomMap[item.model] = bom;
      }
    });

    const specificBomMap: Record<string, string> = {};
    
    inspections.forEach((ins: any) => {
      if (ins.metadata) {
         try {
           const meta = JSON.parse(ins.metadata);
           if (meta.bomCode) specificBomMap[ins.code] = meta.bomCode;
         } catch(e) {}
      }
    });

    const dinhMucRefIds: string[] = [];
    saleOrders.forEach((so: any) => {
      so.saleOrderItems?.forEach((item: any) => {
        if (item.dinhMucId) dinhMucRefIds.push(item.dinhMucId);
        if (item.ghiChu) {
          try {
            const parsed = JSON.parse(item.ghiChu);
            if (parsed.bomCode) dinhMucRefIds.push(parsed.bomCode);
            if (parsed.dinhMucId) dinhMucRefIds.push(parsed.dinhMucId);
            if (typeof parsed.code === "string" && parsed.code.startsWith("DM-")) dinhMucRefIds.push(parsed.code);
          } catch(e) {}
        }
      });
    });

    const referencedDinhMucs = dinhMucRefIds.length > 0 ? await prisma.dinhMuc.findMany({
      where: {
        OR: [
          { id: { in: dinhMucRefIds } },
          { code: { in: dinhMucRefIds } }
        ]
      },
      select: { id: true, code: true }
    }) : [];

    const dinhMucLookup: Record<string, string> = {};
    referencedDinhMucs.forEach(dm => {
      if (dm.code) {
        dinhMucLookup[dm.id] = dm.code;
        dinhMucLookup[dm.code] = dm.code;
      }
    });

    defects.forEach((d: any) => {
      if (d.orderNumber && !d.orderNumber.startsWith("QC-")) {
        const so = saleOrders.find((s: any) => s.code === d.orderNumber || s.id === d.orderNumber);
        if (so) {
          const matchingItems = (so.saleOrderItems || []).filter((i: any) =>
            (i.inventoryItem?.code && i.inventoryItem.code === d.productCode) ||
            (i.inventoryItem?.model && i.inventoryItem.model === d.productCode) ||
            (i.tenHang && d.productCode && i.tenHang.toLowerCase().includes(d.productCode.toLowerCase())) ||
            (i.tenHang && d.productName && i.tenHang.trim() === d.productName.trim())
          );

          // Pass 1: find exact matching DinhMuc among candidates across all order items
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
              if (dinhMucLookup[cand]) {
                specificBomMap[`${d.orderNumber}_${d.productCode}`] = dinhMucLookup[cand];
                break;
              }
            }
            if (specificBomMap[`${d.orderNumber}_${d.productCode}`]) break;
          }

          // Pass 2: Fallback to item.inventoryItem.dinhMucs if no exact match found
          if (!specificBomMap[`${d.orderNumber}_${d.productCode}`]) {
            for (const item of matchingItems) {
              if (item.inventoryItem?.dinhMucs?.[0]?.code) {
                specificBomMap[`${d.orderNumber}_${d.productCode}`] = item.inventoryItem.dinhMucs[0].code;
                break;
              }
            }
          }
        }
      }
    });
    
    const formatted = defects.map((d: any) => {
      let bom: string | null = null;
      if (d.orderNumber && d.orderNumber.startsWith("QC-") && specificBomMap[d.orderNumber]) {
         bom = specificBomMap[d.orderNumber];
      } else if (d.orderNumber && specificBomMap[`${d.orderNumber}_${d.productCode}`]) {
         bom = specificBomMap[`${d.orderNumber}_${d.productCode}`];
      } else if (bomMap[d.productCode]) {
         bom = bomMap[d.productCode];
      }

      return {
        ...d,
        mediaUrls: d.mediaUrls ? JSON.parse(d.mediaUrls) : [],
        bomCode: bom
      };
    });
    
    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch defects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    // Save files physically
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'defects');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const mediaUrls: string[] = [];
    
    for (const file of files) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Sanitize filename to prevent spaces/special chars
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filename = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadDir, filename);
        
        fs.writeFileSync(filePath, buffer);
        mediaUrls.push(`/uploads/defects/${filename}`);
      }
    }

    // Default code if missing
    let code = formData.get('code') as string;
    if (!code) {
      const isWarranty = formData.get('source') === 'WARRANTY';
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = isWarranty ? 'WR' : 'ERR';
      
      const lastDefect = await (prisma as any).defectRecord.findFirst({
        where: { code: { startsWith: `${prefix}-${timestamp}` } },
        orderBy: { code: 'desc' }
      });
      
      let nextNumber = 1;
      if (lastDefect && lastDefect.code) {
        const parts = lastDefect.code.split('-');
        if (parts.length === 3) {
          nextNumber = parseInt(parts[2], 10) + 1;
        }
      }
      
      code = `${prefix}-${timestamp}-${nextNumber.toString().padStart(2, '0')}`;
    }

    const source = formData.get('source') as string || 'INTERNAL';
    const refundAmount = parseFloat(formData.get('refundAmount') as string) || 0;
    let customerId = (formData.get('customerId') as string) || null;
    const customerName = (formData.get('customerName') as string) || null;

    if (!customerId && customerName) {
      const foundCustomer = await prisma.customer.findFirst({
        where: { name: customerName },
        select: { id: true }
      });
      if (foundCustomer) {
        customerId = foundCustomer.id;
      }
    }

    const defect = await (prisma as any).defectRecord.create({
      data: {
        code,
        source,
        status: formData.get('status') as string || 'NEW',
        productName: formData.get('productName') as string || 'Sản phẩm',
        productCode: formData.get('productCode') as string || 'SP-001',
        quantity: parseInt(formData.get('quantity') as string) || 1,
        description: formData.get('description') as string || '',
        mediaUrls: JSON.stringify(mediaUrls),
        reporterName: formData.get('reporterName') as string || 'Unknown',
        reporterDepartment: formData.get('reporterDepartment') as string || 'Unknown',
        customerName,
        customerId,
        customerAddress: formData.get('customerAddress') as string || null,
        orderNumber: formData.get('orderNumber') as string || null,
        assignedTo: formData.get('assignedTo') as string || null,
        completionDate: formData.get('completionDate') ? new Date(formData.get('completionDate') as string) : null,
      }
    });

    // Nếu là luồng hàng trả về (source === 'RETURN' hoặc có refundAmount > 0)
    if (source === 'RETURN' || refundAmount > 0) {
      // 1. Điều chỉnh giảm công nợ khách hàng
      if (refundAmount > 0 && customerId) {
        await (prisma.debt as any).create({
          data: {
            type: 'RECEIVABLE',
            customerId: customerId,
            partnerName: customerName || 'Khách hàng',
            amount: 0,
            paidAmount: Math.abs(refundAmount),
            dueDate: new Date(),
            status: 'PAID',
            description: `Trả lại hàng theo ${code}`,
            referenceId: code,
          }
        });

        // Ghi log hoạt động cho hồ sơ lỗi
        await (prisma as any).defectActivity.create({
          data: {
            defectId: defect.id,
            action: 'ĐIỀU CHỈNH CÔNG NỢ',
            description: `Đã tự động cấn trừ công nợ: -${refundAmount.toLocaleString('vi-VN')} đ (Trả lại hàng theo ${code})`,
            oldStatus: 'NEW',
            newStatus: defect.status,
            performedBy: defect.reporterName || 'Hệ thống'
          }
        });
      }

      // 2. Gửi thông báo tự động cho: Giám đốc, Trưởng phòng tài chính, Kế toán, và Người xử lý kỹ thuật
      try {
        const assignedEmployeeName = formData.get('assignedTo') as string;

        const [directors, financeAndAccountants, assignedEmp] = await Promise.all([
          // Giám đốc: Users role DIRECTOR, ADMIN, SUPERADMIN hoặc Employee position chứa Giám đốc
          prisma.user.findMany({
            where: {
              OR: [
                { role: { in: ['DIRECTOR', 'ADMIN', 'SUPERADMIN'] } },
                { employee: { position: { contains: 'Giám đốc' } } }
              ]
            },
            select: { id: true }
          }),
          // Trưởng phòng tài chính & Kế toán viên: Employees thuộc phòng Tài chính / Kế toán có userId
          prisma.employee.findMany({
            where: {
              OR: [
                { departmentCode: 'finance' },
                { departmentCode: 'accounting' },
                { departmentName: { contains: 'Tài chính' } },
                { departmentName: { contains: 'Kế toán' } }
              ],
              userId: { not: null }
            },
            select: { userId: true }
          }),
          // Người xử lý kỹ thuật được chỉ định
          assignedEmployeeName ? prisma.employee.findFirst({
            where: { fullName: assignedEmployeeName, userId: { not: null } },
            select: { userId: true }
          }) : Promise.resolve(null)
        ]);

        const recipientIds = Array.from(new Set([
          ...directors.map(u => u.id),
          ...financeAndAccountants.map(e => e.userId).filter(Boolean),
          ...(assignedEmp?.userId ? [assignedEmp.userId] : [])
        ])) as string[];

        if (recipientIds.length > 0) {
          const adminUser = await prisma.user.findFirst({ select: { id: true } });
          const creatorId = adminUser?.id || recipientIds[0];

          const notifTitle = `📦 Tiếp nhận hàng trả về & Điều chỉnh công nợ: ${code}`;
          const notifContent = `Khách hàng: **${customerName || "Chưa xác định"}**\n` +
            `Đơn hàng gốc: **${formData.get('orderNumber') || "Không gắn đơn"}**\n` +
            `Sản phẩm trả lại: **${formData.get('productCode')} - ${formData.get('productName')}** (Số lượng: **${formData.get('quantity') || 1}**)\n` +
            (refundAmount > 0 ? `Giá trị giảm trừ công nợ: **${refundAmount.toLocaleString('vi-VN')} đ**\n` : '') +
            `Lý do / Hiện trạng: _"${formData.get('description') || 'Không có mô tả'}"_\n` +
            `Người xử lý kỹ thuật: **${formData.get('assignedTo') || 'Chưa phân công'}** | Người tiếp nhận: **${formData.get('reporterName') || 'Kinh doanh'}**`;

          const notification = await prisma.notification.create({
            data: {
              title: notifTitle,
              content: notifContent,
              type: 'info',
              priority: 'high',
              audienceType: 'group',
              audienceValue: JSON.stringify(recipientIds),
              createdById: creatorId
            }
          });

          await Promise.allSettled(
            recipientIds.map(uid =>
              prisma.notificationRecipient.create({
                data: {
                  notificationId: notification.id,
                  userId: uid
                }
              })
            )
          );
        }
      } catch (notifErr) {
        console.error('Lỗi khi gửi thông báo tiếp nhận hàng trả về:', notifErr);
      }
    }

    return NextResponse.json(defect, { status: 201 });
  } catch (error: any) {
    console.error('Error creating defect:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const ids: string[] = body.ids || (body.id ? [body.id] : []);

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Danh sách ID không hợp lệ' }, { status: 400 });
    }

    const defects = await (prisma as any).defectRecord.findMany({
      where: { id: { in: ids } }
    });

    for (const defect of defects) {
      if (defect.mediaUrls) {
        try {
          const urls: string[] = JSON.parse(defect.mediaUrls);
          urls.forEach((url: string) => {
            if (url.startsWith('/uploads/defects/')) {
              const filePath = path.join(process.cwd(), 'public', url);
              if (fs.existsSync(filePath)) {
                try {
                  fs.unlinkSync(filePath);
                } catch (err) {}
              }
            }
          });
        } catch (e) {}
      }
    }

    await (prisma as any).defectActivity.deleteMany({
      where: { defectId: { in: ids } }
    });

    await (prisma as any).defectRecord.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error: any) {
    console.error('Error deleting defects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

