"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

interface SalaryAdvanceFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  loading: boolean;
}

const VIETNAM_BANKS = [
  { code: "MB", name: "MBBank", fullName: "Ngân hàng TMCP Quân đội" },
  { code: "VCB", name: "Vietcombank", fullName: "Ngân hàng TMCP Ngoại thương Việt Nam" },
  { code: "CTG", name: "VietinBank", fullName: "Ngân hàng TMCP Công Thương Việt Nam" },
  { code: "BIDV", name: "BIDV", fullName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  { code: "VBA", name: "Agribank", fullName: "Ngân hàng Nông nghiệp & PTNT Việt Nam" },
  { code: "TCB", name: "Techcombank", fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam" },
  { code: "VPB", name: "VPBank", fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { code: "ACB", name: "ACB", fullName: "Ngân hàng TMCP Á Châu" },
  { code: "STB", name: "Sacombank", fullName: "Ngân hàng TMCP Sài Gòn Thương Tín" },
  { code: "TPB", name: "TPBank", fullName: "Ngân hàng TMCP Tiên Phong" },
  { code: "VIB", name: "VIB", fullName: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { code: "HDB", name: "HDBank", fullName: "Ngân hàng TMCP Phát triển TPHCM" },
  { code: "SHB", name: "SHB", fullName: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { code: "MSB", name: "MSB", fullName: "Ngân hàng TMCP Hàng Hải Việt Nam" },
  { code: "OCB", name: "OCB", fullName: "Ngân hàng TMCP Phương Đông" },
  { code: "SSB", name: "SeABank", fullName: "Ngân hàng TMCP Đông Nam Á" },
  { code: "LPB", name: "LPBank", fullName: "Ngân hàng TMCP Lộc Phát Việt Nam" },
  { code: "EIB", name: "Eximbank", fullName: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam" },
];

export function SalaryAdvanceForm({ initialData, onSubmit, loading }: SalaryAdvanceFormProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  const details = useMemo(() => {
    if (!initialData) return {};
    return typeof initialData.details === "string" 
      ? JSON.parse(initialData.details || "{}") 
      : (initialData.details || {});
  }, [initialData]);

  const [formData, setFormData] = useState(() => ({
    amount: details.amount ? String(details.amount) : "3000000",
    salaryMonth: details.salaryMonth || `${currentMonth}/${currentYear}`,
    expectedDate: initialData?.startDate 
      ? new Date(initialData.startDate).toISOString().split("T")[0] 
      : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    paymentMethod: details.paymentMethod || "Chuyển khoản",
    bankName: details.bankName || "",
    bankAccount: details.bankAccount || "",
    bankAccountName: details.bankAccountName || "",
    reason: details.reason || initialData?.reason || "",
  }));

  const [isBankMenuOpen, setIsBankMenuOpen] = useState(false);
  const bankDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(e.target as Node)) {
        setIsBankMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBanks = useMemo(() => {
    if (!formData.bankName.trim()) return VIETNAM_BANKS.slice(0, 8);
    const q = formData.bankName.toLowerCase();
    return VIETNAM_BANKS.filter(
      b =>
        b.name.toLowerCase().includes(q) ||
        b.fullName.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)
    );
  }, [formData.bankName]);

  const formatNumberGroup = (val: string | number) => {
    const raw = String(val).replace(/\D/g, "");
    if (!raw) return "";
    return Number(raw).toLocaleString("vi-VN");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, amount: rawDigits });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount) || 0;
    if (numAmount <= 0) {
      alert("Vui lòng nhập số tiền tạm ứng hợp lệ (> 0 đ)");
      return;
    }

    onSubmit({
      type: "salary-advance",
      startDate: formData.expectedDate,
      endDate: formData.expectedDate,
      reason: formData.reason,
      details: {
        financeType: "Tạm ứng lương",
        category: "salary_advance",
        amount: numAmount,
        salaryMonth: formData.salaryMonth,
        paymentMethod: formData.paymentMethod,
        bankName: formData.bankName,
        bankAccount: formData.bankAccount,
        bankAccountName: formData.bankAccountName,
        bankInfo: formData.paymentMethod === "Chuyển khoản" ? `${formData.bankName} - ${formData.bankAccount} (${formData.bankAccountName})` : "Tiền mặt",
        reason: formData.reason,
      }
    });
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "var(--muted-foreground)",
    textTransform: "uppercase" as const,
    marginBottom: "8px",
    display: "block"
  };

  const inputStyle = {
    borderRadius: "8px",
    padding: "9px 12px",
    border: "1px solid var(--border)",
    background: "var(--background)",
    color: "var(--foreground)",
    fontSize: "13.5px",
    transition: "all 0.2s"
  };

  return (
    <form id="personal-request-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1 h-100">
      <div className="flex-shrink-0">
        {/* 1. Kỳ lương tạm ứng & Ngày mong muốn nhận */}
        <div className="row g-3 mb-3 pb-1">
        <div className="col-6">
          <label style={labelStyle}>Kỳ lương tạm ứng</label>
          <select
            className="form-select shadow-none"
            style={inputStyle}
            value={formData.salaryMonth}
            onChange={e => setFormData({ ...formData, salaryMonth: e.target.value })}
          >
            <option value={`${currentMonth}/${currentYear}`}>Tháng {currentMonth}/{currentYear}</option>
            <option value={`${nextMonth}/${nextYear}`}>Tháng {nextMonth}/{nextYear}</option>
          </select>
        </div>

        <div className="col-6">
          <label style={labelStyle}>Ngày mong muốn nhận</label>
          <input
            type="date"
            className="form-control shadow-none"
            style={inputStyle}
            value={formData.expectedDate}
            onChange={e => setFormData({ ...formData, expectedDate: e.target.value })}
            required
          />
        </div>
      </div>

      {/* 2. Số tiền cần tạm ứng & Hình thức nhận tiền */}
      <div className="mb-3 pb-1">
        <div className="row g-3">
          <div className="col-6">
            <label style={labelStyle}>Số tiền cần tạm ứng</label>
            <div className="input-group">
              <input
                type="text"
                inputMode="numeric"
                className="form-control shadow-none fw-bold"
                style={{ 
                  ...inputStyle, 
                  borderTopRightRadius: 0, 
                  borderBottomRightRadius: 0,
                  fontSize: "14px", 
                  color: "var(--foreground)" 
                }}
                value={formatNumberGroup(formData.amount)}
                onChange={handleAmountChange}
                required
              />
              <span 
                className="input-group-text bg-light text-muted fw-semibold"
                style={{
                  borderColor: "var(--border)",
                  borderTopRightRadius: "8px",
                  borderBottomRightRadius: "8px",
                  fontSize: "13px",
                  padding: "0 12px"
                }}
              >
                đ
              </span>
            </div>
          </div>

          <div className="col-6">
            <label style={labelStyle}>Hình thức nhận tiền</label>
            <select
              className="form-select shadow-none"
              style={inputStyle}
              value={formData.paymentMethod}
              onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="Chuyển khoản">Chuyển khoản</option>
              <option value="Tiền mặt">Tiền mặt</option>
            </select>
          </div>
        </div>

        <div className="text-muted mt-2" style={{ fontSize: "11.5px", lineHeight: 1.4 }}>
          Số tiền xin tạm ứng không vượt quá 50% lương cơ bản
        </div>
      </div>

      {/* 3. Thông tin ngân hàng nếu hình thức là Chuyển khoản */}
      {formData.paymentMethod === "Chuyển khoản" && (
        <>
          <div className="mb-3 pb-1 position-relative" ref={bankDropdownRef}>
            <label style={labelStyle}>Ngân hàng thụ hưởng</label>
            <div className="position-relative">
              <input
                type="text"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.bankName}
                onChange={e => {
                  setFormData({ ...formData, bankName: e.target.value });
                  setIsBankMenuOpen(true);
                }}
                onFocus={() => setIsBankMenuOpen(true)}
                required
              />
              <i 
                className="bi bi-chevron-down position-absolute text-muted" 
                style={{ right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", pointerEvents: "none" }}
              />
            </div>

            {isBankMenuOpen && filteredBanks.length > 0 && (
              <div 
                className="position-absolute start-0 end-0 mt-1 bg-white border rounded-3 shadow-lg p-1 overflow-auto"
                style={{ zIndex: 1060, maxHeight: "190px" }}
              >
                {filteredBanks.map(b => (
                  <div
                    key={b.code}
                    onClick={() => {
                      setFormData({ ...formData, bankName: `${b.name} - ${b.fullName}` });
                      setIsBankMenuOpen(false);
                    }}
                    className="p-2 rounded-2 cursor-pointer transition-all d-flex align-items-center justify-content-between"
                    style={{ cursor: "pointer", fontSize: "12px" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--muted)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div className="d-flex flex-column">
                      <span className="fw-bold text-dark">{b.name}</span>
                      <span className="text-muted small" style={{ fontSize: "11px" }}>{b.fullName}</span>
                    </div>
                    <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: "10px" }}>
                      {b.code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="row g-3 mb-3 pb-1">
            <div className="col-6">
              <label style={labelStyle}>Số tài khoản nhận</label>
              <input
                type="text"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.bankAccount}
                onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                required
              />
            </div>

            <div className="col-6">
              <label style={labelStyle}>Chủ tài khoản</label>
              <input
                type="text"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.bankAccountName}
                onChange={e => setFormData({ ...formData, bankAccountName: e.target.value })}
                required
              />
            </div>
          </div>
        </>
      )}
      </div>

      {/* 4. Lý do tạm ứng lương - TỰ ĐỘNG CHIẾM HẾT CHIỀU CAO KHẢ DỤNG */}
      <div className="d-flex flex-column flex-grow-1 mb-0 mt-1">
        <label style={labelStyle}>Lý do tạm ứng lương</label>
        <textarea
          className="form-control shadow-none flex-grow-1 w-100"
          style={{ 
            ...inputStyle, 
            resize: "none", 
            minHeight: "120px",
            height: "100%"
          }}
          value={formData.reason}
          onChange={e => setFormData({ ...formData, reason: e.target.value })}
          required
        />
      </div>
    </form>
  );
}
