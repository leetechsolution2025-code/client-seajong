"use client";

import React, { useState } from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";

// ── Mock data cho Hàng hoá trong kho ──────────────────────────────────────────
const INVENTORY_KPI_CARDS = [
  {
    label: "Tổng giá trị tồn kho",
    value: "3.45 tỷ",
    icon: "bi-currency-exchange",
    accent: "#10b981",
    subtitle: "Tương đương 94% sức chứa tối đa",
  },
  {
    label: "Danh mục sản phẩm",
    value: "12 nhóm hàng",
    icon: "bi-grid-fill",
    accent: "#3b82f6",
    subtitle: "Tổng số 842 SKU đang kinh doanh",
  },
  {
    label: "Cảnh báo dưới mức an toàn",
    value: "14 SKU",
    icon: "bi-exclamation-triangle-fill",
    accent: "#ef4444",
    subtitle: "Cần duyệt kế hoạch mua hàng gấp",
  },
  {
    label: "Vòng quay tồn kho (ITR)",
    value: "4.2 vòng / năm",
    icon: "bi-arrow-repeat",
    accent: "#f59e0b",
    subtitle: "+8.2% so với quý trước",
  },
];

const INBOUND_OUTBOUND_SERIES = [
  {
    name: "Giá trị nhập kho (trăm triệu)",
    data: [12.0, 15.0, 21.0, null, null, null, null, null, null, null, null, null],
    color: "#3b82f6",
  },
  {
    name: "Giá trị xuất kho (trăm triệu)",
    data: [9.0, 14.0, 18.0, null, null, null, null, null, null, null, null, null],
    color: "#10b981",
  },
];

const CATEGORY_VALUATION = [
  { name: "Thiết bị phòng tắm Seajong", amount: 1820000000, pct: "53%", color: "#10b981" },
  { name: "Thiết bị vệ sinh cao cấp", amount: 950000000, pct: "27%", color: "#3b82f6" },
  { name: "Phụ kiện nhà bếp thông minh", amount: 480000000, pct: "14%", color: "#6366f1" },
  { name: "Vật tư & Linh kiện thay thế", amount: 200000000, pct: "6%", color: "#f59e0b" },
];

const RESTOCK_ALERTS = [
  { name: "Bồn cầu thông minh Seajong S-200", code: "SKU-S200", current: 2, safety: 10, propose: 15, level: "Critical" },
  { name: "Vòi sen đứng nóng lạnh Seajong V-10", code: "SKU-V10", current: 4, safety: 15, propose: 20, level: "Critical" },
  { name: "Chậu rửa Lavabo đặt bàn L-40", code: "SKU-L40", current: 8, safety: 20, propose: 25, level: "Warning" },
  { name: "Phụ kiện móc áo inox 304 M-01", code: "SKU-M01", current: 12, safety: 50, propose: 50, level: "Warning" },
];

function CategoryValuationBreakdown() {
  const formatBillion = (val: number) => {
    return (val / 1e9).toFixed(2) + " tỷ VNĐ";
  };

  return (
    <div className="d-flex flex-column gap-3">
      {CATEGORY_VALUATION.map((item, idx) => (
        <div key={idx}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{item.name}</span>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{formatBillion(item.amount)}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: `${item.color}15`, color: item.color, fontWeight: 700 }}>
                {item.pct}
              </span>
            </div>
          </div>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: item.pct,
              background: item.color,
              borderRadius: 99,
              transition: "width 1s ease"
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BoardInventoryPage() {
  const [alertFilter, setAlertFilter] = useState<"All" | "Critical" | "Warning">("All");

  const filteredAlerts = RESTOCK_ALERTS.filter(alert => alertFilter === "All" || alert.level === alertFilter);

  return (
    <SplitLayoutPage
      title="Hàng hoá trong kho"
      description="Ban Giám đốc · Giám sát giá trị lưu kho, phân tích luân chuyển xuất nhập kho và lập kế hoạch tái nhập hàng"
      icon="bi-boxes"
      color="emerald"
      leftCols={5}
      leftTopContent={
        <div className="row g-3">
          {INVENTORY_KPI_CARDS.map((kpi) => (
            <KPICard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              accent={kpi.accent}
              subtitle={kpi.subtitle}
              colClass="col-6"
            />
          ))}
        </div>
      }
      leftContent={
        <div>
          <SectionTitle title="Cơ cấu giá trị kho theo nhóm hàng" className="mb-4" />
          <CategoryValuationBreakdown />
        </div>
      }
      rightContent={
        <div className="p-4 d-flex flex-column gap-4" style={{ height: "100%", overflowY: "auto" }}>
          <div>
            <SectionTitle title="Biến động giá trị xuất nhập kho theo tháng (Q1 - 2026)" className="mb-3" />
            <YearAreaChart series={INBOUND_OUTBOUND_SERIES} height={250} unit="" />
          </div>

          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <SectionTitle title="Danh sách sản phẩm chạm mức cảnh báo" />
              <div className="btn-group border rounded" style={{ padding: 2, background: "var(--muted)" }}>
                {(["All", "Critical", "Warning"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setAlertFilter(level)}
                    style={{
                      border: "none",
                      background: alertFilter === level ? "var(--card)" : "transparent",
                      color: alertFilter === level ? "var(--foreground)" : "var(--muted-foreground)",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    {level === "All" ? "Tất cả" : level === "Critical" ? "Khẩn cấp" : "Chú ý"}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-responsive border rounded overflow-hidden">
              <table className="table table-hover table-borderless align-middle mb-0" style={{ fontSize: 13 }}>
                <thead style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                  <tr>
                    <th className="py-3 px-3">Tên sản phẩm</th>
                    <th className="py-3 text-center">Tồn hiện tại</th>
                    <th className="py-3 text-center">Tồn an toàn</th>
                    <th className="py-3 text-center">Đề xuất nhập</th>
                    <th className="py-3 text-center">Mức độ cảnh báo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert, idx) => (
                    <tr key={idx} className="border-bottom" style={{ borderColor: "var(--border)" }}>
                      <td className="py-3 px-3 fw-semibold">
                        {alert.name}
                        <div style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)" }}>{alert.code}</div>
                      </td>
                      <td className="py-3 text-center fw-bold text-danger">{alert.current} cái</td>
                      <td className="py-3 text-center fw-medium text-secondary">{alert.safety} cái</td>
                      <td className="py-3 text-center fw-bold text-success">+{alert.propose} cái</td>
                      <td className="py-3 text-center">
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: alert.level === "Critical" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                          color: alert.level === "Critical" ? "#ef4444" : "#f59e0b"
                        }}>
                          {alert.level === "Critical" ? "Khẩn cấp" : "Cần chú ý"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    />
  );
}
