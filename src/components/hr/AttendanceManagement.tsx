"use client";

import React, { useState, useEffect } from "react";
import { getAttendanceData, getCompanyInfo } from "./attendance-actions";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

const ATTENDANCE_STEPS: ModernStepItem[] = [
  { num: 1, id: "monthly", title: "Bảng chấm công", desc: "Dữ liệu chấm công chi tiết", icon: "bi-calendar3-range" },
  { num: 2, id: "payroll", title: "Bảng lương", desc: "Tính toán và chi trả thu nhập", icon: "bi-cash-stack" },
  { num: 3, id: "lunch", title: "Đăng ký ăn trưa", desc: "Danh sách đặt cơm hằng ngày", icon: "bi-egg-fried" },
];

interface Employee {
  id: string;
  code: string;
  fullName: string;
  position: string;
  avatarUrl?: string;
  attendance: ({ code: string, label?: string, registeredLunch?: boolean, registeredDinner?: boolean, workday?: number } | null)[];
  baseSalary?: number;
  mealAllowance?: number;
  fuelAllowance?: number;
  phoneAllowance?: number;
  seniorityAllowance?: number;
  isConfirmed?: boolean;
  isPayrollConfirmed?: boolean;
}

interface Department {
  id: string;
  name: string;
  employees: Employee[];
}

const STATUS_MAP: Record<string, { label: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
  "OK": { label: "Đủ công", icon: "bi-check", color: "#10b981", bgColor: "#ecfdf5", borderColor: "#10b981" },
  "WARN": { label: "Vi phạm nhẹ (≤60p)", icon: "bi-exclamation-triangle", color: "#f59e0b", bgColor: "#fffbeb", borderColor: "#f59e0b" },
  "ERR": { label: "Vi phạm nặng", icon: "bi-x", color: "#ef4444", bgColor: "#fef2f2", borderColor: "#ef4444" },
  "P": { label: "Nghỉ phép", icon: "P", color: "#8b5cf6", bgColor: "#f5f3ff", borderColor: "#8b5cf6" },
  "-": { label: "Vắng không phép", icon: "bi-dash", color: "#ef4444", bgColor: "#fef2f2", borderColor: "#ef4444" },
  "L": { label: "Ngày lễ", icon: "L", color: "#6366f1", bgColor: "#eef2ff", borderColor: "#6366f1" },
  "OT": { label: "Làm thêm giờ", icon: "OT", color: "#0ea5e9", bgColor: "#f0f9ff", borderColor: "#0ea5e9" },
};

const DayHeader = ({ day, year, month, currentDay }: { day: number; year: number; month: number; currentDay?: number }) => {
  const dowMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const date = new Date(year, month - 1, day);
  const dow = dowMap[date.getDay()];
  const isActive = currentDay !== undefined && day === currentDay;
  const isWeekend = date.getDay() === 0; // Chỉ nghỉ Chủ Nhật

  return (
    <th 
      className="text-center py-1 border-bottom" 
      style={{ 
        width: "38px",
        backgroundColor: isActive ? "rgba(99, 102, 241, 0.1)" : (isWeekend ? "#f8fafc" : "transparent"),
        color: isActive ? "#6366f1" : "#475569"
      }}
    >
      <div className="fw-bold" style={{ fontSize: "14px" }}>{day}</div>
      <div className="fw-bold" style={{ fontSize: "9px", opacity: 0.8 }}>{dow}</div>
    </th>
  );
};

