"use client";

import React, { useEffect, useState, useCallback } from "react";
import { SearchInput } from "@/components/ui/SearchInput";

interface Department {
  id: string; code: string; nameVi: string; nameEn: string;
  group: string; icon: string | null; description: string | null;
  sortOrder: number; isActive: boolean;
}

const GROUP_LABELS: Record<string, string> = {
  management: "Quản lý", core: "Cốt lõi",
  business: "Kinh doanh", support: "Vận hành / Hỗ trợ",
};

const EMPTY_FORM = { code: "", nameVi: "", nameEn: "", group: "core", icon: "", description: "", sortOrder: "0", isActive: true };

export default function DepartmentsClient() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<Department | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/departments");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDepartments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = departments.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.nameVi.toLowerCase().includes(q) || d.nameEn.toLowerCase().includes(q) || d.code.includes(q);
    return matchSearch && (groupFilter === "all" || d.group === groupFilter);
  });

  const grouped = ["management", "core", "business", "support"].reduce<Record<string, Department[]>>((acc, g) => {
    const items = filtered.filter(d => d.group === g);
    if (items.length) acc[g] = items;
    return acc;
  }, {});

  function openAdd() { setForm(EMPTY_FORM); setError(""); setModal("add"); }
  function openEdit(d: Department) {
    setSelected(d);
    setForm({ code: d.code, nameVi: d.nameVi, nameEn: d.nameEn, group: d.group, icon: d.icon || "", description: d.description || "", sortOrder: String(d.sortOrder), isActive: d.isActive });
    setError(""); setModal("edit");
  }
  function openDelete(d: Department) { setSelected(d); setModal("delete"); }

  async function handleSave() {
    setError(""); setSaving(true);
    const body = { ...form, sortOrder: Number(form.sortOrder) };
    const res = modal === "add"
      ? await fetch("/api/admin/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch(`/api/admin/departments/${selected!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Lỗi không xác định"); return; }
    setModal(null); load();
  }

  async function handleDelete() {
    setSaving(true);
    await fetch(`/api/admin/departments/${selected!.id}`, { method: "DELETE" });
    setSaving(false); setModal(null); load();
  }

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 800,
    textTransform: "uppercase", letterSpacing: "0.1em",
    color: "var(--muted-foreground)", marginBottom: 6,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 13px", borderRadius: 9,
    border: "1px solid var(--border)", background: "var(--card)",
    color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)" }}>Danh mục phòng ban</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>Quản lý danh mục phòng ban / bộ phận dùng trong toàn hệ thống</p>
        </div>
        <button onClick={openAdd} className="btn-primary-app d-flex align-items-center gap-2 px-4 py-2">
          <i className="bi bi-plus-lg" /> Thêm phòng ban
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="app-card p-3 d-flex flex-wrap gap-3 align-items-center">
        <SearchInput 
          value={search} 
          onChange={setSearch} 
          placeholder="Tìm tên, mã phòng ban..." 
          className="border-0 bg-white" 
          style={{ width: 250 }} 
        />
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="app-input" style={{ padding: "8px 32px 8px 12px", fontSize: 13 }}>
          <option value="all">Tất cả nhóm</option>
          {Object.entries(GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted-foreground)" }}>{filtered.length} phòng ban</span>
      </div>

      {/* ── Table grouped ── */}
      {loading ? (
        <div className="app-card p-5 text-center text-muted-foreground">
          <i className="bi bi-arrow-repeat animate-spin me-2" /> Đang tải...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="app-card p-5 text-center text-muted-foreground">
          <i className="bi bi-inbox d-block mb-2" style={{ fontSize: 32, opacity: 0.3 }} /> Không có dữ liệu
        </div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="app-card overflow-hidden">
            <div className="d-flex align-items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className={`group-${group} badge rounded-pill px-3 py-1`} style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {GROUP_LABELS[group]}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{items.length} phòng ban</span>
            </div>
            <table className="app-table w-100">
              <thead>
                <tr>
                  <th>Mã định danh</th><th>Tên tiếng Việt</th><th>Tên tiếng Anh</th>
                  <th>Icon</th><th>Thứ tự</th><th>Trạng thái</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(d => (
                  <tr key={d.id}>
                    <td><code style={{ fontSize: 12, background: "var(--muted)", padding: "2px 8px", borderRadius: 6, color: "var(--primary)" }}>{d.code}</code></td>
                    <td style={{ fontWeight: 600, color: "var(--foreground)" }}>
                      {d.icon && <i className={`bi ${d.icon} me-2`} style={{ color: "var(--muted-foreground)" }} />}
                      {d.nameVi}
                    </td>
                    <td style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{d.nameEn}</td>
                    <td style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{d.icon || "—"}</td>
                    <td className="text-center" style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{d.sortOrder}</td>
                    <td>
                      <span className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill"
                        style={{ fontSize: 11, fontWeight: 700, border: "none", background: d.isActive ? "rgba(16,185,129,0.1)" : "var(--muted)", color: d.isActive ? "#10b981" : "var(--muted-foreground)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.isActive ? "#10b981" : "var(--muted-foreground)", display: "inline-block" }} />
                        {d.isActive ? "Đang dùng" : "Ẩn"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1 justify-content-end">
                        <button onClick={() => openEdit(d)} title="Sửa" style={{
                          padding: "5px 9px", borderRadius: 8, border: "none", background: "transparent",
                          color: "var(--muted-foreground)", cursor: "pointer", transition: "background 0.12s",
                        }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <i className="bi bi-pencil" style={{ fontSize: 13 }} />
                        </button>
                        <button onClick={() => openDelete(d)} title="Xoá" style={{
                          padding: "5px 9px", borderRadius: 8, border: "none", background: "transparent",
                          color: "var(--muted-foreground)", cursor: "pointer", transition: "all 0.12s",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#ef4444"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}>
                          <i className="bi bi-trash" style={{ fontSize: 13 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* ── Modal Add/Edit ── */}
      {(modal === "add" || modal === "edit") && (
        <div className="position-fixed d-flex align-items-center justify-content-center p-3" style={{ inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 1050 }}>
          <div className="app-card w-100" style={{ maxWidth: 520, padding: 28, boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 style={{ margin: 0, fontWeight: 900, color: "var(--foreground)" }}>
                {modal === "add" ? "Thêm phòng ban mới" : "Chỉnh sửa phòng ban"}
              </h5>
              <button onClick={() => setModal(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "4px 8px", borderRadius: 8, fontSize: 16 }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {error && (
              <div className="d-flex align-items-center gap-2 mb-3 p-3 rounded-3" style={{ fontSize: 13, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <i className="bi bi-exclamation-circle-fill flex-shrink-0" /> {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Mã định danh <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                  placeholder="vd: hr, it, sales" disabled={modal === "edit"}
                  style={{ ...inputStyle, opacity: modal === "edit" ? 0.6 : 1, cursor: modal === "edit" ? "not-allowed" : "text", fontFamily: "monospace" }} />
                <p style={{ margin: "5px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>Chỉ chữ thường, số và dấu gạch dưới. Không thể thay đổi sau khi tạo.</p>
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <label style={labelStyle}>Tên tiếng Việt <span style={{ color: "#ef4444" }}>*</span></label>
                  <input value={form.nameVi} onChange={e => setForm({ ...form, nameVi: e.target.value })} placeholder="Nhân sự" style={inputStyle} />
                </div>
                <div className="col-6">
                  <label style={labelStyle}>Tên tiếng Anh <span style={{ color: "#ef4444" }}>*</span></label>
                  <input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} placeholder="Human Resources" style={inputStyle} />
                </div>
              </div>
              <div className="row g-3">
                <div className="col-7">
                  <label style={labelStyle}>Nhóm <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} style={inputStyle}>
                    {Object.entries(GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="col-5">
                  <label style={labelStyle}>Thứ tự</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Icon <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(Bootstrap icon class)</span></label>
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi ${form.icon || "bi-question"}`} style={{ fontSize: 20, color: "var(--muted-foreground)", width: 28, textAlign: "center", flexShrink: 0 }} />
                  <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="bi-people" style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Mô tả</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  placeholder="Chức năng của phòng ban..." style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: "var(--primary)", cursor: "pointer" }}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", cursor: "pointer", margin: 0 }}>
                  Cho phép hoạt động (hiển thị trên toàn hệ thống)
                </label>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button onClick={() => setModal(null)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Huỷ</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary-app" style={{ padding: "9px 22px", fontSize: 13, opacity: saving ? 0.6 : 1 }}>
                {saving ? <><i className="bi bi-arrow-repeat animate-spin me-1" />Đang lưu...</> : modal === "add" ? "Thêm mới" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Delete ── */}
      {modal === "delete" && selected && (
        <div className="position-fixed d-flex align-items-center justify-content-center p-3" style={{ inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 1050 }}>
          <div className="app-card text-center" style={{ maxWidth: 380, padding: 28, boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
            <div className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-3" style={{ width: 56, height: 56, background: "rgba(239,68,68,0.12)" }}>
              <i className="bi bi-trash" style={{ fontSize: 24, color: "#ef4444" }} />
            </div>
            <h5 style={{ margin: "0 0 8px", fontWeight: 900, color: "var(--foreground)" }}>Xoá phòng ban?</h5>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--muted-foreground)" }}>
              Bạn có chắc muốn xoá <strong style={{ color: "var(--foreground)" }}>{selected.nameVi}</strong>?
            </p>
            <code style={{ fontSize: 12, background: "var(--muted)", padding: "2px 10px", borderRadius: 6, color: "var(--primary)" }}>{selected.code}</code>
            <div className="d-flex justify-content-center gap-3 mt-4">
              <button onClick={() => setModal(null)} style={{ padding: "9px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Huỷ</button>
              <button onClick={handleDelete} disabled={saving} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Đang xoá..." : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
