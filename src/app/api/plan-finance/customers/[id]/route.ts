import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/plan-finance/customers/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DELETE /customers]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/plan-finance/customers/[id]
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const { name, address, nguon, nhom, daiDien, xungHo, chucVu, dienThoai, email, ghiChu, nguoiChamSocId } = body;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name }),
        ...(address     !== undefined && { address }),
        ...(nguon       !== undefined && { nguon }),
        ...(nhom        !== undefined && { nhom }),
        ...(daiDien     !== undefined && { daiDien }),
        ...(xungHo      !== undefined && { xungHo }),
        ...(chucVu      !== undefined && { chucVu }),
        ...(dienThoai   !== undefined && { dienThoai }),
        ...(email       !== undefined && { email }),
        ...(ghiChu      !== undefined && { ghiChu }),
        nguoiChamSocId: nguoiChamSocId || null,
      },
      include: { nguoiChamSoc: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PATCH /customers]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
