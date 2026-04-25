"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TabBar, TabItem } from "@/components/plan-finance/dung_chung/TabBar";
import CreateEmployeeModal from "@/components/hr/CreateEmployeeModal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  id: string; code: string; fullName: string; gender: string;
  phone?: string | null; workEmail: string;
  departmentCode: string; departmentName: string;
  position: string; level: string;
  startDate?: string | null; birthDate?: string | null;
  contractType: string; contractEndDate?: string | null;
  status: string; createdAt: string;
  
  branchCode?: string | null;
  nationalId?: string | null;
  nationalIdDate?: string | null;
  nationalIdPlace?: string | null;
  permanentAddress?: string | null;
  currentAddress?: string | null;
  personalEmail?: string | null;
  emergencyName?: string | null;
  emergencyRelation?: string | null;
  emergencyPhone?: string | null;
  manager?: string | null;
  employeeType?: string | null;
  workLocation?: string | null;
  contractNumber?: string | null;
  contractSignDate?: string | null;
  profileStatus?: string | null;
  socialInsuranceNumber?: string | null;
  taxCode?: string | null;
  baseSalary?: number | null;
  mealAllowance?: number | null;
  fuelAllowance?: number | null;
  phoneAllowance?: number | null;
  seniorityAllowance?: number | null;
  bankAccount?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  dependents?: number;
  skills?: string | null;
  softSkills?: string | null;
  education?: string | null;
  certifications?: string | null;
  annualLeave?: number;
  workShift?: string | null;
  notes?: string | null;
}

interface DeptStat { code: string; name: string; count: number; managers: string[] }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  const parts = name.trim().split(" ");
  return (parts[0][0] + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}
