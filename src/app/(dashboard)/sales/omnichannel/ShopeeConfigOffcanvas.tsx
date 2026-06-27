"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";

interface ShopeeConfigProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export function ShopeeConfigOffcanvas({ open, onClose, onSuccess }: ShopeeConfigProps) {
  const [mounted, setMounted] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    partnerId: "",
    partnerKey: "",
    shopId: "",
    shopName: "Leetech Official Store",
    webhookUrl: ""
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      fetch("/api/sales/omnichannel/config")
        .then(res => res.json())
        .then(data => {
          if (data && (data.partnerId || data.shopId || data.webhookUrl)) {
            setFormData({
              partnerId: data.partnerId || "",
              partnerKey: data.partnerKey || "",
              shopId: data.shopId || "",
              shopName: data.shopName || "Leetech Official Store",
              webhookUrl: data.webhookUrl || ""
            });
          } else {
            const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
            setFormData(prev => ({
              ...prev,
              webhookUrl: currentOrigin ? `${currentOrigin}/api/sales/omnichannel/webhook` : ""
            }));
          }
        })
        .catch(err => console.error("Error loading config:", err));
    }
  }, [open]);

  if (!mounted) return null;

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 };
  const inputStyle = { fontSize: 13, borderRadius: 8 };

  const isConfigured = !!(formData.partnerId && formData.partnerKey && formData.shopId && formData.webhookUrl);

  const handleCopy = () => {
    const urlToCopy = formData.webhookUrl || "https://yourdomain.com/api/sales/omnichannel/webhook";
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <>
      <div
        className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
        style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none" }}
        onClick={onClose}
      />

      <div
        className={`offcanvas offcanvas-end border-0 shadow-lg ${open ? "show" : ""}`}
        style={{
          width: showGuide ? 820 : 420,
          maxWidth: "100%",
          visibility: open ? "visible" : "hidden",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease-in-out, visibility 0.3s",
          background: "var(--background)"
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary-subtle p-2 rounded-3 text-primary d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <i className="bi bi-gear-fill fs-5" />
            </div>
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 15 }}>
              Cấu hình Shopee API
            </h5>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className={`btn btn-sm d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-pill border ${
                showGuide 
                  ? "btn-primary text-white border-primary" 
                  : "btn-outline-secondary border-secondary-subtle"
              }`}
              style={{ fontSize: 12, height: 32, fontWeight: 500 }}
            >
              <i className={`bi ${showGuide ? "bi-eye-slash-fill" : "bi-journal-text"}`} />
              {showGuide ? "Ẩn hướng dẫn" : "Xem hướng dẫn"}
            </button>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
        </div>

        <div className="offcanvas-body p-0 d-flex overflow-hidden flex-grow-1">
          {/* Left panel: Detailed Connection Guide */}
          {showGuide && (
            <div 
              className="border-end bg-light p-4 overflow-auto flex-grow-1" 
              style={{ 
                width: "50%", 
                minWidth: 400,
                animation: "fadeIn 0.2s ease-in-out"
              }}
            >
              <h6 className="fw-bold mb-3 text-primary d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                <i className="bi bi-book-half" /> HƯỚNG DẪN TỪNG BƯỚC
              </h6>

              <div className="d-flex flex-column gap-3">
                <div className="p-3 bg-white rounded-3 border shadow-sm">
                  <div className="d-flex gap-2.5 align-items-start">
                    <span className="badge rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, fontSize: 10, flexShrink: 0 }}>1</span>
                    <div>
                      <h6 className="fw-bold mb-1" style={{ fontSize: 12.5 }}>Đăng ký nhà phát triển</h6>
                      <p className="text-muted mb-2" style={{ fontSize: 11, lineHeight: 1.4 }}>
                        Truy cập cổng thông tin đối tác của Shopee để đăng ký tài khoản dev.
                      </p>
                      <a href="https://open.shopee.com" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-link p-0 fw-bold d-inline-flex align-items-center gap-1" style={{ fontSize: 11, color: "#003087" }}>
                        Đi đến open.shopee.com <i className="bi bi-box-arrow-up-right" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-3 border shadow-sm">
                  <div className="d-flex gap-2.5 align-items-start">
                    <span className="badge rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, fontSize: 10, flexShrink: 0 }}>2</span>
                    <div>
                      <h6 className="fw-bold mb-1" style={{ fontSize: 12.5 }}>Tạo Ứng dụng (App ID)</h6>
                      <p className="text-muted mb-0" style={{ fontSize: 11, lineHeight: 1.4 }}>
                        Đăng nhập vào Console &rarr; App List &rarr; Create App.
                      </p>
                      <ul className="text-muted ps-3 mb-0 mt-1.5" style={{ fontSize: 11, lineHeight: 1.4 }}>
                        <li>Chọn loại: <strong>Shop Partner App</strong> (nếu tự liên kết gian hàng).</li>
                        <li>Đợi Shopee phê duyệt app để nhận <strong>Partner ID</strong> và <strong>Partner Key</strong>.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-3 border shadow-sm">
                  <div className="d-flex gap-2.5 align-items-start">
                    <span className="badge rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, fontSize: 10, flexShrink: 0 }}>3</span>
                    <div>
                      <h6 className="fw-bold mb-1" style={{ fontSize: 12.5 }}>Lấy Shop ID gian hàng</h6>
                      <p className="text-muted mb-0" style={{ fontSize: 11, lineHeight: 1.4 }}>
                        Đăng nhập vào Kênh Người Bán <a href="https://banhang.shopee.vn" target="_blank" rel="noopener noreferrer" style={{ color: "#003087" }}>banhang.shopee.vn</a>.
                      </p>
                      <p className="text-muted mb-0 mt-1" style={{ fontSize: 11, lineHeight: 1.4 }}>
                        Vào <strong>Hồ sơ Shop</strong> &rarr; copy mã <strong>Shop ID</strong> hiển thị bên dưới Tên Shop (hoặc xem ID trên thanh địa chỉ URL).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-3 border shadow-sm">
                  <div className="d-flex gap-2.5 align-items-start">
                    <span className="badge rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, fontSize: 10, flexShrink: 0 }}>4</span>
                    <div>
                      <h6 className="fw-bold mb-1" style={{ fontSize: 12.5 }}>Cấu hình Redirect URL (Bắt buộc)</h6>
                      <p className="text-muted mb-1" style={{ fontSize: 11, lineHeight: 1.4 }}>
                        Trong ứng dụng Shopee Console, cấu hình đường dẫn Callback của bạn:
                      </p>
                      <div className="bg-light p-2 rounded border my-1.5 text-dark font-monospace text-break position-relative d-flex align-items-center justify-content-between gap-2" style={{ fontSize: 10, paddingRight: 50 }}>
                        <span className="user-select-all text-truncate">{formData.webhookUrl || "https://yourdomain.com/api/sales/omnichannel/webhook"}</span>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-secondary py-0 px-2 rounded"
                          style={{ fontSize: 9, height: 22, whiteSpace: "nowrap" }}
                          onClick={handleCopy}
                        >
                          <i className={`bi ${copied ? "bi-check-lg text-success" : "bi-clipboard"}`} /> {copied ? "Đã sao chép" : "Copy"}
                        </button>
                      </div>
                      <small className="text-warning-emphasis d-block" style={{ fontSize: 10.5 }}>
                        <i className="bi bi-exclamation-triangle" /> Shopee yêu cầu địa chỉ phải là giao thức bảo mật <strong>HTTPS</strong>.
                      </small>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-3 border shadow-sm">
                  <div className="d-flex gap-2.5 align-items-start">
                    <span className="badge rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, fontSize: 10, flexShrink: 0 }}>5</span>
                    <div>
                      <h6 className="fw-bold mb-1" style={{ fontSize: 12.5 }}>Nhập thông số & Ủy quyền</h6>
                      <p className="text-muted mb-0" style={{ fontSize: 11, lineHeight: 1.4 }}>
                        Điền các thông số bên cột phải và bấm <strong>Lưu cấu hình</strong>. Hệ thống sẽ tự động thực hiện luồng ủy quyền đăng nhập để kích hoạt đồng bộ đơn hàng.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right panel: Connection Form */}
          <div 
            className="p-4 overflow-auto flex-shrink-0" 
            style={{ 
              width: showGuide ? "50%" : "100%", 
              minWidth: 380,
              flexGrow: showGuide ? 0 : 1
            }}
          >
            {/* Dynamic Connection Status Section */}
            {!isConfigured ? (
              <div className="mb-4 p-3 rounded-4 border bg-light text-muted shadow-sm">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 bg-white rounded-circle d-flex align-items-center justify-content-center border" style={{ width: 32, height: 32 }}>
                    <i className="bi bi-exclamation-circle-fill text-warning" style={{ fontSize: 14 }} />
                  </div>
                  <div>
                    <p className="mb-0 fw-bold text-dark" style={{ fontSize: 13 }}>Trạng thái: <span className="text-secondary">Chưa kết nối</span></p>
                    <p className="mb-0 text-muted" style={{ fontSize: 11 }}>Vui lòng nhập đầy đủ thông số bên dưới để bắt đầu liên kết.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 rounded-4 border bg-success-subtle border-success-subtle shadow-sm" style={{ animation: "fadeIn 0.2s ease-in-out" }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 bg-white rounded-circle d-flex align-items-center justify-content-center shadow-xs" style={{ width: 32, height: 32 }}>
                    <i className="bi bi-shield-check text-success" style={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <p className="mb-0 fw-bold" style={{ fontSize: 13 }}>Kết nối: <span className="text-success">Hoạt động</span></p>
                    <p className="mb-0 text-muted" style={{ fontSize: 11 }}>Gian hàng: <strong className="text-dark">{formData.shopName || "Gian hàng Shopee"}</strong></p>
                  </div>
                </div>
              </div>
            )}

            <form id="shopee-config-form" onSubmit={(e) => { e.preventDefault(); onSuccess(formData); onClose(); }}>
              <div className="mb-4">
                <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông số Partner</label>
                
                <div className="mb-3">
                  <label className="form-label" style={labelStyle}>Partner ID <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập Partner ID từ Shopee..."
                    required
                    value={formData.partnerId}
                    onChange={e => setFormData({ ...formData, partnerId: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" style={labelStyle}>Partner Key <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    placeholder="Nhập Partner Key..."
                    required
                    rows={4}
                    value={formData.partnerKey}
                    onChange={e => setFormData({ ...formData, partnerKey: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold text-primary small text-uppercase mb-3" style={{ letterSpacing: 0.5 }}>Thông tin gian hàng</label>
                <div className="mb-3">
                  <label className="form-label" style={labelStyle}>Shop ID <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập ID gian hàng Shopee..."
                    required
                    value={formData.shopId}
                    onChange={e => setFormData({ ...formData, shopId: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" style={labelStyle}>Webhook URL <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://yourdomain.com/api/sales/omnichannel/webhook"
                    required
                    value={formData.webhookUrl}
                    onChange={e => setFormData({ ...formData, webhookUrl: e.target.value })}
                    style={inputStyle}
                  />
                  <small className="text-muted d-block mt-1" style={{ fontSize: 10.5 }}>
                    Dữ liệu Webhook URL này sẽ được tự động đồng bộ vào file cấu hình hệ thống <code>.env</code>.
                  </small>
                </div>
                <div className="p-3 bg-light rounded-3 border-start border-4 border-primary">
                  <p className="mb-0 text-muted" style={{ fontSize: 11, lineHeight: 1.4 }}>
                    <i className="bi bi-info-circle me-1" /> Sau khi lưu cấu hình, hệ thống sẽ tự động thực hiện luồng Ủy quyền (OAuth 2.0) với Shopee.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="offcanvas-footer p-3 border-top bg-light">
          <div className="d-flex gap-2">
            <BrandButton
              variant="outline"
              className="flex-grow-1 py-2"
              onClick={onClose}
              style={{ fontSize: 13 }}
            >
              Hủy bỏ
            </BrandButton>
            <BrandButton
              type="submit"
              form="shopee-config-form"
              className="flex-grow-1 py-2"
              style={{ fontSize: 13 }}
            >
              Lưu cấu hình
            </BrandButton>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}


