import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(warehouses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, name, address, phone, managerId, isVirtual } = body;

    const newWarehouse = await prisma.warehouse.create({
      data: {
        code,
        name,
        address,
        phone,
        managerId,
        isVirtual: !!isVirtual,
      },
    });

    return NextResponse.json(newWarehouse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
