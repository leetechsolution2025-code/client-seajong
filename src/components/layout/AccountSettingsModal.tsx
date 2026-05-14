"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useAnimationPrefs } from "@/hooks/useAnimationPrefs";

interface AccountSettingsModalProps { isOpen: boolean; onClose: () => void; }

const DEPT_LABEL: Record<string, string> = {
  hr: "Phòng Nhân sự", it: "Phòng CNTT", finance: "Phòng Tài chính",
  sales: "Phòng Kinh doanh", marketing: "Phòng Marketing", legal: "Phòng Pháp chế",
  board: "Ban Giám đốc", exec: "Văn phòng TGĐ", admin_ops: "Hành chính – VP",
  ops: "Phòng Vận hành", logistics: "Kho vận", purchase: "Phòng Mua hàng",
  qa: "Đảm bảo chất lượng", rd: "Nghiên cứu & PT", production: "Sản xuất",
  facility: "Kỹ thuật – CSVC", security: "Bảo vệ – An ninh",
  bd: "Phát triển KD", cs: "CSKH", pr: "Quan hệ công chúng", product: "Sản phẩm",
};
const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: "Quản trị hệ thống", ADMIN: "Quản trị viên", USER: "Nhân viên",
};

type Tab = "profile" | "security" | "appearance";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className="border-0 p-0 flex-shrink-0"
      style={{ width: 46, height: 26, borderRadius: 13, cursor: "pointer", background: checked ? "var(--primary)" : "var(--muted)", position: "relative", transition: "background 0.2s" }}>
      <span style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.18)", transition: "left 0.2s" }} />
    </button>
  );
}

function PwField({ value, onChange, placeholder }: { value: string | null; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="d-flex align-items-center rounded-3" style={{ height: 44, border: "1px solid var(--border)", background: "var(--card)", overflow: "hidden" }}>
      <input type={show ? "text" : "password"} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder || "••••••••"}
        className="border-0 flex-grow-1 h-100 px-3"
        style={{ outline: "none", background: "transparent", color: "var(--foreground)", fontSize: 14 }} />
      <button className="border-0 px-3 h-100" style={{ background: "transparent", color: "var(--muted-foreground)", cursor: "pointer" }} onClick={() => setShow(!show)}>
        <i className={`bi bi-${show ? "eye-slash" : "eye"}`} style={{ fontSize: 15 }} />
      </button>
    </div>
  );
}

