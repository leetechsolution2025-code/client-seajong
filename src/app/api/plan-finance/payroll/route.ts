import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const thang      = parseInt(searchParams.get("thang") ?? "0");
    const nam        = parseInt(searchParams.get("nam")   ?? "0");
    const trangThai  = searchParams.get("trangThai") ?? "";
    const deptCode   = searchParams.get("dept")      ?? "";
    const search     = searchParams.get("search")    ?? "";
    const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1"));

    const where: Record<string, unknown> = {};
    if (thang > 0) where.thang = thang;
    if (nam   > 0) where.nam   = nam;
    if (trangThai)  where.trangThai = trangThai;
    if (search || deptCode) {
      where.employee = {
        ...(search    && { OR: [{ fullName: { contains: search } }, { code: { contains: search } }] }),
        ...(deptCode  && { departmentCode: deptCode }),
      };
    }

    const [total, items] = await Promise.all([
      prisma.payroll.count({ where }),
      prisma.payroll.findMany({
        where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        orderBy: [{ nam: "desc" }, { thang: "desc" }, { employee: { fullName: "asc" } }],
        include: {
          employee: {
            select: { id: true, fullName: true, code: true, departmentCode: true, departmentName: true, position: true },
          },
        },
      }),
    ]);

    return NextResponse.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (e: unknown) {
    console.error("[GET /payroll]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      employeeId, thang, nam,
      nguonChamCong,
      ngayCong, ngayNghiPhep, ngayNghiKhac, gioLamThem,
      luongCoBan, phuCap, thuong, luongLamThem,
      khauTruBH, thueTNCN, khauTruKhac,
      trangThai, ngayTra, ghiChu,
    } = body;

    if (!employeeId || !thang || !nam)
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });

    const cb   = parseFloat(luongCoBan    ?? 0);
    const pc   = parseFloat(phuCap        ?? 0);
    const tw   = parseFloat(thuong        ?? 0);
    const lt   = parseFloat(luongLamThem  ?? 0);
    const bh   = parseFloat(khauTruBH     ?? 0);
    const tax  = parseFloat(thueTNCN      ?? 0);
    const kk   = parseFloat(khauTruKhac   ?? 0);

    const luongThucNhan = (cb + pc + tw + lt) - bh - tax - kk;
    const chiPhiCtyDong = cb * 0.235;   // ~23.5% lương cơ bản
    const tongChiPhiCty = luongThucNhan + chiPhiCtyDong;

    const item = await prisma.payroll.create({
      data: {
        employeeId, thang: parseInt(thang), nam: parseInt(nam),
        nguonChamCong: nguonChamCong ?? "thu-cong",
        ngayCong:     parseFloat(ngayCong     ?? 0),
        ngayNghiPhep: parseFloat(ngayNghiPhep ?? 0),
        ngayNghiKhac: parseFloat(ngayNghiKhac ?? 0),
        gioLamThem:   parseFloat(gioLamThem   ?? 0),
        luongCoBan: cb, phuCap: pc, thuong: tw, luongLamThem: lt,
        khauTruBH: bh, thueTNCN: tax, khauTruKhac: kk,
        luongThucNhan, chiPhiCtyDong, tongChiPhiCty,
        trangThai: trangThai ?? "chua-tra",
        ...(ngayTra && { ngayTra: new Date(ngayTra) }),
        ghiChu: ghiChu ?? null,
      },
      include: { employee: { select: { id: true, fullName: true, code: true, departmentName: true } } },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
