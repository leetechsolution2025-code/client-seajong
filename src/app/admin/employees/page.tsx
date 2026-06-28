"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import CreateEmployeeModal from "@/components/hr/CreateEmployeeModal";
import { ToastContainer, useToast } from "@/components/Toast";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Employee {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  createdAt: string;
  employee: {
    code: string;
    departmentName: string;
    position: string;
    level: string;
    status: string;
  } | null;
}

const ROLE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  USER:       { label: "Nhân viên", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  ADMIN:      { label: "Quản trị",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  SUPERADMIN: { label: "SuperAdmin",color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
};
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:     { label: "Đang làm", color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  inactive:   { label: "Nghỉ việc",color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  probation:  { label: "Thử việc", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
};

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function AdminEmployeesPage() {
  const toast = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [departments, setDepartments] = useState<{ code: string; nameVi: string }[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreate, setShowCreate]   = useState(false);
  const [editTarget, setEditTarget]   = useState<Employee | null>(null);
  const [deleteTarget,setDeleteTarget]= useState<Employee | null>(null);
  const [deleting, setDeleting]       = useState(false);

  const LIMIT = 15;

  /* ── Fetch departments cho select ── */
  useEffect(() => {
    fetch("/api/admin/departments")
      .then(r => r.json())
      .then((data: { code: string; nameVi: string }[]) => setDepartments(data))
      .catch(() => {});
  }, []);

  /* ── Fetch employees ── */
  const load = useCallback(async (p = 1, q = search, role = roleFilter, dept = deptFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p), limit: String(LIMIT),
        ...(q    && { search: q }),
        ...(role && { role }),
        ...(dept && { department: dept }),
      });
      const res  = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setEmployees(data.users ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch { toast.error("Lỗi tải dữ liệu", "Không thể kết nối server"); }
    finally   { setLoading(false); }
  }, [search, roleFilter, deptFilter]);

  useEffect(() => { load(1); }, []);

  function handleSearch(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val, roleFilter, deptFilter), 350);
  }

  function handleRoleFilter(val: string) {
    setRoleFilter(val);
    load(1, search, val, deptFilter);
  }

  function handleDeptFilter(val: string) {
    setDeptFilter(val);
    load(1, search, roleFilter, val);
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xoá thất bại");
      toast.success("Đã xoá nhân viên", `${deleteTarget.name} đã được xoá khỏi hệ thống`);
      setDeleteTarget(null);
      load(page);
    } catch (e: unknown) {
      toast.error("Xoá thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally { setDeleting(false); }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const startIdx   = (page - 1) * LIMIT + 1;

  /* ────────────────────────────────────────────────────────────────────── */
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Page Header ── */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)" }}>
              Quản lý nhân sự
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
              Danh sách tài khoản và nhân viên trong hệ thống
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: 12, padding: "10px 20px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 3px 12px color-mix(in srgb, var(--primary) 35%, transparent)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = "none"; }}
          >
            <i className="bi bi-person-plus-fill" /> Thêm nhân viên
          </button>
        </div>

        {/* ── Stats row ── */}
        <div className="d-flex gap-3 flex-wrap">
          {[
            { icon: "bi-people-fill",   label: "Tổng nhân viên",  value: total,  color: "#6366f1" },
            { icon: "bi-person-check",  label: "Đang làm việc",   value: employees.filter(e => e.employee?.status === "active").length, color: "#10b981" },
            { icon: "bi-shield-check",  label: "Quản trị viên",   value: employees.filter(e => e.role === "ADMIN").length,              color: "#f59e0b" },
          ].map((s, i) => (
            <div key={i} className="app-card" style={{ flex: "1 1 180px", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 18 }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)", lineHeight: 1 }}>{s.value}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="app-card p-3 d-flex flex-wrap gap-3 align-items-center">
          {/* Search */}
          <div className="position-relative" style={{ flex: "1 1 240px" }}>
            <i className="bi bi-search position-absolute"
              style={{ left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 13, pointerEvents: "none" }} />
            <input
              value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Tìm tên, email, mã nhân viên..."
              className="app-input w-100"
              style={{ paddingLeft: 36, paddingRight: 14, paddingTop: 8, paddingBottom: 8, fontSize: 13 }}
            />
          </div>
          {/* Dept filter */}
          <select value={deptFilter} onChange={e => handleDeptFilter(e.target.value)}
            className="app-input" style={{ padding: "8px 12px", fontSize: 13, minWidth: 180 }}>
            <option value="">Tất cả phòng ban</option>
            {departments.map(d => (
              <option key={d.code} value={d.code}>{d.nameVi}</option>
            ))}
          </select>
          {/* Role filter */}
          <select value={roleFilter} onChange={e => handleRoleFilter(e.target.value)}
            className="app-input" style={{ padding: "8px 12px", fontSize: 13, minWidth: 150 }}>
            <option value="">Tất cả vai trò</option>
            <option value="USER">Nhân viên</option>
            <option value="ADMIN">Quản trị</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
            {total} nhân viên
          </span>
        </div>

        {/* ── Table ── */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--muted-foreground)" }}>
              <i className="bi bi-arrow-repeat me-2" style={{ animation: "spin 0.8s linear infinite" }} />
              Đang tải dữ liệu...
            </div>
          ) : employees.length === 0 ? (
            <div style={{ padding: "64px 0", textAlign: "center" }}>
              <i className="bi bi-person-x" style={{ fontSize: 40, color: "var(--muted-foreground)", opacity: 0.3, display: "block", marginBottom: 12 }} />
              <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Không có nhân viên nào</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="app-table w-100">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20 }}>#</th>
                    <th>Nhân viên</th>
                    <th>Phòng ban / Chức vụ</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Email đăng nhập</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => {
                    const role   = ROLE_MAP[emp.role]   ?? ROLE_MAP.USER;
                    const status = StatusBadge(emp.employee?.status);
                    return (
                      <tr key={emp.id}>
                        {/* Index */}
                        <td style={{ paddingLeft: 20, color: "var(--muted-foreground)", fontSize: 12, width: 48 }}>
                          {startIdx + idx}
                        </td>
                        {/* Avatar + Name */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 38, height: 38, flexShrink: 0, borderRadius: 10,
                              background: `color-mix(in srgb, ${role.color} 15%, transparent)`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14, fontWeight: 900, color: role.color,
                            }}>
                              {emp.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{emp.name}</p>
                              {emp.employee?.code && (
                                <code style={{ fontSize: 10, color: "var(--muted-foreground)", background: "var(--muted)", padding: "1px 6px", borderRadius: 4 }}>
                                  {emp.employee.code}
                                </code>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Dept / Position */}
                        <td>
                          {emp.employee ? (
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{emp.employee.position || "—"}</p>
                              <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{emp.employee.departmentName || "—"}</p>
                            </div>
                          ) : <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>—</span>}
                        </td>
                        {/* Role */}
                        <td>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                            background: role.bg, color: role.color,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: role.color, display: "inline-block" }} />
                            {role.label}
                          </span>
                        </td>
                        {/* Status */}
                        <td>{status}</td>
                        {/* Email */}
                        <td style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                          {emp.email}
                        </td>
                        {/* Actions */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", paddingRight: 12 }}>
                            <ActionBtn icon="bi-pencil" title="Sửa" onClick={() => setEditTarget(emp)} />
                            {emp.role !== "SUPERADMIN" && (
                              <ActionBtn icon="bi-trash" title="Xoá" danger
                                onClick={() => setDeleteTarget(emp)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderTop: "1px solid var(--border)",
              fontSize: 13, color: "var(--muted-foreground)",
            }}>
              <span>{startIdx}–{Math.min(startIdx + LIMIT - 1, total)} / {total}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => load(p)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
                      background: p === page ? "var(--primary)" : "transparent",
                      color: p === page ? "#fff" : "var(--foreground)",
                      fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.12s",
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <CreateEmployeeModal
          departments={[]}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            toast.success("Tạo thành công!", "Nhân viên mới đã được thêm vào hệ thống.");
            load(1);
          }}
        />
      )}

      {/* ── Edit Role Modal ── */}
      {editTarget && (
        <EditRoleModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setEmployees(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated, role: updated.role as Employee["role"] } : e));
            setEditTarget(null);
            toast.success("Đã cập nhật", `Vai trò của ${updated.name} đã được thay đổi`);
          }}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <ConfirmDeleteModal
          user={deleteTarget}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

