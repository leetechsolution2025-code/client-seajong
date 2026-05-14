"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

// ── Brand Data — SEAJONG (cập nhật từ seajong.com) ───────────────────────────
const BRAND_NAME    = "SEAJONG";
const BRAND_FULL    = "Công ty Cổ phần Sejong Faucet Việt Nam";
const BRAND_MISSION = "Tiên phong kiến tạo giá trị thực";
const BRAND_TAGLINE = "Công nghệ Hàn Quốc – Chất lượng cao – Giá hợp lý";
const BRAND_DESC    = "SEAJONG hoạt động hơn 5 năm, luôn nỗ lực mang đến sản phẩm và dịch vụ tốt nhất, với sứ mệnh 'Tiên phong kiến tạo giá trị thực' cho mỗi gia đình Việt Nam.";
const BRAND_LOGO    = "https://seajong.com/wp-content/uploads/2024/03/LOGO-SEAJONG-01-1.png";
const BRAND_WEBSITE = "https://seajong.com";
const BRAND_EMAIL   = "marketing@seajong.com";
const BRAND_HOTLINE = "1900 633 862";

const BRAND_COLORS = [
  { name: "Navy Primary",   hex: "#003087", usage: "Màu nhận diện chính – headline, logo, CTA quan trọng" },
  { name: "Gold Accent",    hex: "#C9A84C", usage: "Điểm nhấn cao cấp – badge, viền, icon nổi bật" },
  { name: "Deep Dark",      hex: "#0D1B2A", usage: "Text chính, nền dark mode, footer" },
  { name: "Light Cream",    hex: "#F8F5F0", usage: "Nền trang, background card, vùng nội dung sáng" },
  { name: "Seajong Red",    hex: "#C0392B", usage: "Khuyến mãi, cảnh báo, giá nổi bật" },
  { name: "Chrome Silver",  hex: "#8D9DB0", usage: "Text phụ, border, icon muted – gợi vật liệu inox" },
];

const TYPOGRAPHY = [
  {
    name: "Montserrat",
    role: "Font Heading (Tiêu đề & Tên thương hiệu)",
    weights: ["800 — ExtraBold", "700 — Bold", "600 — SemiBold"],
    sample: "SEAJONG — THIẾT BỊ CAO CẤP",
    style: { fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.04em" },
  },
  {
    name: "Open Sans",
    role: "Font Body (Nội dung & Mô tả)",
    weights: ["400 — Regular", "600 — SemiBold"],
    sample: "Kiến tạo không gian sống hoàn hảo cho gia đình Việt",
    style: { fontFamily: "'Open Sans', sans-serif" },
  },
];

const LOGO_USAGES = [
  { ok: true,  label: "Nền trắng / kem",         desc: "Logo Navy trên nền sáng — sử dụng phổ biến nhất" },
  { ok: true,  label: "Nền Navy thương hiệu",    desc: "Logo trắng trên nền #003087 — dùng cho header, backdrop" },
  { ok: true,  label: "Khoảng trắng bảo vệ",    desc: "Vùng sạch tối thiểu quanh logo = 1/4 chiều cao logo" },
  { ok: false, label: "Biến dạng tỷ lệ",         desc: "Tuyệt đối không kéo giãn hoặc bóp méo logo" },
  { ok: false, label: "Nền tối loạn màu",        desc: "Không đặt logo lên ảnh phức tạp, thiếu tương phản" },
  { ok: false, label: "Tự ý đổi màu logo",       desc: "Chỉ dùng logo Navy hoặc trắng — không dùng màu khác" },
];

const VOICE_TRAITS = [
  { trait: "Chuyên nghiệp",  icon: "bi-briefcase",      color: "#003087", desc: "Tư vấn chính xác, dựa trên kỹ thuật và dữ liệu thực tế." },
  { trait: "Tin cậy",        icon: "bi-shield-check",   color: "#10b981", desc: "Cam kết chính hãng, bảo hành minh bạch, không phóng đại." },
  { trait: "Cao cấp",        icon: "bi-gem",            color: "#C9A84C", desc: "Ngôn ngữ sang trọng, tinh tế — phản ánh chất lượng sản phẩm." },
  { trait: "Gần gũi",        icon: "bi-house-heart",   color: "#C0392B", desc: "Đặt ngôi nhà và gia đình Việt Nam làm trung tâm thông điệp." },
];

const DO_WORDS = ["Công nghệ Hàn Quốc", "Chất lượng hàng đầu", "Kiến tạo không gian sống", "Chính hãng", "Bảo hành uy tín", "Thiết kế cao cấp"];
const DONT_WORDS = ["Rẻ nhất thị trường", "Siêu khuyến mãi sốc", "Hàng nhái", "Giá rẻ bất ngờ", "Free ship 100%", "Duy nhất Việt Nam"];

const SAMPLE_MESSAGES = [
  { label: "Giới thiệu thương hiệu",   text: "SEAJONG – thương hiệu thiết bị vệ sinh và nhà bếp cao cấp, ứng dụng công nghệ Hàn Quốc, cam kết mang đến không gian sống hoàn hảo cho mỗi gia đình Việt." },
  { label: "Giới thiệu sản phẩm",      text: "[Tên sản phẩm] được thiết kế với vật liệu cao cấp, công nghệ Hàn Quốc – mang lại [lợi ích cụ thể] cho phòng tắm/bếp của bạn." },
  { label: "Xử lý phản hồi khách hàng", text: "Cảm ơn bạn đã tin tưởng Seajong. Chúng tôi cam kết hỗ trợ theo đúng chính sách bảo hành và sẽ liên hệ trong thời gian sớm nhất." },
];

// ── Helper ────────────────────────────────────────────────────────────────────
function SectionTitle({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`bi ${icon}`} style={{ fontSize: 16, color }} />
      </div>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>{label}</h2>
      <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
    </div>
  );
}

