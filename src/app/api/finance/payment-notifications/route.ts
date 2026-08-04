import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { customer: { name: { contains: search } } },
        { saleOrder: { code: { contains: search } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.paymentNotification.count({ where }),
      prisma.paymentNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, address: true } },
          saleOrder: { 
            select: { 
              id: true, 
              code: true,
              keToanDuyet: true,
              tongTien: true,
              daThanhToan: true,
              saleOrderItems: {
                include: {
                  inventoryItem: true
                }
              }
            } 
          },
          reportedBy: { select: { id: true, name: true } },
          verifiedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching payment notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, paymentMethod, note, saleOrderId, customerId, imageUrl } = body;

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    // Generate code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.paymentNotification.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    const seqStr = String(count + 1).padStart(3, "0");
    const code = `PT-${dateStr}-${seqStr}`;

    const newNotification = await prisma.paymentNotification.create({
      data: {
        code,
        amount: Number(amount),
        paymentMethod: paymentMethod || "transfer",
        note,
        status: "pending",
        saleOrderId,
        customerId,
        imageUrl,
        reportedById: session.user.id,
      },
      include: {
        customer: { select: { id: true, name: true } },
        saleOrder: { select: { id: true, code: true } },
      },
    });

    return NextResponse.json(newNotification, { status: 201 });
  } catch (error: any) {
    console.error("Error creating payment notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
