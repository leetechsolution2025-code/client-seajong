"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MsgItem {
  participantId: string;
  id: string;
  content: string;
  attachments: Array<{ name: string; url: string; size?: number; type?: string; }>;
  isDeleted: boolean;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  recipientCount: number;
  senderId: string | null;
  senderName: string;
  senderDept: string | null;
  senderPos: string | null;
  partnerUserId: string | null;  // người còn lại trong hội thoại
}

interface ThreadMsg {
  id: string;
  content: string;
  attachments: Array<{ name: string; url: string; size?: number; type?: string; }>;
  createdAt: string;
  senderId: string | null;
  senderName: string;
  isSentByMe: boolean;
  isRead: boolean;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  position: string | null;
  department: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
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

const AVATAR_COLORS: [string, string][] = [
  ["#6366f1", "rgba(99,102,241,0.15)"],
  ["#8b5cf6", "rgba(139,92,246,0.15)"],
  ["#ec4899", "rgba(236,72,153,0.15)"],
  ["#10b981", "rgba(16,185,129,0.15)"],
  ["#f59e0b", "rgba(245,158,11,0.15)"],
  ["#3b82f6", "rgba(59,130,246,0.15)"],
  ["#06b6d4", "rgba(6,182,212,0.15)"],
  ["#ef4444", "rgba(239,68,68,0.15)"],
];

function avatarColor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] as [string, string];
}

// ─── Send Message Sheet (bên trong panel, không phải modal riêng) ─────────────
interface Attachment { name: string; url: string; size?: number; type?: string; }

/** Chuyển File thành data URL (base64) để dùng khi server upload thất bại */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileIcon(type?: string) {
  if (!type) return "bi-paperclip";
  if (type.includes("pdf"))   return "bi-file-earmark-pdf-fill";
  if (type.includes("image")) return "bi-file-earmark-image-fill";
  if (type.includes("word") || type.includes("doc")) return "bi-file-earmark-word-fill";
  if (type.includes("sheet") || type.includes("excel") || type.includes("xls")) return "bi-file-earmark-excel-fill";
  if (type.includes("zip") || type.includes("rar")) return "bi-file-earmark-zip-fill";
  return "bi-file-earmark-fill";
}
function fmtSize(b?: number) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  const isImage = att.type?.startsWith("image/");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--muted)", borderRadius: 8, padding: isImage ? "3px 8px 3px 4px" : "4px 8px 4px 6px", maxWidth: 190 }}>
      {isImage
        ? <img src={att.url} alt={att.name} style={{ width: 28, height: 28, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
        : <i className={`bi ${fileIcon(att.type)}`} style={{ fontSize: 14, color: "#6366f1", flexShrink: 0 }} />
      }
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontSize: 11.5, fontWeight: 600, color: "var(--foreground)" }}>{att.name}</span>
      {att.size && <span style={{ fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }}>{fmtSize(att.size)}</span>}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

/** Render attachments bên trong bubble chat */
function AttachmentBubble({ attachments }: { attachments: Attachment[]; sent: boolean }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
      {attachments.map((att, i) => {
        const isImage = att.type?.startsWith("image/") || att.url?.startsWith("data:image");
        if (isImage) {
          return (
            <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none" }}>
              <img src={att.url} alt={att.name} style={{ maxWidth: 200, maxHeight: 160, borderRadius: 6, objectFit: "cover", display: "block" }} />
              <div style={{ fontSize: 10, marginTop: 2, color: "#555" }}>{att.name}</div>
            </a>
          );
        }
        return (
          <a key={i} href={att.url} download={att.name} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(0,0,0,0.06)", borderRadius: 6, padding: "6px 8px", textDecoration: "none", color: "#2a2a4a" }}>
            <i className={`bi ${fileIcon(att.type)}`} style={{ fontSize: 20, flexShrink: 0, color: "#4b6cb7" }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#2a2a4a" }}>{att.name}</div>
              {att.size && <div style={{ fontSize: 10, color: "#777" }}>{fmtSize(att.size)}</div>}
            </div>
            <i className="bi bi-download" style={{ fontSize: 13, color: "#555", flexShrink: 0 }} />
          </a>
        );
      })}
    </div>
  );
}

// ─── Send Message Sheet ────────────────────────────────────────────────────────
interface SendSheetProps {
  users: UserOption[];
  loading: boolean;
  onBack: () => void;
  onBackAll: () => void;
  onSent: () => void;
  onSentToUser?: (userId: string) => void;   // navigate vào thread sau khi gửi 1-1
}

