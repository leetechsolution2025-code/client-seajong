"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DynamicTicker } from "@/components/layout/DynamicTicker";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DashboardData {
  summary: {
    totalRevenue: number;
    targetRevenue: number;
    totalOrdersCount: number;
    totalDebt: number;
    customersCount: number;
    dealersCount: number;
  };
  monthlyTrends: {
    month: string;
    target: number;
    actual: number | null;
  }[];
}

// ── KPI Card Component ────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color, progress }: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  color: string;
  progress?: { cur: number; max: number };
}) {
  const pct = progress && progress.max > 0 ? Math.round((progress.cur / progress.max) * 100) : null;
  return (
    <div className="app-card bg-card border rounded-4 shadow-sm position-relative overflow-hidden transition h-100" style={{ minWidth: 0, padding: "14px 16px" }}>
      {/* Brand accent vertical bar */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: color }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", opacity: 0.75 }}>{label}</p>
            <p style={{ margin: "4px 0 2px", fontSize: 17, fontWeight: 800, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
            {sub && <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>}
          </div>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${color} 10%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`bi ${icon}`} style={{ fontSize: 14, color }} />
          </div>
        </div>
        {pct !== null && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 9.5 }}>
              <span className="text-secondary">Tiến độ chỉ tiêu</span>
              <span className="fw-bold" style={{ color }}>{pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "rgba(0,0,0,0.05)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BusinessResultsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [partnersCountThisMonth, setPartnersCountThisMonth] = useState<number>(0);
  const [hidePlan, setHidePlan] = useState<boolean>(true);

  useEffect(() => {
    const ts = Date.now();
    fetch(`/api/sales/dashboard?_t=${ts}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading business results data:", err);
        setLoading(false);
      });

    fetch(`/api/sales/partners?_t=${ts}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          const currentMonthStr = `${yyyy}-${mm}`;
          const count = data.filter((p: any) => p.date && p.date.startsWith(currentMonthStr)).length;
          setPartnersCountThisMonth(count);
        }
      })
      .catch((err) => {
        console.error("Error loading partners for KPI card:", err);
      });
  }, []);

  if (loading) {
    return (
      <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
        <PageHeader title="Kết quả kinh doanh" description="Báo cáo tổng hợp doanh thu và tiến độ hoàn thành chỉ tiêu" color="blue" icon="bi-graph-up-arrow" />
        <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted">
          <div className="d-flex flex-column align-items-center gap-2">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
            <span style={{ fontSize: 13 }}>Đang tải báo cáo kết quả kinh doanh...</span>
          </div>
        </div>
      </div>
    );
  }

  // Raw data from dashboard API with fallbacks
  const apiSummary = data?.summary || { totalRevenue: 0, targetRevenue: 0, totalOrdersCount: 0, totalDebt: 0, customersCount: 0, dealersCount: 0 };
  const apiTrends = data?.monthlyTrends || Array.from({ length: 12 }, (_, i) => ({ month: `Tháng ${i + 1}`, target: 0, actualRevenue: (i + 1) > (new Date().getMonth() + 1) ? null : 0 }));

  const targetRevenue = apiSummary.targetRevenue || 0;
  const totalRevenue = apiSummary.totalSales || apiSummary.totalRevenue || 0;

  // Calculate achievement percentage
  const achievementRate = targetRevenue > 0 ? Math.round((totalRevenue / targetRevenue) * 100) : (totalRevenue > 0 ? 100 : 0);

  // Average Order Value
  const avgOrderVal = apiSummary.totalOrdersCount > 0 ? Math.round(totalRevenue / apiSummary.totalOrdersCount) : 0;

  // Use real data from API for monthly trends
  const monthlyTrends = apiTrends.map((t: any) => {
    const targetVal = t.target || 0;
    
    // Ưu tiên actual (doanh số thực tế đạt được), fallback sang actualSales, cuối cùng là actualRevenue
    const actualVal = (t.actual !== undefined && t.actual !== null) 
      ? t.actual 
      : ((t.actualSales !== undefined && t.actualSales !== null) 
          ? t.actualSales 
          : (t.actualRevenue !== undefined ? t.actualRevenue : null));
    
    return {
      month: t.month,
      target: targetVal,
      actual: actualVal,
      seajongSales: t.seajongSales !== undefined ? t.seajongSales : (actualVal || 0),
      otherSales: t.otherSales !== undefined ? t.otherSales : 0,
      achievement: (actualVal !== null && targetVal > 0) ? Math.round((actualVal / targetVal) * 100) : (actualVal > 0 && targetVal === 0 ? 100 : 0)
    };
  });

  // Calculate profit margin (currently not provided by API, default to 0)
  const profitMargin = 0;
  const profitValue = 0;

  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  const currentMonthTrend = monthlyTrends[currentMonthIdx] || { target: 0, actual: 0 };
  const currentMonthRevenue = currentMonthTrend.actual ?? 0;
  const currentMonthTarget = currentMonthTrend.target;
  const mmYYYY = `${String(currentMonthIdx + 1).padStart(2, "0")}-${currentYear}`;

  const currentMonthLabel = `Doanh thu tháng | ${mmYYYY}`;
  const currentMonthDealersLabel = `Phát triển đại lý | ${mmYYYY}`;

  // 6 tháng gần nhất cho biểu đồ cột
  const recent6Months = monthlyTrends.slice(Math.max(0, currentMonthIdx - 5), currentMonthIdx + 1);

  // Danh sách các tháng trong bảng: chỉ hiển thị đến tháng hiện tại, sắp xếp giảm dần (tháng 1 xuống dưới cùng)
  const tableMonthlyTrends = monthlyTrends
    .slice(0, currentMonthIdx + 1)
    .map((t: any, idx: number) => ({
      ...t,
      isCurrentMonth: idx === currentMonthIdx
    }))
    .reverse();

  // Category Distribution from DB API
  const apiCategoryBreakdown = data?.categoryBreakdown || [];
  const categoriesData = apiCategoryBreakdown.length > 0 ? {
    labels: apiCategoryBreakdown.map((c: any) => c.name),
    series: apiCategoryBreakdown.map((c: any) => c.value)
  } : {
    labels: ["Chưa có dữ liệu"],
    series: [1]
  };

  // Region Distribution from DB API
  const apiRegionBreakdown = data?.regionBreakdown || [];
  const regionData = apiRegionBreakdown.length > 0 ? {
    categories: apiRegionBreakdown.map((r: any) => r.name),
    series: apiRegionBreakdown.map((r: any) => r.value)
  } : {
    categories: ["Miền Bắc", "Miền Trung", "Miền Nam"],
    series: [0, 0, 0]
  };

  // Apex Charts Configurations - Bar chart 6 tháng gần nhất
  const revenueTrendChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      height: 320,
      stacked: !hidePlan,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
      background: "transparent",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: hidePlan ? "45%" : "48%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    colors: hidePlan ? ["#10b981", "#f59e0b"] : ["#003087", "#10b981", "#f59e0b"],
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: recent6Months.map((t: any) => t.month),
      labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: 600 } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "11px" },
        formatter: (val: number) => {
          if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} Tỷ`;
          if (val >= 1000000) return `${(val / 1000000).toFixed(0)} Tr`;
          return val.toLocaleString("vi-VN");
        },
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      labels: { colors: "var(--foreground)" },
    },
    grid: { borderColor: "rgba(100, 116, 139, 0.08)", strokeDashArray: 4 },
    tooltip: {
      theme: "light",
      shared: true,
      intersect: false,
      y: {
        formatter: (val: number) => val === null || val === undefined ? "—" : `${val.toLocaleString("vi-VN")} đ`,
      },
    },
  };

  const revenueTrendSeries = hidePlan ? [
    {
      name: "Doanh thu Seajong",
      data: recent6Months.map((t: any) => t.seajongSales || 0),
    },
    {
      name: "Hàng khác (OEM)",
      data: recent6Months.map((t: any) => t.otherSales || 0),
    },
  ] : [
    {
      name: "Kế hoạch",
      group: "ke_hoach",
      data: recent6Months.map((t: any) => t.target || 0),
    },
    {
      name: "Thực tế: Hàng Seajong",
      group: "thuc_te",
      data: recent6Months.map((t: any) => t.seajongSales || 0),
    },
    {
      name: "Thực tế: Hàng khác",
      group: "thuc_te",
      data: recent6Months.map((t: any) => t.otherSales || 0),
    },
  ];

  const categoryPieOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "inherit",
    },
    labels: categoriesData.labels,
    colors: ["#003087", "#0ea5e9", "#10b981", "#f59e0b", "#64748b"],
    stroke: { width: 2, colors: ["var(--card)"] },
    legend: {
      position: "bottom",
      fontSize: "12px",
      labels: { colors: "var(--foreground)" },
    },
    dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: "bold" } },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Tổng doanh thu",
              fontSize: "12px",
              color: "#64748b",
              formatter: () => {
                if (totalRevenue >= 1000000000) return `${(totalRevenue / 1000000000).toFixed(2)} Tỷ`;
                if (totalRevenue >= 1000000) return `${(totalRevenue / 1000000).toFixed(1)} Tr`;
                return `${totalRevenue.toLocaleString("vi-VN")} đ`;
              }
            }
          }
        }
      }
    },
    tooltip: {
      y: { formatter: (val: number) => `${val.toLocaleString("vi-VN")} đ` }
    }
  };

  const regionBarOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      height: 250,
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: true,
        barHeight: "55%",
        distributed: true,
      }
    },
    colors: ["#3b82f6", "#10b981", "#f59e0b"],
    dataLabels: {
      enabled: true,
      textAnchor: "start",
      style: { colors: ["#fff"], fontWeight: "bold", fontSize: "11px" },
      formatter: (val: number) => `${val.toLocaleString("vi-VN")} đ`,
      offsetX: 10
    },
    stroke: { width: 0 },
    xaxis: {
      categories: regionData.categories,
      labels: {
        style: { colors: "#64748b", fontSize: "10px" },
        formatter: (val: number) => {
          if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}B`;
          if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
          return val.toString();
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: "bold" } }
    },
    grid: { borderColor: "rgba(100, 116, 139, 0.08)", strokeDashArray: 4 },
    legend: { show: false },
    tooltip: {
      y: { formatter: (val: number) => `${val.toLocaleString("vi-VN")} đ` }
    }
  };

  const regionSeries = [
    {
      name: "Doanh số vùng miền",
      data: regionData.series
    }
  ];

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Kết quả kinh doanh"
        description="Báo cáo tổng hợp doanh thu và tiến độ hoàn thành chỉ tiêu"
        color="blue"
        icon="bi-bar-chart-line-fill"
      />
      <DynamicTicker pageTitle="Kết quả kinh doanh" />

      <div className="flex-grow-1 px-2 px-md-4 pb-4 pt-2 d-flex flex-column custom-scrollbar overflow-auto" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0, gap: 16 }}>

        {/* Charts Grid */}
        <div className="row g-3">
          {/* Revenue Trends */}
          <div className="col-12 col-xl-8">
            <div className="bg-card border rounded-4 p-3 p-md-4 d-flex flex-column h-100 shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-3 flex-wrap gap-2">
                <div>
                  <span className="fw-extrabold text-dark d-block" style={{ fontSize: 14 }}>
                    <i className="bi bi-bar-chart-fill text-primary me-2" />
                    Biểu đồ so sánh doanh số thực tế với mục tiêu 6 tháng gần nhất
                  </span>
                  <span className="text-muted" style={{ fontSize: 11.5 }}>
                    {hidePlan
                      ? "Bản trực quan hóa 6 tháng gần nhất: Tách riêng thanh doanh thu Seajong và Hàng khác"
                      : "Bản trực quan hóa 6 tháng gần nhất: Kế hoạch mục tiêu và Thực tế (nhập chung hàng Seajong)"}
                  </span>
                </div>
                <div className="d-flex align-items-center">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setHidePlan((prev) => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setHidePlan((prev) => !prev);
                      }
                    }}
                    className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill user-select-none border shadow-2xs"
                    style={{
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      background: hidePlan
                        ? "color-mix(in srgb, var(--primary) 10%, var(--card))"
                        : "var(--card)",
                      borderColor: hidePlan
                        ? "color-mix(in srgb, var(--primary) 35%, transparent)"
                        : "var(--border)",
                      color: hidePlan ? "var(--primary)" : "var(--muted-foreground)",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    title={hidePlan ? "Bấm để hiển thị lại cột kế hoạch (nhập thanh Seajong)" : "Bấm để ẩn kế hoạch (tách riêng thanh Seajong)"}
                  >
                    <i
                      className={`bi ${hidePlan ? "bi-eye-slash-fill text-primary" : "bi-eye text-muted"}`}
                      style={{ fontSize: 13 }}
                    />
                    <span>Ẩn đồ thị kế hoạch</span>
                    <div
                      style={{
                        width: 30,
                        height: 16,
                        borderRadius: 99,
                        background: hidePlan ? "var(--primary, #003087)" : "#cbd5e1",
                        position: "relative",
                        transition: "background 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#ffffff",
                          position: "absolute",
                          top: 2,
                          left: hidePlan ? 16 : 2,
                          transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 320 }}>
                <ReactApexChart
                  key={hidePlan ? "unstacked-seajong-split" : "stacked-plan-visible"}
                  options={revenueTrendChartOptions}
                  series={revenueTrendSeries}
                  type="bar"
                  height={320}
                />
              </div>
            </div>
          </div>

          {/* Categories distribution */}
          <div className="col-12 col-xl-4">
            <div className="bg-card border rounded-4 p-3 p-md-4 d-flex flex-column h-100 shadow-sm">
              <div className="mb-3">
                <span className="fw-extrabold text-dark d-block" style={{ fontSize: 14 }}>
                  <i className="bi bi-pie-chart text-info me-2" />
                  Cơ cấu doanh thu theo dòng sản phẩm
                </span>
                <span className="text-muted" style={{ fontSize: 11.5 }}>
                  Phần trăm đóng góp của các nhóm hàng chính vào tổng doanh thu
                </span>
              </div>
              <div className="d-flex align-items-center justify-content-center" style={{ flex: 1, minHeight: 300 }}>
                <ReactApexChart options={categoryPieOptions} series={categoriesData.series} type="donut" width="100%" height={320} />
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          {/* Regional Sales */}
          <div className="col-12 col-xl-5">
            <div className="bg-card border rounded-4 p-3 p-md-4 d-flex flex-column h-100 shadow-sm">
              <div className="mb-2">
                <span className="fw-extrabold text-dark d-block" style={{ fontSize: 14 }}>
                  <i className="bi bi-geo-alt text-success me-2" />
                  Phân tích doanh số theo vùng miền
                </span>
                <span className="text-muted" style={{ fontSize: 11.5 }}>
                  Tỷ trọng đóng góp và giá trị doanh thu của các thị trường Bắc - Trung - Nam
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 250 }}>
                <ReactApexChart options={regionBarOptions} series={regionSeries} type="bar" height={250} />
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="col-12 col-xl-7">
            <div className="bg-card border rounded-4 p-3 p-md-4 d-flex flex-column h-100 shadow-sm">
              <div className="mb-3">
                <span className="fw-extrabold text-dark d-block" style={{ fontSize: 14 }}>
                  <i className="bi bi-table text-purple me-2" />
                  Bảng chi tiết kết quả thực hiện chỉ tiêu theo tháng
                </span>
                <span className="text-muted" style={{ fontSize: 11.5 }}>
                  Bảng tổng hợp chi tiết số liệu KPI mục tiêu, doanh số thực thu và tỷ lệ hoàn thành kế hoạch
                </span>
              </div>

              <div className="table-responsive flex-grow-1 custom-scrollbar overflow-auto" style={{ maxHeight: 270 }}>
                <table className="table table-hover align-middle mb-0" style={{ fontSize: 12.5 }}>
                  <thead>
                    <tr className="text-secondary" style={{ borderBottom: "1px solid var(--border)", fontSize: 11 }}>
                      <th className="py-2">Thời kỳ</th>
                      <th className="py-2 text-end">Chỉ tiêu (đ)</th>
                      <th className="py-2 text-end">Thực tế đạt (đ)</th>
                      <th className="py-2 text-center" style={{ width: 140 }}>Hoàn thành %</th>
                      <th className="py-2 text-end">Biên LN (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableMonthlyTrends.map((t: any, index: number) => {
                      const achievementColor = t.achievement >= 100 ? "text-success" : t.achievement >= 75 ? "text-primary" : t.achievement > 0 ? "text-warning" : "text-muted";
                      return (
                        <tr key={index} style={{ borderBottom: "1px solid var(--border)", background: t.isCurrentMonth ? "rgba(0, 48, 135, 0.03)" : "transparent" }}>
                          <td className="py-2 fw-semibold">
                            <span>{t.month}</span>
                            {t.isCurrentMonth && (
                              <span className="badge bg-primary-subtle text-primary rounded-pill ms-2" style={{ fontSize: 9.5, fontWeight: 600 }}>
                                Tháng này
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-end text-muted">{t.target.toLocaleString("vi-VN")}</td>
                          <td className="py-2 text-end fw-bold">{t.actual === null ? "—" : t.actual.toLocaleString("vi-VN")}</td>
                          <td className="py-2 text-center">
                            {t.actual === null ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <div className="d-flex align-items-center justify-content-center gap-2">
                                <span className={`fw-bold ${achievementColor}`} style={{ fontSize: 11 }}>{t.achievement}%</span>
                                <div style={{ width: 50, height: 4, borderRadius: 99, background: "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${Math.min(t.achievement, 100)}%`, background: t.achievement >= 100 ? "#10b981" : t.achievement >= 75 ? "#3b82f6" : "#f59e0b", borderRadius: 99 }} />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-2 text-end text-muted">{`${profitMargin}%`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .app-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .app-card:hover {
          transform: translateY(-2.5px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.08) !important;
        }
      `}</style>
    </div>
  );
}
