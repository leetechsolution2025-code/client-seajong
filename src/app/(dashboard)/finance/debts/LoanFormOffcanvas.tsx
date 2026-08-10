"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { format } from "date-fns";

interface LoanFormOffcanvasProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function LoanFormOffcanvas({ open, onClose, onSuccess, initialData }: LoanFormOffcanvasProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const defaultForm = {
    bankName: "",
    contractNumber: "",
    loanType: "vay_han_muc",
    creditLimit: 0,
    startDate: new Date().toISOString().split("T")[0],
    maturityDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
    collateralType: "",
    collateralValue: 0,
    status: "ACTIVE"
  };

  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          ...defaultForm,
          ...initialData,
          startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : defaultForm.startDate,
          maturityDate: initialData.maturityDate ? new Date(initialData.maturityDate).toISOString().split("T")[0] : defaultForm.maturityDate,
        });
      } else {
        setFormData(defaultForm);
      }
      setShowSuggestions(false);
    }
  }, [open, initialData]);

  const VIETNAM_BANKS = [
    { name: "Vietcombank", fullName: "Ngân hàng TMCP Ngoại thương Việt Nam" },
    { name: "VietinBank", fullName: "Ngân hàng TMCP Công Thương Việt Nam" },
    { name: "BIDV", fullName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
    { name: "Agribank", fullName: "Ngân hàng NN&PTNT Việt Nam" },
    { name: "Techcombank", fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam" },
    { name: "MBBank", fullName: "Ngân hàng TMCP Quân đội" },
    { name: "VPBank", fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
    { name: "ACB", fullName: "Ngân hàng TMCP Á Châu" },
    { name: "Sacombank", fullName: "Ngân hàng TMCP Sài Gòn Thương Tín" },
    { name: "TPBank", fullName: "Ngân hàng TMCP Tiên Phong" },
    { name: "VIB", fullName: "Ngân hàng TMCP Quốc tế Việt Nam" },
    { name: "HDBank", fullName: "Ngân hàng TMCP Phát triển TPHCM" },
    { name: "SHB", fullName: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
    { name: "SeABank", fullName: "Ngân hàng TMCP Đông Nam Á" },
    { name: "MSB", fullName: "Ngân hàng TMCP Hàng Hải Việt Nam" }
  ];

  const filteredBanks = VIETNAM_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(formData.bankName.toLowerCase()) ||
      b.fullName.toLowerCase().includes(formData.bankName.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bankName || !formData.creditLimit) {
      error("Vui lòng điền đủ thông tin ngân hàng và hạn mức");
      return;
    }

    setLoading(true);
    try {
      const url = initialData?.id
        ? `/api/finance/bank-loans/${initialData.id}`
        : "/api/finance/bank-loans";
        
      const res = await fetch(url, {
        method: initialData?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        success(initialData?.id ? "Cập nhật thành công" : "Thêm Hợp đồng thành công");
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
        <div className="offcanvas-header bg-primary px-4 py-3 border-bottom">
          <div className="d-flex align-items-center gap-2 text-white">
            <div className="bg-white bg-opacity-25 rounded p-1.5 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
              <i className="bi bi-bank fs-5" />
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 16 }}>
                {initialData ? "Chỉnh sửa Hợp đồng" : "Thêm Hợp đồng Hạn mức"}
              </h5>
              <div className="opacity-75" style={{ fontSize: 12 }}>Thiết lập hạn mức vay vốn ngân hàng</div>
            </div>
          </div>
          <button type="button" className="btn-close btn-close-white" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto d-flex flex-column">
          <form id="loan-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1">
            <div className="mb-3">
              <label className="form-label fw-bold text-primary small text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>Thông tin ngân hàng</label>
              
              <div className="mb-2 position-relative" ref={suggestionsRef}>
                <label className="form-label" style={labelStyle}>
                  Ngân hàng cấp tín dụng <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-bank2 text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="VD: Vietcombank, BIDV..."
                    value={formData.bankName}
                    onChange={(e) => {
                      setFormData({ ...formData, bankName: e.target.value });
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    style={inputStyle}
                  />
                </div>
                
                {showSuggestions && filteredBanks.length > 0 && (
                  <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 1050, maxHeight: 200, overflowY: "auto" }}>
                    {filteredBanks.map((bank, idx) => (
                      <div
                        key={idx}
                        className="p-2 border-bottom cursor-pointer hover-bg-light"
                        onClick={() => {
                          setFormData({ ...formData, bankName: bank.name });
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="fw-medium text-dark" style={{ fontSize: 13 }}>{bank.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{bank.fullName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-2">
                <label className="form-label" style={labelStyle}>Loại hình cấp tín dụng</label>
                <select
                  className="form-select"
                  value={formData.loanType}
                  onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                  style={inputStyle}
                >
                  <option value="vay_han_muc">Vay theo Hạn mức (Line of credit)</option>
                  <option value="vay_tung_lan">Vay từng lần (Món)</option>
                  <option value="vay_thau_chi">Thấu chi (Overdraft)</option>
                </select>
              </div>

              <div className="mb-2">
                <label className="form-label" style={labelStyle}>Mã hợp đồng / Số Khế ước</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Số hợp đồng tín dụng..."
                  value={formData.contractNumber}
                  onChange={e => setFormData({ ...formData, contractNumber: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold text-primary small text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>Hạn mức & Thời hạn</label>
              
              <div className="row g-2 mb-2">
                <div className="col-12">
                  <label className="form-label" style={labelStyle}>Tổng hạn mức được cấp <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <CurrencyInput
                      value={formData.creditLimit}
                      onChange={val => setFormData({ ...formData, creditLimit: val })}
                      className="form-control fw-bold text-primary"
                      style={inputStyle}
                    />
                    <span className="input-group-text bg-light text-muted fw-medium" style={{ fontSize: 13, borderLeft: 0 }}>đồng</span>
                  </div>
                </div>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Ngày bắt đầu</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Ngày hết hạn</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.maturityDate}
                    onChange={e => setFormData({ ...formData, maturityDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div className="mb-0 d-flex flex-column flex-grow-1">
              <label className="form-label fw-bold text-primary small text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>Tài sản đảm bảo</label>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Loại TSĐB</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Bất động sản, máy móc..."
                    value={formData.collateralType}
                    onChange={e => setFormData({ ...formData, collateralType: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Giá trị định giá</label>
                  <CurrencyInput
                    value={formData.collateralValue}
                    onChange={val => setFormData({ ...formData, collateralValue: val })}
                    className="form-control"
                    style={inputStyle}
                  />
                </div>
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
              form="loan-form"
              className="flex-grow-1 py-2"
              loading={loading}
              style={{ fontSize: 13 }}
            >
              Lưu Hợp đồng
            </BrandButton>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
