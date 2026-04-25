import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

// GET /api/plan-finance/inventory/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        stocks: {
          include: {
            warehouse: { select: { id: true, code: true, name: true, isActive: true } },
          },
        },
        dinhMuc: {
          include: { vatTu: { orderBy: { id: "asc" } } },
        },
      },
    });

    if (!item) return NextResponse.json({ error: "Không tìm thấy hàng hoá" }, { status: 404 });
    return NextResponse.json(item);
  } catch (e) {
    console.error("[GET /inventory/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// PUT /api/plan-finance/inventory/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const {
      code, tenHang, categoryId,
      donVi, soLuong, soLuongMin,
      giaNhap, giaBan,
      nhaCungCap, thongSoKyThuat, ghiChu,
    } = body;

    if (!tenHang?.trim())
      return NextResponse.json({ error: "Tên hàng không được để trống" }, { status: 400 });

    const soLuongVal    = parseFloat(soLuong    ?? 0);
    const soLuongMinVal = parseFloat(soLuongMin ?? 0);

    // Tự tính trangThai từ tồn kho
    const trangThaiCalc =
      soLuongVal === 0                              ? "het-hang" :
      soLuongMinVal > 0 && soLuongVal <= soLuongMinVal ? "sap-het"  : "con-hang";

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        code:           code            || null,
        tenHang:        tenHang.trim(),
        ...(categoryId
          ? { category: { connect: { id: categoryId } } }
          : { categoryId: null }),
        donVi:          donVi           || null,
        soLuong:        soLuongVal,
        soLuongMin:     soLuongMinVal,
        giaNhap:        parseFloat(giaNhap  ?? 0),
        giaBan:         parseFloat(giaBan   ?? 0),
        nhaCungCap:     nhaCungCap      || null,
        thongSoKyThuat: thongSoKyThuat  || null,
        ghiChu:         ghiChu          || null,
        trangThai:      trangThaiCalc,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json(item);
  } catch (e) {
    console.error("[PUT /inventory/[id]]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/plan-finance/inventory/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Xoá StockMovement trước (inventoryItemId là required, không thể null)
    await prisma.stockMovement.deleteMany({ where: { inventoryItemId: id } });

    // Xoá item — InventoryStock tự xoá theo cascade (onDelete: Cascade)
    await prisma.inventoryItem.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /inventory/[id]]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

