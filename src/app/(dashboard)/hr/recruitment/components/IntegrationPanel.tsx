"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface IntegrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

type Platform = "topcv" | "vieclam24h";
type ConnectionMode = "webhook" | "developer_api" | "xray";

interface PlatformConfig {
  topcv_mode: ConnectionMode;
  topcv_access_token: string;
  topcv_secret_key: string;
  vieclam24h_mode: ConnectionMode;
  vieclam24h_access_token: string;
  vieclam24h_secret_key: string;
}

const PLATFORMS = {
  topcv: {
    name: "TopCV",
    logo: "🟧",
    color: "#f97316",
    bgColor: "#fff7ed",
    borderColor: "#fed7aa",
    url: "https://tuyendung.topcv.vn/app/account/settings/connect-api",
    webhookPath: "/api/hr/recruitment/webhook/topcv",
    description: "Nền tảng tuyển dụng hàng đầu Việt Nam với hơn 5 triệu ứng viên",
  },
  vieclam24h: {
    name: "Vieclam24h",
    logo: "🟦",
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    url: "https://ntd.vieclam24h.vn",
    webhookPath: "/api/hr/recruitment/webhook/vieclam24h",
    description: "Nền tảng đăng tin tuyển dụng phổ biến với nguồn ứng viên chất lượng",
  },
};

const MODE_OPTIONS: { id: ConnectionMode; icon: string; title: string; desc: string; badge?: string }[] = [
  {
    id: "webhook",
    icon: "bi-bell-fill",
    title: "Webhook (Tự động)",
    desc: "Nhận CV tức thời ngay khi có người nộp hồ sơ. Không cần thao tác thủ công.",
    badge: "Miễn phí",
  },
  {
    id: "developer_api",
    icon: "bi-lightning-charge-fill",
    title: "Developer API (Đồng bộ lịch sử)",
    desc: "Chủ động kéo toàn bộ CV lịch sử từ cổng tuyển dụng về hệ thống nội bộ.",
    badge: "Trả phí",
  },
  {
    id: "xray",
    icon: "bi-search",
    title: "Google X-Ray Search",
    desc: "Quét các hồ sơ công khai trên internet thông qua SERP API. Không cần tài khoản.",
    badge: "SERP API",
  },
];

const WEBHOOK_STEPS = (platform: Platform, webhookUrl: string) => [
  {
    step: 1,
    title: `Đăng nhập vào trang ${PLATFORMS[platform].name}`,
    content: (
      <div>
        <p className="mb-2" style={{ fontSize: "13px" }}>Mở trang quản trị nhà tuyển dụng:</p>
        <a href={PLATFORMS[platform].url} target="_blank" rel="noopener noreferrer"
          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-2">
          <i className="bi bi-box-arrow-up-right" />
          Mở trang {PLATFORMS[platform].name}
        </a>
      </div>
    ),
  },
  {
    step: 2,
    title: "Vào mục Cài đặt → Kết nối API",
    content: (
      <p style={{ fontSize: "13px" }}>
        {platform === "topcv"
          ? "Tại sidebar trái → Chọn \"Cài đặt tài khoản\" → Chọn tab \"Kết nối API\"."
          : "Tại menu trên → Chọn \"Cài đặt\" → Chọn mục \"Kết nối API / Webhook\"."}
      </p>
    ),
  },
  {
    step: 3,
    title: "Dán Webhook URL vào hệ thống",
    content: (
      <div>
        <p className="mb-2" style={{ fontSize: "13px" }}>Copy URL bên dưới và dán vào ô <strong>Webhook URL</strong>:</p>
        <WebhookUrlBox url={webhookUrl} />
      </div>
    ),
  },
  {
    step: 4,
    title: "Lưu cấu hình và kiểm tra",
    content: (
      <p style={{ fontSize: "13px" }}>
        Bấm <strong>Lưu / Cập nhật</strong> trên trang {PLATFORMS[platform].name}. 
        Từ lúc này, mỗi khi có ứng viên mới nộp CV, hệ thống EOS sẽ tự động nhận dữ liệu ngay lập tức.
      </p>
    ),
  },
];

