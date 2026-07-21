import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch DinhMucVatTu where materialId is null
    const missingMaterials = await prisma.dinhMucVatTu.findMany({
      where: {
        materialId: null
      },
      include: {
        dinhMuc: {
          select: {
            code: true,
            tenDinhMuc: true
          }
        }
      }
    });

    // Group by maVatTu or tenVatTu
    const grouped = new Map<string, { maVatTu: string, tenVatTu: string, totalSoLuong: number, boms: { code: string, name: string }[] }>();

    for (const item of missingMaterials) {
      const key = item.maVatTu || item.tenVatTu;
      if (!grouped.has(key)) {
        grouped.set(key, {
          maVatTu: item.maVatTu || "",
          tenVatTu: item.tenVatTu,
          totalSoLuong: 0,
          boms: []
        });
      }

      const group = grouped.get(key)!;
      group.totalSoLuong += item.soLuong;
      
      if (item.dinhMuc) {
        // Prevent duplicate BOM entries for the same material
        const exists = group.boms.find(b => b.code === item.dinhMuc!.code);
        if (!exists) {
          group.boms.push({
            code: item.dinhMuc.code || "",
            name: item.dinhMuc.tenDinhMuc
          });
        }
      }
    }

    const items = Array.from(grouped.values()).sort((a, b) => a.tenVatTu.localeCompare(b.tenVatTu));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/production/materials/missing]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
