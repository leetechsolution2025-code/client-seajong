"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { ToastProvider } from "@/components/ui/Toast";
import { Topbar } from "@/components/layout/Topbar";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  desc?: string;
}

const navItems: NavItem[] = [
  { name: "Tổng quan",          href: "/company",             icon: "bi-speedometer2",     desc: "Dashboard" },
  { name: "Thông tin công ty",  href: "/company/profile",     icon: "bi-building",         desc: "CompanyInfo" },
  { name: "Chi nhánh",          href: "/company/branches",    icon: "bi-geo-alt",          desc: "Branch CRUD" },
  { name: "Nhân viên",          href: "/company/employees",   icon: "bi-people",           desc: "Employee + User" },
  { name: "Phòng ban",          href: "/company/departments", icon: "bi-diagram-3",        desc: "Các phòng ban" },
  { name: "Tài khoản",          href: "/company/accounts",    icon: "bi-person-gear",      desc: "Đổi pass, tạo admin" },
  { name: "Phân quyền",         href: "/company/permissions", icon: "bi-shield-lock",      desc: "Phân quyền người dùng" },
];

const SIDEBAR_W = 260;

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    router.push("/login");
    return null;
  }

  if (!["ADMIN", "SUPERADMIN"].includes(session.user?.role as string)) {
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
              Tài khoản <strong>{session.user?.email}</strong> không có quyền Admin công ty.
            </p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{
            width: "100%", padding: "11px 20px", borderRadius: 12, border: "none",
            background: "var(--primary)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>
            <i className="bi bi-box-arrow-left" /> Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--background)" }}>
        <Topbar onToggleSidebar={() => setIsCollapsed(!isCollapsed)} />
        <div style={{ height: 62, flexShrink: 0 }} />

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
              {/* Nav */}
              <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
                <p style={{ margin: "12px 0 4px 8px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted-foreground)", opacity: 0.5 }}>
                  QUẢN TRỊ CÔNG TY
                </p>
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/company" && pathname.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href} className={`admin-nav-item${isActive ? " admin-nav-item-active" : ""}`}>
                      <span className={`admin-nav-icon${isActive ? " admin-nav-icon-active" : ""}`}>
                        <i className={`bi ${item.icon}`} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--primary)" : "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.name}
                        </p>
                        {item.desc && (
                          <p style={{ margin: 0, fontSize: 10.5, color: isActive ? "color-mix(in srgb, var(--primary) 70%, transparent)" : "var(--muted-foreground)", opacity: 0.8 }}>
                            {item.desc}
                          </p>
                        )}
                      </div>
                      {isActive && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }} />}
                    </Link>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="admin-sidebar-footer">
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: "color-mix(in srgb, var(--primary) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="bi bi-building" style={{ fontSize: 14, color: "var(--primary)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {session.user?.clientName || "Company Admin"}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>Admin Panel · {session.user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Main content */}
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
