"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

// ── Types ──────────────────────────────────────────────────────────────────────
type KpiTrend = { val: string; up: boolean };

// ── Mock Data ──────────────────────────────────────────────────────────────────
const CHANNEL_COLORS: Record<string, string> = {
  "Facebook Ads": "#1877f2",
  "Youtube Ads": "#ff0000",
  "Instagram": "#e1306c",
  "Tiktok": "#000000",
};

// Leads theo ngày (30 ngày gần nhất, 4 kênh) — static data to avoid SSR hydration mismatch
const LEAD_DAYS = [
  { date: "3/3",  facebook: 18, youtube: 10, instagram: 6,  tiktok: 3 },
  { date: "4/3",  facebook: 21, youtube: 8,  instagram: 9,  tiktok: 2 },
  { date: "5/3",  facebook: 15, youtube: 13, instagram: 5,  tiktok: 4 },
  { date: "6/3",  facebook: 24, youtube: 11, instagram: 11, tiktok: 1 },
  { date: "7/3",  facebook: 19, youtube: 9,  instagram: 7,  tiktok: 3 },
  { date: "8/3",  facebook: 22, youtube: 14, instagram: 8,  tiktok: 5 },
  { date: "9/3",  facebook: 17, youtube: 10, instagram: 12, tiktok: 2 },
  { date: "10/3", facebook: 26, youtube: 12, instagram: 6,  tiktok: 4 },
  { date: "11/3", facebook: 20, youtube: 7,  instagram: 10, tiktok: 1 },
  { date: "12/3", facebook: 14, youtube: 15, instagram: 4,  tiktok: 3 },
  { date: "13/3", facebook: 23, youtube: 11, instagram: 9,  tiktok: 5 },
  { date: "14/3", facebook: 18, youtube: 9,  instagram: 13, tiktok: 2 },
  { date: "15/3", facebook: 25, youtube: 13, instagram: 7,  tiktok: 4 },
  { date: "16/3", facebook: 16, youtube: 8,  instagram: 5,  tiktok: 1 },
  { date: "17/3", facebook: 21, youtube: 16, instagram: 11, tiktok: 3 },
  { date: "18/3", facebook: 19, youtube: 10, instagram: 8,  tiktok: 5 },
  { date: "19/3", facebook: 27, youtube: 14, instagram: 6,  tiktok: 2 },
  { date: "20/3", facebook: 22, youtube: 9,  instagram: 12, tiktok: 4 },
  { date: "21/3", facebook: 15, youtube: 11, instagram: 9,  tiktok: 1 },
  { date: "22/3", facebook: 20, youtube: 13, instagram: 5,  tiktok: 3 },
  { date: "23/3", facebook: 24, youtube: 8,  instagram: 10, tiktok: 5 },
  { date: "24/3", facebook: 18, youtube: 15, instagram: 7,  tiktok: 2 },
  { date: "25/3", facebook: 23, youtube: 10, instagram: 13, tiktok: 4 },
  { date: "26/3", facebook: 17, youtube: 12, instagram: 6,  tiktok: 1 },
  { date: "27/3", facebook: 26, youtube: 9,  instagram: 11, tiktok: 3 },
  { date: "28/3", facebook: 21, youtube: 14, instagram: 8,  tiktok: 5 },
  { date: "29/3", facebook: 19, youtube: 11, instagram: 4,  tiktok: 2 },
  { date: "30/3", facebook: 25, youtube: 8,  instagram: 12, tiktok: 4 },
  { date: "31/3", facebook: 22, youtube: 16, instagram: 9,  tiktok: 1 },
  { date: "1/4",  facebook: 28, youtube: 13, instagram: 7,  tiktok: 3 },
];

