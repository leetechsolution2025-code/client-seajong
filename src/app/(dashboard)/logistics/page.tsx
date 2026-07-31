
"use client";

import React, { useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogisticsInventory } from "@/components/logistics/inventory/LogisticsInventory";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table, TableColumn } from "@/components/ui/Table";
import { XuatKhoModal } from "@/components/plan-finance/kho_hang/XuatKhoModal";
import { NhapKhoModal } from "@/components/plan-finance/kho_hang/NhapKhoModal";
import { useToast } from "@/components/ui/Toast";
import { DynamicTicker } from "@/components/layout/DynamicTicker";

export default function LogisticsOverviewPage() {
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set());
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [showXuatKhoModal, setShowXuatKhoModal] = useState(false);
  const [xuatKhoOrderType, setXuatKhoOrderType] = useState<"so" | "wo" | "manual">("manual");
  const [xuatKhoSoId, setXuatKhoSoId] = useState<string | undefined>(undefined);
  const [xuatKhoWoId, setXuatKhoWoId] = useState<string | undefined>(undefined);
  const [xuatKhoTicketId, setXuatKhoTicketId] = useState<string | undefined>(undefined);
  const [showNhapKhoModal, setShowNhapKhoModal] = useState(false);
  const [nhapKhoTaskId, setNhapKhoTaskId] = useState<string | undefined>(undefined);
  
  // Mobile tab state
  const [activeTab, setActiveTab] = useState<"orders" | "inventory">("orders");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IMPORT" | "EXPORT">("ALL");
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<Set<string>>(new Set());
  
  const toast = useToast();
  const prevOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async (isPolling = false) => {
      try {
        const res = await fetch("/api/logistics/overview-orders");
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((d: any, index: number) => {
            const rawId = d.code || d.id;
            const parts = rawId.split('-');
            const suffix = parts[parts.length - 1] || `${index}`;
            let exportCode = `LXK-202607-${suffix}`;
            if (d.type === "material-export") exportCode = `LXK-VATTU-${suffix}`;
            if (d.type === "material-import") exportCode = `LNK-OQC-${suffix}`;
            if (d.type === "logistics-ticket") exportCode = d.code;
            return { ...d, exportCode };
          });
          
          // Update raw orders directly, grouping and collapse logic is handled in render
          if (!mounted) return;

          if (isPolling) {
            const newIds = new Set<string>(mapped.map((m: any) => m.id as string));
            if (prevOrderIds.current.size > 0) { // Only notify if it's not the initial load masquerading as polling
              const addedOrders = mapped.filter((m: any) => !prevOrderIds.current.has(m.id));
              if (addedOrders.length > 0) {
                toast.info(
                  "Lệnh xuất kho mới", 
                  `Kế toán vừa phê duyệt thêm ${addedOrders.length} lệnh xuất kho.`
                );
              }
            }
            prevOrderIds.current = newIds;
            // Dùng JSON.stringify so sánh để tránh render lại nếu data không đổi (tuỳ chọn)
            setRawOrders(mapped);
          } else {
            prevOrderIds.current = new Set<string>(mapped.map((m: any) => m.id as string));
            // Đánh dấu tất cả là đã đọc ở lần tải đầu tiên để ẩn chữ "Mới"
            setReadOrderIds(new Set<string>(mapped.map((m: any) => m.id as string)));
            setRawOrders(mapped);
            setLoading(false);
          }
        }
      } catch (error) {
        // Suppress network errors during polling (e.g. dev server restarted, offline)
        if (!isPolling) {
          console.error("Fetch export orders error:", error);
          if (mounted) setLoading(false);
        }
      }
    };

    const fetchStaff = async () => {
      try {
        const res = await fetch("/api/logistics/staff");
        if (res.ok) {
          const data = await res.json();
          setStaffList(data);
        }
      } catch (error) {
        console.error("Fetch staff error:", error);
      }
    };

    fetchOrders(false);
    fetchStaff();

    const interval = setInterval(() => {
      // Chỉ poll dữ liệu nếu tab đang hiển thị để tránh lỗi và tiết kiệm tài nguyên
      if (document.visibilityState === "visible") {
        fetchOrders(true);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRowClick = async (row: any) => {
    setReadOrderIds(prev => new Set(prev).add(row.id));
    setSelectedOrder(row);
    setFetchingDetails(true);
    setOrderDetails([]);
    
    try {
      let items: any[] = [];
      if (row.type === "contract") {
        const res = await fetch(`/api/plan-finance/contracts/${row.id}`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.quotation?.items ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.donVi }));
        }
      } else if (row.type === "retail-invoice") {
        const res = await fetch(`/api/plan-finance/retail-invoices/${row.id}`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.items ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.dvt }));
        }
      } else if (row.type === "sale-order") {
        const res = await fetch(`/api/plan-finance/sales/${row.id}`);
        if (res.ok) {
          const detail = await res.json();
          if (detail.logisticsItems) {
            items = detail.logisticsItems.map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.donVi, type: it.type, isShortage: it.isShortage }));
          } else {
            items = (detail.saleOrderItems ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.inventoryItem?.donVi }));
          }
        }
      } else if (row.type === "material-export" || row.type === "material-import" || row.type === "logistics-ticket") {
        // Dữ liệu items đã có sẵn từ API overview-orders
        items = (row.items ?? []).map((it: any) => {
          const isLacking = row.type === "logistics-ticket" ? (it.pickedQty || 0) < (it.requestedQty || 0) : it.isShortage;
          return { 
            name: it.tenHang || it.inventoryItem?.tenHang, 
            qty: it.soLuong || it.requestedQty, 
            pickedQty: it.pickedQty,
            unit: it.donVi || it.inventoryItem?.donVi, 
            type: it.type, 
            isShortage: isLacking 
          };
        });
        
        // Nếu là logistics-ticket nhưng không có items (do thiếu mã vật tư khi tạo) thì fallback lấy từ đơn hàng
        if (items.length === 0 && row.type === "logistics-ticket" && row.saleOrderId) {
          const res = await fetch(`/api/plan-finance/sales/${row.saleOrderId}`);
          if (res.ok) {
            const detail = await res.json();
            if (detail.logisticsItems) {
              const filterType = row.ticketType === "MATERIAL_PICKING" ? "Kho Vật Tư Phụ Kiện (KVP)" : "Kho Hàng Hoá (KHO-CHINH)";
              items = detail.logisticsItems
                .filter((it: any) => it.type === filterType)
                .map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.donVi, type: it.type, isShortage: it.isShortage }));
            }
          }
        }
      }
      setOrderDetails(items);
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingDetails(false);
    }
  };

  const orders = React.useMemo(() => {
    const grouped = rawOrders.reduce((acc: Record<string, any[]>, curr: any) => {
      const isImport = curr.type === 'material-import';
      if (typeFilter === "IMPORT" && !isImport) return acc;
      if (typeFilter === "EXPORT" && isImport) return acc;

      const code = curr.saleOrderCode || curr.code || "Khác";
      if (!acc[code]) acc[code] = [];
      acc[code].push(curr);
      return acc;
    }, {});
    
    const groupArray = Object.entries(grouped)
      .filter(([code]) => code !== "Khác")
      .map(([orderCode, items]) => {
        let completedCount = 0;
        let totalTickets = items.length;
        let latestDate = 0;
        
        items.forEach(it => {
          const lowerStatus = (it.trangThai || "").toLowerCase();
          if (lowerStatus === "completed" || lowerStatus === "done") {
            completedCount++;
          }
          const time = new Date(it.ngayGiao || it.createdAt).getTime();
          if (time > latestDate) latestDate = time;
        });
        
        const isGroupImport = items.length > 0 && items.every(it => 
          it.type === 'material-import' || 
          it.ticketType === 'MATERIAL_IMPORT' || 
          orderCode.startsWith('QC-')
        );

        let groupStatusText = isGroupImport ? "Chưa nhập kho" : "Chưa xuất kho";
        let groupStatusColor = "bg-secondary text-white";
        
        if (completedCount === totalTickets && totalTickets > 0) {
          groupStatusText = isGroupImport ? "Đã nhập kho" : "Đã xuất kho";
          groupStatusColor = "bg-success text-white";
        } else if (completedCount > 0) {
          groupStatusText = isGroupImport ? "Đã nhập một phần" : "Đã xuất một phần";
          groupStatusColor = "bg-warning text-dark";
        }
        
        // Priority: 0 for incomplete (Chưa xuất kho, Đã xuất một phần), 1 for complete (Đã xuất kho)
        const priority = (groupStatusText.includes("Đã xuất kho") || groupStatusText.includes("Đã nhập kho")) ? 1 : 0;
        
        return {
          orderCode,
          items,
          completedCount,
          totalTickets,
          groupStatusText,
          groupStatusColor,
          priority,
          latestDate
        };
      });
      
    // Sort groups
    groupArray.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.latestDate - a.latestDate;
    });

    const finalOrders = [];
    groupArray.forEach((group, index) => {
      const { orderCode, items, groupStatusText, groupStatusColor } = group;
      
      const isToggled = collapsedGroups.has(orderCode);
      const isCollapsed = index === 0 ? isToggled : !isToggled;
      
      finalOrders.push({
        id: `group-${orderCode}`,
        isFullWidth: true,
        isGroupHeader: true,
        fullWidthContent: (
          <div 
             className="d-flex align-items-center justify-content-between w-100 pe-2" 
             style={{ cursor: 'pointer', userSelect: 'none' }}
             onClick={(e) => {
               e.stopPropagation();
               setCollapsedGroups(prev => {
                 const newSet = new Set(prev);
                 if (newSet.has(orderCode)) newSet.delete(orderCode);
                 else newSet.add(orderCode);
                 return newSet;
               });
             }}
          >
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${isCollapsed ? 'bi-caret-right-fill' : 'bi-caret-down-fill'} text-muted`}></i> 
              <span className="fw-bold" style={{ fontSize: 12 }}>SỐ HIỆU ĐƠN HÀNG: <span className="text-primary">{orderCode}</span></span>
              <span className={`badge ${groupStatusColor} rounded-pill fw-normal`} style={{ fontSize: 10 }}>{groupStatusText}</span>
            </div>
          </div>
        ),
        isAssigned: true
      });
      
      if (!isCollapsed) {
        finalOrders.push(...(items as any[]));
      }
    });

    if (grouped["Khác"]) {
      finalOrders.push(...(grouped["Khác"] as any[]));
    }
    
    return finalOrders;
  }, [rawOrders, collapsedGroups, typeFilter]);

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)", position: "relative" }}>
      <PageHeader
        title="Quản lý hệ thống kho"
        description="Quản lý dòng chảy hàng hóa & Cảnh báo an toàn kho thời gian thực."
        icon="bi-truck"
        color="blue"
      />
      <DynamicTicker pageTitle="Quản lý hệ thống kho" />

      <div className="flex-grow-1 pb-5 pb-xl-2 pt-2 px-xl-2 px-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="row flex-grow-1 m-0 h-100" style={{ minHeight: 0 }}>
          {/* Cột trái (5 phần) */}
          <div className={`col-12 col-xl-5 p-0 pe-xl-2 mb-3 mb-xl-0 flex-column h-100 ${activeTab === "orders" ? "d-flex" : "d-none d-xl-flex"}`} style={{ minHeight: 0 }}>
            <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
              <div className="px-3 px-xl-4 pt-3 pt-xl-4 pb-2 d-flex justify-content-between align-items-center">
                <SectionTitle title="Danh sách lệnh xuất nhập kho" icon="bi-card-list" className="mb-0" />
                <select 
                  className="form-select form-select-sm shadow-sm mb-0"
                  style={{ width: "120px", fontSize: 12, borderRadius: 8, cursor: "pointer" }}
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as any)}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="IMPORT">Nhập kho</option>
                  <option value="EXPORT">Xuất kho</option>
                </select>
              </div>
              <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                <Table
                  loading={loading}
                  rows={orders}
                  onRowClick={handleRowClick}
                  columns={[
                    {
                      header: (
                        <div className="form-check m-0 d-flex justify-content-center">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            checked={orders.length > 0 && selectedBatchOrders.size === orders.filter(o => !o.isAssigned && o.type !== 'material-import').length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBatchOrders(new Set(orders.filter(o => !o.isAssigned && o.type !== 'material-import').map(o => o.id)));
                              } else {
                                setSelectedBatchOrders(new Set());
                              }
                            }}
                          />
                        </div>
                      ),
                      render: (row: any) => (
                        <div className="form-check m-0 d-flex justify-content-center" onClick={e => e.stopPropagation()}>
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            disabled={row.isAssigned || row.type === 'material-import'}
                            checked={selectedBatchOrders.has(row.id) || Boolean(row.isAssigned)}
                            onChange={(e) => {
                              const newSet = new Set(selectedBatchOrders);
                              if (e.target.checked) {
                                newSet.add(row.id);
                              } else {
                                newSet.delete(row.id);
                              }
                              setSelectedBatchOrders(newSet);
                            }}
                          />
                        </div>
                      ),
                      width: "40px",
                      align: "center"
                    },
                    { 
                      header: "Mã lệnh", 
                      render: (row: any) => (
                        <div className="position-relative">
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            <div className="fw-bold text-primary">{row.exportCode}</div>
                            {row.requestedDate && (
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                <i className="bi bi-calendar-event me-1" />
                                {new Date(row.requestedDate).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                            {!readOrderIds.has(row.id) && <span className="badge bg-danger rounded-pill" style={{ fontSize: 9, padding: "2px 6px" }}>Mới</span>}
                          </div>
                          <div className="text-muted text-truncate mt-1" style={{ fontSize: 12, maxWidth: 200 }}>
                            {row.typeLabel} {row.saleOrderCode || row.code} {row.customer ? `- ${row.customer}` : ""}
                          </div>
                        </div>
                      ),
                      width: "50%" 
                    },
                    { 
                      header: "Loại", 
                      render: (row: any) => (
                        <span className={`badge bg-label-${row.type === 'material-import' ? 'success' : 'primary'} text-${row.type === 'material-import' ? 'success' : 'primary'}`} style={{ fontSize: 11 }}>
                          {row.type === 'material-import' ? 'Nhập kho' : 'Xuất kho'}
                        </span>
                      ),
                      width: "20%" 
                    },
                    { 
                      header: "Trạng thái", 
                      render: (row: any) => {
                        let statusColor = "bg-secondary";
                        let statusText = row.trangThai;
                        const lowerStatus = (row.trangThai || "").toLowerCase();
                        
                        if (lowerStatus === "active" || lowerStatus === "processing" || lowerStatus === "partial" || lowerStatus === "picking" || lowerStatus === "packing") {
                          statusColor = "bg-warning";
                          statusText = "Đang xử lý";
                        } else if (lowerStatus === "confirmed" || lowerStatus === "approved") {
                          statusColor = "bg-info";
                          statusText = "Đã xác nhận";
                        } else if (lowerStatus === "pending" || lowerStatus === "unpaid") {
                          statusColor = "bg-danger";
                          statusText = "Chờ xử lý";
                        } else if (lowerStatus === "in_production") {
                          statusColor = "bg-secondary";
                          statusText = "Đang sản xuất";
                        } else if (lowerStatus === "completed" || lowerStatus === "done") {
                          statusColor = "bg-success";
                          statusText = row.type === 'material-import' ? "Đã nhập kho" : "Đã xuất kho";
                        } else if (lowerStatus === "packed") {
                          statusColor = "bg-success";
                          statusText = "Đã gom đủ hàng";
                        }

                        return <span className={`badge ${statusColor} rounded-pill`} style={{ fontSize: 10 }}>{statusText}</span>;
                      }, 
                      width: "25%" 
                    }
                  ]}
                  emptyText="Chưa có lệnh xuất/nhập kho nào"
                  emptyIcon="bi-inbox"
                  fixedLayout={false}
                  compact={true}
                  cellStyle={() => ({ padding: "4px 8px" })}
                  wrapperClassName="mkt-plan-table-no-min flex-grow-1 table-hover"
                  wrapperStyle={{ overflowX: "hidden", cursor: "pointer" }}
                />
              </div>
              <div className="p-3 border-top bg-light mt-auto" style={{ borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                 <div 
                   className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2"
                   style={{ 
                     opacity: selectedBatchOrders.size === 0 ? 0.6 : 1, 
                     pointerEvents: selectedBatchOrders.size === 0 ? "none" : "auto",
                     transition: "all 0.3s"
                   }}
                 >
                     <div className="d-flex align-items-center gap-2 flex-grow-1">
                        <span className="text-muted fw-semibold flex-shrink-0" style={{ fontSize: 13, whiteSpace: "nowrap" }}>Người thực hiện:</span>
                        <select 
                          className="form-select form-select-sm border-secondary shadow-sm" 
                          style={{ minWidth: 150, maxWidth: 220 }}
                          value={selectedStaff}
                          onChange={e => setSelectedStaff(e.target.value)}
                        >
                           <option value="">Chọn nhân viên</option>
                           {staffList.map(staff => (
                             <option key={staff.id} value={staff.id}>{staff.fullName}</option>
                           ))}
                        </select>
                     </div>
                     <button 
                       className="btn btn-sm btn-primary px-3 fw-semibold shadow-sm"
                       disabled={!selectedStaff || selectedBatchOrders.size === 0}
                       onClick={async () => {
                         try {
                           const res = await fetch("/api/logistics/batch-packing/assign", {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({ 
                               staffId: selectedStaff, 
                               orderIds: Array.from(selectedBatchOrders) 
                             })
                           });
                           if (res.ok) {
                             toast.success("Giao việc thành công", "Đã giao việc gom hàng cho nhân viên.");
                             setSelectedBatchOrders(new Set());
                             // Trigger refetch orders
                             const resOrders = await fetch("/api/logistics/overview-orders");
                             const data = await resOrders.json();
                             const mapped = data.map((d: any, index: number) => {
                               const rawId = d.code || d.id;
                               const parts = rawId.split('-');
                               const suffix = parts[parts.length - 1] || `${index}`;
                               let exportCode = `LXK-202607-${suffix}`;
                               if (d.type === "material-export") exportCode = `LXK-VATTU-${suffix}`;
                               if (d.type === "material-import") exportCode = `LNK-OQC-${suffix}`;
                               if (d.type === "logistics-ticket") exportCode = d.code;
                               return { ...d, exportCode };
                             });
                             
                             // Update raw orders
                             setRawOrders(mapped);
                           } else {
                             toast.error("Lỗi", "Không thể giao việc.");
                           }
                         } catch (e) {}
                       }}
                     >
                        <span style={{ whiteSpace: "nowrap" }} className="d-flex align-items-center">
                          Giao việc 
                          <span className="badge bg-white text-primary ms-2 rounded-circle shadow-sm d-inline-flex align-items-center justify-content-center" style={{ width: 22, height: 22, padding: 0, fontSize: 12 }}>
                            {selectedBatchOrders.size}
                          </span>
                        </span>
                     </button>
                 </div>
              </div>
            </div>
          </div>

          {/* Cột phải (7 phần) */}
          <div className={`col-12 col-xl-7 p-0 ps-xl-2 flex-column h-100 ${activeTab === "inventory" ? "d-flex" : "d-none d-xl-flex"}`} style={{ minHeight: 0 }}>
            <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: 0 }}>
              <div 
                className="flex-grow-1 d-flex flex-column overflow-hidden"
                style={{ minHeight: 0 }}
              >
                <LogisticsInventory compactMode={true} hideActions={true} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Bottom Toolbar */}
      <div className="d-flex d-xl-none position-fixed bottom-0 start-0 w-100 bg-white border-top shadow-lg p-2 justify-content-start align-items-center gap-2" style={{ zIndex: 1030 }}>
        <button 
          onClick={() => setActiveTab("orders")}
          className={`btn rounded-pill mobile-circle-btn px-4 py-2 fw-semibold d-flex align-items-center justify-content-center ${activeTab === "orders" ? "btn-primary shadow-sm" : "btn-light text-muted"}`}
          style={{ fontSize: 14, transition: "all 0.2s" }}
        >
          <i className="bi bi-card-list me-0 me-sm-2"></i>
          <span className="d-none d-sm-inline">Lệnh kho</span>
        </button>
        <button 
          onClick={() => setActiveTab("inventory")}
          className={`btn rounded-pill mobile-circle-btn px-4 py-2 fw-semibold d-flex align-items-center justify-content-center ${activeTab === "inventory" ? "btn-primary shadow-sm" : "btn-light text-muted"}`}
          style={{ fontSize: 14, transition: "all 0.2s" }}
        >
          <i className="bi bi-box-seam me-0 me-sm-2"></i>
          <span className="d-none d-sm-inline">Hàng hoá</span>
        </button>

        {activeTab === "inventory" && (
          <button 
            onClick={() => document.getElementById("logistics-add-item-btn")?.click()}
            className="btn btn-primary rounded-pill mobile-circle-btn px-4 py-2 fw-semibold shadow-sm d-flex align-items-center justify-content-center"
            style={{ fontSize: 14, backgroundColor: "#011F58", borderColor: "#011F58" }}
          >
            <i className="bi bi-plus-lg me-0 me-sm-2"></i>
            <span className="d-none d-sm-inline">Thêm</span>
          </button>
        )}
      </div>

      {/* Offcanvas */}
      {selectedOrder && (
        <div className="offcanvas-backdrop fade show" onClick={() => setSelectedOrder(null)} style={{ zIndex: 1040 }}></div>
      )}
      <div 
        className={`offcanvas offcanvas-end ${selectedOrder ? 'show' : ''}`} 
        tabIndex={-1} 
        style={{ width: 400, zIndex: 1045 }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 bg-light">
          <div>
            <h5 className="offcanvas-title fw-bold mb-1">Lệnh {selectedOrder?.type === 'material-import' ? 'Nhập' : 'Xuất'} Kho: {selectedOrder?.exportCode}</h5>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {selectedOrder?.typeLabel} {selectedOrder?.code}
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
        </div>
        <div className="offcanvas-body p-0 custom-scrollbar bg-white">
          <div className="p-4">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-box-seam text-primary"></i> 
              Danh sách hàng hoá
            </h6>
            
            {fetchingDetails ? (
              <div className="text-center p-4 text-muted">
                <div className="spinner-border spinner-border-sm me-2"></div>
                Đang tải dữ liệu...
              </div>
            ) : orderDetails.length > 0 ? (
              <div>
                {selectedOrder?.type === "logistics-ticket" && (
                  <div className="mb-3 p-3 bg-light rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted" style={{ fontSize: 13 }}>Tiến độ gom hàng:</span>
                      <span className="fw-bold text-primary">
                        {orderDetails.filter(it => (it.pickedQty || 0) >= (it.qty || 0)).length} / {orderDetails.length} 
                        <span className="fw-normal text-muted ms-1" style={{ fontSize: 12 }}>mặt hàng</span>
                      </span>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div 
                        className={`progress-bar ${orderDetails.filter(it => (it.pickedQty || 0) >= (it.qty || 0)).length === orderDetails.length ? 'bg-success' : 'bg-primary'}`} 
                        style={{ width: `${orderDetails.length > 0 ? Math.round((orderDetails.filter(it => (it.pickedQty || 0) >= (it.qty || 0)).length / orderDetails.length) * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <Table
                  rows={orderDetails}
                  columns={[
                    { 
                      header: "Sản phẩm", 
                      render: (row: any) => (
                        <div className="d-flex flex-column">
                          <span className="fw-medium text-dark">
                            {row.name}
                            {row.isShortage && <i className="bi bi-exclamation-circle text-danger ms-2" title="Thiếu hàng trong kho" />}
                          </span>
                          {row.type && <span className="text-muted" style={{ fontSize: 11 }}><i className="bi bi-box-seam me-1"></i>{row.type}</span>}
                        </div>
                      ), 
                      width: "70%" 
                    },
                    { 
                      header: "SL", 
                      render: (row: any) => (
                        <div className="text-end fw-bold text-primary">
                          {row.pickedQty !== undefined ? (
                            <span className={row.pickedQty < row.qty ? "text-danger" : "text-success"}>
                              {row.pickedQty} / {row.qty}
                            </span>
                          ) : (
                            row.qty
                          )}
                          <span className="fw-normal text-muted ms-1" style={{ fontSize: 11 }}>{row.unit || "cái"}</span>
                        </div>
                      ), 
                      align: "right", 
                      width: "30%" 
                    }
                  ]}
                  fixedLayout={false}
                  fontSize={12}
                  wrapperClassName="border rounded-3"
                  wrapperStyle={{ overflowX: "hidden" }}
                />
              </div>
            ) : (
              <div className="text-center p-4 text-muted border border-dashed rounded-3">
                Không tìm thấy hàng hoá nào
              </div>
            )}
          </div>
        </div>
        <div className="offcanvas-footer p-3 border-top bg-light">
          <button 
            className="btn btn-primary w-100" 
            disabled={selectedOrder?.type === "logistics-ticket" && selectedOrder.trangThai !== "PACKED"}
            onClick={() => {
              if (selectedOrder?.type === "material-import") {
                setNhapKhoTaskId(selectedOrder.id);
                setShowNhapKhoModal(true);
              } else {
                let isSo = false;
                let targetId = selectedOrder?.id;

                if (selectedOrder?.type === "sale-order") {
                  isSo = true;
                } else if (selectedOrder?.type === "logistics-ticket") {
                  isSo = selectedOrder.ticketType === "BATCH_PACKING"; 
                  if (isSo) {
                    targetId = selectedOrder.saleOrderId;
                  } else {
                    targetId = selectedOrder.saleOrderCode 
                      ? selectedOrder.saleOrderCode.replace('DBH', 'LSX').replace('DHBL', 'LSX').replace('DH', 'LSX')
                      : selectedOrder.saleOrderId;
                  }
                }
                
                setXuatKhoOrderType(isSo ? "so" : "wo");
                setXuatKhoSoId(isSo ? targetId : undefined);
                setXuatKhoWoId(!isSo ? targetId : undefined);
                setXuatKhoTicketId(selectedOrder?.type === "logistics-ticket" ? selectedOrder.id : undefined);
                setShowXuatKhoModal(true);
              }
              setSelectedOrder(null);
            }}
          >
            {selectedOrder?.type === "logistics-ticket" 
              ? (selectedOrder.trangThai === "PACKED" ? "Thực hiện" 
                : selectedOrder.trangThai === "COMPLETED" || selectedOrder.trangThai === "DONE" ? "Đã xuất kho" 
                : "Chưa nhặt đủ hàng") 
              : "Thực hiện"}
          </button>
        </div>
      </div>

      {showXuatKhoModal && (
        <XuatKhoModal 
          initialMode={xuatKhoOrderType}
          initialSoId={xuatKhoSoId}
          initialWoId={xuatKhoWoId}
          initialTicketId={xuatKhoTicketId}
          onClose={() => setShowXuatKhoModal(false)}
          onSaved={() => {
            // refresh data without closing modal
            fetch("/api/logistics/overview-orders").then(r => r.json()).then(setOrderDetails);
          }}
        />
      )}

      {showNhapKhoModal && (
        <NhapKhoModal 
          initialItems={orderDetails}
          initialTaskId={nhapKhoTaskId}
          onClose={() => setShowNhapKhoModal(false)}
          onSaved={() => {
            // refresh data without closing modal
            fetch("/api/logistics/overview-orders").then(r => r.json()).then(setOrderDetails);
          }}
        />
      )}
    </div>
  );
}
