"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { printDocumentById } from "@/components/ui/PrintPreviewModal";
import { useSession } from "next-auth/react";
import { 
  parseDebtDescription, 
  serializeDebtDescription, 
  docSoTien, 
  PaymentHistoryItem, 
  ReconciliationLog 
} from "./DebtPaymentOffcanvas";

interface DebtReconciliationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: any | null;
}

export function DebtReconciliationModal({ open, onClose, onSuccess, debt }: DebtReconciliationModalProps) {
  const { data: session } = useSession();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Date Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Reconciliation form states
  const [reconDate, setReconDate] = useState("");
  const [reconciler, setReconciler] = useState("");
  const [reconStatus, setReconStatus] = useState<"MATCHED" | "DISCREPANCY" | "UNRECONCILED">("MATCHED");
  const [diffAmount, setDiffAmount] = useState(0);
  const [reconNote, setReconNote] = useState("");

  // Parsed debt components
  const [originalDesc, setOriginalDesc] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [reconHistory, setReconHistory] = useState<ReconciliationLog[]>([]);

  // Company and Partner Info for Print
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [reconcilerInfo, setReconcilerInfo] = useState<{ phone?: string; position?: string } | null>(null);
  const [positions, setPositions] = useState<{ code: string; name: string }[]>([]);

  // Print helper state
  const [activePrintItem, setActivePrintItem] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getPositionName = (code: string) => {
    if (!code) return "............................................................";
    const pos = positions.find((p) => p.code === code);
    return pos ? pos.name : code;
  };

  // Fetch reconciler details from DB when reconciler name changes
  useEffect(() => {
    if (reconciler) {
      fetch(`/api/hr/employees?search=${encodeURIComponent(reconciler)}&pageSize=5`)
        .then((res) => res.json())
        .then((data) => {
          const emp = data.employees?.find((e: any) => e.fullName === reconciler) || data.employees?.[0];
          if (emp) {
            setReconcilerInfo({
              phone: emp.phone || "",
              position: emp.position || "",
            });
          } else {
            setReconcilerInfo(null);
          }
        })
        .catch((err) => {
          console.error("Error fetching reconciler details:", err);
          setReconcilerInfo(null);
        });
    } else {
      setReconcilerInfo(null);
    }
  }, [reconciler]);

  const isReceivable = debt ? (debt.type?.toUpperCase() === "RECEIVABLE" || debt.type === "phai-thu") : true;

  // Initialize values when modal opens
  useEffect(() => {
    if (open && debt) {
      // Fetch companyInfo if not already loaded
      fetch("/api/company")
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setCompanyInfo(data);
          }
        })
        .catch((err) => console.error("Error fetching company info:", err));

      // Fetch positions list
      fetch("/api/board/categories?type=position")
        .then((r) => r.json())
        .then((d) => setPositions(d ?? []))
        .catch(() => {});

      // Fetch partner info based on type
      const isRec = debt.type?.toUpperCase() === "RECEIVABLE" || debt.type === "phai-thu";
      const partnerSearchUrl = isRec
        ? `/api/plan-finance/customers?search=${encodeURIComponent(debt.partnerName)}`
        : `/api/plan-finance/suppliers?search=${encodeURIComponent(debt.partnerName)}`;

      fetch(partnerSearchUrl)
        .then((res) => res.json())
        .then((data) => {
          if (isRec) {
            const found = data.customers?.find((c: any) => c.name === debt.partnerName) || data.customers?.[0];
            if (found) {
              setPartnerInfo({
                name: found.name,
                address: found.address || "Khu vực đối tác giao nhận hàng",
                phone: found.dienThoai || "---",
                email: found.email || "---",
                daiDien: found.daiDien || found.name,
                chucVu: found.chucVu || "Khách hàng doanh nghiệp / Đối tác liên kết",
                taxCode: found.soTaiKhoan || "---",
              });
            } else {
              setPartnerInfo(null);
            }
          } else {
            const found = data.items?.find((s: any) => s.name === debt.partnerName) || data.items?.[0];
            if (found) {
              setPartnerInfo({
                name: found.name,
                address: found.address || "Khu vực đối tác giao nhận hàng",
                phone: found.phone || "---",
                email: found.email || "---",
                daiDien: found.contactName || found.name,
                chucVu: "Nhà cung cấp / Đối tác liên kết",
                taxCode: found.taxCode || "---",
              });
            } else {
              setPartnerInfo(null);
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching partner details:", err);
          setPartnerInfo(null);
        });

      const parsed = parseDebtDescription(debt.description);
      setOriginalDesc(parsed.originalDesc);
      setPaymentHistory(parsed.history);
      setReconHistory(parsed.reconciliations);
      
      // Defaults for forms
      setReconDate(new Date().toISOString().split("T")[0]);
      setReconciler(session?.user?.name || "Trần Thị Linh");
      setReconStatus("MATCHED");
      setDiffAmount(0);
      setReconNote(`Đối chiếu công nợ định kỳ khách hàng ${debt.partnerName}. Số liệu hai bên khớp đúng.`);
      
      // Reset date filters
      setStartDate("");
      setEndDate("");
      setActivePrintItem(null);
    }
  }, [open, debt, session]);

  // Construct ledger transactions
  const transactions = useMemo(() => {
    if (!debt) return [];

    const list: any[] = [];
    
    // 1. Initial balance line
    list.push({
      id: "OPENING_BALANCE",
      date: debt.createdAt ? new Date(debt.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      ref: "DK",
      type: "Dư nợ đầu kỳ",
      increase: 0,
      decrease: 0,
      note: "Số dư chuyển sang"
    });

    // 2. Main Incurred Debt (Invoice / Contract creation)
    list.push({
      id: "MAIN_DEBT",
      date: debt.createdAt ? new Date(debt.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      ref: debt.referenceId || "---",
      type: isReceivable ? "Bán hàng" : "Mua hàng",
      increase: debt.amount,
      decrease: 0,
      note: originalDesc || (isReceivable ? "Phát sinh công nợ phải thu" : "Phát sinh công nợ phải trả")
    });

    // 3. Payments
    paymentHistory.forEach((p) => {
      let cleanedNote = p.note || "";
      if (debt?.partnerName) {
        // Remove suffix "- partnerName" or similar
        cleanedNote = cleanedNote.replace(new RegExp(`\\s*-\\s*${debt.partnerName}`, "g"), "");
      }
      list.push({
        id: p.id,
        date: p.date,
        ref: p.ref,
        type: isReceivable ? "Phiếu thu (Thu nợ)" : "Phiếu chi (Trả nợ)",
        increase: 0,
        decrease: p.amount,
        note: p.method ? `${cleanedNote} - ${p.method}` : cleanedNote
      });
    });

    // Sort by date (except opening balance always first)
    const sortedDetails = list.slice(1).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const finalTransactions = [list[0], ...sortedDetails];

    // Compute cumulative balance
    let cumulative = 0;
    finalTransactions.forEach((tx) => {
      cumulative = cumulative + tx.increase - tx.decrease;
      tx.balance = cumulative;
    });

    return finalTransactions;
  }, [debt, paymentHistory, originalDesc, isReceivable]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.id === "OPENING_BALANCE") return true; // Keep opening balance line
      if (startDate && new Date(tx.date) < new Date(startDate)) return false;
      if (endDate && new Date(tx.date) > new Date(endDate)) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  // Total summary for filtered period
  const totals = useMemo(() => {
    let increase = 0;
    let decrease = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.id !== "OPENING_BALANCE") {
        increase += tx.increase;
        decrease += tx.decrease;
      }
    });
    return { increase, decrease };
  }, [filteredTransactions]);

  const handleSubmitReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debt) return;

    setLoading(true);
    try {
      const newLog: ReconciliationLog = {
        id: `DC-${Date.now()}`,
        date: reconDate,
        createdAt: new Date().toISOString(),
        reconciler,
        status: reconStatus,
        note: reconNote,
        differenceAmount: reconStatus === "DISCREPANCY" ? diffAmount : 0,
        periodStart: startDate || undefined,
        periodEnd: endDate || undefined
      };

      const updatedReconHistory = [newLog, ...reconHistory];
      const updatedDescription = serializeDebtDescription(originalDesc, paymentHistory, updatedReconHistory);

      const res = await fetch(`/api/finance/debts-v2?id=${debt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...debt,
          description: updatedDescription,
        }),
      });

      if (res.ok) {
        success("Thành công", "Đã lưu biên bản đối chiếu công nợ");
        setReconHistory(updatedReconHistory);
        // Reset form note
        setReconNote("");
        onSuccess();
      } else {
        const data = await res.json();
        error("Lỗi", data.error || "Không thể lưu đối chiếu");
      }
    } catch (err) {
      error("Lỗi", "Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReconciliation = (log: ReconciliationLog) => {
    setActivePrintItem({
      log,
      debt,
      transactions: filteredTransactions,
      totals,
      isReceivable,
      companyInfo,
      partnerInfo,
      reconcilerInfo
    });

    setTimeout(() => {
      printDocumentById("recon-print-area", "portrait", `Biên bản đối chiếu công nợ - ${debt.partnerName}`, true, "15mm 15mm 15mm 20mm");
    }, 150);
  };

  if (!mounted || !open || !debt) return null;

  const currentRemaining = debt.amount - debt.paidAmount;

  return createPortal(
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column"
      style={{
        zIndex: 1060,
        background: "var(--background, #f8f9fa)",
        color: "var(--foreground, #212529)",
        animation: "recon-fade-in 0.2s ease-out"
      }}
    >
      <style>{`
        @keyframes recon-fade-in {
          from { opacity: 0; transform: scale(0.99); }
          to { opacity: 1; transform: scale(1); }
        }
        .recon-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%);
          color: white;
        }
        .recon-card {
          border: none;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          background: var(--card, #ffffff);
          transition: transform 0.2s;
        }
        .recon-card:hover {
          transform: translateY(-2px);
        }
        .status-badge-matched {
          background-color: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .status-badge-discrepancy {
          background-color: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .status-badge-unreconciled {
          background-color: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
      `}</style>

      {/* HEADER SECTION */}
      <div className="recon-header px-4 py-3 d-flex align-items-center justify-content-between shadow-sm">
        <div>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-file-earmark-check fs-4" />
            <h5 className="fw-bold mb-0 text-white" style={{ fontSize: 19 }}>Đối chiếu công nợ khách hàng</h5>
            <span className="badge rounded-pill bg-white text-dark ms-2 fw-semibold px-2.5 py-1" style={{ fontSize: 11 }}>
              {isReceivable ? "Khách hàng phải thu" : "Nhà cung cấp phải trả"}
            </span>
          </div>
          <div className="text-white opacity-75 small mt-0.5">
            Khách hàng: <strong>{debt.partnerName}</strong> {debt.referenceId ? `| REF: ${debt.referenceId}` : ""}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <BrandButton 
            variant="outline"
            className="px-3 py-1.5 rounded-pill"
            style={{ fontSize: 13, color: "white", borderColor: "white" }}
            onClick={() => {
              // Print current state directly
              handlePrintReconciliation({
                id: "TEMP",
                date: new Date().toISOString().split("T")[0],
                reconciler,
                status: reconStatus,
                note: reconNote || "Đối chiếu số liệu hiện thời trên hệ thống.",
                differenceAmount: reconStatus === "DISCREPANCY" ? diffAmount : 0,
                periodStart: startDate || undefined,
                periodEnd: endDate || undefined
              });
            }}
          >
            <i className="bi bi-printer me-2" /> In biên bản
          </BrandButton>
          <BrandButton 
            type="submit"
            form="recon-form"
            variant="outline"
            className="px-3 py-1.5 rounded-pill"
            style={{ fontSize: 13, color: "white", borderColor: "white" }}
            loading={loading}
          >
            <i className="bi bi-save me-2" /> Lưu
          </BrandButton>
          <button 
            type="button" 
            className="btn btn-link text-white p-2"
            onClick={onClose}
            style={{ fontSize: 24, textDecoration: "none" }}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      </div>

      {/* CONTENT WRAPPER */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden p-4">
        <div className="container-fluid d-flex flex-column h-100 overflow-hidden">
          {/* KPI METRIC CARDS */}
          <div className="row g-3 mb-4 flex-shrink-0">
            <div className="col-md-3">
              <div className="recon-card p-3 d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small text-uppercase fw-semibold" style={{ letterSpacing: 0.5 }}>Dư nợ đầu kỳ</span>
                  <h4 className="fw-bold text-dark mb-0 mt-1" style={{ fontSize: 20 }}>0</h4>
                </div>
                <div className="bg-light-subtle text-muted rounded-circle d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: "rgba(108, 117, 125, 0.08)" }}>
                  <i className="bi bi-calendar2-week fs-5" />
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="recon-card p-3 d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small text-uppercase fw-semibold" style={{ letterSpacing: 0.5 }}>
                    {isReceivable ? "Phát sinh tăng" : "Phát sinh giảm"}
                  </span>
                  <h4 className="fw-bold text-primary mb-0 mt-1" style={{ fontSize: 20 }}>
                    {debt.amount.toLocaleString("vi-VN")}
                  </h4>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: "rgba(13, 110, 253, 0.08)", color: "#0d6efd" }}>
                  <i className="bi bi-plus-lg fs-5" />
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="recon-card p-3 d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small text-uppercase fw-semibold" style={{ letterSpacing: 0.5 }}>
                    {isReceivable ? "Phát sinh giảm (Đã thu)" : "Phát sinh tăng (Đã trả)"}
                  </span>
                  <h4 className="fw-bold text-success mb-0 mt-1" style={{ fontSize: 20 }}>
                    {debt.paidAmount.toLocaleString("vi-VN")}
                  </h4>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: "rgba(25, 135, 84, 0.08)", color: "#198754" }}>
                  <i className="bi bi-dash-lg fs-5" />
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="recon-card p-3 d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small text-uppercase fw-semibold" style={{ letterSpacing: 0.5 }}>Dư nợ cuối kỳ</span>
                  <h4 className="fw-bold text-danger mb-0 mt-1" style={{ fontSize: 20 }}>
                    {currentRemaining.toLocaleString("vi-VN")}
                  </h4>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: "rgba(220, 53, 69, 0.08)", color: "#dc3545" }}>
                  <i className="bi bi-wallet2 fs-5" />
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 flex-grow-1 overflow-hidden">
            {/* LEFT SIDE: LEDGER AND TRANSACTIONS */}
            <div className="col-lg-8 h-100 d-flex flex-column overflow-hidden">
              <div className="recon-card p-4 h-100 d-flex flex-column overflow-hidden">
                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2 flex-shrink-0">
                  <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-list-task text-primary" /> Sổ chi tiết công nợ phát sinh
                  </h6>
                  
                  {/* DATE RANGE FILTERS */}
                  <div className="d-flex align-items-center gap-2">
                    <input 
                      type="date" 
                      className="form-control form-control-sm rounded-pill" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: 135, fontSize: 11.5 }}
                      placeholder="Từ ngày"
                    />
                    <span className="text-muted small">đến</span>
                    <input 
                      type="date" 
                      className="form-control form-control-sm rounded-pill" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: 135, fontSize: 11.5 }}
                      placeholder="Đến ngày"
                    />
                    {(startDate || endDate) && (
                      <button 
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        onClick={() => { setStartDate(""); setEndDate(""); }}
                        style={{ fontSize: 11.5 }}
                      >
                        Xóa lọc
                      </button>
                    )}
                  </div>
                </div>

                {/* LEDGER TABLE */}
                <div className="table-responsive flex-grow-1 overflow-auto">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: 12.5 }}>
                    <thead className="table-light">
                      <tr className="text-uppercase" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5 }}>
                        <th className="ps-3 py-2" style={{ width: 100 }}>Ngày</th>
                        <th className="py-2" style={{ width: 110 }}>Số CT</th>
                        <th className="py-2">Diễn giải / Loại giao dịch</th>
                        <th className="text-end py-2" style={{ width: 125 }}>Phát sinh tăng</th>
                        <th className="text-end py-2" style={{ width: 125 }}>Phát sinh giảm</th>
                        <th className="text-end pe-3 py-2" style={{ width: 135 }}>Dư nợ lũy kế</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx, idx) => {
                        const isOpening = tx.id === "OPENING_BALANCE";
                        const isMain = tx.id === "MAIN_DEBT";
                        
                        return (
                          <tr key={tx.id || idx} className={isOpening ? "table-light text-muted" : ""}>
                            <td className="ps-3 py-1.5">
                              {tx.date ? new Date(tx.date).toLocaleDateString("vi-VN") : "---"}
                            </td>
                            <td className="fw-bold py-1.5">{tx.ref}</td>
                            <td className="py-1">
                              <div className="d-flex flex-column align-items-start gap-0.5">
                                <span className={`badge px-2 py-0.5 rounded-pill ${
                                  isOpening ? "bg-secondary-subtle text-secondary" :
                                  isMain ? "bg-primary-subtle text-primary" : "bg-success-subtle text-success"
                                }`} style={{ fontSize: 9.5, whiteSpace: "nowrap" }}>
                                  {tx.type}
                                </span>
                                <span className="text-muted" title={tx.note} style={{ fontSize: 11.5 }}>
                                  {tx.note}
                                </span>
                              </div>
                            </td>
                            <td className="text-end fw-medium text-primary py-1.5">
                              {tx.increase > 0 ? tx.increase.toLocaleString("vi-VN") : "-"}
                            </td>
                            <td className="text-end fw-medium text-success py-1.5">
                              {tx.decrease > 0 ? tx.decrease.toLocaleString("vi-VN") : "-"}
                            </td>
                            <td className="text-end pe-3 fw-bold text-dark py-1.5">
                              {tx.balance.toLocaleString("vi-VN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="table-light fw-bold border-top">
                      <tr>
                        <td colSpan={3} className="ps-3 py-2 text-uppercase text-muted" style={{ fontSize: 11 }}>
                          Tổng phát sinh trong kỳ
                        </td>
                        <td className="text-end text-primary py-2" style={{ fontSize: 13 }}>
                          {totals.increase > 0 ? totals.increase.toLocaleString("vi-VN") : "-"}
                        </td>
                        <td className="text-end text-success py-2" style={{ fontSize: 13 }}>
                          {totals.decrease > 0 ? totals.decrease.toLocaleString("vi-VN") : "-"}
                        </td>
                        <td className="text-end pe-3 text-danger py-2" style={{ fontSize: 13 }}>
                          {currentRemaining.toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-3 flex-shrink-0 text-muted small d-flex align-items-center gap-2">
                  <i className="bi bi-info-circle text-info" />
                  <span>Dư nợ lũy kế được tính toán dựa trên số liệu lịch sử đơn hàng gốc cùng toàn bộ các đợt thanh toán đi kèm.</span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: RECONCILIATION LOG & HISTORY */}
            <div className="col-lg-4 h-100 d-flex flex-column overflow-hidden">
              <div className="recon-card p-4 h-100 d-flex flex-column overflow-hidden">
                {/* NEW RECONCILIATION FORM SECTION */}
                <div className="flex-shrink-0">
                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-pencil-square text-success" /> Ghi nhận đối chiếu mới
                  </h6>
                  
                  <form id="recon-form" onSubmit={handleSubmitReconciliation}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold mb-1">Ngày đối chiếu</label>
                      <input 
                        type="date" 
                        className="form-control form-control-sm rounded-3" 
                        value={reconDate} 
                        onChange={(e) => setReconDate(e.target.value)}
                        required
                        style={{ fontSize: 12.5 }}
                      />
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label text-muted small fw-bold mb-1">Người đối chiếu</label>
                        <input 
                          type="text" 
                          className="form-control form-control-sm rounded-3" 
                          value={reconciler} 
                          onChange={(e) => setReconciler(e.target.value)}
                          required
                          style={{ fontSize: 12.5 }}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label text-muted small fw-bold mb-1">Kết quả đối chiếu</label>
                        <select 
                          className="form-select form-select-sm rounded-3"
                          value={reconStatus}
                          onChange={(e) => setReconStatus(e.target.value as any)}
                          style={{ fontSize: 12.5 }}
                        >
                          <option value="MATCHED">Khớp số liệu</option>
                          <option value="DISCREPANCY">Có chênh lệch</option>
                          <option value="UNRECONCILED">Chưa đối chiếu</option>
                        </select>
                      </div>
                    </div>

                    {reconStatus === "DISCREPANCY" && (
                      <div className="mb-3 animate-fade-in">
                        <label className="form-label text-muted small fw-bold mb-1">Số tiền chênh lệch (đồng)</label>
                        <CurrencyInput
                          className="form-control form-control-sm rounded-3 fw-bold text-danger"
                          value={diffAmount}
                          onChange={setDiffAmount}
                          style={{ fontSize: 13 }}
                        />
                      </div>
                    )}

                    <div className="mb-2">
                      <label className="form-label text-muted small fw-bold mb-1">Nội dung biên bản / Ghi chú đối chiếu</label>
                      <textarea 
                        className="form-control rounded-3" 
                        rows={3} 
                        value={reconNote}
                        onChange={(e) => setReconNote(e.target.value)}
                        placeholder="Mô tả chi tiết kết quả đối chiếu, nguyên nhân chênh lệch (nếu có)..."
                        style={{ fontSize: 12, resize: "none" }}
                      />
                    </div>
                  </form>
                </div>

                <hr className="my-3 flex-shrink-0" style={{ borderColor: "rgba(0,0,0,0.08)" }} />

                {/* PAST RECONCILIATIONS HISTORY SECTION */}
                <div className="flex-grow-1 d-flex flex-column overflow-hidden">
                  <h6 className="fw-bold text-dark mb-3 flex-shrink-0 d-flex align-items-center gap-2">
                    <i className="bi bi-clock-history text-primary" /> Nhật ký đối chiếu
                    <span className="badge rounded-pill bg-primary-subtle text-primary ms-1" style={{ fontSize: 11 }}>
                      {reconHistory.length}
                    </span>
                  </h6>
                  
                  <div className="flex-grow-1 overflow-auto pe-1">
                    {reconHistory.length === 0 ? (
                      <div className="text-center py-4 text-muted border rounded-3 bg-light-subtle" style={{ fontSize: 12, borderStyle: "dashed" }}>
                        Chưa ghi nhận biên bản đối chiếu nào.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {reconHistory.map((item, idx) => {
                          const statusClass = 
                            item.status === "MATCHED" ? "status-badge-matched" : 
                            item.status === "DISCREPANCY" ? "status-badge-discrepancy" : "status-badge-unreconciled";
                          
                          const statusLabel = 
                            item.status === "MATCHED" ? "Khớp số" : 
                            item.status === "DISCREPANCY" ? "Chênh lệch" : "Chưa đối chiếu";
                            
                          let displayTime = "---";
                          if (item.date) {
                            const d = new Date(item.date);
                            let hh = "";
                            let mm = "";
                            const saveDate = item.createdAt 
                              ? new Date(item.createdAt) 
                              : (item.id && item.id.startsWith("DC-") 
                                  ? new Date(parseInt(item.id.replace("DC-", ""), 10)) 
                                  : null);
                            
                            if (saveDate && !isNaN(saveDate.getTime())) {
                              hh = String(saveDate.getHours()).padStart(2, "0");
                              mm = String(saveDate.getMinutes()).padStart(2, "0");
                            }
                            const dateStr = d.toLocaleDateString("vi-VN");
                            displayTime = hh && mm ? `${hh}:${mm} ${dateStr}` : dateStr;
                          }

                          return (
                            <div key={item.id || idx} className="p-2.5 bg-light-subtle transition-all hover-shadow mb-2 rounded-3">
                              <div className="d-flex align-items-center justify-content-between">
                                <span className="fw-bold text-dark" style={{ fontSize: 12 }}>
                                  {displayTime}
                                </span>
                                <span className={`badge px-2 py-0.5 rounded-pill ${statusClass}`} style={{ fontSize: 9.5 }}>
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="text-muted small mt-1" style={{ fontSize: 11, lineHeight: 1.4 }}>
                                {item.note}
                              </div>
                              {item.status === "DISCREPANCY" && item.differenceAmount && (
                                <div className="text-danger fw-bold small mt-1" style={{ fontSize: 10.5 }}>
                                  Chênh lệch: {item.differenceAmount.toLocaleString("vi-VN")}
                                </div>
                              )}
                              <div className="d-flex align-items-center justify-content-between mt-2 pt-1.5 border-top">
                                <span className="text-muted" style={{ fontSize: 10 }}>Người thực hiện: <strong>{item.reconciler}</strong></span>
                                <button 
                                  type="button" 
                                  className="btn btn-link btn-sm p-0 d-inline-flex align-items-center text-primary"
                                  onClick={() => handlePrintReconciliation(item)}
                                  style={{ fontSize: 10.5, textDecoration: "none" }}
                                >
                                  <i className="bi bi-printer me-1" /> In lại
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRINTING RENDER AREA (HIDDEN FROM SCREEN, VISIBLE ON PRINT) */}
      {activePrintItem && (
        <div id="recon-print-area" className="d-none">
          <div style={{ fontFamily: "'Roboto Condensed', sans-serif", padding: "15px", color: "#000", fontSize: "13.5px", lineHeight: 1.5 }}>
            {/* Logo/Header */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", borderBottom: "2px solid #003087", paddingBottom: "10px" }}>
              <div style={{ display: "flex", gap: "15px", alignItems: "center", width: "100%" }}>
                {activePrintItem.companyInfo?.logoUrl ? (
                  <img src={activePrintItem.companyInfo.logoUrl} style={{ height: "45px", objectFit: "contain" }} alt="Logo" />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                      <div style={{
                        position: "absolute",
                        left: -4, right: -4, top: -2, bottom: -2,
                        border: "1.5px solid #ef4444",
                        borderRadius: "50% / 40% 45% 35% 50%",
                        transform: "skewX(-10deg) rotate(-3deg)",
                        pointerEvents: "none"
                      }} />
                      <span style={{ fontFamily: "sans-serif", fontWeight: 950, fontSize: 24, color: "#003087", letterSpacing: -0.5, zIndex: 2 }}>
                        Seajong<span style={{ color: "#ef4444", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>®</span>
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <h6 style={{ fontWeight: "bold", margin: 0, textTransform: "uppercase", fontSize: "11px", color: "#003087" }}>
                    {activePrintItem.companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
                  </h6>
                  <p style={{ margin: "2px 0 0 0", fontSize: "9.5px", color: "#444" }}>
                    Địa chỉ: {activePrintItem.companyInfo?.address || "Đường số 3, KCN Yên Phong, Huyện Yên Phong, Tỉnh Bắc Ninh"}
                  </p>
                  <p style={{ margin: "1px 0 0 0", fontSize: "9.5px", color: "#444" }}>
                    Điện thoại: {activePrintItem.companyInfo?.phone || "0222.368.6868"} {activePrintItem.companyInfo?.email ? `| Email: ${activePrintItem.companyInfo.email}` : ""} {activePrintItem.companyInfo?.website ? `| Website: ${activePrintItem.companyInfo.website}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: "center", margin: "25px 0" }}>
              <h3 style={{ fontWeight: "bold", margin: 0, fontSize: "22px", color: "#003087", letterSpacing: "1px", textTransform: "uppercase" }}>
                BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ
              </h3>
              <div style={{ fontSize: "12px", fontStyle: "italic", marginTop: "4px" }}>
                Hôm nay, ngày {new Date(activePrintItem.log.date).getDate()} tháng {new Date(activePrintItem.log.date).getMonth() + 1} năm {new Date(activePrintItem.log.date).getFullYear()}
              </div>
              <div style={{ fontSize: "12px", fontStyle: "italic", marginTop: "2px" }}>
                Chúng tôi gồm có:
              </div>
            </div>

            {/* Parties Info */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "5px", textTransform: "uppercase" }}>
                BÊN A: {activePrintItem.companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", fontSize: "12.5px" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "15%", padding: "2px 0" }}>Đại diện:</td>
                    <td style={{ width: "35%", fontWeight: "bold" }}>{activePrintItem.log.reconciler || "............................................................"}</td>
                    <td style={{ width: "15%", padding: "2px 0" }}>Chức vụ:</td>
                    <td>{activePrintItem.reconcilerInfo?.position ? getPositionName(activePrintItem.reconcilerInfo.position) : (activePrintItem.companyInfo?.legalRep === activePrintItem.log.reconciler ? "Người đại diện pháp luật" : "............................................................")}</td>
                  </tr>
                  <tr>
                    <td>Điện thoại:</td>
                    <td>{activePrintItem.reconcilerInfo?.phone || activePrintItem.companyInfo?.phone || "............................................................"}</td>
                    <td>Địa chỉ:</td>
                    <td>{activePrintItem.companyInfo?.address || "............................................................"}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontWeight: "bold", marginBottom: "5px", textTransform: "uppercase" }}>
                BÊN B: {activePrintItem.partnerInfo?.name || activePrintItem.debt.partnerName}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", fontSize: "12.5px" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "15%", padding: "2px 0" }}>Đại diện:</td>
                    <td style={{ width: "35%", fontWeight: "bold" }}>{activePrintItem.partnerInfo?.daiDien || activePrintItem.debt.partnerName || "............................................................"}</td>
                    <td style={{ width: "15%", padding: "2px 0" }}>Chức vụ:</td>
                    <td>{activePrintItem.partnerInfo?.chucVu && activePrintItem.partnerInfo.chucVu !== "Khách hàng doanh nghiệp / Đối tác liên kết" && activePrintItem.partnerInfo.chucVu !== "Nhà cung cấp / Đối tác liên kết" ? activePrintItem.partnerInfo.chucVu : "............................................................"}</td>
                  </tr>
                  <tr>
                    <td>Điện thoại:</td>
                    <td>{activePrintItem.partnerInfo?.phone && activePrintItem.partnerInfo.phone !== "---" ? activePrintItem.partnerInfo.phone : "............................................................"}</td>
                    <td>Địa chỉ:</td>
                    <td>{activePrintItem.partnerInfo?.address && activePrintItem.partnerInfo.address !== "Khu vực đối tác giao nhận hàng" ? activePrintItem.partnerInfo.address : "............................................................"}</td>
                  </tr>
                  {activePrintItem.partnerInfo?.taxCode && activePrintItem.partnerInfo.taxCode !== "---" && (
                    <tr>
                      <td>Mã số thuế:</td>
                      <td colSpan={3}>{activePrintItem.partnerInfo.taxCode}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p style={{ fontSize: "12.5px" }}>
              Cùng nhau đối chiếu các khoản công nợ phát sinh trong kỳ báo cáo kể từ ngày {activePrintItem.log.periodStart ? new Date(activePrintItem.log.periodStart).toLocaleDateString("vi-VN") : "đầu kỳ"} đến ngày {activePrintItem.log.periodEnd ? new Date(activePrintItem.log.periodEnd).toLocaleDateString("vi-VN") : new Date(activePrintItem.log.date).toLocaleDateString("vi-VN")}. Kết quả cụ thể như sau:
            </p>

            <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "12px", marginBottom: "5px" }}>
              Đơn vị tính: đồng
            </div>

            {/* Reconciliation table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#eee", textAlign: "center", fontWeight: "bold" }}>
                  <th style={{ border: "1px solid #000", padding: "6px" }}>STT</th>
                  <th style={{ border: "1px solid #000", padding: "6px" }}>Ngày chứng từ</th>
                  <th style={{ border: "1px solid #000", padding: "6px" }}>Diễn giải nội dung giao dịch</th>
                  <th style={{ border: "1px solid #000", padding: "6px" }}>Phát sinh tăng</th>
                  <th style={{ border: "1px solid #000", padding: "6px" }}>Phát sinh giảm</th>
                  <th style={{ border: "1px solid #000", padding: "6px" }}>Số dư nợ lũy kế</th>
                </tr>
              </thead>
              <tbody>
                {activePrintItem.transactions.map((tx: any, idx: number) => {
                  let typeText = tx.type;
                  let bg = "#f3f4f6";
                  let color = "#374151";
                  let border = "#e5e7eb";

                  if (tx.type === "Phiếu thu (Thu nợ)" || tx.type === "Phiếu thu") {
                    typeText = "Phiếu thu";
                    bg = "#dcfce7";
                    color = "#15803d";
                    border = "#bbf7d0";
                  } else if (tx.type === "Phiếu chi (Trả nợ)" || tx.type === "Phiếu chi") {
                    typeText = "Phiếu chi";
                    bg = "#ffe4e6";
                    color = "#b91c1c";
                    border = "#fecdd3";
                  } else if (tx.type === "Bán hàng") {
                    bg = "#e0f2fe";
                    color = "#0369a1";
                    border = "#bae6fd";
                  } else if (tx.type === "Mua hàng") {
                    bg = "#fef3c7";
                    color = "#b45309";
                    border = "#fde68a";
                  }

                  return (
                    <tr key={tx.id || idx}>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "center" }}>
                        {tx.date ? new Date(tx.date).toLocaleDateString("vi-VN") : "---"}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "5px" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginBottom: "3px" }}>
                          {tx.ref && tx.ref !== "---" && tx.ref !== "DK" && (
                            <span style={{ fontWeight: "bold", fontSize: "11px", color: "#1e3a8a" }}>
                              {tx.ref}
                            </span>
                          )}
                          <span style={{
                            display: "inline-block",
                            padding: "1px 5px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            borderRadius: "3px",
                            background: bg,
                            color: color,
                            border: `1px solid ${border}`,
                            lineHeight: "1.2"
                          }}>
                            {typeText}
                          </span>
                        </div>
                        <div style={{ color: "#333", fontSize: "12px", lineHeight: "1.3" }}>
                          {tx.note}
                        </div>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "right" }}>
                        {tx.increase > 0 ? tx.increase.toLocaleString("vi-VN") : "-"}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "right" }}>
                        {tx.decrease > 0 ? tx.decrease.toLocaleString("vi-VN") : "-"}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "right", fontWeight: "bold" }}>
                        {tx.balance.toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ fontWeight: "bold", background: "#f9f9f9" }}>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: "6px", textTransform: "uppercase" }}>Tổng cộng phát sinh</td>
                  <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>
                    {activePrintItem.totals.increase.toLocaleString("vi-VN")}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>
                    {activePrintItem.totals.decrease.toLocaleString("vi-VN")}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", color: "red" }}>
                    {(activePrintItem.debt.amount - activePrintItem.debt.paidAmount).toLocaleString("vi-VN")}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Conclusion and Notes */}
            <div style={{ marginBottom: "25px", fontSize: "12.5px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Kết luận đối chiếu:</div>
              <ul style={{ paddingLeft: "20px", margin: "5px 0" }}>
                <li>Số dư cuối kỳ Bên B nợ Bên A là: <strong>{(activePrintItem.debt.amount - activePrintItem.debt.paidAmount).toLocaleString("vi-VN")} đồng</strong></li>
                <li>Bằng chữ: <em>{docSoTien(activePrintItem.debt.amount - activePrintItem.debt.paidAmount)}</em></li>
                <li>Tình trạng khớp số liệu: <strong>{
                  activePrintItem.log.status === "MATCHED" ? "HAI BÊN KHỚP ĐÚNG SỐ LIỆU, KHÔNG CÓ CHÊNH LỆCH" : 
                  activePrintItem.log.status === "DISCREPANCY" ? `CÓ CHÊNH LỆCH SỐ TIỀN: ${activePrintItem.log.differenceAmount?.toLocaleString("vi-VN")}` : "ĐANG CHỜ XÁC THỰC THÊM"
                }</strong></li>
                <li style={{ marginTop: "4px" }}>Ghi chú chi tiết: {activePrintItem.log.note}</li>
              </ul>
            </div>

            {/* Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", fontSize: "12px", textAlign: "center" }}>
              <div style={{ width: "45%" }}>
                <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>ĐẠI DIỆN BÊN A</div>
                <div style={{ height: "60px" }} />
                <div style={{ fontWeight: "bold" }}>{activePrintItem.log.reconciler}</div>
              </div>
              <div style={{ width: "45%" }}>
                <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>ĐẠI DIỆN BÊN B</div>
                <div style={{ height: "60px" }} />
                <div style={{ fontWeight: "bold" }}>{activePrintItem.partnerInfo?.daiDien || activePrintItem.debt.partnerName}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