const CAMPAIGNS = [
  { id: 1, name: "Ra mắt sản phẩm Q2", channel: "Facebook Ads", status: "running", leads: 145, budget: 30_000_000, spent: 12_000_000, cvr: 12.3, color: "#1877f2" },
  { id: 2, name: "Email Remarketing", channel: "Youtube Ads", status: "running", leads: 87, budget: 8_000_000, spent: 3_200_000, cvr: 22.1, color: "#ff0000" },
  { id: 3, name: "Instagram Q2", channel: "Instagram", status: "planned", leads: 0, budget: 20_000_000, spent: 0, cvr: 0, color: "#e1306c" },
  { id: 4, name: "Tiktok tháng 4", channel: "Tiktok", status: "running", leads: 34, budget: 5_000_000, spent: 2_100_000, cvr: 18.5, color: "#000000" },
  { id: 5, name: "Influencer mùa hè", channel: "Facebook Ads", status: "paused", leads: 62, budget: 15_000_000, spent: 5_500_000, cvr: 8.7, color: "#1877f2" },
];

const RECENT_LEADS = [
  { id: 1, name: "Nguyễn Văn Hùng", source: "Facebook Ads", stage: "Tiếp cận", product: "Sen tắm XYZ", value: 12_500_000, time: "5 phút trước" },
  { id: 2, name: "Trần Thị Mai", source: "Youtube Ads", stage: "Quan tâm", product: "Bộ vòi bếp ABC", value: 8_200_000, time: "22 phút trước" },
  { id: 3, name: "Lê Minh Tuấn", source: "Instagram", stage: "Demo", product: "Lavabo cao cấp", value: 45_000_000, time: "1 giờ trước" },
  { id: 4, name: "Phạm Lan Anh", source: "Tiktok", stage: "Báo giá", product: "Combo phòng tắm", value: 120_000_000, time: "2 giờ trước" },
  { id: 5, name: "Hoàng Đức Anh", source: "Facebook Ads", stage: "Tiếp cận", product: "Vòi sen cao cấp", value: 9_800_000, time: "3 giờ trước" },
];

const CHANNEL_STATS = [
  { key: "facebook", label: "Facebook Ads", icon: "bi-facebook", color: "#1877f2", leads: 312, cvr: 14.2, cpl: 85_000, connected: true },
  { key: "youtube", label: "Youtube Ads", icon: "bi-youtube", color: "#ff0000", leads: 198, cvr: 19.8, cpl: 62_000, connected: true },
  { key: "instagram", label: "Instagram", icon: "bi-instagram", color: "#e1306c", leads: 87, cvr: 11.3, cpl: 145_000, connected: false },
  { key: "tiktok", label: "Tiktok", icon: "bi-tiktok", color: "#000000", leads: 54, cvr: 28.9, cpl: 42_000, connected: true },
];

