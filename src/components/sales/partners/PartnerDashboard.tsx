"use client";

import React from "react";
import { KPICard } from "@/components/ui/KPICard";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";
import { Table, TableColumn } from "@/components/ui/Table";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { motion, AnimatePresence } from "framer-motion";
import { CareHistoryTimeline, CareHistoryItem } from "@/components/ui/CareHistoryTimeline";

interface LeadItem {
  id: string;
  name: string;
  area: string;
  source: string;
  date: string;
  // Thông tin tiếp nhận
  address: string;
  contact: string;
  scale: string;
  needs: string;
  // Tiêu chí phân loại
  financialCapacity: string;
  distributionExperience: string;
  marketScale: string;
  strategicFit: string;
  history: CareHistoryItem[];
}

interface PartnerItem {
  id: string;
  name: string;
  level: string;
  area: string;
  creditLimit: number;
  debt: number;
  status: "Active" | "Locked";
  lastOrder: string;
}

const MOCK_LEADS: LeadItem[] = [
  { 
    id: "L1", name: "Đại lý Minh Quân", area: "Hà Nội", source: "Facebook Ads", date: "2024-04-28",
    address: "123 Giải Phóng, Hai Bà Trưng, Hà Nội", contact: "Anh Quân - 0912.345.xxx",
    scale: "Showroom 200m2", needs: "Đại lý độc quyền khu vực phía Nam Hà Nội",
    financialCapacity: "Vốn lưu động > 2 tỷ", distributionExperience: "5 năm ngành xây dựng",
    marketScale: "Khu vực dân cư đông đúc", strategicFit: "Cao - Phù hợp phân khúc trung cấp",
    history: [
      { id: "1", date: "28/04/2024 10:30", type: "call", note: "Đã gọi điện tư vấn mô hình đại lý, khách hàng rất quan tâm đến chiết khấu.", user: "Lê Anh Văn" },
      { id: "2", date: "28/04/2024 15:45", type: "message", note: "Đã gửi bảng giá và Catalogue qua Zalo cho khách.", user: "Lê Anh Văn" },
    ]
  },
  { 
    id: "L2", name: "Showroom Hùng Phát", area: "Hải Phòng", source: "Website", date: "2024-04-27",
    address: "Số 45 Lạch Tray, Hải Phòng", contact: "Chị Hằng - 0988.777.xxx",
    scale: "Cửa hàng bán lẻ lớn", needs: "Phân phối bồn cầu và sen vòi",
    financialCapacity: "Đạt yêu cầu", distributionExperience: "Mới chuyển sang ngành vệ sinh",
    marketScale: "Trung tâm thành phố", strategicFit: "Tiềm năng",
    history: [
      { id: "3", date: "27/04/2024 09:00", type: "note", note: "Tiếp nhận lead từ Website, khách có sẵn mặt bằng.", user: "Lê Anh Văn" },
    ]
  },
  { 
    id: "L3", name: "Vật tư xây dựng An Bình", area: "Đà Nẵng", source: "Triển lãm", date: "2024-04-26",
    address: "88 Điện Biên Phủ, Đà Nẵng", contact: "Anh Bình - 0905.111.xxx",
    scale: "Kho vật liệu tổng hợp", needs: "Bổ sung mã hàng Seajong vào danh mục",
    financialCapacity: "Rất mạnh", distributionExperience: "Phân phối gạch men 10 năm",
    marketScale: "Toàn tỉnh Đà Nẵng", strategicFit: "Rất cao",
    history: []
  },
  { id: "L4", name: "Nội thất cao cấp Gia Minh", area: "Quảng Ninh", source: "Google Search", date: "2024-04-25", address: "", contact: "", scale: "", needs: "", financialCapacity: "", distributionExperience: "", marketScale: "", strategicFit: "", history: [] },
  { id: "L5", name: "Showroom Toàn Cầu", area: "Bình Dương", source: "Zalo", date: "2024-04-24", address: "", contact: "", scale: "", needs: "", financialCapacity: "", distributionExperience: "", marketScale: "", strategicFit: "", history: [] },
  { id: "L6", name: "Điện nước Thành Đạt", area: "Vinh", source: "Hotline", date: "2024-04-23", address: "", contact: "", scale: "", needs: "", financialCapacity: "", distributionExperience: "", marketScale: "", strategicFit: "", history: [] },
];

const MOCK_PARTNERS: PartnerItem[] = [
  { id: "D1", name: "Công ty TNHH Seajong Việt Nam", level: "Cấp 1", area: "Miền Bắc", creditLimit: 500000000, debt: 120000000, status: "Active", lastOrder: "2024-04-25" },
  { id: "D2", name: "Đại lý Thiết bị vệ sinh cao cấp", level: "Showroom", area: "TP.HCM", creditLimit: 200000000, debt: 180000000, status: "Active", lastOrder: "2024-04-20" },
  { id: "D3", name: "Showroom Nội thất Hoàng Gia", level: "Cấp 2", area: "Cần Thơ", creditLimit: 100000000, debt: 95000000, status: "Locked", lastOrder: "2024-03-15" },
];

