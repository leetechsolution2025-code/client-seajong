import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const userId = session.user.id as string;
    const userName = session.user.name || "HR Manager";

    // 1. Find the pending approval request for this salary adjustment
    const approvalRequest = await prisma.approvalRequest.findFirst({
      where: {
        entityType: "SALARY_ADJUSTMENT",
        entityId: id,
        status: "pending"
      }
    });

    if (!approvalRequest) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu phê duyệt đang chờ xử lý" }, { status: 404 });
    }

    // 2. Update ApprovalRequest status to "recalled"
    await prisma.approvalRequest.update({
      where: { id: approvalRequest.id },
      data: {
        status: "recalled",
        comments: {
          create: {
            authorId: userId,
            authorName: userName,
            authorRole: "requester",
            content: `↩️ **${userName}** đã **THU HỒI** tờ trình phê duyệt này.`,
            isSystem: true
          }
        }
      }
    });

    // 3. Sync back to SalaryAdjustmentRequest status to "SUBMITTED" (so it can be edited/re-submitted)
    await (prisma as any).salaryAdjustmentRequest.update({
      where: { id },
      data: { status: "SUBMITTED" }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/hr/salary-adjustment/[id]/recall]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
