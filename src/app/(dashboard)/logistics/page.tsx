"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/marketing/KpiCard";
import { SectionTitle } from "@/components/ui/SectionTitle";

// ── COMPONENTS ────────────────────────────────────────────────────────────────

const WarehouseSelector = ({ current, onChange }: any) => {
  const warehouses = [
    { id: "all", name: "Tất cả kho", icon: "bi-grid-1x2" },
    { id: "main", name: "Kho Tổng (Hà Nội)", icon: "bi-building" },
    { id: "showroom-a", name: "Showroom A (HCM)", icon: "bi-shop" },
    { id: "showroom-b", name: "Showroom B (Đà Nẵng)", icon: "bi-shop" },
  ];

  return (
    <div className="d-flex flex-wrap gap-2 mb-3 p-1 bg-white bg-opacity-5 rounded-4 border border-white border-opacity-10">
      {warehouses.map((w) => (
        <button
          key={w.id}
          onClick={() => onChange(w.id)}
          className={`btn btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-2 border-0 transition-all ${
            current === w.id ? "text-white shadow-sm" : "text-muted hover-bg-light"
          }`}
          style={{ fontWeight: 700, fontSize: 12, background: current === w.id ? "#003087" : "transparent" }}
        >
          <i className={`bi ${w.icon}`} />
          {w.name}
        </button>
      ))}
      <div className="ms-auto d-flex align-items-center px-3">
         <span className="badge bg-success-subtle text-success border border-success border-opacity-25 rounded-pill" style={{ fontSize: 10 }}>
            <i className="bi bi-broadcast me-1" /> Đồng bộ: 30s trước
         </span>
      </div>
    </div>
  );
};

const TrafficLightCard = ({ type, title, subtitle, count, children, isChart }: any) => {
  const themes = {
    red: { bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)", border: "rgba(239, 68, 68, 0.15)", color: "#ef4444", icon: "bi-exclamation-octagon" },
    yellow: { bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)", border: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", icon: "bi-exclamation-triangle" },
    green: { bg: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)", border: "rgba(16, 185, 129, 0.15)", color: "#10b981", icon: "bi-arrow-left-right" },
  }[type as "red" | "yellow" | "green"];

  return (
    <div style={{ 
      background: themes.bg, border: `1px solid ${themes.border}`, borderRadius: 16, padding: 16, height: "100%",
      boxShadow: "0 4px 12px rgba(0,0,0,0.02)", position: "relative", overflow: "hidden"
    }}>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div className="d-flex align-items-center gap-2">
          <i className={`bi ${themes.icon}`} style={{ color: themes.color, fontSize: 15 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: themes.color, textTransform: "uppercase" }}>{title}</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 900, color: themes.color }}>{count}</span>
      </div>
      <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: isChart ? 5 : 8, fontWeight: 600 }}>{subtitle}</div>
      <div className="mt-1" style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
};

const MiniFlowChart = () => {
  const data = [{ in: 15, out: 25 }, { in: 30, out: 20 }, { in: 25, out: 35 }, { in: 40, out: 30 }, { in: 35, out: 45 }, { in: 50, out: 40 }, { in: 45, out: 55 }];
  return (
    <div style={{ height: 100, width: "100%", marginTop: 5, display: "flex", alignItems: "flex-end", gap: 5 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 d-flex align-items-end gap-1" style={{ height: "100%" }}>
           <motion.div initial={{ height: 0 }} animate={{ height: `${d.in}%` }} style={{ flex: 1, background: "#10b981", borderRadius: "2px 2px 0 0", opacity: 0.4 }} />
           <motion.div initial={{ height: 0 }} animate={{ height: `${d.out}%` }} style={{ flex: 1, background: "#10b981", borderRadius: "2px 2px 0 0" }} />
        </div>
      ))}
    </div>
  );
};

