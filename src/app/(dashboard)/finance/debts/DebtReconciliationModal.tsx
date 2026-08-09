"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { BrandButton } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { printDocumentById } from "@/components/ui/PrintPreviewModal";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
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


const formatCurrency = (val: number) => (Math.round(val / 1000) * 1000).toLocaleString("vi-VN");

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

  const typeUpper = debt?.type?.toUpperCase() || "";
  const isReceivable = debt ? (typeUpper === "RECEIVABLE" || typeUpper === "PHAI-THU" || typeUpper === "PHAI_THU") : true;

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
      
      // Default date filters based on group items and clicked debt
      const items = debt.groupItems || [debt];
      const oldestItem = [...items].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())[0];
      
      const defaultStart = oldestItem?.createdAt ? new Date(oldestItem.createdAt) : new Date();
      setStartDate(format(defaultStart, "yyyy-MM-dd'T'HH:mm:ss"));
      
      const defaultEnd = debt.createdAt ? new Date(debt.createdAt) : new Date();
      setEndDate(format(defaultEnd, "yyyy-MM-dd'T'HH:mm:ss"));
      
      setActivePrintItem(null);
    }
  }, [open, debt, session]);

  // Construct ledger transactions
  const transactions = useMemo(() => {
    if (!debt) return { finalTransactions: [] as any[], openingBalanceValue: 0 };

    const items = debt.groupItems || [debt];
    let totalOpeningBalance = 0;
    let openingBalanceDate = "";
    const list: any[] = [];
    
    items.forEach((item: any) => {
      const isOpeningBalance = item.referenceId === "Dư nợ đầu kỳ" || item.description?.includes("Dư nợ đầu kỳ") || item.referenceId === "Nợ cũ" || item.description?.includes("Nợ cũ");
      const createdAt = item.createdAt ? new Date(item.createdAt) : new Date();

      if (isOpeningBalance) {
        totalOpeningBalance += item.amount;
        // Keep the oldest date if multiple exist, or just use the first found
        if (!openingBalanceDate || createdAt.toISOString() < openingBalanceDate) {
           openingBalanceDate = createdAt.toISOString();
        }
      } else {
        const pDesc = parseDebtDescription(item.description);
        list.push({
          id: `MAIN_DEBT_${item.id}`,
          date: createdAt.toISOString(), // Giữ nguyên full time
          ref: item.referenceId || "---",
          type: isReceivable ? "Bán hàng" : "Mua hàng",
          increase: item.amount,
          decrease: 0,
          note: pDesc.originalDesc || (isReceivable ? "Phát sinh công nợ phải thu" : "Phát sinh công nợ phải trả")
        });
      }

      // Payments from this item
      const parsed = parseDebtDescription(item.description);
      parsed.history.forEach((p) => {
        let cleanedNote = p.note || "";
        if (item.partnerName) {
          cleanedNote = cleanedNote.replace(new RegExp(`\\s*-\\s*${item.partnerName}`, "g"), "");
        }
        // Giả sử p.date là YYYY-MM-DD, chuyển về cuối ngày để thanh toán thường sau lúc tạo đơn
        const pDate = new Date(p.date);
        if (pDate.getHours() === 0) {
           pDate.setHours(23, 59, 59);
        }
        
        list.push({
          id: p.id,
          date: pDate.toISOString(),
          ref: p.ref,
          type: isReceivable ? "Phiếu thu (Thu nợ)" : "Phiếu chi (Trả nợ)",
          increase: 0,
          decrease: p.amount,
          note: p.method ? `${cleanedNote} - ${p.method}` : cleanedNote
        });
      });
    });

    // 1. Initial balance line
    const openingRow = {
      id: "OPENING_BALANCE",
      date: openingBalanceDate, // Date for display, but forced to bottom via UI render logic
      ref: "DK",
      type: "Dư nợ đầu kỳ",
      increase: 0,
      decrease: 0,
      note: "Dư nợ cũ chuyển sang"
    };

    // Sort all details ASCENDING by date to compute running balance correctly
    const sortedDetails = list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const finalTransactions = [openingRow, ...sortedDetails];

    // Compute cumulative balance
    let cumulative = totalOpeningBalance;
    finalTransactions.forEach((tx) => {
      cumulative = cumulative + tx.increase - tx.decrease;
      tx.balance = cumulative;
    });

    return { finalTransactions, openingBalanceValue: totalOpeningBalance };
  }, [debt, isReceivable]);

  // Filtered transactions and computed totals based on date range
  const { filteredTransactions, totals } = useMemo(() => {
    let openingBalance = transactions.openingBalanceValue;
    
    // If there is a start date, calculate the accumulated balance before that date
    if (startDate) {
      const startDateTime = new Date(startDate).getTime();
      transactions.finalTransactions.forEach((tx: any) => {
        if (tx.id !== "OPENING_BALANCE" && tx.date) {
          const txTime = new Date(tx.date).getTime();
          if (txTime < startDateTime) {
            openingBalance = openingBalance + tx.increase - tx.decrease;
          }
        }
      });
    }

    // Filter transactions within the date range
    const filtered = transactions.finalTransactions.filter((tx: any) => {
      if (tx.id === "OPENING_BALANCE") return true; 
      
      const txTime = new Date(tx.date).getTime();
      if (startDate) {
        const startDayTime = new Date(startDate);
        startDayTime.setHours(0, 0, 0, 0); // Lọc từ đầu ngày
        if (txTime < startDayTime.getTime()) return false;
      }
      if (endDate) {
        const endDayTime = new Date(endDate);
        endDayTime.setHours(23, 59, 59, 999); // Đến cuối ngày
        if (txTime > endDayTime.getTime()) return false;
      }
      return true;
    }).map((tx: any) => ({ ...tx })); // Shallow copy to allow mutating balance

    // Recalculate balances for the filtered list
    let cumulative = openingBalance;
    let periodIncrease = 0;
    let periodDecrease = 0;

    filtered.forEach((tx: any) => {
      if (tx.id === "OPENING_BALANCE") {
        tx.balance = cumulative;
      } else {
        periodIncrease += tx.increase;
        periodDecrease += tx.decrease;
        cumulative = cumulative + tx.increase - tx.decrease;
        tx.balance = cumulative;
      }
    });

    return {
      filteredTransactions: filtered,
      totals: {
        openingBalance,
        increase: periodIncrease,
        decrease: periodDecrease
      }
    };
  }, [transactions, startDate, endDate]);

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

  const currentRemaining = totals.openingBalance + totals.increase - totals.decrease;

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
            <h5 className="fw-bold mb-0 text-white" style={{ fontSize: 19 }}>{isReceivable ? "Đối chiếu công nợ khách hàng" : "Đối chiếu công nợ nhà cung cấp"}</h5>
            <span className="badge rounded-pill bg-white text-dark ms-2 fw-semibold px-2.5 py-1" style={{ fontSize: 11 }}>
              {isReceivable ? "Khách hàng phải thu" : "Phải trả nhà cung cấp"}
            </span>
          </div>
          <div className="text-white opacity-75 small mt-0.5">
            {isReceivable ? "Khách hàng" : "Nhà cung cấp"}: <strong>{debt.partnerName}</strong> {debt.referenceId ? `| REF: ${debt.referenceId}` : ""}
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
                  <h4 className="fw-bold text-dark mb-0 mt-1" style={{ fontSize: 20 }}>
                    {formatCurrency(totals.openingBalance)}
                  </h4>
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
                    {formatCurrency(totals.increase)}
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
                    {formatCurrency(totals.decrease)}
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
                    {formatCurrency(currentRemaining)}
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
                      type="datetime-local" 
                      step="1"
                      className="form-control form-control-sm rounded-pill" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: 185, fontSize: 11.5 }}
                      placeholder="Từ ngày"
                    />
                    <span className="text-muted small">đến</span>
                    <input 
                      type="datetime-local" 
                      step="1"
                      className="form-control form-control-sm rounded-pill" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: 185, fontSize: 11.5 }}
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
                      {[...filteredTransactions].reverse().map((tx: any, idx: number) => {
                        const isOpening = tx.id === "OPENING_BALANCE";
                        const isMain = tx.id?.startsWith("MAIN_DEBT");
                        
                        // Format date helper: "HH:mm:ss dd/MM/yyyy"
                        const displayDate = tx.date 
                          ? format(new Date(tx.date), "HH:mm:ss dd/MM/yyyy") 
                          : "---";

                        return (
                          <tr key={tx.id || idx} className={isOpening ? "table-light text-muted" : ""}>
                            <td className="ps-3 py-1.5" style={{ whiteSpace: "nowrap" }}>
                              {displayDate}
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
                              {tx.increase > 0 ?formatCurrency( tx.increase) : "-"}
                            </td>
                            <td className="text-end fw-medium text-success py-1.5">
                              {tx.decrease > 0 ?formatCurrency( tx.decrease) : "-"}
                            </td>
                            <td className="text-end pe-3 fw-bold text-dark py-1.5">
                              {formatCurrency(tx.balance)}
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
                          {totals.increase > 0 ?formatCurrency( totals.increase) : "-"}
                        </td>
                        <td className="text-end text-success py-2" style={{ fontSize: 13 }}>
                          {totals.decrease > 0 ?formatCurrency( totals.decrease) : "-"}
                        </td>
                        <td className="text-end pe-3 text-danger py-2" style={{ fontSize: 13 }}>
                          {formatCurrency(currentRemaining)}
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
                {/* GHI NHẬN ĐỐI CHIẾU MỚI (chỉ hiện khi đối chiếu 1 đơn cụ thể) */}
                {!debt?.isGroupHeader && (
                  <div className="flex-grow-1 d-flex flex-column overflow-hidden pe-1">
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2 flex-shrink-0">
                      <i className="bi bi-pencil-square text-success" /> Ghi nhận đối chiếu mới
                    </h6>
                    
                    <div className="bg-light-subtle rounded-3 p-3 border d-flex flex-column flex-grow-1">
                      <form id="recon-form" onSubmit={handleSubmitReconciliation} className="d-flex flex-column flex-grow-1">
                        <div className="mb-3 flex-shrink-0">
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

                        <div className="row g-2 mb-3 flex-shrink-0">
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
                          <div className="mb-3 animate-fade-in flex-shrink-0">
                            <label className="form-label text-muted small fw-bold mb-1">Số tiền chênh lệch (đồng)</label>
                            <CurrencyInput
                              className="form-control form-control-sm rounded-3 fw-bold text-danger"
                              value={diffAmount}
                              onChange={setDiffAmount}
                              style={{ fontSize: 13 }}
                            />
                          </div>
                        )}

                        <div className="mb-0 flex-grow-1 d-flex flex-column">
                          <label className="form-label text-muted small fw-bold mb-1 flex-shrink-0">Nội dung biên bản / Ghi chú đối chiếu</label>
                          <textarea 
                            className="form-control rounded-3 flex-grow-1" 
                            value={reconNote}
                            onChange={(e) => setReconNote(e.target.value)}
                            placeholder="Mô tả chi tiết kết quả đối chiếu, nguyên nhân chênh lệch (nếu có)..."
                            style={{ fontSize: 12, resize: "none", minHeight: "100px" }}
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                )}
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
                        {tx.increase > 0 ?formatCurrency( tx.increase) : "-"}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "right" }}>
                        {tx.decrease > 0 ?formatCurrency( tx.decrease) : "-"}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "right", fontWeight: "bold" }}>
                        {formatCurrency(tx.balance)}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ fontWeight: "bold", background: "#f9f9f9" }}>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: "6px", textTransform: "uppercase" }}>Tổng cộng phát sinh</td>
                  <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>
                    {formatCurrency(activePrintItem.totals.increase)}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>
                    {formatCurrency(activePrintItem.totals.decrease)}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", color: "red" }}>
                    {formatCurrency((activePrintItem.debt.amount - activePrintItem.debt.paidAmount))}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Conclusion and Notes */}
            <div style={{ marginBottom: "25px", fontSize: "12.5px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Kết luận đối chiếu:</div>
              <ul style={{ paddingLeft: "20px", margin: "5px 0" }}>
                <li>Số dư cuối kỳ Bên B nợ Bên A là: <strong>{formatCurrency((activePrintItem.debt.amount - activePrintItem.debt.paidAmount))} đồng</strong></li>
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
