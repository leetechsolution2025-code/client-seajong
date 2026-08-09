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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Close suggestions when clicking outside
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
    partnerName: "",
    amount: 0,
    paidAmount: 0,
    dueDate: new Date().toISOString().split("T")[0],
    createdAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
    interestRate: 0,
    termMonths: 0,
    description: "",
    referenceId: "",
    status: "UNPAID"
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
          dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : defaultForm.dueDate,
          createdAt: initialData.createdAt ? format(new Date(initialData.createdAt), "yyyy-MM-dd'T'HH:mm:ss") : defaultForm.createdAt,
        });
      } else {
        setFormData({ ...defaultForm, status: "UNPAID", referenceId: "Dư nợ đầu kỳ" });
      }
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [open, initialData]);

  const handlePartnerNameChange = (val: string) => {
    setFormData({ ...formData, partnerName: val });
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

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

  const fetchSuggestions = async (query: string) => {
    try {
      setSearching(true);
      const q = query.toLowerCase();
      const filtered = VIETNAM_BANKS.filter(b => b.name.toLowerCase().includes(q) || b.fullName.toLowerCase().includes(q));
      
      setSuggestions(filtered.map(b => ({ name: b.name, dienThoai: b.fullName })));
      setShowSuggestions(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const selectSuggestion = (name: string) => {
    setFormData({ ...formData, partnerName: name });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partnerName.trim()) {
       error("Lỗi", "Vui lòng nhập tên đối tác / ngân hàng");
       return;
    }
    if (formData.amount <= 0) {
       error("Lỗi", "Số tiền phải lớn hơn 0");
       return;
    }

    setLoading(true);
    try {
      const isEdit = !!initialData;
      // Using debts-v2 API which we assume handles updated schema
      const url = isEdit ? `/api/finance/debts-v2?id=${initialData.id}` : "/api/finance/debts-v2";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          type: "LOAN"
        }),
      });

      if (res.ok) {
        success("Thành công", isEdit ? "Đã cập nhật công nợ" : "Đã thêm công nợ mới");
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        error("Lỗi", data.error || "Không thể lưu dữ liệu");
      }
    } catch (err) {
      error("Lỗi", "Đã xảy ra lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 };
  const inputStyle = { fontSize: 13, borderRadius: 8 };

  const getTitle = () => {
    return initialData ? "Sửa khoản nợ vay" : "Thêm khoản nợ vay";
  };

  const getThemeColor = () => {
    return "primary";
  };

  return createPortal(
    <>
      <div
        className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
        style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none", zIndex: 1040 }}
        onClick={onClose}
      />

      <div
        className={`offcanvas offcanvas-end border-0 shadow-lg ${open ? "show" : ""}`}
        style={{
          width: 400,
          visibility: open ? "visible" : "hidden",
          transition: "transform 0.3s ease-in-out, visibility 0.3s",
          background: "var(--background)",
          zIndex: 1045
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-4" style={{ background: "linear-gradient(to right, var(--background), var(--secondary-subtle))" }}>
          <div className="d-flex align-items-center gap-3">
            <i className={`bi bi-bank fs-4 text-${getThemeColor()}`} />
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 17, letterSpacing: -0.2 }}>
              {getTitle()}
            </h5>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto d-flex flex-column">
          <form id="debt-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1">
            <div className="mb-3">
              <label className="form-label fw-bold text-primary small text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>Thông tin đối tác</label>
              
              <div className="mb-2" ref={suggestionsRef}>
                <label className="form-label" style={labelStyle}>
                  Ngân hàng / Tổ chức tín dụng <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập tên đối tác..."
                    required
                    value={formData.partnerName}
                    onChange={e => handlePartnerNameChange(e.target.value)}
                    onFocus={() => {
                      if (!formData.partnerName.trim()) {
                        fetchSuggestions("");
                      } else if (suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    style={inputStyle}
                  />
                  {searching && (
                    <div className="position-absolute" style={{ right: 10, top: 8 }}>
                      <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></span>
                    </div>
                  )}
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 1000, maxHeight: "200px", overflowY: "auto", top: "100%", marginTop: "4px" }}>
                      {suggestions.map((c: any, idx: number) => (
                        <li
                          key={idx}
                          className="list-group-item list-group-item-action cursor-pointer"
                          style={{ fontSize: 13, padding: "8px 12px" }}
                          onClick={() => selectSuggestion(c.name)}
                        >
                          <div className="fw-bold">{c.name}</div>
                          {c.dienThoai && <div className="text-muted small">ĐT: {c.dienThoai}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label" style={labelStyle}>Mã tham chiếu / REF</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Số hợp đồng, mã đơn hàng..."
                  value={formData.referenceId}
                  onChange={e => setFormData({ ...formData, referenceId: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold text-primary small text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>Tài chính & Thời hạn</label>
              
              <div className="row g-2 mb-2">
                <div className="col-7">
                  <label className="form-label" style={labelStyle}>Số tiền vay <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <CurrencyInput
                      className="form-control"
                      value={formData.amount}
                      onChange={val => setFormData({ ...formData, amount: val })}
                      style={inputStyle}
                    />
                    <span className="input-group-text bg-light text-muted" style={{ fontSize: 13, borderLeft: 0 }}>đồng</span>
                  </div>
                </div>
                <div className="col-5">
                  <label className="form-label" style={labelStyle}>Trạng thái</label>
                  <select 
                    className="form-select"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="UNPAID">Chưa thanh toán</option>
                    <option value="PARTIAL">Thanh toán một phần</option>
                    <option value="PAID">Đã tất toán</option>
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Kỳ hạn</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={formData.termMonths || ""}
                      onChange={e => {
                        const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                        const currentCreatedAt = new Date(formData.createdAt || new Date());
                        const newDueDate = new Date(currentCreatedAt.setMonth(currentCreatedAt.getMonth() + val)).toISOString().split("T")[0];
                        setFormData({ ...formData, termMonths: val, dueDate: newDueDate });
                      }}
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
                      value={formData.interestRate ?? ""}
                      onChange={e => setFormData({ ...formData, interestRate: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                      style={inputStyle}
                    />
                    <span className="input-group-text bg-light text-muted" style={{ fontSize: 13, borderLeft: 0 }}>% / năm</span>
                  </div>
                </div>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Ngày khởi tạo</label>
                  <input
                    type="datetime-local"
                    step="1"
                    className="form-control"
                    value={formData.createdAt}
                    onChange={e => setFormData({ ...formData, createdAt: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label" style={labelStyle}>Ngày đáo hạn</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div className="mb-0 d-flex flex-column flex-grow-1">
              <label className="form-label fw-bold text-primary small text-uppercase mb-2" style={{ letterSpacing: 0.5 }}>Thông tin thêm</label>

              <div className="mb-0 d-flex flex-column flex-grow-1">
                <label className="form-label" style={labelStyle}>Ghi chú / Diễn giải</label>
                <textarea
                  className="form-control flex-grow-1"
                  placeholder="Nội dung chi tiết..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
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
              form="debt-form"
              className="flex-grow-1 py-2"
              loading={loading}
              style={{ fontSize: 13 }}
            >
              Lưu dữ liệu
            </BrandButton>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
