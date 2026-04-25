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

  // Fetch nhiều hơn để filter JS-side (SQLite không normalize dấu tiếng Việt)
  const FETCH_LIMIT = q ? 500 : limit;

  const rawItems = await prisma.inventoryItem.findMany({
    select: {
      id:        true,
      code:      true,
      tenHang:   true,
      donVi:     true,
      soLuong:   true,   // legacy field – dùng để fallback khi chưa có InventoryStock
      giaNhap:   true,
      giaBan:    true,
      trangThai: true,
      // Luôn fetch stocks để tính tồn kho chính xác
      stocks: warehouseId
        ? {
            where:  { warehouseId },
            select: {
              soLuong:   true,
              viTriHang: true,
              viTriCot:  true,
              viTriTang: true,
            },
          }
        : {
            select: { soLuong: true },
          },
    },
    orderBy: { tenHang: "asc" },
    take: FETCH_LIMIT,
  });

  // Filter JS-side với normalize dấu tiếng Việt
  const qNorm = removeVietnameseTones(q);
  const filtered = q
    ? rawItems.filter(it => {
        const nameNorm = removeVietnameseTones(it.tenHang);
        const codeNorm = removeVietnameseTones(it.code ?? "");
        return nameNorm.includes(qNorm) || codeNorm.includes(qNorm);
      })
    : rawItems;

  // Lấy đúng limit sau khi filter
  const items = filtered.slice(0, limit);

  // Tính soLuongTon + vị trí
  type StockWithPos = { soLuong: number; viTriHang?: string | null; viTriCot?: string | null; viTriTang?: string | null };
  const result = items.map(it => {
    const stocks = it.stocks as StockWithPos[];

    let soLuongTon: number;
    let viTriHang: string | null = null;
    let viTriCot:  string | null = null;
    let viTriTang: string | null = null;

    if (warehouseId) {
      if (stocks.length > 0) {
        // Đã có InventoryStock cho kho này → dùng số chính xác theo kho
        soLuongTon = stocks[0].soLuong;
        viTriHang  = stocks[0].viTriHang ?? null;
        viTriCot   = stocks[0].viTriCot  ?? null;
        viTriTang  = stocks[0].viTriTang ?? null;
      } else {
        // Chưa có InventoryStock nào (dữ liệu legacy / nhập trực tiếp)
        // → fallback về soLuong tổng để tránh báo thiếu hàng sai
        soLuongTon = it.soLuong;
      }
    } else {
      // Không chọn kho cụ thể → tổng tất cả kho, fallback legacy nếu chưa có record
      soLuongTon = stocks.length > 0
        ? stocks.reduce((s, st) => s + st.soLuong, 0)
        : it.soLuong;
    }

    return {
      id:         it.id,
      code:       it.code,
      tenHang:    it.tenHang,
      donVi:      it.donVi,
      giaNhap:    it.giaNhap,
      giaBan:     it.giaBan,
      trangThai:  it.trangThai,
      soLuongTon,
      viTriHang,
      viTriCot,
      viTriTang,
    };
  });

  return NextResponse.json(result);
}

