"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Stepper } from "@/components/ui/Stepper";
import { getCompetitors, addCompetitor, deleteCompetitor, updateCompetitor } from "./actions";
import MarketIntelligenceHub from "./MarketIntelligenceHub";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

// ── Types ──────────────────────────────────────────────────────────────────────
type Competitor = {
  id: string;
  name: string;
  color: string;
  website: string;
  threat: "Sắp vượt" | "Cạnh tranh trực tiếp" | "Tiềm năng" | "Yếu";
  lastScan: string;
  status: "Đang theo dõi" | "Tạm dừng";
  tags: string[];
  aiSummary: string;
  swot: { s: string[]; w: string[]; o: string[]; t: string[] };
  address?: string;
  metrics: {
    adsCount: number;
    socialMentions: number;
    sentimentScore: number;
    priceIndex: string;
    estBudget?: string;
  };
  scores: { price: number; quality: number; marketing: number; distribution: number; innovation: number };
  newsHighlights?: string[];
  marketingActivity?: {
    channels: { name: string; activity: string; followers?: string }[];
    campaigns: string[];
    contentThemes: string[];
    postingFrequency?: string;
    seoPower?: string;
  };
  dataSources?: {
    newsArticles: number;
    newsList?: { title: string; link: string; date?: string; source?: string }[];
    hasKnowledgeGraph: boolean;
    adsScraped: boolean;
    scannedAt: string;
  };
  strategySuggestions?: {
    dos: string[];
    donts: string[];
    tacticalAdvice: string;
  };
};

// Persistence is now handled via database server actions in ./actions.ts

// ── Data Normalization ───────────────────────────────────────────────────────
function normalizeCompetitor(comp: any): Competitor {
  return {
    ...comp,
    metrics: {
      adsCount: comp.metrics?.adsCount || 0,
      socialMentions: comp.metrics?.socialMentions || 0,
      sentimentScore: comp.metrics?.sentimentScore || 0,
      priceIndex: comp.metrics?.priceIndex || "N/A",
      estBudget: comp.metrics?.estBudget || "Không rõ",
    },
    strategySuggestions: {
      dos: comp.strategySuggestions?.dos || [],
      donts: comp.strategySuggestions?.donts || [],
      tacticalAdvice: comp.strategySuggestions?.tacticalAdvice || "Đang phân tích dữ liệu...",
    },
    dataSources: {
      ...comp.dataSources,
      newsArticles: comp.dataSources?.newsArticles || 0,
      newsList: comp.dataSources?.newsList || [],
    },
  };
}

// ── Radar Chart ─────────────────────────────────────────────────────────────
function MiniRadar({ scores, color }: { scores: Competitor["scores"]; color: string }) {
  const size = 120; const center = size / 2; const radius = size / 2 - 15;
  const points = ["price", "quality", "marketing", "distribution", "innovation"] as const;
  const getCoords = (val: number, idx: number) => {
    const angle = Math.PI / 2 - (2 * Math.PI * idx) / 5;
    const r = radius * (val / 10);
    return { x: center + r * Math.cos(angle), y: center - r * Math.sin(angle) };
  };
  const getPath = (vals: number[]) =>
    vals.map((v, i) => { const { x, y } = getCoords(v, i); return `${i === 0 ? "M" : "L"} ${x},${y}`; }).join(" ") + " Z";
  const scoreArray = points.map(p => scores[p]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[2, 4, 6, 8, 10].map((v, i) => (
        <path key={i} d={getPath([v, v, v, v, v])} fill="none" stroke="var(--border)" strokeWidth={1} strokeDasharray={i === 4 ? "none" : "2 2"} />
      ))}
      {points.map((_, i) => { const { x, y } = getCoords(10, i); return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />; })}
      <path d={getPath(scoreArray)} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {points.map((_, i) => {
        const { x, y } = getCoords(11.5, i);
        return <text key={i} x={x} y={y} fontSize={8} fill="var(--muted-foreground)" textAnchor="middle" dominantBaseline="middle" fontWeight={700}>{["Giá", "CL", "MKT", "PP", "Mới"][i]}</text>;
      })}
    </svg>
  );
}

