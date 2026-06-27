import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — lấy danh sách hoạt động của một đơn mua hàng
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const rows = await prisma.purchaseOrderActivity.findMany({
      where: { purchaseOrderId: id },
      orderBy: { ngay: "asc" },
    });
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — thêm mới một hoạt động
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { loai, ngay, nguoiThucHien, ketQua } = body;
    if (!nguoiThucHien || !ketQua) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    const row = await prisma.purchaseOrderActivity.create({
      data: {
        purchaseOrderId: id,
        loai: loai ?? "system",
        ngay: ngay ? new Date(ngay) : new Date(),
        nguoiThucHien,
        ketQua,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — xoá một hoạt động
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await params;
    const { searchParams } = new URL(req.url);
    const actId = searchParams.get("actId");
    if (!actId) return NextResponse.json({ error: "Thiếu actId" }, { status: 400 });
    await prisma.purchaseOrderActivity.delete({ where: { id: actId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH — sửa một hoạt động
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await params;
    const { searchParams } = new URL(req.url);
    const actId = searchParams.get("actId");
    if (!actId) return NextResponse.json({ error: "Thiếu actId" }, { status: 400 });

    const body = await req.json();
    const { loai, ngay, nguoiThucHien, ketQua } = body;

    const row = await prisma.purchaseOrderActivity.update({
      where: { id: actId },
      data: {
        loai: loai !== undefined ? loai : undefined,
        ngay: ngay ? new Date(ngay) : undefined,
        nguoiThucHien: nguoiThucHien !== undefined ? nguoiThucHien : undefined,
        ketQua: ketQua !== undefined ? ketQua : undefined,
      },
    });
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
