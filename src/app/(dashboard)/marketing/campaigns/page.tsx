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
function ConnectAdsOffcanvas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('fb');
  const [origin, setOrigin] = useState('');

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
    { key: "fb", label: "Facebook", icon: "bi-facebook", color: "#1877F2", devUrl: "https://developers.facebook.com/apps/{id}/settings/basic/" },
    { key: "yt", label: "Youtube Analytics", icon: "bi-youtube", color: "#FF0000", devUrl: "https://console.cloud.google.com/apis/credentials" },
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
              
              {/* ── RECOMMENDED: WEBHOOK METHOD (SIMPLE) ── */}
              {(activeTab === 'fb' || activeTab === 'ig' || activeTab === 'tt') && (
                <div style={{ background: "rgba(16, 185, 129, 0.05)", borderRadius: 16, padding: "20px", border: "1px solid rgba(16, 185, 129, 0.2)", marginBottom: 24 }}>
                  <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-magic" style={{ color: "#fff", fontSize: 20 }} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>Cách 1: Kết nối nhanh (Khuyên dùng)</h4>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
                        Không cần tạo App, không cần xác minh lằng nhằng.
                      </p>
                    </div>
                  </div>

                  <div style={{ background: "var(--card)", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Địa chỉ Webhook của bạn:</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <code style={{ flex: 1, background: "var(--muted)", padding: "8px 12px", borderRadius: 8, fontSize: 11, color: "#10b981", fontWeight: 700, border: "1px solid var(--border)", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {`${origin}/api/marketing/leads/webhook/${activeTab === 'fb' ? 'facebook' : activeTab === 'ig' ? 'instagram' : 'tiktok'}`}
                      </code>
                      <button onClick={() => copyToClipboard(`${origin}/api/marketing/leads/webhook/${activeTab === 'fb' ? 'facebook' : activeTab === 'ig' ? 'instagram' : 'tiktok'}`)} style={{ padding: "0 12px", borderRadius: 8, border: "none", background: "var(--foreground)", color: "var(--background)", cursor: "pointer", fontWeight: 700, fontSize: 11 }}>Copy</button>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--foreground)", color: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>1</div>
                      <p style={{ margin: 0, fontSize: 12 }}>Copy link Webhook ở trên.</p>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--foreground)", color: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>2</div>
                      <p style={{ margin: 0, fontSize: 12 }}>Dán vào <b>Make.com</b> hoặc <b>Zapier</b> để nối với Facebook.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ADVANCED: CUSTOM APP METHOD ── */}
              <details style={{ marginBottom: 24 }}>
                <summary style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)", cursor: "pointer", padding: "10px 0", outline: "none" }}>
                  <i className="bi bi-gear me-2" /> Cấu hình nâng cao (Tự tạo App riêng)
                </summary>
                
                <div style={{ paddingTop: 16 }}>
                  {/* PHẦN 1: Redirect URI */}
                  <div style={{ background: "var(--muted)", borderRadius: 14, padding: 18, marginBottom: 24, border: "1px dashed var(--border)" }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
                      <i className="bi bi-link-45deg" style={{ fontSize: 18 }} /> URI Chuyển hướng OAuth
                    </h4>
                    {activeTab === 'fb' || activeTab === 'ig' ? (
                      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                        1. Truy cập <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" style={{ color: "#1877F2", fontWeight: 800 }}>Meta for Developers</a> &gt; Chọn App của bạn.<br/>
                        2. Vào <b>Facebook Login</b> &gt; <b>Settings</b>.<br/>
                        3. Dán link dưới đây vào <b>Valid OAuth Redirect URIs</b>:
                      </p>
                    ) : activeTab === 'yt' ? (
                      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                        1. Truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: "#FF0000", fontWeight: 800 }}>Google Cloud Console</a> &gt; Bật thư viện <b>YouTube Analytics API</b>.<br/>
                        2. Vào <b>APIs &amp; Services</b> &gt; <b>Credentials</b>.<br/>
                        3. Thêm link dưới đây vào <b>Authorized redirect URIs</b>:
                      </p>
                    ) : (
                      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                        1. Truy cập <a href="https://developers.tiktok.com/console" target="_blank" rel="noreferrer" style={{ color: "var(--foreground)", fontWeight: 800 }}>Tiktok Developer</a> &gt; Chọn App của bạn.<br/>
                        2. Vào <b>App Details</b> &gt; <b>Login Config</b>.<br/>
                        3. Thêm link dưới đây vào <b>Redirect Domain / URI</b>:
                      </p>
                    )}
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
                </div>
              </details>

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === THÊM STATE CHO IMPORT MODAL VÀ LỌC BIỂU ĐỒ ===
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<"upsert" | "skip">("upsert");
  const [isImporting, setIsImporting] = useState(false);
  const [chartRange, setChartRange] = useState<"7" | "14" | "30" | "custom">("30");

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
      <ConnectAdsOffcanvas open={isConnectOpen} onClose={() => setIsConnectOpen(false)} />

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