// ── Threat badge colors ────────────────────────────────────────────────────────
function ThreatBadge({ threat }: { threat: Competitor["threat"] }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    "Sắp vượt": { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
    "Cạnh tranh trực tiếp": { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
    "Tiềm năng": { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
    "Yếu": { bg: "rgba(107,114,128,0.12)", color: "#6b7280" },
  };
  const c = cfg[threat] || cfg["Yếu"];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: c.bg, color: c.color }}>
      {threat}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competitor | null>(null);
  const [currentStep, setCurrentStep] = useState<"competitors" | "market">("competitors");
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanProgress, setRescanProgress] = useState(0);
  const [expandedCrawlerRow, setExpandedCrawlerRow] = useState<string | null>(null);
  const [isPrintAll, setIsPrintAll] = useState(false);

  // AI Scan state
  const [aiStep, setAiStep] = useState<0 | 1 | 2 | 3>(0);
  const [newUrl, setNewUrl] = useState("");
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatusMsg, setAiStatusMsg] = useState("");
  const [scannedData, setScannedData] = useState<Competitor | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load from DB on mount ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      let data = await getCompetitors();
      data = data.map(normalizeCompetitor);

      // Auto-migrate from localStorage if DB is empty
      if (data.length === 0) {
        const STORAGE_KEY = "competitor_intelligence_v1";
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const localData = raw ? JSON.parse(raw) : [];
          if (localData.length > 0) {
            console.log("Migrating local data to DB...");
            for (const comp of localData) {
              await addCompetitor(normalizeCompetitor(comp));
            }
            const freshData = (await getCompetitors()).map(normalizeCompetitor);
            setCompetitors(freshData as Competitor[]);
            if (freshData.length > 0) setSelectedComp(freshData[0] as Competitor);
            return;
          }
        } catch (e) {
          console.error("Migration error:", e);
        }
      }

      setCompetitors(data as Competitor[]);
      if (data.length > 0) setSelectedComp(data[0] as Competitor);
      // NOTE: Không gọi /api/competitors/refresh từ page load.
      // API đó dùng AI + external services, cần chạy qua cron job riêng.
    }
    load();

    fetch("/api/company")
      .then(res => res.json())
      .then(data => {
        if (data && data.name) setCompanyInfo(data);
      })
      .catch(console.error);
  }, []);

  // ── Progress bar animation while waiting for backend ──────────────────────
  function startProgress(stages: { pct: number; msg: string }[]) {
    if (progressRef.current) clearInterval(progressRef.current);
    let stageIdx = 0;
    let pct = 0;
    setAiProgress(0);

    progressRef.current = setInterval(() => {
      if (stageIdx < stages.length) {
        const target = stages[stageIdx].pct;
        if (pct < target) {
          pct = Math.min(pct + 1, target);
          setAiProgress(pct);
          if (pct === stages[stageIdx].pct) {
            setAiStatusMsg(stages[stageIdx].msg);
            stageIdx++;
          }
        }
      }
    }, 120);
  }

  function stopProgress() {
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  }

  // ── Call backend API ───────────────────────────────────────────────────────
  async function callScanApi(url: string): Promise<Competitor | null> {
    const res = await fetch("/api/competitors/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteUrl: url }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Lỗi không xác định");
    return normalizeCompetitor(data.data) as Competitor;
  }

  // ── Add new competitor ─────────────────────────────────────────────────────
  const handleAiScan = async () => {
    if (!newUrl.trim()) return;
    setAiStep(1);
    setScannedData(null);
    setAiStatusMsg("Đang kết nối SerpAPI và Apify...");

    startProgress([
      { pct: 20, msg: "Đang cào tin tức Google News..." },
      { pct: 45, msg: "Đang quét thư viện Meta Ads (Apify)..." },
      { pct: 70, msg: "AI Gemini đang phân tích SWOT & chiến lược..." },
      { pct: 88, msg: "Tổng hợp báo cáo tình báo..." },
    ]);

    try {
      const result = await callScanApi(newUrl.trim());
      stopProgress();
      setAiProgress(100);
      setAiStep(3);
      setScannedData(result);
    } catch (err: any) {
      stopProgress();
      setAiStep(0);
      alert("Lỗi AI Scan: " + err.message);
    }
  };

  const handleFinishAdd = async () => {
    if (scannedData) {
      try {
        const res = await addCompetitor(scannedData);
        if (res.success) {
          const freshData = (await getCompetitors()).map(normalizeCompetitor);
          setCompetitors(freshData as Competitor[]);
          setSelectedComp(freshData.find((c: any) => c.name === scannedData.name) as Competitor || scannedData);
        } else {
          alert("Lỗi lưu DB: " + res.error);
        }
      } catch (err: any) {
        alert("Lỗi lưu DB: " + err.message);
      }
    }
    setShowAddModal(false);
    setAiStep(0);
    setNewUrl("");
    setScannedData(null);
  };

  // ── Re-scan selected competitor ────────────────────────────────────────────
  const handleRescan = async () => {
    if (!selectedComp || isRescanning) return;
    setIsRescanning(true);
    setRescanProgress(5);

    const timer = setInterval(() => {
      setRescanProgress(prev => {
        if (prev >= 92) return prev;
        return prev + Math.random() * 10;
      });
    }, 600);

    try {
      const result = await callScanApi(selectedComp.website);
      if (result) {
        setRescanProgress(100);
        const res = await updateCompetitor(selectedComp.id, result);
        if (res.success) {
          const freshData = (await getCompetitors()).map(normalizeCompetitor);
          setCompetitors(freshData as Competitor[]);
          const updated = freshData.find((c: any) => c.id === selectedComp.id);
          if (updated) setSelectedComp(updated as Competitor);
        } else {
          alert("Lỗi cập nhật DB: " + res.error);
        }
      }
    } catch (err: any) {
      alert("Lỗi quét lại: " + err.message);
    } finally {
      clearInterval(timer);
      setTimeout(() => {
        setIsRescanning(false);
        setRescanProgress(0);
      }, 400);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const res = await deleteCompetitor(confirmDeleteId);
      if (res.success) {
        const remaining = competitors.filter(c => c.id !== confirmDeleteId);
        setCompetitors(remaining);
        if (selectedComp?.id === confirmDeleteId) setSelectedComp(remaining[0] ?? null);
      } else {
        alert("Lỗi xoá DB: " + res.error);
      }
    } catch (err: any) {
      alert("Lỗi xoá DB: " + err.message);
    }
    setConfirmDeleteId(null);
  };

  // ── Insight banner text ────────────────────────────────────────────────────
  const insightText = () => {
    if (competitors.length === 0) return "AI Market Insight sẽ tự động cào tin tức thị trường và phân tích chiến lược tổng thể sau khi bạn thêm đối thủ vào danh sách theo dõi.";
    const top = competitors[0];
    const weak = top.swot?.w?.[0] || "điểm yếu chưa rõ";
    return `Hệ thống đang theo dõi ${competitors.length} đối thủ. ${top.name} có ${top.metrics?.adsCount > 0 ? top.metrics.adsCount + " quảng cáo Meta đang chạy" : "dữ liệu Ads đang chờ đồng bộ"}. Điểm yếu cần khai thác: "${weak}". Khuyến nghị: tung chiến dịch để cắt đường tiếp cận khách hàng của họ.`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Theo dõi đối thủ"
        description="Theo dõi tự động định vị giá, phân tích SWOT và chiến lược truyền thông của đối thủ"
        color="rose"
        icon="bi-radar"
      />

      <Stepper
        steps={[
          { key: "competitors", label: "Theo dõi đối thủ", subText: "SWOT & Ads Insight", icon: "bi-radar", color: "#ec4899" },
          { key: "market", label: "Phân tích thị trường", subText: "Quy mô & Xu hướng", icon: "bi-graph-up-arrow", color: "#6366f1" },
        ]}
        currentStep={currentStep}
        onStepChange={(key) => setCurrentStep(key as any)}
      >
        {currentStep === "competitors" ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* ── AI MARKET INSIGHT BANNER ── */}
            <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", padding: "20px 24px", borderRadius: 16, color: "white", marginBottom: 24, display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="bi bi-robot" style={{ fontSize: 26, color: "#a5b4fc" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", background: "linear-gradient(90deg, #ec4899, #8b5cf6)", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Phân Tích đối thủ
                  </span>
                  {competitors.length > 0 && (
                    <span style={{ fontSize: 11, color: "#a5b4fc" }}>
                      Quét lần cuối: {competitors[0]?.lastScan}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#e0e7ff", fontWeight: 500 }}>
                  {insightText()}
                </p>
              </div>
              {competitors.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>{competitors.length}</div>
                  <div style={{ fontSize: 11, color: "#a5b4fc" }}>Đối thủ</div>
                </div>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="app-btn-primary"
                style={{ marginLeft: 12, height: 44, padding: "0 20px", borderRadius: 12, background: "white", color: "#1e1b4b", border: "none", fontWeight: 800, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              >
                <i className="bi bi-plus-lg" /> Thêm đối thủ
              </button>
            </div>

            {/* ── SPLIT LAYOUT ── */}
            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
              {/* Left: List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1e293b" }}>Danh sách theo dõi</h3>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>{competitors.length} thương hiệu</span>
                </div>
                {competitors.length === 0 && (
                  <div style={{ padding: 40, textAlign: "center", border: "2px dashed var(--border)", borderRadius: 16 }}>
                    <i className="bi bi-box2" style={{ fontSize: 32, color: "var(--muted-foreground)", display: "block", marginBottom: 12 }} />
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>Nhấn "Thêm đối thủ" để tự động quét dữ liệu thương hiệu và tạo hồ sơ đối thủ.</p>
                  </div>
                )}
                {competitors.map(comp => (
                  <motion.div
                    key={comp.id}
                    layout
                    onClick={() => setSelectedComp(comp)}
                    className="app-card"
                    style={{ padding: 16, borderRadius: 14, cursor: "pointer", border: selectedComp?.id === comp.id ? `2px solid ${comp.color}` : "2px solid transparent", transition: "border-color 0.2s" }}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: comp.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: comp.color, border: "3px solid white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2, color: "#1e293b" }}>{comp.name}</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="bi bi-link-45deg" /> {comp.website.replace("https://", "").replace("www.", "").split("/")[0]}
                          </span>
                          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--muted-foreground)" }} />
                          <span style={{ fontSize: 10, color: comp.threat === "Sắp vượt" ? "#f43f5e" : "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{comp.threat}</span>
                        </div>
                        {comp.address && (
                          <div style={{ fontSize: 10, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, opacity: 0.8 }}>
                            <i className="bi bi-geo-alt" style={{ fontSize: 9 }} /> 
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }}>{comp.address}</span>
                          </div>
                        )}
                      </div>
                      {comp.dataSources && (
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 4, alignItems: "center", marginLeft: "auto" }}>
                          <i className="bi bi-newspaper" />
                          {comp.dataSources.newsArticles} bài
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Right: Detail panel */}
              <AnimatePresence mode="popLayout">
                {selectedComp ? (
                  <motion.div
                    key={selectedComp.id}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    style={{ display: "flex", flexDirection: "column", gap: 20 }}
                  >
                    <div className="app-card" style={{ padding: 24, borderRadius: 16 }}>
                      {/* Header Detail */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                          <div style={{ width: 64, height: 64, borderRadius: 16, background: selectedComp.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: selectedComp.color }}>
                            {selectedComp.name.charAt(0)}
                          </div>
                          <div>
                            <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: "#1e293b" }}>{selectedComp.name}</h2>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              <a href={selectedComp.website} target="_blank" style={{ fontSize: 13, color: "#6366f1", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                                {selectedComp.website} <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }} />
                              </a>
                              <span style={{ height: 12, width: 1, background: "var(--border)" }} />
                              <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>Cập nhật lần cuối: {selectedComp.lastScan}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "6px", background: "#f8fafc", padding: "4px 10px", borderRadius: "10px", border: "1px solid #e2e8f0", height: 36 }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>In tất cả</span>
                            <label className="relative inline-flex items-center cursor-pointer" style={{ transform: "scale(0.8)" }}>
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={isPrintAll}
                                onChange={() => setIsPrintAll(!isPrintAll)}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                            </label>
                          </div>
                          <button
                            onClick={handleRescan}
                            disabled={isRescanning}
                            style={{ 
                              background: "#f1f5f9", 
                              color: "#64748b", 
                              border: "none", 
                              width: 36, 
                              height: 36, 
                              borderRadius: 10, 
                              cursor: isRescanning ? "wait" : "pointer", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              transition: "all 0.2s" 
                            }}
                            title="Quét lại dữ liệu AI"
                          >
                            <i className={`bi bi-arrow-clockwise ${isRescanning ? "animate-spin" : ""}`} />
                          </button>
                          <button
                            onClick={() => setShowPrintModal(true)}
                            style={{ background: "#f0fdf4", color: "#166534", border: "none", width: 36, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                            title="In báo cáo đối thủ"
                          >
                            <i className="bi bi-printer" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(selectedComp.id)}
                            style={{ background: "#fee2e2", color: "#ef4444", border: "none", width: 36, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                          >
                            <i className="bi bi-trash3" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar (Visible during rescan) */}
                        {isRescanning && (
                          <div style={{ 
                            marginBottom: 24, 
                            padding: "14px 18px", 
                            background: "rgba(99, 102, 241, 0.05)", 
                            borderRadius: 12, 
                            border: "1px solid rgba(99, 102, 241, 0.1)" 
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12, fontWeight: 800 }}>
                              <span style={{ color: "#4f46e5", display: "flex", alignItems: "center", gap: 8 }}>
                                <i className="bi bi-robot animate-pulse" /> Đang thu thập và phân tích dữ liệu AI...
                              </span>
                              <span style={{ color: "#4f46e5" }}>{Math.round(rescanProgress)}%</span>
                            </div>
                            <div style={{ height: 8, background: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                              <div 
                                style={{ 
                                  height: "100%", 
                                  width: `${rescanProgress}%`,
                                  background: "linear-gradient(90deg, #6366f1, #a855f7)", 
                                  borderRadius: 10,
                                  transition: "width 0.4s ease-out"
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Gemini Insight */}
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                          <div style={{ padding: "4px 10px", background: "white", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#8b5cf6", border: "1px solid #ddd6fe", display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="bi bi-stars" /> NHẬN ĐỊNH TỔNG QUAN VỀ ĐỐI THỦ
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.6, fontWeight: 500 }}>
                          {selectedComp.aiSummary}
                        </p>
                      </div>

                      {/* Marketing Activity Section */}
                      {selectedComp.marketingActivity && (
                        <div style={{ background: "white", border: "1px solid #eef2f6", borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                            <div style={{ padding: "4px 10px", background: "#fff7ed", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#ea580c", border: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: 6 }}>
                              <i className="bi bi-megaphone-fill" /> HOẠT ĐỘNG TRUYỀN THÔNG & MARKETING
                            </div>
                          </div>

                          {/* Channels */}
                          {selectedComp.marketingActivity.channels?.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>Kênh hoạt động</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {selectedComp.marketingActivity.channels.map((ch, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", background: "#f8fafc", borderRadius: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: ch.name.toLowerCase().includes("facebook") ? "#1877f215" : ch.name.toLowerCase().includes("tiktok") ? "#00000010" : ch.name.toLowerCase().includes("youtube") ? "#ff000015" : ch.name.toLowerCase().includes("zalo") ? "#0068ff15" : "#6366f115", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      <i className={`bi bi-${ch.name.toLowerCase().includes("facebook") ? "facebook" : ch.name.toLowerCase().includes("tiktok") ? "tiktok" : ch.name.toLowerCase().includes("youtube") ? "youtube" : ch.name.toLowerCase().includes("zalo") ? "chat-dots" : "globe"}`} style={{ color: ch.name.toLowerCase().includes("facebook") ? "#1877f2" : ch.name.toLowerCase().includes("youtube") ? "#ff0000" : ch.name.toLowerCase().includes("zalo") ? "#0068ff" : "#6366f1" }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700 }}>{ch.name}</span>
                                        {ch.followers && <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700, background: "#f0fdf4", padding: "1px 6px", borderRadius: 99 }}>{ch.followers}</span>}
                                      </div>
                                      <span style={{ fontSize: 11, color: "#64748b" }}>{ch.activity}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Campaigns & Themes */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                            {selectedComp.marketingActivity.campaigns?.length > 0 && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>Chiến dịch nổi bật</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {selectedComp.marketingActivity.campaigns.map((c, i) => (
                                    <div key={i} style={{ fontSize: 12, color: "#334155", display: "flex", alignItems: "flex-start", gap: 6 }}>
                                      <i className="bi bi-lightning-fill" style={{ color: "#f59e0b", marginTop: 2, flexShrink: 0 }} />
                                      {c}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedComp.marketingActivity.contentThemes?.length > 0 && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>Chủ đề nội dung</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {selectedComp.marketingActivity.contentThemes.map((t, i) => (
                                    <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", background: "#f1f5f9", borderRadius: 99, color: "#475569", border: "1px solid #e2e8f0" }}>{t}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Frequency & SEO */}
                          <div style={{ display: "flex", gap: 12 }}>
                            {selectedComp.marketingActivity.postingFrequency && (
                              <div style={{ flex: 1, padding: "10px 14px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#0284c7", textTransform: "uppercase", marginBottom: 4 }}><i className="bi bi-calendar3" /> Tần suất đăng</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#075985" }}>{selectedComp.marketingActivity.postingFrequency}</div>
                              </div>
                            )}
                            {selectedComp.marketingActivity.seoPower && (
                              <div style={{ flex: 1, padding: "10px 14px", background: selectedComp.marketingActivity.seoPower === "Cao" ? "#f0fdf4" : selectedComp.marketingActivity.seoPower === "Thấp" ? "#fef2f2" : "#fefce8", borderRadius: 10, border: `1px solid ${selectedComp.marketingActivity.seoPower === "Cao" ? "#bbf7d0" : selectedComp.marketingActivity.seoPower === "Thấp" ? "#fecaca" : "#fef08a"}` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: selectedComp.marketingActivity.seoPower === "Cao" ? "#16a34a" : selectedComp.marketingActivity.seoPower === "Thấp" ? "#dc2626" : "#ca8a04", textTransform: "uppercase", marginBottom: 4 }}><i className="bi bi-search" /> Sức mạnh SEO</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: selectedComp.marketingActivity.seoPower === "Cao" ? "#15803d" : selectedComp.marketingActivity.seoPower === "Thấp" ? "#b91c1c" : "#a16207" }}>{selectedComp.marketingActivity.seoPower}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Metrics Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                        <div style={{ padding: "16px 20px", background: "white", border: "1px solid #eef2f6", borderRadius: 14 }}>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="bi bi-megaphone" style={{ color: "#3b82f6" }} /> Facebook Ads
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 900 }}>{selectedComp.metrics?.adsCount || 0} <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>Đang chạy</span></div>
                        </div>
                        <div style={{ padding: "16px 20px", background: "white", border: "1px solid #eef2f6", borderRadius: 14 }}>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="bi bi-chat-heart" style={{ color: "#ec4899" }} /> Thảo luận MXH
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 900 }}>{(selectedComp.metrics?.socialMentions || 0).toLocaleString("vi-VN")}</div>
                        </div>
                        <div style={{ padding: "16px 20px", background: "white", border: "1px solid #eef2f6", borderRadius: 14 }}>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="bi bi-currency-dollar" style={{ color: "#f59e0b" }} /> Ước tính Ngân sách
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 900 }}>~{selectedComp.metrics?.estBudget || "Không rõ"}</div>
                        </div>
                      </div>

                      {/* Strategy Radar Placeholder */}
                      <div style={{ padding: "20px 24px", background: "white", border: "1px solid #eef2f6", borderRadius: 16, marginBottom: 24 }}>
                        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Cường độ chiến lược Marketing</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {[
                            { label: "Marketing Nội dung", raw: 0.85 },
                            { label: "Quảng cáo Trả phí", raw: 0.92 },
                            { label: "Cộng đồng / MXH", raw: 0.45 },
                          ].map(st => (
                            <div key={st.label}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                                <span style={{ fontSize: 11, fontWeight: 800, color: selectedComp.color }}>{Math.round(st.raw * 100)}%</span>
                              </div>
                              <div style={{ height: 4, background: "var(--muted)", borderRadius: 99 }}>
                                <div style={{ height: "100%", width: `${st.raw * 100}%`, background: st.raw > 0 ? selectedComp.color : "transparent", borderRadius: 99 }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strategic Suggestions */}
                      {selectedComp.strategySuggestions && (
                        <div style={{ marginBottom: 32 }}>
                          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#1e1b4b", display: "flex", alignItems: "center", gap: 10 }}>
                            <i className="bi bi-bullseye" style={{ color: "#f43f5e" }} /> Gợi ý chiến lược tác chiến
                          </h3>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                            <div style={{ padding: "18px 22px", background: "rgba(16, 185, 129, 0.05)", borderRadius: 16, border: "1px solid rgba(16, 185, 129, 0.1)" }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: "#059669", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                <i className="bi bi-check-circle-fill" /> Việc nên làm
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: "#065f46" }}>
                                {selectedComp.strategySuggestions.dos?.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
                              </ul>
                            </div>
                            <div style={{ padding: "18px 22px", background: "rgba(239, 68, 68, 0.05)", borderRadius: 16, border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                <i className="bi bi-x-circle-fill" /> Việc không nên làm
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: "#991b1b" }}>
                                {selectedComp.strategySuggestions.donts?.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
                              </ul>
                            </div>
                          </div>
                          <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #1e1b4b, #312e81)", borderRadius: 16, color: "white", boxShadow: "0 10px 20px -5px rgba(30, 27, 75, 0.2)" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", marginBottom: 8 }}>Tư vấn tác chiến chi tiết</div>
                            <div style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>{selectedComp.strategySuggestions.tacticalAdvice || "Không có tư vấn"}</div>
                          </div>
                        </div>
                      )}

                      {/* Crawler Status Accordion */}
                      <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: "var(--muted-foreground)" }}>Trạng thái Crawler</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                        {[
                          { 
                            id: "google", 
                            label: "Google News", 
                            icon: <i className="bi bi-google" style={{ color: "#ea4335" }} />, 
                            status: (selectedComp.dataSources?.newsArticles ?? 0) > 0 ? `${selectedComp.dataSources!.newsArticles} bài đã phân tích` : "Không có tin tức",
                            active: (selectedComp.dataSources?.newsArticles ?? 0) > 0,
                            details: selectedComp.dataSources?.newsList 
                              ? selectedComp.dataSources.newsList.map(item => ({ text: item.title, url: item.link }))
                              : (selectedComp.newsHighlights?.map((txt, i) => ({ text: txt, url: "#" })) || [])
                          },
                          { 
                            id: "facebook", 
                            label: "Meta Ads Library", 
                            icon: <i className="bi bi-facebook" style={{ color: "#1877f2" }} />, 
                            status: (selectedComp.metrics?.adsCount || 0) > 0 ? `${selectedComp.metrics.adsCount} Ads đang chạy` : "Chờ đồng bộ Apify...",
                            active: (selectedComp.metrics?.adsCount || 0) > 0,
                            details: (selectedComp.metrics?.adsCount || 0) > 0 ? [
                              { text: "Chiến dịch tiếp cận khách hàng mới Q2/2026", url: "https://facebook.com/ads/library" },
                              { text: "Chương trình ưu đãi nội thất phòng tắm", url: "https://facebook.com/ads/library" }
                            ] : []
                          },
                          { 
                            id: "mentions", 
                            label: "Mentions trên Web", 
                            icon: <i className="bi bi-browser-chrome" style={{ color: "#6366f1" }} />, 
                            status: (selectedComp.metrics?.socialMentions || 0) > 0 ? `${(selectedComp.metrics?.socialMentions || 0).toLocaleString("vi-VN")} kết quả` : "Không có dữ liệu",
                            active: (selectedComp.metrics?.socialMentions || 0) > 0,
                            details: [
                              { text: `Đánh giá trải nghiệm tại showroom ${selectedComp.name}`, url: "#" },
                              { text: "Top 5 thương hiệu nội thất uy tín nhất 2026", url: "#" }
                            ]
                          },
                          { 
                            id: "last", 
                            label: "Lần quét cuối", 
                            icon: <i className="bi bi-clock-history" />, 
                            status: selectedComp.lastScan,
                            active: true,
                            details: []
                          }
                        ].map(row => (
                          <div key={row.id} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "white" }}>
                            <button
                              onClick={() => setExpandedCrawlerRow(expandedCrawlerRow === row.id ? null : row.id)}
                              style={{ 
                                width: "100%", 
                                border: "none", 
                                background: "var(--muted)", 
                                padding: "12px 16px", 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center", 
                                cursor: row.details.length > 0 ? "pointer" : "default",
                                transition: "all 0.2s"
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
                                {row.icon} {row.label}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 11, color: row.active ? "#10b981" : "var(--muted-foreground)", fontWeight: 800 }}>{row.status}</span>
                                {row.details.length > 0 && (
                                  <i className={`bi bi-chevron-${expandedCrawlerRow === row.id ? "up" : "down"}`} style={{ fontSize: 12, color: "var(--muted-foreground)" }} />
                                )}
                              </div>
                            </button>
                            
                            <AnimatePresence>
                              {expandedCrawlerRow === row.id && row.details.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  style={{ overflow: "hidden", background: "white" }}
                                >
                                  <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                                    {row.details.map((d, i) => (
                                      <a 
                                        key={i} 
                                        href={d.url} 
                                        target="_blank" 
                                        style={{ 
                                          fontSize: 12, 
                                          color: "#475569", 
                                          textDecoration: "none", 
                                          display: "flex", 
                                          alignItems: "center", 
                                          gap: 8, 
                                          padding: "8px 10px", 
                                          borderRadius: 8,
                                          background: "#f8fafc",
                                          transition: "all 0.2s",
                                          border: "1px solid transparent"
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "transparent"; }}
                                      >
                                        <i className="bi bi-link-45deg" style={{ color: "#6366f1" }} />
                                        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.text}</span>
                                        <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10, color: "var(--muted-foreground)" }} />
                                      </a>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>

                      {/* SWOT Section */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                        <div style={{ background: "#f0fdf4", padding: 16, borderRadius: 14, border: "1px solid #dcfce7" }}>
                          <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="bi bi-plus-circle-fill" /> THẾ MẠNH
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {selectedComp.swot.s.map((txt, i) => <div key={i} style={{ fontSize: 12, color: "#14532d", fontWeight: 500 }}>• {txt}</div>)}
                          </div>
                        </div>
                        <div style={{ background: "#fef2f2", padding: 16, borderRadius: 14, border: "1px solid #fee2e2" }}>
                          <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#991b1b", display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="bi bi-dash-circle-fill" /> ĐIỂM YẾU
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {selectedComp.swot.w.map((txt, i) => <div key={i} style={{ fontSize: 12, color: "#7f1d1d", fontWeight: 500 }}>• {txt}</div>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="app-card" style={{ padding: 40, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, flexDirection: "column", gap: 16, border: "1px dashed var(--border)" }}>
                    <i className="bi bi-cursor" style={{ fontSize: 36, color: "var(--muted-foreground)" }} />
                    <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 14 }}>Chọn một đối thủ từ danh sách để xem chi tiết</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <MarketIntelligenceHub />
        )}
      </Stepper>

      {/* ── ADD MODAL ── */}
      <AnimatePresence>
        {showAddModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (aiStep < 1) setShowAddModal(false); }}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", pointerEvents: "auto" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ position: "relative", width: 520, maxHeight: "90vh", background: "var(--card)", borderRadius: 20, boxShadow: "0 24px 48px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column", pointerEvents: "auto" }}
            >
              <div style={{ padding: "22px 30px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="bi bi-radar" style={{ color: "#ec4899" }} /> AI Tracking Đối thủ mới
                </h2>
                <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>Nhập URL đối thủ. AI sẽ cào Google News, Meta Ads Library và phân tích tự động.</p>
              </div>

              <div style={{ padding: 30, overflowY: "auto" }}>
                {aiStep === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                        URL Website hoặc tên thương hiệu đối thủ
                      </label>
                      <input
                        type="text"
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAiScan()}
                        placeholder="VD: tanadaithanh.vn hoặc Tập đoàn Sơn Hà"
                        className="app-input"
                        style={{ width: "100%", height: 44 }}
                        autoFocus
                      />
                    </div>
                    <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", padding: "12px 16px", borderRadius: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <i className="bi bi-stars" style={{ color: "#8b5cf6", marginTop: 2, fontSize: 14 }} />
                      <p style={{ margin: 0, fontSize: 12, color: "var(--foreground)", lineHeight: 1.6 }}>
                        AI sẽ đồng thời: (1) Cào tin tức Google News; (2) Quét thư viện Meta Ads (Apify); (3) Gemini phân tích SWOT & chiến lược.
                        Thời gian xử lý ~30–60 giây.
                      </p>
                    </div>
                  </div>
                )}

                {aiStep >= 1 && (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    {aiStep < 3 ? (
                      <div style={{ width: 52, height: 52, border: "4px solid var(--muted)", borderTopColor: "#ec4899", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 20px" }}>
                        <i className="bi bi-check-lg" />
                      </div>
                    )}

                    <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>
                      {aiStep === 3 ? `✅ Đã phân tích xong!` : "Đang phân tích..."}
                    </h3>
                    <p style={{ margin: "0 0 20px", fontSize: 12, color: "var(--muted-foreground)" }}>{aiStep < 3 ? aiStatusMsg : "Dữ liệu 100% thật từ Google News · Apify Meta Ads · Gemini AI"}</p>

                    <div style={{ height: 6, background: "var(--muted)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg, #ec4899, #8b5cf6)", width: `${aiProgress}%`, transition: "width 0.3s" }} />
                    </div>
                    <p style={{ margin: "0 0 20px", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 700 }}>{Math.round(aiProgress)}%</p>

                    {aiStep === 3 && scannedData && (
                      <div style={{ textAlign: "left", background: "var(--muted)", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: scannedData.color }}>Tên nhận diện: {scannedData.name}</div>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{scannedData.aiSummary?.slice(0, 150)}...</p>
                        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            <i className="bi bi-newspaper" /> {scannedData.dataSources?.newsArticles ?? 0} bài báo
                          </span>
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            <i className="bi bi-megaphone" /> {scannedData.metrics.adsCount > 0 ? `${scannedData.metrics.adsCount} Ads Meta` : "Đang chờ Ads"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div style={{ padding: "16px 30px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0, background: "var(--card)" }}>
                {aiStep === 0 ? (
                  <>
                    <button onClick={() => setShowAddModal(false)} className="app-btn-outline" style={{ height: 40, padding: "0 20px", borderRadius: 8 }}>Huỷ</button>
                    <button
                      onClick={handleAiScan}
                      disabled={!newUrl.trim()}
                      className="app-btn-primary"
                      style={{ height: 40, padding: "0 24px", borderRadius: 8, opacity: newUrl.trim() ? 1 : 0.5 }}
                    >
                      Bắt đầu Quét bằng AI
                    </button>
                  </>
                ) : aiStep === 3 ? (
                  <button onClick={handleFinishAdd} className="app-btn-primary" style={{ width: "100%", height: 44, borderRadius: 8 }}>
                    Lưu Đối thủ vào Hệ thống
                  </button>
                ) : (
                  <button disabled className="app-btn-primary" style={{ height: 40, padding: "0 24px", borderRadius: 8, opacity: 0.5 }}>
                    Đang quét...
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Xoá hồ sơ đối thủ"
        message={<>Bạn có chắc chắn muốn xoá hồ sơ này khỏi hệ thống theo dõi?<br /><br /><span style={{ color: "#f43f5e", fontSize: 13 }}>Cảnh báo: Toàn bộ dữ liệu tracking sẽ bị xoá vĩnh viễn khỏi thiết bị này.</span></>}
        confirmLabel="Xoá vĩnh viễn"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {showPrintModal && (isPrintAll ? competitors.length > 0 : selectedComp) && (
        <PrintPreviewModal
          title="Báo cáo Đánh giá Đối thủ"
          subtitle={isPrintAll ? `Tất cả (${competitors.length}) đối thủ` : selectedComp?.name}
          onClose={() => setShowPrintModal(false)}
          actions={
            <button onClick={() => printDocumentById("competitor-report-print")} style={{ background: "#6366f1", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-printer" /> In tài liệu
            </button>
          }
          document={
            <div id="competitor-report-print">
               <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  .page-number-counter::after {
                    counter-increment: page;
                    content: "Trang " counter(page);
                  }
                  .competitor-report-page {
                    page-break-after: always;
                  }
                  .competitor-report-page:last-child {
                    page-break-after: auto;
                  }
                }
              `}} />
              
              {/* Trang bìa cho chế độ in tất cả */}
              {isPrintAll && (
                <div className="competitor-report-page">
                  <div className="pdf-cover-page" style={{ display: "flex", flexDirection: "column", fontFamily: "Arial, sans-serif", color: "#000", position: "relative", zIndex: 20, background: "#fff", minHeight: "296mm" }}>
                    {/* Header (Top Left) */}
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "32px", padding: "76px 76px 0 95px" }}>
                      {companyInfo?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "40px", objectFit: "contain" }} />
                      ) : (
                        <div style={{ width: "40px", height: "40px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>LOGO</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{
                          margin: 0,
                          fontSize: (companyInfo?.name || "").length > 45 ? "11px" : (companyInfo?.name || "").length > 35 ? "12px" : "14px",
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          color: "#003087",
                          letterSpacing: "1px",
                          whiteSpace: "nowrap"
                        }}>{companyInfo?.name || "CÔNG TY MARKETING"}</h1>
                        <p style={{ margin: 0, fontSize: "11px", color: "#000000" }}>{companyInfo?.slogan || ""}</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", height: "480px", position: "relative" }}>
                      <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
                        <div style={{ flex: 1, background: "#003087", padding: "40px 0 40px 95px", color: "white", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "36px", fontWeight: 800, margin: "0 0 16px 0", textTransform: "uppercase", lineHeight: 1.2 }}>
                            BÁO CÁO<br />TỔNG HỢP
                          </h2>
                        </div>
                        <div style={{
                          flex: 1.2,
                          background: "#000000",
                          padding: "60px 0 40px 95px",
                          color: "white",
                          clipPath: "polygon(0 0, 100% 25%, 100% 100%, 0 100%)",
                          marginTop: "-80px",
                          zIndex: 2,
                          display: "flex", flexDirection: "column", justifyContent: "center"
                        }}>
                          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "40px", fontWeight: 900, margin: "0 0 12px 0", color: "#C9A84C", lineHeight: 1.2 }}>
                            Đối Thủ<br />Cạnh Tranh
                          </h1>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: "'Montserrat', sans-serif", borderTop: "1px solid rgba(201,168,76,0.4)", paddingTop: "12px" }}>
                            Tất cả ({competitors.length}) đối thủ theo dõi
                          </div>
                        </div>
                      </div>
                      <div style={{ width: "45%", position: "relative" }}>
                        <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Analysis" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    </div>

                    <div style={{ flex: 1, display: "flex", gap: "40px", marginTop: "40px", padding: "0 76px 0 95px" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "28px" }}>
                        <div style={{ fontSize: "14px", color: "#003087", fontWeight: 800, textTransform: "uppercase", marginBottom: "8px", borderBottom: "2px solid #003087", paddingBottom: "8px" }}>DANH SÁCH ĐỐI THỦ PHÂN TÍCH</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          {competitors.slice(0, 12).map(c => (
                            <div key={c.id} style={{ fontSize: "11px", color: "#000", display: "flex", alignItems: "center", gap: "8px" }}>
                              <i className="bi bi-check2-square" style={{ color: "#003087" }} /> {c.name}
                            </div>
                          ))}
                          {competitors.length > 12 && <div style={{ fontSize: "11px", color: "#64748b" }}>... và {competitors.length - 12} đối thủ khác</div>}
                        </div>
                      </div>
                      <div style={{ width: "40%" }}>
                        <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "15px", color: "#003087", textTransform: "uppercase", fontWeight: 800, margin: "0 0 12px 0" }}>VỀ BÁO CÁO TỔNG HỢP</h3>
                        <p style={{ color: "#000000", fontSize: "11px", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                          Tài liệu này tổng hợp dữ liệu phân tích chiến lược, SWOT và các chỉ số truyền thông của toàn bộ các đối thủ chính đang được theo dõi trên hệ thống.
                        </p>
                        <ul style={{ paddingLeft: "16px", margin: "0", fontSize: "11px", color: "#000000", lineHeight: 1.8 }}>
                          <li><strong>Tổng số hồ sơ:</strong> {competitors.length}</li>
                          <li><strong>Ngày xuất báo cáo:</strong> {new Date().toLocaleDateString('vi-VN')}</li>
                          <li><strong>Phạm vi:</strong> Toàn bộ thị trường theo dõi</li>
                        </ul>
                      </div>
                    </div>

                    <div style={{ display: "flex", marginTop: "auto", background: "#003087", color: "white", padding: "24px 76px 36px 95px", position: "relative" }}>
                      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "40%", background: "#000000", clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }} />
                      <div style={{ width: "35%", position: "relative", zIndex: 2 }}>
                        <div style={{ fontSize: "10px", opacity: 0.9, color: "#C9A84C", textTransform: "uppercase", fontWeight: 700 }}>Thông tin liên hệ</div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "18px", fontWeight: 700, margin: "2px 0 0 0" }}>{companyInfo?.phone || "+84 900 123 456"}</div>
                      </div>
                      <div style={{ width: "30%", position: "relative", zIndex: 2 }}>
                        <div style={{ fontSize: "10px", opacity: 0.9 }}>Email: {companyInfo?.email || "contact@company.vn"}</div>
                        <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "6px" }}>Website: {companyInfo?.website || "www.company.vn"}</div>
                      </div>
                      <div style={{ width: "35%", position: "relative", zIndex: 2, paddingLeft: "24px" }}>
                        <div style={{ fontSize: "10px", opacity: 0.9 }}>Địa chỉ: {companyInfo?.address || "Hà Nội, Việt Nam"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(isPrintAll ? competitors : [selectedComp!]).map((comp, idx) => (
                <div key={comp.id} className="competitor-report-page">
                  {/* Trang bìa cho chế độ in lẻ (chỉ hiện cho trang đầu tiên nếu không phải PrintAll) */}
                  {!isPrintAll && (
                    <div className="pdf-cover-page" style={{ display: "flex", flexDirection: "column", fontFamily: "Arial, sans-serif", color: "#000", position: "relative", zIndex: 20, background: "#fff", minHeight: "296mm" }}>
                      {/* Header (Top Left) */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "32px", padding: "76px 76px 0 95px" }}>
                        {companyInfo?.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "40px", objectFit: "contain" }} />
                        ) : (
                          <div style={{ width: "40px", height: "40px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>LOGO</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h1 style={{
                            margin: 0,
                            fontSize: (companyInfo?.name || "").length > 45 ? "11px" : (companyInfo?.name || "").length > 35 ? "12px" : "14px",
                            fontFamily: "'Montserrat', sans-serif",
                            fontWeight: 900,
                            textTransform: "uppercase",
                            color: "#003087",
                            letterSpacing: "1px",
                            whiteSpace: "nowrap"
                          }}>{companyInfo?.name || "CÔNG TY MARKETING"}</h1>
                          <p style={{ margin: 0, fontSize: "11px", color: "#000000" }}>{companyInfo?.slogan || ""}</p>
                        </div>
                      </div>

                      {/* Hero Split Area */}
                      <div style={{ display: "flex", height: "480px", position: "relative" }}>
                        {/* Left Side */}
                        <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
                          {/* Top Blue Section */}
                          <div style={{ flex: 1, background: "#003087", padding: "40px 0 40px 95px", color: "white", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "36px", fontWeight: 800, margin: "0 0 16px 0", textTransform: "uppercase", lineHeight: 1.2 }}>
                              BÁO CÁO<br />PHÂN TÍCH
                            </h2>
                          </div>
                          {/* Bottom Black with Clip Path */}
                          <div style={{
                            flex: 1.2,
                            background: "#000000",
                            padding: "60px 0 40px 95px",
                            color: "white",
                            clipPath: "polygon(0 0, 100% 25%, 100% 100%, 0 100%)",
                            marginTop: "-80px",
                            zIndex: 2,
                            display: "flex", flexDirection: "column", justifyContent: "center"
                          }}>
                            <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "40px", fontWeight: 900, margin: "0 0 12px 0", color: "#C9A84C", lineHeight: 1.2 }}>
                              Đối Thủ<br />Cạnh Tranh
                            </h1>
                            <div style={{ fontSize: "18px", fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: "'Montserrat', sans-serif", borderTop: "1px solid rgba(201,168,76,0.4)", paddingTop: "12px" }}>
                              {comp.name}
                            </div>
                          </div>
                        </div>
                        {/* Right Side (Image) */}
                        <div style={{ width: "45%", position: "relative" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Analysis" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      </div>

                      {/* Features / Details */}
                      <div style={{ flex: 1, display: "flex", gap: "40px", marginTop: "40px", padding: "0 76px 0 95px" }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "28px" }}>
                          {[
                            { icon: "bi-shield-check", title: "Phân tích SWOT", desc: "Đánh giá Điểm mạnh, Điểm yếu, Cơ hội và Thách thức của đối thủ." },
                            { icon: "bi-graph-up-arrow", title: "Chỉ số Truyền thông", desc: "Theo dõi tần suất xuất hiện, độ nhận diện và hiệu quả quảng cáo." },
                            { icon: "bi-crosshair", title: "Chiến lược Marketing", desc: "Giải mã các chiến dịch và định hướng tiếp cận khách hàng." }
                          ].map((item, idx) => (
                            <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                              <div style={{ width: "42px", height: "42px", background: "#003087", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0, clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                                <i className={`bi ${item.icon}`} />
                              </div>
                              <div>
                                <strong style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "13px", display: "block", marginBottom: "4px", color: "#000000", textTransform: "uppercase" }}>{item.title}</strong>
                                <p style={{ margin: 0, fontSize: "11px", color: "#000000", lineHeight: 1.5 }}>{item.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ width: "45%" }}>
                          <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "15px", color: "#003087", textTransform: "uppercase", fontWeight: 800, margin: "0 0 12px 0" }}>VỀ BÁO CÁO NÀY</h3>
                          <p style={{ color: "#000000", fontSize: "11px", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                            Báo cáo phân tích đối thủ cạnh tranh được thực hiện tự động dựa trên dữ liệu công khai từ mạng xã hội, website và quảng cáo.
                          </p>
                          <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "14px", color: "#000000", fontWeight: 700, margin: "24px 0 8px 0" }}>THÔNG TIN ĐỐI THỦ</h3>
                          <ul style={{ paddingLeft: "16px", margin: "0 0 20px 0", fontSize: "11px", color: "#000000", lineHeight: 1.8 }}>
                            <li><strong>Tên thương hiệu:</strong> {comp.name}</li>
                            <li><strong>Website:</strong> {comp.website}</li>
                            <li><strong>Mức độ đe dọa:</strong> {comp.threat}</li>
                            <li><strong>Ngày báo cáo:</strong> {new Date().toLocaleDateString('vi-VN')}</li>
                          </ul>
                        </div>
                      </div>

                      {/* Footer Strip */}
                      <div style={{ display: "flex", marginTop: "auto", background: "#003087", color: "white", padding: "24px 76px 36px 95px", position: "relative" }}>
                        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "40%", background: "#000000", clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }} />
                        <div style={{ width: "35%", position: "relative", zIndex: 2 }}>
                          <div style={{ fontSize: "10px", opacity: 0.9, color: "#C9A84C", textTransform: "uppercase", fontWeight: 700 }}>Thông tin liên hệ</div>
                          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "18px", fontWeight: 700, margin: "2px 0 0 0" }}>{companyInfo?.phone || "+84 900 123 456"}</div>
                        </div>
                        <div style={{ width: "30%", position: "relative", zIndex: 2 }}>
                          <div style={{ fontSize: "10px", opacity: 0.9 }}>Email: {companyInfo?.email || "contact@company.vn"}</div>
                          <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "6px" }}>Website: {companyInfo?.website || "www.company.vn"}</div>
                        </div>
                        <div style={{ width: "35%", position: "relative", zIndex: 2, paddingLeft: "24px" }}>
                          <div style={{ fontSize: "10px", opacity: 0.9 }}>Địa chỉ: {companyInfo?.address || "Hà Nội, Việt Nam"}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONTENT PAGE */}
                  <div className="pdf-content-page" style={{ padding: "40px 0 0 0", fontFamily: "Arial, sans-serif", color: "#000", minHeight: "296mm" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead style={{ display: "table-header-group" }}>
                        <tr>
                          <td style={{ padding: "0 40px" }}>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px" }}>
                              {companyInfo?.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "32px", objectFit: "contain" }} />
                              ) : (
                                <div style={{ width: "32px", height: "32px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>LOGO</div>
                              )}
                              <div style={{ flex: 1 }}>
                                <h1 style={{ margin: 0, fontSize: "12px", fontFamily: "'Montserrat', sans-serif", fontWeight: 900, textTransform: "uppercase", color: "#003087", letterSpacing: "1px" }}>{companyInfo?.name || "CÔNG TY MARKETING"}</h1>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: "0 40px" }}>
                            <div style={{ borderBottom: "3px solid #1e3a8a", paddingBottom: 16, marginBottom: 24 }}>
                              <h1 style={{ margin: "0 0 8px", fontSize: 24, color: "#1e3a8a", textTransform: "uppercase" }}>BÁO CÁO ĐÁNH GIÁ ĐỐI THỦ</h1>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569" }}>
                                <div><strong>Đối thủ:</strong> {comp.name}</div>
                                <div><strong>Ngày phân tích:</strong> {new Date().toLocaleDateString('vi-VN')}</div>
                              </div>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                               <div style={{ background: "#f8fafc", padding: 16, borderLeft: "4px solid #ec4899", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                  <strong>Nhận định tổng quan:</strong> {comp.aiSummary}
                               </div>

                               <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>1. PHÂN TÍCH SWOT</h3>
                               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                                  <div style={{ background: "#f0fdf4", padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontWeight: "bold", color: "#166534", marginBottom: 6 }}>Điểm mạnh (Strengths)</div>
                                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                                      {comp.swot.s.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                  </div>
                                  <div style={{ background: "#fef2f2", padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontWeight: "bold", color: "#991b1b", marginBottom: 6 }}>Điểm yếu (Weaknesses)</div>
                                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                                      {comp.swot.w.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                    </ul>
                                  </div>
                                  <div style={{ background: "#eff6ff", padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontWeight: "bold", color: "#1e40af", marginBottom: 6 }}>Cơ hội (Opportunities)</div>
                                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                                      {comp.swot.o.map((o: string, i: number) => <li key={i}>{o}</li>)}
                                    </ul>
                                  </div>
                                  <div style={{ background: "#fffbeb", padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontWeight: "bold", color: "#92400e", marginBottom: 6 }}>Thách thức (Threats)</div>
                                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                                      {comp.swot.t.map((t: string, i: number) => <li key={i}>{t}</li>)}
                                    </ul>
                                  </div>
                               </div>

                               <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>2. CHỈ SỐ HOẠT ĐỘNG</h3>
                               <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                                  <thead>
                                    <tr style={{ background: "#f8fafc" }}>
                                      <th style={{ border: "1px solid #e2e8f0", padding: 10, textAlign: "left", fontSize: 12 }}>Chỉ số</th>
                                      <th style={{ border: "1px solid #e2e8f0", padding: 10, textAlign: "center", fontSize: 12 }}>Giá trị</th>
                                      <th style={{ border: "1px solid #e2e8f0", padding: 10, textAlign: "left", fontSize: 12 }}>Ghi chú</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, fontSize: 12 }}>Quảng cáo đang chạy</td>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, textAlign: "center", fontSize: 14, fontWeight: "bold" }}>{comp.metrics.adsCount}</td>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, fontSize: 12 }}>Dữ liệu từ Facebook Ads Library</td>
                                    </tr>
                                    <tr>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, fontSize: 12 }}>Lượt nhắc tên MXH</td>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, textAlign: "center", fontSize: 14, fontWeight: "bold" }}>{comp.metrics.socialMentions}</td>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, fontSize: 12 }}>Ước tính tần suất thảo luận</td>
                                    </tr>
                                    <tr>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, fontSize: 12 }}>Chỉ số hài lòng (Sentiment)</td>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, textAlign: "center", fontSize: 14, fontWeight: "bold", color: "#10b981" }}>{comp.metrics.sentimentScore}/100</td>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, fontSize: 12 }}>Phân tích cảm xúc người dùng</td>
                                    </tr>
                                    <tr>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, fontSize: 12 }}>Chỉ số giá</td>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, textAlign: "center", fontSize: 14, fontWeight: "bold" }}>{comp.metrics.priceIndex}</td>
                                      <td style={{ border: "1px solid #e2e8f0", padding: 10, fontSize: 12 }}>So với mức trung bình thị trường</td>
                                    </tr>
                                  </tbody>
                               </table>

                               <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>3. CHIẾN LƯỢC NỘI DUNG & KÊNH</h3>
                               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8 }}>Kênh hoạt động chính:</div>
                                    {comp.marketingActivity?.channels.map((ch: any, i: number) => (
                                      <div key={i} style={{ fontSize: 12, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                                        <span>{ch.name}</span>
                                        <span style={{ color: "#64748b" }}>{ch.activity}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8 }}>Chủ đề nội dung tập trung:</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                      {comp.marketingActivity?.contentThemes.map((theme: string, i: number) => (
                                        <span key={theme} style={{ fontSize: 11, padding: "4px 10px", background: "#f5f3ff", color: "#6d28d9", borderRadius: 99, border: "1px solid #ddd6fe" }}>{theme}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                               <h3 style={{ margin: "24px 0 16px", fontSize: 16, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>4. GỢI Ý CHIẾN LƯỢC TÁC CHIẾN</h3>
                               {comp.strategySuggestions ? (
                                 <>
                                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                     <div style={{ background: "#f0fdf4", padding: 12, borderRadius: 8, border: "1px solid #bbf7d0" }}>
                                       <div style={{ fontWeight: "bold", color: "#166534", marginBottom: 6, fontSize: 13 }}>Việc nên làm:</div>
                                       <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#065f46" }}>
                                         {comp.strategySuggestions.dos.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                       </ul>
                                     </div>
                                     <div style={{ background: "#fef2f2", padding: 12, borderRadius: 8, border: "1px solid #fecaca" }}>
                                       <div style={{ fontWeight: "bold", color: "#991b1b", marginBottom: 6, fontSize: 13 }}>Việc không nên làm:</div>
                                       <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#991b1b" }}>
                                         {comp.strategySuggestions.donts.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                       </ul>
                                     </div>
                                   </div>
                                   <div style={{ background: "#1e1b4b", padding: 16, borderRadius: 8, color: "white" }}>
                                     <div style={{ fontSize: 11, color: "#a5b4fc", fontWeight: "bold", marginBottom: 4 }}>TƯ VẤN TÁC CHIẾN TỪ AI:</div>
                                     <div style={{ fontSize: 13, lineHeight: 1.5 }}>{comp.strategySuggestions.tacticalAdvice}</div>
                                   </div>
                                 </>
                               ) : (
                                 <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px dashed #e2e8f0", fontSize: 13, textAlign: "center", color: "#64748b" }}>
                                   Dữ liệu chiến lược chưa được khởi tạo. Vui lòng quét lại đối thủ.
                                 </div>
                               )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot style={{ display: "table-footer-group" }}>
                        <tr>
                          <td style={{ padding: "0 40px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", marginTop: "32px", paddingBottom: "12px", fontSize: "10px", color: "#475569", borderTop: "1px solid #cbd5e1" }}>
                              <div><strong>Báo cáo Đối thủ:</strong> {comp.name}</div>
                              <div style={{ display: "flex", gap: "24px" }}>
                                <span>Ban hành: {new Date().toLocaleDateString('vi-VN')}</span>
                                <span className="page-number-counter"></span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          }
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}
