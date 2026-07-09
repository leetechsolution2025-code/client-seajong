"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";

// ── Mock data ──────────────────────────────────────────────────────────────
const KPI_CARDS = [
  {
    label: "Doanh thu năm",
    value: "38.6 tỷ",
    icon: "bi-bar-chart-line-fill",
    accent: "#8b5cf6",
    subtitle: "+15.2% so năm ngoái",
  },
  {
    label: "Doanh thu tháng",
    value: "4.2 tỷ",
    icon: "bi-cash-coin",
    accent: "#3b82f6",
    subtitle: "+12.5% so tháng trước",
  },
  {
    label: "Tổng chi phí năm",
    value: "29.4 tỷ",
    icon: "bi-arrow-up-circle-fill",
    accent: "#ef4444",
    subtitle: "Lũy kế đến tháng 3/2026",
  },
  {
    label: "Lợi nhuận năm",
    value: "9.2 tỷ",
    icon: "bi-graph-up-arrow",
    accent: "#10b981",
    subtitle: "Lũy kế đến tháng 3/2026",
  },
];



const REVENUE_COST_SERIES = [
  {
    name: "Doanh thu",
    // T1   T2   T3    T4     T5     T6     T7     T8     T9     T10    T11    T12
    data: [2.8, 3.1, 4.2, null, null, null, null, null, null, null, null, null],
    color: "#3b82f6",
  },
  {
    name: "Chi phí",
    data: [2.1, 2.4, 3.3, null, null, null, null, null, null, null, null, null],
    color: "#ef4444",
  },
  {
    name: "Dòng tiền",
    data: [0.5, 0.6, 0.7, null, null, null, null, null, null, null, null, null],
    color: "#10b981",
  },
];

// Điểm sức khoẻ dòng tiền: 0–100
// < 40: Nguy hiểm | 40–70: Cần chú ý | > 70: Tốt
const CASH_FLOW_SCORE = 68; // mock: tính từ dòng tiền / doanh thu tháng

function CashFlowHealth({ score }: { score: number }) {
  const getZone = (s: number) => {
    if (s >= 70) return { label: "Tốt", color: "#10b981", bg: "rgba(16,185,129,0.12)" };
    if (s >= 40) return { label: "Cần chú ý", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    return { label: "Nguy hiểm", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
  };

  const zone = getZone(score);
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div style={{ padding: "4px 0" }}>
      {/* Label + badge */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted-foreground)" }}>
          Chỉ số sức khoẻ dòng tiền
        </span>
        <span
          style={{
            fontSize: 12.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
            color: zone.color, background: zone.bg, letterSpacing: "0.03em",
          }}
        >
          {zone.label} · {score}/100
        </span>
      </div>

      {/* Thanh phân đoạn */}
      <div style={{ position: "relative", height: 12, borderRadius: 99, overflow: "hidden", background: "var(--border)" }}>
        {/* Vùng màu nền: đỏ → vàng → xanh */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, #ef4444 0%, #ef4444 40%, #f59e0b 40%, #f59e0b 70%, #10b981 70%, #10b981 100%)",
          opacity: 0.25,
        }} />
        {/* Phần fill theo score */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: `${clampedScore}%`,
          background: zone.color,
          borderRadius: 99,
          transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          opacity: 0.85,
        }} />
      </div>

      {/* Nhãn phân đoạn */}
      <div className="d-flex justify-content-between mt-1">
        <span style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 600 }}>Nguy hiểm</span>
        <span style={{ fontSize: 11.5, color: "#f59e0b", fontWeight: 600 }}>Cần chú ý</span>
        <span style={{ fontSize: 11.5, color: "#10b981", fontWeight: 600 }}>Tốt</span>
      </div>
    </div>
  );
}

// No mock payload anymore

type AiInsight = { type: "positive" | "warning" | "negative"; text: string };
type AiResult = { rating: string; summary: string; insights: AiInsight[]; recommendation: string };

const INSIGHT_CONFIG = {
  positive: { icon: "bi-check-circle-fill", color: "#10b981" },
  warning: { icon: "bi-exclamation-triangle-fill", color: "#f59e0b" },
  negative: { icon: "bi-x-circle-fill", color: "#ef4444" },
};

const RATING_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  "tốt": { color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "bi-shield-check" },
  "cần chú ý": { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "bi-shield-exclamation" },
  "nguy hiểm": { color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: "bi-shield-x" },
};

interface AiAnalysisProps {
  status: "idle" | "loading" | "done" | "error";
  result: AiResult | null;
  errMsg: string;
  analyze: () => void;
  setStatus: React.Dispatch<React.SetStateAction<"idle" | "loading" | "done" | "error">>;
}

