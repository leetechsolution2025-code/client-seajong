"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
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

export default function OmnichannelPage() {
  const [orders, setOrders] = useState<ShopeeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShopeeOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Lấy dữ liệu từ API
  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/sales/omnichannel/orders")
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
    <StandardPage
      title="Bán hàng đa kênh"
      description="Gom đơn từ Shopee, Lazada, TikTok và Showroom"
      icon="bi-funnel-fill"
      color="rose"
      useCard={false}
    >
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
      `}</style>

      <div className="d-flex flex-column h-100">
        {/* KPI Section */}
        <div className="row g-3 mb-3">
          <KPICard 
            label="Tổng đơn hôm nay" 
            value={orders.length} 
            icon="bi-cart-check" 
            accent="#f43f5e" 
            suffix={
              <span className="text-success ms-2" style={{ fontSize: 13, fontWeight: 700 }}>
                ↑ 15%
              </span>
            }
            subtitle="đơn hàng"
          />
          <KPICard 
            label="Chờ xác nhận" 
            value={orders.filter(o => o.status === "Chờ xác nhận").length} 
            icon="bi-hourglass-split" 
            accent="#f59e0b" 
            subtitle="đơn mới"
          />
          <KPICard 
            label="Đang chuẩn bị" 
            value={orders.filter(o => o.status === "Đã xác nhận").length} 
            icon="bi-box-seam" 
            accent="#06b6d4" 
            subtitle="đơn đã xác nhận"
          />
          <KPICard 
            label="Doanh thu Shopee" 
            value={orders.reduce((acc, o) => acc + o.amount, 0).toLocaleString("vi-VN")} 
            suffix="đ" 
            icon="bi-currency-dollar" 
            accent="#10b981" 
            subtitle="tổng thu"
          />
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-4 shadow-sm border p-3 flex-grow-1 d-flex flex-column overflow-hidden">
          
          <SectionTitle 
            title="Danh sách đơn hàng" 
            className="mb-3 px-1"
            action={
              <div className="d-flex align-items-center gap-2 bg-success-subtle px-2 py-1 rounded-pill border border-success-subtle shadow-xs" title="Shopee: Kết nối ổn định">
                 <span className="live-status-dot" />
                 <span className="fw-bold text-success" style={{ fontSize: 10 }}>LIVE</span>
                 <i className="bi bi-shop text-success ms-1" style={{ fontSize: 11 }} />
              </div>
            }
          />

          {/* ── Toolbar ── */}
          <div className="d-flex align-items-center justify-content-between mb-3 gap-3">
            <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 500 }}>
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
                placeholder="Trạng thái"
                width={160}
              />
              <SearchInput 
                value={searchTerm} 
                onChange={setSearchTerm} 
                placeholder="Tìm mã đơn, tên khách..." 
              />
            </div>
            
            <div className="d-flex align-items-center gap-2">
              {selectedIds.length > 0 && (
                <BrandButton 
                  variant="outline" 
                  icon="bi-send-fill" 
                  onClick={handleTransfer}
                  style={{ 
                    animation: "fadeIn 0.2s ease-in-out",
                    color: "var(--bs-danger)",
                    borderColor: "var(--bs-danger)"
                  }}
                >
                  Chuyển <span className="badge rounded-pill bg-danger ms-1" style={{ fontSize: 10 }}>{selectedIds.length}</span>
                </BrandButton>
              )}
              <BrandButton variant="outline" icon="bi-gear" onClick={() => setIsConfigOpen(true)}>
                Cấu hình
              </BrandButton>
              <BrandButton icon="bi-arrow-repeat">
                Đồng bộ đơn
              </BrandButton>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="flex-grow-1 overflow-auto">
            <Table 
              rows={filteredOrders} 
              columns={columns} 
              loading={loading}
              onRowClick={setSelectedOrder}
              compact
            />
          </div>
        </div>
      </div>

      <ShopeeConfigOffcanvas 
        open={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        onSuccess={(data) => console.log("Shopee Config Saved:", data)}
      />

      <ShopeeOrderDetailOffcanvas 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        onUpdateStatus={handleUpdateStatus}
      />
    </StandardPage>
  );
}
