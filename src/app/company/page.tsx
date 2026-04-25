"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type Stats = {
  employees: number;
  branches: number;
  departments: number;
  users: number;
};

type CompanyInfo = {
  name?: string; shortName?: string; logoUrl?: string; slogan?: string;
  phone?: string; email?: string; address?: string; taxCode?: string; legalRep?: string;
};

export default function CompanyDashboard() {
  const [company, setCompany] = useState<CompanyInfo>({});
  const [stats, setStats] = useState<Stats>({ employees: 0, branches: 0, departments: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/company", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
      fetch("/api/company/stats", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
    ]).then(([co, st]) => {
      setCompany(co || {});
      setStats(st || { employees: 0, branches: 0, departments: 0, users: 0 });
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: "Nhân viên", value: stats.employees, icon: "bi-people",    color: "#6366f1", href: "/company/employees" },
    { label: "Chi nhánh", value: stats.branches,  icon: "bi-geo-alt",   color: "#0ea5e9", href: "/company/branches" },
    { label: "Phòng ban", value: stats.departments,icon: "bi-diagram-3", color: "#10b981", href: "/company/departments" },
    { label: "Tài khoản", value: stats.users,     icon: "bi-person-gear",color: "#f59e0b", href: "/company/accounts" },
  ];

  const quickLinks = [
    { label: "Chỉnh thông tin công ty",  href: "/company/profile",     icon: "bi-building",      color: "#6366f1" },
    { label: "Quản lý chi nhánh",        href: "/company/branches",    icon: "bi-geo-alt",       color: "#0ea5e9" },
    { label: "Thêm nhân viên",           href: "/company/employees",   icon: "bi-person-plus",   color: "#10b981" },
    { label: "Phân quyền người dùng",    href: "/company/permissions", icon: "bi-shield-lock",   color: "#f59e0b" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 960, margin: "0 auto", width: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {company.logoUrl && (
          <img src={company.logoUrl} alt="logo" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 12, border: "1px solid var(--border)", background: "#fff", padding: 4 }} />
        )}
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            {loading ? "Đang tải..." : (company.name || "Company Admin")}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
            {company.slogan || "Trang quản trị doanh nghiệp"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {statCards.map((s) => (
          <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--card)", borderRadius: 16, padding: "20px 24px",
              border: "1px solid var(--border)", cursor: "pointer",
              transition: "box-shadow 0.15s, transform 0.15s",
              display: "flex", flexDirection: "column", gap: 12,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${s.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`bi ${s.icon}`} style={{ fontSize: 16, color: s.color }} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.04em" }}>
                {loading ? "—" : s.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links + Company info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Quick Actions */}
        <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <i className="bi bi-lightning-charge-fill" style={{ color: "#f59e0b", fontSize: 15 }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>Thao tác nhanh</p>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
            {quickLinks.map(q => (
              <Link key={q.href} href={q.href} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                borderRadius: 10, textDecoration: "none", transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${q.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`bi ${q.icon}`} style={{ fontSize: 14, color: q.color }} />
                </div>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: "var(--foreground)" }}>{q.label}</p>
                <i className="bi bi-chevron-right" style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: "auto" }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Company Info Summary */}
        <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className="bi bi-info-circle" style={{ color: "#6366f1", fontSize: 15 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>Thông tin công ty</p>
            </div>
            <Link href="/company/profile" style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>Chỉnh sửa →</Link>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Tên viết tắt", value: company.shortName },
              { label: "Mã số thuế", value: company.taxCode },
              { label: "Điện thoại", value: company.phone },
              { label: "Email", value: company.email },
              { label: "Địa chỉ", value: company.address },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", minWidth: 100 }}>{row.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--foreground)" }}>{loading ? "..." : (row.value || <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>Chưa cập nhật</span>)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
