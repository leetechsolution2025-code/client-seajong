"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { LeaveForm } from "./forms/LeaveForm";
import { OvertimeForm } from "./forms/OvertimeForm";
import { BusinessTripForm } from "./forms/BusinessTripForm";
import { AssetRequestForm } from "./forms/AssetRequestForm";
import { FinanceRequestForm } from "./forms/FinanceRequestForm";
import { HRRequestForm } from "./forms/HRRequestForm";
import { BrandButton } from "@/components/ui/BrandButton";

interface PersonalRequestOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  type: string | null;
  onSuccess: () => void;
}

export function PersonalRequestOffcanvas({ isOpen, onClose, type, onSuccess }: PersonalRequestOffcanvasProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const getTitle = () => {
    switch (type) {
      case "leave": return "Đăng ký nghỉ phép";
      case "overtime": return "Đăng ký Làm thêm giờ";
      case "business-trip": return "Yêu cầu công tác";
      case "hr-request": return "Yêu cầu nhân sự và hồ sơ";
      case "finance": return "Yêu cầu tài chính";
      case "asset": return "Yêu cầu tài sản";
      default: return "Tạo yêu cầu mới";
    }
  };

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/my/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Có lỗi xảy ra khi gửi yêu cầu");
      }

      toastSuccess("Thành công", "Yêu cầu của bạn đã được gửi và đang chờ duyệt.");
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
        return <LeaveForm onSubmit={handleSubmit} loading={loading} />;
      case "overtime":
        return <OvertimeForm onSubmit={handleSubmit} loading={loading} />;
      case "business-trip":
        return <BusinessTripForm onSubmit={handleSubmit} loading={loading} />;
      case "asset":
        return <AssetRequestForm onSubmit={handleSubmit} loading={loading} />;
      case "finance":
        return <FinanceRequestForm onSubmit={handleSubmit} loading={loading} />;
      case "hr-request":
        return <HRRequestForm onSubmit={handleSubmit} loading={loading} />;
      default:
        return (
          <div className="py-5 text-center text-muted">
            <i className="bi bi-cone-striped mb-3 d-block" style={{ fontSize: "2.5rem" }}></i>
            <p>Chức năng cho loại yêu cầu này đang được phát triển.</p>
          </div>
        );
    }
  };

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
        style={{ 
          width: "400px", 
          visibility: isOpen ? "visible" : "hidden", 
          zIndex: 1050,
          borderLeft: "1px solid var(--border)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.1)"
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 flex-shrink-0">
          <h5 className="offcanvas-title fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-plus-circle-fill text-primary"></i>
            {getTitle()}
          </h5>
          <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
        </div>
        
        <div className="offcanvas-body p-4 d-flex flex-column overflow-hidden">
          <div className="mb-4 flex-shrink-0">
            <p className="text-muted small mb-0">
              Vui lòng điền đầy đủ các thông tin dưới đây. Yêu cầu sẽ được gửi tới cấp quản lý trực tiếp và phòng Nhân sự để phê duyệt.
            </p>
          </div>

          <div className="flex-grow-1 overflow-auto pe-1 custom-scrollbar">
            {renderForm()}
          </div>
        </div>

        <div className="offcanvas-footer p-4 border-top bg-light flex-shrink-0">
          <div className="d-flex gap-3">
            <button 
              type="button" 
              className="btn btn-light flex-grow-1 fw-semibold border"
              onClick={onClose}
              disabled={loading}
              style={{ borderRadius: "10px" }}
            >
              Hủy bỏ
            </button>
            <BrandButton 
              type="submit" 
              form="personal-request-form"
              className="flex-grow-1"
              loading={loading}
              style={{ borderRadius: "10px" }}
            >
              Gửi yêu cầu
            </BrandButton>
          </div>
        </div>
      </div>
    </>
  );
}
