"use client";
import React, { useState, useEffect } from "react";

interface Props {
  show: boolean;
  onClose: () => void;
  itemName: string;
  initialCost: number;
  costLabel?: string;
  initialPrice: number;
  initialMarginPct?: number;
  initialMarginType?: string;
  isBulkOnly?: boolean;
  onSaveSingle: (finalPrice: number, marginPct: number, marginType: string) => Promise<void>;
  onSaveAll?: (marginPct: number, marginType: string) => Promise<void>;
  applyAllLabel?: string;
}

export default function UpdatePriceOffcanvas({
  show,
  onClose,
  itemName,
  initialCost,
  costLabel = "Giá vốn vật tư",
  initialPrice,
  initialMarginPct,
  initialMarginType,
  isBulkOnly,
  onSaveSingle,
  onSaveAll,
  applyAllLabel
}: Props) {
  const [priceSetup, setPriceSetup] = useState({
    cost: initialCost,
    marginPct: initialMarginPct || 30,
    marginType: initialMarginType || "cost",
    finalPrice: initialPrice,
    calculatedPrice: initialPrice
  });
  const [applyAllPrice, setApplyAllPrice] = useState(false);
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [loadingMarketPrice, setLoadingMarketPrice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync initial props to state when offcanvas opens
  useEffect(() => {
    if (show) {
      const marginPct = initialMarginPct !== undefined ? initialMarginPct : 30; // Mặc định luôn là 30% nếu chưa có
      const marginType = initialMarginType || "cost";
      
      // Nếu đã có giá bán lưu trong DB, ta giữ nguyên giá bán đó
      // Còn giá tính toán sẽ dựa trên marginPct và marginType đang lưu (hoặc mặc định)
      let calculatedPrice = marginType === "revenue" 
        ? (marginPct < 100 ? Math.round((initialCost / (1 - marginPct / 100)) / 1000) * 1000 : 0)
        : Math.round((initialCost * (1 + marginPct / 100)) / 1000) * 1000;
      
      setPriceSetup({
        cost: initialCost,
        marginPct,
        marginType,
        finalPrice: calculatedPrice,
        calculatedPrice: calculatedPrice
      });
      setApplyAllPrice(false);

      // Fetch market price
      setMarketPrice(null);
      setLoadingMarketPrice(true);
      fetch(`/api/production/market-price?name=${encodeURIComponent(itemName)}`)
        .then(res => res.json())
        .then(data => setMarketPrice(data.price))
        .catch(err => console.error("Market price fetch error:", err))
        .finally(() => setLoadingMarketPrice(false));
    }
  }, [show, initialCost, initialPrice, itemName]);

  return (
    <>
      <div className={`offcanvas offcanvas-end shadow ${show ? "show" : ""}`} tabIndex={-1} style={{ width: "400px", visibility: show ? "visible" : "hidden", zIndex: 1050 }}>
        <div className="offcanvas-header border-bottom">
          <h6 className="offcanvas-title fw-bold">Tính và cập nhật giá bán</h6>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        <div className="offcanvas-body">
          <div className="row g-2 mb-3">
            {!isBulkOnly && (
              <div className="col-6">
                <label className="form-label small fw-medium">{costLabel}</label>
                <input type="text" className="form-control bg-light" disabled value={`${Math.round(priceSetup.cost).toLocaleString()} đ`} />
              </div>
            )}
            <div className={isBulkOnly ? "col-12" : "col-6"}>
              <label className="form-label small fw-medium">Lợi nhuận kỳ vọng (%)</label>
              <input type="number" step="0.1" className="form-control" value={priceSetup.marginPct} onChange={(e) => {
                const val = Number(e.target.value);
                const calculated = priceSetup.marginType === "revenue" 
                  ? (val < 100 ? Math.round((priceSetup.cost / (1 - val / 100)) / 1000) * 1000 : 0)
                  : Math.round((priceSetup.cost * (1 + val / 100)) / 1000) * 1000;
                setPriceSetup(prev => ({ ...prev, marginPct: val, finalPrice: calculated, calculatedPrice: calculated }));
              }} />
            </div>
            <div className="col-12 mt-2">
              <label className="form-label small fw-medium">Phương pháp tính lợi nhuận</label>
              <select className="form-select form-select-sm" value={priceSetup.marginType} onChange={(e) => {
                const newType = e.target.value;
                const calculated = newType === "revenue" 
                  ? (priceSetup.marginPct < 100 ? Math.round((priceSetup.cost / (1 - priceSetup.marginPct / 100)) / 1000) * 1000 : 0)
                  : Math.round((priceSetup.cost * (1 + priceSetup.marginPct / 100)) / 1000) * 1000;
                setPriceSetup(prev => ({ ...prev, marginType: newType, finalPrice: calculated, calculatedPrice: calculated }));
              }}>
                <option value="cost">Trên giá vốn (Giá bán = Giá vốn x (1 + %Lợi nhuận))</option>
                <option value="revenue">Trên doanh thu (Giá bán = Giá vốn / (1 - %Lợi nhuận))</option>
              </select>
            </div>
          </div>

          {!isBulkOnly && (
            <>
              <div className="mb-3">
                <label className="form-label small fw-medium text-primary">Giá bán tính toán</label>
                <input type="text" className="form-control text-primary fw-bold bg-light" disabled value={`${(priceSetup.calculatedPrice || 0).toLocaleString()} đ`} />
              </div>
              <hr className="my-3" />
              <div className="mb-3">
                <label className="form-label small fw-bold text-success">Giá bán chính thức áp dụng *</label>
                <input type="text" className="form-control form-control-lg text-success fw-bold" value={(priceSetup.finalPrice || 0).toLocaleString()} onChange={(e) => {
                  const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                  setPriceSetup(prev => ({ ...prev, finalPrice: val }));
                }} />
                <div className="form-text text-muted" style={{ fontSize: '11px' }}>
                  <strong>Công thức:</strong> {priceSetup.marginType === "revenue"
                    ? `${priceSetup.cost.toLocaleString()} đ / (1 - ${priceSetup.marginPct}%) = ${(priceSetup.calculatedPrice || 0).toLocaleString()} đ`
                    : `${priceSetup.cost.toLocaleString()} đ × (1 + ${priceSetup.marginPct}%) = ${(priceSetup.calculatedPrice || 0).toLocaleString()} đ`
                  }
                </div>
              </div>
            </>
          )}
        </div>
        <div className="offcanvas-footer p-3 border-top mt-auto bg-light">
          {onSaveAll && (
            <div className="form-check mb-2 text-start">
              <input className="form-check-input" type="checkbox" id="applyAllPrice" checked={isBulkOnly ? true : applyAllPrice} disabled={isBulkOnly} onChange={e => setApplyAllPrice(e.target.checked)} />
              <label className="form-check-label small" htmlFor="applyAllPrice">
                {applyAllLabel || "Áp dụng cho tất cả sản phẩm"}
              </label>
            </div>
          )}
          
          {isProcessing ? (
            <div className="mb-2">
              <div className="d-flex justify-content-between small text-muted mb-1">
                <span>Đang xử lý...</span>
                <span>Vui lòng đợi</span>
              </div>
              <div className="progress" style={{ height: "10px" }}>
                <div className="progress-bar progress-bar-striped progress-bar-animated bg-success w-100" role="progressbar"></div>
              </div>
            </div>
          ) : (
            <button className="btn btn-success w-100" onClick={async () => {
              setIsProcessing(true);
              try {
                if ((applyAllPrice || isBulkOnly) && onSaveAll) {
                  await onSaveAll(priceSetup.marginPct, priceSetup.marginType);
                } else {
                  await onSaveSingle(priceSetup.finalPrice, priceSetup.marginPct, priceSetup.marginType);
                }
              } finally {
                setIsProcessing(false);
              }
            }}>
              <i className="bi bi-check-circle me-2"></i>
              Lưu giá bán
            </button>
          )}
        </div>
      </div>
      {show && <div className="offcanvas-backdrop fade show" onClick={onClose} style={{ zIndex: 1040 }}></div>}
    </>
  );
}
