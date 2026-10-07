"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Table, TableColumn } from "@/components/ui/Table";
import { TablePagination } from "@/components/ui/TablePagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { useToast } from "@/components/ui/Toast";

// ── Types ─────────────────────────────────────────────────────────────────────
export type ApprovalStatus = "pending" | "approved" | "rejected" | "on_hold" | "recalled";
export type ApprovalPriority = "normal" | "urgent" | "high";

export interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  entityCode?: string | null;
  entityTitle: string;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  department?: string | null;
  requestedById: string;
  requestedByName: string;
  approverId?: string | null;
  approverName?: string | null;
  metadata?: string | null;
  rejectionReason?: string | null;
  onHoldReason?: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
}

export interface ApprovalComment {
  id: string;
  approvalRequestId: string;
  authorId: string;
  authorName: string;
  authorRole?: string | null;
  content: string;
  parentId?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalCenterProps {
  mode?: "page" | "drawer";
  isOpen?: boolean;
  onClose?: () => void;
  entityFilter?: string;
  entityId?: string;
  defaultView?: "inbox" | "mine";
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

// ── Entity Configs ─────────────────────────────────────────────────────────────
const ENTITY_TYPE_LABELS: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  PERSONAL_REQUEST: { label: "Yêu cầu cá nhân", icon: "bi-person-badge-fill", color: "#6366f1", bg: "#eef2ff" },
  PRODUCTION_REQUEST: { label: "Yêu cầu sản xuất", icon: "bi-tools", color: "#2563eb", bg: "#eff6ff" },
  purchase_order: { label: "Đơn mua hàng", icon: "bi-cart-check-fill", color: "#059669", bg: "#ecfdf5" },
  expense: { label: "Chi phí", icon: "bi-receipt", color: "#d97706", bg: "#fffbeb" },
  PAYROLL: { label: "Bảng lương", icon: "bi-cash-stack", color: "#8b5cf6", bg: "#f5f3ff" },
  leave_request: { label: "Nghỉ phép", icon: "bi-calendar-x", color: "#7c3aed", bg: "#f5f3ff" },
  PROMOTION: { label: "Đề bạt", icon: "bi-arrow-up-right-circle-fill", color: "#e11d48", bg: "#fff1f2" },
  TRANSFER: { label: "Điều chuyển", icon: "bi-arrow-left-right", color: "#0284c7", bg: "#f0f9ff" },
  SALARY_ADJUSTMENT: { label: "Điều chỉnh lương", icon: "bi-cash-coin", color: "#9333ea", bg: "#faf5ff" },
  STATIONERY_PURCHASE: { label: "Mua VPP (KT duyệt)", icon: "bi-cart-fill", color: "#3b82f6", bg: "#eff6ff" },
  STATIONERY_PURCHASE_DIRECTOR: { label: "Mua VPP (GĐ duyệt)", icon: "bi-cart-check-fill", color: "#10b981", bg: "#ecfdf5" },
  marketing_proposal: { label: "Đề xuất CP MKT", icon: "bi-file-earmark-bar-graph", color: "#8b5cf6", bg: "#f5f3ff" },
  marketing_monthly_plan: { label: "Kế hoạch MKT tháng", icon: "bi-calendar3", color: "#3b82f6", bg: "#eff6ff" },
  marketing_yearly_plan: { label: "KH Marketing Năm", icon: "bi-calendar2-range", color: "#dc2626", bg: "#fef2f2" },
  master_yearly_plan: { label: "KH MKT Tổng thể", icon: "bi-calendar2-range", color: "#dc2626", bg: "#fef2f2" },
  RECRUITMENT: { label: "Tuyển dụng", icon: "bi-person-plus-fill", color: "#059669", bg: "#ecfdf5" },
  RECRUITMENT_REPORT: { label: "Báo cáo tuyển dụng", icon: "bi-file-earmark-person", color: "#0284c7", bg: "#f0f9ff" },
};

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "Chờ duyệt", color: "#d97706", bg: "#fffbeb", icon: "bi-hourglass-split" },
  approved: { label: "Đã duyệt", color: "#059669", bg: "#ecfdf5", icon: "bi-check-circle-fill" },
  rejected: { label: "Từ chối", color: "#dc2626", bg: "#fef2f2", icon: "bi-x-circle-fill" },
  on_hold: { label: "Tạm giữ", color: "#b45309", bg: "#fef3c7", icon: "bi-pause-circle-fill" },
  recalled: { label: "Thu hồi", color: "#64748b", bg: "#f1f5f9", icon: "bi-arrow-counterclockwise" },
};

