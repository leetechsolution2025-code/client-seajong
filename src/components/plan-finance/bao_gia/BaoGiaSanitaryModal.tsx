"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { TrangThaiTonKhoBadge } from "@/components/plan-finance/dung_chung/TrangThaiTonKhoBadge";
import { genDocCode } from "@/lib/genDocCode";

// ── Types ─────────────────────────────────────────────────────────────────────
export type CustomerRow = {
  id: string; name: string; nhom: string | null; nguon: string | null;
  dienThoai: string | null; email: string | null;
  address: string | null; daiDien: string | null; xungHo: string | null;
  chucVu: string | null; ghiChu: string | null;
  nguoiChamSoc: { id: string; fullName: string } | null;
  nguoiChamSocId: string | null;
  createdAt: string;
};

export type QuoteItem = {
  id: number; ten: string; dvt: string; soLuong: number;
  donGia: number; ckPct: number; soLuongTon: number | null;
  trangThaiKho: string | null; inventoryId: string | null;
  viTri?: string;
  viTriChiTiet?: string;
  giaDaiLy?: number;
  imageUrl?: string | null;
  code?: string | null;
};

export interface QuotationEditData {
  id: string;
  code: string | null;
  ngayBaoGia: string | null;
  ngayHetHan: string | null;
  trangThai: string;
  uuTien: string;
  discount?: number | null;
  vat?: number | null;
  chiPhiThiCong?: number | null;
  tongTien?: number | null;
  thanhTien?: number | null;
  ghiChu?: string | null;
  quoteType?: string | null;
  file3DUrl?: string | null;
  fileDetailUrl?: string | null;
  fileLayoutUrl?: string | null;
  items?: Array<{
    tenHang: string; donVi?: string;
    soLuong?: number; donGia?: number; thanhTien?: number;
    ghiChu?: string | null;
  }>;
}

