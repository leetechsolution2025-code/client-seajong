"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { format } from "date-fns";

interface DisbursementFormOffcanvasProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // the parent BankLoan (Hợp đồng hạn mức)
}

export function DisbursementFormOffcanvas({ open, onClose, onSuccess, initialData }: DisbursementFormOffcanvasProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const defaultForm = {
    disbursementNumber: "",
    amount: 0,
    disbursementDate: new Date().toISOString().split("T")[0],
    termMonths: 0,
    interestRate: 0,
    purpose: "",
    status: "UNPAID"
  };

  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setFormData(defaultForm);
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      error("Vui lòng nhập số tiền giải ngân");
      return;
    }

    if (!initialData?.id) {
      error("Không xác định được Hợp đồng gốc");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/finance/bank-loans/${initialData.id}/disbursements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        success("Tạo khế ước giải ngân thành công");
        onSuccess();
        onClose();
      } else {
        const errorData = await res.json();
        error(errorData.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      error("Lỗi kết nối đến máy chủ");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#344054", marginBottom: 6 };
  const inputStyle = { fontSize: 13.5, padding: "8px 12px" };

  return createPortal(
    <>
      {open && (
        <div className="offcanvas-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      )}
      <div
        className={`offcanvas offcanvas-end ${open ? "show" : ""}`}
        tabIndex={-1}
        style={{ zIndex: 1045, width: 450, borderLeft: "none", boxShadow: "-5px 0 25px rgba(0,0,0,0.1)" }}
      >
        <div className="offcanvas-header bg-success px-4 py-3 border-bottom">
          <div className="d-flex align-items-center gap-2 text-white">
            <div className="bg-white bg-opacity-25 rounded p-1.5 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
              <i className="bi bi-box-arrow-right fs-5" />
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 16 }}>
                Rút vốn / Khế ước nhận nợ
              </h5>
              <div className="opacity-75" style={{ fontSize: 12 }}>{initialData?.bankName} - Hạn mức khả dụng: {(initialData?.availableLimit || 0).toLocaleString("vi-VN")} đ</div>
            </div>
          </div>
          <button type="button" className="btn-close btn-close-white" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto d-flex flex-column">
          <form id="disbursement-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1">
            <div className="mb-3">
              <label className="form-label fw-bold text-success small text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>Thông tin giải ngân</label>
              
              <div className="mb-2">
                <label className="form-label" style={labelStyle}>Mã khế ước / REF</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Mã số khế ước..."
                  value={formData.disbursementNumber}
                  onChange={e => setFormData({ ...formData, disbursementNumber: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div className="mb-2">
                <label className="form-label" style={labelStyle}>Số tiền giải ngân <span className="text-danger">*</span></label>
                <div className="input-group">
                  <CurrencyInput
                    value={formData.amount}
                    onChange={val => setFormData({ ...formData, amount: val })}
                    className="form-control fw-bold text-success"
                    style={inputStyle}
                  />
                  <span className="input-group-text bg-light text-muted fw-medium" style={{ fontSize: 13, borderLeft: 0 }}>đồng</span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold text-success small text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>Thời hạn & Lãi suất</label>
              
              <div className="row g-2 mb-2">
                <div className="col-12">
                  <label className="form-label" style={labelStyle}>Ngày giải ngân</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.disbursementDate}
                    onChange={e => setFormData({ ...formData, disbursementDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Kỳ hạn</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={formData.termMonths || ""}
                      onChange={e => setFormData({ ...formData, termMonths: e.target.value === "" ? 0 : parseInt(e.target.value) })}
                      style={inputStyle}
                    />
                    <span className="input-group-text bg-light text-muted" style={{ fontSize: 13, borderLeft: 0 }}>tháng</span>
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Lãi suất</label>
                  <div className="input-group">
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={formData.interestRate || ""}
                      onChange={e => setFormData({ ...formData, interestRate: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                      style={inputStyle}
                    />
                    <span className="input-group-text bg-light text-muted" style={{ fontSize: 13, borderLeft: 0 }}>%/năm</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-0 d-flex flex-column flex-grow-1">
              <label className="form-label fw-bold text-success small text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>Thông tin thêm</label>

              <div className="mb-0 d-flex flex-column flex-grow-1">
                <label className="form-label" style={labelStyle}>Mục đích vay / Diễn giải</label>
                <textarea
                  className="form-control flex-grow-1"
                  placeholder="Ví dụ: Thanh toán tiền thép cho công ty ABC..."
                  value={formData.purpose}
                  onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                  style={{ ...inputStyle, resize: "none", minHeight: "100px" }}
                />
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
              form="disbursement-form"
              className="flex-grow-1 py-2"
              loading={loading}
              style={{ fontSize: 13, backgroundColor: "#198754", borderColor: "#198754", color: "#fff" }}
            >
              Lưu Khế ước
            </BrandButton>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
