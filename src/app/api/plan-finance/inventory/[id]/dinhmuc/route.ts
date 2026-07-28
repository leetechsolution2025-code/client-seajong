import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/plan-finance/inventory/[id]/dinhmuc
// Body: { code?: string; tenDinhMuc?: string; vatTu: { tenVatTu: string; soLuong: number; donViTinh?: string; ghiChu?: string }[] }
// Replaces entire BOM for this item

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { code, tenDinhMuc, vatTu } = await req.json() as {
    code?: string;
    tenDinhMuc?: string;
    vatTu: { tenVatTu: string; soLuong: number; donViTinh?: string; ghiChu?: string }[];
  };

  const item = await prisma.inventoryItem.findUnique({ where: { id }, select: { dinhMucs: { take: 1, select: { id: true } } } });
  if (!item) return NextResponse.json({ error: "Không tìm thấy hàng hoá" }, { status: 404 });

  try {
    let dinhMucId = item.dinhMucs?.[0]?.id;

    if (dinhMucId) {
      // Đã có định mức → cập nhật header + xoá vatTu cũ, thêm mới
      await prisma.dinhMuc.update({
        where: { id: dinhMucId },
        data: {
          code:       code       || null,
          tenDinhMuc: tenDinhMuc || null,
          vatTu: {
            deleteMany: {},
            create: vatTu.map(v => ({
              tenVatTu:  v.tenVatTu,
              soLuong:   v.soLuong,
              donViTinh: v.donViTinh || null,
              ghiChu:    v.ghiChu    || null,
            })),
          },
        },
      });
    } else {
      // Chưa có → tạo mới + gắn vào item
      const dm = await prisma.dinhMuc.create({
        data: {
          code:       code       || null,
          tenDinhMuc: tenDinhMuc || null,
          vatTu: {
            create: vatTu.map(v => ({
              tenVatTu:  v.tenVatTu,
              soLuong:   v.soLuong,
              donViTinh: v.donViTinh || null,
              ghiChu:    v.ghiChu    || null,
            })),
          },
        },
      });
      dinhMucId = dm.id;
      
    }

    // Trả về dinhMuc đầy đủ
    const updated = await prisma.dinhMuc.findUnique({
      where: { id: dinhMucId! },
      include: { vatTu: { orderBy: { id: "asc" } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PUT /inventory/[id]/dinhmuc]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/plan-finance/inventory/[id]/dinhmuc — xoá toàn bộ định mức
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({ where: { id }, select: { dinhMucs: { take: 1, select: { id: true } } } });
  if (!item?.dinhMucs || item.dinhMucs.length === 0) return NextResponse.json({ ok: true });

  await prisma.dinhMuc.delete({ where: { id: item.dinhMucs[0].id } });

  return NextResponse.json({ ok: true });
}
