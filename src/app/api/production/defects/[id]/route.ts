import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

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

    return NextResponse.json({
      ...defect,
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
