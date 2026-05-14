"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { BrandButton } from "../ui/BrandButton";
import { PayrollDetailModal } from "@/components/hr/PayrollDetailModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Attachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  approvalId?: string;
  entityId?: string;
}

interface NotifItem {
  recipientId: string;
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  audienceType: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  createdById: string | null;
  createdByName: string;
  createdByDept: string | null;
  createdByPos:  string | null;
  attachments:   Attachment[];
}

interface DeptOption { code: string; name: string; }
interface UserOption { id: string; name: string; email: string; position: string | null; department: string | null; }

interface Props {
  open: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
  userRole?: string;
  clientId?: string | null;
  onOpenApproval?: (approvalId?: string, entityId?: string) => void;
}

// ─── Configs ─────────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  info:     { icon: "bi-info-circle-fill",           color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  label: "Thông tin"  },
  success:  { icon: "bi-check-circle-fill",          color: "#10b981", bg: "rgba(16,185,129,0.12)",  label: "Thành công" },
  warning:  { icon: "bi-exclamation-triangle-fill",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  label: "Cảnh báo"   },
  error:    { icon: "bi-x-circle-fill",              color: "#ef4444", bg: "rgba(239,68,68,0.12)",   label: "Lỗi"        },
  message:  { icon: "bi-envelope-fill",              color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  label: "Tin nhắn"   },
  document: { icon: "bi-file-earmark-text-fill",     color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   label: "Tài liệu"   },
};

const AUDIENCE_CFG: Record<string, { icon: string; label: string }> = {
  all:        { icon: "bi-globe",       label: "Toàn bộ hệ thống" },
  department: { icon: "bi-building",    label: "Phòng ban"         },
  group:      { icon: "bi-people-fill", label: "Nhóm người dùng"   },
  individual: { icon: "bi-person-fill", label: "Cá nhân"           },
};

const PRIORITY_CFG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  normal: { icon: "bi-dash-circle",            color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: "Bình thường" },
  high:   { icon: "bi-arrow-up-circle-fill",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "Ưu tiên cao" },
  urgent: { icon: "bi-exclamation-circle-fill",color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "Khẩn cấp"    },
};

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type?: string) {
  if (!type) return "bi-paperclip";
  if (type.includes("pdf"))   return "bi-file-earmark-pdf-fill";
  if (type.includes("image")) return "bi-file-earmark-image-fill";
  if (type.includes("word") || type.includes("doc")) return "bi-file-earmark-word-fill";
  if (type.includes("sheet") || type.includes("excel") || type.includes("xls")) return "bi-file-earmark-excel-fill";
  if (type.includes("zip") || type.includes("rar"))  return "bi-file-earmark-zip-fill";
  return "bi-file-earmark-fill";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "HT";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

/** Parse **text** thành <strong> */
function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ fontWeight: 700, color: "inherit" }}>{p}</strong>
      : <span key={i}>{p}</span>
  );
}

/**
 * Render nội dung thông báo có cấu trúc:
 *   ## SECTION TITLE   → tiêu đề section nổi bật
 *   ---                → đường kẻ phân cách
 *   ### ORDER-CODE     → mã đơn hàng (heading nhỏ)
 *   @ Nhà cung cấp     → dòng nhà cung cấp
 *   ◦ Tên hàng: ...    → dòng mặt hàng
 *   → Tổng đơn: ...    → dòng tổng tiền
 *   (dòng trống)       → khoảng trắng giữa các block
 *   Văn bản thường     → đoạn văn bình thường, hỗ trợ **bold**
 */
function renderContent(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    // ##  Section heading lớn
    if (line.startsWith("## ")) {
      const label = line.slice(3).trim();
      nodes.push(
        <div key={i} style={{ marginTop: 14, marginBottom: 4 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em",
            color: "var(--muted-foreground)", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <i className="bi bi-chevron-right" style={{ fontSize: 9 }} />
            {label}
          </div>
        </div>
      );
      return;
    }

    // ---  Divider
    if (line.trim() === "---") {
      nodes.push(<div key={i} style={{ height: 1, background: "var(--border)", margin: "4px 0 8px" }} />);
      return;
    }

    // ###  Mã đơn mua
    if (line.startsWith("### ")) {
      const code = line.slice(4).trim();
      nodes.push(
        <div key={i} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(99,102,241,0.12)", color: "#6366f1",
          borderRadius: 6, padding: "3px 9px", fontSize: 12.5, fontWeight: 800,
          fontFamily: "monospace", marginTop: 8, marginBottom: 2,
        }}>
          <i className="bi bi-receipt" style={{ fontSize: 11 }} />
          {code}
        </div>
      );
      return;
    }

    // @   Nhà cung cấp
    if (line.startsWith("@ ")) {
      const supplier = line.slice(2).trim();
      nodes.push(
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600, marginBottom: 4,
        }}>
          <i className="bi bi-building" style={{ fontSize: 11, flexShrink: 0 }} />
          {supplier}
        </div>
      );
      return;
    }

    // ◦   Dòng mặt hàng
    if (line.startsWith("◦ ")) {
      const content = line.slice(2);
      nodes.push(
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 6,
          fontSize: 12.5, padding: "2px 0 2px 10px",
          borderLeft: "2px solid var(--border)",
          marginLeft: 2, marginBottom: 2,
        }}>
          <span style={{ color: "var(--primary)", fontWeight: 700, flexShrink: 0, marginTop: 1, fontSize: 11 }}>◦</span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{parseBold(content)}</span>
        </div>
      );
      return;
    }

    // →   Tổng tiền
    if (line.startsWith("→ ")) {
      const total = line.slice(2);
      nodes.push(
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12.5, fontWeight: 700,
          color: "#10b981",
          paddingLeft: 10, marginTop: 4, marginBottom: 2,
        }}>
          <i className="bi bi-arrow-right-short" style={{ fontSize: 14 }} />
          {parseBold(total)}
        </div>
      );
      return;
    }

    // Dòng trống → spacing
    if (!line.trim()) {
      nodes.push(<div key={i} style={{ height: 6 }} />);
      return;
    }

    // **Lưu ý**: highlight
    if (line.startsWith("**Lưu ý**:")) {
      const content = line.slice(10).trim();
      nodes.push(
        <div key={i} style={{
          marginTop: 12, marginBottom: 8,
          padding: "10px 14px", borderRadius: 8,
          background: "rgba(245, 158, 11, 0.08)", borderLeft: "3px solid #f59e0b",
          fontSize: 12, color: "var(--foreground)", lineHeight: 1.6
        }}>
          <strong style={{ color: "#d97706" }}>Lưu ý:</strong> {parseBold(content)}
        </div>
      );
      return;
    }

    // Văn bản thường (có thể có **bold**)
    nodes.push(
      <div key={i} style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 2 }}>
        {parseBold(line)}
      </div>
    );
  });

  return nodes;
}

