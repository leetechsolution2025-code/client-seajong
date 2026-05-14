"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { BrandButton } from "@/components/ui/BrandButton";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ───────────────────────────────────────────────────────────────────
type ProbationStatus = "ONBOARDING" | "ON_TRACK" | "EVALUATING" | "PASSED" | "EXTENDED" | "FAILED";

interface ProbationEvent {
  id: string;
  title: string;
  description?: string;
  type: string; // EVENT, EVALUATION, MILESTONE
  date: string;
}

interface Probationer {
  id: string;
  employeeCode: string;
  fullName: string;
  avatar?: string;
  position: string;
  department: string;
  startDate: string;
  endDate: string;
  mentorName: string;
  status: ProbationStatus;
  progress: number;
  events: ProbationEvent[];
}

// ── Components ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ProbationStatus }) {
  const map: Record<ProbationStatus, { label: string; cls: string }> = {
    ONBOARDING: { label: "Mới hội nhập", cls: "bg-info-subtle text-info border-info-subtle" },
    ON_TRACK: { label: "Đang ổn định", cls: "bg-primary-subtle text-primary border-primary-subtle" },
    EVALUATING: { label: "Đang đánh giá", cls: "bg-warning-subtle text-warning border-warning-subtle" },
    PASSED: { label: "Đạt thử việc", cls: "bg-success-subtle text-success border-success-subtle" },
    EXTENDED: { label: "Gia hạn", cls: "bg-secondary-subtle text-secondary border-secondary-subtle" },
    FAILED: { label: "Không đạt", cls: "bg-danger-subtle text-danger border-danger-subtle" },
  };
  const m = map[status] || { label: status, cls: "bg-secondary-subtle text-secondary" };
  return (
    <span className={`badge border px-2 py-1 ${m.cls}`} style={{ fontSize: 11, fontWeight: 600 }}>
      {m.label}
    </span>
  );
}

function ProgressBar({ value, status }: { value: number; status: ProbationStatus }) {
  const getColor = () => {
    if (status === "FAILED") return "var(--bs-danger)";
    if (status === "PASSED") return "var(--bs-success)";
    if (value > 80) return "var(--bs-warning)";
    return "var(--primary)";
  };

  return (
    <div className="w-100">
      <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: 10 }}>
        <span className="text-muted fw-medium">{value}% thời gian</span>
      </div>
      <div className="progress" style={{ height: 6, borderRadius: 10, background: "rgba(0,0,0,0.05)" }}>
        <motion.div
          className="progress-bar"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1 }}
          style={{ 
            backgroundColor: getColor(),
            borderRadius: 10,
            boxShadow: "0 0 10px " + getColor() + "40"
          }}
        />
      </div>
    </div>
  );
}

