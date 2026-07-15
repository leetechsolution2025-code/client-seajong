"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { printDocumentById } from "@/components/ui/PrintPreviewModal";

// Interface for Payment Logs stored in Debt.description
export interface PaymentHistoryItem {
  id: string;
  amount: number;
  date: string;
  ref: string;
  method: string;
  note: string;
}

interface DebtPaymentOffcanvasProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: any | null;
}

// Helper to convert numbers to Vietnamese words
export function docSoTien(soTien: number): string {
  if (soTien === 0) return "Không đồng";
  const target = Math.abs(soTien);
  const chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  function docBlock3(n: number, isFirst: boolean): string {
    const tram = Math.floor(n / 100);
    const chuc = Math.floor((n % 100) / 10);
    const dvi = n % 10;
    let res = "";

    if (tram > 0 || !isFirst) {
      res += chuSo[tram] + " trăm ";
    }

    if (chuc > 1) {
      res += chuSo[chuc] + " mươi ";
    } else if (chuc === 1) {
      res += "mười ";
    } else if (chuc === 0 && dvi > 0 && !isFirst) {
      res += "lẻ ";
    }

    if (dvi > 0) {
      if (dvi === 1 && chuc > 1) {
        res += "mốt";
      } else if (dvi === 5 && chuc > 0) {
        res += "lăm";
      } else if (dvi === 5 && chuc === 0) {
        res += "năm";
      } else {
        res += chuSo[dvi];
      }
    }
    return res.trim();
  }

  const blocks: number[] = [];
  let temp = target;
  while (temp > 0) {
    blocks.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  let text = "";
  for (let i = blocks.length - 1; i >= 0; i--) {
    const blockValue = blocks[i];
    if (blockValue > 0) {
      const isFirst = (i === blocks.length - 1);
      text += " " + docBlock3(blockValue, isFirst) + " " + units[i];
    }
  }

  text = text.trim();
  if (text) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    text = text.replace(/\s+/g, " ");
    return text + " đồng chẵn.";
  }
  return "Không đồng";
}

export interface ReconciliationLog {
  id: string;
  date: string;
  createdAt?: string;
  reconciler: string;
  status: "MATCHED" | "DISCREPANCY" | "UNRECONCILED";
  note: string;
  differenceAmount?: number;
  periodStart?: string;
  periodEnd?: string;
}

// Helpers for serializing/deserializing history from description
export function parseDebtDescription(description: string | null) {
  if (!description) {
    return {
      originalDesc: "",
      history: [] as PaymentHistoryItem[],
      reconciliations: [] as ReconciliationLog[]
    };
  }

  let originalDesc = description;
  let history: PaymentHistoryItem[] = [];
  let reconciliations: ReconciliationLog[] = [];

  const paymentMarker = "[PAYMENT_LOGS]:";
  const reconMarker = "[RECONCILIATION_LOGS]:";

  // Parse payment logs
  const paymentIdx = originalDesc.indexOf(paymentMarker);
  if (paymentIdx !== -1) {
    const jsonPart = originalDesc.slice(paymentIdx + paymentMarker.length).trim();
    let paymentJson = jsonPart;
    const nextMarkerIdx = jsonPart.indexOf(reconMarker);
    if (nextMarkerIdx !== -1) {
      paymentJson = jsonPart.slice(0, nextMarkerIdx).trim();
    }
    try {
      const parsed = JSON.parse(paymentJson);
      history = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing payment history JSON:", e);
    }
    originalDesc = originalDesc.slice(0, paymentIdx).trim();
  }

  // Parse reconciliation logs
  const reconIdx = originalDesc.indexOf(reconMarker);
  if (reconIdx !== -1) {
    const jsonPart = originalDesc.slice(reconIdx + reconMarker.length).trim();
    let reconJson = jsonPart;
    const nextMarkerIdx = jsonPart.indexOf(paymentMarker);
    if (nextMarkerIdx !== -1) {
      reconJson = jsonPart.slice(0, nextMarkerIdx).trim();
    }
    try {
      const parsed = JSON.parse(reconJson);
      reconciliations = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error parsing reconciliation history JSON:", e);
    }
    originalDesc = originalDesc.slice(0, reconIdx).trim();
  }

  return {
    originalDesc: originalDesc.trim(),
    history,
    reconciliations
  };
}

