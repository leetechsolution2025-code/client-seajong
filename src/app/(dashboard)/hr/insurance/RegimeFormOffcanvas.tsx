"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

interface RegimeFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function RegimeFormOffcanvas({ open, onClose, onSuccess, initialData }: RegimeFormProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [departments, setDepartments] = useState<Array<{ nameVi: string; code: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ fullName: string; id: string }>>([]);
  const [selectedDeptCode, setSelectedDeptCode] = useState("");
  
  const defaultForm = {
    employeeId: "",
    regimeType: "Ốm đau",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0], // +3 days
    amount: 0,
    status: "pending",
    notes: "",
  };

  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultForm,
        ...initialData,
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : defaultForm.startDate,
        endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : defaultForm.endDate,
      });
      // If editing, we probably already have employeeId, but selecting it might be tricky without full data.
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
      if (!selectedDeptCode && !initialData) {
        setEmployees([]);
        return;
      }

      try {
        const deptQuery = selectedDeptCode && selectedDeptCode !== "all" ? `?department=${selectedDeptCode}&pageSize=100` : "?pageSize=500";
        const res = await fetch(`/api/hr/employees${deptQuery}`);
        const data = await res.json();
        if (data.employees && Array.isArray(data.employees)) {
          setEmployees(data.employees);
        }
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    };
    fetchEmployees();
  }, [selectedDeptCode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      error("Lỗi", "Vui lòng chọn nhân viên");
      return;
    }

    setLoading(true);
    try {
      const isEdit = !!initialData;
      const url = isEdit ? `/api/hr/insurance/benefits/${initialData.id}` : "/api/hr/insurance/benefits";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        success("Thành công", isEdit ? "Đã cập nhật hồ sơ chế độ" : "Đã thêm hồ sơ chế độ mới");
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        error("Lỗi", data.error || "Không thể lưu hồ sơ");
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
          width: 420,
          visibility: open ? "visible" : "hidden",
          transition: "transform 0.3s ease-in-out, visibility 0.3s",
          background: "var(--background)"
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3">
          <div className="d-flex align-items-center gap-2">
            <div className={`bg-${initialData ? "warning" : "primary"}-subtle p-2 rounded-3 text-${initialData ? "warning" : "primary"}`}>
              <i className={`bi bi-${initialData ? "pencil-square" : "heart-pulse"} fs-5`} />
            </div>
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 16 }}>
              {initialData ? "Cập nhật hồ sơ chế độ" : "Thêm hồ sơ chế độ mới"}
            </h5>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto">
          <form id="regime-form" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Đối tượng thụ hưởng</label>

              {!initialData && (
                <div className="mb-3">
                  <label className="form-label" style={labelStyle}>Phòng ban</label>
                  <select
                    className="form-select"
                    value={selectedDeptCode}
                    onChange={e => setSelectedDeptCode(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(d => (
                      <option key={d.code} value={d.code}>{d.nameVi}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Nhân viên <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  required
                  value={formData.employeeId}
                  onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                  style={inputStyle}
                  disabled={!!initialData} // Không cho đổi NV nếu đang edit
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                  {initialData && !employees.find(e => e.id === initialData.employeeId) && (
                    <option value={initialData.employeeId}>{initialData.employee?.fullName || "Nhân viên đã nghỉ"}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông tin chế độ</label>
              
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Loại chế độ <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    required
                    value={formData.regimeType}
                    onChange={e => setFormData({ ...formData, regimeType: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Ốm đau">Ốm đau</option>
                    <option value="Thai sản">Thai sản</option>
                    <option value="Dưỡng sức">Dưỡng sức, Phục hồi</option>
                    <option value="Tai nạn lao động">Tai nạn lao động</option>
                    <option value="Tử tuất">Tử tuất</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Trạng thái</label>
                  <select 
                    className="form-select" 
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="pending">Đang xử lý (Pending)</option>
                    <option value="approved">Đã duyệt (Approved)</option>
                    <option value="paid">Đã chi trả (Paid)</option>
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Từ ngày</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Đến ngày</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Số tiền trợ cấp (đ)</label>
                <CurrencyInput
                  className="form-control"
                  value={formData.amount}
                  onChange={val => setFormData({ ...formData, amount: val })}
                  style={inputStyle}
                />
              </div>

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Ghi chú thêm</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Nhập ghi chú hoặc số quyết định..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="offcanvas-footer p-3 border-top bg-light">
          <div className="d-flex gap-2">
            <BrandButton
              variant="outline"
              className="flex-grow-1 py-2 bg-white"
              onClick={onClose}
              disabled={loading}
              style={{ fontSize: 13 }}
            >
              Hủy bỏ
            </BrandButton>
            <BrandButton
              type="submit"
              form="regime-form"
              className="flex-grow-1 py-2"
              loading={loading}
              style={{ fontSize: 13 }}
            >
              Lưu hồ sơ
            </BrandButton>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
