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
