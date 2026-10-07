"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { TablePagination } from "@/components/ui/TablePagination";
import { PersonalRequestOffcanvas } from "./PersonalRequestOffcanvas";
import { PersonalRequestDetailOffcanvas } from "./PersonalRequestDetailOffcanvas";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialogModal } from "@/components/ui/ConfirmDialog";

// ── Cấu hình 4 loại yêu cầu cốt lõi ──────────────────────────────────────────
const REQUEST_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  "leave": {
    label: "Nghỉ phép",
    icon: "bi-calendar-check",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fde68a"
  },
  "sick-leave": {
    label: "Nghỉ ốm",
    icon: "bi-heart-pulse",
    color: "#db2777",
    bg: "#fce7f3",
    border: "#fbcfe8"
  },
  "salary-advance": {
    label: "Tạm ứng lương",
    icon: "bi-cash-coin",
    color: "#0284c7",
    bg: "#e0f2fe",
    border: "#bae6fd"
  },
  "advance-refund": {
    label: "Tạm ứng / Hoàn ứng",
    icon: "bi-receipt-cutoff",
    color: "#7c3aed",
    bg: "#ede9fe",
    border: "#ddd6fe"
  },
  "late-early": {
    label: "Đi muộn / Về sớm",
    icon: "bi-clock-history",
    color: "#f59e0b",
    bg: "#fef3c7",
    border: "#fde68a"
  },
  "late": {
    label: "Đi muộn",
    icon: "bi-clock-history",
    color: "#f59e0b",
    bg: "#fef3c7",
    border: "#fde68a"
  },
  "early": {
    label: "Về sớm",
    icon: "bi-box-arrow-right",
    color: "#ea580c",
    bg: "#ffedd5",
    border: "#fed7aa"
  },
  "overtime": {
    label: "Làm thêm giờ",
    icon: "bi-stopwatch",
    color: "#059669",
    bg: "#d1fae5",
    border: "#a7f3d0"
  },
};

// ── Cấu hình trạng thái phê duyệt ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "pending": { label: "Chờ duyệt", color: "#d97706", bg: "#fef3c7", border: "#fde68a" },
  "approved": { label: "Đã duyệt", color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
  "paid": { label: "Đã chi tiền", color: "#6366f1", bg: "#e0e7ff", border: "#c7d2fe" },
  "settled": { label: "Đã quyết toán", color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe" },
  "rejected": { label: "Từ chối", color: "#dc2626", bg: "#fee2e2", border: "#fecaca" },
};

// ── Làm sạch lý do hiển thị, bỏ tiền tố [nghỉ ốm], đi muộn... ──────────────
function cleanDisplayReason(rawReason?: string, details?: any): string {
  if (details?.reason && typeof details.reason === "string" && details.reason.trim()) {
    return details.reason.trim();
  }
  if (details?.purpose && typeof details.purpose === "string" && details.purpose.trim()) {
    return details.purpose.trim();
  }
  let text = rawReason || "";
  if (!text) return "Không có lý do chi tiết";

  // Bỏ tiền tố có dạng "...]: "
  if (text.includes("]:")) {
    const after = text.substring(text.indexOf("]:") + 2).trim();
    if (after) return after;
  }

  // Bỏ [Nghỉ ốm] ở đầu chuỗi
  text = text.replace(/^\[[^\]]*\]\s*/, "");
  // Bỏ các tiền tố như "Đi muộn:", "Về sớm:", "Tạm ứng:", "Hoàn tạm ứng:", "Nghỉ phép:", "Nghỉ ốm:", "Làm thêm giờ:"
  text = text.replace(/^(Đi muộn|Về sớm|Tạm ứng|Hoàn tạm ứng|Nghỉ phép|Nghỉ ốm|Làm thêm giờ|Phép năm|Nghỉ việc riêng|Nghỉ không lương)\s*:\s*/i, "");
  text = text.replace(/^\[[^\]]*\]\s*/, "");

  return text.trim() || "Không có lý do chi tiết";
}

