"use client";
import React from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "./BrandButton";

// ── Google Font ───────────────────────────────────────────────────────────────
const GOOGLE_FONT_URL = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Roboto+Condensed:wght@300;400;700&display=swap";

// ── Iframe-based print utility (exported for use in action buttons) ───────────
/**
 * In nội dung của element #documentId bằng cách copy innerHTML vào
 * một iframe ẩn rồi gọi iframe.contentWindow.print().
 *
 * Ưu điểm so với window.print() + CSS visibility trick:
 *  - Không bị giới hạn 1 trang (content chảy tự nhiên)
 *  - Không in kèm sidebar / topbar
 *  - Inline styles được giữ nguyên hoàn toàn
 */
export function printDocumentById(
  documentId: string,
  orientation: "portrait" | "landscape" = "portrait",
  title?: string,
  keepFirstPageMargin: boolean = true,
  customMargins?: string,
) {
  const docEl = globalThis.document?.getElementById(documentId);
  if (!docEl) { globalThis.window?.print(); return; }

  // Tạo iframe ẩn
  const iframe = globalThis.document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
  globalThis.document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iDoc) { globalThis.window?.print(); return; }

  const printMargin = customMargins || (orientation === "landscape" ? "15mm" : "20mm 20mm 20mm 25mm");

  iDoc.open();
  iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title ?? "In tài liệu"}</title>
  <link rel="stylesheet" href="${GOOGLE_FONT_URL}">
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <style>
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    th {
      background-color: #003087 !important;
      color: #fff !important;
    }
    .pdf-brand-bg {
      background-color: #003087 !important;
      color: #fff !important;
    }
    .pdf-brand-light-bg {
      background-color: rgba(0, 48, 135, 0.05) !important;
      color: #003087 !important;
    }
    .zebra-stripe {
      background-color: #f8fafc !important;
    }
    @page { 
      size: A4 ${orientation}; 
      margin: ${printMargin} !important; 
    }
    @page :first {
      margin: ${keepFirstPageMargin ? printMargin : "0"} !important;
    }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Roboto Condensed', 'Arial Narrow', sans-serif; 
      font-size: 13px; color: #000; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }
    .pdf-cover-page { 
      margin: 0 !important; 
      width: auto; 
      height: 297mm; 
      padding: 0 !important; 
      page-break-after: always; 
      position: relative; 
      overflow: hidden; 
      background: #ffffff !important; 
    }
    .pdf-content-page { 
      margin: 0 !important; 
      width: auto; 
      min-height: auto !important; 
      padding: 0 !important;
      page-break-after: always;
      position: relative;
      overflow: visible;
      background: #ffffff !important;
    }
    .pdf-content-page:last-child { page-break-after: auto !important; }
    .pdf-content-page > div[style*="absolute"][style*="bottom: 0"] { display: none !important; }
    .pdf-content-page > div { min-height: auto !important; padding-bottom: 0 !important; }
    .preview-scale-wrapper { transform: none !important; width: 100% !important; margin: 0 !important; }
    img { max-width: 100%; display: block; }
    table { border-collapse: collapse; width: 100%; }
    thead { display: table-header-group !important; }
    tr { page-break-inside: avoid !important; }
    .no-print { display: none !important; }
  </style>
