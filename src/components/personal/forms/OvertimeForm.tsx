"use client";

import React, { useState, useMemo } from "react";

interface OvertimeFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function OvertimeForm({ initialData, onSubmit, loading }: OvertimeFormProps) {
  const details = useMemo(() => {
    if (!initialData) return {};
    return typeof initialData.details === "string" 
      ? JSON.parse(initialData.details || "{}") 
      : (initialData.details || {});
  }, [initialData]);

  const [formData, setFormData] = useState(() => ({
    date: initialData?.startDate 
      ? new Date(initialData.startDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0],
    startTime: details.startTime || "17:30",
    endTime: details.endTime || "20:30",
    overtimeType: details.overtimeType || "weekday",
    reason: details.reason || initialData?.reason || "",
  }));

  // Tự động tính số giờ OT
  const { totalHours, totalMinutes } = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return { totalHours: 0, totalMinutes: 0 };
    const [startH, startM] = formData.startTime.split(":").map(Number);
    const [endH, endM] = formData.endTime.split(":").map(Number);

    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    // Nếu qua đêm
    if (endTotal < startTotal) {
      endTotal += 24 * 60;
    }

    const diffMinutes = Math.max(0, endTotal - startTotal);
    const hours = Math.round((diffMinutes / 60) * 10) / 10;
    return { totalHours: hours, totalMinutes: diffMinutes };
  }, [formData.startTime, formData.endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalHours <= 0) {
      alert("Vui lòng chọn khung giờ làm thêm hợp lệ");
      return;
    }
    if (!formData.reason.trim()) {
      alert("Vui lòng nhập nội dung công việc làm thêm giờ");
      return;
    }

    const typeLabels: Record<string, string> = {
      weekday: "Ngày thường",
      weekend: "Cuối tuần",
      holiday: "Ngày lễ, ngày tết",
    };

    const typeDesc = typeLabels[formData.overtimeType] || "Làm thêm";

    onSubmit({
      type: "overtime",
      startDate: formData.date,
      endDate: formData.date,
      totalHours: totalHours,
      reason: formData.reason,
      details: {
        category: "overtime",
        requestType: "Làm thêm giờ",
        overtimeType: formData.overtimeType,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        totalHours: totalHours,
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

  // Chọn nhanh thời gian OT
  const setQuickHours = (hours: number) => {
    const [startH, startM] = formData.startTime.split(":").map(Number);
    let endTotal = startH * 60 + startM + hours * 60;
    if (endTotal >= 24 * 60) endTotal -= 24 * 60;
    const endH = String(Math.floor(endTotal / 60)).padStart(2, "0");
    const endM = String(endTotal % 60).padStart(2, "0");
    setFormData(prev => ({ ...prev, endTime: `${endH}:${endM}` }));
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      {/* Card thông tin quy định làm thêm giờ */}
      <div
        className="p-3 mb-3 rounded-3 flex-shrink-0 border"
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.06) 100%)",
          borderColor: "rgba(16, 185, 129, 0.25)",
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-1.5 pb-1 border-bottom border-light-subtle">
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ width: 24, height: 24, background: "#10b98115", color: "#10b981" }}
            >
              <i className="bi bi-stopwatch-fill" style={{ fontSize: "12px" }}></i>
            </div>
            <span className="fw-bold text-dark" style={{ fontSize: "12px", letterSpacing: "0.3px" }}>
              QUY ĐỊNH LÀM THÊM GIỜ
            </span>
          </div>
          <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "10.5px" }}>
            Cần duyệt trước
          </span>
        </div>
        <div className="text-muted mt-1" style={{ fontSize: "11.5px", lineHeight: 1.4 }}>
          Thời gian làm thêm giờ chỉ được hệ thống ghi nhận tính công/thù lao khi yêu cầu được cấp trên phê duyệt trước.
        </div>
      </div>

      <form id="personal-request-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1">
        <div className="flex-shrink-0">
          {/* Ngày làm thêm & Loại ngày */}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label style={labelStyle}>Ngày làm thêm</label>
              <input
                type="date"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="col-6">
              <label style={labelStyle}>Loại ngày</label>
              <select
                className="form-select shadow-none"
                style={inputStyle}
                value={formData.overtimeType}
                onChange={e => setFormData({ ...formData, overtimeType: e.target.value })}
              >
                <option value="weekday">Ngày thường</option>
                <option value="weekend">Chủ nhật </option>
                <option value="holiday">Ngày lễ, ngày tết </option>
              </select>
            </div>
          </div>

          {/* Khung giờ: Từ giờ - Đến giờ */}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label style={labelStyle}>Từ giờ</label>
              <input
                type="time"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="col-6">
              <label style={labelStyle}>Đến giờ</label>
              <input
                type="time"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Gợi ý chọn nhanh thời gian */}
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-1.5">
              <label style={{ ...labelStyle, marginBottom: 0 }}>Gợi ý thời lượng</label>
              <span className="text-muted" style={{ fontSize: "11px" }}>Bấm chọn nhanh</span>
            </div>
            <div className="d-flex gap-2">
              {[1, 2, 3, 4].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setQuickHours(h)}
                  className="btn flex-fill py-1 px-2 rounded-2 text-center"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    background: totalHours === h ? "var(--primary)15" : "var(--background)",
                    color: totalHours === h ? "var(--primary)" : "var(--muted-foreground)",
                    border: totalHours === h ? "1px solid var(--primary)" : "1px solid var(--border)",
                  }}
                >
                  +{h} giờ
                </button>
              ))}
            </div>
          </div>

          {/* Banner tính tổng số giờ OT */}
          <div
            className="d-flex align-items-center justify-content-between p-2.5 px-3 mb-3 rounded-3"
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-clock-history fs-5 text-success"></i>
              <div>
                <span className="fw-bold" style={{ fontSize: "13px" }}>
                  Tổng làm thêm: {totalHours} giờ
                </span>
                <span className="text-muted small ms-1" style={{ fontSize: "11px" }}>
                  ({totalMinutes} phút)
                </span>
              </div>
            </div>
            <span className="badge bg-white text-success border border-success-subtle font-monospace" style={{ fontSize: "11px" }}>
              {formData.overtimeType === "weekday" ? "x1.5 lương" : formData.overtimeType === "weekend" ? "x2.0 lương" : "x3.0 lương"}
            </span>
          </div>
        </div>

        {/* Nội dung công việc làm thêm giờ: TỰ ĐỘNG CHIẾM HẾT CHIỀU CAO KHẢ DỤNG */}
        <div className="d-flex flex-column flex-grow-1 mb-0 mt-1">
          <label style={labelStyle}>Nội dung công việc làm thêm</label>
          <textarea
            className="form-control shadow-none flex-grow-1 w-100"
            style={{
              ...inputStyle,
              resize: "none",
              minHeight: "100px",
              height: "100%",
            }}
            placeholder="Nhập nội dung công việc cụ thể cần làm thêm giờ (vd: hoàn thiện bản vẽ kỹ thuật, tăng ca đóng gói xuất kho...)"
            value={formData.reason}
            onChange={e => setFormData({ ...formData, reason: e.target.value })}
            required
          />
        </div>
      </form>
    </div>
  );
}
