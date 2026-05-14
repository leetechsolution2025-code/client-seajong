"use client";
import React from "react";
import { KpiCard } from "@/components/marketing/KpiCard";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface PlatformCardProps {
  name: string;
  icon: string;
  color: string;
  stats: { label: string; value: string }[];
  campaigns: number;
}

function PlatformCard({ name, icon, color, stats, campaigns }: PlatformCardProps) {
  return (
    <motion.div variants={item} className="app-card h-100 overflow-hidden" style={{ borderRadius: 16 }}>
      <div style={{ background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 70%, black) 100%)`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "between", color: "white" }}>
        <div className="d-flex align-items-center gap-2">
          <i className={`bi ${icon}`} style={{ fontSize: 20 }} />
          <span className="fw-bold" style={{ fontSize: 15, letterSpacing: "0.02em" }}>{name}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          {campaigns} chiến dịch
        </div>
      </div>
      <div className="p-3">
        <div className="d-flex flex-column gap-2">
          {stats.map((s, i) => (
            <div key={i} className="d-flex justify-content-between align-items-center" style={{ paddingBottom: i === stats.length - 1 ? 0 : 8, borderBottom: i === stats.length - 1 ? "none" : "1px solid var(--border)", opacity: 0.9 }}>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function ReportSummary({ campaigns, viewMode }: { campaigns: any[], viewMode: "month" | "year" }) {
  const targetLabel = viewMode === "month" ? "Mục tiêu tháng" : "Mục tiêu năm";

  const allInsights = campaigns.flatMap(c => c.insights?.data || []);
  const totalLeads = allInsights.reduce((s, i) => s + (parseInt(i.leads) || 0), 0);
  const totalSpent = allInsights.reduce((s, i) => s + (parseFloat(i.spend) || 0), 0);
  const totalImpressions = allInsights.reduce((s, i) => s + (parseInt(i.impressions) || 0), 0);
  const totalReach = allInsights.reduce((s, i) => s + (parseInt(i.reach) || 0), 0);

  const getPlatformData = (platformKey: string, displayName: string) => {
    const chInsights = allInsights.filter(i => i.platform.toLowerCase().includes(platformKey));
    const leads = chInsights.reduce((s, i) => s + (parseInt(i.leads) || 0), 0);
    const spent = chInsights.reduce((s, i) => s + (parseFloat(i.spend) || 0), 0);
    const imps = chInsights.reduce((s, i) => s + (parseInt(i.impressions) || 0), 0);
    const reach = chInsights.reduce((s, i) => s + (parseInt(i.reach) || 0), 0);
    
    // Đếm số chiến dịch: Kiểm tra xem chiến dịch đó có chứa bất kỳ insight nào của platform này không
    const campCount = campaigns.filter(c => {
      const hasPlatformInsight = c.insights?.data?.some((ins: any) => ins.platform.toLowerCase().includes(platformKey));
      const hasPlatformField = c.platform && c.platform.toLowerCase().includes(platformKey);
      const hasPlatformInName = c.name && c.name.toLowerCase().includes(platformKey);
      return hasPlatformInsight || hasPlatformField || hasPlatformInName;
    }).length;
    
    return {
      leads,
      spent,
      imps,
      reach,
      campCount,
      cpm: imps > 0 ? (spent / (imps / 1000)).toLocaleString('vi-VN') + "đ" : "0đ"
    };
  };

  const fb = getPlatformData("facebook", "Facebook Ads");
  const tt = getPlatformData("tiktok", "TikTok Ads");
  const yt = getPlatformData("youtube", "Youtube");
  const ig = getPlatformData("instagram", "Instagram");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 pb-4 pt-2">
      {/* KPI Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <KpiCard
            label="Tổng Chi phí"
            value={totalSpent.toLocaleString('vi-VN') + " đ"}
            icon="bi-wallet2"
            color="#6366f1"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <KpiCard
            label="Tổng Leads"
            value={totalLeads.toLocaleString()}
            icon="bi-person-plus"
            color="#10b981"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <KpiCard
            label="Tổng Hiển thị"
            value={totalImpressions.toLocaleString()}
            icon="bi-eye"
            color="#f59e0b"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <KpiCard
            label="CPA Trung bình"
            value={totalLeads > 0 ? Math.round(totalSpent / totalLeads).toLocaleString('vi-VN') + " đ" : "0đ"}
            icon="bi-person-badge"
            color="#f43f5e"
          />
        </div>
      </div>

      {/* Platform Cards */}
      <div className="row g-3">
        <div className="col-12 col-md-6 col-lg-3">
          <PlatformCard
            name="Facebook Ads" icon="bi-facebook" color="#1877F2"
            campaigns={fb.campCount}
            stats={[
              { label: "Lượt hiển thị", value: fb.imps.toLocaleString() },
              { label: "Lượt tiếp cận", value: fb.reach.toLocaleString() },
              { label: "Số Leads", value: fb.leads.toLocaleString() },
              { label: "CPM thực tế", value: fb.cpm },
              { label: "Chi phí", value: fb.spent.toLocaleString('vi-VN') + "đ" },
            ]}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <PlatformCard
            name="TikTok Ads" icon="bi-tiktok" color="#000000"
            campaigns={tt.campCount}
            stats={[
              { label: "Lượt hiển thị", value: tt.imps.toLocaleString() },
              { label: "Lượt tiếp cận", value: tt.reach.toLocaleString() },
              { label: "Số Leads", value: tt.leads.toLocaleString() },
              { label: "CPM thực tế", value: tt.cpm },
              { label: "Chi phí", value: tt.spent.toLocaleString('vi-VN') + "đ" },
            ]}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <PlatformCard
            name="Instagram" icon="bi-instagram" color="#E4405F"
            campaigns={ig.campCount}
            stats={[
              { label: "Lượt hiển thị", value: ig.imps.toLocaleString() },
              { label: "Lượt tiếp cận", value: ig.reach.toLocaleString() },
              { label: "Số Leads", value: ig.leads.toLocaleString() },
              { label: "CPM thực tế", value: ig.cpm },
              { label: "Chi phí", value: ig.spent.toLocaleString('vi-VN') + "đ" },
            ]}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <PlatformCard
            name="Youtube" icon="bi-youtube" color="#FF0000"
            campaigns={yt.campCount}
            stats={[
              { label: "Lượt hiển thị", value: yt.imps.toLocaleString() },
              { label: "Lượt tiếp cận", value: yt.reach.toLocaleString() },
              { label: "Số Leads", value: yt.leads.toLocaleString() },
              { label: "CPM thực tế", value: yt.cpm },
              { label: "Chi phí", value: yt.spent.toLocaleString('vi-VN') + "đ" },
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
}
