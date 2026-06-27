import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await (prisma as any).hrSupplyTransaction.findMany({
      include: {
        item: {
          include: {
            category: true,
          },
        },
        supplier: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error("[STATIONERY_TRANSACTIONS_GET] ERROR:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, supplierId, invoiceNo, note } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Danh sách vật tư không hợp lệ" }, { status: 400 });
    }

    const executorId = session.user.employeeId || "";
    const executorName = session.user.name || "Admin";

    const createdTransactions = await prisma.$transaction(async (tx) => {
      const txs = [];

      for (const item of items) {
        const { itemId, quantity, price } = item;
        const qty = Number(quantity);
        const unitPrice = Number(price || 0);

        if (!itemId || isNaN(qty) || qty <= 0) {
          throw new Error("Vật tư hoặc số lượng không hợp lệ.");
        }

        // 1. Cập nhật tồn kho hiện tại và đơn giá mới của vật tư
        const updatedItem = await (tx as any).hrSupplyItem.update({
          where: { id: itemId },
          data: {
            currentStock: {
              increment: qty,
            },
            price: unitPrice > 0 ? unitPrice : undefined,
          },
        });

        // 2. Ghi nhận giao dịch Nhập kho
        const newTx = await (tx as any).hrSupplyTransaction.create({
          data: {
            itemId,
            type: "IMPORT",
            quantity: qty,
            price: unitPrice,
            note: note || "Nhập kho mua hàng",
            invoiceNo: invoiceNo || null,
            supplierId: supplierId || null,
            executorId: executorId || null,
            executorName,
          },
          include: {
            item: true,
          },
        });

        txs.push(newTx);
      }

      return txs;
    });

    return NextResponse.json({ success: true, transactions: createdTransactions });
  } catch (error: any) {
    console.error("[STATIONERY_TRANSACTIONS_POST] ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