function SendSheet({ users, loading, onBack, onBackAll, onSent, onSentToUser }: SendSheetProps) {
  const { success, error: toastError } = useToast();
  const [isGroupMode,  setIsGroupMode]  = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [composing,    setComposing]    = useState(false);
  const [targetUser,   setTargetUser]   = useState<UserOption | null>(null);
  const [msgContent,   setMsgContent]   = useState("");
  const [attachments,  setAttachments]  = useState<Attachment[]>([]);
  const [uploading,    setUploading]    = useState(false);
  const [sending,      setSending]      = useState(false);
  const sendingRef  = useRef(false);   // guard chống double-send
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.department || "").toLowerCase().includes(q)
      || (u.position  || "").toLowerCase().includes(q);
  });

  // Group by dept
  const grouped: Record<string, UserOption[]> = {};
  filteredUsers.forEach(u => {
    const key = u.department || "Khác";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(u);
  });

  const toggleUser = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectUser = (u: UserOption) => {
    if (isGroupMode) {
      toggleUser(u.id);
    } else {
      setTargetUser(u);
      setComposing(true);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  };

  const handleStartGroupChat = () => {
    if (selectedIds.length === 0) return;
    setComposing(true);
    setTargetUser(null);
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res  = await fetch("/api/upload/file", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          uploaded.push({ name: file.name, url: json.url, size: file.size, type: file.type });
        } else {
          // Fallback: dùng base64 để embed thẳng vào nội dung tin nhắn
          const base64 = await fileToBase64(file);
          uploaded.push({ name: file.name, url: base64, size: file.size, type: file.type });
        }
      }
      setAttachments(prev => [...prev, ...uploaded]);
    } catch {
      for (const file of files) {
        const base64 = await fileToBase64(file).catch(() => "");
        if (base64) setAttachments(prev => [...prev, { name: file.name, url: base64, size: file.size, type: file.type }]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Send ─────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    // Guard: chống double-send (Enter + button click đồng thời)
    if (sendingRef.current) return;
    if (!msgContent.trim() && attachments.length === 0) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const audienceType  = isGroupMode ? "group" : "individual";
      const audienceValue = isGroupMode ? JSON.stringify(selectedIds) : (targetUser?.id || "");
      const res  = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content:      msgContent.trim() || "(File đính kèm)",
          audienceType,
          audienceValue,
          attachments:  attachments.length > 0 ? attachments : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi gửi tin nhắn");
      setMsgContent(""); setAttachments([]);
      onSent();
      // 1-1: navigate thẳng vào thread; nhóm: quay về list
      if (!isGroupMode && targetUser && onSentToUser) {
        onSentToUser(targetUser.id);
      } else {
        onBack();
      }
    } catch (e: any) {
      toastError("Gửi thất bại", e.message || "Lỗi không xác định");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  // ── Compose sub-view ──────────────────────────────────────────────────────────
  if (composing) {
    const recipientLabel = isGroupMode ? `${selectedIds.length} người` : (targetUser?.name || "");
    const recipientSub   = isGroupMode
      ? users.filter(u => selectedIds.includes(u.id)).map(u => u.name.split(" ").pop()).join(", ")
      : (targetUser?.position ? `${targetUser.position}${targetUser.department ? ` · ${targetUser.department}` : ""}` : targetUser?.department || "");

    const canSend = !sending && (msgContent.trim().length > 0 || attachments.length > 0);

    return (
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", inset: 0, overflow: "hidden" }}>
        {/* Recipient info bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "var(--background)" }}>
          {isGroupMode ? (
            <div style={{ display: "flex", flexShrink: 0 }}>
              {selectedIds.slice(0, 3).map((id, i) => {
                const u = users.find(x => x.id === id);
                if (!u) return null;
                const [clr, bg] = avatarColor(u.name);
                return (
                  <div key={id} style={{ width: 30, height: 30, borderRadius: "50%", background: bg, color: clr, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, marginLeft: i > 0 ? -8 : 0, border: "2px solid var(--card)" }}>
                    {getInitials(u.name)}
                  </div>
                );
              })}
              {selectedIds.length > 3 && (
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--muted)", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, marginLeft: -8, border: "2px solid var(--card)" }}>
                  +{selectedIds.length - 3}
                </div>
              )}
            </div>
          ) : (() => {
            const [clr, bg] = avatarColor(targetUser?.name || "");
            return (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: bg, color: clr, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                {getInitials(targetUser?.name || "?")}
              </div>
            );
          })()}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipientLabel}</div>
            {recipientSub && <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipientSub}</div>}
          </div>
        </div>

        {/* Chat area (empty state) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", gap: 10, color: "var(--muted-foreground)", overflow: "hidden" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-chat-heart" style={{ fontSize: 26, color: "#6366f1" }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, textAlign: "center" }}>Bắt đầu cuộc trò chuyện</p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65, textAlign: "center" }}>Soạn tin nhắn đến {recipientLabel}</p>
        </div>

        {/* Input area */}
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", background: "var(--card)" }}>
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px 0" }}>
              {attachments.map((att, i) => (
                <AttachmentChip key={i} att={att} onRemove={() => setAttachments(prev => prev.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}

          {/* Toolbar + textarea row */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "8px 12px 10px" }}>
            {/* File button */}
            <input ref={fileInputRef} type="file" multiple accept="*/*" onChange={handleFileChange} style={{ display: "none" }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Đính kèm file"
              style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "var(--muted)", color: uploading ? "var(--muted-foreground)" : "#6366f1", cursor: uploading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}
              onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.12)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--muted)"; }}
            >
              {uploading
                ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite", fontSize: 15 }} />
                : <i className="bi bi-paperclip" style={{ fontSize: 16 }} />
              }
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={msgContent}
              onChange={e => {
                setMsgContent(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={e => {
                // Chặn IME composition (tiếng Việt)
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSend();
                }
              }}
              placeholder="Nhập tin nhắn... (Enter gửi, Shift+Enter xuống dòng)"
              rows={1}
              style={{
                flex: 1, padding: "8px 13px", borderRadius: 18,
                background: "var(--muted)", border: "1.5px solid transparent",
                color: "var(--foreground)", fontSize: 13.5, fontFamily: "inherit",
                outline: "none", resize: "none", lineHeight: 1.5, minHeight: 36,
                transition: "border-color 0.15s, background 0.15s",
                overflow: "hidden",
              }}
              onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "var(--background)"; }}
              onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "var(--muted)"; }}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: canSend ? "#6366f1" : "var(--muted)",
                border: "none", cursor: canSend ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: canSend ? "#fff" : "var(--muted-foreground)",
                transition: "all 0.15s",
                boxShadow: canSend ? "0 2px 10px rgba(99,102,241,0.4)" : "none",
              }}
            >
              {sending
                ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite", fontSize: 14 }} />
                : <i className="bi bi-send-fill" style={{ fontSize: 14 }} />
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Contact picker ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 20, padding: "8px 13px", marginBottom: isGroupMode && selectedIds.length > 0 ? 10 : 0 }}>
          <i className="bi bi-search" style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={isGroupMode ? "Tìm thành viên nhóm..." : "Tìm người nhắn tin..."}
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13.5, color: "var(--foreground)", fontFamily: "inherit" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0 }}>
              <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
            </button>
          )}
        </div>

        {/* Selected group members tags */}
        {isGroupMode && selectedIds.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {selectedIds.map(id => {
              const u = users.find(x => x.id === id);
              if (!u) return null;
              const [clr, bg] = avatarColor(u.name);
              return (
                <span key={id} style={{ display: "flex", alignItems: "center", gap: 5, background: bg, color: clr, borderRadius: 9999, padding: "3px 10px 3px 6px", fontSize: 12, fontWeight: 700 }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: clr, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
                    {getInitials(u.name)}
                  </span>
                  {u.name.split(" ").pop()}
                  <button onClick={() => toggleUser(id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", fontSize: 14, lineHeight: 1, opacity: 0.7 }}>×</button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Group mode toggle + action */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: isGroupMode ? "rgba(99,102,241,0.04)" : "transparent" }}>
        <button
          onClick={() => { setIsGroupMode(v => !v); setSelectedIds([]); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, background: "none",
            border: "none", cursor: "pointer", padding: "4px 0",
            color: isGroupMode ? "#6366f1" : "var(--muted-foreground)",
            fontSize: 13, fontWeight: 600, transition: "color 0.15s",
          }}
        >
          {/* Toggle switch */}
          <div style={{
            width: 36, height: 20, borderRadius: 10,
            background: isGroupMode ? "#6366f1" : "var(--muted)",
            position: "relative", transition: "background 0.2s", flexShrink: 0,
            border: isGroupMode ? "none" : "1.5px solid var(--border)",
          }}>
            <div style={{
              position: "absolute", top: isGroupMode ? 2 : 1.5, left: isGroupMode ? 18 : 1.5,
              width: 16, height: 16, borderRadius: "50%",
              background: isGroupMode ? "#fff" : "var(--muted-foreground)",
              transition: "left 0.2s, background 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>
          <i className={`bi ${isGroupMode ? "bi-people-fill" : "bi-person-fill"}`} style={{ fontSize: 14 }} />
          {isGroupMode ? "Nhắn tin nhóm" : "Nhắn cá nhân"}
        </button>

        {isGroupMode && selectedIds.length > 0 && (
          <button
            onClick={handleStartGroupChat}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#6366f1", color: "#fff", border: "none",
              borderRadius: 20, padding: "6px 14px", fontSize: 12.5, fontWeight: 700,
              cursor: "pointer", animation: "fadeIn 0.15s ease",
              boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
            }}
          >
            <i className="bi bi-chat-fill" style={{ fontSize: 12 }} />
            Tiếp tục ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Contact list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--muted)", flexShrink: 0, animation: "pulse 1.5s infinite" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ height: 12, borderRadius: 4, background: "var(--muted)", width: "50%", animation: "pulse 1.5s infinite" }} />
                <div style={{ height: 10, borderRadius: 4, background: "var(--muted)", width: "70%", animation: "pulse 1.5s infinite" }} />
              </div>
            </div>
          ))
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted-foreground)" }}>
            <i className="bi bi-search" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: 13 }}>Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, "vi")).map(([dept, deptUsers]) => (
            <div key={dept}>
              {/* Dept header */}
              <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", letterSpacing: "0.07em", textTransform: "uppercase", background: "var(--background)", position: "sticky", top: 0, zIndex: 1, borderBottom: "1px solid var(--border)" }}>
                <i className="bi bi-building" style={{ marginRight: 6, opacity: 0.7 }} />
                {dept}
                <span style={{ marginLeft: 6, opacity: 0.5, fontWeight: 500 }}>({deptUsers.length})</span>
              </div>

              {deptUsers.map(u => {
                const [clr, bg] = avatarColor(u.name);
                const checked   = selectedIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 16px", cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                      background: checked ? "rgba(99,102,241,0.05)" : "transparent",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = checked ? "rgba(99,102,241,0.05)" : "transparent"; }}
                  >
                    {/* Checkbox (group mode only) */}
                    {isGroupMode && (
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        border: checked ? "none" : "2px solid var(--border)",
                        background: checked ? "#6366f1" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                        {checked && <i className="bi bi-check" style={{ color: "#fff", fontSize: 12, fontWeight: 900 }} />}
                      </div>
                    )}

                    {/* Avatar */}
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                      background: checked ? "#6366f1" : bg,
                      color: checked ? "#fff" : clr,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, fontWeight: 800,
                      transition: "all 0.15s",
                      boxShadow: checked ? "0 2px 8px rgba(99,102,241,0.35)" : "none",
                    }}>
                      {getInitials(u.name)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: checked ? 700 : 600, color: checked ? "#6366f1" : "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.15s" }}>
                        {u.name}
                      </div>
                      {u.position && (
                        <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                          {u.position}
                        </div>
                      )}
                    </div>

                    {/* Arrow (single mode) / badge (group mode) */}
                    {!isGroupMode ? (
                      <i className="bi bi-chevron-right" style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.4, flexShrink: 0 }} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
// ─── Detail Reply Bar ─────────────────────────────────────────────────────────
interface DetailReplyBarProps {
  replyTargetId: string | null;
  onNewMessage: (content: string, attachments: Attachment[]) => void;
}

function DetailReplyBar({ replyTargetId, onNewMessage }: DetailReplyBarProps) {
  const { success, error: toastError } = useToast();
  const [content,     setContent]     = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const [sending,     setSending]     = useState(false);
  const sendingRef  = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = !sending && (content.trim().length > 0 || attachments.length > 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload/file", {
          method: "POST", body: form, credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setAttachments(prev => [...prev, { name: file.name, url: json.url, size: file.size, type: file.type }]);
        } else {
          const base64 = await fileToBase64(file);
          setAttachments(prev => [...prev, { name: file.name, url: base64, size: file.size, type: file.type }]);
        }
      }
    } catch {
      for (const file of files) {
        const base64 = await fileToBase64(file).catch(() => "");
        if (base64) setAttachments(prev => [...prev, { name: file.name, url: base64, size: file.size, type: file.type }]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    if (!content.trim() && attachments.length === 0) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content:      content.trim() || "(File đính kèm)",
          audienceType: replyTargetId ? "individual" : "all",
          audienceValue: replyTargetId ?? "",
          attachments:  attachments.length > 0 ? attachments : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi gửi");
      const sentText = content.trim() || "";
      onNewMessage(sentText, attachments);  // hiện ngay trong chat
      setContent(""); setAttachments([]);
      if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    } catch (e: any) {
      toastError("Gửi thất bại", e.message);
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  return (
    <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", background: "var(--card)" }}>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px 0" }}>
          {attachments.map((att, i) => (
            <AttachmentChip key={i} att={att} onRemove={() => setAttachments(prev => prev.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "8px 12px 10px" }}>
        {/* File button */}
        <input ref={fileInputRef} type="file" multiple accept="*/*" onChange={handleFileChange} style={{ display: "none" }} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Đính kèm file"
          style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "var(--muted)", color: uploading ? "var(--muted-foreground)" : "#6366f1", cursor: uploading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}
          onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.12)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--muted)"; }}
        >
          {uploading
            ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite", fontSize: 14 }} />
            : <i className="bi bi-paperclip" style={{ fontSize: 15 }} />
          }
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => {
            setContent(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={e => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); e.stopPropagation(); handleSend();
            }
          }}
          placeholder={replyTargetId ? "Trả lời... (Enter gửi)" : "Soạn tin nhắn tiếp theo..."}
          rows={1}
          style={{
            flex: 1, padding: "7px 12px", borderRadius: 18, minHeight: 34,
            background: "var(--muted)", border: "1.5px solid transparent",
            color: "var(--foreground)", fontSize: 13.5, fontFamily: "inherit",
            outline: "none", resize: "none", lineHeight: 1.5,
            transition: "border-color 0.15s, background 0.15s", overflow: "hidden",
          }}
          onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "var(--background)"; }}
          onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "var(--muted)"; }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: canSend ? "#6366f1" : "var(--muted)",
            border: "none", cursor: canSend ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: canSend ? "#fff" : "var(--muted-foreground)",
            transition: "all 0.15s",
            boxShadow: canSend ? "0 2px 10px rgba(99,102,241,0.4)" : "none",
          }}
        >
          {sending
            ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite", fontSize: 13 }} />
            : <i className="bi bi-send-fill" style={{ fontSize: 13 }} />
          }
        </button>
      </div>
    </div>
  );
}

