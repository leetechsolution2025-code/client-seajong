import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

// GET /api/plan-finance/inventory/[id]/stocks
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const stocks = await prisma.inventoryStock.findMany({
      where: { inventoryItemId: id },
      include: {
        warehouse: {
          select: { id: true, code: true, name: true, isActive: true },
        },
      },
      orderBy: { warehouse: { name: "asc" } },
    });

    return NextResponse.json(stocks);
  } catch (e) {
    console.error("[GET /inventory/[id]/stocks]", e);
    return NextResponse.json([], { status: 500 });
  }
}

// PATCH /api/plan-finance/inventory/[id]/stocks
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { warehouseId, viTriHang, viTriCot, viTriTang, soLuongMin, ghiChu } = body;
    if (!warehouseId) return NextResponse.json({ error: "warehouseId bắt buộc" }, { status: 400 });

    const stock = await prisma.inventoryStock.upsert({
      where: {
        inventoryItemId_warehouseId: { inventoryItemId: id, warehouseId },
      },
      create: {
        inventoryItemId: id,
        warehouseId,
        soLuong:    0,
        soLuongMin: soLuongMin ?? 0,
        viTriHang:  viTriHang  || undefined,
        viTriCot:   viTriCot   || undefined,
        viTriTang:  viTriTang  || undefined,
        ghiChu:     ghiChu     || undefined,
      },
      update: {
        ...(soLuongMin !== undefined && { soLuongMin }),
        ...(viTriHang  !== undefined && { viTriHang:  viTriHang  || null }),
        ...(viTriCot   !== undefined && { viTriCot:   viTriCot   || null }),
        ...(viTriTang  !== undefined && { viTriTang:  viTriTang  || null }),
        ...(ghiChu     !== undefined && { ghiChu:     ghiChu     || null }),
      },
    });

    return NextResponse.json(stock);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
