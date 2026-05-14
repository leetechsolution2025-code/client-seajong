"use client";

import React from "react";
import { motion } from "framer-motion";

interface TimelineEvent {
  id: string;
  date: string;
  action: string;
  actor: string;
  location: string;
  notes?: string;
  status: "success" | "warning" | "info" | "danger";
}

interface SerialDetail {
  serialNumber: string;
  productName: string;
  sku: string;
  category: string;
  status: string;
  importDate: string;
  warehouse: string;
  customer?: string;
  warrantyExpiry?: string;
  history: TimelineEvent[];
}

interface SerialDetailOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  data: SerialDetail | null;
}

export function SerialDetailOffcanvas({ isOpen, onClose, data }: SerialDetailOffcanvasProps) {
  if (!data) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="offcanvas-backdrop fade show" 
          onClick={onClose} 
          style={{ zIndex: 1040 }}
        />
      )}

      {/* Offcanvas */}
      <div 
        className={`offcanvas offcanvas-end ${isOpen ? "show" : ""}`} 
        tabIndex={-1} 
        style={{ 
          visibility: isOpen ? "visible" : "hidden", 
          zIndex: 1045,
          width: "400px",
          borderLeft: "none",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.1)"
        }}
      >
        <div className="offcanvas-header p-4 bg-light border-bottom">
          <div>
            <h5 className="offcanvas-title fw-bold text-primary mb-1">Chi tiết hồ sơ máy</h5>
            <div className="small text-muted fw-bold" style={{ fontFamily: "monospace" }}>{data.serialNumber}</div>
          </div>
          <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
        </div>

        <div className="offcanvas-body p-0">
          {/* ── Thông tin chung ── */}
          <div className="p-4 border-bottom bg-white">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-info-circle text-primary" />
              Thông tin sản phẩm
            </h6>
            <div className="row g-3">
              <div className="col-12">
                <div className="p-3 rounded-4 bg-light border border-opacity-10">
                  <div className="fw-bold text-foreground mb-1">{data.productName}</div>
                  <div className="small text-muted d-flex justify-content-between">
                    <span>SKU: <b className="text-dark">{data.sku}</b></span>
                    <span>Loại: <b className="text-dark">{data.category}</b></span>
                  </div>
                </div>
              </div>
              
              <div className="col-6">
                <div className="small text-muted mb-1">Trạng thái</div>
                <div className="fw-bold small">{data.status}</div>
              </div>
              <div className="col-6">
                <div className="small text-muted mb-1">Vị trí hiện tại</div>
                <div className="fw-bold small">{data.warehouse}</div>
              </div>
              <div className="col-6">
                <div className="small text-muted mb-1">Ngày nhập kho</div>
                <div className="fw-bold small">{new Date(data.importDate).toLocaleDateString("vi-VN")}</div>
              </div>
              <div className="col-6">
                <div className="small text-muted mb-1">Khách hàng</div>
                <div className="fw-bold small">{data.customer || "Chưa có"}</div>
              </div>
            </div>
          </div>

          {/* ── Lịch sử Timeline ── */}
          <div className="p-4">
            <h6 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <i className="bi bi-clock-history text-primary" />
              Lịch sử truy xuất (Timeline)
            </h6>

            <div className="position-relative ps-4 ms-2 border-start border-2 border-light">
              {data.history.map((event, index) => (
                <div key={event.id} className="mb-4 position-relative">
                  {/* Dot */}
                  <div 
                    className={`position-absolute start-0 translate-middle rounded-circle bg-${event.status} border border-4 border-white shadow-sm`}
                    style={{ left: "-18px", width: "16px", height: "16px", top: "10px" }}
                  />
                  
                  <div className="ps-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold" style={{ fontSize: 13 }}>{event.action}</span>
                      <span className="text-muted" style={{ fontSize: 11 }}>{event.date}</span>
                    </div>
                    <div className="text-muted mb-2" style={{ fontSize: 12 }}>
                      <i className="bi bi-person me-1" /> {event.actor} 
                      <span className="mx-2">•</span>
                      <i className="bi bi-geo-alt me-1" /> {event.location}
                    </div>
                    {event.notes && (
                      <div className="p-2 bg-light rounded-3 border-start border-3 border-primary border-opacity-25" style={{ fontSize: 12 }}>
                        {event.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="offcanvas-footer p-4 border-top bg-light">
          <button className="btn btn-outline-primary w-100 rounded-pill fw-bold" onClick={onClose}>
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </>
  );
}
