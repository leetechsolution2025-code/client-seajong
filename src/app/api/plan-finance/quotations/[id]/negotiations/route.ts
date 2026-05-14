import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — lấy danh sách thương thảo của một báo giá
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await prisma.quotationNegotiation.findMany({
      where: { quotationId: id },
      orderBy: { ngay: "asc" },
    });
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — thêm mới một bản ghi thương thảo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { loai, ngay, nguoiThucHien, ketQua } = body;
    if (!ngay || !nguoiThucHien || !ketQua) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    const row = await prisma.quotationNegotiation.create({
      data: {
        quotationId: id,
        loai: loai ?? "call",
        ngay: new Date(ngay),
        nguoiThucHien,
        ketQua,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — xoá một bản ghi
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // await để satisfy Next.js
    const { searchParams } = new URL(req.url);
    const negId = searchParams.get("negId");
    if (!negId) return NextResponse.json({ error: "Thiếu negId" }, { status: 400 });
    await prisma.quotationNegotiation.delete({ where: { id: negId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