export default function BrandPage() {
  const [copiedHex, setCopiedHex]   = useState<string | null>(null);
  const [syncing, setSyncing]         = useState(false);
  const [lastSynced, setLastSynced]   = useState<string | null>(null);
  const [syncToast, setSyncToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [dynamicLogo, setDynamicLogo] = useState<string | null>(null);
  const [dynamicName, setDynamicName] = useState<string | null>(null);

  const logoSrc = dynamicLogo ?? BRAND_LOGO;
  const brandName = dynamicName ?? BRAND_NAME;

  const showSyncToast = (msg: string, ok: boolean) => {
    setSyncToast({ msg, ok });
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/company");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();

      if (data.logoUrl)   setDynamicLogo(data.logoUrl);
      if (data.shortName) setDynamicName(data.shortName.toUpperCase());

      const now = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      setLastSynced(now);
      showSyncToast("Đã đồng bộ thành công lúc " + now, true);
    } catch {
      showSyncToast("Không thể kết nối để đồng bộ", false);
    } finally {
      setSyncing(false);
    }
  };

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)", position: "relative" }}>

      {/* Sync Toast */}
      {syncToast && (
        <div style={{
          position: "fixed", top: 80, right: 24, zIndex: 9999,
          padding: "10px 18px", borderRadius: 10,
          background: syncToast.ok ? "#10b981" : "#ef4444",
          color: "#fff", fontSize: 13, fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "slideIn 0.2s ease",
        }}>
          <i className={`bi ${syncToast.ok ? "bi-check-circle" : "bi-x-circle"}`} />
          {syncToast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
      <PageHeader
        title="Nhận diện thương hiệu"
        description="Hệ thống màu sắc, typography và quy tắc sử dụng thương hiệu"
        color="rose"
        icon="bi-award"
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

          {/* ── 1. BRAND IDENTITY HERO ── */}
          <div className="app-card" style={{
            borderRadius: 18, overflow: "hidden", position: "relative",
            background: "linear-gradient(135deg, #003087 0%, #001f5c 50%, #0D1B2A 100%)",
            padding: "36px 40px",
          }}>
            {/* Background decoration */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", bottom: -60, right: 80, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 32 }}>
              {/* Logo */}
              <div style={{
                width: 96, height: 96, borderRadius: 20, background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(8px)", border: "1.5px solid rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                overflow: "hidden", padding: 8,
              }}>
                <img src={logoSrc} alt="Seajong Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>

              {/* Brand info */}
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Hệ thống nhận diện thương hiệu — {BRAND_WEBSITE}
                </p>
                <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
                  {brandName}
                </h1>
                <p style={{ margin: "0 0 3px", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{BRAND_FULL}</p>
                <p style={{ margin: "0 0 3px", fontSize: 12.5, color: "#C9A84C", fontStyle: "italic", fontWeight: 600 }}>
                  Sứ mệnh: "{BRAND_MISSION}"
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                  <i className="bi bi-globe me-1" />{BRAND_WEBSITE} &nbsp;·&nbsp;
                  <i className="bi bi-envelope me-1" />{BRAND_EMAIL}
                </p>
              </div>

              {/* Stats + Sync */}
              <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14, flexShrink: 0 }}>
                {/* Stats row */}
                <div style={{ display: "flex", gap: 24 }}>
                  {[
                    { val: "6", label: "Màu sắc" },
                    { val: "2", label: "Typeface" },
                    { val: "v2.0", label: "Phiên bản" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff" }}>{s.val}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Sync button */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 16px", borderRadius: 9,
                      background: syncing ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
                      border: "1.5px solid rgba(255,255,255,0.3)",
                      color: "#fff", fontSize: 12.5, fontWeight: 700,
                      cursor: syncing ? "default" : "pointer",
                      backdropFilter: "blur(4px)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (!syncing) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.22)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = syncing ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)"; }}
                  >
                    <i className={`bi bi-arrow-repeat${syncing ? " animate-spin" : ""}`} style={{ fontSize: 13 }} />
                    {syncing ? "Đang đồng bộ…" : "Cập nhật"}
                  </button>
                  {lastSynced && (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                      <i className="bi bi-check-circle me-1" />Đồng bộ lúc {lastSynced}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. COLOR PALETTE ── */}
          <div className="app-card" style={{ padding: "24px 28px", borderRadius: 18 }}>
            <SectionTitle icon="bi-palette" label="Bảng màu thương hiệu" color="#ec4899" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {BRAND_COLORS.map(c => (
                <div
                  key={c.hex}
                  onClick={() => copyHex(c.hex)}
                  style={{
                    borderRadius: 12, overflow: "hidden", cursor: "pointer",
                    border: "1.5px solid var(--border)", transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  {/* Color swatch */}
                  <div style={{ height: 72, background: c.hex, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {copiedHex === c.hex && (
                      <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "4px 10px", color: "#fff", fontSize: 12, fontWeight: 700, backdropFilter: "blur(4px)" }}>
                        <i className="bi bi-check me-1" />Đã copy!
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: "10px 12px", background: "var(--card)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--foreground)" }}>{c.name}</span>
                      <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: c.hex, background: `color-mix(in srgb, ${c.hex} 12%, transparent)`, padding: "1px 6px", borderRadius: 4 }}>{c.hex}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{c.usage}</p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
              <i className="bi bi-hand-index me-1" />Click vào ô màu để copy mã HEX
            </p>
          </div>

          {/* ── 3. TYPOGRAPHY ── */}
          <div className="app-card" style={{ padding: "24px 28px", borderRadius: 18 }}>
            <SectionTitle icon="bi-type" label="Hệ thống Typography" color="#8b5cf6" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {TYPOGRAPHY.map(t => (
                <div key={t.name} style={{ borderRadius: 12, border: "1.5px solid var(--border)", padding: "20px 22px", background: "var(--background)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>{t.name}</p>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: "#8b5cf6", background: "rgba(139,92,246,0.1)", padding: "1px 8px", borderRadius: 99 }}>{t.role}</span>
                    </div>
                  </div>
                  {/* Sample text */}
                  <p style={{ ...t.style, margin: "0 0 14px", fontSize: 22, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.2 }}>
                    {t.sample}
                  </p>
                  {/* Weights */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {t.weights.map(w => {
                      const wNum = parseInt(w);
                      return (
                        <div key={w} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)", width: 90, flexShrink: 0 }}>{w}</span>
                          <span style={{ ...t.style, fontSize: 14, fontWeight: wNum, color: "var(--foreground)" }}>Aa Bb Cc 123</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 4. LOGO USAGE GUIDELINES ── */}
          <div className="app-card" style={{ padding: "24px 28px", borderRadius: 18 }}>
            <SectionTitle icon="bi-shield-check" label="Quy tắc sử dụng Logo" color="#3b82f6" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>

              {/* ✅ 1: Nền trắng */}
              <div style={{ borderRadius: 12, border: "1.5px solid rgba(16,185,129,0.3)", overflow: "hidden" }}>
                <div style={{ height: 100, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
                  <img src={BRAND_LOGO} alt="logo on white" style={{ height: 60, objectFit: "contain" }} />
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(16,185,129,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-check-lg" style={{ fontSize: 9, color: "#fff" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>Nền trắng / kem</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>Logo Navy trên nền sáng — sử dụng phổ biến nhất</p>
                </div>
              </div>

              {/* ✅ 2: Nền Navy */}
              <div style={{ borderRadius: 12, border: "1.5px solid rgba(16,185,129,0.3)", overflow: "hidden" }}>
                <div style={{ height: 100, background: "#003087", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
                  <img src={BRAND_LOGO} alt="logo on navy" style={{ height: 60, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(16,185,129,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-check-lg" style={{ fontSize: 9, color: "#fff" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>Nền Navy thương hiệu</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>Logo trắng trên nền #003087 — header, backdrop</p>
                </div>
              </div>

              {/* ✅ 3: Khoảng trắng bảo vệ */}
              <div style={{ borderRadius: 12, border: "1.5px solid rgba(16,185,129,0.3)", overflow: "hidden" }}>
                <div style={{ height: 100, background: "#F8F5F0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
                  {/* Border minh hoạ khoảng trắng */}
                  <div style={{ border: "1.5px dashed #C9A84C", borderRadius: 4, padding: 10 }}>
                    <img src={BRAND_LOGO} alt="logo safe zone" style={{ height: 44, objectFit: "contain", display: "block" }} />
                  </div>
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(16,185,129,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-check-lg" style={{ fontSize: 9, color: "#fff" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>Khoảng trắng bảo vệ</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>Vùng sạch quanh logo (đường vàng) tối thiểu = 1/4 chiều cao logo</p>
                </div>
              </div>

              {/* ❌ 4: Biến dạng */}
              <div style={{ borderRadius: 12, border: "1.5px solid rgba(239,68,68,0.3)", overflow: "hidden" }}>
                <div style={{ height: 100, background: "#fff8f8", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(239,68,68,0.15)", position: "relative" }}>
                  <img src={BRAND_LOGO} alt="logo distorted" style={{ height: 44, width: 110, objectFit: "fill", transform: "scaleY(1.5)" }} />
                  <i className="bi bi-slash-circle" style={{ position: "absolute", fontSize: 36, color: "rgba(239,68,68,0.35)" }} />
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-x-lg" style={{ fontSize: 9, color: "#fff" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>Biến dạng tỷ lệ</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>Tuyệt đối không kéo giãn hoặc bóp méo logo</p>
                </div>
              </div>

              {/* ❌ 5: Nền loạn màu */}
              <div style={{ borderRadius: 12, border: "1.5px solid rgba(239,68,68,0.3)", overflow: "hidden" }}>
                <div style={{ height: 100, background: "linear-gradient(135deg, #f97316, #8b5cf6, #ec4899, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(239,68,68,0.15)", position: "relative" }}>
                  <img src={BRAND_LOGO} alt="logo on pattern" style={{ height: 50, objectFit: "contain" }} />
                  <i className="bi bi-slash-circle" style={{ position: "absolute", fontSize: 36, color: "rgba(239,68,68,0.5)" }} />
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-x-lg" style={{ fontSize: 9, color: "#fff" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>Nền loạn màu</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>Không đặt logo lên nền rối mắt, thiếu tương phản</p>
                </div>
              </div>

              {/* ❌ 6: Đổi màu sai */}
              <div style={{ borderRadius: 12, border: "1.5px solid rgba(239,68,68,0.3)", overflow: "hidden" }}>
                <div style={{ height: 100, background: "#fff8f8", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(239,68,68,0.15)", position: "relative" }}>
                  <img src={BRAND_LOGO} alt="logo wrong color" style={{ height: 50, objectFit: "contain", filter: "hue-rotate(280deg) saturate(2)" }} />
                  <i className="bi bi-slash-circle" style={{ position: "absolute", fontSize: 36, color: "rgba(239,68,68,0.35)" }} />
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="bi bi-x-lg" style={{ fontSize: 9, color: "#fff" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>Tự ý đổi màu logo</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>Chỉ dùng logo màu Navy hoặc trắng — không dùng màu khác</p>
                </div>
              </div>

            </div>
          </div>

          {/* ── 5. BRAND VOICE & TONE ── */}
          <div className="app-card" style={{ padding: "24px 28px", borderRadius: 18 }}>
            <SectionTitle icon="bi-chat-quote" label="Brand Voice & Tone" color="#f59e0b" />

            {/* Personality traits */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {VOICE_TRAITS.map(v => (
                <div key={v.trait} style={{ borderRadius: 12, border: "1.5px solid var(--border)", padding: "16px 14px", textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `color-mix(in srgb, ${v.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <i className={`bi ${v.icon}`} style={{ fontSize: 18, color: v.color }} />
                  </div>
                  <p style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>{v.trait}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{v.desc}</p>
                </div>
              ))}
            </div>

            {/* Do / Don't words */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <p style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#10b981" }}>
                  <i className="bi bi-check-circle me-2" />Từ ngữ nên dùng
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {DO_WORDS.map(w => (
                    <span key={w} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 99, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
                      {w}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#ef4444" }}>
                  <i className="bi bi-x-circle me-2" />Từ ngữ không nên dùng
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {DONT_WORDS.map(w => (
                    <span key={w} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 99, background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sample messages */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)" }}>
                <i className="bi bi-chat-left-text me-2" />Mẫu câu chuẩn
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SAMPLE_MESSAGES.map(m => (
                  <div key={m.label} style={{ borderRadius: 10, border: "1.5px solid var(--border)", padding: "12px 16px", background: "var(--background)" }}>
                    <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--foreground)", lineHeight: 1.6 }}>"{m.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
