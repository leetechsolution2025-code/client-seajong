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

    const statusMap: Record<string, string> = { "chua-thu": "UNPAID", "da-thu": "PAID", "mot-phan": "PARTIAL", "qua-han": "OVERDUE" };
    const mappedStatus = trangThai ? statusMap[trangThai] || trangThai : "";

    const where = {
      ...(search    && { partnerName: { contains: search } }),
      ...(mappedStatus && { status: mappedStatus }),
      ...(loai      && { type: loai }),
    };

    const [total, rawItems, rawPhuThu, rawPhuTra] = await Promise.all([
      prisma.debt.count({ where }),
      prisma.debt.findMany({ where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
      prisma.debt.findMany({ where: { type: "phai-thu" }, select: { amount: true, paidAmount: true, status: true, dueDate: true } }),
      prisma.debt.findMany({ where: { type: "phai-tra" }, select: { amount: true, paidAmount: true, status: true, dueDate: true } }),
    ]);

    const reverseStatusMap: Record<string, string> = { "UNPAID": "chua-thu", "PAID": "da-thu", "PARTIAL": "mot-phan", "OVERDUE": "qua-han" };

    const items = rawItems.map(d => ({
      ...d,
      loai: d.type,
      doiTuong: d.partnerName,
      soTien: d.amount,
      daThu: d.paidAmount,
      hanThanhToan: d.dueDate,
      trangThai: reverseStatusMap[d.status] || d.status,
      ghiChu: d.description
    }));
    
    const allPhuThu = rawPhuThu.map(d => ({ soTien: d.amount, daThu: d.paidAmount, hanThanhToan: d.dueDate }));
    const allPhuTra = rawPhuTra.map(d => ({ soTien: d.amount, daThu: d.paidAmount, hanThanhToan: d.dueDate }));

    const sum = (arr: { soTien: number }[]) => arr.reduce((s, d) => s + d.soTien, 0);
    const sumDaThu = (arr: { daThu: number }[]) => arr.reduce((s, d) => s + d.daThu, 0);

    const now = new Date();
    const threshold = new Date(now.getTime() + 10 * 86400_000);

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

    const statusMap: Record<string, string> = { "chua-thu": "UNPAID", "da-thu": "PAID", "mot-phan": "PARTIAL", "qua-han": "OVERDUE" };
    let mappedStatus = trangThai ? statusMap[trangThai] || trangThai : "UNPAID";

    const item = await prisma.debt.create({
      data: {
        type: loai ?? "phai-thu", 
        partnerName: doiTuong.trim(),
        amount: parseFloat(soTien ?? 0),
        paidAmount:  parseFloat(daThu  ?? 0),
        status: mappedStatus,
        description: ghiChu,
        ...(hanThanhToan && { dueDate: new Date(hanThanhToan) }),
      },
    });

    const reverseStatusMap: Record<string, string> = { "UNPAID": "chua-thu", "PAID": "da-thu", "PARTIAL": "mot-phan", "OVERDUE": "qua-han" };
    const mappedItem = {
      ...item,
      loai: item.type,
      doiTuong: item.partnerName,
      soTien: item.amount,
      daThu: item.paidAmount,
      hanThanhToan: item.dueDate,
      trangThai: reverseStatusMap[item.status] || item.status,
      ghiChu: item.description
    };
    return NextResponse.json(mappedItem, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
