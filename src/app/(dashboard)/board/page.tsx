"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";
import { SectionTitle } from "@/components/ui/SectionTitle";

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
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)" }}>
          Chỉ số sức khoẻ dòng tiền
        </span>
        <span
          style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
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
        <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>Nguy hiểm</span>
        <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>Cần chú ý</span>
        <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>Tốt</span>
      </div>
    </div>
  );
}

// ── AI Analysis payload (mock — sau nối API thật) ─────────────────────────
const AI_PAYLOAD = {
  doanhThuNam: "38.6 tỷ VNĐ",
  doanhThuThang: "4.2 tỷ VNĐ",
  tongChiPhi: "29.4 tỷ VNĐ",
  loiNhuan: "9.2 tỷ VNĐ",
  cashFlowScore: 68,
  months: [
    { month: "Tháng 1", revenue: 2.8, cost: 2.1, cashFlow: 0.5 },
    { month: "Tháng 2", revenue: 3.1, cost: 2.4, cashFlow: 0.6 },
    { month: "Tháng 3", revenue: 4.2, cost: 3.3, cashFlow: 0.7 },
  ],
};

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

function AiAnalysis() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("loading");
  const [result, setResult] = useState<AiResult | null>(null);
  const [errMsg, setErrMsg] = useState("");

  const analyze = async () => {
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch("/api/board/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(AI_PAYLOAD),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
      setStatus("done");
    } catch (e) {
      setErrMsg(String(e));
      setStatus("error");
    }
  };

  // Tự động phân tích khi trang load
  useEffect(() => { analyze(); }, []);

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
            color: "#fff", fontWeight: 600, fontSize: 13,
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
        <div className="d-flex align-items-center gap-2" style={{ padding: "12px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
          <div className="spinner-border spinner-border-sm" style={{ color: "#8b5cf6" }} role="status" />
          <span>Gemini đang phân tích dữ liệu tài chính...</span>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}><i className="bi bi-exclamation-circle me-1" />{errMsg}</p>
          <button onClick={() => setStatus("idle")} style={{ fontSize: 11, color: "#8b5cf6", background: "none", border: "none", padding: 0, marginTop: 4, cursor: "pointer" }}>Thử lại</button>
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
              <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                {result.summary}
              </p>
            </div>
          </div>



          {/* Recommendation */}
          <div style={{
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(139,92,246,0.07)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <i className="bi bi-lightbulb me-1" />Khuyến nghị
            </p>
            <p style={{ fontSize: 12.5, color: "var(--foreground)", margin: 0, lineHeight: 1.5 }}>
              {result.recommendation}
            </p>
          </div>

          {/* Phân tích lại */}
          <button
            onClick={() => setStatus("idle")}
            style={{ fontSize: 11, color: "var(--muted-foreground)", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
          >
            <i className="bi bi-arrow-clockwise me-1" />Phân tích lại
          </button>
        </div>
      )}
    </div>
  );
}

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
        <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: 13 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{section.danhGia}</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.6, margin: 0, paddingLeft: 20 }}>{section.nhanXet}</p>
    </div>
  );
}

function ListBlock({ title, icon, color, items }: { title: string; icon: string; color: string; items: string[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        <i className={`bi ${icon} me-1`} />{title}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.5 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AiDetailOffcanvas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [result, setResult] = useState<AiDetailResult | null>(null);
  const [errMsg, setErrMsg] = useState("");

  const fetchDetail = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/board/ai-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(AI_PAYLOAD),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
      setStatus("done");
    } catch (e) {
      setErrMsg(String(e));
      setStatus("error");
    }
  }, []);

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
        width: 420, zIndex: 1045,
        background: "var(--card)", borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between p-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-stars" style={{ fontSize: 16, color: "#8b5cf6" }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Đánh giá AI chi tiết</span>
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
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Gemini đang phân tích toàn diện...</span>
            </div>
          )}

          {status === "error" && (
            <div>
              <p style={{ color: "#ef4444", fontSize: 13 }}>{errMsg}</p>
              <button onClick={fetchDetail} className="btn btn-sm" style={{ background: "#8b5cf6", color: "#fff" }}>Thử lại</button>
            </div>
          )}

          {status === "done" && result && (
            <div>
              {/* Tổng quan */}
              <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 10, background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <i className="bi bi-file-earmark-text me-1" />Tổng quan
                </p>
                <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>{result.tongQuan}</p>
              </div>

              {/* 4 mảng phân tích */}
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Phân tích chi tiết</p>
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
              <button onClick={fetchDetail} style={{ fontSize: 11, color: "var(--muted-foreground)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <i className="bi bi-arrow-clockwise me-1" />Phân tích lại
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function BoardPage() {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
    <AiDetailOffcanvas open={showDetail} onClose={() => setShowDetail(false)} />
    <SplitLayoutPage
      title="Ban Giám đốc"
      description="Board of Directors · Điều hành & chiến lược tổ chức"
      icon="bi-building"
      color="violet"
      // ── Cột trái (5/12) ───────────────────────────────────────────────
      leftTopContent={
        <div className="row g-3">
          {KPI_CARDS.map((kpi) => (
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
      }
      leftContent={<div />}
      // ── Cột phải (7/12) ──────────────────────────────────────────────
      rightContent={
        <div>
          <SectionTitle title="Diễn biến doanh thu và chi phí" className="mb-3" />
          <YearAreaChart series={REVENUE_COST_SERIES} height={280} showLegend />
          <SectionTitle
            title="Trạng thái tài chính"
            className="mt-4 mb-3"
            action={
              <button
                onClick={() => setShowDetail(true)}
                style={{
                  background: "none", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "3px 10px",
                  fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#8b5cf6"; e.currentTarget.style.borderColor = "#8b5cf6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <i className="bi bi-stars" style={{ fontSize: 12 }} />
                Chi tiết
              </button>
            }
          />
          <CashFlowHealth score={CASH_FLOW_SCORE} />
          <AiAnalysis />
        </div>
      }
    />
    </>
  );
}
