import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeVietnameseTones } from "@/lib/utils";
import { attachWebImages } from "@/lib/sync-utils";

const PAGE_SIZE = 5;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search      = searchParams.get("search")      ?? "";
    const trangThai   = searchParams.get("trangThai")   ?? "";
    const categoryId  = searchParams.get("categoryId")  ?? "";
    const warehouseId = searchParams.get("warehouseId") ?? "";

    const searchNorm = removeVietnameseTones(search);
    const FETCH_LIMIT = search ? 1000 : 100;

    const where: any = {
      loai: "hang-hoa",
      ...(categoryId && { categoryId }),
    };

    // if (warehouseId) {
    //   where.stocks = { some: { warehouseId } };
    // }

    const rawItems = await prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        dinhMucs: { select: { id: true, code: true } },
        stocks: warehouseId 
          ? { where: { warehouseId }, select: { soLuong: true, soLuongMin: true } }
          : { select: { soLuong: true, soLuongMin: true } },
      },
    });

    // JS-side search filtering
    let filtered = search
      ? rawItems.filter(it => {
          const nameNorm = removeVietnameseTones(it.tenHang);
          const codeNorm = removeVietnameseTones(it.code ?? "");
          return nameNorm.includes(searchNorm) || codeNorm.includes(searchNorm);
        })
      : rawItems;

    let items = filtered.map(item => {
      const hasStocks = item.stocks.length > 0;
      const soLuongThuc = hasStocks
        ? item.stocks.reduce((sum: number, s: any) => sum + s.soLuong, 0)
        : item.soLuong;

      const soLuongMinTotal = item.stocks.reduce((sum: number, s: any) => sum + s.soLuongMin, 0);
      const minThreshold = soLuongMinTotal > 0 ? soLuongMinTotal : item.soLuongMin;

      const trangThaiLive =
        soLuongThuc <= 0                                ? "het-hang" :
        minThreshold > 0 && soLuongThuc <= minThreshold ? "sap-het"  : "con-hang";

      return {
        ...item,
        soLuong: soLuongThuc,
        trangThai: trangThaiLive,
        source: "inventory"
      };
    });

    if (trangThai) {
      items = items.filter(it => it.trangThai === trangThai);
    }

    const total = items.length;
    const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const itemsWithImages = await attachWebImages(paginated);

    return NextResponse.json({ 
      items: itemsWithImages, 
      total, 
      page, 
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) 
    });
  } catch (e: unknown) {
    console.error("[GET /api/finance/inventory]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 }, { status: 500 });
  }
}
