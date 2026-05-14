import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const q = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer:      { select: { id: true, name: true, dienThoai: true, email: true, address: true } },
        nguoiPhuTrach: { select: { id: true, fullName: true, userId: true } },
        items:         { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(q);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { nguoiPhuTrach: { select: { userId: true } } },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Không tìm thấy báo giá" }, { status: 404 });
    }

    if (quotation.nguoiPhuTrach?.userId !== session.user.id) {
      return NextResponse.json({ error: "Bạn không có quyền xoá báo giá này" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
      prisma.quotation.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DELETE /quotations/:id]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const {
      code, ngayBaoGia, ngayHetHan, trangThai, uuTien,
      tongTien, discount, vat, thanhTien, ghiChu, items,
    } = body;

    // Truly partial update — chỉ include field khi field đó có trong body
    const updateData: Record<string, any> = {};
    if (code       !== undefined) updateData.code       = code;
    if (trangThai  !== undefined) updateData.trangThai  = trangThai;
    if (uuTien     !== undefined) updateData.uuTien     = uuTien;
    if (tongTien   !== undefined) updateData.tongTien   = parseFloat(String(tongTien));
    if (discount   !== undefined) updateData.discount   = parseFloat(String(discount));
    if (vat        !== undefined) updateData.vat        = parseFloat(String(vat));
    if (thanhTien  !== undefined) updateData.thanhTien  = parseFloat(String(thanhTien));
    if (ghiChu     !== undefined) updateData.ghiChu     = ghiChu;
    if (ngayBaoGia !== undefined) updateData.ngayBaoGia = new Date(ngayBaoGia);
    if (ngayHetHan !== undefined) updateData.ngayHetHan = new Date(ngayHetHan);

    const updated = await prisma.$transaction(async (tx) => {
      // Chỉ xoá + tạo lại items khi body có mảng items
      if (Array.isArray(items)) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        if (items.length > 0) {
          await tx.quotationItem.createMany({
            data: items.map((it: any, idx: number) => ({
              quotationId: id,
              tenHang:   it.tenHang   ?? "",
              donVi:     it.donVi     ?? "cái",
              soLuong:   parseFloat(String(it.soLuong   ?? 1)),
              donGia:    parseFloat(String(it.donGia    ?? 0)),
              thanhTien: parseFloat(String(it.thanhTien ?? 0)),
              ghiChu:    it.ghiChu    ?? null,
              sortOrder: it.sortOrder ?? idx,
            })),
          });
        }
      }

      return tx.quotation.update({ where: { id }, data: updateData });
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PATCH /quotations/:id]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