/* ─── StatusBadge helper ──────────────────────────────────────────────── */
function StatusBadge(status?: string) {
  const s = STATUS_MAP[status ?? ""] ?? { label: "—", color: "var(--muted-foreground)", bg: "var(--muted)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

/* ─── ActionBtn ──────────────────────────────────────────────────────── */
function ActionBtn({ icon, title, onClick, danger }: { icon: string; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick}
      style={{ padding: "5px 9px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer",
        color: "var(--muted-foreground)", transition: "all 0.12s" }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? "rgba(239,68,68,0.1)" : "var(--muted)";
        e.currentTarget.style.color = danger ? "#ef4444" : "var(--foreground)";
      }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 13 }} />
    </button>
  );
}

/* ─── EditRoleModal ──────────────────────────────────────────────────── */
function EditRoleModal({ user, onClose, onSaved }: {
  user: Employee;
  onClose: () => void;
  onSaved: (u: { id: string; name: string; role: string }) => void;
}) {
  const [role,    setRole]    = useState(user.role);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const res  = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật");
      onSaved({ id: user.id, name: user.name, role });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Có lỗi xảy ra"); }
    finally { setSaving(false); }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <ModalHeader icon="bi-pencil-square" iconColor="#6366f1" title="Chỉnh sửa vai trò" sub={user.email} onClose={onClose} />
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelSt}>Nhân viên</label>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{user.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>{user.employee?.departmentName} · {user.employee?.position}</p>
          </div>
          <div>
            <label style={labelSt}>Vai trò <span style={{ color: "#ef4444" }}>*</span></label>
            <select value={role} onChange={e => setRole(e.target.value as "USER" | "ADMIN")}
              className="app-input" style={{ padding: "9px 12px", fontSize: 13, width: "100%" }}>
              <option value="USER">Nhân viên (User)</option>
              <option value="ADMIN">Quản trị viên (Admin)</option>
            </select>
          </div>
          {error && <ErrorBox msg={error} />}
        </div>
        <ModalFooter onCancel={onClose} onConfirm={handleSave} loading={saving} label="Lưu thay đổi" />
      </div>
    </ModalBackdrop>
  );
}

