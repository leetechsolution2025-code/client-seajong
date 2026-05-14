"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tab, TabItem } from "@/components/ui/Tab";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { Table, TableColumn } from "@/components/ui/Table";
import { CreateTrainingRequestModal } from "./components/CreateTrainingRequestModal";
import { CreateTrainingPlanModal } from "./components/CreateTrainingPlanModal";
import { CourseExecutionModal } from "./components/CourseExecutionModal";
import { TrainingRequestOffcanvas } from "./components/TrainingRequestOffcanvas";
import { useToast } from "@/components/ui/Toast";

// --- TYPES ---
interface TrainingRequest {
  id: string;
  topic: string;
  target: string;
  goal: string;
  duration: string;
  type: "PERIODIC" | "ADHOC";
  status: "PENDING" | "APPROVED" | "REJECTED" | "PLANNING";
  priority: "NORMAL" | "HIGH";
  description?: string;
  createdAt: string;
  plan?: TrainingPlan;
}

interface TrainingPlan {
  id: string;
  requestId: string;
  startDate: string;
  endDate: string;
  cost: number;
  location: string;
  instructor: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  request: TrainingRequest;
}

interface TrainingCourse {
  id: string;
  requestId: string;
  planId?: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  startDate: string;
  request?: TrainingRequest;
  plan?: TrainingPlan;
  participants?: any[];
}

const STEPS: ModernStepItem[] = [
  { num: 1, id: "requests", title: "Yêu cầu", desc: "Tiếp nhận & Phân loại", icon: "bi-clipboard-check" },
  { num: 2, id: "plans", title: "Kế hoạch", desc: "Chi phí & Phê duyệt", icon: "bi-calendar-event" },
  { num: 3, id: "courses", title: "Triển khai", desc: "Lớp học & Đào tạo", icon: "bi-mortarboard" },
  { num: 4, id: "reports", title: "Báo cáo", desc: "Đánh giá & Hiệu quả", icon: "bi-bar-chart-line" },
];

