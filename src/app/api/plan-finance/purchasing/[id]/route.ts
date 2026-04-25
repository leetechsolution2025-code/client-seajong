import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

// GET /api/plan-finance/purchasing/[id]  — trả về PO kèm items + supplier
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, code: true, tenHang: true, donVi: true, giaNhap: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!po) return NextResponse.json({ error: "Không tìm thấy PO" }, { status: 404 });
    return NextResponse.json(po);
  } catch (e) {
    console.error("[GET /purchasing/[id]]", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
