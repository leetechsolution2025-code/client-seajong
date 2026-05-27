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
  isWithinGPSRange?: boolean;
  distanceToOffice?: number | null;
  allowedRadius?: number;
  gpsError?: string | null;
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
  isWithinGPSRange = false,
  distanceToOffice = null,
  allowedRadius = 200,
  gpsError = null,
}: AttendanceMachineProps) {
  const [pressProgress, setPressProgress] = useState(0);
  const [registeredLunch, setRegisteredLunch] = useState(false);
  const [registeredDinner, setRegisteredDinner] = useState(false);
  const pressTimerRef = useRef<any>(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Width <= 1194px matches iPad Pro 11" and smaller
      setIsMobileOrTablet(window.innerWidth <= 1194);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    const allowedToPress = isMobileOrTablet ? isWithinGPSRange : isInternalNetwork;
    if (!allowedToPress || loading || isSundayLocked) return;
    
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
  const allowedToPress = isMobileOrTablet ? isWithinGPSRange : isInternalNetwork;

  const getGpsBgColor = () => {
    if (gpsError) return "#fef2f2";
    if (distanceToOffice === null) return "#fffbeb";
    return isWithinGPSRange ? "#ecfdf5" : "#fef2f2";
  };

  const getGpsBorderColor = () => {
    if (gpsError) return "#fecaca";
    if (distanceToOffice === null) return "#fde68a";
    return isWithinGPSRange ? "#a7f3d0" : "#fecaca";
  };

  const getGpsTextColor = () => {
    if (gpsError) return "#b91c1c";
    if (distanceToOffice === null) return "#b45309";
    return isWithinGPSRange ? "#047857" : "#b91c1c";
  };

  const getGpsIcon = () => {
    if (gpsError) return "exclamation-triangle-fill";
    if (distanceToOffice === null) return "geo-alt";
    return isWithinGPSRange ? "geo-alt-fill" : "geo-alt";
  };

  const getGpsLabel = () => {
    if (gpsError) return gpsError;
    if (distanceToOffice === null) return "ĐANG XÁC ĐỊNH VỊ TRÍ (GPS)...";
    return isWithinGPSRange ? "ĐỊNH VỊ GPS: HỢP LỆ" : "ĐỊNH VỊ GPS: NGOÀI PHẠM VI";
  };

  const getGpsSubtitle = () => {
    if (gpsError) return "Vui lòng cho phép quyền vị trí trên trình duyệt";
    if (distanceToOffice === null) return `Địa điểm: ${branchName}`;
    return `Khoảng cách: ${Math.round(distanceToOffice)}m (Cho phép ≤${allowedRadius}m)`;
  };

  const getWarningText = () => {
    if (isMobileOrTablet) {
      if (gpsError) {
        return gpsError;
      }
      if (distanceToOffice !== null) {
        return `Cách văn phòng ${Math.round(distanceToOffice)}m (cho phép ≤${allowedRadius}m)`;
      }
      return "Cần cho phép định vị GPS để chấm công";
    }
    return "Cần mạng nội bộ công ty để chấm công";
  };

  return (
    <div 
      className="card border-0 shadow-sm overflow-hidden h-100"
      style={{ 
        borderRadius: "32px",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid rgba(0, 0, 0, 0.05)",
        color: "#0f172a"
      }}
    >

      <div className="px-4 py-4 text-center">
        <div 
          className="fw-bold mb-1" 
          style={{ fontSize: "52px", lineHeight: "1", letterSpacing: "-1px", color: "#0f172a" }}
          suppressHydrationWarning
        >
          {currentTime.toLocaleTimeString("vi-VN", { hour12: false })}
        </div>
        <div className="text-muted small fw-medium mt-1">
          {formatDate(currentTime)}
        </div>
      </div>

      <div className="px-4 pb-4 flex-grow-1 d-flex flex-column">
        <div 
          className="p-3 rounded-4 mb-3 d-flex align-items-center justify-content-between position-relative"
          style={{ 
            background: isMobileOrTablet ? getGpsBgColor() : (isInternalNetwork ? "#ecfdf5" : "#fef2f2"),
            border: `1px solid ${isMobileOrTablet ? getGpsBorderColor() : (isInternalNetwork ? "#a7f3d0" : "#fecaca")}`,
            color: isMobileOrTablet ? getGpsTextColor() : (isInternalNetwork ? "#047857" : "#b91c1c")
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div className={`position-relative ${refreshing ? 'animate-spin' : ''}`}>
               <i className={`bi bi-${isMobileOrTablet ? getGpsIcon() : (isInternalNetwork ? "wifi" : "wifi-off")} fs-4`}></i>
            </div>
            <div>
              <div className="fw-bold small text-uppercase" style={{ letterSpacing: "0.5px", fontSize: "11px" }}>
                {refreshing ? "ĐANG KIỂM TRA..." : (isMobileOrTablet ? getGpsLabel() : (isInternalNetwork ? "ĐÃ NHẬN DIỆN MẠNG NỘI BỘ" : "KHÔNG NHẬN RA MẠNG NỘI BỘ"))}
              </div>
              <div className="opacity-70" style={{ fontSize: "11px" }}>
                {isMobileOrTablet ? getGpsSubtitle() : `Địa điểm: ${branchName}`}
              </div>
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
              <div 
                className="p-2 rounded-3 text-center" 
                style={{ 
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0" 
                }}
              >
                <div className="fw-medium mb-1 text-uppercase" style={{ fontSize: "9px", color: "#64748b", letterSpacing: "0.5px" }}>{slot.label}</div>
                <div className="fw-bold" style={{ fontSize: "12px", color: slot.time ? "#0f172a" : "#94a3b8" }}>{formatTime(slot.time)}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Lunch Registration Toggle */}
        <div 
          className="p-3 rounded-4 mb-2 d-flex align-items-center justify-content-between transition-all"
          onClick={() => !isLunchLocked && !isCompleted && setRegisteredLunch(!registeredLunch)}
          style={{ 
            background: "white",
            border: "1px solid #e2e8f0",
            cursor: (isLunchLocked || isCompleted) ? "default" : "pointer",
            opacity: isLunchLocked ? 0.6 : 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <div 
              className="p-2 rounded-3 d-flex align-items-center justify-content-center transition-all"
              style={{
                width: "36px",
                height: "36px",
                background: registeredLunch ? "#fef3c7" : "#f1f5f9",
                color: registeredLunch ? "#d97706" : "#94a3b8"
              }}
            >
              <i className="bi bi-sun-fill fs-5"></i>
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: "13px", color: "#0f172a" }}>Đăng ký ăn trưa</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
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
              style={{ width: "40px", height: "20px", cursor: (isLunchLocked || isCompleted) ? "default" : "pointer" }}
            />
          </div>
        </div>

        {/* Dinner Registration Toggle */}
        <div 
          className="p-3 rounded-4 mb-3 d-flex align-items-center justify-content-between transition-all"
          onClick={() => setRegisteredDinner(!registeredDinner)}
          style={{ 
            background: "white",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <div 
              className="p-2 rounded-3 d-flex align-items-center justify-content-center transition-all"
              style={{
                width: "36px",
                height: "36px",
                background: registeredDinner ? "#e0e7ff" : "#f1f5f9",
                color: registeredDinner ? "#4f46e5" : "#94a3b8"
              }}
            >
              <i className="bi bi-moon-stars-fill fs-5"></i>
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: "13px", color: "#0f172a" }}>Đăng ký ăn tối</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
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
              style={{ width: "40px", height: "20px", cursor: "pointer" }}
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
                background: allowedToPress ? "rgba(99, 102, 241, 0.15)" : "transparent",
                transform: "scale(1.4)",
                filter: "blur(20px)",
                pointerEvents: "none"
              }}
            />
            
            <div className="position-absolute" style={{ top: "-10px", left: "-10px", pointerEvents: "none", transform: "rotate(-90deg)" }}>
              <svg width="140" height="140">
                <circle
                  cx="70"
                  cy="70"
                  r="64"
                  fill="none"
                  stroke={allowedToPress && !isCompleted ? "#f1f5f9" : "transparent"}
                  strokeWidth="4"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="64"
                  fill="none"
                  stroke={allowedToPress && !isCompleted ? "#4f46e5" : "transparent"}
                  strokeWidth="6"
                  strokeDasharray={402} // 2 * PI * 64
                  strokeDashoffset={402 * (1 - pressProgress / 100)}
                  strokeLinecap="round"
                  style={{ transition: pressProgress === 0 ? "none" : "stroke-dashoffset 0.05s linear" }}
                />
              </svg>
            </div>
            
            <button
              disabled={!allowedToPress || loading || isCompleted || isSundayLocked}
              onMouseDown={handleStartPress}
              onMouseUp={handleEndPress}
              onMouseLeave={handleEndPress}
              onTouchStart={handleStartPress}
              onTouchEnd={handleEndPress}
              className="btn rounded-full d-flex align-items-center justify-content-center position-relative transition-all"
              style={{ 
                width: "120px", 
                height: "120px", 
                borderRadius: "50%",
                background: (allowedToPress && !isCompleted && !isSundayLocked) ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "#f1f5f9",
                border: "4px solid white",
                color: (allowedToPress && !isCompleted && !isSundayLocked) ? "white" : "#94a3b8",
                boxShadow: (allowedToPress && !isCompleted && !isSundayLocked) 
                  ? "0 10px 25px rgba(79, 70, 229, 0.35)" 
                  : "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
                cursor: (allowedToPress && !isCompleted && !isSundayLocked) ? "pointer" : "not-allowed",
                transform: pressProgress > 0 ? "scale(0.95)" : "scale(1)",
                transition: "all 0.2s ease"
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
            <div className="fw-bold mb-1" style={{ color: "#0f172a", fontSize: "15px" }}>
              {getActionLabel()}
            </div>
            {!allowedToPress && !isCompleted && !isSundayLocked && (
              <div className="small d-flex align-items-center justify-content-center gap-2 mt-1" style={{ fontSize: "11px", color: "#ef4444" }}>
                <i className="bi bi-exclamation-circle-fill"></i>
                <span>{getWarningText()}</span>
              </div>
            )}
            {isSundayLocked && (
              <div className="text-warning small fw-medium mt-1" style={{ color: "#d97706" }}>
                <i className="bi bi-info-circle me-1"></i>
                Hôm nay là Chủ nhật. Cần yêu cầu OT được duyệt.
              </div>
            )}
            {hasOvertimeApproval && allowedToPress && !isCompleted && (
              <div className="small fw-bold mt-1" style={{ color: "#0284c7" }}>
                <i className="bi bi-patch-check-fill me-1"></i>
                Đã được duyệt làm thêm giờ
              </div>
            )}
            {isCompleted && (
              <div className="small fw-bold mt-1" style={{ color: "#16a34a" }}>
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
