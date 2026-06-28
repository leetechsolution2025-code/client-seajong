"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";

export default function BanhangPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tiêu đề trang chuẩn hệ thống */}
      <PageHeader
        title="Bán hàng"
        description="Sale · Quản lý hoạt động bán hàng lẻ tại quầy"
        color="emerald"
        icon="bi-coin"
      />

      {/* Nội dung trang cơ bản */}
      <div style={{ padding: "2rem", flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="app-card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <i
            className="bi bi-layout-text-sidebar-reverse"
            style={{ fontSize: 40, color: "var(--muted-foreground)", opacity: 0.25, display: "block", marginBottom: 16 }}
          />
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
            Trang Tổng quan — Bán hàng
          </p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 400, margin: "0 auto" }}>
            Trang này được tạo tự động. Thêm các widget, biểu đồ hoặc danh sách để hoàn thiện dashboard cho phòng ban.
          </p>
        </div>
      </div>
    </div>
  );
}
