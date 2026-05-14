"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { BrandButton } from "@/components/ui/BrandButton";

interface PayrollDetailModalProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  month: number;
  year: number;
}

export function PayrollDetailModal({ open, onClose, employeeId, month, year }: PayrollDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [data, setData] = useState<any>(null);
  const { error: toastError, success } = useToast();

  useEffect(() => {
    if (open && employeeId) {
      setLoading(true);
      fetch(`/api/hr/payroll/detail?employeeId=${employeeId}&month=${month}&year=${year}`)
        .then(res => res.json())
        .then(json => {
          if (json.error) {
            toastError("Lỗi", json.error);
            onClose();
          } else {
            setData(json);
          }
        })
        .catch(err => {
          console.error(err);
          toastError("Lỗi", "Không thể lấy dữ liệu phiếu lương.");
          onClose();
        })
        .finally(() => setLoading(false));
    }
  }, [open, employeeId, month, year]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div 
        className="position-fixed inset-0 d-flex align-items-center justify-content-center" 
        style={{ zIndex: 10005, background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white rounded-4 shadow-lg overflow-hidden d-flex flex-column"
          style={{ width: "90%", maxWidth: "550px", maxHeight: "90vh", fontFamily: "'Roboto Condensed', sans-serif" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-success bg-opacity-10 px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                <i className="bi bi-cash-stack fs-5"></i>
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-success">Chi tiết phiếu lương</h5>
                <div className="small text-muted fw-medium">Tháng {month} / {year}</div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="btn btn-link text-muted p-0 hover-opacity-100"
            >
              <i className="bi bi-x-lg fs-5"></i>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto" style={{ flex: 1 }}>
            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5">
                <div className="spinner-border text-success mb-3" role="status"></div>
                <div className="text-muted small">Đang tải dữ liệu phiếu lương...</div>
              </div>
            ) : data ? (
              <div className="d-flex flex-column gap-4">
                {/* Employee Info */}
                <div className="bg-light rounded-3 p-3">
                  <div className="fw-bold fs-6 text-dark mb-1">{data.employeeInfo.fullName}</div>
                  <div className="text-muted small d-flex gap-2">
                    <span><i className="bi bi-person-badge me-1"></i>{data.employeeInfo.position}</span>
                    <span>•</span>
                    <span><i className="bi bi-diagram-3 me-1"></i>{data.employeeInfo.departmentName}</span>
                  </div>
                </div>

                {/* Salary Details Table */}
                <div className="border rounded-3 overflow-hidden">
                  <table className="table table-borderless mb-0" style={{ fontSize: "13px" }}>
                    <tbody>
                      {/* Lương cơ bản */}
                      <tr className="border-bottom">
                        <td className="py-3 px-3 text-muted fw-medium" style={{ width: "60%" }}>
                          <i className="bi bi-wallet2 me-2"></i> Lương cơ bản
                        </td>
                        <td className="py-3 px-3 text-end fw-bold text-dark">
                          {data.baseSalary.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                      {/* Ngày công */}
                      <tr className="border-bottom bg-light bg-opacity-50">
                        <td className="py-3 px-3 text-muted">
                          <div className="d-flex justify-content-between mb-1">
                            <span><i className="bi bi-calendar-check me-2"></i> Ngày công chuẩn</span>
                            <span className="fw-medium text-dark">{data.standardWorkDays}</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span><i className="bi bi-check2-square me-2"></i> Ngày công thực tế</span>
                            <span className="fw-bold text-success">{data.workDays.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-end align-middle fw-bold text-success">
                          {data.salaryTheoCong.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ
                        </td>
                      </tr>
                      {/* Phụ cấp */}
                      <tr className="border-bottom">
                        <td className="py-3 px-3 text-muted">
                          <div className="mb-2"><i className="bi bi-plus-circle me-2"></i> Phụ cấp & Thưởng</div>
                          <div className="d-flex flex-column gap-1 ms-4 small opacity-75">
                            <div className="d-flex justify-content-between"><span>Ăn trưa:</span> <span>{data.allowances.meal.toLocaleString("vi-VN")} đ</span></div>
                            <div className="d-flex justify-content-between"><span>Xăng xe:</span> <span>{data.allowances.fuel.toLocaleString("vi-VN")} đ</span></div>
                            <div className="d-flex justify-content-between"><span>Điện thoại:</span> <span>{data.allowances.phone.toLocaleString("vi-VN")} đ</span></div>
                            <div className="d-flex justify-content-between"><span>Thâm niên:</span> <span>{data.allowances.seniority.toLocaleString("vi-VN")} đ</span></div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-end align-bottom fw-bold text-primary">
                          {data.allowances.total.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ
                        </td>
                      </tr>
                      {/* Khấu trừ */}
                      <tr className="border-bottom bg-danger bg-opacity-10">
                        <td className="py-3 px-3 text-danger fw-medium">
                          <i className="bi bi-dash-circle me-2"></i> Khấu trừ (Bảo hiểm, Phạt)
                        </td>
                        <td className="py-3 px-3 text-end fw-bold text-danger">
                          {data.deductions.total.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                      {/* Thực lĩnh */}
                      <tr className="bg-success bg-opacity-10">
                        <td className="py-3 px-3 fw-bold text-success fs-5">
                          THỰC LĨNH
                        </td>
                        <td className="py-3 px-3 text-end fw-bold text-success fs-5">
                          {data.netPay.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="bg-light px-4 py-3 border-top d-flex gap-2 justify-content-end">
            <button className="btn btn-white border rounded-pill px-4 fw-medium text-muted shadow-sm" style={{ fontSize: "13px" }} onClick={onClose}>
              Đóng
            </button>
            {!data?.isConfirmed ? (
              <BrandButton 
                icon="bi-check-circle-fill"
                loading={confirming}
                onClick={async () => {
                  setConfirming(true);
                  try {
                    const res = await fetch("/api/hr/payroll/confirm", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ employeeId, month, year })
                    });
                    if (!res.ok) throw new Error("Lỗi khi xác nhận");
                    success("Thành công", "Bạn đã xác nhận thông tin phiếu lương.");
                    setData({ ...data, isConfirmed: true });
                  } catch (e: any) {
                    toastError("Thất bại", e.message);
                  } finally {
                    setConfirming(false);
                  }
                }}
              >
                Xác nhận phiếu lương
              </BrandButton>
            ) : (
              <div className="d-flex align-items-center gap-2 px-3 fw-bold text-success" style={{ fontSize: "13px" }}>
                <i className="bi bi-check-circle-fill"></i> Đã xác nhận
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