export function PartnerDashboard() {
  const [selectedLead, setSelectedLead] = React.useState<LeadItem | null>(null);
  const [showComparison, setShowComparison] = React.useState(false);

  const partnerColumns: TableColumn<PartnerItem>[] = [
    { header: "Mã/Tên Đại lý", render: (p) => (
      <div>
        <div className="fw-bold">{p.name}</div>
        <div className="text-muted small">{p.id}</div>
      </div>
    )},
    { header: "Phân cấp", render: (p) => (
      <span className={`badge ${p.level === "Cấp 1" ? "bg-primary-subtle text-primary" : "bg-secondary-subtle text-secondary"}`}>
        {p.level}
      </span>
    )},
    { header: "Khu vực", render: (p) => p.area },
    { header: "Công nợ/Hạn mức", render: (p) => (
      <div>
        <div className={p.debt > p.creditLimit * 0.9 ? "text-danger" : ""}>
          {p.debt.toLocaleString("vi-VN")} / {p.creditLimit.toLocaleString("vi-VN")}
        </div>
        <div className="progress mt-1" style={{ height: 4 }}>
          <div 
            className={`progress-bar ${p.debt > p.creditLimit * 0.9 ? "bg-danger" : "bg-success"}`} 
            style={{ width: `${Math.min(100, (p.debt / p.creditLimit) * 100)}%` }} 
          />
        </div>
      </div>
    )},
    { header: "Trạng thái", render: (p) => (
      <span className={`badge ${p.status === "Active" ? "bg-success" : "bg-danger"}`}>
        {p.status === "Active" ? "Hoạt động" : "Bị khóa"}
      </span>
    )},
    { header: "Đơn cuối", render: (p) => p.lastOrder },
  ];

  return (
    <div className="p-4 overflow-x-hidden">
      {/* KPI Row */}
      <div className="row g-3 mb-4">
        <KPICard label="Tổng số đại lý" value={156} icon="bi-people" accent="#0d6efd" subtitle="+12 so với tháng trước" />
        <KPICard label="Đại lý hoạt động" value="84" suffix="%" icon="bi-activity" accent="#198754" subtitle="Ổn định" />
        <KPICard label="Leads mới" value={12} icon="bi-lightning-charge" accent="#fd7e14" subtitle="Từ Marketing" />
        <KPICard label="Doanh thu ĐL" value="4.2" suffix="B" icon="bi-currency-dollar" accent="#6f42c1" subtitle="Tháng này" />
      </div>

      <div className="row g-3 mb-4">
        {/* Development Chart */}
        <div className="col-12 col-xl-8">
          <div className="app-card p-4 h-100">
            <SectionTitle 
              title="Biểu đồ phát triển đại lý" 
              action={
                <div className="d-flex align-items-center gap-3">
                  <div className="form-check form-switch mb-0 d-flex align-items-center gap-2">
                    <input 
                      className="form-check-input mt-0" 
                      type="checkbox" 
                      role="switch" 
                      id="compareSwitch" 
                      checked={showComparison}
                      onChange={(e) => setShowComparison(e.target.checked)}
                    />
                    <label className="form-check-label small text-muted cursor-pointer" htmlFor="compareSwitch">
                      So sánh cùng kỳ
                    </label>
                  </div>
                </div>
              }
            />
            <div style={{ height: 300 }}>
              <YearAreaChart 
                series={[
                  { 
                    name: "Đại lý mới (2026)", 
                    data: [10, 15, 20, 18, null, null, null, null, null, null, null, null], 
                    color: "#0d6efd",
                    type: "area" as const
                  },
                  ...(showComparison ? [
                    { 
                      name: "Đại lý (Cùng kỳ 2025)", 
                      data: [8, 12, 15, 14, null, null, null, null, null, null, null, null], 
                      color: "#94a3b8",
                      type: "line" as const
                    }
                  ] : [
                    { 
                      name: "Leads nhận được", 
                      data: [25, 32, 45, 38, null, null, null, null, null, null, null, null], 
                      color: "#dc3545",
                      type: "line" as const
                    }
                  ])
                ]}
                height={300}
                unit=""
              />
            </div>
          </div>
        </div>

        {/* Marketing Leads List */}
        <div className="col-12 col-xl-4">
          <div className="app-card p-0 h-100 overflow-hidden d-flex flex-column">
            <div className="p-4 border-bottom">
              <SectionTitle 
                title="Leads từ Marketing" 
                className="mb-0"
              />
            </div>
            <div className="flex-grow-1 overflow-auto">
              <Table 
                rows={MOCK_LEADS} 
                compact
                columns={[
                  { header: "Khách hàng", render: (l) => (
                    <button 
                      onClick={() => setSelectedLead(l)} 
                      className="btn btn-link p-0 text-decoration-none text-primary border-0 bg-transparent text-start"
                      style={{ fontSize: "inherit" }}
                    >
                      {l.name}
                    </button>
                  )},
                  { header: "Nguồn", render: (l) => <span className="text-muted small">{l.source}</span> }
                ]} 
              />
            </div>
            <div className="p-2 border-top text-center">
              <button className="btn btn-link btn-sm w-100 text-decoration-none py-1">
                Xem tất cả leads <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="app-card p-0 overflow-hidden">
        <div className="p-4 border-bottom">
          <SectionTitle 
            title="Danh sách đại lý hệ thống" 
            className="mb-0"
            action={
              <div className="d-flex gap-2">
                <div className="input-group input-group-sm" style={{ width: 250 }}>
                  <span className="input-group-text bg-transparent border-end-0"><i className="bi bi-search" /></span>
                  <input type="text" className="form-control border-start-0" placeholder="Tìm tên, mã, khu vực..." />
                </div>
                <button className="btn btn-sm btn-outline-secondary">
                  <i className="bi bi-filter" /> Lọc
                </button>
              </div>
            }
          />
        </div>
        <Table rows={MOCK_PARTNERS} columns={partnerColumns} />
      </div>

      {/* ── Lead Detail Offcanvas ── */}
      <AnimatePresence>
        {selectedLead && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
                zIndex: 1050, backdropFilter: "blur(2px)"
              }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: 400, background: "var(--background)",
                zIndex: 1051, boxShadow: "-8px 0 32px rgba(0,0,0,0.1)",
                display: "flex", flexDirection: "column",
                borderLeft: "1px solid var(--border)"
              }}
            >
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white shadow-sm" style={{ zIndex: 1 }}>
                <div>
                  <div className="text-muted small-xs text-uppercase fw-bold mb-1" style={{ letterSpacing: "0.1em" }}>Chi tiết khách hàng</div>
                  <h6 className="mb-0 fw-black text-primary">{selectedLead.name}</h6>
                </div>
                <button 
                  className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center" 
                  style={{ width: 32, height: 32 }}
                  onClick={() => setSelectedLead(null)}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="flex-grow-1 overflow-y-auto p-4 custom-scrollbar bg-white">
                {/* Section 1: Reception Info */}
                <div className="mb-4">
                  <SectionTitle title="Thông tin tiếp nhận" className="mb-3" />
                  <div className="d-flex flex-column gap-2">
                    <DetailItem icon="bi-geo-alt" label="Khu vực kinh doanh" value={selectedLead.address || selectedLead.area} />
                    <DetailItem icon="bi-person-badge" label="Thông tin liên hệ" value={selectedLead.contact || "Chưa cập nhật"} />
                    <DetailItem icon="bi-aspect-ratio" label="Quy mô" value={selectedLead.scale || "Chưa xác định"} />
                    <DetailItem icon="bi-chat-left-quote" label="Nhu cầu" value={selectedLead.needs || "Chưa có dữ liệu"} />
                  </div>
                </div>

                {/* Section 2: Qualification Criteria */}
                <div className="mb-5">
                  <SectionTitle title="Tiêu chí phân loại" className="mb-4" />
                  <div className="row g-4">
                    <div className="col-6">
                      <DetailItem label="Tài chính" value={selectedLead.financialCapacity || "N/A"} compact />
                    </div>
                    <div className="col-6">
                      <DetailItem label="Kinh nghiệm" value={selectedLead.distributionExperience || "N/A"} compact />
                    </div>
                    <div className="col-6">
                      <DetailItem label="Thị trường" value={selectedLead.marketScale || "N/A"} compact />
                    </div>
                    <div className="col-6">
                      <DetailItem label="Mức độ phù hợp" value={selectedLead.strategicFit || "N/A"} compact />
                    </div>
                  </div>
                </div>

                {/* Section 3: Care History */}
                <div className="mb-2">
                  <CareHistoryTimeline history={selectedLead.history} onAdd={() => {}} />
                </div>
              </div>

              <div className="p-3 border-top bg-white d-flex gap-2">
                <button className="btn btn-primary flex-grow-1 fw-bold py-2 rounded-3 shadow-sm" style={{ fontSize: 13 }}>
                  Chuyển bước tiếp theo
                </button>
                <button className="btn btn-outline-danger rounded-3" style={{ width: 42 }} title="Không đủ điều kiện">
                  <i className="bi bi-slash-circle" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({ icon, label, value, compact = false }: { icon?: string; label: string; value: string; compact?: boolean }) {
  return (
    <div className="d-flex align-items-start gap-2">
      {icon && <i className={`bi ${icon} text-muted mt-1`} style={{ fontSize: 14 }} />}
      <div>
        <div className="text-muted-foreground fw-semibold mb-1" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.02em", opacity: 0.7 }}>
          {label}
        </div>
        <div className="fw-medium text-dark" style={{ fontSize: compact ? 12 : 13.5, lineHeight: 1.4 }}>
          {value}
        </div>
      </div>
    </div>
  );
}
