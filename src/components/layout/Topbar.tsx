"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountSettingsModal } from "./AccountSettingsModal";
import { NotificationOffcanvas } from "./NotificationOffcanvas";
import { MessageOffcanvas } from "./MessageOffcanvas";
import { ApprovalBadgeButton, ApprovalCenter } from "@/components/approvals/ApprovalCenter";

interface TopbarProps {
  onToggleSidebar: () => void;
}

interface CompanyInfo {
  name: string;
  shortName: string;
  logoUrl?: string | null;
  slogan?: string | null;
}

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
  SUPERADMIN: "Quản trị hệ thống",
  ADMIN: "Quản trị viên",
  USER: "Nhân viên",
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [msgOpen,   setMsgOpen]         = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [logoLoadError,  setLogoLoadError]  = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* ── Click outside đóng dropdown ── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Fetch thông tin công ty từ DB (không dùng session, không cache) ── */
  useEffect(() => {
    fetch("/api/company", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d?.name) setCompany(d); })
      .catch(() => {});
  }, []);

  /* ── Tải badge số thông báo & tin nhắn (polling 30s) ── */
  useEffect(() => {
    const fetchCounts = () => {
      fetch("/api/notifications")
        .then(r => r.json())
        .then(d => { if (d.unreadCount !== undefined) setUnreadCount(d.unreadCount); })
        .catch(() => {});
      fetch("/api/messages")
        .then(r => r.json())
        .then(d => { if (d.unreadCount !== undefined) setUnreadMsgCount(d.unreadCount); })
        .catch(() => {});
    };
    fetchCounts(); // Lần đầu
    const interval = setInterval(fetchCounts, 10_000); // Cứ 10s refresh
    return () => clearInterval(interval);
  }, []);

  /* ── Session info ── */
  const rawUserName       = session?.user?.name || session?.user?.email || "Khách";
  const userRole          = session?.user?.role || "";
  const userPositionName  = (session?.user as any)?.positionName || "";
  const userPosition      = (session?.user as any)?.position || "";
  const userDept          = (session?.user as any)?.departmentCode || "";
  const displayClientName = company?.name || "EOS";
  const clientLogoUrl     = company?.logoUrl || null;

  /* Rút gọn tên hiển thị */
  const userName = rawUserName.includes(" – ")
    ? rawUserName.split(" – ").pop()?.trim() || rawUserName
    : rawUserName.includes(" - ")
    ? rawUserName.split(" - ").pop()?.trim() || rawUserName
    : rawUserName;

  /* Logo */

  /* Avatar initials */
  const words       = userName.trim().split(/\s+/);
  const userInitial = words.length >= 2
    ? (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
    : words[0].charAt(0).toUpperCase();

  const logoInitial = displayClientName.charAt(0).toUpperCase();

  // Ưu tiên: tên chức vụ từ danh mục > role label > mặc định
  const displayTitle = userPositionName || ROLE_LABEL[userRole] || userRole || "Thành viên";
  const displayDept  = DEPT_LABEL[userDept] || "";

  return (
    <header className="app-topbar" style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1030,
      height: 62, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px", borderBottom: "1px solid var(--border)",
      background: "var(--background)",
    }}>

      {/* ── LEFT ── */}
      <div className="d-flex align-items-center gap-2">

        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          id="topbar-sidebar-toggle"
          title="Toggle sidebar"
          style={{
            width: 38, height: 38, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 10, border: "none", background: "transparent",
            color: "var(--muted-foreground)", cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <i className="bi bi-list" style={{ fontSize: 22 }} />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 26, background: "var(--border)", opacity: 0.6, flexShrink: 0, margin: "0 4px" }} />

        {/* Brand */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo box */}
          <div className="topbar-logo-box">
            {clientLogoUrl && !logoLoadError ? (
              <img
                src={clientLogoUrl}
                alt={displayClientName}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={() => setLogoLoadError(true)}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)", fontWeight: 900, fontSize: 16,
              }}>
                {logoInitial}
              </div>
            )}
          </div>

          {/* Brand text — ẩn trên màn nhỏ */}
          <div className="d-none d-md-flex flex-column" style={{ gap: 0 }}>
            <span className="topbar-brand-name">{displayClientName}</span>
          </div>
        </Link>
      </div>

      {/* ── RIGHT ── */}
      <div className="d-flex align-items-center gap-1">

        {/* Theme toggle */}
        <div style={{
          width: 38, height: 38,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 10,
        }}>
          <ThemeToggle />
        </div>

        {/* Notification */}
        <button
          id="topbar-notif-btn"
          title="Thông báo"
          onClick={() => { setNotifOpen(true); setMsgOpen(false); setUserMenuOpen(false); }}
          style={{
            position: "relative", width: 38, height: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 10, border: "none", background: "transparent",
            color: "var(--muted-foreground)", cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <i className="bi bi-bell" style={{ fontSize: 18 }} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 3, right: 3,
              minWidth: 18, height: 18, borderRadius: 99,
              background: "#f43f5e", border: "2px solid var(--background)",
              color: "#fff", fontSize: 10, fontWeight: 900,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px", lineHeight: 1,
            }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Approval Center */}
        <ApprovalBadgeButton onClick={() => { setApprovalOpen(true); setNotifOpen(false); setMsgOpen(false); setUserMenuOpen(false); }} />

        {/* Messages */}
        <button
          id="topbar-msg-btn"
          title="Tin nhắn"
          onClick={() => { setMsgOpen(true); setNotifOpen(false); setApprovalOpen(false); setUserMenuOpen(false); }}
          style={{
            position: "relative", width: 38, height: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 10, border: "none", background: "transparent",
            color: "var(--muted-foreground)", cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <i className="bi bi-chat-dots" style={{ fontSize: 17 }} />
          {unreadMsgCount > 0 && (
            <span style={{
              position: "absolute", top: 3, right: 3,
              minWidth: 18, height: 18, borderRadius: 99,
              background: "#6366f1", border: "2px solid var(--background)",
              color: "#fff", fontSize: 10, fontWeight: 900,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px", lineHeight: 1,
            }}>
              {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 26, background: "var(--border)", opacity: 0.5, margin: "0 6px", flexShrink: 0 }} />

        {/* ── User Menu ── */}
        <div style={{ position: "relative" }} ref={userMenuRef}>
          <button
            id="topbar-user-btn"
            onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); setMsgOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 8px 4px 4px",
              borderRadius: 12, border: "none", background: "transparent",
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #06b6d4, #10b981)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 12, fontWeight: 900,
              boxShadow: "0 0 10px rgba(6,182,212,0.35)",
            }}>
              {userInitial}
            </div>
            {/* Tên + Chức danh — ẩn trên mobile */}
            <div className="d-none d-md-flex flex-column align-items-start" style={{ gap: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
                {userName}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500, lineHeight: 1.3 }}>
                {displayTitle}
              </span>
            </div>
            <i
              className="bi bi-chevron-down"
              style={{
                fontSize: 11, color: "var(--muted-foreground)", opacity: 0.5,
                transition: "transform 0.2s",
                transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {/* ══ Dropdown ══ */}
          {userMenuOpen && (
            <div className="user-dropdown" style={{ zIndex: 9999 }}>

              {/* Header */}
              <div className="user-dropdown-header">
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", margin: "0 auto 10px",
                  background: "linear-gradient(135deg, #06b6d4, #10b981)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 18, fontWeight: 900,
                }}>
                  {userInitial}
                </div>
                <p className="user-dropdown-name">{userName}</p>
                {displayDept  && <p className="user-dropdown-sub">{displayDept}</p>}
                {displayTitle && <p className="user-dropdown-sub">{displayTitle}</p>}
              </div>

              {/* Thiết lập tài khoản */}
              <div className="user-dropdown-section">
                <button
                  className="user-dropdown-item"
                  onClick={() => { setIsSettingsOpen(true); setUserMenuOpen(false); }}
                >
                  <i className="bi bi-gear-fill user-dropdown-icon" />
                  <span>Thiết lập tài khoản</span>
                </button>
              </div>

              {/* Admin panel — phân biệt SUPERADMIN (master) và ADMIN (client) */}
              {(userRole === "SUPERADMIN" || userRole === "ADMIN") && (
                <div className="user-dropdown-section">
                  <Link
                    href={userRole === "SUPERADMIN" ? "/admin" : "/company"}
                    className="user-dropdown-item"
                    style={{ textDecoration: "none" }}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <i className="bi bi-shield-check user-dropdown-icon" />
                    <span>Trang quản trị</span>
                  </Link>
                </div>
              )}

              {/* Đăng xuất */}
              <div className="user-dropdown-section">
                <button
                  className="user-dropdown-item user-dropdown-item-danger"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <i className="bi bi-box-arrow-right user-dropdown-icon" />
                  <span>Đăng xuất</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      <AccountSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <NotificationOffcanvas
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadChange={setUnreadCount}
        userRole={userRole}
      />

      <MessageOffcanvas
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        onUnreadChange={setUnreadMsgCount}
      />

      <ApprovalCenter
        mode="drawer"
        isOpen={approvalOpen}
        onClose={() => setApprovalOpen(false)}
      />
    </header>
  );
}
