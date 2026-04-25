import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now        = new Date();
    const yearStart  = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── KPI ─────────────────────────────────────────────────────────────────────
    const [ordersYear, ordersMonth, reqAll, ordAll] = await Promise.all([
      prisma.purchaseOrder.aggregate({
        where: { createdAt: { gte: yearStart }, trangThai: { notIn: ["cancelled"] } },
        _sum: { tongTien: true },
      }),
      prisma.purchaseOrder.aggregate({
        where: { createdAt: { gte: monthStart }, trangThai: { notIn: ["cancelled"] } },
        _sum: { tongTien: true },
      }),
      // Phân bổ trạng thái đơn mua
      prisma.purchaseOrder.groupBy({
        by: ["trangThai"],
        _count: { id: true },
        where: { trangThai: { notIn: ["cancelled"] } },
      }),
      // Phân bổ trạng thái yêu cầu
      prisma.purchaseRequest.groupBy({
        by: ["trangThai"],
        _count: { id: true },
      }),
    ]);

    // ── Label maps và thứ tự cố định ────────────────────────────────────────────
    const ORD_LIST = [
      { value: "draft",    label: "Bản nháp" },
      { value: "pending",  label: "Chờ duyệt" },
      { value: "ordered",  label: "Hàng đang về" },
      { value: "received", label: "Đã nhận hàng" },
      { value: "disputed", label: "Đang khiếu nại" },
    ];
    const REQ_LIST = [
      { value: "chua-xu-ly", label: "Chưa xử lý" },
      { value: "dang-xu-ly", label: "Đang xử lý" },
      { value: "da-xu-ly",   label: "Đã xử lý" },
      { value: "tu-choi",    label: "Từ chối" },
    ];

    // Merge với groupBy → luôn đủ nhãn, kể cả count = 0
    const ordMap  = Object.fromEntries(ordAll.map(r => [r.trangThai, r._count.id]));
    const reqMap  = Object.fromEntries(reqAll.map(r => [r.trangThai, r._count.id]));

    const trangThaiDon    = ORD_LIST.map(({ value, label }) => ({ label, value: ordMap[value] ?? 0 }));
    const trangThaiYeuCau = REQ_LIST.map(({ value, label }) => ({ label, value: reqMap[value] ?? 0 }));

    return NextResponse.json({
      tongChiPhiNam:  ordersYear._sum.tongTien  ?? 0,
      chiPhiThang:    ordersMonth._sum.tongTien ?? 0,
      trangThaiDon,
      trangThaiYeuCau,
    });
  } catch (e: unknown) {
    console.error("[GET /purchasing/stats]", e);
    return NextResponse.json({
      tongChiPhiNam: 0, chiPhiThang: 0,
      trangThaiDon: [], trangThaiYeuCau: [],
    });
  }
}