const API_STEPS = (platform: Platform) => [
  {
    step: 1,
    title: `Liên hệ ${PLATFORMS[platform].name} để mua gói API`,
    content: (
      <div style={{ fontSize: "13px" }}>
        <p>
          {platform === "topcv"
            ? "Gói \"Top Developer API\" của TopCV là dịch vụ B2B riêng. Liên hệ bộ phận kinh doanh để đăng ký."
            : "Gói API tích hợp của Vieclam24h yêu cầu liên hệ trực tiếp qua email hoặc hotline."}
        </p>
        {platform === "vieclam24h" && (
          <div className="mt-2 d-flex gap-2 flex-wrap">
            <a href="mailto:ntd@vieclam24h.vn" className="btn btn-sm btn-outline-primary">
              <i className="bi bi-envelope me-1" /> ntd@vieclam24h.vn
            </a>
            <span className="btn btn-sm btn-outline-secondary disabled">(028) 7108 2424</span>
          </div>
        )}
      </div>
    ),
  },
  {
    step: 2,
    title: "Nhận tài liệu API và Access Token",
    content: (
      <p style={{ fontSize: "13px" }}>
        Sau khi đăng ký thành công, {PLATFORMS[platform].name} sẽ cấp cho bạn <strong>Access Token</strong> và tài liệu mô tả các endpoint API để tích hợp.
      </p>
    ),
  },
  {
    step: 3,
    title: "Nhập Access Token vào đây",
    content: <p style={{ fontSize: "13px" }}>Dán Access Token vào ô nhập phía trên rồi bấm <strong>Lưu</strong>. Hệ thống sẽ tự động dùng nó khi bạn bấm nút "Tìm ứng viên".</p>,
  },
];

const XRAY_STEPS = [
  {
    step: 1,
    title: "Đăng ký SERP API Key",
    content: (
      <div style={{ fontSize: "13px" }}>
        <p>Đăng ký tài khoản miễn phí tại SerpApi để quét kết quả Google:</p>
        <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer"
          className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-2">
          <i className="bi bi-box-arrow-up-right" />
          Đăng ký SerpApi miễn phí
        </a>
      </div>
    ),
  },
  {
    step: 2,
    title: "Lấy API Key và thêm vào .env",
    content: (
      <div style={{ fontSize: "13px" }}>
        <p>Sau khi đăng ký, vào Dashboard → Copy API Key và thêm vào file <code>.env</code>:</p>
        <code className="d-block p-2 rounded" style={{ background: "#1e293b", color: "#86efac", fontSize: "12px" }}>
          SERPAPI_KEY="your_serpapi_key_here"
        </code>
      </div>
    ),
  },
  {
    step: 3,
    title: "Bắt đầu tìm kiếm",
    content: <p style={{ fontSize: "13px" }}>Sau khi cấu hình xong, bấm nút <strong>"🪄 Tìm ứng viên"</strong> và chọn nguồn tương ứng. Hệ thống sẽ tự động quét hồ sơ công khai.</p>,
  },
];

function WebhookUrlBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="input-group">
      <input type="text" className="form-control bg-light fw-mono" readOnly value={url} style={{ fontSize: "12px", fontFamily: "monospace" }} />
      <button className={`btn ${copied ? "btn-success" : "btn-outline-primary"}`} onClick={handleCopy} style={{ minWidth: "80px" }}>
        {copied ? <><i className="bi bi-check2 me-1" />Đã copy</> : <><i className="bi bi-copy me-1" />Copy</>}
      </button>
    </div>
  );
}

