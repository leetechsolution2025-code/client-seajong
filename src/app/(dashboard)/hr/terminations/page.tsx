"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
  UserMinus, 
  UserX, 
  Clock, 
  CheckCircle2, 
  FileText, 
  AlertCircle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  ClipboardCheck,
  Lock,
  Wallet,
  ArrowRightLeft,
  ShieldCheck
} from "lucide-react";

import { Table, TableColumn } from "@/components/ui/Table";
import { ModernStepper } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";

// --- Types & Constants ---
type TermType = "RESIGNATION" | "DISMISSAL";
type TermStatus = "Draft" | "Pending" | "Approved" | "Handover" | "Finalizing" | "Completed";

const STEPS_RESIGNATION = [
  { id: 1, label: "Tiếp nhận", icon: "bi-file-earmark-plus" },
  { id: 2, label: "Phỏng vấn", icon: "bi-chat-quote" },
  { id: 3, label: "Phê duyệt", icon: "bi-shield-check" },
  { id: 4, label: "Bàn giao", icon: "bi-box-seam" },
  { id: 5, label: "Hoàn tất", icon: "bi-check-all" }
];

const STEPS_DISMISSAL = [
  { id: 1, label: "Chứng cứ", icon: "bi-camera" },
  { id: 2, label: "Họp kỷ luật", icon: "bi-people" },
  { id: 3, label: "Quyết định", icon: "bi-file-earmark-ruled" },
  { id: 4, label: "Khóa TS", icon: "bi-lock" },
  { id: 5, label: "Thu hồi", icon: "bi-arrow-repeat" },
  { id: 6, label: "Thông báo", icon: "bi-megaphone" },
  { id: 7, label: "Quyết toán", icon: "bi-wallet2" },
  { id: 8, label: "Hệ thống", icon: "bi-pc-display" },
  { id: 9, label: "Kết thúc", icon: "bi-check-all" }
];

