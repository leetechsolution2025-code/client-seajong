"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMarketFormData } from "./actions";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

export default function MarketIntelligenceHub() {
  const [form, setForm] = useState<{
    campaignName: string; campaignDesc: string; targetSegment: string; timeline: string; budget: string;
    products: string[]; channels: string[];
  }>({
    campaignName: "", campaignDesc: "", targetSegment: "", timeline: "", budget: "",
    products: [], channels: []
  });
  
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbChannels, setDbChannels] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
  const [productSearch, setProductSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  
  useEffect(() => {
    getMarketFormData().then(res => {
      setDbProducts(res.products || []);
      setDbChannels(res.channels || []);
    });
    fetch("/api/company")
      .then(res => res.json())
      .then(data => {
        if (data && data.name) setCompanyInfo(data);
      })
      .catch(console.error);
  }, []);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true); setError(""); setProgress(5);
    const timer = setInterval(() => setProgress(p => p >= 90 ? p : p + Math.random() * 10), 500);
    try {
      const payload = { ...form };
      const res = await fetch("/api/market-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Lỗi API");
      setProgress(100);
      setTimeout(() => setData(json.data), 300);
    } catch (e: any) {
      setError(e.message);
    } finally {
      clearInterval(timer);
      setTimeout(() => { setLoading(false); setProgress(0); }, 500);
    }
  };

  if (data) {
    return (
      <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1e1b4b" }}>
            <i className="bi bi-bar-chart-fill" style={{ color: "#6366f1", marginRight: 8 }} />
            Báo cáo Phân tích Chiến dịch
          </h2>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setData(null)} style={{ padding: "8px 16px", borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-arrow-left" /> Quay lại Form
            </button>
            <button onClick={() => setShowPrintModal(true)} style={{ padding: "8px 16px", borderRadius: 8, background: "#6366f1", border: "1px solid #4f46e5", color: "white", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(99,102,241,0.2)" }}>
              <i className="bi bi-printer" /> Tạo báo cáo
            </button>
          </div>
        </div>

        {/* SUMMARY & SCORES */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
          <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", borderRadius: 16, padding: 24, color: "white" }}>
            <div style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Tóm tắt Tổng quan</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>{data.executiveSummary}</div>
          </div>
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: data.opportunityScore >= 70 ? "#10b981" : "#f59e0b" }}>{data.opportunityScore}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>ĐIỂM TIỀM NĂNG</div>
          </div>
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: data.riskLevel === "Cao" ? "#ef4444" : data.riskLevel === "Trung bình" ? "#f59e0b" : "#10b981", marginBottom: 4 }}>
              {data.riskLevel === "Cao" ? "🔴" : data.riskLevel === "Trung bình" ? "🟡" : "🟢"} {data.riskLevel}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>MỨC ĐỘ RỦI RO</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* MARKET FIT */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}><i className="bi bi-pie-chart-fill" style={{ color: "#6366f1" }}/> Phù hợp Thị trường & Khoảng trống</h3>
            <div style={{ fontSize: 13, color: "#334155", marginBottom: 12 }}><strong>Đánh giá:</strong> {data.marketFit?.assessment}</div>
            <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 13, color: "#15803d", marginBottom: 12 }}>
              <strong>Đại dương xanh:</strong> {data.marketFit?.gapOpportunity}
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}><strong>Phân khúc:</strong> {data.marketFit?.targetSegmentAnalysis}</div>
            <div style={{ fontSize: 13, color: "#475569" }}><strong>Mùa vụ:</strong> {data.marketFit?.seasonality}</div>
          </div>

          {/* PRODUCT INSIGHTS */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}><i className="bi bi-box-seam-fill" style={{ color: "#8b5cf6" }}/> Phân tích Sản phẩm</h3>
            <div style={{ fontSize: 13, color: "#334155", marginBottom: 12 }}><strong>Xu hướng:</strong> {data.productInsights?.trendAlignment}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {(data.productInsights?.uniqueSellingPoints || []).map((usp: string, i: number) => (
                <span key={i} style={{ fontSize: 11, padding: "4px 10px", background: "#f5f3ff", color: "#6d28d9", borderRadius: 99, border: "1px solid #ddd6fe" }}>{usp}</span>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}><strong>Giá:</strong> {data.productInsights?.pricingStrategy}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(data.productInsights?.productRisks || []).map((r: string, i: number) => (
                <span key={i} style={{ fontSize: 11, color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: 4 }}>⚠ {r}</span>
              ))}
            </div>
          </div>

          {/* COMPETITOR & CHANNELS */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}><i className="bi bi-radar" style={{ color: "#ec4899" }}/> Đối thủ & Kênh</h3>
            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: 12 }}>Mối đe dọa chính:</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                {(data.competitorIntel?.keyThreats || []).map((t: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, padding: "6px 10px", background: "#f8fafc", borderRadius: 6, borderLeft: `3px solid ${t.level === 'Cao' ? '#ef4444' : '#f59e0b'}` }}>
                    <strong>{t.brand}:</strong> {t.threat}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#334155", marginBottom: 12 }}><strong>Lợi thế cạnh tranh:</strong> {data.competitorIntel?.competitiveAdvantage}</div>
            <div style={{ padding: 12, background: "#fff1f2", borderRadius: 8, border: "1px solid #fecdd3", fontSize: 12, color: "#be185d", marginBottom: 16 }}>
              <strong>Chiến thuật:</strong> {data.competitorIntel?.counterStrategy}
            </div>
            <div style={{ fontSize: 13, color: "#334155" }}>
              <strong>Kênh ưu tiên:</strong> {data.channelStrategy?.primaryChannel?.name} <br/>
              <span style={{ fontSize: 12, color: "#64748b" }}>{data.channelStrategy?.primaryChannel?.reason}</span>
            </div>
          </div>

          {/* CUSTOMER & EWS */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}><i className="bi bi-people-fill" style={{ color: "#f59e0b" }}/> Khách hàng & Cảnh báo</h3>
            <div style={{ fontSize: 13, color: "#334155", marginBottom: 12 }}><strong>Chân dung KH:</strong> {data.customerJourney?.targetBuyer}</div>
            <div style={{ fontSize: 13, color: "#334155", marginBottom: 12 }}><strong>Điểm kích hoạt mua:</strong> {(data.customerJourney?.decisionTriggers || []).join(", ")}</div>
            
            <div style={{ borderTop: "1px dashed #e2e8f0", margin: "16px 0" }} />
            
            <strong style={{ fontSize: 12, color: "#dc2626" }}>Cảnh báo chuỗi cung ứng ({data.supplyChainAlert?.overallRisk}):</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, marginBottom: 12 }}>
              {(data.supplyChainAlert?.alerts || []).map((a: any, i: number) => (
                <div key={i} style={{ fontSize: 11, background: "#fef2f2", color: "#991b1b", padding: "6px 10px", borderRadius: 6 }}>
                  <strong>{a.factor}:</strong> {a.impact} <br/>
                  <span style={{ color: "#dc2626" }}>→ {a.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ACTION PLAN */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}><i className="bi bi-list-check" style={{ color: "#10b981" }}/> Kế hoạch Hành động</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>Ngay lập tức (0-2 tuần)</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#334155", display: "flex", flexDirection: "column", gap: 6 }}>
                {(data.actionPlan?.immediate || []).map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>Ngắn hạn (1-3 tháng)</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#334155", display: "flex", flexDirection: "column", gap: 6 }}>
                {(data.actionPlan?.shortTerm || []).map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>Dài hạn (3-12 tháng)</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#334155", display: "flex", flexDirection: "column", gap: 6 }}>
                {(data.actionPlan?.longTerm || []).map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1", fontSize: 13, color: "#0f172a" }}>
            <strong style={{ display: "block", marginBottom: 8, fontSize: 14 }}>Phân bổ ngân sách dự kiến:</strong>
            <div style={{ marginBottom: data.actionPlan?.budgetAllocation?.length > 0 ? 12 : 0 }}>{data.actionPlan?.budget}</div>
            {data.actionPlan?.budgetAllocation && data.actionPlan.budgetAllocation.length > 0 && (
              <div>
                <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", marginBottom: 12, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}>
                  {data.actionPlan.budgetAllocation.map((alloc: any, i: number) => (
                    <div key={i} style={{ width: `${alloc.percentage}%`, background: ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6'][i % 6] }} title={`${alloc.channel}: ${alloc.percentage}%`} />
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px" }}>
                  {data.actionPlan.budgetAllocation.map((alloc: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6'][i % 6] }} />
                      <span style={{ fontWeight: 500 }}>{alloc.channel}</span>
                      <span style={{ color: "#64748b", fontWeight: 700 }}>({alloc.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* FINAL VERDICT */}
        <div style={{ position: "relative", background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)", borderRadius: 16, padding: "24px 32px", color: "white", boxShadow: "0 10px 25px -5px rgba(30, 58, 138, 0.4)", marginTop: 24, overflow: "hidden" }}>
          <div style={{ position: "absolute", right: 20, top: -10, fontSize: 120, color: "rgba(255,255,255,0.05)", lineHeight: 1, fontFamily: "serif" }}>&quot;</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <i className="bi bi-lightbulb-fill" style={{ color: "#fbbf24" }} />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f8fafc", textTransform: "uppercase", letterSpacing: 0.5 }}>Kết Luận & Đề Xuất Chiến Lược</h3>
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#e2e8f0", fontWeight: 400, position: "relative", zIndex: 1, textAlign: "justify" }}>
            {data.finalVerdict}
          </p>
        </div>

      </motion.div>
      
      {showPrintModal && (
        <PrintPreviewModal
          title="Báo cáo Phân tích Chiến dịch & Thị trường"
          subtitle={form.campaignName || "Dữ liệu xuất tự động từ AI"}
          onClose={() => setShowPrintModal(false)}
          actions={
            <button
              onClick={() => printDocumentById("print-doc")}
              style={{
                padding: "6px 16px", border: "1px solid #3730a3",
                background: "#4f46e5", color: "#fff",
                borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6
              }}
            >
              <i className="bi bi-printer" /> In tài liệu
            </button>
          }
          document={
            <>
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  .page-number-counter::after {
                    counter-increment: page;
                    content: "Trang " counter(page);
                  }
                }
              `}} />
              {/* ── BÌA BÁO CÁO (COVER PAGE) ── */}
              <div className="pdf-cover-page" style={{ display: "flex", flexDirection: "column", fontFamily: "Arial, sans-serif", color: "#000", position: "relative", zIndex: 20, background: "#fff" }}>
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
                    <p style={{ margin: 0, fontSize: "11px", color: "#000000" }}>{companyInfo?.slogan || "Slogan công ty"}</p>
                  </div>
                </div>

                {/* Hero Split Area */}
                <div style={{ display: "flex", height: "480px", position: "relative" }}>
                  {/* Left Side */}
                  <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
                    {/* Top Brand Color Section */}
                    <div style={{ flex: 1, background: "#003087", padding: "40px 0 40px 95px", color: "white", display: "flex", alignItems: "center" }}>
                      <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "36px", fontWeight: 800, margin: 0, textTransform: "uppercase", lineHeight: 1.2 }}>PHÂN TÍCH<br />CHIẾN DỊCH</h2>
                    </div>
                    {/* Bottom Blue with Clip Path */}
                    <div style={{
                      flex: 1.2,
                      background: "#000000",
                      padding: "60px 0 40px 95px",
                      color: "white",
                      clipPath: "polygon(0 0, 100% 25%, 100% 100%, 0 100%)",
                      marginTop: "-80px",
                      zIndex: 2,
                      display: "flex", alignItems: "center"
                    }}>
                      <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "40px", fontWeight: 900, margin: 0, color: "#C9A84C", lineHeight: 1.2 }}>
                        Market<br/>Intelligence<br/>Report
                      </h1>
                    </div>
                  </div>
                  {/* Right Side (Image) */}
                  <div style={{ width: "45%", position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Phân tích" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>

                {/* Features / Details */}
                <div style={{ flex: 1, display: "flex", gap: "40px", marginTop: "40px", padding: "0 76px 0 95px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "28px" }}>
                    {[
                      { icon: "bi-graph-up-arrow", title: "Phân tích Thị trường", desc: "Đánh giá khoảng trống, thị phần và mức độ phù hợp của chiến dịch." },
                      { icon: "bi-search", title: "Insights Đối thủ", desc: "Phân tích mối đe dọa từ đối thủ và đề xuất chiến thuật phản đòn." },
                      { icon: "bi-shield-check", title: "Đánh giá Rủi ro", desc: "Dự báo rủi ro sản phẩm và chuỗi cung ứng trước khi triển khai." }
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
                    <p style={{ color: "#000000", fontSize: "11px", lineHeight: 1.6, margin: "0 0 16px 0", maxWidth: "90%" }}>
                      Dữ liệu được tổng hợp và phân tích tự động bằng trí tuệ nhân tạo (AI) chuyên sâu về ngành Kitchen & Bath. Vui lòng bảo mật tài liệu và chỉ lưu hành nội bộ.
                    </p>
                    <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "14px", color: "#000000", fontWeight: 700, margin: "24px 0 8px 0" }}>THÔNG TIN CHIẾN DỊCH</h3>
                    <ul style={{ paddingLeft: "16px", margin: "0 0 20px 0", fontSize: "11px", color: "#000000", lineHeight: 1.8 }}>
                      <li><strong>Tên chiến dịch:</strong> {form.campaignName || "Chưa xác định"}</li>
                      <li><strong>Sản phẩm mục tiêu:</strong> {(form.products || []).join(', ') || "N/A"}</li>
                      <li><strong>Ngân sách dự kiến:</strong> {form.budget || "Chưa xác định"}</li>
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

              {/* ── NỘI DUNG BÁO CÁO (CONTENT PAGE) ── */}
              <div className="pdf-content-page" style={{ padding: "40px 0 0 0", fontFamily: "Arial, sans-serif", color: "#000" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ display: "table-header-group" }}>
                    <tr>
                      <td style={{ padding: "0 40px" }}>
                        {/* Header for content page */}
                        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px" }}>
                          {companyInfo?.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "32px", objectFit: "contain" }} />
                          ) : (
                            <div style={{ width: "32px", height: "32px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>LOGO</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{
                              margin: 0,
                              fontSize: (companyInfo?.name || "").length > 45 ? "10px" : (companyInfo?.name || "").length > 35 ? "11px" : "12px",
                              fontFamily: "'Montserrat', sans-serif",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              color: "#003087",
                              letterSpacing: "1px",
                              whiteSpace: "nowrap"
                            }}>{companyInfo?.name || "CÔNG TY MARKETING"}</h1>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "0 40px" }}>

                <div style={{ borderBottom: "3px solid #1e3a8a", paddingBottom: 16, marginBottom: 24 }}>
                <h1 style={{ margin: "0 0 8px", fontSize: 24, color: "#1e3a8a", textTransform: "uppercase" }}>BÁO CÁO PHÂN TÍCH CHIẾN DỊCH</h1>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569" }}>
                  <div><strong>Chiến dịch:</strong> {form.campaignName || "N/A"}</div>
                  <div><strong>Ngày phân tích:</strong> {new Date().toLocaleDateString('vi-VN')}</div>
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}><strong>Ngân sách dự kiến:</strong> {form.budget || "N/A"} | <strong>Thời gian:</strong> {form.timeline || "N/A"}</div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ background: "#f8fafc", padding: 16, borderLeft: "4px solid #3b82f6", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  <strong>Tóm tắt Tổng quan:</strong> {data.executiveSummary}
                </div>
                <div style={{ display: "flex", gap: 24 }}>
                  <div style={{ flex: 1, border: "1px solid #e2e8f0", padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>ĐIỂM TIỀM NĂNG</div>
                    <div style={{ fontSize: 24, fontWeight: "bold", color: data.opportunityScore >= 70 ? "#10b981" : "#f59e0b" }}>{data.opportunityScore}/100</div>
                  </div>
                  <div style={{ flex: 1, border: "1px solid #e2e8f0", padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>MỨC ĐỘ RỦI RO</div>
                    <div style={{ fontSize: 20, fontWeight: "bold", color: data.riskLevel === "Cao" ? "#ef4444" : "#10b981", marginTop: 4 }}>{data.riskLevel}</div>
                  </div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                <tbody>
                  <tr>
                    <td style={{ width: "50%", verticalAlign: "top", padding: "0 12px 0 0" }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 15, borderBottom: "1px solid #cbd5e1", paddingBottom: 6 }}>1. PHÂN TÍCH THỊ TRƯỜNG</h3>
                      <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Khớp thị trường:</strong> {data.marketFit?.assessment}</div>
                      <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Khoảng trống/Cơ hội:</strong> {data.marketFit?.gapOpportunity}</div>
                      <div style={{ fontSize: 13 }}><strong>Phân khúc & Mùa vụ:</strong> {data.marketFit?.targetSegmentAnalysis} - {data.marketFit?.seasonality}</div>
                    </td>
                    <td style={{ width: "50%", verticalAlign: "top", padding: "0 0 0 12px", borderLeft: "1px solid #e2e8f0" }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 15, borderBottom: "1px solid #cbd5e1", paddingBottom: 6 }}>2. INSIGHTS SẢN PHẨM</h3>
                      <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Xu hướng:</strong> {data.productInsights?.trendAlignment}</div>
                      <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Lợi điểm bán hàng (USPs):</strong> {(data.productInsights?.uniqueSellingPoints || []).join(", ")}</div>
                      <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Chiến lược giá:</strong> {data.productInsights?.pricingStrategy}</div>
                      <div style={{ fontSize: 13 }}><strong>Rủi ro sản phẩm:</strong> {(data.productInsights?.productRisks || []).join(" | ")}</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, borderBottom: "1px solid #cbd5e1", paddingBottom: 6 }}>3. ĐỐI THỦ & KÊNH PHÂN PHỐI</h3>
                <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Lợi thế cạnh tranh:</strong> {data.competitorIntel?.competitiveAdvantage}</div>
                <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Chiến thuật phản đòn:</strong> {data.competitorIntel?.counterStrategy}</div>
                <div style={{ fontSize: 13, marginBottom: 12 }}><strong>Kênh ưu tiên:</strong> {data.channelStrategy?.primaryChannel?.name} - <em>{data.channelStrategy?.primaryChannel?.reason}</em></div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #cbd5e1", padding: 8, textAlign: "left", width: "30%" }}>Thương hiệu đối thủ</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: 8, textAlign: "left" }}>Mối đe dọa (Threat)</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: 8, textAlign: "center", width: "15%" }}>Mức độ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.competitorIntel?.keyThreats || []).map((t: any, i: number) => (
                      <tr key={i}>
                        <td style={{ border: "1px solid #cbd5e1", padding: 8, fontWeight: "bold" }}>{t.brand}</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: 8 }}>{t.threat}</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: 8, textAlign: "center", color: t.level === "Cao" ? "#ef4444" : "#f59e0b" }}>{t.level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, borderBottom: "1px solid #cbd5e1", paddingBottom: 6 }}>4. KHÁCH HÀNG & CẢNH BÁO</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "50%", verticalAlign: "top", padding: "0 12px 0 0" }}>
                        <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Chân dung KH:</strong> {data.customerJourney?.targetBuyer}</div>
                        <div style={{ fontSize: 13 }}><strong>Điểm kích hoạt mua:</strong> {(data.customerJourney?.decisionTriggers || []).join(", ")}</div>
                      </td>
                      <td style={{ width: "50%", verticalAlign: "top", padding: "0 0 0 12px", borderLeft: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 13, marginBottom: 8, color: "#dc2626" }}><strong>Cảnh báo chuỗi cung ứng ({data.supplyChainAlert?.overallRisk}):</strong></div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#991b1b" }}>
                          {(data.supplyChainAlert?.alerts || []).map((a: any, i: number) => (
                            <li key={i} style={{ marginBottom: 4 }}>
                              <strong>{a.factor}:</strong> {a.impact} <span style={{ color: "#dc2626" }}>→ {a.action}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, borderBottom: "1px solid #cbd5e1", paddingBottom: 6 }}>5. KẾ HOẠCH HÀNH ĐỘNG (ACTION PLAN)</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "33.33%", verticalAlign: "top", border: "1px solid #cbd5e1", padding: 12, background: "#f8fafc" }}>
                        <div style={{ fontWeight: "bold", marginBottom: 8, color: "#0f172a" }}>Ngay lập tức (0-2 tuần)</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {(data.actionPlan?.immediate || []).map((a: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
                        </ul>
                      </td>
                      <td style={{ width: "33.33%", verticalAlign: "top", border: "1px solid #cbd5e1", padding: 12 }}>
                        <div style={{ fontWeight: "bold", marginBottom: 8, color: "#0f172a" }}>Ngắn hạn (1-3 tháng)</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {(data.actionPlan?.shortTerm || []).map((a: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
                        </ul>
                      </td>
                      <td style={{ width: "33.33%", verticalAlign: "top", border: "1px solid #cbd5e1", padding: 12 }}>
                        <div style={{ fontWeight: "bold", marginBottom: 8, color: "#0f172a" }}>Dài hạn (3-12 tháng)</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {(data.actionPlan?.longTerm || []).map((a: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ fontSize: 13, background: "#f1f5f9", padding: 16, borderRadius: 6, border: "1px dashed #cbd5e1" }}>
                  <strong style={{ display: "block", marginBottom: 8, fontSize: 14 }}>Phân bổ ngân sách dự kiến:</strong>
                  <div style={{ marginBottom: data.actionPlan?.budgetAllocation?.length > 0 ? 12 : 0 }}>{data.actionPlan?.budget}</div>
                  {data.actionPlan?.budgetAllocation && data.actionPlan.budgetAllocation.length > 0 && (
                    <div>
                      <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                        {data.actionPlan.budgetAllocation.map((alloc: any, i: number) => (
                          <div key={i} style={{ width: `${alloc.percentage}%`, background: ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6'][i % 6] }} />
                        ))}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px" }}>
                        {data.actionPlan.budgetAllocation.map((alloc: any, i: number) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6'][i % 6] }} />
                            <span>{alloc.channel} <strong>({alloc.percentage}%)</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* FINAL VERDICT (PRINT) */}
              <div style={{ marginTop: 32, background: "#f8fafc", border: "1px solid #cbd5e1", borderLeft: "6px solid #1e3a8a", borderRadius: 8, padding: 24, pageBreakInside: "avoid" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 16 }}>
                    <i className="bi bi-lightbulb-fill" />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: "bold", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: 0.5 }}>Kết Luận & Đề Xuất Từ Chuyên Gia AI</h3>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#0f172a", textAlign: "justify" }}>
                  {data.finalVerdict}
                </p>
              </div>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot style={{ display: "table-footer-group" }}>
                    <tr>
                      <td style={{ padding: "0 40px" }}>
                        {/* ── CHÂN TRANG NỘI DUNG (REPEATING FOOTER) ── */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", marginTop: "32px", paddingBottom: "12px", fontSize: "10px", color: "#475569", borderTop: "1px solid #cbd5e1", background: "transparent" }}>
                          <div><strong>Báo cáo Phân tích:</strong> {form.campaignName ? `Chiến dịch ${form.campaignName}` : "Chuyên sâu"}</div>
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
            </>
          }
        />
      )}
      
    </>
  );
}

  // FORM RENDER
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: 24, padding: "20px 0" }}>
      <div style={{ background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)", borderRadius: 24, padding: 40, border: "1px solid #e2e8f0", boxShadow: "0 20px 40px -15px rgba(0,0,0,0.05)", position: "relative", overflow: "hidden" }}>
        
        {/* Background glow effects */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(255,255,255,0) 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: -100, width: 300, height: 300, background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(255,255,255,0) 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ textAlign: "center", marginBottom: 40, position: "relative", zIndex: 1 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 10px 25px -5px rgba(99,102,241,0.3)", transform: "rotate(-5deg)" }}>
            <i className="bi bi-robot" style={{ fontSize: 36, color: "#4f46e5", transform: "rotate(5deg)" }} />
          </div>
          <h2 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 900, background: "linear-gradient(to right, #1e1b4b, #4338ca)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Khởi tạo Chiến dịch với AI</h2>
          <p style={{ margin: 0, fontSize: 15, color: "#64748b", maxWidth: 500, marginInline: "auto", lineHeight: 1.6 }}>Nhập thông tin brief chiến dịch để AI phân tích tiềm năng và lập chiến lược chuyên sâu dựa trên dữ liệu ngành K&B.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, position: "relative", zIndex: 1 }}>
          
          {/* Tên chiến dịch */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <i className="bi bi-bullseye" style={{ color: "#6366f1" }}/> Tên chiến dịch
            </label>
            <div style={{ position: "relative" }}>
              <input 
                value={form.campaignName} 
                onChange={e => setForm({...form, campaignName: e.target.value})} 
                placeholder="VD: Mega Sale Smart Toilet 2026" 
                style={{ width: "100%", height: 50, padding: "0 20px", borderRadius: 12, border: "2px solid #e2e8f0", background: "rgba(255,255,255,0.8)", fontSize: 15, outline: "none", transition: "all 0.2s", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }} 
                onFocus={e => { e.target.style.borderColor = "#818cf8"; e.target.style.boxShadow = "0 0 0 4px rgba(129,140,248,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
              />
            </div>
          </div>

          {/* Mô tả chiến dịch */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <i className="bi bi-card-text" style={{ color: "#8b5cf6" }}/> Mô tả chiến dịch
            </label>
            <textarea 
              value={form.campaignDesc} 
              onChange={e => setForm({...form, campaignDesc: e.target.value})} 
              placeholder="Nhập chi tiết mục tiêu, đối tượng hướng tới..." 
              style={{ width: "100%", height: 100, padding: "16px 20px", borderRadius: 12, border: "2px solid #e2e8f0", background: "rgba(255,255,255,0.8)", fontSize: 15, outline: "none", resize: "none", transition: "all 0.2s", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)", fontFamily: "inherit" }} 
              onFocus={e => { e.target.style.borderColor = "#818cf8"; e.target.style.boxShadow = "0 0 0 4px rgba(129,140,248,0.15)"; }}
              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
            />
          </div>

          
          {/* Nhóm sản phẩm */}
          <div style={{ position: "relative" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <i className="bi bi-box-seam" style={{ color: "#ec4899" }}/> Nhóm sản phẩm trọng tâm
            </label>
            <div 
              style={{ minHeight: 50, border: productOpen ? "2px solid #818cf8" : "2px solid #e2e8f0", borderRadius: 12, padding: "8px 12px", background: "rgba(255,255,255,0.8)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", transition: "all 0.2s", boxShadow: productOpen ? "0 0 0 4px rgba(129,140,248,0.15)" : "inset 0 2px 4px rgba(0,0,0,0.02)" }}
            >
              {form.products.map(p => (
                <span key={p} style={{ background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)", color: "#3730a3", fontSize: 13, fontWeight: 600, padding: "4px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(99,102,241,0.1)" }}>
                  {p} <i className="bi bi-x-circle-fill" style={{ cursor: "pointer", opacity: 0.5 }} onClick={() => setForm({...form, products: form.products.filter(x => x !== p)})} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.5"} />
                </span>
              ))}
              <input 
                value={productSearch} 
                onChange={e => setProductSearch(e.target.value)} 
                onFocus={() => setProductOpen(true)}
                onBlur={() => setTimeout(() => setProductOpen(false), 200)}
                placeholder={form.products.length === 0 ? "Tìm kiếm sản phẩm..." : ""} 
                style={{ flex: 1, minWidth: 150, border: "none", outline: "none", fontSize: 15, background: "transparent", padding: "4px 8px" }} 
              />
            </div>
            <AnimatePresence>
              {productOpen && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "white", border: "1px solid #cbd5e1", borderRadius: 12, marginTop: 8, maxHeight: 220, overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" }}>
                  {dbProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: form.products.includes(p.name) ? "#f8fafc" : "transparent", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = form.products.includes(p.name) ? "#f8fafc" : "transparent"}>
                      <input type="checkbox" checked={form.products.includes(p.name)} onChange={(e) => {
                        const newProducts = e.target.checked ? [...form.products, p.name] : form.products.filter(x => x !== p.name);
                        setForm({...form, products: newProducts});
                      }} style={{ cursor: "pointer", width: 18, height: 18, accentColor: "#6366f1" }} />
                      <span style={{ fontSize: 14, color: form.products.includes(p.name) ? "#4f46e5" : "#334155", fontWeight: form.products.includes(p.name) ? 600 : 500 }}>{p.name} <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 4, fontWeight: 400 }}>({p.count})</span></span>
                    </label>
                  ))}
                  {dbProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && <div style={{ padding: 16, fontSize: 14, color: "#9ca3af", textAlign: "center" }}>Không tìm thấy sản phẩm</div>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Phân khúc */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <i className="bi bi-pie-chart" style={{ color: "#10b981" }}/> Phân khúc mục tiêu
            </label>
            <div style={{ position: "relative" }}>
              <select 
                value={form.targetSegment} 
                onChange={e => setForm({...form, targetSegment: e.target.value})} 
                style={{ width: "100%", height: 50, padding: "0 20px", borderRadius: 12, border: "2px solid #e2e8f0", background: "rgba(255,255,255,0.8)", fontSize: 15, outline: "none", appearance: "none", transition: "all 0.2s", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)", cursor: "pointer" }}
                onFocus={e => { e.target.style.borderColor = "#818cf8"; e.target.style.boxShadow = "0 0 0 4px rgba(129,140,248,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
              >
                <option value="">Chọn phân khúc...</option>
                <option value="Bình dân">Bình dân (Dưới 5tr)</option>
                <option value="Trung cấp">Trung cấp (5-20tr)</option>
                <option value="Cao cấp">Cao cấp (20-100tr)</option>
                <option value="Hạng sang">Hạng sang (Trên 100tr)</option>
              </select>
              <i className="bi bi-chevron-down" style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
            </div>
          </div>

          
          <div style={{ position: "relative" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <i className="bi bi-broadcast" style={{ color: "#0ea5e9" }}/> Kênh phân phối / Marketing
            </label>
            <div 
              style={{ minHeight: 50, border: channelOpen ? "2px solid #818cf8" : "2px solid #e2e8f0", borderRadius: 12, padding: "8px 12px", background: "rgba(255,255,255,0.8)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", transition: "all 0.2s", boxShadow: channelOpen ? "0 0 0 4px rgba(129,140,248,0.15)" : "inset 0 2px 4px rgba(0,0,0,0.02)" }}
            >
              {form.channels.map(c => (
                <span key={c} style={{ background: "white", border: "1px solid #cbd5e1", color: "#334155", fontSize: 13, fontWeight: 600, padding: "4px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                  {c} <i className="bi bi-x-circle-fill" style={{ cursor: "pointer", color: "#94a3b8" }} onClick={() => setForm({...form, channels: form.channels.filter(x => x !== c)})} onMouseEnter={e => e.currentTarget.style.color = "#ef4444"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"} />
                </span>
              ))}
              <input 
                value={channelSearch} 
                onChange={e => setChannelSearch(e.target.value)} 
                onFocus={() => setChannelOpen(true)}
                onBlur={() => setTimeout(() => setChannelOpen(false), 200)}
                placeholder={form.channels.length === 0 ? "Tìm kênh phân phối..." : ""} 
                style={{ flex: 1, minWidth: 150, border: "none", outline: "none", fontSize: 15, background: "transparent", padding: "4px 8px" }} 
              />
            </div>
            <AnimatePresence>
              {channelOpen && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "white", border: "1px solid #cbd5e1", borderRadius: 12, marginTop: 8, maxHeight: 220, overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" }}>
                  {dbChannels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase())).map(c => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: form.channels.includes(c.name) ? "#f8fafc" : "transparent", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = form.channels.includes(c.name) ? "#f8fafc" : "transparent"}>
                      <input type="checkbox" checked={form.channels.includes(c.name)} onChange={(e) => {
                        const newChannels = e.target.checked ? [...form.channels, c.name] : form.channels.filter(x => x !== c.name);
                        setForm({...form, channels: newChannels});
                      }} style={{ cursor: "pointer", width: 18, height: 18, accentColor: "#6366f1" }} />
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className={`bi ${c.icon}`} style={{ color: form.channels.includes(c.name) ? "#4f46e5" : "#64748b", fontSize: 14 }} />
                      </div>
                      <span style={{ fontSize: 14, color: form.channels.includes(c.name) ? "#4f46e5" : "#334155", fontWeight: form.channels.includes(c.name) ? 600 : 500 }}>{c.name}</span>
                    </label>
                  ))}
                  {dbChannels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase())).length === 0 && <div style={{ padding: 16, fontSize: 14, color: "#9ca3af", textAlign: "center" }}>Không tìm thấy kênh</div>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timeline & Budget */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <i className="bi bi-calendar3" style={{ color: "#f59e0b" }}/> Thời gian dự kiến (Timeline)
            </label>
            <input 
              value={form.timeline} 
              onChange={e => setForm({...form, timeline: e.target.value})} 
              placeholder="VD: Q3/2026" 
              style={{ width: "100%", height: 50, padding: "0 20px", borderRadius: 12, border: "2px solid #e2e8f0", background: "rgba(255,255,255,0.8)", fontSize: 15, outline: "none", transition: "all 0.2s", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }} 
              onFocus={e => { e.target.style.borderColor = "#818cf8"; e.target.style.boxShadow = "0 0 0 4px rgba(129,140,248,0.15)"; }}
              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
            />
          </div>
          
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <i className="bi bi-cash-stack" style={{ color: "#22c55e" }}/> Ngân sách ước tính
            </label>
            <input 
              value={form.budget} 
              onChange={e => setForm({...form, budget: e.target.value})} 
              placeholder="VD: 500 triệu VNĐ" 
              style={{ width: "100%", height: 50, padding: "0 20px", borderRadius: 12, border: "2px solid #e2e8f0", background: "rgba(255,255,255,0.8)", fontSize: 15, outline: "none", transition: "all 0.2s", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }} 
              onFocus={e => { e.target.style.borderColor = "#818cf8"; e.target.style.boxShadow = "0 0 0 4px rgba(129,140,248,0.15)"; }}
              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
            />
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ marginTop: 24, padding: "16px 20px", background: "#fef2f2", color: "#b91c1c", borderRadius: 12, fontSize: 14, display: "flex", alignItems: "center", gap: 12, border: "1px solid #fecaca" }}>
            <i className="bi bi-exclamation-octagon-fill" style={{ fontSize: 20 }} /> 
            <div>
              <strong>Phát hiện lỗi:</strong> {error}
            </div>
          </motion.div>
        )}

        <div style={{ marginTop: 40, display: "flex", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{ 
              height: 56, 
              padding: "0 40px", 
              borderRadius: 28, 
              background: loading ? "#cbd5e1" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", 
              color: "white", 
              border: "none", 
              fontWeight: 800, 
              fontSize: 16, 
              cursor: loading ? "wait" : "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: 12, 
              boxShadow: loading ? "none" : "0 10px 25px -5px rgba(99,102,241,0.5), 0 8px 10px -6px rgba(99,102,241,0.5)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: loading ? "scale(0.98)" : "scale(1)"
            }}
            onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; }}
            onMouseLeave={e => { if(!loading) e.currentTarget.style.transform = "translateY(0) scale(1)"; }}
          >
            {loading ? (
              <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang xử lý dữ liệu ({Math.round(progress)}%)...</>
            ) : (
              <><i className="bi bi-stars" style={{ fontSize: 20 }} /> Phân tích & Lập chiến lược</>
            )}
          </button>
        </div>
        
        {loading && (
          <div style={{ height: 6, background: "#e2e8f0", borderRadius: 6, marginTop: 32, overflow: "hidden", position: "relative", zIndex: 1 }}>
            <motion.div
              style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </motion.div>
  );
}
