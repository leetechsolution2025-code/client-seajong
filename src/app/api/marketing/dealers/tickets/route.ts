import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "15") || 15);

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { title: { contains: search } },
        { content: { contains: search } },
        { dealerName: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { address: { contains: search } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.dealerSupportTicket.count({ where }),
      prisma.dealerSupportTicket.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, name: true, address: true, dienThoai: true }
          },
          handler: {
            select: { id: true, fullName: true }
          }
        }
      })
    ]);

    const formatted = tickets.map(t => ({
      id: t.id,
      code: t.code,
      customerId: t.customerId,
      dealer: t.customer?.name || t.dealerName || "Đại lý",
      address: t.customer?.address || "",
      type: t.type,
      title: t.title,
      content: t.content,
      status: t.status,
      requestDate: t.requestDate ? new Date(t.requestDate).toLocaleDateString("vi-VN") : "",
      handlerId: t.handlerId,
      handlerName: t.handler?.fullName || "",
      date: new Date(t.createdAt).toLocaleDateString("vi-VN"),
      createdAt: t.createdAt
    }));

    return NextResponse.json({
      tickets: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    });
  } catch (error: any) {
    console.error("[Dealer Tickets API Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);

    const body = await req.json();
    const { customerId, dealerName, type, title, content, requestDate, handlerId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Tiêu đề không được để trống" }, { status: 400 });
    }

    // Sinh mã tự động theo loại yêu cầu
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const randSuffix = Math.floor(1000 + Math.random() * 9000);

    let prefix = "HT";
    if (type?.includes("Cấp phát") || type?.includes("vật tư")) {
      prefix = "CP";
    } else if (type?.includes("đóng gói") || type?.includes("phân lô")) {
      prefix = "PK";
    } else if (type?.includes("Bảo hành") || type?.includes("Linh kiện")) {
      prefix = "BH";
    } else if (type?.includes("POSM") || type?.includes("catalog")) {
      prefix = "QC";
    }

    const code = `${prefix}-${dateStr}-${randSuffix}`;

    // Tìm thông tin khách hàng nếu có customerId
    let finalDealerName = dealerName?.trim() || "";
    if (customerId) {
      const cust = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, address: true }
      });
      if (cust) {
        finalDealerName = cust.name;
      }
    }

    const ticket = await prisma.dealerSupportTicket.create({
      data: {
        code,
        customerId: customerId || null,
        dealerName: finalDealerName || "Đại lý",
        type: type || "Hỗ trợ chung",
        title: title.trim(),
        content: content?.trim() || null,
        status: "In Progress",
        requestDate: requestDate ? new Date(requestDate) : now,
        handlerId: handlerId || null
      },
      include: {
        customer: {
          select: { id: true, name: true, address: true, dienThoai: true }
        },
        handler: {
          select: { id: true, fullName: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        code: ticket.code,
        customerId: ticket.customerId,
        dealer: ticket.customer?.name || ticket.dealerName || "Đại lý",
        address: ticket.customer?.address || "",
        type: ticket.type,
        title: ticket.title,
        content: ticket.content,
        status: ticket.status,
        requestDate: ticket.requestDate ? new Date(ticket.requestDate).toLocaleDateString("vi-VN") : "",
        handlerId: ticket.handlerId,
        handlerName: ticket.handler?.fullName || "",
        date: new Date(ticket.createdAt).toLocaleDateString("vi-VN"),
        createdAt: ticket.createdAt
      }
    });
  } catch (error: any) {
    console.error("[Dealer Tickets Create API Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);

    const body = await req.json();
    const { id, customerId, dealerName, type, title, content, status, requestDate, handlerId } = body;

    if (!id) {
      return NextResponse.json({ error: "ID yêu cầu không hợp lệ" }, { status: 400 });
    }

    let finalDealerName = dealerName?.trim();
    if (customerId) {
      const cust = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, address: true }
      });
      if (cust) {
        finalDealerName = cust.name;
      }
    }

    const updated = await prisma.dealerSupportTicket.update({
      where: { id },
      data: {
        ...(customerId !== undefined && { customerId: customerId || null }),
        ...(finalDealerName !== undefined && { dealerName: finalDealerName }),
        ...(type !== undefined && { type }),
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(requestDate !== undefined && { requestDate: requestDate ? new Date(requestDate) : undefined }),
        ...(handlerId !== undefined && { handlerId: handlerId || null }),
      },
      include: {
        customer: {
          select: { id: true, name: true, address: true, dienThoai: true }
        },
        handler: {
          select: { id: true, fullName: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: updated.id,
        code: updated.code,
        customerId: updated.customerId,
        dealer: updated.customer?.name || updated.dealerName || "Đại lý",
        address: updated.customer?.address || "",
        type: updated.type,
        title: updated.title,
        content: updated.content,
        status: updated.status,
        requestDate: updated.requestDate ? new Date(updated.requestDate).toLocaleDateString("vi-VN") : "",
        handlerId: updated.handlerId,
        handlerName: updated.handler?.fullName || "",
        date: new Date(updated.createdAt).toLocaleDateString("vi-VN"),
        createdAt: updated.createdAt
      }
    });
  } catch (error: any) {
    console.error("[Dealer Tickets PATCH API Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);

    const body = await req.json();
    const { ids, id } = body;
    const targetIds: string[] = ids || (id ? [id] : []);

    if (!targetIds || targetIds.length === 0) {
      return NextResponse.json({ error: "Không có ID nào được chọn để xóa" }, { status: 400 });
    }

    await prisma.dealerSupportTicket.deleteMany({
      where: { id: { in: targetIds } }
    });

    return NextResponse.json({ success: true, count: targetIds.length });
  } catch (error: any) {
    console.error("[Dealer Tickets DELETE API Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}


