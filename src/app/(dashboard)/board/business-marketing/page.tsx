"use client";

import React, { useState } from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";

// ── Mock data cho Kinh doanh & Marketing ──────────────────────────────────────
const MARKETING_KPI_CARDS = [
  {
    label: "Chi phí Marketing",
    value: "84.5 triệu",
    icon: "bi-megaphone",
    accent: "#6366f1",
    subtitle: "-5.4% so với tháng trước",
  },
  {
    label: "Số lượng Leads mới",
    value: "1,248 Leads",
    icon: "bi-people-fill",
    accent: "#3b82f6",
    subtitle: "+18.2% tăng trưởng",
  },
  {
    label: "Chi phí mỗi Lead (CPL)",
    value: "67,700 đ",
    icon: "bi-tags-fill",
    accent: "#f59e0b",
    subtitle: "Tối ưu 12% chi phí",
  },
  {
    label: "Doanh thu Marketing mang lại",
    value: "1.45 tỷ",
    icon: "bi-graph-up-arrow",
    accent: "#10b981",
    subtitle: "ROI đạt 17.1x",
  },
];

const LEAD_CONVERSION_SERIES = [
  {
    name: "Lead tích luỹ (trăm người)",
    data: [8.5, 9.8, 12.4, null, null, null, null, null, null, null, null, null],
    color: "#3b82f6",
  },
  {
    name: "Doanh thu (trăm triệu đồng)",
    data: [10.2, 11.5, 14.5, null, null, null, null, null, null, null, null, null],
    color: "#10b981",
  },
];

const CAMPAIGNS = [
  { name: "Quảng cáo Facebook Ads - Quý II", channel: "Facebook", spend: 35000000, revenue: 580000000, leads: 520, roi: "16.5x", status: "Active" },
  { name: "Google Search - Thiết bị phòng tắm", channel: "Google", spend: 24000000, revenue: 410000000, leads: 310, roi: "17.0x", status: "Active" },
  { name: "KOLs Review - Thương hiệu Seajong", channel: "Youtube/TikTok", spend: 20000000, revenue: 320000000, leads: 280, roi: "16.0x", status: "Paused" },
  { name: "Email Marketing Chăm sóc KH cũ", channel: "Email", spend: 5500000, revenue: 140000000, leads: 138, roi: "25.4x", status: "Active" },
];

function ConversionFunnel() {
  const funnelSteps = [
    { name: "Tiếp cận (Impressions)", count: "128,400", pct: "100%", color: "#6366f1" },
    { name: "Truy cập Website/Landing Page", count: "18,650", pct: "14.5%", color: "#3b82f6" },
    { name: "Lead Đăng ký mới", count: "1,248", pct: "6.7%", color: "#06b6d4" },
    { name: "Cơ hội chất lượng (SQL)", count: "342", pct: "27.4%", color: "#f59e0b" },
    { name: "Chốt hợp đồng thành công", count: "98", pct: "28.6%", color: "#10b981" },
  ];

  return (
    <div className="d-flex flex-column gap-3">
      {funnelSteps.map((step, idx) => (
        <div key={idx} style={{ position: "relative" }}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{step.name}</span>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: 13, fontWeight: 800, color: step.color }}>{step.count}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: `${step.color}15`, color: step.color, fontWeight: 700 }}>
                {step.pct}
              </span>
            </div>
          </div>
          <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: step.pct === "100%" ? "100%" : step.pct,
              background: step.color,
              borderRadius: 99,
              transition: "width 1s ease"
            }} />
          </div>
          {idx < funnelSteps.length - 1 && (
            <div className="d-flex justify-content-center my-1" style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
              <i className="bi bi-arrow-down-short" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function BoardBusinessMarketingPage() {
  const [selectedStatus, setSelectedStatus] = useState<"All" | "Active" | "Paused">("All");

  const filteredCampaigns = CAMPAIGNS.filter(c => selectedStatus === "All" || c.status === selectedStatus);

  const formatNumber = (num: number) => {
    return num.toLocaleString("vi-VN") + " đ";
  };

  return (
    <SplitLayoutPage
      title="Kinh doanh và Marketing"
      description="Ban Giám đốc · Giám sát hiệu quả marketing đa kênh, phễu chuyển đổi và chỉ số tăng trưởng kinh doanh"
      icon="bi-megaphone-fill"
      color="indigo"
      leftCols={5}
      leftTopContent={
        <div className="row g-3">
          {MARKETING_KPI_CARDS.map((kpi) => (
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
      leftContent={
        <div>
          <SectionTitle title="Phễu chuyển đổi Marketing & Bán hàng" className="mb-4" />
          <ConversionFunnel />
        </div>
      }
      rightContent={
        <div className="p-4 d-flex flex-column gap-4" style={{ height: "100%", overflowY: "auto" }}>
          <div>
            <SectionTitle title="Diễn biến Leads & Doanh thu kinh doanh (Q1 - 2026)" className="mb-3" />
            <YearAreaChart series={LEAD_CONVERSION_SERIES} height={250} unit="" />
          </div>

          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <SectionTitle title="Hiệu quả chiến dịch Marketing" />
              <div className="btn-group border rounded" style={{ padding: 2, background: "var(--muted)" }}>
                {(["All", "Active", "Paused"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    style={{
                      border: "none",
                      background: selectedStatus === status ? "var(--card)" : "transparent",
                      color: selectedStatus === status ? "var(--foreground)" : "var(--muted-foreground)",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    {status === "All" ? "Tất cả" : status === "Active" ? "Đang chạy" : "Tạm dừng"}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-responsive border rounded overflow-hidden">
              <table className="table table-hover table-borderless align-middle mb-0" style={{ fontSize: 13 }}>
                <thead style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                  <tr>
                    <th className="py-3 px-3">Tên chiến dịch</th>
                    <th className="py-3 text-end">Ngân sách</th>
                    <th className="py-3 text-end">Leads</th>
                    <th className="py-3 text-end">Doanh số</th>
                    <th className="py-3 text-center">ROI</th>
                    <th className="py-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((camp, idx) => (
                    <tr key={idx} className="border-bottom" style={{ borderColor: "var(--border)" }}>
                      <td className="py-3 px-3 fw-semibold">
                        {camp.name}
                        <div style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)" }}>{camp.channel}</div>
                      </td>
                      <td className="py-3 text-end fw-medium">{formatNumber(camp.spend)}</td>
                      <td className="py-3 text-end fw-bold text-primary">{camp.leads}</td>
                      <td className="py-3 text-end fw-semibold text-success">{formatNumber(camp.revenue)}</td>
                      <td className="py-3 text-center fw-bold text-violet">{camp.roi}</td>
                      <td className="py-3 text-center">
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: camp.status === "Active" ? "rgba(16,185,129,0.12)" : "rgba(148,163,184,0.15)",
                          color: camp.status === "Active" ? "#10b981" : "var(--muted-foreground)"
                        }}>
                          {camp.status === "Active" ? "Đang chạy" : "Tạm dừng"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    />
  );
}
