import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Tìm tất cả các user ID của nhân viên thuộc phòng tài chính - kế toán
    const financeEmployees = await prisma.employee.findMany({
      where: {
        OR: [
          { departmentCode: "finance" },
          { departmentName: { contains: "Kế toán" } },
          { departmentName: { contains: "Tài chính" } }
        ]
      },
      select: { userId: true }
    });
    const financeUserIds = financeEmployees.map(e => e.userId).filter(Boolean) as string[];

    const [pendingOrders, pendingRequests, debts] = await Promise.all([
      // 1. Đơn hàng cần duyệt
      prisma.saleOrder.count({
        where: {
          keToanDuyet: "pending",
        },
      }),

      // 2. Yêu cầu cần duyệt (Chỉ bao gồm các yêu cầu duyệt đơn mua hàng chờ phê duyệt)
      prisma.approvalRequest.count({
        where: {
          entityType: { in: ["purchase_order", "marketing_proposal", "marketing_monthly_plan"] },
          status: "pending",
        },
      }),

      // 3. Danh sách công nợ để tính phải thu & phải trả
      prisma.debt.findMany({
        select: {
          type: true,
          amount: true,
          paidAmount: true,
        },
      }),
    ]);

    let debtReceivable = 0;
    let debtPayable = 0;

    for (const d of debts) {
      const outstanding = (d.amount || 0) - (d.paidAmount || 0);
      const typeLower = (d.type || "").toLowerCase();
      if (typeLower === "receivable" || typeLower === "phai-thu") {
        debtReceivable += outstanding;
      } else if (typeLower === "payable" || typeLower === "phai-tra") {
        debtPayable += outstanding;
      }
    }

    return NextResponse.json({
      pendingOrders,
      pendingRequests,
      debtReceivable,
      debtPayable,
    });
  } catch (error: any) {
    console.error("[GET /api/finance/kpis] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
