"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useToast, ToastContainer } from "@/components/Toast";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface EmployeeInfo {
  code:           string | null;
  departmentName: string | null;
  position:       string | null;
  level:          string | null;
  status:         string | null;
}
interface UserRow {
  id:          string;
  name:        string | null;
  email:       string;
  role:        string;
  permissions: string;   // JSON string ["chat","notify",...]
  createdAt:   string;
  employee:    EmployeeInfo | null;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  USER:  { label: "Nhân viên", color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "bi-person"           },
  ADMIN: { label: "Quản trị",  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", icon: "bi-shield-lock-fill" },
};

const LEVEL_LABEL: Record<string, string> = {
  staff:          "Nhân viên",
  mid_manager:    "QL trung",
  senior_manager: "QL cao",
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  active:   { label: "Đang làm", color: "#22c55e" },
  inactive: { label: "Tạm dừng", color: "#f59e0b" },
  resigned: { label: "Đã nghỉ",  color: "#ef4444" },
};

const PERMS: { key: string; label: string; icon: string; short: string }[] = [
  { key: "chat",            label: "Nhắn tin",       icon: "bi-chat-dots",      short: "Chat"   },
  { key: "notify",          label: "Tạo thông báo",  icon: "bi-bell",           short: "T.báo"  },
  { key: "task",            label: "Giao việc",       icon: "bi-clipboard-check",short: "G.việc" },
  { key: "report",          label: "Báo cáo",         icon: "bi-bar-chart",      short: "B.cáo"  },
  { key: "plan",            label: "Lập kế hoạch",   icon: "bi-calendar3",      short: "K.hoạch"},
  { key: "approve_request", label: "Duyệt đơn",      icon: "bi-check2-circle",  short: "D.đơn"  },
  { key: "approve_budget",  label: "Duyệt ngân sách",icon: "bi-cash-stack",     short: "D.NS"   },
];

function parsePerm(raw: string): string[] {
  try { return JSON.parse(raw) ?? []; } catch { return []; }
}

// Quyền mặc định theo vai trò
const DEFAULT_USER_PERMS  = ["chat", "report"];
const DEFAULT_ADMIN_PERMS = PERMS.map(p => p.key); // tất cả

function defaultPerms(role: string): string[] {
  return role === "ADMIN" ? DEFAULT_ADMIN_PERMS : DEFAULT_USER_PERMS;
}
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();
}

