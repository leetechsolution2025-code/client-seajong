import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const [contracts, customers, leads, careHistories, saleOrders, quotations, orderStatuses] = await Promise.all([
      prisma.contract.findMany({
        include: {
          customer: {
            select: {
              name: true,
              nhom: true,
              loai: true,
              address: true
            }
          }
        },
        orderBy: {
          ngayKy: "desc"
        }
      }),
      prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          nhom: true,
          loai: true,
          nguon: true,
          createdAt: true
        }
      }),
      prisma.marketingLead.findMany({
        include: {
          careHistories: {
            orderBy: {
              executionDate: "desc"
            },
            take: 1
          }
        }
      }),
      prisma.partnerCareHistory.findMany({
        take: 10,
        orderBy: {
          executionDate: "desc"
        },
        include: {
          partner: {
            select: {
              fullName: true,
              phone: true
            }
          }
        }
      }),
      prisma.saleOrder.findMany({
        orderBy: {
          createdAt: "desc"
        },
        include: {
          customer: {
            select: { name: true, address: true }
          }
        },
        take: 50
      }),
      prisma.quotation.findMany({
        orderBy: {
          createdAt: "desc"
        },
        include: {
          customer: {
            select: { name: true, address: true }
          }
        },
        take: 50
      }),
      prisma.category.findMany({
        where: { type: "tr_ng_th_i_ho_n_b_n_l_" },
        orderBy: { sortOrder: "asc" }
      })
    ]);

    return NextResponse.json({
      success: true,
      contracts,
      customers,
      leads,
      careHistories,
      saleOrders,
      quotations,
      orderStatuses
    });
  } catch (err) {
    console.error("[api-board-sales] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
