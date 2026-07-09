"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { BrandButton } from "@/components/ui/BrandButton";
import toast from "react-hot-toast";

interface Competitor {
  id: string;
  name: string;
  website: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  shopeeUrl?: string;
  lazadaUrl?: string;
  status: string;
  automationStatus: string;
  webhookToken?: string;
  swot?: string;
  metrics?: string;
  scores?: string;
  aiSummary?: string;
  strategySuggestions?: string;
  newsHighlights?: string;
  lastScan?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newComp, setNewComp] = useState({
    name: "",
    website: "",
    facebookUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    instagramUrl: "",
    shopeeUrl: "",
    lazadaUrl: "",
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/competitors");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCompetitors(data);
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách đối thủ");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (id: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/marketing/competitors/${id}/analyze`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        toast.success("Đã hoàn thành phân tích AI");
        setCompetitors(prev => prev.map(c => c.id === id ? updated : c));
      } else {
        toast.error("Phân tích AI thất bại");
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEdit(false);
    setNewComp({ name: "", website: "", facebookUrl: "", tiktokUrl: "", youtubeUrl: "", instagramUrl: "", shopeeUrl: "", lazadaUrl: "" });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (comp: Competitor) => {
    setIsEdit(true);
    setNewComp({
      name: comp.name,
      website: comp.website,
      facebookUrl: comp.facebookUrl || "",
      tiktokUrl: comp.tiktokUrl || "",
      youtubeUrl: comp.youtubeUrl || "",
      instagramUrl: comp.instagramUrl || "",
      shopeeUrl: comp.shopeeUrl || "",
      lazadaUrl: comp.lazadaUrl || "",
    });
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/marketing/competitors/${selectedId}` : "/api/marketing/competitors";
      const method = isEdit ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newComp),
      });
      
      if (res.ok) {
        toast.success(isEdit ? "Đã cập nhật thông tin" : "Đã thêm đối thủ thành công");
        setIsAddOpen(false);
        fetchCompetitors();
      } else {
        toast.error("Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Lỗi kết nối server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa đối thủ này khỏi danh sách theo dõi?")) return;
    
    try {
      const res = await fetch(`/api/marketing/competitors/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xóa đối thủ");
        if (selectedId === id) setSelectedId(null);
        fetchCompetitors();
      }
    } catch (error) {
      toast.error("Lỗi khi xóa đối thủ");
    }
  };

  const filteredCompetitors = competitors.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.website.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCompetitor = competitors.find(c => c.id === selectedId);

  // ── LEFT TOP: Search & Add Button ──
  const LeftHeader = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Danh sách theo dõi</h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", background: "var(--muted)", padding: "2px 8px", borderRadius: 10 }}>
          {competitors.length} đối thủ
        </span>
      </div>
      
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 13 }} />
          <input 
            type="text" placeholder="Tìm đối thủ..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", height: 40, padding: "0 12px 0 36px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 13, outline: "none" }} 
          />
        </div>
        <BrandButton 
          icon="bi-plus-lg" onClick={handleOpenAdd} title="Thêm đối thủ mới"
          style={{ height: 40, width: 40, padding: 0, borderRadius: "50%", fontSize: "20px", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 4px 10px rgba(0, 48, 135, 0.2)" }}
        >{null}</BrandButton>
      </div>
    </div>
  );

  // ── LEFT CONTENT: Competitor List ──
  const LeftList = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 12, background: "var(--muted)", animation: "pulse 2s infinite" }} />)
        ) : filteredCompetitors.map((comp) => (
          <motion.div
            key={comp.id} whileHover={{ x: 4 }} onClick={() => setSelectedId(comp.id)}
            style={{ 
              padding: "14px 16px", borderRadius: 12, cursor: "pointer", position: "relative",
              background: selectedId === comp.id ? "rgba(var(--primary-rgb), 0.04)" : "var(--card)",
              border: `1px solid ${selectedId === comp.id ? "var(--primary)" : "transparent"}`,
              boxShadow: selectedId === comp.id ? "0 4px 12px rgba(var(--primary-rgb), 0.1)" : "none",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>{comp.name}</h4>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{comp.website}</p>
              </div>
              <button onClick={(e) => handleDelete(comp.id, e)} style={{ border: "none", background: "none", color: "var(--muted-foreground)", padding: "4px", cursor: "pointer", opacity: 0.5 }} title="Xóa">
                <i className="bi bi-trash3" />
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {comp.facebookUrl && <i className="bi bi-facebook" style={{ fontSize: 12, color: "#1877f2" }} />}
                {comp.tiktokUrl && <i className="bi bi-tiktok" style={{ fontSize: 12, color: "#000" }} />}
                {comp.youtubeUrl && <i className="bi bi-youtube" style={{ fontSize: 12, color: "#f00" }} />}
              </div>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{new Date(comp.updatedAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </motion.div>
        ))}
        {!loading && filteredCompetitors.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted-foreground)" }}>
            <i className="bi bi-search" style={{ fontSize: 24, opacity: 0.3, display: "block", marginBottom: 10 }} />
            <p style={{ fontSize: 13, margin: 0 }}>Chưa có đối thủ nào</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <SplitLayoutPage
        title="Theo dõi đối thủ"
        description="Theo dõi tự động định vị giá, phân tích SWOT và chiến lược truyền thông của đối thủ"
        icon="bi-binoculars"
        color="rose"
        leftCols={4}
        leftTopContent={LeftHeader}
        leftContent={LeftList}
        rightContent={
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--card)", overflow: "hidden", borderRadius: 16 }}>
            {selectedCompetitor ? (() => {
              const swot = JSON.parse(selectedCompetitor.swot || "{}");
              const metrics = JSON.parse(selectedCompetitor.metrics || "{}");
              const strategy = JSON.parse(selectedCompetitor.strategySuggestions || "{}");
              const highlights = JSON.parse(selectedCompetitor.newsHighlights || "[]");
              
              return (
                <>
                  {/* FIXED HEADER */}
                  <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--card)", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>{selectedCompetitor.name}</h2>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>{selectedCompetitor.website}</p>
                        {selectedCompetitor.lastScan && (
                          <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--muted)", borderRadius: 4, color: "var(--muted-foreground)" }}>
                            Cập nhật: {new Date(selectedCompetitor.lastScan).toLocaleString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <BrandButton 
                        variant="outline" icon="bi-stars" 
                        loading={isAnalyzing}
                        onClick={() => handleAnalyze(selectedCompetitor.id)} 
                        style={{ background: "rgba(var(--primary-rgb), 0.05)", border: "1px solid var(--primary)", color: "var(--primary)", height: 32, fontSize: 12 }}
                      >
                        Phân tích AI
                      </BrandButton>
                      <BrandButton variant="outline" icon="bi-pencil-square" onClick={() => handleOpenEdit(selectedCompetitor)} style={{ height: 32, fontSize: 12 }}>Sửa</BrandButton>
                    </div>
                  </div>

                  {/* SCROLLABLE BODY */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      
                      {/* Summary Section */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {(() => {
                          const summary = selectedCompetitor.aiSummary;
                          if (!summary) return (
                            <div style={{ background: "rgba(var(--primary-rgb), 0.03)", padding: "14px 18px", borderRadius: 12, borderLeft: "4px solid var(--primary)" }}>
                              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--foreground)", fontWeight: 500 }}>
                                Chưa có bản tóm tắt AI. Nhấn 'Phân tích AI' để bắt đầu thu thập dữ liệu.
                              </p>
                            </div>
                          );

                          const compareKeyword = "SO SÁNH VỚI SEAJONG:";
                          const compareIndex = summary.indexOf(compareKeyword);

                          if (compareIndex !== -1) {
                            const generalSummary = summary.substring(0, compareIndex).trim();
                            const comparisonText = summary.substring(compareIndex + compareKeyword.length).trim();
                            
                            return (
                              <>
                                {generalSummary && (
                                  <div style={{ background: "rgba(var(--primary-rgb), 0.03)", padding: "14px 18px", borderRadius: 12, borderLeft: "4px solid var(--primary)" }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {generalSummary.split('\\n').filter(p => p.trim()).map((p, i) => (
                                        <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--foreground)", fontWeight: 500, textAlign: "justify" }}>{p.trim()}</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px 20px", borderRadius: 12, boxShadow: "0 4px 12px rgba(29, 78, 216, 0.05)" }}>
                                  <h4 style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 900, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase" }}>
                                    <i className="bi bi-boxes" style={{ fontSize: 16 }} /> So sánh trực tiếp với Seajong
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {comparisonText.split('\\n').filter(p => p.trim()).map((p, i) => (
                                      <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#1e3a8a", fontWeight: 500, textAlign: "justify" }}>{p.trim()}</p>
                                    ))}
                                  </div>
                                </div>
                              </>
                            );
                          }

                          return (
                            <div style={{ background: "rgba(var(--primary-rgb), 0.03)", padding: "14px 18px", borderRadius: 12, borderLeft: "4px solid var(--primary)" }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {summary.split('\\n').filter(p => p.trim()).map((p, i) => (
                                  <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--foreground)", fontWeight: 500, textAlign: "justify" }}>{p.trim()}</p>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Channel Activities Section */}
                      {Object.keys(metrics).length > 0 && !metrics.adCount && (
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)" }}>Hoạt động quảng cáo Đa kênh</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {Object.entries(metrics).map(([channel, activity]) => {
                              if (!activity || (activity as string).includes("Chưa có dữ liệu") || (activity as string).includes("không có dữ liệu")) return null;
                              
                              let iconClass = "bi-globe";
                              let bgColor = "#6366f1";
                              if (channel.toLowerCase() === "facebook") { iconClass = "bi-facebook"; bgColor = "#1877f2"; }
                              if (channel.toLowerCase() === "tiktok") { iconClass = "bi-tiktok"; bgColor = "#000"; }
                              if (channel.toLowerCase() === "youtube") { iconClass = "bi-youtube"; bgColor = "#f00"; }
                              if (channel.toLowerCase() === "shopee") { iconClass = "bi-bag-fill"; bgColor = "#ee4d2d"; }

                              return (
                                <div key={channel} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "var(--muted)", padding: "12px", borderRadius: 10 }}>
                                  <div style={{ 
                                    width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                    background: bgColor, color: "#fff"
                                  }}>
                                    <i className={`bi ${iconClass}`} style={{ fontSize: 14 }} />
                                  </div>
                                  <div>
                                    <h5 style={{ margin: "0 0 4px 0", fontSize: 12, fontWeight: 800, color: "var(--foreground)" }}>{channel}</h5>
                                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{activity as string}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* DOS & DON'TS (Strategy Suggestions) */}
                      {(strategy.dos?.length > 0 || strategy.donts?.length > 0) && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          {strategy.dos?.length > 0 && (
                            <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 12, padding: 16 }}>
                              <h5 style={{ margin: "0 0 12px 0", fontSize: 11, fontWeight: 900, color: "#166534", display: "flex", alignItems: "center", gap: 8 }}>
                                <i className="bi bi-check-circle-fill" /> CHIẾN THUẬT NÊN LÀM
                              </h5>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {strategy.dos.map((item: string, i: number) => (
                                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "#166534", lineHeight: 1.4 }}>
                                    <span style={{ flexShrink: 0 }}>•</span>
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {strategy.donts?.length > 0 && (
                            <div style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 12, padding: 16 }}>
                              <h5 style={{ margin: "0 0 12px 0", fontSize: 11, fontWeight: 900, color: "#991b1b", display: "flex", alignItems: "center", gap: 8 }}>
                                <i className="bi bi-x-circle-fill" /> SAI LẦM CẦN TRÁNH
                              </h5>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {strategy.donts.map((item: string, i: number) => (
                                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "#991b1b", lineHeight: 1.4 }}>
                                    <span style={{ flexShrink: 0 }}>•</span>
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SWOT Grid (FULL 4 BOXES) */}
                      {(swot.strengths?.length > 0 || swot.weaknesses?.length > 0 || swot.opportunities?.length > 0 || swot.threats?.length > 0) && (
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)" }}>Phân tích SWOT</h4>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {/* Strengths */}
                            {swot.strengths?.length > 0 && (
                              <div style={{ background: "var(--muted)", padding: 12, borderRadius: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)", marginBottom: 8 }}>
                                  <i className="bi bi-plus-circle-fill" style={{ fontSize: 10, color: "#16a34a" }} />
                                  <span style={{ fontSize: 10, fontWeight: 800 }}>ĐIỂM MẠNH</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--foreground)", display: "flex", flexDirection: "column", gap: 4 }}>
                                  {swot.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                            {/* Weaknesses */}
                            {swot.weaknesses?.length > 0 && (
                              <div style={{ background: "var(--muted)", padding: 12, borderRadius: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)", marginBottom: 8 }}>
                                  <i className="bi bi-dash-circle-fill" style={{ fontSize: 10, color: "#dc2626" }} />
                                  <span style={{ fontSize: 10, fontWeight: 800 }}>ĐIỂM YẾU</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--foreground)", display: "flex", flexDirection: "column", gap: 4 }}>
                                  {swot.weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                            {/* Opportunities */}
                            {swot.opportunities?.length > 0 && (
                              <div style={{ background: "var(--muted)", padding: 12, borderRadius: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)", marginBottom: 8 }}>
                                  <i className="bi bi-lightbulb-fill" style={{ fontSize: 10, color: "#2563eb" }} />
                                  <span style={{ fontSize: 10, fontWeight: 800 }}>CƠ HỘI</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--foreground)", display: "flex", flexDirection: "column", gap: 4 }}>
                                  {swot.opportunities.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                            {/* Threats */}
                            {swot.threats?.length > 0 && (
                              <div style={{ background: "var(--muted)", padding: 12, borderRadius: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)", marginBottom: 8 }}>
                                  <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 10, color: "#d97706" }} />
                                  <span style={{ fontSize: 10, fontWeight: 800 }}>THÁCH THỨC</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--foreground)", display: "flex", flexDirection: "column", gap: 4 }}>
                                  {swot.threats.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Recent Highlights */}
                      {highlights.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 11, fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)" }}>Hoạt động nổi bật gần đây</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {highlights.map((h: string, i: number) => (
                              <div key={i} style={{ padding: "10px 14px", background: "var(--muted)", borderRadius: 10, fontSize: 11, display: "flex", alignItems: "center", gap: 10 }}>
                                <i className="bi bi-lightning-charge-fill" style={{ color: "#d97706" }} />
                                {h}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metrics Card */}
                      {metrics.topPlatform && (
                        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
                          <h4 style={{ fontSize: 10, fontWeight: 800, marginBottom: 12, color: "var(--foreground)" }}>CHỈ SỐ QUAN TRỌNG</h4>
                          <div style={{ display: "flex", gap: 24 }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", fontWeight: 700 }}>Chiến dịch Ads</p>
                              <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 900, color: "var(--primary)" }}>{metrics.adCount} đang chạy</p>
                            </div>
                            <div style={{ width: 1, background: "var(--border)" }} />
                            <div>
                              <p style={{ margin: 0, fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", fontWeight: 700 }}>Tương tác TB</p>
                              <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 900, color: "#16a34a" }}>{metrics.engagementRate}</p>
                            </div>
                            <div style={{ width: 1, background: "var(--border)" }} />
                            <div>
                              <p style={{ margin: 0, fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", fontWeight: 700 }}>Kênh mạnh nhất</p>
                              <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 900, color: "#000" }}>{metrics.topPlatform}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })() : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
                <div style={{ textAlign: "center" }}>
                  <i className="bi bi-robot" style={{ fontSize: 40, opacity: 0.1, display: "block", marginBottom: 16 }} />
                  Chọn một đối thủ để xem phân tích AI chuyên sâu
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* ── Add Competitor Offcanvas ── */}
      <AnimatePresence>
        {isAddOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 1050 }} onClick={() => setIsAddOpen(false)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: "var(--card)", zIndex: 1051, borderLeft: "1px solid var(--border)", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}
            >
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(var(--foreground-rgb), 0.01)" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{isEdit ? "Chỉnh sửa đối thủ" : "Thêm đối thủ mới"}</h3>
                <button onClick={() => setIsAddOpen(false)} style={{ border: "none", cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--muted)", color: "var(--muted-foreground)" }}><i className="bi bi-x-lg" /></button>
              </div>

              <form id="competitor-form" onSubmit={handleAddSubmit} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--muted-foreground)" }}>Tên thương hiệu / Đối thủ</label>
                  <input type="text" required placeholder="VD: Nội thất A-Home" value={newComp.name} onChange={e => setNewComp({...newComp, name: e.target.value})} style={{ width: "100%", height: 42, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block", color: "var(--muted-foreground)" }}>Website URL</label>
                  <input type="url" placeholder="https://example.com" value={newComp.website} onChange={e => setNewComp({...newComp, website: e.target.value})} style={{ width: "100%", height: 42, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", outline: "none" }} />
                </div>

                <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 20, marginBottom: 10 }}>
                  <p style={{ margin: "0 0 16px 0", fontSize: 12, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase" }}>Kênh theo dõi (Mức 1)</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1877f21a", color: "#1877f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Facebook"><i className="bi bi-facebook" /></div>
                      <input type="text" placeholder="Link Fanpage..." value={newComp.facebookUrl} onChange={e => setNewComp({...newComp, facebookUrl: e.target.value})} style={{ flex: 1, height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", outline: "none", fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0000001a", color: "#000000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="TikTok"><i className="bi bi-tiktok" /></div>
                      <input type="text" placeholder="Link TikTok..." value={newComp.tiktokUrl} onChange={e => setNewComp({...newComp, tiktokUrl: e.target.value})} style={{ flex: 1, height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", outline: "none", fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ff00001a", color: "#ff0000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Youtube"><i className="bi bi-youtube" /></div>
                      <input type="text" placeholder="Link Youtube Channel..." value={newComp.youtubeUrl} onChange={e => setNewComp({...newComp, youtubeUrl: e.target.value})} style={{ flex: 1, height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", outline: "none", fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e4405f1a", color: "#e4405f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Instagram"><i className="bi bi-instagram" /></div>
                      <input type="text" placeholder="Link Instagram..." value={newComp.instagramUrl} onChange={e => setNewComp({...newComp, instagramUrl: e.target.value})} style={{ flex: 1, height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", outline: "none", fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ee4d2d1a", color: "#ee4d2d", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Shopee"><i className="bi bi-shop" /></div>
                      <input type="text" placeholder="Link Shopee..." value={newComp.shopeeUrl} onChange={e => setNewComp({...newComp, shopeeUrl: e.target.value})} style={{ flex: 1, height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", outline: "none", fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#00008b1a", color: "#00008b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Lazada"><i className="bi bi-bag-check" /></div>
                      <input type="text" placeholder="Link Lazada..." value={newComp.lazadaUrl} onChange={e => setNewComp({...newComp, lazadaUrl: e.target.value})} style={{ flex: 1, height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", outline: "none", fontSize: 13 }} />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 20, paddingBottom: 10 }}>
                  <p style={{ margin: "0 0 16px 0", fontSize: 12, fontWeight: 800, color: "#0891b2", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}><i className="bi bi-cpu" /> Kết nối Make.com (Mức 2)</p>
                  <div style={{ background: "#ecfeff", border: "1px solid #cffafe", borderRadius: 12, padding: 16 }}>
                    {isEdit && selectedCompetitor?.webhookToken ? (
                      <>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#0e7490", display: "block", marginBottom: 8 }}>WEBHOOK URL ĐỂ NHẬN DỮ LIỆU</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input 
                            type="text" readOnly 
                            value={`https://api.seajong.vn/v1/marketing/hooks/${selectedCompetitor.webhookToken}`}
                            style={{ flex: 1, height: 36, padding: "0 10px", borderRadius: 6, border: "1px solid #bae6fd", background: "#fff", fontSize: 12, color: "#0369a1", fontFamily: "monospace" }}
                          />
                          <button type="button" onClick={() => { navigator.clipboard.writeText(`https://api.seajong.vn/v1/marketing/hooks/${selectedCompetitor.webhookToken}`); toast.success("Đã copy Webhook URL"); }} style={{ height: 36, padding: "0 12px", borderRadius: 6, border: "none", background: "#0891b2", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                            Copy
                          </button>
                        </div>
                        <p style={{ margin: "12px 0 0", fontSize: 11, color: "#0e7490", fontStyle: "italic", lineHeight: 1.4 }}>* Dán URL này vào module "HTTP Request" trên Make.com</p>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: 11, color: "#0e7490", fontStyle: "italic", lineHeight: 1.4 }}>* Webhook URL sẽ được tạo tự động sau khi bạn lưu đối thủ này lần đầu tiên.</p>
                    )}
                  </div>
                </div>
              </form>

              <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 12, background: "var(--card)" }}>
                <BrandButton variant="outline" type="button" onClick={() => setIsAddOpen(false)} style={{ flex: 1 }}>Hủy bỏ</BrandButton>
                <BrandButton type="submit" form="competitor-form" loading={isSubmitting} style={{ flex: 1 }}>{isEdit ? "Cập nhật" : "Lưu đối thủ"}</BrandButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
