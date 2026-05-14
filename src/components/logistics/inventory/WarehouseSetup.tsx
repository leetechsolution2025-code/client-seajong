"use client";

import React, { useState, useEffect } from "react";

import { WarehouseLayoutModal } from "./WarehouseLayoutModal";

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

export function WarehouseSetup() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLayoutWh, setEditingLayoutWh] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    type: "storage",
    manager: ""
  });

  const [saving, setSaving] = useState(false);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logistics/warehouses");
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      alert("Vui lòng nhập đầy đủ Mã và Tên kho");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/logistics/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          address: formData.address,
          // Manager and type are simulated for now as they might need separate relations in a full system
          managerId: formData.manager,
          isVirtual: formData.type === "transit",
        }),
      });

      if (res.ok) {
        await fetchWarehouses();
        setIsModalOpen(false);
        setFormData({ code: "", name: "", address: "", type: "storage", manager: "" });
      } else {
        const err = await res.json();
        alert("Lỗi: " + err.error);
      }
    } catch (error) {
      alert("Không thể kết nối đến máy chủ");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLayout = async (elements: any[]) => {
    if (!editingLayoutWh) return;

    try {
      const res = await fetch(`/api/logistics/warehouses/${editingLayoutWh.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layoutJson: JSON.stringify(elements)
        }),
      });

      if (res.ok) {
        await fetchWarehouses();
        setEditingLayoutWh(null);
      } else {
        const errorData = await res.json();
        alert(`Lỗi khi lưu layout: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      alert(`Lỗi kết nối: ${error.message}`);
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* ── Compact Header with Add Button ── */}
      <div className="d-flex justify-content-end mb-2">
        <button 
          className="btn btn-primary rounded-pill px-4 fw-bold d-flex align-items-center gap-2 shadow-sm"
          onClick={() => setIsModalOpen(true)}
          style={{ height: 38, fontSize: 13 }}
        >
          <i className="bi bi-plus-circle" />
          Thêm kho mới
        </button>
      </div>

      {/* ── Warehouse Grid ── */}
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {warehouses.map((wh) => (
            <div key={wh.id} className="col-md-6 col-lg-4 col-xl-3">
              <div className="app-card h-100 p-0 overflow-hidden" style={{ borderRadius: 16 }}>
                {/* Header */}
                <div className="p-3 bg-light border-bottom d-flex align-items-start justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-3 bg-white border d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                      <i className="bi bi-building text-primary fs-5" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-bold text-dark text-truncate" style={{ fontSize: 13 }} title={wh.name}>{wh.name}</div>
                      <div className="badge bg-primary-subtle text-primary border-primary-subtle" style={{ fontSize: 9 }}>
                        {wh.code}
                      </div>
                    </div>
                  </div>
                  <div className="dropdown">
                    <button className="btn btn-link p-0 text-muted" data-bs-toggle="dropdown">
                      <i className="bi bi-three-dots-vertical" />
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0" style={{ fontSize: 13 }}>
                      <li><a className="dropdown-item py-2" href="#"><i className="bi bi-pencil me-2" /> Chỉnh sửa</a></li>
                      <li><a className="dropdown-item py-2" href="#"><i className="bi bi-map me-2" /> Sơ đồ layout</a></li>
                      <li><hr className="dropdown-divider" /></li>
                      <li><a className="dropdown-item py-2 text-danger" href="#"><i className="bi bi-trash me-2" /> Xoá kho</a></li>
                    </ul>
                  </div>
                </div>

                {/* Info Body */}
                <div className="p-3 flex-grow-1 d-flex flex-column gap-2">
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-geo-alt text-muted small" />
                    <div className="small text-muted text-truncate-2" style={{ fontSize: 11, minHeight: 32 }}>{wh.address || "Chưa cập nhật địa chỉ"}</div>
                  </div>
                  
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-person-badge text-muted small" />
                    <div className="small" style={{ fontSize: 11 }}>Quản lý: <span className="fw-medium text-dark">{wh.managerId || "N/A"}</span></div>
                  </div>

                  <div className="mt-auto pt-2 border-top d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-1">
                       <span className={`badge ${wh.isActive ? 'bg-success' : 'bg-secondary'} rounded-circle p-1`} />
                       <span className="text-muted" style={{ fontSize: 10 }}>{wh.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <button 
                      className="btn btn-link p-0 text-primary fw-bold text-decoration-none" 
                      style={{ fontSize: 11 }}
                      onClick={() => setEditingLayoutWh(wh)}
                    >
                      Layout <i className="bi bi-arrow-right" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {!loading && warehouses.length === 0 && (
            <div className="col-12">
              <div className="app-card text-center p-5 border-dashed" style={{ opacity: 0.7 }}>
                <i className="bi bi-building-add fs-1 text-muted d-block mb-3" />
                <h5>Chưa có kho hàng nào</h5>
                <p className="text-muted small">Bắt đầu bằng cách thêm kho hàng đầu tiên vào hệ thống.</p>
                <button className="btn btn-primary rounded-pill px-4 mt-2" onClick={() => setIsModalOpen(true)}>
                  Thêm ngay
                </button>
              </div>
            </div>
          )}
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
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 24 }}>
              <div className="modal-header border-0 px-4 pt-4">
                <h5 className="modal-title fw-bold">Thiết lập kho mới</h5>
                <button type="button" className="btn-close" onClick={() => setIsModalOpen(false)} />
              </div>
              <div className="modal-body p-4">
                <form id="warehouseForm" onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted uppercase" style={{ fontSize: 11 }}>Mã kho</label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        placeholder="VD: KHO-HCM-01"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted uppercase" style={{ fontSize: 11 }}>Tên kho</label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        placeholder="VD: Kho Tổng TP.HCM"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label small fw-bold text-muted uppercase" style={{ fontSize: 11 }}>Địa chỉ</label>
                    <textarea 
                      className="form-control rounded-3" 
                      rows={2} 
                      placeholder="Nhập địa chỉ chi tiết..."
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted uppercase" style={{ fontSize: 11 }}>Loại kho</label>
                      <select 
                        className="form-select rounded-3"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                      >
                        <option value="storage">Kho lưu trữ</option>
                        <option value="showroom">Showroom</option>
                        <option value="transit">Trạm trung chuyển</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted uppercase" style={{ fontSize: 11 }}>Người phụ trách</label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        placeholder="Họ và tên..."
                        value={formData.manager}
                        onChange={(e) => setFormData({...formData, manager: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-light rounded-3 border border-dashed text-center">
                    <i className="bi bi-cloud-upload fs-4 text-primary d-block mb-1" />
                    <span className="small text-muted">Tải lên sơ đồ Layout (SVG/PNG/JPG)</span>
                    <input type="file" className="d-none" id="layoutUpload" />
                    <label htmlFor="layoutUpload" className="btn btn-sm btn-white border rounded-pill px-3 ms-2 mt-2" style={{ cursor: "pointer" }}>Chọn file</label>
                  </div>
                </form>
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setIsModalOpen(false)} disabled={saving}>Huỷ bỏ</button>
                <button 
                  type="submit" 
                  form="warehouseForm" 
                  className="btn btn-primary rounded-pill px-4 fw-bold"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Đang lưu...
                    </>
                  ) : "Lưu thông tin"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
