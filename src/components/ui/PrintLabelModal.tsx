"use client";
import React, { useState, useEffect } from "react";
import { PrintPreviewModal, printDocumentById } from "./PrintPreviewModal";

export interface PrintLabelItem {
  name: string;
  code?: string | null;
  color?: string | null;
  giaBan?: number | null;
  imageUrl?: string | null;
}

export interface PrintLabelModalProps {
  open: boolean;
  onClose: () => void;
  items: PrintLabelItem[];
}

export function PrintLabelModal({ open, onClose, items }: PrintLabelModalProps) {
  const [hidePrice, setHidePrice] = useState(true);
  const [selectedItemIndexesForPrint, setSelectedItemIndexesForPrint] = useState<number[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<number, number>>({});
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    if (open) {
      // Mặc định chọn tất cả
      setSelectedItemIndexesForPrint(items.map((_, idx) => idx));
      const initialQty: Record<number, number> = {};
      items.forEach((_, idx) => { initialQty[idx] = items.length === 1 ? 9 : 3; });
      setPrintQuantities(initialQty);

      // Fetch company info
      fetch("/api/company")
        .then(res => res.json())
        .then(data => setCompanyInfo(data))
        .catch(console.error);
    }
  }, [open, items]);

  if (!open) return null;

  return (
    <PrintPreviewModal
      title="Xem trước nhãn in"
      onClose={onClose}
      documentId="print-label-content"
      printOrientation="landscape"
      printMargins="1cm"
      actions={
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => printDocumentById("print-label-content", "landscape", "In nhãn Seajong", true, "0")}
        >
          <i className="bi bi-printer me-1"></i> In nhãn
        </button>
      }
      sidebar={
        <div className="p-0 border-end d-flex flex-column" style={{ width: 350, height: "100%" }}>
          <div className="p-3 border-bottom bg-light">
            <h6 className="fw-semibold mb-2">Chọn hàng hoá để in nhãn</h6>
            <div className="form-check form-switch mb-0">
              <input 
                type="checkbox" 
                className="form-check-input shadow-none" 
                id="hidePriceSwitch"
                checked={hidePrice}
                onChange={(e) => setHidePrice(e.target.checked)}
              />
              <label className="form-check-label fw-medium text-secondary" htmlFor="hidePriceSwitch" style={{ fontSize: 13, cursor: "pointer" }}>
                Ẩn giá bán trên tem nhãn (***)
              </label>
            </div>
          </div>
          <div className="flex-grow-1" style={{ overflowY: "auto", overflowX: "hidden" }}>
            <table className="table table-sm table-hover table-borderless align-middle mb-0" style={{ fontSize: 13 }}>
              <thead className="table-light sticky-top shadow-sm" style={{ zIndex: 1 }}>
                <tr>
                  <th className="text-center" style={{ width: 40 }}>
                    <input 
                      type="checkbox" 
                      className="form-check-input"
                      checked={selectedItemIndexesForPrint.length === items.length && items.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIndexesForPrint(items.map((_, idx) => idx));
                        } else {
                          setSelectedItemIndexesForPrint([]);
                        }
                      }}
                    />
                  </th>
                  <th>Mã/Tên SP</th>
                  <th className="text-center" style={{ width: 80 }}>SL in</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-bottom">
                    <td className="text-center">
                      <input 
                        type="checkbox" 
                        className="form-check-input"
                        checked={selectedItemIndexesForPrint.includes(idx)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemIndexesForPrint(prev => [...prev, idx]);
                            setPrintQuantities(prev => ({ ...prev, [idx]: prev[idx] || 3 }));
                          } else {
                            setSelectedItemIndexesForPrint(prev => prev.filter(i => i !== idx));
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div className="fw-medium text-truncate" style={{ maxWidth: 220 }} title={it.name}>{it.name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{it.code || "N/A"}</div>
                    </td>
                    <td className="text-center">
                      <input 
                        type="number" 
                        className="form-control form-control-sm text-center" 
                        style={{ width: 60, padding: 2, display: "inline-block", fontSize: 13 }}
                        value={printQuantities[idx] ?? ""}
                        onChange={e => {
                          const val = e.target.value;
                          setPrintQuantities(prev => ({ ...prev, [idx]: val === "" ? "" : Number(val) }));
                        }}
                        onBlur={e => {
                          const val = Number(e.target.value);
                          if (!val || val <= 0) {
                            setPrintQuantities(prev => ({ ...prev, [idx]: 3 }));
                          } else {
                            setPrintQuantities(prev => ({ ...prev, [idx]: Math.ceil(val / 3) * 3 }));
                          }
                        }}
                        disabled={!selectedItemIndexesForPrint.includes(idx)}
                        min={3}
                        step={3}
                      />
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-4">Chưa có hàng hoá nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      }
      document={
        <div id="print-label-content">
          {(() => {
            const selectedItems: PrintLabelItem[] = [];
            items.forEach((it, idx) => {
              if (selectedItemIndexesForPrint.includes(idx)) {
                const qty = printQuantities[idx] || 3;
                for (let i = 0; i < qty; i++) {
                  selectedItems.push(it);
                }
              }
            });
            
            const totalPages = Math.max(1, Math.ceil(selectedItems.length / 9));
            
            return Array.from({ length: totalPages }).map((_, pageIndex) => (
              <div key={pageIndex} style={{ width: "297mm", height: "209mm", padding: "10mm", background: "#fff", margin: "0 auto", boxSizing: "border-box", pageBreakAfter: "always", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", overflow: "hidden" }}>
                <table style={{ width: "100%", height: "189mm", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <tbody>
                    {[...Array(3)].map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {[...Array(3)].map((_, colIndex) => {
                          const itemIdx = pageIndex * 9 + rowIndex * 3 + colIndex;
                          const item = selectedItems[itemIdx];
                          if (!item) return <td key={colIndex} style={{ width: "33.33%", height: "63mm", padding: "4px" }}></td>;
                          
                          // Mặc định WooCommerce không tìm theo SKU, nên dùng item.name (hoặc model) để tìm kiếm sẽ chính xác hơn
                          const searchQuery = encodeURIComponent(item.name || item.code || "");
                          const qrData = encodeURIComponent(`https://seajong.com/?s=${searchQuery}&post_type=product`);
                          
                          return (
                          <td key={colIndex} style={{ width: "33.33%", height: "63mm", padding: "4px" }}>
                            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", border: "1px solid #ddd" }}>
                              {/* Header */}
                              <div style={{ background: "#2B3D6B", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px" }}>
                                 <div className="d-flex align-items-center bg-white rounded px-1" style={{ height: 22 }}>
                                   {companyInfo?.logoUrl && <img src={companyInfo.logoUrl} style={{ height: 18, objectFit: "contain" }} alt="logo" />}
                                 </div>
                                 <div className="fw-semibold" style={{ fontSize: 9 }}>KOREAN TECHNOLOGY</div>
                              </div>
                              
                              {/* Body */}
                              <div style={{ display: "flex", flex: 1, padding: "8px", gap: "8px", background: "#fff" }}>
                                 {/* Product Image */}
                                 <div style={{ width: "25%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {item.imageUrl ? (
                                      <img src={item.imageUrl} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", mixBlendMode: "multiply" }} alt="product" />
                                    ) : (
                                      <div className="d-flex align-items-center justify-content-center bg-light rounded" style={{ width: "100%", aspectRatio: "1", color: "#ccc" }}>
                                        <i className="bi bi-box-seam" style={{ fontSize: 32 }}></i>
                                      </div>
                                    )}
                                 </div>
                                 
                                 {/* Details */}
                                 <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", fontSize: 11 }}>
                                    <div className="fw-bold" style={{ color: "#2B3D6B", fontSize: 12, marginBottom: 4, textTransform: "uppercase", lineHeight: 1.2 }}>
                                      {item.name || "Sản phẩm Seajong"}
                                    </div>
                                    <div className="mt-1">Mã SP: <b style={{ fontSize: 12 }}>{item.code || "N/A"}</b></div>
                                    <div className="mt-1">Màu: <b>{item.color || "N/A"}</b></div>
                                    <div className="mt-1">Giá: <b>{hidePrice ? "***" : (item.giaBan ? item.giaBan.toLocaleString("vi-VN") : "N/A")}</b></div>
                                    <div className="mt-1">Bảo hành đến: <b>5 năm</b></div>
                                 </div>
                                 
                                 {/* QR Code */}
                                 <div style={{ width: "22%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}`} style={{ maxWidth: "100%", maxHeight: "100%" }} alt="qr" />
                                 </div>
                              </div>
                              
                              {/* Footer */}
                              <div style={{ background: "#2B3D6B", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", fontSize: 10 }}>
                                 <div className="d-flex align-items-center"><i className="bi bi-globe me-1"></i> {companyInfo?.website || "https://seajong.com/"}</div>
                                 <div className="d-flex align-items-center"><i className="bi bi-telephone-fill me-1"></i> {companyInfo?.phone || "1900.633.862"}</div>
                              </div>
                            </div>
                          </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ));
          })()}
        </div>
      }
    />
  );
}
