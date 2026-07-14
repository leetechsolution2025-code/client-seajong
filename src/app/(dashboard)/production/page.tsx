"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { ProductionOrderDetailOffcanvas } from "@/components/production/ProductionOrderDetailOffcanvas";

// ── Helpers ──────────────────────────────────────────────────────────────────
function SectionTitle({ title, icon, action }: { title: string; icon: string; action?: React.ReactNode }) {
  return (
    <div className="d-flex align-items-center justify-content-between mb-3">
      <div className="d-flex align-items-center gap-2">
        <div className="rounded-2 d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, background: "var(--primary-subtle)" }}>
          <i className={`bi ${icon}`} style={{ fontSize: 14, color: "var(--primary)" }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.01em" }}>
          {title}
        </span>
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    running: { label: "Đang chạy", cls: "bg-success-subtle text-success" },
    pending: { label: "Chờ duyệt", cls: "bg-warning-subtle text-warning" },
    stopped: { label: "Tạm dừng", cls: "bg-danger-subtle text-danger" },
    completed: { label: "Hoàn thành", cls: "bg-primary-subtle text-primary" },
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
  const [kpis, setKpis] = useState({ runningOrders: 0, todayProductionQty: 0, oee: 0, defectRate: 0 });

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetch("/api/production/dashboard/recent-orders")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecentOrders(data);
        }
      })
      .catch(err => console.error("Error fetching recent orders:", err));

    fetch("/api/production/dashboard/kpis")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setKpis(data);
      })
      .catch(err => console.error("Error fetching KPIs:", err));

    // Giả lập loading
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <StandardPage
      title="Quản trị sản xuất"
      description="Hệ thống điều hành và giám sát sản xuất Seajong"
      icon="bi-tools"
      color="blue"
      useCard={false}
    >
      {/* ── Row 1: KPI Cards ─────────────────────────────────────────────── */}
      <div className="row g-3 mb-3">
        <KPICard
          label="Lệnh sản xuất đang chạy"
          value={loading ? "—" : kpis.runningOrders.toString()}
          icon="bi-play-circle-fill"
          accent="#3b82f6"
          subtitle="Số lệnh đang trong tiến trình"
          colClass="col-6 col-lg-3"
        />
        <KPICard
          label="Sản lượng trong ngày"
          value={loading ? "—" : kpis.todayProductionQty.toLocaleString("vi-VN")}
          icon="bi-box-seam-fill"
          accent="#10b981"
          suffix=" SP"
          subtitle="Sản phẩm hoàn thành hôm nay"
          colClass="col-6 col-lg-3"
        />
        <KPICard
          label="Hiệu suất dây chuyền"
          value={loading ? "—" : (kpis.oee > 0 ? kpis.oee.toString() : "Chưa có DL")}
          icon="bi-lightning-charge-fill"
          accent="#f59e0b"
          suffix={kpis.oee > 0 ? "%" : ""}
          subtitle="OEE trung bình toàn nhà máy"
          colClass="col-6 col-lg-3"
        />
        <KPICard
          label="Tỉ lệ lỗi (NG)"
          value={loading ? "—" : (kpis.defectRate > 0 ? kpis.defectRate.toString() : "Chưa có DL")}
          icon="bi-exclamation-triangle-fill"
          accent="#ef4444"
          suffix={kpis.defectRate > 0 ? "%" : ""}
          subtitle="Ghi nhận từ các lệnh sản xuất"
          colClass="col-6 col-lg-3"
        />
      </div>

      <div className="row g-3 flex-grow-1" style={{ minHeight: 0 }}>
        {/* ── Left Column: Orders & Progress ── */}
        <div className="col-12 col-xl-8 d-flex flex-column gap-3">
          
          {/* Recent Orders */}
          <div className="bg-white rounded-4 shadow-sm border p-3 flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
            <SectionTitle 
              title="Lệnh sản xuất mới nhất" 
              icon="bi-file-earmark-text-fill" 
              action={
                <button 
                  onClick={() => router.push("/production/orders")}
                  className="btn btn-link p-0 text-decoration-none" 
                  style={{ fontSize: 12 }}
                >
                  Xem tất cả →
                </button>
              }
            />
            <div className="table-responsive flex-grow-1 overflow-auto">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light">
                  <tr>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>MÃ LỆNH</th>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>NGÀY HOÀN THÀNH</th>
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
                        {order.name && (
                          <div className="text-muted text-truncate mt-1" style={{ fontSize: 11, maxWidth: 200 }} title={order.name}>
                            {order.name}
                          </div>
                        )}
                      </td>
                      <td>{order.ngayHoanThanh ? new Date(order.ngayHoanThanh).toLocaleDateString("vi-VN") : "Chưa xác định"}</td>
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

        {/* ── Right Column: Alerts & Shifts ── */}
        <div className="col-12 col-xl-4 d-flex flex-column gap-3">
          
          {/* Quick Actions */}
          <div className="bg-white rounded-4 shadow-sm border p-3">
            <SectionTitle title="Thao tác nhanh" icon="bi-lightning-fill" />
            <div className="d-flex flex-column gap-2">
              <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 shadow-sm" style={{ fontSize: 13, fontWeight: 600 }}>
                <i className="bi bi-plus-circle" /> Tạo lệnh sản xuất mới
              </button>
              <button className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-3" style={{ fontSize: 13, fontWeight: 600 }}>
                <i className="bi bi-calendar-event" /> Lập kế hoạch tuần
              </button>
            </div>
          </div>



          {/* Critical Alerts */}
          <div className="bg-white rounded-4 shadow-sm border p-3 flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
            <SectionTitle title="Cảnh báo vận hành" icon="bi-bell-fill" />
            <div className="d-flex flex-column gap-2 overflow-auto">
              <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                Chưa có cảnh báo nào
              </div>
            </div>
          </div>

        </div>
      </div>
      <ProductionOrderDetailOffcanvas 
        orderId={selectedOrderId} 
        show={showDetail} 
        onHide={() => setShowDetail(false)} 
      />

      <style jsx>{`
        .transition-all { transition: all 0.2s ease-in-out; }
        .hover-shadow-sm:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .fw-600 { font-weight: 600; }
      `}</style>
    </StandardPage>
  );
}