export function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [mounted, setMounted] = useState(false);
  const [hoverEffect, setHoverEffect] = useState(true);
  const [autoDark, setAutoDark] = useState(false);
  const { prefs: animPrefs, setPrefs: setAnimPrefs } = useAnimationPrefs();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (session?.user?.name) setEditName(session.user.name); }, [session]);
  if (!isOpen || !mounted) return null;

  const userName     = session?.user?.name || session?.user?.email || "Admin User";
  const userEmail    = session?.user?.email || "";
  const userRole     = session?.user?.role || "";
  const userPosition = (session?.user as any)?.position || "";
  const userDeptCode = (session?.user as any)?.departmentCode || "";
  const words        = userName.trim().split(/\s+/);
  const userInitial  = words.length >= 2 ? (words[0][0] + words[words.length-1][0]).toUpperCase() : words[0][0].toUpperCase();
  const displayTitle = userPosition || ROLE_LABEL[userRole] || "Thành viên";
  const displayDept  = DEPT_LABEL[userDeptCode] || "";

  const showMsg = (type: "ok" | "err", text: string) => { setMsg({type, text}); setTimeout(() => setMsg(null), 3500); };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, phone: editPhone }) });
      if (res.ok) { await update(); showMsg("ok", "Đã lưu thay đổi!"); }
      else { const d = await res.json(); showMsg("err", d.error || "Lỗi khi lưu"); }
    } catch { showMsg("err", "Không thể kết nối máy chủ"); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { showMsg("err", "Mật khẩu xác nhận không khớp"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/user/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }) });
      if (res.ok) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); showMsg("ok", "Đổi mật khẩu thành công!"); }
      else { const d = await res.json(); showMsg("err", d.error || "Lỗi đổi mật khẩu"); }
    } catch { showMsg("err", "Không thể kết nối máy chủ"); }
    finally { setSaving(false); }
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "profile", label: "Hồ sơ", icon: "bi-person" },
    { key: "security", label: "Bảo mật", icon: "bi-shield" },
    { key: "appearance", label: "Giao diện", icon: "bi-sliders2" },
  ];

  const inputStyle: React.CSSProperties = { width: "100%", height: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--border)", fontSize: 14, color: "var(--foreground)", background: "var(--card)", outline: "none", boxSizing: "border-box" };
  const inputROStyle: React.CSSProperties = { ...inputStyle, background: "var(--muted)", opacity: 0.7, cursor: "not-allowed" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8 };

  const modal = (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="d-flex flex-column" style={{ width: "100%", maxWidth: 520, borderRadius: 28, background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
        onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div className="d-flex align-items-center justify-content-between" style={{ padding: "22px 28px 18px" }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-gear" style={{ fontSize: 18, color: "var(--muted-foreground)" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>Thiết lập tài khoản</span>
          </div>
          <button onClick={onClose} className="border-0 p-0" style={{ background: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="d-flex gap-4" style={{ borderBottom: "1px solid var(--border)", padding: "0 28px" }}>
          {tabs.map(({ key, label, icon }) => {
            const active = activeTab === key;
            return (
              <button key={key} onClick={() => { setActiveTab(key); setMsg(null); }}
                className="border-0 p-0 d-flex align-items-center gap-2"
                style={{ padding: "10px 2px", marginBottom: -1, borderBottom: `2px solid ${active ? "var(--primary)" : "transparent"}`, color: active ? "var(--primary)" : "var(--muted-foreground)", fontWeight: active ? 700 : 500, fontSize: 13.5, background: "none", cursor: "pointer" }}>
                <i className={`bi ${icon}`} style={{ fontSize: 14 }} /> {label}
              </button>
            );
          })}
        </div>

        {/* Toast */}
        {msg && (
          <div className="mx-4 mt-3 d-flex align-items-center gap-2 rounded-3 px-3 py-2"
            style={{ background: msg.type === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.type === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, color: msg.type === "ok" ? "#10b981" : "#ef4444", fontSize: 13, fontWeight: 600 }}>
            <i className={`bi bi-${msg.type === "ok" ? "check-circle-fill" : "exclamation-circle-fill"}`} />
            {msg.text}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: "24px 28px 20px", minHeight: 320 }}>

          {/* ── Hồ sơ ── */}
          {activeTab === "profile" && (
            <div>
              <div className="d-flex align-items-center gap-4 mb-4">
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#06b6d4,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 900 }}>
                    {userInitial}
                  </div>
                  <button style={{ position: "absolute", bottom: 2, right: 2, width: 26, height: 26, borderRadius: "50%", background: "var(--primary)", color: "#fff", border: "2px solid var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="bi bi-camera-fill" style={{ fontSize: 11 }} />
                  </button>
                </div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>{userName}</p>
                  {displayDept  && <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>{displayDept}</p>}
                  {displayTitle && <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "2px 0 0", opacity: 0.7 }}>{displayTitle}</p>}
                </div>
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <label style={labelStyle}>Họ và tên</label>
                  <input type="text" value={editName ?? ""} onChange={e => setEditName(e.target.value)} style={inputStyle} />
                </div>
                <div className="col-6">
                  <label style={labelStyle}>Phòng ban</label>
                  <input type="text" value={displayDept ?? ""} readOnly style={inputROStyle} />
                </div>
                <div className="col-6">
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={userEmail ?? ""} readOnly style={inputROStyle} />
                </div>
                <div className="col-6">
                  <label style={labelStyle}>Số điện thoại</label>
                  <input type="text" value={editPhone ?? ""} onChange={e => setEditPhone(e.target.value)} placeholder="Chưa cập nhật" style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* ── Bảo mật ── */}
          {activeTab === "security" && (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-start gap-2 rounded-3 p-3" style={{ background: "rgba(var(--bs-primary-rgb,79,70,229),0.08)", border: "1px solid rgba(var(--bs-primary-rgb,79,70,229),0.2)" }}>
                <i className="bi bi-info-circle-fill flex-shrink-0 mt-1" style={{ color: "var(--primary)", fontSize: 16 }} />
                <p style={{ fontSize: 13.5, color: "var(--foreground)", margin: 0, lineHeight: 1.6, opacity: 0.85 }}>Mật khẩu phải có ít nhất <strong>8 ký tự</strong>, bao gồm chữ hoa, chữ thường và số.</p>
              </div>
              <div>
                <label style={labelStyle}>Mật khẩu hiện tại</label>
                <PwField value={currentPw} onChange={setCurrentPw} />
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <label style={labelStyle}>Mật khẩu mới</label>
                  <PwField value={newPw} onChange={setNewPw} />
                </div>
                <div className="col-6">
                  <label style={labelStyle}>Xác nhận mật khẩu mới</label>
                  <PwField value={confirmPw} onChange={setConfirmPw} />
                </div>
              </div>
            </div>
          )}

          {/* ── Giao diện ── */}
          {activeTab === "appearance" && (
            <div className="d-flex flex-column gap-3">
              {[
                { label: "Hiệu ứng hover trên thẻ card",     desc: "Bật/tắt hiệu ứng di chuyển và bóng đổ khi rê chuột lên card", checked: hoverEffect,                    onChange: () => setHoverEffect(!hoverEffect) },
                { label: "Tự động đổi chế độ theo giờ",        desc: "Dark mode theo khung giờ đã cài, còn lại là light",                           checked: autoDark,                       onChange: () => setAutoDark(!autoDark) },
              ].map(({ label, desc, checked, onChange }) => (
                <div key={label} className="d-flex align-items-center justify-content-between rounded-3 p-3" style={{ border: "1px solid var(--border)", background: "var(--muted)" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: "4px 0 0", lineHeight: 1.5 }}>{desc}</p>
                  </div>
                  <Toggle checked={checked} onChange={onChange} />
                </div>
              ))}

              {/* Divider */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", marginBottom: 10 }}>
                  Hiệu ứng chuyển trang
                </p>
                {([
                  {
                    label: "Hiệu ứng chuyển trang",
                    desc:  "Fade + trượt nhẹ khi điều hướng giữa các trang",
                    key:   "pageTransition" as const,
                  },
                  {
                    label: "Hiệu ứng mở/đóng sidebar",
                    desc:  "Slide + thu gọn mh sidebar khi ẩn/hiện",
                    key:   "sidebarMotion" as const,
                  },
                ] as { label: string; desc: string; key: keyof typeof animPrefs }[]).map(({ label, desc, key }) => (
                  <div key={key} className="d-flex align-items-center justify-content-between rounded-3 p-3 mb-2" style={{ border: "1px solid var(--border)", background: "var(--muted)" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: "4px 0 0", lineHeight: 1.5 }}>{desc}</p>
                    </div>
                    <Toggle
                      checked={animPrefs[key]}
                      onChange={() => setAnimPrefs({ [key]: !animPrefs[key] })}
                    />
                  </div>
                ))}
              </div>

              <p className="d-flex align-items-center gap-2 mb-0" style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>
                <i className="bi bi-lightning-charge-fill" style={{ fontSize: 13 }} />
                Thay đổi có hiệu lực ngay, không cần lưu.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="d-flex justify-content-end gap-2" style={{ padding: "16px 28px 24px", borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} className="btn btn-outline-secondary px-4" style={{ borderRadius: 12 }}>Đóng</button>
          {activeTab === "profile" && (
            <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary px-4" style={{ borderRadius: 12 }}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          )}
          {activeTab === "security" && (
            <button onClick={handleChangePassword} disabled={saving || !currentPw || !newPw || !confirmPw} className="btn btn-primary px-4" style={{ borderRadius: 12 }}>
              {saving ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
