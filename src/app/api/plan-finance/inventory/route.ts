import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeVietnameseTones } from "@/lib/utils";

const PAGE_SIZE = 7;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search     = searchParams.get("search")     ?? "";
    const trangThai  = searchParams.get("trangThai")  ?? "";
    const categoryId = searchParams.get("categoryId") ?? "";

    // Khi có search: fetch nhiều hơn rồi filter JS-side (SQLite không normalize dấu tiếng Việt)
    const searchNorm = removeVietnameseTones(search);
    const FETCH_LIMIT = search ? 500 : PAGE_SIZE;

    const where = {
      ...(trangThai  && { trangThai }),
      ...(categoryId && { categoryId }),
    };

    const rawItems = await prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: search ? undefined : FETCH_LIMIT,
      skip: search ? undefined : (page - 1) * PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        stocks: { select: { soLuong: true, soLuongMin: true } },
      },
    });

    // Filter JS-side nếu có search
    const filtered = search
      ? rawItems.filter(it => {
          const nameNorm = removeVietnameseTones(it.tenHang);
          const codeNorm = removeVietnameseTones(it.code ?? "");
          return nameNorm.includes(searchNorm) || codeNorm.includes(searchNorm);
        })
      : rawItems;

    const total = search ? filtered.length : await prisma.inventoryItem.count({ where });
    const paginated = search
      ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      : filtered;

    // Tính tổng tồn kho thực và trangThai live cho từng item
    const items = paginated.map(item => {
      // Nếu có bản ghi InventoryStock → tính từ stocks
      // Nếu chưa có stock nào (nhập legacy/Excel) → fallback về soLuong cũ
      const hasStocks = item.stocks.length > 0;
      const soLuongThuc = hasStocks
        ? item.stocks.reduce((sum, s) => sum + s.soLuong, 0)
        : item.soLuong; // fallback: dùng trường legacy

      const soLuongMinKho = item.stocks.reduce((sum, s) => sum + s.soLuongMin, 0);
      const minThreshold = soLuongMinKho > 0 ? soLuongMinKho : item.soLuongMin;

      const trangThaiLive =
        soLuongThuc === 0                                ? "het-hang" :
        minThreshold > 0 && soLuongThuc <= minThreshold ? "sap-het"  : "con-hang";

      return {
        ...item,
        soLuongThuc,
        soLuong: soLuongThuc,
        trangThai: trangThaiLive,
      };
    });

    return NextResponse.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (e: unknown) {
    console.error("[GET /inventory]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      code, tenHang, loai, categoryId,
      donVi, soLuong, soLuongMin, giaNhap, giaBan,
      nhaCungCap, thongSoKyThuat, viTri, trangThai, ghiChu,
      dinhMuc,
    } = body;
    if (!tenHang?.trim()) return NextResponse.json({ error: "Tên hàng không được để trống" }, { status: 400 });

    const soLuongVal    = parseFloat(soLuong    ?? 0);
    const soLuongMinVal = parseFloat(soLuongMin ?? 0);

    // Tự tính trạng thái từ tồn kho
    const trangThaiCalc =
      soLuongVal === 0                         ? "het-hang" :
      soLuongMinVal > 0 && soLuongVal <= soLuongMinVal ? "sap-het"  : "con-hang";

    const item = await prisma.inventoryItem.create({
      data: {
        code:           code || undefined,
        tenHang:        tenHang.trim(),
        loai:           loai            || undefined,
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
        donVi:          donVi           || undefined,
        soLuong:        soLuongVal,
        soLuongMin:     soLuongMinVal,
        giaNhap:        parseFloat(giaNhap ?? 0),
        giaBan:         parseFloat(giaBan  ?? 0),
        nhaCungCap:     nhaCungCap      || undefined,
        thongSoKyThuat: thongSoKyThuat  || undefined,
        trangThai:      trangThaiCalc,
        ghiChu:         ghiChu          || undefined,
        // Tạo định mức kèm theo nếu có
        ...(dinhMuc && Array.isArray(dinhMuc.vatTu) && dinhMuc.vatTu.length > 0 ? {
          dinhMuc: {
            create: {
              code:        dinhMuc.code        || undefined,
              tenDinhMuc:  dinhMuc.tenDinhMuc  || undefined,
              vatTu: {
                create: dinhMuc.vatTu.map((v: { tenVatTu: string; soLuong: number; donViTinh?: string; ghiChu?: string }) => ({
                  tenVatTu:  v.tenVatTu,
                  soLuong:   Number(v.soLuong) || 1,
                  donViTinh: v.donViTinh || undefined,
                  ghiChu:    v.ghiChu    || undefined,
                })),
              },
            },
          },
        } : {}),
      },
      include: {
        dinhMuc: { include: { vatTu: true } },
        category: { select: { name: true } },
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
