"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { BrandButton } from "@/components/ui/BrandButton";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RegimeFormOffcanvas } from "./RegimeFormOffcanvas";

// --- Types ---
interface InsuranceContribution {
  id: string;
  employeeCode: string;
  fullName: string;
  position: string;
  insuranceSalary: number;
  socialInsuranceId: string;
  companyAmount: number;
  personalAmount: number;
  totalAmount: number;
  status: "Active" | "Pending" | "Suspended";
  avatar?: string;
}

interface InsuranceChange {
  id: string;
  employeeName: string;
  type: "Báo tăng" | "Báo giảm" | "Điều chỉnh lương";
  date: string;
  description: string;
  status: "Done" | "Processing";
}

interface InsuranceBenefit {
  id: string;
  employeeName: string;
  regime: "Ốm đau" | "Thai sản" | "Dưỡng sức";
  period: string;
  amount: number;
  status: "Paid" | "Processing" | "Pending";
}

export default function InsurancePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedChangeType, setSelectedChangeType] = useState("all");
  const [selectedRegimeType, setSelectedRegimeType] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const [loading, setLoading] = useState(true);
  const [contributions, setContributions] = useState<any[]>([]);
  const [changesData, setChangesData] = useState<any[]>([]);
  const [benefitsData, setBenefitsData] = useState<any[]>([]);
  const [rates, setRates] = useState({
    employer: { bhxh: 17.5, bhyt: 3, bhtn: 1 },
    employee: { bhxh: 8, bhyt: 1.5, bhtn: 1 },
    regime: {
      baseReferenceWage: 2340000,
      sickLeaveDays: 30, sickLeaveHeavyDays: 40, sickLeaveRate: 75,
      maternityDays: 180, paternityDays: 5, maternityRate: 100, maternityAllowance: 2,
      recoveryDays: 5, recoveryRate: 30,
      funeralAllowance: 10
    }
  });
  const [departmentOptions, setDepartmentOptions] = useState([{ label: "Tất cả phòng ban", value: "all" }]);
  const [regimeOptions, setRegimeOptions] = useState([{ label: "Tất cả chế độ", value: "all" }]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: "", message: "", variant: "info" as "info" | "warning" | "danger" });
  const [isRegimeFormOpen, setIsRegimeFormOpen] = useState(false);

  const showDialog = (title: string, message: string, variant: "info" | "warning" | "danger" = "info") => {
    setDialogConfig({ title, message, variant });
    setDialogOpen(true);
  };

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Filter Options (Departments & Regimes)
        const [deptRes, regimeRes] = await Promise.all([
          fetch("/api/hr/departments"),
          fetch("/api/board/categories?type=che_do_tro_cap_bao_hiem")
        ]);
        
        if (deptRes.ok) {
          const deptJson = await deptRes.json();
          if (deptJson.departments && Array.isArray(deptJson.departments)) {
            setDepartmentOptions([
              { label: "Tất cả phòng ban", value: "all" },
              ...deptJson.departments.map((d: any) => ({ label: d.nameVi, value: d.code }))
            ]);
          }
        }

        if (regimeRes.ok) {
          const regimeJson = await regimeRes.json();
          if (Array.isArray(regimeJson)) {
            setRegimeOptions([
              { label: "Tất cả chế độ", value: "all" },
              ...regimeJson.map((r: any) => ({ label: r.name, value: r.name }))
            ]);
          }
        }

        // Fetch History (Step 1)
        const historyRes = await fetch(`/api/hr/insurance/history?month=${selectedMonth}&year=${selectedYear}&search=${search}&department=${selectedDepartment}`);
        const historyJson = await historyRes.json();
        if (Array.isArray(historyJson)) {
          setContributions(historyJson.map((h: any) => ({
            ...h,
            id: h.id,
            employeeCode: h.employee?.code || "N/A",
            fullName: h.employee?.fullName || "N/A",
            position: h.employee?.position || "N/A",
            avatar: h.employee?.avatarUrl,
            insuranceSalary: h.insuranceSalary,
            socialInsuranceId: h.employee?.socialInsuranceNumber || "N/A",
            companyAmount: h.employerAmount,
            personalAmount: h.employeeAmount,
            totalAmount: h.totalAmount,
            status: h.status === "active" ? "Active" : "Suspended",
          })));
        } else {
          console.error("History data is not an array:", historyJson);
          setContributions([]);
        }

        // Fetch Changes (Step 2)
        const changesRes = await fetch(`/api/hr/insurance/changes?type=${selectedChangeType}&search=${search}&department=${selectedDepartment}`);
        const changesJson = await changesRes.json();
        if (Array.isArray(changesJson)) {
          setChangesData(changesJson.map((c: any) => ({
            ...c,
            employeeName: c.employee?.fullName || "N/A",
            employeeCode: c.employee?.code || "N/A",
            avatar: c.employee?.avatarUrl,
            date: new Date(c.effectiveDate).toLocaleDateString("vi-VN"),
            description: c.reason || "N/A",
            status: c.status === "done" ? "Done" : "Processing",
          })));
        } else {
          setChangesData([]);
        }

        // Fetch Benefits (Step 3)
        const benefitsRes = await fetch(`/api/hr/insurance/benefits?type=${selectedRegimeType}&search=${search}&department=${selectedDepartment}`);
        const benefitsJson = await benefitsRes.json();
        if (Array.isArray(benefitsJson)) {
          setBenefitsData(benefitsJson.map((b: any) => ({
            ...b,
            employeeName: b.employee?.fullName || "N/A",
            employeeCode: b.employee?.code || "N/A",
            avatar: b.employee?.avatarUrl,
            regime: b.regimeType,
            period: `${new Date(b.startDate).toLocaleDateString("vi-VN")} - ${new Date(b.endDate).toLocaleDateString("vi-VN")}`,
            status: b.status.charAt(0).toUpperCase() + b.status.slice(1),
          })));
        } else {
          setBenefitsData([]);
        }

        // Fetch Config (Step 4)
        const configRes = await fetch("/api/hr/insurance/config");
        const configJson = await configRes.json();
        if (configJson && !configJson.error) {
          setRates({
            employer: {
              bhxh: configJson.employerBhxh,
              bhyt: configJson.employerBhyt,
              bhtn: configJson.employerBhtn,
            },
            employee: {
              bhxh: configJson.employeeBhxh,
              bhyt: configJson.employeeBhyt,
              bhtn: configJson.employeeBhtn,
            },
            regime: {
              baseReferenceWage: configJson.baseReferenceWage || 2340000,
              sickLeaveDays: configJson.sickLeaveDays || 30,
              sickLeaveHeavyDays: configJson.sickLeaveHeavyDays || 40,
              sickLeaveRate: configJson.sickLeaveRate || 75,
              maternityDays: configJson.maternityDays || 180,
              paternityDays: configJson.paternityDays || 5,
              maternityRate: configJson.maternityRate || 100,
              maternityAllowance: configJson.maternityAllowance || 2,
              recoveryDays: configJson.recoveryDays || 5,
              recoveryRate: configJson.recoveryRate || 30,
              funeralAllowance: configJson.funeralAllowance || 10,
            }
          });
        }
      } catch (error) {
        console.error("Error fetching insurance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentStep, selectedMonth, selectedYear, search, selectedChangeType, selectedRegimeType, selectedDepartment]);

  const steps: ModernStepItem[] = [
    { num: 1, id: "list", title: "Danh sách đóng", desc: "Quản lý nhân viên tham gia", icon: "bi-person-badge" },
    { num: 2, id: "changes", title: "Biến động", desc: "Tăng, giảm & điều chỉnh", icon: "bi-graph-up-arrow" },
    { num: 3, id: "benefits", title: "Chế độ & Trợ cấp", desc: "Giải quyết hồ sơ hưởng", icon: "bi-heart-pulse" },
    { num: 4, id: "config", title: "Cấu hình", desc: "Tỷ lệ đóng & tham số", icon: "bi-sliders" },
  ];

  // --- Filter Options ---
  const months = Array.from({ length: 12 }, (_, i) => ({ label: `Tháng ${i + 1}`, value: String(i + 1) }));
  const years = [
    { label: "Năm 2026", value: "2026" },
    { label: "Năm 2025", value: "2025" },
    { label: "Năm 2024", value: "2024" },
  ];

  const changeTypes = [
    { label: "Tất cả biến động", value: "all" },
    { label: "Báo tăng", value: "Báo tăng" },
    { label: "Báo giảm", value: "Báo giảm" },
    { label: "Điều chỉnh lương", value: "Điều chỉnh lương" },
  ];

  // --- Columns Definitions ---
  const listColumns: TableColumn<InsuranceContribution>[] = [
    {
      header: "Nhân viên",
      render: (r) => (
        <div className="d-flex align-items-center gap-2">
          <EmployeeAvatar name={r.fullName} url={r.avatar} size={34} borderRadius={8} />
          <div>
            <div className="fw-bold" style={{ fontSize: 13 }}>{r.fullName}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{r.employeeCode} • {r.position}</div>
          </div>
        </div>
      ),
      width: 280
    },
    { header: "Mã số BHXH", render: (r) => <code className="text-dark fw-medium">{r.socialInsuranceId}</code>, width: 140 },
    { header: "Lương đóng BH", render: (r) => r.insuranceSalary.toLocaleString() + " đ", align: "right" },
    { header: "Cty đóng (21.5%)", render: (r) => r.companyAmount.toLocaleString() + " đ", align: "right" },
    { header: "NV đóng (10.5%)", render: (r) => r.personalAmount.toLocaleString() + " đ", align: "right" },
    { header: "Tổng tiền", render: (r) => <span className="fw-bold text-primary">{r.totalAmount.toLocaleString()} đ</span>, align: "right" },
    {
      header: "Trạng thái", render: (r) => (
        <span className={`badge rounded-pill ${r.status === "Active" ? "bg-success-subtle text-success border border-success-subtle" : "bg-warning-subtle text-warning border border-warning-subtle"}`}>
          {r.status === "Active" ? "Đang đóng" : "Tạm dừng"}
        </span>
      ), width: 110, align: "center"
    },
  ];

  const changeColumns: TableColumn<any>[] = [
    {
      header: "Nhân viên",
      render: (r) => (
        <div className="d-flex align-items-center gap-2">
          <EmployeeAvatar name={r.employeeName} url={r.avatar} size={34} borderRadius={8} />
          <div>
            <div className="fw-bold" style={{ fontSize: 13 }}>{r.employeeName}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{r.employeeCode}</div>
          </div>
        </div>
      ),
      width: 280
    },
    {
      header: "Loại biến động", render: (r) => (
        <span className={`fw-medium px-2 py-1 rounded-2 ${r.type === "Báo tăng" ? "bg-success-subtle text-success" : r.type === "Báo giảm" ? "bg-danger-subtle text-danger" : "bg-primary-subtle text-primary"}`}>
          {r.type}
        </span>
      )
    },
    { header: "Ngày hiệu lực", render: (r) => <span className="text-muted"><i className="bi bi-calendar3 me-2"></i>{r.date}</span>, width: 150 },
    { header: "Ghi chú", render: (r) => r.description },
    {
      header: "Trạng thái", render: (r) => (
        <span className={`badge ${r.status === "Done" ? "bg-success" : "bg-secondary opacity-75"}`}>
          {r.status === "Done" ? "Hoàn tất" : "Đang xử lý"}
        </span>
      ), width: 100, align: "center"
    },
  ];

  const benefitColumns: TableColumn<any>[] = [
    {
      header: "Nhân viên",
      render: (r) => (
        <div className="d-flex align-items-center gap-2">
          <EmployeeAvatar name={r.employeeName} url={r.avatar} size={34} borderRadius={8} />
          <div>
            <div className="fw-bold" style={{ fontSize: 13 }}>{r.employeeName}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{r.employeeCode}</div>
          </div>
        </div>
      ),
      width: 280
    },
    { header: "Chế độ hưởng", render: (r) => <span className="badge bg-info-subtle text-info border border-info-subtle">{r.regime}</span> },
    { header: "Thời gian hưởng", render: (r) => <span className="small text-muted">{r.period}</span> },
    { header: "Số tiền trợ cấp", render: (r) => <span className="fw-bold text-dark">{r.amount.toLocaleString()} đ</span>, align: "right" },
    {
      header: "Trạng thái", render: (r) => (
        <StatusBadge status={r.status} />
      ), width: 100, align: "center"
    },
  ];

  // --- Calculations ---
  const employerTotal = rates.employer.bhxh + rates.employer.bhyt + rates.employer.bhtn;
  const employeeTotal = rates.employee.bhxh + rates.employee.bhyt + rates.employee.bhtn;
  const grandTotal = employerTotal + employeeTotal;

  // KPI Calculations
  const totalFund = contributions.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const enrolledCount = contributions.length;
  const pendingBenefits = benefitsData.filter(b => b.status === "Processing" || b.status === "Pending").length;
  const pendingChanges = changesData.filter(c => c.status === "Processing" || c.status === "Pending").length;

  return (
    <StandardPage
      title="Bảo hiểm"
      description="Quản lý đóng bảo hiểm xã hội, y tế và các chế độ liên quan"
      icon="bi-shield-check"
      color="rose"
      useCard={false}
    >
      <div className="d-flex flex-column gap-2 h-100">
        {/* Statistics Section */}
        <div className="row g-3 flex-shrink-0">
          <KPICard label="Tổng quỹ bảo hiểm" value={`${(totalFund / 1000000).toFixed(1)}M`} icon="bi-bank" accent="#f43f5e" subtitle={`Tháng ${selectedMonth}/${selectedYear}`} />
          <KPICard label="Số nhân viên đóng" value={String(enrolledCount)} icon="bi-people" accent="#10b981" subtitle="Đang tham gia" />
          <KPICard label="Yêu cầu giải quyết" value={String(pendingBenefits)} icon="bi-file-earmark-medical" accent="#f59e0b" subtitle="Chế độ bảo hiểm" />
          <KPICard label="Biến động chưa xử lý" value={String(pendingChanges)} icon="bi-clock-history" accent="#6366f1" subtitle="Cần nộp cơ quan BH" />
        </div>

        {/* Content Card using WorkflowCard */}
        <WorkflowCard
          contentPadding="px-4 pb-4 pt-0"
          stepper={
            <ModernStepper steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} paddingX={0} />
          }
          toolbar={
            currentStep !== 4 && (
              <div className="d-flex align-items-center gap-2">
                <div className="d-flex align-items-center gap-2 bg-light p-1 rounded-3 border flex-shrink-0">
                  <FilterSelect
                    options={months}
                    value={String(selectedMonth)}
                    onChange={(v) => setSelectedMonth(Number(v))}
                    placeholder="Chọn tháng"
                    width={110}
                    className="border-0 bg-transparent shadow-none"
                  />
                  <div className="border-end h-50" style={{ height: "20px" }}></div>
                  <FilterSelect
                    options={years}
                    value={String(selectedYear)}
                    onChange={(v) => setSelectedYear(Number(v))}
                    placeholder="Chọn năm"
                    width={110}
                    className="border-0 bg-transparent shadow-none"
                  />
                </div>

                <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, mã NV..." />

                {currentStep === 2 && (
                  <FilterSelect
                    options={changeTypes}
                    value={selectedChangeType}
                    onChange={setSelectedChangeType}
                    placeholder="Loại biến động"
                    width={180}
                  />
                )}

                {currentStep === 3 && (
                  <FilterSelect
                    options={regimeOptions}
                    value={selectedRegimeType}
                    onChange={setSelectedRegimeType}
                    placeholder="Loại chế độ"
                    width={160}
                  />
                )}

                <FilterSelect
                  options={departmentOptions}
                  value={selectedDepartment}
                  onChange={setSelectedDepartment}
                  width={160}
                />
                <BrandButton variant="outline" icon="bi-download" className="px-3">Xuất báo cáo</BrandButton>
                {currentStep === 3 && (
                  <BrandButton 
                    variant="primary" 
                    icon="bi-plus-lg" 
                    className="p-0 rounded-circle shadow-sm" 
                    style={{ width: 38, minWidth: 38 }}
                    onClick={() => setIsRegimeFormOpen(true)}
                  >
                    <></>
                  </BrandButton>
                )}
              </div>
            )
          }
        >
          {/* Table Area */}
          {currentStep === 1 && (
            <Table rows={contributions} columns={listColumns} stickyHeader compact />
          )}
          {currentStep === 2 && (
            <Table rows={changesData} columns={changeColumns} stickyHeader compact />
          )}
          {currentStep === 3 && (
            <Table rows={benefitsData} columns={benefitColumns} stickyHeader compact />
          )}
          {currentStep === 4 && (
            <div className="animate__animated animate__fadeIn p-0">
              <div className="row g-3">
                {/* CỘT 1: TỶ LỆ TRÍCH ĐÓNG (GỘP DN & NLĐ) */}
                <div className="col-md-6">
                  <div className="card border-0 bg-light-subtle rounded-4 h-100">
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                        <div className="p-2 bg-primary-subtle rounded-3 text-primary" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-piggy-bank" style={{ fontSize: 16 }}></i>
                        </div>
                        <div>
                          <h6 className="fw-bold mb-0 text-dark small ls-1">Tỷ lệ trích đóng bảo hiểm</h6>
                          <div className="text-muted" style={{ fontSize: 10, marginTop: 1 }}>Cấu hình tỷ lệ % đóng BHXH, BHYT, BHTN</div>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <table className="table table-borderless table-sm mb-0 align-middle">
                          <thead>
                            <tr className="text-muted" style={{ fontSize: 11 }}>
                              <th>Loại</th>
                              <th className="text-center" style={{ width: 80 }}>DN đóng</th>
                              <th className="text-center" style={{ width: 80 }}>NLĐ đóng</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="fw-medium small">Bảo hiểm xã hội</td>
                              <td><input type="number" className="form-control form-control-sm text-center" value={rates.employer.bhxh} onChange={(e) => setRates({ ...rates, employer: { ...rates.employer, bhxh: Number(e.target.value) } })} /></td>
                              <td><input type="number" className="form-control form-control-sm text-center" value={rates.employee.bhxh} onChange={(e) => setRates({ ...rates, employee: { ...rates.employee, bhxh: Number(e.target.value) } })} /></td>
                            </tr>
                            <tr>
                              <td className="fw-medium small">Bảo hiểm y tế</td>
                              <td><input type="number" className="form-control form-control-sm text-center" value={rates.employer.bhyt} onChange={(e) => setRates({ ...rates, employer: { ...rates.employer, bhyt: Number(e.target.value) } })} /></td>
                              <td><input type="number" className="form-control form-control-sm text-center" value={rates.employee.bhyt} onChange={(e) => setRates({ ...rates, employee: { ...rates.employee, bhyt: Number(e.target.value) } })} /></td>
                            </tr>
                            <tr>
                              <td className="fw-medium small">Bảo hiểm thất nghiệp</td>
                              <td><input type="number" className="form-control form-control-sm text-center" value={rates.employer.bhtn} onChange={(e) => setRates({ ...rates, employer: { ...rates.employer, bhtn: Number(e.target.value) } })} /></td>
                              <td><input type="number" className="form-control form-control-sm text-center" value={rates.employee.bhtn} onChange={(e) => setRates({ ...rates, employee: { ...rates.employee, bhtn: Number(e.target.value) } })} /></td>
                            </tr>
                          </tbody>
                          <tfoot className="border-top">
                            <tr>
                              <td className="fw-bold small text-primary pt-2">Tổng cộng</td>
                              <td className="text-center fw-bold text-primary pt-2">{employerTotal}%</td>
                              <td className="text-center fw-bold text-primary pt-2">{employeeTotal}%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CỘT 2: CẤU HÌNH CHẾ ĐỘ */}
                <div className="col-md-6">
                  <div className="card border-0 bg-light-subtle rounded-4 h-100">
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                        <div className="d-flex align-items-center gap-2">
                          <div className="p-2 bg-success-subtle rounded-3 text-success" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="bi bi-heart-pulse" style={{ fontSize: 16 }}></i>
                          </div>
                          <div>
                            <h6 className="fw-bold mb-0 text-dark small ls-1">Định mức trợ cấp</h6>
                            <div className="text-muted" style={{ fontSize: 10, marginTop: 1 }}>Mức tham chiếu: <input type="number" className="border-0 bg-transparent border-bottom text-primary fw-bold" style={{ width: 60, outline: 'none' }} value={rates.regime.baseReferenceWage / 1000} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, baseReferenceWage: Number(e.target.value) * 1000 } })} />k VNĐ</div>
                          </div>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <table className="table table-borderless table-sm mb-0 align-middle">
                          <thead>
                            <tr className="text-muted" style={{ fontSize: 11 }}>
                              <th>Chế độ</th>
                              <th className="text-center" style={{ width: 100 }}>Số ngày nghỉ</th>
                              <th className="text-center" style={{ width: 90 }}>Mức hưởng</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="fw-medium small">Ốm đau (Bình thường / Nặng nhọc)</td>
                              <td>
                                <div className="d-flex gap-1">
                                  <input type="number" className="form-control form-control-sm text-center px-1" value={rates.regime.sickLeaveDays} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, sickLeaveDays: Number(e.target.value) } })} title="Bình thường" />
                                  <input type="number" className="form-control form-control-sm text-center px-1" value={rates.regime.sickLeaveHeavyDays} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, sickLeaveHeavyDays: Number(e.target.value) } })} title="Nặng nhọc" />
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input type="number" className="form-control text-center px-1" value={rates.regime.sickLeaveRate} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, sickLeaveRate: Number(e.target.value) } })} />
                                  <span className="input-group-text px-1">%</span>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="fw-medium small">Thai sản (Nữ / Nam) <br/><span className="text-muted" style={{fontSize: 9}}>Trợ cấp 1 lần: {rates.regime.maternityAllowance}x mức tham chiếu</span></td>
                              <td>
                                <div className="d-flex gap-1">
                                  <input type="number" className="form-control form-control-sm text-center px-1" value={rates.regime.maternityDays} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, maternityDays: Number(e.target.value) } })} title="Nữ (ngày)" />
                                  <input type="number" className="form-control form-control-sm text-center px-1" value={rates.regime.paternityDays} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, paternityDays: Number(e.target.value) } })} title="Nam (ngày)" />
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input type="number" className="form-control text-center px-1" value={rates.regime.maternityRate} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, maternityRate: Number(e.target.value) } })} />
                                  <span className="input-group-text px-1">%</span>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="fw-medium small">Dưỡng sức</td>
                              <td><input type="number" className="form-control form-control-sm text-center" value={rates.regime.recoveryDays} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, recoveryDays: Number(e.target.value) } })} /></td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input type="number" className="form-control text-center px-1" value={rates.regime.recoveryRate} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, recoveryRate: Number(e.target.value) } })} />
                                  <span className="input-group-text px-1">%</span>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="fw-medium small">Tử tuất <br/><span className="text-muted" style={{fontSize: 9}}>Trợ cấp mai táng</span></td>
                              <td colSpan={2} className="text-end">
                                <div className="d-flex align-items-center justify-content-end gap-2">
                                  <input type="number" className="form-control form-control-sm text-center" style={{width: 60}} value={rates.regime.funeralAllowance} onChange={(e) => setRates({ ...rates, regime: { ...rates.regime, funeralAllowance: Number(e.target.value) } })} />
                                  <span className="small text-muted">x Mức tham chiếu</span>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SUMMARY & ACTIONS */}
                <div className="col-12 mt-3">
                  <div className="p-4 rounded-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between shadow-sm border" style={{ background: "linear-gradient(to right, #ffffff, #f8fafc)" }}>
                    <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
                      <div className="p-3 bg-primary-subtle rounded-circle d-flex align-items-center justify-content-center text-primary" style={{ width: 48, height: 48 }}>
                        <i className="bi bi-shield-fill-check" style={{ fontSize: 24 }}></i>
                      </div>
                      <div>
                        <h5 className="fw-bold mb-1 text-dark">Tổng mức trích: <span className="text-primary">{grandTotal}%</span></h5>
                        <p className="mb-0 text-muted" style={{ fontSize: 13 }}>Áp dụng chung cho toàn bộ hệ thống tính lương và chi trả trợ cấp.</p>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <BrandButton variant="outline" className="btn-sm px-4 text-muted border-secondary-subtle bg-white hover-bg-light" onClick={() => {
                        setRates({
                          employer: { bhxh: 17.5, bhyt: 3, bhtn: 1 },
                          employee: { bhxh: 8, bhyt: 1.5, bhtn: 1 },
                          regime: { 
                            baseReferenceWage: 2340000,
                            sickLeaveDays: 30, sickLeaveHeavyDays: 40, sickLeaveRate: 75, 
                            maternityDays: 180, paternityDays: 5, maternityRate: 100, maternityAllowance: 2, 
                            recoveryDays: 5, recoveryRate: 30, 
                            funeralAllowance: 10 
                          }
                        })
                      }}>
                        <i className="bi bi-arrow-counterclockwise me-2"></i>Mặc định
                      </BrandButton>
                      <BrandButton 
                        variant="primary" 
                        icon="bi-cloud-check" 
                        className="btn-sm px-4 shadow-sm" 
                        style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/hr/insurance/config", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                employerBhxh: rates.employer.bhxh,
                                employerBhyt: rates.employer.bhyt,
                                employerBhtn: rates.employer.bhtn,
                                employeeBhxh: rates.employee.bhxh,
                                employeeBhyt: rates.employee.bhyt,
                                employeeBhtn: rates.employee.bhtn,
                                ...rates.regime
                              })
                            });
                            if (res.ok) showDialog("Thành công", "Đã lưu cấu hình định mức bảo hiểm mới.", "info");
                            else showDialog("Lưu thất bại", "Có lỗi xảy ra khi lưu trên máy chủ.", "danger");
                          } catch (e) {
                            showDialog("Lỗi hệ thống", "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.", "danger");
                          }
                        }}
                      >
                        Lưu cấu hình
                      </BrandButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </WorkflowCard>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        variant={dialogConfig.variant}
        confirmLabel="Đóng"
        cancelLabel="Huỷ"
        onConfirm={() => setDialogOpen(false)}
        onCancel={() => setDialogOpen(false)}
      />

      <RegimeFormOffcanvas 
        open={isRegimeFormOpen} 
        onClose={() => setIsRegimeFormOpen(false)} 
        onSuccess={() => {
          setIsRegimeFormOpen(false);
          // Refetch benefits data via fetchData if we had it exposed or just hard reload
          window.location.reload(); 
        }} 
      />
    </StandardPage>
  );
}

function RateInput({ label, value, onChange }: { label: string, value: number | null, onChange: (v: number) => void }) {
  return (
    <div className="w-100">
      <label className="form-label mb-1 text-muted" style={{ fontSize: 12 }}>{label}</label>
      <div className="input-group input-group-sm shadow-sm rounded-3 overflow-hidden">
        <input
          type="number"
          className="form-control border-end-0 fw-medium"
          style={{ height: 34, fontSize: 13, background: "var(--card)" }}
          value={value ?? ""}
          step="0.1"
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        <span className="input-group-text bg-white border-start-0 text-muted small px-3">%</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string, text: string, label: string }> = {
    Paid: { bg: "#ecfdf5", text: "#059669", label: "Đã chi" },
    Processing: { bg: "#fffbeb", text: "#d97706", label: "Đang duyệt" },
    Pending: { bg: "#f1f5f9", text: "#64748b", label: "Chờ xử lý" },
  };
  const c = configs[status] || configs.Pending;
  return (
    <span className="badge px-3 py-1 border fw-semibold" style={{ background: c.bg, color: c.text, borderColor: `${c.text}22` }}>
      {c.label}
    </span>
  );
}
