"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TableColumn } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { TaoYeuCauMuaHangModal } from "@/components/plan-finance/mua_hang/TaoYeuCauMuaHangModal";
import TaoDonMuaHangModal from "@/components/plan-finance/mua_hang/TaoDonMuaHangModal";
import XemTruocDonMuaHangModal from "@/components/plan-finance/mua_hang/XemTruocDonMuaHangModal";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const STEP_ITEMS: ModernStepItem[] = [
  { num: 1, id: "requests", title: "Yêu cầu mua hàng", desc: "Khởi tạo & duyệt nhu cầu", icon: "bi-file-earmark-plus" },
  { num: 2, id: "orders", title: "Đơn hàng", desc: "Đặt hàng & giao nhận", icon: "bi-cart-check" },
  { num: 3, id: "cancelled", title: "Đã huỷ bỏ", desc: "Các yêu cầu & đơn đã huỷ", icon: "bi-x-circle" }
];

const REQ_STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Đang báo giá", value: "dang-bao-gia" },
  { label: "Đã ký hợp đồng", value: "da-ky-hop-dong" },
  { label: "Chưa xử lý", value: "chua-xu-ly" },
  { label: "Đã xử lý", value: "da-xu-ly" },
  { label: "Từ chối", value: "tu-choi" },
  { label: "Huỷ bỏ", value: "huy-bo" }
];

const ORD_STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Đang tạo đơn", value: "draft" },
  { label: "Đã đặt hàng", value: "ordered" },
  { label: "Đã nhận hàng", value: "received" },
  { label: "Đang khiếu nại", value: "disputed" },
  { label: "Hoàn thành", value: "completed" },
  { label: "Tạm dừng", value: "paused" },
  { label: "Huỷ bỏ", value: "cancelled" }
];

const DATE_OPTIONS = [
  { label: "Tất cả thời gian", value: "" },
  { label: "Hôm nay", value: "today" },
  { label: "Hôm qua", value: "yesterday" },
  { label: "Tuần này", value: "this-week" },
  { label: "Tuần trước", value: "last-week" },
  { label: "Tháng này", value: "this-month" },
  { label: "Tháng trước", value: "last-month" },
  { label: "Quý này", value: "this-quarter" },
  { label: "Quý trước", value: "last-quarter" },
  { label: "Năm nay", value: "this-year" },
  { label: "Năm trước", value: "last-year" }
];

const REQ_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "dang-bao-gia": { label: "Đang báo giá", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  "da-ky-hop-dong": { label: "Đã ký hợp đồng", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  "da-xu-ly": { label: "Đã xử lý", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "tu-choi": { label: "Từ chối", color: "#f43f5e", bg: "rgba(244,63,94,0.1)" },
  "huy-bo": { label: "Huỷ bỏ", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  "chua-xu-ly": { label: "Chưa xử lý", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "dang-xu-ly": { label: "Đang xử lý", color: "#6366f1", bg: "rgba(99,102,241,0.1)" }
};

const ORD_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "draft":     { label: "Đang tạo đơn",   color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  "ordered":   { label: "Đã đặt hàng",    color: "#6366f1", bg: "rgba(99,102,241,0.1)"  },
  "received":  { label: "Đã nhận hàng",   color: "#0284c7", bg: "rgba(2,132,199,0.1)"   },
  "disputed":  { label: "Đang khiếu nại", color: "#f43f5e", bg: "rgba(244,63,94,0.1)"   },
  "completed": { label: "Hoàn thành",     color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  "paused":    { label: "Tạm dừng",       color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  "cancelled": { label: "Huỷ bỏ",         color: "#64748b", bg: "rgba(100,116,139,0.1)" },
};

// Helper to calculate date ranges based on options
const getDateRange = (option: string): { start: string; end: string } => {
  const now = new Date();
  
  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  switch (option) {
    case "today": {
      return { start: formatDate(now), end: formatDate(now) };
    }
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return { start: formatDate(yesterday), end: formatDate(yesterday) };
    }
    case "this-week": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: formatDate(monday), end: formatDate(sunday) };
    }
    case "last-week": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7; // Last Monday
      const lastMonday = new Date(now.setDate(diff));
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return { start: formatDate(lastMonday), end: formatDate(lastSunday) };
    }
    case "this-month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatDate(startOfMonth), end: formatDate(endOfMonth) };
    }
    case "last-month": {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatDate(startOfLastMonth), end: formatDate(endOfLastMonth) };
    }
    case "this-quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      return { start: formatDate(startOfQuarter), end: formatDate(endOfQuarter) };
    }
    case "last-quarter": {
      const quarter = Math.floor(now.getMonth() / 3) - 1;
      const startOfLastQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      const endOfLastQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      return { start: formatDate(startOfLastQuarter), end: formatDate(endOfLastQuarter) };
    }
    case "this-year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      return { start: formatDate(startOfYear), end: formatDate(endOfYear) };
    }
    case "last-year": {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      return { start: formatDate(startOfLastYear), end: formatDate(endOfLastYear) };
    }
    default:
      return { start: "", end: "" };
  }
};

