"use client";

import React, { useState, useMemo } from "react";

interface SickLeaveFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function SickLeaveForm({ initialData, onSubmit, loading }: SickLeaveFormProps) {
  const details = useMemo(() => {
    if (!initialData) return {};
    return typeof initialData.details === "string" 
      ? JSON.parse(initialData.details || "{}") 
      : (initialData.details || {});
  }, [initialData]);

  const [formData, setFormData] = useState(() => ({
    sickType: details.sickType || "Nghỉ ốm bản thân (hưởng BHXH)",
    startDate: initialData?.startDate 
      ? new Date(initialData.startDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0],
    endDate: initialData?.endDate 
      ? new Date(initialData.endDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0],
    sessionType: details.sessionType || "full",
    startHalf: details.startHalf || "full",
    endHalf: details.endHalf || "full",
    medicalFacility: details.medicalFacility || "",
    reason: details.reason || initialData?.reason || "",
  }));

  const isSingleDay = formData.startDate === formData.endDate;

  const totalDays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (start > end) return 0;

    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays === 1) {
      if (formData.sessionType === "morning" || formData.sessionType === "afternoon") {
        return 0.5;
      }
      return 1;
    }

    let total = diffDays;
    if (formData.startHalf === "afternoon") total -= 0.5;
    if (formData.endHalf === "morning") total -= 0.5;
    return Math.max(0.5, total);
  }, [formData.startDate, formData.endDate, formData.sessionType, formData.startHalf, formData.endHalf]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      alert("Vui lòng chọn ngày bắt đầu và kết thúc");
      return;
    }
    if (totalDays <= 0) {
      alert("Khoảng thời gian nghỉ không hợp lệ");
      return;
    }

    const sessionDesc = isSingleDay
      ? (formData.sessionType === "morning" ? "Buổi sáng" : formData.sessionType === "afternoon" ? "Buổi chiều" : "Cả ngày")
      : `Từ ${formData.startHalf === "afternoon" ? "chiều" : "sáng"} ${formData.startDate} đến ${formData.endHalf === "morning" ? "trưa" : "hết ngày"} ${formData.endDate}`;

    onSubmit({
      type: "sick-leave",
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalDays: totalDays,
      reason: formData.reason,
      details: {
        category: "sick_leave",
        leaveType: "Nghỉ ốm có BHXH",
        sickType: formData.sickType,
        totalDays: totalDays,
        sessionType: isSingleDay ? formData.sessionType : undefined,
        startHalf: !isSingleDay ? formData.startHalf : undefined,
        endHalf: !isSingleDay ? formData.endHalf : undefined,
        medicalFacility: formData.medicalFacility || undefined,
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
      {/* Card thông tin chế độ nghỉ ốm */}
      <div
        className="p-3 mb-3 rounded-3 flex-shrink-0 border"
        style={{
          background: "linear-gradient(135deg, rgba(219, 39, 119, 0.04) 0%, rgba(244, 63, 94, 0.05) 100%)",
          borderColor: "rgba(219, 39, 119, 0.2)"
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-1.5 pb-1 border-bottom border-light-subtle">
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ width: 24, height: 24, background: "#db277715", color: "#db2777" }}
            >
              <i className="bi bi-heart-pulse-fill" style={{ fontSize: "12px" }}></i>
            </div>
            <span className="fw-bold text-dark" style={{ fontSize: "12px", letterSpacing: "0.3px" }}>
              CHẾ ĐỘ NGHỈ ỐM HƯỜNG BHXH
            </span>
          </div>
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: "10.5px" }}>
            Trợ cấp 75% lương
          </span>
        </div>
        <div className="text-muted mt-1" style={{ fontSize: "11.5px", lineHeight: 1.4 }}>
          Mức hưởng trợ cấp do cơ quan BHXH chi trả theo quy định. Bạn có thể bổ sung hồ sơ, giấy ra viện cho phòng Nhân sự sau khi đi làm trở lại.
        </div>
      </div>

      <form id="personal-request-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1">
        <div className="flex-shrink-0">
          {/* Trường hợp nghỉ ốm */}
          <div className="mb-3">
            <label style={labelStyle}>Trường hợp nghỉ ốm</label>
            <select
              className="form-select shadow-none"
              style={inputStyle}
              value={formData.sickType}
              onChange={e => setFormData({ ...formData, sickType: e.target.value })}
            >
              <option value="Nghỉ ốm bản thân">Bản thân ốm đau, điều trị bệnh</option>
              <option value="Nghỉ chăm con ốm">Chăm sóc con ốm đau dưới 7 tuổi</option>
              <option value="Nghỉ ốm đau ngắn ngày">Nghỉ ốm thông thường ngắn ngày</option>
            </select>
          </div>

          {/* Thời gian nghỉ: Từ ngày - Đến ngày */}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label style={labelStyle}>Từ ngày</label>
              <input
                type="date"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.startDate}
                onChange={e => {
                  const s = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    startDate: s,
                    endDate: prev.endDate && prev.endDate < s ? s : prev.endDate,
                  }));
                }}
                required
              />
            </div>

            <div className="col-6">
              <label style={labelStyle}>Đến ngày</label>
              <input
                type="date"
                className="form-control shadow-none"
                style={inputStyle}
                value={formData.endDate}
                min={formData.startDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Buổi nghỉ */}
          {isSingleDay ? (
            <div className="mb-3">
              <label style={labelStyle}>Buổi nghỉ trong ngày</label>
              <div className="d-flex gap-2">
                {[
                  { key: "full", label: "Cả ngày", icon: "bi-sun" },
                  { key: "morning", label: "Buổi sáng", icon: "bi-sunrise" },
                  { key: "afternoon", label: "Buổi chiều", icon: "bi-sunset" },
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFormData({ ...formData, sessionType: opt.key })}
                    className="btn flex-fill py-1.5 px-2 rounded-2 text-center"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      background: formData.sessionType === opt.key ? "var(--primary)15" : "var(--background)",
                      color: formData.sessionType === opt.key ? "var(--primary)" : "var(--muted-foreground)",
                      border: formData.sessionType === opt.key ? "1px solid var(--primary)" : "1px solid var(--border)",
                    }}
                  >
                    <i className={`bi ${opt.icon} me-1`}></i>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label style={labelStyle}>Buổi bắt đầu</label>
                <select
                  className="form-select shadow-none"
                  style={inputStyle}
                  value={formData.startHalf}
                  onChange={e => setFormData({ ...formData, startHalf: e.target.value })}
                >
                  <option value="full">Bắt đầu từ buổi sáng</option>
                  <option value="afternoon">Bắt đầu từ buổi chiều</option>
                </select>
              </div>

              <div className="col-6">
                <label style={labelStyle}>Buổi kết thúc</label>
                <select
                  className="form-select shadow-none"
                  style={inputStyle}
                  value={formData.endHalf}
                  onChange={e => setFormData({ ...formData, endHalf: e.target.value })}
                >
                  <option value="full">Kết thúc hết buổi chiều</option>
                  <option value="morning">Kết thúc hết buổi sáng</option>
                </select>
              </div>
            </div>
          )}

          {/* Banner tính tổng số ngày nghỉ */}
          <div
            className="d-flex align-items-center justify-content-between p-2.5 px-3 mb-3 rounded-3"
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#9f1239",
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-clock-history fs-5 text-danger"></i>
              <div>
                <span className="fw-bold" style={{ fontSize: "13px" }}>
                  Tổng thời gian nghỉ: {totalDays} ngày
                </span>
                <span className="text-muted small ms-1" style={{ fontSize: "11px" }}>
                  ({totalDays * 8} giờ)
                </span>
              </div>
            </div>
            <span className="badge bg-white text-danger border border-danger-subtle font-monospace" style={{ fontSize: "10.5px" }}>
              Hưởng BHXH
            </span>
          </div>

          {/* Cơ sở y tế / Bệnh viện điều trị */}
          <div className="mb-3">
            <label style={labelStyle}>Nơi khám chữa bệnh (nếu có)</label>
            <input
              type="text"
              className="form-control shadow-none"
              style={inputStyle}
              placeholder="Vd: Bệnh viện Bạch Mai, Phòng khám đa khoa..."
              value={formData.medicalFacility}
              onChange={e => setFormData({ ...formData, medicalFacility: e.target.value })}
            />
          </div>
        </div>

        {/* Lý do & Tình trạng sức khỏe: TỰ ĐỘNG CHIẾM HẾT CHIỀU CAO KHẢ DỤNG */}
        <div className="d-flex flex-column flex-grow-1 mb-0 mt-1">
          <label style={labelStyle}>Lý do và tình trạng sức khỏe</label>
          <textarea
            className="form-control shadow-none flex-grow-1 w-100"
            style={{
              ...inputStyle,
              resize: "none",
              minHeight: "100px",
              height: "100%",
            }}
            placeholder="Mô tả tóm tắt tình trạng sức khỏe hoặc chỉ định điều trị của bác sĩ..."
            value={formData.reason}
            onChange={e => setFormData({ ...formData, reason: e.target.value })}
            required
          />
        </div>
      </form>
    </div>
  );
}
