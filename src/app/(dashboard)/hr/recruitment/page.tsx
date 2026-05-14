"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { StandardPage } from "@/components/layout/StandardPage";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { Table } from "@/components/ui/Table";
import { BrandButton } from "@/components/ui/BrandButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { motion, AnimatePresence } from "framer-motion";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { CreateRequestModal } from "./components/CreateRequestModal";
import { IntegrationPanel } from "./components/IntegrationPanel";
import { ProbationStep } from "./components/ProbationStep";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";


// --- TYPES ---
interface RecruitmentRequest {
  id: string;
  department: string;
  position: string;
  quantity: number;
  requestedBy: string;
  date: string;
  deadline: string;
  status: "Pending" | "Approved" | "Rejected" | "Completed" | "Recruiting" | "Interviewing" | "Submitting" | "Hired" | "RejectedHiring";
  priority: "High" | "Normal";
  description?: string;
  requirements?: string;
  specialty?: string;
  salaryMin?: number;
  salaryMax?: number;
  candidates?: Candidate[];
}

interface Candidate {
  id: string;
  requestId: string;
  name: string;
  position: string;
  source: string;
  date: string;
  experience: string;
  expYears?: string;
  status: string;
  matchScore?: number;
  phone?: string;
  email?: string;
  address?: string;
  profileUrl?: string;
  cvUrl?: string;
  skills?: string | string[];
  summary?: string;
  interviewDate?: string;
  interviewer?: string;
  interviewLocation?: string;
  interviewNotes?: string;
  desiredSalary?: string;
  education?: string;
  gender?: string;
}

const StatusBadge = ({ status, isCandidate, source }: { status: string, isCandidate?: boolean, source?: string }) => {
  if (isCandidate && status === 'New') {
    if (source === 'VIECLAM24H' || source === 'TOPCV') {
      return (
        <span style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'inline-block' }}>
          Đã đăng ký
        </span>
      );
    }
    return null;
  }

  const cfg: any = {
    'Pending': { bg: '#e0f2fe', color: '#0369a1', label: 'Chờ duyệt' },
    'Approved': { bg: '#dcfce7', color: '#166534', label: 'Đã duyệt' },
    'Rejected': { bg: '#fee2e2', color: '#991b1b', label: 'Từ chối' },
    'Recruiting': { bg: '#fef9c3', color: '#854d0e', label: 'Đang tìm ứng viên' },
    'Interviewing': { bg: '#fff7ed', color: '#c2410c', label: 'Chờ phỏng vấn' },
    'Submitting': { bg: '#f5f3ff', color: '#6d28d9', label: 'Đang trình Giám đốc' },
    'Hired': { bg: '#f0fdf4', color: '#15803d', label: 'Đã tuyển dụng' },
    'RejectedHiring': { bg: '#fee2e2', color: '#991b1b', label: 'Từ chối tuyển dụng' },
    'Completed': { bg: '#f1f5f9', color: '#475569', label: 'Hoàn thành' },
    // Candidate specific
    'New': { bg: '#e0f2fe', color: '#0369a1', label: 'Mới' },
    'Unclassified': { bg: '#fef9c3', color: '#854d0e', label: 'Đang rà soát' },
    'Qualified': { bg: '#dcfce7', color: '#166534', label: 'Phù hợp' },
    'DeptReview': { bg: '#f5f3ff', color: '#6d28d9', label: 'Chờ chuyên môn duyệt' },
    'DeptApproved': { bg: '#dcfce7', color: '#166534', label: 'Chuyên môn đã duyệt' },
    'DeptRejected': { bg: '#fee2e2', color: '#991b1b', label: 'Chuyên môn từ chối' },
    'Pending Review': { bg: '#fef9c3', color: '#854d0e', label: 'Chờ rà soát' },
    'Đã gửi thư mời': { bg: '#e0f2fe', color: '#0369a1', label: 'Đã gửi thư mời' },
    'Đã nhận việc': { bg: '#dcfce7', color: '#166534', label: 'Đã nhận việc' },
    'Không nhận việc': { bg: '#fee2e2', color: '#991b1b', label: 'Không nhận việc' },
    'Đang thử việc': { bg: '#dcfce7', color: '#166534', label: 'Đang thử việc' },
  };
  const c = cfg[status] || { bg: '#f1f5f9', color: '#475569', label: status };
  return (
    <span style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '4px', backgroundColor: c.bg, color: c.color, display: 'inline-block' }}>
      {c.label}
    </span>
  );
};

