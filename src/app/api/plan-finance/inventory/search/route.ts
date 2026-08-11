import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeVietnameseTones } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q           = searchParams.get("q")           ?? "";
  const limit       = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const warehouseId = searchParams.get("warehouseId") ?? null;
  const id          = searchParams.get("id");
  const code        = searchParams.get("code");

  if (id) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      select: {
        id:        true,
        code:      true,
        tenHang:   true,
        donVi:     true,
        soLuong:   true,
        giaNhap:   true,
        giaBan:    true,
        trangThai: true,
        imageUrl:  true,
        stocks: {
          select: { 
            warehouseId: true,
            soLuong: true,
            viTriHang: true,
            viTriCot: true,
            viTriTang: true,
          },
        },
      }
    });
    if (item) {
      const stocks = item.stocks || [];
      const totalSoLuong = stocks.length > 0 ? stocks.reduce((s, st) => s + st.soLuong, 0) : (item.soLuong || 0);
      return NextResponse.json([{
        id:         item.id,
        code:       item.code,
        tenHang:    item.tenHang,
        donVi:      item.donVi,
        giaNhap:    item.giaNhap,
        giaBan:     item.giaBan,
        trangThai:  item.trangThai,
        imageUrl:   item.imageUrl,
        soLuongTon: totalSoLuong,
        viTriHang:  null,
        viTriCot:   null,
        viTriTang:  null,
      }]);
    }
    return NextResponse.json([]);
  }

  if (code) {
    const item = await prisma.inventoryItem.findFirst({
      where: { code },
      select: {
        id:        true,
        code:      true,
        tenHang:   true,
        donVi:     true,
        soLuong:   true,
        giaNhap:   true,
        giaBan:    true,
        trangThai: true,
        imageUrl:  true,
        stocks: {
          select: { 
            warehouseId: true,
            soLuong: true,
            viTriHang: true,
            viTriCot: true,
            viTriTang: true,
          },
        },
      }
    });
    if (item) {
      const stocks = item.stocks || [];
      const totalSoLuong = stocks.length > 0 ? stocks.reduce((s, st) => s + st.soLuong, 0) : (item.soLuong || 0);
      return NextResponse.json([{
        id:         item.id,
        code:       item.code,
        tenHang:    item.tenHang,
        donVi:      item.donVi,
        giaNhap:    item.giaNhap,
        giaBan:     item.giaBan,
        trangThai:  item.trangThai,
        imageUrl:   item.imageUrl,
        soLuongTon: totalSoLuong,
        viTriHang:  null,
        viTriCot:   null,
        viTriTang:  null,
      }]);
    }
    return NextResponse.json([]);
  }

  let whFilter: any = {};
  if (warehouseId) {
    const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { code: true } });
    if (wh?.code === "KHO-LOI") whFilter = { stocks: { some: { warehouseId: warehouseId, soLuong: { gt: 0 } } } };
  }

  // Fetch toàn bộ khi có q để filter JS-side chính xác (SQLite không normalize dấu tiếng Việt)
  const rawItems = await prisma.inventoryItem.findMany({
    where: whFilter,
    select: {
      id:        true,
      code:      true,
      tenHang:   true,
      donVi:     true,
      soLuong:   true,   // legacy field – dùng để fallback khi chưa có InventoryStock
      giaNhap:   true,
      giaBan:    true,
      trangThai: true,
      imageUrl:  true,
      // Luôn fetch stocks để tính tồn kho chính xác
      stocks: {
        select: { 
          warehouseId: true,
          soLuong: true,
          viTriHang: true,
          viTriCot: true,
          viTriTang: true,
        },
      },
    },
    orderBy: { tenHang: "asc" },
    take: q ? undefined : limit,
  });

  // Filter JS-side với normalize dấu tiếng Việt
  const qNorm = removeVietnameseTones(q);
  const filtered = q
    ? rawItems.filter(it => {
        const nameNorm = removeVietnameseTones(it.tenHang);
        const codeNorm = removeVietnameseTones(it.code ?? "");
        const queryWords = qNorm.split(/\s+/).filter(Boolean);
        return queryWords.every(word => nameNorm.includes(word) || codeNorm.includes(word));
      })
    : rawItems;

  // Sắp xếp ưu tiên trùng khớp chính xác mã hoặc tên lên đầu
  const sorted = q
    ? [...filtered].sort((a, b) => {
        const qLower = q.toLowerCase();
        const aNameLower = a.tenHang.toLowerCase();
        const bNameLower = b.tenHang.toLowerCase();
        const aCodeLower = (a.code || "").toLowerCase();
        const bCodeLower = (b.code || "").toLowerCase();

        const aExactName = aNameLower === qLower || removeVietnameseTones(aNameLower) === qNorm;
        const bExactName = bNameLower === qLower || removeVietnameseTones(bNameLower) === qNorm;
        const aExactCode = aCodeLower === qLower;
        const bExactCode = bCodeLower === qLower;

        if ((aExactName || aExactCode) && !(bExactName || bExactCode)) return -1;
        if (!(aExactName || aExactCode) && (bExactName || bExactCode)) return 1;

        // Ưu tiên trùng khớp bắt đầu bằng
        const aStartName = aNameLower.startsWith(qLower);
        const bStartName = bNameLower.startsWith(qLower);
        if (aStartName && !bStartName) return -1;
        if (!aStartName && bStartName) return 1;

        return 0;
      })
    : filtered;

  // Lấy đúng limit sau khi filter
  const items = sorted.slice(0, limit);

  // Tính soLuongTon + vị trí
  type StockWithPos = { warehouseId: string; soLuong: number; viTriHang?: string | null; viTriCot?: string | null; viTriTang?: string | null };
  const result = items.map(it => {
    const stocks = it.stocks as StockWithPos[];

    let soLuongTon: number;
    let viTriHang: string | null = null;
    let viTriCot:  string | null = null;
    let viTriTang: string | null = null;

    // Theo yêu cầu: không phân biệt tồn kho ở kho chính và kho KVP, lượng tồn là tổng số
    const totalSoLuong = stocks.length > 0 
      ? stocks.reduce((s, st) => s + st.soLuong, 0) 
      : (it.soLuong || 0);
      
    soLuongTon = totalSoLuong;

    if (warehouseId) {
      const whStock = stocks.find(s => s.warehouseId === warehouseId);
      if (whStock) {
        viTriHang  = whStock.viTriHang ?? null;
        viTriCot   = whStock.viTriCot  ?? null;
        viTriTang  = whStock.viTriTang ?? null;
      }
    }

    return {
      id:         it.id,
      code:       it.code,
      tenHang:    it.tenHang,
      donVi:      it.donVi,
      giaNhap:    it.giaNhap,
      giaBan:     it.giaBan,
      trangThai:  it.trangThai,
      imageUrl:   it.imageUrl,
      soLuongTon,
      viTriHang,
      viTriCot,
      viTriTang,
    };
  });

  return NextResponse.json(result);
}

