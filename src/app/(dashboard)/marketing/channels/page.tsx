"use client";
import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion, AnimatePresence } from "framer-motion";

const CHANNELS = [
  { id: "facebook", name: "Facebook Ads", icon: "bi-facebook", color: "#1877f2", description: "Đồng bộ lead từ Form quảng cáo và tin nhắn Facebook" },
  { id: "tiktok", name: "TikTok Ads", icon: "bi-tiktok", color: "#000000", description: "Tự động thu thập lead từ TikTok Lead Generation" },
  { id: "google", name: "Google Ads", icon: "bi-google", color: "#4285f4", description: "Tích hợp biểu mẫu tiện ích mở rộng của Google Ads" },
  { id: "zalo", name: "Zalo OA", icon: "bi-chat-dots-fill", color: "#0068ff", description: "Kết nối Zalo Official Account và Mini App" },
];

export default function ChannelsPage() {
  const [selected, setSelected] = useState<string | null>("facebook");
  const [copied, setCopied] = useState(false);

  const getWebhookUrl = (platform: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return `${origin}/api/marketing/leads/webhook/${platform}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Kênh kết nối"
        description="Cấu hình và quản lý kết nối tự động với các nguồn dữ liệu bên ngoài"
        color="rose"
        icon="bi-diagram-3"
      />

      <div className="p-4 flex-grow-1 overflow-auto">
        <div className="row g-4">
          {/* Left: Channel List */}
          <div className="col-md-4">
            <div className="d-flex flex-column gap-2">
              {CHANNELS.map(ch => (
                <div 
                  key={ch.id}
                  onClick={() => setSelected(ch.id)}
                  style={{
                    padding: "16px",
                    borderRadius: "14px",
                    border: "1px solid",
                    borderColor: selected === ch.id ? ch.color : "var(--border)",
                    background: selected === ch.id ? `color-mix(in srgb, ${ch.color} 8%, transparent)` : "var(--card)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div style={{ 
                      width: 40, height: 40, borderRadius: "10px", 
                      background: `color-mix(in srgb, ${ch.color} 12%, transparent)`,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <i className={`bi ${ch.icon}`} style={{ fontSize: 20, color: ch.color }} />
                    </div>
                    <div>
                      <h6 className="mb-0 fw-bold">{ch.name}</h6>
                      <p className="mb-0 text-muted" style={{ fontSize: 11 }}>{selected === ch.id ? "Đang cấu hình..." : "Chưa kết nối"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Configuration Details */}
          <div className="col-md-8">
            <AnimatePresence mode="wait">
              {selected && (
                <motion.div
                  key={selected}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="app-card p-4 h-100"
                >
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div style={{ 
                      width: 48, height: 48, borderRadius: "12px", 
                      background: `color-mix(in srgb, ${CHANNELS.find(c => c.id === selected)?.color} 12%, transparent)`,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <i className={`bi ${CHANNELS.find(c => c.id === selected)?.icon}`} style={{ fontSize: 24, color: CHANNELS.find(c => c.id === selected)?.color }} />
                    </div>
                    <div>
                      <h4 className="mb-0 fw-bold">Kết nối {CHANNELS.find(c => c.id === selected)?.name}</h4>
                      <p className="mb-0 text-muted">{CHANNELS.find(c => c.id === selected)?.description}</p>
                    </div>
                  </div>

                  <div className="bg-light p-4 rounded-4 border mb-4">
                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-link-45deg" /> Địa chỉ Webhook (Dành cho Make.com / Zapier)
                    </h6>
                    <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                      Bạn không cần tạo App lằng nhằng. Hãy sử dụng dịch vụ trung gian (như Make.com) và dán đường link này vào phần <b>HTTP Request</b> hoặc <b>Webhook</b> của họ.
                    </p>
                    
                    <div className="input-group mt-3 shadow-sm">
                      <input 
                        type="text" 
                        readOnly 
                        className="form-control bg-white border-end-0 py-2 px-3 fw-mono" 
                        style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}
                        value={getWebhookUrl(selected)} 
                      />
                      <button 
                        className={`btn ${copied ? "btn-success" : "btn-dark"} px-4`}
                        onClick={() => copyToClipboard(getWebhookUrl(selected))}
                      >
                        {copied ? <i className="bi bi-check-lg" /> : "Copy Link"}
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6 className="fw-bold mb-3">Quy trình thiết lập (5 phút):</h6>
                    <div className="d-flex flex-column gap-3">
                      {[
                        { step: 1, text: "Truy cập Make.com (Miễn phí) và tạo một 'Scenario' mới." },
                        { step: 2, text: "Thêm module 'Facebook Lead Ads' và đăng nhập tài khoản Facebook của bạn." },
                        { step: 3, text: "Thêm module 'HTTP' -> 'Make a request' và dán link Webhook ở trên vào." },
                        { step: 4, text: "Nhấn 'Run Once' và điền thử 1 Form trên Facebook để kiểm tra kết nối." }
                      ].map((s, idx) => (
                        <div key={idx} className="d-flex align-items-start gap-3">
                          <div style={{ 
                            width: 24, height: 24, borderRadius: "50%", background: "var(--foreground)", color: "var(--background)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0
                          }}>{s.step}</div>
                          <p className="mb-0" style={{ fontSize: 13 }}>{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-top d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>Hệ thống đã sẵn sàng nhận dữ liệu</span>
                    </div>
                    <button className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold">Xem tài liệu hướng dẫn chi tiết</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pulse-dot {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  );
}
