"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";
import { DealersManagementTable } from "@/components/dealers/DealersManagementTable";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { Table, TableColumn } from "@/components/ui/Table";
import { TableToolbar } from "@/components/ui/TableToolbar";
import { TablePagination } from "@/components/ui/TablePagination";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface DashboardData {
  kpi: {
    totalDealers: number;
    newDealersThisMonth: number;
    currentMonth: number;
    currentMonthRevenue: number;
    lastMonthRevenue: number;
    growthRate: number;
    targetRate: number;
    totalCommitted: number;
    totalYearRevenue: number;
    totalTickets: number;
    pendingTickets: number;
  };
  chart: {
    year: number;
    series: Array<{
      name: string;
      data: (number | null)[];
      color: string;
    }>;
  };
  topDealers: Array<{
    id: string;
    name: string;
    region: string;
    revenue: number;
    target: number;
  }>;
  tickets: Array<{
    id: string;
    code?: string;
    customerId?: string | null;
    dealer: string;
    address?: string | null;
    type: string;
    title: string;
    content?: string | null;
    status: string;
    date: string;
    handlerId?: string | null;
    handlerName?: string | null;
  }>;
}

const formatCurrency = (val: number) => {
  if (!val || val === 0) return '0 ₫';
  return `${Number(val).toLocaleString('vi-VN')} ₫`;
};

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  'In Progress': { label: 'Đang xử lý', bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', icon: 'bi-arrow-repeat' },
  'in_progress': { label: 'Đang xử lý', bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', icon: 'bi-arrow-repeat' },
  'Resolved': { label: 'Đã giải quyết', bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: 'bi-check-circle-fill' },
  'resolved': { label: 'Đã giải quyết', bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: 'bi-check-circle-fill' },
  'Pending': { label: 'Chờ xử lý', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: 'bi-clock-fill' },
  'pending': { label: 'Chờ xử lý', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: 'bi-clock-fill' },
  'Cancelled': { label: 'Đã hủy', bg: 'rgba(239,68,68,0.1)', color: '#ef4444', icon: 'bi-x-circle-fill' },
  'cancelled': { label: 'Đã hủy', bg: 'rgba(239,68,68,0.1)', color: '#ef4444', icon: 'bi-x-circle-fill' },
  'Active': { label: 'Đang hoạt động', bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: 'bi-check-circle-fill' },
  'Warning': { label: 'Cảnh báo', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: 'bi-exclamation-triangle-fill' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const item = STATUS_LABELS[status] || {
    label: status,
    bg: 'rgba(100,116,139,0.1)',
    color: '#64748b',
    icon: 'bi-info-circle-fill'
  };
  
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 12px', fontSize: '12px', fontWeight: 600,
      borderRadius: '99px', backgroundColor: item.bg, color: item.color
    }}>
      <i className={`bi ${item.icon}`}></i> {item.label}
    </span>
  );
};

