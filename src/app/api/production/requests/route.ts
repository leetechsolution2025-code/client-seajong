import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await prisma.approvalRequest.findMany({
      where: {
        entityType: "PRODUCTION_REQUEST",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    console.error("[GET /api/production/requests] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      items: rawItems,
      productName,
      productCode,
      inventoryItemId,
      quantity,
      unit = "cái",
      startDate,
      dueDate,
      priority = "normal",
      notes,
      dinhMucId,
    } = body;

    // Chuẩn hoá danh sách items
    let items: Array<{
      productName: string;
      productCode?: string | null;
      inventoryItemId?: string | null;
      quantity: number;
      unit?: string;
      dinhMucId?: string | null;
    }> = [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      items = rawItems
        .filter((i: any) => i.productName && Number(i.quantity) > 0)
        .map((i: any) => ({
          productName: i.productName.trim(),
          productCode: i.productCode || null,
          inventoryItemId: i.inventoryItemId || null,
          quantity: Number(i.quantity),
          unit: i.unit || "cái",
          dinhMucId: i.dinhMucId || null,
        }));
    } else if (productName && Number(quantity) > 0) {
      items = [
        {
          productName: productName.trim(),
          productCode: productCode || null,
          inventoryItemId: inventoryItemId || null,
          quantity: Number(quantity),
          unit: unit || "cái",
          dinhMucId: dinhMucId || null,
        },
      ];
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng thêm ít nhất một sản phẩm hợp lệ với số lượng > 0" },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || "Cán bộ sản xuất";

    // 1. Tìm Giám đốc phê duyệt
    const directors = await prisma.employee.findMany({
      where: {
        status: "active",
        OR: [
          { position: "Giám đốc" },
          { position: { contains: "Giám đốc" } },
          { position: { contains: "giám đốc" } },
          { position: "vtr-20260401-8730-eauc" },
        ],
      },
      select: { userId: true, fullName: true, position: true },
    });

    const primaryDirector = directors[0] || null;

    // 2. Tạo mã lệnh sản xuất chuẩn: LSX-YYMMDD-XXXX
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderCodeGenerated = `LSX-${yy}${mm}${dd}-${randomHex}`;

    const startDateTime = startDate ? new Date(startDate) : now;
    const dueDateTime = dueDate ? new Date(dueDate) : new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    // 3. Tạo SaleOrder đại diện cho lệnh sản xuất
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const noteFull = notes ? `[Yêu cầu sản xuất: ${items.length} mặt hàng] - ${notes}` : `[Yêu cầu sản xuất: ${items.length} mặt hàng]`;

    const order = await prisma.saleOrder.create({
      data: {
        code: orderCodeGenerated,
        trangThai: "pending", // Chờ duyệt / Chưa thực hiện
        keToanDuyet: "approved", // Xuất hiện trong dashboard lệnh sản xuất
        ngayDat: startDateTime,
        ngayGiao: dueDateTime,
        ghiChu: noteFull,
        nguoiPhuTrach: userName,
        saleOrderItems: {
          create: items.map((item) => ({
            inventoryItemId: item.inventoryItemId || null,
            tenHang: item.productName,
            soLuong: item.quantity,
            donGia: 0,
            thanhTien: 0,
            dinhMucId: item.dinhMucId || null,
            ghiChu: item.unit ? `ĐVT: ${item.unit}` : null,
          })),
        },
      },
      include: {
        saleOrderItems: true,
      },
    });

    // 4. Tiêu đề và ApprovalRequest
    const entityTitle =
      items.length === 1
        ? `Yêu cầu sản xuất: ${items[0].productName} (SL: ${items[0].quantity} ${items[0].unit || "cái"})`
        : `Yêu cầu sản xuất ${items.length} mặt hàng (Tổng: ${totalQuantity} SP)`;

    const approval = await prisma.approvalRequest.create({
      data: {
        entityType: "PRODUCTION_REQUEST",
        entityId: order.id,
        entityCode: order.code,
        entityTitle,
        status: "pending",
        priority: priority || "normal",
        dueDate: dueDateTime,
        department: "production",
        requestedById: userId,
        requestedByName: userName,
        approverId: primaryDirector?.userId || null,
        metadata: JSON.stringify({
          orderId: order.id,
          orderCode: order.code,
          items,
          totalQuantity,
          itemCount: items.length,
          startDate: startDateTime.toISOString(),
          dueDate: dueDateTime.toISOString(),
          priority,
          notes: notes || null,
          directorName: primaryDirector?.fullName || "Giám đốc",
        }),
        comments: {
          create: [
            {
              authorId: userId,
              authorName: userName,
              authorRole: "requester",
              content: `📤 **${userName}** đã lập yêu cầu sản xuất cho **${items.length} mặt hàng** (Tổng SL: ${totalQuantity} SP), kính trình **${primaryDirector?.fullName || "Giám đốc"}** xem xét và phê duyệt.`,
              isSystem: true,
            },
          ],
        },
      },
    });

    // 5. Gửi thông báo Notification đến Giám đốc
    const productListLines = items
      .slice(0, 5)
      .map((i) => `- **${i.productName}:** ${i.quantity} ${i.unit || "cái"}`)
      .join("\n");
    const extraCountStr = items.length > 5 ? `\n- ...và ${items.length - 5} mặt hàng khác` : "";

    for (const dir of directors) {
      if (!dir.userId) continue;

      await prisma.notification.create({
        data: {
          title: `🏭 Trình duyệt yêu cầu sản xuất [${order.code}]`,
          content: `## YÊU CẦU SẢN XUẤT MỚI (${items.length} mặt hàng)\n---\n**${userName}** vừa trình phê duyệt yêu cầu sản xuất:\n- **Mã lệnh:** ${order.code}\n- **Số mặt hàng:** ${items.length} loại (Tổng: ${totalQuantity} SP)\n${productListLines}${extraCountStr}\n- **Hạn hoàn thành:** ${dueDateTime.toLocaleDateString("vi-VN")}\n\nVui lòng xem xét và phê duyệt.`,
          type: "warning",
          priority: priority === "urgent" ? "high" : "normal",
          audienceType: "individual",
          audienceValue: dir.userId,
          createdById: userId,
          attachments: JSON.stringify([
            {
              name: "Xem và duyệt yêu cầu",
              type: "link",
              url: `/board/approvals?id=${approval.id}`,
            },
          ]),
          recipients: {
            create: { userId: dir.userId },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        order,
        approval,
        director: primaryDirector ? { name: primaryDirector.fullName, position: primaryDirector.position } : null,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/production/requests] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
