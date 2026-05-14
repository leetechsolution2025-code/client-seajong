import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const warehouses = await prisma.warehouse.findMany({
      select: { id: true, name: true, code: true, type: true }
    });

    return NextResponse.json(warehouses);
  } catch (e) {
    console.error("[GET /api/finance/warehouses]", e);
    return NextResponse.json([], { status: 500 });
  }
}
