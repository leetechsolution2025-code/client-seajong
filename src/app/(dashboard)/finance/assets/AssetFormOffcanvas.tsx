"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function AssetFormOffcanvas({ open, onClose, onSuccess, initialData }: AssetFormProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [departments, setDepartments] = useState<Array<{ nameVi: string; code: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ fullName: string; id: string }>>([]);
  
  const defaultForm = {
    code: "",
    tenTaiSan: "",
    loai: "",
    ngayMua: new Date().toISOString().split("T")[0],
    giaTriMua: 0,
    soThangKhauHao: 0,
    ngayBatDauKhauHao: new Date().toISOString().split("T")[0],
    chuKyBaoDuong: 0,
    donVi: "", 
    nguoiSuDungId: "", 
    trangThai: "chua-su-dung",
    ghiChu: "",
  };

  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultForm,
        ...initialData,
        ngayMua: initialData.ngayMua ? new Date(initialData.ngayMua).toISOString().split("T")[0] : defaultForm.ngayMua,
        ngayBatDauKhauHao: initialData.ngayBatDauKhauHao ? new Date(initialData.ngayBatDauKhauHao).toISOString().split("T")[0] : defaultForm.ngayBatDauKhauHao,
      });
    } else {
      setFormData(defaultForm);
    }
  }, [initialData, open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch departments
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch("/api/hr/departments");
        const data = await res.json();
        if (data.departments && Array.isArray(data.departments)) {
          setDepartments(data.departments);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepts();
  }, []);

  // Fetch employees when department changes
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!formData.donVi) {
        setEmployees([]);
        return;
      }

      const dept = departments.find(d => d.nameVi === formData.donVi);
      if (!dept) return;

      try {
        const res = await fetch(`/api/hr/employees?department=${dept.code}&pageSize=100`);
        const data = await res.json();
        if (data.employees && Array.isArray(data.employees)) {
          setEmployees(data.employees);
        }
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    };
    fetchEmployees();
  }, [formData.donVi, departments]);

  // Generate asset code on open ONLY if not editing
  useEffect(() => {
    if (open && !initialData) {
      const now = new Date();
      const dateStr = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0');
      const random = Math.floor(1000 + Math.random() * 9000);
      setFormData(prev => ({ ...prev, code: `TS-${dateStr}-${random}` }));
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isEdit = !!initialData;
      const url = isEdit ? `/api/finance/assets/${initialData.id}` : "/api/finance/assets";
      const method = isEdit ? "PUT" : "POST";
      
      console.log("Submitting asset form:", { method, url, initialDataId: initialData?.id });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          giaTriConLai: formData.giaTriMua,
        }),
      });
      if (res.ok) {
        success("Thành công", isEdit ? "Đã cập nhật tài sản" : "Đã thêm tài sản mới");
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        error("Lỗi", data.error || "Không thể lưu tài sản");
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
      {/* Backdrop */}
      <div
        className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
        style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`offcanvas offcanvas-end border-0 shadow-lg ${open ? "show" : ""}`}
        style={{
          width: 400,
          visibility: open ? "visible" : "hidden",
          transition: "transform 0.3s ease-in-out, visibility 0.3s",
          background: "var(--background)"
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3">
          <div className="d-flex align-items-center gap-2">
            <div className={`bg-${initialData ? "warning" : "primary"}-subtle p-2 rounded-3 text-${initialData ? "warning" : "primary"}`}>
              <i className={`bi bi-${initialData ? "pencil-square" : "plus-square-fill"} fs-5`} />
            </div>
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 16 }}>
              {initialData ? "Cập nhật tài sản" : "Thêm tài sản mới"}
            </h5>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto">
          <form id="asset-form" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông tin định danh</label>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Loại tài sản <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    required
                    value={formData.loai}
                    onChange={e => setFormData({ ...formData, loai: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Chọn loại tài sản</option>
                    <option value="Nhà cửa, vật kiến trúc">Nhà cửa, vật kiến trúc</option>
                    <option value="Máy móc, thiết bị">Máy móc, thiết bị</option>
                    <option value="Phương tiện vận tải">Phương tiện vận tải</option>
                    <option value="Thiết bị, dụng cụ quản lý">Thiết bị, dụng cụ quản lý</option>
                    <option value="Phần mềm máy tính">Phần mềm máy tính</option>
                    <option value="Các loại tài sản cố định khác">Tài sản cố định khác</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Trạng thái</label>
                  <select 
                    className="form-select" 
                    value={formData.trangThai}
                    onChange={e => setFormData({ ...formData, trangThai: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="chua-su-dung">Chưa sử dụng</option>
                    <option value="dang-su-dung">Đang sử dụng</option>
                    <option value="bao-tri">Bảo trì</option>
                    <option value="sua-chua">Sửa chữa</option>
                    <option value="het-khau-hao">Hết khấu hao</option>
                    <option value="thanh-ly">Thanh lý</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Tên tài sản <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tên tài sản..."
                  required
                  value={formData.tenTaiSan}
                  onChange={e => setFormData({ ...formData, tenTaiSan: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Giá trị & Khấu hao</label>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Ngày mua</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.ngayMua}
                    onChange={e => setFormData({ ...formData, ngayMua: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Nguyên giá (đ)</label>
                  <CurrencyInput
                    className="form-control"
                    value={formData.giaTriMua}
                    onChange={val => setFormData({ ...formData, giaTriMua: val })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Sổ tháng khấu hao</label>
                  <CurrencyInput
                    className="form-control"
                    value={formData.soThangKhauHao}
                    onChange={val => setFormData({ ...formData, soThangKhauHao: val })}
                    style={inputStyle}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Ngày bắt đầu KH</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.ngayBatDauKhauHao}
                    onChange={e => setFormData({ ...formData, ngayBatDauKhauHao: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Bàn giao & Bảo trì</label>

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Đơn vị sử dụng</label>
                <select
                  className="form-select"
                  value={formData.donVi}
                  onChange={e => setFormData({ ...formData, donVi: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Chọn đơn vị</option>
                  {departments.map(d => (
                    <option key={d.code} value={d.nameVi}>{d.nameVi}</option>
                  ))}
                </select>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Người sử dụng</label>
                  <select
                    className="form-select"
                    value={formData.nguoiSuDungId}
                    onChange={e => setFormData({ ...formData, nguoiSuDungId: e.target.value })}
                    style={inputStyle}
                    disabled={!formData.donVi || employees.length === 0}
                  >
                    <option value="">-- {formData.donVi ? (employees.length > 0 ? "Chọn nhân viên" : "Không có nhân viên") : "Chọn đơn vị trước"} --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Chu kỳ bảo dưỡng (tháng)</label>
                  <CurrencyInput
                    className="form-control"
                    value={formData.chuKyBaoDuong}
                    onChange={val => setFormData({ ...formData, chuKyBaoDuong: val })}
                    style={inputStyle}
                  />
                </div>
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
              form="asset-form"
              className="flex-grow-1 py-2"
              loading={loading}
              style={{ fontSize: 13 }}
            >
              Lưu tài sản
            </BrandButton>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