function StepGuide({ steps }: { steps: { step: number; title: string; content: React.ReactNode }[] }) {
  const [openStep, setOpenStep] = useState(1);
  return (
    <div className="d-flex flex-column gap-2">
      {steps.map(s => (
        <div key={s.step} className="border rounded" style={{ overflow: "hidden", borderColor: openStep === s.step ? "#6366f1" : "#e5e7eb" }}>
          <button
            className="btn w-100 text-start d-flex align-items-center gap-3 px-3 py-2"
            style={{ background: openStep === s.step ? "#f0f0ff" : "#fff", borderRadius: 0 }}
            onClick={() => setOpenStep(openStep === s.step ? 0 : s.step)}
          >
            <div style={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
              background: openStep === s.step ? "#6366f1" : "#e5e7eb",
              color: openStep === s.step ? "#fff" : "#6b7280",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: 700
            }}>{s.step}</div>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{s.title}</span>
            <i className={`bi bi-chevron-${openStep === s.step ? "up" : "down"} ms-auto`} style={{ fontSize: "11px", color: "#9ca3af" }} />
          </button>
          <AnimatePresence>
            {openStep === s.step && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                <div className="px-4 py-3" style={{ borderTop: "1px solid #f0f0f0" }}>
                  {s.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function IntegrationPanel({ isOpen, onClose, onSuccess }: IntegrationPanelProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>("topcv");
  const [config, setConfig] = useState<PlatformConfig>({
    topcv_mode: "webhook",
    topcv_access_token: "",
    topcv_secret_key: "",
    vieclam24h_mode: "webhook",
    vieclam24h_access_token: "",
    vieclam24h_secret_key: "",
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("recruitment_integration_config");
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch {}
    }
  }, []);

  if (!mounted) return null;

  const platform = PLATFORMS[activePlatform];
  const mode = config[`${activePlatform}_mode` as keyof PlatformConfig] as ConnectionMode;
  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}${platform.webhookPath}`
    : platform.webhookPath;

  const handleSave = () => {
    localStorage.setItem("recruitment_integration_config", JSON.stringify(config));
    // Backward compat: save each platform token separately for scan handler
    localStorage.setItem("topcv_access_token", config.topcv_access_token);
    localStorage.setItem("vieclam24h_access_token", config.vieclam24h_access_token);
    onSuccess("Đã lưu cấu hình tích hợp thành công!");
    onClose();
  };

  const updateConfig = (key: keyof PlatformConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const getConnectionStatus = (p: Platform): "connected" | "partial" | "none" => {
    const m = config[`${p}_mode` as keyof PlatformConfig] as ConnectionMode;
    if (m === "webhook") return "connected";
    if (m === "developer_api" && config[`${p}_access_token` as keyof PlatformConfig]) return "connected";
    if (m === "xray") return "partial";
    return "none";
  };

  const statusLabel = { connected: { label: "Đã kết nối", color: "#16a34a", bg: "#dcfce7" }, partial: { label: "Chưa đủ cấu hình", color: "#d97706", bg: "#fef3c7" }, none: { label: "Chưa thiết lập", color: "#6b7280", bg: "#f3f4f6" } };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1200, display: "flex" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{ marginLeft: "auto", width: "100%", maxWidth: 900, height: "100vh", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.15)" }}
          >
            {/* Header */}
            <div style={{ padding: "20px 28px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12, background: "#fafafa" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-plug-fill text-white" style={{ fontSize: 18 }} />
              </div>
              <div>
                <h5 className="mb-0 fw-bold" style={{ fontSize: 16 }}>Cấu hình Tích hợp Tuyển dụng</h5>
                <p className="mb-0 text-muted" style={{ fontSize: 12 }}>Kết nối hệ thống EOS với các nền tảng tuyển dụng bên ngoài</p>
              </div>
              <button className="btn btn-sm btn-light ms-auto d-flex align-items-center gap-1" onClick={onClose}>
                <i className="bi bi-x-lg" /> Đóng
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Left sidebar: Platform list */}
              <div style={{ width: 220, borderRight: "1px solid #e5e7eb", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 8, background: "#f9fafb" }}>
                <p className="text-muted fw-semibold px-2 mb-1" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Nền tảng</p>
                {(Object.keys(PLATFORMS) as Platform[]).map(p => {
                  const pl = PLATFORMS[p];
                  const status = getConnectionStatus(p);
                  const st = statusLabel[status];
                  const isActive = activePlatform === p;
                  return (
                    <button key={p} onClick={() => setActivePlatform(p)}
                      style={{
                        border: isActive ? `2px solid ${pl.color}` : "2px solid transparent",
                        borderRadius: 10, background: isActive ? pl.bgColor : "#fff",
                        padding: "10px 12px", textAlign: "left", cursor: "pointer",
                        transition: "all 0.15s"
                      }}>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span style={{ fontSize: 18 }}>{pl.logo}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? pl.color : "#374151" }}>{pl.name}</span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 12, background: st.bg, color: st.color }}>{st.label}</span>
                    </button>
                  );
                })}

                <div style={{ marginTop: "auto", padding: "12px", background: "#f0f0ff", borderRadius: 10, border: "1px solid #e0e0ff" }}>
                  <p className="mb-1" style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>💡 Nền tảng khác</p>
                  <p className="mb-0 text-muted" style={{ fontSize: 11 }}>LinkedIn, CareerViet, ITViec... sẽ được thêm trong phiên bản tiếp theo.</p>
                </div>
              </div>

              {/* Right content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
                {/* Platform header */}
                <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded-3" style={{ background: platform.bgColor, border: `1px solid ${platform.borderColor}` }}>
                  <span style={{ fontSize: 32 }}>{platform.logo}</span>
                  <div>
                    <h6 className="mb-1 fw-bold" style={{ color: platform.color }}>{platform.name}</h6>
                    <p className="mb-0 text-muted" style={{ fontSize: 12 }}>{platform.description}</p>
                  </div>
                  <a href={platform.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm ms-auto" style={{ background: platform.color, color: "#fff", fontSize: 12 }}>
                    <i className="bi bi-box-arrow-up-right me-1" /> Mở trang
                  </a>
                </div>

                {/* Mode selection */}
                <h6 className="fw-bold mb-3" style={{ fontSize: 13 }}>1. Chọn chế độ kết nối</h6>
                <div className="d-flex flex-column gap-2 mb-4">
                  {MODE_OPTIONS.map(m => {
                    const isSelected = mode === m.id;
                    return (
                      <div key={m.id} onClick={() => updateConfig(`${activePlatform}_mode` as keyof PlatformConfig, m.id)}
                        style={{
                          border: isSelected ? `2px solid ${platform.color}` : "2px solid #e5e7eb",
                          borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                          background: isSelected ? platform.bgColor : "#fff",
                          transition: "all 0.15s", display: "flex", alignItems: "flex-start", gap: 12
                        }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: isSelected ? platform.color : "#f3f4f6",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <i className={`bi ${m.icon}`} style={{ fontSize: 16, color: isSelected ? "#fff" : "#6b7280" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? platform.color : "#374151" }}>{m.title}</span>
                            {m.badge && (
                              <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 12, background: isSelected ? platform.color : "#e5e7eb", color: isSelected ? "#fff" : "#6b7280", fontWeight: 600 }}>
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <p className="mb-0 text-muted" style={{ fontSize: 12 }}>{m.desc}</p>
                        </div>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isSelected ? platform.color : "#d1d5db"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }}>
                          {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: platform.color }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Config section */}
                {mode === "developer_api" && (
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3" style={{ fontSize: 13 }}>2. Nhập thông tin xác thực</h6>
                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>Access Token</label>
                      <div className="input-group">
                        <span className="input-group-text" style={{ fontSize: 12 }}><i className="bi bi-key-fill text-warning" /></span>
                        <input type="password" className="form-control" style={{ fontSize: 13 }}
                          placeholder="Dán Access Token từ trang cài đặt..."
                          value={config[`${activePlatform}_access_token` as keyof PlatformConfig]}
                          onChange={e => updateConfig(`${activePlatform}_access_token` as keyof PlatformConfig, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>Secret Key</label>
                      <div className="input-group">
                        <span className="input-group-text" style={{ fontSize: 12 }}><i className="bi bi-shield-lock-fill text-primary" /></span>
                        <input type="password" className="form-control" style={{ fontSize: 13 }}
                          placeholder="Dán Secret Key từ trang cài đặt..."
                          value={config[`${activePlatform}_secret_key` as keyof PlatformConfig]}
                          onChange={e => updateConfig(`${activePlatform}_secret_key` as keyof PlatformConfig, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step-by-step guide */}
                <h6 className="fw-bold mb-3" style={{ fontSize: 13 }}>
                  {mode === "developer_api" ? "3." : "2."} Hướng dẫn thiết lập từng bước
                </h6>
                <StepGuide steps={
                  mode === "webhook"
                    ? WEBHOOK_STEPS(activePlatform, webhookUrl)
                    : mode === "developer_api"
                    ? API_STEPS(activePlatform)
                    : XRAY_STEPS
                } />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 28px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fafafa" }}>
              <button className="btn btn-light fw-semibold" onClick={onClose}>Hủy</button>
              <button
                className="btn fw-bold px-4 d-flex align-items-center gap-2"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}
                onClick={handleSave}
              >
                <i className="bi bi-check2-circle" /> Lưu cấu hình
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
