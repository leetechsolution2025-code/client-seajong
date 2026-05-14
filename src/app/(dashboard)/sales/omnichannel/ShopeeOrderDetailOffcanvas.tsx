"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  image?: string;
}

interface OrderDetail {
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
  items?: OrderItem[];
}

interface ShopeeOrderDetailOffcanvasProps {
  order: OrderDetail | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}

export function ShopeeOrderDetailOffcanvas({ order, onClose, onUpdateStatus }: ShopeeOrderDetailOffcanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleAction = async (status: string) => {
    if (!order) return;
    setLoading(true);
    try {
      await onUpdateStatus(order.id, status);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !order) return null;

  const open = !!order;

  const getStatusBadge = (status: string) => {
    let badgeClass = "bg-light text-dark";
    if (status === "Chờ xác nhận") badgeClass = "bg-warning-subtle text-warning-emphasis border border-warning-subtle";
    if (status === "Đã xác nhận") badgeClass = "bg-info-subtle text-info-emphasis border border-info-subtle";
    if (status === "Đã chuyển") badgeClass = "bg-primary-subtle text-primary-emphasis border border-primary-subtle";
    if (status === "Từ chối") badgeClass = "bg-danger-subtle text-danger-emphasis border border-danger-subtle";
    if (status === "Huỷ bỏ") badgeClass = "bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle";
    
    return <span className={`badge rounded-pill ${badgeClass}`} style={{ fontSize: 11, padding: "5px 12px" }}>{status}</span>;
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
        style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none", zIndex: 1040 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`offcanvas offcanvas-end border-0 shadow-lg ${open ? "show" : ""}`}
        style={{
          width: 400,
          visibility: open ? "visible" : "hidden",
          transition: "transform 0.4s cubic-bezier(0.05, 0.7, 0.1, 1), visibility 0.4s",
          background: "#fcfcfc",
          zIndex: 1045
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 bg-white sticky-top">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary p-2 rounded-3 text-white d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <i className="bi bi-receipt-cutoff fs-5" />
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 15, letterSpacing: -0.3 }}>
                Đơn hàng {order.externalId}
              </h5>
              <small className="text-muted" style={{ fontSize: 11 }}>Nguồn: {order.channel}</small>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-0 d-flex flex-column bg-white">
          <div className="flex-grow-1 overflow-auto px-4 py-3">
            
            {/* 1. THÔNG TIN KHÁCH HÀNG */}
            <div className="mb-4">
              <label className="text-muted fw-bold text-uppercase mb-2 d-block" style={{ fontSize: 10, letterSpacing: 1.5 }}>
                <i className="bi bi-person me-2"></i>Thông tin khách hàng
              </label>
              <div className="ps-3 border-start border-primary border-3">
                <div className="fw-bold text-dark mb-1" style={{ fontSize: 17, letterSpacing: -0.5 }}>{order.customer}</div>
                <div className="text-primary fw-bold mb-1" style={{ fontSize: 13 }}>
                  {order.phone || "Chưa có số điện thoại"}
                </div>
                <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {order.address}
                </div>
              </div>
            </div>

            <hr className="opacity-10 my-3" />

            {/* 2. TRẠNG THÁI & GIÁ TRỊ */}
            <div className="mb-4 row g-0">
              <div className="col-6 pe-3 border-end">
                <label className="text-muted fw-bold text-uppercase mb-1 d-block" style={{ fontSize: 10, letterSpacing: 1 }}>Trạng thái</label>
                {getStatusBadge(order.status)}
              </div>
              <div className="col-6 ps-4">
                <label className="text-muted fw-bold text-uppercase mb-1 d-block" style={{ fontSize: 10, letterSpacing: 1 }}>Tổng giá trị</label>
                <div className="fw-bold text-danger fs-5" style={{ letterSpacing: -0.8 }}>
                  {order.amount.toLocaleString("vi-VN")}<span className="ms-1 small fw-normal text-muted" style={{ fontSize: 11 }}>đ</span>
                </div>
              </div>
            </div>

            <hr className="opacity-10 my-3" />

            {/* 3. THỜI GIAN */}
            <div className="mb-4">
              <label className="text-muted fw-bold text-uppercase mb-2 d-block" style={{ fontSize: 10, letterSpacing: 1.5 }}>
                <i className="bi bi-clock me-2"></i>Tiến độ đơn hàng
              </label>
              <div className="row g-3">
                <div className="col-6">
                  <div className="text-muted mb-0" style={{ fontSize: 10 }}>Ngày đặt hàng</div>
                  <div className="fw-medium text-dark" style={{ fontSize: 12 }}>{order.createdAt}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted mb-0" style={{ fontSize: 10 }}>Ngày giao hàng</div>
                  <div className="fw-medium text-dark" style={{ fontSize: 12 }}>{order.shippingDate || "--/--/----"}</div>
                </div>
              </div>
            </div>

            <hr className="opacity-10 my-3" />

            {/* 4. DANH SÁCH HÀNG HOÁ */}
            <div className="mb-2">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="text-muted fw-bold text-uppercase m-0" style={{ fontSize: 10, letterSpacing: 1.5 }}>
                  <i className="bi bi-box me-2"></i>Sản phẩm ({order.items?.length || 0})
                </label>
              </div>
              
              <div className="d-flex flex-column gap-3">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="d-flex align-items-start gap-3">
                    <div className="bg-light rounded-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, flexShrink: 0 }}>
                       <i className="bi bi-box-seam text-muted opacity-50" style={{ fontSize: 16 }}></i>
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-bold text-dark text-truncate" style={{ fontSize: 13 }}>{item.name}</div>
                      <div className="d-flex align-items-center gap-3 mt-0">
                        <span className="text-muted" style={{ fontSize: 11 }}>SL: <b className="text-dark">{item.quantity}</b></span>
                        <span className="text-muted" style={{ fontSize: 11 }}>Đơn giá: <b className="text-dark">{item.price.toLocaleString("vi-VN")}đ</b></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="p-3 border-top bg-white d-flex gap-2 justify-content-end sticky-bottom shadow-sm">
            <BrandButton variant="outline" onClick={onClose} style={{ fontSize: 13, height: 38 }} className="px-4" disabled={loading}>
              Đóng
            </BrandButton>
            
            {order.status === "Chờ xác nhận" && (
              <>
                <BrandButton 
                  variant="outline" 
                  style={{ fontSize: 13, height: 38, borderColor: "#dc3545", color: "#dc3545" }} 
                  className="px-4"
                  onClick={() => handleAction("Từ chối")}
                  loading={loading}
                >
                  Từ chối
                </BrandButton>
                <BrandButton 
                  icon="bi-check-circle-fill" 
                  style={{ fontSize: 13, height: 38 }} 
                  className="px-4"
                  onClick={() => handleAction("Đã xác nhận")}
                  loading={loading}
                >
                  Xác nhận
                </BrandButton>
              </>
            )}

            {order.status === "Đã xác nhận" && (
              <BrandButton 
                icon="bi-send" 
                style={{ fontSize: 13, height: 38 }} 
                className="px-4"
                onClick={() => handleAction("Đã chuyển")}
                loading={loading}
              >
                Chuyển
              </BrandButton>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
