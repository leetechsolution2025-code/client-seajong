"use client";

import React, { useState, useEffect } from "react";
import { PrintPreviewModal } from "@/components/ui/PrintPreviewModal";
import { docSoTien } from "./DebtPaymentOffcanvas";

const formatCurrency = (val: number) => {
  if (typeof val !== 'number') return "0";
  return (Math.round(val / 1000) * 1000).toLocaleString("vi-VN");
};

interface Props {
  item: any | null;
  onClose: () => void;
}

export function FinanceReceiptDetailsOffcanvas({ item, onClose }: Props) {
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    fetch("/api/company")
      .then(r => r.json())
      .then(d => setCompanyInfo(d))
      .catch(console.error);
  }, []);

  if (!item) return null;

  const isReturn = item.isReturn || 
                   item.amount < 0 || 
                   item.displayDescription?.includes("Trả lại hàng") || 
                   item.referenceId?.startsWith("ERR-") || 
                   item.referenceId?.startsWith("WR-");

  const amount = item.amount < 0 ? Math.abs(item.amount) : (item.paidAmount || item.amount || 0);

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) + " " + date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const fmtDateOnly = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formattedPrintDate = () => {
    const d = item.createdAt ? new Date(item.createdAt) : new Date();
    return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
  };

  let cleanedPartnerName = item.partnerName || "";
  cleanedPartnerName = cleanedPartnerName.split(/[-–]/)[0].trim();
  const address = item.address || item.customerAddress || item.supplierAddress || "Chưa cập nhật địa chỉ";
  const note = item.paymentNote || item.displayDescription || item.description || (isReturn ? "Trả lại hàng theo chứng từ" : "Thu tiền công nợ khách hàng");

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        style={{ 
          position: "fixed", 
          inset: 0, 
          zIndex: 1099, 
          background: "rgba(0,0,0,0.35)", 
          backdropFilter: "blur(2px)",
          display: showPrintPreview ? "none" : "block"
        }} 
      />

      {/* Offcanvas 400px */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "100%", maxWidth: 400, minWidth: 320, zIndex: 1100,
        background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: showPrintPreview ? "none" : "flex", 
        flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        animation: "slideInRight 0.22s ease-out",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "linear-gradient(to right, var(--background), var(--secondary-subtle))" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${isReturn ? "bi-arrow-return-left text-danger" : "bi-receipt text-success"} fs-4`} />
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                  {isReturn ? "Chi tiết hàng trả về" : "Chi tiết phiếu thu"}
                </p>
                <h5 className="offcanvas-title fw-bold mb-0 text-dark" style={{ fontSize: 16.5, letterSpacing: -0.2 }}>
                  {item.referenceId || (isReturn ? "ERR-RETURN" : "PT-RECEIPT")}
                </h5>
              </div>
            </div>
            <button onClick={onClose} type="button" className="btn-close mt-1" style={{ fontSize: 13 }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="bg-light">
          <div className="d-flex flex-column gap-2.5">
            
            {/* Box Khách hàng / Đối tác */}
            <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
              <p className="mb-1.5" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.02em" }}>
                Thông tin đối tác
              </p>
              <div className="fw-bold text-dark mb-1 d-flex align-items-center flex-wrap gap-2" style={{ fontSize: 14.5 }}>
                <span>{cleanedPartnerName || "Khách hàng"}</span>
                {isReturn ? (
                  <span className="badge bg-danger-subtle text-danger rounded-pill px-2 py-0.5" style={{ fontSize: 11, fontWeight: 600 }}>
                    Hàng trả về
                  </span>
                ) : (
                  <span className="badge bg-success-subtle text-success rounded-pill px-2 py-0.5" style={{ fontSize: 11, fontWeight: 600 }}>
                    Phiếu thu
                  </span>
                )}
              </div>
              {item.phone && (
                <div className="text-muted mb-1" style={{ fontSize: 13 }}>
                  <i className="bi bi-telephone me-1.5 text-secondary" /> {item.phone}
                </div>
              )}
              {address && (
                <div className="text-muted" style={{ fontSize: 13 }}>
                  <i className="bi bi-geo-alt me-1.5 text-secondary" /> {address}
                </div>
              )}
            </div>

            {/* Box Giá trị & Diễn giải */}
            <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
              <p className="mb-2" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.02em" }}>
                Thông tin thanh toán
              </p>

              <div className="row g-2 mb-2">
                <div className="col-12">
                  <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Số tiền {isReturn ? "giảm trừ công nợ" : "đã thu"}</div>
                  <div className={`fw-bold ${isReturn ? "text-danger" : "text-success"}`} style={{ fontSize: 18 }}>
                    {isReturn ? "-" : "+"}{formatCurrency(amount)} đ
                  </div>
                  <div className="text-muted fst-italic mt-0.5" style={{ fontSize: 12 }}>
                    (Bằng chữ: {docSoTien(amount)})
                  </div>
                </div>
              </div>

              <div className="border-top pt-2 mt-1">
                <div className="row g-2">
                  <div className="col-6 border-end">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Thời gian</div>
                    <div className="fw-semibold text-dark" style={{ fontSize: 13 }}>{fmtDate(item.createdAt)}</div>
                  </div>
                  <div className="col-6 ps-2">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Phương thức</div>
                    <div className="fw-semibold text-dark" style={{ fontSize: 13 }}>
                      {item.paymentMethod || (item.displayDescription?.includes("Chuyển khoản") ? "Chuyển khoản" : (item.displayDescription?.includes("Tiền mặt") ? "Tiền mặt" : "Tiền mặt / CK"))}
                    </div>
                  </div>
                  <div className="col-12 border-top pt-2 mt-1">
                    <div className="text-muted mb-0.5" style={{ fontSize: 12 }}>Lý do / Nội dung</div>
                    <div className="fw-medium text-dark" style={{ fontSize: 13.5 }}>{note}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box Chứng từ liên quan */}
            <div className="card border-0 p-3 rounded-3 shadow-sm bg-white">
              <p className="mb-2" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.02em" }}>
                Chứng từ tham chiếu
              </p>
              <div className="d-flex align-items-center justify-content-between p-2 rounded bg-light border">
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>
                    <i className="bi bi-file-earmark-check me-1.5 text-primary" />
                    {item.referenceId || "Không có mã số"}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11.5 }}>
                    {isReturn ? "Biên bản thu hồi hàng lỗi / trả về" : "Biên nhận thanh toán công nợ"}
                  </div>
                </div>
                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{ fontSize: "11px" }}>
                  Đã ghi nhận
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--card)", flexShrink: 0 }}>
          <div className="d-flex align-items-center justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-light border fw-medium px-3"
              style={{ fontSize: "13.5px", height: "36px" }}
              onClick={onClose}
            >
              Đóng
            </button>
            <button
              type="button"
              className="btn btn-primary fw-medium px-3 d-flex align-items-center gap-1.5 shadow-sm"
              style={{ fontSize: "13.5px", height: "36px", backgroundColor: "#003087", borderColor: "#003087" }}
              onClick={() => setShowPrintPreview(true)}
            >
              <i className="bi bi-printer me-1" />
              Xem phiếu thu
            </button>
          </div>
        </div>
      </div>

      {/* Modal Print Preview */}
      {showPrintPreview && (
        <PrintPreviewModal
          title={isReturn ? "Phiếu trả hàng & Giảm trừ công nợ" : "Phiếu thu tiền"}
          subtitle={`Số chứng từ: ${item.referenceId || "---"}`}
          documentId="phieu-thu-preview-doc"
          printMargins="20mm 20mm 20mm 25mm"
          onClose={() => setShowPrintPreview(false)}
          document={
            <div 
              id="phieu-thu-preview-doc" 
              className="pdf-content-page" 
              style={{ 
                background: "#fff", 
                padding: "60px 60px 60px 75px", 
                boxSizing: "border-box", 
                fontFamily: "'Roboto Condensed', sans-serif" 
              }}
            >
              {/* Header công ty */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "2px solid #003087", paddingBottom: "12px" }}>
                <div style={{ width: "100%", display: "flex", gap: "14px", alignItems: "center" }}>
                  {companyInfo?.logoUrl ? (
                    <img src={companyInfo.logoUrl} style={{ height: "48px", objectFit: "contain" }} alt="Logo" />
                  ) : (
                    <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "#003087", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "18px", flexShrink: 0 }}>
                      SJ
                    </div>
                  )}
                  <div>
                    <h6 style={{ fontWeight: "bold", margin: 0, textTransform: "uppercase", fontSize: "14px", letterSpacing: "0.3px", color: "#003087" }}>
                      {companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
                    </h6>
                    <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#444", lineHeight: 1.3 }}>
                      Địa chỉ: {companyInfo?.address || "Đường số 3, KCN Yên Phong, Huyện Yên Phong, Tỉnh Bắc Ninh"}
                    </p>
                    <p style={{ margin: "1px 0 0 0", fontSize: "11.5px", color: "#444", lineHeight: 1.3 }}>
                      Điện thoại: {companyInfo?.phone || "0222.368.6868"} {companyInfo?.website ? `| Website: ${companyInfo.website}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Title Phiếu thu */}
              <div style={{ textAlign: "center", margin: "25px 0" }}>
                <h3 style={{ fontWeight: "bold", margin: 0, fontSize: "24px", color: "#003087", letterSpacing: "1px" }}>
                  {isReturn ? "BIÊN BẢN TRẢ HÀNG & GIẢM TRỪ CÔNG NỢ" : "PHIẾU THU TIỀN"}
                </h3>
                <div style={{ fontSize: "13px", fontStyle: "italic", marginTop: "4px", color: "#555" }}>
                  {formattedPrintDate()}
                </div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>
                  Số: <span style={{ fontWeight: "bold", color: "#003087" }}>{item.referenceId || "---"}</span>
                </div>
              </div>

              {/* Bảng thông tin */}
              <div style={{ marginBottom: "30px", fontSize: "14px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "28%", padding: "8px 0", verticalAlign: "bottom", whiteSpace: "nowrap" }}>
                        Họ và tên người {isReturn ? "trả hàng" : "nộp tiền"}:
                      </td>
                      <td style={{ borderBottom: "1px dotted #000", padding: "8px 0 3px 0", fontWeight: "bold", verticalAlign: "bottom" }}>
                        {cleanedPartnerName}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 0", verticalAlign: "bottom" }}>
                        Địa chỉ:
                      </td>
                      <td style={{ borderBottom: "1px dotted #000", padding: "8px 0 3px 0", verticalAlign: "bottom" }}>
                        {address}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 0", verticalAlign: "bottom" }}>
                        Lý do {isReturn ? "trả hàng" : "nộp"}:
                      </td>
                      <td style={{ borderBottom: "1px dotted #000", padding: "8px 0 3px 0", verticalAlign: "bottom" }}>
                        {note}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 0", verticalAlign: "bottom" }}>
                        Số tiền {isReturn ? "giảm trừ" : "thu"}:
                      </td>
                      <td style={{ borderBottom: "1px dotted #000", padding: "8px 0 3px 0", fontWeight: "bold", fontSize: "15px", verticalAlign: "bottom", color: "#003087" }}>
                        {formatCurrency(amount)} VND
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 0", verticalAlign: "bottom" }}>
                        Bằng chữ:
                      </td>
                      <td style={{ borderBottom: "1px dotted #000", padding: "8px 0 3px 0", fontStyle: "italic", fontWeight: "600", verticalAlign: "bottom" }}>
                        {docSoTien(amount)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 0", verticalAlign: "bottom" }}>
                        Kèm theo:
                      </td>
                      <td style={{ borderBottom: "1px dotted #000", padding: "8px 0 3px 0", verticalAlign: "bottom" }}>
                        Chứng từ kế toán gốc kèm theo sổ đối chiếu công nợ.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Chữ ký */}
              <div style={{ display: "flex", justifyContent: "space-between", margin: "40px 0 40px 0", fontSize: "13px", textAlign: "center" }}>
                <div style={{ width: "22%" }}>
                  <div style={{ fontWeight: "bold" }}>Giám đốc</div>
                  <div style={{ fontStyle: "italic", fontSize: "11px", color: "#555" }}>(Ký, đóng dấu)</div>
                  <div style={{ height: "70px" }}></div>
                  <div style={{ fontWeight: "bold" }}>....................</div>
                </div>
                <div style={{ width: "22%" }}>
                  <div style={{ fontWeight: "bold" }}>Kế toán trưởng</div>
                  <div style={{ fontStyle: "italic", fontSize: "11px", color: "#555" }}>(Ký, ghi họ tên)</div>
                  <div style={{ height: "70px" }}></div>
                  <div style={{ fontWeight: "bold" }}>....................</div>
                </div>
                <div style={{ width: "22%" }}>
                  <div style={{ fontWeight: "bold" }}>Thủ quỹ</div>
                  <div style={{ fontStyle: "italic", fontSize: "11px", color: "#555" }}>(Ký, ghi họ tên)</div>
                  <div style={{ height: "70px" }}></div>
                  <div style={{ fontWeight: "bold" }}>....................</div>
                </div>
                <div style={{ width: "22%" }}>
                  <div style={{ fontWeight: "bold" }}>Người {isReturn ? "trả hàng" : "nộp tiền"}</div>
                  <div style={{ fontStyle: "italic", fontSize: "11px", color: "#555" }}>(Ký, ghi họ tên)</div>
                  <div style={{ height: "70px" }}></div>
                  <div style={{ fontWeight: "bold" }}>{cleanedPartnerName}</div>
                </div>
              </div>
            </div>
          }
        />
      )}
    </>
  );
}