const PRIORITY_CONFIG: Record<ApprovalPriority, { label: string; color: string; bg: string }> = {
  normal: { label: "Bình thường", color: "#64748b", bg: "#f1f5f9" },
  high: { label: "Cao", color: "#d97706", bg: "#fffbeb" },
  urgent: { label: "Khẩn", color: "#dc2626", bg: "#fef2f2" },
};

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Vừa xong";
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} ngày trước`;
    return new Date(dateStr).toLocaleDateString("vi-VN");
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  if (!name) return "NV";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isRequestNew(item: ApprovalRequest): boolean {
  if (item.status !== "pending") return false;
  return Date.now() - new Date(item.createdAt).getTime() < 48 * 3600 * 1000;
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export function ApprovalCenter({
  mode = "page",
  isOpen = false,
  onClose,
  entityFilter,
  entityId: defaultEntityId,
  defaultView = "inbox",
  onApprove,
  onReject,
}: ApprovalCenterProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const queryId = searchParams?.get("id") || defaultEntityId;
  const toast = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [view, setView] = useState<"inbox" | "mine">(defaultView);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedEntityType, setSelectedEntityType] = useState(entityFilter || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Offcanvas state
  const [selectedItem, setSelectedItem] = useState<ApprovalRequest | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Comments state in Offcanvas
  const [comments, setComments] = useState<ApprovalComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Action modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Copy state
  const [copiedBank, setCopiedBank] = useState(false);

  const currentUserId = (session?.user as any)?.id || "";

  // Debounce search term để tránh spam API
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Fetch danh sách ───────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view,
        page: String(page),
        limit: String(pageSize),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (selectedEntityType) params.set("entityType", selectedEntityType);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/approvals?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
        setTotal(data.total || 0);

        // Sync selectedItem nếu đang mở mà không tạo loop
        setSelectedItem((prev) => {
          if (!prev) return null;
          const fresh = (data.data || []).find((i: ApprovalRequest) => i.id === prev.id);
          if (fresh && fresh.status !== prev.status) {
            return fresh;
          }
          return prev;
        });
      }
    } catch (e) {
      console.error("loadItems error:", e);
    } finally {
      setLoading(false);
    }
  }, [view, statusFilter, selectedEntityType, debouncedSearch, page, pageSize]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Auto-select từ queryId
  useEffect(() => {
    if (queryId && items.length > 0) {
      setSelectedItem((prev) => {
        if (prev) return prev;
        return items.find((i) => i.id === queryId || i.entityId === queryId || i.entityCode === queryId) || null;
      });
    }
  }, [queryId, items]);

  // Load preview & comments khi selectedItem.id thay đổi
  const selectedItemId = selectedItem?.id;
  useEffect(() => {
    if (!selectedItemId) {
      setPreviewData(null);
      setComments([]);
      return;
    }

    let isEffectActive = true;
    const fetchDetail = async () => {
      setLoadingPreview(true);
      try {
        const [resPreview, resComments] = await Promise.all([
          fetch(`/api/approvals/${selectedItemId}/preview`),
          fetch(`/api/approvals/${selectedItemId}/comments`),
        ]);

        if (resPreview.ok && isEffectActive) {
          const pData = await resPreview.json();
          setPreviewData(pData);
        }

        if (resComments.ok && isEffectActive) {
          const cData = await resComments.json();
          if (cData.success) {
            setComments(cData.data || []);
          }
        }
      } catch (err) {
        console.error("Error fetching detail:", err);
      } finally {
        if (isEffectActive) setLoadingPreview(false);
      }
    };

    fetchDetail();
    return () => {
      isEffectActive = false;
    };
  }, [selectedItemId]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleAction = async (action: "approve" | "reject" | "on_hold" | "recall", noteOrReason?: string) => {
    if (!selectedItem) return;
    setActionLoading(action);
    try {
      const payload: any = { action };
      if (action === "reject") payload.rejectedReason = noteOrReason || "";
      if (action === "approve" && noteOrReason) payload.note = noteOrReason;

      const res = await fetch(`/api/approvals/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          "Thành công",
          action === "approve"
            ? "Đã phê duyệt yêu cầu thành công!"
            : action === "reject"
            ? "Đã từ chối yêu cầu."
            : action === "on_hold"
            ? "Đã chuyển sang trạng thái tạm giữ."
            : "Đã cập nhật trạng thái yêu cầu."
        );

        if (action === "approve" && onApprove) onApprove(selectedItem.id);
        if (action === "reject" && onReject) onReject(selectedItem.id);

        setShowRejectModal(false);
        setRejectReason("");
        setShowApproveModal(false);
        setApproveNote("");

        await loadItems();
        // Update local selectedItem
        setSelectedItem((prev) => (prev ? { ...prev, status: data.data.status } : null));
      } else {
        toast.error("Lỗi xử lý", data.error || "Không thể thực hiện thao tác");
      }
    } catch {
      toast.error("Lỗi hệ thống", "Vui lòng thử lại sau");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendComment = async () => {
    if (!selectedItem || !commentInput.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/approvals/${selectedItem.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setComments((prev) => [...prev, data.data]);
        setCommentInput("");
        toast.success("Thành công", "Đã gửi ý kiến trao đổi");
      }
    } catch {
      toast.error("Lỗi", "Không thể gửi bình luận");
    } finally {
      setSubmittingComment(false);
    }
  };

  // ── Columns Table ─────────────────────────────────────────────────────────────
  const columns: TableColumn<ApprovalRequest>[] = [
    {
      header: "STT",
      width: 50,
      align: "center",
      render: (_row, idx) => (
        <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>
          {(page - 1) * pageSize + idx + 1}
        </span>
      ),
    },
    {
      header: "Loại đề xuất",
      render: (row) => {
        const isNew = isRequestNew(row);
        const cfg = ENTITY_TYPE_LABELS[row.entityType] || {
          label: row.entityType,
          icon: "bi-file-earmark",
          color: "#64748b",
          bg: "#f1f5f9",
        };

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Hàng 1: Loại đề xuất + Mã yêu cầu + Badge MỚI */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: cfg.bg,
                  color: cfg.color,
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                <i className={`bi ${cfg.icon}`} />
                {cfg.label}
              </span>

              {isNew && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "1px 6px",
                    borderRadius: 99,
                    fontSize: 9.5,
                    fontWeight: 800,
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "#ffffff",
                    letterSpacing: "0.03em",
                    boxShadow: "0 2px 5px rgba(220, 38, 38, 0.35)",
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
                  MỚI
                </span>
              )}

              <span className="font-monospace text-muted" style={{ fontSize: 11 }}>
                ({row.entityCode || row.id})
              </span>
            </div>

            {/* Hàng 2: Tiêu đề, nội dung yêu cầu */}
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.4 }}>
              {row.entityTitle}
            </div>

            {/* Hàng 3: Đếm trao đổi nếu có */}
            {row.commentCount && row.commentCount > 0 ? (
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
                <i className="bi bi-chat-dots" /> {row.commentCount} trao đổi
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Người đề xuất",
      width: 190,
      render: (row) => (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)" }}>
            {row.requestedByName}
          </div>
          {row.department && (
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {row.department}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Thời gian gửi",
      width: 150,
      render: (row) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
            {new Date(row.createdAt).toLocaleDateString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            {timeAgo(row.createdAt)}
          </div>
        </div>
      ),
    },
    {
      header: "Ưu tiên",
      width: 100,
      align: "center",
      render: (row) => {
        const p = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.normal;
        return (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 6,
              background: p.bg,
              color: p.color,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {row.priority === "urgent" && "🔥 "}
            {p.label}
          </span>
        );
      },
    },
    {
      header: "Trạng thái",
      width: 120,
      align: "center",
      render: (row) => {
        const s = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending;
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 9px",
              borderRadius: 99,
              background: s.bg,
              color: s.color,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <i className={`bi ${s.icon}`} style={{ fontSize: 11 }} />
            {s.label}
          </span>
        );
      },
    },
  ];

  // ── Render Detail Body for Personal Request ──────────────────────────────────
  const renderPersonalRequestDetails = (pReq: any) => {
    const details = pReq.details || {};
    const emp = pReq.employee || {};

    const amount = Number(details.amount || 0);
    const days = Number(details.numberOfDays || pReq.totalDays || 0);
    const hours = Number(details.hours || pReq.totalHours || 0);
    const minutes = Number(details.minutes || 0);

    let bankName = details.bankName || "";
    let bankAccount = details.bankAccount || "";
    let bankAccountName = details.bankAccountName || emp.fullName || "";

    if (details.bankInfo && !bankAccount) {
      const raw = String(details.bankInfo).trim();
      const match = raw.match(/^(.*?)\s*-\s*([0-9A-Za-z]+)\s*\((.*?)\)$/);
      if (match) {
        bankName = match[1].trim();
        bankAccount = match[2].trim();
        bankAccountName = match[3].trim();
      } else {
        const matchNum = raw.match(/(\d{6,20})/);
        if (matchNum) bankAccount = matchNum[1];
        const matchName = raw.match(/\((.*?)\)/);
        if (matchName) bankAccountName = matchName[1];
      }
    }

    let shortBankName = bankName;
    if (bankName.includes(" - ")) {
      shortBankName = bankName.split(" - ")[0].trim();
    }

    const dateRangeStr =
      pReq.startDate && pReq.endDate
        ? `${new Date(pReq.startDate).toLocaleDateString("vi-VN")} — ${new Date(pReq.endDate).toLocaleDateString("vi-VN")}`
        : pReq.startDate
        ? new Date(pReq.startDate).toLocaleDateString("vi-VN")
        : null;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Hero Banner Chỉ số */}
        {amount > 0 ? (
          <div
            style={{
              background: "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)",
              border: "1.5px solid #fecaca",
              borderRadius: 14,
              padding: "14px 18px",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.08)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#dc2626", letterSpacing: "0.5px" }}>
              Số tiền đề xuất
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#b91c1c", margin: "2px 0" }}>
              {amount.toLocaleString("vi-VN")} đ
            </div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>
              Khấu trừ: <strong style={{ color: "#2563eb" }}>Tháng {details.salaryMonth || "Hiện tại"}</strong>
            </div>
          </div>
        ) : days > 0 ? (
          <div
            style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
              border: "1.5px solid #bfdbfe",
              borderRadius: 14,
              padding: "14px 18px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#2563eb", letterSpacing: "0.5px" }}>
              Thời gian xin nghỉ
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#1d4ed8", margin: "2px 0" }}>
              {days} ngày
            </div>
            {dateRangeStr && <div style={{ fontSize: 11.5, color: "#64748b" }}>{dateRangeStr}</div>}
          </div>
        ) : hours > 0 ? (
          <div
            style={{
              background: "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)",
              border: "1.5px solid #fde68a",
              borderRadius: 14,
              padding: "14px 18px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#d97706", letterSpacing: "0.5px" }}>
              Số giờ làm thêm (OT)
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#b45309", margin: "2px 0" }}>
              {hours} giờ
            </div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>{details.overtimeType || "Ngày thường"}</div>
          </div>
        ) : minutes > 0 ? (
          <div
            style={{
              background: "linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)",
              border: "1.5px solid #e9d5ff",
              borderRadius: 14,
              padding: "14px 18px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#9333ea", letterSpacing: "0.5px" }}>
              Thời lượng
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#7e22ce", margin: "2px 0" }}>
              {minutes} phút
            </div>
          </div>
        ) : null}

        {/* Thẻ Tài khoản ngân hàng VIP nếu có */}
        {(bankAccount || details.bankInfo) && (
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              borderRadius: 14,
              padding: "16px 18px",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bi bi-credit-card-2-front" style={{ fontSize: 16, color: "#38bdf8" }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "#94a3b8" }}>
                  Tài khoản nhận tiền
                </span>
              </div>
              {shortBankName && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "2px 8px", borderRadius: 99 }}>
                  {shortBankName}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "6px 0" }}>
              <div className="font-monospace" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "1.5px", color: "#f8fafc" }}>
                {bankAccount || details.bankInfo}
              </div>
              {bankAccount && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: copiedBank ? "rgba(34, 197, 94, 0.25)" : "rgba(255, 255, 255, 0.15)",
                    color: copiedBank ? "#4ade80" : "#ffffff",
                    border: "none",
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(bankAccount);
                    setCopiedBank(true);
                    setTimeout(() => setCopiedBank(false), 2000);
                  }}
                >
                  <i className={`bi ${copiedBank ? "bi-check2" : "bi-copy"}`} style={{ marginRight: 4 }} />
                  {copiedBank ? "Đã chép" : "Sao chép"}
                </button>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#f1f5f9" }}>
                {bankAccountName}
              </div>
            </div>
          </div>
        )}

        {/* Grid thông số mini */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 3 }}>
              Phân loại
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
              {pReq.loaiText || "Yêu cầu cá nhân"}
            </div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 3 }}>
              Hình thức nhận
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
              {details.paymentMethod || "Chuyển khoản"}
            </div>
          </div>
        </div>

        {/* Lý do đề xuất */}
        <div
          style={{
            background: "rgba(99, 102, 241, 0.03)",
            border: "1px solid rgba(99, 102, 241, 0.15)",
            borderLeft: "4px solid #6366f1",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <i className="bi bi-chat-left-quote-fill" /> Lý do đề xuất từ nhân viên
          </div>
          <div style={{ fontSize: 12.5, color: "#1e293b", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {pReq.reason || details.reason || "Không có lý do chi tiết."}
          </div>
        </div>

        {/* Ý kiến Nhân sự */}
        <div
          style={{
            background: "rgba(16, 185, 129, 0.03)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
            borderLeft: "4px solid #10b981",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <i className="bi bi-shield-check" /> Ý kiến thẩm định Phòng Nhân sự
          </div>
          <div style={{ fontSize: 12.5, color: "#1e293b", lineHeight: 1.5 }}>
            {pReq.hrNote || "Đã thẩm định và trình Ban Giám đốc phê duyệt."}
          </div>
        </div>
      </div>
    );
  };

  // ── Render Generic Details ───────────────────────────────────────────────────
  const renderGenericDetails = () => {
    if (!previewData) return null;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Tóm tắt summary */}
        {previewData.summary && previewData.summary.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {previewData.summary.map((s: any, idx: number) => (
              <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px", borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, textTransform: "uppercase", fontWeight: 700 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nội dung chi tiết */}
        {previewData.details && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "14px 16px",
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "#334155",
              whiteSpace: "pre-wrap",
            }}
          >
            {previewData.details}
          </div>
        )}
      </div>
    );
  };

  const isMyRequest = selectedItem?.requestedById === currentUserId;
  const canApprove = selectedItem && (selectedItem.status === "pending" || selectedItem.status === "on_hold");
  const canRecall = isMyRequest && selectedItem && (selectedItem.status === "pending" || selectedItem.status === "on_hold");

  const content = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* ── MAIN CARD: BẢNG DANH SÁCH ── */}
      <div className="app-card shadow-sm border bg-white rounded-3" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "16px 20px" }}>
        {/* Thanh công cụ: Search, Bộ lọc & Nút Làm mới (icon only) */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <SearchInput
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setPage(1);
              }}
              placeholder="Tìm theo mã, nội dung, người gửi..."
            />
          </div>

          {/* Lọc Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="form-select form-select-sm"
            style={{ width: "auto", minWidth: 140, borderRadius: 8, fontSize: 12, height: 36 }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">⏳ Chờ duyệt</option>
            <option value="approved">✅ Đã duyệt</option>
            <option value="rejected">❌ Từ chối</option>
            <option value="on_hold">⏸️ Tạm giữ</option>
            <option value="recalled">↩️ Thu hồi</option>
          </select>

          {/* Lọc Loại hồ sơ */}
          <select
            value={selectedEntityType}
            onChange={(e) => {
              setSelectedEntityType(e.target.value);
              setPage(1);
            }}
            className="form-select form-select-sm"
            style={{ width: "auto", minWidth: 170, borderRadius: 8, fontSize: 12, height: 36 }}
          >
            <option value="">Tất cả loại đề xuất</option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Nút Làm mới (icon only) ở cuối thanh công cụ */}
          <button
            type="button"
            className="btn btn-sm btn-light border d-inline-flex align-items-center justify-content-center"
            onClick={loadItems}
            disabled={loading}
            style={{ width: 36, height: 36, borderRadius: 8, color: "var(--foreground)", flexShrink: 0 }}
            title="Làm mới dữ liệu"
          >
            <i className={`bi bi-arrow-clockwise ${loading ? "spin" : ""}`} style={{ fontSize: 15 }} />
          </button>
        </div>

        {/* Bảng Table */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <Table
              rows={items}
              columns={columns}
              loading={loading && items.length === 0}
              fetching={loading}
              emptyText="Không có yêu cầu phê duyệt nào phù hợp."
              emptyIcon="bi-clipboard-check"
              wrapperClassName="mkt-plan-table-no-min"
              onRowClick={(row) => setSelectedItem(row)}
            />
          </div>

          {/* Pagination */}
          <div style={{ marginTop: 10 }}>
            <TablePagination
              page={page}
              totalPages={Math.ceil(total / pageSize) || 1}
              totalCount={total}
              pageSize={pageSize}
              itemName="yêu cầu"
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── OFFCANVAS CHI TIẾT RỘNG 400PX ── */}
      {selectedItem && (
        <>
          {/* Backdrop mờ */}
          <div
            onClick={() => setSelectedItem(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.4)",
              zIndex: 1040,
              backdropFilter: "blur(2px)",
              transition: "opacity 0.2s ease",
            }}
          />

          {/* Offcanvas Container */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 400,
              maxWidth: "100vw",
              zIndex: 1050,
              background: "#ffffff",
              boxShadow: "-6px 0 24px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* 1. Header Offcanvas */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                    Chi tiết yêu cầu phê duyệt
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <span className="font-monospace fw-bold text-primary" style={{ fontSize: 12 }}>
                      {selectedItem.entityCode || selectedItem.id}
                    </span>
                    {isRequestNew(selectedItem) && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          padding: "1px 6px",
                          borderRadius: 99,
                          fontSize: 9.5,
                          fontWeight: 800,
                          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                          color: "#ffffff",
                          boxShadow: "0 2px 4px rgba(220, 38, 38, 0.3)",
                        }}
                      >
                        MỚI
                      </span>
                    )}
                    {(() => {
                      const s = STATUS_CONFIG[selectedItem.status] || STATUS_CONFIG.pending;
                      return (
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: 99,
                            background: s.bg,
                            color: s.color,
                            fontSize: 10.5,
                            fontWeight: 700,
                          }}
                        >
                          {s.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedItem(null)}
                  style={{ fontSize: 12, marginTop: 2 }}
                  aria-label="Close"
                />
              </div>

              <div style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                <i className="bi bi-clock-history" />
                <span>
                  Gửi lúc:{" "}
                  {new Date(selectedItem.createdAt).toLocaleDateString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}{" "}
                  ({timeAgo(selectedItem.createdAt)})
                </span>
              </div>
            </div>

            {/* 2. Body Offcanvas (Scrollable) */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Card Người đề xuất */}
              <div
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(selectedItem.requestedByName)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectedItem.requestedByName}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b" }}>
                    {selectedItem.department || "Ban Giám đốc"}
                  </div>
                </div>
              </div>

              {/* Badge Loại đề xuất & Tiêu đề */}
              <div>
                {(() => {
                  const cfg = ENTITY_TYPE_LABELS[selectedItem.entityType] || {
                    label: selectedItem.entityType,
                    icon: "bi-file-earmark",
                    color: "#64748b",
                    bg: "#f1f5f9",
                  };
                  return (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: cfg.bg,
                        color: cfg.color,
                        fontSize: 11,
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      <i className={`bi ${cfg.icon}`} />
                      {cfg.label}
                    </span>
                  );
                })()}
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", lineHeight: 1.4 }}>
                  {selectedItem.entityTitle}
                </div>
              </div>

              {/* Chi tiết nội dung */}
              {loadingPreview ? (
                <div style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
                  <span className="spinner-border spinner-border-sm" style={{ marginRight: 8 }} />
                  Đang tải thông tin chi tiết...
                </div>
              ) : previewData?.personalRequest ? (
                renderPersonalRequestDetails(previewData.personalRequest)
              ) : (
                renderGenericDetails()
              )}

              {/* Khối Trao đổi & Thảo luận */}
              <div style={{ marginTop: 10, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-chat-left-text" /> Trao đổi & Ý kiến ({comments.length})
                </div>

                {/* Danh sách ý kiến */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, maxHeight: 180, overflowY: "auto" }}>
                  {comments.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
                      Chưa có trao đổi nào.
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          background: c.isSystem ? "rgba(241, 245, 249, 0.7)" : "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "8px 10px",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, color: c.isSystem ? "#64748b" : "#4f46e5", fontSize: 11.5 }}>
                            {c.authorName}
                          </span>
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>
                            {timeAgo(c.createdAt)}
                          </span>
                        </div>
                        <div style={{ color: "#334155", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                          {c.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input nhập ý kiến */}
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ fontSize: 12, borderRadius: 8 }}
                    placeholder="Nhập ý kiến trao đổi..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendComment();
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ borderRadius: 8, padding: "4px 12px", fontSize: 12 }}
                    disabled={!commentInput.trim() || submittingComment}
                    onClick={handleSendComment}
                  >
                    Gửi
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Footer Offcanvas (Cố định ở đáy, chứa nút Duyệt, Từ chối) */}
            <div
              style={{
                position: "sticky",
                bottom: 0,
                background: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                zIndex: 10,
              }}
            >
              {canApprove && (
                <>
                  {/* Nút Từ chối */}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger fw-semibold d-inline-flex align-items-center gap-1.5"
                    style={{ fontSize: 12.5, borderRadius: 8, padding: "6px 14px" }}
                    onClick={() => setShowRejectModal(true)}
                    disabled={!!actionLoading}
                  >
                    <i className="bi bi-x-circle" />
                    Từ chối
                  </button>

                  {/* Nút Tạm giữ */}
                  {selectedItem.status !== "on_hold" && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning fw-semibold d-inline-flex align-items-center gap-1.5"
                      style={{ fontSize: 12.5, borderRadius: 8, padding: "6px 12px" }}
                      onClick={() => handleAction("on_hold")}
                      disabled={!!actionLoading}
                    >
                      <i className="bi bi-pause-circle" />
                      Tạm giữ
                    </button>
                  )}

                  {/* Nút Duyệt */}
                  <button
                    type="button"
                    className="btn btn-sm btn-success fw-bold text-white d-inline-flex align-items-center gap-1.5"
                    style={{
                      fontSize: 12.5,
                      borderRadius: 8,
                      padding: "6px 18px",
                      background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                      border: "none",
                      boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                    }}
                    onClick={() => setShowApproveModal(true)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "approve" ? (
                      <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
                    ) : (
                      <i className="bi bi-check2-circle" />
                    )}
                    Duyệt
                  </button>
                </>
              )}

              {canRecall && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: 12, borderRadius: 8, padding: "6px 12px" }}
                  onClick={() => handleAction("recall")}
                  disabled={!!actionLoading}
                >
                  <i className="bi bi-arrow-counterclockwise me-1" />
                  Thu hồi
                </button>
              )}

              <button
                type="button"
                className="btn btn-sm btn-light border"
                style={{ fontSize: 12, borderRadius: 8, padding: "6px 14px" }}
                onClick={() => setSelectedItem(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL TỪ CHỐI ── */}
      {showRejectModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1060,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 420,
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h5 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: "#dc2626" }}>
              Xác nhận từ chối yêu cầu
            </h5>
            <p style={{ fontSize: 12.5, color: "#64748b", marginBottom: 12 }}>
              Vui lòng nhập lý do từ chối để thông báo cho nhân sự:
            </p>
            <textarea
              className="form-control"
              rows={3}
              style={{ fontSize: 13, borderRadius: 8, marginBottom: 16 }}
              placeholder="Nhập lý do từ chối cụ thể..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger fw-bold"
                onClick={() => handleAction("reject", rejectReason)}
                disabled={actionLoading === "reject"}
              >
                {actionLoading === "reject" ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DUYỆT ── */}
      {showApproveModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1060,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 420,
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h5 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: "#059669" }}>
              Xác nhận phê duyệt yêu cầu
            </h5>
            <p style={{ fontSize: 12.5, color: "#64748b", marginBottom: 12 }}>
              Bạn có thể nhập thêm ghi chú phê duyệt của Ban Giám đốc (nếu có):
            </p>
            <textarea
              className="form-control"
              rows={2}
              style={{ fontSize: 13, borderRadius: 8, marginBottom: 16 }}
              placeholder="Ghi chú phê duyệt (không bắt buộc)..."
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => {
                  setShowApproveModal(false);
                  setApproveNote("");
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success fw-bold text-white"
                style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", border: "none" }}
                onClick={() => handleAction("approve", approveNote)}
                disabled={actionLoading === "approve"}
              >
                {actionLoading === "approve" ? "Đang xử lý..." : "Xác nhận duyệt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (mode === "drawer") {
    if (!isMounted || !isOpen) return null;
    return createPortal(
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            zIndex: 1040,
            backdropFilter: "blur(2px)",
          }}
        />
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "92vw",
            maxWidth: 1200,
            background: "var(--background)",
            zIndex: 1050,
            boxShadow: "-8px 0 30px rgba(0, 0, 0, 0.2)",
            display: "flex",
            flexDirection: "column",
            animation: "slideInRight 0.25s ease-out",
          }}
        >
          <div
            style={{
              padding: "12px 20px",
              background: "#fff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="bi bi-check2-square text-primary" style={{ fontSize: 18 }} />
              <h5 style={{ margin: 0, fontWeight: 800 }}>Trung tâm phê duyệt</h5>
            </div>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div style={{ flex: 1, padding: 16, overflow: "hidden" }}>{content}</div>
        </div>
      </>,
      document.body
    );
  }

  return content;
}
