"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { ToastProvider } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  masterOnly: boolean;
  badge?: string;
  desc?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  masterOnly?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { name: "Tổng quan", href: "/admin/dashboard", icon: "bi-speedometer2", masterOnly: false, desc: "Thống kê hệ thống" },
    ],
    masterOnly: false,
  },
  {
    label: "Quản lý",
    items: [
      { name: "Khách hàng",           href: "/admin/clients",     icon: "bi-buildings",      masterOnly: true,  desc: "Doanh nghiệp khách hàng" },
      { name: "Quản lý Nhân sự",   href: "/admin/employees",   icon: "bi-people",         masterOnly: false, desc: "Danh sách nhân viên" },
      { name: "Phòng ban",          href: "/admin/departments", icon: "bi-diagram-3",      masterOnly: false, desc: "Cơ cấu tổ chức" },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { name: "Phân quyền",         href: "/admin/roles",       icon: "bi-shield-lock",    masterOnly: false, desc: "Quyền truy cập" },
      { name: "Thiết kế hệ thống", href: "/login",             icon: "bi-palette",        masterOnly: true,  desc: "Trang đăng nhập & giao diện" },
    ],
  },
];

const SIDEBAR_W = 260;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session, status: authStatus } = useSession();
  const isChildProject = !!process.env.NEXT_PUBLIC_CLIENT_SHORT_NAME || (session?.user as any)?.clientId;

  const filteredGroups = navGroups
    .filter(g => !(isChildProject && g.masterOnly))
    .map(g => ({
      ...g,
      items: g.items.filter(item => !(isChildProject && item.masterOnly)),
    }))
    .filter(g => g.items.length > 0);

  if (authStatus === "loading") return null;

  if (!session) {
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    window.location.href = loginUrl.toString();
    return null;
  }

  if (!["ADMIN", "SUPERADMIN"].includes(session?.user?.role as string)) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{
          maxWidth: 380, width: "100%", padding: 40, borderRadius: 24,
          background: "var(--card)", border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="bi bi-shield-x" style={{ color: "#ef4444", fontSize: 28 }} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: "0 0 6px" }}>Không có quyền truy cập</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
              Tài khoản <strong>{session?.user?.email}</strong> không có quyền Admin.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <Link href="/login?callbackUrl=/admin" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "11px 20px", borderRadius: 12,
              background: "var(--primary)", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none",
            }}>
              <i className="bi bi-box-arrow-in-right" /> Đăng nhập Admin
            </Link>
            <Link href="/api/auth/signout?callbackUrl=/login" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "11px 20px", borderRadius: 12,
              background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>
              <i className="bi bi-door-open" /> Đăng xuất
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--background)" }}>

        {/* TOPBAR */}
        <Topbar onToggleSidebar={() => setIsCollapsed(!isCollapsed)} />

        {/* Spacer — độ cao topbar */}
        <div style={{ height: 62, flexShrink: 0 }} />

        {/* BODY */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* SIDEBAR */}
          <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 0 : SIDEBAR_W }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="admin-sidebar"
            style={{ height: "100%", flexShrink: 0, overflow: "hidden", minWidth: 0 }}
          >
            <div style={{ width: SIDEBAR_W, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Navigation */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
                {filteredGroups.map((group) => (
                  <div key={group.label} style={{ marginBottom: 4 }}>
                    {/* Group label */}
                    <p style={{
                      margin: "12px 0 4px 8px",
                      fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                      letterSpacing: "0.14em", color: "var(--muted-foreground)", opacity: 0.5,
                    }}>
                      {group.label}
                    </p>

                    {/* Items */}
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/admin" && item.href !== "/admin/dashboard" && pathname.startsWith(item.href)) ||
                        (item.href === "/admin/dashboard" && pathname === "/admin/dashboard");

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          title={item.name}
                          className={cn(
                            "admin-nav-item",
                            isActive ? "admin-nav-item-active" : ""
                          )}
                        >
                          <span className={cn("admin-nav-icon", isActive ? "admin-nav-icon-active" : "")}>
                            <i className={`bi ${item.icon}`} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              margin: 0, fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                              color: isActive ? "var(--primary)" : "var(--foreground)",
                              lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {item.name}
                            </p>
                            {item.desc && (
                              <p style={{
                                margin: 0, fontSize: 10.5,
                                color: isActive ? "color-mix(in srgb, var(--primary) 70%, transparent)" : "var(--muted-foreground)",
                                lineHeight: 1.3, opacity: 0.8,
                              }}>
                                {item.desc}
                              </p>
                            )}
                          </div>
                          {isActive && (
                            <span style={{
                              width: 4, height: 4, borderRadius: "50%",
                              background: "var(--primary)", flexShrink: 0,
                            }} />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              {/* Footer */}
              <div className="admin-sidebar-footer">
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 12,
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className={`bi ${isChildProject ? "bi-building" : "bi-cpu"}`}
                      style={{ fontSize: 14, color: "var(--primary)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isChildProject ? (session?.user?.clientName || "Doanh nghiệp") : "EOS Master Platform"}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>
                      {isChildProject ? "Client Admin Panel" : "v1.0.0 · Master Admin"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Main Content */}
          <main className="admin-main" style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="admin-page-content"
              >
                {children}
              </motion.div>

            </AnimatePresence>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