const MONTHLY_TARGET = { leads: 500, budget: 80_000_000, campaigns: 5 };
const CURRENT = { leads: 266, budgetSpent: 22_800_000, activeCampaigns: 3 };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  running: { label: "Đang chạy", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  planned: { label: "Kế hoạch", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  paused: { label: "Tạm dừng", color: "#000000", bg: "rgba(245,158,11,0.1)" },
  completed: { label: "Hoàn thành", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

// ── Mini SVG Line Chart ────────────────────────────────────────────────────────
function LineChart({ data }: {
  data: { date: string; facebook: number; youtube: number; instagram: number; tiktok: number }[];
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: typeof data[0] } | null>(null);
  const W = 780, H = 250, PAD = { l: 24, r: 0, t: 16, b: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const keys = ["facebook", "youtube", "instagram", "tiktok"] as const;
  const allVals = data.flatMap(d => keys.map(k => d[k]));
  const maxVal = Math.max(...allVals);
  const minVal = 0;

  const xOf = (i: number) => PAD.l + (i / (data.length - 1)) * innerW;
  const yOf = (v: number) => PAD.t + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH;

  const path = (key: typeof keys[number]) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(d[key]).toFixed(1)}`).join(" ");

  // Show only every 5th label
  const labels = data.filter((_, i) => i % 5 === 0 || i === data.length - 1);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = PAD.t + innerH * (1 - f);
          return (
            <g key={f}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4 4" />
              <text x={PAD.l - 4} y={y + 3} textAnchor="end" fill="var(--muted-foreground)" fontSize={9} opacity={0.6}>
                {Math.round(maxVal * f)}
              </text>
            </g>
          );
        })}

        {/* Lines + Areas */}
        {keys.map(k => {
          const col = CHANNEL_COLORS[k === "youtube" ? "Youtube Ads" : k === "facebook" ? "Facebook Ads" : k === "instagram" ? "Instagram" : "Tiktok"];
          const areaPath = `${path(k)} L ${xOf(data.length - 1)} ${PAD.t + innerH} L ${xOf(0)} ${PAD.t + innerH} Z`;
          return (
            <g key={k}>
              <path d={areaPath} fill={col} fillOpacity={0.06} />
              <path d={path(k)} fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {/* X Labels */}
        {labels.map((d, i) => {
          const origIdx = data.indexOf(d);
          return (
            <text key={i} x={xOf(origIdx)} y={H - 6} textAnchor="middle" fill="var(--muted-foreground)" fontSize={9} opacity={0.6}>
              {d.date}
            </text>
          );
        })}

        {/* Hover overlay */}
        {data.map((d, i) => (
          <rect key={i} x={xOf(i) - 10} y={PAD.t} width={20} height={innerH + PAD.b}
            fill="transparent" style={{ cursor: "crosshair" }}
            onMouseEnter={e => setTooltip({ x: xOf(i), y: PAD.t, day: d })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* Tooltip vertical line */}
        {tooltip && (
          <line x1={tooltip.x} x2={tooltip.x} y1={PAD.t} y2={PAD.t + innerH}
            stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        )}
      </svg>

      {/* Tooltip box */}
      {tooltip && (() => {
        const d = tooltip.day;
        const total = d.facebook + d.youtube + d.instagram + d.tiktok;
        return (
          <div style={{
            position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", pointerEvents: "none", zIndex: 10, minWidth: 160,
          }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>{d.date}/2026</p>
            {(["facebook", "youtube", "instagram", "tiktok"] as const).map(k => {
              const col = CHANNEL_COLORS[k === "youtube" ? "Youtube Ads" : k === "facebook" ? "Facebook Ads" : k === "instagram" ? "Instagram" : "Tiktok"];
              const labels: Record<string, string> = { facebook: "Facebook Ads", youtube: "Youtube Ads", instagram: "Instagram", tiktok: "Tiktok" };
              return (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 3, borderRadius: 99, background: col }} />
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{labels[k]}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{d[k]} leads</span>
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 5, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Tổng</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--foreground)" }}>{total}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

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
function ChannelCard({ ch, totalLeads }: { ch: typeof CHANNEL_STATS[0], totalLeads: number }) {
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
  const [chartPeriod, setChartPeriod] = useState<7 | 14 | 30>(30);
  const [activeChannels, setActiveChannels] = useState<Set<string>>(
    new Set(["facebook", "youtube", "instagram", "tiktok"])
  );
  
  const [dynCampaigns, setDynCampaigns] = useState(CAMPAIGNS);

  useEffect(() => {
    fetch("/api/facebook/campaigns")
      .then((r) => r.json())
      .then((d) => {
        if (!d.campaigns || d.campaigns.length === 0) return;

        const realFbCampaigns = d.campaigns.map((c: any) => {
          const days = c.insights?.data || [];
          const spend = days.reduce((a: number, x: any) => a + parseFloat(x.spend || "0"), 0);
          const leads = days.reduce((a: number, x: any) => {
            const la = x.actions?.find((A: any) => A.action_type === "lead");
            return a + (la ? parseInt(la.value) : 0);
          }, 0);

          const daily = days.reduce((acc: any, day: any) => {
            const [y, m, d_part] = day.date_start.split("-");
            const label = `${parseInt(d_part)}/${parseInt(m)}`;
            const v = day.actions?.find((a: any) => a.action_type === "lead")?.value || 0;
            acc[label] = (acc[label] || 0) + parseInt(v);
            return acc;
          }, {});

          return {
            id: `real_fb_${c.id}`,
            name: c.name.length > 25 ? c.name.substring(0, 25) + "..." : c.name,
            channel: "Facebook Ads",
            status: c.status === "ACTIVE" ? "running" : c.status === "PAUSED" ? "paused" : "completed",
            leads,
            budget: parseFloat(c.daily_budget || "0") * 30 || 20000000,
            spent: spend,
            cvr: spend > 0 ? Number(((leads / (spend / 100000)) * 100).toFixed(1)) : 0,
            color: "#1877f2",
            dailyLeads: daily,
          };
        });

        setDynCampaigns([...realFbCampaigns, ...CAMPAIGNS.filter((c) => c.channel !== "Facebook Ads")]);
      })
      .catch(() => {});
  }, []);

  // ── Derived Data ──────────────────────────────────────────────────────────────
  const dynChannels = CHANNEL_STATS.map((ch) => {
    const channelCaps = dynCampaigns.filter((c) => c.channel === ch.label);
    const leads = channelCaps.reduce((s, c) => s + c.leads, 0);
    const spent = channelCaps.reduce((s, c) => s + c.spent, 0);
    return {
      ...ch,
      leads,
      cpl: leads > 0 ? Math.round(spent / leads) : ch.cpl,
    };
  });

  const chartData = LEAD_DAYS.map((day) => {
    const fbLeads = dynCampaigns
      .filter((c) => c.channel === "Facebook Ads")
      .reduce((s, c) => s + ((c as any).dailyLeads?.[day.date] || 0), 0);

    const getScale = (chLabel: string, mockKey: string) => {
      const actualTotal = dynCampaigns.filter((c) => c.channel === chLabel).reduce((s, c) => s + c.leads, 0);
      const mockTotal = LEAD_DAYS.reduce((s, d) => s + (d as any)[mockKey], 0);
      return mockTotal > 0 ? actualTotal / mockTotal : 0;
    };

    const ytScale = getScale("Youtube Ads", "youtube");
    const igScale = getScale("Instagram", "instagram");
    const tkScale = getScale("Tiktok", "tiktok");

    // If we have real Facebook data, use it. Otherwise, fallback to a small portion of the mock data 
    // to keep it looking consistent while waiting for real API data.
    const hasRealFB = dynCampaigns.some(c => c.channel === "Facebook Ads" && (c as any).dailyLeads);

    return {
      date: day.date,
      facebook: hasRealFB ? fbLeads : Math.round(day.facebook * getScale("Facebook Ads", "facebook")),
      youtube: Math.round(day.youtube * ytScale),
      instagram: Math.round(day.instagram * igScale),
      tiktok: Math.round(day.tiktok * tkScale),
    };
  }).slice(-chartPeriod);
  const totalLeads = dynChannels.reduce((s, c) => s + c.leads, 0);
  const totalBudget = dynCampaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = dynCampaigns.reduce((s, c) => s + c.spent, 0);
  const avgCvr = dynCampaigns.length > 0 ? (dynCampaigns.reduce((s, c) => s + (c.cvr || 0), 0) / dynCampaigns.length).toFixed(1) : "0.0";

  const toggleChannel = (key: string) => {
    setActiveChannels(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  // Filtered chart data (zero out hidden channels)
  const filteredData = chartData.map(d => ({
    ...d,
    facebook: activeChannels.has("facebook") ? d.facebook : 0,
    youtube: activeChannels.has("youtube") ? d.youtube : 0,
    instagram: activeChannels.has("instagram") ? d.instagram : 0,
    tiktok: activeChannels.has("tiktok") ? d.tiktok : 0,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Marketing"
        description="Chiến dịch, thương hiệu và phát triển thị trường"
        color="rose"
        icon="bi-megaphone"
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── KPI Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <KpiCard
            label="Leads tháng này" icon="bi-person-plus" color="#ec4899"
            value={`${totalLeads}`} sub={`Mục tiêu: ${MONTHLY_TARGET.leads} leads`}
            trend={{ val: "+28%", up: true }}
            progress={{ cur: totalLeads, max: MONTHLY_TARGET.leads }}
          />
          <KpiCard
            label="Ngân sách đã dùng" icon="bi-wallet2" color="#8b5cf6"
            value={`${(totalSpent / 1e6).toFixed(1)}M ₫`} sub={`Tổng: ${(totalBudget / 1e6).toFixed(0)}M ₫`}
            trend={{ val: "+12%", up: true }}
            progress={{ cur: totalSpent, max: totalBudget }}
          />
          <KpiCard
            label="Tỷ lệ chuyển đổi" icon="bi-arrow-through-heart" color="#3b82f6"
            value={`${avgCvr}%`} sub="Trung bình các chiến dịch"
            trend={{ val: "+3.2%", up: true }}
          />
          <KpiCard
            label="Chi phí / Lead (CPL)" icon="bi-receipt" color="#000000"
            value={`${totalLeads > 0 ? (totalSpent / totalLeads / 1000).toFixed(0) : 0}K ₫`} sub="Average CPL"
            trend={{ val: "-8%", up: false }}
          />
        </div>

        {/* ── Chart + Campaign Status ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14, alignItems: "flex-start" }}>

          {/* Line Chart */}
          <div className="app-card" style={{ padding: "18px 20px", borderRadius: 14, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
                  <i className="bi bi-graph-up me-2" style={{ color: "#ec4899" }} />
                  Leads theo ngày — theo kênh
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                  {chartPeriod} ngày gần nhất · Hover để xem chi tiết
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {/* Period selector */}
                <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3 }}>
                  {([7, 14, 30] as const).map(p => (
                    <button key={p} onClick={() => setChartPeriod(p)}
                      style={{ padding: "3px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: chartPeriod === p ? "var(--card)" : "transparent", color: chartPeriod === p ? "var(--foreground)" : "var(--muted-foreground)" }}>
                      {p}N
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Channel toggle legend */}
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

            <div style={{ margin: "20px -20px -18px" }}>
              <LineChart data={filteredData} />
            </div>
          </div>

          {/* Campaign Status */}
          <div className="app-card" style={{ padding: "18px 18px", borderRadius: 14 }}>
            <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
              <i className="bi bi-lightning-charge me-2" style={{ color: "#000000" }} />Chiến dịch
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dynCampaigns.map(c => {
                const s = STATUS_CFG[c.status];
                const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
                return (
                  <div key={c.id} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)" }}>
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
            <div className="app-card" style={{ borderRadius: 14, overflow: "hidden" }}>
              {RECENT_LEADS.map((lead, i) => {
                const col = CHANNEL_COLORS[lead.source] ?? "#6b7280";
                const stageColors: Record<string, string> = {
                  "Tiếp cận": "#6b7280", "Quan tâm": "#3b82f6", "Demo": "#8b5cf6", "Báo giá": "#000000", "Chốt": "#10b981"
                };
                return (
                  <div key={lead.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i < RECENT_LEADS.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.1s", cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--muted)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${col}, color-mix(in srgb, ${col} 60%, #000))`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{lead.name.charAt(0)}</span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: `color-mix(in srgb, ${stageColors[lead.stage] ?? "#6b7280"} 12%, transparent)`, color: stageColors[lead.stage] ?? "#6b7280", flexShrink: 0 }}>{lead.stage}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lead.product}
                        <span style={{ marginLeft: 6, padding: "0px 5px", borderRadius: 4, background: `color-mix(in srgb, ${col} 12%, transparent)`, color: col, fontSize: 10 }}>{lead.source}</span>
                      </p>
                    </div>

                    {/* Value + time */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#10b981" }}>{(lead.value / 1e6).toFixed(1)}M ₫</p>
                      <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>{lead.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
