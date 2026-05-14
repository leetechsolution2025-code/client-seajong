"use client";

import React, { useState } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface FinanceRequestFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function FinanceRequestForm({ onSubmit, loading }: FinanceRequestFormProps) {
  const [formData, setFormData] = useState({
    financeType: "Tạm ứng",
    amount: "0",
    paymentMethod: "Chuyển khoản",
    bankInfo: "",
    reason: "",
    expectedDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: "finance",
      startDate: formData.expectedDate,
      endDate: formData.expectedDate,
      reason: formData.reason,
      details: {
        financeType: formData.financeType,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        bankInfo: formData.paymentMethod === "Chuyển khoản" ? formData.bankInfo : "Tiền mặt",
      }
    });
  };

  const inputStyle = {
    borderRadius: "12px", padding: "10px 15px", border: "1px solid var(--border)",
    background: "var(--background)", color: "var(--foreground)",
    fontSize: "14px", transition: "all 0.2s"
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden">
      <form id="personal-request-form" onSubmit={handleSubmit} className="flex-grow-1 d-flex flex-column gap-3 overflow-hidden">
        <div className="row g-3 flex-shrink-0">
          <div className="col-12">
            <SectionTitle title="Loại yêu cầu tài chính" className="mb-1" />
            <select 
              className="form-select shadow-none" 
              style={inputStyle} 
              value={formData.financeType}
              onChange={e => setFormData({...formData, financeType: e.target.value})}
            >
              <option>Tạm ứng kinh phí</option>
              <option>Thanh toán / Hoàn ứng</option>
              <option>Đề nghị chi (Mua sắm/Dịch vụ)</option>
              <option>Khác</option>
            </select>
          </div>

          <div className="col-md-6">
            <SectionTitle title="Số tiền" className="mb-1" />
            <div className="input-group">
              <input 
                type="number" 
                className="form-control shadow-none" 
                style={inputStyle} 
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                required 
              />
              <span className="input-group-text bg-light" style={{ borderRadius: "0 12px 12px 0", border: "1px solid var(--border)", borderLeft: "none" }}>VNĐ</span>
            </div>
          </div>

          <div className="col-md-6">
            <SectionTitle title="Ngày cần nhận" className="mb-1" />
            <input 
              type="date" 
              className="form-control shadow-none" 
              style={inputStyle} 
              value={formData.expectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setFormData({...formData, expectedDate: e.target.value})}
              required 
            />
          </div>

          <div className="col-md-6">
            <SectionTitle title="Hình thức nhận" className="mb-1" />
            <div className="d-flex align-items-center gap-4 mt-2 h-100 pb-2">
              <div className="form-check d-flex align-items-center gap-2 mb-0">
                <input className="form-check-input mt-0 shadow-none" type="radio" name="paymentMethod" id="transfer" 
                  style={{ cursor: "pointer" }}
                  checked={formData.paymentMethod === "Chuyển khoản"}
                  onChange={() => setFormData({...formData, paymentMethod: "Chuyển khoản"})}
                />
                <label className="form-check-label small fw-medium mb-0" htmlFor="transfer" style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
                  Chuyển khoản
                </label>
              </div>
              <div className="form-check d-flex align-items-center gap-2 mb-0">
                <input className="form-check-input mt-0 shadow-none" type="radio" name="paymentMethod" id="cash" 
                  style={{ cursor: "pointer" }}
                  checked={formData.paymentMethod === "Tiền mặt"}
                  onChange={() => setFormData({...formData, paymentMethod: "Tiền mặt"})}
                />
                <label className="form-check-label small fw-medium mb-0" htmlFor="cash" style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
                  Tiền mặt
                </label>
              </div>
            </div>
          </div>

          {formData.paymentMethod === "Chuyển khoản" && (
            <div className="col-12">
              <SectionTitle title="Thông tin tài khoản" className="mb-1" />
              <input 
                className="form-control shadow-none" 
                style={inputStyle} 
                value={formData.bankInfo}
                onChange={e => setFormData({...formData, bankInfo: e.target.value})}
                placeholder="Số tài khoản - Ngân hàng - Chủ tài khoản..."
              />
            </div>
          )}
        </div>

        <div className="d-flex flex-column flex-grow-1 overflow-hidden mt-1">
          <SectionTitle title="Lý do và Nội dung chi tiết" className="mb-1" />
          <textarea 
            className="form-control shadow-none flex-grow-1" 
            style={{ ...inputStyle, resize: "none", minHeight: "100px" }} 
            value={formData.reason}
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="Giải trình mục đích sử dụng số tiền yêu cầu..."
            required
          ></textarea>
        </div>
      </form>
    </div>
  );
}
