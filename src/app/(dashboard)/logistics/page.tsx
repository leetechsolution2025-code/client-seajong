
"use client";

import React, { useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogisticsInventory } from "@/components/logistics/inventory/LogisticsInventory";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table, TableColumn } from "@/components/ui/Table";
import { XuatKhoModal } from "@/components/plan-finance/kho_hang/XuatKhoModal";
import { useToast } from "@/components/ui/Toast";
import { DynamicTicker } from "@/components/layout/DynamicTicker";

export default function LogisticsOverviewPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set());
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [showXuatKhoModal, setShowXuatKhoModal] = useState(false);
  const [xuatKhoOrderType, setXuatKhoOrderType] = useState<"so" | "wo" | "manual">("manual");
  const [xuatKhoSoId, setXuatKhoSoId] = useState<string | undefined>(undefined);
  const [xuatKhoWoId, setXuatKhoWoId] = useState<string | undefined>(undefined);
  
  // Mobile tab state
  const [activeTab, setActiveTab] = useState<"orders" | "inventory">("orders");
  
  const toast = useToast();
  const prevOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async (isPolling = false) => {
      try {
        const res = await fetch("/api/plan-finance/sales-active");
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((d: any, index: number) => {
            const rawId = d.code || d.id;
            const parts = rawId.split('-');
            const suffix = parts[parts.length - 1] || `${index}`;
            const exportCode = d.type === "material-export" ? `LXK-VATTU-${suffix}` : `LXK-202607-${suffix}`;
            return { ...d, exportCode };
          });
          
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
            setOrders(mapped);
          } else {
            prevOrderIds.current = new Set<string>(mapped.map((m: any) => m.id as string));
            // Đánh dấu tất cả là đã đọc ở lần tải đầu tiên để ẩn chữ "Mới"
            setReadOrderIds(new Set<string>(mapped.map((m: any) => m.id as string)));
            setOrders(mapped);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Fetch export orders error:", error);
        if (!isPolling && mounted) setLoading(false);
      }
    };

    fetchOrders(false);

    const interval = setInterval(() => {
      fetchOrders(true);
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
      } else if (row.type === "material-export") {
        // Dữ liệu items đã có sẵn từ API sales-active
        items = (row.items ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.donVi }));
      }
      setOrderDetails(items);
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingDetails(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)", position: "relative" }}>
      <PageHeader
        title="Quản lý hệ thống kho"
        description="Quản lý dòng chảy hàng hóa & Cảnh báo an toàn kho thời gian thực."
        icon="bi-truck"
        color="blue"
      />
      <DynamicTicker pageTitle="Quản lý hệ thống kho" />

      <div className="flex-grow-1 pb-5 pb-xl-4 pt-2 px-xl-4 px-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="row flex-grow-1 m-0 h-100" style={{ minHeight: 0 }}>
          {/* Cột trái (5 phần) */}
          <div className={`col-12 col-xl-5 p-0 pe-xl-2 mb-3 mb-xl-0 flex-column h-100 ${activeTab === "orders" ? "d-flex" : "d-none d-xl-flex"}`} style={{ minHeight: 0 }}>
            <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
              <div className="px-4 pt-4 pb-2">
                <SectionTitle title="Danh sách lệnh xuất nhập kho" icon="bi-card-list" />
              </div>
              <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                <Table
                  loading={loading}
                  rows={orders}
                  onRowClick={handleRowClick}
                  columns={[
                    { 
                      header: "Mã lệnh", 
                      render: (row: any) => (
                        <div className="position-relative">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <div className="fw-bold text-primary">{row.exportCode}</div>
                            {!readOrderIds.has(row.id) && <span className="badge bg-danger rounded-pill" style={{ fontSize: 9, padding: "2px 6px" }}>Mới</span>}
                          </div>
                          <div className="text-muted text-truncate" style={{ fontSize: 12, maxWidth: 200 }}>
                            {row.typeLabel} {row.code} {row.customer ? `- ${row.customer}` : ""}
                          </div>
                        </div>
                      ),
                      width: "55%" 
                    },
                    { 
                      header: "Loại", 
                      render: (row: any) => (
                        <span className="badge bg-label-primary text-primary" style={{ fontSize: 11 }}>Xuất kho</span>
                      ),
                      width: "20%" 
                    },
                    { 
                      header: "Trạng thái", 
                      render: (row: any) => {
                        let statusColor = "bg-secondary";
                        let statusText = row.trangThai;
                        
                        if (row.trangThai === "active" || row.trangThai === "processing" || row.trangThai === "partial") {
                          statusColor = "bg-warning";
                          statusText = "Đang xử lý";
                        } else if (row.trangThai === "confirmed" || row.trangThai === "approved") {
                          statusColor = "bg-info";
                          statusText = "Đã xác nhận";
                        } else if (row.trangThai === "pending" || row.trangThai === "unpaid") {
                          statusColor = "bg-danger";
                          statusText = "Chờ xử lý";
                        } else if (row.trangThai === "in_production") {
                          statusColor = "bg-secondary";
                          statusText = "Đang sản xuất";
                        } else if (row.trangThai === "completed" || row.trangThai === "done") {
                          statusColor = "bg-success";
                          statusText = "Hoàn thành";
                        }

                        return <span className={`badge ${statusColor} rounded-pill`} style={{ fontSize: 10 }}>{statusText}</span>;
                      }, 
                      width: "25%" 
                    }
                  ]}
                  emptyText="Chưa có lệnh xuất/nhập kho nào"
                  emptyIcon="bi-inbox"
                  fixedLayout={false}
                  wrapperClassName="mkt-plan-table-no-min flex-grow-1 table-hover"
                  wrapperStyle={{ overflowX: "hidden", cursor: "pointer" }}
                />
              </div>
            </div>
          </div>

          {/* Cột phải (7 phần) */}
          <div className={`col-12 col-xl-7 p-0 ps-xl-2 flex-column h-100 ${activeTab === "inventory" ? "d-flex" : "d-none d-xl-flex"}`} style={{ minHeight: 0 }}>
            <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
              <div 
                className="flex-grow-1 custom-scrollbar d-flex flex-column overflow-hidden pt-4 px-2 px-md-4 pb-3"
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
          className={`btn rounded-pill px-4 py-2 fw-semibold ${activeTab === "orders" ? "btn-primary shadow-sm" : "btn-light text-muted"}`}
          style={{ fontSize: 14, transition: "all 0.2s" }}
        >
          <i className="bi bi-card-list me-2"></i>
          Lệnh kho
        </button>
        <button 
          onClick={() => setActiveTab("inventory")}
          className={`btn rounded-pill px-4 py-2 fw-semibold ${activeTab === "inventory" ? "btn-primary shadow-sm" : "btn-light text-muted"}`}
          style={{ fontSize: 14, transition: "all 0.2s" }}
        >
          <i className="bi bi-box-seam me-2"></i>
          Hàng hoá
        </button>

        {activeTab === "inventory" && (
          <button 
            onClick={() => document.getElementById("logistics-add-item-btn")?.click()}
            className="btn btn-primary rounded-pill px-4 py-2 fw-semibold shadow-sm"
            style={{ fontSize: 14, backgroundColor: "#011F58", borderColor: "#011F58" }}
          >
            <i className="bi bi-plus-lg me-2"></i>
            Thêm
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
            <h5 className="offcanvas-title fw-bold mb-1">Lệnh Xuất Kho: {selectedOrder?.exportCode}</h5>
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
                    { header: "SL", render: (row: any) => <div className="text-end fw-bold text-primary">{row.qty} <span className="fw-normal text-muted" style={{ fontSize: 11 }}>{row.unit || "cái"}</span></div>, align: "right", width: "30%" }
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
          <button className="btn btn-primary w-100" onClick={() => {
            const isSo = selectedOrder?.type === "sale-order";
            setXuatKhoOrderType(isSo ? "so" : "wo");
            setXuatKhoSoId(isSo ? selectedOrder?.id : undefined);
            setXuatKhoWoId(!isSo ? selectedOrder?.id : undefined);
            setShowXuatKhoModal(true);
            setSelectedOrder(null);
          }}>
            Thực hiện
          </button>
        </div>
      </div>

      {showXuatKhoModal && (
        <XuatKhoModal 
          initialMode={xuatKhoOrderType}
          initialSoId={xuatKhoSoId}
          initialWoId={xuatKhoWoId}
          onClose={() => setShowXuatKhoModal(false)}
          onSaved={() => {
            setShowXuatKhoModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
