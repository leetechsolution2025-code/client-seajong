"use client";

import React, { useState, useEffect } from "react";
import { WarehouseLayoutModal } from "./WarehouseLayoutModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  managerId: string | null;
  isVirtual: boolean;
  isActive: boolean;
  layoutJson: string | null;
  createdAt: string;
}

const TYPE_CFG: Record<string, { label: string; icon: string; color: string; bg: string; gradient: string }> = {
  showroom:  { label: "Showroom",          icon: "bi-shop",             color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)" },
  transit:   { label: "Trung chuyển",      icon: "bi-signpost-split",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)" },
  storage:   { label: "Kho lưu trữ",       icon: "bi-building",         color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)" },
};

function getTypeCfg(wh: Warehouse) {
  if (wh.isVirtual) return TYPE_CFG.transit;
  return TYPE_CFG.storage;
}

export function WarehouseSetup() {
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLayoutWh, setEditingLayoutWh] = useState<Warehouse | null>(null);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: "", name: "", address: "", type: "storage", manager: "" });
  const [saving, setSaving] = useState(false);

  const handleStartEdit = (wh: Warehouse) => {
    setEditingWh(wh);
    setFormData({
      code: wh.code || "",
      name: wh.name,
      address: wh.address || "",
      type: wh.isVirtual ? "transit" : "storage",
      manager: wh.managerId || "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWh(null);
    setFormData({ code: "", name: "", address: "", type: "storage", manager: "" });
  };

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logistics/warehouses");
      if (res.ok) setWarehouses(await res.json());
    } catch (e) {
      console.error("Failed to fetch warehouses:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWarehouses(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) { toast.error("Lỗi", "Vui lòng nhập đầy đủ Mã và Tên kho"); return; }
    try {
      setSaving(true);
      const url = editingWh ? `/api/logistics/warehouses/${editingWh.id}` : "/api/logistics/warehouses";
      const method = editingWh ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          address: formData.address,
          managerId: formData.manager,
          isVirtual: formData.type === "transit",
        }),
      });
      if (res.ok) {
        toast.success("Thành công", editingWh ? "Đã cập nhật thông tin kho thành công" : "Đã thêm kho mới thành công");
        await fetchWarehouses();
        setIsModalOpen(false);
        setEditingWh(null);
        setFormData({ code: "", name: "", address: "", type: "storage", manager: "" });
      } else {
        const err = await res.json();
        toast.error("Lỗi", err.error || "Không thể lưu thông tin kho");
      }
    } catch { toast.error("Lỗi", "Không thể kết nối đến máy chủ"); }
    finally { setSaving(false); }
  };

  const handleSaveLayout = async (elements: any[]) => {
    if (!editingLayoutWh) return;
    try {
      const res = await fetch(`/api/logistics/warehouses/${editingLayoutWh.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layoutJson: JSON.stringify(elements) }),
      });
      if (res.ok) { 
        toast.success("Thành công", "Đã cập nhật sơ đồ layout thành công");
        await fetchWarehouses(); 
        setEditingLayoutWh(null); 
      }
      else { const err = await res.json(); toast.error("Lỗi", err.error || res.statusText); }
    } catch (e: any) { toast.error("Lỗi kết nối", e.message); }
  };

  const [deletingWh, setDeletingWh] = useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deletingWh) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/logistics/warehouses/${deletingWh.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Thành công", "Đã xoá kho thành công");
        await fetchWarehouses();
        setDeletingWh(null);
      } else {
        const err = await res.json();
        toast.error("Lỗi", err.error || "Không thể xoá kho");
      }
    } catch (e: any) {
      toast.error("Lỗi kết nối", e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCount = warehouses.filter(w => w.isActive).length;
  const hasLayout = warehouses.filter(w => w.layoutJson).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Summary pills */}
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "Tổng số kho", value: warehouses.length, icon: "bi-building", color: "#3b82f6" },
            { label: "Đang hoạt động", value: activeCount, icon: "bi-check-circle", color: "#10b981" },
            { label: "Có sơ đồ layout", value: hasLayout, icon: "bi-map", color: "#8b5cf6" },
          ].map(s => (
            <div key={s.label} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "7px 14px",
            }}>
              <i className={`bi ${s.icon}`} style={{ fontSize: 14, color: s.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Add button */}
        <button
          onClick={() => {
            setEditingWh(null);
            setFormData({ code: "", name: "", address: "", type: "storage", manager: "" });
            setIsModalOpen(true);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 20px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            color: "#fff", fontSize: 13, fontWeight: 700,
            boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
            transition: "all 0.2s",
          }}
        >
          <i className="bi bi-plus-circle-fill" style={{ fontSize: 15 }} />
          Thêm kho mới
        </button>
      </div>

      {/* ── Warehouse Grid ── */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, border: "3px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Đang tải danh sách kho...</span>
          </div>
        </div>
      ) : warehouses.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 20px", gap: 16,
          border: "2px dashed var(--border)", borderRadius: 20,
          background: "var(--card)",
        }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-building-add" style={{ fontSize: 32, color: "#3b82f6" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--foreground)" }}>Chưa có kho hàng nào</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>Thêm kho đầu tiên để bắt đầu quản lý hệ thống</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} style={{
            padding: "10px 24px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff",
            fontSize: 13, fontWeight: 700,
          }}>
            <i className="bi bi-plus-circle-fill me-2" />Thêm kho ngay
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {warehouses.map(wh => {
            const cfg = getTypeCfg(wh);
            const isHovered = hoveredCard === wh.id;
            const hasLayoutData = !!wh.layoutJson;

            return (
              <div
                key={wh.id}
                onMouseEnter={() => setHoveredCard(wh.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: "var(--card)",
                  border: `1px solid ${isHovered ? cfg.color : "var(--border)"}`,
                  borderRadius: 18,
                  overflow: "hidden",
                  transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                  transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                  boxShadow: isHovered ? `0 12px 28px ${cfg.color}22` : "0 1px 4px rgba(0,0,0,0.04)",
                  cursor: "default",
                }}
              >
                {/* Colour accent strip */}
                <div style={{ height: 4, background: cfg.gradient }} />

                {/* Card header */}
                <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 13,
                      background: cfg.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      transition: "transform 0.2s",
                      transform: isHovered ? "scale(1.08)" : "scale(1)",
                    }}>
                      <i className={`bi ${cfg.icon}`} style={{ fontSize: 20, color: cfg.color }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {wh.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6,
                          background: cfg.bg, color: cfg.color, letterSpacing: 0.3,
                        }}>{wh.code}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 6,
                          background: cfg.bg, color: cfg.color,
                        }}>{cfg.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown */}
                  <div className="dropdown">
                    <button
                      className="btn p-0"
                      data-bs-toggle="dropdown"
                      style={{ width: 28, height: 28, borderRadius: 8, background: "var(--muted)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 13 }}
                    >
                      <i className="bi bi-three-dots" />
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end border-0 shadow" style={{ fontSize: 12, borderRadius: 12, minWidth: 160 }}>
                      <li>
                        <button
                          className="dropdown-item py-2 d-flex align-items-center gap-2"
                          onClick={() => handleStartEdit(wh)}
                        >
                          <i className="bi bi-pencil" style={{ color: "#3b82f6" }} /> Chỉnh sửa
                        </button>
                      </li>
                      <li>
                        <button className="dropdown-item py-2 d-flex align-items-center gap-2" onClick={() => setEditingLayoutWh(wh)}>
                          <i className="bi bi-map" style={{ color: "#8b5cf6" }} /> Sơ đồ layout
                        </button>
                      </li>
                      <li><hr className="dropdown-divider my-1" /></li>
                      <li>
                        <button 
                          className="dropdown-item py-2 d-flex align-items-center gap-2 text-danger" 
                          onClick={() => setDeletingWh(wh)}
                        >
                          <i className="bi bi-trash" /> Xoá kho
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <i className="bi bi-geo-alt" style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                      {wh.address || "Chưa cập nhật địa chỉ"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="bi bi-person-badge" style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      Phụ trách: <strong style={{ color: "var(--foreground)" }}>{wh.managerId || "Chưa phân công"}</strong>
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  margin: "0 16px 14px",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: wh.isActive ? "#10b981" : "#94a3b8",
                      boxShadow: wh.isActive ? "0 0 6px rgba(16,185,129,0.5)" : "none",
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: wh.isActive ? "#10b981" : "var(--muted-foreground)" }}>
                      {wh.isActive ? "Đang hoạt động" : "Tạm dừng"}
                    </span>
                    {hasLayoutData && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#8b5cf6", background: "rgba(139,92,246,0.1)", padding: "1px 7px", borderRadius: 6, marginLeft: 4 }}>
                        <i className="bi bi-map-fill me-1" />Có layout
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingLayoutWh(wh)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 12px", borderRadius: 8, border: `1px solid ${cfg.color}`,
                      background: cfg.bg, color: cfg.color,
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    Sơ đồ <i className="bi bi-arrow-right-short" style={{ fontSize: 14 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Layout Editor Modal ── */}
      {editingLayoutWh && (
        <WarehouseLayoutModal
          warehouse={editingLayoutWh}
          onClose={() => setEditingLayoutWh(null)}
          onSave={handleSaveLayout}
        />
      )}

      {/* ── Modal Add Warehouse ── */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{
            background: "var(--card)", borderRadius: 24, width: "100%", maxWidth: 520,
            border: "1px solid var(--border)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            overflow: "hidden",
            animation: "fadeInScale 0.2s ease",
          }}>
            {/* Modal header */}
            <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-building-add" style={{ fontSize: 18, color: "#3b82f6" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>
                    {editingWh ? "Chỉnh sửa thông tin kho" : "Thêm kho mới"}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                    {editingWh ? "Cập nhật thông tin chi tiết của kho" : "Điền thông tin để thiết lập kho hàng"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 16 }}
              >
                <i className="bi bi-x" />
              </button>
            </div>

            {/* Modal body */}
            <form id="warehouseForm" onSubmit={handleSubmit}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Mã kho + Tên kho */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Mã kho", key: "code", placeholder: "VD: KHO-HN-01", required: true },
                    { label: "Tên kho", key: "name", placeholder: "VD: Kho Tổng Hà Nội", required: true },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {f.label}{f.required && <span style={{ color: "#ef4444" }}> *</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={f.placeholder}
                        value={(formData as any)[f.key]}
                        onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                        required={f.required}
                        style={{
                          width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 13,
                          border: "1px solid var(--border)", background: "var(--background)",
                          color: "var(--foreground)", outline: "none", boxSizing: "border-box",
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Địa chỉ */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Địa chỉ</label>
                  <textarea
                    rows={2}
                    placeholder="Nhập địa chỉ chi tiết..."
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 13,
                      border: "1px solid var(--border)", background: "var(--background)",
                      color: "var(--foreground)", outline: "none", resize: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Loại kho + Người phụ trách */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Loại kho</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      style={{
                        width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 13,
                        border: "1px solid var(--border)", background: "var(--background)",
                        color: "var(--foreground)", outline: "none", cursor: "pointer",
                      }}
                    >
                      <option value="storage">🏭 Kho lưu trữ</option>
                      <option value="showroom">🏪 Showroom</option>
                      <option value="transit">🔄 Trạm trung chuyển</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Người phụ trách</label>
                    <input
                      type="text"
                      placeholder="Họ và tên..."
                      value={formData.manager}
                      onChange={e => setFormData({ ...formData, manager: e.target.value })}
                      style={{
                        width: "100%", padding: "9px 12px", borderRadius: 10, fontSize: 13,
                        border: "1px solid var(--border)", background: "var(--background)",
                        color: "var(--foreground)", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Upload layout */}
                <div style={{
                  padding: "14px 16px", borderRadius: 12,
                  border: "1.5px dashed var(--border)", background: "var(--background)",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="bi bi-cloud-upload" style={{ fontSize: 16, color: "#3b82f6" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Tải lên sơ đồ layout</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>SVG / PNG / JPG – Tuỳ chọn</p>
                  </div>
                  <label htmlFor="layoutUpload" style={{
                    padding: "6px 14px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--card)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--foreground)",
                  }}>
                    Chọn file
                  </label>
                  <input type="file" id="layoutUpload" className="d-none" />
                </div>
              </div>

              {/* Modal footer */}
              <div style={{ padding: "14px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  style={{
                    padding: "9px 20px", borderRadius: 10, border: "1px solid var(--border)",
                    background: "var(--muted)", color: "var(--foreground)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "9px 22px", borderRadius: 10, border: "none",
                    background: saving ? "#94a3b8" : "linear-gradient(135deg, #3b82f6, #6366f1)",
                    color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    boxShadow: saving ? "none" : "0 4px 14px rgba(59,130,246,0.3)",
                    transition: "all 0.2s",
                  }}
                >
                  {saving ? (
                    <>
                      <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle" />
                      Lưu thông tin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Warehouse ── */}
      <ConfirmDialog
        open={!!deletingWh}
        title={`Xoá kho "${deletingWh?.name}"?`}
        message={
          <>
            Bạn có chắc chắn muốn xoá kho <strong>{deletingWh?.name}</strong>?
            <br />
            Hành động này không thể hoàn tác.
          </>
        }
        confirmLabel="Xoá kho"
        cancelLabel="Huỷ"
        variant="danger"
        loading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingWh(null)}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
