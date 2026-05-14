"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface AttendanceMachineProps {
  user: any;
  currentTime: Date;
  status: any;
  onAction: (action: "check-in" | "check-out", registeredLunch?: boolean, registeredDinner?: boolean) => void;
  loading: boolean;
  ipAddress?: string;
  isInternalNetwork?: boolean;
  branchName?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  isSundayLocked?: boolean;
  hasOvertimeApproval?: boolean;
}

export function AttendanceMachine({
  user,
  currentTime,
  status,
  onAction,
  loading,
  ipAddress = "1.53.222.150",
  isInternalNetwork = false,
  branchName = "Văn phòng chính",
  onRefresh,
  refreshing = false,
  isSundayLocked = false,
  hasOvertimeApproval = false,
}: AttendanceMachineProps) {
  const [pressProgress, setPressProgress] = useState(0);
  const [registeredLunch, setRegisteredLunch] = useState(false);
  const [registeredDinner, setRegisteredDinner] = useState(false);
  const pressTimerRef = useRef<any>(null);

  // Khoá đăng ký ăn trưa sau 10:00 sáng
  const isLunchLocked = currentTime.getHours() >= 10;

  useEffect(() => {
    if (loading) {
      setPressProgress(0);
    }
  }, [loading]);

  useEffect(() => {
    if (status?.registeredLunch)   setRegisteredLunch(true);
    if (status?.registeredDinner)  setRegisteredDinner(true);
  }, [status]);

  const handleStartPress = () => {
    if (!isInternalNetwork || loading || isSundayLocked) return;
    
    setPressProgress(0);
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();

    pressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setPressProgress(progress);

      if (progress >= 100) {
        clearInterval(pressTimerRef.current);
        onAction(!status?.checkInMorning ? "check-in" : "check-out", registeredLunch, registeredDinner);
      }
    }, 20);
  };

  const handleEndPress = () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      if (pressProgress < 100) {
        setPressProgress(0);
      }
    }
  };

  const formatTime = (date: any) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    const days = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
    const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
    return `${dayName}, ${date.toLocaleDateString("vi-VN")}`;
  };

  const getActionLabel = () => {
    if (isSundayLocked) return "Máy chấm công đã khoá";
    if (!status) return "Nhấn giữ để Chấm vào sáng";
    if (!status.checkOutMorning) return "Nhấn giữ để Chấm ra sáng";
    if (!status.checkInAfternoon) return "Nhấn giữ để Chấm vào chiều";
    if (!status.checkOutAfternoon) return "Nhấn giữ để Chấm ra chiều";
    return "Đã hoàn thành chấm công";
  };

  const getActionIcon = () => {
    if (isSundayLocked) return "lock-fill";
    if (!status || !status.checkOutMorning || (!status.checkInAfternoon && status.checkOutMorning)) {
      return "box-arrow-in-right";
    }
    return "box-arrow-right";
  };

  const isCompleted = status?.checkInMorning && status?.checkOutMorning && status?.checkInAfternoon && status?.checkOutAfternoon;

  return (
    <div 
      className="card border-0 shadow-lg overflow-hidden h-100"
      style={{ 
        borderRadius: "32px",
        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
        color: "white"
      }}
    >

      <div className="px-4 py-4 text-center">
        <div 
          className="fw-bold mb-1" 
          style={{ fontSize: "52px", lineHeight: "1", letterSpacing: "-1px" }}
          suppressHydrationWarning
        >
          {currentTime.toLocaleTimeString("vi-VN", { hour12: false })}
        </div>
        <div className="opacity-50 small fw-medium mt-1">
          {formatDate(currentTime)}
        </div>
      </div>

      <div className="px-4 pb-4 flex-grow-1 d-flex flex-column">
        <div 
          className="p-3 rounded-4 mb-3 d-flex align-items-center justify-content-between position-relative"
          style={{ 
            background: isInternalNetwork ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.05)",
            border: `1px solid ${isInternalNetwork ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
            color: isInternalNetwork ? "#10b981" : "#ef4444"
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div className={`position-relative ${refreshing ? 'animate-spin' : ''}`}>
               <i className={`bi bi-${isInternalNetwork ? "wifi" : "wifi-off"} fs-4`}></i>
            </div>
            <div>
              <div className="fw-bold small text-uppercase" style={{ letterSpacing: "0.5px", fontSize: "11px" }}>
                {refreshing ? "ĐANG KIỂM TRA..." : (isInternalNetwork ? "ĐÃ NHẬN DIỆN MẠNG NỘI BỘ" : "KHÔNG NHẬN RA MẠNG NỘI BỘ")}
              </div>
              <div className="opacity-60" style={{ fontSize: "11px" }}>Địa điểm: {branchName}</div>
            </div>
          </div>
          {onRefresh && (
            <button 
              onClick={() => onRefresh()}
              disabled={refreshing}
              className="btn btn-link p-0 text-decoration-none"
              style={{ color: "inherit", opacity: refreshing ? 0.5 : 0.8 }}
            >
              <i className={`bi bi-arrow-clockwise fs-5 ${refreshing ? 'animate-spin' : ''}`}></i>
            </button>
          )}
        </div>

        {/* Shift Slots */}
        <div className="row g-2 mb-3">
          {[
            { label: "Vào sáng", time: status?.checkInMorning },
            { label: "Ra sáng", time: status?.checkOutMorning },
            { label: "Vào chiều", time: status?.checkInAfternoon },
            { label: "Ra chiều", time: status?.checkOutAfternoon }
          ].map((slot, idx) => (
            <div key={idx} className="col-3">
              <div className="p-2 rounded-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="opacity-40 mb-1" style={{ fontSize: "9px", textTransform: "uppercase" }}>{slot.label}</div>
                <div className="fw-bold" style={{ fontSize: "12px" }}>{formatTime(slot.time)}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Lunch Registration Toggle */}
        <div 
          className="p-3 rounded-4 mb-2 d-flex align-items-center justify-content-between"
          onClick={() => !isLunchLocked && !isCompleted && setRegisteredLunch(!registeredLunch)}
          style={{ 
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
            cursor: (isLunchLocked || isCompleted) ? "default" : "pointer",
            opacity: isLunchLocked ? 0.5 : 1
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <div className={`p-2 rounded-3 ${registeredLunch ? 'bg-warning text-dark' : 'bg-white bg-opacity-10 text-white text-opacity-50'}`}>
              <i className="bi bi-sun-fill"></i>
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>Đăng ký ăn trưa</div>
              <div className="opacity-50" style={{ fontSize: "11px" }}>
                {isLunchLocked ? "Đã khoá (sau 10:00)" : registeredLunch ? "Đã đăng ký suất ăn" : "Chưa đăng ký suất ăn"}
              </div>
            </div>
          </div>
          <div className="form-check form-switch p-0 m-0">
            <input 
              className="form-check-input ms-0" 
              type="checkbox" 
              role="switch" 
              checked={registeredLunch}
              onChange={(e) => !isLunchLocked && !isCompleted && setRegisteredLunch(e.target.checked)}
              disabled={isLunchLocked || isCompleted}
              style={{ width: "40px", height: "20px" }}
            />
          </div>
        </div>

        {/* Dinner Registration Toggle – luôn mở */}
        <div 
          className="p-3 rounded-4 mb-3 d-flex align-items-center justify-content-between"
          onClick={() => setRegisteredDinner(!registeredDinner)}
          style={{ 
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
            cursor: "pointer"
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <div className={`p-2 rounded-3 ${registeredDinner ? 'bg-danger text-white' : 'bg-white bg-opacity-10 text-white text-opacity-50'}`}>
              <i className="bi bi-moon-stars-fill"></i>
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: "13px" }}>Đăng ký ăn tối</div>
              <div className="opacity-50" style={{ fontSize: "11px" }}>
                {registeredDinner ? "Đã đăng ký suất ăn" : "Chưa đăng ký suất ăn"}
              </div>
            </div>
          </div>
          <div className="form-check form-switch p-0 m-0">
            <input 
              className="form-check-input ms-0" 
              type="checkbox" 
              role="switch" 
              checked={registeredDinner}
              onChange={(e) => setRegisteredDinner(e.target.checked)}
              style={{ width: "40px", height: "20px" }}
            />
          </div>
        </div>

        {/* Action Button Area */}
        <div className="mt-auto d-flex flex-column align-items-center gap-3 py-2">
          <div className="position-relative">
              {/* Glow effect */}
              <div 
              className="position-absolute inset-0 rounded-full animate-pulse"
              style={{ 
                background: isInternalNetwork ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.05)",
                transform: "scale(1.4)",
                filter: "blur(20px)"
              }}
            />
            
            <div className="position-absolute" style={{ top: "-10px", left: "-10px", pointerEvents: "none", transform: "rotate(-90deg)" }}>
              <svg width="140" height="140">
                <circle
                  cx="70"
                  cy="70"
                  r="64"
                  fill="none"
                  stroke={isInternalNetwork && !isCompleted ? "rgba(255,255,255,0.05)" : "transparent"}
                  strokeWidth="4"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="64"
                  fill="none"
                  stroke={isInternalNetwork && !isCompleted ? "#4f46e5" : "transparent"}
                  strokeWidth="6"
                  strokeDasharray={402} // 2 * PI * 64
                  strokeDashoffset={402 * (1 - pressProgress / 100)}
                  strokeLinecap="round"
                  style={{ transition: pressProgress === 0 ? "none" : "stroke-dashoffset 0.05s linear" }}
                />
              </svg>
            </div>
            
            <button
              disabled={!isInternalNetwork || loading || isCompleted || isSundayLocked}
              onMouseDown={handleStartPress}
              onMouseUp={handleEndPress}
              onMouseLeave={handleEndPress}
              onTouchStart={handleStartPress}
              onTouchEnd={handleEndPress}
              className="btn rounded-full d-flex align-items-center justify-content-center position-relative transition-all"
              style={{ 
                width: "120px", 
                height: "120px", 
                background: (isInternalNetwork && !isCompleted && !isSundayLocked) ? "#4f46e5" : "rgba(255,255,255,0.05)",
                border: "4px solid rgba(255,255,255,0.1)",
                color: (isInternalNetwork && !isCompleted && !isSundayLocked) ? "white" : "rgba(255,255,255,0.2)",
                boxShadow: (isInternalNetwork && !isCompleted && !isSundayLocked) ? "0 0 40px rgba(79, 70, 229, 0.4)" : "none",
                cursor: (isInternalNetwork && !isCompleted && !isSundayLocked) ? "pointer" : "not-allowed",
                transform: pressProgress > 0 ? "scale(0.95)" : "scale(1)"
              }}
            >
              {loading ? (
                <div className="spinner-border spinner-border-sm" role="status"></div>
              ) : (
                <i className={`bi bi-${getActionIcon()} fs-1`}></i>
              )}
            </button>
          </div>

          <div className="text-center pb-1">
            <div className="fw-bold mb-1">
              {getActionLabel()}
            </div>
            {!isInternalNetwork && !isCompleted && !isSundayLocked && (
              <div className="opacity-50 small d-flex align-items-center justify-content-center gap-2" style={{ fontSize: "11px" }}>
                <div style={{ width: "16px", height: "16px", background: "#ef4444", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "8px", height: "2px", background: "white" }}></div>
                </div>
                <span>Cần mạng nội bộ công ty để chấm công</span>
              </div>
            )}
            {isSundayLocked && (
              <div className="text-warning small fw-medium mt-1">
                <i className="bi bi-info-circle me-1"></i>
                Hôm nay là Chủ nhật. Cần yêu cầu OT được duyệt.
              </div>
            )}
            {hasOvertimeApproval && isInternalNetwork && !isCompleted && (
              <div className="text-info small fw-bold mt-1">
                <i className="bi bi-patch-check-fill me-1"></i>
                Đã được duyệt làm thêm giờ
              </div>
            )}
            {isCompleted && (
              <div className="text-success small fw-bold">
                 <i className="bi bi-check-circle-fill me-1"></i>
                 Hoàn thành công việc ngày hôm nay
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
