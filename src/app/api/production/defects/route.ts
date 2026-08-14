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
    const soCodes = orderNumbers.filter(c => c.startsWith("SO-"));

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
      soCodes.length > 0 ? (prisma as any).saleOrder.findMany({
        where: { code: { in: soCodes } },
        include: { saleOrderItems: { include: { inventoryItem: true, dinhMuc: true } } }
      }) : Promise.resolve([])
    ]);

    const bomMap: Record<string, string> = {};
    items.forEach(item => {
      const bom = item.dinhMucs?.[0]?.code || "Không có định mức";
      if (item.code) bomMap[item.code] = bom;
      if (item.model) bomMap[item.model] = bom;
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

    defects.forEach((d: any) => {
      if (d.orderNumber && d.orderNumber.startsWith("SO-")) {
         const so = saleOrders.find((s: any) => s.code === d.orderNumber);
         if (so) {
            const item = so.saleOrderItems.find((i: any) => i.inventoryItem?.code === d.productCode || i.inventoryItem?.model === d.productCode);
            if (item && item.dinhMuc) specificBomMap[`${d.orderNumber}_${d.productCode}`] = item.dinhMuc.code;
         }
      }
    });
    
    const formatted = defects.map((d: any) => {
      let bom = "Không có định mức";
      if (d.orderNumber && d.orderNumber.startsWith("QC-") && specificBomMap[d.orderNumber]) {
         bom = specificBomMap[d.orderNumber];
      } else if (d.orderNumber && d.orderNumber.startsWith("SO-") && specificBomMap[`${d.orderNumber}_${d.productCode}`]) {
         bom = specificBomMap[`${d.orderNumber}_${d.productCode}`];
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

    const defect = await (prisma as any).defectRecord.create({
      data: {
        code,
        source: formData.get('source') as string || 'INTERNAL',
        status: formData.get('status') as string || 'NEW',
        productName: formData.get('productName') as string || 'Sản phẩm',
        productCode: formData.get('productCode') as string || 'SP-001',
        quantity: parseInt(formData.get('quantity') as string) || 1,
        description: formData.get('description') as string || '',
        mediaUrls: JSON.stringify(mediaUrls),
        reporterName: formData.get('reporterName') as string || 'Unknown',
        reporterDepartment: formData.get('reporterDepartment') as string || 'Unknown',
        customerName: formData.get('customerName') as string || null,
        customerId: formData.get('customerId') as string || null,
        customerAddress: formData.get('customerAddress') as string || null,
        orderNumber: formData.get('orderNumber') as string || null,
        assignedTo: formData.get('assignedTo') as string || null,
        completionDate: formData.get('completionDate') ? new Date(formData.get('completionDate') as string) : null,
      }
    });

    return NextResponse.json(defect, { status: 201 });
  } catch (error: any) {
    console.error('Error creating defect:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
