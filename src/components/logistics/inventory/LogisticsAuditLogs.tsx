"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { TablePagination } from "@/components/ui/TablePagination";
import { ConfirmDialogModal } from "@/components/ui/ConfirmDialog";
import { isLogisticsAdmin } from "@/lib/logistics-permissions";

interface Warehouse {
  id: string;
  name: string;
  code?: string;
}

interface InventoryItem {
  id: string;
  tenHang: string;
  code: string | null;
  donVi: string | null;
  soLuong: number;
}

interface StockMovement {
  id: string;
  inventoryItemId: string;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  type: string; // nhap, xuat, chuyen, dieu-chinh
  soLuong: number;
  soLuongCT?: number;
  soLuongTruoc?: number;
  soLuongSau?: number;
  donGia?: number;
  lyDo?: string;
  soChungTu?: string;
  nguoiThucHien?: string;
  createdAt: string;
  inventoryItem?: {
    id: string;
    code: string | null;
    tenHang: string;
    donVi: string | null;
  };
  fromWarehouse?: {
    id: string;
    code: string | null;
    name: string;
  };
  toWarehouse?: {
    id: string;
    code: string | null;
    name: string;
  };
}

interface DocumentGroup {
  key: string;
  docCode: string;
  createdAt: string;
  type: string;
  nguoiThucHien?: string;
  lyDo?: string;
  fromWarehouseName?: string;
  toWarehouseName?: string;
  items: StockMovement[];
  totalQty: number;
}

