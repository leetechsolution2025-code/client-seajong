"use client";

import React, { useState } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface OvertimeFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function OvertimeForm({ onSubmit, loading }: OvertimeFormProps) {
  const [formData, setFormData] = useState({
    date: "",
    hours: "2",
    reason: "",
    isHoliday: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: "overtime",
      startDate: formData.date,
      endDate: formData.date,
      totalHours: parseFloat(formData.hours),
      reason: formData.reason,
      details: {
        isHoliday: formData.isHoliday,
      },
    });
  };

  const inputStyle = {
    borderRadius: "12px", padding: "10px 15px", border: "1px solid var(--border)",
    background: "var(--background)", color: "var(--foreground)",
    fontSize: "14px", transition: "all 0.2s"
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden">
      <form id="personal-request-form" onSubmit={handleSubmit} className="flex-grow-1 d-flex flex-column gap-4 overflow-hidden">
        <div className="row g-3 flex-shrink-0">
          <div className="col-md-6">
            <SectionTitle title="Ngày làm thêm" className="mb-1" />
            <input 
              type="date" 
              className="form-control shadow-none" 
              style={inputStyle} 
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              required 
            />
          </div>

          <div className="col-md-6">
            <SectionTitle title="Số giờ dự kiến" className="mb-1" />
            <input 
              type="number" 
              step="0.5"
              className="form-control shadow-none" 
              style={inputStyle} 
              value={formData.hours}
              onChange={e => setFormData({...formData, hours: e.target.value})}
              required 
            />
          </div>

          <div className="col-12">
            <div className="form-check form-switch py-2 px-0 d-flex align-items-center">
              <input 
                className="form-check-input ms-0" 
                type="checkbox" 
                id="isHoliday" 
                checked={formData.isHoliday}
                onChange={e => setFormData({...formData, isHoliday: e.target.checked})}
                style={{ cursor: "pointer", width: "36px", height: "18px" }}
              />
              <label className="form-check-label ms-3 fw-semibold" htmlFor="isHoliday" style={{ fontSize: "14px", cursor: "pointer", color: "var(--foreground)" }}>
                Làm thêm vào ngày lễ và ngày nghỉ
              </label>
            </div>
          </div>
        </div>

        <div className="d-flex flex-column flex-grow-1 overflow-hidden mt-2">
          <SectionTitle title="Nội dung công việc" className="mb-1" />
          <textarea 
            className="form-control shadow-none flex-grow-1" 
            style={{ ...inputStyle, resize: "none", minHeight: "100px" }} 
            value={formData.reason}
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="Mô tả công việc cần làm thêm..."
            required
          ></textarea>
        </div>
      </form>
    </div>
  );
}