</head>
<body>${docEl.innerHTML}</body>
</html>`);
  iDoc.close();

  // Đợi font + ảnh load xong rồi mới in
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Dọn dẹp sau khi hộp thoại in đóng (2s)
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 2000);
  }, 800);
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface PrintPreviewModalProps {
  /** Tiêu đề hiển thị trên topbar (dòng lớn) */
  title: string;
  /** Phụ đề topbar (dòng nhỏ, optional) */
  subtitle?: React.ReactNode;
  /** Nút hành động tùy chỉnh bên phải topbar (trước nút Đóng) */
  actions?: React.ReactNode;
  /** Nội dung sidebar trái (các trường tùy chỉnh) */
  sidebar?: React.ReactNode;
  /** Nội dung document A4 sẽ được in */
  document: React.ReactNode;
  /** Callback khi đóng */
  onClose: () => void;
  /** id của vùng document để print — mặc định "print-doc" */
  documentId?: string;
  /** Hướng in: 'portrait' (mặc định) | 'landscape' */
  printOrientation?: "portrait" | "landscape";
  /** Giữ lề cho trang đầu tiên (không reset về 0) */
  keepFirstPageMargin?: boolean;
  /** Tùy chỉnh lề in (CSS format: "top right bottom left") */
  printMargins?: string;
  /** Ẩn sidebar trên màn hình lớn (desktop) */
  hideSidebarOnDesktop?: boolean;
}

/**
 * PrintPreviewModal — khung xem trước in tái sử dụng.
 * Layout: topbar tối + sidebar (tùy chỉnh) + preview A4.
 * Dùng printDocumentById() để in (iframe-based, hỗ trợ nhiều trang).
 */
export function PrintPreviewModal({
  title,
  subtitle,
  actions,
  sidebar,
  document: documentContent,
  onClose,
  documentId = "print-doc",
  printOrientation = "portrait",
  keepFirstPageMargin = true,
  printMargins,
  hideSidebarOnDesktop = false,
}: PrintPreviewModalProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  const [showSidebar, setShowSidebar] = React.useState(false);

  // ESC to close
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    globalThis.document.addEventListener("keydown", h);
    return () => globalThis.document.removeEventListener("keydown", h);
  }, [onClose]);

  // Helper to convert print margin string to screen px padding
  const parseMarginToPx = (marginStr?: string): string | undefined => {
    if (!marginStr) return undefined;
    const parts = marginStr.trim().split(/\s+/);
    const pxParts = parts.map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) return p;
      if (p.endsWith("mm")) {
        return Math.round(num / 25.4 * 96) + "px";
      }
      if (p.endsWith("in")) {
        return Math.round(num * 96) + "px";
      }
      if (p.endsWith("cm")) {
        return Math.round(num / 2.54 * 96) + "px";
      }
      return p;
    });
    return pxParts.join(" ");
  };

  // Tùy chỉnh CSS cho khổ giấy hiển thị
  const isLandscape = printOrientation === "landscape";
  const pageWidth = isLandscape ? "1123px" : "794px";
  const pageHeight = isLandscape ? "794px" : "1123px";
  // Sync preview padding with print margins: Left 25mm=95px, Others 20mm=76px
  const previewPadding = parseMarginToPx(printMargins) || (isLandscape ? "38px" : "76px 76px 76px 95px");
  const printMargin = printMargins || (isLandscape ? "15mm" : "20mm 20mm 20mm 25mm");

  // Không cần @media print CSS nữa — dùng iframe approach
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={GOOGLE_FONT_URL} />
      <style dangerouslySetInnerHTML={{ __html: `
        #editor-action-items-section h4 {
          border-bottom: none !important;
          padding-bottom: 0 !important;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Apply negative margins neutralizing the preview document padding to simulate full bleed */
        /* Print layout classes for screen mode (mimicking pages) */
        .pdf-cover-page {
          width: ${pageWidth};
          height: ${pageHeight}; 
          background: #ffffff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        .pdf-content-page {
          width: ${pageWidth};
          min-height: ${pageHeight}; 
          background: #ffffff;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          padding: ${previewPadding}; /* Repeating standard A4 margins perfectly */
          position: relative;
          overflow: visible;
        }
        #plan-print-doc {
          background: transparent !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }
        #plan-print-doc .pdf-content-page, #plan-print-doc .pdf-cover-page {
          box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
          border: 1px solid #cbd5e1 !important;
        }
        .html2pdf__page-break {
          display: none !important;
        }
        
        .preview-topbar {
          padding: 10px 24px;
          background: var(--card);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-shrink: 0;
        }
        .preview-topbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }
        .preview-topbar-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: rgba(99,102,241,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .preview-topbar-title-box {
          flex: 1;
          min-width: 0;
        }
        .preview-topbar-title-text {
          margin: 0;
          font-weight: 700;
          font-size: 14px;
          color: var(--foreground);
        }
        .preview-topbar-subtitle-text {
          margin: 0;
          font-size: 11.5px;
          color: var(--muted-foreground);
        }
        .preview-topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .preview-scale-wrapper {
          transform-origin: top center;
          transform: scale(0.9);
        }
        @media (max-width: 1400px) {
          .preview-scale-wrapper { transform: scale(0.8); }
        }
        @media (max-width: 1200px) {
          .preview-scale-wrapper { transform: scale(0.7); }
        }
        
        /* ── iPad & Tablet Responsive for Print Preview Modal ── */
        @media (max-width: 1024px) {
          .preview-topbar {
            flex-direction: column !important;
            align-items: stretch !important;
            height: auto !important;
            padding: 12px 16px !important;
            gap: 12px !important;
          }
          .preview-topbar-left {
            width: 100% !important;
          }
          .preview-topbar-right {
            width: 100% !important;
            justify-content: space-between !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .preview-topbar-right > div {
            flex-wrap: wrap !important;
            gap: 8px !important;
            margin-right: 0 !important;
          }
          .preview-topbar-right button {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
          .preview-document-container {
            overflow-x: hidden !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .preview-scale-wrapper {
            transform: none !important;
            transform-origin: top center !important;
            width: 100% !important;
            max-width: 100% !important;
            gap: 0 !important;
          }
          .pdf-content-page {
            width: 100% !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
            padding: 16px !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
          }
        }
        @media (max-width: 767.98px) {
          .preview-topbar {
            padding: calc(6px + env(safe-area-inset-top, 0px)) 12px 6px 12px !important;
            gap: 8px !important;
          }
          .preview-topbar-title-text {
            font-size: 12px !important;
          }
          .preview-topbar-subtitle-text {
            font-size: 10px !important;
          }
          .preview-close-btn {
            height: 28px !important;
            padding: 0 8px !important;
            font-size: 11.5px !important;
          }
          .col-ky-nhan {
            display: none !important;
          }
          .lunch-print-header {
            display: none !important;
          }
          .col-phong-ban {
            display: none !important;
          }
          .lunch-print-title {
            font-size: 16px !important;
          }
          .total-row-desktop {
            display: none !important;
          }
          .total-row-mobile {
            display: table-row !important;
          }
        }

        .total-row-mobile {
          display: none;
        }

        @media print {
          .col-ky-nhan {
            display: table-cell !important;
          }
          .lunch-print-header {
            display: flex !important;
          }
          .col-phong-ban {
            display: table-cell !important;
          }
          .total-row-desktop {
            display: table-row !important;
          }
          .total-row-mobile {
            display: none !important;
          }
          @page { 
            size: A4 ${printOrientation}; 
            margin: ${printMargin} !important; 
          }
          @page :first {
            margin: ${keepFirstPageMargin ? printMargin : "0"} !important;
          }
          body { margin: 0; padding: 0; }
          .pdf-cover-page { 
            margin: 0 !important; 
            width: auto; 
            height: 297mm; 
            padding: 0 !important; 
            page-break-after: always; 
            box-shadow: none; 
            border: none;
            position: relative;
            overflow: hidden;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
          }
          .pdf-content-page { 
            margin: 0 !important;
            padding: 0 !important;
            width: auto; 
            min-height: auto !important; 
            page-break-after: always;
            box-shadow: none; 
            border: none;
            overflow: visible;
            background: #ffffff !important;
          }
          #plan-print-doc {
            background: #fff !important;
            display: block !important;
            gap: 0 !important;
          }
          #plan-print-doc .pdf-content-page, #plan-print-doc .pdf-cover-page {
            box-shadow: none !important;
            border: none !important;
          }
          .pdf-content-page:last-child { page-break-after: auto !important; }
          .pdf-content-page > div[style*="absolute"][style*="bottom: 0"] { display: none !important; }
          .pdf-content-page > div { min-height: auto !important; padding-bottom: 0 !important; }
          .preview-scale-wrapper { transform: none !important; }
          th {
            background-color: #003087 !important;
            color: #fff !important;
          }
          .pdf-brand-bg {
            background-color: #003087 !important;
            color: #fff !important;
          }
          .pdf-brand-light-bg {
            background-color: rgba(0, 48, 135, 0.05) !important;
            color: #003087 !important;
          }
          .zebra-stripe {
            background-color: #f8fafc !important;
          }
        }
      `}} />

      <div style={{
        position: "fixed", inset: 0, zIndex: 20000,
        background: "var(--muted)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif",
      }}>

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <div className="preview-topbar">
          <div className="preview-topbar-left">
            {/* Icon */}
            <div className="preview-topbar-icon">
              <i className="bi bi-printer-fill" style={{ fontSize: 16, color: "#818cf8" }} />
            </div>

            {/* Title */}
            <div className="preview-topbar-title-box">
              <p className="preview-topbar-title-text">{title}</p>
              {subtitle && (
                <p className="preview-topbar-subtitle-text">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Actions + Close */}
          <div className="preview-topbar-right">
            {sidebar && (
              <BrandButton
                variant="outline"
                onClick={() => setShowSidebar(!showSidebar)}
                className="preview-toggle-sidebar-btn"
                style={{
                  height: 32,
                  fontSize: 12.5,
                  padding: "0 12px",
                  background: showSidebar ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "var(--card)",
                  color: showSidebar ? "var(--primary)" : "var(--foreground)",
                  borderColor: showSidebar ? "var(--primary)" : "var(--border)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <i className="bi bi-sliders" />
                <span>{showSidebar ? "Ẩn tùy chỉnh" : "Tùy chỉnh"}</span>
              </BrandButton>
            )}
            {actions}
            <BrandButton
              variant="outline"
              onClick={onClose}
              className="preview-close-btn"
              style={{
                height: 32,
                fontSize: 12.5,
                padding: "0 16px",
                background: "var(--muted)",
                color: "var(--muted-foreground)",
                borderColor: "var(--border)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <i className="bi bi-x" style={{ fontSize: 16 }} />
              <span className="d-none d-md-inline">Đóng</span>
            </BrandButton>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar */}
          {sidebar && showSidebar && (
            <div 
              className={hideSidebarOnDesktop ? "d-lg-none" : ""}
              style={{
                width: 300, flexShrink: 0,
                background: "var(--card)",
                borderRight: "1px solid var(--border)",
                overflowY: "auto",
                padding: "20px 16px",
                display: "flex", flexDirection: "column", gap: 14,
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tuỳ chỉnh thông tin
              </p>
              {sidebar}
            </div>
          )}

          {/* Document preview area */}
          <div className="preview-document-container" style={{ flex: 1, overflowY: "auto", padding: "32px 0 64px 0", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <div id={documentId} className="preview-scale-wrapper" style={{
              display: "flex",
              flexDirection: "column",
              gap: 32, // Perfect shadowless gap between pages
              alignItems: "center",
              fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif",
              fontSize: 13,
              color: "#111",
              lineHeight: 1.45,
            }}>
              {documentContent}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, globalThis.document.body);
}

// ── Shared style helpers (export để các document dùng) ──────────────────────
export const printStyles = {
  secHead: {
    border: "1px solid #94a3b8",
    padding: "6px 10px",
    fontWeight: 700,
    fontSize: 12,
    background: "#f1f5f9",
    letterSpacing: "0.03em",
  } as React.CSSProperties,

  bodyCell: {
    border: "1px solid #cbd5e1",
    padding: "7px 10px",
    fontSize: 13.5,
  } as React.CSSProperties,

  sidebarInput: {
    width: "100%",
    padding: "7px 9px",
    border: "1px solid var(--border)",
    borderRadius: 6,
    background: "var(--background)",
    color: "var(--foreground)",
    fontSize: 12.5,
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  } as React.CSSProperties,
};
