"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface ReceivableOpeningBalanceOffcanvasProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function ReceivableOpeningBalanceOffcanvas({ open, onClose, onSuccess, initialData }: ReceivableOpeningBalanceOffcanvasProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    customerId: "",
    amount: 0,
    paidAmount: 0,
    dueDate: new Date().toISOString().split("T")[0],
    createdAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
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

  const selectSuggestion = (name: string, id: string) => {
    setFormData({ ...formData, partnerName: name, customerId: id });
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
          type: "RECEIVABLE"
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

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Mã khách hàng (*)", "Tên khách hàng (*)", "Mã tham chiếu", "Số dư nợ cũ (*)", "Ngày khởi tạo (YYYY-MM-DD)", "Ngày đến hạn (YYYY-MM-DD)", "Ghi chú"]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DuNoCu");
    XLSX.writeFile(wb, "Template_NhapDuNoCu.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImporting(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        // Skip header
        const rows = data.slice(1).filter(r => r.length > 0);
        let successCount = 0;
        let errorCount = 0;

        const debtsToImport = [];

        for (const row of rows) {
          const [customerCode, partnerName, ref, amount, createdAtStr, dueDateStr, note] = row;
          if (!customerCode || !amount) {
            errorCount++;
            continue;
          }

          let formattedCreatedAt = new Date().toISOString();
          if (createdAtStr) {
             const pd = Date.parse(createdAtStr);
             if (!isNaN(pd)) formattedCreatedAt = new Date(pd).toISOString();
          }

          let formattedDueDate = null;
          if (dueDateStr) {
             const pd = Date.parse(dueDateStr);
             if (!isNaN(pd)) formattedDueDate = new Date(pd).toISOString();
          }

          debtsToImport.push({
            customerCode: String(customerCode).trim(),
            partnerName: partnerName ? String(partnerName).trim() : String(customerCode).trim(),
            referenceId: ref ? String(ref).trim() : "Dư nợ đầu kỳ",
            amount: Number(amount) || 0,
            createdAt: formattedCreatedAt,
            dueDate: formattedDueDate,
            description: note ? String(note).trim() : ""
          });
        }

        if (debtsToImport.length > 0) {
          const res = await fetch("/api/finance/debts-v2/bulk-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "RECEIVABLE",
              clearOld: true,
              debts: debtsToImport
            })
          });

          if (res.ok) {
            const result = await res.json();
            successCount = result.successCount || 0;
            const deleted = result.deletedCount || 0;
            success("Thành công", `Đã xoá ${deleted} dư nợ cũ và nhập mới ${successCount} khách hàng`);
            onSuccess();
            onClose();
          } else {
            error("Lỗi", `Không thể import dữ liệu từ API.`);
          }
        } else {
          error("Lỗi", "File không có dữ liệu hợp lệ.");
        }


      } catch (err) {
        error("Lỗi import", "Đã xảy ra lỗi khi đọc file Excel.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  if (!mounted) return null;

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 };
  const inputStyle = { fontSize: 13, borderRadius: 8 };

  const getTitle = () => {
    return initialData ? "Sửa dư nợ cũ khách hàng" : "Nhập dư nợ cũ khách hàng";
  };

  const getThemeColor = () => {
    return "success";
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
            <i className={`bi bi-arrow-down-left-circle fs-4 text-${getThemeColor()}`} />
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 17, letterSpacing: -0.2 }}>
              {getTitle()}
            </h5>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto d-flex flex-column">
          <form id="debt-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1">
            <div className="mb-4">
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông tin đối tác</label>
              
              <div className="mb-3" ref={suggestionsRef}>
                <label className="form-label" style={labelStyle}>
                  Tên khách hàng <span className="text-danger">*</span>
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
                          onClick={() => selectSuggestion(c.name, c.id)}
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
              
              <div className="mb-3">
                <label className="form-label" style={labelStyle}>Số dư nợ cũ (đồng) <span className="text-danger">*</span></label>
                <CurrencyInput
                  className="form-control"
                  value={formData.amount}
                  onChange={val => setFormData({ ...formData, amount: val })}
                  style={inputStyle}
                />
              </div>

              <div className="row g-2 mb-3">
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
                  <label className="form-label" style={labelStyle}>Ngày đến hạn</label>
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
              <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông tin thêm</label>

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
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
          />
          <div className="d-flex align-items-center gap-2">
            {!initialData && (
              <div className="d-flex gap-2 me-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                  style={{ width: 40, height: 40, borderRadius: 8, padding: 0 }}
                  title="Tải file mẫu Excel"
                  onClick={handleDownloadTemplate}
                  disabled={loading || importing}
                >
                  <i className="bi bi-download"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success d-flex align-items-center justify-content-center"
                  style={{ width: 40, height: 40, borderRadius: 8, padding: 0 }}
                  title="Nhập dữ liệu từ Excel"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || importing}
                >
                  {importing ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-file-earmark-excel"></i>
                  )}
                </button>
              </div>
            )}
            
            <BrandButton
              variant="outline"
              className="flex-grow-1 py-2"
              onClick={onClose}
              disabled={loading || importing}
              style={{ fontSize: 13 }}
            >
              Hủy bỏ
            </BrandButton>
            <BrandButton
              type="submit"
              form="debt-form"
              className="flex-grow-1 py-2"
              loading={loading || importing}
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