export function LeaveRequest() {
  const { success: toastSuccess } = useToast();
  const searchParams = useSearchParams();
  const paramRequestId = searchParams.get("requestId") || searchParams.get("id");
  const paramTab = searchParams.get("tab");

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Chọn nhiều dòng & Xoá hàng loạt
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Menu tạo mới & Offcanvas
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [activeFormType, setActiveFormType] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);

  // Offcanvas xem chi tiết & trao đổi của nhân viên
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<"detail" | "comments">("detail");

  const createMenuRef = useRef<HTMLDivElement>(null);

  // Tự động mở đơn và tab trao đổi khi truy cập từ thông báo
  useEffect(() => {
    if (paramRequestId) {
      if (requests.length > 0) {
        const found = requests.find((r) => r.id === paramRequestId);
        if (found) {
          setSelectedDetailRequest(found);
          if (paramTab === "comments") setDetailTab("comments");
          return;
        }
      }
      fetch(`/api/hr/approvals/${paramRequestId}`)
        .then(async (r) => {
          if (!r.ok) return null;
          const text = await r.text();
          return text ? JSON.parse(text) : null;
        })
        .then((d) => {
          if (d?.data) {
            setSelectedDetailRequest(d.data);
            if (paramTab === "comments") setDetailTab("comments");
          }
        })
        .catch(console.error);
    }
  }, [paramRequestId, paramTab, requests]);

  // Đóng dropdown tạo mới khi click ra ngoài hoặc khi offcanvas mở
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOffcanvasOpen) {
      setIsCreateMenuOpen(false);
    }
  }, [isOffcanvasOpen]);

  // Lấy dữ liệu danh sách yêu cầu
  const fetchRequests = () => {
    setLoading(true);
    fetch("/api/my/requests")
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // 4 loại yêu cầu cho menu tạo mới
  const creationOptions = [
    {
      id: "salary-advance",
      title: "Tạm ứng lương",
      desc: "Đề nghị tạm ứng lương tháng làm việc theo hạn mức quy định",
      icon: "bi-cash-coin",
      color: "#0284c7",
      bg: "#e0f2fe"
    },
    {
      id: "advance-refund",
      title: "Tạm ứng và hoàn tạm ứng",
      desc: "Tạm ứng kinh phí công tác, mua sắm hoặc hoàn ứng quyết toán chi phí",
      icon: "bi-receipt-cutoff",
      color: "#7c3aed",
      bg: "#ede9fe"
    },
    {
      id: "leave",
      title: "Xin nghỉ phép",
      desc: "Đăng ký nghỉ phép năm, việc riêng có lương hoặc nghỉ không lương",
      icon: "bi-calendar-check",
      color: "#d97706",
      bg: "#fef3c7"
    },
    {
      id: "sick-leave",
      title: "Xin nghỉ ốm",
      desc: "Đăng ký nghỉ ốm hưởng BHXH, khám chữa bệnh theo giấy C65-HD",
      icon: "bi-heart-pulse",
      color: "#db2777",
      bg: "#fce7f3"
    },
    {
      id: "late-early",
      title: "Đăng ký đi muộn về sớm",
      desc: "Đăng ký đi muộn hoặc về sớm vì lý do cá nhân, công việc",
      icon: "bi-clock-history",
      color: "#f59e0b",
      bg: "#fef3c7"
    },
    {
      id: "overtime",
      title: "Đăng ký làm thêm giờ",
      desc: "Đăng ký làm thêm giờ (OT) ngày thường, cuối tuần hoặc ngày lễ",
      icon: "bi-stopwatch",
      color: "#059669",
      bg: "#d1fae5"
    },
  ];

  const getRequestFormType = (req: any): string => {
    const typeKey = (req.type || "").toLowerCase();
    const details = typeof req.details === "string" ? JSON.parse(req.details || "{}") : (req.details || {});

    if (typeKey === "salary-advance" || details.category === "salary_advance") return "salary-advance";
    if (typeKey === "advance-refund" || details.category === "advance_refund") return "advance-refund";
    if (typeKey === "sick-leave" || details.category === "sick_leave") return "sick-leave";
    if (typeKey === "late" || typeKey === "early" || typeKey === "late-early" || details.category === "late_early") return "late-early";
    if (typeKey === "overtime" || details.category === "overtime") return "overtime";
    return "leave";
  };

  const handleOpenCreateForm = (formType: string) => {
    setIsCreateMenuOpen(false);
    setEditingRequest(null);
    setActiveFormType(formType);
    setIsOffcanvasOpen(true);
  };

  const handleEditRequest = (req: any) => {
    const formType = getRequestFormType(req);
    setEditingRequest(req);
    setActiveFormType(formType);
    setIsOffcanvasOpen(true);
  };

  // Lọc dữ liệu
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // 1. Lọc theo loại yêu cầu
      if (selectedType !== "all") {
        const type = (req.type || "").toLowerCase();
        const details = typeof req.details === "string" ? JSON.parse(req.details || "{}") : (req.details || {});
        
        if (selectedType === "salary-advance") {
          if (type !== "salary-advance" && details.category !== "salary_advance") return false;
        } else if (selectedType === "advance-refund") {
          if (type !== "advance-refund" && details.category !== "advance_refund") return false;
        } else if (selectedType === "sick-leave") {
          if (type !== "sick-leave" && details.category !== "sick_leave") return false;
        } else if (selectedType === "late-early") {
          if (type !== "late" && type !== "early" && type !== "late-early" && details.category !== "late_early") return false;
        } else if (selectedType === "overtime") {
          if (type !== "overtime" && details.category !== "overtime") return false;
        } else if (selectedType === "leave") {
          if (type !== "leave" || details.category === "sick_leave") return false;
        }
      }

      // 2. Lọc theo trạng thái
      if (selectedStatus !== "all") {
        const status = (req.status || "").toLowerCase();
        if (status !== selectedStatus.toLowerCase()) return false;
      }

      // 3. Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (req.code || req.id || "").toLowerCase();
        const details = typeof req.details === "string" ? JSON.parse(req.details || "{}") : (req.details || {});
        const title = (details.title || details.financeType || details.leaveType || "").toLowerCase();
        const reason = (req.reason || details.reason || "").toLowerCase();
        const approver = (details.approverName || "").toLowerCase();

        return code.includes(q) || title.includes(q) || reason.includes(q) || approver.includes(q);
      }

      return true;
    });
  }, [requests, selectedType, selectedStatus, searchQuery]);

  // Phân trang
  const totalRecords = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Xử lý chọn dòng và xoá hàng loạt
  const isAllSelected = paginatedRequests.length > 0 && paginatedRequests.every(r => selectedIds.includes(r.id));
  const isSomeSelected = paginatedRequests.some(r => selectedIds.includes(r.id)) && !isAllSelected;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedRequests.map(r => r.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedRequests.map(r => r.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/my/requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể xoá yêu cầu");
      }
      toastSuccess("Thành công", `Đã xoá ${selectedIds.length} yêu cầu thành công.`);
      setSelectedIds([]);
      setIsDeleteDialogOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || "Lỗi khi xoá");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100 flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
      <FullWidthTableLayout
        className="bg-white rounded-4 shadow-sm border flex-grow-1 overflow-hidden"
        style={{ minHeight: 0 }}
        tableWrapperClassName="border-top flex-grow-1"
        header={
          <div className="row g-2 align-items-center py-1">
            {/* Dropdown 1: Loại yêu cầu */}
            <div className="col-12 col-sm-6 col-md-3">
              <select
                className="form-select shadow-none"
                style={{
                  borderRadius: "8px",
                  fontSize: "13px",
                  borderColor: "var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  padding: "6px 12px"
                }}
                value={selectedType}
                onChange={e => { setSelectedType(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">Tất cả loại yêu cầu</option>
                <option value="salary-advance">Tạm ứng lương</option>
                <option value="advance-refund">Tạm ứng và hoàn tạm ứng</option>
                <option value="leave">Xin nghỉ phép</option>
                <option value="sick-leave">Xin nghỉ ốm</option>
                <option value="late-early">Đăng ký đi muộn về sớm</option>
                <option value="overtime">Đăng ký làm thêm giờ</option>
              </select>
            </div>

            {/* Dropdown 2: Trạng thái */}
            <div className="col-12 col-sm-6 col-md-2">
              <select
                className="form-select shadow-none"
                style={{
                  borderRadius: "8px",
                  fontSize: "13px",
                  borderColor: "var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  padding: "6px 12px"
                }}
                value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="paid">Đã chi tiền</option>
                <option value="settled">Đã quyết toán</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>

            {/* Ô tìm kiếm */}
            <div className="col-12 col-md-4 flex-grow-1">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", padding: "6px 10px" }}>
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 shadow-none ps-0"
                  style={{
                    borderRadius: "0 8px 8px 0",
                    fontSize: "13px",
                    borderColor: "var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    padding: "6px 12px"
                  }}
                  placeholder="Tìm theo mã phiếu, nội dung, lý do, người duyệt..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            {/* Nút Xoá + Tạo yêu cầu mới */}
            <div className="col-12 col-md-auto d-flex align-items-center gap-2 justify-content-end position-relative" ref={createMenuRef}>
              {/* Nút Xoá: luôn hiển thị cạnh nút Tạo mới yêu cầu */}
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => setIsDeleteDialogOpen(true)}
                className={`btn d-flex align-items-center shadow-sm ${
                  selectedIds.length > 0 
                    ? "btn-outline-danger" 
                    : "btn-outline-secondary opacity-50"
                }`}
                style={{
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  height: "36px",
                  whiteSpace: "nowrap",
                  gap: "10px",
                  padding: "0 14px",
                  cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
                  borderColor: selectedIds.length > 0 ? undefined : "var(--border)",
                }}
              >
                <i className="bi bi-trash3" style={{ fontSize: "14px" }}></i>
                <span>Xoá</span>
                {selectedIds.length > 0 && (
                  <span
                    className="badge rounded-pill bg-danger text-white d-inline-flex align-items-center justify-content-center"
                    style={{
                      fontSize: "11px",
                      minWidth: "20px",
                      height: "20px",
                      padding: "0 6px",
                      fontWeight: 700,
                    }}
                  >
                    {selectedIds.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="btn d-flex align-items-center gap-2 px-3 py-1.5 text-white shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  whiteSpace: "nowrap",
                  height: "36px"
                }}
              >
                <i className="bi bi-plus-lg"></i>
                Tạo yêu cầu mới
              </button>

              {/* Menu thả xuống chọn 4 loại yêu cầu */}
              {isCreateMenuOpen && (
                <div 
                  className="position-absolute end-0 top-100 mt-1 shadow-lg rounded-4 p-2 bg-white border"
                  style={{ zIndex: 1050, width: "360px", borderColor: "var(--border)" }}
                >
                  <div className="px-2 py-1 mb-1 text-muted fw-bold small text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.05em" }}>
                    Chọn loại đơn cần tạo:
                  </div>
                  {creationOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCreateMenuOpen(false);
                        handleOpenCreateForm(opt.id);
                      }}
                      className="w-100 text-start border-0 bg-transparent p-2.5 rounded-3 d-flex align-items-center transition-all"
                      style={{ cursor: "pointer", transition: "all 0.15s", gap: "14px" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--muted)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div 
                        style={{
                          width: 38, height: 38, borderRadius: "10px",
                          background: opt.bg, color: opt.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "17px", flexShrink: 0,
                          pointerEvents: "none"
                        }}
                      >
                        <i className={`bi ${opt.icon}`}></i>
                      </div>
                      <div className="flex-grow-1" style={{ pointerEvents: "none" }}>
                        <div className="fw-bold text-dark small mb-0.5" style={{ fontSize: "13.5px", lineHeight: 1.3 }}>{opt.title}</div>
                        <div className="text-muted" style={{ fontSize: "11.5px", lineHeight: 1.35, whiteSpace: "normal" }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
        table={
          <table className="table table-hover align-middle mb-0" style={{ minWidth: "850px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border)" }}>
                <th style={{ width: "42px", padding: "8px 12px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    style={{ cursor: "pointer" }}
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", padding: "8px 12px" }}>
                  NỘI DUNG YÊU CẦU
                </th>
                <th style={{ width: "150px", fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", padding: "8px 12px" }}>
                  THỜI GIAN GỬI
                </th>
                <th style={{ width: "130px", fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", padding: "8px 12px", textAlign: "right" }}>
                  SỐ TIỀN VNĐ
                </th>
                <th style={{ width: "170px", fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", padding: "8px 12px" }}>
                  NGƯỜI PHÊ DUYỆT
                </th>
                <th style={{ width: "120px", fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", padding: "8px 12px", textAlign: "center" }}>
                  TRẠNG THÁI
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                    <div className="text-muted small">Đang tải dữ liệu yêu cầu...</div>
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-1 opacity-40"></i>
                    <p className="mb-0 small">Không tìm thấy yêu cầu nào phù hợp điều kiện lọc.</p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req, idx) => {
                  const stt = (currentPage - 1) * pageSize + idx + 1;
                  const typeKey = (req.type || "leave").toLowerCase();
                  const details = typeof req.details === "string" ? JSON.parse(req.details || "{}") : (req.details || {});
                  
                  // Xác định cấu hình loại yêu cầu
                  let typeCfg = REQUEST_TYPE_CONFIG[typeKey] || REQUEST_TYPE_CONFIG["leave"];
                  if (details.category === "sick_leave" || typeKey === "sick-leave") {
                    typeCfg = REQUEST_TYPE_CONFIG["sick-leave"];
                  } else if (details.category === "salary_advance" || typeKey === "salary-advance") {
                    typeCfg = REQUEST_TYPE_CONFIG["salary-advance"];
                  } else if (details.category === "advance_refund" || typeKey === "advance-refund") {
                    typeCfg = REQUEST_TYPE_CONFIG["advance-refund"];
                  } else if (details.category === "late_early" || typeKey === "late" || typeKey === "early" || typeKey === "late-early") {
                    typeCfg = REQUEST_TYPE_CONFIG[typeKey] || REQUEST_TYPE_CONFIG["late-early"];
                  } else if (details.category === "overtime" || typeKey === "overtime") {
                    typeCfg = REQUEST_TYPE_CONFIG["overtime"] || REQUEST_TYPE_CONFIG["leave"];
                  }

                  // Xác định tiêu đề hiển thị
                  const title = details.title || details.financeType || details.requestType || details.leaveType || (
                    typeKey === "salary-advance" ? "Tạm ứng tiền lương" :
                    typeKey === "advance-refund" ? "Tạm ứng / Hoàn tạm ứng kinh phí" :
                    typeKey === "sick-leave" ? "Nghỉ ốm hưởng BHXH" :
                    (typeKey === "late" || typeKey === "early" || typeKey === "late-early") ? "Đi muộn / Về sớm" :
                    typeKey === "overtime" ? `Làm thêm giờ (${details.totalHours || req.totalHours || 2}h)` :
                    "Nghỉ phép cá nhân"
                  );

                  // Số tiền nếu có
                  const amount = details.amount || (req.amount ? Number(req.amount) : null);
                  const isRefund = details.subType === "Hoàn tạm ứng / Quyết toán";

                  // Người phê duyệt
                  const approverName = req.approver?.name || details.approverName || "";
                  const approverRole = details.approverRole || (approverName ? "Người phê duyệt" : "");

                  // Trạng thái
                  const statusKey = (req.status || "pending").toLowerCase();
                  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG["pending"];

                  return (
                    <tr 
                      key={req.id} 
                      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                      onClick={() => {
                        setSelectedDetailRequest(req);
                        setDetailTab("detail");
                      }}
                      title="Nhấn vào dòng để xem chi tiết và trao đổi"
                    >
                      {/* Checkbox chọn */}
                      <td 
                        style={{ textAlign: "center", padding: "8px 12px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          style={{ cursor: "pointer" }}
                          checked={selectedIds.includes(req.id)}
                          onChange={() => handleToggleSelect(req.id)}
                        />
                      </td>

                      {/* NỘI DUNG YÊU CẦU */}
                      <td style={{ padding: "8px 12px" }}>
                        <div className="d-flex flex-column gap-0.5">
                          {/* Hàng 1: Badge Mã phiếu + Badge Loại yêu cầu */}
                          <div className="d-flex align-items-center gap-1.5">
                            <span 
                              className="font-monospace fw-bold"
                              style={{
                                fontSize: "10.5px",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: "#f1f5f9",
                                color: "#334155",
                                border: "1px solid #e2e8f0",
                                lineHeight: 1.2
                              }}
                            >
                              {req.id}
                            </span>
                            <span 
                              className="d-inline-flex align-items-center fw-semibold"
                              style={{
                                gap: "6px",
                                fontSize: "10.5px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: typeCfg.bg,
                                color: typeCfg.color,
                                border: `1px solid ${typeCfg.border}`,
                                lineHeight: 1.2
                              }}
                            >
                              <i className={`bi ${typeCfg.icon}`} style={{ fontSize: "11px" }}></i>
                              <span>{typeCfg.label}</span>
                            </span>
                          </div>

                          {/* Hàng 2: Tiêu đề yêu cầu in đậm */}
                          <div className="fw-semibold text-dark" style={{ fontSize: "13px", lineHeight: 1.25 }}>
                            {title}
                          </div>

                          {/* Hàng 3: Lý do chi tiết */}
                          <div className="text-muted" style={{ fontSize: "11px", lineHeight: 1.3 }}>
                            {cleanDisplayReason(req.reason, details)}
                          </div>
                        </div>
                      </td>

                      {/* THỜI GIAN GỬI */}
                      <td style={{ fontSize: "12px", color: "var(--muted-foreground)", padding: "8px 12px", whiteSpace: "nowrap" }}>
                        {req.createdAt ? format(new Date(req.createdAt), "dd/MM/yyyy HH:mm") : "—"}
                      </td>

                      {/* SỐ TIỀN VNĐ */}
                      <td style={{ textAlign: "right", padding: "8px 12px" }}>
                        {amount ? (
                          <span 
                            className="fw-bold font-monospace" 
                            style={{ 
                              fontSize: "13px", 
                              color: isRefund ? "#16a34a" : "var(--foreground)" 
                            }}
                          >
                            {Number(amount).toLocaleString("vi-VN")}
                          </span>
                        ) : (
                          <span className="text-muted" style={{ opacity: 0.5 }}>—</span>
                        )}
                      </td>

                      {/* NGƯỜI PHÊ DUYỆT */}
                      <td style={{ padding: "8px 12px" }}>
                        {approverName ? (
                          <div className="d-flex flex-column gap-0.5">
                            <span className="fw-semibold text-dark" style={{ fontSize: "12.5px", lineHeight: 1.2 }}>
                              {approverName}
                            </span>
                            {approverRole && (
                              <span className="text-muted" style={{ fontSize: "11px", lineHeight: 1.2 }}>
                                {approverRole}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted" style={{ opacity: 0.5 }}>—</span>
                        )}
                      </td>

                      {/* TRẠNG THÁI */}
                      <td style={{ textAlign: "center", padding: "8px 12px" }}>
                        <span
                          className="d-inline-block fw-bold"
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "99px",
                            color: statusCfg.color,
                            background: statusCfg.bg,
                            border: `1px solid ${statusCfg.border}`,
                            whiteSpace: "nowrap",
                            lineHeight: 1.2
                          }}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        }
        footer={
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalRecords}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
            itemName="bản ghi"
          />
        }
        footerClassName="justify-content-between px-3 px-md-4 py-2 border-top bg-white"
        footerStyle={{ backgroundColor: "#ffffff" }}
      />

      {/* ── OFFCANVAS XEM CHI TIẾT & TRAO ĐỔI CỦA NHÂN VIÊN ── */}
      <PersonalRequestDetailOffcanvas
        isOpen={Boolean(selectedDetailRequest)}
        onClose={() => setSelectedDetailRequest(null)}
        request={selectedDetailRequest}
        initialTab={detailTab}
        onEdit={(req) => {
          setSelectedDetailRequest(null);
          handleEditRequest(req);
        }}
        onDelete={(id) => {
          setSelectedIds([id]);
          setSelectedDetailRequest(null);
          setIsDeleteDialogOpen(true);
        }}
      />

      {/* ── OFFCANVAS TẠO / CHỈNH SỬA ĐƠN ── */}
      <PersonalRequestOffcanvas 
        isOpen={isOffcanvasOpen}
        onClose={() => {
          setIsOffcanvasOpen(false);
          setIsCreateMenuOpen(false);
          setEditingRequest(null);
        }}
        type={activeFormType}
        initialData={editingRequest}
        onSuccess={() => {
          fetchRequests();
        }}
      />

      {/* ── MODAL XÁC NHẬN XOÁ YÊU CẦU ── */}
      <ConfirmDialogModal
        open={isDeleteDialogOpen}
        title="Xác nhận xoá yêu cầu"
        message={
          <div>
            <div>Bạn có chắc chắn muốn xoá <strong>{selectedIds.length}</strong> yêu cầu đã chọn khỏi cơ sở dữ liệu không?</div>
            <div className="small text-danger mt-1">Lưu ý: Dữ liệu đã xoá sẽ không thể khôi phục.</div>
          </div>
        }
        confirmLabel={`Xoá ${selectedIds.length} yêu cầu`}
        cancelLabel="Huỷ bỏ"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDeleteSelected}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
