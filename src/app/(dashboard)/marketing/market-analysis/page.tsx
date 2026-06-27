"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketAnalysisPage() {
  const [formData, setFormData] = useState({
    campaignName: "Tung dòng sen vòi thông minh Seajong Wellness",
    campaignDesc: "Chiến dịch định vị dòng sen vòi âm tường thế hệ mới, tích hợp công nghệ ổn nhiệt tự động và hệ thống lọc nước sạch tích hợp tại đầu vòi cho phân khúc căn hộ chung cư cao cấp.",
    products: [] as string[],
    targetSegment: "Cao cấp",
    channels: ["Nhà thầu/KTS", "Digital Marketing", "Showroom"],
    timeline: "Q3 - Q4/2026",
    budget: "500.000.000",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"strategy" | "competitor" | "supply" | "chat">("strategy");

  // Dynamic competitors count & USD rate
  const [competitorsCount, setCompetitorsCount] = useState<number | null>(null);
  const [competitorNames, setCompetitorNames] = useState<string>("Đang tải...");
  const [usdRate, setUsdRate] = useState<number | null>(null);

  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  useEffect(() => {
    // Fetch competitors
    fetch("/api/competitors")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setCompetitorsCount(data.data.length);
          const names = data.data.slice(0, 3).map((c: any) => c.name).join(", ");
          setCompetitorNames(names || "Chưa có đối thủ");
        } else {
          setCompetitorsCount(0);
          setCompetitorNames("Không có dữ liệu");
        }
      })
      .catch(err => {
        console.error("Error fetching competitors:", err);
        setCompetitorsCount(4);
        setCompetitorNames("TOTO, Inax, Viglacera");
      });

    // Fetch USD rate
    fetch("/api/market-analysis/usd-rate")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.rate) {
          setUsdRate(data.rate);
        }
      })
      .catch(err => {
        console.error("Error fetching USD rate:", err);
        setUsdRate(25460); // fallback
      });

    // Fetch Seajong Categories from CSDL
    fetch("/api/seajong/categories")
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.categories) && data.categories.length > 0) {
          const names = data.categories.map((c: any) => c.name);
          setDbCategories(names);
        } else {
          setDbCategories(["Sen vòi PVD", "Smart Toilet", "Smart Shower", "Chậu tích hợp"]);
        }
      })
      .catch(err => {
        console.error("Error fetching categories:", err);
        setDbCategories(["Sen vòi PVD", "Smart Toilet", "Smart Shower", "Chậu tích hợp"]);
      });
  }, []);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: "assistant", content: "Xin chào! Tôi là Trợ lý AI Phân tích thị trường của Seajong. Bạn có câu hỏi nào về đối thủ cạnh tranh (TOTO, Inax...), xu hướng hay sản phẩm thiết bị vệ sinh, phòng tắm & nhà bếp tại Việt Nam không?" }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // Suggested Prompts
  const suggestedPrompts = [
    "So sánh bồn cầu thông minh Seajong vs TOTO Neorest?",
    "Xu hướng thiết kế sen tắm âm tường năm 2026?",
    "Làm sao tiếp cận tệp Kiến trúc sư hiệu quả?"
  ];

  const handleProductChange = (prod: string) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.includes(prod)
        ? prev.products.filter(p => p !== prod)
        : [...prev.products, prod]
    }));
  };

  const handleChannelChange = (chan: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(chan)
        ? prev.channels.filter(c => c !== chan)
        : [...prev.channels, chan]
    }));
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setShowConfigDrawer(false);

    try {
      const res = await fetch("/api/market-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName: formData.campaignName,
          campaignDesc: formData.campaignDesc,
          products: formData.products,
          targetSegment: formData.targetSegment,
          channels: formData.channels,
          timeline: formData.timeline,
          budget: formData.budget ? parseInt(formData.budget) : 0,
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setActiveTab("strategy");
      } else {
        alert("Lỗi phân tích: " + (data.error || "Không rõ nguyên nhân."));
      }
    } catch (err) {
      alert("Lỗi kết nối mạng khi phân tích.");
    } finally {
      setLoading(false);
    }
  };

  const formatNumberString = (val: string) => {
    const cleanVal = val.replace(/\D/g, "");
    if (!cleanVal) return "";
    return Number(cleanVal).toLocaleString("vi-VN").replace(/,/g, ".");
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatNumberString(rawValue);
    setFormData(prev => ({ ...prev, budget: formatted }));
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const headingParts = headingText.split(/\*\*(.*?)\*\*/g);
        const headingNodes = headingParts.map((part, pi) =>
          pi % 2 === 1 ? <strong key={pi} style={{ fontWeight: 800 }}>{part}</strong> : part
        );

        if (level === 1) return <h1 key={idx} style={{ fontSize: "15px", fontWeight: 900, marginTop: 12, marginBottom: 6, color: "var(--primary)" }}>{headingNodes}</h1>;
        if (level === 2) return <h2 key={idx} style={{ fontSize: "13.5px", fontWeight: 800, marginTop: 10, marginBottom: 5, color: "var(--primary)" }}>{headingNodes}</h2>;
        return <h3 key={idx} style={{ fontSize: "12px", fontWeight: 800, marginTop: 8, marginBottom: 4, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{headingNodes}</h3>;
      }

      // Bullet points
      const bulletMatch = line.match(/^([*-])\s+(.*)$/);
      if (bulletMatch) {
        const bulletText = bulletMatch[2];
        const bulletParts = bulletText.split(/\*\*(.*?)\*\*/g);
        const bulletNodes = bulletParts.map((part, pi) =>
          pi % 2 === 1 ? <strong key={pi} style={{ fontWeight: 700, color: "var(--foreground)" }}>{part}</strong> : part
        );
        return (
          <div key={idx} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4, paddingLeft: 6 }}>
            <span style={{ color: "#6366f1", fontWeight: 900, fontSize: 13, lineHeight: 1 }}>•</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{bulletNodes}</span>
          </div>
        );
      }

      // Empty lines
      if (line.trim() === "") {
        return <div key={idx} style={{ height: 6 }} />;
      }

      // Bold text formatting in standard paragraphs
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const inlineNodes = parts.map((part, pi) =>
        pi % 2 === 1 ? <strong key={pi} style={{ fontWeight: 700, color: "var(--foreground)" }}>{part}</strong> : part
      );
      return (
        <p key={idx} style={{ margin: "0 0 5px 0", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.45 }}>
          {inlineNodes}
        </p>
      );
    });
  };

  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || sendingChat) return;

    const userMsg = { role: "user", content: text };
    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setSendingChat(true);

    try {
      const res = await fetch("/api/market-analysis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...chatMessages, userMsg] })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", content: "Lỗi: " + (data.error || "Không thể kết nối AI.") }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối mạng." }]);
    } finally {
      setSendingChat(false);
    }
  };

  // SVGGauge Helper
  const renderScoreGauge = (score: number) => {
    const radius = 35;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (circ * score) / 100;
    return (
      <div style={{ position: "relative", width: 76, height: 76, flexShrink: 0 }}>
        <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="38" cy="38" r={radius} stroke="var(--border)" strokeWidth="6" fill="none" />
          <circle cx="38" cy="38" r={radius} stroke="#6366f1" strokeWidth="6" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: "var(--foreground)", lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 8, color: "var(--muted-foreground)", fontWeight: 700 }}>Điểm cơ hội</span>
        </div>
      </div>
    );
  };

  return (
    <StandardPage
      title="Phân tích thị trường"
      description="Thông tin trong trang này chỉ mang tính tham khảo. Quyết định thuộc về người thực thi nhiệm vụ"
      icon="bi-graph-up"
      color="indigo"
      useCard={false}
    >

      {/* ── Macro Indicators ── */}
      <div className="market-indicators-grid" style={{ marginBottom: 12 }}>
        <div className="card border-0 shadow-sm p-2.5 d-flex flex-row align-items-center gap-3" style={{ background: "var(--card)", borderRadius: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99, 102, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-bank" style={{ fontSize: 18, color: "#6366f1" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Quy mô thị trường</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>~1.6 Tỷ USD</p>
            <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500 }}><i className="bi bi-cash" style={{ marginRight: 6 }} /> Khoảng 40.000 tỷ đồng</span>
          </div>
        </div>

        <div className="card border-0 shadow-sm p-2.5 d-flex flex-row align-items-center gap-3" style={{ background: "var(--card)", borderRadius: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-graph-up-arrow" style={{ fontSize: 18, color: "#10b981" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Tốc độ tăng trưởng thị trường</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>+6.8% / năm</p>
            <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}><i className="bi bi-arrow-up-short" style={{ marginRight: 4 }} /> Tăng trưởng kép hàng năm (CAGR)</span>
          </div>
        </div>

        <div className="card border-0 shadow-sm p-2.5 d-flex flex-row align-items-center gap-3" style={{ background: "var(--card)", borderRadius: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245, 158, 11, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-currency-exchange" style={{ fontSize: 18, color: "#f59e0b" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Tỷ giá USD (USD / VND)</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>
              {usdRate === null ? (
                <i className="bi bi-arrow-repeat spin" style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                `${usdRate.toLocaleString("vi-VN")} đ`
              )}
            </p>
            <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}><i className="bi bi-globe" style={{ marginRight: 6 }} /> Cập nhật trực tiếp sàn tự do</span>
          </div>
        </div>

        <div className="card border-0 shadow-sm p-2.5 d-flex flex-row align-items-center gap-3" style={{ background: "var(--card)", borderRadius: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99, 102, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-people" style={{ fontSize: 18, color: "#6366f1" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Đối thủ đang theo dõi</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>
              {competitorsCount === null ? (
                <i className="bi bi-arrow-repeat spin" style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                `${competitorsCount} đối thủ`
              )}
            </p>
            <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500 }}><i className="bi bi-eye" style={{ marginRight: 6 }} /> {competitorNames}</span>
          </div>
        </div>
      </div>

      {/* Drawer backdrop for tablet offcanvas */}
      {showConfigDrawer && (
        <div
          onClick={() => setShowConfigDrawer(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 1040,
            cursor: "pointer"
          }}
        />
      )}

      {/* ── Main Work Split Layout ── */}
      <div className="market-analysis-layout">
        {/* Left Column - Campaign Setup */}
        <div className={`card border-0 shadow-sm p-3 d-flex flex-column custom-scrollbar campaign-setup-card ${showConfigDrawer ? "open" : ""}`} style={{ background: "var(--card)", borderRadius: 16, height: "100%", overflowY: "auto", minHeight: 0 }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-extrabold m-0" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--primary)" }}>Cấu hình chiến dịch</h5>
            <button
              type="button"
              onClick={() => setShowConfigDrawer(false)}
              className="btn-close d-drawer-close"
              style={{ display: "none" }}
            />
          </div>
          
          <form onSubmit={handleAnalyze} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label fw-bold text-secondary" style={{ fontSize: 11 }}>Tên chiến dịch sản phẩm</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={formData.campaignName}
                onChange={e => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
                placeholder="Ví dụ: Tung dòng bồn cầu thông minh Seajong..."
                required
                style={{ fontSize: 12.5 }}
              />
            </div>

            <div>
              <label className="form-label fw-bold text-secondary" style={{ fontSize: 11 }}>Mô tả chi tiết chiến dịch</label>
              <textarea
                rows={3}
                className="form-control form-control-sm"
                value={formData.campaignDesc}
                onChange={e => setFormData(prev => ({ ...prev, campaignDesc: e.target.value }))}
                placeholder="Nhập mục tiêu chiến dịch, đối tượng tiếp cận..."
                required
                style={{ fontSize: 12 }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label className="form-label fw-bold text-secondary mb-2 d-block" style={{ fontSize: 11 }}>Dòng sản phẩm trọng tâm</label>
              
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="form-select form-select-sm text-start d-flex align-items-center justify-content-between"
                style={{
                  fontSize: 12,
                  height: 36,
                  borderRadius: 8,
                  borderColor: "var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  paddingRight: 12
                }}
              >
                <span className="text-truncate" style={{ maxWidth: "90%" }}>
                  {formData.products.length > 0
                    ? formData.products.join(", ")
                    : "Chọn dòng sản phẩm..."}
                </span>
              </button>

              {dropdownOpen && (
                <>
                  <div
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 998,
                      cursor: "default"
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      zIndex: 999,
                      maxHeight: 220,
                      overflowY: "auto",
                      padding: 6
                    }}
                    className="custom-scrollbar"
                  >
                    {(dbCategories.length > 0 ? dbCategories : ["Sen vòi PVD", "Smart Toilet", "Smart Shower", "Chậu tích hợp"]).map(p => {
                      const active = formData.products.includes(p);
                      return (
                        <div
                          key={p}
                          onClick={() => handleProductChange(p)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 8px",
                            fontSize: 11.5,
                            borderRadius: 6,
                            cursor: "pointer",
                            background: active ? "rgba(99, 102, 241, 0.05)" : "transparent",
                            transition: "background 0.1s"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            readOnly
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 4,
                              accentColor: "#6366f1",
                              cursor: "pointer"
                            }}
                          />
                          <span style={{
                            color: active ? "#6366f1" : "var(--foreground)",
                            fontWeight: active ? 700 : 500
                          }}>
                            {p}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="row g-2">
              <div className="col-6">
                <label className="form-label fw-bold text-secondary" style={{ fontSize: 11 }}>Phân khúc mục tiêu</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.targetSegment}
                  onChange={e => setFormData(prev => ({ ...prev, targetSegment: e.target.value }))}
                  style={{ fontSize: 12 }}
                >
                  <option value="Cao cấp">Cao cấp</option>
                  <option value="Trung cấp">Trung cấp</option>
                  <option value="Căn hộ dự án">Căn hộ dự án</option>
                  <option value="Khách sạn/Resort">Khách sạn/Resort</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label fw-bold text-secondary" style={{ fontSize: 11 }}>Thời gian dự kiến</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={formData.timeline}
                  onChange={e => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                  placeholder="Ví dụ: Q3/2026"
                  style={{ fontSize: 12 }}
                />
              </div>
            </div>

            <div>
              <label className="form-label fw-bold text-secondary mb-2 d-block" style={{ fontSize: 11 }}>Kênh truyền thông & Phân phối</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {["Đại lý", "Showroom", "Nhà thầu/KTS", "Digital Marketing"].map(c => {
                  const active = formData.channels.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleChannelChange(c)}
                      style={{
                        padding: "6px 8px",
                        fontSize: 11.5,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: active ? "rgba(99, 102, 241, 0.08)" : "var(--background)",
                        color: active ? "#6366f1" : "var(--foreground)",
                        fontWeight: active ? 800 : 500,
                        transition: "all 0.15s",
                        textAlign: "left"
                      }}
                    >
                      <i className={`bi ${active ? "bi-check-circle-fill" : "bi-circle"} me-2`} /> {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="form-label fw-bold text-secondary" style={{ fontSize: 11 }}>Ngân sách dự kiến (VNĐ)</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={formData.budget}
                onChange={handleBudgetChange}
                placeholder="Ví dụ: 500.000.000"
                style={{ fontSize: 12 }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-sm w-100 py-2 mt-2 d-flex align-items-center justify-content-center gap-2"
              style={{
                borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                border: "none",
                fontWeight: 800,
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
              }}
            >
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat spin" style={{ animation: "spin 1s linear infinite" }} />
                  Đang phân tích dữ liệu...
                </>
              ) : (
                <>
                  <i className="bi bi-robot" />
                  Phân tích thị trường bằng AI
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column - Results / Tabs */}
        <div className="card border-0 shadow-sm p-3 d-flex flex-column" style={{ background: "var(--card)", borderRadius: 16, height: "100%", minHeight: 0 }}>
          {/* Tab Headers */}
          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3 gap-2" style={{ flexShrink: 0 }}>
            <div className="d-flex gap-2 overflow-auto custom-scrollbar" style={{ flex: 1, minWidth: 0 }}>
              {[
                { id: "strategy", label: "Đánh giá chiến lược", icon: "bi-shield-check" },
                { id: "competitor", label: "Đối thủ & Phân phối", icon: "bi-crosshair" },
                { id: "supply", label: "Chuỗi cung ứng & Cảnh báo", icon: "bi-truck-flatbed" },
                { id: "chat", label: "Trợ lý Chat AI", icon: "bi-chat-dots" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 11.5,
                    fontWeight: activeTab === t.id ? 800 : 500,
                    color: activeTab === t.id ? "#6366f1" : "var(--muted-foreground)",
                    background: activeTab === t.id ? "rgba(99, 102, 241, 0.08)" : "transparent",
                    border: "none",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s"
                  }}
                >
                  <i className={`bi ${t.icon}`} style={{ marginRight: 6 }} />
                  {t.label}
                </button>
              ))}
            </div>
            
            {loading && (
              <span
                className="show-drawer-btn"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#ef4444",
                  marginRight: 6,
                  alignSelf: "center",
                  animation: "pulse-dot 1.2s infinite ease-in-out",
                  flexShrink: 0
                }}
              />
            )}

            <button
              onClick={() => setShowConfigDrawer(true)}
              className="btn btn-outline-primary btn-sm show-drawer-btn"
              style={{
                display: "flex",
                alignItems: "center",
                height: 32,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                flexShrink: 0,
                borderColor: "#6366f1",
                color: "#6366f1",
                padding: "0 10px"
              }}
            >
              <i className="bi bi-gear-fill" style={{ fontSize: 12, marginRight: 6 }} /> Cấu hình
            </button>
          </div>

          {/* Tab Body */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <AnimatePresence mode="wait">
              {activeTab === "chat" ? (
                // Chatbot Assistant Tab (Always Active & independent of analysis result)
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
                >
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4, marginBottom: 12 }} className="custom-scrollbar">
                    {chatMessages.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                          width: "100%"
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "80%",
                            padding: "10px 14px",
                            borderRadius: 12,
                            fontSize: 12.5,
                            lineHeight: 1.4,
                            background: m.role === "user" ? "#6366f1" : "var(--accent)",
                            color: m.role === "user" ? "#fff" : "var(--foreground)",
                            border: m.role === "user" ? "none" : "1px solid var(--border)",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.02)"
                          }}
                        >
                          {m.role === "user" ? m.content : renderMarkdown(m.content)}
                        </div>
                      </div>
                    ))}
                    {sendingChat && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ padding: "10px 14px", borderRadius: 12, fontSize: 12.5, background: "var(--accent)", color: "var(--muted-foreground)" }}>
                          <i className="bi bi-arrow-repeat spin me-2" style={{ animation: "spin 1s linear infinite" }} />
                          Trợ lý Seajong đang suy nghĩ...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  <div className="mb-2 d-flex flex-wrap gap-1.5">
                    {suggestedPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(p)}
                        style={{
                          fontSize: 10.5,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          color: "var(--muted-foreground)",
                          textAlign: "left",
                          cursor: "pointer"
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Input Chat */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSendChat()}
                      placeholder="Hỏi về đối thủ, sản phẩm hoặc dự báo ngành thiết bị vệ sinh..."
                      style={{ fontSize: 12.5, height: 38, borderRadius: 10 }}
                    />
                    <button
                      onClick={() => handleSendChat()}
                      disabled={sendingChat || !inputMessage.trim()}
                      className="btn btn-primary btn-sm d-flex align-items-center justify-content-center"
                      style={{ width: 38, height: 38, borderRadius: 10, background: "#6366f1", border: "none" }}
                    >
                      <i className="bi bi-send-fill" style={{ fontSize: 12 }} />
                    </button>
                  </div>
                </motion.div>
              ) : !result ? (
                // Placeholder when no analysis is performed
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="d-flex flex-column align-items-center justify-content-center text-center p-5"
                  style={{ flex: 1 }}
                >
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(99, 102, 241, 0.08)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <i className="bi bi-robot" style={{ fontSize: 28, color: "#6366f1" }} />
                  </div>
                  <h6 className="fw-bold" style={{ fontSize: 14 }}>Sẵn sàng phân tích</h6>
                  <p className="text-muted" style={{ fontSize: 12, maxWidth: 320 }}>
                    Nhập thông tin chiến dịch marketing ở biểu mẫu bên trái và click **"Phân tích thị trường bằng AI"** để khởi tạo báo cáo.
                  </p>
                </motion.div>
              ) : (
                // Render analysis results tabs
                <>
                  {activeTab === "strategy" && (
                    <motion.div
                      key="strategy"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="d-flex flex-column gap-3 custom-scrollbar"
                      style={{ flex: 1, overflowY: "auto", paddingRight: 4, paddingBottom: 24 }}
                    >
                      <div className="d-flex align-items-center gap-3 p-3" style={{ background: "var(--accent)", borderRadius: 12 }}>
                        {renderScoreGauge(result.opportunityScore || 80)}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="fw-bold" style={{ fontSize: 14 }}>Chiến dịch: {formData.campaignName}</span>
                            <span style={{ fontSize: 9, fontWeight: 800, background: result.riskLevel === "Cao" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)", color: result.riskLevel === "Cao" ? "#ef4444" : "#f59e0b", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>
                              Rủi ro: {result.riskLevel || "Trung bình"}
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                            {result.executiveSummary}
                          </p>
                        </div>
                      </div>

                      {/* SWOT Matrix Grid */}
                      <div>
                        <h6 className="fw-extrabold mb-2" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>Ma trận phân tích SWOT AI</h6>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div className="p-3" style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: 10 }}>
                            <div className="fw-bold text-success mb-1" style={{ fontSize: 11 }}><i className="bi bi-shield-plus me-1" /> S - Điểm mạnh (USP)</div>
                            <ul style={{ margin: 0, paddingLeft: 12, fontSize: 10.5, color: "var(--foreground)" }}>
                              {result.productInsights?.uniqueSellingPoints?.map((usp: string, idx: number) => (
                                <li key={idx}>{usp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-3" style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: 10 }}>
                            <div className="fw-bold text-danger mb-1" style={{ fontSize: 11 }}><i className="bi bi-exclamation-octagon me-1" /> W - Rủi ro sản phẩm</div>
                            <ul style={{ margin: 0, paddingLeft: 12, fontSize: 10.5, color: "var(--foreground)" }}>
                              {result.productInsights?.productRisks?.map((risk: string, idx: number) => (
                                <li key={idx}>{risk}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-3" style={{ background: "rgba(99, 102, 241, 0.06)", border: "1px solid rgba(99, 102, 241, 0.15)", borderRadius: 10 }}>
                            <div className="fw-bold text-primary mb-1" style={{ fontSize: 11 }}><i className="bi bi-graph-up-arrow me-1" /> O - Cơ hội thị trường</div>
                            <ul style={{ margin: 0, paddingLeft: 12, fontSize: 10.5, color: "var(--foreground)", lineHeight: 1.35 }}>
                              {result.marketFit?.gapOpportunity && (
                                <li style={{ marginBottom: 4 }}><strong>Khoảng trống:</strong> {result.marketFit.gapOpportunity}</li>
                              )}
                              {result.competitorIntel?.competitiveAdvantage && (
                                <li style={{ marginBottom: 4 }}><strong>Lợi thế:</strong> {result.competitorIntel.competitiveAdvantage}</li>
                              )}
                              {result.marketFit?.seasonality && (
                                <li><strong>Thời điểm:</strong> {result.marketFit.seasonality}</li>
                              )}
                            </ul>
                          </div>

                          <div className="p-3" style={{ background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.15)", borderRadius: 10 }}>
                            <div className="fw-bold text-warning mb-1" style={{ fontSize: 11 }}><i className="bi bi-cone-striped me-1" /> T - Thách thức cạnh tranh</div>
                            <ul style={{ margin: 0, paddingLeft: 12, fontSize: 10.5, color: "var(--foreground)", lineHeight: 1.35 }}>
                              {result.competitorIntel?.counterStrategy && (
                                <li style={{ marginBottom: 4 }}><strong>Chiến thuật:</strong> {result.competitorIntel.counterStrategy}</li>
                              )}
                              {result.competitorIntel?.keyThreats?.length > 0 && (
                                <li style={{ marginBottom: 4 }}>
                                  <strong>Mối đe dọa:</strong> {result.competitorIntel.keyThreats.map((ct: any) => `${ct.brand} (${ct.threat})`).join("; ")}
                                </li>
                              )}
                              {result.marketFit?.targetSegmentAnalysis && (
                                <li><strong>Phân khúc:</strong> {result.marketFit.targetSegmentAnalysis}</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Action Plan */}
                      <div>
                        <h6 className="fw-extrabold mb-2" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>Kế hoạch hành động đề xuất</h6>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div className="p-2" style={{ background: "var(--accent)", borderRadius: 8 }}>
                            <div className="fw-bold text-primary" style={{ fontSize: 10.5 }}>NGAY LẬP TỨC (0 - 2 TUẦN)</div>
                            <ul style={{ margin: 0, paddingLeft: 12, fontSize: 11, color: "var(--foreground)" }}>
                              {result.actionPlan?.immediate?.map((act: string, idx: number) => (
                                <li key={idx}>{act}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-2" style={{ background: "var(--accent)", borderRadius: 8 }}>
                            <div className="fw-bold text-success" style={{ fontSize: 10.5 }}>NGẮN HẠN (1 - 3 THÁNG)</div>
                            <ul style={{ margin: 0, paddingLeft: 12, fontSize: 11, color: "var(--foreground)" }}>
                              {result.actionPlan?.shortTerm?.map((act: string, idx: number) => (
                                <li key={idx}>{act}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-2" style={{ background: "var(--accent)", borderRadius: 8 }}>
                            <div className="fw-bold text-warning" style={{ fontSize: 10.5 }}>DÀI HẠN (3 - 12 THÁNG)</div>
                            <ul style={{ margin: 0, paddingLeft: 12, fontSize: 11, color: "var(--foreground)" }}>
                              {result.actionPlan?.longTerm?.map((act: string, idx: number) => (
                                <li key={idx}>{act}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Final Verdict Callout */}
                      <div className="p-2.5 text-center mt-1" style={{ border: "1px dashed #6366f1", borderRadius: 10, background: "rgba(99, 102, 241, 0.02)" }}>
                        <div className="fw-bold text-primary mb-1" style={{ fontSize: 11 }}><i className="bi bi-award-fill me-1" /> Kết luận chiến lược của AI</div>
                        <p style={{ margin: 0, fontSize: 11.5, fontStyle: "italic", lineHeight: 1.3 }}>
                          "{result.finalVerdict}"
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "competitor" && (
                    <motion.div
                      key="competitor"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="d-flex flex-column gap-3 custom-scrollbar"
                      style={{ flex: 1, overflowY: "auto", paddingRight: 4, paddingBottom: 24 }}
                    >
                      {/* Competitor Threats Table */}
                      <div>
                        <h6 className="fw-extrabold mb-2" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>Đánh giá mối đe dọa đối thủ</h6>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid var(--border)" }}>
                              <th style={{ padding: "6px", textAlign: "left", color: "var(--muted-foreground)", width: "130px" }}>Thương hiệu</th>
                              <th style={{ padding: "6px", textAlign: "left", color: "var(--muted-foreground)", width: "120px" }}>Mức đe dọa</th>
                              <th style={{ padding: "6px", textAlign: "left", color: "var(--muted-foreground)" }}>Mô tả</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.competitorIntel?.keyThreats?.map((ct: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "6px", fontWeight: 700 }}>{ct.brand}</td>
                                <td style={{ padding: "6px" }}>
                                  <span style={{
                                    fontSize: 9, fontWeight: 800,
                                    background: ct.level === "Cao" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                    color: ct.level === "Cao" ? "#ef4444" : "#f59e0b",
                                    padding: "2px 6px", borderRadius: 4,
                                    whiteSpace: "nowrap"
                                  }}>
                                    {ct.level}
                                  </span>
                                </td>
                                <td style={{ padding: "6px", color: "var(--muted-foreground)", fontSize: 11.5 }}>{ct.threat}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pricing discount and strategy */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div className="p-3" style={{ background: "var(--accent)", borderRadius: 12 }}>
                          <h6 className="fw-bold" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Chiết khấu tham chiếu ngành</h6>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "#6366f1", marginTop: 4 }}>{result.competitorIntel?.discountBenchmark || "30 - 45%"}</div>
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.3 }}>{result.productInsights?.pricingStrategy}</p>
                        </div>

                        <div className="p-3" style={{ background: "var(--accent)", borderRadius: 12 }}>
                          <h6 className="fw-bold" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Kênh phân phối chủ đạo</h6>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "#10b981", marginTop: 4 }}>{result.channelStrategy?.primaryChannel?.name}</div>
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.3 }}>{result.channelStrategy?.primaryChannel?.reason}</p>
                        </div>
                      </div>

                      {/* KTS Influence strategy */}
                      <div className="p-3" style={{ background: "var(--accent)", borderRadius: 12 }}>
                        <h6 className="fw-bold mb-2" style={{ fontSize: 11.5, color: "var(--foreground)", textTransform: "uppercase" }}><i className="bi bi-building text-primary" style={{ marginRight: 6 }} />Chiến lược tiếp cận Kiến trúc sư & Nhà thầu</h6>
                        <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                          {result.channelStrategy?.ktsInfluenceStrategy}
                        </p>
                      </div>

                      {/* Content Recommendations */}
                      <div>
                        <h6 className="fw-extrabold mb-1.5" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>Gợi ý nội dung truyền thông</h6>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {result.channelStrategy?.contentRecommendations?.map((rec: string, idx: number) => (
                            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5 }}>
                              <i className="bi bi-chat-heart text-danger mt-0.5" />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "supply" && (
                    <motion.div
                      key="supply"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="d-flex flex-column gap-3 custom-scrollbar"
                      style={{ flex: 1, overflowY: "auto", paddingRight: 4, paddingBottom: 24 }}
                    >
                      <div className="d-flex justify-content-between align-items-center p-3 gap-3" style={{ background: "var(--accent)", borderRadius: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h6 className="fw-bold" style={{ fontSize: 12 }}>Rủi ro chuỗi cung ứng tổng quát</h6>
                          <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>{result.supplyChainAlert?.procurementAdvice}</p>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 900,
                          background: result.supplyChainAlert?.overallRisk === "Cao" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: result.supplyChainAlert?.overallRisk === "Cao" ? "#ef4444" : "#f59e0b",
                          padding: "4px 10px", borderRadius: 6, textTransform: "uppercase",
                          whiteSpace: "nowrap", flexShrink: 0
                        }}>
                          {result.supplyChainAlert?.overallRisk}
                        </span>
                      </div>

                      {/* Alerts list */}
                      <div>
                        <h6 className="fw-extrabold mb-2" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>Cảnh báo chi tiết yếu tố rủi ro</h6>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {result.supplyChainAlert?.alerts?.map((al: any, idx: number) => (
                            <div key={idx} className="p-3 d-flex gap-3 align-items-start" style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)" }}>
                              <i className="bi bi-exclamation-diamond-fill text-warning mt-0.5" style={{ fontSize: 14 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                                  <span className="fw-bold" style={{ fontSize: 11.5 }}>Yếu tố: {al.factor}</span>
                                  <span style={{ fontSize: 8.5, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "1px 6px", borderRadius: 3, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>Khẩn cấp: {al.urgency}</span>
                                </div>
                                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.35 }}>{al.impact}</p>
                                <div style={{ marginTop: 6, fontSize: 10.5, color: "#6366f1", fontWeight: 700 }}><i className="bi bi-arrow-right-short" style={{ marginRight: 2 }} />Khuyên: {al.action}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Early Warning Signals */}
                      <div>
                        <h6 className="fw-extrabold mb-2" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>Các chỉ số cảnh báo sớm (EWS) cần theo dõi</h6>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid var(--border)" }}>
                              <th style={{ padding: "6px", textAlign: "left", color: "var(--muted-foreground)", width: "30%" }}>Chỉ số</th>
                              <th style={{ padding: "6px", textAlign: "left", color: "var(--muted-foreground)", width: "25%" }}>Ngưỡng cảnh báo</th>
                              <th style={{ padding: "6px", textAlign: "left", color: "var(--muted-foreground)" }}>Hành động khi chạm ngưỡng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.earlyWarningSignals?.map((ews: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "6px", fontWeight: 700, fontSize: 11.5 }}>{ews.signal}</td>
                                <td style={{ padding: "6px", color: "#ef4444", fontWeight: 800 }}>{ews.threshold}</td>
                                <td style={{ padding: "6px", color: "var(--muted-foreground)", fontSize: 11 }}>{ews.action}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-dot {
          0%, 100% {
            transform: scale(0.85);
            opacity: 0.5;
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
            box-shadow: 0 0 6px 3px rgba(239, 68, 68, 0.7);
          }
        }
        .market-indicators-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .market-analysis-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 20px;
          align-items: stretch;
          flex: 1;
          min-height: 0;
        }
        .show-drawer-btn {
          display: none !important;
        }
        @media (max-width: 1024px) {
          /* Show toggle button in header on tablet */
          .show-drawer-btn {
            display: flex !important;
          }
          /* Add horizontal and bottom padding to the page content on iPad */
          .standard-page-content {
            padding-left: 20px !important;
            padding-right: 20px !important;
            padding-bottom: 24px !important;
            overflow: hidden !important; /* Prevent page outer scroll */
          }
          /* Add horizontal padding to the page header bar to align with page content */
          .page-header-bar {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          .market-indicators-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
            margin-top: 20px !important; /* Increase top margin on iPad */
            margin-bottom: 16px !important;
          }
          .market-analysis-layout {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            /* Calculate height relative to dynamic viewport to fit tablet screens perfectly */
            height: calc(100dvh - 350px) !important;
            min-height: 0 !important;
            flex: none !important;
          }
          /* Offcanvas Drawer for Campaign Config on iPad */
          .campaign-setup-card {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 400px !important;
            max-width: 85% !important;
            z-index: 1050 !important;
            transform: translateX(-100%);
            transition: transform 0.3s ease-in-out;
            box-shadow: 5px 0 25px rgba(0,0,0,0.15) !important;
            border-radius: 0 !important;
            height: 100dvh !important; /* Use dynamic viewport height to auto-adjust for browser address bar */
          }
          .campaign-setup-card.open {
            transform: translateX(0) !important;
          }
          .d-drawer-close {
            display: block !important;
          }
          /* Card padding on iPad */
          .card {
            padding: 16px 16px 20px 16px !important;
          }
          /* Indicator cards padding on iPad (more compact) */
          .market-indicators-grid .card {
            padding: 10px 14px !important;
          }
          /* Table cell padding on iPad */
          th, td {
            padding: 6px 8px !important;
          }
        }
        @media (max-width: 640px) {
          .market-indicators-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </StandardPage>
  );
}
