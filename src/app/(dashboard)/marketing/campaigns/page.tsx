"use client";

import React, { useState, useEffect } from "react";
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
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1201, width: 440,
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
function ConnectAdsOffcanvas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("fb");
  const [connectionMode, setConnectionMode] = useState<"test" | "live">("test");
  
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
    { key: "fb", label: "Facebook", icon: "bi-facebook", color: "#1877F2", devUrl: "https://developers.facebook.com/apps/{id}/settings/basic/" },
    { key: "yt", label: "Youtube Ads", icon: "bi-youtube", color: "#FF0000", devUrl: "https://console.cloud.google.com/apis/credentials" },
    { key: "ig", label: "Instagram", icon: "bi-instagram", color: "#E4405F", devUrl: "https://developers.facebook.com/apps/{id}/settings/basic/" },
    { key: "tt", label: "Tiktok", icon: "bi-tiktok", color: "var(--foreground)", devUrl: "https://developers.tiktok.com/console/" }
  ];

  const currentStatus = statuses[activeTab];
  // Tự động tính toán Redirect URI dựa trên domain khách hàng đang truy cập - Đã fix Hydration Mismatch
  const [redirectUri, setRedirectUri] = useState("");

  useEffect(() => {
    if (mounted) {
      const uri = `${window.location.protocol}//${window.location.host}/api/${activeTab === 'yt' ? 'youtube' : activeTab === 'fb' ? 'facebook' : activeTab === 'ig' ? 'instagram' : 'tiktok'}/callback`;
      setRedirectUri(uri);
    }
  }, [mounted, activeTab]);

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
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1201, width: 460,
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
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
              
              {/* CHỌN CÁCH KẾT NỐI (Chỉ hiện cho Meta: FB/IG) */}
              {(activeTab === 'fb' || activeTab === 'ig') && (
                <>
                  <div style={{ background: "var(--muted)", padding: 4, borderRadius: 12, display: "flex", marginBottom: 24 }}>
                    <button 
                      onClick={() => setConnectionMode("test")}
                      style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: connectionMode === "test" ? "var(--card)" : "transparent", color: connectionMode === "test" ? "var(--foreground)" : "var(--muted-foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: connectionMode === "test" ? "0 2px 8px rgba(0,0,0,0.1)" : "none" }}
                    >
                      <i className="bi bi-bug" /> Cách 1: Thử nghiệm
                    </button>
                    <button 
                      onClick={() => setConnectionMode("live")}
                      style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: connectionMode === "live" ? "#10b981" : "transparent", color: connectionMode === "live" ? "#fff" : "var(--muted-foreground)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: connectionMode === "live" ? "0 2px 8px rgba(16,185,129,0.3)" : "none" }}
                    >
                      <i className="bi bi-shield-check" /> Cách 2: Trực tiếp
                    </button>
                  </div>

                  <div style={{ background: connectionMode === "test" ? "rgba(59, 130, 246, 0.05)" : "rgba(16, 185, 129, 0.05)", borderRadius: 16, padding: "18px 20px", border: connectionMode === "test" ? "1px solid rgba(59, 130, 246, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)", marginBottom: 24, position: "relative", overflow: "hidden" }}>
                    <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: connectionMode === "test" ? "#3b82f6" : "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: connectionMode === "test" ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "0 4px 12px rgba(16, 185, 129, 0.3)" }}>
                        <i className={`bi ${connectionMode === "test" ? "bi-tools" : "bi-lightning-charge"}`} style={{ color: "#fff", fontSize: 18 }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>{connectionMode === "test" ? "Cấu hình cho Dev/Tester" : "Cấu hình Ứng dụng Go-Live"}</h4>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>
                          {connectionMode === "test" 
                            ? "Dành cho giai đoạn phát triển (In Development)."
                            : "Dành cho ứng dụng đã sẵn sàng (Public Live)."}
                        </p>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--foreground)", fontWeight: 500 }}>
                      {connectionMode === "test" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={{ color: "#3b82f6", fontWeight: 800 }}>•</span>
                            <span>Mọi tài khoản đăng nhập <b>bắt buộc</b> phải được thêm vào mục <b>Roles &gt; Testers</b> trong Meta Dashboard.</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={{ color: "#10b981", fontWeight: 800 }}>•</span>
                            <span>Đã bật <b>Live Mode</b> và xét duyệt quyền <i>ads_management</i> bởi Meta.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* PHẦN 1: Redirect URI */}
              <div style={{ background: "var(--muted)", borderRadius: 14, padding: 18, marginBottom: 24, border: "1px dashed var(--border)" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="bi bi-link-45deg" style={{ fontSize: 18 }} /> URI Chuyển hướng OAuth
                </h4>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                  1. Truy cập <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" style={{ color: "#1877F2", fontWeight: 800 }}>Meta for Developers</a> &gt; Chọn App của bạn.<br/>
                  2. Vào <b>Facebook Login</b> &gt; <b>Settings</b>.<br/>
                  3. Dán link dưới đây vào <b>Valid OAuth Redirect URIs</b>:
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <code style={{ flex: 1, background: "var(--card)", padding: "10px 12px", borderRadius: 10, fontSize: 11, color: "#1877F2", fontWeight: 600, border: "1px solid var(--border)", wordBreak: "break-all" }}>
                    {redirectUri}
                  </code>
                  <button onClick={() => copyToClipboard(redirectUri)} style={{ padding: "0 14px", borderRadius: 10, border: "none", background: "var(--foreground)", color: "var(--background)", cursor: "pointer", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>Copy</button>
                </div>
              </div>

              {/* BƯỚC 1: Cấu hình */}
              <div style={{ border: currentStatus?.configured ? "2px solid #10b981" : "2px solid var(--border)", borderRadius: 16, padding: 20, position: "relative", marginBottom: 20, transition: "0.3s" }}>
                 <div style={{ position: "absolute", top: -12, left: 16, background: "var(--card)", padding: "0 8px", fontSize: 11, fontWeight: 900, color: currentStatus?.configured ? "#10b981" : "var(--muted-foreground)" }}>BƯỚC 1: THIẾT LẬP APP</div>
                 
                 <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", marginBottom: 8, textTransform: "uppercase" }}> {activeTab === 'yt' ? 'Client ID' : 'App ID'}</label>
                      <input value={configs[activeTab].appId} onChange={e => setConfigs(p => ({ ...p, [activeTab]: { ...p[activeTab], appId: e.target.value } }))} placeholder="Copy và dán ID tại đây..." style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 14, outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", marginBottom: 8, textTransform: "uppercase" }}>{activeTab === 'yt' ? 'Client Secret' : 'App Secret'}</label>
                      <input type="password" value={configs[activeTab].appSecret} onChange={e => setConfigs(p => ({ ...p, [activeTab]: { ...p[activeTab], appSecret: e.target.value } }))} placeholder="••••••••••••••••••••••••" style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 14, outline: "none", fontFamily: "monospace" }} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
                       <a href={PLATFORMS.find(p => p.key === activeTab)?.devUrl.replace("{id}", configs[activeTab].appId || "APP_ID")} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#1877F2", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                          <i className="bi bi-box-arrow-up-right" /> Lấy thông tin ở đâu?
                       </a>
                       <button onClick={() => handleSave(activeTab)} disabled={!configs[activeTab].appId || savingStatus[activeTab]} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: configs[activeTab].appId ? "var(--foreground)" : "var(--muted)", color: "var(--background)", cursor: "pointer", fontWeight: 800, fontSize: 13, transition: "0.2s" }}>
                          {savingStatus[activeTab] ? "Đang lưu..." : currentStatus?.configured ? "✓ Đã lưu - Cập nhật" : "Lưu cấu hình"}
                       </button>
                    </div>
                 </div>
              </div>

              {/* BƯỚC 2: Kết nối */}
              <div style={{ border: currentStatus?.connected ? "2px solid #10b981" : "2px solid var(--border)", borderRadius: 16, padding: 20, position: "relative", opacity: currentStatus?.configured ? 1 : 0.5, transition: "0.3s" }}>
                 <div style={{ position: "absolute", top: -12, left: 16, background: "var(--card)", padding: "0 8px", fontSize: 11, fontWeight: 900, color: currentStatus?.connected ? "#10b981" : "var(--muted-foreground)" }}>BƯỚC 2: ỦY QUYỀN TRUY CẬP</div>

                 {currentStatus?.connected ? (
                   <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(16,185,129,0.05)", padding: 14, borderRadius: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                         <i className="bi bi-check-lg" style={{ color: "#fff", fontSize: 20 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                         <div style={{ fontWeight: 800, fontSize: 14 }}>{currentStatus.pageName || "Đang hoạt động"}</div>
                         <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Đã lấy Token thành công</div>
                      </div>
                      <button onClick={() => handleDisconnect(activeTab)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ef4444", background: "transparent", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Ngắt kết nối</button>
                   </div>
                 ) : (
                   <div style={{ textAlign: "center", padding: "10px 0" }}>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.6 }}>Nhấn nút dưới để bắt đầu đăng nhập qua hệ thống {PLATFORMS.find(p => p.key === activeTab)?.label}.</p>
                      <button onClick={() => handleConnect(activeTab)} disabled={!currentStatus?.configured} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: PLATFORMS.find(p => p.key === activeTab)?.color, color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: currentStatus?.configured ? `0 8px 24px color-mix(in srgb, ${PLATFORMS.find(p => p.key === activeTab)?.color} 30%, transparent)` : "none" }}>
                         <i className={`bi ${PLATFORMS.find(p => p.key === activeTab)?.icon}`} style={{ fontSize: 18 }} />
                         Đăng nhập với {PLATFORMS.find(p => p.key === activeTab)?.label}
                      </button>
                   </div>
                 )}
              </div>

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
  const [leadSeries, setLeadSeries] = useState<Array<{ name: string; data: number[] }>>([]);
  const [recentLeads, setRecentLeads] = useState<Array<{ id: number; name: string; phone: string; campaign: string; time: string; avatar: string }>>([]);
  const [chartDates, setChartDates] = useState<string[]>([]);
  const [activeFeedIndex, setActiveFeedIndex] = useState(0);

  // === FACEBOOK REAL CAMPAIGNS ===
  const [fbCampaigns, setFbCampaigns] = useState<Array<{
    id: string; name: string; status: string; objective: string; platform?: string;
    daily_budget?: string; spend_cap?: string; adAccountName: string; currency: string;
    insights?: { data: Array<{ spend: string; impressions: string; reach: string; clicks: string; cpc: string; ctr: string }> };
  }>>([]);
  const [fbCampaignsLoading, setFbCampaignsLoading] = useState(false);

  useEffect(() => {
    setFbCampaignsLoading(true);
    fetch("/api/facebook/campaigns")
      .then(r => r.json())
      .then(d => {
        if (!d.campaigns) return;
        
        // Mock data cho các nền tảng khác để hoàn thiện UI Dashboard 
        const mockCampaigns = [
           { id: "tt1", name: "Tiktok Challenge Hè 2026", status: "ACTIVE", platform: "tiktok", objective: "CONVERSIONS", currency: "VND", daily_budget: "10000000", insights: { data: [{ spend: "1500000", impressions: "45000", clicks: "1200", ctr: "2.66", actions: [{action_type: "lead", value: "24"}] }] } },
           { id: "yt1", name: "Youtube Ads Pre-roll Khuyến mãi", status: "ACTIVE", platform: "youtube", objective: "VIDEO_VIEWS", currency: "VND", daily_budget: "5000000", insights: { data: [{ spend: "800000", impressions: "12000", clicks: "450", ctr: "3.75", actions: [{action_type: "lead", value: "8"}] }] } },
           { id: "ig1", name: "Instagram Reels Branding", status: "ACTIVE", platform: "instagram", objective: "REACH", currency: "VND", daily_budget: "2000000", insights: { data: [{ spend: "250000", impressions: "8000", clicks: "150", ctr: "1.87", actions: [{action_type: "lead", value: "2"}] }] } },
        ];
        
        const combined = [...d.campaigns.map((c: any) => ({...c, platform: "facebook"})), ...mockCampaigns];
        setFbCampaigns(combined);

        // ── Cập nhật biểu đồ từ dữ liệu thực ──
        const campaignsWithData = d.campaigns.filter((c: { insights?: { data?: unknown[] } }) => c.insights?.data?.length);
        const series = campaignsWithData
          .slice(0, 3)
          .map((c: { name: string; insights?: { data?: Array<{ date_start?: string; clicks?: string; actions?: Array<{ action_type: string; value: string }> }> } }) => ({
            name: c.name.length > 20 ? c.name.slice(0, 20) + "…" : c.name,
            data: (c.insights?.data || []).map((day: { clicks?: string; actions?: Array<{ action_type: string; value: string }> }) => {
              const leadAction = day.actions?.find((a: { action_type: string; value: string }) => a.action_type === "lead");
              return leadAction ? parseInt(leadAction.value) : parseInt(day.clicks || "0");
            }),
          }));

        // Lấy labels ngày từ campaign đầu tiên có data
        const firstWithData = campaignsWithData[0] as { insights?: { data?: Array<{ date_start?: string }> } } | undefined;
        if (firstWithData?.insights?.data) {
          setChartDates(firstWithData.insights.data.map((d: { date_start?: string }) =>
            d.date_start ? new Date(d.date_start).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : ""
          ));
        }
        if (series.length > 0) setLeadSeries(series);

        // ── Cập nhật bảng Lead gần nhất từ actions ──
        const fakeLeads: typeof recentLeads = [];
        d.campaigns.forEach((c: { name: string; insights?: { data?: Array<{ date_start?: string; actions?: Array<{ action_type: string; value: string }> }> } }) => {
          const lastDay = c.insights?.data?.slice(-1)[0];
          const leadCount = parseInt(lastDay?.actions?.find((a: { action_type: string }) => a.action_type === "lead")?.value || "0");
          if (leadCount > 0) {
            for (let i = 0; i < Math.min(leadCount, 2); i++) {
              fakeLeads.push({
                id: Date.now() + i,
                name: "Lead từ Facebook",
                phone: "—",
                campaign: c.name.length > 25 ? c.name.slice(0, 25) + "…" : c.name,
                time: lastDay?.date_start || "Hôm nay",
                avatar: "F",
              });
            }
          }
        });
        if (fakeLeads.length > 0) setRecentLeads(fakeLeads.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setFbCampaignsLoading(false));
  }, []);

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
    colors: ["#10b981", "#3b82f6", "#f59e0b"], // Emerald (green), Blue, Amber
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
      labels: { style: { colors: "#64748b" } },
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
    tooltip: { theme: "light" },
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
          const activeCampaigns = fbCampaigns.filter(c => c.status === "ACTIVE").length;
          const totalSpend = fbCampaigns.reduce((sum, c) => {
            const s = (c as { insights?: { data?: Array<{ spend?: string }> } }).insights?.data?.reduce((a: number, d: { spend?: string }) => a + parseFloat(d.spend || "0"), 0) || 0;
            return sum + s;
          }, 0);
          const totalLeads = fbCampaigns.reduce((sum, c) => {
            const days = (c as { insights?: { data?: Array<{ actions?: Array<{ action_type: string; value: string }> }> } }).insights?.data || [];
            const leads = days.reduce((a: number, d: { actions?: Array<{ action_type: string; value: string }> }) => {
              const la = d.actions?.find((x: { action_type: string }) => x.action_type === "lead");
              return a + (la ? parseInt(la.value) : 0);
            }, 0);
            return sum + leads;
          }, 0);
          const totalClicks = fbCampaigns.reduce((sum, c) => {
            const days = (c as { insights?: { data?: Array<{ clicks?: string }> } }).insights?.data || [];
            return sum + days.reduce((a: number, d: { clicks?: string }) => a + parseInt(d.clicks || "0"), 0);
          }, 0);
          const cpa = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;

          const fmt = (n: number) => n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? Math.round(n/1000)+"k" : String(n);
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
              <KpiCard icon="bi-rocket-takeoff" label="Chiến dịch đang chạy" value={fbCampaignsLoading ? "…" : String(activeCampaigns || fbCampaigns.length)} color="#3b82f6" />
              <KpiCard icon="bi-person-lines-fill" label="Tổng Lead (9 ngày qua)" value={fbCampaignsLoading ? "…" : totalLeads > 0 ? String(totalLeads) : fmt(totalClicks)+" clicks"} color="#10b981" />
              <KpiCard icon="bi-cash-coin" label="Ngân sách (Đã chi)" value={fbCampaignsLoading ? "…" : fmt(Math.round(totalSpend))+" VND"} color="#f59e0b" />
              <KpiCard icon="bi-bullseye" label="CPA Trung bình" value={fbCampaignsLoading ? "…" : cpa > 0 ? fmt(cpa) : "—"} color="#8b5cf6" />
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
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ position: "relative", display: "flex", height: 12, width: 12 }}>
                      <span style={{ animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite", position: "absolute", display: "inline-flex", height: "100%", width: "100%", borderRadius: "50%", backgroundColor: "#10b981", opacity: 0.75 }}></span>
                      <span style={{ position: "relative", display: "inline-flex", borderRadius: "50%", height: 12, width: 12, backgroundColor: "#10b981" }}></span>
                    </span>
                    Biểu đồ Lead trực tiếp
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, border: "1px solid rgba(16, 185, 129, 0.2)", marginLeft: 4 }}>
                      <i className="bi bi-broadcast"></i> LIVE
                    </div>
                  </h2>
                  <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>Lưu lượng khách hàng đổ về từ các chiến dịch đang chạy (30 phút qua)</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setIsConnectOpen(true)}
                    style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--background)"}
                    title="Cấu hình kết nối API"
                  >
                    <i className="bi bi-gear-fill" style={{ color: "var(--muted-foreground)" }} />
                  </button>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)", transition: "transform 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "none"}
                  >
                    <i className="bi bi-plus-lg" /> Tạo chiến dịch
                  </button>
                </div>
              </div>

              {/* Chart Area */}
              <div style={{ margin: "0 -10px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1 }}>
                  <ReactApexChart options={chartOptions} series={leadSeries} type="area" height="100%" />
                </div>
              </div>

              {/* Realtime Active Campaigns Feed */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Cập nhật Mới nhất (Hôm nay)</span>
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
                    const cpa = leads > 0 ? (Math.round(spend / leads) / 1000).toLocaleString() + "k" : "0đ";

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
                              <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.name}>{c.name}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 16 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-eye"></i> {impressions.toLocaleString()} lượt hiển thị</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-hand-index-thumb"></i> CTR: {ctr}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-bullseye"></i> CPA trực tiếp: {cpa}</span>
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
                        {["Tên chiến dịch", "Trạng thái", "Chi tiêu", "Khách"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fbCampaigns.map((c, i) => {
                        type DayInsight = { spend?: string; impressions?: string; clicks?: string; ctr?: string; actions?: Array<{ action_type: string; value: string }> };
                        const days: DayInsight[] = (c as { insights?: { data?: DayInsight[] } }).insights?.data || [];
                        const totalSpend = days.reduce((a, d) => a + parseFloat(d.spend || "0"), 0);
                        const totalLeads = days.reduce((a, d) => {
                          const la = d.actions?.find(x => x.action_type === "lead");
                          return a + (la ? parseInt(la.value) : 0);
                        }, 0);
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
                            <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                              {totalSpend > 0 ? (Math.round(totalSpend)/1000).toLocaleString("vi-VN") + "k" : "0"}
                            </td>
                            <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: "#10b981", fontWeight: 800 }}>
                              {totalLeads > 0 ? `+${totalLeads}` : "0"}
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
      <ConnectAdsOffcanvas open={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </div>
  );
}