export default function PurchasePage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reqTotal, setReqTotal] = useState<number>(0);
  const [reqPage, setReqPage] = useState<number>(1);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [createOrderData, setCreateOrderData] = useState<{
    reqId: string;
    reqCode: string | null;
    items: any[];
  } | null>(null);

  // Order states (Step 2)
  const [orders, setOrders] = useState<any[]>([]);
  const [ordTotal, setOrdTotal] = useState<number>(0);
  const [ordPage, setOrdPage] = useState<number>(1);
  const [ordLoading, setOrdLoading] = useState<boolean>(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [ordStatus, setOrdStatus] = useState<string>("");
  const [ordSearch, setOrdSearch] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [editOrderData, setEditOrderData] = useState<{
    orderId: string;
    orderCode: string | null;
    supplierId: string | null;
    ngayNhan: string | null;
    ghiChu: string | null;
    items: any[];
  } | null>(null);

  const [printOrderData, setPrintOrderData] = useState<{
    orderId: string;
    orderCode: string | null;
    supplierId: string;
    supplierName: string;
    items: any[];
    assignments: any[];
  } | null>(null);

  const handleBulkPurchase = async () => {
    if (selectedReqIds.length === 0) return;
    setLoading(true);
    try {
      const details = await Promise.all(
        selectedReqIds.map(id =>
          fetch(`/api/plan-finance/purchase-requests/${id}`).then(r => {
            if (!r.ok) throw new Error();
            return r.json();
          })
        )
      );
      
      const allItems = details.flatMap(d => d.items);
      const combinedReqId = selectedReqIds.join(",");
      const combinedReqCode = details.map(d => d.code || d.id).join(", ");
      
      setCreateOrderData({
        reqId: combinedReqId,
        reqCode: combinedReqCode,
        items: allItems,
      });
      setSelectedReqIds([]);
    } catch (err) {
      alert("Lỗi khi tải thông tin các phiếu yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  const activeStepData = STEP_ITEMS.find((item) => item.num === currentStep) || STEP_ITEMS[0];

  // Filter states
  const [reqStatus, setReqStatus] = useState<string>("");
  const [reqDonVi, setReqDonVi] = useState<string>("");
  const [reqSearch, setReqSearch] = useState<string>("");
  const [timeOption, setTimeOption] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);
  const [donViOptions, setDonViOptions] = useState<{ label: string; value: string }[]>([]);

  // Modal open state
  const [taoYeuCauOpen, setTaoYeuCauOpen] = useState<boolean>(false);

  // Fetch unique donVi from database for the department select filter
  useEffect(() => {
    fetch("/api/plan-finance/purchase-requests?page=1&limit=200")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.items) {
          const unique = Array.from(new Set(d.items.map((r: any) => r.donVi)))
            .filter(Boolean)
            .sort() as string[];
          setDonViOptions([
            { label: "Tất cả các bộ phận", value: "" },
            ...unique.map((v) => ({ label: v, value: v }))
          ]);
        }
      })
      .catch(() => {});
  }, []);

  // Update date inputs automatically when preset is selected
  useEffect(() => {
    if (!isCustomDate) {
      const range = getDateRange(timeOption);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  }, [timeOption, isCustomDate]);

  // Handle switch toggle event
  const handleToggleCustomDate = (val: boolean) => {
    setIsCustomDate(val);
    setTimeOption("");
    setStartDate("");
    setEndDate("");
  };



  // Fetch Live Purchase Requests
  const fetchRequests = useCallback((isSilent = false) => {
    if (currentStep !== 1) return;
    if (!isSilent) setLoading(true);
    const p = new URLSearchParams();
    if (reqStatus) p.set("status", reqStatus);
    if (reqDonVi) p.set("donVi", reqDonVi);
    if (reqSearch) p.set("search", reqSearch);
    p.set("page", String(reqPage));

    fetch(`/api/plan-finance/purchase-requests?${p}`)
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.items ?? []);
        setReqTotal(d.total ?? 0);
      })
      .catch(() => {
        setRequests([]);
        setReqTotal(0);
      })
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  }, [currentStep, reqStatus, reqDonVi, reqSearch, reqPage]);

  // Load requests on filters change
  useEffect(() => {
    fetchRequests(false);
  }, [fetchRequests]);

  // Reset page when filters change
  useEffect(() => {
    setReqPage(1);
  }, [reqStatus, reqDonVi, reqSearch]);

  // Fetch Live Purchase Orders
  const fetchOrders = useCallback((isSilent = false) => {
    if (currentStep !== 2) return;
    if (!isSilent) setOrdLoading(true);
    const p = new URLSearchParams();
    if (ordStatus) p.set("trangThai", ordStatus);
    if (ordSearch) p.set("search", ordSearch);
    p.set("page", String(ordPage));

    fetch(`/api/plan-finance/purchasing?${p}`)
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.items ?? []);
        setOrdTotal(d.total ?? 0);
      })
      .catch(() => {
        setOrders([]);
        setOrdTotal(0);
      })
      .finally(() => {
        if (!isSilent) setOrdLoading(false);
      });
  }, [currentStep, ordStatus, ordSearch, ordPage]);

  // Load orders on filters/step change
  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  // Reset page when order filters change
  useEffect(() => {
    setOrdPage(1);
  }, [ordStatus, ordSearch]);

  // Background polling & Window focus updates to auto-refresh state
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep === 1) fetchRequests(true);
      if (currentStep === 2) fetchOrders(true);
    }, 10000); // 10s silent poll
    return () => clearInterval(interval);
  }, [currentStep, fetchRequests, fetchOrders]);

  useEffect(() => {
    const handleFocus = () => {
      if (currentStep === 1) fetchRequests(true);
      if (currentStep === 2) fetchOrders(true);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [currentStep, fetchRequests, fetchOrders]);

  // Client-side date filter logic
  const filteredRequests = requests.filter((r) => {
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      if (new Date(r.ngayTao) < sDate) return false;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      if (new Date(r.ngayTao) > eDate) return false;
    }
    return true;
  });

  // Table Column Definitions
  const columns: TableColumn<any>[] = [
    {
      header: (
        <input
          type="checkbox"
          className="form-check-input"
          checked={filteredRequests.length > 0 && selectedReqIds.length === filteredRequests.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedReqIds(filteredRequests.map((r) => r.id));
            } else {
              setSelectedReqIds([]);
            }
          }}
        />
      ),
      render: (r) => (
        <input
          type="checkbox"
          className="form-check-input shadow-none"
          checked={selectedReqIds.includes(r.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedReqIds((prev) => [...prev, r.id]);
            } else {
              setSelectedReqIds((prev) => prev.filter((id) => id !== r.id));
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: "50px",
      align: "center"
    },
    {
      header: "Mã yêu cầu",
      render: (r) => (
        <div>
          <span style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--primary)" }}>{r.code || "—"}</span>
          <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>
            {r.donVi}{r.nguoiYeuCau ? ` | ${r.nguoiYeuCau}` : ""}
          </div>
        </div>
      )
    },
    {
      header: "Số mặt hàng",
      align: "center",
      render: (r) => <span style={{ fontWeight: 600 }}>{r.soMatHang} mục</span>,
      width: "140px"
    },
    {
      header: "Lý do",
      render: (r) => <span style={{ color: "var(--muted-foreground)" }}>{r.lyDo || "—"}</span>
    },
    {
      header: "Trạng thái",
      align: "center",
      render: (r) => {
        const s = REQ_STATUS[r.trangThai] ?? { label: r.trangThai, color: "var(--muted-foreground)", bg: "var(--muted)" };
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: s.color,
              background: s.bg
            }}
          >
            {s.label}
          </span>
        );
      },
      width: "150px"
    }
  ];

  const handleAddNewOrder = () => {
    setCurrentStep(1);
  };

  const orderColumns: TableColumn<any>[] = [
    {
      header: (
        <input
          type="checkbox"
          className="form-check-input shadow-none cursor-pointer"
          checked={orders.length > 0 && selectedOrderIds.size === orders.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedOrderIds(new Set(orders.map((o) => o.id)));
            } else {
              setSelectedOrderIds(new Set());
            }
          }}
        />
      ),
      render: (o) => (
        <input
          type="checkbox"
          className="form-check-input shadow-none cursor-pointer"
          checked={selectedOrderIds.has(o.id)}
          onChange={(e) => {
            const checked = e.target.checked;
            setSelectedOrderIds((prev) => {
              const next = new Set(prev);
              if (checked) {
                next.add(o.id);
              } else {
                next.delete(o.id);
              }
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: "50px",
      align: "center"
    },
    {
      header: "Mã đơn hàng",
      render: (o) => (
        <div>
          <span className="fw-bold text-primary cursor-pointer hover-underline">
            {o.code || "—"}
          </span>
        </div>
      ),
      width: "160px"
    },
    {
      header: "Khách hàng",
      render: (o) => <span className="text-dark fw-semibold">{o.supplier?.name ?? "—"}</span>
    },
    {
      header: "Ngày tạo đơn",
      render: (o) => <span className="text-muted">{o.ngayDat ? new Date(o.ngayDat).toLocaleDateString("vi-VN") : new Date(o.createdAt).toLocaleDateString("vi-VN")}</span>,
      width: "140px"
    },
    {
      header: "Ngày giao hàng",
      render: (o) => <span className="text-muted">{o.ngayNhan ? new Date(o.ngayNhan).toLocaleDateString("vi-VN") : "—"}</span>,
      width: "140px"
    },
    {
      header: "Trạng thái",
      align: "center",
      render: (o) => {
        const s = ORD_STATUS[o.trangThai] ?? { label: o.trangThai, color: "var(--muted-foreground)", bg: "var(--muted)" };
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: s.color,
              background: s.bg,
              whiteSpace: "nowrap"
            }}
          >
            {s.label}
          </span>
        );
      },
      width: "140px"
    },
    {
      header: "Giá trị (đ)",
      align: "right",
      render: (o) => <span className="fw-bold text-dark">{o.tongTien.toLocaleString("vi-VN")}</span>,
      width: "180px"
    }
  ];

  // Dynamic Toolbar based on current step
  const toolbar = currentStep === 1 ? (
    <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
      <div className="d-flex align-items-center gap-2 flex-grow-1">
        <FilterSelect
          placeholder=""
          options={REQ_STATUS_OPTIONS}
          value={reqStatus}
          onChange={setReqStatus}
          width={150}
        />
        
        <FilterSelect
          placeholder=""
          options={donViOptions}
          value={reqDonVi}
          onChange={setReqDonVi}
          width={180}
        />

        {/* Conditional rendering of Preset Time vs Custom Range inputs */}
        {!isCustomDate ? (
          <FilterSelect
            placeholder="Chọn thời gian"
            options={DATE_OPTIONS}
            value={timeOption}
            onChange={setTimeOption}
            width={150}
          />
        ) : (
          <div className="d-flex align-items-center gap-2 bg-white px-2 rounded shadow-sm border" style={{ height: 32, fontSize: "12px" }}>
            <i className="bi bi-calendar3 text-primary opacity-75 ms-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-0 bg-transparent text-dark fw-semibold"
              style={{ outline: "none", fontSize: 11.5, width: 110 }}
            />
            <span className="text-muted small">đến</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-0 bg-transparent text-dark fw-semibold"
              style={{ outline: "none", fontSize: 11.5, width: 110 }}
            />
          </div>
        )}

        {/* Custom Date switch toggle */}
        <div className="form-check form-switch d-flex align-items-center gap-2 m-0 px-2" style={{ borderLeft: "1px solid var(--border)", height: 20 }}>
          <input
            className="form-check-input ms-0 shadow-none cursor-pointer"
            type="checkbox"
            id="customDateToggle"
            checked={isCustomDate}
            onChange={(e) => handleToggleCustomDate(e.target.checked)}
            style={{ width: 32, height: 16, cursor: "pointer" }}
          />
          <label className="form-check-label text-muted small fw-bold cursor-pointer" htmlFor="customDateToggle" style={{ userSelect: "none", fontSize: "11px", whiteSpace: "nowrap" }}>
            Tự chọn
          </label>
        </div>

        <div className="flex-grow-1">
          <SearchInput
            placeholder="Tìm kiếm yêu cầu..."
            value={reqSearch}
            onChange={setReqSearch}
          />
        </div>
      </div>

      <div className="d-flex align-items-center gap-2">
        {selectedReqIds.length > 0 && (
          <button
            onClick={handleBulkPurchase}
            className="btn btn-success-custom btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
            style={{ height: 32, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", paddingRight: "8px" }}
          >
            <i className="bi bi-cart-check" />
            Mua hàng
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "#fff",
              color: "#10b981",
              fontSize: "10.5px",
              fontWeight: 800,
              padding: "0 4px",
              lineHeight: 1
            }}>
              {selectedReqIds.length}
            </span>
          </button>
        )}
        <button
          onClick={() => setTaoYeuCauOpen(true)}
          className="btn btn-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
          style={{ height: 32, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}
        >
          <i className="bi bi-plus-lg" />
          Thêm mới
        </button>
      </div>
    </div>
  ) : currentStep === 2 ? (
    <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
      <div className="d-flex align-items-center gap-2 flex-grow-1">
        <FilterSelect
          placeholder=""
          options={ORD_STATUS_OPTIONS}
          value={ordStatus}
          onChange={setOrdStatus}
          width={180}
        />
        <div className="flex-grow-1">
          <SearchInput
            placeholder="Tìm kiếm mã đơn, nhà cung cấp..."
            value={ordSearch}
            onChange={setOrdSearch}
          />
        </div>
      </div>
      <div>
        <button
          onClick={handleAddNewOrder}
          className="btn btn-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
          style={{ height: 32, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}
        >
          <i className="bi bi-plus-lg" />
          Thêm mới
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        height: "100%", 
        background: "var(--background)", 
        overflow: "hidden",
        // Override global theme primary color to dominant #003087 locally for this page
        "--primary": "#003087",
        "--bs-primary": "#003087",
        "--primary-focus": "rgba(0, 48, 135, 0.2)",
      } as React.CSSProperties}
    >
      {/* CSS overrides block to bind primary classes to #003087 */}
      <style>{`
        .ph-icon-box-blue {
          background: rgba(0, 48, 135, 0.1) !important;
          border-color: rgba(0, 48, 135, 0.25) !important;
        }
        .ph-icon-blue {
          color: #003087 !important;
        }
        .btn-primary {
          background-color: #003087 !important;
          border-color: #003087 !important;
        }
        .btn-primary:hover, .btn-primary:focus, .btn-primary:active {
          background-color: #002260 !important;
          border-color: #002260 !important;
          box-shadow: 0 4px 12px rgba(0, 48, 135, 0.2) !important;
        }
        .btn-success-custom {
          background-color: #10b981 !important;
          border-color: #10b981 !important;
          color: #fff !important;
        }
        .btn-success-custom:hover, .btn-success-custom:focus, .btn-success-custom:active {
          background-color: #0d9488 !important;
          border-color: #0d9488 !important;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2) !important;
        }
        .form-check-input:checked {
          background-color: #003087 !important;
          border-color: #003087 !important;
        }
        .text-primary {
          color: #003087 !important;
        }
        .app-tbl-row:hover td {
          background: rgba(0, 48, 135, 0.04) !important;
        }
        /* Make row height even smaller for compact table display */
        .app-responsive-table-wrapper table td {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }
        .app-responsive-table-wrapper table th {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
      `}</style>

      <PageHeader
        title="Mua hàng"
        description="Purchasing · Quản lý nhà cung cấp, đơn mua & báo giá"
        color="blue"
        icon="bi-cart3"
      />

      <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <WorkflowCard
          stepper={
            <ModernStepper
              steps={STEP_ITEMS}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingX={0}
              paddingY={8}
            />
          }
          toolbar={toolbar}
          contentPadding="px-4 pb-4 pt-2"
        >
          {currentStep === 1 ? (
            <div className="d-flex flex-column h-100 justify-content-between" style={{ minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                <Table<any>
                  rows={filteredRequests}
                  columns={columns}
                  loading={loading}
                  rowKey={(r) => r.id}
                  onRowClick={setSelectedReq}
                  emptyIcon="bi-file-earmark-plus"
                  emptyText="Không có yêu cầu mua hàng nào được tìm thấy"
                  compact
                />
              </div>
              
              {reqTotal > 20 && (
                <div className="pt-3 border-top mt-auto flex-shrink-0">
                  <Pagination
                    page={reqPage}
                    totalPages={Math.ceil(reqTotal / 20)}
                    onChange={setReqPage}
                  />
                </div>
              )}
            </div>
          ) : currentStep === 2 ? (
            <div className="d-flex flex-column h-100 justify-content-between" style={{ minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                <Table<any>
                  rows={orders}
                  columns={orderColumns}
                  loading={ordLoading}
                  rowKey={(o) => o.id}
                  onRowClick={setSelectedOrder}
                  emptyIcon="bi-file-earmark-text"
                  emptyText="Chưa có đơn mua hàng nào"
                  compact
                />
              </div>
              {ordTotal > 10 && (
                <div className="pt-3 border-top mt-auto flex-shrink-0">
                  <Pagination
                    page={ordPage}
                    totalPages={Math.ceil(ordTotal / 10)}
                    onChange={setOrdPage}
                  />
                </div>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4rem 2rem",
                  textAlign: "center",
                  minHeight: "300px",
                  height: "100%",
                  background: "var(--card)"
                }}
              >
                {/* Modern Icon Wrapper */}
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "18px",
                    background: "var(--muted)",
                    color: "#003087",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    marginBottom: "1.5rem",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)"
                  }}
                >
                  <i className={`bi ${activeStepData.icon}`} />
                </div>

                {/* Title & Description */}
                <h4 style={{ fontSize: "18px", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.5rem" }}>
                  {activeStepData.title}
                </h4>
                <p style={{ fontSize: "13.5px", color: "var(--muted-foreground)", maxWidth: "420px", lineHeight: "1.6", margin: "0 0 1.5rem 0" }}>
                  Giao diện quản lý quy trình {activeStepData.title.toLowerCase()}. Bạn có thể bắt đầu lập trình các bảng biểu, bộ lọc và các chức năng tương ứng tại đây.
                </p>

                {/* Dotted Placeholder Box */}
                <div
                  style={{
                    background: "var(--muted)",
                    border: "1px dashed var(--border)",
                    borderRadius: "10px",
                    padding: "0.75rem 1.25rem",
                    fontSize: "12.5px",
                    color: "var(--muted-foreground)",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <i className="bi bi-code-slash" style={{ fontSize: "14px", color: "#003087" }} />
                  <span>Nội dung chi tiết của bước này sẽ được thiết kế sau.</span>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </WorkflowCard>
      </div>

      {/* Modal tạo mới yêu cầu mua hàng */}
      {taoYeuCauOpen && (
        <TaoYeuCauMuaHangModal
          onClose={() => setTaoYeuCauOpen(false)}
          onSaved={() => {
            setTaoYeuCauOpen(false);
            fetchRequests();
          }}
        />
      )}

      {/* Offcanvas chi tiết yêu cầu mua hàng */}
      <AnimatePresence>
        {selectedReq && (
          <ReqDetailOffcanvas
            req={selectedReq}
            onClose={() => setSelectedReq(null)}
            onChanged={fetchRequests}
            onCreateOrder={(reqId, reqCode, items) => {
              setSelectedReq(null);
              setCreateOrderData({ reqId, reqCode, items });
            }}
          />
        )}
      </AnimatePresence>

      {/* Offcanvas chi tiết đơn hàng */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailOffcanvas
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onChanged={fetchOrders}
            onEditOrder={(orderId, orderCode, supplierId, ngayNhan, ghiChu, items) => {
              setSelectedOrder(null);
              const mappedItems = items.map((it: any) => ({
                id: it.id,
                tenHang: it.tenHang,
                donVi: it.donVi,
                soLuong: it.soLuong,
                donGiaDK: it.donGia,
                inventoryItemId: it.inventoryItemId,
                inventoryItem: it.inventoryItem ?? null
              }));
              setEditOrderData({
                orderId,
                orderCode,
                supplierId,
                ngayNhan,
                ghiChu,
                items: mappedItems
              });
            }}
            onPrintOrder={(orderId, orderCode, supplierId, supplierName, items) => {
              const mappedItems = items.map((it: any) => ({
                id: it.id,
                tenHang: it.tenHang,
                donVi: it.donVi,
                soLuong: it.soLuong,
                donGiaDK: it.donGia,
                inventoryItemId: it.inventoryItemId,
                inventoryItem: it.inventoryItem ?? null
              }));
              const assignments = items.map((it: any) => ({
                itemId: it.id,
                supplierId: supplierId,
                donGia: it.donGia,
                ngayGiao: it.ngayGiao ? new Date(it.ngayGiao).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                skip: false
              }));
              setPrintOrderData({
                orderId,
                orderCode,
                supplierId,
                supplierName,
                items: mappedItems,
                assignments
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal tạo đơn mua hàng */}
      {createOrderData && (
        <TaoDonMuaHangModal
          reqId={createOrderData.reqId}
          reqCode={createOrderData.reqCode}
          items={createOrderData.items}
          onClose={() => {
            setCreateOrderData(null);
          }}
          onCreated={() => {
            setCreateOrderData(null);
            fetchRequests();
            setCurrentStep(2);
            setOrdPage(1);
            fetchOrders();
          }}
        />
      )}

      {/* Modal cập nhật đơn mua hàng */}
      {editOrderData && (
        <TaoDonMuaHangModal
          editOrderId={editOrderData.orderId}
          reqCode={editOrderData.orderCode}
          editSupplierId={editOrderData.supplierId}
          editNgayNhan={editOrderData.ngayNhan}
          editGhiChu={editOrderData.ghiChu}
          items={editOrderData.items}
          onClose={() => {
            setEditOrderData(null);
          }}
          onCreated={() => {
            setEditOrderData(null);
            fetchOrders();
          }}
        />
      )}

      {/* Modal xem trước để in đơn hàng */}
      {printOrderData && (
        <XemTruocDonMuaHangModal
          supplierId={printOrderData.supplierId}
          supplierName={printOrderData.supplierName}
          assignments={printOrderData.assignments}
          items={printOrderData.items}
          onClose={() => setPrintOrderData(null)}
          onCreated={() => setPrintOrderData(null)}
          isEdit={true}
          editOrderId={printOrderData.orderId}
          editOrderCode={printOrderData.orderCode}
        />
      )}
    </div>
  );
}

// ── Offcanvas chi tiết yêu cầu ────────────────────────────────────────────────
interface ReqDetail {
  id: string; code: string | null;
  nguoiYeuCau: string; donVi: string;
  ngayTao: string; ngayCanCo: string | null;
  lyDo: string | null; trangThai: string;
  items: Array<{
    id: string; tenHang: string; donVi: string | null;
    soLuong: number; donGiaDK: number;
    inventoryItemId: string | null;
    trangThaiXuLy: string;
    supplierId: string | null;
    inventoryItem: { code: string | null; tenHang: string; donVi: string | null; categoryId: string | null; thongSoKyThuat: string | null } | null;
  }>;
}

function ReqDetailOffcanvas({ req, onClose, onChanged, onCreateOrder }: {
  req: any;
  onClose: () => void;
  onChanged?: () => void;
  onCreateOrder?: (reqId: string, reqCode: string | null, items: any[]) => void;
}) {
  const [detail, setDetail] = useState<ReqDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(req.trangThai);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/plan-finance/purchase-requests/${req.id}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [req.id]);

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );

  const totalDK = detail?.items.reduce((s, i) => s + i.soLuong * i.donGiaDK, 0) ?? 0;
  const s = REQ_STATUS[currentStatus] ?? { label: currentStatus, color: "var(--muted-foreground)", bg: "var(--muted)" };

  const handleReject = async () => {
    if (rejecting) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/plan-finance/purchase-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: "tu-choi" }),
      });
      if (res.ok) { 
        setCurrentStatus("tu-choi"); 
        onChanged?.(); 
      }
    } finally { 
      setRejecting(false); 
    }
  };

  const [reactivating, setReactivating] = useState(false);
  const handleReactivate = async () => {
    if (reactivating) return;
    setReactivating(true);
    try {
      const res = await fetch(`/api/plan-finance/purchase-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: "chua-xu-ly" }),
      });
      if (res.ok) { 
        setCurrentStatus("chua-xu-ly"); 
        onChanged?.(); 
      }
    } finally { 
      setReactivating(false); 
    }
  };

  const fmtVnd = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose} 
        style={{ position: "fixed", inset: 0, zIndex: 5100, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }} 
      />

      {/* Panel */}
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 400, zIndex: 5200,
          background: "var(--card)", borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(0, 48, 135, 0.08)", display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-file-earmark-plus" style={{ fontSize: 16, color: "#003087" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>Chi tiết yêu cầu mua hàng</p>
            <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{req.code ?? req.id}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}>
            <i className="bi bi-x" style={{ fontSize: 17 }} />
          </button>
        </div>

        {/* Status bar */}
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)", background: s.bg }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>Trạng thái:</span>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: s.color, background: "rgba(255,255,255,0.6)" }}>
            {s.label}
          </span>
        </div>

        {/* Body — thông tin chung */}
        <div style={{ padding: "8px 20px 0", flexShrink: 0 }}>
          <Row label="Mã yêu cầu" value={<span style={{ fontFamily: "monospace", color: "#003087" }}>{req.code ?? "—"}</span>} />
          <Row label="Đơn vị YC" value={req.donVi} />
          <Row label="Người yêu cầu" value={req.nguoiYeuCau} />
          <Row label="Ngày tạo" value={new Date(req.ngayTao).toLocaleDateString("vi-VN")} />
          <Row label="Ngày cần có" value={req.ngayCanCo ? new Date(req.ngayCanCo).toLocaleDateString("vi-VN") : "—"} />
          <Row label="Lý do" value={<span style={{ maxWidth: 260, textAlign: "right", display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{req.lyDo ?? "—"}</span>} />
        </div>

        {/* Header danh sách + tổng dự kiến */}
        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
              Mặt hàng yêu cầu
              {!loading && detail && (
                <span style={{ fontSize: 11.5, fontWeight: 400, color: "var(--muted-foreground)", marginLeft: 6 }}>
                  {detail.items.length} mục
                </span>
              )}
            </p>
            {!loading && totalDK > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "3px 8px", borderRadius: 6,
                background: "rgba(0, 48, 135, 0.05)",
                border: "1px solid rgba(0, 48, 135, 0.15)",
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)" }}>Tổng dự kiến:</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: "#003087" }}>{fmtVnd(totalDK)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Danh sách mặt hàng — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 50, borderRadius: 8, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : !detail?.items.length ? (
            <div style={{ padding: "20px 16px", background: "var(--muted)", borderRadius: 8, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
              <i className="bi bi-box" style={{ fontSize: 20, display: "block", marginBottom: 6, opacity: 0.4 }} />
              Không có mặt hàng nào
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {detail.items.map((item, idx) => {
                const isDone = item.trangThaiXuLy === "da-tao-don";
                const isSkip = item.trangThaiXuLy === "bo-qua";
                return (
                  <div key={item.id} style={{
                    padding: "6px 10px", borderRadius: 7,
                    border: `1px solid ${isDone ? "rgba(16,185,129,0.35)" : isSkip ? "rgba(148,163,184,0.3)" : "var(--border)"}`,
                    background: isDone ? "rgba(16,185,129,0.05)" : isSkip ? "rgba(148,163,184,0.06)" : "var(--background)",
                    opacity: isSkip ? 0.6 : 1,
                  }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <span style={{
                        minWidth: 20, height: 20, borderRadius: 5,
                        background: isDone ? "rgba(16,185,129,0.15)" : "rgba(0, 48, 135, 0.08)",
                        color: isDone ? "#10b981" : "#003087", fontSize: 10, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>{isDone ? <i className="bi bi-check-lg" /> : idx + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.tenHang}
                        </p>
                      </div>
                      {isDone && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.12)", padding: "2px 7px", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
                          ✓ Đã đặt
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 4, paddingLeft: 27 }}>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        SL: <strong style={{ color: "var(--foreground)" }}>{item.soLuong}</strong>
                        {item.donVi ? ` ${item.donVi}` : ""}
                      </span>
                      {item.donGiaDK > 0 && (
                        <>
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            ĐG: <strong style={{ color: "var(--foreground)" }}>{fmtVnd(item.donGiaDK)}</strong>
                          </span>
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: "auto" }}>
                            = <strong style={{ color: isDone ? "#10b981" : "#003087" }}>{fmtVnd(item.soLuong * item.donGiaDK)}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStatus === "da-xu-ly" || currentStatus === "da-ky-hop-dong" || currentStatus === "huy-bo" ? (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", flexShrink: 0 }}>
            <i className="bi bi-lock-fill" style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
              Phiếu đã ở trạng thái <strong style={{ color: s.color }}>{s.label}</strong> — không thể thao tác thêm.
            </span>
          </div>
        ) : currentStatus === "tu-choi" ? (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <i className="bi bi-x-octagon-fill" style={{ fontSize: 13, color: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Yêu cầu đã <strong style={{ color: s.color }}>bị từ chối</strong>
              </span>
            </div>
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              style={{ flexShrink: 0, padding: "7px 14px", border: "1px solid #10b981", background: "rgba(16,185,129,0.08)", color: "#10b981", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: reactivating ? "not-allowed" : "pointer", opacity: reactivating ? 0.6 : 1, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
            >
              {reactivating
                ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} />Đang xử lý...</>
                : <><i className="bi bi-arrow-counterclockwise" />Kích hoạt lại</>}
            </button>
          </div>
        ) : (
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleReject}
              disabled={rejecting}
              style={{ flex: 1, padding: "8px", border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: rejecting ? "not-allowed" : "pointer", color: "var(--foreground)", opacity: rejecting ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {rejecting
                ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} />Đang xử lý...</>
                : <><i className="bi bi-x-circle" />Từ chối</>}
            </button>
            <button
              onClick={() => detail && onCreateOrder?.(req.id, req.code, detail.items)}
              disabled={loading || !detail}
              style={{ flex: 1, padding: "8px", border: "none", background: "var(--primary)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (loading || !detail) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, opacity: (loading || !detail) ? 0.7 : 1 }}>
              <i className="bi bi-check2-all" />Tạo đơn mua hàng
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ── Offcanvas chi tiết đơn hàng ──────────────────────────────────────────────
interface OrderDetail {
  id: string;
  code: string | null;
  supplierId: string | null;
  purchaseRequestId: string | null;
  ngayDat: string | null;
  ngayNhan: string | null;
  trangThai: string;
  tongTien: number;
  daThanhToan: number;
  ghiChu: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string } | null;
  items: Array<{
    id: string;
    purchaseOrderId: string;
    inventoryItemId: string | null;
    tenHang: string;
    donVi: string | null;
    soLuong: number;
    donGia: number;
    thanhTien: number;
    soLuongDaNhan: number;
    ghiChu: string | null;
    sortOrder: number;
    inventoryItem: {
      id: string;
      code: string | null;
      tenHang: string;
      donVi: string | null;
      giaNhap: number;
    } | null;
  }>;
}

const ACT_TYPES = [
  { key: "call", label: "Gọi điện", icon: "bi-telephone-fill", color: "#10b981" },
  { key: "meeting", label: "Gặp mặt", icon: "bi-people-fill", color: "#6366f1" },
  { key: "email", label: "Gửi email", icon: "bi-envelope-fill", color: "#f59e0b" },
  { key: "message", label: "Nhắn tin", icon: "bi-chat-dots-fill", color: "#3b82f6" },
  { key: "system", label: "Hệ thống", icon: "bi-gear-fill", color: "#6b7280" },
  { key: "create", label: "Khởi tạo", icon: "bi-file-earmark-plus-fill", color: "#10b981" },
  { key: "update", label: "Cập nhật", icon: "bi-pencil-square", color: "#f59e0b" },
];

const MANUAL_ACT_TYPES = [
  { key: "call", label: "Gọi điện", icon: "bi-telephone-fill", color: "#10b981" },
  { key: "meeting", label: "Gặp mặt", icon: "bi-people-fill", color: "#6366f1" },
  { key: "message", label: "Nhắn tin", icon: "bi-chat-dots-fill", color: "#3b82f6" },
  { key: "email", label: "Gửi email", icon: "bi-envelope-fill", color: "#f59e0b" },
];

function OrderDetailOffcanvas({ order, onClose, onChanged, onEditOrder, onPrintOrder }: {
  order: any;
  onClose: () => void;
  onChanged?: () => void;
  onEditOrder?: (orderId: string, orderCode: string | null, supplierId: string | null, ngayNhan: string | null, ghiChu: string | null, items: any[]) => void;
  onPrintOrder?: (orderId: string, orderCode: string | null, supplierId: string, supplierName: string, items: any[]) => void;
}) {
  const { data: session } = useSession();
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  // Modal thêm hoạt động state
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [actType, setActType] = useState("call");
  const [actDate, setActDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [actPerson, setActPerson] = useState("");
  const [actNote, setActNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (session?.user?.name && !actPerson) {
      setActPerson(session.user.name);
    }
  }, [session, actPerson]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const refreshDetailAndActivities = useCallback((isSilent = false) => {
    if (!isSilent) setLoading(true);
    fetch(`/api/plan-finance/purchasing/${order.id}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => {
        if (!isSilent) setLoading(false);
      });

    fetch(`/api/plan-finance/purchasing/${order.id}/activities`)
      .then((r) => r.json())
      .then((d) => setActivities(Array.isArray(d) ? d : []))
      .catch(() => setActivities([]));
  }, [order.id]);

  useEffect(() => {
    refreshDetailAndActivities(false);
  }, [refreshDetailAndActivities]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshDetailAndActivities(true);
    }, 10000); // 10s silent poll
    return () => clearInterval(interval);
  }, [refreshDetailAndActivities]);

  useEffect(() => {
    const handleFocus = () => {
      refreshDetailAndActivities(true);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshDetailAndActivities]);

  // Nút chức năng & Thay đổi trạng thái/Xóa/Sửa
  const [isEditingGhiChu, setIsEditingGhiChu] = useState(false);
  const [editGhiChuVal, setEditGhiChuVal] = useState("");

  const handleUpdateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/plan-finance/purchasing/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail(updated);
        onChanged?.(); // Refresh list table
        refreshDetailAndActivities(true);
      } else {
        const err = await res.json();
        alert("Lỗi cập nhật trạng thái: " + (err.error ?? "Không thể cập nhật"));
      }
    } catch (e) {
      alert("Lỗi kết nối: " + String(e));
    }
  };

  const handleDeleteOrder = async () => {
    setConfirmDeleteOpen(true);
  };

  const handleEditOrder = () => {
    if (order.trangThai === "ordered") return;
    if (detail) {
      onEditOrder?.(order.id, detail.code ?? order.code, detail.supplierId, detail.ngayNhan, detail.ghiChu, detail.items);
    } else {
      onEditOrder?.(order.id, order.code, order.supplierId, order.ngayNhan, order.ghiChu, order.items || []);
    }
  };

  const handlePrintOrder = () => {
    const activeOrder = detail || order;
    if (!activeOrder) return;
    onPrintOrder?.(
      order.id,
      activeOrder.code ?? order.code,
      activeOrder.supplierId ?? "",
      activeOrder.supplier?.name ?? "Nhà cung cấp",
      activeOrder.items ?? []
    );
  };

  const renderLogContent = (text: string) => {
    if (!text) return "";

    // 1. If it's a status change: "Trạng thái đơn hàng thay đổi từ [old] sang [new]"
    if (text.startsWith("Trạng thái đơn hàng thay đổi từ")) {
      const regex = /\[([^\]]+)\]/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        const label = match[1];
        const statusEntry = Object.values(ORD_STATUS).find((s) => s.label === label);
        if (statusEntry) {
          parts.push(
            <span
              key={match.index}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: 700,
                color: statusEntry.color,
                background: statusEntry.bg,
                margin: "0 4px",
                verticalAlign: "middle"
              }}
            >
              {label}
            </span>
          );
        } else {
          parts.push(`[${label}]`);
        }
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      return (
        <div className="d-flex align-items-center gap-1.5 py-1" style={{ fontSize: "12.5px" }}>
          <i className="bi bi-arrow-left-right text-muted me-1" />
          <span>{parts}</span>
        </div>
      );
    }

    // 2. If it's a general update log starting with "Cập nhật đơn hàng"
    if (text.startsWith("Cập nhật đơn hàng") || text.includes("Nhà cung cấp:") || text.includes("Tổng tiền:")) {
      let cleanText = text.replace(/^Cập nhật đơn hàng:?\s*/i, "");
      
      const prefixes = ["Nhà cung cấp:", "Ngày nhận hàng:", "Ghi chú:", "Mặt hàng:", "Tổng tiền:"];
      const found: { prefix: string; index: number }[] = [];
      prefixes.forEach(p => {
        const idx = cleanText.indexOf(p);
        if (idx !== -1) {
          found.push({ prefix: p, index: idx });
        }
      });
      found.sort((a, b) => a.index - b.index);

      let changeLines: string[] = [];
      if (found.length > 0) {
        for (let i = 0; i < found.length; i++) {
          const start = found[i].index;
          const end = i + 1 < found.length ? found[i + 1].index : cleanText.length;
          let part = cleanText.substring(start, end).trim();
          part = part.replace(/[.;\n\r]+$/, "").trim();
          if (part) {
            changeLines.push(part);
          }
        }
      } else {
        changeLines = cleanText.split("\n").map(l => l.trim()).filter(Boolean);
      }

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
          <div className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: "12.5px" }}>
            <i className="bi bi-pencil-square text-warning" />
            <span>Chi tiết thay đổi đơn hàng:</span>
          </div>
          <div style={{
            background: "var(--background)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            {changeLines.map((line, index) => {
              let icon = "bi-dot";
              let iconColor = "#94a3b8";
              let title = "";
              let contentNode: React.ReactNode = null;

              if (line.startsWith("Nhà cung cấp:")) {
                icon = "bi-building";
                iconColor = "#0284c7";
                title = "Nhà cung cấp";
                
                const match = line.match(/Nhà cung cấp:\s*từ\s+["']([^"']+)["']\s+thành\s+["']([^"']+)["']/i) || 
                              line.match(/Nhà cung cấp:\s*từ\s+(.+?)\s+thành\s+(.+)/i);
                if (match) {
                  contentNode = (
                    <span style={{ fontSize: "12px" }}>
                      <span className="text-muted text-decoration-line-through">{match[1]}</span>
                      <i className="bi bi-arrow-right mx-2 text-muted" />
                      <strong className="text-dark">{match[2]}</strong>
                    </span>
                  );
                }
              } else if (line.startsWith("Ngày nhận hàng:")) {
                icon = "bi-calendar-event";
                iconColor = "#8b5cf6";
                title = "Ngày nhận hàng";
                
                const match = line.match(/Ngày nhận hàng:\s*từ\s+["']([^"']+)["']\s+thành\s+["']([^"']+)["']/i) || 
                              line.match(/Ngày nhận hàng:\s*từ\s+(.+?)\s+thành\s+(.+)/i);
                if (match) {
                  const formatDate = (d: string) => {
                    if (d === "Chưa có" || d === "Chưa xác định") return d;
                    try {
                      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                        const parts = d.split("-");
                        return `${parts[2]}/${parts[1]}/${parts[0]}`;
                      }
                      return new Date(d).toLocaleDateString("vi-VN");
                    } catch {
                      return d;
                    }
                  };
                  contentNode = (
                    <span style={{ fontSize: "12px" }}>
                      <span className="text-muted text-decoration-line-through">{formatDate(match[1])}</span>
                      <i className="bi bi-arrow-right mx-2 text-muted" />
                      <strong className="text-dark">{formatDate(match[2])}</strong>
                    </span>
                  );
                }
              } else if (line.startsWith("Ghi chú:")) {
                icon = "bi-journal-text";
                iconColor = "#eab308";
                title = "Ghi chú";
                
                const match = line.match(/Ghi chú:\s*từ\s+["']([^"']+)["']\s+thành\s+["']([^"']+)["']/i) || 
                              line.match(/Ghi chú:\s*từ\s+(.+?)\s+thành\s+(.+)/i);
                if (match) {
                  contentNode = (
                    <span style={{ fontSize: "12px" }}>
                      <span className="text-muted text-decoration-line-through">{match[1] || "Trống"}</span>
                      <i className="bi bi-arrow-right mx-2 text-muted" />
                      <strong className="text-dark">{match[2] || "Trống"}</strong>
                    </span>
                  );
                }
              } else if (line.startsWith("Tổng tiền:")) {
                icon = "bi-cash-stack";
                iconColor = "#10b981";
                title = "Tổng giá trị";
                
                const match = line.match(/Tổng tiền:\s*từ\s+([^\s]+)\s*(?:đ|₫)?\s+thành\s+([^\s]+)\s*(?:đ|₫)?/i) || 
                              line.match(/Tổng tiền:\s*từ\s+(.+?)\s+thành\s+(.+)/i);
                if (match) {
                  contentNode = (
                    <span style={{ fontSize: "12px" }}>
                      <span className="text-muted text-decoration-line-through">{match[1]} ₫</span>
                      <i className="bi bi-arrow-right mx-2 text-muted" />
                      <strong className="text-success fw-bold">{match[2]} ₫</strong>
                    </span>
                  );
                }
              } else if (line.startsWith("Mặt hàng:")) {
                icon = "bi-box-seam";
                iconColor = "#6366f1";
                title = "Mặt hàng";
                
                const itemsText = line.substring("Mặt hàng:".length).trim();
                const itemsList = itemsText.split(/;\s*/).filter(Boolean);
                
                contentNode = (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                    {itemsList.map((itemChange, idx) => {
                      let action: "add" | "edit" | "delete" = "edit";
                      let itemDetailText = itemChange.trim();
                      
                      if (itemDetailText.startsWith("Thêm ")) {
                        action = "add";
                        itemDetailText = itemDetailText.substring(5);
                      } else if (itemDetailText.startsWith("Thay đổi ")) {
                        action = "edit";
                        itemDetailText = itemDetailText.substring(9);
                      } else if (itemDetailText.startsWith("Xoá ")) {
                        action = "delete";
                        itemDetailText = itemDetailText.substring(4);
                      }

                      const quoteMatch = itemDetailText.match(/^"([^"]+)"/);
                      const productName = quoteMatch ? quoteMatch[1] : itemDetailText;
                      let detailsPart = quoteMatch ? itemDetailText.substring(quoteMatch[0].length).trim() : "";
                      
                      if (detailsPart.startsWith("(") && detailsPart.endsWith(")")) {
                        detailsPart = detailsPart.slice(1, -1).trim();
                      }

                      let formattedDetails = detailsPart;
                      if (formattedDetails) {
                        const detailsList = formattedDetails.split(/,\s*/);
                        const formattedParts = detailsList.map(detailItem => {
                          let itemText = detailItem.trim();
                          
                          // Match transitions like "SL từ A thành B"
                          const slMatch = itemText.match(/SL\s+từ\s+(.+?)\s+thành\s+(.+)/i);
                          if (slMatch) {
                            return `SL: ${slMatch[1]} ➔ ${slMatch[2]}`;
                          }

                          // Match transitions like "Đơn giá từ A thành B"
                          const dgMatch = itemText.match(/Đơn giá\s+từ\s+(.+?)\s+thành\s+(.+)/i);
                          if (dgMatch) {
                            const fromVal = dgMatch[1].replace(/(?:đ|₫)/g, "").trim();
                            const toVal = dgMatch[2].replace(/(?:đ|₫)/g, "").trim();
                            return `Đơn giá: ${fromVal} ₫ ➔ ${toVal} ₫`;
                          }

                          // Match transitions like "Ngày giao từ A thành B"
                          const ngMatch = itemText.match(/Ngày giao\s+từ\s+(.+?)\s+thành\s+(.+)/i);
                          if (ngMatch) {
                            const formatDateStr = (d: string) => {
                              const trimmed = d.replace(/["']/g, "").trim();
                              if (trimmed === "Chưa có" || trimmed === "Chưa xác định") return trimmed;
                              const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
                              if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
                              return trimmed;
                            };
                            return `Ngày giao: ${formatDateStr(ngMatch[1])} ➔ ${formatDateStr(ngMatch[2])}`;
                          }

                          return itemText;
                        });
                        
                        formattedDetails = formattedParts.join(", ");
                        formattedDetails = formattedDetails.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3/$2/$1");
                      }

                      const badgeConfig = {
                        add: { color: "#10b981", bg: "rgba(16,185,129,0.1)", label: "Thêm" },
                        edit: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "Sửa" },
                        delete: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Xoá" }
                      }[action];

                      return (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span 
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                fontSize: "9px",
                                fontWeight: 800,
                                color: badgeConfig.color,
                                background: badgeConfig.bg,
                                textTransform: "uppercase",
                                flexShrink: 0
                              }}
                            >
                              {badgeConfig.label}
                            </span>
                            <span className="fw-semibold text-dark" style={{ fontSize: "12px" }}>{productName}</span>
                          </div>
                          {formattedDetails && (
                            <div style={{ fontSize: "11px", color: "var(--muted-foreground)", paddingLeft: "42px" }}>
                              {formattedDetails}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (!contentNode) {
                contentNode = <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{line}</span>;
              }

              return (
                <div key={index} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  paddingBottom: index < changeLines.length - 1 ? "12px" : "0",
                  borderBottom: index < changeLines.length - 1 ? "1px solid var(--border)" : "none"
                }}>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background: `color-mix(in srgb, ${iconColor} 10%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px"
                  }}>
                    <i className={`bi ${icon}`} style={{ fontSize: "12px", color: iconColor }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {title && <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px" }}>{title}</div>}
                    {contentNode}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return text;
  };

  const handleSaveActivity = async () => {
    if (!actNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plan-finance/purchasing/${order.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loai: actType, ngay: actDate, nguoiThucHien: actPerson, ketQua: actNote }),
      });
      if (res.ok) {
        const created = await res.json();
        setActivities((prev) => [...prev, created]);
        setActNote("");
        setShowActivityModal(false);
      } else {
        const errData = await res.json();
        alert("Lỗi: " + (errData.error ?? "Không thể lưu"));
      }
    } catch (err) {
      alert("Lỗi mạng: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );

  const fmtVnd = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";

  const selType = ACT_TYPES.find((t) => t.key === actType) ?? ACT_TYPES[0];
  const s = ORD_STATUS[detail?.trangThai ?? order.trangThai] ?? { label: order.trangThai, color: "var(--muted-foreground)", bg: "var(--muted)" };

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose} 
        style={{ position: "fixed", inset: 0, zIndex: 5100, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }} 
      />

      {/* Panel */}
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 400, zIndex: 5200,
          background: "var(--card)", borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(0, 48, 135, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="bi bi-cart-check" style={{ fontSize: 16, color: "#003087" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, fontFamily: "monospace", color: "#003087" }}>{order.code ?? order.id}</span>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, color: s.color, background: s.bg }}>
                  {s.label}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>Chi tiết đơn mua hàng</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}>
              <i className="bi bi-x" style={{ fontSize: 17 }} />
            </button>
          </div>

          {/* Sub-header info bar */}
          <div style={{ display: "flex", gap: 16, background: "var(--muted)", padding: "6px 12px", borderRadius: 8, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <i className="bi bi-calendar-check" style={{ color: "var(--muted-foreground)" }} />
              <span style={{ color: "var(--muted-foreground)" }}>Giao:</span>
              <strong style={{ color: "var(--foreground)" }}>
                {order.ngayNhan ? new Date(order.ngayNhan).toLocaleDateString("vi-VN") : "—"}
              </strong>
            </div>
            <div style={{ width: 1, height: 14, background: "var(--border)", alignSelf: "center" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <i className="bi bi-cash-stack" style={{ color: "var(--muted-foreground)" }} />
              <span style={{ color: "var(--muted-foreground)" }}>Giá trị:</span>
              <strong style={{ color: "#003087" }}>
                {order.tongTien ? fmtVnd(order.tongTien) : "0 ₫"}
              </strong>
            </div>
          </div>
        </div>

        {/* Scrollable Container */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          
          {/* General Information */}
          <div style={{ padding: "16px 20px 8px" }}>
            
            {/* Action Buttons Panel */}
            <div style={{ marginBottom: "14px" }}>
              {/* Row 1: Sửa, Xoá, Đặt hàng, Nhận hàng */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "8px",
                marginBottom: "8px"
              }}>
                <button
                  onClick={handleEditOrder}
                  disabled={order.trangThai === "ordered"}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    height: "64px", borderRadius: "10px", border: "1px solid var(--border)",
                    background: order.trangThai === "ordered" ? "var(--muted)" : "rgba(0, 48, 135, 0.02)",
                    cursor: order.trangThai === "ordered" ? "not-allowed" : "pointer", gap: "6px",
                    transition: "all 0.15s ease",
                    color: order.trangThai === "ordered" ? "var(--muted-foreground)" : "var(--foreground)",
                    opacity: order.trangThai === "ordered" ? 0.6 : 1
                  }}
                  title={order.trangThai === "ordered" ? "Đơn hàng đã đặt không thể sửa" : "Sửa đơn hàng"}
                >
                  <i className="bi bi-pencil" style={{ fontSize: "16px", color: "var(--muted-foreground)" }} />
                  <span style={{ fontSize: "11px", fontWeight: "700" }}>Sửa</span>
                </button>

                <button
                  onClick={handleDeleteOrder}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    height: "64px", borderRadius: "10px", border: "1px solid var(--border)",
                    background: "rgba(244, 63, 94, 0.02)", cursor: "pointer", gap: "6px",
                    transition: "all 0.15s ease", color: "var(--foreground)"
                  }}
                >
                  <i className="bi bi-trash" style={{ fontSize: "16px", color: "#f43f5e" }} />
                  <span style={{ fontSize: "11px", fontWeight: "700" }}>Xoá</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus("ordered")}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    height: "64px", borderRadius: "10px", border: "1px solid var(--border)",
                    background: "rgba(99, 102, 241, 0.02)", cursor: "pointer", gap: "6px",
                    transition: "all 0.15s ease", color: "var(--foreground)"
                  }}
                >
                  <i className="bi bi-cart" style={{ fontSize: "16px", color: "#6366f1" }} />
                  <span style={{ fontSize: "11px", fontWeight: "700" }}>Đặt hàng</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus("received")}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    height: "64px", borderRadius: "10px", border: "1px solid var(--border)",
                    background: "rgba(2, 132, 199, 0.02)", cursor: "pointer", gap: "6px",
                    transition: "all 0.15s ease", color: "var(--foreground)"
                  }}
                >
                  <i className="bi bi-box-seam" style={{ fontSize: "16px", color: "#0284c7" }} />
                  <span style={{ fontSize: "11px", fontWeight: "700" }}>Nhận hàng</span>
                </button>
              </div>

              {/* Row 2: Khiếu nại, Tạm dừng, Huỷ bỏ, In đơn */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "8px"
              }}>
                <button
                  onClick={() => handleUpdateStatus("disputed")}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: "32px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: "var(--card)", cursor: "pointer", gap: "6px",
                    transition: "all 0.15s ease", fontSize: "11px", fontWeight: "700", color: "#f43f5e"
                  }}
                >
                  <i className="bi bi-x-circle" style={{ fontSize: "13px" }} />
                  <span>Khiếu nại</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus("paused")}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: "32px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: "var(--card)", cursor: "pointer", gap: "6px",
                    transition: "all 0.15s ease", fontSize: "11px", fontWeight: "700", color: "#f59e0b"
                  }}
                >
                  <i className="bi bi-pause-circle" style={{ fontSize: "13px" }} />
                  <span>Tạm dừng</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus("cancelled")}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: "32px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: "var(--card)", cursor: "pointer", gap: "6px",
                    transition: "all 0.15s ease", fontSize: "11px", fontWeight: "700", color: "#64748b"
                  }}
                >
                  <i className="bi bi-slash-circle" style={{ fontSize: "13px" }} />
                  <span>Huỷ bỏ</span>
                </button>

                <button
                  onClick={handlePrintOrder}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: "32px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: "var(--card)", cursor: "pointer", gap: "6px",
                    transition: "all 0.15s ease", fontSize: "11px", fontWeight: "700", color: "#003087"
                  }}
                >
                  <i className="bi bi-printer" style={{ fontSize: "13px" }} />
                  <span>In đơn</span>
                </button>
              </div>
            </div>
            {/* Supplier/General Information */}
            {(() => {
              const supplier = detail?.supplier ?? order.supplier;
              return (
                <div style={{
                  background: "var(--muted)",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "14px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>Nhà cung cấp</span>
                    <p style={{ margin: "3px 0 2px", fontSize: 13.5, fontWeight: 800, color: "var(--foreground)" }}>{supplier?.name ?? "—"}</p>
                    
                    {supplier?.address && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 4, fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                        <i className="bi bi-geo-alt" style={{ fontSize: 11.5, marginTop: 2 }} />
                        <span style={{ lineHeight: "1.3" }}>{supplier.address}</span>
                      </div>
                    )}

                    {/* Inline contact info */}
                    {(supplier?.phone || supplier?.email) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                        {supplier?.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="bi bi-telephone" style={{ fontSize: 11.5 }} />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier?.phone && supplier?.email && <span style={{ color: "var(--border)" }}>|</span>}
                        {supplier?.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="bi bi-envelope" style={{ fontSize: 11.5 }} />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {order.ghiChu && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>Ghi chú đơn hàng</span>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--foreground)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{order.ghiChu}</p>
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Financial Summary removed - already shown in header */}
          </div>


          {/* Timeline Section */}
          <div style={{ padding: "24px 20px 32px" }}>
            <SectionTitle
              title="Lịch sử đơn hàng"
              action={
                <button
                  onClick={() => {
                    setActType("call");
                    setActDate(new Date().toISOString().slice(0, 10));
                    setActPerson(session?.user?.name ?? "");
                    setActNote("");
                    setShowActivityModal(true);
                  }}
                  style={{ height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "0 10px", color: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
                >
                  <i className="bi bi-plus-lg" style={{ fontSize: 12 }} />Hoạt động
                </button>
              }
            />
            
            <div style={{ position: "relative", paddingLeft: 40, marginTop: 16 }}>
              <div style={{ position: "absolute", left: 19, top: 4, bottom: 4, width: 2, background: "linear-gradient(to bottom, var(--border), rgba(226,232,240,0))", borderRadius: 4 }} />
              
              {/* Database activities (excluding 'create' to prevent duplication) */}
              {[...activities]
                .filter(act => act.loai !== "create")
                .sort((a, b) => new Date(b.ngay || b.createdAt).getTime() - new Date(a.ngay || a.createdAt).getTime())
                .map((neg) => {
                  const t = ACT_TYPES.find((x) => x.key === neg.loai) ?? ACT_TYPES[0];
                  return (
                    <div key={neg.id} style={{ position: "relative", marginBottom: 14 }}>
                      {/* Circle icon on the vertical line */}
                      <div style={{ position: "absolute", left: -33, top: 4, width: 24, height: 24, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px var(--border)" }}>
                        <i className={`bi ${t.icon}`} style={{ fontSize: 10, color: t.color }} />
                      </div>
                      {/* Content box card (No border) */}
                      <div style={{ background: "var(--card)", borderRadius: 12, padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: t.color, padding: "2px 8px", background: `color-mix(in srgb, ${t.color} 10%, transparent)`, borderRadius: 6 }}>{t.label}</span>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>• {new Date(neg.ngay || neg.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div style={{ margin: "0 0 6px", fontSize: 13, color: "var(--foreground)", whiteSpace: "pre-line", lineHeight: "1.5" }}>
                          {renderLogContent(neg.ketQua)}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "var(--primary)" }}>
                            {neg.nguoiThucHien.trim().split(" ").pop()?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{neg.nguoiThucHien} thực hiện</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Item cũ nhất: khởi tạo đơn hàng */}
              <div style={{ position: "relative", marginBottom: 14 }}>
                <div style={{ position: "absolute", left: -33, top: 4, width: 24, height: 24, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px var(--border)" }}>
                  <i className="bi bi-file-earmark-plus-fill" style={{ fontSize: 10, color: "#10b981" }} />
                </div>
                <div style={{ background: "var(--card)", borderRadius: 12, padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#10b981", padding: "2px 8px", background: "rgba(16,185,129,0.1)", borderRadius: 6 }}>Khởi tạo</span>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>• {new Date(order.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--foreground)" }}>Đơn mua hàng <strong>{order.code ?? ""}</strong> đã được khởi tạo.</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "var(--primary)" }}>
                      H
                    </div>
                    <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>Hệ thống thực hiện</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer (Actions) */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", flexShrink: 0 }}>
          <i className="bi bi-info-circle-fill" style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
            Đơn mua hàng quản lý bởi quy trình kế toán - kho.
          </span>
        </div>
      </motion.div>

      {/* Modal ghi nhận hoạt động */}
      {showActivityModal && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 6200, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 6201, width: 440, background: "var(--card)",
            borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            border: "1px solid var(--border)", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `color-mix(in srgb, ${selType.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`bi ${selType.icon}`} style={{ fontSize: 14, color: selType.color }} />
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Ghi nhận hoạt động</p>
              </div>
              <button onClick={() => setShowActivityModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted-foreground)", lineHeight: 1 }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Loại hoạt động</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {MANUAL_ACT_TYPES.map(t => (
                  <button key={t.key}
                    onClick={() => setActType(t.key)}
                    style={{
                      flex: 1, padding: "8px 4px", borderRadius: 9,
                      border: `1.5px solid ${actType === t.key ? t.color : "var(--border)"}`,
                      background: actType === t.key ? `color-mix(in srgb, ${t.color} 10%, transparent)` : "var(--muted)",
                      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      transition: "all 0.15s",
                    }}
                  >
                    <i className={`bi ${t.icon}`} style={{ fontSize: 16, color: actType === t.key ? t.color : "var(--muted-foreground)" }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: actType === t.key ? t.color : "var(--muted-foreground)" }}>{t.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Ngày ghi nhận</label>
                  <input type="date" value={actDate} onChange={e => setActDate(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Người thực hiện</label>
                  <input value={actPerson} onChange={e => setActPerson(e.target.value)}
                    placeholder="Tên người thực hiện..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Nội dung hoạt động</label>
              <textarea value={actNote} onChange={e => setActNote(e.target.value)}
                placeholder="Mô tả nội dung, ghi chú, phản hồi của nhà cung cấp hoặc tiến độ..."
                rows={4}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowActivityModal(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >Huỷ</button>
              <button
                onClick={handleSaveActivity}
                disabled={saving || !actNote.trim()}
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: !actNote.trim() ? "var(--muted)" : selType.color, color: !actNote.trim() ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, cursor: !actNote.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s" }}
              >
                {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite" }} /> : <i className="bi bi-check2" />}Lưu hoạt động
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hộp thoại xác nhận xoá đơn hàng */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Xoá đơn mua hàng"
        message={
          <>
            Bạn có chắc chắn muốn xoá đơn hàng <strong>{order.code ?? order.id}</strong>?<br />
            Thao tác này không thể hoàn tác và sẽ khôi phục trạng thái các mặt hàng về yêu cầu ban đầu.
          </>
        }
        confirmLabel="Xoá đơn"
        cancelLabel="Huỷ"
        variant="danger"
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const res = await fetch(`/api/plan-finance/purchasing/${order.id}`, {
              method: "DELETE",
            });
            if (res.ok) {
              setConfirmDeleteOpen(false);
              onChanged?.(); // Refresh list table
              onClose(); // Close offcanvas drawer
            } else {
              const err = await res.json();
              alert("Lỗi xoá đơn hàng: " + (err.error ?? "Không thể xoá"));
            }
          } catch (e) {
            alert("Lỗi kết nối: " + String(e));
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
