import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

// GET /api/admin/departments — Lấy toàn bộ danh mục
export async function GET() {
  const departments = await prisma.departmentCategory.findMany({
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json(departments);
}

// ── Template trang Tổng quan cho phòng ban mới ───────────────────────────
function genPageTemplate(code: string, nameVi: string, nameEn: string, icon: string) {
  return `"use client";

import React from "react";

export default function ${toPascalCase(code)}Page() {
  return (
    <div style={{ padding: "32px 32px 64px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="bi ${icon || "bi-building"}" style={{ fontSize: 20, color: "var(--primary)" }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)" }}>
              ${nameVi}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>${nameEn}</p>
          </div>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="app-card" style={{ padding: "48px 32px", textAlign: "center" }}>
        <i className="bi bi-layout-text-sidebar-reverse"
          style={{ fontSize: 40, color: "var(--muted-foreground)", opacity: 0.25, display: "block", marginBottom: 16 }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
          Trang Tổng quan — ${nameVi}
        </p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 400, margin: "0 auto" }}>
          Trang này được tạo tự động. Thêm các widget, biểu đồ hoặc danh sách để hoàn thiện dashboard cho phòng ban.
        </p>
      </div>
    </div>
  );
}
`;
}

function toPascalCase(str: string): string {
  return str.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
}

/** Tạo thư mục và file page.tsx cho phòng ban mới */
function scaffoldDeptPages(code: string, nameVi: string, nameEn: string, icon: string): string[] {
  const created: string[] = [];
  try {
    // Tìm root project
    const root = process.cwd();
    const deptDir = path.join(root, "src", "app", "(dashboard)", code);

    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(deptDir)) {
      fs.mkdirSync(deptDir, { recursive: true });
    }

    // Tạo page.tsx nếu chưa có
    const pagePath = path.join(deptDir, "page.tsx");
    if (!fs.existsSync(pagePath)) {
      fs.writeFileSync(pagePath, genPageTemplate(code, nameVi, nameEn, icon), "utf-8");
      created.push(`src/app/(dashboard)/${code}/page.tsx`);
    }
  } catch (e) {
    console.error("[scaffoldDeptPages] Lỗi tạo file:", e);
  }
  return created;
}

// POST /api/admin/departments — Tạo mới
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, nameVi, nameEn, group, icon, description, sortOrder } = body;

  if (!code || !nameVi || !nameEn || !group) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }

  // Code phải là slug hợp lệ
  if (!/^[a-z0-9_]+$/.test(code)) {
    return NextResponse.json({ error: "Mã định danh chỉ gồm chữ thường, số và dấu gạch dưới." }, { status: 400 });
  }

  try {
    const dept = await prisma.departmentCategory.create({
      data: {
        code: code.trim().toLowerCase(),
        nameVi: nameVi.trim(),
        nameEn: nameEn.trim(),
        group: group.trim(),
        icon: icon?.trim() || null,
        description: description?.trim() || null,
        sortOrder: sortOrder ? Number(sortOrder) : 0,
      },
    });

    // ── Tự động tạo trang cơ bản ──
    const scaffolded = scaffoldDeptPages(dept.code, dept.nameVi, dept.nameEn, dept.icon || "bi-building");

    return NextResponse.json({ ...dept, scaffolded }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Mã định danh đã tồn tại." }, { status: 409 });
    }
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 });
  }
}


