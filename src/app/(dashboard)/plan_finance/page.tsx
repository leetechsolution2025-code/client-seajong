"use client";

import React, { useEffect, useState } from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { Tab } from "@/components/ui/Tab";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalCustomers:      number;
  newCustomersThisYear:number;
  totalSales:          number;
  doneSales:           number;
  conversionRate:      number;
  totalExpensesPaid:   number;
  debtPhaiThu:         number;
  debtPhaiTra:         number;
  customersByMonth:    number[];
  salesByMonth:        number[];
  customersByNhom:     { label: string; value: number }[];
  customersByNguon:    { label: string; value: number }[];
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color, loading }: {
  icon: string; label: string; value: string; color: string; loading?: boolean;
}) => (
  <div style={{
    flex: 1, background: "var(--card)", borderRadius: 12, padding: "14px 16px",
    display: "flex", alignItems: "center", gap: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    minWidth: 0,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <i className={`bi ${loading ? "bi-arrow-repeat" : icon}`}
        style={{ fontSize: 18, color, animation: loading ? "spin 1s linear infinite" : "none" }} />
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "var(--foreground)", lineHeight: 1.2 }}>
        {loading ? "—" : value}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </p>
    </div>
  </div>
);

// ── Phát sinh chart (dùng PhatSinhTabs để dùng chung tab) ────────────────────
function PhatSinhChart({ customersByMonth, salesByMonth, loading }: {
  customersByMonth: number[]; salesByMonth: number[]; loading: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const [tab, setTab]                 = useState<"kh" | "hd">("kh");
  const [compare, setCompare]         = useState(false);
  const [compareYear, setCompareYear] = useState(currentYear - 1);
  const [compareData, setCompareData] = useState<{ kh: number[]; hd: number[] } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    if (!compare) { setCompareData(null); return; }
    setCompareLoading(true);
    fetch(`/api/plan-finance/stats?year=${compareYear}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d && !d.error) setCompareData({
          kh: d.customersByMonth ?? Array(12).fill(0),
          hd: d.salesByMonth     ?? Array(12).fill(0),
        });
      })
      .catch(() => {})
      .finally(() => setCompareLoading(false));
  }, [compare, compareYear]);

  const isKH      = tab === "kh";
  const colorMain = isKH ? "#f59e0b" : "#6366f1";
  const colorComp = "#94a3b8";
  const mainData  = isKH ? customersByMonth : salesByMonth;
  const compData  = isKH ? (compareData?.kh ?? []) : (compareData?.hd ?? []);

  const chartSeries = compare && compareData
    ? [
        { name: `Năm ${currentYear}`, data: mainData, color: colorMain },
        { name: `Năm ${compareYear}`, data: compData, color: colorComp },
      ]
    : [{ name: isKH ? "Khách hàng" : "Đơn bán", data: mainData, color: colorMain }];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexShrink: 0 }}>
        {/* ← Tab dùng chung */}
        <Tab
          tabs={[
            { key: "kh", label: "Phát sinh khách hàng" },
            { key: "hd", label: "Phát sinh đơn bán" },
          ]}
          active={tab}
          onChange={(k) => setTab(k as "kh" | "hd")}
        />

        {/* Controls: toggle so sánh năm */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
            <div onClick={() => setCompare(v => !v)}
              style={{ width: 28, height: 16, borderRadius: 8, position: "relative", cursor: "pointer", background: compare ? "var(--primary)" : "var(--muted)", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 3, left: compare ? 15 : 3, width: 10, height: 10, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>So sánh</span>
          </label>

          {compare && (
            <select value={compareYear} onChange={e => setCompareYear(Number(e.target.value))}
              style={{
                fontSize: 13, padding: "4px 24px 4px 10px",
                border: "1px solid var(--primary)", borderRadius: 8,
                background: "var(--card)", color: "var(--primary)",
                cursor: "pointer", appearance: "none", fontWeight: 600,
              }}>
              {Array.from({ length: 4 }, (_, i) => currentYear - 1 - i).map(y =>
                <option key={y} value={y}>So với {y}</option>
              )}
            </select>
          )}

          {compareLoading && (
            <i className="bi bi-arrow-repeat" style={{ fontSize: 14, color: "var(--muted-foreground)", animation: "spin 1s linear infinite" }} />
          )}
        </div>
      </div>

      {/* ← Chart dùng chung */}
      <YearAreaChart series={chartSeries} height={360} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlanFinancePage() {
  const year = new Date().getFullYear();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plan-finance/stats", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d && !d.error) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const fmtM = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
    return fmt(n);
  };

  const kpis = [
    { icon: "bi-people",            label: `KH mới ${year}`,        value: fmt(stats?.newCustomersThisYear ?? 0), color: "#6366f1" },
    { icon: "bi-file-earmark-text", label: `Đơn bán ${year}`,       value: fmt(stats?.totalSales         ?? 0), color: "#10b981" },
    { icon: "bi-arrow-repeat",      label: "Tỷ lệ chuyển đổi",      value: `${stats?.conversionRate ?? 0}%`,    color: "#f59e0b" },
    { icon: "bi-cash-stack",        label: "CP đã thanh toán",       value: fmtM(stats?.totalExpensesPaid ?? 0), color: "#06b6d4" },
    { icon: "bi-check-circle",      label: "Đơn hoàn thành",         value: fmt(stats?.doneSales          ?? 0), color: "#22c55e" },
    { icon: "bi-exclamation-circle",label: "Công nợ phải thu",       value: fmtM(stats?.debtPhaiThu       ?? 0), color: "#f43f5e" },
  ];

  return (
    <SplitLayoutPage
      title="Tài chính – Kinh doanh"
      description="Quản lý tài chính, kế hoạch kinh doanh và phân tích doanh thu"
      icon="bi-coin"
      color="amber"
      leftTopContent={
        <div style={{ display: "flex", gap: 12 }}>
          <KpiCard icon="bi-people"            label="Tổng khách hàng" value={fmt(stats?.totalCustomers ?? 0)} color="#6366f1" loading={loading} />
          <KpiCard icon="bi-file-earmark-text" label="Tổng đơn bán"    value={fmt(stats?.totalSales    ?? 0)} color="#10b981" loading={loading} />
        </div>
      }
      leftContent={
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <SectionTitle title="Cơ cấu khách hàng theo nhóm" />
            <BarChartHorizontal color="#6366f1"
              data={stats?.customersByNhom ?? [
                { label: "Cá nhân",       value: 0 },
                { label: "Doanh nghiệp", value: 0 },
                { label: "Đối tác",      value: 0 },
                { label: "Khách lẻ",     value: 0 },
              ]}
            />
          </div>
          <div>
            <SectionTitle title="Cơ cấu khách hàng theo nguồn" />
            <BarChartHorizontal color="#f59e0b"
              data={stats?.customersByNguon ?? [
                { label: "Tự nhiên",    value: 0 },
                { label: "Giới thiệu", value: 0 },
                { label: "Quảng cáo",  value: 0 },
                { label: "Khác",        value: 0 },
              ]}
            />
          </div>
        </div>
      }
      rightTopContent={
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {kpis.map((k) => (
            <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} color={k.color} loading={loading} />
          ))}
        </div>
      }
      rightContent={
        <PhatSinhChart
          customersByMonth={stats?.customersByMonth ?? Array(12).fill(0)}
          salesByMonth={stats?.salesByMonth ?? Array(12).fill(0)}
          loading={loading}
        />
      }
    />
  );
}
