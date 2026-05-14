import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 10 loại hệ thống mặc định
const SYSTEM_TYPES = [
  { value: "expense_type",    label: "Loại chi phí",                    icon: "bi-receipt",             color: "#f59e0b", prefix: "EXP", sortOrder: 0 },
  { value: "asset_type",      label: "Loại tài sản",                    icon: "bi-building-gear",        color: "#06b6d4", prefix: "AST", sortOrder: 1 },
  { value: "customer_group",  label: "Nhóm khách hàng",                 icon: "bi-people",               color: "#3b82f6", prefix: "KHG", sortOrder: 2 },
  { value: "customer_source", label: "Nguồn khách hàng",                icon: "bi-search-heart",         color: "#8b5cf6", prefix: "NGN", sortOrder: 3 },
  { value: "payment_method",  label: "Hình thức thanh toán",            icon: "bi-credit-card-2-front",  color: "#10b981", prefix: "TTT", sortOrder: 4 },
  { value: "inventory_type",  label: "Loại hàng hoá",                   icon: "bi-box-seam",             color: "#f43f5e", prefix: "HHG", sortOrder: 5 },
  { value: "work_shift",      label: "Ca làm việc",                     icon: "bi-clock-history",        color: "#6366f1", prefix: "CAS", sortOrder: 6 },
  { value: "position",        label: "Chức danh và vị trí",             icon: "bi-person-badge",         color: "#ef4444", prefix: "VTR", sortOrder: 7 },
  { value: "care_method",     label: "Hình thức chăm sóc khách hàng",   icon: "bi-chat-heart",           color: "#22d3ee", prefix: "CSK", sortOrder: 8 },
  { value: "contract_type",   label: "Loại hợp đồng lao động",          icon: "bi-file-earmark-text",    color: "#a78bfa", prefix: "HDL", sortOrder: 9 },
];

// GET /api/board/category-types — trả về tất cả types (system + custom)
export async function GET() {
  try {
    // Sync system types (upsert cả update để label/icon luôn đúng)
    await Promise.all(
      SYSTEM_TYPES.map(t =>
        prisma.categoryTypeDef.upsert({
          where: { value: t.value },
          create: { ...t, isSystem: true },
          update: { label: t.label, icon: t.icon, color: t.color, prefix: t.prefix, sortOrder: t.sortOrder },
        })
      )
    );


    const types = await prisma.categoryTypeDef.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    return NextResponse.json(types);
  } catch (e) {
    console.error("[GET /api/board/category-types]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/board/category-types — thêm loại mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { value, label, icon, color, prefix, sortOrder } = body;
    if (!value || !label || !prefix) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    const existing = await prisma.categoryTypeDef.findUnique({ where: { value } });
    if (existing) return NextResponse.json({ error: "Giá trị (value) đã tồn tại" }, { status: 409 });

    const row = await prisma.categoryTypeDef.create({
      data: {
        value: value.toLowerCase().replace(/\s+/g, "_"),
        label, icon: icon || "bi-folder", color: color || "#6366f1",
        prefix: prefix.toUpperCase(), sortOrder: sortOrder ?? 0, isSystem: false,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
