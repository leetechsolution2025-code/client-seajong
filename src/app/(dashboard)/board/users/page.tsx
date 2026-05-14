"use client";
import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { SearchInput } from "@/components/ui/SearchInput";
import { useToast } from "@/components/ui/Toast";

// ── Constants ─────────────────────────────────────────────────────────────────
const SYSTEM_PERMISSIONS = [
  { key: "crm",            label: "Quản lý khách hàng (CRM)", icon: "bi-person-heart",       color: "#3b82f6" },
  { key: "chat",           label: "Nhắn tin nội bộ",           icon: "bi-chat-dots",           color: "#10b981" },
  { key: "notify",         label: "Thông báo hệ thống",        icon: "bi-bell",                color: "#f59e0b" },
  { key: "task",           label: "Quản lý công việc",         icon: "bi-kanban",              color: "#8b5cf6" },
  { key: "report",         label: "Xem báo cáo",               icon: "bi-bar-chart-line",      color: "#06b6d4" },
  { key: "plan",           label: "Lập kế hoạch",              icon: "bi-calendar3",           color: "#f43f5e" },
  { key: "approve_request",label: "Duyệt yêu cầu",             icon: "bi-check2-circle",       color: "#22c55e" },
  { key: "approve_budget", label: "Duyệt ngân sách",           icon: "bi-cash-coin",           color: "#ef4444" },
];

const DEPARTMENTS = [
  { code: "board",        name: "Ban Giám đốc",            icon: "bi-building",             color: "#6366f1" },
  { code: "plan_finance", name: "Kế hoạch - Tài chính",    icon: "bi-cash-coin",            color: "#10b981" },
  { code: "hr",           name: "Nhân sự",                  icon: "bi-people",               color: "#3b82f6" },
  { code: "sales",        name: "Kinh doanh",               icon: "bi-cart3",                color: "#f59e0b" },
  { code: "marketing",    name: "Marketing",                icon: "bi-megaphone",            color: "#ec4899" },
  { code: "cs",           name: "Chăm sóc khách hàng",     icon: "bi-chat-heart",           color: "#22d3ee" },
  { code: "logistics",    name: "Vận chuyển - Kho",         icon: "bi-truck",                color: "#84cc16" },
  { code: "production",   name: "Sản xuất",                 icon: "bi-gear",                 color: "#f97316" },
  { code: "it",           name: "Công nghệ thông tin",      icon: "bi-pc-display",           color: "#8b5cf6" },
  { code: "legal",        name: "Pháp chế",                 icon: "bi-file-earmark-text",    color: "#64748b" },
  { code: "facility",     name: "Hành chính - CSVC",        icon: "bi-house-gear",           color: "#78716c" },
];

const ROLE_OPTIONS = [
  {
    value: "USER",
    label: "Nhân viên",
    desc: "Truy cập theo phân quyền được cấp",
    icon: "bi-person",
    color: "#6366f1",
  },
  {
    value: "ADMIN",
    label: "Quản trị viên",
    desc: "Toàn quyền quản lý tổ chức & tài khoản",
    icon: "bi-shield-check",
    color: "#f59e0b",
  },
];

const LEVEL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  none: { label: "Không có quyền", color: "#9ca3af", bg: "var(--muted)" },
  view: { label: "Chỉ xem",        color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  full: { label: "Toàn quyền",     color: "#10b981", bg: "rgba(16,185,129,0.08)" },
};

// ── Types ─────────────────────────────────────────────────────────────────────
type UserRow = {
  id: string; name: string | null; email: string; role: string;
  permissions: string; deptAccess: string; createdAt: string;
  employee: {
    departmentName: string; departmentCode: string;
    position: string; status: string; phone: string | null;
  } | null;
};

