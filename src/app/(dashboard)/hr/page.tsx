"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { StandardPage } from "@/components/layout/StandardPage";
import { Table, TableColumn } from "@/components/ui/Table";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { BrandButton } from "@/components/ui/BrandButton";
import { MyRequestsTab } from "@/components/hr/MyRequestsTab";
import { TablePagination } from "@/components/ui/TablePagination";

// ── Types ───────────────────────────────────────────────────────────────────
type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ApprovalRequest {
  id: string;
  employeeId: string;
  employee: {
    fullName: string;
    code: string;
    avatarUrl: string | null;
    departmentName: string;
    userId: string | null;
    position: string;
  };
  type: string;
  startDate: string | null;
  endDate: string | null;
  reason: string | null;
  status: RequestStatus;
  hrApproved: boolean;
  createdAt: string;
  updatedAt: string;
  details?: string | null;
}

interface Department {
  id: string;
  code: string;
  nameVi: string;
}

const AVATAR_COLORS: [string, string][] = [
  ["#4338ca", "#e0e7ff"],
  ["#0369a1", "#e0f2fe"],
  ["#047857", "#d1fae5"],
  ["#b45309", "#fef3c7"],
  ["#be123c", "#ffe4e6"],
  ["#6d28d9", "#ede9fe"],
];

