"use client";
import React, { useState, useEffect } from "react";
import { PrintPreviewModal, printStyles, printDocumentById } from "@/components/ui/PrintPreviewModal";

interface Props {
  open: boolean;
  onClose: () => void;
  // Truyền data hoá đơn
  invoiceData: {
    invoiceNo: string;
    date: Date;
    custName: string;
    custPhone: string;
    custAddress: string;
    payMethod: string;
    lines: any[];
    subtotal: number;
    discount: number;
    vatAmt: number;
    total: number;
    givenVnd: number;
    change: number;
    conNo: number;
    note: string;
  };
}

export function HoaDonBanLePrintPreview({ open, onClose, invoiceData }: Props) {
  // Sidebar config data
  const [khachHang, setKhachHang] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [nguoiNhan, setNguoiNhan] = useState("");
  const [phone, setPhone] = useState("");
  const [diaChiNhan, setDiaChiNhan] = useState("");
  const [chiPhiKhac, setChiPhiKhac] = useState(0);
  const [donTrang, setDonTrang] = useState(false);

  // Toggles
  const [showWeight, setShowWeight] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showTotal, setShowTotal] = useState(true);

  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    if (open) {
      setKhachHang(invoiceData.custName || "");
      setDiaChi(invoiceData.custAddress || "");
      setNguoiNhan(invoiceData.custName || "");
      setPhone(invoiceData.custPhone || "");
      setDiaChiNhan(invoiceData.custAddress || "");
      setChiPhiKhac(0);
      setDonTrang(false);
      
      fetch("/api/company")
        .then(r => r.json())
        .then(d => setCompanyInfo(d))
        .catch(console.error);
    }
  }, [open, invoiceData]);

  if (!open) return null;

  const totalLinesQty = invoiceData.lines.reduce((s, l) => s + l.qty, 0);
  const tongTienHoaDon = invoiceData.total;
  const noCu: number = 0; // Giả sử ko có nợ cũ ở giao diện tạo mới
  const tongPhaiTra = tongTienHoaDon + chiPhiKhac + noCu;
  
  const paymentMethodLabel = invoiceData.payMethod === "transfer" ? "Chuyển khoản" :
                             invoiceData.payMethod === "card" ? "Quẹt thẻ" :
                             invoiceData.payMethod === "ewallet" ? "Ví điện tử" : "Tiền mặt";

  const renderToggle = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: value ? 1 : 0.6, cursor: "pointer", userSelect: "none", zIndex: 9999 }} onClick={() => onChange(!value)}>
      <div style={{ width: 32, height: 18, borderRadius: 10, background: value ? "#4f46e5" : "rgba(255,255,255,0.2)", position: "relative", transition: "all 0.2s" }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: value ? 16 : 2, transition: "all 0.2s" }} />
      </div>
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{label}</span>
    </div>
  );

  return (
    <PrintPreviewModal
      title="Hoá đơn bán lẻ"
      subtitle={`${invoiceData.date.toLocaleDateString("vi-VN", { day: 'numeric', month: 'long', year: 'numeric' })} • ${paymentMethodLabel} • ${invoiceData.custName || "Khách lẻ"}`}
      onClose={onClose}
      printOrientation="portrait"
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {renderToggle("Trọng lượng", showWeight, setShowWeight)}
          {renderToggle("Đơn giá", showPrice, setShowPrice)}
          {renderToggle("Thành tiền", showTotal, setShowTotal)}
          <div style={{ width: 1, height: 24, background: "#334155" }} />
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
            <i className="bi bi-printer-fill" /> In ngay
          </button>
        </div>
      }
      sidebar={
        <>
          <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 800, color: "#1e293b", textTransform: "uppercase" }}>Tuỳ chỉnh thông tin</p>
          {/* Form groups based on UI mockup */}
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Khách hàng</p>
            <input style={printStyles.sidebarInput} value={khachHang} onChange={e => setKhachHang(e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Địa chỉ</p>
            <input style={printStyles.sidebarInput} value={diaChi} onChange={e => setDiaChi(e.target.value)} />
          </div>

          <div style={{ margin: "16px 0", height: 1, background: "#e2e8f0" }} />

          <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 800, color: "#1e293b", textTransform: "uppercase" }}>Thông tin giao hàng</p>
          
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Người nhận hàng</p>
            <input style={printStyles.sidebarInput} value={nguoiNhan} onChange={e => setNguoiNhan(e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Số điện thoại</p>
            <input style={printStyles.sidebarInput} value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Địa chỉ nhận hàng</p>
            <textarea style={{ ...printStyles.sidebarInput, minHeight: 60, resize: "none" }} value={diaChiNhan} onChange={e => setDiaChiNhan(e.target.value)} />
          </div>

          <div style={{ margin: "16px 0", height: 1, background: "#e2e8f0" }} />

          <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 800, color: "#1e293b", textTransform: "uppercase" }}>Điều chỉnh tổng</p>
          
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Chi phí khác (đ)</p>
            <input style={printStyles.sidebarInput} value={chiPhiKhac === 0 ? "0" : chiPhiKhac.toLocaleString("vi-VN")} onChange={e => setChiPhiKhac(parseFloat(e.target.value.replace(/[^0-9]/g, ''))||0)} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, borderTop: "1px dashed #cbd5e1", paddingTop: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Dồn trang</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: donTrang ? "#94a3b8" : "#4f46e5", fontWeight: donTrang ? 400 : 700 }}>Giãn</span>
              <div style={{ width: 40, height: 6, background: "#e2e8f0", borderRadius: 4, position: "relative" }}>
                 <div style={{ position: "absolute", top: -5, left: donTrang ? "calc(100% - 16px)" : 0, width: 16, height: 16, background: "#4f46e5", borderRadius: "50%", transition: "all 0.2s", cursor: "pointer" }} onClick={() => setDonTrang(!donTrang)} />
              </div>
              <span style={{ fontSize: 11, color: donTrang ? "#4f46e5" : "#94a3b8", fontWeight: donTrang ? 700 : 400 }}>Dồn</span>
            </div>
          </div>
        </>
      }
      document={
        <div className="pdf-cover-page" style={{ padding: donTrang ? "30px 40px" : "50px 60px", width: "100%", fontFamily: "'Montserrat', 'Open Sans', Arial, sans-serif" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
            {/* Logo + Company Info (Left) */}
            <div style={{ display: "flex", gap: 16, maxWidth: "55%" }}>
              {companyInfo?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={companyInfo.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: "contain", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 80, height: 80, flexShrink: 0, /* mock design from screenshot */ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#0088cc" }}>
                  <i className="bi bi-house-door-fill" style={{ fontSize: 40 }} />
                  <span style={{ fontSize: 8, fontWeight: 800 }}>HAO NHAI HD</span>
                </div>
              )}
              <div>
                <h1 style={{ margin: "0 0 6px 0", fontSize: 13, fontWeight: 900, color: "#0088cc", textTransform: "uppercase" }}>{companyInfo?.name || "CÔNG TY TNHH MTV SẢN XUẤT VÀ THƯƠNG MẠI HÀO NHÀI HD"}</h1>
                <p style={{ margin: "0 0 4px 0", fontSize: 9, color: "#1e293b" }}><strong>Địa chỉ:</strong> {companyInfo?.address || "Thôn Ngọc Lập, xã Hải Hưng, TP. Hải Phòng"}</p>
                <p style={{ margin: "0 0 4px 0", fontSize: 9, color: "#1e293b" }}><strong>SĐT:</strong> {companyInfo?.phone || "0963533596"}</p>
                <p style={{ margin: 0, fontSize: 9, color: "#0088cc", textTransform: "uppercase", fontWeight: 700 }}>CHUYÊN: <span style={{ fontWeight: 400, color: "#64748b" }}>{companyInfo?.slogan || "Tôn xốp 3 lớp — vách ngăn — sàn desk — sóng ngói — xà gồ thép hộp — trần nhựa nano — thép hình các loại"}</span></p>
              </div>
            </div>

            {/* Document Title (Right) */}
            <div style={{ textAlign: "right", maxWidth: "40%" }}>
              <h2 style={{ margin: "0 0 4px 0", fontSize: 24, fontWeight: 900, color: "#1e293b", textTransform: "uppercase" }}>PHIẾU GIAO HÀNG</h2>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 13, fontWeight: 700, color: "#0088cc", textTransform: "uppercase" }}>KIÊM XÁC NHẬN NỢ</h3>
              <p style={{ margin: "0 0 2px 0", fontSize: 11, color: "#1e293b" }}><strong>Số:</strong> <span style={{ color: "#0088cc", fontWeight: 700 }}>{invoiceData.invoiceNo}</span></p>
              <p style={{ margin: "0 0 2px 0", fontSize: 10, color: "#64748b" }}>Ngày lập: {invoiceData.date.toLocaleDateString("vi-VN", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Hình thức TT: <span style={{ fontWeight: 600 }}>{paymentMethodLabel}</span></p>
            </div>
          </div>

          {/* Customer Info Box */}
          <div style={{ marginBottom: donTrang ? 12 : 20 }}>
             <table style={{ fontSize: 12, color: "#1e293b", width: "100%", lineHeight: 1.8 }}>
               <tbody>
                 <tr>
                   <td style={{ width: 100, fontWeight: 600 }}>Khách hàng:</td>
                   <td colSpan={3}><strong style={{ textTransform: "uppercase" }}>{khachHang || "...................................................................."}</strong></td>
                 </tr>
                 <tr>
                   <td style={{ fontWeight: 600 }}>Địa chỉ:</td>
                   <td colSpan={3}>{diaChi || "..........................................................................................................................."}</td>
                 </tr>
                 <tr>
                   <td style={{ fontWeight: 600 }}>Người nhận hàng:</td>
                   <td style={{ width: "40%" }}><strong style={{ textTransform: "uppercase" }}>{nguoiNhan || "............................"}</strong></td>
                   <td style={{ width: 120, textAlign: "right", paddingRight: 16 }}>Số điện thoại:</td>
                   <td><strong>{phone || "............................"}</strong></td>
                 </tr>
                 <tr>
                   <td style={{ fontWeight: 600 }}>Địa chỉ nhận hàng:</td>
                   <td colSpan={3}>{diaChiNhan || "..........................................................................................................................."}</td>
                 </tr>
               </tbody>
             </table>
          </div>

          {/* The Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #1e293b", marginBottom: donTrang ? 16 : 24 }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #1e293b", padding: donTrang ? "4px" : "8px 6px", textAlign: "center", width: 40, background: "#f8fafc" }}>STT</th>
                <th style={{ border: "1px solid #1e293b", padding: donTrang ? "4px" : "8px 12px", textAlign: "center", background: "#f8fafc" }}>Tên hàng hoá, dịch vụ</th>
                <th style={{ border: "1px solid #1e293b", padding: donTrang ? "4px" : "8px 6px", textAlign: "center", width: 60, background: "#f8fafc" }}>Đơn vị</th>
                <th style={{ border: "1px solid #1e293b", padding: donTrang ? "4px" : "8px 6px", textAlign: "center", width: 60, background: "#f8fafc" }}>Số<br/>lượng</th>
                {showWeight && <th style={{ border: "1px solid #1e293b", padding: donTrang ? "4px" : "8px 6px", textAlign: "center", width: 75, background: "#f8fafc" }}>Trọng lượng<br/><span style={{ fontSize: 10, fontWeight: 400 }}>(kg)</span></th>}
                {showPrice && <th style={{ border: "1px solid #1e293b", padding: donTrang ? "4px" : "8px 6px", textAlign: "center", width: 85, background: "#f8fafc" }}>Đơn giá<br/><span style={{ fontSize: 10, fontWeight: 400 }}>(đ)</span></th>}
                {showTotal && <th style={{ border: "1px solid #1e293b", padding: donTrang ? "4px" : "8px 6px", textAlign: "center", width: 95, background: "#f8fafc" }}>Thành tiền<br/><span style={{ fontSize: 10, fontWeight: 400 }}>(đ)</span></th>}
              </tr>
            </thead>
            <tbody>
              {invoiceData.lines.map((line, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #1e293b", padding: donTrang ? "5px" : "8px 6px", textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ border: "1px solid #1e293b", padding: donTrang ? "5px" : "8px 12px" }}>{line.name}</td>
                  <td style={{ border: "1px solid #1e293b", padding: donTrang ? "5px" : "8px 6px", textAlign: "center" }}>{line.dvt}</td>
                  <td style={{ border: "1px solid #1e293b", padding: donTrang ? "5px" : "8px 6px", textAlign: "center" }}>{line.qty}</td>
                  {showWeight && <td style={{ border: "1px solid #1e293b", padding: donTrang ? "5px" : "8px 6px", textAlign: "right" }}>-</td>}
                  {showPrice && <td style={{ border: "1px solid #1e293b", padding: donTrang ? "5px" : "8px 6px", textAlign: "right" }}>{line.donGia === 0 ? "0" : line.donGia.toLocaleString("vi-VN")}</td>}
                  {showTotal && <td style={{ border: "1px solid #1e293b", padding: donTrang ? "5px" : "8px 6px", textAlign: "right", fontWeight: 700 }}>{(line.donGia * line.qty) === 0 ? "0" : (line.donGia * line.qty).toLocaleString("vi-VN")}</td>}
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ border: "1px solid #1e293b", padding: donTrang ? "6px" : "8px 12px", textAlign: "right", fontWeight: 800 }}>Tổng cộng</td>
                <td style={{ border: "1px solid #1e293b", padding: donTrang ? "6px" : "8px 6px", textAlign: "center", fontWeight: 800 }}>{totalLinesQty}</td>
                {showWeight && <td style={{ border: "1px solid #1e293b", padding: donTrang ? "6px" : "8px 6px", textAlign: "right" }}></td>}
                {showPrice && <td style={{ border: "1px solid #1e293b", padding: donTrang ? "6px" : "8px 6px", textAlign: "right" }}></td>}
                {showTotal && <td style={{ border: "1px solid #1e293b", padding: donTrang ? "6px" : "8px 6px", textAlign: "right", fontWeight: 800, color: "#0088cc" }}>{tongTienHoaDon === 0 ? "0" : tongTienHoaDon.toLocaleString("vi-VN")}</td>}
              </tr>
            </tbody>
          </table>

          {/* Footer Grid */}
          <div style={{ display: "flex", gap: 32 }}>
            
            {/* Left: Notes & Bank Info */}
            <div style={{ width: "55%" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>GHI CHÚ / ĐIỀU KHOẢN</p>
              <ul style={{ margin: 0, paddingLeft: 0, fontSize: 10, color: "#1e293b", lineHeight: donTrang ? 1.4 : 1.6, listStyleType: "none" }}>
                <li style={{ marginBottom: 4 }}>- Phiếu giao hàng có giá trị như giấy xác nhận nợ đối với khách hàng thanh toán chậm.</li>
                <li style={{ marginBottom: 4 }}>- Kiểm tra đối chiếu khi giao nhận hàng.</li>
                <li style={{ marginBottom: 4 }}>- Hàng đã cắt không được trả lại.</li>
                <li style={{ marginBottom: 4 }}>- Phải vệ sinh mặt sắt sau khi thi công.</li>
                <li style={{ marginBottom: 4 }}>- Mọi thắc mắc vui lòng liên hệ theo số điện thoại ghi trên phiếu giao hàng. Sau thời gian hai (02) ngày kể từ khi nhận hàng chúng tôi không chịu trách nhiệm.</li>
              </ul>

              <p style={{ margin: "16px 0 8px 0", fontSize: 11, fontWeight: 800 }}>Thông tin chuyển khoản:</p>
              <ul style={{ margin: 0, paddingLeft: 0, fontSize: 10, color: "#1e293b", lineHeight: donTrang ? 1.4 : 1.6, listStyleType: "none" }}>
                <li style={{ marginBottom: 4 }}>- STK: <strong>112000136312</strong> Ngân hàng Vietinbank - CN KCN Hải Dương</li>
                <li style={{ marginBottom: 4 }}>- STK: <strong>1018284888</strong> Ngân hàng Vietcombank - CN Hải Dương - PGD Thanh Miện</li>
              </ul>
            </div>

            {/* Right: Payment Summary */}
            <div style={{ width: "45%" }}>
               <table style={{ width: "100%", fontSize: 11, color: "#1e293b", lineHeight: donTrang ? 1.6 : 2.0 }}>
                 <tbody>
                   <tr>
                     <td>Tổng tiền hàng:</td>
                     <td style={{ textAlign: "right", fontWeight: 800 }}>{tongTienHoaDon === 0 ? "0" : tongTienHoaDon.toLocaleString("vi-VN")} đ</td>
                   </tr>
                   <tr>
                     <td>Chi phí khác:</td>
                     <td style={{ textAlign: "right", fontWeight: 800 }}>{chiPhiKhac === 0 ? "0" : chiPhiKhac.toLocaleString("vi-VN")} đ</td>
                   </tr>
                   <tr>
                     <td style={{ color: "#ef4444" }}>Chiết khấu <span style={{ fontSize: 10 }}>({invoiceData.discount}%)</span>:</td>
                     <td style={{ textAlign: "right", fontWeight: 800, color: "#ef4444" }}>{(tongTienHoaDon * invoiceData.discount / 100) === 0 ? "0" : (tongTienHoaDon * invoiceData.discount / 100).toLocaleString("vi-VN")} đ</td>
                   </tr>
                   <tr>
                     <td colSpan={2}><div style={{ height: 1, background: "#cbd5e1", margin: "2px 0" }}/></td>
                   </tr>
                   <tr>
                     <td style={{ fontWeight: 800 }}>Tổng tiền hoá đơn:</td>
                     <td style={{ textAlign: "right", fontWeight: 800 }}>{(tongTienHoaDon * (1 - invoiceData.discount / 100) + chiPhiKhac) === 0 ? "0" : (tongTienHoaDon * (1 - invoiceData.discount / 100) + chiPhiKhac).toLocaleString("vi-VN")} đ</td>
                   </tr>
                   <tr>
                     <td style={{ color: "#ef4444" }}>Nợ cũ:</td>
                     <td style={{ textAlign: "right", fontWeight: 800, color: "#ef4444" }}>{noCu === 0 ? "0" : noCu.toLocaleString("vi-VN")} đ</td>
                   </tr>
                   <tr>
                     <td colSpan={2}><div style={{ height: 1, background: "#cbd5e1", margin: "2px 0" }}/></td>
                   </tr>
                   <tr>
                     <td style={{ fontWeight: 800, fontSize: 13 }}>Tổng tiền:</td>
                     <td style={{ textAlign: "right", fontWeight: 800, fontSize: 13, color: "#10b981" }}>{tongPhaiTra === 0 ? "0" : tongPhaiTra.toLocaleString("vi-VN")} đ</td>
                   </tr>
                   <tr>
                     <td style={{ color: "#10b981" }}>Đã thanh toán:</td>
                     <td style={{ textAlign: "right", fontWeight: 800, color: "#10b981" }}>{invoiceData.givenVnd === 0 ? "0" : invoiceData.givenVnd.toLocaleString("vi-VN")} đ</td>
                   </tr>
                   <tr>
                     <td colSpan={2}><div style={{ height: 1, background: "#cbd5e1", margin: "2px 0" }}/></td>
                   </tr>
                   <tr>
                     <td style={{ fontWeight: 800, fontSize: 14 }}>Tổng phải trả:</td>
                     <td style={{ textAlign: "right", fontWeight: 900, fontSize: 14, color: "#0088cc" }}>{Math.max(0, tongPhaiTra - invoiceData.givenVnd) === 0 ? "0" : Math.max(0, tongPhaiTra - invoiceData.givenVnd).toLocaleString("vi-VN")} đ</td>
                   </tr>
                 </tbody>
               </table>
               
               <div style={{ textAlign: "center", marginTop: donTrang ? 8 : 16 }}>
                 <div style={{ width: 60, height: 60, background: "rgba(99,102,241,0.1)", borderRadius: "50%", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5", fontSize: 24, padding: "4px" }}>
                    <div style={{ background: "#4f46e5", width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="bi bi-robot" style={{ color: "#fff", fontSize: 28 }} />
                    </div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      }
    />
  );
}
