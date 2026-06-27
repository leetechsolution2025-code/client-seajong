"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface LeaveFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
  onTypeChange?: (type: string) => void;
}

interface LeaveBalance {
  total: number;
  used: number;
  remaining: number;
}

export function LeaveForm({ onSubmit, loading, onTypeChange }: LeaveFormProps) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [violationMinutes, setViolationMinutes] = useState<number | null>(null);
  const [fetchingViolation, setFetchingViolation] = useState(false);
  const [paidLeaveCount, setPaidLeaveCount] = useState<number>(0);
  const [unpaidAndUnexcusedCount, setUnpaidAndUnexcusedCount] = useState<number>(0);
  const [fetchingStats, setFetchingStats] = useState(false);
  
  const [formData, setFormData] = useState({
    leaveType: "Phép năm",
    startDate: "",
    endDate: "",
    startHalf: "full", // full, morning, afternoon
    endHalf: "full",
    reason: "",
    time: "",
  });

  useEffect(() => {
    if (onTypeChange) {
      onTypeChange(formData.leaveType);
    }
  }, [formData.leaveType, onTypeChange]);

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

    setFetchingViolation(true);
    setFetchingStats(true);
    
    Promise.all([
      fetch("/api/my/attendance").then(r => r.json()),
      fetch("/api/my/requests").then(r => r.json())
    ])
      .then(([attData, requests]) => {
        if (attData && Array.isArray(attData.history)) {
          const totalMin = attData.history.reduce((acc: number, h: any) => acc + (h.violationMinutes || 0), 0);
          setViolationMinutes(totalMin);
        }

        if (attData && Array.isArray(attData.history) && Array.isArray(requests)) {
          const history = attData.history;
          const holidays = attData.holidays || [];
          
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          const todayDay = now.getDate();
          let unexcusedDays = 0;
          let paidLeaveDays = 0;
          let unpaidLeaveDays = 0;

          history.forEach((h: any) => {
            const hDate = new Date(h.date);
            if (hDate.getMonth() !== currentMonth || hDate.getFullYear() !== currentYear) return;

            const isHoliday = h.isHoliday || h.status === "L";
            const isLeave = ["P", "KL", "BHXH"].includes(h.status || "");
            const hasCheckIn = h.checkInMorning || h.checkOutMorning || h.checkInAfternoon || h.checkOutAfternoon;

            if (h.status === "KL") {
              unpaidLeaveDays++;
            } else if (h.status === "P" || h.status === "BHXH") {
              paidLeaveDays++;
            }

            // Chỉ đếm ngày không phép đối với các ngày trong quá khứ
            if (hDate.getDate() < todayDay && hDate.getDay() !== 0 && !isHoliday && !isLeave && !hasCheckIn) {
              unexcusedDays++;
            }
          });

          setPaidLeaveCount(paidLeaveDays);
          setUnpaidAndUnexcusedCount(unpaidLeaveDays + unexcusedDays);
        }
        setFetchingViolation(false);
        setFetchingStats(false);
      })
      .catch(err => {
        console.error("Fetch Stats Error:", err);
        setFetchingViolation(false);
        setFetchingStats(false);
      });
  }, []);

  const isSpecialType = formData.leaveType === "Đi muộn" || formData.leaveType === "Về sớm";

  const totalDays = useMemo(() => {
    if (isSpecialType) return 0;
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
  }, [formData.startDate, formData.endDate, formData.startHalf, formData.endHalf, isSpecialType]);

  const isOutOfLeave = !!(balance && formData.leaveType === "Phép năm" && balance.remaining <= 0);
  const canSubmit = !isOutOfLeave && !loading && (
    isSpecialType 
      ? (!!formData.startDate && !!formData.time)
      : (totalDays > 0)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isSpecialType) {
      onSubmit({
        type: formData.leaveType === "Đi muộn" ? "late" : "early",
        startDate: formData.startDate,
        endDate: formData.startDate,
        totalDays: 0,
        reason: formData.reason,
        details: {
          leaveType: formData.leaveType,
          time: formData.time,
        },
      });
    } else {
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
    }
  };

  const inputStyle = {
    borderRadius: "12px", padding: "10px 15px", border: "1px solid var(--border)",
    background: "var(--background)", color: "var(--foreground)",
    fontSize: "14px", transition: "all 0.2s"
  };
  
  return (
    <div className="d-flex flex-column h-100 gap-4 overflow-hidden">
      {/* Leave Balance Info / Regulation Info */}
      {formData.leaveType === "Nghỉ việc riêng có lương" ? (
        <div className="p-3 rounded-4 flex-shrink-0" style={{ background: "var(--accent-background)", border: "1px solid var(--border)" }}>
          <SectionTitle title="Quy định nghỉ việc riêng có lương" className="mb-2" />
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2 text-muted" style={{ fontSize: "12px", lineHeight: "1.5" }}>
            <li className="d-flex align-items-start gap-2">
              <i className="bi bi-dot text-primary fs-5 m-0 lh-1"></i>
              <span><strong>Bản thân kết hôn:</strong> Nghỉ 03 ngày.</span>
            </li>
            <li className="d-flex align-items-start gap-2">
              <i className="bi bi-dot text-primary fs-5 m-0 lh-1"></i>
              <span><strong>Con đẻ, con nuôi kết hôn:</strong> Nghỉ 01 ngày.</span>
            </li>
            <li className="d-flex align-items-start gap-2">
              <i className="bi bi-dot text-primary fs-5 m-0 lh-1"></i>
              <span><strong>Bố đẻ, mẹ đẻ, bố nuôi, mẹ nuôi chết; bố đẻ, mẹ đẻ, bố nuôi, mẹ nuôi của vợ hoặc chồng chết; vợ hoặc chồng chết; con đẻ, con nuôi chết:</strong> Nghỉ 03 ngày.</span>
            </li>
          </ul>
        </div>
      ) : formData.leaveType === "Nghỉ ốm có BHXH" ? (
        <div className="p-3 rounded-4 flex-shrink-0" style={{ background: "var(--accent-background)", border: "1px solid var(--border)" }}>
          <SectionTitle title="Quy định nghỉ ốm có BHXH" className="mb-2" />
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2 text-muted" style={{ fontSize: "12px", lineHeight: "1.5" }}>
            <li className="d-flex align-items-start gap-2">
              <i className="bi bi-dot text-primary fs-5 m-0 lh-1"></i>
              <span>Cơ quan Bảo hiểm xã hội sẽ trực tiếp chi trả tiền trợ cấp ốm đau cho người lao động.</span>
            </li>
            <li className="d-flex align-items-start gap-2">
              <i className="bi bi-dot text-primary fs-5 m-0 lh-1"></i>
              <span><strong>Mức hưởng:</strong> Bằng 75% mức tiền lương đóng BHXH của tháng liền kề trước khi nghỉ (chia cho 24 ngày để tính mức hưởng ngày).</span>
            </li>
            <li className="d-flex align-items-start gap-2">
              <i className="bi bi-dot text-primary fs-5 m-0 lh-1"></i>
              <span><strong>Đóng BHXH dưới 15 năm:</strong> Tối đa 30 ngày.</span>
            </li>
            <li className="d-flex align-items-start gap-2">
              <i className="bi bi-dot text-primary fs-5 m-0 lh-1"></i>
              <span><strong>Đóng BHXH từ đủ 15 năm đến dưới 30 năm:</strong> Tối đa 40 ngày.</span>
            </li>
            <li className="d-flex align-items-start gap-2">
              <i className="bi bi-dot text-primary fs-5 m-0 lh-1"></i>
              <span><strong>Đóng BHXH từ đủ 30 năm trở lên:</strong> Tối đa 60 ngày.</span>
            </li>
          </ul>
        </div>
      ) : formData.leaveType === "Nghỉ không lương" ? (
        <div className="p-3 rounded-4 flex-shrink-0" style={{ background: "var(--accent-background)", border: "1px solid var(--border)" }}>
          <SectionTitle title="Thống kê nghỉ trong tháng" className="mb-2" />
          <div className="row g-2 text-center">
              <div className="col-6 border-end">
                  <div className="fw-bold text-danger h4 mb-0" style={{ fontWeight: 800 }}>
                    {fetchingStats ? "..." : unpaidAndUnexcusedCount}
                  </div>
                  <div className="small text-muted" style={{ fontSize: "10px" }}>Nghỉ không lương, không phép (ngày)</div>
              </div>
              <div className="col-6">
                  <div className="fw-bold text-success h4 mb-0" style={{ fontWeight: 800 }}>
                    {fetchingStats ? "..." : paidLeaveCount}
                  </div>
                  <div className="small text-muted" style={{ fontSize: "10px" }}>Nghỉ có phép (ngày)</div>
              </div>
          </div>
        </div>
      ) : !isSpecialType && (
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
      )}

      {isOutOfLeave && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 flex-shrink-0" style={{ fontSize: "13px" }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            <span>Bạn đã hết ngày phép năm. Không thể tạo thêm yêu cầu này.</span>
        </div>
      )}

      <form id="personal-request-form" onSubmit={handleSubmit} className="flex-grow-1 d-flex flex-column gap-3 overflow-hidden">
        <div className="row g-3 flex-shrink-0">
          <div className="col-12">
            <SectionTitle title="Loại yêu cầu" className="mb-1" />
            <select 
              className="form-select shadow-none" 
              style={inputStyle} 
              value={formData.leaveType}
              onChange={e => {
                const val = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  leaveType: val,
                  time: val === "Đi muộn" ? "09:00" : val === "Về sớm" ? "16:00" : ""
                }));
              }}
              required
            >
              <option>Phép năm</option>
              <option>Nghỉ ốm có BHXH</option>
              <option>Nghỉ việc riêng có lương</option>
              <option>Nghỉ không lương</option>
              <option>Đi muộn</option>
              <option>Về sớm</option>
            </select>
          </div>

          {isSpecialType && (
            <div className="col-12">
              <div className="p-3 rounded-4" style={{ background: "var(--accent-background)", border: "1px solid var(--border)" }}>
                <SectionTitle title="Số phút vi phạm tháng này" className="mb-2" />
                <div className="d-flex align-items-baseline gap-2 mt-2 justify-content-center">
                  <span className="fw-bold text-danger h2 mb-0" style={{ fontWeight: 800 }}>
                    {fetchingViolation ? "..." : violationMinutes !== null ? violationMinutes : "0"}
                  </span>
                  <span className="text-muted fw-semibold" style={{ fontSize: "13px" }}>phút đi muộn / về sớm</span>
                </div>
              </div>
            </div>
          )}

          {isSpecialType ? (
            <>
              <div className="col-md-6">
                <SectionTitle title="Ngày đăng ký" className="mb-1" />
                <input 
                  type="date" 
                  className="form-control shadow-none" 
                  style={inputStyle} 
                  value={formData.startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({...formData, startDate: e.target.value, endDate: e.target.value})}
                  required 
                />
              </div>

              <div className="col-md-6">
                <SectionTitle title="Giờ đăng ký" className="mb-1" />
                <input 
                  type="time" 
                  className="form-control shadow-none" 
                  style={inputStyle} 
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                  required 
                />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

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
          <SectionTitle title="Lý do chi tiết" className="mb-1" />
          <textarea 
            className="form-control shadow-none flex-grow-1" 
            style={{ ...inputStyle, resize: "none", minHeight: "100px" }} 
            value={formData.reason}
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="Nhập lý do chi tiết..."
            required
          ></textarea>
        </div>
      </form>
    </div>
  );
}