function avatarColor(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  if (!name) return "NV";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleBadge(role?: string | null, authorName?: string) {
  if (role === "approver" || role === "director" || role === "lead" || authorName?.includes("Giám đốc")) {
    return { label: "Ban Giám đốc", bg: "#fef3c7", color: "#b45309" };
  }
  if (role === "hr" || authorName?.includes("Nhân sự")) {
    return { label: "Nhân sự", bg: "#dcfce7", color: "#15803d" };
  }
  if (role === "requester") {
    return { label: "Người đề xuất", bg: "#e0f2fe", color: "#0369a1" };
  }
  return null;
}

const STEP_ITEMS: ModernStepItem[] = [
  { id: "pending", title: "Duyệt yêu cầu", icon: "bi-check2-circle", num: 1, desc: "Phê duyệt và xử lý" },
  { id: "history", title: "Lịch sử phê duyệt", icon: "bi-clock-history", num: 2, desc: "Tra cứu dữ liệu cũ" },
  { id: "my-requests", title: "Yêu cầu của tôi", icon: "bi-person-lines-fill", num: 3, desc: "Đề xuất đã gửi" },
];

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  "leave": { label: "Nghỉ phép", color: "#6366f1" },
  "unpaid_leave": { label: "Nghỉ không lương", color: "#f59e0b" },
  "late": { label: "Đi muộn", color: "#ec4899" },
  "early": { label: "Về sớm", color: "#8b5cf6" },
  "overtime": { label: "Tăng ca", color: "#10b981" },
  "hr-request": { label: "Hành chính - Nhân sự", color: "#10b981" },
  "work": { label: "Công tác", color: "#f59e0b" },
  "business-trip": { label: "Công tác", color: "#f59e0b" },
  "finance": { label: "Tài chính - Kế toán", color: "#eab308" },
  "recruitment": { label: "Tuyển dụng", color: "#3b82f6" },
  "training": { label: "Đào tạo", color: "#06b6d4" },
  "promotion": { label: "Đề bạt & thuyên chuyển", color: "#8b5cf6" },
  "salary-adjustment": { label: "Điều chỉnh thu nhập", color: "#f43f5e" },
  "stationery": { label: "Văn phòng phẩm và dụng cụ", color: "#ec4899" },
  "salary-advance": { label: "Tạm ứng lương", color: "#3b82f6" },
  "advance-refund": { label: "Tạm ứng & hoàn ứng", color: "#7c3aed" },
  "sick-leave": { label: "Nghỉ ốm (BHXH)", color: "#db2777" },
};

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramRequestId = searchParams?.get("requestId") || searchParams?.get("id");
  const paramTab = searchParams?.get("tab");
  const currentUserId = (session?.user as any)?.id;
  const { success: toastSuccess, error: toastError } = useToast();

  const isHRManager = session?.user?.role === "SUPERADMIN" || session?.user?.role === "admin" || (
    session?.user?.departmentCode?.toLowerCase() === "hr" &&
    ((session?.user as any)?.positionName?.includes("Trưởng phòng") || (session?.user as any)?.position === "vtr-20260401-1964-sbmg")
  );

  useEffect(() => {
    try {
      const deptAccessStr = (session?.user as any)?.deptAccess || "[]";
      const deptAccess = JSON.parse(deptAccessStr);
      const hasHRAccess = Array.isArray(deptAccess) && deptAccess.some((d: any) => d.code === "hr" && d.level !== "none");
      const isAllowed = isHRManager || hasHRAccess || sessionStorage.getItem("fromAdmin") === "true";

      if (session && !isAllowed) {
        const dept = session?.user?.departmentCode;
        router.push(dept ? `/${dept}` : "/board");
      }
    } catch (e) {
      if (session && !isHRManager) {
        const dept = session?.user?.departmentCode;
        router.push(dept ? `/${dept}` : "/board");
      }
    }
  }, [session, isHRManager, router]);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [allRequests, setAllRequests] = useState<ApprovalRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<{ code: string, name: string }[]>([]);
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejected: 0 });

  // UI State
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ open: boolean; id: string | null; isBatch?: boolean }>({ open: false, id: null });
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  // Tab Trao đổi công việc trong Offcanvas của HR
  const [hrOffcanvasTab, setHrOffcanvasTab] = useState<"detail" | "comments">("detail");
  const [hrComments, setHrComments] = useState<any[]>([]);
  const [hrCommentInput, setHrCommentInput] = useState("");
  const [hrSubmittingComment, setHrSubmittingComment] = useState(false);
  const hrChatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedRequest) {
      setHrComments([]);
      setHrOffcanvasTab("detail");
      return;
    }
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/approvals/${selectedRequest.id}/comments`);
        const json = await res.json();
        if (json.success) {
          setHrComments(json.data || []);
        }
      } catch (err) {
        console.error("fetch comments error:", err);
      }
    };
    fetchComments();
  }, [selectedRequest]);

  useEffect(() => {
    if (hrOffcanvasTab === "comments") {
      const el = hrChatScrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [hrOffcanvasTab, hrComments]);

  // Tự động mở đơn và tab trao đổi khi truy cập từ thông báo
  useEffect(() => {
    if (paramRequestId) {
      if (allRequests.length > 0) {
        const found = allRequests.find((r) => r.id === paramRequestId);
        if (found) {
          setSelectedRequest(found);
          if (paramTab === "comments") {
            setHrOffcanvasTab("comments");
          }
          return;
        }
      }
      fetch(`/api/hr/approvals/${paramRequestId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.data) {
            setSelectedRequest(d.data);
            if (paramTab === "comments") setHrOffcanvasTab("comments");
          }
        })
        .catch(console.error);
    }
  }, [paramRequestId, paramTab, allRequests]);

  const handleHrSendComment = async () => {
    if (!selectedRequest || !hrCommentInput.trim() || hrSubmittingComment) return;
    setHrSubmittingComment(true);
    try {
      const res = await fetch(`/api/approvals/${selectedRequest.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: hrCommentInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHrComments((prev) => [...prev, data.data]);
        setHrCommentInput("");
        toastSuccess("Đã gửi ý kiến trao đổi");
      } else {
        toastError(data.error || "Gửi thất bại");
      }
    } catch {
      toastError("Không thể gửi bình luận");
    } finally {
      setHrSubmittingComment(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const activeTabId = useMemo(() => STEP_ITEMS.find(s => s.num === currentStep)?.id || "pending", [currentStep]);

  const monthOptions = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const options = [];
    for (let i = 1; i <= currentMonth; i++) {
      options.push({ label: `Tháng ${i}`, value: i.toString() });
    }
    return options;
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, posRes] = await Promise.all([
        fetch(`/api/hr/approvals`),
        fetch(`/api/board/categories?type=position`)
      ]);

      if (res.ok) {
        const result = await res.json();
        setAllRequests(result.requests);
        setStats(result.stats);
        setDepartments(result.departments);
      }

      if (posRes.ok) {
        const posData = await posRes.json();
        setPositions(posData || []);
      }
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    setPage(1);
  }, [currentStep, searchQuery, deptFilter, statusFilter, monthFilter]);

  const getPositionName = (code: string) => {
    if (!code) return "—";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const filteredData = useMemo(() => {
    let filtered = [...allRequests];

    if (activeTabId === "pending") {
      filtered = filtered.filter(r => r.status.toUpperCase() === "PENDING");
    } else if (activeTabId === "history") {
      filtered = filtered.filter(r => r.status.toUpperCase() !== "PENDING");
    } else if (activeTabId === "my-requests") {
      filtered = filtered.filter(r => r.employee.userId === currentUserId);
    }

    if (statusFilter) filtered = filtered.filter(r => r.status.toUpperCase() === statusFilter.toUpperCase());
    if (deptFilter) {
       filtered = filtered.filter(r => r.employee.departmentName === deptFilter);
    }
    if (monthFilter) {
       filtered = filtered.filter(r => (new Date(r.createdAt).getMonth() + 1).toString() === monthFilter);
    }

    if (searchQuery) {
       const q = searchQuery.toLowerCase();
       filtered = filtered.filter(r => {
         const typeLabel = TYPE_MAP[r.type.toLowerCase()]?.label.toLowerCase() || "";
         return (
           r.employee.fullName.toLowerCase().includes(q) || 
           r.reason?.toLowerCase().includes(q) ||
           typeLabel.includes(q)
         );
       });
    }

    return filtered;
  }, [allRequests, activeTabId, statusFilter, deptFilter, monthFilter, searchQuery, currentUserId]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT" | "FORWARD_DIRECTOR", note?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (res.ok) {
        let msg = "Đã thực hiện";
        if (action === "APPROVE") msg = "Đã phê duyệt yêu cầu";
        else if (action === "REJECT") msg = "Đã từ chối yêu cầu";
        else if (action === "FORWARD_DIRECTOR") msg = "Đã gửi vào Trung tâm phê duyệt & thông báo cho Giám đốc";
        
        toastSuccess(msg);
        setRejectionModal({ open: false, id: null });
        setRejectionNote("");
        setSelectedRequest(null);
        fetchData();
      } else {
        const errMsg = await res.text();
        toastError(errMsg || "Lỗi xử lý");
      }
    } catch (error) {
      toastError("Lỗi hệ thống");
    } finally {
      setActionLoading(false);
    }
  };

    const handleBatchDelete = async () => {
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const promises = ids.map(async id => {
        const res = await fetch(`/api/hr/approvals/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Lỗi khi xoá");
        }
      });
      await Promise.all(promises);
      toastSuccess("Đã xoá " + ids.length + " đề xuất");
      setSelectedIds(new Set());
      setBatchDeleteConfirm(false);
      fetchData();
    } catch (err) {
      toastError("Lỗi khi xoá hàng loạt");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchAction = async (action: "APPROVE" | "REJECT" | "FORWARD_DIRECTOR", note?: string) => {
    setActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/hr/approvals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, note }),
        })
      );
      
      const results = await Promise.all(promises);
      const allOk = results.every(res => res.ok);
      
      if (allOk) {
        let msg = "Đã thực hiện hàng loạt";
        if (action === "APPROVE") msg = "Đã phê duyệt các yêu cầu đã chọn";
        else if (action === "REJECT") msg = "Đã từ chối các yêu cầu đã chọn";
        else if (action === "FORWARD_DIRECTOR") msg = "Đã trình lãnh đạo các yêu cầu đã chọn";
        
        toastSuccess(msg);
        setSelectedIds(new Set());
        setRejectionModal({ open: false, id: null, isBatch: false });
        setRejectionNote("");
        fetchData();
      } else {
        toastError("Có lỗi xảy ra khi xử lý một số yêu cầu");
        setSelectedIds(new Set());
        fetchData();
      }
    } catch (error) {
      toastError("Lỗi hệ thống");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedData.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/hr/approvals/${deleteConfirm.id}`, { method: "DELETE" });
      if (res.ok) {
        toastSuccess("Đã xóa yêu cầu thành công");
        setDeleteConfirm({ open: false, id: null });
        setSelectedRequest(null);
        fetchData();
      } else {
        const errMsg = await res.text();
        toastError(errMsg || "Không thể xóa yêu cầu này");
      }
    } catch (error) {
      toastError("Lỗi hệ thống");
    } finally {
      setDeleteLoading(false);
    }
  };

  const requestColumns: TableColumn<ApprovalRequest>[] = [
    {
      header: (
        <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
          <input
            type="checkbox"
            className="form-check-input cursor-pointer"
            checked={paginatedData.length > 0 && paginatedData.every(r => selectedIds.has(r.id))}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        </div>
      ),
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
          <input
            type="checkbox"
            className="form-check-input cursor-pointer"
            checked={selectedIds.has(r.id)}
            onChange={(e) => handleSelectRow(r.id, e.target.checked)}
          />
        </div>
      ),
      width: "40px",
      align: "center"
    },
    {
      header: "Người yêu cầu",
      render: (r) => (
        <div className="d-flex align-items-center gap-2">
          <EmployeeAvatar name={r.employee.fullName} url={r.employee.avatarUrl} size={30} />
          <div>
            <div className="fw-bold text-dark" style={{ fontSize: 12 }}>
              {r.employee.fullName} 
              {r.employee.userId === currentUserId && <span className="badge bg-primary-subtle text-primary border-0 ms-1" style={{ fontSize: 8 }}>Tôi</span>}
            </div>
            <div className="text-muted" style={{ fontSize: 10 }}>
              {getPositionName(r.employee.position)} • {r.employee.departmentName}
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Nội dung đề xuất",
      render: (r) => {
        const config = TYPE_MAP[r.type.toLowerCase()] || { label: r.type, color: "#64748b" };
        let displayType = config.label;
        if (r.details) {
          try {
            const parsed = JSON.parse(r.details);
            if (parsed.leaveType) displayType = `${config.label} (${parsed.leaveType})`;
            else if (parsed.requestType) displayType = `${config.label} (${parsed.requestType})`;
            else if (parsed.time) displayType = `${config.label} (${parsed.time})`;
          } catch (e) {}
        }
        return (
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge rounded-pill" style={{ background: `${config.color}15`, color: config.color, fontSize: 10 }}>
                {displayType}
              </span>
              <span className="text-muted fw-medium" style={{ fontSize: 11 }}>
                {r.startDate ? new Date(r.startDate).toLocaleDateString("vi-VN") : "N/A"}
                {r.endDate && ` - ${new Date(r.endDate).toLocaleDateString("vi-VN")}`}
              </span>
            </div>
            <div className="text-muted text-truncate" style={{ fontSize: 11, maxWidth: 250 }}>{r.reason || "Không có lý do chi tiết"}</div>
          </div>
        );
      }
    },
    {
      header: "Ngày tạo",
      render: (r) => <span className="text-muted" style={{ fontSize: 11 }}>{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>,
      width: "120px",
      align: "center"
    },
    {
      header: "Trạng thái",
      render: (r) => {
        const map = {
          PENDING: { 
             label: r.type.toLowerCase() === "stationery" ? "Chưa xử lý" : (r.hrApproved ? "Trình lãnh đạo" : "Chờ duyệt"), 
             cls: r.type.toLowerCase() === "stationery" ? "bg-warning-subtle text-warning border-warning" : (r.hrApproved ? "bg-info-subtle text-info border-info" : "bg-warning-subtle text-warning border-warning") 
          },
          APPROVED: { 
             label: r.type.toLowerCase() === "stationery" ? "Văn phòng đang xử lý" : "Đã duyệt", 
             cls: r.type.toLowerCase() === "stationery" ? "bg-info-subtle text-info border-info" : "bg-success-subtle text-success border-success" 
          },
          DELIVERED: { label: "Đã cấp phát", cls: "bg-success-subtle text-success border-success" },
          REJECTED: { 
             label: r.type.toLowerCase() === "stationery" ? "Văn phòng đang xử lý" : "Từ chối", 
             cls: r.type.toLowerCase() === "stationery" ? "bg-info-subtle text-info border-info" : "bg-danger-subtle text-danger border-danger" 
          },
        };
        const m = map[r.status.toUpperCase() as keyof typeof map] || map.PENDING;
        return <span className={`badge border rounded-pill px-2 ${m.cls}`} style={{ fontSize: 10 }}>{m.label}</span>;
      },
      width: "120px",
      align: "center"
    }
  ];

  const ApprovalsTopToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100 px-3 py-2 border-bottom bg-white" style={{ minHeight: 48 }}>
      {selectedIds.size > 0 ? (
        <div className="d-flex align-items-center gap-2">
          <span className="text-primary fw-bold" style={{ fontSize: 11 }}>Đã chọn {selectedIds.size} đề xuất:</span>
          <button 
            className="btn btn-danger btn-sm d-flex align-items-center gap-1 py-1 px-2 border-0 shadow-sm" 
            onClick={() => setBatchDeleteConfirm(true)}
            disabled={actionLoading}
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            <i className="bi bi-trash3" /> Xoá
          </button>
        </div>
      ) : (
        <div className="d-flex align-items-center gap-2">
        <FilterSelect
          placeholder="Tất cả phòng ban"
          options={departments.map(d => ({ label: d.nameVi, value: d.nameVi }))}
          value={deptFilter}
          onChange={setDeptFilter}
          width={180}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
        <SearchInput
          placeholder="Tìm nhân viên, nội dung..."
          value={searchQuery}
          onChange={setSearchQuery}
          style={{ width: 220 }}
          className="border-0 shadow-sm transition-all"
        />
        <FilterSelect
          placeholder="Trạng thái"
          options={[
            { label: "Chờ duyệt", value: "PENDING" },
            { label: "Đã duyệt", value: "APPROVED" },
            { label: "Từ chối", value: "REJECTED" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          width={130}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
        <FilterSelect
          placeholder="Tháng"
          options={monthOptions}
          value={monthFilter}
          onChange={setMonthFilter}
          width={110}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
      </div>
    )}

      <div className="d-flex align-items-center gap-3">
        <div className="bg-white rounded-pill px-3 py-1 border shadow-sm d-flex gap-3" style={{ fontSize: 11 }}>
          <span className="text-warning fw-bold">{stats.pending} chờ</span>
          <span className="text-info fw-bold">{stats.approvedToday} duyệt</span>
          <span className="text-danger fw-bold">{stats.rejected} lỗi</span>
        </div>
        <div className="border-start ps-3 fw-bold text-muted" style={{ fontSize: 12 }}>Tổng: {filteredData.length}/{allRequests.length}</div>
      </div>
    </div>
  );

  return (
    <StandardPage
      title="Đề xuất và duyệt đề xuất"
      description="Quản lý và phê duyệt các yêu cầu từ nhân viên toàn công ty"
      icon="bi-check2-square"
      color="rose"
      useCard={false}
    >
      <div className="flex-grow-1 d-flex flex-column gap-3 overflow-hidden">

        <WorkflowCard
          contentPadding="p-0"
          toolbar={activeTabId === "my-requests" ? null : ApprovalsTopToolbar}
          bottomToolbar={
            activeTabId === "my-requests" ? null : (
              <TablePagination
                page={page}
                totalPages={totalPages}
                totalCount={filteredData.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                itemName="đề xuất"
              />
            )
          }
          stepper={
            <ModernStepper steps={STEP_ITEMS} currentStep={currentStep} onStepChange={setCurrentStep} paddingX={0} />
          }
        >
          <div className="h-100 bg-white overflow-auto">
            {activeTabId === "my-requests" ? (
              <MyRequestsTab />
            ) : (
              <FullWidthTableLayout
                tableWrapperClassName=""
                table={
                  <Table
                    rows={paginatedData}
                    columns={requestColumns}
                    loading={loading}
                    rowKey={(r) => r.id}
                    onRowClick={setSelectedRequest}
                    emptyText={`Không có dữ liệu trong mục ${STEP_ITEMS.find(s => s.num === currentStep)?.title}`}
                    compact
                    striped={false}
                    wrapperClassName="mkt-plan-table-no-min"
                  />
                }
              />
            )}
          </div>
        </WorkflowCard>
      </div>

      {/* Rejection Note Modal */}
      <ConfirmDialog 
        open={rejectionModal.open}
        title="Lý do từ chối"
        message={
          <div className="mt-2">
            <textarea 
              className="form-control" 
              placeholder="Nhập lý do từ chối để nhân viên nắm bắt..."
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        }
        variant="warning"
        confirmLabel="Từ chối"
        loading={actionLoading}
        onConfirm={() => {
          if (rejectionModal.isBatch) {
            handleBatchAction("REJECT", rejectionNote);
          } else if (rejectionModal.id) {
            handleAction(rejectionModal.id, "REJECT", rejectionNote);
          }
        }}
        onCancel={() => { setRejectionModal({ open: false, id: null, isBatch: false }); setRejectionNote(""); }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog 
        open={deleteConfirm.open}
        title="Xác nhận xóa yêu cầu"
        message="Bạn có chắc chắn muốn xóa đề xuất này? Hành động này không thể hoàn tác."
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />

            <ConfirmDialog
        open={batchDeleteConfirm}
        title="Xác nhận xoá đề xuất"
        message={`Bạn có chắc chắn muốn xoá ${selectedIds.size} đề xuất đã chọn? Dữ liệu không thể khôi phục sau khi xoá.`}
        confirmLabel="Xoá dữ liệu"
        cancelLabel="Huỷ bỏ"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleBatchDelete}
        onCancel={() => setBatchDeleteConfirm(false)}
      />

      {/* Request Detail Offcanvas */}
      {selectedRequest && (() => {
        const typeKey = selectedRequest.type.toLowerCase();
        let details: any = {};
        if (selectedRequest.details) {
          try {
            details = JSON.parse(selectedRequest.details);
          } catch (e) {
            details = {};
          }
        }

        const getStatusBadge = () => {
          if (typeKey === "stationery") {
            if (selectedRequest.status.toUpperCase() === "PENDING") {
              return <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1" style={{ fontSize: 11.5 }}>Chưa xử lý</span>;
            }
            if (selectedRequest.status.toUpperCase() === "APPROVED") {
              return <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1" style={{ fontSize: 11.5 }}>VP đang xử lý</span>;
            }
            if (selectedRequest.status.toUpperCase() === "DELIVERED") {
              return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{ fontSize: 11.5 }}>Đã cấp phát</span>;
            }
            return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1" style={{ fontSize: 11.5 }}>Từ chối</span>;
          }

          if (selectedRequest.status.toUpperCase() === "PENDING") {
            if (selectedRequest.hrApproved) {
              return <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1" style={{ fontSize: 11.5 }}>Trình lãnh đạo</span>;
            }
            return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1" style={{ fontSize: 11.5 }}>Chờ duyệt</span>;
          }
          if (selectedRequest.status.toUpperCase() === "APPROVED") {
            return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{ fontSize: 11.5 }}>Đã duyệt</span>;
          }
          return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1" style={{ fontSize: 11.5 }}>Từ chối</span>;
        };

        const renderBankCard = () => {
          if (!details.bankInfo && !details.bankAccount) return null;

          let bankName = details.bankName || "";
          let bankAccount = details.bankAccount || "";
          let bankAccountName = details.bankAccountName || "";

          if (details.bankInfo) {
            const raw = String(details.bankInfo).trim();
            // Khớp dạng: "Tên Ngân hàng - STK (Tên chủ TK)" hoặc "Tên - Chi tiết - STK (Tên chủ TK)"
            const match = raw.match(/^(.*?)\s*-\s*([0-9A-Za-z]+)\s*\((.*?)\)$/);
            if (match) {
              if (!bankName) bankName = match[1].trim();
              if (!bankAccount) bankAccount = match[2].trim();
              if (!bankAccountName) bankAccountName = match[3].trim();
            } else {
              const matchNum = raw.match(/(\d{6,20})/);
              const matchName = raw.match(/\((.*?)\)/);
              if (matchNum && !bankAccount) bankAccount = matchNum[1];
              if (matchName && !bankAccountName) bankAccountName = matchName[1];
              if (!bankName && bankAccount) {
                bankName = raw.split(bankAccount)[0].replace(/[-–—]/g, " ").trim();
              }
            }
            if (!bankName && !bankAccount) {
              bankName = raw;
            }
          }

          if (!bankAccountName) bankAccountName = selectedRequest.employee.fullName;

          // Rút gọn tên ngân hàng hiển thị gọn gàng (ví dụ "Vietcombank - Ngân hàng TMCP Ngoại thương Việt Nam" -> "Vietcombank")
          let shortBankName = bankName;
          if (bankName.includes(" - ")) {
            shortBankName = bankName.split(" - ")[0].trim();
          }

          const isCopied = copiedBankId === bankAccount;

          return (
            <div className="pt-2 border-top">
              <div className="text-muted mb-1.5 fw-semibold text-uppercase" style={{ fontSize: 11 }}>
                Tài khoản thụ hưởng
              </div>
              <div 
                className="p-3 rounded-3 position-relative overflow-hidden text-white"
                style={{
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  border: "1px solid #334155",
                  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)"
                }}
              >
                {/* Background watermark */}
                <i 
                  className="bi bi-credit-card-2-front position-absolute" 
                  style={{
                    right: -10,
                    bottom: -15,
                    fontSize: 75,
                    opacity: 0.08,
                    pointerEvents: "none"
                  }}
                />

                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-1.5">
                    <i className="bi bi-bank2 text-warning" style={{ fontSize: 14 }}></i>
                    <span className="fw-bold text-white" style={{ fontSize: 13, letterSpacing: "0.2px" }}>
                      {shortBankName || "NGÂN HÀNG"}
                    </span>
                  </div>
                  <span 
                    className="badge px-2 py-0.5" 
                    style={{ 
                      fontSize: 10, 
                      background: "rgba(255,255,255,0.12)", 
                      color: "#94a3b8",
                      fontWeight: 500,
                      borderRadius: 4
                    }}
                  >
                    Chuyển khoản
                  </span>
                </div>

                {bankAccount ? (
                  <div className="my-2 p-2 rounded" style={{ background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div className="text-secondary" style={{ fontSize: 10, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Số tài khoản
                    </div>
                    <div className="d-flex align-items-center justify-content-between mt-0.5">
                      <span className="font-monospace fw-bold text-white" style={{ fontSize: 16, letterSpacing: "1.2px" }}>
                        {bankAccount}
                      </span>
                      <button 
                        type="button"
                        className="btn btn-sm py-0.5 px-2 d-flex align-items-center gap-1 border-0 shadow-none"
                        style={{
                          fontSize: 11,
                          borderRadius: 4,
                          background: isCopied ? "rgba(34, 197, 94, 0.25)" : "rgba(255, 255, 255, 0.15)",
                          color: isCopied ? "#4ade80" : "#e2e8f0"
                        }}
                        onClick={() => {
                          navigator.clipboard.writeText(bankAccount);
                          setCopiedBankId(bankAccount);
                          setTimeout(() => setCopiedBankId(null), 2000);
                        }}
                        title="Sao chép số tài khoản"
                      >
                        <i className={`bi ${isCopied ? "bi-check2" : "bi-copy"}`}></i>
                        {isCopied ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="my-1.5 fw-semibold text-light" style={{ fontSize: 13 }}>{details.bankInfo}</div>
                )}

                <div className="mt-2 d-flex justify-content-between align-items-end">
                  <div>
                    <div className="text-secondary" style={{ fontSize: 10, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Chủ tài khoản
                    </div>
                    <div className="fw-bold text-white text-uppercase" style={{ fontSize: 12.5, letterSpacing: "0.5px" }}>
                      {bankAccountName}
                    </div>
                  </div>
                  {bankName && bankName !== shortBankName && (
                    <span className="text-secondary text-truncate ms-2 text-end" style={{ fontSize: 10.5, maxWidth: 150 }} title={bankName}>
                      {bankName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        };

        const renderTypeSpecificContent = () => {
          // 1. Tạm ứng lương
          if (typeKey === "salary-advance") {
            const amount = Number(details.amount || 0);
            return (
              <div className="d-flex flex-column gap-3">
                {/* Hero card số tiền */}
                <div className="p-3 rounded-3 border text-center shadow-xs" style={{ background: "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)", borderColor: "#fecaca" }}>
                  <div className="text-muted fw-semibold text-uppercase" style={{ fontSize: 11, letterSpacing: "0.5px" }}>Số tiền tạm ứng</div>
                  <div className="fw-bold text-danger my-1" style={{ fontSize: 24 }}>
                    {amount > 0 ? `${amount.toLocaleString("vi-VN")} đ` : "—"}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Khấu trừ vào lương: <strong className="text-primary">Tháng {details.salaryMonth || "Hiện tại"}</strong>
                  </div>
                </div>

                {/* Grid chi tiết */}
                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Hình thức nhận:</span>
                    <span className="fw-semibold text-dark">{details.paymentMethod || "Chuyển khoản"}</span>
                  </div>
                  {renderBankCard()}
                </div>

                {/* Lý do */}
                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Lý do tạm ứng</div>
                  <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {details.reason || selectedRequest.reason || "Không có lý do chi tiết"}
                  </div>
                </div>
              </div>
            );
          }

          // 2. Tạm ứng & Hoàn ứng
          if (typeKey === "advance-refund") {
            const amount = Number(details.amount || 0);
            const isAdvance = details.subType !== "Hoàn ứng" && details.subType !== "Quyết toán";
            return (
              <div className="d-flex flex-column gap-3">
                <div className="p-3 rounded-3 border text-center shadow-xs" style={{ background: "linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)", borderColor: "#e9d5ff" }}>
                  <span className="badge bg-purple-subtle text-purple border fw-semibold mb-1" style={{ fontSize: 11 }}>
                    {details.subType || (isAdvance ? "Tạm ứng công việc" : "Hoàn ứng quyết toán")}
                  </span>
                  <div className="fw-bold text-danger my-1" style={{ fontSize: 24 }}>
                    {amount > 0 ? `${amount.toLocaleString("vi-VN")} đ` : "—"}
                  </div>
                  {details.advanceCode && (
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      Mã tạm ứng gốc: <span className="font-monospace fw-bold text-dark">{details.advanceCode}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Phương thức:</span>
                    <span className="fw-semibold text-dark">{details.paymentMethod || "Chuyển khoản"}</span>
                  </div>
                  {details.isBusinessTrip && (
                    <div className="d-flex justify-content-between align-items-center border-top pt-2">
                      <span className="text-muted">Lịch công tác:</span>
                      <span className="fw-semibold text-primary">
                        {details.tripStartDate ? new Date(details.tripStartDate).toLocaleDateString("vi-VN") : (selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString("vi-VN") : "—")} 
                        {" - "}
                        {details.tripEndDate ? new Date(details.tripEndDate).toLocaleDateString("vi-VN") : (selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString("vi-VN") : "—")}
                      </span>
                    </div>
                  )}
                  {renderBankCard()}
                </div>

                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Mục đích chi / Diễn giải</div>
                  <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {details.purpose || details.reason || selectedRequest.reason || "Không có nội dung chi tiết"}
                  </div>
                </div>
              </div>
            );
          }

          // 3. Nghỉ ốm
          if (typeKey === "sick-leave") {
            return (
              <div className="d-flex flex-column gap-3">
                <div className="p-3 rounded-3 border text-center shadow-xs" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)", borderColor: "#fed7aa" }}>
                  <div className="text-muted fw-semibold text-uppercase" style={{ fontSize: 11 }}>Thời gian xin nghỉ</div>
                  <div className="fw-bold text-warning-emphasis my-1" style={{ fontSize: 24 }}>
                    {details.totalDays || 1} <span style={{ fontSize: 16, fontWeight: 500 }}>ngày</span>
                  </div>
                  <span className="badge bg-warning-subtle text-warning-emphasis border" style={{ fontSize: 11 }}>
                    {details.sickType || "Nghỉ ốm hưởng BHXH"}
                  </span>
                </div>

                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Từ ngày:</span>
                    <span className="fw-semibold">{selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString("vi-VN") : "—"}</span>
                  </div>
                  <div className="d-flex justify-content-between border-top pt-2">
                    <span className="text-muted">Đến ngày:</span>
                    <span className="fw-semibold">{selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString("vi-VN") : "—"}</span>
                  </div>
                  {details.medicalFacility && (
                    <div className="d-flex justify-content-between border-top pt-2">
                      <span className="text-muted">Cơ sở khám bệnh:</span>
                      <span className="fw-semibold text-end">{details.medicalFacility}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Lý do nghỉ ốm</div>
                  <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {details.reason || selectedRequest.reason || "Không có lý do chi tiết"}
                  </div>
                </div>
              </div>
            );
          }

          // 4. Nghỉ phép / Không lương / Việc riêng
          if (typeKey === "leave" || typeKey === "unpaid_leave") {
            const leaveName = details.leaveType || (typeKey === "unpaid_leave" ? "Nghỉ không hưởng lương" : "Nghỉ phép năm");
            return (
              <div className="d-flex flex-column gap-3">
                <div className="p-3 rounded-3 border text-center shadow-xs" style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)", borderColor: "#bae6fd" }}>
                  <div className="text-muted fw-semibold text-uppercase" style={{ fontSize: 11 }}>Số ngày xin nghỉ</div>
                  <div className="fw-bold text-primary my-1" style={{ fontSize: 24 }}>
                    {details.totalDays || 1} <span style={{ fontSize: 16, fontWeight: 500 }}>ngày</span>
                  </div>
                  <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: 11 }}>
                    {leaveName}
                  </span>
                </div>

                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Từ ngày:</span>
                    <span className="fw-semibold">{selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString("vi-VN") : "—"}</span>
                  </div>
                  <div className="d-flex justify-content-between border-top pt-2">
                    <span className="text-muted">Đến ngày:</span>
                    <span className="fw-semibold">{selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString("vi-VN") : "—"}</span>
                  </div>
                  {details.handoverTo && (
                    <div className="d-flex justify-content-between border-top pt-2">
                      <span className="text-muted">Người bàn giao:</span>
                      <span className="fw-semibold">{details.handoverTo}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Lý do xin nghỉ</div>
                  <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {details.reason || selectedRequest.reason || "Không có lý do chi tiết"}
                  </div>
                </div>
              </div>
            );
          }

          // 5. Đi muộn / Về sớm
          if (typeKey === "late" || typeKey === "early") {
            const isLate = typeKey === "late";
            return (
              <div className="d-flex flex-column gap-3">
                <div className="p-3 rounded-3 border text-center shadow-xs" style={{ background: "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)", borderColor: "#fde68a" }}>
                  <span className="badge bg-warning-subtle text-warning-emphasis border fw-semibold mb-1" style={{ fontSize: 11 }}>
                    {details.requestType || (isLate ? "Đăng ký đi muộn" : "Đăng ký về sớm")}
                  </span>
                  <div className="fw-bold text-dark my-1" style={{ fontSize: 24 }}>
                    {details.minutes || 30} <span style={{ fontSize: 16, fontWeight: 500 }}>phút</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Khung giờ: <strong>{details.time || (isLate ? "08:30" : "17:00")}</strong>
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Ngày áp dụng:</span>
                    <span className="fw-semibold text-primary">{selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString("vi-VN") : "—"}</span>
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Lý do {isLate ? "đi muộn" : "về sớm"}</div>
                  <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {details.reason || selectedRequest.reason || "Không có lý do chi tiết"}
                  </div>
                </div>
              </div>
            );
          }

          // 6. Làm thêm giờ (Overtime)
          if (typeKey === "overtime") {
            return (
              <div className="d-flex flex-column gap-3">
                <div className="p-3 rounded-3 border text-center shadow-xs" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)", borderColor: "#bbf7d0" }}>
                  <span className="badge bg-success-subtle text-success border fw-semibold mb-1" style={{ fontSize: 11 }}>
                    {details.overtimeType || "Làm thêm ngày thường (150%)"}
                  </span>
                  <div className="fw-bold text-success my-1" style={{ fontSize: 24 }}>
                    {details.totalHours || 2} <span style={{ fontSize: 16, fontWeight: 500 }}>giờ</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Khung giờ: <strong>{details.startTime || "17:30"} - {details.endTime || "19:30"}</strong>
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Ngày làm thêm:</span>
                    <span className="fw-semibold text-primary">{selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString("vi-VN") : "—"}</span>
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Nội dung làm thêm</div>
                  <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {details.reason || selectedRequest.reason || "Không có nội dung chi tiết"}
                  </div>
                </div>
              </div>
            );
          }

          // 7. Văn phòng phẩm
          if (typeKey === "stationery") {
            return (
              <div className="d-flex flex-column gap-3">
                {details.totalAmount > 0 && (
                  <div className="p-3 rounded-3 border text-center shadow-xs" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)" }}>
                    <div className="text-muted fw-semibold text-uppercase" style={{ fontSize: 11 }}>Tổng tiền dự kiến</div>
                    <div className="fw-bold text-danger my-1" style={{ fontSize: 22 }}>
                      {Number(details.totalAmount).toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                )}

                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted fw-semibold text-uppercase mb-2" style={{ fontSize: 11 }}>Danh sách vật tư đề xuất</div>
                  <div className="table-responsive bg-white rounded border">
                    <table className="table table-sm table-borderless mb-0" style={{ fontSize: 12 }}>
                      <thead>
                        <tr className="border-bottom bg-light">
                          <th className="px-2 py-1.5">Tên vật tư</th>
                          <th style={{ width: 70 }} className="text-center px-1 py-1.5">ĐVT</th>
                          <th style={{ width: 60 }} className="text-center px-1 py-1.5">SL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.items?.map((item: any, idx: number) => (
                          <tr key={idx} className="border-bottom">
                            <td className="px-2 py-1.5 fw-medium text-dark">{item.name}</td>
                            <td className="text-center px-1 py-1.5 text-muted">{item.unit}</td>
                            <td className="text-center px-1 py-1.5 fw-bold text-primary">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {(details.note || selectedRequest.reason) && (
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Ghi chú / Mục đích</div>
                    <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {details.note || selectedRequest.reason}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // 8. Tuyển dụng
          if (typeKey === "recruitment") {
            return (
              <div className="d-flex flex-column gap-3">
                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div><strong>Vị trí tuyển dụng:</strong> <span className="text-primary fw-bold ms-1">{details.position}</span></div>
                  <div><strong>Số lượng cần tuyển:</strong> <span className="badge bg-primary ms-1">{details.quantity}</span></div>
                  <div><strong>Cấp bậc:</strong> {details.level}</div>
                  <div><strong>Hình thức làm việc:</strong> {details.workType}</div>
                  <div><strong>Mức lương đề xuất:</strong> <span className="text-danger fw-bold ms-1">{details.salary}</span></div>
                  {details.deadline && <div><strong>Hạn tuyển:</strong> {new Date(details.deadline).toLocaleDateString("vi-VN")}</div>}
                </div>
                {selectedRequest.reason && (
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Mô tả & Yêu cầu</div>
                    <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {selectedRequest.reason.split("\nMô tả chi tiết:\n")[1] || selectedRequest.reason}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // 9. Đào tạo
          if (typeKey === "training") {
            return (
              <div className="d-flex flex-column gap-3">
                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div><strong>Chủ đề đào tạo:</strong> <span className="text-primary fw-bold ms-1">{details.topic}</span></div>
                  <div><strong>Giảng viên:</strong> {details.trainer || "Chưa xác định"}</div>
                  <div><strong>Địa điểm:</strong> {details.location || "Chưa xác định"}</div>
                  <div><strong>Đối tượng tham gia:</strong> {details.participants || "Chưa xác định"}</div>
                </div>
                {selectedRequest.reason && (
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Nội dung chi tiết</div>
                    <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {selectedRequest.reason.split("\nNội dung chi tiết:\n")[1] || selectedRequest.reason}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // 10. Đề bạt / Thăng tiến / Thuyên chuyển
          if (typeKey === "promotion") {
            return (
              <div className="d-flex flex-column gap-3">
                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div><strong>Nhân viên:</strong> {details.employee}</div>
                  <div><strong>Hình thức:</strong> <span className="badge bg-purple-subtle text-purple border ms-1">{details.isTransfer ? "Thuyên chuyển công tác" : "Đề bạt thăng tiến"}</span></div>
                  <div><strong>Bộ phận hiện tại:</strong> {details.currentRole}</div>
                  {details.targetDepartment && <div><strong>Bộ phận đề xuất:</strong> {details.targetDepartment}</div>}
                  {details.proposedRole && <div><strong>Vị trí đề xuất:</strong> <span className="text-primary fw-bold ms-1">{details.proposedRole}</span></div>}
                </div>
                {selectedRequest.reason && (
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Lý do đề bạt / thuyên chuyển</div>
                    <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {selectedRequest.reason.split("\nLý do chi tiết:\n")[1] || selectedRequest.reason}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // 11. Điều chỉnh lương
          if (typeKey === "salary-adjustment") {
            return (
              <div className="d-flex flex-column gap-3">
                <div className="p-3 bg-light rounded-3 border d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                  <div><strong>Nhân viên:</strong> {details.employee}</div>
                  <div><strong>Loại điều chỉnh:</strong> {details.adjustmentType}</div>
                  <div><strong>Lương hiện tại:</strong> {details.currentSalary}</div>
                  <div><strong>Lương đề xuất mới:</strong> <span className="text-danger fw-bold ms-1">{details.proposedSalary}</span></div>
                </div>
                {selectedRequest.reason && (
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Lý do điều chỉnh</div>
                    <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {selectedRequest.reason.split("\nLý do chi tiết:\n")[1] || selectedRequest.reason}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Mặc định
          return (
            <div className="p-3 bg-light rounded-3 border">
              <div className="text-muted fw-semibold text-uppercase mb-1" style={{ fontSize: 11 }}>Nội dung chi tiết</div>
              <div className="text-dark" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {selectedRequest.reason || "Không có nội dung chi tiết."}
              </div>
            </div>
          );
        };

        return (
          <div 
            className="offcanvas offcanvas-end show border-0 shadow-lg d-flex flex-column" 
            style={{ 
              visibility: "visible", 
              width: 400,
              maxWidth: "100%",
              zIndex: 1050,
              boxShadow: "-10px 0 30px rgba(0,0,0,0.12)"
            }}
          >
            {/* Header */}
            <div className="offcanvas-header border-bottom px-4 py-3 flex-shrink-0 d-flex align-items-center justify-content-between bg-white">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h6 className="offcanvas-title fw-bold mb-0 text-dark" style={{ fontSize: 16 }}>Chi tiết yêu cầu</h6>
                  <span 
                    className="font-monospace fw-bold"
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    {selectedRequest.id}
                  </span>
                </div>
                <div className="text-muted" style={{ fontSize: 11.5 }}>
                  Gửi lúc: {new Date(selectedRequest.createdAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}
                </div>
              </div>
              <button type="button" className="btn-close shadow-none" onClick={() => setSelectedRequest(null)} />
            </div>

            {/* Tab chuyển đổi giữa Chi tiết đề xuất & Trao đổi công việc */}
            <div style={{ display: "flex", background: "#f1f5f9", padding: "4px", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
              <button
                type="button"
                onClick={() => setHrOffcanvasTab("detail")}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: hrOffcanvasTab === "detail" ? "#ffffff" : "transparent",
                  color: hrOffcanvasTab === "detail" ? "#0f172a" : "#64748b",
                  boxShadow: hrOffcanvasTab === "detail" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Thông tin đề xuất
              </button>
              <button
                type="button"
                onClick={() => setHrOffcanvasTab("comments")}
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: hrOffcanvasTab === "comments" ? "#ffffff" : "transparent",
                  color: hrOffcanvasTab === "comments" ? "#0f172a" : "#64748b",
                  boxShadow: hrOffcanvasTab === "comments" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>Trao đổi</span>
                {hrComments.length > 0 && (
                  <span className="badge rounded-pill bg-danger" style={{ fontSize: 10, padding: "2px 6px" }}>
                    {hrComments.length}
                  </span>
                )}
              </button>
            </div>

            {/* Body */}
            {hrOffcanvasTab === "detail" ? (
              <>
                <div className="offcanvas-body px-4" style={{ overflowY: "auto", overflowX: "hidden", paddingBottom: "90px" }}>
                  {/* Employee Card & Status */}
                  <div className="d-flex align-items-center justify-content-between p-3 rounded-3 mb-3 bg-light border">
                    <div className="d-flex align-items-center gap-2.5">
                      <EmployeeAvatar name={selectedRequest.employee.fullName} url={selectedRequest.employee.avatarUrl} size={44} />
                      <div>
                        <div className="d-flex align-items-center gap-1.5">
                          <span className="fw-bold text-dark" style={{ fontSize: 14 }}>{selectedRequest.employee.fullName}</span>
                          {selectedRequest.employeeId === currentUserId && (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: 10, padding: "1px 5px" }}>Tôi</span>
                          )}
                        </div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {getPositionName(selectedRequest.employee.position)} • {selectedRequest.employee.departmentName}
                        </div>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge()}
                    </div>
                  </div>

                  {/* Loại đề xuất pill */}
                  <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                    <span className="text-muted fw-semibold" style={{ fontSize: 12 }}>Loại đề xuất:</span>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold" style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6 }}>
                      {TYPE_MAP[typeKey]?.label || selectedRequest.type}
                    </span>
                  </div>

                  {/* Tùy biến nội dung cho từng loại đề xuất */}
                  {renderTypeSpecificContent()}
                </div>

                <div className="offcanvas-footer p-3 border-top bg-white d-flex align-items-center gap-2 position-absolute bottom-0 w-100">
                  {/* Nút Xoá (icon only) */}
                  <button 
                    type="button"
                    className="btn btn-outline-danger p-0 d-flex align-items-center justify-content-center flex-shrink-0" 
                    style={{ width: 42, height: 40, borderRadius: 8 }}
                    title="Xoá đề xuất"
                    onClick={() => setDeleteConfirm({ open: true, id: selectedRequest.id })}
                  >
                    <i className="bi bi-trash3 fs-5"></i>
                  </button>

                  {activeTabId === "pending" && selectedRequest.status.toUpperCase() === "PENDING" && !selectedRequest.hrApproved ? (
                    <>
                      {/* Nút Từ chối (icon only) */}
                      <button 
                        type="button"
                        className="btn btn-outline-danger p-0 d-flex align-items-center justify-content-center flex-shrink-0 bg-danger-subtle bg-opacity-25" 
                        style={{ width: 42, height: 40, borderRadius: 8, borderColor: "#fca5a5" }}
                        title="Từ chối đề xuất"
                        onClick={() => setRejectionModal({ open: true, id: selectedRequest.id })}
                      >
                        <i className="bi bi-x-lg fs-5 text-danger"></i>
                      </button>

                      {/* Nút Trình lãnh đạo */}
                      <BrandButton 
                        icon="bi-send" 
                        variant="outline"
                        className="flex-grow-1" 
                        style={{ height: 40 }}
                        onClick={() => handleAction(selectedRequest.id, "FORWARD_DIRECTOR")}
                        loading={actionLoading}
                      >
                        Trình lãnh đạo
                      </BrandButton>

                      {/* Nút Duyệt (icon only) */}
                      <button 
                        type="button"
                        className="btn btn-primary p-0 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm" 
                        style={{ width: 42, height: 40, borderRadius: 8, backgroundColor: "#0284c7", borderColor: "#0284c7" }}
                        title="Phê duyệt"
                        onClick={() => handleAction(selectedRequest.id, "APPROVE")}
                        disabled={actionLoading}
                      >
                        <i className="bi bi-check-lg fs-4 text-white"></i>
                      </button>
                    </>
                  ) : (
                    <button 
                      type="button" 
                      className="btn btn-light border flex-grow-1" 
                      style={{ height: 40, borderRadius: 8 }}
                      onClick={() => setSelectedRequest(null)}
                    >
                      Đóng
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* ── TAB TRAO ĐỔI CÔNG VIỆC ── */
              <div style={{ display: "flex", flexDirection: "column", height: "calc(100% - 95px)", background: "#f2f3f5" }}>
                {/* Danh sách tin nhắn thread */}
                <div
                  ref={hrChatScrollRef}
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: "14px 16px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {(() => {
                    const userComments = hrComments.filter(
                      (c: any) => !c.isSystem && !c.content.includes("đã trình Ban Giám đốc")
                    );

                    if (userComments.length === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: "80px 20px", color: "#94a3b8" }}>
                          <i
                            className="bi bi-chat-dots"
                            style={{ fontSize: 38, opacity: 0.45, display: "block", marginBottom: 12, color: "#6366f1" }}
                          />
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
                            Chưa có trao đổi nào trong đề xuất này
                          </div>
                          <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4, maxWidth: 280, margin: "4px auto 0" }}>
                            Ban Giám đốc, Trưởng phòng Nhân sự và Người đề xuất có thể trao đổi trực tiếp tại đây.
                          </div>
                        </div>
                      );
                    }

                    let lastDate = "";
                    return userComments.map((msg: any, idx: number) => {
                      const dateStr = new Date(msg.createdAt).toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                      const showDate = dateStr !== lastDate;
                      lastDate = dateStr;

                      const isSentByMe =
                        msg.authorId === currentUserId ||
                        (Boolean(session?.user?.name) && msg.authorName === session?.user?.name);

                      const [clr, bg] = avatarColor(msg.authorName);
                      const roleBadge = getRoleBadge(msg.authorRole, msg.authorName);

                      return (
                        <React.Fragment key={msg.id || idx}>
                          {showDate && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "#888",
                                textAlign: "center",
                                margin: "10px 0 6px",
                                fontWeight: 600,
                              }}
                            >
                              {dateStr}
                            </div>
                          )}

                          <div style={{ marginBottom: 4 }}>
                            {!isSentByMe && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  marginLeft: 32,
                                  marginBottom: 3,
                                }}
                              >
                                <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>
                                  {msg.authorName}
                                </span>
                                {roleBadge && (
                                  <span
                                    style={{
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                      background: roleBadge.bg,
                                      color: roleBadge.color,
                                    }}
                                  >
                                    {roleBadge.label}
                                  </span>
                                )}
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-end",
                                gap: 6,
                                justifyContent: isSentByMe ? "flex-end" : "flex-start",
                              }}
                            >
                              {!isSentByMe ? (
                                <div
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    flexShrink: 0,
                                    background: bg,
                                    color: clr,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                  }}
                                >
                                  {getInitials(msg.authorName)}
                                </div>
                              ) : null}

                              <div
                                style={{
                                  maxWidth: "76%",
                                  padding: "7px 11px",
                                  borderRadius: 6,
                                  background: isSentByMe ? "#d6e9ff" : "#ffffff",
                                  color: "#1a1a2e",
                                  fontSize: 13.5,
                                  lineHeight: 1.55,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  border: isSentByMe ? "1px solid #b8d4f8" : "1px solid #e0e0e0",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                                }}
                              >
                                {msg.content}
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: 10,
                                color: "#94a3b8",
                                marginTop: 2,
                                textAlign: isSentByMe ? "right" : "left",
                                paddingLeft: isSentByMe ? 0 : 32,
                                paddingRight: isSentByMe ? 2 : 0,
                              }}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {isSentByMe && (
                                <i className="bi bi-check2" style={{ marginLeft: 3, color: "#3b82f6" }} />
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>

                {/* Input bar */}
                <div
                  style={{
                    flexShrink: 0,
                    background: "#ffffff",
                    borderTop: "1px solid #e2e8f0",
                    padding: "8px 12px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập nội dung trao đổi... (Nhấn Enter để gửi)"
                    value={hrCommentInput}
                    onChange={(e) => setHrCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleHrSendComment();
                      }
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 20,
                      padding: "7px 14px",
                      fontSize: 13,
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleHrSendComment}
                    disabled={!hrCommentInput.trim() || hrSubmittingComment}
                    title="Gửi trao đổi"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      border: "none",
                      background: hrCommentInput.trim()
                        ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                        : "#e2e8f0",
                      color: hrCommentInput.trim() ? "#ffffff" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: hrCommentInput.trim() ? "pointer" : "default",
                      transition: "all 0.15s ease",
                      flexShrink: 0,
                    }}
                  >
                    {hrSubmittingComment ? (
                      <span className="spinner-border spinner-border-sm" style={{ width: 13, height: 13 }} />
                    ) : (
                      <i className="bi bi-send-fill" style={{ fontSize: 12, transform: "translateX(1px)" }} />
                    )}
                  </button>
                </div>
              </div>
            )}
        </div>
      );
    })()}
      {selectedRequest && <div className="offcanvas-backdrop fade show" onClick={() => setSelectedRequest(null)} />}

      <style jsx global>{`
        .bg-light-subtle { background-color: #f8fafc !important; }
        .hover-bg-light:hover { background-color: #f8fafc !important; }
        .transition-all { transition: all 0.2s ease-in-out; }
        .cursor-not-allowed { cursor: not-allowed !important; }
        .offcanvas.show { z-index: 1050; }
        .offcanvas-backdrop.show { z-index: 1040; }
        .offcanvas-body {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .offcanvas-body::-webkit-scrollbar {
          width: 5px;
        }
        .offcanvas-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .offcanvas-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .offcanvas-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </StandardPage>
  );
}
