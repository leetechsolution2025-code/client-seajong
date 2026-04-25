"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

type Branch = { id: string; code: string; name: string; shortName?: string; address?: string; phone?: string; email?: string; status: string; sortOrder: number };
type Form = { code: string; name: string; shortName: string; address: string; phone: string; email: string; status: string };
const EMPTY: Form = { code: "", name: "", shortName: "", address: "", phone: "", email: "", status: "active" };

const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 11px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, borderRadius: "var(--radius)", outline: "none", boxSizing: "border-box" };
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
);

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/company/branches").then(r => r.json()).catch(() => []);
    setBranches(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true); setError(""); };
  const openEdit = (b: Branch) => { setForm({ code: b.code, name: b.name, shortName: b.shortName || "", address: b.address || "", phone: b.phone || "", email: b.email || "", status: b.status }); setEditId(b.id); setShowForm(true); setError(""); };

  const handleSave = async () => {
    if (!form.code.trim()) { setError("Mã chi nhánh không được để trống"); return; }
    if (!form.name.trim()) { setError("Tên chi nhánh không được để trống"); return; }
    setSaving(true); setError("");
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/company/branches/${editId}` : "/api/company/branches";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu");
      setShowForm(false); load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa chi nhánh này?")) return;
    setDeleting(id);
    await fetch(`/api/company/branches/${id}`, { method: "DELETE" }).catch(() => {});
    setDeleting(null); load();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto", width: "100%" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em" }}>Chi nhánh</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>Quản lý các chi nhánh / cơ sở của công ty</p>
        </div>
        <button onClick={openAdd} style={{ padding: "9px 18px", border: "none", borderRadius: "var(--radius)", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="bi bi-plus-lg" /> Thêm chi nhánh
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800 }}>{editId ? "Chỉnh sửa" : "Thêm"} chi nhánh</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {!editId && <div><p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Mã chi nhánh *</p><Input value={form.code} onChange={set("code")} placeholder="cn-hanoi" /></div>}
            <div><p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Tên chi nhánh *</p><Input value={form.name} onChange={set("name")} placeholder="Chi nhánh Hà Nội" /></div>
            <div><p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Tên viết tắt</p><Input value={form.shortName} onChange={set("shortName")} placeholder="HN" /></div>
            <div><p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Điện thoại</p><Input value={form.phone} onChange={set("phone")} placeholder="024 XXXX XXXX" /></div>
            <div><p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Email</p><Input value={form.email} onChange={set("email")} placeholder="hanoi@company.vn" /></div>
            <div style={{ gridColumn: "1/-1" }}><p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Địa chỉ</p><Input value={form.address} onChange={set("address")} placeholder="123 Đường ABC, Hà Nội" /></div>
            <div><p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Trạng thái</p>
              <select value={form.status} onChange={set("status")} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option>
              </select>
            </div>
          </div>
          {error && <p style={{ color: "#f43f5e", fontSize: 12, margin: "0 0 10px" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", border: "none", borderRadius: "var(--radius)", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "transparent", color: "var(--foreground)", fontSize: 13, cursor: "pointer" }}>Hủy</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}><i className="bi bi-arrow-repeat" style={{ fontSize: 24, animation: "spin 1s linear infinite", display: "block", marginBottom: 8 }} />Đang tải...</div>
        ) : branches.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
            <i className="bi bi-geo-alt" style={{ fontSize: 32, display: "block", marginBottom: 12, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Chưa có chi nhánh nào</p>
            <p style={{ margin: "4px 0 0", fontSize: 12 }}>Nhấn "+ Thêm chi nhánh" để bắt đầu</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Mã", "Tên chi nhánh", "Điện thoại", "Email", "Địa chỉ", "Trạng thái", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branches.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: i < branches.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{b.code}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{b.name}</p>
                    {b.shortName && <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{b.shortName}</p>}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--foreground)" }}>{b.phone || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--foreground)" }}>{b.email || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted-foreground)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.address || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: b.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: b.status === "active" ? "#10b981" : "#ef4444" }}>
                      {b.status === "active" ? "Hoạt động" : "Ngừng"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(b)} style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "transparent", color: "var(--foreground)", fontSize: 12, cursor: "pointer" }}><i className="bi bi-pencil" /></button>
                      <button onClick={() => handleDelete(b.id)} disabled={deleting === b.id} style={{ padding: "5px 10px", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, background: "transparent", color: "#ef4444", fontSize: 12, cursor: deleting === b.id ? "not-allowed" : "pointer" }}><i className="bi bi-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
