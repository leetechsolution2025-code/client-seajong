"use client";

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  request: any | null;
  initialTab?: "detail" | "comments";
  onEdit?: (req: any) => void;
  onDelete?: (id: string) => void;
}

export function PersonalRequestDetailOffcanvas({
  isOpen,
  onClose,
  request,
  initialTab = "detail",
  onEdit,
  onDelete,
}: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<"detail" | "comments">(initialTab);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!request) {
      setComments([]);
      return;
    }
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/approvals/${request.id}/comments`);
        const json = await res.json();
        if (json.success) {
          setComments(json.data || []);
        }
      } catch (err) {
        console.error("fetch comments error:", err);
      }
    };
    fetchComments();
  }, [request]);

  useEffect(() => {
    if (activeTab === "comments") {
      const el = chatScrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [activeTab, comments]);

  if (!isOpen || !request) return null;

  const handleSendComment = async () => {
    if (!commentInput.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/approvals/${request.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setComments((prev) => [...prev, data.data]);
        setCommentInput("");
      } else {
        toastError("Lỗi", data.error || "Không thể gửi phản hồi");
      }
    } catch (e: any) {
      toastError("Lỗi", e.message || "Không thể kết nối đến máy chủ");
    } finally {
      setSubmittingComment(false);
    }
  };

  const details =
    typeof request.details === "string"
      ? (() => {
          try {
            return JSON.parse(request.details || "{}");
          } catch {
            return {};
          }
        })()
      : request.details || {};

  const typeKey = (request.type || "").toLowerCase();
  const statusKey = (request.status || "pending").toLowerCase();

  // Nhãn loại yêu cầu
  const getRequestTypeBadge = () => {
    if (typeKey === "salary-advance" || details.category === "salary_advance") {
      return { label: "Tạm ứng lương", bg: "#e0f2fe", color: "#0284c7", icon: "bi-cash-coin" };
    }
    if (typeKey === "advance-refund" || details.category === "advance_refund") {
      return { label: "Tạm ứng & Hoàn ứng", bg: "#ede9fe", color: "#7c3aed", icon: "bi-receipt-cutoff" };
    }
    if (typeKey === "sick-leave" || details.category === "sick_leave") {
      return { label: "Nghỉ ốm hưởng BHXH", bg: "#fce7f3", color: "#db2777", icon: "bi-heart-pulse" };
    }
    if (typeKey === "late" || typeKey === "early" || typeKey === "late-early" || details.category === "late_early") {
      return { label: "Đi muộn / Về sớm", bg: "#fef3c7", color: "#d97706", icon: "bi-clock-history" };
    }
    if (typeKey === "overtime" || details.category === "overtime") {
      return { label: "Làm thêm giờ (OT)", bg: "#e0e7ff", color: "#4f46e5", icon: "bi-lightning-charge" };
    }
    return { label: "Nghỉ phép cá nhân", bg: "#fef3c7", color: "#d97706", icon: "bi-calendar-check" };
  };

  const typeBadge = getRequestTypeBadge();

  return (
    <>
      <div
        className="offcanvas-backdrop fade show"
        style={{ zIndex: 1040 }}
        onClick={onClose}
      />

      <div
        className="offcanvas offcanvas-end show border-0 shadow-lg"
        tabIndex={-1}
        style={{
          width: 480,
          zIndex: 1050,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="offcanvas-header border-bottom px-4 py-3 align-items-center"
          style={{ background: "#f8fafc" }}
        >
          <div className="d-flex align-items-center gap-2.5 flex-grow-1 min-w-0">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "10px",
                background: typeBadge.bg,
                color: typeBadge.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              <i className={`bi ${typeBadge.icon}`} />
            </div>
            <div className="flex-grow-1 min-w-0">
              <h5 className="offcanvas-title fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                Chi tiết đề xuất của tôi
              </h5>
              <div className="d-flex align-items-center gap-2 mt-0.5">
                <span
                  className="font-monospace fw-bold"
                  style={{
                    fontSize: "11px",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {request.id}
                </span>
                <span className="text-muted" style={{ fontSize: "11px" }}>•</span>
                <span className="text-muted" style={{ fontSize: "11.5px" }}>
                  {request.createdAt
                    ? format(new Date(request.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })
                    : "Mới gửi"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-close shadow-none"
            onClick={onClose}
            aria-label="Close"
          />
        </div>

        {/* Navigation Tabs */}
        <div
          className="d-flex border-bottom px-4"
          style={{ background: "#ffffff", gap: "24px" }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("detail")}
            style={{
              padding: "10px 0",
              border: "none",
              background: "transparent",
              fontSize: "13px",
              fontWeight: activeTab === "detail" ? 700 : 500,
              color: activeTab === "detail" ? "#003087" : "var(--muted-foreground)",
              borderBottom: activeTab === "detail" ? "2.5px solid #003087" : "2.5px solid transparent",
              cursor: "pointer",
            }}
          >
            <i className="bi bi-info-circle me-1.5" />
            Nội dung đề xuất
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            style={{
              padding: "10px 0",
              border: "none",
              background: "transparent",
              fontSize: "13px",
              fontWeight: activeTab === "comments" ? 700 : 500,
              color: activeTab === "comments" ? "#003087" : "var(--muted-foreground)",
              borderBottom: activeTab === "comments" ? "2.5px solid #003087" : "2.5px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="bi bi-chat-dots me-1" />
            Trao đổi & Phản hồi
            {comments.length > 0 && (
              <span
                style={{
                  background: activeTab === "comments" ? "#003087" : "#e2e8f0",
                  color: activeTab === "comments" ? "#ffffff" : "#475569",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  padding: "1px 6px",
                }}
              >
                {comments.length}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div
          className="offcanvas-body p-4 flex-grow-1"
          style={{ overflowY: "auto", minHeight: 0 }}
        >
          {activeTab === "detail" ? (
            <div className="d-flex flex-column gap-3">
              {/* Card Trạng thái & Phê duyệt */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background:
                    statusKey === "approved"
                      ? "#f0fdf4"
                      : statusKey === "rejected"
                      ? "#fef2f2"
                      : "#f8fafc",
                  border:
                    statusKey === "approved"
                      ? "1px solid #bbf7d0"
                      : statusKey === "rejected"
                      ? "1px solid #fecaca"
                      : "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                    TRẠNG THÁI HIỆN TẠI
                  </div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 700,
                      marginTop: 2,
                      color:
                        statusKey === "approved"
                          ? "#15803d"
                          : statusKey === "rejected"
                          ? "#b91c1c"
                          : "#d97706",
                    }}
                  >
                    {statusKey === "approved"
                      ? "Đã được phê duyệt"
                      : statusKey === "rejected"
                      ? "Bị từ chối"
                      : request.hrApproved
                      ? "Nhân sự đã sơ duyệt • Chờ Ban Giám đốc"
                      : "Đang chờ Nhân sự tiếp nhận"}
                  </div>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: typeBadge.bg,
                    color: typeBadge.color,
                  }}
                >
                  {typeBadge.label}
                </span>
              </div>

              {/* Chi tiết nội dung tùy theo loại đề xuất */}
              {typeKey === "salary-advance" ? (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  <div className="text-center py-2 mb-3 border-bottom">
                    <div style={{ fontSize: "11.5px", color: "var(--muted-foreground)" }}>SỐ TIỀN ĐỀ XUẤT TẠM ỨNG</div>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#0284c7" }}>
                      {Number(details.amount || request.amount || 0).toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-2" style={{ fontSize: "12.5px" }}>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Kỳ khấu trừ lương:</span>
                      <span className="fw-semibold">{details.deductionMonth || "Tháng này"}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Phương thức nhận:</span>
                      <span className="fw-semibold">{details.paymentMethod || "Chuyển khoản"}</span>
                    </div>
                    {details.bankAccount && (
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Số tài khoản:</span>
                        <span className="fw-semibold font-monospace">{details.bankAccount} ({details.bankName || "Ngân hàng"})</span>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-top">
                      <div className="text-muted mb-1" style={{ fontSize: "11.5px" }}>Lý do tạm ứng:</div>
                      <div className="p-2 rounded bg-white border" style={{ fontSize: "12.5px", color: "#334155" }}>
                        {request.reason || details.reason || "Không ghi lý do cụ thể"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : typeKey === "advance-refund" ? (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  <div className="text-center py-2 mb-3 border-bottom">
                    <div style={{ fontSize: "11.5px", color: "var(--muted-foreground)" }}>
                      {details.subType || "TẠM ỨNG KINH PHÍ"}
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#7c3aed" }}>
                      {Number(details.amount || request.amount || 0).toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-2" style={{ fontSize: "12.5px" }}>
                    {details.originalAdvanceCode && (
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Mã tạm ứng gốc:</span>
                        <span className="fw-semibold font-monospace">{details.originalAdvanceCode}</span>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-top">
                      <div className="text-muted mb-1" style={{ fontSize: "11.5px" }}>Mục đích chi / Công việc:</div>
                      <div className="p-2 rounded bg-white border" style={{ fontSize: "12.5px", color: "#334155" }}>
                        {request.reason || details.purpose || details.reason || "Không ghi cụ thể"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  <div className="d-flex flex-column gap-2" style={{ fontSize: "12.5px" }}>
                    {request.startDate && (
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Thời gian:</span>
                        <span className="fw-semibold">
                          {format(new Date(request.startDate), "dd/MM/yyyy", { locale: vi })}
                          {request.endDate && request.endDate !== request.startDate && (
                            <> - {format(new Date(request.endDate), "dd/MM/yyyy", { locale: vi })}</>
                          )}
                        </span>
                      </div>
                    )}
                    {(details.totalDays || request.totalDays) && (
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Tổng số ngày nghỉ:</span>
                        <span className="fw-semibold text-danger">{details.totalDays || request.totalDays} ngày</span>
                      </div>
                    )}
                    {(details.minutes || details.totalHours) && (
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Thời lượng:</span>
                        <span className="fw-semibold text-primary">
                          {details.minutes ? `${details.minutes} phút` : `${details.totalHours} giờ`}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-top">
                      <div className="text-muted mb-1" style={{ fontSize: "11.5px" }}>Lý do / Nội dung:</div>
                      <div className="p-2 rounded bg-white border" style={{ fontSize: "12.5px", color: "#334155" }}>
                        {request.reason || details.reason || "Không ghi lý do cụ thể"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Nút hỗ trợ chuyển qua tab trao đổi */}
              <div
                onClick={() => setActiveTab("comments")}
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px dashed #3b82f6",
                  background: "#eff6ff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-chat-dots-fill text-primary" style={{ fontSize: "16px" }} />
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#1d4ed8" }}>
                    Nhắn tin trao đổi với HR hoặc Sếp về đơn này
                  </span>
                </div>
                <i className="bi bi-chevron-right text-primary" style={{ fontSize: "12px" }} />
              </div>
            </div>
          ) : (
            /* TAB TRAO ĐỔI (COMMENTS) DÀNH CHO NHÂN VIÊN */
            <div className="d-flex flex-column h-100" style={{ minHeight: "360px" }}>
              <div
                ref={chatScrollRef}
                className="flex-grow-1 overflow-auto d-flex flex-column gap-3 pe-1 mb-3"
                style={{ minHeight: 0 }}
              >
                {comments.length === 0 ? (
                  <div className="text-center py-5 text-muted my-auto">
                    <i className="bi bi-chat-square-dots fs-1 d-block mb-2 opacity-40" />
                    <div className="fw-semibold small">Chưa có trao đổi nào</div>
                    <div style={{ fontSize: "12px" }}>
                      Gửi tin nhắn bên dưới để trao đổi với Phòng Nhân sự và Ban Giám đốc.
                    </div>
                  </div>
                ) : (
                  comments.map((c: any) => {
                    const isMe = c.authorId === currentUserId;
                    return (
                      <div
                        key={c.id}
                        className={`d-flex flex-column ${isMe ? "align-items-end" : "align-items-start"}`}
                      >
                        <div
                          className="d-flex align-items-center gap-1.5 mb-1 px-1"
                          style={{ fontSize: "11px", color: "var(--muted-foreground)" }}
                        >
                          <span className="fw-bold" style={{ color: isMe ? "#003087" : "#334155" }}>
                            {isMe ? "Bạn" : c.authorName}
                          </span>
                          {c.authorRole && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                background: "#f1f5f9",
                                color: "#64748b",
                              }}
                            >
                              {c.authorRole}
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            {c.createdAt
                              ? format(new Date(c.createdAt), "HH:mm dd/MM", { locale: vi })
                              : ""}
                          </span>
                        </div>
                        <div
                          style={{
                            maxWidth: "85%",
                            padding: "9px 13px",
                            borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                            background: isMe ? "#003087" : "#f1f5f9",
                            color: isMe ? "#ffffff" : "#1e293b",
                            fontSize: "13px",
                            lineHeight: 1.4,
                            wordBreak: "break-word",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          {c.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Khung nhập tin nhắn */}
              <div className="pt-2 border-top">
                <div className="d-flex gap-2 align-items-end">
                  <textarea
                    rows={2}
                    className="form-control shadow-none"
                    placeholder="Nhập nội dung trao đổi, phản hồi..."
                    style={{ fontSize: "13px", resize: "none", borderRadius: "10px" }}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "10px",
                      backgroundColor: "#003087",
                      borderColor: "#003087",
                    }}
                    onClick={handleSendComment}
                    disabled={!commentInput.trim() || submittingComment}
                    title="Gửi tin nhắn (Enter)"
                  >
                    {submittingComment ? (
                      <span className="spinner-border spinner-border-sm" role="status" />
                    ) : (
                      <i className="bi bi-send-fill text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--card)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {statusKey === "pending" ? (
            <div className="d-flex align-items-center gap-2">
              {onDelete && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm px-2.5"
                  style={{ height: 34, fontSize: "12.5px" }}
                  onClick={() => onDelete(request.id)}
                >
                  <i className="bi bi-trash3 me-1" />
                  Xoá đơn
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-2.5"
                  style={{ height: 34, fontSize: "12.5px" }}
                  onClick={() => onEdit(request)}
                >
                  <i className="bi bi-pencil-square me-1" />
                  Chỉnh sửa
                </button>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              <i className="bi bi-lock-fill me-1" /> Đơn đã qua xử lý
            </div>
          )}

          <button
            type="button"
            className="btn btn-light border btn-sm px-3"
            style={{ height: 34, fontSize: "12.5px" }}
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </>
  );
}
