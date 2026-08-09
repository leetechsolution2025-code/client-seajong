"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

interface DebtFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: "RECEIVABLE" | "PAYABLE" | "LOAN";
  initialData?: any;
}

export function DebtFormOffcanvas({ open, onClose, onSuccess, type, initialData }: DebtFormProps) {
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
    interestRate: 0,
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
        });
      } else {
        setFormData({ ...defaultForm, status: "UNPAID" });
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

  const fetchSuggestions = async (query: string) => {
    try {
      setSearching(true);
      const res = await fetch(`/api/plan-finance/customers?search=${encodeURIComponent(query)}&page=1&pageSize=1000`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.customers || []);
        setShowSuggestions(true);
      }
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
          type
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
    if (type === "RECEIVABLE") return initialData ? "Sửa khoản phải thu" : "Thêm khoản phải thu";
    if (type === "PAYABLE") return initialData ? "Sửa khoản phải trả" : "Thêm khoản phải trả";
    if (type === "LOAN") return initialData ? "Sửa khoản nợ vay" : "Thêm khoản nợ vay";
    return "Quản lý công nợ";
  };

  const getThemeColor = () => {
    if (type === "RECEIVABLE") return "success";
    if (type === "PAYABLE") return "danger";
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
            <i className={`bi bi-${type === "LOAN" ? "bank" : (type === "RECEIVABLE" ? "arrow-down-left-circle" : "arrow-up-right-circle")} fs-4 text-${getThemeColor()}`} />
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 17, letterSpacing: -0.2 }}>
              {getTitle()}
            </h5>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto">
          <form id="debt-form" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông tin đối tác</label>
              
              <div className="mb-3" ref={suggestionsRef}>
                <label className="form-label" style={labelStyle}>
                  {type === "LOAN" ? "Ngân hàng / Tổ chức tín dụng" : (type === "RECEIVABLE" ? "Tên khách hàng" : "Tên nhà cung cấp")} <span className="text-danger">*</span>
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

              <div className="mb-3">
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

            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Tài chính & Thời hạn</label>
              
              <div className="row g-2 mb-3">
                <div className={type === "LOAN" ? "col-12" : "col-6"}>
                  <label className="form-label" style={labelStyle}>Số tiền gốc (đồng) <span className="text-danger">*</span></label>
                  <CurrencyInput
                    className="form-control"
                    value={formData.amount}
                    onChange={val => setFormData({ ...formData, amount: val })}
                    style={inputStyle}
                  />
                </div>
                {type !== "LOAN" && (
                  <div className="col-6">
                    <label className="form-label" style={labelStyle}>Đã thanh toán (đồng)</label>
                    <CurrencyInput
                      className="form-control"
                      value={formData.paidAmount}
                      onChange={val => setFormData({ ...formData, paidAmount: val })}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              {type === "LOAN" && (
                <div className="mb-3">
                  <label className="form-label" style={labelStyle}>Lãi suất (% / năm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={formData.interestRate ?? ""}
                    onChange={e => setFormData({ ...formData, interestRate: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>{type === "LOAN" ? "Ngày đáo hạn" : "Ngày đến hạn"}</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông tin thêm</label>
              
              <div className="mb-3">
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

              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Ghi chú / Diễn giải</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Nội dung chi tiết..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ ...inputStyle, resize: "none" }}
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
