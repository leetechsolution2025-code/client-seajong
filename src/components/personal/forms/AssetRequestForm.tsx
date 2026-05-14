"use client";

import React, { useState } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface AssetRequestFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function AssetRequestForm({ onSubmit, loading }: AssetRequestFormProps) {
  const [formData, setFormData] = useState({
    assetType: "Thiết bị CNTT",
    assetName: "",
    quantity: "1",
    priority: "Thường",
    expectedDate: "",
    reason: "",
    urgency: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: "asset",
      startDate: formData.expectedDate,
      endDate: formData.expectedDate,
      reason: formData.reason,
      details: {
        assetType: formData.assetType,
        assetName: formData.assetName,
        quantity: parseInt(formData.quantity),
        priority: formData.urgency ? "Khẩn cấp" : formData.priority,
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
            <SectionTitle title="Loại tài sản" className="mb-1" />
            <select 
              className="form-select shadow-none" 
              style={inputStyle} 
              value={formData.assetType}
              onChange={e => setFormData({...formData, assetType: e.target.value})}
            >
              <option>Thiết bị CNTT (Laptop, PC, Màn hình...)</option>
              <option>Văn phòng phẩm</option>
              <option>Nội thất văn phòng</option>
              <option>Thiết bị ngoại vi (Chuột, Bàn phím...)</option>
              <option>Khác</option>
            </select>
          </div>

          <div className="col-12">
            <SectionTitle title="Tên tài sản yêu cầu" className="mb-1" />
            <input 
              className="form-control shadow-none" 
              style={inputStyle} 
              value={formData.assetName}
              onChange={e => setFormData({...formData, assetName: e.target.value})}
              placeholder="Ví dụ: Laptop Dell XPS 13, Bàn phím cơ..."
              required 
            />
          </div>

          <div className="col-md-6">
            <SectionTitle title="Số lượng" className="mb-1" />
            <input 
              type="number" 
              min="1"
              className="form-control shadow-none" 
              style={inputStyle} 
              value={formData.quantity}
              onChange={e => setFormData({...formData, quantity: e.target.value})}
              required 
            />
          </div>

          <div className="col-md-6">
            <SectionTitle title="Ngày cần sử dụng" className="mb-1" />
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

          <div className="col-12">
            <div className="form-check form-switch py-2 px-0 d-flex align-items-center">
              <input 
                className="form-check-input ms-0" 
                type="checkbox" 
                id="urgency" 
                checked={formData.urgency}
                onChange={e => setFormData({...formData, urgency: e.target.checked})}
                style={{ cursor: "pointer", width: "36px", height: "18px" }}
              />
              <label className="form-check-label ms-3 fw-semibold" htmlFor="urgency" style={{ fontSize: "14px", cursor: "pointer", color: formData.urgency ? "var(--danger)" : "var(--foreground)" }}>
                Yêu cầu khẩn cấp
              </label>
            </div>
          </div>
        </div>

        <div className="d-flex flex-column flex-grow-1 overflow-hidden mt-1">
          <SectionTitle title="Mục đích sử dụng và Ghi chú" className="mb-1" />
          <textarea 
            className="form-control shadow-none flex-grow-1" 
            style={{ ...inputStyle, resize: "none", minHeight: "100px" }} 
            value={formData.reason}
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="Giải trình lý do cần cấp phát tài sản..."
            required
          ></textarea>
        </div>
      </form>
    </div>
  );
}