export function serializeDebtDescription(
  originalDesc: string,
  history: PaymentHistoryItem[],
  reconciliations: ReconciliationLog[] = []
) {
  const base = originalDesc.trim();
  let result = base;
  if (reconciliations.length > 0) {
    result += `\n\n[RECONCILIATION_LOGS]: ${JSON.stringify(reconciliations)}`;
  }
  if (history.length > 0) {
    result += `\n\n[PAYMENT_LOGS]: ${JSON.stringify(history)}`;
  }
  return result.trim();
}

export function DebtPaymentOffcanvas({ open, onClose, onSuccess, debt }: DebtPaymentOffcanvasProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form states
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payMethod, setPayMethod] = useState("Chuyển khoản");
  const [payNote, setPayNote] = useState("");
  const [shouldPrintOnSubmit, setShouldPrintOnSubmit] = useState(true);

  // History parsing
  const [originalDesc, setOriginalDesc] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationLog[]>([]);

  // Print helper state
  const [activePrintItem, setActivePrintItem] = useState<any | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isReceivable = debt ? (debt.type?.toUpperCase() === "RECEIVABLE" || debt.type === "phai-thu") : true;

  const generateReceiptCode = (isRec: boolean) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const rand = Math.floor(100 + Math.random() * 900);
    const prefix = isRec ? "PT" : "PC";
    return `${prefix}-${yyyy}${mm}${dd}-${rand}`;
  };

  useEffect(() => {
    if (open && debt) {
      const remaining = Math.max(0, debt.amount - debt.paidAmount);
      const isRec = debt.type?.toUpperCase() === "RECEIVABLE" || debt.type === "phai-thu";
      setPayAmount(remaining);
      setPayDate(new Date().toISOString().split("T")[0]);
      setPayRef(generateReceiptCode(isRec));
      setPayMethod("Chuyển khoản");
      setShouldPrintOnSubmit(true);

      let defaultNote = "";
      if (isRec) {
        defaultNote = `Thu nợ khách hàng - ${debt.partnerName}`;
      } else {
        const isLoan = debt.type?.toUpperCase() === "LOAN" || debt.type === "vay";
        defaultNote = isLoan ? `Trả nợ vay - ${debt.partnerName}` : `Trả nợ nhà cung cấp - ${debt.partnerName}`;
      }
      setPayNote(defaultNote);

      const parsed = parseDebtDescription(debt.description);
      setOriginalDesc(parsed.originalDesc);
      setPaymentHistory(parsed.history);
      setReconciliations(parsed.reconciliations);
      setActivePrintItem(null);

      // Fetch companyInfo
      fetch("/api/company")
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setCompanyInfo(data);
          }
        })
        .catch((err) => console.error("Error fetching company info:", err));
    }
  }, [open, debt]);

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!debt) return;

    if (payAmount <= 0) {
      error("Lỗi", "Số tiền thanh toán phải lớn hơn 0");
      return;
    }

    const remaining = debt.amount - debt.paidAmount;
    if (payAmount > remaining) {
      error("Lỗi", `Số tiền thanh toán vượt quá số dư nợ còn lại (${remaining.toLocaleString("vi-VN")}đ)`);
      return;
    }

    setLoading(true);
    try {
      const newPaidAmount = debt.paidAmount + payAmount;
      const isCompleted = newPaidAmount >= debt.amount;
      const newStatus = isCompleted ? "PAID" : "PARTIAL";

      const newHistoryItem: PaymentHistoryItem = {
        id: `PT-${Date.now()}`,
        amount: payAmount,
        date: payDate,
        ref: payRef,
        method: payMethod,
        note: payNote,
      };

      const updatedHistory = [...paymentHistory, newHistoryItem];
      const updatedDescription = serializeDebtDescription(originalDesc, updatedHistory, reconciliations);

      const res = await fetch(`/api/finance/debts-v2?id=${debt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...debt,
          paidAmount: newPaidAmount,
          status: newStatus,
          description: updatedDescription,
          newPayment: newHistoryItem,
        }),
      });

      if (res.ok) {
        success("Thành công", `Đã ghi nhận thanh toán ${payAmount.toLocaleString("vi-VN")}đ`);
        
        if (shouldPrintOnSubmit) {
          // Trigger print for the new item immediately
          setActivePrintItem({
            ...newHistoryItem,
            partnerName: debt.partnerName,
            isReceivable,
            companyInfo,
          });
          setTimeout(() => {
            printDocumentById("phieu-thu-print-area", "portrait", `${isReceivable ? "Phiếu thu" : "Phiếu chi"} - ${newHistoryItem.ref}`, true, "15mm 15mm 15mm 20mm");
            setActivePrintItem(null);
          }, 300);
        }

        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        error("Lỗi", data.error || "Không thể cập nhật công nợ");
      }
    } catch (err) {
      error("Lỗi", "Đã xảy ra lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDraft = () => {
    if (payAmount <= 0) {
      error("Lỗi", "Vui lòng nhập số tiền thu để in thử");
      return;
    }
    setActivePrintItem({
      id: "DRAFT",
      amount: payAmount,
      date: payDate,
      ref: payRef || (isReceivable ? "PT-NHAP" : "PC-NHAP"),
      method: payMethod,
      note: payNote || (isReceivable ? `Thu nợ khách hàng - ${debt?.partnerName}` : `Trả nợ nhà cung cấp - ${debt?.partnerName}`),
      partnerName: debt?.partnerName || "Khách hàng",
      isReceivable,
      companyInfo,
    });
    setTimeout(() => {
      printDocumentById("phieu-thu-print-area", "portrait", `${isReceivable ? "Phiếu thu" : "Phiếu chi"} nháp - ${payRef}`, true, "15mm 15mm 15mm 20mm");
      setActivePrintItem(null);
    }, 300);
  };

  const handlePrint = (item: PaymentHistoryItem) => {
    setActivePrintItem({
      ...item,
      partnerName: debt?.partnerName || "Khách hàng lẻ",
      isReceivable,
      companyInfo,
    });
    // Allow DOM to update then print
    setTimeout(() => {
      printDocumentById("phieu-thu-print-area", "portrait", `${isReceivable ? "Phiếu thu" : "Phiếu chi"} - ${item.ref}`, true, "15mm 15mm 15mm 20mm");
      setActivePrintItem(null);
    }, 300);
  };

  if (!mounted) return null;

  const remainingAmt = debt ? debt.amount - debt.paidAmount : 0;
  const formattedDate = (dStr: string) => {
    if (!dStr) return "";
    const parts = dStr.split("-");
    if (parts.length === 3) return `Ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
    return dStr;
  };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 };
  const inputStyle = { fontSize: 13, borderRadius: 8 };

  return createPortal(
    <>
      {debt && (
        <>
          <div
            className={`offcanvas-backdrop fade ${open ? "show" : ""}`}
            style={{ pointerEvents: open ? "auto" : "none", display: open ? "block" : "none", zIndex: 1040 }}
            onClick={onClose}
          />

          <div
            className={`offcanvas offcanvas-end border-0 shadow-lg ${open ? "show" : ""}`}
        style={{
          width: 400,
          visibility: open ? "visible" : "hidden",
          transition: "transform 0.3s ease-in-out, visibility 0.3s",
          background: "var(--background)",
          zIndex: 1045,
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-4" style={{ background: "linear-gradient(to right, var(--background), var(--secondary-subtle))" }}>
          <div className="d-flex align-items-center gap-3">
            <i className="bi bi-cash-coin fs-4 text-success" />
            <h5 className="offcanvas-title fw-bold mb-0" style={{ fontSize: 17, letterSpacing: -0.2 }}>
              Ghi nhận thanh toán
            </h5>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-4 overflow-auto">
          {/* Card Thông tin công nợ */}
          <div className="card border-0 bg-light p-3 mb-4 rounded-4">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span className="text-muted small">Đối tác / Khách hàng</span>
                <h6 className="fw-bold text-dark mb-0 mt-0.5" style={{ fontSize: 15 }}>
                  {debt.partnerName}
                </h6>
              </div>
              <span className={`badge bg-${remainingAmt === 0 ? "success" : "warning"}-subtle text-${remainingAmt === 0 ? "success" : "warning"} rounded-pill px-3 py-1.5`} style={{ fontSize: 10.5 }}>
                {remainingAmt === 0 ? "Đã tất toán" : "Còn nợ"}
              </span>
            </div>
            
            {debt.referenceId && (
              <div className="mb-2 text-muted small">
                <strong>REF:</strong> {debt.referenceId}
              </div>
            )}

            <hr className="my-2 opacity-50" />

            <div className="row g-2 text-center mt-1">
              <div className="col-4">
                <span className="text-muted block" style={{ fontSize: 10.5 }}>TỔNG NỢ</span>
                <div className="fw-bold text-dark mt-0.5" style={{ fontSize: 13 }}>
                  {debt.amount.toLocaleString("vi-VN")}đ
                </div>
              </div>
              <div className="col-4 border-start">
                <span className="text-muted block" style={{ fontSize: 10.5 }}>ĐÃ THANH TOÁN</span>
                <div className="fw-bold text-success mt-0.5" style={{ fontSize: 13 }}>
                  {debt.paidAmount.toLocaleString("vi-VN")}đ
                </div>
              </div>
              <div className="col-4 border-start">
                <span className="text-muted block" style={{ fontSize: 10.5 }}>
                  {isReceivable ? "CÒN PHẢI THU" : "CÒN PHẢI TRẢ"}
                </span>
                <div className="fw-bold text-danger mt-0.5" style={{ fontSize: 13 }}>
                  {remainingAmt.toLocaleString("vi-VN")}đ
                </div>
              </div>
            </div>
          </div>

          {/* Ghi nhận thu/trả nợ mới (Form) */}
          {remainingAmt > 0 && (
            <div className="border-top pt-3 pb-3">
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className={`bi bi-${isReceivable ? "plus-circle" : "dash-circle"} text-${isReceivable ? "success" : "danger"}`} />
                <label className={`form-label fw-bold text-${isReceivable ? "success" : "danger"} small text-uppercase mb-0`} style={{ letterSpacing: 0.5 }}>
                  {isReceivable ? "Ghi nhận thu nợ mới" : "Ghi nhận trả nợ mới"}
                </label>
              </div>

              <form id="payment-form" onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" style={labelStyle}>
                    {isReceivable ? "Số tiền thu (đồng)" : "Số tiền chi (đồng)"} <span className="text-danger">*</span>
                  </label>
                  <CurrencyInput
                    className="form-control"
                    value={payAmount}
                    onChange={setPayAmount}
                    style={{ ...inputStyle, fontWeight: "bold", fontSize: 14 }}
                  />
                  <div className="form-text text-muted" style={{ fontSize: 11 }}>
                    Bằng chữ: <em>{docSoTien(payAmount)}</em>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label" style={labelStyle}>Ngày thu</label>
                    <input
                      type="date"
                      className="form-control"
                      value={payDate}
                      onChange={e => setPayDate(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label" style={labelStyle}>{isReceivable ? "Số phiếu thu" : "Số phiếu chi"}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={payRef}
                      onChange={e => setPayRef(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3 align-items-end">
                  <div className="col-7">
                    <label className="form-label" style={labelStyle}>Phương thức thanh toán</label>
                    <select
                      className="form-select"
                      value={payMethod}
                      onChange={e => setPayMethod(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Chuyển khoản">Chuyển khoản</option>
                      <option value="Tiền mặt">Tiền mặt</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div className="col-5 pb-2 d-flex justify-content-end align-items-center">
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input cursor-pointer"
                        type="checkbox"
                        id="print-receipt-toggle"
                        checked={shouldPrintOnSubmit}
                        onChange={e => setShouldPrintOnSubmit(e.target.checked)}
                      />
                      <label className="form-check-label small fw-bold text-muted cursor-pointer ms-2" htmlFor="print-receipt-toggle" style={{ fontSize: 12 }}>
                        {isReceivable ? "In phiếu thu" : "In phiếu chi"}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label" style={labelStyle}>{isReceivable ? "Ghi chú thu nợ" : "Ghi chú chi trả"}</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Diễn giải nội dung..."
                    value={payNote}
                    onChange={e => setPayNote(e.target.value)}
                    style={{ ...inputStyle, resize: "none" }}
                  />
                </div>

                <div className="mb-3 text-muted small">
                  Đơn hàng liên kết: <strong className="text-dark">{debt.referenceId || "Không có"}</strong>
                </div>
              </form>
            </div>
          )}

          {/* Lịch sử giao dịch */}
          <div className="border-top pt-4 mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-clock-history text-primary" />
              <label className="form-label fw-bold text-primary small text-uppercase mb-0" style={{ letterSpacing: 0.5 }}>
                Lịch sử thanh toán ({paymentHistory.length})
              </label>
            </div>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-3 text-muted border rounded-3 bg-light-subtle" style={{ fontSize: 12.5, borderStyle: "dashed !important" }}>
                Chưa có giao dịch thanh toán nào được ghi nhận.
              </div>
            ) : (
              <div className="table-responsive border rounded-3">
                <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: 12 }}>
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3 py-2">Giao dịch</th>
                      <th className="text-end pe-3 py-2">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="ps-3 py-2">
                          <div className="fw-bold text-dark">{item.ref}</div>
                          <div className="text-muted d-flex align-items-center gap-2 mt-0.5" style={{ fontSize: 10.5 }}>
                            <span>{item.date}</span>
                            <span>•</span>
                            <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2" style={{ fontSize: 9.5 }}>
                              {item.method}
                            </span>
                          </div>
                        </td>
                        <td className="text-end pe-3 py-2">
                          <div className="d-flex align-items-center justify-content-end gap-2">
                            <span className="fw-bold text-success" style={{ fontSize: 13 }}>
                              {item.amount.toLocaleString("vi-VN")}đ
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm rounded-circle d-inline-flex align-items-center justify-content-center"
                              onClick={() => handlePrint(item)}
                              title="In phiếu"
                              style={{ width: 28, height: 28, padding: 0 }}
                            >
                              <i className="bi bi-printer" style={{ fontSize: 13 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="offcanvas-footer p-3 border-top bg-light">
          <div className="d-flex gap-2">
            <BrandButton
              variant="outline"
              className="py-2"
              onClick={onClose}
              disabled={loading}
              style={{ fontSize: 13, minWidth: 80 }}
            >
              Hủy
            </BrandButton>
            {remainingAmt > 0 && (
              <BrandButton
                type="submit"
                form="payment-form"
                className="flex-grow-1 py-2"
                loading={loading}
                style={{ fontSize: 13 }}
              >
                {shouldPrintOnSubmit
                  ? (isReceivable ? "In phiếu thu" : "In phiếu chi")
                  : (isReceivable ? "Xác nhận thu" : "Xác nhận chi")}
              </BrandButton>
            )}
          </div>
        </div>
      </div>
      </>)}

      {/* Hidden printing layout for browser printing */}
      {activePrintItem && (
        <div id="phieu-thu-print-area" className="d-none">
          <div style={{ fontFamily: "'Roboto Condensed', sans-serif", padding: "10px", color: "#000", fontSize: "13.5px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "2px solid #003087", paddingBottom: "10px" }}>
              <div style={{ width: "100%", display: "flex", gap: "12px", alignItems: "center" }}>
                {activePrintItem.companyInfo?.logoUrl ? (
                  <img src={activePrintItem.companyInfo.logoUrl} style={{ height: "45px", objectFit: "contain" }} alt="Logo" />
                ) : (
                  <div style={{ width: "45px", height: "45px", borderRadius: "8px", background: "#003087", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "18px", flexShrink: 0 }}>
                    SJ
                  </div>
                )}
                <div>
                  <h6 style={{ fontWeight: "bold", margin: 0, textTransform: "uppercase", fontSize: "13px", letterSpacing: "0.3px", color: "#003087" }}>
                    {activePrintItem.companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
                  </h6>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#444", lineHeight: 1.3 }}>
                    Địa chỉ: {activePrintItem.companyInfo?.address || "Đường số 3, KCN Yên Phong, Huyện Yên Phong, Tỉnh Bắc Ninh"}
                  </p>
                  <p style={{ margin: "1px 0 0 0", fontSize: "11px", color: "#444", lineHeight: 1.3 }}>
                    Điện thoại: {activePrintItem.companyInfo?.phone || "0222.368.6868"} {activePrintItem.companyInfo?.website ? `| Website: ${activePrintItem.companyInfo.website}` : ""}
                  </p>
                </div>
              </div>
             </div>
 
             {/* Title */}
             <div style={{ textAlign: "center", margin: "25px 0" }}>
               <h3 style={{ fontWeight: "bold", margin: 0, fontSize: "24px", color: "#003087", letterSpacing: "1px" }}>
                 {activePrintItem.isReceivable ? "PHIẾU THU" : "PHIẾU CHI"}
               </h3>
               <div style={{ fontSize: "12px", fontStyle: "italic", marginTop: "3px", color: "#333" }}>
                 {formattedDate(activePrintItem.date)}
               </div>
               <div style={{ fontSize: "12px", marginTop: "4px" }}>
                 Số: <span style={{ fontWeight: "bold" }}>{activePrintItem.ref}</span>
               </div>
             </div>
 
             {/* Information table */}
             <div style={{ marginBottom: "30px" }}>
               <table style={{ width: "100%", borderCollapse: "collapse" }}>
                 <tbody>
                   <tr>
                     <td style={{ width: "25%", padding: "7px 0", verticalAlign: "bottom", whiteSpace: "nowrap" }}>
                       {activePrintItem.isReceivable ? "Họ và tên người nộp tiền:" : "Họ và tên người nhận tiền:"}
                     </td>
                     <td style={{ borderBottom: "1px dotted #000", padding: "7px 0 3px 0", fontWeight: "bold", verticalAlign: "bottom" }}>
                       {activePrintItem.partnerName}
                     </td>
                   </tr>
                   <tr>
                     <td style={{ padding: "7px 0", verticalAlign: "bottom" }}>
                       Địa chỉ:
                     </td>
                     <td style={{ borderBottom: "1px dotted #000", padding: "7px 0 3px 0", verticalAlign: "bottom" }}>
                       {activePrintItem.isReceivable ? "Đại diện Khách hàng / Đối tác doanh nghiệp của Seajong Faucet" : "Đại diện Nhà cung cấp / Đối tác doanh nghiệp"}
                     </td>
                   </tr>
                   <tr>
                     <td style={{ padding: "7px 0", verticalAlign: "bottom" }}>
                       {activePrintItem.isReceivable ? "Lý do nộp:" : "Lý do chi:"}
                     </td>
                     <td style={{ borderBottom: "1px dotted #000", padding: "7px 0 3px 0", verticalAlign: "bottom" }}>
                       {activePrintItem.note}
                     </td>
                   </tr>
                  <tr>
                    <td style={{ padding: "7px 0", verticalAlign: "bottom" }}>
                      Số tiền:
                    </td>
                    <td style={{ borderBottom: "1px dotted #000", padding: "7px 0 3px 0", fontWeight: "bold", fontSize: "14px", verticalAlign: "bottom" }}>
                      {activePrintItem.amount.toLocaleString("vi-VN")} VND
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "7px 0", verticalAlign: "bottom" }}>
                      Bằng chữ:
                    </td>
                    <td style={{ borderBottom: "1px dotted #000", padding: "7px 0 3px 0", fontStyle: "italic", fontWeight: "600", verticalAlign: "bottom" }}>
                      {docSoTien(activePrintItem.amount)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "7px 0", verticalAlign: "bottom" }}>
                      Kèm theo:
                    </td>
                    <td style={{ borderBottom: "1px dotted #000", padding: "7px 0 3px 0", verticalAlign: "bottom" }}>
                      Chứng từ kế toán gốc kèm theo hóa đơn đối chiếu công nợ.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature Area */}
            <div style={{ display: "flex", justifyContent: "space-between", margin: "40px 0 60px 0", fontSize: "12px", textAlign: "center" }}>
              <div style={{ width: "20%" }}>
                <div style={{ fontWeight: "bold" }}>Giám đốc</div>
                <div style={{ fontStyle: "italic", fontSize: "10px", color: "#555" }}>(Ký, đóng dấu)</div>
                <div style={{ height: "65px" }}></div>
                <div style={{ fontWeight: "bold" }}>....................</div>
              </div>
              <div style={{ width: "20%" }}>
                <div style={{ fontWeight: "bold" }}>Kế toán trưởng</div>
                <div style={{ fontStyle: "italic", fontSize: "10px", color: "#555" }}>(Ký, ghi họ tên)</div>
                <div style={{ height: "65px" }}></div>
                <div style={{ fontWeight: "bold" }}>....................</div>
              </div>
              <div style={{ width: "20%" }}>
                <div style={{ fontWeight: "bold" }}>Thủ quỹ</div>
                <div style={{ fontStyle: "italic", fontSize: "10px", color: "#555" }}>(Ký, ghi họ tên)</div>
                <div style={{ height: "65px" }}></div>
                <div style={{ fontWeight: "bold" }}>....................</div>
              </div>
              <div style={{ width: "20%" }}>
                <div style={{ fontWeight: "bold" }}>{activePrintItem.isReceivable ? "Người nộp tiền" : "Người nhận tiền"}</div>
                <div style={{ fontStyle: "italic", fontSize: "10px", color: "#555" }}>(Ký, ghi họ tên)</div>
                <div style={{ height: "65px" }}></div>
                <div style={{ fontWeight: "bold", fontSize: "11px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {activePrintItem.partnerName}
                </div>
              </div>
              <div style={{ width: "20%" }}>
                <div style={{ fontWeight: "bold" }}>Người lập phiếu</div>
                <div style={{ fontStyle: "italic", fontSize: "10px", color: "#555" }}>(Ký, ghi họ tên)</div>
                <div style={{ height: "65px" }}></div>
                <div style={{ fontWeight: "bold" }}>Trần Thị Linh</div>
              </div>
            </div>

            {/* Treasurer note */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #ccc", paddingTop: "15px", fontStyle: "italic", fontSize: "11px", color: "#333" }}>
              <div>Đã nhận đủ số tiền (viết bằng chữ): .....................................................................................................</div>
              <div style={{ fontWeight: "bold", fontSize: "11.5px" }}>Đơn vị tính: đồng Việt Nam (VND)</div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
