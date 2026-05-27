import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH: Cập nhật thông tin đối thủ
 * DELETE: Xóa đối thủ khỏi danh sách theo dõi
 */

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Loại bỏ các trường không cho phép cập nhật thủ công nếu cần (vd: id, createdAt)
    const { id: _, createdAt: __, updatedAt: ___, webhookToken: ____, ...updateData } = body;

    const competitor = await prisma.competitor.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(competitor);
  } catch (error) {
    console.error("PATCH Competitor Error:", error);
    return NextResponse.json({ error: "Không thể cập nhật đối thủ" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.competitor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa đối thủ thành công" });
  } catch (error) {
    console.error("DELETE Competitor Error:", error);
    return NextResponse.json({ error: "Không thể xóa đối thủ" }, { status: 500 });
  }
}
