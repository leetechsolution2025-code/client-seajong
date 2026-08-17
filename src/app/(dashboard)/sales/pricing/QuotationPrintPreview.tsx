"use client";
import React, { useState, useEffect } from "react";
import { PrintPreviewModal, printStyles, printDocumentById } from "@/components/ui/PrintPreviewModal";

interface QuotationItem {
  id: string;
  isFullWidth?: boolean;
  fullWidthContent?: string;
  categoryName?: string;
  stt?: number;
  productName: string;
  productCode: string;
  specification: string;
  listedPrice: number;
  note: string;
  originalData?: any;
  imageUrl?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  quotations: QuotationItem[];
}

export function QuotationPrintPreview({ open, onClose, quotations }: Props) {
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
  // Custom sidebar fields
  const [khachHang, setKhachHang] = useState("");
  const [diaChiKhachHang, setDiaChiKhachHang] = useState("");
  const [nguoiLienHe, setNguoiLienHe] = useState("");
  const [dienThoai, setDienThoai] = useState("");
  const [email, setEmail] = useState("");
  const [ngayBaoGia, setNgayBaoGia] = useState(new Date().toISOString().split("T")[0]);
  const [hieuLucDen, setHieuLucDen] = useState("");
  const [hienDauTreo, setHienDauTreo] = useState(false);
  const [ghiChu, setGhiChu] = useState("+ Giá trị hàng hoá trong bảng chưa bao gồm thuế VAT\n+ Vui lòng xem thông tin hiệu lực của bảng báo giá này trong phần tiêu đề");

  useEffect(() => {
    if (open) {
      fetch("/api/company")
        .then(r => r.json())
        .then(d => setCompanyInfo(d))
        .catch(console.error);
    }
  }, [open]);

  if (!open) return null;

  return (
    <PrintPreviewModal
      title="Bảng Báo Giá"
      subtitle={`Ngày ${new Date(ngayBaoGia).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
      onClose={onClose}
      printOrientation="portrait"
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button
            onClick={() => printDocumentById("print-doc")}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 3px 10px rgba(99,102,241,0.3)"
            }}
          >
            <i className="bi bi-printer-fill" /> In báo giá
          </button>
        </div>
      }
      sidebar={
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Ngày báo giá</p>
              <input type="date" style={printStyles.sidebarInput} value={ngayBaoGia} onChange={e => setNgayBaoGia(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Hiệu lực đến</p>
              <input type="date" style={printStyles.sidebarInput} value={hieuLucDen} onChange={e => setHieuLucDen(e.target.value)} />
            </div>
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Tên khách hàng / Đối tác</p>
            <input style={printStyles.sidebarInput} value={khachHang} onChange={e => setKhachHang(e.target.value)} placeholder="Nhập tên KH..." />
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Địa chỉ khách hàng</p>
            <input style={printStyles.sidebarInput} value={diaChiKhachHang} onChange={e => setDiaChiKhachHang(e.target.value)} placeholder="Nhập địa chỉ..." />
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Người liên hệ</p>
            <input style={printStyles.sidebarInput} value={nguoiLienHe} onChange={e => setNguoiLienHe(e.target.value)} placeholder="Nhập người liên hệ..." />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Số điện thoại</p>
              <input style={printStyles.sidebarInput} value={dienThoai} onChange={e => setDienThoai(e.target.value)} placeholder="Nhập SĐT..." />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Email</p>
              <input style={printStyles.sidebarInput} value={email} onChange={e => setEmail(e.target.value)} placeholder="Nhập Email..." />
            </div>
          </div>
          
          <div className="form-check form-switch mt-2">
            <input className="form-check-input cursor-pointer" type="checkbox" role="switch" id="switchDauTreo" checked={hienDauTreo} onChange={e => setHienDauTreo(e.target.checked)} />
            <label className="form-check-label cursor-pointer ms-2" htmlFor="switchDauTreo" style={{ fontSize: 13, fontWeight: 500 }}>
              Hiển thị dấu treo
            </label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 4 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Ghi chú</p>
            <textarea 
              style={{ ...printStyles.sidebarInput, flex: 1, resize: "none" }} 
              value={ghiChu} 
              onChange={e => setGhiChu(e.target.value)} 
              placeholder="Nhập ghi chú..." 
            />
          </div>
        </div>
      }
      document={
        <div className="pdf-cover-page" style={{ padding: "40px 50px", fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30, position: "relative" }}>
            
            <style>{`
              @media print {
                .print-fixed-stamp {
                  position: fixed !important;
                  top: 20px !important;
                  left: 220px !important;
                }
              }
            `}</style>

            {hienDauTreo && (
              <img 
                src="/seajong_stampt.png" 
                alt="Dấu treo" 
                className="print-fixed-stamp"
                style={{ 
                  position: "absolute", 
                  top: 10, left: 190, 
                  width: 100, height: 100, 
                  opacity: 0.8,
                  pointerEvents: "none",
                  zIndex: 10 
                }} 
              />
            )}

            <div style={{ display: "flex", gap: 16, maxWidth: "60%" }}>
              {companyInfo?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={companyInfo.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: "contain", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 80, height: 80, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#0088cc" }}>
                  <i className="bi bi-building" style={{ fontSize: 40 }} />
                </div>
              )}
              <div>
                <h1 style={{ margin: "0 0 2px 0", fontSize: 14, fontWeight: 900, color: "#0088cc", textTransform: "uppercase" }}>{companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}</h1>
                {companyInfo?.address && <p style={{ margin: "0 0 2px 0", fontSize: 10, color: "#1e293b" }}><strong>Địa chỉ:</strong> {companyInfo.address}</p>}
                {companyInfo?.phone && <p style={{ margin: "0 0 2px 0", fontSize: 10, color: "#1e293b" }}><strong>SĐT:</strong> {companyInfo.phone}</p>}
                {companyInfo?.slogan && <p style={{ margin: 0, fontSize: 10, color: "#64748b", fontStyle: "italic" }}>{companyInfo.slogan}</p>}
              </div>
            </div>
            
            <div style={{ textAlign: "right", maxWidth: "35%" }}>
              <h2 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 900, color: "#1e293b", textTransform: "uppercase" }}>BẢNG BÁO GIÁ</h2>
              <p style={{ margin: "0 0 2px 0", fontSize: 11, color: "#64748b" }}>
                Ngày: {new Date(ngayBaoGia).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
              {hieuLucDen && (
                <p style={{ margin: "0", fontSize: 11, color: "#64748b" }}>
                  Hiệu lực đến: {new Date(hieuLucDen).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Customer Info Box */}
          {(khachHang || diaChiKhachHang || nguoiLienHe || dienThoai || email) && (
            <div style={{ marginBottom: 20, border: "1px solid #cbd5e1", borderRadius: 4, padding: "12px 16px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 800, color: "#1e293b", textTransform: "uppercase" }}>Kính gửi:</h3>
              <table style={{ fontSize: 12, color: "#1e293b", width: "100%", lineHeight: 1.6 }}>
                <tbody>
                  {khachHang && (
                    <tr>
                      <td style={{ width: 100, fontWeight: 600 }}>Tên khách hàng:</td>
                      <td><strong>{khachHang}</strong></td>
                    </tr>
                  )}
                  {diaChiKhachHang && (
                    <tr>
                      <td style={{ fontWeight: 600 }}>Địa chỉ:</td>
                      <td>{diaChiKhachHang}</td>
                    </tr>
                  )}
                  {nguoiLienHe && (
                    <tr>
                      <td style={{ fontWeight: 600 }}>Người liên hệ:</td>
                      <td>{nguoiLienHe}</td>
                    </tr>
                  )}
                  {dienThoai && (
                    <tr>
                      <td style={{ fontWeight: 600 }}>Điện thoại:</td>
                      <td>{dienThoai}</td>
                    </tr>
                  )}
                  {email && (
                    <tr>
                      <td style={{ fontWeight: 600 }}>Email:</td>
                      <td>{email}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: 13, marginBottom: 16 }}>
            Công ty chúng tôi xin trân trọng gửi tới Quý khách hàng bảng báo giá các sản phẩm thiết bị vệ sinh như sau:
          </p>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 20 }}>
            <thead>
              <tr style={{ backgroundColor: "#0088cc", color: "#fff" }}>
                <th style={{ border: "1px solid #000", padding: "8px 4px", textAlign: "center", width: 40, fontWeight: 700 }}>STT</th>
                <th style={{ border: "1px solid #000", padding: "8px 4px", textAlign: "left", width: 90, fontWeight: 700 }}>Mã hàng</th>
                <th style={{ border: "1px solid #000", padding: "8px 4px", textAlign: "left", fontWeight: 700 }}>Tên hàng hoá</th>
                <th style={{ border: "1px solid #000", padding: "8px 4px", textAlign: "center", width: 60, fontWeight: 700 }}>ĐVT</th>
                <th style={{ border: "1px solid #000", padding: "8px 4px", textAlign: "right", width: 90, fontWeight: 700 }}>Đơn giá (VNĐ)</th>
                <th style={{ border: "1px solid #000", padding: "8px 4px", textAlign: "left", width: 100, fontWeight: 700 }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let sttCounter = 1;
                return quotations.map((item, index) => {
                  if (item.isFullWidth) {
                    sttCounter = 1;
                    return (
                      <tr key={`cat-${index}`} style={{ backgroundColor: "#f1f5f9" }}>
                        <td colSpan={6} style={{ border: "1px solid #000", padding: "6px 8px", fontWeight: 800, color: "#0088cc", textTransform: "uppercase" }}>
                          {item.categoryName}
                        </td>
                      </tr>
                    );
                  }
                  
                  const currentStt = sttCounter++;
                  return (
                    <tr key={`prod-${item.id}`}>
                      <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>{currentStt}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "left" }}>{item.productCode}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "left" }}>{item.productName}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center" }}>{item.specification || "BỘ"}</td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "right", fontWeight: 600 }}>
                        {item.listedPrice ? item.listedPrice.toLocaleString("vi-VN") : ""}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "left" }}>{item.note}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>

          {/* Ghi chú */}
          {ghiChu && (
            <div style={{ marginTop: 20, fontSize: 12, lineHeight: 1.5, color: "#1e293b" }}>
              <span style={{ fontWeight: 700, textDecoration: "underline" }}>Ghi chú:</span>
              <div style={{ whiteSpace: "pre-line", marginTop: 4 }}>
                {ghiChu}
              </div>
            </div>
          )}

          {/* Footer Signatures */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 40, pageBreakInside: "avoid" }}>
            <div style={{ textAlign: "center", width: "40%" }}>
              <p style={{ margin: "0 0 60px 0", fontSize: 13, fontWeight: 700 }}>ĐẠI DIỆN CÔNG TY</p>
            </div>
          </div>
          
        </div>
      }
    />
  );
}
