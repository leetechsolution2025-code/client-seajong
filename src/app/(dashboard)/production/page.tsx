"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ProductionOrderDetailOffcanvas } from "@/components/production/ProductionOrderDetailOffcanvas";

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    running: { label: "Đang thực hiện", cls: "bg-success-subtle text-success" },
    pending: { label: "Chưa thực hiện", cls: "bg-warning-subtle text-warning" },
    stopped: { label: "Tạm dừng", cls: "bg-danger-subtle text-danger" },
    completed: { label: "Đã thực hiện", cls: "bg-primary-subtle text-primary" },
  };
  const m = map[status] ?? { label: status, cls: "bg-light text-dark" };
  return (
    <span className={`badge rounded-pill px-2 ${m.cls}`} style={{ fontSize: 10, fontWeight: 600 }}>
      {m.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProductionDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ runningOrders: 0, todayProductionQty: 0, oee: 0, defectRate: 0 });

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterToday, setFilterToday] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOrders = () => {
    const params = new URLSearchParams();
    if (filterStatus) params.append("status", filterStatus);
    if (filterDate) params.append("date", filterDate);
    if (filterToday) params.append("todayCompleted", "true");
    if (searchQuery) params.append("q", searchQuery);

    fetch(`/api/production/dashboard/recent-orders?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecentOrders(data);
        }
      })
      .catch(err => console.error("Error fetching recent orders:", err));
  };

  const fetchData = () => {
    fetchOrders();

    fetch("/api/production/dashboard/kpis")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setKpis(data);
      })
      .catch(err => console.error("Error fetching KPIs:", err));

    fetch("/api/production/dashboard/incidents")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setIncidents(data);
      })
      .catch(err => console.error("Error fetching incidents:", err));
  };

  useEffect(() => {
    fetchData();

    // Giả lập loading
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, filterDate, filterToday, searchQuery]);

  return (
    <StandardPage
      title="Quản trị sản xuất"
      description="Hệ thống điều hành và giám sát sản xuất Seajong"
      icon="bi-tools"
      color="blue"
      useCard={false}
    >

      <div className="row g-3 flex-grow-1" style={{ minHeight: 0 }}>
        {/* ── Left Column: Orders & Progress ── */}
        <div className="col-12 d-flex flex-column gap-3">
          
          {/* Recent Orders */}
          <div className="bg-white rounded-4 shadow-sm border p-3 flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
            <SectionTitle 
              title="Danh sách lệnh sản xuất" 
              icon="bi-file-earmark-text-fill" 
            />
            <div className="d-flex flex-wrap align-items-center gap-3 mb-3 pb-2 border-bottom">
              <select 
                className="form-select form-select-sm shadow-none" 
                style={{ width: 140, fontSize: 12 }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="pending">Chưa thực hiện</option>
                <option value="running">Đang thực hiện</option>
                <option value="completed">Đã hoàn thành</option>
              </select>
              <div className="input-group input-group-sm" style={{ width: filterDate && !filterToday ? 154 : 130 }}>
                <input 
                  type="date" 
                  className={`form-control text-muted shadow-none ${filterDate && !filterToday ? 'border-end-0' : ''}`}
                  style={{ fontSize: 12 }} 
                  title="Lọc theo thời gian" 
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  disabled={filterToday}
                />
                {filterDate && !filterToday && (
                  <button className="btn btn-outline-secondary border text-muted bg-white" type="button" onClick={() => setFilterDate("")} style={{ padding: "0 6px" }}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
              <div className="form-check form-switch mb-0">
                <input 
                  className="form-check-input shadow-none" 
                  type="checkbox" 
                  id="todaySwitch" 
                  checked={filterToday}
                  onChange={e => {
                    setFilterToday(e.target.checked);
                    if (e.target.checked) setFilterDate("");
                  }}
                />
                <label className="form-check-label text-muted" style={{ fontSize: 12 }} htmlFor="todaySwitch">Hoàn thành hôm nay</label>
              </div>
              <div className="input-group input-group-sm ms-auto" style={{ width: 180 }}>
                <span className="input-group-text bg-light border-end-0 text-muted" style={{ paddingRight: 4 }}><i className="bi bi-search"></i></span>
                <input 
                  type="text" 
                  className="form-control border-start-0 ps-1 bg-light shadow-none" 
                  style={{ fontSize: 12 }}
                  placeholder="Tìm kiếm lệnh..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="table-responsive flex-grow-1 overflow-auto">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light">
                  <tr>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>MÃ LỆNH</th>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>THỜI GIAN</th>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>TIẾN ĐỘ</th>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? recentOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setShowDetail(true);
                      }}
                    >
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="fw-bold text-primary">{order.id}</div>
                          {order.status === "pending" && <span className="badge bg-danger rounded-pill" style={{ fontSize: 9, padding: "2px 6px" }}>Mới</span>}
                        </div>
                        {order.saleOrderCode && (
                          <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                            Đơn hàng: <span className="fw-medium">{order.saleOrderCode}</span>
                          </div>
                        )}
                        {order.name && (
                          <div className="text-muted text-truncate mt-1" style={{ fontSize: 11, maxWidth: 200 }} title={order.name}>
                            {order.name}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 11, marginBottom: 2 }}>
                          <span className="text-muted">Bắt đầu: </span>
                          <span className="fw-medium text-dark">{order.ngayDat ? new Date(order.ngayDat).toLocaleDateString("vi-VN") : "—"}</span>
                        </div>
                        <div style={{ fontSize: 11 }}>
                          <span className="text-muted">Hoàn thành: </span>
                          <span className="fw-bold text-primary">{order.ngayHoanThanh ? new Date(order.ngayHoanThanh).toLocaleDateString("vi-VN") : "—"}</span>
                        </div>
                      </td>
                      <td style={{ width: 140 }}>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-grow-1" style={{ height: 6, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                            <div 
                              style={{ 
                                width: `${order.progress}%`, 
                                height: "100%", 
                                background: order.progress === 100 ? "var(--success)" : "var(--primary)",
                                borderRadius: 3
                              }} 
                            />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, minWidth: 30 }}>{order.progress}%</span>
                        </div>
                      </td>
                      <td><StatusBadge status={order.status} /></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">Chưa có lệnh sản xuất nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <ProductionOrderDetailOffcanvas 
        orderId={selectedOrderId} 
        show={showDetail} 
        onHide={() => setShowDetail(false)} 
        onUpdate={fetchData}
      />

      <style jsx>{`
        .transition-all { transition: all 0.2s ease-in-out; }
        .hover-shadow-sm:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .fw-600 { font-weight: 600; }
      `}</style>
    </StandardPage>
  );
}
