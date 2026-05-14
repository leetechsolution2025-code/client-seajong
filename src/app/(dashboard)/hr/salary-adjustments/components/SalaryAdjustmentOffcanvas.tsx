"use client";

import React, { useState, useEffect } from "react";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onRefresh: () => void;
}

export function SalaryAdjustmentOffcanvas({ isOpen, onClose, data, onRefresh }: Props) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeSubStep, setActiveSubStep] = useState(1);
  
  // Dialog States
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  useEffect(() => {
    if (data) {
      if (data.status === "PENDING") setActiveSubStep(1);
      else if (data.status === "REVIEWING") setActiveSubStep(2);
      else if (data.status === "SUBMITTED") setActiveSubStep(3);
      else if (data.status === "APPROVED") setActiveSubStep(4);
      else if (data.status === "DECIDED") setActiveSubStep(5);
      else if (data.status === "COMPLETED") setActiveSubStep(6);
    }
  }, [data]);

  if (!data) return null;

  const handleUpdateStatus = async (newStatus: string, note?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/salary-adjustment/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, hrNote: note })
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      success("Thành công", `Đã chuyển trạng thái sang: ${newStatus}`);
      onRefresh();
    } catch (e: any) {
      toastError("Lỗi", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/salary-adjustment/${data.id}/finalize`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Cập nhật thất bại");
      success("Thành công", "Đã cập nhật dữ liệu vào hồ sơ nhân sự.");
      setShowFinalizeConfirm(false);
      onRefresh();
    } catch (e: any) {
      toastError("Lỗi", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hr/salary-adjustment/${data.id}/recall`, { method: "POST" });
      if (!res.ok) throw new Error("Không thể thu hồi");
      success("Thành công", "Đã thu hồi tờ trình.");
      setShowRecallConfirm(false);
      onRefresh();
    } catch (e: any) {
      toastError("Lỗi", e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: any) => {
    if (!v) return "0";
    return Number(v).toLocaleString("vi-VN");
  };

  const currentAllowances = data.currentAllowances ? JSON.parse(data.currentAllowances) : {};
  const proposedAllowances = data.proposedAllowances ? JSON.parse(data.proposedAllowances) : {};

  return (
    <>
      {isOpen && (
        <div 
          className="offcanvas-backdrop fade show" 
          onClick={onClose} 
          style={{ zIndex: 1040 }}
        />
      )}
      <div 
        className={`offcanvas offcanvas-end ${isOpen ? "show" : ""}`} 
        style={{ width: "400px", visibility: isOpen ? "visible" : "hidden", zIndex: 1050 }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold">
            {["APPROVED", "DECIDED", "COMPLETED"].includes(data.status) ? "Cập nhật dữ liệu" : "Chi tiết quy trình điều chỉnh"}
          </h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        
        <div className="offcanvas-body p-0 d-flex flex-column h-100 custom-scrollbar">
          <div className="p-4 flex-grow-1 overflow-auto">
            {/* Header Info */}
            <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded-3" style={{ background: "var(--muted)" }}>
              <EmployeeAvatar name={data.employee?.fullName} url={data.employee?.avatarUrl} size={60} borderRadius={15} />
              <div>
                <h5 className="mb-1 fw-bold text-dark">{data.employee?.fullName}</h5>
                <div className="text-muted small">{data.employee?.code} • {data.employee?.departmentName}</div>
                <div className="badge bg-primary-subtle text-primary mt-1">
                  {data.adjustmentType === "INCREASE" ? "Tăng lương" : data.adjustmentType === "DECREASE" ? "Giảm lương" : "Tái cơ cấu"}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <h6 className="fw-bold mb-2 small">Lý do điều chỉnh:</h6>
              <div className="p-3 bg-light rounded-3 small text-muted italic border-start border-primary border-4">
                "{data.reason}"
              </div>
            </div>

            {/* Effective Date */}
            {data.effectiveDate && (
              <div className="mb-4">
                <h6 className="fw-bold mb-2 small">Ngày hiệu lực:</h6>
                <div className="text-primary fw-bold" style={{ fontSize: "14px" }}>
                  <i className="bi bi-calendar-check me-2"></i>
                  {new Date(data.effectiveDate).toLocaleDateString("vi-VN")}
                </div>
              </div>
            )}

            {/* Income Comparison Table */}
            <h6 className="fw-bold mb-3">
              {["APPROVED", "DECIDED", "COMPLETED"].includes(data.status) ? "Chi tiết sau điều chỉnh" : "So sánh thu nhập"}
            </h6>
            <div className="table-responsive rounded-3 border overflow-hidden">
              <table className="table table-sm mb-0" style={{ fontSize: "13px" }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3 py-2">Khoản mục</th>
                    <th className="text-end py-2">Hiện tại</th>
                    <th className="text-end pe-3 py-2">Đề xuất</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="ps-3 fw-medium">Lương cơ bản</td>
                    <td className="text-end text-muted">{fmt(data.currentBaseSalary)}</td>
                    <td className="text-end fw-bold text-success">{fmt(data.proposedBaseSalary)}</td>
                  </tr>
                  {(["meal", "fuel", "phone", "seniority"] as const).map(key => (
                    <tr key={key}>
                      <td className="ps-3 text-muted" style={{ fontSize: "12px" }}>
                        {key === "meal" ? "Phụ cấp ăn trưa" : key === "fuel" ? "Phụ cấp xăng xe" : key === "phone" ? "Phụ cấp điện thoại" : "Phụ cấp thâm niên"}
                      </td>
                      <td className="text-end text-muted">{fmt(currentAllowances[key])}</td>
                      <td className="text-end">{fmt(proposedAllowances[key])}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light fw-bold">
                  <tr>
                    <td className="ps-3">TỔNG THU NHẬP</td>
                    <td className="text-end text-muted">
                      {fmt(Number(data.currentBaseSalary || 0) + Object.values(currentAllowances).reduce((acc: number, val: any) => acc + Number(val || 0), 0))}
                    </td>
                    <td className="text-end text-primary">
                      {fmt(Number(data.proposedBaseSalary || 0) + Object.values(proposedAllowances).reduce((acc: number, val: any) => acc + Number(val || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {data.status === "REJECTED" && (
              <div className="alert alert-danger mt-4 p-3 rounded-3 border-0 shadow-sm d-flex gap-3">
                <i className="bi bi-x-circle-fill fs-5 mt-1"></i>
                <div>
                  <div className="fw-bold mb-1">Yêu cầu này đã bị từ chối</div>
                  <div className="small opacity-75">
                    Lý do: {data.hrNote || "Không có lý do cụ thể"}
                  </div>
                </div>
              </div>
            )}
            {data.status === "COMPLETED" && (
              <div className="alert alert-success mt-4 py-2 small d-flex align-items-center gap-2">
                <i className="bi bi-check-circle-fill"></i> Yêu cầu đã hoàn tất
              </div>
            )}
          </div>

          <div className="p-4 border-top bg-white d-flex gap-2 justify-content-end">
            {["APPROVED", "DECIDED"].includes(data.status) ? (
              <BrandButton className="w-100" onClick={() => setShowFinalizeConfirm(true)} loading={loading}>
                 Cập nhật
              </BrandButton>
            ) : data.status !== "REJECTED" && data.status !== "COMPLETED" && (
              <>
                <BrandButton 
                  variant="outline" 
                  className="text-danger flex-grow-1" 
                  onClick={() => {
                    const reason = window.prompt("Nhập lý do từ chối:");
                    if (reason !== null) {
                      handleUpdateStatus("REJECTED", reason);
                    }
                  }} 
                  loading={loading}
                >
                  Từ chối
                </BrandButton>
                
                {/* At any step, Accept moves to the next logical state */}
                <BrandButton className="flex-grow-1" onClick={() => {
                  let nextStatus = "REVIEWING";
                  if (data.status === "PENDING" || data.status === "REVIEWING") nextStatus = "SUBMITTED";
                  else if (data.status === "SUBMITTED") nextStatus = "APPROVED";
                  else if (data.status === "APPROVED") nextStatus = "DECIDED";
                  else if (data.status === "DECIDED") nextStatus = "COMPLETED";
                  handleUpdateStatus(nextStatus);
                }} loading={loading}>
                  Chấp nhận
                </BrandButton>
              </>
            )}

            {data.status === "WAITING_APPROVAL" && (
              <BrandButton 
                variant="outline" 
                className="w-100 text-warning border-warning"
                loading={loading}
                onClick={() => setShowRecallConfirm(true)}
              >
                <i className="bi bi-arrow-counterclockwise me-2"></i>
                Thu hồi tờ trình
              </BrandButton>
            )}
            { (data.status === "REJECTED" || data.status === "COMPLETED") && (
              <BrandButton variant="outline" className="w-100" onClick={onClose}>Đóng</BrandButton>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog 
        open={showRecallConfirm}
        title="Xác nhận thu hồi"
        message="Bạn có chắc chắn muốn thu hồi tờ trình này? Ban Giám đốc sẽ không nhìn thấy hồ sơ này trong danh sách phê duyệt nữa."
        variant="warning"
        confirmLabel="Đồng ý thu hồi"
        onConfirm={handleRecall}
        onCancel={() => setShowRecallConfirm(false)}
        loading={loading}
      />

      <ConfirmDialog 
        open={showFinalizeConfirm}
        title="Xác nhận cập nhật dữ liệu"
        message="Hệ thống sẽ cập nhật mức lương mới vào hồ sơ nhân sự và tự động lưu vào Quá trình công tác. Bạn có chắc chắn muốn thực hiện?"
        variant="info"
        confirmLabel="Cập nhật ngay"
        onConfirm={handleFinalize}
        onCancel={() => setShowFinalizeConfirm(false)}
        loading={loading}
      />
    </>
  );
}