/* ─── ConfirmDeleteModal ─────────────────────────────────────────────── */
function ConfirmDeleteModal({ user, loading, onCancel, onConfirm }: {
  user: Employee; loading: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <ModalBackdrop onClose={onCancel}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <ModalHeader icon="bi-trash" iconColor="#ef4444" title="Xác nhận xoá nhân viên" sub="Hành động này không thể hoàn tác" onClose={onCancel} />
        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            Bạn chắc chắn muốn xoá nhân viên{" "}
            <strong style={{ color: "var(--foreground)" }}>{user.name}</strong>? Toàn bộ dữ liệu liên quan (tài khoản, hồ sơ) sẽ bị xoá vĩnh viễn.
          </p>
        </div>
        <ModalFooter onCancel={onCancel} onConfirm={onConfirm} loading={loading} label="Xoá nhân viên" danger />
      </div>
    </ModalBackdrop>
  );
}

/* ─── Shared Modal Primitives ────────────────────────────────────────── */
function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1060, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", zIndex: 1070, top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "calc(100% - 32px)",
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 18, boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {children}
      </div>
    </>
  );
}

function ModalHeader({ icon, iconColor, title, sub, onClose }: {
  icon: string; iconColor: string; title: string; sub: string; onClose: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${iconColor} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`bi ${icon}`} style={{ color: iconColor, fontSize: 16 }} />
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: "var(--foreground)" }}>{title}</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{sub}</p>
        </div>
      </div>
      <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "4px 8px", borderRadius: 8, fontSize: 16 }}>
        <i className="bi bi-x-lg" />
      </button>
    </div>
  );
}

function ModalFooter({ onCancel, onConfirm, loading, label, danger }: {
  onCancel: () => void; onConfirm: () => void; loading: boolean; label: string; danger?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--muted)" }}>
      <button onClick={onCancel} disabled={loading}
        style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        Huỷ
      </button>
      <button onClick={onConfirm} disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 10, border: "none",
          background: danger ? "#ef4444" : "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          boxShadow: `0 3px 10px ${danger ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
        }}>
        {loading ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.7s linear infinite" }} /> Đang xử lý...</> : label}
      </button>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 13 }}>
      <i className="bi bi-exclamation-circle-fill" style={{ flexShrink: 0 }} />{msg}
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 800, textTransform: "uppercase",
  letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: 6,
};
