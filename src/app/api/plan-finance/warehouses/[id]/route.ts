import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

// GET /api/plan-finance/warehouses/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        stocks: {
          include: {
            inventoryItem: {
              select: {
                id: true, code: true, tenHang: true, donVi: true,
                giaNhap: true, giaBan: true, trangThai: true,
                category: { select: { name: true } },
              },
            },
          },
          orderBy: { inventoryItem: { tenHang: "asc" } },
        },
      },
    });

    if (!warehouse) return NextResponse.json({ error: "Không tìm thấy kho" }, { status: 404 });
    return NextResponse.json(warehouse);
  } catch (e) {
    console.error("[GET /warehouses/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// PUT /api/plan-finance/warehouses/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, code, address, phone, managerId, isActive } = body;

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(name      !== undefined && { name:      name.trim()           }),
        ...(code      !== undefined && { code:      code?.trim()  || null }),
        ...(address   !== undefined && { address:   address?.trim() || null }),
        ...(phone     !== undefined && { phone:     phone?.trim()  || null }),
        ...(managerId !== undefined && { managerId: managerId     || null }),
        ...(isActive  !== undefined && { isActive }),
      },
    });

    return NextResponse.json(warehouse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/plan-finance/warehouses/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Kiểm tra tồn kho > 0
    const stocksWithItems = await prisma.inventoryStock.findMany({
      where:  { warehouseId: id, soLuong: { gt: 0 } },
      select: { soLuong: true },
    });

    if (stocksWithItems.length > 0) {
      const tongSoLuong = stocksWithItems.reduce((s, st) => s + st.soLuong, 0);
      return NextResponse.json(
        {
          error: `Kho vẫn còn ${stocksWithItems.length} loại hàng với ${tongSoLuong.toLocaleString("vi-VN")} đơn vị tồn kho. Xuất hết hàng trước khi xoá kho.`,
        },
        { status: 400 },
      );
    }

    // Set NULL các StockMovement references trước khi xoá
    await prisma.$executeRaw`UPDATE "StockMovement" SET "fromWarehouseId" = NULL WHERE "fromWarehouseId" = ${id}`;
    await prisma.$executeRaw`UPDATE "StockMovement" SET "toWarehouseId"   = NULL WHERE "toWarehouseId"   = ${id}`;

    // Xoá InventoryStock (kể cả soLuong = 0)
    await prisma.inventoryStock.deleteMany({ where: { warehouseId: id } });

    // Xoá kho
    await prisma.warehouse.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /warehouses/[id]]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