export default function TrainingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isExecModalOpen, setIsExecModalOpen] = useState(false);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TrainingRequest | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  
  const { success, error: toastError } = useToast();

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/hr/training/requests");
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
    } catch (err) { console.error(err); }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/hr/training/plans");
      const data = await res.json();
      if (Array.isArray(data)) setPlans(data);
    } catch (err) { console.error(err); }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/hr/training/courses");
      const data = await res.json();
      if (Array.isArray(data)) setCourses(data);
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchRequests(), fetchPlans(), fetchCourses()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateRequestStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/hr/training/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        success("Thành công", `Đã ${status === "APPROVED" ? "phê duyệt" : "từ chối"} yêu cầu`);
        setIsOffcanvasOpen(false);
        fetchData();
      }
    } catch (err) {
      toastError("Lỗi", "Không thể cập nhật yêu cầu");
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/hr/training/requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        success("Thành công", "Đã xoá yêu cầu");
        setIsOffcanvasOpen(false);
        fetchData();
      }
    } catch (err) {
      toastError("Lỗi", "Không thể xoá yêu cầu");
    }
  };

  const handleApprovePlan = async (planId: string) => {
    try {
      const res = await fetch(`/api/hr/training/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "APPROVED" })
      });
      if (res.ok) {
        success("Thành công", "Đã phê duyệt kế hoạch đào tạo");
        fetchData();
      }
    } catch (err) {
      toastError("Lỗi", "Không thể phê duyệt kế hoạch");
    }
  };

  const handleStartCourse = async (source: { requestId?: string, planId?: string, startDate?: string }) => {
    try {
      const res = await fetch("/api/hr/training/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...source,
          startDate: new Date().toISOString()
        })
      });
      if (res.ok) {
        success("Thành công", "Đã khởi tạo lớp học");
        setCurrentStep(3);
        fetchData();
      }
    } catch (err) {
      toastError("Lỗi", "Không thể khởi tạo lớp học");
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg: any = {
      APPROVED: { bg: "rgba(34, 197, 94, 0.1)", color: "#16a34a", label: "Đã phê duyệt" },
      PENDING: { bg: "rgba(234, 179, 8, 0.1)", color: "#ca8a04", label: "Mới" },
      REJECTED: { bg: "rgba(239, 68, 68, 0.1)", color: "#dc2626", label: "Không chấp nhận" },
      PLANNING: { bg: "rgba(59, 130, 246, 0.1)", color: "#2563eb", label: "Đang duyệt" },
      PLANNED: { bg: "rgba(59, 130, 246, 0.1)", color: "#2563eb", label: "Đã lên lịch" },
      IN_PROGRESS: { bg: "rgba(34, 197, 94, 0.1)", color: "#16a34a", label: "Đang diễn ra" },
      COMPLETED: { bg: "rgba(71, 85, 105, 0.1)", color: "#475569", label: "Hoàn thành" },
    };
    const c = cfg[status] || { bg: "var(--muted)", color: "var(--muted-foreground)", label: status };
    return (
      <span style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700, borderRadius: "6px", backgroundColor: c.bg, color: c.color }}>
        {c.label}
      </span>
    );
  };

  const requestColumns: TableColumn<TrainingRequest>[] = [
    {
      header: "Chủ đề đào tạo",
      render: (row) => (
        <div>
          <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>{row.topic}</div>
          <div className="text-muted small">ID: {row.id.substring(0, 8)}</div>
        </div>
      ),
      width: "30%",
    },
    { 
      header: "Đối tượng & Mục tiêu", 
      render: (row) => (
        <div style={{ maxWidth: "300px" }}>
          <div className="fw-bold text-dark mb-1">{row.target}</div>
          {row.goal && row.goal.split("\n").filter(g => g.trim()).map((g, i) => (
            <div key={i} className="d-flex gap-2 align-items-start text-muted" style={{ fontSize: "12px", lineHeight: "1.4" }}>
              <span style={{ fontSize: "8px", marginTop: "4px" }}>●</span>
              <span>{g.trim()}</span>
            </div>
          ))}
        </div>
      ),
      width: "35%",
    },
    { header: "Phân loại", render: (row) => <span className="small">{row.type === "PERIODIC" ? "Hàng năm" : "Phát sinh"}</span> },
    { header: "Trạng thái", render: (row) => <StatusBadge status={row.status} />, align: "right" },
  ];

  const planColumns: TableColumn<TrainingPlan>[] = [
    {
      header: "Kế hoạch cho chủ đề",
      render: (row) => (
        <div>
          <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>{row.request?.topic}</div>
          <div className="text-muted small">GV: {row.instructor || "Chưa xác định"}</div>
        </div>
      ),
      width: "30%",
    },
    { header: "Thời gian", render: (row) => <div className="small">{row.startDate ? new Date(row.startDate).toLocaleDateString("vi-VN") : "---"}</div> },
    { header: "Địa điểm", render: (row) => <div className="small">{row.location || "---"}</div> },
    { header: "Chi phí", render: (row) => <div className="small fw-bold text-success">{row.cost.toLocaleString()} đ</div> },
    { header: "Phê duyệt", render: (row) => <StatusBadge status={row.approvalStatus} />, align: "right" },
  ];

  const courseColumns: TableColumn<TrainingCourse>[] = [
    {
      header: "Lớp học",
      render: (row) => (
        <div className="d-flex align-items-center gap-3">
          <div className="bg-indigo-soft text-indigo rounded-3 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, backgroundColor: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}>
            <i className="bi bi-mortarboard-fill"></i>
          </div>
          <div>
            <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>{row.request?.topic}</div>
            <div className="text-muted small">Bắt đầu: {row.startDate ? new Date(row.startDate).toLocaleDateString("vi-VN") : "---"}</div>
          </div>
        </div>
      ),
      width: "40%",
    },
    { header: "Trạng thái", render: (row) => <StatusBadge status={row.status} /> },
    {
      header: "Thao tác",
      align: "right",
      render: (row) => (
        <div className="d-flex gap-2 justify-content-end">
          <button 
            className="btn btn-sm btn-indigo fw-bold text-white" 
            style={{ borderRadius: "8px", fontSize: "12px", background: "#6366f1" }}
            onClick={() => {
              setSelectedCourse(row);
              setIsExecModalOpen(true);
            }}
          >
            Điểm danh & Test
          </button>
          <button className="btn btn-sm btn-light border" style={{ borderRadius: "8px" }}><i className="bi bi-three-dots-vertical small"></i></button>
        </div>
      ),
    },
  ];

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader title="Quản lý đào tạo và thử việc" description="Số hóa quy trình đào tạo nội bộ và theo dõi lộ trình thử việc của nhân sự mới" icon="bi-mortarboard-fill" color="indigo" />

      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm flex-grow-1 d-flex flex-column" style={{ minHeight: 0, border: "1px solid var(--border)", borderTop: "none" }}>
          <div className="px-4 py-2">
            <ModernStepper steps={STEPS} currentStep={currentStep} onStepChange={setCurrentStep} paddingX={0} />
          </div>

          <div className="flex-grow-1 d-flex flex-column px-4 pb-4 pt-0" style={{ minHeight: 0 }}>
            <div className="flex-grow-1 overflow-auto custom-scrollbar mt-3">
              {currentStep === 1 && (
                <Table 
                  rows={requests} columns={requestColumns} loading={loading} 
                  emptyText="Chưa có yêu cầu đào tạo nào" rowKey={(r) => r.id} 
                  onRowClick={(row) => { setSelectedRequest(row); setIsOffcanvasOpen(true); }}
                />
              )}
              {currentStep === 2 && (
                <Table 
                  rows={plans} columns={planColumns} loading={loading} 
                  emptyText="Chưa có kế hoạch đào tạo nào" rowKey={(r) => r.id} 
                  onRowClick={(row) => { setSelectedRequest(row.request); setIsOffcanvasOpen(true); }}
                />
              )}
              {currentStep === 3 && <Table rows={courses} columns={courseColumns} loading={loading} emptyText="Chưa có lớp học nào đang triển khai" rowKey={(r) => r.id} />}
              {currentStep === 4 && (
              <div className="row g-4">
                <div className="col-md-3">
                  <div className="p-4 border rounded-4 bg-white shadow-sm">
                    <div className="text-muted small fw-bold mb-1">TỔNG KHOÁ HỌC</div>
                    <div className="h2 fw-bold mb-0">{courses.length}</div>
                    <div className="text-success small mt-2"><i className="bi bi-arrow-up"></i> +2 tháng này</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="p-4 border rounded-4 bg-white shadow-sm">
                    <div className="text-muted small fw-bold mb-1">HỌC VIÊN THAM GIA</div>
                    <div className="h2 fw-bold mb-0">{courses.reduce((acc, c) => acc + (c.participants?.length || 0), 0)}</div>
                    <div className="text-primary small mt-2">Đang đào tạo...</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="p-4 border rounded-4 bg-white shadow-sm">
                    <div className="text-muted small fw-bold mb-1">ĐIỂM TRUNG BÌNH</div>
                    <div className="h2 fw-bold mb-0">8.5</div>
                    <div className="text-warning small mt-2">Dựa trên bài test MCQ</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="p-4 border rounded-4 bg-white shadow-sm">
                    <div className="text-muted small fw-bold mb-1">CHI PHÍ ĐÀO TẠO</div>
                    <div className="h2 fw-bold mb-0">{(plans.reduce((acc, p) => acc + p.cost, 0) / 1000000).toFixed(1)}M</div>
                    <div className="text-muted small mt-2">VNĐ (Dự kiến)</div>
                  </div>
                </div>

                <div className="col-12 mt-4">
                  <h6 className="fw-bold mb-3">Hiệu quả đào tạo theo phòng ban</h6>
                  <div className="p-4 border rounded-4 bg-white shadow-sm" style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="text-muted text-center">
                      <i className="bi bi-pie-chart" style={{ fontSize: "32px", opacity: 0.3 }}></i>
                      <p className="mt-2 small">Biểu đồ phân tích hiệu quả đang được tổng hợp...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateTrainingRequestModal isOpen={isRequestModalOpen} onClose={() => { setIsRequestModalOpen(false); setSelectedRequest(null); }} onSuccess={fetchData} initialData={selectedRequest} />
      <CreateTrainingPlanModal isOpen={isPlanModalOpen} onClose={() => { setIsPlanModalOpen(false); setSelectedRequest(null); }} onSuccess={fetchData} request={selectedRequest} />
      <CourseExecutionModal isOpen={isExecModalOpen} onClose={() => { setIsExecModalOpen(false); setSelectedCourse(null); }} course={selectedCourse} onSuccess={fetchData} />
      
      <TrainingRequestOffcanvas 
        isOpen={isOffcanvasOpen} 
        onClose={() => { setIsOffcanvasOpen(false); setSelectedRequest(null); }} 
        data={selectedRequest}
        onApprove={(id) => handleUpdateRequestStatus(id, "APPROVED")}
        onReject={(id) => handleUpdateRequestStatus(id, "REJECTED")}
        onDelete={(id) => handleDeleteRequest(id)}
      />
    </div>
    </div>
  );
}
