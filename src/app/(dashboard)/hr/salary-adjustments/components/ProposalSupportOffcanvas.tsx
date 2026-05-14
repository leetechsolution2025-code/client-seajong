"use client";

import React, { useState } from "react";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: any[];
  onRefresh: () => void;
}

export function ProposalSupportOffcanvas({ isOpen, onClose, selectedItems, onRefresh }: Props) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const handleBulkApprove = async () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/hr/salary-adjustment/submit-to-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedItems.map(x => x.id) })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      success("Thành công", `Đã trình phê duyệt ${selectedItems.length} hồ sơ đến Ban Giám đốc.`);
      onRefresh();
      onClose();
    } catch (e: any) {
      toastError("Lỗi", e.message || "Không thể trình phê duyệt");
    } finally {
      setLoading(false);
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
        style={{ width: "450px", visibility: isOpen ? "visible" : "hidden", zIndex: 1050 }}
      >
        <div className="offcanvas-header border-bottom bg-light">
          <h5 className="offcanvas-title fw-bold text-primary">
            <i className="bi bi-file-earmark-text me-2"></i>
            Hỗ trợ trình phê duyệt
          </h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        
        <div className="offcanvas-body p-0 d-flex flex-column h-100 custom-scrollbar">
          <div className="p-4 flex-grow-1 overflow-auto">
            <div className="alert alert-info py-2 small d-flex align-items-center gap-2 mb-4">
              <i className="bi bi-info-circle-fill"></i>
              Bạn đang trình phê duyệt cho <strong>{selectedItems.length}</strong> nhân sự đã chọn.
            </div>

            <div className="list-group list-group-flush border rounded-3 overflow-hidden">
              {selectedItems.map((item) => (
                <div key={item.id} className="list-group-item p-3">
                  <div className="d-flex align-items-center gap-3">
                    <EmployeeAvatar name={item.employee?.fullName} url={item.employee?.avatarUrl} size={40} borderRadius={10} />
                    <div className="flex-grow-1">
                      <div className="fw-bold text-dark small">{item.employee?.fullName}</div>
                      <div className="text-muted" style={{ fontSize: "11px" }}>
                        {item.employee?.code} • {item.adjustmentType === "INCREASE" ? "Tăng lương" : "Giảm lương"}
                      </div>
                    </div>
                    <div className="text-end">
                       <div className="fw-bold text-primary small">
                         {Number(item.proposedBaseSalary || 0).toLocaleString("vi-VN")}
                       </div>
                       <div className="text-muted" style={{ fontSize: "10px" }}>Lương đề xuất</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-light rounded-3 border-dashed border-2 text-center">
               <p className="text-muted small mb-0">Hệ thống sẽ tự động tạo dự thảo tờ trình và gửi đến Ban Giám đốc sau khi bạn nhấn "Xác nhận & Trình duyệt".</p>
            </div>
          </div>

          <div className="p-4 border-top bg-white d-flex gap-2">
            <BrandButton variant="outline" className="flex-grow-1" onClick={onClose}>Hủy bỏ</BrandButton>
            <BrandButton className="flex-grow-1" onClick={handleBulkApprove} loading={loading} disabled={selectedItems.length === 0}>
               Xác nhận & Trình phê duyệt
            </BrandButton>
          </div>
        </div>
      </div>
    </>
  );
}
