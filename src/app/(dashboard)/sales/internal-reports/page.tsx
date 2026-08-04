"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { ModernStepper } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { useToast } from "@/components/ui/Toast";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const step1KpiCriteriaData: any[] = [];
const step2KpiCriteriaData: any[] = [];

export default function PartnerActivitiesPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [employee, setEmployee] = useState<any>(null);
  const [positions, setPositions] = useState<{code: string, name: string}[]>([]);
  const [workLocations, setWorkLocations] = useState<{code: string, name: string}[]>([]);
  const [reportMonth, setReportMonth] = useState(new Date());
  const [salesEmployees, setSalesEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [applyAllYear, setApplyAllYear] = useState(false);
  const [step1KpiConfig, setStep1KpiConfig] = useState<any[]>([]);
  const [step2KpiConfig, setStep2KpiConfig] = useState<any[]>([]);
  const [incomeData, setIncomeData] = useState({
    baseSalary: 0,
    performanceBonus: 0,
    allowance: 0,
    salesCommission: 0,
    totalIncome: 0
  });
  const [yearlyKpi, setYearlyKpi] = useState<any[]>(Array(12).fill(null));

  const handlePrevMonth = () => setReportMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setReportMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  useEffect(() => {
    fetch("/api/board/categories?type=position").then(r => r.json()).then(d => setPositions(d || [])).catch(() => {});
    fetch("/api/board/categories?type=dia_diem_lam_viec").then(r => r.json()).then(d => setWorkLocations(d || [])).catch(() => {});
    
    // Lấy danh sách nhân viên phòng kinh doanh
    fetch("/api/hr/employees?pageSize=1000")
      .then(r => r.json())
      .then(d => {
        if (d?.employees) {
          const salesEmp = d.employees.filter((e: any) => e.departmentName && e.departmentName.toLowerCase().includes("kinh doanh"));
          setSalesEmployees(salesEmp);
        }
      })
      .catch(() => {});

  }, []);

  useEffect(() => {
    const month = reportMonth.getMonth() + 1;
    const year = reportMonth.getFullYear();

    // Fetch Manager Report
    fetch(`/api/sales/internal-reports/reports?month=${month}&year=${year}&type=MANAGER`)
      .then(r => r.json())
      .then(d => {
        if (d?.success && d.data) {
          const formatCriteria = (c: any) => ({
            id: c.id,
            name: c.name,
            target: c.target.toLocaleString("en-US"),
            actual: c.actual.toLocaleString("en-US"),
            weight: c.weight + "%",
            score: c.score.toString()
          });
          setStep1KpiConfig(d.data.map(formatCriteria));
        }
      })
      .catch(console.error);

    // Fetch Staff Report
    let staffUrl = `/api/sales/internal-reports/reports?month=${month}&year=${year}&type=STAFF`;
    const targetEmployeeId = selectedEmployeeId || employee?.id;
    if (targetEmployeeId) {
      staffUrl += `&employeeId=${targetEmployeeId}`;
    }
    fetch(staffUrl)
      .then(r => r.json())
      .then(d => {
        if (d?.success && d.data) {
          const formatCriteria = (c: any) => ({
            id: c.id,
            name: c.name,
            target: c.target.toLocaleString("en-US"),
            actual: c.actual.toLocaleString("en-US"),
            weight: c.weight + "%",
            score: c.score.toString()
          });
          setStep2KpiConfig(d.data.map(formatCriteria));
        }
      })
      .catch(console.error);

    // Fetch Income
    let incomeUrl = `/api/sales/internal-reports/income?month=${month}&year=${year}&type=${currentStep === 1 ? 'MANAGER' : 'STAFF'}`;
    if (targetEmployeeId) incomeUrl += `&employeeId=${targetEmployeeId}`;
    fetch(incomeUrl)
      .then(r => r.json())
      .then(d => {
         if(d?.success && d.data) setIncomeData(d.data);
      })
      .catch(console.error);

    // Fetch Yearly KPI
    let yearlyUrl = `/api/sales/internal-reports/reports/yearly?year=${year}&type=${currentStep === 1 ? 'MANAGER' : 'STAFF'}`;
    if (targetEmployeeId) yearlyUrl += `&employeeId=${targetEmployeeId}`;
    fetch(yearlyUrl)
      .then(r => r.json())
      .then(d => {
         if(d?.success && d.data) setYearlyKpi(d.data);
      })
      .catch(console.error);

  }, [reportMonth, selectedEmployeeId, currentStep, employee?.id]);

  // Snap back to current month if user switches to step 1/2 from a future month in step 3
  useEffect(() => {
    if (currentStep === 1 || currentStep === 2) {
      const now = new Date();
      if (
        reportMonth.getFullYear() > now.getFullYear() ||
        (reportMonth.getFullYear() === now.getFullYear() && reportMonth.getMonth() > now.getMonth())
      ) {
        setReportMonth(new Date());
      }
    }
  }, [currentStep, reportMonth]);

  const getPositionName = (code: string | undefined | null) => {
    if (!code) return "Nhân viên";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const displayedEmployee = React.useMemo(() => {
    if (currentStep === 1) {
      // Báo cáo lãnh đạo phòng: Phải hiển thị Trưởng phòng kinh doanh
      return salesEmployees.find(e => getPositionName(e.position).toLowerCase().includes("trưởng phòng")) || employee;
    } else if (currentStep === 2) {
      // Báo cáo nhân viên: Hiển thị nhân viên được chọn, nếu không thì hiển thị employee (nếu họ là nhân viên)
      return salesEmployees.find(e => e.id === selectedEmployeeId) || employee;
    }
    return employee;
  }, [currentStep, selectedEmployeeId, salesEmployees, employee, positions]);

  const calculatedIncome = React.useMemo(() => {
    const baseSalary = displayedEmployee?.baseSalary || 0;
    const allowance = (displayedEmployee?.mealAllowance || 0) + 
                      (displayedEmployee?.fuelAllowance || 0) + 
                      (displayedEmployee?.phoneAllowance || 0) + 
                      (displayedEmployee?.seniorityAllowance || 0);
    const performanceBonus = incomeData.performanceBonus || 0;
    const salesCommission = incomeData.salesCommission || 0;
    
    const totalIncome = baseSalary + allowance + performanceBonus + salesCommission;
    
    return {
      baseSalary,
      allowance,
      performanceBonus,
      salesCommission,
      totalIncome
    };
  }, [displayedEmployee, incomeData]);

  const getLocationName = (code: string | undefined | null) => {
    if (!code) return "Chưa cập nhật";
    if (code === "main") return "Trụ sở chính";
    const loc = workLocations.find((l: any) => l.code === code);
    return loc ? loc.name : code;
  };

  const getAvatarInitials = (fullName: string | undefined | null) => {
    if (!fullName) return "NV";
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const empId = (session?.user as any)?.employeeId;
    if (empId) {
      fetch(`/api/hr/employees/${empId}`)
        .then(r => r.json())
        .then(d => {
          if (d?.employee) {
            setEmployee(d.employee);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const currentMonth = new Date().getMonth() + 1;
  const validData = yearlyKpi.filter(val => val !== null);
  const avgKpi = validData.length > 0 ? Math.round(validData.reduce((a, b) => a + b, 0) / validData.length) : 0;
  
  const kpiCategories = Array.from({ length: 12 }, (_, i) => `${i + 1}`);

  const calculateScore = (targetStr: string, actualStr: string, weightStr: string) => {
    const parseNumber = (str: string) => Number(str.replace(/,/g, "").replace(/%/g, "").trim());
    const target = parseNumber(targetStr);
    const actual = parseNumber(actualStr);
    const weight = parseNumber(weightStr);

    if (target === 0 || isNaN(target) || isNaN(actual) || isNaN(weight)) return 0;
    
    // Điểm = (Thực tế / Chỉ tiêu) * Trọng số
    const completion = actual / target;
    const score = completion * weight;
    
    return Math.round(score);
  };

  const step1KpiCriteria = step1KpiConfig;
  const step2KpiCriteria = step2KpiConfig;

  const step1TotalWeight = step1KpiConfig.reduce((sum, item) => sum + (parseFloat(item.weight.replace(/%/g, '')) || 0), 0);
  const step2TotalWeight = step2KpiConfig.reduce((sum, item) => sum + (parseFloat(item.weight.replace(/%/g, '')) || 0), 0);

  const step1TotalScore = step1KpiCriteria.reduce((sum, item) => sum + calculateScore(item.target, item.actual, item.weight), 0);
  const step2TotalScore = step2KpiCriteria.reduce((sum, item) => sum + calculateScore(item.target, item.actual, item.weight), 0);

  const selectedMonthIndex = reportMonth.getMonth();
  const kpiData1 = Array.from({ length: 12 }, (_, i) => {
    if (i === selectedMonthIndex) {
      return currentStep === 1 ? Math.round(step1TotalScore) : Math.round(step2TotalScore);
    }
    return yearlyKpi[i];
  });
  const kpiData2 = Array.from({ length: 12 }, (_, i) => {
    if (i === selectedMonthIndex) return Math.round(step2TotalScore);
    return yearlyKpi[i];
  });
  
  const computeAvg = (data: (number | null)[]) => {
    const valid = data.filter(v => v !== null) as number[];
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  };
  
  const avgData1 = Array.from({ length: 12 }, (_, i) => i < currentMonth ? computeAvg(kpiData1) : null);
  const avgData2 = Array.from({ length: 12 }, (_, i) => i < currentMonth ? computeAvg(kpiData2) : null);

  const isManager = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "MANAGER" || (session?.user as any)?.role === "SUPERADMIN";
  const currentUserEmployee = salesEmployees.find(e => e.userId === (session?.user as any)?.id);
  const isDepartmentHead = currentUserEmployee?.position === "vtr-20260401-1964-sbmg" || currentUserEmployee?.position?.toLowerCase().includes("trưởng phòng") || (session?.user as any)?.positionName?.includes("Trưởng phòng") || (session?.user as any)?.position === "vtr-20260401-1964-sbmg";
  
  const canAccessManagementTabs = isManager || isDepartmentHead;

  useEffect(() => {
    // Nếu không có quyền quản lý và đang ở tab Lãnh đạo phòng thì chuyển sang tab Nhân viên
    if (!canAccessManagementTabs && (currentStep === 1 || currentStep === 3)) {
      setCurrentStep(2);
    }
  }, [canAccessManagementTabs, currentStep]);

  const STEPS = [
    { num: 1, id: "manager", title: "Lãnh đạo phòng", desc: "Báo cáo tổng hợp cho quản lý", icon: "bi-person-badge", locked: !canAccessManagementTabs },
    { num: 2, id: "staff", title: "Nhân viên phòng", desc: "Báo cáo chi tiết theo nhân sự", icon: "bi-people" },
    { num: 3, id: "settings", title: "Thiết lập thông số", desc: "Cấu hình chỉ số báo cáo", icon: "bi-gear", locked: !canAccessManagementTabs },
  ];

  return (
    <StandardPage
      title="Báo cáo nội bộ"
      description="Báo cáo nội bộ phòng kinh doanh"
      color="blue"
      icon="bi-file-earmark-bar-graph-fill"
      useCard={false}
    >
      <WorkflowCard
        contentPadding="p-0"
        stepper={
          <ModernStepper
            steps={STEPS}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            paddingX={0}
            paddingY={8}
          />
        }
      >
        <div className="flex-grow-1 d-flex flex-column overflow-hidden h-100" style={{ minHeight: 0 }}>
          {currentStep === 1 && (
            <div className="flex-grow-1 h-100 d-flex w-100 overflow-hidden" style={{ minHeight: 0 }}>
              {/* Cột trái (tỷ lệ 5/12) */}
              <div className="flex-shrink-0 h-100 d-flex flex-column custom-scrollbar overflow-auto" style={{ width: "41.666667%", padding: "20px 24px" }}>
                <div className="row g-3">
                  <div className="col-5">
                    <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: 220 }}>
                      <span className="fw-bold text-muted mb-1" style={{ fontSize: 12 }}>ĐIỂM HIỆU SUẤT</span>
                      <div style={{ marginTop: -15, marginBottom: -25 }}>
                        <ReactApexChart 
                          type="radialBar" 
                          height={190} 
                          series={[Math.round(step1TotalScore)]}
                          options={{
                            chart: { fontFamily: "inherit", sparkline: { enabled: true } },
                            plotOptions: {
                              radialBar: {
                                hollow: { size: "60%" },
                                track: { background: "rgba(0,0,0,0.04)" },
                                dataLabels: {
                                  name: { show: false },
                                  value: {
                                    offsetY: 8,
                                    fontSize: "28px",
                                    fontWeight: 800,
                                    color: "var(--foreground)",
                                    formatter: (val) => `${val}`
                                  }
                                }
                              }
                            },
                            fill: {
                              type: "gradient",
                              gradient: {
                                shade: "dark",
                                type: "horizontal",
                                gradientToColors: ["#8b5cf6"],
                                stops: [0, 100]
                              }
                            },
                            colors: ["#3b82f6"],
                            stroke: { lineCap: "round" }
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-7">
                    <div className="d-flex flex-column justify-content-center h-100 ps-2">
                      <h6 className="fw-bold text-dark mb-3" style={{ fontSize: 13 }}>THÔNG TIN NHÂN VIÊN</h6>
                      <div className="d-flex align-items-center mb-3 pb-3 border-bottom" style={{ borderBottomStyle: "dashed" }}>
                        {displayedEmployee?.avatarUrl ? (
                          <img src={displayedEmployee.avatarUrl} alt="Avatar" className="rounded-circle me-3 shadow-sm" style={{ width: 42, height: 42, objectFit: "cover" }} />
                        ) : (
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 shadow-sm" style={{ width: 42, height: 42, fontSize: 15 }}>
                            {getAvatarInitials(displayedEmployee?.fullName)}
                          </div>
                        )}
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: 14 }}>{displayedEmployee?.fullName || "Đang tải..."}</div>
                          <div className="text-secondary" style={{ fontSize: 11 }}>{getPositionName(displayedEmployee?.position)}</div>
                        </div>
                      </div>
                      
                      <div className="d-flex flex-column gap-2" style={{ fontSize: 11.5 }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-telephone me-2 text-secondary"></i>Điện thoại:</span>
                          <span className="fw-medium text-dark">{displayedEmployee?.phone || "Chưa cập nhật"}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-envelope me-2 text-secondary"></i>Email:</span>
                          <span className="fw-medium text-dark">{displayedEmployee?.workEmail || displayedEmployee?.personalEmail || "Chưa cập nhật"}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-geo-alt me-2 text-secondary"></i>Địa điểm làm việc:</span>
                          <span className="fw-medium text-dark">{getLocationName(displayedEmployee?.workLocation)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-top pt-4">
                  <h6 className="fw-bold text-dark mb-3" style={{ fontSize: 13 }}>CHI TIẾT ĐIỂM KPI CÁC THÁNG</h6>
                  <div style={{ marginLeft: -15, marginRight: -15 }}>
                    <ReactApexChart 
                      type="line"
                      height={210}
                      series={[
                        { name: "Điểm KPI", type: "column", data: kpiData1 },
                        { name: "Trung bình", type: "line", data: avgData1 }
                      ]}
                      options={{
                        chart: { fontFamily: "inherit", toolbar: { show: false }, zoom: { enabled: false } },
                        plotOptions: {
                          bar: { 
                            borderRadius: 4, 
                            columnWidth: "40%",
                            colors: {
                              ranges: [
                                { from: 0, to: 49.99, color: '#ef4444' },
                                { from: 50, to: 80, color: '#f59e0b' },
                                { from: 80.01, to: 100, color: '#3b82f6' }
                              ]
                            }
                          }
                        },
                        colors: ["#3b82f6", "#f59e0b"],
                        stroke: { width: [0, 2], curve: "smooth", dashArray: [0, 4] },
                        xaxis: { categories: kpiCategories, labels: { style: { colors: "var(--bs-gray-500)", fontSize: "11px" } } },
                        yaxis: { max: 100, min: 0, tickAmount: 5, labels: { style: { colors: "var(--bs-gray-500)", fontSize: "11px" } } },
                        dataLabels: { enabled: false },
                        legend: { position: "top", horizontalAlign: "right", fontSize: "12px" },
                        grid: { strokeDashArray: 3, borderColor: "var(--border)" }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Đường ngăn cách (có khoảng trống 2 đầu, hiệu ứng chìm) */}
              <div 
                className="my-4 flex-shrink-0" 
                style={{ 
                  width: 2, 
                  backgroundColor: "var(--border)", 
                  opacity: 0.8,
                  borderRight: "1px solid rgba(255, 255, 255, 0.7)", 
                  boxShadow: "inset 1px 0 2px rgba(0,0,0,0.05)" 
                }} 
              />

              {/* Cột phải (tỷ lệ 7/12) */}
              <div className="flex-grow-1 h-100 d-flex flex-column custom-scrollbar overflow-auto" style={{ padding: "20px 24px" }}>
                <h6 className="fw-bold text-dark mb-4 text-uppercase" style={{ fontSize: 13 }}>Hệ thống đánh giá kết quả công việc</h6>
                <div className="d-flex align-items-center mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-sm btn-light border shadow-sm" onClick={handlePrevMonth} style={{ width: 32, height: 32, padding: 0 }}>
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="fw-bold px-3 py-1 bg-white border rounded shadow-sm text-dark" style={{ fontSize: 14 }}>
                      Tháng {reportMonth.getMonth() + 1}, {reportMonth.getFullYear()}
                    </span>
                    <button className="btn btn-sm btn-light border shadow-sm" onClick={handleNextMonth} style={{ width: 32, height: 32, padding: 0 }} disabled={reportMonth.getFullYear() > new Date().getFullYear() || (reportMonth.getFullYear() === new Date().getFullYear() && reportMonth.getMonth() >= new Date().getMonth())}>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </div>
                <div className="flex-grow-1 overflow-hidden d-flex flex-column" style={{ minHeight: 0 }}>
                  <div className="flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                    <FullWidthTableLayout
                    table={
                      <div className="h-100 overflow-auto custom-scrollbar full-width-table-wrapper">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                          <thead className="bg-light" style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--card)" }}>
                            <tr style={{ height: 36 }}>
                              <th className="border-0 text-center" style={{ width: "5%", minWidth: "50px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>STT</th>
                              <th className="border-0 text-uppercase" style={{ width: "35%", minWidth: "150px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Tiêu chí đánh giá</th>
                              <th className="border-0 text-uppercase text-center" style={{ width: "15%", minWidth: "80px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Chỉ tiêu</th>
                              <th className="border-0 text-uppercase text-center" style={{ width: "15%", minWidth: "80px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Thực tế</th>
                              <th className="border-0 text-uppercase text-center" style={{ width: "15%", minWidth: "80px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Trọng số</th>
                              <th className="border-0 text-uppercase text-center" style={{ width: "15%", minWidth: "80px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Điểm số</th>
                            </tr>
                          </thead>
                          <tbody>
                            {step1KpiCriteria.map((item, idx) => {
                              const score = calculateScore(item.target, item.actual, item.weight);
                              const maxScore = Number(item.weight.replace("%", ""));
                              const completionPercent = (score / maxScore) * 100;
                              return (
                                <tr key={idx}>
                                  <td className="text-center text-muted">{idx + 1}</td>
                                  <td className="fw-medium text-dark">{item.name}</td>
                                  <td className="text-center text-muted">
                                    {item.target}{(item.name.toLowerCase().includes("tỷ lệ") || item.name.toLowerCase().includes("thu hồi công nợ")) ? "%" : ""}
                                  </td>
                                  <td className="text-center fw-medium" style={{ color: "var(--bs-primary)" }}>
                                    {item.actual}{(item.name.toLowerCase().includes("tỷ lệ") || item.name.toLowerCase().includes("thu hồi công nợ")) ? "%" : ""}
                                  </td>
                                  <td className="text-center text-muted">{item.weight}</td>
                                  <td className="text-center fw-bold" style={{ color: completionPercent >= 90 ? "var(--bs-success)" : completionPercent >= 80 ? "var(--bs-warning)" : "var(--bs-danger)" }}>
                                    {score}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="mt-4 pb-3 flex-shrink-0" style={{ paddingLeft: 8, paddingRight: 8 }}>
                          <h6 className="fw-bold text-dark text-uppercase mb-3" style={{ fontSize: 13 }}>Khung thu nhập</h6>
                          <div className="row g-3 align-items-center">
                            <div className="col-md-5 border-end">
                              <div className="text-muted mb-1 text-uppercase" style={{ fontSize: 11, fontWeight: 600 }}>Tổng thu nhập</div>
                              <div className="fw-bold text-primary" style={{ fontSize: 24 }}>{calculatedIncome.totalIncome.toLocaleString()} <span style={{ fontSize: 14 }}>đ</span></div>
                            </div>
                            <div className="col-md-7">
                              <div className="row g-3">
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Lương cơ bản</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>{calculatedIncome.baseSalary.toLocaleString()} đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Lương hiệu suất</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>{calculatedIncome.performanceBonus.toLocaleString()} đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Phụ cấp</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>{calculatedIncome.allowance.toLocaleString()} đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Hoa hồng bán hàng</div>
                                  <div className="fw-bold text-success" style={{ fontSize: 13 }}>{calculatedIncome.salesCommission.toLocaleString()} đ</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="flex-grow-1 h-100 d-flex w-100 overflow-hidden" style={{ minHeight: 0 }}>
              {/* Cột trái (tỷ lệ 5/12) */}
              <div className="flex-shrink-0 h-100 d-flex flex-column custom-scrollbar overflow-auto" style={{ width: "41.666667%", padding: "20px 24px" }}>
                <div className="row g-3">
                  <div className="col-5">
                    <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: 220 }}>
                      <span className="fw-bold text-muted mb-1" style={{ fontSize: 12 }}>ĐIỂM HIỆU SUẤT</span>
                      <div style={{ marginTop: -15, marginBottom: -25 }}>
                        <ReactApexChart 
                          type="radialBar" 
                          height={190} 
                          series={[Math.round(step2TotalScore)]}
                          options={{
                            chart: { fontFamily: "inherit", sparkline: { enabled: true } },
                            plotOptions: {
                              radialBar: {
                                hollow: { size: "60%" },
                                track: { background: "rgba(0,0,0,0.04)" },
                                dataLabels: {
                                  name: { show: false },
                                  value: {
                                    offsetY: 8,
                                    fontSize: "28px",
                                    fontWeight: 800,
                                    color: "var(--foreground)",
                                    formatter: (val) => `${val}`
                                  }
                                }
                              }
                            },
                            fill: {
                              type: "gradient",
                              gradient: {
                                shade: "dark",
                                type: "horizontal",
                                gradientToColors: ["#8b5cf6"],
                                stops: [0, 100]
                              }
                            },
                            colors: ["#3b82f6"],
                            stroke: { lineCap: "round" }
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-7">
                    <div className="d-flex flex-column justify-content-center h-100 ps-2">
                      <h6 className="fw-bold text-dark mb-3" style={{ fontSize: 13 }}>THÔNG TIN NHÂN VIÊN</h6>
                      <div className="d-flex align-items-center mb-3 pb-3 border-bottom" style={{ borderBottomStyle: "dashed" }}>
                        {displayedEmployee?.avatarUrl ? (
                          <img src={displayedEmployee.avatarUrl} alt="Avatar" className="rounded-circle me-3 shadow-sm" style={{ width: 42, height: 42, objectFit: "cover" }} />
                        ) : (
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 shadow-sm" style={{ width: 42, height: 42, fontSize: 15 }}>
                            {getAvatarInitials(displayedEmployee?.fullName)}
                          </div>
                        )}
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: 14 }}>{displayedEmployee?.fullName || "Đang tải..."}</div>
                          <div className="text-secondary" style={{ fontSize: 11 }}>{getPositionName(displayedEmployee?.position)}</div>
                        </div>
                      </div>
                      
                      <div className="d-flex flex-column gap-2" style={{ fontSize: 11.5 }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-telephone me-2 text-secondary"></i>Điện thoại:</span>
                          <span className="fw-medium text-dark">{displayedEmployee?.phone || "Chưa cập nhật"}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-envelope me-2 text-secondary"></i>Email:</span>
                          <span className="fw-medium text-dark">{displayedEmployee?.workEmail || displayedEmployee?.personalEmail || "Chưa cập nhật"}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-geo-alt me-2 text-secondary"></i>Địa điểm làm việc:</span>
                          <span className="fw-medium text-dark">{getLocationName(displayedEmployee?.workLocation)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-top pt-4">
                  <h6 className="fw-bold text-dark mb-3" style={{ fontSize: 13 }}>CHI TIẾT ĐIỂM KPI CÁC THÁNG</h6>
                  <div style={{ marginLeft: -15, marginRight: -15 }}>
                    <ReactApexChart 
                      type="line"
                      height={210}
                      series={[
                        { name: "Điểm KPI", type: "column", data: kpiData2 },
                        { name: "Trung bình", type: "line", data: avgData2 }
                      ]}
                      options={{
                        chart: { fontFamily: "inherit", toolbar: { show: false }, zoom: { enabled: false } },
                        plotOptions: {
                          bar: { 
                            borderRadius: 4, 
                            columnWidth: "40%",
                            colors: {
                              ranges: [
                                { from: 0, to: 49.99, color: '#ef4444' },
                                { from: 50, to: 80, color: '#f59e0b' },
                                { from: 80.01, to: 100, color: '#3b82f6' }
                              ]
                            }
                          }
                        },
                        colors: ["#3b82f6", "#f59e0b"],
                        stroke: { width: [0, 2], curve: "smooth", dashArray: [0, 4] },
                        xaxis: { categories: kpiCategories, labels: { style: { colors: "var(--bs-gray-500)", fontSize: "11px" } } },
                        yaxis: { max: 100, min: 0, tickAmount: 5, labels: { style: { colors: "var(--bs-gray-500)", fontSize: "11px" } } },
                        dataLabels: { enabled: false },
                        legend: { position: "top", horizontalAlign: "right", fontSize: "12px" },
                        grid: { strokeDashArray: 3, borderColor: "var(--border)" }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Đường ngăn cách */}
              <div 
                className="my-4 flex-shrink-0" 
                style={{ 
                  width: 2, 
                  backgroundColor: "var(--border)", 
                  opacity: 0.8,
                  borderRight: "1px solid rgba(255, 255, 255, 0.7)", 
                  boxShadow: "inset 1px 0 2px rgba(0,0,0,0.05)" 
                }} 
              />

              {/* Cột phải (tỷ lệ 7/12) */}
              <div className="flex-grow-1 h-100 d-flex flex-column custom-scrollbar overflow-auto" style={{ padding: "20px 24px" }}>
                <h6 className="fw-bold text-dark mb-4 text-uppercase" style={{ fontSize: 13 }}>Hệ thống đánh giá kết quả công việc</h6>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-sm btn-light border shadow-sm" onClick={handlePrevMonth} style={{ width: 32, height: 32, padding: 0 }}>
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="fw-bold px-3 py-1 bg-white border rounded shadow-sm text-dark" style={{ fontSize: 14 }}>
                      Tháng {reportMonth.getMonth() + 1}, {reportMonth.getFullYear()}
                    </span>
                    <button className="btn btn-sm btn-light border shadow-sm" onClick={handleNextMonth} style={{ width: 32, height: 32, padding: 0 }} disabled={reportMonth.getFullYear() > new Date().getFullYear() || (reportMonth.getFullYear() === new Date().getFullYear() && reportMonth.getMonth() >= new Date().getMonth())}>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                  {canAccessManagementTabs && (
                    <div>
                      <select 
                        className="form-select form-select-sm shadow-sm" 
                        style={{ minWidth: 220, cursor: "pointer", borderColor: "var(--border)" }}
                        value={selectedEmployeeId}
                        onChange={e => setSelectedEmployeeId(e.target.value)}
                      >
                        <option value="">-- Chọn nhân viên --</option>
                        {salesEmployees.filter(e => {
                          const posName = getPositionName(e.position).toLowerCase();
                          return !posName.includes("trưởng phòng") && !posName.includes("phó phòng");
                        }).map(e => (
                          <option key={e.id} value={e.id}>{e.fullName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex-grow-1 overflow-hidden d-flex flex-column" style={{ minHeight: 0 }}>
                  <div className="flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                    <FullWidthTableLayout
                    table={
                      <div className="h-100 overflow-auto custom-scrollbar full-width-table-wrapper">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                          <thead className="bg-light" style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--card)" }}>
                            <tr style={{ height: 36 }}>
                              <th className="border-0 text-center" style={{ width: "5%", minWidth: "50px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>STT</th>
                              <th className="border-0 text-uppercase" style={{ width: "35%", minWidth: "150px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Tiêu chí đánh giá</th>
                              <th className="border-0 text-uppercase text-center" style={{ width: "15%", minWidth: "80px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Chỉ tiêu</th>
                              <th className="border-0 text-uppercase text-center" style={{ width: "15%", minWidth: "80px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Thực tế</th>
                              <th className="border-0 text-uppercase text-center" style={{ width: "15%", minWidth: "80px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Trọng số</th>
                              <th className="border-0 text-uppercase text-center" style={{ width: "15%", minWidth: "80px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Điểm số</th>
                            </tr>
                          </thead>
                          <tbody>
                            {step2KpiCriteria.map((item, idx) => {
                              const score = calculateScore(item.target, item.actual, item.weight);
                              const maxScore = Number(item.weight.replace("%", ""));
                              const completionPercent = (score / maxScore) * 100;
                              return (
                                <tr key={idx}>
                                  <td className="text-center text-muted">{idx + 1}</td>
                                  <td className="fw-medium text-dark">{item.name}</td>
                                  <td className="text-center text-muted">
                                    {item.target}{(item.name.toLowerCase().includes("tỷ lệ") || item.name.toLowerCase().includes("thu hồi công nợ")) ? "%" : ""}
                                  </td>
                                  <td className="text-center fw-medium" style={{ color: "var(--bs-primary)" }}>
                                    {item.actual}{(item.name.toLowerCase().includes("tỷ lệ") || item.name.toLowerCase().includes("thu hồi công nợ")) ? "%" : ""}
                                  </td>
                                  <td className="text-center text-muted">{item.weight}</td>
                                  <td className="text-center fw-bold" style={{ color: completionPercent >= 90 ? "var(--bs-success)" : completionPercent >= 80 ? "var(--bs-warning)" : "var(--bs-danger)" }}>
                                    {score}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="mt-4 pb-3 flex-shrink-0" style={{ paddingLeft: 8, paddingRight: 8 }}>
                          <h6 className="fw-bold text-dark text-uppercase mb-3" style={{ fontSize: 13 }}>Khung thu nhập</h6>
                          <div className="row g-3 align-items-center">
                            <div className="col-md-5 border-end">
                              <div className="text-muted mb-1 text-uppercase" style={{ fontSize: 11, fontWeight: 600 }}>Tổng thu nhập</div>
                              <div className="fw-bold text-primary" style={{ fontSize: 24 }}>{calculatedIncome.totalIncome.toLocaleString()} <span style={{ fontSize: 14 }}>đ</span></div>
                            </div>
                            <div className="col-md-7">
                              <div className="row g-3">
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Lương cơ bản</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>{calculatedIncome.baseSalary.toLocaleString()} đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Lương hiệu suất</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>{calculatedIncome.performanceBonus.toLocaleString()} đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Phụ cấp</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>{calculatedIncome.allowance.toLocaleString()} đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Hoa hồng bán hàng</div>
                                  <div className="fw-bold text-success" style={{ fontSize: 13 }}>{calculatedIncome.salesCommission.toLocaleString()} đ</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {currentStep === 3 && (
            <div className="d-flex flex-column w-100 h-100 p-4">
              <h6 className="fw-bold text-dark mb-4 text-uppercase" style={{ fontSize: 13 }}>Cấu hình hệ thống đánh giá</h6>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-sm btn-light border shadow-sm" onClick={handlePrevMonth} style={{ width: 32, height: 32, padding: 0 }}>
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="fw-bold px-3 py-1 bg-white border rounded shadow-sm text-dark" style={{ fontSize: 14 }}>
                      Tháng {reportMonth.getMonth() + 1}, {reportMonth.getFullYear()}
                    </span>
                    <button className="btn btn-sm btn-light border shadow-sm" onClick={handleNextMonth} style={{ width: 32, height: 32, padding: 0 }}>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                  <div className="form-check form-switch ms-4 mb-0 d-flex align-items-center gap-2">
                    <input 
                      className="form-check-input mt-0" 
                      type="checkbox" 
                      role="switch" 
                      id="applyAllYearSwitch" 
                      checked={applyAllYear} 
                      onChange={e => setApplyAllYear(e.target.checked)} 
                      style={{ cursor: "pointer" }}
                    />
                    <label className="form-check-label text-muted fw-medium" htmlFor="applyAllYearSwitch" style={{ fontSize: 13, userSelect: 'none', cursor: 'pointer', paddingTop: 2 }}>Áp dụng cho cả năm</label>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <button className="btn btn-light btn-sm px-3 shadow-sm border me-2 d-flex align-items-center" style={{ fontWeight: 500 }} onClick={async () => {
                    try {
                      const res = await fetch(`/api/sales/internal-reports/criteria/copy?month=${reportMonth.getMonth() + 1}&year=${reportMonth.getFullYear()}`);
                      const data = await res.json();
                      if (data.success) {
                        const formatCriteria = (c: any) => ({
                          id: c.id,
                          name: c.name,
                          target: c.targetValue.toLocaleString("en-US"),
                          actual: "0",
                          weight: c.weight + "%",
                          score: "0"
                        });
                        setStep1KpiConfig(data.data.manager.map(formatCriteria));
                        setStep2KpiConfig(data.data.staff.map(formatCriteria));
                        toast.success("Thành công", "Đã sao chép cấu hình tháng trước!");
                      } else {
                        toast.error("Lỗi", "Lỗi sao chép: " + data.error);
                      }
                    } catch (e: any) {
                      toast.error("Lỗi", e.message);
                    }
                  }}>
                    <i className="bi bi-files me-2" style={{ fontSize: 15 }}></i>Sao chép cấu hình
                  </button>
                  <button className="btn btn-primary btn-sm px-4 shadow-sm d-flex align-items-center" style={{ fontWeight: 500 }} onClick={async () => {
                    try {
                      const payload = {
                        month: reportMonth.getMonth() + 1,
                        year: reportMonth.getFullYear(),
                        applyAllYear,
                        manager: step1KpiConfig.map(c => ({ name: (c as any).name, targetValue: Number(c.target.replace(/,/g, "")), weight: Number(c.weight.replace(/%/g, "")) })),
                        staff: step2KpiConfig.map(c => ({ name: (c as any).name, targetValue: Number(c.target.replace(/,/g, "")), weight: Number(c.weight.replace(/%/g, "")) }))
                      };
                      const res = await fetch("/api/sales/internal-reports/criteria", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast.success("Thành công", "Cập nhật cấu hình thành công!");
                      } else {
                        toast.error("Lỗi", "Lỗi cập nhật cấu hình: " + data.error);
                      }
                    } catch (e: any) {
                      toast.error("Lỗi", e.message);
                    }
                  }}>
                    <i className="bi bi-check2-circle me-2" style={{ fontSize: 16 }}></i>Ban hành
                  </button>
                </div>
              </div>
              <div className="flex-grow-1 overflow-hidden d-flex">
                <div className="row w-100 m-0 h-100">
                  {/* Cột trái */}
                  <div className="col-6 h-100 d-flex flex-column border-end pe-4">
                    <h6 className="fw-bold text-primary mb-3 text-uppercase" style={{ fontSize: 13 }}>Danh sách KPI Lãnh đạo phòng</h6>
                    <div className="table-responsive flex-grow-1 custom-scrollbar border rounded">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                        <thead className="bg-light" style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--card)" }}>
                          <tr style={{ height: 36 }}>
                            <th className="border-0 text-center text-uppercase" style={{ width: 50, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>STT</th>
                            <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Tiêu chí đánh giá</th>
                            <th className="border-0 text-center text-uppercase" style={{ width: 140, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Chỉ tiêu</th>
                            <th className="border-0 text-center text-uppercase" style={{ width: 80, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Trọng số</th>
                            <th className="border-0 text-center text-uppercase" style={{ width: 40, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {step1KpiCriteria.map((item, idx) => (
                            <tr key={idx}>
                              <td className="text-center text-muted">{idx + 1}</td>
                              <td>
                                <input type="text" className="form-control form-control-sm text-center bg-white shadow-none" value={item.name || ""} style={{ borderColor: "var(--border)", fontSize: 12 }} onChange={(e) => {
                                  const newData = [...step1KpiConfig];
                                  newData[idx] = { ...newData[idx], name: e.target.value };
                                  setStep1KpiConfig(newData);
                                }} />
                              </td>
                              <td>
                                <input type="text" className="form-control form-control-sm text-center bg-white shadow-none" value={item.target || ""} style={{ borderColor: "var(--border)", fontSize: 12 }} onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  const formatted = val ? parseInt(val, 10).toLocaleString("en-US") : "";
                                  const newData = [...step1KpiConfig];
                                  newData[idx] = { ...newData[idx], target: formatted };
                                  setStep1KpiConfig(newData);
                                }} />
                              </td>
                              <td>
                                <div className="input-group input-group-sm mx-auto" style={{ width: 70 }}>
                                  <input type="text" className="form-control text-center bg-white shadow-none" value={String(item.weight).replace(/%/g, "") || ""} style={{ borderColor: step1TotalWeight > 100 ? "var(--bs-danger)" : "var(--border)", color: step1TotalWeight > 100 ? "var(--bs-danger)" : "inherit", fontSize: 12, paddingRight: 4, paddingLeft: 8 }} onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    const newData = [...step1KpiConfig];
                                    newData[idx] = { ...newData[idx], weight: val };
                                    setStep1KpiConfig(newData);
                                  }} />
                                  <span className="input-group-text bg-light text-muted" style={{ borderColor: step1TotalWeight > 100 ? "var(--bs-danger)" : "var(--border)", fontSize: 12, padding: "0 6px" }}>%</span>
                                </div>
                              </td>
                              <td className="text-center">
                                <button className="btn btn-sm btn-light text-danger p-1" onClick={() => {
                                  const newData = [...step1KpiConfig];
                                  newData.splice(idx, 1);
                                  setStep1KpiConfig(newData);
                                }}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text-center p-2 border-top">
                        <button className="btn btn-sm btn-light text-primary border" onClick={() => {
                          setStep1KpiConfig([...step1KpiConfig, { name: "", target: "0", weight: "0" }]);
                        }}>
                          <i className="bi bi-plus-lg me-1"></i>Thêm tiêu chí
                        </button>
                      </div>
                    </div>
                    {step1TotalWeight > 100 && (
                      <div className="text-danger mt-2 fw-medium" style={{ fontSize: 12 }}>
                        <i className="bi bi-exclamation-circle me-1"></i> Tổng trọng số đang là {step1TotalWeight}%, vượt quá 100%. Vui lòng điều chỉnh.
                      </div>
                    )}
                  </div>
                  {/* Cột phải */}
                  <div className="col-6 h-100 d-flex flex-column ps-4">
                    <h6 className="fw-bold text-primary mb-3 text-uppercase" style={{ fontSize: 13 }}>Danh sách KPI Nhân viên phòng</h6>
                    <div className="table-responsive flex-grow-1 custom-scrollbar border rounded">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                        <thead className="bg-light" style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--card)" }}>
                          <tr style={{ height: 36 }}>
                            <th className="border-0 text-center text-uppercase" style={{ width: 50, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>STT</th>
                            <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Tiêu chí đánh giá</th>
                            <th className="border-0 text-center text-uppercase" style={{ width: 140, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Chỉ tiêu</th>
                            <th className="border-0 text-center text-uppercase" style={{ width: 80, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Trọng số</th>
                            <th className="border-0 text-center text-uppercase" style={{ width: 40, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {step2KpiCriteria.map((item, idx) => (
                            <tr key={idx}>
                              <td className="text-center text-muted">{idx + 1}</td>
                              <td>
                                <input type="text" className="form-control form-control-sm text-center bg-white shadow-none" value={item.name || ""} style={{ borderColor: "var(--border)", fontSize: 12 }} onChange={(e) => {
                                  const newData = [...step2KpiConfig];
                                  newData[idx] = { ...newData[idx], name: e.target.value };
                                  setStep2KpiConfig(newData);
                                }} />
                              </td>
                              <td>
                                <input type="text" className="form-control form-control-sm text-center bg-white shadow-none" value={item.target || ""} style={{ borderColor: "var(--border)", fontSize: 12 }} onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  const formatted = val ? parseInt(val, 10).toLocaleString("en-US") : "";
                                  const newData = [...step2KpiConfig];
                                  newData[idx] = { ...newData[idx], target: formatted };
                                  setStep2KpiConfig(newData);
                                }} />
                              </td>
                              <td>
                                <div className="input-group input-group-sm mx-auto" style={{ width: 70 }}>
                                  <input type="text" className="form-control text-center bg-white shadow-none" value={String(item.weight).replace(/%/g, "") || ""} style={{ borderColor: step2TotalWeight > 100 ? "var(--bs-danger)" : "var(--border)", color: step2TotalWeight > 100 ? "var(--bs-danger)" : "inherit", fontSize: 12, paddingRight: 4, paddingLeft: 8 }} onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    const newData = [...step2KpiConfig];
                                    newData[idx] = { ...newData[idx], weight: val };
                                    setStep2KpiConfig(newData);
                                  }} />
                                  <span className="input-group-text bg-light text-muted" style={{ borderColor: step2TotalWeight > 100 ? "var(--bs-danger)" : "var(--border)", fontSize: 12, padding: "0 6px" }}>%</span>
                                </div>
                              </td>
                              <td className="text-center">
                                <button className="btn btn-sm btn-light text-danger p-1" onClick={() => {
                                  const newData = [...step2KpiConfig];
                                  newData.splice(idx, 1);
                                  setStep2KpiConfig(newData);
                                }}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text-center p-2 border-top">
                        <button className="btn btn-sm btn-light text-primary border" onClick={() => {
                          setStep2KpiConfig([...step2KpiConfig, { name: "", target: "0", weight: "0" }]);
                        }}>
                          <i className="bi bi-plus-lg me-1"></i>Thêm tiêu chí
                        </button>
                      </div>
                    </div>
                    {step2TotalWeight > 100 && (
                      <div className="text-danger mt-2 fw-medium" style={{ fontSize: 12 }}>
                        <i className="bi bi-exclamation-circle me-1"></i> Tổng trọng số đang là {step2TotalWeight}%, vượt quá 100%. Vui lòng điều chỉnh.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </WorkflowCard>
    </StandardPage>
  );
}
