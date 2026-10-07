"use client";

import React, { useState, useMemo } from "react";

interface LateEarlyFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function LateEarlyForm({ initialData, onSubmit, loading }: LateEarlyFormProps) {
  const details = useMemo(() => {
    if (!initialData) return {};
    return typeof initialData.details === "string" 
      ? JSON.parse(initialData.details || "{}") 
      : (initialData.details || {});
  }, [initialData]);

  const [formData, setFormData] = useState(() => ({
    type: details.requestType || (initialData?.type === "early" ? "Về sớm" : "Đi muộn"),
    date: initialData?.startDate 
      ? new Date(initialData.startDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0],
    time: details.time || "08:30",
    minutes: details.minutes ? String(details.minutes) : "30",
    reason: details.reason || initialData?.reason || "",
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      alert("Vui lòng nhập lý do đi muộn / về sớm");
      return;
    }

    const typeKey = formData.type === "Đi muộn" ? "late" : "early";

    onSubmit({
      type: typeKey,
      startDate: formData.date,
      endDate: formData.date,
      reason: formData.reason,
      details: {
        category: "late_early",
        requestType: formData.type,
        date: formData.date,
        time: formData.time,
        minutes: formData.minutes,
        reason: formData.reason,
      },
    });
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "var(--muted-foreground)",
    textTransform: "uppercase" as const,
    marginBottom: "6px",
    display: "block",
  };

  const inputStyle = {
    borderRadius: "8px",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    background: "var(--background)",
    color: "var(--foreground)",
    fontSize: "13.5px",
    transition: "all 0.2s",
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      {/* Tab chuyển đổi: Đi muộn vs Về sớm */}
      <div 
        className="d-flex p-1 mb-3 rounded-3 flex-shrink-0"
        style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
      >
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: "Đi muộn", time: "08:30" })}
          className="btn flex-fill py-1.5 d-flex align-items-center justify-content-center gap-2"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            borderRadius: "8px",
            border: "none",
            background: formData.type === "Đi muộn" ? "var(--card)" : "transparent",
            color: formData.type === "Đi muộn" ? "#d97706" : "var(--muted-foreground)",
            boxShadow: formData.type === "Đi muộn" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}
        >
          <i className="bi bi-clock-history text-warning"></i>
          <span>Đi muộn</span>
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: "Về sớm", time: "16:30" })}
          className="btn flex-fill py-1.5 d-flex align-items-center justify-content-center gap-2"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            borderRadius: "8px",
            border: "none",
            background: formData.type === "Về sớm" ? "var(--card)" : "transparent",
            color: formData.type === "Về sớm" ? "#ea580c" : "var(--muted-foreground)",
            boxShadow: formData.type === "Về sớm" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}
        >
          <i className="bi bi-box-arrow-right text-danger"></i>
          <span>Về sớm</span>
        </button>
      </div>

      <form id="personal-request-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1">
        <div className="flex-shrink-0">
          {/* Ngày đăng ký & Giờ dự kiến */}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label style={labelStyle}>Ngày đăng ký</label>
              <input
                type="date"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="col-6">
              <label style={labelStyle}>
                {formData.type === "Đi muộn" ? "Giờ dự kiến đến" : "Giờ dự kiến rời khỏi"}
              </label>
              <input
                type="time"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Thời gian chênh lệch (Số phút) */}
          <div className="mb-3">
            <label style={labelStyle}>
              {formData.type === "Đi muộn" ? "Số phút đi muộn (ước tính)" : "Số phút về sớm (ước tính)"}
            </label>
            <div className="input-group">
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                className="form-control shadow-none fw-bold"
                style={{
                  ...inputStyle,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  fontSize: "14px",
                }}
                value={formData.minutes}
                onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                required
              />
              <span
                className="input-group-text bg-light text-muted fw-semibold"
                style={{
                  borderColor: "var(--border)",
                  borderTopRightRadius: "8px",
                  borderBottomRightRadius: "8px",
                  fontSize: "13px",
                  padding: "0 12px",
                }}
              >
                phút
              </span>
            </div>
            {/* Gợi ý chọn nhanh */}
            <div className="d-flex gap-1.5 mt-1.5">
              {["15", "30", "45", "60", "120"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFormData({ ...formData, minutes: m })}
                  className="btn btn-sm py-0.5 px-2 rounded-2"
                  style={{
                    fontSize: "11.5px",
                    background: formData.minutes === m ? "var(--primary)15" : "var(--muted)",
                    color: formData.minutes === m ? "var(--primary)" : "var(--muted-foreground)",
                    border: formData.minutes === m ? "1px solid var(--primary)" : "1px solid transparent",
                  }}
                >
                  {m}p
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lý do chi tiết: TỰ ĐỘNG CHIẾM HẾT CHIỀU CAO KHẢ DỤNG */}
        <div className="d-flex flex-column flex-grow-1 mb-0 mt-1">
          <label style={labelStyle}>
            {formData.type === "Đi muộn" ? "Lý do đi muộn" : "Lý do về sớm"}
          </label>
          <textarea
            className="form-control shadow-none flex-grow-1 w-100"
            style={{
              ...inputStyle,
              resize: "none",
              minHeight: "120px",
              height: "100%",
            }}
            placeholder={
              formData.type === "Đi muộn"
                ? "Nhập lý do đi muộn chi tiết (kẹt xe, việc gia đình đột xuất, phương tiện hỏng hóc...)"
                : "Nhập lý do về sớm chi tiết (khám bệnh định kỳ, việc gia đình gấp, đi công việc đối tác...)"
            }
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            required
          />
        </div>
      </form>
    </div>
  );
}