export default function TerminationsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | "RESIGNATION" | "DISMISSAL">("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // UI States
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const dashboardSteps = [
    { num: 1, id: "TIEP_NHAN", title: "Tiếp nhận", desc: "Rà soát & Tiếp nhận", icon: "bi-envelope" },
    { num: 2, id: "XET_DUYET", title: "Xét duyệt", desc: "Tờ trình & Phê duyệt", icon: "bi-file-earmark-text" },
    { num: 3, id: "HOAN_TAT", title: "Hoàn tất", desc: "Quyết định & Cập nhật", icon: "bi-check-circle" },
  ];

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/hr/terminations");
      const data = await res.json();
      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error(err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/hr/employees");
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data.filter((e: any) => e.status === "active"));
      } else if (data && Array.isArray(data.data)) {
        setEmployees(data.data.filter((e: any) => e.status === "active"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRequests = (requests || []).filter(r => {
    const matchesTab = activeTab === "All" || r.type === activeTab;
    
    // Workflow step filtering
    let matchesStep = true;
    if (currentStep === 1) matchesStep = r.status === "Draft" || r.status === "Pending";
    if (currentStep === 2) matchesStep = r.status === "Approved";
    if (currentStep === 3) matchesStep = r.status === "Handover" || r.status === "Finalizing" || r.status === "Completed";

    const matchesSearch = r.employee?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.employee?.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch && matchesStep;
  });


  return (
    <div className="d-flex flex-column" style={{ height: "100%" }}>
      <PageHeader 
        title="Sa thải và Thôi việc" 
        description="Quản lý quy trình chấm dứt hợp đồng, bàn giao và quyết toán" 
        icon="bi-person-x-fill" 
        color="rose" 
      />

      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        {/* Main Content Card */}
        <WorkflowCard
          stepper={
            <ModernStepper 
              steps={dashboardSteps} 
              currentStep={currentStep} 
              onStepChange={setCurrentStep} 
              paddingX={0}
            />
          }
          toolbar={
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                <div className="d-flex gap-1 bg-light p-1 rounded-3 border">
                  {["All", "RESIGNATION", "DISMISSAL"].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`btn btn-sm px-3 fw-semibold transition-all ${activeTab === tab ? "bg-white shadow-sm border text-primary" : "btn-light border-0 text-muted"}`}
                    >
                      {tab === "All" ? "Tất cả" : tab === "RESIGNATION" ? "Thôi việc" : "Sa thải"}
                    </button>
                  ))}
                </div>
                
                <div className="position-relative ms-2" style={{ width: "300px" }}>
                  <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: "13px" }}></i>
                  <input 
                    type="text" 
                    className="form-control border-0 shadow-sm rounded-pill ps-5 pe-4"
                    style={{ height: 38, background: "var(--card)", fontSize: 13, border: "1px solid var(--border)" }}
                    placeholder="Tìm tên, mã nhân viên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button className="btn btn-sm btn-white border d-flex align-items-center gap-2 px-3 shadow-sm rounded-pill ms-auto" style={{ height: "38px", fontSize: "13px" }}>
                  <Filter size={16} /> Lọc nâng cao
                </button>
              </div>
              <div className="text-muted small ms-3 flex-shrink-0">Đang hiển thị: <b>{filteredRequests.length}</b> hồ sơ</div>
            </div>
          }
        >
          <Table
            rows={filteredRequests}
            loading={loading}
            onRowClick={(r) => setSelectedRequest(r)}
            columns={[
              {
                header: "Nhân sự",
                render: (r) => (
                  <div className="d-flex align-items-center gap-3">
                    <EmployeeAvatar 
                      name={r.employee?.fullName} 
                      url={r.employee?.avatarUrl} 
                      size={34} 
                      borderRadius={99} 
                    />
                    <div>
                      <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>{r.employee?.fullName}</div>
                      <div className="text-muted" style={{ fontSize: "11px" }}>{r.employee?.code}</div>
                    </div>
                  </div>
                )
              },
              {
                header: "Phòng ban / Vị trí",
                render: (r) => (
                  <div>
                    <div className="fw-semibold text-dark" style={{ fontSize: "12px" }}>{r.employee?.position}</div>
                    <div className="text-muted" style={{ fontSize: "11px" }}>{r.employee?.departmentName}</div>
                  </div>
                )
              },
              {
                header: "Loại thủ tục",
                render: (r) => r.type === "RESIGNATION" ? (
                  <span className="badge rounded-pill bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1">
                    Thôi việc
                  </span>
                ) : (
                  <span className="badge rounded-pill bg-red-100 text-red-700 border border-red-200 px-3 py-1">
                    Sa thải
                  </span>
                )
              },
              {
                header: "Tiến độ",
                render: (r) => (
                  <div className="d-flex align-items-center gap-2" style={{ width: "120px" }}>
                    <div className="progress flex-grow-1" style={{ height: "5px", borderRadius: "10px" }}>
                      <div className={`progress-bar ${r.type === "RESIGNATION" ? "bg-primary" : "bg-danger"}`} 
                        style={{ width: `${(r.step / (r.type === "RESIGNATION" ? 5 : 9)) * 100}%` }} />
                    </div>
                    <span className="text-muted fw-bold" style={{ fontSize: "11px" }}>{r.step}/{r.type === "RESIGNATION" ? 5 : 9}</span>
                  </div>
                )
              },
              {
                header: "Ngày làm cuối",
                render: (r) => (
                  <span className="text-muted fw-semibold" style={{ fontSize: "12px" }}>
                    {r.lastWorkingDay ? new Date(r.lastWorkingDay).toLocaleDateString('vi-VN') : "---"}
                  </span>
                )
              },
              {
                header: "Trạng thái",
                render: (r) => <StatusBadge status={r.status} />
              },
              {
                header: "",
                align: "right",
                render: () => (
                  <button className="btn btn-sm btn-light border rounded-3 p-1">
                    <MoreVertical size={14} />
                  </button>
                )
              }
            ]}
          />
        </WorkflowCard>

      <style jsx>{`
        .bg-blue-100 { background: #eff6ff; }
        .text-blue-700 { color: #1d4ed8; }
        .border-blue-200 { border-color: #bfdbfe !important; }
        .bg-red-100 { background: #fef2f2; }
        .text-red-700 { color: #b91c1c; }
        .border-red-200 { border-color: #fecaca !important; }
        .x-small { font-size: 11px; }
        .cursor-pointer { cursor: pointer; transition: all 0.2s; }
        .cursor-pointer:hover { background-color: #f8fafc; }
      `}</style>

      {/* --- Modals & Offcanvas --- */}
      <TerminationFormOffcanvas 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        employees={employees}
        onSuccess={fetchData}
      />

      <TerminationDetailOffcanvas
        request={selectedRequest}
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onUpdate={fetchData}
      />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TermStatus }) {
  const config: Record<TermStatus, { bg: string, text: string, label: string }> = {
    Draft: { bg: "#f1f5f9", text: "#64748b", label: "Nháp" },
    Pending: { bg: "#fffbeb", text: "#d97706", label: "Chờ duyệt" },
    Approved: { bg: "#ecfdf5", text: "#059669", label: "Đã duyệt" },
    Handover: { bg: "#eff6ff", text: "#2563eb", label: "Bàn giao" },
    Finalizing: { bg: "#f5f3ff", text: "#7c3aed", label: "Quyết toán" },
    Completed: { bg: "#1e293b", text: "#fff", label: "Hoàn tất" },
  };
  const c = config[status] || config.Draft;
  return (
    <span className="badge px-3 py-2 border" style={{ background: c.bg, color: c.text, borderColor: `${c.text}22` }}>
      {c.label}
    </span>
  );
}