export function LogisticsAuditLogs() {
  const toast = useToast();
  const { data: session } = useSession();
  const currentUserName = session?.user?.name || "Nguyễn Văn Tiến";
  
  // Core states
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [realMovements, setRealMovements] = useState<StockMovement[]>([]);
  
  // Filter states
  const [search, setSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDate, setFilterDate] = useState(""); // "", "all", "today", "yesterday", "7days", "30days", "this-week", "last-week", "this-month", "last-month", "this-quarter", "last-quarter", "this-year", "last-year", "custom"
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  // Loading & Selected states
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedLog, setSelectedLog] = useState<StockMovement | null>(null);

  // Group expand/collapse states
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // Checkbox selection & Delete states
  const isThuKho = isLogisticsAdmin(session?.user);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [logToDelete, setLogToDelete] = useState<StockMovement | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<DocumentGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch initial warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const whRes = await fetch("/api/logistics/warehouses");
        const whData = await whRes.json();
        setWarehouses(Array.isArray(whData) ? whData : []);
      } catch (err) {
        console.error("Error fetching warehouses:", err);
      }
    };
    fetchWarehouses();
  }, []);

  // Fetch movements from DB
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plan-finance/stock-movements?limit=1000");
      const data = await res.json();
      if (Array.isArray(data)) {
        setRealMovements(data);
      } else {
        setRealMovements(data.items || []);
      }
    } catch (error) {
      console.error("Failed to load database stock movements:", error);
      toast.error("Lỗi tải dữ liệu", "Không thể tải danh sách nhật ký kho từ máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Reset về trang 1 khi thay đổi bộ lọc
  useEffect(() => {
    setPage(1);
  }, [search, filterWarehouse, filterType, filterDate, customStartDate, customEndDate]);

  // Precompute local date boundaries for filtering
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000 - 1;

  const startOfYesterday = startOfToday - 86400000;
  const endOfYesterday = startOfToday - 1;

  const last7Days = now.getTime() - 7 * 86400000;
  const last30Days = now.getTime() - 30 * 86400000;

  // Week boundary (starting Monday)
  const currentDay = now.getDay();
  const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday).getTime();
  const endOfThisWeek = startOfThisWeek + 7 * 86400000 - 1;

  const startOfLastWeek = startOfThisWeek - 7 * 86400000;
  const endOfLastWeek = startOfThisWeek - 1;

  // Month boundary
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

  // Quarter boundary
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const startOfThisQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1).getTime();
  const endOfThisQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999).getTime();

  const startOfLastQuarter = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1).getTime();
  const endOfLastQuarter = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59, 999).getTime();

  // Year boundary
  const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();
  const endOfThisYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();

  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1).getTime();
  const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999).getTime();

  // Filter movements based on selected filters
  const filteredLogs = realMovements.filter(mv => {
    // 1. Text search (SKU, item name, doc, operator, reason)
    const searchLower = search.toLowerCase();
    const itemCode = mv.inventoryItem?.code?.toLowerCase() || "";
    const itemName = mv.inventoryItem?.tenHang?.toLowerCase() || "";
    const docCode = mv.soChungTu?.toLowerCase() || "";
    const operator = mv.nguoiThucHien?.toLowerCase() || "";
    const reason = mv.lyDo?.toLowerCase() || "";

    const matchesSearch = 
      itemCode.includes(searchLower) ||
      itemName.includes(searchLower) ||
      docCode.includes(searchLower) ||
      operator.includes(searchLower) ||
      reason.includes(searchLower);

    // 2. Action category filter
    const matchesType = !filterType || filterType === "all" || mv.type === filterType;

    // 3. Warehouse filter
    let matchesWarehouse = true;
    if (filterWarehouse && filterWarehouse !== "all") {
      matchesWarehouse = mv.fromWarehouseId === filterWarehouse || mv.toWarehouseId === filterWarehouse;
    }

    // 4. Date filter
    let matchesDate = true;
    if (filterDate && filterDate !== "all") {
      const logTime = new Date(mv.createdAt).getTime();
      if (isNaN(logTime)) {
        matchesDate = false;
      } else if (filterDate === "custom") {
        if (customStartDate) {
          const startMs = new Date(`${customStartDate}T00:00:00`).getTime();
          if (logTime < startMs) matchesDate = false;
        }
        if (customEndDate) {
          const endMs = new Date(`${customEndDate}T23:59:59.999`).getTime();
          if (logTime > endMs) matchesDate = false;
        }
      } else {
        switch (filterDate) {
          case "today":
            matchesDate = logTime >= startOfToday && logTime <= endOfToday;
            break;
          case "yesterday":
            matchesDate = logTime >= startOfYesterday && logTime <= endOfYesterday;
            break;
          case "7days":
            matchesDate = logTime >= last7Days;
            break;
          case "30days":
            matchesDate = logTime >= last30Days;
            break;
          case "this-week":
            matchesDate = logTime >= startOfThisWeek && logTime <= endOfThisWeek;
            break;
          case "last-week":
            matchesDate = logTime >= startOfLastWeek && logTime <= endOfLastWeek;
            break;
          case "this-month":
            matchesDate = logTime >= startOfThisMonth && logTime <= endOfThisMonth;
            break;
          case "last-month":
            matchesDate = logTime >= startOfLastMonth && logTime <= endOfLastMonth;
            break;
          case "this-quarter":
            matchesDate = logTime >= startOfThisQuarter && logTime <= endOfThisQuarter;
            break;
          case "last-quarter":
            matchesDate = logTime >= startOfLastQuarter && logTime <= endOfLastQuarter;
            break;
          case "this-year":
            matchesDate = logTime >= startOfThisYear && logTime <= endOfThisYear;
            break;
          case "last-year":
            matchesDate = logTime >= startOfLastYear && logTime <= endOfLastYear;
            break;
        }
      }
    }

    return matchesSearch && matchesType && matchesWarehouse && matchesDate;
  });

  // Grouped logs by document
  const groupedLogs = React.useMemo(() => {
    const groups: DocumentGroup[] = [];
    const map = new Map<string, DocumentGroup>();

    for (const log of filteredLogs) {
      const docCode = log.soChungTu?.trim() || "";
      const groupKey = docCode ? `${docCode}_${log.type}` : `NO_DOC_${log.id}`;

      let group = map.get(groupKey);
      if (!group) {
        group = {
          key: groupKey,
          docCode: docCode || "HỆ THỐNG",
          createdAt: log.createdAt,
          type: log.type,
          nguoiThucHien: log.nguoiThucHien || currentUserName,
          lyDo: log.lyDo || "",
          fromWarehouseName: log.fromWarehouse?.name,
          toWarehouseName: log.toWarehouse?.name,
          items: [],
          totalQty: 0,
        };
        map.set(groupKey, group);
        groups.push(group);
      }

      group.items.push(log);
      group.totalQty += log.soLuong || 0;
      if (!group.fromWarehouseName && log.fromWarehouse?.name) {
        group.fromWarehouseName = log.fromWarehouse.name;
      }
      if (!group.toWarehouseName && log.toWarehouse?.name) {
        group.toWarehouseName = log.toWarehouse.name;
      }
      if (!group.lyDo && log.lyDo) {
        group.lyDo = log.lyDo;
      }
    }

    return groups;
  }, [filteredLogs, currentUserName]);

  // Phân trang theo nhóm chứng từ
  const totalCount = groupedLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedGroups = groupedLogs.slice((page - 1) * pageSize, page * pageSize);

  // Trạng thái expand/collapse
  const isGroupExpanded = (key: string) => {
    return expandedKeys[key] !== false; // Mặc định mở rộng để thấy các dòng con
  };

  const toggleGroup = (key: string) => {
    setExpandedKeys(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  };



  // Checkbox selection states on current page
  const currentPageItemIds = React.useMemo(() => {
    return paginatedGroups.flatMap(g => g.items.map(it => it.id));
  }, [paginatedGroups]);

  const isAllCurrentPageSelected = currentPageItemIds.length > 0 && currentPageItemIds.every(id => selectedIds.includes(id));
  const isSomeCurrentPageSelected = currentPageItemIds.some(id => selectedIds.includes(id)) && !isAllCurrentPageSelected;

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const set = new Set(currentPageItemIds);
      setSelectedIds(prev => prev.filter(id => !set.has(id)));
    } else {
      const toAdd = currentPageItemIds.filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...toAdd]);
    }
  };

  const handleToggleGroupCheckbox = (group: DocumentGroup) => {
    const groupItemIds = group.items.map(it => it.id);
    const isAllSelected = groupItemIds.every(id => selectedIds.includes(id));
    if (isAllSelected) {
      const set = new Set(groupItemIds);
      setSelectedIds(prev => prev.filter(id => !set.has(id)));
    } else {
      const toAdd = groupItemIds.filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...toAdd]);
    }
  };

  const handleToggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmDelete = async () => {
    let idsToDelete: string[] = [];
    if (groupToDelete) {
      idsToDelete = groupToDelete.items.map(it => it.id);
    } else if (logToDelete) {
      idsToDelete = [logToDelete.id];
    } else {
      idsToDelete = selectedIds;
    }
    if (idsToDelete.length === 0) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/plan-finance/stock-movements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Xoá nhật ký thất bại");
      }
      toast.success("Thành công", `Đã xoá ${data.deletedCount || idsToDelete.length} bản ghi nhật ký kho`);
      const deletedSet = new Set(idsToDelete);
      setSelectedIds(prev => prev.filter(id => !deletedSet.has(id)));
      setGroupToDelete(null);
      setLogToDelete(null);
      setShowConfirmDelete(false);
      fetchLogs();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("logistics-orders-updated"));
      }
    } catch (err: any) {
      toast.error("Lỗi xoá", err.message || "Không thể xoá bản ghi");
    } finally {
      setDeleting(false);
    }
  };

  // Action badge mapping
  const actionBadgeMap: Record<string, { label: string; class: string }> = {
    nhap: { label: "Nhập kho", class: "bg-success-subtle text-success border-success" },
    xuat: { label: "Xuất kho", class: "bg-primary-subtle text-primary border-primary" },
    chuyen: { label: "Di chuyển", class: "bg-warning-subtle text-warning border-warning" },
    "dieu-chinh": { label: "Điều chỉnh", class: "bg-info-subtle text-info border-info" },
  };

  return (
    <>
    <div className="d-flex flex-column flex-grow-1 h-100" style={{ padding: 8, minHeight: 0 }}>
      <div 
        className="app-card overflow-hidden flex-grow-1 d-flex flex-column border shadow-sm" 
        style={{ borderRadius: 16, minHeight: 0, background: "var(--card)" }}
      >
        {/* ── 1. Toolbar NẰM BÊN TRONG THẺ CARD CHÍNH ── */}
        <div 
          className="d-flex flex-wrap align-items-center gap-2 px-3 border-bottom bg-light-subtle flex-shrink-0"
          style={{ padding: "14px 16px", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        >
          {/* Search Box - co dãn tự động lấp đầy dòng */}
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 220 }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 13 }} />
            <input 
              type="text" 
              placeholder="Tìm theo SKU, tên hàng, chứng từ, nhân viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", height: 36, padding: "0 30px 0 34px", fontSize: 13,
                borderRadius: 8, border: "1px solid var(--border)", 
                background: "var(--background)", color: "var(--foreground)", outline: "none"
              }}
            />
            {search && (
              <i 
                className="bi bi-x-circle-fill" 
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 12 }}
                onClick={() => setSearch("")}
              />
            )}
          </div>

          <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0, margin: "0 2px" }} />

          <FilterSelect
            value={filterWarehouse}
            onChange={setFilterWarehouse}
            placeholder="Tất cả kho hàng"
            options={warehouses.map(w => ({ label: w.name, value: w.id }))}
            width={175}
          />

          <FilterSelect
            value={filterType}
            onChange={setFilterType}
            placeholder="Tất cả hoạt động"
            options={[
              { label: "Nhập kho (Inbound)", value: "nhap" },
              { label: "Xuất kho (Outbound)", value: "xuat" },
              { label: "Luân chuyển nội bộ", value: "chuyen" },
              { label: "Điều chỉnh kiểm kê", value: "dieu-chinh" }
            ]}
            width={170}
          />

          {filterDate === "custom" ? (
            <div className="d-flex align-items-center gap-1.5 bg-background px-2 border rounded shadow-sm flex-shrink-0" style={{ height: 36, fontSize: 12.5, borderColor: "var(--border)" }}>
              <i className="bi bi-calendar3 text-primary opacity-75 ms-0.5" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border-0 bg-transparent text-foreground"
                style={{ outline: "none", fontSize: 12, width: 110 }}
              />
              <span className="text-muted small">➔</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border-0 bg-transparent text-foreground"
                style={{ outline: "none", fontSize: 12, width: 110 }}
              />
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-muted ms-1"
                onClick={() => {
                  setFilterDate("");
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                title="Bỏ tùy chọn ngày"
              >
                <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
              </button>
            </div>
          ) : (
            <FilterSelect
              value={filterDate}
              onChange={setFilterDate}
              placeholder="Tất cả thời gian"
              options={[
                { label: "Tất cả thời gian", value: "all" },
                { label: "Hôm nay", value: "today" },
                { label: "Hôm qua", value: "yesterday" },
                { label: "7 ngày qua", value: "7days" },
                { label: "30 ngày qua", value: "30days" },
                { label: "Tuần này", value: "this-week" },
                { label: "Tuần trước", value: "last-week" },
                { label: "Tháng này", value: "this-month" },
                { label: "Tháng trước", value: "last-month" },
                { label: "Quý này", value: "this-quarter" },
                { label: "Quý trước", value: "last-quarter" },
                { label: "Năm nay", value: "this-year" },
                { label: "Năm trước", value: "last-year" },
                { label: "📅 Tùy chọn ngày...", value: "custom" }
              ]}
              width={155}
            />
          )}

          {/* Nút Xoá - Luôn hiển thị với trạng thái active/disabled */}
          <button
            type="button"
            className={`btn ${selectedIds.length > 0 ? "btn-danger" : "btn-outline-danger"} d-flex align-items-center gap-1.5 shadow-sm flex-shrink-0`}
            style={{ 
              height: 36, 
              fontSize: 13, 
              borderRadius: 8, 
              padding: "0 15px", 
              fontWeight: 600,
              opacity: selectedIds.length > 0 ? 1 : 0.5,
              cursor: selectedIds.length > 0 ? "pointer" : "not-allowed"
            }}
            disabled={selectedIds.length === 0}
            onClick={() => {
              if (selectedIds.length === 0) return;
              setGroupToDelete(null);
              setLogToDelete(null);
              setShowConfirmDelete(true);
            }}
            title={selectedIds.length > 0 ? `Xoá ${selectedIds.length} bản ghi đã chọn` : "Chọn bản ghi để xoá"}
          >
            <i className="bi bi-trash3-fill" style={{ fontSize: 13 }} />
            <span>Xoá{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}</span>
          </button>
        </div>

        {/* ── 2. Bảng dữ liệu có nhóm và các dòng con ── */}
        <div className="table-responsive flex-grow-1" style={{ overflowY: "auto" }}>
          <table className="table mb-0" style={{ fontSize: 13 }}>
            <thead className="bg-light" style={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "var(--card)" }}>
              <tr style={{ height: 38 }}>
                <th className="border-0 text-center ps-3 pe-2 py-2" style={{ width: 56 }}>
                  <input 
                    type="checkbox"
                    className="form-check-input m-0"
                    checked={isAllCurrentPageSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeCurrentPageSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: "pointer", width: 16, height: 16 }}
                  />
                </th>
                <th className="border-0 text-uppercase fw-bold text-muted ps-2 py-2" style={{ fontSize: 11 }}>Thời gian, Chứng từ & Chi tiết biến động</th>
                <th className="pe-4 border-0 text-uppercase fw-bold text-muted py-2" style={{ width: "360px", fontSize: 11 }}>Ghi chú / Diễn giải</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />
                    Đang truy xuất nhật ký kho...
                  </td>
                </tr>
              ) : paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-5 text-muted">
                    <i className="bi bi-journal-x fs-2 d-block mb-2 opacity-25" />
                    Không tìm thấy bản ghi nhật ký hoạt động nào
                  </td>
                </tr>
              ) : (
                paginatedGroups.map(group => {
                  const badge = actionBadgeMap[group.type] || { label: group.type.toUpperCase(), class: "bg-secondary-subtle text-secondary" };
                  const isExpanded = isGroupExpanded(group.key);
                  const groupItemIds = group.items.map(it => it.id);
                  const isGroupAllSelected = groupItemIds.length > 0 && groupItemIds.every(id => selectedIds.includes(id));
                  const isGroupSomeSelected = groupItemIds.some(id => selectedIds.includes(id)) && !isGroupAllSelected;

                  return (
                    <React.Fragment key={group.key}>
                      {/* Dòng Header của Nhóm Chứng từ */}
                      <tr 
                        className="group-header-row border-top"
                        style={{ 
                          backgroundColor: "rgba(248, 249, 250, 0.95)",
                          cursor: "pointer",
                          transition: "background 0.15s"
                        }}
                        onClick={() => toggleGroup(group.key)}
                      >
                        {/* Checkbox nhóm - căn top thẳng hàng với số chứng từ */}
                        <td 
                          className="text-center border-0 ps-3 pe-2" 
                          style={{ verticalAlign: "top", paddingTop: 10, width: 56 }} 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="form-check-input m-0"
                            checked={isGroupAllSelected}
                            ref={el => {
                              if (el) el.indeterminate = isGroupSomeSelected;
                            }}
                            onChange={() => handleToggleGroupCheckbox(group)}
                            style={{ cursor: "pointer", width: 16, height: 16 }}
                          />
                        </td>

                        {/* Chứng từ & Thời gian, kèm người thực hiện phía sau thời gian */}
                        <td className="border-0 ps-2" style={{ verticalAlign: "top", paddingTop: 7, paddingBottom: 7 }}>
                          <div className="d-flex align-items-start" style={{ gap: 15 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-light border p-0 d-flex align-items-center justify-content-center shadow-none flex-shrink-0"
                              style={{ width: 22, height: 22, borderRadius: 6, background: "#fff", marginTop: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(group.key);
                              }}
                              title={isExpanded ? "Ẩn nội dung con" : "Hiện nội dung con"}
                            >
                              <i 
                                className={`bi bi-chevron-${isExpanded ? "down" : "right"}`} 
                                style={{ fontSize: 11, color: "var(--foreground)" }} 
                              />
                            </button>
                            <div style={{ lineHeight: 1.3 }}>
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold text-primary font-monospace" style={{ fontSize: 13.5, lineHeight: "22px" }}>
                                  {group.docCode}
                                </span>
                                {/* Loại tác vụ được đưa vào cạnh số chứng từ */}
                                <span className={`badge rounded-pill border ${badge.class}`} style={{ padding: "2.5px 8px", fontSize: "10.5px", fontWeight: 700 }}>
                                  {badge.label}
                                </span>
                              </div>
                              {/* Thời gian kèm Người thực hiện ngay phía sau */}
                              <div className="text-muted small d-flex align-items-center gap-2" style={{ fontSize: 11.5, marginTop: 2 }}>
                                <span>
                                  {new Date(group.createdAt).toLocaleString("vi-VN", {
                                    hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric"
                                  })}
                                </span>
                                <span className="opacity-40">•</span>
                                <span className="d-inline-flex align-items-center gap-1 text-secondary">
                                  <i className="bi bi-person text-muted" style={{ fontSize: 12 }} />
                                  <span>Người thực hiện: <b>{group.nguoiThucHien || currentUserName}</b></span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Không hiển thị nội dung diễn giải ở dòng mã chứng từ */}
                        <td className="pe-4 border-0"></td>
                      </tr>

                      {/* Các dòng con (Sub-rows) khi Mở rộng */}
                      {isExpanded && group.items.map((log, itemIdx) => {
                        const isChecked = selectedIds.includes(log.id);

                        return (
                          <tr
                            key={log.id}
                            style={{ 
                              cursor: "pointer", 
                              backgroundColor: "#ffffff",
                              borderBottom: "1px dashed var(--border)"
                            }}
                            onClick={() => setSelectedLog(log)}
                            className="hover-row group-sub-row"
                          >
                            {/* Checkbox con - căn top thẳng hàng với SKU/Tên hàng */}
                            <td 
                              className="text-center border-0 ps-3 pe-2" 
                              style={{ verticalAlign: "top", paddingTop: 9, width: 56 }} 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                className="form-check-input m-0"
                                checked={isChecked}
                                onChange={(e) => handleToggleRow(log.id, e as any)}
                                style={{ cursor: "pointer", width: 15, height: 15 }}
                              />
                            </td>

                            {/* Cột Tên hàng hoá kèm Chi tiết hoạt động biến động ở ngay bên dưới */}
                            <td className="border-0 ps-2" style={{ verticalAlign: "top", paddingTop: 6, paddingBottom: 6 }}>
                              <div className="ps-3 d-flex flex-column gap-1">
                                {/* Hàng 1: Nhánh cây + SKU + Tên hàng hoá */}
                                <div className="d-flex align-items-center gap-2" style={{ minHeight: 21 }}>
                                  <i className="bi bi-arrow-return-right text-muted opacity-60 flex-shrink-0" style={{ fontSize: 12 }} />
                                  <span className="badge bg-secondary-subtle text-dark border px-2 py-0.5 font-monospace" style={{ fontSize: 10.5 }}>
                                    {log.inventoryItem?.code || "SKU"}
                                  </span>
                                  <span className="fw-semibold text-foreground text-truncate-1" style={{ fontSize: 13, maxWidth: "550px" }} title={log.inventoryItem?.tenHang}>
                                    {log.inventoryItem?.tenHang || "Sản phẩm không rõ"}
                                  </span>
                                </div>
                                {/* Hàng 2: Chi tiết hoạt động biến động nằm dưới tên hàng hoá với khoảng trống và bullet chuẩn */}
                                <div className="text-muted d-flex flex-wrap align-items-center gap-x-2 gap-y-1 ps-4" style={{ fontSize: 11.5, marginTop: 1 }}>
                                  <span>Số lượng: <b className="text-foreground">{(log.type === "nhap" || (log.type === "dieu-chinh" && (log.soLuongSau ?? 0) > (log.soLuongTruoc ?? 0))) ? `+${log.soLuong}` : `-${log.soLuong}`} {log.inventoryItem?.donVi || "Cái"}</b></span>
                                  {log.fromWarehouse && (
                                    <span className="d-inline-flex align-items-center gap-1 ms-1">
                                      <span className="text-muted opacity-40">•</span>
                                      <span>Từ: <b className="text-dark">{log.fromWarehouse.name}</b></span>
                                    </span>
                                  )}
                                  {log.toWarehouse && (
                                    <span className="d-inline-flex align-items-center gap-1 ms-2">
                                      <span className="text-muted opacity-40">•</span>
                                      <span>Đến: <b className="text-dark">{log.toWarehouse.name}</b></span>
                                    </span>
                                  )}
                                  {log.soLuongTruoc !== null && log.soLuongSau !== null && (
                                    <span className="d-inline-flex align-items-center gap-1 ms-2 text-secondary-emphasis">
                                      <span className="text-muted opacity-40">•</span>
                                      <span>Tồn: {log.soLuongTruoc} ➔ {log.soLuongSau}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Ghi chú item */}
                            <td className="pe-4 text-muted border-0" style={{ verticalAlign: "top", paddingTop: 8, fontSize: 11.5, lineHeight: 1.35 }}>
                              <div className="text-truncate-2">
                                {log.lyDo || group.lyDo || "Theo chứng từ"}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>



        {/* ── 3. TablePagination ở đáy thẻ card chính ── */}
        <div className="border-top px-3 py-2 bg-light mt-auto flex-shrink-0" style={{ borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <TablePagination
            currentCount={paginatedGroups.length}
            totalCount={totalCount}
            itemName="chứng từ"
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>

      {/* ── Side Offcanvas Detail Drawer (410px width) ── */}
      {selectedLog && (
        <>
          {/* Backdrop */}
          <div 
            className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-25" 
            style={{ zIndex: 1040 }}
            onClick={() => setSelectedLog(null)}
          />
          {/* Offcanvas Drawer */}
          <div 
            className="position-fixed top-0 end-0 h-100 bg-card border-start shadow-lg d-flex flex-column"
            style={{ 
              width: "410px", 
              zIndex: 1050, 
              background: "var(--card)", 
              color: "var(--foreground)",
              transition: "transform 0.3s ease",
              transform: "translateX(0)"
            }}
          >
            {/* Header */}
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-text text-primary fs-5" />
                <div>
                  <h6 className="fw-bold mb-0">Chi tiết biến động thực tế</h6>
                  <small className="text-muted" style={{ fontSize: 11 }}>Mã: {selectedLog.soChungTu || "N/A"}</small>
                </div>
              </div>
              <button 
                type="button" 
                className="btn-close shadow-none" 
                onClick={() => setSelectedLog(null)}
              />
            </div>

            {/* Content Body */}
            <div className="flex-grow-1 p-3 overflow-auto custom-scrollbar" style={{ fontSize: 13 }}>
              {/* Core Metadata */}
              <div className="p-3 bg-light rounded-3 mb-3 border">
                <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                  <span className="text-muted">Thời gian ghi nhận</span>
                  <span className="fw-bold">{new Date(selectedLog.createdAt).toLocaleString("vi-VN")}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                  <span className="text-muted">Loại hoạt động</span>
                  <span className={`badge rounded-pill border ${actionBadgeMap[selectedLog.type]?.class}`}>
                    {actionBadgeMap[selectedLog.type]?.label || selectedLog.type.toUpperCase()}
                  </span>
                </div>
                <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                  <span className="text-muted">Người thực hiện</span>
                  <span className="fw-bold">{selectedLog.nguoiThucHien || currentUserName}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="text-muted">Đơn giá định mức</span>
                  <span className="text-muted">{selectedLog.donGia ? `${selectedLog.donGia.toLocaleString("vi-VN")} đ` : "—"}</span>
                </div>
              </div>

              {/* Item Info */}
              <h6 className="fw-bold mb-2 d-flex align-items-center gap-1">
                <i className="bi bi-box-seam text-secondary" />
                Thông tin hàng hoá
              </h6>
              <div className="p-3 rounded-3 border mb-3">
                <div className="mb-2">
                  <span className="text-muted d-block small">Tên hàng hoá / vật tư</span>
                  <span className="fw-bold text-dark">{selectedLog.inventoryItem?.tenHang || "N/A"}</span>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <span className="text-muted d-block small">Mã SKU</span>
                    <span className="fw-bold text-primary" style={{ fontFamily: "monospace" }}>{selectedLog.inventoryItem?.code || "N/A"}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block small">Số lượng biến động</span>
                    <span className="fw-bold text-dark">
                      {(selectedLog.type === "nhap" || (selectedLog.type === "dieu-chinh" && (selectedLog.soLuongSau ?? 0) > (selectedLog.soLuongTruoc ?? 0))) ? `+${selectedLog.soLuong}` : `-${selectedLog.soLuong}`} {selectedLog.inventoryItem?.donVi || "Cái"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warehouses & Location Details */}
              <h6 className="fw-bold mb-2 d-flex align-items-center gap-1">
                <i className="bi bi-geo-alt text-secondary" />
                Kho hàng & Đối soát số lượng
              </h6>
              <div className="p-3 rounded-3 border mb-3 bg-light-subtle">
                {selectedLog.fromWarehouse && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Kho nguồn (Xuất)</span>
                    <span className="fw-bold">{selectedLog.fromWarehouse.name}</span>
                  </div>
                )}
                {selectedLog.toWarehouse && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Kho nhận (Nhập)</span>
                    <span className="fw-bold">{selectedLog.toWarehouse.name}</span>
                  </div>
                )}
                {selectedLog.soLuongTruoc !== null && (
                  <div className="d-flex justify-content-between mb-2 pt-2 border-top">
                    <span className="text-muted">Số lượng trước biến động</span>
                    <span className="text-dark">{selectedLog.soLuongTruoc}</span>
                  </div>
                )}
                {selectedLog.soLuongSau !== null && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Số lượng sau biến động</span>
                    <span className="fw-bold text-dark">{selectedLog.soLuongSau}</span>
                  </div>
                )}
              </div>

              {/* Incidents or Notes */}
              <h6 className="fw-bold mb-2 d-flex align-items-center gap-1">
                <i className="bi bi-chat-left-dots text-secondary" />
                Diễn giải / Ghi nhận hiện trường
              </h6>
              <div className="p-3 rounded-3 border mb-3 bg-light">
                <p className="mb-0 text-dark small" style={{ lineHeight: 1.4 }}>
                  {selectedLog.lyDo || "Không ghi nhận phát sinh sự cố hoặc chênh lệch ngoại lệ."}
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-3 border-top bg-light text-end">
              <button 
                className="btn btn-secondary rounded-pill px-4" 
                style={{ fontSize: 12 }}
                onClick={() => setSelectedLog(null)}
              >
                Đóng lại
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirm Dialog Modal for Deletion */}
      <ConfirmDialogModal
        open={showConfirmDelete}
        title={
          groupToDelete 
            ? `Xác nhận xoá chứng từ ${groupToDelete.docCode}` 
            : logToDelete 
              ? "Xác nhận xoá nhật ký kho" 
              : `Xác nhận xoá ${selectedIds.length} bản ghi nhật ký kho`
        }
        message={
          <div>
            <p className="mb-2">
              {groupToDelete ? (
                <>Bạn có chắc chắn muốn xoá toàn bộ chứng từ <b className="text-primary">{groupToDelete.docCode}</b> bao gồm <b>{groupToDelete.items.length}</b> mặt hàng?</>
              ) : logToDelete ? (
                <>Bạn có chắc chắn muốn xoá bản ghi của mặt hàng <b className="text-primary">{logToDelete.inventoryItem?.tenHang || logToDelete.soChungTu || logToDelete.id}</b>?</>
              ) : (
                <>Bạn có chắc chắn muốn xoá <b>{selectedIds.length}</b> bản ghi nhật ký kho đã chọn?</>
              )}
            </p>
            <div className="alert alert-warning py-2 px-3 small mb-0 rounded-3 border-0 bg-warning-subtle text-warning-emphasis" style={{ fontSize: 12.5 }}>
              <i className="bi bi-exclamation-triangle-fill me-1" />
              Hệ thống sẽ <b>tự động hoàn tác số lượng tồn kho</b> tương ứng với từng phiếu bị xoá. Hành động này không thể hoàn tác.
            </div>
          </div>
        }
        confirmLabel="Xoá dữ liệu"
        cancelLabel="Huỷ bỏ"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) {
            setShowConfirmDelete(false);
            setLogToDelete(null);
            setGroupToDelete(null);
          }
        }}
      />

      {/* Embedded style tag for hover transitions */}
      <style dangerouslySetInnerHTML={{ __html: `
        .text-truncate-1 {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .text-truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hover-row:hover {
          background-color: color-mix(in srgb, var(--primary) 4%, transparent) !important;
        }
        .text-success-light {
          color: #34d399 !important;
        }
      `}} />
    </>
  );
}
