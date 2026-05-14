import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Sync: 2026-05-02T17:57:00

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = rawId.trim();
    const body = await req.json();
    
    console.log(`[PATCH /api/hr/promotions/${id}] Body:`, body);

    // Chuyển đổi các trường đặc biệt
    const data: any = { ...body };
    if (data.competencyScore !== undefined) data.competencyScore = Number(data.competencyScore);
    if (data.suitabilityScore !== undefined) data.suitabilityScore = Number(data.suitabilityScore);
    if (data.effectiveDate) data.effectiveDate = new Date(data.effectiveDate);
    if (data.interviewDate) data.interviewDate = new Date(data.interviewDate);

    const updated = await (prisma as any).promotionRequest.update({
      where: { id },
      data
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating promotion:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = rawId.trim();

    // Thực hiện xóa cascade trong một transaction
    await prisma.$transaction(async (tx) => {
      // 1. Tìm thông tin request để biết entityType
      const promotion = await (tx as any).promotionRequest.findUnique({
        where: { id }
      });

      if (promotion) {
        // 2. Xóa các hồ sơ phê duyệt liên quan trong Trung tâm phê duyệt
        // Chúng ta xóa dựa trên entityId và entityType
        await (tx as any).approvalRequest.deleteMany({
          where: {
            entityId: id,
            entityType: { in: ["PROMOTION", "TRANSFER", "DEMOTION"] }
          }
        });

        // 3. Xóa chính hồ sơ promotion
        await (tx as any).promotionRequest.delete({
          where: { id }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting promotion (cascade):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
