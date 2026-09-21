import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { carrierDb } from "@/lib/carrierDb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const carrier = await carrierDb.findUnique(id);

    if (!carrier) {
      return NextResponse.json({ error: "Không tìm thấy đơn vị vận chuyển" }, { status: 404 });
    }

    return NextResponse.json({ carrier });
  } catch (e: any) {
    console.error("[GET /api/plan-finance/carriers/[id]]", e);
    return NextResponse.json({ error: e.message || "Lỗi server" }, { status: 500 });
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

    const data: any = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.code !== undefined) data.code = body.code?.trim() || null;
    if (body.serviceType !== undefined) data.serviceType = body.serviceType;
    if (body.contactName !== undefined) data.contactName = body.contactName?.trim() || null;
    if (body.contactRole !== undefined) data.contactRole = body.contactRole?.trim() || null;
    if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
    if (body.email !== undefined) data.email = body.email?.trim() || null;
    if (body.website !== undefined) data.website = body.website?.trim() || null;
    if (body.transactionAddress !== undefined) data.transactionAddress = body.transactionAddress?.trim() || null;
    if (body.address !== undefined) data.address = body.address?.trim() || null;
    if (body.routes !== undefined) data.routes = body.routes?.trim() || null;
    if (body.hanMucNo !== undefined) data.hanMucNo = typeof body.hanMucNo === "number" ? body.hanMucNo : parseFloat(body.hanMucNo) || 0;
    if (body.danhGia !== undefined) data.danhGia = typeof body.danhGia === "number" ? body.danhGia : parseInt(body.danhGia, 10) || 5;
    if (body.trangThai !== undefined) data.trangThai = body.trangThai;
    if (body.ghiChu !== undefined) data.ghiChu = body.ghiChu?.trim() || null;

    const carrier = await carrierDb.update(id, data);
    return NextResponse.json(carrier);
  } catch (e: any) {
    console.error("[PATCH /api/plan-finance/carriers/[id]]", e);
    return NextResponse.json({ error: e.message || "Lỗi cập nhật đơn vị vận chuyển" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    await carrierDb.delete(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[DELETE /api/plan-finance/carriers/[id]]", e);
    return NextResponse.json({ error: e.message || "Lỗi xóa đơn vị vận chuyển" }, { status: 500 });
  }
}
