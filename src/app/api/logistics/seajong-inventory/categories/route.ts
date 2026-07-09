import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const categories = await prisma.seajongCategory.findMany();
  return NextResponse.json(categories.map(c => ({ id: c.id.toString(), name: c.name, isHeader: false, level: 0 })));
}
