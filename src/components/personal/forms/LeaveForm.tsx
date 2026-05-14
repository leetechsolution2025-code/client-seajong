"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface LeaveFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

interface LeaveBalance {
  total: number;
  used: number;
  remaining: number;
}

export function LeaveForm({ onSubmit, loading }: LeaveFormProps) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  
  const [formData, setFormData] = useState({
    leaveType: "Phép năm",
    startDate: "",
    endDate: "",
    startHalf: "full", // full, morning, afternoon
    endHalf: "full",
    reason: "",
  });

  useEffect(() => {
    fetch("/api/my/leave-balance")
      .then(r => r.json())
      .then(data => {
        console.log("Leave Balance Data:", data);
        if (data.error) {
          console.error("API Error:", data.error, data.message);
        } else {
          setBalance(data);
        }
        setFetchingBalance(false);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        setFetchingBalance(false);
      });
  }, []);

  const totalDays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (start > end) return 0;
    
    // Simple diff in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    let total = diffDays;
    
    // Adjust for half days
    if (formData.startHalf !== "full") total -= 0.5;
    if (formData.endHalf !== "full" && diffDays > 1) total -= 0.5;
    
    // Special case for same day half-day
    if (diffDays === 1 && formData.startHalf !== "full") {
        total = 0.5;
    }

    return total;
  }, [formData.startDate, formData.endDate, formData.startHalf, formData.endHalf]);

  const isOutOfLeave = !!(balance && formData.leaveType === "Phép năm" && balance.remaining <= 0);
  const canSubmit = !isOutOfLeave && totalDays > 0 && !loading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      type: "leave",
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalDays: totalDays,
      reason: formData.reason,
      details: {
        leaveType: formData.leaveType,
        startHalf: formData.startHalf,
        endHalf: formData.endHalf,
      },
    });
  };

  const inputStyle = {
    borderRadius: "12px", padding: "10px 15px", border: "1px solid var(--border)",
    background: "var(--background)", color: "var(--foreground)",
    fontSize: "14px", transition: "all 0.2s"
  };
  
  const labelStyle = {
    fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", 
    marginBottom: "4px", display: "block", textTransform: "uppercase" as const
  };

  return (
    <div className="d-flex flex-column h-100 gap-4 overflow-hidden">
      {/* Leave Balance Info */}
      <div className="p-3 rounded-4 flex-shrink-0" style={{ background: "var(--accent-background)", border: "1px solid var(--border)" }}>
        <SectionTitle title="Quỹ phép năm" className="mb-2" />
        <div className="row g-2 text-center">
            <div className="col-4">
                <div className="fw-bold text-primary h4 mb-0" style={{ fontWeight: 800 }}>{balance?.total ?? "--"}</div>
                <div className="small text-muted" style={{ fontSize: "10px" }}>TỔNG CỘNG</div>
            </div>
            <div className="col-4 border-start border-end">
                <div className="fw-bold text-danger h4 mb-0" style={{ fontWeight: 800 }}>{balance?.used ?? "--"}</div>
                <div className="small text-muted" style={{ fontSize: "10px" }}>ĐÃ DÙNG</div>
            </div>
            <div className="col-4">
                <div className="fw-bold text-success h4 mb-0" style={{ fontWeight: 800 }}>{balance?.remaining ?? "--"}</div>
                <div className="small text-muted" style={{ fontSize: "10px" }}>CÒN LẠI</div>
            </div>
        </div>
      </div>

      {isOutOfLeave && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 flex-shrink-0" style={{ fontSize: "13px" }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            <span>Bạn đã hết ngày phép năm. Không thể tạo thêm yêu cầu này.</span>
        </div>
      )}

      <form id="personal-request-form" onSubmit={handleSubmit} className="flex-grow-1 d-flex flex-column gap-3 overflow-hidden">
        <div className="row g-3 flex-shrink-0">
          <div className="col-12">
            <SectionTitle title="Loại nghỉ phép" className="mb-1" />
            <select 
              className="form-select shadow-none" 
              style={inputStyle} 
              value={formData.leaveType}
              onChange={e => setFormData({...formData, leaveType: e.target.value})}
              required
              disabled={isOutOfLeave}
            >
              <option>Phép năm</option>
              <option>Nghỉ ốm (có BHXH)</option>
              <option>Nghỉ việc riêng (có lương)</option>
              <option>Nghỉ không lương</option>
            </select>
          </div>

          <div className="col-md-6">
            <SectionTitle title="Từ ngày" className="mb-1" />
            <input 
              type="date" 
              className="form-control shadow-none" 
              style={inputStyle} 
              value={formData.startDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => {
                const newStart = e.target.value;
                setFormData((prev: any) => ({
                  ...prev, 
                  startDate: newStart,
                  endDate: prev.endDate && prev.endDate < newStart ? newStart : prev.endDate
                }));
              }}
              required 
              disabled={isOutOfLeave}
            />
            <div className="mt-2 d-flex gap-2">
              {["full", "morning", "afternoon"].map(val => (
                <button 
                  key={val}
                  type="button"
                  className={`btn btn-xs py-1 px-2 rounded-pill ${formData.startHalf === val ? 'btn-primary shadow-sm' : 'btn-outline-secondary text-muted border-0'}`}
                  style={{ fontSize: "10px" }}
                  onClick={() => setFormData({...formData, startHalf: val})}
                  disabled={isOutOfLeave}
                >
                  {val === 'full' ? 'Cả ngày' : val === 'morning' ? 'Sáng' : 'Chiều'}
                </button>
              ))}
            </div>
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
              disabled={isOutOfLeave}
            />
            <div className="mt-2 d-flex gap-2">
              {["full", "morning", "afternoon"].map(val => (
                <button 
                  key={val}
                  type="button"
                  className={`btn btn-xs py-1 px-2 rounded-pill ${formData.endHalf === val ? 'btn-primary shadow-sm' : 'btn-outline-secondary text-muted border-0'}`}
                  style={{ fontSize: "10px" }}
                  onClick={() => setFormData({...formData, endHalf: val})}
                  disabled={isOutOfLeave || formData.startDate === formData.endDate}
                >
                  {val === 'full' ? 'Cả ngày' : val === 'morning' ? 'Sáng' : 'Chiều'}
                </button>
              ))}
            </div>
          </div>

          {totalDays > 0 && (
            <div className="col-12">
                <div className="d-flex align-items-center gap-2 p-2 px-3 rounded-3" style={{ background: "var(--primary)10", color: "var(--primary)", border: "1px dashed var(--primary)" }}>
                    <i className="bi bi-info-circle-fill"></i>
                    <span className="fw-bold small">Tổng cộng: {totalDays} ngày nghỉ</span>
                </div>
            </div>
          )}
        </div>

        <div className="d-flex flex-column flex-grow-1 overflow-hidden mt-2">
          <SectionTitle title="Lý do nghỉ" className="mb-1" />
          <textarea 
            className="form-control shadow-none flex-grow-1" 
            style={{ ...inputStyle, resize: "none", minHeight: "100px" }} 
            value={formData.reason}
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="Nhập lý do chi tiết..."
            required
            disabled={isOutOfLeave}
          ></textarea>
        </div>
      </form>
    </div>
  );
}
