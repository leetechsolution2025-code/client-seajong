"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";

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
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("all"); // all, today, 7days, 30days
  
  // Loading & Selected states
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<StockMovement | null>(null);

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
      const res = await fetch("/api/plan-finance/stock-movements?limit=100");
      const movements: StockMovement[] = await res.json();
      setRealMovements(movements);
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

  // Precompute local date boundaries for filtering
  const now = new Date();
  const todayStartObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfToday = todayStartObj.getTime();
  const startOfYesterday = startOfToday - 24 * 3600 * 1000;
  const endOfYesterday = startOfToday - 1;

  // Week boundary (starting Monday)
  const currentDay = todayStartObj.getDay();
  // if sunday (0), go back 6 days, otherwise go back (day - 1) days to get monday
  const diffToMonday = todayStartObj.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const startOfThisWeek = new Date(todayStartObj.getFullYear(), todayStartObj.getMonth(), diffToMonday).getTime();
  const startOfLastWeek = startOfThisWeek - 7 * 24 * 3600 * 1000;
  const endOfLastWeek = startOfThisWeek - 1;

  // Month boundary
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const endOfLastMonth = startOfThisMonth - 1;

  // Quarter boundary
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const startOfThisQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1).getTime();
  const startOfLastQuarter = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1).getTime();
  const endOfLastQuarter = startOfThisQuarter - 1;

  // Year boundary
  const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();
  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1).getTime();
  const endOfLastYear = startOfThisYear - 1;

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
    const matchesType = filterType === "all" || mv.type === filterType;

    // 3. Warehouse filter
    let matchesWarehouse = true;
    if (filterWarehouse) {
      matchesWarehouse = mv.fromWarehouseId === filterWarehouse || mv.toWarehouseId === filterWarehouse;
    }

    // 4. Date filter
    let matchesDate = true;
    if (filterDate !== "all") {
      const logTime = new Date(mv.createdAt).getTime();
      switch (filterDate) {
        case "today":
          matchesDate = logTime >= startOfToday;
          break;
        case "yesterday":
          matchesDate = logTime >= startOfYesterday && logTime <= endOfYesterday;
          break;
        case "this-week":
          matchesDate = logTime >= startOfThisWeek;
          break;
        case "last-week":
          matchesDate = logTime >= startOfLastWeek && logTime <= endOfLastWeek;
          break;
        case "this-month":
          matchesDate = logTime >= startOfThisMonth;
          break;
        case "last-month":
          matchesDate = logTime >= startOfLastMonth && logTime <= endOfLastMonth;
          break;
        case "this-quarter":
          matchesDate = logTime >= startOfThisQuarter;
          break;
        case "last-quarter":
          matchesDate = logTime >= startOfLastQuarter && logTime <= endOfLastQuarter;
          break;
        case "this-year":
          matchesDate = logTime >= startOfThisYear;
          break;
        case "last-year":
          matchesDate = logTime >= startOfLastYear && logTime <= endOfLastYear;
          break;
      }
    }

    return matchesSearch && matchesType && matchesWarehouse && matchesDate;
  });

  // Action badge mapping
  const actionBadgeMap: Record<string, { label: string; class: string }> = {
    nhap: { label: "Nhập kho", class: "bg-success-subtle text-success border-success" },
    xuat: { label: "Xuất kho", class: "bg-primary-subtle text-primary border-primary" },
    chuyen: { label: "Di chuyển", class: "bg-warning-subtle text-warning border-warning" },
    "dieu-chinh": { label: "Điều chỉnh", class: "bg-info-subtle text-info border-info" },
  };

  return (
    <div className="d-flex flex-column gap-3 h-100 position-relative">
      
      {/* ── Toolbar & Filters ── */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-1" style={{ flexShrink: 0 }}>
        {/* Search */}
        <div className="position-relative flex-grow-1" style={{ minWidth: "250px" }}>
          <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          <input 
            type="text" 
            className="form-control border shadow-sm rounded-pill ps-5 pe-4"
            style={{ height: 40, background: "var(--card)", color: "var(--foreground)", fontSize: 13 }}
            placeholder="Tìm theo SKU, tên hàng, chứng từ, nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Warehouse */}
        <select 
          className="form-select border shadow-sm rounded-pill px-4"
          style={{ width: "auto", fontSize: 13, height: 40, background: "var(--card)", color: "var(--foreground)" }}
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
        >
          <option value="">Tất cả kho hàng</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        {/* Filter Action Type */}
        <select 
          className="form-select border shadow-sm rounded-pill px-4"
          style={{ width: "auto", fontSize: 13, height: 40, background: "var(--card)", color: "var(--foreground)" }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Tất cả hoạt động</option>
          <option value="nhap">Nhập kho (Inbound)</option>
          <option value="xuat">Xuất kho (Outbound)</option>
          <option value="chuyen">Luân chuyển nội bộ</option>
          <option value="dieu-chinh">Điều chỉnh kiểm kê</option>
        </select>

        {/* Filter Time Range */}
        <select 
          className="form-select border shadow-sm rounded-pill px-4"
          style={{ width: "auto", fontSize: 13, height: 40, background: "var(--card)", color: "var(--foreground)" }}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        >
          <option value="all">Chọn thời gian</option>
          <option value="today">Hôm nay</option>
          <option value="yesterday">Hôm qua</option>
          <option value="this-week">Tuần này</option>
          <option value="last-week">Tuần trước</option>
          <option value="this-month">Tháng này</option>
          <option value="last-month">Tháng trước</option>
          <option value="this-quarter">Quý này</option>
          <option value="last-quarter">Quý trước</option>
          <option value="this-year">Năm nay</option>
          <option value="last-year">Năm trước</option>
        </select>

        <button 
          className="btn btn-outline-primary rounded-pill px-3 fw-bold d-flex align-items-center gap-2 shadow-sm"
          style={{ height: 40, fontSize: 13 }}
          onClick={() => {
            setSearch("");
            setFilterWarehouse("");
            setFilterType("all");
            setFilterDate("all");
            fetchLogs();
            toast.success("Đã làm mới", "Nhật ký kho đã được cập nhật");
          }}
        >
          <i className="bi bi-arrow-clockwise" />
          Tải lại
        </button>
      </div>

      {/* ── Timeline Activity List / Table ── */}
      <div className="app-card overflow-hidden flex-grow-1 d-flex flex-column border" style={{ borderRadius: 16, minHeight: 0, background: "var(--card)" }}>
        <div className="table-responsive flex-grow-1" style={{ overflowY: "auto" }}>
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="bg-light" style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--card)" }}>
              <tr style={{ height: 44 }}>
                <th className="ps-4 border-0 text-uppercase fw-bold text-muted" style={{ width: "180px", fontSize: 11 }}>Thời gian & Chứng từ</th>
                <th className="border-0 text-uppercase fw-bold text-muted" style={{ width: "120px", fontSize: 11 }}>Loại tác vụ</th>
                <th className="border-0 text-uppercase fw-bold text-muted" style={{ width: "180px", fontSize: 11 }}>Người thực hiện</th>
                <th className="border-0 text-uppercase fw-bold text-muted" style={{ fontSize: 11 }}>Chi tiết hoạt động biến động</th>
                <th className="pe-4 border-0 text-uppercase fw-bold text-muted" style={{ width: "280px", fontSize: 11 }}>Ghi chú / Diễn giải sự cố</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />
                    Đang truy xuất nhật ký kho...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    <i className="bi bi-journal-x fs-2 d-block mb-2 opacity-25" />
                    Không tìm thấy bản ghi nhật ký hoạt động nào
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const badge = actionBadgeMap[log.type] || { label: log.type.toUpperCase(), class: "bg-secondary-subtle text-secondary" };
                  
                  return (
                    <tr 
                      key={log.id} 
                      style={{ height: 64, cursor: "pointer", transition: "background 0.2s" }}
                      onClick={() => setSelectedLog(log)}
                      className="hover-row"
                    >
                      {/* Timestamp & Document */}
                      <td className="ps-4">
                        <div className="fw-bold text-primary" style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {log.soChungTu || "HỆ THỐNG"}
                        </div>
                        <div className="text-muted small mt-1">
                          {new Date(log.createdAt).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          })}
                        </div>
                      </td>

                      {/* Action Category Badge */}
                      <td>
                        <span className={`badge rounded-pill border ${badge.class}`} style={{ padding: "5px 10px", fontSize: "10px", fontWeight: 700 }}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Operator */}
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle bg-light d-flex align-items-center justify-content-center border" style={{ width: 28, height: 28, flexShrink: 0 }}>
                            <i className="bi bi-person text-muted" style={{ fontSize: 12 }} />
                          </div>
                          <div>
                            <div className="fw-bold text-foreground" style={{ fontSize: 12 }}>
                              {log.nguoiThucHien || currentUserName}
                            </div>
                            <div className="text-muted" style={{ fontSize: 10 }}>
                              Thủ kho / Người thao tác
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Activity detail summary */}
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-secondary-subtle text-dark border px-2 py-1" style={{ fontSize: 10, fontFamily: "monospace" }}>
                              {log.inventoryItem?.code || "N/A"}
                            </span>
                            <span className="fw-bold text-foreground text-truncate-1" style={{ fontSize: 13, maxWidth: "300px" }}>
                              {log.inventoryItem?.tenHang || "Sản phẩm không rõ"}
                            </span>
                          </div>
                          <div className="text-muted d-flex flex-wrap align-items-center gap-x-3 gap-y-1" style={{ fontSize: 11 }}>
                            <span>Số lượng: <b className="text-foreground">{(log.type === "nhap" || (log.type === "dieu-chinh" && (log.soLuongSau ?? 0) > (log.soLuongTruoc ?? 0))) ? `+${log.soLuong}` : `-${log.soLuong}`} {log.inventoryItem?.donVi || "Cái"}</b></span>
                            
                            {/* Warehouse locations */}
                            {log.fromWarehouse && (
                              <span>Từ: <b className="text-dark">{log.fromWarehouse.name}</b></span>
                            )}
                            {log.toWarehouse && (
                              <span>Đến: <b className="text-dark">{log.toWarehouse.name}</b></span>
                            )}
                            
                            {/* Stocks audit before/after */}
                            {log.soLuongTruoc !== null && log.soLuongSau !== null && (
                              <span className="text-secondary-emphasis">
                                Tồn: {log.soLuongTruoc} ➔ {log.soLuongSau}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Field Incident, Quality or physical counts */}
                      <td className="pe-4 text-muted" style={{ fontSize: 12, lineHeight: 1.3 }}>
                        <div className="text-truncate-2">
                          {log.lyDo || "Không có ghi chú thêm."}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
    </div>
  );
}
