"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { ModernStepper } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function PartnerActivitiesPage() {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [employee, setEmployee] = useState<any>(null);
  const [positions, setPositions] = useState<{code: string, name: string}[]>([]);
  const [workLocations, setWorkLocations] = useState<{code: string, name: string}[]>([]);
  const [reportMonth, setReportMonth] = useState(new Date());
  const [salesEmployees, setSalesEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

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

  const getPositionName = (code: string | undefined | null) => {
    if (!code) return "Nhân viên";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const getLocationName = (code: string | undefined | null) => {
    if (!code) return "Chưa cập nhật";
    if (code === "main") return "Trụ sở chính";
    const loc = workLocations.find(l => l.code === code);
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
  const fullKpiData = [85, 78, 92, 88, 76, 89, 94, 82, 85, 90, 88, 91];
  const validData = fullKpiData.slice(0, currentMonth);
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

  const step1KpiCriteria = [
    { name: "Doanh thu phòng đạt được", target: "8,000,000,000", actual: "7,500,000,000", weight: "30%", score: "93" },
    { name: "Số đại lý phát triển trong tháng", target: "10", actual: "8", weight: "25%", score: "80" },
    { name: "Doanh số bình quân từ đại lý mới", target: "200,000,000", actual: "210,000,000", weight: "15%", score: "100" },
    { name: "Tỷ lệ đại lý phát sinh đơn hàng", target: "80%", actual: "75%", weight: "10%", score: "93" },
    { name: "Tỷ lệ thu hồi công nợ", target: "90%", actual: "88%", weight: "15%", score: "97" },
    { name: "Tỷ lệ nhân viên hoàn thành KPI", target: "100%", actual: "90%", weight: "5%", score: "90" },
  ];

  const step2KpiCriteria = [
    { name: "Doanh số", target: "1,500,000,000", actual: "1,450,000,000", weight: "25%", score: "96" },
    { name: "Doanh thu", target: "1,200,000,000", actual: "1,100,000,000", weight: "25%", score: "91" },
    { name: "Số đại lý phát triển trong tháng", target: "3", actual: "2", weight: "15%", score: "66" },
    { name: "Tỷ lệ chăm sóc đúng hạn", target: "90%", actual: "85%", weight: "15%", score: "94" },
    { name: "Tỷ lệ chuyển đổi", target: "20%", actual: "18%", weight: "10%", score: "90" },
    { name: "Thu hồi công nợ", target: "95%", actual: "90%", weight: "10%", score: "94" },
  ];

  const step1TotalScore = step1KpiCriteria.reduce((sum, item) => sum + calculateScore(item.target, item.actual, item.weight), 0);
  const step2TotalScore = step2KpiCriteria.reduce((sum, item) => sum + calculateScore(item.target, item.actual, item.weight), 0);

  const selectedMonthIndex = reportMonth.getMonth();
  const kpiData1 = Array.from({ length: 12 }, (_, i) => i < currentMonth ? (i === selectedMonthIndex ? Math.round(step1TotalScore) : fullKpiData[i]) : null);
  const kpiData2 = Array.from({ length: 12 }, (_, i) => i < currentMonth ? (i === selectedMonthIndex ? Math.round(step2TotalScore) : fullKpiData[i]) : null);
  
  const computeAvg = (data: (number | null)[]) => {
    const valid = data.filter(v => v !== null) as number[];
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  };
  
  const avgData1 = Array.from({ length: 12 }, (_, i) => i < currentMonth ? computeAvg(kpiData1) : null);
  const avgData2 = Array.from({ length: 12 }, (_, i) => i < currentMonth ? computeAvg(kpiData2) : null);

  const STEPS = [
    { num: 1, id: "manager", title: "Lãnh đạo phòng", desc: "Báo cáo tổng hợp cho quản lý", icon: "bi-person-badge" },
    { num: 2, id: "staff", title: "Nhân viên phòng", desc: "Báo cáo chi tiết theo nhân sự", icon: "bi-people" },
    { num: 3, id: "settings", title: "Thiết lập thông số", desc: "Cấu hình chỉ số báo cáo", icon: "bi-gear" },
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
                        {employee?.avatarUrl ? (
                          <img src={employee.avatarUrl} alt="Avatar" className="rounded-circle me-3 shadow-sm" style={{ width: 42, height: 42, objectFit: "cover" }} />
                        ) : (
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 shadow-sm" style={{ width: 42, height: 42, fontSize: 15 }}>
                            {getAvatarInitials(employee?.fullName)}
                          </div>
                        )}
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: 14 }}>{employee?.fullName || "Đang tải..."}</div>
                          <div className="text-secondary" style={{ fontSize: 11 }}>{getPositionName(employee?.position)}</div>
                        </div>
                      </div>
                      
                      <div className="d-flex flex-column gap-2" style={{ fontSize: 11.5 }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-telephone me-2 text-secondary"></i>Điện thoại:</span>
                          <span className="fw-medium text-dark">{employee?.phone || "Chưa cập nhật"}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-envelope me-2 text-secondary"></i>Email:</span>
                          <span className="fw-medium text-dark">{employee?.workEmail || employee?.personalEmail || "Chưa cập nhật"}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-geo-alt me-2 text-secondary"></i>Địa điểm làm việc:</span>
                          <span className="fw-medium text-dark">{getLocationName(employee?.workLocation)}</span>
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
                    <button className="btn btn-sm btn-light border shadow-sm" onClick={handleNextMonth} style={{ width: 32, height: 32, padding: 0 }} disabled={reportMonth.getMonth() === new Date().getMonth() && reportMonth.getFullYear() === new Date().getFullYear()}>
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
                                  <td className="text-center text-muted">{item.target}</td>
                                  <td className="text-center fw-medium" style={{ color: "var(--bs-primary)" }}>{item.actual}</td>
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
                              <div className="fw-bold text-primary" style={{ fontSize: 24 }}>35,500,000 <span style={{ fontSize: 14 }}>đ</span></div>
                            </div>
                            <div className="col-md-7">
                              <div className="row g-3">
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Lương cơ bản</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>15,000,000 đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Lương hiệu suất</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>12,000,000 đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Phụ cấp</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>3,500,000 đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Hoa hồng bán hàng</div>
                                  <div className="fw-bold text-success" style={{ fontSize: 13 }}>5,000,000 đ</div>
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
                        {employee?.avatarUrl ? (
                          <img src={employee.avatarUrl} alt="Avatar" className="rounded-circle me-3 shadow-sm" style={{ width: 42, height: 42, objectFit: "cover" }} />
                        ) : (
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 shadow-sm" style={{ width: 42, height: 42, fontSize: 15 }}>
                            {getAvatarInitials(employee?.fullName)}
                          </div>
                        )}
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: 14 }}>{employee?.fullName || "Đang tải..."}</div>
                          <div className="text-secondary" style={{ fontSize: 11 }}>{getPositionName(employee?.position)}</div>
                        </div>
                      </div>
                      
                      <div className="d-flex flex-column gap-2" style={{ fontSize: 11.5 }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-telephone me-2 text-secondary"></i>Điện thoại:</span>
                          <span className="fw-medium text-dark">{employee?.phone || "Chưa cập nhật"}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-envelope me-2 text-secondary"></i>Email:</span>
                          <span className="fw-medium text-dark">{employee?.workEmail || employee?.personalEmail || "Chưa cập nhật"}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted"><i className="bi bi-geo-alt me-2 text-secondary"></i>Địa điểm làm việc:</span>
                          <span className="fw-medium text-dark">{getLocationName(employee?.workLocation)}</span>
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
                    <button className="btn btn-sm btn-light border shadow-sm" onClick={handleNextMonth} style={{ width: 32, height: 32, padding: 0 }} disabled={reportMonth.getMonth() === new Date().getMonth() && reportMonth.getFullYear() === new Date().getFullYear()}>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                  <div>
                    <select 
                      className="form-select form-select-sm shadow-sm" 
                      style={{ minWidth: 220, cursor: "pointer", borderColor: "var(--border)" }}
                      value={selectedEmployeeId}
                      onChange={e => setSelectedEmployeeId(e.target.value)}
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {salesEmployees.map(e => (
                        <option key={e.id} value={e.id}>{e.fullName}</option>
                      ))}
                    </select>
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
                            {step2KpiCriteria.map((item, idx) => {
                              const score = calculateScore(item.target, item.actual, item.weight);
                              const maxScore = Number(item.weight.replace("%", ""));
                              const completionPercent = (score / maxScore) * 100;
                              return (
                                <tr key={idx}>
                                  <td className="text-center text-muted">{idx + 1}</td>
                                  <td className="fw-medium text-dark">{item.name}</td>
                                  <td className="text-center text-muted">{item.target}</td>
                                  <td className="text-center fw-medium" style={{ color: "var(--bs-primary)" }}>{item.actual}</td>
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
                              <div className="fw-bold text-primary" style={{ fontSize: 24 }}>35,500,000 <span style={{ fontSize: 14 }}>đ</span></div>
                            </div>
                            <div className="col-md-7">
                              <div className="row g-3">
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Lương cơ bản</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>15,000,000 đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Lương hiệu suất</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>12,000,000 đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Phụ cấp</div>
                                  <div className="fw-bold text-dark" style={{ fontSize: 13 }}>3,500,000 đ</div>
                                </div>
                                <div className="col-6">
                                  <div className="text-muted mb-1" style={{ fontSize: 11 }}>Hoa hồng bán hàng</div>
                                  <div className="fw-bold text-success" style={{ fontSize: 13 }}>5,000,000 đ</div>
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
            <div className="d-flex align-items-center justify-content-center w-100 h-100" style={{ minHeight: 400 }}>
              <div className="text-center text-muted">Cấu hình chỉ số báo cáo (Đang phát triển)</div>
            </div>
          )}
        </div>
      </WorkflowCard>
    </StandardPage>
  );
}
