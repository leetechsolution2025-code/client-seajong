"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

interface AdvanceRefundFormProps {
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

export function AdvanceRefundForm({ initialData, onSubmit, loading }: AdvanceRefundFormProps) {
  const details = useMemo(() => {
    if (!initialData) return {};
    return typeof initialData.details === "string" 
      ? JSON.parse(initialData.details || "{}") 
      : (initialData.details || {});
  }, [initialData]);

  const [formData, setFormData] = useState(() => ({
    subType: details.subType || "Tạm ứng",
    category: details.expenseCategory || details.category || "",
    amount: details.amount ? String(details.amount) : "5000000",
    expectedDate: initialData?.startDate 
      ? new Date(initialData.startDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0],
    advanceCode: details.advanceCode || "",
    paymentMethod: details.paymentMethod || "Chuyển khoản",
    bankName: details.bankName || "",
    bankAccount: details.bankAccount || "",
    bankAccountName: details.bankAccountName || "",
    purpose: details.purpose || initialData?.reason || "",
    isBusinessTrip: Boolean(details.isBusinessTrip),
    tripStartDate: details.tripStartDate || (initialData?.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
    tripEndDate: details.tripEndDate || (initialData?.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
  }));

  const [isBankMenuOpen, setIsBankMenuOpen] = useState(false);
  const bankDropdownRef = useRef<HTMLDivElement>(null);

  // Đóng danh sách gợi ý khi bấm ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(e.target as Node)) {
        setIsBankMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lọc danh sách ngân hàng theo ký tự nhập vào
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
      alert("Vui lòng nhập số tiền hợp lệ (> 0 đ)");
      return;
    }

    const titlePrefix = formData.subType === "Tạm ứng" ? "Tạm ứng" : "Hoàn tạm ứng";

    onSubmit({
      type: "advance-refund",
      startDate: formData.isBusinessTrip && formData.tripStartDate ? formData.tripStartDate : formData.expectedDate,
      endDate: formData.isBusinessTrip && formData.tripEndDate ? formData.tripEndDate : formData.expectedDate,
      reason: formData.purpose,
      details: {
        financeType: formData.subType,
        category: "advance_refund",
        subType: formData.subType,
        expenseCategory: formData.category,
        amount: numAmount,
        advanceCode: formData.advanceCode || undefined,
        paymentMethod: formData.paymentMethod,
        bankName: formData.bankName,
        bankAccount: formData.bankAccount,
        bankAccountName: formData.bankAccountName,
        bankInfo: formData.paymentMethod === "Chuyển khoản" ? `${formData.bankName} - ${formData.bankAccount} (${formData.bankAccountName})` : "Tiền mặt",
        purpose: formData.purpose,
        isBusinessTrip: formData.isBusinessTrip,
        tripStartDate: formData.isBusinessTrip ? formData.tripStartDate : undefined,
        tripEndDate: formData.isBusinessTrip ? formData.tripEndDate : undefined,
      }
    });
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "var(--muted-foreground)",
    textTransform: "uppercase" as const,
    marginBottom: "6px",
    display: "block"
  };

  const inputStyle = {
    borderRadius: "8px",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    background: "var(--background)",
    color: "var(--foreground)",
    fontSize: "13.5px",
    transition: "all 0.2s"
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      {/* Tab chuyển đổi: Tạm ứng vs Hoàn tạm ứng */}
      <div 
        className="d-flex p-1 mb-3 rounded-3 flex-shrink-0"
        style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
      >
        <button
          type="button"
          onClick={() => setFormData({ ...formData, subType: "Tạm ứng" })}
          className="btn flex-fill py-1.5 d-flex align-items-center justify-content-center gap-2"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            borderRadius: "8px",
            border: "none",
            background: formData.subType === "Tạm ứng" ? "var(--card)" : "transparent",
            color: formData.subType === "Tạm ứng" ? "var(--primary)" : "var(--muted-foreground)",
            boxShadow: formData.subType === "Tạm ứng" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s"
          }}
        >
          <i className="bi bi-arrow-up-right-circle text-primary"></i>
          <span>Tạm ứng</span>
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, subType: "Hoàn tạm ứng" })}
          className="btn flex-fill py-1.5 d-flex align-items-center justify-content-center gap-2"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            borderRadius: "8px",
            border: "none",
            background: formData.subType === "Hoàn tạm ứng" ? "var(--card)" : "transparent",
            color: formData.subType === "Hoàn tạm ứng" ? "var(--primary)" : "var(--muted-foreground)",
            boxShadow: formData.subType === "Hoàn tạm ứng" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s"
          }}
        >
          <i className="bi bi-arrow-repeat text-success"></i>
          <span>Hoàn tạm ứng</span>
        </button>
      </div>

      <form id="personal-request-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1">
        <div className="flex-shrink-0">
          {/* Mục đích chi tiêu: chỉ hiển thị ở tab Tạm ứng */}
          {formData.subType === "Tạm ứng" && (
            <div className="mb-3">
              <label style={labelStyle}>Mục đích chi tiêu</label>
              <textarea
                className="form-control shadow-none"
                rows={2}
                style={{ ...inputStyle, resize: "none", minHeight: "58px" }}
                placeholder="Nhập mục đích chi tiêu (vé xe, công tác, mua sắm vật tư, linh kiện...)"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>
          )}

          {/* Số tiền cùng dòng với ngày cần nhận tiền */}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label style={labelStyle}>
                {formData.subType === "Tạm ứng" ? "Số tiền cần tạm ứng" : "Số tiền quyết toán"}
              </label>
              <div className="input-group">
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control shadow-none fw-bold"
                  style={{ 
                    ...inputStyle, 
                    borderTopRightRadius: 0, 
                    borderBottomRightRadius: 0,
                    fontSize: "14px"
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
              <label style={labelStyle}>
                {formData.subType === "Tạm ứng" ? "Ngày cần nhận tiền" : "Ngày lập quyết toán"}
              </label>
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

          {/* Công tắc Đi công tác (phẳng, không dùng thẻ card con bao quanh) */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <label 
              className="fw-bold text-dark d-flex align-items-center gap-2 cursor-pointer mb-0" 
              htmlFor="businessTripSwitch"
              style={{ fontSize: "13px", cursor: "pointer", userSelect: "none" }}
            >
              <i className={`bi bi-briefcase${formData.isBusinessTrip ? "-fill text-primary" : " text-muted"}`}></i>
              <span>Đi công tác</span>
            </label>
            <div className="form-check form-switch m-0 p-0 d-flex align-items-center">
              <input
                className="form-check-input m-0 shadow-none cursor-pointer"
                type="checkbox"
                role="switch"
                id="businessTripSwitch"
                style={{ width: "38px", height: "20px", cursor: "pointer" }}
                checked={formData.isBusinessTrip}
                onChange={e => setFormData({ ...formData, isBusinessTrip: e.target.checked })}
              />
            </div>
          </div>

          {/* Thời gian đi công tác: Từ ngày - Đến ngày */}
          {formData.isBusinessTrip && (
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label style={labelStyle}>Từ ngày</label>
                <input
                  type="date"
                  className="form-control shadow-none"
                  style={inputStyle}
                  value={formData.tripStartDate}
                  onChange={e => setFormData({ ...formData, tripStartDate: e.target.value })}
                  required={formData.isBusinessTrip}
                />
              </div>
              <div className="col-6">
                <label style={labelStyle}>Đến ngày</label>
                <input
                  type="date"
                  className="form-control shadow-none"
                  style={inputStyle}
                  value={formData.tripEndDate}
                  onChange={e => setFormData({ ...formData, tripEndDate: e.target.value })}
                  required={formData.isBusinessTrip}
                />
              </div>
            </div>
          )}

          {/* Mã phiếu và Hình thức (đặt cùng dòng ở tab Hoàn tạm ứng) */}
          {formData.subType === "Hoàn tạm ứng" ? (
            <div className="row g-3 mb-3">
              <div className="col-7">
                <label style={labelStyle}>Mã phiếu đã tạm ứng (nếu có)</label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  style={inputStyle}
                  placeholder="Vd: YC-2026-079..."
                  value={formData.advanceCode}
                  onChange={e => setFormData({ ...formData, advanceCode: e.target.value })}
                />
              </div>
              <div className="col-5">
                <label style={labelStyle}>Hình thức</label>
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
          ) : (
            <div className="mb-3">
              <label style={labelStyle}>Hình thức</label>
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
          )}

          {/* Nếu là Chuyển khoản: Ngân hàng thụ hưởng, Số tài khoản, Chủ tài khoản (giống Tạm ứng lương) */}
          {formData.paymentMethod === "Chuyển khoản" && (
            <>
              <div className="mb-3 position-relative" ref={bankDropdownRef}>
                <label style={labelStyle}>Ngân hàng thụ hưởng</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control shadow-none"
                    style={inputStyle}
                    placeholder="Nhập tên hoặc mã ngân hàng..."
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
                    style={{ zIndex: 1060, maxHeight: "180px" }}
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

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label style={labelStyle}>Số tài khoản nhận</label>
                  <input
                    type="text"
                    className="form-control shadow-none"
                    style={inputStyle}
                    placeholder="Số tài khoản ngân hàng"
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
                    placeholder="Tên chủ tài khoản"
                    value={formData.bankAccountName}
                    onChange={e => setFormData({ ...formData, bankAccountName: e.target.value })}
                    required
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Nội dung & Kế hoạch sử dụng kinh phí */}
        <div className="d-flex flex-column mb-0 mt-2">
          <label style={labelStyle}>
            {formData.subType === "Tạm ứng" 
              ? "Nội dung & Kế hoạch sử dụng kinh phí" 
              : "Diễn giải chi tiết quyết toán chi phí"}
          </label>
          <textarea
            className="form-control shadow-none w-100"
            rows={3}
            style={{ 
              ...inputStyle, 
              resize: "vertical", 
              minHeight: "90px"
            }}
            placeholder={
              formData.subType === "Tạm ứng"
                ? "Mô tả cụ thể kế hoạch công tác, mua sắm hoặc các khoản dự trù chi tiêu..."
                : "Chi tiết các khoản đã chi, số tiền từng mục, đính kèm số hóa đơn đỏ..."
            }
            value={formData.purpose}
            onChange={e => setFormData({ ...formData, purpose: e.target.value })}
            required
          />
        </div>
      </form>
    </div>
  );
}