const MatchScore = ({ score, analysis }: { score?: number, analysis?: string }) => {
  if (score === undefined || score === null) return <span className="text-muted" style={{ fontSize: "11px" }}>--</span>;
  const color = score >= 85 ? "#166534" : score >= 60 ? "#854d0e" : "#991b1b";
  return (
    <div className="d-flex align-items-center" title={analysis}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%",
        background: `conic-gradient(${color} ${score}%, transparent 0)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2px", position: "relative"
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: "#fff", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "10px", fontWeight: 700, color: color
        }}>
          {score}%
        </div>
      </div>
    </div>
  );
};


function RecruitmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stepParam = searchParams.get("step");
  const [step, setStep] = useState(stepParam ? parseInt(stepParam) : 1);

  // Sync step with URL if changed internally
  useEffect(() => {
    if (stepParam) {
      const s = parseInt(stepParam);
      if (s !== step) setStep(s);
    }
  }, [stepParam]);
  const [requests, setRequests] = useState<RecruitmentRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("All");
  const [candidatePositionFilter, setCandidatePositionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RecruitmentRequest | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [isVieclam24hActive, setIsVieclam24hActive] = useState(true);
  const [isTopCVActive, setIsTopCVActive] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [editRequestData, setEditRequestData] = useState<RecruitmentRequest | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'match' | 'date'>('match');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [mounted, setMounted] = useState(false);
  const [topcvToken, setTopcvToken] = useState("");
  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean;
    title: string;
    message: string | React.ReactNode;
    variant: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    variant: "danger",
    onConfirm: () => { }
  });

  // --- Step 4: Recruitment Report States ---
  const [reportCandidates, setReportCandidates] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [reportPositionFilter, setReportPositionFilter] = useState("All");
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [selectedReportCandidate, setSelectedReportCandidate] = useState<any | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);


  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [showApprovalOffcanvas, setShowApprovalOffcanvas] = useState(false);
  const [transferNote, setTransferNote] = useState("");

  const { success, error: toastError, info } = useToast();

  // Interview states
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/hr/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      fetchRequests();
      fetchReportData();
      success("Thành công", "Đã cập nhật trạng thái");
    } catch (err) {
      toastError("Lỗi", "Không thể cập nhật");
    }
  };

  const formatCurrency = (val: string | null) => {
    if (!val) return "--";
    const num = val.toString().replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/hr/recruitment");
      const data = await res.json();
      if (!res.ok) {
        console.error("DEBUG API ERROR:", data);
        throw new Error(data.message || "Failed to fetch");
      }
      if (Array.isArray(data)) {
        setRequests(data);
      }
    } catch (error) {
      console.error("FETCH ERROR:", error);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchRequests();
    const savedToken = localStorage.getItem("topcv_access_token");
    if (savedToken) setTopcvToken(savedToken);
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const res = await fetch("/api/company");
      const data = await res.json();
      setCompanyInfo(data);
    } catch (err) {
      console.error("Fetch company info error:", err);
    }
  };


  const fetchReportData = async () => {
    setLoadingReport(true);
    try {
      const res = await fetch("/api/hr/recruitment/report-data");
      const data = await res.json();
      if (data.success) {
        setReportCandidates(data.data);
      }
    } catch (err) {
      console.error("Fetch report error:", err);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (step === 4) {
      fetchReportData();
    }
  }, [step]);

  const handleSendOffer = async (candidateId: string) => {
    try {
      info("Đang gửi thư mời...", "Vui lòng đợi trong giây lát");
      const res = await fetch(`/api/hr/recruitment/candidates/${candidateId}/send-offer`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể gửi thư mời");
      
      success("Thành công", "Đã gửi thư mời nhận việc!");
      fetchReportData(); // Refresh Step 4
      if (selectedReportCandidate?.id === candidateId) {
        setSelectedReportCandidate((prev: any) => prev ? { ...prev, status: "Đã gửi thư mời" } : null);
      }
    } catch (error: any) {
      toastError("Lỗi", error.message);
    }
  };

  const handleSubmitForApproval = async (approvalData?: any) => {
    if (selectedReportIds.length === 0) return;
    setIsSubmittingApproval(true);
    try {
      const selectedCands = reportCandidates.filter(c => selectedReportIds.includes(c.id));
      const payload = {
        entityType: "RECRUITMENT_REPORT",
        entityId: `REP_${Date.now()}`,
        entityTitle: `Báo cáo tuyển dụng ${selectedReportIds.length} ứng viên - ${new Date().toLocaleDateString('vi-VN')}`,
        priority: approvalData?.priority?.toLowerCase() || "high",
        department: "Hành chính Nhân sự",
        approverId: approvalData?.recipientId,
        message: approvalData?.message,
        metadata: {
          message: approvalData?.message,
          candidateCount: selectedReportIds.length,
          candidates: selectedCands.map(c => ({ id: c.id, name: c.name, position: c.position, score: c.avgScore })),
          reportDate: new Date().toISOString(),
          attachments: [
            {
              name: `Bao_cao_tuyen_dung_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '_')}.pdf`,
              type: "application/pdf",
              size: 1258291,
              url: "#pdf-report"
            }
          ]
        }
      };

      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Lỗi khi gửi trình duyệt");

      // Update candidate statuses to 'Submitting' (Đang trình duyệt)
      await fetch(`/api/hr/candidates/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedReportIds,
          status: "Submitting"
        })
      });

      // Update the status of the related requests to 'Submitting'
      const uniqueRequestIds = Array.from(new Set(selectedCands.map(c => c.requestId)));
      await Promise.all(uniqueRequestIds.map(async (reqId) => {
        await fetch(`/api/hr/recruitment/${reqId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Submitting" })
        });
      }));

      success("Báo cáo đã được gửi trình Giám đốc phê duyệt!");
      fetchRequests(); // Refresh data
      if (step === 4) fetchReportData();
      setShowPrintPreview(false);
      setShowApprovalOffcanvas(false);
      setSelectedReportIds([]);
    } catch (err: any) {
      toastError("Lỗi", err.message);
    } finally {
      setIsSubmittingApproval(false);
    }
  };


  useEffect(() => {
    if (step === 2 && Object.keys(expandedCampaigns).length === 0) {
      const initial: Record<string, boolean> = {};
      requests.forEach(r => {
        if (r.status === "Approved" || r.status === "Recruiting" || r.status === "Completed") initial[r.id] = true;
      });
      setExpandedCampaigns(initial);
    }
  }, [step, requests]);

  const stepsDef: ModernStepItem[] = [
    { num: 1, id: "request", title: "Yêu cầu", desc: "Tiếp nhận và Chấp nhận", icon: "bi-file-earmark-plus" },
    { num: 2, id: "candidates", title: "Ứng viên", desc: "Tìm kiếm và Sàng lọc", icon: "bi-people" },
    { num: 3, id: "interview", title: "Phỏng vấn", desc: "Lên lịch và Đánh giá", icon: "bi-chat-quote" },
    { num: 4, id: "hiring", title: "Tuyển dụng", desc: "Đề nghị và Ký kết", icon: "bi-person-check" },
    { num: 5, id: "probation", title: "Thử việc", desc: "Hội nhập và Theo dõi", icon: "bi-shield-check" },
  ];

  const [isIntegrateModalOpen, setIsIntegrateModalOpen] = useState(false);

  const handleAIScan = async () => {
    const approvedRequests = requests.filter(r => r.status === "Approved" || r.status === "Recruiting" || r.status === "Completed");
    if (approvedRequests.length === 0) {
      toastError("Lỗi", "Vui lòng phê duyệt ít nhất một yêu cầu tuyển dụng trước khi thực hiện tìm kiếm.");
      return;
    }

    setIsScanning(true);

    let source = "agent";
    let sourceLabel = "Agent Search (Web)";

    if (isVieclam24hActive) {
      source = "vieclam24h";
      sourceLabel = "Vieclam24h";
    } else if (isTopCVActive) {
      source = "topcv";
      sourceLabel = "TopCV";
    }

    const positionNames = approvedRequests.map(r => r.position).join(", ");
    setScanLogs(["Đang khởi động kết nối...", `Nguồn ưu tiên: ${sourceLabel}`, `Phân tích ${approvedRequests.length} vị trí: ${positionNames}`]);

    try {
      setTimeout(() => setScanLogs(prev => [...prev, `Đang kết nối tới cổng dịch vụ ${sourceLabel}...`]), 800);
      setTimeout(() => setScanLogs(prev => [...prev, "Đang xác thực tài khoản Nhà tuyển dụng..."]), 1500);

      const vieclam24hToken = localStorage.getItem("vieclam24h_access_token") || "";

      if (source === "vieclam24h" && !vieclam24hToken) {
        setIsScanning(false);
        toastError("Cấu hình thiếu", "Vui lòng nhập Access Token Vieclam24h trong mục Cấu hình tích hợp (biểu tượng răng cưa).");
        return;
      }

      // Quét song song tất cả các vị trí đã duyệt
      const results = await Promise.all(
        approvedRequests.map(req =>
          fetch("/api/hr/recruitment/scan", {
            method: "POST",
            body: JSON.stringify({
              requestId: req.id,
              source: source,
              topcvToken,
              vieclam24hToken
            })
          }).then(async r => {
            const data = await r.json();
            if (!r.ok) {
              setScanLogs(prev => [...prev, `[Lỗi] ${data.error || 'Yêu cầu thất bại'}`]);
              throw new Error(data.error || "API error");
            }
            return data;
          })
        )
      );

      const totalFound = results.reduce((sum, d) => sum + (d.foundCount || 0), 0);

      setScanLogs(prev => [
        ...prev,
        ...results.map((d, i) => `[${approvedRequests[i].position}]: ${d.foundCount || 0} hồ sơ`),
        `Tổng cộng ${totalFound} hồ sơ từ ${sourceLabel}.`,
        "Hoàn tất!"
      ]);

      setTimeout(() => {
        setIsScanning(false);
        fetchRequests();
        // Mở rộng tất cả chiến dịch vừa quét
        setExpandedCampaigns(prev => {
          const next = { ...prev };
          approvedRequests.forEach(r => { next[r.id] = true; });
          return next;
        });
        success("Thành công", `Đã tìm thấy ${totalFound} ứng viên từ ${sourceLabel}.`);
      }, 1500);

    } catch (error: any) {
      console.error("SCAN ERROR:", error);
      setIsScanning(false);
      toastError("Lỗi hệ thống", error.message || "Không thể thực hiện tìm kiếm lúc này.");
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    setConfirmConfig({
      open: true,
      title: "Xác nhận thay đổi",
      message: `Bạn có chắc chắn muốn chuyển trạng thái yêu cầu này sang "${newStatus === 'Approved' ? 'Chấp nhận' : newStatus === 'Recruiting' ? 'Tiếp nhận & Tìm ứng viên' : 'Từ chối'}"?`,
      variant: newStatus === 'Approved' ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/hr/recruitment/${requestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
            setSelectedRequest(null);
            fetchRequests();
            success("Thành công", `Đã cập nhật trạng thái yêu cầu.`);
          }
        } catch (err) {
          toastError("Lỗi", "Không thể cập nhật trạng thái.");
        } finally {
          setConfirmConfig(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const handleDelete = async (requestId: string) => {
    setConfirmConfig({
      open: true,
      title: "Xác nhận xóa",
      message: "Bạn có chắc chắn muốn xóa yêu cầu này và toàn bộ dữ liệu liên quan? Hành động này không thể hoàn tác.",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/hr/recruitment/${requestId}`, {
            method: "DELETE"
          });
          if (res.ok) {
            setSelectedRequest(null);
            fetchRequests();
            success("Đã xóa", "Yêu cầu đã được loại bỏ khỏi hệ thống.");
          }
        } catch (err) {
          toastError("Lỗi", "Không thể xóa yêu cầu này.");
        } finally {
          setConfirmConfig(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const handleDeleteCandidate = async (id: string) => {
    setConfirmConfig({
      open: true,
      title: "Xác nhận xoá",
      message: "Bạn có chắc chắn muốn xoá hồ sơ ứng viên này?",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/hr/candidates/${id}`, { method: "DELETE" });
          if (res.ok) {
            setSelectedCandidate(null);
            fetchRequests();
            if (step === 4) fetchReportData();
            success("Thành công", "Đã xoá hồ sơ ứng viên.");
          }
        } catch (err) {
          toastError("Lỗi", "Không thể xoá hồ sơ.");
        } finally {
          setConfirmConfig(p => ({ ...p, open: false }));
        }
      }
    });
  };

  const handleBulkDeleteCandidates = async () => {
    setConfirmConfig({
      open: true,
      title: "Xoá nhiều ứng viên",
      message: `Bạn có chắc chắn muốn xoá ${selectedCandidateIds.length} ứng viên đã chọn?`,
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/hr/candidates`, {
            method: "DELETE",
            body: JSON.stringify({ ids: selectedCandidateIds })
          });
          if (res.ok) {
            fetchRequests();
            if (step === 4) fetchReportData();
            setSelectedCandidateIds([]);
            success("Thành công", `Đã xoá ${selectedCandidateIds.length} ứng viên.`);
          }
        } catch (err) {
          toastError("Lỗi", "Không thể thực hiện xoá hàng loạt.");
        } finally {
          setConfirmConfig(p => ({ ...p, open: false }));
        }
      }
    });
  };

  const handleSendToDeptReview = async () => {
    setConfirmConfig({
      open: true,
      title: "Chuyển duyệt chuyên môn",
      message: (
        <div>
          <p className="mb-2">Bạn có chắc chắn muốn chuyển {selectedCandidateIds.length} ứng viên đã chọn sang bộ phận chuyên môn để xét duyệt phỏng vấn?</p>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Lời nhắn cho người xem xét (không bắt buộc)..."
            style={{ fontSize: "13px" }}
            onChange={(e) => setTransferNote(e.target.value)}
          />
        </div>
      ),
      variant: "info",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/hr/candidates/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ids: selectedCandidateIds,
              status: "DeptReview",
              message: transferNote
            })
          });
          if (res.ok) {
            fetchRequests();
            setSelectedCandidateIds([]);
            setTransferNote("");
            success("Thành công", `Đã gửi ${selectedCandidateIds.length} ứng viên cho bộ phận chuyên môn.`);
          } else {
            const data = await res.json();
            throw new Error(data.message || "Lỗi cập nhật trạng thái");
          }
        } catch (err: any) {
          toastError("Lỗi", err.message || "Không thể cập nhật trạng thái ứng viên.");
        } finally {
          setConfirmConfig(p => ({ ...p, open: false }));
        }
      }
    });
  };

  const handleEdit = (request: RecruitmentRequest) => {
    setEditRequestData(request);
    setIsCreateModalOpen(true);
    setSelectedRequest(null);
  };

  const renderRequestOffcanvas = () => {
    if (!mounted || !selectedRequest) return null;
    let reqs: any = {};
    try {
      let reqs: any = {};
      if (typeof selectedRequest.requirements === 'string' && selectedRequest.requirements.trim()) {
        try {
          reqs = JSON.parse(selectedRequest.requirements);
        } catch (e) {
          reqs = { note: selectedRequest.requirements };
        }
      } else {
        reqs = selectedRequest.requirements || {};
      }
    } catch (e) { }

    return createPortal(
      <AnimatePresence>
        {selectedRequest && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedRequest(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.2)", zIndex: 1050 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.25 }} style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 400, background: "#fff", zIndex: 1051, display: "flex", flexDirection: "column", boxShadow: "-4px 0 16px rgba(0,0,0,0.1)" }}>
              <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center bg-light bg-opacity-50">
                <div className="d-flex align-items-center gap-3">
                  <h6 className="mb-0 fw-bold">Chi tiết yêu cầu</h6>
                  <StatusBadge status={selectedRequest.status} />
                </div>
                <button className="btn-close" onClick={() => setSelectedRequest(null)} />
              </div>
              <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
                <h4 className="fw-bold text-dark mb-1">{selectedRequest.position}</h4>
                <p className="text-muted small mb-4">Ngành nghề: {selectedRequest.specialty || "Chưa xác định"}</p>

                <div className="bg-light p-3 rounded-3 mb-4 border">
                  <div className="row g-2">
                    <div className="col-6 mb-2"><span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Cấp bậc:</span><span className="fw-bold" style={{ fontSize: "0.82rem" }}>{reqs.rank || "Nhân viên"}</span></div>
                    <div className="col-6 mb-2"><span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Hình thức:</span><span className="fw-bold" style={{ fontSize: "0.82rem" }}>{reqs.workType || "Toàn thời gian"}</span></div>
                    <div className="col-6 mb-2"><span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Số lượng:</span><span className="fw-bold" style={{ fontSize: "0.82rem" }}>{selectedRequest.quantity} người</span></div>
                    <div className="col-6 mb-2">
                      <span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Mức lương:</span>
                      <span className="fw-bold text-success" style={{ fontSize: "0.82rem" }}>
                        {selectedRequest.salaryMin && selectedRequest.salaryMax
                          ? `${Number(selectedRequest.salaryMin).toLocaleString()} - ${Number(selectedRequest.salaryMax).toLocaleString()}`
                          : (reqs.salaryRange || "Thỏa thuận")}
                      </span>
                    </div>
                    <div className="col-6"><span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Ngày yêu cầu:</span><span className="fw-bold" style={{ fontSize: "0.82rem" }}>{reqs.requestDate || new Date(selectedRequest.date).toLocaleDateString("vi-VN")}</span></div>
                    <div className="col-6"><span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Ngày cần:</span><span className="fw-bold text-danger" style={{ fontSize: "0.82rem" }}>{selectedRequest.deadline ? new Date(selectedRequest.deadline).toLocaleDateString("vi-VN") : "N/A"}</span></div>
                  </div>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold mb-3 border-bottom pb-2" style={{ fontSize: "14px" }}>Yêu cầu tuyển dụng</h6>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <span className="text-muted d-block mb-1" style={{ fontSize: "0.75rem" }}>Kinh nghiệm</span>
                      <div className="fw-bold" style={{ fontSize: "0.82rem" }}>{reqs.experience || "Không yêu cầu"}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block mb-1" style={{ fontSize: "0.75rem" }}>Trình độ</span>
                      <div className="fw-bold" style={{ fontSize: "0.82rem" }}>{reqs.education || "Không yêu cầu"}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block mb-1" style={{ fontSize: "0.75rem" }}>Độ tuổi</span>
                      <div className="fw-bold" style={{ fontSize: "0.82rem" }}>{reqs.ageRange || "Không yêu cầu"}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block mb-1" style={{ fontSize: "0.75rem" }}>Giới tính</span>
                      <div className="fw-bold" style={{ fontSize: "0.82rem" }}>{reqs.gender || "Tất cả"}</div>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column gap-3">
                  <div>
                    <h6 className="fw-bold mb-2 text-primary" style={{ fontSize: "0.85rem" }}>Mô tả công việc</h6>
                    <div className="mb-0 text-dark" style={{ lineHeight: "1.6", whiteSpace: "pre-wrap", fontSize: "0.82rem" }}>
                      {(selectedRequest.description || "Chưa có mô tả.").split('\n').map((line: string, i: number) => (
                        <div key={i} className="d-flex gap-2 mb-1">
                          <span className="text-primary">•</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-2 text-primary" style={{ fontSize: "0.85rem" }}>Yêu cầu ứng viên</h6>
                    <div className="mb-0 text-dark" style={{ lineHeight: "1.6", whiteSpace: "pre-wrap", fontSize: "0.82rem" }}>
                      {(reqs.requirementsText || "Không có yêu cầu đặc biệt.").split('\n').map((line: string, i: number) => (
                        <div key={i} className="d-flex gap-2 mb-1">
                          <span className="text-primary">•</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-2 text-primary" style={{ fontSize: "0.85rem" }}>Quyền lợi</h6>
                    <div className="mb-0 text-dark" style={{ lineHeight: "1.6", whiteSpace: "pre-wrap", fontSize: "0.82rem" }}>
                      {(reqs.benefits || "Theo quy định công ty.").split('\n').map((line: string, i: number) => (
                        <div key={i} className="d-flex gap-2 mb-1">
                          <span className="text-primary">•</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {reqs.skills && (
                    <div>
                      <h6 className="fw-bold mb-2 small text-primary">Kỹ năng cần thiết</h6>
                      <div className="mb-0 text-dark small" style={{ lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                        {typeof reqs.skills === 'string' ? reqs.skills : (
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {Object.entries(reqs.skills).map(([k, v]: [string, any]) => (
                              <span key={k} className="badge bg-light text-dark border fw-normal">
                                {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-top bg-light">
                <div className="d-flex align-items-center gap-2">
                  <BrandButton
                    variant="outline"
                    className="d-flex align-items-center justify-content-center p-0"
                    style={{ width: "38px", height: "38px", borderRadius: "8px", borderColor: "#6c757d", color: "#6c757d" }}
                    onClick={() => handleEdit(selectedRequest)}
                  >
                    <i className="bi bi-pencil" />
                  </BrandButton>
                  <div className="ms-auto d-flex gap-2" style={{ flex: 1 }}>
                    {selectedRequest.status === "Approved" && (
                      <BrandButton
                        variant="primary"
                        className="fw-bold btn-sm flex-grow-1 py-2"
                        onClick={() => handleStatusChange(selectedRequest.id, "Recruiting")}
                      >
                        Tìm ứng viên
                      </BrandButton>
                    )}
                    {selectedRequest.status === "Recruiting" && (
                      <BrandButton
                        variant="outline"
                        className="fw-bold btn-sm flex-grow-1 py-2"
                        disabled
                        style={{ borderColor: "#6c757d", color: "#6c757d" }}
                      >
                        Đang triển khai tìm ứng viên
                      </BrandButton>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  const renderCandidateOffcanvas = () => {
    if (!mounted || !selectedCandidate) return null;
    let skills: string[] = [];
    if (Array.isArray(selectedCandidate.skills)) {
      skills = selectedCandidate.skills;
    } else if (typeof selectedCandidate.skills === "string" && selectedCandidate.skills.trim()) {
      try {
        const parsed = JSON.parse(selectedCandidate.skills);
        skills = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        skills = selectedCandidate.skills.split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    return createPortal(
      <AnimatePresence>
        {selectedCandidate && (
          <>
            <motion.div
              key="candidate-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCandidate(null)}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.2)", zIndex: 1050 }}
            />
            <motion.div
              key="candidate-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 400, background: "#fff", zIndex: 1051, boxShadow: "-4px 0 16px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}
            >
              <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold">Hồ sơ ứng viên thực tế</h6>
                <button className="btn-close" onClick={() => setSelectedCandidate(null)} />
              </div>
              <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
                <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                  <div style={{
                    width: "56px", height: "56px", borderRadius: "12px",
                    background: `linear-gradient(135deg, ${selectedCandidate.matchScore && selectedCandidate.matchScore >= 80 ? '#16a34a' : '#2563eb'} 0%, #1e40af 100%)`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}>
                    <div style={{ fontSize: "18px", fontWeight: 800, lineHeight: 1 }}>{selectedCandidate.matchScore || 0}%</div>
                    <div style={{ fontSize: "8px", fontWeight: 600, opacity: 0.8, marginTop: "2px" }}>MATCH</div>
                  </div>
                  <div className="flex-grow-1">
                    <h4 className="fw-bold mb-0" style={{ color: "#1e293b", fontSize: "19px", letterSpacing: "-0.02em" }}>{selectedCandidate.name}</h4>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <StatusBadge status={selectedCandidate.status} />
                      <span className="text-muted" style={{ fontSize: "10px" }}>Nguồn: {selectedCandidate.source}</span>
                    </div>
                  </div>
                </div>
                <div className="d-flex flex-column gap-3 mb-4 border-bottom pb-4">
                  {[
                    { label: "Điện thoại", value: selectedCandidate.phone, icon: "bi-telephone" },
                    { label: "Email", value: selectedCandidate.email, icon: "bi-envelope" },
                    { label: "Địa chỉ", value: selectedCandidate.address, icon: "bi-geo-alt" },
                    { label: "Lương mong muốn", value: selectedCandidate.desiredSalary ? `${formatCurrency(selectedCandidate.desiredSalary)} VNĐ` : "--", icon: "bi-cash-stack" },
                    { label: "Link profile", value: selectedCandidate.profileUrl, icon: "bi-link-45deg", isLink: true },
                    ...(selectedCandidate.cvUrl && !selectedCandidate.cvUrl.includes("blank_") ? [{ label: "Link CV gốc", value: selectedCandidate.cvUrl, icon: "bi-file-pdf", isLink: true }] : []),
                  ].map((item, idx) => (
                    <div key={idx} className="d-flex align-items-center gap-2 mb-0" style={{ padding: "0" }}>
                      <i className={`${item.icon} text-muted`} style={{ fontSize: "12px", width: "16px" }} />
                      <div className="d-flex align-items-center gap-1 overflow-hidden">
                        <span className="text-muted" style={{ fontSize: "12px", whiteSpace: "nowrap" }}>{item.label}:</span>
                        {item.isLink ? (
                          <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none text-truncate fw-bold" style={{ fontSize: "12px" }}>Link</a>
                        ) : (
                          <span className="fw-bold text-dark text-truncate" style={{ fontSize: "12px" }}>{item.value || "--"}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-3">
                  <h6 className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ fontSize: "12px", color: "#475569", textTransform: "uppercase" }}>
                    <i className="bi bi-briefcase text-primary" /> Kinh nghiệm chuyên môn
                  </h6>
                  <div className="bg-light p-3 rounded-3 border" style={{ fontSize: "12px", lineHeight: "1.6", maxHeight: "250px", overflowY: "auto" }}>
                    {selectedCandidate.experience?.split('\n').map((line: string, i: number) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      // Remove all stars (*) from the line
                      const cleanLine = trimmed.replace(/\*/g, '').trim();
                      if (!cleanLine) return null;
                      return (
                        <div key={i} className="mb-2 d-flex gap-2 align-items-start">
                          <i className="bi bi-dot text-primary" style={{ fontSize: "20px", marginTop: "-4px", flexShrink: 0 }} />
                          <span className="text-dark">{cleanLine}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mb-4">
                  <h6 className="fw-bold mb-2" style={{ fontSize: "14px" }}>Kỹ năng bóc tách</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {skills.map((s: string, i: number) => (<span key={i} className="badge bg-white text-dark border fw-medium" style={{ padding: "6px 12px", borderRadius: "20px" }}>{s}</span>))}
                  </div>
                </div>
                <div>
                  <h6 className="fw-bold mb-2" style={{ fontSize: "14px" }}>AI Tóm tắt</h6>
                  <p className="text-dark bg-light p-3 rounded-3 border-start border-primary border-4" style={{ fontSize: "13px", lineHeight: "1.6", fontStyle: "italic" }}>{selectedCandidate.summary}</p>
                </div>
              </div>
              <div className="p-4 border-top d-flex gap-2">
                <button
                  className="btn btn-outline-primary d-flex align-items-center justify-content-center p-0"
                  style={{ width: "40px", height: "40px", borderRadius: "10px" }}
                  disabled={['Submitting', 'DeptApproved', 'DeptReview', 'Đã chuyển thành nhân viên', 'Không nhận việc', 'Hired', 'Đang thử việc', 'Đã gửi thư mời'].includes(selectedCandidate.status)}
                  onClick={() => {
                    setEditingCandidate(selectedCandidate);
                    setIsAddCandidateModalOpen(true);
                  }}
                >
                  <i className="bi bi-pencil" />
                </button>
                <button
                  className="btn btn-outline-danger d-flex align-items-center justify-content-center p-0"
                  style={{ width: "40px", height: "40px", borderRadius: "10px" }}
                  disabled={['Submitting', 'DeptApproved', 'DeptReview', 'Đã chuyển thành nhân viên', 'Không nhận việc', 'Hired', 'Đang thử việc', 'Đã gửi thư mời'].includes(selectedCandidate.status)}
                  onClick={() => handleDeleteCandidate(selectedCandidate.id)}
                >
                  <i className="bi bi-trash" />
                </button>
                <BrandButton
                  className="flex-grow-1 fw-bold"
                  disabled={['Submitting', 'DeptApproved', 'DeptReview', 'Đã chuyển thành nhân viên', 'Không nhận việc', 'Hired', 'Đang thử việc', 'Đã gửi thư mời'].includes(selectedCandidate.status)}
                  onClick={() => {
                    setConfirmConfig({
                      open: true,
                      title: "Chuyển duyệt chuyên môn",
                      message: (
                        <div>
                          <p className="mb-2">Chuyển hồ sơ của <strong>{selectedCandidate.name}</strong> cho bộ phận chuyên môn xét duyệt?</p>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Lời nhắn cho người xem xét (ví dụ: Ứng viên rất tiềm năng, sếp xem kỹ nhé)..."
                            style={{ fontSize: "13px" }}
                            onChange={(e) => setTransferNote(e.target.value)}
                          />
                        </div>
                      ),
                      variant: "info",
                      onConfirm: async () => {
                        try {
                          const res = await fetch(`/api/hr/candidates/status`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              ids: [selectedCandidate.id],
                              status: "DeptReview",
                              message: transferNote
                            })
                          });
                          if (res.ok) {
                            fetchRequests();
                            if (step === 4) fetchReportData();
                            setSelectedCandidate(null);
                            setTransferNote("");
                            success("Thành công", `Đã gửi hồ sơ cho bộ phận chuyên môn.`);
                          }
                        } catch (err) {
                          toastError("Lỗi", "Không thể chuyển duyệt.");
                        } finally {
                          setConfirmConfig(p => ({ ...p, open: false }));
                        }
                      }
                    });
                  }}
                >
                  <i className="bi bi-send-fill me-2" /> CHUYỂN PHÒNG CHUYÊN MÔN
                </BrandButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  const TABLE_HEADER_STYLE: React.CSSProperties = {
    padding: "12px 16px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase",
    color: "#64748b", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
    textAlign: "left", letterSpacing: "0.05em",
    position: "sticky", top: 0, zIndex: 10
  };

  return (
    <StandardPage
      title="Quản trị tuyển dụng"
      description="Hệ thống tự động hóa tuyển dụng từ Database và Agent Search"
      icon="bi-person-plus-fill"
      color="rose"
      useCard={false}
      paddingClassName="px-4 pb-4 pt-1"
    >
      <div className="flex-grow-1 d-flex flex-column overflow-hidden" style={{ fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif" }}>
        <WorkflowCard
          className="h-100 d-flex flex-column"
          contentPadding="p-0"
          toolbar={null}
          stepper={null}
          bottomToolbar={
            <div className="d-flex align-items-center justify-content-between w-100 px-3" style={{ minHeight: 48 }}>
              <div className="d-flex align-items-center gap-2">
                {step === 1 && (
                  <>
                    <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Tìm kiếm yêu cầu..." className="border-0 shadow-sm" style={{ width: 250 }} />
                    <FilterSelect
                      value={deptFilter}
                      onChange={setDeptFilter}
                      placeholder="Phòng ban: Tất cả"
                      width={180}
                      className="border-0 shadow-sm"
                      options={Array.from(new Set(requests.map(r => r.department))).filter(Boolean).map(d => ({ value: d, label: d }))}
                    />
                    <FilterSelect
                      value={statusFilter}
                      onChange={setStatusFilter}
                      placeholder="Trạng thái: Tất cả"
                      width={180}
                      className="border-0 shadow-sm"
                      options={[
                        { value: "Approved", label: "Đã duyệt" },
                        { value: "Recruiting", label: "Đang tìm ứng viên" },
                        { value: "Interviewing", label: "Chờ phỏng vấn" },
                        { value: "Submitting", label: "Đang trình duyệt" },
                        { value: "Hired", label: "Đã tuyển dụng" },
                        { value: "Completed", label: "Hoàn thành" }
                      ]}
                    />
                  </>
                )}
                {step === 2 && (
                  <>
                    <FilterSelect
                      value={candidatePositionFilter}
                      onChange={setCandidatePositionFilter}
                      placeholder="Tất cả vị trí"
                      width={180}
                      className="border-0 shadow-sm"
                      options={Array.from(new Set((requests || []).filter(r => r.status !== "Pending" && r.status !== "Rejected").map(r => r.position))).map(pos => ({
                        value: pos,
                        label: pos
                      }))}
                    />
                    <FilterSelect
                      value={candidateStatusFilter}
                      onChange={setCandidateStatusFilter}
                      placeholder="Tất cả trạng thái"
                      width={180}
                      className="border-0 shadow-sm"
                      options={[
                        { value: "New", label: "Mới" },
                        { value: "Unclassified", label: "Đang rà soát" },
                        { value: "Qualified", label: "Phù hợp" },
                        { value: "DeptReview", label: "Chờ chuyên môn duyệt" },
                        { value: "DeptApproved", label: "Chuyên môn đã duyệt" },
                        { value: "Interviewing", label: "Đang phỏng vấn" },
                        { value: "Submitting", label: "Đang trình Giám đốc" },
                        { value: "Đã gửi thư mời", label: "Đã gửi thư mời" },
                        { value: "Đã nhận việc", label: "Đã nhận việc" },
                        { value: "Đang thử việc", label: "Đang thử việc" },
                        { value: "Đã chuyển thành nhân viên", label: "Đã vào làm" },
                        { value: "Rejected", label: "Không phù hợp (Sơ loại)" },
                        { value: "DeptRejected", label: "Chuyên môn từ chối" },
                        { value: "RejectedHiring", label: "Giám đốc từ chối tuyển" },
                        { value: "Không nhận việc", label: "Ứng viên không nhận việc" },
                      ]}
                    />
                  </>
                )}
                {step === 4 && (
                  <FilterSelect
                    value={reportPositionFilter}
                    onChange={setReportPositionFilter}
                    placeholder="Tất cả vị trí"
                    width={200}
                    className="border-0 shadow-sm"
                    options={Array.from(new Set(reportCandidates.map(c => c.position))).map(pos => ({
                      value: pos,
                      label: pos
                    }))}
                  />
                )}
              </div>

              <div className="d-flex align-items-center gap-3">
                {step === 2 && (
                  <div className="d-flex gap-2 align-items-center me-2">
                    <div className="d-flex align-items-center gap-2 border rounded-pill px-3 py-1 bg-white shadow-sm">
                      <div className="form-check form-switch mb-0">
                        <input className="form-check-input" type="checkbox" id="topcvSwitch" checked={isTopCVActive} onChange={(e) => setIsTopCVActive(e.target.checked)} />
                        <label className="small fw-bold text-muted ms-1" htmlFor="topcvSwitch" style={{ fontSize: "10px" }}>TopCV</label>
                      </div>
                      <div className="form-check form-switch mb-0 ms-2">
                        <input className="form-check-input" type="checkbox" id="vl24hSwitch" checked={isVieclam24hActive} onChange={(e) => setIsVieclam24hActive(e.target.checked)} />
                        <label className="small fw-bold text-muted ms-1" htmlFor="vl24hSwitch" style={{ fontSize: "10px" }}>VL24h</label>
                      </div>
                    </div>
                    <BrandButton
                      onClick={handleAIScan}
                      loading={isScanning}
                      variant="outline"
                      icon="bi-magic"
                    >
                      Agent Quét
                    </BrandButton>
                    {selectedCandidateIds.length > 0 && (
                      <BrandButton
                        onClick={handleSendToDeptReview}
                        icon="bi-send-check-fill"
                        style={{ backgroundColor: "#198754", borderColor: "#198754" }}
                        disabled={selectedCandidateIds.some(id => {
                          const cand = requests.flatMap(r => r.candidates || []).find(c => c.id === id);
                          return cand?.status === "DeptApproved";
                        })}
                      >
                        Chuyển duyệt ({selectedCandidateIds.length})
                      </BrandButton>
                    )}
                    <BrandButton
                      onClick={() => {
                        setEditingCandidate(null);
                        setIsAddCandidateModalOpen(true);
                      }}
                      icon="bi-person-plus-fill"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Thêm ứng viên
                    </BrandButton>
                  </div>
                )}

                {step === 1 && (
                  <BrandButton
                    onClick={() => setIsCreateModalOpen(true)}
                    icon="bi-plus-lg"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Tạo yêu cầu
                  </BrandButton>
                )}

                {step === 4 && (
                  <BrandButton
                    onClick={() => setShowPrintPreview(true)}
                    disabled={selectedReportIds.length === 0}
                    icon="bi-printer"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    In báo cáo ({selectedReportIds.length})
                  </BrandButton>
                )}
              </div>
            </div>
          }
        >
          <div className="h-100 d-flex flex-column overflow-hidden">
            <ModernStepper
              steps={stepsDef}
              currentStep={step}
              onStepChange={(num: number) => setStep(num)}
            />
            <div className="flex-grow-1 overflow-auto custom-scrollbar">
              {step === 1 && (
                <Table
                  rows={requests.filter(r =>
                    (r.status === "Approved" || r.status === "Recruiting" || r.status === "Interviewing" || r.status === "Completed") &&
                    r.position.toLowerCase().includes(searchQuery.toLowerCase()) &&
                    (statusFilter === "" || r.status === statusFilter) &&
                    (deptFilter === "" || r.department === deptFilter)
                  )}
                  loading={requests.length === 0 && !statusFilter}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => setSelectedRequest(r)}
                  compact={true}
                  fontSize={12}
                  striped={false}
                  columns={[
                    {
                      header: "Vị trí tuyển dụng",
                      width: "25%",
                      render: (row) => (
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>{row.position || "Chưa xác định"}</div>
                          <div className="text-muted" style={{ fontSize: "11px" }}>{row.department}</div>
                        </div>
                      )
                    },
                    {
                      header: "Số lượng",
                      width: "8%",
                      align: "center",
                      render: (row) => <span className="fw-bold text-primary">{row.quantity}</span>
                    },
                    {
                      header: "Mức lương (đ)",
                      width: "15%",
                      render: (row) => {
                        let rowReqs: any = {};
                        try {
                          if (typeof row.requirements === 'string' && row.requirements.trim()) {
                            try { rowReqs = JSON.parse(row.requirements); } catch (e) { rowReqs = { note: row.requirements }; }
                          } else { rowReqs = row.requirements || {}; }
                        } catch (e) { }
                        const range = rowReqs.salaryRange || "Thỏa thuận";
                        return <span className="text-success fw-bold">{range.replace(" VNĐ", "")}</span>;
                      }
                    },
                    {
                      header: "Hình thức",
                      width: "14%",
                      render: (row) => {
                        let rowReqs: any = {};
                        try {
                          if (typeof row.requirements === 'string' && row.requirements.trim()) {
                            try { rowReqs = JSON.parse(row.requirements); } catch (e) { rowReqs = { note: row.requirements }; }
                          } else { rowReqs = row.requirements || {}; }
                        } catch (e) { }
                        return <span className="text-muted">{rowReqs.workType || "Toàn thời gian"}</span>;
                      }
                    },
                    {
                      header: "Ngày yêu cầu",
                      width: "11%",
                      render: (row) => {
                        let rowReqs: any = {};
                        try {
                          if (typeof row.requirements === 'string' && row.requirements.trim()) {
                            try { rowReqs = JSON.parse(row.requirements); } catch (e) { rowReqs = { note: row.requirements }; }
                          } else { rowReqs = row.requirements || {}; }
                        } catch (e) { }
                        return <span className="text-muted">{rowReqs.requestDate || new Date(row.date).toLocaleDateString("vi-VN")}</span>;
                      }
                    },
                    {
                      header: "Ngày cần",
                      width: "11%",
                      render: (row) => <span className="text-danger fw-bold">{row.deadline ? new Date(row.deadline).toLocaleDateString("vi-VN") : "N/A"}</span>
                    },
                    {
                      header: "Trạng thái",
                      width: "16%",
                      render: (row) => <StatusBadge status={row.status} />
                    }
                  ]}
                />
              )}

              {step === 2 && (
                <div className="d-flex flex-column h-100">
                  <AnimatePresence>
                    {isScanning && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-3 font-monospace border-bottom" style={{ background: "#0f172a", color: "#38bdf8", fontSize: "12px" }}>
                        {scanLogs.map((l, i) => <div key={i}>[{new Date().toLocaleTimeString()}] {l}</div>)}
                        <div className="spinner-border spinner-border-sm mt-2" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Table
                    rows={(() => {
                      const activeRequests = (requests || []).filter(r => 
                        ["Approved", "Recruiting", "Interviewing", "Submitting", "Hired", "Completed"].includes(r.status) && 
                        (candidatePositionFilter === "All" || r.position === candidatePositionFilter)
                      );
                      
                      const flat: any[] = [];
                      activeRequests.forEach(camp => {
                        // Filter candidates based on status BEFORE deciding to show campaign
                        const filteredCandidates = (camp.candidates || []).filter(c => 
                          !candidateStatusFilter || candidateStatusFilter === 'All' || c.status === candidateStatusFilter
                        );
                        
                        // Only show campaign if it has matching candidates OR if we are showing all
                        if (filteredCandidates.length === 0 && candidateStatusFilter !== 'All') return;

                        const isExpanded = !!expandedCampaigns[camp.id];
                        flat.push({
                          id: `camp-${camp.id}`,
                          isFullWidth: true,
                          fullWidthContent: (
                            <div className="d-flex align-items-center gap-3 w-100" onClick={(e) => { e.stopPropagation(); setExpandedCampaigns(p => ({ ...p, [camp.id]: !p[camp.id] })); }} style={{ cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                onClick={e => e.stopPropagation()}
                                onChange={(e) => {
                                  const campIds = filteredCandidates.map((c: any) => c.id);
                                  if (e.target.checked) setSelectedCandidateIds(prev => [...new Set([...prev, ...campIds])]);
                                  else setSelectedCandidateIds(prev => prev.filter(id => !campIds.includes(id)));
                                }}
                                checked={filteredCandidates.length > 0 && filteredCandidates.every((c: any) => selectedCandidateIds.includes(c.id))}
                                disabled={filteredCandidates.length === 0}
                              />
                              <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-muted`} />
                              <span className="fw-bold text-dark" style={{ fontSize: "14px" }}>{camp.position}</span>
                              <span className="badge rounded-pill bg-danger" style={{ fontSize: "10px" }}>{filteredCandidates.length}</span>
                            </div>
                          ),
                          campId: camp.id
                        });

                        if (isExpanded) {
                          filteredCandidates.forEach(can => {
                            flat.push({ ...can, isCandidate: true });
                          });
                        }
                      });
                      return flat;
                    })()}
                    rowKey={(r) => r.id}
                    onRowClick={(r) => {
                      if (r.isFullWidth) return;
                      if (["Đã chuyển thành nhân viên", "Không nhận việc"].includes(r.status)) return;
                      setSelectedCandidate(r);
                    }}
                    compact={true}
                    fontSize={12}
                    striped={false}
                    columns={[
                      {
                        header: (
                          <input
                            type="checkbox"
                            className="form-check-input"
                            onChange={(e) => {
                              if (e.target.checked) {
                                const allIds = requests.filter(r => ["Approved", "Recruiting", "Completed"].includes(r.status)).flatMap(r => r.candidates || []).map(c => c.id);
                                setSelectedCandidateIds(allIds);
                              } else {
                                setSelectedCandidateIds([]);
                              }
                            }}
                            checked={selectedCandidateIds.length > 0 && selectedCandidateIds.length === requests.filter(r => ["Approved", "Recruiting", "Completed"].includes(r.status)).flatMap(r => r.candidates || []).length}
                          />
                        ),
                        width: "40px",
                        align: "center",
                        render: (row) => !row.isFullWidth && (
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedCandidateIds.includes(row.id)}
                            disabled={["DeptApproved", "Đã chuyển thành nhân viên", "Không nhận việc"].includes(row.status)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCandidateIds(prev => [...prev, row.id]);
                              else setSelectedCandidateIds(prev => prev.filter(id => id !== row.id));
                            }}
                            onClick={e => e.stopPropagation()}
                          />
                        )
                      },
                      {
                        header: "Ứng viên",
                        width: "25%",
                        render: (row) => row.isFullWidth ? null : (
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>{row.name}</div>
                            <div className="text-muted" style={{ fontSize: "10px" }}>{row.phone}</div>
                          </div>
                        )
                      },
                      {
                        header: "Độ phù hợp",
                        width: "10%",
                        align: "center",
                        render: (row) => row.isFullWidth ? null : <MatchScore score={row.matchScore} analysis={row.summary} />
                      },
                      {
                        header: "Nguồn",
                        width: "12%",
                        render: (row) => row.isFullWidth ? null : <span style={{ fontSize: "12px" }}>{row.source}</span>
                      },
                      {
                        header: "Kinh nghiệm",
                        width: "25%",
                        render: (row) => row.isFullWidth ? null : <div className="text-truncate" style={{ maxWidth: 200, fontSize: "12px" }}>{row.experience}</div>
                      },
                      {
                        header: "Ngày nộp",
                        width: "13%",
                        render: (row) => row.isFullWidth ? null : <span style={{ fontSize: "11px" }}>{new Date(row.date).toLocaleDateString("vi-VN")}</span>
                      },
                      {
                        header: "Trạng thái",
                        width: "15%",
                        render: (row) => row.isFullWidth ? null : <StatusBadge status={row.status} isCandidate source={row.source} />
                      }
                    ]}
                  />
                </div>
              )}

              {step === 3 && (
                <Table
                  rows={(() => {
                    const interviewReqs = requests.filter(r => (r.candidates || []).some(c => ["DeptApproved", "Interviewing"].includes(c.status)));
                    const flat: any[] = [];
                    interviewReqs.forEach(req => {
                      flat.push({
                        id: `group-${req.id}`,
                        isFullWidth: true,
                        fullWidthContent: (
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-briefcase-fill text-primary" />
                            <span className="fw-bold text-dark">{req.position}</span>
                            <span className="badge bg-light text-muted border small">{req.department}</span>
                          </div>
                        )
                      });
                      (req.candidates || []).filter(c => ["DeptApproved", "Interviewing"].includes(c.status)).forEach(can => {
                        flat.push({ ...can, isCandidate: true });
                      });
                    });
                    return flat;
                  })()}
                  rowKey={(r) => r.id}
                  compact={true}
                  fontSize={12}
                  striped={false}
                  columns={[
                    {
                      header: "Ứng viên",
                      width: "30%",
                      render: (row) => row.isFullWidth ? null : (
                        <div className="fw-bold text-dark">{row.name}</div>
                      )
                    },
                    {
                      header: "Trạng thái PV",
                      width: "20%",
                      render: (row) => row.isFullWidth ? null : <StatusBadge status={row.status} />
                    },
                    {
                      header: "Lịch hẹn",
                      width: "30%",
                      render: (row) => row.isFullWidth ? null : (
                        <div style={{ fontSize: "12px" }}>
                          {row.interviewDate ? (
                            <div className="d-flex align-items-center gap-1 text-primary fw-bold">
                              <i className="bi bi-clock" />
                              {new Date(row.interviewDate).toLocaleString('vi-VN')}
                            </div>
                          ) : <span className="text-muted italic">Chưa có lịch</span>}
                        </div>
                      )
                    },
                    {
                      header: "Thao tác",
                      width: "20%",
                      align: "right",
                      render: (row) => row.isFullWidth ? null : (
                        <BrandButton
                          variant="outline"
                          style={{ height: 32, fontSize: "12px" }}
                          onClick={() => { setSelectedCandidateIds([row.id]); setShowInterviewModal(true); }}
                        >
                          {row.interviewDate ? "Đổi lịch" : "Đặt lịch"}
                        </BrandButton>
                      )
                    }
                  ]}
                  emptyText="Chưa có ứng viên nào sẵn sàng phỏng vấn"
                  emptyIcon="bi-calendar-x"
                />
              )}

              {step === 4 && (
                <Table
                  rows={reportCandidates.filter(c => reportPositionFilter === 'All' || c.position === reportPositionFilter)}
                  loading={loadingReport}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => setSelectedReportCandidate(r)}
                  compact={true}
                  fontSize={12}
                  striped={false}
                  columns={[
                    {
                      header: (
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedReportIds.length > 0 && selectedReportIds.length === reportCandidates.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedReportIds(reportCandidates.map(c => c.id));
                            else setSelectedReportIds([]);
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      ),
                      width: "40px",
                      align: "center",
                      render: (row) => (
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedReportIds.includes(row.id)}
                          disabled={['Submitting', 'Hired', 'Đang thử việc', 'Đã tiếp nhận', 'Đã gửi thư mời', 'Rejected', 'Từ chối nhận việc', 'Từ chối tiếp nhận', 'Đã nhận việc', 'Không nhận việc', 'Đã chuyển thành nhân viên'].includes(row.status)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedReportIds(prev => [...prev, row.id]);
                            else setSelectedReportIds(prev => prev.filter(id => id !== row.id));
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      )
                    },
                    {
                      header: "Ứng viên",
                      width: "25%",
                      render: (row) => (
                        <span className="fw-bold">{row.name}</span>
                      )
                    },
                    {
                      header: "Vị trí",
                      width: "20%",
                      render: (row) => (
                        <div>
                          <div className="fw-medium">{row.position}</div>
                          <div className="text-muted small">{row.department || "Chưa xác định"}</div>
                        </div>
                      )
                    },
                    {
                      header: "Số phiếu",
                      width: "10%",
                      align: "center",
                      render: (row) => <span className="badge bg-light text-dark border">{row.scorecardCount} phiếu</span>
                    },
                    {
                      header: "Điểm TB",
                      width: "10%",
                      align: "center",
                      render: (row) => (
                        <div className={`fw-bold ${row.avgScore >= 80 ? 'text-success' : row.avgScore >= 60 ? 'text-primary' : 'text-warning'}`}>
                          {row.avgScore}/100
                        </div>
                      )
                    },
                    {
                      header: "Trạng thái",
                      width: "15%",
                      render: (row) => {
                        if (row.status === "Submitting") return <span className="text-primary fw-bold"><i className="bi bi-clock-history me-1" />Đang trình duyệt</span>;
                        if (row.status === "Đã gửi thư mời") return <span className="text-info fw-bold"><i className="bi bi-send-check-fill me-1" />Đã gửi thư mời</span>;
                        if (row.status === "Đã nhận việc") return <span className="text-success fw-bold"><i className="bi bi-person-check-fill me-1" />Đã nhận việc</span>;
                        if (row.status === "Không nhận việc") return <span className="text-danger fw-bold"><i className="bi bi-person-x-fill me-1" />Không nhận việc</span>;
                        if (row.status === "Hired" || row.status === "Đang thử việc" || row.status === "Đã tiếp nhận") return <span className="text-success fw-bold"><i className="bi bi-person-check-fill me-1" />Đồng ý tuyển dụng</span>;
                        if (row.status === "Rejected" || row.status === "Từ chối nhận việc" || row.status === "Từ chối tiếp nhận") return <span className="text-danger fw-bold"><i className="bi bi-x-circle-fill me-1" />Từ chối tuyển dụng</span>;
                        
                        if (row.majorityDecision === 'HIRE') return <span className="text-success fw-bold"><i className="bi bi-check-circle-fill me-1" />Đồng ý tuyển dụng</span>;
                        if (row.majorityDecision === 'REJECT') return <span className="text-danger fw-bold"><i className="bi bi-x-circle-fill me-1" />Từ chối tuyển dụng</span>;
                        return <span className="text-warning fw-bold"><i className="bi bi-question-circle-fill me-1" />Chưa thống nhất</span>;
                      }
                    },
                    {
                      header: "Lương đề xuất",
                      width: "15%",
                      render: (row) => <span className="fw-bold text-dark">{row.avgSalary ? `${row.avgSalary.toLocaleString('vi-VN')} đ` : "Chưa cập nhật"}</span>
                    },
                    {
                      header: "",
                      width: "40px",
                      align: "center",
                      render: (row) => {
                        const isAccepted = row.status === "Hired" || row.status === "Đang thử việc" || row.status === "Đã tiếp nhận" || row.majorityDecision === 'HIRE';
                        if (!isAccepted) return null;

                        return (
                          <div className="dropdown" onClick={e => e.stopPropagation()}>
                            <button 
                              className="btn btn-link btn-sm p-0 text-muted shadow-none border-0" 
                              type="button"
                              data-bs-toggle="dropdown"
                              aria-expanded="false"
                            >
                              <i className="bi bi-three-dots-vertical fs-6"></i>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end shadow border-0 py-2" style={{ fontSize: '13px', borderRadius: '12px', minWidth: '160px' }}>
                              <li>
                                <button 
                                  className={`dropdown-item d-flex align-items-center gap-2 py-2 ${row.status === "Đã gửi thư mời" ? "disabled opacity-50" : ""}`}
                                  disabled={row.status === "Đã gửi thư mời"}
                                  onClick={() => handleSendOffer(row.id)}
                                >
                                  <i className="bi bi-send-fill text-primary"></i>
                                  Gửi thư mời
                                </button>
                              </li>
                              <li><hr className="dropdown-divider opacity-50" /></li>
                              <li>
                                <button 
                                  className={`dropdown-item d-flex align-items-center gap-2 py-2 ${row.status !== "Đã gửi thư mời" ? "disabled opacity-50" : ""}`}
                                  disabled={row.status !== "Đã gửi thư mời"}
                                  onClick={() => handleUpdateStatus(row.id, "Đã nhận việc")}
                                >
                                  <i className="bi bi-person-check-fill text-success"></i>
                                  Nhận việc
                                </button>
                              </li>
                              <li>
                                <button 
                                  className={`dropdown-item d-flex align-items-center gap-2 py-2 ${row.status !== "Đã gửi thư mời" ? "disabled opacity-50" : ""}`}
                                  disabled={row.status !== "Đã gửi thư mời"}
                                  onClick={() => handleUpdateStatus(row.id, "Không nhận việc")}
                                >
                                  <i className="bi bi-person-x-fill text-danger"></i>
                                  Không nhận việc
                                </button>
                              </li>
                            </ul>
                          </div>
                        );
                      }
                    }
                  ]}
                  emptyText="Không tìm thấy ứng viên nào đã hoàn tất phỏng vấn"
                />
              )}

              {step === 5 && <ProbationStep onFinalize={fetchRequests} />}
            </div>
          </div>
        </WorkflowCard>
      </div>
      {renderRequestOffcanvas()}
      {renderCandidateOffcanvas()}
      <IntegrationPanel
        isOpen={isIntegrateModalOpen}
        onClose={() => setIsIntegrateModalOpen(false)}
        onSuccess={(msg) => {
          success("Đã lưu", msg);
          const saved = localStorage.getItem("topcv_access_token");
          if (saved) setTopcvToken(saved);
        }}
      />
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        initialData={editRequestData}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditRequestData(null);
        }}
        onSuccess={() => {
          fetchRequests();
          if (step === 4) fetchReportData();
          if (selectedRequest) {
            fetch(`/api/hr/recruitment`)
              .then(res => res.json())
              .then(data => {
                const updated = data.find((r: any) => r.id === selectedRequest.id);
                if (updated) setSelectedRequest(updated);
              });
          }
          success("Thành công", "Dữ liệu yêu cầu đã được lưu.");
        }}
      />

      <ConfirmDialog
        open={confirmConfig.open}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, open: false }))}
      />


      {/* --- REPORT PRINT PREVIEW --- */}
      {showPrintPreview && (
        <PrintPreviewModal
          title="Báo cáo Đề nghị Tuyển dụng"
          subtitle={`Số lượng đề xuất: ${selectedReportIds.length} ứng viên`}
          onClose={() => setShowPrintPreview(false)}
          actions={
            <div className="d-flex gap-2" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
              <BrandButton
                variant="outline"
                className="px-3"
                style={{ height: 32, fontSize: "12.5px" }}
                onClick={() => printDocumentById("recruitment-report-doc", "portrait", "Báo cáo Tuyển dụng", true)}
              >
                <i className="bi bi-printer-fill" /> In báo cáo
              </BrandButton>
              <BrandButton
                className="px-3"
                style={{ height: 32, fontSize: "12.5px", background: "#4f46e5" }}
                onClick={() => setShowApprovalOffcanvas(true)}
                loading={isSubmittingApproval}
              >
                {!isSubmittingApproval && <i className="bi bi-send-check-fill" />}
                Trình Giám đốc duyệt
              </BrandButton>
            </div>
          }
          documentId="recruitment-report-doc"
          keepFirstPageMargin={true}
          document={
            <div className="pdf-content-page" style={{ padding: "40px 60px", fontFamily: "'Roboto Condensed', sans-serif" }}>
              {/* --- HEADER --- */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", borderBottom: "3px solid #003087", paddingBottom: "15px" }}>
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                  {companyInfo?.logoUrl && (
                    <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "60px", width: "60px", objectFit: "contain" }} />
                  )}
                  <div>
                    <h5 style={{ margin: 0, fontWeight: 900, fontSize: "12px", color: "#003087", textTransform: "uppercase" }}>
                      {companyInfo?.name || "CÔNG TY TNHH MTV TƯ VẤN & GIẢI PHÁP SỐ LEE-TECH"}
                    </h5>
                    <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>
                      {companyInfo?.address && <span>Đ/c: {companyInfo.address} | </span>}
                      {companyInfo?.phone && <span>Tel: {companyInfo.phone}</span>}
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#666", fontWeight: "bold" }}>Phòng Hành chính Nhân sự</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: "22px", color: "#333" }}>BÁO CÁO TUYỂN DỤNG</h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Ngày lập: {new Date().toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {/* --- INTRODUCTION --- */}
              <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
                Kính gửi: <strong style={{ textTransform: "uppercase" }}>Ban Giám đốc {companyInfo?.shortName || "Công ty"}</strong>
              </p>
              <p style={{ fontSize: "14px", lineHeight: "1.6", textAlign: "justify" }}>
                Căn cứ vào kế hoạch nhân sự năm {new Date().getFullYear()} và nhu cầu bổ sung nhân sự của các bộ phận chuyên môn, Phòng Nhân sự đã tiến hành quy trình tìm kiếm, sàng lọc và tổ chức phỏng vấn các ứng viên tiềm năng.
                Dưới đây là kết quả đánh giá chi tiết và đề xuất tiếp nhận nhân sự đối với {selectedReportIds.length} ứng viên đã hoàn tất quy trình:
              </p>

              {/* --- SUMMARY TABLE --- */}
              <h6 style={{ fontSize: "15px", fontWeight: "bold", borderLeft: "4px solid #003087", paddingLeft: "10px", marginBottom: "15px" }}>I. TỔNG HỢP KẾT QUẢ</h6>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "35px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "12px", textAlign: "center" }}>STT</th>
                    <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "12px" }}>Họ tên ứng viên</th>
                    <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "12px" }}>Vị trí ứng tuyển</th>
                    <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "12px", textAlign: "center" }}>Điểm TB</th>
                    <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "12px", textAlign: "right" }}>Lương đề xuất</th>
                    <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "12px" }}>Đề xuất</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCandidates.filter(c => selectedReportIds.includes(c.id)).map((c, idx) => (
                    <tr key={c.id}>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "13px", textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "13px", fontWeight: "bold" }}>{c.name}</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "13px" }}>{c.position}</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "13px", textAlign: "center", fontWeight: "bold" }}>{c.avgScore}/100</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "13px", textAlign: "right", fontWeight: "bold" }}>
                        {c.avgSalary ? `${c.avgSalary.toLocaleString('vi-VN')} đ` : "--"}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "12px", color: c.majorityDecision === 'HIRE' ? "#166534" : "#991b1b", fontWeight: "bold" }}>
                        {c.majorityDecision === 'HIRE' ? 'TIẾP NHẬN' : 'XEM XÉT THÊM'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* --- DETAILED SECTIONS --- */}
              <h6 style={{ fontSize: "15px", fontWeight: "bold", borderLeft: "4px solid #003087", paddingLeft: "10px", marginBottom: "20px" }}>II. ĐÁNH GIÁ CHI TIẾT THEO ỨNG VIÊN</h6>

              {reportCandidates.filter(c => selectedReportIds.includes(c.id)).map((c, idx) => (
                <div key={c.id} style={{ marginBottom: "40px", pageBreakInside: "avoid" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 15px", borderLeft: "5px solid #003087", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "bold", fontSize: "14px" }}>{idx + 1}. ỨNG VIÊN: {c.name.toUpperCase()}</span>
                    <span style={{ fontSize: "12px", fontWeight: "bold" }}>Điểm trung bình: {c.avgScore}/100</span>
                  </div>

                  <div style={{ padding: "15px", border: "1px solid #e2e8f0", borderTop: "none" }}>
                    {/* Scores Radar-style representation or simple table */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "15px" }}>
                      <div>
                        <p style={{ margin: "0 0 5px 0", fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>THÔNG TIN PHỎNG VẤN:</p>
                        <ul style={{ margin: 0, paddingLeft: "15px", fontSize: "13px" }}>
                          <li>Hội đồng PV: {c.scorecardCount} thành viên</li>
                          <li>Vị trí: {c.position}</li>
                          <li>Bộ phận: {c.department || "Chưa xác định"}</li>
                        </ul>
                      </div>
                      <div>
                        <p style={{ margin: "0 0 5px 0", fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>ĐỀ XUẤT THU NHẬP:</p>
                        <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#003087" }}>
                          {c.avgSalary ? `${c.avgSalary.toLocaleString('vi-VN')} đ` : "Chưa cập nhật"}
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Thời gian thử việc dự kiến: {c.probationSuggest || "Theo quy định"}</p>
                      </div>
                    </div>

                    <p style={{ margin: "10px 0 5px 0", fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>Ý KIẾN CỦA CÁC GIÁM KHẢO:</p>
                    {c.scorecards.map((s: any, sIdx: number) => (
                      <div key={s.id} style={{ marginBottom: "10px", padding: "10px", background: "#fdfdfd", border: "1px dashed #cbd5e1", borderRadius: "5px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold" }}>- {s.interviewerName} ({s.interviewerRole}):</span>
                          <span style={{ fontSize: "11px", fontWeight: "bold", color: s.decision === 'HIRE' ? "#166534" : "#991b1b" }}>{s.decision === 'HIRE' ? "ĐỒNG Ý" : "TỪ CHỐI"}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", fontStyle: "italic", color: "#444" }}>"{s.interviewerNote || "Không có nhận xét thêm."}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* --- FOOTER --- */}
              <div style={{ marginTop: "50px", display: "flex", justifyContent: "space-between", pageBreakInside: "avoid" }}>
                <div style={{ textAlign: "center", width: "250px" }}>
                  <p style={{ marginBottom: "80px", fontSize: "14px", fontWeight: "bold" }}>Người lập báo cáo</p>
                  <p style={{ margin: 0, fontWeight: "bold", fontSize: "15px" }}>PHÒNG HÀNH CHÍNH NHÂN SỰ</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>(Đã ký điện tử)</p>
                </div>
                <div style={{ textAlign: "center", width: "250px" }}>
                  <p style={{ marginBottom: "80px", fontSize: "14px", fontWeight: "bold" }}>Ban Giám đốc phê duyệt</p>
                  <p style={{ margin: 0, fontSize: "13px" }}>(Ký và ghi rõ họ tên)</p>
                </div>
              </div>
            </div>
          }
        />
      )}

      {/* --- CANDIDATE DETAIL DRAWER (STEP 4) --- */}
      {selectedReportCandidate && createPortal(
        <>
          <div onClick={() => setSelectedReportCandidate(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", zIndex: 100001, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 400, background: "#fff", zIndex: 100002, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(15,23,42,0.15)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="mb-0 fw-bold" style={{ fontSize: "16px" }}>{selectedReportCandidate.name}</div>
                <p className="mb-0 text-muted" style={{ fontSize: "11px" }}>{selectedReportCandidate.position} • {selectedReportCandidate.department}</p>
              </div>
              <button onClick={() => setSelectedReportCandidate(null)} className="btn-close" />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }} className="custom-scrollbar">
              <div className="alert alert-info border-0 shadow-sm mb-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "bold" }}>KẾT QUẢ TỔNG HỢP</div>
                    <div className="mb-0 fw-black text-primary" style={{ fontSize: "20px" }}>{selectedReportCandidate.avgScore}/100</div>
                  </div>
                  <div className="text-end">
                    <div style={{ fontSize: "10px", fontWeight: "bold" }}>QUYẾT ĐỊNH ĐA SỐ</div>
                    <div className="fw-bold" style={{ fontSize: "13px", color: selectedReportCandidate.majorityDecision === 'HIRE' ? 'var(--bs-success)' : 'var(--bs-danger)' }}>
                      {selectedReportCandidate.majorityDecision === 'HIRE' ? 'ĐỒNG Ý NHẬN' : 'TỪ CHỐI'}
                    </div>
                  </div>
                </div>
                {selectedReportCandidate.status === "Đã tiếp nhận" && (
                  <div className="mt-1 pt-1 border-top border-info-subtle">
                    <div className="fw-bold text-success" style={{ fontSize: "11px" }}>
                      <i className="bi bi-check-all me-1" /> Ý kiến của giám đốc: Đồng ý tuyển dụng
                    </div>
                  </div>
                )}
              </div>

              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ fontSize: "13px" }}>
                <i className="bi bi-person-lines-fill text-primary" />
                Chi tiết {selectedReportCandidate.scorecardCount} phiếu đánh giá
              </h6>

              <div className="d-flex flex-column gap-3">
                {selectedReportCandidate.scorecards.map((s: any, idx: number) => (
                  <div key={s.id} className="card border shadow-sm rounded-3 overflow-hidden">
                    <div className="card-header bg-light d-flex justify-content-between align-items-center py-2 px-3">
                      <span className="fw-bold" style={{ fontSize: "12px" }}>Giám khảo: {s.interviewerName}</span>
                      <span className={`badge ${s.decision === 'HIRE' ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: "9px" }}>{s.decision}</span>
                    </div>
                    <div className="card-body p-3">
                      <div className="row g-2 mb-3">
                        <div className="col-4 text-center">
                          <div className="text-muted" style={{ fontSize: "10px" }}>KIẾN THỨC</div>
                          <div className="fw-bold">{s.scoreKnowledge}/20</div>
                        </div>
                        <div className="col-4 text-center">
                          <div className="text-muted" style={{ fontSize: "10px" }}>KINH NGHIỆM</div>
                          <div className="fw-bold">{s.scoreExperience}/20</div>
                        </div>
                        <div className="col-4 text-center border-end">
                          <div className="text-muted" style={{ fontSize: "10px" }}>GIAO TIẾP</div>
                          <div className="fw-bold">{s.scoreComm}/20</div>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="fw-bold text-muted mb-1" style={{ fontSize: "10px" }}>NHẬN XÉT:</div>
                        <p className="mb-2 text-dark bg-light p-2 rounded" style={{ fontStyle: "italic", fontSize: "11.5px" }}>
                          {s.interviewerNote || "Không có nhận xét."}
                        </p>
                      </div>
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                        <span className="text-muted" style={{ fontSize: "11px" }}>Lương đề xuất: <strong>{s.salarySuggest?.toLocaleString('vi-VN')} đ</strong></span>
                        {s.audioRecordUrl && (
                          <button
                            className="btn btn-sm btn-outline-primary py-0"
                            onClick={() => window.open(s.audioRecordUrl, '_blank')}
                          >
                            <i className="bi bi-play-circle me-1" /> Nghe lại
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-top bg-light d-flex gap-2 align-items-center">
              {/* Nút Xoá ứng viên nếu bị từ chối */}
              { (selectedReportCandidate.status === "Từ chối nhận" || selectedReportCandidate.status === "Từ chối tiếp nhận" || selectedReportCandidate.status === "Từ chối tuyển dụng") && (
                <button
                  className="btn btn-outline-danger d-flex align-items-center justify-content-center"
                  style={{ width: 40, height: 40, borderRadius: 8 }}
                  onClick={() => {
                    setConfirmConfig({
                      open: true,
                      title: "Xác nhận xoá",
                      message: `Bạn có chắc chắn muốn xoá ứng viên ${selectedReportCandidate.name} khỏi danh sách không?`,
                      variant: "danger",
                      onConfirm: async () => {
                        setConfirmConfig(p => ({ ...p, open: false }));
                        try {
                          const res = await fetch("/api/hr/candidates", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ids: [selectedReportCandidate.id] })
                          });
                          if (res.ok) {
                            success("Đã xoá ứng viên");
                            fetchReportData();
                            setSelectedReportCandidate(null);
                          }
                        } catch (err) {
                          toastError("Lỗi", "Không thể xoá ứng viên");
                        }
                      }
                    });
                  }}
                >
                  <i className="bi bi-trash" />
                </button>
              )}

              {/* Nút Trình duyệt / Gửi thư mời */}
              { (selectedReportCandidate.status === "Đồng ý nhận" || selectedReportCandidate.status === "Đã tiếp nhận" || selectedReportCandidate.status === "Đồng ý tuyển dụng" || selectedReportCandidate.status === "Hired") ? (
                <BrandButton
                  variant="primary"
                  className="flex-grow-1"
                  style={{ backgroundColor: "#198754", borderColor: "#198754" }}
                  icon="bi-send-check"
                  onClick={() => {
                    setConfirmConfig({
                      open: true,
                      title: "Gửi thư mời làm việc",
                      message: `Xác nhận gửi thư mời làm việc cho ứng viên ${selectedReportCandidate.name}?`,
                      variant: "info",
                      onConfirm: async () => {
                        setConfirmConfig(p => ({ ...p, open: false }));
                        try {
                          const res = await fetch("/api/hr/candidates/send-offer", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ candidateId: selectedReportCandidate.id })
                          });
                          const result = await res.json();
                          if (res.ok) {
                            success(result.message);
                            fetchReportData();
                            setSelectedReportCandidate(null);
                          } else {
                            toastError("Lỗi", result.error || "Không thể gửi thư mời");
                          }
                        } catch (err) {
                          toastError("Lỗi", "Đã có lỗi xảy ra");
                        }
                      }
                    });
                  }}
                >
                  Gửi thư mời nhận việc
                </BrandButton>
              ) : (
                <BrandButton
                  variant="primary"
                  className="flex-grow-1"
                  disabled={['Submitting', 'Hired', 'Đang thử việc', 'Đã tiếp nhận', 'Đã gửi thư mời', 'Rejected', 'Từ chối nhận việc', 'Từ chối tiếp nhận'].includes(selectedReportCandidate.status)}
                  icon={selectedReportCandidate.status === "Đã gửi thư mời" ? "bi-check-circle" : (selectedReportCandidate.status === "Submitting" ? "bi-clock-history" : "bi-file-earmark-plus")}
                  onClick={() => {
                    if (!selectedReportIds.includes(selectedReportCandidate.id)) {
                      setSelectedReportIds([...selectedReportIds, selectedReportCandidate.id]);
                    }
                    setSelectedReportCandidate(null);
                    setShowPrintPreview(true);
                  }}
                >
                  {selectedReportCandidate.status === "Đã gửi thư mời" ? "Đã gửi thư mời" : (selectedReportCandidate.status === "Submitting" ? "Đang trình duyệt" : "Trình duyệt")}
                </BrandButton>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {showInterviewModal && (
        <ScheduleInterviewOffcanvas
          onClose={() => setShowInterviewModal(false)}
          onOpenConfig={() => setShowSmtpConfig(true)}
          candidateCount={selectedCandidateIds.length}
          candidateIds={selectedCandidateIds}
          onConfirm={async (data) => {
            setIsScheduling(true);
            try {
              const res = await fetch("/api/hr/candidates/schedule-interview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, candidateIds: selectedCandidateIds })
              });
              const result = await res.json();
              if (!res.ok) throw new Error(result.details || result.error || "Lỗi khi lên lịch");

              // Update the status of the related requests to 'Interviewing'
              const scheduledCands = requests.flatMap(r => r.candidates || []).filter(c => selectedCandidateIds.includes(c.id));
              const uniqueRequestIds = Array.from(new Set(scheduledCands.map(c => c.requestId)));
              await Promise.all(uniqueRequestIds.map(async (reqId) => {
                await fetch(`/api/hr/recruitment/${reqId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "Interviewing" })
                });
              }));

              success("Đã lên lịch phỏng vấn và gửi thông báo!");
              setShowInterviewModal(false);
              setSelectedCandidateIds([]);
              fetchRequests();
            } catch (err: any) {
              toastError("Lỗi", err.message);
            } finally {
              setIsScheduling(false);
            }
          }}
          loading={isScheduling}
          departmentName={requests.find(r => r.candidates?.some(c => c.id === selectedCandidateIds[0]))?.department || ""}
        />
      )}

      {showSmtpConfig && (
        <SmtpConfigOffcanvas
          onClose={() => setShowSmtpConfig(false)}
        />
      )}

      {isAddCandidateModalOpen && (
        <AddCandidateModal
          isOpen={isAddCandidateModalOpen}
          onClose={() => {
            setIsAddCandidateModalOpen(false);
            setEditingCandidate(null);
          }}
          requests={requests.filter(r => ['Approved', 'Recruiting', 'Interviewing'].includes(r.status))}
          onSuccess={() => {
            setIsAddCandidateModalOpen(false);
            setEditingCandidate(null);
            fetchRequests();
            if (step === 4) fetchReportData();
          }}
          editingCandidate={editingCandidate}
        />
      )}

      {showApprovalOffcanvas && (
        <ApprovalSubmissionOffcanvas
          onClose={() => setShowApprovalOffcanvas(false)}
          candidateCount={selectedReportIds.length}
          loading={isSubmittingApproval}
          onConfirm={handleSubmitForApproval}
        />
      )}
    </StandardPage>
  );
}

// ─── Add Candidate Modal ───────────────────────────────────────────────────

function AddCandidateModal({ isOpen, onClose, requests, onSuccess, editingCandidate }: {
  isOpen: boolean,
  onClose: () => void,
  requests: RecruitmentRequest[],
  onSuccess: () => void,
  editingCandidate?: any
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'exp' | 'skills'>('exp');
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [cvText, setCvText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    requestId: "",
    position: "",
    email: "",
    phone: "",
    address: "",
    gender: "Nam",
    birthDate: "",
    education: "Đại học",
    desiredSalary: "",
    experience: "",
    expYears: "",
    skills: "",
    summary: "",
    cvUrl: "",
    profileUrl: "",
    source: "MANUAL",
    status: "Pending Review"
  });

  useEffect(() => {
    if (editingCandidate && isOpen) {
      setFormData({
        name: editingCandidate.name || "",
        requestId: editingCandidate.requestId || "",
        position: editingCandidate.position || "",
        email: editingCandidate.email || "",
        phone: editingCandidate.phone || "",
        address: editingCandidate.address || "",
        gender: editingCandidate.gender || "Nam",
        birthDate: editingCandidate.birthDate ? new Date(editingCandidate.birthDate).toISOString().split('T')[0] : "",
        education: editingCandidate.education || "Đại học",
        desiredSalary: editingCandidate.desiredSalary || "",
        experience: editingCandidate.experience || "",
        expYears: editingCandidate.expYears || "",
        skills: editingCandidate.skills || "",
        summary: editingCandidate.summary || "",
        cvUrl: editingCandidate.cvUrl || "",
        profileUrl: editingCandidate.profileUrl || "",
        source: editingCandidate.source || "MANUAL",
        status: editingCandidate.status || "Pending Review"
      });
    } else if (isOpen) {
      setFormData({
        name: "",
        requestId: "",
        position: "",
        email: "",
        phone: "",
        address: "",
        gender: "Nam",
        birthDate: "",
        education: "Đại học",
        desiredSalary: "",
        experience: "",
        expYears: "",
        skills: "",
        summary: "",
        cvUrl: "",
        profileUrl: "",
        source: "MANUAL",
        status: "Pending Review"
      });
    }
  }, [editingCandidate, isOpen]);

  const [isEditingComp, setIsEditingComp] = useState(false);

  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);

  const handleAIParsing = async () => {
    if (!cvText.trim()) return;
    setIsParsing(true);
    try {
      const res = await fetch("/api/hr/recruitment/parse-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cvText })
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          ...data.data,
          // Merge experience and skills into the right columns
          experience: data.data.experience || prev.experience,
          skills: data.data.skills || prev.skills
        }));
        setIsSupportModalOpen(false);
        success("AI đã lấy thông tin từ CV thành công!");
      } else {
        throw new Error(data.message || "Lỗi xử lý AI");
      }
    } catch (err: any) {
      toastError("Lỗi AI", err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingCandidate ? `/api/hr/candidates/${editingCandidate.id}` : "/api/hr/candidates";
      const method = editingCandidate ? "PATCH" : "POST";

      // Ensure birthDate is properly handled for empty values
      const submissionData = {
        ...formData,
        birthDate: formData.birthDate || null
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.error || "Lỗi khi xử lý dữ liệu");
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: string) => {
    if (!val) return "";
    const num = val.replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleCleanText = () => {
    const field = activeTab === 'exp' ? 'experience' : 'skills';
    const text = formData[field as keyof typeof formData] as string;
    if (!text) return;

    const cleaned = text
      .split('\n')
      .map(line => {
        const clean = line.replace(/\*/g, '').trim();
        if (!clean) return "";
        return clean.startsWith('-') ? clean : `- ${clean}`;
      })
      .filter(line => line !== "")
      .join('\n');

    setFormData({ ...formData, [field]: cleaned });
    success("Đã định dạng lại văn bản sạch sẽ!");
  };

  const labelStyle = { fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "6px", display: "block", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
  const inputStyle = { borderRadius: "10px", padding: "8px 12px", border: "1.5px solid #e2e8f0", fontSize: "13px", transition: "all 0.2s", background: "#fff" };

  return createPortal(
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 2000,
      display: "flex",
      flexDirection: "column",
      background: "#f8fafc",
      fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif"
    }}>
      {/* Top Header */}
      <div className="bg-white px-5 py-3 d-flex justify-content-between align-items-center border-bottom sticky-top">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-3" style={{ width: "40px", height: "40px" }}>
            <i className="bi bi-person-plus-fill fs-5" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h6 className="fw-bold text-dark mb-0">Thêm hồ sơ ứng viên</h6>
              <button
                type="button"
                className="btn btn-warning btn-sm px-3 py-1 fw-bold border-0 rounded-pill d-flex align-items-center gap-1 shadow-sm"
                style={{ fontSize: "11px", color: "#854d0e" }}
                onClick={() => setIsSupportModalOpen(true)}
              >
                <i className="bi bi-magic" /> HỖ TRỢ
              </button>
            </div>
            <p className="text-muted mb-0" style={{ fontSize: "11px" }}>Tạo mới hồ sơ nhân sự vào hệ thống tuyển dụng</p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-3">
          <BrandButton
            type="submit"
            form="add-candidate-form"
            loading={loading}
            icon="bi-check-lg"
          >
            Lưu hồ sơ
          </BrandButton>
          <button onClick={onClose} className="btn btn-light rounded-circle border-0 d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
      </div>

      {/* Scrollable Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "30px 0" }} className="custom-scrollbar">
        <form id="add-candidate-form" onSubmit={handleSubmit} className="mx-auto px-4" style={{ maxWidth: "1200px" }}>
          <div className="row g-4">
            <div className="col-lg-5">
              {/* Section 1: Basic Info */}
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4" style={{ background: "#fff" }}>
                <div className="px-4 py-3 border-bottom d-flex align-items-center gap-2" style={{ background: "#f8fafc" }}>
                  <i className="bi bi-person-lines-fill text-primary" />
                  <h6 className="fw-bold text-dark mb-0" style={{ fontSize: "14px" }}>1. THÔNG TIN ỨNG VIÊN</h6>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label style={labelStyle}>VỊ TRÍ ỨNG TUYỂN <span className="text-danger">*</span></label>
                      {requests.length === 0 ? (
                        <div className="p-3 rounded-3 bg-warning-subtle text-warning-emphasis small border-0">
                          <i className="bi bi-exclamation-triangle-fill me-2" />
                          Chưa có yêu cầu tuyển dụng nào.
                        </div>
                      ) : (
                        <select
                          className="form-select shadow-none border-0 fw-bold py-2 bg-primary-subtle text-primary"
                          style={{ borderRadius: "10px" }}
                          required
                          value={formData.requestId}
                          onChange={e => {
                            const req = requests.find(r => r.id === e.target.value);
                            setFormData({ ...formData, requestId: e.target.value, position: req ? req.position : "" });
                          }}
                        >
                          <option value="">Chọn vị trí ứng tuyển...</option>
                          {requests.map(r => (
                            <option key={r.id} value={r.id}>{r.position}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="col-md-8">
                      <label style={labelStyle}>HỌ VÀ TÊN ỨNG VIÊN <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        style={{ ...inputStyle, width: "100%", fontSize: "16px" }}
                        className="form-control shadow-none fw-bold"
                        placeholder="Nguyễn Mỹ Linh"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label style={labelStyle}>GIỚI TÍNH</label>
                      <select style={{ ...inputStyle, width: "100%" }} className="form-select shadow-none" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label style={labelStyle}>EMAIL LIÊN HỆ</label>
                      <div className="input-group bg-light rounded-3 px-2">
                        <span className="input-group-text bg-transparent border-0"><i className="bi bi-envelope text-muted" /></span>
                        <input
                          type="email"
                          style={{ ...inputStyle, background: "transparent", width: "auto", flex: 1 }}
                          className="form-control shadow-none border-0 px-1"
                          placeholder="linhmau097@gmail.com"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label style={labelStyle}>SỐ ĐIỆN THOẠI</label>
                      <div className="input-group bg-light rounded-3 px-2">
                        <span className="input-group-text bg-transparent border-0"><i className="bi bi-telephone text-muted" /></span>
                        <input
                          type="tel"
                          style={{ ...inputStyle, background: "transparent", width: "auto", flex: 1 }}
                          className="form-control shadow-none border-0 px-1"
                          placeholder="0397047766"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label style={labelStyle}>NGÀY SINH</label>
                      <input type="date" style={{ ...inputStyle, width: "100%" }} className="form-control shadow-none" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label style={labelStyle}>TRÌNH ĐỘ HỌC VẤN</label>
                      <select style={{ ...inputStyle, width: "100%" }} className="form-select shadow-none" value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })}>
                        <option value="Đại học">Đại học</option>
                        <option value="Cao đẳng">Cao đẳng</option>
                        <option value="Thạc sĩ">Thạc sĩ</option>
                        <option value="Tiến sĩ">Tiến sĩ</option>
                        <option value="Phổ thông">Phổ thông</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label style={labelStyle}>KINH NGHIỆM</label>
                      <input
                        type="text"
                        style={{ ...inputStyle, width: "100%" }}
                        className="form-control shadow-none"
                        placeholder="5 năm"
                        value={formData.expYears}
                        onChange={e => setFormData({ ...formData, expYears: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label style={labelStyle}>ĐỊA CHỈ HIỆN TẠI</label>
                      <input
                        type="text"
                        style={{ ...inputStyle, width: "100%" }}
                        className="form-control shadow-none"
                        placeholder="Hà Nội"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label style={labelStyle}>MỨC LƯƠNG MONG MUỐN (ĐỒNG)</label>
                      <input
                        type="text"
                        style={{ ...inputStyle, width: "100%" }}
                        className="form-control shadow-none"
                        placeholder="Ví dụ: 15.000.000"
                        value={formData.desiredSalary}
                        onChange={e => setFormData({ ...formData, desiredSalary: formatCurrency(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label style={labelStyle}>PHÂN LOẠI BAN ĐẦU</label>
                      <div className="d-flex gap-4 mt-2">
                        {[
                          { value: 'New', label: 'Mới' },
                          { value: 'Qualified', label: 'Tiềm năng' }
                        ].map(s => (
                          <label key={s.value} className="d-flex align-items-center gap-2 cursor-pointer" style={{ fontSize: "13px", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name="candidate-status"
                              className="form-check-input mt-0 shadow-none"
                              checked={formData.status === s.value}
                              onChange={() => setFormData({ ...formData, status: s.value as any })}
                            />
                            <span className={formData.status === s.value ? 'text-primary fw-bold' : 'text-muted'}>{s.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="col-12">
                      <label style={labelStyle}>ĐƯỜNG DẪN CV (GOOGLE DRIVE/DROPBOX)</label>
                      <div className="input-group bg-light rounded-3 px-2">
                        <span className="input-group-text bg-transparent border-0"><i className="bi bi-link-45deg text-muted" /></span>
                        <input
                          type="url"
                          style={{ ...inputStyle, background: "transparent", width: "auto", flex: 1 }}
                          className="form-control shadow-none border-0 px-1 small"
                          placeholder="https://..."
                          value={formData.cvUrl}
                          onChange={e => setFormData({ ...formData, cvUrl: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>



            </div>

            <div className="col-lg-7">
              {/* Section 2: Professional Competence */}
              <div className="h-100 d-flex flex-column">
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white flex-grow-1 d-flex flex-column" style={{ minHeight: "600px" }}>
                  <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center" style={{ background: "#f8fafc" }}>
                    <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: "14px" }}>
                      <i className="bi bi-mortarboard-fill text-primary" />
                      2. NĂNG LỰC CHUYÊN MÔN
                    </h6>
                    <div className="bg-light p-1 rounded-3 d-flex gap-2 align-items-center" style={{ border: "1px solid #e2e8f0" }}>
                      <div className="d-flex gap-1">
                        {[
                          { id: 'exp', label: 'KINH NGHIỆM LÀM VIỆC' },
                          { id: 'skills', label: 'KỸ NĂNG & CHỨNG CHỈ' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            className={`btn btn-sm px-3 py-1 fw-bold border-0 transition-all ${activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}
                            style={{ fontSize: "10px", borderRadius: "6px" }}
                            onClick={() => setActiveTab(tab.id as any)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="vr mx-1" style={{ height: "16px" }}></div>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm px-2 py-0 border-0"
                        title="Định dạng lại văn bản (Xóa dấu sao, thêm gạch đầu dòng)"
                        onClick={handleCleanText}
                        style={{ fontSize: "10px", height: "24px" }}
                      >
                        <i className="bi bi-stars me-1" /> LÀM ĐẸP VĂN BẢN
                      </button>
                    </div>
                  </div>
                  <div className="card-body p-0 flex-grow-1 position-relative d-flex flex-column">
                    <div className="flex-grow-1 p-4 custom-scrollbar" style={{ background: "linear-gradient(to bottom, #fff, #fcfdfe)", overflowY: "auto" }}>
                      {isEditingComp ? (
                        <textarea
                          className="form-control h-100 border-0 shadow-none p-0"
                          placeholder={activeTab === 'exp' ? "Mô tả chi tiết quá trình làm việc..." : "Danh sách kỹ năng..."}
                          style={{ resize: "none", fontSize: "14px", lineHeight: "2", background: "transparent", color: "#334155", fontWeight: "500" }}
                          autoFocus
                          value={activeTab === 'exp' ? formData.experience : formData.skills}
                          onChange={e => setFormData({ ...formData, [activeTab === 'exp' ? 'experience' : 'skills']: e.target.value })}
                          onBlur={() => setIsEditingComp(false)}
                        />
                      ) : (
                        <div
                          className="h-100 w-100 cursor-pointer"
                          onClick={() => setIsEditingComp(true)}
                          style={{ cursor: "text" }}
                        >
                          {(activeTab === 'exp' ? formData.experience : formData.skills)?.split('\n').map((line, i) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <div key={i} style={{ height: "1em" }} />;
                            const cleanLine = trimmed.replace(/\*/g, '').replace(/^-+\s*/, '').trim();
                            return (
                              <div key={i} className="mb-2 d-flex gap-2 align-items-start">
                                <i className="bi bi-dot text-primary" style={{ fontSize: "20px", marginTop: "-4px", flexShrink: 0 }} />
                                <span className="text-dark" style={{ fontSize: "14px", lineHeight: "1.6", fontWeight: "500" }}>{cleanLine}</span>
                              </div>
                            );
                          })}
                          {!(activeTab === 'exp' ? formData.experience : formData.skills) && (
                            <div className="text-muted italic" style={{ fontSize: "14px" }}>Bấm vào đây để nhập nội dung...</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Floating Indicator */}
                    <div className="position-absolute bottom-0 right-0 p-3 opacity-25">
                      <i className="bi bi-pencil-square fs-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>
      <style>{`
          .bg-primary-subtle { background-color: #e0e7ff; }
          .text-primary { color: #003087 !important; }
          .btn-primary:hover { background-color: #002366 !important; transform: translateY(-1px); }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          .transition-all { transition: all 0.2s ease-in-out; }
        `}</style>
      {isSupportModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#fff", zIndex: 11000, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 24px", borderBottom: "1.5px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
            <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="bi bi-textarea-t text-primary" />
              DÁN NỘI DUNG CV ĐỂ AI LẤY THÔNG TIN
            </h6>
            <div className="d-flex gap-2">
              <button className="btn btn-light btn-sm px-4 rounded-pill fw-bold" onClick={() => setIsSupportModalOpen(false)}>QUAY LẠI</button>
              <button
                className="btn btn-primary btn-sm px-4 rounded-pill fw-bold d-flex align-items-center gap-2"
                onClick={handleAIParsing}
                disabled={isParsing || !cvText.trim()}
              >
                {isParsing ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ĐANG PHÂN TÍCH...
                  </>
                ) : (
                  <>
                    <i className="bi bi-lightning-charge-fill" />
                    LẤY THÔNG TIN (AI)
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="flex-grow-1 p-4 bg-light">
            <textarea
              className="form-control w-100 h-100 shadow-none border-0 p-4 rounded-4"
              placeholder="Dán toàn bộ văn bản từ CV vào đây. Sau đó nhấn nút 'LẤY THÔNG TIN' phía trên để AI tự động điền form cho mày..."
              style={{ resize: "none", fontSize: "14px", lineHeight: "1.6", background: "#fff" }}
              autoFocus
              value={cvText}
              onChange={e => setCvText(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
// ─── Sub-Components & Helpers ─────────────────────────────────────────────────

// ─── Sub-Components & Helpers ─────────────────────────────────────────────────

// ─── Sub-Components ─────────────────────────────────────────────────────────

// ─── Offcanvas Components ───────────────────────────────────────────────────

function ScheduleInterviewOffcanvas({ onClose, onConfirm, onOpenConfig, loading, candidateCount, departmentName, candidateIds }: {
  onClose: () => void,
  onConfirm: (data: any) => Promise<void>,
  onOpenConfig: () => void,
  loading: boolean,
  candidateCount: number,
  departmentName: string,
  candidateIds: string[]
}) {
  const [formData, setFormData] = useState({
    interviewDate: "",
    interviewLocation: "Văn phòng công ty",
    interviewNotes: ""
  });
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      interviewLocation: isOnline ? "https://meet.google.com/..." : "Văn phòng công ty"
    }));
  }, [isOnline]);

  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [selectedInterviewers, setSelectedInterviewers] = useState<any[]>([]);
  const [loadingInterviewers, setLoadingInterviewers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPositions() {
      try {
        const res = await fetch("/api/board/categories?type=position");
        const data = await res.json();
        setPositions(data || []);
      } catch (err) { console.error(err); }
    }
    fetchPositions();
  }, []);

  const getPositionName = (code: string) => {
    if (!code) return "Nhân viên";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  useEffect(() => {
    async function fetchInterviewers() {
      setLoadingInterviewers(true);
      try {
        const res = await fetch(`/api/hr/interviewers?dept=${encodeURIComponent(departmentName)}`);
        const data = await res.json();
        setInterviewers(data);
      } catch (error) {
        console.error("Error fetching interviewers:", error);
      } finally {
        setLoadingInterviewers(false);
      }
    }
    fetchInterviewers();
  }, [departmentName]);

  const filteredInterviewers = interviewers.filter(i =>
    i.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleInterviewer = (inter: any) => {
    if (selectedInterviewers.some(s => s.id === inter.id)) {
      setSelectedInterviewers(prev => prev.filter(s => s.id !== inter.id));
    } else {
      setSelectedInterviewers(prev => [...prev, inter]);
    }
  };

  return (
    <>
      <div
        className="offcanvas-backdrop fade show"
        style={{ zIndex: 1045 }}
        onClick={onClose}
      />

      <div
        className="offcanvas offcanvas-end show border-0 shadow-lg"
        style={{ width: "400px", zIndex: 1050, visibility: "visible", fontSize: '0.85rem' }}
        tabIndex={-1}
      >
        <div className="offcanvas-header border-bottom py-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary p-2 rounded-3 text-white shadow-sm d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
              <i className="bi bi-calendar2-check fs-5"></i>
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold m-0" style={{ fontSize: '1rem' }}>Đặt lịch phỏng vấn</h5>
              <p className="text-muted m-0" style={{ fontSize: '0.75rem' }}>Lập lịch cho {candidateCount} ứng viên tiềm năng</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>

        <div className="offcanvas-body py-4 custom-scrollbar">
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-0">1. Thời gian & Địa điểm</label>
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input cursor-pointer"
                  type="checkbox"
                  id="onlineSwitch"
                  checked={isOnline}
                  onChange={e => setIsOnline(e.target.checked)}
                />
                <label className="form-check-label small text-muted cursor-pointer" htmlFor="onlineSwitch" style={{ fontSize: '11px' }}>Phỏng vấn trực tuyến</label>
              </div>
            </div>
            <div className="card border-0 bg-light px-3 py-0 rounded-4 shadow-sm">
              <div className="d-flex align-items-center gap-3 mb-2">
                <label className="form-label small fw-bold text-dark mb-0" style={{ width: "100px", flexShrink: 0 }}>Thời gian:</label>
                <input
                  type="datetime-local"
                  className="form-control border-0 bg-light rounded-3 py-1"
                  style={{ fontSize: '0.85rem', height: '38px' }}
                  required
                  value={formData.interviewDate}
                  onChange={e => setFormData(prev => ({ ...prev, interviewDate: e.target.value }))}
                />
              </div>
              <div className="d-flex align-items-center gap-3">
                <label className="form-label small fw-bold text-dark mb-0" style={{ width: "100px", flexShrink: 0 }}>{isOnline ? 'Link phòng họp:' : 'Địa điểm:'}</label>
                <div className="input-group input-group-sm" style={{ flex: 1 }}>
                  <span className="input-group-text bg-light border-0 py-1"><i className={`bi ${isOnline ? 'bi-camera-video-fill' : 'bi-geo-alt'} text-primary`}></i></span>
                  <input
                    type="text"
                    className="form-control border-0 bg-light py-1"
                    style={{ fontSize: '0.85rem', height: '38px' }}
                    placeholder="Văn phòng hoặc link Meet..."
                    value={formData.interviewLocation}
                    onChange={e => setFormData(prev => ({ ...prev, interviewLocation: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-2">2. Hội đồng phỏng vấn</label>
            <div className="position-relative mb-2">
              <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
              <input
                type="text"
                className="form-control ps-5 bg-light border-0 rounded-pill shadow-sm"
                style={{ fontSize: '0.85rem', height: '40px' }}
                placeholder="Tìm kiếm cán bộ phỏng vấn..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-auto border rounded-4 bg-white shadow-sm" style={{ maxHeight: "250px" }}>
              {loadingInterviewers ? (
                <div className="text-center py-5 text-muted small">
                  <div className="spinner-border spinner-border-sm text-primary me-2"></div> Đang tải danh sách...
                </div>
              ) : filteredInterviewers.length === 0 ? (
                <div className="text-center py-5 text-muted small italic">Không tìm thấy nhân sự phù hợp</div>
              ) : filteredInterviewers.map(inter => {
                const isSelected = selectedInterviewers.some(s => s.id === inter.id);
                return (
                  <div
                    key={inter.id}
                    className={`d-flex align-items-center gap-2 py-1 px-3 border-bottom transition-all cursor-pointer position-relative ${isSelected ? 'bg-white' : 'hover-bg-light'}`}
                    style={isSelected ? { borderLeft: '3px solid var(--bs-primary)', paddingLeft: '13px' } : {}}
                    onClick={() => toggleInterviewer(inter)}
                  >
                    <div
                      className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 transition-all ${isSelected ? 'bg-primary text-white' : 'bg-light text-muted'}`}
                      style={{ width: 18, height: 18, border: isSelected ? 'none' : '1px solid #cbd5e1' }}
                    >
                      {isSelected ? <i className="bi bi-check-lg" style={{ fontSize: 11 }}></i> : <div style={{ width: 6, height: 6 }}></div>}
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className={`fw-bold text-truncate small ${isSelected ? 'text-primary' : 'text-dark'}`}>{inter.fullName}</div>
                      <div className="text-muted text-truncate" style={{ fontSize: "11px" }}>
                        {getPositionName(inter.position)} • {inter.departmentName}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedInterviewers.length > 0 && (
              <div className="mt-2 d-flex flex-wrap gap-2">
                {selectedInterviewers.map(s => (
                  <span key={s.id} className="badge bg-white text-primary border border-primary-subtle rounded-pill d-flex align-items-center gap-2 py-2 px-3 shadow-sm transition-all hover-shadow-md">
                    <span className="fw-bold">{s.fullName}</span>
                    <i className="bi bi-x-circle-fill cursor-pointer text-danger" style={{ fontSize: '14px' }} onClick={(e) => { e.stopPropagation(); toggleInterviewer(s); }}></i>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-0">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-3">3. Lời nhắn cho ứng viên</label>
            <textarea
              className="form-control border-0 bg-light p-3 rounded-4 shadow-sm"
              rows={4}
              style={{ fontSize: '0.85rem', lineHeight: '1.6' }}
              placeholder="Nội dung nhắc nhở, trang phục hoặc tài liệu cần mang theo..."
              value={formData.interviewNotes}
              onChange={e => setFormData(prev => ({ ...prev, interviewNotes: e.target.value }))}
            />
          </div>
        </div>

        <div className="offcanvas-footer p-3 border-top bg-light">
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-light shadow-sm border d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 38, height: 38 }}
              onClick={onOpenConfig}
              title="Cấu hình SMTP"
            >
              <i className="bi bi-gear-fill text-muted"></i>
            </button>
            <BrandButton
              className="flex-grow-1 fw-bold"
              disabled={loading || !formData.interviewDate || selectedInterviewers.length === 0}
              onClick={() => onConfirm({ ...formData, selectedInterviewers })}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <i className="bi bi-send-check-fill"></i>
              )}
              Xác nhận & Gửi thư mời
            </BrandButton>
          </div>
        </div>
      </div>

      <style>{`
        .hover-bg-light:hover { background-color: #f8fafc !important; }
        .letter-spacing-1 { letter-spacing: 0.5px; }
        .cursor-pointer { cursor: pointer; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .hover-shadow-md:hover { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
      `}</style>
    </>
  );
}

// ─── SMTP Config Offcanvas ───────────────────────────────────────────────────

function SmtpConfigOffcanvas({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState({
    id: "",
    host: "",
    port: 587,
    user: "",
    pass: "",
    fromEmail: "",
    fromName: "",
    secure: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      try {
        const res = await fetch("/api/hr/recruitment/email-config");
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setConfig({
              id: data.id,
              host: data.host || "",
              port: data.port || 587,
              user: data.user || "",
              pass: data.pass || "",
              fromEmail: data.fromEmail || "",
              fromName: data.fromName || "",
              secure: data.secure ?? true
            });
          }
        }
      } catch (err) { console.error("Fetch SMTP Config Error:", err); }
      finally { setLoading(false); }
    }
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/hr/recruitment/email-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const result = await res.json();
      if (res.ok) {
        success("Thành công", "Đã lưu cấu hình SMTP");
        onClose();
      } else {
        toastError("Lỗi", result.error || "Không thể lưu cấu hình");
      }
    } catch (err) {
      toastError("Lỗi", "Kết nối máy chủ thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="offcanvas-backdrop fade show" style={{ zIndex: 100080 }} onClick={onClose} />
      <div className="offcanvas offcanvas-end show border-0 shadow-lg" style={{ width: "400px", zIndex: 100090, visibility: "visible" }}>
        <div className="offcanvas-header border-bottom py-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-dark p-2 rounded-3 text-white shadow-sm d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
              <i className="bi bi-gear-fill fs-5"></i>
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold m-0" style={{ fontSize: '1rem' }}>Cấu hình Email (SMTP)</h5>
              <p className="text-muted m-0" style={{ fontSize: '0.75rem' }}>Thiết lập thông tin gửi thư tự động</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>

        <div className="offcanvas-body py-4 custom-scrollbar">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-3">
                <label className="form-label small fw-bold">Máy chủ (Host)</label>
                <input type="text" className="form-control" placeholder="smtp.gmail.com" value={config.host || ""} onChange={e => setConfig({ ...config, host: e.target.value })} />
              </div>
              <div className="row mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Cổng (Port)</label>
                  <input type="number" className="form-control" placeholder="587" value={config.port || ""} onChange={e => setConfig({ ...config, port: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="col-6 d-flex align-items-end">
                  <div className="form-check form-switch mb-2">
                    <input className="form-check-input" type="checkbox" checked={!!config.secure} onChange={e => setConfig({ ...config, secure: e.target.checked })} />
                    <label className="form-check-label small">SSL/TLS</label>
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">Tài khoản (Username)</label>
                <input type="text" className="form-control" placeholder="your-email@gmail.com" value={config.user || ""} onChange={e => setConfig({ ...config, user: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">Mật khẩu (Password/App Secret)</label>
                <input type="password" className="form-control" value={config.pass || ""} onChange={e => setConfig({ ...config, pass: e.target.value })} />
              </div>
              <hr />
              <div className="mb-3">
                <label className="form-label small fw-bold">Email người gửi</label>
                <input type="email" className="form-control" placeholder="no-reply@company.com" value={config.fromEmail || ""} onChange={e => setConfig({ ...config, fromEmail: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">Tên hiển thị người gửi</label>
                <input type="text" className="form-control" placeholder="HR Department" value={config.fromName || ""} onChange={e => setConfig({ ...config, fromName: e.target.value })} />
              </div>
              <div className="alert alert-info border-0 rounded-3 small">
                <i className="bi bi-info-circle-fill me-2"></i>
                Nếu dùng Gmail, hãy sử dụng <strong>Mật khẩu ứng dụng (App Password)</strong>.
              </div>
            </div>
          )}
        </div>

        <div className="offcanvas-footer p-3 border-top bg-light">
          <div className="d-flex gap-2">
            <button className="btn btn-light flex-grow-1 py-2 fw-bold text-muted border shadow-sm rounded-pill" onClick={onClose}>Đóng</button>
            <BrandButton
              type="button"
              className="flex-grow-1 fw-bold"
              loading={saving}
              onClick={() => {
                console.log("DEBUG: Button clicked");
                handleSave();
              }}
            >
              Lưu cấu hình
            </BrandButton>
          </div>
        </div>
      </div>
    </>
  );
}


// ─── Approval Submission Offcanvas ──────────────────────────────────────────

function ApprovalSubmissionOffcanvas({ onClose, onConfirm, loading, candidateCount }: {
  onClose: () => void,
  onConfirm: (data: any) => Promise<void>,
  loading: boolean,
  candidateCount: number
}) {
  const [formData, setFormData] = useState({
    message: `Kính gửi Ban Giám đốc,\n\nPhòng Nhân sự xin trình báo cáo kết quả phỏng vấn cho ${candidateCount} ứng viên đã hoàn tất quy trình đánh giá.\n\nKính mong Ban Giám đốc xem xét và phê duyệt.`,
    priority: "Normal",
    recipientId: ""
  });

  const [directors, setDirectors] = useState<any[]>([]);
  const [loadingDirectors, setLoadingDirectors] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPositions() {
      try {
        const res = await fetch("/api/board/categories?type=position");
        const data = await res.json();
        setPositions(data || []);
      } catch (err) { console.error(err); }
    }
    fetchPositions();
  }, []);

  const getPositionName = (code: string) => {
    if (!code) return "Quản lý";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  useEffect(() => {
    async function fetchDirectors() {
      setLoadingDirectors(true);
      try {
        const res = await fetch(`/api/hr/interviewers?level=manager`);
        const data = await res.json();
        const filtered = (Array.isArray(data) ? data : []).filter(d => d.userId);
        setDirectors(filtered);
        if (filtered.length > 0) {
          setFormData(prev => ({ ...prev, recipientId: filtered[0].userId }));
        }
      } catch (error) {
        console.error("Error fetching directors:", error);
      } finally {
        setLoadingDirectors(false);
      }
    }
    fetchDirectors();
  }, []);

  return (
    <>
      <div className="offcanvas-backdrop fade show" style={{ zIndex: 100065 }} onClick={onClose} />
      <div className="offcanvas offcanvas-end show border-0 shadow-lg" style={{ width: "400px", zIndex: 100070, visibility: "visible", fontSize: '0.85rem' }}>
        <div className="offcanvas-header border-bottom py-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary p-2 rounded-3 text-white shadow-sm d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
              <i className="bi bi-send-check-fill fs-5"></i>
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold m-0" style={{ fontSize: '1rem' }}>Trình Giám đốc duyệt</h5>
              <p className="text-muted m-0" style={{ fontSize: '0.75rem' }}>Gửi báo cáo & dữ liệu đánh giá phỏng vấn</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>

        <div className="offcanvas-body py-4 custom-scrollbar">
          <div className="mb-3">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-2">1. Người nhận phê duyệt</label>
            <div className="card border-0 bg-light p-3 rounded-4 shadow-sm">
              {loadingDirectors ? (
                <div className="text-center py-2"><span className="spinner-border spinner-border-sm text-primary" /></div>
              ) : directors.length === 0 ? (
                <div className="small text-danger italic">Không tìm thấy nhân sự cấp quản lý</div>
              ) : (
                <select
                  className="form-select border-0 shadow-sm rounded-3 py-2 mb-2"
                  style={{ height: "42px", fontSize: "0.85rem" }}
                  value={formData.recipientId}
                  onChange={e => setFormData(p => ({ ...p, recipientId: e.target.value }))}
                >
                  {directors.map(d => (
                    <option key={d.id} value={d.userId}>{d.fullName} - {getPositionName(d.position)}</option>
                  ))}
                </select>
              )}
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold">Độ ưu tiên:</span>
                <div className="btn-group btn-group-sm flex-grow-1">
                  <button className={`btn btn-outline-secondary ${formData.priority === 'Normal' ? 'active' : ''}`} onClick={() => setFormData(p => ({ ...p, priority: 'Normal' }))}>Thường</button>
                  <button className={`btn btn-outline-danger ${formData.priority === 'Urgent' ? 'active' : ''}`} onClick={() => setFormData(p => ({ ...p, priority: 'Urgent' }))}>Khẩn cấp</button>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-2">2. Nội dung trình ký</label>
            <textarea
              className="form-control border-light rounded-4 bg-light p-3 shadow-sm"
              style={{ minHeight: "150px", fontSize: "0.85rem", lineHeight: "1.6" }}
              value={formData.message}
              onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
              placeholder="Nhập lời nhắn gửi Giám đốc..."
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-2">3. Tài liệu đính kèm</label>
            <div className="p-3 border rounded-4 bg-light d-flex align-items-center gap-3 border-dashed border-primary shadow-sm">
              <div className="bg-danger-subtle p-2 rounded-3 text-danger">
                <i className="bi bi-file-earmark-pdf-fill fs-4" />
              </div>
              <div className="flex-grow-1 overflow-hidden">
                <div className="fw-bold small text-truncate">Bao_cao_tuyen_dung_{new Date().toLocaleDateString('vi-VN').replace(/\//g, '_')}.pdf</div>
                <div className="text-muted" style={{ fontSize: '10px' }}>Dung lượng: 1.2 MB • Bao bao gồm dữ liệu đánh giá</div>
              </div>
              <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 20, height: 20 }}>
                <i className="bi bi-check" style={{ fontSize: '14px' }} />
              </div>
            </div>
          </div>

        </div>

        <div className="offcanvas-footer p-3 border-top bg-light">
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-light flex-grow-1 rounded-pill fw-bold text-muted border shadow-sm"
              style={{ height: 38, fontSize: '13px' }}
              onClick={onClose}
            >
              Hủy bỏ
            </button>
            <BrandButton
              className="flex-grow-1 fw-bold"
              onClick={() => onConfirm(formData)}
              disabled={loading || !formData.recipientId}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <i className="bi bi-send-fill" />
              )}
              Xác nhận trình duyệt
            </BrandButton>
          </div>
        </div>
      </div>
    </>
  );
}

export default function RecruitmentPage() {
  return (
    <Suspense fallback={<div style={{ height: "100%" }} />}>
      <RecruitmentContent />
    </Suspense>
  );
}
