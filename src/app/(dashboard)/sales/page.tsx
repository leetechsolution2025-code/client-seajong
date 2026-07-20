"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DynamicTicker } from "@/components/layout/DynamicTicker";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table, TableColumn } from "@/components/ui/Table";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DashboardData {
  summary: {
    totalSales: number;
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
    actualSales: number | null;
    actualRevenue: number | null;
  }[];
  categoryBreakdown?: {
    name: string;
    value: number;
  }[];
  recentOrders: {
    id: string;
    code: string;
    customerName: string;
    ngayDat: string;
    tongTien: number;
    trangThai: string;
    daThanhToan: number;
  }[];
  recentCare: {
    id: string;
    customerId: string;
    ngayChamSoc: string;
    hinhThuc: string;
    tomTat: string;
    customer?: {
      id: string;
      name: string;
      loai: string;
    };
    nguoiChamSoc?: {
      id: string;
      fullName: string;
    };
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
    <div className="app-card bg-card border rounded-4 shadow-sm position-relative overflow-hidden transition" style={{ minWidth: 0, padding: "10px 16px" }}>
      {/* Brand accent vertical bar */}
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
        {pct !== null && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10.5 }}>
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

// ── Main Dashboard Page ───────────────────────────────────────────────────────
export default function SalesPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [partnersCountThisMonth, setPartnersCountThisMonth] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showKpiModal, setShowKpiModal] = useState<boolean>(false);
  const [showManagerKpiRules, setShowManagerKpiRules] = useState<boolean>(false);
  const [kpiActiveTab, setKpiActiveTab] = useState<'manager' | 'employee'>('employee');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [midTab, setMidTab] = useState<'chart' | 'pie'>('chart');
  const [bottomTab, setBottomTab] = useState<'orders' | 'care'>('orders');
  const { data: session } = useSession();

  const managerKpiColumns: TableColumn<any>[] = [
    { header: 'STT', width: '60px', render: (row) => row?.stt || '-' },
    { header: 'Chỉ tiêu công việc', render: (row) => row?.chiTieu || '-' },
    { header: 'Đơn vị tính', render: (row) => row?.donVi || '-' },
    { header: 'Mục tiêu', render: (row) => row?.mucTieu || '-' },
    { header: 'Trọng số', render: (row) => row?.trongSo || '-' },
    { header: 'Thực tế', render: (row) => row?.thucTe || '-' },
    { header: 'Điểm', render: (row) => row?.diem || '-' },
    { header: 'Hoàn thành (%)', render: (row) => row?.hoanThanh || '-' }
  ];

  const mockManagerKpiData = [
    { id: '1', isFullWidth: true, fullWidthContent: "A- PHÁT TRIỂN HỆ THỐNG ĐẠI LÝ (45 ĐIỂM)", disableContentChange: true, disableAdd: true },
    { id: '1.1', chiTieu: "Đại lý Showroom đạt chuẩn", donVi: "Đại lý", mucTieu: "3", trongSo: "30%", thucTe: "-", diem: "30", hoanThanh: "100%", stt: "A.1" },
    { id: '1.2', chiTieu: "Doanh số tối thiểu", donVi: "VNĐ", mucTieu: "200,000,000", trongSo: "50%", thucTe: "-", diem: "50", hoanThanh: "100%", stt: "A.2" },
    
    { id: '2', isFullWidth: true, fullWidthContent: "B- KÍCH HOẠT VÀ DOANH SỐ ĐẠI LÝ (30 ĐIỂM)", disableContentChange: true, disableAdd: true },
    { id: '2.1', chiTieu: "Tỷ lệ đại lý có đơn trong 30 ngày", donVi: "%", mucTieu: "90%", trongSo: "5%", thucTe: "-", diem: "5", hoanThanh: "100%", stt: "B.1" },
    { id: '2.2', chiTieu: "Doanh số bình quân đại lý mới", donVi: "VNĐ", mucTieu: "50,000,000", trongSo: "5%", thucTe: "-", diem: "5", hoanThanh: "100%", stt: "B.2" },
    { id: '2.3', chiTieu: "Tỷ lệ đại lý phát sinh đơn hàng trong tháng", donVi: "%", mucTieu: "100%", trongSo: "5%", thucTe: "-", diem: "5", hoanThanh: "100%", stt: "B.3" },
    
    { id: '3', isFullWidth: true, fullWidthContent: "C- KỶ LUẬT VÀ HỆ THỐNG (10 ĐIỂM)", disableContentChange: true, disableAdd: true },
    { id: '3.1', chiTieu: "Kế hoạch và báo cáo", donVi: "Check list", mucTieu: "đúng hạn", trongSo: "2%", thucTe: "-", diem: "3", hoanThanh: "100%", stt: "C.1" },
    { id: '3.2', chiTieu: "Báo cáo insight thị trường", donVi: "Check list", mucTieu: "có", trongSo: "1%", thucTe: "-", diem: "3", hoanThanh: "100%", stt: "C.2" },
    { id: '3.3', chiTieu: "Phối hợp nội bộ", donVi: "Đánh giá", mucTieu: "Tốt", trongSo: "2%", thucTe: "-", diem: "4", hoanThanh: "100%", stt: "C.3" },
  ];

  const employeeKpiColumns: TableColumn<any>[] = [
    { header: 'STT', width: '60px', render: (row, i) => i + 1 },
    { header: 'Tiêu chí đánh giá', render: (row) => row?.tieuChi || '-' },
    { header: 'Đơn vị', render: (row) => row?.donVi || '-' },
    { header: 'Chỉ tiêu', render: (row) => row?.chiTieu || '-' },
    { header: 'Trọng số', render: (row) => row?.trongSo || '-' },
    { header: 'Thực tế', render: (row) => row?.thucTe || '-' },
    { header: 'Điểm', render: (row) => row?.diem || '-', align: 'center' },
    { 
      header: 'Hoàn thành', 
      align: 'center',
      render: (row) => {
        if (!row?.thucTe || row.thucTe === '-' || !row?.chiTieu || row.chiTieu === '-') return '-';

        if (row.thucTe === 'Hàng ngày' && row.chiTieu === 'Hàng ngày') {
          return '100%';
        }

        const thucTeVal = parseFloat(row.thucTe.toString().replace(/,/g, ''));
        const chiTieuVal = parseFloat(row.chiTieu.toString().replace(/,/g, ''));
        
        if (!isNaN(thucTeVal) && !isNaN(chiTieuVal) && chiTieuVal !== 0) {
          return Math.round((thucTeVal / chiTieuVal) * 100) + '%';
        }
        return '-';
      }
    }
  ];

  const mockEmployeeKpiData = [
    { id: '1', tieuChi: "Doanh thu cá nhân", donVi: "VNĐ", chiTieu: "200,000,000", trongSo: "50%", thucTe: "180,000,000", diem: "45" },
    { id: '2', tieuChi: "Doanh thu đại lý mới (10%)", donVi: "VNĐ", chiTieu: "20,000,000", trongSo: "10%", thucTe: "15,000,000", diem: "7.5" },
    { id: '3', tieuChi: "Đại lý mới trong tháng", donVi: "Đại lý", chiTieu: "2", trongSo: "15%", thucTe: "1", diem: "7.5" },
    { id: '4', tieuChi: "Báo cáo", donVi: "Lần/ngày", chiTieu: "Hàng ngày", trongSo: "5%", thucTe: "Hàng ngày", diem: "5" },
    { id: '5', tieuChi: "Checkin thị trường", donVi: "Lần/ngày", chiTieu: "Hàng ngày", trongSo: "10%", thucTe: "Hàng ngày", diem: "10" }
  ];


  const kpiChartOptions: any = {
    chart: { type: 'bar', height: 250, toolbar: { show: false }, fontFamily: 'inherit' },
    plotOptions: {
      bar: { 
        borderRadius: 4, 
        columnWidth: '40%', 
        dataLabels: { position: 'top' },
        distributed: true
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val > 0 ? val : "",
      offsetY: -20,
      style: { fontSize: '10px', colors: ["#6c757d"], fontWeight: 600 }
    },
    xaxis: {
      categories: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#a1a1aa', fontSize: '11px', fontWeight: 500 } }
    },
    yaxis: {
      max: 120, 
      labels: { show: false }
    },
    grid: { show: false },
    colors: Array.from({ length: 12 }, (_, i) => i === selectedMonth - 1 ? '#0d6efd' : '#bfdbfe'),
    legend: { show: false },
    tooltip: {
      y: { formatter: (val: number) => `${val} điểm` }
    },
    annotations: {
      yaxis: [{
        y: 96,
        borderColor: '#ff9800',
        strokeDashArray: 4,
        borderWidth: 2,
        label: {
          borderColor: '#ff9800',
          style: {
            color: '#fff',
            background: '#ff9800',
            fontSize: '10px',
            fontWeight: 600,
            padding: { left: 5, right: 5, top: 2, bottom: 2 }
          },
          text: 'Điểm trung bình: 96 điểm',
          position: 'right',
          offsetX: -10
        }
      }]
    }
  };

  const kpiChartSeries = [{
    name: 'Điểm KPI',
    data: [95, 100, 85, 90, 105, 92, 105, 0, 0, 0, 0, 0] // Mock data
  }];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    fetch("/api/sales/dashboard")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading sales dashboard:", err);
        setLoading(false);
      });

    fetch("/api/sales/partners")
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
        <PageHeader title="Phòng Kinh doanh" description="Sales · Quản lý bán hàng & doanh thu" color="emerald" icon="bi-graph-up-arrow" />
        <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted">
          <div className="d-flex flex-column align-items-center gap-2">
            <div className="spinner-border spinner-border-sm text-success" role="status" />
            <span style={{ fontSize: 13 }}>Đang tải dữ liệu kinh doanh...</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallbacks
  const summary = data?.summary || { totalSales: 0, totalRevenue: 0, targetRevenue: 0, totalOrdersCount: 0, totalDebt: 0, customersCount: 0, dealersCount: 0 };
  const apiTrends = data?.monthlyTrends || Array.from({ length: 12 }, (_, i) => ({ month: `Tháng ${i + 1}`, target: 0, actualSales: (i + 1) > (new Date().getMonth() + 1) ? null : 0, actualRevenue: (i + 1) > (new Date().getMonth() + 1) ? null : 0 }));
  const recentOrders = data?.recentOrders || [];
  const recentCare = data?.recentCare || [];

  const targetRevenue = summary.targetRevenue > 0 ? summary.targetRevenue : 4500000000;
  const totalSales = summary.totalSales;
  const totalRevenue = summary.totalRevenue;

  const monthlyTrends = apiTrends.map((t, idx) => {
    // If DB target is empty, distribute the distributed target (e.g. 350M - 420M per month)
    const fallbackTarget = (targetRevenue / 12) * (1 + Math.sin(idx / 2) * 0.1);
    const targetVal = t.target > 0 ? t.target : Math.round(fallbackTarget);
    return {
      month: t.month,
      target: targetVal,
      actualSales: t.actualSales,
      actualRevenue: t.actualRevenue,
      achievement: (t.actualSales !== null && targetVal > 0) ? Math.round((t.actualSales / targetVal) * 100) : 0
    };
  });

  const avgOrderVal = summary.totalOrdersCount > 0 ? Math.round(totalSales / summary.totalOrdersCount) : 0;

  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  const currentMonthTrend = monthlyTrends[currentMonthIdx] || { target: 0, actualSales: 0, actualRevenue: 0 };
  const currentMonthSales = currentMonthTrend.actualSales ?? 0;
  const currentMonthRevenue = currentMonthTrend.actualRevenue ?? 0;
  const currentMonthTarget = currentMonthTrend.target;
  const mmYYYY = `${String(currentMonthIdx + 1).padStart(2, "0")}-${currentYear}`;

  const currentMonthDealersLabel = `Phát triển đại lý | ${mmYYYY}`;

  let assessment = "";
  if (targetRevenue > 0) {
    const progress = (totalRevenue / targetRevenue) * 100;
    if (progress >= 100) assessment += "Tuyệt vời! Doanh thu đã vượt chỉ tiêu đề ra. ";
    else if (progress >= 80) assessment += "Tín hiệu khả quan! Doanh thu đang bám rất sát mục tiêu. ";
    else if (progress >= 50) assessment += "Tiến độ kinh doanh đang duy trì ở mức ổn định. ";
    else assessment += "Lưu ý: Tiến độ hoàn thành doanh thu còn thấp, cần đẩy mạnh chiến dịch bán hàng. ";
  }
  if (totalSales > 0) {
    const collectionRate = (totalRevenue / totalSales) * 100;
    if (collectionRate < 50) assessment += "Cảnh báo: Tỷ lệ thu hồi công nợ thấp, cần đôn đốc thu tiền! ";
    else if (collectionRate >= 90) assessment += "Tỷ lệ thu hồi tiền rất tốt, đảm bảo dòng tiền khoẻ. ";
  }
  if (partnersCountThisMonth > 0) {
    assessment += `Tháng này ghi nhận sự mở rộng tích cực với ${partnersCountThisMonth} đại lý mới. `;
  }
  if (!assessment) assessment = "Hệ thống đang theo dõi và tổng hợp số liệu kinh doanh.";

  const customTickerNews = [
    { text: `• Nhận xét chung: ${assessment}`, type: 'text' },
    { text: `• Tổng doanh số: ${totalSales.toLocaleString("vi-VN")} đ (${totalSales > 0 ? `Tỷ lệ thu hồi: ${Math.round(totalRevenue / totalSales * 100)}%` : "Chưa có dữ liệu"})`, type: 'text' },
    { text: `• Tổng doanh thu: ${totalRevenue.toLocaleString("vi-VN")} đ (Chỉ tiêu năm: ${targetRevenue.toLocaleString("vi-VN")} đ, Tiến độ: ${targetRevenue > 0 ? Math.round(totalRevenue / targetRevenue * 100) : 0}%)`, type: 'text' },
    { text: `• Giao dịch phát sinh: ${summary.totalOrdersCount} đơn hàng (${avgOrderVal > 0 ? `Bình quân đơn: ${avgOrderVal.toLocaleString("vi-VN")} đ` : "Chưa phát sinh đơn"})`, type: 'text' },
    { text: `• ${currentMonthDealersLabel}: ${partnersCountThisMonth} đối tác mới (Tổng hệ thống: ${summary.dealersCount} đại lý)`, type: 'text' },
  ];

  // Chart setup
  const chartSeries = [
    { name: "Doanh thu mục tiêu", data: monthlyTrends.map(t => t.target), color: "#f59e0b" },
    { name: "Doanh thu thực tế", data: monthlyTrends.map(t => t.actualRevenue), color: "#10b981" }
  ];

  const apexOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "inherit",
      background: "transparent",
    },
    colors: chartSeries.map(s => s.color),
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.15, opacityTo: 0.02, stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: monthlyTrends.map(t => t.month.replace("Tháng ", "T")),
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "11px" },
        formatter: (val: number) => {
          if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}B`;
          if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
          return val.toLocaleString("vi-VN");
        }
      }
    },
    legend: { show: true, position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: "var(--foreground)" } },
    grid: { borderColor: "rgba(100, 116, 139, 0.08)", strokeDashArray: 4 },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val: number) => val === null || val === undefined ? "—" : `${val.toLocaleString("vi-VN")} đ`
      }
    },
  };

  const categoryBreakdown = data?.categoryBreakdown || [
    { name: "Thiết bị vệ sinh", value: totalSales > 0 ? Math.round(totalSales * 0.42) : 1890000000 },
    { name: "Sen vòi Seajong", value: totalSales > 0 ? Math.round(totalSales * 0.28) : 1260000000 },
    { name: "Phụ kiện phòng tắm", value: totalSales > 0 ? Math.round(totalSales * 0.15) : 675000000 },
    { name: "Thiết bị nhà bếp", value: totalSales > 0 ? Math.round(totalSales * 0.10) : 450000000 },
    { name: "Khác", value: totalSales > 0 ? Math.round(totalSales * 0.05) : 225000000 },
  ];

  const categoriesData = {
    labels: categoryBreakdown.map(c => c.name),
    series: categoryBreakdown.map(c => c.value)
  };

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
      fontSize: "11px",
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
              label: "Tổng doanh số",
              fontSize: "11px",
              color: "#64748b",
              formatter: () => {
                if (totalSales >= 1000000000) return `${(totalSales / 1000000000).toFixed(2)} Tỷ`;
                return `${(totalSales / 1000000).toFixed(0)} Tr`;
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

  const getOrderStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; bg: string; text: string }> = {
      draft: { label: "Bản nháp", bg: "rgba(100, 116, 139, 0.1)", text: "#64748b" },
      pending: { label: "Chờ duyệt", bg: "rgba(245, 158, 11, 0.1)", text: "#d97706" },
      approved: { label: "Đã duyệt", bg: "rgba(59, 130, 246, 0.1)", text: "#2563eb" },
      completed: { label: "Hoàn thành", bg: "rgba(16, 185, 129, 0.1)", text: "#059669" },
      cancelled: { label: "Đã hủy", bg: "rgba(239, 68, 68, 0.1)", text: "#dc2626" }
    };
    const current = statusMap[status] || { label: status, bg: "rgba(100, 116, 139, 0.1)", text: "#64748b" };
    return (
      <span className="badge fw-bold" style={{ backgroundColor: current.bg, color: current.text, fontSize: 10, padding: "3px 8px", borderRadius: 99 }}>
        {current.label}
      </span>
    );
  };

  const renderRevenueChart = () => (
    <div className="bg-card border rounded-4 p-3 d-flex flex-column h-100 shadow-sm" style={{ border: "none" }}>
      <div className="mb-2">
        <SectionTitle 
          title="Xu hướng doanh thu" 
          icon="bi-activity text-emerald" 
          className="mb-1"
          action={
            <button onClick={() => setShowKpiModal(true)} className="btn btn-sm btn-danger shadow-sm d-flex align-items-center gap-1 text-white border-0" style={{ fontSize: 11, padding: "3px 10px" }}>
              <i className="bi bi-bar-chart-line text-white"></i>
              KPI
            </button>
          }
        />
        <span className="text-muted d-block" style={{ fontSize: 11 }}>
          Mục tiêu kế hoạch so với thực tế
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 280 }}>
        <ReactApexChart options={apexOptions} series={chartSeries} type="area" height={280} />
      </div>
    </div>
  );

  const renderCategoryPie = () => (
    <div className="bg-card border rounded-4 p-3 d-flex flex-column justify-content-between h-100 shadow-sm" style={{ border: "none" }}>
      <div>
        <SectionTitle 
          title="Cơ cấu dòng sản phẩm" 
          icon="bi-pie-chart text-info" 
          className="mb-1"
        />
        <span className="text-muted d-block mb-3" style={{ fontSize: 11 }}>
          Phần trăm đóng góp vào tổng doanh thu
        </span>
      </div>
      <div className="d-flex align-items-center justify-content-center" style={{ flex: 1, minHeight: 290 }}>
        <ReactApexChart options={categoryPieOptions} series={categoriesData.series} type="donut" width="100%" height={300} />
      </div>
    </div>
  );

  const renderRecentOrders = () => (
    <div className="bg-card border rounded-4 p-3 d-flex flex-column h-100 shadow-sm" style={{ border: "none" }}>
      <SectionTitle 
        title="Đơn hàng mới" 
        icon="bi-bag-check-fill text-purple" 
        className="mb-3"
        action={
          <a href="/sales/orders" className="text-decoration-none fw-semibold" style={{ fontSize: 11.5, color: "#10b981" }}>
            Tất cả →
          </a>
        }
      />

      <div className="flex-grow-1 custom-scrollbar">
        {recentOrders.length === 0 ? (
          <div className="text-center py-4 text-muted" style={{ fontSize: 12.5 }}>
            Chưa phát sinh đơn hàng nào
          </div>
        ) : isMobile ? (
          <div className="d-flex flex-column gap-2" style={{ maxHeight: 350, overflowY: "auto", paddingRight: 4 }}>
            {recentOrders.map(order => (
              <div key={order.id} className="p-3 border rounded-3 bg-light/30 d-flex flex-column gap-2" style={{ fontSize: 12.5 }}>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="fw-semibold text-primary" style={{ fontSize: 13 }}>{order.code}</span>
                  {getOrderStatusBadge(order.trangThai)}
                </div>
                <div className="d-flex justify-content-between text-secondary" style={{ fontSize: 11.5 }}>
                  <span className="text-truncate" style={{ maxWidth: "60%" }} title={order.customerName}>
                    👤 {order.customerName}
                  </span>
                  <span>
                    📅 {order.ngayDat ? new Date(order.ngayDat).toLocaleDateString("vi-VN") : "—"}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-1 pt-2" style={{ borderTop: "1px dashed var(--border)" }}>
                  <span className="text-muted" style={{ fontSize: 11 }}>Tổng tiền:</span>
                  <span className="fw-bold text-dark" style={{ fontSize: 13.5, color: "#10b981" }}>
                    {order.tongTien?.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: 12.5 }}>
              <thead>
                <tr className="text-secondary" style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="py-2">Mã đơn</th>
                  <th className="py-2">Khách hàng</th>
                  <th className="py-2">Ngày đặt</th>
                  <th className="py-2 text-end">Tổng tiền</th>
                  <th className="py-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2 fw-semibold text-primary">{order.code}</td>
                    <td className="py-2 text-truncate" style={{ maxWidth: 120 }}>{order.customerName}</td>
                    <td className="py-2 text-muted">
                      {order.ngayDat ? new Date(order.ngayDat).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="py-2 text-end fw-bold">{order.tongTien?.toLocaleString("vi-VN")} đ</td>
                    <td className="py-2 text-center">{getOrderStatusBadge(order.trangThai)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderRecentCare = () => (
    <div className="bg-card border rounded-4 p-3 d-flex flex-column h-100 shadow-sm" style={{ border: "none" }}>
      <SectionTitle 
        title="Hoạt động CSKH" 
        icon="bi-chat-heart-fill text-danger" 
        className="mb-3"
        action={
          <a href="/sales/customers" className="text-decoration-none fw-semibold" style={{ fontSize: 11.5, color: "#10b981" }}>
            Nhật ký →
          </a>
        }
      />

      <div className="flex-grow-1 overflow-auto custom-scrollbar d-flex flex-column gap-2" style={{ maxHeight: 240 }}>
        {recentCare.length === 0 ? (
          <div className="text-center py-4 text-muted" style={{ fontSize: 12.5 }}>
            Chưa ghi nhận hoạt động nào gần đây
          </div>
        ) : recentCare.map(log => {
          const badgeColor = log.hinhThuc === "call" || log.hinhThuc === "Điện thoại" ? "#3b82f6"
            : log.hinhThuc === "visit" || log.hinhThuc === "Gặp mặt" ? "#10b981"
              : "#8b5cf6";
          return (
            <div key={log.id} className="p-2 border rounded-3 bg-light/50 d-flex flex-column gap-1" style={{ fontSize: 12 }}>
              <div className="d-flex align-items-center justify-content-between">
                <span className="fw-bold text-dark">{log.customer?.name || "Khách hàng"}</span>
                <span className="badge fw-bold" style={{ backgroundColor: `color-mix(in srgb, ${badgeColor} 10%, transparent)`, color: badgeColor, fontSize: 9.5 }}>
                  {log.hinhThuc}
                </span>
              </div>
              <p className="margin-0 text-secondary" style={{ fontSize: 11.5, margin: 0 }}>{log.tomTat}</p>
              <div className="d-flex justify-content-between text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                <span>Phụ trách: {log.nguoiChamSoc?.fullName || "Hệ thống"}</span>
                <span>{log.ngayChamSoc ? new Date(log.ngayChamSoc).toLocaleDateString("vi-VN") : ""}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Phòng Kinh doanh"
        description="Sales · Quản lý bán hàng & doanh thu"
        color="emerald"
        icon="bi-graph-up-arrow"
      />
      <DynamicTicker pageTitle="Phòng Kinh doanh" customNews={customTickerNews} />

      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column custom-scrollbar overflow-auto" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0, gap: 16 }}>

        {/* ── Chart & Shortcuts ── */}
        <div className="d-none d-xl-grid sales-mid-grid">
          {renderRevenueChart()}
          {renderCategoryPie()}
        </div>

        {/* ── Chart & Shortcuts (Mobile Tabs) ── */}
        <div className="d-block d-xl-none bg-card border rounded-4 p-2 shadow-sm mb-2">
          <ul className="nav nav-pills nav-fill mb-2" style={{ background: "var(--muted)", borderRadius: 12, padding: 4 }}>
            <li className="nav-item">
              <button 
                className={`nav-link rounded-3 fw-bold ${midTab === "chart" ? "active bg-white text-dark shadow-sm" : "text-muted"}`}
                onClick={() => setMidTab("chart")}
                style={{ fontSize: 12 }}
              >
                <i className="bi bi-activity me-1" /> Xu hướng
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link rounded-3 fw-bold ${midTab === "pie" ? "active bg-white text-dark shadow-sm" : "text-muted"}`}
                onClick={() => setMidTab("pie")}
                style={{ fontSize: 12 }}
              >
                <i className="bi bi-pie-chart me-1" /> Cơ cấu
              </button>
            </li>
          </ul>
          <div>
            {midTab === "chart" ? renderRevenueChart() : renderCategoryPie()}
          </div>
        </div>

        {/* ── Feed Rows (Orders & Care Logs) ── */}
        <div className="d-none d-xl-grid sales-bottom-grid">
          {renderRecentOrders()}
          {renderRecentCare()}
        </div>

        {/* ── Feed Rows (Mobile Tabs) ── */}
        <div className="d-block d-xl-none bg-card border rounded-4 p-2 shadow-sm mb-2">
          <ul className="nav nav-pills nav-fill mb-2" style={{ background: "var(--muted)", borderRadius: 12, padding: 4 }}>
            <li className="nav-item">
              <button 
                className={`nav-link rounded-3 fw-bold ${bottomTab === "orders" ? "active bg-white text-dark shadow-sm" : "text-muted"}`}
                onClick={() => setBottomTab("orders")}
                style={{ fontSize: 12 }}
              >
                <i className="bi bi-bag-check-fill me-1" /> Đơn hàng
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link rounded-3 fw-bold ${bottomTab === "care" ? "active bg-white text-dark shadow-sm" : "text-muted"}`}
                onClick={() => setBottomTab("care")}
                style={{ fontSize: 12 }}
              >
                <i className="bi bi-chat-heart-fill me-1" /> Chăm sóc KH
              </button>
            </li>
          </ul>
          <div>
            {bottomTab === "orders" ? renderRecentOrders() : renderRecentCare()}
          </div>
        </div>

      </div>

      <style>{`
        .sales-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .sales-mid-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 16px;
        }
        .sales-bottom-grid {
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
          .sales-mid-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 992px) {
          .sales-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .sales-bottom-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 576px) {
          .sales-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      
      {/* KPI Modal */}
      {showKpiModal && <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>}

      {/* Offcanvas for Manager KPI Rules */}
      <div 
        className={`offcanvas offcanvas-end ${showManagerKpiRules ? 'show' : ''}`} 
        tabIndex={-1} 
        style={{ width: "400px", zIndex: 1070, ...(showManagerKpiRules ? { visibility: 'visible' } : {}) }}
      >
        <div className="offcanvas-header border-bottom bg-light">
          <h5 className="offcanvas-title fw-bold text-primary">
            <i className="bi bi-info-circle me-2"></i>Quy định tính KPI
          </h5>
          <button type="button" className="btn-close" onClick={() => setShowManagerKpiRules(false)}></button>
        </div>
        <div className="offcanvas-body p-4 bg-light overflow-auto">
          <div className="d-flex flex-column gap-4">
            <div className="bg-white border rounded-4 p-4 shadow-sm position-relative overflow-hidden transition" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#3b82f6" }} />
              <SectionTitle 
                title="Ngưỡng tính KPI" 
                icon="bi-bullseye text-primary" 
                className="mb-4"
              />

              <div className="bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 p-3 mb-4 d-flex align-items-center justify-content-center shadow-sm">
                <i className="bi bi-star-fill text-warning fs-5 me-2"></i>
                <span className="fw-semibold text-primary" style={{ fontSize: 14 }}>Tổng điểm KPI tháng {selectedMonth}:</span>
                <span className="fw-bold text-primary ms-2" style={{ fontSize: 22, lineHeight: 1 }}>
                  {Math.min(mockManagerKpiData.reduce((sum, item) => sum + (parseFloat(item.diem as string) || 0), 0), 100)}
                </span>
                <span className="text-secondary fw-semibold ms-1" style={{ fontSize: 14 }}>/ 100</span>
              </div>

              <ul className="text-secondary ps-3 mb-0 d-flex flex-column gap-3" style={{ fontSize: 13, listStyleType: "circle", lineHeight: 1.6 }}>
                <li><strong>Thang điểm đánh giá:</strong> KPI được chấm theo thang 100 điểm/tháng. Điểm trần tối đa là 100 điểm (không tính vượt mức).</li>
                <li><strong>Cơ sở chi trả:</strong> Điểm số KPI đạt được trong tháng sẽ là căn cứ trực tiếp để tính toán và chi trả phần lương hiệu suất theo tỷ lệ phần trăm tương ứng.</li>
                <li><strong>Mức điểm tối thiểu:</strong> Nếu KPI <span className="text-danger fw-bold">&lt;80 điểm</span>, nhân viên sẽ bị xếp loại Không đạt và <strong className="text-danger">không được hưởng lương hiệu suất</strong> (0%) trong tháng đó.</li>
              </ul>
            </div>

            <div className="bg-white border rounded-4 p-4 shadow-sm position-relative overflow-hidden transition" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#10b981" }} />
              <SectionTitle 
                title="Cách tính lương hiệu suất (KPI)" 
                icon="bi-cash-coin text-success" 
                className="mb-4"
              />
              
              <div className="bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 p-3 mb-4 d-flex align-items-center justify-content-center shadow-sm">
                <i className="bi bi-award-fill text-success fs-5 me-2"></i>
                <span className="fw-semibold text-success" style={{ fontSize: 14 }}>Thưởng KPI tháng tối đa:</span>
                <span className="fw-bold text-success ms-2" style={{ fontSize: 22, lineHeight: 1 }}>5,000,000</span>
                <span className="text-secondary fw-semibold ms-1" style={{ fontSize: 14 }}>VNĐ</span>
              </div>

              <ul className="text-secondary ps-3 mb-0 d-flex flex-column gap-2" style={{ fontSize: 13, listStyleType: "circle", lineHeight: 1.6 }}>
                <li><strong>Thực nhận =</strong> Lương hợp đồng &times; Tỷ lệ hưởng</li>
                <li>
                  Tỷ lệ hưởng theo xếp hạng:
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <div className="flex-fill bg-white border rounded-3 p-2 text-center shadow-sm">
                      <div className="text-muted mb-1" style={{ fontSize: 11 }}>80–89 đ</div>
                      <div className="fw-bold text-dark" style={{ fontSize: 12 }}>Đạt/Khá: 80%</div>
                    </div>
                    <div className="flex-fill bg-white border rounded-3 p-2 text-center shadow-sm">
                      <div className="text-muted mb-1" style={{ fontSize: 11 }}>90–94 đ</div>
                      <div className="fw-bold text-primary" style={{ fontSize: 12 }}>Tốt: 90%</div>
                    </div>
                    <div className="flex-fill bg-white border rounded-3 p-2 text-center shadow-sm">
                      <div className="text-muted mb-1" style={{ fontSize: 11 }}>95–99 đ</div>
                      <div className="fw-bold text-info" style={{ fontSize: 12 }}>Giỏi: 95%</div>
                    </div>
                    <div className="flex-fill bg-white border border-success rounded-3 p-2 text-center shadow-sm bg-success bg-opacity-10">
                      <div className="text-success mb-1" style={{ fontSize: 11 }}>100 đ</div>
                      <div className="fw-bold text-success" style={{ fontSize: 12 }}>Xuất sắc: 100%</div>
                    </div>
                  </div>
                </li>
                <li className="text-muted mt-2" style={{ fontSize: 12, listStyleType: "none", marginLeft: "-1rem" }}>
                  <div className="p-2 bg-light rounded-3 d-flex align-items-center gap-2 text-secondary">
                    <i className="bi bi-info-circle-fill text-warning"></i>
                    <span><strong>Ghi chú:</strong> Không chi trả lương hiệu suất nếu KPI &lt;80 điểm.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {showManagerKpiRules && <div className="offcanvas-backdrop fade show" onClick={() => setShowManagerKpiRules(false)} style={{ zIndex: 1065 }}></div>}

      {showKpiModal && (
        <div className="modal d-block fade show" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-fullscreen">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-bar-chart-line text-primary me-2"></i>
                  Theo dõi KPI
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowKpiModal(false)} aria-label="Close"></button>
              </div>
              <div className="modal-body bg-light p-0">
                <div className="row g-0 h-100">
                  {/* Left column - 4/12 */}
                  <div className="col-4 p-4 border-end bg-white" style={{ borderColor: "#e5e7eb" }}>
                    <SectionTitle title="Thông tin chung" icon="bi-info-circle" className="mb-4" />
                    <div className="d-flex flex-column gap-3 mt-4">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: 48, height: 48 }}>
                            <i className="bi bi-person text-primary fs-4"></i>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: 11 }}>Họ tên nhân viên</div>
                            <div className="fw-bold text-dark" style={{ fontSize: 14 }}>{session?.user?.name || "---"}</div>
                          </div>
                        </div>
                        {kpiActiveTab === 'manager' && (
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm"
                            onClick={() => setShowManagerKpiRules(true)}
                          >
                            <i className="bi bi-info-circle me-1"></i>Xem chi tiết
                          </button>
                        )}
                      </div>

                      <div className="border rounded-3 p-3 bg-light mt-2">
                        <div className="mb-3">
                          <div className="text-muted mb-1" style={{ fontSize: 12 }}>Phòng ban:</div>
                          <div className="fw-semibold text-dark" style={{ fontSize: 13 }}>{session?.user?.departmentName || "---"}</div>
                        </div>
                        <div className="row g-2">
                          <div className="col-6 border-end">
                            <div className="text-muted mb-1" style={{ fontSize: 12 }}>Chức vụ:</div>
                            <div className="fw-semibold text-dark" style={{ fontSize: 13 }}>{session?.user?.positionName || "---"}</div>
                          </div>
                          <div className="col-6 ps-3">
                            <div className="text-muted mb-1" style={{ fontSize: 12 }}>Số điện/Email:</div>
                            <div className="fw-semibold text-dark" style={{ fontSize: 13, wordBreak: "break-all" }}>{session?.user?.email || "---"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <SectionTitle title={`Kết quả KPI các tháng trong năm ${new Date().getFullYear()}`} icon="bi-calendar3" className="mb-3" />
                        <div className="border rounded-3 bg-white shadow-sm pt-4 px-2 mb-4" style={{ height: "250px" }}>
                          <ReactApexChart options={kpiChartOptions} series={kpiChartSeries} type="bar" height="100%" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right column - 8/12 */}
                  <div className="col-8 p-4 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <SectionTitle title="Chi tiết mức độ hoàn thành KPI" icon="bi-bar-chart-steps" className="mb-0" />
                      
                      <div className="d-flex bg-white border rounded-pill p-1 shadow-sm align-items-center">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                          const isCurrent = m === selectedMonth;
                          const isFuture = m > new Date().getMonth() + 1;
                          return (
                            <button 
                              key={m} 
                              className={`btn rounded-circle p-0 mx-1 d-flex align-items-center justify-content-center ${
                                isFuture 
                                  ? 'btn-light text-muted opacity-50' 
                                  : isCurrent 
                                    ? 'btn-primary fw-bold shadow-sm' 
                                    : 'btn-white text-dark hover-bg-light border-0'
                              }`} 
                              style={{ 
                                fontSize: 11, 
                                width: "30px",
                                height: "30px", 
                                transition: "all 0.2s",
                                cursor: isFuture ? 'not-allowed' : 'pointer'
                              }}
                              onClick={() => {
                                if (!isFuture) setSelectedMonth(m);
                              }}
                              disabled={isFuture}
                            >
                              T{m}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <ul className="nav nav-tabs mb-4">
                      <li className="nav-item">
                        <button 
                          className={`nav-link ${kpiActiveTab === 'manager' ? 'active fw-bold text-primary' : 'text-muted'}`} 
                          onClick={() => setKpiActiveTab('manager')}
                        >
                          <i className="bi bi-person-badge me-2"></i>Tài khoản trưởng phòng
                        </button>
                      </li>
                      <li className="nav-item">
                        <button 
                          className={`nav-link ${kpiActiveTab === 'employee' ? 'active fw-bold text-primary' : 'text-muted'}`} 
                          onClick={() => setKpiActiveTab('employee')}
                        >
                          <i className="bi bi-person me-2"></i>Tài khoản nhân viên
                        </button>
                      </li>
                    </ul>

                    {kpiActiveTab === 'manager' ? (
                      <div className="mt-4">
                        <Table 
                          columns={managerKpiColumns} 
                          rows={mockManagerKpiData} 
                          rowKey={(r) => r.id}
                          emptyText="Chưa có dữ liệu KPI" 
                          wrapperClassName="mkt-plan-table-no-min"
                          fixedLayout={false}
                          compact={true}
                        />
                      </div>
                    ) : (
                      <div className="mt-4">
                        <Table 
                          columns={employeeKpiColumns} 
                          rows={mockEmployeeKpiData} 
                          rowKey={(r) => r.id}
                          emptyText="Chưa có dữ liệu KPI" 
                          wrapperClassName="mkt-plan-table-no-min"
                          fixedLayout={false}
                          compact={true}
                        />

                        <div className="row g-3 mt-3">
                          <div className="col-12 col-xl-6">
                            <div className="bg-white border rounded-4 p-4 h-100 shadow-sm position-relative overflow-hidden transition" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
                              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#3b82f6" }} />
                              <SectionTitle 
                                title="Ngưỡng tính KPI" 
                                icon="bi-bullseye text-primary" 
                                className="mb-4"
                              />

                              <div className="bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 p-3 mb-4 d-flex align-items-center justify-content-center shadow-sm">
                                <i className="bi bi-star-fill text-warning fs-5 me-2"></i>
                                <span className="fw-semibold text-primary" style={{ fontSize: 14 }}>Tổng điểm KPI tháng {selectedMonth}:</span>
                                <span className="fw-bold text-primary ms-2" style={{ fontSize: 22, lineHeight: 1 }}>
                                  {mockEmployeeKpiData.reduce((sum, item) => sum + parseFloat(item.diem || '0'), 0)}
                                </span>
                                <span className="text-secondary fw-semibold ms-1" style={{ fontSize: 14 }}>/ 100</span>
                              </div>

                              <ul className="text-secondary ps-3 mb-0 d-flex flex-column gap-3" style={{ fontSize: 13, listStyleType: "circle", lineHeight: 1.6 }}>
                                <li><strong>Thang điểm đánh giá:</strong> KPI được chấm theo thang 100 điểm/tháng. Điểm trần tối đa là 100 điểm (không tính vượt mức).</li>
                                <li><strong>Cơ sở chi trả:</strong> Điểm số KPI đạt được trong tháng sẽ là căn cứ trực tiếp để tính toán và chi trả phần lương hiệu suất theo tỷ lệ phần trăm tương ứng.</li>
                                <li><strong>Mức điểm tối thiểu:</strong> Nếu KPI <span className="text-danger fw-bold">&lt;80 điểm</span>, nhân viên sẽ bị xếp loại Không đạt và <strong className="text-danger">không được hưởng lương hiệu suất</strong> (0%) trong tháng đó.</li>
                              </ul>
                            </div>
                          </div>

                          <div className="col-12 col-xl-6">
                            <div className="bg-white border rounded-4 p-4 h-100 shadow-sm position-relative overflow-hidden transition" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
                              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#10b981" }} />
                              <SectionTitle 
                                title="Cách tính lương hiệu suất (KPI)" 
                                icon="bi-cash-coin text-success" 
                                className="mb-4"
                              />
                              
                              <div className="bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 p-3 mb-4 d-flex align-items-center justify-content-center shadow-sm">
                                <i className="bi bi-award-fill text-success fs-5 me-2"></i>
                                <span className="fw-semibold text-success" style={{ fontSize: 14 }}>Thưởng KPI tháng tối đa:</span>
                                <span className="fw-bold text-success ms-2" style={{ fontSize: 22, lineHeight: 1 }}>5,000,000</span>
                                <span className="text-secondary fw-semibold ms-1" style={{ fontSize: 14 }}>VNĐ</span>
                              </div>

                              <ul className="text-secondary ps-3 mb-0 d-flex flex-column gap-2" style={{ fontSize: 13, listStyleType: "circle", lineHeight: 1.6 }}>
                                <li><strong>Thực nhận =</strong> Lương hợp đồng &times; Tỷ lệ hưởng</li>
                                <li>
                                  Tỷ lệ hưởng theo xếp hạng:
                                  <div className="d-flex flex-wrap gap-2 mt-2">
                                    <div className="flex-fill bg-white border rounded-3 p-2 text-center shadow-sm">
                                      <div className="text-muted mb-1" style={{ fontSize: 11 }}>80–89 đ</div>
                                      <div className="fw-bold text-dark" style={{ fontSize: 12 }}>Đạt/Khá: 80%</div>
                                    </div>
                                    <div className="flex-fill bg-white border rounded-3 p-2 text-center shadow-sm">
                                      <div className="text-muted mb-1" style={{ fontSize: 11 }}>90–94 đ</div>
                                      <div className="fw-bold text-primary" style={{ fontSize: 12 }}>Tốt: 90%</div>
                                    </div>
                                    <div className="flex-fill bg-white border rounded-3 p-2 text-center shadow-sm">
                                      <div className="text-muted mb-1" style={{ fontSize: 11 }}>95–99 đ</div>
                                      <div className="fw-bold text-info" style={{ fontSize: 12 }}>Giỏi: 95%</div>
                                    </div>
                                    <div className="flex-fill bg-white border border-success rounded-3 p-2 text-center shadow-sm bg-success bg-opacity-10">
                                      <div className="text-success mb-1" style={{ fontSize: 11 }}>100 đ</div>
                                      <div className="fw-bold text-success" style={{ fontSize: 12 }}>Xuất sắc: 100%</div>
                                    </div>
                                  </div>
                                </li>
                                <li className="text-muted mt-2" style={{ fontSize: 12, listStyleType: "none", marginLeft: "-1rem" }}>
                                  <div className="p-2 bg-light rounded-3 d-flex align-items-center gap-2 text-secondary">
                                    <i className="bi bi-info-circle-fill text-warning"></i>
                                    <span><strong>Ghi chú:</strong> Không chi trả lương hiệu suất nếu KPI &lt;80 điểm.</span>
                                  </div>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
