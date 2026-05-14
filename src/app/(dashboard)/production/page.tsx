"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";

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

  useEffect(() => {
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
          value={loading ? "—" : "12"}
          icon="bi-play-circle-fill"
          accent="#3b82f6"
          subtitle="Tăng 2 lệnh so với hôm qua"
          colClass="col-6 col-lg-3"
        />
        <KPICard
          label="Sản lượng trong ngày"
          value={loading ? "—" : "8,450"}
          icon="bi-box-seam-fill"
          accent="#10b981"
          suffix=" SP"
          subtitle="Đạt 85% kế hoạch ngày"
          colClass="col-6 col-lg-3"
        />
        <KPICard
          label="Hiệu suất dây chuyền"
          value={loading ? "—" : "94.2"}
          icon="bi-lightning-charge-fill"
          accent="#f59e0b"
          suffix="%"
          subtitle="OEE trung bình toàn nhà máy"
          colClass="col-6 col-lg-3"
        />
        <KPICard
          label="Tỉ lệ lỗi (NG)"
          value={loading ? "—" : "0.85"}
          icon="bi-exclamation-triangle-fill"
          accent="#ef4444"
          suffix="%"
          subtitle="Giảm 0.12% so với tuần trước"
          colClass="col-6 col-lg-3"
        />
      </div>

      <div className="row g-3">
        {/* ── Left Column: Orders & Progress ── */}
        <div className="col-12 col-xl-8 d-flex flex-column gap-3">
          
          {/* Recent Orders */}
          <div className="bg-white rounded-4 shadow-sm border p-3 flex-grow-1">
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
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light">
                  <tr>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>MÃ LỆNH</th>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>SẢN PHẨM</th>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>SỐ LƯỢNG</th>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>TIẾN ĐỘ</th>
                    <th className="border-0 bg-transparent text-muted fw-600" style={{ fontSize: 11 }}>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "PO-240508-01", name: "Board mạch A12", qty: 2000, progress: 75, status: "running" },
                    { id: "PO-240508-02", name: "Vỏ nhôm tản nhiệt", qty: 5000, progress: 30, status: "running" },
                    { id: "PO-240507-05", name: "Cáp kết nối chuẩn C", qty: 10000, progress: 100, status: "completed" },
                    { id: "PO-240508-03", name: "Module Camera 4K", qty: 1200, progress: 0, status: "pending" },
                    { id: "PO-240507-04", name: "Pin Lithium 5000mAh", qty: 3500, progress: 65, status: "running" },
                  ].map((order) => (
                    <tr key={order.id} style={{ cursor: "pointer" }}>
                      <td className="fw-bold text-primary">{order.id}</td>
                      <td>{order.name}</td>
                      <td>{order.qty.toLocaleString("vi-VN")}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Production Lines Status */}
          <div className="bg-white rounded-4 shadow-sm border p-3">
            <SectionTitle title="Trạng thái dây chuyền" icon="bi-diagram-2-fill" />
            <div className="row g-3">
              {[
                { name: "Dây chuyền SMT 01", status: "running", efficiency: 98, temp: 24.5 },
                { name: "Dây chuyền SMT 02", status: "running", efficiency: 95, temp: 25.1 },
                { name: "Dây chuyền Lắp ráp 01", status: "stopped", efficiency: 0, temp: 22.8 },
                { name: "Dây chuyền Kiểm tra 01", status: "running", efficiency: 92, temp: 23.4 },
              ].map((line) => (
                <div key={line.name} className="col-12 col-md-6">
                  <div className="p-3 rounded-3 border d-flex align-items-center gap-3 hover-shadow-sm transition-all" style={{ background: "var(--muted-subtle)" }}>
                    <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`} 
                         style={{ 
                           width: 12, height: 12, 
                           background: line.status === "running" ? "#10b981" : "#ef4444",
                           boxShadow: line.status === "running" ? "0 0 8px #10b981" : "none"
                         }} 
                    />
                    <div className="flex-grow-1">
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{line.name}</div>
                      <div className="d-flex gap-3 mt-1" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        <span>Hiệu suất: <b className="text-dark">{line.efficiency}%</b></span>
                        <span>Nhiệt độ: <b className="text-dark">{line.temp}°C</b></span>
                      </div>
                    </div>
                    <i className="bi bi-chevron-right text-muted" style={{ fontSize: 12 }} />
                  </div>
                </div>
              ))}
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

          {/* Active Shift */}
          <div className="bg-white rounded-4 shadow-sm border p-3">
            <SectionTitle title="Ca làm việc hiện tại" icon="bi-clock-fill" />
            <div className="p-3 rounded-3 bg-primary text-white shadow-sm" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Ca hành chính (Shift A)</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>08:00 - 17:00</div>
                </div>
                <span className="badge bg-white text-primary rounded-pill px-2" style={{ fontSize: 10, fontWeight: 700 }}>ĐANG DIỄN RA</span>
              </div>
              <div className="mt-3 pt-3 border-top border-white border-opacity-20" style={{ fontSize: 11 }}>
                <div className="d-flex justify-content-between mb-1">
                  <span>Trưởng ca:</span>
                  <span className="fw-bold">Nguyễn Văn Sản</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Nhân sự hiện diện:</span>
                  <span className="fw-bold">42 / 45</span>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="bg-white rounded-4 shadow-sm border p-3">
            <SectionTitle title="Cảnh báo vận hành" icon="bi-bell-fill" />
            <div className="d-flex flex-column gap-2">
              {[
                { type: "danger", msg: "Dây chuyền 03 dừng do thiếu NVL", time: "10 phút trước" },
                { type: "warning", msg: "Nhiệt độ lò sấy 01 vượt ngưỡng", time: "25 phút trước" },
                { type: "info", msg: "Bảo trì định kỳ máy dán chip 02", time: "1 giờ trước" },
              ].map((alert, i) => (
                <div key={i} className={`p-2 rounded-3 d-flex gap-3 align-items-start bg-${alert.type}-subtle text-${alert.type}`} style={{ fontSize: 12 }}>
                  <i className={`bi bi-${alert.type === 'danger' ? 'x-circle' : alert.type === 'warning' ? 'exclamation-triangle' : 'info-circle'} mt-1`} />
                  <div className="flex-grow-1">
                    <div className="fw-bold">{alert.msg}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{alert.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .transition-all { transition: all 0.2s ease-in-out; }
        .hover-shadow-sm:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .fw-600 { font-weight: 600; }
      `}</style>
    </StandardPage>
  );
}
