"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { EmployeeAvatar } from "@/components/hr/EmployeeAvatar";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ── Types ───────────────────────────────────────────────────────────────────
interface DashboardData {
  stats: {
    totalActive: number;
    totalProbation: number;
    totalHeadcount: number;
    newThisMonth: number;
    resignedThisMonth: number;
    topReasons: { reason: string; count: number }[];
    attritionBreakdown: { voluntary: number; involuntary: number };
    contractsExpiring: number;
    insuranceEnrolled: number;
    pending: number;
    recruiting: number;
    interviewing: number;
    activeRecruitment: number;
    openPositions: number;
    timeToHire: number;
    costPerHire: number;
    topSource: string;
    total: number;
    activeCourses: number;
    pendingRequests: number;
    laborCost: number;
    totalLastMonth: number;
    avgAge: number;
    revenuePerEmp: number;
    laborCostPercent: number;
    absenceRate: number;
    kpiRate: number;
    completionRate: number;
    avgTrainingHours: number;
    ageGroups: {
      under25: number;
      from25to35: number;
      over35: number;
    };
    genderBreakdown: {
      male: number;
      female: number;
    };
    typeBreakdown: { type: string; count: number }[];
    monthlyTrends: { month: string; joined: number | null; left: number | null }[];
  };
  birthdaysThisMonth: {
    id: string;
    fullName: string;
    position: string;
    departmentName: string;
    avatarUrl: string | null;
    birthdayDay: number;
    isToday: boolean;
  }[];
  anniversaries: {
    id: string;
    fullName: string;
    position: string;
    departmentName: string;
    avatarUrl: string | null;
    yearsWorked: number;
  }[];
  departmentBreakdown: { name: string; count: number }[];
  recentEmployees: {
    id: string;
    fullName: string;
    position: string;
    departmentName: string;
    avatarUrl: string | null;
    startDate: string | null;
    employeeType: string;
    createdAt: string;
  }[];
}

// ── Small helpers ────────────────────────────────────────────────────────────
function SectionTitle({ title, icon, action }: { title: string; icon: string; action?: React.ReactNode }) {
  return (
    <div className="d-flex align-items-center justify-content-between mb-3">
      <div className="d-flex align-items-center gap-2">
        <i className={`bi ${icon}`} style={{ fontSize: 14, color: "var(--primary)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.01em" }}>
          {title}
        </span>
      </div>
      {action}
    </div>
  );
}

function SkeletonLine({ width = "100%", height = 14 }: { width?: string; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: "var(--muted)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function NavCard({
  icon, label, desc, color, href, onClick
}: { icon: string; label: string; desc: string; color: string; href?: string; onClick?: () => void }) {
  const router = useRouter();
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="d-flex align-items-center gap-3 w-100 text-start border-0 bg-transparent p-0"
      style={{ cursor: "pointer" }}
    >
      <div
        className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 40, height: 40, background: `${color}18` }}
      >
        <i className={`bi ${icon}`} style={{ fontSize: 17, color }} />
      </div>
      <div className="overflow-hidden">
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, lineHeight: 1.3 }}>{desc}</div>
      </div>
      <i className="bi bi-chevron-right ms-auto" style={{ fontSize: 11, color: "var(--muted-foreground)" }} />
    </button>
  );
}

function EmployeeTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    official: { label: "Chính thức", cls: "bg-primary-subtle text-primary" },
    probation: { label: "Thử việc", cls: "bg-warning-subtle text-warning" },
    intern: { label: "Thực tập", cls: "bg-info-subtle text-info" },
    collaborator: { label: "CTV", cls: "bg-secondary-subtle text-secondary" },
  };
  const m = map[type] ?? { label: type, cls: "bg-light text-dark" };
  return (
    <span className={`badge rounded-pill px-2 ${m.cls}`} style={{ fontSize: 10 }}>
      {m.label}
    </span>
  );
}