const GRAD = [
  ["#6366f1","#4f46e5"], ["#10b981","#059669"], ["#f59e0b","#d97706"],
  ["#ec4899","#db2777"], ["#3b82f6","#2563eb"], ["#8b5cf6","#7c3aed"],
  ["#06b6d4","#0891b2"], ["#f43f5e","#e11d48"],
];
function avatarGrad(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRAD[Math.abs(h) % GRAD.length];
}
function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const [c1, c2] = avatarGrad(name);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`, display: "flex",
      alignItems: "center", justifyContent: "center", color: "#fff",
      fontWeight: 800, fontSize: size * 0.35, letterSpacing: "-0.01em" }}>
      {getInitials(name)}
    </div>
  );
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function workYears(d?: string | null) {
  if (!d) return null;
  const y = (Date.now() - new Date(d).getTime()) / (365.25 * 86400000);
  return y < 1 ? `${Math.floor(y * 12)} tháng` : `${y.toFixed(1)} năm`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)",
      textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6 }}>
      <i className={`bi ${icon}`} />
      {title}
    </p>
  );
}

// ── AlertSummaryRow ───────────────────────────────────────────────────────────
function AlertSummaryRow({ icon, label, count, color, bg, border, emptyText, onClick }: {
  icon: string; label: string; count: number;
  color: string; bg: string; border: string;
  emptyText: string; onClick: () => void;
}) {
  const hasAlert = count > 0;
  return (
    <div
      onClick={hasAlert ? onClick : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", borderRadius: 10,
        border: `1px solid ${hasAlert ? border : "var(--border)"}`,
        background: hasAlert ? bg : "var(--card)",
        cursor: hasAlert ? "pointer" : "default",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (hasAlert) (e.currentTarget as HTMLDivElement).style.filter = "brightness(0.97)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.filter = ""; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: hasAlert ? `${color}20` : "var(--muted)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={`bi ${icon}`} style={{ color: hasAlert ? color : "var(--muted-foreground)", fontSize: 16 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: hasAlert ? color : "var(--muted-foreground)" }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>
          {hasAlert ? `${count} nhân viên cần xử lý` : emptyText}
        </p>
      </div>
      {hasAlert ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{
            background: color, color: "#fff", borderRadius: 99,
            fontSize: 11, fontWeight: 900, padding: "2px 9px", lineHeight: 1.6,
          }}>{count}</span>
          <i className="bi bi-chevron-right" style={{ color, fontSize: 12 }} />
        </div>
      ) : (
        <i className="bi bi-check-circle-fill" style={{ color: "#10b981", fontSize: 16, flexShrink: 0 }} />
      )}
    </div>
  );
}

// ── AlertDrawer ───────────────────────────────────────────────────────────────
type AlertDrawerType = "expiring" | "expired" | "noContract" | "birthday";
interface AlertDrawerItem {
  id: string; fullName: string;
  departmentName: string; position: string;
  contractType: string; contractEndDate?: string | null; birthDate?: string | null;
}
function AlertDrawer({ type, items, onClose }: {
  type: AlertDrawerType; items: AlertDrawerItem[]; onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const CFG: Record<AlertDrawerType, {
    icon: string; color: string; bg: string; title: string;
    renderSub: (e: AlertDrawerItem) => string;
    renderRight?: (e: AlertDrawerItem) => React.ReactNode;
  }> = {
    expiring: {
      icon: "bi-clock-history", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",
      title: "Hợp đồng sắp hết hạn",
      renderSub: e => `Hết hạn: ${fmtDate(e.contractEndDate)}`,
      renderRight: e => {
        const d = daysUntil(e.contractEndDate!);
        return (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: d <= 30 ? "#ef4444" : "#f59e0b", lineHeight: 1 }}>{d}</p>
            <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600 }}>ngày</p>
          </div>
        );
      },
    },
    expired: {
      icon: "bi-x-circle-fill", color: "#ef4444", bg: "rgba(239,68,68,0.08)",
      title: "Hợp đồng đã hết hạn",
      renderSub: e => `Hết hạn: ${fmtDate(e.contractEndDate)}`,
      renderRight: e => {
        const d = Math.abs(daysUntil(e.contractEndDate!));
        return (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#ef4444", lineHeight: 1 }}>{d}</p>
            <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600 }}>ngày qua</p>
          </div>
        );
      },
    },
    noContract: {
      icon: "bi-file-earmark-x", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",
      title: "Chưa ký hợp đồng",
      renderSub: e => e.position,
    },
    birthday: {
      icon: "bi-cake2-fill", color: "#ec4899", bg: "rgba(236,72,153,0.08)",
      title: "Sinh nhật tháng này",
      renderSub: e => {
        const d = e.birthDate ? new Date(e.birthDate).getDate() : 0;
        const today = new Date().getDate();
        const diff = d - today;
        if (diff === 0) return "🎂 Hôm nay là sinh nhật!";
        if (diff > 0) return `Còn ${diff} ngày nữa (ngày ${d})`;
        return `Đã qua ${Math.abs(diff)} ngày (ngày ${d})`;
      },
      renderRight: e => {
        const d = e.birthDate ? new Date(e.birthDate).getDate() : null;
        if (!d) return null;
        const today = new Date().getDate();
        const isToday = d === today;
        return (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900,
              color: isToday ? "#ec4899" : "var(--muted-foreground)", lineHeight: 1 }}>{d}</p>
            <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600 }}>tháng này</p>
          </div>
        );
      },
    },
  };
  const cfg = CFG[type];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 10010,
          background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 10011,
        width: "min(400px, 100vw)",
        background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 16px", height: 62, flexShrink: 0,
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: 16 }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>{cfg.title}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{items.length} nhân viên</p>
          </div>
          <button onClick={onClose} style={{
            background: "var(--muted)", border: "none", borderRadius: 8, flexShrink: 0,
            width: 32, height: 32, cursor: "pointer", color: "var(--muted-foreground)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>
            <i className="bi bi-x" />
          </button>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(e => (
            <div key={e.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              border: `1px solid ${cfg.color}30`,
              background: cfg.bg,
            }}>
              <Avatar name={e.fullName} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.fullName}</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{e.departmentName} · {e.position}</p>
                <p style={{ margin: 0, fontSize: 11, color: cfg.color, fontWeight: 600, marginTop: 1 }}>{cfg.renderSub(e)}</p>
              </div>
              {cfg.renderRight?.(e)}
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BoardHrPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "leaders" | "alerts">("overview");
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [resignLoading, setResignLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alertDrawer, setAlertDrawer] = useState<"expiring" | "expired" | "noContract" | "birthday" | null>(null);

  // Employee list filters
  const [empSearch, setEmpSearch] = useState("");
  const [empDept, setEmpDept] = useState("");
  const [empStatus, setEmpStatus] = useState("");

  useEffect(() => {
    fetch("/api/hr/employees?pageSize=200")
      .then(r => r.json())
      .then(d => {
        const list: Employee[] = d.employees ?? [];
        setEmployees(list);
        if (list.length > 0) setSelectedEmp(prev => prev ?? list[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Tự động gửi chúc sinh nhật đầu tháng (silent, mỗi tháng 1 lần) ───────
  useEffect(() => {
    fetch("/api/hr/birthday-notify", { method: "POST" })
      .then(r => r.json())
      .then(d => {
        if (d.sent) console.log(`[HR] Birthday notify: ${d.message}`);
      })
      .catch(() => {}); // Không ảnh hưởng UI nếu lỗi
  }, []);

  // Dept options for filter
  const deptOptions = useMemo(() => {
    const seen = new Set<string>();
    return employees
      .filter(e => { if (seen.has(e.departmentCode)) return false; seen.add(e.departmentCode); return true; })
      .map(e => ({ value: e.departmentCode, label: e.departmentName }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employees]);

  // Filtered employees for the list
  const filteredEmps = useMemo(() => {
    const q = empSearch.toLowerCase();
    return employees.filter(e =>
      (!q || e.fullName.toLowerCase().includes(q) || e.position.toLowerCase().includes(q)) &&
      (!empDept   || e.departmentCode === empDept) &&
      (!empStatus || e.status === empStatus)
    );
  }, [employees, empSearch, empDept, empStatus]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const total      = employees.length;
  const active     = employees.filter(e => e.status === "active").length;
  const probation  = employees.filter(e => e.contractType === "probation" && e.status === "active").length;
  const resigned   = employees.filter(e => e.status === "resigned").length;

  // Dept breakdown
  const deptMap: Record<string, DeptStat> = {};
  for (const e of employees) {
    if (!deptMap[e.departmentCode]) deptMap[e.departmentCode] = { code: e.departmentCode, name: e.departmentName, count: 0, managers: [] };
    deptMap[e.departmentCode].count++;
    if (["manager", "director"].includes(e.level)) deptMap[e.departmentCode].managers.push(e.fullName);
  }
  const depts = Object.values(deptMap).sort((a, b) => b.count - a.count);
  const maxCount = depts[0]?.count ?? 1;

  // Leaders (manager/director)
  const leaders = employees
    .filter(e => ["manager","director"].includes(e.level) && e.status === "active")
    .sort((a, b) => a.departmentName.localeCompare(b.departmentName));

  // Alerts: contracts expiring in 90 days
  const contractAlerts = employees
    .filter(e => e.contractEndDate && daysUntil(e.contractEndDate) <= 90 && daysUntil(e.contractEndDate) > 0 && e.status === "active")
    .sort((a, b) => daysUntil(a.contractEndDate!) - daysUntil(b.contractEndDate!));

  // Alerts: contracts already expired
  const expiredAlerts = employees
    .filter(e => e.contractEndDate && daysUntil(e.contractEndDate) <= 0 && e.status === "active")
    .sort((a, b) => daysUntil(a.contractEndDate!) - daysUntil(b.contractEndDate!));

  // Alerts: no contract signed (contractType = "unsigned" hoặc rỗng/null)
  const noContractAlerts = employees
    .filter(e => (!e.contractType || e.contractType.trim() === "" || e.contractType === "unsigned") && e.status === "active");

  // Birthdays this month
  const nowMonth = new Date().getMonth() + 1;
  const birthdays = employees
    .filter(e => e.birthDate && new Date(e.birthDate).getMonth() + 1 === nowMonth && e.status === "active")
    .sort((a, b) => new Date(a.birthDate!).getDate() - new Date(b.birthDate!).getDate());

  const totalAlerts = contractAlerts.length + expiredAlerts.length + noContractAlerts.length + birthdays.length;

  // Level breakdown
  const byLevel = {
    director: employees.filter(e => e.level === "director" && e.status === "active").length,
    manager:  employees.filter(e => e.level === "manager"  && e.status === "active").length,
    staff:    employees.filter(e => e.level === "staff"    && e.status === "active").length,
  };

  const leftTopContent = (
    <div className="row g-3">
      <KPICard label="Tổng nhân lực" value={total}     icon="bi-people-fill"        accent="#6366f1" colClass="col-6" />
      <KPICard label="Đang làm việc" value={active}    icon="bi-person-check-fill"  accent="#10b981" colClass="col-6" />
      <KPICard label="Thử việc"      value={probation} icon="bi-hourglass-split"    accent="#f59e0b" colClass="col-6" />
      <KPICard label="Đã nghỉ việc"  value={resigned}  icon="bi-person-dash-fill"  accent="#ef4444" colClass="col-6" />
    </div>
  );


  // ── Left column: Employee detail ─────────────────────────────────────────────
  const LEVEL_MAP: Record<string, { label: string; icon: string; color: string }> = {
    director: { label: "Giám đốc",      icon: "bi-gem",         color: "#8b5cf6" },
    manager:  { label: "Trưởng phòng",  icon: "bi-star-fill",   color: "#f59e0b" },
    staff:    { label: "Nhân viên",     icon: "bi-person-fill", color: "#3b82f6" },
  };
  const CONTRACT_MAP: Record<string, string> = {
    unsigned:   "Chưa ký", probation: "Thử việc",
    definite:   "Có thời hạn", indefinite: "Vô thời hạn",
  };

  const emp = selectedEmp;
  const empLevel = emp ? (LEVEL_MAP[emp.level] ?? LEVEL_MAP.staff) : null;
  const [empC1, empC2] = emp ? avatarGrad(emp.fullName) : ["#6366f1", "#4f46e5"];

  const DetailRow = ({ icon, label, value, mono = false }: { icon: string; label: string; value: string; mono?: boolean }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`bi ${icon}`} style={{ fontSize: 12, color: "var(--muted-foreground)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--foreground)", fontWeight: 500, fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" }}>{value || "—"}</p>
      </div>
    </div>
  );

  const leftContent = emp ? (
    <div>
      <SectionTitle
        title="Dữ liệu nhân viên"
        className="mb-3"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShowEditModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700,
                color: "#f59e0b", cursor: "pointer", padding: "4px 10px", borderRadius: 7,
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                transition: "all 0.15s" }}
            >
              <i className="bi bi-person-lines-fill" style={{ fontSize: 11 }} />Xem hồ sơ
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700,
                color: "#ef4444", cursor: "pointer", padding: "4px 10px", borderRadius: 7,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                transition: "all 0.15s" }}
            >
              <i className="bi bi-trash" style={{ fontSize: 11 }} />Xoá
            </button>
          </div>
        }
      />
      {/* Avatar + name header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, padding: "14px", borderRadius: 12,
        background: `linear-gradient(135deg, ${empC1}14, ${empC2}08)`, border: `1px solid ${empC1}25` }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${empC1}, ${empC2})`,
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18, flexShrink: 0 }}>
          {getInitials(emp.fullName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {emp.fullName}
          </p>
          <p style={{ margin: "2px 0 4px", fontSize: 12, color: "var(--muted-foreground)" }}>{emp.position} · {emp.departmentName}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {empLevel && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: `${empLevel.color}18`, color: empLevel.color }}>
                <i className={`bi ${empLevel.icon} me-1`} style={{ fontSize: 9 }} />{empLevel.label}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: emp.gender === "female" ? "rgba(236,72,153,0.1)" : "rgba(59,130,246,0.1)",
              color: emp.gender === "female" ? "#ec4899" : "#3b82f6" }}>
              {emp.gender === "female" ? "♀ Nữ" : "♂ Nam"}
            </span>
            {/* Switch "Cho nghỉ việc" */}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: "auto",
              cursor: "pointer", userSelect: "none" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: emp.status === "resigned" ? "#ef4444" : "var(--muted-foreground)" }}>
                {emp.status === "resigned" ? "Đã nghỉ việc" : "Cho nghỉ việc"}
              </span>
              <div
                role="switch"
                aria-checked={emp.status === "resigned"}
                onClick={() => setShowResignConfirm(true)}
                style={{
                  width: 32, height: 18, borderRadius: 99, cursor: "pointer",
                  background: emp.status === "resigned" ? "#ef4444" : "var(--muted)",
                  position: "relative", transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 2,
                  left: emp.status === "resigned" ? 16 : 2,
                  width: 14, height: 14, borderRadius: "50%",
                  background: "#fff", transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                }} />
              </div>
            </label>
          </div>
        </div>
      </div>
      {/* Detail rows */}
      <div style={{ display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 420px)", overflowY: "auto", paddingRight: 4 }}>
        <DetailRow icon="bi-hash"             label="Mã nhân viên" value={emp.code} mono />
        <DetailRow icon="bi-telephone"         label="Điện thoại"   value={emp.phone ?? ""} />
        <DetailRow icon="bi-envelope-at"       label="Email công ty" value={emp.workEmail} mono />
        <DetailRow icon="bi-calendar-event"    label="Ngày vào làm" value={fmtDate(emp.startDate)} />
        <DetailRow icon="bi-file-earmark-text" label="Loại hợp đồng" value={CONTRACT_MAP[emp.contractType] ?? emp.contractType} />
        {emp.contractEndDate && (
          <DetailRow icon="bi-calendar-x"      label="Hết hạn HĐ"  value={fmtDate(emp.contractEndDate)} />
        )}
        {workYears(emp.startDate) && (
          <DetailRow icon="bi-clock-history"   label="Thâm niên"   value={workYears(emp.startDate)!} />
        )}
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, color: "var(--muted-foreground)", textAlign: "center" }}>
      <i className="bi bi-person-bounding-box" style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }} />
      <p style={{ margin: 0, fontSize: 13 }}>Chọn nhân viên để xem chi tiết</p>
    </div>
  );

  // ── Right column tabs ────────────────────────────────────────────────────────
  const TABS: TabItem<"overview" | "leaders" | "alerts">[] = [
    { id: "overview", label: "Tổng quan", icon: "bi-bar-chart-line" },
    { id: "leaders",  label: "Quản lý",   icon: "bi-star" },
    { id: "alerts",   label: "Cảnh báo",  icon: "bi-exclamation-triangle",
      badge: totalAlerts || undefined },
  ];

  const rightContent = (
    <div>
      <SectionTitle title="Hiện trạng nguồn nhân lực" className="mb-3" />
      {/* Tabs */}
      <TabBar
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 18 }}
      />

      {/* Tab: Tổng quan */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Danh sách nhân viên */}
          <div>
            <SectionHeader title="Danh sách nhân viên" icon="bi-people" />
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
              <FilterSelect
                options={deptOptions}
                value={empDept}
                onChange={setEmpDept}
                placeholder="Phòng ban"
                width={150}
              />
              <FilterSelect
                options={[
                  { value: "active",   label: "Đang làm" },
                  { value: "inactive", label: "Nghỉ phép" },
                  { value: "resigned", label: "Đã nghỉ" },
                ]}
                value={empStatus}
                onChange={setEmpStatus}
                placeholder="Trạng thái"
                width={130}
              />
              <div style={{ flex: 1, minWidth: 140 }}>
                <SearchInput placeholder="Tìm nhân viên..." value={empSearch} onChange={setEmpSearch} />
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  border: "none", borderRadius: 8, background: "#f59e0b", color: "#fff",
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(245,158,11,0.3)" }}
              >
                <i className="bi bi-person-plus" />Thêm mới
              </button>
            </div>
            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
              {filteredEmps.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Không tìm thấy nhân viên</div>
              )}
              {filteredEmps.map(e => {
                const isSelected = selectedEmp?.id === e.id;
                const scfg = { active: { dot: "#10b981", text: "#10b981", bg: "rgba(16,185,129,0.08)", label: "Đang làm" }, inactive: { dot: "#f59e0b", text: "#f59e0b", bg: "rgba(245,158,11,0.08)", label: "Nghỉ phép" }, resigned: { dot: "#ef4444", text: "#ef4444", bg: "rgba(239,68,68,0.08)", label: "Đã nghỉ" } }[e.status] ?? { dot: "#10b981", text: "#10b981", bg: "rgba(16,185,129,0.08)", label: e.status };
                return (
                  <div key={e.id}
                    onClick={() => setSelectedEmp(e)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                    borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                    border: isSelected ? "1px solid rgba(245,158,11,0.4)" : "1px solid var(--border)",
                    background: isSelected ? "rgba(245,158,11,0.06)" : "var(--card)" }}>
                    <Avatar name={e.fullName} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.fullName}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{e.departmentName} · {e.position}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: scfg.bg, color: scfg.text }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: scfg.dot, display: "inline-block", marginRight: 3 }} />
                        {scfg.label}
                      </span>
                      {workYears(e.startDate) && <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--muted-foreground)" }}>{workYears(e.startDate)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Quản lý */}
      {activeTab === "leaders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 340px)", overflowY: "auto", paddingRight: 2 }}>
          {leaders.length === 0 && <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 24 }}>Chưa có dữ liệu quản lý</p>}
          {leaders.map(e => {
            const isDirector = e.level === "director";
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderRadius: 12, border: `1px solid ${isDirector ? "rgba(139,92,246,0.2)" : "var(--border)"}`,
                background: isDirector ? "rgba(139,92,246,0.04)" : "var(--card)", flexShrink: 0 }}>
                <Avatar name={e.fullName} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.fullName}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                      background: isDirector ? "rgba(139,92,246,0.12)" : "rgba(245,158,11,0.12)",
                      color: isDirector ? "#8b5cf6" : "#f59e0b", flexShrink: 0 }}>
                      <i className={`bi ${isDirector ? "bi-gem" : "bi-star-fill"} me-1`} style={{ fontSize: 8 }} />
                      {isDirector ? "Giám đốc" : "Trưởng phòng"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>{e.departmentName} · {e.position}</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{e.workEmail}</p>
                </div>
                {workYears(e.startDate) && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)" }}>Thâm niên</p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#6366f1" }}>{workYears(e.startDate)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Cảnh báo — summary rows */}
      {activeTab === "alerts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Sắp hết hạn */}
          <AlertSummaryRow
            icon="bi-clock-history"
            label="Hợp đồng sắp hết hạn"
            count={contractAlerts.length}
            color="#f59e0b"
            bg="rgba(245,158,11,0.08)"
            border="rgba(245,158,11,0.25)"
            emptyText="Không có hợp đồng sắp hết trong 90 ngày"
            onClick={() => contractAlerts.length > 0 && setAlertDrawer("expiring")}
          />

          {/* Đã hết hạn */}
          <AlertSummaryRow
            icon="bi-x-circle-fill"
            label="Hợp đồng đã hết hạn"
            count={expiredAlerts.length}
            color="#ef4444"
            bg="rgba(239,68,68,0.08)"
            border="rgba(239,68,68,0.25)"
            emptyText="Không có hợp đồng đã hết hạn"
            onClick={() => expiredAlerts.length > 0 && setAlertDrawer("expired")}
          />

          {/* Chưa ký hợp đồng */}
          <AlertSummaryRow
            icon="bi-file-earmark-x"
            label="Chưa ký hợp đồng"
            count={noContractAlerts.length}
            color="#8b5cf6"
            bg="rgba(139,92,246,0.08)"
            border="rgba(139,92,246,0.25)"
            emptyText="Tất cả nhân viên đã có hợp đồng"
            onClick={() => noContractAlerts.length > 0 && setAlertDrawer("noContract")}
          />

          {/* Sinh nhật tháng này */}
          <AlertSummaryRow
            icon="bi-cake2-fill"
            label={`Sinh nhật tháng ${nowMonth}`}
            count={birthdays.length}
            color="#ec4899"
            bg="rgba(236,72,153,0.08)"
            border="rgba(236,72,153,0.25)"
            emptyText={`Không có sinh nhật trong tháng ${nowMonth}`}
            onClick={() => birthdays.length > 0 && setAlertDrawer("birthday")}
          />

        </div>
      )}
    </div>
  );

  // ── Handler: cho nghỉ việc / khôi phục ────────────────────────────────────
  const handleResign = async () => {
    if (!selectedEmp) return;
    setResignLoading(true);
    const isResigned = selectedEmp.status === "resigned";
    try {
      const res = await fetch(`/api/hr/employees/${selectedEmp.id}/resign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resign: !isResigned }),
      });
      if (!res.ok) throw new Error("Lỗi khi cập nhật trạng thái");
      // Cập nhật selectedEmp và employees list
      const newStatus = isResigned ? "active" : "resigned";
      const updated = { ...selectedEmp, status: newStatus };
      setSelectedEmp(updated);
      setEmployees(prev => prev.map(e => e.id === selectedEmp.id ? updated : e));
    } catch (e) {
      console.error(e);
    } finally {
      setResignLoading(false);
      setShowResignConfirm(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmp) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/hr/employees/${selectedEmp.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi khi xoá nhân viên");
      
      const updatedList = employees.filter(e => e.id !== selectedEmp.id);
      setEmployees(updatedList);
      setSelectedEmp(updatedList[0] || null);
    } catch (e) {
      console.error(e);
      alert("Không thể xoá nhân viên này.");
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Map Employee → modal FormData (các trường có sẵn)
  const editInitialData = selectedEmp ? {
    branchCode:     selectedEmp.branchCode ?? "",
    code:           selectedEmp.code,
    fullName:       selectedEmp.fullName,
    gender:         selectedEmp.gender,
    birthDate:      selectedEmp.birthDate ? selectedEmp.birthDate.slice(0, 10) : "",
    nationalId:     selectedEmp.nationalId ?? "",
    nationalIdDate: selectedEmp.nationalIdDate ? selectedEmp.nationalIdDate.slice(0, 10) : "",
    nationalIdPlace: selectedEmp.nationalIdPlace ?? "",
    permanentAddress: selectedEmp.permanentAddress ?? "",
    currentAddress: selectedEmp.currentAddress ?? "",
    phone:          selectedEmp.phone ?? "",
    personalEmail:  selectedEmp.personalEmail ?? "",
    workEmail:      selectedEmp.workEmail,
    emergencyName:  selectedEmp.emergencyName ?? "",
    emergencyRelation: selectedEmp.emergencyRelation ?? "",
    emergencyPhone: selectedEmp.emergencyPhone ?? "",

    departmentCode: selectedEmp.departmentCode,
    departmentName: selectedEmp.departmentName,
    position:       selectedEmp.position,
    level:          selectedEmp.level,
    manager:        selectedEmp.manager ?? "",
    employeeType:   selectedEmp.employeeType ?? "official",
    startDate:      selectedEmp.startDate ? selectedEmp.startDate.slice(0, 10) : "",
    workLocation:   selectedEmp.workLocation ?? "main",

    contractType:   selectedEmp.contractType,
    contractNumber: selectedEmp.contractNumber ?? "",
    contractSignDate: selectedEmp.contractSignDate ? selectedEmp.contractSignDate.slice(0, 10) : "",
    contractEndDate: selectedEmp.contractEndDate ? selectedEmp.contractEndDate.slice(0, 10) : "",
    profileStatus:  selectedEmp.profileStatus ?? "pending",
    socialInsuranceNumber: selectedEmp.socialInsuranceNumber ?? "",
    taxCode:        selectedEmp.taxCode ?? "",

    baseSalary:     selectedEmp.baseSalary ? String(selectedEmp.baseSalary) : "",
    mealAllowance:  selectedEmp.mealAllowance ? String(selectedEmp.mealAllowance) : "",
    fuelAllowance:  selectedEmp.fuelAllowance ? String(selectedEmp.fuelAllowance) : "",
    phoneAllowance: selectedEmp.phoneAllowance ? String(selectedEmp.phoneAllowance) : "",
    seniorityAllowance: selectedEmp.seniorityAllowance ? String(selectedEmp.seniorityAllowance) : "",
    bankAccount:    selectedEmp.bankAccount ?? "",
    bankName:       selectedEmp.bankName ?? "",
    bankBranch:     selectedEmp.bankBranch ?? "",
    dependents:     selectedEmp.dependents ? String(selectedEmp.dependents) : "0",

    skills:         selectedEmp.skills ?? "",
    softSkills:     selectedEmp.softSkills ?? "",
    education:      selectedEmp.education ?? "",
    certifications: selectedEmp.certifications ?? "",

    annualLeave:    selectedEmp.annualLeave ? String(selectedEmp.annualLeave) : "12",
    workShift:      selectedEmp.workShift ?? "standard",
    notes:          selectedEmp.notes ?? "",
  } : undefined;

  return (
    <>
      <SplitLayoutPage
        title="Nhân sự"
        description="Ban Giám đốc · Tổng quan nhân lực, cơ cấu tổ chức và cảnh báo quan trọng"
        icon="bi-people-fill"
        color="amber"
        leftCols={5}
        leftTopContent={leftTopContent}
        leftContent={leftContent}
        rightContent={rightContent}
      />

      {showEditModal && selectedEmp && (
        <CreateEmployeeModal
          onClose={() => setShowEditModal(false)}
          onCreated={() => {
            setShowEditModal(false);
            fetch("/api/hr/employees?pageSize=200", { cache: "no-store" })
              .then(r => r.json())
              .then(d => {
                const list: Employee[] = d.employees ?? [];
                setEmployees(list);
                // Cập nhật selectedEmp từ dữ liệu mới nhất
                const updated = list.find(e => e.id === selectedEmp?.id);
                if (updated) setSelectedEmp(updated);
              });
          }}
          departments={[]}
          initialData={editInitialData}
          employeeId={selectedEmp.id}
        />
      )}

      {/* Modal thêm mới nhân viên */}
      {showCreateModal && (
        <CreateEmployeeModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetch("/api/hr/employees?pageSize=200", { cache: "no-store" })
              .then(r => r.json())
              .then(d => {
                const list: Employee[] = d.employees ?? [];
                setEmployees(list);
                // Auto-chọn nhân viên vừa tạo (đầu tiên trong list mới)
                if (list.length > 0) setSelectedEmp(list[0]);
              });
          }}
          departments={[]}
        />
      )}

      {/* Alert Drawer */}
      {alertDrawer === "expiring" && (
        <AlertDrawer type="expiring" items={contractAlerts} onClose={() => setAlertDrawer(null)} />
      )}
      {alertDrawer === "expired" && (
        <AlertDrawer type="expired" items={expiredAlerts} onClose={() => setAlertDrawer(null)} />
      )}
      {alertDrawer === "noContract" && (
        <AlertDrawer type="noContract" items={noContractAlerts} onClose={() => setAlertDrawer(null)} />
      )}
      {alertDrawer === "birthday" && (
        <AlertDrawer type="birthday" items={birthdays} onClose={() => setAlertDrawer(null)} />
      )}

      {/* Xác nhận cho nghỉ việc / khôi phục */}
      <ConfirmDialog
        open={showResignConfirm}
        isStatic
        variant={selectedEmp?.status === "resigned" ? "warning" : "danger"}
        title={selectedEmp?.status === "resigned" ? "Khôi phục nhân viên?" : "Cho nghỉ việc?"}
        message={
          selectedEmp?.status === "resigned"
            ? <><strong>{selectedEmp?.fullName}</strong> sẽ được khôi phục trạng thái làm việc và có thể đăng nhập lại hệ thống.</>
            : <><strong>{selectedEmp?.fullName}</strong> sẽ bị chuyển sang trạng thái <em>Đã nghỉ việc</em> và bị khoá quyền đăng nhập hệ thống. Hành động này có thể hoàn tác.</>
        }
        confirmLabel={selectedEmp?.status === "resigned" ? "Khôi phục" : "Cho nghỉ việc"}
        cancelLabel="Huỷ"
        loading={resignLoading}
        onConfirm={handleResign}
        onCancel={() => setShowResignConfirm(false)}
      />

      {/* Xác nhận xoá nhân viên */}
      <ConfirmDialog
        open={showDeleteConfirm}
        isStatic
        variant="danger"
        title="Xoá hồ sơ nhân viên?"
        message={
          <>Bạn đang thực hiện xoá vĩnh viễn hồ sơ của nhân viên <strong>{selectedEmp?.fullName}</strong>. Hành động này không thể hoàn tác, bạn có chắc chắn xoá không?</>
        }
        confirmLabel="Xoá vĩnh viễn"
        cancelLabel="Huỷ"
        loading={deleteLoading}
        onConfirm={handleDeleteEmployee}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
