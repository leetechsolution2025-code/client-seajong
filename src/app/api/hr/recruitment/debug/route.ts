import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET() {
  const prisma = new PrismaClient();
  try {
    const data = await prisma.recruitmentRequest.findMany({
      include: { candidates: true }
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ 
      error: "Prisma Error", 
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
