"use client";

import React from "react";
import { X, PackageSearch, Tag, Layers, Info, MapPin, Database, Clock, Package, Trash2, Pencil } from "lucide-react";

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

import toast from "react-hot-toast";

interface Props {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
}

export function LogisticsItemDetailOffcanvas({ item, open, onClose, onEdit, onDelete }: Props) {
  const [isEditingPrice, setIsEditingPrice] = React.useState(false);
  const [editPriceVal, setEditPriceVal] = React.useState<number | string>(0);
  const [savingPrice, setSavingPrice] = React.useState(false);

  const handleSavePrice = async () => {
    if (!item?.id) return;
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/production/materials/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giaBan: Number(editPriceVal) })
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      toast.success("Cập nhật giá bán lẻ thành công");
      item.giaBan = Number(editPriceVal);
      setIsEditingPrice(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPrice(false);
    }
  };

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
          background: "var(--card)",
          display: "flex",
          flexDirection: "column"
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
              <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 16 }}>
                {item.source === "inventory" ? "Chi tiết sản phẩm" : "Chi tiết vật tư"}
              </h5>
              <p className="text-muted small mb-0" style={{ fontSize: 11 }}>Mã định danh: {item.code}</p>
            </div>
          </div>
          <button type="button" className="btn-close shadow-none" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-0 custom-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
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
                <div className="d-flex align-items-center justify-content-between p-2 rounded-3 hover-bg-light transition-all">
                  <span className="text-muted" style={{ fontSize: 13 }}>Giá bán niêm yết</span>
                  {isEditingPrice ? (
                    <div className="d-flex align-items-center gap-1">
                      <input 
                        type="number" 
                        className="form-control form-control-sm text-end" 
                        value={editPriceVal} 
                        onChange={e => setEditPriceVal(e.target.value)} 
                        style={{ width: 100, fontSize: 13 }}
                      />
                      <button className="btn btn-sm btn-success py-0 px-1" onClick={handleSavePrice} disabled={savingPrice}>
                        <i className="bi bi-check2"></i>
                      </button>
                      <button className="btn btn-sm btn-light py-0 px-1 border" onClick={() => setIsEditingPrice(false)}>
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="text-end text-primary fw-bold d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                      {formatCurrency(item.giaBan)}
                      {item.source === "material" && (
                        <i 
                          className="bi bi-pencil cursor-pointer text-muted ms-1" 
                          style={{ cursor: "pointer", fontSize: 11 }} 
                          onClick={() => { setIsEditingPrice(true); setEditPriceVal(item.giaBan || 0); }} 
                          title="Cập nhật giá bán lẻ"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Layers size={16} className="text-primary" />
                <h6 className="fw-bold mb-0 text-uppercase" style={{ fontSize: 12, letterSpacing: "0.05em" }}>Thông số & Ghi chú</h6>
              </div>
              <div className="d-flex flex-column gap-3">
                <div className="bg-light rounded-4 p-3 border">
                  <p className="text-muted fw-bold mb-2 text-uppercase" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Thông số kỹ thuật</p>
                  {item.thongSoKyThuat ? (
                    <div 
                      className="custom-scrollbar text-foreground"
                      style={{
                        maxHeight: 220,
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                        fontSize: 12,
                        paddingRight: 8,
                        textAlign: "justify"
                      }}
                    >
                      {item.thongSoKyThuat
                        .replace(/(\s\d+\.)/g, '\n\n$1')
                        .replace(/(\s-\s)/g, '\n$1')
                        .replace(/(Kích thước[:\s])/gi, '\n\n$1')
                        .trim()
                      }
                    </div>
                  ) : (
                    <p className="mb-0 small text-muted fst-italic">Chưa có thông số chi tiết</p>
                  )}
                </div>

                <div className="bg-warning-subtle text-warning-emphasis rounded-4 p-3 border border-warning border-opacity-25">
                  <div className="d-flex gap-2">
                    <Info size={14} className="mt-1 flex-shrink-0 text-warning" />
                    <div>
                      <p className="fw-bold mb-1 text-warning text-uppercase" style={{ fontSize: 10, letterSpacing: "0.05em" }}>Ghi chú nội bộ</p>
                      {item.ghiChu ? (
                        <p className="mb-0" style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{item.ghiChu}</p>
                      ) : (
                        <p className="mb-0 fst-italic opacity-75" style={{ fontSize: 12 }}>Không có ghi chú</p>
                      )}
                    </div>
                  </div>
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

        {/* Footer Actions */}
        {(onEdit || onDelete) && (
          <div className="offcanvas-footer border-top p-3 d-flex gap-2 bg-light bg-opacity-50 flex-shrink-0">
            {onDelete && (
              <button 
                type="button"
                className="btn btn-outline-danger flex-fill d-flex align-items-center justify-content-center gap-2 fw-semibold shadow-none"
                onClick={() => onDelete(item)}
                style={{ fontSize: 13, height: 38, borderRadius: 10 }}
              >
                <Trash2 size={16} />
                {item.source === "inventory" ? "Xoá sản phẩm" : "Xoá vật tư"}
              </button>
            )}
            {onEdit && (
              <button 
                type="button"
                className="btn btn-primary flex-fill d-flex align-items-center justify-content-center gap-2 fw-bold shadow-none"
                onClick={() => onEdit(item)}
                style={{ fontSize: 13, height: 38, borderRadius: 10 }}
              >
                <Pencil size={16} />
                Chỉnh sửa
              </button>
            )}
          </div>
        )}
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
