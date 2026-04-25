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

export function ReportSummary({ viewMode }: { viewMode: "month" | "year" }) {
  const targetLabel = viewMode === "month" ? "Mục tiêu tháng" : "Mục tiêu năm";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 pb-4 pt-2">
      {/* KPI Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <KpiCard
            label="Chi phí"
            value="112,348,659"
            icon="bi-wallet2"
            color="#6366f1"
            progress={{ cur: 112348659, max: 150000000 }}
            progressLabel={targetLabel}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <KpiCard
            label="Doanh số"
            value="2,062,393,479"
            icon="bi-cash-stack"
            color="#10b981"
            progress={{ cur: 2062393479, max: 2500000000 }}
            progressLabel={targetLabel}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <KpiCard
            label="Số đơn hàng"
            value="167"
            extras={[{ label: "Tỷ lệ chuyển đổi", value: "54.87%" }]}
            icon="bi-cart-check"
            color="#f59e0b"
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <KpiCard
            label="CPL Thực tế"
            value="460.4K"
            extras={[
              { label: "CPS thực tế", value: "672.7K" },
              { label: "CPM thực tế", value: "30.3K" }
            ]}
            icon="bi-person-badge"
            color="#f43f5e"
          />
        </div>
      </div>

      {/* Platform Cards */}
      <div className="row g-3">
        <div className="col-12 col-md-6 col-lg-3">
          <PlatformCard
            name="Facebook Ads"
            icon="bi-facebook"
            color="#1877F2"
            campaigns={3}
            stats={[
              { label: "Lượt hiển thị", value: "2,209,778" },
              { label: "Lượt tiếp cận", value: "1,307,921" },
              { label: "CPM thực tế", value: "50.2K" },
              { label: "Số mess", value: "242" },
              { label: "Ngân sách", value: "46.7M" },
            ]}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <PlatformCard
            name="TikTok Ads"
            icon="bi-tiktok"
            color="#000000"
            campaigns={1}
            stats={[
              { label: "Lượt hiển thị", value: "1,946,897" },
              { label: "Lượt tiếp cận", value: "1,717,294" },
              { label: "CPM thực tế", value: "4.1K" },
              { label: "Số mess", value: "0" },
              { label: "Ngân sách", value: "7.9M" },
            ]}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <PlatformCard
            name="Google SEO"
            icon="bi-google"
            color="#4285F4"
            campaigns={2}
            stats={[
              { label: "Lượt hiển thị", value: "24,492" },
              { label: "Lượt tiếp cận", value: "19,499" },
              { label: "CPM thực tế", value: "23.6K" },
              { label: "Số mess", value: "1" },
              { label: "Ngân sách", value: "8.4M" },
            ]}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <PlatformCard
            name="Youtube"
            icon="bi-youtube"
            color="#FF0000"
            campaigns={1}
            stats={[
              { label: "Lượt hiển thị", value: "271,634" },
              { label: "Lượt tiếp cận", value: "259,575" },
              { label: "CPM thực tế", value: "14.3K" },
              { label: "Số mess", value: "1" },
              { label: "Ngân sách", value: "3.8M" },
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
}
