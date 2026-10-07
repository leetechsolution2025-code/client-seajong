"use client";

import React, { useState, useEffect, useMemo } from "react";

interface LeaveFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  loading: boolean;
  onTypeChange?: (type: string) => void;
}

interface LeaveBalance {
  total: number;
  used: number;
  remaining: number;
}

export function LeaveForm({ initialData, onSubmit, loading, onTypeChange }: LeaveFormProps) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [paidLeaveCount, setPaidLeaveCount] = useState<number>(0);
  const [unpaidAndUnexcusedCount, setUnpaidAndUnexcusedCount] = useState<number>(0);
  const [fetchingStats, setFetchingStats] = useState(false);

  const details = useMemo(() => {
    if (!initialData) return {};
    return typeof initialData.details === "string" 
      ? JSON.parse(initialData.details || "{}") 
      : (initialData.details || {});
  }, [initialData]);

  const [formData, setFormData] = useState(() => ({
    leaveType: details.leaveType || "Phép năm", // "Phép năm" | "Nghỉ việc riêng có lương" | "Nghỉ không lương"
    startDate: initialData?.startDate 
      ? new Date(initialData.startDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0],
    endDate: initialData?.endDate 
      ? new Date(initialData.endDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0],
    sessionType: details.sessionType || "full", // "full" | "morning" | "afternoon" (khi nghỉ 1 ngày)
    startHalf: details.startHalf || "full", // "full" | "afternoon" (khi nghỉ nhiều ngày)
    endHalf: details.endHalf || "full", // "full" | "morning" (khi nghỉ nhiều ngày)
    reason: details.reason || initialData?.reason || "",
  }));

  useEffect(() => {
    if (onTypeChange) {
      onTypeChange(formData.leaveType);
    }
  }, [formData.leaveType, onTypeChange]);

  // Lấy quỹ phép
  useEffect(() => {
    fetch("/api/my/leave-balance")
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setBalance(data);
        }
        setFetchingBalance(false);
      })
      .catch(err => {
        console.error("Fetch Leave Balance Error:", err);
        setFetchingBalance(false);
      });

    // Lấy thống kê nghỉ
    setFetchingStats(true);
    fetch("/api/my/attendance")
      .then(r => r.json())
      .then(attData => {
        if (attData && Array.isArray(attData.history)) {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          let unexcused = 0;
          let paid = 0;
          attData.history.forEach((h: any) => {
            const hDate = new Date(h.date);
            if (hDate.getMonth() !== currentMonth || hDate.getFullYear() !== currentYear) return;
            if (h.status === "KL") unexcused++;
            else if (h.status === "P" || h.status === "BHXH") paid++;
          });
          setPaidLeaveCount(paid);
          setUnpaidAndUnexcusedCount(unexcused);
        }
        setFetchingStats(false);
      })
      .catch(() => setFetchingStats(false));
  }, []);

  const isSingleDay = formData.startDate === formData.endDate;

  // Tính tổng số ngày nghỉ chính xác
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

  const isOutOfLeave = Boolean(
    balance && formData.leaveType === "Phép năm" && balance.remaining <= 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalDays <= 0) {
      alert("Vui lòng chọn khoảng thời gian nghỉ hợp lệ");
      return;
    }
    if (isOutOfLeave) {
      alert("Quỹ phép năm của bạn đã hết. Vui lòng chọn loại nghỉ việc riêng hoặc nghỉ không lương.");
      return;
    }

    const sessionDesc = isSingleDay
      ? (formData.sessionType === "morning" ? "Buổi sáng (08:00 - 12:00)" : formData.sessionType === "afternoon" ? "Buổi chiều (13:00 - 17:00)" : "Cả ngày")
      : `Từ ${formData.startHalf === "afternoon" ? "chiều" : "sáng"} ${formData.startDate} đến ${formData.endHalf === "morning" ? "trưa" : "hết ngày"} ${formData.endDate}`;

    onSubmit({
      type: "leave",
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalDays: totalDays,
      reason: formData.reason,
      details: {
        category: "leave",
        leaveType: formData.leaveType,
        totalDays: totalDays,
        sessionType: isSingleDay ? formData.sessionType : undefined,
        startHalf: !isSingleDay ? formData.startHalf : undefined,
        endHalf: !isSingleDay ? formData.endHalf : undefined,
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
      {/* 1. Header Card: Quỹ phép năm hoặc Thống kê quy định */}
      {formData.leaveType === "Phép năm" ? (
        <div
          className="p-3 mb-3 rounded-3 flex-shrink-0 border shadow-xs"
          style={{
            background: "linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(99, 102, 241, 0.06) 100%)",
            borderColor: "rgba(2, 132, 199, 0.2)"
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-light-subtle">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 24, height: 24, background: "#0284c715", color: "#0284c7" }}
              >
                <i className="bi bi-calendar2-check" style={{ fontSize: "12px" }}></i>
              </div>
              <span className="fw-bold text-dark" style={{ fontSize: "12px", letterSpacing: "0.3px" }}>
                QUỸ PHÉP NĂM {new Date().getFullYear()}
              </span>
            </div>
            <span className="badge bg-light text-primary border" style={{ fontSize: "10.5px", fontWeight: 600 }}>
              Tiêu chuẩn 12 ngày/năm
            </span>
          </div>

          <div className="row g-2 text-center">
            <div className="col-4">
              <div className="p-2 rounded-2 bg-white border shadow-xs">
                <div className="fw-bold" style={{ fontSize: "18px", color: "#0284c7", lineHeight: 1.2 }}>
                  {fetchingBalance ? "..." : (balance?.total ?? 12)}
                </div>
                <div className="text-muted fw-semibold" style={{ fontSize: "10px", marginTop: "2px" }}>
                  TỔNG CỘNG
                </div>
              </div>
            </div>

            <div className="col-4">
              <div className="p-2 rounded-2 bg-white border shadow-xs">
                <div className="fw-bold" style={{ fontSize: "18px", color: (balance?.used || 0) > 0 ? "#dc2626" : "#64748b", lineHeight: 1.2 }}>
                  {fetchingBalance ? "..." : (balance?.used ?? 0)}
                </div>
                <div className="text-muted fw-semibold" style={{ fontSize: "10px", marginTop: "2px" }}>
                  ĐÃ DÙNG
                </div>
              </div>
            </div>

            <div className="col-4">
              <div className="p-2 rounded-2 bg-white border shadow-xs">
                <div className="fw-bold" style={{ fontSize: "18px", color: "#16a34a", lineHeight: 1.2 }}>
                  {fetchingBalance ? "..." : (balance?.remaining ?? 12)}
                </div>
                <div className="text-muted fw-semibold" style={{ fontSize: "10px", marginTop: "2px" }}>
                  KHẢ DỤNG
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : formData.leaveType === "Nghỉ việc riêng có lương" ? (
        <div className="p-3 mb-3 rounded-3 flex-shrink-0 border bg-light-subtle" style={{ fontSize: "12px" }}>
          <div className="fw-bold text-dark mb-1.5">
            Quy định Nghỉ việc riêng có lương (Bộ luật LĐ 2019):
          </div>
          <ul className="list-unstyled mb-0 text-muted d-flex flex-column gap-1 ps-1" style={{ fontSize: "11.5px", lineHeight: 1.4 }}>
            <li>• <strong>Bản thân kết hôn:</strong> Nghỉ 03 ngày nguyên lương.</li>
            <li>• <strong>Con đẻ, con nuôi kết hôn:</strong> Nghỉ 01 ngày nguyên lương.</li>
            <li>• <strong>Tứ thân phụ mẫu, vợ/chồng, con mất:</strong> Nghỉ 03 ngày nguyên lương.</li>
          </ul>
        </div>
      ) : (
        <div className="p-3 mb-3 rounded-3 flex-shrink-0 border bg-light-subtle">
          <div className="d-flex align-items-center justify-content-between">
            <span className="small text-muted fw-medium">Thống kê nghỉ không lương tháng này:</span>
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-bold">
              {fetchingStats ? "..." : `${unpaidAndUnexcusedCount} ngày`}
            </span>
          </div>
        </div>
      )}

      {/* Cảnh báo hết phép */}
      {isOutOfLeave && (
        <div className="alert alert-danger py-2 px-3 rounded-3 mb-3 d-flex align-items-center gap-2" style={{ fontSize: "12.5px" }}>
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
          <span>Bạn đã dùng hết quỹ phép năm. Vui lòng chuyển sang Nghỉ việc riêng hoặc Nghỉ không lương.</span>
        </div>
      )}

      <form id="personal-request-form" onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1">
        <div className="flex-shrink-0">
          {/* Loại yêu cầu */}
          <div className="mb-3">
            <label style={labelStyle}>Loại nghỉ phép</label>
            <select
              className="form-select shadow-none"
              style={inputStyle}
              value={formData.leaveType}
              onChange={e => setFormData({ ...formData, leaveType: e.target.value })}
              required
            >
              <option value="Phép năm">Phép năm hưởng nguyên lương</option>
              <option value="Nghỉ việc riêng có lương">Nghỉ việc riêng có lương</option>
              <option value="Nghỉ không lương">Nghỉ việc riêng không lương</option>
            </select>
          </div>

          {/* Thời gian nghỉ: Từ ngày & Đến ngày */}
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

          {/* Hình thức buổi nghỉ (Sáng / Chiều / Cả ngày) */}
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
                    className="btn flex-fill py-1.5 px-2 rounded-2 text-center transition-all"
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
                  <option value="afternoon">Bắt đầu từ buổi chiều </option>
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
                  <option value="full">Kết thúc hết buổi chiều </option>
                  <option value="morning">Kết thúc hết buổi sáng</option>
                </select>
              </div>
            </div>
          )}

          {/* Banner tính toán tổng ngày nghỉ và quỹ phép dự báo */}
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
                  Tổng cộng: {totalDays} ngày nghỉ
                </span>
                <span className="text-muted small ms-1" style={{ fontSize: "11px" }}>
                  ({totalDays * 8} giờ công)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lý do chi tiết: TỰ ĐỘNG CHIẾM HẾT CHIỀU CAO KHẢ DỤNG */}
        <div className="d-flex flex-column flex-grow-1 mb-0 mt-1">
          <label style={labelStyle}>Lý do xin nghỉ phép</label>
          <textarea
            className="form-control shadow-none flex-grow-1 w-100"
            style={{
              ...inputStyle,
              resize: "none",
              minHeight: "100px",
              height: "100%",
            }}
            placeholder="Nhập lý do xin nghỉ phép chi tiết để cấp trên phê duyệt (vd: giải quyết việc gia đình, khám sức khỏe...)"
            value={formData.reason}
            onChange={e => setFormData({ ...formData, reason: e.target.value })}
            required
          />
        </div>
      </form>
    </div>
  );
}
