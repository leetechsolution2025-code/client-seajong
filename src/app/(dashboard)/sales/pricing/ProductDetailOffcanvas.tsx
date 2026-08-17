"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

interface ProductDetailOffcanvasProps {
  show: boolean;
  onHide: () => void;
  product: any;
}

export function ProductDetailOffcanvas({ show, onHide, product }: ProductDetailOffcanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show) {
      setCurrentImageIndex(0);
    }
  }, [show, product]);

  useEffect(() => {
    if (isPrintPreviewOpen && !companyInfo) {
      fetch("/api/company")
        .then(r => r.json())
        .then(d => setCompanyInfo(d))
        .catch(console.error);
    }
  }, [isPrintPreviewOpen, companyInfo]);

  if (!mounted || !product) return null;

  const hasMultipleImages = product.images && product.images.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  return createPortal(
    <>
      <div 
        className={`modal-backdrop fade ${show ? 'show' : ''}`}
        style={{ display: show && !isPrintPreviewOpen ? 'block' : 'none', zIndex: 1040 }}
        onClick={onHide}
      />
      
      <div 
        className={`offcanvas offcanvas-end ${show && !isPrintPreviewOpen ? 'show' : ''} d-flex flex-column`}
        tabIndex={-1}
        style={{ visibility: show && !isPrintPreviewOpen ? 'visible' : 'hidden', width: '400px', zIndex: 1045, borderLeft: 'none' }}
      >
        <div className="offcanvas-header border-bottom bg-light">
          <h5 className="offcanvas-title fs-6 fw-semibold">Chi tiết sản phẩm</h5>
          <button type="button" className="btn-close" onClick={onHide} aria-label="Close"></button>
        </div>
        
        <div className="offcanvas-body p-0 custom-scrollbar d-flex flex-column bg-white">
          {product.images && product.images.length > 0 && (
            <div className="bg-light p-3 text-center border-bottom position-relative">
              <img 
                src={product.images[currentImageIndex]} 
                alt={product.name} 
                style={{ maxHeight: "250px", objectFit: "contain", maxWidth: "100%" }}
              />
              {hasMultipleImages && (
                <>
                  <button 
                    onClick={prevImage}
                    className="btn btn-sm btn-light position-absolute top-50 start-0 translate-middle-y ms-2 rounded-circle shadow-sm"
                    style={{ width: "32px", height: "32px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <button 
                    onClick={nextImage}
                    className="btn btn-sm btn-light position-absolute top-50 end-0 translate-middle-y me-2 rounded-circle shadow-sm"
                    style={{ width: "32px", height: "32px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                  <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 d-flex gap-1">
                    {product.images.map((_: any, idx: number) => (
                      <div 
                        key={idx} 
                        style={{ 
                          width: "8px", 
                          height: "8px", 
                          borderRadius: "50%", 
                          backgroundColor: idx === currentImageIndex ? "var(--bs-primary)" : "rgba(0,0,0,0.2)",
                          cursor: "pointer"
                        }}
                        onClick={() => setCurrentImageIndex(idx)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="p-4">
            <h5 className="fw-bold text-dark mb-2" style={{ color: "var(--bs-violet)" }}>{product.name}</h5>
            <div className="text-danger fw-bold fs-5 mb-4">{product.price?.toLocaleString("vi-VN") || 0} đ</div>
            
            {/* Print-only images grid */}
            <div className="d-none d-print-block p-4 border-bottom">
              <h6 className="fw-semibold mb-3 text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px" }}>Hình ảnh sản phẩm</h6>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: product.images.length === 1 ? "1fr" : product.images.length === 2 ? "repeat(2, 1fr)" : "repeat(3, 1fr)", 
                gap: "16px" 
              }}>
                {product.images.map((img: string, idx: number) => (
                  <div key={idx} className="text-center bg-light p-2" style={{ border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    <img src={img} alt={`${product.name} ${idx + 1}`} style={{ 
                      width: "100%", 
                      height: product.images.length === 1 ? "300px" : product.images.length === 2 ? "250px" : "150px", 
                      objectFit: "contain" 
                    }} />
                  </div>
                ))}
              </div>
            </div>
            
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="mb-4">
                <h6 className="fw-semibold mb-3 text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px" }}>Thông số kỹ thuật</h6>
                <div className="d-flex flex-column gap-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="d-flex border-bottom pb-2">
                      <div className="text-muted fw-medium" style={{ width: "130px", fontSize: "13px" }}>{key.replace(":", "")}</div>
                      <div className="flex-grow-1 text-dark" style={{ fontSize: "13px" }}>{String(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.excerpt && (
              <div>
                <h6 className="fw-semibold mb-2 text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px" }}>Mô tả ngắn</h6>
                <p className="text-muted" style={{ fontSize: "13px", lineHeight: "1.6" }}>{product.excerpt.replace(/&hellip;/g, "...")}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="offcanvas-footer border-top bg-light p-3 d-flex justify-content-end gap-2 mt-auto">
          <button 
            type="button" 
            className="btn btn-light border shadow-sm" 
            onClick={onHide}
          >
            Đóng
          </button>
          <button 
            type="button" 
            className="btn text-white shadow-sm d-flex align-items-center gap-2"
            style={{ backgroundColor: "#003087", borderColor: "#003087", fontWeight: 600 }}
            onClick={() => setIsPrintPreviewOpen(true)}
          >
            <i className="bi bi-printer"></i>
            In thông tin
          </button>
        </div>
      </div>

      {isPrintPreviewOpen && (
        <PrintPreviewModal
          title="Thông tin sản phẩm"
          subtitle={product.name}
          onClose={() => setIsPrintPreviewOpen(false)}
          printOrientation="portrait"
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <button
                onClick={() => printDocumentById("print-product-detail")}
                style={{
                  padding: "7px 16px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "0 3px 10px rgba(99,102,241,0.3)"
                }}
              >
                <i className="bi bi-printer-fill" /> In ngay
              </button>
            </div>
          }
          document={
            <div id="print-product-detail" className="pdf-cover-page" style={{ padding: "40px 50px", fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
                <div style={{ display: "flex", gap: 16, maxWidth: "60%" }}>
                  {companyInfo?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={companyInfo.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: "contain", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 80, height: 80, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#0088cc" }}>
                      <i className="bi bi-building" style={{ fontSize: 40 }} />
                    </div>
                  )}
                  <div style={{ lineHeight: 1.3 }}>
                    <h1 style={{ margin: "0 0 2px 0", fontSize: 14, fontWeight: 900, color: "#0088cc", textTransform: "uppercase" }}>{companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}</h1>
                    {companyInfo?.address && <p style={{ margin: "0 0 2px 0", fontSize: 10, color: "#1e293b" }}><strong>Địa chỉ:</strong> {companyInfo.address}</p>}
                    {companyInfo?.phone && <p style={{ margin: "0 0 2px 0", fontSize: 10, color: "#1e293b" }}><strong>SĐT:</strong> {companyInfo.phone}</p>}
                    {companyInfo?.slogan && <p style={{ margin: 0, fontSize: 10, color: "#64748b", fontStyle: "italic" }}>{companyInfo.slogan}</p>}
                  </div>
                </div>
                
                <div style={{ textAlign: "right", maxWidth: "35%" }}>
                  <h2 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 900, color: "#1e293b", textTransform: "uppercase" }}>CHI TIẾT SẢN PHẨM</h2>
                  <p style={{ margin: "0 0 2px 0", fontSize: 11, color: "#64748b" }}>
                    Ngày in: {new Date().toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Product Info */}
              <div style={{ textAlign: "center", marginBottom: 30 }}>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: "var(--bs-violet)", marginBottom: 8 }}>{product.name}</h3>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#dc3545" }}>{product.price?.toLocaleString("vi-VN") || 0} đ</div>
              </div>

              {/* Images Grid */}
              {product.images && product.images.length > 0 && (
                <div style={{ marginBottom: 30 }}>
                  <h6 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", marginBottom: 12, borderBottom: "1px solid #cbd5e1", paddingBottom: 8 }}>Hình ảnh sản phẩm</h6>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: product.images.length === 1 ? "1fr" : product.images.length === 2 ? "repeat(2, 1fr)" : "repeat(3, 1fr)", 
                    gap: "16px" 
                  }}>
                    {product.images.map((img: string, idx: number) => (
                      <div key={idx} style={{ textAlign: "center", padding: 8, border: "1px solid #e2e8f0", borderRadius: 8, backgroundColor: "#f8f9fa" }}>
                        <img src={img} alt={`${product.name} ${idx + 1}`} style={{ 
                          width: "100%", 
                          height: product.images.length === 1 ? "300px" : product.images.length === 2 ? "250px" : "150px", 
                          objectFit: "contain" 
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specifications */}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <div style={{ marginBottom: 30 }}>
                  <h6 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", marginBottom: 12, borderBottom: "1px solid #cbd5e1", paddingBottom: 8 }}>Thông số kỹ thuật</h6>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#1e293b" }}>
                    <tbody>
                      {Object.entries(product.specs).map(([key, value], idx) => (
                        <tr key={key} style={{ backgroundColor: idx % 2 === 0 ? "#f8f9fa" : "#ffffff" }}>
                          <td style={{ padding: "10px 16px", border: "1px solid #cbd5e1", width: "35%", fontWeight: 600 }}>{key.replace(":", "")}</td>
                          <td style={{ padding: "10px 16px", border: "1px solid #cbd5e1" }}>{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Description */}
              {product.excerpt && (
                <div>
                  <h6 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", marginBottom: 12, borderBottom: "1px solid #cbd5e1", paddingBottom: 8 }}>Mô tả chi tiết</h6>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155", textAlign: "justify" }}>{product.excerpt.replace(/&hellip;/g, "...")}</p>
                </div>
              )}
            </div>
          }
        />
      )}
    </>,
    document.body
  );
}
