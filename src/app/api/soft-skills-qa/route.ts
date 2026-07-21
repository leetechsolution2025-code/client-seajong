import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const data = await prisma.softSkillQA.findMany({
      orderBy: {
        order: 'asc'
      }
    });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching soft skills QA:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, answer } = body;

    // Determine the next order number (fill missing gaps)
    const existingQs = await prisma.softSkillQA.findMany({
      orderBy: { order: 'asc' },
      select: { order: true }
    });

    let nextOrder = 1;
    for (const q of existingQs) {
      if (q.order <= 0) continue;
      if (q.order === nextOrder) {
        nextOrder++;
      } else if (q.order > nextOrder) {
        break; // found a gap!
      }
    }

    const newQA = await prisma.softSkillQA.create({
      data: {
        question,
        answer,
        order: nextOrder
      }
    });

    return NextResponse.json(newQA, { status: 201 });
  } catch (error: any) {
    console.error('Error creating soft skill QA:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create data' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { ids } = body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    await prisma.softSkillQA.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting soft skill QA:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete data' }, { status: 500 });
  }
}
