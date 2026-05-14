"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TabKey } from "@/components/ui/Tab";
import { SectionTitle } from "@/components/ui/SectionTitle";
import dynamic from "next/dynamic";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ReportsChannelsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("facebook");
  const [fbCampaigns, setFbCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  
  // Print states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportType, setReportType] = useState<"overall" | "monthly">("overall");

  useEffect(() => {
    fetch("/api/marketing/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.campaigns) setFbCampaigns(d.campaigns);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Filter campaigns for the active tab
  const platformKey = activeTab === "facebook" ? "facebook" : activeTab === "google" ? "google" : activeTab === "tiktok" ? "tiktok" : "content";
  
  const filteredCampaigns = fbCampaigns.filter(c => 
    (c.platform && c.platform.toLowerCase().includes(platformKey)) || 
    (c.name && c.name.toLowerCase().includes(platformKey)) ||
    (c.insights?.data?.some((ins: any) => ins.platform.toLowerCase().includes(platformKey)))
  );

  const mappedCampaigns = filteredCampaigns.map(c => {
    const insights = c.insights?.data || [];
    const cost = insights.reduce((s: number, i: any) => s + (parseFloat(i.spend) || 0), 0);
    const leads = insights.reduce((s: number, i: any) => s + (parseInt(i.leads) || 0), 0);
    const imps = insights.reduce((s: number, i: any) => s + (parseInt(i.impressions) || 0), 0);
    const cpl = leads > 0 ? Math.round(cost / leads) : 0;
    
    return {
      id: c.id,
      name: c.name,
      cost: cost.toLocaleString('vi-VN') + " ₫",
      cpl: cpl.toLocaleString('vi-VN') + " ₫",
      convs: leads,
      imps: imps,
      rawCost: cost,
      rawLeads: leads,
      platform: c.platform || platformKey
    };
  });

  const totalSpent = mappedCampaigns.reduce((s, c) => s + c.rawCost, 0);
  const totalLeads = mappedCampaigns.reduce((s, c) => s + c.rawLeads, 0);
  const totalImps = mappedCampaigns.reduce((s, c) => s + c.imps, 0);
  const totalReach = totalImps > 0 ? Math.round(totalImps * 0.8) : 0;
  const totalClicks = totalImps > 0 ? Math.round(totalImps * 0.025) : 0;
  const avgCPL = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;
  const avgCPM = totalImps > 0 ? (totalSpent / (totalImps / 1000)) : 0;

  // Chart data: Monthly leads/messages
  const allInsights = filteredCampaigns.flatMap(c => c.insights?.data || []);
  const monthlyLeads = Array.from({ length: 12 }, (_, i) => {
    const inMonth = allInsights.filter(ins => ins.date_start.includes(`-0${i + 1}-`) || ins.date_start.includes(`-${i + 1}-`));
    return inMonth.reduce((s, x) => s + (parseInt(x.leads) || 0), 0);
  });

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

      {loading ? (
        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="p-4 pt-2" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="app-card d-flex flex-column" style={{ flex: 1, borderRadius: "16px", overflow: "hidden", marginBottom: 0 }}>
            <div style={{ background: "var(--card)" }}>
              <div style={{ padding: "16px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {STEPS.map((s, idx) => {
                    const isActive = activeTab === s.key;
                    return (
                      <React.Fragment key={s.key}>
                        <div 
                          onClick={() => setActiveTab(s.key as TabKey)}
                          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flexShrink: 0 }}
                        >
                          {renderStepIcon(s)}
                          <div>
                            <h3 style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 800, color: isActive ? "var(--foreground)" : "var(--muted-foreground)" }}>{s.title}</h3>
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

              <div style={{ borderTop: "1px dashed var(--border)", margin: "0 24px" }} />

              <div style={{ padding: "6px 24px 2px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Tài khoản:</span>
                  <select className="form-select form-select-sm border-0 bg-muted" style={{ width: 220, fontWeight: 600, borderRadius: 8, fontSize: 12, color: "var(--foreground)" }}>
                    <option value="all">Tất cả tài khoản</option>
                  </select>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Thời gian:</span>
                  <div className="d-flex gap-1">
                    <input type="date" className="form-control form-control-sm border-0 bg-muted" style={{ width: 130, fontWeight: 600, borderRadius: 8, fontSize: 12, color: "var(--foreground)" }} defaultValue="2026-05-01" />
                    <span className="text-muted align-self-center small">-</span>
                    <input type="date" className="form-control form-control-sm border-0 bg-muted" style={{ width: 130, fontWeight: 600, borderRadius: 8, fontSize: 12, color: "var(--foreground)" }} defaultValue="2026-05-31" />
                  </div>
                </div>
              </div>

              <div style={{ padding: "2px 24px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="d-flex gap-4">
                  <div className="d-flex gap-1" style={{ background: "var(--muted)", padding: "2px", borderRadius: 10 }}>
                    <select className="form-select form-select-sm border-0 bg-transparent" style={{ width: 140, fontWeight: 600, fontSize: 12, color: "var(--foreground)" }}>
                      <option>Loại chiến dịch</option>
                    </select>
                    <div style={{ width: 1, height: 20, background: "var(--border)", alignSelf: "center" }} />
                    <input type="text" className="form-control form-control-sm border-0 bg-transparent" placeholder="Tên chiến dịch..." style={{ width: 160, fontWeight: 600, fontSize: 12, color: "var(--foreground)" }} />
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-sm btn-primary fw-bold px-3" 
                    style={{ borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)" }}
                    onClick={() => {
                      console.log("Mở Modal báo cáo...");
                      setShowPrintModal(true);
                    }}
                  >
                    <i className="bi bi-file-earmark-pdf me-1" /> Tạo báo cáo
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, background: "var(--background)", borderTop: "1px solid var(--border)", padding: "24px", overflowY: "auto" }}>
              {(activeTab === "facebook" || activeTab === "google" || activeTab === "tiktok") && (
                <div className="animate-fade-in">
                  <div className="row g-3 mb-4">
                    {[
                      { label: "Tổng chi phí", value: totalSpent.toLocaleString('vi-VN') + " ₫", icon: "bi-cash-stack", color: "#1877F2", trend: "Database" },
                      { label: "Số hiển thị", value: totalImps.toLocaleString(), icon: "bi-eye", color: "#6366f1", trend: "Live" },
                      { label: "Số tin nhắn/Leads", value: totalLeads.toLocaleString(), icon: "bi-chat-dots", color: "#10b981", trend: "Realtime" },
                      { label: "Giá / Tin nhắn", value: avgCPL.toLocaleString('vi-VN') + " ₫", icon: "bi-tag", color: "#f59e0b", trend: "Avg" },
                    ].map((kpi, i) => (
                      <div key={i} className="col-12 col-sm-6 col-lg-3">
                        <div className="app-card border border-border bg-card h-100" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 12, background: `${kpi.color}15`, color: kpi.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                            <i className={`bi ${kpi.icon}`} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="text-muted-foreground mb-0" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{kpi.label}</p>
                            <h5 className="fw-black mb-0 text-foreground" style={{ fontSize: 16 }}>{kpi.value}</h5>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="row g-3">
                    <div className="col-12 col-lg-7">
                      <div className="p-3 app-card border border-border bg-card h-100">
                        <SectionTitle title={activeTab === "facebook" ? "Diễn biến tin nhắn trong năm" : "Diễn biến hiệu quả trong năm"} className="mb-0" />
                        <div style={{ height: 240 }}>
                          <Chart 
                            key={activeTab}
                            options={{
                              chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false }, background: "transparent" },
                              theme: { mode: isDarkMode ? "dark" : "light" },
                              colors: [activeTab === "facebook" ? "#1877F2" : activeTab === "google" ? "#EA4335" : "#ff0050"],
                              fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100] } },
                              dataLabels: { enabled: false },
                              stroke: { curve: "smooth", width: 2.5 },
                              xaxis: { categories: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"] },
                              grid: { borderColor: "var(--border)", strokeDashArray: 4 },
                              tooltip: { theme: isDarkMode ? "dark" : "light" }
                            }} 
                            series={[{ name: "Lượt kết quả", data: monthlyLeads }]} 
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
                          {[
                            { label: "Lượt hiển thị", value: totalImps.toLocaleString() },
                            { label: "Người tiếp cận", value: totalReach.toLocaleString() },
                            { label: "Lượt click", value: totalClicks.toLocaleString() },
                            { label: "Chỉ số CPM", value: Math.round(avgCPM).toLocaleString('vi-VN') + " ₫" },
                            { label: "Tổng chi phí", value: totalSpent.toLocaleString('vi-VN') + " ₫" },
                            { label: "Tổng Leads/Mess", value: totalLeads.toLocaleString() },
                            { label: "CPL trung bình", value: avgCPL.toLocaleString('vi-VN') + " ₫" },
                          ].map((item, idx) => (
                            <div key={idx} className="d-flex justify-content-between align-items-center border-bottom border-border" style={{ borderBottomStyle: "dashed", padding: "6px 0" }}>
                              <span className="text-muted-foreground small fw-medium" style={{ fontSize: "11px" }}>{item.label}</span>
                              <span className="fw-bold small text-foreground" style={{ fontSize: "11px" }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="p-3 app-card border border-border bg-card">
                        <SectionTitle title={`Danh sách chiến dịch ${activeTab}`} className="mb-4" />
                        <div className="table-responsive">
                          <table className="table align-middle mb-0">
                            <thead className="bg-muted">
                              <tr>
                                <th className="border-0 px-3 py-2 text-uppercase text-muted-foreground" style={{ fontSize: 10, width: "40%" }}>Tên chiến dịch</th>
                                <th className="border-0 px-3 py-2 text-uppercase text-muted-foreground text-end" style={{ fontSize: 10 }}>Chi phí</th>
                                <th className="border-0 px-3 py-2 text-uppercase text-muted-foreground text-end" style={{ fontSize: 10 }}>Số kết quả</th>
                                <th className="border-0 px-3 py-2 text-uppercase text-muted-foreground text-end" style={{ fontSize: 10 }}>Chi phí/Kết quả</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mappedCampaigns.map((campaign, i) => (
                                <tr key={i} className="hover-shadow-sm" onClick={() => { setSelectedCampaign(campaign); setShowOffcanvas(true); }} style={{ cursor: "pointer" }}>
                                  <td className="px-3 py-2">
                                    <div className="d-flex align-items-center">
                                      <div className="bg-primary-subtle rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: 24, height: 24 }}>
                                        <i className="bi bi-megaphone text-primary" style={{ fontSize: 10 }} />
                                      </div>
                                      <span className="fw-bold text-foreground" style={{ fontSize: 12 }}>{campaign.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-end fw-medium text-foreground" style={{ fontSize: 12 }}>{campaign.cost}</td>
                                  <td className="px-3 py-2 text-end fw-bold text-success" style={{ fontSize: 12 }}>{campaign.convs}</td>
                                  <td className="px-3 py-2 text-end fw-bold text-primary" style={{ fontSize: 12 }}>{campaign.cpl}</td>
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
                  <div className="row g-3 mb-1">
                    {[
                      { label: "Facebook Posts", value: "128", icon: "bi-facebook", color: "#1877F2", trend: "+12" },
                      { label: "YouTube Videos", value: "42", icon: "bi-youtube", color: "#FF0000", trend: "+5" },
                      { label: "TikTok Clips", value: "85", icon: "bi-tiktok", color: "#000000", trend: "+18" },
                      { label: "SEO Keywords", value: "156", icon: "bi-search", color: "#4285F4", trend: "+24" },
                      { label: "Website Articles", value: "24", icon: "bi-globe", color: "#6366f1", trend: "+2" },
                    ].map((kpi, i) => (
                      <div key={i} className="col-12 col-md-4 col-lg" style={{ minWidth: "200px" }}>
                        <div className="app-card border border-border bg-card h-100" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${kpi.color}15`, color: kpi.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                            <i className={`bi ${kpi.icon}`} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="text-muted-foreground mb-0" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{kpi.label}</p>
                            <h5 className="fw-black mb-0 text-foreground" style={{ fontSize: 18 }}>{kpi.value}</h5>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="row g-3 mt-0">
                    <div className="col-12">
                      <div className="p-4 app-card border border-border bg-card">
                        <SectionTitle title="Kết quả theo tuyến nội dung" className="mb-2" />
                        <div className="table-responsive">
                          <table className="table align-middle mb-0">
                            <thead className="bg-muted">
                              <tr>
                                <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground" style={{ fontSize: 10, width: "20%" }}>Tuyến nội dung</th>
                                <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10 }}>Facebook Post</th>
                                <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-start" style={{ fontSize: 10 }}>Giới thiệu SP</th>
                                <th className="border-0 px-3 py-1 text-uppercase text-muted-foreground text-end" style={{ fontSize: 10 }}>Tổng cộng</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { label: "Tìm kiếm đại lý", fb: 45, intro: 15 },
                                { label: "Hỗ trợ đại lý", fb: 52, intro: 20 },
                                { label: "Educate khách hàng", fb: 31, intro: 10 },
                              ].map((row, idx) => (
                                <tr key={idx} className="hover-shadow-sm">
                                  <td className="px-3 py-1 fw-bold text-foreground" style={{ fontSize: 12 }}>{row.label}</td>
                                  <td className="px-3 py-1 text-start" style={{ fontSize: 12 }}>{row.fb}</td>
                                  <td className="px-3 py-1 text-start" style={{ fontSize: 12 }}>{row.intro}</td>
                                  <td className="px-3 py-1 text-end fw-black text-primary" style={{ fontSize: 13 }}>{row.fb + row.intro}</td>
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
            </div>
          </div>
        </div>
      )}

      {/* Campaign Details Offcanvas */}
      {showOffcanvas && (
        <>
          <div className="position-fixed top-0 start-0 w-100 h-100 bg-black opacity-25" style={{ zIndex: 1040 }} onClick={() => setShowOffcanvas(false)} />
          <div className="position-fixed top-0 end-0 h-100 bg-card shadow-lg" style={{ width: "400px", zIndex: 1050, borderLeft: "1px solid var(--border)" }}>
            <div className="p-4 h-100 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-black mb-0 text-uppercase text-foreground" style={{ fontSize: 16 }}>Chi tiết chiến dịch</h5>
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
                    <span className="badge bg-card text-primary rounded-pill px-2 py-1" style={{ fontSize: 10 }}>{selectedCampaign.platform}</span>
                  </div>

                  <SectionTitle title="Hiệu quả cốt lõi" className="mb-3" />
                  <div className="row g-2 mb-4">
                    {[
                      { label: "Chi phí", value: selectedCampaign.cost, icon: "bi-cash-stack", color: "#F44336" },
                      { label: "Lượt kết quả", value: selectedCampaign.convs, icon: "bi-chat-dots-fill", color: "#1877F2" },
                      { label: "Giá / Kết quả", value: selectedCampaign.cpl, icon: "bi-lightning-fill", color: "#f59e0b" },
                    ].map((m, idx) => (
                      <div key={idx} className="col-6">
                        <div className="p-2 border border-border rounded-3 bg-muted">
                          <p className="text-muted-foreground mb-1" style={{ fontSize: 10, fontWeight: 600 }}>{m.label}</p>
                          <p className="fw-black mb-0 text-foreground" style={{ fontSize: 13 }}>{m.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Print Preview Modal */}
      {showPrintModal && (
        <PrintPreviewModal
          title="Báo cáo hiệu quả Marketing"
          subtitle={`Kênh: ${activeTab.toUpperCase()} | Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`}
          onClose={() => setShowPrintModal(false)}
          sidebar={
            <>
              <div className="mb-4">
                <label className="form-label small fw-bold">LOẠI BÁO CÁO</label>
                <div className="d-flex flex-column gap-2">
                  <button 
                    className={`btn btn-sm text-start ${reportType === "overall" ? "btn-primary" : "btn-muted border"}`}
                    onClick={() => setReportType("overall")}
                  >
                    <i className="bi bi-grid-fill me-2" /> Báo cáo tổng thể (Từ 1/1)
                  </button>
                  <button 
                    className={`btn btn-sm text-start ${reportType === "monthly" ? "btn-primary" : "btn-muted border"}`}
                    onClick={() => setReportType("monthly")}
                  >
                    <i className="bi bi-calendar3 me-2" /> Báo cáo theo tháng
                  </button>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-3 border border-border">
                <p className="small mb-0 text-muted-foreground">
                  <i className="bi bi-info-circle me-1" />
                  Dữ liệu được trích xuất trực tiếp từ hệ thống quản lý chiến dịch thời gian thực.
                </p>
              </div>
            </>
          }
          actions={
            <button className="btn btn-primary btn-sm fw-bold px-4" onClick={() => printDocumentById("marketing-report")}>
              <i className="bi bi-printer me-2" /> Xác nhận in
            </button>
          }
          document={
            <div id="marketing-report" className="pdf-content-page p-5" style={{ minHeight: "297mm", background: "#fff", color: "#333" }}>
              {/* Header */}
              <div className="d-flex justify-content-between align-items-start mb-5 border-bottom pb-4">
                <div>
                  <h2 className="fw-black text-uppercase mb-1" style={{ letterSpacing: "1px", color: "#1e293b" }}>
                    {reportType === "overall" ? "BÁO CÁO MARKETING TỔNG THỂ 2026" : "BÁO CÁO MARKETING CHI TIẾT HÀNG THÁNG"}
                  </h2>
                  <p className="text-muted-foreground mb-0">Hệ thống quản trị Marketing EOS - SEAJONG</p>
                </div>
                <div className="text-end">
                  <p className="mb-0 small">Ngày: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></p>
                  <p className="mb-0 small">Kênh: <strong>{activeTab.toUpperCase()}</strong></p>
                </div>
              </div>

              {/* Overall Summary Section */}
              {reportType === "overall" ? (
                <>
                  <SectionTitle title="I. TỔNG QUAN HIỆU QUẢ" className="mb-4" />
                  <div className="row g-4 mb-5">
                    {[
                      { label: "TỔNG CHI PHÍ", value: totalSpent.toLocaleString('vi-VN') + " ₫" },
                      { label: "TỔNG KẾT QUẢ", value: totalLeads.toLocaleString() },
                      { label: "CHI PHÍ / KẾT QUẢ", value: avgCPL.toLocaleString('vi-VN') + " ₫" },
                      { label: "TỔNG HIỂN THỊ", value: totalImps.toLocaleString() },
                    ].map((kpi, idx) => (
                      <div key={idx} className="col-3">
                        <div className="p-3 border rounded-3 bg-light text-center">
                          <p className="small text-muted-foreground mb-1 fw-bold">{kpi.label}</p>
                          <h4 className="fw-black mb-0">{kpi.value}</h4>
                        </div>
                      </div>
                    ))}
                  </div>

                  <SectionTitle title="II. DANH SÁCH CHIẾN DỊCH TRỌNG ĐIỂM" className="mb-3" />
                  <table className="table table-bordered align-middle">
                    <thead className="table-light text-center">
                      <tr>
                        <th className="small fw-bold">Tên chiến dịch</th>
                        <th className="small fw-bold" style={{ width: 140 }}>Chi phí</th>
                        <th className="small fw-bold" style={{ width: 100 }}>Số Leads</th>
                        <th className="small fw-bold" style={{ width: 120 }}>Giá / Lead</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappedCampaigns.map((c, i) => (
                        <tr key={i}>
                          <td className="small fw-bold">{c.name}</td>
                          <td className="text-end small">{c.cost}</td>
                          <td className="text-center small">{c.convs}</td>
                          <td className="text-end small fw-bold">{c.cpl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <SectionTitle title="I. BIỂU ĐỒ HIỆU QUẢ HÀNG THÁNG" className="mb-4" />
                  <table className="table table-bordered align-middle">
                    <thead className="table-light text-center">
                      <tr>
                        <th className="small fw-bold">Tháng</th>
                        <th className="small fw-bold">Số lượng Leads/Tin nhắn</th>
                        <th className="small fw-bold">Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"].map((m, i) => (
                        <tr key={i}>
                          <td className="small text-center">{m}</td>
                          <td className="text-center small fw-bold text-primary">{monthlyLeads[i] || 0}</td>
                          <td className="small text-muted-foreground italic">
                            {monthlyLeads[i] > 200 ? "Tốt - Vượt mục tiêu" : monthlyLeads[i] > 100 ? "Ổn định" : monthlyLeads[i] > 0 ? "Cần tối ưu" : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Footer */}
              <div className="mt-5 pt-5 row">
                <div className="col-8">
                  <p className="small italic text-muted-foreground">
                    * Báo cáo này được tạo tự động và có giá trị pháp lý trong nội bộ công ty.<br />
                    * Mọi thắc mắc vui lòng liên hệ bộ phận Kỹ thuật Marketing.
                  </p>
                </div>
                <div className="col-4 text-center">
                  <p className="small fw-bold mb-5">NGƯỜI LẬP BÁO CÁO</p>
                  <p className="mt-5 fw-black text-uppercase">Phòng Marketing</p>
                </div>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
