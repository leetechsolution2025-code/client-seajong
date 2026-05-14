"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function ExpenseFormOffcanvas({ open, onClose, onSuccess, initialData }: ExpenseFormProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const defaultForm = {
    tenChiPhi: "",
    loai: "",
    soTien: 0,
    ngayChiTra: new Date().toISOString().split("T")[0],
    nguoiChiTra: "",
    trangThai: "pending",
    ghiChu: "",
  };

  const [formData, setFormData] = useState(defaultForm);
  const [parentCategory, setParentCategory] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      // Fetch categories
      fetch("/api/plan-finance/categories?type=expense_type")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCategories(data);
            if (initialData) {
              const cat = data.find(c => c.code === initialData.loai);
              if (cat && cat.parentId) {
                const parent = data.find(p => p.id === cat.parentId);
                if (parent) setParentCategory(parent.code);
              }
            }
          }
        });

      if (initialData) {
        setFormData({
          ...defaultForm,
          ...initialData,
          ngayChiTra: initialData.ngayChiTra ? new Date(initialData.ngayChiTra).toISOString().split("T")[0] : defaultForm.ngayChiTra,
        });
      } else {
        setFormData(defaultForm);
        setParentCategory("");
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenChiPhi.trim()) {
       error("Lỗi", "Vui lòng nhập tên khoản chi");
       return;
    }
    if (!formData.loai) {
       error("Lỗi", "Vui lòng chọn loại chi phí");
       return;
    }

    setLoading(true);
    try {
      const isEdit = !!initialData;
      const url = isEdit ? `/api/plan-finance/expenses/${initialData.id}` : "/api/plan-finance/expenses";
      const method = isEdit ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        success("Thành công", isEdit ? "Đã cập nhật chi phí" : "Đã thêm khoản chi mới");
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        error("Lỗi", data.error || "Không thể lưu chi phí");
      }
    } catch (err) {
      error("Lỗi", "Đã xảy ra lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 };
  const inputStyle = { fontSize: 13, borderRadius: 8 };

  return createPortal(
    <>
      <div
        className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
        style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none", zIndex: 1040 }}
        onClick={onClose}
      />

      <div
        className={`offcanvas offcanvas-end border-0 shadow-lg ${open ? "show" : ""}`}
        style={{
          width: 400,
          visibility: open ? "visible" : "hidden",
          transition: "transform 0.3s ease-in-out, visibility 0.3s",
          background: "var(--background)",
          zIndex: 1045
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-4" style={{ background: "linear-gradient(to right, var(--background), var(--secondary-subtle))" }}>
          <div className="d-flex align-items-center gap-3">
            <i className={`bi bi-${initialData ? "pencil-square" : "cash-stack"} fs-4 text-${initialData ? "warning" : "success"}`} />
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 17, letterSpacing: -0.2 }}>
              {initialData ? "Cập nhật chi phí" : "Ghi khoản chi mới"}
            </h5>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 d-flex flex-column overflow-hidden">
          <form id="expense-form" onSubmit={handleSubmit} className="d-flex flex-column h-100">
            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông tin chi phí</label>
              
              {/* Badge Filters for Main Categories */}
              <div className="mb-2 d-flex flex-wrap gap-1">
                {categories.filter(c => !c.parentId).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setParentCategory(cat.code);
                      setFormData(f => ({ ...f, loai: "" }));
                    }}
                    className={`btn btn-sm rounded-pill px-3 py-1 fw-bold ${parentCategory === cat.code ? "btn-primary" : "btn-light border text-muted"}`}
                    style={{ fontSize: 10.5 }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Loại chi phí <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  required
                  disabled={!parentCategory}
                  value={formData.loai}
                  onChange={e => setFormData({ ...formData, loai: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">{parentCategory ? "Chọn loại chi phí cụ thể" : "Chọn nhóm chi phí ở trên trước"}</option>
                  {categories
                    .filter(c => {
                      const parent = categories.find(p => p.code === parentCategory);
                      return c.parentId === parent?.id;
                    })
                    .map(cat => (
                      <option key={cat.code} value={cat.code}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Tên khoản chi chi tiết <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Tiền điện tháng 5, Mua văn phòng phẩm..."
                  required
                  value={formData.tenChiPhi}
                  onChange={e => setFormData({ ...formData, tenChiPhi: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Số tiền (đồng) <span className="text-danger">*</span></label>
                  <CurrencyInput
                    className="form-control"
                    value={formData.soTien}
                    onChange={val => setFormData({ ...formData, soTien: val })}
                    style={inputStyle}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Ngày chi</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.ngayChiTra}
                    onChange={e => setFormData({ ...formData, ngayChiTra: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div className="mb-0 flex-grow-1 d-flex flex-column overflow-hidden">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Quản lý & Ghi chú</label>
              
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Người phụ trách</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tên nhân viên..."
                    value={formData.nguoiChiTra}
                    onChange={e => setFormData({ ...formData, nguoiChiTra: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Trạng thái</label>
                  <select 
                    className="form-select"
                    value={formData.trangThai}
                    onChange={e => setFormData({ ...formData, trangThai: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="paid">Đã thanh toán</option>
                    <option value="rejected">Từ chối</option>
                  </select>
                </div>
              </div>

              <div className="flex-grow-1 d-flex flex-column min-h-0">
                <label className="form-label" style={labelStyle}>Ghi chú chi tiết</label>
                <textarea
                  className="form-control flex-grow-1"
                  placeholder="Thông tin thêm về khoản chi..."
                  value={formData.ghiChu}
                  onChange={e => setFormData({ ...formData, ghiChu: e.target.value })}
                  style={{ ...inputStyle, resize: "none", minHeight: 100 }}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="offcanvas-footer p-3 border-top bg-light">
          <div className="d-flex gap-2">
            <BrandButton
              variant="outline"
              className="flex-grow-1 py-2"
              onClick={onClose}
              disabled={loading}
              style={{ fontSize: 13 }}
            >
              Hủy bỏ
            </BrandButton>
            <BrandButton
              type="submit"
              form="expense-form"
              className="flex-grow-1 py-2"
              loading={loading}
              style={{ fontSize: 13 }}
            >
              Lưu khoản chi
            </BrandButton>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
