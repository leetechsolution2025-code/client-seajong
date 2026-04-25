import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const thang = parseInt(searchParams.get("thang") ?? "0");
    const nam   = parseInt(searchParams.get("nam")   ?? "0");

    const where: Record<string, unknown> = {};
    if (thang > 0) where.thang = thang;
    if (nam   > 0) where.nam   = nam;

    const [agg, byDept, byTT] = await Promise.all([
      prisma.payroll.aggregate({
        where,
        _count: { id: true },
        _sum: { luongThucNhan: true, tongChiPhiCty: true, khauTruBH: true, thueTNCN: true },
      }),
      // Theo phòng ban
      prisma.payroll.groupBy({
        by: ["employeeId"],
        where,
        _sum: { tongChiPhiCty: true },
        _count: { id: true },
      }),
      // Theo trạng thái
      prisma.payroll.groupBy({
        by: ["trangThai"],
        where,
        _count: { id: true },
        _sum: { luongThucNhan: true },
      }),
    ]);

    const TT_LIST = [
      { value: "chua-tra", label: "Chưa trả" },
      { value: "da-tra",   label: "Đã trả" },
      { value: "tam-ung",  label: "Tạm ứng" },
    ];
    const ttMap = Object.fromEntries(byTT.map(r => [r.trangThai, { count: r._count.id, sum: r._sum.luongThucNhan ?? 0 }]));

    return NextResponse.json({
      tongNhanVien:   agg._count.id,
      tongLuongThucNhan: agg._sum.luongThucNhan  ?? 0,
      tongChiPhiCty:     agg._sum.tongChiPhiCty  ?? 0,
      tongBH:            agg._sum.khauTruBH       ?? 0,
      tongThueTNCN:      agg._sum.thueTNCN        ?? 0,
      byTrangThai: TT_LIST.map(({ value, label }) => ({
        label, value: ttMap[value]?.count ?? 0,
      })),
    });
  } catch (e: unknown) {
    console.error("[GET /payroll/stats]", e);
    return NextResponse.json({
      tongNhanVien: 0, tongLuongThucNhan: 0, tongChiPhiCty: 0,
      tongBH: 0, tongThueTNCN: 0, byTrangThai: [],
    });
  }
}