// ─── Create Notification Modal ────────────────────────────────────────────────
function CreateNotifModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [audienceType, setAudienceType] = useState<"all"|"department"|"group"|"individual">("all");
  const [selectedType, setSelectedType] = useState("info");
  const [priority,     setPriority]     = useState<"normal"|"high"|"urgent">("normal");
  const [title,        setTitle]        = useState("");
  const [content,      setContent]      = useState("");
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState("");

  // Audience selectors
  const [deptValue,   setDeptValue]   = useState("");
  const [groupUsers,  setGroupUsers]  = useState<string[]>([]);
  const [indivUser,   setIndivUser]   = useState("");
  const [userSearch,  setUserSearch]  = useState("");

  // Options from API
  const [depts,       setDepts]       = useState<DeptOption[]>([]);
  const [users,       setUsers]       = useState<UserOption[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(false);

  useEffect(() => {
    setLoadingOpts(true);
    fetch("/api/notifications/recipients")
      .then(r => r.json())
      .then(d => { setDepts(d.departments ?? []); setUsers(d.users ?? []); })
      .catch(() => {})
      .finally(() => setLoadingOpts(false));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Reset khi đổi audience type
  useEffect(() => {
    setDeptValue(""); setGroupUsers([]); setIndivUser(""); setUserSearch("");
  }, [audienceType]);

  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) ||
           (u.department || "").toLowerCase().includes(q);
  });

  const getAudienceValue = () => {
    if (audienceType === "department") return deptValue || null;
    if (audienceType === "individual") return indivUser || null;
    if (audienceType === "group")      return groupUsers.length > 0 ? JSON.stringify(groupUsers) : null;
    return null;
  };

  const validateAudience = () => {
    if (audienceType === "department" && !deptValue)            return "Vui lòng chọn phòng ban";
    if (audienceType === "individual" && !indivUser)            return "Vui lòng chọn người nhận";
    if (audienceType === "group" && groupUsers.length === 0)    return "Vui lòng chọn ít nhất 1 người";
    return null;
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) { setError("Vui lòng nhập tiêu đề và nội dung"); return; }
    const audErr = validateAudience();
    if (audErr) { setError(audErr); return; }
    setSending(true); setError("");
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, type: selectedType, priority, audienceType, audienceValue: getAudienceValue() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi gửi thông báo");
      success(
        "Gửi thông báo thành công",
        `Đã gửi đến ${json.recipientCount ?? 0} người nhận`,
      );
      onCreated(); onClose();
    } catch (e: any) {
      const msg = e.message || "Đã xảy ra lỗi";
      setError(msg);
      toastError("Gửi thất bại", msg);
    } finally {
      setSending(false);
    }
  };

  const AUDIENCE_OPTS = [
    { id: "all",        icon: "bi-globe",        label: "Toàn bộ hệ thống", desc: "Gửi đến tất cả nhân viên"      },
    { id: "department", icon: "bi-building-fill", label: "Phòng ban",        desc: "Gửi đến một phòng ban cụ thể"  },
    { id: "group",      icon: "bi-people-fill",   label: "Nhóm người dùng",  desc: "Chọn nhiều người nhận"         },
    { id: "individual", icon: "bi-person-fill",   label: "Cá nhân",          desc: "Gửi đến một người cụ thể"      },
  ] as const;

  const TYPE_OPTS = [
    { id: "info",     icon: "bi-info-circle-fill",          color: "#3b82f6" },
    { id: "success",  icon: "bi-check-circle-fill",         color: "#10b981" },
    { id: "warning",  icon: "bi-exclamation-triangle-fill", color: "#f59e0b" },
    { id: "error",    icon: "bi-x-circle-fill",             color: "#ef4444" },
    { id: "message",  icon: "bi-envelope-fill",             color: "#8b5cf6" },
    { id: "document", icon: "bi-file-earmark-text-fill",    color: "#06b6d4" },
  ] as const;

  // ── Dynamic audience sub-selector ────────────────────────────────────────────
  const renderAudienceSelector = () => {
    if (audienceType === "all") {
      return (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
          borderRadius: 10, background: "rgba(59,130,246,0.06)",
          border: "1px solid rgba(59,130,246,0.2)", fontSize: 13, color: "#3b82f6",
        }}>
          <i className="bi bi-info-circle-fill" />
          Thông báo sẽ gửi đến tất cả{users.length > 0 ? ` ${users.length}` : ""} người dùng trong hệ thống
        </div>
      );
    }

    if (audienceType === "department") {
      return (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Chọn phòng ban <span style={{ color: "#ef4444" }}>*</span>
          </label>
          {loadingOpts ? (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--muted)", fontSize: 13, color: "var(--muted-foreground)" }}>
              <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite", marginRight: 6 }} />Đang tải...
            </div>
          ) : (
            <select value={deptValue} onChange={e => setDeptValue(e.target.value)} style={{
              width: "100%", padding: "9px 12px", boxSizing: "border-box",
              background: "var(--background)", border: "1px solid var(--border)",
              borderRadius: 10, color: "var(--foreground)", fontSize: 13,
              outline: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              <option value="">-- Chọn phòng ban --</option>
              {depts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          )}
          {deptValue && (
            <div style={{
              marginTop: 8, padding: "7px 12px", borderRadius: 8, fontSize: 12,
              background: "rgba(59,130,246,0.08)", color: "#3b82f6", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <i className="bi bi-building-fill" />
              {depts.find(d => d.code === deptValue)?.name} – toàn bộ nhân viên phòng ban này
            </div>
          )}
        </div>
      );
    }

    // Shared user search bar
    const searchBar = (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--muted)", borderRadius: 10, padding: "7px 11px", marginBottom: 8,
      }}>
        <i className="bi bi-search" style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0 }} />
        <input
          value={userSearch} onChange={e => setUserSearch(e.target.value)}
          placeholder="Tìm tên, email, phòng ban..."
          style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--foreground)", fontFamily: "inherit" }}
        />
        {audienceType === "group" && groupUsers.length > 0 && (
          <button onClick={() => setGroupUsers([])} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)", fontSize: 11, padding: 0, whiteSpace: "nowrap",
          }}>Bỏ tất cả</button>
        )}
      </div>
    );

    if (audienceType === "individual") {
      const sel = users.find(u => u.id === indivUser);
      return (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Chọn người nhận <span style={{ color: "#ef4444" }}>*</span>
          </label>
          {searchBar}
          <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)" }}>
            {loadingOpts ? (
              <div style={{ padding: "12px 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
                <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite", marginRight: 6 }} />Đang tải...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: "12px 14px", color: "var(--muted-foreground)", fontSize: 13, textAlign: "center" }}>Không tìm thấy</div>
            ) : filteredUsers.map(u => (
              <div key={u.id} onClick={() => setIndivUser(u.id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                background: indivUser === u.id ? "color-mix(in srgb, var(--primary) 8%, var(--background))" : "transparent",
                transition: "background 0.1s",
              }}
                onMouseEnter={e => { if (indivUser !== u.id) (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = indivUser === u.id ? "color-mix(in srgb, var(--primary) 8%, var(--background))" : "transparent"; }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  background: "var(--primary)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                }}>
                  {(u.name || u.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.position ? `${u.position} · ` : ""}{u.department || u.email}
                  </div>
                </div>
                {indivUser === u.id && <i className="bi bi-check-circle-fill" style={{ color: "var(--primary)", fontSize: 15 }} />}
              </div>
            ))}
          </div>
          {sel && (
            <div style={{
              marginTop: 8, padding: "7px 12px", borderRadius: 8, fontSize: 12,
              background: "rgba(59,130,246,0.08)", color: "#3b82f6", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <i className="bi bi-person-check-fill" />
              Đã chọn: {sel.name}{sel.position ? ` – ${sel.position}` : ""}
            </div>
          )}
        </div>
      );
    }

    // group
    return (
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Chọn người nhận <span style={{ color: "#ef4444" }}>*</span>
          {groupUsers.length > 0 && (
            <span style={{ marginLeft: 8, background: "var(--primary)", color: "#fff", borderRadius: 9999, fontSize: 10, padding: "1px 6px" }}>
              {groupUsers.length}
            </span>
          )}
        </label>
        {searchBar}
        <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)" }}>
          {loadingOpts ? (
            <div style={{ padding: "12px 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
              <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite", marginRight: 6 }} />Đang tải...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: "12px 14px", color: "var(--muted-foreground)", fontSize: 13, textAlign: "center" }}>Không tìm thấy</div>
          ) : filteredUsers.map(u => {
            const checked = groupUsers.includes(u.id);
            return (
              <div key={u.id}
                onClick={() => setGroupUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  background: checked ? "color-mix(in srgb, var(--primary) 6%, var(--background))" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = checked ? "color-mix(in srgb, var(--primary) 6%, var(--background))" : "transparent"; }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: checked ? "none" : "1.5px solid var(--border)",
                  background: checked ? "var(--primary)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {checked && <i className="bi bi-check" style={{ color: "#fff", fontSize: 11 }} />}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: checked ? "var(--primary)" : "var(--muted)",
                  color: checked ? "#fff" : "var(--muted-foreground)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                }}>
                  {(u.name || u.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: checked ? 700 : 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.position ? `${u.position} · ` : ""}{u.department || u.email}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Selected tags */}
        {groupUsers.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
            {groupUsers.map(uid => {
              const u = users.find(x => x.id === uid);
              if (!u) return null;
              return (
                <span key={uid} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "color-mix(in srgb, var(--primary) 12%, var(--card))",
                  color: "var(--primary)", borderRadius: 9999,
                  padding: "3px 10px 3px 8px", fontSize: 12, fontWeight: 600,
                }}>
                  {u.name}
                  <button
                    onClick={e => { e.stopPropagation(); setGroupUsers(prev => prev.filter(id => id !== uid)); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", lineHeight: 1.2, fontSize: 14 }}
                  >×</button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--card)", borderRadius: 20, width: "100%", maxWidth: 540,
        boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        animation: "modalIn 0.2s ease",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: "rgba(59,130,246,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="bi bi-send-fill" style={{ color: "#3b82f6", fontSize: 18 }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--foreground)" }}>Tạo thông báo</h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>Gửi thông báo đến người dùng trong hệ thống</p>
          </div>
          <button onClick={onClose} style={{
            background: "var(--muted)", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", color: "var(--muted-foreground)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>
            <i className="bi bi-x" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Audience type grid */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              Đối tượng nhận
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {AUDIENCE_OPTS.map(opt => (
                <button key={opt.id} onClick={() => setAudienceType(opt.id)} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "11px 13px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                  border: audienceType === opt.id ? "2px solid var(--primary)" : "1.5px solid var(--border)",
                  background: audienceType === opt.id ? "color-mix(in srgb, var(--primary) 6%, var(--card))" : "var(--card)",
                  transition: "all 0.15s",
                }}>
                  <i className={`bi ${opt.icon}`} style={{
                    color: audienceType === opt.id ? "var(--primary)" : "var(--muted-foreground)",
                    fontSize: 14, marginTop: 2, flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: audienceType === opt.id ? "var(--primary)" : "var(--foreground)" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic sub-selector */}
          {renderAudienceSelector()}

          {/* Type */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loại</label>
              <span style={{ fontSize: 12, fontWeight: 600, color: TYPE_CFG[selectedType]?.color }}>{TYPE_CFG[selectedType]?.label}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {TYPE_OPTS.map(t => (
                <button key={t.id} onClick={() => setSelectedType(t.id)} style={{
                  width: 38, height: 38, borderRadius: "50%", border: "none",
                  background: selectedType === t.id ? `${t.color}20` : "var(--muted)",
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  outline: selectedType === t.id ? `2.5px solid ${t.color}` : "2.5px solid transparent",
                  outlineOffset: 2,
                }}>
                  <i className={`bi ${t.icon}`} style={{ color: t.color, fontSize: 16 }} />
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Mức độ ưu tiên
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["normal", "high", "urgent"] as const).map(p => {
                const pc = PRIORITY_CFG[p];
                const active = priority === p;
                return (
                  <button key={p} onClick={() => setPriority(p)} style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                    border: active ? `2px solid ${pc.color}` : "1.5px solid var(--border)",
                    background: active ? pc.bg : "var(--card)",
                    transition: "all 0.15s",
                  }}>
                    <i className={`bi ${pc.icon}`} style={{ color: pc.color, fontSize: 18 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: active ? pc.color : "var(--muted-foreground)" }}>
                      {pc.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Tiêu đề <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nhập tiêu đề thông báo..."
              style={{
                width: "100%", padding: "10px 14px", boxSizing: "border-box",
                background: "var(--background)", border: "1px solid var(--border)",
                borderRadius: 10, color: "var(--foreground)", fontSize: 13.5, outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "inherit",
              }}
              onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Content */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Nội dung <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Nhập nội dung chi tiết thông báo..." rows={4}
              style={{
                width: "100%", padding: "10px 14px", boxSizing: "border-box",
                background: "var(--background)", border: "1px solid var(--border)",
                borderRadius: 10, color: "var(--foreground)", fontSize: 13.5,
                outline: "none", resize: "vertical", minHeight: 100,
                fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.08)",
              borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.2)",
            }}>
              <i className="bi bi-exclamation-circle-fill" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "16px 24px", borderTop: "1px solid var(--border)", flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", borderRadius: 10, border: "1px solid var(--border)",
            background: "var(--card)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Hủy</button>
          <button onClick={handleSend} disabled={sending} style={{
            padding: "9px 20px", borderRadius: 10, border: "none",
            background: sending ? "var(--muted)" : "var(--primary)",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: sending ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 7,
            boxShadow: sending ? "none" : "0 2px 8px color-mix(in srgb, var(--primary) 35%, transparent)",
          }}>
            {sending
              ? <><i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} />Đang gửi...</>
              : <><i className="bi bi-send-fill" />Gửi thông báo</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Offcanvas ───────────────────────────────────────────────────────────
export function NotificationOffcanvas({ open, onClose, onUnreadChange, userRole, onOpenApproval }: Props) {
  const router = useRouter();
  const { data: session }              = useSession();
  const currentUserId                  = session?.user?.id ?? null;
  const { success, error: toastError, info } = useToast();
  const [view,       setView]     = useState<"list" | "detail">("list");
  const [notifs,     setNotifs]   = useState<NotifItem[]>([]);
  const [filtered,   setFiltered] = useState<NotifItem[]>([]);
  const [selected,   setSelected] = useState<NotifItem | null>(null);
  const [loading,    setLoading]  = useState(false);
  const [deleting,   setDeleting] = useState(false);
  const [showCreate, setCreate]   = useState(false);
  const [search,     setSearch]   = useState("");
  const [mounted,    setMounted]  = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState<Record<string, string>>({}); 
  const [interviewProcessed, setInterviewProcessed] = useState<Record<string, string>>({}); // { notificationId: decision }
  const [promotionProcessed, setPromotionProcessed] = useState<Record<string, string>>({}); // { notificationId: decision }
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineData, setDeclineData] = useState<{ candidateIds: string[], notificationId: string } | null>(null);
  const [showAttendanceDetail, setShowAttendanceDetail] = useState(false);
  const [attendanceDetailData, setAttendanceDetailData] = useState<any>(null);
  const [showPayrollDetail, setShowPayrollDetail] = useState(false);
  const [payrollDetailData, setPayrollDetailData] = useState<{employeeId: string, month: number, year: number} | null>(null);

  const canCreate = true; // Phân quyền sẽ quản lý trong Admin

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/notifications");
      const json = await res.json();
      if (res.ok) {
        setNotifs(json.notifications ?? []);
        onUnreadChange(json.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (open) { load(); setView("list"); setSearch(""); }
  }, [open, load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(notifs); return; }
    const q = search.toLowerCase();
    setFiltered(notifs.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    ));
  }, [notifs, search]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCreate) return;
        if (view === "detail") { setView("list"); return; }
        onClose();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, showCreate, view]);

  const markRead = async (item: NotifItem) => {
    if (!item.isRead) {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: item.recipientId }),
      });
      setNotifs(prev => prev.map(n =>
        n.recipientId === item.recipientId ? { ...n, isRead: true } : n
      ));
      onUnreadChange(notifs.filter(n => !n.isRead && n.recipientId !== item.recipientId).length);
    }
    setSelected(item);
    setView("detail");
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
      onUnreadChange(0);
      info("Đã đánh dấu tất cả đã đọc");
    } catch {
      toastError("Lỗi", "Không thể đánh dấu đã đọc");
    }
  };

  const deleteNotification = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi xóa thông báo");
      setNotifs(prev => prev.filter(n => n.id !== id));
      setView("list");
      setSelected(null);
      onUnreadChange(notifs.filter(n => !n.isRead && n.id !== id).length);
      success("Đã xóa thông báo");
    } catch (e: any) {
      toastError("Xóa thất bại", e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCandidateDecision = async (candidateId: string, decision: 'approve' | 'reject', notificationId: string) => {
    setDecidingId(candidateId);
    try {
      const res = await fetch("/api/hr/candidates/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, decision, notificationId }),
      });
      if (!res.ok) throw new Error("Thao tác thất bại");
      
      setProcessedIds(prev => ({ ...prev, [candidateId]: decision }));
      success(decision === 'approve' ? "Đã duyệt ứng viên" : "Đã từ chối ứng viên");
    } catch (e: any) {
      toastError("Lỗi", e.message);
    } finally {
      setDecidingId(null);
    }
  };

  const handleInterviewResponse = async (candidateIds: string[], decision: 'accept' | 'decline', notificationId: string, reason?: string) => {
    setDecidingId(notificationId); 
    try {
      const res = await fetch("/api/hr/candidates/interview-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds, decision, notificationId, reason }),
      });
      if (!res.ok) throw new Error("Phản hồi thất bại");
      
      setInterviewProcessed(prev => ({ ...prev, [notificationId]: decision }));
      success(decision === 'accept' ? "Đã xác nhận tham gia và thêm vào công việc cá nhân" : "Đã gửi thông báo từ chối");
      if (decision === 'decline') {
        setShowDeclineModal(false);
        setDeclineReason("");
      }
    } catch (e: any) {
      toastError("Lỗi", e.message);
    } finally {
      setDecidingId(null);
    }
  };

  const handlePromotionInterviewResponse = async (promotionId: string, role: string, decision: 'accept' | 'decline', notificationId: string) => {
    setDecidingId(notificationId);
    try {
      const res = await fetch("/api/hr/promotions/interview-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotionId, decision, role, notificationId }),
      });
      if (!res.ok) throw new Error("Phản hồi thất bại");
      setPromotionProcessed(prev => ({ ...prev, [notificationId]: decision }));
      success(decision === 'accept' ? "Đã xác nhận tham gia, đã thêm vào danh sách công việc" : "Đã gửi thông báo từ chối");
    } catch (e: any) {
      toastError("Lỗi", e.message);
    } finally {
      setDecidingId(null);
    }
  };

  const unreadCount = notifs.filter(n => !n.isRead).length;

  // ── List view ───────────────────────────────────────────────────────────────
  const listView = (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      transform: view === "list" ? "translateX(0)" : "translateX(-28px)",
      opacity: view === "list" ? 1 : 0,
      pointerEvents: view === "list" ? "auto" : "none",
      transition: "transform 0.25s ease, opacity 0.2s ease",
    }}>
      <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--muted)", borderRadius: 10, padding: "7px 12px", marginBottom: 8,
        }}>
          <i className="bi bi-search" style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm thông báo..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--foreground)", fontFamily: "inherit" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0, lineHeight: 1,
            }}>
              <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>
            {search ? `${filtered.length} kết quả` : unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã đọc"}
          </span>
          {unreadCount > 0 && !search && (
            <button onClick={markAllRead} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11.5, color: "var(--primary)", fontWeight: 600, padding: 0,
            }}>Đánh dấu tất cả đã đọc</button>
          )}
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--muted)", flexShrink: 0, animation: "pulse 1.5s infinite" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ height: 12, borderRadius: 4, background: "var(--muted)", width: "70%", animation: "pulse 1.5s infinite" }} />
                  <div style={{ height: 10, borderRadius: 4, background: "var(--muted)", width: "90%", animation: "pulse 1.5s infinite" }} />
                </div>
              </div>
            ))
          : filtered.length === 0
          ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted-foreground)" }}>
              <i className={`bi ${search ? "bi-search" : "bi-bell-slash"}`} style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
              <p style={{ fontSize: 13, margin: 0 }}>{search ? "Không tìm thấy thông báo nào" : "Không có thông báo nào"}</p>
            </div>
          )
          : filtered.map(item => {
            const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.info;
            return (
              <div key={item.recipientId} onClick={() => markRead(item)} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "13px 20px", borderBottom: "1px solid var(--border)",
                cursor: "pointer", position: "relative",
                background: item.isRead ? "transparent" : "color-mix(in srgb, var(--primary) 3%, var(--card))",
                transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = item.isRead ? "transparent" : "color-mix(in srgb, var(--primary) 3%, var(--card))"}
              >
                {!item.isRead && (
                  <span style={{ position: "absolute", top: 16, right: 14, width: 7, height: 7, borderRadius: "50%", background: "var(--primary)" }} />
                )}
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: 16 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: item.isRead ? 500 : 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>
                    {item.content}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4, opacity: 0.7 }}>
                    {timeAgo(item.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );

  // ── Detail view ─────────────────────────────────────────────────────────────
  const detailView = selected ? (() => {
    const cfg  = TYPE_CFG[selected.type]         ?? TYPE_CFG.info;
    const aud  = AUDIENCE_CFG[selected.audienceType] ?? AUDIENCE_CFG.all;
    const prio = PRIORITY_CFG[selected.priority]  ?? PRIORITY_CFG.normal;
    const senderInitials  = getInitials(selected.createdByName || "Hệ thống");
    const isOwner = currentUserId && selected.createdById === currentUserId;
    return (
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        transform: view === "detail" ? "translateX(0)" : "translateX(28px)",
        opacity: view === "detail" ? 1 : 0,
        pointerEvents: view === "detail" ? "auto" : "none",
        transition: "transform 0.25s ease, opacity 0.2s ease",
        overflowY: "auto",
      }}>
        {/* Back bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
          borderBottom: "1px solid var(--border)", flexShrink: 0,
          position: "sticky", top: 0, background: "var(--card)", zIndex: 1,
        }}>
          <button onClick={() => setView("list")} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--muted)", border: "none", borderRadius: 8,
            padding: "5px 12px 5px 8px", cursor: "pointer",
            color: "var(--muted-foreground)", fontSize: 12.5, fontWeight: 600,
            transition: "background 0.15s", flexShrink: 0,
          }}>
            <i className="bi bi-arrow-left" /> Quay lại
          </button>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected.title}
          </span>
          {isOwner && (
            <button
              onClick={() => deleteNotification(selected.id)}
              disabled={deleting}
              title="Xóa thông báo"
              style={{
                background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 8,
                width: 30, height: 30, cursor: deleting ? "not-allowed" : "pointer",
                color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0, transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.18)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"}
            >
              {deleting
                ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} />
                : <i className="bi bi-trash3-fill" />
              }
            </button>
          )}
        </div>

        <div style={{ padding: "18px 20px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Badges row */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7 }}>
            <div style={{ padding: "4px 10px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <i className={`bi ${cfg.icon}`} style={{ fontSize: 11 }} /> {cfg.label}
            </div>
            <div style={{ padding: "4px 10px", borderRadius: 20, background: prio.bg, color: prio.color, fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <i className={`bi ${prio.icon}`} style={{ fontSize: 11 }} /> {prio.label}
            </div>
            <div style={{ padding: "4px 10px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <i className={`bi ${aud.icon}`} style={{ fontSize: 11 }} /> {aud.label}
            </div>
          </div>

          {/* Title */}
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--foreground)", margin: 0, lineHeight: 1.4 }}>
            {selected.title}
          </h3>

          {/* Sender card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderRadius: 12,
            background: "var(--muted)",
            border: "1px solid var(--border)",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              background: "var(--primary)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 800,
            }}>
              {senderInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                {selected.createdByName}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 1 }}>
                {[selected.createdByPos, selected.createdByDept].filter(Boolean).join(" · ") || "Hệ thống"}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "right", flexShrink: 0 }}>
              <div>{new Date(selected.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
              <div style={{ marginTop: 2 }}>{new Date(selected.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>

          {/* Content */}
          <div style={{
            fontSize: 13.5, color: "var(--foreground)", lineHeight: 1.7,
            wordBreak: "break-word",
            padding: "14px 16px", borderRadius: 10,
            background: "color-mix(in srgb, var(--muted) 50%, var(--card))",
          }}>
            {renderContent(selected.content.split(/\[ATTENDANCE_DETAILS\]:|\[PAYROLL_DETAILS\]:/)[0])}
            
            {/* Attendance Details Button */}
            {selected.content.includes("[ATTENDANCE_DETAILS]:") && (
              <div style={{ marginTop: 12 }}>
                <BrandButton
                  icon="bi-calendar3"
                  className="w-100"
                  onClick={async () => {
                    const marker = selected.content.split("[ATTENDANCE_DETAILS]:")[1]?.split("\n")[0];
                    if (!marker) return;
                    try {
                      const data = JSON.parse(marker);
                      setLoading(true);
                      const res = await fetch(`/api/hr/attendance/detail?employeeId=${data.employeeId}&month=${data.month}&year=${data.year}`);
                      const json = await res.json();
                      if (res.ok) {
                        setAttendanceDetailData(json);
                        setShowAttendanceDetail(true);
                      } else {
                        toastError("Lỗi", json.error || "Không thể lấy dữ liệu chi tiết");
                      }
                    } catch (e) {
                      console.error("Parse error:", e);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Xem bảng công chi tiết
                </BrandButton>
              </div>
            )}

            {/* Payroll Details Button */}
            {selected.content.includes("[PAYROLL_DETAILS]:") && (
              <div style={{ marginTop: 12 }}>
                <BrandButton
                  icon="bi-cash-coin"
                  className="w-100"
                  onClick={() => {
                    const marker = selected.content.split("[PAYROLL_DETAILS]:")[1]?.split("\n")[0];
                    if (!marker) return;
                    try {
                      const data = JSON.parse(marker);
                      setPayrollDetailData(data);
                      setShowPayrollDetail(true);
                    } catch (e) {
                      console.error("Parse error:", e);
                    }
                  }}
                >
                  Xem chi tiết phiếu lương
                </BrandButton>
              </div>
            )}
          </div>

          {/* Attachments */}
          {selected.attachments && selected.attachments.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                File đính kèm ({selected.attachments.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selected.attachments.map((att: any, i) => {
                  const isAction = att.type === "recruitment_action";
                  const candidateId = att.candidateId;
                  const decision = processedIds[candidateId];

                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div 
                        onClick={() => {
                          if (att.url.startsWith("/")) {
                            router.push(att.url);
                            onClose();
                          } else {
                            window.open(att.url, "_blank");
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", borderRadius: 10, textDecoration: "none",
                          border: "1px solid var(--border)", background: "var(--card)",
                          transition: "background 0.15s", cursor: "pointer"
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "var(--card)"}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: "rgba(59,130,246,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <i className={`bi ${fileIcon(att.type)}`} style={{ color: "#3b82f6", fontSize: 17 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {att.name}
                          </div>
                          {att.size && (
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>
                              {formatFileSize(att.size)}
                            </div>
                          )}
                        </div>
                        <i className="bi bi-eye-fill" style={{ color: "var(--muted-foreground)", fontSize: 14, flexShrink: 0 }} />
                      </div>

                      {/* Nút Chi tiết đặc biệt cho Phê duyệt Tuyển dụng */}
                      {att.type === "recruitment_approval" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenApproval) {
                              onOpenApproval(att.approvalId, att.entityId);
                            }
                          }}
                          style={{
                            marginTop: 8,
                            width: "100%",
                            padding: "10px",
                            borderRadius: 10,
                            border: "none",
                            background: "var(--primary)",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            boxShadow: "0 4px 12px rgba(5, 150, 105, 0.2)",
                            cursor: "pointer"
                          }}
                        >
                          <i className="bi bi-shield-check" />
                          Mở trung tâm phê duyệt
                        </button>
                      )}

                      {/* Action Buttons for Dept Head */}
                      {isAction && candidateId && (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 8 }}>
                          {decision ? (
                            <div style={{ 
                              fontSize: 12, fontWeight: 700, 
                              color: decision === 'approve' ? "#166534" : "#991b1b",
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "4px 0"
                            }}>
                              <i className={`bi ${decision === 'approve' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                              {decision === 'approve' ? "ĐÃ DUYỆT PHỎNG VẤN" : "ĐÃ TỪ CHỐI HỒ SƠ"}
                            </div>
                          ) : (
                            <>
                              <button
                                disabled={decidingId === candidateId}
                                onClick={() => handleCandidateDecision(candidateId, 'approve', selected.id)}
                                style={{
                                  background: "#dcfce7", color: "#166534", border: "none",
                                  borderRadius: 6, padding: "6px 12px", fontSize: 11.5, fontWeight: 700,
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                                  transition: "opacity 0.15s"
                                }}
                              >
                                {decidingId === candidateId ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-check2" />}
                                Duyệt
                              </button>
                              <button
                                disabled={decidingId === candidateId}
                                onClick={() => handleCandidateDecision(candidateId, 'reject', selected.id)}
                                style={{
                                  background: "#fee2e2", color: "#991b1b", border: "none",
                                  borderRadius: 6, padding: "6px 12px", fontSize: 11.5, fontWeight: 700,
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                                  transition: "opacity 0.15s"
                                }}
                              >
                                {decidingId === candidateId ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-x-lg" />}
                                Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Action Buttons for Interview Invite */}
                      {att.type === "interview_invite" && att.candidateIds && (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 8 }}>
                          {interviewProcessed[selected.id] ? (
                            <div style={{ 
                              fontSize: 12, fontWeight: 700, 
                              color: interviewProcessed[selected.id] === 'accept' ? "#166534" : "#991b1b",
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "4px 0"
                            }}>
                              <i className={`bi ${interviewProcessed[selected.id] === 'accept' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                              {interviewProcessed[selected.id] === 'accept' ? "ĐÃ XÁC NHẬN THAM GIA" : "ĐÃ TỪ CHỐI"}
                            </div>
                          ) : (
                            <>
                              <button
                                disabled={decidingId === selected.id}
                                onClick={() => handleInterviewResponse(att.candidateIds, 'accept', selected.id)}
                                style={{
                                  background: "#e0f2fe", color: "#0369a1", border: "none",
                                  borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700,
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                                  transition: "all 0.15s", boxShadow: "0 2px 4px rgba(3,105,161,0.1)"
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#bae6fd"}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "#e0f2fe"}
                              >
                                {decidingId === selected.id ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-calendar-check-fill" />}
                                Đồng ý tham gia
                              </button>
                              <button
                                disabled={decidingId === selected.id}
                                onClick={() => {
                                  setDeclineData({ candidateIds: att.candidateIds, notificationId: selected.id });
                                  setShowDeclineModal(true);
                                }}
                                style={{
                                  background: "#fef2f2", color: "#991b1b", border: "none",
                                  borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700,
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                                  transition: "all 0.15s"
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"}
                              >
                                {decidingId === selected.id ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-calendar-x-fill" />}
                                Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Action Buttons for Promotion Interview */}
                      {att.type === "promotion_interview" && att.promotionId && (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 8 }}>
                          {promotionProcessed[selected.id] ? (
                            <div style={{ 
                              fontSize: 12, fontWeight: 700, 
                              color: promotionProcessed[selected.id] === 'accept' ? "#166534" : "#991b1b",
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "4px 0"
                            }}>
                              <i className={`bi ${promotionProcessed[selected.id] === 'accept' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                              {promotionProcessed[selected.id] === 'accept' ? "ĐÃ XÁC NHẬN THAM GIA" : "ĐÃ TỪ CHỐI"}
                            </div>
                          ) : (
                            <>
                              <button
                                disabled={decidingId === selected.id}
                                onClick={() => handlePromotionInterviewResponse(att.promotionId, att.role, 'accept', selected.id)}
                                style={{
                                  background: "#e0f2fe", color: "#0369a1", border: "none",
                                  borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700,
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                                  transition: "all 0.15s", boxShadow: "0 2px 4px rgba(3,105,161,0.1)"
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#bae6fd"}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "#e0f2fe"}
                              >
                                {decidingId === selected.id ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-calendar2-check-fill" />}
                                Đồng ý tham gia
                              </button>
                              <button
                                disabled={decidingId === selected.id}
                                onClick={() => handlePromotionInterviewResponse(att.promotionId, att.role, 'decline', selected.id)}
                                style={{
                                  background: "#fef2f2", color: "#991b1b", border: "none",
                                  borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700,
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                                  transition: "all 0.15s"
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"}
                              >
                                {decidingId === selected.id ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-calendar2-x-fill" />}
                                Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  })() : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin  { to { transform: rotate(360deg); } }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: open ? "rgba(0,0,0,0.3)" : "transparent",
        backdropFilter: open ? "blur(2px)" : "none",
        pointerEvents: open ? "auto" : "none",
        transition: "background 0.28s, backdrop-filter 0.28s",
      }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 9999,
        width: "min(400px, 100vw)",
        background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 16px", height: 62, flexShrink: 0,
          borderBottom: "1px solid var(--border)",
        }}>
          <i className="bi bi-bell-fill" style={{ fontSize: 15, color: "var(--primary)", flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--foreground)", flex: 1 }}>
            Thông báo
            {unreadCount > 0 && (
              <span style={{ marginLeft: 7, background: "#ef4444", color: "#fff", borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                {unreadCount}
              </span>
            )}
          </span>
          {canCreate && (
            <button onClick={() => setCreate(true)} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: 8, flexShrink: 0,
              padding: "6px 11px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", transition: "opacity 0.15s",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
            >
              <i className="bi bi-plus-lg" style={{ fontSize: 13 }} /> Tạo mới
            </button>
          )}
          <button onClick={onClose} style={{
            background: "var(--muted)", border: "none", borderRadius: 8, flexShrink: 0,
            width: 32, height: 32, cursor: "pointer", color: "var(--muted-foreground)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>
            <i className="bi bi-x" />
          </button>
        </div>

        {/* Slide container */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {listView}
          {detailView}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateNotifModal
          onClose={() => setCreate(false)}
          onCreated={() => load()}
        />
      )}

      {/* Decline Reason Modal */}
      {showDeclineModal && declineData && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 20000,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) setShowDeclineModal(false); }}>
          <div style={{
            background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 400,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", padding: 24, animation: "modalIn 0.2s ease"
          }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800 }}>Lý do từ chối phỏng vấn</h3>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Vui lòng nhập lý do để HR nắm thông tin..."
              rows={4}
              style={{
                width: "100%", padding: "12px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--background)", color: "var(--foreground)", outline: "none", fontSize: 13,
                fontFamily: "inherit", resize: "none"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowDeclineModal(false)}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13 }}
              >Hủy</button>
              <button
                disabled={!declineReason.trim() || decidingId === declineData.notificationId}
                onClick={() => handleInterviewResponse(declineData.candidateIds, 'decline', declineData.notificationId, declineReason)}
                style={{
                  background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px",
                  cursor: "pointer", fontSize: 13, fontWeight: 700
                }}
              >
                {decidingId === declineData.notificationId ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} /> : "Gửi từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Attendance Detail Modal */}
      {showAttendanceDetail && attendanceDetailData && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 20001,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setShowAttendanceDetail(false)}>
          <div style={{
            background: "var(--card)", borderRadius: 24, width: "100%", maxWidth: 650,
            maxHeight: "85vh", display: "flex", flexDirection: "column",
            boxShadow: "0 30px 90px rgba(0,0,0,0.4)", animation: "modalIn 0.25s ease",
            overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Bảng chấm công chi tiết</h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
                  Tháng {attendanceDetailData.month}/{attendanceDetailData.year} · {attendanceDetailData.employeeName}
                </p>
              </div>
              <button onClick={() => setShowAttendanceDetail(false)} style={{ background: "var(--muted)", border: "none", borderRadius: 10, width: 34, height: 34, cursor: "pointer", color: "var(--muted-foreground)" }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            
            <div style={{ overflowY: "auto", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--muted)", zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700 }}>Ngày</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700 }}>Sáng</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700 }}>Chiều</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700 }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceDetailData.days.map((d: any, i: number) => {
                    const isWeekend = d.isWeekend;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: isWeekend ? "rgba(0,0,0,0.02)" : "transparent" }}>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ fontWeight: 600 }}>{d.day}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{d.dow}</div>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                            {/* Sáng Vào */}
                            <div style={{ display: "flex", alignItems: "center", width: "fit-content", minWidth: 100 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, width: 45, textAlign: "right", marginRight: 8 }}>{d.checkInMorning || "—"}</span>
                              {d.details?.inM && (
                                <span style={{ fontSize: 9, color: d.details.inM.color, fontWeight: 700, opacity: 0.9 }}>
                                  ({d.details.inM.label} {d.details.inM.minutes}p)
                                </span>
                              )}
                            </div>
                            {/* Sáng Ra */}
                            <div style={{ display: "flex", alignItems: "center", width: "fit-content", minWidth: 100 }}>
                              <span style={{ fontSize: 12, width: 45, textAlign: "right", marginRight: 8, opacity: 0.6 }}>{d.checkOutMorning || "—"}</span>
                              {d.details?.outM && (
                                <span style={{ fontSize: 9, color: d.details.outM.color, fontWeight: 700, opacity: 0.8 }}>
                                  ({d.details.outM.label} {d.details.outM.minutes}p)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                            {/* Chiều Vào */}
                            <div style={{ display: "flex", alignItems: "center", width: "fit-content", minWidth: 100 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, width: 45, textAlign: "right", marginRight: 8 }}>{d.checkInAfternoon || "—"}</span>
                              {d.details?.inA && (
                                <span style={{ fontSize: 9, color: d.details.inA.color, fontWeight: 700, opacity: 0.9 }}>
                                  ({d.details.inA.label} {d.details.inA.minutes}p)
                                </span>
                              )}
                            </div>
                            {/* Chiều Ra */}
                            <div style={{ display: "flex", alignItems: "center", width: "fit-content", minWidth: 100 }}>
                              <span style={{ fontSize: 12, width: 45, textAlign: "right", marginRight: 8, opacity: 0.6 }}>{d.checkOutAfternoon || "—"}</span>
                              {d.details?.outA && (
                                <span style={{ fontSize: 9, color: d.details.outA.color, fontWeight: 700, opacity: 0.8 }}>
                                  ({d.details.outA.label} {d.details.outA.minutes}p)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            {d.statusLabel ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                <span style={{ 
                                  padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                                  background: d.statusColor + "20", color: d.statusColor, border: `1px solid ${d.statusColor}40`,
                                  whiteSpace: "nowrap"
                                }}>
                                  {d.statusLabel}
                                </span>
                                {d.workday > 0 && d.workday < 1.0 && (
                                  <span style={{ fontSize: 10, color: d.statusColor, fontWeight: 800 }}>
                                    Công: {d.workday.toFixed(2)}
                                  </span>
                                )}
                                {d.isAttendanceViolation && (
                                  <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, marginTop: 2 }}>
                                    (Lỗi quên chấm thẻ)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "var(--muted-foreground)", opacity: 0.4 }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ fontSize: 12 }}><span style={{ fontWeight: 700 }}>{attendanceDetailData.totalWorkDays}</span> công</div>
                <div style={{ fontSize: 12 }}><span style={{ fontWeight: 700 }}>{attendanceDetailData.totalLeave}</span> phép</div>
                <div style={{ fontSize: 12 }}><span style={{ fontWeight: 700 }}>{attendanceDetailData.totalOT}</span> OT</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <BrandButton 
                  variant="outline" 
                  onClick={() => setShowAttendanceDetail(false)}
                >
                  Đóng
                </BrandButton>
                <BrandButton 
                  icon="bi-check-circle-fill"
                  loading={loading}
                  onClick={async () => {
                    if (!attendanceDetailData) return;
                    try {
                      setLoading(true);
                      const res = await fetch("/api/hr/attendance/confirm", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          employeeId: attendanceDetailData.employeeId,
                          month: Number(attendanceDetailData.month),
                          year: Number(attendanceDetailData.year)
                        })
                      });
                      if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || "Xác nhận thất bại");
                      }
                      
                      setShowAttendanceDetail(false);
                      success("Đã xác nhận bảng công thành công!");
                    } catch (error: any) {
                      toastError("Lỗi", error.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Xác nhận dữ liệu
                </BrandButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {payrollDetailData && (
        <PayrollDetailModal
          open={showPayrollDetail}
          onClose={() => setShowPayrollDetail(false)}
          employeeId={payrollDetailData.employeeId}
          month={payrollDetailData.month}
          year={payrollDetailData.year}
        />
      )}
    </>,
    document.body
  );
}
