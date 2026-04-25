"use client";
import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportSummary } from "@/components/marketing/reports/ReportSummary";
import { AnalyticsCharts } from "@/components/marketing/reports/AnalyticsCharts";
import { CampaignTable } from "@/components/marketing/reports/CampaignTable";
import { motion } from "framer-motion";

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [filter, setFilter] = useState({ month: "04", year: "2026" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)", overflowY: "auto", fontFamily: "var(--font-roboto-condensed)" }}>
      <PageHeader
        title="Báo cáo tổng hợp Marketing"
        description={viewMode === "month" ? "Theo dõi hiệu suất chiến dịch và ngân sách theo tháng" : "Tổng hợp hiệu suất marketing toàn diện theo năm"}
        color="rose"
        icon="bi-bar-chart-line-fill"
      />

      {/* Filter Bar */}
      {/* Filter Bar */}
      <div className="px-4 pt-3 pb-2 d-flex flex-wrap gap-3 align-items-start">
        {/* View Mode Toggle + Live Data */}
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
          
          {/* Live Data Status */}
          <div className="d-flex align-items-center gap-2 ps-1" style={{ opacity: 0.8 }}>
            <div className="rounded-circle" style={{ width: 6, height: 6, background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>Dữ liệu thời gian thực</span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>• Cập nhật: 09:21:45</span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 bg-card px-3 py-1 rounded-3 shadow-sm border border-border" style={{ height: 38 }}>
          <i className="bi bi-calendar3 text-primary" style={{ fontSize: 14 }} />
          {viewMode === "month" && (
            <>
              <select 
                className="form-select form-select-sm border-0 bg-transparent fw-bold text-foreground" 
                style={{ width: "auto", minWidth: 100, fontSize: 14, cursor: "pointer", boxShadow: "none", padding: "0 28px 0 0" }}
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: e.target.value })}
              >
                <option value="01">Tháng 1</option>
                <option value="02">Tháng 2</option>
                <option value="03">Tháng 3</option>
                <option value="04">Tháng 4</option>
              </select>
              <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
            </>
          )}
          <select 
            className="form-select form-select-sm border-0 bg-transparent fw-bold text-foreground" 
            style={{ width: "auto", minWidth: 70, fontSize: 14, cursor: "pointer", boxShadow: "none", padding: "0 28px 0 0" }}
            value={filter.year}
            onChange={(e) => setFilter({ ...filter, year: e.target.value })}
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>

        <div className="d-flex align-items-center gap-2 bg-card px-3 py-1 rounded-3 shadow-sm border border-border" style={{ height: 38 }}>
          <i className="bi bi-funnel text-primary" style={{ fontSize: 14 }} />
          <select 
            className="form-select form-select-sm border-0 bg-transparent fw-bold text-foreground" 
            style={{ width: "auto", minWidth: 130, fontSize: 14, cursor: "pointer", boxShadow: "none", padding: "0 28px 0 0" }}
          >
            <option>Tất cả kênh</option>
            <option>Facebook Ads</option>
            <option>TikTok Ads</option>
            <option>Google SEO</option>
          </select>
        </div>

        {/* Campaign Type Filter + Create Report Button */}
        <div className="ms-auto d-flex flex-column gap-2 align-items-end">
          <div className="d-flex align-items-center gap-2 bg-card px-3 py-1 rounded-3 shadow-sm border border-border" style={{ height: 38 }}>
            <i className="bi bi-tags text-primary" style={{ fontSize: 14 }} />
            <select 
              className="form-select form-select-sm border-0 bg-transparent fw-bold text-foreground" 
              style={{ width: "auto", minWidth: 150, fontSize: 14, cursor: "pointer", boxShadow: "none", padding: "0 28px 0 0" }}
            >
              <option>Loại chiến dịch</option>
              <option>Performance (Chuyển đổi)</option>
              <option>Branding (Thương hiệu)</option>
              <option>Awareness (Nhận diện)</option>
            </select>
          </div>
          
          <button className="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm" style={{ height: 32, borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            <i className="bi bi-plus-circle-fill" />
            Tạo báo cáo
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <ReportSummary viewMode={viewMode} />
        <AnalyticsCharts />
        <CampaignTable />
      </motion.div>

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
