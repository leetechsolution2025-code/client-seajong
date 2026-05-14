"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BrandButton } from "@/components/ui/BrandButton";
import { KPICard } from "@/components/ui/KPICard";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { AttendanceMachine } from "./AttendanceMachine";
import { motion, AnimatePresence } from "framer-motion";

export function MyAttendance() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const toast = useToast();
  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [clientIp, setClientIp] = useState("127.0.0.1");
  const [isInternal, setIsInternal] = useState(false);
  const [branch, setBranch] = useState<any>(null);
  const [isSundayLocked, setIsSundayLocked] = useState(false);
  const [hasOvertimeApproval, setHasOvertimeApproval] = useState(false);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { data: session } = useSession();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData(selectedMonth, selectedYear);
    requestLocation();
    return () => clearInterval(timer);
  }, [selectedMonth, selectedYear]);

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocError(null);
        },
        (error) => {
          console.warn("Location error:", error);
          setLocError(null); // Non-blocking for development
        }
      );
    } else {
      setLocError("Trình duyệt của bạn không hỗ trợ định vị.");
    }
  };

  const fetchData = async (month?: number, year?: number) => {
    try {
      const m = month || selectedMonth;
      const y = year || selectedYear;
      const res = await fetch(`/api/my/attendance?month=${m}&year=${y}`);
      const data = await res.json();
      setStatus(data.attendance);
      setHistory(data.history || []);
      setClientIp(data.ip || "127.0.0.1");
      setIsInternal(data.isInternalNetwork || false);
      setBranch(data.branch || null);
      setIsSundayLocked(data.isSundayLocked || false);
      setHasOvertimeApproval(data.hasOvertimeApproval || false);
      setHolidays(data.holidays || []);
    } catch (error) {
      console.error("Fetch attendance error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "check-in" | "check-out", registeredLunch?: boolean, registeredDinner?: boolean) => {
    if (!location && action === "check-in") {
      alert("Đang lấy vị trí của bạn, vui lòng đợi giây lát...");
      requestLocation();
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/my/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          lat: location?.lat,
          lng: location?.lng,
          registeredLunch,
          registeredDinner,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(data);
        fetchData(); // Refresh history
        toast.success(action === "check-in" ? "Chấm công vào thành công!" : "Chấm công ra thành công!");
      } else {
        toast.error("Lỗi", data.message || data.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Attendance action error:", error);
      toast.error("Lỗi kết nối", "Không thể kết nối tới máy chủ");
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (date: any) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const getMinutesDiff = (time: any, targetHour: number, targetMinute: number, type: "late" | "early") => {
    if (!time) return 0;
    const d = new Date(time);
    const h = d.getHours();
    const m = d.getMinutes();
    const actualTotal = h * 60 + m;
    const targetTotal = targetHour * 60 + targetMinute;
    
    if (type === "late") {
      return Math.max(0, actualTotal - targetTotal);
    } else {
      return Math.max(0, targetTotal - actualTotal);
    }
  };

  const getAttendanceStatus = (time: any, targetHour: number, targetMinute: number, type: "in" | "out") => {
    if (!time) return null;
    const d = new Date(time);
    const h = d.getHours();
    const m = d.getMinutes();
    
    if (type === "in") {
      // Chỉ hiện nhãn nếu đi muộn
      if (h > targetHour || (h === targetHour && m > targetMinute)) {
        return { label: "Muộn", color: "text-danger" };
      }
      return null; // Đúng giờ hoặc đi sớm -> không hiện gì
    } else {
      // Chỉ hiện nhãn nếu về sớm
      if (h < targetHour || (h === targetHour && m < targetMinute)) {
        return { label: "Sớm", color: "text-danger" };
      }
      return null; // Đúng giờ hoặc về muộn -> không hiện gì
    }
  };

  const formatDate = (date: any) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background-alt)" }}>
      <PageHeader
        title="Chấm công"
        description="Ghi nhận thời gian làm việc bằng WiFi & GPS"
        icon="bi-clock-history"
        color="emerald"
      />

      <div className="flex-grow-1 p-3" style={{ backgroundColor: "#f8fafc", height: "calc(100vh - 120px)", minHeight: 0 }}>
        <div className="row g-3 h-100">
          {/* Main Action Card (Attendance Machine) */}
          <div className="col-lg-4 h-100">
            <AttendanceMachine
              user={session?.user}
              currentTime={currentTime}
              status={status}
              onAction={handleAction}
              loading={actionLoading}
              ipAddress={clientIp}
              isInternalNetwork={isInternal}
              branchName={branch?.name || "Văn phòng chính"}
              onRefresh={fetchData}
              refreshing={loading}
              isSundayLocked={isSundayLocked}
              hasOvertimeApproval={hasOvertimeApproval}
            />
          </div>

          {/* History */}
          <div className="col-lg-8 h-100 d-flex flex-column">
            <div className="card border-0 shadow-sm overflow-hidden flex-grow-1 d-flex flex-column" style={{ borderRadius: "24px" }}>
              <div className="card-header bg-white py-3 border-0 px-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3 w-100">
                  <div className="d-flex bg-light rounded-pill p-1 border shadow-sm">
                    <button 
                      onClick={() => {
                        if (selectedMonth === 1) {
                          setSelectedMonth(12);
                          setSelectedYear(prev => prev - 1);
                        } else {
                          setSelectedMonth(prev => prev - 1);
                        }
                      }}
                      className="btn btn-link btn-sm p-0 px-2 text-muted-light hover-text-dark transition-all border-0 shadow-none"
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <div className="px-2 fw-bold text-dark d-flex align-items-center" style={{ fontSize: "14px", minWidth: "100px", justifyContent: "center" }}>
                       Tháng {selectedMonth}/{selectedYear}
                    </div>
                    <button 
                      onClick={() => {
                        const now = new Date();
                        if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) return;
                        if (selectedMonth === 12) {
                          setSelectedMonth(1);
                          setSelectedYear(prev => prev + 1);
                        } else {
                          setSelectedMonth(prev => prev + 1);
                        }
                      }}
                      className={`btn btn-link btn-sm p-0 px-2 transition-all border-0 shadow-none ${(selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() + 1) ? 'text-muted-light opacity-25 cursor-not-allowed' : 'text-muted-light hover-text-dark'}`}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>

                  <div className="vr d-none d-md-block" style={{ height: "24px", opacity: 0.1 }}></div>

                  <div className="d-flex flex-grow-1 justify-content-between ms-4">
                     {/* Aggregated Stats in Header */}
                     <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-3 bg-success-soft text-success d-flex align-items-center justify-content-center" style={{ width: "30px", height: "30px" }}>
                          <i className="bi bi-calendar-check" style={{ fontSize: "14px" }}></i>
                        </div>
                        <div className="d-flex flex-column" style={{ lineHeight: "1.2" }}>
                           <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                             {(() => {
                               const attendanceDays = history.reduce((acc, h) => acc + (h.workday || 0), 0);
                               const holidayDays = holidays.filter(h => {
                                 const hStart = new Date(h.startDate);
                                 return hStart.getMonth() + 1 === selectedMonth && hStart.getFullYear() === selectedYear;
                               }).length;
                               
                               return (attendanceDays + holidayDays).toFixed(2);
                             })()}
                           </span>
                           <span className="text-muted-light fw-medium" style={{ fontSize: "10px" }}>NGÀY CÔNG</span>
                        </div>
                     </div>
                     <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-3 bg-danger-soft text-danger d-flex align-items-center justify-content-center" style={{ width: "30px", height: "30px" }}>
                          <i className="bi bi-exclamation-triangle" style={{ fontSize: "14px" }}></i>
                        </div>
                        <div className="d-flex flex-column" style={{ lineHeight: "1.2" }}>
                           <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                             {history.reduce((acc, h) => acc + (h.violationMinutes || 0), 0)}
                             <span className="fw-normal ms-1" style={{ fontSize: "11px" }}>phút</span>
                           </span>
                           <span className="text-muted-light fw-medium" style={{ fontSize: "10px" }}>VI PHẠM</span>
                        </div>
                     </div>

                     <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-3 bg-warning-soft text-warning d-flex align-items-center justify-content-center" style={{ width: "30px", height: "30px" }}>
                          <i className="bi bi-box-arrow-right" style={{ fontSize: "14px" }}></i>
                        </div>
                        <div className="d-flex flex-column" style={{ lineHeight: "1.2" }}>
                           <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                             {history.reduce((acc, h) => {
                               return acc + getMinutesDiff(h.checkOutMorning, 12, 0, "early") + getMinutesDiff(h.checkOutAfternoon, 17, 30, "early");
                             }, 0)}
                             <span className="fw-normal ms-1" style={{ fontSize: "11px" }}>phút</span>
                           </span>
                           <span className="text-muted-light fw-medium" style={{ fontSize: "10px" }}>VỀ SỚM</span>
                        </div>
                     </div>

                     <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-3 bg-danger-soft text-danger d-flex align-items-center justify-content-center" style={{ width: "30px", height: "30px" }}>
                          <i className="bi bi-sun" style={{ fontSize: "14px" }}></i>
                        </div>
                        <div className="d-flex flex-column" style={{ lineHeight: "1.2" }}>
                            <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                              {history.filter(h => h.registeredLunch).length}
                            </span>
                            <span className="text-muted-light fw-medium" style={{ fontSize: "10px" }}>ĂN TRƯA</span>
                        </div>
                     </div>

                     <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-3 bg-primary-soft text-primary d-flex align-items-center justify-content-center" style={{ width: "30px", height: "30px" }}>
                          <i className="bi bi-moon-stars" style={{ fontSize: "14px" }}></i>
                        </div>
                        <div className="d-flex flex-column" style={{ lineHeight: "1.2" }}>
                            <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                              {history.filter(h => h.registeredDinner).length}
                            </span>
                            <span className="text-muted-light fw-medium" style={{ fontSize: "10px" }}>ĂN TỐI</span>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
              <div className="card-body p-0 flex-grow-1 overflow-auto custom-scrollbar">
                <Table
                  columns={[
                    { 
                      header: "THỜI GIAN", 
                      render: (item: any) => (
                        <div className="d-flex flex-column gap-0">
                          <div className="d-flex align-items-center gap-2">
                             <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>{formatDate(item.date)}</span>
                             <div className="d-flex gap-1">
                                {item.registeredLunch && (
                                  <span className="badge rounded-pill bg-danger-soft text-danger p-1 d-flex align-items-center justify-content-center" style={{ width: "18px", height: "18px" }}>
                                    <i className="bi bi-sun-fill" style={{ fontSize: "10px" }}></i>
                                  </span>
                                )}
                                {item.registeredDinner && (
                                  <span className="badge rounded-pill bg-primary-soft text-primary p-1 d-flex align-items-center justify-content-center" style={{ width: "18px", height: "18px" }}>
                                    <i className="bi bi-moon-stars-fill" style={{ fontSize: "10px" }}></i>
                                  </span>
                                )}
                             </div>
                             {item.isHoliday && (
                               <span className="badge rounded-pill bg-success text-white shadow-sm" style={{ fontSize: "9px", padding: "2px 8px" }}>
                                 {item.holidayName}
                               </span>
                             )}
                          </div>
                          <div className="d-flex align-items-center gap-1 opacity-50" style={{ fontSize: "10px" }}>
                             <i className="bi bi-geo-alt-fill" style={{ fontSize: "9px" }}></i>
                             <span>{branch?.name || "Văn phòng chính"}</span>
                          </div>
                        </div>
                      )
                    },
                    { 
                      header: "SÁNG (08:00 - 12:00)", 
                      render: (item: any) => (
                        <div className="d-flex align-items-center">
                          <div className="d-flex flex-column" style={{ width: "75px" }}>
                             <div className="d-flex align-items-center gap-1">
                                <span className="text-muted-light" style={{ fontSize: "9px" }}>VÀO</span>
                                {item.checkInMorning && getAttendanceStatus(item.checkInMorning, 8, 5, "in") && (
                                  <span className="text-danger" style={{ fontSize: "9px" }}>({getAttendanceStatus(item.checkInMorning, 8, 5, "in")?.label})</span>
                                )}
                             </div>
                             <span className={`fw-bold ${item.checkInMorning ? 'text-dark' : 'text-muted-light'}`} style={{ fontSize: "12px" }}>{formatTime(item.checkInMorning)}</span>
                          </div>
                          <div className="d-flex flex-column" style={{ width: "75px" }}>
                             <div className="d-flex align-items-center gap-1">
                                <span className="text-muted-light" style={{ fontSize: "9px" }}>RA</span>
                                {item.checkOutMorning && getAttendanceStatus(item.checkOutMorning, 12, 0, "out") && (
                                  <span className="text-danger" style={{ fontSize: "9px" }}>({getAttendanceStatus(item.checkOutMorning, 12, 0, "out")?.label})</span>
                                )}
                             </div>
                             <span className={`fw-bold ${item.checkOutMorning ? 'text-dark' : 'text-muted-light'}`} style={{ fontSize: "12px" }}>{formatTime(item.checkOutMorning)}</span>
                          </div>
                        </div>
                      ) 
                    },
                    { 
                      header: "CHIỀU (13:30 - 17:30)", 
                      render: (item: any) => (
                        <div className="d-flex align-items-center">
                          <div className="d-flex flex-column" style={{ width: "75px" }}>
                             <div className="d-flex align-items-center gap-1">
                                <span className="text-muted-light" style={{ fontSize: "9px" }}>VÀO</span>
                                {item.checkInAfternoon && getAttendanceStatus(item.checkInAfternoon, 13, 35, "in") && (
                                  <span className="text-danger" style={{ fontSize: "9px" }}>({getAttendanceStatus(item.checkInAfternoon, 13, 35, "in")?.label})</span>
                                )}
                             </div>
                             <span className={`fw-bold ${item.checkInAfternoon ? 'text-dark' : 'text-muted-light'}`} style={{ fontSize: "12px" }}>{formatTime(item.checkInAfternoon)}</span>
                          </div>
                          <div className="d-flex flex-column" style={{ width: "75px" }}>
                             <div className="d-flex align-items-center gap-1">
                                <span className="text-muted-light" style={{ fontSize: "9px" }}>RA</span>
                                {item.checkOutAfternoon && getAttendanceStatus(item.checkOutAfternoon, 17, 30, "out") && (
                                  <span className="text-danger" style={{ fontSize: "9px" }}>({getAttendanceStatus(item.checkOutAfternoon, 17, 30, "out")?.label})</span>
                                )}
                             </div>
                             <span className={`fw-bold ${item.checkOutAfternoon ? 'text-dark' : 'text-muted-light'}`} style={{ fontSize: "12px" }}>{formatTime(item.checkOutAfternoon)}</span>
                          </div>
                        </div>
                      ) 
                    },
                    { 
                      header: "TỔNG CÔNG", 
                      render: (item: any) => {
                        if (item.isHoliday) {
                          return (
                            <div className="d-flex flex-column align-items-center">
                               <div className="fw-bold text-success" style={{ fontSize: "14px" }}>1.00</div>
                               <span className="text-success" style={{ fontSize: "9px", fontWeight: "700" }}>NGHỈ LỄ</span>
                            </div>
                          );
                        }
                        const workday = item.workday || 0;
                        return (
                          <div className="d-flex flex-column align-items-center">
                             <div className={`fw-bold ${workday >= 1.0 ? 'text-success' : workday > 0 ? 'text-warning' : 'text-muted-light'}`} style={{ fontSize: "14px" }}>
                                {workday.toFixed(2)}
                             </div>
                             <span className="text-muted-light" style={{ fontSize: "9px", fontWeight: "600" }}>CÔNG</span>
                          </div>
                        );
                      }
                    }
                  ]}
                  rows={[
                    ...history,
                    ...holidays.filter(h => {
                      const hStart = new Date(h.startDate);
                      return hStart.getMonth() + 1 === selectedMonth && hStart.getFullYear() === selectedYear;
                    }).map(h => ({
                      id: `holiday-${h.name}`,
                      date: h.startDate,
                      isHoliday: true,
                      holidayName: h.name
                    }))
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
                  loading={loading}
                  emptyText="Chưa có dữ liệu chấm công"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .bg-danger-soft { background-color: rgba(239, 68, 68, 0.08); }
        .bg-success-soft { background-color: rgba(16, 185, 129, 0.08); }
        .bg-warning-soft { background-color: rgba(245, 158, 11, 0.08); }
        .bg-primary-soft { background-color: rgba(79, 70, 229, 0.08); }
        
        .text-danger-soft { color: #fecaca; }
        .text-success-soft { color: #a7f3d0; }
        
        .text-muted-light { color: #94a3b8; }
        
        :global(.table tr) {
          transition: all 0.2s ease;
        }
        :global(.table td) {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
          vertical-align: middle;
        }

        :global(.table tr:hover) {
          background-color: #f8fafc !important;
          transform: translateX(4px);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
