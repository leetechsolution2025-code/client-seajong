"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
  attendance: ({ code: string, label?: string, registeredLunch?: boolean, registeredDinner?: boolean, workday?: number, otHours?: number, violationMinutes?: number } | null)[];
  baseSalary?: number;
  insuranceDeduction?: number;
  mealAllowance?: number;
  fuelAllowance?: number;
  phoneAllowance?: number;
  seniorityAllowance?: number;
  payrollStatus?: string | null;
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
  "KL": { label: "Nghỉ không lương", icon: "KL", color: "#6b7280", bgColor: "#f3f4f6", borderColor: "#9ca3af" },
  "BHXH": { label: "Nghỉ ốm có BHXH", icon: "BH", color: "#ec4899", bgColor: "#fdf2f8", borderColor: "#f472b6" },
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
  const [viewDate, setViewDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [showLunchModal, setShowLunchModal] = useState(false);
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [positions, setPositions] = useState<{ code: string, name: string }[]>([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmPayroll, setShowConfirmPayroll] = useState(false);
  const [showConfirmAccounting, setShowConfirmAccounting] = useState(false);
  const [showConfirmDirector, setShowConfirmDirector] = useState(false);
  const [showConfirmApproveDirector, setShowConfirmApproveDirector] = useState(false);
  const [isAccountingApproved, setIsAccountingApproved] = useState(false);
  const [isDirectorSubmitted, setIsDirectorSubmitted] = useState(false);
  const [isDirectorApproved, setIsDirectorApproved] = useState(false);
  const toast = useToast();

  const { data: session } = useSession();
  const isDirectorUser = session?.user?.role === "admin" || 
    ((session?.user as any)?.position && (session?.user as any)?.position.includes("Giám đốc")) || 
    session?.user?.name?.includes("Lê Công Vụ") ||
    (session?.user as any)?.departmentName === "Ban Giám đốc";

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
        setIsAccountingApproved(result.isAccountingApproved || false);
        setIsDirectorSubmitted((result as any).isDirectorSubmitted || false);
        setIsDirectorApproved((result as any).isDirectorApproved || false);
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

  const handleOpenAttendanceSlip = (emp: any, deptName?: string) => {
    const công = (emp.attendance || []).reduce((acc: number, a: any) => acc + (a?.workday || 0), 0);
    const phép = (emp.attendance || []).filter((a: any) => a?.code === "P").length;
    const otHours = (emp.attendance || []).reduce((acc: number, a: any) => acc + (a?.otHours || 0), 0);
    const vắng = (emp.attendance || []).filter((a: any) => a?.code === "-").length;
    const cơmTrưa = (emp.attendance || []).filter((a: any) => a?.registeredLunch).length;
    const cơmTối = (emp.attendance || []).filter((a: any) => a?.registeredDinner).length;

    const notifItem = {
      id: `attendance-slip-${emp.id}-${month}-${year}`,
      title: `Phiếu xác nhận công tháng ${month}/${year}`,
      type: "info",
      priority: "normal",
      audienceType: "personal",
      createdById: emp.id,
      createdByName: emp.fullName,
      createdByPos: getPositionName(emp.position),
      createdByDept: deptName || emp.departmentName || "Phòng ban",
      createdAt: new Date().toISOString(),
      content:
        `## TỔNG HỢP CÔNG THÁNG ${month}/${year}\n` +
        `Chào **${emp.fullName}**,\n\n` +
        `Phòng Nhân sự gửi bạn bảng tổng hợp công chi tiết. Vui lòng kiểm tra các số liệu sau:\n\n` +
        `◦ **Tổng công thực tế**: ${công.toFixed(2)} ngày (bao gồm ngày lễ & phép)\n` +
        `◦ **Nghỉ phép (có lương)**: ${phép} ngày\n` +
        `◦ **Tăng ca (OT)**: ${otHours.toFixed(1)} giờ (đã nhân hệ số)\n` +
        `◦ **Vắng/Chưa chấm**: ${vắng} ngày\n` +
        `◦ **Số suất cơm trưa**: ${cơmTrưa} suất\n` +
        `◦ **Số suất cơm tối**: ${cơmTối} suất\n\n` +
        `--- \n` +
        `**Lưu ý**: Nhấn nút "Chi tiết" bên dưới để xem bảng chấm công từng ngày. Nếu có sai sót, vui lòng phản hồi trước ngày 05 tháng sau.\n` +
        `[ATTENDANCE_DETAILS]:${JSON.stringify({ month, year, employeeId: emp.id })}\n\n` +
        `Trân trọng!`,
    };

    window.dispatchEvent(
      new CustomEvent("open-notification-item", {
        detail: notifItem,
      })
    );
  };

  const handleOpenPayrollSlip = (emp: any, deptName?: string) => {
    const cong = (emp.attendance || []).reduce((acc: number, a: any) => acc + (a?.workday || 0), 0);
    const ot = (emp.attendance || []).reduce((acc: number, a: any) => acc + (a?.otHours || 0), 0);
    const salary = emp.baseSalary || 0;
    const mealTotal = (emp.mealAllowance || 0) * cong;
    const allowances = mealTotal + (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
    const standardWorkDays = stats.workDays || 1;
    const salaryTheoCong = (salary / standardWorkDays) * cong;
    const otSalary = ot * (salary / standardWorkDays / 8);
    const khauTruBH = emp.insuranceDeduction ?? 0;
    const net = salaryTheoCong + allowances + otSalary - khauTruBH;

    const notifItem = {
      id: `payroll-slip-${emp.id}-${month}-${year}`,
      title: `Phiếu lương tháng ${month}/${year}`,
      type: "info",
      priority: "normal",
      audienceType: "personal",
      createdById: emp.id,
      createdByName: emp.fullName,
      createdByPos: getPositionName(emp.position),
      createdByDept: deptName || emp.departmentName || "Phòng ban",
      createdAt: new Date().toISOString(),
      content:
        `## THÔNG BÁO CHI TRẢ THU NHẬP THÁNG ${month}/${year}\n` +
        `Chào **${emp.fullName}**,\n\n` +
        `Phòng Nhân sự & Kế toán gửi bạn thông tin bảng lương chi tiết. Vui lòng kiểm tra các khoản thu nhập bên dưới:\n\n` +
        `◦ **Lương cơ bản**: ${Math.round(salary).toLocaleString('vi-VN')} đ\n` +
        `◦ **Ngày công thực tế**: ${cong.toFixed(2)} ngày\n` +
        `◦ **Phụ cấp & Thưởng**: ${Math.round(allowances).toLocaleString('vi-VN')} đ\n` +
        `◦ **Tăng ca (OT)**: ${ot.toFixed(1)} giờ (${Math.round(otSalary).toLocaleString('vi-VN')} đ)\n` +
        `◦ **Khấu trừ bảo hiểm**: ${Math.round(khauTruBH).toLocaleString('vi-VN')} đ\n\n` +
        `---\n` +
        `### **THỰC LĨNH: ${Math.round(net).toLocaleString('vi-VN')} đ**\n\n` +
        `**Lưu ý**: Nhấn nút "Chi tiết" bên dưới để xem bảng kê khai phụ cấp và chi tiết công thức tính. Nếu có thắc mắc, vui lòng liên hệ phòng Kế toán nội bộ trước ngày 10 tháng sau.\n` +
        `[PAYROLL_DETAILS]:${JSON.stringify({ month, year, employeeId: emp.id })}\n\n` +
        `Trân trọng!`,
    };

    window.dispatchEvent(
      new CustomEvent("open-notification-item", {
        detail: notifItem,
      })
    );
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

  const handleSendToAccounting = () => {
    setShowConfirmAccounting(true);
  };

  const confirmSendToAccounting = async () => {
    setLoading(true);
    setShowConfirmAccounting(false);
    try {
      const res = await fetch("/api/hr/payroll/send-accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Thành công", result.message || "Đã chuyển dữ liệu bảng lương tới phòng Kế toán!");
      } else {
        toast.error("Lỗi", result.error || "Có lỗi xảy ra khi chuyển dữ liệu.");
      }
    } catch (error) {
      console.error("Send to Accounting Error:", error);
      toast.error("Lỗi", "Không thể kết nối với máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToDirector = () => {
    if (isDirectorApproved) return;
    if (isDirectorSubmitted && isDirectorUser) {
      setShowConfirmApproveDirector(true);
    } else {
      setShowConfirmDirector(true);
    }
  };

  const confirmApproveDirector = async () => {
    setLoading(true);
    setShowConfirmApproveDirector(false);
    try {
      const res = await fetch("/api/hr/payroll/approve-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Thành công", result.message || "Đã phê duyệt bảng lương thành công!");
        setIsDirectorApproved(true);
        const updated = await getAttendanceData(month, year);
        setData(updated.departments);
        setIsDirectorApproved(updated.isDirectorApproved || false);
        setIsDirectorSubmitted((updated as any).isDirectorSubmitted || false);
        setIsAccountingApproved(updated.isAccountingApproved || false);
      } else {
        toast.error("Lỗi", result.error || "Có lỗi xảy ra khi phê duyệt.");
      }
    } catch (error) {
      console.error("Approve Director Error:", error);
      toast.error("Lỗi", "Không thể kết nối với máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const confirmSendToDirector = async () => {
    setLoading(true);
    setShowConfirmDirector(false);
    try {
      const res = await fetch("/api/hr/payroll/send-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Thành công", result.message || "Đã trình Ban Giám đốc phê duyệt bảng lương!");
        setIsDirectorSubmitted(true);
        const updated = await getAttendanceData(month, year);
        setData(updated.departments);
        setIsDirectorApproved(updated.isDirectorApproved || false);
        setIsDirectorSubmitted((updated as any).isDirectorSubmitted || false);
        setIsAccountingApproved(updated.isAccountingApproved || false);
      } else {
        toast.error("Lỗi", result.error || "Có lỗi xảy ra khi trình duyệt.");
      }
    } catch (error) {
      console.error("Send to Director Error:", error);
      toast.error("Lỗi", "Không thể kết nối với máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate payroll totals for the top summary row if approved by accounting
  const totalEmployeesCount = filteredData.flatMap(dept => dept.employees).length;
  const totalNetSum = filteredData.flatMap(dept => dept.employees).reduce((acc, emp) => {
    const công = emp.attendance.reduce((c, a) => c + (a?.workday || 0), 0);
    const ot = emp.attendance.reduce((c, a) => c + (a?.otHours || 0), 0);
    const salary = emp.baseSalary || 0;
    const mealTotal = (emp.mealAllowance || 0) * công;
    const otherAllowances = (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
    const allowances = mealTotal + otherAllowances;
    const standardWorkDays = stats.workDays || 1;
    const salaryTheoCông = (salary / standardWorkDays) * công;
    const otSalary = ot * (salary / standardWorkDays / 8);
    const khauTruBH = emp.insuranceDeduction ?? 0;
    return acc + Math.round(salaryTheoCông + allowances + otSalary - khauTruBH);
  }, 0);

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
        <div className="px-3 px-md-4 py-3 d-flex flex-wrap align-items-center gap-2 gap-md-3">
          {/* Month Picker & Department/Status Select wrapper */}
          <div className="d-flex gap-2 w-md-auto-custom filters-two-cols">
            <div className="d-flex align-items-center bg-white rounded-pill shadow-sm border px-2 px-md-3 attendance-month-picker" style={{ height: "34px" }}>
              <button className="btn btn-link btn-sm p-0 text-muted" onClick={handlePrevMonth}><i className="bi bi-chevron-left"></i></button>
              <div className="flex-grow-1 text-center fw-bold text-dark" style={{ fontSize: "13px" }}>
                Tháng {month} {year}
              </div>
              <button className="btn btn-link btn-sm p-0 text-muted" onClick={handleNextMonth}><i className="bi bi-chevron-right"></i></button>
            </div>
            
            <select 
              className="form-select rounded-pill border shadow-sm bg-white attendance-dept-select" 
              style={{ fontSize: "13px", height: "34px" }}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="all">Tất cả phòng ban</option>
              {data.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          {activeTab === "monthly" ? (
            <div className="flex-grow-1 d-flex gap-2">
              <div className="position-relative flex-grow-1">
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
              <button 
                className="btn btn-primary rounded-pill shadow-sm hover-opacity-90 transition-all btn-publish-responsive d-flex align-items-center justify-content-center" 
                style={{ fontSize: "13px", height: "34px", background: "var(--bs-primary)", borderColor: "var(--bs-primary)", opacity: loading ? 0.7 : 1 }}
                onClick={handlePublish}
                disabled={loading}
              >
                <i className="bi bi-send-check" style={{ fontSize: "15px" }}></i>
                <span className="d-none d-md-inline ms-2">{loading ? "Đang xử lý..." : "Phát hành phiếu chấm công"}</span>
              </button>
            </div>
          ) : activeTab === "payroll" ? (
            <div className="flex-grow-1 d-none d-md-flex gap-2 flex-wrap justify-content-start justify-content-md-end align-items-center">
              <button className="btn btn-white btn-sm rounded-pill border shadow-sm btn-action-responsive" style={{ height: "34px" }}>
                <i className="bi bi-arrow-repeat"></i>
                <span className="d-none d-md-inline ms-2">Tính lương</span>
              </button>
              <button className="btn btn-white btn-sm rounded-pill border shadow-sm btn-action-responsive" style={{ height: "34px" }}>
                <i className="bi bi-pencil"></i>
                <span className="d-none d-md-inline ms-2">Bản nháp</span>
              </button>
              <button 
                className={`btn btn-sm rounded-pill shadow-sm transition-all hover-opacity-90 btn-action-responsive ${isAccountingApproved ? "text-muted border" : "text-white"}`} 
                style={{ 
                  height: "34px", 
                  background: isAccountingApproved 
                    ? "#f1f5f9" 
                    : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", 
                  borderColor: isAccountingApproved ? "#cbd5e1" : "transparent",
                  opacity: loading ? 0.7 : 1
                }}
                onClick={handleSendToAccounting}
                disabled={loading || isAccountingApproved}
              >
                <i className="bi bi-send-fill"></i>
                <span className="d-none d-md-inline ms-2">Chuyển kế toán</span>
              </button>
              <button 
                className={`btn btn-sm rounded-pill shadow-sm btn-action-responsive ${
                  isDirectorApproved
                    ? "btn-success text-white"
                    : isDirectorSubmitted && isDirectorUser
                    ? "btn-success text-white"
                    : "btn-primary"
                }`} 
                style={{ height: "34px" }}
                disabled={loading || !isAccountingApproved || (isDirectorApproved && !isDirectorUser) || (isDirectorSubmitted && !isDirectorUser)}
                onClick={handleSendToDirector}
              >
                <i className={`bi ${
                  isDirectorApproved
                    ? "bi-check-circle-fill"
                    : isDirectorSubmitted && isDirectorUser
                    ? "bi-check2-circle"
                    : isDirectorSubmitted
                    ? "bi-clock-history"
                    : "bi-send"
                }`}></i>
                <span className="d-none d-md-inline ms-2">
                  {loading
                    ? "Đang xử lý..."
                    : isDirectorApproved
                    ? "Đã duyệt"
                    : isDirectorSubmitted && isDirectorUser
                    ? "Duyệt bảng lương"
                    : isDirectorSubmitted
                    ? "Đã trình BGĐ"
                    : "Trình duyệt"}
                </span>
              </button>
              <button 
                className="btn btn-success btn-sm rounded-pill shadow-sm hover-opacity-90 transition-all btn-action-responsive d-flex align-items-center justify-content-center" 
                style={{ height: "34px" }}
                onClick={handlePublishPayroll}
                disabled={loading || !isAccountingApproved}
              >
                <i className="bi bi-envelope-paper"></i>
                <span className="d-none d-md-inline ms-2">{loading ? "Đang xử lý..." : "Phát hành phiếu lương"}</span>
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
        </div>

        {/* ── STAT CARDS ── */}
        {activeTab === "monthly" && (
          <div className="px-3 px-md-4 pb-3 d-none d-md-block">
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
          <div className="px-3 px-md-4 pb-3 d-none d-md-flex flex-nowrap gap-2 gap-md-3 align-items-center overflow-x-auto text-nowrap" style={{ fontSize: "11px", color: "#475569", scrollbarWidth: "none", msOverflowStyle: "none" }}>
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
        <div className="flex-grow-1 overflow-auto bg-white border-top mx-0 mx-md-4 mb-3 mb-md-4 rounded-0 rounded-md-3 shadow-sm position-relative">
          {loading ? (
            <div className="d-flex align-items-center justify-content-center h-100 py-5">
              <div className="spinner-border text-primary me-2"></div>
              <span>Đang tải dữ liệu...</span>
            </div>
          ) : activeTab === "monthly" ? (
            <table className="table mb-0" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead className="sticky-top bg-white z-10">
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th className="bg-white border-bottom p-2 align-middle fs-emp-col" style={{ width: "220px", position: "sticky", left: 0, zIndex: 20 }}>
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
                {filteredData.flatMap(dept => dept.employees.map(emp => ({ ...emp, deptName: dept.name }))).map(emp => (
                  <tr key={emp.id} className="hover-row border-bottom">
                    <td className="bg-white px-3 py-1 fs-emp-col" style={{ position: "sticky", left: 0, zIndex: 5 }}>
                      <div className="d-flex flex-column min-w-0 gap-1">
                        <div 
                          className="d-flex align-items-center gap-1"
                          style={{ cursor: "pointer" }}
                          onClick={() => handleOpenAttendanceSlip(emp, emp.deptName)}
                          title="Nhấn để xem phiếu chấm công"
                        >
                          <span className="fw-bold text-dark truncate hover-emp-name" style={{ fontSize: "12px", lineHeight: "1.1", transition: "color 0.15s" }}>{emp.fullName}</span>
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
                          <div className="d-flex align-items-center justify-content-center position-relative" style={{ height: "30px" }}>
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
                      const phép = emp.attendance.filter(a => ["P", "KL", "BHXH"].includes(a?.code || "")).length;
                      const ot = emp.attendance.reduce((acc, a) => acc + (a?.otHours || 0), 0);
                      const viPham = emp.attendance.reduce((acc, a) => acc + (a?.violationMinutes || 0), 0);
                      return (
                        <>
                          <td className="text-center align-middle fw-bold text-success" style={{ fontSize: "13px" }}>{công > 0 ? công.toFixed(1) : "—"}</td>
                          <td className="text-center align-middle fw-bold" style={{ fontSize: "13px", color: "#8b5cf6" }}>{phép > 0 ? phép : "—"}</td>
                          <td className="text-center align-middle fw-bold" style={{ fontSize: "13px", color: "#0ea5e9" }}>{ot > 0 ? ot.toFixed(1) : "—"}</td>
                          <td className="text-center align-middle fw-bold text-dark" style={{ fontSize: "13px" }}>{viPham > 0 ? `${viPham}p` : "—"}</td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === "payroll" ? (
            <table className="table mb-0 payroll-table" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead className="sticky-top bg-white z-10">
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th className="bg-white border-bottom py-2 px-3 align-middle fs-emp-col payroll-col-emp" style={{ position: "sticky", left: 0, zIndex: 20 }}>
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>NHÂN VIÊN</div>
                  </th>
                  <th className="bg-white border-bottom py-2 px-2 align-middle text-center payroll-col-base">
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>LƯƠNG CB</div>
                  </th>
                  <th className="bg-white border-bottom py-2 px-2 align-middle text-center payroll-col-days">
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>NGÀY CÔNG</div>
                  </th>
                  <th className="bg-white border-bottom py-2 px-2 align-middle text-center payroll-col-allow">
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>PHỤ CẤP</div>
                  </th>
                  <th className="bg-white border-bottom py-2 px-2 align-middle text-center payroll-col-deduct">
                    <div className="text-danger fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>KHẤU TRỪ</div>
                  </th>
                  <th className="bg-white border-bottom py-2 px-2 align-middle text-center payroll-col-ot">
                    <div className="text-warning fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>OT</div>
                  </th>
                  <th className="bg-white border-bottom py-2 px-2 align-middle text-center payroll-col-net">
                    <div className="text-success fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>THỰC LĨNH</div>
                  </th>
                  <th className="bg-white border-bottom py-2 px-2 align-middle text-center payroll-col-status">
                    <div className="text-muted fw-bold" style={{ fontSize: "11px", textTransform: "uppercase" }}>TRẠNG THÁI</div>
                  </th>
                </tr>
                {isAccountingApproved && (
                  <tr className={isDirectorApproved ? "bg-success bg-opacity-10" : isDirectorSubmitted ? "bg-warning bg-opacity-10" : "bg-primary bg-opacity-10"}>
                    <td colSpan={8} className="px-3 py-2">
                      <div className={`d-flex align-items-center gap-2 fw-bold ${isDirectorApproved ? "text-success" : isDirectorSubmitted ? "text-warning" : "text-primary"}`} style={{ fontSize: "12px" }}>
                        <i className={`bi ${isDirectorApproved ? "bi-check-circle-fill text-success" : isDirectorSubmitted ? "bi-clock-history text-warning" : "bi-check-circle-fill text-primary"}`}></i>
                        <span>
                          {isDirectorApproved 
                            ? "ĐÃ DUYỆT BẢNG LƯƠNG" 
                            : isDirectorSubmitted 
                            ? "BẢNG LƯƠNG ĐANG CHỜ GIÁM ĐỐC DUYỆT" 
                            : "KẾ TOÁN ĐÃ DUYỆT BẢNG LƯƠNG"}
                        </span>
                        <span className="text-muted fw-normal ms-2">
                          ({totalEmployeesCount} NV - Tổng: {totalNetSum.toLocaleString("vi-VN")} đ)
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredData.flatMap(dept => dept.employees.map(emp => ({ ...emp, deptName: dept.name }))).map(emp => {
                  const công = emp.attendance.reduce((acc, a) => acc + (a?.workday || 0), 0);
                  const ot = emp.attendance.reduce((acc, a) => acc + (a?.otHours || 0), 0);
                  const salary = emp.baseSalary || 0;
                  const mealTotal = (emp.mealAllowance || 0) * công;
                  const otherAllowances = (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
                  const allowances = mealTotal + otherAllowances;
                  
                  // Logic: Lương thực nhận = (Lương CB / Ngày công chuẩn) * Ngày công thực tế + Phụ cấp + Lương OT - Khấu trừ BH (đồng bộ từ BH)
                  const standardWorkDays = stats.workDays || 1; 
                  const salaryTheoCông = (salary / standardWorkDays) * công;
                  const otSalary = ot * (salary / standardWorkDays / 8);
                  const khauTruBH = emp.insuranceDeduction ?? 0;
                  const net = salaryTheoCông + allowances + otSalary - khauTruBH;
                  
                  return (
                    <tr key={emp.id} className="hover-row border-bottom">
                      <td className="bg-white px-2 py-0.5 fs-emp-col payroll-col-emp" style={{ position: "sticky", left: 0, zIndex: 5 }}>
                        <div className="d-flex flex-column min-w-0" style={{ gap: "1px" }}>
                          <div 
                            className="d-flex align-items-center gap-1"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleOpenPayrollSlip(emp, emp.deptName)}
                            title="Nhấn để xem phiếu lương"
                          >
                            <span className="fw-bold text-dark truncate hover-emp-name" style={{ fontSize: "12px", lineHeight: "1.15", transition: "color 0.15s" }}>{emp.fullName}</span>
                            {emp.isPayrollConfirmed && (
                              <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "11px" }} title="Đã xác nhận phiếu lương" />
                            )}
                          </div>
                          <span className="text-muted truncate" style={{ fontSize: "10px", lineHeight: "1.1" }}>{getPositionName(emp.position)}</span>
                        </div>
                      </td>
                      <td className="text-center align-middle fw-medium py-1" style={{ fontSize: "12.5px" }}>{salary.toLocaleString()}</td>
                      <td className="text-center align-middle fw-medium py-1" style={{ fontSize: "12.5px" }}>{công.toFixed(1)}</td>
                      <td className="text-center align-middle fw-medium py-1" style={{ fontSize: "12.5px" }}>{allowances.toLocaleString()}</td>
                      <td className="text-center align-middle fw-medium text-danger py-1" style={{ fontSize: "12.5px" }}>{Math.round(khauTruBH).toLocaleString()}</td>
                      <td className="text-center align-middle fw-medium text-warning py-1" style={{ fontSize: "12.5px" }}>{ot > 0 ? `${ot.toFixed(1)}h (${Math.round(otSalary).toLocaleString()})` : "—"}</td>
                      <td className="text-center align-middle fw-bold text-success py-1" style={{ fontSize: "12.5px" }}>{Math.round(net).toLocaleString()}</td>
                      <td className="text-center align-middle py-1">
                        {isDirectorApproved || emp.payrollStatus === "Đã duyệt" || emp.payrollStatus === "Giám đốc đã duyệt" ? (
                          <span 
                            className="badge rounded-pill border"
                            style={{ 
                              fontSize: "9.5px",
                              padding: "2px 8px",
                              backgroundColor: "rgba(16, 185, 129, 0.12)",
                              color: "#059669",
                              borderColor: "rgba(16, 185, 129, 0.25)"
                            }}
                          >
                            Đã duyệt
                          </span>
                        ) : isDirectorSubmitted || emp.payrollStatus === "Chờ Giám đốc duyệt" ? (
                          <span 
                            className="badge rounded-pill border"
                            style={{ 
                              fontSize: "9.5px",
                              padding: "2px 8px",
                              backgroundColor: "rgba(245, 158, 11, 0.12)",
                              color: "#d97706",
                              borderColor: "rgba(245, 158, 11, 0.25)"
                            }}
                          >
                            Chờ Giám đốc duyệt
                          </span>
                        ) : isAccountingApproved || emp.payrollStatus === "Kế toán đã duyệt" ? (
                          <span 
                            className="badge rounded-pill border"
                            style={{ 
                              fontSize: "9.5px",
                              padding: "2px 8px",
                              backgroundColor: "rgba(99, 102, 241, 0.12)",
                              color: "#4f46e5",
                              borderColor: "rgba(99, 102, 241, 0.25)"
                            }}
                          >
                            Kế toán đã duyệt
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border" style={{ fontSize: "9.5px", padding: "2px 8px" }}>Bản nháp</span>
                        )}
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
                  <th className="bg-white border-bottom p-2 align-middle fs-emp-col" style={{ width: "220px", position: "sticky", left: 0, zIndex: 20 }}>
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
                {filteredData.flatMap(dept => dept.employees.map(emp => ({ ...emp, departmentName: dept.name }))).map(emp => {
                  const totalLunch = emp.attendance.filter(a => a?.registeredLunch).length;
                  const totalDinner = emp.attendance.filter(a => a?.registeredDinner).length;
                  return (
                    <tr key={emp.id} className="hover-row border-bottom">
                      <td className="bg-white px-3 py-1 fs-emp-col" style={{ position: "sticky", left: 0, zIndex: 5 }}>
                        <div className="d-flex flex-column min-w-0 gap-1">
                          <div className="d-flex align-items-center gap-1">
                            <span className="fw-bold text-dark truncate" style={{ fontSize: "12px", lineHeight: "1.1" }}>{emp.fullName}</span>
                            {emp.isConfirmed && (
                              <i className="bi bi-patch-check-fill text-success" style={{ fontSize: "12px" }} title="Đã xác nhận bảng công" />
                            )}
                          </div>
                          <span className="text-muted truncate" style={{ fontSize: "10px", lineHeight: "1.1" }}>{emp.departmentName}</span>
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

        {/* Mobile bottom status bar */}
        {activeTab === "monthly" && (
          <div className="d-flex d-md-none align-items-center justify-content-around py-2 px-1 shadow-lg" style={{ height: "48px", flexShrink: 0, zIndex: 10, fontSize: "11px", background: "var(--card)", borderTop: "1px solid var(--border)", color: "var(--foreground)" }}>
            <div className="d-flex align-items-center gap-1 fw-bold">
              <i className="bi bi-calendar-date text-primary"></i>
              <span>{stats.workDays} ngày</span>
            </div>
            <div className="d-flex align-items-center gap-1 fw-bold">
              <i className="bi bi-people text-info"></i>
              <span>{stats.totalEmployees} NV</span>
            </div>
            <div className="d-flex align-items-center gap-1 fw-bold">
              <i className="bi bi-check-circle text-success"></i>
              <span>{stats.presentToday} CM</span>
            </div>
            <div className="d-flex align-items-center gap-1 fw-bold">
              <i className="bi bi-exclamation-triangle text-warning"></i>
              <span>{stats.totalViolationMinutes}p</span>
            </div>
            <div className="d-flex align-items-center gap-1 fw-bold">
              <i className="bi bi-person-x text-danger"></i>
              <span>{stats.absentToday}/{stats.leaveToday} V/P</span>
            </div>
          </div>
        )}
      </div>

      {showLunchModal && (() => {
        const selectedDay = new Date(summaryDate).getDate();
        const lunchList = filteredData.flatMap(dept => 
          dept.employees
            .filter(emp => emp.attendance[selectedDay - 1]?.registeredLunch || emp.attendance[selectedDay - 1]?.registeredDinner)
            .map(emp => ({ 
              ...emp, 
              deptName: dept.name,
              lunch: emp.attendance[selectedDay - 1]?.registeredLunch,
              dinner: emp.attendance[selectedDay - 1]?.registeredDinner
            }))
        );
        const isEmpty = lunchList.length === 0;

        return (
          <PrintPreviewModal
            title="Tổng hợp suất ăn"
            subtitle={`Ngày ${new Date(summaryDate).toLocaleDateString("vi-VN")}`}
            onClose={() => setShowLunchModal(false)}
            actions={
              <>
                {/* Nút In trên Desktop */}
                <button 
                  className="btn btn-primary btn-sm d-none d-md-flex align-items-center gap-2 px-3"
                  onClick={() => printDocumentById("lunch-print", "portrait", "Danh sách suất ăn", true, "20mm")}
                  style={{ borderRadius: "8px" }}
                  disabled={isEmpty}
                >
                  <i className="bi bi-printer"></i>
                  <span>In danh sách</span>
                </button>
                
                {/* Nút Gửi trên Mobile */}
                <button 
                  className="btn btn-primary btn-sm d-md-none d-flex align-items-center justify-content-center"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/hr/attendance/lunch-notification", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          summaryDate,
                          lunchList: lunchList.map(e => ({
                            fullName: e.fullName,
                            deptName: e.deptName,
                            lunch: e.lunch,
                            dinner: e.dinner
                          })),
                          totalLunch: lunchList.filter(e => e.lunch).length,
                          totalDinner: lunchList.filter(e => e.dinner).length
                        })
                      });
                      
                      if (res.ok) {
                        toast.success("Thành công", "Đã gửi danh sách suất ăn tới bộ phận Bếp và thông báo cho nhân viên Tạp vụ thành công!");
                      } else {
                        const errData = await res.json();
                        toast.error("Lỗi", errData.error || "Có lỗi xảy ra khi gửi danh sách.");
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("Lỗi", "Không thể kết nối tới máy chủ.");
                    }
                    setShowLunchModal(false);
                  }}
                  style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}
                  title="Gửi"
                  disabled={isEmpty}
                >
                  <i className="bi bi-send-fill" style={{ fontSize: "14px" }}></i>
                </button>
              </>
            }
            document={
              <div id="lunch-print" className="pdf-content-page" style={{ padding: "40px", fontFamily: "'Roboto Condensed', sans-serif" }}>
                {/* Header: Company Info */}
                <div className="lunch-print-header d-flex justify-content-between align-items-start mb-5" style={{ borderBottom: "2px solid #333", paddingBottom: "15px" }}>
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

                <div className="text-center mb-4 mb-md-5">
                  <h3 className="lunch-print-title fw-bold text-uppercase mb-2" style={{ letterSpacing: "1px" }}>Danh sách đăng ký suất ăn</h3>
                  <p className="text-muted fw-medium">Ngày {new Date(summaryDate).toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                
                <table className="table table-bordered border-dark table-sm mb-0" style={{ fontSize: "12px" }}>
                  <thead>
                    <tr className="bg-light text-center">
                      <th className="py-1" style={{ width: "40px" }}>STT</th>
                      <th className="py-1" style={{ width: "220px" }}>
                        <span className="d-none d-md-inline">Họ và tên</span>
                        <span className="d-md-none">Nhân viên / Phòng ban</span>
                      </th>
                      <th className="py-1 col-phong-ban">Phòng ban</th>
                      <th className="py-1" style={{ width: "60px" }}>Trưa</th>
                      <th style={{ width: "60px" }}>Tối</th>
                      <th className="py-1 col-ky-nhan" style={{ width: "120px" }}>Ký xác nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const totalLunch = lunchList.filter(e => e.lunch).length;
                      const totalDinner = lunchList.filter(e => e.dinner).length;

                      return (
                        <>
                          {isEmpty ? (
                            <tr>
                              <td colSpan={6} className="text-center py-4 text-muted d-none d-md-table-cell">Không có nhân viên nào đăng ký trong ngày này</td>
                              <td colSpan={4} className="text-center py-4 text-muted d-md-none">Không có nhân viên nào đăng ký trong ngày này</td>
                            </tr>
                          ) : (
                            lunchList.map((emp, idx) => (
                              <tr key={emp.id}>
                                <td className="text-center align-middle py-1">{idx + 1}</td>
                                <td className="fw-bold align-middle py-1">
                                  <div>{emp.fullName}</div>
                                  <div className="text-muted d-md-none fw-normal" style={{ fontSize: "10.5px", marginTop: "2px" }}>
                                    {emp.deptName}
                                  </div>
                                </td>
                                <td className="align-middle py-1 col-phong-ban">{emp.deptName}</td>
                                <td className="text-center align-middle py-0">
                                  {emp.lunch ? <i className="bi bi-check2 text-dark" style={{ fontSize: "14px" }}></i> : ""}
                                </td>
                                <td className="text-center align-middle py-0">
                                  {emp.dinner ? <i className="bi bi-check2 text-dark" style={{ fontSize: "14px" }}></i> : ""}
                                </td>
                                <td className="col-ky-nhan" style={{ height: "30px" }}></td>
                              </tr>
                            ))
                          )}
                          <tr className="bg-light fw-bold total-row-desktop" style={{ backgroundColor: "#f8fafc" }}>
                            <td colSpan={3} className="text-end px-3 py-1" style={{ fontSize: "11px" }}>TỔNG CỘNG SUẤT ĂN</td>
                            <td className="text-center py-1" style={{ fontSize: "13px" }}>{totalLunch}</td>
                            <td className="text-center py-1" style={{ fontSize: "13px" }}>{totalDinner}</td>
                            <td className="col-ky-nhan"></td>
                          </tr>
                          <tr className="bg-light fw-bold total-row-mobile" style={{ backgroundColor: "#f8fafc" }}>
                            <td colSpan={2} className="text-end px-3 py-1" style={{ fontSize: "11px" }}>TỔNG CỘNG</td>
                            <td className="text-center py-1" style={{ fontSize: "13px" }}>{totalLunch}</td>
                            <td className="text-center py-1" style={{ fontSize: "13px" }}>{totalDinner}</td>
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
        );
      })()}

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

      {showConfirmAccounting && (
        <ConfirmDialog
          open={showConfirmAccounting}
          title="Xác nhận chuyển bảng lương cho phòng Kế toán"
          message={`Bạn có chắc chắn muốn chuyển bảng lương tháng ${month}/${year} tới phòng Kế toán? Hệ thống sẽ gửi thông báo tổng hợp và chi tiết số liệu tới tất cả nhân viên bộ phận này.`}
          confirmLabel="Xác nhận chuyển"
          cancelLabel="Hủy"
          variant="info"
          onConfirm={confirmSendToAccounting}
          onCancel={() => setShowConfirmAccounting(false)}
        />
      )}

      {showConfirmDirector && (
        <ConfirmDialog
          open={showConfirmDirector}
          title="Xác nhận trình Ban Giám đốc phê duyệt bảng lương"
          message={`Bạn có chắc chắn muốn trình bảng lương tháng ${month}/${year} lên Ban Giám đốc phê duyệt? Hệ thống sẽ gửi thông báo và hồ sơ trình duyệt đến Ban Giám đốc.`}
          confirmLabel="Trình duyệt ngay"
          cancelLabel="Hủy"
          variant="info"
          onConfirm={confirmSendToDirector}
          onCancel={() => setShowConfirmDirector(false)}
        />
      )}

      {showConfirmApproveDirector && (
        <ConfirmDialog
          open={showConfirmApproveDirector}
          title="Xác nhận phê duyệt bảng lương"
          message={`Bạn có chắc chắn muốn phê duyệt bảng lương tháng ${month}/${year} với vai trò Giám đốc? Sau khi duyệt, trạng thái bảng lương sẽ chuyển thành "Đã duyệt" và tự động kết chuyển sang tab Lệnh chi tiền.`}
          confirmLabel="Phê duyệt ngay"
          cancelLabel="Hủy"
          variant="info"
          onConfirm={confirmApproveDirector}
          onCancel={() => setShowConfirmApproveDirector(false)}
        />
      )}

      {/* Bottom Action Bar for Mobile - Step 2 (Payroll) */}
      {activeTab === "payroll" && (
        <div className="d-md-none sticky-bottom-bar">
          <div className="d-flex align-items-center justify-content-around">
            <button className="btn-action-mobile">
              <i className="bi bi-arrow-repeat"></i>
              <span className="action-label">Tính lương</span>
            </button>
            <button className="btn-action-mobile">
              <i className="bi bi-pencil"></i>
              <span className="action-label">Bản nháp</span>
            </button>
            <button 
              className={`btn-action-mobile ${(!isAccountingApproved && !loading) ? "btn-action-mobile-send-active" : ""}`} 
              onClick={handleSendToAccounting}
              disabled={loading || isAccountingApproved}
            >
              <i className="bi bi-send-fill"></i>
              <span className="action-label">Gửi Kế toán</span>
            </button>
            <button 
              className={`btn-action-mobile ${(isAccountingApproved && !loading) ? "btn-action-mobile-approve-active" : ""}`}
              disabled={loading || !isAccountingApproved || (isDirectorApproved && !isDirectorUser) || (isDirectorSubmitted && !isDirectorUser)}
              onClick={handleSendToDirector}
            >
              <i className={`bi ${
                isDirectorApproved 
                  ? "bi-check-circle-fill text-success" 
                  : isDirectorSubmitted && isDirectorUser 
                  ? "bi-check2-circle text-success" 
                  : isDirectorSubmitted 
                  ? "bi-clock-history" 
                  : "bi-send"
              }`}></i>
              <span className="action-label">
                {isDirectorApproved 
                  ? "Đã duyệt" 
                  : isDirectorSubmitted && isDirectorUser 
                  ? "Duyệt lương" 
                  : isDirectorSubmitted 
                  ? "Đã trình" 
                  : "Trình duyệt"}
              </span>
            </button>
            <button 
              className={`btn-action-mobile ${(isAccountingApproved && !loading) ? "btn-action-mobile-publish-active" : ""}`}
              onClick={handlePublishPayroll}
              disabled={loading || !isAccountingApproved}
            >
              <i className="bi bi-envelope-paper"></i>
              <span className="action-label">Phát hành</span>
            </button>
          </div>
        </div>
      )}


      <style jsx>{`
        .hover-row:hover td {
          background-color: #fbfcfd !important;
        }
        .hover-emp-name:hover {
          color: var(--bs-primary) !important;
          text-decoration: underline;
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
    "KL": "KL",
    "BHXH": "BHXH",
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
