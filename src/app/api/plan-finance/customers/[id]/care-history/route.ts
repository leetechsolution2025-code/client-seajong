import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/customers/[id]/care-history
// Trả về danh sách lịch sử chăm sóc của khách hàng, mới nhất trước
// Hỗ trợ ?limit=N để lấy N bản ghi đầu tiên
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const list = await prisma.customerCareHistory.findMany({
      where: { customerId: id },
      orderBy: { ngayChamSoc: "desc" },
      ...(limit ? { take: limit } : {}),
      include: {
        nguoiChamSoc: { select: { id: true, fullName: true } },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/plan-finance/customers/[id]/care-history
// Tạo bản ghi lịch sử chăm sóc mới
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      ngayChamSoc,
      nguoiChamSocId,
      hinhThuc,
      thaiDo,
      nhuCau,
      nganSach,
      thoiGianDauTu,
      thanhToan,
      nguoiDaiDien,
      soDienThoai,
      tomTat,
    } = body;

    if (!ngayChamSoc || !hinhThuc || !tomTat) {
      return NextResponse.json(
        { error: "Thiếu trường bắt buộc: ngayChamSoc, hinhThuc, tomTat" },
        { status: 400 }
      );
    }

    const record = await prisma.customerCareHistory.create({
      data: {
        customerId:     id,
        ngayChamSoc:    new Date(ngayChamSoc),
        nguoiChamSocId: nguoiChamSocId || null,
        hinhThuc,
        thaiDo:         thaiDo        || null,
        nhuCau:         nhuCau        || null,
        nganSach:       nganSach      || null,
        thoiGianDauTu:  thoiGianDauTu || null,
        thanhToan:      thanhToan     || null,
        nguoiDaiDien:   nguoiDaiDien  || null,
        soDienThoai:    soDienThoai   || null,
        tomTat,
      },
      include: {
        nguoiChamSoc: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
