"use client";

import React from "react";
import { X, PackageSearch, Tag, Layers, Info, MapPin, Database, Clock, Package } from "lucide-react";

interface Item {
  id: string;
  tenHang: string;
  code: string | null;
  brand: string | null;
  model: string | null;
  version: string | null;
  color: string | null;
  donVi: string | null;
  soLuong: number;
  soLuongMin: number;
  trangThai: string;
  imageUrl: string | null;
  categoryName: string | null;
  giaNhap: number;
  giaBan: number;
  spec: string | null;
  thongSoKyThuat: string | null;
  ghiChu: string | null;
  stocks: any[];
  updatedAt: string | null;
  source: string;
}

interface Props {
  item: Item | null;
  open: boolean;
  onClose: () => void;
}

export function LogisticsItemDetailOffcanvas({ item, open, onClose }: Props) {
  if (!item) return null;

  const formatCurrency = (val: number) => {
    if (!val || val === 0) return "—";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`offcanvas-backdrop fade ${open ? "show" : ""}`} 
        style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none" }}
        onClick={onClose}
      />

      {/* Offcanvas Content */}
      <div 
        className={`offcanvas offcanvas-end ${open ? "show" : ""}`} 
        tabIndex={-1} 
        style={{ 
          width: 420, 
          visibility: open ? "visible" : "hidden",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
          background: "var(--card)"
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 d-flex align-items-center justify-content-between bg-light bg-opacity-50">
          <div className="d-flex align-items-center gap-2">
            <div 
              style={{ 
                width: 38, height: 38, borderRadius: 10, 
                background: "linear-gradient(135deg, rgba(0,48,135,0.1) 0%, rgba(0,48,135,0.05) 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--primary)", border: "1px solid rgba(0,48,135,0.1)",
                boxShadow: "0 2px 6px rgba(0,48,135,0.05)"
              }}
            >
              <PackageSearch size={20} />
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 16 }}>Chi tiết vật tư</h5>
              <p className="text-muted small mb-0" style={{ fontSize: 11 }}>Mã định danh: {item.code}</p>
            </div>
          </div>
          <button type="button" className="btn-close shadow-none" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-0 custom-scrollbar">
          {/* Hero Section with Image */}
          <div className="p-4 border-bottom text-center bg-white">
            <div 
              style={{ 
                width: 140, height: 140, borderRadius: 20, 
                background: "var(--border)", margin: "0 auto 16px",
                overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
              }}
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.tenHang} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted opacity-20">
                  <Package size={48} />
                </div>
              )}
            </div>
            <h4 className="fw-bold mb-1" style={{ fontSize: 18 }}>{item.tenHang}</h4>
            <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
              <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1 border border-primary border-opacity-10">
                {item.categoryName || "Chưa phân loại"}
              </span>
              <span className={`badge rounded-pill px-3 py-1 border border-opacity-10 ${
                item.trangThai === "con-hang" ? "bg-success-subtle text-success border-success" : 
                item.trangThai === "sap-het" ? "bg-warning-subtle text-warning border-warning" : 
                "bg-danger-subtle text-danger border-danger"
              }`}>
                {item.trangThai === "con-hang" ? "Còn hàng" : item.trangThai === "sap-het" ? "Sắp hết" : "Hết hàng"}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-4 border-bottom">
            <div className="row g-3">
              <div className="col-6">
                <div className="p-3 rounded-4 bg-light border text-center h-100">
                  <p className="text-muted small mb-1" style={{ fontSize: 11 }}>Tồn kho hiện tại</p>
                  <h3 className="fw-bold mb-0 text-primary">{item.soLuong}</h3>
                  <p className="text-muted mb-0" style={{ fontSize: 10 }}>{item.donVi || "Cái"}</p>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-4 bg-light border text-center h-100">
                  <p className="text-muted small mb-1" style={{ fontSize: 11 }}>Định mức tối thiểu</p>
                  <h3 className="fw-bold mb-0">{item.soLuongMin}</h3>
                  <p className="text-muted mb-0" style={{ fontSize: 10 }}>{item.donVi || "Cái"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Details Sections */}
          <div className="p-4">
            <section className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Info size={16} className="text-primary" />
                <h6 className="fw-bold mb-0 text-uppercase" style={{ fontSize: 12, letterSpacing: "0.05em" }}>Thông tin cơ bản</h6>
              </div>
              <div className="d-flex flex-column gap-3">
                <DetailRow label="Thương hiệu" value={item.brand} />
                <DetailRow label="Kiểu dáng" value={item.model || item.spec} />
                <DetailRow label="Giá nhập dự kiến" value={formatCurrency(item.giaNhap)} />
                <DetailRow label="Giá bán niêm yết" value={formatCurrency(item.giaBan)} />
              </div>
            </section>

            <section className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Layers size={16} className="text-primary" />
                <h6 className="fw-bold mb-0 text-uppercase" style={{ fontSize: 12, letterSpacing: "0.05em" }}>Thông số & Ghi chú</h6>
              </div>
              <div className="bg-light rounded-4 p-3 border">
                <div className="mb-3">
                  <p className="text-muted small mb-1" style={{ fontSize: 11 }}>Thông số kỹ thuật:</p>
                  <p className="mb-0 small" style={{ whiteSpace: "pre-wrap" }}>{item.thongSoKyThuat || "Chưa có thông số chi tiết"}</p>
                </div>
                <div>
                  <p className="text-muted small mb-1" style={{ fontSize: 11 }}>Ghi chú nội bộ:</p>
                  <p className="mb-0 small text-muted italic" style={{ fontSize: 12 }}>{item.ghiChu || "Không có ghi chú"}</p>
                </div>
              </div>
            </section>

            <section className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <MapPin size={16} className="text-primary" />
                <h6 className="fw-bold mb-0 text-uppercase" style={{ fontSize: 12, letterSpacing: "0.05em" }}>Phân bổ tồn kho</h6>
              </div>
              <div className="d-flex flex-column gap-2">
                {item.stocks && item.stocks.length > 0 ? item.stocks.map((s: any) => (
                  <div key={s.id} className="d-flex align-items-center justify-content-between p-2 px-3 rounded-pill bg-light border border-opacity-50">
                    <span className="small fw-bold text-muted">{s.warehouse?.name}</span>
                    <span className="badge bg-white text-dark border rounded-pill px-3">{s.soLuong} {item.donVi}</span>
                  </div>
                )) : (
                  <div className="text-center p-3 text-muted small bg-light rounded-4 border border-dashed">
                    Chưa có lịch sử nhập kho
                  </div>
                )}
              </div>
            </section>

            <section className="mb-4 pt-3 border-top">
              <div className="d-flex align-items-center justify-content-between text-muted">
                <div className="d-flex align-items-center gap-2" style={{ fontSize: 11 }}>
                  <Clock size={12} />
                  <span>Cập nhật lần cuối:</span>
                </div>
                <span className="fw-bold" style={{ fontSize: 11 }}>
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString("vi-VN") : "N/A"}
                </span>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .offcanvas { transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .offcanvas-backdrop { transition: opacity 0.4s ease; z-index: 1040; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="d-flex align-items-center justify-content-between border-bottom border-dashed pb-2">
      <span className="text-muted small" style={{ fontSize: 12 }}>{label}</span>
      <span className="fw-bold" style={{ fontSize: 13 }}>{value || "—"}</span>
    </div>
  );
}