// ─── Main Offcanvas ───────────────────────────────────────────────────────────
export function MessageOffcanvas({ open, onClose, onUnreadChange }: Props) {
  const { data: session }           = useSession();
  const currentUserId               = session?.user?.id ?? null;
  const { info, error: toastError } = useToast();

  type View = "list" | "send" | "detail";
  const [view,        setView]        = useState<View>("list");
  const [messages,    setMessages]    = useState<MsgItem[]>([]);
  const [filtered,    setFiltered]    = useState<MsgItem[]>([]);
  const [selected,    setSelected]    = useState<MsgItem | null>(null);
  const [localReplies, setLocalReplies] = useState<Array<{content: string; createdAt: string; attachments: Attachment[]}>>([]);
  const [thread,       setThread]       = useState<ThreadMsg[]>([]);
  const [threadLoading,setThreadLoading]= useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [loading,     setLoading]     = useState(false);
  const [usersLoading,setUsersLoading]= useState(false);
  const [users,       setUsers]       = useState<UserOption[]>([]);
  const [search,      setSearch]      = useState("");
  const [mounted,     setMounted]     = useState(false);
  const prevOpen = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/messages");
      const json = await res.json();
      if (res.ok) {
        setMessages(json.messages ?? []);
        onUnreadChange(json.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  const loadUsers = useCallback(async () => {
    if (users.length > 0) return;
    setUsersLoading(true);
    try {
      const res  = await fetch("/api/notifications/recipients");
      const json = await res.json();
      setUsers(json.users ?? []);
    } finally {
      setUsersLoading(false);
    }
  }, [users.length]);

  // Load messages khi panel mở lần đầu (dùng ref để tránh re-run khi load thay đổi reference)
  useEffect(() => {
    if (open && !prevOpen.current) {
      load();
      setView("list");
      setSearch("");
    }
    prevOpen.current = open;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!search.trim()) { setFiltered(messages); return; }
    const q = search.toLowerCase();
    setFiltered(messages.filter(m =>
      m.content.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q)
    ));
  }, [messages, search]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "send")   { setView("list"); return; }
        if (view === "detail") { setView("list"); return; }
        onClose();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, view]);

  const [sendKey, setSendKey] = useState(0);   // reset SendSheet mỗi lần mở

  const openSend = () => {
    loadUsers();
    setSendKey(k => k + 1);   // force remount SendSheet → xoá state cũ (composing, targetUser)
    setView("send");
  };

  const loadThread = useCallback(async (partnerUserId: string) => {
    setThreadLoading(true);
    try {
      const res  = await fetch(`/api/messages/conversation?with=${encodeURIComponent(partnerUserId)}`);
      const json = await res.json();
      if (res.ok) setThread(json.thread ?? []);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // Scroll xuống cuối thread khi có tin mới
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [thread.length, localReplies.length, selected]);

  const markRead = async (item: MsgItem) => {
    if (!item.isRead) {
      await fetch("/api/messages/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: item.participantId }),
      });
      setMessages(prev => prev.map(m =>
        m.participantId === item.participantId ? { ...m, isRead: true } : m
      ));
      onUnreadChange(messages.filter(m => !m.isRead && m.participantId !== item.participantId).length);
    }
    // Reset trước khi mở hội thoại mới
    setLocalReplies([]);
    setThread([]);
    setSelected(item);
    setView("detail");
    // Load toàn bộ lịch sử nếu biết partner
    if (item.partnerUserId) {
      loadThread(item.partnerUserId);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/messages/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
      onUnreadChange(0);
      info("Đã đánh dấu tất cả đã đọc");
    } catch {
      toastError("Lỗi", "Không thể đánh dấu đã đọc");
    }
  };

  const unreadCount  = messages.filter(m => !m.isRead).length;
  const isSentByMe   = (item: MsgItem) => item.senderId === currentUserId;

  // ── Slide helpers ────────────────────────────────────────────────────────────
  const slideStyle = (active: boolean, dir: "left" | "right" = "right") => ({
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    flexDirection: "column" as const,
    transform: active ? "translateX(0)" : dir === "right" ? "translateX(32px)" : "translateX(-32px)",
    opacity: active ? 1 : 0,
    pointerEvents: (active ? "auto" : "none") as "auto" | "none",
    transition: "transform 0.25s ease, opacity 0.2s ease",
  });

  // ── Header title config ──────────────────────────────────────────────────────
  const headerConfig = {
    list:   { title: "Tin nhắn nội bộ", backBtn: null,         action: <button onClick={openSend} style={{ display: "flex", alignItems: "center", gap: 5, background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, flexShrink: 0, padding: "6px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(99,102,241,0.3)", transition: "opacity 0.15s" }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}><i className="bi bi-pencil-square" style={{ fontSize: 12 }} /> Soạn tin</button> },
    send:   { title: "Tin nhắn mới", backBtn: () => setView("list"), action: null },
    detail: { title: selected ? (isSentByMe(selected) ? "Tin đã gửi" : `Từ ${selected.senderName}`) : "", backBtn: () => setView("list"), action: null },
  };
  const hc = headerConfig[view];

  // ── List View ────────────────────────────────────────────────────────────────
  const listView = (
    <div style={slideStyle(view === "list", "left")}>
      <div style={{ padding: "10px 16px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 20, padding: "7px 13px", marginBottom: 8 }}>
          <i className="bi bi-search" style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm tin nhắn..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--foreground)", fontFamily: "inherit" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0 }}><i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} /></button>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>
            {search ? `${filtered.length} kết quả` : unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã đọc"}
          </span>
          {unreadCount > 0 && !search && (
            <button onClick={markAllRead} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "#6366f1", fontWeight: 600, padding: 0 }}>
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--muted)", flexShrink: 0, animation: "pulse 1.5s infinite" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ height: 12, borderRadius: 4, background: "var(--muted)", width: "55%", animation: "pulse 1.5s infinite" }} />
                  <div style={{ height: 10, borderRadius: 4, background: "var(--muted)", width: "80%", animation: "pulse 1.5s infinite" }} />
                </div>
              </div>
            ))
          : filtered.length === 0
          ? (
            <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--muted-foreground)" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <i className={`bi ${search ? "bi-search" : "bi-chat-slash"}`} style={{ fontSize: 30, color: "#6366f1", opacity: 0.6 }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>{search ? "Không tìm thấy" : "Chưa có tin nhắn"}</p>
              <p style={{ fontSize: 12, margin: 0, opacity: 0.6 }}>{search ? "Thử từ khóa khác" : "Nhấn «Soạn tin» để bắt đầu"}</p>
            </div>
          )
          : filtered.map(item => {
            const sent = isSentByMe(item);
            const [clr, bg] = avatarColor(item.senderName);
            return (
              <div key={item.participantId} onClick={() => markRead(item)} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderBottom: "1px solid var(--border)",
                cursor: "pointer", position: "relative",
                background: item.isRead ? "transparent" : "color-mix(in srgb, #6366f1 3%, var(--card))",
                transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = item.isRead ? "transparent" : "color-mix(in srgb, #6366f1 3%, var(--card))"}
              >
                {!item.isRead && <span style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }} />}

                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: sent ? "rgba(99,102,241,0.12)" : bg, color: sent ? "#6366f1" : clr, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, border: sent ? "2px solid rgba(99,102,241,0.25)" : "2px solid transparent" }}>
                    {sent ? <i className="bi bi-person-fill" style={{ fontSize: 18 }} /> : getInitials(item.senderName)}
                  </div>
                  {sent && (
                    <div style={{ position: "absolute", bottom: 0, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#6366f1", border: "2px solid var(--card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="bi bi-arrow-up" style={{ fontSize: 8, color: "#fff" }} />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: item.isRead ? 500 : 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sent ? "Bạn" : item.senderName}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", flexShrink: 0, opacity: 0.65 }}>
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: item.isRead ? "var(--muted-foreground)" : "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: item.isDeleted ? "italic" : "normal", opacity: item.isDeleted ? 0.5 : item.isRead ? 0.7 : 1 }}>
                    {sent && <span style={{ color: "#6366f1", fontWeight: 600 }}>Bạn: </span>}
                    {item.content}
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );

  // ── Send View ────────────────────────────────────────────────────────────────
  const sendView = (
    <div style={slideStyle(view === "send")}>
      <SendSheet
        key={sendKey}
        users={users}
        loading={usersLoading}
        onBack={() => setView("list")}
        onBackAll={() => setView("list")}
        onSent={() => load()}
        onSentToUser={(_uid) => {
          // Load lại list và quay về - tin vừa gửi sẽ xuất hiện ở đầu danh sách
          load();
          setView("list");
        }}
      />
    </div>
  );

  // ── Detail View ──────────────────────────────────────────────────────────────
  const detailView = selected ? (() => {
    const sent = isSentByMe(selected);
    const [clr, bg] = avatarColor(selected.senderName);

    // Người nhận khi reply:
    // - Tin của người khác gửi cho mình → reply lại senderId
    // - Tin mình gửi → không có recipientId rõ ràng (broadcast), giữ nguyên cho user soạn
    const replyTargetId = !sent ? selected.senderId : null;

    return (
      <div style={slideStyle(view === "detail")}>
        {/* Header info */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--card)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: sent ? "rgba(99,102,241,0.12)" : bg, color: sent ? "#6366f1" : clr, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, border: `2px solid ${sent ? "rgba(99,102,241,0.25)" : "transparent"}` }}>
              {sent ? <i className="bi bi-person-fill" style={{ fontSize: 17 }} /> : getInitials(selected.senderName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--foreground)" }}>
                {sent ? "Bạn (Người gửi)" : selected.senderName}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>
                {sent
                  ? `Đã gửi đến ${selected.recipientCount - 1} người · ${new Date(selected.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}`
                  : [selected.senderPos, selected.senderDept].filter(Boolean).join(" · ") || "—"
                }
              </div>
            </div>
            {selected.isRead
              ? <div style={{ padding: "3px 8px", borderRadius: 20, background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 10.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}><i className="bi bi-check2-all" style={{ fontSize: 10 }} /> Đã đọc</div>
              : <div style={{ padding: "3px 8px", borderRadius: 20, background: "rgba(99,102,241,0.1)", color: "#6366f1", fontSize: 10.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}><i className="bi bi-circle-fill" style={{ fontSize: 6 }} /> Mới</div>
            }
          </div>
        </div>

        {/* ── Chat thread area ─────────────────────────────────────────── */}
        <div ref={chatScrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "14px 16px 10px", display: "flex", flexDirection: "column", gap: 6, background: "#f2f3f5" }}>

          {/* Loading skeleton */}
          {threadLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: i % 2 === 0 ? "flex-end" : "flex-start" }}>
                  {i % 2 !== 0 && <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--muted)", flexShrink: 0 }} />}
                  <div style={{ width: i === 2 ? 160 : 100, height: 38, borderRadius: 14, background: "var(--muted)", opacity: 0.5, animation: "pulse 1.5s ease infinite" }} />
                </div>
              ))}
            </div>
          )}

          {/* Không có thread: chỉ hiện single selected message (vd: tin nhắn nhóm / broadcast) */}
          {!threadLoading && thread.length === 0 && (() => {
            const sent = isSentByMe(selected);
            return (
              <div style={{ marginBottom: 2 }}>
                <div style={{ fontSize: 10.5, color: "#888", textAlign: "center", margin: "8px 0 4px", fontWeight: 500 }}>
                  {new Date(selected.createdAt).toLocaleString("vi-VN", { weekday: "long", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}
                </div>
                {!sent && (
                  <div style={{ fontSize: 11, color: "#666", fontWeight: 600, marginLeft: 34, marginBottom: 2 }}>
                    {selected.senderName}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, justifyContent: sent ? "flex-end" : "flex-start" }}>
                  {!sent ? (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: avatarColor(selected.senderName)[1], color: avatarColor(selected.senderName)[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
                      {getInitials(selected.senderName)}
                    </div>
                  ) : null}

                  <div style={{
                    maxWidth: "72%",
                    padding: "7px 11px",
                    borderRadius: 6,
                    background: sent ? "#d6e9ff" : "#fff",
                    color: "#1a1a2e",
                    fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    border: sent ? "1px solid #b8d4f8" : "1px solid #e0e0e0",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}>
                    {selected.content && selected.content !== "(File đính kèm)" && selected.content}
                    <AttachmentBubble attachments={selected.attachments ?? []} sent={sent} />
                  </div>
                </div>
                {/* Timestamp */}
                <div style={{
                  fontSize: 10, color: "#aaa", marginTop: 2,
                  textAlign: sent ? "right" : "left",
                  paddingLeft: sent ? 0 : 34,
                  paddingRight: sent ? 2 : 0,
                }}>
                  {new Date(selected.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  {sent && <i className={`bi ${selected.isRead ? "bi-check2-all" : "bi-check2"}`} style={{ marginLeft: 3 }} />}
                </div>
              </div>
            );
          })()}

          {/* Thread messages từ server */}
          {!threadLoading && thread.length > 0 && (() => {
            let lastDate = "";
            return thread.map((msg, i) => {
              const dateStr = new Date(msg.createdAt).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
              const showDate = dateStr !== lastDate;
              lastDate = dateStr;
              const [clr, bg] = avatarColor(msg.senderName);
              const showAvatar = !msg.isSentByMe && (i === thread.length - 1 || thread[i + 1]?.isSentByMe);
              const showName   = !msg.isSentByMe && (i === 0 || thread[i - 1]?.isSentByMe);
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div style={{ fontSize: 10.5, color: "#888", textAlign: "center", margin: "8px 0 4px", fontWeight: 500 }}>
                      {dateStr}
                    </div>
                  )}
                  {/* Wrapper đầy đủ width */}
                  <div style={{ marginBottom: 2 }}>
                    {showName && (
                      <div style={{ fontSize: 11, color: "#666", fontWeight: 600, marginLeft: 34, marginBottom: 2 }}>
                        {msg.senderName}
                      </div>
                    )}
                    {/* Bubble row */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, justifyContent: msg.isSentByMe ? "flex-end" : "flex-start" }}>
                      {/* Avatar (chỉ tin nhận, chỉ ở tin cuối block) */}
                      {!msg.isSentByMe && (
                        showAvatar
                          ? <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: bg, color: clr, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
                              {getInitials(msg.senderName)}
                            </div>
                          : <div style={{ width: 26, flexShrink: 0 }} />
                      )}
                      {/* Bubble */}
                      <div style={{
                        maxWidth: "72%",
                        padding: "7px 11px",
                        borderRadius: 6,
                        background: msg.isSentByMe ? "#d6e9ff" : "#fff",
                        color: "#1a1a2e",
                        fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
                        border: msg.isSentByMe ? "1px solid #b8d4f8" : "1px solid #e0e0e0",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        animation: "fadeIn 0.15s ease",
                      }}>
                        {msg.content && msg.content !== "(File đính kèm)" && msg.content}
                        <AttachmentBubble attachments={msg.attachments} sent={msg.isSentByMe} />
                      </div>
                    </div>
                    {/* Timestamp — paddingLeft để indent với avatar */}
                    <div style={{
                      fontSize: 10, color: "#aaa", marginTop: 2,
                      textAlign: msg.isSentByMe ? "right" : "left",
                      paddingLeft: msg.isSentByMe ? 0 : 34,
                      paddingRight: msg.isSentByMe ? 2 : 0,
                    }}>
                      {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      {msg.isSentByMe && <i className={`bi ${msg.isRead ? "bi-check2-all" : "bi-check2"}`} style={{ marginLeft: 3 }} />}
                    </div>
                  </div>
                </React.Fragment>
              );
            });
          })()}

          {/* Optimistic local replies (chưa có trong thread) */}
          {localReplies.map((r, i) => (
            <div key={`local-${i}`} style={{ marginBottom: 2 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <div style={{
                  maxWidth: "72%",
                  padding: "7px 11px",
                  borderRadius: 6,
                  background: "#d6e9ff",
                  color: "#1a1a2e",
                  fontSize: 14, lineHeight: 1.55,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  border: "1px solid #b8d4f8",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  animation: "fadeIn 0.15s ease",
                }}>
                  {r.content}
                  <AttachmentBubble attachments={r.attachments} sent={true} />
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 2, textAlign: "right", paddingRight: 2 }}>
                {new Date(r.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                <i className="bi bi-check2" style={{ marginLeft: 3 }} />
              </div>
            </div>
          ))}


        </div>

        {/* Reply input bar */}
        <DetailReplyBar
          replyTargetId={replyTargetId}
          onNewMessage={(text, atts) => setLocalReplies(prev => [...prev, { content: text, createdAt: new Date().toISOString(), attachments: atts }])}
        />
      </div>
    );
  })() : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes pulse  { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", height: 62, flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
          {hc.backBtn ? (
            <button onClick={hc.backBtn} style={{ background: "var(--muted)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--muted) 60%, var(--border))"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "var(--muted)"}
            >
              <i className="bi bi-arrow-left" />
            </button>
          ) : (
            <i className="bi bi-chat-dots-fill" style={{ fontSize: 15, color: "#6366f1", flexShrink: 0 }} />
          )}

          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--foreground)", flex: 1 }}>
            {hc.title}
            {view === "list" && unreadCount > 0 && (
              <span style={{ marginLeft: 7, background: "#6366f1", color: "#fff", borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                {unreadCount}
              </span>
            )}
          </span>

          {hc.action}

          <button onClick={onClose} style={{ background: "var(--muted)", border: "none", borderRadius: 8, flexShrink: 0, width: 32, height: 32, cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            <i className="bi bi-x" />
          </button>
        </div>

        {/* Slide container */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {listView}
          {sendView}
          {detailView}
        </div>
      </div>
    </>,
    document.body
  );
}
