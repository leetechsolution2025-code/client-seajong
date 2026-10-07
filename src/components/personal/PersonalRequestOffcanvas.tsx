"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { LeaveForm } from "./forms/LeaveForm";
import { SickLeaveForm } from "./forms/SickLeaveForm";
import { SalaryAdvanceForm } from "./forms/SalaryAdvanceForm";
import { AdvanceRefundForm } from "./forms/AdvanceRefundForm";
import { LateEarlyForm } from "./forms/LateEarlyForm";
import { OvertimeForm } from "./forms/OvertimeForm";
import { BrandButton } from "@/components/ui/BrandButton";

interface PersonalRequestOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  type: string | null;
  initialData?: any;
  onSuccess: () => void;
}

export function PersonalRequestOffcanvas({ isOpen, onClose, type, initialData, onSuccess }: PersonalRequestOffcanvasProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(initialData);

  const getTitle = () => {
    let name = "yêu cầu mới";
    switch (type) {
      case "leave":
        name = "nghỉ phép";
        break;
      case "sick-leave":
        name = "nghỉ ốm";
        break;
      case "salary-advance":
        name = "tạm ứng lương";
        break;
      case "advance-refund":
        name = "tạm ứng và hoàn tạm ứng";
        break;
      case "late-early":
        name = "đi muộn về sớm";
        break;
      case "overtime":
        name = "làm thêm giờ (OT)";
        break;
      default:
        name = "yêu cầu";
        break;
    }
    return isEdit ? `Chỉnh sửa đơn ${name}` : `Đăng ký ${name}`;
  };

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    try {
      const url = "/api/my/requests";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit ? { id: initialData.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Có lỗi xảy ra khi gửi yêu cầu");
      }

      toastSuccess("Thành công", isEdit ? "Đã cập nhật yêu cầu thành công." : "Yêu cầu của bạn đã được gửi và đang chờ duyệt.");
      onSuccess();
      onClose();
    } catch (error: any) {
      toastError("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (type) {
      case "leave":
        return <LeaveForm key={initialData?.id || "new-leave"} initialData={initialData} onSubmit={handleSubmit} loading={loading} />;
      case "sick-leave":
        return <SickLeaveForm key={initialData?.id || "new-sick"} initialData={initialData} onSubmit={handleSubmit} loading={loading} />;
      case "salary-advance":
        return <SalaryAdvanceForm key={initialData?.id || "new-salary"} initialData={initialData} onSubmit={handleSubmit} loading={loading} />;
      case "advance-refund":
        return <AdvanceRefundForm key={initialData?.id || "new-advance"} initialData={initialData} onSubmit={handleSubmit} loading={loading} />;
      case "late-early":
        return <LateEarlyForm key={initialData?.id || "new-late"} initialData={initialData} onSubmit={handleSubmit} loading={loading} />;
      case "overtime":
        return <OvertimeForm key={initialData?.id || "new-ot"} initialData={initialData} onSubmit={handleSubmit} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className={`offcanvas-backdrop fade ${isOpen ? "show" : ""}`}
        style={{
          pointerEvents: isOpen ? "auto" : "none",
          display: isOpen ? "block" : "none",
          zIndex: 1040,
          transition: "opacity 0.25s ease-in-out"
        }}
        onClick={onClose}
      />

      <div
        className={`offcanvas offcanvas-end border-0 shadow-lg ${isOpen ? "show" : ""}`}
        tabIndex={-1}
        style={{
          width: 400,
          visibility: isOpen ? "visible" : "hidden",
          transition: "transform 0.3s ease-in-out, visibility 0.3s",
          zIndex: 1050,
          boxShadow: "-10px 0 30px rgba(0,0,0,0.12)"
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 flex-shrink-0 align-items-start">
          <div className="d-flex align-items-start gap-2.5">
            <div 
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: isEdit ? "#fef3c7" : "#e0e7ff",
                color: isEdit ? "#d97706" : "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                flexShrink: 0,
                marginTop: "2px"
              }}
            >
              <i className={`bi ${isEdit ? "bi-pencil-square" : "bi-plus-circle-fill"}`}></i>
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold mb-1" style={{ fontSize: "15px", lineHeight: 1.25 }}>
                {getTitle()}
              </h5>
              {isEdit && initialData?.id ? (
                <div className="d-flex align-items-center gap-1.5 mt-0.5">
                  <span className="text-muted" style={{ fontSize: "12px" }}>Mã yêu cầu:</span>
                  <span 
                    className="font-monospace fw-bold"
                    style={{
                      fontSize: "11px",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                      lineHeight: 1.2
                    }}
                  >
                    {initialData.id}
                  </span>
                </div>
              ) : (
                <div className="text-muted" style={{ fontSize: "12px", lineHeight: 1.2 }}>
                  Điền thông tin và gửi phê duyệt
                </div>
              )}
            </div>
          </div>
          <button type="button" className="btn-close shadow-none mt-1" onClick={onClose} aria-label="Close"></button>
        </div>

        <div 
          className="offcanvas-body p-4 d-flex flex-column flex-grow-1 custom-offcanvas-scroll" 
          style={{ 
            overflowY: "auto", 
            overflowX: "hidden", 
            minHeight: 0 
          }}
        >
          {renderForm()}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--card)", flexShrink: 0 }}>
          <div className="d-flex align-items-center justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-light border fw-medium px-3"
              style={{ fontSize: "13.5px", height: "36px" }}
              onClick={onClose}
              disabled={loading}
            >
              Đóng
            </button>
            <BrandButton
              type="submit"
              form="personal-request-form"
              className="btn btn-primary fw-medium px-3 shadow-sm text-white"
              style={{ fontSize: "13.5px", height: "36px", backgroundColor: "#003087", borderColor: "#003087" }}
              loading={loading}
            >
              {isEdit ? "Lưu thay đổi" : "Gửi yêu cầu"}
            </BrandButton>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-offcanvas-scroll {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .custom-offcanvas-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .custom-offcanvas-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-offcanvas-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-offcanvas-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </>
  );
}