// ── Helper: số → chữ (VND) ─────────────────────────────────────────────────
export function numberToVNWords(n: number): string {
  if (n === 0) return "Không đồng";
  const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const teens = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
  function readHundred(h: number): string {
    const c = Math.floor(h / 100), t = Math.floor((h % 100) / 10), u = h % 10;
    let r = c > 0 ? ones[c] + " trăm" : "";
    if (t === 1) r += (r ? " " : "") + teens[u];
    else if (t > 1) r += (r ? " " : "") + ones[t] + " mươi" + (u > 0 ? " " + (u === 5 ? "lăm" : ones[u]) : "");
    else if (u > 0 && c > 0) r += " lẻ " + ones[u];
    else if (u > 0) r += ones[u];
    return r;
  }
  const groups = [
    { v: 1_000_000_000, s: "tỷ" }, { v: 1_000_000, s: "triệu" },
    { v: 1_000, s: "nghìn" }, { v: 1, s: "" },
  ];
  let result = "", num = Math.round(n);
  for (const g of groups) {
    const q = Math.floor(num / g.v);
    if (q > 0) {
      result += (result ? " " : "") + readHundred(q) + (g.s ? " " + g.s : "");
      num %= g.v;
    }
  }
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

export function parseGuestInfo(ghiChu: string | null | undefined): { name: string; dienThoai: string; address: string } | null {
  if (!ghiChu) return null;
  const match = ghiChu.match(/\[GuestInfo:(.*?)\]/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function cleanGhiChu(ghiChu: string | null | undefined): string {
  if (!ghiChu) return "";
  return ghiChu.replace(/\[GuestInfo:(.*?)\]\n?/, "").trim();
}

export function getDefaultGhiChu(ngayLapStr: string | null | undefined, hieuLucStr: string | null | undefined, thue?: number): string {
  let diffDays = 30;
  if (ngayLapStr && hieuLucStr) {
    const d1 = new Date(ngayLapStr);
    const d2 = new Date(hieuLucStr);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffTime = d2.getTime() - d1.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }
  const vatText = (thue !== undefined && thue > 0) ? "đã bao gồm thuế GTGT" : "chưa bao gồm thuế GTGT";
  return `- Giá trị báo giá trên đã bao gồm phí vận chuyển và ${vatText}\n` +
    `- Trong mọi trường hợp khi Quý khách hàng hủy đơn hàng sẽ không được hoàn trả tiền cọc.\n` +
    `- Báo giá này có hiệu lực trong vòng ${diffDays} ngày kể từ ngày ban hành. Sau thời gian này, nếu Quý khách hàng chưa đặt cọc và giá sản phẩm có thay đổi sẽ áp dụng mức giá mới tại thời điểm Quý khách hàng tiến hành đặt cọc. Từ thời điểm hoàn tất đặt cọc đến khi nhận hàng, nếu giá sản phẩm có sự điều chỉnh tăng do các yếu tố như chi phí sản xuất, logistics hoặc chính sách nhà nước,…chúng tôi cam kết giữ nguyên mức giá đã thỏa thuận. Ngược lại, nếu giá sản phẩm giảm sẽ điều chỉnh và áp dụng mức giá đúng tại thời điểm nhận hàng.`;
}


// ── Privates helpers/styles ──────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: "100%", padding: "7px 10px", border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)",
  fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit",
  transition: "border-color 0.15s",
};
const FLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
    {text}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
  </label>
);

// ── Print Preview Modal ─────────────────────────────────────────────────────
function PrintPreviewModal({ open, onClose, customer, items, info, initialAction }: any) {
  const { data: session } = useSession();
  const toast = useToast();
  const [landscape, setLandscape] = React.useState(false);
  const [company, setCompany] = React.useState<any>({});
  const [pdfUploading, setPdfUploading] = React.useState(false);
  const isSanitary = true;
  const [showStamp, setShowStamp] = React.useState(true);

  // **Blank Print Preview Fix**:
  // - The previous print CSS hidden all elements on the page except `#print-preview-root` via `body > *:not(#print-preview-root) { display: none !important; }`. However, since the react app root is the parent of the preview element, it was set to `display: none`, making the print dialog blank.
  // - Replaced it with standard `visibility: hidden` rules on `body` and `visibility: visible` on `#print-preview-root` and its children, placing it absolute-positioned over the page flow. This ensures the quotation document is printed properly with correct styling and multiple page flow.

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/company").then(r => r.json()).then(setCompany).catch(() => { });
  }, [open]);

  React.useEffect(() => {
    if (!open || !initialAction) return;
    const timer = setTimeout(() => {
      if (initialAction === "print") {
        handlePrint();
      } else if (initialAction === "pdf") {
        handleExportPDF().finally(() => {
          onClose();
        });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [open, initialAction]);

  if (!open) return null;

  const isCoQuayKe = info.quoteType === "Có quầy kệ" && isSanitary;
  const uniqueAreas = Array.from(new Set(items.filter((it: any) => it.ten).map((it: any) => {
    if (it.viTri) return it.viTri;
    try {
      if (it.ghiChu) {
        const parsed = JSON.parse(it.ghiChu);
        return parsed.viTri || parsed.khuVuc || "Khu vực 1";
      }
    } catch (e) { }
    return "Khu vực 1";
  })));
  const hasMultipleAreas = isCoQuayKe && uniqueAreas.length > 1;
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const thanhTien = (it: any) => isCoQuayKe ? (it.giaDaiLy ?? it.thanhTien ?? 0) : it.soLuong * it.donGia * (1 - it.ckPct / 100);
  const tamTinh = items.reduce((s: any, it: any) => s + thanhTien(it), 0);
  const ckTien = tamTinh * info.chietKhauTong / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.thue / 100;
  const chiPhiThiCong = info.chiPhiThiCong ?? 0;
  const tongCong = truocThue + thueTien + (isCoQuayKe ? chiPhiThiCong : 0);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")} tháng ${String(d.getMonth() + 1).padStart(2, "0")} năm ${d.getFullYear()}`;
  };

  const paperW = landscape ? 297 : 210;
  const paperH = landscape ? 210 : 297;
  const handlePrint = () => {
    const docEl = document.getElementById("print-paper-doc");
    if (!docEl) { window.print(); return; }

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    document.body.appendChild(iframe);

    const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iDoc) { window.print(); return; }

    iDoc.open();
    iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Báo giá ${info.soPhieu || ""}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap">
  <style>
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    @page { 
      size: A4 ${landscape ? "landscape" : "portrait"}; 
      margin: 0 !important; 
    }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Roboto Condensed', Arial Narrow, Arial, sans-serif; 
      font-size: 10px; color: #111; 
      background: #fff;
    }
    .print-cover {
      width: ${landscape ? "297mm" : "210mm"} !important;
      height: ${landscape ? "210mm" : "297mm"} !important;
      page-break-after: always !important;
      break-after: page !important;
      background: #fff !important;
      padding: 20mm 20mm 20mm 30mm !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }
    .print-letter {
      width: ${landscape ? "297mm" : "210mm"} !important;
      height: ${landscape ? "210mm" : "297mm"} !important;
      page-break-after: always !important;
      break-after: page !important;
      background: #fff !important;
      padding: 20mm 20mm 20mm 30mm !important;
      box-sizing: border-box !important;
    }
    .print-details {
      width: ${landscape ? "297mm" : "210mm"} !important;
      min-height: ${landscape ? "210mm" : "297mm"} !important;
      background: #fff !important;
      padding: 14mm 15mm !important;
      box-sizing: border-box !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background-color: #003087 !important;
      color: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>
  ${docEl.innerHTML}
</body>
</html>`);
    iDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }, 600);
  };
  const handleExportPDF = async () => {
    if (pdfUploading) return;
    setPdfUploading(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("print-paper-doc") as HTMLElement;
      if (!element) {
        toast.error("Lỗi", "Không tìm thấy nội dung báo giá");
        setPdfUploading(false);
        return;
      }

      const originalGap = element.style.gap;
      element.style.gap = "0";

      const pages = element.querySelectorAll(".print-paper") as NodeListOf<HTMLElement>;
      const originalShadows: string[] = [];
      pages.forEach((page, idx) => {
        originalShadows[idx] = page.style.boxShadow;
        page.style.boxShadow = "none";
      });

      const opt = {
        margin: 0,
        filename: `Bao_gia_${info.soPhieu || "Sanitary"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: (landscape ? "landscape" : "portrait") as "landscape" | "portrait" },
        pagebreak: { mode: ['avoid-all', 'css'] }
      };

      const pdfBlob = (await html2pdf().set(opt).from(element).output("blob")) as Blob;

      element.style.gap = originalGap;
      pages.forEach((page, idx) => {
        page.style.boxShadow = originalShadows[idx];
      });

      const foldersRes = await fetch("/api/media-library/folders");
      if (!foldersRes.ok) {
        throw new Error("Không thể kết nối thư viện tài liệu");
      }
      const foldersData = await foldersRes.json();
      const foldersList = foldersData.data || [];

      const currentUserId = (session?.user as any)?.id;
      const currentUserName = (session?.user as any)?.name;
      const currentUserDept = (session?.user as any)?.departmentCode || "ALL";

      if (!currentUserId) {
        throw new Error("Không xác thực được tài khoản của bạn. Vui lòng đăng nhập lại.");
      }

      let userFolder = foldersList.find(
        (f: any) => f.ownerId === currentUserId && f.parentId === null && !f.isPublic
      );

      if (!userFolder) {
        const initRes = await fetch("/api/media-library/init-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            userId: currentUserId,
            userName: currentUserName,
            departmentCode: currentUserDept,
          }),
        });

        if (!initRes.ok) {
          throw new Error("Khởi tạo thư mục tài liệu cá nhân thất bại");
        }

        const refetchRes = await fetch("/api/media-library/folders");
        if (!refetchRes.ok) {
          throw new Error("Không thể đồng bộ thư mục sau khi tạo mới");
        }
        const refetchedData = await refetchRes.json();
        const refetchedList = refetchedData.data || [];
        userFolder = refetchedList.find(
          (f: any) => f.ownerId === currentUserId && f.parentId === null && !f.isPublic
        );

        if (!userFolder) {
          throw new Error("Không tìm thấy thư mục cá nhân sau khi khởi tạo tự động");
        }
      }

      const fileName = `Bao_gia_${info.soPhieu || "Sanitary"}.pdf`;
      const fileToUpload = new File([pdfBlob], fileName, { type: "application/pdf" });

      const fd = new FormData();
      fd.append("file", fileToUpload);
      fd.append("folderId", userFolder.id);
      fd.append("name", fileName);
      fd.append("description", `Báo giá sản phẩm thiết bị vệ sinh số ${info.soPhieu || ""}`);
      fd.append("type", "template");
      fd.append("channel", "all");
      fd.append("isPublic", "false");

      const uploadRes = await fetch("/api/media-library/assets", {
        method: "POST",
        body: fd,
      });

      const uploadResult = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(uploadResult?.error || `Upload thất bại: ${uploadRes.status}`);
      }

      toast.success("Thành công", `Đã lưu báo giá trực tiếp vào Thư viện tài liệu của ${currentUserName}`);
    } catch (error: any) {
      console.error("Lỗi khi lưu vào thư viện:", error);
      toast.error("Lỗi", error.message || "Không thể lưu báo giá vào thư viện");
    } finally {
      setPdfUploading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap');
        @media print {
          @page {
            size: A4 ${landscape ? "landscape" : "portrait"} !important;
            margin: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
          #__next, main, div, section {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          body {
            visibility: hidden !important;
            background: #fff !important;
          }
          #print-preview-root, #print-preview-root * {
            visibility: visible !important;
          }
          #print-preview-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #fff !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-paper {
            box-shadow: none !important;
            margin: 0 !important;
            display: block !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          .print-cover {
            width: ${landscape ? "297mm" : "210mm"} !important;
            height: ${landscape ? "210mm" : "297mm"} !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 20mm 20mm 20mm 30mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
          .print-letter {
            width: ${landscape ? "297mm" : "210mm"} !important;
            height: ${landscape ? "210mm" : "297mm"} !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 20mm 20mm 20mm 30mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
          .print-details {
            width: ${landscape ? "297mm" : "210mm"} !important;
            min-height: ${landscape ? "210mm" : "297mm"} !important;
            padding: 14mm 15mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
          .print-drawings {
            width: ${landscape ? "297mm" : "210mm"} !important;
            height: ${landscape ? "210mm" : "297mm"} !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 20mm 20mm 20mm 30mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
        }
        
        /* Force general text to black on simulated A4 paper pages (both on screen and print) */
        #print-preview-root .print-paper p,
        #print-preview-root .print-paper td,
        #print-preview-root .print-paper div,
        #print-preview-root .print-paper span,
        #print-preview-root .print-paper strong,
        #print-preview-root .print-paper a,
        #print-preview-root .print-paper li {
          color: #000 !important;
        }
        /* Keep table header text white */
        #print-preview-root .print-paper th,
        #print-preview-root .print-paper th * {
          color: #fff !important;
        }
        /* Keep primary blue branding text */
        #print-preview-root .print-paper [style*="color: #003087"],
        #print-preview-root .print-paper [style*="color:#003087"],
        #print-preview-root .print-paper [style*="color: rgb(0, 48, 135)"],
        #print-preview-root .print-paper [style*="color:rgb(0,48,135)"],
        #print-preview-root .print-paper [style*="color: #003087"] *,
        #print-preview-root .print-paper [style*="color:#003087"] *,
        #print-preview-root .print-paper [style*="color: rgb(0, 48, 135)"] *,
        #print-preview-root .print-paper [style*="color:rgb(0,48,135)"] * {
          color: #003087 !important;
        }
      `}</style>
      <div id="print-preview-root" style={initialAction === "pdf" ? { position: "absolute", left: "-9999px", top: "-9999px", width: "1000px", height: "auto", overflow: "hidden" } : { position: "fixed", inset: 0, zIndex: 4000, background: "#e8eaed", display: "flex", flexDirection: "column" }}>
        <div className="no-print" style={{ height: 52, background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Xem trước báo giá</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d1d5db", fontSize: 13 }}>
              <span>Khổ giấy:</span>
              {(["Dọc", "Ngang"] as const).map((label, i) => (
                <button key={label} onClick={() => setLandscape(i === 1)}
                  style={{
                    padding: "4px 12px", border: "1px solid", borderRadius: i === 0 ? "6px 0 0 6px" : "0 6px 6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: landscape === (i === 1) ? "#003087" : "transparent",
                    borderColor: "#4b5563", color: landscape === (i === 1) ? "#fff" : "#9ca3af",
                  }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d1d5db", fontSize: 13, marginLeft: 8, marginRight: 8 }}>
              <span>Con dấu:</span>
              <div
                onClick={() => setShowStamp(!showStamp)}
                style={{
                  width: 38,
                  height: 20,
                  borderRadius: 10,
                  background: showStamp ? "#003087" : "#4b5563",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: showStamp ? 20 : 2,
                    transition: "left 0.2s"
                  }}
                />
              </div>
            </div>
            <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #4b5563", background: "transparent", color: "#d1d5db", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Đóng</button>
            <button onClick={handlePrint} style={{ padding: "6px 18px", border: "none", background: "#003087", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-printer" style={{ fontSize: 13 }} /> In
            </button>
            <button onClick={handleExportPDF} disabled={pdfUploading} style={{ padding: "6px 18px", border: "none", background: pdfUploading ? "#6b7280" : "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: pdfUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {pdfUploading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: 13, height: 13, borderWidth: "2px" }} />
                  <span>Đang xuất...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-pdf" style={{ fontSize: 13 }} />
                  <span>Xuất PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="print-preview-container" style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "32px 24px" }}>
          <div id="print-paper-doc" style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
            {/* Trang bìa cho báo giá đối tác/đại lý (Có quầy kệ) */}
            {isCoQuayKe && (
              <div className="print-paper print-cover" style={{
                width: `${paperW}mm`,
                height: `${paperH}mm`,
                background: "#fff",
                boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
                padding: "20mm 20mm 20mm 30mm",
                boxSizing: "border-box",
                fontSize: 10,
                lineHeight: 1.5,
                fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
                color: "#111",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                pageBreakAfter: "always",
                breakAfter: "page"
              }}>
                {/* Header: Logo & Tên thương hiệu */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain" }} />}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12, color: "#003087", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {company.name || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
                    </div>
                    <div style={{ fontSize: 9, color: "#6b7280" }}>
                      Thương hiệu Thiết bị vệ sinh & Nhà bếp cao cấp
                    </div>
                  </div>
                </div>

                {/* Banner hình ảnh bìa */}
                <div style={{ width: "100%", textAlign: "center" }}>
                  <img
                    src="/seajong_cover.png"
                    alt="Sejong Cover"
                    style={{
                      width: "100%",
                      height: landscape ? "85mm" : "120mm",
                      objectFit: "cover",
                      borderRadius: 8,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.12)"
                    }}
                  />
                </div>

                {/* Tiêu đề chính */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#003087", letterSpacing: 1, textTransform: "uppercase" }}>
                    HỒ SƠ BÁO GIÁ
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", marginTop: 4, letterSpacing: 0.5 }}>
                    Dự án quầy kệ trưng bày thiết bị vệ sinh Sejong
                  </div>
                </div>

                {/* Thông tin đối tác & Báo giá */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, borderTop: "2px solid #003087", paddingTop: 15, fontSize: 11 }}>
                  <div>
                    <div style={{ color: "#6b7280", fontWeight: 700, fontSize: 9, textTransform: "uppercase", marginBottom: 3 }}>
                      Khách hàng / Đối tác
                    </div>
                    <div style={{ fontWeight: 800, color: "#111", fontSize: 13 }}>
                      {customer?.name ?? "—"}
                    </div>
                    {customer?.address && (
                      <div style={{ color: "#374151", marginTop: 3 }}>
                        Địa chỉ: {customer.address}
                      </div>
                    )}
                    {customer?.daiDien && (
                      <div style={{ color: "#374151", marginTop: customer?.address ? 0 : 3 }}>
                        Đại diện: {customer.xungHo ?? ""} {customer.daiDien}
                      </div>
                    )}
                    {customer?.dienThoai && (
                      <div style={{ color: "#374151" }}>
                        Điện thoại: {customer.dienThoai}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ color: "#6b7280", fontWeight: 700, fontSize: 9, textTransform: "uppercase", marginBottom: 3 }}>
                      Thông tin hồ sơ
                    </div>
                    <div style={{ fontWeight: 800, color: "#003087", fontSize: 13 }}>
                      Số: {info.soPhieu}
                    </div>
                    <div style={{ color: "#374151", marginTop: 3 }}>
                      Ngày lập: {fmtDate(info.ngayLap)}
                    </div>
                    <div style={{ color: "#374151" }}>
                      Hiệu lực: {fmtDate(info.hieuLuc)}
                    </div>
                  </div>
                </div>

                {/* Footer chân trang */}
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: "#9ca3af" }}>
                  <div>Website: www.seajong.com</div>
                  <div>Hotline: {(company.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()}</div>
                </div>
              </div>
            )}

            {/* Page 2: Thư ngỏ cho báo giá đối tác/đại lý (Có quầy kệ) */}
            {isCoQuayKe && (
              <div className="print-paper print-letter" style={{
                width: `${paperW}mm`,
                height: `${paperH}mm`,
                background: "#fff",
                boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
                padding: "20mm 20mm 20mm 30mm",
                boxSizing: "border-box",
                fontSize: 11,
                lineHeight: 1.45,
                fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
                color: "#111",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                pageBreakAfter: "always",
                breakAfter: "page"
              }}>
                {/* Top decorative bar */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "5px",
                  background: "linear-gradient(90deg, #003087 0%, #0056b3 100%)"
                }} />

                <div>
                  {/* Header: Logo and Brand Info */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", borderBottom: "1.5px solid #003087", paddingBottom: "8px", marginBottom: "12px" }}>
                    {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ height: "36px", width: "auto", objectFit: "contain" }} />}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "11px", color: "#003087", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {company.name || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
                      </div>
                      <div style={{ fontSize: "8.5px", color: "#6b7280" }}>
                        Thương hiệu Thiết bị vệ sinh & Nhà bếp cao cấp Hàn Quốc
                      </div>
                    </div>
                  </div>

                  {/* Title of Letter */}
                  <div style={{ textAlign: "center", margin: "8px 0 12px 0" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#003087", letterSpacing: "1px", textTransform: "uppercase" }}>
                      THƯ MỜI HỢP TÁC KINH DOANH
                    </div>
                    <div style={{ fontSize: "9.5px", color: "#4b5563", fontStyle: "italic", marginTop: "2px" }}>
                      (V/v: Hợp tác Phát triển Đại lý / Nhà phân phối thiết bị vệ sinh Sejong)
                    </div>
                    <div style={{ width: "40px", height: "2px", background: "#003087", margin: "6px auto 0" }} />
                  </div>

                  {/* Salutation */}
                  <p style={{ margin: "0 0 8px 0", fontSize: "11px" }}>
                    <strong>Kính gửi: Quý Đối tác / Quý Khách hàng,</strong>
                  </p>

                  {/* Body Text */}
                  <div style={{ textAlign: "justify", fontSize: "11px", color: "#374151" }}>
                    <p style={{ margin: "0 0 6px 0" }}>
                      Lời đầu tiên, Ban lãnh đạo cùng toàn thể đội ngũ <strong>{company.name || "Sejong Faucet Việt Nam"}</strong> xin gửi lời chào trân trọng, lời chúc sức khỏe và lời chúc cho hoạt động kinh doanh của Quý đối tác ngày càng phát triển thịnh vượng.
                    </p>
                    <p style={{ margin: "0 0 6px 0" }}>
                      <strong>{company.name || "Sejong Faucet Việt Nam"}</strong> là đơn vị phân phối chính hãng các dòng sản phẩm thiết bị vệ sinh và phòng tắm cao cấp mang thương hiệu Hàn Quốc. Với nhiều năm kinh nghiệm trên thị trường, chúng tôi tự hào mang đến những dòng sản phẩm sở hữu công nghệ đột phá, thiết kế dẫn đầu xu hướng và độ bền vượt trội, đã và đang được hàng triệu người tiêu dùng, chủ thầu tin tưởng lựa chọn.
                    </p>
                    <p style={{ margin: "0 0 6px 0" }}>
                      Với mục tiêu mở rộng mạng lưới phân phối và mang những sản phẩm chất lượng đến gần hơn với khách hàng trên toàn quốc, chúng tôi trân trọng gửi lời mời hợp tác kinh doanh đến Quý đối tác với vai trò là Đại lý chính thức.
                    </p>
                    <p style={{ margin: "0 0 10px 0" }}>
                      Chúng tôi xin gửi kèm theo thư này Bảng báo giá sản phẩm dành riêng cho Đại lý cùng Chính sách chiết khấu thương mại mới nhất năm 2026.
                    </p>

                    {/* Bullet Points of Advantages (Beautiful Cards layout) */}
                    <div style={{ fontWeight: 800, fontSize: "11px", color: "#003087", marginBottom: "6px", borderLeft: "3px solid #003087", paddingLeft: "6px" }}>
                      NHỮNG ĐẶC QUYỀN VÀ CHÍNH SÁCH HỖ TRỢ TỐI ƯU DÀNH CHO ĐẠI LÝ:
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
                      {[
                        {
                          title: "Chính sách giá & Chiết khấu hấp dẫn",
                          desc: "Mức chiết khấu cao, cạnh tranh bậc nhất thị trường, đảm bảo biên độ lợi nhuận tối ưu và bền vững cho Đại lý. Có thưởng doanh số tháng/quý/năm cực kỳ linh hoạt.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
                          )
                        },
                        {
                          title: "Sản phẩm chất lượng – Nguồn hàng ổn định",
                          desc: "Sản phẩm có đầy đủ chứng nhận chất lượng (CO, CQ, ISO...), mẫu mã đa dạng, đón đầu xu hướng tiêu dùng. Kho hàng lớn, cam kết cung ứng kịp thời, không làm gián đoạn việc kinh doanh của Đại lý.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 11 2 2 4-4"></path></svg>
                          )
                        },
                        {
                          title: "Hỗ trợ truyền thông và Marketing",
                          desc: "Được hỗ trợ hình ảnh, video, catalogue, standee, biển bảng và tài liệu kỹ thuật. Công ty hỗ trợ đẩy data khách hàng khu vực trực tiếp về cho Đại lý.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m3 11 18-5v12L3 13v-2z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>
                          )
                        },
                        {
                          title: "Hỗ trợ đào tạo & Kỹ thuật",
                          desc: "Đội ngũ chuyên gia của chúng tôi sẽ đào tạo miễn phí về kiến thức sản phẩm, kỹ năng tư vấn chốt sales và hỗ trợ kỹ thuật lắp đặt 24/7.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                          )
                        },
                        {
                          title: "Chính sách bảo hành và Hậu mãi dẫn đầu",
                          desc: "Cam kết bảo hành chính hãng nhanh chóng, thủ tục đổi trả linh hoạt đối với các sản phẩm lỗi từ nhà sản xuất, bảo vệ uy tín tối đa cho Đại lý trước người tiêu dùng.",
                          icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                          )
                        }
                      ].map((item, index) => (
                        <div key={index} style={{
                          background: "#f8fafc",
                          padding: "5px 10px",
                          borderRadius: "4px"
                        }}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "2px" }}>
                            {item.icon}
                            <div style={{ fontWeight: 700, color: "#003087", fontSize: "11px" }}>
                              {index + 1}. {item.title}
                            </div>
                          </div>
                          <div style={{ fontSize: "11px", color: "#475569", lineHeight: 1.35, paddingLeft: "21px" }}>
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p style={{ margin: "0 0 6px 0" }}>
                      Chúng tôi tôn trọng triết lý kinh doanh <strong>"Hợp tác cùng phát triển – Chia sẻ thành công"</strong>. Chúng tôi tin tưởng rằng, sự nhạy bén trong kinh doanh của Quý đối tác kết hợp với chất lượng sản phẩm và chính sách vượt trội của chúng tôi sẽ tạo nên một bước bứt phá doanh thu mạnh mẽ cho cả hai bên.
                    </p>
                    <p style={{ margin: "0" }}>
                      Một lần nữa, xin chân thành cảm ơn sự quan tâm của Quý đối tác. Kính chúc mối quan hệ hợp tác của chúng ta sớm được thiết lập và gặt hái nhiều thành công rực rỡ!
                    </p>

                    {/* Representative signature block */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                      <div style={{ textAlign: "center", minWidth: "150px" }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "11px", color: "#374151" }}>Trân trọng,</p>
                        <div style={{ height: "40px" }} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "11px", color: "#003087" }}>{company.legalRep || "ĐẠI DIỆN SEJONG"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with hotline only */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e7eb", paddingTop: "8px", marginTop: "10px" }}>
                  <div style={{ fontSize: "8.5px", color: "#9ca3af" }}>
                    Website: www.seajong.com | Hotline: {(company.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()}
                  </div>
                </div>
              </div>
            )}

            {/* Page 3: Bản vẽ đính kèm */}
            {(() => {
              const drawingsList = [
                { label: "Bản vẽ 3D", url: info.file3DUrl },
                { label: "Bản vẽ chi tiết", url: info.fileDetailUrl },
                { label: "Bản vẽ mặt bằng", url: info.fileLayoutUrl }
              ].filter(d => d.url);

              if (!isCoQuayKe || drawingsList.length === 0) return null;

              return (
                <div className="print-paper print-drawings" style={{
                  width: `${paperW}mm`,
                  height: `${paperH}mm`,
                  background: "#fff",
                  boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
                  padding: "20mm 20mm 20mm 30mm",
                  boxSizing: "border-box",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "'Roboto Condensed', sans-serif"
                }}>
                  {/* Top decorative bar */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "5px",
                    background: "linear-gradient(90deg, #003087 0%, #0056b3 100%)"
                  }} />

                  {/* Header: Logo and Brand Info */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #003087", paddingBottom: "8px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ height: "36px", width: "auto", objectFit: "contain" }} />}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "11px", color: "#003087", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {company.name || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
                        </div>
                        <div style={{ fontSize: "8.5px", color: "#6b7280" }}>
                          Thương hiệu Thiết bị vệ sinh & Nhà bếp cao cấp Hàn Quốc
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#003087", letterSpacing: "1px", textTransform: "uppercase" }}>BẢN VẼ ĐÍNH KÈM</div>
                      <div style={{ fontSize: "9.5px", color: "#374151", fontStyle: "italic", marginTop: "2px" }}>Số báo giá: {info.soPhieu}</div>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "15px" }}>
                    {drawingsList.length === 1 && (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#003087", marginBottom: "4px", textTransform: "uppercase" }}>{drawingsList[0].label}</div>
                        <img src={drawingsList[0].url} alt={drawingsList[0].label} style={{ maxWidth: "100%", maxHeight: "190mm", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: "4px" }} />
                      </div>
                    )}

                    {drawingsList.length === 2 && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", flex: 1, alignItems: "center" }}>
                        {drawingsList.map(d => (
                          <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "#003087", marginBottom: "4px", textTransform: "uppercase" }}>{d.label}</div>
                            <img src={d.url} alt={d.label} style={{ maxWidth: "100%", maxHeight: "170mm", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: "4px" }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {drawingsList.length === 3 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "15px", flex: 1, justifyContent: "space-between" }}>
                        {/* Top row: 3D drawing taking full width */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "48%" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#003087", marginBottom: "3px", textTransform: "uppercase" }}>{drawingsList[0].label}</div>
                          <img src={drawingsList[0].url} alt={drawingsList[0].label} style={{ width: "100%", height: "calc(100% - 18px)", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: "4px" }} />
                        </div>
                        {/* Bottom row: other 2 drawings side by side */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", height: "48%" }}>
                          {drawingsList.slice(1).map(d => (
                            <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                              <div style={{ fontSize: "10px", fontWeight: 700, color: "#003087", marginBottom: "3px", textTransform: "uppercase" }}>{d.label}</div>
                              <img src={d.url} alt={d.label} style={{ width: "100%", height: "calc(100% - 18px)", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: "4px" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer (same style as cover letter footer) */}
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8.5px", color: "#9ca3af" }}>
                    <div>Website: www.seajong.com</div>
                    <div>Hotline: 1900 636 845</div>
                  </div>
                </div>
              );
            })()}

            {/* Page 4: Chi tiết báo giá */}
            <div className="print-paper print-details" style={{
              width: `${paperW}mm`,
              minHeight: `${paperH}mm`,
              background: "#fff",
              boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
              padding: "14mm 15mm",
              boxSizing: "border-box",
              fontSize: 10,
              lineHeight: 1.5,
              fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
              color: "#111",
              position: "relative"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid #003087" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative" }}>
                  {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain", flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 10.5, color: "#003087", textTransform: "uppercase" }}>{company.name ?? "Công ty"}</div>
                    {company.address && <div style={{ fontSize: 9, color: "#374151", marginTop: 1 }}>Địa chỉ: {company.address}</div>}
                    {(company.phone || company.email) && <div style={{ fontSize: 9, color: "#374151", display: "flex", gap: 12 }}>{company.phone && <span>Điện thoại: {company.phone.replace(/[Hh]otline:\s*/gi, "").trim()}</span>}{company.email && <span>Email: {company.email}</span>}</div>}
                  </div>
                  {/* Con dấu treo Sejong Faucet */}
                  {showStamp && (
                    <img
                      src="/seajong_stampt.png"
                      alt="Sejong Stamp"
                      style={{
                        position: "absolute",
                        left: "22mm",
                        top: "0mm",
                        width: "36mm",
                        height: "36mm",
                        objectFit: "contain",
                        opacity: 0.85,
                        transform: "rotate(-10deg)",
                        pointerEvents: "none",
                        zIndex: 10
                      }}
                    />
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: 1, color: "#003087" }}>BẢNG BÁO GIÁ</div>
                  <div style={{ fontSize: 11, color: "#374151", marginTop: 3 }}>Số: <strong>{info.soPhieu}</strong></div>
                  <div style={{ fontSize: 11, color: "#374151" }}>Ngày lập: {fmtDate(info.ngayLap)}</div>
                  <div style={{ fontSize: 11, color: "#374151" }}>Hiệu lực đến: {fmtDate(info.hieuLuc)}</div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", color: "#003087", borderLeft: "3px solid #003087", paddingLeft: 6, marginBottom: 6 }}>Thông tin khách hàng</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px", fontSize: 11 }}>
                  <div><strong>Đơn vị:</strong> {customer?.name ?? "—"}</div>
                  <div><strong>Người liên hệ:</strong> {customer?.daiDien ? `${customer.xungHo ?? ""} ${customer.daiDien}` : "—"}</div>
                  <div><strong>Địa chỉ:</strong> {customer?.address ?? "—"}</div>
                  <div><strong>Điện thoại:</strong> {customer?.dienThoai ?? "—"}</div>
                </div>
              </div>
              <div style={{ marginBottom: 12, fontSize: 11, color: "#374151", lineHeight: 1.5, textAlign: "justify" }}>
                Công ty cổ phần Sejong Faucet Việt Nam trân trọng cảm ơn Quý khách hàng đã quan tâm đến sản phẩm của chúng tôi. Sejong xin gửi đến Quý khách hàng bảng báo giá các sản phẩm, thiết bị theo yêu cầu của Quý khách hàng với thông tin chi tiết như sau:
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: 9.5 }}>
                <thead>
                  <tr style={{ background: "#003087", color: "#fff" }}>
                    {isCoQuayKe ? (
                      <>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "40px", textTransform: "uppercase" }}>STT</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", textTransform: "uppercase" }}>Tên hàng hoá</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "50px", textTransform: "uppercase" }}>Vị trí</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "50px", textTransform: "uppercase" }}>Quy cách</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "95px", textTransform: "uppercase" }}>Giá bán (đ)</th>
                        <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", width: "95px", textTransform: "uppercase" }}>Giá đại lý (đ)</th>
                      </>
                    ) : (
                      ["STT", "Tên hàng hoá - Dịch vụ", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"].map((h, i) => (
                        <th key={h} style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #93c5fd", textTransform: "uppercase" }}>{h}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let globalIdx = 0;

                    // If not CoQuayKe, we render flat list
                    if (!isCoQuayKe) {
                      return items.filter((it: any) => it.ten).map((it: any) => {
                        globalIdx++;
                        return (
                          <tr key={it.id} style={{ background: globalIdx % 2 === 0 ? "#fff" : "#eff6ff" }}>
                            <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{globalIdx}</td>
                            <td style={{ padding: "4px 6px", border: "1px solid #dbeafe" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {it.imageUrl && (
                                  <img
                                    src={it.imageUrl.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(it.imageUrl)}` : it.imageUrl}
                                    alt={it.ten}
                                    style={{ width: 42, height: 42, objectFit: "contain", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}
                                  />
                                )}
                                <div>
                                  <div style={{ fontWeight: 600 }}>{it.ten}</div>
                                  {getProductCode(it) && (
                                    <div style={{ fontSize: "8px", color: "#6b7280", marginTop: "2px", fontFamily: "monospace" }}>
                                      Mã: {getProductCode(it)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{it.dvt}</td>
                            <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{it.soLuong.toLocaleString("vi-VN")}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #dbeafe" }}>{fmt(it.donGia)}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, border: "1px solid #dbeafe" }}>{fmt(thanhTien(it))}</td>
                          </tr>
                        );
                      });
                    }

                    // If CoQuayKe, group items by Area name (viTri)
                    const validItems = items.filter((it: any) => it.ten);
                    const areas = Array.from(new Set(validItems.map((it: any) => it.viTri || "Khu vực 1"))) as string[];

                    return areas.map(areaName => {
                      const areaItems = validItems.filter((it: any) => (it.viTri || "Khu vực 1") === areaName);
                      if (areaItems.length === 0) return null;

                      return (
                        <React.Fragment key={areaName}>
                          {/* Area Header Row */}
                          <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                            <td colSpan={6} style={{ padding: "6px 10px", color: "#003087", textTransform: "uppercase", fontSize: "10px", border: "1px solid #bfdbfe", background: "#f1f5f9" }}>
                              {areaName}
                            </td>
                          </tr>
                          {/* Area Items */}
                          {areaItems.map((it: any) => {
                            globalIdx++;
                            let viTriChiTiet = it.viTriChiTiet || "";
                            try {
                              if (it.ghiChu) {
                                const parsed = JSON.parse(it.ghiChu);
                                if (parsed && typeof parsed === "object") {
                                  viTriChiTiet = parsed.viTriChiTiet || parsed.viTri || "";
                                  if (viTriChiTiet.startsWith("Khu vực")) {
                                    viTriChiTiet = "";
                                  }
                                }
                              }
                            } catch (e) { }

                            return (
                              <tr key={it.id} style={{ background: globalIdx % 2 === 0 ? "#fff" : "#eff6ff" }}>
                                <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #dbeafe" }}>{globalIdx}</td>
                                <td style={{ padding: "4px 6px", border: "1px solid #dbeafe" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {it.imageUrl && (
                                      <img
                                        src={it.imageUrl.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(it.imageUrl)}` : it.imageUrl}
                                        alt={it.ten}
                                        style={{ width: 42, height: 42, objectFit: "contain", borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}
                                      />
                                    )}
                                    <div>
                                      <div style={{ fontWeight: 600 }}>{it.ten}</div>
                                      {getProductCode(it) && (
                                        <div style={{ fontSize: "8px", color: "#6b7280", marginTop: "2px", fontFamily: "monospace" }}>
                                          Mã: {getProductCode(it)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: "4px 6px", border: "1px solid #dbeafe", textAlign: "center" }}>
                                  {viTriChiTiet}
                                </td>
                                <td style={{ padding: "4px 6px", border: "1px solid #dbeafe", textAlign: "center" }}>{it.dvt}</td>
                                <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #dbeafe" }}>{fmt(it.donGia)}</td>
                                <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, border: "1px solid #dbeafe" }}>
                                  {fmt(it.giaDaiLy ?? it.thanhTien ?? 0)}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 60 }}>
                <div style={{ fontSize: 9 }}>
                  {info.ghiChu && (
                    <div style={{ color: "#374151", display: "flex", flexDirection: "column", gap: 5 }}>
                      {info.ghiChu.split("\n").map((line: string, idx: number) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;
                        if (trimmed.startsWith("-")) {
                          return (
                            <div key={idx} style={{ display: "flex", gap: 6, alignItems: "flex-start", textAlign: "justify" }}>
                              <span style={{ flexShrink: 0 }}>-</span>
                              <span>{trimmed.substring(1).trim()}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} style={{ textAlign: "justify" }}>
                            {trimmed}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 9.5 }}>
                  {[
                    ["Tổng tiền hàng (đ):", fmt(tamTinh)],
                    [`Chiết khấu (${info.chietKhauTong}%):`, fmt(ckTien)],
                    [`Thuế VAT (${info.thue}%):`, fmt(thueTien)],
                    ...(chiPhiThiCong > 0 ? [["Chi phí thi công (đ):", fmt(chiPhiThiCong)]] : [])
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #e5e7eb" }}><span>{l}</span><strong>{v}</strong></div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "2px solid #003087", marginTop: 2 }}><span style={{ fontWeight: 800 }}>TỔNG CỘNG:</span><span style={{ fontWeight: 900, color: "#003087" }}>{fmt(tongCong)}</span></div>
                  <div style={{ fontSize: 8.5, fontStyle: "italic", textAlign: "right" }}>({numberToVNWords(tongCong)})</div>
                </div>
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <div style={{ textAlign: "center", minWidth: 140, fontSize: 9.5 }}>
                  <div style={{ fontWeight: 700 }}>ĐẠI DIỆN CÔNG TY</div>
                  <div style={{ fontStyle: "italic", fontSize: 9, color: "#6b7280" }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ height: 40 }} />
                  {company.legalRep && <div style={{ fontWeight: 700 }}>{company.legalRep}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const getProductCode = (it: { ten: string; code?: string | null }) => {
  if (it.code) return it.code;
  if (!it.ten) return "";
  const sjMatch = it.ten.match(/(SJ-[A-Z0-9-]+)/i);
  if (sjMatch) return sjMatch[1];
  const generalMatch = it.ten.match(/\b([A-Z0-9]{2,}-[A-Z0-9-]+)\b/);
  if (generalMatch) return generalMatch[1];
  return "";
};

// ── Main BaoGiaSanitaryModal Component ──────────────────────────────────
export function BaoGiaSanitaryModal({ open, onClose, customer, editData, onSaved, type = "agency", isDirectOrder }: {
  open: boolean;
  onClose: () => void;
  customer: CustomerRow | null;
  editData?: QuotationEditData | null;
  onSaved?: () => void;
  type?: string;
  isDirectOrder?: boolean;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const defaultNgayLap = fmtDate(today);
  const defaultHieuLuc = fmtDate(new Date(today.getTime() + 30 * 24 * 3600 * 1000));

  const [info, setInfo] = React.useState({
    soPhieu: genDocCode("BG"),
    ngayLap: defaultNgayLap,
    hieuLuc: defaultHieuLuc,
    ngayGiaoHang: defaultNgayLap,
    dieuKhoanTT: "",
    dieuKhoanGH: "",
    ghiChu: getDefaultGhiChu(defaultNgayLap, defaultHieuLuc, 10),
    chietKhauTong: 0,
    thue: 10,
    quoteType: isDirectOrder ? "Không có quầy kệ" : (type === "retail" ? "Không có quầy kệ" : "Có quầy kệ"),
    chiPhiThiCong: 0,
    file3DUrl: "",
    fileDetailUrl: "",
    fileLayoutUrl: "",
  });

  const [showInfoSidebar, setShowInfoSidebar] = React.useState(false);


  const [custInfo, setCustInfo] = React.useState({
    id: customer?.id || "",
    name: customer?.name || "",
    dienThoai: customer?.dienThoai || "",
    address: customer?.address || "",
    nhom: customer?.nhom || "ca-nhan",
    nguon: customer?.nguon || null,
  });

  React.useEffect(() => {
    setCustInfo({
      id: customer?.id || "",
      name: customer?.name || "",
      dienThoai: customer?.dienThoai || "",
      address: customer?.address || "",
      nhom: customer?.nhom || "ca-nhan",
      nguon: customer?.nguon || null,
    });
  }, [customer]);

  const [debtInfo, setDebtInfo] = React.useState<{ outstandingDebt: number; creditLimit: number } | null>(null);
  const [isCustomerNew, setIsCustomerNew] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;

    if (custInfo.id) {
      setIsCustomerNew(false);
      fetch(`/api/plan-finance/customers/${custInfo.id}`)
        .then(async res => {
          if (res.ok) return res.json();
          if (res.status === 401) {
            // Session expired or unauthorized, handle gracefully
            return null;
          }
          if (res.status === 404) {
            // Customer doesn't exist in DB (e.g. guest or deleted), handle gracefully
            return null;
          }
          const errText = await res.text().catch(() => "");
          console.warn(`Failed to load customer details. HTTP ${res.status}: ${errText || res.statusText}`);
          return null;
        })
        .then(data => {
          if (data) {
            setDebtInfo({
              outstandingDebt: data.outstandingDebt || 0,
              creditLimit: data.creditLimit || 0
            });
          } else {
            setDebtInfo(null);
          }
        })
        .catch(err => {
          console.error("Network error loading customer debt detail:", err);
          setDebtInfo(null);
        });
      return;
    }

    if (!custInfo.name.trim()) {
      setIsCustomerNew(true);
      setDebtInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/plan-finance/customers?search=${encodeURIComponent(custInfo.name)}`);
        if (res.ok) {
          const data = await res.json();
          const match = data.customers?.find(
            (c: any) => c.name.toLowerCase() === custInfo.name.trim().toLowerCase()
          );

          if (match) {
            setIsCustomerNew(false);
            const detailRes = await fetch(`/api/plan-finance/customers/${match.id}`);
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              setDebtInfo({
                outstandingDebt: detailData.outstandingDebt || 0,
                creditLimit: detailData.creditLimit || 0
              });
              setCustInfo(prev => ({ ...prev, id: match.id }));
            }
          } else {
            setIsCustomerNew(true);
            setDebtInfo(null);
          }
        }
      } catch (err) {
        console.error("Error checking customer name in DB", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [custInfo.name, custInfo.id, open]);

  const [printOpen, setPrintOpen] = React.useState(false);
  const [printAction, setPrintAction] = React.useState<"print" | "pdf" | "">("");
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");


  const isGhiChuEdited = React.useRef(false);

  React.useEffect(() => {
    if (open) {
      isGhiChuEdited.current = false;
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (editData?.id) return; // Don't auto-overwrite in edit mode
    if (!isGhiChuEdited.current) {
      setInfo(prev => ({
        ...prev,
        ghiChu: getDefaultGhiChu(prev.ngayLap, prev.hieuLuc, prev.thue)
      }));
    }
  }, [info.ngayLap, info.hieuLuc, info.thue, editData?.id, open]);

  const [pheduyet, setPheduyet] = React.useState(false);
  const [approverId, setApproverId] = React.useState("");
  const [approvers, setApprovers] = React.useState<any[]>([]);
  const [loadingApp, setLoadingApp] = React.useState(false);
  const [uuTienCao, setUuTienCao] = React.useState(false);

  // States for Sanitary kitchen equipment quotations
  const isSanitary = true;
  const [soKhuVuc, setSoKhuVuc] = React.useState<number>(1);
  const [tyLeGiaDaiLy, setTyLeGiaDaiLy] = React.useState<number>(80);
  const [collapsedAreas, setCollapsedAreas] = React.useState<Record<string, boolean>>({});
  const [showDrawings, setShowDrawings] = React.useState(false);
  const [saveCustomer, setSaveCustomer] = React.useState(false);

  const handleTyLeGiaDaiLyChange = (newRate: number) => {
    setTyLeGiaDaiLy(newRate);
    setItems(r => r.map(it => ({
      ...it,
      giaDaiLy: Math.round(it.donGia * (newRate / 100))
    })));
  };

  const toast = useToast();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
  const nextId = React.useRef(1);
  const [items, setItems] = React.useState<QuoteItem[]>([
    { id: nextId.current++, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null },
  ]);

  const [formItem, setFormItem] = React.useState<QuoteItem & { khoTen?: string; source?: string; dinhMucs?: any[]; dinhMucId?: string | null; dinhMucTen?: string | null }>({
    id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: ""
  });

  const [showBomDetail, setShowBomDetail] = React.useState(false);
  const [bomDetailData, setBomDetailData] = React.useState<any>(null);
  const [loadingBom, setLoadingBom] = React.useState(false);

  React.useEffect(() => {
    if (showBomDetail && formItem.dinhMucId) {
      setLoadingBom(true);
      fetch(`/api/production/bom/${formItem.dinhMucId}`)
        .then(res => res.json())
        .then(data => setBomDetailData(data))
        .catch(console.error)
        .finally(() => setLoadingBom(false));
    } else if (!showBomDetail) {
      setBomDetailData(null);
    }
  }, [showBomDetail, formItem.dinhMucId]);

  const addRow = () => {
    if (info.quoteType !== "Có quầy kệ") {
      if (!formItem.ten.trim()) {
        toast.error("Lỗi", "Vui lòng chọn hoặc nhập tên sản phẩm");
        return;
      }
      setItems(r => [...r, { ...formItem, id: nextId.current++ }]);
      setFormItem({ id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: "" });
    } else {
      setItems(r => [...r, { id: nextId.current++, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, giaDaiLy: 0, viTri: "Khu vực 1" }]);
    }
  };

  React.useEffect(() => {
    const activeCoQuayKe = info.quoteType === "Có quầy kệ" && isSanitary;
    if (!activeCoQuayKe) return;
    setItems(prev => {
      let updated = false;
      const nextList = prev.map(it => {
        if (!it.viTri) {
          updated = true;
          return {
            ...it,
            viTri: "Khu vực 1",
            giaDaiLy: it.giaDaiLy ?? Math.round(it.donGia * (tyLeGiaDaiLy / 100))
          };
        }
        return it;
      });

      let added = false;
      for (let i = 1; i <= soKhuVuc; i++) {
        const kvName = `Khu vực ${i}`;
        const hasItem = nextList.some(it => it.viTri === kvName);
        if (!hasItem) {
          nextList.push({
            id: nextId.current++,
            ten: "",
            dvt: "",
            soLuong: 1,
            donGia: 0,
            ckPct: 0,
            soLuongTon: null,
            trangThaiKho: null,
            inventoryId: null,
            viTri: kvName,
            giaDaiLy: 0
          });
          added = true;
        }
      }
      if (updated || added) {
        return nextList;
      }
      return prev;
    });
  }, [soKhuVuc, info.quoteType, isSanitary, tyLeGiaDaiLy]);

  // Load dữ liệu khi mở ở edit mode
  React.useEffect(() => {
    if (!open) return;
    if (editData?.id) {
      const fmtD = (s: string | null | undefined) => s ? new Date(s).toISOString().split("T")[0] : "";
      setInfo(f => ({
        ...f,
        soPhieu: editData.code ?? f.soPhieu,
        ngayLap: fmtD(editData.ngayBaoGia) || f.ngayLap,
        hieuLuc: fmtD(editData.ngayHetHan) || f.hieuLuc,
        ngayGiaoHang: fmtD((editData as any).ngayGiaoHang) || f.ngayGiaoHang,
        chietKhauTong: editData.discount ?? 0,
        thue: editData.vat ?? 10,
        ghiChu: cleanGhiChu(editData.ghiChu ?? ""),
        quoteType: isDirectOrder ? "Không có quầy kệ" : (editData.quoteType ?? (type === "retail" ? "Không có quầy kệ" : "Có quầy kệ")),
        chiPhiThiCong: editData.chiPhiThiCong ?? 0,
        file3DUrl: editData.file3DUrl ?? "",
        fileDetailUrl: editData.fileDetailUrl ?? "",
        fileLayoutUrl: editData.fileLayoutUrl ?? "",
        dieuKhoanTT: f.dieuKhoanTT,
        dieuKhoanGH: f.dieuKhoanGH,
      }));
      setUuTienCao(editData.uuTien === "high");

      // Handle loading guest customer info from ghiChu if customer prop is missing
      if (!customer?.id && editData.ghiChu) {
        const guest = parseGuestInfo(editData.ghiChu);
        if (guest) {
          setCustInfo({
            id: "",
            name: guest.name || "",
            dienThoai: guest.dienThoai || "",
            address: guest.address || "",
            nhom: "ca-nhan",
            nguon: null,
          });
        }
      }

      const isCoQuayKeEdit = (editData.quoteType ?? (type === "retail" ? "Không có quầy kệ" : "Có quầy kệ")) === "Có quầy kệ";

      if (Array.isArray(editData.items) && editData.items.length > 0) {
        let maxKV = 1;
        let loadedRate = 80;

        const mappedItems = editData.items.map((it, i) => {
          let viTri = "Khu vực 1";
          let viTriChiTiet = "";
          let code = "";
          try {
            if (it.ghiChu) {
              const parsed = JSON.parse(it.ghiChu);
              if (parsed && typeof parsed === "object") {
                viTri = parsed.khuVuc || "Khu vực 1";
                viTriChiTiet = parsed.viTriChiTiet || parsed.viTri || "";
                code = parsed.code || "";
                if (viTriChiTiet.startsWith("Khu vực") && !parsed.khuVuc) {
                  viTri = viTriChiTiet;
                  viTriChiTiet = "";
                }
                const m = viTri.match(/Khu vực (\d+)/);
                if (m) {
                  const num = parseInt(m[1], 10);
                  if (num > maxKV) maxKV = num;
                }
              }
            }
          } catch (e) { }

          if (it.donGia && it.donGia > 0 && it.thanhTien) {
            loadedRate = Math.round((it.thanhTien / it.donGia) * 100);
          }

          return {
            id: i + 1,
            ten: it.tenHang ?? "",
            dvt: it.donVi ?? "",
            soLuong: it.soLuong ?? 1,
            donGia: it.donGia ?? 0,
            giaDaiLy: isCoQuayKeEdit ? (it.thanhTien ?? 0) : undefined,
            viTri: isCoQuayKeEdit ? viTri : undefined,
            viTriChiTiet: isCoQuayKeEdit ? viTriChiTiet : undefined,
            code: code || null,
            ckPct: 0,
            soLuongTon: null, trangThaiKho: null, inventoryId: null,
            imageUrl: (it as any).imageUrl || null,
          };
        });

        if (isCoQuayKeEdit) {
          setSoKhuVuc(maxKV);
          setTyLeGiaDaiLy(loadedRate);
        }
        setItems(mappedItems);
        nextId.current = (editData.items.length ?? 0) + 1;
      }
    } else {
      // Reset về trạng thái mới khi không phải edit
      const t = new Date();
      const tNgayLap = fmtDate(t);
      const tHieuLuc = fmtDate(new Date(t.getTime() + 30 * 24 * 3600_000));

      setInfo({
        soPhieu: "Đang tải...",
        ngayLap: tNgayLap,
        hieuLuc: tHieuLuc,
        ngayGiaoHang: tNgayLap,
        dieuKhoanTT: "",
        dieuKhoanGH: "",
        ghiChu: type === "retail" ? "" : getDefaultGhiChu(tNgayLap, tHieuLuc),
        chietKhauTong: 0,
        thue: 10,
        quoteType: isDirectOrder ? "Không có quầy kệ" : (type === "retail" ? "Không có quầy kệ" : "Có quầy kệ"),
        chiPhiThiCong: 0,
        file3DUrl: "",
        fileDetailUrl: "",
        fileLayoutUrl: ""
      });


      fetch(`/api/plan-finance/quotations/next-code?type=${type}`)
        .then(r => r.json())
        .then(data => {
          if (data.nextCode) {
            setInfo(f => ({ ...f, soPhieu: data.nextCode }));
          }
        })
        .catch(err => console.error("Error fetching next quote code:", err));

      setUuTienCao(false);
      setItems([{ id: 1, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null }]);
      nextId.current = 2;

      setSoKhuVuc(1);
      setTyLeGiaDaiLy(80);
      setCollapsedAreas({});
      setShowDrawings(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editData?.id, type]);

  const [suggest, setSuggest] = React.useState<any[]>([]);
  const [activeRowId, setActiveRowId] = React.useState<number | null>(null);
  const suggestTimer = React.useRef<any>(null);
  const activeRowIdRef = React.useRef<number | null>(null);

  const setActiveRowIdSync = (id: number | null) => { activeRowIdRef.current = id; setActiveRowId(id); };

  React.useEffect(() => {
    if (!pheduyet || approvers.length > 0) return;
    setLoadingApp(true);
    fetch("/api/plan-finance/approvers").then(r => r.json()).then(d => setApprovers(d.approvers ?? [])).catch(() => setApprovers([])).finally(() => setLoadingApp(false));
  }, [pheduyet]);

  const fetchSuggest = React.useCallback((query: string, rowId: number) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!query.trim() || query.length < 2) { setSuggest([]); return; }
    suggestTimer.current = setTimeout(() => {
      fetch(`/api/logistics/inventory?search=${encodeURIComponent(query)}&limit=20&includeManufactured=true`)
        .then(r => r.json()).then(d => { if (activeRowIdRef.current === rowId) setSuggest(d.items ?? []); }).catch(() => setSuggest([]));
    }, 300);
  }, []);

  const applySuggest = (rowId: number, item: any) => {
    const soLuongTon = item.soLuongThuc ?? item.soLuong;
    const defaultDinhMuc = item.dinhMucs?.length > 0 ? item.dinhMucs[0] : null;
    const khoTenStr = (item.stocks && item.stocks.length > 0 && item.stocks[0].warehouse?.name)
      ? item.stocks[0].warehouse.name
      : (item.source === "manufactured" ? "Kho thành phẩm"
        : item.source === "inventory" ? "Kho hàng hoá"
          : item.source === "material" ? "Kho vật tư và phụ kiện" : "");

    const updatePayload = {
      ten: item.tenHang,
      khoTen: khoTenStr,
      dvt: item.donVi ?? "cái",
      donGia: defaultDinhMuc ? (defaultDinhMuc.giaBan ?? item.giaBan) : item.giaBan,
      soLuongTon,
      trangThaiKho: item.trangThai,
      inventoryId: item.id,
      imageUrl: item.imageUrl || null,
      code: item.code || null,
      dinhMucs: item.dinhMucs || [],
      dinhMucId: defaultDinhMuc ? defaultDinhMuc.id : null,
      dinhMucTen: defaultDinhMuc ? defaultDinhMuc.tenDinhMuc : null,
      source: item.source,
      giaDaiLy: Math.round((item.giaBan || 0) * (tyLeGiaDaiLy / 100))
    };

    if (rowId === -1) {
      setFormItem(x => ({ ...x, ...updatePayload }));
    } else {
      setItems(r => r.map(x => x.id === rowId ? { ...x, ...updatePayload } : x));
    }
    setSuggest([]);
    setActiveRowIdSync(null);
  };

  const setInfoField = (k: string) => (e: any) => setInfo(f => ({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  const handleUpload = (key: "file3DUrl" | "fileDetailUrl" | "fileLayoutUrl", label: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const file = target.files?.[0];
    
    // Reset ngay trong onChange sau khi đã lấy được file
    target.value = "";

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload thất bại");
      const data = await res.json();
      setInfo(f => ({ ...f, [key]: data.url }));
      toast.success("Tải lên thành công", `Đã đính kèm bản vẽ ${label}`);
    } catch (err: any) {
      toast.error("Lỗi tải lên", err.message ?? "Lỗi tải file");
    }
  };

  const handleClearFile = (key: "file3DUrl" | "fileDetailUrl" | "fileLayoutUrl", label: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInfo(f => ({ ...f, [key]: "" }));
    toast.success("Đã gỡ file", `Đã gỡ bản vẽ ${label}`);
  };

  const renderAttachmentButton = ({ label, fileUrl, uploadKey, disabled }: { label: string; fileUrl: string; uploadKey: "file3DUrl" | "fileDetailUrl" | "fileLayoutUrl"; disabled?: boolean }) => {
    const isAttached = !!fileUrl;
    const fileName = fileUrl ? fileUrl.split("/").pop() : "";
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : undefined }}>
        {isAttached ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 8px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: 8, height: 35, boxSizing: "border-box", transition: "all 0.2s"
          }}>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Xem bản vẽ: ${fileName}`}
              style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
                color: "#10b981", textDecoration: "none", flex: 1, minWidth: 0
              }}
            >
              <i className="bi bi-paperclip" style={{ fontSize: 13, flexShrink: 0 }} />
              <span style={{
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>{label}</span>
            </a>
            {!disabled && (
              <button
                onClick={handleClearFile(uploadKey, label)}
                style={{
                  background: "none", border: "none", color: "#ef4444", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 2, borderRadius: 4
                }}
                title="Gỡ file đính kèm"
              >
                <i className="bi bi-x-circle-fill" style={{ fontSize: 12 }} />
              </button>
            )}
          </div>
        ) : (
          <label
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "6px 8px", background: "var(--muted)", border: "1px solid var(--border)",
              borderRadius: 8, height: 35, boxSizing: "border-box", cursor: disabled ? "not-allowed" : "pointer",
              fontSize: 12, fontWeight: 600, color: "var(--foreground)",
              transition: "all 0.15s",
              margin: 0
            }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; } }}
            onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground)"; } }}
          >
            <input
              type="file"
              disabled={disabled}
              onChange={handleUpload(uploadKey, label)}
              style={{ display: "none" }}
            />
            <i className="bi bi-plus-lg" style={{ fontSize: 11 }} />
            <span style={{ whiteSpace: "nowrap" }}>{label}</span>
          </label>
        )}
      </div>
    );
  };


  const removeRow = (id: number) => setItems(r => r.filter(x => x.id !== id));
  const updateRow = (id: number, f: string, v: any) => setItems(r => r.map(x => x.id === id ? { ...x, [f]: v } : x));

  const renderQuayKeRow = (it: QuoteItem, idx: number) => {
    return (
      <tr key={it.id} style={{ borderBottom: "1px solid var(--border)" }}>
        <td style={{ padding: 10, color: "var(--muted-foreground)" }}>{idx + 1}</td>
        <td style={{ padding: "6px 10px", position: "relative" }}>
          {it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (() => {
            const ton = it.soLuongTon as number;
            if (ton === 0) return (
              <span title="Hết hàng" style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#ef4444", pointerEvents: "none", display: "flex" }}>
                <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
              </span>
            );
            if (it.soLuong > ton) return (
              <span title={`Thiếu hàng (tồn: ${ton})`} style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#f97316", pointerEvents: "none", display: "flex" }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 12 }} />
              </span>
            );
            return null;
          })()}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <input
              value={it.ten}
              placeholder="Nhập tên hoặc mã SKU..."
              onChange={e => {
                const v = e.target.value;
                if (!v) {
                  setItems(r => r.map(x => x.id === it.id
                    ? { ...x, ten: "", dvt: "", donGia: 0, ckPct: 0, soLuong: 1, soLuongTon: null, trangThaiKho: null, inventoryId: null }
                    : x
                  ));
                  setSuggest([]);
                } else {
                  updateRow(it.id, "ten", v);
                  setActiveRowIdSync(it.id);
                  fetchSuggest(v, it.id);
                }
              }}
              onFocus={e => { setActiveRowIdSync(it.id); fetchSuggest(it.ten, it.id); e.currentTarget.style.border = "1px solid var(--primary)"; }}
              onBlur={e => { e.currentTarget.style.border = "1px solid var(--border)"; setTimeout(() => { if (activeRowIdRef.current === it.id) { setSuggest([]); setActiveRowIdSync(null); } }, 200); }}
              style={{ width: "100%", padding: 6, border: "1px solid var(--border)", background: "#fff", outline: "none", borderRadius: 6, fontFamily: "inherit", fontSize: 13, color: "var(--foreground)", transition: "border-color 0.15s" }}
            />
            {getProductCode(it) && (
              <span style={{ fontSize: 10, color: "var(--muted-foreground)", background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", alignSelf: "flex-start", marginTop: 2 }}>
                Mã: {getProductCode(it)}
              </span>
            )}
          </div>
          {activeRowId === it.id && suggest.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
              {suggest.map(s => (
                <div key={s.id} onClick={() => applySuggest(it.id, s)}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                >
                  <div style={{ fontWeight: 600 }}>{s.tenHang}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 8, marginTop: 2 }}>
                    {s.code && <span style={{ fontFamily: "monospace", background: "var(--muted)", padding: "0 5px", borderRadius: 4 }}>{s.code}</span>}
                    <span>Tồn: <b>{s.soLuongThuc ?? s.soLuong}</b> {s.donVi}</span>
                    <span>Giá: <b>{s.giaBan.toLocaleString("vi-VN")} ₫</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </td>
        <td style={{ padding: 6 }}>
          <input
            value={it.viTriChiTiet || ""}
            onChange={e => updateRow(it.id, "viTriChiTiet", e.target.value)}
            style={{ width: "100%", padding: 6, border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
          />
        </td>
        <td style={{ padding: 6 }}>
          <input
            value={it.dvt}
            onChange={e => updateRow(it.id, "dvt", e.target.value)}
            style={{ width: "100%", padding: 6, border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--primary)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
          />
        </td>
        <td style={{ padding: 6 }}>
          <CurrencyInput
            value={it.donGia}
            onChange={v => {
              setItems(r => r.map(x => x.id === it.id ? { ...x, donGia: v, giaDaiLy: Math.round(v * (tyLeGiaDaiLy / 100)) } : x));
            }}
            placeholder="0"
            style={{ width: "100%", padding: 6, border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }}
          />
        </td>
        <td style={{ padding: 6 }}>
          <CurrencyInput
            value={it.giaDaiLy ?? 0}
            onChange={v => updateRow(it.id, "giaDaiLy", v)}
            placeholder="0"
            style={{ width: "100%", padding: 6, border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }}
          />
        </td>
        <td style={{ padding: 6 }}><button onClick={() => removeRow(it.id)} style={{ padding: 4, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><i className="bi bi-trash" /></button></td>
      </tr>
    );
  };

  const isCoQuayKe = info.quoteType === "Có quầy kệ" && isSanitary;
  const thanhTien = (it: QuoteItem) => isCoQuayKe ? (it.giaDaiLy ?? 0) : it.soLuong * it.donGia * (1 - it.ckPct / 100);
  const tamTinh = items.reduce((s, it) => s + thanhTien(it), 0);
  const ckTien = tamTinh * info.chietKhauTong / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.thue / 100;
  const tongCong = truocThue + thueTien + (isCoQuayKe ? info.chiPhiThiCong : 0);

  const handleSave = async (mode: "draft" | "submit" = "submit") => {
    if (!info.soPhieu.trim()) { setSaveError("Vui lòng nhập số báo giá"); return; }
    if (mode === "submit" && pheduyet && !approverId) { setSaveError("Vui lòng chọn người phê duyệt"); return; }
    setSaving(true);
    setSaveError("");
    try {
      const trangThai = isDirectOrder
        ? "won"
        : (type === "retail"
          ? (editData?.id ? editData.trangThai : "draft")
          : (mode === "draft" ? "draft" : (pheduyet ? "pending_approval" : "approved")));
      const finalCustomerId = custInfo.id;
      let finalGhiChu = [info.ghiChu, info.dieuKhoanTT ? `ĐKTT: ${info.dieuKhoanTT}` : "", info.dieuKhoanGH ? `ĐKGH: ${info.dieuKhoanGH}` : ""].filter(Boolean).join("\n");
      if (!finalCustomerId) {
        const guestInfo = {
          name: custInfo.name.trim() || "Khách vãng lai",
          dienThoai: custInfo.dienThoai.trim(),
          address: custInfo.address.trim()
        };
        finalGhiChu = `[GuestInfo:${JSON.stringify(guestInfo)}]\n` + finalGhiChu;
      }

      const payload = {
        code: info.soPhieu.trim(), ngayBaoGia: info.ngayLap, ngayHetHan: info.hieuLuc,
        ngayGiaoHang: info.ngayGiaoHang,
        trangThai, uuTien: uuTienCao ? "high" : "medium",
        tongTien: tamTinh, discount: info.chietKhauTong, vat: info.thue,
        chiPhiThiCong: info.chiPhiThiCong, thanhTien: tongCong,
        ghiChu: finalGhiChu,
        approverId: (mode === "submit" && pheduyet) ? approverId : undefined,
        quoteType: info.quoteType,
        file3DUrl: info.file3DUrl,
        fileDetailUrl: info.fileDetailUrl,
        fileLayoutUrl: info.fileLayoutUrl,
        items: items.filter(it => it.ten.trim()).map((it, idx) => {
          const itemThanhTien = isCoQuayKe ? (it.giaDaiLy ?? 0) : thanhTien(it);
          const itemGhiChu = JSON.stringify({
            viTri: isCoQuayKe ? (it.viTriChiTiet || "") : "",
            khuVuc: isCoQuayKe ? (it.viTri || "Khu vực 1") : "",
            viTriChiTiet: isCoQuayKe ? (it.viTriChiTiet || "") : "",
            code: it.code || ""
          });
          return {
            tenHang: it.ten.trim(),
            donVi: it.dvt || "cái",
            soLuong: isCoQuayKe ? 1 : it.soLuong,
            donGia: it.donGia,
            thanhTien: itemThanhTien,
            ghiChu: itemGhiChu,
            sortOrder: idx
          };
        }),
      };

      let res: Response;
      if (editData?.id) {
        // Chế độ sửa
        res = await fetch(`/api/plan-finance/quotations/${editData.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      } else {
        // Chế độ tạo mới
        res = await fetch("/api/plan-finance/quotations", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, customerId: finalCustomerId || null, type }),
        });
      }
      if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi lưu báo giá");
      
      const responseData = await res.json();
      const quoteId = editData?.id || responseData?.id;

      // Ghi lịch sử sau khi lưu thành công
      if (quoteId) {
        const STATUS_LABEL: Record<string, string> = {
          draft: "Nháp", pending_approval: "Đang trình duyệt",
          approved: "Đã phê duyệt", sent: "Đang thương thảo",
          won: "Thành công", lost: "Thất bại", cancelled: "Đã huỷ",
        };
        const nguoiThucHien = session?.user?.name ?? "Hệ thống";
        const validItems = items.filter(it => it.ten.trim());
        let ketQua = "";

        if (editData?.id) {
          // So sánh các thay đổi khi cập nhật
          const changes: string[] = [];

          // 1. So sánh trạng thái
          const oldTrangThai = editData.trangThai || "draft";
          if (oldTrangThai !== trangThai) {
            changes.push(`  + Trạng thái: từ "${STATUS_LABEL[oldTrangThai] || oldTrangThai}" thành "${STATUS_LABEL[trangThai] || trangThai}"`);
          }

          // 2. So sánh chiết khấu
          const oldDiscount = editData.discount ?? 0;
          const newDiscount = info.chietKhauTong;
          if (oldDiscount !== newDiscount) {
            changes.push(`  + Chiết khấu: từ ${oldDiscount}% thành ${newDiscount}%`);
          }

          // 3. So sánh VAT
          const oldVat = editData.vat ?? 10;
          const newVat = info.thue;
          if (oldVat !== newVat) {
            changes.push(`  + Thuế VAT: từ ${oldVat}% thành ${newVat}%`);
          }

          // 4. So sánh chi phí thi công
          const oldThiCong = editData.chiPhiThiCong ?? 0;
          const newThiCong = info.chiPhiThiCong;
          if (oldThiCong !== newThiCong) {
            changes.push(`  + Phí thi công: từ ${oldThiCong.toLocaleString("vi-VN")}đ thành ${newThiCong.toLocaleString("vi-VN")}đ`);
          }

          // 5. So sánh sản phẩm
          const oldItemsFlat = editData.items?.map(it => `${it.tenHang} (x${it.soLuong ?? 1})`).join(",") || "";
          const newItemsFlat = validItems.map(it => `${it.ten} (x${it.soLuong})`).join(",") || "";
          
          if (oldItemsFlat !== newItemsFlat) {
            const oldItemsStr = editData.items?.map(it => `    • ${it.tenHang} (x${it.soLuong ?? 1})`).join("\n") || "    • Không có";
            const newItemsStr = validItems.map(it => `    • ${it.ten} (x${it.soLuong})`).join("\n") || "    • Không có";
            changes.push(`  + Danh sách sản phẩm thay đổi:\n  - Cũ:\n${oldItemsStr}\n  - Mới:\n${newItemsStr}`);
          }

          // Tính toán giá trị thay đổi
          const oldTotal = editData.thanhTien ?? 0;
          const diffTotal = tongCong - oldTotal;
          let diffText = "";
          if (diffTotal > 0) {
            diffText = `Tăng từ ${oldTotal.toLocaleString("vi-VN")} đồng thành ${tongCong.toLocaleString("vi-VN")} đồng (Tăng +${diffTotal.toLocaleString("vi-VN")} đồng)`;
          } else if (diffTotal < 0) {
            diffText = `Giảm từ ${oldTotal.toLocaleString("vi-VN")} đồng thành ${tongCong.toLocaleString("vi-VN")} đồng (Giảm ${Math.abs(diffTotal).toLocaleString("vi-VN")} đồng)`;
          } else {
            diffText = `Không thay đổi (${tongCong.toLocaleString("vi-VN")} đồng)`;
          }

          const ketQuaLines = [
            "Đã cập nhật báo giá",
            `- Nội dung cập nhật:${changes.length > 0 ? "\n" + changes.join("\n") : " Không có thay đổi thuộc tính chính"}`,
            `- Giá trị thay đổi: ${diffText}`
          ];
          ketQua = ketQuaLines.join("\n");
        } else {
          // Tạo mới
          const itemsStr = validItems.map(it => `  • ${it.ten} (x${it.soLuong})`).join("\n");
          ketQua = `Tạo mới báo giá thành công.\n- Tổng giá trị: ${tongCong.toLocaleString("vi-VN")} đồng\n- Trạng thái: ${STATUS_LABEL[trangThai] || trangThai}\n- Danh sách sản phẩm:\n${itemsStr || "  • Không có"}`;
        }

        await fetch(`/api/plan-finance/quotations/${quoteId}/negotiations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai: "system",
            ngay: new Date().toISOString(),
            nguoiThucHien,
            ketQua,
          }),
        }).catch(() => { });
      }

      if (mode === "draft") {
        toast.success("Lưu nháp", `Báo giá ${info.soPhieu} đã được lưu nháp`);
      } else if (pheduyet) {
        toast.success("Đang trình duyệt", `Báo giá ${info.soPhieu} đã gửi cho người phê duyệt`, 5000);
      } else {
        toast.success(editData?.id ? "Đã cập nhật" : "Đã phê duyệt", `Báo giá ${info.soPhieu} đã được ${editData?.id ? "cập nhật" : "xác nhận"}`, 5000);
      }
      onSaved?.();
      onClose();
    } catch (e: any) { setSaveError(e.message); toast.error("Lỗi", e.message); }
    finally { setSaving(false); }
  };


  const fmt = (n: number) => n.toLocaleString("vi-VN");

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "var(--background)", display: "flex", flexDirection: "column" }}>
      <style>{`
        /* Responsive styles for iPad/tablets */
        @media (max-width: 1024px) {
          .sanitary-modal-body {
            position: relative !important;
          }
          .sanitary-modal-left {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 350px !important;
            max-width: 85vw !important;
            z-index: 200 !important;
            border-right: 1px solid var(--border) !important;
            transform: translateX(-100%) !important;
            transition: transform 0.25s ease-in-out !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.25) !important;
            background: var(--card) !important;
          }
          .sanitary-modal-left.show {
            transform: translateX(0) !important;
          }
          .sanitary-modal-right {
            width: 100% !important;
            flex: 1 !important;
          }
          .sanitary-modal-toggle-btn {
            display: flex !important;
          }
          .sanitary-modal-sidebar-header {
            display: flex !important;
          }
          .sanitary-modal-table th, 
          .sanitary-modal-table td {
            padding: 6px 8px !important;
          }
          .sanitary-modal-header {
            padding: 0 12px !important;
          }
          .sanitary-modal-header-btn {
            padding: 5px 10px !important;
            font-size: 12px !important;
          }
          .sanitary-modal-header-title {
            font-size: 14px !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="sanitary-modal-header" style={{ height: 56, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#1E293B", boxShadow: "0 2px 12px rgba(0,0,0,0.2)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-file-earmark-text" style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <p className="sanitary-modal-header-title" style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "0.01em" }}>
              {editData?.id
                ? (isDirectOrder ? "Sửa đơn bán hàng (SO)" : "Sửa báo giá")
                : (isDirectOrder
                  ? (type === "retail" ? "Lập đơn hàng bán lẻ" : "Lập đơn bán hàng (SO)")
                  : (type === "retail" ? "Lập báo giá bán lẻ" : "Lập báo giá đại lý")
                )
              }
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveError && <span style={{ fontSize: 12, color: "#fca5a5", alignSelf: "center" }}><i className="bi bi-exclamation-circle" /> {saveError}</span>}
          <button className="sanitary-modal-header-btn" onClick={() => { setPrintOpen(true); setPrintAction("print"); }} style={{ padding: "6px 16px", border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="bi bi-printer" style={{ fontSize: 13 }} />
            In
          </button>
          {type !== "retail" && (
            <button className="sanitary-modal-header-btn" onClick={() => { setPrintOpen(true); setPrintAction("pdf"); }} style={{ padding: "6px 16px", border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 5 }}>
              <i className="bi bi-file-earmark-pdf" style={{ fontSize: 13 }} />
              Xuất PDF
            </button>
          )}
          <button className="sanitary-modal-header-btn" onClick={() => handleSave("submit")} disabled={saving} style={{ padding: "6px 20px", background: "#fff", color: "var(--primary)", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Đang lưu..." : (
              isDirectOrder ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="bi bi-cart-plus" />
                  Tạo đơn hàng
                </span>
              ) : type === "retail" ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="bi bi-floppy" />
                  Lưu báo giá
                </span>
              ) : (
                pheduyet ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <i className="bi bi-send" />
                    Trình duyệt
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <i className="bi bi-floppy" />
                    Lưu báo giá
                  </span>
                )
              )
            )}
          </button>
          <button onClick={onClose} style={{ width: 34, height: 34, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><i className="bi bi-x" style={{ fontSize: 18 }} /></button>
        </div>
      </div>

      <div className="sanitary-modal-body" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Backdrop for Offcanvas */}
        {showInfoSidebar && (
          <div
            onClick={() => setShowInfoSidebar(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(2.5px)",
              zIndex: 199
            }}
          />
        )}

        {/* Left Side: Info */}
        <div className={`sanitary-modal-left ${showInfoSidebar ? "show" : ""}`} style={{ width: 400, flexShrink: 0, borderRight: "1px solid var(--border)", position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 14, background: "var(--card)", overflowY: "auto" }}>
            {/* Offcanvas Header */}
            <div className="sanitary-modal-sidebar-header" style={{ display: "none", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--primary)" }}>Thông tin chung</span>
              <button type="button" onClick={() => setShowInfoSidebar(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--foreground)", padding: 4, display: "flex", alignItems: "center" }}><i className="bi bi-x-lg" /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
              <div>
                <FLabel text="Số báo giá" required />
                <input value={info.soPhieu} onChange={setInfoField("soPhieu")} readOnly={!editData?.id} style={{ ...inputSt, background: editData?.id ? "var(--background)" : "var(--muted)", fontFamily: "monospace" }} />
              </div>
              <label
                onClick={() => setUuTienCao(v => !v)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
                  padding: "7px 10px", height: "35px", boxSizing: "border-box",
                  background: uuTienCao ? "rgba(239,68,68,0.07)" : "var(--muted)",
                  borderRadius: 8,
                  border: `1px solid ${uuTienCao ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <i className="bi bi-lightning-charge-fill" style={{ fontSize: 13, color: uuTienCao ? "#ef4444" : "var(--muted-foreground)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: uuTienCao ? "#ef4444" : "var(--foreground)" }}>Ưu tiên</span>
                </div>
                <div
                  style={{
                    width: 36, height: 20, borderRadius: 10, position: "relative", transition: "background 0.2s",
                    background: uuTienCao ? "#ef4444" : "var(--border)",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: uuTienCao ? 19 : 3,
                    width: 14, height: 14, borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </div>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <FLabel text={isDirectOrder ? "Ngày đặt hàng" : "Ngày lập"} required />
                <input type="date" value={info.ngayLap} onChange={setInfoField("ngayLap")} style={inputSt} />
              </div>
              <div>
                <FLabel text={isDirectOrder ? "Ngày giao hàng" : "Hiệu lực đến"} required={isDirectOrder} />
                <input
                  type="date"
                  value={isDirectOrder ? info.ngayGiaoHang : info.hieuLuc}
                  onChange={setInfoField(isDirectOrder ? "ngayGiaoHang" : "hieuLuc")}
                  style={inputSt}
                />
              </div>
            </div>
            <div style={{ background: "var(--muted)", borderRadius: 10, padding: 12 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Khách hàng</p>
              {!editData?.id ? (
                /* Chế độ tạo mới: Nhập liệu thông tin khách hàng */
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <FLabel text="Tên khách hàng" />
                        {isCustomerNew && custInfo.name.trim().length > 0 && (
                          <span className="badge bg-success-subtle text-success ms-2 mb-1" style={{ fontSize: 9.5, padding: "2px 5px", fontWeight: 700, borderRadius: 4 }}>
                            <i className="bi bi-plus-circle me-1" />
                            Khách vãng lai
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Nhập tên khách hàng..."
                        value={custInfo.name}
                        onChange={e => setCustInfo(prev => ({ ...prev, name: e.target.value, id: "" }))}
                        style={{ ...inputSt, background: "#fff" }}
                      />
                    </div>
                    <div>
                      <FLabel text="Số điện thoại" />
                      <input
                        type="text"
                        placeholder="Nhập số điện thoại..."
                        value={custInfo.dienThoai}
                        onChange={e => setCustInfo(prev => ({ ...prev, dienThoai: e.target.value }))}
                        style={{ ...inputSt, background: "#fff" }}
                      />
                    </div>
                  </div>
                  <div>
                    <FLabel text="Địa chỉ" />
                    <input
                      type="text"
                      placeholder="Nhập địa chỉ..."
                      value={custInfo.address}
                      onChange={e => setCustInfo(prev => ({ ...prev, address: e.target.value }))}
                      style={{ ...inputSt, background: "#fff" }}
                    />
                  </div>
                  {debtInfo && (
                    <div style={{
                      marginTop: 6,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      background: "rgba(59,130,246,0.06)",
                      padding: 8,
                      borderRadius: 8,
                      border: "1px dashed rgba(59,130,246,0.2)"
                    }}>
                      <div>
                        <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>CÔNG NỢ HIỆN TẠI</span>
                        <strong style={{ fontSize: 11.5, color: "#ef4444" }}>{debtInfo.outstandingDebt.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>HẠN MỨC CÔNG NỢ</span>
                        <strong style={{ fontSize: 11.5, color: "var(--primary)" }}>{debtInfo.creditLimit.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Chế độ xem/sửa: Hiển thị tĩnh */
                customer?.nhom === "doanh-nghiep" || customer?.nhom === "doi-tac" ? (
                  /* Doanh nghiệp / Đối tác */
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{customer?.name || "—"}</span>
                    {customer?.address && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                        <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.3 }}>{customer.address}</span>
                      </div>
                    )}
                    {customer?.daiDien && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="bi bi-person-fill" style={{ fontSize: 11, color: "var(--primary)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                          {customer.xungHo ? `${customer.xungHo} ` : ""}{customer.daiDien}
                          {customer.chucVu && <span style={{ fontStyle: "italic", marginLeft: 4 }}>– {customer.chucVu}</span>}
                        </span>
                      </div>
                    )}
                    {(customer?.dienThoai || customer?.email) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
                        {customer.dienThoai && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                            <i className="bi bi-telephone-fill" style={{ fontSize: 10, color: "#10b981" }} />
                            {customer.dienThoai}
                          </div>
                        )}
                        {customer.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                            <i className="bi bi-envelope-fill" style={{ fontSize: 10, color: "#6366f1" }} />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    )}
                    {debtInfo && (
                      <div style={{
                        marginTop: 6,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        background: "rgba(59,130,246,0.06)",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px dashed rgba(59,130,246,0.2)"
                      }}>
                        <div>
                          <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>CÔNG NỢ HIỆN TẠI</span>
                          <strong style={{ fontSize: 11.5, color: "#ef4444" }}>{debtInfo.outstandingDebt.toLocaleString("vi-VN")} ₫</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>HẠN MỨC CÔNG NỢ</span>
                          <strong style={{ fontSize: 11.5, color: "var(--primary)" }}>{debtInfo.creditLimit.toLocaleString("vi-VN")} ₫</strong>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Cá nhân / Khách lẻ */
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                      {customer?.daiDien
                        ? `${customer.xungHo ? customer.xungHo + " " : ""}${customer.daiDien}`
                        : customer?.name || "—"}
                    </span>
                    {customer?.address && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                        <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.3 }}>{customer.address}</span>
                      </div>
                    )}
                    {(customer?.dienThoai || customer?.email) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
                        {customer?.dienThoai && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                            <i className="bi bi-telephone-fill" style={{ fontSize: 10, color: "#10b981" }} />
                            {customer.dienThoai}
                          </div>
                        )}
                        {customer?.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                            <i className="bi bi-envelope-fill" style={{ fontSize: 10, color: "#6366f1" }} />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    )}
                    {debtInfo && (
                      <div style={{
                        marginTop: 6,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        background: "rgba(59,130,246,0.06)",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px dashed rgba(59,130,246,0.2)"
                      }}>
                        <div>
                          <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>CÔNG NỢ HIỆN TẠI</span>
                          <strong style={{ fontSize: 11.5, color: "#ef4444" }}>{debtInfo.outstandingDebt.toLocaleString("vi-VN")} ₫</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>HẠN MỨC CÔNG NỢ</span>
                          <strong style={{ fontSize: 11.5, color: "var(--primary)" }}>{debtInfo.creditLimit.toLocaleString("vi-VN")} ₫</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><FLabel text="Chiết khấu tổng (%)" /><input type="number" value={info.chietKhauTong} onChange={setInfoField("chietKhauTong")} style={inputSt} /></div>
              <div><FLabel text="Thuế VAT (%)" /><input type="number" value={info.thue} onChange={setInfoField("thue")} style={inputSt} /></div>
            </div>
            {type !== "retail" && !isDirectOrder && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <FLabel text="Loại báo giá" />
                    <label
                      onClick={() => setInfo(f => ({ ...f, quoteType: f.quoteType === "Có quầy kệ" ? "Không có quầy kệ" : "Có quầy kệ" }))}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
                        padding: "7px 10px", height: "35px", boxSizing: "border-box",
                        background: info.quoteType === "Có quầy kệ" ? "rgba(59,130,246,0.07)" : "var(--muted)",
                        borderRadius: 8,
                        border: `1px solid ${info.quoteType === "Có quầy kệ" ? "rgba(59,130,246,0.3)" : "var(--border)"}`,
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <i className="bi bi-shop" style={{ fontSize: 13, color: info.quoteType === "Có quầy kệ" ? "#3b82f6" : "var(--muted-foreground)" }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: info.quoteType === "Có quầy kệ" ? "#3b82f6" : "var(--foreground)" }}>Có quầy kệ</span>
                      </div>
                      <div
                        style={{
                          width: 36, height: 20, borderRadius: 10, position: "relative", transition: "background 0.2s",
                          background: info.quoteType === "Có quầy kệ" ? "#3b82f6" : "var(--border)",
                        }}
                      >
                        <div style={{
                          position: "absolute", top: 3, left: info.quoteType === "Có quầy kệ" ? 19 : 3,
                          width: 14, height: 14, borderRadius: "50%", background: "#fff",
                          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }} />
                      </div>
                    </label>
                  </div>
                  <div>
                    <FLabel text="Chi phí thi công lắp đặt (đ)" />
                    <CurrencyInput
                      value={info.chiPhiThiCong}
                      onChange={(v) => setInfo(f => ({ ...f, chiPhiThiCong: v }))}
                      placeholder="0"
                      disabled={!isCoQuayKe}
                      style={{ ...inputSt, background: isCoQuayKe ? "var(--background)" : "var(--muted)", cursor: isCoQuayKe ? undefined : "not-allowed" }}
                    />
                  </div>
                </div>
                {isSanitary && (
                  <div>
                    <FLabel text="Bản vẽ đính kèm" />
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {renderAttachmentButton({ label: "Bản vẽ 3D", fileUrl: info.file3DUrl || "", uploadKey: "file3DUrl", disabled: !isCoQuayKe })}
                      {renderAttachmentButton({ label: "Bản vẽ chi tiết", fileUrl: info.fileDetailUrl || "", uploadKey: "fileDetailUrl", disabled: !isCoQuayKe })}
                      {renderAttachmentButton({ label: "Bản vẽ mặt bằng", fileUrl: info.fileLayoutUrl || "", uploadKey: "fileLayoutUrl", disabled: !isCoQuayKe })}
                    </div>
                    {isCoQuayKe && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
                        <div>
                          <FLabel text="Số khu vực" />
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={soKhuVuc}
                            onChange={e => setSoKhuVuc(Math.max(1, Number(e.target.value)))}
                            style={inputSt}
                          />
                        </div>
                        <div>
                          <FLabel text="Tỷ lệ giá đại lý (%)" />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={tyLeGiaDaiLy}
                            onChange={e => handleTyLeGiaDaiLyChange(Math.max(0, Number(e.target.value)))}
                            style={inputSt}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <FLabel text="Điều khoản tham chiếu" />
              <textarea
                value={info.ghiChu}
                onChange={e => {
                  isGhiChuEdited.current = true;
                  setInfo(prev => ({ ...prev, ghiChu: e.target.value }));
                }}
                style={{ ...inputSt, flex: 1, resize: "none", minHeight: 80 }}
              />
            </div>

          </div> {/* close inner panel */}

          {/* Drawings Sidebar overlay */}
          {showDrawings && isCoQuayKe && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "var(--card)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              padding: 20,
              borderRight: "1px solid var(--border)",
              overflowY: "auto"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--primary)" }}>Bản vẽ đính kèm</span>
                <button onClick={() => setShowDrawings(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--foreground)", display: "flex", alignItems: "center" }}><i className="bi bi-x-lg" /></button>
              </div>
              {(!info.file3DUrl && !info.fileDetailUrl && !info.fileLayoutUrl) ? (
                <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                  Chưa có bản vẽ nào được tải lên
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {info.file3DUrl && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>BẢN VẼ 3D</span>
                      <a href={info.file3DUrl} target="_blank" rel="noopener noreferrer">
                        <img src={info.file3DUrl} alt="Bản vẽ 3D" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"} />
                      </a>
                    </div>
                  )}
                  {info.fileDetailUrl && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>BẢN VẼ CHI TIẾT</span>
                      <a href={info.fileDetailUrl} target="_blank" rel="noopener noreferrer">
                        <img src={info.fileDetailUrl} alt="Bản vẽ chi tiết" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"} />
                      </a>
                    </div>
                  )}
                  {info.fileLayoutUrl && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>BẢN VẼ MẶT BẰNG</span>
                      <a href={info.fileLayoutUrl} target="_blank" rel="noopener noreferrer">
                        <img src={info.fileLayoutUrl} alt="Bản vẽ mặt bằng" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Items Table */}
        <div className="sanitary-modal-right" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="sanitary-modal-toggle-btn"
                onClick={() => setShowInfoSidebar(true)}
                style={{
                  padding: "5px 10px",
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "none",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <i className="bi bi-layout-sidebar-inset" />
                Thông tin chung
              </button>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bảng danh sách hàng hoá</span>
              <TrangThaiTonKhoBadge
                items={items.map(it => ({ ten: it.ten, soLuong: it.soLuong, soLuongTon: it.soLuongTon }))}
                showPurchaseRequest={false}
              />
            </div>
            {/* Phê duyệt switch */}
            {type !== "retail" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={pheduyet} onChange={e => setPheduyet(e.target.checked)} /> Cần phê duyệt
                </label>
                {pheduyet && (
                  <select value={approverId} onChange={e => setApproverId(e.target.value)} style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                    <option value="">— Chọn người phê duyệt —</option>
                    {approvers.map(a => <option key={a.id} value={a.id}>{a.name}</option>
                    )}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="sanitary-modal-table-container" style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Form nhập liệu (Chỉ dành cho Bán lẻ / Không quầy kệ) */}
            {!isCoQuayKe && (
              <div style={{ padding: 16, background: "rgba(59,130,246,0.04)", border: "1px dashed rgba(59,130,246,0.3)", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 100%", display: "flex", gap: 12 }}>
                  <div style={{ flex: "2 1 250px", position: "relative" }}>
                    <FLabel text="Sản phẩm / Dịch vụ" required />
                    <input
                      value={formItem.ten}
                      placeholder="Nhập tên hoặc mã SKU sản phẩm..."
                      onChange={e => {
                        const v = e.target.value;
                        setFormItem(prev => ({ ...prev, ten: v }));
                        if (!v) {
                          setSuggest([]);
                        } else {
                          setActiveRowIdSync(-1);
                          fetchSuggest(v, -1);
                        }
                      }}
                      onFocus={e => { setActiveRowIdSync(-1); fetchSuggest(formItem.ten, -1); e.currentTarget.style.border = "1px solid var(--primary)"; }}
                      onBlur={e => { e.currentTarget.style.border = "1px solid var(--border)"; setTimeout(() => { if (activeRowIdRef.current === -1) { setSuggest([]); setActiveRowIdSync(null); } }, 200); }}
                      style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", background: "#fff", outline: "none", borderRadius: 6, fontFamily: "inherit", fontSize: 13, color: "var(--foreground)", transition: "border-color 0.15s" }}
                    />
                    {activeRowId === -1 && suggest.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                        {suggest.map(s => (
                          <div key={s.id} onClick={() => applySuggest(-1, s)}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                          >
                            <div style={{ fontWeight: 600 }}>{s.tenHang}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 8, marginTop: 2 }}>
                              {s.code && <span style={{ fontFamily: "monospace", background: "var(--muted)", padding: "0 5px", borderRadius: 4 }}>{s.code}</span>}
                              <span>Tồn: <b>{s.soLuongThuc ?? s.soLuong}</b> {s.donVi}</span>
                              <span>Giá: <b>{s.giaBan.toLocaleString("vi-VN")} ₫</b></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: "1 1 110px", maxWidth: 180 }}>
                    <FLabel text="Mã định mức" />
                    <select
                      value={formItem.dinhMucId || ""}
                      onChange={e => {
                        const dmId = e.target.value;
                        const dm = formItem.dinhMucs?.find(x => x.id === dmId);
                        setFormItem(p => ({
                          ...p,
                          dinhMucId: dmId,
                          dinhMucTen: dm ? dm.tenDinhMuc : null,
                          donGia: dm ? (dm.giaBan ?? 0) : p.donGia
                        }));
                      }}
                      disabled={formItem.source === "inventory"}
                      style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: formItem.source === "inventory" ? "var(--muted)" : "#fff", outline: "none", fontFamily: "inherit", fontSize: 13, color: formItem.source === "inventory" ? "var(--muted-foreground)" : "var(--foreground)", cursor: formItem.source === "inventory" ? "not-allowed" : "default" }}
                    >
                      {formItem.dinhMucs?.map((dm: any) => (
                        <option key={dm.id} value={dm.id}>{dm.code}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: "2 1 240px" }}>
                    <FLabel text="Mô tả định mức" />
                    <div className="d-flex gap-2">
                      <input
                        value={formItem.dinhMucTen || ""}
                        readOnly
                        placeholder="Tự động hiển thị..."
                        style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--muted-foreground)", cursor: "not-allowed" }}
                      />
                      <button
                        type="button"
                        className="btn btn-light border"
                        onClick={() => setShowBomDetail(true)}
                        disabled={!formItem.dinhMucId}
                        style={{ padding: "7px 12px", borderRadius: 6 }}
                        title="Xem chi tiết định mức"
                      >
                        <i className="bi bi-three-dots"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <FLabel text="Tên kho" />
                  <input
                    value={formItem.khoTen || ""}
                    readOnly
                    placeholder="Tự động..."
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--muted-foreground)", cursor: "not-allowed" }}
                  />
                </div>
                <div style={{ flex: "1 1 80px" }}>
                  <FLabel text="Đơn vị tính" />
                  <input value={formItem.dvt} onChange={e => setFormItem(p => ({ ...p, dvt: e.target.value }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "center", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
                </div>
                <div style={{ flex: "1 1 90px" }}>
                  <FLabel text="Số lượng" required />
                  <input type="number" min={1} value={formItem.soLuong} onChange={e => setFormItem(p => ({ ...p, soLuong: Math.max(1, Number(e.target.value)) }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
                </div>
                <div style={{ flex: "1 1 90px" }}>
                  <FLabel text="Chiết khấu (%)" />
                  <input type="number" min={0} max={100} value={formItem.ckPct} onChange={e => setFormItem(p => ({ ...p, ckPct: Math.max(0, Math.min(100, Number(e.target.value))) }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <FLabel text="Đơn giá (đ)" />
                  <CurrencyInput
                    value={formItem.donGia}
                    onChange={v => !(!isAdmin) && setFormItem(p => ({ ...p, donGia: v }))}
                    readOnly={!isAdmin}
                    placeholder="0"
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: !isAdmin ? "var(--muted)" : "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: !isAdmin ? "var(--muted-foreground)" : "var(--foreground)", cursor: !isAdmin ? "not-allowed" : "text" }}
                  />
                </div>
                <div>
                  <button onClick={addRow} style={{ padding: "7px 14px", border: "none", background: "var(--primary)", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, height: 33 }}>
                    <i className="bi bi-plus-lg" /> Thêm
                  </button>
                </div>
              </div>
            )}

            <table className="sanitary-modal-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--muted)", textAlign: "left" }}>
                  {isCoQuayKe ? (
                    <>
                      <th style={{ padding: 10, width: 40 }}>#</th>
                      <th style={{ padding: 10 }}>Tên hàng hoá</th>
                      <th style={{ padding: 10, width: 120 }}>Vị trí</th>
                      <th style={{ padding: 10, width: 100 }}>Quy cách</th>
                      <th style={{ padding: 10, width: 120, textAlign: "right" }}>Giá bán (đ)</th>
                      <th style={{ padding: 10, width: 120, textAlign: "right" }}>Giá đại lý (đ)</th>
                      <th style={{ padding: 10, width: 40 }} />
                    </>
                  ) : (
                    <>
                      <th style={{ padding: 10, width: 40 }}>#</th>
                      <th style={{ padding: 10 }}>Tên hàng hoá - Dịch vụ</th>
                      <th style={{ padding: 10, width: 70, textAlign: "center" }}>ĐVT</th>
                      <th style={{ padding: 10, width: 90, textAlign: "center" }}>Số lượng</th>
                      <th style={{ padding: 10, width: 110, textAlign: "center" }}>Chiết khấu (%)</th>
                      <th style={{ padding: 10, width: 130, textAlign: "right" }}>Đơn giá (đ)</th>
                      <th style={{ padding: 10, width: 130, textAlign: "right" }}>Thành tiền (đ)</th>
                      <th style={{ padding: 10, width: 40 }} />
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isCoQuayKe ? (
                  soKhuVuc > 1 ? (
                    Array.from({ length: soKhuVuc }).map((_, kvIdx) => {
                      const areaName = `Khu vực ${kvIdx + 1}`;
                      const isCollapsed = !!collapsedAreas[areaName];
                      const areaItems = items.filter(it => it.viTri === areaName);

                      return (
                        <React.Fragment key={areaName}>
                          {/* Accordion Header Row */}
                          <tr
                            onClick={() => setCollapsedAreas(prev => ({ ...prev, [areaName]: !prev[areaName] }))}
                            style={{ background: "rgba(59,130,246,0.06)", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                          >
                            <td colSpan={7} style={{ padding: "10px 12px", fontWeight: 800, color: "var(--primary)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <i className={`bi bi-chevron-${isCollapsed ? "right" : "down"}`} style={{ fontSize: 13 }} />
                                  <span>{areaName}</span>
                                  <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 10 }}>
                                    {areaItems.length} mặt hàng
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Accordion Content Rows */}
                          {!isCollapsed && (
                            <>
                              {areaItems.map((it, areaItemIdx) => renderQuayKeRow(it, areaItemIdx))}

                              <tr>
                                <td colSpan={7} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                                  <button
                                    onClick={() => {
                                      setItems(r => [...r, { id: nextId.current++, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, giaDaiLy: 0, viTri: areaName }]);
                                    }}
                                    style={{
                                      padding: "5px 12px",
                                      border: "1px dashed var(--primary)",
                                      background: "none",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      color: "var(--primary)",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      transition: "all 0.15s"
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.05)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                                  >
                                    <i className="bi bi-plus-lg" /> Thêm dòng vào {areaName}
                                  </button>
                                </td>
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    items.map((it, idx) => renderQuayKeRow(it, idx))
                  )
                ) : (
                  items.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)" }}>Chưa có sản phẩm nào</td></tr>
                  ) : items.map((it, idx) => (
                    <tr key={it.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: 10, color: "var(--muted-foreground)" }}>{idx + 1}</td>
                      <td style={{ padding: "6px 10px", position: "relative" }}>
                        {it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (() => {
                          const ton = it.soLuongTon as number;
                          if (ton === 0) return (
                            <span title="Hết hàng" style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#ef4444", pointerEvents: "none", display: "flex" }}>
                              <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
                            </span>
                          );
                          if (it.soLuong > ton) return (
                            <span title={`Thiếu hàng (tồn: ${ton})`} style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#f97316", pointerEvents: "none", display: "flex" }}>
                              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 12 }} />
                            </span>
                          );
                          return null;
                        })()}
                        <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{it.ten}</span>
                      </td>
                      <td style={{ padding: 6, textAlign: "center" }}>{it.dvt}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{it.soLuong}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{it.ckPct}</td>
                      <td style={{ padding: 6, textAlign: "right" }}>{fmt(it.donGia)}</td>
                      <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{fmt(thanhTien(it))} đ</td>
                      <td style={{ padding: 6 }}>
                        <button onClick={() => removeRow(it.id)} style={{ padding: 4, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!(isCoQuayKe) && false /* hidden as we use the form instead */}
          </div>

          <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card)" }}>
            <div>
              {isCoQuayKe && (() => {
                const hasDrawings = !!(info.file3DUrl || info.fileDetailUrl || info.fileLayoutUrl);
                return (
                  <button
                    disabled={!hasDrawings}
                    onClick={() => setShowDrawings(v => !v)}
                    style={{
                      padding: "6px 14px",
                      border: "1.5px solid var(--primary)",
                      background: showDrawings ? "var(--primary)" : "transparent",
                      color: showDrawings ? "#fff" : "var(--primary)",
                      borderRadius: 8,
                      cursor: hasDrawings ? "pointer" : "not-allowed",
                      fontSize: 13,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      opacity: hasDrawings ? 1 : 0.4,
                      transition: "all 0.15s"
                    }}
                  >
                    <i className="bi bi-image" /> {showDrawings ? "Ẩn bản vẽ" : "Xem bản vẽ"}
                  </button>
                );
              })()}
            </div>
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Tạm tính</p><p style={{ margin: 0, fontWeight: 700 }}>{fmt(tamTinh)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Khấu trừ</p><p style={{ margin: 0, fontWeight: 700 }}>− {fmt(ckTien)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Thuế</p><p style={{ margin: 0, fontWeight: 700 }}>+ {fmt(thueTien)} ₫</p></div>
              {info.chiPhiThiCong > 0 && <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Chi phí thi công</p><p style={{ margin: 0, fontWeight: 700 }}>+ {fmt(info.chiPhiThiCong)} ₫</p></div>}
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--primary)" }}>TỔNG CỘNG</p><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--primary)" }}>{fmt(tongCong)} ₫</p></div>
            </div>
          </div>
        </div>
      </div>
      <PrintPreviewModal open={printOpen} onClose={() => { setPrintOpen(false); setPrintAction(""); }} customer={customer} items={items} info={info} initialAction={printAction} />
    </div>
  );
}
