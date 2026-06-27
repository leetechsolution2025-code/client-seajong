"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { useToast } from "@/components/ui/Toast";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { TheKhoModal } from "@/components/plan-finance/kho_hang/TheKhoModal";
import { StockCountDetailsOffcanvas } from "@/components/plan-finance/kho_hang/StockCountDetailsOffcanvas";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Warehouse {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
}

interface XNTLine {
  maSku: string | null;
  tenHang: string;
  donVi: string | null;
  tonDauSL: number;
  tonDauTT: number;
  nhapSL: number;
  nhapTT: number;
  xuatSL: number;
  xuatTT: number;
  tonCuoiSL: number;
  tonCuoiTT: number;
}

interface CompanyInfo {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtN = (n: number) => {
  return n !== 0 ? n.toLocaleString("vi-VN") : "0";
};

const fmtAmount = (n: number) => {
  return n !== 0 ? n.toLocaleString("vi-VN") : "—";
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  nhap:          { label: "Nhập kho", color: "#10b981" },
  xuat:          { label: "Xuất kho", color: "#ef4444" },
  "luan-chuyen": { label: "Luân chuyển", color: "#f59e0b" },
  chuyen:        { label: "Luân chuyển", color: "#f59e0b" },
  "dieu-chinh":  { label: "Kiểm kê", color: "#3b82f6" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  "hoan-thanh": { label: "Hoàn thành", color: "#065f46", bg: "rgba(16, 185, 129, 0.08)" },
  "nhap":       { label: "Chưa hoàn thành", color: "#1d4ed8", bg: "rgba(37, 99, 235, 0.08)" },
  "huy-bo":     { label: "Huỷ bỏ", color: "#b91c1c", bg: "rgba(239, 68, 68, 0.08)" },
};

const B1  = "1px solid #000";
const thCss = (w?: number): React.CSSProperties => ({
  border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700,
  fontSize: 11.5, verticalAlign: "middle", ...(w ? { width: w } : {}),
});
const tdCss = (align: "left" | "center" | "right" = "left"): React.CSSProperties => ({
  border: B1, padding: "4px 5px", fontSize: 12, textAlign: align, verticalAlign: "middle",
});
const fmtDate = (iso: string) => {
  if (!iso) return "";
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-");
  return `${d}/${m}/${y}`;
};

// Custom Toggle Switch
const ToggleSwitch = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", margin: 0, flexShrink: 0 }}>
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onChange(e.target.checked)} 
      style={{ display: "none" }} 
    />
    <div style={{
      position: "relative",
      width: 36,
      height: 18,
      borderRadius: 9,
      background: checked ? "#003087" : "#cbd5e1",
      transition: "background 0.2s"
    }}>
      <div style={{
        position: "absolute",
        top: 2,
        left: checked ? 20 : 2,
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s"
      }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{label}</span>
  </label>
);

export function LogisticsInventoryReports() {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  const steps: ModernStepItem[] = [
    { num: 1, id: "xnt", title: "Nhập-Xuất-Tồn", desc: "Bảng kê tổng hợp hàng hóa", icon: "bi-table" },
    { num: 2, id: "card", title: "Thẻ kho", desc: "Sổ chi tiết từng vật tư", icon: "bi-journal-text" },
    { num: 3, id: "audit", title: "Báo cáo kiểm kho", desc: "Biên bản đối soát kiểm kê", icon: "bi-clipboard-check" },
    { num: 4, id: "sales", title: "Báo cáo bán hàng", desc: "Hiệu quả doanh thu & đơn hàng", icon: "bi-graph-up-arrow" },
  ];

  // Load initial settings
  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((d) => setCompany(d))
      .catch(() => {});

    fetch("/api/plan-finance/warehouses")
      .then((r) => r.json())
      .then((d: Warehouse[]) => {
        const active = Array.isArray(d) ? d.filter((w) => w.isActive) : [];
        setWarehouses(active);
        if (active.length > 0) {
          const finishedGoodsWh = active.find((w) => w.name.toLowerCase().includes("thành phẩm"));
          setSelectedWarehouseId(finishedGoodsWh ? finishedGoodsWh.id : active[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // ── Step 2 Thẻ kho States & Effects ──────────────────────────────────────────
  const [step2SelectedCategoryId, setStep2SelectedCategoryId] = useState("all");
  const [step2Search, setStep2Search] = useState("");
  const [step2Year, setStep2Year] = useState(() => String(new Date().getFullYear()));
  const [step2Month, setStep2Month] = useState(() => String(new Date().getMonth() + 1));
  const [selectedItemId, setSelectedItemId] = useState("");
  const [step2Items, setStep2Items] = useState<{ id: string; tenHang: string; code: string | null; loai: string | null; categoryId?: string | null; categoryName?: string | null }[]>([]);
  const [step2Categories, setStep2Categories] = useState<{ id: string; name: string; children: { id: string; name: string }[] }[]>([]);
  const [step2Data, setStep2Data] = useState<any>(null);
  const [step2Loading, setStep2Loading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTheKhoModal, setShowTheKhoModal] = useState(false);
  const [step2TuyChonKy, setStep2TuyChonKy] = useState(false);
  const [step2CustomFrom, setStep2CustomFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [step2CustomTo, setStep2CustomTo] = useState(() => new Date().toISOString().slice(0, 10));

  // ── Step 3 Báo cáo kiểm kho States & Effects ─────────────────────────────────
  const [step3WarehouseId, setStep3WarehouseId] = useState("");
  const [step3Status, setStep3Status] = useState("all");
  const [step3Year, setStep3Year] = useState(() => String(new Date().getFullYear()));
  const [step3Month, setStep3Month] = useState(() => String(new Date().getMonth() + 1));
  const [step3TuyChonKy, setStep3TuyChonKy] = useState(false);
  const [step3CustomFrom, setStep3CustomFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [step3CustomTo, setStep3CustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [step3Data, setStep3Data] = useState<any[]>([]);
  const [step3Loading, setStep3Loading] = useState(false);
  const [showStep3PrintModal, setShowStep3PrintModal] = useState(false);
  const [selectedStockCountId, setSelectedStockCountId] = useState<string | null>(null);

  // ── Step 4 Báo cáo bán hàng States & Effects ─────────────────────────────────
  const [step4WarehouseId, setStep4WarehouseId] = useState("");
  const [step4Year, setStep4Year] = useState(() => String(new Date().getFullYear()));
  const [step4Month, setStep4Month] = useState(() => String(new Date().getMonth() + 1));
  const [step4TuyChonKy, setStep4TuyChonKy] = useState(false);
  const [step4CustomFrom, setStep4CustomFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [step4CustomTo, setStep4CustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [step4Data, setStep4Data] = useState<any[]>([]);
  const [step4Loading, setStep4Loading] = useState(false);
  const [showStep4PrintModal, setShowStep4PrintModal] = useState(false);

  const currentYearNum = useMemo(() => new Date().getFullYear(), []);
  const currentMonthNum = useMemo(() => new Date().getMonth() + 1, []);

  // Compute available months for Step 2
  const step2AvailableMonths = useMemo(() => {
    const yearNum = parseInt(step2Year);
    if (yearNum === currentYearNum) {
      return Array.from({ length: currentMonthNum }, (_, idx) => idx + 1);
    }
    return Array.from({ length: 12 }, (_, idx) => idx + 1);
  }, [step2Year, currentYearNum, currentMonthNum]);

  // Safely reset step2Month if out of bounds
  useEffect(() => {
    const monthNum = parseInt(step2Month);
    if (step2AvailableMonths.length > 0 && !step2AvailableMonths.includes(monthNum)) {
      setStep2Month(String(step2AvailableMonths[step2AvailableMonths.length - 1]));
    }
  }, [step2Year, step2AvailableMonths, step2Month]);

  // Load step 2 product list and categories based on warehouse
  useEffect(() => {
    if (selectedWarehouseId) {
      setStep2SelectedCategoryId("all");

      // Load categories tree based on warehouse type and industry
      fetch(`/api/plan-finance/reports/categories?warehouseId=${selectedWarehouseId}`)
        .then((r) => r.json())
        .then((d) => setStep2Categories(Array.isArray(d) ? d : []))
        .catch(() => setStep2Categories([]));

      // Load items
      fetch(`/api/plan-finance/stock-card/items?warehouseId=${selectedWarehouseId}`)
        .then((r) => r.json())
        .then((d) => {
          const items = Array.isArray(d) ? d : [];
          setStep2Items(items);
          if (items.length > 0) {
            setSelectedItemId(items[0].id);
            setStep2Search(items[0].tenHang);
          } else {
            setSelectedItemId("");
            setStep2Data(null);
            setStep2Search("");
          }
        })
        .catch(() => {});
    }
  }, [selectedWarehouseId]);

  // Filter product items locally based on Category & search query
  const filteredStep2Items = useMemo(() => {
    return step2Items.filter((item) => {
      // 1. Filter by category
      if (step2SelectedCategoryId !== "all") {
        if (item.categoryId !== step2SelectedCategoryId) return false;
      }
      // 2. Filter by search query
      if (step2Search) {
        const query = step2Search.toLowerCase();
        const nameMatch = item.tenHang.toLowerCase().includes(query);
        const codeMatch = item.code ? item.code.toLowerCase().includes(query) : false;
        return nameMatch || codeMatch;
      }
      return true;
    });
  }, [step2Items, step2SelectedCategoryId, step2Search]);

  // Load Thẻ kho report details from API
  const loadThẻKhoReport = useCallback(() => {
    if (!selectedItemId || !selectedWarehouseId) {
      setStep2Data(null);
      return;
    }

    let fromDate = "";
    let toDate = "";
    if (step2TuyChonKy) {
      fromDate = step2CustomFrom;
      toDate = step2CustomTo;
    } else {
      const year = parseInt(step2Year);
      const month = parseInt(step2Month);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      fromDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-01`;
      toDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    }

    setStep2Loading(true);
    fetch(`/api/plan-finance/stock-card?inventoryItemId=${selectedItemId}&warehouseId=${selectedWarehouseId}&from=${fromDate}&to=${toDate}`)
      .then((r) => r.json())
      .then((d) => setStep2Data(d))
      .catch(() => setStep2Data(null))
      .finally(() => setStep2Loading(false));
  }, [selectedItemId, selectedWarehouseId, step2Year, step2Month, step2TuyChonKy, step2CustomFrom, step2CustomTo]);

  useEffect(() => {
    if (currentStep === 2) {
      loadThẻKhoReport();
    }
  }, [currentStep, selectedItemId, selectedWarehouseId, step2Year, step2Month, step2TuyChonKy, step2CustomFrom, step2CustomTo, loadThẻKhoReport]);

  // ── Step 3 available months, sync, load & filter hooks ───────────────────────
  const step3AvailableMonths = useMemo(() => {
    const yearNum = parseInt(step3Year);
    if (yearNum === currentYearNum) {
      return Array.from({ length: currentMonthNum }, (_, idx) => idx + 1);
    }
    return Array.from({ length: 12 }, (_, idx) => idx + 1);
  }, [step3Year, currentYearNum, currentMonthNum]);

  useEffect(() => {
    const monthNum = parseInt(step3Month);
    if (step3AvailableMonths.length > 0 && !step3AvailableMonths.includes(monthNum)) {
      setStep3Month(String(step3AvailableMonths[step3AvailableMonths.length - 1]));
    }
  }, [step3Year, step3AvailableMonths, step3Month]);

  // Sync step3WarehouseId with selectedWarehouseId when it loads or changes
  useEffect(() => {
    if (selectedWarehouseId && !step3WarehouseId) {
      setStep3WarehouseId(selectedWarehouseId);
    }
  }, [selectedWarehouseId, step3WarehouseId]);

  const loadStep3Report = useCallback(() => {
    setStep3Loading(true);
    fetch("/api/plan-finance/stock-counts?trangThai=all")
      .then((r) => r.json())
      .then((d) => setStep3Data(Array.isArray(d) ? d : []))
      .catch(() => setStep3Data([]))
      .finally(() => setStep3Loading(false));
  }, []);

  useEffect(() => {
    if (currentStep === 3) {
      loadStep3Report();
    }
  }, [currentStep, loadStep3Report]);

  // ── Step 4 available months, sync, load & hooks ───────────────────────
  const step4AvailableMonths = useMemo(() => {
    const yearNum = parseInt(step4Year);
    if (yearNum === currentYearNum) {
      return Array.from({ length: currentMonthNum }, (_, idx) => idx + 1);
    }
    return Array.from({ length: 12 }, (_, idx) => idx + 1);
  }, [step4Year, currentYearNum, currentMonthNum]);

  useEffect(() => {
    const monthNum = parseInt(step4Month);
    if (step4AvailableMonths.length > 0 && !step4AvailableMonths.includes(monthNum)) {
      setStep4Month(String(step4AvailableMonths[step4AvailableMonths.length - 1]));
    }
  }, [step4Year, step4AvailableMonths, step4Month]);

  // Sync step4WarehouseId with selectedWarehouseId when it loads or changes
  useEffect(() => {
    if (selectedWarehouseId && !step4WarehouseId) {
      setStep4WarehouseId(selectedWarehouseId);
    }
  }, [selectedWarehouseId, step4WarehouseId]);

  const loadStep4Report = useCallback(() => {
    if (!step4WarehouseId) return;

    let fromDate = "";
    let toDate = "";
    if (step4TuyChonKy) {
      fromDate = step4CustomFrom;
      toDate = step4CustomTo;
    } else {
      const year = parseInt(step4Year);
      const month = parseInt(step4Month);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      fromDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-01`;
      toDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    }

    setStep4Loading(true);
    fetch(`/api/plan-finance/reports/bao-cao-ban-hang?warehouseId=${step4WarehouseId}&from=${fromDate}&to=${toDate}`)
      .then((r) => r.json())
      .then((d) => setStep4Data(Array.isArray(d) ? d : []))
      .catch(() => setStep4Data([]))
      .finally(() => setStep4Loading(false));
  }, [step4WarehouseId, step4Year, step4Month, step4TuyChonKy, step4CustomFrom, step4CustomTo]);

  useEffect(() => {
    if (currentStep === 4 && step4WarehouseId) {
      loadStep4Report();
    }
  }, [currentStep, step4WarehouseId, loadStep4Report]);

  const filteredStep3Data = useMemo(() => {
    return step3Data.filter((item) => {
      // 1. Filter by warehouse
      if (step3WarehouseId && step3WarehouseId !== "all") {
        if (item.warehouseId !== step3WarehouseId) return false;
      }
      
      // 2. Filter by status
      if (step3Status && step3Status !== "all") {
        if (item.trangThai !== step3Status) return false;
      }
      
      // 3. Filter by date
      const date = new Date(item.ngayKiem);
      if (step3TuyChonKy) {
        const fromDate = new Date(step3CustomFrom);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(step3CustomTo);
        toDate.setHours(23, 59, 59, 999);
        return date >= fromDate && date <= toDate;
      } else {
        const year = parseInt(step3Year);
        const month = parseInt(step3Month);
        return date.getFullYear() === year && (date.getMonth() + 1) === month;
      }
    });
  }, [step3Data, step3WarehouseId, step3Status, step3TuyChonKy, step3CustomFrom, step3CustomTo, step3Year, step3Month]);

  const step2TonDau = step2Data ? (step2Data.tonDauKy ?? 0) : 0;
  const step2TonCuoi = step2Data 
    ? (step2Data.lines && step2Data.lines.length > 0 
        ? (step2Data.lines[step2Data.lines.length - 1].tonCuoi ?? 0)
        : (step2Data.tonDauKy ?? 0))
    : 0;



  const [tuyChonKy, setTuyChonKy] = useState(false);
  const [coBienDong, setCoBienDong] = useState(false);
  
  const [selectedYear, setSelectedYear] = useState(() => String(currentYearNum));
  const [selectedMonth, setSelectedMonth] = useState(() => String(currentMonthNum));

  // Generate dynamic years options (current year, and 2 previous years)
  const years = useMemo(() => {
    return [currentYearNum, currentYearNum - 1, currentYearNum - 2];
  }, [currentYearNum]);

  // Compute available months: for the current year, only show months up to the current month
  const availableMonths = useMemo(() => {
    const yearNum = parseInt(selectedYear);
    if (yearNum === currentYearNum) {
      return Array.from({ length: currentMonthNum }, (_, idx) => idx + 1);
    }
    return Array.from({ length: 12 }, (_, idx) => idx + 1);
  }, [selectedYear, currentYearNum, currentMonthNum]);

  // Ensure selectedMonth is valid within availableMonths
  useEffect(() => {
    const monthNum = parseInt(selectedMonth);
    if (availableMonths.length > 0 && !availableMonths.includes(monthNum)) {
      setSelectedMonth(String(availableMonths[availableMonths.length - 1]));
    }
  }, [selectedYear, availableMonths, selectedMonth]);

  // Custom period dates
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [xntLines, setXntLines] = useState<XNTLine[]>([]);
  const [xntLoading, setXntLoading] = useState(false);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [warehouseAddr, setWarehouseAddr] = useState<string | null>(null);

  useEffect(() => {
    if (selectedWarehouseId) {
      fetch(`/api/plan-finance/warehouses/${selectedWarehouseId}`)
        .then((r) => r.json())
        .then((d) => setWarehouseAddr(d?.address ?? null))
        .catch(() => setWarehouseAddr(null));
    } else {
      setWarehouseAddr(null);
    }
  }, [selectedWarehouseId]);

  // Load report data from API
  const loadXNTReport = useCallback(() => {
    if (!selectedWarehouseId) {
      toast.error("Lỗi", "Vui lòng chọn kho hàng");
      return;
    }

    let fromDate = "";
    let toDate = "";

    if (tuyChonKy) {
      fromDate = customFrom;
      toDate = customTo;
    } else {
      // Calculate dates based on Month and Year
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      fromDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-01`;
      toDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    }

    setXntLoading(true);
    fetch(`/api/plan-finance/reports/bang-ke-xnt?warehouseId=${selectedWarehouseId}&from=${fromDate}&to=${toDate}`)
      .then((r) => r.json())
      .then((d) => setXntLines(Array.isArray(d) ? d : []))
      .catch(() => setXntLines([]))
      .finally(() => setXntLoading(false));
  }, [selectedWarehouseId, tuyChonKy, customFrom, customTo, selectedYear, selectedMonth, toast]);

  // Load automatically when step 1 opens or selected warehouse changes
  useEffect(() => {
    if (currentStep === 1 && selectedWarehouseId) {
      loadXNTReport();
    }
  }, [currentStep, selectedWarehouseId, loadXNTReport]);

  // Filter line list based on "Có biến động" toggle
  const filteredXntLines = useMemo(() => {
    return xntLines.filter((l) => {
      if (coBienDong) {
        return l.nhapSL > 0 || l.xuatSL > 0;
      }
      return true;
    });
  }, [xntLines, coBienDong]);

  // Export filtered lines to CSV
  const handleExportExcel = () => {
    if (filteredXntLines.length === 0) {
      toast.error("Lỗi", "Không có dữ liệu để xuất");
      return;
    }
    const warehouseName = warehouses.find((w) => w.id === selectedWarehouseId)?.name ?? "Kho";
    const headers = [
      "STT",
      "Hàng hóa",
      "Mã vật tư",
      "ĐVT",
      "Tồn đầu SL",
      "Tồn đầu TT",
      "Nhập SL",
      "Nhập TT",
      "Xuất SL",
      "Xuất TT",
      "Tồn cuối SL",
      "Tồn cuối TT"
    ];
    const rows = filteredXntLines.map((l, i) => [
      i + 1,
      l.tenHang,
      l.maSku || "",
      l.donVi || "",
      l.tonDauSL,
      l.tonDauTT,
      l.nhapSL,
      l.nhapTT,
      l.xuatSL,
      l.xuatTT,
      l.tonCuoiSL,
      l.tonCuoiTT
    ]);
    const content = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BaoCao_XNT_${warehouseName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Thành công", "Đã xuất báo cáo CSV thành công!");
  };

  const renderContent = () => {
    const activeStep = steps.find((s) => s.num === currentStep) || steps[0];

    if (currentStep === 1) {
      return (
        <div 
          className="flex-grow-1 d-flex flex-column animate__animated animate__fadeIn" 
          style={{ minHeight: 0 }}
        >
          {/* Top Controls Toolbar matching user screenshot */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 16, 
              padding: "12px 16px", 
              borderBottom: "1px solid var(--border)", 
              flexWrap: "wrap",
              flexShrink: 0
            }}
          >
            {/* Warehouse select */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Kho:</span>
              <select 
                value={selectedWarehouseId} 
                onChange={(e) => setSelectedWarehouseId(e.target.value)} 
                style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "180px" }}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div style={{ width: 1, height: 18, background: "var(--border)" }} />

            {/* Toggle Tùy chọn kỳ */}
            <ToggleSwitch label="Tùy chọn kỳ" checked={tuyChonKy} onChange={setTuyChonKy} />

            <div style={{ width: 1, height: 18, background: "var(--border)" }} />

            {/* Toggle Có biến động */}
            <ToggleSwitch label="Có biến động" checked={coBienDong} onChange={setCoBienDong} />

            <div style={{ width: 1, height: 18, background: "var(--border)" }} />

            {/* Date Parameter Selectors */}
            {tuyChonKy ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <input 
                  type="date" 
                  value={customFrom} 
                  onChange={(e) => setCustomFrom(e.target.value)} 
                  style={{ height: 32, padding: "0 8px", fontSize: 12.5, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }} 
                />
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>đến</span>
                <input 
                  type="date" 
                  value={customTo} 
                  onChange={(e) => setCustomTo(e.target.value)} 
                  style={{ height: 32, padding: "0 8px", fontSize: 12.5, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }} 
                />
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {/* Year selector */}
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "76px" }}
                >
                  {years.map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>

                {/* Month selector */}
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "110px" }}
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={String(m)}>Tháng {m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button 
                onClick={() => setShowPrintModal(true)} 
                disabled={xntLoading || filteredXntLines.length === 0}
                className="btn btn-sm btn-primary"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6, 
                  height: 32, 
                  background: "#003087", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: 8, 
                  padding: "0 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                <i className="bi bi-printer" />
                Báo cáo
              </button>

              <button 
                onClick={handleExportExcel}
                className="btn btn-sm btn-outline-success"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6, 
                  height: 32, 
                  borderColor: "#10b981", 
                  color: "#10b981", 
                  background: "transparent", 
                  borderRadius: 8, 
                  padding: "0 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(16,185,129,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <i className="bi bi-file-earmark-excel" />
                Xuất Excel
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {xntLoading ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-arrow-repeat spin fs-3 d-block mb-3" style={{ display: "inline-block" }} />
                <p style={{ margin: 0, fontSize: 13.5 }}>Đang truy vấn dữ liệu thực tế từ cơ sở dữ liệu...</p>
              </div>
            ) : filteredXntLines.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-inbox fs-2 d-block mb-3 opacity-30" />
                <p style={{ margin: 0, fontSize: 13.5 }}>Không tìm thấy dữ liệu phát sinh trong kỳ báo cáo</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "'Roboto Condensed', sans-serif" }}>
                <thead>
                  {/* Row 1 headers */}
                  <tr style={{ background: "color-mix(in srgb, var(--muted) 25%, transparent)", textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 11, letterSpacing: "0.03em" }}>
                    <th rowSpan={2} style={{ padding: "8px 8px", textAlign: "center", width: 40 }}>STT</th>
                    <th rowSpan={2} style={{ padding: "8px 12px", textAlign: "left" }}>Hàng hóa</th>
                    <th rowSpan={2} style={{ padding: "8px 8px", textAlign: "center", width: 48 }}>ĐVT</th>
                    <th colSpan={2} style={{ padding: "6px 8px 0 8px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "3px", marginLeft: "12px", marginRight: "12px" }}>
                        Tồn đầu kỳ
                      </div>
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px 0 8px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "3px", marginLeft: "12px", marginRight: "12px" }}>
                        Nhập trong kỳ
                      </div>
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px 0 8px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "3px", marginLeft: "12px", marginRight: "12px" }}>
                        Xuất trong kỳ
                      </div>
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px 0 8px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "3px", marginLeft: "12px", marginRight: "12px" }}>
                        Tồn cuối kỳ
                      </div>
                    </th>
                  </tr>
                  {/* Row 2 headers */}
                  <tr style={{ background: "color-mix(in srgb, var(--muted) 20%, transparent)", textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 10.5, borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 80 }}>Số lượng</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 85 }}>Thành tiền</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 80 }}>Số lượng</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 85 }}>Thành tiền</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 80 }}>Số lượng</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 85 }}>Thành tiền</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 80 }}>Số lượng</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 85 }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredXntLines.map((line, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        background: idx % 2 === 1 ? "rgba(0,48,135,0.015)" : "transparent",
                        borderBottom: "1px solid var(--border)"
                      }}
                    >
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "var(--muted-foreground)" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "6px 12px", textAlign: "left" }}>
                        <div style={{ fontWeight: 700, color: "var(--foreground)", fontSize: 13 }}>{line.tenHang}</div>
                        {line.maSku && (
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace", marginTop: 2 }}>
                            {line.maSku}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center", color: "var(--muted-foreground)" }}>
                        {line.donVi || "—"}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>
                        {fmtN(line.tonDauSL)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>
                        {fmtAmount(line.tonDauTT)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>
                        {fmtN(line.nhapSL)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>
                        {fmtAmount(line.nhapTT)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>
                        {fmtN(line.xuatSL)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>
                        {fmtAmount(line.xuatTT)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--foreground)" }}>
                        {fmtN(line.tonCuoiSL)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--foreground)" }}>
                        {fmtAmount(line.tonCuoiTT)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      const donGia = step2Data?.item?.giaNhap ?? 0;
      return (
        <div className="flex-grow-1 d-flex flex-column animate__animated animate__fadeIn" style={{ minHeight: 0 }}>
          {/* Top Controls Toolbar for Step 2 */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 16, 
              padding: "12px 16px", 
              borderBottom: "1px solid var(--border)", 
              flexWrap: "wrap",
              flexShrink: 0
            }}
          >
             {/* Warehouse select (no text label) */}
            <select 
              value={selectedWarehouseId} 
              onChange={(e) => setSelectedWarehouseId(e.target.value)} 
              style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "180px", flexShrink: 0 }}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

            {/* Bộ lọc theo loại sản phẩm là danh mục tương ứng với kho */}
            <select 
              value={step2SelectedCategoryId} 
              onChange={(e) => setStep2SelectedCategoryId(e.target.value)} 
              style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "180px", flexShrink: 0 }}
            >
              <option value="all">Tất cả danh mục</option>
              {step2Categories.map(parent => (
                <optgroup key={parent.id} label={parent.name}>
                  {parent.children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

            {/* Ô tìm kiếm with floating suggestions dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative", flex: 1 }}>
              <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--muted-foreground)" }} />
              <input 
                type="text" 
                placeholder="Tìm kiếm sản phẩm..."
                value={step2Search}
                onChange={(e) => {
                  setStep2Search(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                style={{ height: 32, padding: "0 10px 0 28px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "100%" }}
              />

              {showSuggestions && (
                <div 
                  style={{
                    position: "absolute",
                    top: 36,
                    left: 0,
                    right: 0,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    maxHeight: 240,
                    overflowY: "auto",
                    zIndex: 100,
                  }}
                >
                  {filteredStep2Items.length === 0 ? (
                    <div style={{ padding: "8px 12px", fontSize: 12.5, color: "var(--muted-foreground)" }}>Không tìm thấy sản phẩm</div>
                  ) : (
                    filteredStep2Items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setStep2Search(item.tenHang);
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: 12.5,
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                          background: item.id === selectedItemId ? "rgba(0, 48, 135, 0.06)" : "transparent",
                          color: "var(--foreground)",
                          fontWeight: item.id === selectedItemId ? 700 : 500,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(0, 48, 135, 0.04)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = item.id === selectedItemId ? "rgba(0, 48, 135, 0.06)" : "transparent";
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{item.tenHang}</div>
                        {item.code && <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>SKU: {item.code}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* In thẻ kho button */}
            <button 
              onClick={() => setShowTheKhoModal(true)} 
              disabled={!selectedItemId}
              className="btn btn-sm btn-primary"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 6, 
                height: 32, 
                background: "#003087", 
                color: "#fff", 
                border: "none", 
                borderRadius: 8, 
                padding: "0 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: selectedItemId ? "pointer" : "not-allowed",
                marginLeft: "auto",
                opacity: selectedItemId ? 1 : 0.6,
                flexShrink: 0
              }}
            >
              <i className="bi bi-printer" />
              In thẻ kho
            </button>
          </div>

          {/* Table Container */}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {step2Loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-arrow-repeat spin fs-3 d-block mb-3" style={{ display: "inline-block" }} />
                <p style={{ margin: 0, fontSize: 13.5 }}>Đang truy vấn sổ thẻ kho...</p>
              </div>
            ) : !selectedItemId ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-search fs-2 d-block mb-3 opacity-30" />
                <p style={{ margin: 0, fontSize: 13.5 }}>Vui lòng tìm kiếm và chọn sản phẩm từ ô tìm kiếm để xem thẻ kho</p>
              </div>
            ) : !step2Data || !step2Data.lines || step2Data.lines.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-inbox fs-2 d-block mb-3 opacity-30" />
                <p style={{ margin: 0, fontSize: 13.5 }}>Không có biến động tồn kho nào của sản phẩm trong kỳ báo cáo</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "'Roboto Condensed', sans-serif" }}>
                <thead>
                  {/* Row 1 Grouped Headers */}
                  <tr style={{ background: "color-mix(in srgb, var(--muted) 25%, transparent)", textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 11, letterSpacing: "0.03em" }}>
                    <th rowSpan={2} style={{ padding: "8px 8px", textAlign: "center", width: 40, borderBottom: "1px solid var(--border)" }}>STT</th>
                    <th rowSpan={2} style={{ padding: "8px 12px", textAlign: "left", width: 140, borderBottom: "1px solid var(--border)" }}>SỐ CHỨNG TỪ</th>
                    <th rowSpan={2} style={{ padding: "8px 12px", textAlign: "left", width: 100, borderBottom: "1px solid var(--border)" }}>LOẠI</th>
                    <th rowSpan={2} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>DIỄN GIẢI</th>
                    <th colSpan={3} style={{ padding: "6px 8px 0 8px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #003087", paddingBottom: "3px", marginLeft: "8px", marginRight: "8px", color: "#003087", fontWeight: 800 }}>
                        NHẬP KHO
                      </div>
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px 0 8px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #d97706", paddingBottom: "3px", marginLeft: "8px", marginRight: "8px", color: "#d97706", fontWeight: 800 }}>
                        XUẤT KHO
                      </div>
                    </th>
                    <th colSpan={2} style={{ padding: "6px 8px 0 8px", textAlign: "center" }}>
                      <div style={{ borderBottom: "1px solid #dc2626", paddingBottom: "3px", marginLeft: "8px", marginRight: "8px", color: "#dc2626", fontWeight: 800 }}>
                        TỒN KHO
                      </div>
                    </th>
                  </tr>
                  {/* Row 2 Headers */}
                  <tr style={{ background: "color-mix(in srgb, var(--muted) 20%, transparent)", textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 10.5, borderBottom: "1px solid var(--border)" }}>
                    {/* NHẬP KHO subheadings */}
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 90 }}>ĐƠN GIÁ</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 60 }}>SL</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 95 }}>THÀNH TIỀN</th>
                    {/* XUẤT KHO subheadings */}
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 60 }}>SL</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 95 }}>THÀNH TIỀN</th>
                    {/* TỒN KHO subheadings */}
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 60 }}>SL</th>
                    <th style={{ padding: "5px 8px", textAlign: "right", width: 95 }}>THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row Số dư đầu kỳ */}
                  <tr style={{ fontStyle: "italic", background: "rgba(0,48,135,0.02)", borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "var(--muted-foreground)" }}>—</td>
                    <td style={{ padding: "6px 12px", color: "var(--muted-foreground)" }}>—</td>
                    <td style={{ padding: "6px 12px", color: "var(--muted-foreground)" }}>—</td>
                    <td style={{ padding: "6px 12px", fontWeight: 700, color: "var(--foreground)" }}>Số dư đầu kỳ</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>—</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>—</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>—</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>—</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>—</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--foreground)" }}>{fmtN(step2TonDau)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--foreground)" }}>
                      {donGia && step2TonDau ? fmtAmount(step2TonDau * donGia) : "—"}
                    </td>
                  </tr>

                  {/* Movements */}
                  {step2Data.lines.map((line: any, idx: number) => {
                    const nhapTT = line.nhap != null && donGia ? line.nhap * donGia : null;
                    const xuatTT = line.xuat != null && donGia ? line.xuat * donGia : null;
                    const tonTT  = donGia ? line.tonCuoi * donGia : null;
                    const meta = TYPE_META[line.type] ?? { label: line.type, color: "var(--foreground)" };

                    return (
                      <tr 
                        key={line.id} 
                        style={{ 
                          background: idx % 2 === 1 ? "rgba(0,48,135,0.015)" : "transparent",
                          borderBottom: "1px solid var(--border)"
                        }}
                      >
                        <td style={{ padding: "6px 8px", textAlign: "center", color: "var(--muted-foreground)" }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "6px 12px", fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
                          {line.soChungTu ?? "—"}
                        </td>
                        <td style={{ padding: "6px 12px" }}>
                          <span 
                            style={{ 
                              fontWeight: 700, 
                              color: meta.color,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                              fontSize: 11
                            }}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ padding: "6px 12px" }}>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>
                            {fmtDate(line.ngay)}
                          </div>
                          {line.lyDo && <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{line.lyDo}</span>}
                          {(line.fromKho || line.toKho) && (
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                              {line.fromKho ? `Từ: ${line.fromKho}` : ""}
                              {line.fromKho && line.toKho ? " → " : ""}
                              {line.toKho ?? ""}
                            </div>
                          )}
                          {line.nguoiThucHien && (
                            <div style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontStyle: "italic", marginTop: 1 }}>
                              Người thực hiện: {line.nguoiThucHien}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                          {line.nhap != null && donGia ? fmtN(donGia) : "—"}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>
                          {line.nhap != null ? fmtN(line.nhap) : "—"}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>
                          {nhapTT != null ? fmtAmount(nhapTT) : "—"}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>
                          {line.xuat != null ? fmtN(line.xuat) : "—"}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted-foreground)" }}>
                          {xuatTT != null ? fmtAmount(xuatTT) : "—"}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--foreground)" }}>
                          {fmtN(line.tonCuoi)}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--foreground)" }}>
                          {tonTT != null ? fmtAmount(tonTT) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer container for Year, Month, Opening balance, Closing balance */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              padding: "12px 16px", 
              borderTop: "1px solid var(--border)", 
              background: "var(--card)", 
              flexShrink: 0,
              gap: 16,
              flexWrap: "wrap"
            }}
          >
            {/* Left side: Year / Month selectors or Custom Date Range */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)" }}>KỲ BÁO CÁO:</span>
              
              <ToggleSwitch label="Tùy chọn" checked={step2TuyChonKy} onChange={setStep2TuyChonKy} />
              
              <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

              {step2TuyChonKy ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <input 
                    type="date" 
                    value={step2CustomFrom} 
                    onChange={(e) => setStep2CustomFrom(e.target.value)} 
                    style={{ height: 32, padding: "0 8px", fontSize: 12.5, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }} 
                  />
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>đến</span>
                  <input 
                    type="date" 
                    value={step2CustomTo} 
                    onChange={(e) => setStep2CustomTo(e.target.value)} 
                    style={{ height: 32, padding: "0 8px", fontSize: 12.5, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }} 
                  />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <select 
                    value={step2Year} 
                    onChange={(e) => setStep2Year(e.target.value)}
                    style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "80px" }}
                  >
                    {years.map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>

                  <select 
                    value={step2Month} 
                    onChange={(e) => setStep2Month(e.target.value)}
                    style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "110px" }}
                  >
                    {step2AvailableMonths.map((m) => (
                      <option key={m} value={String(m)}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right side: Opening and Closing Stock Badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div 
                style={{ 
                  fontSize: 12.5, 
                  fontWeight: 700, 
                  padding: "6px 14px", 
                  borderRadius: 8, 
                  background: "rgba(0, 48, 135, 0.06)", 
                  border: "1px solid rgba(0, 48, 135, 0.15)",
                  color: "#003087" 
                }}
              >
                Tồn đầu: <span style={{ fontFamily: "monospace", fontSize: 13.5, fontWeight: 800 }}>{fmtN(step2TonDau)}</span>
              </div>
              <div 
                style={{ 
                  fontSize: 12.5, 
                  fontWeight: 700, 
                  padding: "6px 14px", 
                  borderRadius: 8, 
                  background: "rgba(16, 185, 129, 0.06)", 
                  border: "1px solid rgba(16, 185, 129, 0.15)",
                  color: "#065f46" 
                }}
              >
                Tồn cuối: <span style={{ fontFamily: "monospace", fontSize: 13.5, fontWeight: 800 }}>{fmtN(step2TonCuoi)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="flex-grow-1 d-flex flex-column animate__animated animate__fadeIn" style={{ minHeight: 0 }}>
          {/* Top Controls Toolbar for Step 3 */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 16, 
              padding: "12px 16px", 
              borderBottom: "1px solid var(--border)", 
              flexWrap: "wrap",
              flexShrink: 0
            }}
          >
            {/* Lọc theo kho */}
            <select 
              value={step3WarehouseId} 
              onChange={(e) => setStep3WarehouseId(e.target.value)} 
              style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "180px", flexShrink: 0 }}
            >
              <option value="all">Tất cả các kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

            {/* Lọc theo trạng thái */}
            <select 
              value={step3Status} 
              onChange={(e) => setStep3Status(e.target.value)} 
              style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "160px", flexShrink: 0 }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="hoan-thanh">Hoàn thành</option>
              <option value="nhap">Chưa hoàn thành</option>
              <option value="huy-bo">Huỷ bỏ</option>
            </select>

            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

            {/* Toggle Tùy chọn kỳ */}
            <ToggleSwitch label="Tùy chọn" checked={step3TuyChonKy} onChange={setStep3TuyChonKy} />

            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

            {/* Date selectors based on ToggleSwitch */}
            {step3TuyChonKy ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <input 
                  type="date" 
                  value={step3CustomFrom} 
                  onChange={(e) => setStep3CustomFrom(e.target.value)} 
                  style={{ height: 32, padding: "0 8px", fontSize: 12.5, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }} 
                />
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>đến</span>
                <input 
                  type="date" 
                  value={step3CustomTo} 
                  onChange={(e) => setStep3CustomTo(e.target.value)} 
                  style={{ height: 32, padding: "0 8px", fontSize: 12.5, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }} 
                />
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <select 
                  value={step3Year} 
                  onChange={(e) => setStep3Year(e.target.value)}
                  style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "80px" }}
                >
                  {years.map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>

                <select 
                  value={step3Month} 
                  onChange={(e) => setStep3Month(e.target.value)}
                  style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "110px" }}
                >
                  {step3AvailableMonths.map((m) => (
                    <option key={m} value={String(m)}>Tháng {m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Print button on the far right */}
            <button 
              onClick={() => setShowStep3PrintModal(true)} 
              disabled={step3Loading || filteredStep3Data.length === 0}
              className="btn btn-sm btn-primary"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 6, 
                height: 32, 
                background: "#003087", 
                color: "#fff", 
                border: "none", 
                borderRadius: 8, 
                padding: "0 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: filteredStep3Data.length > 0 ? "pointer" : "not-allowed",
                marginLeft: "auto",
                opacity: filteredStep3Data.length > 0 ? 1 : 0.6,
                flexShrink: 0
              }}
            >
              <i className="bi bi-printer" />
              In báo cáo
            </button>
          </div>

          {/* Table Container */}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {step3Loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-arrow-repeat spin fs-3 d-block mb-3" style={{ display: "inline-block" }} />
                <p style={{ margin: 0, fontSize: 13.5 }}>Đang truy vấn dữ liệu kiểm kho...</p>
              </div>
            ) : filteredStep3Data.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-inbox fs-2 d-block mb-3 opacity-30" />
                <p style={{ margin: 0, fontSize: 13.5 }}>Không tìm thấy dữ liệu phiếu kiểm kho nào phát sinh trong kỳ</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "'Roboto Condensed', sans-serif" }}>
                <thead>
                  <tr style={{ background: "color-mix(in srgb, var(--muted) 25%, transparent)", textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 11, letterSpacing: "0.03em", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 8px", textAlign: "center", width: 40 }}>STT</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", width: 160 }}>Số chứng từ</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", width: 120 }}>Ngày kiểm</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", width: 160 }}>Người kiểm</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", width: 120 }}>Đã kiểm</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", width: 140 }}>Trạng thái</th>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStep3Data.map((l, idx) => {
                    const statusMeta = STATUS_META[l.trangThai] ?? { label: l.trangThai, color: "var(--foreground)", bg: "var(--muted)" };
                    return (
                      <tr 
                        key={l.id} 
                        onClick={() => setSelectedStockCountId(l.id)}
                        style={{ 
                          background: idx % 2 === 1 ? "rgba(0,48,135,0.015)" : "transparent",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(0,48,135,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = idx % 2 === 1 ? "rgba(0,48,135,0.015)" : "transparent";
                        }}
                      >
                        <td style={{ padding: "8px 8px", textAlign: "center", color: "var(--muted-foreground)" }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
                          {l.soChungTu ?? "—"}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--foreground)", fontWeight: 500 }}>
                          {fmtDate(l.ngayKiem)}
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                          {l.nguoiKiem ?? "—"}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "var(--muted-foreground)" }}>
                          {l.daKiemCount ?? 0} | {l.soLuongDong} mặt hàng
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <span 
                            style={{ 
                              fontWeight: 700, 
                              color: statusMeta.color,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: statusMeta.bg,
                              fontSize: 11
                            }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--muted-foreground)" }}>
                          {l.ghiChu ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    }

    if (currentStep === 4) {
      return (
        <div className="flex-grow-1 d-flex flex-column animate__animated animate__fadeIn" style={{ minHeight: 0 }}>
          {/* Top Controls Toolbar for Step 4 */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 16, 
              padding: "12px 16px", 
              borderBottom: "1px solid var(--border)", 
              flexWrap: "wrap",
              flexShrink: 0
            }}
          >
            {/* Bộ lọc theo kho */}
            <select 
              value={step4WarehouseId} 
              onChange={(e) => setStep4WarehouseId(e.target.value)} 
              style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "180px", flexShrink: 0 }}
            >
              <option value="all">Tất cả các kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

            {/* Toggle Tùy chọn kỳ */}
            <ToggleSwitch label="Tùy chọn" checked={step4TuyChonKy} onChange={setStep4TuyChonKy} />

            <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

            {/* Date selectors based on ToggleSwitch */}
            {step4TuyChonKy ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <input 
                  type="date" 
                  value={step4CustomFrom} 
                  onChange={(e) => setStep4CustomFrom(e.target.value)} 
                  style={{ height: 32, padding: "0 8px", fontSize: 12.5, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }} 
                />
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>đến</span>
                <input 
                  type="date" 
                  value={step4CustomTo} 
                  onChange={(e) => setStep4CustomTo(e.target.value)} 
                  style={{ height: 32, padding: "0 8px", fontSize: 12.5, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }} 
                />
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <select 
                  value={step4Year} 
                  onChange={(e) => setStep4Year(e.target.value)}
                  style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "80px" }}
                >
                  {years.map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>

                <select 
                  value={step4Month} 
                  onChange={(e) => setStep4Month(e.target.value)}
                  style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", outline: "none", width: "110px" }}
                >
                  {step4AvailableMonths.map((m) => (
                    <option key={m} value={String(m)}>Tháng {m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Print button on the far right */}
            <button 
              onClick={() => setShowStep4PrintModal(true)} 
              disabled={step4Loading || step4Data.length === 0}
              className="btn btn-sm btn-primary"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 6, 
                height: 32, 
                background: "#003087", 
                color: "#fff", 
                border: "none", 
                borderRadius: 8, 
                padding: "0 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: step4Data.length > 0 ? "pointer" : "not-allowed",
                marginLeft: "auto",
                opacity: step4Data.length > 0 ? 1 : 0.6,
                flexShrink: 0
              }}
            >
              <i className="bi bi-printer" />
              In báo cáo
            </button>
          </div>

          {/* Table Container */}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {step4Loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-arrow-repeat spin fs-3 d-block mb-3" style={{ display: "inline-block" }} />
                <p style={{ margin: 0, fontSize: 13.5 }}>Đang truy vấn dữ liệu báo cáo bán hàng...</p>
              </div>
            ) : step4Data.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-inbox fs-2 d-block mb-3 opacity-30" />
                <p style={{ margin: 0, fontSize: 13.5 }}>Không tìm thấy dữ liệu xuất bán hàng nào phát sinh trong kỳ</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "'Roboto Condensed', sans-serif" }}>
                <thead>
                  <tr style={{ background: "color-mix(in srgb, var(--muted) 25%, transparent)", textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 11, letterSpacing: "0.03em", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 8px", textAlign: "center", width: 50 }}>STT</th>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>Tên hàng hoá</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", width: 120 }}>Đơn vị tính</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", width: 120 }}>Số lượng</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", width: 150 }}>Đơn giá</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", width: 180 }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {step4Data.map((l, idx) => (
                    <tr 
                      key={l.id} 
                      style={{ 
                        background: idx % 2 === 1 ? "rgba(0,48,135,0.015)" : "transparent",
                        borderBottom: "1px solid var(--border)"
                      }}
                    >
                      <td style={{ padding: "8px 8px", textAlign: "center", color: "var(--muted-foreground)" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--foreground)", fontWeight: 700 }}>
                        <div>{l.tenHang}</div>
                        {l.maSku && (
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace", marginTop: 2 }}>
                            {l.maSku}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "var(--muted-foreground)" }}>
                        {l.donVi ?? "—"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 500 }}>
                        {fmtN(l.soLuong)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--muted-foreground)" }}>
                        {fmtAmount(l.donGia)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--foreground)" }}>
                        {fmtAmount(l.thanhTien)}
                      </td>
                    </tr>
                  ))}
                  {/* Summary row */}
                  <tr style={{ background: "color-mix(in srgb, var(--muted) 20%, transparent)", fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                    <td colSpan={3} style={{ padding: "10px 12px", textAlign: "center", textTransform: "uppercase" }}>Tổng cộng</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {fmtN(step4Data.reduce((acc, row) => acc + row.soLuong, 0))}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted-foreground)" }}>—</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#003087", fontSize: 13.5 }}>
                      {fmtAmount(step4Data.reduce((acc, row) => acc + row.thanhTien, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    }

    return (
      <div 
        className="animate__animated animate__fadeIn d-flex flex-column align-items-center justify-content-center border rounded-4 border-dashed bg-card"
        style={{ height: "400px", padding: "40px", textAlign: "center", margin: "20px auto", maxWidth: "800px" }}
      >
        <div 
          style={{ 
            width: 60, 
            height: 60, 
            borderRadius: 16, 
            background: "rgba(0, 48, 135, 0.08)", 
            color: "#003087", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            marginBottom: "16px"
          }}
        >
          <i className={`bi ${activeStep.icon} fs-3`} />
        </div>
        <h4 className="fw-bold text-dark mb-2">{activeStep.title}</h4>
        <p className="text-muted mb-0" style={{ maxWidth: "450px", fontSize: "13.5px" }}>
          Nội dung chi tiết cho phần <strong>{activeStep.desc.toLowerCase()}</strong> đang được thiết kế...
        </p>
      </div>
    );
  };

  const dateRange = useMemo(() => {
    let from = "";
    let to = "";
    if (tuyChonKy) {
      from = customFrom;
      to = customTo;
    } else {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      from = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-01`;
      to = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    }
    return { from, to };
  }, [tuyChonKy, customFrom, customTo, selectedYear, selectedMonth]);

  const step3DateRange = useMemo(() => {
    let from = "";
    let to = "";
    if (step3TuyChonKy) {
      from = step3CustomFrom;
      to = step3CustomTo;
    } else {
      const year = parseInt(step3Year);
      const month = parseInt(step3Month);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      from = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-01`;
      to = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    }
    return { from, to };
  }, [step3TuyChonKy, step3CustomFrom, step3CustomTo, step3Year, step3Month]);

  const step3WarehouseName = warehouses.find(w => w.id === step3WarehouseId)?.name ?? "Tất cả các kho";

  const step3Doc = (
    <div id="bk-audit-print-doc" className="pdf-content-page" style={{ fontFamily: "'Roboto Condensed','Arial Narrow',Arial,sans-serif", fontSize: 13, color: "#000", lineHeight: 1.4 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: "65%" }}>
          {company?.logoUrl
            ? <img src={company.logoUrl} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }} />
            : <div style={{ width: 56, height: 56, border: "1px solid #ccc", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#999" }}>LOGO</div>
          }
          <div style={{ fontSize: 11 }}>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", lineHeight: 1.3 }}>{company?.name ?? "—"}</p>
            {company?.address && <p style={{ margin: "0 0 1px" }}>Địa chỉ: {company.address}</p>}
            <p style={{ margin: 0 }}>SĐT: {company?.phone ?? "—"}{company?.email ? ` - Email: ${company.email}` : ""}</p>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, flexShrink: 0 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Mẫu báo cáo kiểm kê</p>
          <p style={{ margin: 0, fontStyle: "italic" }}>Lưu hành nội bộ</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={{ textAlign: "center", margin: "10px 0 6px" }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 18, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Báo cáo danh sách phiếu kiểm kho
        </p>
        <p style={{ margin: "3px 0 0", fontStyle: "italic", fontSize: 12 }}>
          Từ ngày {fmtDate(step3DateRange.from)} đến ngày {fmtDate(step3DateRange.to)}
        </p>
        <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: 12 }}>
          Kho hàng: {step3WarehouseName}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, textAlign: "right" }}>Tiền tệ: VND</p>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 8 }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={thCss(40)}>STT</th>
            <th style={thCss(140)}>Số chứng từ</th>
            <th style={thCss(90)}>Ngày kiểm</th>
            <th style={thCss(130)}>Người kiểm</th>
            <th style={thCss(90)}>Đã kiểm</th>
            <th style={thCss(110)}>Trạng thái</th>
            <th style={thCss()}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {filteredStep3Data.length === 0 ? (
            <tr><td colSpan={7} style={{ border: B1, padding: 20, textAlign: "center", color: "#94a3b8" }}>Không có dữ liệu kiểm kho</td></tr>
          ) : filteredStep3Data.map((l, i) => {
            const statusMeta = STATUS_META[l.trangThai] ?? { label: l.trangThai, color: "#000", bg: "#ccc" };
            return (
              <tr key={i} style={{ background: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
                <td style={tdCss("center")}>{i + 1}</td>
                <td style={tdCss("center")}><span style={{ fontWeight: 700 }}>{l.soChungTu ?? "—"}</span></td>
                <td style={tdCss("center")}>{fmtDate(l.ngayKiem)}</td>
                <td style={tdCss()}>{l.nguoiKiem ?? "—"}</td>
                <td style={tdCss("center")}>{l.daKiemCount ?? 0} | {l.soLuongDong} mặt hàng</td>
                <td style={tdCss("center")}>{statusMeta.label}</td>
                <td style={tdCss()}>{l.ghiChu ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Ký tên */}
      <p style={{ textAlign: "right", fontStyle: "italic", fontSize: 12, margin: "16px 0 12px" }}>
        Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
      </p>
      <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        {["Người lập biểu", "Kế toán trưởng", "Giám đốc"].map(r => (
          <div key={r} style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{r}</p>
            <p style={{ margin: "1px 0 56px", fontSize: 11, fontStyle: "italic", color: "#555" }}>(Ký, họ tên)</p>
          </div>
        ))}
      </div>
    </div>
  );

  const step4DateRange = useMemo(() => {
    let from = "";
    let to = "";
    if (step4TuyChonKy) {
      from = step4CustomFrom;
      to = step4CustomTo;
    } else {
      const year = parseInt(step4Year);
      const month = parseInt(step4Month);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      from = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-01`;
      to = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    }
    return { from, to };
  }, [step4TuyChonKy, step4CustomFrom, step4CustomTo, step4Year, step4Month]);

  const step4WarehouseName = warehouses.find(w => w.id === step4WarehouseId)?.name ?? "Tất cả các kho";

  const step4Doc = (
    <div id="bk-sales-print-doc" className="pdf-content-page" style={{ fontFamily: "'Roboto Condensed','Arial Narrow',Arial,sans-serif", fontSize: 13, color: "#000", lineHeight: 1.4 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: "65%" }}>
          {company?.logoUrl
            ? <img src={company.logoUrl} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }} />
            : <div style={{ width: 56, height: 56, border: "1px solid #ccc", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#999" }}>LOGO</div>
          }
          <div style={{ fontSize: 11 }}>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", lineHeight: 1.3 }}>{company?.name ?? "—"}</p>
            {company?.address && <p style={{ margin: "0 0 1px" }}>Địa chỉ: {company.address}</p>}
            <p style={{ margin: 0 }}>SĐT: {company?.phone ?? "—"}{company?.email ? ` - Email: ${company.email}` : ""}</p>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, flexShrink: 0 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Mẫu báo cáo bán hàng</p>
          <p style={{ margin: 0, fontStyle: "italic" }}>Lưu hành nội bộ</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={{ textAlign: "center", margin: "10px 0 6px" }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 18, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Báo cáo tổng hợp bán hàng theo mặt hàng
        </p>
        <p style={{ margin: "3px 0 0", fontStyle: "italic", fontSize: 12 }}>
          Từ ngày {fmtDate(step4DateRange.from)} đến ngày {fmtDate(step4DateRange.to)}
        </p>
        <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: 12 }}>
          Kho hàng: {step4WarehouseName}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, textAlign: "right" }}>Tiền tệ: VND</p>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 8 }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={thCss(40)}>STT</th>
            <th style={thCss(90)}>Mã SKU</th>
            <th style={thCss()}>Tên hàng hoá</th>
            <th style={thCss(80)}>ĐVT</th>
            <th style={thCss(100)}>Số lượng</th>
            <th style={thCss(120)}>Đơn giá</th>
            <th style={thCss(140)}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {step4Data.length === 0 ? (
            <tr><td colSpan={7} style={{ border: B1, padding: 20, textAlign: "center", color: "#94a3b8" }}>Không có dữ liệu bán hàng</td></tr>
          ) : step4Data.map((l, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
              <td style={tdCss("center")}>{i + 1}</td>
              <td style={tdCss("center")}><span style={{ fontFamily: "monospace", fontSize: 11 }}>{l.maSku ?? "—"}</span></td>
              <td style={tdCss()}><span style={{ fontWeight: 700 }}>{l.tenHang}</span></td>
              <td style={tdCss("center")}>{l.donVi ?? "—"}</td>
              <td style={tdCss("right")}>{fmtN(l.soLuong)}</td>
              <td style={tdCss("right")}>{fmtAmount(l.donGia)}</td>
              <td style={tdCss("right")}><span style={{ fontWeight: 700 }}>{fmtAmount(l.thanhTien)}</span></td>
            </tr>
          ))}
          {/* Summary Row */}
          {step4Data.length > 0 && (
            <tr style={{ fontWeight: 700, background: "#e2e8f0" }}>
              <td colSpan={4} style={{ border: B1, padding: "5px", textAlign: "center" }}>TỔNG CỘNG</td>
              <td style={tdCss("right")}>{fmtN(step4Data.reduce((s, row) => s + row.soLuong, 0))}</td>
              <td style={tdCss("right")}>—</td>
              <td style={tdCss("right")}>{fmtAmount(step4Data.reduce((s, row) => s + row.thanhTien, 0))}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Ký tên */}
      <p style={{ textAlign: "right", fontStyle: "italic", fontSize: 12, margin: "16px 0 12px" }}>
        Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
      </p>
      <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        {["Người lập biểu", "Kế toán trưởng", "Giám đốc"].map(r => (
          <div key={r} style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{r}</p>
            <p style={{ margin: "1px 0 56px", fontSize: 11, fontStyle: "italic", color: "#555" }}>(Ký, họ tên)</p>
          </div>
        ))}
      </div>
    </div>
  );

  const step2DateRange = useMemo(() => {
    let from = "";
    let to = "";
    if (step2TuyChonKy) {
      from = step2CustomFrom;
      to = step2CustomTo;
    } else {
      const year = parseInt(step2Year);
      const month = parseInt(step2Month);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      from = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-01`;
      to = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    }
    return { from, to };
  }, [step2TuyChonKy, step2CustomFrom, step2CustomTo, step2Year, step2Month]);

  const tot = useMemo(() => ({
    tonDauSL:  filteredXntLines.reduce((s, l) => s + l.tonDauSL,  0),
    tonDauTT:  filteredXntLines.reduce((s, l) => s + l.tonDauTT,  0),
    nhapSL:    filteredXntLines.reduce((s, l) => s + l.nhapSL,    0),
    nhapTT:    filteredXntLines.reduce((s, l) => s + l.nhapTT,    0),
    xuatSL:    filteredXntLines.reduce((s, l) => s + l.xuatSL,    0),
    xuatTT:    filteredXntLines.reduce((s, l) => s + l.xuatTT,    0),
    tonCuoiSL: filteredXntLines.reduce((s, l) => s + l.tonCuoiSL, 0),
    tonCuoiTT: filteredXntLines.reduce((s, l) => s + l.tonCuoiTT, 0),
  }), [filteredXntLines]);

  const warehouseName = warehouses.find(w => w.id === selectedWarehouseId)?.name ?? "Kho";

  const doc = (
    <div id="bk-xnt-print-doc" className="pdf-content-page" style={{ fontFamily: "'Roboto Condensed','Arial Narrow',Arial,sans-serif", fontSize: 13, color: "#000", lineHeight: 1.4 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: "65%" }}>
          {company?.logoUrl
            ? <img src={company.logoUrl} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }} />
            : <div style={{ width: 56, height: 56, border: "1px solid #ccc", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#999" }}>LOGO</div>
          }
          <div style={{ fontSize: 11 }}>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", lineHeight: 1.3 }}>{company?.name ?? "—"}</p>
            {company?.address && <p style={{ margin: "0 0 1px" }}>Địa chỉ: {company.address}</p>}
            <p style={{ margin: 0 }}>SĐT: {company?.phone ?? "—"}{company?.email ? ` - Email: ${company.email}` : ""}</p>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, flexShrink: 0 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Mẫu số S09-DN</p>
          <p style={{ margin: 0, fontStyle: "italic" }}>(Theo TT 133/2016/TT-BTC)</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={{ textAlign: "center", margin: "10px 0 6px" }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 18, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Bảng kê nhập - xuất - tồn hàng hoá
        </p>
        <p style={{ margin: "3px 0 0", fontStyle: "italic", fontSize: 12 }}>
          Từ ngày {fmtDate(dateRange.from)} đến ngày {fmtDate(dateRange.to)}
        </p>
        <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: 12 }}>
          Kho hàng: {warehouseName}
          {warehouseAddr ? <span style={{ fontWeight: 400 }}> &nbsp;|&nbsp; Địa điểm: {warehouseAddr}</span> : ""}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, textAlign: "right" }}>Tiền tệ: VND</p>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 8 }}>
        <thead>
          <tr>
            <th rowSpan={2} style={thCss(70)}>Mã vật tư</th>
            <th rowSpan={2} style={thCss()}>Sản phẩm</th>
            <th rowSpan={2} style={thCss(38)}>ĐVT</th>
            <th colSpan={2} style={thCss()}>Số dư đầu kỳ</th>
            <th colSpan={2} style={thCss()}>Nhập trong kỳ</th>
            <th colSpan={2} style={thCss()}>Xuất trong kỳ</th>
            <th colSpan={2} style={thCss()}>Tồn cuối kỳ</th>
          </tr>
          <tr>
            {["Số lượng","Thành tiền","Số lượng","Thành tiền","Số lượng","Thành tiền","Số lượng","Thành tiền"].map((h, i) => (
              <th key={i} style={thCss(72)}>{h}</th>
            ))}
          </tr>
          <tr style={{ fontStyle: "italic" }}>
            {["A","B","C","(1)","(2)","(3)","(4)","(5)","(6)","(7)","(8)"].map(c => (
              <td key={c} style={{ border: B1, padding: "3px", textAlign: "center", fontSize: 11 }}>{c}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredXntLines.length === 0 ? (
            <tr><td colSpan={11} style={{ border: B1, padding: 20, textAlign: "center", color: "#94a3b8" }}>Không có dữ liệu trong kỳ</td></tr>
          ) : filteredXntLines.map((l, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
              <td style={tdCss("center")}>{l.maSku ?? ""}</td>
              <td style={tdCss()}><span style={{ fontWeight: 600 }}>{l.tenHang}</span></td>
              <td style={tdCss("center")}>{l.donVi ?? "—"}</td>
              <td style={tdCss("right")}>{fmtN(l.tonDauSL)}</td>
              <td style={tdCss("right")}>{fmtAmount(l.tonDauTT)}</td>
              <td style={tdCss("right")}>{fmtN(l.nhapSL)}</td>
              <td style={tdCss("right")}>{fmtAmount(l.nhapTT)}</td>
              <td style={tdCss("right")}>{fmtN(l.xuatSL)}</td>
              <td style={tdCss("right")}>{fmtAmount(l.xuatTT)}</td>
              <td style={tdCss("right")}><b>{fmtN(l.tonCuoiSL)}</b></td>
              <td style={tdCss("right")}><b>{fmtAmount(l.tonCuoiTT)}</b></td>
            </tr>
          ))}
          {/* Tổng cộng */}
          <tr style={{ fontWeight: 700, background: "#f1f5f9" }}>
            <td colSpan={3} style={{ border: B1, padding: "5px", textAlign: "center" }}>Tổng cộng</td>
            <td style={tdCss("right")}>{fmtN(tot.tonDauSL)}</td>
            <td style={tdCss("right")}>{fmtAmount(tot.tonDauTT)}</td>
            <td style={tdCss("right")}>{fmtN(tot.nhapSL)}</td>
            <td style={tdCss("right")}>{fmtAmount(tot.nhapTT)}</td>
            <td style={tdCss("right")}>{fmtN(tot.xuatSL)}</td>
            <td style={tdCss("right")}>{fmtAmount(tot.xuatTT)}</td>
            <td style={tdCss("right")}>{fmtN(tot.tonCuoiSL)}</td>
            <td style={tdCss("right")}>{fmtAmount(tot.tonCuoiTT)}</td>
          </tr>
        </tbody>
      </table>

      {/* Ghi chú */}
      <p style={{ fontSize: 11, fontStyle: "italic", color: "#64748b", margin: "4px 0" }}>
        * Thành tiền = Số lượng × Đơn giá nhập kho
      </p>

      {/* Ký tên */}
      <p style={{ textAlign: "right", fontStyle: "italic", fontSize: 12, margin: "16px 0 12px" }}>
        Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
      </p>
      <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        {["Người lập biểu", "Kế toán trưởng", "Giám đốc"].map(r => (
          <div key={r} style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{r}</p>
            <p style={{ margin: "1px 0 56px", fontSize: 11, fontStyle: "italic", color: "#555" }}>(Ký, họ tên)</p>
          </div>
        ))}
      </div>
    </div>
  );

  const printActions = (
    <button
      onClick={() => printDocumentById("bk-xnt-print-doc", "landscape", `Bảng kê XNT - ${warehouseName}`)}
      style={{ padding: "8px 22px", border: "none", background: "#003087", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
    >
      <i className="bi bi-printer" /> In báo cáo
    </button>
  );

  return (
    <div className="d-flex flex-column h-100" style={{ background: "transparent", color: "var(--foreground)", minHeight: 0 }}>
      {/* Stepper block */}
      <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <ModernStepper steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} paddingY={12} paddingX={16} />
      </div>

      {/* Content Area */}
      <div className="flex-grow-1 d-flex flex-column" style={{ padding: 0, minHeight: 0, overflow: "hidden" }}>
        {renderContent()}
      </div>

      {showPrintModal && (
        <PrintPreviewModal
          title="Bảng kê Xuất - Nhập - Tồn"
          subtitle={<>Kho: <strong style={{ color: "#fcd34d" }}>{warehouseName}</strong></>}
          actions={printActions}
          document={doc}
          onClose={() => setShowPrintModal(false)}
          documentId="bk-xnt-print-doc"
          printOrientation="landscape"
        />
      )}

      {showTheKhoModal && (
        <TheKhoModal
          inventoryItemId={selectedItemId}
          warehouseId={selectedWarehouseId}
          warehouseName={warehouseName}
          initFrom={step2DateRange.from}
          initTo={step2DateRange.to}
          onClose={() => setShowTheKhoModal(false)}
        />
      )}

      {showStep3PrintModal && (
        <PrintPreviewModal
          title="Báo cáo danh sách phiếu kiểm kho"
          subtitle={<>Kho: <strong style={{ color: "#fcd34d" }}>{step3WarehouseName}</strong></>}
          actions={
            <button
              onClick={() => printDocumentById("bk-audit-print-doc", "landscape", `Báo cáo kiểm kho - ${step3WarehouseName}`)}
              style={{ padding: "8px 22px", border: "none", background: "#003087", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
            >
              <i className="bi bi-printer" /> In báo cáo
            </button>
          }
          document={step3Doc}
          onClose={() => setShowStep3PrintModal(false)}
          documentId="bk-audit-print-doc"
          printOrientation="landscape"
        />
      )}

      {showStep4PrintModal && (
        <PrintPreviewModal
          title="Báo cáo tổng hợp bán hàng"
          subtitle={<>Kho: <strong style={{ color: "#fcd34d" }}>{step4WarehouseName}</strong></>}
          actions={
            <button
              onClick={() => printDocumentById("bk-sales-print-doc", "landscape", `Báo cáo bán hàng - ${step4WarehouseName}`)}
              style={{ padding: "8px 22px", border: "none", background: "#003087", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
            >
              <i className="bi bi-printer" /> In báo cáo
            </button>
          }
          document={step4Doc}
          onClose={() => setShowStep4PrintModal(false)}
          documentId="bk-sales-print-doc"
          printOrientation="landscape"
        />
      )}

      {selectedStockCountId && (
        <StockCountDetailsOffcanvas
          stockCountId={selectedStockCountId}
          onClose={() => setSelectedStockCountId(null)}
        />
      )}
    </div>
  );
}
