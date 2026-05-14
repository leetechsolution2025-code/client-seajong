"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BrandButton } from "@/components/ui/BrandButton";

interface AttendanceDetailsModalProps {
  show: boolean;
  onClose: () => void;
  user: any;
  currentTime: Date;
  status: any;
  onAction: (action: "check-in" | "check-out") => void;
  loading: boolean;
  ipAddress?: string;
  isInternalNetwork?: boolean;
}

export function AttendanceDetailsModal({
  show,
  onClose,
  user,
  currentTime,
  status,
  onAction,
  loading,
  ipAddress = "1.53.222.150",
  isInternalNetwork = false, // Default to false to match screenshot
}: AttendanceDetailsModalProps) {
  const formatTime = (date: any) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    return `${days[date.getDay()]}, ${date.toLocaleDateString("vi-VN")}`;
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="position-fixed inset-0 z-100 d-flex align-items-center justify-content-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="position-absolute inset-0 bg-dark opacity-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="card border-0 shadow-2xl overflow-hidden position-relative"
            style={{ 
              width: "100%", 
              maxWidth: "480px", 
              borderRadius: "32px",
              background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
              color: "white"
            }}
          >
            {/* Header */}
            <div className="p-4 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div 
                  className="rounded-3 d-flex align-items-center justify-content-center" 
                  style={{ width: "48px", height: "48px", background: "rgba(99, 102, 241, 0.2)", color: "#818cf8" }}
                >
                  <i className="bi bi-fingerprint fs-3"></i>
                </div>
                <div>
                  <h5 className="mb-0 fw-bold">Chấm công</h5>
                  <div className="small opacity-60">{user?.name || "Người dùng"}</div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="btn btn-link text-white opacity-40 p-2 d-flex align-items-center justify-content-center hover:opacity-100"
                style={{ background: "rgba(255,255,255,0.1)", borderRadius: "12px", textDecoration: "none" }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="px-4 py-5 text-center">
              <div className="display-3 fw-bold mb-1" style={{ letterSpacing: "-1px" }}>
                {currentTime.toLocaleTimeString("vi-VN", { hour12: false })}
              </div>
              <div className="opacity-50 small fw-medium">
                {formatDate(currentTime)}
              </div>
            </div>

            <div className="px-4 pb-4">
              {/* Network Status Banner */}
              <div 
                className="p-3 rounded-4 mb-4 d-flex align-items-center justify-content-between"
                style={{ 
                  background: isInternalNetwork ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.05)",
                  border: `1px solid ${isInternalNetwork ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                  color: isInternalNetwork ? "#10b981" : "#ef4444"
                }}
              >
                <div className="d-flex align-items-center gap-3">
                  <i className={`bi bi-${isInternalNetwork ? "wifi" : "wifi-off"} fs-4`}></i>
                  <div>
                    <div className="fw-bold small text-uppercase" style={{ letterSpacing: "0.5px" }}>
                      {isInternalNetwork ? "ĐÃ NHẬN DIỆN MẠNG NỘI BỘ" : "KHÔNG NHẬN RA MẠNG NỘI BỘ"}
                    </div>
                    <div className="opacity-60" style={{ fontSize: "11px" }}>IP: {ipAddress}</div>
                  </div>
                </div>
                {!isInternalNetwork && (
                  <div className="d-flex align-items-center gap-2 opacity-80 small fw-bold">
                    <i className="bi bi-lock-fill"></i>
                    <span>Nút bị khóa</span>
                  </div>
                )}
              </div>

              {/* Shift Slots */}
              <div className="row g-2 mb-5">
                {[
                  { label: "Vào sáng", time: status?.checkInMorning },
                  { label: "Ra sáng", time: status?.checkOutMorning },
                  { label: "Vào chiều", time: status?.checkInAfternoon },
                  { label: "Ra chiều", time: status?.checkOutAfternoon }
                ].map((slot, idx) => (
                  <div key={idx} className="col-3">
                    <div className="p-2 rounded-3 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div className="opacity-40 mb-1" style={{ fontSize: "10px" }}>{slot.label}</div>
                      <div className="fw-bold small">{formatTime(slot.time)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Button Area */}
              <div className="d-flex flex-column align-items-center gap-4 py-3">
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
                  
                  <button
                    disabled={!isInternalNetwork || loading}
                    onClick={() => onAction(!status?.checkIn ? "check-in" : "check-out")}
                    className="btn rounded-full d-flex align-items-center justify-content-center position-relative transition-all"
                    style={{ 
                      width: "140px", 
                      height: "140px", 
                      background: isInternalNetwork ? "#4f46e5" : "rgba(255,255,255,0.05)",
                      border: "4px solid rgba(255,255,255,0.1)",
                      color: isInternalNetwork ? "white" : "rgba(255,255,255,0.2)",
                      boxShadow: isInternalNetwork ? "0 0 40px rgba(79, 70, 229, 0.4)" : "none",
                      cursor: isInternalNetwork ? "pointer" : "not-allowed"
                    }}
                  >
                    {loading ? (
                      <div className="spinner-border spinner-border-sm" role="status"></div>
                    ) : (
                      <i className="bi bi-box-arrow-in-right fs-1"></i>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <div className="fw-bold mb-1">
                    {!status?.checkIn ? "Chấm vào sáng" : "Chấm vào chiều"}
                  </div>
                  <div className="opacity-50 small d-flex align-items-center justify-content-center gap-2">
                    <div style={{ width: "16px", height: "16px", background: "#ef4444", borderRadius: "50%", display: "flex", alignItems: "center", justifyItems: "center" }}>
                        <div style={{ width: "8px", height: "2px", background: "white" }}></div>
                    </div>
                    <span>Cần mạng nội bộ công ty để chấm công</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
