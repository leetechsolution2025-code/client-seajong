"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────────
type KpiTrend = { val: string; up: boolean };

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color, loading }: {
  icon: string; label: string; value: string; color: string; loading?: boolean;
}) => (
  <div style={{
    flex: 1, background: "var(--card)", borderRadius: 12, padding: "14px 16px",
    display: "flex", alignItems: "center", gap: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    minWidth: 0,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <i className={`bi ${loading ? "bi-arrow-repeat" : icon}`}
        style={{ fontSize: 18, color, animation: loading ? "spin 1s linear infinite" : "none" }} />
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "var(--foreground)", lineHeight: 1.2 }}>
        {loading ? "—" : value}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </p>
    </div>
  </div>
);

// ── Offcanvas Tạo Chiến Dịch ──────────────────────────────────────────────────
function CreateCampaignOffcanvas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sources, setSources] = useState({ fb: true, yt: false, ig: false, tt: false });
  const toggleSource = (key: keyof typeof sources) => setSources(p => ({ ...p, [key]: !p[key] }));

  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }} />
      )}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1201, width: 400,
        transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        background: "var(--card)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)"
      }}>
        {/* Header */}
        <div style={{ padding: "20px", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="bi bi-rocket-takeoff" style={{ fontSize: 18, color: "#fff" }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "-0.01em" }}>Tạo chiến dịch</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Khởi tạo luồng tiếp thị mới</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
            <i className="bi bi-x" style={{ fontSize: 20 }} />
          </button>
        </div>
        
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
           <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
             <div>
               <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Tên chiến dịch <span style={{color: "#ef4444"}}>*</span></label>
               <input type="text" placeholder="VD: Khuyến mãi Hè 2026..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
             </div>
             
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
               <div>
                 <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Ngày bắt đầu</label>
                 <input type="date" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
               </div>
               <div>
                 <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Ngày kết thúc</label>
                 <input type="date" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
               </div>
             </div>

             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
               <div>
                 <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Ngân sách (VND)</label>
                 <input type="number" placeholder="VD: 50000000" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
               </div>
               <div>
                 <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Số Lead mục tiêu</label>
                 <input type="number" placeholder="VD: 500" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
               </div>
             </div>
             
             <div>
               <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 10 }}>Nguồn Lead (Kênh Ads)</label>
               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                 {[
                   { key: "fb", label: "Facebook", icon: "bi-facebook", color: "#1877F2" },
                   { key: "yt", label: "Youtube", icon: "bi-youtube", color: "#FF0000" },
                   { key: "ig", label: "Instagram", icon: "bi-instagram", color: "#E4405F" },
                   { key: "tt", label: "Tiktok", icon: "bi-tiktok", color: "var(--foreground)" }
                 ].map(src => {
                   const isActive = sources[src.key as keyof typeof sources];
                   return (
                     <div key={src.key} onClick={() => toggleSource(src.key as keyof typeof sources)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: `1px solid ${isActive ? src.color : "var(--border)"}`, background: isActive ? `color-mix(in srgb, ${src.color} 8%, transparent)` : "var(--background)", cursor: "pointer", transition: "all 0.2s" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                         <i className={`bi ${src.icon}`} style={{ color: isActive ? src.color : "var(--muted-foreground)", fontSize: 15 }} />
                         <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--foreground)" : "var(--muted-foreground)" }}>{src.label}</span>
                       </div>
                       {/* Switch Toggle UI */}
                       <div style={{ width: 32, height: 18, borderRadius: 10, background: isActive ? src.color : "var(--muted)", position: "relative", transition: "background 0.2s" }}>
                         <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: isActive ? 16 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>

             <div>
               <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Mục tiêu & Ghi chú</label>
               <textarea rows={4} placeholder="Mô tả chi tiết mục tiêu của chiến dịch..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", fontWeight: 500 }} />
             </div>
           </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12, background: "var(--card)" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--border)"} onMouseLeave={e => e.currentTarget.style.background = "var(--muted)"}>Hủy thiết lập</button>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(16,185,129,0.3)", transition: "transform 0.2s", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}><i className="bi bi-save" /> Khởi tạo ngay</button>
        </div>
      </div>
    </>
  );
}

