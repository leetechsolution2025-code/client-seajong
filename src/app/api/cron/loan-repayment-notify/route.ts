import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNextMonthLoanProjection } from "@/lib/loanProjection";

export async function GET(req: NextRequest) {
  try {
    // 1. Check if today is the last day of the month
    // by checking if tomorrow is the 1st
    const now = new Date();
    // Using UTC or local time? Since cron runs in UTC usually, let's just check standard Date
    // If the cron is scheduled at 23:55, it's safe to check:
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (tomorrow.getDate() !== 1) {
      return NextResponse.json({ 
        success: true, 
        message: "Not the last day of the month. Skipped." 
      });
    }

    // 2. Calculate projection
    const projectionData = await calculateNextMonthLoanProjection();

    if (projectionData.data.length === 0 || projectionData.totalPayment <= 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No loan repayments scheduled for next month." 
      });
    }

    // 3. Find directors / admins
    const directors = await prisma.user.findMany({
      where: {
        role: {
          in: ["director", "DIRECTOR", "admin", "ADMIN", "SUPERADMIN", "superadmin"]
        }
      },
      select: { id: true }
    });

    if (directors.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No directors found to notify." 
      });
    }

    const formatter = new Intl.NumberFormat('vi-VN');
    const totalPaymentFormatted = formatter.format(projectionData.totalPayment);
    const principalFormatted = formatter.format(projectionData.totalPrincipal);
    const interestFormatted = formatter.format(projectionData.totalInterest);

    const title = `Lịch trả nợ dự kiến Tháng ${projectionData.targetMonth}/${projectionData.targetYear}`;
    const message = `Tháng tới có ${projectionData.data.length} khoản vay cần thanh toán. Tổng cộng: ${totalPaymentFormatted} VNĐ (Gốc: ${principalFormatted} VNĐ, Lãi: ${interestFormatted} VNĐ). Nhấn để xem chi tiết.`;

    const adminUser = directors.length > 0 ? directors[0].id : "system";

    const notification = await prisma.notification.create({
      data: {
        title,
        content: message,
        type: "info",
        priority: "high",
        audienceType: "group",
        audienceValue: JSON.stringify(directors.map(d => d.id)),
        createdById: adminUser,
        attachments: JSON.stringify([
          { name: "Xem chi tiết lịch trả nợ", url: "/board/finance-accounting" }
        ])
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Sent 1 notification to ${directors.length} directors.`,
      targetMonth: projectionData.targetMonth,
      targetYear: projectionData.targetYear,
      totalPayment: projectionData.totalPayment
    });

  } catch (error: any) {
    console.error("[GET /api/cron/loan-repayment-notify] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