function KpiCard({ label, value, sub, icon, color, trend, progress }: {
  label: string; value: string; sub?: string; icon: string; color: string;
  trend?: { val: string; up: boolean }; progress?: { cur: number; max: number };
}) {
  const pct = progress ? Math.round((progress.cur / progress.max) * 100) : null;
  return (
    <div className="app-card" style={{ padding: "10px", borderRadius: 10, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: color }} />
      <div style={{ paddingLeft: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>{label}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.1 }}>{value}</p>
              {trend && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: trend.up ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: 2 }}>
                  <i className={`bi ${trend.up ? "bi-arrow-up" : "bi-arrow-down"}`} style={{ fontSize: 9 }} />
                  {trend.val}
                </span>
              )}
            </div>
          </div>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: `color-mix(in srgb, ${color} 10%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`bi ${icon}`} style={{ fontSize: 13, color }} />
          </div>
        </div>
        
        {sub && !progress && <p style={{ margin: "2px 0 0", fontSize: 9.5, color: "var(--muted-foreground)" }}>{sub}</p>}
        {pct !== null && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>{sub || "Mục tiêu"}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color }}>{pct}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function DealersPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const TABS = [
    { id: 'overview', label: 'Tổng quan', icon: 'bi-grid-fill' },
    { id: 'list', label: 'Danh sách Đại lý', icon: 'bi-people-fill' },
    { id: 'helpdesk', label: 'Hỗ trợ đại lý', icon: 'bi-headset' },
  ];

  const fetchDashboard = useCallback(async (year: number) => {
    try {
      setLoadingDashboard(true);
      const res = await fetch(`/api/marketing/dealers/dashboard?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (e) {
      console.error("Fetch dashboard error:", e);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(selectedYear);
  }, [fetchDashboard, selectedYear]);

  // Tự động nạp lại dữ liệu nếu chuyển sang tab overview mà chưa có dữ liệu
  useEffect(() => {
    if (activeTab === 'overview' && !dashboardData && !loadingDashboard) {
      fetchDashboard(selectedYear);
    }
  }, [activeTab, dashboardData, loadingDashboard, fetchDashboard, selectedYear]);

  const handleTotalChange = useCallback((newTotal: number) => {
    setDashboardData(prev => {
      if (!prev || prev.kpi.totalDealers === newTotal) return prev;
      return {
        ...prev,
        kpi: { ...prev.kpi, totalDealers: newTotal }
      };
    });
  }, []);

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Quản lý và hỗ trợ đại lý"
        description="Mạng lưới đối tác, theo dõi hiệu suất và trung tâm phân phối tài nguyên"
        color="indigo"
        icon="bi-building-fill"
      />

      {/* Khoảng trống bên ngoài thẻ card chính chính xác là 8px */}
      <div 
        className="flex-grow-1 d-flex flex-column" 
        style={{ 
          background: "color-mix(in srgb, var(--muted) 40%, transparent)", 
          minHeight: 0, 
          padding: "8px" 
        }}
      >
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: 0 }}>
          {/* TAB NAVIGATION */}
          <div className="px-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '12px 20px',
                      border: 'none',
                      background: 'transparent',
                      borderBottom: isActive ? '3px solid #003087' : '3px solid transparent',
                      color: isActive ? '#003087' : 'var(--muted-foreground)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <i className={`bi ${tab.icon}`}></i> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div 
            className={`flex-grow-1 ${activeTab === 'list' || activeTab === 'helpdesk' ? 'p-0 d-flex flex-column overflow-hidden' : 'overflow-auto p-4 custom-scrollbar'}`} 
            style={{ animation: 'fadeIn 0.3s ease-in-out', minHeight: 0 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab 
                data={dashboardData}
                loading={loadingDashboard}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                onViewAllDealers={() => setActiveTab('list')}
                onRefresh={() => fetchDashboard(selectedYear)}
              />
            )}
            {activeTab === 'list' && (
              <DealersManagementTable 
                onTotalChange={handleTotalChange}
                className="flex-grow-1"
              />
            )}
            {activeTab === 'helpdesk' && (
              <HelpdeskTab 
                tickets={dashboardData?.tickets || []} 
                onRefreshDashboard={() => fetchDashboard(selectedYear)}
              />
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .dealer-table-row:hover { background-color: rgba(0, 48, 135, 0.02) !important; }
        .dealer-card-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
      `}} />
    </div>
  );
}

// ── Tab Tổng quan liên kết DB thực tế ──────────────────────────────────────────
function OverviewTab({
  data,
  loading,
  selectedYear,
  onYearChange,
  onViewAllDealers,
  onRefresh,
}: {
  data: DashboardData | null;
  loading: boolean;
  selectedYear: number;
  onYearChange: (y: number) => void;
  onViewAllDealers: () => void;
  onRefresh?: () => void;
}) {
  const kpi = data?.kpi;
  const curMonth = kpi?.currentMonth || (new Date().getMonth() + 1);

  // Hiển thị doanh thu tháng hiện tại nếu có, nếu bằng 0 thì lấy tháng gần nhất có doanh thu
  const displayRevenue = (kpi?.currentMonthRevenue && kpi.currentMonthRevenue > 0)
    ? kpi.currentMonthRevenue
    : (kpi?.lastMonthRevenue && kpi.lastMonthRevenue > 0 ? kpi.lastMonthRevenue : (kpi?.totalYearRevenue || 0));

  const displayRevenueLabel = `Doanh thu qua Đại lý trong tháng ${kpi?.currentMonth || curMonth}`;

  const growth = kpi?.growthRate || 0;
  const newDealers = (kpi as any)?.newDealersThisMonth || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
      {/* KPI Cards thực tế */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <KpiCard
          label="Tổng số Đại lý" 
          value={kpi ? `${kpi.totalDealers}` : "343"} 
          sub={newDealers > 0 ? `+${newDealers} mới trong tháng ${curMonth}` : `0 mới trong tháng ${curMonth}`}
          icon="bi-buildings-fill" color="#003087"
          trend={newDealers > 0 ? { val: `+${newDealers}`, up: true } : undefined}
        />
        <KpiCard
          label={displayRevenueLabel}
          value={formatCurrency(displayRevenue)}
          sub={growth !== 0 ? `${growth > 0 ? '+' : ''}${growth}% so với tháng trước` : "Dữ liệu thực tế từ đơn hàng"}
          icon="bi-graph-up-arrow" color="#10b981"
          trend={growth !== 0 ? { val: `${growth > 0 ? '+' : ''}${growth}%`, up: growth >= 0 } : undefined}
        />
        <KpiCard
          label="Tỷ lệ đạt Target năm" 
          value={`${kpi?.targetRate || 0}%`} 
          sub={kpi && kpi.totalCommitted > 0 ? `Đạt ${formatCurrency(kpi.totalYearRevenue)} / ${formatCurrency(kpi.totalCommitted)}` : "Mục tiêu cam kết năm"}
          icon="bi-bullseye" color="#f59e0b"
          progress={{ cur: Math.max(kpi?.targetRate || 0, 1), max: 100 }}
        />
        <KpiCard
          label="Tickets Yêu cầu mới" 
          value={`${kpi?.totalTickets || 0}`} 
          sub={`${kpi?.pendingTickets || 0} đang xử lý`}
          icon="bi-chat-left-dots-fill" color="#f43f5e"
        />
      </div>

      {/* Main Charts & Leaderboard thực tế từ DB */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px', flex: 1, minHeight: 0 }}>
        {/* Chart */}
        <div className="app-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
               <i className="bi bi-pie-chart-fill" style={{ color: '#003087' }}></i> Cơ cấu doanh thu qua đại lý năm {selectedYear}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onRefresh && (
                <button
                  type="button"
                  className="btn btn-sm btn-light border p-1 px-2 text-muted"
                  title="Tải lại dữ liệu"
                  onClick={onRefresh}
                  disabled={loading}
                  style={{ borderRadius: '8px', height: '32px' }}
                >
                  <i className={`bi bi-arrow-clockwise ${loading ? 'd-inline-block' : ''}`} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                </button>
              )}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select 
                  value={selectedYear}
                  onChange={e => onYearChange(Number(e.target.value))}
                  style={{ 
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    padding: '6px 30px 6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)', 
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    fontWeight: 600,
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <option value={2026}>Năm 2026</option>
                  <option value={2025}>Năm 2025</option>
                </select>
                <i 
                  className="bi bi-chevron-down text-muted" 
                  style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    fontSize: '11px', 
                    pointerEvents: 'none' 
                  }} 
                />
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {loading ? (
              <div className="d-flex align-items-center justify-content-center h-100 text-muted small">
                <div className="spinner-border spinner-border-sm text-primary me-2" /> Đang tải biểu đồ doanh thu...
              </div>
            ) : data?.chart?.series ? (
              <YearAreaChart series={data.chart.series} height="100%" showLegend={true} exactTooltip={true} unit="₫" />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100 text-muted small">
                Chưa có dữ liệu doanh số
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard thực tế */}
        <div className="app-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
               <i className="bi bi-award-fill" style={{ color: '#f59e0b' }}></i> Bảng xếp hạng doanh thu
            </h3>
            <span className="badge bg-light text-muted border px-2 py-1" style={{ fontSize: '11px' }}>
              Top 5 Đại lý
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {(!data?.topDealers || data.topDealers.length === 0) ? (
              <div className="text-center text-muted py-4 small">Chưa có phát sinh giao dịch</div>
            ) : (
              data.topDealers.map((dealer, idx) => (
                <div key={dealer.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', fontWeight: 700, fontSize: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: idx === 0 ? 'rgba(245,158,11,0.2)' : idx === 1 ? 'rgba(100,116,139,0.2)' : idx === 2 ? 'rgba(194,65,12,0.2)' : 'rgba(0,0,0,0.05)',
                    color: idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#c2410c' : 'var(--muted-foreground)'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dealer.name}
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <i className="bi bi-geo-alt me-1 text-secondary" style={{ fontSize: '11px' }} />
                      {(dealer as any).address || dealer.region || 'Toàn quốc'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#003087' }}>
                      {formatCurrency(dealer.revenue || 0)}
                    </div>
                    {dealer.target > 0 && dealer.revenue === 0 && (
                      <div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>
                        Cam kết: {formatCurrency(dealer.target)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <button 
            onClick={onViewAllDealers}
            style={{ 
              width: '100%', padding: '10px', marginTop: '20px', borderRadius: '10px', border: 'none',
              background: 'var(--muted)', color: 'var(--foreground)', fontWeight: 600, fontSize: '13px', cursor: 'pointer'
            }}
          >
            Xem tất cả đại lý
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab Hỗ trợ đại lý ──────────────────────────────────────────────────────────
function HelpdeskTab({ 
  tickets: initialTickets,
  onRefreshDashboard,
}: { 
  tickets: DashboardData['tickets'];
  onRefreshDashboard?: () => void;
}) {
  const [ticketsList, setTicketsList] = useState<DashboardData['tickets']>(initialTickets);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<DashboardData['tickets'][0] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Danh sách đại lý & nhân viên
  const [dealers, setDealers] = useState<Array<{ id: string; name: string; address?: string | null; dienThoai?: string | null }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; fullName: string; departmentName?: string | null }>>([]);
  
  // Autocomplete Đại lý
  const [dealerSearch, setDealerSearch] = useState("");
  const [selectedDealer, setSelectedDealer] = useState<{ id: string; name: string; address?: string | null } | null>(null);
  const [showDealerMenu, setShowDealerMenu] = useState(false);

  // Autocomplete Người xử lý
  const [handlerSearch, setHandlerSearch] = useState("");
  const [selectedHandler, setSelectedHandler] = useState<{ id: string; fullName: string; departmentName?: string | null } | null>(null);
  const [showHandlerMenu, setShowHandlerMenu] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: "Cấp phát vật tư & phụ kiện",
    title: "",
    content: "",
    status: "In Progress",
    requestDate: new Date().toISOString().slice(0, 10),
  });

  // Tải danh sách đại lý và nhân viên khi mở offcanvas
  useEffect(() => {
    if (isOffcanvasOpen) {
      if (dealers.length === 0) {
        fetch("/api/plan-finance/customers?pageSize=1000")
          .then(res => res.json())
          .then(data => {
            if (data?.customers) setDealers(data.customers);
          })
          .catch(e => console.error("Lỗi fetch dealers:", e));
      }
      if (employees.length === 0) {
        fetch("/api/hr/employees?pageSize=200")
          .then(res => res.json())
          .then(data => {
            if (data?.employees) setEmployees(data.employees);
          })
          .catch(e => console.error("Lỗi fetch employees:", e));
      }
    }
  }, [isOffcanvasOpen, dealers.length, employees.length]);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing/dealers/tickets?pageSize=100");
      if (res.ok) {
        const data = await res.json();
        if (data?.tickets) {
          setTicketsList(data.tickets);
        }
      }
    } catch (e) {
      console.error("Lỗi fetch tickets:", e);
    }
  }, []);

  // Tải danh sách tickets từ database khi vào tab
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Đồng bộ khi initialTickets thay đổi nếu ticketsList đang rỗng
  useEffect(() => {
    if (initialTickets && initialTickets.length > 0) {
      setTicketsList(initialTickets);
    }
  }, [initialTickets]);

  // Lọc danh sách đại lý gợi ý
  const matchingDealers = useMemo(() => {
    if (!dealerSearch.trim()) return dealers.slice(0, 8);
    const q = dealerSearch.toLowerCase();
    return dealers
      .filter(d => d.name.toLowerCase().includes(q) || (d.dienThoai && d.dienThoai.includes(q)))
      .slice(0, 10);
  }, [dealers, dealerSearch]);

  // Lọc danh sách nhân viên gợi ý theo tên và tên phòng ban
  const matchingEmployees = useMemo(() => {
    if (!handlerSearch.trim()) return employees.slice(0, 8);
    const q = handlerSearch.toLowerCase();
    return employees
      .filter(e => e.fullName.toLowerCase().includes(q) || (e.departmentName && e.departmentName.toLowerCase().includes(q)))
      .slice(0, 10);
  }, [employees, handlerSearch]);

  // Lọc tickets
  const filteredTickets = useMemo(() => {
    return ticketsList.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        t.dealer.toLowerCase().includes(q) ||
        (t.address && t.address.toLowerCase().includes(q)) ||
        t.type.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.content && t.content.toLowerCase().includes(q));
      
      const matchType = !typeFilter || t.type === typeFilter;
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [ticketsList, searchQuery, typeFilter, statusFilter]);

  // Phân trang
  const totalCount = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  // Logic chọn nhiều dòng
  const isAllSelected = paginatedTickets.length > 0 && paginatedTickets.every(t => selectedIds.includes(t.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = paginatedTickets.map(t => t.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedTickets.map(t => t.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };
  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Xóa các dòng đã chọn thông qua ConfirmDialog
  const handleConfirmDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      setDeleting(true);
      const res = await fetch("/api/marketing/dealers/tickets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        setTicketsList(prev => prev.filter(t => !selectedIds.includes(t.id)));
        setSelectedIds([]);
        setShowConfirmDelete(false);
        fetchTickets();
        onRefreshDashboard?.();
      } else {
        const data = await res.json();
        alert(data.error || "Có lỗi xảy ra khi xóa");
      }
    } catch (err) {
      console.error("Delete tickets error:", err);
      alert("Lỗi kết nối khi xóa");
    } finally {
      setDeleting(false);
    }
  };

  // Mở offcanvas tạo mới
  const handleOpenCreate = () => {
    setEditingTicket(null);
    setDealerSearch("");
    setSelectedDealer(null);
    setHandlerSearch("");
    setSelectedHandler(null);
    setFormData({
      type: "Cấp phát vật tư & phụ kiện",
      title: "",
      content: "",
      status: "In Progress",
      requestDate: new Date().toISOString().slice(0, 10),
    });
    setIsOffcanvasOpen(true);
  };

  // Mở offcanvas chỉnh sửa khi nhấn vào dòng bảng
  const handleOpenEdit = (ticket: DashboardData['tickets'][0]) => {
    setEditingTicket(ticket);
    setDealerSearch(ticket.dealer || "");
    setSelectedDealer(ticket.address ? { id: ticket.customerId || "", name: ticket.dealer, address: ticket.address } : null);
    setHandlerSearch(ticket.handlerName || "");
    const foundEmp = employees.find(e => e.id === ticket.handlerId || e.fullName === ticket.handlerName);
    setSelectedHandler(foundEmp ? { id: foundEmp.id, fullName: foundEmp.fullName, departmentName: foundEmp.departmentName } : (ticket.handlerId ? { id: ticket.handlerId, fullName: ticket.handlerName || "" } : null));
    
    // Parse date sang YYYY-MM-DD nếu hợp lệ
    let parsedDate = new Date().toISOString().slice(0, 10);
    if (ticket.date) {
      const parts = ticket.date.split('/');
      if (parts.length === 3) {
        parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    setFormData({
      type: ticket.type || "Cấp phát vật tư & phụ kiện",
      title: ticket.title || "",
      content: ticket.content || "",
      status: ticket.status || "In Progress",
      requestDate: parsedDate,
    });
    setIsOffcanvasOpen(true);
  };

  // Submit lưu phiếu (Thêm mới hoặc Cập nhật)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerSearch.trim() || !formData.title.trim()) return;

    try {
      setSubmitting(true);
      const isEdit = Boolean(editingTicket);
      const url = "/api/marketing/dealers/tickets";
      const method = isEdit ? "PATCH" : "POST";
      const payload: any = {
        customerId: selectedDealer?.id || null,
        dealerName: dealerSearch.trim(),
        type: formData.type,
        title: formData.title.trim(),
        content: formData.content.trim(),
        requestDate: formData.requestDate,
        handlerId: selectedHandler?.id || null,
      };

      if (isEdit && editingTicket) {
        payload.id = editingTicket.id;
        payload.status = formData.status;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.ticket) {
        if (isEdit) {
          setTicketsList(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
        } else {
          setTicketsList(prev => [data.ticket, ...prev]);
        }
        setIsOffcanvasOpen(false);
        fetchTickets();
        onRefreshDashboard?.();
      } else {
        alert(data.error || "Có lỗi xảy ra khi lưu phiếu hỗ trợ");
      }
    } catch (err) {
      console.error("Save ticket error:", err);
      alert("Lỗi kết nối khi lưu phiếu hỗ trợ");
    } finally {
      setSubmitting(false);
    }
  };

  // Cột bảng: THÊM CỘT CHECKBOX ĐẦU DÒNG, BỎ MÃ TK, HIỂN THỊ ĐỊA CHỈ DƯỚI TÊN ĐẠI LÝ
  const columns: TableColumn<DashboardData['tickets'][0]>[] = [
    {
      header: (
        <div className="d-flex align-items-center justify-content-center" style={{ width: "100%" }}>
          <input
            type="checkbox"
            className="form-check-input m-0 cursor-pointer"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            title="Chọn tất cả trên trang này"
          />
        </div>
      ),
      width: 44,
      align: "center",
      render: (row) => (
        <div 
          className="d-flex align-items-center justify-content-center" 
          style={{ width: "100%" }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="form-check-input m-0 cursor-pointer"
            checked={selectedIds.includes(row.id)}
            onChange={() => toggleSelectRow(row.id)}
          />
        </div>
      ),
    },
    {
      header: "ĐẠI LÝ",
      width: 280,
      render: (row) => (
        <div className="d-flex flex-column py-1" style={{ lineHeight: 1.35 }}>
          <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>
            {row.dealer}
          </span>
          {row.address ? (
            <span style={{ fontSize: '11.5px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
              <i className="bi bi-geo-alt me-1 text-primary" style={{ fontSize: '11px' }}></i>
              {row.address}
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontStyle: 'italic', marginTop: '2px' }}>
              Chưa có địa chỉ
            </span>
          )}
        </div>
      ),
    },
    {
      header: "LOẠI YÊU CẦU",
      width: 210,
      render: (row) => (
        <span style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>
          {row.type}
        </span>
      ),
    },
    {
      header: "TIÊU ĐỀ / NỘI DUNG",
      render: (row) => (
        <div className="d-flex flex-column py-1">
          <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
            {row.title}
          </span>
          {row.content && row.content !== row.title && (
            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
              {row.content}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "TRẠNG THÁI",
      width: 140,
      align: "center",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "NGÀY TẠO",
      width: 120,
      align: "center",
      render: (row) => (
        <span style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>
          {row.date}
        </span>
      ),
    },
  ];

  return (
    <div className="d-flex flex-column h-100 position-relative overflow-hidden" style={{ minHeight: 0 }}>
      <FullWidthTableLayout
        className="flex-grow-1 overflow-hidden"
        header={
          <TableToolbar
            className="w-100 flex-nowrap"
            filters={
              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                <FilterSelect
                  value={typeFilter}
                  onChange={(v) => { setTypeFilter(v); setPage(1); }}
                  placeholder="Loại yêu cầu"
                  options={[
                    { label: "Cấp phát vật tư & phụ kiện", value: "Cấp phát vật tư & phụ kiện" },
                    { label: "Yêu cầu đóng gói phân lô", value: "Yêu cầu đóng gói phân lô" },
                    { label: "Bảo hành & Linh kiện", value: "Bảo hành & Linh kiện" },
                    { label: "Hỗ trợ catalog & POSM", value: "Hỗ trợ catalog & POSM" },
                    { label: "Hỗ trợ kỹ thuật & chính sách", value: "Hỗ trợ kỹ thuật & chính sách" },
                  ]}
                  width={210}
                />
                <FilterSelect
                  value={statusFilter}
                  onChange={(v) => { setStatusFilter(v); setPage(1); }}
                  placeholder="Trạng thái"
                  options={[
                    { label: "Đang xử lý", value: "In Progress" },
                    { label: "Đã giải quyết", value: "Resolved" },
                    { label: "Chờ xử lý", value: "Pending" },
                    { label: "Đã hủy", value: "Cancelled" },
                  ]}
                  width={150}
                />
              </div>
            }
            searchValue={searchQuery}
            onSearchChange={(v) => { setSearchQuery(v); setPage(1); }}
            searchPlaceholder="Tìm theo đại lý, tiêu đề, địa chỉ, nội dung..."
            searchFlex={true}
            actions={
              <div className="d-flex align-items-center gap-2">
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={deleting}
                    className="btn btn-danger text-white d-flex align-items-center gap-1.5 shadow-sm flex-shrink-0"
                    style={{
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: "13px",
                      height: 34,
                      padding: "0 10px 0 12px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {deleting ? (
                      <span className="spinner-border spinner-border-sm me-1" />
                    ) : (
                      <i className="bi bi-trash3" />
                    )}
                    <span>Xóa</span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "20px",
                        height: "20px",
                        borderRadius: "999px",
                        backgroundColor: "#ffffff",
                        color: "#dc3545",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "0 5px",
                        marginLeft: "4px",
                        lineHeight: 1
                      }}
                    >
                      {selectedIds.length}
                    </span>
                  </button>
                )}
                <button
                  onClick={handleOpenCreate}
                  className="btn text-white d-flex align-items-center gap-1 shadow-sm flex-shrink-0"
                  style={{
                    backgroundColor: "#003087",
                    borderColor: "#003087",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: "13px",
                    height: 34,
                    padding: "0 14px",
                    whiteSpace: "nowrap"
                  }}
                >
                  <i className="bi bi-plus-lg" />
                  <span>Thêm mới</span>
                </button>
              </div>
            }
          />
        }
        table={
          <Table
            rows={paginatedTickets}
            columns={columns}
            rowKey={(r) => r.id}
            compact
            stickyHeader
            onRowClick={(row) => handleOpenEdit(row)}
            wrapperClassName="border-0"
            emptyText="Không tìm thấy yêu cầu hỗ trợ nào"
          />
        }
        footer={
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[10, 15, 25, 50]}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
            totalCount={totalCount}
            itemName="yêu cầu"
          />
        }
      />

      {/* Offcanvas Tạo mới / Chỉnh sửa phiếu hỗ trợ đại lý (Rộng 400px) */}
      {isOffcanvasOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1050, opacity: 0.4 }}
            onClick={() => setIsOffcanvasOpen(false)}
          />
          <div
            className="offcanvas offcanvas-end show shadow"
            tabIndex={-1}
            style={{
              visibility: 'visible',
              zIndex: 1055,
              width: '100%',
              maxWidth: '400px',
              backgroundColor: 'var(--card, #ffffff)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="offcanvas-header border-bottom py-3 px-3 d-flex align-items-center justify-content-between flex-shrink-0">
              <h5 className="offcanvas-title fw-bold fs-6 m-0 d-flex align-items-center gap-2">
                <i className={`bi ${editingTicket ? 'bi-pencil-square text-warning' : 'bi-headset text-primary'}`} />
                {editingTicket ? "Cập nhật phiếu hỗ trợ đại lý" : "Tạo phiếu hỗ trợ đại lý"}
              </h5>
              <button
                type="button"
                className="btn-close text-reset shadow-none"
                onClick={() => setIsOffcanvasOpen(false)}
                aria-label="Close"
              />
            </div>

            <form onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1 overflow-hidden m-0">
              <div 
                className="offcanvas-body flex-grow-1 overflow-auto p-3.5 d-flex flex-column"
                style={{ gap: "16px", padding: "18px 18px" }}
              >
                
                {/* Tên đại lý với danh sách gợi ý Autocomplete */}
                <div className="position-relative flex-shrink-0">
                  <label className="form-label small fw-bold text-muted mb-1.5 d-block">
                    Tên Đại lý <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    style={{ height: "38px", fontSize: "13.5px", borderRadius: "8px" }}
                    placeholder="Gõ để tìm kiếm đại lý..."
                    value={dealerSearch}
                    onChange={(e) => {
                      setDealerSearch(e.target.value);
                      setShowDealerMenu(true);
                      if (selectedDealer && selectedDealer.name !== e.target.value) {
                        setSelectedDealer(null);
                      }
                    }}
                    onFocus={() => setShowDealerMenu(true)}
                  />

                  {/* Dropdown gợi ý đại lý */}
                  {showDealerMenu && matchingDealers.length > 0 && (
                    <div
                      className="position-absolute w-100 bg-white border rounded-3 shadow-lg custom-scrollbar mt-1"
                      style={{
                        zIndex: 1060,
                        maxHeight: "200px",
                        overflowY: "auto",
                        left: 0,
                        top: "100%",
                      }}
                    >
                      {matchingDealers.map(d => (
                        <div
                          key={d.id}
                          className="px-3 py-2 border-bottom cursor-pointer hover-bg-light"
                          style={{ cursor: "pointer", transition: "background 0.15s" }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setDealerSearch(d.name);
                            setSelectedDealer(d);
                            setShowDealerMenu(false);
                          }}
                        >
                          <div className="fw-bold small text-dark">{d.name}</div>
                          {d.address && (
                            <div className="text-muted" style={{ fontSize: "11px" }}>
                              <i className="bi bi-geo-alt me-1 text-danger" style={{ fontSize: "10px" }} />
                              {d.address}
                            </div>
                          )}
                          {d.dienThoai && (
                            <div className="text-muted" style={{ fontSize: "11px" }}>
                              <i className="bi bi-telephone me-1" style={{ fontSize: "10px" }} />
                              {d.dienThoai}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nhãn nhỏ hiển thị địa chỉ của đại lý khi đã chọn */}
                  {selectedDealer ? (
                    <div className="mt-1.5 d-flex align-items-center gap-1" style={{ fontSize: '11.5px', color: 'var(--muted-foreground)' }}>
                      <i className="bi bi-geo-alt-fill text-danger" style={{ fontSize: '11px' }} />
                      <span>{selectedDealer.address || "Đại lý chưa có thông tin địa chỉ"}</span>
                    </div>
                  ) : null}
                </div>

                {/* Loại yêu cầu */}
                <div className="flex-shrink-0">
                  <label className="form-label small fw-bold text-muted mb-1.5 d-block">
                    Loại yêu cầu <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    style={{ height: "38px", fontSize: "13.5px", borderRadius: "8px" }}
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Cấp phát vật tư & phụ kiện">Cấp phát vật tư & phụ kiện</option>
                    <option value="Yêu cầu đóng gói phân lô">Yêu cầu đóng gói phân lô</option>
                    <option value="Bảo hành & Linh kiện">Bảo hành & Linh kiện</option>
                    <option value="Hỗ trợ catalog & POSM">Hỗ trợ catalog & POSM</option>
                    <option value="Hỗ trợ kỹ thuật & chính sách">Hỗ trợ kỹ thuật & chính sách</option>
                  </select>
                </div>

                {/* Tiêu đề / Nội dung vắn tắt */}
                <div className="flex-shrink-0">
                  <label className="form-label small fw-bold text-muted mb-1.5 d-block">
                    Tiêu đề / Nội dung vắn tắt <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    style={{ height: "38px", fontSize: "13.5px", borderRadius: "8px" }}
                    placeholder="VD: Cấp phát mẫu vòi sen, Đơn hàng DBH-..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Ngày yêu cầu & Người xử lý dạng textbox có gợi ý */}
                <div className="d-flex gap-2.5 flex-shrink-0">
                  <div style={{ width: "155px", flexShrink: 0 }}>
                    <label className="form-label small fw-bold text-muted mb-1.5 d-block">
                      Ngày yêu cầu <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      style={{ height: "38px", fontSize: "13.5px", borderRadius: "8px" }}
                      value={formData.requestDate}
                      onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                    />
                  </div>
                  
                  {/* Người xử lý với Autocomplete tương tự Tên đại lý */}
                  <div className="flex-grow-1 position-relative" style={{ minWidth: 0 }}>
                    <label className="form-label small fw-bold text-muted mb-1.5 d-block">
                      Người xử lý
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ height: "38px", fontSize: "13.5px", borderRadius: "8px" }}
                      placeholder="Chọn nhân viên..."
                      value={handlerSearch}
                      onChange={(e) => {
                        setHandlerSearch(e.target.value);
                        setShowHandlerMenu(true);
                        if (selectedHandler && selectedHandler.fullName !== e.target.value) {
                          setSelectedHandler(null);
                        }
                      }}
                      onFocus={() => setShowHandlerMenu(true)}
                    />

                    {/* Dropdown gợi ý nhân viên */}
                    {showHandlerMenu && matchingEmployees.length > 0 && (
                      <div
                        className="position-absolute w-100 bg-white border rounded-3 shadow-lg custom-scrollbar mt-1"
                        style={{
                          zIndex: 1060,
                          maxHeight: "180px",
                          overflowY: "auto",
                          left: 0,
                          top: "100%",
                        }}
                      >
                        {matchingEmployees.map(emp => (
                          <div
                            key={emp.id}
                            className="px-3 py-2 border-bottom cursor-pointer hover-bg-light"
                            style={{ cursor: "pointer", transition: "background 0.15s" }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setHandlerSearch(emp.fullName);
                              setSelectedHandler(emp);
                              setShowHandlerMenu(false);
                            }}
                          >
                            <div className="fw-bold small text-dark">{emp.fullName}</div>
                            {emp.departmentName && (
                              <div className="text-muted" style={{ fontSize: "11px" }}>
                                <i className="bi bi-building me-1 text-primary" style={{ fontSize: "10px" }} />
                                {emp.departmentName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Nhãn nhỏ hiển thị phòng ban của nhân viên đã chọn */}
                    {selectedHandler?.departmentName && (
                      <div className="mt-1 d-flex align-items-center gap-1 text-muted" style={{ fontSize: "11px" }}>
                        <i className="bi bi-building text-primary" />
                        <span>{selectedHandler.departmentName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nếu ở chế độ chỉnh sửa: Bổ sung ô chọn Trạng thái */}
                {editingTicket && (
                  <div className="flex-shrink-0">
                    <label className="form-label small fw-bold text-muted mb-1.5 d-block">
                      Trạng thái xử lý
                    </label>
                    <select
                      className="form-select"
                      style={{ height: "38px", fontSize: "13.5px", borderRadius: "8px" }}
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="In Progress">Đang xử lý</option>
                      <option value="Resolved">Đã giải quyết</option>
                      <option value="Pending">Chờ xử lý</option>
                      <option value="Cancelled">Đã hủy</option>
                    </select>
                  </div>
                )}

                {/* Ghi chú chi tiết: Tự động chiếm hết chiều cao khả dụng còn lại */}
                <div className="d-flex flex-column flex-grow-1" style={{ minHeight: "130px" }}>
                  <label className="form-label small fw-bold text-muted mb-1.5 d-block">
                    Ghi chú chi tiết
                  </label>
                  <textarea
                    className="form-control flex-grow-1"
                    style={{ resize: "none", fontSize: "13.5px", borderRadius: "8px", padding: "10px 12px" }}
                    placeholder="Nhập thông tin chi tiết nội dung cần hỗ trợ..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>

              </div>

              <div className="border-top p-3 d-flex align-items-center justify-content-end gap-2 bg-light flex-shrink-0">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3"
                  onClick={() => setIsOffcanvasOpen(false)}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary px-3 fw-bold"
                  style={{ backgroundColor: "#003087", borderColor: "#003087" }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2 me-1" />
                      {editingTicket ? "Lưu thay đổi" : "Lưu phiếu"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ConfirmDialog thay thế window.confirm */}
      <ConfirmDialog
        open={showConfirmDelete}
        title="Xác nhận xóa yêu cầu hỗ trợ"
        message={`Bạn có chắc chắn muốn xóa ${selectedIds.length} yêu cầu hỗ trợ đã chọn không?`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setShowConfirmDelete(false);
        }}
      />
    </div>
  );
}
