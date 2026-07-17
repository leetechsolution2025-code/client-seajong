"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { motion, Variants } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DynamicTicker } from "@/components/layout/DynamicTicker";

// Dynamic import for ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// ── KPI Card Component ────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color }: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="app-card bg-card border rounded-4 shadow-sm position-relative overflow-hidden transition" style={{ minWidth: 0, padding: "10px 16px", backgroundColor: "#fff" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: color }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", opacity: 0.75 }}>{label}</p>
            <p style={{ margin: "6px 0 2px", fontSize: 20, fontWeight: 800, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
            {sub && <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>}
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${color} 10%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`bi ${icon}`} style={{ fontSize: 16, color }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QaPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const recentDefects = [
    { id: "ERR-20260716-99", product: "Sen Cây Nóng Lạnh Cao Cấp", status: "NEW", date: "16/07/2026 09:30" },
    { id: "ERR-20260716-98", product: "Vòi lavabo âm tường", status: "TECH_EVALUATING", date: "16/07/2026 08:15" },
    { id: "ERR-20260715-45", product: "Vòi bếp dây rút mạ đồng", status: "WAITING_INVENTORY", date: "15/07/2026 14:20" },
    { id: "ERR-20260715-44", product: "Sen cây truyền thống", status: "PROCESSING", date: "15/07/2026 10:05" },
  ];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; bg: string; text: string }> = {
      NEW: { label: "Mới", bg: "rgba(100, 116, 139, 0.1)", text: "#64748b" },
      TECH_EVALUATING: { label: "Đang chẩn đoán", bg: "rgba(14, 165, 233, 0.1)", text: "#0ea5e9" },
      WAITING_INVENTORY: { label: "Chờ linh kiện", bg: "rgba(245, 158, 11, 0.1)", text: "#d97706" },
      PROCESSING: { label: "Đang xử lý", bg: "rgba(59, 130, 246, 0.1)", text: "#2563eb" },
      COMPLETED: { label: "Hoàn tất", bg: "rgba(16, 185, 129, 0.1)", text: "#059669" }
    };
    const current = statusMap[status] || { label: status, bg: "rgba(100, 116, 139, 0.1)", text: "#64748b" };
    return (
      <span className="badge fw-bold" style={{ backgroundColor: current.bg, color: current.text, fontSize: 10, padding: "3px 8px", borderRadius: 99 }}>
        {current.label}
      </span>
    );
  };

  // Chart configs
  const trendOptions: any = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      zoom: { enabled: false },
      selection: { enabled: false }
    },
    colors: ['#dc2626', '#10b981'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: "#64748b", fontSize: "11px" } }
    },
    legend: { position: 'top', horizontalAlign: 'left', fontSize: "12px", labels: { colors: "var(--foreground)" } },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.15, opacityTo: 0.02, stops: [0, 100] } },
    grid: { borderColor: "rgba(100, 116, 139, 0.08)", strokeDashArray: 4 }
  };
  const trendSeries = [
    { name: 'Sản phẩm lỗi', data: [45, 52, 38, 41, 35, 28, 22, 19, 15, 20, 18, 12] },
    { name: 'SP đạt chuẩn', data: [1150, 1200, 1180, 1300, 1250, 1400, 1350, 1420, 1500, 1480, 1550, 1600] }
  ];

  const pieOptions: any = {
    chart: { type: 'donut', fontFamily: "inherit" },
    labels: ['Lỗi vật tư (BOM)', 'Lỗi kỹ thuật ráp', 'Trầy xước vỏ', 'Lỗi áp suất nước'],
    colors: ["#003087", "#0ea5e9", "#10b981", "#f59e0b"],
    stroke: { width: 2, colors: ["var(--card)"] },
    legend: { position: 'bottom', fontSize: "11px", labels: { colors: "var(--foreground)" } },
    dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: "bold" } },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Tổng số lỗi",
              fontSize: "11px",
              color: "#64748b",
              formatter: () => "100"
            }
          }
        }
      }
    }
  };
  const pieSeries = [45, 25, 20, 10];

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Đảm bảo chất lượng"
        description="Quality Assurance · Kiểm tra, tiêu chuẩn & kiểm soát lỗi"
        color="emerald"
        icon="bi-patch-check"
      />

      <DynamicTicker pageTitle="Đảm bảo chất lượng" />

      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column custom-scrollbar overflow-auto" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0, gap: 16 }}>
        <motion.div variants={container} initial="hidden" animate="show" className="d-flex flex-column" style={{ gap: 16 }}>


          {/* Charts Row */}
          <motion.div variants={item} className="d-none d-xl-grid qa-mid-grid">
            <div className="bg-card border rounded-4 p-3 d-flex flex-column h-100 shadow-sm" style={{ border: "none", backgroundColor: "#fff" }}>
              <div className="mb-2">
                <SectionTitle
                  title="Biến động chất lượng"
                  icon="bi-activity text-emerald"
                  action={
                    <button className="btn btn-sm btn-danger shadow-sm d-flex align-items-center gap-1 text-white border-0" style={{ fontSize: 11, padding: "3px 10px" }}>
                      <i className="bi bi-bar-chart-line text-white"></i>
                      KPI
                    </button>
                  }
                  className="mb-1"
                />
                <span className="text-muted d-block mt-1" style={{ fontSize: 11 }}>
                  So sánh tỷ lệ Hàng lỗi và Hàng đạt chuẩn 12 tháng qua
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 280 }}>
                {mounted && <Chart options={trendOptions} series={trendSeries} type="area" height={280} />}
              </div>
            </div>

            <div className="bg-card border rounded-4 p-3 d-flex flex-column justify-content-between h-100 shadow-sm" style={{ border: "none", backgroundColor: "#fff" }}>
              <div>
                <SectionTitle title="Phân bổ nguyên nhân lỗi" icon="bi-pie-chart text-info" className="mb-1" />
                <span className="text-muted d-block mb-3" style={{ fontSize: 11 }}>
                  Tỷ trọng các nhóm nguyên nhân gốc rễ
                </span>
              </div>
              <div className="d-flex align-items-center justify-content-center" style={{ flex: 1, minHeight: 290 }}>
                {mounted && <Chart options={pieOptions} series={pieSeries} type="donut" width="100%" height={300} />}
              </div>
            </div>
          </motion.div>

          {/* Recent Action Items */}
          <motion.div variants={item} className="qa-bottom-grid">
            <div className="bg-card border rounded-4 p-3 d-flex flex-column h-100 shadow-sm" style={{ border: "none", backgroundColor: "#fff" }}>
              <SectionTitle
                title="Hồ sơ lỗi mới nhất"
                icon="bi-list-check text-purple"
                action={
                  <Link href="/production/defects" className="text-decoration-none fw-semibold" style={{ fontSize: 11.5, color: "#10b981" }}>
                    Tất cả →
                  </Link>
                }
              />

              <div className="flex-grow-1 custom-scrollbar">
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr className="text-secondary" style={{ borderBottom: "1px solid var(--border)" }}>
                        <th className="py-2">Mã hồ sơ</th>
                        <th className="py-2">Sản phẩm</th>
                        <th className="py-2 text-center">Trạng thái</th>
                        <th className="py-2 text-end">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDefects.map(defect => (
                        <tr key={defect.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="py-2 fw-semibold text-primary">{defect.id}</td>
                          <td className="py-2 text-truncate" style={{ maxWidth: 200 }}>{defect.product}</td>
                          <td className="py-2 text-center">{getStatusBadge(defect.status)}</td>
                          <td className="py-2 text-muted text-end">{defect.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-4 p-3 d-flex flex-column h-100 shadow-sm" style={{ border: "none", backgroundColor: "#fff" }}>
              <SectionTitle
                title="Hành động khắc phục (CAPA)"
                icon="bi-tools text-orange"
                action={
                  <Link href="/qa/actions" className="text-decoration-none fw-semibold" style={{ fontSize: 11.5, color: "#10b981" }}>
                    Mở rộng →
                  </Link>
                }
              />

              <div className="flex-grow-1 overflow-auto custom-scrollbar d-flex flex-column gap-2" style={{ maxHeight: 240 }}>
                <div className="p-2 border rounded-3 bg-light/50 d-flex flex-column gap-1" style={{ fontSize: 12 }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-bold text-dark">Đào tạo lại tổ ráp</span>
                    <span className="badge fw-bold" style={{ backgroundColor: `color-mix(in srgb, #3b82f6 10%, transparent)`, color: "#3b82f6", fontSize: 9.5 }}>Đang xử lý</span>
                  </div>
                  <p className="margin-0 text-secondary" style={{ fontSize: 11.5, margin: 0 }}>Ráp nhầm gioăng cao su vòi sen</p>
                  <div className="d-flex justify-content-between text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                    <span>Phụ trách: Quản đốc</span>
                    <span>Deadline: 20/07</span>
                  </div>
                </div>

                <div className="p-2 border rounded-3 bg-light/50 d-flex flex-column gap-1" style={{ fontSize: 12 }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-bold text-dark">Làm việc với NCC Dây cấp</span>
                    <span className="badge fw-bold" style={{ backgroundColor: `color-mix(in srgb, #f59e0b 10%, transparent)`, color: "#f59e0b", fontSize: 9.5 }}>Chờ duyệt</span>
                  </div>
                  <p className="margin-0 text-secondary" style={{ fontSize: 11.5, margin: 0 }}>Giao hàng hụt kích thước</p>
                  <div className="d-flex justify-content-between text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                    <span>Phụ trách: Thu mua</span>
                    <span>Deadline: 18/07</span>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </motion.div>
      </div>

      <style>{`
        .qa-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .qa-mid-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 16px;
        }
        .qa-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .app-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .app-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.06) !important;
        }
        @media (max-width: 1200px) {
          .qa-mid-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 992px) {
          .qa-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .qa-bottom-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 576px) {
          .qa-kpi-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