function AIAnalysisResult({ analysis, isAnalyzing, onAnalyze, title, colorPrimary, colorSecondary, icon }: {
  analysis: any;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  title: string;
  colorPrimary: string;
  colorSecondary: string;
  icon: string;
}) {
  return (
    <div style={{ marginTop: "10px", padding: "25px", background: "#fdfaff", borderRadius: "12px", border: `1px solid ${colorPrimary}20` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `linear-gradient(45deg, ${colorPrimary}, ${colorSecondary})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <i className={`bi ${icon}`} style={{ fontSize: "16px" }} />
          </div>
          <h4 style={{ fontSize: "14px", fontWeight: 800, color: colorPrimary, textTransform: "uppercase", margin: 0 }}>
            {title}
          </h4>
        </div>
        {!analysis && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            style={{ border: "none", background: colorPrimary, color: "white", padding: "6px 15px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
          >
            {isAnalyzing ? (
              <> <span className="spinner-border spinner-border-sm" /> Đang phân tích... </>
            ) : (
              <> <i className="bi bi-cpu" /> Bắt đầu phân tích </>
            )}
          </button>
        )}
      </div>

      {analysis ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: "12px", color: colorPrimary, fontWeight: 600, background: `${colorPrimary}08`, padding: "12px", borderRadius: "8px", borderLeft: `4px solid ${colorPrimary}`, lineHeight: 1.5 }}>
            "{analysis.summary}"
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 800, color: colorPrimary, marginBottom: "10px", textTransform: "uppercase" }}>NHẬN ĐỊNH CHUYÊN SÂU</div>
              <ul style={{ paddingLeft: "15px", margin: 0, fontSize: "11px", color: "#4b5563", display: "flex", flexDirection: "column", gap: "8px" }}>
                {analysis.insights?.map((item: string, idx: number) => (
                  <li key={idx} style={{ lineHeight: 1.4 }}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 800, color: colorSecondary, marginBottom: "10px", textTransform: "uppercase" }}>KHUYẾN NGHỊ HÀNH ĐỘNG</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {analysis.recommendations?.map((item: string, idx: number) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", background: "#fff", padding: "10px", borderRadius: "6px", border: `1px solid ${colorSecondary}20`, fontSize: "11px", color: colorSecondary, fontWeight: 600 }}>
                    <i className="bi bi-check-circle-fill" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "20px", color: `${colorPrimary}80`, fontSize: "11px", fontStyle: "italic" }}>
          Nhấn nút để AI bắt đầu phân tích dữ liệu và đưa ra nhận định chiến lược...
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HRDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { error: toastError } = useToast();
  const { data: session } = useSession();
  const [showReportModal, setShowReportModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
   const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiAnalysisAttrition, setAiAnalysisAttrition] = useState<any>(null);
  const [aiAnalysisRecruitment, setAiAnalysisRecruitment] = useState<any>(null);
  const [aiAnalysisPerformance, setAiAnalysisPerformance] = useState<any>(null);
  const [aiAnalysisFinal, setAiAnalysisFinal] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

   const handleAIAnalyze = async (type: string, data: any) => {
    setAiLoading(prev => ({ ...prev, [type]: true }));
    setAiError(null);
    try {
      const res = await fetch("/api/hr/report/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      const result = await res.json();
      if (result.success) {
        const cleanData = JSON.parse(JSON.stringify(result.data).replace(/\*/g, ''));
        if (type === "overview") setAiAnalysis(cleanData);
        if (type === "attrition") setAiAnalysisAttrition(cleanData);
        if (type === "recruitment") setAiAnalysisRecruitment(cleanData);
        if (type === "performance") setAiAnalysisPerformance(cleanData);
        if (type === "final_proposals") setAiAnalysisFinal(cleanData);
      } else {
        setAiError(result.error || "Không thể kết nối với trí tuệ nhân tạo.");
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAiError("Lỗi kết nối mạng hoặc server không phản hồi.");
    } finally {
      setAiLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Tự động phân tích AI khi mở báo cáo
  useEffect(() => {
    if (showReportModal && data?.stats) {
      const s = data.stats;
      const growthRate = (((s.newThisMonth || 0) / (s.totalHeadcount || 1)) * 100).toFixed(1);
      const fillRate = (((s.totalHeadcount || 0) / ((s.totalHeadcount || 0) + (s.openPositions || 0))) * 100).toFixed(1);

      // Chỉ chạy nếu chưa có kết quả và không đang load
      if (!aiAnalysis && !aiLoading["overview"]) {
        handleAIAnalyze("overview", { totalHeadcount: s.totalHeadcount, growthRate, typeBreakdown: s.typeBreakdown, genderBreakdown: s.genderBreakdown, avgAge: s.avgAge, fillRate });
      }
      if (!aiAnalysisAttrition && !aiLoading["attrition"]) {
        handleAIAnalyze("attrition", { 
          newHires: s.newThisMonth, 
          attrition: s.resignedThisMonth, 
          topReasons: s.topReasons, 
          turnoverRate: (((s.resignedThisMonth || 0) / (s.totalHeadcount || 1)) * 100).toFixed(1),
          breakdown: s.attritionBreakdown
        });
      }
      if (!aiAnalysisRecruitment && !aiLoading["recruitment"]) {
        handleAIAnalyze("recruitment", { 
          openPositions: s.openPositions, 
          timeToHire: s.timeToHire, 
          costPerHire: s.costPerHire, 
          topSource: s.topSource, 
          avgTrainingHours: s.avgTrainingHours,
          completionRate: s.completionRate 
        });
      }
      if (!aiAnalysisPerformance && !aiLoading["performance"]) {
        handleAIAnalyze("performance", { revenuePerEmp: s.revenuePerEmp, laborCost: s.laborCost, laborCostPercent: s.laborCostPercent, absenceRate: s.absenceRate, kpiRate: s.kpiRate });
      }
      if (!aiAnalysisFinal && !aiLoading["final_proposals"]) {
        handleAIAnalyze("final_proposals", { totalHeadcount: s.totalHeadcount, growthRate, fillRate, newHires: s.newThisMonth, resignedThisMonth: s.resignedThisMonth, turnoverRate: (((s.resignedThisMonth || 0) / (s.totalHeadcount || 1)) * 100).toFixed(1), openPositions: s.openPositions, timeToHire: s.timeToHire, completionRate: s.completionRate, revenuePerEmp: s.revenuePerEmp, laborCostPercent: s.laborCostPercent, absenceRate: s.absenceRate });
      }
    }
  }, [showReportModal, data]);

  useEffect(() => {
    fetch("/api/company")
      .then(res => res.json())
      .then(data => { if (data && data.name) setCompanyInfo(data); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/hr/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => toastError("Lỗi", e.message))
      .finally(() => setLoading(false));
  }, []);

  const s = data?.stats;
  const now = new Date();
  const monthLabel = now.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <>
      <StandardPage
        title="Quản trị nhân sự"
        description="Hệ thống quản lý nguồn nhân lực Seajong"
        icon="bi-people-fill"
        color="rose"
        useCard={false}
      >
        <div className="flex-grow-1 overflow-auto pe-1 custom-scrollbar">
          {/* ── Row 1: KPI Cards ─────────────────────────────────────────────── */}
          <div className="row g-3 mb-3">
            <KPICard
              label="Tổng nhân sự"
              value={loading ? "—" : (s?.totalHeadcount ?? 0)}
              icon="bi-people-fill"
              accent="#6366f1"
              subtitle={loading ? undefined : `${s?.totalActive ?? 0} đang làm • ${s?.totalProbation ?? 0} thử việc`}
              colClass="col-6 col-lg-3"
            />
            <KPICard
              label="Mới trong tháng"
              value={loading ? "—" : (s?.newThisMonth ?? 0)}
              icon="bi-person-plus-fill"
              accent="#10b981"
              suffix=" người"
              subtitle="Gia nhập tháng này"
              colClass="col-6 col-lg-3"
            />
            <KPICard
              label="Hợp đồng sắp hết hạn"
              value={loading ? "—" : (s?.contractsExpiring ?? 0)}
              icon="bi-file-earmark-text-fill"
              accent={s?.contractsExpiring && s.contractsExpiring > 0 ? "#f59e0b" : "#6366f1"}
              subtitle="Trong 30 ngày tới"
              colClass="col-6 col-lg-3"
            />
            <KPICard
              label="Yêu cầu tuyển dụng"
              value={loading ? "—" : (s?.activeRecruitment ?? 0)}
              icon="bi-briefcase-fill"
              accent="#3b82f6"
              subtitle={loading ? undefined : `${s?.recruiting ?? 0} đang tuyển • ${s?.interviewing ?? 0} phỏng vấn`}
              colClass="col-6 col-lg-3"
            />
          </div>

          {/* ── Row 2: Main content ───────────────────────────────────────────── */}
          <div className="row g-3">

            {/* ── Left column ── */}
            <div className="col-12 col-xl-8 d-flex flex-column gap-3">

              {/* Quick nav */}
              <div className="bg-white rounded-4 shadow-sm border p-3">
                <SectionTitle title="Truy cập nhanh" icon="bi-grid-fill" />
                <div className="row g-2">
                  {[
                    { icon: "bi-person-lines-fill", label: "Hồ sơ nhân viên", desc: "Quản lý toàn bộ nhân sự", color: "#6366f1", href: "/hr/employees" },
                    { icon: "bi-person-plus-fill", label: "Tuyển dụng", desc: "Yêu cầu và ứng viên", color: "#3b82f6", href: "/hr/recruitment" },
                    { icon: "bi-calendar-check-fill", label: "Chấm công", desc: "Bảng công và tăng ca", color: "#10b981", href: "/hr/attendance-payroll" },
                    { icon: "bi-shield-fill-check", label: "Bảo hiểm", desc: "BHXH, BHYT, BHTN", color: "#f59e0b", href: "/hr/insurance" },
                    { icon: "bi-mortarboard-fill", label: "Đào tạo", desc: "Khoá học và đăng ký", color: "#8b5cf6", href: "/hr/training" },
                    { icon: "bi-graph-up-arrow", label: "Báo cáo nhân sự", desc: "Điều chỉnh chức vụ", color: "#ec4899", onClick: () => setShowReportModal(true) },
                  ].map((item, idx) => (
                    <div key={idx} className="col-6 col-md-4">
                      <div
                        className="p-3 rounded-3 h-100"
                        style={{
                          background: "var(--muted)",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${item.color}0f`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--muted)")}
                      >
                        <NavCard {...item} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dept breakdown */}
              <div className="bg-white rounded-4 shadow-sm border p-3">
                <SectionTitle title="Phân bổ theo phòng ban" icon="bi-bar-chart-fill" />
                {loading ? (
                  <div className="d-flex flex-column gap-2">
                    {[80, 60, 45, 30, 25].map((w, i) => (
                      <SkeletonLine key={i} width={`${w}%`} height={12} />
                    ))}
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {(data?.departmentBreakdown ?? []).map((dept) => {
                      const maxCount = Math.max(...(data?.departmentBreakdown.map((d) => d.count) ?? [1]));
                      const pct = Math.round((dept.count / maxCount) * 100);
                      return (
                        <div key={dept.name} className="d-flex align-items-center gap-3">
                          <div style={{ minWidth: 140, fontSize: 12, color: "var(--foreground)", fontWeight: 500, flexShrink: 0 }} className="text-truncate">
                            {dept.name}
                          </div>
                          <div className="flex-grow-1" style={{ height: 8, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                borderRadius: 99,
                                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                          <div style={{ minWidth: 28, fontSize: 12, fontWeight: 700, color: "var(--foreground)", textAlign: "right" }}>
                            {dept.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent employees */}
              <div className="bg-white rounded-4 shadow-sm border p-3">
                <SectionTitle
                  title="Nhân viên mới nhất"
                  icon="bi-clock-history"
                  action={
                    <a href="/hr/employees" className="text-primary" style={{ fontSize: 12, textDecoration: "none" }}>
                      Xem tất cả →
                    </a>
                  }
                />
                {loading ? (
                  <div className="d-flex flex-column gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="d-flex align-items-center gap-3">
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--muted)", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div className="d-flex flex-column gap-1 flex-grow-1">
                          <SkeletonLine width="60%" height={12} />
                          <SkeletonLine width="40%" height={10} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {(data?.recentEmployees ?? []).map((emp, idx) => (
                      <div
                        key={emp.id}
                        className="d-flex align-items-center gap-3 py-2"
                        style={{
                          borderBottom: idx < (data?.recentEmployees.length ?? 0) - 1 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <EmployeeAvatar name={emp.fullName} url={emp.avatarUrl} size={36} borderRadius={10} />
                        <div className="flex-grow-1 overflow-hidden">
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }} className="text-truncate">
                            {emp.fullName}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }} className="text-truncate">
                            {emp.departmentName}
                          </div>
                        </div>
                        <div className="text-end flex-shrink-0">
                          <EmployeeTypeBadge type={emp.employeeType} />
                          <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 3 }}>
                            {emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="col-12 col-xl-4 d-flex flex-column gap-3">

              {/* Secondary KPIs */}
              <div className="bg-white rounded-4 shadow-sm border p-3">
                <SectionTitle title="Tổng quan phúc lợi" icon="bi-heart-fill" />
                <div className="d-flex flex-column gap-2">
                  {[
                    { label: "Tham gia bảo hiểm", value: loading ? "—" : s?.insuranceEnrolled, icon: "bi-shield-fill-check", color: "#10b981" },
                    { label: "Khoá đào tạo đang mở", value: loading ? "—" : s?.activeCourses, icon: "bi-mortarboard-fill", color: "#8b5cf6" },
                    { label: "Yêu cầu đào tạo chờ duyệt", value: loading ? "—" : s?.pendingRequests, icon: "bi-hourglass-split", color: "#f59e0b" },
                    { label: "Nghỉ việc tháng này", value: loading ? "—" : s?.resignedThisMonth, icon: "bi-person-dash-fill", color: "#ef4444" },
                  ].map((item) => (
                    <div key={item.label} className="d-flex align-items-center gap-3 py-1">
                      <div
                        className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 32, height: 32, background: `${item.color}15` }}
                      >
                        <i className={`bi ${item.icon}`} style={{ fontSize: 14, color: item.color }} />
                      </div>
                      <div className="flex-grow-1 overflow-hidden">
                        <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }} className="text-truncate">
                          {item.label}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--foreground)", flexShrink: 0 }}>
                        {item.value ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Birthdays */}
              <div className="bg-white rounded-4 shadow-sm border p-3">
                <SectionTitle title={`Sinh nhật ${monthLabel}`} icon="bi-cake2-fill" />
                {loading ? (
                  <div className="d-flex flex-column gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="d-flex gap-2 align-items-center">
                        <SkeletonLine width="28px" height={28} />
                        <div className="flex-grow-1 d-flex flex-column gap-1">
                          <SkeletonLine width="70%" height={11} />
                          <SkeletonLine width="50%" height={10} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (data?.birthdaysThisMonth ?? []).length === 0 ? (
                  <div className="text-center py-3 text-muted" style={{ fontSize: 12 }}>
                    <i className="bi bi-emoji-smile d-block fs-3 mb-2 opacity-25" />
                    Không có sinh nhật trong tháng này
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: 240, overflowY: "auto" }}>
                    {(data?.birthdaysThisMonth ?? []).map((emp) => (
                      <div
                        key={emp.id}
                        className="d-flex align-items-center gap-2 py-1 px-2 rounded-3"
                        style={{
                          background: emp.isToday ? "color-mix(in srgb, #ec4899 8%, transparent)" : "transparent",
                          border: emp.isToday ? "1px solid color-mix(in srgb, #ec4899 20%, transparent)" : "1px solid transparent",
                        }}
                      >
                        <EmployeeAvatar name={emp.fullName} url={emp.avatarUrl} size={30} borderRadius={8} />
                        <div className="flex-grow-1 overflow-hidden">
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }} className="text-truncate">
                            {emp.fullName}
                            {emp.isToday && <span className="ms-1">🎂</span>}
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--muted-foreground)" }} className="text-truncate">
                            {emp.departmentName}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: emp.isToday ? "#ec4899" : "var(--muted-foreground)",
                            flexShrink: 0,
                          }}
                        >
                          Ngày {emp.birthdayDay}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Anniversaries */}
              <div className="bg-white rounded-4 shadow-sm border p-3">
                <SectionTitle title={`Kỷ niệm làm việc ${monthLabel}`} icon="bi-award-fill" />
                {loading ? (
                  <div className="d-flex flex-column gap-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="d-flex gap-2 align-items-center">
                        <SkeletonLine width="28px" height={28} />
                        <div className="flex-grow-1 d-flex flex-column gap-1">
                          <SkeletonLine width="65%" height={11} />
                          <SkeletonLine width="45%" height={10} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (data?.anniversaries ?? []).length === 0 ? (
                  <div className="text-center py-3 text-muted" style={{ fontSize: 12 }}>
                    <i className="bi bi-calendar-heart d-block fs-3 mb-2 opacity-25" />
                    Không có kỷ niệm trong tháng này
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: 200, overflowY: "auto" }}>
                    {(data?.anniversaries ?? []).map((emp) => {
                      const milestoneColors: Record<number, string> = {
                        1: "#6366f1",
                        2: "#10b981",
                        3: "#f59e0b",
                        5: "#ec4899",
                        10: "#ef4444",
                      };
                      const color = milestoneColors[emp.yearsWorked] ?? "#64748b";
                      return (
                        <div key={emp.id} className="d-flex align-items-center gap-2 py-1">
                          <EmployeeAvatar name={emp.fullName} url={emp.avatarUrl} size={30} borderRadius={8} />
                          <div className="flex-grow-1 overflow-hidden">
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }} className="text-truncate">
                              {emp.fullName}
                            </div>
                            <div style={{ fontSize: 10.5, color: "var(--muted-foreground)" }} className="text-truncate">
                              {emp.departmentName}
                            </div>
                          </div>
                          <div
                            className="rounded-pill px-2 d-flex align-items-center gap-1 flex-shrink-0"
                            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                          >
                            <i className="bi bi-star-fill" style={{ fontSize: 9, color }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color }}>
                              {emp.yearsWorked} năm
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </StandardPage>

      {showReportModal && (
        <PrintPreviewModal
          title="Báo cáo nhân sự"
          onClose={() => setShowReportModal(false)}
          document={
            <div id="hr-report-pdf" style={{ background: "white" }}>
              {/* ── TRANG BÌA (COVER PAGE) ── */}
              <div className="pdf-cover-page" style={{ minHeight: "297mm", display: "flex", flexDirection: "column", background: "white", pageBreakAfter: "always", fontFamily: "'Montserrat', sans-serif" }}>
                <style>{`
                  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&display=swap');
                `}</style>
                {/* Header */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "76px 95px 0" }}>
                  <img src={companyInfo?.logoUrl || "/logo.png"} alt="Logo" style={{ height: "40px" }} />
                  <div>
                    <h1 style={{ margin: 0, fontSize: "12px", fontWeight: 900, textTransform: "uppercase", color: "#003087", letterSpacing: "1px" }}>{companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}</h1>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>{companyInfo?.slogan || "Đồng hành cùng doanh nghiệp bằng các giải pháp số hóa tối ưu"}</p>
                  </div>
                </div>

                {/* Main Visual Block */}
                <div style={{ display: "flex", height: "480px", position: "relative", marginTop: "40px" }}>
                  <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
                    <div style={{ flex: 1, background: "#003087", padding: "40px 0 40px 95px", color: "white", display: "flex", alignItems: "center" }}>
                      <h2 style={{ fontSize: "36px", fontWeight: 800, margin: 0, textTransform: "uppercase", lineHeight: 1.2 }}>
                        <span style={{ fontSize: "24px", opacity: 0.9 }}>Báo cáo</span><br />
                        Quản trị nhân sự
                      </h2>
                    </div>
                    <div style={{ flex: 1.2, background: "#000000", padding: "60px 0 40px 95px", color: "white", clipPath: "polygon(0 0, 100% 25%, 100% 100%, 0 100%)", marginTop: "-80px", zIndex: 2, display: "flex", alignItems: "center" }}>
                      <h1 style={{ fontSize: "32px", fontWeight: 900, margin: 0, color: "#C9A84C", lineHeight: 1.3 }}>
                        Tổng Hợp &<br />Đánh Giá Hiệu Suất<br />Năm 2026
                      </h1>
                    </div>
                  </div>
                  <div style={{ width: "45%", position: "relative" }}>
                    <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="HR Analytics" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>

                {/* Info Section */}
                <div style={{ flex: 1, display: "flex", gap: "40px", marginTop: "40px", padding: "0 95px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "28px" }}>
                    {[
                      { icon: "bi-people-fill", title: "Hiện trạng nhân sự", desc: `Tổng số ${s?.totalHeadcount || 0} nhân sự đang làm việc, tăng trưởng ${((s?.newThisMonth || 0) / (s?.totalHeadcount || 1) * 100).toFixed(1)}% trong kỳ.` },
                      { icon: "bi-cash-coin", title: "Quản trị chi phí", desc: `Kiểm soát quỹ lương và phúc lợi đạt ${(s?.laborCost || 0).toLocaleString()} VNĐ, tối ưu hóa nguồn lực.` },
                      { icon: "bi-graph-up-arrow", title: "Hiệu suất tuyển dụng", desc: `Đang triển khai ${s?.recruiting || 0} vị trí, tập trung thu hút nhân tài và rút ngắn quy trình.` }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <div style={{ width: "42px", height: "42px", background: "#003087", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                          <i className={`bi ${item.icon}`} />
                        </div>
                        <div>
                          <strong style={{ fontSize: "13px", display: "block", color: "#000", textTransform: "uppercase" }}>{item.title}</strong>
                          <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ width: "45%" }}>
                    <h3 style={{ fontSize: "15px", color: "#003087", textTransform: "uppercase", fontWeight: 800, margin: "0 0 12px" }}>VỀ BÁO CÁO NÀY</h3>
                    <p style={{ color: "#475569", fontSize: "11px", lineHeight: 1.6, margin: "0 0 16px" }}>
                      Báo cáo chi tiết hoạt động Quản trị Nhân sự trong năm 2026, tập trung vào phân tích cơ cấu, biến động và hiệu quả sử dụng nguồn nhân lực doanh nghiệp.
                    </p>
                    <h3 style={{ fontSize: "14px", color: "#000", fontWeight: 700, margin: "24px 0 8px" }}>THÔNG TIN BÁO CÁO</h3>
                    <ul style={{ paddingLeft: "16px", margin: 0, fontSize: "11px", color: "#475569", lineHeight: 1.8 }}>
                      <li><strong>Người lập báo cáo:</strong> {session?.user?.name || "Ban Nhân sự"}</li>
                      <li><strong>Trạng thái:</strong> Đang hiệu lực</li>
                      <li><strong>Ban hành:</strong> Năm 2026</li>
                    </ul>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", marginTop: "auto", background: "#003087", color: "white", padding: "24px 95px 36px", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "40%", background: "#000", clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }} />
                  <div style={{ width: "35%", position: "relative", zIndex: 2 }}>
                    <div style={{ fontSize: "10px", color: "#C9A84C", textTransform: "uppercase", fontWeight: 700 }}>Thông tin liên hệ</div>
                    <div style={{ fontSize: "18px", fontWeight: 700 }}>{companyInfo?.phone || "024 3333 8888"}</div>
                  </div>
                  <div style={{ width: "30%", position: "relative", zIndex: 2 }}>
                    <div style={{ fontSize: "10px" }}>Email: {companyInfo?.email || "hr@seajong.vn"}</div>
                    <div style={{ fontSize: "10px", marginTop: "4px" }}>Website: {companyInfo?.website || "www.seajong.vn"}</div>
                  </div>
                  <div style={{ width: "35%", position: "relative", zIndex: 2, paddingLeft: "24px", fontSize: "10px" }}>
                    {companyInfo?.address || "Hà Nội, Việt Nam"}
                  </div>
                </div>
              </div>

              {/* ── TRANG NỘI DUNG (CONTENT PAGES) ── */}
              {[
                { id: "01", title: "TỔNG QUAN HIỆN TRẠNG", label: "I", section: "Tổng quan" },
                { id: "02", title: "BIẾN ĐỘNG NHÂN SỰ", label: "II", section: "Biến động nhân sự" },
                { id: "03", title: "CÔNG TÁC TUYỂN DỤNG VÀ ĐÀO TẠO", label: "III", section: "Công tác tuyển dụng và đào tạo" },
                { id: "04", title: "HIỆU SUẤT VÀ CHI PHÍ", label: "IV", section: "Hiệu suất và chi phí" },
                { id: "05", title: "ĐỀ XUẤT VÀ KIẾN NGHỊ", label: "V", section: "Đề xuất và kiến nghị" },
              ].map((pg, index) => {
                const isOverview = pg.id === "01";
                const totalLastMonth = s?.totalLastMonth || 1;
                const growthRate = (((s?.totalHeadcount || 0) - totalLastMonth) / totalLastMonth * 100).toFixed(1);
                const fillRate = (((s?.totalHeadcount || 0) / ((s?.totalHeadcount || 0) + (s?.openPositions || 0))) * 100).toFixed(1);

                return (
                  <div key={index} className="pdf-content-page" style={{ padding: "40px 95px", background: "white", marginBottom: "20px", fontFamily: "'Montserrat', sans-serif", position: "relative", display: "flex", flexDirection: "column" }}>
                    {/* Header Trang nội dung */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #003087", paddingBottom: "12px", marginBottom: "40px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ background: "#003087", color: "white", padding: "2px 8px", fontSize: "14px", fontWeight: 800, borderRadius: "4px" }}>{pg.label}</span>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#003087", textTransform: "uppercase" }}>{pg.title}</h3>
                      </div>
                      <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 700 }}>Trang {String(index + 2).padStart(2, '0')}</span>
                    </div>

                    {/* Nội dung trang */}
                    <div style={{ flex: 1 }}>
                      {isOverview ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                          {/* 1. Tổng nhân sự */}
                          <div style={{ background: "#f8fafc", padding: "30px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "10px" }}>Tổng nhân sự hiện tại</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "15px" }}>
                              <span style={{ fontSize: "48px", fontWeight: 900, color: "#1e293b" }}>{s?.totalHeadcount}</span>
                              <span style={{ fontSize: "16px", fontWeight: 700, color: Number(growthRate) >= 0 ? "#10b981" : "#ef4444" }}>
                                {Number(growthRate) >= 0 ? `+${growthRate}%` : `${growthRate}%`}
                              </span>
                              <span style={{ fontSize: "12px", color: "#94a3b8" }}>so với kỳ trước</span>
                            </div>
                          </div>

                          {/* 2. Cơ cấu nhân sự */}
                          <div>
                            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", borderLeft: "4px solid #C9A84C", paddingLeft: "12px", marginBottom: "25px" }}>
                              CƠ CẤU NHÂN SỰ
                            </h4>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
                              {/* Theo loại hợp đồng */}
                              <div>
                                <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "15px" }}>THEO LOẠI HỢP ĐỒNG</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                  {(s as any)?.typeBreakdown?.map((t: any, i: number) => {
                                    const pct = ((t.count / (s?.totalHeadcount || 1)) * 100).toFixed(1);
                                    const labels: any = { official: "Chính thức", probation: "Thử việc", collaborator: "Cộng tác viên", intern: "Thực tập" };
                                    return (
                                      <div key={i}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                                          <span style={{ fontWeight: 600 }}>{labels[t.type] || t.type}</span>
                                          <span style={{ color: "#64748b" }}>{t.count} ({pct}%)</span>
                                        </div>
                                        <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                                          <div style={{ width: `${pct}%`, height: "100%", background: "#003087" }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Cơ cấu theo phòng ban */}
                                <div style={{ marginTop: "35px" }}>
                                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "15px" }}>CƠ CẤU THEO PHÒNG BAN</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {(data as any)?.departmentBreakdown?.slice(0, 6).map((dept: any, i: number) => {
                                      const pct = ((dept.count / (s?.totalHeadcount || 1)) * 100).toFixed(1);
                                      return (
                                        <div key={i}>
                                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                                            <span style={{ fontWeight: 600 }}>{dept.name}</span>
                                            <span style={{ color: "#64748b" }}>{dept.count} ({pct}%)</span>
                                          </div>
                                          <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                                            <div style={{ width: `${pct}%`, height: "100%", background: "#C9A84C" }} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Giới tính & Độ tuổi & Lấp đầy */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                                <div>
                                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "15px" }}>THEO GIỚI TÍNH</div>
                                  <div style={{ display: "flex", gap: "15px" }}>
                                    <div style={{ flex: 1, textAlign: "center", padding: "12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #dbeafe" }}>
                                      <i className="bi bi-gender-male" style={{ fontSize: "18px", color: "#3b82f6" }} />
                                      <div style={{ fontSize: "16px", fontWeight: 800, margin: "2px 0" }}>{s?.genderBreakdown.male}</div>
                                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#3b82f6" }}>NAM</div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: "center", padding: "12px", background: "#fdf2f8", borderRadius: "8px", border: "1px solid #fce7f3" }}>
                                      <i className="bi bi-gender-female" style={{ fontSize: "18px", color: "#ec4899" }} />
                                      <div style={{ fontSize: "16px", fontWeight: 800, margin: "2px 0" }}>{s?.genderBreakdown.female}</div>
                                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#ec4899" }}>NỮ</div>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: "12px", background: "#f8fafc", padding: "12px", borderRadius: "10px", alignItems: "center", border: "1px solid #e2e8f0" }}>
                                  <div style={{ width: "36px", height: "36px", background: "white", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                    <i className="bi bi-calendar-event" />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Độ tuổi trung bình</div>
                                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>{s?.avgAge || 0} <span style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8" }}>tuổi</span></div>
                                  </div>
                                </div>

                                <div style={{ padding: "15px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                  <div style={{ fontSize: "10px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", marginBottom: "12px" }}>Tỷ lệ lấp đầy nhân sự</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                    <div style={{ position: "relative", width: "65px", height: "65px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <svg width="65" height="65" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="#003087" strokeWidth="10" strokeDasharray={`${Number(fillRate) * 2.827} 282.7`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                                      </svg>
                                    </div>
                                    <div style={{ flex: 1, fontSize: "10px", color: "#64748b", lineHeight: 1.5 }}>
                                      Đạt <strong>{fillRate}%</strong> định biên ({s?.totalHeadcount}/{(s?.totalHeadcount || 0) + (s?.openPositions || 0)}).
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 4. Phân tích AI */}
                          <AIAnalysisResult
                            analysis={aiAnalysis}
                            isAnalyzing={aiLoading["overview"]}
                            onAnalyze={() => handleAIAnalyze("overview", {
                              totalHeadcount: s?.totalHeadcount,
                              growthRate,
                              typeBreakdown: s?.typeBreakdown,
                              genderBreakdown: s?.genderBreakdown,
                              avgAge: s?.avgAge,
                              fillRate
                            })}
                            title="Phân tích dữ liệu và đề xuất hành động"
                            colorPrimary="#7c3aed"
                            colorSecondary="#db2777"
                            icon="bi-stars"
                          />
                        </div>
                      ) : pg.id === "02" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                          {/* 1. Chỉ số biến động */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "25px" }}>
                            <div style={{ background: "#f0fdf4", padding: "25px", borderRadius: "12px", border: "1px solid #dcfce7" }}>
                              <div style={{ fontSize: "11px", fontWeight: 800, color: "#166534", textTransform: "uppercase", marginBottom: "8px" }}>Nhân viên mới</div>
                              <div style={{ fontSize: "32px", fontWeight: 900, color: "#166534" }}>{s?.newThisMonth} <span style={{ fontSize: "14px", fontWeight: 600 }}>NS</span></div>
                              <div style={{ fontSize: "10px", color: "#16a34a", marginTop: "5px" }}>Gia nhập trong kỳ</div>
                            </div>
                            <div style={{ background: "#fef2f2", padding: "25px", borderRadius: "12px", border: "1px solid #fee2e2" }}>
                              <div style={{ fontSize: "11px", fontWeight: 800, color: "#991b1b", textTransform: "uppercase", marginBottom: "8px" }}>Nhân viên nghỉ việc</div>
                              <div style={{ fontSize: "32px", fontWeight: 900, color: "#991b1b" }}>{s?.resignedThisMonth || 0} <span style={{ fontSize: "14px", fontWeight: 600 }}>NS</span></div>
                              <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "5px" }}>Chấm dứt hợp đồng</div>
                            </div>
                            <div style={{ background: "#fffbeb", padding: "25px", borderRadius: "12px", border: "1px solid #fef3c7" }}>
                              <div style={{ fontSize: "11px", fontWeight: 800, color: "#92400e", textTransform: "uppercase", marginBottom: "8px" }}>Tỷ lệ biến động nhân sự</div>
                              <div style={{ fontSize: "32px", fontWeight: 900, color: "#92400e" }}>
                                {(((s?.resignedThisMonth || 0) / (s?.totalHeadcount || 1)) * 100).toFixed(1)}%
                              </div>
                              <div style={{ fontSize: "10px", color: "#d97706", marginTop: "5px" }}>Tỷ lệ nghỉ việc trong kỳ</div>
                            </div>
                          </div>

                          {/* Biểu đồ biến động 12 tháng */}
                          <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "20px", textTransform: "uppercase" }}>XU HƯỚNG BIẾN ĐỘNG NHÂN SỰ 12 THÁNG</div>
                            <div style={{ height: "220px" }}>
                              <Chart
                                options={{
                                  chart: {
                                    type: 'area',
                                    toolbar: { show: false },
                                    animations: { enabled: false },
                                    zoom: { enabled: false }
                                  },
                                  colors: ['#10b981', '#ef4444'],
                                  stroke: { curve: 'smooth', width: 2 },
                                  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [20, 100] } },
                                  xaxis: { categories: (s?.monthlyTrends || []).map(m => m.month), labels: { style: { fontSize: '10px', fontWeight: 600 } } },
                                  yaxis: {
                                    labels: {
                                      style: { fontSize: '10px', fontWeight: 600 },
                                      formatter: (val: number) => Math.floor(val).toString()
                                    },
                                    forceNiceScale: true,
                                    decimalsInFloat: 0
                                  },
                                  dataLabels: { enabled: false },
                                  grid: { borderColor: '#f1f5f9' },
                                  legend: { position: 'top', horizontalAlign: 'right', fontSize: '11px', fontWeight: 600 },
                                  tooltip: { theme: 'light' }
                                }}
                                series={[
                                  { name: 'Gia nhập', data: (s?.monthlyTrends || []).map(m => m.joined) },
                                  { name: 'Nghỉ việc', data: (s?.monthlyTrends || []).map(m => m.left) }
                                ]}
                                type="area"
                                height="100%"
                              />
                            </div>
                          </div>

                          {/* 2. Phân tích chi tiết */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
                            <div>
                              <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", borderLeft: "4px solid #003087", paddingLeft: "12px", marginBottom: "25px" }}>
                                PHÂN LOẠI NGHỈ VIỆC
                              </h4>
                              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: "12px", fontWeight: 600 }}>Tự nguyện nghỉ việc</div>
                                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#003087" }}>{s?.attritionBreakdown?.voluntary || 0} NS</div>
                                </div>
                                <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                                  <div style={{ width: `${((s?.attritionBreakdown?.voluntary || 0) / (s?.resignedThisMonth || 1)) * 100}%`, height: "100%", background: "#003087" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: "12px", fontWeight: 600 }}>Nghỉ việc không tự nguyện</div>
                                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>{s?.attritionBreakdown?.involuntary || 0} NS</div>
                                </div>
                                <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                                  <div style={{ width: `${((s?.attritionBreakdown?.involuntary || 0) / (s?.resignedThisMonth || 1)) * 100}%`, height: "100%", background: "#cbd5e1" }} />
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", borderLeft: "4px solid #003087", paddingLeft: "12px", marginBottom: "25px" }}>
                                LÝ DO NGHỈ VIỆC CHÍNH
                              </h4>
                              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                {(s?.topReasons?.length || 0) > 0 ? s?.topReasons?.map((r, i) => (
                                  <div key={i} style={{ padding: "12px 15px", background: "#f8fafc", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>{r.reason}</span>
                                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#003087" }}>{r.count} lượt</span>
                                  </div>
                                )) : (
                                  <div style={{ padding: "20px", textAlign: "center", fontSize: "11px", color: "#94a3b8", background: "#f8fafc", borderRadius: "8px", fontStyle: "italic" }}>
                                    Chưa ghi nhận lý do trong kỳ
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 3. Phân tích AI */}
                          <AIAnalysisResult
                            analysis={aiAnalysisAttrition}
                            isAnalyzing={aiLoading["attrition"]}
                            onAnalyze={() => handleAIAnalyze("attrition", {
                              newHires: s?.newThisMonth,
                              attrition: s?.resignedThisMonth || 0,
                              turnoverRate: (((s?.resignedThisMonth || 0) / (s?.totalHeadcount || 1)) * 100).toFixed(1),
                              topReasons: s?.topReasons,
                              breakdown: s?.attritionBreakdown
                            })}
                            title="Phân tích dữ liệu và đề xuất hành động"
                            colorPrimary="#f59e0b"
                            colorSecondary="#ea580c"
                            icon="bi-graph-down-arrow"
                          />
                        </div>
                      ) : pg.id === "03" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "35px" }}>
                          {/* 1. Tuyển dụng */}
                          <div>
                            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", borderLeft: "4px solid #003087", paddingLeft: "12px", marginBottom: "25px" }}>
                              1. HOẠT ĐỘNG TUYỂN DỤNG
                            </h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                              <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Số lượng vị trí đang mở</span>
                                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b" }}>{s?.openPositions || 0} vị trí</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Thời gian tuyển dụng trung bình</span>
                                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b" }}>{s?.timeToHire || 0} ngày</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Chi phí tuyển dụng trung bình</span>
                                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#003087" }}>{(s?.costPerHire || 0).toLocaleString()} VNĐ</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Nguồn ứng viên hiệu quả nhất</span>
                                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#10b981", textTransform: "uppercase" }}>{s?.topSource || "Chưa có dữ liệu"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Đào tạo */}
                          <div>
                            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", borderLeft: "4px solid #003087", paddingLeft: "12px", marginBottom: "25px" }}>
                              2. CÔNG TÁC ĐÀO TẠO
                            </h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                              <div style={{ padding: "20px", background: "#fffbeb", borderRadius: "10px", border: "1px solid #fef3c7" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#92400e" }}>Số giờ đào tạo bình quân/nhân viên</span>
                                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#92400e" }}>{((s as any)?.avgTrainingHours || 0)} giờ</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#92400e" }}>Tổng chi phí đào tạo</span>
                                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#b45309" }}>{((s as any)?.totalTrainingCost || 0).toLocaleString()} VNĐ</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ padding: "20px", background: "#f0f9ff", borderRadius: "10px", border: "1px solid #e0f2fe" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#0369a1" }}>Tỷ lệ hoàn thành khóa học</span>
                                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#0369a1" }}>{((s as any)?.completionRate || 0)}%</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#0369a1" }}>Đánh giá hiệu quả sau đào tạo</span>
                                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#0284c7" }}>{((s as any)?.effectivenessScore || "Chưa có dữ liệu")}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 3. Phân tích AI */}
                          <AIAnalysisResult 
                            analysis={aiAnalysisRecruitment}
                            isAnalyzing={aiLoading["recruitment"]}
                            onAnalyze={() => handleAIAnalyze("recruitment", { 
                              openPositions: s?.openPositions,
                              timeToHire: s?.timeToHire,
                              costPerHire: s?.costPerHire,
                              topSource: s?.topSource,
                              avgTrainingHours: (s as any)?.avgTrainingHours,
                              completionRate: (s as any)?.completionRate
                            })}
                            title="Phân tích dữ liệu và đề xuất hành động"
                            colorPrimary="#0284c7"
                            colorSecondary="#0369a1"
                            icon="bi-lightning-charge"
                          />
                        </div>
                      ) : pg.id === "04" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "35px" }}>
                          {/* 1. Hiệu suất & Chi phí */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
                            <div style={{ padding: "25px", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #dcfce7" }}>
                              <div style={{ fontSize: "11px", fontWeight: 800, color: "#166534", textTransform: "uppercase", marginBottom: "15px" }}>Doanh thu / Nhân viên</div>
                              <div style={{ fontSize: "28px", fontWeight: 900, color: "#166534" }}>
                                {((s as any)?.revenuePerEmp || 0).toLocaleString()} <span style={{ fontSize: "14px", fontWeight: 600 }}>VNĐ</span>
                              </div>
                              <div style={{ fontSize: "10px", color: "#16a34a", marginTop: "10px" }}>Hiệu quả sử dụng nhân lực</div>
                            </div>
                            
                            <div style={{ padding: "25px", background: "#fef2f2", borderRadius: "12px", border: "1px solid #fee2e2" }}>
                              <div style={{ fontSize: "11px", fontWeight: 800, color: "#991b1b", textTransform: "uppercase", marginBottom: "15px" }}>Quỹ lương & Phúc lợi</div>
                              <div style={{ fontSize: "28px", fontWeight: 900, color: "#991b1b" }}>
                                {(s?.laborCost || 0).toLocaleString()} <span style={{ fontSize: "14px", fontWeight: 600 }}>VNĐ</span>
                              </div>
                              <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "10px" }}>
                                Chiếm {(s?.laborCostPercent || 0).toFixed(1)}% doanh thu kỳ này
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
                            <div style={{ padding: "25px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #e0f2fe" }}>
                              <div style={{ fontSize: "11px", fontWeight: 800, color: "#0369a1", textTransform: "uppercase", marginBottom: "15px" }}>Tỷ lệ vắng mặt nhân sự</div>
                              <div style={{ fontSize: "32px", fontWeight: 900, color: "#0369a1" }}>
                                {(s?.absenceRate || 0)}%
                              </div>
                              <div style={{ fontSize: "10px", color: "#0284c7", marginTop: "10px" }}>Dựa trên dữ liệu chấm công thực tế</div>
                            </div>

                            <div style={{ padding: "25px", background: "#fff7ed", borderRadius: "12px", border: "1px solid #ffedd5" }}>
                              <div style={{ fontSize: "11px", fontWeight: 800, color: "#9a3412", textTransform: "uppercase", marginBottom: "15px" }}>Tỷ lệ đạt KPI (Khá trở lên)</div>
                              <div style={{ fontSize: "32px", fontWeight: 900, color: "#9a3412" }}>
                                {(s?.kpiRate || 0)}%
                              </div>
                              <div style={{ fontSize: "10px", color: "#ea580c", marginTop: "10px" }}>Số liệu từ bảng đánh giá hiệu suất</div>
                            </div>
                          </div>

                          {/* 2. Phân tích AI */}
                          <AIAnalysisResult 
                            analysis={aiAnalysisPerformance}
                            isAnalyzing={aiLoading["performance"]}
                            onAnalyze={() => handleAIAnalyze("performance", { 
                              revenuePerEmp: s?.revenuePerEmp,
                              laborCost: s?.laborCost,
                              laborCostPercent: s?.laborCostPercent,
                              absenceRate: s?.absenceRate,
                              kpiRate: s?.kpiRate
                            })}
                            title="Phân tích dữ liệu và đề xuất hành động"
                            colorPrimary="#10b981"
                            colorSecondary="#059669"
                            icon="bi-graph-up"
                          />
                        </div>
                      ) : pg.id === "05" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                          {/* Đánh giá tổng hợp và Đề xuất kiến nghị */}
                          <div style={{ padding: "30px", background: "#f8fafc", borderRadius: "15px", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px" }}>
                              <div style={{ width: "45px", height: "45px", background: "#003087", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", borderRadius: "10px" }}>
                                <i className="bi bi-journal-check" />
                              </div>
                              <div>
                                <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", margin: 0 }}>ĐÁNH GIÁ TỔNG THỂ & KIẾN NGHỊ CHIẾN LƯỢC</h4>
                                <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0" }}>Phân tích tổng hợp dựa trên dữ liệu vận hành thực tế tháng 05/2026</p>
                              </div>
                            </div>

                            <AIAnalysisResult 
                              analysis={aiAnalysisFinal}
                              isAnalyzing={aiLoading["final_proposals"]}
                              onAnalyze={() => handleAIAnalyze("final_proposals", { 
                                totalHeadcount: s?.totalHeadcount,
                                growthRate: (((s?.newThisMonth || 0) / (s?.totalHeadcount || 1)) * 100).toFixed(1),
                                fillRate,
                                newHires: s?.newThisMonth,
                                resignedThisMonth: s?.resignedThisMonth,
                                turnoverRate: (((s?.resignedThisMonth || 0) / (s?.totalHeadcount || 1)) * 100).toFixed(1),
                                openPositions: s?.openPositions,
                                timeToHire: s?.timeToHire,
                                completionRate: s?.completionRate,
                                revenuePerEmp: s?.revenuePerEmp,
                                laborCostPercent: s?.laborCostPercent,
                                absenceRate: s?.absenceRate
                              })}
                              title=""
                              colorPrimary="#003087"
                              colorSecondary="#000000"
                              icon="bi-trophy"
                            />
                          </div>

                          <div style={{ padding: "20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                            <h5 style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "15px" }}>GHI CHÚ QUẢN TRỊ</h5>
                            <p style={{ fontSize: "11px", color: "#475569", lineHeight: 1.6, margin: 0 }}>
                              Báo cáo này được tự động tổng hợp từ dữ liệu thời gian thực. Các kiến nghị trên mang tính chất tham khảo chiến lược dựa trên các mô hình phân tích hiệu suất. Ban Giám Đốc cần xem xét bối cảnh kinh doanh thực tế để đưa ra quyết định cuối cùng.
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Các mục khác */
                        <div style={{ flex: 1, border: "1px dashed #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                          <div style={{ textAlign: "center", opacity: 0.3 }}>
                            <i className="bi bi-layout-text-window-reverse" style={{ fontSize: "48px", color: "#94a3b8" }} />
                            <p style={{ marginTop: "12px", fontSize: "14px", fontWeight: 600 }}>Nội dung chi tiết mục "{pg.section}" đang chờ thiết kế</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          }
          actions={
            <button className="btn btn-primary fw-bold px-4" onClick={() => printDocumentById("hr-report-pdf")}>
              <i className="bi bi-printer-fill me-2" /> In toàn bộ báo cáo
            </button>
          }
        />
      )}
    </>
  );
}
