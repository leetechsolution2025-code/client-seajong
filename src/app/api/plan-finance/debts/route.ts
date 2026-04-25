import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search    = searchParams.get("search")    ?? "";
    const trangThai = searchParams.get("trangThai") ?? "";
    const loai      = searchParams.get("loai")      ?? "";

    const where = {
      ...(search    && { doiTuong: { contains: search } }),
      ...(trangThai && { trangThai }),
      ...(loai      && { loai }),
    };

    // Query thêm hanThanhToan để tính cơ cấu theo thời hạn
    const [total, items, allPhuThu, allPhuTra] = await Promise.all([
      prisma.debt.count({ where }),
      prisma.debt.findMany({ where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, orderBy: [{ trangThai: "asc" }, { createdAt: "desc" }] }),
      prisma.debt.findMany({ where: { loai: "phai-thu" }, select: { soTien: true, daThu: true, trangThai: true, hanThanhToan: true } }),
      prisma.debt.findMany({ where: { loai: "phai-tra" }, select: { soTien: true, daThu: true, trangThai: true, hanThanhToan: true } }),
    ]);

    const sum = (arr: { soTien: number }[]) => arr.reduce((s, d) => s + d.soTien, 0);
    const sumDaThu = (arr: { daThu: number }[]) => arr.reduce((s, d) => s + d.daThu, 0);

    const now = new Date();
    const threshold = new Date(now.getTime() + 10 * 86400_000); // 10 ngày tới

    // Phân loại theo hanThanhToan (chỉ tính những khoản chưa thanh toán đủ)
    const buildCoCau = (arr: { soTien: number; daThu: number; hanThanhToan: Date | null }[]) => {
      const chuaDenHan = arr.filter(d => d.daThu < d.soTien && (!d.hanThanhToan || d.hanThanhToan >= threshold));
      const denHan     = arr.filter(d => d.daThu < d.soTien && d.hanThanhToan && d.hanThanhToan >= now && d.hanThanhToan < threshold);
      const quaHan     = arr.filter(d => d.daThu < d.soTien && d.hanThanhToan && d.hanThanhToan < now);
      return [
        { label: "Chưa đến hạn", value: Math.round(sum(chuaDenHan)) },
        { label: "Đến hạn",      value: Math.round(sum(denHan)) },
        { label: "Đã quá hạn",   value: Math.round(sum(quaHan)) },
      ];
    };

    const stats = {
      tongPhuThu:    sum(allPhuThu),
      daThuDuoc:     sumDaThu(allPhuThu),
      tongPhuTra:    sum(allPhuTra),
      daTraDuoc:     sumDaThu(allPhuTra),
      soKhoanQuaHan: allPhuThu.filter(d => d.hanThanhToan && d.hanThanhToan <= now && d.daThu < d.soTien).length
                   + allPhuTra.filter(d => d.hanThanhToan && d.hanThanhToan <= now && d.daThu < d.soTien).length,
      coCapThu: buildCoCau(allPhuThu),
      coCapTra: buildCoCau(allPhuTra),
    };

    return NextResponse.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), stats });
  } catch (e: unknown) {
    console.error("[GET /debts]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { loai, doiTuong, soTien, daThu, hanThanhToan, trangThai, ghiChu } = body;
    if (!doiTuong?.trim()) return NextResponse.json({ error: "Đối tượng không được để trống" }, { status: 400 });

    const item = await prisma.debt.create({
      data: {
        loai: loai ?? "phai-thu", doiTuong: doiTuong.trim(),
        soTien: parseFloat(soTien ?? 0),
        daThu:  parseFloat(daThu  ?? 0),
        trangThai: trangThai ?? "chua-thu",
        ghiChu,
        ...(hanThanhToan && { hanThanhToan: new Date(hanThanhToan) }),
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