const YearlyFlowChart = () => {
  const months = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
  const data = [{ in: 30, out: 20 }, { in: 45, out: 35 }, { in: 40, out: 50 }, { in: 60, out: 55 }, { in: 55, out: 45 }, { in: 70, out: 65 }, { in: 80, out: 75 }, { in: 65, out: 70 }, { in: 75, out: 80 }, { in: 85, out: 90 }, { in: 95, out: 85 }, { in: 100, out: 95 }];
  return (
    <div className="mt-2">
       <div style={{ height: 140, width: "100%", display: "flex", alignItems: "flex-end", gap: 6 }}>
          {data.map((d, i) => (
            <div key={i} className="flex-1 d-flex flex-column align-items-center" style={{ height: "100%" }}>
               <div className="d-flex align-items-end gap-1 flex-grow-1 w-100">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${d.in}%` }} style={{ flex: 1, background: "#3b82f6", borderRadius: "2px 2px 0 0", opacity: 0.4 }} />
                  <motion.div initial={{ height: 0 }} animate={{ height: `${d.out}%` }} style={{ flex: 1, background: "#3b82f6", borderRadius: "2px 2px 0 0" }} />
               </div>
               <span className="mt-1" style={{ fontSize: 8, fontWeight: 700, color: "var(--muted-foreground)" }}>{months[i]}</span>
            </div>
          ))}
       </div>
    </div>
  );
};

const CapacityBar = ({ label, value, color, status }: any) => (
  <div className="mb-2">
    <div className="d-flex justify-content-between mb-1">
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{label}</span>
      <div className="d-flex align-items-center gap-2">
        <span style={{ fontSize: 11, fontWeight: 800, color: color }}>{value}%</span>
        {status && <span style={{ fontSize: 9, background: `${color}20`, color: color, padding: "1px 5px", borderRadius: 4, fontWeight: 800 }}>{status}</span>}
      </div>
    </div>
    <div style={{ height: 6, background: "var(--muted)", borderRadius: 10, overflow: "hidden" }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1 }} style={{ height: "100%", background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`, borderRadius: 10 }} />
    </div>
  </div>
);

const ActionRow = ({ title, desc, btnText, btnColor, icon }: any) => (
  <div className="app-card d-flex align-items-center justify-content-between p-2 mb-1.5" style={{ border: "1px solid var(--border)", borderRadius: 8, transition: "all 0.2s" }}>
    <div className="d-flex align-items-center gap-2.5">
      <div style={{ width: 30, height: 30, borderRadius: 6, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
        <i className={`bi ${icon}`} style={{ fontSize: 13 }} />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{desc}</div>
      </div>
    </div>
    {btnText && <button className={`btn btn-sm btn-${btnColor} fw-bold py-0 px-3`} style={{ fontSize: 10, borderRadius: 4, height: 26 }}>{btnText}</button>}
  </div>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function LogisticsOverviewPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader 
        title="Kho vận – Logistics" 
        description="Quản lý dòng chảy hàng hóa & Cảnh báo an toàn kho thời gian thực."
        icon="bi-truck"
        color="blue"
      />
      
      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
            {/* WAREHOUSE SELECTOR */}
            <WarehouseSelector current={selectedWarehouse} onChange={setSelectedWarehouse} />

            {/* KPI SECTION */}
            <div className="row g-2 mb-3">
              <div className="col-12 col-md-6 col-xl-3">
                <KpiCard label="Lệnh xuất kho mới" value={selectedWarehouse === "all" ? "20" : "05"} icon="bi-file-earmark-arrow-up" color="#6366f1" trend={{ val: "12%", up: true }} />
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <KpiCard label="Đang soạn hàng" value={selectedWarehouse === "all" ? "05" : "02"} icon="bi-basket2" color="#f59e0b" sub="Nhân sự đang Picking" />
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <KpiCard label="Đang đóng kiện" value={selectedWarehouse === "all" ? "10" : "03"} icon="bi-box-seam" color="#3b82f6" progress={{ cur: 10, max: 25 }} progressLabel="Công suất bàn đóng gói" />
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <KpiCard label="Sẵn sàng xuất hàng" value={selectedWarehouse === "all" ? "15" : "04"} icon="bi-box-arrow-right" color="#10b981" sub="Đơn vị vận chuyển đang đến" />
              </div>
            </div>

            <div className="row g-3 mb-3">
              {/* TRAFFIC LIGHTS AREA */}
              <div className="col-12 col-xl-8">
                <div className="bg-light border h-100 shadow-none" style={{ padding: 20, borderRadius: 16 }}>
                  <SectionTitle 
                    title={`Phân tích lưu lượng: ${selectedWarehouse === "all" ? "Toàn hệ thống" : "Kho chọn lọc"}`}
                    action={<div className="badge bg-primary-subtle text-primary border border-primary border-opacity-10 px-2 small" style={{ fontSize: 10 }}>2024</div>}
                  />
                  
                  <div className="row g-2">
                    <div className="col-md-8">
                      <TrafficLightCard type="red" title="Lưu lượng năm" subtitle="Nhập/Xuất 12 tháng" count={selectedWarehouse === "all" ? "15.4k kiện" : "3.2k kiện"} isChart>
                         <YearlyFlowChart />
                      </TrafficLightCard>
                    </div>
                    <div className="col-md-4">
                      <TrafficLightCard type="green" title="Tuần này" subtitle="Chi tiết 7 ngày" count={selectedWarehouse === "all" ? "1.2k kiện" : "280 kiện"} isChart>
                        <MiniFlowChart />
                      </TrafficLightCard>
                    </div>
                  </div>
                </div>
              </div>

              {/* CAPACITY */}
              <div className="col-12 col-xl-4">
                <div className="bg-light border h-100 shadow-none" style={{ padding: 20, borderRadius: 16 }}>
                  <SectionTitle 
                    title={`Sức chứa: ${selectedWarehouse === "main" ? "Kho Tổng" : "Chi nhánh"}`}
                    action={
                      <span className="badge rounded-pill bg-warning-subtle text-warning px-2" style={{ fontSize: 10 }}>
                        {selectedWarehouse === "all" ? "80%" : selectedWarehouse === "main" ? "92%" : "45%"} Full
                      </span>
                    }
                  />
                  
                  <div className="text-center py-2 mb-3 border-bottom border-dashed">
                    <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto" }}>
                       <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--muted)" strokeWidth="3" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={selectedWarehouse === "all" ? "80, 100" : selectedWarehouse === "main" ? "92, 100" : "45, 100"} strokeLinecap="round" />
                       </svg>
                       <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 20, fontWeight: 900 }}>{selectedWarehouse === "all" ? "80" : selectedWarehouse === "main" ? "92" : "45"}%</span>
                          <span style={{ fontSize: 8, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>Sử dụng</span>
                       </div>
                    </div>
                  </div>

                  <div className="mt-1">
                    <CapacityBar label="Hàng sứ (Cồng kềnh)" value={selectedWarehouse === "all" ? 95 : 80} color="#ef4444" status="High" />
                    <CapacityBar label="Hàng sen vòi" value={selectedWarehouse === "all" ? 60 : 40} color="#3b82f6" />
                    <CapacityBar label="Hàng lỗi (RMA)" value={selectedWarehouse === "all" ? 100 : 20} color="#f43f5e" status={selectedWarehouse === "all" ? "Overload" : "Safe"} />
                  </div>
                </div>
              </div>
            </div>

            {/* DATA INTEGRITY CONTROL */}
            <div className="bg-light border shadow-none" style={{ padding: 20, borderRadius: 16 }}>
               <div style={{ marginBottom: -4 }}>
                  <SectionTitle title="Kiểm soát Toàn vẹn Dữ liệu (Data Integrity)" style={{ marginBottom: 0 }} />
               </div>
               <p className="mb-2" style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontWeight: 500, marginTop: -6 }}>
                  Dashboard này dành cho người quản trị hệ thống để đảm bảo phần mềm và thực tế là một.
               </p>
               
               <div className="d-flex flex-column gap-1">
                  <ActionRow title="Audit Trail" desc="Log 5 thao tác thay đổi tồn kho gần nhất (Ai sửa? Lý do?)" btnText="Xem Nhật ký" btnColor="dark" icon="bi-journal-text" />
                  <ActionRow title="Sync Error (Lỗi đồng bộ)" desc="Các lệnh bị lỗi khi đẩy dữ liệu qua API (Xung đột tồn kho)" btnText="Xử lý lỗi" btnColor="warning" icon="bi-cloud-slash" />
                  <ActionRow title="Serial Duplicate" desc="Cảnh báo: 2 vị trí kho chứa cùng 1 số Serial (Nghiêm trọng)" btnText="Khắc phục ngay" btnColor="danger" icon="bi-exclamation-octagon-fill" />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