// ── Offcanvas Kết nối API ────────────────────────────────────────────────────
function ConnectAdsOffcanvas({ 
  open, 
  onClose, 
  onShowDoc,
  activeTab,
  setActiveTab,
  redirectUri
}: { 
  open: boolean; 
  onClose: () => void; 
  onShowDoc: () => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
  redirectUri: string;
}) {
  const [origin, setOrigin] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  
  // Trạng thái chung cho 4 nền tảng
  const [statuses, setStatuses] = useState<Record<string, any>>({ fb: null, yt: null, ig: null, tt: null });
  const [configs, setConfigs] = useState<Record<string, { appId: string; appSecret: string }>>({
    fb: { appId: "", appSecret: "" },
    yt: { appId: "", appSecret: "" },
    ig: { appId: "", appSecret: "" },
    tt: { appId: "", appSecret: "" },
  });
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({ fb: false, yt: false, ig: false, tt: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStatus = async (platform: string) => {
    try {
      const realPlatform = platform === 'yt' ? 'youtube' : platform === 'ig' ? 'instagram' : platform === 'tt' ? 'tiktok' : 'facebook';
      const resp = await fetch(`/api/facebook/status?platform=${realPlatform}`);
      const data = await resp.json();
      setStatuses(p => ({ ...p, [platform]: data }));
      if (data.appId) {
        setConfigs(p => ({ ...p, [platform]: { ...p[platform], appId: data.appId } }));
      }
    } catch {
      setStatuses(p => ({ ...p, [platform]: { connected: false } }));
    }
  };

  useEffect(() => {
    if (open) fetchStatus(activeTab);
  }, [open, activeTab]);

  const handleSave = async (platform: string) => {
    setSavingStatus(p => ({ ...p, [platform]: true }));
    try {
      const realPlatform = platform === 'yt' ? 'youtube' : platform === 'ig' ? 'instagram' : platform === 'tt' ? 'tiktok' : 'facebook';
      await fetch("/api/facebook/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: realPlatform, ...configs[platform] }),
      });
      await fetchStatus(platform);
    } finally {
      setSavingStatus(p => ({ ...p, [platform]: false }));
    }
  };

  const handleConnect = (platform: string) => {
    const endpoints: Record<string, string> = { fb: "/api/facebook/connect", yt: "/api/youtube/connect", ig: "/api/instagram/connect", tt: "/api/tiktok/connect" };
    window.location.href = endpoints[platform];
  };

  const handleDisconnect = async (platform: string) => {
    const realPlatform = platform === 'yt' ? 'youtube' : platform === 'ig' ? 'instagram' : platform === 'tt' ? 'tiktok' : 'facebook';
    await fetch(`/api/facebook/status?platform=${realPlatform}`, { method: "DELETE" });
    setStatuses(p => ({ ...p, [platform]: { connected: false, configured: false } }));
    setConfigs(p => ({ ...p, [platform]: { appId: "", appSecret: "" } }));
  };

  const PLATFORMS = [
    { key: "fb", label: "Facebook & Instagram", icon: "bi-facebook", color: "#1877F2", devUrl: "https://developers.facebook.com/apps/{id}/settings/basic/" },
    { key: "yt", label: "Youtube Analytics", icon: "bi-youtube", color: "#FF0000", devUrl: "https://console.cloud.google.com/apis/credentials" },
    { key: "tt", label: "Tiktok", icon: "bi-tiktok", color: "var(--foreground)", devUrl: "https://developers.tiktok.com/console/" }
  ];

  const currentStatus = statuses[activeTab];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép vào bộ nhớ tạm!");
  };

  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }} />
      )}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1201, width: 400,
        transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        background: "var(--card)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)"
      }}>
        {/* Header */}
        <div style={{ padding: "20px", background: "linear-gradient(135deg, #1e293b, #0f172a)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="bi bi-hdd-network" style={{ fontSize: 18, color: "#fff" }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#fff" }}>Kết nối nguồn Lead</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Cấu hình API Webhooks tự động</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}>
            <i className="bi bi-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Tab Navbar */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${PLATFORMS.length}, 1fr)`, background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
          {PLATFORMS.map(p => {
            const active = activeTab === p.key;
            return (
              <div key={p.key} onClick={() => setActiveTab(p.key)} style={{ padding: "14px 0", textAlign: "center", borderBottom: `2.5px solid ${active ? p.color : "transparent"}`, background: active ? "var(--card)" : "transparent", color: active ? "var(--foreground)" : "var(--muted-foreground)", cursor: "pointer", transition: "0.2s" }}>
                <i className={`bi ${p.icon}`} style={{ fontSize: 16, display: "block", marginBottom: 4, color: active ? p.color : "inherit" }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>{p.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
              
              {/* ── RECOMMENDED: WEBHOOK METHOD (FOR FACEBOOK & TIKTOK LEADS) ── */}
              {(activeTab === 'fb' || activeTab === 'tt') && (
                <div style={{ background: "rgba(16, 185, 129, 0.05)", borderRadius: 20, padding: "24px", border: "1px solid rgba(16, 185, 129, 0.2)", marginBottom: 24, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)", zIndex: 0 }} />
                  
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 16px rgba(16,185,129,0.2)" }}>
                        <i className="bi bi-lightning-charge-fill" style={{ color: "#fff", fontSize: 20 }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--foreground)" }}>Cách 1: Kết nối nhanh qua Webhook</h4>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                          Khuyên dùng: Đơn giản, lấy dữ liệu tức thì.
                        </p>
                      </div>
                    </div>

                    <div style={{ background: "var(--card)", padding: 16, borderRadius: 14, border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Webhook URL của bạn</p>
                        <span style={{ fontSize: 10, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>HTTPS Active</span>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1, background: "var(--muted)", padding: "10px 14px", borderRadius: 10, fontSize: 12, color: "#10b981", fontWeight: 700, border: "1px solid var(--border)", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "monospace" }}>
                          {`${origin}/api/marketing/leads/webhook/${activeTab === 'fb' ? 'facebook' : 'tiktok'}`}
                        </div>
                        <button onClick={() => copyToClipboard(`${origin}/api/marketing/leads/webhook/${activeTab === 'fb' ? 'facebook' : 'tiktok'}`)} style={{ padding: "0 16px", borderRadius: 10, border: "none", background: "var(--foreground)", color: "var(--background)", cursor: "pointer", fontWeight: 800, fontSize: 12 }}>Copy</button>
                      </div>
                    </div>

                    <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <button onClick={() => setShowGuide(!showGuide)} style={{ padding: "12px", borderRadius: 12, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <i className={`bi ${showGuide ? "bi-chevron-up" : "bi-list-check"}`} />
                        Các bước thực hiện
                      </button>
                      <button onClick={() => onShowDoc()} style={{ padding: "12px", borderRadius: 12, border: "none", background: "var(--foreground)", color: "var(--background)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <i className="bi bi-file-earmark-richtext" />
                        Tài liệu hướng dẫn
                      </button>
                    </div>

                    {showGuide && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} style={{ marginTop: 20, borderTop: "1px dashed var(--border)", paddingTop: 20 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                           <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>Mở tài liệu hướng dẫn để xem chi tiết cách cấu hình Webhook trên Make.com.</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* ── NATIVE INTEGRATION: YOUTUBE ANALYTICS (DIRECT) ── */}
              {activeTab === 'yt' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                   <div style={{ background: "rgba(255, 0, 0, 0.03)", borderRadius: 24, padding: "28px", border: "1px solid rgba(255, 0, 0, 0.1)", position: "relative" }}>
                      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 16, background: "#FF0000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 20px rgba(255,0,0,0.2)" }}>
                          <i className="bi bi-youtube" style={{ color: "#fff", fontSize: 24 }} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--foreground)" }}>Kết nối trực tiếp YouTube API</h4>
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                             Tự động đồng bộ các chỉ số View, Subscribe và Watch-time về Dashboard của bạn.
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {[
                          { step: "BƯỚC 1", title: "Tạo dự án Google Cloud", content: "Truy cập Google Cloud Console, tạo Project mới và bật YouTube Analytics API." },
                          { step: "BƯỚC 2", title: "Cấu hình OAuth Consent Screen", content: "Chọn External, thêm Email hỗ trợ và thêm Scope: '.../auth/yt-analytics.readonly'." },
                          { step: "BƯỚC 3", title: "Tạo Credentials", content: "Chọn 'OAuth Client ID' -> 'Web Application'. Thêm Redirect URI bên dưới và nhận Client ID/Secret." }
                        ].map((s, i) => (
                          <div key={i} style={{ display: "flex", gap: 12 }}>
                             <span style={{ fontSize: 9, fontWeight: 900, color: "#FF0000", background: "rgba(255,0,0,0.1)", padding: "2px 8px", borderRadius: 4, height: "fit-content", marginTop: 4 }}>{s.step}</span>
                             <div>
                               <div style={{ fontSize: 13, fontWeight: 800 }}>{s.title}</div>
                               <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{s.content}</div>
                             </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ padding: "12px", borderRadius: 12, border: "1px solid rgba(255,0,0,0.2)", background: "transparent", color: "#FF0000", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                           <i className="bi bi-box-arrow-up-right" />
                           Google Console
                        </a>
                        <button onClick={() => onShowDoc()} style={{ padding: "12px", borderRadius: 12, border: "none", background: "#FF0000", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                           <i className="bi bi-file-earmark-richtext" />
                           Tài liệu đầy đủ
                        </button>
                      </div>

                      <div style={{ marginTop: 24, padding: 16, background: "var(--muted)", borderRadius: 16, border: "1px dashed var(--border)" }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>Authorized redirect URIs</div>
                        <div style={{ display: "flex", gap: 8 }}>
                           <code style={{ flex: 1, fontSize: 11, color: "#FF0000", fontWeight: 700, wordBreak: "break-all" }}>{redirectUri}</code>
                           <button onClick={() => copyToClipboard(redirectUri)} style={{ border: "none", background: "transparent", color: "var(--foreground)", cursor: "pointer", fontSize: 14 }}><i className="bi bi-clipboard" /></button>
                        </div>
                      </div>
                   </div>

                   {/* CONFIG FORM & AUTHORIZE FOR YOUTUBE */}
                   <div style={{ border: currentStatus?.configured ? "2px solid #10b981" : "2px solid var(--border)", borderRadius: 20, padding: 24, position: "relative", background: "var(--card)" }}>
                      <div style={{ position: "absolute", top: -12, left: 20, background: "var(--card)", padding: "0 8px", fontSize: 11, fontWeight: 900, color: currentStatus?.configured ? "#10b981" : "var(--muted-foreground)" }}>CẤU HÌNH CLIENT ID & SECRET</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <input value={configs[activeTab].appId} onChange={e => setConfigs(p => ({ ...p, [activeTab]: { ...p[activeTab], appId: e.target.value } }))} placeholder="Client ID..." style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 14 }} />
                        <input type="password" value={configs[activeTab].appSecret} onChange={e => setConfigs(p => ({ ...p, [activeTab]: { ...p[activeTab], appSecret: e.target.value } }))} placeholder="Client Secret..." style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 14 }} />
                        <button onClick={() => handleSave(activeTab)} disabled={!configs[activeTab].appId || savingStatus[activeTab]} style={{ padding: "12px", borderRadius: 12, border: "none", background: configs[activeTab].appId ? "#FF0000" : "var(--muted)", color: "#fff", cursor: "pointer", fontWeight: 800 }}>
                          {savingStatus[activeTab] ? "Đang lưu..." : "Lưu cấu hình"}
                        </button>
                      </div>
                   </div>

                   <div style={{ border: currentStatus?.connected ? "2px solid #10b981" : "2px solid var(--border)", borderRadius: 20, padding: 24, position: "relative", opacity: currentStatus?.configured ? 1 : 0.5, background: "var(--card)", marginBottom: 24 }}>
                      <div style={{ position: "absolute", top: -12, left: 20, background: "var(--card)", padding: "0 8px", fontSize: 11, fontWeight: 900, color: currentStatus?.connected ? "#10b981" : "var(--muted-foreground)" }}>BƯỚC 2: ỦY QUYỀN</div>
                      <button onClick={() => handleConnect(activeTab)} disabled={!currentStatus?.configured} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: "#FF0000", color: "#fff", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                        <i className="bi bi-google" /> Kết nối tài khoản Google
                      </button>
                   </div>
                </div>
              )}

              {/* ── TIKTOK DIRECT API CONFIG ── */}
              {activeTab === 'tt' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                   <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 24, padding: 28, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 54, height: 54, borderRadius: 16, background: "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--background)" }}>
                           <i className="bi bi-tiktok" style={{ fontSize: 28 }} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--foreground)" }}>Kết nối trực tiếp TikTok Ads API</h4>
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                             Theo dõi hiệu quả chiến dịch TikTok Ads (Cost, Click, Conversion) ngay trên Dashboard.
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {[
                          { step: "BƯỚC 1", title: "Tạo App trên TikTok Developer", content: "Đăng ký tài khoản Developer và tạo App mới tại ads.tiktok.com." },
                          { step: "BƯỚC 2", title: "Cấu hình Permissions", content: "Thêm các quyền 'Ads Management' và 'Ads Reporting' cho App của bạn." },
                          { step: "BƯỚC 3", title: "Nhận App ID & Secret", content: "Thêm Redirect URI bên dưới vào cài đặt App và lấy thông tin Key." }
                        ].map((s, i) => (
                          <div key={i} style={{ display: "flex", gap: 12 }}>
                             <span style={{ fontSize: 9, fontWeight: 900, color: "var(--background)", background: "var(--foreground)", padding: "2px 8px", borderRadius: 4, height: "fit-content", marginTop: 4 }}>{s.step}</span>
                             <div>
                               <div style={{ fontSize: 13, fontWeight: 800 }}>{s.title}</div>
                               <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{s.content}</div>
                             </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <a href="https://ads.tiktok.com/marketing_api/homepage/" target="_blank" rel="noreferrer" style={{ padding: "12px", borderRadius: 12, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                           <i className="bi bi-box-arrow-up-right" />
                           TikTok Console
                        </a>
                        <button onClick={() => onShowDoc()} style={{ padding: "12px", borderRadius: 12, border: "none", background: "var(--foreground)", color: "var(--background)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                           <i className="bi bi-file-earmark-richtext" />
                           Tài liệu đầy đủ
                        </button>
                      </div>

                      <div style={{ marginTop: 24, padding: 16, background: "var(--muted)", borderRadius: 16, border: "1px dashed var(--border)" }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 8 }}>Authorized redirect URIs</div>
                        <div style={{ display: "flex", gap: 8 }}>
                           <code style={{ flex: 1, fontSize: 11, color: "var(--foreground)", fontWeight: 700, wordBreak: "break-all" }}>{redirectUri}</code>
                           <button onClick={() => copyToClipboard(redirectUri)} style={{ border: "none", background: "transparent", color: "var(--foreground)", cursor: "pointer", fontSize: 14 }}><i className="bi bi-clipboard" /></button>
                        </div>
                      </div>
                   </div>

                   {/* CONFIG FORM & AUTHORIZE FOR TIKTOK */}
                   <div style={{ border: currentStatus?.configured ? "2px solid #10b981" : "2px solid var(--border)", borderRadius: 20, padding: 24, position: "relative", background: "var(--card)" }}>
                      <div style={{ position: "absolute", top: -12, left: 20, background: "var(--card)", padding: "0 8px", fontSize: 11, fontWeight: 900, color: currentStatus?.configured ? "#10b981" : "var(--muted-foreground)" }}>CẤU HÌNH APP ID & SECRET KEY</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <input value={configs[activeTab].appId} onChange={e => setConfigs(p => ({ ...p, [activeTab]: { ...p[activeTab], appId: e.target.value } }))} placeholder="App ID..." style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 14 }} />
                        <input type="password" value={configs[activeTab].appSecret} onChange={e => setConfigs(p => ({ ...p, [activeTab]: { ...p[activeTab], appSecret: e.target.value } }))} placeholder="Secret Key..." style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 14 }} />
                        <button onClick={() => handleSave(activeTab)} disabled={!configs[activeTab].appId || savingStatus[activeTab]} style={{ padding: "12px", borderRadius: 12, border: "none", background: configs[activeTab].appId ? "var(--foreground)" : "var(--muted)", color: "var(--background)", cursor: "pointer", fontWeight: 800 }}>
                          {savingStatus[activeTab] ? "Đang lưu..." : "Lưu cấu hình"}
                        </button>
                      </div>
                   </div>

                   <div style={{ border: currentStatus?.connected ? "2px solid #10b981" : "2px solid var(--border)", borderRadius: 20, padding: 24, position: "relative", opacity: currentStatus?.configured ? 1 : 0.5, background: "var(--card)", marginBottom: 24 }}>
                      <div style={{ position: "absolute", top: -12, left: 20, background: "var(--card)", padding: "0 8px", fontSize: 11, fontWeight: 900, color: currentStatus?.connected ? "#10b981" : "var(--muted-foreground)" }}>BƯỚC 2: ỦY QUYỀN</div>
                      <button onClick={() => handleConnect(activeTab)} disabled={!currentStatus?.configured} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: "var(--foreground)", color: "var(--background)", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                        <i className="bi bi-tiktok" /> Kết nối tài khoản TikTok
                      </button>
                   </div>
                </div>
              )}

              {/* ── FACEBOOK WEBHOOK CONFIG (AS DEFAULT/LEGACY) ── */}
              {activeTab === 'fb' && (
                <>
                  <div style={{ border: "2px solid var(--border)", borderRadius: 24, padding: 28, marginBottom: 24, background: "rgba(24, 119, 242, 0.03)" }}>
                    <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                      <div style={{ width: 54, height: 54, borderRadius: 16, background: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                        <i className="bi bi-facebook" style={{ fontSize: 28 }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--foreground)" }}>Kết nối qua Make.com (Webhooks)</h4>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                          Giải pháp nhanh nhất để đồng bộ Lead từ Facebook & Instagram về CRM.
                        </p>
                      </div>
                    </div>
                    
                    <button onClick={() => onShowDoc()} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#1877F2", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <i className="bi bi-file-earmark-text" /> Xem hướng dẫn thiết lập
                    </button>
                  </div>

                  <details style={{ marginBottom: 24 }}>
                    <summary style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)", cursor: "pointer", padding: "10px 0" }}>Cấu hình App tự tạo (Dành cho Developer)</summary>
                    <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 20 }}>
                      <div style={{ border: currentStatus?.configured ? "2px solid #10b981" : "2px solid var(--border)", borderRadius: 16, padding: 20, position: "relative" }}>
                        <div style={{ position: "absolute", top: -12, left: 16, background: "var(--card)", padding: "0 8px", fontSize: 11, fontWeight: 900 }}>BƯỚC 1: NHẬP KEY</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <input value={configs[activeTab].appId} onChange={e => setConfigs(p => ({ ...p, [activeTab]: { ...p[activeTab], appId: e.target.value } }))} placeholder="App ID..." style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 14 }} />
                          <input type="password" value={configs[activeTab].appSecret} onChange={e => setConfigs(p => ({ ...p, [activeTab]: { ...p[activeTab], appSecret: e.target.value } }))} placeholder="App Secret..." style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 14 }} />
                          <button onClick={() => handleSave(activeTab)} style={{ padding: "10px", borderRadius: 10, background: "var(--foreground)", color: "var(--background)", fontWeight: 800 }}>Lưu cấu hình</button>
                        </div>
                      </div>
                      <div style={{ border: currentStatus?.connected ? "2px solid #10b981" : "2px solid var(--border)", borderRadius: 16, padding: 20, position: "relative", opacity: currentStatus?.configured ? 1 : 0.5 }}>
                        <div style={{ position: "absolute", top: -12, left: 16, background: "var(--card)", padding: "0 8px", fontSize: 11, fontWeight: 900, color: currentStatus?.connected ? "#10b981" : "var(--muted-foreground)" }}>BƯỚC 2: ỦY QUYỀN</div>
                        <button onClick={() => handleConnect(activeTab)} disabled={!currentStatus?.configured} style={{ width: "100%", padding: "12px", borderRadius: 10, background: "#1877F2", color: "#fff", fontWeight: 800 }}>Kết nối tài khoản</button>
                      </div>
                    </div>
                  </details>
                </>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
           <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>
             <i className="bi bi-shield-check" /> Hệ thống này hỗ trợ cơ chế Client-Project, dữ liệu App ID độc lập cho từng khách hàng.
           </p>
        </div>
      </div>
    </>
  );
}

export default function MarketingCampaignsPage() {
  // === STATE MODULES ===
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [showFullDoc, setShowFullDoc] = useState(false);
  const [leadSeries, setLeadSeries] = useState<Array<{ name: string; data: number[] }>>([]);
  const [recentLeads, setRecentLeads] = useState<Array<{ id: number; name: string; phone: string; campaign: string; time: string; avatar: string }>>([]);
  const [chartDates, setChartDates] = useState<string[]>([]);
  const [activeFeedIndex, setActiveFeedIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === THÊM STATE CHO IMPORT MODAL VÀ LỌC BIỂU ĐỒ ===
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<"upsert" | "skip">("upsert");
  const [isImporting, setIsImporting] = useState(false);
  const [chartRange, setChartRange] = useState<"7" | "14" | "30" | "custom">("30");
  
  // === LIFTED STATE FOR INTEGRATIONS ===
  const [activeTab, setActiveTab] = useState('fb');
  const [redirectUri, setRedirectUri] = useState("");

  useEffect(() => {
    const uri = `${window.location.protocol}//${window.location.host}/api/${activeTab === 'yt' ? 'youtube' : activeTab === 'fb' ? 'facebook' : activeTab === 'ig' ? 'instagram' : 'tiktok'}/callback`;
    setRedirectUri(uri);
  }, [activeTab]);

  const fetchDashboard = async () => {
    setFbCampaignsLoading(true);
    try {
      const r = await fetch("/api/marketing/dashboard");
      const d = await r.json();
      if (d.campaigns) setFbCampaigns(d.campaigns);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setFbCampaignsLoading(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (rawData.length < 2) return;

        const headers = rawData[0];
        const findIdx = (names: string[]) => headers.findIndex(h => names.some(n => String(h || "").includes(n)));

        const idxName = findIdx(["Tên chiến dịch"]);
        const idxDate = findIdx(["Ngày", "Lượt bắt đầu"]);
        const idxPlatform = findIdx(["Nền tảng"]);
        const idxStatus = findIdx(["Kết thúc"]);
        const idxValue = findIdx(["Kết quả"]); // Cột F
        const idxIndicator = findIdx(["Chỉ báo kết quả"]); // Cột G
        const idxSpent = findIdx(["Số tiền đã chi tiêu (VND)"]); // Cột K
        const idxImp = findIdx(["Lượt hiển thị"]); // Cột L
        const idxClicks = findIdx(["Số lượt click", "Số lượt click (tất cả)", "Lượt click"]); 

        const campaignsMap: Record<string, any> = {};

        rawData.slice(1).forEach(row => {
          let campaignName = String(row[idxName] || "").trim();
          if (!campaignName || campaignName === "null") return;

          // Loại bỏ hậu tố nền tảng mà Meta tự thêm vào
          campaignName = campaignName
            .replace(/\s*-\s*Facebook$/i, "")
            .replace(/\s*-\s*Instagram$/i, "")
            .replace(/\s*-\s*Threads$/i, "")
            .replace(/\s*-\s*Messenger$/i, "");

          const dateVal = String(row[idxDate] || "");
          const platform = String(row[idxPlatform] || "facebook").toLowerCase().trim();
          const status = String(row[idxStatus] || "ACTIVE").includes("diễn ra") ? "ACTIVE" : "PAUSED";
          
          const valF = parseFloat(String(row[idxValue] || "0")) || 0;
          const indicatorG = String(row[idxIndicator] || "").toLowerCase();
          const spendK = parseFloat(String(row[idxSpent] || "0")) || 0;
          const impL = parseInt(String(row[idxImp] || "0")) || 0;

          // KHÓA GOM NHÓM: Gom theo tên chiến dịch để hợp nhất dữ liệu đa nền tảng
          const groupKey = campaignName;

          if (!campaignsMap[groupKey]) {
            campaignsMap[groupKey] = {
              id: Math.random().toString(36).substring(2, 9),
              name: campaignName,
              status: status,
              platform: "multiple", 
              objective: "Marketing", 
              insights: { data: [] }
            };
          }

          // Cùng 1 ngày nhưng khác nền tảng thì tách riêng insight
          let dayData = campaignsMap[groupKey].insights.data.find((d: any) => d.date_start === dateVal && d.platform === platform);
          if (!dayData) {
            dayData = { 
              date_start: dateVal, 
              platform: platform, 
              spend: 0, 
              impressions: 0,
              reach: 0, 
              leads: 0, 
              likes: 0, 
              clicks: 0,
              unit: "kết quả"
            };
            campaignsMap[groupKey].insights.data.push(dayData);
          }

          dayData.spend += spendK;
          dayData.impressions += impL;

          if (indicatorG.includes("reach")) {
            dayData.reach += valF;
          } else if (indicatorG.includes("leadgen")) {
            dayData.leads += valF;
          } else if (indicatorG.includes("like")) {
            dayData.likes += valF;
          } else {
            dayData.clicks += valF;
          }

          const nameLower = campaignName.toLowerCase();
          dayData.unit = 
            (nameLower.includes("branding") || indicatorG.includes("reach")) ? "người" :
            (nameLower.includes("lead") || indicatorG.includes("leadgen")) ? "khách" :
            (nameLower.includes("like")) ? "like" : "kết quả";
        });

        const newCampaigns = Object.values(campaignsMap);
        
        setImportData(newCampaigns);
        setImportModalOpen(true);
      } catch (err) {
        console.error("Import error:", err);
        alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = async () => {
    setIsImporting(true);
    try {
      const res = await fetch("/api/marketing/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: importData, mode: importMode }),
      });

      if (res.ok) {
         await fetchDashboard();
         alert(`Đã lưu thành công ${importData.length} chiến dịch vào hệ thống!`);
         setImportModalOpen(false);
         setImportData([]);
      } else {
         const errorData = await res.json();
         alert(`Lỗi khi lưu dữ liệu vào DB: ${errorData.error || "Không xác định"}`);
      }
    } catch (err) {
      console.error("Import error:", err);
      alert("Lỗi kết nối tới máy chủ.");
    } finally {
      setIsImporting(false);
    }
  };

  // === FACEBOOK REAL CAMPAIGNS ===
  const [fbCampaigns, setFbCampaigns] = useState<Array<{
    id: string; name: string; status: string; objective: string; platform?: string;
    daily_budget?: string; spend_cap?: string; adAccountName: string; currency: string;
    insights?: { data: Array<{ date_start: string; platform?: string; spend?: string; impressions?: string; reach?: string; clicks?: string; actions?: any[]; unit?: string }> };
  }>>([]);
  const [fbCampaignsLoading, setFbCampaignsLoading] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  // === CẬP NHẬT BIỂU ĐỒ THEO CHIẾN DỊCH ĐANG CHỌN ===
  useEffect(() => {
    const activeCamp = fbCampaigns[activeFeedIndex];
    if (!activeCamp || !activeCamp.insights?.data) {
      setLeadSeries([]);
      return;
    }

    const data = activeCamp.insights.data;
    const dataDates = data.map(d => d.date_start).sort();
    const maxDateStr = dataDates.length > 0 ? dataDates[dataDates.length - 1] : new Date().toISOString().split("T")[0];
    const [y, m, d] = maxDateStr.split("-").map(Number);
    const maxDateObj = new Date(y, m - 1, d);

    let daysToGenerate = 30;
    if (chartRange === "7") daysToGenerate = 7;
    else if (chartRange === "14") daysToGenerate = 14;
    else if (chartRange === "30") daysToGenerate = 30;
    else if (chartRange === "custom" && dataDates.length > 0) {
      const minDateStr = dataDates[0];
      const [my, mm, md] = minDateStr.split("-").map(Number);
      const minDateObj = new Date(my, mm - 1, md);
      const diffTime = Math.abs(maxDateObj.getTime() - minDateObj.getTime());
      daysToGenerate = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const uniqueDates: string[] = [];
    for (let i = daysToGenerate - 1; i >= 0; i--) {
       const dateObj = new Date(maxDateObj);
       dateObj.setDate(dateObj.getDate() - i);
       const yyyy = dateObj.getFullYear();
       const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
       const dd = String(dateObj.getDate()).padStart(2, '0');
       uniqueDates.push(`${yyyy}-${mm}-${dd}`);
    }
    
    setChartDates(uniqueDates); // Giữ nguyên YYYY-MM-DD để Tooltip xử lý chính xác

    // Nhóm dữ liệu theo Phễu: Tiếp cận -> Like -> Lead
    const metrics = [
      { name: "Người tiếp cận", key: "reach", color: "#3b82f6" }, 
      { name: "Lượt Like", key: "likes", color: "#f59e0b" },      
      { name: "Số Lead", key: "leads", color: "#10b981" }         
    ];

    const funnelSeries = metrics.map(m => ({
      name: m.name,
      data: uniqueDates.map(date => {
        const dayEntries = data.filter(d => d.date_start === date);
        // Dùng parseFloat để lấy chính xác số thập phân và xử lý giá trị trống
        const sum = dayEntries.reduce((acc, d) => {
          const val = (d as any)[m.key];
          return acc + (parseFloat(String(val || "0")) || 0);
        }, 0);
        return sum;
      })
    }));

    setLeadSeries(funnelSeries);
  }, [fbCampaigns, activeFeedIndex, chartRange]);

  // === (Đã xóa simulate mock data) ===

  // === CHART OPTIONS ===
  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      height: 350,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        dynamicAnimation: { speed: 1000 },
      },
      fontFamily: "inherit",
      background: "transparent",
    },
    colors: ["#3b82f6", "#f59e0b", "#10b981"], // Tiếp cận (Blue), Like (Orange), Lead (Green)
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: chartDates.length > 0 ? chartDates : ["-8d", "-7d", "-6d", "-5d", "-4d", "-3d", "-2d", "-1d", "Hôm nay"],
      labels: { 
        rotate: 0,
        style: { colors: "#64748b" },
        formatter: (val: string) => {
           if (!val || !val.includes('-')) return val;
           
           // Nếu là 30 ngày, ép buộc cách 1 ngày mới hiện 1 nhãn (bằng cách lấy index)
           if (chartRange === "30") {
             const idx = chartDates.indexOf(val);
             if (idx % 2 !== 0) return "";
           }
           
           const parts = val.split('-');
           return `${parts[2]}/${parts[1]}`; // dd/mm
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: "#64748b" } },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      labels: { colors: "#64748b" },
    },
    grid: {
      borderColor: "rgba(100, 116, 139, 0.1)",
      strokeDashArray: 4,
    },
    tooltip: { 
      shared: true,
      intersect: false,
      theme: "light",
      custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
            const rawDate = chartDates[dataPointIndex]; 
            const displayDate = rawDate.includes('-') ? rawDate.split('-').reverse().join('/') : rawDate; 
            let itemsHtml = "";
            
            // Tính tổng chi phí ngày đó (cho tất cả platform)
            const dayEntries = fbCampaigns[activeFeedIndex]?.insights?.data?.filter((d: any) => d.date_start === rawDate) || [];
            const daySpend = dayEntries.reduce((sum: number, d: any) => sum + parseFloat(d.spend || "0"), 0);

            series.forEach((s: any, idx: number) => {
               const val = s[dataPointIndex];
               const name = w.config.series[idx].name;
               const color = w.config.colors[idx % w.config.colors.length];
               
               itemsHtml += `
                 <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                   <div style="display: flex; align-items: center; gap: 8px;">
                     <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
                     <span style="font-size: 11px; color: #64748b;">${name}</span>
                   </div>
                   <b style="font-size: 12px; color: #1e293b;">${val.toLocaleString()}</b>
                 </div>
               `;
            });

            return `
              <div style="padding: 12px; min-width: 200px; background: #fff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #f1f5f9;">
                <div style="font-weight: 800; font-size: 12px; margin-bottom: 10px; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; display: flex; justify-content: space-between;">
                  <span>Hiệu quả ngày</span>
                  <span style="color: #64748b;">${displayDate}</span>
                </div>
                <div>${itemsHtml}</div>
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Tổng chi</span>
                  <b style="font-size: 12px; color: #ef4444;">${daySpend.toLocaleString()}đ</b>
                </div>
              </div>
            `;
      }
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      {/* TRẢ LẠI PAGE HEADER CHUẨN CỦA HỆ THỐNG */}
      <PageHeader
        title="Quản lý chiến dịch"
        description="Theo dõi và tối ưu hóa các chiến dịch tiếp thị cục bộ và trực tuyến."
        color="emerald"
        icon="bi-rocket-takeoff"
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column" }}>


        {/* QUICK SUMMARY CARDS — Dữ liệu thực từ Facebook */}
        {(() => {
          const totalActive = fbCampaigns.filter(c => c.status === "ACTIVE").length;
          const totalLeads = fbCampaigns.reduce((sum, c) => {
            const days = (c as any).insights?.data || [];
            return sum + days.reduce((s: number, d: any) => s + (parseFloat(d.leads || "0")), 0);
          }, 0);
          const totalSpend = fbCampaigns.reduce((sum, c) => {
            const days = (c as any).insights?.data || [];
            return sum + days.reduce((s: number, d: any) => s + (parseFloat(d.spend || "0")), 0);
          }, 0);
          const avgCPA = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;

          const fmt = (v: number) => v.toLocaleString('vi-VN');

          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
              <KpiCard icon="bi-rocket-takeoff" label="Chiến dịch đang chạy" value={fbCampaignsLoading ? "…" : totalActive.toString()} color="#3b82f6" />
              <KpiCard icon="bi-person-lines-fill" label="Tổng Lead (Toàn thời gian)" value={fbCampaignsLoading ? "…" : `${fmt(totalLeads)} khách`} color="#10b981" />
              <KpiCard icon="bi-cash-coin" label="Ngân sách đã sử dụng" value={fbCampaignsLoading ? "…" : `${fmt(Math.round(totalSpend))} đ`} color="#f59e0b" />
              <KpiCard icon="bi-bullseye" label="CPA Trung bình" value={fbCampaignsLoading ? "…" : avgCPA > 0 ? `${fmt(avgCPA)} đ` : "—"} color="#8b5cf6" />
            </div>
          );
        })()}

        {/* LIVE METRICS & FEED */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          {/* Tùy kích thước màn hình mà chia 2 hoặc 3 cột, dùng CSS Grid để responsive */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)", gap: 24, flex: 1, minHeight: 0 }} className="live-charts-container">
            {/* LIVE CHART SECTION */}
            <div className="app-card" style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: 16, background: "var(--card)", padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", height: "100%" }}>
              {/* Header Card */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: 0, display: "flex", alignItems: "center", gap: 10, maxWidth: "100%" }}>
                    <i className="bi bi-graph-up-arrow" style={{ color: "#10b981" }} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 400 }} title={fbCampaigns[activeFeedIndex]?.name}>
                      Hiệu quả: {fbCampaigns[activeFeedIndex]?.name || "Đang tải..."}
                    </span>
                  </h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>Xu hướng tiếp cận, tương tác và chuyển đổi khách hàng tiềm năng.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setIsConnectOpen(true)}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--background)"}
                    title="Cấu hình kết nối API"
                  >
                    <i className="bi bi-gear-fill" style={{ color: "var(--muted-foreground)" }} />
                  </button>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)", transition: "transform 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "none"}
                  >
                    <i className="bi bi-plus-lg" /> Tạo chiến dịch
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--background)"}
                    title="Import Báo cáo Excel"
                  >
                    <i className="bi bi-file-earmark-arrow-up" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportExcel} 
                    accept=".xlsx, .xls, .csv" 
                    style={{ display: "none" }} 
                  />
                </div>
              </div>

              {/* Chart Area */}
              <div style={{ margin: "0 -10px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1 }}>
                  <ReactApexChart options={chartOptions} series={leadSeries} type="area" height="100%" />
                </div>
                
                {/* BỘ LỌC KHOẢNG THỜI GIAN (GÓC DƯỚI BÊN TRÁI) */}
                <div style={{ display: "flex", gap: 6, paddingLeft: 10, marginTop: 2, zIndex: 10, position: "relative" }}>
                  {[
                    { value: "7", label: "7 ngày" },
                    { value: "14", label: "14 ngày" },
                    { value: "30", label: "30 ngày" },
                    { value: "custom", label: "Tùy chỉnh..." }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      disabled={opt.value === "custom"}
                      onClick={() => setChartRange(opt.value as any)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 14,
                        border: chartRange === opt.value ? "1px solid #10b981" : "1px solid var(--border)",
                        background: chartRange === opt.value ? "rgba(16,185,129,0.1)" : "var(--background)",
                        color: chartRange === opt.value ? "#10b981" : "var(--muted-foreground)",
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
              </div>

              {/* Realtime Active Campaigns Feed */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Cập nhật Mới nhất</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {fbCampaigns.filter(c => c.status === "ACTIVE").length > 1 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 6 }}>
                        <button 
                          onClick={() => setActiveFeedIndex(prev => Math.max(0, prev - 1))}
                          disabled={activeFeedIndex === 0}
                          style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: activeFeedIndex === 0 ? "var(--muted-foreground)" : "var(--foreground)", cursor: activeFeedIndex === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                        ><i className="bi bi-chevron-left" style={{ fontSize: 10 }} /></button>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>
                          {Math.min(activeFeedIndex + 1, fbCampaigns.filter(c => c.status === "ACTIVE").length)} / {fbCampaigns.filter(c => c.status === "ACTIVE").length}
                        </span>
                        <button 
                          onClick={() => setActiveFeedIndex(prev => Math.min(fbCampaigns.filter(c => c.status === "ACTIVE").length - 1, prev + 1))}
                          disabled={activeFeedIndex >= fbCampaigns.filter(c => c.status === "ACTIVE").length - 1}
                          style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: activeFeedIndex >= fbCampaigns.filter(c => c.status === "ACTIVE").length - 1 ? "var(--muted-foreground)" : "var(--foreground)", cursor: activeFeedIndex >= fbCampaigns.filter(c => c.status === "ACTIVE").length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                        ><i className="bi bi-chevron-right" style={{ fontSize: 10 }} /></button>
                      </div>
                    )}
                    <span style={{ fontSize: 11, background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "2px 8px", borderRadius: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} /> Đang theo dõi
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "hidden", minHeight: 90, paddingRight: 4 }}>
                  {fbCampaignsLoading ? (
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Đang đồng bộ trạng thái trực tiếp...</div>
                  ) : (() => {
                    const activeCamps = fbCampaigns.filter(c => c.status === "ACTIVE");
                    if (activeCamps.length === 0) {
                      return <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>Không có chiến dịch nào đang chạy lúc này.</div>;
                    }
                    
                    const safeIndex = Math.min(activeFeedIndex, activeCamps.length - 1);
                    const c = activeCamps[safeIndex];

                    type InsightAction = { action_type: string; value: string };
                    type InsightData = { spend?: string; clicks?: string; impressions?: string; actions?: InsightAction[]; ctr?: string; cpcr?: string };
                    const days: InsightData[] = (c as { insights?: { data?: InsightData[] } }).insights?.data || [];
                    const todayData = days[days.length - 1] || {};
                    const spend = parseFloat(todayData.spend || "0");
                    const clicks = parseInt(todayData.clicks || "0");
                    const impressions = parseInt(todayData.impressions || "0");
                    const leads = parseInt(todayData.actions?.find(x => x.action_type === "lead")?.value || "0");
                    const ctr = todayData.ctr ? parseFloat(todayData.ctr).toFixed(2) + "%" : "0%";
                    const cpaValue = leads > 0 ? Math.round(spend / leads) : 0;

                    return (
                      <AnimatePresence mode="wait">
                        <motion.div 
                          key={c.id} 
                          initial={{ opacity: 0, x: 20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          exit={{ opacity: 0, x: -20 }} 
                          transition={{ duration: 0.2 }}
                          style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "rgba(100, 116, 139, 0.02)", display: "flex", alignItems: "center", gap: 16 }}
                        >
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              {c.platform === "facebook" ? <i className="bi bi-facebook" style={{ color: "#1877F2", fontSize: 16 }} /> : 
                               c.platform === "instagram" ? <i className="bi bi-instagram" style={{ color: "#E4405F", fontSize: 16 }} /> :
                               c.platform === "tiktok" ? <i className="bi bi-tiktok" style={{ color: "var(--foreground)", fontSize: 16 }} /> :
                               c.platform === "youtube" ? <i className="bi bi-youtube" style={{ color: "#FF0000", fontSize: 16 }} /> :
                               <i className="bi bi-facebook" style={{ color: "#1877F2", fontSize: 16 }} />}
                              <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }} title={c.name}>{c.name}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-bullseye" style={{ color: "#10b981" }}></i> Mục tiêu: {c.objective || "Lượt tương tác"}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-eye"></i> {impressions.toLocaleString()} lượt hiển thị</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-cursor"></i> CTR: {ctr}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-wallet2"></i> CPA: {cpaValue > 0 ? `${cpaValue.toLocaleString('vi-VN')}đ` : "—"}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", gap: 24, flexShrink: 0, textAlign: "right" }}>
                            <div>
                              <span style={{ display: "block", fontSize: 10, color: "var(--muted-foreground)", marginBottom: 2 }}>Hôm nay chi</span>
                              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", fontFamily: "monospace" }}>{Math.round(spend / 1000).toLocaleString()}k</span>
                            </div>
                            <div>
                              <span style={{ display: "block", fontSize: 10, color: "var(--muted-foreground)", marginBottom: 2 }}>Clicks mới</span>
                              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", fontFamily: "monospace" }}>{clicks.toLocaleString()}</span>
                            </div>
                            <div style={{ minWidth: 70 }}>
                              <span style={{ display: "block", fontSize: 10, color: "var(--muted-foreground)", marginBottom: 2 }}>Tốc độ Lead</span>
                              <span style={{ fontSize: 16, fontWeight: 800, color: "#10b981", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                                <i className="bi bi-person-plus-fill" style={{ fontSize: 12 }} /> +{leads}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* ── BẢNG CHIẾN DỊCH TỔNG HỢP ── */}
            <div className="app-card" style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: 16, background: "var(--card)", padding: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", overflow: "hidden", height: "100%" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)" }}>
                  <i className="bi bi-megaphone-fill" style={{ fontSize: 16, color: "#fff" }} />
                </div>
                <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Danh sách Chiến dịch Quảng cáo</h3>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.2, marginTop: 4 }}>Dữ liệu tổng hợp từ đa nền tảng kết nối</span>
                </div>
                <span style={{ flexShrink: 0, fontSize: 12, background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)", padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>
                  {fbCampaigns.length} chiến dịch
                </span>
              </div>
              
              <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
                {fbCampaignsLoading ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
                    <i className="bi bi-arrow-repeat" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                    <span style={{ fontSize: 12 }}>Đang tải dữ liệu...</span>
                  </div>
                ) : fbCampaigns.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
                    <i className="bi bi-inbox" style={{ fontSize: 32, display: "block", marginBottom: 12, opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Chưa có chiến dịch nào</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12 }}>Tài khoản quảng cáo chưa có campaign, hoặc thẻ thiếu quyền truy cập</p>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--muted)" }}>
                        {["Tên chiến dịch", "Trạng thái", "Tổng chi phí (đ)"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: h === "Tổng chi phí (đ)" ? "right" : "left", fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fbCampaigns.map((c, i) => {
                        type DayInsight = { spend?: string; impressions?: string; clicks?: string; ctr?: string; leads?: string; reach?: string; likes?: string; unit?: string };
                        const days: DayInsight[] = (c as { insights?: { data?: DayInsight[] } }).insights?.data || [];
                        const totalSpend = days.reduce((a, d) => a + parseFloat(d.spend || "0"), 0);
                        const totalLeads = days.reduce((a, d) => a + parseInt(d.leads || "0"), 0);
                        const statusColor = c.status === "ACTIVE" ? "#10b981" : c.status === "PAUSED" ? "#f59e0b" : "#6b7280";
                        
                        return (
                          <tr key={c.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(100,116,139,0.03)" }}>
                            <td style={{ padding: "12px 14px", fontWeight: 600, maxWidth: 160 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <div style={{ marginTop: 2 }}>
                                  {c.platform === "facebook" ? <i className="bi bi-facebook" style={{ color: "#1877F2", fontSize: 14 }} /> : 
                                   c.platform === "instagram" ? <i className="bi bi-instagram" style={{ color: "#E4405F", fontSize: 14 }} /> :
                                   c.platform === "tiktok" ? <i className="bi bi-tiktok" style={{ color: "var(--foreground)", fontSize: 14 }} /> :
                                   c.platform === "youtube" ? <i className="bi bi-youtube" style={{ color: "#FF0000", fontSize: 14 }} /> :
                                   <i className="bi bi-facebook" style={{ color: "#1877F2", fontSize: 14 }} />}
                                </div>
                                <span style={{ display: "block", whiteSpace: "wrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 12, lineHeight: 1.4 }}>{c.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                              <span style={{ padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: `${statusColor}18`, color: statusColor }}>
                                {c.status === "ACTIVE" ? "🟢 On" : c.status === "PAUSED" ? "⏸ Off" : "—"}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 13, fontWeight: 700, textAlign: "right" }}>
                              {totalSpend > 0 ? Math.round(totalSpend).toLocaleString("vi-VN") + " đ" : "0 đ"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OFFCANVAS TẠO CHIẾN DỊCH */}
      <CreateCampaignOffcanvas open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      
      {/* OFFCANVAS KẾT NỐI API */}
      <ConnectAdsOffcanvas 
        open={isConnectOpen} 
        onClose={() => setIsConnectOpen(false)} 
        onShowDoc={() => setShowFullDoc(true)} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        redirectUri={redirectUri}
      />

      {/* ── FULLSCREEN DOCUMENTATION MODAL (TRUE FULLSCREEN) ── */}
      <AnimatePresence>
        {showFullDoc && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 3000, background: "var(--card)", display: "flex", flexDirection: "column" }}
            >
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
              >
              {/* Modal Header */}
              <div style={{ padding: "28px 40px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 14, 
                    background: activeTab === 'yt' ? "#FF0000" : activeTab === 'tt' ? "var(--foreground)" : "#1877F2", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center" 
                  }}>
                    <i className={`bi ${activeTab === 'yt' ? "bi-youtube" : activeTab === 'tt' ? "bi-tiktok" : "bi-facebook"}`} style={{ fontSize: 24, color: activeTab === 'tt' ? "var(--background)" : "#fff" }} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-0.01em" }}>
                      Tài liệu kết nối {activeTab === 'yt' ? "YouTube Analytics" : activeTab === 'tt' ? "TikTok Marketing API" : "Facebook Lead Ads"}
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
                      {activeTab === 'yt' ? "Hướng dẫn cấu hình Native OAuth2 qua Google Cloud" : 
                       activeTab === 'tt' ? "Hướng dẫn cấu hình TikTok Marketing API cho Dashboard" :
                       "Hướng dẫn chi tiết quy trình tự động hóa qua Make.com"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFullDoc(false)}
                  style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "var(--foreground)", color: "var(--background)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "rotate(90deg)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "rotate(0deg)"}
                >
                  <i className="bi bi-x-lg" style={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "50px 80px", color: "var(--foreground)", lineHeight: 1.8 }}>
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                  {activeTab === 'yt' ? (
                    <>
                      <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 16, letterSpacing: "-0.03em" }}>HƯỚNG DẪN KẾT NỐI YOUTUBE ANALYTICS API</h1>
                      <p style={{ fontSize: 16, color: "var(--muted-foreground)", marginBottom: 48 }}>
                        Tài liệu này hướng dẫn chi tiết cách tạo dự án trên <b>Google Cloud Console</b> và cấu hình <b>Native OAuth2</b> để tự động đồng bộ hóa các chỉ số hiệu quả từ kênh YouTube của bạn.
                      </p>

                      <section style={{ marginBottom: 48 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FF0000", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                           <i className="bi bi-shield-lock" /> 📋 Điều kiện cần có
                        </h3>
                        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 20 }}>
                          <li style={{ display: "flex", gap: 12 }}>
                            <i className="bi bi-check2-square" style={{ color: "#FF0000", fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>Tài khoản Google (Gmail) quản lý kênh YouTube.</div>
                              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
                                Bạn cần có quyền truy cập vào kênh YouTube và Google Cloud Console.
                              </div>
                            </div>
                          </li>
                          <li style={{ display: "flex", gap: 12 }}>
                            <i className="bi bi-check2-square" style={{ color: "#FF0000", fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>Tài khoản Google Cloud Console đã kích hoạt Billing (Tùy chọn).</div>
                              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
                                API YouTube Analytics có hạn mức miễn phí rất lớn, thông thường bạn sẽ không mất phí.
                              </div>
                            </div>
                          </li>
                        </ul>
                      </section>

                      <section style={{ marginBottom: 48 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", marginBottom: 32, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}>
                           🚀 Quy trình thiết lập chi tiết (10 - 15 phút)
                        </h3>
                        
                        {[
                          { 
                            step: "Bước 1", 
                            title: "Tạo Dự án (Project) mới trên Google Cloud", 
                            content: "Dự án là 'vùng không gian' riêng để bạn quản lý việc kết nối dữ liệu. Bạn không nên dùng chung dự án với các dịch vụ khác.",
                            subSteps: [
                              "Truy cập: https://console.cloud.google.com/",
                              "Ở thanh công cụ trên cùng, nhấn vào **danh sách Dự án** (thường nằm cạnh Logo Google Cloud).",
                              "Nhấn vào nút **'NEW PROJECT'** (Dự án mới) ở góc trên bên phải cửa sổ hiện ra.",
                              "Đặt tên dự án dễ nhớ (Ví dụ: 'He thong Marketing CRM') và nhấn **CREATE**."
                            ]
                          },
                          { 
                            step: "Bước 2", 
                            title: "Kích hoạt các API cần thiết", 
                            content: "Mặc định Google Cloud không bật sẵn tính năng đọc dữ liệu Youtube, bạn cần phải 'xin phép' thủ công.",
                            subSteps: [
                              "Tại thanh menu bên trái, chọn **APIs & Services** > **Library**.",
                              "Tìm kiếm từ khóa: **'YouTube Analytics API'** và nhấn vào kết quả. Nhấn nút **ENABLE**.",
                              "Tiếp tục tìm kiếm: **'YouTube Data API v3'** và cũng nhấn **ENABLE** (API này giúp lấy tên kênh và avatar)."
                            ]
                          },
                          { 
                            step: "Bước 3", 
                            title: "Cấu hình Màn hình Ủy quyền (OAuth Consent Screen)", 
                            content: "Đây là màn hình sẽ hiện ra khi bạn đăng nhập tài khoản Google. Nó xác nhận bạn cho phép hệ thống đọc dữ liệu của bạn.",
                            subSteps: [
                              "Vào **APIs & Services** > **OAuth consent screen**.",
                              "Chọn **User Type** là **External** (Để cho phép tài khoản Gmail cá nhân kết nối). Nhấn **Create**.",
                              "**App Information**: Điền tên ứng dụng (VD: CRM Analytics), email hỗ trợ và email liên hệ kỹ thuật.",
                              "**Scopes**: Đây là bước quan trọng nhất. Nhấn **ADD OR REMOVE SCOPES**. Tìm và chọn 2 dòng: `.../auth/yt-analytics.readonly` và `.../auth/youtube.readonly`.",
                              "**Test Users**: RẤT QUAN TRỌNG. Nhấn **ADD USERS** và điền chính xác địa chỉ Gmail quản lý kênh Youtube của bạn vào đây. Nếu không điền, bạn sẽ bị lỗi 'Access Denied'."
                            ]
                          },
                          { 
                            step: "Bước 4", 
                            title: "Tạo mã Client ID và Client Secret", 
                            content: "Đây giống như là Tên đăng nhập và Mật khẩu bí mật để hệ thống CRM có thể 'nói chuyện' với Google.",
                            subSteps: [
                              "Vào **APIs & Services** > **Credentials**.",
                              "Nhấn **+ CREATE CREDENTIALS** > Chọn **OAuth client ID**.",
                              "**Application type**: Chọn **Web application**.",
                              "**Authorized redirect URIs**: Nhấn nút **ADD URI** và dán chính xác link màu đỏ bên dưới vào.",
                              "Nhấn **CREATE**. Một cửa sổ sẽ hiện ra chứa **Client ID** và **Client Secret**. Hãy copy 2 mã này."
                            ],
                            details: [
                              { label: "Redirect URI (Copy dòng này)", value: redirectUri }
                            ],
                            warning: "Lưu ý: Không được thừa hay thiếu bất kỳ ký tự nào trong Redirect URI, kể cả dấu '/' ở cuối."
                          },
                          { 
                            step: "Bước 5", 
                            title: "Kết nối trên CRM và hoàn tất", 
                            content: "Quay lại Dashboard của bạn để thực hiện bước cuối cùng.",
                            subSteps: [
                              "Dán **Client ID** và **Client Secret** vào Form cấu hình.",
                              "Nhấn **Lưu cấu hình** để hệ thống ghi nhớ.",
                              "Nhấn nút **Kết nối tài khoản Google**. Đăng nhập bằng đúng tài khoản Gmail bạn đã thêm ở Bước 3.",
                              "Nhấn **Allow (Cho phép)** khi Google hỏi quyền truy cập dữ liệu Analytics."
                            ]
                          }
                        ].map((item, idx) => (
                          <div key={idx} style={{ marginBottom: 60, paddingLeft: 20, borderLeft: "2px solid rgba(255,0,0,0.1)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, marginLeft: -32 }}>
                               <span style={{ fontSize: 10, fontWeight: 900, background: "#FF0000", color: "#fff", padding: "4px 12px", borderRadius: 100, textTransform: "uppercase", boxShadow: "0 4px 12px rgba(255,0,0,0.2)" }}>{item.step}</span>
                               <h4 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>{item.title}</h4>
                            </div>
                            <p style={{ margin: "0 0 20px", fontSize: 15, color: "var(--muted-foreground)", fontWeight: 500 }}>{item.content}</p>
                            
                            <div style={{ background: "var(--muted)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }}>
                               <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                                 {item.subSteps.map((ss, ssi) => (
                                   <li key={ssi} style={{ display: "flex", gap: 12, fontSize: 14, color: "var(--foreground)", lineHeight: 1.6 }}>
                                      <i className="bi bi-arrow-right-circle-fill" style={{ color: "#FF0000", fontSize: 16, marginTop: 2 }} />
                                      <span dangerouslySetInnerHTML={{ __html: ss.replace(/\*\*(.*?)\*\*/g, '<b style="color:#FF0000">$1</b>') }} />
                                   </li>
                                 ))}
                               </ul>
                            </div>

                            {item.details && (
                              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                                {item.details.map((d, i) => (
                                  <div key={i} style={{ padding: "16px 20px", background: "rgba(255,0,0,0.03)", borderRadius: 16, border: "1px dashed #FF0000" }}>
                                    <div style={{ fontSize: 11, fontWeight: 900, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>{d.label}</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "#FF0000", wordBreak: "break-all", fontFamily: "monospace" }}>{d.value}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {item.warning && (
                              <div style={{ marginTop: 16, display: "flex", gap: 10, color: "#92400e", background: "#fef3c7", padding: "12px 16px", borderRadius: 12, fontSize: 13 }}>
                                <i className="bi bi-exclamation-triangle-fill" />
                                <b>{item.warning}</b>
                              </div>
                            )}
                          </div>
                        ))}
                      </section>
                    </>
                  ) : activeTab === 'tt' ? (
                    <>
                      <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 16, letterSpacing: "-0.03em" }}>HƯỚNG DẪN KẾT NỐI TIKTOK MARKETING API</h1>
                      <p style={{ fontSize: 16, color: "var(--muted-foreground)", marginBottom: 48 }}>
                        Tài liệu này hướng dẫn chi tiết cách tạo dự án trên <b>TikTok For Business Developers</b> và cấu hình <b>OAuth2</b> để tự động đồng bộ hóa các chỉ số quảng cáo (Chi phí, Lượt xem, Click) về Dashboard CRM của bạn.
                      </p>

                      <section style={{ marginBottom: 48 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                           <i className="bi bi-shield-check" /> 📋 Điều kiện cần có
                        </h3>
                        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 20 }}>
                          <li style={{ display: "flex", gap: 12 }}>
                            <i className="bi bi-check2-square" style={{ color: "var(--foreground)", fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>Tài khoản TikTok For Business.</div>
                              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
                                Bạn cần có tài khoản quảng cáo đang hoạt động để lấy dữ liệu.
                              </div>
                            </div>
                          </li>
                          <li style={{ display: "flex", gap: 12 }}>
                            <i className="bi bi-check2-square" style={{ color: "var(--foreground)", fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>Quyền truy cập TikTok Developer Console.</div>
                              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
                                Đăng ký tại ads.tiktok.com/marketing_api/homepage.
                              </div>
                            </div>
                          </li>
                        </ul>
                      </section>

                      <section style={{ marginBottom: 48 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", marginBottom: 32, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}>
                           🚀 Quy trình thiết lập chi tiết (15 - 20 phút)
                        </h3>
                        
                        {[
                          { 
                            step: "Bước 1", 
                            title: "Đăng ký tài khoản Developer", 
                            content: "Truy cập TikTok Marketing API Homepage và hoàn thiện hồ sơ Developer của bạn.",
                            subSteps: [
                              "Truy cập: ads.tiktok.com/marketing_api/homepage/",
                              "Đăng nhập bằng tài khoản TikTok Ads của bạn.",
                              "Điền thông tin hồ sơ (Cá nhân/Doanh nghiệp) để được cấp quyền tạo App."
                            ]
                          },
                          { 
                            step: "Bước 2", 
                            title: "Tạo Ứng dụng (App) mới", 
                            content: "Tạo một App để kết nối CRM của bạn với dữ liệu quảng cáo TikTok.",
                            subSteps: [
                              "Nhấn nút **'Create App'** trong Dashboard.",
                              "Đặt tên cho App (Ví dụ: 'CRM Analytics Connector').",
                              "Mô tả mục đích sử dụng App để TikTok phê duyệt (Dùng nội bộ để theo dõi báo cáo)."
                            ]
                          },
                          { 
                            step: "Bước 3", 
                            title: "Cấu hình Permissions & Redirect URI", 
                            content: "Cấp quyền cho App và thiết lập đường dẫn quay về sau khi ủy quyền.",
                            subSteps: [
                              "Trong menu **Permissions**, hãy chọn các quyền: `Ads Management` và `Ads Reporting`.",
                              "Tìm mục **Redirect URI**, nhấn **Add URI** và dán link màu đen bên dưới vào.",
                              "Lưu thay đổi để TikTok ghi nhận cấu hình."
                            ],
                            details: [
                              { label: "Redirect URI (Copy dòng này)", value: redirectUri }
                            ]
                          },
                          { 
                            step: "Bước 4", 
                            title: "Lấy App ID và Secret Key", 
                            content: "Sao chép thông tin nhận diện App để dán vào CRM.",
                            subSteps: [
                              "Tìm mục **App Secret**, nhấn **Show** để xem mã bí mật.",
                              "Copy cả **App ID** và **Secret Key**.",
                              "**Lưu ý**: Tuyệt đối không chia sẻ Secret Key cho bất kỳ ai."
                            ]
                          },
                          { 
                            step: "Bước 5", 
                            title: "Kết nối trên CRM và hoàn tất", 
                            content: "Dán thông tin vào CRM và thực hiện bước ủy quyền cuối cùng.",
                            subSteps: [
                              "Dán mã vào Form cấu hình trên CRM và nhấn **Lưu cấu hình**.",
                              "Nhấn nút **Kết nối tài khoản TikTok**.",
                              "Nhấn **Confirm (Xác nhận)** trên màn hình TikTok để cấp quyền cho App của bạn."
                            ]
                          }
                        ].map((item, idx) => (
                          <div key={idx} style={{ marginBottom: 60, paddingLeft: 20, borderLeft: "2px solid rgba(0,0,0,0.1)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, marginLeft: -32 }}>
                               <span style={{ fontSize: 10, fontWeight: 900, background: "var(--foreground)", color: "var(--background)", padding: "4px 12px", borderRadius: 100, textTransform: "uppercase" }}>{item.step}</span>
                               <h4 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>{item.title}</h4>
                            </div>
                            <p style={{ margin: "0 0 20px", fontSize: 15, color: "var(--muted-foreground)", fontWeight: 500 }}>{item.content}</p>
                            
                            <div style={{ background: "var(--muted)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }}>
                               <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                                 {item.subSteps.map((ss, ssi) => (
                                   <li key={ssi} style={{ display: "flex", gap: 12, fontSize: 14, color: "var(--foreground)", lineHeight: 1.6 }}>
                                      <i className="bi bi-tiktok" style={{ fontSize: 16, marginTop: 2 }} />
                                      <span dangerouslySetInnerHTML={{ __html: ss.replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--foreground)">$1</b>') }} />
                                   </li>
                                 ))}
                               </ul>
                            </div>

                            {item.details && (
                              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                                {item.details.map((d, i) => (
                                  <div key={i} style={{ padding: "16px 20px", background: "var(--muted)", borderRadius: 16, border: "1px dashed var(--foreground)" }}>
                                    <div style={{ fontSize: 11, fontWeight: 900, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>{d.label}</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", wordBreak: "break-all", fontFamily: "monospace" }}>{d.value}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </section>
                    </>
                  ) : (
                    <>
                      <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 16, letterSpacing: "-0.03em" }}>HƯỚNG DẪN KẾT NỐI FACEBOOK & INSTAGRAM QUA MAKE.COM</h1>
                      <p style={{ fontSize: 16, color: "var(--muted-foreground)", marginBottom: 48 }}>
                        Tài liệu này hướng dẫn bạn cách thiết lập luồng đẩy dữ liệu tự động từ <b>Facebook & Instagram Lead Ads</b> về hệ thống CRM của bạn bằng công cụ trung gian <b>Make.com</b> (trước đây là Integromat).
                      </p>

                      <section style={{ marginBottom: 48 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1877F2", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                           <i className="bi bi-card-checklist" /> 📋 Điều kiện cần có
                        </h3>
                        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 20 }}>
                          <li style={{ display: "flex", gap: 12 }}>
                            <i className="bi bi-check2-square" style={{ color: "#1877F2", fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>Tài khoản Make.com (Gói Free là đủ dùng).</div>
                              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
                                Đăng ký miễn phí tại <a href="https://www.make.com/en/register" target="_blank" rel="noreferrer" style={{ color: "#1877F2", fontWeight: 700 }}>make.com</a>. Bạn có thể dùng tài khoản Google để đăng ký nhanh.
                              </div>
                            </div>
                          </li>
                          <li style={{ display: "flex", gap: 12 }}>
                            <i className="bi bi-check2-square" style={{ color: "#1877F2", fontSize: 18, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>Tài khoản Facebook có quyền Quản trị viên của Fanpage.</div>
                              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
                                Kiểm tra tại: <b>Cài đặt trang &gt; Trải nghiệm Trang mới &gt; Quyền truy cập trang</b>. Tên bạn phải nằm trong danh sách "Người có quyền truy cập Facebook".
                              </div>
                            </div>
                          </li>
                        </ul>
                      </section>

                      <section style={{ marginBottom: 48 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", marginBottom: 32, textTransform: "uppercase" }}>🚀 Quy trình tự động hóa chi tiết</h3>
                        
                        {[
                          { 
                            step: "Bước 1", 
                            title: "Lấy Link Webhook từ CRM", 
                            content: "Đây là 'địa chỉ nhà' của CRM để Make.com biết nơi gửi dữ liệu đến.",
                            subSteps: [
                              "Mở mục **Kết nối nguồn Lead** tại tab Facebook trong Dashboard CRM.",
                              "Tại phần 'Cách 1: Kết nối nhanh', nhấn nút **Copy** để sao chép link Webhook.",
                              "Lưu link này ra Notepad để dùng cho Bước 4."
                            ]
                          },
                          { 
                            step: "Bước 2", 
                            title: "Thiết lập Scenario trên Make.com", 
                            content: "Scenario giống như một robot tự động làm việc cho bạn 24/7.",
                            subSteps: [
                              "Đăng nhập vào Make.com, nhấn **Create a new scenario**.",
                              "Nhấn vào dấu cộng (+), tìm module **'Facebook Lead Ads'**.",
                              "Chọn Trigger: **Watch Leads** (Tự động chạy khi có khách hàng đăng ký mới)."
                            ]
                          },
                          { 
                            step: "Bước 3", 
                            title: "Kết nối Fanpage và chọn Form", 
                            content: "Robot cần biết nó phải canh chừng ở Trang nào và Mẫu (Form) quảng cáo nào.",
                            subSteps: [
                              "Nhấn **Add** để kết nối tài khoản Facebook cá nhân của bạn.",
                              "**Page**: Chọn chính xác Fanpage đang chạy quảng cáo.",
                              "**Form**: Chọn 'All' nếu muốn lấy từ tất cả quảng cáo, hoặc chọn đích danh mẫu bạn cần."
                            ]
                          },
                          { 
                            step: "Bước 4", 
                            title: "Cấu hình Module HTTP (Đẩy dữ liệu)", 
                            content: "Đây là bước quan trọng nhất để 'bắc cầu' dữ liệu về CRM.",
                            subSteps: [
                              "Nhấn vào nút **Add another module**, tìm từ khóa **'HTTP'**.",
                              "Chọn Action: **Make a request**.",
                              "**URL**: Dán link Webhook đã copy ở Bước 1.",
                              "**Method**: Chọn **POST**.",
                              "**Body content type**: Chọn **Raw**.",
                              "**Content type**: Chọn **JSON (application/json)**."
                            ],
                            code: '{\n  "fullName": "{{1.full_name}}",\n  "phone": "{{1.phone_number}}",\n  "email": "{{1.email}}",\n  "campaignExternalId": "{{1.campaign_id}}",\n  "externalId": "{{1.ad_id}}",\n  "source": "facebook_make"\n}',
                            warning: "Trong đoạn mã trên, hãy xóa phần trong ngoặc {{...}} và click chọn các trường tương ứng từ danh sách gợi ý của Make.com."
                          },
                          { 
                            step: "Bước 5", 
                            title: "Kiểm tra và Kích hoạt", 
                            content: "Đảm bảo mọi thứ hoạt động hoàn hảo trước khi để robot tự chạy.",
                            subSteps: [
                              "Nhấn **Run once** ở góc dưới bên trái Make.com.",
                              "Sử dụng **Facebook Lead Ads Testing Tool** để gửi Lead thử nghiệm.",
                              "Nếu Module HTTP hiện vòng tròn xanh lá và CRM nhận được lead -> Thành công.",
                              "Gạt nút **Scheduling** sang **ON** để robot bắt đầu làm việc."
                            ]
                          }
                        ].map((item, idx) => (
                          <div key={idx} style={{ marginBottom: 60, paddingLeft: 20, borderLeft: "2px solid rgba(24,119,242,0.1)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, marginLeft: -32 }}>
                               <span style={{ fontSize: 10, fontWeight: 900, background: "#1877F2", color: "#fff", padding: "4px 12px", borderRadius: 100, textTransform: "uppercase" }}>{item.step}</span>
                               <h4 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>{item.title}</h4>
                            </div>
                            <p style={{ margin: "0 0 20px", fontSize: 15, color: "var(--muted-foreground)", fontWeight: 500 }}>{item.content}</p>
                            
                            <div style={{ background: "var(--muted)", borderRadius: 20, padding: 24, border: "1px solid var(--border)" }}>
                               <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                                 {item.subSteps.map((ss, ssi) => (
                                   <li key={ssi} style={{ display: "flex", gap: 12, fontSize: 14, color: "var(--foreground)", lineHeight: 1.6 }}>
                                      <i className="bi bi-check-circle-fill" style={{ color: "#1877F2", fontSize: 16, marginTop: 2 }} />
                                      <span dangerouslySetInnerHTML={{ __html: ss.replace(/\*\*(.*?)\*\*/g, '<b style="color:#1877F2">$1</b>') }} />
                                   </li>
                                 ))}
                               </ul>
                            </div>

                            {item.code && (
                              <div style={{ marginTop: 24 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                                  <i className="bi bi-code-square" style={{ color: "#1877F2" }} /> Cấu trúc JSON chuẩn:
                                </p>
                                <pre style={{ margin: 0, background: "#0f172a", color: "#38bdf8", padding: 24, borderRadius: 16, fontSize: 13, overflowX: "auto", border: "1px solid rgba(56,189,248,0.2)", fontFamily: "monospace" }}>
                                  {item.code}
                                </pre>
                                <div style={{ marginTop: 14, padding: "12px 16px", background: "rgba(245, 158, 11, 0.05)", borderRadius: 12, border: "1px solid rgba(245, 158, 11, 0.2)", display: "flex", gap: 10 }}>
                                   <i className="bi bi-info-circle" style={{ color: "#f59e0b", fontSize: 16 }} />
                                   <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                                      <b>Mẹo:</b> {item.warning}
                                   </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </section>
                    </>
                  )}

                  <section style={{ marginBottom: 48, padding: 32, borderRadius: 24, background: "rgba(239, 68, 68, 0.03)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                       <i className="bi bi-exclamation-triangle" /> 💡 Các lỗi thường gặp
                    </h3>
                    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                      {activeTab === 'yt' ? (
                        <>
                          <li style={{ display: "flex", gap: 12 }}>
                            <div style={{ fontWeight: 800, minWidth: 120 }}>redirect_uri_mismatch:</div>
                            <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Link dán vào Google Cloud phải khớp 100% với Redirect URI trên CRM.</div>
                          </li>
                          <li style={{ display: "flex", gap: 12 }}>
                            <div style={{ fontWeight: 800, minWidth: 120 }}>Access Denied:</div>
                            <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Hãy thêm Email của bạn vào mục "Test Users" trong phần OAuth Consent Screen.</div>
                          </li>
                        </>
                      ) : (
                        <>
                          <li style={{ display: "flex", gap: 12 }}>
                            <div style={{ fontWeight: 800, minWidth: 120 }}>Lỗi 403:</div>
                            <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Do tài khoản chưa có quyền "Lead Access" trên Business Suite. Hãy vào Business Settings &gt; Integrations &gt; Lead Access để cấp quyền.</div>
                          </li>
                          <li style={{ display: "flex", gap: 12 }}>
                            <div style={{ fontWeight: 800, minWidth: 120 }}>Data trống:</div>
                            <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Kiểm tra xem Form trên Facebook có đúng các trường full_name, phone_number không.</div>
                          </li>
                          <li style={{ display: "flex", gap: 12 }}>
                            <div style={{ fontWeight: 800, minWidth: 120 }}>Không hiện lead:</div>
                            <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Kiểm tra URL Webhook xem đã chính xác chưa (phải bắt đầu bằng https://).</div>
                          </li>
                        </>
                      )}
                    </ul>
                  </section>

                  <div style={{ marginTop: 64, textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 48 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Chúc bạn thành công! Nếu gặp khó khăn, hãy liên hệ bộ phận kỹ thuật.</p>
                    <button 
                      onClick={() => setShowFullDoc(false)} 
                      style={{ padding: "16px 60px", borderRadius: 100, border: "none", background: activeTab === 'yt' ? "#FF0000" : "#10b981", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: activeTab === 'yt' ? "0 15px 30px rgba(255,0,0,0.3)" : "0 15px 30px rgba(16,185,129,0.3)", transition: "transform 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "none"}
                    >
                      Đóng hướng dẫn
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CẤU HÌNH IMPORT */}
      <AnimatePresence>
        {importModalOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={() => !isImporting && setImportModalOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} style={{ position: "relative", zIndex: 1001, width: 480, background: "var(--card)", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ padding: 20, background: "linear-gradient(135deg, #1e293b, #0f172a)" }}>
                <h3 style={{ margin: 0, color: "#fff", fontSize: 16, fontWeight: 800 }}>Tùy chọn Import Dữ liệu</h3>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Đã tải sẵn {importData.length} chiến dịch từ Excel</p>
              </div>
              <div style={{ padding: 24 }}>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--foreground)", fontWeight: 500 }}>Vui lòng chọn cách xử lý nếu phát hiện dữ liệu trùng lặp (trùng Chiến dịch + Ngày + Nền tảng):</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, border: importMode === "upsert" ? "2px solid #10b981" : "2px solid var(--border)", background: importMode === "upsert" ? "rgba(16,185,129,0.05)" : "var(--background)", cursor: "pointer", transition: "0.2s" }}>
                    <input type="radio" name="importMode" value="upsert" checked={importMode === "upsert"} onChange={() => setImportMode("upsert")} style={{ marginTop: 2, accentColor: "#10b981", transform: "scale(1.2)" }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Cập nhật & Thêm mới (Khuyên dùng)</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4, lineHeight: 1.5 }}>Ghi đè số liệu mới lên các ngày đã có. Thêm mới các ngày chưa có trong hệ thống. Thích hợp để "sửa sai" số liệu.</div>
                    </div>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, border: importMode === "skip" ? "2px solid #3b82f6" : "2px solid var(--border)", background: importMode === "skip" ? "rgba(59,130,246,0.05)" : "var(--background)", cursor: "pointer", transition: "0.2s" }}>
                    <input type="radio" name="importMode" value="skip" checked={importMode === "skip"} onChange={() => setImportMode("skip")} style={{ marginTop: 2, accentColor: "#3b82f6", transform: "scale(1.2)" }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Chỉ thêm mới (Bỏ qua dòng trùng)</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4, lineHeight: 1.5 }}>Chỉ import dữ liệu của những ngày hoàn toàn mới. Tuyệt đối không thay đổi số liệu đã tồn tại trong hệ thống.</div>
                    </div>
                  </label>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                  <button disabled={isImporting} onClick={() => setImportModalOpen(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontWeight: 600, cursor: "pointer" }}>Hủy</button>
                  <button disabled={isImporting} onClick={confirmImport} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 700, cursor: isImporting ? "default" : "pointer", opacity: isImporting ? 0.7 : 1 }}>{isImporting ? "Đang xử lý..." : "Xác nhận Import"}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
