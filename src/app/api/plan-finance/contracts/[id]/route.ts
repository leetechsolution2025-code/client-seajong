import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/contracts/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true, name: true, nhom: true,
            dienThoai: true, email: true, address: true,
            daiDien: true, xungHo: true, chucVu: true,
          },
        },
        nguoiPhuTrach: { select: { id: true, fullName: true, position: true } },
        quotation: {
          select: {
            id: true, code: true, ngayBaoGia: true, thanhTien: true,
            items: {
              select: { tenHang: true, donVi: true, soLuong: true, donGia: true, thanhTien: true, sortOrder: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!contract) return NextResponse.json({ error: "Không tìm thấy hợp đồng" }, { status: 404 });
    return NextResponse.json(contract);
  } catch (e: unknown) {
    console.error("[GET /contracts/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// PATCH /api/plan-finance/contracts/[id] — cập nhật trạng thái, ghi chú
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { trangThai, uuTien, daThanhToan, ghiChu } = body;

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        ...(trangThai    !== undefined && { trangThai }),
        ...(uuTien       !== undefined && { uuTien }),
        ...(daThanhToan  !== undefined && { daThanhToan: parseFloat(daThanhToan) }),
        ...(ghiChu       !== undefined && { ghiChu }),
      },
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
