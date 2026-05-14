import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * POST /api/plan-finance/stock-movements
 *
 * Tạo một biến động kho và cập nhật InventoryStock + trangThai InventoryItem.
 *
 * Body:
 *   type:              "nhap" | "xuat" | "chuyen" | "dieu-chinh"
 *   inventoryItemId:   string
 *   toWarehouseId?:    string   (nhap / chuyen)
 *   fromWarehouseId?:  string   (xuat / chuyen)
 *   soLuong:           number   (luôn dương)
 *   donGia?:           number
 *   lyDo?:             string
 *   soChungTu?:        string
 *   nguoiThucHien?:    string
 *   -- cho dieu-chinh --
 *   warehouseId:       string   (kho cần điều chỉnh)
 *   soLuongMoi:        number   (số lượng sau điều chỉnh)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      type, inventoryItemId,
      fromWarehouseId, toWarehouseId,
      soLuong, soLuongMoi, warehouseId: adjWarehouseId,
      donGia, lyDo, soChungTu, nguoiThucHien,
    } = body;

    if (!inventoryItemId) return NextResponse.json({ error: "inventoryItemId bắt buộc" }, { status: 400 });
    if (!type)            return NextResponse.json({ error: "type bắt buộc"            }, { status: 400 });

    // Hàm upsert InventoryStock
    const upsertStock = async (warehouseId: string, delta: number) => {
      const existing = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
      });

      const soLuongTruoc = existing?.soLuong ?? 0;
      const soLuongSau   = Math.max(0, soLuongTruoc + delta);

      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
        create: { inventoryItemId, warehouseId, soLuong: soLuongSau },
        update: { soLuong: soLuongSau },
      });

      return { soLuongTruoc, soLuongSau };
    };

    let movement;

    // ── Transaction cho từng loại ────────────────────────────────────────────
    if (type === "nhap") {
      if (!toWarehouseId) return NextResponse.json({ error: "toWarehouseId bắt buộc cho nhập" }, { status: 400 });
      if (!soLuong || soLuong <= 0) return NextResponse.json({ error: "Số lượng nhập phải > 0" }, { status: 400 });

      const { soLuongTruoc, soLuongSau } = await upsertStock(toWarehouseId, soLuong);

      movement = await prisma.stockMovement.create({
        data: {
          inventoryItemId, type,
          toWarehouseId,
          soLuong, soLuongTruoc, soLuongSau,
          donGia:          donGia          || undefined,
          lyDo:            lyDo            || undefined,
          soChungTu:       soChungTu       || undefined,
          nguoiThucHien:   nguoiThucHien   || undefined,
        },
      });

    } else if (type === "xuat") {
      if (!fromWarehouseId) return NextResponse.json({ error: "fromWarehouseId bắt buộc cho xuất" }, { status: 400 });
      if (!soLuong || soLuong <= 0) return NextResponse.json({ error: "Số lượng xuất phải > 0" }, { status: 400 });

      const existing = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: fromWarehouseId } },
      });
      if (!existing || existing.soLuong < soLuong) {
        return NextResponse.json({ error: "Tồn kho không đủ để xuất" }, { status: 400 });
      }

      const { soLuongTruoc, soLuongSau } = await upsertStock(fromWarehouseId, -soLuong);

      movement = await prisma.stockMovement.create({
        data: {
          inventoryItemId, type,
          fromWarehouseId,
          soLuong, soLuongTruoc, soLuongSau,
          donGia, lyDo, soChungTu, nguoiThucHien,
        },
      });

    } else if (type === "chuyen") {
      if (!fromWarehouseId || !toWarehouseId) {
        return NextResponse.json({ error: "Cần cả fromWarehouseId và toWarehouseId cho chuyển kho" }, { status: 400 });
      }
      if (!soLuong || soLuong <= 0) return NextResponse.json({ error: "Số lượng phải > 0" }, { status: 400 });

      const fromStock = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: fromWarehouseId } },
      });
      if (!fromStock || fromStock.soLuong < soLuong) {
        return NextResponse.json({ error: "Tồn kho tại kho nguồn không đủ" }, { status: 400 });
      }

      // Dùng transaction để đảm bảo atomic
      await prisma.$transaction([
        prisma.inventoryStock.update({
          where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: fromWarehouseId } },
          data:   { soLuong: { decrement: soLuong } },
        }),
        prisma.inventoryStock.upsert({
          where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: toWarehouseId } },
          create: { inventoryItemId, warehouseId: toWarehouseId, soLuong },
          update: { soLuong: { increment: soLuong } },
        }),
      ]);

      movement = await prisma.stockMovement.create({
        data: {
          inventoryItemId, type,
          fromWarehouseId, toWarehouseId,
          soLuong,
          soLuongTruoc: fromStock.soLuong,
          soLuongSau:   fromStock.soLuong - soLuong,
          lyDo, soChungTu, nguoiThucHien,
        },
      });

    } else if (type === "dieu-chinh") {
      if (!adjWarehouseId) return NextResponse.json({ error: "warehouseId bắt buộc cho điều chỉnh" }, { status: 400 });
      if (soLuongMoi === undefined || soLuongMoi < 0) return NextResponse.json({ error: "soLuongMoi >= 0" }, { status: 400 });

      const existing = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: adjWarehouseId } },
      });
      const soLuongTruoc = existing?.soLuong ?? 0;
      const delta = soLuongMoi - soLuongTruoc;

      await prisma.inventoryStock.upsert({
        where:  { inventoryItemId_warehouseId: { inventoryItemId, warehouseId: adjWarehouseId } },
        create: { inventoryItemId, warehouseId: adjWarehouseId, soLuong: soLuongMoi },
        update: { soLuong: soLuongMoi },
      });

      movement = await prisma.stockMovement.create({
        data: {
          inventoryItemId, type,
          fromWarehouseId: adjWarehouseId,
          soLuong: Math.abs(delta),
          soLuongTruoc, soLuongSau: soLuongMoi,
          lyDo, soChungTu, nguoiThucHien,
        },
      });

    } else {
      return NextResponse.json({ error: `Loại biến động không hợp lệ: ${type}` }, { status: 400 });
    }

    // ── Cập nhật trangThai + soLuong tổng trên InventoryItem ────────────────
    const allStocks = await prisma.inventoryStock.findMany({
      where: { inventoryItemId },
      include: { inventoryItem: { select: { soLuongMin: true } } },
    });
    const tongSoLuong = allStocks.reduce((s, st) => s + st.soLuong, 0);
    const soLuongMin  = allStocks[0]?.inventoryItem.soLuongMin ?? 0;
    const trangThai   = tongSoLuong === 0 ? "het-hang"
                      : soLuongMin > 0 && tongSoLuong <= soLuongMin ? "sap-het"
                      : "con-hang";

    await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data:  { soLuong: tongSoLuong, trangThai },
    });

    return NextResponse.json({ ok: true, movement });
  } catch (e) {
    console.error("[POST /stock-movements]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/plan-finance/stock-movements?itemId=&warehouseId=&limit=
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const itemId      = searchParams.get("itemId")      ?? "";
    const warehouseId = searchParams.get("warehouseId") ?? "";
    const limit       = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

    const where = {
      ...(itemId      && { inventoryItemId: itemId }),
      ...(warehouseId && {
        OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
      }),
    };

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        inventoryItem:  { select: { id: true, code: true, tenHang: true, donVi: true } },
        fromWarehouse:  { select: { id: true, code: true, name: true } },
        toWarehouse:    { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(movements);
  } catch (e) {
    console.error("[GET /stock-movements]", e);
    return NextResponse.json([], { status: 500 });
  }
}
