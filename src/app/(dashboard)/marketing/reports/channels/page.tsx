"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TabKey } from "@/components/ui/Tab";
import { SectionTitle } from "@/components/ui/SectionTitle";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ReportsChannelsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("facebook");

  const CAMPAIGNS = [
    { name: "Campaign_Conversion_Apr_2026", cost: "15,240,000 ₫", cpm: "185,000 ₫", convs: 82 },
    { name: "Message_Engagement_Brand_Awareness", cost: "12,400,000 ₫", cpm: "215,000 ₫", convs: 58 },
    { name: "Retargeting_Website_Visitors_V2", cost: "8,500,000 ₫", cpm: "168,000 ₫", convs: 51 },
    { name: "Lead_Generation_Property_Project_A", cost: "6,850,000 ₫", cpm: "245,000 ₫", convs: 28 },
    { name: "Video_Views_New_Product_Launch", cost: "3,720,000 ₫", cpm: "142,000 ₫", convs: 21 },
  ];

  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const maxCpm = Math.max(...CAMPAIGNS.map(c => parseInt(c.cpm.replace(/,/g, ''))));
  const maxConvs = Math.max(...CAMPAIGNS.map(c => c.convs));

  // Calculate ranks
  const cpmSorted = [...CAMPAIGNS].sort((a, b) => parseInt(b.cpm.replace(/,/g, '')) - parseInt(a.cpm.replace(/,/g, '')));
  const convsSorted = [...CAMPAIGNS].sort((a, b) => b.convs - a.convs);

  // Steps definition for the dashboard
  const STEPS = [
    { key: "facebook", title: "Facebook Ads", desc: "Quảng cáo Facebook", icon: "bi-facebook", color: "#1877F2" },
    { key: "google", title: "Google Ads", desc: "Quảng cáo Google", icon: "bi-google", color: "#EA4335" },
    { key: "tiktok", title: "TikTok Ads", desc: "Quảng cáo TikTok", icon: "bi-tiktok", color: "#000000" },
    { key: "content", title: "Content Marketing", desc: "Nội dung & Sáng tạo", icon: "bi-file-earmark-post", color: "#6366f1" },
  ];

  const renderStepIcon = (item: typeof STEPS[0]) => {
    const isActive = activeTab === item.key;
    return (
      <div 
        style={{ 
          width: 38, 
          height: 38, 
          borderRadius: 10, 
          background: isActive ? "linear-gradient(135deg, #6366f1, #d946ef)" : "var(--muted)", 
          color: isActive ? "#fff" : "var(--muted-foreground)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          fontSize: 18,
          transition: "all 0.3s",
          boxShadow: isActive ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none"
        }}
      >
        <i className={`bi ${item.icon}`} />
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Hiệu quả kênh"
        description="Phân tích và so sánh hiệu quả từng kênh marketing: Facebook, Google, TikTok, Content"
        color="rose"
        icon="bi-graph-up"
      />

      <div className="p-4 pt-2" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* ── SEAMLESS CARD CONTAINER ── */}
        <div className="app-card d-flex flex-column" style={{ flex: 1, borderRadius: "16px", overflow: "hidden", marginBottom: 0 }}>
          
          {/* Stepper Header Part */}
          <div style={{ background: "var(--card)" }}>
            {/* Step list */}
            <div style={{ padding: "16px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {STEPS.map((s, idx) => {
                  const isActive = activeTab === s.key;
                  return (
                    <React.Fragment key={s.key}>
                      <div 
                        onClick={() => setActiveTab(s.key as TabKey)}
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 12, 
                          cursor: "pointer", 
                          flexShrink: 0
                        }}
                      >
                        {renderStepIcon(s)}
                        <div>
                          <h3 style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 800, color: isActive ? "var(--foreground)" : "var(--muted-foreground)", transition: "color 0.3s" }}>{s.title}</h3>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", opacity: 0.8 }}>{s.desc}</p>
                        </div>
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", margin: "0 24px" }}>
                          <div style={{ height: 1.5, width: "100%", background: "var(--border)", opacity: 0.6 }} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Dashed Line */}
            <div style={{ borderTop: "1px dashed var(--border)", margin: "0 24px" }} />

            {/* Action bar below steps */}
            {/* First Row: Ad Account & Date Range */}
            <div style={{ padding: "6px 24px 2px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {/* Left: Ad Account Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Tài khoản:</span>
                <select 
                  className="form-select form-select-sm border-0 bg-muted" 
                  style={{ width: 220, fontWeight: 600, borderRadius: 8, fontSize: 12, padding: "4px 8px", color: "var(--foreground)" }}
                >
                  <option value="all">Tất cả tài khoản</option>
                  <option value="acc1">LEE-TECH Official</option>
                </select>
              </div>

              {/* Right: Date Range Picker */}
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Thời gian:</span>
                <div className="d-flex gap-1">
                  <input type="date" className="form-control form-control-sm border-0 bg-muted" style={{ width: 130, fontWeight: 600, borderRadius: 8, fontSize: 12, padding: "4px 8px", color: "var(--foreground)" }} defaultValue="2026-04-01" />
                  <span className="text-muted align-self-center small">-</span>
                  <input type="date" className="form-control form-control-sm border-0 bg-muted" style={{ width: 130, fontWeight: 600, borderRadius: 8, fontSize: 12, padding: "4px 8px", color: "var(--foreground)" }} defaultValue="2026-04-24" />
                </div>
              </div>
            </div>

            {/* Second Row: Campaign, Ad Group, and Personnel */}
            <div style={{ padding: "2px 24px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {/* Left Side: Campaign & Ad Group Filters */}
              <div className="d-flex gap-4">
                {/* Campaign Group */}
                <div className="d-flex gap-1" style={{ background: "var(--muted)", padding: "2px", borderRadius: 10 }}>
                  <select className="form-select form-select-sm border-0 bg-transparent" style={{ width: 140, fontWeight: 600, fontSize: 12, color: "var(--foreground)" }}>
                    <option>Loại chiến dịch</option>
                    <option>Chuyển đổi</option>
                    <option>Tin nhắn</option>
                  </select>
                  <div style={{ width: 1, height: 20, background: "var(--border)", alignSelf: "center" }} />
                  <input type="text" className="form-control form-control-sm border-0 bg-transparent" placeholder="Tên chiến dịch..." style={{ width: 160, fontWeight: 600, fontSize: 12, color: "var(--foreground)" }} />
                </div>

                {/* Ad Group Group */}
                <div className="d-flex gap-1" style={{ background: "var(--muted)", padding: "2px", borderRadius: 10 }}>
                  <select className="form-select form-select-sm border-0 bg-transparent" style={{ width: 140, fontWeight: 600, fontSize: 12, color: "var(--foreground)" }}>
                    <option>Nhóm quảng cáo</option>
                    <option>Nhóm mục tiêu A</option>
                  </select>
                  <div style={{ width: 1, height: 20, background: "var(--border)", alignSelf: "center" }} />
                  <input type="text" className="form-control form-control-sm border-0 bg-transparent" placeholder="Tên quảng cáo..." style={{ width: 160, fontWeight: 600, fontSize: 12, color: "var(--foreground)" }} />
                </div>
              </div>

              {/* Right Side: Employee & Print Button */}
              <div className="d-flex gap-2">
                <select className="form-select form-select-sm border-0 bg-muted" style={{ width: 150, fontWeight: 600, borderRadius: 8, fontSize: 12, color: "var(--foreground)" }}>
                  <option>Nhân viên</option>
                  <option>Nguyễn Lan Nhi</option>
                  <option>Trần Văn A</option>
                </select>
                <button className="btn btn-sm btn-primary fw-bold px-3" style={{ borderRadius: 8, fontSize: 12 }}>
                  <i className="bi bi-printer me-1" /> In
                </button>
              </div>
            </div>
          </div>

          {/* ── Main Content Area (Dynamic based on tab) ── */}
          <div 
            style={{ 
              flex: 1, 
              background: "var(--background)", 
              borderTop: "1px solid var(--border)",
              padding: "24px",
              overflowY: "auto"
            }}
          >
            {(activeTab === "facebook" || activeTab === "google" || activeTab === "tiktok") && (
              <div className="animate-fade-in">
                {/* KPI Row */}
                <div className="row g-3 mb-4">
                  {(activeTab === "facebook" ? [
                    { label: "Tổng chi phí", value: "46,710,000 ₫", icon: "bi-cash-stack", color: "#1877F2", trend: "+12.5%" },
                    { label: "Người theo dõi", value: "12,540", icon: "bi-people", color: "#6366f1", trend: "+850" },
                    { label: "Số tin nhắn", value: "240", icon: "bi-chat-dots", color: "#10b981", trend: "+15%" },
                    { label: "Giá / Tin nhắn", value: "194,625 ₫", icon: "bi-tag", color: "#f59e0b", trend: "-5.2%" },
                  ] : activeTab === "google" ? [
                    { label: "Tổng chi phí", value: "32,450,000 ₫", icon: "bi-cash-stack", color: "#EA4335", trend: "+8.2%" },
                    { label: "Lượt chuyển đổi", value: "142", icon: "bi-check-circle", color: "#4285F4", trend: "+15%" },
                    { label: "Lượt tiếp cận", value: "15,240", icon: "bi-cursor", color: "#34A853", trend: "+5.4%" },
                    { label: "Chỉ số CPC", value: "2,129 ₫", icon: "bi-tag", color: "#FBBC05", trend: "-3.1%" },
                  ] : [
                    { label: "Tổng chi phí", value: "28,120,000 ₫", icon: "bi-cash-stack", color: "#000000", trend: "+15.2%" },
                    { label: "Người theo dõi", value: "8,420", icon: "bi-person-plus", color: "#ff0050", trend: "+1,240" },
                    { label: "Lượt chuyển đổi", value: "350", icon: "bi-bag-check", color: "#00f2ea", trend: "+18%" },
                    { label: "Giá / Chuyển đổi", value: "80,342 ₫", icon: "bi-tag", color: "#000000", trend: "-5.5%" },
                  ]).map((kpi, i) => (
                    <div key={i} className="col-12 col-sm-6 col-lg-3">
                      <div 
                        className="app-card border border-border bg-card h-100" 
                        style={{ 
                          padding: "10px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          transition: "all 0.2s"
                        }}
                      >
                        <div 
                          style={{ 
                            width: 38, 
                            height: 38, 
                            borderRadius: 12, 
                            background: `${kpi.color}15`, 
                            color: kpi.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            flexShrink: 0
                          }}
                        >
                          <i className={`bi ${kpi.icon}`} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="text-muted-foreground mb-0" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</p>
                          <div className="d-flex align-items-center justify-content-between">
                            <h5 className="fw-black mb-0 text-foreground" style={{ fontSize: 16 }}>{kpi.value}</h5>
                            <span 
                              className="badge rounded-pill bg-muted text-foreground border border-border"
                              style={{ 
                                fontSize: 9, 
                                fontWeight: 800, 
                                color: kpi.trend.startsWith('+') && !kpi.label.includes("Giá /") ? "#10b981" : "#ef4444"
                              }}
                            >
                              {kpi.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Charts Row */}
                <div className="row g-3">
                  <div className="col-12 col-lg-7">
                    <div className="p-3 app-card border border-border bg-card h-100">
                      <SectionTitle 
                        title={activeTab === "facebook" ? "Bắt đầu cuộc trò chuyện bằng tin nhắn" : activeTab === "google" ? "Diễn biến số lượng chuyển đổi" : "Diễn biến số lượng hiển thị"} 
                        className="mb-0"
                        action={
                          <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1" style={{ fontSize: 10, fontWeight: 700 }}>
                            Cập nhật: 15:23. 24/04/2026
                          </span>
                        }
                      />
                      <div style={{ marginTop: -18, marginBottom: 24 }}>
                        <p className="text-muted-foreground mb-0" style={{ fontSize: 11, fontWeight: 500 }}>Dữ liệu theo thời gian thực</p>
                      </div>
                      <div style={{ height: 240 }}>
                        <Chart 
                          key={activeTab}
                          options={{
                            chart: { 
                              type: "area", 
                              toolbar: { show: false }, 
                              sparkline: { enabled: false },
                              zoom: { enabled: false },
                              background: "transparent"
                            },
                            theme: { mode: isDarkMode ? "dark" : "light" },
                            colors: [activeTab === "facebook" ? "#1877F2" : activeTab === "google" ? "#EA4335" : "#ff0050"],
                            fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100] } },
                            dataLabels: { enabled: false },
                            stroke: { curve: "smooth", width: 2.5 },
                            xaxis: { 
                              categories: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
                              labels: { style: { fontSize: "10px", fontWeight: 400, colors: "var(--muted-foreground)" } },
                              axisBorder: { show: false },
                              axisTicks: { show: false }
                            },
                            yaxis: { labels: { style: { fontSize: "10px", fontWeight: 400, colors: "var(--muted-foreground)" } } },
                            grid: { borderColor: "var(--border)", strokeDashArray: 4, opacity: 0.2 },
                            tooltip: { theme: isDarkMode ? "dark" : "light" }
                          }} 
                          series={[{ name: activeTab === "facebook" ? "Lượt bắt đầu" : "Hiệu suất", data: [45, 52, 38, 65, 48, 56, 67, 58, null, null, null, null] }]} 
                          type="area" 
                          height="100%" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-5">
                    <div className="p-3 app-card border border-border bg-card h-100 d-flex flex-column">
                      <SectionTitle title="Thông tin chi tiết" className="mb-4" />
                      
                      <div className="flex-grow-1 d-flex flex-column gap-1">
                        {(activeTab === "facebook" ? [
                          { label: "Số lượt click vào bài viết", value: "3,240" },
                          { label: "Chỉ số CPM", value: "45,200 ₫" },
                          { label: "Lượt hiển thị", value: "125,400" },
                          { label: "Người tiếp cận", value: "98,200" },
                          { label: "Số bình luận", value: "156" },
                          { label: "Số bày tỏ cảm xúc", value: "1,240" },
                          { label: "Số lượt chia sẻ", value: "42" },
                          { label: "Tần suất", value: "1.28" },
                        ] : activeTab === "google" ? [
                          { label: "Lượt hiển thị", value: "854,200" },
                          { label: "Số lượng Click", value: "15,240" },
                          { label: "Chỉ số CPC", value: "2,129 ₫" },
                          { label: "Chỉ số CTR", value: "1.78%" },
                          { label: "Chỉ số CPM", value: "38,500 ₫" },
                        ] : [
                          { label: "Lượt hiển thị", value: "1,245,000" },
                          { label: "Số lượng người tiếp cận", value: "854,200" },
                          { label: "Số lượng Click", value: "12,400" },
                          { label: "Chỉ số CPC", value: "2,260 ₫" },
                          { label: "Chỉ số CTR", value: "0.98%" },
                          { label: "Chỉ số CPM", value: "22,500 ₫" },
                          { label: "Tần suất", value: "1.42" },
                        ]).map((item, idx) => (
                          <div 
                            key={idx} 
                            className="d-flex justify-content-between align-items-center border-bottom border-border"
                            style={{ borderBottomStyle: "dashed !important", padding: "6px 0" }}
                          >
                            <span className="text-muted-foreground small fw-medium" style={{ fontSize: "11px" }}>{item.label}</span>
                            <span className="fw-bold small text-foreground" style={{ fontSize: "11px" }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Row */}
                <div className="row mt-4">
                  <div className="col-12">
                    <div className="p-3 app-card border border-border bg-card">
                      <SectionTitle title={`Danh sách chiến dịch ${activeTab === "facebook" ? "Facebook" : activeTab === "google" ? "Google" : "TikTok"}`} className="mb-4" />
                      
                      <div className="table-responsive">
                        <table className="table align-middle mb-0">
                          <thead className="bg-muted">
                            <tr>
                              <th className="border-0 px-3 py-2 text-uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.05em", width: "35%" }}>Tên chiến dịch</th>
                              <th className="border-0 px-3 py-2 text-uppercase text-muted-foreground text-end" style={{ fontSize: 10, letterSpacing: "0.05em", width: "15%" }}>Chi phí</th>
                              <th className="border-0 px-3 py-2 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10, letterSpacing: "0.05em", width: "25%" }}>{activeTab === "facebook" ? "Giá / Tin nhắn" : activeTab === "google" ? "Lượt chuyển đổi" : activeTab === "tiktok" ? "Lượt hiển thị" : "Giá / Lượt xem"}</th>
                              <th className="border-0 px-3 py-2 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10, letterSpacing: "0.05em", width: "25%" }}>{activeTab === "facebook" ? "Lượt hội thoại" : activeTab === "google" ? "Chi phí một chuyển đổi" : activeTab === "tiktok" ? "Số người tiếp cận" : "Lượt tương tác"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {CAMPAIGNS.map((campaign, i) => (
                              <tr 
                                key={i} 
                                style={{ cursor: "pointer" }} 
                                onClick={() => { setSelectedCampaign(campaign); setShowOffcanvas(true); }}
                                className="hover-shadow-sm"
                              >
                                <td className="px-3 py-1">
                                  <div className="d-flex align-items-center">
                                    <div className="bg-primary-subtle rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: 24, height: 24 }}>
                                      <i className={`bi ${activeTab === "facebook" ? "bi-megaphone-fill" : activeTab === "google" ? "bi-search" : "bi-play-fill"} text-primary`} style={{ fontSize: 10 }} />
                                    </div>
                                    <span className="fw-bold text-foreground" style={{ fontSize: 12 }}>{campaign.name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-1 text-end fw-medium text-foreground" style={{ fontSize: 12 }}>{campaign.cost}</td>
                                <td className="px-3 py-1 text-start" style={{ width: "25%", minWidth: 150 }}>
                                  {/* Column 3 logic */}
                                  <div className="w-100 bg-muted overflow-hidden d-flex align-items-center" style={{ height: 16, position: "relative" }}>
                                    <span 
                                      className="position-absolute start-0 ps-2 text-white" 
                                      style={{ 
                                        fontSize: 9, 
                                        zIndex: 1, 
                                        fontWeight: (activeTab === "google" ? convsSorted : activeTab === "tiktok" ? cpmSorted : cpmSorted).findIndex(c => c.name === campaign.name) < 3 ? 800 : 400,
                                        textShadow: "0 1px 2px rgba(0,0,0,0.2)"
                                      }}
                                    >
                                      {(activeTab === "google" ? convsSorted : activeTab === "tiktok" ? cpmSorted : cpmSorted).findIndex(c => c.name === campaign.name) + 1}/{CAMPAIGNS.length}
                                    </span>
                                    <div 
                                      style={{ 
                                        height: "100%",
                                        width: activeTab === "google" 
                                          ? `${(campaign.convs / maxConvs) * 100}%`
                                          : activeTab === "tiktok"
                                            ? `${(parseInt(campaign.cpm.replace(/,/g, '')) / maxCpm) * 100}%`
                                            : `${(parseInt(campaign.cpm.replace(/,/g, '')) / maxCpm) * 100}%`,
                                        background: activeTab === "google" ? "#1877F2" : activeTab === "facebook" ? "#F44336" : activeTab === "tiktok" ? "#1877F2" : "#F44336",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "flex-end",
                                        paddingRight: 8,
                                        transition: "width 0.5s ease",
                                        position: "relative",
                                        zIndex: 0
                                      }}
                                    >
                                      <span className="fw-bold text-white" style={{ fontSize: 10 }}>
                                        {activeTab === "google" 
                                          ? campaign.convs
                                          : activeTab === "tiktok"
                                            ? (parseInt(campaign.cpm.replace(/,/g, '')) * 100).toLocaleString()
                                            : parseInt(campaign.cpm.replace(/,/g, '')) >= 1000 ? (parseInt(campaign.cpm.replace(/,/g, '')) / 1000).toFixed(1) + "K" : campaign.cpm}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-1 text-start" style={{ width: "25%", minWidth: 150 }}>
                                  {/* Column 4 logic */}
                                  <div className="w-100 bg-muted overflow-hidden d-flex align-items-center" style={{ height: 16, position: "relative" }}>
                                    <span 
                                      className="position-absolute start-0 ps-2 text-white" 
                                      style={{ 
                                        fontSize: 9, 
                                        zIndex: 1, 
                                        fontWeight: (activeTab === "google" ? cpmSorted : activeTab === "tiktok" ? convsSorted : convsSorted).findIndex(c => c.name === campaign.name) < 3 ? 800 : 400,
                                        textShadow: "0 1px 2px rgba(0,0,0,0.2)"
                                      }}
                                    >
                                      {(activeTab === "google" ? cpmSorted : activeTab === "tiktok" ? convsSorted : convsSorted).findIndex(c => c.name === campaign.name) + 1}/{CAMPAIGNS.length}
                                    </span>
                                    <div 
                                      style={{ 
                                        height: "100%",
                                        width: activeTab === "google"
                                          ? `${(parseInt(campaign.cpm.replace(/,/g, '')) / maxCpm) * 100}%`
                                          : activeTab === "tiktok"
                                            ? `${(campaign.convs / maxConvs) * 100}%`
                                            : `${(campaign.convs / maxConvs) * 100}%`,
                                        background: activeTab === "google" ? "#F44336" : activeTab === "facebook" ? "#1877F2" : activeTab === "tiktok" ? "#1877F2" : "#1877F2",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "flex-end",
                                        paddingRight: 8,
                                        transition: "width 0.5s ease",
                                        position: "relative",
                                        zIndex: 0
                                      }}
                                    >
                                      <span className="fw-bold text-white" style={{ fontSize: 10 }}>
                                        {activeTab === "google"
                                          ? (parseInt(campaign.cpm.replace(/,/g, '')) >= 1000 ? (parseInt(campaign.cpm.replace(/,/g, '')) / 1000).toFixed(1) + "K" : campaign.cpm)
                                          : activeTab === "tiktok"
                                            ? (campaign.convs * 850).toLocaleString()
                                            : campaign.convs}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "content" && (
              <div className="animate-fade-in">
                {/* KPI Row for Content Marketing - 5 Cards */}
                <div className="row g-3 mb-1">
                  {[
                    { label: "Facebook Posts", value: "128", icon: "bi-facebook", color: "#1877F2", trend: "+12" },
                    { label: "YouTube Videos", value: "42", icon: "bi-youtube", color: "#FF0000", trend: "+5" },
                    { label: "TikTok Clips", value: "85", icon: "bi-tiktok", color: "#000000", trend: "+18" },
                    { label: "SEO Keywords", value: "156", icon: "bi-search", color: "#4285F4", trend: "+24" },
                    { label: "Website Articles", value: "24", icon: "bi-globe", color: "#6366f1", trend: "+2" },
                  ].map((kpi, i) => (
                    <div key={i} className="col-12 col-md-4 col-lg" style={{ minWidth: "200px" }}>
                      <div 
                        className="app-card border border-border bg-card h-100" 
                        style={{ 
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          transition: "all 0.2s"
                        }}
                      >
                        <div 
                          style={{ 
                            width: 42, 
                            height: 42, 
                            borderRadius: 12, 
                            background: `${kpi.color}15`, 
                            color: kpi.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                            flexShrink: 0
                          }}
                        >
                          <i className={`bi ${kpi.icon}`} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="text-muted-foreground mb-0" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</p>
                          <div className="d-flex align-items-center justify-content-between">
                            <h5 className="fw-black mb-0 text-foreground" style={{ fontSize: 18 }}>{kpi.value}</h5>
                            <span 
                              className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle"
                              style={{ fontSize: 9, fontWeight: 800 }}
                            >
                              {kpi.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Content Strategy Table */}
                <div className="row g-3 mt-0">
                  <div className="col-12">
                    <div className="p-4 app-card border border-border bg-card">
                      <SectionTitle title="Kết quả theo tuyến nội dung" className="mb-2" />
                      
                      <div className="table-responsive">
                        <table className="table align-middle mb-0">
                          <thead className="bg-muted">
                            <tr>
                              <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.05em", width: "20%" }}>Tuyến nội dung</th>
                              <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Facebook Post</th>
                              <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10, letterSpacing: "0.05em" }}>FB Reels Video</th>
                              <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Giới thiệu SP</th>
                              <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Chuẩn SEO</th>
                              <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Youtube Video</th>
                              <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Tiktok Video</th>
                              <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-end" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Tổng cộng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: "Tìm kiếm đại lý", fb: 45, reels: 12, intro: 15, seo: 24, yt: 6, tk: 28 },
                              { label: "Hỗ trợ đại lý", fb: 52, reels: 18, intro: 20, seo: 12, yt: 4, tk: 15 },
                              { label: "Educate khách hàng cuối", fb: 31, reels: 20, intro: 10, seo: 26, yt: 12, tk: 35 },
                            ].map((row, idx, array) => {
                              const total = row.fb + row.reels + row.intro + row.seo + row.yt + row.tk;
                              const maxValues = {
                                fb: Math.max(...array.map(r => r.fb)),
                                reels: Math.max(...array.map(r => r.reels)),
                                intro: Math.max(...array.map(r => r.intro)),
                                seo: Math.max(...array.map(r => r.seo)),
                                yt: Math.max(...array.map(r => r.yt)),
                                tk: Math.max(...array.map(r => r.tk)),
                                total: Math.max(...array.map(r => r.fb + r.reels + r.intro + r.seo + r.yt + r.tk))
                              };

                              const renderCell = (val, max, color) => (
                                <td className="px-3 py-1 text-start" style={{ minWidth: 80 }}>
                                  <div className="w-100 bg-muted overflow-hidden d-flex align-items-center" style={{ height: 16, position: "relative" }}>
                                    <div 
                                      style={{ 
                                        height: "100%", 
                                        width: `${(val / max) * 100}%`, 
                                        background: color, 
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "flex-end",
                                        paddingRight: 6,
                                        transition: "width 0.5s ease"
                                      }} 
                                    >
                                      <span className="fw-bold text-white" style={{ fontSize: 9 }}>
                                        {val}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              );

                              return (
                                <tr key={idx} className="hover-shadow-sm">
                                  <td className="px-3 py-1 fw-bold text-foreground" style={{ fontSize: 12 }}>{row.label}</td>
                                  {renderCell(row.fb, maxValues.fb, "#1877F2")}
                                  {renderCell(row.reels, maxValues.reels, "#E1306C")}
                                  {renderCell(row.intro, maxValues.intro, "#6366f1")}
                                  {renderCell(row.seo, maxValues.seo, "#4285F4")}
                                  {renderCell(row.yt, maxValues.yt, "#FF0000")}
                                  {renderCell(row.tk, maxValues.tk, "#000000")}
                                  <td className="px-3 py-1 text-end fw-black text-primary" style={{ fontSize: 13 }}>{total}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-muted-subtle">
                            <tr className="fw-black">
                              <td className="px-3 py-1 text-uppercase" style={{ fontSize: 11 }}>TỔNG THEO KÊNH</td>
                              <td className="px-3 py-1 text-start" style={{ fontSize: 12 }}>128</td>
                              <td className="px-3 py-1 text-start" style={{ fontSize: 12 }}>50</td>
                              <td className="px-3 py-1 text-start" style={{ fontSize: 12 }}>45</td>
                              <td className="px-3 py-1 text-start" style={{ fontSize: 12 }}>62</td>
                              <td className="px-3 py-1 text-start" style={{ fontSize: 12 }}>22</td>
                              <td className="px-3 py-1 text-start" style={{ fontSize: 12 }}>78</td>
                              <td className="px-3 py-1 text-end text-primary" style={{ fontSize: 14 }}>385</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Campaign Completion Section */}
                      <div className="pt-4 mt-4 border-top border-border">
                        <SectionTitle 
                          title="Chỉ số hoàn thành theo chiến dịch" 
                          className="mb-2" 
                          action={
                            <div className="d-flex gap-2 align-items-center">
                              <span className="text-muted-foreground" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Lọc theo:</span>
                              <select className="form-select form-select-sm border-border bg-muted-subtle" style={{ fontSize: 10, fontWeight: 600, width: "auto" }}>
                                <option>Tất cả kênh</option>
                                <option>Facebook Post</option>
                                <option>FB Reels Video</option>
                                <option>Giới thiệu SP</option>
                                <option>Chuẩn SEO</option>
                                <option>Youtube Video</option>
                                <option>Tiktok Video</option>
                              </select>
                            </div>
                          }
                        />
                        <div className="table-responsive">
                          <table className="table align-middle mb-0">
                            <thead className="bg-muted">
                              <tr>
                                <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.05em", width: "30%" }}>Tên chiến dịch</th>
                                <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10, letterSpacing: "0.05em", width: "30%" }}>Tỷ lệ hoàn thành</th>
                                <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-center" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Mục tiêu</th>
                                <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-center" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Kết quả</th>
                                <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-end" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { name: "Chiến dịch Tuyển đại lý Miền Bắc", goal: 150, actual: 128, status: "85%" },
                                { name: "Ra mắt dòng sản phẩm Voriger Q2", goal: 80, actual: 42, status: "52%" },
                                { name: "Chương trình Đào tạo đối tác 2026", goal: 60, actual: 58, status: "96%" },
                                { name: "Sự kiện kết nối Seajong & Agency", goal: 100, actual: 85, status: "85%" },
                              ].map((campaign, idx) => {
                                const rate = (campaign.actual / campaign.goal) * 100;
                                return (
                                  <tr key={idx} className="hover-shadow-sm">
                                    <td className="px-3 py-1 fw-bold text-foreground" style={{ fontSize: 12 }}>{campaign.name}</td>
                                    <td className="px-3 py-1">
                                      <div className="d-flex align-items-center gap-2">
                                        <div className="flex-grow-1 bg-muted overflow-hidden" style={{ height: 6, borderRadius: 3 }}>
                                          <div 
                                            style={{ 
                                              height: "100%", 
                                              width: `${rate}%`, 
                                              background: rate > 90 ? "#198754" : rate > 50 ? "#1877F2" : "#FBBC05",
                                              transition: "width 0.5s ease"
                                            }} 
                                          />
                                        </div>
                                        <span className="fw-bold" style={{ fontSize: 10, minWidth: 30 }}>{rate.toFixed(0)}%</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-1 text-center text-muted-foreground" style={{ fontSize: 12 }}>{campaign.goal}</td>
                                    <td className="px-3 py-1 text-center text-muted-foreground" style={{ fontSize: 12 }}>{campaign.actual}</td>
                                    <td className="px-3 py-1 text-end">
                                      {rate >= 95 ? (
                                        <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: 9 }}>Hoàn thành</span>
                                      ) : (
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: 9 }}>Đang chạy</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Campaign Details Offcanvas */}
      {showOffcanvas && (
        <>
          <div 
            className="position-fixed top-0 start-0 w-100 h-100 bg-black opacity-25" 
            style={{ zIndex: 1040 }}
            onClick={() => setShowOffcanvas(false)}
          />
          <div 
            className="position-fixed top-0 end-0 h-100 bg-card shadow-lg" 
            style={{ 
              width: "400px", 
              zIndex: 1050, 
              transition: "transform 0.3s ease-in-out",
              borderLeft: "1px solid var(--border)"
            }}
          >
            <div className="p-4 h-100 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-black mb-0 text-uppercase text-foreground" style={{ fontSize: 16 }}>Chi tiết chiến dịch</h5>
                  <p className="text-muted-foreground small mb-0">Báo cáo hiệu quả chi tiết</p>
                </div>
                <button className="btn btn-muted-foreground bg-muted rounded-circle p-2" onClick={() => setShowOffcanvas(false)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              {selectedCampaign && (
                <div className="flex-grow-1 overflow-auto">
                  <div className="bg-primary-subtle p-3 rounded-4 mb-4">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32 }}>
                        <i className="bi bi-megaphone-fill text-white" />
                      </div>
                      <span className="fw-bold text-primary" style={{ fontSize: 14 }}>{selectedCampaign.name}</span>
                    </div>
                    <div className="d-flex gap-2">
                      <span className="badge bg-card text-primary rounded-pill px-2 py-1" style={{ fontSize: 10 }}>Đang chạy</span>
                      <span className="badge bg-card text-primary rounded-pill px-2 py-1" style={{ fontSize: 10 }}>Facebook Ads</span>
                    </div>
                  </div>

                  <SectionTitle title="Hiệu quả cốt lõi" className="mb-3" />
                  <div className="row g-2 mb-4">
                    {[
                      { label: "Chi phí", value: selectedCampaign.cost, icon: "bi-cash-stack", color: "#F44336" },
                      { label: "Lượt hội thoại", value: selectedCampaign.convs, icon: "bi-chat-dots-fill", color: "#1877F2" },
                      { label: "Giá / Tin nhắn", value: selectedCampaign.cpm, icon: "bi-lightning-fill", color: "#f59e0b" },
                    ].map((m, idx) => (
                      <div key={idx} className="col-6">
                        <div className="p-2 border border-border rounded-3 bg-muted">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <i className={`bi ${m.icon}`} style={{ color: m.color, fontSize: 12 }} />
                            <span className="text-muted-foreground" style={{ fontSize: 10, fontWeight: 600 }}>{m.label}</span>
                          </div>
                          <p className="fw-black mb-0 text-foreground" style={{ fontSize: 13 }}>{m.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <SectionTitle title="Tương tác & Tiếp cận" className="mb-3" />
                  <div className="d-flex flex-column gap-2 mb-4">
                    {[
                      { label: "Lượt hiển thị", value: "42,500", trend: "+12%" },
                      { label: "Người tiếp cận", value: "38,200", trend: "+8%" },
                      { label: "Số lượt click", value: "1,240", trend: "+15%" },
                      { label: "Số bình luận", value: "56", trend: "+2%" },
                      { label: "Số lượt chia sẻ", value: "12", trend: "0%" },
                    ].map((item, idx) => (
                      <div key={idx} className="d-flex justify-content-between align-items-center p-2 border-bottom border-border">
                        <span className="text-muted-foreground small fw-medium">{item.label}</span>
                        <div className="text-end">
                          <p className="fw-bold small mb-0 text-foreground">{item.value}</p>
                          <span className="text-success" style={{ fontSize: 9 }}>{item.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-muted rounded-4 border border-border">
                    <p className="small fw-bold text-uppercase mb-2 text-foreground" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Phân tích chiến dịch</p>
                    <p className="small text-muted-foreground mb-0" style={{ lineHeight: 1.6 }}>
                      Chiến dịch này đang có mức độ tương tác ổn định. Chi phí mỗi tin nhắn đang ở mức tối ưu. 
                      Khuyến nghị tăng ngân sách thêm 15% cho nhóm đối tượng mục tiêu chính.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
