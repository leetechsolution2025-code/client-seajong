"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { PageHeader } from "@/components/layout/PageHeader";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table, TableColumn } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { exportElementToPDF, generatePDFBlob } from "@/lib/utils/pdf";

interface ContentPlanItem {
  id: string;
  stt?: string;
  pillar: string;
  purpose?: string;
  role?: string;
  details: string;
  budget: number;
  postsCount: number;
  isTotal?: boolean;
  isChildRow?: boolean;
  parentId?: string;
  childId?: string;
  ratioStr?: string;
}
interface DetailGroup {
  id: string;
  con: string;
  chau: string;
}

interface AdPlanItem {
  id: string;
  stt?: string;
  objective: string;
  topic: string;
  channel: string;
  content: string;
  landingPage?: string;
  budget: number;
  region: string;
  assignee: string;
  startDate: string;
  endDate: string;
  audience: string;
  isTotal?: boolean;
  details?: string;
  isChildRow?: boolean;
  parentId?: string;
  childId?: string;
  ratioStr?: string;
  postsCount?: number;
}

const baseAdPlanConfigs: any[] = [];

const VIETNAM_PROVINCES = [
  "Toàn quốc", "Miền Bắc", "Miền Trung", "Miền Nam",
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

const baseContentPlan: ContentPlanItem[] = [];

const HOLIDAYS_LIST_BY_MONTH: { [month: number]: { dateStr: string; name: string; weekNum: number }[] } = {
  1: [
    { dateStr: "01/01", name: "Tết Dương Lịch", weekNum: 1 }
  ],
  2: [
    { dateStr: "03/02", name: "Thành lập Đảng", weekNum: 1 },
    { dateStr: "14/02", name: "Lễ Tình nhân", weekNum: 2 }
  ],
  3: [
    { dateStr: "08/03", name: "Quốc tế Phụ nữ", weekNum: 2 },
    { dateStr: "26/03", name: "Thành lập Đoàn", weekNum: 4 }
  ],
  4: [
    { dateStr: "30/04", name: "Giải phóng Miền Nam", weekNum: 4 }
  ],
  5: [
    { dateStr: "01/05", name: "Quốc tế Lao động", weekNum: 1 },
    { dateStr: "07/05", name: "Chiến thắng Điện Biên Phủ", weekNum: 1 },
    { dateStr: "19/05", name: "Sinh nhật Bác", weekNum: 3 }
  ],
  6: [
    { dateStr: "01/06", name: "Quốc tế Thiếu nhi", weekNum: 1 },
    { dateStr: "05/06", name: "Môi trường Thế giới", weekNum: 1 },
    { dateStr: "21/06", name: "Báo chí CMXHCN VN", weekNum: 3 },
    { dateStr: "28/06", name: "Ngày Gia đình VN", weekNum: 4 }
  ],
  7: [
    { dateStr: "27/07", name: "Thương binh Liệt sĩ", weekNum: 4 }
  ],
  8: [
    { dateStr: "19/08", name: "Cách mạng Tháng 8", weekNum: 3 }
  ],
  9: [
    { dateStr: "02/09", name: "Quốc khánh", weekNum: 1 }
  ],
  10: [
    { dateStr: "10/10", name: "Giải phóng Thủ đô", weekNum: 2 },
    { dateStr: "20/10", name: "Phụ nữ Việt Nam", weekNum: 3 },
    { dateStr: "31/10", name: "Halloween", weekNum: 4 }
  ],
  11: [
    { dateStr: "20/11", name: "Nhà giáo Việt Nam", weekNum: 3 }
  ],
  12: [
    { dateStr: "22/12", name: "Thành lập Quân đội", weekNum: 4 },
    { dateStr: "25/12", name: "Giáng sinh", weekNum: 4 }
  ]
};

interface BudgetInputRowProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  valBranding: number;
}

const BudgetInputRow: React.FC<BudgetInputRowProps> = ({ label, value, onChange, valBranding }) => {
  const [pctText, setPctText] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (valBranding > 0) {
      const pct = (value / valBranding) * 100;
      const roundedPct = Math.round(pct * 100) / 100;
      const parsedPct = parseFloat(pctText);
      if (isNaN(parsedPct) || Math.abs(parsedPct - roundedPct) > 0.001) {
        if (value === 0) {
          setPctText("");
        } else {
          setPctText(roundedPct.toString());
        }
      }
    } else {
      setPctText("");
    }
  }, [value, valBranding]);

  const handlePctChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;
    inputVal = inputVal.replace(/,/g, ".");
    const cleanVal = inputVal.replace(/[^0-9.]/g, "");
    const parts = cleanVal.split(".");
    let formattedVal = parts[0];
    if (parts.length > 1) {
      formattedVal += "." + parts[1].substring(0, 2);
    }

    setPctText(formattedVal);

    if (formattedVal === "" || formattedVal === ".") {
      onChange(0);
      return;
    }

    const pct = parseFloat(formattedVal);
    if (!isNaN(pct)) {
      const calculatedVnd = Math.round((pct / 100) * valBranding);
      onChange(calculatedVnd);
    }
  };

  const handleVndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const numVal = Number(rawVal) || 0;
    onChange(numVal);
  };

  return (
    <div className="d-flex align-items-center justify-content-between gap-3" style={{ height: 28 }}>
      <span style={{ fontSize: 12, color: "var(--muted-foreground)", flex: 1, textAlign: "left" }}>
        {label}
      </span>

      {/* Visual Single Input Control Wrapper */}
      <div
        className="d-flex align-items-center"
        style={{
          border: isFocused ? "1px solid #86b7fe" : "1px solid #ced4da",
          boxShadow: isFocused ? "0 0 0 0.25rem rgba(13, 110, 253, 0.25)" : "none",
          borderRadius: 4,
          height: 28,
          width: 160,
          background: "#fff",
          padding: "0 6px",
          transition: "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
          userSelect: "none"
        }}
      >
        {/* % Input Part */}
        <input
          type="text"
          value={pctText}
          onChange={handlePctChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="0"
          style={{
            border: "none",
            outline: "none",
            width: "35px",
            height: "100%",
            textAlign: "right",
            fontSize: 12,
            fontWeight: 600,
            background: "transparent",
            padding: "0 2px 0 0",
            color: "var(--foreground)"
          }}
        />
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", paddingRight: 6, borderRight: "1px solid #dee2e6", height: "60%", display: "flex", alignItems: "center" }}>
          %
        </span>

        {/* VND Input Part */}
        <input
          type="text"
          value={value ? value.toLocaleString("vi-VN") : ""}
          onChange={handleVndChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="0"
          style={{
            border: "none",
            outline: "none",
            flex: 1,
            minWidth: 0,
            width: 0,
            height: "100%",
            textAlign: "right",
            fontSize: 12,
            fontWeight: 600,
            background: "transparent",
            padding: "0 2px 0 6px",
            color: "var(--foreground)"
          }}
        />
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", paddingLeft: 2 }}>
          đ
        </span>
      </div>
    </div>
  );
};

const BUDGET_CATEGORIES = [
  { id: "agencyPOSBudget", label: "Marketing tại điểm bán" },
  { id: "agencyAdsBudget", label: "Quảng cáo" },
  { id: "agencyGiftBudget", label: "Quà tặng" },
  { id: "advFbAds", label: "Chi phí quảng cáo Facebook Ads" },
  { id: "advGoogleAds", label: "Chi phí quảng cáo Google Ads" },
  { id: "advYoutubeAds", label: "Chi phí quảng cáo Youtube Ads" },
  { id: "advTiktokAds", label: "Chi phí quảng cáo Tiktok Ads" },
  { id: "advSeoPr", label: "Chi phí SEO + CTV + PR báo chí" },
  { id: "advPrintOutsource", label: "Chi phí in ấn & thiết kế thuê ngoài" },
  { id: "advMediaModelDecor", label: "Chi phí media + mẫu + decor" },
  { id: "advWebDesign", label: "Chi phí thiết kế và duy trì website" },
  { id: "advOther", label: "Các chi phí khác" },
  { id: "advReserve", label: "Dự phòng" }
];

interface DonutDataItem {
  label: string;
  value: number;
  color: string;
}

interface PrintDonutChartProps {
  title: string;
  data: DonutDataItem[];
}

const PrintDonutChart: React.FC<PrintDonutChartProps> = ({ title, data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const radius = 38;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div style={{
      width: "48%",
      border: "1px solid #cbd5e1",
      borderRadius: "6px",
      padding: "10px 12px",
      background: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
    }}>
      <div style={{
        fontSize: "11px",
        fontWeight: 700,
        color: "#1e293b",
        textTransform: "uppercase",
        borderBottom: "1px solid #cbd5e1",
        paddingBottom: "4px",
        marginBottom: "8px",
        textAlign: "center",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
        <div style={{ width: "100px", height: "100px", flexShrink: 0, position: "relative" }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {total > 0 ? (
              data.map((item, idx) => {
                const percentage = (item.value / total) * 100;
                if (percentage <= 0) return null;
                const strokeDash = `${(percentage / 100) * circumference} ${circumference}`;
                const rotation = -90 + (accumulatedPercent / 100) * 360;
                accumulatedPercent += percentage;

                return (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    transform={`rotate(${rotation} 50 50)`}
                  />
                );
              })
            ) : (
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#cbd5e1"
                strokeWidth={strokeWidth}
              />
            )}
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 }}>
          {data.map((item, idx) => {
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#334155", fontWeight: 600 }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "1px",
                  backgroundColor: item.color,
                  display: "inline-block",
                  flexShrink: 0,
                }} />
                <span style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginRight: 4,
                }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface PlanPrintDocumentProps {
  id?: string;
  selectedYear: string;
  budgetRows: any[];
  salaryRows: any[];
  contentPlanRows: any[];
  adPlanRows: any[];
  monthlyBudgets: Record<number, number>;
  sectionContentItems: Record<string, any[]>;
  categoryBudgets: Record<string, number>;
  monthlyAllocations: Record<number, Record<string, { budget: number; note: string }>>;
  valBranding: number;
  rowPadding?: number;
  proposerSig?: string | null;
  approverSig?: string | null;
  monthlyThemes?: any[];
  customHolidays?: any[];
  monthlyProducts?: any;
  planStatus?: string;
}

const PlanPrintDocument: React.FC<PlanPrintDocumentProps> = ({
  id = "plan-print-doc",
  selectedYear,
  budgetRows,
  salaryRows,
  contentPlanRows,
  adPlanRows,
  monthlyBudgets,
  sectionContentItems,
  categoryBudgets,
  monthlyAllocations,
  valBranding,
  rowPadding = 6,
  proposerSig,
  approverSig,
  monthlyThemes = [],
  customHolidays = [],
  monthlyProducts = {},
  planStatus = "draft",
}) => {
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetch("/api/company")
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data) setCompanyInfo(data);
      })
      .catch(() => {});
  }, []);

  const totalAllocatedMonthly = Object.values(monthlyBudgets).reduce((sum, val) => sum + (val || 0), 0);
  const totalAllocatedBudgets = Object.values(categoryBudgets).reduce((sum, val) => sum + (val || 0), 0);

  const valAgent = budgetRows.find((r: any) => r.id === "dt_1")?.value || 0;
  const valAgentDev = budgetRows.find((r: any) => r.id === "dt_2")?.value || 0;
  const valTraditional = budgetRows.find((r: any) => r.id === "dt_3")?.value || 0;
  const valEcommerce = budgetRows.find((r: any) => r.id === "dt_4")?.value || 0;
  const totalRevenue = valAgent + valAgentDev + valTraditional + valEcommerce;

  const valBrandingCost = budgetRows.find((r: any) => r.id === "cp_1")?.value || 0;
  const valSalaryBonus = budgetRows.find((r: any) => r.id === "cp_2")?.value || 0;
  const valTravel = budgetRows.find((r: any) => r.id === "cp_3")?.value || 0;

  const revenueData: DonutDataItem[] = [
    { label: "Đại lý", value: valAgent, color: "#3b82f6" },
    { label: "Phát triển đại lý", value: valAgentDev, color: "#10b981" },
    { label: "Truyền thống", value: valTraditional, color: "#f59e0b" },
    { label: "Thương mại điện tử", value: valEcommerce, color: "#ec4899" },
  ];

  const costData: DonutDataItem[] = [
    { label: "Branding", value: valBrandingCost, color: "#3b82f6" },
    { label: "Lương & thưởng", value: valSalaryBonus, color: "#10b981" },
    { label: "Công tác phí", value: valTravel, color: "#f59e0b" },
  ];

  const parseParentDetails = (detailsStr: string) => {
    let description = "";
    let children: any[] = [];
    if (!detailsStr) return { description, children };
    if (detailsStr === "Nội dung chi tiết...") return { description: "Nội dung chi tiết...", children };
    try {
      if (detailsStr.startsWith("{")) {
        const obj = JSON.parse(detailsStr);
        description = obj.description || "";
        if (Array.isArray(obj.children)) {
          children = obj.children;
        } else if (Array.isArray(obj.groups)) {
          children = obj.groups.map((g: any, idx: number) => ({
            id: g.id || `g_${Date.now()}_${idx}`,
            pillar: g.con || "",
            details: Array.isArray(g.chau) ? g.chau.join("\n") : (g.chau || "")
          }));
        }
      } else if (detailsStr.startsWith("[")) {
        const raw = JSON.parse(detailsStr);
        if (Array.isArray(raw)) {
          children = raw.map((g: any, idx: number) => ({
            id: g.id || `g_${Date.now()}_${idx}`,
            pillar: g.con || "",
            details: Array.isArray(g.chau) ? g.chau.join("\n") : (g.chau || "")
          }));
        }
      } else {
        description = detailsStr;
      }
    } catch (e) {
      description = detailsStr;
    }
    return { description, children };
  };

  const renderMonthlyThemeSummary = (m: number) => {
    const currentMonthThemes = monthlyThemes.filter(t => t.month === m || (!t.month && m === 6));
    if (currentMonthThemes.length === 0) {
      return <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 10 }}>(Chưa có chủ đề tháng)</span>;
    }
    
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "2px 0" }}>
        {currentMonthThemes.map((theme, idx) => {
          const descLines = theme.content
            ? theme.content.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0)
            : [];
          return (
            <div key={theme.id || idx} style={{ borderBottom: idx < currentMonthThemes.length - 1 ? "1px dashed #cbd5e1" : "none", paddingBottom: idx < currentMonthThemes.length - 1 ? 8 : 0 }}>
              <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: 10.5, textTransform: "uppercase", marginBottom: 4 }}>
                ★ {theme.topic}
              </div>
              {descLines.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", paddingLeft: "10px" }}>
                  {descLines.map((line: string, lIdx: number) => {
                    const colonIdx = line.indexOf(":");
                    if (colonIdx > 0 && colonIdx < 15) {
                      const prefix = line.substring(0, colonIdx + 1);
                      const suffix = line.substring(colonIdx + 1);
                      return (
                        <div key={lIdx} style={{ fontSize: 9.5, color: "#475569", lineHeight: 1.35 }}>
                          <strong style={{ color: "#334155" }}>• {prefix}</strong>{suffix}
                        </div>
                      );
                    }
                    return (
                      <div key={lIdx} style={{ fontSize: 9.5, color: "#475569", lineHeight: 1.35 }}>
                        • {line}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMultilineText = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return null;
    if (lines.length === 1) {
      return <div style={{ whiteSpace: "pre-line" }}>{lines[0]}</div>;
    }
    return (
      <ul style={{ margin: 0, paddingLeft: "16px", listStyleType: "disc" }}>
        {lines.map((line, index) => {
          let cleanLine = line;
          if (cleanLine.startsWith("-") || cleanLine.startsWith("•") || cleanLine.startsWith("*") || cleanLine.startsWith("+")) {
            cleanLine = cleanLine.substring(1).trim();
          }
          return (
            <li key={index} style={{ marginBottom: "2px", whiteSpace: "pre-line" }}>
              {cleanLine}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderDetailedMonthPlan = (m: number) => {
    const monthStr = String(m).padStart(2, "0");
    const lastDayOfMonth = new Date(parseInt(selectedYear, 10) || 2026, m, 0).getDate();
    const lastDayStr = String(lastDayOfMonth).padStart(2, "0");

    const weeklyWeeks = [
      { num: 1, range: `01/${monthStr}–07/${monthStr}` },
      { num: 2, range: `08/${monthStr}–14/${monthStr}` },
      { num: 3, range: `15/${monthStr}–21/${monthStr}` },
      { num: 4, range: `22/${monthStr}–${lastDayStr}/${monthStr}` },
    ];

    const defaultHolidays = HOLIDAYS_LIST_BY_MONTH[m] || [];
    const monthCustomHolidays = customHolidays
      .filter((h: any) => h.month === m)
      .map((h: any) => ({ ...h, isCustom: true }));
    const holidays = [...defaultHolidays, ...monthCustomHolidays];

    const currentMonthThemes = monthlyThemes.filter(t => t.month === m || (!t.month && m === 6));

    const currentMonthProducts = monthlyProducts[m] || {};

    const renderSectionRows = (sectionId: string, sectionTitle: string, bgHeader: string, colorHeader: string) => {
      const items = sectionContentItems[`${sectionId}_${m}`] || [];
      const rows: React.ReactNode[] = [];

      rows.push(
        <tr key={`${sectionId}_header`} style={{ background: bgHeader, fontWeight: 700 }}>
          <td colSpan={5} style={{ padding: "6px 8px", border: "1px solid #cbd5e1", color: colorHeader, textTransform: "uppercase" }}>
            {sectionTitle}
          </td>
        </tr>
      );

      if (items.length === 0) {
        rows.push(
          <tr key={`${sectionId}_empty`} style={{ borderBottom: "1px solid #cbd5e1" }}>
            <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", color: "#94a3b8", fontStyle: "italic" }}>(Trống)</td>
            <td colSpan={4} style={{ padding: "6px 8px", border: "1px solid #cbd5e1", color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>
              Chưa có kế hoạch chi tiết trong tháng này
            </td>
          </tr>
        );
        return rows;
      }

      items.forEach((item, idx) => {
        const weeks = item.weeks || [1, 2, 3, 4];
        const minWk = weeks.length > 0 ? Math.min(...weeks) : 1;
        const maxWk = weeks.length > 0 ? Math.max(...weeks) : 4;

        rows.push(
          <tr key={`${sectionId}_item_${item.id || idx}`} style={{ borderBottom: "1px solid #cbd5e1" }}>
            <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", fontWeight: 500, fontSize: 8.5, color: "#64748b", verticalAlign: "middle" }}>
              ↳ Hoạt động {idx + 1}
            </td>
            {[1, 2, 3, 4].map(wNum => {
              if (wNum === minWk) {
                const colSpan = maxWk - minWk + 1;
                const formatText = item.format ? `[${item.format}]` : "";
                const channelText = item.channel ? ` (${item.channel})` : "";
                const budgetText = item.budget ? ` - ${item.budget.toLocaleString("vi-VN")} đ` : "";

                return (
                  <td key={wNum} colSpan={colSpan} style={{ padding: "6px 8px", border: "1px solid #cbd5e1", verticalAlign: "top" }}>
                    <div style={{ 
                      padding: "6px 8px", 
                      background: "#f8fafc", 
                      borderRadius: "4px",
                      textAlign: "left",
                      lineHeight: "1.35",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 10, color: "#0f172a" }}>
                        {item.topic || item.pillar || "Nội dung"}
                      </div>
                      {(formatText || channelText || budgetText) && (
                        <div style={{ fontSize: 9, color: "#475569", marginTop: 3 }}>
                          {formatText}{channelText}{budgetText}
                        </div>
                      )}
                      {item.details && (
                        <div style={{ fontSize: 9, color: "#64748b", borderTop: "1px dashed #cbd5e1", paddingTop: 3, marginTop: 4, whiteSpace: "pre-line" }}>
                          {item.details}
                        </div>
                      )}
                      {item.detailedTasks && item.detailedTasks.length > 0 && (
                        <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: 4, marginTop: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: 8.5, color: "#0f172a", marginBottom: 3 }}>
                            Nội dung chi tiết:
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 6 }}>
                            {item.detailedTasks.map((t: any, tidx: number) => {
                              if (sectionId === "section_content") {
                                const fmt = ["Video", "Hình ảnh", "Bài viết"].includes(t.assignee) ? t.assignee : "Video";
                                const channels = t.deadline ? t.deadline : "";
                                return (
                                  <div key={t.id || tidx} style={{ fontSize: 8.5, color: "#334155", lineHeight: 1.3 }}>
                                    <span style={{ color: "#d97706", fontWeight: 600 }}>[{fmt}]</span> {t.name}
                                    {channels && <span style={{ color: "#1d4ed8", fontStyle: "italic" }}> ({channels})</span>}
                                  </div>
                                );
                              } else {
                                const assign = t.assignee || "";
                                const dl = t.deadline ? t.deadline.split("-").reverse().slice(0, 2).join("/") : "";
                                const metaParts = [];
                                if (assign) metaParts.push(assign);
                                if (dl) metaParts.push(dl);
                                const metaText = metaParts.join(" - ");
                                return (
                                  <div key={t.id || tidx} style={{ fontSize: 8.5, color: "#334155", lineHeight: 1.3 }}>
                                    • {t.name}
                                    {metaText && <span style={{ color: "#64748b", fontSize: 8 }}> ({metaText})</span>}
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      )}
                      {item.assignee && (
                        <div style={{ fontSize: 9, color: "#0f172a", fontWeight: 600, marginTop: 4 }}>
                          Người phụ trách: {item.assignee}
                        </div>
                      )}
                    </div>
                  </td>
                );
              }
              if (wNum > minWk && wNum <= maxWk) {
                return null;
              }
              return (
                <td key={wNum} style={{ padding: "6px 4px", border: "1px solid #cbd5e1", background: "#fafafa" }} />
              );
            })}
          </tr>
        );
      });

      return rows;
    };

    return (
      <div key={m} className="pdf-content-page" style={{ padding: "2cm 2cm 2cm 3cm", minHeight: "980px", boxSizing: "border-box" }}>
        <h5 style={{ fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", fontSize: 13, borderBottom: "1.5px solid #1e3a8a", paddingBottom: 6 }}>
          KẾ HOẠCH CHI TIẾT HOẠT ĐỘNG - THÁNG {m}/{selectedYear}
        </h5>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9, marginTop: 15, border: "1px solid #cbd5e1" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
              <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "left", width: "110px" }}>Hạng mục</th>
              {weeklyWeeks.map(wk => (
                <th key={wk.num} style={{ padding: "6px 4px", border: "1px solid #cbd5e1", textAlign: "left", width: "120px" }}>
                  <div style={{ fontWeight: 700 }}>Tuần {wk.num}</div>
                  <div style={{ fontSize: 8, color: "#64748b", fontWeight: 400 }}>{wk.range}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", background: "#f1f5f9", fontWeight: 700 }}>CHỦ ĐỀ THÁNG</td>
              <td colSpan={4} style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "left" }}>
                {currentMonthThemes.length === 0 ? (
                  <span style={{ color: "#94a3b8", fontStyle: "italic" }}>(Chưa cấu hình chủ đề)</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {currentMonthThemes.map((theme, idx) => (
                      <div key={theme.id || idx}>
                        <div style={{ fontWeight: 700, color: "#1e3a8a" }}>★ {theme.topic}</div>
                        {theme.content && (
                          <div style={{ fontSize: 8.5, color: "#475569", whiteSpace: "pre-line", paddingLeft: 8, marginTop: 2 }}>
                            {theme.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </td>
            </tr>

            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 600 }}>Ngày lễ trong tuần</td>
              {[1, 2, 3, 4].map(wNum => {
                const weekHolidays = holidays.filter(h => h.weekNum === wNum);
                return (
                  <td key={wNum} style={{ padding: "6px 4px", border: "1px solid #cbd5e1", verticalAlign: "top", fontSize: 8.5 }}>
                    {weekHolidays.map((h, idx) => (
                      <div key={idx} style={{ color: h.isCustom ? "#2563eb" : "#334155", marginBottom: 2 }}>
                        • {h.dateStr} - {h.name}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>

            <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
              <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 600 }}>Sản phẩm trọng tâm</td>
              {[1, 2, 3, 4].map(wNum => {
                const weekProds = currentMonthProducts[wNum] || [];
                return (
                  <td key={wNum} style={{ padding: "6px 4px", border: "1px solid #cbd5e1", verticalAlign: "top", fontSize: 8.5 }}>
                    {weekProds.map((prodName: string, idx: number) => (
                      <span key={idx} style={{ 
                        display: "inline-block", 
                        padding: "1px 4px", 
                        background: "#f1f5f9", 
                        border: "1px solid #cbd5e1", 
                        borderRadius: "3px", 
                        marginRight: 4, 
                        marginBottom: 4,
                        fontSize: 8
                      }}>
                        {prodName}
                      </span>
                    ))}
                  </td>
                );
              })}
            </tr>

            {renderSectionRows("section_content", "CONTENT PLAN", "#fef2f2", "#991b1b")}
            {renderSectionRows("section_media", "MEDIA / PR", "#eff6ff", "#1d4ed8")}
            {renderSectionRows("section_adv", "ADS PLAN", "#f0fdf4", "#166534")}
            {renderSectionRows("section_pos", "ĐIỂM BÁN (POS)", "#fffbeb", "#9a3412")}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAllocationMatrixTotals = () => {
    const agencyCats = BUDGET_CATEGORIES.slice(0, 3);
    const advCats = BUDGET_CATEGORIES.slice(3);

    const renderTotalsRows = (cats: typeof BUDGET_CATEGORIES, startIndex: number) => {
      return cats.map((cat, idx) => {
        const totalCatBudget = categoryBudgets[cat.id] || 0;
        return (
          <tr key={cat.id} style={{ borderBottom: "1px solid #cbd5e1" }}>
            <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", fontSize: 9.5, fontWeight: 500 }}>{startIndex + idx}. {cat.label}</td>
            <td style={{ padding: "5px 8px", border: "1px solid #cbd5e1", textAlign: "right", fontWeight: 700, fontSize: 9.5 }}>
              {totalCatBudget ? `${totalCatBudget.toLocaleString("vi-VN")} đ` : "-"}
            </td>
          </tr>
        );
      });
    };

    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5, border: "1px solid #cbd5e1" }}>
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
            <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "left" }}>Hạng mục phân bổ</th>
            <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "right", width: "200px" }}>Tổng ngân sách năm</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
            <td colSpan={2} style={{ padding: "6px 8px", border: "1px solid #cbd5e1", color: "#1e3a8a", textTransform: "uppercase", fontSize: 9.5 }}>I. Ngân sách cho đại lý</td>
          </tr>
          {renderTotalsRows(agencyCats, 1)}
          <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
            <td colSpan={2} style={{ padding: "6px 8px", border: "1px solid #cbd5e1", color: "#1e3a8a", textTransform: "uppercase", fontSize: 9.5 }}>II. Ngân sách cho quảng cáo / thương hiệu</td>
          </tr>
          {renderTotalsRows(advCats, 4)}
        </tbody>
      </table>
    );
  };

  const renderAllocationMatrixMonthly = () => {
    const getMonthValue = (m: number, catId: string) => {
      const alloc = (monthlyAllocations[m] || {})[catId];
      return alloc ? (alloc.budget || 0) : 0;
    };

    const agencyCats = BUDGET_CATEGORIES.slice(0, 3);
    const advCats = BUDGET_CATEGORIES.slice(3);

    const renderMonthlyRows = (cats: typeof BUDGET_CATEGORIES, startIndex: number) => {
      return cats.map((cat, idx) => {
        return (
          <tr key={cat.id} style={{ borderBottom: "1px solid #cbd5e1" }}>
            <td style={{ padding: "4px 6px", border: "1px solid #cbd5e1", fontSize: 9, fontWeight: 500 }}>{startIndex + idx}. {cat.label}</td>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
              const val = getMonthValue(m, cat.id);
              return (
                <td key={m} style={{ padding: "4px 2px", border: "1px solid #cbd5e1", textAlign: "right", fontSize: 8.5, color: val ? "#000" : "#94a3b8" }}>
                  {val ? val.toLocaleString("vi-VN") : "-"}
                </td>
              );
            })}
          </tr>
        );
      });
    };

    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9, border: "1px solid #cbd5e1" }}>
        <thead>
          <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
            <th style={{ padding: "5px 6px", border: "1px solid #cbd5e1", textAlign: "left", width: "160px" }}>Hạng mục phân bổ</th>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <th key={m} style={{ padding: "5px 2px", border: "1px solid #cbd5e1", textAlign: "right", width: "38px" }}>T{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
            <td colSpan={13} style={{ padding: "5px 6px", border: "1px solid #cbd5e1", color: "#1e3a8a", textTransform: "uppercase", fontSize: 9 }}>I. Ngân sách cho đại lý</td>
          </tr>
          {renderMonthlyRows(agencyCats, 1)}
          <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
            <td colSpan={13} style={{ padding: "5px 6px", border: "1px solid #cbd5e1", color: "#1e3a8a", textTransform: "uppercase", fontSize: 9 }}>II. Ngân sách cho quảng cáo / thương hiệu</td>
          </tr>
          {renderMonthlyRows(advCats, 4)}
        </tbody>
      </table>
    );
  };

  return (
    <div id={id} style={{ background: "#fff", color: "#000", fontFamily: "'Roboto Condensed', sans-serif", width: "100%" }}>
      
      {/* ==================== PAGE 1: COVER PAGE ==================== */}
      <div className="pdf-cover-page" style={{ 
        padding: "0", 
        minHeight: "980px", 
        display: "flex", 
        flexDirection: "column", 
        boxSizing: "border-box",
        background: "#ffffff",
        position: "relative"
      }}>
        {/* Cover Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "115px 80px 0 80px" 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {companyInfo?.logoUrl ? (
              <img src={companyInfo.logoUrl} alt="Logo" style={{ width: 110, height: 50, objectFit: "contain" }} />
            ) : (
              <div style={{ 
                width: 100, 
                height: 50, 
                border: "1px dashed #cbd5e1", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                fontSize: 10, 
                color: "#94a3b8", 
                borderRadius: 4 
              }}>LOGO</div>
            )}
            <div>
              <h5 style={{ margin: 0, fontWeight: 800, fontSize: 13.5, textTransform: "uppercase", color: "#00388d", letterSpacing: "0.2px" }}>
                {companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
              </h5>
              <p style={{ margin: "4px 0 0 0", fontSize: 9.5, color: "#475569", lineHeight: "1.45", maxWidth: "540px" }}>
                Tiên phong kiến tạo giá trị thực trong việc tạo ra các giải pháp thiết bị phòng tắm, thiết bị vệ sinh và nhà bếp hiện đại. Luôn hướng tới việc nâng cao chất lượng cuộc sống cho mọi gia đình.
              </p>
            </div>
          </div>
        </div>

        {/* Banner Section - Bleeds completely to left/right edges */}
        <div style={{ display: "flex", height: "320px", width: "100%", overflow: "hidden", margin: "24px 0 0 0" }}>
          {/* Left half with sharp diagonal gradient split */}
          <div style={{ 
            width: "48%", 
            color: "#ffffff",
            padding: "45px 30px 45px 80px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(168deg, #00388d 50%, #050b14 50.5%)",
              zIndex: 1
            }} />
            
            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>KẾ HOẠCH</div>
                <div style={{ fontSize: "34px", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase", lineHeight: "1.1", marginTop: "4px" }}>MARKETING</div>
              </div>
              <div style={{ textAlign: "left", lineHeight: "1.2" }}>
                <div style={{ color: "#f59e0b", fontSize: "38px", fontWeight: 800 }}>{selectedYear}</div>
              </div>
            </div>
          </div>
          {/* Right half image */}
          <div style={{ width: "52%" }}>
            <img 
              src="/seajong_cover.png" 
              alt="Marketing Work" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>
        </div>

        {/* Info / Description Columns - Restores side margins via padding */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "35px", gap: "30px", padding: "0 80px" }}>
          {/* Left Column (Key Pillars) */}
          <div style={{ width: "48%", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ 
                width: "36px", 
                height: "36px", 
                background: "#00388d", 
                color: "#ffffff", 
                borderRadius: "6px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                flexShrink: 0 
              }}>
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.75c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.875v-5.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v10.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
              </div>
              <div>
                <h6 style={{ margin: "0 0 3px 0", fontWeight: 700, fontSize: "12.5px", color: "#0f172a" }}>PHÁT TRIỂN DOANH THU</h6>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#475569", lineHeight: "1.4" }}>
                  Mục tiêu tổng doanh thu năm {selectedYear} đạt {totalRevenue.toLocaleString("vi-VN")} đ. Trong đó, doanh thu đại lý chiếm {((valAgent / (totalRevenue || 1)) * 100).toFixed(0)}% ({valAgent.toLocaleString("vi-VN")} đ).
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ 
                width: "36px", 
                height: "36px", 
                background: "#00388d", 
                color: "#ffffff", 
                borderRadius: "6px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                flexShrink: 0 
              }}>
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0A3.75 3.75 0 108.25 9.75h7.5A3.75 3.75 0 0012 12.75zM12 18h-1.5m1.5 0h1.5m-3 3h3M9 18a3 3 0 013-3h0a3 3 0 013 3"/></svg>
              </div>
              <div>
                <h6 style={{ margin: "0 0 3px 0", fontWeight: 700, fontSize: "12.5px", color: "#0f172a" }}>CHIẾN LƯỢC MARKETING</h6>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#475569", lineHeight: "1.4" }}>
                  Tổng ngân sách chi phí hoạt động marketing cả năm là {valBrandingCost.toLocaleString("vi-VN")} đ. Tập trung phân bổ cho các tuyến nội dung và chiến dịch quảng cáo.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ 
                width: "36px", 
                height: "36px", 
                background: "#00388d", 
                color: "#ffffff", 
                borderRadius: "6px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                flexShrink: 0 
              }}>
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0112.75 21h-1.5a2.25 2.25 0 01-2.25-1.763v-.109m0 0a9.338 9.338 0 01-2.625-.372 9.337 9.337 0 01-4.121-.952 4.125 4.125 0 017.533-2.493M9 19.128v-.003c0-1.113.285-2.16.786-3.07M15 7.5a3 3 0 11-6 0 3 3 0 016 0zm6 2.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
              </div>
              <div>
                <h6 style={{ margin: "0 0 3px 0", fontWeight: 700, fontSize: "12.5px", color: "#0f172a" }}>NHÂN SỰ & QUỸ LƯƠNG</h6>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#475569", lineHeight: "1.4" }}>
                  Kế hoạch nhân sự phòng marketing với {salaryRows.length} vị trí chủ chốt. Tổng ngân sách quỹ lương & thưởng dự kiến là {valSalaryBonus.toLocaleString("vi-VN")} đ.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (Description & Metadata Info) */}
          <div style={{ width: "48%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h6 style={{ margin: "0 0 6px 0", fontWeight: 800, fontSize: "12px", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                VỀ BẢN KẾ HOẠCH NÀY
              </h6>
              <p style={{ margin: 0, fontSize: "11px", color: "#475569", lineHeight: "1.45", textAlign: "justify" }}>
                Dữ liệu kết xuất tự động từ hệ thống quản trị, liệt kê chi tiết các chiến lược trọng tâm, phân bổ ngân sách, và lộ trình (roadmap) theo dõi KPI Marketing. Vui lòng bảo mật tài liệu và chỉ lưu hành nội bộ.
              </p>
            </div>

            <div style={{ marginTop: "15px" }}>
              <h6 style={{ margin: "0 0 6px 0", fontWeight: 800, fontSize: "12px", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                THÔNG TIN BÁO CÁO
              </h6>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#475569" }}>
                <div>• <strong>Người lập kế hoạch:</strong> Nguyễn Thu Huyền</div>
                <div>• <strong>Trạng thái:</strong> {budgetRows.length > 0 && totalRevenue > 0 ? (planStatus === "approved" ? "ĐÃ PHÊ DUYỆT" : "ĐỀ XUẤT KẾ HOẠCH") : "CHƯA KHỞI TẠO"}</div>
                <div>• <strong>Ban hành:</strong> Năm {selectedYear}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Area - Bleeds completely to bottom and left/right edges */}
        <div style={{ 
          width: "100%", 
          marginTop: "auto", 
          color: "#ffffff", 
          overflow: "hidden",
          position: "relative",
          height: "75px",
          display: "flex",
          alignItems: "center"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(172deg, #00388d 50%, #050b14 50.5%)",
            zIndex: 1
          }} />

          <div style={{ 
            position: "relative", 
            zIndex: 2, 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            width: "100%", 
            padding: "0 80px" 
          }}>
            <div>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "#93c5fd", letterSpacing: "0.5px" }}>THÔNG TIN LIÊN HỆ</div>
              <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>0969309489 | 1900 633 862</div>
              <div style={{ fontSize: "8.5px", color: "#bfdbfe", marginTop: "2px" }}>
                Email: contact@company.com &nbsp;|&nbsp; Website: www.company.com
              </div>
            </div>
            <div style={{ textAlign: "right", maxWidth: "250px", fontSize: "8.5px", color: "#e2e8f0", lineHeight: "1.3" }}>
              Địa chỉ: LK704, KĐT Cầu Diễn, Phường Phú Diễn,<br />Bắc Từ Liêm, Hà Nội
            </div>
          </div>
        </div>
      </div>

      <div className="html2pdf__page-break" />

      {/* ==================== PAGE 2: PRESENTATION LETTER (TỜ TRÌNH PHÊ DUYỆT) ==================== */}
      <div className="pdf-content-page" style={{ 
        padding: "2cm 2cm 2cm 3cm", 
        minHeight: "980px", 
        boxSizing: "border-box",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}>
        <div>
          {/* Header Tag */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#00388d", background: "#eff6ff", padding: "4px 8px", borderRadius: "4px", letterSpacing: "0.5px" }}>
              BÁO CÁO PHÊ DUYỆT
            </span>
            <span style={{ fontSize: "9.5px", color: "#64748b" }}>Năm {selectedYear}</span>
          </div>

          <h4 style={{ margin: "0 0 4px 0", fontWeight: 800, fontSize: "16px", color: "#00388d", textTransform: "uppercase" }}>
            TỜ TRÌNH PHÊ DUYỆT KẾ HOẠCH & NGÂN SÁCH MARKETING
          </h4>
          <div style={{ height: "2px", background: "#00388d", width: "60px", marginBottom: "20px" }} />

          <div style={{ fontSize: "11px", color: "#334155", lineHeight: "1.6", textAlign: "justify" }}>
            <p style={{ margin: "0 0 12px 0" }}>
              <strong>Kính gửi:</strong> Ban Giám Đốc Công ty Cổ phần Seajong Faucet Việt Nam
            </p>
            <p style={{ margin: "0 0 16px 0" }}>
              Căn cứ định hướng phát triển kinh doanh và các chỉ chỉ tiêu tài chính kế hoạch marketing năm {selectedYear}; Phòng Marketing kính trình lên Ban Giám đốc báo cáo kế hoạch và dự toán ngân sách marketing chi tiết như sau:
            </p>

            {/* I. MỤC TIÊU DOANH THU KẾ HOẠCH */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px 15px", marginBottom: "15px" }}>
              <h6 style={{ margin: "0 0 8px 0", fontWeight: 800, fontSize: "11.5px", color: "#0f172a", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px" }}>
                I. MỤC TIÊU DOANH THU KẾ HOẠCH
              </h6>
              <p style={{ margin: "0 0 8px 0" }}>
                Tổng doanh thu mục tiêu dự kiến đạt <strong>{totalRevenue.toLocaleString("vi-VN")} đ</strong>, phân bổ cụ thể theo các kênh doanh thu:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ fontSize: "10.5px" }}>• <strong>Doanh thu đại lý:</strong> {valAgent.toLocaleString("vi-VN")} đ ({((valAgent / (totalRevenue || 1)) * 100).toFixed(0)}%)</div>
                <div style={{ fontSize: "10.5px" }}>• <strong>Doanh thu thương mại điện tử:</strong> {valEcommerce.toLocaleString("vi-VN")} đ ({((valEcommerce / (totalRevenue || 1)) * 100).toFixed(0)}%)</div>
                <div style={{ fontSize: "10.5px" }}>• <strong>Doanh thu truyền thống:</strong> {valTraditional.toLocaleString("vi-VN")} đ ({((valTraditional / (totalRevenue || 1)) * 100).toFixed(0)}%)</div>
                <div style={{ fontSize: "10.5px" }}>• <strong>Doanh thu phát triển đại lý:</strong> {valAgentDev.toLocaleString("vi-VN")} đ ({((valAgentDev / (totalRevenue || 1)) * 100).toFixed(0)}%)</div>
              </div>
            </div>

            {/* II. CƠ CẤU NGÂN SÁCH CHI PHÍ VÀ NHÂN SỰ */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px 15px", marginBottom: "15px" }}>
              <h6 style={{ margin: "0 0 8px 0", fontWeight: 800, fontSize: "11.5px", color: "#0f172a", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px" }}>
                II. CƠ CẤU NGÂN SÁCH CHI PHÍ VÀ NHÂN SỰ
              </h6>
              <p style={{ margin: "0 0 8px 0" }}>
                Để đảm bảo triển khai kế hoạch, Phòng Marketing đề xuất ngân sách hoạt động cả năm dự kiến là <strong>{valBrandingCost.toLocaleString("vi-VN")} đ</strong> (chiếm tỷ lệ {((valBrandingCost / (totalRevenue || 1)) * 100).toFixed(2)}% tổng doanh thu mục tiêu) và cơ cấu nhân sự bao gồm:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10.5px" }}>
                <div>• <strong>Chi phí Branding:</strong> {valBrandingCost.toLocaleString("vi-VN")} đ (phân bổ cho hoạt động branding và các chiến dịch tiếp thị).</div>
                <div>• <strong>Lương và thưởng:</strong> {valSalaryBonus.toLocaleString("vi-VN")} đ (phân bổ cho {salaryRows.length} vị trí nhân sự phòng marketing thực hiện kế hoạch).</div>
                <div>• <strong>Công tác phí:</strong> {valTravel.toLocaleString("vi-VN")} đ.</div>
              </div>
            </div>

            <p style={{ margin: "15px 0 0 0", fontStyle: "italic" }}>
              Kính trình Ban Giám đốc xem xét phê duyệt.
            </p>
          </div>
        </div>

        {/* Signature Block */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", fontSize: "11px" }}>
          <div style={{ textAlign: "center", width: "180px" }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#334155" }}>BAN GIÁM ĐỐC PHÊ DUYỆT</p>
            <p style={{ margin: "2px 0 0 0", fontStyle: "italic", fontSize: "9.5px", color: "#64748b" }}>(Ký và ghi rõ họ tên)</p>
            <div style={{ height: "55px", display: "flex", alignItems: "center", justifyContent: "center", margin: "5px 0" }}>
              {approverSig ? (
                <img src={approverSig} alt="Approver Signature" style={{ maxHeight: "50px", maxWidth: "140px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "90px", height: "35px", border: "1px dashed #cbd5e1", borderRadius: "4px" }} />
              )}
            </div>
            <p style={{ fontWeight: 700, margin: 0, color: "#334155" }}>Lê Công Vụ</p>
          </div>

          <div style={{ textAlign: "center", width: "180px" }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#334155" }}>TRƯỞNG PHÒNG MARKETING</p>
            <p style={{ margin: "2px 0 0 0", fontStyle: "italic", fontSize: "9.5px", color: "#64748b" }}>(Ký và ghi rõ họ tên)</p>
            <div style={{ height: "55px", display: "flex", alignItems: "center", justifyContent: "center", margin: "5px 0" }}>
              {proposerSig ? (
                <img src={proposerSig} alt="Proposer Signature" style={{ maxHeight: "50px", maxWidth: "140px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "90px", height: "35px", border: "1px dashed #cbd5e1", borderRadius: "4px" }} />
              )}
            </div>
            <p style={{ fontWeight: 700, margin: 0, color: "#334155" }}>Nguyễn Thu Huyền</p>
          </div>
        </div>
      </div>

      <div className="html2pdf__page-break" />

      {/* ==================== PAGE 3: STEP 1 (MỤC TIÊU DOANH THU & CHI PHÍ) ==================== */}
      <div className="pdf-content-page" style={{ padding: "2cm 2cm 2cm 3cm", minHeight: "980px", boxSizing: "border-box" }}>
        <h5 style={{ fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", fontSize: 14 }}>
          PHẦN I: MỤC TIÊU DOANH THU & ĐỊNH MỨC CHI PHÍ
        </h5>
        <p style={{ fontSize: "11px", lineHeight: "1.55", color: "#475569", fontStyle: "italic", margin: "8px 0 20px 0", textAlign: "justify" }}>
          *Mục này trình bày chi tiết các chỉ tiêu doanh thu kế hoạch năm {selectedYear} được phân bổ theo từng kênh bán hàng trọng tâm, đồng thời thiết lập định mức hạn mức chi phí tối đa cho các hoạt động vận hành phòng marketing bao gồm chi phí branding, quỹ lương thưởng và công tác phí để đảm bảo cân đối hiệu quả tài chính.*
        </p>

        <div style={{ marginTop: 20 }}>
          <h6 style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 10, textTransform: "uppercase" }}>
            1. Mục tiêu doanh thu và Định mức chi phí năm {selectedYear}
          </h6>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000" }}>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "left", fontWeight: 700, width: "60px" }}>STT</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "left", fontWeight: 700 }}>Khoản mục</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: 700, width: "180px" }}>Mục tiêu năm (đ)</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: 700, width: "180px" }}>Tỷ lệ trên doanh thu (%)</th>
              </tr>
            </thead>
            <tbody>
              {budgetRows.map((row: any) => {
                if (row.isFullWidth) {
                  return (
                    <tr key={row.id} style={{ background: "#f1f5f9" }}>
                      <td colSpan={4} style={{ padding: `${rowPadding}px 8px`, fontWeight: 700, textTransform: "uppercase", fontSize: 10.5, color: "#1e293b", borderBottom: "1px solid #cbd5e1" }}>
                        {row.fullWidthContent}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: `${rowPadding}px 8px`, fontWeight: row.isTotal ? 700 : 400 }}>{row.stt}</td>
                    <td style={{ padding: `${rowPadding}px 8px`, fontWeight: row.isTotal ? 700 : 400, paddingLeft: row.stt && row.stt.includes(".") ? "20px" : "8px" }}>{row.name}</td>
                    <td style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: row.isTotal ? 700 : 400 }}>
                      {row.value ? row.value.toLocaleString("vi-VN") : "0"} đ
                    </td>
                    <td style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: row.isTotal ? 700 : 400, color: row.isTotal ? "#1d4ed8" : "inherit" }}>
                      {row.ratio ? `${row.ratio.toFixed(1)}%` : "0.0%"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 20 }}>
          <h6 style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 10, textTransform: "uppercase" }}>
            2. Kế hoạch nhân sự & Quỹ lương phòng marketing
          </h6>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000" }}>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "left", fontWeight: 700, width: "35px" }}>STT</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "left", fontWeight: 700, width: "150px" }}>Vị trí</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: 700, width: "90px" }}>Lương cơ bản</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: 700, width: "100px" }}>Lương hiệu suất</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: 700, width: "80px" }}>Phụ cấp</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "center", fontWeight: 700, width: "65px" }}>Số lượng</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: 700, width: "120px" }}>Quỹ lương</th>
              </tr>
            </thead>
            <tbody>
              {salaryRows.map((row: any) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #e2e8f0", background: row.isTotal ? "#f8fafc" : "transparent" }}>
                  <td style={{ padding: `${rowPadding}px 8px`, fontWeight: row.isTotal ? 700 : 400 }}>{row.stt}</td>
                  <td style={{ padding: `${rowPadding}px 8px`, fontWeight: row.isTotal ? 700 : 400 }}>{row.name}</td>
                  <td style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: row.isTotal ? 700 : 400 }}>
                    {!row.isTotal && row.basic ? `${row.basic.toLocaleString("vi-VN")}` : ""}
                  </td>
                  <td style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: row.isTotal ? 700 : 400 }}>
                    {!row.isTotal && row.perf ? `${row.perf.toLocaleString("vi-VN")}` : ""}
                  </td>
                  <td style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: row.isTotal ? 700 : 400 }}>
                    {!row.isTotal && row.allowance ? `${row.allowance.toLocaleString("vi-VN")}` : ""}
                  </td>
                  <td style={{ padding: `${rowPadding}px 8px`, textAlign: "center", fontWeight: row.isTotal ? 700 : 400 }}>
                    {row.qty}
                  </td>
                  <td style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: row.isTotal ? 700 : 400, color: row.isTotal ? "#1d4ed8" : "inherit" }}>
                    {row.fund ? `${row.fund.toLocaleString("vi-VN")} đ` : "0 đ"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
          <PrintDonutChart title="Cơ cấu doanh thu" data={revenueData} />
          <PrintDonutChart title="Cơ cấu chi phí" data={costData} />
        </div>
      </div>

      <div className="html2pdf__page-break" />

      {/* ==================== PAGE 4: STEP 2 (TUYẾN NỘI DUNG CHỦ ĐẠO) ==================== */}
      <div className="pdf-content-page" style={{ padding: "2cm 2cm 2cm 3cm", minHeight: "980px", boxSizing: "border-box" }}>
        <h5 style={{ fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", fontSize: 14 }}>
          PHẦN II: TUYẾN NỘI DUNG & KẾ HOẠCH QUẢNG CÁO NĂM
        </h5>
        <p style={{ fontSize: "11px", lineHeight: "1.55", color: "#475569", fontStyle: "italic", margin: "8px 0 20px 0", textAlign: "justify" }}>
          *Mục này làm rõ định hướng triển khai các tuyến nội dung truyền thông chủ đạo trong năm, kế hoạch xuất bản định kỳ trên các kênh truyền thông chính thức, cùng danh sách chi tiết các chiến dịch quảng cáo về đối tượng tiếp cận, thông điệp sáng tạo và dự toán ngân sách hoạt động.*
        </p>

        <div style={{ marginTop: 20 }}>
          <h6 style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 10, textTransform: "uppercase" }}>
            1. Định hướng các tuyến nội dung truyền thông chủ đạo
          </h6>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000" }}>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "left", fontWeight: 700, width: "35px" }}>STT</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "left", fontWeight: 700, width: "140px" }}>Tuyến nội dung chính</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "left", fontWeight: 700 }}>Mô tả chi tiết / Hướng triển khai</th>
                <th style={{ padding: `${rowPadding}px 8px`, textAlign: "right", fontWeight: 700, width: "130px" }}>Ngân sách dự kiến</th>
              </tr>
            </thead>
            <tbody>
              {contentPlanRows.map((row: any, idx: number) => {
                const isTotalRow = row.isTotal || row.id === "cp_sum";
                if (isTotalRow) {
                  return (
                    <tr key={row.id || idx} style={{ borderBottom: "1.5px solid #000", background: "#f8fafc", fontWeight: 700 }}>
                      <td style={{ padding: `${rowPadding}px 8px` }}></td>
                      <td style={{ padding: `${rowPadding}px 8px`, textTransform: "uppercase" }}>
                        {row.pillar}
                        {row.postsCount ? (
                          <>
                            <br />
                            <span style={{ fontSize: "10px", color: "#64748b", textTransform: "none", fontWeight: 400 }}>({row.postsCount} bài)</span>
                          </>
                        ) : ""}
                      </td>
                      <td style={{ padding: `${rowPadding}px 8px` }}></td>
                      <td style={{ padding: `${rowPadding}px 8px`, textAlign: "right", color: "#1d4ed8" }}>
                        {row.budget ? `${row.budget.toLocaleString("vi-VN")} đ` : "0 đ"}
                      </td>
                    </tr>
                  );
                }
                const { description } = parseParentDetails(row.details);
                return (
                  <tr key={row.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: `${rowPadding}px 8px`, color: "#64748b" }}>
                      {row.isChildRow ? "" : row.stt}
                    </td>
                    <td style={{ padding: `${rowPadding}px 8px` }}>
                      {row.isChildRow ? (
                        <span style={{ paddingLeft: 16, color: "#475569", display: "inline-block" }}>
                          ↳ {row.pillar}
                          {row.postsCount ? (
                            <>
                              <br />
                              <span style={{ paddingLeft: 14, fontSize: "10px", color: "#64748b", fontWeight: 400 }}>({row.postsCount} bài)</span>
                            </>
                          ) : ""}
                        </span>
                      ) : (
                        <span style={{ fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                          {row.pillar}
                          {row.postsCount ? (
                            <>
                              <br />
                              <span style={{ fontSize: "10px", color: "#64748b", textTransform: "none", fontWeight: 400 }}>({row.postsCount} bài)</span>
                            </>
                          ) : ""}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: `${rowPadding}px 8px`, color: row.isChildRow ? "#475569" : "#1e293b", fontSize: row.isChildRow ? 11 : 11.5 }}>
                      {row.isChildRow ? (
                        renderMultilineText(row.details)
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {description && <div>{renderMultilineText(description)}</div>}
                          {(row.role || row.purpose) && (
                            <div style={{ 
                              fontSize: 10, 
                              color: "#475569", 
                              marginTop: 4, 
                              background: "#f8fafc", 
                              padding: "4px 8px", 
                              borderRadius: "4px",
                              border: "1px dashed #cbd5e1"
                            }}>
                              {row.role && (
                                <div>
                                  <strong>Vai trò:</strong> {row.role}
                                </div>
                              )}
                              {row.purpose && (
                                <div style={{ marginTop: 2 }}>
                                  <strong>Mục đích:</strong> {row.purpose}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: `${rowPadding}px 8px`, textAlign: "right" }}>
                      {row.budget ? `${row.budget.toLocaleString("vi-VN")} đ` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="html2pdf__page-break" />

      {/* ==================== PAGE 5: STEP 2 (CHIẾN DỊCH QUẢNG CÁO) ==================== */}
      <div className="pdf-content-page" style={{ padding: "2cm 2cm 2cm 3cm", minHeight: "980px", boxSizing: "border-box" }}>
        <h5 style={{ fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", fontSize: 14 }}>
          PHẦN II: TUYẾN NỘI DUNG & KẾ HOẠCH QUẢNG CÁO NĂM (TIẾP THEO)
        </h5>
        <p style={{ fontSize: "11px", lineHeight: "1.55", color: "#475569", fontStyle: "italic", margin: "8px 0 20px 0", textAlign: "justify" }}>
          *Mục này làm rõ định hướng triển khai các tuyến nội dung truyền thông chủ đạo trong năm, kế hoạch xuất bản định kỳ trên các kênh truyền thông chính thức, cùng danh sách chi tiết các chiến dịch quảng cáo về đối tượng tiếp cận, thông điệp sáng tạo và dự toán ngân sách hoạt động.*
        </p>

        <div style={{ marginTop: 20 }}>
          <h6 style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 10, textTransform: "uppercase" }}>
            2. Kế hoạch chiến dịch quảng cáo và ngân sách chi tiết
          </h6>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000" }}>
                <th style={{ padding: `${rowPadding}px 6px`, textAlign: "left", fontWeight: 700, width: "35px" }}>STT</th>
                <th style={{ padding: `${rowPadding}px 6px`, textAlign: "left", fontWeight: 700, width: "180px" }}>Mục tiêu chiến dịch</th>
                <th style={{ padding: `${rowPadding}px 6px`, textAlign: "left", fontWeight: 700 }}>Đối tượng nhắm</th>
                <th style={{ padding: `${rowPadding}px 6px`, textAlign: "right", fontWeight: 700, width: "110px" }}>Ngân sách (đ)</th>
              </tr>
            </thead>
            <tbody>
              {adPlanRows.map((row: any, idx: number) => {
                const isTotalRow = row.isTotal || row.id === "ad_sum";
                return (
                  <tr key={row.id || idx} style={{ borderBottom: "1px solid #e2e8f0", background: isTotalRow ? "#f8fafc" : "transparent" }}>
                    <td style={{ padding: `${rowPadding}px 6px`, fontWeight: isTotalRow ? 700 : 400 }}>
                      {isTotalRow ? "" : row.stt}
                    </td>
                    <td style={{ padding: `${rowPadding}px 6px`, fontWeight: isTotalRow ? 700 : 400 }}>
                      {isTotalRow ? (
                        "Tổng cộng"
                      ) : row.isChildRow ? (
                        <div style={{ paddingLeft: 16, fontSize: 10.5 }}>
                          <div style={{ fontWeight: 700, color: "#1e3a8a" }}>
                            ↳ {row.objective}
                          </div>
                          {row.channel && (
                            <div style={{ fontSize: 9.5, color: "#475569", marginTop: 2 }}>
                              <strong>Hình thức:</strong> {row.channel}
                            </div>
                          )}
                          {row.content && (
                            <div style={{ fontSize: 9.5, color: "#475569", marginTop: 3, borderTop: "1px dashed #cbd5e1", paddingTop: 3 }}>
                              {renderMultilineText(row.content)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, textTransform: "uppercase", color: "#1e3a8a", fontSize: 11 }}>
                            {row.objective}
                          </div>
                          {row.topic && (
                            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                              <strong style={{ color: "#64748b" }}>Chủ đề:</strong> {row.topic}
                            </div>
                          )}
                          {row.channel && (
                            <div style={{ fontSize: 10, color: "#475569" }}>
                              <strong style={{ color: "#64748b" }}>Hình thức:</strong> {row.channel}
                            </div>
                          )}
                          {row.region && (
                            <div style={{ fontSize: 10, color: "#475569" }}>
                              <strong style={{ color: "#64748b" }}>Vùng miền:</strong> {row.region}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td style={{ padding: `${rowPadding}px 6px`, color: "#475569" }}>
                      {row.audience && (
                        <div>
                          {row.isChildRow && <div style={{ fontSize: 8.5, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>Đối tượng nhắm:</div>}
                          {renderMultilineText(row.audience)}
                        </div>
                      )}
                      {row.landingPage && (
                        <div style={{ marginTop: row.audience ? 8 : 0, borderTop: row.audience ? "1px dashed #cbd5e1" : "none", paddingTop: row.audience ? 6 : 0 }}>
                          <div style={{ fontSize: 8.5, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>
                            Landing Page:
                          </div>
                          {(() => {
                            const urls = row.landingPage.split("\n").map((u: string) => u.trim()).filter((u: string) => u.length > 0);
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {urls.map((url: string, uIdx: number) => (
                                  <div key={uIdx} style={{ fontSize: 9, color: "#1d4ed8", wordBreak: "break-all", lineHeight: "1.3" }}>
                                    🔗 {url}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: `${rowPadding}px 6px`, textAlign: "right", fontWeight: isTotalRow ? 700 : 400, color: isTotalRow ? "#1d4ed8" : "inherit" }}>
                      {row.budget ? `${row.budget.toLocaleString("vi-VN")} đ` : "0 đ"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="html2pdf__page-break" />

      {/* ==================== PAGE 4: BÁO CÁO PHÂN BỔ NGÂN SÁCH CÁC HẠNG MỤC ==================== */}
      <div className="pdf-content-page" style={{ padding: "2cm 2cm 2cm 3cm", minHeight: "980px", boxSizing: "border-box" }}>
        <h5 style={{ fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", fontSize: 14 }}>
          PHẦN III: PHÂN BỔ NGÂN SÁCH CHI TIẾT
        </h5>
        <p style={{ fontSize: "11px", lineHeight: "1.55", color: "#475569", fontStyle: "italic", margin: "8px 0 20px 0", textAlign: "justify" }}>
          *Mục này cung cấp bảng phân bổ chi tiết ngân sách marketing qua 12 tháng của năm {selectedYear} cho từng danh mục chi phí, đi kèm với lộ trình phát triển sản phẩm trọng tâm theo từng tháng nhằm hỗ trợ khối Kinh doanh tối ưu hóa cơ cấu doanh thu thực tế.*
        </p>

        <div style={{ marginTop: 20 }}>
          <h6 style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 12, textTransform: "uppercase" }}>
            1. Tóm tắt ngân sách kế hoạch năm {selectedYear}
          </h6>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
            <div style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Tổng ngân sách năm</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
                {(valBranding || 0).toLocaleString("vi-VN")} đ
              </div>
            </div>
            <div style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Đã phân bổ</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e3a8a", marginTop: "4px" }}>
                {(totalAllocatedBudgets || 0).toLocaleString("vi-VN")} đ
              </div>
            </div>
            <div style={{ 
              padding: "10px", 
              border: "1px solid #cbd5e1", 
              borderRadius: "6px", 
              backgroundColor: (valBranding - totalAllocatedBudgets) < 0 ? "#fef2f2" : "#f0fdf4" 
            }}>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Còn lại</div>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: 700, 
                color: (valBranding - totalAllocatedBudgets) < 0 ? "#991b1b" : "#166534", 
                marginTop: "4px" 
              }}>
                {(valBranding - totalAllocatedBudgets).toLocaleString("vi-VN")} đ
              </div>
            </div>
          </div>

          <h6 style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 12, textTransform: "uppercase" }}>
            2. Phân bổ ngân sách thương hiệu chi tiết
          </h6>
          
          <div style={{ marginTop: 10 }}>
            <h6 style={{ fontWeight: 700, fontSize: 11, color: "#475569", marginBottom: 6, textTransform: "uppercase" }}>
              2.1. Tổng quan phân bổ ngân sách cả năm
            </h6>
            {renderAllocationMatrixTotals()}
          </div>
        </div>
      </div>

      <div className="html2pdf__page-break" />

      {/* ==================== PAGE 6b: PHÂN BỔ MATRIX 12 THÁNG ==================== */}
      <div className="pdf-content-page" style={{ padding: "2cm 2cm 2cm 3cm", minHeight: "980px", boxSizing: "border-box" }}>
        <h5 style={{ fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", fontSize: 14 }}>
          PHẦN III: PHÂN BỔ NGÂN SÁCH CHI TIẾT (TIẾP THEO)
        </h5>

        <div style={{ marginTop: 20 }}>
          <h6 style={{ fontWeight: 700, fontSize: 11, color: "#475569", marginBottom: 6, textTransform: "uppercase" }}>
            2.2. Chi tiết phân bổ qua 12 tháng trong năm
          </h6>
          {renderAllocationMatrixMonthly()}
        </div>
      </div>

      <div className="html2pdf__page-break" />

      {/* ==================== PAGE 5: PHÂN BỔ THÁNG & HOẠT ĐỘNG THÁNG ==================== */}
      <div className="pdf-content-page" style={{ padding: "2cm 2cm 2cm 3cm", minHeight: "980px", boxSizing: "border-box" }}>
        <h5 style={{ fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", fontSize: 14 }}>
          PHẦN IV: HOẠT ĐỘNG TRỌNG TÂM THEO THÁNG
        </h5>

        <div style={{ marginTop: 20 }}>
          <h6 style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 10, textTransform: "uppercase" }}>
            1. Bảng phân bổ ngân sách thương hiệu qua 12 tháng năm {selectedYear}
          </h6>
          <p style={{ margin: "0 0 12px 0", fontSize: 11, color: "#475569" }}>
            Tổng ngân sách thương hiệu đã phân bổ cho 12 tháng: <strong>{totalAllocatedMonthly.toLocaleString("vi-VN")} đ</strong>
          </p>
          
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000" }}>
                <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, width: "120px" }}>Tháng</th>
                <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, width: "200px" }}>Ngân sách phân bổ (đ)</th>
                <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Tóm tắt hoạt động trọng tâm tháng</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <tr key={m} style={{ borderBottom: "1px solid #cbd5e1" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 600 }}>Tháng {m}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>
                    {(monthlyBudgets[m] || 0).toLocaleString("vi-VN")} đ
                  </td>
                  <td style={{ padding: "6px 8px", fontSize: 10.5, color: "#334155" }}>
                    {renderMonthlyThemeSummary(m)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: "#f8fafc", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000" }}>
                <td style={{ padding: "8px 8px", fontWeight: 700 }}>TỔNG CỘNG</td>
                <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700, color: "#1d4ed8" }}>
                  {totalAllocatedMonthly.toLocaleString("vi-VN")} đ
                </td>
                <td style={{ padding: "8px 8px", color: "#64748b", fontStyle: "italic" }}>
                  Đã phân bổ hoàn tất kế hoạch marketing {selectedYear}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {(() => {
        const plannedMonths = Array.from({ length: 12 }, (_, i) => i + 1).filter(m => {
          const contentItems = sectionContentItems[`section_content_${m}`] || [];
          const mediaItems = sectionContentItems[`section_media_${m}`] || [];
          const advItems = sectionContentItems[`section_adv_${m}`] || [];
          const posItems = sectionContentItems[`section_pos_${m}`] || [];
          const currentMonthThemes = monthlyThemes.filter(t => t.month === m || (!t.month && m === 6));
          
          return contentItems.length > 0 || mediaItems.length > 0 || advItems.length > 0 || posItems.length > 0 || currentMonthThemes.length > 0;
        });

        return plannedMonths.map(m => (
          <React.Fragment key={m}>
            <div className="html2pdf__page-break" />
            {renderDetailedMonthPlan(m)}
          </React.Fragment>
        ));
      })()}

    </div>
  );
};

const parseDescriptionTime = (description: string) => {
  if (!description) return { cleanDesc: "", timeStr: "" };
  
  // Regex to match " | Thời gian thực hiện: <content>" or "| Thời gian thực hiện: <content>" (case-insensitive)
  // or even just "Thời gian thực hiện: <content>" at the end of the string
  const regex = /\s*\|\s*thời\s+gian\s+thực\s+hiện:\s*(.*?)$/i;
  const match = description.match(regex);
  if (match) {
    const timeStr = match[1].trim();
    const cleanDesc = description.replace(regex, "").trim();
    return { cleanDesc, timeStr };
  }
  
  const regex2 = /(?:^|\s+)thời\s+gian\s+thực\s+hiện:\s*(.*?)$/i;
  const match2 = description.match(regex2);
  if (match2) {
    const timeStr = match2[1].trim();
    const cleanDesc = description.replace(regex2, "").trim();
    return { cleanDesc, timeStr };
  }
  
  return { cleanDesc: description, timeStr: "" };
};

const formatTaskDetails = (text: string) => {
  if (!text) return [];
  const lines = text.split("\n");
  const processedLines: string[] = [];
  
  lines.forEach(line => {
    if (line.includes(" - ") || line.includes(" – ")) {
      const separatorRegex = /\s+[-–]\s+/;
      const subparts = line.split(separatorRegex);
      subparts.forEach((part, idx) => {
        const trimmed = part.trim();
        if (trimmed) {
          if (idx === 0 && !line.trim().startsWith("-") && !line.trim().startsWith("–")) {
            processedLines.push(trimmed);
          } else {
            processedLines.push(`- ${trimmed}`);
          }
        }
      });
    } else {
      const trimmed = line.trim();
      if (trimmed) {
        if (trimmed.startsWith("-") || trimmed.startsWith("–")) {
          processedLines.push(`- ${trimmed.substring(1).trim()}`);
        } else {
          processedLines.push(trimmed);
        }
      }
    }
  });
  return processedLines;
};

const renderTaskDescription = (description: string, isSubTask: boolean, indent: boolean = true) => {
  if (!description) return null;
  
  let normalized = description;
  if (normalized.includes("Tuyến:") && normalized.includes("Người thực hiện:") && normalized.includes(".")) {
    normalized = normalized.replace(/\.\s*(Người thực hiện:)/gi, " | $1");
  }
  
  const parts = normalized.split("|").map(p => p.trim()).filter(Boolean);
  
  let detailsText = "";
  const metaElements: React.ReactNode[] = [];
  
  parts.forEach((part) => {
    const isPillar = /^Tuyến:/i.test(part);
    const isAssignee = /^Người thực hiện:/i.test(part);
    const isAds = /^Quảng cáo:/i.test(part);
    
    if (isPillar) {
      const pillar = part.replace(/^Tuyến:/i, "").trim();
      metaElements.push(
        <span key="pillar" style={{ fontSize: "10px", fontWeight: 600, color: "#2563eb", backgroundColor: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "4px", padding: "1px 5px", display: "inline-block" }}>
          {pillar}
        </span>
      );
    } else if (isAssignee) {
      const assignee = part.replace(/^Người thực hiện:/i, "").trim();
      metaElements.push(
        <span key="assignee" className="text-muted d-inline-flex align-items-center gap-1" style={{ fontWeight: "normal", fontSize: "11px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="text-secondary me-1" viewBox="0 0 16 16" style={{ display: "inline-block", verticalAlign: "-0.125em" }}><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
          {assignee}
        </span>
      );
    } else if (isAds) {
      const adsVal = part.replace(/^Quảng cáo:/i, "").trim();
      const hasAds = adsVal === "Có" || adsVal.toLowerCase().includes("có");
      metaElements.push(
        <span key="ads" style={{
          fontSize: "10px",
          fontWeight: 600,
          color: hasAds ? "#15803d" : "#64748b",
          backgroundColor: hasAds ? "#f0fdf4" : "#f1f5f9",
          border: `1px solid ${hasAds ? "#bbf7d0" : "#e2e8f0"}`,
          borderRadius: "4px",
          padding: "1px 5px",
          display: "inline-block"
        }}>
          {hasAds ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="currentColor" className="me-1" viewBox="0 0 16 16" style={{ display: "inline-block", verticalAlign: "-0.125em" }}><path d="M13 2.5a1.5 1.5 0 0 1 3 0v11a1.5 1.5 0 0 1-3 0v-11zm-1 .75c-1.213.014-2.76.752-4.078 1.861L5.277 6H1.5A1.5 1.5 0 0 0 0 7.5v1A1.5 1.5 0 0 0 1.5 10h3.777l1.645 1.389C8.24 12.5 9.787 13.236 11 13.25V3.25z"/></svg>
              Có quảng cáo
            </>
          ) : (
            "Không quảng cáo"
          )}
        </span>
      );
    } else {
      if (detailsText) {
        detailsText += " | " + part;
      } else {
        detailsText = part;
      }
    }
  });

  const formattedLines = formatTaskDetails(detailsText);

  return (
    <div className="mt-1 text-start" style={{ paddingLeft: (isSubTask && indent) ? "14px" : "0px", fontSize: "11.5px", lineHeight: "1.4" }}>
      {formattedLines.length > 0 && (
        <div className="d-flex flex-column gap-1 text-secondary mb-1">
          {formattedLines.map((line, lIdx) => {
            const isBullet = line.startsWith("- ");
            const cleanLine = isBullet ? line.substring(2) : line;
            return (
              <div key={lIdx} className="d-flex align-items-start gap-1.5" style={{ lineHeight: "1.4" }}>
                {isBullet && (
                  <span style={{ color: "#94a3b8", fontSize: "10px", marginTop: "3.5px", display: "inline-block" }}>•</span>
                )}
                <span className="text-secondary" style={{ flex: 1 }}>{cleanLine}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {metaElements.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-x-2 gap-y-1 mt-1">
          {metaElements.map((elem, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-muted" style={{ opacity: 0.4, margin: "0 6px" }}>|</span>}
              {elem}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

interface ProposalPrintDocumentProps {
  id?: string;
  proposalData: any;
  selectedMonth: number;
  selectedYear: string;
  plannedBudget?: number;
  rowPadding?: number;
  proposerSig?: string | null;
  approverSig?: string | null;
  isPlan?: boolean;
  monthlyThemes?: any[];
  customHolidays?: any[];
  monthlyProducts?: any;
  sectionContentItems?: any;
}

const ProposalPrintDocument: React.FC<ProposalPrintDocumentProps> = ({
  id = "proposal-print-doc",
  proposalData,
  selectedMonth,
  selectedYear,
  plannedBudget,
  rowPadding = 6,
  proposerSig,
  approverSig,
  isPlan = false,
  monthlyThemes = [],
  customHolidays = [],
  monthlyProducts = {},
  sectionContentItems = {},
}) => {
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetch("/api/company")
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data) setCompanyInfo(data);
      })
      .catch(() => {});
  }, []);

  const renderRows: any[] = [];

  if (isPlan) {
    const sectionIds = ["section_content", "section_media", "section_design", "section_seo", "section_adv", "section_pos"];
    const SECTIONS_CONFIG: Record<string, { label: string; stt: string; color: string; bg: string }> = {
      section_content: { label: "CONTENT", stt: "2", color: "#b91c1c", bg: "#fef2f2" },
      section_media: { label: "MEDIA", stt: "3", color: "#1d4ed8", bg: "#eff6ff" },
      section_design: { label: "DESIGN", stt: "4", color: "#1e3a8a", bg: "#f8fafc" },
      section_seo: { label: "SEO", stt: "5", color: "#1e3a8a", bg: "#f8fafc" },
      section_adv: { label: "QUẢNG CÁO", stt: "6", color: "#15803d", bg: "#f0fdf4" },
      section_pos: { label: "ĐIỂM BÁN", stt: "7", color: "#c2410c", bg: "#fffbeb" },
    };

    const groupedTasks: Record<string, any[]> = {
      section_content: [],
      section_media: [],
      section_design: [],
      section_seo: [],
      section_adv: [],
      section_pos: [],
      other: [],
    };

    Object.entries(proposalData.items || {}).forEach(([mainTaskId, mainTask]: any) => {
      let secId = mainTask.secId;
      let matchedOrigItem: any = null;
      const cleanKey = mainTaskId.replace("task_auto_", "");
      const m = selectedMonth;

      for (const sId of sectionIds) {
        const list = sectionContentItems[`${sId}_${m}`] || [];
        const found = list.find((item: any) => String(item.id) === cleanKey);
        if (found) {
          matchedOrigItem = found;
          secId = sId;
          break;
        }
      }

      if (!secId) {
        const lbl = (mainTask.label || "").toUpperCase();
        if (lbl.includes("CONTENT")) secId = "section_content";
        else if (lbl.includes("MEDIA") || lbl.includes("PR")) secId = "section_media";
        else if (lbl.includes("DESIGN")) secId = "section_design";
        else if (lbl.includes("SEO")) secId = "section_seo";
        else if (lbl.includes("AD") || lbl.includes("QUẢNG CÁO")) secId = "section_adv";
        else if (lbl.includes("POS") || lbl.includes("ĐIỂM BÁN")) secId = "section_pos";
      }

      let displayLabel = mainTask.label;
      let displayDesc = mainTask.description;

      if (matchedOrigItem) {
        displayLabel = matchedOrigItem.topic || matchedOrigItem.pillar || mainTask.label;
        const parts = [];
        if (secId === "section_content") {
          parts.push(`Tuyến: ${matchedOrigItem.pillar || "N/A"}`);
          parts.push(`Người thực hiện: ${matchedOrigItem.assignee || "N/A"}`);
          if (matchedOrigItem.weeks && matchedOrigItem.weeks.length > 0) {
            parts.push(`Thời gian thực hiện: Tuần ${matchedOrigItem.weeks.join(", ")}`);
          }
        } else {
          if (matchedOrigItem.details) {
            parts.push(matchedOrigItem.details.trim());
          }
          if (matchedOrigItem.pillar) {
            parts.push(`Tuyến: ${matchedOrigItem.pillar}`);
          }
          if (matchedOrigItem.channel) {
            parts.push(`Kênh: ${matchedOrigItem.channel}`);
          }
          if (matchedOrigItem.assignee) {
            parts.push(`Người thực hiện: ${matchedOrigItem.assignee}`);
          }
          if (secId === "section_media") {
            parts.push(`Quảng cáo: ${matchedOrigItem.isAds ? "Có" : "Không"}`);
          }
          if (matchedOrigItem.weeks && matchedOrigItem.weeks.length > 0) {
            parts.push(`Thời gian thực hiện: Tuần ${matchedOrigItem.weeks.join(", ")}`);
          }
        }
        displayDesc = parts.join(" | ");
      } else {
        if (displayLabel && displayLabel === displayLabel.toUpperCase() && displayLabel.length > 5) {
          displayLabel = displayLabel.charAt(0) + displayLabel.slice(1).toLowerCase();
        }
        if (displayDesc && displayDesc.includes("Kênh:") && secId === "section_content") {
          let matchedPillar = "Tuyển đại lý";
          const lbl = (displayLabel || "").toLowerCase();
          if (lbl.includes("hệ thống") || lbl.includes("đại lý") || lbl.includes("tồn kho")) {
            matchedPillar = "Tuyển đại lý";
          } else {
            matchedPillar = "Khách hàng cuối";
          }
          displayDesc = displayDesc.replace(/Kênh:\s*[^.]+\./, `Tuyến: ${matchedPillar}.`);
        }
      }

      const taskWithOverride = {
        ...mainTask,
        label: displayLabel,
        description: displayDesc,
      };

      if (!secId || !groupedTasks[secId]) {
        groupedTasks.other.push({ id: mainTaskId, ...taskWithOverride });
      } else {
        groupedTasks[secId].push({ id: mainTaskId, ...taskWithOverride });
      }
    });

    const sectionsToRender = [...sectionIds, "other"];
    sectionsToRender.forEach((secId) => {
      const tasks = groupedTasks[secId] || [];
      if (tasks.length === 0) return;

      if (secId !== "other") {
        const config = SECTIONS_CONFIG[secId];
        renderRows.push({
          type: "header",
          stt: config.stt,
          label: config.label,
          color: config.color,
          bg: config.bg,
        });
      }

      tasks.forEach((task, tIdx) => {
        const sectionStt = secId !== "other" ? SECTIONS_CONFIG[secId].stt : "8";
        const taskIndexStr = `${sectionStt}.${tIdx + 1}`;

        renderRows.push({
          type: "task",
          id: task.id,
          label: task.label,
          proposedAmount: task.proposedAmount,
          description: task.description,
          notes: task.notes,
          isSubTask: false,
          indexStr: taskIndexStr,
        });

        if (task.subTasks) {
          task.subTasks.forEach((sub: any, subIndex: number) => {
            renderRows.push({
              type: "task",
              id: sub.id,
              label: sub.label,
              proposedAmount: sub.proposedAmount,
              description: sub.description,
              notes: sub.notes,
              category: sub.category,
              executionMethod: sub.executionMethod,
              department: sub.department,
              isSubTask: true,
              indexStr: `${taskIndexStr}.${subIndex + 1}`,
              parentTaskId: task.id,
            });
          });
        }
      });
    });
  } else {
    Object.entries(proposalData.items || {}).forEach(([mainTaskId, mainTask]: any, mainIndex) => {
      const taskIndexStr = `${mainIndex + 1}`;
      renderRows.push({
        type: "task",
        id: mainTaskId,
        label: mainTask.label,
        proposedAmount: mainTask.proposedAmount,
        description: mainTask.description,
        notes: mainTask.notes,
        isSubTask: false,
        indexStr: taskIndexStr,
      });

      if (mainTask.subTasks) {
        mainTask.subTasks.forEach((sub: any, subIndex: number) => {
          renderRows.push({
            type: "task",
            id: sub.id,
            label: sub.label,
            proposedAmount: sub.proposedAmount,
            description: sub.description,
            notes: sub.notes,
            category: sub.category,
            executionMethod: sub.executionMethod,
            department: sub.department,
            isSubTask: true,
            indexStr: `${taskIndexStr}.${subIndex + 1}`,
            parentTaskId: mainTaskId,
          });
        });
      }
    });
  }

  const totalProposed = Object.values(proposalData.items || {}).reduce(
    (sum: number, item: any) => sum + (item.proposedAmount || 0),
    0
  ) + (proposalData.advReserve || 0);

  return (
    <div id={id} className="pdf-content-page" style={{ background: "#fff", color: "#000", fontFamily: "'Roboto Condensed', sans-serif" }}>
      {/* Company Info & Logo Header */}
      <div className="d-flex justify-content-between align-items-start mb-4" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
        <div className="d-flex align-items-center gap-3" style={{ maxWidth: "100%" }}>
          {companyInfo?.logoUrl ? (
            <img src={companyInfo.logoUrl} alt="Logo" style={{ width: 100, height: 50, objectFit: "contain", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 100, height: 50, border: "1px dashed #cbd5e1", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#94a3b8", borderRadius: 4 }}>LOGO</div>
          )}
          <div style={{ fontSize: "11px", color: "#334155", lineHeight: 1.3 }}>
            <p className="fw-bold text-dark text-uppercase" style={{ fontSize: "12px", letterSpacing: "0.3px", margin: "0 0 3px 0" }}>
              {companyInfo?.name || "CÔNG TY CỔ PHẦN CÔNG NGHỆ & ĐẦU TƯ"}
            </p>
            {companyInfo?.address && (
              <p style={{ margin: "0 0 2px 0" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" className="text-secondary me-1" viewBox="0 0 16 16" style={{ display: "inline-block", verticalAlign: "-0.125em" }}><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
                {companyInfo.address}
              </p>
            )}
            <p style={{ margin: 0 }}>
              {companyInfo?.phone && (
                <span className="me-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" className="text-secondary me-1" viewBox="0 0 16 16" style={{ display: "inline-block", verticalAlign: "-0.125em" }}><path fillRule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/></svg>
                  {companyInfo.phone}
                </span>
              )}
              {companyInfo?.email && (
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" className="text-secondary me-1" viewBox="0 0 16 16" style={{ display: "inline-block", verticalAlign: "-0.125em" }}><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-.639-.686zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/></svg>
                  {companyInfo.email}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Header section */}
      <div className="d-flex justify-content-between align-items-start mb-4" style={{ borderBottom: "2px solid #3b82f6", paddingBottom: "15px" }}>
        <div>
          <h5 className="fw-bold text-primary mb-1 text-uppercase" style={{ letterSpacing: "0.5px", fontSize: "18px" }}>
            {isPlan ? "KẾ HOẠCH HOẠT ĐỘNG MARKETING" : "ĐỀ XUẤT CHI PHÍ HOẠT ĐỘNG MARKETING"}
          </h5>
          <p className="text-secondary mb-0 fw-bold text-uppercase" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>Tháng {selectedMonth} năm {selectedYear}</p>
          <p className="text-secondary mb-0 mt-1" style={{ fontSize: "12px" }}>
            Ngân sách kế hoạch: <strong className="text-dark">{plannedBudget ? plannedBudget.toLocaleString("vi-VN") + " đồng" : "---"}</strong> | {isPlan ? "Tổng kinh phí dự kiến" : "Ngân sách đề xuất"}: <strong className="text-dark">{totalProposed ? totalProposed.toLocaleString("vi-VN") + " đồng" : "0 đồng"}</strong>
          </p>
        </div>
        <div className="text-end" style={{ fontSize: "12px", color: "#64748b" }}>
          <p className="mb-1"><strong>Số hiệu:</strong> {proposalData.code || "---"}</p>
          <p className="mb-0"><strong>Ngày lập:</strong> {proposalData.date || "---"}</p>
        </div>
      </div>

      {/* Info fields */}
      <div className="row g-2 mb-3" style={{ fontSize: "13px" }}>
        <div className="col-6">
          <div className="d-flex align-items-baseline" style={{ marginBottom: "4px" }}>
            <span style={{ display: "inline-block", width: "130px", fontWeight: "bold" }}>{isPlan ? "Người lập kế hoạch:" : "Người đề xuất:"}</span>
            <span className="text-dark">{proposalData.proposerName || "---"}</span>
          </div>
          <div className="d-flex align-items-baseline">
            <span style={{ display: "inline-block", width: "130px", fontWeight: "bold" }}>{isPlan ? "Bộ phận lập:" : "Bộ phận đề xuất:"}</span>
            <span className="text-dark">{proposalData.department || "Phòng Marketing"}</span>
          </div>
        </div>
        <div className="col-6">
          <div className="d-flex align-items-baseline" style={{ marginBottom: "4px" }}>
            <span style={{ display: "inline-block", width: "130px", fontWeight: "bold" }}>Người duyệt:</span>
            <span className="text-dark">{proposalData.approverName || "---"}</span>
          </div>
          <div className="d-flex align-items-baseline">
            <span style={{ display: "inline-block", width: "130px", fontWeight: "bold" }}>Chi phí dự phòng:</span>
            <span className="text-dark">{proposalData.advReserve ? proposalData.advReserve.toLocaleString("vi-VN") + " đồng" : "0 đồng"}</span>
          </div>
        </div>
      </div>

      {/* Monthly Theme for Marketing Plan */}
      {isPlan && (() => {
        const defaultHolidays = HOLIDAYS_LIST_BY_MONTH[selectedMonth] || [];
        const monthCustomHolidays = (customHolidays || [])
          .filter(h => h.month === selectedMonth)
          .map(h => ({ ...h, isCustom: true }));
        const holidays = [...defaultHolidays, ...monthCustomHolidays];

        const currentMonthThemes = (monthlyThemes || []).filter(t => t.month === selectedMonth || (!t.month && selectedMonth === 6));

        const currentMonthProducts = (monthlyProducts && monthlyProducts[selectedMonth]) || {};
        const weeks = [1, 2, 3, 4];
        const hasProducts = weeks.some(w => currentMonthProducts[w] && currentMonthProducts[w].length > 0);

        const hasHolidays = holidays.length > 0;
        const hasThemes = currentMonthThemes.length > 0;

        if (!hasHolidays && !hasThemes && !hasProducts) return null;

        return (
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", overflow: "hidden", marginBottom: "16px", fontSize: "12px", fontFamily: "'Roboto Condensed', sans-serif" }}>
            <div style={{ background: "#f1f5f9", color: "#1e293b", fontWeight: 700, padding: "8px 12px", borderBottom: "1px solid #cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Chủ đề tháng {selectedMonth}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
              <tbody>
                {/* NGÀY LỄ */}
                {hasHolidays && (
                  <tr style={{ borderBottom: (hasThemes || hasProducts) ? "1px solid #cbd5e1" : "none" }}>
                    <td style={{ width: "130px", background: "#f8fafc", fontWeight: "bold", color: "#475569", padding: "8px 12px", verticalAlign: "top", borderRight: "1px solid #cbd5e1" }}>
                      NGÀY LỄ
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                        {holidays.map((h, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                            <span style={{ color: "#3b82f6", fontWeight: "bold" }}>{h.dateStr}</span>
                            <span style={{ color: "#94a3b8" }}>-</span>
                            <span style={{ color: "#334155" }}>{h.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}

                {/* NỘI DUNG CỐT LÕI */}
                {hasThemes && (
                  <tr style={{ borderBottom: hasProducts ? "1px solid #cbd5e1" : "none" }}>
                    <td style={{ width: "130px", background: "#f8fafc", fontWeight: "bold", color: "#475569", padding: "8px 12px", verticalAlign: "top", borderRight: "1px solid #cbd5e1" }}>
                      NỘI DUNG CỐT LÕI
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {currentMonthThemes.map((theme, idx) => (
                          <div key={theme.id || idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {theme.topic && (
                              <div style={{ fontWeight: "bold", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: "9.5px", fontWeight: "bold", padding: "1px 5px", borderRadius: "10px" }}>
                                  {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                {theme.topic}
                              </div>
                            )}
                            {theme.content && (
                              <div style={{ paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                {theme.content.split("\n").map((line: string, lIdx: number) => {
                                  const trimmed = line.trim();
                                  if (!trimmed) return null;
                                  return (
                                    <div key={lIdx} style={{ color: "#475569", display: "flex", alignItems: "flex-start", gap: "6px", lineHeight: "1.4" }}>
                                      <span style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px" }}>•</span>
                                      <span style={{ flex: 1 }}>{trimmed}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}

                {/* SẢN PHẨM TRỌNG TÂM */}
                {hasProducts && (
                  <tr>
                    <td style={{ width: "130px", background: "#f8fafc", fontWeight: "bold", color: "#475569", padding: "8px 12px", verticalAlign: "top", borderRight: "1px solid #cbd5e1" }}>
                      SẢN PHẨM TRỌNG TÂM
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {weeks.map(w => {
                          const weekProducts = currentMonthProducts[w] || [];
                          if (weekProducts.length === 0) return null;
                          return (
                            <div key={w} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: "bold", minWidth: "55px", color: "#475569" }}>Tuần {w}:</span>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                {weekProducts.map((p: string, pIdx: number) => (
                                  <span key={pIdx} style={{ fontSize: "10px", fontWeight: 600, color: "#2563eb", backgroundColor: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "4px", padding: "1.5px 5px" }}>
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}


      {/* Main items table */}
      <table className="table table-bordered mb-4" style={{ fontSize: "12.5px", borderColor: "#cbd5e1" }}>
        <thead style={{ background: "#f1f5f9" }}>
          <tr>
            <th className="text-center text-uppercase" style={{ width: "60px", background: "#f1f5f9", color: "#1e293b", fontWeight: 700, padding: `${rowPadding}px 8px` }}>STT</th>
            <th className="text-uppercase" style={{ background: "#f1f5f9", color: "#1e293b", fontWeight: 700, padding: `${rowPadding}px 8px` }}>Hạng mục công việc / Nội dung chi tiết</th>
            <th className="text-end text-uppercase" style={{ width: "160px", background: "#f1f5f9", color: "#1e293b", fontWeight: 700, padding: `${rowPadding}px 8px` }}>
              {isPlan ? "Kinh phí dự kiến" : "Chi phí đề xuất"}
            </th>
          </tr>
        </thead>
        <tbody>
          {renderRows.map((row, idx) => {
            if (row.type === "header") {
              return (
                <tr key={`header_${idx}`} className="pdf-section-header-tr" style={{ background: row.bg, color: row.color, fontWeight: "bold" }}>
                  <td className="text-center" style={{ padding: `${rowPadding}px 8px`, borderRight: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                    {row.stt}
                  </td>
                  <td colSpan={2} style={{ padding: `${rowPadding}px 8px`, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "12px" }}>
                    {row.label}
                  </td>
                </tr>
              );
            }

            const displayAmount = row.isSubTask
              ? row.proposedAmount
              : (proposalData.items[row.id]?.subTasks?.length > 0 
                  ? (proposalData.items[row.id].subTasks.reduce((sum: number, s: any) => sum + s.proposedAmount, 0) || row.proposedAmount)
                  : row.proposedAmount);

            const { cleanDesc, timeStr } = parseDescriptionTime(row.description);

            return (
              <tr key={row.id}>
                <td className="text-center" style={{ fontWeight: row.isSubTask ? "normal" : "bold", padding: `${rowPadding}px 8px` }}>
                  {row.indexStr}
                </td>
                <td style={{ padding: `${rowPadding}px 8px ${rowPadding}px ${row.isSubTask ? 24 : 12}px` }}>
                  <div style={{ fontWeight: row.isSubTask ? "normal" : "bold", textTransform: (row.isSubTask || isPlan) ? "none" : "uppercase" }}>
                    {row.isSubTask && <span style={{ color: "#94a3b8", marginRight: "6px" }}>↳</span>}
                    {row.label}
                  </div>
                  {/* Detailed Description */}
                  {renderTaskDescription(cleanDesc, row.isSubTask)}
                  {/* Badges as small labels in printing */}
                  {row.isSubTask && (row.category || row.executionMethod || row.department) && (
                    <div className="d-flex flex-wrap gap-2 mt-1" style={{ fontSize: "10.5px", paddingLeft: "14px" }}>
                      {row.category && <span style={{ color: "#7c3aed" }}>• {row.category}</span>}
                      {row.executionMethod && <span style={{ color: "#2563eb" }}>• {row.executionMethod}</span>}
                      {row.department && <span style={{ color: "#16a34a" }}>• {row.department}</span>}
                    </div>
                  )}
                </td>
                <td className="text-end" style={{ fontWeight: row.isSubTask ? "normal" : "bold", padding: `${rowPadding}px 8px`, verticalAlign: "top" }}>
                  <div style={{ fontWeight: row.isSubTask ? "normal" : "bold" }}>
                    {displayAmount ? displayAmount.toLocaleString("vi-VN") + " đ" : "-"}
                  </div>
                  {isPlan && timeStr && (
                    <div className="text-muted mt-1" style={{ fontSize: "10px", fontWeight: "normal", whiteSpace: "nowrap" }}>
                      {timeStr}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {/* Reserve Row */}
          {proposalData.advReserve > 0 && (
            <tr className="table-light">
              <td className="text-center" style={{ fontWeight: "bold", padding: `${rowPadding}px 8px` }}>-</td>
              <td style={{ fontWeight: "bold", textTransform: "uppercase", padding: `${rowPadding}px 8px` }}>Chi phí dự phòng</td>
              <td className="text-end" style={{ fontWeight: "bold", padding: `${rowPadding}px 8px` }}>
                {proposalData.advReserve.toLocaleString("vi-VN")} đ
              </td>
            </tr>
          )}
          {/* Total Row */}
          <tr style={{ background: "#f8fafc" }}>
            <td colSpan={2} className="text-end fw-bold" style={{ fontSize: "13px", padding: `${rowPadding}px 8px` }}>
              {isPlan ? "TỔNG CỘNG KINH PHÍ DỰ KIẾN:" : "TỔNG CỘNG KINH PHÍ ĐỀ XUẤT:"}
            </td>
            <td className="text-end fw-bold text-primary" style={{ fontSize: "13px", padding: `${rowPadding}px 8px` }}>
              {totalProposed ? totalProposed.toLocaleString("vi-VN") + " đ" : "0 đ"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature section */}
      <div className="row mt-4" style={{ fontSize: "13px" }}>
        <div className="col-6 text-center">
          <p className="mb-2"><strong>{isPlan ? "NGƯỜI LẬP KẾ HOẠCH" : "NGƯỜI LẬP ĐỀ XUẤT"}</strong></p>
          <div style={{ height: "65px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px" }}>
            {proposerSig ? (
              <img src={proposerSig} alt="Chữ ký người lập" style={{ maxHeight: "60px", maxWidth: "160px", objectFit: "contain" }} />
            ) : (
              <div style={{ height: "45px" }} />
            )}
          </div>
          <p className="fw-bold mb-0">{proposalData.proposerName || "Nguyễn Thu Huyền"}</p>
        </div>
        <div className="col-6 text-center">
          <p className="mb-2"><strong>NGƯỜI PHÊ DUYỆT</strong></p>
          <div style={{ height: "65px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px" }}>
            {approverSig ? (
              <img src={approverSig} alt="Chữ ký người duyệt" style={{ maxHeight: "60px", maxWidth: "160px", objectFit: "contain" }} />
            ) : (
              <div style={{ height: "45px" }} />
            )}
          </div>
          <p className="fw-bold mb-0">{proposalData.approverName || "Lê Công Vụ"}</p>
        </div>
      </div>
    </div>
  );
};

export default function Planing1111Page() {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState<number>(6);


  const [editedWeeklyAssign, setEditedWeeklyAssign] = useState<{ [key: string]: boolean[] }>({});
  const [showStep3AddOffcanvas, setShowStep3AddOffcanvas] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [isGeneralInfoCollapsed, setIsGeneralInfoCollapsed] = useState(false);

  interface ProposalItem {
    label: string;
    proposedAmount: number;
    description: string;
    notes?: string;
    subTasks?: Array<{
      id: string;
      label: string;
      proposedAmount: number;
      description: string;
      notes?: string;
      category?: string;
      executionMethod?: string;
      department?: string;
    }>;
  }

  const [proposalData, setProposalData] = useState<{
    proposerName: string;
    approverName: string;
    date: string;
    purpose: string;
    notes: string;
    code: string;
    department: string;
    items: Record<string, ProposalItem>;
    advReserve?: number;
    status?: string;
  }>({
    proposerName: "Nguyễn Thu Huyền",
    approverName: "Lê Công Vụ",
    date: "",
    purpose: "Lập chiến dịch truyền thông tháng",
    notes: "",
    code: "",
    department: "Phòng Marketing",
    items: {},
    advReserve: 0,
    status: "draft"
  });

  const [monthlyPlanData, setMonthlyPlanData] = useState<{
    proposerName: string;
    approverName: string;
    date: string;
    purpose: string;
    notes: string;
    code: string;
    department: string;
    items: Record<string, ProposalItem>;
    advReserve?: number;
    status?: string;
  }>({
    proposerName: "Nguyễn Thu Huyền",
    approverName: "Lê Công Vụ",
    date: "",
    purpose: "Lập kế hoạch hoạt động marketing tháng",
    notes: "",
    code: "",
    department: "Phòng Marketing",
    items: {},
    advReserve: 0,
    status: "draft"
  });

  const [marketingManagerName, setMarketingManagerName] = useState<string>("Nguyễn Thu Huyền");
  const [directorName, setDirectorName] = useState<string>("Lê Công Vụ");

  useEffect(() => {
    fetch("/api/company/employees")
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data)) {
          // Find Marketing Manager
          const mgr = data.find(emp => 
            emp.departmentName === "Marketing" && 
            emp.position === "vtr-20260401-1964-sbmg"
          );
          if (mgr) {
            setMarketingManagerName(mgr.fullName);
          }
          // Find Director (Giám đốc / Ban Giám đốc)
          const dir = data.find(emp => 
            emp.position === "vtr-20260401-8730-eauc" || 
            emp.departmentName === "Ban Giám đốc"
          );
          if (dir) {
            setDirectorName(dir.fullName);
          }
        }
      })
      .catch(() => {
        // Fail silently
      });
  }, []);

  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRowLabel, setEditRowLabel] = useState("");
  const [editRowAmount, setEditRowAmount] = useState<number>(0);
  const [editRowDescription, setEditRowDescription] = useState("");
  const [editRowNotes, setEditRowNotes] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [rowPadding, setRowPadding] = useState<number>(3);
  const [proposerSig, setProposerSig] = useState<string | null>(null);
  const [approverSig, setApproverSig] = useState<string | null>(null);
  const [showPlanPrintModal, setShowPlanPrintModal] = useState(false);
  const [showMonthlyPlanPrintModal, setShowMonthlyPlanPrintModal] = useState(false);
  const [planProposerSig, setPlanProposerSig] = useState<string | null>(null);
  const [planApproverSig, setPlanApproverSig] = useState<string | null>(null);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [isSubmittingMonthlyPlan, setIsSubmittingMonthlyPlan] = useState(false);

  const [showAddSubTaskModal, setShowAddSubTaskModal] = useState(false);
  const [subTaskParentId, setSubTaskParentId] = useState<string | null>(null);
  const [subTaskEditingId, setSubTaskEditingId] = useState<string | null>(null);
  const [newSubTaskLabel, setNewSubTaskLabel] = useState("");
  const [newSubTaskAmount, setNewSubTaskAmount] = useState<number>(0);
  const [newSubTaskDescription, setNewSubTaskDescription] = useState("");
  const [newSubTaskNotes, setNewSubTaskNotes] = useState("");
  const [newSubTaskCategory, setNewSubTaskCategory] = useState("");
  const [newSubTaskExecutionMethod, setNewSubTaskExecutionMethod] = useState("");
  const [newSubTaskDepartment, setNewSubTaskDepartment] = useState("");
  const [collapsedMainTaskIds, setCollapsedMainTaskIds] = useState<Record<string, boolean>>({});

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const existingSubTaskLabels = React.useMemo(() => {
    const labelsSet = new Set<string>();
    Object.values(proposalData.items).forEach(mainTask => {
      if (mainTask.subTasks) {
        mainTask.subTasks.forEach(sub => {
          const label = sub.label?.trim();
          if (label) {
            labelsSet.add(label);
          }
        });
      }
    });
    return Array.from(labelsSet);
  }, [proposalData.items]);

  const filteredSuggestions = React.useMemo(() => {
    const query = newSubTaskLabel.trim().toLowerCase();
    if (!query) return existingSubTaskLabels;
    return existingSubTaskLabels.filter(label => 
      label.toLowerCase().includes(query)
    );
  }, [existingSubTaskLabels, newSubTaskLabel]);

  useEffect(() => {
    if (focusedSuggestionIndex >= 0 && itemRefs.current[focusedSuggestionIndex]) {
      itemRefs.current[focusedSuggestionIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [focusedSuggestionIndex]);

  const handleSubTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showSuggestions) {
        setShowSuggestions(true);
        setFocusedSuggestionIndex(0);
      } else {
        setFocusedSuggestionIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (showSuggestions && focusedSuggestionIndex >= 0 && focusedSuggestionIndex < filteredSuggestions.length) {
        e.preventDefault();
        setNewSubTaskLabel(filteredSuggestions[focusedSuggestionIndex]);
        setShowSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setFocusedSuggestionIndex(-1);
    }
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuRowId(null);
    };
    if (activeMenuRowId) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [activeMenuRowId]);

  const [newMainTaskLabel, setNewMainTaskLabel] = useState("");
  const [step3AddOffcanvasSection, setStep3AddOffcanvasSection] = useState<any>(null);
  const [contentPillar, setContentPillar] = useState("");
  const [contentTopic, setContentTopic] = useState("");
  const [contentFormat, setContentFormat] = useState("");
  const [contentChannel, setContentChannel] = useState("");
  const [contentWeeks, setContentWeeks] = useState<number[]>([]);
  const [contentAssignee, setContentAssignee] = useState("Chu Thị Hằng");
  const [contentBudget, setContentBudget] = useState("");
  const [contentDetails, setContentDetails] = useState("");
  const [expandedMediaItems, setExpandedMediaItems] = useState<string[]>([]);
  const [contentIsAds, setContentIsAds] = useState(false);
  // sectionContentItems: Record<sectionId_month, ContentItem[]>
  const [sectionContentItems, setSectionContentItems] = useState<Record<string, any[]>>({});
  const [monthlyThemeContent, setMonthlyThemeContent] = useState("");
  const [monthlyThemeTopic, setMonthlyThemeTopic] = useState("");
  const [monthlyThemes, setMonthlyThemes] = useState<{ id: string; topic: string; content: string; month?: number }[]>([]);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [editingContentItemId, setEditingContentItemId] = useState<string | null>(null);
  const [offcanvasView, setOffcanvasView] = useState<"form" | "tasks">("form");
  const [tempDetailedTasks, setTempDetailedTasks] = useState<any[]>([]);
  const [newTaskName, setNewTaskName] = useState<string>("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");
  const [newTaskDeadline, setNewTaskDeadline] = useState<string>("");
  const [newTaskStatus, setNewTaskStatus] = useState<string>("Chưa bắt đầu");
  const [newTaskChannels, setNewTaskChannels] = useState<string[]>([]);

  const [monthlyProducts, setMonthlyProducts] = useState<Record<number, Record<number, string[]>>>({});
  const [showProductModal, setShowProductModal] = useState(false);
  const [activeProductWeek, setActiveProductWeek] = useState<number | null>(null);
  const [tempSelectedProducts, setTempSelectedProducts] = useState<string[]>([]);
  const [popoverAnchor, setPopoverAnchor] = useState<{ top: number; left: number } | null>(null);
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [isThemeCollapsed, setIsThemeCollapsed] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  const [customHolidays, setCustomHolidays] = useState<{ dateStr: string; name: string; weekNum: number; month: number }[]>([]);
  const [editingHoliday, setEditingHoliday] = useState<{ dateStr: string; name: string; weekNum: number; month: number } | null>(null);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  const [masterPlanData, setMasterPlanData] = useState<any>(null);
  const [planStatus, setPlanStatus] = useState<string>("draft");
  const [loadingMasterPlan, setLoadingMasterPlan] = useState<boolean>(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<number, number>>({});
  const [monthlyAllocations, setMonthlyAllocations] = useState<Record<number, Record<string, { budget: number; note: string }>>>({});

  const [brandingCost, setBrandingCost] = useState<number | null>(null);
  const [travelCost, setTravelCost] = useState<number | null>(null);
  const [agencyPOSBudget, setAgencyPOSBudget] = useState<number>(0);
  const [agencyAdsBudget, setAgencyAdsBudget] = useState<number>(0);
  const [agencyGiftBudget, setAgencyGiftBudget] = useState<number>(0);
  const [advFbAds, setAdvFbAds] = useState<number>(0);
  const [advGoogleAds, setAdvGoogleAds] = useState<number>(0);
  const [advYoutubeAds, setAdvYoutubeAds] = useState<number>(0);
  const [advTiktokAds, setAdvTiktokAds] = useState<number>(0);
  const [advSeoPr, setAdvSeoPr] = useState<number>(0);
  const [advPrintOutsource, setAdvPrintOutsource] = useState<number>(0);
  const [advMediaModelDecor, setAdvMediaModelDecor] = useState<number>(0);
  const [advWebDesign, setAdvWebDesign] = useState<number>(0);
  const [advOther, setAdvOther] = useState<number>(0);
  const [advReserve, setAdvReserve] = useState<number>(0);
  const [editedStaff, setEditedStaff] = useState<{ [key: string]: { name: string; basic: number; perf: number; allowance: number; qty: number } }>({});
  const [customStaffIds, setCustomStaffIds] = useState<string[]>([]);
  const [deletedBaseStaffIds, setDeletedBaseStaffIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [editedContentPlan, setEditedContentPlan] = useState<{
    [key: string]: {
      pillar: string;
      details: string;
      budget: number;
      postsCount: number;
      ratioStr?: string;
      purpose?: string;
      role?: string;
    }
  }>({});
  const [showAddOffcanvas, setShowAddOffcanvas] = useState(false);
  const [offcanvasData, setOffcanvasData] = useState<{
    pillar: string;
    purpose: string;
    role: string;
    details: string;
    budget: number;
    ratioStr: string;
    postsCount: number;
  }>({
    pillar: "",
    purpose: "",
    role: "",
    details: "",
    budget: 10000000,
    ratioStr: "0.77",
    postsCount: 5
  });
  const [customContentPlanIds, setCustomContentPlanIds] = useState<string[]>([]);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [selectedContentPlanIds, setSelectedContentPlanIds] = useState<string[]>([]);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right: number } | null>(null);
  const [editingContentPlanId, setEditingContentPlanId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [rowIdToDelete, setRowIdToDelete] = useState<string | null>(null);
  const [showDetailsOffcanvas, setShowDetailsOffcanvas] = useState(false);
  const [detailsParentId, setDetailsParentId] = useState<string | null>(null);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [expandedParentIds, setExpandedParentIds] = useState<string[]>([]);
  const [expandedAdParentIds, setExpandedAdParentIds] = useState<string[]>([]);

  const [showAdDetailsOffcanvas, setShowAdDetailsOffcanvas] = useState(false);
  const [adDetailsParentId, setAdDetailsParentId] = useState<string | null>(null);
  const [adEditingChildId, setAdEditingChildId] = useState<string | null>(null);
  const [adChildRowPillar, setAdChildRowPillar] = useState("");
  const [adChildRowDetails, setAdChildRowDetails] = useState("");
  const [adChildRowBudgetStr, setAdChildRowBudgetStr] = useState("");
  const [adChildRowChannel, setAdChildRowChannel] = useState("");
  const [adChildRowLandingPage, setAdChildRowLandingPage] = useState("");

  const [childRowPillar, setChildRowPillar] = useState("");
  const [childRowDetails, setChildRowDetails] = useState("");
  const [childRowRatioStr, setChildRowRatioStr] = useState("");
  const [childRowPostsCount, setChildRowPostsCount] = useState<number | "">("");
  const [subStep, setSubStep] = useState<"pillar" | "ads">("pillar");
  const [editedAdPlan, setEditedAdPlan] = useState<{
    [key: string]: {
      objective: string;
      topic: string;
      channel: string;
      content: string;
      landingPage?: string;
      budget: number;
      region: string;
      assignee: string;
      startDate: string;
      endDate: string;
      audience: string;
      details?: string;
    }
  }>({});
  const [customAdPlanIds, setCustomAdPlanIds] = useState<string[]>([]);
  const [expandedAdAudienceIds, setExpandedAdAudienceIds] = useState<string[]>([]);
  const [showAdOffcanvas, setShowAdOffcanvas] = useState(false);
  const [editingAdPlanId, setEditingAdPlanId] = useState<string | null>(null);
  const [adOffcanvasData, setAdOffcanvasData] = useState<{
    objective: string;
    topic: string;
    region: string;
    assignee: string;
    startDate: string;
    endDate: string;
    audience: string;
  }>({
    objective: "",
    topic: "",
    region: "",
    assignee: "",
    startDate: "",
    endDate: "",
    audience: ""
  });
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState("");

  const handleSaveAdOffcanvas = () => {
    if (!adOffcanvasData.objective.trim()) {
      toast.warning("Cảnh báo", "Vui lòng nhập Mục tiêu!");
      return;
    }

    if (editingAdPlanId) {
      setEditedAdPlan(prev => ({
        ...prev,
        [editingAdPlanId]: {
          objective: adOffcanvasData.objective.trim().toUpperCase(),
          topic: adOffcanvasData.topic.trim(),
          channel: prev[editingAdPlanId]?.channel ?? "",
          content: prev[editingAdPlanId]?.content ?? "",
          landingPage: prev[editingAdPlanId]?.landingPage ?? "",
          budget: prev[editingAdPlanId]?.budget ?? 0,
          region: adOffcanvasData.region.trim(),
          assignee: adOffcanvasData.assignee.trim(),
          startDate: adOffcanvasData.startDate,
          endDate: adOffcanvasData.endDate,
          audience: adOffcanvasData.audience.trim()
        }
      }));
      toast.success("Thành công", "Đã cập nhật mục tiêu quảng cáo!");
    } else {
      const newId = `ad_custom_${Date.now()}`;
      setCustomAdPlanIds(prev => [...prev, newId]);
      setEditedAdPlan(prev => ({
        ...prev,
        [newId]: {
          objective: adOffcanvasData.objective.trim().toUpperCase(),
          topic: adOffcanvasData.topic.trim(),
          channel: "",
          content: "",
          landingPage: "",
          budget: 0,
          region: adOffcanvasData.region.trim(),
          assignee: adOffcanvasData.assignee.trim(),
          startDate: adOffcanvasData.startDate,
          endDate: adOffcanvasData.endDate,
          audience: adOffcanvasData.audience.trim()
        }
      }));
      toast.success("Thành công", "Đã thêm mục tiêu quảng cáo mới!");
    }
    setShowAdOffcanvas(false);
    setEditingAdPlanId(null);
  };

  const totalAllocatedMonthly = Object.values(monthlyBudgets).reduce((sum, val) => sum + (val || 0), 0);

  const totalAllocatedBudgets =
    (agencyPOSBudget || 0) +
    (agencyAdsBudget || 0) +
    (agencyGiftBudget || 0) +
    (advFbAds || 0) +
    (advGoogleAds || 0) +
    (advYoutubeAds || 0) +
    (advTiktokAds || 0) +
    (advSeoPr || 0) +
    (advPrintOutsource || 0) +
    (advMediaModelDecor || 0) +
    (advWebDesign || 0) +
    (advOther || 0) +
    (advReserve || 0);

  const handleMonthlyBudgetChange = (monthNum: number, value: number) => {
    setMonthlyBudgets((prev) => ({
      ...prev,
      [monthNum]: value
    }));
  };

  const handleMonthlyAllocationChange = (monthNum: number, catId: string, field: "budget" | "note", val: any) => {
    setMonthlyAllocations((prev) => {
      const monthData = prev[monthNum] || {};
      const catData = monthData[catId] || { budget: 0, note: "" };
      const updatedCatData = { ...catData, [field]: val };
      const updatedMonthData = { ...monthData, [catId]: updatedCatData };
      const updatedAllocations = { ...prev, [monthNum]: updatedMonthData };

      // Also calculate the new sum for this month and update monthlyBudgets
      const newMonthSum = BUDGET_CATEGORIES.reduce((sum, cat) => {
        const alloc = updatedMonthData[cat.id];
        return sum + ((alloc && alloc.budget) || 0);
      }, 0);

      setMonthlyBudgets((prevBudgets) => ({
        ...prevBudgets,
        [monthNum]: newMonthSum
      }));

      return updatedAllocations;
    });
  };

  const handleAutoSplitBudgets = () => {
    const splitVal = Math.round(valBranding / 12);
    const newBudgets: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      newBudgets[m] = splitVal;
    }
    setMonthlyBudgets(newBudgets);
    toast.success("Thành công", "Đã phân bổ đều ngân sách cho 12 tháng!");
  };

  const handleClearBudgets = () => {
    const newBudgets: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      newBudgets[m] = 0;
    }
    setMonthlyBudgets(newBudgets);
    toast.info("Thông báo", "Đã xóa toàn bộ phân bổ ngân sách tháng!");
  };

  const handleSaveProposal = async (currentProposal: any) => {
    try {
      const res = await fetch(`/api/plan-finance/master-plan?year=${selectedYear}`, { cache: "no-store" });
      let currentPlanObj: any = {};
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.plan) {
          currentPlanObj = JSON.parse(data.plan.planData) || {};
        }
      }

      const existingProposals = currentPlanObj.mkt_proposals || {};
      const updatedProposals = {
        ...existingProposals,
        [selectedMonth]: currentProposal
      };

      const updatedPlanObj = {
        ...currentPlanObj,
        mkt_proposals: updatedProposals
      };

      const saveRes = await fetch("/api/plan-finance/master-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: parseInt(selectedYear, 10),
          planData: JSON.stringify(updatedPlanObj),
          status: "draft"
        })
      });

      if (saveRes.ok) {
        const data = await saveRes.json();
        if (data.success) {
          setMasterPlanData(updatedPlanObj);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Lỗi khi lưu đề xuất:", err);
      return false;
    }
  };

  const handleSave = async (
    overrideThemes?: any,
    overrideProducts?: any,
    overrideHolidays?: any,
    overrideContentItems?: any,
    statusOverride?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/plan-finance/master-plan?year=${selectedYear}`, { cache: "no-store" });
      let currentPlanObj: any = {};
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.plan) {
          currentPlanObj = JSON.parse(data.plan.planData) || {};
        }
      }

      // Generate the monthly plan document mapping for the database to keep it always in sync
      const activeProposal = getLatestMonthlyPlanData(overrideContentItems !== undefined ? overrideContentItems : sectionContentItems);
      const existingMonthlyPlans = currentPlanObj.mkt_monthly_plans || {};
      const existingPlan = existingMonthlyPlans[selectedMonth];
      activeProposal.status = statusOverride || existingPlan?.status || "draft";

      const updatedMonthlyPlans = {
        ...existingMonthlyPlans,
        [selectedMonth]: activeProposal
      };

      const updatedPlanObj = {
        ...currentPlanObj,
        mkt_brandingCost: brandingCost,
        mkt_travelCost: travelCost,
        mkt_editedStaff: editedStaff,
        mkt_customStaffIds: customStaffIds,
        mkt_deletedBaseStaffIds: deletedBaseStaffIds,
        mkt_editedContentPlan: editedContentPlan,
        mkt_customContentPlanIds: customContentPlanIds,
        mkt_editedAdPlan: editedAdPlan,
        mkt_customAdPlanIds: customAdPlanIds,
        mkt_editedWeeklyAssign: editedWeeklyAssign,
        mkt_monthlyThemeTopic: monthlyThemeTopic,
        mkt_monthlyThemeContent: monthlyThemeContent,
        mkt_monthlyThemes: Array.isArray(overrideThemes) ? overrideThemes : monthlyThemes,
        mkt_monthlyProducts: overrideProducts !== undefined ? overrideProducts : monthlyProducts,
        mkt_customHolidays: Array.isArray(overrideHolidays) ? overrideHolidays : customHolidays,
        mkt_sectionContentItems: overrideContentItems !== undefined ? overrideContentItems : sectionContentItems,
        mkt_monthlyBudgets: monthlyBudgets,
        mkt_agencyPOSBudget: agencyPOSBudget,
        mkt_agencyAdsBudget: agencyAdsBudget,
        mkt_agencyGiftBudget: agencyGiftBudget,
        mkt_advFbAds: advFbAds,
        mkt_advGoogleAds: advGoogleAds,
        mkt_advYoutubeAds: advYoutubeAds,
        mkt_advTiktokAds: advTiktokAds,
        mkt_advSeoPr: advSeoPr,
        mkt_advPrintOutsource: advPrintOutsource,
        mkt_advMediaModelDecor: advMediaModelDecor,
        mkt_advWebDesign: advWebDesign,
        mkt_advOther: advOther,
        mkt_advReserve: advReserve,
        mkt_monthlyAllocations: monthlyAllocations,
        mkt_monthly_plans: updatedMonthlyPlans
      };

      const saveRes = await fetch("/api/plan-finance/master-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: parseInt(selectedYear, 10),
          planData: JSON.stringify(updatedPlanObj),
          status: statusOverride || "draft"
        })
      });

      if (saveRes.ok) {
        const data = await saveRes.json();
        if (data.success) {
          if (!statusOverride) {
            toast.success("Thành công", "Đã lưu kế hoạch marketing thành công!");
          }
          setIsEditing(false);
          setSelectedStaffIds([]);
          setSelectedContentPlanIds([]);
          setMasterPlanData(updatedPlanObj);
          setMonthlyPlanData(activeProposal);
          return true;
        } else {
          toast.error("Lỗi", `Lỗi khi lưu kế hoạch: ${data.error}`);
        }
      } else {
        toast.error("Lỗi", "Không thể lưu kế hoạch vào cơ sở dữ liệu.");
      }
      return false;
    } catch (err) {
      console.error("Lỗi khi lưu kế hoạch marketing:", err);
      toast.error("Lỗi", "Lỗi mạng hoặc máy chủ khi lưu kế hoạch.");
      return false;
    }
  };

  const handleSubmitPlan = async () => {
    if (isSubmittingPlan) return;
    setIsSubmittingPlan(true);
    try {
      // 1. Save the plan first as "pending"
      const saveSuccess = await handleSave(undefined, undefined, undefined, undefined, "pending");
      if (!saveSuccess) {
        setIsSubmittingPlan(false);
        return;
      }

      // Display loading toast
      toast.info("Đang xử lý", "Đang kết xuất bản PDF kế hoạch và chuẩn bị gửi thông báo...");

      // 2. Generate PDF Blob from the hidden print document
      const pdfBlob = await generatePDFBlob("plan-print-doc-hidden", {
        orientation: "portrait",
        scale: 2
      });

      // 3. Upload the PDF file
      const file = new File(
        [pdfBlob],
        `Ke_hoach_MKT_nam_${selectedYear}.pdf`,
        { type: "application/pdf" }
      );
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      if (!uploadRes.ok) {
        throw new Error("Không thể tải bản PDF kế hoạch lên hệ thống.");
      }
      const uploadData = await uploadRes.json();
      const pdfUrl = window.location.origin + uploadData.url;

      // 4. Calculate total plan proposed budget (valMarketingCost)
      const proposedAmount = valMarketingCost;

      // 5. Submit approval with notification
      const submitRes = await fetch("/api/plan-finance/master-plan/submit-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: parseInt(selectedYear, 10),
          pdfUrl,
          proposalCode: `KH-MKT-${selectedYear}`,
          proposerName: marketingManagerName || "Nguyễn Thu Huyền",
          proposedAmount,
          isYearly: true
        })
      });

      if (!submitRes.ok) {
        const errData = await submitRes.json();
        throw new Error(errData.error || "Gặp lỗi khi gửi trình duyệt kế hoạch.");
      }

      setPlanStatus("pending");
      toast.success(
        "Thành công",
        "Kế hoạch Marketing năm đã được lưu, kết xuất PDF và tự động gửi thông báo phê duyệt đến Giám đốc cùng Trưởng phòng TC-KT thành công!"
      );
    } catch (err: any) {
      console.error("Lỗi trình duyệt kế hoạch:", err);
      toast.error("Lỗi", err?.message || "Không thể gửi trình duyệt kế hoạch.");
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const getLatestMonthlyPlanData = (customContentItems?: Record<string, any[]>) => {
    const existingPlan = masterPlanData?.mkt_monthly_plans?.[selectedMonth];
    const computedItems: Record<string, any> = {};
    let itemIdx = 1;
    const sectionIds = ["section_content", "section_media", "section_design", "section_seo", "section_adv", "section_pos"];
    const m = selectedMonth;
    const sourceContentItems = customContentItems || sectionContentItems;

    sectionIds.forEach(secId => {
      const list = sourceContentItems[`${secId}_${m}`] || [];
      list.forEach(item => {
        const bVal = parseFloat(String(item.budget || "0").replace(/\./g, "").replace(/[^0-9.-]+/g, ""));
        const label = item.topic || item.pillar || `Chi phí ${secId}`;
        
        const subTasksList = (item.detailedTasks || []).map((t: any, subIdx: number) => {
          let subDesc = "";
          if (secId === "section_content") {
            const fmt = ["Video", "Hình ảnh", "Bài viết"].includes(t.assignee) ? t.assignee : "Video";
            const channels = t.deadline ? t.deadline : "";
            const assign = item.assignee || "Chu Thị Hằng";
            const weeksStr = item.weeks && item.weeks.length > 0 ? `Tuần ${item.weeks.join(", ")}` : "";
            subDesc = `Định dạng: ${fmt}${channels ? ` | Kênh: ${channels}` : ""}${assign ? ` | Người thực hiện: ${assign}` : ""}${weeksStr ? ` | Thời gian thực hiện: ${weeksStr}` : ""}`;
          } else {
            const assign = t.assignee || item.assignee || "";
            const dl = t.deadline ? t.deadline.split("-").reverse().slice(0, 2).join("/") : "";
            subDesc = `${assign ? `Người thực hiện: ${assign}` : ""}${dl ? ` | Thời gian thực hiện: Hạn ${dl}` : ""}`;
          }

          return {
            id: t.id || `sub_${item.id || itemIdx}_${subIdx}`,
            label: t.name || "Nội dung con",
            proposedAmount: 0,
            description: subDesc,
            notes: ""
          };
        });

        let displayDesc = "";
        const descParts = [];
        
        if (secId === "section_content") {
          const cPillar = item.pillar || "N/A";
          const cAssign = item.assignee || "Chu Thị Hằng";
          const cWeeks = item.weeks && item.weeks.length > 0 ? `Tuần ${item.weeks.join(", ")}` : "";
          
          descParts.push(`Tuyến: ${cPillar}`);
          descParts.push(`Người thực hiện: ${cAssign}`);
          if (cWeeks) {
            descParts.push(`Thời gian thực hiện: ${cWeeks}`);
          }
          displayDesc = descParts.join(" | ");
        } else {
          if (item.details) {
            descParts.push(item.details.trim());
          }
          if (item.pillar) {
            descParts.push(`Tuyến: ${item.pillar}`);
          }
          if (item.channel) {
            descParts.push(`Kênh: ${item.channel}`);
          }
          if (item.assignee) {
            descParts.push(`Người thực hiện: ${item.assignee}`);
          }
          if (secId === "section_media") {
            descParts.push(`Quảng cáo: ${item.isAds ? "Có" : "Không"}`);
          }
          if (item.weeks && item.weeks.length > 0) {
            descParts.push(`Thời gian thực hiện: Tuần ${item.weeks.join(", ")}`);
          }
          displayDesc = descParts.join(" | ");
        }

        computedItems[`task_auto_${item.id || itemIdx++}`] = {
          label,
          proposedAmount: bVal || 0,
          description: displayDesc,
          notes: item.notes || "",
          subTasks: subTasksList,
          secId: secId
        };
      });
    });

    if (Object.keys(computedItems).length === 0) {
      const monthlyTotal = monthlyBudgets[selectedMonth] || 0;
      computedItems["task_default_general"] = {
        label: `KẾ HOẠCH CHI PHÍ MARKETING THÁNG ${selectedMonth}/${selectedYear}`,
        proposedAmount: monthlyTotal,
        description: `Kinh phí hoạt động Marketing tháng ${selectedMonth}/${selectedYear}`,
        notes: "",
        subTasks: []
      };
    }

    return {
      proposerName: existingPlan?.proposerName || marketingManagerName || "Nguyễn Thu Huyền",
      approverName: existingPlan?.approverName || directorName || "Director",
      date: existingPlan?.date || new Date().toLocaleDateString("vi-VN"),
      purpose: existingPlan?.purpose || `Lập kế hoạch marketing tháng ${selectedMonth}/${selectedYear}`,
      notes: existingPlan?.notes || "",
      code: existingPlan?.code || `KH-MKT-${selectedMonth.toString().padStart(2, "0")}${selectedYear}-${Math.floor(1000 + Math.random() * 9000)}`,
      department: existingPlan?.department || "Phòng Marketing",
      items: computedItems,
      advReserve: existingPlan?.advReserve || 0,
      status: existingPlan?.status || "draft"
    };
  };

  const handleSubmitMonthlyPlan = async () => {
    if (isSubmittingMonthlyPlan) return;
    setIsSubmittingMonthlyPlan(true);

    try {
      const res = await fetch(`/api/plan-finance/master-plan?year=${selectedYear}`, { cache: "no-store" });
      let currentPlanObj: any = {};
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.plan) {
          currentPlanObj = JSON.parse(data.plan.planData) || {};
        }
      }

      const activeProposal = getLatestMonthlyPlanData();
      activeProposal.status = "pending";

      setMonthlyPlanData(activeProposal);

      const existingMonthlyPlans = currentPlanObj.mkt_monthly_plans || {};
      const updatedMonthlyPlans = {
        ...existingMonthlyPlans,
        [selectedMonth]: activeProposal
      };

      const updatedPlanObj = {
        ...currentPlanObj,
        mkt_brandingCost: brandingCost,
        mkt_travelCost: travelCost,
        mkt_editedStaff: editedStaff,
        mkt_customStaffIds: customStaffIds,
        mkt_deletedBaseStaffIds: deletedBaseStaffIds,
        mkt_editedContentPlan: editedContentPlan,
        mkt_customContentPlanIds: customContentPlanIds,
        mkt_editedAdPlan: editedAdPlan,
        mkt_customAdPlanIds: customAdPlanIds,
        mkt_editedWeeklyAssign: editedWeeklyAssign,
        mkt_monthlyThemeTopic: monthlyThemeTopic,
        mkt_monthlyThemeContent: monthlyThemeContent,
        mkt_monthlyThemes: monthlyThemes,
        mkt_monthlyProducts: monthlyProducts,
        mkt_customHolidays: customHolidays,
        mkt_sectionContentItems: sectionContentItems,
        mkt_monthlyBudgets: monthlyBudgets,
        mkt_agencyPOSBudget: agencyPOSBudget,
        mkt_agencyAdsBudget: agencyAdsBudget,
        mkt_agencyGiftBudget: agencyGiftBudget,
        mkt_advFbAds: advFbAds,
        mkt_advGoogleAds: advGoogleAds,
        mkt_advYoutubeAds: advYoutubeAds,
        mkt_advTiktokAds: advTiktokAds,
        mkt_advSeoPr: advSeoPr,
        mkt_advPrintOutsource: advPrintOutsource,
        mkt_advMediaModelDecor: advMediaModelDecor,
        mkt_advWebDesign: advWebDesign,
        mkt_advOther: advOther,
        mkt_advReserve: advReserve,
        mkt_monthlyAllocations: monthlyAllocations,
        mkt_proposals: currentPlanObj.mkt_proposals || {}, // Preserve proposals untouched
        mkt_monthly_plans: updatedMonthlyPlans
      };

      // 3. Save to database
      const saveRes = await fetch("/api/plan-finance/master-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: parseInt(selectedYear, 10),
          planData: JSON.stringify(updatedPlanObj),
          status: planStatus // Preserve yearly status
        })
      });

      if (!saveRes.ok) {
        throw new Error("Không thể lưu trạng thái kế hoạch tháng.");
      }

      // Display loading toast
      toast.info("Đang xử lý", "Đang kết xuất bản PDF kế hoạch tháng và chuẩn bị gửi thông báo...");

      // 4. Wait a short moment to ensure React state renders the off-screen PDF component with updated monthlyPlanData
      await new Promise(resolve => setTimeout(resolve, 600));

      // 5. Generate PDF Blob from the hidden print document
      const pdfBlob = await generatePDFBlob("monthly-plan-print-doc-hidden", {
        orientation: "portrait",
        scale: 2
      });

      // 6. Upload PDF file
      const file = new File(
        [pdfBlob],
        `Ke_hoach_MKT_thang_${selectedMonth}_${selectedYear}.pdf`,
        { type: "application/pdf" }
      );
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      if (!uploadRes.ok) {
        throw new Error("Không thể tải bản PDF kế hoạch tháng lên hệ thống.");
      }
      const uploadData = await uploadRes.json();
      const pdfUrl = window.location.origin + uploadData.url;

      // 7. Calculate total amount
      const totalProposedAmount = Object.values(activeProposal.items).reduce((sum, item: any) => sum + (item.proposedAmount || 0), 0) + (activeProposal.advReserve || 0);

      // 8. Submit approval via API (creates ApprovalRequest & sends notifications)
      const submitRes = await fetch("/api/plan-finance/master-plan/submit-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: parseInt(selectedYear, 10),
          month: selectedMonth,
          pdfUrl,
          proposalCode: activeProposal.code,
          proposerName: activeProposal.proposerName,
          proposedAmount: totalProposedAmount,
          isYearly: false,
          isMonthlyPlan: true
        })
      });

      if (!submitRes.ok) {
        const errData = await submitRes.json();
        throw new Error(errData.error || "Gặp lỗi khi gửi trình duyệt kế hoạch tháng.");
      }

      // Sync local masterPlanData state
      setMasterPlanData(updatedPlanObj);
      
      toast.success(
        "Thành công",
        "Kế hoạch tháng đã được lưu, kết xuất PDF và tự động gửi thông báo phê duyệt đến Giám đốc cùng Trưởng phòng TC-KT thành công!"
      );
    } catch (err: any) {
      console.error("Lỗi trình duyệt kế hoạch tháng:", err);
      toast.error("Lỗi", err?.message || "Không thể gửi trình duyệt kế hoạch tháng.");
    } finally {
      setIsSubmittingMonthlyPlan(false);
    }
  };

  const handleSaveStep3Offcanvas = async () => {
    let updatedThemes = [...monthlyThemes];
    let updatedContentItems = { ...sectionContentItems };

    if (step3AddOffcanvasSection?.id === "theme_content") {
      if (!monthlyThemeTopic.trim() && !monthlyThemeContent.trim()) {
        if (editingThemeId) {
          updatedThemes = monthlyThemes.filter(t => t.id !== editingThemeId);
          setMonthlyThemes(updatedThemes);
        }
      } else {
        if (editingThemeId) {
          updatedThemes = monthlyThemes.map(t => t.id === editingThemeId ? { ...t, topic: monthlyThemeTopic, content: monthlyThemeContent, month: t.month || selectedMonth } : t);
          setMonthlyThemes(updatedThemes);
        } else {
          const newTheme = {
            id: Date.now().toString(),
            topic: monthlyThemeTopic,
            content: monthlyThemeContent,
            month: selectedMonth
          };
          updatedThemes = [...monthlyThemes, newTheme];
          setMonthlyThemes(updatedThemes);
        }
      }
      setEditingThemeId(null);
      setMonthlyThemeTopic("");
      setMonthlyThemeContent("");
    } else if (step3AddOffcanvasSection?.type === "section_header") {
      // Save content item for this section + month
      const sectionKey = `${step3AddOffcanvasSection.id}_${selectedMonth}`;
      const existingItems = updatedContentItems[sectionKey] || [];
      if (editingContentItemId) {
        updatedContentItems[sectionKey] = existingItems.map(item =>
          item.id === editingContentItemId
            ? {
              ...item,
              pillar: contentPillar,
              topic: contentTopic,
              weeks: contentWeeks.length > 0 ? [...contentWeeks].sort() : [1, 2, 3, 4],
              assignee: contentAssignee,
              budget: contentBudget,
              format: contentFormat,
              channel: contentChannel,
              details: contentDetails,
              isAds: contentIsAds,
              detailedTasks: tempDetailedTasks
            }
            : item
        );
      } else {
        const newItem = {
          id: Date.now().toString(),
          pillar: contentPillar,
          topic: contentTopic,
          weeks: contentWeeks.length > 0 ? [...contentWeeks].sort() : [1, 2, 3, 4],
          assignee: contentAssignee,
          budget: contentBudget,
          format: contentFormat,
          channel: contentChannel,
          details: contentDetails,
          isAds: contentIsAds,
          detailedTasks: tempDetailedTasks
        };
        updatedContentItems[sectionKey] = [...existingItems, newItem];
      }
      setSectionContentItems(updatedContentItems);
      setEditingContentItemId(null);
    }

    setShowStep3AddOffcanvas(false);
    setStep3AddOffcanvasSection(null);
    await handleSave(updatedThemes, undefined, undefined, updatedContentItems);
  };

  const handleEditHoliday = (holiday: any) => {
    setEditingHoliday(holiday);
    setNewHolidayName(holiday.name);

    const year = parseInt(selectedYear, 10) || 2026;
    const parts = holiday.dateStr.split("/");
    if (parts.length === 2) {
      const formattedDate = `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      setNewHolidayDate(formattedDate);
    } else {
      setNewHolidayDate("");
    }

    setShowHolidayModal(true);
  };

  const handleDeleteHoliday = async () => {
    if (!editingHoliday) return;
    const updatedHolidays = customHolidays.filter(h => !(
      h.dateStr === editingHoliday.dateStr &&
      h.name === editingHoliday.name &&
      h.weekNum === editingHoliday.weekNum &&
      h.month === editingHoliday.month
    ));
    setCustomHolidays(updatedHolidays);
    setShowHolidayModal(false);
    setEditingHoliday(null);
    setNewHolidayName("");
    setNewHolidayDate("");
    await handleSave(undefined, undefined, updatedHolidays);
  };

  const handleAddHoliday = async () => {
    if (!newHolidayName.trim()) {
      toast.error("Lỗi", "Vui lòng nhập tên ngày lễ");
      return;
    }
    if (!newHolidayDate) {
      toast.error("Lỗi", "Vui lòng chọn ngày lễ");
      return;
    }

    const dateObj = new Date(newHolidayDate);
    if (isNaN(dateObj.getTime())) {
      toast.error("Lỗi", "Ngày lễ không hợp lệ");
      return;
    }

    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;

    const dateStr = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;

    let weekNum = 1;
    if (day <= 7) weekNum = 1;
    else if (day <= 14) weekNum = 2;
    else if (day <= 21) weekNum = 3;
    else weekNum = 4;

    let updatedHolidays;
    if (editingHoliday) {
      const index = customHolidays.findIndex(h =>
        h.dateStr === editingHoliday.dateStr &&
        h.name === editingHoliday.name &&
        h.weekNum === editingHoliday.weekNum &&
        h.month === editingHoliday.month
      );
      if (index !== -1) {
        updatedHolidays = [...customHolidays];
        updatedHolidays[index] = { dateStr, name: newHolidayName.trim(), weekNum, month };
      } else {
        updatedHolidays = [...customHolidays, { dateStr, name: newHolidayName.trim(), weekNum, month }];
      }
    } else {
      updatedHolidays = [...customHolidays, { dateStr, name: newHolidayName.trim(), weekNum, month }];
    }

    setCustomHolidays(updatedHolidays);
    setShowHolidayModal(false);
    setEditingHoliday(null);
    setNewHolidayName("");
    setNewHolidayDate("");

    await handleSave(undefined, undefined, updatedHolidays);
  };

  const handleDeleteSelected = () => {
    const customToDelete = customStaffIds.filter(id => selectedStaffIds.includes(id));
    const baseToDelete = baseStaffConfigs.map(c => c.id).filter(id => selectedStaffIds.includes(id));

    if (customToDelete.length > 0) {
      setCustomStaffIds(prev => prev.filter(id => !selectedStaffIds.includes(id)));
    }
    if (baseToDelete.length > 0) {
      setDeletedBaseStaffIds(prev => [...prev, ...baseToDelete]);
    }
    setSelectedStaffIds([]);
  };

  const handleDeleteSelectedContentPlan = () => {
    setCustomContentPlanIds(prev => prev.filter(id => !selectedContentPlanIds.includes(id)));
    setSelectedContentPlanIds([]);
  };

  const getAdValues = (id: string) => {
    if (editedAdPlan[id]) {
      return {
        ...editedAdPlan[id],
        landingPage: editedAdPlan[id].landingPage ?? "",
        details: editedAdPlan[id].details ?? ""
      };
    }
    return {
      objective: "",
      topic: "",
      channel: "",
      content: "",
      landingPage: "",
      budget: 0,
      region: "",
      assignee: "",
      startDate: "",
      endDate: "",
      audience: "",
      details: ""
    };
  };

  const updateAdPlanField = (id: string, field: string, value: any) => {
    setEditedAdPlan((prev) => {
      const current = prev[id] || getAdValues(id);
      const updated = {
        ...current,
        [field]: field === "objective" ? value.toUpperCase() : value
      };

      return {
        ...prev,
        [id]: updated
      };
    });
  };
  const updateContentPlanField = (id: string, field: string, value: any) => {
    setEditedContentPlan((prev) => {
      const current: {
        pillar: string;
        details: string;
        budget: number;
        postsCount: number;
        ratioStr?: string;
        purpose?: string;
        role?: string;
      } = prev[id] || {
        pillar: baseContentPlan.find(r => r.id === id)?.pillar || "Tuyến nội dung mới",
        details: baseContentPlan.find(r => r.id === id)?.details || "Nội dung chi tiết...",
        budget: baseContentPlan.find(r => r.id === id)?.budget || 10000000,
        postsCount: baseContentPlan.find(r => r.id === id)?.postsCount || 5,
        ratioStr: undefined,
        purpose: baseContentPlan.find(r => r.id === id)?.purpose || "",
        role: baseContentPlan.find(r => r.id === id)?.role || ""
      };

      const updated = {
        ...current,
        [field]: value
      };

      if (field === "budget") {
        const valB = valBranding;
        const newRatio = valB > 0 ? (value / valB) * 100 : 0;
        updated.ratioStr = newRatio.toFixed(1).replace(".0", "");
      }

      return {
        ...prev,
        [id]: updated
      };
    });
  };

  const updateContentPlanRatio = (id: string, ratioStr: string) => {
    setEditedContentPlan((prev) => {
      const current: {
        pillar: string;
        details: string;
        budget: number;
        postsCount: number;
        ratioStr?: string;
        purpose?: string;
        role?: string;
      } = prev[id] || {
        pillar: baseContentPlan.find(r => r.id === id)?.pillar || "Tuyến nội dung mới",
        details: baseContentPlan.find(r => r.id === id)?.details || "Nội dung chi tiết...",
        budget: baseContentPlan.find(r => r.id === id)?.budget || 10000000,
        postsCount: baseContentPlan.find(r => r.id === id)?.postsCount || 5,
        ratioStr: undefined,
        purpose: baseContentPlan.find(r => r.id === id)?.purpose || "",
        role: baseContentPlan.find(r => r.id === id)?.role || ""
      };

      const parsedRatio = parseFloat(ratioStr.replace(",", ".")) || 0;
      const calculatedBudget = Math.round((parsedRatio / 100) * valBranding);

      return {
        ...prev,
        [id]: {
          ...current,
          ratioStr,
          budget: calculatedBudget
        }
      };
    });
  };

  const getDetailsAsPlainText = (detailsStr: string): string => {
    if (!detailsStr) return "";
    if (detailsStr === "Nội dung chi tiết...") return "";
    try {
      if (detailsStr.startsWith("{")) {
        const obj = JSON.parse(detailsStr);
        const parts: string[] = [];
        if (obj.description) {
          parts.push(obj.description);
        }
        if (Array.isArray(obj.children)) {
          obj.children.forEach((child: any) => {
            if (child.pillar) parts.push(child.pillar);
            if (child.details) parts.push(child.details);
          });
        }
        return parts.filter(Boolean).join("\n");
      }
      if (detailsStr.startsWith("[")) {
        const parsed = JSON.parse(detailsStr);
        if (Array.isArray(parsed)) {
          return parsed.map((group: any) => {
            const lines = [group.con];
            if (Array.isArray(group.chau)) {
              lines.push(...group.chau);
            }
            return lines.filter(Boolean).join("\n");
          }).filter(Boolean).join("\n");
        }
      }
    } catch (e) { }
    return detailsStr;
  };

  interface ChildRowItem {
    id: string;
    pillar: string;
    details: string;
    ratioStr?: string;
    postsCount?: number;
    channel?: string;
    landingPage?: string;
    budget?: number;
    startDate?: string;
    endDate?: string;
    objective?: string;
  }
  interface ParentDetails {
    description: string;
    children: ChildRowItem[];
  }

  const parseParentDetails = (detailsStr: string): ParentDetails => {
    let description = "";
    let children: ChildRowItem[] = [];

    if (!detailsStr) return { description, children };
    if (detailsStr === "Nội dung chi tiết...") return { description: "Nội dung chi tiết...", children };

    try {
      if (detailsStr.startsWith("{")) {
        const obj = JSON.parse(detailsStr);
        description = obj.description || "";
        if (Array.isArray(obj.children)) {
          children = obj.children;
        } else if (Array.isArray(obj.groups)) {
          // Fallback for previous groups format
          children = obj.groups.map((g: any, idx: number) => ({
            id: g.id || `g_${Date.now()}_${idx}`,
            pillar: g.con || "",
            details: Array.isArray(g.chau) ? g.chau.join("\n") : (g.chau || "")
          }));
        }
      } else if (detailsStr.startsWith("[")) {
        const raw = JSON.parse(detailsStr);
        if (Array.isArray(raw)) {
          children = raw.map((g: any, idx: number) => ({
            id: g.id || `g_${Date.now()}_${idx}`,
            pillar: g.con || "",
            details: Array.isArray(g.chau) ? g.chau.join("\n") : (g.chau || "")
          }));
        }
      } else {
        description = detailsStr;
      }
    } catch (e) {
      description = detailsStr;
    }
    return { description, children };
  };

  const handleEditRowClick = (id: string, focusField?: "details") => {
    const row = contentPlanList.find(r => r.id === id);
    if (!row) return;

    const edited = editedContentPlan[id];
    const budgetVal = edited ? edited.budget : row.budget;
    const ratioVal = valBranding > 0 ? (budgetVal / valBranding) * 100 : 0;
    const ratioStrVal = edited?.ratioStr !== undefined
      ? edited.ratioStr
      : (ratioVal > 0 ? ratioVal.toFixed(2).replace(/\.?0+$/, "") : "0");

    setOffcanvasData({
      pillar: edited ? edited.pillar : row.pillar,
      purpose: edited ? (edited.purpose || "") : (row.purpose || ""),
      role: edited ? (edited.role || "") : (row.role || ""),
      details: parseParentDetails(edited ? edited.details : row.details).description,
      budget: budgetVal,
      ratioStr: ratioStrVal,
      postsCount: edited ? edited.postsCount : row.postsCount
    });

    setEditingContentPlanId(id);
    setShowAddOffcanvas(true);

    if (focusField === "details") {
      setTimeout(() => {
        const detailsEl = document.getElementById("offcanvas-details-input");
        if (detailsEl) {
          detailsEl.focus();
        }
      }, 100);
    } else {
      setTimeout(() => {
        const pillarEl = document.getElementById("offcanvas-pillar-input");
        if (pillarEl) {
          pillarEl.focus();
          (pillarEl as HTMLInputElement).select();
        }
      }, 100);
    }
  };

  const handleDeleteRowClick = (id: string) => {
    setRowIdToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (rowIdToDelete) {
      if (rowIdToDelete.includes("_child_")) {
        const parts = rowIdToDelete.split("_child_");
        const parentId = parts[0];
        const childId = parts[1];

        setEditedContentPlan(prev => {
          const parentRow = contentPlanList.find(r => r.id === parentId);
          const currentDetails = prev[parentId]?.details ?? parentRow?.details ?? "";
          const { description, children } = parseParentDetails(currentDetails);
          const updatedChildren = children.filter(c => c.id !== childId);

          const serialized = JSON.stringify({
            description,
            children: updatedChildren
          });

          return {
            ...prev,
            [parentId]: {
              ...prev[parentId],
              details: serialized
            }
          };
        });
        toast.success("Thành công", "Đã xóa nội dung chi tiết!");
      } else {
        setCustomContentPlanIds(prev => prev.filter(rowId => rowId !== rowIdToDelete));
        setEditedContentPlan(prev => {
          const copy = { ...prev };
          delete copy[rowIdToDelete];
          return copy;
        });
        toast.success("Thành công", "Đã xóa tuyến nội dung!");
      }
    }
    setConfirmDeleteOpen(false);
    setRowIdToDelete(null);
  };

  const handleSaveDetails = () => {
    if (!detailsParentId) return;

    setEditedContentPlan(prev => {
      const parentRow = contentPlanList.find(r => r.id === detailsParentId);
      const currentDetails = prev[detailsParentId]?.details ?? parentRow?.details ?? "";
      const { description, children } = parseParentDetails(currentDetails);

      let updatedChildren = [...children];
      if (editingChildId) {
        updatedChildren = updatedChildren.map(c =>
          c.id === editingChildId
            ? {
              ...c,
              pillar: childRowPillar.trim(),
              details: childRowDetails.trim(),
              ratioStr: childRowRatioStr.trim(),
              postsCount: childRowPostsCount !== "" ? Number(childRowPostsCount) : undefined
            }
            : c
        );
      } else {
        updatedChildren.push({
          id: `child_${Date.now()}`,
          pillar: childRowPillar.trim(),
          details: childRowDetails.trim(),
          ratioStr: childRowRatioStr.trim(),
          postsCount: childRowPostsCount !== "" ? Number(childRowPostsCount) : undefined
        });
      }

      const serialized = JSON.stringify({
        description,
        children: updatedChildren
      });

      return {
        ...prev,
        [detailsParentId]: {
          ...(prev[detailsParentId] || {
            pillar: parentRow?.pillar || "Tuyến nội dung mới",
            budget: parentRow?.budget || 10000000,
            postsCount: parentRow?.postsCount || 5,
            purpose: parentRow?.purpose || "",
            role: parentRow?.role || ""
          }),
          details: serialized
        }
      };
    });

    toast.success("Thành công", editingChildId ? "Đã cập nhật nội dung chi tiết!" : "Đã thêm nội dung chi tiết mới!");
    setShowDetailsOffcanvas(false);
    setDetailsParentId(null);
    setEditingChildId(null);
    setChildRowPillar("");
    setChildRowDetails("");
    setChildRowRatioStr("");
    setChildRowPostsCount("");
  };

  const handleSaveAdDetails = () => {
    if (!adDetailsParentId) return;

    setEditedAdPlan(prev => {
      const parentRow = adPlanList.find(r => r.id === adDetailsParentId);
      const currentDetails = prev[adDetailsParentId]?.details ?? parentRow?.details ?? "";
      const { description, children } = parseParentDetails(currentDetails);

      let updatedChildren = [...children];
      const budgetNum = Number(adChildRowBudgetStr.replace(/\D/g, "")) || 0;
      if (adEditingChildId) {
        updatedChildren = updatedChildren.map(c =>
          c.id === adEditingChildId
            ? {
              ...c,
              pillar: adChildRowPillar.trim(),
              details: adChildRowDetails.trim(),
              budget: budgetNum,
              channel: adChildRowChannel.trim(),
              landingPage: adChildRowLandingPage.trim()
            }
            : c
        );
      } else {
        updatedChildren.push({
          id: `child_${Date.now()}`,
          pillar: adChildRowPillar.trim(),
          details: adChildRowDetails.trim(),
          budget: budgetNum,
          channel: adChildRowChannel.trim(),
          landingPage: adChildRowLandingPage.trim()
        });
      }

      const serialized = JSON.stringify({
        description,
        children: updatedChildren
      });

      return {
        ...prev,
        [adDetailsParentId]: {
          ...(prev[adDetailsParentId] || getAdValues(adDetailsParentId)),
          details: serialized
        }
      };
    });

    toast.success("Thành công", adEditingChildId ? "Đã cập nhật nội dung chi tiết!" : "Đã thêm nội dung chi tiết mới!");
    setShowAdDetailsOffcanvas(false);
    setAdDetailsParentId(null);
    setAdEditingChildId(null);
    setAdChildRowPillar("");
    setAdChildRowDetails("");
    setAdChildRowBudgetStr("");
    setAdChildRowChannel("");
    setAdChildRowLandingPage("");
  };

  const updateParentDescription = (id: string, newDesc: string) => {
    setEditedContentPlan((prev) => {
      const parentRow = contentPlanList.find(r => r.id === id);
      const currentDetails = prev[id]?.details ?? parentRow?.details ?? "";
      const { children } = parseParentDetails(currentDetails);

      const serialized = JSON.stringify({
        description: newDesc,
        children
      });

      return {
        ...prev,
        [id]: {
          ...(prev[id] || {
            pillar: parentRow?.pillar || "Tuyến nội dung mới",
            budget: parentRow?.budget || 10000000,
            postsCount: parentRow?.postsCount || 5,
            purpose: parentRow?.purpose || "",
            role: parentRow?.role || ""
          }),
          details: serialized
        }
      };
    });
  };

  const filterNonDbProducts = (raw: any, categoriesList: any[]) => {
    if (!raw) return {};
    if (categoriesList.length === 0) return raw;
    const dbNames = categoriesList.map(c => typeof c === "string" ? c : c.name || "");
    const cleaned: any = {};
    for (const m in raw) {
      cleaned[m] = {};
      for (const w in raw[m]) {
        const list: string[] = raw[m][w] || [];
        cleaned[m][w] = list.filter((p: string) => dbNames.includes(p));
      }
    }
    return cleaned;
  };

  useEffect(() => {
    if (masterPlanData) {
      setBrandingCost(masterPlanData.mkt_brandingCost !== undefined ? masterPlanData.mkt_brandingCost : null);
      setTravelCost(masterPlanData.mkt_travelCost !== undefined ? masterPlanData.mkt_travelCost : null);
      setEditedStaff(masterPlanData.mkt_editedStaff !== undefined ? masterPlanData.mkt_editedStaff : {});
      setCustomStaffIds(masterPlanData.mkt_customStaffIds !== undefined ? masterPlanData.mkt_customStaffIds : []);
      setDeletedBaseStaffIds(masterPlanData.mkt_deletedBaseStaffIds !== undefined ? masterPlanData.mkt_deletedBaseStaffIds : []);
      setEditedContentPlan(masterPlanData.mkt_editedContentPlan !== undefined ? masterPlanData.mkt_editedContentPlan : {});
      setCustomContentPlanIds(masterPlanData.mkt_customContentPlanIds !== undefined ? masterPlanData.mkt_customContentPlanIds : []);
      setEditedAdPlan(masterPlanData.mkt_editedAdPlan !== undefined ? masterPlanData.mkt_editedAdPlan : {});
      setCustomAdPlanIds(masterPlanData.mkt_customAdPlanIds !== undefined ? masterPlanData.mkt_customAdPlanIds : []);
      setEditedWeeklyAssign(masterPlanData.mkt_editedWeeklyAssign !== undefined ? masterPlanData.mkt_editedWeeklyAssign : {});
      setCustomHolidays(masterPlanData.mkt_customHolidays !== undefined ? masterPlanData.mkt_customHolidays : []);
      setAgencyPOSBudget(Number(masterPlanData.mkt_agencyPOSBudget) || 0);
      setAgencyAdsBudget(Number(masterPlanData.mkt_agencyAdsBudget) || 0);
      setAgencyGiftBudget(Number(masterPlanData.mkt_agencyGiftBudget) || 0);
      setAdvFbAds(Number(masterPlanData.mkt_advFbAds) || 0);
      setAdvGoogleAds(Number(masterPlanData.mkt_advGoogleAds) || 0);
      setAdvYoutubeAds(Number(masterPlanData.mkt_advYoutubeAds) || 0);
      setAdvTiktokAds(Number(masterPlanData.mkt_advTiktokAds) || 0);
      setAdvSeoPr(Number(masterPlanData.mkt_advSeoPr) || 0);
      setAdvPrintOutsource(Number(masterPlanData.mkt_advPrintOutsource) || 0);
      setAdvMediaModelDecor(Number(masterPlanData.mkt_advMediaModelDecor) || 0);
      setAdvWebDesign(Number(masterPlanData.mkt_advWebDesign) || 0);
      setAdvOther(Number(masterPlanData.mkt_advOther) || 0);
      setAdvReserve(Number(masterPlanData.mkt_advReserve) || 0);

      const rawProducts = masterPlanData.mkt_monthlyProducts !== undefined ? masterPlanData.mkt_monthlyProducts : {};
      if (productCategories.length > 0) {
        const cleaned = filterNonDbProducts(rawProducts, productCategories);
        setMonthlyProducts(cleaned);
      } else {
        setMonthlyProducts(rawProducts);
      }

      setMonthlyThemeTopic(masterPlanData.mkt_monthlyThemeTopic !== undefined ? masterPlanData.mkt_monthlyThemeTopic : "");
      setMonthlyThemeContent(masterPlanData.mkt_monthlyThemeContent !== undefined ? masterPlanData.mkt_monthlyThemeContent : "");
      if (masterPlanData.mkt_monthlyThemes !== undefined) {
        setMonthlyThemes(masterPlanData.mkt_monthlyThemes);
      } else if (masterPlanData.mkt_monthlyThemeTopic || masterPlanData.mkt_monthlyThemeContent) {
        setMonthlyThemes([{
          id: "legacy",
          topic: masterPlanData.mkt_monthlyThemeTopic || "",
          content: masterPlanData.mkt_monthlyThemeContent || ""
        }]);
      } else {
        setMonthlyThemes([]);
      }
      if (masterPlanData.mkt_sectionContentItems !== undefined) {
        setSectionContentItems(masterPlanData.mkt_sectionContentItems);
      } else {
        setSectionContentItems({});
      }
      setMonthlyAllocations(masterPlanData.mkt_monthlyAllocations !== undefined ? masterPlanData.mkt_monthlyAllocations : {});
    } else {
      setBrandingCost(null);
      setTravelCost(null);
      setEditedStaff({});
      setCustomStaffIds([]);
      setDeletedBaseStaffIds([]);
      setEditedContentPlan({});
      setCustomContentPlanIds([]);
      setEditedAdPlan({});
      setCustomAdPlanIds([]);
      setEditedWeeklyAssign({});
      setCustomHolidays([]);
      setAgencyPOSBudget(0);
      setAgencyAdsBudget(0);
      setAgencyGiftBudget(0);
      setAdvFbAds(0);
      setAdvGoogleAds(0);
      setAdvYoutubeAds(0);
      setAdvTiktokAds(0);
      setAdvSeoPr(0);
      setAdvPrintOutsource(0);
      setAdvMediaModelDecor(0);
      setAdvWebDesign(0);
      setAdvOther(0);
      setAdvReserve(0);
      setMonthlyProducts({});
      setMonthlyThemeTopic("");
      setMonthlyThemeContent("");
      setMonthlyThemes([]);
      setSectionContentItems({});
      setMonthlyAllocations({});
    }
    setSelectedStaffIds([]);
    setSelectedContentPlanIds([]);
    setShowAddOffcanvas(false);
    setNewlyAddedId(null);
  }, [masterPlanData]);

  useEffect(() => {
    if (masterPlanData) {
      const existingPlan = masterPlanData.mkt_monthly_plans?.[selectedMonth];
      if (existingPlan) {
        setMonthlyPlanData(existingPlan);
      } else {
        // Auto-generate items list from the current month's content items including subtasks and zero-budget items
        const computedItems: Record<string, any> = {};
        let itemIdx = 1;
        const sectionIds = ["section_content", "section_media", "section_design", "section_seo", "section_adv", "section_pos"];
        
        sectionIds.forEach(secId => {
          const list = sectionContentItems[`${secId}_${selectedMonth}`] || [];
          list.forEach(item => {
            const bVal = parseFloat(String(item.budget || "0").replace(/\./g, "").replace(/[^0-9.-]+/g, ""));
            const label = item.topic || item.pillar || `Chi phí ${secId}`;
            
            // Map detailedTasks to subTasks
            const subTasksList = (item.detailedTasks || []).map((t: any, subIdx: number) => {
              let subDesc = "";
              if (secId === "section_content") {
                const fmt = ["Video", "Hình ảnh", "Bài viết"].includes(t.assignee) ? t.assignee : "Video";
                const channels = t.deadline ? t.deadline : "";
                const assign = item.assignee || "Chu Thị Hằng";
                const weeksStr = item.weeks && item.weeks.length > 0 ? `Tuần ${item.weeks.join(", ")}` : "";
                subDesc = `Định dạng: ${fmt}${channels ? ` | Kênh: ${channels}` : ""}${assign ? ` | Người thực hiện: ${assign}` : ""}${weeksStr ? ` | Thời gian thực hiện: ${weeksStr}` : ""}`;
              } else {
                const assign = t.assignee || item.assignee || "";
                const dl = t.deadline ? t.deadline.split("-").reverse().slice(0, 2).join("/") : "";
                subDesc = `${assign ? `Người thực hiện: ${assign}` : ""}${dl ? ` | Thời gian thực hiện: Hạn ${dl}` : ""}`;
              }

              return {
                id: t.id || `sub_${item.id || itemIdx}_${subIdx}`,
                label: t.name || "Nội dung con",
                proposedAmount: 0,
                description: subDesc,
                notes: ""
              };
            });

            computedItems[`task_auto_${item.id || itemIdx++}`] = {
              label,
              proposedAmount: bVal || 0,
              description: item.details || (secId === "section_content" ? `Tuyến: ${item.pillar || "N/A"}. Người thực hiện: ${item.assignee || "N/A"}` : `Kênh: ${item.channel || "N/A"}. Người thực hiện: ${item.assignee || "N/A"}`),
              notes: item.notes || "",
              subTasks: subTasksList,
              secId: secId
            };
          });
        });

        if (Object.keys(computedItems).length === 0) {
          const monthlyTotal = monthlyBudgets[selectedMonth] || 0;
          computedItems["task_default_general"] = {
            label: `KẾ HOẠCH CHI PHÍ MARKETING THÁNG ${selectedMonth}/${selectedYear}`.toUpperCase(),
            proposedAmount: monthlyTotal,
            description: `Kinh phí hoạt động Marketing tháng ${selectedMonth}/${selectedYear}`,
            notes: "",
            subTasks: []
          };
        }

        setMonthlyPlanData({
          proposerName: marketingManagerName,
          approverName: directorName,
          date: new Date().toLocaleDateString("vi-VN"),
          purpose: `Lập kế hoạch marketing tháng ${selectedMonth}/${selectedYear}`,
          notes: "",
          code: `KH-MKT-${selectedMonth.toString().padStart(2, "0")}${selectedYear}-${Math.floor(1000 + Math.random() * 9000)}`,
          department: "Phòng Marketing",
          items: computedItems,
          advReserve: 0,
          status: "draft"
        });
      }
    }
  }, [masterPlanData, selectedMonth, marketingManagerName, directorName, sectionContentItems, monthlyBudgets, selectedYear]);

  useEffect(() => {
    if (!isEditing) {
      setSelectedStaffIds([]);
      setSelectedContentPlanIds([]);
    }
  }, [isEditing]);

  useEffect(() => {
    if (showStep3AddOffcanvas && !editingContentItemId) {
      setContentPillar("");
      setContentTopic("");
      setContentFormat("");
      setContentChannel("");
      setContentWeeks([]);

      let defaultAssignee = "Chu Thị Hằng";
      const secId = step3AddOffcanvasSection?.id;
      if (secId === "section_media") {
        defaultAssignee = "Nguyễn Lan Nhi";
      } else if (secId === "section_design") {
        defaultAssignee = "Hoàng Thanh Tú";
      } else if (secId === "section_seo" || secId === "section_adv") {
        defaultAssignee = "Nguyễn Quốc Việt";
      } else if (secId === "section_pos") {
        defaultAssignee = "Nguyễn Thu Huyền";
      }
      setContentAssignee(defaultAssignee);

      setContentBudget("");
      setContentDetails("");
      setContentIsAds(false);
    }
  }, [showStep3AddOffcanvas, editingContentItemId, step3AddOffcanvasSection]);

  useEffect(() => {
    if (!showStep3AddOffcanvas) {
      setEditingThemeId(null);
      setEditingContentItemId(null);
      setMonthlyThemeTopic("");
      setMonthlyThemeContent("");
    }
  }, [showStep3AddOffcanvas]);

  useEffect(() => {
    const fetchMasterPlan = async () => {
      setLoadingMasterPlan(true);
      try {
        const res = await fetch(`/api/plan-finance/master-plan?year=${selectedYear}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.plan) {
            const parsed = JSON.parse(data.plan.planData);
            setMasterPlanData(parsed);
            setPlanStatus(data.plan.status || "draft");
            if (parsed && parsed.mkt_monthlyBudgets) {
              setMonthlyBudgets(parsed.mkt_monthlyBudgets);
            } else {
              setMonthlyBudgets({});
            }
          } else {
            setMasterPlanData(null);
            setMonthlyBudgets({});
            setPlanStatus("draft");
          }
        } else {
          setMasterPlanData(null);
          setMonthlyBudgets({});
          setPlanStatus("draft");
        }
      } catch (err) {
        console.error("Lỗi khi tải MasterPlan:", err);
        setMasterPlanData(null);
        setMonthlyBudgets({});
      } finally {
        setLoadingMasterPlan(false);
      }
    };
    fetchMasterPlan();
  }, [selectedYear]);

  useEffect(() => {
    fetch("/api/seajong/categories")
      .then(r => r.json())
      .then(data => {
        let cats: any[] = [];
        if (Array.isArray(data)) cats = data;
        else if (data.categories) cats = data.categories;
        else if (data.data) cats = data.data;

        setProductCategories(cats);

        if (cats.length > 0) {
          const dbNames = cats.map(c => typeof c === "string" ? c : c.name || "");
          setMonthlyProducts(prev => {
            const cleaned: any = {};
            for (const m in prev) {
              cleaned[m] = {};
              for (const w in prev[m]) {
                const list: string[] = prev[m][w] || [];
                const filtered = list.filter((p: string) => dbNames.includes(p));
                cleaned[m][w] = filtered;
              }
            }
            return cleaned;
          });
        }
      })
      .catch(console.error);
  }, []);

  const valAgent = Number(masterPlanData?.revenueAgent) || 0;
  const valAgentDev = Number(masterPlanData?.revenueAgentDev) || 0;
  const valTraditional = Number(masterPlanData?.revenueTraditional) || 0;
  const valEcommerce = Number(masterPlanData?.revenueEcommerce) || 0;

  const totalRevenue = valAgent + valAgentDev + valTraditional + valEcommerce;

  const getRatio = (val: number) => {
    if (totalRevenue <= 0) return 0;
    return (val / totalRevenue) * 100;
  };

  const isCalculateByRevenue = masterPlanData?.isCalculateByRevenue ?? false;
  const valMarketingCost = isCalculateByRevenue
    ? Math.round(totalRevenue * (Number(masterPlanData?.costMarketingPercent) || 0) / 100)
    : (Number(masterPlanData?.costMarketing) || 0);

  const s2_calcByRev = masterPlanData?.s2_calcByRev ?? false;
  const getCostValue = (id: string, defaultVal: number) => {
    const list = masterPlanData?.mktCosts || [];
    const item = list.find((i: any) => i.id === id);

    let pctVal = 0;
    let valStr = "";

    if (item) {
      pctVal = Number(item.pctVal) || 0;
      valStr = String(item.val || "");
    } else {
      if (id === "mkt_1") {
        pctVal = Number(masterPlanData?.c_mkt_ads_pct) || 0;
        valStr = String(masterPlanData?.c_mkt_ads || "");
      } else if (id === "mkt_2") {
        pctVal = Number(masterPlanData?.c_mkt_events_pct) || 0;
        valStr = String(masterPlanData?.c_mkt_events || "");
      } else if (id === "mkt_3") {
        pctVal = Number(masterPlanData?.c_mkt_print_pct) || 0;
        valStr = String(masterPlanData?.c_mkt_print || "");
      }
    }

    if (s2_calcByRev) {
      return Math.round(totalRevenue * pctVal / 100);
    } else {
      const cleanVal = valStr.replace(/\D/g, "");
      return cleanVal ? (Number(cleanVal) || defaultVal) : defaultVal;
    }
  };

  interface SalaryTargetItem {
    id: string;
    stt?: string;
    name: string;
    basic: number;
    perf: number;
    allowance: number;
    qty: number;
    fund: number;
    isTotal?: boolean;
  }

  const getInitialStaffValues = (id: string) => {
    let defaultLabel = "";
    let defaultSalary = 0;
    let defaultQty = 0;
    if (id === "mkt_s1") { defaultLabel = "Trưởng phòng"; defaultSalary = 35000000; defaultQty = 1; }
    else if (id === "mkt_s2") { defaultLabel = "SEO"; defaultSalary = 15000000; defaultQty = 4; }
    else if (id === "mkt_s3") { defaultLabel = "Design"; defaultSalary = 15000000; defaultQty = 5; }
    else if (id === "mkt_s4") { defaultLabel = "Content Media"; defaultSalary = 12000000; defaultQty = 6; }
    else if (id === "mkt_s5") { defaultLabel = "Editor video"; defaultSalary = 12000000; defaultQty = 4; }

    const list = masterPlanData?.mktStaff || [];
    const item = list.find((i: any) => i.id === id);

    let qty = defaultQty;
    let totalMonthly = defaultSalary;

    if (item) {
      qty = Number(item.qty) || 0;
      totalMonthly = Number(String(item.salary || "").replace(/\D/g, "")) || 0;
    } else {
      if (id === "mkt_s1") {
        qty = Number(masterPlanData?.s3_mkt_1) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_1_inc || "").replace(/\D/g, "")) || defaultSalary;
      } else if (id === "mkt_s2") {
        qty = Number(masterPlanData?.s3_mkt_2) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_2_inc || "").replace(/\D/g, "")) || defaultSalary;
      } else if (id === "mkt_s3") {
        qty = Number(masterPlanData?.s3_mkt_3) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_3_inc || "").replace(/\D/g, "")) || defaultSalary;
      } else if (id === "mkt_s4") {
        qty = Number(masterPlanData?.s3_mkt_4) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_4_inc || "").replace(/\D/g, "")) || defaultSalary;
      } else if (id === "mkt_s5") {
        qty = Number(masterPlanData?.s3_mkt_5) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_5_inc || "").replace(/\D/g, "")) || defaultSalary;
      }
    }

    let basic = 0;
    let perf = 0;
    let allowance = 0;

    if (id === "mkt_s1") {
      basic = 29000000;
      perf = 5000000;
      allowance = 1000000;
      if (totalMonthly !== 35000000 && totalMonthly > 0) {
        perf = Math.round(totalMonthly * 0.142857);
        allowance = Math.round(totalMonthly * 0.02857);
        basic = totalMonthly - perf - allowance;
      }
    } else {
      allowance = Math.round(totalMonthly * 0.05);
      perf = Math.round(totalMonthly * 0.15);
      basic = totalMonthly - perf - allowance;
    }

    return {
      name: defaultLabel,
      basic,
      perf,
      allowance,
      qty
    };
  };

  const updateStaffField = (id: string, field: string, value: any) => {
    setEditedStaff((prev) => {
      const current = prev[id] || getInitialStaffValues(id);
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const getStaffValues = (id: string, label: string, defaultSalary: number, defaultQty: number) => {
    if (editedStaff[id]) {
      const est = editedStaff[id];
      const totalMonthly = est.basic + est.perf + est.allowance;
      const fund = totalMonthly * est.qty * 12;
      return {
        name: est.name,
        basic: est.basic,
        perf: est.perf,
        allowance: est.allowance,
        qty: est.qty,
        fund
      };
    }

    const list = masterPlanData?.mktStaff || [];
    const item = list.find((i: any) => i.id === id);

    let qty = defaultQty;
    let totalMonthly = defaultSalary;

    if (item) {
      qty = Number(item.qty) || 0;
      totalMonthly = Number(String(item.salary || "").replace(/\D/g, "")) || 0;
    } else {
      if (id === "mkt_s1") {
        qty = Number(masterPlanData?.s3_mkt_1) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_1_inc || "").replace(/\D/g, "")) || defaultSalary;
      } else if (id === "mkt_s2") {
        qty = Number(masterPlanData?.s3_mkt_2) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_2_inc || "").replace(/\D/g, "")) || defaultSalary;
      } else if (id === "mkt_s3") {
        qty = Number(masterPlanData?.s3_mkt_3) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_3_inc || "").replace(/\D/g, "")) || defaultSalary;
      } else if (id === "mkt_s4") {
        qty = Number(masterPlanData?.s3_mkt_4) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_4_inc || "").replace(/\D/g, "")) || defaultSalary;
      } else if (id === "mkt_s5") {
        qty = Number(masterPlanData?.s3_mkt_5) || defaultQty;
        totalMonthly = Number(String(masterPlanData?.s3_mkt_5_inc || "").replace(/\D/g, "")) || defaultSalary;
      }
    }

    let basic = 0;
    let perf = 0;
    let allowance = 0;

    if (id === "mkt_s1") {
      basic = 29000000;
      perf = 5000000;
      allowance = 1000000;
      if (totalMonthly !== 35000000 && totalMonthly > 0) {
        perf = Math.round(totalMonthly * 0.142857);
        allowance = Math.round(totalMonthly * 0.02857);
        basic = totalMonthly - perf - allowance;
      }
    } else {
      allowance = Math.round(totalMonthly * 0.05);
      perf = Math.round(totalMonthly * 0.15);
      basic = totalMonthly - perf - allowance;
    }

    const fund = totalMonthly * qty * 12;

    return {
      name: label,
      basic,
      perf,
      allowance,
      qty,
      fund
    };
  };

  const baseStaffConfigs: { id: string, label: string, defaultSalary: number, defaultQty: number }[] = [];

  const staffList = baseStaffConfigs
    .filter(cfg => !deletedBaseStaffIds.includes(cfg.id))
    .map(cfg => {
      return {
        id: cfg.id,
        ...getStaffValues(cfg.id, cfg.label, cfg.defaultSalary, cfg.defaultQty)
      };
    });

  const customStaffList = customStaffIds.map(id => {
    return {
      id,
      ...getStaffValues(id, "Vị trí mới", 10000000, 1)
    };
  });

  const allStaff = [...staffList, ...customStaffList];

  const totalQty = allStaff.reduce((sum, item) => sum + item.qty, 0);
  const totalFund = allStaff.reduce((sum, item) => sum + item.fund, 0);

  const salaryRows: SalaryTargetItem[] = [
    ...allStaff.map((item, idx) => ({
      id: item.id,
      stt: String(idx + 1),
      name: item.name,
      basic: item.basic,
      perf: item.perf,
      allowance: item.allowance,
      qty: item.qty,
      fund: item.fund
    })),
    { id: "s_sum", name: "Tổng cộng", basic: 0, perf: 0, allowance: 0, qty: totalQty, fund: totalFund, isTotal: true }
  ];

  const valBranding = brandingCost !== null ? brandingCost : getCostValue("mkt_1", 0);
  const valSalaryBonus = totalFund;
  const valTravel = travelCost !== null ? travelCost : getCostValue("mkt_3", 0);
  const totalCostMarketing = valBranding + valSalaryBonus + valTravel;

  interface BudgetTargetItem {
    id: string;
    stt?: string;
    name: string;
    value: number;
    ratio: number;
    isTotal?: boolean;
    isFullWidth?: boolean;
    fullWidthContent?: string;
  }

  const budgetColumns: TableColumn<BudgetTargetItem>[] = [
    {
      header: "STT",
      width: 42,
      align: "left",
      render: (row) => {
        if (row.isFullWidth) return "";
        return <span style={{ color: row.isTotal ? "inherit" : "var(--muted-foreground)", fontWeight: row.isTotal ? 700 : 400 }}>{row.stt}</span>;
      }
    },
    {
      header: "Khoản mục",
      align: "left",
      render: (row) => {
        return <span style={{ fontWeight: row.isTotal ? 700 : 400 }}>{row.name}</span>;
      }
    },
    {
      header: "Mục tiêu năm (đ)",
      align: "right",
      render: (row) => {
        if (row.isFullWidth) return null;
        const isEditable = isEditing && (row.id === "cp_1" || row.id === "cp_3");
        if (isEditable) {
          return (
            <input
              type="text"
              className="form-control form-control-sm text-end bg-transparent border-0 px-0 fw-semibold"
              value={row.value ? row.value.toLocaleString("vi-VN") : ""}
              onChange={(e) => {
                const val = Number(e.target.value.replace(/\D/g, "")) || 0;
                if (row.id === "cp_1") {
                  setBrandingCost(val);
                } else if (row.id === "cp_3") {
                  setTravelCost(val);
                }
              }}
              style={{ width: "100%", maxWidth: 130, height: 24, fontSize: 13, color: "var(--foreground)", outline: "none", boxShadow: "none" }}
            />
          );
        }
        const isOverBudget = row.id === "cp_sum" && totalCostMarketing > valMarketingCost;
        return (
          <span style={{ fontWeight: row.isTotal ? 700 : 400, display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end", width: "100%" }}>
            {isOverBudget && (
              <span
                title="Tổng chi phí vượt ngân sách được phân bổ!"
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  animation: "pulse-red 1.2s infinite"
                }}
              />
            )}
            <span>{row.value.toLocaleString("vi-VN")} đ</span>
          </span>
        );
      }
    },
    {
      header: "Tỷ lệ (%)",
      width: 72,
      align: "right",
      render: (row) => {
        if (row.isFullWidth) return null;
        return (
          <span style={{ fontWeight: row.isTotal ? 700 : 400, color: row.isTotal ? "var(--primary)" : "inherit" }}>
            {row.ratio.toFixed(1)}%
          </span>
        );
      }
    }
  ];

  const budgetRows: BudgetTargetItem[] = [
    { id: "dt", name: "Mục tiêu doanh thu", value: 0, ratio: 0, isFullWidth: true, fullWidthContent: "Mục tiêu doanh thu" },
    { id: "dt_sum", stt: "1", name: "Tổng doanh thu", value: totalRevenue, ratio: totalRevenue > 0 ? 100 : 0, isTotal: true },
    { id: "dt_1", stt: "1.1", name: "Doanh thu đại lý", value: valAgent, ratio: getRatio(valAgent) },
    { id: "dt_2", stt: "1.2", name: "Doanh thu phát triển đại lý", value: valAgentDev, ratio: getRatio(valAgentDev) },
    { id: "dt_3", stt: "1.3", name: "Doanh thu truyền thống", value: valTraditional, ratio: getRatio(valTraditional) },
    { id: "dt_4", stt: "1.4", name: "Doanh thu thương mại điện tử", value: valEcommerce, ratio: getRatio(valEcommerce) },
    { id: "cp", name: "Định mức chi phí", value: 0, ratio: 0, isFullWidth: true, fullWidthContent: `Định mức chi phí (Ngân sách được phân bổ: ${valMarketingCost.toLocaleString("vi-VN")} đồng)` },
    { id: "cp_sum", stt: "2", name: "Tổng chi phí", value: totalCostMarketing, ratio: getRatio(totalCostMarketing), isTotal: true },
    { id: "cp_1", stt: "2.1", name: "Chi phí Branding", value: valBranding, ratio: getRatio(valBranding) },
    { id: "cp_2", stt: "2.2", name: "Lương và thưởng", value: valSalaryBonus, ratio: getRatio(valSalaryBonus) },
    { id: "cp_3", stt: "2.3", name: "Công tác phí", value: valTravel, ratio: getRatio(valTravel) },
  ];

  const revenueChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "inherit",
      background: "transparent",
      animations: {
        enabled: true,
      },
    },
    labels: ["Đại lý", "Phát triển đại lý", "Truyền thống", "Thương mại điện tử"],
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#ec4899"],
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "center",
      fontSize: "11px",
      labels: {
        colors: "var(--foreground)",
      },
      markers: {
        offsetX: -2,
      },
      itemMargin: {
        horizontal: 8,
        vertical: 2,
      },
    },
    stroke: {
      show: false,
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "10px",
        fontWeight: "bold",
      },
      dropShadow: {
        enabled: false,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Tổng doanh thu",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--muted-foreground)",
              formatter: () => {
                return (totalRevenue / 1e9).toFixed(1) + " tỷ";
              },
            },
            value: {
              show: true,
              fontSize: "13px",
              fontWeight: "bold",
              color: "var(--foreground)",
              formatter: (val: string) => {
                const num = Number(val) || 0;
                return (num / 1e9).toFixed(1) + " tỷ";
              },
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => {
          return val.toLocaleString("vi-VN") + " đ";
        },
      },
    },
  };

  const contentPlanList = [
    ...baseContentPlan.map(item => {
      const edited = editedContentPlan[item.id];
      return {
        id: item.id,
        pillar: edited ? edited.pillar : item.pillar,
        details: edited ? edited.details : item.details,
        budget: edited ? edited.budget : item.budget,
        postsCount: edited ? edited.postsCount : item.postsCount,
        purpose: edited ? edited.purpose : item.purpose,
        role: edited ? edited.role : item.role,
      };
    }),
    ...customContentPlanIds.map(id => {
      const edited = editedContentPlan[id];
      return {
        id,
        pillar: edited ? edited.pillar : "Tuyến nội dung mới",
        details: edited ? edited.details : "Nội dung chi tiết...",
        budget: edited ? edited.budget : 10000000,
        postsCount: edited ? edited.postsCount : 5,
        purpose: edited ? edited.purpose : "",
        role: edited ? edited.role : "",
      };
    })
  ];

  const totalPlanBudget = contentPlanList.reduce((sum, item) => sum + item.budget, 0);
  const totalPlanPosts = contentPlanList.reduce((sum, item) => sum + item.postsCount, 0);

  const contentPlanRows: ContentPlanItem[] = [
    { id: "cp_sum", pillar: "Tổng cộng", details: "", budget: totalPlanBudget, postsCount: totalPlanPosts, isTotal: true }
  ];

  const adPlanList = [
    ...baseAdPlanConfigs.map(item => {
      const val = getAdValues(item.id);
      const { children } = parseParentDetails(val.details || "");
      let parentBudget = val.budget;
      if (children.length > 0) {
        parentBudget = children.reduce((sum, child) => {
          const childRatio = parseFloat(child.ratioStr || "") || 0;
          const childBudget = child.budget !== undefined ? child.budget : (childRatio > 0 ? Math.round((childRatio / 100) * valBranding) : 0);
          return sum + childBudget;
        }, 0);
      }
      return {
        id: item.id,
        ...val,
        budget: parentBudget
      };
    }),
    ...customAdPlanIds.map(id => {
      const val = getAdValues(id);
      const { children } = parseParentDetails(val.details || "");
      let parentBudget = val.budget;
      if (children.length > 0) {
        parentBudget = children.reduce((sum, child) => {
          const childRatio = parseFloat(child.ratioStr || "") || 0;
          const childBudget = child.budget !== undefined ? child.budget : (childRatio > 0 ? Math.round((childRatio / 100) * valBranding) : 0);
          return sum + childBudget;
        }, 0);
      }
      return {
        id,
        ...val,
        budget: parentBudget
      };
    })
  ];

  const totalAdBudget = adPlanList.reduce((sum, item) => sum + item.budget, 0);

  const adPlanRows: AdPlanItem[] = [
    {
      id: "ad_sum",
      objective: "Tổng cộng",
      topic: "",
      channel: "",
      content: "",
      landingPage: "",
      budget: totalAdBudget,
      region: "",
      assignee: "",
      startDate: "",
      endDate: "",
      audience: "",
      isTotal: true
    }
  ];

  let adSttIdx = 1;
  adPlanList.forEach((parent) => {
    adPlanRows.push({
      ...parent,
      stt: String(adSttIdx++)
    });

    if (expandedAdParentIds.includes(parent.id)) {
      const { children } = parseParentDetails(parent.details || "");
      children.forEach((child) => {
        const childRatio = parseFloat(child.ratioStr || "") || 0;
        const childBudget = child.budget !== undefined ? child.budget : (childRatio > 0 ? Math.round((childRatio / 100) * valBranding) : 0);

        adPlanRows.push({
          id: `${parent.id}_child_${child.id}`,
          objective: child.pillar,
          topic: "",
          channel: child.channel || "",
          content: child.details,
          landingPage: child.landingPage || "",
          budget: childBudget,
          region: "",
          assignee: "",
          startDate: "",
          endDate: "",
          audience: "",
          isChildRow: true,
          parentId: parent.id,
          childId: child.id,
          stt: "",
          ratioStr: child.ratioStr || ""
        } as any);
      });
    }
  });

  const formatAdDate = (dStr: string) => {
    if (!dStr) return "";
    const parts = dStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  const adPlanColumns: TableColumn<AdPlanItem>[] = [
    {
      header: "STT",
      width: 40,
      align: "center",
      render: (row) => {
        if (row.isTotal) return "";
        return <span style={{ color: "var(--muted-foreground)" }}>{row.stt}</span>;
      }
    },
    {
      header: "Mục tiêu",
      width: 200,
      align: "left",
      render: (row) => {
        if (row.isTotal) return <strong>{row.objective}</strong>;

        if ((row as any).isChildRow) {
          return (
            <div style={{ display: "flex", flexDirection: "column", paddingLeft: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: "var(--foreground)" }}>
                <span className="text-muted">↳</span>
                <span>{row.objective}</span>
              </div>
              {row.channel && (
                <div style={{ paddingLeft: 14, marginTop: 4 }}>
                  <span 
                    className="badge rounded-pill"
                    style={{ 
                      fontSize: 10, 
                      fontWeight: 500, 
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      padding: "2px 6px"
                    }}
                  >
                    {row.channel}
                  </span>
                </div>
              )}
            </div>
          );
        }

        const hasDetails = row.topic || row.region || row.assignee || row.startDate || row.endDate || row.audience;

        const adChildrenCount = parseParentDetails(row.details || "").children.length;
        const hasAdChildren = adChildrenCount > 0;
        const isAdCollapsed = !expandedAdParentIds.includes(row.id);
        const toggleAdCollapse = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (isAdCollapsed) {
            setExpandedAdParentIds(prev => [...prev, row.id]);
          } else {
            setExpandedAdParentIds(prev => prev.filter(id => id !== row.id));
          }
        };

        return (
          <div className="d-flex flex-column py-1" style={{ fontSize: 12.5, lineHeight: "1.4" }}>
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                <div className="d-flex align-items-center gap-1.5">
                  {hasAdChildren ? (
                    <button
                      type="button"
                      onClick={toggleAdCollapse}
                      className="btn btn-link p-0 text-muted d-inline-flex align-items-center justify-content-center"
                      style={{ width: 16, height: 16, border: "none", background: "none", outline: "none", boxShadow: "none" }}
                    >
                      <i className={`bi ${isAdCollapsed ? "bi-chevron-right" : "bi-chevron-down"}`} style={{ fontSize: 12 }} />
                    </button>
                  ) : (
                    <div style={{ width: 16 }} />
                  )}
                  <div className="d-flex align-items-center" style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-transparent border-0 px-0 text-start text-uppercase fw-bold text-primary mb-0"
                      value={row.objective}
                      onChange={(e) => updateAdPlanField(row.id, "objective", e.target.value)}
                      style={{ flex: 1, height: 24, fontSize: 13, outline: "none", boxShadow: "none", textTransform: "uppercase", margin: 0, minWidth: 0 }}
                    />
                    {adChildrenCount > 0 && (
                      <span
                        className="badge rounded-pill"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                          color: "var(--primary)",
                          fontSize: "10px",
                          padding: "2px 6px",
                          fontWeight: 700,
                          marginLeft: "6px",
                          flexShrink: 0,
                          height: "18px",
                          minWidth: "18px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title={`${adChildrenCount} nội dung con`}
                      >
                        {adChildrenCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Merged channel input for parent row in edit mode */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, paddingLeft: 24, marginTop: 2 }}>
                  <span className="text-muted fw-semibold">Hình thức:</span>
                  <input
                    type="text"
                    className="form-control form-control-sm bg-transparent border-0 p-0 text-start fw-semibold text-secondary"
                    value={row.channel || ""}
                    onChange={(e) => updateAdPlanField(row.id, "channel", e.target.value)}
                    placeholder="Nhập hình thức..."
                    style={{ flex: 1, height: 18, fontSize: 11.5, color: "var(--foreground)", outline: "none", boxShadow: "none", borderBottom: "1px dashed var(--border)" }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div className="d-flex align-items-center gap-1.5">
                  {hasAdChildren ? (
                    <button
                      type="button"
                      onClick={toggleAdCollapse}
                      className="btn btn-link p-0 text-muted d-inline-flex align-items-center justify-content-center"
                      style={{ width: 16, height: 16, border: "none", background: "none", outline: "none", boxShadow: "none" }}
                    >
                      <i className={`bi ${isAdCollapsed ? "bi-chevron-right" : "bi-chevron-down"}`} style={{ fontSize: 12 }} />
                    </button>
                  ) : (
                    <div style={{ width: 16 }} />
                  )}
                  <div className="d-inline-flex align-items-center flex-wrap" style={{ gap: 6 }}>
                    <strong className="text-uppercase text-primary mb-0" style={{ fontSize: 13.5 }}>{row.objective}</strong>
                    {adChildrenCount > 0 && (
                      <span
                        className="badge rounded-pill"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                          color: "var(--primary)",
                          fontSize: "10px",
                          padding: "2px 6px",
                          fontWeight: 700,
                          height: "18px",
                          minWidth: "18px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title={`${adChildrenCount} nội dung con`}
                      >
                        {adChildrenCount}
                      </span>
                    )}
                  </div>
                </div>
                {row.channel && (
                  <div style={{ paddingLeft: 24, marginTop: 4 }}>
                    <span 
                      className="badge rounded-pill"
                      style={{ 
                        fontSize: 10.5, 
                        fontWeight: 600, 
                        backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                        color: "var(--primary)",
                        padding: "2.5px 7px"
                      }}
                    >
                      {row.channel}
                    </span>
                  </div>
                )}
              </div>
            )}

            {hasDetails && (
              <div
                className="py-1"
                style={{
                  marginTop: "2px",
                  fontSize: 11.5,
                  color: "var(--foreground)"
                }}
              >
                {row.topic && (
                  <div className="mb-1 d-flex align-items-center gap-1.5 flex-wrap">
                    <span className="text-muted fw-semibold">Chủ đề: </span>
                    <span
                      className="badge fw-semibold"
                      style={{
                        background: "#e0f2fe",
                        color: "#0369a1",
                        fontSize: "11px",
                        padding: "3px 8px",
                        borderRadius: "4px"
                      }}
                    >
                      {row.topic}
                    </span>
                  </div>
                )}
                {row.region && (
                  <div className="mb-1">
                    <span className="text-muted fw-semibold">Khu vực: </span>
                    <span>{row.region}</span>
                  </div>
                )}
                {row.assignee && (
                  <div className="mb-1">
                    <span className="text-muted fw-semibold">Người thực hiện: </span>
                    <span>{row.assignee}</span>
                  </div>
                )}
                {(row.startDate || row.endDate) && (
                  <div className="mb-1">
                    <span className="text-muted fw-semibold">Thời gian: </span>
                    <span>
                      {row.startDate ? formatAdDate(row.startDate) : ""}
                      {row.startDate && row.endDate ? " - " : ""}
                      {row.endDate ? formatAdDate(row.endDate) : ""}
                    </span>
                  </div>
                )}
                {row.audience && (
                  <div className="mt-1.5" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                    <div
                      className="d-flex align-items-center gap-1 cursor-pointer select-none"
                      onClick={() => {
                        setExpandedAdAudienceIds(prev =>
                          prev.includes(row.id)
                            ? prev.filter(id => id !== row.id)
                            : [...prev, row.id]
                        );
                      }}
                      style={{ fontSize: 11.5, color: "var(--primary, #0d6efd)", fontWeight: 600 }}
                    >
                      <span>Đối tượng tiếp cận</span>
                      <i className={`bi bi-chevron-${expandedAdAudienceIds.includes(row.id) ? "up" : "down"}`} style={{ fontSize: 10 }} />
                    </div>
                    {expandedAdAudienceIds.includes(row.id) && (
                      <div className="d-flex flex-column gap-1 mt-1" style={{ paddingLeft: 12, borderLeft: "2px solid var(--primary, #0d6efd)" }}>
                        {row.audience.split("\n").map(p => p.trim()).filter(Boolean).map((line, idx) => (
                          <div key={idx} className="d-flex align-items-start gap-1.5 text-secondary" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
                            <span style={{ color: "var(--primary)", fontSize: 12, marginRight: 2 }}>•</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Nội dung",
      align: "left",
      render: (row) => {
        if (row.isTotal) return "";

        if ((row as any).isChildRow) {
          const paragraphs = row.content ? row.content.split("\n").map(p => p.trim()).filter(Boolean) : [];
          if (paragraphs.length === 0) return "";
          return (
            <div className="d-flex flex-column gap-1">
              {paragraphs.map((item, idx) => (
                <div key={idx} className="d-flex align-items-start gap-2 text-secondary" style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--muted-foreground)" }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          );
        }

        if (isEditing) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-transparent border-0 px-0 text-start"
              value={row.content}
              onChange={(e) => updateAdPlanField(row.id, "content", e.target.value)}
              style={{ width: "100%", height: 24, fontSize: 13, color: "var(--foreground)", outline: "none", boxShadow: "none" }}
            />
          );
        }
        return <span>{row.content}</span>;
      }
    },
    {
      header: "Trang đích",
      width: 95,
      align: "left",
      render: (row) => {
        if (row.isTotal) return "";
        if ((row as any).isChildRow) {
          const pages = (row as any).landingPage ? (row as any).landingPage.split("\n").map((p: string) => p.trim()).filter(Boolean) : [];
          if (pages.length === 0) return "";
          return (
            <div className="d-flex flex-column gap-1" style={{ width: 78, maxWidth: 78, overflow: "hidden" }}>
              {pages.map((item: string, idx: number) => (
                <div key={idx} className="d-flex align-items-center gap-2 text-secondary" style={{ fontSize: 12, minWidth: 0 }}>
                  <span style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>•</span>
                  <span
                    title={item}
                    style={{
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      flex: 1
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          );
        }
        if (isEditing) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-transparent border-0 px-0 text-start"
              value={row.landingPage || ""}
              onChange={(e) => updateAdPlanField(row.id, "landingPage", e.target.value)}
              placeholder="Nhập trang đích..."
              style={{ width: "100%", height: 24, fontSize: 13, color: "var(--foreground)", outline: "none", boxShadow: "none" }}
            />
          );
        }
        return (
          <span
            title={row.landingPage || ""}
            style={{
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              display: "inline-block",
              width: 78,
              maxWidth: 78,
              verticalAlign: "bottom"
            }}
          >
            {row.landingPage || ""}
          </span>
        );
      }
    },
    {
      header: "Ngân sách",
      width: 110,
      align: "right",
      render: (row) => {
        if ((row as any).isChildRow) {
          return row.budget > 0 ? (
            <span style={{ color: "var(--muted-foreground)" }}>
              {row.budget.toLocaleString("vi-VN")} đ
            </span>
          ) : (
            ""
          );
        }
        if (isEditing && !row.isTotal) {
          const hasChildren = parseParentDetails(row.details || "").children.length > 0;
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-transparent border-0 px-0 text-end"
              value={row.budget ? row.budget.toLocaleString("vi-VN") : ""}
              onChange={(e) => updateAdPlanField(row.id, "budget", Number(e.target.value.replace(/\D/g, "")) || 0)}
              disabled={hasChildren}
              title={hasChildren ? "Ngân sách được tự động tính bằng tổng các nội dung con" : undefined}
              style={{ width: "100%", height: 24, fontSize: 13, color: "var(--foreground)", outline: "none", boxShadow: "none" }}
            />
          );
        }
        return (
          <span style={{ fontWeight: row.isTotal ? 700 : 400 }}>
            {row.budget.toLocaleString("vi-VN")} đ
          </span>
        );
      }
    },
    {
      header: "",
      width: 40,
      align: "center",
      render: (row) => {
        if (row.isTotal) return "";
        return (
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              className="btn btn-sm text-muted p-1"
              onClick={(e) => {
                e.stopPropagation();
                if (activeDropdownRowId === row.id) {
                  setActiveDropdownRowId(null);
                  setDropdownCoords(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveDropdownRowId(row.id);
                  setDropdownCoords({
                    top: rect.bottom,
                    right: window.innerWidth - rect.right
                  });
                }
              }}
              style={{ border: "none", background: "none", outline: "none", boxShadow: "none" }}
            >
              <i className="bi bi-three-dots-vertical" style={{ fontSize: 15 }} />
            </button>
            {activeDropdownRowId === row.id && (
              <>
                <div
                  style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownRowId(null);
                    setDropdownCoords(null);
                  }}
                />
                <div
                  style={{
                    position: "fixed",
                    top: dropdownCoords ? dropdownCoords.top + 4 : 0,
                    right: dropdownCoords ? dropdownCoords.right : 0,
                    background: "#fff",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 9999,
                    minWidth: 150,
                    display: "flex",
                    flexDirection: "column",
                    padding: "4px 0"
                  }}
                >
                  {(row as any).isChildRow ? (
                    <>
                      <button
                        className="dropdown-item px-3 py-2 text-start btn-sm"
                        style={{ background: "none", border: "none", fontSize: 13, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownRowId(null);
                          setDropdownCoords(null);
                          setAdDetailsParentId((row as any).parentId);
                          setAdEditingChildId((row as any).childId);
                          setAdChildRowPillar(row.objective);
                          setAdChildRowDetails(row.content);
                          setAdChildRowBudgetStr(row.budget > 0 ? row.budget.toLocaleString("vi-VN") : "");
                          setAdChildRowChannel((row as any).channel || "");
                          setAdChildRowLandingPage((row as any).landingPage || "");
                          setShowAdDetailsOffcanvas(true);
                        }}
                      >
                        <i className="bi bi-pencil" /> Sửa chi tiết
                      </button>
                      <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                      <button
                        className="dropdown-item px-3 py-2 text-start btn-sm text-danger"
                        style={{ background: "none", border: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownRowId(null);
                          setDropdownCoords(null);

                          const parentId = (row as any).parentId;
                          const childId = (row as any).childId;

                          setEditedAdPlan(prev => {
                            const parentRow = adPlanList.find(r => r.id === parentId);
                            const currentDetails = prev[parentId]?.details ?? parentRow?.details ?? "";
                            const { description, children } = parseParentDetails(currentDetails);
                            const updatedChildren = children.filter(c => c.id !== childId);

                            const serialized = JSON.stringify({
                              description,
                              children: updatedChildren
                            });

                            return {
                              ...prev,
                              [parentId]: {
                                ...(prev[parentId] || getAdValues(parentId)),
                                details: serialized
                              }
                            };
                          });
                          toast.success("Thành công", "Đã xóa nội dung chi tiết!");
                        }}
                      >
                        <i className="bi bi-trash" /> Xóa
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="dropdown-item px-3 py-2 text-start btn-sm"
                        style={{ background: "none", border: "none", fontSize: 13, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownRowId(null);
                          setDropdownCoords(null);
                          setEditingAdPlanId(row.id);
                          setAdOffcanvasData({
                            objective: row.objective,
                            topic: row.topic,
                            region: row.region || "",
                            assignee: row.assignee || "",
                            startDate: row.startDate || "",
                            endDate: row.endDate || "",
                            audience: row.audience || ""
                          });
                          setShowAdOffcanvas(true);
                        }}
                      >
                        <i className="bi bi-pencil" /> Sửa mục tiêu
                      </button>
                      <button
                        className="dropdown-item px-3 py-2 text-start btn-sm"
                        style={{ background: "none", border: "none", fontSize: 13, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownRowId(null);
                          setDropdownCoords(null);
                          setAdDetailsParentId(row.id);
                          setAdEditingChildId(null);
                          setAdChildRowPillar("");
                          setAdChildRowDetails("");
                          setAdChildRowBudgetStr("");
                          setAdChildRowChannel("");
                          setAdChildRowLandingPage("");
                          setShowAdDetailsOffcanvas(true);
                        }}
                      >
                        <i className="bi bi-file-earmark-plus" /> Thêm chi tiết
                      </button>
                      <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                      <button
                        className="dropdown-item px-3 py-2 text-start btn-sm text-danger"
                        style={{ background: "none", border: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownRowId(null);
                          setDropdownCoords(null);
                          setCustomAdPlanIds(prev => prev.filter(id => id !== row.id));
                          setEditedAdPlan(prev => {
                            const copy = { ...prev };
                            delete copy[row.id];
                            return copy;
                          });
                          toast.success("Thành công", "Đã xóa mục tiêu quảng cáo!");
                        }}
                      >
                        <i className="bi bi-trash" /> Xóa
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        );
      }
    }
  ];

  let parentSttIdx = 1;
  contentPlanList.forEach((parent) => {
    contentPlanRows.push({
      ...parent,
      stt: String(parentSttIdx++)
    });

    if (expandedParentIds.includes(parent.id)) {
      const { children } = parseParentDetails(parent.details);
      children.forEach((child) => {
        const childRatio = parseFloat(child.ratioStr || "") || 0;
        const childBudget = childRatio > 0 ? Math.round((childRatio / 100) * valBranding) : 0;
        const childPosts = child.postsCount || 0;

        contentPlanRows.push({
          id: `${parent.id}_child_${child.id}`,
          pillar: child.pillar,
          details: child.details,
          budget: childBudget,
          postsCount: childPosts,
          isChildRow: true,
          parentId: parent.id,
          childId: child.id,
          stt: "",
          ratioStr: child.ratioStr || ""
        });
      });
    }
  });

  const contentPlanColumns: TableColumn<ContentPlanItem>[] = [
    {
      header: "STT",
      width: 45,
      align: "center",
      render: (row) => {
        if (row.isTotal) return "";
        if (isEditing) {
          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={selectedContentPlanIds.includes(row.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedContentPlanIds(prev => [...prev, row.id]);
                  } else {
                    setSelectedContentPlanIds(prev => prev.filter(id => id !== row.id));
                  }
                }}
                style={{ cursor: "pointer" }}
              />
              <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{row.stt}</span>
            </div>
          );
        }
        return <span style={{ color: "var(--muted-foreground)" }}>{row.stt}</span>;
      }
    },
    {
      header: "Tuyến nội dung",
      width: 170,
      align: "left",
      render: (row) => {
        if (row.isTotal) return <strong className="text-uppercase">{row.pillar}</strong>;

        if (row.isChildRow) {
          const displayPostsCount = row.postsCount || 0;
          return (
            <div style={{ display: "flex", flexDirection: "column", paddingLeft: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: "var(--foreground)" }}>
                <span className="text-muted">↳</span>
                <span>{row.pillar}</span>
              </div>
              {displayPostsCount > 0 && (
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400, marginTop: 2, paddingLeft: 18 }}>
                  Số bài dự kiến: {displayPostsCount}
                </div>
              )}
            </div>
          );
        }

        const displayRole = row.role?.trim();
        const displayPurpose = row.purpose?.trim();
        const { children } = parseParentDetails(row.details);
        const hasChildren = children.length > 0;
        const isCollapsed = !expandedParentIds.includes(row.id);
        const toggleCollapse = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (isCollapsed) {
            setExpandedParentIds(prev => [...prev, row.id]);
          } else {
            setExpandedParentIds(prev => prev.filter(id => id !== row.id));
          }
        };

        const renderSubInfo = () => {
          if (!displayRole && !displayPurpose) return null;
          return (
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400, marginTop: 4, display: "flex", flexDirection: "column", gap: 1, paddingLeft: 24 }}>
              {displayRole && (
                <div style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                  <strong style={{ fontWeight: 600 }}>Vai trò:</strong> {displayRole}
                </div>
              )}
              {displayPurpose && (
                <div style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                  <strong style={{ fontWeight: 600 }}>Mục đích:</strong> {displayPurpose}
                </div>
              )}
            </div>
          );
        };

        if (isEditing) {
          return (
            <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={toggleCollapse}
                    className="btn btn-link p-0 text-muted d-inline-flex align-items-center justify-content-center"
                    style={{ width: 16, height: 16, border: "none", background: "none", outline: "none", boxShadow: "none" }}
                  >
                    <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-down"}`} style={{ fontSize: 12 }} />
                  </button>
                ) : (
                  <div style={{ width: 16 }} />
                )}
                <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    ref={(el) => {
                      if (el && newlyAddedId === row.id) {
                        el.focus();
                        el.select();
                        setTimeout(() => {
                          setNewlyAddedId(null);
                        }, 0);
                      }
                    }}
                    className="form-control form-control-sm bg-transparent border-0 px-0 text-start text-uppercase"
                    value={row.pillar}
                    onChange={(e) => updateContentPlanField(row.id, "pillar", e.target.value)}
                    onBlur={(e) => updateContentPlanField(row.id, "pillar", e.target.value)}
                    style={{ flex: 1, height: 24, fontSize: 13, color: "var(--foreground)", fontWeight: 700, outline: "none", boxShadow: "none", minWidth: 0 }}
                  />
                  {hasChildren && (
                    <span
                      className="badge rounded-pill"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                        color: "var(--primary)",
                        fontSize: "10px",
                        padding: "2px 6px",
                        fontWeight: 700,
                        marginLeft: "6px",
                        flexShrink: 0,
                        height: "18px",
                        minWidth: "18px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title={`${children.length} nội dung con`}
                    >
                      {children.length}
                    </span>
                  )}
                </div>
              </div>
              {renderSubInfo()}
            </div>
          );
        }
        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="btn btn-link p-0 text-muted d-inline-flex align-items-center justify-content-center"
                  style={{ width: 16, height: 16, border: "none", background: "none", outline: "none", boxShadow: "none" }}
                >
                  <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-down"}`} style={{ fontSize: 12 }} />
                </button>
              ) : (
                <div style={{ width: 16 }} />
              )}
              <div className="d-inline-flex align-items-center flex-wrap" style={{ gap: 6 }}>
                <span style={{ fontWeight: 700 }} className="text-uppercase">{row.pillar}</span>
                {hasChildren && (
                  <span
                    className="badge rounded-pill"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: "var(--primary)",
                      fontSize: "10px",
                      padding: "2px 6px",
                      fontWeight: 700,
                      height: "18px",
                      minWidth: "18px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    title={`${children.length} nội dung con`}
                  >
                    {children.length}
                  </span>
                )}
              </div>
            </div>
            {renderSubInfo()}
          </div>
        );
      }
    },
    {
      header: "Nội dung chi tiết",
      align: "left",
      render: (row) => {
        if (row.isTotal) return "";

        if (row.isChildRow) {
          const paragraphs = row.details ? row.details.split("\n").map(p => p.trim()).filter(Boolean) : [];
          if (paragraphs.length === 0) return "";
          return (
            <div className="d-flex flex-column gap-1">
              {paragraphs.map((item, idx) => (
                <div key={idx} className="d-flex align-items-start gap-2 text-secondary" style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--muted-foreground)" }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          );
        }

        if (isEditing) {
          const { description } = parseParentDetails(row.details);
          return (
            <textarea
              className="form-control form-control-sm bg-transparent border-0 px-0 text-start"
              value={description}
              onChange={(e) => {
                updateParentDescription(row.id, e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              style={{ width: "100%", fontSize: 13, color: "var(--foreground)", fontWeight: 400, outline: "none", boxShadow: "none", resize: "none", minHeight: 24, overflowY: "hidden", lineHeight: "1.4" }}
            />
          );
        }

        const { description } = parseParentDetails(row.details);
        if (!description) return "";

        const paragraphs = description.split("\n").map(p => p.trim()).filter(Boolean);
        if (paragraphs.length === 0) return "";

        return (
          <div className="d-flex flex-column gap-1">
            {paragraphs.map((item, idx) => (
              <div key={idx} className="d-flex align-items-start gap-2" style={{ fontSize: 13, color: "var(--foreground)", lineHeight: "1.4" }}>
                <span className="fw-bold" style={{ color: "var(--muted-foreground)" }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        );
      }
    },
    {
      header: "Ngân sách",
      width: 125,
      align: "right",
      render: (row) => {
        if (row.isChildRow) {
          const childRatioVal = parseFloat(row.ratioStr || "") || 0;
          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              {row.budget > 0 && (
                <span style={{ color: "var(--muted-foreground)" }}>
                  {row.budget.toLocaleString("vi-VN")} đ
                </span>
              )}
              {childRatioVal > 0 && (
                <span 
                  className="badge rounded-pill"
                  style={{ 
                    fontSize: 9, 
                    fontWeight: 500, 
                    backgroundColor: "#e2e8f0",
                    color: "#334155",
                    padding: "2px 6px",
                    marginTop: 4
                  }}
                >
                  {childRatioVal.toFixed(2).replace(/\.?0+$/, "")}%
                </span>
              )}
            </div>
          );
        }

        const ratioVal = valBranding > 0 ? (row.budget / valBranding) * 100 : 0;

        if (isEditing && !row.isTotal) {
          const edited = editedContentPlan[row.id];
          const displayRatio = edited?.ratioStr !== undefined
            ? edited.ratioStr
            : (valBranding > 0 ? ((row.budget / valBranding) * 100).toFixed(1).replace(".0", "") : "0");

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", width: "100%" }}>
              <input
                type="text"
                className="form-control form-control-sm bg-transparent border-0 px-0 text-end"
                value={row.budget ? row.budget.toLocaleString("vi-VN") : ""}
                onChange={(e) => updateContentPlanField(row.id, "budget", Number(e.target.value.replace(/\D/g, "")) || 0)}
                style={{ width: "100%", height: 24, fontSize: 13, color: "var(--foreground)", fontWeight: 400, outline: "none", boxShadow: "none" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, color: "var(--muted-foreground)" }}>
                <span>TL:</span>
                <input
                  type="text"
                  className="form-control form-control-sm bg-transparent border-0 p-0 text-end"
                  value={displayRatio}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      updateContentPlanRatio(row.id, val);
                    }
                  }}
                  style={{ width: 45, height: 18, fontSize: 11, color: "var(--muted-foreground)", outline: "none", boxShadow: "none", borderBottom: "1px dashed var(--border)" }}
                />
                <span>%</span>
              </div>
            </div>
          );
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontWeight: row.isTotal ? 700 : 400 }}>
              {row.budget.toLocaleString("vi-VN")} đ
            </span>
            {ratioVal > 0 && (
              <span 
                className="badge rounded-pill"
                style={{ 
                  fontSize: 10, 
                  fontWeight: 600, 
                  backgroundColor: row.isTotal 
                    ? "var(--primary)" 
                    : "color-mix(in srgb, var(--primary) 10%, transparent)", 
                  color: row.isTotal 
                    ? "#fff" 
                    : "var(--primary)",
                  padding: "3px 7px",
                  marginTop: 4
                }}
              >
                {ratioVal.toFixed(1)}%
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "",
      width: 40,
      align: "center",
      render: (row) => {
        if (row.isTotal) return "";
        return (
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              className="btn btn-sm text-muted p-1"
              onClick={(e) => {
                e.stopPropagation();
                if (activeDropdownRowId === row.id) {
                  setActiveDropdownRowId(null);
                  setDropdownCoords(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveDropdownRowId(row.id);
                  setDropdownCoords({
                    top: rect.bottom,
                    right: window.innerWidth - rect.right
                  });
                }
              }}
              style={{ border: "none", background: "none", outline: "none", boxShadow: "none" }}
            >
              <i className="bi bi-three-dots-vertical" style={{ fontSize: 15 }} />
            </button>
            {activeDropdownRowId === row.id && (
              <>
                <div
                  style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownRowId(null);
                    setDropdownCoords(null);
                  }}
                />
                <div
                  style={{
                    position: "fixed",
                    top: dropdownCoords ? dropdownCoords.top + 4 : 0,
                    right: dropdownCoords ? dropdownCoords.right : 0,
                    background: "#fff",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 9999,
                    minWidth: 150,
                    display: "flex",
                    flexDirection: "column",
                    padding: "4px 0"
                  }}
                >
                  {row.isChildRow ? (
                    <>
                      <button
                        className="dropdown-item px-3 py-2 text-start btn-sm"
                        style={{ background: "none", border: "none", fontSize: 13, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownRowId(null);
                          setDropdownCoords(null);
                          setDetailsParentId(row.parentId || null);
                          setEditingChildId(row.childId || null);
                          setChildRowPillar(row.pillar);
                          setChildRowDetails(row.details);
                          setChildRowRatioStr(row.ratioStr || "");
                          setChildRowPostsCount(row.postsCount || "");
                          setShowDetailsOffcanvas(true);
                        }}
                      >
                        <i className="bi bi-pencil" /> Sửa chi tiết
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="dropdown-item px-3 py-2 text-start btn-sm"
                        style={{ background: "none", border: "none", fontSize: 13, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownRowId(null);
                          setDropdownCoords(null);
                          handleEditRowClick(row.id);
                        }}
                      >
                        <i className="bi bi-pencil" /> Sửa thông tin
                      </button>
                      <button
                        className="dropdown-item px-3 py-2 text-start btn-sm"
                        style={{ background: "none", border: "none", fontSize: 13, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownRowId(null);
                          setDropdownCoords(null);
                          setDetailsParentId(row.id);
                          setEditingChildId(null);
                          setChildRowPillar("");
                          setChildRowDetails("");
                          setChildRowRatioStr("");
                          setChildRowPostsCount("");
                          setShowDetailsOffcanvas(true);
                        }}
                      >
                        <i className="bi bi-file-earmark-plus" /> Thêm chi tiết
                      </button>
                    </>
                  )}
                  <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                  <button
                    className="dropdown-item px-3 py-2 text-start btn-sm text-danger"
                    style={{ background: "none", border: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownRowId(null);
                      setDropdownCoords(null);
                      handleDeleteRowClick(row.id);
                    }}
                  >
                    <i className="bi bi-trash" /> Xóa
                  </button>
                </div>
              </>
            )}
          </div>
        );
      }
    }
  ];

  const salaryColumns: TableColumn<SalaryTargetItem>[] = [
    {
      header: "STT",
      width: 40,
      align: "center",
      render: (row) => {
        if (row.isTotal) return "";
        if (isEditing) {
          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={selectedStaffIds.includes(row.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedStaffIds(prev => [...prev, row.id]);
                  } else {
                    setSelectedStaffIds(prev => prev.filter(id => id !== row.id));
                  }
                }}
                style={{ cursor: "pointer" }}
              />
              <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{row.stt}</span>
            </div>
          );
        }
        return <span style={{ color: "var(--muted-foreground)" }}>{row.stt}</span>;
      }
    },
    {
      header: "VỊ TRÍ",
      width: 130,
      align: "left",
      render: (row) => {
        if (isEditing && !row.isTotal) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-transparent border-0 px-0 text-start"
              value={row.name || ""}
              onChange={(e) => updateStaffField(row.id, "name", e.target.value)}
              style={{ width: "100%", height: 24, fontSize: 13, color: "var(--foreground)", fontWeight: 400, outline: "none", boxShadow: "none" }}
            />
          );
        }
        return <span>{row.name}</span>;
      }
    },
    {
      header: "CƠ BẢN",
      width: 82,
      align: "center",
      render: (row) => {
        if (row.isTotal) return "";
        if (isEditing) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-transparent border-0 px-0 text-center"
              value={row.basic ? row.basic.toLocaleString("vi-VN") : ""}
              onChange={(e) => updateStaffField(row.id, "basic", Number(e.target.value.replace(/\D/g, "")) || 0)}
              style={{ width: "100%", maxWidth: 100, height: 24, fontSize: 13, color: "var(--foreground)", fontWeight: 400, outline: "none", boxShadow: "none", display: "inline-block" }}
            />
          );
        }
        return <span>{row.basic.toLocaleString("vi-VN")}</span>;
      }
    },
    {
      header: "HIỆU SUẤT",
      width: 72,
      align: "center",
      render: (row) => {
        if (row.isTotal) return "";
        if (isEditing) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-transparent border-0 px-0 text-center"
              value={row.perf ? row.perf.toLocaleString("vi-VN") : ""}
              onChange={(e) => updateStaffField(row.id, "perf", Number(e.target.value.replace(/\D/g, "")) || 0)}
              style={{ width: "100%", maxWidth: 90, height: 24, fontSize: 13, color: "var(--foreground)", fontWeight: 400, outline: "none", boxShadow: "none", display: "inline-block" }}
            />
          );
        }
        return <span>{row.perf.toLocaleString("vi-VN")}</span>;
      }
    },
    {
      header: "PHỤ CẤP",
      width: 65,
      align: "center",
      render: (row) => {
        if (row.isTotal) return "";
        if (isEditing) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-transparent border-0 px-0 text-center"
              value={row.allowance ? row.allowance.toLocaleString("vi-VN") : ""}
              onChange={(e) => updateStaffField(row.id, "allowance", Number(e.target.value.replace(/\D/g, "")) || 0)}
              style={{ width: "100%", maxWidth: 80, height: 24, fontSize: 13, color: "var(--foreground)", fontWeight: 400, outline: "none", boxShadow: "none", display: "inline-block" }}
            />
          );
        }
        return <span>{row.allowance.toLocaleString("vi-VN")}</span>;
      }
    },
    {
      header: "SỐ LƯỢNG",
      width: 32,
      align: "center",
      render: (row) => {
        if (isEditing && !row.isTotal) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-transparent border-0 px-0 text-center"
              value={row.qty ? row.qty.toLocaleString("vi-VN") : ""}
              onChange={(e) => updateStaffField(row.id, "qty", Number(e.target.value.replace(/\D/g, "")) || 0)}
              style={{ width: "100%", maxWidth: 30, height: 24, fontSize: 13, color: "var(--foreground)", fontWeight: 400, outline: "none", boxShadow: "none", display: "inline-block" }}
            />
          );
        }
        return <span style={{ fontWeight: row.isTotal ? 700 : 400, display: "block", textAlign: "center" }}>{row.qty}</span>;
      }
    },
    {
      header: "QUỸ LƯƠNG (Đ)",
      width: 88,
      align: "right",
      render: (row) => {
        return (
          <span style={{ fontWeight: 700 }}>
            {row.fund.toLocaleString("vi-VN")}
          </span>
        );
      }
    }
  ];

  const renderSalaryHeader = () => (
    <>
      <tr>
        <th
          rowSpan={2}
          className="text-uppercase text-center"
          style={{
            width: 40,
            fontWeight: 700,
            fontSize: 11,
            color: "var(--muted-foreground)",
            background: "#fff",
            borderBottom: "1px solid var(--border)",
            verticalAlign: "middle",
            padding: "2px 4px"
          }}
        >
          STT
        </th>
        <th
          rowSpan={2}
          className="text-uppercase text-start"
          style={{
            width: 130,
            fontWeight: 700,
            fontSize: 11,
            color: "var(--muted-foreground)",
            background: "#fff",
            borderBottom: "1px solid var(--border)",
            verticalAlign: "middle",
            padding: "2px 8px"
          }}
        >
          Vị trí
        </th>
        <th
          colSpan={3}
          className="text-uppercase text-center"
          style={{
            fontWeight: 700,
            fontSize: 11,
            color: "var(--muted-foreground)",
            background: "#fff",
            borderBottom: "1px solid var(--border)",
            verticalAlign: "middle",
            padding: "2px 4px"
          }}
        >
          Lương và phụ cấp tháng (đ)
        </th>
        <th
          rowSpan={2}
          className="text-uppercase text-center"
          style={{
            width: 32,
            fontWeight: 700,
            fontSize: 11,
            color: "var(--muted-foreground)",
            background: "#fff",
            borderBottom: "1px solid var(--border)",
            verticalAlign: "middle",
            padding: "2px 4px"
          }}
        >
          SL
        </th>
        <th
          rowSpan={2}
          className="text-uppercase text-end"
          style={{
            width: 88,
            fontWeight: 700,
            fontSize: 11,
            color: "var(--muted-foreground)",
            background: "#fff",
            borderBottom: "1px solid var(--border)",
            verticalAlign: "middle",
            padding: "2px 8px"
          }}
        >
          Quỹ lương (đ)
        </th>
      </tr>
      <tr>
        <th
          className="text-uppercase text-center"
          style={{
            width: 82,
            fontWeight: 700,
            fontSize: 11,
            color: "var(--muted-foreground)",
            background: "#fff",
            borderBottom: "1px solid var(--border)",
            padding: "2px 4px"
          }}
        >
          Cơ bản
        </th>
        <th
          className="text-uppercase text-center"
          style={{
            width: 72,
            fontWeight: 700,
            fontSize: 11,
            color: "var(--muted-foreground)",
            background: "#fff",
            borderBottom: "1px solid var(--border)",
            padding: "2px 4px"
          }}
        >
          Hiệu suất
        </th>
        <th
          className="text-uppercase text-center"
          style={{
            width: 65,
            fontWeight: 700,
            fontSize: 11,
            color: "var(--muted-foreground)",
            background: "#fff",
            borderBottom: "1px solid var(--border)",
            padding: "2px 4px"
          }}
        >
          Phụ cấp
        </th>
      </tr>
    </>
  );

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: "brief",
      title: "Mục tiêu năm",
      desc: "Xác định mục tiêu & đối tượng",
      icon: "bi-calendar-check",
    },
    {
      num: 2,
      id: "budget",
      title: "Kế hoạch năm",
      desc: "Tính toán chi phí & kênh chạy",
      icon: "bi-cash-coin",
    },
    {
      num: 3,
      id: "approval",
      title: "Kế hoạch tháng",
      desc: "Chi tiết kế hoạch từng tháng",
      icon: "bi-calendar3",
    },
    {
      num: 4,
      id: "monthly-budget",
      title: "Ngân sách tháng",
      desc: "Phân bổ ngân sách theo tháng",
      icon: "bi-bank",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)", fontFamily: "'Roboto Condensed', sans-serif" }}>
      <style>{`
        @keyframes pulse-red {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        /* ── STEP 1 RESPONSIVE ── */
        .mkt-step1-grid {
          display: grid;
          grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
          gap: 20px;
          min-height: 400px;
          padding: 0 8px 8px 8px;
          min-width: 0;
        }
        .mkt-step1-left {
          border-right: 1px solid var(--border);
          padding-right: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: sticky;
          top: 0;
          align-self: flex-start;
          min-width: 0;
        }
        .mkt-step1-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        /* ── STEP 4 RESPONSIVE ── */
        .mkt-step4-grid {
          display: grid;
          grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
          gap: 20px;
          min-height: 400px;
          padding: 0 8px 8px 8px;
          min-width: 0;
        }
        .mkt-step4-left {
          border-right: 1px solid var(--border);
          padding-right: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: sticky;
          top: 0;
          align-self: flex-start;
          min-width: 0;
        }
        .mkt-step4-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        /* iPad */
        @media (max-width: 1024px) {
          .mkt-step1-grid {
            grid-template-columns: minmax(0, 1fr);
            min-height: unset;
            gap: 16px;
          }
          .mkt-step1-left {
            position: static !important;
            align-self: auto !important;
            border-right: none !important;
            padding-right: 0 !important;
            border-bottom: 1px solid var(--border);
            padding-bottom: 16px;
            order: 2;
            min-width: 0;
          }
          .mkt-step1-right {
            order: 1;
            min-width: 0;
            width: 100%;
            overflow: hidden;
          }
          .mkt-step1-chart-compact {
            min-height: 180px !important;
          }
          
          .mkt-step4-grid {
            grid-template-columns: minmax(0, 1fr);
            min-height: unset;
            gap: 16px;
          }
          .mkt-step4-left {
            position: static !important;
            align-self: auto !important;
            border-right: none !important;
            padding-right: 0 !important;
            border-bottom: 1px solid var(--border);
            padding-bottom: 16px;
            min-width: 0;
          }
          .mkt-step4-right {
            min-width: 0;
            width: 100%;
            overflow: hidden;
          }
        }
        .mkt-step3-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 44px;
          padding: 0 16px;
          background: #ffffff;
          border-bottom: 1px solid var(--border);
          border-radius: 8px 8px 0 0;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .mkt-month-timeline {
          display: inline-flex;
          align-items: center;
          position: relative;
        }
        .mkt-month-line {
          position: absolute;
          left: 11px;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          height: 2px;
          background-color: color-mix(in srgb, var(--primary) 15%, #cbd5e1);
          z-index: 1;
        }
        .mkt-month-container {
          display: flex;
          gap: 10px;
          position: relative;
          z-index: 2;
          align-items: center;
        }
        .mkt-month-btn {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10.5px;
          font-weight: 500;
          background-color: #fff;
          color: color-mix(in srgb, var(--foreground) 75%, #475569);
          border: 1.5px solid color-mix(in srgb, var(--primary) 20%, #cbd5e1);
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          outline: none;
        }
        .mkt-month-btn.active {
          font-weight: 700;
          background-color: #1e3a8a;
          color: #fff;
          border: none;
          box-shadow: 0 2px 6px rgba(30, 58, 138, 0.2);
        }
        @media (max-width: 1024px) {
          .mkt-step3-header {
            height: auto !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 10px 12px !important;
            gap: 12px !important;
          }
          .mkt-month-timeline {
            align-self: center !important;
            width: auto !important;
          }
          .mkt-month-container {
            gap: 6px !important;
          }
          .mkt-month-btn {
            width: 20px !important;
            height: 20px !important;
            font-size: 9.5px !important;
          }
          .mkt-month-line {
            left: 10px !important;
            right: 10px !important;
          }
          .mkt-step3-header select {
            width: 80px !important;
            height: 30px !important;
            font-size: 11.5px !important;
          }
          .mkt-step3-header button {
            width: 30px !important;
            height: 30px !important;
          }
          .mkt-step3-header .badge {
            font-size: 10.5px !important;
            padding: 3.5px 8px !important;
          }
        }
        @media (max-width: 768px) {
          .mkt-step3-header {
            height: auto !important;
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 8px 12px !important;
            gap: 10px !important;
          }
          .mkt-month-timeline {
            align-self: center !important;
            width: auto !important;
          }
        }
        /* Mobile */
        @media (max-width: 640px) {
          .mkt-step1-grid {
            padding: 0 4px 8px 4px;
            gap: 12px;
          }
          .mkt-step4-grid {
            padding: 0 4px 8px 4px;
            gap: 12px;
          }
        }

        /* ── PROPOSAL MODAL RESPONSIVE ── */
        .proposal-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          background: #ffffff;
          border-bottom: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          min-height: 60px;
          flex-shrink: 0;
        }
        .proposal-modal-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .proposal-modal-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .proposal-modal-body {
          flex: 1;
          min-height: 0;
          height: calc(100vh - 60px);
          overflow: hidden;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 0;
          padding: 0;
        }
        .proposal-sidebar-content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .proposal-sidebar-inputs {
          width: 100%;
        }
        .proposal-sidebar-card {
          width: 100%;
        }

        /* ── iPad & Tablet Responsive for Proposal Modal ── */
        @media (max-width: 1024px) {
          .proposal-modal-header {
            flex-direction: column !important;
            align-items: stretch !important;
            height: auto !important;
            padding: 12px 16px !important;
            gap: 12px !important;
          }
          .proposal-modal-header-left {
            width: 100% !important;
          }
          .proposal-modal-header-right {
            width: 100% !important;
            justify-content: space-between !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .proposal-modal-header-right button {
            padding: 6px 12px !important;
            font-size: 12px !important;
            height: 34px !important;
            flex: 1 !important;
            justify-content: center !important;
            white-space: nowrap !important;
          }
          .proposal-modal-body {
            display: flex !important;
            flex-direction: column !important;
            overflow-y: auto !important; /* Enable scrolling for the whole body wrapper */
            height: calc(100vh - 120px) !important; /* Account for two-row header height */
          }
          .proposal-modal-body > div,
          .proposal-modal-body > div > div.card {
            height: auto !important;
            max-height: none !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          /* Left Column panel when stacked */
          .proposal-modal-body > div:first-child {
            border-bottom: 1px solid var(--border) !important;
            border-right: none !important;
            padding: 16px !important;
          }
          /* Right Column panel when stacked */
          .proposal-modal-body > div:last-child {
            padding: 16px !important;
          }
          .proposal-sidebar-content-wrapper {
            display: flex !important;
            flex-direction: row-reverse !important; /* Left: Visa card, Right: Inputs */
            align-items: center !important;
            gap: 24px !important;
            width: 100% !important;
          }
          .proposal-sidebar-content-wrapper.collapsed-on-tablet {
            display: none !important;
          }
          .proposal-sidebar-inputs {
            flex: 1.2 !important;
          }
          .proposal-sidebar-card {
            flex: 1 !important;
            max-width: 320px !important;
          }
        }
        @media (max-width: 640px) {
          .proposal-modal-header-right button {
            flex: 1 1 45% !important; /* Grid flow for mobile */
          }
          .proposal-sidebar-content-wrapper {
            flex-direction: column !important;
            gap: 16px !important;
          }
          .proposal-sidebar-card {
            max-width: 100% !important;
            width: 100% !important;
          }
          /* Make all row g-2 inside sidebar stack vertically on mobile for more room */
          .proposal-modal-body .row.g-2 > .col-6 {
            width: 100% !important;
            margin-bottom: 4px;
          }
        }
        @media (min-width: 1025px) {
          .proposal-sidebar-toggle {
            display: none !important;
          }
          /* Stack columns vertically on PC/Laptop (since sidebar is only 260px wide) */
          .proposal-modal-body .row.g-2 > .col-6 {
            width: 100% !important;
            margin-bottom: 8px;
          }
        }
      `}</style>
      <PageHeader
        title="Lập kế hoạch"
        description="Quy trình lập kế hoạch tiếp thị và phát triển thị trường"
        color="rose"
        icon="bi-calendar-check"
      />

      <div className="p-2 px-3" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <WorkflowCard
          stepper={
            <ModernStepper
              steps={steps}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingX={0}
              paddingY={8}
            />
          }
          contentPadding="px-3 pt-2 pb-3"
          bottomToolbar={
            currentStep === 2 ? (
              <div className="d-flex justify-content-between align-items-center w-100" style={{ padding: "2px 0" }}>
                <div>
                  {subStep === "ads" ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                      onClick={() => setSubStep("pillar")}
                      style={{ fontWeight: 600, fontSize: 12, borderRadius: 6 }}
                    >
                      <i className="bi bi-arrow-left" /> Tuyến nội dung
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {subStep === "pillar" && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                      onClick={() => setSubStep("ads")}
                      style={{ fontWeight: 600, fontSize: 12, borderRadius: 6 }}
                    >
                      Kế hoạch quảng cáo <i className="bi bi-arrow-right" />
                    </button>
                  )}
                </div>
              </div>
            ) : undefined
          }
        >
          {currentStep === 1 && (
            <div className="mkt-step1-grid">
              {/* Left Column (5/12 ratio) */}
              <div className="mkt-step1-left">
                {/* First Row: Năm kế hoạch, Ngày lập, Trình duyệt, Báo cáo */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4 }}>Năm kế hoạch</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                      style={{ fontSize: 12, height: 32 }}
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                  <div style={{ flex: 1.2, minWidth: 100 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4 }}>Ngày lập</label>
                    <input type="date" className="form-control form-control-sm" defaultValue="2026-06-23" style={{ fontSize: 12, height: 32 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      title="Trình duyệt kế hoạch"
                      onClick={handleSubmitPlan}
                      disabled={isSubmittingPlan}
                      style={{ height: 32, width: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      {isSubmittingPlan ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "12px", height: "12px" }} />
                      ) : (
                        <i className="bi bi-send" style={{ fontSize: 13 }} />
                      )}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-success"
                      title="Báo cáo kế hoạch"
                      onClick={() => setShowPlanPrintModal(true)}
                      style={{ height: 32, display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 11, padding: "0 10px" }}
                    >
                      <i className="bi bi-file-earmark-bar-graph" /> Báo cáo
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Revenue Structure Chart */}
                {(() => {
                  const costRatio = totalRevenue > 0 ? (totalCostMarketing / totalRevenue * 100) : 0;
                  const isOverBudget = totalCostMarketing > valMarketingCost;
                  return (
                    <>
                      {/* Cost/Revenue Progress Bar Card */}
                      <div style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Tỷ lệ Chi phí / Doanh thu
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: isOverBudget ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                            color: isOverBudget ? "#ef4444" : "#10b981",
                            border: `1px solid ${isOverBudget ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"}`
                          }}>
                            {isOverBudget ? "Vượt định mức" : "Trong định mức"}
                          </span>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 28, fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.5px" }}>
                            {costRatio.toFixed(1)}%
                          </span>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                            trên tổng doanh thu
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ height: 8, background: "rgba(100, 116, 139, 0.1)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.min(costRatio, 100)}%`,
                            background: isOverBudget 
                              ? "linear-gradient(90deg, #ef4444 0%, #f43f5e 100%)" 
                              : "linear-gradient(90deg, #3b82f6 0%, #10b981 100%)",
                            borderRadius: 4,
                            transition: "width 0.4s ease-in-out"
                          }} />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted-foreground)" }}>
                          <div>
                            Chi phí: <strong style={{ color: "var(--foreground)" }}>{totalCostMarketing.toLocaleString("vi-VN")} đ</strong>
                          </div>
                          <div>
                            Định mức: <strong style={{ color: "var(--foreground)" }}>{valMarketingCost.toLocaleString("vi-VN")} đ</strong>
                          </div>
                        </div>
                      </div>

                      {/* Revenue Structure Donut Chart Card */}
                      <div style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Cơ cấu doanh thu năm {selectedYear}
                        </span>
                        <div className="mkt-step1-chart-compact" style={{ minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {totalRevenue > 0 ? (
                            <div style={{ width: "100%" }}>
                              <ReactApexChart 
                                options={revenueChartOptions} 
                                series={[valAgent, valAgentDev, valTraditional, valEcommerce]} 
                                type="donut" 
                                height={260} 
                              />
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Chưa có dữ liệu doanh thu</div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Right Column (7/12 ratio) */}
              <div className="mkt-step1-right">
                <SectionTitle
                  title={`Tổng quan kế hoạch marketing năm ${selectedYear}`}
                  className="mb-1"
                  action={
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="form-check form-switch mb-0 d-flex align-items-center gap-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="editModeSwitch"
                          checked={isEditing}
                          onChange={(e) => {
                            setIsEditing(e.target.checked);
                            if (!e.target.checked) {
                              setSelectedStaffIds([]);
                            }
                          }}
                          style={{ cursor: "pointer", width: 32, height: 16 }}
                        />
                        <label
                          className="form-check-label text-uppercase fw-bold"
                          htmlFor="editModeSwitch"
                          style={{ fontSize: 10, color: "var(--muted-foreground)", cursor: "pointer", userSelect: "none" }}
                        >
                          Chỉnh sửa
                        </label>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-success"
                        title="Lưu thay đổi"
                        disabled={!isEditing}
                        onClick={handleSave}
                        style={{
                          height: 28,
                          width: 28,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 4
                        }}
                      >
                        <i className="bi bi-floppy" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  }
                />

                <Table
                  rows={budgetRows}
                  columns={budgetColumns}
                  loading={loadingMasterPlan}
                  borderless={false}
                  striped={false}
                  compact={true}
                  fontSize={12}
                  rowKey={row => row.id}
                  rowStyle={(row) => ({
                    fontWeight: row.isTotal ? 700 : 400,
                    background: "#fff",
                  })}
                  cellStyle={() => ({
                    background: "#fff",
                    padding: "6px 8px",
                  })}
                  wrapperStyle={{
                    background: "#fff",
                    border: "none",
                    overflowX: "auto",
                  }}
                  wrapperClassName="mkt-plan-table-no-min"
                  minWidth={320}
                />

                <SectionTitle
                  title="Chi tiết chi phí lương thưởng"
                  className="mt-2 mb-1"
                  style={{ color: "var(--primary)", fontSize: 12, letterSpacing: "0.02em" }}
                  action={
                    isEditing && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {selectedStaffIds.length > 0 && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Xóa các vị trí đã chọn"
                            onClick={handleDeleteSelected}
                            style={{
                              height: 24,
                              padding: "0 8px",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 4
                            }}
                          >
                            <i className="bi bi-trash3" style={{ fontSize: 11 }} /> Xóa ({selectedStaffIds.length})
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-outline-primary"
                          title="Thêm vị trí mới"
                          onClick={() => {
                            const newId = `mkt_custom_${Date.now()}`;
                            setCustomStaffIds(prev => [...prev, newId]);
                            setEditedStaff(prev => ({
                              ...prev,
                              [newId]: {
                                name: "Vị trí mới",
                                basic: 10000000,
                                perf: 0,
                                allowance: 0,
                                qty: 1
                              }
                            }));
                          }}
                          style={{
                            height: 24,
                            padding: "0 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 4
                          }}
                        >
                          <i className="bi bi-plus-lg" style={{ fontSize: 11 }} /> Thêm vị trí
                        </button>
                      </div>
                    )
                  }
                />

                <Table
                  rows={salaryRows}
                  columns={salaryColumns}
                  loading={loadingMasterPlan}
                  renderHeader={renderSalaryHeader}
                  borderless={false}
                  striped={false}
                  compact={true}
                  fontSize={12}
                  rowKey={row => row.id}
                  rowStyle={(row) => ({
                    fontWeight: row.isTotal ? 700 : 400,
                    background: "#fff",
                  })}
                  cellStyle={(row, col) => {
                    const baseStyle: React.CSSProperties = { background: "#fff", padding: "6px 8px" };
                    if (isEditing && (col.header === "CƠ BẢN" || col.header === "HIỆU SUẤT" || col.header === "PHỤ CẤP" || col.header === "SỐ LƯỢNG")) {
                      return { ...baseStyle, padding: "6px 4px" };
                    }
                    return baseStyle;
                  }}
                  wrapperStyle={{
                    background: "#fff",
                    border: "none",
                    overflowX: "auto",
                  }}
                  wrapperClassName="mkt-plan-table-no-min"
                  minWidth={480}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 240px)", overflow: "hidden", minWidth: 0, width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 16px 12px 16px", flexShrink: 0, borderBottom: "1px solid var(--border)", background: "#fff" }}>
                <SectionTitle
                  title={subStep === "pillar" ? `Chi tiết tuyến nội dung năm ${selectedYear}` : `Kế hoạch chạy quảng cáo năm ${selectedYear}`}
                  className="mb-0"
                  style={{ color: "var(--primary)", fontSize: 12, letterSpacing: "0.02em" }}
                  action={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Content Plan Action Buttons */}
                      {subStep === "pillar" && (
                        <>
                          {selectedContentPlanIds.length > 0 && (
                            <button
                              className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                              onClick={handleDeleteSelectedContentPlan}
                              style={{
                                height: 28,
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: 4,
                                padding: "0 10px"
                              }}
                            >
                              <i className="bi bi-trash" /> Xóa ({selectedContentPlanIds.length})
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-primary"
                            title="Thêm tuyến nội dung mới"
                            onClick={() => {
                              const defaultBudget = 10000000;
                              const defaultRatioVal = valBranding > 0 ? (defaultBudget / valBranding) * 100 : 0;
                              const defaultRatioStr = defaultRatioVal > 0 ? defaultRatioVal.toFixed(2).replace(/\.?0+$/, "") : "0";
                              setShowAddOffcanvas(true);
                              setOffcanvasData({
                                pillar: "",
                                purpose: "",
                                role: "",
                                details: "",
                                budget: defaultBudget,
                                ratioStr: defaultRatioStr,
                                postsCount: 5
                              });
                            }}
                            style={{
                              height: 28,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontWeight: 600,
                              fontSize: 11,
                              padding: "0 10px",
                              borderRadius: 4
                            }}
                          >
                            <i className="bi bi-plus-lg" style={{ fontSize: 11 }} /> Thêm tuyến nội dung
                          </button>
                        </>
                      )}

                      {/* Ad Plan Action Buttons */}
                      {subStep === "ads" && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          title="Thêm mục tiêu quảng cáo mới"
                          onClick={() => {
                            setEditingAdPlanId(null);
                            setAdOffcanvasData({
                              objective: "",
                              topic: "",
                              region: "",
                              assignee: "",
                              startDate: "",
                              endDate: "",
                              audience: ""
                            });
                            setShowAdOffcanvas(true);
                          }}
                          style={{
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontWeight: 600,
                            fontSize: 11,
                            padding: "0 10px",
                            borderRadius: 4
                          }}
                        >
                          <i className="bi bi-plus-lg" style={{ fontSize: 11 }} /> Thêm mục tiêu
                        </button>
                      )}

                      <button
                        className="btn btn-sm btn-outline-success"
                        title="Lưu thay đổi"
                        onClick={handleSave}
                        style={{
                          height: 28,
                          width: 28,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 4
                        }}
                      >
                        <i className="bi bi-floppy" />
                      </button>
                    </div>
                  }
                />
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  - Ngân sách phân bổ: <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{valBranding.toLocaleString("vi-VN")} đồng</span>
                </div>
              </div>
              <div className="flex-grow-1 custom-scrollbar" style={{ overflowY: "auto", padding: "12px 16px", minHeight: 0, minWidth: 0, width: "100%", overflowX: "hidden" }}>
                {subStep === "pillar" ? (
                  <Table
                    rows={contentPlanRows}
                    columns={contentPlanColumns}
                    loading={loadingMasterPlan}
                    borderless={false}
                    striped={false}
                    compact={true}
                    fontSize={13}
                    rowKey={row => row.id}
                    rowStyle={(row) => ({
                      fontWeight: row.isTotal ? 700 : 400,
                      background: "#fff",
                    })}
                    cellStyle={(row, col) => {
                      const baseStyle: React.CSSProperties = { background: "#fff", padding: "2px 8px" };
                      if (isEditing && (col.header === "Tuyến nội dung" || col.header === "Nội dung chi tiết" || col.header === "Ngân sách" || col.header === "Số lượng bài")) {
                        return { ...baseStyle, padding: "2px 4px" };
                      }
                      return baseStyle;
                    }}
                    wrapperClassName="mkt-plan-table-no-min"
                    wrapperStyle={{
                      background: "#fff",
                      border: "none",
                    }}
                  />
                ) : (
                  <Table
                    rows={adPlanRows}
                    columns={adPlanColumns}
                    loading={loadingMasterPlan}
                    borderless={false}
                    striped={false}
                    compact={true}
                    fontSize={13}
                    rowKey={row => row.id}
                    rowStyle={(row) => ({
                      fontWeight: row.isTotal ? 700 : 400,
                      background: "#fff",
                    })}
                    cellStyle={(row, col) => {
                      const baseStyle: React.CSSProperties = { background: "#fff", padding: "2px 8px" };
                      if (col.header === "Trang đích") {
                        const padding = isEditing ? "2px 4px" : "2px 8px";
                        return {
                          ...baseStyle,
                          padding,
                          width: 95,
                          maxWidth: 95,
                          overflow: "hidden"
                        };
                      }
                      if (isEditing && (col.header === "Mục tiêu" || col.header === "Hình thức triển khai" || col.header === "Nội dung" || col.header === "Ngân sách")) {
                        return { ...baseStyle, padding: "2px 4px" };
                      }
                      return baseStyle;
                    }}
                    wrapperClassName="mkt-plan-table-no-min"
                    wrapperStyle={{
                      background: "#fff",
                      border: "none",
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="mkt-step4-grid">
              {/* Left Column: Stats & Actions */}
              <div className="mkt-step4-left">
                <div className="card m-0 border-0 shadow-sm" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 8, padding: 12, margin: 0 }}>
                  <h6 className="fw-bold text-secondary" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Tóm tắt ngân sách</h6>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>Tổng ngân sách năm {selectedYear}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--primary)", lineHeight: "1.2" }}>{valBranding.toLocaleString("vi-VN")} đ</div>
                  </div>

                  <div className="d-flex gap-3">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>Đã phân bổ</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", lineHeight: "1.2" }}>{totalAllocatedBudgets.toLocaleString("vi-VN")} đ</div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>Còn lại chưa phân bổ</div>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: (valBranding - totalAllocatedBudgets) < 0 ? "#ef4444" : "#10b981",
                        lineHeight: "1.2"
                      }}>
                        {(valBranding - totalAllocatedBudgets).toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                  </div>
                </div>

                <SectionTitle
                  title="Ngân sách cho đại lý"
                  className="mb-0"
                  style={{ color: "var(--primary)", fontSize: 12, letterSpacing: "0.02em" }}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12 }}>
                  <BudgetInputRow
                    label="Marketing tại điểm bán"
                    value={agencyPOSBudget}
                    onChange={setAgencyPOSBudget}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Quảng cáo"
                    value={agencyAdsBudget}
                    onChange={setAgencyAdsBudget}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Quà tặng"
                    value={agencyGiftBudget}
                    onChange={setAgencyGiftBudget}
                    valBranding={valBranding}
                  />
                </div>

                <SectionTitle
                  title="Ngân sách cho quảng cáo"
                  className="mb-0"
                  style={{ color: "var(--primary)", fontSize: 12, letterSpacing: "0.02em" }}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12 }}>
                  <BudgetInputRow
                    label="Chi phí quảng cáo Facebook Ads"
                    value={advFbAds}
                    onChange={setAdvFbAds}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Chi phí quảng cáo Google Ads"
                    value={advGoogleAds}
                    onChange={setAdvGoogleAds}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Chi phí quảng cáo Youtube Ads"
                    value={advYoutubeAds}
                    onChange={setAdvYoutubeAds}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Chi phí quảng cáo Tiktok Ads"
                    value={advTiktokAds}
                    onChange={setAdvTiktokAds}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Chi phí SEO + CTV + PR báo chí"
                    value={advSeoPr}
                    onChange={setAdvSeoPr}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Chi phí in ấn & thiết kế thuê ngoài"
                    value={advPrintOutsource}
                    onChange={setAdvPrintOutsource}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Chi phí media + mẫu + decor"
                    value={advMediaModelDecor}
                    onChange={setAdvMediaModelDecor}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Chi phí thiết kế và duy trì website"
                    value={advWebDesign}
                    onChange={setAdvWebDesign}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Các chi phí khác"
                    value={advOther}
                    onChange={setAdvOther}
                    valBranding={valBranding}
                  />
                  <BudgetInputRow
                    label="Dự phòng"
                    value={advReserve}
                    onChange={setAdvReserve}
                    valBranding={valBranding}
                  />
                </div>
              </div>

              {/* Right Column: Month Allocation Header only (Table deleted) */}
              <div className="mkt-step4-right">
                <SectionTitle
                  title={`Phân bổ ngân sách theo tháng - Năm ${selectedYear}`}
                  className="mb-0"
                  style={{ color: "var(--primary)", fontSize: 12, letterSpacing: "0.02em" }}
                  action={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="form-check form-switch d-inline-flex align-items-center gap-2" style={{ userSelect: "none" }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="edit-monthly-budget-switch"
                          checked={isEditing}
                          onChange={(e) => setIsEditing(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        <label
                          className="form-check-label text-secondary fw-semibold"
                          htmlFor="edit-monthly-budget-switch"
                          style={{ cursor: "pointer", fontSize: 11, letterSpacing: "0.05em" }}
                        >
                          CHỈNH SỬA
                        </label>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-success"
                        title="Lưu lại"
                        onClick={() => handleSave()}
                        style={{
                          height: 28,
                          width: 28,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 4
                        }}
                      >
                        <i className="bi bi-floppy" />
                      </button>
                    </div>
                  }
                />

                {/* 12-Month Selector Timeline */}
                <div style={{ display: "flex", alignItems: "center", position: "relative", paddingRight: 4, marginTop: -6, width: "100%", maxWidth: 380 }}>
                  {/* Connecting Line */}
                  <div
                    style={{
                      position: "absolute",
                      left: 11,
                      right: 11,
                      top: "50%",
                      transform: "translateY(-50%)",
                      height: 2,
                      backgroundColor: "color-mix(in srgb, var(--primary) 15%, #cbd5e1)",
                      zIndex: 1
                    }}
                  />

                  {/* Month Buttons Container */}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 4, width: "100%", position: "relative", zIndex: 2, alignItems: "center" }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const isActive = m === selectedMonth;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSelectedMonth(m)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10.5,
                            fontWeight: isActive ? 700 : 500,
                            backgroundColor: isActive ? "#1e3a8a" : "#fff",
                            color: isActive ? "#fff" : "color-mix(in srgb, var(--foreground) 75%, #475569)",
                            border: isActive ? "none" : "1.5px solid color-mix(in srgb, var(--primary) 20%, #cbd5e1)",
                            boxShadow: isActive ? "0 2px 6px rgba(30, 58, 138, 0.2)" : "none",
                            cursor: "pointer",
                            transition: "all 0.2s ease-in-out"
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Expected Budget Summary */}
                <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Tổng ngân sách dự kiến chi cho tháng {selectedMonth}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>
                      {(monthlyBudgets[selectedMonth] || 0).toLocaleString("vi-VN")} đ
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {(() => {
                        const propStatus = masterPlanData?.mkt_proposals?.[selectedMonth]?.status || "draft";
                        if (propStatus === "draft") return null;
                        return (
                          <span className={`badge bg-${
                            propStatus === "approved" ? "success" :
                            propStatus === "pending" ? "warning text-dark" :
                            propStatus === "rejected" ? "danger" : "secondary"
                          }`} style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>
                            {propStatus === "approved" ? "Đã duyệt chi phí" :
                             propStatus === "pending" ? "Đang chờ duyệt CP" :
                             propStatus === "rejected" ? "Từ chối duyệt CP" : ""}
                          </span>
                        );
                      })()}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                        onClick={() => {
                          const existingProposal = masterPlanData?.mkt_proposals?.[selectedMonth];
                          if (existingProposal) {
                            const updated = { ...existingProposal };
                            if (
                              !updated.proposerName ||
                              updated.proposerName === "Nguyễn Văn A" ||
                              updated.proposerName === "Trưởng phòng marketing"
                            ) {
                              updated.proposerName = marketingManagerName;
                            }
                            if (
                              !updated.approverName ||
                              updated.approverName === "Trần Thị B" ||
                              updated.approverName === "Giám đốc"
                            ) {
                              updated.approverName = directorName;
                            }
                            setProposalData(updated);
                          } else {
                            setProposalData({
                              proposerName: marketingManagerName,
                              approverName: directorName,
                              date: new Date().toLocaleDateString("vi-VN"),
                              purpose: `Lập đề xuất chi phí marketing tháng ${selectedMonth}/${selectedYear}`,
                              notes: "",
                              code: `DX-MKT-${selectedMonth.toString().padStart(2, "0")}${selectedYear}-${Math.floor(1000 + Math.random() * 9000)}`,
                              department: "Phòng Marketing",
                              items: {},
                              advReserve: 0,
                              status: "draft"
                            });
                          }
                          setShowProposalModal(true);
                        }}
                        style={{
                          height: 28,
                          fontSize: 11.5,
                          fontWeight: 600,
                          borderRadius: 6,
                          padding: "0 10px",
                        }}
                      >
                        <i className="bi bi-magic" style={{ fontSize: 12 }} />
                        Đề xuất chi phí
                      </button>
                    </div>
                  </div>
                </div>

                {/* Monthly Category Budgets Table */}
                {(() => {
                  const agencySum = BUDGET_CATEGORIES.slice(0, 3).reduce((sum, cat) => {
                    const alloc = (monthlyAllocations[selectedMonth] || {})[cat.id] || { budget: 0 };
                    return sum + (alloc.budget || 0);
                  }, 0);

                  const advSum = BUDGET_CATEGORIES.slice(3).reduce((sum, cat) => {
                    const alloc = (monthlyAllocations[selectedMonth] || {})[cat.id] || { budget: 0 };
                    return sum + (alloc.budget || 0);
                  }, 0);

                  const monthlyTableRows = [
                    {
                      isHeader: true,
                      label: "Chi phí cho đại lý",
                      id: "section_agency"
                    },
                    ...BUDGET_CATEGORIES.slice(0, 3),
                    {
                      isHeader: true,
                      label: "Chi phí cho quảng cáo",
                      id: "section_adv"
                    },
                    ...BUDGET_CATEGORIES.slice(3)
                  ];

                  const monthlyAllocColumns: TableColumn<any>[] = [
                    {
                      header: "STT",
                      width: 40,
                      align: "center",
                      render: (row) => {
                        if (row.isHeader) return "";
                        const originalIdx = BUDGET_CATEGORIES.findIndex(c => c.id === row.id);
                        return (
                          <span className="fw-semibold text-muted">{originalIdx !== -1 ? originalIdx + 1 : ""}</span>
                        );
                      }
                    },
                    {
                      header: "Hạng mục",
                      align: "left",
                      render: (row) => {
                        if (row.isHeader) {
                          return (
                            <span className="fw-bold text-primary text-uppercase" style={{ fontSize: 11, letterSpacing: "0.05em" }}>
                              {row.label}
                            </span>
                          );
                        }
                        return (
                          <span className="fw-semibold text-secondary">{row.label}</span>
                        );
                      }
                    },
                    {
                      header: "Ngân sách",
                      width: 140,
                      align: "right",
                      render: (row) => {
                        if (row.isHeader) {
                          const sumVal = row.id === "section_agency" ? agencySum : advSum;
                          return (
                            <div className="text-end fw-bold text-primary" style={{ paddingRight: 4, fontSize: 12 }}>
                              {sumVal.toLocaleString("vi-VN")} đ
                            </div>
                          );
                        }
                        const alloc = (monthlyAllocations[selectedMonth] || {})[row.id] || { budget: 0, note: "" };
                        return isEditing ? (
                          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <input
                              id={`monthly-budget-input-${row.id}`}
                              type="text"
                              className="form-control form-control-sm text-end fw-semibold"
                              value={alloc.budget ? alloc.budget.toLocaleString("vi-VN") : ""}
                              onChange={(e) => {
                                const val = Number(e.target.value.replace(/\D/g, "")) || 0;
                                handleMonthlyAllocationChange(selectedMonth, row.id, "budget", val);
                              }}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "ArrowDown") {
                                  e.preventDefault();
                                  const idx = BUDGET_CATEGORIES.findIndex(c => c.id === row.id);
                                  if (idx < BUDGET_CATEGORIES.length - 1) {
                                    const nextId = BUDGET_CATEGORIES[idx + 1].id;
                                    const nextInput = document.getElementById(`monthly-budget-input-${nextId}`) as HTMLInputElement | null;
                                    if (nextInput) {
                                      nextInput.focus();
                                      nextInput.select();
                                    }
                                  }
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  const idx = BUDGET_CATEGORIES.findIndex(c => c.id === row.id);
                                  if (idx > 0) {
                                    const prevId = BUDGET_CATEGORIES[idx - 1].id;
                                    const prevInput = document.getElementById(`monthly-budget-input-${prevId}`) as HTMLInputElement | null;
                                    if (prevInput) {
                                      prevInput.focus();
                                      prevInput.select();
                                    }
                                  }
                                }
                              }}
                              style={{ height: 26, fontSize: 12, paddingRight: 16 }}
                              placeholder="0"
                            />
                            <span style={{ position: "absolute", right: 4, fontSize: 10, color: "var(--muted-foreground)", pointerEvents: "none" }}>đ</span>
                          </div>
                        ) : (
                          <div className="text-end fw-semibold" style={{ paddingRight: 4 }}>
                            {alloc.budget ? alloc.budget.toLocaleString("vi-VN") + " đ" : "-"}
                          </div>
                        );
                      }
                    },
                    {
                      header: "Ghi chú",
                      align: "left",
                      render: (row) => {
                        if (row.isHeader) return null;
                        const alloc = (monthlyAllocations[selectedMonth] || {})[row.id] || { budget: 0, note: "" };
                        return isEditing ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={alloc.note || ""}
                            onChange={(e) => handleMonthlyAllocationChange(selectedMonth, row.id, "note", e.target.value)}
                            style={{ height: 26, fontSize: 12 }}
                            placeholder="Ghi chú..."
                          />
                        ) : (
                          <div className="text-muted" style={{ paddingLeft: 4, whiteSpace: "pre-wrap" }}>
                            {alloc.note || "-"}
                          </div>
                        );
                      }
                    }
                  ];

                  return (
                    <Table
                      rows={monthlyTableRows}
                      columns={monthlyAllocColumns}
                      borderless={false}
                      striped={false}
                      compact={true}
                      fontSize={12}
                      rowKey={row => row.id}
                      rowClassName={(row: any) => row.isHeader ? undefined : "app-tbl-row"}
                      wrapperClassName="mkt-plan-table-no-min"
                      wrapperStyle={{
                        marginTop: 4,
                        maxHeight: "calc(100vh - 350px)",
                        overflowY: "auto",
                      }}
                      cellStyle={(row: any, col) => ({
                        padding: col.header === "STT" ? "6px 4px" : "6px 8px",
                        background: row.isHeader ? "var(--muted-background, #f8f9fa)" : undefined,
                      })}
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {currentStep === 3 && (() => {
            const monthStr = String(selectedMonth).padStart(2, "0");
            const lastDayOfMonth = new Date(parseInt(selectedYear, 10) || 2026, selectedMonth, 0).getDate();
            const lastDayStr = String(lastDayOfMonth).padStart(2, "0");

            const weeklyWeeks = [
              { num: 1, range: `01/${monthStr} – 07/${monthStr}` },
              { num: 2, range: `08/${monthStr} – 14/${monthStr}` },
              { num: 3, range: `15/${monthStr} – 21/${monthStr}` },
              { num: 4, range: `22/${monthStr} – ${lastDayStr}/${monthStr}` },
            ];

            const baseRows = [
              {
                id: "section_theme",
                stt: "1",
                category: "Chủ đề tháng",
                name: "CHỦ ĐỀ THÁNG",
                type: "theme_header"
              },
              {
                id: "theme_holiday",
                stt: "",
                category: "Chủ đề tháng",
                name: "NGÀY LỄ",
                type: "theme",
                showPlus: true
              },
              {
                id: "theme_content",
                stt: "",
                category: "Chủ đề tháng",
                name: "NỘI DUNG",
                type: "theme",
                showPlus: true
              },
              {
                id: "theme_product",
                stt: "",
                category: "Chủ đề tháng",
                name: "SẢN PHẨM",
                type: "theme",
                showPlus: false
              },
              {
                id: "section_content",
                stt: "2",
                category: "Content",
                name: "CONTENT",
                type: "section_header",
                colorTheme: "red"
              },
              {
                id: "section_media",
                stt: "3",
                category: "Media",
                name: "MEDIA",
                type: "section_header",
                colorTheme: "blue"
              },
              {
                id: "section_design",
                stt: "4",
                category: "Design",
                name: "DESIGN",
                type: "section_header",
                colorTheme: "blue"
              },
              {
                id: "section_seo",
                stt: "5",
                category: "SEO",
                name: "SEO",
                type: "section_header",
                colorTheme: "blue"
              },
              {
                id: "section_adv",
                stt: "6",
                category: "Quảng cáo",
                name: "QUẢNG CÁO",
                type: "section_header",
                colorTheme: "blue"
              },
              {
                id: "section_pos",
                stt: "7",
                category: "Điểm bán",
                name: "ĐIỂM BÁN",
                type: "section_header",
                colorTheme: "blue"
              }
            ];

            const monthlyWorkRows: any[] = [];
            baseRows.forEach(row => {
              if (isThemeCollapsed && row.type === "theme") {
                return;
              }
              monthlyWorkRows.push(row);
              if (row.type === "section_header") {
                const isSectionCollapsed = collapsedSections.includes(row.id);
                if (!isSectionCollapsed) {
                  const sectionKey = `${row.id}_${selectedMonth}`;
                  const items = sectionContentItems[sectionKey] || [];
                  items.forEach(item => {
                    monthlyWorkRows.push({
                      id: `${row.id}_item_${item.id}`,
                      parentId: row.id,
                      stt: "",
                      name: item.topic || item.pillar || "Nội dung",
                      type: "section_item",
                      colorTheme: row.colorTheme,
                      item: item
                    });
                  });
                }
              }
            });

            const monthlyWorkColumns: TableColumn<any>[] = [
              {
                header: "STT",
                width: 40,
                align: "center",
                render: (row) => {
                  if (row.id === "section_theme" || row.type === "section_header") {
                    const color = row.id === "section_theme"
                      ? "#1e3a8a"
                      : (row.colorTheme === "red" ? "#dc2626" : "#2563eb");
                    const isTheme = row.id === "section_theme";
                    const isCollapsed = isTheme ? isThemeCollapsed : collapsedSections.includes(row.id);
                    return (
                      <div
                        className="d-flex align-items-center justify-content-center gap-1"
                        style={{ color, fontWeight: 700, cursor: "pointer" }}
                        onClick={() => {
                          if (isTheme) {
                            setIsThemeCollapsed(!isThemeCollapsed);
                          } else {
                            setCollapsedSections(prev =>
                              prev.includes(row.id)
                                ? prev.filter(id => id !== row.id)
                                : [...prev, row.id]
                            );
                          }
                        }}
                      >
                        <span>{row.stt}</span>
                        <i
                          className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-down"}`}
                          style={{ fontSize: 9, WebkitTextStroke: "0.5px" }}
                        />
                      </div>
                    );
                  }
                  return null;
                }
              },
              {
                header: "HẠNG MỤC",
                width: 150,
                align: "left",
                render: (row) => {
                  if (row.id === "section_theme") {
                    return (
                      <div className="d-flex align-items-center gap-2" style={{ fontWeight: 800, color: "#1e3a8a", fontSize: 12 }}>
                        <i className="bi bi-star-fill text-primary" style={{ fontSize: 11 }} />
                        <span>CHỦ ĐỀ THÁNG</span>
                      </div>
                    );
                  }
                  if (row.type === "section_header") {
                    const color = row.colorTheme === "red" ? "#dc2626" : "#2563eb";
                    return (
                      <div style={{ fontWeight: 800, color, fontSize: 12, paddingLeft: 8, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <span>{row.name}</span>
                        <i
                          className="bi bi-plus me-2"
                          style={{ fontSize: 16, cursor: "pointer", fontWeight: "bold", color }}
                          onClick={() => {
                            setStep3AddOffcanvasSection(row);
                            setEditingContentItemId(null);
                            setContentPillar("");
                            setContentTopic("");
                            setContentFormat("");
                            setContentChannel("");
                            setContentWeeks([]);
                            let defaultAssignee = "Chu Thị Hằng";
                            if (row.id === "section_media") {
                              defaultAssignee = "Nguyễn Lan Nhi";
                            } else if (row.id === "section_design") {
                              defaultAssignee = "Hoàng Thanh Tú";
                            } else if (row.id === "section_seo" || row.id === "section_adv") {
                              defaultAssignee = "Nguyễn Quốc Việt";
                            } else if (row.id === "section_pos") {
                              defaultAssignee = "Nguyễn Thu Huyền";
                            }
                            setContentAssignee(defaultAssignee);
                            setContentBudget("");
                            setContentDetails("");
                            setContentIsAds(false);
                            setTempDetailedTasks([]);
                            setOffcanvasView("form");
                            setShowStep3AddOffcanvas(true);
                          }}
                        />
                      </div>
                    );
                  }
                  if (row.type === "theme") {
                    return (
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", padding: "0px 0px 0px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ color: "#94a3b8", fontWeight: "bold" }}>•</span>
                          <span style={{ letterSpacing: "0.02em" }}>{row.name}</span>
                        </div>
                        {row.showPlus && (
                          <i
                            className="bi bi-plus text-primary me-2"
                            style={{ fontSize: 16, cursor: "pointer", fontWeight: "bold" }}
                            onClick={() => {
                              if (row.id === "theme_content") {
                                setEditingThemeId(null);
                                setMonthlyThemeTopic("");
                                setMonthlyThemeContent("");
                                setStep3AddOffcanvasSection(row);
                                setShowStep3AddOffcanvas(true);
                              } else if (row.id === "theme_holiday") {
                                setEditingHoliday(null);
                                setNewHolidayName("");
                                const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
                                setNewHolidayDate(defaultDate);
                                setShowHolidayModal(true);
                              }
                            }}
                          />
                        )}
                      </div>
                    );
                  }
                  if (row.type === "section_item") {
                    return (
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", paddingLeft: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#cbd5e1" }}>↳</span>
                      </div>
                    );
                  }
                  return null;
                }
              },
              ...weeklyWeeks.map((wk) => ({
                header: (
                  <div className="d-flex flex-column align-items-center py-1">
                    <span style={{ fontWeight: 800, color: "#1e3a8a", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.02em" }}>Tuần {wk.num}</span>
                    <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", fontWeight: 500, marginTop: 1 }}>{wk.range}</span>
                  </div>
                ),
                width: 220,
                align: "center" as const,
                colSpan: (row: any) => {
                  if (row.id === "theme_content") {
                    return wk.num === 1 ? 4 : 1;
                  }
                  if (row.type === "section_header") {
                    return 1;
                  }
                  if (row.type === "section_item") {
                    const item = row.item;
                    if (!item.weeks || item.weeks.length === 0) return 1;
                    const minWk = Math.min(...item.weeks);
                    const maxWk = Math.max(...item.weeks);

                    if (wk.num === minWk) {
                      return maxWk - minWk + 1;
                    }
                    if (wk.num > minWk && wk.num <= maxWk) {
                      return 0; // merged
                    }
                  }
                  return 1;
                },
                render: (row: any) => {
                  if (row.id === "section_theme" || row.type === "section_header") {
                    return null;
                  }
                  if (row.type === "section_item") {
                    const item = row.item;
                    if (!item.weeks || item.weeks.length === 0) return null;
                    const minWk = Math.min(...item.weeks);
                    const maxWk = Math.max(...item.weeks);

                    if (wk.num === minWk) {
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0px 4px", width: "100%" }}>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setStep3AddOffcanvasSection({
                                id: row.parentId,
                                name: row.parentId === "section_content" ? "CONTENT"
                                  : row.parentId === "section_media" ? "MEDIA"
                                    : row.parentId === "section_design" ? "DESIGN"
                                      : row.parentId === "section_seo" ? "SEO"
                                        : row.parentId === "section_adv" ? "QUẢNG CÁO"
                                          : "ĐIỂM BÁN",
                                type: "section_header",
                                colorTheme: row.colorTheme
                              });
                              setEditingContentItemId(item.id);
                              setContentPillar(item.pillar || "");
                              setContentTopic(item.topic || "");
                              setContentFormat(item.format || "");
                              setContentChannel(item.channel || "");
                              setContentWeeks(item.weeks || []);
                              setContentAssignee(item.assignee || "Chu Thị Hằng");
                              setContentBudget(item.budget || "");
                              setContentDetails(item.details || "");
                              setContentIsAds(item.isAds || false);
                              setTempDetailedTasks(item.detailedTasks || []);
                              setOffcanvasView("form");
                              setShowStep3AddOffcanvas(true);
                            }}
                            style={{
                              background: row.colorTheme === "red" ? "#fff5f5" : "#f0f7ff",
                              border: row.colorTheme === "red" ? "1px solid #fecaca" : "1px solid #bfdbfe",
                              borderRadius: 6,
                              padding: "4px 6px",
                              fontSize: 11,
                              textAlign: "left",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                              transition: "all 0.15s ease",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                            }}
                            className="item-card-hover"
                          >
                            {(item.topic || item.pillar) && (
                              <div style={{ fontWeight: 700, color: row.colorTheme === "red" ? "#b91c1c" : "#1e40af", fontSize: 11.5, wordBreak: "break-word", display: "flex", gap: "6px", alignItems: "flex-start" }}>
                                <div style={{ flex: 1 }}>
                                  {item.topic}
                                  {item.pillar && (
                                    <span style={{ fontWeight: 500, color: "#475569", fontSize: 10.5, marginLeft: 6 }}>
                                      - Tuyến: {item.pillar}
                                    </span>
                                  )}
                                </div>
                                {(row.parentId === "section_media" || row.parentId === "section_adv") && item.details && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedMediaItems(prev =>
                                        prev.includes(item.id)
                                          ? prev.filter(id => id !== item.id)
                                          : [...prev, item.id]
                                      );
                                    }}
                                    style={{
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      marginTop: 2,
                                      color: "#64748b",
                                      padding: "0 2px"
                                    }}
                                  >
                                    <i className={`bi bi-chevron-${expandedMediaItems.includes(item.id) ? "down" : "right"}`} style={{ fontSize: "11px", fontWeight: "bold" }} />
                                  </span>
                                )}
                              </div>
                            )}

                            {(item.assignee || item.budget || item.channel || item.isAds || item.details || (item.detailedTasks && item.detailedTasks.length > 0)) && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 1 }}>
                                <div style={{ display: "flex", gap: 10, fontSize: 10, color: "#64748b", flexWrap: "wrap" }}>
                                  {item.assignee && (
                                    <span className="d-flex align-items-center">
                                      <i className="bi bi-person" style={{ marginRight: 4, fontSize: 11, color: "#64748b" }} />
                                      {item.assignee}
                                    </span>
                                  )}
                                  {item.budget && (
                                    <span className="d-flex align-items-center">
                                      <i className="bi bi-wallet2" style={{ marginRight: 4, fontSize: 11, color: "#64748b" }} />
                                      {typeof item.budget === "number" ? item.budget.toLocaleString("vi-VN") : item.budget}đ
                                    </span>
                                  )}
                                  {item.channel && (
                                    <span className="d-flex align-items-center gap-1" style={{ color: "#2563eb", fontWeight: "600" }}>
                                      <span className="d-flex align-items-center gap-1">
                                        {item.channel.split(",").map((c: string) => c.trim()).map((ch: string) => {
                                          if (ch === "Facebook") {
                                            return <i key={ch} className="bi bi-facebook" style={{ fontSize: 11, color: "#1877f2" }} />;
                                          } else if (ch === "Youtube") {
                                            return <i key={ch} className="bi bi-youtube" style={{ fontSize: 11, color: "#ff0000" }} />;
                                          } else if (ch === "Tiktok") {
                                            return <i key={ch} className="bi bi-tiktok" style={{ fontSize: 11, color: "#000000" }} />;
                                          }
                                          return null;
                                        })}
                                      </span>
                                      <span>Kênh: {item.channel}</span>
                                    </span>
                                  )}
                                  {item.isAds && (
                                    <span className="d-flex align-items-center" style={{ color: "#ea580c", fontWeight: "600" }}>
                                      <i className="bi bi-megaphone" style={{ marginRight: 4, fontSize: 11 }} />
                                      Quảng cáo
                                    </span>
                                  )}
                                  {item.detailedTasks && item.detailedTasks.length > 0 && (() => {
                                    const total = item.detailedTasks.length;
                                    return (
                                      <span className="d-flex align-items-center" style={{ color: "#d97706", fontWeight: "600" }}>
                                        <i className="bi bi-file-earmark-text" style={{ marginRight: 4, fontSize: 11 }} />
                                        Số bài: {total}
                                      </span>
                                    );
                                  })()}
                                </div>
                                {item.details && expandedMediaItems.includes(item.id) && (
                                  <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 3, marginTop: 1, fontSize: 9.5, color: "#475569", lineHeight: "1.35", textAlign: "left", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                    {item.details}
                                  </div>
                                )}
                                {item.detailedTasks && item.detailedTasks.length > 0 && (
                                  <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 3, marginTop: 1, fontSize: 9.5, color: "#475569", lineHeight: "1.35", textAlign: "left", wordBreak: "break-word" }}>
                                    {item.detailedTasks.map((t: any, tidx: number) => {
                                      const isContent = row.parentId === "section_content";
                                      if (isContent) {
                                        const fmt = ["Video", "Hình ảnh", "Bài viết"].includes(t.assignee) ? t.assignee : "Video";
                                        const channels = t.deadline ? t.deadline.split(", ") : [];
                                        return (
                                          <span key={t.id || tidx}>
                                            {tidx > 0 && <span style={{ color: "#cbd5e1", margin: "0 6px" }}>|</span>}
                                            <span>
                                              {t.name}
                                              <span style={{ marginLeft: 3, display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: "middle" }}>
                                                {fmt === "Video" ? (
                                                  <i className="bi bi-play-btn-fill" title="Video" style={{ color: "#1d4ed8", fontSize: 9.5 }} />
                                                ) : fmt === "Hình ảnh" ? (
                                                  <i className="bi bi-image-fill" title="Hình ảnh" style={{ color: "#0d9488", fontSize: 9.5 }} />
                                                ) : (
                                                  <i className="bi bi-file-earmark-text-fill" title="Bài viết" style={{ color: "#059669", fontSize: 9.5 }} />
                                                )}
                                                {channels.map((ch: string) => {
                                                  if (ch === "Facebook") return <i key={ch} className="bi bi-facebook" title="Facebook" style={{ color: "#1877f2", fontSize: 9.5 }} />;
                                                  if (ch === "Tiktok") return <i key={ch} className="bi bi-tiktok" title="Tiktok" style={{ color: "#000", fontSize: 9.5 }} />;
                                                  if (ch === "Youtube") return <i key={ch} className="bi bi-youtube" title="Youtube" style={{ color: "#ff0000", fontSize: 9.5 }} />;
                                                  return null;
                                                })}
                                              </span>
                                            </span>
                                          </span>
                                        );
                                      } else {
                                        const assign = t.assignee || "";
                                        const dl = t.deadline ? t.deadline.split("-").reverse().slice(0, 2).join("/") : "";
                                        const metaText = [assign, dl].filter(Boolean).join(" - ");
                                        return (
                                          <span key={t.id || tidx}>
                                            {tidx > 0 && <span style={{ color: "#cbd5e1", margin: "0 6px" }}>|</span>}
                                            <span>
                                              {t.name}
                                              {metaText && (
                                                <span style={{ color: "#94a3b8", fontSize: 8.5, marginLeft: 3 }}>
                                                  ({metaText})
                                                </span>
                                              )}
                                            </span>
                                          </span>
                                        );
                                      }
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }
                  if (row.type === "theme") {
                    if (row.id === "theme_holiday") {
                      const defaultHolidays = HOLIDAYS_LIST_BY_MONTH[selectedMonth] || [];
                      const monthCustomHolidays = customHolidays
                        .filter(h => h.month === selectedMonth)
                        .map(h => ({ ...h, isCustom: true }));
                      const holidays = [...defaultHolidays, ...monthCustomHolidays];

                      const matching = holidays.filter(h => h.weekNum === wk.num);
                      if (matching.length > 0) {
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start", padding: "2px 4px" }}>
                            {matching.map((h: any, idx) => (
                              <div
                                key={idx}
                                style={{
                                  fontSize: 11,
                                  color: h.isCustom ? "#2563eb" : "#334155",
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 6,
                                  textAlign: "left",
                                  lineHeight: 1.1,
                                  cursor: h.isCustom ? "pointer" : "default"
                                }}
                                onClick={() => {
                                  if (h.isCustom) {
                                    handleEditHoliday(h);
                                  }
                                }}
                                title={h.isCustom ? "Click để sửa hoặc xóa ngày lễ thủ công" : undefined}
                              >
                                <span style={{ color: h.isCustom ? "#3b82f6" : "#94a3b8", fontSize: 10, marginTop: 1 }}>•</span>
                                <span style={{ textDecoration: h.isCustom ? "underline" : "none", textDecorationStyle: "dotted" }}>
                                  <span style={{ fontWeight: 600 }}>{h.dateStr}</span> - {h.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                    }
                    if (row.id === "theme_product") {
                      const currentMonthProducts = monthlyProducts[selectedMonth] || {};
                      const weekProducts = currentMonthProducts[wk.num] || [];

                      return (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: "4px",
                            alignItems: "flex-start",
                            justifyContent: weekProducts.length === 0 ? "center" : "flex-start",
                            minHeight: "24px",
                            padding: "4px 6px",
                            cursor: "pointer",
                            width: "100%",
                            height: "100%"
                          }}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const popoverWidth = 240;
                            const popoverHeight = 320;
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;

                            // Position fixed relative to viewport
                            let top = rect.bottom + 4;
                            let left = rect.left;

                            // If popover overflows the bottom of the screen, render it above the cell
                            if (rect.bottom + popoverHeight > viewportHeight) {
                              top = rect.top - popoverHeight - 4;
                            }

                            // If popover overflows the right edge of the screen, align with the right side of the cell
                            if (rect.left + popoverWidth > viewportWidth) {
                              left = rect.right - popoverWidth;
                            }

                            // Clamp top/left to avoid boundary clipping
                            if (left < 10) left = 10;
                            if (top < 10) top = 10;

                            setPopoverAnchor({ top, left });
                            setActiveProductWeek(wk.num);
                            setTempSelectedProducts(weekProducts);
                            setProductSearchQuery("");
                            setShowProductModal(true);
                          }}
                        >
                          {weekProducts.length === 0 ? (
                            <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", alignSelf: "center", marginTop: 4 }}>
                              + Chọn sản phẩm
                            </span>
                          ) : (
                            weekProducts.map((p, pIdx) => (
                              <span
                                key={pIdx}
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  color: "#2563eb",
                                  backgroundColor: "#eff6ff",
                                  border: "1px solid #dbeafe",
                                  borderRadius: "4px",
                                  padding: "1.5px 5px",
                                  display: "inline-block",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {p}
                              </span>
                            ))
                          )}
                        </div>
                      );
                    }
                    if (row.id === "theme_content") {
                      if (wk.num !== 1) return null;
                      const currentMonthThemes = monthlyThemes.filter(t => t.month === selectedMonth || (!t.month && selectedMonth === 6));
                      if (currentMonthThemes.length === 0) {
                        return (
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", padding: "8px" }}>
                            <span
                              style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", cursor: "pointer" }}
                              onClick={() => {
                                setEditingThemeId(null);
                                setMonthlyThemeTopic("");
                                setMonthlyThemeContent("");
                                setStep3AddOffcanvasSection(row);
                                setShowStep3AddOffcanvas(true);
                              }}
                            >
                              + Thêm chủ đề tháng
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          className="d-flex flex-column gap-0 w-100"
                          style={{ padding: 0 }}
                        >
                          {currentMonthThemes.map((theme, idx) => (
                            <div
                              key={theme.id}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                                alignItems: "flex-start",
                                padding: "12px 16px",
                                borderBottom: idx === monthlyThemes.length - 1 ? "none" : "1px solid #e2e8f0",
                                textAlign: "left",
                                width: "100%",
                                cursor: "pointer",
                                backgroundColor: idx % 2 === 0 ? "#f8fafc" : "#ffffff"
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setStep3AddOffcanvasSection(row);
                                setShowStep3AddOffcanvas(true);
                                setEditingThemeId(theme.id);
                                setMonthlyThemeTopic(theme.topic);
                                setMonthlyThemeContent(theme.content);
                              }}
                            >
                              <div className="d-flex align-items-center gap-2 w-100">
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill" style={{ fontSize: "9.5px", fontWeight: 700, padding: "2px 6px" }}>
                                  {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                {theme.topic && (
                                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#1e293b", flex: 1, whiteSpace: "normal", wordBreak: "break-word" }}>
                                    {theme.topic}
                                  </div>
                                )}
                              </div>
                              {theme.content && (
                                <div className="d-flex flex-column gap-1 w-100" style={{ paddingLeft: "26px" }}>
                                  {theme.content.split("\n").map((line, lIdx) => {
                                    const trimmed = line.trim();
                                    if (!trimmed) return null;
                                    return (
                                      <div key={lIdx} style={{ fontSize: "11px", color: "#475569", display: "flex", alignItems: "flex-start", gap: 6, textAlign: "left", lineHeight: "1.4" }}>
                                        <span style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>•</span>
                                        <span style={{ whiteSpace: "normal", wordBreak: "break-word", flex: 1 }}>
                                          {trimmed}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }
                  const currentAssign = editedWeeklyAssign[row.id] || [false, false, false, false];
                  const isAssigned = currentAssign[wk.num - 1];

                  return (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newAssign = [...currentAssign];
                          newAssign[wk.num - 1] = !isAssigned;
                          setEditedWeeklyAssign(prev => ({
                            ...prev,
                            [row.id]: newAssign
                          }));
                        }}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          border: isAssigned ? "none" : "1px solid #cbd5e1",
                          backgroundColor: isAssigned ? "var(--primary)" : "#fff",
                          color: isAssigned ? "#fff" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                        title={`Chọn/Bỏ chọn Tuần ${wk.num}`}
                      >
                        <i className="bi bi-check-lg" style={{ fontSize: 12, display: isAssigned ? "block" : "none" }} />
                      </button>
                    </div>
                  );
                }
              }))
            ];

            return (
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, width: "100%" }}>
                <div className="mkt-step3-header">
                  {/* Left: Year Select */}
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Năm kế hoạch</span>
                    <select
                      className="form-select form-select-sm fw-bold"
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                      style={{ fontSize: 12, height: 30, width: 85, borderRadius: 6, borderColor: "var(--border)", cursor: "pointer" }}
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success d-flex align-items-center justify-content-center"
                      title="Lưu thay đổi"
                      onClick={handleSave}
                      style={{
                        height: 30,
                        width: 30,
                        padding: 0,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <i className="bi bi-floppy" style={{ fontSize: 12 }} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center"
                      title="In kế hoạch"
                      onClick={() => {
                        setMonthlyPlanData(getLatestMonthlyPlanData());
                        setShowMonthlyPlanPrintModal(true);
                      }}
                      style={{
                        height: 30,
                        width: 30,
                        padding: 0,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <i className="bi bi-printer" style={{ fontSize: 12 }} />
                    </button>
                    {(() => {
                      const mStatus = masterPlanData?.mkt_monthly_plans?.[selectedMonth]?.status || "draft";
                      if (mStatus === "draft") return null;
                      return (
                        <span className={`badge bg-${
                          mStatus === "approved" ? "success" :
                          mStatus === "pending" ? "warning text-dark" :
                          mStatus === "rejected" ? "danger" : "secondary"
                        } d-flex align-items-center`} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>
                          {mStatus === "approved" ? "Kế hoạch đã duyệt" :
                           mStatus === "pending" ? "Kế hoạch chờ duyệt" :
                           mStatus === "rejected" ? "Kế hoạch bị từ chối" : ""}
                        </span>
                      );
                    })()}
                     <button
                      type="button"
                      className="btn btn-sm btn-outline-info d-flex align-items-center justify-content-center"
                      title="Gửi duyệt kế hoạch"
                      onClick={handleSubmitMonthlyPlan}
                      disabled={isSubmittingMonthlyPlan}
                      style={{
                        height: 30,
                        width: 30,
                        padding: 0,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {isSubmittingMonthlyPlan ? (
                        <span className="spinner-border spinner-border-sm text-info" role="status" aria-hidden="true" style={{ width: "12px", height: "12px" }} />
                      ) : (
                        <i className="bi bi-send" style={{ fontSize: 12 }} />
                      )}
                    </button>
                  </div>

                  {/* Right: Month Selector Timeline */}
                  {/* Right: Month Selector Timeline */}
                  <div className="mkt-month-timeline">
                    {/* Connecting Line */}
                    <div className="mkt-month-line" />

                    {/* Month Buttons Container */}
                    <div className="mkt-month-container">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                        const isActive = m === selectedMonth;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setSelectedMonth(m)}
                            className={`mkt-month-btn ${isActive ? "active" : ""}`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Table Content Area */}
                <div style={{ background: "#fff", padding: "0px 0 20px 0", minWidth: 0, width: "100%", overflowX: "hidden" }}>
                  <Table
                    rows={monthlyWorkRows}
                    columns={monthlyWorkColumns}
                    loading={loadingMasterPlan}
                    borderless={false}
                    striped={false}
                    compact={true}
                    fontSize={13}
                    rowKey={row => row.id}
                    wrapperClassName="mkt-plan-table-no-min"
                    wrapperStyle={{ maxHeight: "calc(100vh - 290px)", overflow: "auto" }}
                    rowStyle={() => ({ background: "#fff" })}
                    cellStyle={(row, col) => {
                      let bg = "#fff";
                      if (row.id === "section_theme") {
                        bg = "#f0f4f8";
                      } else if (row.type === "section_header") {
                        bg = row.colorTheme === "red" ? "#fef2f2" : "#f0f4f8";
                      } else if (row.type === "section_item") {
                        bg = "#ffffff";
                      }

                      const isThemeRow = row.type === "theme" || row.type === "theme_header" || row.id === "section_theme";
                      const isItemRow = row.type === "section_item";
                      const style: React.CSSProperties = {
                        background: bg,
                        padding: isThemeRow ? "2px 4px" : isItemRow ? "0.5px 8px" : "4px 8px",
                        verticalAlign: "top"
                      };
                      if (isItemRow) {
                        style.borderBottom = "none";
                      }
                      if (col.header === "STT") {
                        style.width = 40;
                        style.minWidth = 40;
                        style.maxWidth = 40;
                      } else if (col.header === "HẠNG MỤC") {
                        style.width = 150;
                        style.minWidth = 150;
                        style.maxWidth = 150;
                      } else if (typeof col.header === "object") {
                        style.width = 220;
                        style.minWidth = 220;
                        style.maxWidth = 220;
                      }
                      return style;
                    }}
                    stickyHeader={true}
                    renderHeader={() => (
                      <tr style={{ borderBottom: "1.5px solid var(--border)" }}>
                        <th
                          colSpan={2}
                          style={{
                            padding: "6px 8px 6px 0px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "var(--muted-foreground)",
                            borderBottom: "1.5px solid var(--border)",
                            whiteSpace: "nowrap",
                            verticalAlign: "middle",
                            position: "sticky",
                            top: 0,
                            zIndex: 20,
                            background: "#ffffff",
                            width: 190,
                            minWidth: 190,
                            maxWidth: 190
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <span style={{ width: 40, display: "inline-block", textAlign: "center", color: "var(--muted-foreground)", fontWeight: 700, fontSize: 11 }}>#</span>
                            <span style={{ color: "var(--muted-foreground)", fontWeight: 700, fontSize: 11, letterSpacing: "0.06em" }}>CÔNG VIỆC</span>
                          </div>
                        </th>
                        {weeklyWeeks.map((wk) => (
                          <th
                            key={wk.num}
                            style={{
                              padding: "6px 8px 4px 8px",
                              textAlign: "center",
                              verticalAlign: "middle",
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "var(--muted-foreground)",
                              borderBottom: "1.5px solid var(--border)",
                              whiteSpace: "nowrap",
                              width: 220,
                              position: "sticky",
                              top: 0,
                              zIndex: 20,
                              background: "#ffffff"
                            }}
                          >
                            <div className="d-flex flex-column align-items-center">
                              <span style={{ fontWeight: 800, color: "#1e3a8a", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>TUẦN {wk.num}</span>
                              <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", fontWeight: 500, marginTop: 2 }}>{wk.range}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    )}
                  />
                </div>
              </div>
            );
          })()}
        </WorkflowCard>
      </div>

      {showAddOffcanvas && (
        <>
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => setShowAddOffcanvas(false)}
            style={{ zIndex: 1040 }}
          />
          <div
            className="offcanvas offcanvas-end show"
            tabIndex={-1}
            style={{
              visibility: "visible",
              width: 400,
              zIndex: 1050,
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              borderLeft: "1px solid var(--border)",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              height: "100%"
            }}
          >
            <div className="offcanvas-header d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px", flexShrink: 0 }}>
              <h5 className="offcanvas-title fw-bold text-uppercase" style={{ fontSize: 13, color: "var(--primary)", letterSpacing: "0.04em" }}>
                {editingContentPlanId ? "Sửa Tuyến Nội Dung" : "Thêm Tuyến Nội Dung"}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowAddOffcanvas(false);
                  setEditingContentPlanId(null);
                }}
                aria-label="Close"
                style={{ fontSize: 12 }}
              />
            </div>
            <div className="offcanvas-body d-flex flex-column gap-2" style={{ padding: "20px", overflowY: "auto", flex: "1 1 auto" }}>
              <div
                className="p-3 rounded-3"
                style={{
                  background: "#f8f9fa",
                  border: "1px solid var(--border)",
                  borderRadius: "6px"
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2" style={{ borderBottom: "1px dashed var(--border)" }}>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>Ngân sách phân bổ:</span>
                  <span className="fw-bold" style={{ fontSize: 13, color: "var(--primary)" }}>{valBranding.toLocaleString("vi-VN")} đồng</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>Đã sử dụng:</span>
                  <span className="fw-bold" style={{ fontSize: 13, color: "var(--foreground)" }}>{totalPlanBudget.toLocaleString("vi-VN")} đồng</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Tuyến nội dung</label>
                <input
                  type="text"
                  id="offcanvas-pillar-input"
                  className="form-control form-control-sm"
                  value={offcanvasData.pillar}
                  onChange={(e) => setOffcanvasData(prev => ({ ...prev, pillar: e.target.value }))}
                  style={{ fontSize: 13 }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Vai trò</label>
                <textarea
                  rows={2}
                  className="form-control form-control-sm"
                  value={offcanvasData.role}
                  onChange={(e) => setOffcanvasData(prev => ({ ...prev, role: e.target.value }))}
                  style={{ fontSize: 13, resize: "none" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Mục đích</label>
                <textarea
                  rows={2}
                  className="form-control form-control-sm"
                  value={offcanvasData.purpose}
                  onChange={(e) => setOffcanvasData(prev => ({ ...prev, purpose: e.target.value }))}
                  style={{ fontSize: 13, resize: "none" }}
                />
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Tỷ lệ ngân sách (%)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm text-end"
                      value={offcanvasData.ratioStr}
                      onChange={(e) => {
                        const ratioInput = e.target.value;
                        if (/^[0-9]*[.,]?[0-9]*$/.test(ratioInput)) {
                          const parsedRatio = parseFloat(ratioInput.replace(",", ".")) || 0;
                          const calculatedBudget = Math.round((parsedRatio / 100) * valBranding);
                          setOffcanvasData(prev => ({
                            ...prev,
                            ratioStr: ratioInput,
                            budget: calculatedBudget
                          }));
                        }
                      }}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>

                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Ngân sách (đ)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm text-end"
                      value={offcanvasData.budget ? offcanvasData.budget.toLocaleString("vi-VN") : ""}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/\D/g, "");
                        const num = Number(cleanValue) || 0;
                        if (cleanValue === "") {
                          setOffcanvasData(prev => ({
                            ...prev,
                            budget: 0,
                            ratioStr: ""
                          }));
                        } else {
                          const calculatedRatio = valBranding > 0 ? (num / valBranding) * 100 : 0;
                          const ratioStr = calculatedRatio > 0 ? calculatedRatio.toFixed(2).replace(/\.?0+$/, "") : "0";
                          setOffcanvasData(prev => ({
                            ...prev,
                            budget: num,
                            ratioStr: ratioStr
                          }));
                        }
                      }}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group d-flex flex-column" style={{ flex: "1 1 auto", minHeight: 120 }}>
                <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Nội dung chi tiết</label>
                <textarea
                  id="offcanvas-details-input"
                  className="form-control form-control-sm flex-grow-1"
                  value={offcanvasData.details}
                  onChange={(e) => setOffcanvasData(prev => ({ ...prev, details: e.target.value }))}
                  style={{ fontSize: 13, resize: "none", height: "100%", overflowY: "auto" }}
                />
              </div>
            </div>

            <div className="offcanvas-footer border-top p-3 d-flex gap-2" style={{ background: "#f8f9fa", flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-sm btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={() => {
                  if (!offcanvasData.pillar.trim()) {
                    toast.warning("Cảnh báo", "Vui lòng nhập Tuyến nội dung!");
                    return;
                  }

                  if (editingContentPlanId) {
                    setEditedContentPlan(prev => {
                      const parentRow = contentPlanList.find(r => r.id === editingContentPlanId);
                      const currentDetails = prev[editingContentPlanId]?.details ?? parentRow?.details ?? "";
                      const { children } = parseParentDetails(currentDetails);
                      const serialized = JSON.stringify({
                        description: offcanvasData.details.trim() || "Nội dung chi tiết...",
                        children
                      });

                      return {
                        ...prev,
                        [editingContentPlanId]: {
                          pillar: offcanvasData.pillar.trim(),
                          purpose: offcanvasData.purpose.trim(),
                          role: offcanvasData.role.trim(),
                          details: serialized,
                          budget: offcanvasData.budget,
                          postsCount: offcanvasData.postsCount,
                          ratioStr: offcanvasData.ratioStr
                        }
                      };
                    });
                    toast.success("Thành công", "Đã cập nhật tuyến nội dung!");
                  } else {
                    const newId = `cp_custom_${Date.now()}`;
                    setCustomContentPlanIds(prev => [...prev, newId]);
                    setEditedContentPlan(prev => {
                      const serialized = JSON.stringify({
                        description: offcanvasData.details.trim() || "Nội dung chi tiết...",
                        children: []
                      });

                      return {
                        ...prev,
                        [newId]: {
                          pillar: offcanvasData.pillar.trim(),
                          purpose: offcanvasData.purpose.trim(),
                          role: offcanvasData.role.trim(),
                          details: serialized,
                          budget: offcanvasData.budget,
                          postsCount: offcanvasData.postsCount,
                          ratioStr: offcanvasData.ratioStr
                        }
                      };
                    });
                    toast.success("Thành công", "Đã thêm tuyến nội dung mới!");
                  }

                  setShowAddOffcanvas(false);
                  setEditingContentPlanId(null);
                }}
                style={{ height: 36, fontSize: 13, fontWeight: 600 }}
              >
                {editingContentPlanId ? (
                  <>
                    <i className="bi bi-floppy" /> Lưu thay đổi
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-lg" /> Thêm mới
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={() => {
                  setShowAddOffcanvas(false);
                  setEditingContentPlanId(null);
                }}
                style={{ height: 36, fontSize: 13, fontWeight: 600 }}
              >
                Hủy
              </button>
            </div>
          </div>
        </>
      )}

      {showAdOffcanvas && (
        <>
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => {
              setShowAdOffcanvas(false);
              setEditingAdPlanId(null);
            }}
            style={{ zIndex: 1040 }}
          />
          <div
            className="offcanvas offcanvas-end show"
            tabIndex={-1}
            style={{
              visibility: "visible",
              width: 400,
              zIndex: 1050,
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              borderLeft: "1px solid var(--border)",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              height: "100%"
            }}
          >
            <div className="offcanvas-header d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px", flexShrink: 0 }}>
              <h5 className="offcanvas-title fw-bold text-uppercase" style={{ fontSize: 13, color: "var(--primary)", letterSpacing: "0.04em" }}>
                {editingAdPlanId ? "Sửa Mục Tiêu Quảng Cáo" : "Thêm Mục Tiêu Quảng Cáo"}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowAdOffcanvas(false);
                  setEditingAdPlanId(null);
                }}
                aria-label="Close"
                style={{ fontSize: 12 }}
              />
            </div>
            <div className="offcanvas-body d-flex flex-column gap-3" style={{ padding: "20px", overflowY: "auto", flex: "1 1 auto", height: "100%" }}>
              <div className="form-group flex-shrink-0">
                <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Mục tiêu</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={adOffcanvasData.objective}
                  onChange={(e) => setAdOffcanvasData(prev => ({ ...prev, objective: e.target.value }))}
                  style={{ fontSize: 13 }}
                  placeholder="Nhập mục tiêu chiến dịch..."
                  required
                />
              </div>

              <div className="form-group flex-shrink-0">
                <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Chủ đề</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={adOffcanvasData.topic}
                  onChange={(e) => setAdOffcanvasData(prev => ({ ...prev, topic: e.target.value }))}
                  style={{ fontSize: 13 }}
                  placeholder="Nhập chủ đề..."
                />
              </div>

              <div className="form-group flex-shrink-0 position-relative">
                <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Khu vực quảng cáo</label>
                <div
                  className="form-control form-control-sm d-flex align-items-center justify-content-between cursor-pointer"
                  onClick={() => setShowProvinceDropdown(prev => !prev)}
                  style={{ fontSize: 13, background: "#fff", minHeight: 31, height: "auto", padding: "4px 8px" }}
                >
                  <span style={{ color: adOffcanvasData.region ? "var(--foreground)" : "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90%" }}>
                    {adOffcanvasData.region || "Chọn khu vực/tỉnh thành..."}
                  </span>
                  <i className={`bi bi-chevron-${showProvinceDropdown ? "up" : "down"}`} style={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                </div>

                {showProvinceDropdown && (
                  <>
                    <div
                      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1060 }}
                      onClick={() => setShowProvinceDropdown(false)}
                    />
                    <div
                      className="rounded-3 shadow-lg border"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: "#fff",
                        zIndex: 1070,
                        maxHeight: 250,
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid var(--border)",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)"
                      }}
                    >
                      {/* Search box */}
                      <div className="p-2 border-bottom flex-shrink-0" style={{ background: "#f8f9fa" }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Tìm kiếm tỉnh thành..."
                          value={provinceSearch}
                          onChange={(e) => setProvinceSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 12 }}
                        />
                      </div>
                      {/* List */}
                      <div className="custom-scrollbar" style={{ overflowY: "auto", flexGrow: 1, padding: "4px 0" }}>
                        {VIETNAM_PROVINCES.filter(p => p.toLowerCase().includes(provinceSearch.toLowerCase())).map((province) => {
                          const selectedList = adOffcanvasData.region ? adOffcanvasData.region.split(", ").map(s => s.trim()) : [];
                          const isChecked = selectedList.includes(province);
                          return (
                            <div
                              key={province}
                              className="d-flex align-items-center gap-2 px-3 py-1.5 hover-bg-light cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                let newList: string[];
                                if (province === "Toàn quốc") {
                                  newList = isChecked ? [] : ["Toàn quốc"];
                                } else {
                                  // remove Toàn quốc if selecting individual province
                                  const listWithoutAll = selectedList.filter(s => s !== "Toàn quốc");
                                  if (isChecked) {
                                    newList = listWithoutAll.filter(s => s !== province);
                                  } else {
                                    newList = [...listWithoutAll, province];
                                  }
                                }
                                setAdOffcanvasData(prev => ({
                                  ...prev,
                                  region: newList.join(", ")
                                }));
                              }}
                              style={{
                                fontSize: 12.5,
                                padding: "6px 12px",
                                transition: "background 0.1s"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => { }} // handled by parent onClick
                                style={{ cursor: "pointer", width: 14, height: 14 }}
                              />
                              <span style={{ color: isChecked ? "var(--primary)" : "var(--foreground)", fontWeight: isChecked ? 600 : 400 }}>{province}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="form-group flex-shrink-0">
                <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Người thực hiện</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={adOffcanvasData.assignee}
                  onChange={(e) => setAdOffcanvasData(prev => ({ ...prev, assignee: e.target.value }))}
                  style={{ fontSize: 13 }}
                  placeholder="Nhập tên người thực hiện..."
                />
              </div>

              <div className="row g-2 flex-shrink-0">
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Từ ngày</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={adOffcanvasData.startDate}
                      onChange={(e) => setAdOffcanvasData(prev => ({ ...prev, startDate: e.target.value }))}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label text-uppercase fw-bold" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Đến ngày</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={adOffcanvasData.endDate}
                      onChange={(e) => setAdOffcanvasData(prev => ({ ...prev, endDate: e.target.value }))}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group d-flex flex-column flex-grow-1" style={{ minHeight: 150 }}>
                <label className="form-label text-uppercase fw-bold flex-shrink-0" style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>Đối tượng tiếp cận</label>
                <textarea
                  className="form-control form-control-sm flex-grow-1"
                  value={adOffcanvasData.audience}
                  onChange={(e) => setAdOffcanvasData(prev => ({ ...prev, audience: e.target.value }))}
                  style={{ fontSize: 13, resize: "none", height: "100%" }}
                  placeholder="Mô tả đối tượng tiếp cận..."
                />
              </div>
            </div>

            <div className="offcanvas-footer border-top p-3 d-flex gap-2" style={{ background: "#f8f9fa", flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-sm btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={handleSaveAdOffcanvas}
                style={{ height: 32, fontSize: 12, fontWeight: 600 }}
              >
                Lưu lại
              </button>
            </div>
          </div>
        </>
      )}

      {showDetailsOffcanvas && detailsParentId && (
        <>
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => {
              setShowDetailsOffcanvas(false);
              setDetailsParentId(null);
              setEditingChildId(null);
              setChildRowPillar("");
              setChildRowDetails("");
              setChildRowRatioStr("");
              setChildRowPostsCount("");
            }}
            style={{ zIndex: 1040 }}
          />
          <div
            className="offcanvas offcanvas-end show"
            tabIndex={-1}
            style={{
              visibility: "visible",
              width: 400,
              zIndex: 1050,
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              borderLeft: "1px solid var(--border)",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              height: "100%"
            }}
          >
            <div className="offcanvas-header d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px", flexShrink: 0 }}>
              <h5 className="offcanvas-title fw-bold text-uppercase" style={{ fontSize: 13, color: "var(--primary)", letterSpacing: "0.04em" }}>
                {editingChildId ? "Sửa nội dung chi tiết" : "Thêm nội dung chi tiết"}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowDetailsOffcanvas(false);
                  setDetailsParentId(null);
                  setEditingChildId(null);
                  setChildRowPillar("");
                  setChildRowDetails("");
                  setChildRowRatioStr("");
                  setChildRowPostsCount("");
                }}
                aria-label="Close"
                style={{ fontSize: 12 }}
              />
            </div>
            <div className="offcanvas-body d-flex flex-column gap-3" style={{ padding: "20px", overflowY: "auto", flex: "1 1 auto" }}>
              <div>
                <span className="text-secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                  Tuyến nội dung được chọn:
                </span>
                <span className="fw-semibold text-dark" style={{ fontSize: "14px" }}>
                  {(() => {
                    const parentRow = contentPlanList.find(r => r.id === detailsParentId);
                    return parentRow ? parentRow.pillar : "Chưa đặt tên";
                  })()}
                </span>
              </div>

              <div>
                <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                  Nội dung chính
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập nội dung chính..."
                  value={childRowPillar}
                  onChange={(e) => setChildRowPillar(e.target.value)}
                  style={{
                    fontSize: "13px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "8px 10px"
                  }}
                />
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                    Tỷ lệ ngân sách (%)
                  </label>
                  <input
                    type="text"
                    className="form-control text-end"
                    placeholder="0"
                    value={childRowRatioStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                        setChildRowRatioStr(val);
                      }
                    }}
                    style={{
                      fontSize: "13px",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "8px 10px"
                    }}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                    Số bài
                  </label>
                  <input
                    type="number"
                    className="form-control text-end"
                    placeholder="0"
                    value={childRowPostsCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setChildRowPostsCount("");
                      } else {
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed) && parsed >= 0) {
                          setChildRowPostsCount(parsed);
                        }
                      }
                    }}
                    style={{
                      fontSize: "13px",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "8px 10px"
                    }}
                  />
                </div>
              </div>

              <div className="d-flex flex-column flex-grow-1">
                <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                  Nội dung chi tiết
                </label>
                <textarea
                  className="form-control flex-grow-1"
                  placeholder="Nhập các dòng nội dung chi tiết tại đây. Mỗi dòng sẽ được hiển thị dạng một đầu mục có dấu chấm tròn lùi vào dưới nội dung chính."
                  value={childRowDetails}
                  onChange={(e) => setChildRowDetails(e.target.value)}
                  style={{
                    fontSize: "13px",
                    resize: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "10px",
                    flexGrow: 1,
                    minHeight: "200px"
                  }}
                />
              </div>
            </div>
            <div className="offcanvas-footer p-3 border-top d-flex gap-2 bg-light" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-sm btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={handleSaveDetails}
                style={{ height: 36, fontSize: 13, fontWeight: 600 }}
              >
                <i className="bi bi-floppy" /> Lưu lại
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={() => {
                  setShowDetailsOffcanvas(false);
                  setDetailsParentId(null);
                  setEditingChildId(null);
                  setChildRowPillar("");
                  setChildRowDetails("");
                  setChildRowRatioStr("");
                  setChildRowPostsCount("");
                }}
                style={{ height: 36, fontSize: 13, fontWeight: 600 }}
              >
                Hủy
              </button>
            </div>
          </div>
        </>
      )}

      {showAdDetailsOffcanvas && adDetailsParentId && (
        <>
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => {
              setShowAdDetailsOffcanvas(false);
              setAdDetailsParentId(null);
              setAdEditingChildId(null);
              setAdChildRowPillar("");
              setAdChildRowDetails("");
              setAdChildRowBudgetStr("");
              setAdChildRowChannel("");
              setAdChildRowLandingPage("");
            }}
            style={{ zIndex: 1040 }}
          />
          <div
            className="offcanvas offcanvas-end show"
            tabIndex={-1}
            style={{
              visibility: "visible",
              width: 400,
              zIndex: 1050,
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              borderLeft: "1px solid var(--border)",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              height: "100%"
            }}
          >
            <div className="offcanvas-header d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px", flexShrink: 0 }}>
              <h5 className="offcanvas-title fw-bold text-uppercase" style={{ fontSize: 13, color: "var(--primary)", letterSpacing: "0.04em" }}>
                {adEditingChildId ? "Sửa nội dung chi tiết" : "Thêm nội dung chi tiết"}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowAdDetailsOffcanvas(false);
                  setAdDetailsParentId(null);
                  setAdEditingChildId(null);
                  setAdChildRowPillar("");
                  setAdChildRowDetails("");
                  setAdChildRowBudgetStr("");
                  setAdChildRowChannel("");
                  setAdChildRowLandingPage("");
                }}
                aria-label="Close"
                style={{ fontSize: 12 }}
              />
            </div>
            <div className="offcanvas-body d-flex flex-column gap-3" style={{ padding: "20px", overflowY: "auto", flex: "1 1 auto" }}>
              <div>
                <span className="text-secondary" style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                  Mục tiêu được chọn:
                </span>
                <span className="fw-semibold text-dark text-uppercase" style={{ fontSize: "14px" }}>
                  {(() => {
                    const parentRow = adPlanList.find(r => r.id === adDetailsParentId);
                    return parentRow ? parentRow.objective : "Chưa đặt tên";
                  })()}
                </span>
              </div>

              <div>
                <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                  Kênh quảng cáo
                </label>
                <select
                  className="form-select"
                  value={adChildRowPillar}
                  onChange={(e) => setAdChildRowPillar(e.target.value)}
                  style={{
                    fontSize: "13px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "8px 10px"
                  }}
                >
                  <option value="">Chọn kênh quảng cáo...</option>
                  <option value="Quảng cáo Facebook">Quảng cáo Facebook</option>
                  <option value="Quảng cáo Tiktok">Quảng cáo Tiktok</option>
                  <option value="Quảng cáo Youtube">Quảng cáo Youtube</option>
                  <option value="Quảng cáo Google Ads">Quảng cáo Google Ads</option>
                  <option value="Quảng cáo Google Brading">Quảng cáo Google Brading</option>
                </select>
              </div>

              <div className="row g-2">
                <div className="col-5">
                  <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                    Ngân sách (đ)
                  </label>
                  <input
                    type="text"
                    className="form-control text-end"
                    placeholder="0"
                    value={adChildRowBudgetStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      const num = Number(raw) || 0;
                      setAdChildRowBudgetStr(num > 0 ? num.toLocaleString("vi-VN") : "");
                    }}
                    style={{
                      fontSize: "13px",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "8px 10px"
                    }}
                  />
                </div>
                <div className="col-7">
                  <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                    Hình thức
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập hình thức..."
                    value={adChildRowChannel}
                    onChange={(e) => setAdChildRowChannel(e.target.value)}
                    style={{
                      fontSize: "13px",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "8px 10px"
                    }}
                  />
                </div>
              </div>

              <div className="d-flex flex-column">
                <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                  Danh sách trang đích
                </label>
                <textarea
                  className="form-control"
                  placeholder="Nhập danh sách trang đích (mỗi trang một dòng)..."
                  value={adChildRowLandingPage}
                  onChange={(e) => setAdChildRowLandingPage(e.target.value)}
                  style={{
                    fontSize: "13px",
                    resize: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "10px",
                    minHeight: "120px"
                  }}
                />
              </div>

              <div className="d-flex flex-column flex-grow-1">
                <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                  Nội dung chi tiết
                </label>
                <textarea
                  className="form-control flex-grow-1"
                  placeholder="Nhập các dòng nội dung chi tiết tại đây. Mỗi dòng sẽ được hiển thị dạng một đầu mục có dấu chấm tròn lùi vào dưới nội dung chính."
                  value={adChildRowDetails}
                  onChange={(e) => setAdChildRowDetails(e.target.value)}
                  style={{
                    fontSize: "13px",
                    resize: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "10px",
                    minHeight: "150px",
                    flex: 1
                  }}
                />
              </div>
            </div>
            <div className="offcanvas-footer p-3 border-top d-flex gap-2 bg-light" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-sm btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={handleSaveAdDetails}
                style={{ height: 36, fontSize: 13, fontWeight: 600 }}
              >
                <i className="bi bi-floppy" /> Lưu lại
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={() => {
                  setShowAdDetailsOffcanvas(false);
                  setAdDetailsParentId(null);
                  setAdEditingChildId(null);
                  setAdChildRowPillar("");
                  setAdChildRowDetails("");
                  setAdChildRowBudgetStr("");
                  setAdChildRowChannel("");
                  setAdChildRowLandingPage("");
                }}
                style={{ height: 36, fontSize: 13, fontWeight: 600 }}
              >
                Hủy
              </button>
            </div>
          </div>
        </>
      )}

      {showStep3AddOffcanvas && step3AddOffcanvasSection && (
        <>
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => {
              setShowStep3AddOffcanvas(false);
              setStep3AddOffcanvasSection(null);
            }}
            style={{ zIndex: 1040 }}
          />
          <div
            className="offcanvas offcanvas-end show"
            tabIndex={-1}
            style={{
              visibility: "visible",
              width: 400,
              zIndex: 1050,
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
              borderLeft: "1px solid var(--border)",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              height: "100%"
            }}
          >
            <div className="offcanvas-header d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px", flexShrink: 0 }}>
              {offcanvasView === "tasks" ? (
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center gap-1"
                    onClick={() => setOffcanvasView("form")}
                    style={{ color: "#475569", fontWeight: 600, border: "none", background: "transparent", fontSize: 13 }}
                  >
                    <i className="bi bi-arrow-left" style={{ fontSize: 14 }} /> Quay lại
                  </button>
                  <span style={{ color: "#cbd5e1" }}>|</span>
                  <h5 className="offcanvas-title fw-bold text-uppercase" style={{ fontSize: 13, color: "#2563eb", letterSpacing: "0.04em", margin: 0 }}>
                    Công việc chi tiết
                  </h5>
                </div>
              ) : (
                <h5 className="offcanvas-title fw-bold text-uppercase" style={{ fontSize: 13, color: step3AddOffcanvasSection.id === "theme_content" ? "#2563eb" : (step3AddOffcanvasSection.colorTheme === "red" ? "#dc2626" : "#2563eb"), letterSpacing: "0.04em" }}>
                  {editingContentItemId ? "Sửa" : "Thêm"} nội dung: {step3AddOffcanvasSection.name}
                </h5>
              )}
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowStep3AddOffcanvas(false);
                  setStep3AddOffcanvasSection(null);
                }}
                aria-label="Close"
                style={{ fontSize: 12 }}
              />
            </div>
            <div className="offcanvas-body d-flex flex-column gap-3" style={{ padding: "20px", overflowY: "auto", flex: "1 1 auto" }}>
              {offcanvasView === "tasks" ? (
                <>
                  <div style={{ margin: 0, padding: 0 }}>
                    <h6 className="fw-bold mb-3 text-start" style={{ fontSize: 12, color: "#475569" }}>THÊM CÔNG VIỆC MỚI</h6>
                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex flex-column gap-1 text-start">
                        <label className="form-label fw-semibold text-secondary mb-0" style={{ fontSize: "11px" }}>
                          Tên công việc
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Nhập tên công việc..."
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          style={{ fontSize: "12px", borderRadius: "6px" }}
                        />
                      </div>
                      <div className="d-flex gap-2">
                        <div className="d-flex flex-column gap-1 text-start" style={{ flex: 1 }}>
                          <label className="form-label fw-semibold text-secondary mb-0" style={{ fontSize: "11px" }}>
                            {step3AddOffcanvasSection?.id === "section_content" ? "Hình thức" : "Người thực hiện"}
                          </label>
                          {step3AddOffcanvasSection?.id === "section_content" ? (
                            <select
                              className="form-select form-select-sm"
                              value={newTaskAssignee}
                              onChange={(e) => setNewTaskAssignee(e.target.value)}
                              style={{ fontSize: "12px", borderRadius: "6px" }}
                            >
                              <option value="Video">Video</option>
                              <option value="Hình ảnh">Hình ảnh</option>
                              <option value="Bài viết">Bài viết</option>
                            </select>
                          ) : (
                            <select
                              className="form-select form-select-sm"
                              value={newTaskAssignee}
                              onChange={(e) => setNewTaskAssignee(e.target.value)}
                              style={{ fontSize: "12px", borderRadius: "6px" }}
                            >
                              <option value="Chu Thị Hằng">Chu Thị Hằng</option>
                              <option value="Nguyễn Lan Nhi">Nguyễn Lan Nhi</option>
                              <option value="Hoàng Thanh Tú">Hoàng Thanh Tú</option>
                              <option value="Nguyễn Quốc Việt">Nguyễn Quốc Việt</option>
                              <option value="Nguyễn Thu Huyền">Nguyễn Thu Huyền</option>
                            </select>
                          )}
                        </div>
                        {step3AddOffcanvasSection?.id === "section_content" ? (
                          <div className="d-flex flex-column gap-1 text-start" style={{ flex: 1 }}>
                            <label className="form-label fw-semibold text-secondary mb-0" style={{ fontSize: "11px" }}>
                              Kênh
                            </label>
                            <div className="d-flex align-items-center gap-2 flex-wrap" style={{ marginTop: "4px" }}>
                              {["Facebook", "Tiktok", "Youtube"].map((ch) => {
                                const isChecked = newTaskChannels.includes(ch);
                                return (
                                  <label key={ch} className="d-flex align-items-center gap-1 mb-0" style={{ fontSize: "11px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                                    <input
                                      type="checkbox"
                                      className="form-check-input mt-0"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setNewTaskChannels(newTaskChannels.filter((c) => c !== ch));
                                        } else {
                                          setNewTaskChannels([...newTaskChannels, ch]);
                                        }
                                      }}
                                      style={{ width: 13, height: 13, cursor: "pointer" }}
                                    />
                                    <span>{ch}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-1 text-start" style={{ flex: 1 }}>
                            <label className="form-label fw-semibold text-secondary mb-0" style={{ fontSize: "11px" }}>
                              Hạn hoàn thành
                            </label>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={newTaskDeadline}
                              onChange={(e) => setNewTaskDeadline(e.target.value)}
                              style={{ fontSize: "12px", borderRadius: "6px" }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="d-flex justify-content-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary px-3 fw-semibold text-white"
                          style={{ fontSize: "12px", borderRadius: "6px" }}
                          onClick={() => {
                            if (!newTaskName.trim()) {
                              alert("Vui lòng nhập tên công việc!");
                              return;
                            }
                            const finalDeadline = step3AddOffcanvasSection?.id === "section_content"
                              ? newTaskChannels.join(", ")
                              : newTaskDeadline;
                            const newTask = {
                              id: Date.now().toString(),
                              name: newTaskName,
                              assignee: newTaskAssignee,
                              deadline: finalDeadline,
                              status: newTaskStatus
                            };
                            setTempDetailedTasks(prev => [...prev, newTask]);
                            setNewTaskName("");
                            setNewTaskDeadline("");
                            setNewTaskChannels([]);
                          }}
                        >
                          <i className="bi bi-plus-circle me-1" /> Thêm
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-2 text-start flex-grow-1" style={{ minHeight: 0 }}>
                    <label className="fw-bold text-secondary mb-1" style={{ fontSize: "12px" }}>
                      DANH SÁCH CÔNG VIỆC ({tempDetailedTasks.length})
                    </label>
                    <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, flex: 1, paddingRight: 4 }}>
                      {tempDetailedTasks.length === 0 ? (
                        <div className="text-center py-4 text-muted" style={{ fontSize: 12 }}>
                          Chưa có công việc chi tiết nào được thêm.
                        </div>
                      ) : (
                        tempDetailedTasks.map((t, idx) => (
                          <div
                            key={t.id}
                            className="d-flex align-items-center justify-content-between py-2 border-bottom"
                            style={{
                              fontSize: 12,
                              gap: 10
                            }}
                          >
                            <div className="d-flex flex-column gap-1 flex-grow-1 text-start">
                              <span className="fw-semibold text-dark">{idx + 1}. {t.name}</span>
                              <div className="d-flex align-items-center flex-wrap gap-3 text-muted" style={{ fontSize: 11 }}>
                                <span className="d-inline-flex align-items-center gap-1">
                                  {step3AddOffcanvasSection?.id === "section_content" ? (
                                    <>
                                      <i className="bi bi-file-earmark-play" style={{ color: "#475569" }} /> Hình thức: &nbsp;
                                      {(() => {
                                        const fmt = ["Video", "Hình ảnh", "Bài viết"].includes(t.assignee) ? t.assignee : "Video";
                                        if (fmt === "Video") return <i className="bi bi-play-btn-fill" title="Video" style={{ color: "#1d4ed8", fontSize: 12 }} />;
                                        if (fmt === "Hình ảnh") return <i className="bi bi-image-fill" title="Hình ảnh" style={{ color: "#0d9488", fontSize: 12 }} />;
                                        return <i className="bi bi-file-earmark-text-fill" title="Bài viết" style={{ color: "#059669", fontSize: 12 }} />;
                                      })()}
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-person" /> {t.assignee}
                                    </>
                                  )}
                                </span>
                                {t.deadline && (
                                  <span className="d-inline-flex align-items-center gap-1">
                                    {step3AddOffcanvasSection?.id === "section_content" ? (
                                      <>
                                        <i className="bi bi-broadcast" style={{ color: "#475569" }} /> Kênh: &nbsp;
                                        <span className="d-inline-flex align-items-center gap-1">
                                          {t.deadline.split(", ").map((ch: string, cidx: number) => {
                                            if (ch === "Facebook") return <i key={cidx} className="bi bi-facebook" title="Facebook" style={{ color: "#1877f2", fontSize: 13 }} />;
                                            if (ch === "Tiktok") return <i key={cidx} className="bi bi-tiktok" title="Tiktok" style={{ color: "#000", fontSize: 13 }} />;
                                            if (ch === "Youtube") return <i key={cidx} className="bi bi-youtube" title="Youtube" style={{ color: "#ff0000", fontSize: 13 }} />;
                                            return null;
                                          })}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <i className="bi bi-calendar-event" /> {t.deadline}
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-danger border-0 flex-shrink-0"
                              onClick={() => {
                                setTempDetailedTasks(prev => prev.filter(task => task.id !== t.id));
                              }}
                              title="Xóa công việc"
                              style={{ background: "transparent" }}
                            >
                              <i className="bi bi-trash" style={{ fontSize: 14 }} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : step3AddOffcanvasSection.type === "section_header" ? (() => {
                const uniquePillars = Array.from(new Set(Object.values(editedContentPlan).map((p: any) => p.pillar).filter(Boolean)));
                const pillarsToDisplay = uniquePillars.length > 0 ? uniquePillars : ["Thương hiệu", "Sản phẩm", "Bán hàng", "Chia sẻ"];

                return (
                  <div className="d-flex flex-column gap-3 w-100 flex-grow-1 text-start" style={{ minHeight: 0, flex: 1 }}>
                    <div className="d-flex flex-column gap-1 w-100 text-start">
                      <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                        Tuyến nội dung
                      </label>
                      <select
                        className="form-select"
                        value={contentPillar}
                        onChange={(e) => setContentPillar(e.target.value)}
                        style={{
                          fontSize: "13px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          padding: "8px 10px"
                        }}
                      >
                        <option value="">-- Chọn tuyến nội dung --</option>
                        {pillarsToDisplay.map((p: any, idx: number) => (
                          <option key={idx} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="d-flex flex-column gap-1 w-100 text-start">
                      <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                        Chủ đề
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nhập chủ đề..."
                        value={contentTopic}
                        onChange={(e) => setContentTopic(e.target.value)}
                        style={{
                          fontSize: "13px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          padding: "8px 10px"
                        }}
                      />
                    </div>

                    {/* Chọn tuần */}
                    <div className="d-flex flex-column gap-1 w-100 text-start">
                      <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                        Chọn tuần
                      </label>
                      <div className="d-flex gap-2">
                        {[1, 2, 3, 4].map((wk) => {
                          const isSelected = contentWeeks.includes(wk);
                          return (
                            <button
                              key={wk}
                              type="button"
                              onClick={() => {
                                setContentWeeks(prev =>
                                  prev.includes(wk)
                                    ? prev.filter(w => w !== wk)
                                    : [...prev, wk]
                                );
                              }}
                              style={{
                                width: 40,
                                height: 36,
                                borderRadius: 8,
                                border: isSelected ? "none" : "1.5px solid var(--border)",
                                backgroundColor: isSelected ? "#2563eb" : "#fff",
                                color: isSelected ? "#fff" : "#64748b",
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                boxShadow: isSelected ? "0 2px 8px rgba(37,99,235,0.25)" : "none"
                              }}
                            >
                              {wk}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Người thực hiện + Ngân sách */}
                    <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                      <div className="d-flex flex-column gap-1" style={{ flex: 1, textAlign: "left" }}>
                        <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                          Người thực hiện
                        </label>
                        <select
                          className="form-select"
                          value={contentAssignee}
                          onChange={(e) => setContentAssignee(e.target.value)}
                          style={{
                            fontSize: "13px",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            padding: "8px 10px"
                          }}
                        >
                          <option value="Chu Thị Hằng">Chu Thị Hằng</option>
                          <option value="Nguyễn Lan Nhi">Nguyễn Lan Nhi</option>
                          <option value="Hoàng Thanh Tú">Hoàng Thanh Tú</option>
                          <option value="Nguyễn Quốc Việt">Nguyễn Quốc Việt</option>
                          <option value="Nguyễn Thu Huyền">Nguyễn Thu Huyền</option>
                        </select>
                      </div>
                      <div className="d-flex flex-column gap-1" style={{ flex: 1, textAlign: "left" }}>
                        <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                          Ngân sách (đ)
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="0"
                          value={contentBudget}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            const formatted = raw ? Number(raw).toLocaleString("vi-VN") : "";
                            setContentBudget(formatted);
                          }}
                          style={{
                            fontSize: "13px",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            padding: "8px 10px"
                          }}
                        />
                      </div>
                    </div>

                    {/* Chạy quảng cáo */}
                    {step3AddOffcanvasSection?.id === "section_media" && (
                      <div className="form-check form-switch d-flex align-items-center gap-2 w-100 text-start" style={{ paddingLeft: "2.5em", margin: "4px 0" }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="flexSwitchCheckContentIsAds"
                          checked={contentIsAds}
                          onChange={(e) => setContentIsAds(e.target.checked)}
                          style={{ cursor: "pointer", width: "1.8em", height: "1em" }}
                        />
                        <label className="form-check-label fw-semibold text-secondary" htmlFor="flexSwitchCheckContentIsAds" style={{ fontSize: "12px", cursor: "pointer", userSelect: "none" }}>
                          Chạy quảng cáo
                        </label>
                      </div>
                    )}

                    {step3AddOffcanvasSection?.id === "section_media" || step3AddOffcanvasSection?.id === "section_adv" ? (
                      <div className="d-flex flex-column gap-3 w-100 flex-grow-1 text-start" style={{ minHeight: 0, flex: 1 }}>
                        {step3AddOffcanvasSection?.id === "section_adv" && (
                          <div className="d-flex flex-column gap-1 w-100 text-start">
                            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                              Kênh
                            </label>
                            <div className="d-flex align-items-center gap-3" style={{ marginTop: "2px" }}>
                              {["Facebook", "Youtube", "Tiktok"].map((ch) => {
                                const selectedChannels = contentChannel ? contentChannel.split(",").map(c => c.trim()) : [];
                                const isChecked = selectedChannels.includes(ch);
                                return (
                                  <label key={ch} className="d-flex align-items-center gap-2 mb-0" style={{ fontSize: "13px", cursor: "pointer", userSelect: "none" }}>
                                    <input
                                      type="checkbox"
                                      className="form-check-input mt-0"
                                      checked={isChecked}
                                      onChange={() => {
                                        let newChannels;
                                        if (isChecked) {
                                          newChannels = selectedChannels.filter(c => c !== ch);
                                        } else {
                                          newChannels = [...selectedChannels, ch];
                                        }
                                        const ordered = ["Facebook", "Youtube", "Tiktok"].filter(c => newChannels.includes(c));
                                        setContentChannel(ordered.join(", "));
                                      }}
                                      style={{ width: 15, height: 15, cursor: "pointer" }}
                                    />
                                    <span>{ch}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="d-flex flex-column gap-1 w-100 flex-grow-1 text-start" style={{ minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                          <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                            {step3AddOffcanvasSection?.id === "section_adv" ? "Chi tiết công việc" : "Nội dung chi tiết"}
                          </label>
                          <textarea
                            className="form-control flex-grow-1"
                            placeholder={step3AddOffcanvasSection?.id === "section_adv" ? "Nhập chi tiết công việc..." : "Nhập nội dung chi tiết..."}
                            value={contentDetails}
                            onChange={(e) => setContentDetails(e.target.value)}
                            style={{
                              flex: 1,
                              minHeight: 120,
                              resize: "none",
                              fontSize: "13px",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              padding: "8px 10px"
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", textAlign: "left" }}>
                        <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                          Công việc chi tiết
                        </label>
                        <button
                          type="button"
                          className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2"
                          style={{
                            width: "100%",
                            fontSize: "13px",
                            fontWeight: 500,
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            color: "#475569",
                            background: "#f8fafc",
                            transition: "all 0.15s ease",
                            cursor: "pointer"
                          }}
                          onClick={() => {
                            setNewTaskName("");
                            if (step3AddOffcanvasSection?.id === "section_content") {
                              setNewTaskAssignee("Video");
                              setNewTaskDeadline("");
                              setNewTaskChannels([]);
                            } else {
                              setNewTaskAssignee(contentAssignee || "Chu Thị Hằng");
                              setNewTaskDeadline("");
                            }
                            setNewTaskStatus("Chưa bắt đầu");
                            setOffcanvasView("tasks");
                          }}
                        >
                          <i className="bi bi-list-task" style={{ fontSize: "15px" }} />
                          <span>Công việc chi tiết</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })() : step3AddOffcanvasSection.id === "theme_content" ? (
                <div className="d-flex flex-column gap-3 w-100 flex-grow-1 text-start" style={{ minHeight: 0, flex: 1 }}>
                  <div className="d-flex flex-column gap-1">
                    <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                      Chủ đề
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập chủ đề..."
                      value={monthlyThemeTopic}
                      onChange={(e) => setMonthlyThemeTopic(e.target.value)}
                      style={{
                        fontSize: "13px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "8px 10px"
                      }}
                    />
                  </div>

                  <div className="d-flex flex-column gap-1 flex-grow-1" style={{ minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                    <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                      Nội dung chi tiết
                    </label>
                    <textarea
                      className="form-control flex-grow-1"
                      placeholder="Nhập nội dung chi tiết..."
                      value={monthlyThemeContent}
                      onChange={(e) => setMonthlyThemeContent(e.target.value)}
                      style={{
                        fontSize: "13px",
                        resize: "none",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "10px",
                        flex: 1
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="d-flex flex-column justify-content-center align-items-center gap-3 text-center py-5">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: 56,
                      height: 56,
                      backgroundColor: step3AddOffcanvasSection.colorTheme === "red" ? "#fef2f2" : "#f0f4f8",
                      color: step3AddOffcanvasSection.colorTheme === "red" ? "#dc2626" : "#2563eb"
                    }}
                  >
                    <i className="bi bi-plus-circle" style={{ fontSize: 28 }} />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1" style={{ color: "var(--foreground)" }}>
                      Thêm nội dung con
                    </h6>
                    <p className="text-muted mb-0" style={{ fontSize: 13, maxWidth: 300 }}>
                      Chi tiết giao diện nhập liệu cho phần mục <strong>{step3AddOffcanvasSection.name}</strong> sẽ được thiết kế tại bước tiếp theo.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="offcanvas-footer p-3 border-top d-flex gap-2 bg-light" style={{ flexShrink: 0 }}>
              {editingContentItemId && step3AddOffcanvasSection?.type === "section_header" && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={async () => {
                    const sectionKey = `${step3AddOffcanvasSection.id}_${selectedMonth}`;
                    const existingItems = sectionContentItems[sectionKey] || [];
                    const updatedItems = existingItems.filter(item => item.id !== editingContentItemId);

                    const updatedContentItems = {
                      ...sectionContentItems,
                      [sectionKey]: updatedItems
                    };
                    setSectionContentItems(updatedContentItems);
                    setEditingContentItemId(null);
                    setShowStep3AddOffcanvas(false);
                    setStep3AddOffcanvasSection(null);
                    await handleSave(monthlyThemes, undefined, undefined, updatedContentItems);
                  }}
                  style={{
                    height: 36,
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    padding: "0 16px"
                  }}
                >
                  Xóa
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-2 text-white"
                onClick={handleSaveStep3Offcanvas}
                style={{
                  height: 36,
                  fontSize: 13,
                  fontWeight: 600,
                  backgroundColor: step3AddOffcanvasSection.id === "theme_content" ? "#2563eb" : (step3AddOffcanvasSection.colorTheme === "red" ? "#dc2626" : "#2563eb"),
                  borderColor: step3AddOffcanvasSection.id === "theme_content" ? "#2563eb" : (step3AddOffcanvasSection.colorTheme === "red" ? "#dc2626" : "#2563eb")
                }}
              >
                <i className="bi bi-floppy" /> Lưu lại
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={() => {
                  setShowStep3AddOffcanvas(false);
                  setStep3AddOffcanvasSection(null);
                }}
                style={{ height: 36, fontSize: 13, fontWeight: 600 }}
              >
                Hủy
              </button>
            </div>
          </div>
        </>
      )}


      {showProductModal && activeProductWeek !== null && popoverAnchor && (
        <>
          {/* Transparent Backdrop to close when clicking outside */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1060,
              backgroundColor: "transparent"
            }}
            onClick={() => setShowProductModal(false)}
          />
          {/* Popover Card */}
          <div
            style={{
              position: "fixed",
              top: popoverAnchor.top,
              left: popoverAnchor.left,
              zIndex: 1070,
              width: 240,
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              padding: "14px 16px"
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" style={{ borderColor: "#f1f5f9" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", letterSpacing: "0.03em" }}>
                CHỌN SẢN PHẨM
              </span>
              <button
                type="button"
                className="btn-close"
                style={{ fontSize: 8, padding: 0, width: "10px", height: "10px" }}
                onClick={() => setShowProductModal(false)}
              />
            </div>
            <div className="mb-2 position-relative">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Tìm sản phẩm..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                style={{
                  fontSize: "12px",
                  paddingLeft: "26px",
                  borderRadius: "6px",
                  borderColor: "#cbd5e1"
                }}
              />
              <i
                className="bi bi-search position-absolute text-muted"
                style={{
                  left: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "11px"
                }}
              />
            </div>
            <div className="d-flex flex-column" style={{ maxHeight: 200, overflowY: "auto", gap: "12px" }}>
              {(() => {
                const list = (productCategories.length > 0
                  ? productCategories.map((c) => (typeof c === "string" ? c : c.name || ""))
                  : [
                    "Thiết bị vệ sinh",
                    "Phụ kiện nhà tắm",
                    "Bồn cầu",
                    "Tủ lavabo",
                    "Sen cây",
                    "Vòi lavabo",
                    "Combo phòng tắm",
                    "Thiết bị nhà bếp"
                  ]
                ).filter((prod) => {
                  if (!productSearchQuery) return true;
                  return prod.toLowerCase().includes(productSearchQuery.toLowerCase());
                });

                if (list.length === 0) {
                  return (
                    <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>
                      Không tìm thấy sản phẩm
                    </div>
                  );
                }

                return list.map((prod) => {
                  const isChecked = tempSelectedProducts.includes(prod);
                  return (
                    <label
                      key={prod}
                      className="d-flex align-items-center gap-2 mb-0"
                      style={{
                        fontSize: "12px",
                        fontWeight: isChecked ? 600 : 500,
                        color: isChecked ? "#1e293b" : "#475569",
                        cursor: "pointer",
                        userSelect: "none"
                      }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        checked={isChecked}
                        onChange={async () => {
                          let newSelection: string[];
                          if (isChecked) {
                            newSelection = tempSelectedProducts.filter(p => p !== prod);
                          } else {
                            newSelection = [...tempSelectedProducts, prod];
                          }
                          setTempSelectedProducts(newSelection);

                          const currentMonthProducts = monthlyProducts[selectedMonth] || {};
                          const updatedMonthProducts = {
                            ...currentMonthProducts,
                            [activeProductWeek]: newSelection
                          };
                          const updatedAllProducts = {
                            ...monthlyProducts,
                            [selectedMonth]: updatedMonthProducts
                          };
                          setMonthlyProducts(updatedAllProducts);
                          await handleSave(undefined, updatedAllProducts);
                        }}
                        style={{ width: 14, height: 14, cursor: "pointer" }}
                      />
                      <span>{prod}</span>
                    </label>
                  );
                });
              })()}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        variant="danger"
        title="Xóa tuyến nội dung?"
        message="Bạn có chắc chắn muốn xóa tuyến nội dung này?"
        confirmLabel="Xóa"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setRowIdToDelete(null);
        }}
      />

      {showHolidayModal && (
        <>
          {/* Semi-transparent dark Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1080,
              backgroundColor: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(4px)"
            }}
            onClick={() => {
              setShowHolidayModal(false);
              setEditingHoliday(null);
            }}
          />
          {/* Modal Container */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1090,
              width: 380,
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom" style={{ borderColor: "#f1f5f9" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                {editingHoliday ? "SỬA NGÀY LỄ THỦ CÔNG" : "THÊM NGÀY LỄ THỦ CÔNG"}
              </span>
              <button
                type="button"
                className="btn-close"
                style={{ fontSize: 10 }}
                onClick={() => {
                  setShowHolidayModal(false);
                  setEditingHoliday(null);
                }}
              />
            </div>

            {/* Form */}
            <div className="d-flex flex-column gap-3">
              <div className="d-flex flex-column gap-1">
                <label className="fw-semibold text-secondary" style={{ fontSize: "12px" }}>
                  Tên ngày lễ
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tên ngày lễ (Ví dụ: Lễ hội Đền Hùng)"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  style={{ fontSize: "13px", borderRadius: "6px" }}
                />
              </div>

              <div className="d-flex flex-column gap-1">
                <label className="fw-semibold text-secondary" style={{ fontSize: "12px" }}>
                  Chọn ngày lễ
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  style={{ fontSize: "13px", borderRadius: "6px" }}
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="d-flex justify-content-between align-items-center pt-2 border-top" style={{ borderColor: "#f1f5f9" }}>
              {editingHoliday ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={handleDeleteHoliday}
                  style={{ height: 34, padding: "0 14px", fontSize: "13px", fontWeight: 600 }}
                >
                  Xóa
                </button>
              ) : (
                <div />
              )}
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setShowHolidayModal(false);
                    setEditingHoliday(null);
                  }}
                  style={{ height: 34, padding: "0 14px", fontSize: "13px", fontWeight: 600 }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-sm text-white"
                  onClick={handleAddHoliday}
                  style={{
                    height: 34,
                    padding: "0 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    backgroundColor: "#2563eb"
                  }}
                >
                  {editingHoliday ? "Lưu thay đổi" : "Thêm ngày lễ"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showProposalModal && (
        <>
          {/* Backdrop with Blur */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1080,
              backgroundColor: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(8px)",
              transition: "opacity 0.2s ease"
            }}
          />

          {/* Fullscreen Container */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1090,
              backgroundColor: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div className="proposal-modal-header">
              <div className="proposal-modal-header-left">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-file-earmark-text text-primary" style={{ fontSize: 20 }} />
                  <span className="fw-bold text-slate-800" style={{ fontSize: 15, letterSpacing: "0.02em" }}>
                    Đề xuất chi phí hoạt động marketing - Tháng {selectedMonth}/{selectedYear}
                  </span>
                </div>
                {(() => {
                  const propStatus = proposalData.status || "draft";
                  return (
                    <span className={`badge bg-${
                      propStatus === "approved" ? "success" :
                      propStatus === "pending" ? "warning text-dark" :
                      propStatus === "rejected" ? "danger" : "secondary"
                    }`} style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>
                      {propStatus === "approved" ? "Đã duyệt" :
                       propStatus === "pending" ? "Chờ duyệt" :
                       propStatus === "rejected" ? "Từ chối" : "Bản nháp"}
                    </span>
                  );
                })()}
              </div>
              <div className="proposal-modal-header-right">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
                  onClick={() => setShowProposalModal(false)}
                  style={{ height: 34, padding: "0 16px", fontSize: 13, fontWeight: 600 }}
                >
                  <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info d-inline-flex align-items-center gap-2"
                  onClick={() => setShowPrintModal(true)}
                  style={{ height: 34, padding: "0 16px", fontSize: 13, fontWeight: 600 }}
                >
                  <i className="bi bi-printer" style={{ fontSize: 14 }} />
                  In và xuất PDF
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-2"
                  onClick={async () => {
                    const ok = await handleSaveProposal(proposalData);
                    if (ok) {
                      toast.success("Thành công", "Đã lưu đề xuất chi phí thành công!");
                    } else {
                      toast.error("Lỗi", "Không thể lưu đề xuất chi phí vào cơ sở dữ liệu.");
                    }
                  }}
                  style={{ height: 34, padding: "0 16px", fontSize: 13, fontWeight: 600 }}
                >
                  <i className="bi bi-floppy" style={{ fontSize: 14 }} />
                  Lưu đề xuất
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2"
                  disabled={isSubmittingProposal}
                  onClick={async () => {
                    if (isSubmittingProposal) return;
                    setIsSubmittingProposal(true);
                    try {
                      // 1. Lưu đề xuất trước
                      const ok = await handleSaveProposal(proposalData);
                      if (!ok) {
                        toast.error("Lỗi", "Không thể lưu dữ liệu đề xuất chi phí.");
                        setIsSubmittingProposal(false);
                        return;
                      }

                      // Hiển thị thông báo đang xử lý
                      toast.info("Đang xử lý", "Đang kết xuất bản PDF đề xuất và chuẩn bị gửi thông báo...");

                      // 2. Tạo PDF Blob từ giao diện in ẩn
                      const pdfBlob = await generatePDFBlob("proposal-print-doc-hidden", {
                        orientation: "portrait",
                        scale: 2
                      });

                      // 3. Tải lên tệp PDF qua API upload
                      const file = new File(
                        [pdfBlob],
                        `De_xuat_chi_phi_MKT_${proposalData.code || "Proposal"}.pdf`,
                        { type: "application/pdf" }
                      );
                      const formData = new FormData();
                      formData.append("file", file);

                      const uploadRes = await fetch("/api/upload", {
                        method: "POST",
                        body: formData
                      });
                      if (!uploadRes.ok) {
                        throw new Error("Không thể tải bản PDF đề xuất lên hệ thống.");
                      }
                      const uploadData = await uploadRes.json();
                      const pdfUrl = window.location.origin + uploadData.url;

                      // 4. Tính toán tổng kinh phí đề xuất
                      const localItemsList: any[] = [];
                      Object.entries(proposalData.items).forEach(([mainTaskId, mainTask]: any) => {
                        localItemsList.push({
                          proposedAmount: mainTask.proposedAmount,
                          isSubTask: false
                        });
                        if (mainTask.subTasks) {
                          mainTask.subTasks.forEach((sub: any) => {
                            localItemsList.push({
                              proposedAmount: sub.proposedAmount,
                              isSubTask: true
                            });
                          });
                        }
                      });
                      const totalProposedAmount = localItemsList
                        .filter(item => !item.isSubTask)
                        .reduce((sum, item) => sum + (item.proposedAmount || 0), 0) + (proposalData.advReserve || 0);

                      // 5. Gửi trình duyệt kèm thông báo đến Giám đốc & Trưởng phòng Kế toán
                      const submitRes = await fetch("/api/plan-finance/master-plan/submit-approval", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          year: parseInt(selectedYear, 10),
                          month: selectedMonth,
                          pdfUrl,
                          proposalCode: proposalData.code || "DX-MKT",
                          proposerName: proposalData.proposerName || "Nguyễn Thu Huyền",
                          proposedAmount: totalProposedAmount
                        })
                      });

                      if (!submitRes.ok) {
                        const errData = await submitRes.json();
                        throw new Error(errData.error || "Gặp lỗi khi tạo thông báo gửi trình duyệt.");
                      }

                      toast.success(
                        "Thành công",
                        "Đề xuất chi phí đã được lưu, kết xuất PDF và tự động gửi thông báo phê duyệt đến Giám đốc cùng Trưởng phòng TC-KT thành công!"
                      );
                      setShowProposalModal(false);
                    } catch (err: any) {
                      console.error("Lỗi trình duyệt đề xuất:", err);
                      toast.error("Lỗi", err?.message || "Không thể gửi trình duyệt đề xuất.");
                    } finally {
                      setIsSubmittingProposal(false);
                    }
                  }}
                  style={{ height: 34, padding: "0 18px", fontSize: 13, fontWeight: 600 }}
                >
                  {isSubmittingProposal ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "12px", height: "12px" }} />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send" style={{ fontSize: 14 }} />
                      Trình duyệt đề xuất
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="proposal-modal-body">
              {/* Left Column Panel */}
              <div className="card m-0 p-3 border-0 shadow-sm rounded-0 d-flex flex-column" style={{ borderRadius: 0, background: "#fff", margin: 0, height: "100%", maxHeight: "100%", minHeight: 0, overflow: "hidden" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <SectionTitle
                    title="Thông tin chung"
                    className="m-0"
                    style={{ color: "var(--primary)", fontSize: 13, letterSpacing: "0.02em" }}
                  />
                  <button
                    type="button"
                    className="proposal-sidebar-toggle btn btn-sm btn-link p-0 text-primary fw-semibold d-inline-flex align-items-center gap-1"
                    onClick={() => setIsGeneralInfoCollapsed(!isGeneralInfoCollapsed)}
                    style={{ fontSize: 12, textDecoration: "none", boxShadow: "none" }}
                  >
                    <i className={`bi ${isGeneralInfoCollapsed ? "bi-chevron-down" : "bi-chevron-up"}`} />
                    <span>{isGeneralInfoCollapsed ? "Mở rộng" : "Thu gọn"}</span>
                  </button>
                </div>

                <div className={`proposal-sidebar-content-wrapper ${isGeneralInfoCollapsed ? "collapsed-on-tablet" : ""}`}>
                    <div className="proposal-sidebar-inputs">
                      <div className="d-flex flex-column gap-2">
                        {/* Row 1: Số hiệu & Ngày đề xuất */}
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="fw-semibold text-secondary mb-1" style={{ fontSize: 11 }}>Số hiệu</label>
                            <input
                              type="text"
                              className="form-control form-control-sm bg-light fw-semibold"
                              value={proposalData.code}
                              readOnly
                              style={{ fontSize: 12, height: 32 }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="fw-semibold text-secondary mb-1" style={{ fontSize: 11 }}>Ngày đề xuất</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={proposalData.date}
                              onChange={(e) => setProposalData({ ...proposalData, date: e.target.value })}
                              style={{ fontSize: 12, height: 32 }}
                            />
                          </div>
                        </div>

                        {/* Row 2: Người đề xuất & Người duyệt */}
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="fw-semibold text-secondary mb-1" style={{ fontSize: 11 }}>Người đề xuất</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={proposalData.proposerName}
                              onChange={(e) => setProposalData({ ...proposalData, proposerName: e.target.value })}
                              style={{ fontSize: 12, height: 32 }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="fw-semibold text-secondary mb-1" style={{ fontSize: 11 }}>Người duyệt</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={proposalData.approverName}
                              onChange={(e) => setProposalData({ ...proposalData, approverName: e.target.value })}
                              style={{ fontSize: 12, height: 32 }}
                            />
                          </div>
                        </div>

                        {/* Row 3: Chi phí dự phòng */}
                        <div className="row g-2">
                          <div className="col-12">
                            <label className="fw-semibold text-secondary mb-1" style={{ fontSize: 11 }}>Chi phí dự phòng</label>
                            <div className="input-group input-group-sm">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Nhập chi phí dự phòng..."
                                value={proposalData.advReserve ? proposalData.advReserve.toLocaleString("vi-VN") : ""}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, "");
                                  const val = raw ? Number(raw) : 0;
                                  setProposalData({ ...proposalData, advReserve: val });
                                }}
                                style={{ fontSize: 12, height: 32 }}
                              />
                              <span className="input-group-text bg-light text-secondary" style={{ fontSize: 12, height: 32, fontWeight: 500 }}>
                                đồng
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="proposal-sidebar-card">
                      {/* Visa-style Budget Summary Card */}
                      {(() => {
                        const agencySum = BUDGET_CATEGORIES.slice(0, 3).reduce((sum, cat) => {
                          const alloc = (monthlyAllocations[selectedMonth] || {})[cat.id] || { budget: 0 };
                          return sum + (alloc.budget || 0);
                        }, 0);

                        const advSum = BUDGET_CATEGORIES.slice(3).reduce((sum, cat) => {
                          const alloc = (monthlyAllocations[selectedMonth] || {})[cat.id] || { budget: 0 };
                          return sum + (alloc.budget || 0);
                        }, 0);

                        const allocatedBudget = agencySum + advSum;
                        const totalProposed = Object.values(proposalData.items).reduce((sum, item) => sum + (item.proposedAmount || 0), 0) + (proposalData.advReserve || 0);
                        const rawPercent = allocatedBudget > 0 ? (totalProposed / allocatedBudget) * 100 : 0;
                        const percentText = rawPercent.toFixed(1) + "%";
                        const barPercent = Math.min(rawPercent, 100);

                        // Color progress bar depending on percentage
                        const isOverBudget = rawPercent > 100;
                        const progressBarColor = isOverBudget ? "#ef4444" : "#10b981"; // Red if over budget, green otherwise

                        return (
                          <div 
                            className="mt-2 text-white position-relative overflow-hidden" 
                            style={{
                              padding: "16px",
                              borderRadius: "12px",
                              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #3b82f6 100%)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.25)",
                              aspectRatio: "85.6 / 53.98", // Standard credit card dimension ratio
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              flexShrink: 0
                            }}
                          >
                            {/* Glossy overlay effect */}
                            <div 
                              style={{
                                position: "absolute",
                                top: "-50%",
                                left: "-50%",
                                width: "200%",
                                height: "200%",
                                background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)",
                                pointerEvents: "none"
                              }}
                            />

                            {/* Top Row: Card Brand and Chip */}
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <span style={{ fontSize: "9px", letterSpacing: "1.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Marketing Card</span>
                              </div>
                              {/* Golden Card Chip Mockup */}
                              <div 
                                style={{
                                  width: "24px",
                                  height: "16px",
                                  borderRadius: "3px",
                                  background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
                                  position: "relative",
                                  border: "1px solid rgba(0,0,0,0.1)"
                                }}
                              >
                                {/* Inner lines of chip */}
                                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "rgba(0,0,0,0.15)" }} />
                                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "rgba(0,0,0,0.15)" }} />
                              </div>
                            </div>

                            {/* Middle Row: Proposed Cost */}
                            <div className="my-1">
                              <label className="text-secondary mb-0 d-block" style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1.2 }}>Kinh phí dự kiến</label>
                              <div className="fw-bold" style={{ fontSize: "16px", letterSpacing: "0.5px" }}>
                                {totalProposed.toLocaleString("vi-VN")} đ
                              </div>
                            </div>

                            {/* Bottom Section: Allocated Budget and Progress Bar */}
                            <div>
                              {/* Allocated Budget Text */}
                              <div className="d-flex justify-content-between align-items-end mb-1" style={{ fontSize: "11px" }}>
                                <div>
                                  <span style={{ color: "#94a3b8", marginRight: "4px" }}>Ngân sách phân bổ:</span>
                                  <span className="fw-semibold">{allocatedBudget.toLocaleString("vi-VN")} đ</span>
                                </div>
                                <span className="fw-bold" style={{ color: progressBarColor }}>{percentText}</span>
                              </div>

                              {/* Progress Bar */}
                              <div style={{ width: "100%", height: "4px", background: "rgba(255, 255, 255, 0.15)", borderRadius: "2px", overflow: "hidden" }}>
                                <div 
                                  style={{ 
                                    width: `${barPercent}%`, 
                                    height: "100%", 
                                    background: progressBarColor, 
                                    borderRadius: "2px",
                                    transition: "width 0.3s ease" 
                                  }} 
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                </div>
              </div>

              {/* Right Column (8 parts) */}
              <div className="d-flex flex-column" style={{ minWidth: 0, flex: 1, height: "100%", maxHeight: "100%", minHeight: 0 }}>
                {/* Right Column Panel */}
                <div className="card m-0 p-3 border-0 shadow-sm rounded-0 d-flex flex-column" style={{ borderRadius: 0, background: "#fff", margin: 0, flex: 1, height: "100%", maxHeight: "100%", minHeight: 0, overflow: "hidden" }}>
                  <SectionTitle
                    title="Thông tin chi tiết"
                    className="mb-3"
                    style={{ color: "var(--primary)", fontSize: 13, letterSpacing: "0.02em" }}
                  />

                  {/* Input field and Add button */}
                  <div className="d-flex gap-2 mb-3">
                    <input
                      type="text"
                      className="form-control form-control-sm text-uppercase fw-bold text-primary"
                      value={newMainTaskLabel}
                      onChange={(e) => setNewMainTaskLabel(e.target.value)}
                      placeholder="Nhập tên công việc chính..."
                      style={{ fontSize: 12, height: 32, flex: 1 }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (e.nativeEvent.isComposing) return;
                          e.preventDefault();
                          const taskLabel = newMainTaskLabel.trim().toUpperCase();
                          if (taskLabel) {
                            const newId = `task_${Date.now()}`;
                            const updatedItems = {
                              ...proposalData.items,
                              [newId]: {
                                label: taskLabel,
                                proposedAmount: 0,
                                description: "",
                                notes: ""
                              }
                            };
                            setProposalData({
                              ...proposalData,
                              items: updatedItems
                            });
                            setNewMainTaskLabel("");
                            toast.success("Thành công", `Đã thêm công việc chính: ${taskLabel}`);
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary d-flex align-items-center justify-content-center"
                      onClick={() => {
                        if (newMainTaskLabel.trim()) {
                          const newId = `task_${Date.now()}`;
                          const updatedItems = {
                            ...proposalData.items,
                            [newId]: {
                              label: newMainTaskLabel.trim().toUpperCase(),
                              proposedAmount: 0,
                              description: "",
                              notes: ""
                            }
                          };
                          setProposalData({
                            ...proposalData,
                            items: updatedItems
                          });
                          setNewMainTaskLabel("");
                          toast.success("Thành công", `Đã thêm công việc chính: ${newMainTaskLabel.trim().toUpperCase()}`);
                        }
                      }}
                      style={{ height: 32, width: 32, padding: 0 }}
                      title="Thêm công việc chính"
                      disabled={!newMainTaskLabel.trim()}
                    >
                      <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />
                    </button>
                  </div>

                  {(() => {
                    const itemsList: any[] = [];
                    Object.entries(proposalData.items).forEach(([mainTaskId, mainTask], mainIndex) => {
                      itemsList.push({
                        id: mainTaskId,
                        mainTaskId: null,
                        label: mainTask.label,
                        proposedAmount: mainTask.proposedAmount,
                        description: mainTask.description,
                        notes: mainTask.notes,
                        isSubTask: false,
                        indexStr: `${mainIndex + 1}`
                      });

                      const isCollapsed = collapsedMainTaskIds[mainTaskId];
                      if (!isCollapsed && mainTask.subTasks) {
                        mainTask.subTasks.forEach((sub, subIndex) => {
                          itemsList.push({
                            id: sub.id,
                            mainTaskId: mainTaskId,
                            label: sub.label,
                            proposedAmount: sub.proposedAmount,
                            description: sub.description,
                            notes: sub.notes,
                            category: sub.category,
                            executionMethod: sub.executionMethod,
                            department: sub.department,
                            isSubTask: true,
                            indexStr: `${mainIndex + 1}.${subIndex + 1}`
                          });
                        });
                      }
                    });

                    const proposalTableColumns: TableColumn<any>[] = [
                      {
                        header: "STT",
                        width: 45,
                        align: "center",
                        render: (row) => {
                          return (
                            <span className={row.isSubTask ? "text-muted font-monospace" : "fw-semibold text-muted"} style={{ fontSize: 11 }}>
                              {row.indexStr}
                            </span>
                          );
                        }
                      },
                      {
                        header: "Hạng mục công việc",
                        width: 250,
                        align: "left",
                        render: (row) => {
                          if (editingRowId === row.id) {
                            return (
                              <input
                                type="text"
                                className="form-control form-control-sm text-uppercase fw-bold text-primary"
                                value={editRowLabel}
                                onChange={(e) => setEditRowLabel(e.target.value)}
                                style={{ fontSize: 12, height: 28 }}
                                autoFocus
                              />
                            );
                          }
                          if (row.isSubTask) {
                            return (
                              <div className="d-flex flex-column ps-3 text-secondary text-start" style={{ fontSize: 12 }}>
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-arrow-return-right text-muted me-2" style={{ fontSize: 11 }} />
                                  <span style={{ color: "#000", fontWeight: 500 }}>{row.label || ""}</span>
                                </div>
                                {(row.category || row.executionMethod || row.department) && (
                                  <div className="d-flex flex-wrap align-items-center gap-1.5 mt-1 ps-3" style={{ fontSize: "8.5px" }}>
                                    {row.category && (
                                      <span className="rounded border d-inline-flex align-items-center gap-1" style={{ padding: "0.5px 4px", fontSize: "8.5px", background: "#f5f3ff", color: "#7c3aed", borderColor: "#ddd6fe" }} title="Hạng mục">
                                        <i className="bi bi-tag-fill" style={{ fontSize: "9px" }} />
                                        <span style={{ color: "#4c1d95" }}>{row.category}</span>
                                      </span>
                                    )}
                                    {row.executionMethod && (
                                      <span className="rounded border d-inline-flex align-items-center gap-1" style={{ padding: "0.5px 4px", fontSize: "8.5px", background: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }} title="Hình thức triển khai">
                                        <i className="bi bi-sliders" style={{ fontSize: "9px" }} />
                                        <span style={{ color: "#1e3a8a" }}>{row.executionMethod}</span>
                                      </span>
                                    )}
                                    {row.department && (
                                      <span className="rounded border d-inline-flex align-items-center gap-1" style={{ padding: "0.5px 4px", fontSize: "8.5px", background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }} title="Bộ phận thực hiện">
                                        <i className="bi bi-people-fill" style={{ fontSize: "9px" }} />
                                        <span style={{ color: "#14532d" }}>{row.department}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          const parentItem = proposalData.items[row.id];
                          const hasSubTasks = !!(parentItem && parentItem.subTasks && parentItem.subTasks.length > 0);
                          const isCollapsed = collapsedMainTaskIds[row.id];
                          return (
                            <div className="d-flex align-items-center gap-1">
                              {hasSubTasks && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link p-0 text-muted d-inline-flex align-items-center justify-content-center me-1"
                                  style={{ width: 16, height: 16, border: "none", boxShadow: "none" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCollapsedMainTaskIds({
                                      ...collapsedMainTaskIds,
                                      [row.id]: !isCollapsed
                                    });
                                  }}
                                >
                                  <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-down"}`} style={{ fontSize: 11 }} />
                                </button>
                              )}
                              {!hasSubTasks && <div style={{ width: 16 }} className="me-1" />}
                              <span className="fw-bold text-uppercase text-primary" style={{ fontSize: 12 }}>
                                {row.label || ""}
                              </span>
                            </div>
                          );
                        }
                      },
                      {
                        header: "Nội dung chi tiết",
                        width: 280,
                        align: "left",
                        render: (row) => {
                          if (editingRowId === row.id) {
                            return (
                              <textarea
                                className="form-control form-control-sm text-secondary"
                                value={editRowDescription}
                                onChange={(e) => setEditRowDescription(e.target.value)}
                                style={{ fontSize: 12, minHeight: 40, resize: "vertical" }}
                                rows={2}
                              />
                            );
                          }

                          if (!row.description) return null;
                          const { cleanDesc } = parseDescriptionTime(row.description);
                          return renderTaskDescription(cleanDesc, row.isSubTask, false);
                        }
                      },
                      {
                        header: "Chi phí",
                        width: 120,
                        align: "right",
                        render: (row) => {
                          if (editingRowId === row.id) {
                            return (
                              <input
                                type="text"
                                className="form-control form-control-sm text-secondary fw-semibold text-end"
                                value={editRowAmount ? editRowAmount.toLocaleString("vi-VN") : ""}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, "");
                                  setEditRowAmount(raw ? Number(raw) : 0);
                                }}
                                style={{ fontSize: 12, height: 28 }}
                              />
                            );
                          }

                          let displayAmount = row.proposedAmount;
                          if (!row.isSubTask) {
                            const mainTaskData = proposalData.items[row.id];
                            if (mainTaskData?.subTasks && mainTaskData.subTasks.length > 0) {
                              displayAmount = mainTaskData.subTasks.reduce((sum, s) => sum + s.proposedAmount, 0);
                            }
                          }

                          const { timeStr } = parseDescriptionTime(row.description);

                          return (
                            <div className="d-flex flex-column align-items-end text-end w-100">
                              <span className={row.isSubTask ? "text-secondary" : "fw-semibold text-secondary"} style={{ fontSize: 12 }}>
                                {displayAmount ? displayAmount.toLocaleString("vi-VN") + " đ" : "0 đ"}
                              </span>
                              {timeStr && (
                                <span className="text-muted mt-1 fw-normal" style={{ fontSize: "10.5px" }}>
                                  {timeStr}
                                </span>
                              )}
                            </div>
                          );
                        }
                      },

                      {
                        header: "",
                        width: 70,
                        align: "center",
                        render: (row, idx) => {
                          if (editingRowId === row.id) {
                            return (
                              <div className="d-flex align-items-center justify-content-center gap-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-success p-0"
                                  style={{ width: 24, height: 24 }}
                                  title="Lưu"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedItems = { ...proposalData.items };
                                    if (!row.isSubTask) {
                                      updatedItems[row.id] = {
                                        ...updatedItems[row.id],
                                        label: editRowLabel.trim().toUpperCase(),
                                        proposedAmount: editRowAmount,
                                        description: editRowDescription,
                                        notes: editRowNotes
                                      };
                                      if (updatedItems[row.id].subTasks && updatedItems[row.id].subTasks!.length > 0) {
                                        updatedItems[row.id].proposedAmount = updatedItems[row.id].subTasks!.reduce((sum, s) => sum + s.proposedAmount, 0);
                                      }
                                    } else {
                                      const parent = updatedItems[row.mainTaskId];
                                      if (parent && parent.subTasks) {
                                        parent.subTasks = parent.subTasks.map(sub => {
                                          if (sub.id === row.id) {
                                            return {
                                              ...sub,
                                              label: editRowLabel.trim().toUpperCase(),
                                              proposedAmount: editRowAmount,
                                              description: editRowDescription,
                                              notes: editRowNotes
                                            };
                                          }
                                          return sub;
                                        });
                                        parent.proposedAmount = parent.subTasks.reduce((sum, s) => sum + s.proposedAmount, 0);
                                      }
                                    }
                                    setProposalData({ ...proposalData, items: updatedItems });
                                    setEditingRowId(null);
                                    toast.success("Thành công", "Đã cập nhật công việc");
                                  }}
                                >
                                  <i className="bi bi-check-lg" style={{ fontSize: 16 }} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-secondary p-0"
                                  style={{ width: 24, height: 24 }}
                                  title="Hủy"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRowId(null);
                                  }}
                                >
                                  <i className="bi bi-x-lg" style={{ fontSize: 14 }} />
                                </button>
                              </div>
                            );
                          }

                          const isNearBottom = idx >= itemsList.length - 3;
                          return (
                            <div className="position-relative d-inline-block">
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-secondary p-0 d-inline-flex align-items-center justify-content-center hover-bg-light"
                                style={{ width: 24, height: 24, borderRadius: 4 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRowId(activeMenuRowId === row.id ? null : row.id);
                                }}
                              >
                                <i className="bi bi-three-dots-vertical" style={{ fontSize: 15 }} />
                              </button>

                              {activeMenuRowId === row.id && (
                                <div
                                  className="dropdown-menu show shadow"
                                  style={{
                                    position: "absolute",
                                    top: isNearBottom ? "auto" : "100%",
                                    bottom: isNearBottom ? "100%" : "auto",
                                    right: 0,
                                    zIndex: 1060,
                                    minWidth: "180px",
                                    padding: "4px 0",
                                    margin: isNearBottom ? "0 0 4px" : "4px 0 0",
                                    fontSize: "12px",
                                    backgroundColor: "#fff",
                                    border: "1px solid rgba(0,0,0,.15)",
                                    borderRadius: "6px",
                                    textAlign: "left"
                                  }}
                                >
                                  {!row.isSubTask ? (
                                    <>
                                      <button
                                        type="button"
                                        className="dropdown-item d-flex align-items-center gap-2 py-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuRowId(null);
                                          setEditingRowId(row.id);
                                          setEditRowLabel(row.label);
                                          setEditRowAmount(row.proposedAmount);
                                          setEditRowDescription(row.description);
                                          setEditRowNotes(row.notes || "");
                                        }}
                                      >
                                        <i className="bi bi-pencil-square text-primary" /> Sửa công việc chính
                                      </button>
                                      <button
                                        type="button"
                                        className="dropdown-item d-flex align-items-center gap-2 py-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuRowId(null);
                                          setSubTaskParentId(row.id);
                                          setSubTaskEditingId(null);
                                          setNewSubTaskLabel("");
                                          setNewSubTaskAmount(0);
                                          setNewSubTaskDescription("");
                                          setNewSubTaskNotes("");
                                          setNewSubTaskCategory("");
                                          setNewSubTaskExecutionMethod("");
                                          setNewSubTaskDepartment("");
                                          setShowAddSubTaskModal(true);
                                        }}
                                      >
                                        <i className="bi bi-plus-circle text-success" /> Thêm công việc chi tiết
                                      </button>
                                      <hr className="my-1" />
                                      <button
                                        type="button"
                                        className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuRowId(null);
                                          const updated = { ...proposalData.items };
                                          delete updated[row.id];
                                          setProposalData({ ...proposalData, items: updated });
                                          toast.success("Đã xóa", `Đã xóa công việc khỏi đề xuất`);
                                        }}
                                      >
                                        <i className="bi bi-trash" /> Xoá công việc
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="dropdown-item d-flex align-items-center gap-2 py-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuRowId(null);
                                          setSubTaskParentId(row.mainTaskId);
                                          setSubTaskEditingId(row.id);
                                          setNewSubTaskLabel(row.label);
                                          setNewSubTaskAmount(row.proposedAmount);
                                          setNewSubTaskDescription(row.description || "");
                                          setNewSubTaskCategory(row.category || "");
                                          setNewSubTaskExecutionMethod(row.executionMethod || "");
                                          setNewSubTaskDepartment(row.department || "");
                                          setShowAddSubTaskModal(true);
                                        }}
                                      >
                                        <i className="bi bi-pencil-square text-primary" /> Sửa công việc chi tiết
                                      </button>
                                      <hr className="my-1" />
                                      <button
                                        type="button"
                                        className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuRowId(null);
                                          const updated = { ...proposalData.items };
                                          const parent = updated[row.mainTaskId];
                                          if (parent && parent.subTasks) {
                                            parent.subTasks = parent.subTasks.filter(sub => sub.id !== row.id);
                                            parent.proposedAmount = parent.subTasks.reduce((sum, s) => sum + s.proposedAmount, 0);
                                          }
                                          setProposalData({ ...proposalData, items: updated });
                                          toast.success("Đã xóa", `Đã xóa công việc chi tiết`);
                                        }}
                                      >
                                        <i className="bi bi-trash" /> Xoá công việc chi tiết
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                      }
                    ];

                    return (
                      <Table
                        rows={itemsList}
                        columns={proposalTableColumns}
                        fixedLayout={true}
                        wrapperClassName="mkt-plan-table-no-min"
                        wrapperStyle={{
                          flex: 1,
                          overflowY: "auto",
                        }}
                        cellStyle={(row: any, col) => ({
                          padding: "6px 8px",
                        })}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Add Subtask Offcanvas */}
          {showAddSubTaskModal && (
            <>
              {/* Backdrop */}
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1100,
                  backgroundColor: "rgba(15, 23, 42, 0.4)",
                  backdropFilter: "blur(4px)",
                  transition: "opacity 0.2s ease"
                }}
                onClick={() => { setShowAddSubTaskModal(false); setSubTaskEditingId(null); }}
              />

              {/* Offcanvas Panel */}
              <div
                className="offcanvas offcanvas-end show"
                tabIndex={-1}
                style={{
                  visibility: "visible",
                  width: 400,
                  zIndex: 1110,
                  boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
                  borderLeft: "1px solid var(--border)",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  position: "fixed",
                  top: 0,
                  right: 0
                }}
              >
                {/* Header */}
                <div
                  className="offcanvas-header d-flex justify-content-between align-items-center"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    padding: "16px 20px",
                    flexShrink: 0
                  }}
                >
                  <h5 className="offcanvas-title fw-bold" style={{ fontSize: 13, color: "#2563eb", letterSpacing: "0.04em", margin: 0 }}>
                    {subTaskEditingId ? "Sửa công việc chi tiết" : "Thêm công việc chi tiết"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => { setShowAddSubTaskModal(false); setSubTaskEditingId(null); }}
                    aria-label="Close"
                    style={{ fontSize: 12 }}
                  />
                </div>

                {/* Body */}
                <div className="offcanvas-body d-flex flex-column gap-3" style={{ padding: "20px", overflowY: "auto", flex: "1 1 auto" }}>
                  {/* Parent Main Task Info Banner */}
                  <div className="p-3 rounded bg-light border-start border-primary border-4 text-start" style={{ marginBottom: "2px" }}>
                    <span className="text-muted d-block fw-semibold mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Công việc chính</span>
                    <span className="fw-bold text-primary text-uppercase" style={{ fontSize: "12px" }}>
                      {subTaskParentId ? proposalData.items[subTaskParentId]?.label || "" : ""}
                    </span>
                  </div>

                  <div className="d-flex flex-column gap-1 text-start" style={{ position: "relative" }}>
                    <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                      Tên công việc chi tiết <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập tên công việc chi tiết..."
                      value={newSubTaskLabel}
                      onChange={(e) => {
                        setNewSubTaskLabel(e.target.value);
                        setShowSuggestions(true);
                        setFocusedSuggestionIndex(-1);
                      }}
                      onFocus={() => {
                        setShowSuggestions(true);
                        setFocusedSuggestionIndex(-1);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowSuggestions(false);
                        }, 200);
                      }}
                      onKeyDown={handleSubTaskKeyDown}
                      autoFocus
                      style={{
                        fontSize: "13px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "8px 10px"
                      }}
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div 
                        className="position-absolute shadow border rounded bg-white w-100" 
                        style={{ 
                          zIndex: 1200, 
                          maxHeight: "180px", 
                          overflowY: "auto", 
                          top: "100%", 
                          left: 0,
                          marginTop: "2px"
                        }}
                      >
                        {filteredSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            ref={(el) => { itemRefs.current[idx] = el; }}
                            className="px-3 py-2 cursor-pointer text-dark text-start"
                            style={{ 
                              fontSize: "12.5px",
                              backgroundColor: focusedSuggestionIndex === idx ? "#eff6ff" : "#fff",
                              color: focusedSuggestionIndex === idx ? "#1e40af" : "#212529",
                              fontWeight: focusedSuggestionIndex === idx ? 600 : "normal",
                              transition: "background-color 0.1s ease"
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setNewSubTaskLabel(suggestion);
                              setShowSuggestions(false);
                            }}
                            onMouseEnter={() => setFocusedSuggestionIndex(idx)}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="d-flex flex-column gap-1 text-start">
                    <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                      Hạng mục
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập hạng mục..."
                      value={newSubTaskCategory}
                      onChange={(e) => setNewSubTaskCategory(e.target.value)}
                      style={{
                        fontSize: "13px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "8px 10px"
                      }}
                    />
                  </div>

                  <div className="d-flex flex-column gap-1 text-start">
                    <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                      Hình thức triển khai
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập hình thức triển khai..."
                      value={newSubTaskExecutionMethod}
                      onChange={(e) => setNewSubTaskExecutionMethod(e.target.value)}
                      style={{
                        fontSize: "13px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "8px 10px"
                      }}
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-6 text-start d-flex flex-column gap-1">
                      <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                        Chi phí đề xuất (đ)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nhập số tiền..."
                        value={newSubTaskAmount ? newSubTaskAmount.toLocaleString("vi-VN") : ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setNewSubTaskAmount(raw ? Number(raw) : 0);
                        }}
                        style={{
                          fontSize: "13px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          padding: "8px 10px"
                        }}
                      />
                    </div>
                    <div className="col-6 text-start d-flex flex-column gap-1">
                      <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                        Bộ phận thực hiện
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nhập bộ phận thực hiện..."
                        value={newSubTaskDepartment}
                        onChange={(e) => setNewSubTaskDepartment(e.target.value)}
                        style={{
                          fontSize: "13px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          padding: "8px 10px"
                        }}
                      />
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-1 text-start flex-grow-1" style={{ minHeight: "150px" }}>
                    <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: "12px" }}>
                      Nội dung chi tiết
                    </label>
                    <textarea
                      className="form-control flex-grow-1"
                      placeholder="Nhập nội dung chi tiết..."
                      value={newSubTaskDescription}
                      onChange={(e) => setNewSubTaskDescription(e.target.value)}
                      style={{
                        fontSize: "13px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "8px 10px",
                        resize: "none",
                        height: "100%"
                      }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="px-4 py-3 border-top d-flex justify-content-end gap-2 bg-light"
                  style={{ flexShrink: 0 }}
                >
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3"
                    onClick={() => { setShowAddSubTaskModal(false); setSubTaskEditingId(null); }}
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary px-3"
                    onClick={() => {
                      if (!newSubTaskLabel.trim()) {
                        toast.error("Lỗi", "Vui lòng nhập tên công việc chi tiết");
                        return;
                      }
                      if (subTaskParentId) {
                        const updated = { ...proposalData.items };
                        const parent = updated[subTaskParentId];
                        if (parent) {
                          const subTasks = parent.subTasks || [];
                          if (subTaskEditingId) {
                            parent.subTasks = subTasks.map(sub => {
                              if (sub.id === subTaskEditingId) {
                                return {
                                  ...sub,
                                  label: newSubTaskLabel.trim().toUpperCase(),
                                  proposedAmount: newSubTaskAmount,
                                  description: newSubTaskDescription,
                                  category: newSubTaskCategory,
                                  executionMethod: newSubTaskExecutionMethod,
                                  department: newSubTaskDepartment
                                };
                              }
                              return sub;
                            });
                            toast.success("Thành công", `Đã cập nhật công việc chi tiết: ${newSubTaskLabel.trim().toUpperCase()}`);
                          } else {
                            const newSubId = `sub_${Date.now()}`;
                            const newSub = {
                              id: newSubId,
                              label: newSubTaskLabel.trim().toUpperCase(),
                              proposedAmount: newSubTaskAmount,
                              description: newSubTaskDescription,
                              notes: "",
                              category: newSubTaskCategory,
                              executionMethod: newSubTaskExecutionMethod,
                              department: newSubTaskDepartment
                            };
                            parent.subTasks = [...subTasks, newSub];
                            toast.success("Thành công", `Đã thêm công việc chi tiết: ${newSub.label}`);
                          }
                          parent.proposedAmount = parent.subTasks.reduce((sum, s) => sum + s.proposedAmount, 0);
                          setProposalData({ ...proposalData, items: updated });
                        }
                      }
                      setShowAddSubTaskModal(false);
                      setSubTaskEditingId(null);
                    }}
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    {subTaskEditingId ? "Cập nhật" : "Thêm mới"}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {showPrintModal && (
        <PrintPreviewModal
          title="Xem trước bản in Đề xuất chi phí"
          subtitle={<>Số hiệu: <strong>{proposalData.code}</strong>&nbsp;·&nbsp;Bộ phận: {proposalData.department || "Phòng Marketing"}</>}
          actions={
            <div className="d-flex align-items-center gap-3 me-3">
              <div className="d-flex align-items-center gap-2" style={{ color: "var(--foreground)", fontSize: "12.5px" }}>
                <span>Chiều cao dòng:</span>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={rowPadding}
                  onChange={(e) => setRowPadding(Number(e.target.value))}
                  style={{ width: "90px", accentColor: "#1d4ed8", cursor: "pointer" }}
                />
                <span className="fw-bold text-primary" style={{ minWidth: "28px", textAlign: "right" }}>{rowPadding}px</span>
                <button
                  type="button"
                  title="Đặt lại chiều cao mặc định"
                  onClick={() => setRowPadding(3)}
                  style={{ border: "none", background: "none", padding: "0 0 0 4px", display: "inline-flex", alignItems: "center", color: "var(--muted-foreground)", cursor: "pointer" }}
                >
                  <i className="bi bi-arrow-counterclockwise" style={{ fontSize: "14px" }} />
                </button>
              </div>
              <button
                onClick={() => printDocumentById("proposal-print-doc", "portrait", `Đề xuất chi phí - ${proposalData.code}`)}
                style={{ padding: "8px 18px", border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                <i className="bi bi-printer" /> In đề xuất
              </button>
              <button
                onClick={async () => {
                  try {
                    await exportElementToPDF("proposal-print-doc", `De_xuat_chi_phi_MKT_${proposalData.code || "Proposal"}.pdf`, {
                      orientation: "portrait",
                      scale: 2,
                      keepOriginalStyles: true
                    });
                    toast.success("Thành công", "Đã xuất và tải xuống file PDF thành công!");
                  } catch (err) {
                    console.error(err);
                    toast.error("Lỗi", "Không thể xuất PDF trực tiếp.");
                  }
                }}
                style={{ padding: "8px 18px", border: "none", background: "#dc2626", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                <i className="bi bi-file-earmark-pdf" /> Xuất PDF
              </button>
            </div>
          }
          sidebar={
            <div className="d-flex flex-column gap-4">
              <div>
                <p className="fw-bold text-secondary mb-2" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Chữ ký người lập đề xuất
                </p>
                <SignaturePad
                  placeholder="Ký vào đây bằng ngón tay hoặc bút"
                  onSave={(dataUrl) => setProposerSig(dataUrl)}
                  onClear={() => setProposerSig(null)}
                  width={268}
                  height={100}
                />
              </div>
              <hr className="my-0" style={{ borderColor: "var(--border)" }} />
              <div>
                <p className="fw-bold text-secondary mb-2" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Chữ ký người phê duyệt
                </p>
                <SignaturePad
                  placeholder="Ký vào đây bằng ngón tay hoặc bút"
                  onSave={(dataUrl) => setApproverSig(dataUrl)}
                  onClear={() => setApproverSig(null)}
                  width={268}
                  height={100}
                />
              </div>
            </div>
          }
          document={
            <ProposalPrintDocument
              proposalData={proposalData}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              plannedBudget={monthlyBudgets[selectedMonth] || 0}
              rowPadding={rowPadding}
              proposerSig={proposerSig}
              approverSig={approverSig}
            />
          }
          onClose={() => {
            setShowPrintModal(false);
            setProposerSig(null);
            setApproverSig(null);
          }}
          documentId="proposal-print-modal-wrapper"
          hideSidebarOnDesktop={true}
        />
      )}

      {showPlanPrintModal && (
        <PrintPreviewModal
          title={`Xem trước bản in Kế hoạch Marketing năm ${selectedYear}`}
          subtitle={<>Năm kế hoạch: <strong>{selectedYear}</strong>&nbsp;·&nbsp;Bộ phận: Phòng Marketing</>}
          actions={
            <div className="d-flex align-items-center gap-3 me-3">
              <div className="d-flex align-items-center gap-2" style={{ color: "var(--foreground)", fontSize: "12.5px" }}>
                <span>Chiều cao dòng:</span>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={rowPadding}
                  onChange={(e) => setRowPadding(Number(e.target.value))}
                  style={{ width: "90px", accentColor: "#1d4ed8", cursor: "pointer" }}
                />
                <span className="fw-bold text-primary" style={{ minWidth: "28px", textAlign: "right" }}>{rowPadding}px</span>
                <button
                  type="button"
                  title="Đặt lại chiều cao mặc định"
                  onClick={() => setRowPadding(3)}
                  style={{ border: "none", background: "none", padding: "0 0 0 4px", display: "inline-flex", alignItems: "center", color: "var(--muted-foreground)", cursor: "pointer" }}
                >
                  <i className="bi bi-arrow-counterclockwise" style={{ fontSize: "14px" }} />
                </button>
              </div>
              <button
                onClick={() => printDocumentById("plan-print-doc", "portrait", `Ke hoach marketing nam ${selectedYear}`, false)}
                style={{ padding: "8px 18px", border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                <i className="bi bi-printer" /> In kế hoạch
              </button>
              <button
                onClick={async () => {
                  try {
                    await exportElementToPDF("plan-print-doc", `Ke_hoach_MKT_nam_${selectedYear}.pdf`, {
                      orientation: "portrait",
                      scale: 2,
                      keepOriginalStyles: true,
                      marginTop: 0,
                      marginBottom: 0,
                      marginLeft: 0,
                      marginRight: 0,
                      paginate: true
                    });
                    toast.success("Thành công", "Đã xuất và tải xuống file PDF kế hoạch thành công!");
                  } catch (err) {
                    console.error(err);
                    toast.error("Lỗi", "Không thể xuất PDF trực tiếp.");
                  }
                }}
                style={{ padding: "8px 18px", border: "none", background: "#dc2626", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                <i className="bi bi-file-earmark-pdf" /> Xuất PDF
              </button>
            </div>
          }
          sidebar={
            <div className="d-flex flex-column gap-4">
              <div>
                <p className="fw-bold text-secondary mb-2" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Chữ ký người lập kế hoạch
                </p>
                <SignaturePad
                  placeholder="Ký vào đây bằng ngón tay hoặc bút"
                  onSave={(dataUrl) => setPlanProposerSig(dataUrl)}
                  onClear={() => setPlanProposerSig(null)}
                  width={268}
                  height={100}
                />
              </div>
              <hr className="my-0" style={{ borderColor: "var(--border)" }} />
              <div>
                <p className="fw-bold text-secondary mb-2" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Chữ ký người phê duyệt
                </p>
                <SignaturePad
                  placeholder="Ký vào đây bằng ngón tay hoặc bút"
                  onSave={(dataUrl) => setPlanApproverSig(dataUrl)}
                  onClear={() => setPlanApproverSig(null)}
                  width={268}
                  height={100}
                />
              </div>
            </div>
          }
          document={
            <PlanPrintDocument
              selectedYear={selectedYear}
              budgetRows={budgetRows}
              salaryRows={salaryRows}
              contentPlanRows={(() => {
                const arr: any[] = [];
                let parentSttIdx = 1;
                contentPlanList.forEach((parent) => {
                  arr.push({
                    ...parent,
                    stt: String(parentSttIdx++)
                  });

                  const { children } = parseParentDetails(parent.details);
                  children.forEach((child) => {
                    const childRatio = parseFloat(child.ratioStr || "") || 0;
                    const childBudget = childRatio > 0 ? Math.round((childRatio / 100) * valBranding) : 0;
                    const childPosts = child.postsCount || 0;

                    arr.push({
                      id: `${parent.id}_child_${child.id}`,
                      pillar: child.pillar,
                      details: child.details,
                      budget: childBudget,
                      postsCount: childPosts,
                      isChildRow: true,
                      parentId: parent.id,
                      childId: child.id,
                      stt: "",
                      ratioStr: child.ratioStr || ""
                    });
                  });
                });
                return arr;
              })()}
              adPlanRows={(() => {
                const arr: any[] = [];
                let adSttIdx = 1;
                adPlanList.forEach((parent) => {
                  arr.push({
                    ...parent,
                    stt: String(adSttIdx++)
                  });

                  const { children } = parseParentDetails(parent.details || "");
                  children.forEach((child) => {
                    const childRatio = parseFloat(child.ratioStr || "") || 0;
                    const childBudget = child.budget !== undefined ? child.budget : (childRatio > 0 ? Math.round((childRatio / 100) * valBranding) : 0);

                    arr.push({
                      id: `${parent.id}_child_${child.id}`,
                      objective: child.pillar,
                      topic: "",
                      channel: child.channel || "",
                      content: child.details,
                      landingPage: child.landingPage || "",
                      budget: childBudget,
                      region: "",
                      assignee: "",
                      startDate: "",
                      endDate: "",
                      audience: "",
                      isChildRow: true,
                      parentId: parent.id,
                      childId: child.id,
                      stt: "",
                      ratioStr: child.ratioStr || ""
                    });
                  });
                });
                return arr;
              })()}
              monthlyBudgets={monthlyBudgets}
              sectionContentItems={sectionContentItems}
              rowPadding={rowPadding}
              proposerSig={planProposerSig}
              approverSig={planApproverSig}
              categoryBudgets={{
                agencyPOSBudget,
                agencyAdsBudget,
                agencyGiftBudget,
                advFbAds,
                advGoogleAds,
                advYoutubeAds,
                advTiktokAds,
                advSeoPr,
                advPrintOutsource,
                advMediaModelDecor,
                advWebDesign,
                advOther,
                advReserve,
              }}
              monthlyAllocations={monthlyAllocations}
              valBranding={valBranding}
              monthlyThemes={monthlyThemes}
              customHolidays={customHolidays}
              monthlyProducts={monthlyProducts}
              planStatus={planStatus}
            />
          }
          onClose={() => {
            setPlanProposerSig(null);
            setPlanApproverSig(null);
            setShowPlanPrintModal(false);
          }}
          documentId="plan-print-modal-wrapper"
          hideSidebarOnDesktop={true}
          keepFirstPageMargin={false}
        />
      )}

      {showMonthlyPlanPrintModal && monthlyPlanData && monthlyPlanData.items && (
        <PrintPreviewModal
          title={`Xem trước bản in Kế hoạch Marketing tháng ${selectedMonth}/${selectedYear}`}
          subtitle={<>Số hiệu: <strong>{monthlyPlanData.code}</strong>&nbsp;·&nbsp;Bộ phận: {monthlyPlanData.department || "Phòng Marketing"}</>}
          actions={
            <div className="d-flex align-items-center gap-3 me-3">
              <div className="d-flex align-items-center gap-2" style={{ color: "var(--foreground)", fontSize: "12.5px" }}>
                <span>Chiều cao dòng:</span>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={rowPadding}
                  onChange={(e) => setRowPadding(Number(e.target.value))}
                  style={{ width: "90px", accentColor: "#1d4ed8", cursor: "pointer" }}
                />
                <span className="fw-bold text-primary" style={{ minWidth: "28px", textAlign: "right" }}>{rowPadding}px</span>
                <button
                  type="button"
                  title="Đặt lại chiều cao mặc định"
                  onClick={() => setRowPadding(3)}
                  style={{ border: "none", background: "none", padding: "0 0 0 4px", display: "inline-flex", alignItems: "center", color: "var(--muted-foreground)", cursor: "pointer" }}
                >
                  <i className="bi bi-arrow-counterclockwise" style={{ fontSize: "14px" }} />
                </button>
              </div>
              <button
                onClick={() => printDocumentById("monthly-plan-print-doc", "portrait", `Kế hoạch Marketing tháng - ${monthlyPlanData.code}`)}
                style={{ padding: "8px 18px", border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                <i className="bi bi-printer" /> In kế hoạch
              </button>
              <button
                onClick={async () => {
                  try {
                    await exportElementToPDF("monthly-plan-print-doc", `Ke_hoach_MKT_thang_${selectedMonth}_${selectedYear}.pdf`, {
                      orientation: "portrait",
                      scale: 2,
                      keepOriginalStyles: true,
                      marginTop: 0,
                      marginBottom: 0,
                      marginLeft: 0,
                      marginRight: 0,
                      paginate: true
                    });
                    toast.success("Thành công", "Đã xuất và tải xuống file PDF thành công!");
                  } catch (err) {
                    console.error(err);
                    toast.error("Lỗi", "Không thể xuất PDF trực tiếp.");
                  }
                }}
                style={{ padding: "8px 18px", border: "none", background: "#dc2626", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                <i className="bi bi-file-earmark-pdf" /> Xuất PDF
              </button>
            </div>
          }
          sidebar={
            <div className="d-flex flex-column gap-4">
              <div>
                <p className="fw-bold text-secondary mb-2" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Chữ ký người lập kế hoạch
                </p>
                <SignaturePad
                  placeholder="Ký vào đây bằng ngón tay hoặc bút"
                  onSave={(dataUrl) => setPlanProposerSig(dataUrl)}
                  onClear={() => setPlanProposerSig(null)}
                  width={268}
                  height={100}
                />
              </div>
              <hr className="my-0" style={{ borderColor: "var(--border)" }} />
              <div>
                <p className="fw-bold text-secondary mb-2" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Chữ ký người phê duyệt
                </p>
                <SignaturePad
                  placeholder="Ký vào đây bằng ngón tay hoặc bút"
                  onSave={(dataUrl) => setPlanApproverSig(dataUrl)}
                  onClear={() => setPlanApproverSig(null)}
                  width={268}
                  height={100}
                />
              </div>
            </div>
          }
          document={
            <ProposalPrintDocument
              id="monthly-plan-print-doc"
              proposalData={monthlyPlanData}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              plannedBudget={monthlyBudgets[selectedMonth] || 0}
              rowPadding={rowPadding}
              proposerSig={planProposerSig}
              approverSig={planApproverSig}
              isPlan={true}
              monthlyThemes={monthlyThemes}
              customHolidays={customHolidays}
              monthlyProducts={monthlyProducts}
              sectionContentItems={sectionContentItems}
            />
          }
          onClose={() => {
            setShowMonthlyPlanPrintModal(false);
            setPlanProposerSig(null);
            setPlanApproverSig(null);
          }}
          documentId="monthly-plan-print-modal-wrapper"
          hideSidebarOnDesktop={true}
          keepFirstPageMargin={false}
        />
      )}

      {/* Hidden print document for background PDF generation */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <ProposalPrintDocument
          id="proposal-print-doc-hidden"
          proposalData={proposalData}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          plannedBudget={monthlyBudgets[selectedMonth] || 0}
          rowPadding={rowPadding}
          proposerSig={proposerSig}
          approverSig={approverSig}
        />
      </div>

      {/* Hidden monthly plan print document for background PDF generation */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <ProposalPrintDocument
          id="monthly-plan-print-doc-hidden"
          proposalData={monthlyPlanData}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          plannedBudget={monthlyBudgets[selectedMonth] || 0}
          rowPadding={rowPadding}
          proposerSig={planProposerSig}
          approverSig={planApproverSig}
          isPlan={true}
          monthlyThemes={monthlyThemes}
          customHolidays={customHolidays}
          monthlyProducts={monthlyProducts}
          sectionContentItems={sectionContentItems}
        />
      </div>

      {/* Hidden yearly plan print document for background PDF generation */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <PlanPrintDocument
          id="plan-print-doc-hidden"
          selectedYear={selectedYear}
          budgetRows={budgetRows}
          salaryRows={salaryRows}
          contentPlanRows={(() => {
            const arr: any[] = [];
            let parentSttIdx = 1;
            contentPlanList.forEach((parent) => {
              arr.push({
                ...parent,
                stt: String(parentSttIdx++)
              });

              const { children } = parseParentDetails(parent.details);
              children.forEach((child) => {
                const childRatio = parseFloat(child.ratioStr || "") || 0;
                const childBudget = childRatio > 0 ? Math.round((childRatio / 100) * valBranding) : 0;
                const childPosts = child.postsCount || 0;

                arr.push({
                  id: `${parent.id}_child_${child.id}`,
                  pillar: child.pillar,
                  topic: "",
                  channel: child.channel || "",
                  details: child.details,
                  budget: childBudget,
                  postsCount: childPosts,
                  isChildRow: true,
                  parentId: parent.id,
                  childId: child.id,
                  stt: "",
                  ratioStr: child.ratioStr || ""
                });
              });
            });
            return arr;
          })()}
          adPlanRows={(() => {
            const arr: any[] = [];
            let adSttIdx = 1;
            adPlanList.forEach((parent) => {
              arr.push({
                ...parent,
                stt: String(adSttIdx++)
              });

              const { children } = parseParentDetails(parent.details || "");
              children.forEach((child) => {
                const childRatio = parseFloat(child.ratioStr || "") || 0;
                const childBudget = child.budget !== undefined ? child.budget : (childRatio > 0 ? Math.round((childRatio / 100) * valBranding) : 0);

                arr.push({
                  id: `${parent.id}_child_${child.id}`,
                  objective: child.pillar,
                  topic: "",
                  channel: child.channel || "",
                  content: child.details,
                  landingPage: child.landingPage || "",
                  budget: childBudget,
                  region: "",
                  assignee: "",
                  startDate: "",
                  endDate: "",
                  audience: "",
                  isChildRow: true,
                  parentId: parent.id,
                  childId: child.id,
                  stt: "",
                  ratioStr: child.ratioStr || ""
                });
              });
            });
            return arr;
          })()}
          monthlyBudgets={monthlyBudgets}
          sectionContentItems={sectionContentItems}
          rowPadding={rowPadding}
          proposerSig={planProposerSig}
          approverSig={planApproverSig}
          categoryBudgets={{
            agencyPOSBudget,
            agencyAdsBudget,
            agencyGiftBudget,
            advFbAds,
            advGoogleAds,
            advYoutubeAds,
            advTiktokAds,
            advSeoPr,
            advPrintOutsource,
            advMediaModelDecor,
            advWebDesign,
            advOther,
            advReserve,
          }}
          monthlyAllocations={monthlyAllocations}
          valBranding={valBranding}
          monthlyThemes={monthlyThemes}
          customHolidays={customHolidays}
          monthlyProducts={monthlyProducts}
          planStatus={planStatus}
        />
      </div>
    </div>
  );
}
