"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { ModernStepper } from "@/components/ui/ModernStepper";

export interface BaoGiaWoodDoorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  employees: any[];
  currentUserEmployeeId?: string | null;
}

const INITIAL_PHU_KIEN = [
  { id: "1", loai: "Bản lề", sanPham: "Bản lề Inox 304 Häfele", soLuong: 4, donVi: "cái" },
  { id: "2", loai: "Khóa", sanPham: "Khóa tay gạt Huy Hoàng", soLuong: 1, donVi: "bộ" },
  { id: "3", loai: "Hít cửa", sanPham: "Hít cửa nam châm Häfele", soLuong: 1, donVi: "cái" },
];

const INITIAL_VAT_TU_PHU = [
  { id: "1", loai: "Keo bọt", sanPham: "Keo bọt nở Soudal", soLuong: 1, donVi: "chai" },
  { id: "2", loai: "Vít", sanPham: "Vít sắt lắp đặt 10cm", soLuong: 16, donVi: "cái" },
  { id: "3", loai: "Silicon", sanPham: "Keo Silicon Apollo A500", soLuong: 1, donVi: "chai" },
];

const INITIAL_VAT_TU_CHINH = [
  { id: "1", hangMuc: "Da cửa", loaiVatLieu: "MDF phủ Melamine 6mm", donVi: "m2", day: 6, rong: 1000, cao: 2200, heSo: 2, soLuongTamCat: 2, tongThanhCan: 0, soTamCan: 0, cong: 4.4, offcut: 0, quyDoi: 1, haoHut: 5, tongCong: 1.05 },
  { id: "2", hangMuc: "Xương cửa", loaiVatLieu: "Gỗ tự nhiên ghép thanh", donVi: "m3", day: 38, rong: 45, cao: 2200, heSo: 5, soLuongTamCat: 0, tongThanhCan: 4, soTamCan: 0, cong: 0.015, offcut: 0, quyDoi: 0, haoHut: 10, tongCong: 0.017 },
  { id: "3", hangMuc: "Giấy tổ ong", loaiVatLieu: "Giấy tổ ong (Honeycomb)", donVi: "m2", day: 28, rong: 900, cao: 2100, heSo: 0.5, soLuongTamCat: 1, tongThanhCan: 0, soTamCan: 0, cong: 1.89, offcut: 0, quyDoi: 0.5, haoHut: 3, tongCong: 0.52 },
  { id: "4", hangMuc: "Xương khuôn", loaiVatLieu: "Gỗ tự nhiên ghép thanh", donVi: "m3", day: 45, rong: 110, cao: 2300, heSo: 2.5, soLuongTamCat: 0, tongThanhCan: 3, soTamCan: 0, cong: 0.034, offcut: 0, quyDoi: 0, haoHut: 8, tongCong: 0.037 },
  { id: "5", hangMuc: "MDF", loaiVatLieu: "Tấm MDF chống ẩm 6mm", donVi: "m2", day: 6, rong: 1220, cao: 2440, heSo: 2.5, soLuongTamCat: 2, tongThanhCan: 0, soTamCan: 2, cong: 5.95, offcut: 0, quyDoi: 2, haoHut: 5, tongCong: 2.1 },
];

interface CalcRowItem {
  id: string;
  label: string;
  isParent?: boolean;
  unit?: string;
  material?: string;
  factor?: string;
  thickness?: string;
  width?: string;
  height?: string;
  spPerSheet?: string;
  quantity?: string;
  lossRate?: string;
  total?: string;
}

const INITIAL_CALC_ROWS: CalcRowItem[] = [
  { id: "1", label: "Cánh cửa", isParent: true },
  { id: "1.1", label: "Da cửa", unit: "m²", material: "", factor: "2", thickness: "3", lossRate: "1" },
  { id: "1.2", label: "Xương cửa", unit: "m³", material: "", factor: "5", thickness: "38", lossRate: "1" },
  { id: "1.3", label: "Giấy tổ ong", unit: "m²", material: "", factor: "0.5", thickness: "28", lossRate: "1" },
  { id: "2", label: "Khuôn cửa", isParent: true },
  { id: "2.1", label: "Xương khuôn", unit: "m³", material: "", factor: "2.5", thickness: "45", lossRate: "1" },
  { id: "2.2", label: "MDF", unit: "m²", material: "", factor: "2.5", thickness: "9", lossRate: "1" },
  { id: "3", label: "Nẹp, ốp", isParent: true },
  { id: "3.1", label: "Nẹp thẳng", unit: "tấm", material: "", factor: "2.5", thickness: "9", lossRate: "1" },
  { id: "3.2", label: "Nẹp chân L", unit: "tấm", material: "", factor: "2.5", thickness: "9", lossRate: "1" },
  { id: "3.3", label: "Nẹp thân L", unit: "tấm", material: "", factor: "2.5", thickness: "9", lossRate: "1" },
  { id: "3.4", label: "Ốp cửa", unit: "tấm", material: "", factor: "2.5", thickness: "9", lossRate: "1" },
  { id: "4", label: "Phụ kiện", isParent: true },
  { id: "4.1", label: "Khoá cửa", unit: "cái", material: "", factor: "1", lossRate: "0" },
  { id: "4.2", label: "Bản lề", unit: "cái", material: "", factor: "4", lossRate: "0" },
  { id: "4.3", label: "Mắt thần", unit: "cái", material: "", factor: "1", lossRate: "0" },
  { id: "4.4", label: "Tay ấn thuỷ lực", unit: "cái", material: "", factor: "1", lossRate: "0" },
  { id: "5", label: "Vật tư tiêu hao", isParent: true },
  { id: "5.1", label: "Goăng giảm chấn", unit: "m", material: "", factor: "", lossRate: "1" },
  { id: "5.2", label: "Nẹp dán cánh", unit: "m", material: "", factor: "", lossRate: "1" },
  { id: "5.3", label: "Nẹp dán khuôn", unit: "m", material: "", factor: "", lossRate: "1" },
  { id: "5.4", label: "Nẹp dán phào", unit: "m", material: "", factor: "", lossRate: "1" },
  { id: "5.5", label: "Nẹp dán phào L", unit: "m", material: "", factor: "", lossRate: "1" },
  { id: "5.6", label: "Keo sữa", unit: "kg", material: "", factor: "", lossRate: "0" },
  { id: "5.7", label: "Keo dán cạnh", unit: "kg", material: "", factor: "", lossRate: "1" },
  { id: "5.8", label: "Gim", unit: "thanh", material: "", factor: "", lossRate: "1" },
  { id: "5.9", label: "Vít 40mm", unit: "cái", material: "", factor: "", lossRate: "1" },
  { id: "5.10", label: "Vít 100mm", unit: "cái", material: "", factor: "", lossRate: "1" },
  { id: "5.11", label: "Màng bọc", unit: "cuộn", material: "", factor: "0.2", lossRate: "1" },
  { id: "5.12", label: "Bọc góc", unit: "kg", material: "", factor: "0.04", lossRate: "1" },
  { id: "5.13", label: "Bìa bọc hông", unit: "kg", material: "", factor: "1", lossRate: "1" },
  { id: "5.14", label: "Băng dính", unit: "cuộn", material: "", factor: "0.2", lossRate: "1" }
];