/* ─── Custom Dropdown ────────────────────────────────────────────────────── */
interface DropdownOption { value: string; label: string; }
function CustomDropdown({ id, value, options, placeholder = "Chọn...", onChange }: {
  id?: string; value: string;
  options: DropdownOption[];
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", minWidth: 210 }}>
      <button id={id} type="button" onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "9px 32px 9px 34px", borderRadius: 10,
        border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)",
        fontSize: 13, fontWeight: 500, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6,
        outline: "none", textAlign: "left",
        boxShadow: open ? "0 0 0 2px color-mix(in srgb, var(--primary) 25%, transparent)" : "none",
        transition: "box-shadow 0.15s",
      }}>
        <i className="bi bi-diagram-3" style={{ position: "absolute", left: 11, fontSize: 13, color: "var(--muted-foreground)" }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value ? "var(--foreground)" : "var(--muted-foreground)" }}>
          {selected ? selected.label : placeholder}
        </span>
        <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 999,
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          overflow: "hidden", maxHeight: 260, overflowY: "auto",
        }}>
          <button type="button" onClick={() => { onChange(""); setOpen(false); }} style={{
            width: "100%", padding: "9px 14px", textAlign: "left",
            background: !value ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
            color: !value ? "var(--primary)" : "var(--foreground)",
            fontSize: 13, fontWeight: !value ? 700 : 500,
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}
          onMouseEnter={e => { if (value) (e.currentTarget as HTMLElement).style.background = "var(--muted)"; }}
          onMouseLeave={e => { if (value) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            {!value && <i className="bi bi-check2" style={{ fontSize: 12 }} />}
            {placeholder}
          </button>
          <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }} style={{
              width: "100%", padding: "9px 14px", textAlign: "left",
              background: value === opt.value ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
              color: value === opt.value ? "var(--primary)" : "var(--foreground)",
              fontSize: 13, fontWeight: value === opt.value ? 700 : 500,
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={e => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = "var(--muted)"; }}
            onMouseLeave={e => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              {value === opt.value && <i className="bi bi-check2" style={{ fontSize: 12 }} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function AdminRolesPage() {
  const [users,       setUsers]       = useState<UserRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [search,      setSearch]      = useState("");
  const [deptFilter,  setDeptFilter]  = useState("");
  const [departments, setDepartments] = useState<{ code: string; nameVi: string }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // pendingPerms: Map userId → Set của permissions đang thay đổi
  const [pendingPerms, setPendingPerms] = useState<Record<string, string[]>>({});
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
  const hasPending = Object.keys(pendingPerms).length > 0 || Object.keys(pendingRoles).length > 0;

  const toast = useToast();

  /* Fetch phòng ban */
  useEffect(() => {
    fetch("/api/hr/departments")
      .then(r => r.json())
      .then(d => setDepartments(d.departments ?? []))
      .catch(() => {});
  }, []);

  /* Fetch users */
  const fetchUsers = useCallback(async (p: number, q: string, dept: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "15", search: q, ...(dept ? { department: dept } : {}) });
      const res  = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.detail ?? `HTTP ${res.status}`);
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setPendingPerms({});
      setPendingRoles({});
    } catch (e: unknown) {
      toast.error("Lỗi tải dữ liệu", e instanceof Error ? e.message : "Không thể tải danh sách người dùng.");
      console.error("[fetchUsers]", e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchUsers(page, search, deptFilter); }, [fetchUsers, page, search, deptFilter]);

  /* Search debounce */
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* Lấy permissions hiện tại của 1 user (pending > stored > default) */
  const getPerms = (u: UserRow) => {
    if (pendingPerms[u.id]) return pendingPerms[u.id];
    const stored = parsePerm(u.permissions);
    // Nếu chưa có permissions lưu trong DB → dùng mặc định theo role
    return stored.length > 0 ? stored : defaultPerms(getRole(u));
  };
  const getRole  = (u: UserRow) => pendingRoles[u.id] ?? u.role;

  /* Toggle 1 permission của 1 user */
  const togglePerm = (userId: string, permKey: string, currentPerms: string[]) => {
    const next = currentPerms.includes(permKey)
      ? currentPerms.filter(p => p !== permKey)
      : [...currentPerms, permKey];
    setPendingPerms(prev => ({ ...prev, [userId]: next }));
  };

  /* Thay role (pending) */
  const changeRole = (userId: string, newRole: string) => {
    setPendingRoles(prev => ({ ...prev, [userId]: newRole }));
  };

  /* Lưu tất cả thay đổi */
  const handleSaveAll = async () => {
    setIsSavingAll(true);
    try {
      const ops: Promise<unknown>[] = [];

      // Batch permissions
      const permUpdates = Object.entries(pendingPerms).map(([id, permissions]) => ({ id, permissions }));
      if (permUpdates.length > 0) {
        ops.push(
          fetch("/api/admin/users/permissions", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates: permUpdates }),
          })
        );
      }

      // Role updates (sequential ATM — đủ nhỏ)
      for (const [userId, role] of Object.entries(pendingRoles)) {
        ops.push(
          fetch(`/api/admin/users/${userId}/role`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
          })
        );
      }

      const results = await Promise.all(ops);
      for (const r of results) {
        if (r instanceof Response && !r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Lỗi cập nhật");
        }
      }

      toast.success("Đã lưu", `Cập nhật quyền cho ${permUpdates.length + Object.keys(pendingRoles).length} tài khoản thành công.`);
      await fetchUsers(page, search, deptFilter); // reload
    } catch (e: unknown) {
      toast.error("Lỗi", e instanceof Error ? e.message : "Không thể lưu thay đổi.");
    } finally {
      setIsSavingAll(false);
    }
  };

  /* Column grid: với dept filter ẩn cột phòng ban */
  const gridCols = deptFilter
    ? "200px 90px 80px 1fr"          // Nhân viên | Cấp bậc | Trạng thái | Checkboxes + role
    : "200px 140px 90px 80px 1fr";   // Nhân viên | Phòng ban/Chức vụ | Cấp bậc | Trạng thái | Checkboxes + role

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--foreground)", margin: 0 }}>Phân quyền nhân viên</h1>
          <p className="text-muted small mt-1 mb-0">
            Thiết lập quyền truy cập hệ thống · <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{total}</span> tài khoản
          </p>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <CustomDropdown
            id="roles-dept-filter"
            value={deptFilter}
            placeholder="Tất cả phòng ban"
            options={departments.map(d => ({ value: d.code, label: d.nameVi }))}
            onChange={v => { setDeptFilter(v); setPage(1); }}
          />

          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 13 }} />
            <input
              id="roles-search-input"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              style={{
                width: "100%", padding: "9px 12px 9px 36px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--card)",
                color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {(deptFilter || searchInput) && (
            <button onClick={() => { setDeptFilter(""); setSearchInput(""); setPage(1); }} style={{
              padding: "9px 14px", borderRadius: 10,
              border: "1px solid var(--border)", background: "var(--muted)",
              color: "var(--muted-foreground)", fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              <i className="bi bi-x-circle" style={{ fontSize: 13 }} /> Xoá lọc
            </button>
          )}

          {/* Nút Cập nhật — bên phải cùng dòng */}
          <div style={{ marginLeft: "auto" }}>
            <button
              id="roles-save-btn"
              onClick={handleSaveAll}
              disabled={!hasPending || isSavingAll}
              style={{
                padding: "9px 20px", borderRadius: 10,
                background: hasPending ? "var(--primary)" : "var(--muted)",
                color: hasPending ? "#fff" : "var(--muted-foreground)",
                border: "none", fontSize: 13, fontWeight: 700, cursor: hasPending ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: hasPending ? "0 3px 10px color-mix(in srgb, var(--primary) 35%, transparent)" : "none",
                transition: "all 0.15s",
                opacity: isSavingAll ? 0.7 : 1,
              }}
            >
              {isSavingAll
                ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.7s linear infinite" }} /> Đang lưu...</>
                : <><i className="bi bi-floppy" /> Cập nhật {hasPending ? `(${Object.keys(pendingPerms).length + Object.keys(pendingRoles).length})` : ""}</>
              }
            </button>
          </div>
        </div>

        {/* Legend / Chi tiết quyền — hiển thị trước bảng */}
        {(() => {
          const sel = selectedUserId ? users.find(u => u.id === selectedUserId) : null;
          const selPerms = sel ? getPerms(sel) : null;
          return (
            <div className="app-card" style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                  {sel ? (
                    <><i className="bi bi-person-check" style={{ marginRight: 6, color: "var(--primary)" }} />
                      Quyền của: <span style={{ color: "var(--foreground)" }}>{sel.name ?? sel.email}</span>
                    </>
                  ) : "Mô tả quyền chức năng"}
                </p>
                {sel && (
                  <button onClick={() => setSelectedUserId(null)} style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--muted-foreground)", fontSize: 12, padding: "2px 6px",
                  }}>
                    <i className="bi bi-x" /> Bỏ chọn
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {PERMS.map(p => {
                  const active = selPerms ? selPerms.includes(p.key) : null;
                  return (
                    <div key={p.key} style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "6px 12px", borderRadius: 8, transition: "all 0.15s",
                      background: active === true
                        ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                        : active === false
                        ? "var(--muted)"
                        : "var(--muted)",
                      border: active === true
                        ? "1px solid color-mix(in srgb, var(--primary) 30%, transparent)"
                        : "1px solid transparent",
                      opacity: active === false ? 0.45 : 1,
                    }}>
                      <i className={`bi ${p.icon}`} style={{
                        fontSize: 13,
                        color: active === true ? "var(--primary)" : "var(--muted-foreground)",
                      }} />
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: active === true ? "var(--foreground)" : "var(--muted-foreground)",
                      }}>{p.label}</span>
                      {active === true && (
                        <i className="bi bi-check2" style={{ fontSize: 11, color: "var(--primary)", marginLeft: 2 }} />
                      )}
                    </div>
                  );
                })}
              </div>
              {!sel && (
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 8, marginBottom: 0, fontStyle: "italic" }}>
                  ← Click vào một nhân viên trong danh sách để xem quyền chi tiết
                </p>
              )}
            </div>
          );
        })()}

        {/* Table — horizontal scroll */}
        <div className="app-card" style={{ overflowX: "auto" }}>
          {/* Min width để không bị squeeze */}
          <div style={{ minWidth: 1000 }}>

            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: gridCols,
              padding: "10px 16px", borderBottom: "1px solid var(--border)",
              background: "var(--muted)", alignItems: "center",
            }}>
              <span style={thStyle}>Nhân viên</span>
              {!deptFilter && <span style={thStyle}>Phòng ban / Chức vụ</span>}
              <span style={thStyle}>Cấp bậc</span>
              <span style={thStyle}>T.thái</span>
              {/* Perm columns */}
              <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
                {PERMS.map(p => (
                  <div key={p.key} style={{ width: 70, textAlign: "center" }}>
                    <i className={`bi ${p.icon}`} style={{ fontSize: 12, color: "var(--primary)", display: "block", marginBottom: 2 }} />
                    <span style={{ ...thStyle, fontSize: 9.5, display: "block" }}>{p.short}</span>
                  </div>
                ))}
                <div style={{ width: 110, paddingLeft: 8 }}>
                  <span style={thStyle}>Vai trò</span>
                </div>
              </div>
            </div>

            {/* Rows */}
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--muted)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, borderRadius: 6, background: "var(--muted)", width: "40%", marginBottom: 6 }} />
                    <div style={{ height: 10, borderRadius: 6, background: "var(--muted)", width: "60%" }} />
                  </div>
                </div>
              ))
            ) : users.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-people" style={{ fontSize: 32, display: "block", marginBottom: 10, opacity: 0.3 }} />
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Không có nhân viên nào</p>
              </div>
            ) : (
              users.map(u => {
                const currentPerms = getPerms(u);
                const currentRole  = getRole(u);
                const isChanged    = !!pendingPerms[u.id] || !!pendingRoles[u.id];
                const statusMeta   = STATUS_META[u.employee?.status ?? "active"] ?? STATUS_META.active;
                const isSavingSingle = saving === u.id;

                return (
                  <div key={u.id}
                    onClick={() => setSelectedUserId(id => id === u.id ? null : u.id)}
                    style={{
                      display: "grid", gridTemplateColumns: gridCols,
                      padding: "11px 16px", borderBottom: "1px solid var(--border)",
                      alignItems: "center", transition: "background 0.12s",
                      cursor: "pointer",
                      background: selectedUserId === u.id
                        ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                        : isChanged ? "color-mix(in srgb, var(--primary) 4%, transparent)" : "transparent",
                      outline: selectedUserId === u.id
                        ? "2px solid color-mix(in srgb, var(--primary) 40%, transparent)"
                        : "none",
                      outlineOffset: "-2px",
                    }}
                    onMouseEnter={e => { if (selectedUserId !== u.id && !isChanged) (e.currentTarget as HTMLElement).style.background = "var(--muted)"; }}
                    onMouseLeave={e => { if (selectedUserId !== u.id && !isChanged) (e.currentTarget as HTMLElement).style.background = selectedUserId === u.id ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent"; }}
                  >
                    {/* Col: Nhân viên */}
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                        background: currentRole === "ADMIN" ? "rgba(139,92,246,0.15)" : "color-mix(in srgb, var(--primary) 12%, transparent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800,
                        color: currentRole === "ADMIN" ? "#8b5cf6" : "var(--primary)",
                        border: isChanged ? "2px solid var(--primary)" : "2px solid transparent",
                      }}>
                        {initials(u.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.name ?? "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                      </div>
                    </div>

                    {/* Col: Phòng ban (ẩn khi filter) */}
                    {!deptFilter && (
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.employee?.departmentName ?? "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.employee?.position ?? "Chưa phân công"}
                        </div>
                      </div>
                    )}

                    {/* Col: Cấp bậc */}
                    <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                      {u.employee?.level ? LEVEL_LABEL[u.employee.level] ?? u.employee.level : "—"}
                    </div>

                    {/* Col: Trạng thái */}
                    <div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px", borderRadius: 99,
                        background: `${statusMeta.color}18`, color: statusMeta.color,
                        fontSize: 10.5, fontWeight: 700,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusMeta.color, flexShrink: 0 }} />
                        {statusMeta.label}
                      </span>
                    </div>

                    {/* Permissions + Role */}
                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      {PERMS.map(p => {
                        const checked = currentPerms.includes(p.key);
                        return (
                          <div key={p.key} style={{ width: 70, display: "flex", justifyContent: "center" }}>
                            <input
                              type="checkbox"
                              id={`perm-${u.id}-${p.key}`}
                              checked={checked}
                              title={p.label}
                              onChange={() => togglePerm(u.id, p.key, currentPerms)}
                              style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--primary)" }}
                            />
                          </div>
                        );
                      })}
                      {/* Role selector */}
                      <div style={{ width: 110, paddingLeft: 8 }}>
                        <select
                          value={currentRole}
                          onChange={e => changeRole(u.id, e.target.value)}
                          style={{
                            width: "100%", padding: "5px 8px", borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "var(--card)", color: "var(--foreground)",
                            fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none",
                          }}
                        >
                          {Object.entries(ROLE_META).map(([val, { label }]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <button id="roles-prev-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle(page === 1)}>
              ← Trước
            </button>
            <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>
              Trang {page} / {totalPages} · {total} người dùng
            </span>
            <button id="roles-next-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtnStyle(page === totalPages)}>
              Sau →
            </button>
          </div>
        )}

        {/* Legend đã chuyển lên trước bảng */}

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}

/* ─── Style helpers ──────────────────────────────────────────────────────── */
const thStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)",
  textTransform: "uppercase", letterSpacing: "0.08em",
};
function pageBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "6px 14px", borderRadius: 9,
    border: "1px solid var(--border)", background: "var(--card)",
    color: disabled ? "var(--muted-foreground)" : "var(--foreground)",
    fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
  };
}
