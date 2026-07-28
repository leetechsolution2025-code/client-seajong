import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const missingMaterials = await prisma.dinhMucVatTu.findMany({
      where: {
        inventoryItemId: null
      },
      include: {
        dinhMuc: true
      }
    });

    const grouped: any = {};
    for (const item of missingMaterials) {
      const key = `${item.maVatTu || ''}-${item.tenVatTu}`;
      if (!grouped[key]) {
        grouped[key] = {
          maVatTu: item.maVatTu,
          tenVatTu: item.tenVatTu,
          totalSoLuong: 0,
          boms: []
        };
      }
      grouped[key].totalSoLuong += item.soLuong || 1;
      // avoid duplicate boms
      if (!grouped[key].boms.find((b: any) => b.code === item.dinhMuc?.code)) {
        grouped[key].boms.push({
          code: item.dinhMuc?.code || "",
          name: item.dinhMuc?.tenDinhMuc || ""
        });
      }
    }

    const resultItems = Object.values(grouped);
    const missingProducts: string[] = [];

    return NextResponse.json({
      items: resultItems,
      missingProducts
    });
  } catch (error: any) {
    console.error("Missing materials API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
