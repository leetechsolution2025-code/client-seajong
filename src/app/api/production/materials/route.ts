import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeVietnameseTones } from "@/lib/utils";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 100;

type MaterialItemWithRelations = Prisma.MaterialItemGetPayload<{
  include: {
    category: { select: { name: true } };
    stocks: { select: { soLuong: true; soLuongMin: true } };
  };
}>;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search      = searchParams.get("search")      ?? "";
    const categoryId  = searchParams.get("categoryId")  ?? "";
    const warehouseId = searchParams.get("warehouseId") ?? "";

    const searchNorm = removeVietnameseTones(search);

    const where: any = {
      ...(categoryId && { categoryId }),
    };

    if (warehouseId) {
      where.stocks = {
        some: { warehouseId }
      };
    }

    const rawItems = await prisma.materialItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: search ? 1000 : PAGE_SIZE,
      skip: search ? 0 : (page - 1) * PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        stocks: warehouseId 
          ? { where: { warehouseId }, select: { soLuong: true, soLuongMin: true } }
          : { select: { soLuong: true, soLuongMin: true } },
      },
    }) as MaterialItemWithRelations[];

    const filtered = search
      ? rawItems.filter((it: MaterialItemWithRelations) => {
          const nameNorm = removeVietnameseTones(it.name);
          const codeNorm = removeVietnameseTones(it.code ?? "");
          return nameNorm.includes(searchNorm) || codeNorm.includes(searchNorm);
        })
      : rawItems;

    const total = search ? filtered.length : await prisma.materialItem.count({ where });
    const paginated = search
      ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      : filtered;

    const items = paginated.map((item: MaterialItemWithRelations) => {
      const soLuongThuc = item.stocks.reduce((sum: number, s: any) => sum + s.soLuong, 0);
      const soLuongMinTotal = item.stocks.reduce((sum: number, s: any) => sum + s.soLuongMin, 0);
      
      const trangThai = 
        soLuongThuc <= 0                                ? "het-hang" :
        soLuongMinTotal > 0 && soLuongThuc <= soLuongMinTotal ? "sap-het"  : "con-hang";

      return {
        id: item.id,
        code: item.code,
        tenHang: item.name, // Mapping to UI expectation
        donVi: item.unit,
        giaBan: 0,
        giaNhap: item.price,
        brand: item.brand,
        material: item.material,
        spec: item.spec,
        thongSoKyThuat: (item as any).thongSoKyThuat || "",
        imageUrl: item.imageUrl,
        soLuong: soLuongThuc,
        trangThai,
        category: item.category,
      };
    });

    return NextResponse.json({ 
      items, 
      total, 
      page, 
      totalPages: Math.ceil(total / PAGE_SIZE) 
    });
  } catch (e) {
    console.error("[GET /api/production/materials]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 }, { status: 500 });
  }
}
