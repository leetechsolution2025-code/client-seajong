"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type User = { id: string; email: string; name: string; role: string; createdAt: string; employee?: { departmentCode?: string; position?: string } };

export default function AccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwModal, setPwModal] = useState<{ userId: string; email: string } | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [roleError, setRoleError] = useState("");
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  // ── ConfirmDialog state ────────────────────────────────────────────────────
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/company/accounts").then(r => r.json()).catch(() => []);
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Bước 1: mở ConfirmDialog
  const requestToggleRole = (user: User) => {
    setConfirmTarget(user);
  };

  // Bước 2: thực hiện sau khi user xác nhận
  const handleToggleRole = async () => {
    if (!confirmTarget) return;
    const newRole = confirmTarget.role === "ADMIN" ? "USER" : "ADMIN";
    setConfirmTarget(null);
    setRoleLoading(confirmTarget.id);
    setRoleError("");
    try {
      const res = await fetch("/api/company/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: confirmTarget.id, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Lỗi đổi vai trò (${res.status})`);
      load();
    } catch (e: any) {
      setRoleError(e.message);
    } finally {
      setRoleLoading(null);
    }
  };

  const handleChangePw = async () => {
    if (!pwModal || !newPw) { setPwError("Vui lòng nhập mật khẩu"); return; }
    setPwSaving(true); setPwError(""); setPwSuccess("");
    try {
      const res = await fetch("/api/company/accounts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: pwModal.userId, newPassword: newPw }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      setPwSuccess("Đã đổi mật khẩu thành công!");
      setNewPw(""); setTimeout(() => { setPwModal(null); setPwSuccess(""); }, 1500);
    } catch (e: any) { setPwError(e.message); }
    finally { setPwSaving(false); }
  };

  // Thông tin cho ConfirmDialog
  const confirmIsUpgrade = confirmTarget?.role !== "ADMIN";
  const confirmTitle = confirmIsUpgrade ? "Nâng lên ADMIN" : "Hạ xuống USER";
  const confirmMessage = confirmIsUpgrade
    ? <>Tài khoản <strong>{confirmTarget?.name || confirmTarget?.email}</strong> sẽ có toàn quyền quản trị. Xác nhận?</>
    : <>Tài khoản <strong>{confirmTarget?.name || confirmTarget?.email}</strong> sẽ mất quyền ADMIN. Xác nhận?</>;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto", width: "100%" }}>

      {/* ConfirmDialog thay thế confirm() native */}
      <ConfirmDialog
        open={!!confirmTarget}
        title={confirmTitle}
        message={confirmMessage}
        variant={confirmIsUpgrade ? "warning" : "info"}
        confirmLabel={confirmIsUpgrade ? "Nâng lên ADMIN" : "Hạ xuống USER"}
        onConfirm={handleToggleRole}
        onCancel={() => setConfirmTarget(null)}
      />

      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em" }}>Tài khoản hệ thống</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>Quản lý tài khoản đăng nhập, đổi mật khẩu và phân vai trò</p>
      </div>

      {roleError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 13, fontWeight: 600 }}>
          <i className="bi bi-exclamation-circle-fill" />
          {roleError}
          <button onClick={() => setRoleError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}><i className="bi bi-arrow-repeat" style={{ fontSize: 24, animation: "spin 1s linear infinite", display: "block", marginBottom: 8 }} />Đang tải...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Tài khoản", "Phòng ban", "Vai trò", "Ngày tạo", "Thao tác"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{u.name || u.email}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{u.email}</p>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted-foreground)" }}>
                    {u.employee?.departmentCode || "—"}
                    {u.employee?.position && <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{u.employee.position}</p>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: u.role === "ADMIN" ? "rgba(99,102,241,0.1)" : "rgba(0,0,0,0.05)", color: u.role === "ADMIN" ? "#6366f1" : "var(--muted-foreground)" }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted-foreground)" }}>
                    {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setPwModal({ userId: u.id, email: u.email }); setNewPw(""); setPwError(""); setPwSuccess(""); }}
                        style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "transparent", color: "var(--foreground)", fontSize: 12, cursor: "pointer" }} title="Đổi mật khẩu">
                        <i className="bi bi-key" />
                      </button>
                      <button onClick={() => requestToggleRole(u)} disabled={roleLoading === u.id}
                        style={{ padding: "5px 10px", border: `1px solid ${u.role === "ADMIN" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`, borderRadius: 8, background: "transparent", color: u.role === "ADMIN" ? "#ef4444" : "#6366f1", fontSize: 12, cursor: roleLoading === u.id ? "not-allowed" : "pointer" }}
                        title={u.role === "ADMIN" ? "Hạ xuống USER" : "Nâng lên ADMIN"}>
                        <i className={`bi ${roleLoading === u.id ? "bi-arrow-repeat" : u.role === "ADMIN" ? "bi-arrow-down-circle" : "bi-arrow-up-circle"}`}
                          style={roleLoading === u.id ? { animation: "spin 0.7s linear infinite" } : {}} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Change Password Modal */}
      {pwModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: "var(--card)", borderRadius: 20, padding: 32, width: 360, boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>Đổi mật khẩu</h3>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: "var(--muted-foreground)" }}>{pwModal.email}</p>
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Mật khẩu mới</p>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Tối thiểu 6 ký tự"
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)", color: "var(--foreground)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
              onKeyDown={e => { if (e.key === "Enter") handleChangePw(); }} autoFocus />
            {pwError && <p style={{ color: "#f43f5e", fontSize: 12, margin: "0 0 10px" }}>{pwError}</p>}
            {pwSuccess && <p style={{ color: "#10b981", fontSize: 12, margin: "0 0 10px", fontWeight: 600 }}>{pwSuccess}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleChangePw} disabled={pwSaving} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "var(--radius)", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: pwSaving ? "not-allowed" : "pointer" }}>
                {pwSaving ? "Đang đổi..." : "Xác nhận"}
              </button>
              <button onClick={() => setPwModal(null)} style={{ flex: 1, padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "transparent", color: "var(--foreground)", fontSize: 13, cursor: "pointer" }}>Hủy</button>
            </div>
          </motion.div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
