import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

// GET /api/plan-finance/warehouses
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { stocks: true } },
        stocks: {
          select: { soLuong: true },
        },
      },
    });

    const result = warehouses.map(w => ({
      id:         w.id,
      code:       w.code,
      name:       w.name,
      address:    w.address,
      phone:      w.phone,
      managerId:  w.managerId,
      isActive:   w.isActive,
      createdAt:  w.createdAt,
      updatedAt:  w.updatedAt,
      soMatHang:  w._count.stocks,
      tongSoLuong: w.stocks.reduce((s, st) => s + st.soLuong, 0),
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /warehouses]", e);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/plan-finance/warehouses
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, code, address, phone, managerId } = body;
    if (!name?.trim()) return NextResponse.json({ error: "Tên kho không được để trống" }, { status: 400 });

    const warehouse = await prisma.warehouse.create({
      data: {
        name:      name.trim(),
        code:      code?.trim() || undefined,
        address:   address?.trim() || undefined,
        phone:     phone?.trim() || undefined,
        managerId: managerId || undefined,
      },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
