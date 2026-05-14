"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────────
type KpiTrend = { val: string; up: boolean };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  running: { label: "Đang chạy", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  planned: { label: "Kế hoạch", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  paused: { label: "Tạm dừng", color: "#000000", bg: "rgba(245,158,11,0.1)" },
  completed: { label: "Hoàn thành", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const CHANNEL_CONFIG = [
  { key: "facebook", label: "Facebook Ads", icon: "bi-facebook", color: "#1877f2" },
  { key: "youtube", label: "Youtube Ads", icon: "bi-youtube", color: "#ff0000" },
  { key: "instagram", label: "Instagram", icon: "bi-instagram", color: "#e1306c" },
  { key: "tiktok", label: "Tiktok", icon: "bi-tiktok", color: "#000000" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);


// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color, trend, progress }: {
  label: string; value: string; sub?: string; icon: string; color: string;
  trend?: KpiTrend; progress?: { cur: number; max: number };
}) {
  const pct = progress ? Math.round((progress.cur / progress.max) * 100) : null;
  return (
    <div className="app-card" style={{ padding: "16px 18px", borderRadius: 14, position: "relative", overflow: "hidden" }}>
      {/* color accent */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: color, borderRadius: "14px 0 0 14px" }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", opacity: 0.65 }}>{label}</p>
            <p style={{ margin: "5px 0 2px", fontSize: 22, fontWeight: 900, color: "var(--foreground)", lineHeight: 1.1 }}>{value}</p>
            {sub && <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{sub}</p>}
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`bi ${icon}`} style={{ fontSize: 17, color }} />
          </div>
        </div>
        {trend && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
            <i className={`bi ${trend.up ? "bi-arrow-up-right" : "bi-arrow-down-right"}`} style={{ fontSize: 11, color: trend.up ? "#10b981" : "#ef4444" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: trend.up ? "#10b981" : "#ef4444" }}>{trend.val}</span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>vs tháng trước</span>
          </div>
        )}
        {pct !== null && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Mục tiêu tháng</span>
              <span style={{ fontSize: 10, fontWeight: 700, color }}>{pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, transition: "width 0.5s" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Channel Card ──────────────────────────────────────────────────────────────
function ChannelCard({ ch, totalLeads }: { ch: any, totalLeads: number }) {
  const pct = totalLeads > 0 ? Math.round((ch.leads / totalLeads) * 100) : 0;
  return (
    <div className="app-card" style={{ padding: "14px 16px", borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `color-mix(in srgb, ${ch.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className={`bi ${ch.icon}`} style={{ fontSize: 16, color: ch.color }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{ch.label}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ch.connected ? "#10b981" : "#ef4444" }} />
              <span style={{ fontSize: 10, color: ch.connected ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                {ch.connected ? "Đã kết nối" : "Chưa kết nối"}
              </span>
            </div>
          </div>
        </div>
        <span style={{ fontSize: 18, fontWeight: 900, color: ch.color }}>{ch.leads}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
        <div style={{ background: "var(--muted)", borderRadius: 7, padding: "6px 8px" }}>
          <p style={{ margin: 0, fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>CVR</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>{ch.cvr}%</p>
        </div>
        <div style={{ background: "var(--muted)", borderRadius: 7, padding: "6px 8px" }}>
          <p style={{ margin: 0, fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>CPL</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>{(ch.cpl / 1000).toFixed(0)}K</p>
        </div>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Tỷ trọng lead</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: ch.color }}>{pct}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: ch.color, borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [chartPeriod, setChartPeriod] = useState<"7" | "14" | "30" | "custom">("30");
  const [activeMetric, setActiveMetric] = useState<"leads" | "reach" | "likes">("leads");
  const [activeChannels, setActiveChannels] = useState<Set<string>>(
    new Set(["facebook", "youtube", "instagram", "tiktok"])
  );
  const [fbCampaigns, setFbCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [planTargets, setPlanTargets] = useState<any>(null);

  useEffect(() => {
    fetch("/api/marketing/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.campaigns) setFbCampaigns(d.campaigns);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch leads thực tế từ DB
    fetch("/api/marketing/leads?limit=5")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRecentLeads(data.slice(0, 5)); })
      .catch(console.error);

    // Fetch plan targets (ngân sách & doanh thu mục tiêu)
    const currentYear = new Date().getFullYear().toString();
    fetch(`/api/marketing/plan/targets?year=${currentYear}`)
      .then(r => r.json())
      .then(data => { if (data?.monthlyBudget) setPlanTargets(data); })
      .catch(console.error);
  }, []);

  // ── Xử lý dữ liệu thực tế ──
  const allInsights = fbCampaigns.flatMap(c => c.insights?.data || []);
  
  // 1. Tổng hợp Leads, Spend
  const totalLeads = allInsights.reduce((s, i) => s + (parseInt(i.leads) || 0), 0);
  const totalSpent = allInsights.reduce((s, i) => s + (parseFloat(i.spend) || 0), 0);
  const totalBudget = fbCampaigns.reduce((s, c) => s + (parseFloat(c.budget) || 0), 0);
  const avgCpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;
  
  // 2. Tạo dữ liệu biểu đồ
  const chartData = (() => {
    const dailyMap: Record<string, any> = {};
    const dataDates = allInsights.map(i => i.date_start).sort();
    const maxDateStr = dataDates.length > 0 ? dataDates[dataDates.length - 1] : new Date().toISOString().split("T")[0];
    const [y, m, d] = maxDateStr.split("-").map(Number);
    const maxDateObj = new Date(y, m - 1, d);

    let daysToGenerate = 30;
    if (chartPeriod === "7") daysToGenerate = 7;
    else if (chartPeriod === "14") daysToGenerate = 14;
    else if (chartPeriod === "30") daysToGenerate = 30;
    else if (chartPeriod === "custom" && dataDates.length > 0) {
      const minDateStr = dataDates[0];
      const [my, mm, md] = minDateStr.split("-").map(Number);
      const minDateObj = new Date(my, mm - 1, md);
      const diffTime = Math.abs(maxDateObj.getTime() - minDateObj.getTime());
      daysToGenerate = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const dates = [];
    for (let i = daysToGenerate - 1; i >= 0; i--) {
       const dateObj = new Date(maxDateObj);
       dateObj.setDate(dateObj.getDate() - i);
       const yyyy = dateObj.getFullYear();
       const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
       const dd = String(dateObj.getDate()).padStart(2, '0');
       dates.push(`${yyyy}-${mm}-${dd}`);
    }

    dates.forEach(date => {
      // Giữ nguyên format YYYY-MM-DD để giống trang chiến dịch
      dailyMap[date] = { date: date, facebook: 0, youtube: 0, instagram: 0, tiktok: 0 };
      
      const dayInsights = allInsights.filter(i => i.date_start === date);
      dayInsights.forEach(i => {
        const platform = i.platform.toLowerCase();
        const val = parseInt(i[activeMetric] || "0");
        if (platform.includes("facebook")) dailyMap[date].facebook += val;
        else if (platform.includes("instagram")) dailyMap[date].instagram += val;
        else if (platform.includes("tiktok")) dailyMap[date].tiktok += val;
        else if (platform.includes("youtube")) dailyMap[date].youtube += val;
      });
    });
    
    return Object.values(dailyMap);
  })();

  const CHANNEL_COLORS: Record<string, string> = {
    "Facebook Ads": "#1877f2",
    "Youtube Ads": "#ff0000",
    "Instagram": "#e1306c",
    "Tiktok": "#000000",
  };

  const chartSeries = [
    { name: "Facebook Ads", data: chartData.map(d => d.facebook), color: CHANNEL_COLORS["Facebook Ads"] },
    { name: "Youtube Ads", data: chartData.map(d => d.youtube), color: CHANNEL_COLORS["Youtube Ads"] },
    { name: "Instagram", data: chartData.map(d => d.instagram), color: CHANNEL_COLORS["Instagram"] },
    { name: "Tiktok", data: chartData.map(d => d.tiktok), color: CHANNEL_COLORS["Tiktok"] }
  ].filter(s => activeChannels.has(s.name.split(" ")[0].toLowerCase()));

  const apexOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      height: 280,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, dynamicAnimation: { speed: 800 } },
      fontFamily: "inherit",
      background: "transparent",
    },
    colors: chartSeries.map(s => s.color),
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.05, stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: chartData.map(d => d.date),
      labels: {
        rotate: 0,
        style: { colors: "#64748b" },
        formatter: (val: string) => {
          if (!val || !val.includes('-')) return val;
          if (chartPeriod === "30") {
            const idx = chartData.findIndex(d => d.date === val);
            if (idx % 2 !== 0) return "";
          }
          const parts = val.split('-');
          return `${parts[2]}/${parts[1]}`;
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#64748b" } } },
    legend: { show: false },
    grid: { borderColor: "rgba(100, 116, 139, 0.1)", strokeDashArray: 4 },
    tooltip: { theme: "light" },
  };

  const dynCampaigns = fbCampaigns.map(c => {
    const cInsights = c.insights?.data || [];
    const cLeads = cInsights.reduce((s: number, i: any) => s + (parseInt(i.leads) || 0), 0);
    const cSpent = cInsights.reduce((s: number, i: any) => s + (parseFloat(i.spend) || 0), 0);
    const cClicks = cInsights.reduce((s: number, i: any) => s + (parseInt(i.clicks) || 0), 0);
    
    let cvr = 0;
    if (cClicks > 0) cvr = (cLeads / cClicks) * 100;
    else if (cLeads > 0) {
      const cReach = cInsights.reduce((s: number, i: any) => s + (parseInt(i.reach) || 0), 0);
      if (cReach > 0) cvr = (cLeads / cReach) * 100;
      else cvr = 100;
    }

    return {
      id: c.id,
      name: c.name,
      status: c.status === "ACTIVE" ? "running" : "paused",
      leads: cLeads,
      spent: cSpent,
      budget: parseFloat(c.budget) || (cSpent > 0 ? cSpent * 1.5 : 0),
      color: c.name.includes("Branding") ? "#1877f2" : "#10b981",
      cvr: cvr.toFixed(1)
    };
  }).slice(0, 5);

  const dynChannels = CHANNEL_CONFIG.map(ch => {
    const chInsights = allInsights.filter(i => i.platform.toLowerCase().includes(ch.key));
    const leads = chInsights.reduce((s, i) => s + (parseInt(i.leads) || 0), 0);
    const spent = chInsights.reduce((s, i) => s + (parseFloat(i.spend) || 0), 0);
    const clicks = chInsights.reduce((s, i) => s + (parseInt(i.clicks) || 0), 0);
    
    let cvr = 0;
    if (clicks > 0) cvr = (leads / clicks) * 100;
    else if (leads > 0) {
      const reach = chInsights.reduce((s, i) => s + (parseInt(i.reach) || 0), 0);
      if (reach > 0) cvr = (leads / reach) * 100;
      else cvr = 100;
    }

    return {
      ...ch,
      leads,
      cvr: cvr.toFixed(1),
      cpl: leads > 0 ? Math.round(spent / leads) : 0,
      connected: leads > 0 || spent > 0
    };
  });

  const totalClicks = allInsights.reduce((s, i) => s + (parseInt(i.clicks) || 0), 0);
  let globalCvr = 0;
  if (totalClicks > 0) globalCvr = (totalLeads / totalClicks) * 100;
  else if (totalLeads > 0) {
    const totalReach = allInsights.reduce((s, i) => s + (parseInt(i.reach) || 0), 0);
    if (totalReach > 0) globalCvr = (totalLeads / totalReach) * 100;
    else globalCvr = 100;
  }
  const avgCvr = globalCvr.toFixed(1);

  const toggleChannel = (key: string) => {
    setActiveChannels(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const filteredData = chartData.map(d => ({
    ...d,
    facebook: activeChannels.has("facebook") ? (d as any).facebook : 0,
    youtube: activeChannels.has("youtube") ? (d as any).youtube : 0,
    instagram: activeChannels.has("instagram") ? (d as any).instagram : 0,
    tiktok: activeChannels.has("tiktok") ? (d as any).tiktok : 0,
  }));

  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  const monthlyBudgetPlan = planTargets?.monthlyBudget?.find((b: any) => b.month === currentMonth)?.value || 0;
  const monthlyRevenuePlan = planTargets?.monthlyRevenue?.find((r: any) => r.month === currentMonth)?.total || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Marketing"
        description="Chiến dịch, thương hiệu và phát triển thị trường"
        color="rose"
        icon="bi-megaphone"
      />

      <div style={{ flex: 1, paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px', paddingTop: '8px', display: 'flex', flexDirection: 'column', minHeight: 0, background: "color-mix(in srgb, var(--muted) 40%, transparent)", gap: 18 }} className="px-4 pb-4 pt-2">
        {/* ── KPI Row (Real Data Only) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <KpiCard
            label="Tổng Leads" icon="bi-person-plus" color="#ec4899"
            value={`${totalLeads.toLocaleString()}`} 
            sub="Dữ liệu tổng hợp từ các chiến dịch"
            // Giả định mục tiêu lead tháng = (Ngân sách tháng / 100k CPL) hoặc fallback 300
            progress={monthlyBudgetPlan > 0 ? { cur: totalLeads, max: Math.round(monthlyBudgetPlan / 100000) || 300 } : undefined}
          />
          <KpiCard
            label="Ngân sách đã dùng" icon="bi-wallet2" color="#8b5cf6"
            value={`${Math.round(totalSpent).toLocaleString('vi-VN')} ₫`} 
            sub="Tổng chi phí thực tế đã sử dụng"
            progress={monthlyBudgetPlan > 0 ? { cur: totalSpent, max: monthlyBudgetPlan } : undefined}
          />
          <KpiCard
            label="Tỷ lệ chuyển đổi" icon="bi-arrow-through-heart" color="#3b82f6"
            value={`${avgCvr}%`} 
            sub="Trung bình trên mỗi lượt tiếp cận"
          />
          <KpiCard
            label="CPA Trung bình" icon="bi-receipt" color="#000000"
            value={`${totalLeads > 0 ? Math.round(totalSpent / totalLeads).toLocaleString('vi-VN') : 0} ₫`} 
            sub="Chi phí thực tế trên mỗi Lead"
          />
        </div>

        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }} className="custom-scrollbar">

            {/* ── Chart + Campaign Status ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14, alignItems: "flex-start" }}>
              {/* Line Chart */}
              <div className="bg-light border rounded-4 shadow-none" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
                      <i className="bi bi-graph-up me-2" style={{ color: "#ec4899" }} />
                      {activeMetric === "leads" ? "Leads" : activeMetric === "reach" ? "Lượt tiếp cận" : "Lượt like"} theo ngày — theo kênh
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                      Hiển thị xu hướng tìm kiếm và chuyển đổi
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  {(["facebook", "youtube", "instagram", "tiktok"] as const).map(k => {
                    const labels: Record<string, string> = { facebook: "Facebook Ads", youtube: "Youtube Ads", instagram: "Instagram", tiktok: "Tiktok" };
                    const col = CHANNEL_COLORS[labels[k]];
                    const active = activeChannels.has(k);
                    return (
                      <button key={k} onClick={() => toggleChannel(k)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, border: `1px solid ${active ? col : "var(--border)"}`, background: active ? `color-mix(in srgb, ${col} 10%, transparent)` : "transparent", cursor: "pointer", transition: "all 0.15s" }}>
                        <div style={{ width: 10, height: 3, borderRadius: 99, background: active ? col : "var(--muted-foreground)", opacity: active ? 1 : 0.4 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: active ? col : "var(--muted-foreground)", opacity: active ? 1 : 0.5 }}>{labels[k]}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ margin: "0 -10px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <div style={{ flex: 1 }}>
                    <ReactApexChart options={apexOptions} series={chartSeries} type="area" height={280} />
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px", marginTop: 2, zIndex: 10, position: "relative" }}>
                    {/* BỘ LỌC KHOẢNG THỜI GIAN (GÓC DƯỚI BÊN TRÁI) */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { value: "7", label: "7 ngày" },
                        { value: "14", label: "14 ngày" },
                        { value: "30", label: "30 ngày" },
                        { value: "custom", label: "Tùy chỉnh..." }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          disabled={opt.value === "custom"}
                          onClick={() => setChartPeriod(opt.value as any)}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 14,
                            border: chartPeriod === opt.value ? "1px solid #10b981" : "1px solid var(--border)",
                            background: chartPeriod === opt.value ? "rgba(16,185,129,0.1)" : "var(--background)",
                            color: chartPeriod === opt.value ? "#10b981" : "var(--muted-foreground)",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: opt.value === "custom" ? "not-allowed" : "pointer",
                            opacity: opt.value === "custom" ? 0.4 : 1,
                            transition: "all 0.2s"
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* BỘ LỌC LOẠI BIỂU ĐỒ (GÓC DƯỚI BÊN PHẢI) */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { value: "leads", label: "Số Leads" },
                        { value: "reach", label: "Tiếp cận" },
                        { value: "likes", label: "Số like" }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setActiveMetric(opt.value as any)}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 14,
                            border: activeMetric === opt.value ? "1px solid #3b82f6" : "1px solid var(--border)",
                            background: activeMetric === opt.value ? "rgba(59,130,246,0.1)" : "var(--background)",
                            color: activeMetric === opt.value ? "#3b82f6" : "var(--muted-foreground)",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaign Status */}
              <div className="bg-light border rounded-4 shadow-none" style={{ padding: "18px 18px" }}>
                <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
                  <i className="bi bi-lightning-charge me-2" style={{ color: "#000000" }} />Chiến dịch
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {dynCampaigns.map(c => {
                    const s = STATUS_CFG[c.status];
                    const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
                    return (
                      <div key={c.id} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <div style={{ width: 3, height: 28, borderRadius: 99, background: c.color, flexShrink: 0 }} />
                            <div>
                              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.3 }}>{c.name}</p>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: c.color, flexShrink: 0 }}>{c.leads}</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: c.color, borderRadius: 99 }} />
                        </div>
                        <p style={{ margin: "3px 0 0", fontSize: 9.5, color: "var(--muted-foreground)", textAlign: "right" }}>
                          {fmt(c.spent)} / {fmt(c.budget)} ₫
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Channels + Recent Leads ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Channel Cards */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
                    <i className="bi bi-diagram-3 me-2" style={{ color: "#3b82f6" }} />Hiệu quả theo kênh
                  </p>
                  <a href="/marketing/channels" style={{ fontSize: 11, color: "#ec4899", fontWeight: 600, textDecoration: "none" }}>Kết nối kênh →</a>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {dynChannels.map(ch => <ChannelCard key={ch.key} ch={ch} totalLeads={totalLeads} />)}
                </div>
              </div>

              {/* Recent Leads */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
                    <i className="bi bi-person-lines-fill me-2" style={{ color: "#ec4899" }} />Leads gần đây
                  </p>
                  <a href="/marketing/leads" style={{ fontSize: 11, color: "#ec4899", fontWeight: 600, textDecoration: "none" }}>Xem tất cả →</a>
                </div>
                <div className="bg-light border rounded-4 shadow-none overflow-hidden" style={{ borderRadius: 14 }}>
                  {recentLeads.length === 0 ? (
                    <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
                      <i className="bi bi-inbox" style={{ fontSize: 24, display: "block", marginBottom: 6, opacity: 0.4 }} />
                      Chưa có lead nào được ghi nhận
                    </div>
                  ) : recentLeads.map((lead, i) => {
                    const platform = (lead.campaign?.platform || "").toLowerCase();
                    const col = platform.includes("facebook") ? "#1877F2"
                      : platform.includes("tiktok")   ? "#000000"
                      : platform.includes("instagram") ? "#E4405F"
                      : platform.includes("youtube")   ? "#FF0000"
                      : "#6b7280";
                    const sourceName = lead.campaign?.platform || lead.source || "Unknown";
                    const stageColors: Record<string, string> = {
                      "new":      "#6b7280",
                      "contacted": "#3b82f6",
                      "demo":     "#8b5cf6",
                      "quoted":   "#000000",
                      "closed":   "#10b981"
                    };
                    const stageLabels: Record<string, string> = {
                      "new":       "Mới",
                      "contacted": "Tiếp cận",
                      "demo":      "Demo",
                      "quoted":    "Báo giá",
                      "closed":    "Chốt"
                    };
                    const stageLabel = stageLabels[lead.status] ?? lead.status ?? "Mới";
                    const stageColor = stageColors[lead.status] ?? "#6b7280";
                    const timeAgo = (() => {
                      const diff = Date.now() - new Date(lead.createdAt).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 60) return `${mins} phút trước`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs} giờ trước`;
                      return `${Math.floor(hrs / 24)} ngày trước`;
                    })();
                    return (
                      <div key={lead.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i < recentLeads.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.1s", cursor: "pointer" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${col}, color-mix(in srgb, ${col} 60%, #000))`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{(lead.fullName || lead.email || "?").charAt(0).toUpperCase()}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.fullName || lead.email || "Khách ẩn danh"}</p>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: `color-mix(in srgb, ${stageColor} 12%, transparent)`, color: stageColor, flexShrink: 0 }}>{stageLabel}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {lead.campaign?.name || "Chưa rõ chiến dịch"}
                            <span style={{ marginLeft: 6, padding: "0px 5px", borderRadius: 4, background: `color-mix(in srgb, ${col} 12%, transparent)`, color: col, fontSize: 10 }}>{sourceName}</span>
                          </p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>{timeAgo}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