function numberToVNWords(n: number): string {
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

function renderSpecs(specsText: string) {
  if (!specsText) return null;
  const lines = specsText
    .split(/\n| - | -/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return (
    <ul style={{
      margin: "4px 0 0",
      paddingLeft: "16px",
      fontSize: "11px",
      color: "var(--muted-foreground)",
      listStyleType: "disc",
      lineHeight: "1.4",
      textAlign: "left"
    }}>
      {lines.map((line, i) => {
        const cleanLine = line.replace(/^[-\s•*]+/, "").trim();
        if (!cleanLine) return null;
        return (
          <li key={i} style={{ marginBottom: "2px" }}>
            {cleanLine}
          </li>
        );
      })}
    </ul>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split("\n");
  const parsedElements: React.ReactNode[] = [];

  let currentSectionTitle = "";
  let currentSectionBlocks: React.ReactNode[] = [];
  let sectionIndex = 0;
  let processingIntro = true;
  let introLines: string[] = [];

  const renderSection = (title: string, blocks: React.ReactNode[], index: number) => {
    let icon = "bi-bar-chart-steps";
    let bgHeader = "#f8f9fa";
    let textHeader = "#212529";

    const titleLower = title.toLowerCase();
    if (titleLower.includes("cơ cấu") || titleLower.includes("chi phí")) {
      icon = "bi-pie-chart-fill";
      bgHeader = "#eef2ff";
      textHeader = "#4f46e5";
    } else if (titleLower.includes("hiệu quả") || titleLower.includes("kinh doanh")) {
      icon = "bi-graph-up-arrow";
      bgHeader = "#f0fdf4";
      textHeader = "#16a34a";
    } else if (titleLower.includes("thị trường") || titleLower.includes("giá bán")) {
      icon = "bi-shop";
      bgHeader = "#ecfeff";
      textHeader = "#0891b2";
    } else if (titleLower.includes("khuyến nghị") || titleLower.includes("tối ưu")) {
      icon = "bi-lightbulb-fill";
      bgHeader = "#fffbeb";
      textHeader = "#d97706";
    }

    return (
      <div
        key={`sec-${index}`}
        className="card border-0 shadow-sm mb-3"
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="card-header py-2 px-3 border-0 d-flex align-items-center gap-2"
          style={{
            backgroundColor: bgHeader,
            color: textHeader,
            fontWeight: "bold",
            fontSize: "12.5px"
          }}
        >
          <i className={`bi ${icon}`} style={{ fontSize: "14px" }} />
          <span>{title.replace(/^\d+\.\s*/, "").replace(/^###\s*/, "")}</span>
        </div>
        <div className="card-body p-3 bg-white d-flex flex-column gap-2" style={{ fontSize: "12px", lineHeight: "1.5" }}>
          {blocks}
        </div>
      </div>
    );
  };

  const parseInlineBold = (lineText: string) => {
    const parts = lineText.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, pi) =>
      pi % 2 === 1
        ? <strong key={pi} className="fw-bold" style={{ color: "var(--bs-emphasis-color)" }}>{part}</strong>
        : part.replace(/\*/g, "") // Strip raw single asterisks from plain text
    );
  };

  const processLineItem = (line: string, idx: number) => {
    const cleanLine = line.replace(/^[*-•\s]+/g, "").trim();
    if (!cleanLine) return null;

    const lowerLine = cleanLine.toLowerCase();
    const isCritical = lowerLine.includes("nghiêm trọng") || lowerLine.includes("nguy hiểm") || lowerLine.includes("thất thoát") || lowerLine.includes("lỗ ngầm") || lowerLine.includes("0 đ") || lowerLine.includes("0đ");
    const isWarning = lowerLine.includes("lệch lạc") || lowerLine.includes("cảnh báo") || lowerLine.includes("không hợp lý") || lowerLine.includes("chưa hợp lý") || lowerLine.includes("rủi ro");
    const isSuccess = lowerLine.includes("hợp lý") || lowerLine.includes("an toàn") || lowerLine.includes("ổn định") || lowerLine.includes("hiệu quả");

    let alertClass = "p-2 rounded-2 bg-light border-0 text-dark";
    let icon = "bi-dot text-secondary";
    let borderLeftStyle = "none";

    if (isCritical) {
      alertClass = "alert alert-danger border-0 m-0 py-2 px-2.5 shadow-none";
      icon = "bi-exclamation-triangle-fill text-danger";
      borderLeftStyle = "3px solid #dc3545";
    } else if (isWarning) {
      alertClass = "alert alert-warning border-0 m-0 py-2 px-2.5 shadow-none";
      icon = "bi-exclamation-circle-fill text-warning";
      borderLeftStyle = "3px solid #ffc107";
    } else if (isSuccess) {
      alertClass = "alert alert-success border-0 m-0 py-2 px-2.5 shadow-none";
      icon = "bi-check-circle-fill text-success";
      borderLeftStyle = "3px solid #198754";
    } else {
      alertClass = "p-2 rounded-2 bg-light border-0 text-dark";
      icon = "bi-arrow-right-short text-primary";
    }

    return (
      <div
        key={`li-${idx}`}
        className={`${alertClass} d-flex align-items-start gap-2`}
        style={{
          fontSize: "12px",
          borderLeft: borderLeftStyle,
          borderRadius: "8px"
        }}
      >
        <i className={`bi ${icon}`} style={{ fontSize: "14px", marginTop: "1px", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>{parseInlineBold(cleanLine)}</div>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cleaned = line.replace(/^[#\s*_*-]+/g, "").replace(/[#\s*_*-:]+$/g, "").trim();
    const isSectionHeading = /^\d+\./.test(cleaned);
    const isMainHeading = !isSectionHeading && (line.startsWith("#") || (line.startsWith("**") && line.endsWith("**") && line.length > 10));

    if (isMainHeading) {
      processingIntro = false;
      if (currentSectionTitle) {
        parsedElements.push(renderSection(currentSectionTitle, currentSectionBlocks, sectionIndex++));
        currentSectionBlocks = [];
        currentSectionTitle = "";
      }
      parsedElements.push(
        <h6 key={`main-head-${i}`} className="fw-bold text-dark border-bottom pb-2 mb-3 mt-3 d-flex align-items-center gap-2" style={{ fontSize: "13px" }}>
          {parseInlineBold(cleaned)}
        </h6>
      );
    } else if (isSectionHeading) {
      processingIntro = false;
      if (currentSectionTitle) {
        parsedElements.push(renderSection(currentSectionTitle, currentSectionBlocks, sectionIndex++));
        currentSectionBlocks = [];
      }
      currentSectionTitle = cleaned;
    } else if (processingIntro) {
      if (line !== "---") {
        introLines.push(line.replace(/^[*-•\s]+/g, ""));
      }
    } else {
      const isBullet = /^[*-]\s+/.test(line);
      if (isBullet) {
        const item = processLineItem(line, i);
        if (item) currentSectionBlocks.push(item);
      } else {
        if (currentSectionTitle) {
          currentSectionBlocks.push(
            <p key={`p-${i}`} className="text-muted m-0" style={{ fontSize: "12px", fontStyle: "italic" }}>
              {parseInlineBold(line.replace(/^[*-•\s]+/g, ""))}
            </p>
          );
        } else {
          parsedElements.push(
            <p key={`p-${i}`} className="text-dark mb-2 px-1" style={{ fontSize: "12px" }}>
              {parseInlineBold(line.replace(/^[*-•\s]+/g, ""))}
            </p>
          );
        }
      }
    }
  }

  if (currentSectionTitle) {
    parsedElements.push(renderSection(currentSectionTitle, currentSectionBlocks, sectionIndex++));
  }

  return (
    <div>
      {introLines.length > 0 && (
        <div className="mb-3 p-3 rounded-3 border-0 d-flex gap-2.5 align-items-start" style={{ backgroundColor: "#f8f9fa", color: "#374151" }}>
          <div className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle flex-shrink-0" style={{ width: "32px", height: "32px" }}>
            <i className="bi bi-robot" style={{ fontSize: "16px" }} />
          </div>
          <div>
            <span className="fw-bold d-block text-dark mb-1" style={{ fontSize: "12.5px" }}>Nhận xét tổng quan</span>
            <p className="m-0 text-muted" style={{ fontSize: "12px", lineHeight: "1.45" }}>
              {parseInlineBold(introLines.join(" "))}
            </p>
          </div>
        </div>
      )}

      {parsedElements}
    </div>
  );
}

const parseDimensions = (kichThuocStr: string) => {
  if (!kichThuocStr) return { cao: 0, rong: 0, day: 0 };

  // Clean up thousand separators (dots followed by 3 digits) first
  // E.g. "2.210" -> "2210", "1.000" -> "1000"
  let cleanStr = kichThuocStr.replace(/\b(\d+)\.(\d{3})\b/g, "$1$2");

  // Split by x or X or asterisk or times symbol
  const parts = cleanStr.split(/[x*X×]/).map(p => {
    const digits = p.replace(/\D/g, "");
    return digits ? Number(digits) : 0;
  });

  if (parts.length >= 3) {
    return {
      cao: parts[0],
      rong: parts[1],
      day: parts[2]
    };
  }

  const matches = cleanStr.match(/\d+/g);
  if (matches && matches.length >= 3) {
    return {
      cao: Number(matches[0]),
      rong: Number(matches[1]),
      day: Number(matches[2])
    };
  }
  return { cao: 0, rong: 0, day: 0 };
};

const parseSpecs = (specsText: string) => {
  const result = {
    daCua: "",
    xuongCua: "",
    xuongCuaGhepThanh: false,
    giayToOng: "",
    xuongKhuon: "",
    xuongKhuonGhepThanh: false,
    mdf: "",
    loiCachNhiet: ""
  };
  if (!specsText) return result;

  const getVal = (key: string) => {
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`${escapedKey}\\s*:\\s*([^,\\n]+)`, 'i');
    const match = specsText.match(regex);
    return match ? match[1].trim() : "";
  };

  result.daCua = getVal("Da cửa");
  result.xuongCua = getVal("Xương cửa");
  if (result.xuongCua.toLowerCase().includes("ghép thanh")) {
    result.xuongCuaGhepThanh = true;
  }
  result.giayToOng = getVal("Giấy tổ ong") || getVal("honeycomb");
  result.xuongKhuon = getVal("Xương khuôn");
  if (result.xuongKhuon.toLowerCase().includes("ghép thanh")) {
    result.xuongKhuonGhepThanh = true;
  }
  result.mdf = getVal("MDF");
  result.loiCachNhiet = getVal("Lõi cách nhiệt") || getVal("cách nhiệt");

  // Fallback to old simple line-by-line parsing if new key-value parsing returned nothing
  if (!result.daCua && !result.xuongCua && !result.xuongKhuon) {
    const lines = specsText.split(/\n| - | -/).map(l => l.trim().replace(/^[•\s\-\*]+/, ""));
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("da cửa:") || lower.includes("da cửa")) {
        result.daCua = line.split(/:\s*/)[1] || line;
      } else if (lower.startsWith("xương cửa:") || lower.includes("xương cửa")) {
        result.xuongCua = line.split(/:\s*/)[1] || line;
        if (lower.includes("ghép thanh")) result.xuongCuaGhepThanh = true;
      } else if (lower.startsWith("giấy tổ ong:") || lower.includes("giấy tổ ong") || lower.includes("honeycomb")) {
        result.giayToOng = line.split(/:\s*/)[1] || line;
      } else if (lower.startsWith("xương khuôn:") || lower.includes("xương khuôn")) {
        result.xuongKhuon = line.split(/:\s*/)[1] || line;
        if (lower.includes("ghép thanh")) result.xuongKhuonGhepThanh = true;
      } else if (lower.startsWith("mdf:") || lower.includes("mdf")) {
        result.mdf = line.split(/:\s*/)[1] || line;
      } else if (lower.startsWith("lõi cách nhiệt:") || lower.includes("lõi cách nhiệt") || lower.includes("cách nhiệt")) {
        result.loiCachNhiet = line.split(/:\s*/)[1] || line;
      }
    }
  }
  return result;
};

interface MaterialSuggestionInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  suggestions: any[];
  placeholder?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  addon?: React.ReactNode;
}

function MaterialSuggestionInput({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  style,
  inputStyle,
  labelStyle,
  addon
}: MaterialSuggestionInputProps) {
  const [showSuggs, setShowSuggs] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggs(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = suggestions.filter(item => {
    if (!search.trim()) return true;
    const name = (item.tenHang || item.name || "").toLowerCase();
    const code = (item.code || "").toLowerCase();
    const s = search.toLowerCase();
    return name.includes(s) || code.includes(s);
  });

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              onChange(e.target.value);
            }}
            onFocus={() => setShowSuggs(true)}
            placeholder={placeholder}
            style={inputStyle}
          />
          {showSuggs && filtered.length > 0 && (
            <ul
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 5100,
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                listStyle: "none",
                padding: "4px 0",
                margin: "4px 0 0 0",
                maxHeight: "160px",
                overflowY: "auto",
              }}
            >
              {filtered.map(item => (
                <li
                  key={item.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(item.tenHang || item.name || "");
                    setSearch(item.tenHang || item.name || "");
                    setShowSuggs(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "var(--foreground)",
                    cursor: "pointer",
                    outline: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{
                    fontWeight: 500,
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {item.tenHang || item.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {addon}
      </div>
    </div>
  );
}

export function BaoGiaWoodDoorModal({ isOpen, onClose, customer, employees, currentUserEmployeeId }: BaoGiaWoodDoorModalProps) {
  const toast = useToast();
  const [soPhieu, setSoPhieu] = useState("");
  const [ngayTao, setNgayTao] = useState("");
  const [ngayHetHan, setNgayHetHan] = useState("");
  const [nguoiTaoId, setNguoiTaoId] = useState("");
  const [tongTienHang, setTongTienHang] = useState(0);
  const [chietKhau, setChietKhau] = useState(0);
  const [vat, setVat] = useState(10);
  const [showHinhAnh, setShowHinhAnh] = useState(false);
  const [showKichThuoc, setShowKichThuoc] = useState(true);
  const [searchVal, setSearchVal] = useState("");
  const [cuaChongChay, setCuaChongChay] = useState(false);
  const [loaiCua, setLoaiCua] = useState("một cánh");
  const [isProductConfigOpen, setIsProductConfigOpen] = useState(false);
  const [detailTenHang, setDetailTenHang] = useState("");
  const [detailSoLuong, setDetailSoLuong] = useState(300);
  const [detailLoaiSP, setDetailLoaiSP] = useState("chong-chay");
  const [detailLoaiCua, setDetailLoaiCua] = useState("một cánh");
  const [detailDimType, setDetailDimType] = useState("o-cho"); // "o-cho" or "khuon-cua"
  const [detailCao, setDetailCao] = useState<number>(0);
  const [detailRong, setDetailRong] = useState<number>(0);
  const [detailDay, setDetailDay] = useState<number>(0);
  const [detailDaCua, setDetailDaCua] = useState("");
  const [detailXuongCua, setDetailXuongCua] = useState("");
  const [detailGiayToOng, setDetailGiayToOng] = useState("");
  const [detailXuongKhuon, setDetailXuongKhuon] = useState("");
  const [detailMdf, setDetailMdf] = useState("");
  const [detailLoiCachNhiet, setDetailLoiCachNhiet] = useState("");
  const [detailXuongKhuonGhepThanh, setDetailXuongKhuonGhepThanh] = useState(false);
  const [detailXuongCuaGhepThanh, setDetailXuongCuaGhepThanh] = useState(false);
  const [configuringItemId, setConfiguringItemId] = useState<string | null>(null);
  const [detailGiaBan, setDetailGiaBan] = useState<number>(0);
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductGroup, setNewProductGroup] = useState("Chống cháy");
  const [newProductType, setNewProductType] = useState("Một cánh");
  const [newProductCao, setNewProductCao] = useState("2.210");
  const [newProductRong, setNewProductRong] = useState("1.000");
  const [newProductDay, setNewProductDay] = useState("39");
  const [soLuongBoCua, setSoLuongBoCua] = useState("300");
  const [sanLuong, setSanLuong] = useState("30");
  const [thoiGianSanXuat, setThoiGianSanXuat] = useState("8");
  const [chiPhiNhanCong, setChiPhiNhanCong] = useState("61.700.000");
  const [chiPhiQuanLy, setChiPhiQuanLy] = useState("500.000");
  const [chiPhiCoDinh, setChiPhiCoDinh] = useState("34.000.000");
  const [daoCuDungCu, setDaoCuDungCu] = useState("200.000");
  const [vatTuChinhInput, setVatTuChinhInput] = useState("1.850.000");
  const [vatTuPhuInput, setVatTuPhuInput] = useState("150.000");
  const [vatTuTieuHaoInput, setVatTuTieuHaoInput] = useState("80.000");
  const [phuKienInput, setPhuKienInput] = useState("750.000");
  const [loiNhuanInput, setLoiNhuanInput] = useState("700.000");
  const [bienLoiNhuanPercent, setBienLoiNhuanPercent] = useState("25");
  const [dmVatTuChinh, setDmVatTuChinh] = useState("1");
  const [dmVatTuPhu, setDmVatTuPhu] = useState("1");
  const [dmVatTuTieuHao, setDmVatTuTieuHao] = useState("1");
  const [dmPhuKien, setDmPhuKien] = useState("1");
  const [activeStep, setActiveStep] = useState(1);
  const [calcRows, setCalcRows] = useState<CalcRowItem[]>(INITIAL_CALC_ROWS);
  const [activeCalcTab, setActiveCalcTab] = useState("vat-tu-chinh");
  const [suggestedPrice, setSuggestedPrice] = useState(0);
  const [phuKienList, setPhuKienList] = useState(INITIAL_PHU_KIEN);
  const [vatTuPhuList, setVatTuPhuList] = useState(INITIAL_VAT_TU_PHU);
  const [vatTuChinhList, setVatTuChinhList] = useState(INITIAL_VAT_TU_CHINH);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionListRef = React.useRef<HTMLUListElement>(null);
  const suggestionItemRefs = React.useRef<(HTMLLIElement | null)[]>([]);

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<any[]>([]);
  const [isCalculateSidebarOpen, setIsCalculateSidebarOpen] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisContent, setAnalysisContent] = useState("");

  const getRawNumber = (val: string) => {
    if (!val) return 0;
    return Number(val.replace(/\D/g, ""));
  };

  const H = getRawNumber(newProductCao);
  const W = getRawNumber(newProductRong);
  const T = getRawNumber(newProductDay);

  const calculateTongChiPhi = () => {
    const nc = getRawNumber(chiPhiNhanCong);
    const ql = Math.round(nc * 0.07);
    const cd = getRawNumber(chiPhiCoDinh);
    const dc = Math.round(nc * 0.01);
    const total = nc + ql + cd + dc;
    return total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getThoiGianThucHien = () => {
    const qty = getRawNumber(soLuongBoCua);
    const rate = getRawNumber(sanLuong);
    if (rate === 0) return "0";
    const result = Math.floor(qty / rate);
    return result.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getChiPhiQuanLyVal = () => {
    const nc = getRawNumber(chiPhiNhanCong);
    const result = Math.round(nc * 0.07);
    return result.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getDaoCuDungCuVal = () => {
    const nc = getRawNumber(chiPhiNhanCong);
    const result = Math.round(nc * 0.01);
    return result.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getDetailWidth = (r: CalcRowItem) => {
    if (r.id === "1.1") return W > 0 ? String(W + 20) : "1020";
    if (r.id === "1.2") return "60";
    if (r.id === "1.3") return "600";
    if (r.id === "2.1") return "115";
    if (r.id === "2.2") return "130";
    if (r.id === "3.1") return "65";
    if (r.id === "3.2") return "25";
    if (r.id === "3.3") return "65";
    if (r.id === "3.4") return "60";
    return "";
  };

  const getDetailHeight = (r: CalcRowItem) => {
    if (r.id === "1.1") return H > 0 ? String(H + 20) : "2230";
    if (r.id === "1.2") return "2440";
    if (r.id === "1.3") return "1200";
    if (r.id === "2.1") return H > 0 ? String(H + 40) : "2250";
    if (r.id === "2.2") return H > 0 ? String(H + 40) : "2250";
    if (r.id === "3.1") return H > 0 ? String(H + 80) : "2290";
    if (r.id === "3.2") return H > 0 ? String(H + 100) : "2310";
    if (r.id === "3.3") return H > 0 ? String(H + 80) : "2290";
    if (r.id === "3.4") return H > 0 ? String(H + 40) : "2250";
    return "";
  };

  const getSpPerSheet = (r: CalcRowItem) => {
    if (r.spPerSheet !== undefined && r.spPerSheet !== "") {
      return r.spPerSheet;
    }
    const w = parseFloat(getDetailWidth(r)) || 0;
    const h = parseFloat(getDetailHeight(r)) || 0;
    if (w <= 0 || h <= 0) return "";

    const sheetW = parseFloat(r.width || "") || 1220;
    const sheetH = parseFloat(r.height || "") || 2440;

    const calcFit1D = (sSize: number, dSize: number, kerf = 4) => {
      if (dSize <= 0) return 0;
      return Math.floor((sSize + kerf) / (dSize + kerf));
    };

    const fit1 = calcFit1D(sheetW, w) * calcFit1D(sheetH, h);
    const fit2 = calcFit1D(sheetW, h) * calcFit1D(sheetH, w);
    const maxFit = Math.max(fit1, fit2);
    return maxFit > 0 ? String(maxFit) : "";
  };

  const getRowMetrics = (row: CalcRowItem) => {
    const qtyBo = getRawNumber(soLuongBoCua) || 1;
    const spPerSheetVal = parseFloat(row.spPerSheet !== undefined ? row.spPerSheet : getSpPerSheet(row)) || 0;
    let hasFactor = row.factor !== undefined && row.factor !== "";
    let factorVal = hasFactor ? (parseFloat(row.factor || "0") || 0) : 0;

    const hKhuon = H > 0 ? H + 40 : 2250;
    const hCanh = H > 0 ? H : 2210;
    const wCanh = W > 0 ? W : 1000;

    if (row.id === "5.1") {
      // Goăng giảm chấn: (chiều cao khuôn cửa/1000*2.5)*1.05
      if (!hasFactor) {
        factorVal = (hKhuon / 1000 * 2.5) * 1.05;
        hasFactor = true;
      }
    } else if (row.id === "5.2") {
      // Nẹp dán cánh: (Chiều cao cánh/1000+Chiều rộng cánh/1000)*2*1.1
      if (!hasFactor) {
        factorVal = (hCanh / 1000 + wCanh / 1000) * 2 * 1.1;
        hasFactor = true;
      }
    } else if (row.id === "5.3") {
      // Nẹp dán khuôn: Chiều cao khuôn/1000*2.5*2*1.1
      if (!hasFactor) {
        factorVal = (hKhuon / 1000 * 2.5 * 2) * 1.1;
        hasFactor = true;
      }
    } else if (row.id === "5.4") {
      // Nẹp dán phào: Chiều cao khuôn/1000*2.5
      if (!hasFactor) {
        factorVal = (hKhuon / 1000 * 2.5);
        hasFactor = true;
      }
    } else if (row.id === "5.5") {
      // Nẹp dán phào L: Chiều cao khuôn/1000*12.5
      if (!hasFactor) {
        factorVal = (hKhuon / 1000 * 12.5);
        hasFactor = true;
      }
    } else if (row.id === "5.6") {
      // Keo sữa: (tổng cộng da cửa+tổng cộng MDF)*2.9*0.7
      if (!hasFactor) {
        const r11 = calcRows.find(r => r.id === "1.1");
        const r22 = calcRows.find(r => r.id === "2.2");
        const tot11 = r11 ? getRowMetrics(r11).totalVal : 0;
        const tot22 = r22 ? getRowMetrics(r22).totalVal : 0;
        const totalNeeded = (tot11 + tot22) * 2.9 * 0.7;
        factorVal = totalNeeded / qtyBo;
        hasFactor = true;
      }
    } else if (row.id === "5.7") {
      // Keo dán cạnh: (D75/1000*O75 + D76/1000*O76 + D77/1000*O77 + D78/1000*O78)*0.275
      if (!hasFactor) {
        const getRowWidth = (r: CalcRowItem): number => {
          const getWidthFromName = (name: string) => {
            if (!name) return "";
            const matchRong = name.match(/rộng\s*(\d+(?:[\.,]\d+)?)/i) || name.match(/rong\s*(\d+(?:[\.,]\d+)?)/i);
            if (matchRong) return matchRong[1];
            return "";
          };
          const matched = allInventoryItems.find(m => (m.tenHang || m.name || "") === r.material);
          const wStr = r.width || 
                       (matched ? (matched.chieuRong != null ? String(matched.chieuRong) : "") : "") || 
                       getWidthFromName(r.material || "");
          if (!wStr) return 0;
          return parseFloat(wStr.replace(",", ".")) || 0;
        };

        const r52 = calcRows.find(r => r.id === "5.2");
        const r53 = calcRows.find(r => r.id === "5.3");
        const r54 = calcRows.find(r => r.id === "5.4");
        const r55 = calcRows.find(r => r.id === "5.5");

        const w52 = r52 ? getRowWidth(r52) : 0;
        const w53 = r53 ? getRowWidth(r53) : 0;
        const w54 = r54 ? getRowWidth(r54) : 0;
        const w55 = r55 ? getRowWidth(r55) : 0;

        const tot52 = r52 ? getRowMetrics(r52).totalVal : 0;
        const tot53 = r53 ? getRowMetrics(r53).totalVal : 0;
        const tot54 = r54 ? getRowMetrics(r54).totalVal : 0;
        const tot55 = r55 ? getRowMetrics(r55).totalVal : 0;

        const totalNeeded = (
          (w52 / 1000 * tot52) +
          (w53 / 1000 * tot53) +
          (w55 / 1000 * tot55) +
          (w54 / 1000 * tot54)
        ) * 0.275;

        factorVal = totalNeeded / qtyBo;
        hasFactor = true;
      }
    } else if (row.id === "5.8") {
      // Gim: số lượng = số bộ cửa * 1.3
      if (!hasFactor) {
        factorVal = 1.3;
        hasFactor = true;
      }
    } else if (row.id === "5.9") {
      // Vít 40: số lượng = số bản lề * 4
      if (!hasFactor) {
        const r42 = calcRows.find(r => r.id === "4.2");
        const tot42 = r42 ? getRowMetrics(r42).totalVal : 0;
        const totalNeeded = tot42 * 4;
        factorVal = totalNeeded / qtyBo;
        hasFactor = true;
      }
    } else if (row.id === "5.10") {
      // Vít 100: số lượng = số bộ cửa * 12
      if (!hasFactor) {
        factorVal = 12;
        hasFactor = true;
      }
    }

    const isQtyCalculated = spPerSheetVal > 0 && hasFactor;

    const neededVal = isQtyCalculated
      ? (qtyBo * factorVal)
      : ((parseFloat(row.quantity !== undefined ? row.quantity : String(qtyBo)) || 0) * factorVal);

    const neededStr = hasFactor
      ? (neededVal % 1 === 0 ? neededVal.toString() : neededVal.toFixed(3).replace(/\.?0+$/, ""))
      : "—";

    const qtyVal = isQtyCalculated
      ? Math.ceil(neededVal / spPerSheetVal)
      : (parseFloat(row.quantity !== undefined ? row.quantity : String(qtyBo)) || 0);

    const netQty = isQtyCalculated
      ? qtyVal
      : qtyVal * (hasFactor ? factorVal : 1);

    const isSection4or5 = row.id.startsWith("4.") || row.id.startsWith("5.");
    const lossPercent = isSection4or5 ? 0 : (parseFloat(row.lossRate !== undefined ? row.lossRate : "1") || 0);
    const lossVal = Math.ceil((lossPercent / 100) * netQty);

    const lossStr = hasFactor
      ? (lossVal % 1 === 0 ? lossVal.toString() : lossVal.toFixed(3).replace(/\.?0+$/, ""))
      : "—";

    const totalVal = netQty + lossVal;

    const totalStr = hasFactor
      ? (totalVal % 1 === 0 ? totalVal.toString() : totalVal.toFixed(3).replace(/\.?0+$/, ""))
      : "—";
    let finalQtyVal = qtyVal;
    let finalTotalVal = totalVal;
    let finalLossStr = lossStr;
    let finalTotalStr = totalStr;

    if (isSection4or5) {
      if (row.quantity !== undefined && row.quantity !== "") {
        const manualVal = parseFloat(row.quantity) || 0;
        finalTotalVal = Math.round(manualVal);
        finalQtyVal = Math.round(manualVal);
        finalTotalStr = finalTotalVal.toString();
      } else {
        finalTotalVal = Math.round(totalVal);
        finalQtyVal = finalTotalVal;
        finalTotalStr = finalTotalVal.toString();
      }
      finalLossStr = "—";
    }

    return {
      spPerSheetVal,
      hasFactor,
      factorVal,
      isQtyCalculated,
      neededVal: isSection4or5 ? finalTotalVal : neededVal,
      neededStr: isSection4or5 ? finalTotalStr : neededStr,
      qtyVal: isSection4or5 ? finalQtyVal : qtyVal,
      netQty: isSection4or5 ? finalQtyVal : netQty,
      lossPercent: isSection4or5 ? 0 : lossPercent,
      lossVal: isSection4or5 ? 0 : lossVal,
      lossStr: isSection4or5 ? "—" : lossStr,
      totalVal: isSection4or5 ? finalTotalVal : totalVal,
      totalStr: isSection4or5 ? finalTotalStr : totalStr,
      detailWidth: getDetailWidth(row),
      detailHeight: getDetailHeight(row),
    };
  };

  const getAggregatedGroup = (prefixes: string[]) => {
    const groupMap: { [key: string]: { name: string; unit: string; quantity: number; unitPrice: number } } = {};

    calcRows.forEach(row => {
      if (row.isParent) return;

      const matchesPrefix = prefixes.some(p => row.id.startsWith(p));
      if (!matchesPrefix) return;

      const name = (row.material || "").trim();
      if (!name) return;

      const unit = (row.unit || "").trim();
      const key = `${name.toLowerCase()}_${unit.toLowerCase()}`;

      const metrics = getRowMetrics(row);
      const qty = metrics.totalVal || 0;

      const matched = allInventoryItems.find(m => (m.tenHang || m.name || "") === name);
      const unitPrice = matched ? (matched.giaNhap || matched.giaBan || 0) : 0;

      if (groupMap[key]) {
        groupMap[key].quantity += qty;
      } else {
        groupMap[key] = {
          name,
          unit,
          quantity: qty,
          unitPrice,
        };
      }
    });

    return Object.values(groupMap);
  };


  useEffect(() => {
    if (!isOpen) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchVal.trim()) {
        params.append("search", searchVal.trim());
      }
      params.append("limit", "20");

      fetch(`/api/logistics/inventory?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.items)) {
            const finishedGoods = data.items.filter((item: any) => item.source === "inventory");
            setSuggestions(finishedGoods);
            setSelectedIndex(-1);
          }
        })
        .catch(err => {
          console.error("Failed to fetch suggestions:", err);
          setSuggestions([]);
        });
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchVal, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/logistics/inventory?limit=100")
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.items)) {
            setAllInventoryItems(data.items);
            const mats = data.items.filter((item: any) => item.source === "material");
            setMaterials(mats);
          }
        })
        .catch(err => console.error("Failed to fetch materials:", err));
    } else {
      setMaterials([]);
      setAllInventoryItems([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex >= 0 && suggestionItemRefs.current[selectedIndex]) {
      suggestionItemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const handleSelectSuggestion = (item: any) => {
    const name = item.tenHang || item.name || "";
    const donVi = item.donVi || "Cái";
    const giaBan = item.giaBan || 0;
    const imageUrl = item.imageUrl || null;

    const nameLower = name.toLowerCase();
    let detectedLoaiSP = "";
    if (nameLower.includes("chống cháy") && !nameLower.includes("không chống cháy")) {
      detectedLoaiSP = "Chống cháy";
    } else if (nameLower.includes("không chống cháy")) {
      detectedLoaiSP = "Không chống cháy";
    } else if (item.categoryName) {
      const catLower = item.categoryName.toLowerCase();
      if (catLower.includes("chống cháy") && !catLower.includes("không chống cháy")) {
        detectedLoaiSP = "Chống cháy";
      } else if (catLower.includes("không chống cháy")) {
        detectedLoaiSP = "Không chống cháy";
      }
    }

    let detectedLoaiCua = "";
    if (nameLower.includes("hai cánh đều")) {
      detectedLoaiCua = "Cửa hai cánh đều";
    } else if (nameLower.includes("hai cánh lệch")) {
      detectedLoaiCua = "Cửa hai cánh lệch";
    } else if (nameLower.includes("một cánh")) {
      detectedLoaiCua = "Cửa một cánh";
    } else if (nameLower.includes("hai cánh")) {
      detectedLoaiCua = "Cửa hai cánh";
    }

    const itemCao = item.chieuDai || item.cao || 0;
    const itemRong = item.chieuRong || item.rong || 0;
    const itemDay = item.chieuDay || item.day || 0;

    // Parse dimensions from kichThuoc/spec string if numerical properties are not directly set
    let parsedDims = { cao: 0, rong: 0, day: 0 };
    const rawKichThuocStr = item.kichThuoc || item.spec || "";
    if (!itemCao || !itemRong || !itemDay) {
      parsedDims = parseDimensions(rawKichThuocStr);
    }

    const finalCao = itemCao || parsedDims.cao;
    const finalRong = itemRong || parsedDims.rong;
    const finalDay = itemDay || parsedDims.day;

    const kichThuoc = (finalCao && finalRong && finalDay)
      ? `${finalCao} x ${finalRong} x ${finalDay} mm`
      : rawKichThuocStr;

    // Parse thongSoKyThuat and group them if possible
    const rawThongSo = item.thongSoKyThuat || item.spec || item.model || "";
    const parsedSpecs = parseSpecs(rawThongSo);

    let thongSoKyThuat = rawThongSo;
    if (parsedSpecs.daCua || parsedSpecs.xuongCua || parsedSpecs.xuongKhuon) {
      const specsList = [];
      const listCanh = [];
      if (parsedSpecs.daCua) listCanh.push(`Da cửa: ${parsedSpecs.daCua}`);
      if (parsedSpecs.xuongCua) listCanh.push(`Xương cửa: ${parsedSpecs.xuongCua}${parsedSpecs.xuongCuaGhepThanh ? " (Ghép thanh)" : ""}`);
      if (parsedSpecs.giayToOng) listCanh.push(`Giấy tổ ong: ${parsedSpecs.giayToOng}`);
      if (listCanh.length > 0) specsList.push(`Cánh cửa: ${listCanh.join(", ")}`);

      const listKhuon = [];
      if (parsedSpecs.xuongKhuon) listKhuon.push(`Xương khuôn: ${parsedSpecs.xuongKhuon}${parsedSpecs.xuongKhuonGhepThanh ? " (Ghép thanh)" : ""}`);
      if (parsedSpecs.mdf) listKhuon.push(`MDF: ${parsedSpecs.mdf}`);
      if (listKhuon.length > 0) specsList.push(`Khuôn cửa: ${listKhuon.join(", ")}`);

      if (specsList.length > 0) {
        thongSoKyThuat = specsList.join("\n");
      }
    }

    const newItem = {
      id: item.id + "_" + Date.now(),
      originalId: item.id,
      tenHang: name,
      donVi: donVi,
      giaBan: giaBan,
      soLuong: 1,
      imageUrl: imageUrl,
      cuaChongChay: nameLower.includes("chống cháy") && !nameLower.includes("không chống cháy"),
      loaiCua: detectedLoaiCua,
      loaiSP: detectedLoaiSP,
      cao: finalCao,
      rong: finalRong,
      day: finalDay,
      kichThuoc: kichThuoc,
      thongSoKyThuat: thongSoKyThuat,
    };

    setSelectedItems(prev => {
      const nextList = [...prev, newItem];
      const total = nextList.reduce((sum, i) => sum + (i.giaBan * i.soLuong), 0);
      setTongTienHang(total);
      return nextList;
    });

    setSearchVal("");
    setIsFocused(false);

    setTimeout(() => {
      const qtyInput = document.getElementById(`qty-input-${newItem.id}`) as HTMLInputElement;
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }, 150);
  };

  const handleItemQtyChange = (itemId: string, newQty: number) => {
    setSelectedItems(prev => {
      const nextList = prev.map(item => {
        if (item.id === itemId) {
          return { ...item, soLuong: Math.max(1, newQty) };
        }
        return item;
      });
      const total = nextList.reduce((sum, i) => sum + (i.giaBan * i.soLuong), 0);
      setTongTienHang(total);
      return nextList;
    });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev + 1;
          return next < suggestions.length ? next : prev;
        });
      }
    } else if (e.key === "ArrowUp") {
      if (suggestions.length > 0 && selectedIndex >= 0) {
        e.preventDefault();
        setSelectedIndex(prev => prev - 1);
      }
    } else if (e.key === "Enter") {
      if (suggestions.length > 0 && selectedIndex >= 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsFocused(false);
    }
  };

  const handlePrint = () => {
    setPrintOpen(true);
  };

  const handleSave = () => {
    toast.success("Lưu báo giá", "Đã lưu thông tin báo giá thành công!");
  };

  // Dynamically calculate suggestedPrice based on dimensions and specifications
  useEffect(() => {
    if (detailCao > 0 && detailRong > 0) {
      const basePrice = detailGiaBan || 2300000;
      const areaRatio = (detailCao * detailRong) / (2200 * 900);
      let multiplier = 1.0;
      const isFireResistant = detailLoaiSP.toLowerCase().includes("chống cháy") && !detailLoaiSP.toLowerCase().includes("không chống cháy");
      if (isFireResistant) {
        multiplier += 0.2; // 20% extra for fire resistance
      }
      if (detailXuongCuaGhepThanh) {
        multiplier += 0.05; // 5% extra for laminated core
      }
      if (detailXuongKhuonGhepThanh) {
        multiplier += 0.05; // 5% extra for laminated frame
      }
      setSuggestedPrice(Math.round(basePrice * areaRatio * multiplier));
    } else {
      setSuggestedPrice(detailGiaBan || 0);
    }
  }, [detailCao, detailRong, detailGiaBan, detailLoaiSP, detailXuongCuaGhepThanh, detailXuongKhuonGhepThanh]);

  const handleSaveProductConfig = () => {
    const isChongChay = detailLoaiSP.toLowerCase().includes("chống cháy") && !detailLoaiSP.toLowerCase().includes("không chống cháy");

    // Generate specifications bullet list
    const specsList = [];

    // 1. Cánh cửa
    const listCanh = [];
    if (detailDaCua) listCanh.push(`Da cửa: ${detailDaCua}`);
    if (detailXuongCua) listCanh.push(`Xương cửa: ${detailXuongCua}${detailXuongCuaGhepThanh ? " (Ghép thanh)" : ""}`);
    if (detailGiayToOng) listCanh.push(`Giấy tổ ong: ${detailGiayToOng}`);
    if (listCanh.length > 0) specsList.push(`Cánh cửa: ${listCanh.join(", ")}`);

    // 2. Khuôn cửa
    const listKhuon = [];
    if (detailXuongKhuon) listKhuon.push(`Xương khuôn: ${detailXuongKhuon}${detailXuongKhuonGhepThanh ? " (Ghép thanh)" : ""}`);
    if (detailMdf) listKhuon.push(`MDF: ${detailMdf}`);
    if (listKhuon.length > 0) specsList.push(`Khuôn cửa: ${listKhuon.join(", ")}`);

    // 3. Nẹp, ốp
    const nepThang = calcRows.find(r => r.id === "3.1")?.material || "";
    const nepChanL = calcRows.find(r => r.id === "3.2")?.material || "";
    const nepThanL = calcRows.find(r => r.id === "3.3")?.material || "";
    const opCua = calcRows.find(r => r.id === "3.4")?.material || "";

    const listNepOp = [];
    if (nepThang) listNepOp.push(`Nẹp thẳng: ${nepThang}`);
    if (nepChanL) listNepOp.push(`Nẹp chân L: ${nepChanL}`);
    if (nepThanL) listNepOp.push(`Nẹp thân L: ${nepThanL}`);
    if (opCua) listNepOp.push(`Ốp cửa: ${opCua}`);
    if (listNepOp.length > 0) specsList.push(`Nẹp, ốp: ${listNepOp.join(", ")}`);

    // 4. Phụ kiện
    const listPk = phuKienList
      .filter(item => item.sanPham && item.sanPham.trim())
      .map(item => `${item.loai}: ${item.sanPham}`);
    if (listPk.length > 0) specsList.push(`Phụ kiện: ${listPk.join(", ")}`);

    if (isChongChay && detailLoiCachNhiet) {
      specsList.push(`Lõi cách nhiệt: ${detailLoiCachNhiet}`);
    }

    const thongSoKyThuat = specsList.join("\n");
    const kichThuoc = `${detailCao} x ${detailRong} x ${detailDay} mm`;
    const finalGiaBan = suggestedPrice || detailGiaBan || 2300000;

    if (configuringItemId) {
      // Update existing item
      setSelectedItems(prev => {
        const nextList = prev.map(item => {
          if (item.id === configuringItemId) {
            return {
              ...item,
              tenHang: detailTenHang,
              soLuong: detailSoLuong,
              cuaChongChay: isChongChay,
              loaiCua: detailLoaiCua,
              dimType: detailDimType,
              cao: detailCao,
              rong: detailRong,
              day: detailDay,
              daCua: detailDaCua,
              xuongCua: detailXuongCua,
              xuongCuaGhepThanh: detailXuongCuaGhepThanh,
              giayToOng: detailGiayToOng,
              xuongKhuon: detailXuongKhuon,
              xuongKhuonGhepThanh: detailXuongKhuonGhepThanh,
              mdf: detailMdf,
              loiCachNhiet: detailLoiCachNhiet,
              kichThuoc: kichThuoc,
              thongSoKyThuat: thongSoKyThuat,
              giaBan: finalGiaBan,
            };
          }
          return item;
        });
        const total = nextList.reduce((sum, i) => sum + (i.giaBan * i.soLuong), 0);
        setTongTienHang(total);
        return nextList;
      });
      toast.success("Thành công", "Đã cập nhật cấu hình sản phẩm trong bảng.");
    } else {
      // Create new item
      const newItem = {
        id: "config_" + Date.now(),
        originalId: null,
        tenHang: detailTenHang,
        donVi: "Bộ",
        giaBan: finalGiaBan,
        soLuong: detailSoLuong,
        imageUrl: null,
        cuaChongChay: isChongChay,
        loaiCua: detailLoaiCua,
        dimType: detailDimType,
        cao: detailCao,
        rong: detailRong,
        day: detailDay,
        daCua: detailDaCua,
        xuongCua: detailXuongCua,
        xuongCuaGhepThanh: detailXuongCuaGhepThanh,
        giayToOng: detailGiayToOng,
        xuongKhuon: detailXuongKhuon,
        xuongKhuonGhepThanh: detailXuongKhuonGhepThanh,
        mdf: detailMdf,
        loiCachNhiet: detailLoiCachNhiet,
        kichThuoc: kichThuoc,
        thongSoKyThuat: thongSoKyThuat,
      };

      setSelectedItems(prev => {
        const nextList = [...prev, newItem];
        const total = nextList.reduce((sum, i) => sum + (i.giaBan * i.soLuong), 0);
        setTongTienHang(total);
        return nextList;
      });
      toast.success("Thành công", "Đã thêm sản phẩm cấu hình vào bảng.");
    }

    setIsProductConfigOpen(false);
    setIsCalculateModalOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetch("/api/plan-finance/quotations/next-code")
        .then(r => r.json())
        .then(data => {
          if (data.nextCode) setSoPhieu(data.nextCode);
        })
        .catch(() => {
          setSoPhieu("BG" + new Date().getFullYear().toString().slice(-2) + "0001");
        });

      const today = new Date();
      const fmtDate = (d: Date) => d.toISOString().split("T")[0];
      setNgayTao(fmtDate(today));
      setNgayHetHan(fmtDate(new Date(today.getTime() + 30 * 24 * 3600 * 1000)));
      setNguoiTaoId(currentUserEmployeeId || "");
      setTongTienHang(0);
      setSelectedItems([]);
      setChietKhau(0);
      setVat(10);
      setSearchVal("");
      setCuaChongChay(false);
      setLoaiCua("một cánh");
      setIsProductConfigOpen(false);
      setDetailDimType("o-cho");
      setDetailCao(0);
      setDetailRong(0);
      setDetailDay(0);
      setDetailDaCua("");
      setDetailXuongCua("");
      setDetailGiayToOng("");
      setDetailXuongKhuon("");
      setDetailMdf("");
      setDetailLoiCachNhiet("");
      setDetailXuongCuaGhepThanh(false);
      setDetailXuongKhuonGhepThanh(false);
      setIsCalculateModalOpen(false);
      setActiveCalcTab("vat-tu-chinh");
      setSuggestedPrice(0);
      setDetailGiaBan(0);
      setConfiguringItemId(null);
      setPhuKienList(INITIAL_PHU_KIEN);
      setVatTuPhuList(INITIAL_VAT_TU_PHU);
      setVatTuChinhList(INITIAL_VAT_TU_CHINH);

      // Focus search input
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, currentUserEmployeeId]);

  if (!isOpen) return null;

  const displayName = customer?.nhom === "ca-nhan"
    ? ([customer.xungHo, customer.daiDien].filter(Boolean).join(" ") || customer.name)
    : customer?.name || "";

  const truocThue = tongTienHang * (1 - chietKhau / 100);
  const thueTien = truocThue * (vat / 100);
  const tongCong = Math.max(0, Math.round(truocThue + thueTien));

  const isChongChay = detailLoaiSP.toLowerCase().includes("chống cháy") && !detailLoaiSP.toLowerCase().includes("không chống cháy");

  const isCalculateEnabled =
    detailTenHang.trim() !== "" &&
    detailSoLuong > 0 &&
    detailLoaiSP.trim() !== "" &&
    detailLoaiCua.trim() !== "" &&
    detailCao > 0 &&
    detailRong > 0 &&
    detailDay > 0 &&
    detailDaCua.trim() !== "" &&
    detailXuongCua.trim() !== "" &&
    detailGiayToOng.trim() !== "" &&
    detailXuongKhuon.trim() !== "" &&
    detailMdf.trim() !== "" &&
    (!isChongChay || detailLoiCachNhiet.trim() !== "");

  const mainMaterials = materials.filter(m =>
    m.categoryId === "cmq0rwood0000vattuchinh" ||
    m.categoryName === "Vật tư chính" ||
    (m.category?.name && m.category.name.toLowerCase().includes("vật tư chính"))
  );

  const toOngMaterials = materials.filter(m =>
    (m.tenHang || m.name || "").toLowerCase().includes("tổ ong")
  );

  const getSuggestionsForLabel = (label: string, categoryGroupId: string) => {
    if (!label) return [];
    const lowerLabel = label.toLowerCase();

    // Choose search source based on parent group
    let sourceList = materials;
    if (categoryGroupId === "1" || categoryGroupId === "2" || categoryGroupId === "3") {
      sourceList = mainMaterials;
    }

    // Special cases for better matching
    let searchTerms = [lowerLabel];
    if (lowerLabel.includes("khoá")) {
      searchTerms.push("khóa");
    }
    if (lowerLabel.includes("tay ấn thuỷ lực")) {
      searchTerms.push("tay co", "thuỷ lực", "thủy lực");
    }
    if (lowerLabel.includes("goăng")) {
      searchTerms.push("gioăng");
    }
    if (lowerLabel.includes("nẹp dán")) {
      searchTerms.push("chỉ nhựa", "pvc");
    }
    if (lowerLabel.includes("nẹp")) {
      searchTerms.push("phào");
    }

    let filtered = sourceList.filter(m => {
      const name = (m.tenHang || m.name || "").toLowerCase();
      return searchTerms.some(term => name.includes(term)) ||
        lowerLabel.split(/\s+/).filter(word => word.length > 3).some(word => name.includes(word));
    });

    // Fallback if specific match is empty
    if (filtered.length === 0) {
      if (categoryGroupId === "3") {
        filtered = sourceList;
      } else if (categoryGroupId === "1" || categoryGroupId === "2") {
        filtered = sourceList;
      } else {
        const isPhuKien = lowerLabel.includes("khoá") || lowerLabel.includes("bản lề") || lowerLabel.includes("mắt thần") || lowerLabel.includes("tay ấn") || lowerLabel.includes("phụ kiện");
        filtered = materials.filter(m => {
          const catName = (m.categoryName || m.category?.name || "").toLowerCase();
          if (isPhuKien) {
            return catName.includes("phụ kiện");
          } else {
            return catName.includes("tiêu hao") || catName.includes("vật tư phụ");
          }
        });
      }
    }

    return filtered;
  };

  const labelStyle = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--foreground)",
    marginBottom: "5px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    height: "36px",
    padding: "6px 10px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "var(--card)",
    color: "var(--foreground)",
    fontSize: "13px",
    outline: "none",
  };
  const summaryQtyBo = getRawNumber(soLuongBoCua) || 1;
  const summaryTotalBatch = getRawNumber(calculateTongChiPhi());
  const summaryChiPhiSanXuat = summaryTotalBatch;

  const summaryCalculatedVtChinh = getAggregatedGroup(["1.", "2."]).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const summaryCalculatedVtPhu = getAggregatedGroup(["3."]).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const summaryCalculatedVtTieuHao = getAggregatedGroup(["5."]).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const summaryCalculatedPk = getAggregatedGroup(["4."]).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const summaryVtChinh = Math.round(summaryCalculatedVtChinh);
  const summaryVtPhu = Math.round(summaryCalculatedVtPhu);
  const summaryVtTieuHao = Math.round(summaryCalculatedVtTieuHao);
  const summaryPk = Math.round(summaryCalculatedPk);
  const summaryTotalVatTu = summaryVtChinh + summaryVtPhu + summaryVtTieuHao + summaryPk;

  const summaryGiaVon = summaryTotalVatTu + summaryChiPhiSanXuat;
  const summaryLoiNhuanPercentVal = Number(bienLoiNhuanPercent) || 0;
  const summaryLoiNhuan = Math.round(summaryTotalVatTu * (summaryLoiNhuanPercentVal / 100));
  const summaryDonGia = summaryGiaVon + summaryLoiNhuan;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--card)",
        zIndex: 3000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "color-mix(in srgb, var(--primary) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-file-earmark-text text-primary" style={{ fontSize: "18px" }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--foreground)" }}>
              Tạo báo giá
            </h4>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
              Khung thiết kế nội dung hỗ trợ lập báo giá
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Toggle switches "Hình ảnh" and "Kích thước" */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginRight: "8px" }}>
            {/* Hình ảnh Switch */}
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--foreground)", userSelect: "none" }}>
              <span>Hình ảnh</span>
              <div style={{ position: "relative" }}>
                <input
                  type="checkbox"
                  checked={showHinhAnh}
                  onChange={e => setShowHinhAnh(e.target.checked)}
                  style={{ display: "none" }}
                />
                <div style={{ width: "30px", height: "16px", background: showHinhAnh ? "var(--primary)" : "var(--border)", borderRadius: "8px", transition: "background 0.2s" }} />
                <div style={{ position: "absolute", top: "2px", left: showHinhAnh ? "16px" : "2px", width: "12px", height: "12px", background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
              </div>
            </label>

            {/* Kích thước Switch */}
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--foreground)", userSelect: "none" }}>
              <span>Kích thước</span>
              <div style={{ position: "relative" }}>
                <input
                  type="checkbox"
                  checked={showKichThuoc}
                  onChange={e => setShowKichThuoc(e.target.checked)}
                  style={{ display: "none" }}
                />
                <div style={{ width: "30px", height: "16px", background: showKichThuoc ? "var(--primary)" : "var(--border)", borderRadius: "8px", transition: "background 0.2s" }} />
                <div style={{ position: "absolute", top: "2px", left: showKichThuoc ? "16px" : "2px", width: "12px", height: "12px", background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
              </div>
            </label>
          </div>

          {/* Group of buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              disabled={selectedItems.length === 0}
              onClick={handlePrint}
              style={{
                padding: "8px 16px",
                border: "1.5px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: selectedItems.length === 0 ? "not-allowed" : "pointer",
                opacity: selectedItems.length === 0 ? 0.5 : 1,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s",
              }}
            >
              <i className="bi bi-printer" /> In báo giá
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: "8px 18px",
                border: "none",
                background: "var(--primary)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s",
              }}
            >
              <i className="bi bi-save" /> Lưu báo giá
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1.5px solid var(--border)",
                background: "var(--muted)",
                color: "var(--foreground)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                transition: "all 0.15s",
              }}
            >
              <i className="bi bi-x-lg" /> Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Body with Left Sidebar and Right Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "var(--background)" }}>
        {/* Left Sidebar: Customer Information */}
        <div
          style={{
            width: "320px",
            borderRight: "1px solid var(--border)",
            background: "var(--card)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            padding: "24px",
            gap: "20px",
          }}
        >
          {/* Avatar and Main Customer Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--primary)",
                  flexShrink: 0,
                }}
              >
                {(displayName || "?").trim().split(" ").pop()?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h5 style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </h5>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  Mã KH: #{customer?.id?.slice(-6).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
              {customer?.nhom && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  {customer.nhom === "ca-nhan" ? "Cá nhân" : customer.nhom === "doanh-nghiep" ? "Doanh nghiệp" : "Đối tác"}
                </span>
              )}
              {customer?.loai && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: customer.loai === "kim-cuong" ? "color-mix(in srgb, #06b6d4 12%, transparent)" : customer.loai === "vang" ? "color-mix(in srgb, #eab308 12%, transparent)" : "color-mix(in srgb, #94a3b8 12%, transparent)",
                    color: customer.loai === "kim-cuong" ? "#06b6d4" : customer.loai === "vang" ? "#eab308" : "#94a3b8",
                  }}
                >
                  {customer.loai === "kim-cuong" ? "Kim cương" : customer.loai === "vang" ? "Vàng" : "Bạc"}
                </span>
              )}
            </div>
          </div>

          <hr style={{ margin: 0, border: 0, borderTop: "1px solid var(--border)" }} />

          {/* Contact details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <h6 style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
              Thông tin liên hệ
            </h6>

            {/* Representative - Only show if Business since it's redundant/same for Individual */}
            {customer?.nhom !== "ca-nhan" && (
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <i className="bi bi-person-badge text-muted-foreground" style={{ fontSize: "14px", marginTop: "2px" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Người đại diện</div>
                  <div style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>
                    {customer?.daiDien ? `${customer.xungHo || "Anh/Chị"} ${customer.daiDien}` : "—"}
                  </div>
                  {customer?.chucVu && (
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                      Chức vụ: {customer.chucVu}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Phone */}
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <i className="bi bi-telephone text-muted-foreground" style={{ fontSize: "14px", marginTop: "2px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Số điện thoại</div>
                <div style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>
                  {customer?.dienThoai || "—"}
                </div>
              </div>
            </div>

            {/* Email */}
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <i className="bi bi-envelope text-muted-foreground" style={{ fontSize: "14px", marginTop: "2px" }} />
              <div style={{ flex: 1, minWidth: 0, wordBreak: "break-all" }}>
                <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Email</div>
                <div style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>
                  {customer?.email || "—"}
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <i className="bi bi-geo-alt text-muted-foreground" style={{ fontSize: "14px", marginTop: "2px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Địa chỉ</div>
                <div style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500, lineHeight: 1.4 }}>
                  {customer?.address || "—"}
                </div>
              </div>
            </div>
          </div>

          <hr style={{ margin: 0, border: 0, borderTop: "1px solid var(--border)" }} />

          {/* Section: Thông tin báo giá */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <h6 style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
              Thông tin báo giá
            </h6>

            {/* Số báo giá */}
            <div>
              <label style={labelStyle}>Số báo giá</label>
              <input
                type="text"
                value={soPhieu}
                onChange={e => setSoPhieu(e.target.value)}
                style={inputStyle}
                placeholder="Số báo giá..."
              />
            </div>

            {/* Ngày tạo & Ngày hết hạn */}
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ngày tạo</label>
                <input
                  type="date"
                  value={ngayTao}
                  onChange={e => setNgayTao(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ngày hết hạn</label>
                <input
                  type="date"
                  value={ngayHetHan}
                  onChange={e => setNgayHetHan(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Người tạo */}
            <div>
              <label style={labelStyle}>Người tạo</label>
              <select
                value={nguoiTaoId}
                onChange={e => setNguoiTaoId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Chưa phân công</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Tổng tiền hàng */}
            <div>
              <label style={labelStyle}>Tổng tiền hàng</label>
              <div
                style={{
                  ...inputStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--muted)",
                  opacity: 0.85,
                  cursor: "not-allowed",
                  fontWeight: 600,
                }}
              >
                <span>{tongTienHang.toLocaleString("vi-VN")} ₫</span>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 500 }}>
                  Tự động cập nhật
                </span>
              </div>
            </div>

            {/* Chiết khấu & Thuế VAT */}
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Chiết khấu (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={chietKhau || ""}
                  onChange={e => setChietKhau(Math.min(100, Math.max(0, Number(e.target.value))))}
                  style={inputStyle}
                  placeholder="0"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Thuế VAT (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={vat || ""}
                  onChange={e => setVat(Math.min(100, Math.max(0, Number(e.target.value))))}
                  style={inputStyle}
                  placeholder="10"
                />
              </div>
            </div>

            {/* TỔNG CỘNG */}
            <div style={{ marginTop: "6px", padding: "12px", borderRadius: "8px", background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                  Tổng cộng
                </span>
                <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--primary)" }}>
                  {tongCong.toLocaleString("vi-VN")} ₫
                </span>
              </div>

              {/* Bằng chữ */}
              <div style={{ fontSize: "11px", color: "var(--muted-foreground)", fontStyle: "italic", marginTop: "8px", borderTop: "1px dashed var(--border)", paddingTop: "8px", lineHeight: 1.4 }}>
                Bằng chữ: <strong>{numberToVNWords(tongCong)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area: Main Quote Builder Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Top Panel: Search & Add Item */}
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--border)",
              background: "var(--card)",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* Cửa chống cháy Switch */}
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--foreground)", userSelect: "none", flexShrink: 0 }}>
              <span>Cửa chống cháy</span>
              <div style={{ position: "relative" }}>
                <input
                  type="checkbox"
                  checked={cuaChongChay}
                  onChange={e => setCuaChongChay(e.target.checked)}
                  style={{ display: "none" }}
                />
                <div style={{ width: "30px", height: "16px", background: cuaChongChay ? "var(--primary)" : "var(--border)", borderRadius: "8px", transition: "background 0.2s" }} />
                <div style={{ position: "absolute", top: "2px", left: cuaChongChay ? "16px" : "2px", width: "12px", height: "12px", background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
              </div>
            </label>

            {/* Separator */}
            <div style={{ width: "1px", height: "16px", background: "var(--border)", flexShrink: 0 }} />

            {/* Door Type Dropdown */}
            <FilterSelect
              value={loaiCua}
              onChange={setLoaiCua}
              placeholder=""
              options={[
                { label: "Cửa một cánh", value: "một cánh" },
                { label: "Cửa hai cánh đều", value: "hai cánh đều" },
                { label: "Cửa hai cánh lệch", value: "hai cánh lệch" },
              ]}
              width={160}
              className="border-0 shadow-sm"
            />

            <div style={{ position: "relative", flex: 1 }}>
              <SearchInput
                ref={searchInputRef}
                value={searchVal}
                onChange={setSearchVal}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsFocused(false), 200);
                }}
                placeholder="Nhập tên hàng hoá để thêm vào báo giá"
                className="border-0 shadow-sm"
                style={{ width: "100%" }}
              />
              {isFocused && suggestions.length > 0 && (
                <ul
                  ref={suggestionListRef}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 5000,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    listStyle: "none",
                    padding: "4px 0",
                    margin: "4px 0 0 0",
                    maxHeight: "240px",
                    overflowY: "auto",
                  }}
                >
                  {suggestions.map((item, index) => (
                    <li
                      key={item.id}
                      ref={el => { suggestionItemRefs.current[index] = el; }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(item);
                      }}
                      style={{
                        padding: "8px 12px",
                        fontSize: "13px",
                        color: "var(--foreground)",
                        cursor: "pointer",
                        background: index === selectedIndex ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                        outline: "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{item.tenHang || item.name}</span>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {item.code ? `#${item.code}` : ""} {item.giaBan ? `| ${item.giaBan.toLocaleString("vi-VN")} ₫` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tạo mới Button (Red, disabled when search has text) */}
            <button
              type="button"
              disabled={!!searchVal.trim()}
              style={{
                height: "36px",
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: "8px",
                background: !!searchVal.trim() ? "var(--border)" : "#dc3545",
                color: !!searchVal.trim() ? "var(--muted-foreground)" : "#ffffff",
                cursor: !searchVal.trim() ? "pointer" : "not-allowed",
                opacity: !!searchVal.trim() ? 0.6 : 1,
                outline: "none",
                fontWeight: 600,
                fontSize: "13px",
                transition: "all 0.2s ease",
                boxShadow: !searchVal.trim() ? "0 4px 12px rgba(220, 53, 69, 0.2)" : "none",
              }}
              onMouseEnter={e => {
                if (!searchVal.trim()) {
                  e.currentTarget.style.background = "#c82333";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(220, 53, 69, 0.35)";
                }
              }}
              onMouseLeave={e => {
                if (!searchVal.trim()) {
                  e.currentTarget.style.background = "#dc3545";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 53, 69, 0.2)";
                }
              }}
              onClick={() => {
                setNewProductName("");
                setNewProductGroup("Chống cháy");
                setNewProductType("Một cánh");
                setNewProductCao("2.210");
                setNewProductRong("1.000");
                setNewProductDay("39");
                setSoLuongBoCua("300");
                setSanLuong("30");
                setChiPhiNhanCong("61.700.000");
                setChiPhiCoDinh("34.000.000");
                setCalcRows(INITIAL_CALC_ROWS);
                setConfiguringItemId(null);
                setActiveStep(1);
                setIsNewProductModalOpen(true);
              }}
            >
              Tạo mới
            </button>
          </div>

          {/* Main Workspace Area (Design area) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--background)" }}>
            <div style={{ flex: 1, overflowY: "auto", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card)" }}>
                  <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#5c7295", textTransform: "uppercase", letterSpacing: "0.05em", width: "50px", textAlign: "center" }}>STT</th>
                    <th style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#5c7295", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>Tên hàng hoá</th>
                    <th style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#5c7295", textTransform: "uppercase", letterSpacing: "0.05em", width: "90px", textAlign: "center" }}>Don vi</th>
                    {showKichThuoc && (
                      <th style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#5c7295", textTransform: "uppercase", letterSpacing: "0.05em", width: "160px", textAlign: "center" }}>Kích thước</th>
                    )}
                    <th style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#5c7295", textTransform: "uppercase", letterSpacing: "0.05em", width: "150px", textAlign: "right" }}>Đơn giá (đ)</th>
                    <th style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#5c7295", textTransform: "uppercase", letterSpacing: "0.05em", width: "100px", textAlign: "center" }}>Số lượng</th>
                    <th style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#5c7295", textTransform: "uppercase", letterSpacing: "0.05em", width: "140px", textAlign: "right" }}>Thành tiền (đ)</th>
                    {showHinhAnh && (
                      <th style={{ padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#5c7295", textTransform: "uppercase", letterSpacing: "0.05em", width: "120px", textAlign: "center" }}>Hình ảnh</th>
                    )}
                    <th style={{ padding: "8px 12px", width: "80px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, idx) => {
                    const thanhTien = item.giaBan * item.soLuong;
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        {/* STT */}
                        <td style={{ padding: "6px 12px", textAlign: "center", color: "var(--muted-foreground)" }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "6px 12px", color: "var(--foreground)" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                              <span style={{ fontWeight: 700 }}>{item.tenHang}</span>
                              <span style={{
                                fontSize: "10px",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.02em",
                                background: item.cuaChongChay ? "rgba(239, 68, 68, 0.09)" : "rgba(107, 114, 128, 0.09)",
                                color: item.cuaChongChay ? "#ef4444" : "#6b7280",
                                border: item.cuaChongChay ? "1px solid rgba(239, 68, 68, 0.18)" : "1px solid rgba(107, 114, 128, 0.18)"
                              }}>
                                {item.cuaChongChay ? "Chống cháy" : "Không chống cháy"}
                              </span>
                            </div>
                            {renderSpecs(item.thongSoKyThuat)}
                          </div>
                        </td>
                        {/* Đơn vị */}
                        <td style={{ padding: "6px 12px", textAlign: "center", color: "var(--muted-foreground)" }}>
                          {item.donVi}
                        </td>
                        {/* Kích thước */}
                        {showKichThuoc && (
                          <td style={{ padding: "6px 12px", textAlign: "center", color: "var(--foreground)" }}>
                            {item.kichThuoc}
                          </td>
                        )}
                        {/* Đơn giá */}
                        <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--foreground)", fontWeight: 600 }}>
                          {item.giaBan.toLocaleString("vi-VN")}
                        </td>
                        {/* Số lượng */}
                        <td style={{ padding: "4px 12px", textAlign: "center" }}>
                          <input
                            id={`qty-input-${item.id}`}
                            type="number"
                            min={1}
                            value={item.soLuong}
                            onChange={(e) => handleItemQtyChange(item.id, Number(e.target.value))}
                            style={{
                              width: "70px",
                              height: "26px",
                              padding: "2px 6px",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              background: "var(--card)",
                              color: "var(--foreground)",
                              fontSize: "13px",
                              textAlign: "center",
                              outline: "none",
                            }}
                            onFocus={e => {
                              e.currentTarget.style.borderColor = "var(--primary)";
                            }}
                            onBlur={e => {
                              e.currentTarget.style.borderColor = "var(--border)";
                            }}
                          />
                        </td>
                        {/* Thành tiền */}
                        <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--primary)", fontWeight: 700 }}>
                          {thanhTien.toLocaleString("vi-VN")}
                        </td>
                        {/* Hình ảnh */}
                        {showHinhAnh && (
                          <td style={{ padding: "4px 12px", textAlign: "center" }}>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.tenHang}
                                style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", border: "1px solid var(--border)" }}
                              />
                            ) : (
                              <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                                <i className="bi bi-image text-muted-foreground" style={{ fontSize: "12px" }} />
                              </div>
                            )}
                          </td>
                        )}
                        {/* Hành động (Cấu hình & Xóa) */}
                        <td style={{ padding: "6px 12px", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                            {/* Nút cài đặt (Gear) */}
                            <button
                              type="button"
                              onClick={() => {
                                setConfiguringItemId(item.id);
                                setDetailTenHang(item.tenHang || "");
                                setDetailSoLuong(item.soLuong || 1);
                                setDetailLoaiSP(item.loaiSP || "");
                                setDetailLoaiCua(item.loaiCua || "");
                                setDetailDimType(item.dimType || "o-cho");
                                setDetailGiaBan(item.giaBan || 0);

                                const dims = item.cao ? { cao: item.cao, rong: item.rong, day: item.day } : parseDimensions(item.kichThuoc);
                                setDetailCao(dims.cao);
                                setDetailRong(dims.rong);
                                setDetailDay(dims.day);

                                const specs = item.daCua ? {
                                  daCua: item.daCua,
                                  xuongCua: item.xuongCua,
                                  xuongCuaGhepThanh: item.xuongCuaGhepThanh,
                                  giayToOng: item.giayToOng,
                                  xuongKhuon: item.xuongKhuon,
                                  xuongKhuonGhepThanh: item.xuongKhuonGhepThanh,
                                  mdf: item.mdf,
                                  loiCachNhiet: item.loiCachNhiet
                                } : parseSpecs(item.thongSoKyThuat);

                                setDetailDaCua(specs.daCua || "");
                                setDetailXuongCua(specs.xuongCua || "");
                                setDetailXuongCuaGhepThanh(specs.xuongCuaGhepThanh !== undefined ? specs.xuongCuaGhepThanh : false);
                                setDetailGiayToOng(specs.giayToOng || "");
                                setDetailXuongKhuon(specs.xuongKhuon || "");
                                setDetailXuongKhuonGhepThanh(specs.xuongKhuonGhepThanh !== undefined ? specs.xuongKhuonGhepThanh : false);
                                setDetailMdf(specs.mdf || "");
                                setDetailLoiCachNhiet(specs.loiCachNhiet || "");

                                setIsProductConfigOpen(true);
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                color: "var(--muted-foreground)",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "4px",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                                e.currentTarget.style.color = "var(--foreground)";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = "none";
                                e.currentTarget.style.color = "var(--muted-foreground)";
                              }}
                            >
                              <i className="bi bi-gear" />
                            </button>

                            {/* Nút xóa */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItems(prev => {
                                  const nextList = prev.filter(i => i.id !== item.id);
                                  const total = nextList.reduce((sum, i) => sum + (i.giaBan * i.soLuong), 0);
                                  setTongTienHang(total);
                                  return nextList;
                                });
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                color: "var(--muted-foreground)",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "4px",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                                e.currentTarget.style.color = "var(--destructive)";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = "none";
                                e.currentTarget.style.color = "var(--muted-foreground)";
                              }}
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {selectedItems.length === 0 && (
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td colSpan={7 + (showKichThuoc ? 1 : 0) + (showHinhAnh ? 1 : 0)} style={{ padding: "20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                        Nơi thiết kế nội dung hỗ trợ lập báo giá
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isProductConfigOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.3)",
                zIndex: 4000,
                backdropFilter: "blur(1px)",
              }}
            />
            {/* Offcanvas Content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "400px",
                background: "var(--card)",
                borderLeft: "1px solid var(--border)",
                zIndex: 4001,
                boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "10px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <i className="bi bi-gear-fill text-primary" style={{ fontSize: "18px" }} />
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                    Thiết kế chi tiết sản phẩm
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProductConfigOpen(false)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    borderRadius: "4px",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Row 1: Tên sản phẩm & Số lượng */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Tên sản phẩm</label>
                    <input
                      type="text"
                      value={detailTenHang}
                      onChange={e => setDetailTenHang(e.target.value)}
                      placeholder="Tên sản phẩm..."
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Số lượng</label>
                    <input
                      id="detail-so-luong-input"
                      type="number"
                      min={1}
                      value={detailSoLuong}
                      onChange={e => setDetailSoLuong(Math.max(1, Number(e.target.value)))}
                      style={{ ...inputStyle, textAlign: "center" }}
                    />
                  </div>
                </div>

                {/* Row 2: Loại sản phẩm & Loại cửa */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Loại sản phẩm</label>
                    <input
                      type="text"
                      value={detailLoaiSP}
                      onChange={e => setDetailLoaiSP(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Loại cửa</label>
                    <input
                      type="text"
                      value={detailLoaiCua}
                      onChange={e => setDetailLoaiCua(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Row 3: Radio Buttons for Dimension Type */}
                <div style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--foreground)", userSelect: "none" }}>
                    <input
                      type="radio"
                      name="dimensionType"
                      checked={detailDimType === "o-cho"}
                      onChange={() => setDetailDimType("o-cho")}
                      style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                    />
                    <span>Kích thước ô chờ</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "var(--foreground)", userSelect: "none" }}>
                    <input
                      type="radio"
                      name="dimensionType"
                      checked={detailDimType === "khuon-cua"}
                      onChange={() => setDetailDimType("khuon-cua")}
                      style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                    />
                    <span>Kích thước cánh cửa</span>
                  </label>
                </div>

                {/* Row 4: Dimension Values (Cao, Rộng, Dày) */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Cao (mm)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={detailCao || ""}
                      onChange={e => setDetailCao(Number(e.target.value))}
                      style={{ ...inputStyle, textAlign: "right" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Rộng (mm)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={detailRong || ""}
                      onChange={e => setDetailRong(Number(e.target.value))}
                      style={{ ...inputStyle, textAlign: "right" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Dày (mm)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={detailDay || ""}
                      onChange={e => setDetailDay(Number(e.target.value))}
                      style={{ ...inputStyle, textAlign: "right" }}
                    />
                  </div>
                </div>

                {/* Section: Cấu tạo cánh */}
                <div style={{ marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h6 style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
                    Cấu tạo cánh
                  </h6>
                  <MaterialSuggestionInput
                    label="Da cửa"
                    value={detailDaCua}
                    onChange={setDetailDaCua}
                    suggestions={mainMaterials}
                    placeholder="Nhập thông số da cửa..."
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                  />
                  <MaterialSuggestionInput
                    label="Xương cửa"
                    value={detailXuongCua}
                    onChange={setDetailXuongCua}
                    suggestions={mainMaterials}
                    placeholder="Nhập thông số xương cửa..."
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                    addon={
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none", flexShrink: 0 }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>Ghép thanh</span>
                        <div style={{ position: "relative", width: "30px", height: "16px" }}>
                          <input
                            type="checkbox"
                            checked={detailXuongCuaGhepThanh}
                            onChange={e => setDetailXuongCuaGhepThanh(e.target.checked)}
                            style={{ display: "none" }}
                          />
                          <div style={{ width: "30px", height: "16px", background: detailXuongCuaGhepThanh ? "var(--primary)" : "var(--border)", borderRadius: "8px", transition: "background 0.2s" }} />
                          <div style={{ position: "absolute", top: "2px", left: detailXuongCuaGhepThanh ? "16px" : "2px", width: "12px", height: "12px", background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                        </div>
                      </label>
                    }
                  />
                  <MaterialSuggestionInput
                    label="Giấy tổ ong"
                    value={detailGiayToOng}
                    onChange={setDetailGiayToOng}
                    suggestions={toOngMaterials}
                    placeholder="Nhập thông số giấy tổ ong..."
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                  />
                </div>

                {/* Section: Cấu tạo khuôn */}
                <div style={{ marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h6 style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
                    Cấu tạo khuôn
                  </h6>
                  <MaterialSuggestionInput
                    label="Xương khuôn"
                    value={detailXuongKhuon}
                    onChange={setDetailXuongKhuon}
                    suggestions={mainMaterials}
                    placeholder="Nhập thông số xương khuôn..."
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                    addon={
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none", flexShrink: 0 }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>Ghép thanh</span>
                        <div style={{ position: "relative", width: "30px", height: "16px" }}>
                          <input
                            type="checkbox"
                            checked={detailXuongKhuonGhepThanh}
                            onChange={e => setDetailXuongKhuonGhepThanh(e.target.checked)}
                            style={{ display: "none" }}
                          />
                          <div style={{ width: "30px", height: "16px", background: detailXuongKhuonGhepThanh ? "var(--primary)" : "var(--border)", borderRadius: "8px", transition: "background 0.2s" }} />
                          <div style={{ position: "absolute", top: "2px", left: detailXuongKhuonGhepThanh ? "16px" : "2px", width: "12px", height: "12px", background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                        </div>
                      </label>
                    }
                  />
                  <MaterialSuggestionInput
                    label="MDF"
                    value={detailMdf}
                    onChange={setDetailMdf}
                    suggestions={mainMaterials}
                    placeholder="Nhập thông số MDF..."
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                  />
                </div>

                {/* Section: Cấu tạo chống cháy */}
                <div style={{ marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h6 style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: isChongChay ? "var(--muted-foreground)" : "color-mix(in srgb, var(--muted-foreground) 40%, transparent)" }}>
                    Cấu tạo chống cháy
                  </h6>
                  <div>
                    <label style={{ ...labelStyle, color: isChongChay ? "var(--foreground)" : "var(--muted-foreground)" }}>
                      Lớp lõi cách nhiệt
                    </label>
                    <input
                      type="text"
                      disabled={!isChongChay}
                      value={detailLoiCachNhiet}
                      onChange={e => setDetailLoiCachNhiet(e.target.value)}
                      placeholder={isChongChay ? "Nhập thông số lớp lõi cách nhiệt..." : "Không áp dụng cho cửa không chống cháy"}
                      style={{
                        ...inputStyle,
                        background: isChongChay ? "var(--card)" : "var(--muted)",
                        color: isChongChay ? "var(--foreground)" : "var(--muted-foreground)",
                        cursor: isChongChay ? "text" : "not-allowed",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "16px 20px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--card)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsProductConfigOpen(false)}
                  style={{
                    padding: "8px 18px",
                    height: "36px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
                >
                  <i className="bi bi-x-lg" style={{ fontSize: "14px" }} />
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={!isCalculateEnabled}
                  onClick={() => {
                    setVatTuChinhList(prev => prev.map(item => {
                      const lowerHangMuc = (item.hangMuc || "").toLowerCase().trim();
                      if (lowerHangMuc === "da cửa") {
                        return { ...item, loaiVatLieu: detailDaCua };
                      }
                      if (lowerHangMuc === "xương cửa") {
                        return { ...item, loaiVatLieu: detailXuongCua + (detailXuongCuaGhepThanh ? " (Ghép thanh)" : "") };
                      }
                      if (lowerHangMuc === "giấy tổ ong") {
                        return { ...item, loaiVatLieu: detailGiayToOng };
                      }
                      if (lowerHangMuc === "xương khuôn") {
                        return { ...item, loaiVatLieu: detailXuongKhuon + (detailXuongKhuonGhepThanh ? " (Ghép thanh)" : "") };
                      }
                      if (lowerHangMuc === "mdf") {
                        return { ...item, loaiVatLieu: detailMdf };
                      }
                      return item;
                    }));
                    setSoLuongBoCua(detailSoLuong.toLocaleString("vi-VN"));
                    setIsCalculateModalOpen(true);
                  }}
                  style={{
                    padding: "8px 18px",
                    height: "36px",
                    border: "none",
                    background: "var(--primary)",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: isCalculateEnabled ? "pointer" : "not-allowed",
                    opacity: isCalculateEnabled ? 1 : 0.5,
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => {
                    if (isCalculateEnabled) {
                      e.currentTarget.style.filter = "brightness(0.95)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (isCalculateEnabled) {
                      e.currentTarget.style.filter = "none";
                    }
                  }}
                >
                  <i className="bi bi-calculator" style={{ fontSize: "14px" }} />
                  Tính giá bán
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal Tính toán giá bán chi tiết */}
      {isCalculateModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--background)",
            zIndex: 5000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 24px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <i className="bi bi-calculator-fill text-primary" style={{ fontSize: "18px" }} />
                <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                  Tính toán giá bán chi tiết
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCalculateSidebarOpen(!isCalculateSidebarOpen)}
                title={isCalculateSidebarOpen ? "Ẩn thanh thông tin" : "Hiện thanh thông tin"}
                style={{
                  border: "1px solid var(--border)",
                  background: isCalculateSidebarOpen ? "var(--muted)" : "var(--card)",
                  color: "var(--foreground)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                  outline: "none",
                }}
              >
                <i className={`bi ${isCalculateSidebarOpen ? "bi-layout-sidebar" : "bi-layout-sidebar-inset"}`} />
                <span>{isCalculateSidebarOpen ? "Thu nhỏ" : "Thông tin sản phẩm"}</span>
              </button>
              {!isCalculateSidebarOpen && (
                <>
                  <div className="vr text-muted opacity-25" style={{ height: "16px" }} />
                  <span style={{ fontSize: "12.5px", color: "var(--muted-foreground)" }}>
                    Sản phẩm: <strong style={{ color: "var(--foreground)" }}>{detailTenHang}</strong> ({detailCao}x{detailRong}x{detailDay}mm)
                  </span>
                  <div className="vr text-muted opacity-25" style={{ height: "16px" }} />
                  <span style={{ fontSize: "12.5px", color: "#b91c1c", fontWeight: 700 }}>
                    Đề xuất: {suggestedPrice.toLocaleString("vi-VN")} đ
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsCalculateModalOpen(false)}
              style={{
                border: "none",
                background: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px",
                borderRadius: "6px",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          {/* Body Split 4 - 8 */}
          <div
            style={{
              flex: 1,
              display: "flex",
              overflow: "hidden",
            }}
          >
            {/* Phần 4 bên trái (width 300px) */}
            {isCalculateSidebarOpen && (
              <div
                style={{
                  width: "300px",
                  borderRight: "1px solid var(--border)",
                  background: "var(--card)",
                  padding: "24px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                  flexShrink: 0,
                }}
              >
                <h6
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--primary)",
                  }}
                >
                  Thông tin về sản phẩm
                </h6>

                <p
                  style={{
                    margin: "-10px 0 0 0",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--foreground)",
                    lineHeight: "1.5",
                  }}
                >
                  {detailTenHang} - {detailLoaiSP} - {detailLoaiCua} - {detailDimType === "o-cho" ? "Kích thước ô chờ" : "Kích thước cánh cửa"} - {detailCao}x{detailRong}x{detailDay} mm
                </p>

                <div
                  style={{
                    margin: "6px 0 0 0",
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#b91c1c",
                  }}
                >
                  Giá bán đề xuất: {suggestedPrice.toLocaleString("vi-VN")} đồng
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Tên sản phẩm</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{detailTenHang}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Số lượng</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{detailSoLuong}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Loại sản phẩm</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{detailLoaiSP}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Loại cửa</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{detailLoaiCua}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Kích thước</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>
                      {detailCao} x {detailRong} x {detailDay} mm ({detailDimType === "o-cho" ? "Ô chờ" : "Cánh cửa"})
                    </span>
                  </div>

                  {/* Chi tiết cấu tạo */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Cấu tạo chi tiết</span>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Da cửa</span>
                      <span style={{ fontSize: "12px", color: "var(--foreground)" }}>{detailDaCua || "—"}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Xương cửa</span>
                      <span style={{ fontSize: "12px", color: "var(--foreground)" }}>
                        {detailXuongCua || "—"} {detailXuongCuaGhepThanh && "(Ghép thanh)"}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Giấy tổ ong</span>
                      <span style={{ fontSize: "12px", color: "var(--foreground)" }}>{detailGiayToOng || "—"}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Xương khuôn</span>
                      <span style={{ fontSize: "12px", color: "var(--foreground)" }}>
                        {detailXuongKhuon || "—"} {detailXuongKhuonGhepThanh && "(Ghép thanh)"}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>MDF</span>
                      <span style={{ fontSize: "12px", color: "var(--foreground)" }}>{detailMdf || "—"}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Lõi cách nhiệt</span>
                      <span style={{ fontSize: "12px", color: "var(--foreground)" }}>
                        {isChongChay ? (detailLoiCachNhiet || "—") : "Không áp dụng"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Phần bên phải (flex: 1) */}
            <div
              style={{
                flex: 1,
                background: "var(--background)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Tab Navigation */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--card)",
                  padding: "0 24px",
                  gap: "24px",
                  height: "48px",
                  alignItems: "center",
                }}
              >
                {[
                  { id: "vat-tu-chinh", label: "Vật tư chính" },
                  { id: "phu-kien-vat-tu-phu", label: "Phụ kiện và vật tư phụ" },
                  { id: "vat-tu-bao-goi", label: "Vật tư bao gói" },
                  { id: "tong-hop", label: "Tổng hợp" },
                ].map(tab => {
                  const isActive = activeCalcTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCalcTab(tab.id)}
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "none",
                        border: "none",
                        borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                        color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: "0 4px",
                        transition: "all 0.15s ease",
                        outline: "none",
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.color = "var(--foreground)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.color = "var(--muted-foreground)";
                        }
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Area */}
              <div
                style={{
                  flex: 1,
                  padding: "24px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {activeCalcTab === "vat-tu-chinh" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h6 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                        Danh sách vật tư chính
                      </h6>
                      <button
                        type="button"
                        onClick={() => {
                          const newId = Date.now().toString();
                          setVatTuChinhList(prev => [
                            ...prev,
                            {
                              id: newId,
                              hangMuc: "",
                              loaiVatLieu: "",
                              donVi: "",
                              day: 0,
                              rong: 0,
                              cao: 0,
                              heSo: 1,
                              soLuongTamCat: 0,
                              tongThanhCan: 0,
                              soTamCan: 0,
                              cong: 0,
                              offcut: 0,
                              quyDoi: 0,
                              haoHut: 0,
                              tongCong: 0
                            }
                          ]);
                        }}
                        style={{
                          padding: "4px 12px",
                          height: "28px",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          color: "var(--foreground)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                        onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
                      >
                        <i className="bi bi-plus-lg" />
                        Thêm dòng
                      </button>
                    </div>

                    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflowX: "auto", background: "var(--card)" }}>
                      <table style={{ width: "100%", minWidth: "1400px", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "110px" }}>Hạng mục</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "160px" }}>Loại vật liệu</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "60px" }}>Đơn vị</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "70px", textAlign: "right" }}>Dày (mm)</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "70px", textAlign: "right" }}>Rộng (mm)</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "70px", textAlign: "right" }}>Cao (mm)</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "60px", textAlign: "right" }}>Hệ số</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "110px", textAlign: "right" }}>Số lượng tấm cắt</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "90px", textAlign: "right" }}>Tổng thanh cần</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "80px", textAlign: "right" }}>Số tấm cần</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "70px", textAlign: "right" }}>Cộng</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "70px", textAlign: "right" }}>Offcut</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "120px", textAlign: "right" }}>Quy đổi thành tấm</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "80px", textAlign: "right" }}>Hao hụt</th>
                            <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "80px", textAlign: "right" }}>Tổng cộng</th>
                            <th style={{ padding: "10px 12px", width: "40px", textAlign: "center" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {vatTuChinhList.map((item, idx) => (
                            <tr key={item.id} style={{ borderBottom: idx === vatTuChinhList.length - 1 ? "none" : "1px solid var(--border)" }}>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="text"
                                  value={item.hangMuc}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, hangMuc: val } : p));
                                  }}
                                  placeholder="Hạng mục..."
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="text"
                                  value={item.loaiVatLieu}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, loaiVatLieu: val } : p));
                                  }}
                                  placeholder="Vật liệu..."
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="text"
                                  value={item.donVi}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, donVi: val } : p));
                                  }}
                                  placeholder="m2..."
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={item.day}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, day: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={item.rong}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, rong: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={item.cao}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, cao: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={item.heSo}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, heSo: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={item.soLuongTamCat}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, soLuongTamCat: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={item.tongThanhCan}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, tongThanhCan: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={item.soTamCan}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, soTamCan: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  step="any"
                                  value={item.cong}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, cong: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={item.offcut}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, offcut: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  step="any"
                                  value={item.quyDoi}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, quyDoi: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  value={item.haoHut}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, haoHut: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px" }}>
                                <input
                                  type="number"
                                  step="any"
                                  value={item.tongCong}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setVatTuChinhList(prev => prev.map(p => p.id === item.id ? { ...p, tongCong: val } : p));
                                  }}
                                  style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "4px", borderRadius: "4px", outline: "none", color: "var(--foreground)", textAlign: "right", fontWeight: "600" }}
                                  onFocus={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--background)"; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                                />
                              </td>
                              <td style={{ padding: "4px 6px", textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => setVatTuChinhList(prev => prev.filter(p => p.id !== item.id))}
                                  style={{
                                    border: "none",
                                    background: "none",
                                    color: "var(--muted-foreground)",
                                    cursor: "pointer",
                                    padding: "4px",
                                    borderRadius: "4px",
                                    transition: "all 0.2s",
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                                    e.currentTarget.style.color = "var(--destructive)";
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = "none";
                                    e.currentTarget.style.color = "var(--muted-foreground)";
                                  }}
                                >
                                  <i className="bi bi-trash" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {vatTuChinhList.length === 0 && (
                            <tr>
                              <td colSpan={16} style={{ padding: "20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                                Chưa có hạng mục vật tư chính nào. Bấm "Thêm dòng" để thêm mới.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeCalcTab === "phu-kien-vat-tu-phu" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Section 1: Danh sách phụ kiện */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h6 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                          1. Danh sách phụ kiện
                        </h6>
                        <button
                          type="button"
                          onClick={() => {
                            const newId = Date.now().toString();
                            setPhuKienList(prev => [...prev, { id: newId, loai: "", sanPham: "", soLuong: 1, donVi: "" }]);
                          }}
                          style={{
                            padding: "4px 12px",
                            height: "28px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            background: "var(--card)",
                            color: "var(--foreground)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                          onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
                        >
                          <i className="bi bi-plus-lg" />
                          Thêm dòng
                        </button>
                      </div>

                      <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", background: "var(--card)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                          <thead>
                            <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                              <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "20%" }}>Loại phụ kiện</th>
                              <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "50%" }}>Sản phẩm và thương hiệu</th>
                              <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "15%", textAlign: "center" }}>Số lượng</th>
                              <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "10%" }}>Đơn vị</th>
                              <th style={{ padding: "10px 12px", width: "5%", textAlign: "center" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {phuKienList.map((item, idx) => (
                              <tr key={item.id} style={{ borderBottom: idx === phuKienList.length - 1 ? "none" : "1px solid var(--border)" }}>
                                <td style={{ padding: "6px 8px" }}>
                                  <input
                                    type="text"
                                    value={item.loai}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setPhuKienList(prev => prev.map(p => p.id === item.id ? { ...p, loai: val } : p));
                                    }}
                                    placeholder="Ví dụ: Bản lề..."
                                    style={{
                                      width: "100%",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      fontSize: "13px",
                                      padding: "4px 6px",
                                      borderRadius: "4px",
                                      outline: "none",
                                      color: "var(--foreground)",
                                    }}
                                    onFocus={e => {
                                      e.currentTarget.style.borderColor = "var(--border)";
                                      e.currentTarget.style.background = "var(--background)";
                                    }}
                                    onBlur={e => {
                                      e.currentTarget.style.borderColor = "transparent";
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input
                                    type="text"
                                    value={item.sanPham}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setPhuKienList(prev => prev.map(p => p.id === item.id ? { ...p, sanPham: val } : p));
                                    }}
                                    placeholder="Ví dụ: Bản lề lá inox 304 Häfele..."
                                    style={{
                                      width: "100%",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      fontSize: "13px",
                                      padding: "4px 6px",
                                      borderRadius: "4px",
                                      outline: "none",
                                      color: "var(--foreground)",
                                    }}
                                    onFocus={e => {
                                      e.currentTarget.style.borderColor = "var(--border)";
                                      e.currentTarget.style.background = "var(--background)";
                                    }}
                                    onBlur={e => {
                                      e.currentTarget.style.borderColor = "transparent";
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.soLuong}
                                    onChange={e => {
                                      const val = Math.max(1, Number(e.target.value));
                                      setPhuKienList(prev => prev.map(p => p.id === item.id ? { ...p, soLuong: val } : p));
                                    }}
                                    style={{
                                      width: "70px",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      fontSize: "13px",
                                      padding: "4px 6px",
                                      borderRadius: "4px",
                                      textAlign: "center",
                                      outline: "none",
                                      color: "var(--foreground)",
                                    }}
                                    onFocus={e => {
                                      e.currentTarget.style.borderColor = "var(--border)";
                                      e.currentTarget.style.background = "var(--background)";
                                    }}
                                    onBlur={e => {
                                      e.currentTarget.style.borderColor = "transparent";
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input
                                    type="text"
                                    value={item.donVi}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setPhuKienList(prev => prev.map(p => p.id === item.id ? { ...p, donVi: val } : p));
                                    }}
                                    placeholder="cái, bộ..."
                                    style={{
                                      width: "100%",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      fontSize: "13px",
                                      padding: "4px 6px",
                                      borderRadius: "4px",
                                      outline: "none",
                                      color: "var(--foreground)",
                                    }}
                                    onFocus={e => {
                                      e.currentTarget.style.borderColor = "var(--border)";
                                      e.currentTarget.style.background = "var(--background)";
                                    }}
                                    onBlur={e => {
                                      e.currentTarget.style.borderColor = "transparent";
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => setPhuKienList(prev => prev.filter(p => p.id !== item.id))}
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: "var(--muted-foreground)",
                                      cursor: "pointer",
                                      padding: "4px",
                                      borderRadius: "4px",
                                      transition: "all 0.2s",
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                                      e.currentTarget.style.color = "var(--destructive)";
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.background = "none";
                                      e.currentTarget.style.color = "var(--muted-foreground)";
                                    }}
                                  >
                                    <i className="bi bi-trash" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {phuKienList.length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                                  Chưa có phụ kiện nào. Bấm "Thêm dòng" để thêm mới.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 2: Vật tư phụ */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h6 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                          2. Vật tư phụ
                        </h6>
                        <button
                          type="button"
                          onClick={() => {
                            const newId = Date.now().toString();
                            setVatTuPhuList(prev => [...prev, { id: newId, loai: "", sanPham: "", soLuong: 1, donVi: "" }]);
                          }}
                          style={{
                            padding: "4px 12px",
                            height: "28px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            background: "var(--card)",
                            color: "var(--foreground)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                          onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
                        >
                          <i className="bi bi-plus-lg" />
                          Thêm dòng
                        </button>
                      </div>

                      <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", background: "var(--card)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                          <thead>
                            <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                              <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "20%" }}>Loại vật tư</th>
                              <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "50%" }}>Sản phẩm và thương hiệu</th>
                              <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "15%", textAlign: "center" }}>Số lượng</th>
                              <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--muted-foreground)", width: "10%" }}>Đơn vị</th>
                              <th style={{ padding: "10px 12px", width: "5%", textAlign: "center" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {vatTuPhuList.map((item, idx) => (
                              <tr key={item.id} style={{ borderBottom: idx === vatTuPhuList.length - 1 ? "none" : "1px solid var(--border)" }}>
                                <td style={{ padding: "6px 8px" }}>
                                  <input
                                    type="text"
                                    value={item.loai}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setVatTuPhuList(prev => prev.map(v => v.id === item.id ? { ...v, loai: val } : v));
                                    }}
                                    placeholder="Ví dụ: Vít..."
                                    style={{
                                      width: "100%",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      fontSize: "13px",
                                      padding: "4px 6px",
                                      borderRadius: "4px",
                                      outline: "none",
                                      color: "var(--foreground)",
                                    }}
                                    onFocus={e => {
                                      e.currentTarget.style.borderColor = "var(--border)";
                                      e.currentTarget.style.background = "var(--background)";
                                    }}
                                    onBlur={e => {
                                      e.currentTarget.style.borderColor = "transparent";
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input
                                    type="text"
                                    value={item.sanPham}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setVatTuPhuList(prev => prev.map(v => v.id === item.id ? { ...v, sanPham: val } : v));
                                    }}
                                    placeholder="Ví dụ: Keo silicon Apollo A500..."
                                    style={{
                                      width: "100%",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      fontSize: "13px",
                                      padding: "4px 6px",
                                      borderRadius: "4px",
                                      outline: "none",
                                      color: "var(--foreground)",
                                    }}
                                    onFocus={e => {
                                      e.currentTarget.style.borderColor = "var(--border)";
                                      e.currentTarget.style.background = "var(--background)";
                                    }}
                                    onBlur={e => {
                                      e.currentTarget.style.borderColor = "transparent";
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.soLuong}
                                    onChange={e => {
                                      const val = Math.max(1, Number(e.target.value));
                                      setVatTuPhuList(prev => prev.map(v => v.id === item.id ? { ...v, soLuong: val } : v));
                                    }}
                                    style={{
                                      width: "70px",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      fontSize: "13px",
                                      padding: "4px 6px",
                                      borderRadius: "4px",
                                      textAlign: "center",
                                      outline: "none",
                                      color: "var(--foreground)",
                                    }}
                                    onFocus={e => {
                                      e.currentTarget.style.borderColor = "var(--border)";
                                      e.currentTarget.style.background = "var(--background)";
                                    }}
                                    onBlur={e => {
                                      e.currentTarget.style.borderColor = "transparent";
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input
                                    type="text"
                                    value={item.donVi}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setVatTuPhuList(prev => prev.map(v => v.id === item.id ? { ...v, donVi: val } : v));
                                    }}
                                    placeholder="cái, lọ..."
                                    style={{
                                      width: "100%",
                                      border: "1px solid transparent",
                                      background: "transparent",
                                      fontSize: "13px",
                                      padding: "4px 6px",
                                      borderRadius: "4px",
                                      outline: "none",
                                      color: "var(--foreground)",
                                    }}
                                    onFocus={e => {
                                      e.currentTarget.style.borderColor = "var(--border)";
                                      e.currentTarget.style.background = "var(--background)";
                                    }}
                                    onBlur={e => {
                                      e.currentTarget.style.borderColor = "transparent";
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => setVatTuPhuList(prev => prev.filter(v => v.id !== item.id))}
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: "var(--muted-foreground)",
                                      cursor: "pointer",
                                      padding: "4px",
                                      borderRadius: "4px",
                                      transition: "all 0.2s",
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                                      e.currentTarget.style.color = "var(--destructive)";
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.background = "none";
                                      e.currentTarget.style.color = "var(--muted-foreground)";
                                    }}
                                  >
                                    <i className="bi bi-trash" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {vatTuPhuList.length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                                  Chưa có vật tư phụ nào. Bấm "Thêm dòng" để thêm mới.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeCalcTab === "vat-tu-bao-goi" && (
                  <div style={{ padding: "20px", border: "1px dashed var(--border)", borderRadius: "8px", background: "var(--card)", textAlign: "center" }}>
                    <div style={{ color: "var(--primary)", marginBottom: "8px" }}><i className="bi bi-box-seam" style={{ fontSize: "24px" }} /></div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Danh sách Vật tư bao gói</span>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted-foreground)" }}>
                      Nơi thiết kế danh sách và tính toán các chi phí bao bì đóng gói (màng PE, bìa carton, băng dính,...).
                    </p>
                  </div>
                )}

                {activeCalcTab === "tong-hop" && (
                  <div style={{ padding: "20px", border: "1px dashed var(--border)", borderRadius: "8px", background: "var(--card)", textAlign: "center" }}>
                    <div style={{ color: "var(--primary)", marginBottom: "8px" }}><i className="bi bi-calculator" style={{ fontSize: "24px" }} /></div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Bảng tổng hợp chi phí & Giá bán</span>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted-foreground)" }}>
                      Nơi thiết kế bảng tổng hợp tất cả các chi phí và định cấu hình lợi nhuận, thuế phí để đưa ra giá bán đề xuất.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Footer of Calculate Modal */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border)",
              background: "var(--card)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => setIsCalculateModalOpen(false)}
              style={{
                padding: "8px 16px",
                height: "36px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "8px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={handleSaveProductConfig}
              style={{
                padding: "8px 18px",
                height: "36px",
                border: "none",
                background: "var(--primary)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.95)"}
              onMouseLeave={e => e.currentTarget.style.filter = "none"}
            >
              <i className="bi bi-check-lg" style={{ fontSize: "14px" }} />
              Áp dụng & Lưu cấu hình
            </button>
          </div>
        </div>
      )}

      {/* Modal Thiết kế loại hàng hoá mới */}
      {isNewProductModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--background)",
            zIndex: 6000,
            display: "flex",
            flexDirection: "column",
            animation: "slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <style>{`
            @keyframes slideInUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          {/* Header */}
          <div
            style={{
              padding: "8px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--card)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(220, 53, 69, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-palette text-danger" style={{ fontSize: "14px" }} />
                </div>
                <div>
                  <h6 style={{ fontWeight: 700, margin: 0, fontSize: "14px", color: "var(--foreground)" }}>
                    Xây dựng giá bán hàng cho sản phẩm
                  </h6>
                  <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                    Thiết lập cấu trúc giá bán & Định nghĩa định mức chi phí
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-light rounded-pill px-4 fw-bold"
              style={{ fontSize: "12px", height: "32px" }}
              onClick={() => setIsNewProductModalOpen(false)}
            >
              Đóng
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "rgba(0,0,0,0.02)" }}>

            {/* Left Column: Specification panel */}
            <div style={{ width: "380px", background: "var(--card)", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
              <div style={{ padding: "12px 20px 4px 20px" }}>
                <span className="text-danger fw-bold small text-uppercase" style={{ letterSpacing: "0.05em", fontSize: "12px" }}>Thông số sản phẩm</span>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px 20px" }} className="custom-scrollbar">
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div>
                    <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: "11px" }}>Tên loại hàng hoá thiết kế *</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      style={{ fontSize: "13px" }}
                      placeholder="Ví dụ: Cửa gỗ Laminate cao cấp"
                      value={newProductName}
                      onChange={e => setNewProductName(e.target.value)}
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: "11px" }}>Nhóm sản phẩm</label>
                      <select
                        className="form-select rounded-3"
                        style={{ fontSize: "13px" }}
                        value={newProductGroup}
                        onChange={e => setNewProductGroup(e.target.value)}
                      >
                        <option>Chống cháy</option>
                        <option>Không chống cháy</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: "11px" }}>Loại sản phẩm</label>
                      <select
                        className="form-select rounded-3"
                        style={{ fontSize: "13px" }}
                        value={newProductType}
                        onChange={e => setNewProductType(e.target.value)}
                      >
                        <option>Một cánh</option>
                        <option>Hai cánh đều</option>
                        <option>Hai cánh lệch</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-2" style={{ marginBottom: "-10px" }}>
                    <span className="text-danger fw-bold small text-uppercase" style={{ letterSpacing: "0.05em", fontSize: "11px" }}>Kích thước cánh</span>
                  </div>

                  <div className="row g-2">
                    <div className="col-4">
                      <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: "11px" }}>Cao (mm)</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        style={{ fontSize: "13px" }}
                        value={newProductCao}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "");
                          setNewProductCao(val.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                        }}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: "11px" }}>Rộng (mm)</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        style={{ fontSize: "13px" }}
                        value={newProductRong}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "");
                          setNewProductRong(val.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                        }}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: "11px" }}>Dày (mm)</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        style={{ fontSize: "13px" }}
                        value={newProductDay}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "");
                          setNewProductDay(val.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-2" style={{ marginBottom: "-10px" }}>
                    <span className="text-danger fw-bold small text-uppercase" style={{ letterSpacing: "0.05em", fontSize: "11px" }}>Định mức sản xuất</span>
                  </div>

                  <div className="table-responsive rounded-3 border">
                    <table className="table table-sm table-borderless mb-0 align-middle" style={{ fontSize: "12px" }}>
                      <tbody>
                        <tr className="border-bottom" style={{ height: "40px" }}>
                          <td className="ps-3 fw-semibold text-muted" style={{ width: "55%" }}>Số lượng bộ cửa</td>
                          <td className="pe-3">
                            <input
                              type="text"
                              className="form-control form-control-sm text-end fw-bold border-0 bg-light rounded-2"
                              style={{ fontSize: "12px", height: "28px" }}
                              value={soLuongBoCua}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, "");
                                setSoLuongBoCua(val.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                              }}
                            />
                          </td>
                        </tr>
                        <tr className="border-bottom" style={{ height: "40px" }}>
                          <td className="ps-3 fw-semibold text-muted" style={{ width: "55%" }}>Sản lượng (bộ/ngày)</td>
                          <td className="pe-3">
                            <input
                              type="text"
                              className="form-control form-control-sm text-end fw-bold border-0 bg-light rounded-2"
                              style={{ fontSize: "12px", height: "28px" }}
                              value={sanLuong}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, "");
                                setSanLuong(val.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                              }}
                            />
                          </td>
                        </tr>
                        <tr className="border-bottom" style={{ height: "40px" }}>
                          <td className="ps-3 fw-semibold text-muted">Thời gian thực hiện (ngày)</td>
                          <td className="pe-3">
                            <input
                              type="text"
                              className="form-control form-control-sm text-end fw-bold border-0 rounded-2"
                              style={{ fontSize: "12px", height: "28px", backgroundColor: "#e9ecef", color: "#6c757d", cursor: "not-allowed" }}
                              value={getThoiGianThucHien()}
                              readOnly
                              disabled
                            />
                          </td>
                        </tr>
                        <tr className="border-bottom" style={{ height: "40px" }}>
                          <td className="ps-3 fw-semibold text-muted">Chi phí nhân công sản xuất</td>
                          <td className="pe-3">
                            <input
                              type="text"
                              className="form-control form-control-sm text-end fw-bold border-0 bg-light rounded-2"
                              style={{ fontSize: "12px", height: "28px" }}
                              value={chiPhiNhanCong}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, "");
                                setChiPhiNhanCong(val.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                              }}
                            />
                          </td>
                        </tr>
                        <tr className="border-bottom" style={{ height: "40px" }}>
                          <td className="ps-3 fw-semibold text-muted">Chi phí quản lý</td>
                          <td className="pe-3">
                            <input
                              type="text"
                              className="form-control form-control-sm text-end fw-bold border-0 rounded-2"
                              style={{ fontSize: "12px", height: "28px", backgroundColor: "#e9ecef", color: "#6c757d", cursor: "not-allowed" }}
                              value={getChiPhiQuanLyVal()}
                              readOnly
                              disabled
                            />
                          </td>
                        </tr>
                        <tr className="border-bottom" style={{ height: "40px" }}>
                          <td className="ps-3 fw-semibold text-muted">Chi phí cố định</td>
                          <td className="pe-3">
                            <input
                              type="text"
                              className="form-control form-control-sm text-end fw-bold border-0 bg-light rounded-2"
                              style={{ fontSize: "12px", height: "28px" }}
                              value={chiPhiCoDinh}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, "");
                                setChiPhiCoDinh(val.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
                              }}
                            />
                          </td>
                        </tr>
                        <tr className="border-bottom" style={{ height: "40px" }}>
                          <td className="ps-3 fw-semibold text-muted">Dao cụ, dụng cụ</td>
                          <td className="pe-3">
                            <input
                              type="text"
                              className="form-control form-control-sm text-end fw-bold border-0 rounded-2"
                              style={{ fontSize: "12px", height: "28px", backgroundColor: "#e9ecef", color: "#6c757d", cursor: "not-allowed" }}
                              value={getDaoCuDungCuVal()}
                              readOnly
                              disabled
                            />
                          </td>
                        </tr>
                        <tr className="bg-light-subtle" style={{ height: "40px" }}>
                          <td className="ps-3 fw-bold text-danger">Tổng cộng chi phí</td>
                          <td className="pe-3 text-end fw-bold text-danger" style={{ fontSize: "13px" }}>
                            {calculateTongChiPhi()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="row g-2 align-items-center mt-2 px-1">
                    <div className="col-8">
                      <label className="form-label fw-bold small text-muted mb-0" style={{ fontSize: "11px" }}>Biên lợi nhuận</label>
                    </div>
                    <div className="col-4">
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control text-end fw-bold bg-light rounded-2 border-0"
                          style={{ fontSize: "12px", height: "28px" }}
                          value={bienLoiNhuanPercent}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, "");
                            setBienLoiNhuanPercent(val);
                          }}
                        />
                        <span className="input-group-text bg-light border-0 fw-bold text-muted" style={{ fontSize: "11px", height: "28px" }}>%</span>
                      </div>
                    </div>
                  </div>


                </div>
              </div>


            </div>

            {/* Right Column: Calculations Workspace */}
            <div style={{ flex: 1, background: "var(--background)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Stepper Header Container */}
              <div style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
                <ModernStepper
                  steps={[
                    { num: 1, id: "tong-hop", title: "Tổng hợp", desc: "Tổng hợp chi phí & báo giá", icon: "bi-calculator" },
                    { num: 2, id: "vat-tu", title: "Vật tư", desc: "Định mức vật tư chi tiết", icon: "bi-box" },
                    { num: 3, id: "chiet-tinh", title: "Chiết tính khối lượng", desc: "Chi tiết chiết tính gia công", icon: "bi-layout-three-columns" }
                  ]}
                  currentStep={activeStep}
                  onStepChange={setActiveStep}
                />
              </div>

              {/* Stepper Content Area */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "24px" }} className="custom-scrollbar">
                {activeStep === 1 && (() => {
                  const qtyBo = getRawNumber(soLuongBoCua) || 1;
                  const totalBatch = getRawNumber(calculateTongChiPhi());

                  // 1. Chi phí sản xuất per door
                  const chiPhiSanXuatPerDoor = Math.round(totalBatch / qtyBo);

                  // 2. Chi phí vật tư & phụ kiện
                  const calculatedVtChinh = getAggregatedGroup(["1.", "2."]).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
                  const calculatedVtPhu = getAggregatedGroup(["3."]).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
                  const calculatedVtTieuHao = getAggregatedGroup(["5."]).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
                  const calculatedPk = getAggregatedGroup(["4."]).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

                  const vtChinh = Math.round(calculatedVtChinh);
                  const vtPhu = Math.round(calculatedVtPhu);
                  const vtTieuHao = Math.round(calculatedVtTieuHao);
                  const pk = Math.round(calculatedPk);
                  const totalVatTuPhuKien = vtChinh + vtPhu + vtTieuHao + pk;

                  // Chi phí sản xuất dòng (Tổng cộng lô hàng)
                  const chiPhiSanXuatRowVal = totalBatch;

                  // 3. Giá vốn bán hàng (COGS tổng cộng lô hàng)
                  const giaVonBanHang = totalVatTuPhuKien + chiPhiSanXuatRowVal;

                  // 4. Lợi nhuận (Lợi nhuận tổng cộng lô hàng)
                  const loiNhuanPercentVal = Number(bienLoiNhuanPercent) || 0;
                  const loiNhuanVal = Math.round(totalVatTuPhuKien * (loiNhuanPercentVal / 100));

                  // 5. Giá xuất xưởng (Tổng cộng lô hàng)
                  const giaXuatXuong = giaVonBanHang + loiNhuanVal;

                  // 6. Đơn giá cho một bộ cửa (Đơn giá đơn vị)
                  const donGiaBoCua = Math.round(giaXuatXuong / qtyBo);

                  // 6. Đơn giá cho mỗi m2
                  const caoVal = getRawNumber(newProductCao) || 0;
                  const rongVal = getRawNumber(newProductRong) || 0;
                  const areaM2 = (caoVal / 1000) * (rongVal / 1000) || 1.98; // Default to 1.98 m2 if 0
                  const donGiaM2 = Math.round(donGiaBoCua / areaM2);

                  const costPerDoorStr = chiPhiSanXuatPerDoor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  const donGiaBoCuaStr = donGiaBoCua.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  const donGiaM2Str = donGiaM2.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  const loiNhuanStr = loiNhuanVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

                  return (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", paddingRight: "4px" }} className="custom-scrollbar">
                      {/* Summary Cards */}
                      <div className="d-flex flex-wrap gap-3 mb-4 p-3 rounded-3 bg-light border-0" style={{ background: "rgba(0,0,0,0.015)" }}>
                        <div style={{ flex: 1, minWidth: "180px" }}>
                          <span className="text-muted small fw-semibold d-block mb-1">Chi phí SX một bộ cửa</span>
                          <h3 className="fw-bold text-dark mb-0" style={{ fontSize: "20px" }}>
                            {costPerDoorStr} <span style={{ fontSize: "12px", fontWeight: "normal" }}>đ/bộ</span>
                          </h3>
                        </div>
                        <div style={{ flex: 1, minWidth: "180px", borderLeft: "1px solid var(--border)", paddingLeft: "15px" }}>
                          <span className="text-muted small fw-semibold d-block mb-1">Đơn giá bán một bộ cửa</span>
                          <h3 className="fw-bold text-danger mb-0" style={{ fontSize: "22px" }}>
                            {donGiaBoCuaStr} <span style={{ fontSize: "13px", fontWeight: "normal" }}>đ/bộ</span>
                          </h3>
                        </div>
                        <div style={{ flex: 1, minWidth: "180px", borderLeft: "1px solid var(--border)", paddingLeft: "15px" }}>
                          <span className="text-muted small fw-semibold d-block mb-1">Đơn giá bán trên m²</span>
                          <h4 className="fw-bold text-dark mb-0" style={{ fontSize: "20px" }}>
                            {donGiaM2Str} <span style={{ fontSize: "12px", fontWeight: "normal" }}>đ/m²</span>
                          </h4>
                          <span className="text-muted" style={{ fontSize: "12px" }}>
                            (Diện tích cánh: {areaM2.toFixed(3)} m²)
                          </span>
                        </div>
                      </div>

                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <h6 className="fw-bold text-dark mb-0 d-flex align-items-center">
                          <i className="bi bi-table me-2 text-danger" /> Bảng chiết tính chi phí tổng hợp
                        </h6>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm fw-bold px-3 d-flex align-items-center gap-2 shadow-none"
                            style={{ height: "30px", fontSize: "12px", borderRadius: "8px" }}
                            onClick={async () => {
                              setShowAnalysis(true);
                              setAnalysisLoading(true);
                              setAnalysisContent("");
                              try {
                                const res = await fetch("/api/plan-finance/quotations/ai-analysis", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    tenHang: newProductName.trim() || detailTenHang,
                                    qtyBo: qtyBo,
                                    vtChinh: Math.round(vtChinh / qtyBo),
                                    vtPhu: Math.round(vtPhu / qtyBo),
                                    vtTieuHao: Math.round(vtTieuHao / qtyBo),
                                    pk: Math.round(pk / qtyBo),
                                    chiPhiSanXuatPerDoor: chiPhiSanXuatPerDoor,
                                    giaVonBanHang: Math.round(giaVonBanHang / qtyBo),
                                    loiNhuanVal: Math.round(loiNhuanVal / qtyBo),
                                    donGiaBoCua: donGiaBoCua,
                                    donGiaM2: donGiaM2,
                                    bienLoiNhuanPercent: Number(bienLoiNhuanPercent) || 0,
                                    kichThuoc: `${detailCao} x ${detailRong} x ${detailDay} mm`
                                  })
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setAnalysisContent(data.analysis);
                                } else {
                                  setAnalysisContent("Có lỗi xảy ra khi phân tích bằng AI: " + data.error);
                                }
                              } catch (err: any) {
                                setAnalysisContent("Có lỗi xảy ra khi kết nối với máy chủ: " + err.message);
                              } finally {
                                setAnalysisLoading(false);
                              }
                            }}
                          >
                            <i className="bi bi-cpu" /> Phân tích giá
                          </button>
                          <button
                            type="button"
                            disabled={!newProductName.trim()}
                            className="btn btn-primary btn-sm fw-bold px-3 d-flex align-items-center gap-2 shadow-none"
                            style={{
                              height: "30px",
                              fontSize: "12px",
                              borderRadius: "8px",
                              opacity: !newProductName.trim() ? 0.6 : 1,
                              cursor: !newProductName.trim() ? "not-allowed" : "pointer"
                            }}
                            onClick={() => {
                              const itemCao = getRawNumber(newProductCao) || 0;
                              const itemRong = getRawNumber(newProductRong) || 0;
                              const itemDay = getRawNumber(newProductDay) || 0;
                              const kichThuoc = `${itemCao} x ${itemRong} x ${itemDay} mm`;

                              const daCua = calcRows.find(r => r.id === "1.1")?.material || "";
                              const xuongCua = calcRows.find(r => r.id === "1.2")?.material || "";
                              const giayToOng = calcRows.find(r => r.id === "1.3")?.material || "";
                              const xuongKhuon = calcRows.find(r => r.id === "2.1")?.material || "";
                              const mdf = calcRows.find(r => r.id === "2.2")?.material || "";
                              const khoaCua = calcRows.find(r => r.id === "4.1")?.material || "";
                              const banLe = calcRows.find(r => r.id === "4.2")?.material || "";
                              const matThan = calcRows.find(r => r.id === "4.3")?.material || "";
                              const tayAn = calcRows.find(r => r.id === "4.4")?.material || "";

                              const isChongChay = newProductGroup.toLowerCase().includes("chống cháy") && !newProductGroup.toLowerCase().includes("không chống cháy");
                              const specsList = [];

                              // 1. Cánh cửa
                              const listCanh = [];
                              if (daCua) listCanh.push(`Da cửa: ${daCua}`);
                              if (xuongCua) listCanh.push(`Xương cửa: ${xuongCua}`);
                              if (giayToOng) listCanh.push(`Giấy tổ ong: ${giayToOng}`);
                              if (listCanh.length > 0) specsList.push(`Cánh cửa: ${listCanh.join(", ")}`);

                              // 2. Khuôn cửa
                              const listKhuon = [];
                              if (xuongKhuon) listKhuon.push(`Xương khuôn: ${xuongKhuon}`);
                              if (mdf) listKhuon.push(`MDF: ${mdf}`);
                              if (listKhuon.length > 0) specsList.push(`Khuôn cửa: ${listKhuon.join(", ")}`);

                              // 3. Phụ kiện
                              const listPk = [];
                              if (khoaCua) listPk.push(`Khóa: ${khoaCua}`);
                              if (banLe) listPk.push(`Bản lề: ${banLe}`);
                              if (matThan) listPk.push(`Mắt thần: ${matThan}`);
                              if (tayAn) listPk.push(`Tay co thủy lực: ${tayAn}`);
                              if (listPk.length > 0) specsList.push(`Phụ kiện: ${listPk.join(", ")}`);

                              if (isChongChay && detailLoiCachNhiet) {
                                specsList.push(`Lõi cách nhiệt: ${detailLoiCachNhiet}`);
                              }

                              const thongSoKyThuat = specsList.join("\n");
                              const itemSoLuong = getRawNumber(soLuongBoCua) || detailSoLuong || 1;

                              if (configuringItemId) {
                                setSelectedItems(prev => {
                                  const nextList = prev.map(item => {
                                    if (item.id === configuringItemId) {
                                      return {
                                        ...item,
                                        tenHang: newProductName.trim() || detailTenHang || "Cửa gỗ",
                                        soLuong: itemSoLuong,
                                        cuaChongChay: isChongChay,
                                        loaiCua: newProductType,
                                        dimType: detailDimType,
                                        cao: itemCao,
                                        rong: itemRong,
                                        day: itemDay,
                                        daCua: daCua,
                                        xuongCua: xuongCua,
                                        xuongCuaGhepThanh: detailXuongCuaGhepThanh,
                                        giayToOng: giayToOng,
                                        xuongKhuon: xuongKhuon,
                                        xuongKhuonGhepThanh: detailXuongKhuonGhepThanh,
                                        mdf: mdf,
                                        loiCachNhiet: detailLoiCachNhiet,
                                        kichThuoc: kichThuoc,
                                        thongSoKyThuat: thongSoKyThuat,
                                        giaBan: donGiaBoCua,
                                      };
                                    }
                                    return item;
                                  });
                                  const total = nextList.reduce((sum, i) => sum + (i.giaBan * i.soLuong), 0);
                                  setTongTienHang(total);
                                  return nextList;
                                });
                              } else {
                                const newItem = {
                                  id: "new_" + Date.now(),
                                  tenHang: newProductName.trim() || "Cửa gỗ mới",
                                  donVi: "Bộ",
                                  giaBan: donGiaBoCua,
                                  soLuong: itemSoLuong,
                                  imageUrl: null,
                                  cuaChongChay: isChongChay,
                                  loaiCua: newProductType,
                                  loaiSP: newProductGroup,
                                  dimType: detailDimType,
                                  cao: itemCao,
                                  rong: itemRong,
                                  day: itemDay,
                                  daCua: daCua,
                                  xuongCua: xuongCua,
                                  xuongCuaGhepThanh: detailXuongCuaGhepThanh,
                                  giayToOng: giayToOng,
                                  xuongKhuon: xuongKhuon,
                                  xuongKhuonGhepThanh: detailXuongKhuonGhepThanh,
                                  mdf: mdf,
                                  loiCachNhiet: detailLoiCachNhiet,
                                  kichThuoc: kichThuoc,
                                  thongSoKyThuat: thongSoKyThuat,
                                };
                                setSelectedItems(prev => {
                                  const nextList = [...prev, newItem];
                                  const total = nextList.reduce((sum, i) => sum + (i.giaBan * i.soLuong), 0);
                                  setTongTienHang(total);
                                  return nextList;
                                });
                              }
                              toast.success("Cập nhật thành công", "Đã cập nhật chi tiết chi phí vào báo giá.");
                              setIsNewProductModalOpen(false);
                            }}
                          >
                            <i className="bi bi-check2-circle" /> Cập nhật vào báo giá
                          </button>
                          <button
                            type="button"
                            disabled={!newProductName.trim()}
                            className="btn btn-success btn-sm fw-bold px-3 d-flex align-items-center gap-2 shadow-none"
                            style={{
                              height: "30px",
                              fontSize: "12px",
                              borderRadius: "8px",
                              opacity: !newProductName.trim() ? 0.6 : 1,
                              cursor: !newProductName.trim() ? "not-allowed" : "pointer"
                            }}
                            onClick={async () => {
                              try {
                                const itemCao = getRawNumber(newProductCao) || 0;
                                const itemRong = getRawNumber(newProductRong) || 0;
                                const itemDay = getRawNumber(newProductDay) || 0;
                                const isChongChay = newProductGroup.toLowerCase().includes("chống cháy") && !newProductGroup.toLowerCase().includes("không chống cháy");

                                const catId = isChongChay ? "cmq0rprodwood0001cuachongchay" : "cmq0rprodwood0002cuakhongchongchay";

                                // Fetch code sequence
                                const seqRes = await fetch(`/api/logistics/inventory?action=next-sequence&categoryId=${catId}`);
                                const seqData = await seqRes.json();
                                const nextSeq = seqData.nextSeq || 1;
                                const generatedCode = isChongChay ? `CCC-${String(nextSeq).padStart(4, "0")}` : `CKC-${String(nextSeq).padStart(4, "0")}`;

                                // Fetch warehouses to find the main finished goods warehouse
                                const whRes = await fetch("/api/logistics/warehouses");
                                const whs = await whRes.json();
                                let mainWarehouse = whs.find((w: any) => w.code === "KHO-CHINH" || w.name?.toLowerCase().includes("chính"));
                                if (!mainWarehouse && whs.length > 0) {
                                  mainWarehouse = whs.find((w: any) => !w.isVirtual) || whs[0];
                                }
                                const warehouseId = mainWarehouse ? mainWarehouse.id : undefined;

                                // Materials
                                const daCua = calcRows.find(r => r.id === "1.1")?.material || "";
                                const xuongCua = calcRows.find(r => r.id === "1.2")?.material || "";
                                const giayToOng = calcRows.find(r => r.id === "1.3")?.material || "";
                                const xuongKhuon = calcRows.find(r => r.id === "2.1")?.material || "";
                                const mdf = calcRows.find(r => r.id === "2.2")?.material || "";
                                const nepThang = calcRows.find(r => r.id === "3.1")?.material || "";
                                const nepChanL = calcRows.find(r => r.id === "3.2")?.material || "";
                                const nepThanL = calcRows.find(r => r.id === "3.3")?.material || "";
                                const opCua = calcRows.find(r => r.id === "3.4")?.material || "";
                                const khoaCua = calcRows.find(r => r.id === "4.1")?.material || "";
                                const banLe = calcRows.find(r => r.id === "4.2")?.material || "";
                                const matThan = calcRows.find(r => r.id === "4.3")?.material || "";
                                const tayAn = calcRows.find(r => r.id === "4.4")?.material || "";

                                const specsList = [];
                                const listCanh = [];
                                if (daCua) listCanh.push(`Da cửa: ${daCua}`);
                                if (xuongCua) listCanh.push(`Xương cửa: ${xuongCua}`);
                                if (giayToOng) listCanh.push(`Giấy tổ ong: ${giayToOng}`);
                                if (listCanh.length > 0) specsList.push(`Cánh cửa: ${listCanh.join(", ")}`);

                                const listKhuon = [];
                                if (xuongKhuon) listKhuon.push(`Xương khuôn: ${xuongKhuon}`);
                                if (mdf) listKhuon.push(`MDF: ${mdf}`);
                                if (listKhuon.length > 0) specsList.push(`Khuôn cửa: ${listKhuon.join(", ")}`);


                                const listNepOp = [];

                                if (nepThang) listNepOp.push(`Nẹp thẳng: ${nepThang}`);

                                if (nepChanL) listNepOp.push(`Nẹp chân L: ${nepChanL}`);

                                if (nepThanL) listNepOp.push(`Nẹp thân L: ${nepThanL}`);

                                if (opCua) listNepOp.push(`Ốp cửa: ${opCua}`);

                                if (listNepOp.length > 0) specsList.push(`Nẹp, ốp: ${listNepOp.join(", ")}`);


                                const listPk = [];
                                if (khoaCua) listPk.push(`Khóa: ${khoaCua}`);
                                if (banLe) listPk.push(`Bản lề: ${banLe}`);
                                if (matThan) listPk.push(`Mắt thần: ${matThan}`);
                                if (tayAn) listPk.push(`Tay co thủy lực: ${tayAn}`);
                                if (listPk.length > 0) specsList.push(`Phụ kiện: ${listPk.join(", ")}`);

                                if (isChongChay && detailLoiCachNhiet) {
                                  specsList.push(`Lõi cách nhiệt: ${detailLoiCachNhiet}`);
                                }
                                const thongSoKyThuat = specsList.join("\n");

                                const res = await fetch("/api/logistics/inventory", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    tenHang: newProductName.trim(),
                                    code: generatedCode,
                                    categoryId: catId,
                                    brand: "Seajong",
                                    donVi: "Bộ",
                                    soLuongMin: 0,
                                    giaNhap: chiPhiSanXuatPerDoor,
                                    giaBan: donGiaBoCua,
                                    kieuDang: newProductType,
                                    thongSoKyThuat: thongSoKyThuat,
                                    chieuDai: itemCao,
                                    chieuRong: itemRong,
                                    chieuDay: itemDay,
                                    warehouseId: warehouseId,
                                  })
                                });

                                const data = await res.json();
                                if (res.ok && data.id) {
                                  toast.success("Thành công", `Đã lưu hàng hoá "${newProductName.trim()}" vào kho thành phẩm "${mainWarehouse ? mainWarehouse.name : 'Hà Nội'}" với mã ${generatedCode}.`);
                                } else {
                                  toast.error("Thất bại", "Không thể lưu hàng hoá: " + (data.error || "Lỗi không xác định"));
                                }
                              } catch (err: any) {
                                toast.error("Lỗi", "Có lỗi xảy ra: " + err.message);
                              }
                            }}
                          >
                            <i className="bi bi-floppy" /> Lưu hàng hoá
                          </button>
                        </div>
                      </div>

                      <div className="table-responsive bg-white">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: "12px" }}>
                          <thead className="table-light">
                            <tr>
                              <th className="ps-3 text-uppercase" style={{ width: "60px" }}>STT</th>
                              <th className="text-uppercase" style={{ width: "220px" }}>Hạng mục</th>
                              <th className="text-end text-uppercase" style={{ width: "150px" }}>Giá trị (đ)</th>
                              <th className="pe-3 text-uppercase">Ghi chú</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* 1. Chi phí vật tư và phụ kiện */}
                            <tr className="table-light fw-bold">
                              <td className="ps-3">1</td>
                              <td>Chi phí vật tư, và phụ kiện</td>
                              <td className="text-end">{totalVatTuPhuKien.toLocaleString("vi-VN")}</td>
                              <td className="pe-3"></td>
                            </tr>
                            <tr>
                              <td className="ps-4 text-muted small">1.1</td>
                              <td className="ps-4 text-muted">Vật tư chính</td>
                              <td className="text-end">{vtChinh.toLocaleString("vi-VN")}</td>
                              <td className="pe-3 text-muted small">Khung, cánh, nẹp...</td>
                            </tr>
                            <tr>
                              <td className="ps-4 text-muted small">1.2</td>
                              <td className="ps-4 text-muted">Vật tư phụ</td>
                              <td className="text-end">{vtPhu.toLocaleString("vi-VN")}</td>
                              <td className="pe-3 text-muted small">Keo, vít, silicon...</td>
                            </tr>
                            <tr>
                              <td className="ps-4 text-muted small">1.3</td>
                              <td className="ps-4 text-muted">Vật tư tiêu hao</td>
                              <td className="text-end">{vtTieuHao.toLocaleString("vi-VN")}</td>
                              <td className="pe-3 text-muted small">Dao cụ cắt, nhám, khí nén...</td>
                            </tr>
                            <tr>
                              <td className="ps-4 text-muted small">1.4</td>
                              <td className="ps-4 text-muted">Phụ kiện</td>
                              <td className="text-end">{pk.toLocaleString("vi-VN")}</td>
                              <td className="pe-3 text-muted small">Bản lề, khóa, hít cửa...</td>
                            </tr>

                            {/* 2. Chi phí sản xuất */}
                            <tr>
                              <td className="ps-3 fw-bold">2</td>
                              <td className="fw-bold">Chi phí sản xuất</td>
                              <td className="text-end fw-bold">{chiPhiSanXuatRowVal.toLocaleString("vi-VN")}</td>
                              <td className="pe-3"></td>
                            </tr>

                            {/* 3. Giá vốn bán hàng */}
                            <tr className="table-secondary fw-bold">
                              <td className="ps-3">3</td>
                              <td>Giá vốn bán hàng</td>
                              <td className="text-end">{giaVonBanHang.toLocaleString("vi-VN")}</td>
                              <td className="pe-3 text-muted small">Chi phí vật tư (1) + Chi phí sản xuất (2)</td>
                            </tr>

                            {/* 4. Lợi nhuận */}
                            <tr>
                              <td className="ps-3 fw-bold">4</td>
                              <td className="fw-bold">Lợi nhuận</td>
                              <td className="text-end fw-bold">{loiNhuanVal.toLocaleString("vi-VN")}</td>
                              <td className="pe-3"></td>
                            </tr>

                            {/* 5. Giá xuất xưởng */}
                            <tr className="table-success fw-bold">
                              <td className="ps-3">5</td>
                              <td>Giá xuất xưởng cho {soLuongBoCua} bộ</td>
                              <td className="text-end">{giaXuatXuong.toLocaleString("vi-VN")}</td>
                              <td className="pe-3 text-muted small">Giá vốn (3) + Lợi nhuận (4)</td>
                            </tr>

                            {/* 6. Đơn giá cho một bộ cửa */}
                            <tr className="table-warning fw-bold text-danger">
                              <td className="ps-3">6</td>
                              <td>Đơn giá cho một bộ cửa</td>
                              <td className="text-end fs-6">{donGiaBoCua.toLocaleString("vi-VN")}</td>
                              <td className="pe-3"></td>
                            </tr>

                            {/* 7. Đơn giá cho mỗi m2 */}
                            <tr className="table-warning fw-bold text-danger">
                              <td className="ps-3">7</td>
                              <td>Đơn giá cho mỗi m2</td>
                              <td className="text-end fs-6">{donGiaM2.toLocaleString("vi-VN")}</td>
                              <td className="pe-3 text-muted small">Đơn giá một bộ chia cho diện tích cánh</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
                {activeStep === 2 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <h5 className="fw-bold text-dark mb-1">Chi phí vật tư và phụ kiện</h5>
                    <p className="text-muted small mb-2">Bảng kê chi tiết định mức vật tư và chi phí sản xuất cửa.</p>

                    <div className="table-responsive bg-white custom-scrollbar" style={{ flex: 1, overflow: "auto" }}>
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: "12px" }}>
                        <thead className="table-light">
                          <tr>
                            <th className="ps-3 text-uppercase" style={{ width: "60px" }}>STT</th>
                            <th className="text-uppercase" style={{ width: "380px", minWidth: "380px" }}>Hạng mục</th>
                            <th className="text-center text-uppercase" style={{ width: "80px" }}>Đơn vị</th>
                            <th className="text-end text-uppercase" style={{ width: "100px" }}>Số lượng</th>
                            <th className="text-end text-uppercase" style={{ width: "120px" }}>Đơn giá (đ)</th>
                            <th className="text-end text-uppercase" style={{ width: "140px" }}>Thành tiền (đ)</th>
                            <th className="pe-3 text-uppercase">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* 1. Vật tư chính */}
                          <tr>
                            <td className="ps-3 fw-bold">1</td>
                            <td className="text-uppercase text-dark fw-bold">Vật tư chính</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td className="pe-3"></td>
                          </tr>
                          {(() => {
                            const items = getAggregatedGroup(["1.", "2."]);
                            if (items.length === 0) {
                              return (
                                <tr>
                                  <td className="ps-4 text-muted small">-</td>
                                  <td className="ps-4 text-muted" style={{ fontStyle: "italic" }}>Chưa cấu hình vật liệu chính ở Bước 3</td>
                                  <td></td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="pe-3"></td>
                                </tr>
                              );
                            }
                            return items.map((item, idx) => (
                              <tr key={`vt-chinh-${idx}`}>
                                <td className="ps-4 text-muted small">1.{idx + 1}</td>
                                <td className="ps-4 text-dark">{item.name}</td>
                                <td className="text-center text-dark">{item.unit}</td>
                                <td className="text-end font-monospace text-dark fw-bold">
                                  {item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3).replace(/\.?0+$/, "")}
                                </td>
                                <td className="text-end font-monospace text-dark">
                                  {item.unitPrice.toLocaleString("vi-VN")}
                                </td>
                                <td className="text-end font-monospace text-dark fw-bold">
                                  {Math.round(item.unitPrice * item.quantity).toLocaleString("vi-VN")}
                                </td>
                                <td className="pe-3"></td>
                              </tr>
                            ));
                          })()}

                          {/* 2. Vật tư phụ */}
                          <tr>
                            <td className="ps-3 fw-bold">2</td>
                            <td className="text-uppercase text-dark fw-bold">Vật tư phụ</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td className="pe-3"></td>
                          </tr>
                          {(() => {
                            const items = getAggregatedGroup(["3."]);
                            if (items.length === 0) {
                              return (
                                <tr>
                                  <td className="ps-4 text-muted small">-</td>
                                  <td className="ps-4 text-muted" style={{ fontStyle: "italic" }}>Chưa cấu hình vật liệu phụ ở Bước 3</td>
                                  <td></td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="pe-3"></td>
                                </tr>
                              );
                            }
                            return items.map((item, idx) => (
                              <tr key={`vt-phu-${idx}`}>
                                <td className="ps-4 text-muted small">2.{idx + 1}</td>
                                <td className="ps-4 text-dark">{item.name}</td>
                                <td className="text-center text-dark">{item.unit}</td>
                                <td className="text-end font-monospace text-dark fw-bold">
                                  {item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3).replace(/\.?0+$/, "")}
                                </td>
                                <td className="text-end font-monospace text-dark">
                                  {item.unitPrice.toLocaleString("vi-VN")}
                                </td>
                                <td className="text-end font-monospace text-dark fw-bold">
                                  {Math.round(item.unitPrice * item.quantity).toLocaleString("vi-VN")}
                                </td>
                                <td className="pe-3"></td>
                              </tr>
                            ));
                          })()}

                          {/* 3. Vật tư tiêu hao */}
                          <tr>
                            <td className="ps-3 fw-bold">3</td>
                            <td className="text-uppercase text-dark fw-bold">Vật tư tiêu hao</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td className="pe-3"></td>
                          </tr>
                          {(() => {
                            const items = getAggregatedGroup(["5."]);
                            if (items.length === 0) {
                              return (
                                <tr>
                                  <td className="ps-4 text-muted small">-</td>
                                  <td className="ps-4 text-muted" style={{ fontStyle: "italic" }}>Chưa cấu hình vật tư tiêu hao ở Bước 3</td>
                                  <td></td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="pe-3"></td>
                                </tr>
                              );
                            }
                            return items.map((item, idx) => (
                              <tr key={`vt-tieuhao-${idx}`}>
                                <td className="ps-4 text-muted small">3.{idx + 1}</td>
                                <td className="ps-4 text-dark">{item.name}</td>
                                <td className="text-center text-dark">{item.unit}</td>
                                <td className="text-end font-monospace text-dark fw-bold">
                                  {item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3).replace(/\.?0+$/, "")}
                                </td>
                                <td className="text-end font-monospace text-dark">
                                  {item.unitPrice.toLocaleString("vi-VN")}
                                </td>
                                <td className="text-end font-monospace text-dark fw-bold">
                                  {Math.round(item.unitPrice * item.quantity).toLocaleString("vi-VN")}
                                </td>
                                <td className="pe-3"></td>
                              </tr>
                            ));
                          })()}

                          {/* 4. Phụ kiện */}
                          <tr>
                            <td className="ps-3 fw-bold">4</td>
                            <td className="text-uppercase text-dark fw-bold">Phụ kiện</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td className="pe-3"></td>
                          </tr>
                          {(() => {
                            const items = getAggregatedGroup(["4."]);
                            if (items.length === 0) {
                              return (
                                <tr>
                                  <td className="ps-4 text-muted small">-</td>
                                  <td className="ps-4 text-muted" style={{ fontStyle: "italic" }}>Chưa cấu hình phụ kiện ở Bước 3</td>
                                  <td></td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="text-end text-muted">-</td>
                                  <td className="pe-3"></td>
                                </tr>
                              );
                            }
                            return items.map((item, idx) => (
                              <tr key={`phukien-${idx}`}>
                                <td className="ps-4 text-muted small">4.{idx + 1}</td>
                                <td className="ps-4 text-dark">{item.name}</td>
                                <td className="text-center text-dark">{item.unit}</td>
                                <td className="text-end font-monospace text-dark fw-bold">
                                  {item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3).replace(/\.?0+$/, "")}
                                </td>
                                <td className="text-end font-monospace text-dark">
                                  {item.unitPrice.toLocaleString("vi-VN")}
                                </td>
                                <td className="text-end font-monospace text-dark fw-bold">
                                  {Math.round(item.unitPrice * item.quantity).toLocaleString("vi-VN")}
                                </td>
                                <td className="pe-3"></td>
                              </tr>
                            ));
                          })()}
                          {/* Tổng cộng row */}
                          {(() => {
                            const itemsChinh = getAggregatedGroup(["1.", "2."]);
                            const itemsPhu = getAggregatedGroup(["3."]);
                            const itemsTieuHao = getAggregatedGroup(["5."]);
                            const itemsPk = getAggregatedGroup(["4."]);
                            const totalThanhTienVal = [
                              ...itemsChinh,
                              ...itemsPhu,
                              ...itemsTieuHao,
                              ...itemsPk
                            ].reduce((sum, item) => sum + Math.round(item.unitPrice * item.quantity), 0);

                            return (
                              <tr className="table-secondary fw-bold text-dark" style={{ borderTop: "2px solid var(--border)" }}>
                                <td className="ps-3"></td>
                                <td className="text-uppercase fw-bold">Tổng cộng</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td className="text-end font-monospace text-danger fw-bold" style={{ fontSize: "13px" }}>
                                  {totalThanhTienVal.toLocaleString("vi-VN")}
                                </td>
                                <td className="pe-3"></td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {activeStep === 3 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <h5 className="fw-bold text-dark mb-1">Chiết tính khối lượng</h5>
                    <p className="text-muted small mb-2">Chi tiết chiết tính khối lượng gia công cơ bản và phụ trợ.</p>



                    <div className="table-responsive bg-white custom-scrollbar" style={{ flex: 1, overflow: "auto", position: "relative" }}>
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: "12px", tableLayout: "fixed", width: "100%" }}>
                        <thead className="table-light">
                          <tr>
                            <th className="ps-3 text-uppercase" style={{ width: "50px", position: "sticky", top: 0, left: 0, zIndex: 20, backgroundColor: "#f8f9fa", padding: "4px 8px" }}>STT</th>
                            <th className="text-uppercase" style={{ width: "180px", position: "sticky", top: 0, left: "50px", zIndex: 20, backgroundColor: "#f8f9fa", padding: "4px 8px" }}>Hạng mục</th>
                            <th className="text-uppercase" style={{ width: "220px", position: "sticky", top: 0, zIndex: 10, backgroundColor: "#f8f9fa", padding: "4px 8px" }}>Vật liệu</th>
                            <th className="text-center text-uppercase" style={{ width: "65px", position: "sticky", top: 0, zIndex: 10, backgroundColor: "#f8f9fa", padding: "4px 8px" }}>Đơn vị</th>
                            <th className="text-end text-uppercase" style={{ width: "80px", position: "sticky", top: 0, zIndex: 10, backgroundColor: "#f8f9fa", padding: "4px 8px" }}>Dày (mm)</th>
                            <th className="text-end text-uppercase" style={{ width: "80px", position: "sticky", top: 0, zIndex: 10, backgroundColor: "#f8f9fa", padding: "4px 8px" }}>Số lượng</th>
                            <th className="text-end text-uppercase" style={{ width: "80px", position: "sticky", top: 0, zIndex: 10, backgroundColor: "#f8f9fa", padding: "4px 8px" }}>Hệ số</th>
                            <th className="text-end text-uppercase" style={{ width: "95px", position: "sticky", top: 0, zIndex: 10, backgroundColor: "#f8f9fa", padding: "4px 8px" }}>Hao hụt</th>
                            <th className="text-end text-uppercase" style={{ width: "85px", position: "sticky", top: 0, zIndex: 10, backgroundColor: "#f8f9fa", padding: "4px 8px" }}>Cộng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const qtyBo = getRawNumber(soLuongBoCua) || 1;
                            return calcRows.map(row => {
                              if (row.isParent) {
                                return (
                                  <tr key={row.id} className="table-light fw-bold">
                                    <td className="ps-3" style={{ position: "sticky", left: 0, zIndex: 5, backgroundColor: "#f8f9fa", width: "50px", padding: "4px 8px" }}>{row.id}</td>
                                    <td className="text-uppercase text-dark fw-bold" style={{ position: "sticky", left: "50px", zIndex: 5, backgroundColor: "#f8f9fa", width: "180px", padding: "4px 8px" }}>{row.label}</td>
                                    <td style={{ padding: "4px 8px" }}></td>
                                    <td style={{ padding: "4px 8px" }}></td>
                                    <td style={{ padding: "4px 8px" }}></td>
                                    <td style={{ padding: "4px 8px" }}></td>
                                    <td style={{ padding: "4px 8px" }}></td>
                                    <td style={{ padding: "4px 8px" }}></td>
                                    <td style={{ padding: "4px 8px" }}></td>
                                  </tr>
                                );
                              }

                              const metrics = getRowMetrics(row);
                              const {
                                spPerSheetVal,
                                isQtyCalculated,
                                qtyVal,
                                lossStr,
                                totalStr,
                                detailWidth,
                                detailHeight,
                                factorVal,
                              } = metrics;

                              const matchedMat = allInventoryItems.find(m => (m.tenHang || m.name || "") === row.material);

                              return (
                                <tr key={row.id}>
                                  <td className="ps-4 text-dark small" style={{ position: "sticky", left: 0, zIndex: 5, backgroundColor: "#ffffff", width: "50px", padding: "3px 8px" }}>{row.id}</td>
                                  <td className="ps-4 text-dark" style={{ position: "sticky", left: "50px", zIndex: 5, backgroundColor: "#ffffff", width: "180px", padding: "3px 8px" }}>
                                    <div>{row.label}</div>
                                    {(row.id.startsWith("1.") || row.id.startsWith("2.") || row.id.startsWith("3.")) && detailWidth && detailHeight && (
                                      <div className="text-muted small" style={{ fontSize: "10px", marginTop: "1px", fontWeight: "normal", opacity: 0.8 }}>
                                        Rộng {detailWidth} mm. | Cao {detailHeight} mm
                                      </div>
                                    )}
                                    {row.id.startsWith("5.") && (row.label.toLowerCase().includes("nẹp") || row.label.toLowerCase().includes("nep")) && (
                                      (() => {
                                        const getWidthFromName = (name: string) => {
                                          if (!name) return "";
                                          const matchRong = name.match(/rộng\s*(\d+(?:[\.,]\d+)?)/i) || name.match(/rong\s*(\d+(?:[\.,]\d+)?)/i);
                                          if (matchRong) return matchRong[1];
                                          return "";
                                        };
                                        const widthVal = row.width || 
                                                         (matchedMat ? (matchedMat.chieuRong != null ? String(matchedMat.chieuRong) : "") : "") || 
                                                         getWidthFromName(row.material || "");
                                        if (!widthVal) return null;
                                        return (
                                          <div className="text-muted small" style={{ fontSize: "10px", marginTop: "1px", fontWeight: "normal", opacity: 0.8 }}>
                                            Chiều rộng: <span className="fw-bold text-dark">{widthVal}mm</span>
                                          </div>
                                        );
                                      })()
                                    )}
                                  </td>
                                  <td style={{ padding: "3px 8px" }}>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm border-0 bg-light rounded-2 text-dark"
                                      style={{ fontSize: "12px", height: "22px", padding: "0 6px", fontWeight: "normal" }}
                                      list={(row.material || "").trim().length > 0 ? `suggestions-list-${row.id}` : undefined}
                                      value={row.material}
                                      onChange={e => {
                                        const val = e.target.value;
                                        const matched = allInventoryItems.find(m => (m.tenHang || m.name || "") === val);
                                        const updated = calcRows.map(r => {
                                          if (r.id === row.id) {
                                            let autoThickness = r.thickness;
                                            let autoWidth = r.width;
                                            let autoHeight = r.height;
                                            if (matched) {
                                              if (matched.chieuDay != null) {
                                                autoThickness = String(matched.chieuDay);
                                              } else {
                                                const matchDay = (matched.thongSoKyThuat || "").match(/Day:\s*(\d+(?:[\.,]\d+)?)/i);
                                                if (matchDay) {
                                                  autoThickness = matchDay[1];
                                                } else {
                                                  const itemName = matched.tenHang || matched.name || "";
                                                  const matchNameDay = itemName.match(/dày\s*(\d+(?:[\.,]\d+)?)/i) || itemName.match(/(\d+(?:[\.,]\d+)?)\s*(?:ly|mm)/i);
                                                  if (matchNameDay) {
                                                    autoThickness = matchNameDay[1];
                                                  }
                                                }
                                              }
                                              if (matched.chieuRong != null) {
                                                autoWidth = String(matched.chieuRong);
                                              } else {
                                                const matchRong = (matched.thongSoKyThuat || "").match(/Rong:\s*(\d+(?:[\.,]\d+)?)/i);
                                                if (matchRong) {
                                                  autoWidth = matchRong[1];
                                                } else {
                                                  const itemName = matched.tenHang || matched.name || "";
                                                  const matchNameDim = itemName.match(/(\d{3,4})\s*[x*x]\s*(\d{3,4})/);
                                                  if (matchNameDim) {
                                                    autoWidth = matchNameDim[1];
                                                  }
                                                }
                                              }
                                              if (matched.chieuDai != null) {
                                                autoHeight = String(matched.chieuDai);
                                              } else {
                                                const matchDai = (matched.thongSoKyThuat || "").match(/Dai:\s*(\d+(?:[\.,]\d+)?)/i);
                                                if (matchDai) {
                                                  autoHeight = matchDai[1];
                                                } else {
                                                  const itemName = matched.tenHang || matched.name || "";
                                                  const matchNameDim = itemName.match(/(\d{3,4})\s*[x*x]\s*(\d{3,4})/);
                                                  if (matchNameDim) {
                                                    autoHeight = matchNameDim[2];
                                                  }
                                                }
                                              }
                                            } else {
                                              const matchTypedDay = val.match(/dày\s*(\d+(?:[\.,]\d+)?)/i) || val.match(/(\d+(?:[\.,]\d+)?)\s*(?:ly|mm)/i);
                                              if (matchTypedDay) {
                                                autoThickness = matchTypedDay[1];
                                              }
                                              const matchTypedDim = val.match(/(\d{3,4})\s*[x*x]\s*(\d{3,4})/);
                                              if (matchTypedDim) {
                                                autoWidth = matchTypedDim[1];
                                                autoHeight = matchTypedDim[2];
                                              }
                                            }
                                            const isNepConsumable = r.id.startsWith("5.") && (
  r.label.toLowerCase().includes("nẹp") || 
  r.label.toLowerCase().includes("nep")
);
return {
  ...r,
  material: val,
  unit: isNepConsumable ? "m" : (matched ? (matched.donVi || r.unit) : r.unit),
  thickness: autoThickness,
  width: autoWidth,
  height: autoHeight
};
                                          }
                                          return r;
                                        });
                                        setCalcRows(updated);
                                      }}
                                    />
                                    <datalist id={`suggestions-list-${row.id}`}>
                                      {(() => {
                                        const typed = (row.material || "").trim();
                                        if (!typed) return null;
                                        const matchesQuery = (text: string, query: string) => {
                                            const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
                                            const cleanText = clean(text);
                                            const terms = clean(query).split(/\s+/).filter(t => t.length > 0);
                                            if (terms.length === 0) return false;
                                            return terms.every(term => cleanText.includes(term));
                                          };
                                        const rawSuggestions = row.id.startsWith("1.") || row.id.startsWith("2.") || row.id.startsWith("3.")
                                          ? mainMaterials
                                          : getSuggestionsForLabel(row.label, row.id.split(".")[0]);
                                        return rawSuggestions
                                          .filter(m => matchesQuery(m.tenHang || m.name || "", typed))
                                          .map((m, idx) => (
                                            <option key={idx} value={m.tenHang || m.name || ""} />
                                          ));
                                      })()}
                                    </datalist>
                                    {row.material && detailWidth && detailHeight && spPerSheetVal && (
                                      <div className="text-muted small" style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.8, marginTop: "-2px", paddingLeft: "6px" }}>
                                        Số chi tiết cắt được từ một tấm: <span className="fw-bold text-dark">{spPerSheetVal}</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="text-dark text-center" style={{ width: "65px", padding: "3px 8px" }}>{row.unit}</td>
                                  <td className="text-dark text-end font-monospace" style={{ width: "80px", padding: "3px 8px", fontSize: "12px" }}>
                                    {row.thickness || "—"}
                                  </td>
                                  <td className="text-end" style={{ width: "80px", padding: "3px 8px" }}>
                                    {isQtyCalculated ? (
                                      <span className="text-dark font-monospace fw-bold" style={{ fontSize: "12px", marginRight: "8px" }}>
                                        {qtyVal % 1 === 0 ? qtyVal.toString() : qtyVal.toFixed(3).replace(/\.?0+$/, "")}
                                      </span>
                                    ) : (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm text-end border-0 bg-light rounded-2 d-inline-block text-dark"
                                        style={{ fontSize: "12px", height: "22px", width: "80px", padding: "0 6px", fontWeight: "normal" }}
                                        value={
                                          row.id.startsWith("4.") || row.id.startsWith("5.")
                                            ? (row.quantity !== undefined ? row.quantity : (qtyVal % 1 === 0 ? qtyVal.toString() : qtyVal.toFixed(3).replace(/\.?0+$/, "")))
                                            : (row.quantity !== undefined ? row.quantity : String(qtyBo))
                                        }
                                        onChange={e => {
                                          const updated = calcRows.map(r => r.id === row.id ? { ...r, quantity: e.target.value } : r);
                                          setCalcRows(updated);
                                        }}
                                      />
                                    )}
                                  </td>
                                  <td className="text-end" style={{ padding: "3px 8px" }}>
                                    {row.id.startsWith("4.") || row.id.startsWith("5.") ? (
                                      <span className="text-muted font-monospace" style={{ fontSize: "12px", marginRight: "8px" }}>—</span>
                                    ) : (
                                      <input
                                        type="text"
                                        className="form-control form-control-sm text-end border-0 bg-light rounded-2 d-inline-block text-dark"
                                        style={{ fontSize: "12px", height: "22px", width: "80px", padding: "0 6px", fontWeight: "normal" }}
                                        value={
                                          row.factor !== undefined && row.factor !== ""
                                            ? row.factor
                                            : (row.id.startsWith("5.") && factorVal > 0)
                                              ? factorVal % 1 === 0 ? factorVal.toString() : factorVal.toFixed(3).replace(/\.?0+$/, "")
                                              : ""
                                        }
                                        onChange={e => {
                                          const updated = calcRows.map(r => r.id === row.id ? { ...r, factor: e.target.value } : r);
                                          setCalcRows(updated);
                                        }}
                                      />
                                    )}
                                  </td>
                                  <td className="text-end text-dark font-monospace" style={{ width: "95px", padding: "3px 8px", fontSize: "12px" }}>
                                    {lossStr}
                                  </td>
                                  <td className="text-end text-dark font-monospace fw-bold" style={{ padding: "3px 8px", fontSize: "12px" }}>
                                    {totalStr}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offcanvas Phân tích giá AI */}
      {showAnalysis && (
        <>
          <div
            className="offcanvas-backdrop fade show"
            style={{ zIndex: 6000 }}
            onClick={() => setShowAnalysis(false)}
          />
          <div
            className="offcanvas offcanvas-end show border-0 shadow-lg"
            style={{
              visibility: "visible",
              width: "400px",
              zIndex: 6001,
              position: "fixed",
              top: 0,
              right: 0,
              height: "100%",
              backgroundColor: "var(--card)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="offcanvas-header border-bottom py-3" style={{ background: "linear-gradient(135deg, #f8f9fa 0%, #eef2ff 100%)" }}>
              <h5 className="offcanvas-title fw-bold m-0 d-flex align-items-center gap-2 text-dark" style={{ fontSize: "14px" }}>
                <div className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle" style={{ width: "24px", height: "24px" }}>
                  <i className="bi bi-cpu" style={{ fontSize: "12px" }} />
                </div>
                <span>Phân tích tài chính AI</span>
              </h5>
              <button
                type="button"
                className="btn-close"
                style={{ fontSize: "10px" }}
                onClick={() => setShowAnalysis(false)}
              />
            </div>
            <div className="offcanvas-body py-3 px-3 custom-scrollbar" style={{ flex: 1, overflowY: "auto", fontSize: "13px", backgroundColor: "#fbfcfd" }}>
              {analysisLoading ? (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 gap-2">
                  <div className="spinner-border text-primary" role="status" style={{ width: "2rem", height: "2rem" }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <span className="text-muted small">AI đang tính toán và phân tích dữ liệu...</span>
                </div>
              ) : (
                <div className="text-dark">
                  {analysisContent ? (
                    <div>
                      {/* Premium Visual Summary Widget */}
                      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: "12px", border: "1px solid rgba(0,0,0,0.04)" }}>
                        <div className="card-body p-3">
                          <span className="text-muted fw-bold d-block mb-2" style={{ fontSize: "10.5px", letterSpacing: "0.5px" }}>CƠ CẤU DOANH THU ĐỀ XUẤT</span>

                          {/* Stacked Progress Bar */}
                          <div className="progress mb-3" style={{ height: "14px", borderRadius: "8px", overflow: "hidden" }}>
                            {summaryDonGia > 0 ? (
                              <>
                                <div
                                  className="progress-bar"
                                  style={{ width: `${(summaryTotalVatTu / summaryDonGia * 100).toFixed(1)}%`, backgroundColor: "#4f46e5" }}
                                  title={`Vật tư: ${(summaryTotalVatTu / summaryDonGia * 100).toFixed(1)}%`}
                                />
                                <div
                                  className="progress-bar"
                                  style={{ width: `${(summaryChiPhiSanXuat / summaryDonGia * 100).toFixed(1)}%`, backgroundColor: "#f59e0b" }}
                                  title={`Sản xuất: ${(summaryChiPhiSanXuat / summaryDonGia * 100).toFixed(1)}%`}
                                />
                                <div
                                  className="progress-bar"
                                  style={{ width: `${(summaryLoiNhuan / summaryDonGia * 100).toFixed(1)}%`, backgroundColor: "#10b981" }}
                                  title={`Lợi nhuận: ${(summaryLoiNhuan / summaryDonGia * 100).toFixed(1)}%`}
                                />
                              </>
                            ) : (
                              <div className="progress-bar bg-secondary" style={{ width: "100%" }} />
                            )}
                          </div>

                          {/* Legend & Details */}
                          <div className="d-flex flex-column gap-2" style={{ fontSize: "11.5px" }}>
                            <div className="d-flex align-items-center justify-content-between pb-1 border-bottom border-light">
                              <span className="fw-semibold text-dark">
                                {summaryTotalVatTu.toLocaleString("vi-VN")}đ ({summaryDonGia > 0 ? (summaryTotalVatTu / summaryDonGia * 100).toFixed(1) : 0}%)
                              </span>
                            </div>

                            <div className="d-flex align-items-center justify-content-between pb-1 border-bottom border-light">
                              <span className="d-flex align-items-center gap-1.5 text-muted">
                                <span className="badge rounded-circle" style={{ width: 8, height: 8, padding: 0, backgroundColor: "#f59e0b" }} />
                                <span>Chi phí Sản xuất:</span>
                              </span>
                              <span className="fw-semibold text-dark">
                                {summaryChiPhiSanXuat.toLocaleString("vi-VN")}đ ({summaryDonGia > 0 ? (summaryChiPhiSanXuat / summaryDonGia * 100).toFixed(1) : 0}%)
                              </span>
                            </div>

                            <div className="d-flex align-items-center justify-content-between">
                              <span className="d-flex align-items-center gap-1.5 text-muted">
                                <span className="badge rounded-circle" style={{ width: 8, height: 8, padding: 0, backgroundColor: "#10b981" }} />
                                <span>Lợi nhuận đề xuất:</span>
                              </span>
                              <span className="fw-semibold text-dark">
                                {summaryLoiNhuan.toLocaleString("vi-VN")}đ ({summaryDonGia > 0 ? (summaryLoiNhuan / summaryDonGia * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                          </div>

                          {/* Gross Margin callout badge */}
                          <div className="mt-3 p-2 bg-light rounded-3 d-flex align-items-center justify-content-between" style={{ fontSize: "12px", border: "1px dashed rgba(0,0,0,0.08)" }}>
                            <span className="text-muted fw-medium">Tỷ suất LN gộp (Gross Margin):</span>
                            <span className="fw-bold text-success" style={{ fontSize: "13px" }}>
                              {summaryDonGia > 0 ? (((summaryDonGia - summaryGiaVon) / summaryDonGia) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Rendered AI analysis content */}
                      {renderMarkdown(analysisContent)}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <div className="d-flex align-items-center justify-content-center bg-light text-muted rounded-circle mx-auto mb-3" style={{ width: "48px", height: "48px" }}>
                        <i className="bi bi-cpu" style={{ fontSize: "24px" }} />
                      </div>
                      <span className="text-muted">Chưa có nội dung phân tích. Bấm nút "Phân tích giá" để bắt đầu.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="offcanvas-footer p-3 border-top bg-light flex-shrink-0 d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-secondary btn-sm fw-bold px-3"
                style={{ borderRadius: "6px" }}
                onClick={() => setShowAnalysis(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </>
      )}
      {/* Print Preview Modal */}
      <PrintPreviewModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        customer={customer}
        items={selectedItems}
        info={{
          soPhieu,
          ngayTao,
          ngayHetHan,
          chietKhau,
          vat,
          showHinhAnh,
          showKichThuoc
        }}
      />
    </div>
  );
}

// ── Print Preview Modal Component for Wood Doors ────────────────────────────────
interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  customer: any;
  items: any[];
  info: {
    soPhieu: string;
    ngayTao: string;
    ngayHetHan: string;
    chietKhau: number;
    vat: number;
    showHinhAnh: boolean;
    showKichThuoc: boolean;
  };
}

function PrintPreviewModal({ open, onClose, customer, items, info }: PrintPreviewModalProps) {
  const [landscape, setLandscape] = React.useState(false);
  const [company, setCompany] = React.useState<any>({});
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/company").then(r => r.json()).then(setCompany).catch(() => { });
  }, [open]);

  if (!open || !mounted) return null;

  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const tamTinh = items.reduce((s: any, it: any) => s + (it.giaBan * it.soLuong), 0);
  const ckTien = tamTinh * info.chietKhau / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.vat / 100;
  const tongCong = Math.max(0, Math.round(truocThue + thueTien));

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, "0")} tháng ${String(d.getMonth() + 1).padStart(2, "0")} năm ${d.getFullYear()}`;
  };

  const paperW = landscape ? 297 : 210;
  const paperH = landscape ? 210 : 297;
  const handlePrint = () => window.print();

  return createPortal(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap');
        @media print {
          @page { margin: 0; }
          @page portrait-layout {
            size: portrait;
            margin: 0;
          }
          @page landscape-layout {
            size: landscape;
            margin: 0;
          }
          body > *:not(#print-preview-root) { display: none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-preview-root {
            position: static !important;
            background: #fff !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          .no-print { display: none !important; }
          .preview-container {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          .print-paper {
            box-shadow: none !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          .print-cover {
            page: portrait-layout !important;
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            display: flex !important;
            flex-direction: row !important;
            padding: 0 !important;
          }
          .print-details {
            page: ${landscape ? "landscape-layout" : "portrait-layout"} !important;
            width: ${landscape ? 297 : 210}mm !important;
            min-height: ${landscape ? 210 : 297}mm !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <div id="print-preview-root" style={{ position: "fixed", inset: 0, zIndex: 4000, background: "#e8eaed", display: "flex", flexDirection: "column" }}>
        <div className="no-print" style={{ height: 52, background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Xem trước bản in báo giá gỗ</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d1d5db", fontSize: 13 }}>
              <span>Khổ giấy:</span>
              {(["Dọc", "Ngang"] as const).map((label, i) => (
                <button key={label} onClick={() => setLandscape(i === 1)}
                  style={{
                    padding: "4px 12px", border: "1px solid", borderRadius: i === 0 ? "6px 0 0 6px" : "0 6px 6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: landscape === (i === 1) ? "#074722" : "transparent",
                    borderColor: "#4b5563", color: landscape === (i === 1) ? "#fff" : "#9ca3af",
                  }}>{label}</button>
              ))}
            </div>
            <button onClick={onClose} style={{ padding: "6px 16px", border: "1px solid #4b5563", background: "transparent", color: "#d1d5db", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Đóng</button>
            <button onClick={handlePrint} style={{ padding: "6px 18px", border: "none", background: "#074722", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-printer" style={{ fontSize: 13 }} /> In ngay
            </button>
          </div>
        </div>
        <div className="preview-container" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", padding: "32px 24px" }}>

          {/* Page 1: Cover Page */}
          <div className="print-paper print-cover" style={{
            width: "210mm",
            height: "297mm",
            flexShrink: 0,
            background: "#fff",
            boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
            padding: 0,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-start",
            gap: 0,
            fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif",
            color: "#111",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Left sidebar (Terms and policies) */}
            <div style={{
              width: "50mm",
              minWidth: "50mm",
              height: "297mm",
              background: "#074722",
              color: "#fff",
              padding: "16mm 6mm",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif"
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "12px", borderBottom: "1.5px solid rgba(255,255,255,0.25)", paddingBottom: "6px", marginBottom: "14px", letterSpacing: "0.5px", color: "#fff", textTransform: "uppercase" }}>
                  ĐIỀU KHOẢN THƯƠNG MẠI
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontWeight: 700, fontSize: "9px", color: "#a3cfb6", marginBottom: "3px", textTransform: "uppercase" }}>1. PHƯƠNG THỨC THANH TOÁN</div>
                  <div style={{ fontSize: "8px", lineHeight: "1.3", color: "#e2e8f0" }}>
                    • <strong>Đợt 1:</strong> Tạm ứng 50% giá trị đơn hàng ngay sau khi ký hợp đồng.<br />
                    • <strong>Đợt 2:</strong> Thanh toán 30% khi hàng tập kết tại công trình.<br />
                    • <strong>Đợt 3:</strong> Thanh toán 20% còn lại sau khi lắp đặt, nghiệm thu và bàn giao.
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontWeight: 700, fontSize: "9px", color: "#a3cfb6", marginBottom: "3px", textTransform: "uppercase" }}>2. THỜI GIAN GIAO HÀNG</div>
                  <div style={{ fontSize: "8px", lineHeight: "1.3", color: "#e2e8f0" }}>
                    • Thời gian sản xuất và giao hàng từ 10 - 15 ngày làm việc kể từ ngày nhận tạm ứng và duyệt bản vẽ sản xuất.
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontWeight: 700, fontSize: "9px", color: "#a3cfb6", marginBottom: "3px", textTransform: "uppercase" }}>3. VẬN CHUYỂN & LẮP ĐẶT</div>
                  <div style={{ fontSize: "8px", lineHeight: "1.3", color: "#e2e8f0" }}>
                    • Miễn phí vận chuyển nội thành cho đơn hàng từ 50 triệu đồng.<br />
                    • Phí vận chuyển ngoại thành hoặc đơn hàng nhỏ sẽ được tính theo cự ly thực tế.<br />
                    • Báo giá lắp đặt bao gồm vật tư phụ tiêu chuẩn.
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontWeight: 700, fontSize: "9px", color: "#a3cfb6", marginBottom: "3px", textTransform: "uppercase" }}>4. CHÍNH SÁCH BẢO HÀNH</div>
                  <div style={{ fontSize: "8px", lineHeight: "1.3", color: "#e2e8f0" }}>
                    • Bảo hành 12 tháng đối với cửa gỗ công nghiệp và phụ kiện kim khí do lỗi sản xuất.<br />
                    • Không bảo hành đối với các trường hợp ngập nước, ẩm ướt do công trình chưa khô, hoặc tác động ngoại lực không đúng quy định.
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "8px", fontSize: "7.5px", color: "#a3cfb6", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {company.name || "LEE-TECH"}
              </div>
            </div>

            {/* Right main cover page content */}
            <div style={{
              width: "160mm",
              minWidth: "160mm",
              height: "297mm",
              padding: "16mm 14mm 16mm 14mm",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: "14px",
              background: "#fff",
              position: "relative"
            }}>
              {/* Top decorative bar */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "6px",
                background: "linear-gradient(90deg, #074722 0%, #1b683b 100%)"
              }} />

              {/* Header: Logo & Company Information */}
              <div style={{ display: "flex", gap: "16px", alignItems: "center", borderBottom: "1.5px solid #074722", paddingBottom: "12px" }}>
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="Logo" style={{ width: "56px", height: "56px", objectFit: "contain" }} />
                ) : (
                  <div style={{ width: "56px", height: "56px", borderRadius: "8px", background: "#f0f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#074722", fontSize: "18px" }}>
                    {company.name ? company.name.substring(0, 2).toUpperCase() : "CO"}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "11.5px", color: "#074722", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {company.name ?? "TÊN CÔNG TY"}
                  </div>
                  {company.address && (
                    <div style={{ fontSize: "9px", color: "#374151", marginTop: "2px" }}>
                      Địa chỉ: {company.address}
                    </div>
                  )}
                  <div style={{ fontSize: "9px", color: "#374151", display: "flex", gap: "15px" }}>
                    {company.phone && <span>Điện thoại: {company.phone.replace(/[Hh]otline:\s*/gi, "").trim()}</span>}
                    {company.email && <span>Email: {company.email}</span>}
                  </div>
                </div>
              </div>

              {/* Title Block */}
              <div style={{ textAlign: "center", margin: "10px 0" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#111", letterSpacing: "1px", textTransform: "uppercase", margin: 0 }}>
                  HỒ SƠ BÁO GIÁ
                </h1>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#074722", textTransform: "uppercase", margin: "6px 0 0 0", letterSpacing: "2px" }}>
                  HẠNG MỤC: CỬA GỖ CÔNG NGHIỆP & ĐỒ GỖ XÂY DỰNG
                </p>
                <div style={{ width: "60px", height: "3px", background: "#074722", margin: "12px auto 0" }} />
              </div>

              {/* Customer & Quote Info Card */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "18px",
                borderLeft: "4px solid #074722"
              }}>
                <div style={{ fontWeight: 800, fontSize: "11px", color: "#074722", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "10px", letterSpacing: "0.5px" }}>
                  Thông tin hồ sơ báo giá
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "6px 12px", fontSize: "10.5px" }}>
                  <div style={{ color: "#64748b", fontWeight: 600 }}>Khách hàng / Đối tác:</div>
                  <div style={{ color: "#1e293b", fontWeight: 700 }}>{customer?.name ?? "—"}</div>

                  <div style={{ color: "#64748b", fontWeight: 600 }}>Người đại diện liên hệ:</div>
                  <div style={{ color: "#1e293b", fontWeight: 600 }}>{customer?.daiDien ? `${customer.xungHo ?? ""} ${customer.daiDien}` : "—"}</div>

                  <div style={{ color: "#64748b", fontWeight: 600 }}>Địa chỉ công trình:</div>
                  <div style={{ color: "#1e293b", fontWeight: 600 }}>{customer?.address ?? "—"}</div>

                  <div style={{ color: "#64748b", fontWeight: 600 }}>Số điện thoại:</div>
                  <div style={{ color: "#1e293b", fontWeight: 600 }}>{customer?.dienThoai ?? "—"}</div>

                  <div style={{ color: "#64748b", fontWeight: 600 }}>Mã số báo giá:</div>
                  <div style={{ color: "#074722", fontWeight: 700 }}>{info.soPhieu}</div>

                  <div style={{ color: "#64748b", fontWeight: 600 }}>Ngày lập báo giá:</div>
                  <div style={{ color: "#1e293b", fontWeight: 600 }}>{fmtDate(info.ngayTao)}</div>

                  <div style={{ color: "#64748b", fontWeight: 600 }}>Hiệu lực đến:</div>
                  <div style={{ color: "#1e293b", fontWeight: 600 }}>{fmtDate(info.ngayHetHan)}</div>
                </div>
              </div>

              {/* Thư ngỏ (Cover Letter) */}
              <div style={{ fontSize: "10px", lineHeight: "1.4", color: "#334155", textAlign: "justify", marginTop: "14px" }}>
                <p style={{ margin: "0 0 6px 0" }}>
                  <strong>Kính gửi: Quý Đối tác / Quý Khách hàng,</strong>
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  Lời đầu tiên, <strong>{company.name || "Chúng tôi"}</strong> xin gửi lời chào trân trọng, lời chúc sức khỏe và thành công hạnh phúc đến Quý khách hàng.
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  Chúng tôi hiểu rằng, một cánh cửa hiện đại không chỉ tối ưu hóa công năng sử dụng mà còn là mảnh ghép hoàn hảo cho xu hướng kiến trúc tối giản, tinh tế ngày nay. Với năng lực chuyên sâu trong lĩnh vực sản xuất nội thất, <strong>{company.name || "chúng tôi"}</strong> tự hào mang đến các giải pháp Cửa gỗ công nghiệp cao cấp đa dạng từ: Cửa gỗ MDF/HDF phủ Melamine/Laminate An Cường, Cửa nhựa gỗ Composite chịu nước tuyệt đối, đến Cửa gỗ công nghiệp chống cháy tiêu chuẩn.
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  Nhận được yêu cầu từ Quý khách, chúng tôi trân trọng gửi kèm bản Báo giá chi tiết các hạng mục cửa gỗ công nghiệp dựa trên kích thước và mẫu mã đã trao đổi.
                </p>
                <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>
                  Vì sao nên chọn cửa gỗ công nghiệp tại {company.name || "chúng tôi"}:
                </p>
                <ul style={{ margin: "0 0 6px 0", paddingLeft: "15px", listStyleType: "square" }}>
                  <li style={{ margin: "2px 0" }}><strong>Mẫu mã dẫn đầu xu hướng:</strong> Hàng trăm mã màu vân gỗ thời thượng, bề mặt giả đá, giả xi măng hoặc sơn bệt phẳng hiện đại, không lo bị lỗi mốt.</li>
                  <li style={{ margin: "2px 0" }}><strong>Độ bền vượt trội:</strong> Cốt gỗ được xử lý bằng công nghệ cao, cam kết không cong vênh, không co ngót, chống ẩm mốc và mối mọt tuyệt đối (đặc biệt là dòng Composite chịu nước).</li>
                  <li style={{ margin: "2px 0" }}><strong>Sản xuất chuẩn xác:</strong> Hệ thống máy cắt, máy dán cạnh tự động hóa giúp đường nét sắc sảo, kín khít, độ hoàn thiện tinh tế.</li>
                  <li style={{ margin: "2px 0" }}><strong>Giá thành tối ưu &amp; Tiến độ nhanh:</strong> Sản xuất trực tiếp tại xưởng với năng suất cao, đáp ứng được các công trình cần tiến độ gấp với mức giá cạnh tranh nhất.</li>
                </ul>
                <p style={{ margin: "0 0 6px 0" }}>
                  Bảng báo giá đính kèm có hiệu lực từ ngày <strong>{fmtDate(info.ngayTao)}</strong> đến ngày <strong>{fmtDate(info.ngayHetHan)}</strong>. Rất mong sẽ nhận được phản hồi từ Quý khách để chúng tôi có cơ hội đồng hành cùng dự án của bạn.
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  Nếu cần tư vấn thêm về catalog mẫu màu hoặc điều chỉnh kích thước, xin vui lòng liên hệ trực tiếp với chúng tôi qua hotline: <strong>{(company.phone || "—").replace(/[Hh]otline:\s*/gi, "").trim()}</strong>.
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  Kính chúc Quý khách một ngày làm việc hiệu quả!
                </p>
                <p style={{ margin: 0, textAlign: "right", fontStyle: "italic", color: "#475569", fontWeight: 600 }}>
                  Trân trọng,
                </p>
              </div>

            </div>

          </div>

          {/* Page 2: Price Details */}
          <div className="print-paper print-details" style={{ width: `${paperW}mm`, minHeight: `${paperH}mm`, flexShrink: 0, background: "#fff", boxShadow: "0 4px 32px rgba(0,0,0,0.18)", padding: "14mm 15mm", fontSize: 10, lineHeight: 1.5, fontFamily: "'Roboto Condensed', Arial Narrow, Arial, sans-serif", color: "#111" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid #074722" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {company.logoUrl && <img src={company.logoUrl} alt="Logo" style={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 10.5, color: "#074722", textTransform: "uppercase" }}>{company.name ?? "Công ty"}</div>
                  {company.address && <div style={{ fontSize: 9, color: "#374151", marginTop: 1 }}>Địa chỉ: {company.address}</div>}
                  {(company.phone || company.email) && <div style={{ fontSize: 9, color: "#374151", display: "flex", gap: 12 }}>{company.phone && <span>Điện thoại: {company.phone.replace(/[Hh]otline:\s*/gi, "").trim()}</span>}{company.email && <span>Email: {company.email}</span>}</div>}
                  {company.taxCode && <div style={{ fontSize: 9, color: "#374151" }}>MST: {company.taxCode}</div>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 1, color: "#111" }}>BẢNG BÁO GIÁ CỬA GỖ</div>
                <div style={{ fontSize: 9, color: "#374151", marginTop: 3 }}>Số: <strong>{info.soPhieu}</strong></div>
                <div style={{ fontSize: 9, color: "#374151" }}>Ngày lập: {fmtDate(info.ngayTao)}</div>
                <div style={{ fontSize: 9, color: "#374151" }}>Hiệu lực đến: {fmtDate(info.ngayHetHan)}</div>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 10, textTransform: "uppercase", color: "#074722", borderLeft: "3px solid #074722", paddingLeft: 6, marginBottom: 5 }}>Thông tin khách hàng</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 20px", fontSize: 9.5 }}>
                <div><strong>Đơn vị:</strong> {customer?.name ?? "—"}</div>
                <div><strong>Người liên hệ:</strong> {customer?.daiDien ? `${customer.xungHo ?? ""} ${customer.daiDien}` : "—"}</div>
                <div><strong>Địa chỉ:</strong> {customer?.address ?? "—"}</div>
                <div><strong>Điện thoại:</strong> {customer?.dienThoai ?? "—"}</div>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: 9.5 }}>
              <thead>
                <tr style={{ background: "#074722", color: "#fff" }}>
                  <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #a3cfb6", width: "40px" }}>STT</th>
                  <th style={{ padding: "5px 6px", textAlign: "left", fontWeight: 700, border: "1px solid #a3cfb6" }}>Tên hàng hoá</th>
                  <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #a3cfb6", width: "60px" }}>Đơn vị</th>
                  {info.showKichThuoc && <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #a3cfb6", width: "120px" }}>Kích thước</th>}
                  <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, border: "1px solid #a3cfb6", width: "110px" }}>Đơn giá</th>
                  <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #a3cfb6", width: "80px" }}>Số lượng</th>
                  <th style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, border: "1px solid #a3cfb6", width: "110px" }}>Thành tiền</th>
                  {info.showHinhAnh && <th style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, border: "1px solid #a3cfb6", width: "90px" }}>Hình ảnh</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, idx: number) => {
                  const thanhTien = it.giaBan * it.soLuong;
                  return (
                    <tr key={it.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f0f7f4" }}>
                      <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #cce6d9" }}>{idx + 1}</td>
                      <td style={{ padding: "4px 6px", border: "1px solid #cce6d9" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                            <div style={{ fontWeight: 600 }}>{it.tenHang}</div>
                            <span style={{
                              fontSize: "9px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.02em",
                              background: it.cuaChongChay ? "rgba(239, 68, 68, 0.09)" : "rgba(107, 114, 128, 0.09)",
                              color: it.cuaChongChay ? "#ef4444" : "#6b7280",
                              border: it.cuaChongChay ? "1px solid rgba(239, 68, 68, 0.18)" : "1px solid rgba(107, 114, 128, 0.18)"
                            }}>
                              {it.cuaChongChay ? "Chống cháy" : "Không chống cháy"}
                            </span>
                          </div>
                          {renderSpecs(it.thongSoKyThuat)}
                        </div>
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #cce6d9" }}>{it.donVi}</td>
                      {info.showKichThuoc && <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #cce6d9" }}>{it.kichThuoc}</td>}
                      <td style={{ padding: "4px 6px", textAlign: "right", border: "1px solid #cce6d9" }}>{fmt(it.giaBan)}</td>
                      <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #cce6d9" }}>{it.soLuong.toLocaleString("vi-VN")}</td>
                      <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, border: "1px solid #cce6d9" }}>{fmt(thanhTien)}</td>
                      {info.showHinhAnh && (
                        <td style={{ padding: "4px 6px", textAlign: "center", border: "1px solid #cce6d9" }}>
                          {it.imageUrl ? (
                            <img src={it.imageUrl} alt={it.tenHang} style={{ width: "30px", height: "30px", objectFit: "cover", borderRadius: "4px" }} />
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: "grid", gridTemplateColumns: `1fr 200px`, gap: 16 }}>
              <div style={{ fontSize: 9 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 9.5 }}>GHI CHÚ / ĐIỀU KHOẢN</div>
                <div style={{ color: "#374151", fontSize: 9 }}>- Báo giá chưa bao gồm thuế VAT (nếu có áp dụng khác).</div>
                <div style={{ color: "#374151", fontSize: 9 }}>- Hỗ trợ giao hàng theo chính sách thoả thuận hợp đồng.</div>
              </div>
              <div style={{ fontSize: 9.5 }}>
                {[
                  ["Tổng tiền hàng (đ):", fmt(tamTinh)],
                  [`Chiết khấu (${info.chietKhau}%):`, fmt(ckTien)],
                  [`Thuế VAT (${info.vat}%):`, fmt(thueTien)],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #e5e7eb" }}><span>{l}</span><strong>{v}</strong></div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "2px solid #074722", marginTop: 2 }}><span style={{ fontWeight: 800 }}>TỔNG CỘNG:</span><span style={{ fontWeight: 900, color: "#074722" }}>{fmt(tongCong)}</span></div>
                <div style={{ fontSize: 8.5, fontStyle: "italic", textAlign: "right" }}>({numberToVNWords(tongCong)})</div>
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ textAlign: "center", minWidth: 140, fontSize: 9.5 }}>
                <div style={{ fontWeight: 700 }}>ĐẠI DIỆN CÔNG TY</div>
                <div style={{ fontStyle: "italic", fontSize: 9, color: "#6b7280" }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ height: 45 }} />
                {company.legalRep && <div style={{ fontWeight: 700 }}>{company.legalRep}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
