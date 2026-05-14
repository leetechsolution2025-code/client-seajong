import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { BOMBuilderModal } from "./BOMBuilderModal";

interface InventoryDetailOffcanvasProps {
  show: boolean;
  onClose: () => void;
  item: any;
  isMaterial?: boolean;
  onRefresh?: () => void;
}

export function InventoryDetailOffcanvas({ show, onClose, item, isMaterial, onRefresh }: InventoryDetailOffcanvasProps) {
  const [showBOM, setShowBOM] = useState(false);
  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn("offcanvas-backdrop fade", show && "show")} 
        style={{ pointerEvents: show ? "auto" : "none" }}
        onClick={onClose}
      />

      {/* Offcanvas Content */}
      <div 
        className={cn("offcanvas offcanvas-end border-0 shadow", show && "show")} 
        style={{ width: 400, visibility: show ? "visible" : "hidden" }}
        tabIndex={-1}
      >
        <div className="offcanvas-header border-bottom bg-light py-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary shadow-sm p-2 rounded-3 text-white d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
              <i className={cn("bi", isMaterial ? "bi-cpu-fill" : "bi-layers-half")} style={{ fontSize: 20 }} />
            </div>
            <div>
              <h5 className="offcanvas-title fw-bold text-dark mb-0" style={{ fontSize: 16, letterSpacing: "-0.02em" }}>
                {isMaterial ? "Chi tiết Vật tư" : "Chi tiết Hàng hoá"}
              </h5>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-light text-muted border-0 fw-normal p-0" style={{ fontSize: 11 }}>{item.code || "SKU-AUTO"}</span>
                <span className="text-muted" style={{ fontSize: 10 }}>•</span>
                <span className="text-muted" style={{ fontSize: 10 }}>ID: {item.id?.substring(0,8)}</span>
              </div>
            </div>
          </div>
          <button type="button" className="btn-close shadow-none" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 custom-scrollbar">
          {/* Image Section */}
          <div className="mb-4 text-center">
            <div 
              className="mx-auto rounded-4 border bg-light d-flex align-items-center justify-content-center overflow-hidden shadow-sm"
              style={{ width: 180, height: 180 }}
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.tenHang} className="img-fluid h-100 w-100 object-fit-cover" />
              ) : (
                <i className="bi bi-image text-muted opacity-25" style={{ fontSize: 60 }} />
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="mb-4">
            <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <i className="bi bi-info-circle-fill" /> Thông tin cơ bản
            </h6>
            <div className="vstack gap-3 px-2">
              <InfoRow label="Tên gọi" value={item.tenHang} />
              <InfoRow label="Mã sản phẩm" value={item.code} />
              <InfoRow label="Danh mục" value={item.category?.name || "Chưa phân loại"} />
              <InfoRow label="Đơn vị tính" value={item.donVi || "Cái"} />
              <InfoRow label="Thương hiệu" value={item.brand || "Seajong"} />
              <InfoRow 
                label="Giá bán niêm yết" 
                value={item.giaBan ? `${item.giaBan.toLocaleString("vi-VN")} VNĐ` : "Chưa có giá"} 
                highlight 
              />
              {!isMaterial && (
                <InfoRow 
                  label="Mã định mức" 
                  value={
                    item.dinhMuc?.code ? (
                      <span 
                        className="text-primary fw-bold text-decoration-underline cursor-pointer" 
                        onClick={() => setShowBOM(true)}
                        style={{ cursor: "pointer" }}
                      >
                        {item.dinhMuc.code}
                      </span>
                    ) : (
                      "Chưa có định mức"
                    )
                  }
                  highlight={!item.dinhMuc?.code} 
                />
              )}
            </div>
          </div>

          {isMaterial && (
            <div className="mb-4 p-3 rounded-4 bg-light border-0">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                <i className="bi bi-gear-fill" /> Thông số kỹ thuật
              </h6>
              <div className="vstack gap-3">
                <InfoRow label="Chất liệu" value={item.material} />
                <InfoRow label="Quy cách" value={item.spec} />
                <InfoRow label="Mức tồn tối thiểu" value={`${item.minStock} ${item.donVi}`} highlight />
              </div>
            </div>
          )}

          {/* Inventory Status */}
          <div className="mb-4">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <i className="bi bi-house-door-fill" /> Tình trạng tồn kho
            </h6>
            <div className="p-3 border rounded-4 vstack gap-2">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Tổng tồn kho:</span>
                <span className="fw-bold fs-5 text-primary">{item.soLuong?.toLocaleString("vi-VN")}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Trạng thái:</span>
                <StatusBadge status={item.trangThai} />
              </div>
            </div>
          </div>

          {/* Notes */}
          {item.ghiChu && (
            <div className="mb-4">
              <h6 className="fw-bold text-dark mb-2" style={{ fontSize: 13 }}>Ghi chú</h6>
              <div className="p-3 bg-warning bg-opacity-10 rounded-3 text-muted small border-start border-warning border-3">
                {item.ghiChu}
              </div>
            </div>
          )}
        </div>

        <div className="offcanvas-footer p-3 border-top bg-light text-center vstack gap-2">
           <button
             className="btn btn-primary btn-sm w-100 rounded-pill py-2 fw-medium shadow-sm"
             onClick={() => setShowBOM(true)}
           >
             <i className="bi bi-diagram-3 me-2" /> Xây dựng định mức
           </button>
        </div>
      </div>

      {/* BOM Builder Fullscreen Modal */}
      <BOMBuilderModal
        show={showBOM}
        onClose={() => setShowBOM(false)}
        item={item}
        onSaved={() => { setShowBOM(false); onRefresh?.(); }}
      />
    </>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className="d-flex justify-content-between align-items-start gap-3">
      <span className="text-muted flex-shrink-0" style={{ fontSize: 12 }}>{label}:</span>
      <div className={cn("text-end text-dark fw-medium", highlight && "text-primary fw-bold")} style={{ fontSize: 12.5 }}>
        {value || "---"}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    "con-hang": { label: "Còn hàng", class: "bg-success text-success" },
    "sap-het": { label: "Sắp hết", class: "bg-warning text-warning" },
    "het-hang": { label: "Hết hàng", class: "bg-danger text-danger" },
  };
  const s = config[status] || { label: status, class: "bg-secondary text-secondary" };
  return (
    <span className={cn("badge bg-opacity-10 border px-2 py-1", s.class)} style={{ fontSize: 11 }}>
      {s.label}
    </span>
  );
}
