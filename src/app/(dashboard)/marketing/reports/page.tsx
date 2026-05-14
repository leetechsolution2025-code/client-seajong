"use client";
import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportSummary } from "@/components/marketing/reports/ReportSummary";
import { AnalyticsCharts } from "@/components/marketing/reports/AnalyticsCharts";
import { CampaignTable } from "@/components/marketing/reports/CampaignTable";
import { motion } from "framer-motion";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useSession } from "next-auth/react";

export default function ReportsPage() {
  const { data: session } = useSession();
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [filter, setFilter] = useState({ month: "05", year: "2026" });
  const [fbCampaigns, setFbCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Print states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportType, setReportType] = useState<"overall" | "monthly">("overall");
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [planTargets, setPlanTargets] = useState<any>(null);

  // Fetch plan targets (ngân sách & doanh thu mục tiêu)
  React.useEffect(() => {
    fetch(`/api/marketing/plan/targets?year=${filter.year}`)
      .then(r => r.json())
      .then(data => { if (data?.monthlyBudget) setPlanTargets(data); })
      .catch(console.error);
  }, [filter.year]);

  React.useEffect(() => {
    fetch("/api/marketing/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.campaigns) setFbCampaigns(d.campaigns);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/company")
      .then(res => res.json())
      .then(data => { if (data && data.name) setCompanyInfo(data); })
      .catch(console.error);
  }, []);

  // Lọc dữ liệu cho Summary và Table
  const filteredCampaignsForSummary = React.useMemo(() => {
    return fbCampaigns.map(c => {
      const insights = c.insights?.data || c.insights || [];
      const filteredInsights = Array.isArray(insights) ? insights.filter((i: any) => {
        if (!i.date_start) return false;
        if (viewMode === "year") {
          return i.date_start.startsWith(filter.year);
        } else {
          return i.date_start.startsWith(`${filter.year}-${filter.month}`);
        }
      }) : [];
      return { ...c, insights: { data: filteredInsights } };
    });
  }, [fbCampaigns, viewMode, filter]);

  // Lọc dữ liệu cho Chart (Luôn lấy nguyên năm để vẽ biểu đồ T1-T12)
  const filteredCampaignsForCharts = React.useMemo(() => {
    return fbCampaigns.map(c => {
      const insights = c.insights?.data || c.insights || [];
      const filteredInsights = Array.isArray(insights) ? insights.filter((i: any) => {
        if (!i.date_start) return false;
        return i.date_start.startsWith(filter.year);
      }) : [];
      return { ...c, insights: { data: filteredInsights } };
    });
  }, [fbCampaigns, filter.year]);

  // Aggregated data for PRINT PREVIEW ONLY
  const { totalSpent, totalLeads, totalImpressions, totalClicks, avgCPL, fbData, ggData, ttData, totalCount } = React.useMemo(() => {
    const defaultStats = { cost: 0, leads: 0, impressions: 0, clicks: 0, cpl: 0, count: 0 };
    if (!filteredCampaignsForSummary.length) return { totalSpent: 0, totalLeads: 0, totalImpressions: 0, totalClicks: 0, avgCPL: 0, fbData: defaultStats, ggData: defaultStats, ttData: defaultStats, totalCount: 0 };

    const calculateStats = (campaigns: any[]) => {
      let cost = 0, leads = 0, impressions = 0, clicks = 0;
      campaigns.forEach(c => {
        const insights = c.insights?.data || [];
        insights.forEach((i: any) => {
          const s = parseFloat(String(i.spend || "0").replace(/[^0-9.]/g, '')) || 0;
          const l = parseInt(String(i.leads || "0")) || 0;
          const im = parseInt(String(i.impressions || "0")) || 0;
          const cl = parseInt(String(i.clicks || "0")) || 0;
          cost += s;
          leads += l;
          impressions += im;
          clicks += cl;
        });
      });
      return { cost, leads, impressions, clicks, cpl: leads > 0 ? Math.round(cost / leads) : 0 };
    };

    const overall = calculateStats(filteredCampaignsForSummary);

    const getPlatform = (keys: string[], isDefaultFallback = false) => {
      const filtered = fbCampaigns.filter(c => {
        const p = (c.platform || "").toLowerCase();
        const n = (c.name || "").toLowerCase();
        const insightsPlatform = Array.isArray(c.insights?.data) && c.insights.data.length > 0 
          ? (c.insights.data[0].platform || "").toLowerCase() 
          : "";

        const isMatch = keys.some(k => p.includes(k.toLowerCase()) || n.includes(k.toLowerCase()) || insightsPlatform.includes(k.toLowerCase()));
        
        // If this is the default fallback (Facebook), include campaigns that don't match ANY known platform
        if (!isMatch && isDefaultFallback) {
          const isGoogle = ["google", "gg", "youtube", "yt", "search"].some(k => p.includes(k) || n.includes(k) || insightsPlatform.includes(k));
          const isTiktok = ["tiktok", "tt"].some(k => p.includes(k) || n.includes(k) || insightsPlatform.includes(k));
          if (!isGoogle && !isTiktok) return true; // If it's not Google or TikTok, dump it in Facebook so data isn't lost
        }

        return isMatch;
      });
      const stats = calculateStats(filtered);
      return { ...stats, count: filtered.length };
    };

    return {
      totalSpent: overall.cost,
      totalLeads: overall.leads,
      totalImpressions: overall.impressions,
      totalClicks: overall.clicks,
      avgCPL: overall.cpl,
      fbData: getPlatform(["facebook", "fb", "instagram", "ig", "meta"], true), // true for fallback
      ggData: getPlatform(["google", "gg", "youtube", "yt", "search"]),
      ttData: getPlatform(["tiktok", "tt"]),
      totalCount: filteredCampaignsForSummary.length
    };
  }, [filteredCampaignsForSummary]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)", overflowY: "auto", fontFamily: "var(--font-roboto-condensed)" }}>
      {/* Load Montserrat font for Print */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&display=swap');
        .pdf-cover-page { font-family: 'Montserrat', sans-serif !important; }
      `}</style>
      
      <PageHeader
        title="Báo cáo tổng hợp Marketing"
        description={viewMode === "month" ? "Theo dõi hiệu suất chiến dịch và ngân sách theo tháng" : "Tổng hợp hiệu suất marketing toàn diện theo năm"}
        color="rose"
        icon="bi-bar-chart-line-fill"
      />

      {/* Filter Bar */}
      <div className="px-4 pt-3 pb-2 d-flex flex-wrap gap-3 align-items-start">
        {/* ... (giữ nguyên thanh filter) ... */}
        <div className="d-flex flex-column gap-2">
          <div className="d-flex bg-card p-1 rounded-3 shadow-sm border border-border" style={{ height: 38 }}>
            <button 
              className={`btn btn-sm px-3 border-0 ${viewMode === "month" ? "btn-primary shadow-sm" : "text-muted"}`}
              onClick={() => setViewMode("month")}
              style={{ borderRadius: 6, fontWeight: 700, fontSize: 13, height: "100%" }}
            >
              Tháng
            </button>
            <button 
              className={`btn btn-sm px-3 border-0 ${viewMode === "year" ? "btn-primary shadow-sm" : "text-muted"}`}
              onClick={() => setViewMode("year")}
              style={{ borderRadius: 6, fontWeight: 700, fontSize: 13, height: "100%" }}
            >
              Năm
            </button>
          </div>
          
          <div className="d-flex align-items-center gap-2 ps-1" style={{ opacity: 0.8 }}>
            <div className="rounded-circle" style={{ width: 6, height: 6, background: loading ? "#f59e0b" : "#10b981", boxShadow: loading ? "0 0 6px #f59e0b" : "0 0 6px #10b981" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>
              {loading ? "Đang đồng bộ..." : `Dữ liệu thời gian thực (${totalCount} CD)`}
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 bg-card px-3 py-1 rounded-3 shadow-sm border border-border" style={{ height: 38 }}>
          <i className="bi bi-calendar3 text-primary" style={{ fontSize: 14 }} />
          {viewMode === "month" && (
            <select className="form-select form-select-sm border-0 bg-transparent fw-bold text-foreground" style={{ width: "auto", minWidth: 100, fontSize: 14, boxShadow: "none" }} value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })}>
              <option value="01">Tháng 1</option><option value="02">Tháng 2</option><option value="03">Tháng 3</option><option value="04">Tháng 4</option><option value="05">Tháng 5</option>
            </select>
          )}
          <select className="form-select form-select-sm border-0 bg-transparent fw-bold text-foreground" style={{ width: "auto", minWidth: 70, fontSize: 14, boxShadow: "none" }} value={filter.year} onChange={(e) => setFilter({ ...filter, year: e.target.value })}>
            <option value="2026">2026</option>
          </select>
        </div>

        <div className="ms-auto">
          <button 
            className="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm" 
            style={{ height: 38, borderRadius: 8, fontSize: 13, fontWeight: 700 }}
            onClick={() => setShowPrintModal(true)}
          >
            <i className="bi bi-file-earmark-pdf-fill" /> Tạo báo cáo
          </button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <ReportSummary campaigns={filteredCampaignsForSummary} viewMode={viewMode} />
        <AnalyticsCharts campaigns={filteredCampaignsForCharts} filterYear={filter.year} />
        <CampaignTable campaigns={filteredCampaignsForSummary} />
      </motion.div>

      {/* Print Preview Modal */}
      {showPrintModal && (
        <PrintPreviewModal
          title="In Báo cáo Marketing Tổng hợp"
          subtitle={`Kỳ báo cáo: ${viewMode === "month" ? `Tháng ${filter.month}/${filter.year}` : `Năm ${filter.year}`}`}
          onClose={() => setShowPrintModal(false)}
          sidebar={
            <div className="d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-bold text-uppercase" style={{ fontSize: "10px", color: "#64748b", letterSpacing: "1px" }}>Tùy chọn báo cáo</label>
                <div className="d-flex flex-column gap-2">
                  <button 
                    className={`btn btn-sm text-start py-2 px-3 d-flex align-items-center gap-2 ${reportType === "overall" ? "btn-primary shadow-sm" : "btn-light border text-muted"}`}
                    onClick={() => setReportType("overall")}
                    style={{ borderRadius: "8px", fontWeight: 700, fontSize: "12px" }}
                  >
                    <i className="bi bi-grid-fill" /> Tổng quát doanh nghiệp
                  </button>
                  <button 
                    className={`btn btn-sm text-start py-2 px-3 d-flex align-items-center gap-2 ${reportType === "monthly" ? "btn-primary shadow-sm" : "btn-light border text-muted"}`}
                    onClick={() => setReportType("monthly")}
                    style={{ borderRadius: "8px", fontWeight: 700, fontSize: "12px" }}
                  >
                    <i className="bi bi-calendar3" /> Diễn biến theo tháng
                  </button>
                </div>
              </div>
            </div>
          }
          actions={
            <button className="btn btn-primary btn-sm fw-bold px-4" onClick={() => printDocumentById("full-marketing-report")}>
              <i className="bi bi-printer-fill me-2" /> In toàn bộ báo cáo
            </button>
          }
          document={
            <div id="full-marketing-report">
              {/* ── TRANG BÌA (COVER PAGE) ── */}
              <div className="pdf-cover-page" style={{ minHeight: "297mm", display: "flex", flexDirection: "column", background: "white", pageBreakAfter: "always" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "76px 95px 0" }}>
                  {companyInfo?.logoUrl && <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "40px" }} />}
                  <div>
                    <h1 style={{ margin: 0, fontSize: "14px", fontWeight: 900, textTransform: "uppercase", color: "#003087", letterSpacing: "1px" }}>{companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}</h1>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>{companyInfo?.slogan || "Đồng hành cùng doanh nghiệp bằng các giải pháp số hóa tối ưu"}</p>
                  </div>
                </div>

                <div style={{ display: "flex", height: "480px", position: "relative", marginTop: "40px" }}>
                  <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
                    <div style={{ flex: 1, background: "#003087", padding: "40px 0 40px 95px", color: "white", display: "flex", alignItems: "center" }}>
                      <h2 style={{ fontSize: "36px", fontWeight: 800, margin: 0, textTransform: "uppercase" }}>BÁO CÁO HIỆU QUẢ<br />MARKETING</h2>
                    </div>
                    <div style={{ flex: 1.2, background: "#000000", padding: "60px 0 40px 95px", color: "white", clipPath: "polygon(0 0, 100% 25%, 100% 100%, 0 100%)", marginTop: "-80px", zIndex: 2, display: "flex", alignItems: "center" }}>
                      <h1 style={{ fontSize: "38px", fontWeight: 900, margin: 0, color: "#C9A84C" }}>
                        {reportType === "overall" ? (
                          <>Tổng Hợp &<br />Đánh Giá Hiệu Suất<br />Năm {filter.year}</>
                        ) : (
                          <>Tổng Hợp &<br />Đánh Giá Hiệu Suất<br />Tháng {filter.month}/{filter.year}</>
                        )}
                      </h1>
                    </div>
                  </div>
                  <div style={{ width: "45%", position: "relative" }}>
                    <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Analytics" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", gap: "40px", marginTop: "40px", padding: "0 95px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "28px" }}>
                    {[
                      { icon: "bi-graph-up-arrow", title: "Phát triển kinh doanh", desc: "Theo dõi dòng tiền chi tiêu và tỷ lệ chuyển đổi Leads thực tế." },
                      { icon: "bi-lightbulb", title: "Chiến lược Marketing", desc: "Tối ưu hóa nội dung và kênh tiếp cận khách hàng trọng tâm." },
                      { icon: "bi-gear", title: "Quản trị vận hành", desc: "Kiểm soát ngân sách đa kênh và phân bổ nguồn lực tự động." }
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
                      {reportType === "overall" 
                        ? `Báo cáo tổng hợp số liệu lũy kế từ ngày 01/01/${filter.year} đến thời điểm hiện tại, đánh giá hiệu quả đầu tư và tăng trưởng dài hạn.`
                        : `Báo cáo chi tiết hoạt động Marketing trong tháng ${filter.month}/${filter.year}, tập trung vào hiệu suất chiến dịch và tối ưu hóa ngân sách ngắn hạn.`
                      }
                    </p>
                    <h3 style={{ fontSize: "14px", color: "#000", fontWeight: 700, margin: "24px 0 8px" }}>THÔNG TIN BÁO CÁO</h3>
                    <ul style={{ paddingLeft: "16px", margin: 0, fontSize: "11px", color: "#475569", lineHeight: 1.8 }}>
                      <li><strong>Người xuất báo cáo:</strong> {session?.user?.name || "Bộ phận Marketing"}</li>
                      <li><strong>Kỳ báo cáo:</strong> {reportType === "overall" ? `Năm ${filter.year} (Lũy kế)` : `Tháng ${filter.month}/${filter.year}`}</li>
                      <li><strong>Thời điểm xuất:</strong> {new Date().toLocaleString('vi-VN')}</li>
                    </ul>
                  </div>
                </div>

                <div style={{ display: "flex", marginTop: "auto", background: "#003087", color: "white", padding: "24px 95px 36px", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "40%", background: "#000", clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }} />
                  <div style={{ width: "35%", position: "relative", zIndex: 2 }}>
                    <div style={{ fontSize: "10px", color: "#C9A84C", textTransform: "uppercase", fontWeight: 700 }}>Hỗ trợ kỹ thuật</div>
                    <div style={{ fontSize: "18px", fontWeight: 700 }}>{companyInfo?.phone || "024 3333 8888"}</div>
                  </div>
                  <div style={{ width: "30%", position: "relative", zIndex: 2 }}>
                    <div style={{ fontSize: "10px" }}>Email: {companyInfo?.email || "marketing@seajong.vn"}</div>
                    <div style={{ fontSize: "10px", marginTop: "4px" }}>Web: {companyInfo?.website || "www.seajong.vn"}</div>
                  </div>
                  <div style={{ width: "35%", position: "relative", zIndex: 2, paddingLeft: "24px", fontSize: "10px" }}>
                    {companyInfo?.address || "Hà Nội, Việt Nam"}
                  </div>
                </div>
              </div>

              {/* ── TRANG 2: TỔNG QUAN HIỆU SUẤT (CONTENT PAGE) ── */}
              <div className="pdf-content-page" style={{ minHeight: "297mm", padding: "60px 80px", background: "white" }}>
                <div style={{ borderBottom: "2px solid #003087", paddingBottom: "10px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <h2 style={{ margin: 0, color: "#003087", fontWeight: 900, textTransform: "uppercase", fontSize: "20px" }}>Nội Dung Chi Tiết Báo Cáo</h2>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Trang 02</span>
                </div>

                {/* 1. TÓM TẮT TỔNG QUAN */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#003087", textTransform: "uppercase", borderLeft: "4px solid #003087", paddingLeft: "15px", marginBottom: "20px" }}>
                    1. Tóm tắt tổng quan (Executive Summary)
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
                    <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <strong style={{ display: "block", fontSize: "13px", color: "#003087", marginBottom: "8px" }}>● Mục tiêu trọng tâm:</strong>
                      <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>
                        {reportType === "overall" 
                          ? "Tập trung đẩy mạnh hiện diện thương hiệu trên đa nền tảng, tối ưu hóa chi phí chuyển đổi (CPL) và xây dựng tệp khách hàng tiềm năng bền vững cho cả năm 2026."
                          : `Đẩy mạnh doanh số thông qua các chiến dịch quảng cáo tập trung vào tệp khách hàng mục tiêu trong tháng ${filter.month}, tăng tỷ lệ phản hồi trực tiếp qua tin nhắn.`
                        }
                      </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                      <div style={{ background: "linear-gradient(135deg, #003087, #0B2447)", padding: "20px", borderRadius: "12px", color: "white" }}>
                        <strong style={{ display: "block", fontSize: "11px", opacity: 0.8, marginBottom: "8px" }}>KẾT QUẢ NỔI BẬT #1</strong>
                        <div style={{ fontSize: "22px", fontWeight: 900, color: "#C9A84C" }}>{totalImpressions.toLocaleString()}</div>
                        <div style={{ fontSize: "10px", opacity: 0.7 }}>Lượt tiếp cận & hiển thị đa kênh</div>
                      </div>
                      <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: "20px", borderRadius: "12px", color: "white" }}>
                        <strong style={{ display: "block", fontSize: "11px", opacity: 0.8, marginBottom: "8px" }}>KẾT QUẢ NỔI BẬT #2</strong>
                        <div style={{ fontSize: "22px", fontWeight: 900 }}>{totalLeads.toLocaleString()} Leads</div>
                        <div style={{ fontSize: "10px", opacity: 0.7 }}>Khách hàng quan tâm thực tế</div>
                      </div>
                    </div>

                    <div style={{ background: "#fdf2f2", padding: "20px", borderRadius: "12px", border: "1px solid #fee2e2" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <strong style={{ fontSize: "13px", color: "#dc2626" }}>● Đánh giá chung:</strong>
                        <span style={{ fontSize: "14px", fontWeight: 900, color: "#dc2626" }}>92.5%</span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "#fee2e2", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: "92.5%", height: "100%", background: "#dc2626" }}></div>
                      </div>
                      <p style={{ margin: "10px 0 0", fontSize: "11px", color: "#b91c1c", fontStyle: "italic" }}>
                        Hoàn thành tốt các chỉ tiêu về tiếp cận và số lượng khách hàng. Cần tập trung tối ưu thêm tỷ lệ chuyển đổi cuối cùng để đạt 100% kế hoạch.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. PHÂN TÍCH CHỈ SỐ HIỆU SUẤT CHÍNH */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#003087", textTransform: "uppercase", borderLeft: "4px solid #003087", paddingLeft: "15px", marginBottom: "20px" }}>
                    2. Phân tích chỉ số hiệu suất chính (Key Metrics & KPIs)
                  </h3>
                  <div style={{ overflow: "hidden", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "11px", fontWeight: 800, color: "#64748b", borderBottom: "2px solid #003087" }}>CHỈ SỐ (METRICS)</th>
                          <th style={{ padding: "12px 15px", textAlign: "center", fontSize: "11px", fontWeight: 800, color: "#64748b", borderBottom: "2px solid #003087" }}>MỤC TIÊU</th>
                          <th style={{ padding: "12px 15px", textAlign: "center", fontSize: "11px", fontWeight: 800, color: "#64748b", borderBottom: "2px solid #003087" }}>THỰC TẾ</th>
                          <th style={{ padding: "12px 15px", textAlign: "center", fontSize: "11px", fontWeight: 800, color: "#64748b", borderBottom: "2px solid #003087" }}>% HOÀN THÀNH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Số lượng Lead (Khách hàng tiềm năng)", target: null as number | null, actual: totalLeads, unit: "" },
                          { label: "Chi phí trên mỗi Lead (CPL)",          target: null as number | null, actual: avgCPL,      unit: " ₫", inverse: true },
                          { label: "Tỷ lệ chuyển đổi (CR)",                target: null as number | null, actual: Number(totalClicks > 0 ? (totalLeads / totalClicks * 100).toFixed(1) : 0), unit: "%" },
                          { label: "Lượt truy cập Website/Fanpage",        target: null as number | null, actual: totalImpressions, unit: "" },
                          { label: "Ngân sách Marketing kế hoạch",         target: (planTargets?.totalBudget || null) as number | null, actual: totalSpent, unit: " ₫" },
                          ...(planTargets?.totalRevenue ? [{ label: "Doanh thu Marketing mục tiêu", target: planTargets.totalRevenue as number | null, actual: 0, unit: " ₫", inverse: false }] : []),
                        ].map((row, idx) => {
                          const percent = row.target && row.target > 0
                            ? (row.inverse
                                ? (row.actual > 0 ? Math.round((row.target / row.actual) * 100) : 0)
                                : Math.round((row.actual / row.target) * 100))
                            : null;
                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "12px 15px", fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>{row.label}</td>
                              <td style={{ padding: "12px 15px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>{row.target ? row.target.toLocaleString() + row.unit : "-"}</td>
                              <td style={{ padding: "12px 15px", textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#003087" }}>{row.actual.toLocaleString()}{row.unit}</td>
                              <td style={{ padding: "12px 15px", textAlign: "center" }}>
                                {percent !== null ? (
                                  <span style={{ 
                                    padding: "4px 10px", 
                                    borderRadius: "20px", 
                                    fontSize: "11px", 
                                    fontWeight: 800,
                                    background: percent >= 90 ? "#ecfdf5" : percent >= 70 ? "#fffbeb" : "#fef2f2",
                                    color: percent >= 90 ? "#059669" : percent >= 70 ? "#d97706" : "#dc2626"
                                  }}>
                                    {percent}%
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. CHI TIẾT HOẠT ĐỘNG THEO KÊNH */}
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#003087", textTransform: "uppercase", borderLeft: "4px solid #003087", paddingLeft: "15px", marginBottom: "25px" }}>
                    3. Chi tiết hoạt động theo kênh (Channel Performance)
                  </h3>

                  {[
                    { 
                      id: "fb", name: "Facebook Ads", data: fbData, color: "#1877F2", 
                      icon: "bi-facebook", desc: "Kênh tiếp cận chủ lực, tập trung vào các chiến dịch Messengers và Lead Forms." 
                    },
                    { 
                      id: "gg", name: "Google Ads", data: ggData, color: "#EA4335", 
                      icon: "bi-google", desc: "Kênh thu hút khách hàng có nhu cầu nóng thông qua từ khóa tìm kiếm (Search Ads)." 
                    },
                    { 
                      id: "tt", name: "TikTok Business", data: ttData, color: "#000000", 
                      icon: "bi-tiktok", desc: "Kênh viral nội dung sáng tạo, giúp tăng nhận diện và thu hút tệp khách hàng trẻ." 
                    }
                  ].map((p, pIdx) => (
                    <div key={p.id} style={{ marginBottom: "30px", background: "#f8fafc", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "36px", height: "36px", background: p.color, color: "white", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                            <i className={`bi ${p.icon}`} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1e293b" }}>3.{pIdx + 1}. {p.name}</h4>
                            <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>{p.desc}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8" }}>CHI TRONG KỲ</div>
                          <div style={{ fontSize: "16px", fontWeight: 900, color: p.color }}>{p.data.cost.toLocaleString('vi-VN')} ₫</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                        <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", marginBottom: "5px" }}>LƯỢT HIỂN THỊ</div>
                          <div style={{ fontSize: "14px", fontWeight: 800 }}>{p.data.impressions.toLocaleString()}</div>
                        </div>
                        <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", marginBottom: "5px" }}>TỔNG LEADS</div>
                          <div style={{ fontSize: "14px", fontWeight: 800, color: "#10b981" }}>{p.data.leads.toLocaleString()}</div>
                        </div>
                        <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", marginBottom: "5px" }}>CPL THỰC TẾ</div>
                          <div style={{ fontSize: "14px", fontWeight: 800, color: "#2563eb" }}>{p.data.cpl.toLocaleString('vi-VN')} ₫</div>
                        </div>
                      </div>

                      <div style={{ fontSize: "11px", lineHeight: "1.6", color: "#475569" }}>
                        <strong style={{ color: p.color }}>● Đánh giá hiệu quả:</strong> {p.data.leads > 0 
                          ? `Kênh đang vận hành ổn định với hiệu suất ${Math.round((p.data.leads / totalLeads) * 100)}% tổng kết quả. Tỷ lệ CTR duy trì ở mức khá, nội dung quảng cáo đang có sức hút tốt.`
                          : "Kênh đang trong giai đoạn test nội dung hoặc phân bổ ngân sách thấp. Cần rà soát lại Target để cải thiện kết quả."
                        }
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "auto", paddingTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>EOS MARKETING REPORT SYSTEM © 2026</div>
                  <div style={{ textAlign: "center", width: "180px" }}>
                    <div style={{ height: "60px", marginBottom: "10px", borderBottom: "1px solid #e2e8f0" }}></div>
                    <div style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>Nguyễn Hoàng Long</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>Trưởng phòng Marketing</div>
                  </div>
                </div>
              </div>

              {/* ── TRANG 3: DANH SÁCH CHIẾN DỊCH CHI TIẾT (APPENDIX) ── */}
              <div className="pdf-content-page" style={{ minHeight: "297mm", padding: "60px 80px", background: "white" }}>
                <div style={{ borderBottom: "2px solid #003087", paddingBottom: "10px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <h2 style={{ margin: 0, color: "#003087", fontWeight: 900, textTransform: "uppercase", fontSize: "20px" }}>Phụ lục: Danh sách chiến dịch</h2>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Trang 03</span>
                </div>

                <div style={{ overflow: "hidden", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#003087", color: "white" }}>
                        <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "10px", fontWeight: 700 }}>TÊN CHIẾN DỊCH</th>
                        <th style={{ padding: "12px 15px", textAlign: "center", fontSize: "10px", fontWeight: 700 }}>TRẠNG THÁI</th>
                        <th style={{ padding: "12px 15px", textAlign: "right", fontSize: "10px", fontWeight: 700 }}>CHI PHÍ</th>
                        <th style={{ padding: "12px 15px", textAlign: "center", fontSize: "10px", fontWeight: 700 }}>LEADS</th>
                        <th style={{ padding: "12px 15px", textAlign: "right", fontSize: "10px", fontWeight: 700 }}>CPL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fbCampaigns.slice(0, 15).map((c, idx) => {
                        const spend = (c.insights?.data || []).reduce((s: number, i: any) => s + (parseFloat(i.spend) || 0), 0);
                        const leads = (c.insights?.data || []).reduce((s: number, i: any) => s + (parseInt(i.leads) || 0), 0);
                        const cpl = leads > 0 ? Math.round(spend / leads) : 0;
                        return (
                          <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 1 ? "#f8fafc" : "white" }}>
                            <td style={{ padding: "10px 15px", fontSize: "11px", fontWeight: 600 }}>{c.name}</td>
                            <td style={{ padding: "10px 15px", textAlign: "center" }}>
                              <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: c.status === "ACTIVE" ? "#ecfdf5" : "#f1f5f9", color: c.status === "ACTIVE" ? "#059669" : "#64748b" }}>
                                {c.status}
                              </span>
                            </td>
                            <td style={{ padding: "10px 15px", textAlign: "right", fontSize: "11px" }}>{spend.toLocaleString('vi-VN')} ₫</td>
                            <td style={{ padding: "10px 15px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#10b981" }}>{leads}</td>
                            <td style={{ padding: "10px 15px", textAlign: "right", fontSize: "11px" }}>{cpl.toLocaleString('vi-VN')} ₫</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          }
        />
      )}

      {/* Floating Action Button for Refresh (Optional) */}
      <button 
        className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
        style={{ position: "fixed", bottom: 30, right: 30, width: 50, height: 50, zIndex: 100 }}
        onClick={() => window.location.reload()}
      >
        <i className="bi bi-arrow-clockwise fs-4" />
      </button>
    </div>
  );
}
