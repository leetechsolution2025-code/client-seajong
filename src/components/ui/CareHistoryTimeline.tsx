"use client";

import React from "react";

export type CareHistoryItem = {
  id?: string;
  date: string;     // cỗi đã format để hiển thị
  rawDate?: string; // ISO string để sort
  type: string;
  note: string;
  user: string;
};

const CARE_TYPE_ICON: Record<string, { icon: string; color: string; label: string }> = {
  call: { icon: "bi-telephone-fill", color: "#10b981", label: "Gọi điện" },
  meeting: { icon: "bi-people-fill", color: "#6366f1", label: "Gặp mặt" },
  message: { icon: "bi-chat-dots-fill", color: "#3b82f6", label: "Nhắn tin" },
  email: { icon: "bi-envelope-fill", color: "#f59e0b", label: "Gửi Email" },
  note: { icon: "bi-sticky-fill", color: "#06b6d4", label: "Ghi chú" },
};

interface Props {
  history: CareHistoryItem[];
  onAdd?: () => void;
  onDelete?: (id: string) => void;
}

export function CareHistoryTimeline({ history, onAdd, onDelete }: Props) {
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete?.(id);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div>
      {/* Header — cố định */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Lịch sử chăm sóc</p>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 12%, transparent)", borderRadius: "10px", padding: "1px 6px" }}>{history.length}</span>
        </div>
        <button
          onClick={onAdd}
          disabled={!onAdd}
          title={!onAdd ? "Chỉ người phụ trách mới được thêm hoạt động" : "Thêm hoạt động chăm sóc"}
          style={{
            fontSize: 11,
            color: onAdd ? "var(--primary)" : "var(--muted-foreground)",
            background: onAdd
              ? "color-mix(in srgb, var(--primary) 8%, transparent)"
              : "var(--muted)",
            border: "none",
            cursor: onAdd ? "pointer" : "not-allowed",
            fontWeight: 700,
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 20,
            transition: "0.15s",
            opacity: onAdd ? 1 : 0.45,
          }}
        >
          <i className="bi bi-plus-lg" /> Hoạt động
        </button>
      </div>

      {/* Nội dung — scroll độc lập */}
      <div style={{ maxHeight: 420, overflowY: "auto", padding: "0 20px 24px" }}>
        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted-foreground)", fontSize: 13, background: "var(--muted)", borderRadius: 12 }}>
            <i className="bi bi-clock-history" style={{ fontSize: 24, display: "block", marginBottom: 8, opacity: 0.3 }} />
            Chưa có ghi nhận hoạt động nào
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 40 }}>
            <div style={{ position: "absolute", left: 19, top: 4, bottom: 4, width: 2, background: "linear-gradient(to bottom, var(--border), rgba(226, 232, 240, 0))", borderRadius: 4 }} />
            {[...history].sort((a, b) => {
              const da = a.rawDate ? new Date(a.rawDate).getTime() : 0;
              const db = b.rawDate ? new Date(b.rawDate).getTime() : 0;
              return db - da; // mới nhất đầu tiên
            }).map((h, i) => {
              const ti = CARE_TYPE_ICON[h.type] ?? CARE_TYPE_ICON.note;
              const isConfirming = confirmId === h.id;
              const isDeleting = deletingId === h.id;
              return (
                <div key={h.id ?? i} style={{ position: "relative", marginBottom: 14 }}>
                  <div style={{ position: "absolute", left: -33, top: 4, width: 24, height: 24, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px var(--border)" }}>
                    <i className={`bi ${ti.icon}`} style={{ fontSize: 10, color: ti.color }} />
                  </div>
                  <div style={{ background: "var(--card)", borderRadius: 12, padding: "8px 12px", opacity: isDeleting ? 0.5 : 1, transition: "opacity 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: ti.color, padding: "2px 8px", background: `color-mix(in srgb, ${ti.color} 10%, transparent)`, borderRadius: 6 }}>{ti.label}</span>
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>• {h.date}</span>
                      </div>
                      {/* Nút xóa — ẩn với item hệ thống */}
                      {h.id && h.id !== "__created__" && onDelete && (
                        isConfirming ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Xóa?</span>
                            <button
                              onClick={() => handleDelete(h.id!)}
                              disabled={isDeleting}
                              style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#f43f5e", border: "none", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}
                            >
                              {isDeleting ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : "Đồng ý"}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", background: "var(--muted)", border: "none", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(h.id!)}
                            title="Xóa hoạt động"
                            style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5, transition: "opacity 0.15s, color 0.15s", flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#f43f5e"; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                          >
                            <i className="bi bi-trash" style={{ fontSize: 11 }} />
                          </button>
                        )
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--foreground)", fontWeight: 500, lineHeight: 1.5 }}>{h.note}</p>
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, opacity: 0.8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)" }}>{h.user[0]}</div>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>{h.user} thực hiện</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
