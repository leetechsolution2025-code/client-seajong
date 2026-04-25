import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/plan-finance/expenses/stats
 * - KPI: tổng theo trạng thái
 * - byParentMonth: 3 series (nhóm cha) × 12 tháng cho line chart
 * - byLoai: tổng theo loại con cho bar chart
 * - autoSync: chi phí từ PurchaseOrder
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const queryYear = parseInt(searchParams.get("year") ?? "0");
    const now   = new Date();
    const y     = queryYear > 2000 ? queryYear : now.getFullYear();
    const start = new Date(`${y}-01-01`);
    const end   = new Date(`${y + 1}-01-01`);

    // ── Load all expense_type categories (cha + con) ──────────────────────────
    const allCats = await prisma.category.findMany({
      where: { type: "expense_type", isActive: true },
      select: { id: true, code: true, name: true, parentId: true, color: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const parents  = allCats.filter(c => !c.parentId);
    const children = allCats.filter(c =>  c.parentId);

    // map: child.code → parent.id
    const codeToParentId: Record<string, string> = {};
    for (const c of children) {
      if (c.parentId) codeToParentId[c.code] = c.parentId;
    }
    // map: child.code → child.name (cho bar chart)
    const codeToName: Record<string, string> = {};
    for (const c of children) codeToName[c.code] = c.name;

    const [
      allExpenses,
      expensesByMonthRaw,
      expensesByLoai,
      purchaseOrdersPaid,
      purchaseCostByMonth,
    ] = await Promise.all([
      // KPI: group theo trạng thái — toàn bộ thời gian
      prisma.expense.groupBy({
        by: ["trangThai"],
        _sum: { soTien: true },
        _count: { id: true },
      }),

      // Chi phí trong năm kèm loai (để phân nhóm cha)
      prisma.expense.findMany({
        where: {
          trangThai: { not: "rejected" },
          ngayChiTra: { gte: start, lt: end },
        },
        select: { ngayChiTra: true, soTien: true, loai: true },
      }),

      // Tổng theo loại con — approved + paid (bar chart)
      prisma.expense.groupBy({
        by: ["loai"],
        where: { trangThai: { in: ["approved", "paid"] } },
        _sum: { soTien: true },
        _count: { id: true },
        orderBy: { _sum: { soTien: "desc" } },
      }),

      // Auto-sync: PO đã thanh toán trong năm
      prisma.purchaseOrder.aggregate({
        where: { daThanhToan: { gt: 0 }, createdAt: { gte: start, lt: end } },
        _sum: { daThanhToan: true },
        _count: { id: true },
      }),

      // Auto-sync: PO by month
      prisma.purchaseOrder.findMany({
        where: { daThanhToan: { gt: 0 }, createdAt: { gte: start, lt: end } },
        select: { createdAt: true, daThanhToan: true },
      }),
    ]);

    // ── KPI aggregation ────────────────────────────────────────────────────────
    const kpi = {
      tongTatCa: 0,
      pending: 0, approved: 0, paid: 0, rejected: 0,
      countPending: 0, countApproved: 0, countPaid: 0, countRejected: 0,
    };
    for (const row of allExpenses) {
      const sum = row._sum.soTien ?? 0;
      kpi.tongTatCa += sum;
      if (row.trangThai === "pending")  { kpi.pending  = sum; kpi.countPending  = row._count.id; }
      if (row.trangThai === "approved") { kpi.approved = sum; kpi.countApproved = row._count.id; }
      if (row.trangThai === "paid")     { kpi.paid     = sum; kpi.countPaid     = row._count.id; }
      if (row.trangThai === "rejected") { kpi.rejected = sum; kpi.countRejected = row._count.id; }
    }

    // ── 3 series theo nhóm cha × 12 tháng ────────────────────────────────────
    const parentMonthMap: Record<string, number[]> = {};
    for (const p of parents) parentMonthMap[p.id] = Array(12).fill(0);
    const ungroupedByMonth = Array(12).fill(0);

    for (const e of expensesByMonthRaw) {
      if (!e.ngayChiTra) continue;
      const m = new Date(e.ngayChiTra).getMonth();
      const parentId = e.loai ? codeToParentId[e.loai] : undefined;
      if (parentId && parentMonthMap[parentId]) {
        parentMonthMap[parentId][m] += e.soTien;
      } else {
        ungroupedByMonth[m] += e.soTien;
      }
    }

    // Fallback colors nếu category chưa có màu
    const FALLBACK_COLORS = ["#f59e0b", "#6366f1", "#f43f5e", "#10b981", "#06b6d4"];
    const byParentMonth = parents.map((p, i) => ({
      parentId:    p.id,
      name:        p.name,
      color:       p.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      dataByMonth: parentMonthMap[p.id],
    }));

    // Tổng tháng (cho KPI cards)
    const totalByMonth = Array(12).fill(0);
    for (let m = 0; m < 12; m++) {
      for (const p of parents) totalByMonth[m] += parentMonthMap[p.id][m];
      totalByMonth[m] += ungroupedByMonth[m];
    }

    const tongChiPhiNam  = totalByMonth.reduce((s, v) => s + v, 0);
    const chiPhiThangNay = totalByMonth[now.getMonth()] ?? 0;

    // ── Auto-sync PO cost by month ─────────────────────────────────────────────
    const purchaseByMonth = Array(12).fill(0);
    for (const po of purchaseCostByMonth) {
      const m = new Date(po.createdAt).getMonth();
      purchaseByMonth[m] += po.daThanhToan;
    }

    // ── Bar chart: theo loại con ───────────────────────────────────────────────
    const byLoai = expensesByLoai.map(row => ({
      loai:   row.loai ?? "khac",
      label:  codeToName[row.loai ?? ""] ?? row.loai ?? "Khác",
      soTien: row._sum.soTien ?? 0,
      count:  row._count.id,
    }));

    return NextResponse.json({
      kpi,
      tongChiPhiNam,
      chiPhiThangNay,
      byParentMonth,    // 3 series cho line chart
      purchaseByMonth,
      byLoai,
      year: y,
      autoSync: {
        purchaseOrdersPaid: purchaseOrdersPaid._sum.daThanhToan ?? 0,
        countPO:            purchaseOrdersPaid._count.id ?? 0,
      },
    });
  } catch (e: unknown) {
    console.error("[GET /expenses/stats]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
