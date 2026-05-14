import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cats = await prisma.seajongCategory.findMany({
    orderBy: { count: "desc" },
  });
  return NextResponse.json({ categories: cats, total: cats.length });
}
