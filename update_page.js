const fs = require('fs');

const code = `
"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogisticsInventory } from "@/components/logistics/inventory/LogisticsInventory";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table, TableColumn } from "@/components/ui/Table";

export default function LogisticsOverviewPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set());
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/plan-finance/sales-active");
        if (res.ok) {
          const data = await res.json();
          // Generate a fake export code for each order
          const mapped = data.map((d: any, index: number) => {
            const rawId = d.code || d.id;
            const parts = rawId.split('-');
            const suffix = parts[parts.length - 1] || \`\${index}\`;
            const exportCode = \`LXK-202607-\${suffix}\`;
            return { ...d, exportCode };
          });
          setOrders(mapped);
        }
      } catch (error) {
        console.error("Fetch export orders error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleRowClick = async (row: any) => {
    setReadOrderIds(prev => new Set(prev).add(row.id));
    setSelectedOrder(row);
    setFetchingDetails(true);
    setOrderDetails([]);
    
    try {
      let items: any[] = [];
      if (row.type === "contract") {
        const res = await fetch(\`/api/plan-finance/contracts/\${row.id}\`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.quotation?.items ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.donVi }));
        }
      } else if (row.type === "retail-invoice") {
        const res = await fetch(\`/api/plan-finance/retail-invoices/\${row.id}\`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.items ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.dvt }));
        }
      } else if (row.type === "sale-order") {
        const res = await fetch(\`/api/plan-finance/sales/\${row.id}\`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.saleOrderItems ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.inventoryItem?.donVi }));
        }
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

      <div className="flex-grow-1 pb-4 pt-2 px-4 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="row flex-grow-1 m-0 h-100" style={{ minHeight: 0 }}>
          {/* Cột trái (5 phần) */}
          <div className="col-5 p-0 pe-2 d-flex flex-column h-100">
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
                          {!readOrderIds.has(row.id) && (
                            <span className="position-absolute top-0 start-0 translate-middle p-1 bg-danger border border-light rounded-circle" style={{ marginLeft: "-10px", marginTop: "10px" }}>
                              <span className="visually-hidden">Mới</span>
                            </span>
                          )}
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <div className="fw-bold text-primary">{row.exportCode}</div>
                            {!readOrderIds.has(row.id) && <span className="badge bg-danger rounded-pill" style={{ fontSize: 9, padding: "2px 6px" }}>Mới</span>}
                          </div>
                          <div className="text-muted text-truncate" style={{ fontSize: 12, maxWidth: 200 }}>
                            {row.typeLabel} {row.code} {row.customer ? \`- \${row.customer}\` : ""}
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
                        } else if (row.trangThai === "confirmed") {
                          statusColor = "bg-info";
                          statusText = "Đã xác nhận";
                        } else if (row.trangThai === "pending" || row.trangThai === "unpaid") {
                          statusColor = "bg-danger";
                          statusText = "Chờ xử lý";
                        }

                        return <span className={\`badge \${statusColor} rounded-pill\`} style={{ fontSize: 10 }}>{statusText}</span>;
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
          <div className="col-7 p-0 ps-2 d-flex flex-column h-100">
            <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
              <div 
                className="flex-grow-1 custom-scrollbar d-flex flex-column overflow-hidden pt-4 px-4 pb-3"
                style={{ minHeight: 0 }}
              >
                <LogisticsInventory compactMode={true} hideActions={true} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offcanvas */}
      {selectedOrder && (
        <div className="offcanvas-backdrop fade show" onClick={() => setSelectedOrder(null)} style={{ zIndex: 1040 }}></div>
      )}
      <div 
        className={\`offcanvas offcanvas-end \${selectedOrder ? 'show' : ''}\`} 
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
              <div className="d-flex flex-column gap-3">
                {orderDetails.map((item, idx) => (
                  <div key={idx} className="d-flex justify-content-between p-3 border rounded-3 bg-light">
                    <div className="fw-medium text-dark">{item.name}</div>
                    <div className="fw-bold text-primary text-end" style={{ minWidth: 60 }}>
                      {item.qty} <span className="fw-normal text-muted" style={{ fontSize: 12 }}>{item.unit || "cái"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-muted border border-dashed rounded-3">
                Không tìm thấy hàng hoá nào
              </div>
            )}
          </div>
        </div>
        <div className="offcanvas-footer p-3 border-top bg-light">
          <button className="btn btn-primary w-100" onClick={() => setSelectedOrder(null)}>
            Xác nhận
          </button>
        </div>
      </div>

    </div>
  );
}
`;

fs.writeFileSync('src/app/(dashboard)/logistics/page.tsx', code);
