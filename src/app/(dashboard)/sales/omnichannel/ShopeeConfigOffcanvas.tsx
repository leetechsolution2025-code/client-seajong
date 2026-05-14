"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";

interface ShopeeConfigProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export function ShopeeConfigOffcanvas({ open, onClose, onSuccess }: ShopeeConfigProps) {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    partnerId: "",
    partnerKey: "",
    shopId: "",
    shopName: "Leetech Official Store"
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 };
  const inputStyle = { fontSize: 13, borderRadius: 8 };

  return createPortal(
    <>
      <div
        className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
        style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none" }}
        onClick={onClose}
      />

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
            <div className="bg-primary-subtle p-2 rounded-3 text-primary">
              <i className="bi bi-gear-fill fs-5" />
            </div>
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 16 }}>
              Cấu hình Shopee API
            </h5>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto">
           {/* Connection Status Section */}
           <div className="mb-4 p-3 rounded-4 border bg-success-subtle border-success-subtle shadow-sm">
              <div className="d-flex align-items-center gap-3">
                 <div className="p-2 bg-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                    <i className="bi bi-shield-check text-success" />
                 </div>
                 <div>
                    <p className="mb-0 fw-bold" style={{ fontSize: 13 }}>Kết nối: <span className="text-success">Hoạt động</span></p>
                    <p className="mb-0 text-muted" style={{ fontSize: 11 }}>Gian hàng: <strong className="text-dark">{formData.shopName}</strong></p>
                 </div>
              </div>
           </div>

          <form id="shopee-config-form" onSubmit={(e) => { e.preventDefault(); onSuccess(formData); onClose(); }}>
            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông số Partner</label>
              
              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Partner ID <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập Partner ID từ Shopee..."
                  required
                  value={formData.partnerId}
                  onChange={e => setFormData({ ...formData, partnerId: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Partner Key <span className="text-danger">*</span></label>
                <textarea
                  className="form-control"
                  placeholder="Nhập Partner Key..."
                  required
                  rows={4}
                  value={formData.partnerKey}
                  onChange={e => setFormData({ ...formData, partnerKey: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông tin gian hàng</label>
              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Shop ID <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập ID gian hàng Shopee..."
                  required
                  value={formData.shopId}
                  onChange={e => setFormData({ ...formData, shopId: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div className="p-3 bg-light rounded-3 border-start border-4 border-primary">
                 <p className="mb-0 text-muted" style={{ fontSize: 11 }}>
                    <i className="bi bi-info-circle me-1" /> Sau khi lưu cấu hình, hệ thống sẽ tự động thực hiện luồng Ủy quyền (OAuth 2.0) với Shopee.
                 </p>
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
              style={{ fontSize: 13 }}
            >
              Hủy bỏ
            </BrandButton>
            <BrandButton
              type="submit"
              form="shopee-config-form"
              className="flex-grow-1 py-2"
              style={{ fontSize: 13 }}
            >
              Lưu cấu hình
            </BrandButton>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
