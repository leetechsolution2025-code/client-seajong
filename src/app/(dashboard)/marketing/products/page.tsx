"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: number; slug: string; url: string; name: string;
  excerpt: string; description: string;
  images: string[]; specs: Record<string, string>;
  categories: number[]; updatedAt: string;
}
interface Category { id: number; name: string; slug: string; count: number; parent: number; }
interface Pagination { page: number; perPage: number; total: number; totalPages: number; }
interface SyncLog {
  id: string; status: string; message: string;
  totalSynced: number; startedAt: string; finishedAt?: string;
}

// ── ProductCard ────────────────────────────────────────────────────────────────
function ProductCard({ p, cats, onClick }: { p: Product; cats: Category[]; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const catNames = p.categories
    .map(id => cats.find(c => c.id === id)?.name)
    .filter(Boolean).slice(0, 2) as string[];

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 14, border: "1.5px solid var(--border)",
        background: "var(--card)", overflow: "hidden",
        cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "none";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ height: 180, background: "#f5f5f5", overflow: "hidden", position: "relative", flexShrink: 0 }}>
        {p.images[0] && !imgError ? (
          <img src={p.images[0]} alt={p.name} onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-image" style={{ fontSize: 32, color: "#ccc" }} />
          </div>
        )}
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {catNames.map(n => (
            <span key={n} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(0,48,135,0.85)", color: "#fff", backdropFilter: "blur(4px)" }}>{n}</span>
          ))}
        </div>
        {p.images.length > 1 && (
          <span style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.45)", borderRadius: 99, padding: "2px 7px" }}>
            <i className="bi bi-images me-1" />{p.images.length} ảnh
          </span>
        )}
      </div>
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {p.name}
        </p>
        {p.excerpt && (
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {p.excerpt}
          </p>
        )}
        {Object.keys(p.specs).length > 0 && (
          <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(p.specs).slice(0, 2).map(([k, v]) => (
              <span key={k} style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>
                <b style={{ color: "var(--foreground)" }}>{k}:</b> {v}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
            <i className="bi bi-clock me-1" />{new Date(p.updatedAt).toLocaleDateString("vi-VN")}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#003087" }}>
            Xem chi tiết <i className="bi bi-arrow-right" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── ProductDrawer ──────────────────────────────────────────────────────────────
function ProductDrawer({ p, cats, onClose }: { p: Product; cats: Category[]; onClose: () => void }) {
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState<"desc" | "specs">("desc");
  const [isPaused, setIsPaused]   = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adFormat, setAdFormat]   = useState("Facebook Post");
  const [adStyle, setAdStyle]     = useState("Chuyên nghiệp");
  const [adPersona, setAdPersona] = useState("Gia đình");
  const [adWordLimit, setAdWordLimit] = useState("300");
  const [adContent, setAdContent] = useState("");
  const [adLoading, setAdLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUrl, setVideoUrl]     = useState<string | null>(null);
  const catNames = p.categories.map(id => cats.find(c => c.id === id)?.name).filter(Boolean) as string[];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setActiveImg(i => Math.min(i + 1, p.images.length - 1));
      if (e.key === "ArrowLeft")  setActiveImg(i => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, p.images.length]);

  // Auto-slide every 4s, pause on hover
  useEffect(() => {
    if (p.images.length <= 1 || isPaused) return;
    const t = setInterval(() => {
      setActiveImg(i => (i + 1) % p.images.length);
    }, 4000);
    return () => clearInterval(t);
  }, [p.images.length, isPaused]);


  // ── Tạo video slideshow từ ảnh sản phẩm ─────────────────────────────────────
  // ── Tạo video slideshow chuyên nghiệp (AIDA / Hook-Structure) ───────────────
  async function generateVideo() {
    if (!p.images.length) return;
    setVideoLoading(true);
    setVideoProgress(0);
    if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(null); }

    const W = 1080, H = 1080, FPS = 30;

    /* ── load images via proxy ─────────────────────────────────── */
    const loadImg = (url: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload  = () => res(img);
        img.onerror = rej;
        img.src = `/api/seajong/image-proxy?url=${encodeURIComponent(url)}`;
      });

    const imgs: HTMLImageElement[] = [];
    for (let i = 0; i < p.images.length; i++) {
      try { imgs.push(await loadImg(p.images[i])); } catch { /* skip */ }
      setVideoProgress(Math.round((i + 1) / p.images.length * 20));
    }
    if (!imgs.length) { setVideoLoading(false); return; }

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    /* ── helpers ────────────────────────────────────────────────── */
    const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeIn  = (t: number) => t * t * t;

    // Draw image cover-fit with optional scale (Ken Burns) + opacity
    function drawCover(img: HTMLImageElement, scale = 1, alpha = 1, panX = 0, panY = 0) {
      const s  = Math.max(W / img.naturalWidth, H / img.naturalHeight) * scale;
      const sw = img.naturalWidth * s, sh = img.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (W - sw) / 2 + panX, (H - sh) / 2 + panY, sw, sh);
      ctx.globalAlpha = 1;
    }

    // Fill canvas with dark-to-color radial gradient (for non-image slides)
    function drawGradientBg(c1: string, c2: string) {
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // Bottom dark gradient vignette
    function drawVignette(strength = 0.85) {
      const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${strength})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // top vignette
      const gt = ctx.createLinearGradient(0, 0, 0, H * 0.25);
      gt.addColorStop(0, "rgba(0,0,0,0.5)");
      gt.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gt; ctx.fillRect(0, 0, W, H);
    }

    // Word-wrap text, return lines array
    function wrapText(text: string, maxW: number): string[] {
      const words = text.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        const t = line ? `${line} ${w}` : w;
        if (ctx.measureText(t).width > maxW) { if (line) lines.push(line); line = w; }
        else line = t;
      }
      if (line) lines.push(line);
      return lines;
    }

    function drawCenteredText(text: string, y: number, font: string, color: string, maxW: number, lineH: number, alpha = 1) {
      ctx.save();
      ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "center"; ctx.globalAlpha = alpha;
      const lines = wrapText(text, maxW);
      lines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * lineH));
      ctx.restore();
    }

    function drawBrand(alpha = 1) {
      ctx.save(); ctx.globalAlpha = alpha;
      // Seajong badge top-left
      const bx = 48, by = 52, bw = 300, bh = 52;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.roundRect(bx - 12, by - 32, bw, bh, 10);
      ctx.fill();
      ctx.font = `bold ${Math.round(W * 0.024)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "#fff"; ctx.textAlign = "left";
      ctx.fillText("SEAJONG  •  Bath & Kitchen Korea", bx, by);
      ctx.restore();
    }

    function drawFooter(alpha = 1) {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.font = `${Math.round(W * 0.019)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.textAlign = "center";
      ctx.fillText("seajong.com  |  Hotline: 1900.633.862", W / 2, H - 22);
      ctx.restore();
    }

    /* ── hook text from category ───────────────────────────────── */
    const cat = catNames[0]?.toLowerCase() || "";
    const hookQ =
      cat.includes("bồn cầu") ? "Chiếc bồn cầu cũ đang\nPHÁ HOẠI không gian sống của bạn?" :
      cat.includes("vệ sinh")  ? "Phòng tắm đẳng cấp —\nTại sao không phải là của bạn?" :
      cat.includes("bếp")      ? "Căn bếp \'xịn\' có thực sự\ncần chi phí cao?" :
      cat.includes("lavabo")   ? "Lavabo cũ kỹ...\nBao giờ bạn mới nâng cấp?" :
      "Không gian của bạn\nĐÃ ĐẾN LÚC thay đổi!";

    /* ── specs → benefit messages ──────────────────────────────── */
    const specEntries = Object.entries(p.specs).slice(0, 6);
    const benefits = specEntries.length > 0
      ? specEntries.map(([k, v]) => {
          const kl = k.toLowerCase(), vl = v.toLowerCase();
          if (kl.includes("chất liệu") || kl.includes("vật liệu")) return `✦  ${v} — Bền đẹp vượt thời gian`;
          if (kl.includes("màu") || kl.includes("mau"))             return `✦  Màu ${v} — Sang trọng, hài hòa mọi không gian`;
          if (kl.includes("kích thước") || kl.includes("kich"))     return `✦  Kích thước ${v} — Phù hợp linh hoạt`;
          if (vl.includes("tornado") || vl.includes("xả"))          return `✦  Công nghệ ${v} — Sạch hoàn toàn, tiết kiệm nước`;
          if (kl.includes("bảo hành") || kl.includes("bao hanh"))   return `✦  Bảo hành ${v} — An tâm tuyệt đối`;
          if (kl.includes("xuất xứ") || kl.includes("xuat xu"))     return `✦  Xuất xứ ${v} — Tiêu chuẩn quốc tế`;
          return `✦  ${k}: ${v}`;
        })
      : ["✦  Chất liệu cao cấp — Bền đẹp theo thời gian",
         "✦  Thiết kế hiện đại — Sang trọng đẳng cấp",
         "✦  Bảo hành chính hãng — An tâm lâu dài"];

    /* ── scene definitions ─────────────────────────────────────── */
    // [type, frames]: hook=3s, pain=3.5s, product(n)=2.5s, proof=3s, cta=3.5s
    type SceneType = "hook" | "pain" | "product" | "proof" | "cta";
    interface Scene { type: SceneType; frames: number; imgIdx?: number; benefit?: string; }
    const SCENES: Scene[] = [
      { type: "hook",    frames: 90  },
      { type: "pain",    frames: 105 },
      ...imgs.map((_, i) => ({
        type: "product" as SceneType,
        frames: 80,
        imgIdx: i,
        benefit: benefits[i % benefits.length],
      })),
      { type: "proof",   frames: 90  },
      { type: "cta",     frames: 105 },
    ];
    const TOTAL = SCENES.reduce((s, sc) => s + sc.frames, 0);

    /* ── MediaRecorder setup ───────────────────────────────────── */
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9" : "video/webm";
    const stream   = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
      setVideoLoading(false); setVideoProgress(100);
    };
    recorder.start(100);

    /* ── per-scene renderers ────────────────────────────────────── */
    function renderHook(f: number, total: number) {
      const t = f / total;
      drawGradientBg("#1a0030", "#050015");

      // Moving particles simulation — simple dots
      for (let d = 0; d < 24; d++) {
        const px = (Math.sin(d * 2.7 + t * 1.8) * 0.5 + 0.5) * W;
        const py = (Math.cos(d * 1.9 + t * 1.4) * 0.5 + 0.5) * H;
        ctx.beginPath();
        ctx.arc(px, py, 2 + d % 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,120,255,${0.15 + 0.1 * Math.sin(d + t * 3)})`;
        ctx.fill();
      }

      // Hook text — animate up from below
      const hookLines = hookQ.split("\n");
      const entryT = clamp(t * 4);           // 0→1 in first 25% of scene
      const fadeOut = clamp((t - 0.85) * 7); // fade at end
      const alpha   = easeOut(entryT) * (1 - fadeOut);
      const offsetY = (1 - easeOut(entryT)) * 80;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      // Line 1
      ctx.font = `900 ${Math.round(W * 0.062)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(hookLines[0] || "", W / 2, H * 0.38 + offsetY);
      // Line 2 (highlighted)
      ctx.font = `900 ${Math.round(W * 0.07)}px "Helvetica Neue",Arial,sans-serif`;
      const grd = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, 0);
      grd.addColorStop(0, "#c084fc"); grd.addColorStop(1, "#818cf8");
      ctx.fillStyle = grd;
      ctx.fillText(hookLines[1] || "", W / 2, H * 0.38 + offsetY + Math.round(W * 0.085));
      ctx.restore();

      // "▼ Khám phá ngay" pulsing
      const pulse = 0.6 + 0.4 * Math.sin(t * Math.PI * 8);
      drawCenteredText("▼  Khám phá ngay", H * 0.72,
        `bold ${Math.round(W * 0.024)}px "Helvetica Neue",Arial,sans-serif`,
        `rgba(180,180,255,${pulse * alpha})`, W * 0.7, 40, 1);

      drawBrand(easeOut(entryT)); drawFooter(easeOut(entryT));
    }

    function renderPain(f: number, total: number) {
      const t = f / total;
      const entryT = clamp(t * 3);
      const alpha  = easeOut(entryT);

      // Dimmed first image
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      if (imgs[0]) drawCover(imgs[0], 1.02, 0.25);
      // Red-tinted overlay
      const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W);
      rg.addColorStop(0, "rgba(120,0,0,0.0)"); rg.addColorStop(1, "rgba(80,0,0,0.65)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      drawVignette(0.9);

      const cats0 = catNames[0] || "thiết bị";
      ctx.save(); ctx.globalAlpha = alpha;
      // Problem label
      ctx.font = `bold ${Math.round(W * 0.022)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "#ff8080"; ctx.textAlign = "center";
      ctx.fillText("VẤN ĐỀ BẠN ĐANG GẶP PHẢI", W / 2, H * 0.3);
      // Pain line
      ctx.font = `900 ${Math.round(W * 0.055)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "#fff";
      const painLines = wrapText(`${cats0} cũ kỹ, lạc hậu...`, W * 0.82);
      painLines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.42 + i * Math.round(W * 0.068)));
      // Sub pain
      ctx.font = `${Math.round(W * 0.032)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "rgba(255,200,200,0.9)";
      const subLines = wrapText("Mỗi ngày bạn nhìn vào đó và cảm thấy... chưa ổn?", W * 0.78);
      subLines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.62 + i * Math.round(W * 0.042)));
      ctx.restore();

      drawBrand(alpha); drawFooter(alpha);
    }

    function renderProduct(f: number, total: number, img: HTMLImageElement, benefit: string) {
      const t = f / total;
      const entryT  = clamp(t * 4);
      const alpha   = easeOut(entryT);
      const fadeOut = clamp((t - 0.8) * 5);
      const kbScale = 1 + t * 0.07; // Ken Burns 1.0→1.07
      const kbPanX  = t * 18;

      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      drawCover(img, kbScale, 1 - fadeOut * 0.5, kbPanX);
      drawVignette(0.78);

      // Benefit text
      ctx.save();
      ctx.globalAlpha = alpha * (1 - fadeOut);
      ctx.font = `bold ${Math.round(W * 0.036)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      const bLines = wrapText(benefit, W * 0.82);
      const bStartY = H - Math.round(W * 0.25) - (bLines.length - 1) * Math.round(W * 0.048);
      bLines.forEach((l, i) => {
        ctx.fillText(l, W / 2, bStartY + i * Math.round(W * 0.05));
      });
      ctx.restore();

      drawBrand(alpha * (1 - fadeOut)); drawFooter(alpha * (1 - fadeOut));
    }

    function renderProof(f: number, total: number) {
      const t = f / total;
      const alpha = easeOut(clamp(t * 3));

      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      const lastImg = imgs[imgs.length - 1];
      if (lastImg) drawCover(lastImg, 1.04, 0.3);
      drawGradientBg("rgba(10,0,30,0.85)", "rgba(5,0,15,0.92)");
      // override: draw solid dark
      ctx.fillStyle = "rgba(8,0,20,0.7)"; ctx.fillRect(0, 0, W, H);

      ctx.save(); ctx.globalAlpha = alpha;
      // Stars
      ctx.font = `${Math.round(W * 0.065)}px serif`;
      ctx.textAlign = "center";
      ctx.fillText("★★★★★", W / 2, H * 0.32);
      // Proof headline
      ctx.font = `900 ${Math.round(W * 0.052)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.fillText("10,000+", W / 2, H * 0.46);
      ctx.font = `bold ${Math.round(W * 0.036)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "rgba(200,180,255,0.95)";
      ctx.fillText("gia đình Việt Nam tin dùng Seajong", W / 2, H * 0.54);
      // Badges
      const badges = ["🏅 Chính hãng Hàn Quốc", "🚚 Giao toàn quốc", "🔄 Đổi trả 30 ngày"];
      ctx.font = `${Math.round(W * 0.026)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      badges.forEach((b, i) => ctx.fillText(b, W / 2, H * 0.66 + i * Math.round(W * 0.038)));
      ctx.restore();

      drawBrand(alpha); drawFooter(alpha);
    }

    function renderCTA(f: number, total: number) {
      const t = f / total;
      const alpha = easeOut(clamp(t * 2.5));

      // Brand gradient background
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#1e0052"); bg.addColorStop(0.5, "#0d0030"); bg.addColorStop(1, "#001040");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Subtle honeycomb pattern
      for (let gy = 0; gy < H; gy += 70) {
        for (let gx = 0; gx < W; gx += 80) {
          ctx.beginPath();
          ctx.arc(gx + (gy % 140 === 0 ? 0 : 40), gy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(150,100,255,0.12)"; ctx.fill();
        }
      }

      ctx.save(); ctx.globalAlpha = alpha;
      // Product name
      ctx.font = `bold ${Math.round(W * 0.04)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "rgba(200,180,255,0.9)"; ctx.textAlign = "center";
      const pLines = wrapText(p.name, W * 0.82);
      pLines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.26 + i * Math.round(W * 0.052)));

      // CTA headline
      ctx.font = `900 ${Math.round(W * 0.065)}px "Helvetica Neue",Arial,sans-serif`;
      const cg = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, 0);
      cg.addColorStop(0, "#c084fc"); cg.addColorStop(1, "#60a5fa");
      ctx.fillStyle = cg;
      ctx.fillText("LIÊN HỆ NGAY!", W / 2, H * 0.5);

      // Urgency
      ctx.font = `bold ${Math.round(W * 0.029)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "#fcd34d";
      const pulse = 0.85 + 0.15 * Math.sin(t * Math.PI * 6);
      ctx.globalAlpha = alpha * pulse;
      ctx.fillText("⚡ Ưu đãi chỉ trong tuần này — Số lượng có hạn!", W / 2, H * 0.6);
      ctx.globalAlpha = alpha;

      // Hotline pill
      const hx = W / 2, hy = H * 0.73;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath(); ctx.roundRect(hx - 210, hy - 36, 420, 56, 28); ctx.fill();
      ctx.font = `bold ${Math.round(W * 0.038)}px "Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.fillText("📞  1900.633.862", hx, hy + 4);

      ctx.restore();
      drawBrand(alpha); drawFooter(alpha);
    }

    /* ── main animation loop ────────────────────────────────────── */
    let frameGlobal = 0;
    let sceneIdx = 0, sceneFrame = 0;

    const tick = () => {
      if (sceneIdx >= SCENES.length) { recorder.stop(); return; }

      const sc = SCENES[sceneIdx];
      const f  = sceneFrame, tot = sc.frames;

      ctx.clearRect(0, 0, W, H);

      switch (sc.type) {
        case "hook":    renderHook(f, tot); break;
        case "pain":    renderPain(f, tot); break;
        case "product": renderProduct(f, tot, imgs[sc.imgIdx ?? 0]!, sc.benefit ?? ""); break;
        case "proof":   renderProof(f, tot); break;
        case "cta":     renderCTA(f, tot); break;
      }

      sceneFrame++;
      if (sceneFrame >= sc.frames) { sceneIdx++; sceneFrame = 0; }

      frameGlobal++;
      setVideoProgress(20 + Math.round(frameGlobal / TOTAL * 80));
      setTimeout(tick, 1000 / FPS);
    };
    tick();
  }


  // ── Làm sạch và parse mô tả sản phẩm ──────────────────────────────────────
  function parseDescription(raw: string | undefined): string[] {
    if (!raw) return [];

    let text = raw;

    // 1. Cắt bỏ phần Mục lục (Toggle)
    text = text.replace(/Mục Lục Toggle[\s\S]*?(?=Tính năng|Đặc điểm|Mô tả|Giới thiệu|$)/i, "");

    // 2. Cắt bỏ từ "Một số câu hỏi" trở đi (FAQ + contact)
    const cutMarkers = [
      "Một số câu hỏi",
      "Liên hệ mua hàng",
      "Hotline:",
      "Showroom:",
      "Fanpage:",
      "DSSP:",
      "Xem thêm các mẫu",
      "Website: https",
      "Công ty cổ phần",
    ];
    for (const marker of cutMarkers) {
      const idx = text.indexOf(marker);
      if (idx !== -1) text = text.slice(0, idx);
    }

    // 3. Cắt bỏ các header section thừa (heading không có nội dung sau)
    text = text.replace(/^(Tính năng công nghệ|Đặc điểm nổi bật|Mô tả sản phẩm)\s*/im, "");

    // 4. Tách thành các câu có nghĩa
    // Mỗi câu kết thúc bằng dấu "." và có tối thiểu 30 ký tự
    const sentences = text
      .split(/(?<=[.。])\s+/)   // split sau dấu chấm
      .map(s => s.trim())
      .filter(s => s.length > 30); // bỏ câu quá ngắn (header rác)

    return sentences.slice(0, 10); // Tối đa 10 bullet
  }

  const descBullets = parseDescription(p.description);
  const hasDescription = descBullets.length > 0;
  const hasSpecs = Object.keys(p.specs).length > 0;

  return (
    <>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: none; } }
        .drawer-thumb { transition: transform 0.15s, box-shadow 0.15s; }
        .drawer-thumb:hover { transform: scale(1.06); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .drawer-body::-webkit-scrollbar { width: 0; }
        .drawer-body { scrollbar-width: none; }
        .drawer-thumb-strip::-webkit-scrollbar { height: 0; }
        .drawer-thumb-strip { scrollbar-width: none; }
        @keyframes fadeSlide { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040, backdropFilter: "blur(3px)" }}
      />

      {/* ── AD MODAL FULLSCREEN ── */}
      {showAdModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1060,
          background: "var(--background)",
          display: "flex", flexDirection: "column",
          animation: "slideInRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 24px", borderBottom: "1px solid var(--border)",
            background: "var(--card)", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, rgba(79,70,229,0.15), rgba(124,58,237,0.15))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="bi bi-stars" style={{ fontSize: 17, color: "#4f46e5" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>Viết bài quảng cáo bằng AI</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>{p.name}</p>
              </div>
            </div>
            <button onClick={() => setShowAdModal(false)} style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)" }}>
              <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "360px 1fr", overflow: "hidden" }}>

            {/* ── LEFT PANEL ── */}
            <div style={{ borderRight: "1px solid var(--border)", padding: "18px", overflowY: "auto", background: "var(--card)", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Product thumbnail */}
              {p.images[0] && (
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", height: 160, background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <img src={p.images[activeImg]} alt={p.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 10 }} />
                </div>
              )}

              {/* Product name */}
              <div style={{ padding: "10px 12px", borderRadius: 9, background: "var(--background)", border: "1px solid var(--border)" }}>
                <p style={{ margin: "0 0 4px", fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.4 }}>{p.name}</p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {catNames.map(n => <span key={n} style={{ fontSize: 10, padding: "1px 8px", borderRadius: 99, background: "rgba(79,70,229,0.1)", color: "var(--primary)", fontWeight: 600 }}>{n}</span>)}
                </div>
              </div>

              {/* 1. Kênh đăng */}
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>1. Kênh đăng</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {[
                    { key: "Facebook Post",  icon: "bi-facebook",     label: "Facebook Post" },
                    { key: "Zalo Story",     icon: "bi-chat-dots-fill",label: "Zalo Story" },
                    { key: "Email",          icon: "bi-envelope-fill", label: "Email" },
                    { key: "Script Video",   icon: "bi-camera-video-fill", label: "Script Video" },
                    { key: "Tin nhắn Zalo",  icon: "bi-chat-fill",    label: "Tin Zalo" },
                    { key: "Landing Page",   icon: "bi-window",        label: "Landing Page" },
                  ].map(f => (
                    <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${adFormat === f.key ? "var(--primary)" : "var(--border)"}`, background: adFormat === f.key ? "rgba(79,70,229,0.08)" : "var(--background)", transition: "all 0.15s" }}>
                      <input type="radio" name="ad-format" value={f.key} checked={adFormat === f.key} onChange={() => { setAdFormat(f.key); setAdContent(""); }} style={{ accentColor: "var(--primary)", flexShrink: 0, width: 13, height: 13 }} />
                      <i className={`bi ${f.icon}`} style={{ fontSize: 12, color: adFormat === f.key ? "var(--primary)" : "var(--muted-foreground)" }} />
                      <span style={{ fontSize: 12, fontWeight: adFormat === f.key ? 700 : 400, color: "var(--foreground)" }}>{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Phong cách viết */}
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>2. Phong cách viết</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { key: "Chuyên nghiệp", icon: "🏢" },
                    { key: "Thân thiện",    icon: "😊" },
                    { key: "Kể chuyện",    icon: "📖" },
                    { key: "Gấp gáp/FOMO", icon: "⚡" },
                    { key: "Hài hước",      icon: "😄" },
                    { key: "Sang trọng",    icon: "✨" },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setAdStyle(s.key)}
                      style={{
                        padding: "5px 11px", borderRadius: 99, fontSize: 12, cursor: "pointer",
                        border: `1.5px solid ${adStyle === s.key ? "var(--primary)" : "var(--border)"}`,
                        background: adStyle === s.key ? "rgba(79,70,229,0.1)" : "var(--background)",
                        color: adStyle === s.key ? "var(--primary)" : "var(--foreground)",
                        fontWeight: adStyle === s.key ? 700 : 400,
                        transition: "all 0.15s",
                      }}
                    >{s.icon} {s.key}</button>
                  ))}
                </div>
              </div>

              {/* 3. Chân dung khách hàng */}
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>3. Chân dung khách hàng</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { key: "Gia đình",        icon: "🏠" },
                    { key: "Cặp vợ chồng",   icon: "👫" },
                    { key: "Cao cấp",         icon: "💎" },
                    { key: "Chuội khách sạn", icon: "🏨" },
                    { key: "Chủ đầu tư",     icon: "💼" },
                    { key: "Showroom",        icon: "🏪" },
                  ].map(a => (
                    <button
                      key={a.key}
                      onClick={() => setAdPersona(a.key)}
                      style={{
                        padding: "5px 11px", borderRadius: 99, fontSize: 12, cursor: "pointer",
                        border: `1.5px solid ${adPersona === a.key ? "#10b981" : "var(--border)"}`,
                        background: adPersona === a.key ? "rgba(16,185,129,0.1)" : "var(--background)",
                        color: adPersona === a.key ? "#059669" : "var(--foreground)",
                        fontWeight: adPersona === a.key ? 700 : 400,
                        transition: "all 0.15s",
                      }}
                    >{a.icon} {a.key}</button>
                  ))}
                </div>
              </div>

              {/* 4. Giới hạn số từ */}
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>4. Giới hạn số từ</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["150", "300", "500", "800"].map(w => (
                    <button key={w} onClick={() => setAdWordLimit(w)} style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, cursor: "pointer", border: `1.5px solid ${adWordLimit === w ? "var(--primary)" : "var(--border)"}`, background: adWordLimit === w ? "rgba(79,70,229,0.1)" : "var(--background)", color: adWordLimit === w ? "var(--primary)" : "var(--foreground)", fontWeight: adWordLimit === w ? 700 : 400, transition: "all 0.15s" }}>{w} từ</button>
                  ))}
                  <input
                    type="number" min={50} max={2000}
                    value={adWordLimit}
                    onChange={e => setAdWordLimit(e.target.value)}
                    style={{
                      width: 72, padding: "4px 8px", borderRadius: 8,
                      border: "1.5px solid var(--border)",
                      background: "var(--background)", color: "var(--foreground)",
                      fontSize: 12, outline: "none",
                    }}
                    placeholder="Tùy chỉnh"
                  />
                </div>
              </div>

              {/* Specs preview */}
              {Object.keys(p.specs).length > 0 && (
                <div style={{ padding: "10px 12px", borderRadius: 9, background: "var(--background)", border: "1px solid var(--border)" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Thông số kỹ thuật</p>
                  {Object.entries(p.specs).slice(0, 5).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 6, fontSize: 11.5, marginBottom: 3 }}>
                      <span style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>{k}:</span>
                      <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT PANEL ── */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

              {/* Prompt summary + Generate */}
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(79,70,229,0.05)", border: "1px solid rgba(79,70,229,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.6 }}>
                  <i className="bi bi-stars" style={{ color: "#4f46e5", marginRight: 6 }} />
                  <b>{adFormat}</b> • Phong cách <b>{adStyle}</b> • KH: <b>{adPersona}</b> • ~<b>{adWordLimit}</b> từ
                </p>
                <button
                  onClick={async () => {
                    setAdLoading(true);
                    setAdContent("");
                    try {
                      const res = await fetch("/api/seajong/ad-generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          product:     p.name,
                          format:      adFormat,
                          style:       adStyle,
                          persona:     adPersona,
                          wordLimit:   adWordLimit,
                          specs:       p.specs,
                          categories:  catNames,
                          description: p.description,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setAdContent(data.content);
                      } else {
                        setAdContent(`❌ Lỗi: ${data.error || "Không thể tạo bài viết"}`);
                      }
                    } catch (e) {
                      setAdContent(`❌ Lỗi kết nối: ${e instanceof Error ? e.message : String(e)}`);
                    } finally {
                      setAdLoading(false);
                    }
                  }}
                  disabled={adLoading}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
                    padding: "9px 20px", borderRadius: 9, border: "none",
                    background: adLoading ? "var(--border)" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: adLoading ? "var(--muted-foreground)" : "#fff",
                    fontSize: 13, fontWeight: 700, cursor: adLoading ? "default" : "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: adLoading ? "none" : "0 4px 14px rgba(79,70,229,0.3)",
                  }}
                >
                  <i className={`bi ${adLoading ? "bi-arrow-repeat spin" : "bi-stars"}`} />
                  {adLoading ? "Đang tạo..." : "Tạo bài viết"}
                </button>
              </div>

              {/* Output */}
              <div style={{ flex: 1, position: "relative", minHeight: 400 }}>
                <textarea
                  value={adContent}
                  onChange={e => setAdContent(e.target.value)}
                  placeholder={`Bài ${adFormat} sẽ hiện ở đây...\n\nHãy chọn kênh đăng, phong cách viết và chân dung khách hàng, rồi nhấn "Tạo bài viết".`}
                  style={{
                    width: "100%", height: "100%", minHeight: 400,
                    padding: "16px", borderRadius: 12,
                    border: "1.5px solid var(--border)",
                    background: "var(--card)", color: "var(--foreground)",
                    fontSize: 14, lineHeight: 1.8,
                    resize: "none", outline: "none", fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                {adContent && (
                  <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{adContent.trim().split(/\s+/).length} từ</span>
                    <button onClick={() => navigator.clipboard.writeText(adContent)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 8, background: "var(--background)", border: "1px solid var(--border)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
                      <i className="bi bi-clipboard" style={{ fontSize: 12 }} /> Sao chép
                    </button>
                    <button onClick={() => setAdContent("")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: "var(--background)", border: "1px solid var(--border)", fontSize: 12, cursor: "pointer", color: "var(--muted-foreground)" }}>
                      <i className="bi bi-trash" style={{ fontSize: 12 }} />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Video Section ── */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                      <i className="bi bi-play-circle" style={{ color: "#4f46e5", marginRight: 6 }} />
                      Video Slideshow
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                      {p.images.length} ảnh • ~{Math.round(p.images.length * 3.5)}s • 1080×1080 WebM
                    </p>
                  </div>
                  <button
                    onClick={generateVideo}
                    disabled={videoLoading || p.images.length === 0}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "8px 18px", borderRadius: 9, border: "none",
                      background: videoLoading ? "var(--border)" : "linear-gradient(135deg, #7c3aed, #2563eb)",
                      color: videoLoading ? "var(--muted-foreground)" : "#fff",
                      fontSize: 13, fontWeight: 700,
                      cursor: videoLoading ? "default" : "pointer",
                      boxShadow: videoLoading ? "none" : "0 4px 14px rgba(124,58,237,0.3)",
                    }}
                  >
                    <i className={`bi ${videoLoading ? "bi-arrow-repeat spin" : "bi-camera-video-fill"}`} style={{ fontSize: 13 }} />
                    {videoLoading ? `Đang tạo... ${videoProgress}%` : "Tạo video"}
                  </button>
                </div>

                {/* Progress bar */}
                {videoLoading && (
                  <div style={{ height: 4, borderRadius: 99, background: "var(--border)", overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ height: "100%", width: `${videoProgress}%`, borderRadius: 99, background: "linear-gradient(90deg, #7c3aed, #2563eb)", transition: "width 0.3s ease" }} />
                  </div>
                )}

                {/* Inline video player — auto-embeds below ad content */}
                {videoUrl && (
                  <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
                    {/* Caption bar */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(15,5,35,0.95)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <i className="bi bi-check-circle-fill" style={{ color: "#a78bfa", fontSize: 14 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>Video quảng cáo — sẵn sàng đăng!</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <a
                          href={videoUrl}
                          download={`${p.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}_seajong.webm`}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "5px 12px", borderRadius: 7,
                            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                            color: "#fff", textDecoration: "none",
                            fontSize: 11.5, fontWeight: 700,
                          }}
                        >
                          <i className="bi bi-download" style={{ fontSize: 11 }} /> Tải xuống
                        </a>
                        <button
                          onClick={() => { URL.revokeObjectURL(videoUrl); setVideoUrl(null); }}
                          style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer" }}
                        >✕</button>
                      </div>
                    </div>
                    {/* Video player */}
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      style={{ width: "100%", display: "block", maxHeight: 380, objectFit: "contain", background: "#000" }}
                    />
                    {/* Info bar */}
                    <div style={{ padding: "7px 12px", background: "rgba(15,5,35,0.9)", display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "rgba(200,180,255,0.7)" }}>📐 1080×1080</span>
                      <span style={{ fontSize: 11, color: "rgba(200,180,255,0.7)" }}>🎬 WebM / VP9</span>
                      <span style={{ fontSize: 11, color: "rgba(200,180,255,0.7)" }}>✅ Facebook · Zalo · YouTube · TikTok</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel — chiều rộng chuẩn 460px */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 460,
        background: "var(--card)", zIndex: 1041,
        display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.18)",
        animation: "slideInRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
      }}>

        {/* ── HEADER CỐ ĐỊNH ── */}
        <div style={{
          padding: "14px 16px", flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--card)",
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
            Thông tin sản phẩm
          </span>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1.5px solid var(--border)", background: "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--foreground)",
            }}
          >
            <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
          </button>
        </div>

        {/* ── BODY CUỘN ── */}
        <div className="drawer-body" style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>

          {/* Tên sản phẩm + danh mục + link website */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.45 }}>
              {p.name}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {catNames.map(n => (
                <span key={n} style={{
                  fontSize: 10.5, fontWeight: 600, padding: "2px 9px", borderRadius: 99,
                  background: "rgba(79,70,229,0.1)", color: "var(--primary)",
                }}>
                  {n}
                </span>
              ))}
              <a
                href={p.url} target="_blank" rel="noreferrer"
                style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 4,
                  fontSize: 12, fontWeight: 600, color: "var(--primary)", textDecoration: "none",
                }}
              >
                <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }} />
                Xem website
              </a>
            </div>
          </div>

          {/* Nút viết bài quảng cáo */}
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => setShowAdModal(true)}
              style={{
                padding: "5px 12px", borderRadius: 8,
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#fff", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 5,
                boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
                opacity: 1, transition: "opacity 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
            >
              <i className="bi bi-stars" style={{ fontSize: 12 }} />
              Viết bài quảng cáo
            </button>
          </div>

          {/* ── Gallery Slideshow ── */}
          {p.images.length > 0 && (
            <div
              style={{ marginBottom: 20 }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Main slide area */}
              <div style={{
                position: "relative",
                borderRadius: 12, overflow: "hidden",
                background: "var(--background)",
                border: "1px solid var(--border)",
                height: 280, marginBottom: 10,
              }}>
                {/* Slide image */}
                <img
                  key={activeImg}
                  src={p.images[activeImg]} alt={p.name}
                  style={{
                    width: "100%", height: "100%", objectFit: "contain", padding: 12,
                    animation: "fadeSlide 0.25s ease",
                  }}
                />

                {/* Counter badge */}
                {p.images.length > 1 && (
                  <div style={{
                    position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
                    display: "flex", gap: 5, alignItems: "center",
                  }}>
                    {p.images.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveImg(i)}
                        style={{
                          width: i === activeImg ? 18 : 6, height: 6,
                          borderRadius: 99, cursor: "pointer",
                          background: i === activeImg ? "var(--primary)" : "rgba(255,255,255,0.6)",
                          transition: "all 0.2s ease",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Prev arrow */}
                {activeImg > 0 && (
                  <button
                    onClick={() => setActiveImg(i => i - 1)}
                    style={{
                      position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                      width: 32, height: 32, borderRadius: "50%",
                      background: "rgba(255,255,255,0.9)", border: "1px solid var(--border)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-50%) scale(1.1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-50%)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
                  >
                    <i className="bi bi-chevron-left" style={{ fontSize: 13, color: "#333" }} />
                  </button>
                )}

                {/* Next arrow */}
                {activeImg < p.images.length - 1 && (
                  <button
                    onClick={() => setActiveImg(i => i + 1)}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      width: 32, height: 32, borderRadius: "50%",
                      background: "rgba(255,255,255,0.9)", border: "1px solid var(--border)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-50%) scale(1.1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-50%)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
                  >
                    <i className="bi bi-chevron-right" style={{ fontSize: 13, color: "#333" }} />
                  </button>
                )}

                {/* Image counter top-right */}
                <div style={{
                  position: "absolute", top: 8, right: 8,
                  fontSize: 11, fontWeight: 700,
                  background: "rgba(0,0,0,0.45)", color: "#fff",
                  borderRadius: 99, padding: "2px 9px",
                  backdropFilter: "blur(4px)",
                }}>
                  {activeImg + 1} / {p.images.length}
                </div>
              </div>

              {/* Thumbnail strip */}
              {p.images.length > 1 && (
                <div
                  className="drawer-thumb-strip"
                  style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, scrollBehavior: "smooth" }}
                >
                  {p.images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveImg(i)}
                      style={{
                        width: 62, height: 62, flexShrink: 0, borderRadius: 9,
                        overflow: "hidden", cursor: "pointer",
                        border: `2px solid ${i === activeImg ? "var(--primary)" : "var(--border)"}`,
                        background: "var(--background)",
                        opacity: i === activeImg ? 1 : 0.65,
                        transition: "all 0.2s ease",
                        boxShadow: i === activeImg ? "0 0 0 3px rgba(79,70,229,0.2)" : "none",
                      }}
                    >
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TABS ── */}
          <div style={{ flex: 1 }}>
            {/* Tab bar */}
            <div style={{
              display: "flex", borderBottom: "1px solid var(--border)",
              marginBottom: 16, gap: 0,
            }}>
              {([
                { key: "desc",  label: "Mô tả",             icon: "bi-file-text" },
                { key: "specs", label: "Thông số kỹ thuật", icon: "bi-list-columns-reverse" },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 12px",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 12.5, fontWeight: activeTab === tab.key ? 700 : 500,
                    color: activeTab === tab.key ? "var(--primary)" : "var(--muted-foreground)",
                    borderBottom: `2px solid ${activeTab === tab.key ? "var(--primary)" : "transparent"}`,
                    marginBottom: -1, transition: "all 0.15s", whiteSpace: "nowrap",
                  }}
                >
                  <i className={`bi ${tab.icon}`} style={{ fontSize: 12 }} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Mô tả */}
            {activeTab === "desc" && (
              <div>
                {hasDescription ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
                    {descBullets.map((sentence, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <i className="bi bi-check2-circle"
                          style={{ fontSize: 14, color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.7 }}>{sentence}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted-foreground)" }}>
                    <i className="bi bi-file-earmark-x" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.35 }} />
                    <p style={{ margin: 0, fontSize: 13 }}>Chưa có mô tả cho sản phẩm này</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Thông số kỹ thuật */}
            {activeTab === "specs" && (
              <div>
                {hasSpecs ? (
                  <div style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
                    {Object.entries(p.specs).map(([k, v], i) => (
                      <div
                        key={k}
                        style={{
                          display: "grid", gridTemplateColumns: "148px 1fr",
                          borderBottom: i < Object.keys(p.specs).length - 1 ? "1px solid var(--border)" : "none",
                          background: i % 2 === 0 ? "var(--background)" : "var(--card)",
                        }}
                      >
                        <div style={{
                          padding: "9px 12px", fontSize: 13, fontWeight: 600,
                          color: "var(--foreground)", borderRight: "1px solid var(--border)",
                        }}>
                          {k}
                        </div>
                        <div style={{ padding: "9px 12px", fontSize: 13, color: "var(--muted-foreground)" }}>
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted-foreground)" }}>
                    <i className="bi bi-table" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.35 }} />
                    <p style={{ margin: 0, fontSize: 13 }}>Chưa có thông số kỹ thuật</p>
                  </div>
                )}
              </div>
            )}


          </div>

          {/* ── Footer ── */}
          <div style={{
            borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 16,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
              <i className="bi bi-clock" style={{ fontSize: 11 }} />
              Cập nhật {new Date(p.updatedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </span>
            <a
              href={p.url} target="_blank" rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                color: "var(--primary)", fontWeight: 600, textDecoration: "none", fontSize: 11.5,
              }}
            >
              <i className="bi bi-link-45deg" style={{ fontSize: 13 }} />
              seajong.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

// ── SyncPanel ─────────────────────────────────────────────────────────────────
function SyncPanel({ onSyncDone }: { onSyncDone: () => void }) {
  const [log, setLog]            = useState<SyncLog | null>(null);
  const [productCount, setCount] = useState(0);
  const [syncing, setSyncing]    = useState(false);

  const fetchStatus = async () => {
    try {
      const r = await fetch("/api/seajong/sync");
      if (!r.ok) return;
      const text = await r.text();
      if (!text) return;
      const d = JSON.parse(text);
      setLog(d.log ?? null);
      setCount(d.productCount ?? 0);
      setSyncing(d.log?.status === "running");
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchStatus(); }, []);
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(() => {
      fetchStatus().then(() => { if (!syncing) onSyncDone(); });
    }, 3000);
    return () => clearInterval(t);
  }, [syncing, onSyncDone]);

  const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/seajong/sync", { method: "POST" });
    fetchStatus();
  };

  const isRunning = log?.status === "running";
  const isSuccess = log?.status === "success";
  const isError   = log?.status === "error";
  const lastSynced = log?.finishedAt ? new Date(log.finishedAt).toLocaleString("vi-VN") : null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      padding: "10px 16px", borderRadius: 12, marginBottom: 16,
      background: productCount === 0 ? "rgba(239,68,68,0.06)" : "rgba(0,48,135,0.05)",
      border: `1.5px solid ${productCount === 0 ? "rgba(239,68,68,0.2)" : "rgba(0,48,135,0.15)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: productCount === 0 ? "rgba(239,68,68,0.1)" : "rgba(0,48,135,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`bi ${productCount === 0 ? "bi-database-x" : "bi-database-check"}`} style={{ fontSize: 16, color: productCount === 0 ? "#ef4444" : "#003087" }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
            {productCount === 0 ? "Chưa có dữ liệu" : `${productCount} sản phẩm trong DB`}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
            {isRunning && <><i className="bi bi-arrow-repeat spin me-1" style={{ color: "#f59e0b" }} />{log?.message}</>}
            {isSuccess && lastSynced && <><i className="bi bi-check-circle me-1" style={{ color: "#10b981" }} />Đồng bộ lúc {lastSynced}</>}
            {isError   && <><i className="bi bi-x-circle me-1" style={{ color: "#ef4444" }} />{log?.message}</>}
            {!log      && "Chưa thực hiện đồng bộ"}
          </p>
        </div>
      </div>

      {isRunning && (
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ height: 4, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#f59e0b", width: `${Math.min(100, (log.totalSynced / 216) * 100)}%`, transition: "width 0.5s", borderRadius: 99 }} />
          </div>
          <p style={{ margin: "3px 0 0", fontSize: 10, color: "var(--muted-foreground)", textAlign: "right" }}>
            {log.totalSynced} / ~216 sản phẩm
          </p>
        </div>
      )}

      <button
        onClick={handleSync} disabled={isRunning}
        style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700,
          background: isRunning ? "var(--border)" : "#003087",
          color: isRunning ? "var(--muted-foreground)" : "#fff",
          border: "none", cursor: isRunning ? "default" : "pointer",
        }}>
        <i className={`bi bi-arrow-repeat${isRunning ? " spin" : ""}`} />
        {isRunning ? "Đang đồng bộ…" : productCount === 0 ? "Đồng bộ ngay" : "Đồng bộ lại"}
      </button>
    </div>
  );
}


// Component dropdown danh mục — dùng CSS variables, tương thích cả Light/Dark mode
// Khi groupFilter được chọn, topGroups chỉ chứa 1 group → dropdown chỉ hiện cấp con (giảm nesting)
function MacCategorySelect({ categories, value, onChange, topGroups, getChildren, groupActive }: { 
  categories: Category[];
  value: string; 
  onChange: (v: string) => void;
  topGroups: Category[];
  getChildren: (id: number) => Category[];
  groupActive: boolean; // true khi đang lọc theo 1 group cụ thể
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const selectedName = value === "" ? "Tất cả danh mục" : (categories.find(c => c.id.toString() === value)?.name || "Tất cả danh mục");

  const handleSelect = (v: string) => {
    onChange(v);
    setIsOpen(false);
  };

  const renderLabel = (name: string) => (
    <div style={{
      padding: "10px 14px 4px",
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--muted-foreground)",
    }}>
      {name}
    </div>
  );

  const renderOption = (id: string, name: string, level: number) => {
    const isSelected = value === id;
    const pl = level === 0 ? 14 : level === 1 ? 28 : 40;

    return (
      <div
        key={id || `all-${name}`}
        onClick={() => handleSelect(id)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: `7px 12px 7px ${pl}px`,
          cursor: "pointer", borderRadius: 7, margin: "1px 6px",
          fontSize: level === 2 ? 12.5 : 13,
          fontWeight: isSelected ? 600 : 400,
          background: isSelected ? "rgba(79,70,229,0.1)" : "transparent",
          color: isSelected ? "var(--primary)" : "var(--foreground)",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--muted)" }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent" }}
      >
        {/* Checkmark vùng cố định */}
        <div style={{ width: 16, flexShrink: 0, display: "flex", alignItems: "center" }}>
          {isSelected && <i className="bi bi-check2" style={{ fontSize: 14, color: "var(--primary)" }} />}
        </div>
        {/* Icon phân cấp */}
        {level === 1 && !isSelected && (
          <i className="bi bi-plus" style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0, opacity: 0.7 }} />
        )}
        {level === 1 && isSelected && (
          <i className="bi bi-plus" style={{ fontSize: 13, color: "var(--primary)", flexShrink: 0 }} />
        )}
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .cat-dropdown-scroll::-webkit-scrollbar { width: 0; }
        .cat-dropdown-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div ref={ref} style={{ position: "relative", width: "fit-content", flexShrink: 0 }}>
        {/* Nút trigger */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 12px 9px 14px",
            borderRadius: 10,
            border: `1.5px solid ${isOpen ? "var(--primary)" : "var(--border)"}`,
            background: "var(--card)",
            fontSize: 13, fontWeight: 500,
            color: value ? "var(--foreground)" : "var(--muted-foreground)",
            cursor: "pointer",
            boxShadow: isOpen ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
            transition: "all 0.15s",
            minWidth: 160, maxWidth: 260,
            userSelect: "none",
          }}
        >
          <i className="bi bi-funnel" style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedName}
          </span>
          <i
            className={`bi bi-chevron-${isOpen ? "up" : "down"}`}
            style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0, transition: "transform 0.2s" }}
          />
        </div>

        {/* Dropdown panel */}
        {isOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            width: 260, zIndex: 9999,
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)",
            // Khoá cứng chiều cao — KHÔNG CHO PHÉP TỰ GIÃN KHI CUỘN
            height: 360,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Danh sách cuộn */}
            <div className="cat-dropdown-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 0 8px" }}>

              {/* Mục "Tất cả" */}
              {renderOption("", groupActive ? "Tất cả trong nhóm" : "Tất cả danh mục", 0)}

              <div style={{ height: 1, background: "var(--border)", margin: "6px 14px" }} />

              {topGroups.map(group => {
                const level1 = getChildren(group.id);
                if (level1.length === 0) return null;
                return (
                  <div key={group.id}>
                    {/* Khi groupActive=true, bỏ heading group → danh mục hiện thẳng từ cấp 0 */}
                    {!groupActive && renderLabel(group.name)}
                    {level1.map(cat => {
                      const level2 = getChildren(cat.id);
                      return (
                        <React.Fragment key={cat.id}>
                          {renderOption(String(cat.id), cat.name, groupActive ? 0 : 1)}
                          {level2.map(sub => renderOption(String(sub.id), sub.name, groupActive ? 1 : 2))}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MarketingProductsPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<Product | null>(null);
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid");

  // Sync state (inline, no SyncPanel component needed in toolbar)
  const [syncLog, setSyncLog]   = useState<SyncLog | null>(null);
  const [syncing, setSyncing]   = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const [search, setSearch]                   = useState("");
  const [catFilter, setCatFilter]             = useState("");
  const [groupFilter, setGroupFilter]         = useState<number | null>(null);
  const [page, setPage]                       = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/seajong/sync");
      if (!r.ok) return;
      const text = await r.text();
      if (!text) return;
      const d = JSON.parse(text);
      setSyncLog(d.log ?? null);
      setSyncing(d.log?.status === "running");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSyncStatus(); }, [fetchSyncStatus]);

  // Auto-open modal if sync is running on load
  useEffect(() => { if (syncing) setShowSyncModal(true); }, [syncing]);

  // Poll while syncing
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(fetchSyncStatus, 3000);
    return () => clearInterval(t);
  }, [syncing, fetchSyncStatus]);

  const handleSync = async () => {
    setShowSyncModal(true);
    setSyncing(true);
    await fetch("/api/seajong/sync", { method: "POST" });
    fetchSyncStatus();
  };

  // Fetch categories once
  useEffect(() => {
    fetch("/api/seajong/categories")
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "24" });
      if (catFilter)                 params.set("category", catFilter);
      else if (groupFilter !== null) params.set("category", String(groupFilter));
      if (debouncedSearch)           params.set("search", debouncedSearch);
      const res = await fetch(`/api/seajong/products?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProducts(data.products || []);
      setPagination(data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [page, catFilter, groupFilter, debouncedSearch]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Build category tree
  const topGroups   = categories.filter(c => c.parent === 0);
  const getChildren = (parentId: number) => categories.filter(c => c.parent === parentId && c.count > 0);

  const CHIP_GROUPS = ["Thiết bị vệ sinh", "Thiết bị nhà bếp"];
  const chipGroups  = topGroups.filter(g => CHIP_GROUPS.includes(g.name));
  const otherGroups = topGroups.filter(g => !CHIP_GROUPS.includes(g.name));

  const dropdownGroups = groupFilter !== null
    ? topGroups.filter(g => g.id === groupFilter)
    : otherGroups;

  const handleGroupChip = (id: number) => {
    const next = groupFilter === id ? null : id;
    setGroupFilter(next);
    setCatFilter("");
    setPage(1);
  };

  const isRunning = syncLog?.status === "running";
  const isSuccess = syncLog?.status === "success";
  const lastSynced = syncLog?.finishedAt
    ? new Date(syncLog.finishedAt).toLocaleString("vi-VN")
    : null;

  // All sub-categories of currently active group (for row-2 chips)
  const activeCatChips: Category[] = groupFilter !== null
    ? getChildren(groupFilter)
    : [];

  // ── Sync Modal ─────────────────────────────────────────────────────────────
  const syncProgress = syncLog?.totalSynced ?? 0;
  const TOTAL_PRODUCTS = 216;
  const progressPct = Math.min(100, Math.round((syncProgress / TOTAL_PRODUCTS) * 100));
  const syncStatusColor = syncLog?.status === "success" ? "#10b981"
    : syncLog?.status === "error" ? "#ef4444"
    : "#f59e0b";

  const SyncModal = showSyncModal && (
    <>
      {/* Backdrop */}
      <div
        onClick={() => { if (!isRunning) setShowSyncModal(false); }}
        style={{
          position: "fixed", inset: 0, zIndex: 1050,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        }}
      />
      {/* Modal */}
      <div style={{
        position: "fixed", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1051, width: 480,
        background: "var(--card)",
        borderRadius: 18,
        border: "1.5px solid var(--border)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isRunning ? "rgba(245,158,11,0.12)" : syncLog?.status === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i
                className={`bi ${
                  isRunning ? "bi-arrow-repeat spin"
                  : syncLog?.status === "success" ? "bi-check-circle-fill"
                  : syncLog?.status === "error" ? "bi-x-circle-fill"
                  : "bi-arrow-repeat"
                }`}
                style={{ fontSize: 17, color: syncStatusColor }}
              />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
                {isRunning ? "Đang đồng bộ dữ liệu…" : syncLog?.status === "success" ? "Đồng bộ hoàn tất" : syncLog?.status === "error" ? "Đồng bộ thất bại" : "Đồng bộ dữ liệu"}
              </p>
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>
                seajong.com → Cơ sở dữ liệu nội bộ
              </p>
            </div>
          </div>
          {!isRunning && (
            <button
              onClick={() => setShowSyncModal(false)}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: "1.5px solid var(--border)", background: "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--muted-foreground)",
              }}
            >
              <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>

          {/* Progress bar */}
          {(isRunning || syncProgress > 0) && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Tiến độ</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: syncStatusColor }}>{progressPct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: isRunning
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : syncLog?.status === "success" ? "#10b981" : "#ef4444",
                  width: `${progressPct}%`,
                  transition: "width 0.5s ease",
                  boxShadow: isRunning ? "0 0 12px rgba(245,158,11,0.5)" : "none",
                }} />
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--background)", border: "1px solid var(--border)",
            }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Sản phẩm</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>
                {syncProgress}
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)", marginLeft: 4 }}>/ ~{TOTAL_PRODUCTS}</span>
              </p>
            </div>
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--background)", border: "1px solid var(--border)",
            }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Trạng thái</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: syncStatusColor, display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                <i className={`bi ${
                  isRunning ? "bi-hourglass-split"
                  : syncLog?.status === "success" ? "bi-check2-circle"
                  : syncLog?.status === "error" ? "bi-exclamation-triangle"
                  : "bi-dash-circle"
                }`} />
                {isRunning ? "Đang chạy" : syncLog?.status === "success" ? "Thành công" : syncLog?.status === "error" ? "Lỗi" : "Chờ"}
              </p>
            </div>
          </div>

          {/* Log message */}
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: isRunning ? "rgba(245,158,11,0.06)" : "var(--background)",
            border: `1px solid ${isRunning ? "rgba(245,158,11,0.2)" : "var(--border)"}`,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <i
              className={`bi ${isRunning ? "bi-terminal" : "bi-info-circle"}`}
              style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0, marginTop: 1 }}
            />
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.6, fontFamily: "monospace" }}>
              {syncLog?.message || "Bắt đầu..."}
            </p>
          </div>

          {/* Footer actions */}
          {!isRunning && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {syncLog?.status === "error" && (
                <button
                  onClick={handleSync}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                    background: "#003087", color: "#fff",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <i className="bi bi-arrow-repeat" /> Thử lại
                </button>
              )}
              {syncLog?.status === "success" && (
                <button
                  onClick={() => { fetchProducts(); setShowSyncModal(false); }}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                    background: "#003087", color: "#fff",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <i className="bi bi-grid-3x3-gap-fill" /> Xem sản phẩm
                </button>
              )}
              <button
                onClick={() => setShowSyncModal(false)}
                style={{
                  padding: "9px 18px", borderRadius: 9,
                  border: "1.5px solid var(--border)", background: "transparent",
                  color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div style={{ background: "var(--background)" }}>
      <PageHeader
        title="Sản phẩm Seajong"
        description={pagination?.total ? `${pagination.total} sản phẩm — cơ sở dữ liệu nội bộ` : "Dữ liệu sản phẩm từ seajong.com"}
        color="blue"
        icon="bi-box-seam"
      />

      {/* ── Unified Toolbar (sticky) ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--background)", padding: "10px 24px 0" }}>

        {/* ── Hàng 1: Search | Toggles | Dropdown | [right] Grid/List | Đồng bộ ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap",
          padding: "8px 14px",
          background: "var(--card)",
          border: "1.5px solid var(--border)",
          borderRadius: activeCatChips.length > 0 ? "12px 12px 0 0" : 12,
          borderBottom: activeCatChips.length > 0 ? "1px solid var(--border)" : undefined,
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 0 }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 13 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm theo tên..."
              style={{
                width: "100%", padding: "7px 10px 7px 33px",
                borderRadius: 8, border: "1.5px solid var(--border)",
                background: "var(--background)", fontSize: 13,
                outline: "none", color: "var(--foreground)",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: "var(--border)", flexShrink: 0 }} />

          {/* Toggle chips (Thiết bị vệ sinh / Thiết bị nhà bếp) */}
          {chipGroups.map(g => {
            const active = groupFilter === g.id;
            return (
              <div
                key={g.id}
                onClick={() => handleGroupChip(g.id)}
                style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", flexShrink: 0, userSelect: "none" }}
              >
                <div style={{
                  width: 34, height: 18, borderRadius: 99, flexShrink: 0,
                  background: active ? "var(--primary)" : "var(--border)",
                  position: "relative", transition: "background 0.2s ease",
                  boxShadow: active ? "0 0 0 3px rgba(79,70,229,0.15)" : "none",
                }}>
                  <div style={{
                    position: "absolute", top: 2, left: active ? 16 : 2,
                    width: 14, height: 14, borderRadius: "50%",
                    background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                    transition: "left 0.2s ease",
                  }} />
                </div>
                <span style={{
                  fontSize: 12.5, fontWeight: active ? 600 : 400,
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  whiteSpace: "nowrap", transition: "color 0.15s",
                }}>{g.name}</span>
              </div>
            );
          })}

          {/* Right-side controls */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Pagination info */}
            {pagination && (
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap", marginRight: 4 }}>
                <b style={{ color: "var(--foreground)" }}>{pagination.total}</b> sản phẩm
                &nbsp;·&nbsp; trang <b style={{ color: "var(--foreground)" }}>{pagination.page}</b>/{pagination.totalPages}
              </span>
            )}

            {/* Divider */}
            <div style={{ width: 1, height: 22, background: "var(--border)" }} />

            {/* View mode: Grid */}
            <button
              onClick={() => setViewMode("grid")}
              title="Xem dạng lưới"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: viewMode === "grid" ? "rgba(79,70,229,0.12)" : "transparent",
                color: viewMode === "grid" ? "var(--primary)" : "var(--muted-foreground)",
                transition: "all 0.15s",
              }}
            >
              <i className="bi bi-grid-3x3-gap-fill" style={{ fontSize: 15 }} />
            </button>

            {/* View mode: List */}
            <button
              onClick={() => setViewMode("list")}
              title="Xem dạng bảng"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: viewMode === "list" ? "rgba(79,70,229,0.12)" : "transparent",
                color: viewMode === "list" ? "var(--primary)" : "var(--muted-foreground)",
                transition: "all 0.15s",
              }}
            >
              <i className="bi bi-list-ul" style={{ fontSize: 16 }} />
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 22, background: "var(--border)" }} />

            {/* Sync button */}
            <button
              onClick={handleSync} disabled={isRunning}
              title={isSuccess && lastSynced ? `Đồng bộ lúc ${lastSynced}` : "Đồng bộ dữ liệu"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                background: isRunning ? "var(--border)" : "#003087",
                color: isRunning ? "var(--muted-foreground)" : "#fff",
                border: "none", cursor: isRunning ? "default" : "pointer",
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              <i className={`bi bi-arrow-repeat${isRunning ? " spin" : ""}`} style={{ fontSize: 13 }} />
              {isRunning ? "Đang đồng bộ…" : "Đồng bộ"}
            </button>
          </div>
        </div>

        {/* ── Hàng 2: Category chips (chỉ hiện khi đang chọn group hoặc có danh mục) ── */}
        {(activeCatChips.length > 0 || catFilter) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            padding: "8px 14px 10px",
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginRight: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Danh mục:
            </span>
            {/* "Tất cả" chip */}
            <button
              onClick={() => { setCatFilter(""); setPage(1); }}
              style={{
                padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: catFilter === "" ? 700 : 500,
                background: catFilter === "" ? "var(--primary)" : "var(--background)",
                color: catFilter === "" ? "#fff" : "var(--muted-foreground)",
                border: `1.5px solid ${catFilter === "" ? "var(--primary)" : "var(--border)"}`,
                cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              Tất cả
            </button>
            {activeCatChips.map(cat => {
              const active = catFilter === String(cat.id);
              const subCats = getChildren(cat.id);
              return (
                <React.Fragment key={cat.id}>
                  <button
                    onClick={() => { setCatFilter(active ? "" : String(cat.id)); setPage(1); }}
                    style={{
                      padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: active ? 700 : 500,
                      background: active ? "var(--primary)" : "var(--background)",
                      color: active ? "#fff" : "var(--foreground)",
                      border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                    }}
                  >
                    {cat.name}
                    {cat.count > 0 && (
                      <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.75 }}>({cat.count})</span>
                    )}
                  </button>
                  {/* Danh mục con nếu có và đang active */}
                  {active && subCats.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => { setCatFilter(catFilter === String(sub.id) ? String(cat.id) : String(sub.id)); setPage(1); }}
                      style={{
                        padding: "2px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: catFilter === String(sub.id) ? 700 : 400,
                        background: catFilter === String(sub.id) ? "rgba(79,70,229,0.15)" : "transparent",
                        color: catFilter === String(sub.id) ? "var(--primary)" : "var(--muted-foreground)",
                        border: `1px solid ${catFilter === String(sub.id) ? "var(--primary)" : "var(--border)"}`,
                        cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                      }}
                    >
                      {sub.name}
                    </button>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        )}

      </div>

      {/* Content — flow tự nhiên */}
      <div style={{ padding: "20px 24px 24px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
            <i className="bi bi-arrow-repeat spin" style={{ fontSize: 28, display: "block", marginBottom: 12 }} />
            Đang tải dữ liệu…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#ef4444" }}>
            <i className="bi bi-exclamation-triangle" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
            {error}
            <button onClick={fetchProducts} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "1.5px solid #ef4444", background: "transparent", color: "#ef4444", cursor: "pointer", fontWeight: 600 }}>
              Thử lại
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
            <i className="bi bi-box-seam" style={{ fontSize: 32, display: "block", marginBottom: 10, color: "var(--muted-foreground)", opacity: 0.5 }} />
            <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Không tìm thấy sản phẩm nào</p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>Vui lòng thay đổi từ khóa hoặc bộ lọc danh mục.</p>
          </div>
        )}

        {/* Product Grid / List */}
        {!loading && products.length > 0 && (
          viewMode === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              {products.map(p => (
                <ProductCard key={p.id} p={p} cats={categories} onClick={() => setSelected(p)} />
              ))}
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: "1.5px solid var(--border)", overflow: "hidden", marginBottom: 24 }}>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "60px 1fr 180px 100px 120px",
                padding: "9px 14px", background: "var(--muted)",
                borderBottom: "1px solid var(--border)",
                fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)",
                letterSpacing: "0.03em", textTransform: "uppercase",
              }}>
                <span>Ảnh</span>
                <span>Tên sản phẩm</span>
                <span>Danh mục</span>
                <span>Thông số</span>
                <span style={{ textAlign: "right" }}>Cập nhật</span>
              </div>
              {products.map((p, idx) => {
                const catNames = p.categories.map(id => categories.find(c => c.id === id)?.name).filter(Boolean) as string[];
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelected(p)}
                    style={{
                      display: "grid", gridTemplateColumns: "60px 1fr 180px 100px 120px",
                      padding: "10px 14px", alignItems: "center",
                      background: idx % 2 === 0 ? "var(--card)" : "var(--background)",
                      borderBottom: idx < products.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: "pointer", transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(79,70,229,0.05)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--card)" : "var(--background)"}
                  >
                    {/* Ảnh */}
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "var(--muted)", flexShrink: 0 }}>
                      {p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-image" style={{ fontSize: 16, color: "#ccc" }} />
                        </div>
                      )}
                    </div>
                    {/* Tên */}
                    <div style={{ paddingRight: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                      {p.excerpt && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.excerpt}</p>}
                    </div>
                    {/* Danh mục */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {catNames.slice(0,2).map(n => (
                        <span key={n} style={{ fontSize: 10.5, padding: "1px 8px", borderRadius: 99, background: "rgba(0,48,135,0.1)", color: "#003087", fontWeight: 600 }}>{n}</span>
                      ))}
                    </div>
                    {/* Thông số count */}
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      {Object.keys(p.specs).length > 0 ? `${Object.keys(p.specs).length} thông số` : <span style={{ opacity: 0.4 }}>—</span>}
                    </div>
                    {/* Ngày */}
                    <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted-foreground)" }}>
                      {new Date(p.updatedAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && !loading && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, paddingTop: 8 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: "7px 16px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--card)", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1, fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>
              <i className="bi bi-chevron-left me-1" />Trước
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
              const n = i + 1;
              return (
                <button key={n} onClick={() => setPage(n)} style={{
                  padding: "7px 13px", borderRadius: 9, fontWeight: 700, fontSize: 13,
                  border: `1.5px solid ${page === n ? "#003087" : "var(--border)"}`,
                  background: page === n ? "#003087" : "var(--card)",
                  color: page === n ? "#fff" : "var(--foreground)", cursor: "pointer",
                }}>{n}</button>
              );
            })}
            {pagination.totalPages > 7 && <span style={{ color: "var(--muted-foreground)" }}>…</span>}
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: "7px 16px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--card)", cursor: page >= pagination.totalPages ? "default" : "pointer", opacity: page >= pagination.totalPages ? 0.4 : 1, fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>
              Sau<i className="bi bi-chevron-right ms-1" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <ProductDrawer p={selected} cats={categories} onClose={() => setSelected(null)} />
      )}

      {/* Sync Modal */}
      {SyncModal}

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
