import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const bom = await prisma.dinhMuc.findFirst({
      where: { code },
      include: {
        inventoryItem: {
          include: {
            dinhMucs: true,
            category: true,
            erpCategory: true,
            stocks: { include: { warehouse: true } }
          }
        }
      }
    });

    if (!bom) {
        return NextResponse.json({ error: "Không tìm thấy định mức" }, { status: 404 });
    }

    return NextResponse.json({ bom });
  } catch (e) {
    console.error("[GET /api/production/bom/search]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
