"use client";
import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

export interface SalaryAdjustmentFormRef {
  submit: () => void;
}

interface Props {
  employees: any[];
  initialData?: any;
  onSuccess?: () => void;
  onLoadingChange?: (loading: boolean) => void;
  editingItem?: any;
}

const ADJUSTMENT_TYPES = [
  { value: "INCREASE", label: "Tăng lương" },
  { value: "DECREASE", label: "Giảm lương" },
  { value: "RESTRUCTURE", label: "Tái cơ cấu thu nhập" },
];

const ALLOWANCE_LABELS: Record<string, string> = {
  meal: "Phụ cấp ăn trưa",
  fuel: "Phụ cấp xăng xe",
  phone: "Phụ cấp điện thoại",
  seniority: "Phụ cấp thâm niên",
};

const SalaryAdjustmentRequestForm = forwardRef<SalaryAdjustmentFormRef, Props>(
  function SalaryAdjustmentRequestForm({ employees, initialData, onSuccess, onLoadingChange, editingItem }, ref) {
    const { data: session } = useSession();
    const [form, setForm] = useState({
      employeeId: "",
      adjustmentType: "INCREASE",
      currentBaseSalary: "",
      proposedBaseSalary: "",
      reason: "",
      effectiveDate: "",
      meal: "", fuel: "", phone: "", seniority: "",
      propMeal: "", propFuel: "", propPhone: "", propSeniority: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-fill current salary when employee is selected
    useEffect(() => {
      if (!form.employeeId) return;
      const emp = employees.find((e: any) => e.id === form.employeeId);
      if (emp) {
        setForm(prev => ({
          ...prev,
          currentBaseSalary: emp.baseSalary?.toString() || "",
          meal: emp.mealAllowance?.toString() || "",
          fuel: emp.fuelAllowance?.toString() || "",
          phone: emp.phoneAllowance?.toString() || "",
          seniority: emp.seniorityAllowance?.toString() || "",
        }));
      }
    }, [form.employeeId, employees]);

    // Populate from initialData (edit mode)
    useEffect(() => {
      if (!initialData) return;
      const cur = typeof initialData.currentAllowances === "string"
        ? JSON.parse(initialData.currentAllowances || "{}")
        : initialData.currentAllowances || {};
      const prop = typeof initialData.proposedAllowances === "string"
        ? JSON.parse(initialData.proposedAllowances || "{}")
        : initialData.proposedAllowances || {};

      setForm({
        employeeId: initialData.employeeId || "",
        adjustmentType: initialData.adjustmentType || "INCREASE",
        currentBaseSalary: initialData.currentBaseSalary?.toString() || "",
        proposedBaseSalary: initialData.proposedBaseSalary?.toString() || "",
        reason: initialData.reason || "",
        effectiveDate: initialData.effectiveDate ? new Date(initialData.effectiveDate).toISOString().split("T")[0] : "",
        meal: cur.meal?.toString() || "",
        fuel: cur.fuel?.toString() || "",
        phone: cur.phone?.toString() || "",
        seniority: cur.seniority?.toString() || "",
        propMeal: prop.meal?.toString() || "",
        propFuel: prop.fuel?.toString() || "",
        propPhone: prop.phone?.toString() || "",
        propSeniority: prop.seniority?.toString() || "",
      });
    }, [initialData]);

    const { error: toastError } = useToast();

    const validate = () => {
      const e: Record<string, string> = {};
      if (!form.employeeId) e.employeeId = "Vui lòng chọn nhân sự";
      if (!form.reason.trim()) e.reason = "Vui lòng nhập lý do điều chỉnh";
      
      setErrors(e);
      if (Object.keys(e).length > 0) {
        toastError("Thiếu thông tin", "Vui lòng điền đầy đủ các trường bắt buộc (*)");
        return false;
      }
      return true;
    };

    const handleSubmit = async () => {
      if (!validate()) return;
      setIsSubmitting(true);
      onLoadingChange?.(true);
      try {
        const body = {
          employeeId: form.employeeId,
          adjustmentType: form.adjustmentType,
          currentBaseSalary: form.currentBaseSalary ? Number(form.currentBaseSalary) : null,
          proposedBaseSalary: form.proposedBaseSalary ? Number(form.proposedBaseSalary) : null,
          currentAllowances: { meal: form.meal, fuel: form.fuel, phone: form.phone, seniority: form.seniority },
          proposedAllowances: { meal: form.propMeal, fuel: form.propFuel, phone: form.propPhone, seniority: form.propSeniority },
          reason: form.reason,
          effectiveDate: form.effectiveDate || null,
          requesterId: editingItem?.raw?.requesterId || (session?.user as any)?.employeeId,
        };

        const url = editingItem ? `/api/hr/salary-adjustment/${editingItem.id}` : "/api/hr/salary-adjustment";
        const method = editingItem ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(await res.text());
        onSuccess?.();
      } catch (error: any) {
        console.error("Submit error:", error);
        toastError("Lỗi", "Không thể gửi yêu cầu. Vui lòng thử lại sau.");
      } finally {
        setIsSubmitting(false);
        onLoadingChange?.(false);
      }
    };

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));

    const handleNumberChange = (field: string, val: string) => {
      // Remove all non-numeric characters
      const numeric = val.replace(/[^0-9]/g, "");
      setForm(p => ({ ...p, [field]: numeric }));
    };

    const fmt = (v: string) => {
      if (!v) return "";
      const n = Number(v);
      if (isNaN(n)) return "";
      return n.toLocaleString("vi-VN");
    };

    const inputStyle: React.CSSProperties = {
      border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", width: "100%", outline: "none"
    };
    const labelStyle: React.CSSProperties = { fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px", display: "block" };

    return (
      <div className="overflow-auto h-100 pe-1" style={{ scrollbarWidth: "thin" }}>

        {/* Header Info: Employee, Type, Effective Date */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <label style={labelStyle}>Nhân sự thực hiện <span className="text-danger">*</span></label>
            <select
              style={{ ...inputStyle, background: errors.employeeId ? "#fef2f2" : "white" }}
              value={form.employeeId}
              onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
            >
              <option value="">Chọn nhân viên</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.fullName} – {emp.departmentName}</option>
              ))}
            </select>
            {errors.employeeId && <span className="text-danger" style={{ fontSize: "12px" }}>{errors.employeeId}</span>}
          </div>
          <div className="col-md-4">
            <label style={labelStyle}>Loại điều chỉnh</label>
            <select
              style={{ ...inputStyle, background: "white" }}
              value={form.adjustmentType}
              onChange={e => setForm(p => ({ ...p, adjustmentType: e.target.value }))}
            >
              {ADJUSTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <label style={labelStyle}>Ngày hiệu lực dự kiến</label>
            <input
              type="date"
              style={inputStyle}
              value={form.effectiveDate}
              onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))}
            />
          </div>
        </div>

        {/* Reason Field Moved Up */}
        <div className="mb-4">
          <label style={labelStyle}>Lý do điều chỉnh <span className="text-danger">*</span></label>
          <textarea
            rows={2}
            style={{ ...inputStyle, resize: "vertical", background: errors.reason ? "#fef2f2" : "white" }}
            placeholder="Mô tả lý do đề xuất điều chỉnh thu nhập..."
            value={form.reason}
            onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
          />
          {errors.reason && <span className="text-danger" style={{ fontSize: "12px" }}>{errors.reason}</span>}
        </div>

        {/* Income Detail Table */}
        <div className="mb-4">
          <label style={{ ...labelStyle, marginBottom: "12px" }}>Chi tiết thu nhập (VNĐ/tháng)</label>
          <div className="table-responsive">
            <table className="table table-sm table-bordered align-middle" style={{ fontSize: "13px", border: "1px solid #e5e7eb" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th className="fw-semibold text-muted ps-3 py-2" style={{ width: "40%" }}>Khoản mục</th>
                  <th className="fw-semibold text-muted text-end py-2" style={{ width: "30%" }}>Hiện tại</th>
                  <th className="fw-semibold text-muted text-end pe-3 py-2" style={{ width: "30%" }}>Sau điều chỉnh</th>
                </tr>
              </thead>
              <tbody>
                {/* Base Salary Row */}
                <tr>
                  <td className="ps-3 fw-medium text-dark">Lương cơ bản</td>
                  <td className="p-1">
                    <input type="text" className="form-control form-control-sm text-end border-0 bg-transparent shadow-none"
                      value={fmt(form.currentBaseSalary)} placeholder="0"
                      onChange={e => handleNumberChange("currentBaseSalary", e.target.value)} />
                  </td>
                  <td className="p-1" style={{ background: "#f0fdf4" }}>
                    <input type="text" className="form-control form-control-sm text-end border-0 bg-transparent shadow-none fw-bold"
                      style={{ color: "#16a34a" }}
                      value={fmt(form.proposedBaseSalary)} placeholder="0"
                      onChange={e => handleNumberChange("proposedBaseSalary", e.target.value)} />
                  </td>
                </tr>

                {/* Allowances Rows */}
                {(["meal", "fuel", "phone", "seniority"] as const).map(key => {
                  const isLocked = form.adjustmentType !== "RESTRUCTURE";
                  return (
                    <tr key={key} style={{ opacity: isLocked ? 0.7 : 1, background: isLocked ? "#f9fafb" : "transparent" }}>
                      <td className="ps-3 text-muted">{ALLOWANCE_LABELS[key]}</td>
                      <td className="p-1">
                        <input type="text" className="form-control form-control-sm text-end border-0 bg-transparent shadow-none"
                          style={{ cursor: isLocked ? "not-allowed" : "text" }}
                          readOnly={isLocked}
                          value={fmt((form as any)[key])} placeholder="0"
                          onChange={e => handleNumberChange(key, e.target.value)} />
                      </td>
                      <td className="p-1" style={{ background: isLocked ? "#f9fafb" : "#f0fdf4" }}>
                        <input type="text" className="form-control form-control-sm text-end border-0 bg-transparent shadow-none"
                          style={{ cursor: isLocked ? "not-allowed" : "text" }}
                          readOnly={isLocked}
                          value={fmt((form as any)[`prop${key.charAt(0).toUpperCase()}${key.slice(1)}`])} placeholder="0"
                          onChange={e => {
                            const fieldKey = `prop${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                            handleNumberChange(fieldKey, e.target.value);
                          }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot style={{ background: "#f1f5f9" }}>
                <tr className="fw-bold">
                  <td className="ps-3 py-2 text-primary">TỔNG THU NHẬP</td>
                  <td className="text-end py-2 px-2 text-secondary">
                    {fmt((Number(form.currentBaseSalary || 0) + 
                          Number(form.meal || 0) + 
                          Number(form.fuel || 0) + 
                          Number(form.phone || 0) + 
                          Number(form.seniority || 0)).toString())}
                  </td>
                  <td className="text-end py-2 pe-3 text-success" style={{ fontSize: "14px" }}>
                    {fmt((Number(form.proposedBaseSalary || 0) + 
                          Number(form.propMeal || 0) + 
                          Number(form.propFuel || 0) + 
                          Number(form.propPhone || 0) + 
                          Number(form.propSeniority || 0)).toString())}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    );
  }
);

export default SalaryAdjustmentRequestForm;
