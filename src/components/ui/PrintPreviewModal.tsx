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
  keepFirstPageMargin: boolean = false,
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
    * { box-sizing: border-box; }
    @page { 
      size: A4 ${orientation}; 
      margin: ${printMargin} !important; 
    }
    @page :first {
      margin: ${keepFirstPageMargin ? printMargin : "0"} !important;
    }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Open Sans', 'Arial', sans-serif; 
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
  keepFirstPageMargin = false,
  printMargins,
}: PrintPreviewModalProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // ESC to close
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    globalThis.document.addEventListener("keydown", h);
    return () => globalThis.document.removeEventListener("keydown", h);
  }, [onClose]);

  // Tùy chỉnh CSS cho khổ giấy hiển thị
  const isLandscape = printOrientation === "landscape";
  const pageWidth = isLandscape ? "1123px" : "794px";
  const pageHeight = isLandscape ? "794px" : "1123px";
  // Sync preview padding with print margins: Left 25mm=95px, Others 20mm=76px
  const previewPadding = isLandscape ? "38px" : "76px 76px 76px 95px";
  const printMargin = printMargins || (isLandscape ? "15mm" : "20mm 20mm 20mm 25mm");

  // Không cần @media print CSS nữa — dùng iframe approach
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={GOOGLE_FONT_URL} />
      <style dangerouslySetInnerHTML={{ __html: `
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

        @media print {
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
          .pdf-content-page:last-child { page-break-after: auto !important; }
          .pdf-content-page > div[style*="absolute"][style*="bottom: 0"] { display: none !important; }
          .pdf-content-page > div { min-height: auto !important; padding-bottom: 0 !important; }
          .preview-scale-wrapper { transform: none !important; }
        }
      `}} />

      <div style={{
        position: "fixed", inset: 0, zIndex: 6000,
        background: "var(--muted)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Open Sans', sans-serif",
      }}>

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <div style={{
          padding: "10px 24px",
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 16,
          flexShrink: 0,
        }}>
          {/* Icon */}
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-printer-fill" style={{ fontSize: 16, color: "#818cf8" }} />
          </div>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--foreground)" }}>{title}</p>
            {subtitle && (
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>{subtitle}</p>
            )}
          </div>

          {/* Actions + Close */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {actions}
            <BrandButton
              variant="outline"
              onClick={onClose}
              style={{
                height: 32,
                fontSize: 12.5,
                padding: "0 16px",
                background: "var(--muted)",
                color: "var(--muted-foreground)",
                borderColor: "var(--border)"
              }}
            >
              <i className="bi bi-x" style={{ fontSize: 16 }} /> Đóng
            </BrandButton>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar */}
          {sidebar && (
            <div style={{
              width: 270, flexShrink: 0,
              background: "var(--card)",
              borderRight: "1px solid var(--border)",
              overflowY: "auto",
              padding: "20px 16px",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tuỳ chỉnh thông tin
              </p>
              {sidebar}
            </div>
          )}

          {/* Document preview area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 0 64px 0", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <div id={documentId} className="preview-scale-wrapper" style={{
              display: "flex",
              flexDirection: "column",
              gap: 32, // Perfect shadowless gap between pages
              alignItems: "center",
              fontFamily: "'Open Sans', sans-serif",
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
