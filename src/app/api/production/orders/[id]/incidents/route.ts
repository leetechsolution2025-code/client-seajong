import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orderId = params.id;
    const dbOrderId = orderId.replace('LSX', 'DHBL');
    const { message } = await req.json();

    if (!message || message.trim() === "") {
      return NextResponse.json({ error: "Nội dung báo cáo không được để trống" }, { status: 400 });
    }

    // Find order
    let order = await prisma.saleOrder.findUnique({ where: { id: dbOrderId } });
    if (!order) {
      order = await prisma.saleOrder.findUnique({ where: { code: dbOrderId } });
    }

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy lệnh sản xuất" }, { status: 404 });
    }

    const incident = await prisma.productionIncident.create({
      data: {
        orderId: order.id,
        message: message.trim()
      }
    });

    // Find Accounting department employees
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
      // Create Notification
      const notif = await prisma.notification.create({
        data: {
          title: `⚠️ Báo cáo sự cố Lệnh sản xuất (${orderId.replace('DHBL', 'LSX')})`,
          content: message.trim(),
          type: "warning",
          priority: "high",
          audienceType: "group",
          audienceValue: JSON.stringify(accountantUserIds),
          createdById: session.user.id,
        },
      });

      // Create NotificationRecipients
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

    return NextResponse.json({ success: true, incident });
  } catch (e) {
    console.error("[POST /api/production/orders/[id]/incidents]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
