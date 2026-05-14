"use client";

import React, { useState } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface BusinessTripFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function BusinessTripForm({ onSubmit, loading }: BusinessTripFormProps) {
  const [formData, setFormData] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    purpose: "",
    transport: "Máy bay",
    advanceAmount: "0",
    hasAdvance: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: "business-trip",
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.purpose,
      details: {
        destination: formData.destination,
        transport: formData.transport,
        advanceAmount: formData.hasAdvance ? parseFloat(formData.advanceAmount) : 0,
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
            <SectionTitle title="Địa điểm công tác" className="mb-1" />
            <input 
              className="form-control shadow-none" 
              style={inputStyle} 
              value={formData.destination}
              onChange={e => setFormData({...formData, destination: e.target.value})}
              placeholder="Ví dụ: TP. Hồ Chí Minh, Chi nhánh Đà Nẵng..."
              required 
            />
          </div>

          <div className="col-md-6">
            <SectionTitle title="Từ ngày" className="mb-1" />
            <input 
              type="date" 
              className="form-control shadow-none" 
              style={inputStyle} 
              value={formData.startDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setFormData({...formData, startDate: e.target.value})}
              required 
            />
          </div>

          <div className="col-md-6">
            <SectionTitle title="Đến ngày" className="mb-1" />
            <input 
              type="date" 
              className="form-control shadow-none" 
              style={inputStyle} 
              value={formData.endDate}
              min={formData.startDate || new Date().toISOString().split('T')[0]}
              onChange={e => setFormData({...formData, endDate: e.target.value})}
              required 
            />
          </div>

          <div className="col-md-6">
            <SectionTitle title="Phương tiện" className="mb-1" />
            <select 
              className="form-select shadow-none" 
              style={inputStyle} 
              value={formData.transport}
              onChange={e => setFormData({...formData, transport: e.target.value})}
            >
              <option>Máy bay</option>
              <option>Tàu hỏa</option>
              <option>Xe khách</option>
              <option>Xe công ty</option>
              <option>Phương tiện cá nhân</option>
            </select>
          </div>

          <div className="col-md-6">
            <SectionTitle title="Tạm ứng kinh phí" className="mb-1" />
            <div className="d-flex align-items-center h-100 mt-1">
              <div className="form-check form-switch d-flex align-items-center">
                <input 
                  className="form-check-input ms-0" 
                  type="checkbox" 
                  id="hasAdvance" 
                  checked={formData.hasAdvance}
                  onChange={e => setFormData({...formData, hasAdvance: e.target.checked})}
                  style={{ cursor: "pointer", width: "36px", height: "18px" }}
                />
                <label className="form-check-label ms-2 fw-semibold" htmlFor="hasAdvance" style={{ fontSize: "13px", cursor: "pointer" }}>
                  Tạm ứng
                </label>
              </div>
            </div>
          </div>

          {formData.hasAdvance && (
            <div className="col-12">
              <div className="input-group">
                <input 
                  type="number" 
                  className="form-control shadow-none" 
                  style={inputStyle} 
                  value={formData.advanceAmount}
                  onChange={e => setFormData({...formData, advanceAmount: e.target.value})}
                  placeholder="Nhập số tiền..."
                />
                <span className="input-group-text bg-light" style={{ borderRadius: "0 12px 12px 0", border: "1px solid var(--border)", borderLeft: "none" }}>VNĐ</span>
              </div>
            </div>
          )}
        </div>

        <div className="d-flex flex-column flex-grow-1 overflow-hidden mt-1">
          <SectionTitle title="Mục đích công tác" className="mb-1" />
          <textarea 
            className="form-control shadow-none flex-grow-1" 
            style={{ ...inputStyle, resize: "none", minHeight: "100px" }} 
            value={formData.purpose}
            onChange={e => setFormData({...formData, purpose: e.target.value})}
            placeholder="Mô tả chi tiết kế hoạch và mục đích chuyến công tác..."
            required
          ></textarea>
        </div>
      </form>
    </div>
  );
}