export default function ProbationPage() {
  const [probations, setProbations] = useState<Probationer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { error: toastError } = useToast();

  const fetchProbations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/probation");
      if (res.ok) {
        const data = await res.json();
        setProbations(data);
      } else {
        toastError("Lỗi", "Không thể tải dữ liệu thử việc");
      }
    } catch (err) {
      toastError("Lỗi", "Đã có lỗi xảy ra khi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProbations();
  }, []);
  
  const filteredData = probations.filter(item => {
    const matchesSearch = 
      item.fullName.toLowerCase().includes(search.toLowerCase()) || 
      item.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [showDetail, setShowDetail] = useState(false);
  const [selectedProbationer, setSelectedProbationer] = useState<Probationer | null>(null);
  
  // Event Adding State
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    type: "EVENT",
    date: new Date().toISOString().split('T')[0]
  });

  const handleAddEvent = async () => {
    if (!selectedProbationer || !eventForm.title) return;
    setIsSubmittingEvent(true);
    try {
      const res = await fetch("/api/hr/probation/events", {
        method: "POST",
        body: JSON.stringify({
          probationId: selectedProbationer.id,
          ...eventForm
        })
      });
      if (res.ok) {
        // Refresh data
        await fetchProbations();
        // Update selected probationer to show new event immediately
        const updated = (await res.json());
        setSelectedProbationer(prev => prev ? {
          ...prev,
          events: [updated, ...(prev.events || [])]
        } : null);
        
        setShowAddEvent(false);
        setEventForm({ title: "", description: "", type: "EVENT", date: new Date().toISOString().split('T')[0] });
      }
    } catch (err) {
      toastError("Lỗi", "Không thể lưu sự kiện");
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleShowDetail = (item: Probationer) => {
    setSelectedProbationer(item);
    setShowDetail(true);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const columns: TableColumn<Probationer>[] = [
    {
      header: "Nhân sự",
      width: "250px",
      render: (item) => (
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative">
            {item.avatar ? (
              <img 
                src={item.avatar} 
                alt={item.fullName} 
                className="rounded-circle border"
                style={{ width: 40, height: 40, objectFit: "cover" }}
              />
            ) : (
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center border fw-bold text-white shadow-sm"
                style={{ 
                  width: 40, 
                  height: 40, 
                  fontSize: 14,
                  background: "linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)"
                }}
              >
                {getInitials(item.fullName)}
              </div>
            )}
            <div 
              className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle"
              style={{ width: 10, height: 10 }}
            />
          </div>
          <div>
            <div className="fw-bold text-dark mb-0" style={{ fontSize: 13 }}>{item.fullName}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{item.position}</div>
          </div>
        </div>
      )
    },
    {
      header: "Phòng ban",
      render: (item) => (
        <span className="text-dark fw-medium" style={{ fontSize: 12 }}>{item.department}</span>
      )
    },
    {
      header: "Người hướng dẫn",
      render: (item) => (
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-person-check text-primary opacity-50" />
          <span style={{ fontSize: 12 }}>{item.mentorName}</span>
        </div>
      )
    },
    {
      header: "Thời hạn",
      render: (item) => (
        <div style={{ fontSize: 11 }}>
          <div className="text-muted">Bắt đầu: <span className="text-dark fw-medium">{new Date(item.startDate).toLocaleDateString('vi-VN')}</span></div>
          <div className="text-muted">Kết thúc: <span className="text-dark fw-medium">{new Date(item.endDate).toLocaleDateString('vi-VN')}</span></div>
        </div>
      )
    },
    {
      header: "Tiến độ",
      width: "180px",
      render: (item) => <ProgressBar value={item.progress} status={item.status} />
    },
    {
      header: "Trạng thái",
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      header: "",
      align: "right",
      render: (item) => (
        <div className="d-flex justify-content-end gap-1">
          <BrandButton 
            variant="outline" 
            className="px-2" 
            style={{ fontSize: 10, height: 28, paddingTop: 0, paddingBottom: 0 }}
            onClick={() => handleShowDetail(item)}
          >
            <i className="bi bi-eye me-1" /> Chi tiết
          </BrandButton>
          <BrandButton 
            variant="primary" 
            className="px-2" 
            style={{ fontSize: 10, height: 28, paddingTop: 0, paddingBottom: 0 }}
          >
            <i className="bi bi-pencil-square me-1" /> Đánh giá
          </BrandButton>
        </div>
      )
    }
  ];

  const stats = {
    total: probations.filter(i => i.status !== "PASSED" && i.status !== "FAILED").length,
    evaluating: probations.filter(i => i.status === "EVALUATING").length,
    expiring: probations.filter(i => {
      const end = new Date(i.endDate);
      const now = new Date();
      const diff = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);
      return diff > 0 && diff <= 7 && i.status !== "PASSED";
    }).length,
    passed: probations.filter(i => i.status === "PASSED").length
  };

  return (
    <StandardPage
      title="Theo dõi thử việc"
      description="Hệ thống quản lý lộ trình, đánh giá và phê duyệt nhân sự trong giai đoạn thử việc."
      icon="bi-person-badge"
      color="indigo"
      useCard={false}
    >
      {/* KPI Section */}
      <div className="row g-3 mb-2">
        <KPICard
          label="Đang thử việc"
          value={stats.total}
          icon="bi-people"
          accent="var(--bs-primary)"
        />
        <KPICard
          label="Đang đánh giá"
          value={stats.evaluating}
          icon="bi-clipboard-check"
          accent="var(--bs-warning)"
        />
        <KPICard
          label="Sắp hết hạn"
          value={stats.expiring}
          icon="bi-clock-history"
          accent="var(--bs-danger)"
        />
        <KPICard
          label="Đã đạt (Tổng cộng)"
          value={stats.passed}
          icon="bi-check2-circle"
          accent="var(--bs-success)"
        />
      </div>

      {/* Main Content Card */}
      <div className="bg-card rounded-4 shadow-sm border overflow-hidden d-flex flex-column flex-grow-1">
        {/* Table Section */}
        <div className="flex-grow-1 overflow-auto">
          <Table<Probationer>
            columns={columns}
            rows={filteredData}
            loading={loading}
          />
        </div>

        {/* Toolbar (Moved to Bottom) */}
        <div className="px-3 py-2 border-top bg-light d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 250 }}>
              <SearchInput 
                placeholder="Tìm tên hoặc mã nhân viên..." 
                value={search}
                onChange={setSearch}
                className="bg-white"
              />
            </div>
            <FilterSelect
              placeholder="Trạng thái"
              options={[
                { label: "Tất cả trạng thái", value: "ALL" },
                { label: "Mới hội nhập", value: "ONBOARDING" },
                { label: "Đang thử việc", value: "ON_TRACK" },
                { label: "Đang đánh giá", value: "EVALUATING" },
                { label: "Đã đạt", value: "PASSED" },
                { label: "Gia hạn/Không đạt", value: "FAILED" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              width={180}
            />
          </div>
          <div className="d-flex gap-2">
            <BrandButton variant="outline">
              <i className="bi bi-download me-2" /> Xuất báo cáo
            </BrandButton>
            <BrandButton variant="primary" onClick={() => {}}>
              <i className="bi bi-person-plus me-2" /> Thêm mới
            </BrandButton>
          </div>
        </div>

      </div>

      {/* Detail Offcanvas */}
      <AnimatePresence>
        {showDetail && selectedProbationer && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDetail(false)}
              className="position-fixed inset-0" 
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 10000, top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* Panel */}
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="position-fixed top-0 bottom-0 right-0 shadow-lg border-start bg-white"
              style={{ width: 400, zIndex: 10001, right: 0, overflow: "hidden" }}
            >
              <div className="h-100 d-flex flex-column">
                {/* Header */}
                <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light/50">
                  <h6 className="mb-0 fw-bold">Chi tiết lộ trình thử việc</h6>
                  <button className="btn btn-light btn-sm rounded-circle shadow-sm" onClick={() => setShowDetail(false)}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar bg-light/20">
                  {/* Combined Info Card */}
                  <div className="bg-white shadow-sm border border-light rounded-4 mb-4 overflow-hidden">
                    <div className="px-4 py-3">
                      <div className="d-flex align-items-center gap-3 mb-2">
                        {selectedProbationer.avatar ? (
                          <img src={selectedProbationer.avatar} className="rounded-circle border" style={{ width: 64, height: 64, objectFit: "cover" }} alt="" />
                        ) : (
                          <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold border" 
                               style={{ width: 64, height: 64, fontSize: 24, backgroundColor: "#f8fafc", color: "#4f46e5", borderColor: "#e2e8f0" }}>
                            {getInitials(selectedProbationer.fullName)}
                          </div>
                        )}
                        <div>
                          <h4 className="mb-1 fw-bolder text-dark" style={{ letterSpacing: "-0.02em", color: "#111827" }}>{selectedProbationer.fullName}</h4>
                          <div className="d-flex gap-3 align-items-center">
                            <span className="badge rounded-pill px-3 py-1 fw-bold" style={{ fontSize: 11, backgroundColor: "#4f46e5", color: "#ffffff" }}>
                              {selectedProbationer.position}
                            </span>
                            <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: 13, color: "#6b7280" }}>
                              <i className="bi bi-building" style={{ fontSize: 14 }} /> {selectedProbationer.department}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-2 bg-light/30 border-top">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className="bi bi-person-badge text-muted" style={{ fontSize: 14 }} />
                        <span className="text-muted small">Người hướng dẫn:</span>
                        <span className="fw-bold small text-dark">{selectedProbationer.mentorName}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <i className="bi bi-calendar-event text-muted" style={{ fontSize: 14 }} />
                        <span className="text-muted small">Thời hạn thử việc:</span>
                        <span className="small text-dark fw-bold">
                          {new Date(selectedProbationer.startDate).toLocaleDateString("vi-VN")} - {new Date(selectedProbationer.endDate).toLocaleDateString("vi-VN")}
                        </span>
                      </div>

                      <div className="mt-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="text-muted" style={{ fontSize: 10 }}>Tiến độ thời gian</span>
                          <span className="fw-bold text-primary" style={{ fontSize: 10 }}>{selectedProbationer.progress}%</span>
                        </div>
                        <div className="progress" style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 10 }}>
                          <div 
                            className="progress-bar rounded-pill" 
                            style={{ 
                              width: `${selectedProbationer.progress}%`, 
                              backgroundColor: "#4f46e5",
                              transition: "width 1s ease-in-out"
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <SectionTitle title="Quá trình thử việc" className="mb-0" />
                  </div>

                  {/* Add Event Form */}
                  <AnimatePresence>
                    {showAddEvent && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: "auto", opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-4"
                      >
                        <div className="bg-white border rounded-3 p-3 shadow-sm">
                          <div className="mb-2">
                            <input 
                              className="form-control form-control-sm fw-bold border-0 bg-light/50" 
                              placeholder="Tiêu đề sự kiện..." 
                              value={eventForm.title}
                              onChange={e => setEventForm({...eventForm, title: e.target.value})}
                            />
                          </div>
                          <div className="mb-2">
                            <textarea 
                              className="form-control form-control-sm border-0 bg-light/50" 
                              placeholder="Mô tả chi tiết (không bắt buộc)..." 
                              rows={2}
                              value={eventForm.description}
                              onChange={e => setEventForm({...eventForm, description: e.target.value})}
                            />
                          </div>
                          <div className="d-flex gap-2 mb-3">
                            <select 
                              className="form-select form-select-sm border-0 bg-light/50"
                              style={{ fontSize: 11 }}
                              value={eventForm.type}
                              onChange={e => setEventForm({...eventForm, type: e.target.value})}
                            >
                              <option value="EVENT">Sự kiện thường</option>
                              <option value="EVALUATION">Đánh giá</option>
                              <option value="MILESTONE">Cột mốc</option>
                            </select>
                            <input 
                              type="date" 
                              className="form-control form-control-sm border-0 bg-light/50"
                              style={{ fontSize: 11 }}
                              value={eventForm.date}
                              onChange={e => setEventForm({...eventForm, date: e.target.value})}
                            />
                          </div>
                          <BrandButton 
                            className="w-100 py-1" 
                            style={{ fontSize: 11 }}
                            onClick={handleAddEvent}
                            disabled={!eventForm.title || isSubmittingEvent}
                          >
                            {isSubmittingEvent ? 'Đang lưu...' : 'Lưu sự kiện'}
                          </BrandButton>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="position-relative">
                    {/* Vertical Line - Absolute relative to container */}
                    <div className="position-absolute top-0 bottom-0 border-start border-2 border-light" style={{ left: 11, zIndex: 0 }} />
                    
                    {/* Timeline Items - Always include Start Probation as base */}
                    {[
                      { 
                        date: selectedProbationer.startDate, 
                        title: "Bắt đầu thử việc", 
                        desc: `Người theo dõi: ${selectedProbationer.mentorName}`, 
                        icon: "bi-play-fill", 
                        color: "#3b82f6" 
                      },
                      ...(selectedProbationer.events || []).map(ev => ({
                        date: ev.date,
                        title: ev.title,
                        desc: ev.description,
                        icon: ev.type === "EVALUATION" ? "bi-star-fill" : ev.type === "MILESTONE" ? "bi-flag-fill" : "bi-check2",
                        color: ev.type === "EVALUATION" ? "#f59e0b" : ev.type === "MILESTONE" ? "#6366f1" : "#10b981"
                      }))
                    ]
                    .sort((a, b) => {
                      // Nếu trùng ngày, mốc "Bắt đầu thử việc" luôn nằm dưới cùng
                      if (a.title === "Bắt đầu thử việc") return 1;
                      if (b.title === "Bắt đầu thử việc") return -1;
                      return new Date(b.date).getTime() - new Date(a.date).getTime();
                    })
                    .map((step, idx) => (
                      <div key={idx} className="mb-4 position-relative" style={{ paddingLeft: 36 }}>
                        {/* Dot - Absolute relative to item container, but line is relative to parent. Both start at left:0 */}
                        <div 
                          className="position-absolute start-0 rounded-circle shadow-sm d-flex align-items-center justify-content-center text-white"
                          style={{ width: 22, height: 22, zIndex: 1, top: 0, backgroundColor: step.color, left: 0 }}
                        >
                          <i className={`bi ${step.icon}`} style={{ fontSize: 10 }} />
                        </div>
                        <div style={{ paddingLeft: 32 }}>
                          <div className="d-flex justify-content-between align-items-start">
                            <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: 13 }}>{step.title}</h6>
                            <span className="text-muted fw-medium" style={{ fontSize: 10 }}>{new Date(step.date).toLocaleDateString("vi-VN")}</span>
                          </div>
                          {step.desc && <p className="text-muted mb-0 mt-1" style={{ fontSize: 11, lineHeight: 1.5 }}>{step.desc}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-top bg-light/30">
                  <BrandButton 
                    className="w-100" 
                    variant={showAddEvent ? "outline" : "primary"} 
                    onClick={() => setShowAddEvent(!showAddEvent)}
                  >
                    {showAddEvent ? 'Hủy thêm sự kiện' : <><i className="bi bi-plus-lg me-2" /> Thêm sự kiện mới</>}
                  </BrandButton>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </StandardPage>
  );
}
