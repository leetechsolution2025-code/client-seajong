import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const requests = await (prisma as any).hrSupplyRequest.findMany({
      include: {
        requester: true,
        department: true,
        items: {
          include: {
            item: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("[STATIONERY_REQUESTS_GET] ERROR:", error.message);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { requesterId, departmentId, type, items, note } = body;

    // Generate Request Code: REQ-YYYYMM-XXX
    const now = new Date();
    const dateStr = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
    const count = await (prisma as any).hrSupplyRequest.count({
      where: {
        code: {
          startsWith: `REQ-${dateStr}`
        }
      }
    });
    const code = `REQ-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    const request = await (prisma as any).hrSupplyRequest.create({
      data: {
        code,
        requesterId,
        departmentId,
        type,
        note,
        status: "PENDING",
        items: {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
          }))
        }
      }
    });

    return NextResponse.json(request);
  } catch (error: any) {
    console.error("[STATIONERY_REQUESTS_POST] ERROR:", error.message);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
