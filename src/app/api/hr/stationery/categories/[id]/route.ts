import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // Check if category has items
    const itemCount = await (prisma as any).hrSupplyItem.count({
      where: { categoryId: id }
    });

    if (itemCount > 0) {
      return new NextResponse("Không thể xóa nhóm đang có vật tư", { status: 400 });
    }

    await (prisma as any).hrSupplyCategory.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[STATIONERY_CATEGORY_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
