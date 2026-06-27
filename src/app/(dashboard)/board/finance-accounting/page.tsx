"use client";

import React, { useState } from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";

// ── Mock data cho Tài chính kế toán ───────────────────────────────────────────
const FINANCE_KPI_CARDS = [
  {
    label: "Doanh thu lũy kế",
    value: "14.2 tỷ",
    icon: "bi-graph-up",
    accent: "#10b981",
    subtitle: "+12.5% so với kế hoạch",
  },
  {
    label: "Chi phí vận hành",
    value: "9.8 tỷ",
    icon: "bi-arrow-down-circle-fill",
    accent: "#ef4444",
    subtitle: "Kiểm soát ở mức 69% định mức",
  },
  {
    label: "Quỹ tiền mặt & Ngân hàng",
    value: "4.82 tỷ",
    icon: "bi-bank2",
    accent: "#3b82f6",
    subtitle: "Dòng tiền thuần dương (+15.4%)",
  },
  {
    label: "Công nợ phải thu",
    value: "1.55 tỷ",
    icon: "bi-journal-check",
    accent: "#f59e0b",
    subtitle: "Trung bình thu hồi: 18 ngày",
  },
];

const REVENUE_EXPENSE_SERIES = [
  {
    name: "Doanh thu (tỷ đồng)",
    data: [3.8, 4.2, 6.2, null, null, null, null, null, null, null, null, null],
    color: "#10b981",
  },
  {
    name: "Chi phí (tỷ đồng)",
    data: [2.9, 3.1, 3.8, null, null, null, null, null, null, null, null, null],
    color: "#ef4444",
  },
  {
    name: "Lợi nhuận gộp",
    data: [0.9, 1.1, 2.4, null, null, null, null, null, null, null, null, null],
    color: "#3b82f6",
  },
];

const OPEX_STRUCTURE = [
  { name: "Giá vốn hàng bán (COGS)", amount: 6200000000, pct: "63%", color: "#10b981" },
  { name: "Chi phí nhân sự", amount: 2100000000, pct: "21%", color: "#3b82f6" },
  { name: "Chi phí Marketing & Bán hàng", amount: 850000000, pct: "9%", color: "#6366f1" },
  { name: "Chi phí quản lý hành chính", amount: 450000000, pct: "5%", color: "#f59e0b" },
  { name: "Khấu hao tài sản & Khác", amount: 200000000, pct: "2%", color: "#94a3b8" },
];

const OUTSTANDING_DEBTS = [
  { name: "Khách sạn Royal Plaza - Đà Nẵng", type: "receivable", amount: 850000000, dueDays: -5, status: "Overdue" },
  { name: "Công ty Vật liệu xây dựng Hùng Phát", type: "receivable", amount: 420000000, dueDays: 12, status: "Pending" },
  { name: "Nhà cung cấp phụ tùng Seajong Inc", type: "payable", amount: 680000000, dueDays: 8, status: "Pending" },
  { name: "Đơn vị vận chuyển Logistics Việt - Á", type: "payable", amount: 150000000, dueDays: 20, status: "Pending" },
];

function OpexBreakdown() {
  const formatBillion = (val: number) => {
    return (val / 1e9).toFixed(2) + " tỷ VNĐ";
  };

  return (
    <div className="d-flex flex-column gap-3">
      {OPEX_STRUCTURE.map((item, idx) => (
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

export default function BoardFinanceAccountingPage() {
  const [debtTab, setDebtTab] = useState<"all" | "receivable" | "payable">("all");

  const filteredDebts = OUTSTANDING_DEBTS.filter(d => {
    if (debtTab === "all") return true;
    return d.type === debtTab;
  });

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("vi-VN") + " đ";
  };

  return (
    <SplitLayoutPage
      title="Tài chính kế toán"
      description="Ban Giám đốc · Giám sát cơ cấu chi phí doanh nghiệp, doanh thu, quỹ tiền mặt và quản trị công nợ tồn đọng"
      icon="bi-cash-stack"
      color="rose"
      leftCols={5}
      leftTopContent={
        <div className="row g-3">
          {FINANCE_KPI_CARDS.map((kpi) => (
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
          <SectionTitle title="Cơ cấu chi phí vận hành (OPEX)" className="mb-4" />
          <OpexBreakdown />
        </div>
      }
      rightContent={
        <div className="p-4 d-flex flex-column gap-4" style={{ height: "100%", overflowY: "auto" }}>
          <div>
            <SectionTitle title="Diễn biến thu chi & Dòng tiền luỹ kế (Q1 - 2026)" className="mb-3" />
            <YearAreaChart series={REVENUE_EXPENSE_SERIES} height={250} unit="" />
          </div>

          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <SectionTitle title="Giám sát công nợ trọng điểm" />
              <div className="btn-group border rounded" style={{ padding: 2, background: "var(--muted)" }}>
                {(["all", "receivable", "payable"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDebtTab(tab)}
                    style={{
                      border: "none",
                      background: debtTab === tab ? "var(--card)" : "transparent",
                      color: debtTab === tab ? "var(--foreground)" : "var(--muted-foreground)",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    {tab === "all" ? "Tất cả" : tab === "receivable" ? "Phải thu" : "Phải trả"}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-responsive border rounded overflow-hidden">
              <table className="table table-hover table-borderless align-middle mb-0" style={{ fontSize: 13 }}>
                <thead style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                  <tr>
                    <th className="py-3 px-3">Đối tác / Khách hàng</th>
                    <th className="py-3 text-center">Phân loại</th>
                    <th className="py-3 text-end">Số tiền</th>
                    <th className="py-3 text-center">Hạn thanh toán</th>
                    <th className="py-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDebts.map((debt, idx) => (
                    <tr key={idx} className="border-bottom" style={{ borderColor: "var(--border)" }}>
                      <td className="py-3 px-3 fw-semibold">{debt.name}</td>
                      <td className="py-3 text-center">
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: debt.type === "receivable" ? "rgba(59,130,246,0.12)" : "rgba(245,158,11,0.12)",
                          color: debt.type === "receivable" ? "#3b82f6" : "#f59e0b"
                        }}>
                          {debt.type === "receivable" ? "Phải thu (KH)" : "Phải trả (NCC)"}
                        </span>
                      </td>
                      <td className="py-3 text-end fw-bold" style={{ color: debt.type === "receivable" ? "var(--foreground)" : "#ef4444" }}>
                        {formatCurrency(debt.amount)}
                      </td>
                      <td className="py-3 text-center fw-medium">
                        {debt.dueDays < 0 ? (
                          <span style={{ color: "#ef4444", fontWeight: 700 }}>
                            Quá hạn {-debt.dueDays} ngày
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted-foreground)" }}>
                            Còn {debt.dueDays} ngày
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: debt.status === "Overdue" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.15)",
                          color: debt.status === "Overdue" ? "#ef4444" : "var(--muted-foreground)"
                        }}>
                          {debt.status === "Overdue" ? "Yêu cầu thu hồi" : "Chờ thanh toán"}
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
