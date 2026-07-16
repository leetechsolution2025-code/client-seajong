import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nextStatus, note, performedBy, action } = body;

    const defect = await (prisma as any).defectRecord.findUnique({
      where: { id }
    });

    if (!defect) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const oldStatus = defect.status;

    // Use transaction to update status and create activity log
    await (prisma as any).$transaction(async (tx: any) => {
      // 1. Update status if it changed
      if (nextStatus && nextStatus !== oldStatus) {
        await tx.defectRecord.update({
          where: { id },
          data: { status: nextStatus }
        });
      }

      // 2. Create activity log
      await tx.defectActivity.create({
        data: {
          defectId: id,
          action: action || 'CẬP NHẬT',
          description: note,
          oldStatus,
          newStatus: nextStatus || oldStatus,
          performedBy: performedBy || 'Hệ thống'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Process defect error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
