import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, props: { params: Promise<any> }) {
  const params = await props.params;
  try {
    // Next.js 15+ handles params as a Promise. For safety, we check and await if needed.
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams?.id;
    
    console.log("GET Warehouse ID:", id);
    
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });
    
    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    return NextResponse.json(warehouse);
  } catch (error: any) {
    console.error("Prisma GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<any> }) {
  const params = await props.params;
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams?.id;
    const body = await req.json();
    
    console.log("PATCH Warehouse ID:", id);
    console.log("PATCH Body:", body);
    
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: body,
    });
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Prisma PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<any> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    // Kiểm tra tồn kho > 0 (Hàng hóa)
    const productStocks = await prisma.inventoryStock.findMany({
      where: { warehouseId: id, soLuong: { gt: 0 } },
      select: { soLuong: true },
    });

    // Kiểm tra tồn kho > 0 (Vật tư)
    const materialStocks = await prisma.materialStock.findMany({
      where: { warehouseId: id, soLuong: { gt: 0 } },
      select: { soLuong: true },
    });

    if (productStocks.length > 0 || materialStocks.length > 0) {
      const totalProducts = productStocks.reduce((sum, item) => sum + item.soLuong, 0);
      const totalMaterials = materialStocks.reduce((sum, item) => sum + item.soLuong, 0);
      const totalItems = productStocks.length + materialStocks.length;
      const totalQty = totalProducts + totalMaterials;
      return NextResponse.json(
        {
          error: `Kho vẫn còn ${totalItems} loại mặt hàng với ${totalQty.toLocaleString("vi-VN")} đơn vị tồn kho. Xuất hết hàng trước khi xoá kho.`,
        },
        { status: 400 }
      );
    }

    // Set NULL references trước khi xoá
    await prisma.$executeRaw`UPDATE "StockMovement" SET "fromWarehouseId" = NULL WHERE "fromWarehouseId" = ${id}`;
    await prisma.$executeRaw`UPDATE "StockMovement" SET "toWarehouseId"   = NULL WHERE "toWarehouseId"   = ${id}`;
    await prisma.$executeRaw`UPDATE "StockCount" SET "warehouseId" = NULL WHERE "warehouseId" = ${id}`;
    await prisma.$executeRaw`UPDATE "StockCountLine" SET "warehouseId" = NULL WHERE "warehouseId" = ${id}`;

    // Xoá InventoryStock & MaterialStock
    await prisma.inventoryStock.deleteMany({ where: { warehouseId: id } });
    await prisma.materialStock.deleteMany({ where: { warehouseId: id } });

    // Xoá kho
    await prisma.warehouse.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[DELETE /api/logistics/warehouses/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
