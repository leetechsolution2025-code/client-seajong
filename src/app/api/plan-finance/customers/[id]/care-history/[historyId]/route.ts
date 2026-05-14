import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/plan-finance/customers/[id]/care-history/[historyId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; historyId: string }> }
) {
  try {
    const { id, historyId } = await params;

    // Verify bản ghi thuộc đúng khách hàng trước khi xoá
    const record = await prisma.customerCareHistory.findFirst({
      where: { id: historyId, customerId: id },
    });

    if (!record) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi" }, { status: 404 });
    }

    await prisma.customerCareHistory.delete({ where: { id: historyId } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
