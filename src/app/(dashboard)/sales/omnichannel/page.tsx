"use client";

import React, { useState, useEffect, useMemo } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { KPICard } from "@/components/ui/KPICard";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ShopeeConfigOffcanvas } from "./ShopeeConfigOffcanvas";
import { ShopeeOrderDetailOffcanvas } from "./ShopeeOrderDetailOffcanvas";

interface ShopeeOrder {
  id: string;
  externalId: string;
  customer: string;
  phone?: string;
  address: string;
  amount: number;
  status: string;
  channel: string;
  createdAt: string;
  shippingDate?: string;
}

export function OmnichannelContent() {
  const [orders, setOrders] = useState<ShopeeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShopeeOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Lấy dữ liệu từ API
  const fetchOrders = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (timeFilter) params.append("time", timeFilter);
    
    fetch(`/api/sales/omnichannel/orders?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error("Lỗi tải danh sách đơn hàng");
        setIsConnected(true);
        return res.json();
      })
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsConnected(false);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [timeFilter]);

  const toggleSelectAll = () => {
    const validOrders = orders.filter(o => o.status === "Đã xác nhận");
    if (selectedIds.length === validOrders.length && validOrders.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(validOrders.map(o => o.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    const order = orders.find(o => o.id === id);
    if (order?.status !== "Đã xác nhận") return;
    
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/sales/omnichannel/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], status })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      const res = await fetch("/api/sales/omnichannel/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setSelectedOrder(null);
        fetchOrders();
      } else {
        alert("Có lỗi xảy ra khi xoá đơn hàng.");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Có lỗi xảy ra khi xoá đơn hàng.");
    }
  };

  const handleTransfer = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/sales/omnichannel/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status: "Đã chuyển" })
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to transfer orders:", error);
    }
  };

  const handleSaveConfig = async (formData: any) => {
    try {
      const res = await fetch("/api/sales/omnichannel/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Cấu hình Shopee API đã được lưu thành công vào cơ sở dữ liệu và file hệ thống .env!");
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi khi lưu cấu hình: ${err.message || err.error}`);
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
      alert("Đã xảy ra lỗi kết nối khi lưu cấu hình.");
    }
  };


  const mobileColumns: TableColumn<ShopeeOrder>[] = useMemo(() => [
    {
      header: (
        <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
          <input 
            type="checkbox" 
            className="form-check-input cursor-pointer" 
            checked={
              selectedIds.length > 0 && 
              selectedIds.length === orders.filter(o => o.status === "Đã xác nhận").length
            }
            onChange={(e) => {
              e.stopPropagation();
              toggleSelectAll();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
      width: 32,
      align: "center",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
          <input 
            type="checkbox" 
            className="form-check-input" 
            disabled={row.status !== "Đã xác nhận"}
            checked={selectedIds.includes(row.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelectRow(row.id);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: row.status === "Đã xác nhận" ? "pointer" : "not-allowed" }}
          />
        </div>
      )
    },
    {
      header: "Đơn Shopee & Khách hàng",
      render: (row) => {
        let badgeClass = "bg-light text-dark";
        if (row.status === "Chờ xác nhận") badgeClass = "bg-warning-subtle text-warning-emphasis border border-warning-subtle";
        if (row.status === "Đã xác nhận") badgeClass = "bg-info-subtle text-info-emphasis border border-info-subtle";
        if (row.status === "Đã chuyển") badgeClass = "bg-primary-subtle text-primary-emphasis border border-primary-subtle";
        if (row.status === "Từ chối") badgeClass = "bg-danger-subtle text-danger-emphasis border border-danger-subtle";
        if (row.status === "Huỷ bỏ") badgeClass = "bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle";

        return (
          <div className="d-flex flex-column py-1" style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
              <div className="d-flex align-items-center gap-1.5">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 18, height: 18, background: "#ee4d2d", color: "white" }}
                >
                  <i className="bi bi-shop" style={{ fontSize: 9 }} />
                </div>
                <code className="text-primary fw-bold" style={{ fontSize: 12 }}>{row.externalId}</code>
              </div>
              <span className={`badge rounded-pill ${badgeClass}`} style={{ fontSize: 9.5, padding: "3px 7px" }}>{row.status}</span>
            </div>
            <div className="fw-semibold text-dark text-truncate" style={{ fontSize: 12.5 }}>{row.customer}</div>
            {row.address && (
              <small className="text-muted text-truncate" style={{ fontSize: 11, marginTop: 1 }} title={row.address}>
                {row.address}
              </small>
            )}
            <div className="text-muted" style={{ fontSize: 10, marginTop: 2 }}>
              <i className="bi bi-clock me-1" />{row.createdAt}
            </div>
          </div>
        );
      }
    },
    {
      header: "Tổng tiền",
      align: "right",
      width: 95,
      render: (row) => (
        <div className="d-flex flex-column align-items-end justify-content-center py-1">
          <span className="fw-bold text-danger" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            {row.amount ? row.amount.toLocaleString("vi-VN") : "0"}
          </span>
          <span className="text-muted" style={{ fontSize: 10 }}>đ</span>
        </div>
      )
    }
  ], [orders, selectedIds]);

  const columns: TableColumn<ShopeeOrder>[] = [
    {
      header: (
        <input 
          type="checkbox" 
          className="form-check-input" 
          checked={
            selectedIds.length > 0 && 
            selectedIds.length === orders.filter(o => o.status === "Đã xác nhận").length
          }
          onChange={(e) => {
            e.stopPropagation();
            toggleSelectAll();
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "pointer" }}
        />
      ),
      width: 40,
      align: "center",
      render: (row) => (
        <input 
          type="checkbox" 
          className="form-check-input" 
          disabled={row.status !== "Đã xác nhận"}
          checked={selectedIds.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelectRow(row.id);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: row.status === "Đã xác nhận" ? "pointer" : "not-allowed" }}
        />
      )
    },
    {
      header: "Kênh",
      render: (row) => (
        <div className="d-flex align-items-center gap-2">
          <div 
            className="rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 24, height: 24, background: "#ee4d2d", color: "white" }}
          >
            <i className="bi bi-shop" style={{ fontSize: 12 }} />
          </div>
          <span className="fw-semibold" style={{ fontSize: 12 }}>{row.channel}</span>
        </div>
      )
    },
    {
      header: "Mã đơn Shopee",
      render: (row) => <code className="text-primary fw-bold" style={{ fontSize: 12 }}>{row.externalId}</code>
    },
    {
      header: "Khách hàng",
      render: (row) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold" style={{ fontSize: 13 }}>{row.customer}</span>
          <small className="text-muted text-truncate" style={{ fontSize: 11, maxWidth: 250 }} title={row.address}>
            {row.address}
          </small>
        </div>
      )
    },
    {
      header: "Tổng tiền",
      align: "right",
      render: (row) => <span className="fw-bold" style={{ fontSize: 13 }}>{row.amount.toLocaleString("vi-VN")}đ</span>
    },
    {
      header: "Trạng thái",
      render: (row) => {
        let badgeStyle = { fontSize: 10, padding: "4px 8px" };
        let badgeClass = "bg-light text-dark";
        if (row.status === "Chờ xác nhận") badgeClass = "bg-warning-subtle text-warning-emphasis border border-warning-subtle";
        if (row.status === "Đã xác nhận") badgeClass = "bg-info-subtle text-info-emphasis border border-info-subtle";
        if (row.status === "Đã chuyển") badgeClass = "bg-primary-subtle text-primary-emphasis border border-primary-subtle";
        if (row.status === "Từ chối") badgeClass = "bg-danger-subtle text-danger-emphasis border border-danger-subtle";
        if (row.status === "Huỷ bỏ") badgeClass = "bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle";
        
        return <span className={`badge rounded-pill ${badgeClass}`} style={badgeStyle}>{row.status}</span>
      }
    },
    {
      header: "Đặt hàng",
      render: (row) => <span className="text-muted" style={{ fontSize: 12 }}>{row.createdAt}</span>
    },
    {
      header: "Giao hàng",
      render: (row) => <span className="text-muted" style={{ fontSize: 12 }}>{row.createdAt}</span>
    }
  ];

  // Bộ lọc dữ liệu
  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    const matchesSearch = 
      order.externalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <>
      <style>{`
        @keyframes live-blink {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .live-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #10b981;
          display: inline-block;
          animation: live-blink 2s infinite ease-in-out;
        }
        .live-status-dot-offline {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #ef4444;
          display: inline-block;
        }
      `}</style>

      <div className="d-flex flex-column h-100">

        {/* Main Content Card */}
        <FullWidthTableLayout
          className="flex-grow-1 overflow-hidden"
          style={{ minHeight: 0 }}
          header={
            <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                <div className="flex-fill" style={{ minWidth: isMobile ? 0 : 180 }}>
                  <FilterSelect 
                    options={[
                      { label: "Tất cả trạng thái", value: "" },
                      { label: "Chờ xác nhận", value: "Chờ xác nhận" },
                      { label: "Đã xác nhận", value: "Đã xác nhận" },
                      { label: "Đã chuyển", value: "Đã chuyển" },
                      { label: "Từ chối", value: "Từ chối" },
                      { label: "Huỷ bỏ", value: "Huỷ bỏ" },
                    ]} 
                    value={statusFilter} 
                    onChange={setStatusFilter} 
                    placeholder="Tất cả trạng thái"
                    width={isMobile ? "100%" : 180}
                  />
                </div>
                <div className="flex-fill" style={{ minWidth: isMobile ? 0 : 150 }}>
                  <FilterSelect 
                    options={[
                      { label: "Hôm nay", value: "today" },
                      { label: "Hôm qua", value: "yesterday" },
                      { label: "Tuần này", value: "this_week" },
                      { label: "Tuần trước", value: "last_week" },
                      { label: "Tháng này", value: "this_month" },
                      { label: "Tháng trước", value: "last_month" },
                      { label: "Năm nay", value: "this_year" },
                    ]}
                    value={timeFilter}
                    onChange={setTimeFilter}
                    placeholder="Thời gian"
                    width={isMobile ? "100%" : 150}
                  />
                </div>
              </div>

              {/* Tìm kiếm và Nút thao tác (cùng hàng trên Mobile, tách 2 phía trên Desktop) */}
              <div className="d-flex align-items-center gap-2 flex-grow-1 justify-content-between justify-content-md-end">
                <div className="flex-grow-1" style={{ maxWidth: isMobile ? "none" : 300, minWidth: 0 }}>
                  <SearchInput 
                    value={searchTerm} 
                    onChange={setSearchTerm} 
                    placeholder="Tìm kiếm..." 
                  />
                </div>
            
                <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-md-auto">
                  <div className="d-flex align-items-center gap-1.5 me-1 me-md-2" title={isConnected ? "Shopee: Kết nối ổn định" : "Chưa kết nối..."}>
                     <span className={isConnected ? "live-status-dot" : "live-status-dot-offline"} />
                     <span className={`fw-bold ${isConnected ? "text-success" : "text-danger"}`} style={{ fontSize: 11, letterSpacing: "0.5px" }}>{isConnected ? "LIVE" : "OFFLINE"}</span>
                  </div>
                  {selectedIds.length > 0 && (
                    <button
                      className="btn btn-danger px-2.5 d-flex align-items-center justify-content-center gap-1"
                      style={{
                        height: 34,
                        fontSize: "12px",
                        borderRadius: 8,
                        fontWeight: 700,
                        whiteSpace: "nowrap"
                      }}
                      onClick={handleTransfer}
                    >
                      <i className="bi bi-send-fill" />
                      Chuyển ({selectedIds.length})
                    </button>
                  )}
                  <button
                    className="btn btn-outline-primary px-2.5 px-md-3 d-flex align-items-center justify-content-center gap-1.5"
                    style={{
                      height: 34,
                      fontSize: "12.5px",
                      borderRadius: 8,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      border: "1px solid #003087",
                      color: "#003087",
                      backgroundColor: "transparent"
                    }}
                    onClick={() => setIsConfigOpen(true)}
                  >
                    <i className="bi bi-gear" />
                    <span>{isMobile ? "" : "Cấu hình"}</span>
                  </button>
                  <button
                    className="btn btn-primary px-2.5 px-md-3 d-flex align-items-center justify-content-center gap-1.5"
                    style={{
                      height: 34,
                      fontSize: "12.5px",
                      backgroundColor: "#003087",
                      borderColor: "#003087",
                      borderRadius: 8,
                      fontWeight: 700,
                      whiteSpace: "nowrap"
                    }}
                    onClick={fetchOrders}
                  >
                    <i className="bi bi-arrow-repeat" />
                    <span>{isMobile ? "Đồng bộ" : "Đồng bộ đơn"}</span>
                  </button>
                </div>
              </div>
            </div>
        }
        table={
            <Table 
              rows={filteredOrders} 
              columns={isMobile ? mobileColumns : columns} 
              loading={loading}
              onRowClick={setSelectedOrder}
              compact
              wrapperClassName="mkt-plan-table-no-min"
              wrapperStyle={{ overflowY: "auto", overflowX: isMobile ? "hidden" : "auto", flex: 1, minHeight: 0 }}
            />
          }
        />
      </div>

      <ShopeeConfigOffcanvas 
        open={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        onSuccess={handleSaveConfig}
      />

      <ShopeeOrderDetailOffcanvas 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDeleteOrder}
      />
    </>
  );
}

export default function OmnichannelPage() {
  return (
    <StandardPage
      title="Bán hàng đa kênh"
      description="Gom đơn từ Shopee, Lazada, TikTok và Showroom"
      icon="bi-funnel-fill"
      color="rose"
      useCard={false}
    >
      <OmnichannelContent />
    </StandardPage>
  );
}