export function AttendanceManagement() {
  const [activeTab, setActiveTab] = useState<"monthly" | "lunch" | "payroll">("monthly");
  const [data, setData] = useState<Department[]>([]);
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, absentToday: 0, leaveToday: 0, workDays: 0, totalViolationMinutes: 0 });
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date(2026, 4, 1)); // May 2026
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [showLunchModal, setShowLunchModal] = useState(false);
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [positions, setPositions] = useState<{ code: string, name: string }[]>([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmPayroll, setShowConfirmPayroll] = useState(false);
  const toast = useToast();

  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();
  const daysInMonthCount = new Date(year, month, 0).getDate();
  const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
  const currentDay = (new Date().getMonth() + 1 === month && new Date().getFullYear() === year) ? new Date().getDate() : -1;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getAttendanceData(month, year);
        console.log("Attendance Data Result:", result);
        setData(result.departments);
        setStats(result.stats);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    };
    const fetchCompany = async () => {
      const info = await getCompanyInfo();
      setCompanyInfo(info);
    };

    const fetchPositions = async () => {
      try {
        const r = await fetch("/api/board/categories?type=position");
        const d = await r.json();
        setPositions(d ?? []);
      } catch (e) {}
    };

    fetchData();
    fetchCompany();
    fetchPositions();
  }, [month, year]);

  const getPositionName = (code: string) => {
    if (!code) return "—";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const filteredData = data
    .filter(dept => selectedDept === "all" || dept.name === selectedDept)
    .map(dept => ({
      ...dept,
      employees: dept.employees.filter(emp => 
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(dept => dept.employees.length > 0);

  const handlePublish = () => {
    setShowConfirm(true);
  };

  const confirmPublish = async () => {
    setLoading(true);
    setShowConfirm(false);
    try {
      const res = await fetch("/api/hr/attendance/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Thành công", result.message || "Đã phát hành thành công!");
      } else {
        toast.error("Lỗi", result.error || "Có lỗi xảy ra khi phát hành.");
      }
    } catch (error) {
      console.error("Publish Error:", error);
      toast.error("Lỗi", "Không thể kết nối với máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishPayroll = () => {
    setShowConfirmPayroll(true);
  };

  const confirmPublishPayroll = async () => {
    setLoading(true);
    setShowConfirmPayroll(false);
    try {
      const res = await fetch("/api/hr/payroll/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Thành công", result.message || "Đã phát hành phiếu lương thành công!");
      } else {
        toast.error("Lỗi", result.error || "Có lỗi xảy ra khi phát hành.");
      }
    } catch (error) {
      console.error("Publish Payroll Error:", error);
      toast.error("Lỗi", "Không thể kết nối với máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden bg-white" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
      {/* ── TABS ── */}
      <div className="bg-white border-bottom">
        <ModernStepper 
          steps={ATTENDANCE_STEPS} 
          currentStep={activeTab === "monthly" ? 1 : activeTab === "payroll" ? 2 : 3} 
          onStepChange={(num) => {
            const step = ATTENDANCE_STEPS.find(s => s.num === num);
            if (step) setActiveTab(step.id as any);
          }}
          paddingX={32}
        />
      </div>

      <div className="flex-grow-1 d-flex flex-column overflow-hidden bg-light bg-opacity-10">
        {/* ── FILTERS ── */}
        <div className="px-4 py-3 d-flex flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center bg-white rounded-pill shadow-sm border px-3" style={{ width: "180px", height: "34px" }}>
            <button className="btn btn-link btn-sm p-0 text-muted" onClick={handlePrevMonth}><i className="bi bi-chevron-left"></i></button>
            <div className="flex-grow-1 text-center fw-bold text-dark" style={{ fontSize: "13px" }}>
              Tháng {month} {year}
            </div>
            <button className="btn btn-link btn-sm p-0 text-muted" onClick={handleNextMonth}><i className="bi bi-chevron-right"></i></button>
          </div>
          
          <select 
            className="form-select rounded-pill border shadow-sm bg-white" 
            style={{ width: "160px", fontSize: "13px", height: "34px" }}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="all">Tất cả phòng ban</option>
            {data.map(dept => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>

          {activeTab === "payroll" && (
            <select className="form-select rounded-pill border shadow-sm bg-white" style={{ width: "150px", fontSize: "13px", height: "34px" }}>
              <option>Tất cả trạng thái</option>
            </select>
          )}

          {activeTab === "monthly" ? (
            <div className="flex-grow-1 position-relative">
              <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
              <input 
                type="text" 
                className="form-control rounded-pill border shadow-sm ps-5 bg-white bg-opacity-75" 
                placeholder="Tìm nhân viên..." 
                style={{ fontSize: "13px", height: "34px" }} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          ) : activeTab === "payroll" ? (
            <div className="flex-grow-1 d-flex gap-2">
              <button className="btn btn-white btn-sm rounded-pill border shadow-sm px-3" style={{ fontSize: "13px", height: "34px" }}>
                <i className="bi bi-arrow-repeat me-2"></i> Tính lương
              </button>
              <button className="btn btn-white btn-sm rounded-pill border shadow-sm px-3" style={{ fontSize: "13px", height: "34px" }}>
                <i className="bi bi-pencil me-2"></i> Bản nháp
              </button>
            </div>
          ) : (
            <div className="flex-grow-1 d-flex gap-2 align-items-center">
              <div className="position-relative">
                <i className="bi bi-calendar-event position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input 
                  type="date" 
                  className="form-control rounded-pill border shadow-sm ps-5 bg-white bg-opacity-75" 
                  style={{ fontSize: "13px", height: "34px", width: "160px" }}
                  value={summaryDate}
                  onChange={(e) => setSummaryDate(e.target.value)}
                />
              </div>
              <button 
                className="btn btn-danger btn-sm rounded-pill shadow-sm px-4" 
                style={{ fontSize: "13px", height: "34px" }}
                onClick={() => setShowLunchModal(true)}
              >
                <i className="bi bi-calculator me-2"></i> Tổng hợp suất ăn
              </button>
            </div>
          )}

          <div className="d-flex gap-2">
            {activeTab === "payroll" ? (
              <>
                <button className="btn btn-primary btn-sm rounded-pill shadow-sm px-4" style={{ fontSize: "13px", height: "34px" }}>
                  <i className="bi bi-send me-2"></i> Trình duyệt
                </button>
                <button className="btn btn-white btn-sm rounded-pill border shadow-sm px-4" style={{ fontSize: "13px", height: "34px" }}>
                  <i className="bi bi-person-check me-2"></i> Duyệt bổ sung
                </button>
                <button 
                  className="btn btn-success btn-sm rounded-pill shadow-sm px-4 hover-opacity-90 transition-all" 
                  style={{ fontSize: "13px", height: "34px" }}
                  onClick={handlePublishPayroll}
                  disabled={loading}
                >
                  <i className="bi bi-envelope-paper me-2"></i> {loading ? "Đang xử lý..." : "Phát hành phiếu lương"}
                </button>
              </>
            ) : activeTab === "monthly" ? (
              <button 
                className="btn btn-primary rounded-pill shadow-sm px-4 hover-opacity-90 transition-all" 
                style={{ fontSize: "13px", height: "34px" }}
                onClick={handlePublish}
                disabled={loading}
              >
                <i className="bi bi-send-check me-2"></i> {loading ? "Đang xử lý..." : "Phát hành phiếu chấm công"}
              </button>
            ) : null}
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        {activeTab === "monthly" && (
          <div className="px-4 pb-3">
            <div className="row g-2">
              <StatCard icon="bi-calendar-date" value={stats.workDays.toString()} label="ngày" subLabel="Ngày làm chuẩn" color="indigo" />
              <StatCard icon="bi-people" value={stats.totalEmployees.toString()} label="NV" subLabel="Nhân viên" color="cyan" />
              <StatCard icon="bi-check-circle" value={stats.presentToday.toString()} label="NV" subLabel="Có mặt hôm nay" color="emerald" />
              <StatCard icon="bi-exclamation-triangle" value={(stats.totalViolationMinutes || 0).toString()} label="phút" subLabel="Tổng vi phạm" color="amber" />
              <StatCard icon="bi-person-x" value={`${stats.absentToday} / ${stats.leaveToday}`} label="ngày" subLabel="Vắng / Nghỉ phép" color="rose" />
            </div>
          </div>
        )}

        {/* ── LEGEND ── */}
        {activeTab === "monthly" && (
          <div className="px-4 pb-3 d-flex flex-wrap gap-4 align-items-center" style={{ fontSize: "12px", color: "#475569" }}>
            {Object.entries(STATUS_MAP).map(([key, info]) => (
              <div key={key} className="d-flex align-items-center gap-2">
                <div 
                  className="d-flex align-items-center justify-content-center rounded fw-bold" 
                  style={{ 
                    width: "22px", 
                    height: "22px", 
                    backgroundColor: info.bgColor, 
                    border: `1px solid ${info.borderColor}40`, 
                    color: info.color,
                    fontSize: "10px"
                  }}
                >
                  {info.icon.startsWith("bi-") ? <i className={`bi ${info.icon}`}></i> : info.icon}
                </div>
                <span className="fw-medium">{info.label}</span>
              </div>
            ))}
            <div className="d-flex align-items-center gap-2">
              <div className="rounded border bg-light bg-opacity-50" style={{ width: "22px", height: "22px", border: "1px solid #e2e8f0" }}></div>
              <span className="fw-medium">Cuối tuần</span>
            </div>
          </div>
        )}

        {/* ── TABLE ── */}
        <div className="flex-grow-1 overflow-auto bg-white border-top mx-4 mb-4 rounded-3 shadow-sm position-relative">
          {loading ? (
            <div className="d-flex align-items-center justify-content-center h-100 py-5">
              <div className="spinner-border text-primary me-2"></div>
              <span>Đang tải dữ liệu...</span>
            </div>
          ) : activeTab === "monthly" ? (
            <table className="table mb-0" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead className="sticky-top bg-white z-10">
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th className="bg-white border-bottom p-2 align-middle" style={{ width: "220px", position: "sticky", left: 0, zIndex: 20 }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>NHÂN VIÊN</div>
                  </th>
                  {daysInMonth.map(day => (
                    <DayHeader key={day} day={day} year={year} month={month} currentDay={currentDay} />
                  ))}
                  <th className="bg-white border-bottom p-2 align-middle text-center" style={{ width: "60px" }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px" }}>CÔNG</div>
                  </th>
                  <th className="bg-white border-bottom p-2 align-middle text-center" style={{ width: "60px" }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px" }}>PHÉP</div>
                  </th>
                  <th className="bg-white border-bottom p-2 align-middle text-center" style={{ width: "60px" }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px" }}>THÊM GIỜ</div>
                  </th>
                  <th className="bg-white border-bottom p-2 align-middle text-center" style={{ width: "80px" }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px" }}>VI PHẠM</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.flatMap(dept => dept.employees).map(emp => (
                  <tr key={emp.id} className="hover-row border-bottom">
                    <td className="bg-white px-3 py-1" style={{ position: "sticky", left: 0, zIndex: 5 }}>
                      <div className="d-flex flex-column min-w-0 gap-1">
                        <div className="d-flex align-items-center gap-1">
                          <span className="fw-bold text-dark truncate" style={{ fontSize: "12px", lineHeight: "1.1" }}>{emp.fullName}</span>
                          {emp.isConfirmed && (
                            <i className="bi bi-patch-check-fill text-success" style={{ fontSize: "12px" }} title="Đã xác nhận bảng công" />
                          )}
                        </div>
                        <span className="text-muted truncate" style={{ fontSize: "10px", lineHeight: "1.1" }}>{getPositionName(emp.position)}</span>
                      </div>
                    </td>
                    {daysInMonth.map((day, idx) => {
                      const attObj = emp.attendance[idx];
                      const status = attObj?.code;
                      const label = attObj?.label;
                      const date = new Date(year, month - 1, day);
                      const isActive = day === currentDay;
                      const isWeekend = date.getDay() === 0; // Chỉ nghỉ Chủ Nhật
                      return (
                        <td 
                          key={day} 
                          className="p-0 text-center align-middle" 
                          style={{ 
                            backgroundColor: isActive ? "rgba(99, 102, 241, 0.05)" : (isWeekend ? "rgba(0,0,0,0.02)" : "transparent")
                          }}
                          title={label || ""}
                        >
                          <div className="d-flex align-items-center justify-content-center position-relative" style={{ height: "34px" }}>
                            {status ? (
                              <div 
                                className="d-flex align-items-center justify-content-center rounded fw-bold shadow-xs transition-all"
                                style={{ 
                                  width: "22px", 
                                  height: "22px", 
                                  fontSize: (status === "WARN" || status === "ERR") ? "10px" : "12px",
                                  backgroundColor: getStatusStyles(status).bgColor,
                                  border: `1px solid ${getStatusStyles(status).borderColor}40`,
                                  color: getStatusStyles(status).color,
                                }}
                              >
                                {(status === "WARN" || status === "ERR") ? (
                                  <span className="fw-normal" style={{ fontSize: "9px" }}>{attObj?.workday?.toFixed(2)}</span>
                                ) : getStatusStyles(status).icon.startsWith("bi-") ? (
                                  <i className={`bi ${getStatusStyles(status).icon}`} style={{ fontSize: "14px", fontWeight: "bold" }}></i>
                                ) : (
                                  <span style={{ fontWeight: "bold" }}>{getStatusStyles(status).icon || status}</span>
                                )}
                              </div>
                            ) : (
                              <div className="rounded" style={{ width: "24px", height: "24px", border: "1px dashed rgba(0,0,0,0.06)" }}></div>
                            )}

                            {/* Lunch Indicator */}
                              <div className="d-flex align-items-center gap-1 ms-1" style={{ position: "absolute", bottom: "2px", right: "2px", zIndex: 2 }}>
                                {attObj?.registeredLunch && (
                                  <div 
                                    className="bg-danger rounded-circle shadow-sm" 
                                    style={{ width: "7px", height: "7px", border: "1.5px solid white" }}
                                    title="Đã đăng ký ăn trưa"
                                  />
                                )}
                                {attObj?.registeredDinner && (
                                  <div 
                                    className="bg-primary rounded-circle shadow-sm" 
                                    style={{ width: "7px", height: "7px", border: "1.5px solid white" }}
                                    title="Đã đăng ký ăn tối"
                                  />
                                )}
                              </div>
                          </div>
                        </td>
                      );
                    })}
                    {(() => {
                      const công = emp.attendance.reduce((acc, a) => acc + (a?.workday || 0), 0);
                      const phép = emp.attendance.filter(a => a?.code === "P").length;
                      const ot = emp.attendance.filter(a => a?.code === "OT").length;
                      return (
                        <>
                          <td className="text-center align-middle fw-bold text-success" style={{ fontSize: "13px" }}>{công > 0 ? công.toFixed(1) : "—"}</td>
                          <td className="text-center align-middle fw-bold" style={{ fontSize: "13px", color: "#8b5cf6" }}>{phép > 0 ? phép : "—"}</td>
                          <td className="text-center align-middle fw-bold" style={{ fontSize: "13px", color: "#0ea5e9" }}>{ot > 0 ? ot : "—"}</td>
                          <td className="text-center align-middle fw-bold text-dark" style={{ fontSize: "13px" }}>—</td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === "payroll" ? (
            <table className="table mb-0" style={{ minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead className="sticky-top bg-white z-10">
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th className="bg-white border-bottom p-3 align-middle" style={{ width: "250px" }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>NHÂN VIÊN</div>
                  </th>
                  <th className="bg-white border-bottom p-3 align-middle text-center">
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>LƯƠNG CB</div>
                  </th>
                  <th className="bg-white border-bottom p-3 align-middle text-center">
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>NGÀY CÔNG</div>
                  </th>
                  <th className="bg-white border-bottom p-3 align-middle text-center">
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>PHỤ CẤP</div>
                  </th>
                  <th className="bg-white border-bottom p-3 align-middle text-center">
                    <div className="text-danger fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>KHẤU TRỪ</div>
                  </th>
                  <th className="bg-white border-bottom p-3 align-middle text-center">
                    <div className="text-warning fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>OT</div>
                  </th>
                  <th className="bg-white border-bottom p-3 align-middle text-center">
                    <div className="text-success fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>THỰC LĨNH</div>
                  </th>
                  <th className="bg-white border-bottom p-3 align-middle text-center">
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>TRẠNG THÁI</div>
                  </th>
                </tr>
                <tr className="bg-success bg-opacity-10">
                  <td colSpan={8} className="px-3 py-2">
                    <div className="d-flex align-items-center gap-2 text-success fw-bold" style={{ fontSize: "12px" }}>
                      <i className="bi bi-check-circle-fill"></i>
                      <span>ĐÃ ĐƯỢC DUYỆT LƯƠNG</span>
                      <span className="text-muted fw-normal ms-2">(0 NV - Tổng: 0 đ)</span>
                    </div>
                  </td>
                </tr>
              </thead>
              <tbody>
                {filteredData.flatMap(dept => dept.employees).map(emp => {
                  const công = emp.attendance.reduce((acc, a) => acc + (a?.workday || 0), 0);
                  const ot = emp.attendance.filter(a => a?.code === "OT").length;
                  const salary = emp.baseSalary || 0;
                  const allowances = (emp.mealAllowance || 0) + (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
                  
                  // Logic: Lương thực nhận = (Lương CB / Ngày công chuẩn) * Ngày công thực tế + Phụ cấp
                  const standardWorkDays = stats.workDays || 1; 
                  const salaryTheoCông = (salary / standardWorkDays) * công;
                  const net = salaryTheoCông + allowances;
                  
                  return (
                    <tr key={emp.id} className="hover-row border-bottom">
                      <td className="px-3 py-1">
                        <div className="d-flex flex-column min-w-0 gap-1">
                          <div className="d-flex align-items-center gap-1">
                            <span className="fw-bold text-dark truncate" style={{ fontSize: "12px" }}>{emp.fullName}</span>
                            {emp.isPayrollConfirmed && (
                              <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "12px" }} title="Đã xác nhận phiếu lương" />
                            )}
                          </div>
                          <span className="text-muted truncate" style={{ fontSize: "10px" }}>{getPositionName(emp.position)}</span>
                        </div>
                      </td>
                      <td className="text-center align-middle fw-medium" style={{ fontSize: "13px" }}>{salary.toLocaleString()}</td>
                      <td className="text-center align-middle fw-medium" style={{ fontSize: "13px" }}>{công.toFixed(1)}</td>
                      <td className="text-center align-middle fw-medium" style={{ fontSize: "13px" }}>{allowances.toLocaleString()}</td>
                      <td className="text-center align-middle fw-medium text-danger" style={{ fontSize: "13px" }}>0</td>
                      <td className="text-center align-middle fw-medium text-warning" style={{ fontSize: "13px" }}>{ot}</td>
                      <td className="text-center align-middle fw-bold text-success" style={{ fontSize: "13px" }}>{net.toLocaleString()}</td>
                      <td className="text-center align-middle">
                        <span className="badge bg-light text-muted border px-2 py-1" style={{ fontSize: "10px" }}>Bản nháp</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="table mb-0" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead className="sticky-top bg-white z-10">
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th className="bg-white border-bottom p-2 align-middle" style={{ width: "220px", position: "sticky", left: 0, zIndex: 20 }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>NHÂN VIÊN</div>
                  </th>
                  {daysInMonth.map(day => (
                    <DayHeader key={day} day={day} year={year} month={month} />
                  ))}
                  <th className="bg-white border-bottom p-2 align-middle text-center" style={{ width: "80px" }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px" }}>ĂN TRƯA</div>
                  </th>
                  <th className="bg-white border-bottom p-2 align-middle text-center" style={{ width: "80px" }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px" }}>ĂN TỐI</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.flatMap(dept => dept.employees).map(emp => {
                  const totalLunch = emp.attendance.filter(a => a?.registeredLunch).length;
                  const totalDinner = emp.attendance.filter(a => a?.registeredDinner).length;
                  return (
                    <tr key={emp.id} className="hover-row border-bottom">
                      <td className="bg-white px-3 py-1" style={{ position: "sticky", left: 0, zIndex: 5 }}>
                        <div className="d-flex flex-column min-w-0 gap-1">
                          <div className="d-flex align-items-center gap-1">
                            <span className="fw-bold text-dark truncate" style={{ fontSize: "12px", lineHeight: "1.1" }}>{emp.fullName}</span>
                            {emp.isConfirmed && (
                              <i className="bi bi-patch-check-fill text-success" style={{ fontSize: "12px" }} title="Đã xác nhận bảng công" />
                            )}
                          </div>
                          <span className="text-muted truncate" style={{ fontSize: "10px", lineHeight: "1.1" }}>{emp.code}</span>
                        </div>
                      </td>
                      {daysInMonth.map((day, idx) => {
                        const attObj = emp.attendance[idx];
                        const date = new Date(year, month - 1, day);
                        const isWeekend = date.getDay() === 0; // Chỉ nghỉ Chủ Nhật
                        return (
                          <td 
                            key={day} 
                            className="p-0 text-center align-middle" 
                            style={{ 
                              backgroundColor: isWeekend ? "rgba(0,0,0,0.02)" : "transparent"
                            }}
                          >
                            <div className="d-flex align-items-center justify-content-center gap-1" style={{ height: "34px" }}>
                              {attObj?.registeredLunch ? (
                                <div className="bg-danger rounded-circle shadow-sm" style={{ width: "12px", height: "12px", border: "2px solid white" }} title="Ăn trưa" />
                              ) : (
                                <div className="rounded-circle" style={{ width: "4px", height: "4px", backgroundColor: "rgba(0,0,0,0.03)" }}></div>
                              )}
                              {attObj?.registeredDinner ? (
                                <div className="bg-primary rounded-circle shadow-sm" style={{ width: "12px", height: "12px", border: "2px solid white" }} title="Ăn tối" />
                              ) : (
                                <div className="rounded-circle" style={{ width: "4px", height: "4px", backgroundColor: "rgba(0,0,0,0.03)" }}></div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="text-center align-middle">
                        <span className="badge bg-danger bg-opacity-10 text-danger px-2 py-1 rounded-pill fw-bold" style={{ fontSize: "12px" }}>
                          {totalLunch}
                        </span>
                      </td>
                      <td className="text-center align-middle">
                        <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-pill fw-bold" style={{ fontSize: "12px" }}>
                          {totalDinner}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showLunchModal && (
        <PrintPreviewModal
          title="Tổng hợp suất ăn"
          subtitle={`Ngày ${new Date(summaryDate).toLocaleDateString("vi-VN")}`}
          onClose={() => setShowLunchModal(false)}
          actions={
            <button 
              className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-3"
              onClick={() => printDocumentById("lunch-print", "portrait", "Danh sách suất ăn", true, "20mm")}
              style={{ borderRadius: "8px" }}
            >
              <i className="bi bi-printer"></i> In danh sách
            </button>
          }
          document={
            <div id="lunch-print" className="pdf-content-page" style={{ padding: "40px", fontFamily: "'Roboto Condensed', sans-serif" }}>
              {/* Header: Company Info */}
              <div className="d-flex justify-content-between align-items-start mb-5" style={{ borderBottom: "2px solid #333", paddingBottom: "15px" }}>
                <div className="d-flex gap-3">
                  {companyInfo?.logoUrl && (
                    <img src={companyInfo.logoUrl} alt="Logo" style={{ width: "70px", height: "70px", objectFit: "contain" }} />
                  )}
                  <div>
                    <h5 className="fw-bold text-uppercase mb-1" style={{ fontSize: "16px", color: "#003087" }}>{companyInfo?.name || "Tên công ty"}</h5>
                    <p className="mb-0 small text-muted"><i className="bi bi-geo-alt-fill me-1"></i>{companyInfo?.address}</p>
                    <p className="mb-0 small text-muted">
                      <i className="bi bi-telephone-fill me-1"></i>{companyInfo?.phone} 
                      <span className="mx-2">|</span> 
                      <i className="bi bi-envelope-fill me-1"></i>{companyInfo?.email}
                    </p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="mb-0 fw-bold small text-uppercase">Mẫu số: 02-MEAL</p>
                  <p className="mb-0 text-muted small">Mã số thuế: {companyInfo?.taxCode}</p>
                </div>
              </div>

              <div className="text-center mb-5">
                <h3 className="fw-bold text-uppercase mb-2" style={{ letterSpacing: "1px" }}>Danh sách đăng ký suất ăn</h3>
                <p className="text-muted fw-medium">Ngày {new Date(summaryDate).toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              
              <table className="table table-bordered border-dark table-sm mb-0" style={{ fontSize: "12px" }}>
                <thead>
                  <tr className="bg-light text-center">
                    <th className="py-1" style={{ width: "40px" }}>STT</th>
                    <th className="py-1" style={{ width: "220px" }}>Họ và tên</th>
                    <th className="py-1">Phòng ban</th>
                    <th className="py-1" style={{ width: "60px" }}>Trưa</th>
                    <th style={{ width: "60px" }}>Tối</th>
                    <th className="py-1" style={{ width: "120px" }}>Ký xác nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const selectedDay = new Date(summaryDate).getDate();
                    const list = filteredData.flatMap(dept => 
                      dept.employees
                        .filter(emp => emp.attendance[selectedDay - 1]?.registeredLunch || emp.attendance[selectedDay - 1]?.registeredDinner)
                        .map(emp => ({ 
                          ...emp, 
                          deptName: dept.name,
                          lunch: emp.attendance[selectedDay - 1]?.registeredLunch,
                          dinner: emp.attendance[selectedDay - 1]?.registeredDinner
                        }))
                    );

                    if (list.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-muted">Không có nhân viên nào đăng ký trong ngày này</td>
                        </tr>
                      );
                    }

                    const totalLunch = list.filter(e => e.lunch).length;
                    const totalDinner = list.filter(e => e.dinner).length;

                    return (
                      <>
                        {list.map((emp, idx) => (
                          <tr key={emp.id}>
                            <td className="text-center align-middle py-1">{idx + 1}</td>
                            <td className="fw-bold align-middle py-1">{emp.fullName}</td>
                            <td className="align-middle py-1">{emp.deptName}</td>
                            <td className="text-center align-middle py-0">
                              {emp.lunch ? <i className="bi bi-check2 text-dark" style={{ fontSize: "14px" }}></i> : ""}
                            </td>
                            <td className="text-center align-middle py-0">
                              {emp.dinner ? <i className="bi bi-check2 text-dark" style={{ fontSize: "14px" }}></i> : ""}
                            </td>
                            <td style={{ height: "30px" }}></td>
                          </tr>
                        ))}
                        <tr className="bg-light fw-bold" style={{ backgroundColor: "#f8fafc" }}>
                          <td colSpan={3} className="text-end px-3 py-1" style={{ fontSize: "11px" }}>TỔNG CỘNG SUẤT ĂN</td>
                          <td className="text-center py-1" style={{ fontSize: "13px" }}>{totalLunch}</td>
                          <td className="text-center py-1" style={{ fontSize: "13px" }}>{totalDinner}</td>
                          <td></td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>

              <div className="d-flex justify-content-between mt-5 pt-4">
                <div className="text-center" style={{ width: "200px" }}>
                  <p className="fw-bold mb-5">Người lập biểu</p>
                  <p className="mt-5">(Ký và ghi rõ họ tên)</p>
                </div>
                <div className="text-center" style={{ width: "200px" }}>
                  <p className="fw-bold mb-5">Trưởng bộ phận</p>
                  <p className="mt-5">(Ký và ghi rõ họ tên)</p>
                </div>
              </div>
            </div>
          }
          documentId="lunch-print"
          keepFirstPageMargin={true}
          printMargins="20mm"
        />
      )}

      {showConfirm && (
        <ConfirmDialog
          open={showConfirm}
          title="Xác nhận phát hành phiếu công"
          message={`Bạn có chắc chắn muốn phát hành phiếu công cho tháng ${month}/${year}? Hệ thống sẽ tổng hợp dữ liệu và gửi thông báo đến từng nhân viên để kiểm tra.`}
          confirmLabel="Phát hành ngay"
          cancelLabel="Để sau"
          variant="info"
          onConfirm={confirmPublish}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showConfirmPayroll && (
        <ConfirmDialog
          open={showConfirmPayroll}
          title="Xác nhận phát hành phiếu lương"
          message={`Bạn có chắc chắn muốn phát hành phiếu lương cho tháng ${month}/${year}? Hệ thống sẽ gửi thông báo chi tiết lương đến từng nhân viên.`}
          confirmLabel="Phát hành ngay"
          cancelLabel="Để sau"
          variant="info"
          onConfirm={confirmPublishPayroll}
          onCancel={() => setShowConfirmPayroll(false)}
        />
      )}

      <style jsx>{`
        .hover-row:hover td {
          background-color: #fbfcfd !important;
        }
        .shadow-xs {
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .btn-white {
          background: white;
        }
        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rounded-pill {
          border-radius: 50px !important;
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, value, label, subLabel, color }: { icon: string; value: string; label: string; subLabel: string; color: string }) {
  const colorMap: Record<string, string> = {
    rose: "#ef4444",
    indigo: "#6366f1",
    emerald: "#10b981",
    amber: "#f59e0b",
    cyan: "#06b6d4",
  };

  const bgMap: Record<string, string> = {
    rose: "rgba(239, 68, 68, 0.1)",
    indigo: "rgba(99, 102, 241, 0.1)",
    emerald: "rgba(16, 185, 129, 0.1)",
    amber: "rgba(245, 158, 11, 0.1)",
    cyan: "rgba(6, 182, 212, 0.1)",
  };

  return (
    <div className="col">
      <div className="p-2 rounded-3 border d-flex align-items-center gap-2 h-100 shadow-sm bg-white overflow-hidden" style={{ minHeight: "48px" }}>
        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px", backgroundColor: bgMap[color], flexShrink: 0 }}>
          <i className={`bi ${icon}`} style={{ fontSize: "18px", color: colorMap[color] }}></i>
        </div>
        <div className="d-flex flex-column min-w-0" style={{ lineHeight: "1.4" }}>
          <div className="d-flex align-items-baseline gap-1" style={{ marginBottom: "2px" }}>
            <span className="fw-bold text-dark" style={{ fontSize: "18px" }}>{value}</span>
            <span className="fw-bold" style={{ fontSize: "11px", color: colorMap[color] }}>{label}</span>
          </div>
          <span className="text-muted fw-medium truncate" style={{ fontSize: "11px" }}>{subLabel}</span>
        </div>
      </div>
    </div>
  );
}

function getStatusStyles(code: string) {
  // Mapping from DB/Logic codes to Legend codes
  const map: Record<string, string> = {
    "OK": "OK",
    "WARN": "WARN",
    "ERR": "ERR",
    "P": "P",
    "-": "-",
    "L": "L"
  };

  // If it's a weekday code like T2, T3... it means "Đủ công"
  const dowCodes = ["T2", "T3", "T4", "T5", "T6", "T7"];
  const finalCode = dowCodes.includes(code) ? "OK" : (map[code] || code);

  if (finalCode === "CN") return { label: "", icon: "", color: "transparent", bgColor: "transparent", borderColor: "transparent" };

  const info = STATUS_MAP[finalCode];
  if (info) return info;
  
  return { label: code, icon: "", color: "#64748b", bgColor: "#f1f5f9", borderColor: "#e2e8f0" };
}
