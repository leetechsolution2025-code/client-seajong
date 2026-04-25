"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

type DeptAccess = { code: string; level: "full" | "view" };
type User = { id: string; email: string; name: string; role: string; permissions: string; deptAccess: string; employee?: { departmentCode?: string; position?: string; name?: string } };
type Dept = { code: string; nameVi: string; icon: string };

const FEATURE_FLAGS = [
  { key: "crm", label: "Quản lý khách hàng (CRM)", icon: "bi-people-fill" },
  { key: "approve_request", label: "Phê duyệt yêu cầu mua hàng", icon: "bi-cart-check" },
  { key: "approve_budget", label: "Phê duyệt ngân sách", icon: "bi-cash-coin" },
  { key: "report", label: "Xem báo cáo tổng hợp", icon: "bi-bar-chart" },
  { key: "plan", label: "Lập kế hoạch", icon: "bi-calendar-check" },
  { key: "notify", label: "Gửi thông báo", icon: "bi-bell" },
  { key: "chat", label: "Nhắn tin nội bộ", icon: "bi-chat-dots" },
];

export default function PermissionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [deptAccess, setDeptAccess] = useState<DeptAccess[]>([]);
  const [role, setRole] = useState<string>("USER");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [us, ds] = await Promise.all([
      fetch("/api/company/permissions").then(r => r.json()).catch(() => []),
      fetch("/api/company/departments").then(r => r.json()).catch(() => []),
    ]);
    setUsers(Array.isArray(us) ? us : []);
    setDepts(Array.isArray(ds) ? ds : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectUser = (u: User) => {
    setSelected(u);
    try { setPerms(JSON.parse(u.permissions) || []); } catch { setPerms([]); }
    try { setDeptAccess(JSON.parse(u.deptAccess) || []); } catch { setDeptAccess([]); }
    setRole(u.role);
    setSaved(false);
  };

  const togglePerm = (key: string) => setPerms(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);

  const getDeptLevel = (code: string) => deptAccess.find(d => d.code === code)?.level || "none";
  const setDeptLevel = (code: string, level: string) => {
    setDeptAccess(prev => {
      if (level === "none") return prev.filter(d => d.code !== code);
      const existing = prev.find(d => d.code === code);
      if (existing) return prev.map(d => d.code === code ? { ...d, level: level as "full" | "view" } : d);
      return [...prev, { code, level: level as "full" | "view" }];
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch("/api/company/permissions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.id, permissions: perms, deptAccess, role }) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      load();
    } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100, margin: "0 auto", width: "100%" }}>

      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em" }}>Phân quyền người dùng</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>Thiết lập quyền truy cập phòng ban và tính năng cho từng thành viên</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* User list */}
        <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Chọn người dùng</p>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)" }}><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /></div>
          ) : (
            <div>
              {users.map(u => (
                <div key={u.id} onClick={() => selectUser(u)} style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: selected?.id === u.id ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", transition: "background 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
                      {(u.name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name || u.email}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: u.role === "ADMIN" ? "rgba(99,102,241,0.1)" : "rgba(0,0,0,0.05)", color: u.role === "ADMIN" ? "#6366f1" : "var(--muted-foreground)" }}>{u.role}</span>
                        {u.employee?.departmentCode && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{u.employee.departmentCode}</span>}
                      </div>
                    </div>
                    {selected?.id === u.id && <i className="bi bi-chevron-right" style={{ color: "var(--primary)", fontSize: 12 }} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permission editor */}
        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header */}
            <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>{selected.name || selected.email}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>{selected.email}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {saved && <p style={{ margin: 0, fontSize: 12, color: "#10b981", fontWeight: 700 }}><i className="bi bi-check2-circle" /> Đã lưu</p>}
                <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: "7px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)", color: role === "ADMIN" ? "#6366f1" : "var(--foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer", outline: "none" }}>
                  <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
                </select>
                <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", border: "none", borderRadius: "var(--radius)", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>

            {/* Feature permissions */}
            <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="bi bi-toggles" style={{ color: "#6366f1", fontSize: 15 }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>Tính năng đặc biệt</p>
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {FEATURE_FLAGS.map(f => (
                  <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${perms.includes(f.key) ? "var(--primary)" : "var(--border)"}`, cursor: "pointer", background: perms.includes(f.key) ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent", transition: "all 0.15s" }}>
                    <input type="checkbox" checked={perms.includes(f.key)} onChange={() => togglePerm(f.key)} style={{ display: "none" }} />
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${perms.includes(f.key) ? "var(--primary)" : "var(--border)"}`, background: perms.includes(f.key) ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                      {perms.includes(f.key) && <i className="bi bi-check" style={{ color: "#fff", fontSize: 12 }} />}
                    </div>
                    <i className={`bi ${f.icon}`} style={{ color: perms.includes(f.key) ? "var(--primary)" : "var(--muted-foreground)", fontSize: 14, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: perms.includes(f.key) ? 700 : 500, color: perms.includes(f.key) ? "var(--foreground)" : "var(--muted-foreground)" }}>{f.label}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Department access */}
            <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="bi bi-diagram-3" style={{ color: "#0ea5e9", fontSize: 15 }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>Phòng ban được truy cập</p>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-foreground)" }}>{deptAccess.length} / {depts.length} phòng ban</span>
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {depts.map(d => {
                  const lvl = getDeptLevel(d.code);
                  return (
                    <div key={d.code} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${lvl !== "none" ? "var(--primary)" : "var(--border)"}`, background: lvl !== "none" ? "color-mix(in srgb, var(--primary) 4%, transparent)" : "transparent" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <i className={`bi ${d.icon}`} style={{ fontSize: 13, color: lvl !== "none" ? "var(--primary)" : "var(--muted-foreground)" }} />
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: lvl !== "none" ? "var(--foreground)" : "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{d.nameVi}</p>
                      </div>
                      <select value={lvl} onChange={e => setDeptLevel(d.code, e.target.value)} style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", color: "var(--foreground)", fontSize: 11, cursor: "pointer", outline: "none" }}>
                        <option value="none">Không có quyền</option>
                        <option value="view">Chỉ xem</option>
                        <option value="full">Toàn quyền</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 12, color: "var(--muted-foreground)" }}>
            <i className="bi bi-shield-lock" style={{ fontSize: 40, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Chọn người dùng để phân quyền</p>
            <p style={{ margin: 0, fontSize: 12 }}>Nhấn vào tên người dùng ở cột trái</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
