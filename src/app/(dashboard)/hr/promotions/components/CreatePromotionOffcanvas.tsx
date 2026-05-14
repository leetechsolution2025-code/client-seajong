"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreatePromotionOffcanvas = ({ isOpen, onClose, onCreated }: Props) => {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    employeeId: "",
    type: "PROMOTION",
    targetDept: "",
    targetPos: "",
    reason: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/hr/employees?pageSize=200");
      const data = await res.json();
      if (data.employees) setEmployees(data.employees);
      if (data.departments) setDepartments(data.departments);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const selectedEmp = employees.find(e => e.id === form.employeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) return toastError("Lỗi", "Vui lòng chọn nhân viên");
    
    setLoading(true);
    try {
      const res = await fetch("/api/hr/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          currentDept: selectedEmp?.departmentName || "",
          currentPos: selectedEmp?.position || "",
        })
      });

      if (res.ok) {
        success("Thành công", "Tạo yêu cầu đề bạt thành công!");
        onCreated();
        onClose();
        setForm({
          employeeId: "",
          type: "PROMOTION",
          targetDept: "",
          targetPos: "",
          reason: "",
        });
      } else {
        const err = await res.json();
        throw new Error(err.error || "Có lỗi xảy ra");
      }
    } catch (error: any) {
      toastError("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 1060, backdropFilter: "blur(2px)" }}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ 
              position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", 
              background: "#fff", zIndex: 1070, boxShadow: "-10px 0 30px rgba(0,0,0,0.05)",
              display: "flex", flexDirection: "column"
            }}
          >
            <div className="p-4 border-bottom d-flex justify-content-between align-items-center bg-light bg-opacity-50">
              <h5 className="fw-bold mb-0 text-primary">Tạo yêu cầu mới</h5>
              <button className="btn-close" onClick={onClose}></button>
            </div>

            <form className="flex-grow-1 overflow-auto p-4 custom-scrollbar" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">CHỌN NHÂN VIÊN</label>
                <select 
                  className="form-select rounded-3 border-0 bg-light px-3" 
                  style={{ height: "45px", fontSize: "14px" }}
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  required
                >
                  <option value="">-- Tìm nhân viên --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName} - {emp.code}</option>
                  ))}
                </select>
              </div>

              {selectedEmp && (
                <div className="p-3 rounded-4 mb-4" style={{ background: "rgba(0,48,135,0.03)", border: "1px dashed rgba(0,48,135,0.2)" }}>
                  <div className="small text-muted mb-2 fw-bold">THÔNG TIN HIỆN TẠI</div>
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="text-muted" style={{ fontSize: "10px" }}>VỊ TRÍ</div>
                      <div className="fw-bold small">{selectedEmp.position}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted" style={{ fontSize: "10px" }}>PHÒNG BAN</div>
                      <div className="fw-bold small">{selectedEmp.departmentName}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">LOẠI YÊU CẦU</label>
                <div className="d-flex gap-2">
                  {["PROMOTION", "TRANSFER", "DEMOTION"].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`btn btn-sm flex-grow-1 rounded-pill py-2 fw-bold transition-all ${form.type === type ? "btn-primary shadow-sm" : "btn-light text-muted"}`}
                      style={{ fontSize: "11px" }}
                      onClick={() => setForm({ ...form, type })}
                    >
                      {type === "PROMOTION" ? "Đề bạt" : type === "TRANSFER" ? "Luân chuyển" : "Miễn nhiệm"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">VỊ TRÍ ĐỀ XUẤT</label>
                <input 
                  className="form-control rounded-3 border-0 bg-light px-3" 
                  style={{ height: "45px", fontSize: "14px" }}
                  placeholder="Nhập chức danh mới..."
                  value={form.targetPos}
                  onChange={(e) => setForm({ ...form, targetPos: e.target.value })}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">PHÒNG BAN ĐỀ XUẤT</label>
                <select 
                  className="form-select rounded-3 border-0 bg-light px-3" 
                  style={{ height: "45px", fontSize: "14px" }}
                  value={form.targetDept}
                  onChange={(e) => setForm({ ...form, targetDept: e.target.value })}
                  required
                >
                  <option value="">-- Chọn phòng ban --</option>
                  {departments.map(dept => (
                    <option key={dept.code} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">LÝ DO ĐỀ XUẤT</label>
                <textarea 
                  className="form-control rounded-3 border-0 bg-light p-3" 
                  style={{ minHeight: "100px", fontSize: "14px" }}
                  placeholder="Nêu rõ lý do hoặc thành tích đạt được..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-100 py-3 rounded-pill fw-bold shadow-lg d-flex align-items-center justify-content-center gap-2"
                disabled={loading}
              >
                {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-send-fill"></i>}
                GỬI YÊU CẦU PHÊ DUYỆT
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