type DeptAccess = { code: string; level: "none" | "view" | "full" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string | null, email: string) {
  if (name) return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function avatarColor(email: string) {
  const colors = ["#6366f1","#f59e0b","#10b981","#3b82f6","#ec4899","#22d3ee","#f43f5e","#8b5cf6"];
  return colors[email.charCodeAt(0) % colors.length];
}

function parseJson<T>(str: string, fallback: T): T {
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }: { user: UserRow; size?: number }) {
  const bg = avatarColor(user.email);
  const initStr = initials(user.name, user.email);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: size * 0.35, flexShrink: 0,
      letterSpacing: "0.02em",
    }}>
      {initStr}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    ADMIN:      { label: "Quản trị", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    USER:       { label: "Nhân viên", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
    SUPERADMIN: { label: "Superadmin", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  };
  const cfg = map[role] ?? map.USER;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function Toggle({ on, onChange, color = "#6366f1" }: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      style={{ width: 34, height: 20, borderRadius: 99, border: "none", cursor: "pointer",
               background: on ? color : "var(--muted)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: on ? "calc(100% - 17px)" : 3,
        width: 14, height: 14, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BoardUsersPage() {
  const toast = useToast();

  // User list state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "ADMIN" | "USER">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Edit state
  const [editRole, setEditRole] = useState("USER");
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editDeptAccess, setEditDeptAccess] = useState<DeptAccess[]>([]);
  const [activeTab, setActiveTab] = useState<"perms" | "dept">("perms");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/board/users");
      const data = await res.json();
      const list: UserRow[] = Array.isArray(data) ? data : [];
      setUsers(list);
      // Auto-chọn người đầu tiên khi load lần đầu
      if (list.length > 0) {
        setSelectedId(prev => prev ?? list[0].id);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Khi selectedId thay đổi → populate edit state
  useEffect(() => {
    const u = users.find(x => x.id === selectedId);
    if (!u) return;
    setEditRole(u.role);
    setEditPerms(parseJson<string[]>(u.permissions, []));
    setEditDeptAccess(DEPARTMENTS.map(d => {
      const existing = parseJson<DeptAccess[]>(u.deptAccess, []).find(x => x.code === d.code);
      return { code: d.code, level: existing?.level ?? "none" };
    }));
    setActiveTab("perms");
    setDirty(false);
  }, [selectedId, users]);



  const selectedUser = users.find(u => u.id === selectedId) ?? null;

  const selectUser = (u: UserRow) => {
    if (dirty && !confirm("Có thay đổi chưa lưu. Bỏ qua?")) return;
    setSelectedId(u.id);
    setEditRole(u.role);
    setEditPerms(parseJson<string[]>(u.permissions, []));
    const deptMap: DeptAccess[] = DEPARTMENTS.map(d => {
      const existing = parseJson<DeptAccess[]>(u.deptAccess, []).find(x => x.code === d.code);
      return { code: d.code, level: existing?.level ?? "none" };
    });
    setEditDeptAccess(deptMap);
    setActiveTab("perms");
    setDirty(false);
  };

  const togglePerm = (key: string) => {
    setEditPerms(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);
    setDirty(true);
  };

  const cycleDeptLevel = (code: string) => {
    const cycle: DeptAccess["level"][] = ["none", "view", "full"];
    setEditDeptAccess(prev => prev.map(d => {
      if (d.code !== code) return d;
      return { ...d, level: cycle[(cycle.indexOf(d.level) + 1) % 3] };
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/board/users/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          permissions: editPerms,
          deptAccess: editDeptAccess.filter(d => d.level !== "none"),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Đã lưu phân quyền", `Cập nhật thành công cho ${selectedUser?.name ?? selectedUser?.email}`);
      setDirty(false);
      fetchUsers();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
      toast.error("Lỗi lưu", msg);
    } finally { setSaving(false); }
  };

  // Filtered users
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      || (u.employee?.departmentName ?? "").toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = users.filter(u => u.role === "ADMIN").length;
  const userCount = users.filter(u => u.role === "USER").length;

  // ── Left: User list ─────────────────────────────────────────────────────────
  const leftContent = (
    <div>
      <div style={{ marginBottom: 10 }}>
        <SearchInput placeholder="Tìm nhân viên..." value={search} onChange={setSearch} />
      </div>

      {/* Role filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {([["", "Tất cả", users.length], ["ADMIN", "Quản trị", adminCount], ["USER", "Nhân viên", userCount]] as const).map(([v, label, count]) => (
          <button key={v} onClick={() => setRoleFilter(v as "" | "ADMIN" | "USER")}
            style={{
              flex: 1, padding: "5px 4px", border: roleFilter === v ? "2px solid #6366f1" : "2px solid transparent",
              borderRadius: 8, background: roleFilter === v ? "rgba(99,102,241,0.08)" : "var(--muted)",
              color: roleFilter === v ? "#6366f1" : "var(--muted-foreground)",
              cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.15s",
            }}
          >
            {label} <span style={{ fontWeight: 400, opacity: 0.7 }}>({count})</span>
          </button>
        ))}
      </div>

      {/* User list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", maxHeight: "calc(100vh - 330px)", paddingRight: 4 }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            <i className="bi bi-arrow-repeat" style={{ marginRight: 6, animation: "spin 0.8s linear infinite" }} />
            Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            <i className="bi bi-search" style={{ fontSize: 20, display: "block", marginBottom: 6 }} />
            Không tìm thấy
          </div>
        ) : filtered.map(u => {
          const isSelected = u.id === selectedId;
          return (
            <button key={u.id} onClick={() => selectUser(u)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", textAlign: "left",
                border: isSelected ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
                borderRadius: 10, cursor: "pointer", transition: "all 0.15s", width: "100%",
                background: isSelected ? "rgba(99,102,241,0.07)" : "transparent",
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--muted)"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
            >
              <Avatar user={u} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#6366f1" : "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.name ?? u.email}
                  </span>
                  <RoleBadge role={u.role} />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.employee?.departmentName ?? u.email}
                </div>
              </div>
              {u.role !== "SUPERADMIN" && (
                <i className="bi bi-chevron-right" style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Right: Permission editor ────────────────────────────────────────────────
  const rightContent = !selectedUser ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 340, gap: 12, color: "var(--muted-foreground)" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "color-mix(in srgb, #6366f1 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className="bi bi-person-lock" style={{ fontSize: 30, color: "#6366f1" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Chọn người dùng để phân quyền</p>
        <p style={{ margin: "4px 0 0", fontSize: 12 }}>Chọn từ danh sách bên trái để bắt đầu cấu hình</p>
      </div>
    </div>
  ) : (
    <div>
      {/* User header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar user={selectedUser} size={52} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--foreground)" }}>
                {selectedUser.name ?? selectedUser.email}
              </p>
              <RoleBadge role={selectedUser.role} />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
              {selectedUser.email}
              {selectedUser.employee && ` · ${selectedUser.employee.departmentName} · ${selectedUser.employee.position}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {dirty && (
            <AnimatePresence>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                onClick={handleSave} disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", border: "none", borderRadius: 9, background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />Đang lưu...</>
                         : <><i className="bi bi-check2" />Lưu thay đổi</>}
              </motion.button>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--muted)", borderRadius: 10, padding: 4 }}>
        {(["perms", "dept"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: "7px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: activeTab === tab ? "var(--card)" : "transparent",
              color: activeTab === tab ? "#6366f1" : "var(--muted-foreground)",
              boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            <i className={`bi ${tab === "perms" ? "bi-shield-lock" : "bi-diagram-3"} me-2`} />
            {tab === "perms" ? "Vai trò & Quyền hạn" : "Truy cập bộ phận"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "perms" ? (
          <motion.div key="perms" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}>
            {/* Role selector */}
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Vai trò hệ thống
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {ROLE_OPTIONS.map(r => {
                const active = editRole === r.value;
                return (
                  <button key={r.value} onClick={() => { setEditRole(r.value); setDirty(true); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", textAlign: "left",
                      border: active ? `2px solid ${r.color}` : "2px solid var(--border)",
                      borderRadius: 12, background: active ? `color-mix(in srgb, ${r.color} 8%, transparent)` : "var(--card)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`bi ${r.icon}`} style={{ fontSize: 16, color: r.color }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: active ? r.color : "var(--foreground)" }}>{r.label}</p>
                      <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)" }}>{r.desc}</p>
                    </div>
                    {active && <i className="bi bi-check-circle-fill ms-auto" style={{ color: r.color, fontSize: 16 }} />}
                  </button>
                );
              })}
            </div>

            {/* System permissions */}
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Quyền chức năng
            </p>
            {editRole === "ADMIN" ? (
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="bi bi-shield-fill-check" style={{ color: "#f59e0b", fontSize: 18 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#f59e0b" }}>Quản trị viên — Toàn quyền</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>Vai trò ADMIN có đầy đủ tất cả quyền hạn trong hệ thống</p>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SYSTEM_PERMISSIONS.map(p => {
                  const on = editPerms.includes(p.key);
                  return (
                    <div key={p.key}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, border: on ? `1px solid color-mix(in srgb, ${p.color} 30%, transparent)` : "1px solid var(--border)", background: on ? `color-mix(in srgb, ${p.color} 6%, transparent)` : "var(--card)", transition: "all 0.15s", cursor: "pointer" }}
                      onClick={() => togglePerm(p.key)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, ${p.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className={`bi ${p.icon}`} style={{ fontSize: 14, color: p.color }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: on ? 700 : 500, color: on ? p.color : "var(--foreground)" }}>{p.label}</span>
                      </div>
                      <Toggle on={on} onChange={() => togglePerm(p.key)} color={p.color} />
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="dept" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Mức độ truy cập theo bộ phận · Click để thay đổi
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DEPARTMENTS.map(d => {
                const access = editDeptAccess.find(x => x.code === d.code) ?? { code: d.code, level: "none" as const };
                const cfg = LEVEL_LABELS[access.level];
                return (
                  <div key={d.code}
                    style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", gap: 12 }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `color-mix(in srgb, ${d.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`bi ${d.icon}`} style={{ fontSize: 15, color: d.color }} />
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{d.name}</span>
                    {/* Level cycle button */}
                    <button onClick={() => cycleDeptLevel(d.code)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 7, border: "none", background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                    >
                      <i className={`bi ${access.level === "none" ? "bi-x-circle" : access.level === "view" ? "bi-eye" : "bi-unlock"}`} />
                      {cfg.label}
                      <i className="bi bi-arrow-repeat ms-1" style={{ fontSize: 10, opacity: 0.6 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky save bar when dirty */}
      {dirty && (
        <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 10, background: "rgba(99,102,241,0.07)", border: "1px dashed rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>
            <i className="bi bi-exclamation-circle me-2" />
            Có thay đổi chưa được lưu
          </span>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "7px 18px", border: "none", borderRadius: 8, background: saving ? "var(--muted)" : "#6366f1", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Đang lưu..." : "Lưu ngay"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <SplitLayoutPage
      title="Phân quyền người dùng"
      description="Ban Giám đốc · Quản lý vai trò và quyền truy cập"
      icon="bi-person-lock"
      color="violet"
      leftCols={4}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  );
}