// --- Subcomponents ---

function TerminationFormOffcanvas({ isOpen, onClose, employees, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    type: "RESIGNATION",
    reason: "",
    requestDate: new Date().toISOString().split('T')[0],
    lastWorkingDay: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/hr/terminations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onSuccess();
        onClose();
        setFormData({ employeeId: "", type: "RESIGNATION", reason: "", requestDate: new Date().toISOString().split('T')[0], lastWorkingDay: "" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="position-fixed top-0 end-0 h-100 bg-white shadow-lg border-start overflow-hidden" style={{ width: "450px", zIndex: 1060 }}>
      <div className="p-4 h-100 d-flex flex-column">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="fw-bold mb-0">Tạo thủ tục mới</h5>
          <button className="btn btn-sm btn-light border" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow-1 overflow-auto pe-2">
          <div className="mb-4">
            <label className="form-label small fw-bold text-muted">1. Chọn nhân sự</label>
            <select 
              className="form-select" 
              required 
              value={formData.employeeId}
              onChange={e => setFormData({...formData, employeeId: e.target.value})}
            >
              <option value="">-- Tìm nhân viên --</option>
              {employees.map((e: any) => (
                <option key={e.id} value={e.id}>{e.fullName} ({e.code})</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold text-muted">2. Loại thủ tục</label>
            <div className="d-flex gap-2">
              <button 
                type="button"
                className={`btn flex-grow-1 py-3 border d-flex flex-column align-items-center gap-2 ${formData.type === "RESIGNATION" ? "btn-primary border-primary shadow" : "btn-light"}`}
                onClick={() => setFormData({...formData, type: "RESIGNATION"})}
              >
                <UserMinus />
                <span className="fw-bold small">Thôi việc</span>
              </button>
              <button 
                type="button"
                className={`btn flex-grow-1 py-3 border d-flex flex-column align-items-center gap-2 ${formData.type === "DISMISSAL" ? "btn-danger border-danger shadow" : "btn-light"}`}
                onClick={() => setFormData({...formData, type: "DISMISSAL"})}
              >
                <UserX />
                <span className="fw-bold small">Sa thải</span>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold text-muted">3. Ngày thông báo / tiếp nhận</label>
            <input 
              type="date" 
              className="form-control" 
              required
              value={formData.requestDate}
              onChange={e => setFormData({...formData, requestDate: e.target.value})}
            />
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold text-muted">4. Ngày dự kiến nghỉ việc</label>
            <input 
              type="date" 
              className="form-control" 
              value={formData.lastWorkingDay}
              onChange={e => setFormData({...formData, lastWorkingDay: e.target.value})}
            />
            <div className="small text-muted mt-1">Để trống nếu chưa xác định chính xác</div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold text-muted">5. Lý do chi tiết</label>
            <textarea 
              className="form-control" 
              rows={4} 
              placeholder="Nhập lý do cụ thể..."
              required
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
            />
          </div>
        </form>

        <div className="pt-4 border-top mt-auto">
          <button 
            className="btn btn-primary w-100 py-2 fw-bold" 
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "Đang xử lý..." : "Bắt đầu quy trình"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TerminationDetailOffcanvas({ request, isOpen, onClose, onUpdate }: any) {
  const [currentStep, setCurrentStep] = useState(1);
  const [localData, setLocalData] = useState<any>({
    exitInterviewNotes: "",
    isStayNegotiated: false,
    violationEvidence: "",
    disciplinaryMinutes: "",
    directorNote: "",
    interviewDate: "",
    interviewLocation: "",
    skipInterview: false,
    stayNegotiationDetails: "",
    handoverChecklist: { assets: false, docs: false, finance: false, it: false }
  });
  const [saving, setSaving] = useState(false);

  // Đồng bộ hóa state khi prop request thay đổi
  useEffect(() => {
    if (request) {
      setCurrentStep(request.step || 1);
      setLocalData({
        exitInterviewNotes: request.exitInterviewNotes || "",
        isStayNegotiated: request.isStayNegotiated || false,
        violationEvidence: request.violationEvidence || "",
        disciplinaryMinutes: request.disciplinaryMinutes || "",
        directorNote: request.directorNote || "",
        interviewDate: request.interviewDate || "",
        interviewLocation: request.interviewLocation || "",
        skipInterview: request.skipInterview || false,
        stayNegotiationDetails: request.stayNegotiationDetails || "",
        handoverChecklist: request.handoverChecklist ? JSON.parse(request.handoverChecklist) : {
          assets: false, docs: false, finance: false, it: false
        }
      });
    }
  }, [request?.id, request?.step]);


  if (!request) return null;

  const steps = request.type === "RESIGNATION" ? STEPS_RESIGNATION : STEPS_DISMISSAL;

  const handleSaveData = async (updates: any = {}) => {
    setSaving(true);
    try {
      const dataToSave = {
        ...updates,
        handoverChecklist: localData.handoverChecklist ? JSON.stringify(localData.handoverChecklist) : null
      };
      await fetch(`/api/hr/terminations/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave)
      });
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = async () => {
    let nextStep = currentStep + 1;
    if (currentStep === 1 && localData.skipInterview && request.type === "RESIGNATION") {
      nextStep = 3;
    }
    
    let nextStatus = request.status;
    
    // Logic transitions based on flowcharts
    if (request.type === "RESIGNATION") {
      if (nextStep === 2) nextStatus = "Pending";
      if (nextStep === 3) nextStatus = "Approved"; 
      if (nextStep === 4) nextStatus = "Handover";
      if (nextStep === 5) nextStatus = "Completed";
    } else {
      if (nextStep === 2) nextStatus = "Pending";
      if (nextStep === 3) nextStatus = "Approved";
      if (nextStep === 5) nextStatus = "Handover";
      if (nextStep === 7) nextStatus = "Finalizing";
      if (nextStep === 9) nextStatus = "Completed";
    }

    // Save current step data before moving to next
    await handleSaveData({ 
      step: nextStep, 
      status: nextStatus,
      ...localData,
      handoverChecklist: JSON.stringify(localData.handoverChecklist)
    });

    // Cập nhật state cục bộ để chuyển bước ngay lập tức trên UI
    setCurrentStep(nextStep);
    
    // Nếu là bước cuối cùng thì mới đóng
    if (nextStep > steps.length) {
      onClose();
    }
  };

  return (
    <div className="position-fixed top-0 end-0 h-100 bg-white shadow-lg border-start overflow-hidden" style={{ width: "850px", zIndex: 1060 }}>
      <div className="p-0 h-100 d-flex flex-column bg-light">
        {/* Header Strip */}
        <div className="bg-white p-4 border-bottom shadow-sm">
          <div className="d-flex justify-content-between align-items-start">
            <div className="d-flex align-items-center gap-4">
              <div className="position-relative">
                <EmployeeAvatar 
                  name={request.employee?.fullName} 
                  url={request.employee?.avatarUrl} 
                  size={64} 
                  borderRadius={99}
                  style={{ border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                />
                <div className={`position-absolute bottom-0 end-0 p-1 rounded-circle border border-white shadow-sm ${request.type === 'RESIGNATION' ? 'bg-primary' : 'bg-danger'}`} style={{ width: 22, height: 22, zIndex: 1 }}>
                  {request.type === 'RESIGNATION' ? <UserMinus size={12} className="text-white" /> : <UserX size={12} className="text-white" />}
                </div>
              </div>
              <div>
                <h4 className="fw-bold mb-1">{request.employee?.fullName}</h4>
                <div className="d-flex gap-2 align-items-center text-muted">
                  <span className="badge bg-light text-dark border">{request.employee?.code}</span>
                  <span className="opacity-50">•</span>
                  <span className="small">{request.employee?.position}</span>
                  <span className="opacity-50">•</span>
                  <span className="small">{request.employee?.departmentName}</span>
                </div>
              </div>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <StatusBadge status={request.status} />
              <button className="btn btn-sm btn-light border ms-2 rounded-circle" style={{ width: 32, height: 32 }} onClick={onClose}>&times;</button>
            </div>
          </div>

          {/* Horizontal Stepper */}
          <div className="mt-4 pt-3 border-top overflow-auto hide-scrollbar">
            <div className="d-flex justify-content-between position-relative px-2 mb-3" style={{ minWidth: "750px" }}>
              <div className="position-absolute top-50 start-0 translate-middle-y w-100 bg-light-subtle border-top border-2" style={{ zIndex: 0 }} />
              {steps.map(s => (
                <div 
                  key={s.id} 
                  className="position-relative d-flex flex-column align-items-center cursor-pointer group" 
                  style={{ zIndex: 1, width: "80px" }}
                  onClick={() => setCurrentStep(s.id)}
                >
                  <div className={`rounded-circle border-2 d-flex align-items-center justify-content-center transition-all ${
                    s.id < currentStep ? "bg-success border-success text-white" : 
                    s.id === currentStep ? "bg-primary border-primary text-white shadow-lg scale-110" : "bg-white border-light text-muted"
                  } hover:border-primary`} style={{ width: 32, height: 32, fontSize: "14px", fontWeight: 700 }}>
                    {s.id < currentStep ? <i className="bi bi-check-lg" /> : s.id}
                  </div>
                  <span className={`small mt-2 text-center x-small fw-bold transition-all ${s.id === currentStep ? "text-primary" : "text-muted"} group-hover:text-primary`} style={{ lineHeight: 1.2 }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-grow-1 p-4 overflow-auto">
          <div className="row g-4">
            {/* Left: Main Action Form */}
            <div className="col-md-7">
              <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                <div className="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                    <div className={`p-2 rounded-3 ${request.type === 'RESIGNATION' ? 'bg-primary-subtle text-primary' : 'bg-danger-subtle text-danger'}`}>
                      <i className={`bi ${steps.find(s => s.id === currentStep)?.icon}`} />
                    </div>
                    Bước {currentStep}: {steps.find(s => s.id === currentStep)?.label}
                  </h6>
                </div>
                <div className="card-body bg-white">
                  {/* STEP 1: INITIAL REASON / EVIDENCE */}
                  {currentStep === 1 && (
                    <div className="animate__animated animate__fadeIn">
                      {request.type === "RESIGNATION" ? (
                        <>
                          <div className="mb-4">
                            <label className="form-label x-small fw-bold text-muted text-uppercase ls-1">Lý do xin thôi việc (từ nhân sự)</label>
                            <div className="bg-light p-3 rounded-4 border-0 fw-semibold text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                              {request.reason}
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="form-label x-small fw-bold text-muted text-uppercase ls-1">Kế hoạch phỏng vấn thôi việc</label>
                            <div className="bg-light p-3 rounded-4 border-0">
                              <div className="form-check form-switch mb-3">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  checked={localData.skipInterview}
                                  onChange={e => setLocalData({...localData, skipInterview: e.target.checked})}
                                />
                                <label className="form-check-label small fw-bold">Bỏ qua bước phỏng vấn thôi việc</label>
                              </div>

                              {!localData.skipInterview && (
                                <div className="row g-3 animate__animated animate__fadeIn">
                                  <div className="col-md-6">
                                    <label className="form-label x-small text-muted">Thời gian phỏng vấn</label>
                                    <input 
                                      type="datetime-local" 
                                      className="form-control form-control-sm rounded-3"
                                      value={localData.interviewDate}
                                      onChange={e => setLocalData({...localData, interviewDate: e.target.value})}
                                    />
                                  </div>
                                  <div className="col-md-6">
                                    <label className="form-label x-small text-muted">Địa điểm</label>
                                    <input 
                                      type="text" 
                                      className="form-control form-control-sm rounded-3"
                                      placeholder="Phòng họp / Link Zoom..."
                                      value={localData.interviewLocation}
                                      onChange={e => setLocalData({...localData, interviewLocation: e.target.value})}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="mb-4">
                          <label className="form-label x-small fw-bold text-muted text-uppercase ls-1">Bằng chứng / Hồ sơ vi phạm</label>
                          <textarea 
                            className="form-control rounded-4 bg-light border-0 p-3" 
                            rows={6}
                            placeholder="Mô tả chi tiết các vi phạm, đính kèm link hồ sơ nếu có..."
                            value={localData.violationEvidence}
                            onChange={e => setLocalData({...localData, violationEvidence: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 2: EXIT INTERVIEW / DISCIPLINARY MEETING */}
                  {currentStep === 2 && (
                    <div className="animate__animated animate__fadeIn">
                      {request.type === "RESIGNATION" ? (
                        <>
                          <div className="mb-4">
                            <label className="form-label x-small fw-bold text-muted text-uppercase ls-1">Nội dung phỏng vấn thôi việc</label>
                            <textarea 
                              className="form-control rounded-4 bg-light border-0 p-3" 
                              rows={8}
                              placeholder="Ghi chú tâm tư, nguyện vọng và nguyên nhân sâu xa..."
                              value={localData.exitInterviewNotes}
                              onChange={e => setLocalData({...localData, exitInterviewNotes: e.target.value})}
                            />
                          </div>
                          <div className="form-check form-switch p-3 bg-light rounded-4 border-0 mb-3">
                            <input 
                              className="form-check-input ms-0 me-3" 
                              type="checkbox" 
                              id="stayNegotiationToggle"
                              checked={localData.isStayNegotiated}
                              onChange={e => setLocalData({...localData, isStayNegotiated: e.target.checked})}
                            />
                            <label className="form-check-label small fw-bold" htmlFor="stayNegotiationToggle">Có phương án thỏa thuận giữ chân (Stay Negotiation)</label>
                          </div>

                          {localData.isStayNegotiated && (
                            <div className="mb-4 animate__animated animate__fadeIn">
                              <label className="form-label x-small fw-bold text-muted text-uppercase ls-1">Chi tiết phương án giữ chân</label>
                              <textarea 
                                className="form-control rounded-4 bg-light border-0 p-3" 
                                rows={4}
                                placeholder="Mô tả các đề xuất tăng lương, thăng chức hoặc thay đổi chế độ..."
                                value={localData.stayNegotiationDetails}
                                onChange={e => setLocalData({...localData, stayNegotiationDetails: e.target.value})}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mb-4">
                          <label className="form-label x-small fw-bold text-muted text-uppercase ls-1">Biên bản họp kỷ luật</label>
                          <textarea 
                            className="form-control rounded-4 bg-light border-0 p-3" 
                            rows={8}
                            placeholder="Ghi chú diễn biến cuộc họp và ý kiến các bên..."
                            value={localData.disciplinaryMinutes}
                            onChange={e => setLocalData({...localData, disciplinaryMinutes: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3: APPROVAL (FOR RESIGNATION) / DECISION (FOR DISMISSAL) */}
                  {currentStep === 3 && (
                    <div className="animate__animated animate__fadeIn">
                      <div className="text-center py-4 mb-4">
                        <div className="mb-3">
                          <div className={`d-inline-flex p-3 rounded-circle ${request.status === 'Approved' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                            <ShieldCheck size={40} />
                          </div>
                        </div>
                        <h6 className="fw-bold mb-1">Xác nhận phê duyệt từ Ban Giám đốc</h6>
                        <p className="text-muted small">Hiện tại yêu cầu đang ở trạng thái: <span className="fw-bold text-primary">{request.status}</span></p>
                      </div>

                      <div className="mb-4">
                        <label className="form-label x-small fw-bold text-muted text-uppercase ls-1">Ghi chú phê duyệt / Quyết định</label>
                        <textarea 
                          className="form-control rounded-4 bg-light border-0 p-3" 
                          rows={4}
                          placeholder="Nhập ý kiến chỉ đạo hoặc căn cứ quyết định..."
                          value={localData.directorNote}
                          onChange={e => setLocalData({...localData, directorNote: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 4: HANDOVER */}
                  {currentStep === 4 && (
                    <div className="animate__animated animate__fadeIn">
                      <label className="form-label x-small fw-bold text-muted text-uppercase ls-1 mb-3">Danh mục bàn giao thực tế</label>
                      <div className="d-flex flex-column gap-3">
                        {[
                          { id: 'assets', label: 'Tài sản & Thiết bị (Laptop, Thẻ, ...)', icon: <Lock size={16}/> },
                          { id: 'docs', label: 'Tài liệu & Công việc (Dữ liệu, Quy trình)', icon: <FileText size={16}/> },
                          { id: 'finance', label: 'Công nợ & Tạm ứng (Phòng kế toán)', icon: <Wallet size={16}/> },
                          { id: 'it', label: 'Tài khoản & Phân quyền (Hệ thống IT)', icon: <ArrowRightLeft size={16}/> }
                        ].map(item => (
                          <div 
                            key={item.id} 
                            className={`d-flex align-items-center justify-content-between p-3 rounded-4 border-0 transition-all ${localData.handoverChecklist?.[item.id] ? 'bg-success-subtle text-success' : 'bg-light text-dark'}`}
                            onClick={() => {
                              const newList = { ...localData.handoverChecklist, [item.id]: !localData.handoverChecklist?.[item.id] };
                              setLocalData({ ...localData, handoverChecklist: newList });
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center gap-3">
                              {item.icon}
                              <span className="small fw-bold">{item.label}</span>
                            </div>
                            {localData.handoverChecklist?.[item.id] ? <CheckCircle2 size={18} /> : <div className="rounded-circle border border-2" style={{ width: 18, height: 18 }} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 5: FINALIZATION / COMPLETION */}
                  {currentStep === 5 && (
                    <div className="animate__animated animate__fadeIn text-center py-5">
                      <div className="mb-4">
                        <div className="d-inline-flex p-4 rounded-circle bg-success-subtle text-success">
                          <CheckCircle2 size={64} strokeWidth={1.5} />
                        </div>
                      </div>
                      <h5 className="fw-bold">Sẵn sàng hoàn tất thủ tục</h5>
                      <p className="text-muted small px-4 mb-4">Tất cả các bước tiếp nhận, phỏng vấn, phê duyệt và bàn giao đã được ghi nhận. Xác nhận để đóng hồ sơ và cập nhật trạng thái nhân viên.</p>
                      
                      <div className="bg-light p-3 rounded-4 text-start mx-4">
                        <div className="d-flex justify-content-between mb-2 small">
                          <span className="text-muted">Nhân sự:</span>
                          <span className="fw-bold">{request.employee?.fullName}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2 small">
                          <span className="text-muted">Ngày nghỉ chính thức:</span>
                          <span className="fw-bold text-primary">{request.lastWorkingDay ? new Date(request.lastWorkingDay).toLocaleDateString('vi-VN') : 'Chưa xác định'}</span>
                        </div>
                        <div className="d-flex justify-content-between small">
                          <span className="text-muted">Trạng thái:</span>
                          <span className="badge bg-success">Đã sẵn sàng</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback for other steps */}
                  {![1, 2, 3, 4, 5].includes(currentStep) && (
                    <div className="text-center py-5 opacity-75">
                      <div className="mb-4 text-primary opacity-25">
                        <ClipboardCheck size={80} strokeWidth={1} />
                      </div>
                      <h5 className="fw-bold mb-2">Bước {currentStep}: {steps.find(s => s.id === currentStep)?.label}</h5>
                      <p className="text-muted small px-4">Đang trong quá trình xử lý hồ sơ thực tế.<br/>Sau khi các bên liên quan hoàn tất nội dung này, hãy xác nhận để chuyển sang bước tiếp theo.</p>
                      
                      <div className="mt-4 mx-auto" style={{ maxWidth: '300px' }}>
                        <label className="form-label x-small fw-bold text-muted text-uppercase">Ghi chú bổ sung (nếu có)</label>
                        <textarea 
                          className="form-control rounded-4 bg-light border-0" 
                          rows={3}
                          value={localData.directorNote}
                          onChange={e => setLocalData({...localData, directorNote: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="card-footer bg-white border-0 p-4 pt-0">
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-outline-secondary py-3 fw-bold rounded-4 flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                      onClick={() => handleSaveData(localData)}
                      disabled={saving}
                    >
                      {saving ? 'Đang lưu...' : (
                        <>
                          <i className="bi bi-save" />
                          Lưu thông tin
                        </>
                      )}
                    </button>
                    <button 
                      className={`btn py-3 fw-bold rounded-4 shadow-sm d-flex align-items-center justify-content-center gap-2 transition-all flex-grow-1 ${saving ? 'opacity-50' : ''} ${request.type === 'RESIGNATION' ? 'btn-primary' : 'btn-danger'}`}
                      onClick={handleNextStep}
                      disabled={saving}
                    >
                      {saving ? 'Đang xử lý...' : (
                        <>
                          {currentStep === steps.length ? 'Hoàn tất quy trình' : 'Xác nhận & Chuyển bước'}
                          <ChevronRight size={20} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Summary & Timeline */}
            <div className="col-md-5">
              <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-4 small text-uppercase ls-1 text-muted">Chi tiết yêu cầu</h6>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Ngày gửi đơn:</span>
                      <span className="fw-bold small">{new Date(request.requestDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Ngày dự kiến nghỉ:</span>
                      <span className="fw-bold small text-primary">
                        {request.lastWorkingDay ? new Date(request.lastWorkingDay).toLocaleDateString('vi-VN') : "---"}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Loại hình:</span>
                      <span className={`badge rounded-pill ${request.type === 'RESIGNATION' ? 'bg-primary-subtle text-primary' : 'bg-danger-subtle text-danger'}`}>
                        {request.type === 'RESIGNATION' ? 'Thôi việc tự nguyện' : 'Sa thải kỷ luật'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <span className="text-muted small">Tiến độ quy trình:</span>
                      <span className="fw-bold small">{Math.round((currentStep/steps.length)*100)}%</span>
                    </div>
                  </div>
                  <div className="progress mt-3" style={{ height: "6px", borderRadius: "10px" }}>
                    <div className={`progress-bar progress-bar-animated progress-bar-striped ${request.type === 'RESIGNATION' ? 'bg-primary' : 'bg-danger'}`} 
                      style={{ width: `${(currentStep/steps.length)*100}%` }} />
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="card-header bg-white border-0 py-3">
                  <h6 className="fw-bold mb-0 small text-uppercase ls-1 text-muted">Lịch sử xử lý</h6>
                </div>
                <div className="card-body p-4 pt-0">
                  <div className="timeline">
                    {steps.filter(s => s.id <= currentStep).reverse().map((s, idx) => (
                      <div key={s.id} className="d-flex gap-3 mb-4 position-relative">
                        {idx < steps.filter(s => s.id <= currentStep).length - 1 && (
                          <div className="position-absolute start-0 top-0 mt-4 ms-2 h-100 border-start border-2 border-light" style={{ zIndex: 0 }} />
                        )}
                        <div className={`flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center z-1 ${s.id === currentStep ? 'bg-primary text-white shadow' : 'bg-success text-white'}`} style={{ width: 20, height: 20 }}>
                          {s.id === currentStep ? <Clock size={12}/> : <CheckCircle2 size={12} />}
                        </div>
                        <div>
                          <div className={`fw-bold small ${s.id === currentStep ? 'text-primary' : 'text-success'}`}>
                            {s.id === currentStep ? 'Đang thực hiện' : 'Hoàn tất'} - {s.label}
                          </div>
                          <div className="text-muted x-small">
                            {s.id === currentStep ? 'Cập nhật vừa xong' : 'Đã được xác nhận hệ thống'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ls-1 { letter-spacing: 0.5px; }
        .x-small { font-size: 11px; }
        .scale-110 { transform: scale(1.15); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .alert-soft-primary { background: #eef2ff; color: #4338ca; }
        .bg-primary-subtle { background: #e0e7ff; }
        .bg-danger-subtle { background: #fee2e2; }
        .bg-success-subtle { background: #dcfce7; }
        .transition-all { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
}
