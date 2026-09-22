"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

interface ProductItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  hasBom: boolean;
  bomId: string | null;
  bomCode: string | null;
  bomName: string | null;
  warehouses?: string[];
  totalStock?: number;
}

export interface SelectedProductionItem {
  id: string;
  inventoryItemId?: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unit: string;
  hasBom?: boolean;
  bomCode?: string;
  bomId?: string;
}

interface CreateProductionRequestOffcanvasProps {
  show: boolean;
  onHide: () => void;
  onSuccess?: () => void;
}

export function CreateProductionRequestOffcanvas({
  show,
  onHide,
  onSuccess,
}: CreateProductionRequestOffcanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Danh mục sản phẩm từ API
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sản phẩm đang chọn ở picker
  const [currentProduct, setCurrentProduct] = useState<ProductItem | null>(null);
  const [currentQty, setCurrentQty] = useState<number | string>(10);
  const [currentUnit, setCurrentUnit] = useState("cái");

  // Danh sách các sản phẩm trong yêu cầu này
  const [items, setItems] = useState<SelectedProductionItem[]>([]);

  // Thời gian: Ngày bắt đầu & Ngày hoàn thành đưa lên trên cùng
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tải danh sách thành phẩm khi mở offcanvas
  useEffect(() => {
    if (show) {
      setLoadingProducts(true);
      fetch("/api/production/products")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setProducts(data);
          }
        })
        .catch((err) => console.error("Error fetching products:", err))
        .finally(() => setLoadingProducts(false));
    }
  }, [show]);

  // Click outside để đóng dropdown gợi ý sản phẩm
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form
  const resetForm = () => {
    setItems([]);
    setCurrentProduct(null);
    setCurrentQty(10);
    setCurrentUnit("cái");
    setProductSearch("");
    setShowProductDropdown(false);
    setStartDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split("T")[0]);
  };

  // Chọn sản phẩm từ danh sách gợi ý
  const handleSelectProduct = (prod: ProductItem) => {
    setCurrentProduct(prod);
    setProductSearch(prod.name);
    setCurrentUnit(prod.unit || "cái");
    setShowProductDropdown(false);
  };

  // Thêm sản phẩm vào danh sách
  const handleAddItem = () => {
    const finalName = currentProduct ? currentProduct.name : productSearch.trim();
    if (!finalName) {
      toast.error("Vui lòng chọn hoặc nhập tên sản phẩm");
      return;
    }

    const qty = Number(currentQty);
    if (!qty || qty <= 0) {
      toast.error("Số lượng phải lớn hơn 0");
      return;
    }

    // Kiểm tra trùng sản phẩm
    const existingIndex = items.findIndex(
      (i) =>
        (currentProduct && i.inventoryItemId === currentProduct.id) ||
        i.productName.toLowerCase() === finalName.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Cộng dồn số lượng
      const updated = [...items];
      updated[existingIndex].quantity += qty;
      setItems(updated);
      toast.success(`Đã cộng thêm ${qty} ${updated[existingIndex].unit} vào "${finalName}"`);
    } else {
      const newItem: SelectedProductionItem = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        inventoryItemId: currentProduct?.id,
        productName: finalName,
        productCode: currentProduct?.code,
        quantity: qty,
        unit: currentUnit || "cái",
        hasBom: currentProduct?.hasBom,
        bomCode: currentProduct?.bomCode || undefined,
        bomId: currentProduct?.bomId || undefined,
      };
      setItems((prev) => [...prev, newItem]);
      toast.success(`Đã thêm "${finalName}" vào danh sách`);
    }

    // Reset picker để chọn sản phẩm tiếp theo
    setCurrentProduct(null);
    setProductSearch("");
    setCurrentQty(10);
  };

  // Xóa sản phẩm khỏi danh sách
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Cập nhật số lượng của một mặt hàng trong danh sách
  const handleUpdateItemQty = (id: string, newQty: number) => {
    if (newQty <= 0) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );
  };

  // Submit toàn bộ yêu cầu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nếu người dùng đang nhập dở một sản phẩm mà chưa bấm thêm, tự động thêm vào
    let finalItems = [...items];
    const pendingName = currentProduct ? currentProduct.name : productSearch.trim();
    if (pendingName && Number(currentQty) > 0) {
      finalItems.push({
        id: `temp-${Date.now()}`,
        inventoryItemId: currentProduct?.id,
        productName: pendingName,
        productCode: currentProduct?.code,
        quantity: Number(currentQty),
        unit: currentUnit || "cái",
        hasBom: currentProduct?.hasBom,
        bomCode: currentProduct?.bomCode || undefined,
        bomId: currentProduct?.bomId || undefined,
      });
    }

    if (finalItems.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm vào yêu cầu sản xuất");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        items: finalItems.map((i) => ({
          productName: i.productName,
          productCode: i.productCode || null,
          inventoryItemId: i.inventoryItemId || null,
          quantity: i.quantity,
          unit: i.unit,
          dinhMucId: i.bomId || null,
        })),
        startDate,
        dueDate,
        priority: "normal",
      };

      const res = await fetch("/api/production/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(
          `Đã tạo và trình Giám đốc phê duyệt lệnh [${data.data.order.code}] gồm ${finalItems.length} mặt hàng!`,
          { duration: 4500 }
        );
        resetForm();
        if (onSuccess) onSuccess();
        onHide();
      } else {
        toast.error(data.error || "Không thể tạo yêu cầu sản xuất");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const filteredProducts = products.filter((p) => {
    if (!productSearch) return true;
    const s = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.code.toLowerCase().includes(s) ||
      (p.bomCode && p.bomCode.toLowerCase().includes(s))
    );
  });

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 4,
  };

  const inputStyle = {
    fontSize: 13,
    borderRadius: 7,
  };

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`offcanvas-backdrop fade ${show ? "show" : ""}`}
        style={{
          pointerEvents: show ? "auto" : "none",
          display: show ? "block" : "none",
          zIndex: 1040,
        }}
        onClick={onHide}
      />

      {/* Offcanvas 400px */}
      <div
        className={`offcanvas offcanvas-end border-0 shadow-lg ${show ? "show" : ""}`}
        style={{
          width: 400,
          visibility: show ? "visible" : "hidden",
          transition: "transform 0.3s ease-in-out, visibility 0.3s",
          background: "#ffffff",
          zIndex: 1045,
        }}
      >
        {/* Header */}
        <div
          className="offcanvas-header border-bottom px-4 py-3"
          style={{ background: "#f8fafc" }}
        >
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary"
              style={{ width: 34, height: 34 }}
            >
              <i className="bi bi-tools fs-6"></i>
            </div>
            <div>
              <h6 className="offcanvas-title fw-bold mb-0 text-dark" style={{ fontSize: 15 }}>
                Tạo yêu cầu sản xuất
              </h6>
              <span className="text-muted" style={{ fontSize: 11 }}>
                Trình Giám đốc phê duyệt
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-close shadow-none"
            onClick={onHide}
            disabled={loading}
          />
        </div>

        {/* Body */}
        <div className="offcanvas-body p-0 d-flex flex-column overflow-hidden">
          <form
            id="production-request-form"
            onSubmit={handleSubmit}
            className="d-flex flex-column h-100"
          >
            <div className="p-3 overflow-y-auto flex-grow-1" style={{ minHeight: 0 }}>
              <div className="d-flex flex-column gap-3">
                {/* ── 1. THỜI GIAN SẢN XUẤT (ĐƯA LÊN TRÊN CÙNG) ── */}
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label" style={labelStyle}>
                      Ngày bắt đầu
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-sm shadow-none"
                      style={inputStyle}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label" style={labelStyle}>
                      Hạn hoàn thành <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-sm shadow-none"
                      style={inputStyle}
                      value={dueDate}
                      min={startDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* ── 2. THÊM SẢN PHẨM ── */}
                <div className="border rounded-3 p-3 bg-light-subtle">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold text-dark" style={{ fontSize: 12.5 }}>
                      <i className="bi bi-plus-circle text-primary me-1"></i>Thêm sản phẩm sản xuất
                    </span>
                    {currentProduct?.hasBom && currentProduct?.bomCode && (
                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2" style={{ fontSize: 10 }}>
                        Định mức: {currentProduct.bomCode}
                      </span>
                    )}
                  </div>

                  {/* Product Picker Dropdown */}
                  <div ref={dropdownRef} className="position-relative mb-2">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-white text-muted border-end-0">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 shadow-none ps-1 bg-white"
                        style={inputStyle}
                        placeholder={loadingProducts ? "Đang tải danh sách hàng..." : "Tìm mã hoặc tên sản phẩm..."}
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                          if (currentProduct && e.target.value !== currentProduct.name) {
                            setCurrentProduct(null);
                          }
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddItem();
                          }
                        }}
                      />
                      {productSearch && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary border text-muted bg-white"
                          style={{ padding: "0 8px" }}
                          onClick={() => {
                            setProductSearch("");
                            setCurrentProduct(null);
                          }}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>

                    {/* Autocomplete list */}
                    {showProductDropdown && (
                      <div
                        className="position-absolute start-0 end-0 bg-white border rounded-3 shadow-lg mt-1 overflow-auto"
                        style={{ maxHeight: 210, zIndex: 1060 }}
                      >
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((p) => (
                            <div
                              key={p.id}
                              className="p-2 border-bottom cursor-pointer hover-bg-light transition-all"
                              style={{ cursor: "pointer", fontSize: 12 }}
                              onClick={() => handleSelectProduct(p)}
                            >
                              <div className="d-flex align-items-center justify-content-between mb-0.5">
                                <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                  <span className="fw-semibold text-primary">{p.code || "SP"}</span>
                                  {p.hasBom && p.bomCode && (
                                    <span
                                      className="badge bg-success-subtle text-success border border-success-subtle font-monospace px-1.5 py-0.5"
                                      style={{ fontSize: 9.5, fontWeight: 600 }}
                                      title="Mã định mức BOM"
                                    >
                                      {p.bomCode}
                                    </span>
                                  )}
                                </div>
                                <span className="badge bg-light text-muted border px-1" style={{ fontSize: 9.5 }}>
                                  {p.unit}
                                </span>
                              </div>
                              <div className="text-dark text-truncate" title={p.name}>
                                {p.name}
                              </div>
                              {p.warehouses && p.warehouses.length > 0 && (
                                <div className="text-muted text-truncate mt-0.5" style={{ fontSize: 10 }}>
                                  <i className="bi bi-building me-1"></i>
                                  {p.warehouses.join(" • ")}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-center text-muted" style={{ fontSize: 12 }}>
                            {productSearch ? "Không tìm thấy sản phẩm khớp." : "Chưa có sản phẩm nào"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity + Unit + Add Button */}
                  <div className="row g-2 align-items-end">
                    <div className="col-5">
                      <label className="form-label" style={labelStyle}>
                        Số lượng
                      </label>
                      <input
                        type="number"
                        className="form-control form-control-sm shadow-none font-monospace fw-bold bg-white"
                        style={inputStyle}
                        min={1}
                        value={currentQty}
                        onChange={(e) => setCurrentQty(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddItem();
                          }
                        }}
                      />
                    </div>
                    <div className="col-3">
                      <label className="form-label" style={labelStyle}>
                        ĐVT
                      </label>
                      <select
                        className="form-select form-select-sm shadow-none bg-white"
                        style={inputStyle}
                        value={currentUnit}
                        onChange={(e) => setCurrentUnit(e.target.value)}
                      >
                        <option value="cái">Cái</option>
                        <option value="bộ">Bộ</option>
                        <option value="chiếc">Chiếc</option>
                        <option value="hộp">Hộp</option>
                        <option value="thùng">Thùng</option>
                      </select>
                    </div>
                    <div className="col-4">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary w-100 d-flex align-items-center justify-content-center gap-1 shadow-none fw-semibold"
                        style={{ height: 31, fontSize: 11.5, borderRadius: 7 }}
                        onClick={handleAddItem}
                      >
                        <i className="bi bi-plus-lg"></i>
                        <span>Thêm SP</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── 3. DANH SÁCH MẶT HÀNG TRONG YÊU CẦU ── */}
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label mb-0" style={labelStyle}>
                      Danh sách sản phẩm ({items.length})
                    </label>
                    {items.length > 0 && (
                      <span className="text-muted" style={{ fontSize: 11.5 }}>
                        Tổng SL: <strong className="text-primary font-monospace">{totalQuantity}</strong>
                      </span>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <div
                      className="border border-dashed rounded-3 p-3 text-center text-muted"
                      style={{ background: "#fafafa", fontSize: 12 }}
                    >
                      <i className="bi bi-box-seam text-muted fs-5 d-block mb-1"></i>
                      <span>Chưa có sản phẩm nào trong yêu cầu.</span>
                      <div className="text-muted small mt-0.5" style={{ fontSize: 11 }}>
                        Vui lòng chọn sản phẩm và bấm &quot;Thêm SP&quot; ở trên.
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2" style={{ maxHeight: 280, overflowY: "auto" }}>
                      {items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="border rounded-3 p-2 bg-white shadow-xs position-relative"
                          style={{ fontSize: 12 }}
                        >
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="fw-semibold text-dark text-truncate" title={item.productName}>
                                <span className="text-muted me-1">{idx + 1}.</span>
                                {item.productName}
                              </div>
                              {/* Mã sản phẩm và Mã định mức BOM cạnh nhau */}
                              <div className="d-flex align-items-center gap-1.5 mt-1 flex-wrap">
                                {item.productCode && (
                                  <span className="badge bg-light text-primary border font-monospace" style={{ fontSize: 10 }}>
                                    {item.productCode}
                                  </span>
                                )}
                                {item.hasBom && item.bomCode && (
                                  <span
                                    className="badge bg-success-subtle text-success border border-success-subtle font-monospace"
                                    style={{ fontSize: 10, fontWeight: 600 }}
                                    title="Mã định mức BOM"
                                  >
                                    {item.bomCode}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quantity control & Delete */}
                            <div className="d-flex align-items-center gap-1 ms-auto flex-shrink-0">
                              <input
                                type="number"
                                className="form-control form-control-sm text-center font-monospace fw-bold p-1"
                                style={{ width: 60, height: 28, fontSize: 12, borderRadius: 5 }}
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                              />
                              <span className="text-muted small" style={{ minWidth: 26, fontSize: 11 }}>
                                {item.unit}
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger p-0 d-flex align-items-center justify-content-center border-0"
                                style={{ width: 24, height: 24 }}
                                title="Xóa mặt hàng này"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <i className="bi bi-trash3"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-top bg-light">
              <button
                type="submit"
                className="btn btn-primary w-100 shadow-sm d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                style={{ fontSize: 13, borderRadius: 7 }}
                disabled={loading || (items.length === 0 && !productSearch)}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill" style={{ fontSize: 12 }}></i>
                    <span>Trình duyệt</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .hover-bg-light:hover {
          background-color: #f8fafc;
        }
        .transition-all {
          transition: all 0.15s ease-in-out;
        }
        .shadow-xs {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
      `}</style>
    </>,
    document.body
  );
}
