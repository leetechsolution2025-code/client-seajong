import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const defects = await (prisma as any).defectRecord.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const formatted = defects.map((d: any) => ({
      ...d,
      mediaUrls: d.mediaUrls ? JSON.parse(d.mediaUrls) : []
    }));
    
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
      const count = await (prisma as any).defectRecord.count();
      code = `${isWarranty ? 'WR' : 'ERR'}-${timestamp}-${(count + 1).toString().padStart(2, '0')}`;
    }

    const defect = await (prisma as any).defectRecord.create({
      data: {
        code,
        source: formData.get('source') as string || 'INTERNAL',
        productName: formData.get('productName') as string || 'Sản phẩm',
        productCode: formData.get('productCode') as string || 'SP-001',
        quantity: parseInt(formData.get('quantity') as string) || 1,
        description: formData.get('description') as string || '',
        mediaUrls: JSON.stringify(mediaUrls),
        reporterName: formData.get('reporterName') as string || 'Unknown',
        reporterDepartment: formData.get('reporterDepartment') as string || 'Unknown',
        customerName: formData.get('customerName') as string || null,
        customerPhone: formData.get('customerPhone') as string || null,
        customerAddress: formData.get('customerAddress') as string || null,
        purchaseDate: formData.get('purchaseDate') ? new Date(formData.get('purchaseDate') as string) : null,
      }
    });

    return NextResponse.json(defect, { status: 201 });
  } catch (error: any) {
    console.error('Error creating defect:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