function AiAnalysis({ status, result, errMsg, analyze, setStatus }: AiAnalysisProps) {
  const ratingCfg = result ? (RATING_CONFIG[result.rating] ?? RATING_CONFIG["cần chú ý"]) : null;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Nút phân tích */}
      {status === "idle" && (
        <button
          onClick={analyze}
          className="btn w-100 d-flex align-items-center justify-content-center gap-2"
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            color: "#fff", fontWeight: 600, fontSize: 14,
            border: "none", borderRadius: 10, padding: "10px 16px",
            boxShadow: "0 4px 14px rgba(139,92,246,0.35)",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <i className="bi bi-stars" style={{ fontSize: 16 }} />
          Phân tích tài chính bằng AI
        </button>
      )}

      {/* Loading */}
      {status === "loading" && (
        <div className="d-flex align-items-center gap-2" style={{ padding: "12px 0", color: "var(--muted-foreground)", fontSize: 14 }}>
          <div className="spinner-border spinner-border-sm" style={{ color: "#8b5cf6" }} role="status" />
          <span>Gemini đang phân tích dữ liệu tài chính...</span>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}><i className="bi bi-exclamation-circle me-1" />{errMsg}</p>
          <button onClick={() => setStatus("idle")} style={{ fontSize: 12.5, color: "#8b5cf6", background: "none", border: "none", padding: 0, marginTop: 4, cursor: "pointer" }}>Thử lại</button>
        </div>
      )}

      {/* Result */}
      {status === "done" && result && ratingCfg && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Rating header */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 10,
              background: ratingCfg.bg, border: `1px solid ${ratingCfg.color}30`,
            }}
          >
            <i className={`bi ${ratingCfg.icon}`} style={{ fontSize: 20, color: ratingCfg.color, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: ratingCfg.color, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Đánh giá: {result.rating}
              </p>
              <p style={{ fontSize: 12.5, color: "var(--foreground)", margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                {result.summary}
              </p>
            </div>
          </div>

          {/* Recommendation */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)",
            }}
          >
            <i className="bi bi-lightbulb" style={{ fontSize: 20, color: "#8b5cf6", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Khuyến nghị
              </p>
              <p style={{ fontSize: 12.5, color: "var(--foreground)", margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                {result.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper format
const formatMoney = (val: number) => {
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)} tỷ`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)} triệu`;
  return `${val.toLocaleString("vi-VN")} đ`;
};

// ── AI Detail types ──────────────────────────────────────────────────────
type DetailSection = { danhGia: "tốt" | "cần chú ý" | "nguy hiểm"; nhanXet: string };
type AiDetailResult = {
  tongQuan: string;
  doanhThu: DetailSection;
  chiPhi: DetailSection;
  dongTien: DetailSection;
  loiNhuan: DetailSection;
  ruiRo: string[];
  coHoi: string[];
  khuyen_nghi: string[];
};

const SECTION_DETAIL_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  "tốt":        { color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: "bi-check-circle-fill" },
  "cần chú ý": { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "bi-exclamation-triangle-fill" },
  "nguy hiểm": { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: "bi-x-circle-fill" },
};

function DetailRow({ label, section }: { label: string; section: DetailSection }) {
  const cfg = SECTION_DETAIL_CONFIG[section.danhGia] ?? SECTION_DETAIL_CONFIG["cần chú ý"];
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="d-flex align-items-center gap-2 mb-1">
        <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: 14 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: 11.5, padding: "1px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{section.danhGia}</span>
      </div>
      <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.6, margin: 0, paddingLeft: 20 }}>{section.nhanXet}</p>
    </div>
  );
}

function ListBlock({ title, icon, color, items }: { title: string; icon: string; color: string; items: string[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        <i className={`bi ${icon} me-1`} />{title}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.5 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AiDetailOffcanvas({ open, onClose, payload }: { open: boolean; onClose: () => void; payload: any }) {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [result, setResult] = useState<AiDetailResult | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!payload) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/board/ai-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
      setStatus("done");
    } catch (e) {
      setErrMsg(String(e));
      setStatus("error");
    }
  }, [payload]);

  useEffect(() => { if (open) fetchDetail(); }, [open, fetchDetail]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1040, backdropFilter: "blur(2px)" }}
      />
      {/* Offcanvas panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: isMobile ? "100%" : 420, maxWidth: "100%", zIndex: 1045,
        background: "var(--card)", borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between p-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-stars" style={{ fontSize: 16, color: "#8b5cf6" }} />
            <span style={{ fontWeight: 700, fontSize: 15.5 }}>Đánh giá AI chi tiết</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 20, color: "var(--muted-foreground)", cursor: "pointer", padding: "0 4px", lineHeight: 1 }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px" }}>
          {status === "loading" && (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-3">
              <div className="spinner-border" style={{ color: "#8b5cf6" }} role="status" />
              <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Gemini đang phân tích toàn diện...</span>
            </div>
          )}

          {status === "error" && (
            <div>
              <p style={{ color: "#ef4444", fontSize: 14 }}>{errMsg}</p>
              <button onClick={fetchDetail} className="btn btn-sm" style={{ background: "#8b5cf6", color: "#fff" }}>Thử lại</button>
            </div>
          )}

          {status === "done" && result && (
            <div>
              {/* Tổng quan */}
              <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 10, background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: "#8b5cf6", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <i className="bi bi-file-earmark-text me-1" />Tổng quan
                </p>
                <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>{result.tongQuan}</p>
              </div>

              {/* 4 mảng phân tích */}
              <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Phân tích chi tiết</p>
              <DetailRow label="Doanh thu" section={result.doanhThu} />
              <DetailRow label="Chi phí" section={result.chiPhi} />
              <DetailRow label="Dòng tiền" section={result.dongTien} />
              <DetailRow label="Lợi nhuận" section={result.loiNhuan} />

              <hr style={{ borderColor: "var(--border)", margin: "8px 0 16px" }} />

              {/* Rủi ro & Cơ hội */}
              <ListBlock title="Rủi ro cần lưu ý" icon="bi-exclamation-triangle" color="#ef4444" items={result.ruiRo} />
              <ListBlock title="Cơ hội tăng trưởng" icon="bi-graph-up-arrow" color="#10b981" items={result.coHoi} />

              <hr style={{ borderColor: "var(--border)", margin: "8px 0 16px" }} />

              {/* Khuyến nghị */}
              <ListBlock title="Khuyến nghị cho BGĐ" icon="bi-lightbulb" color="#8b5cf6" items={result.khuyen_nghi} />

              {/* Làm mới */}
              <button onClick={fetchDetail} style={{ fontSize: 12.5, color: "var(--muted-foreground)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <i className="bi bi-arrow-clockwise me-1" />Phân tích lại
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Four Pillars Dashboard ──────────────────────────────────────────────────
interface Metric {
  name: string;
  value: string;
  sub: string;
  progress?: number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

interface Pillar {
  id: string;
  title: string;
  shortDesc: string;
  status: string;
  statusColor: string;
  statusBg: string;
  icon: string;
  color: string;
  axis: "commercial" | "technical";
  metrics: Metric[];
}

const PILLARS_DATA: Pillar[] = [
  {
    id: "biz-mkt",
    title: "Kinh doanh & Marketing",
    shortDesc: "Tốc độ mở rộng thị trường & Doanh thu",
    status: "Tăng trưởng tốt",
    statusColor: "#8b5cf6",
    statusBg: "rgba(139, 92, 246, 0.08)",
    icon: "bi-megaphone-fill",
    color: "#8b5cf6",
    axis: "commercial",
    metrics: [
      { name: "Doanh thu tháng", value: "--", sub: "Doanh thu / Mục tiêu tháng", progress: 0, trend: "neutral" },
      { name: "Tỷ lệ báo giá thành công", value: "--", sub: "Cơ hội chuyển đổi báo giá", progress: 0, trend: "neutral" },
      { name: "Giá trị đơn hàng (AOV)", value: "--", sub: "Bình quân các đơn hàng đã tạo", progress: 0, trend: "neutral" },
      { name: "Khách hàng mua lại", value: "--", sub: "Tổng số khách hàng trong hệ thống CRM", progress: 0, trend: "neutral" }
    ]
  },
  {
    id: "finance",
    title: "Tài chính",
    shortDesc: "Tối ưu dòng vốn & Biên lợi nhuận",
    status: "Ổn định",
    statusColor: "#3b82f6",
    statusBg: "rgba(59, 130, 246, 0.08)",
    icon: "bi-wallet2",
    color: "#3b82f6",
    axis: "commercial",
    metrics: [
      { name: "Dòng tiền thuần", value: "--", sub: "Thu thực tế trừ chi thực tế tháng", progress: 0, trend: "neutral" },
      { name: "Biên lợi nhuận gộp", value: "--", sub: "Định mức biên lợi nhuận gộp mục tiêu", progress: 0, trend: "neutral" },
      { name: "Nợ quá hạn & DSO", value: "--", sub: "Tổng các khoản nợ đã quá hạn thanh toán", progress: 0, trend: "neutral" },
      { name: "Chỉ số sức khoẻ dòng tiền", value: "--", sub: "Trạng thái dòng tiền", progress: 0, trend: "neutral" }
    ]
  },
  {
    id: "hr",
    title: "Nhân sự",
    shortDesc: "Hiệu suất chuyên gia & Năng suất",
    status: "Đạt hiệu quả",
    statusColor: "#10b981",
    statusBg: "rgba(16, 185, 129, 0.08)",
    icon: "bi-people-fill",
    color: "#10b981",
    axis: "technical",
    metrics: [
      { name: "Doanh thu / Nhân sự", value: "--", sub: "Năng suất bình quân mỗi nhân viên", progress: 0, trend: "neutral" },
      { name: "Doanh số / Sales Rep", value: "--", sub: "Doanh số bình quân nhân viên Sales", progress: 0, trend: "neutral" },
      { name: "Biến động nhân sự chủ chốt", value: "--", sub: "Tỷ lệ nhân sự chủ chốt nghỉ việc", progress: 0, trend: "neutral" },
      { name: "Hiệu suất nhân sự", value: "--", sub: "Tỷ lệ chấm công đúng giờ", progress: 0, trend: "neutral" }
    ]
  },
  {
    id: "operations",
    title: "Vận hành hệ thống",
    shortDesc: "Logistics nhập khẩu & Chất lượng lắp ráp",
    status: "Cần cải thiện",
    statusColor: "#f59e0b",
    statusBg: "rgba(245, 158, 11, 0.08)",
    icon: "bi-gear-fill",
    color: "#f59e0b",
    axis: "technical",
    metrics: [
      { name: "Tỷ lệ OTIF", value: "--", sub: "Giao lắp đúng hạn & đủ số lượng", progress: 0, trend: "neutral" },
      { name: "Vòng quay / Tuổi kho", value: "--", sub: "Hàng tồn kho trung bình < 90 ngày", progress: 0, trend: "neutral" },
      { name: "Tỷ lệ lỗi lắp ráp", value: "--", sub: "Lỗi cài đặt/cấu hình tại công trường", progress: 0, trend: "neutral" },
      { name: "Lead Time (LTTR)", value: "--", sub: "Thời gian trung bình xử lý sự cố", progress: 0, trend: "neutral" }
    ]
  }
];

function FourPillarsDashboard({ stats }: { stats: any }) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [timeFrame, setTimeFrame] = useState<"month" | "year">("month");

  const steps = [
    { num: 1, title: "Kinh doanh", icon: "bi-megaphone-fill", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.08)" },
    { num: 2, title: "Tài chính", icon: "bi-wallet2", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" },
    { num: 3, title: "Nhân sự", icon: "bi-people-fill", color: "#10b981", bg: "rgba(16, 185, 129, 0.08)" },
    { num: 4, title: "Vận hành", icon: "bi-gear-fill", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)" },
  ];

  const now = new Date();
  const expectedProgress = (now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100;

  const commercialMetrics: Metric[] = stats ? [
    { 
      name: "Doanh thu", 
      value: `${timeFrame === "month" ? stats.pillars.commercial.revenueProgress : stats.pillars.commercial.revenueYearlyProgress}%`, 
      sub: `${formatMoney(timeFrame === "month" ? stats.pillars.commercial.revenueActual : stats.pillars.commercial.revenueYearlyActual)} / ${formatMoney(timeFrame === "month" ? stats.pillars.commercial.revenueTarget : stats.pillars.commercial.revenueYearlyTarget)} mục tiêu`, 
      progress: timeFrame === "month" ? stats.pillars.commercial.revenueProgress : stats.pillars.commercial.revenueYearlyProgress, 
      trend: (timeFrame === "month" ? stats.pillars.commercial.revenueProgress : stats.pillars.commercial.revenueYearlyProgress) < expectedProgress ? "down" : "up",
      trendValue: (timeFrame === "month" ? stats.pillars.commercial.revenueProgress : stats.pillars.commercial.revenueYearlyProgress) >= 100 ? "Vượt chỉ tiêu" : ((timeFrame === "month" ? stats.pillars.commercial.revenueProgress : stats.pillars.commercial.revenueYearlyProgress) < expectedProgress ? "Chậm tiến độ" : "Đạt tiến độ")
    },
    { 
      name: "Tỷ lệ báo giá thành công", 
      value: `${timeFrame === "month" ? stats.pillars.commercial.monthlyWinRate : stats.pillars.commercial.winRate}%`, 
      sub: `${timeFrame === "month" ? stats.pillars.commercial.monthlyWonCount : stats.pillars.commercial.wonCount}/${timeFrame === "month" ? stats.pillars.commercial.monthlyTotalQuotations : stats.pillars.commercial.totalQuotations} cơ hội báo giá`, 
      progress: timeFrame === "month" ? stats.pillars.commercial.monthlyWinRate : stats.pillars.commercial.winRate, 
      trend: "up" 
    },
    { 
      name: "Giá trị đơn hàng (AOV)", 
      value: (timeFrame === "month" ? stats.pillars.commercial.monthlyAov : stats.pillars.commercial.aov) >= 1e6 
        ? `${((timeFrame === "month" ? stats.pillars.commercial.monthlyAov : stats.pillars.commercial.aov) / 1e6).toFixed(0)} triệu` 
        : `${(timeFrame === "month" ? stats.pillars.commercial.monthlyAov : stats.pillars.commercial.aov).toLocaleString("vi-VN")} đ`, 
      sub: "Bình quân các đơn hàng", 
      progress: (timeFrame === "month" ? stats.pillars.commercial.monthlyAov : stats.pillars.commercial.aov) > 0 ? 80 : 0, 
      trend: "up" 
    },
    { 
      name: "Phát triển đại lý", 
      value: `${timeFrame === "month" ? stats.pillars.commercial.monthlyCustomersCount : stats.pillars.commercial.yearlyCustomersCount} đối tác`, 
      sub: "Đại lý / đối tác phát triển mới", 
      progress: (timeFrame === "month" ? stats.pillars.commercial.monthlyCustomersCount : stats.pillars.commercial.yearlyCustomersCount) > 0 ? 90 : 0, 
      trend: "neutral" 
    }
  ] : PILLARS_DATA[0].metrics;

  const financeMetrics: Metric[] = stats ? [
    { 
      name: "Dòng tiền thuần", 
      value: (timeFrame === "month" ? stats.pillars.finance.cashFlow : (stats.kpis.yearlyRevenue - stats.kpis.yearlyCost)) >= 0 
        ? `+${Math.abs((timeFrame === "month" ? stats.pillars.finance.cashFlow : (stats.kpis.yearlyRevenue - stats.kpis.yearlyCost)) / 1e6).toFixed(0)} triệu` 
        : `${((timeFrame === "month" ? stats.pillars.finance.cashFlow : (stats.kpis.yearlyRevenue - stats.kpis.yearlyCost)) / 1e6).toFixed(0)} triệu`, 
      sub: "Thu thực tế trừ chi thực tế", 
      progress: (timeFrame === "month" ? stats.pillars.finance.cashFlow : (stats.kpis.yearlyRevenue - stats.kpis.yearlyCost)) >= 0 ? 85 : 30, 
      trend: (timeFrame === "month" ? stats.pillars.finance.cashFlow : (stats.kpis.yearlyRevenue - stats.kpis.yearlyCost)) >= 0 ? "up" : "down" 
    },
    { 
      name: "Biên lợi nhuận gộp", 
      value: "--", 
      sub: "Định mức biên lợi nhuận gộp mục tiêu", 
      progress: 0, 
      trend: "neutral" 
    },
    { 
      name: "Nợ quá hạn", 
      value: stats.pillars.finance.overdueDebts >= 1e6 ? `${(stats.pillars.finance.overdueDebts / 1e6).toFixed(0)} triệu` : `${stats.pillars.finance.overdueDebts.toLocaleString("vi-VN")} đ`, 
      sub: "Tổng các khoản nợ đã quá hạn thanh toán", 
      progress: stats.pillars.finance.overdueDebts > 0 ? 40 : 100, 
      trend: stats.pillars.finance.overdueDebts > 0 ? "up" : "down" 
    },
    { 
      name: "Chỉ số sức khoẻ dòng tiền", 
      value: `${stats.cashFlowScore}/100`, 
      sub: stats.cashFlowScore >= 70 ? "Trạng thái dòng tiền tốt" : "Cần chú ý dòng tiền", 
      progress: stats.cashFlowScore, 
      trend: "neutral" 
    }
  ] : PILLARS_DATA[1].metrics;

  const hrMetrics: Metric[] = stats ? [
    { 
      name: "Doanh thu / Nhân sự", 
      value: (timeFrame === "month" ? stats.pillars.hr.revenuePerFTE : stats.pillars.hr.yearlyRevenuePerFTE) >= 1e6 
        ? `${((timeFrame === "month" ? stats.pillars.hr.revenuePerFTE : stats.pillars.hr.yearlyRevenuePerFTE) / 1e6).toFixed(0)} triệu` 
        : `${(timeFrame === "month" ? stats.pillars.hr.revenuePerFTE : stats.pillars.hr.yearlyRevenuePerFTE).toLocaleString("vi-VN")} đ`, 
      sub: "Năng suất bình quân mỗi nhân viên", 
      progress: (timeFrame === "month" ? stats.pillars.hr.revenuePerFTE : stats.pillars.hr.yearlyRevenuePerFTE) > 0 ? 75 : 0, 
      trend: "up" 
    },
    { 
      name: "Doanh số / Sales Rep", 
      value: (timeFrame === "month" ? stats.pillars.hr.salesPerRep : stats.pillars.hr.yearlySalesPerRep) >= 1e6 
        ? `${((timeFrame === "month" ? stats.pillars.hr.salesPerRep : stats.pillars.hr.yearlySalesPerRep) / 1e6).toFixed(0)} triệu` 
        : `${(timeFrame === "month" ? stats.pillars.hr.salesPerRep : stats.pillars.hr.yearlySalesPerRep).toLocaleString("vi-VN")} đ`, 
      sub: "Doanh số bình quân nhân viên Sales", 
      progress: (timeFrame === "month" ? stats.pillars.hr.salesPerRep : stats.pillars.hr.yearlySalesPerRep) > 0 ? 80 : 0, 
      trend: "up" 
    },
    { 
      name: "Biến động nhân sự chủ chốt", 
      value: `${timeFrame === "month" ? stats.pillars.hr.monthlyTurnoverRate : stats.pillars.hr.yearlyTurnoverRate}%`, 
      sub: "Tỷ lệ nhân sự chủ chốt nghỉ việc", 
      progress: timeFrame === "month" ? stats.pillars.hr.monthlyTurnoverRate : stats.pillars.hr.yearlyTurnoverRate, 
      trend: (timeFrame === "month" ? stats.pillars.hr.monthlyTurnoverRate : stats.pillars.hr.yearlyTurnoverRate) > 5 ? "up" : "down" 
    },
    { 
      name: "Hiệu suất nhân sự", 
      value: `${stats.pillars.hr.onTimeRate}%`, 
      sub: "Tỷ lệ chấm công đúng giờ", 
      progress: stats.pillars.hr.onTimeRate, 
      trend: stats.pillars.hr.onTimeRate >= 95 ? "up" : "down" 
    }
  ] : PILLARS_DATA[2].metrics;

  const operationsMetrics: Metric[] = stats ? [
    { name: "Tỷ lệ OTIF", value: "--", sub: "Giao lắp đúng hạn & đủ số lượng", progress: 0, trend: "neutral" },
    { name: "Vòng quay / Tuổi kho", value: "--", sub: "Hàng tồn kho trung bình < 90 ngày", progress: 0, trend: "neutral" },
    { name: "Tỷ lệ lỗi lắp ráp", value: "--", sub: "Lỗi cài đặt/cấu hình tại công trường", progress: 0, trend: "neutral" },
    { name: "Lead Time (LTTR)", value: "--", sub: "Thời gian trung bình xử lý sự cố", progress: 0, trend: "neutral" }
  ] : PILLARS_DATA[3].metrics;

  const getDynamicMetrics = (stepNum: number) => {
    if (stepNum === 1) return commercialMetrics;
    if (stepNum === 2) return financeMetrics;
    if (stepNum === 3) return hrMetrics;
    return operationsMetrics;
  };

  const activePillarBase = PILLARS_DATA[currentStep - 1];
  let dynamicStatus = activePillarBase.status;
  let dynamicStatusColor = activePillarBase.statusColor;
  let dynamicStatusBg = activePillarBase.statusBg;

  if (stats) {
    if (currentStep === 1) { // Kinh doanh
      const progressToUse = timeFrame === "month" ? stats.pillars.commercial.revenueProgress : stats.pillars.commercial.revenueYearlyProgress;
      if (progressToUse >= expectedProgress) {
        dynamicStatus = "Tăng trưởng tốt";
        dynamicStatusColor = "#10b981"; // green
        dynamicStatusBg = "rgba(16, 185, 129, 0.08)";
      } else {
        dynamicStatus = "Chậm tiến độ";
        dynamicStatusColor = "#ef4444"; // red
        dynamicStatusBg = "rgba(239, 68, 68, 0.08)";
      }
    } else if (currentStep === 2) { // Tài chính
      const cashFlowToUse = timeFrame === "month" ? stats.pillars.finance.cashFlow : (stats.kpis.yearlyRevenue - stats.kpis.yearlyCost);
      if (cashFlowToUse >= 0) {
        dynamicStatus = "Ổn định";
        dynamicStatusColor = "#10b981";
        dynamicStatusBg = "rgba(16, 185, 129, 0.08)";
      } else {
        dynamicStatus = "Thiếu hụt";
        dynamicStatusColor = "#ef4444";
        dynamicStatusBg = "rgba(239, 68, 68, 0.08)";
      }
    } else if (currentStep === 3) { // Nhân sự
      if (stats.pillars.hr.onTimeRate >= 90) {
        dynamicStatus = "Đạt hiệu quả";
        dynamicStatusColor = "#10b981";
        dynamicStatusBg = "rgba(16, 185, 129, 0.08)";
      } else {
        dynamicStatus = "Cần cải thiện";
        dynamicStatusColor = "#f59e0b"; // orange
        dynamicStatusBg = "rgba(245, 158, 11, 0.08)";
      }
    }
  }

  const activePillar = {
    ...activePillarBase,
    status: dynamicStatus,
    statusColor: dynamicStatusColor,
    statusBg: dynamicStatusBg,
    metrics: getDynamicMetrics(currentStep)
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <style>{`
        @keyframes stepFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .step-content-animated {
          animation: stepFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      <div>
        {/* Title */}
        <SectionTitle
          title="4 Trụ Cột Vận Hành Cốt Lõi"
          icon="bi-grid-fill"
          className="mb-4"
          action={
            <div className="d-flex" style={{ background: "var(--border)", padding: 3, borderRadius: 6 }}>
              <button
                className={`btn btn-sm ${timeFrame === "month" ? "btn-light fw-bold shadow-sm" : "text-muted border-0"}`}
                style={{ fontSize: 12, padding: "2px 12px", border: timeFrame === "month" ? "1px solid rgba(0,0,0,0.05)" : "none", borderRadius: 4 }}
                onClick={() => setTimeFrame("month")}
              >
                Tháng
              </button>
              <button
                className={`btn btn-sm ${timeFrame === "year" ? "btn-light fw-bold shadow-sm" : "text-muted border-0"}`}
                style={{ fontSize: 12, padding: "2px 12px", border: timeFrame === "year" ? "1px solid rgba(0,0,0,0.05)" : "none", borderRadius: 4 }}
                onClick={() => setTimeFrame("year")}
              >
                Năm
              </button>
            </div>
          }
        />

        {/* Horizontal Stepper UI */}
        <div className="d-flex align-items-center justify-content-between position-relative mb-4 px-2" style={{ zIndex: 1 }}>
          {/* Background Line */}
          <div style={{
            position: "absolute",
            top: "16px",
            left: "32px",
            right: "32px",
            height: "2px",
            background: "var(--border)",
            zIndex: -1
          }} />

          {steps.map((s) => {
            const isActive = currentStep === s.num;
            
            return (
              <div 
                key={s.num} 
                onClick={() => setCurrentStep(s.num)}
                style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", width: 66 }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: isActive ? s.color : "var(--card)",
                  border: `2px solid ${isActive ? s.color : "var(--border)"}`,
                  color: isActive ? "#fff" : "var(--muted-foreground)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  boxShadow: isActive ? `0 0 12px ${s.color}40` : "none",
                  transition: "all 0.3s ease"
                }}>
                  <i className={`bi ${s.icon}`} />
                </div>
                <span style={{ 
                  fontSize: 12, 
                  fontWeight: isActive ? 700 : 500, 
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)", 
                  marginTop: 6,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  transition: "all 0.3s ease"
                }}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Active Pillar Card with Animation */}
        <div
          key={currentStep}
          className="step-content-animated"
          style={{
            background: "transparent",
            padding: "8px 0 0",
          }}
        >
          {/* Pillar Header */}
          <div className="d-flex align-items-center justify-content-between mb-3 pb-2" style={{ borderBottom: "1px dashed var(--border)" }}>
            <div className="d-flex align-items-center gap-2">
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `rgba(${activePillar.color === '#8b5cf6' ? '139, 92, 246' : activePillar.color === '#3b82f6' ? '59, 130, 246' : activePillar.color === '#10b981' ? '16, 185, 129' : '245, 158, 11'}, 0.08)`,
                  color: activePillar.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                <i className={`bi ${activePillar.icon}`} />
              </div>
              <div>
                <h6 style={{ fontSize: 14.5, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>{activePillar.title}</h6>
                <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{activePillar.shortDesc}</span>
              </div>
            </div>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                color: activePillar.statusColor,
                background: activePillar.statusBg,
              }}
            >
              {activePillar.status}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="row g-2">
            {activePillar.metrics.map((metric, index) => (
              <div key={index} className="col-12 col-sm-6">
                <div
                  style={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  {/* Name + Trend */}
                  <div className="d-flex justify-content-between align-items-start mb-1 gap-1">
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", lineHeight: 1.2 }}>
                      {metric.name}
                    </span>
                    {metric.trend && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: metric.trend === "up" ? "#10b981" : metric.trend === "down" ? "#ef4444" : "var(--muted-foreground)",
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <i className={`bi ${metric.trend === "up" ? "bi-arrow-up-short" : metric.trend === "down" ? "bi-arrow-down-short" : "bi-dash-lg"}`} />
                        {metric.trendValue || ""}
                      </span>
                    )}
                  </div>

                  {/* Value */}
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: "2px 0" }}>
                    {metric.value}
                  </div>

                  {/* Subtitle */}
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.3, marginBottom: metric.progress !== undefined ? 6 : 0 }}>
                    {metric.sub}
                  </div>

                  {/* Progress Bar */}
                  {metric.progress !== undefined && (
                    <div style={{ marginTop: "auto", paddingTop: 4 }}>
                      <div style={{ height: 3.5, width: "100%", background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${metric.progress}%`,
                            background: activePillar.color,
                            borderRadius: 99,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Tab Switcher ─────────────────────────────────────────────────────
interface MobileTabSwitcherProps {
  activeTab: "left" | "right";
  onChange: (tab: "left" | "right") => void;
}

function MobileTabSwitcher({ activeTab, onChange }: MobileTabSwitcherProps) {
  return (
    <div 
      className="d-flex d-xl-none p-1 mb-3" 
      style={{ 
        background: "var(--card)", 
        borderRadius: 12, 
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
      }}
    >
      <button
        onClick={() => onChange("left")}
        style={{
          flex: 1,
          border: "none",
          background: activeTab === "left" ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent",
          color: activeTab === "left" ? "#fff" : "var(--muted-foreground)",
          borderRadius: 9,
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 600,
          transition: "all 0.2s",
          cursor: "pointer",
          boxShadow: activeTab === "left" ? "0 2px 8px rgba(139,92,246,0.25)" : "none"
        }}
      >
        <i className="bi bi-grid-fill me-1" />
        Chỉ số vận hành
      </button>
      <button
        onClick={() => onChange("right")}
        style={{
          flex: 1,
          border: "none",
          background: activeTab === "right" ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent",
          color: activeTab === "right" ? "#fff" : "var(--muted-foreground)",
          borderRadius: 9,
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 600,
          transition: "all 0.2s",
          cursor: "pointer",
          boxShadow: activeTab === "right" ? "0 2px 8px rgba(139,92,246,0.25)" : "none"
        }}
      >
        <i className="bi bi-graph-up me-1" />
        Báo cáo & Phân tích AI
      </button>
    </div>
  );
}

export default function BoardPage() {
  const [showDetail, setShowDetail] = useState(false);
  const [mobileTab, setMobileTab] = useState<"left" | "right">("left");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("loading");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiErrMsg, setAiErrMsg] = useState("");
  const [dbStats, setDbStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Helper to format money
  const formatMoney = (val: number) => {
    if (val === 0) return "0 đ";
    if (Math.abs(val) >= 1e9) {
      return (val / 1e9).toFixed(1) + " tỷ";
    }
    if (Math.abs(val) >= 1e6) {
      return (val / 1e6).toFixed(1) + " triệu";
    }
    return val.toLocaleString("vi-VN") + " đ";
  };

  const { warning } = useToast();

  useEffect(() => {
    setIsLoadingStats(true);
    fetch("/api/board/stats")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setDbStats(res);
          
          const alreadyNotified = sessionStorage.getItem("board_db_empty_notified");
          if (!res.hasRealData && !alreadyNotified) {
            sessionStorage.setItem("board_db_empty_notified", "true");
            warning(
              "Chú ý kết nối cơ sở dữ liệu",
              "Hệ thống đang kết nối dữ liệu thực tế từ cơ sở dữ liệu. Hiện chưa có phát sinh giao dịch/đơn hàng nào, số liệu hiển thị đang là 0.",
              8000
            );
          }
        }
        setIsLoadingStats(false);
      })
      .catch(() => {
        setIsLoadingStats(false);
      });
  }, [warning]);

  const dynamicAiPayload = useMemo(() => {
    if (!dbStats) return null;
    return {
      doanhThuNam: formatMoney(dbStats.kpis.yearlyRevenue),
      mucTieuNam: formatMoney((dbStats.pillars?.commercial?.revenueTarget || 0) * 12),
      doanhThuThang: formatMoney(dbStats.kpis.monthlyRevenue),
      tongChiPhi: formatMoney(dbStats.kpis.yearlyCost),
      loiNhuan: formatMoney(dbStats.kpis.yearlyProfit),
      cashFlowScore: dbStats.cashFlowScore,
      months: dbStats.chartSeries[0].data.map((rev: any, idx: number) => {
        if (idx + 1 > dbStats.kpis.costAccumulatedMonth) return null;
        return {
          month: `Tháng ${idx + 1}`,
          revenue: rev || 0,
          cost: dbStats.chartSeries[1].data[idx] || 0,
          cashFlow: dbStats.chartSeries[2].data[idx] || 0
        };
      }).filter(Boolean)
    };
  }, [dbStats]);

  const analyze = async () => {
    if (!dynamicAiPayload) return;
    setAiStatus("loading");
    setAiResult(null);
    try {
      const payload = dynamicAiPayload;

      const res = await fetch("/api/board/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setAiResult(json.data);
      setAiStatus("done");
      
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(`ai_analysis_${today}`, JSON.stringify(json.data));
    } catch (e) {
      setAiErrMsg(String(e));
      setAiStatus("error");
    }
  };

  useEffect(() => {
    if (!isLoadingStats) {
      const today = new Date().toISOString().split("T")[0];
      const cached = localStorage.getItem(`ai_analysis_${today}`);
      if (cached) {
        try {
          setAiResult(JSON.parse(cached));
          setAiStatus("done");
          return;
        } catch (e) {
          console.error("Cache parsing error", e);
        }
      }
      analyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingStats, dbStats]);

  const dynamicKpiCards = dbStats ? [
    {
      label: "Doanh thu năm",
      value: formatMoney(dbStats.kpis.yearlyRevenue),
      icon: "bi-bar-chart-line-fill",
      accent: "#8b5cf6",
      subtitle: dbStats.kpis.revenueTrend >= 0 ? `+${dbStats.kpis.revenueTrend}% so tháng trước` : `${dbStats.kpis.revenueTrend}% so tháng trước`,
    },
    {
      label: "Doanh thu tháng",
      value: formatMoney(dbStats.kpis.monthlyRevenue),
      icon: "bi-cash-coin",
      accent: "#3b82f6",
      subtitle: `Tháng ${dbStats.kpis.costAccumulatedMonth}/${new Date().getFullYear()}`,
    },
    {
      label: "Tổng chi phí năm",
      value: formatMoney(dbStats.kpis.yearlyCost),
      icon: "bi-arrow-up-circle-fill",
      accent: "#ef4444",
      subtitle: `Lũy kế đến tháng ${dbStats.kpis.costAccumulatedMonth}/${new Date().getFullYear()}`,
    },
    {
      label: "Lợi nhuận năm",
      value: formatMoney(dbStats.kpis.yearlyProfit),
      icon: "bi-graph-up-arrow",
      accent: "#10b981",
      subtitle: `Lũy kế đến tháng ${dbStats.kpis.costAccumulatedMonth}/${new Date().getFullYear()}`,
    },
  ] : KPI_CARDS;

  const currentCashFlowScore = dbStats ? dbStats.cashFlowScore : CASH_FLOW_SCORE;
  const currentChartSeries = dbStats ? dbStats.chartSeries : REVENUE_COST_SERIES;

  return (
    <>
    <AiDetailOffcanvas open={showDetail} onClose={() => setShowDetail(false)} payload={dynamicAiPayload} />
    <div className="w-100 h-100 d-flex flex-column">
      <SplitLayoutPage
        title="Ban Giám đốc"
        description="Board of Directors · Điều hành & chiến lược tổ chức"
        icon="bi-building"
        color="violet"
        mobileActiveTab={mobileTab}
        // ── Cột trái (5/12) ───────────────────────────────────────────────
        leftTopContent={
          <div>
            <MobileTabSwitcher activeTab={mobileTab} onChange={setMobileTab} />
            <div className="row g-3">
              {dynamicKpiCards.map((kpi) => (
                <KPICard
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  icon={kpi.icon}
                  accent={kpi.accent}
                  subtitle={kpi.subtitle}
                  colClass="col-6"
                />
              ))}
            </div>
          </div>
        }
        leftContent={<FourPillarsDashboard stats={dbStats} />}
        // ── Cột phải (7/12) ──────────────────────────────────────────────
        rightContent={
          <div className="p-4 flex-1 d-flex flex-column" style={{ overflowY: "auto", minHeight: 0 }}>
            <MobileTabSwitcher activeTab={mobileTab} onChange={setMobileTab} />
            <SectionTitle title="Diễn biến doanh thu và chi phí" className="mb-3" />
            <YearAreaChart series={currentChartSeries} height={240} showLegend unit="đ" exactTooltip={true} />
            <SectionTitle
              title="Trạng thái tài chính"
              className="mt-4 mb-3"
              action={
                <div className="d-flex align-items-center gap-2">
                  {(aiStatus === "done" || aiStatus === "error") && (
                    <button
                      onClick={analyze}
                      style={{
                        background: "none", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "3px 10px",
                        fontSize: 12.5, fontWeight: 600, color: "var(--muted-foreground)",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#8b5cf6"; e.currentTarget.style.borderColor = "#8b5cf6"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <i className="bi bi-arrow-clockwise" style={{ fontSize: 12 }} />
                      Phân tích lại
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetail(true)}
                    style={{
                      background: "none", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "3px 10px",
                      fontSize: 12.5, fontWeight: 600, color: "var(--muted-foreground)",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#8b5cf6"; e.currentTarget.style.borderColor = "#8b5cf6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <i className="bi bi-stars" style={{ fontSize: 12 }} />
                    Chi tiết
                  </button>
                </div>
              }
            />
            <CashFlowHealth score={currentCashFlowScore} />
            <AiAnalysis 
              status={aiStatus}
              result={aiResult}
              errMsg={aiErrMsg}
              analyze={analyze}
              setStatus={setAiStatus}
            />
          </div>
        }
      />
    </div>
    </>
  );
}
