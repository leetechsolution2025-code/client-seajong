import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { soChungTu, reference, items } = body as {
      soChungTu: string;
      reference: string | null;
      items: { tenHang: string; thieu: number; donVi: string | null }[];
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true }); // Nothing to report
    }

    // 1. Find Accounting department employees
    const accountants = await prisma.employee.findMany({
      where: {
        OR: [
          { departmentName: { contains: "Kế toán" } },
          { departmentCode: { contains: "accounting" } },
        ],
        userId: { not: null },
      },
      select: { userId: true },
    });
    
    const accountantUserIds = accountants.map(a => a.userId).filter(Boolean) as string[];

    if (accountantUserIds.length > 0) {
      const itemsListStr = items.map(it => `- ${it.tenHang}: thiếu ${it.thieu} ${it.donVi || ""}`).join("\n");
      const refStr = reference ? ` (tham chiếu: ${reference})` : "";
      const content = `Kho hiện đang thiếu hàng để xuất phiếu ${soChungTu}${refStr}.\nDanh sách hàng thiếu:\n${itemsListStr}\n\nVui lòng lên kế hoạch mua sắm/nhập kho bổ sung.`;

      // 2. Create Notification
      const notif = await prisma.notification.create({
        data: {
          title: `⚠️ Báo cáo thiếu hàng (Phiếu ${soChungTu})`,
          content,
          type: "warning",
          priority: "high",
          audienceType: "group",
          audienceValue: JSON.stringify(accountantUserIds),
          createdById: session.user.id,
        },
      });

      // 3. Create NotificationRecipients
      await Promise.all(
        accountantUserIds.map(uid =>
          prisma.notificationRecipient.upsert({
            where: { notificationId_userId: { notificationId: notif.id, userId: uid } },
            update: {},
            create: { notificationId: notif.id, userId: uid },
          })
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[POST /inventory/report-missing]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
