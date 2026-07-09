"use client";

import React, { useState, useMemo, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { Table, TableColumn } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExpensePaymentModal } from "./ExpensePaymentModal";
import { useToast } from "@/components/ui/Toast";
import { LoanRepaymentScheduleModal } from "./LoanRepaymentScheduleModal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FinancialStatusRow {
  stt: string | number;
  item: string;
  value: number;
  target: number;
  progress: number;
  isChild?: boolean;
  isGrandchild?: boolean;
  hideProgress?: boolean;
}

interface FinancialReportRow {
  code: string;
  item: string;
  note: string;
  current: number;
  previous: number;
  isParent?: boolean;
  isChild?: boolean;
  isCalculated?: boolean;
}

interface FixedAsset {
  id: string;
  code: string;
  tenTaiSan: string;
  loai: string;
  ngayMua: string;
  originalValue: number;
  totalMonths: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  remainingValue: number;
  trangThai: string;
  viTri: string;
  donVi?: string;
  nguoiSuDung?: string;
  ghiChu: string;
}

interface AssetSummary {
  totalOriginalValue: number;
  totalAccumulatedDepreciation: number;
  totalRemainingValue: number;
  totalCount: number;
}

interface Indicators {
  yearlyRevenue: number;
  monthlyRevenue: number;
  cashAvailable: number;
  inventoryValue: number;
  targetRevenue?: number;
}

// ── Step Definitions ──────────────────────────────────────────────────────────
const STEP_ITEMS: ModernStepItem[] = [
  { id: "financial_reports", title: "Báo cáo tài chính", desc: "Xem báo cáo & Phân tích", icon: "bi-file-earmark-bar-graph", num: 1 },
  { id: "fixed_assets", title: "Tài sản cố định", desc: "Giám sát & Khấu hao", icon: "bi-building-fill-gear", num: 2 },
  { id: "debts", title: "Công nợ", desc: "Theo dõi phải thu & phải trả", icon: "bi-journal-check", num: 3 },
  // { id: "loans", title: "Nợ vay", desc: "Ngân hàng & Lãi suất", icon: "bi-cash-coin", num: 4 },
  { id: "expenses", title: "Chi phí", desc: "Kiểm soát chi phí vận hành", icon: "bi-receipt-cutoff", num: 4 },
  { id: "inventory", title: "Tồn kho", desc: "Cơ cấu & Số lượng tồn", icon: "bi-boxes", num: 5 },
];

// Helper to format currency values to VND string with rounding and no decimals
const formatVnd = (val: number) => {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(val));
};

const STATUS_COLUMNS: TableColumn<FinancialStatusRow>[] = [
  {
    header: "STT",
    width: "70px",
    align: "center",
    render: (row) => <span className="text-muted fw-semibold">{row.stt}</span>,
  },
  {
    header: "Hạng mục",
    align: "left",
    render: (row) => {
      if (row.isGrandchild) {
        return (
          <span 
            className="text-muted fw-normal" 
            style={{ fontSize: 12, paddingLeft: 16, display: "inline-block" }}
          >
            {row.item}
          </span>
        );
      }
      if (row.isChild) {
        return (
          <span 
            className="text-muted fw-semibold" 
            style={{ fontSize: 12.5 }}
          >
            {row.item}
          </span>
        );
      }
      return <span className="fw-bold text-dark text-uppercase">{row.item}</span>;
    },
  },
  {
    header: "Giá trị (đ)",
    align: "right",
    width: "180px",
    render: (row) => {
      let weightClass = "fw-bold text-dark";
      if (row.isChild) weightClass = "fw-semibold text-muted";
      if (row.isGrandchild) weightClass = "fw-normal text-muted/80";
      
      return (
        <span className={`font-monospace ${weightClass}`}>
          {formatVnd(row.value)}
        </span>
      );
    },
  },
  {
    header: "Mục tiêu (đ)",
    align: "right",
    width: "180px",
    render: (row) => {
      let weightClass = "fw-bold text-dark";
      if (row.isChild) weightClass = "fw-semibold text-muted";
      if (row.isGrandchild) weightClass = "fw-normal text-muted/80";
      
      return (
        <span className={`font-monospace ${weightClass}`}>
          {formatVnd(row.target)}
        </span>
      );
    },
  },
  {
    header: "Tiến độ (%)",
    align: "left",
    width: "220px",
    render: (row) => {
      if (row.isGrandchild || row.hideProgress) return null;

      let barBg = "linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)";
      if (row.isChild) barBg = "linear-gradient(90deg, #94a3b8 0%, #cbd5e1 100%)";

      return (
        <div className="d-flex align-items-center gap-2">
          <div className="progress flex-grow-1" style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div 
              className="progress-bar bg-primary" 
              style={{ 
                width: `${row.progress}%`, 
                height: "100%",
                borderRadius: 3,
                background: barBg
              }} 
            />
          </div>
          <span className="fw-semibold text-muted" style={{ fontSize: 11, minWidth: 32, textAlign: "right" }}>
            {row.progress}%
          </span>
        </div>
      );
    },
  },
];

const REPORT_COLUMNS: TableColumn<FinancialReportRow>[] = [
  {
    header: "Chỉ tiêu",
    align: "left",
    render: (row) => {
      let fontClass = "fw-normal text-muted/90";
      let paddingLeft = 0;
      if (row.isParent) {
        fontClass = "fw-bold text-dark text-uppercase";
      } else if (row.isChild) {
        fontClass = "text-muted fw-normal";
        paddingLeft = 16;
      } else if (row.isCalculated) {
        fontClass = "fw-semibold text-dark";
      } else {
        fontClass = "fw-medium text-dark/80";
        paddingLeft = 8;
      }
      return (
        <span className={fontClass} style={{ paddingLeft, display: "inline-block", fontSize: 12.5 }}>
          {row.item}
        </span>
      );
    }
  },
  {
    header: "Mã số",
    align: "center",
    width: "80px",
    render: (row) => <span className="text-muted font-monospace" style={{ fontSize: 12 }}>{row.code}</span>
  },
  {
    header: "Thuyết minh",
    align: "center",
    width: "110px",
    render: (row) => <span className="text-muted" style={{ fontSize: 12 }}>{row.note}</span>
  },
  {
    header: "Kỳ này (đ)",
    align: "right",
    width: "180px",
    render: (row) => {
      const weightClass = row.isParent || row.isCalculated ? "fw-bold text-dark" : "fw-medium text-muted";
      return <span className={`font-monospace ${weightClass}`}>{formatVnd(row.current)}</span>;
    }
  },
  {
    header: "Kỳ trước (đ)",
    align: "right",
    width: "180px",
    render: (row) => {
      const weightClass = row.isParent || row.isCalculated ? "fw-bold text-dark" : "fw-medium text-muted";
      return <span className={`font-monospace ${weightClass}`}>{formatVnd(row.previous)}</span>;
    }
  }
];

const ASSET_COLUMNS: TableColumn<FixedAsset>[] = [
  {
    header: "Tài sản cố định",
    align: "left",
    render: (row) => (
      <div className="d-flex flex-column" style={{ gap: "5px" }}>
        <span className="fw-bold text-dark d-block" style={{ fontSize: 12.5, lineHeight: "1.2" }}>
          {row.tenTaiSan}
        </span>
        <div className="d-flex align-items-center gap-1.5 flex-nowrap" style={{ fontSize: 10.5 }}>
          <span className="badge rounded-pill bg-primary-subtle text-primary border" style={{ fontSize: 9.5, padding: "2px 6px", fontWeight: 700, whiteSpace: "nowrap" }}>
            {row.loai}
          </span>
          {(row.donVi || row.nguoiSuDung) && (
            <>
              <span className="text-muted" style={{ opacity: 0.5 }}>|</span>
              <span className="badge rounded-pill bg-light text-dark border" style={{ fontSize: 9.5, padding: "2px 6px", fontWeight: 500, whiteSpace: "nowrap" }}>
                {[row.donVi, row.nguoiSuDung].filter(Boolean).join(" | ")}
              </span>
            </>
          )}
          {row.viTri && (
            <>
              <span className="text-muted" style={{ opacity: 0.5 }}>|</span>
              <span className="text-muted d-inline-flex align-items-center gap-0.5">
                <i className="bi bi-geo-alt-fill text-muted" style={{ fontSize: 9.5 }} />
                {row.viTri}
              </span>
            </>
          )}
        </div>
      </div>
    )
  },
  {
    header: "Ngày mua",
    width: "115px",
    align: "center",
    render: (row) => {
      const parts = row.ngayMua.split("-");
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : row.ngayMua;
      return <span className="text-muted font-monospace" style={{ fontSize: 12 }}>{formattedDate}</span>;
    }
  },
  {
    header: "Nguyên giá (đ)",
    width: "145px",
    align: "right",
    render: (row) => <span className="font-monospace fw-semibold text-dark" style={{ fontSize: 12 }}>{formatVnd(row.originalValue)}</span>
  },
  {
    header: "Khấu hao (đ)",
    width: "145px",
    align: "right",
    render: (row) => <span className="font-monospace text-muted" style={{ fontSize: 12 }}>{formatVnd(row.monthlyDepreciation)}</span>
  },
  {
    header: "Lũy kế (đ)",
    width: "155px",
    align: "right",
    render: (row) => <span className="font-monospace text-danger fw-semibold" style={{ fontSize: 12 }}>{formatVnd(row.accumulatedDepreciation)}</span>
  },
  {
    header: "Giá trị còn lại (đ)",
    width: "150px",
    align: "right",
    render: (row) => <span className="font-monospace text-success fw-semibold" style={{ fontSize: 12 }}>{formatVnd(row.remainingValue)}</span>
  },
  {
    header: "Trạng thái",
    width: "130px",
    align: "center",
    render: (row) => {
      let badgeClass = "bg-success-subtle text-success";
      let statusText = row.trangThai;
      const statusLower = (row.trangThai || "").toLowerCase();

      if (statusLower === "dang-su-dung" || statusLower.includes("đang sử dụng")) {
        badgeClass = "bg-primary-subtle text-primary";
        statusText = "Đang sử dụng";
      } else if (statusLower === "dang-bao-duong" || statusLower.includes("bảo trì") || statusLower.includes("bảo dưỡng") || statusLower.includes("sửa chữa")) {
        badgeClass = "bg-warning-subtle text-warning";
        statusText = "Đang bảo trì";
      } else if (statusLower === "da-thanh-ly" || statusLower.includes("thanh lý")) {
        badgeClass = "bg-secondary-subtle text-secondary";
        statusText = "Đã thanh lý";
      } else if (statusLower === "chua-su-dung" || statusLower.includes("chưa sử dụng")) {
        badgeClass = "bg-light text-muted border";
        statusText = "Chưa sử dụng";
      } else if (statusLower === "het-khau-hao" || statusLower.includes("hết khấu hao")) {
        badgeClass = "bg-info-subtle text-info";
        statusText = "Hết khấu hao";
      }
      return (
        <span className={`badge rounded-pill px-2.5 py-1 ${badgeClass}`} style={{ fontSize: 11 }}>
          {statusText}
        </span>
      );
    }
  }
];

interface DebtRow {
  id: string;
  type: "receivable" | "payable" | "bank";
  partnerName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  isOverdue: boolean;
  status: string;
  description: string;
  referenceId: string;
  isGroupHeader?: boolean;
  groupHeaderLabel?: string;
  repaymentMethod?: string | null;
}

interface DebtSubSummary {
  total: number;
  overdue: number;
  recovered: number;
}

interface DebtSummary {
  receivable: DebtSubSummary;
  payable: DebtSubSummary;
  bank?: DebtSubSummary;
}

function cleanDescription(desc: string): string {
  if (!desc) return "";
  
  if (desc.includes("[RECONCILIATION_LOGS]:")) {
    try {
      const match = desc.match(/\[RECONCILIATION_LOGS\]:\s*(\[.*?\])/);
      if (match && match[1]) {
        const logs = JSON.parse(match[1]);
        if (Array.isArray(logs) && logs.length > 0 && logs[0].note) {
          return logs[0].note;
        }
      }
    } catch (e) {
      // Fallback
    }
  }
  
  let cleaned = desc.split("\n")[0];
  cleaned = cleaned.replace(/\[RECONCILIATION_LOGS\]:.*$/, "");
  cleaned = cleaned.replace(/\[PAYMENT_LOGS\]:.*$/, "");
  
  return cleaned.trim() || "Chi tiết giao dịch";
}

const getRepaymentMethodName = (method?: string | null) => {
  if (!method) return "";
  switch (method) {
    case 'goc_deu_lai_giam': return 'Gốc đều, lãi giảm dần';
    case 'tra_gop_deu': return 'Trả góp đều';
    case 'lai_hang_thang_goc_cuoi_ky': return 'Lãi hàng tháng, gốc cuối kỳ';
    case 'goc_lai_cuoi_ky': return 'Gốc & Lãi cuối kỳ';
    case 'tra_theo_du_no_thuc_te': return 'Theo dư nợ thực tế';
    default: return method;
  }
};

const DEBT_COLUMNS = (
  type: "receivable" | "payable" | "bank",
  collapsedDebts: Record<string, boolean>,
  toggleDebtCollapse: (label: string) => void,
  allDebts: DebtRow[],
  selectedLoans?: string[],
  toggleLoanSelection?: (id: string) => void,
  toggleGroupLoanSelection?: (groupLabel: string, loanIds: string[]) => void
): TableColumn<DebtRow>[] => {
  if (type === "bank") {
    return [
      {
        header: "",
        align: "center",
        width: 40,
        render: (row) => {
          if (row.isGroupHeader) {
            const groupLabel = row.groupHeaderLabel || "";
            const groupDebts = allDebts.filter(d => d.partnerName === groupLabel);
            const allSelected = groupDebts.length > 0 && groupDebts.every(d => selectedLoans?.includes(d.id));
            const someSelected = groupDebts.some(d => selectedLoans?.includes(d.id));

            return (
              <div className="form-check d-flex justify-content-center align-items-center m-0" onClick={e => e.stopPropagation()}>
                <input 
                  className="form-check-input m-0 cursor-pointer shadow-sm border-secondary-subtle" 
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) {
                      input.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onChange={() => toggleGroupLoanSelection?.(groupLabel, groupDebts.map(d => d.id))}
                />
              </div>
            );
          }
          return (
            <div className="form-check d-flex justify-content-center align-items-center m-0" onClick={e => e.stopPropagation()}>
              <input 
                className="form-check-input m-0 cursor-pointer shadow-sm border-secondary-subtle" 
                type="checkbox"
                checked={selectedLoans?.includes(row.id) || false}
                onChange={() => toggleLoanSelection?.(row.id)}
              />
            </div>
          );
        }
      },
      {
        header: "SỐ HỢP ĐỒNG / KHOẢN VAY",
        align: "left",
        render: (row) => {
          if (row.isGroupHeader) {
            const groupLabel = row.groupHeaderLabel || "";
            const isCollapsed = !!collapsedDebts[groupLabel];
            const groupDebts = allDebts.filter(d => d.partnerName === groupLabel);
            const count = groupDebts.length;
            const remaining = groupDebts.reduce((sum, item) => sum + item.remainingAmount, 0);
            
            return (
              <div 
                onClick={() => toggleDebtCollapse(groupLabel)}
                className="fw-bold d-flex align-items-center gap-2 py-1 text-nowrap" 
                style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.02em", cursor: "pointer", userSelect: "none", color: "#d94600" }}
              >
                <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-down"} text-muted`} style={{ fontSize: 12 }} />
                {groupLabel}
                <span className="text-muted fw-normal ms-1" style={{ fontSize: 11, textTransform: "none" }}>
                  ({count} khoản vay - Dư nợ: <strong className="text-dark font-monospace">{formatVnd(remaining)} đ</strong>)
                </span>
              </div>
            );
          }

          let badgeClass = "bg-success-subtle text-success";
          let statusText = "Đang vay";
          if (row.remainingAmount === 0 || row.status === "PAID") {
            badgeClass = "bg-secondary-subtle text-secondary";
            statusText = "Đã tất toán";
          } else if (row.isOverdue) {
            badgeClass = "bg-danger-subtle text-danger";
            statusText = "Quá hạn";
          }

          return (
            <div className="d-flex flex-column gap-1" style={{ paddingLeft: "20px" }}>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold text-nowrap text-dark" style={{ fontSize: 12 }}>
                  {row.referenceId || row.partnerName}
                </span>
                <span className={`badge rounded-pill px-2.5 py-0.5 ${badgeClass}`} style={{ fontSize: 10, fontWeight: 500 }}>
                  {statusText}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: 9.5, fontWeight: 500 }}>
                  {row.description ? cleanDescription(row.description) : "Vay tín chấp"}
                </span>
                {row.repaymentMethod && (
                  <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: 9.5, fontWeight: 500 }}>
                    {getRepaymentMethodName(row.repaymentMethod)}
                  </span>
                )}
              </div>
            </div>
          );
        }
      },
      {
        header: "NGÀY ĐÁO HẠN",
        width: "120px",
        align: "center",
        render: (row) => {
          if (row.isGroupHeader) return null;
          if (!row.dueDate) return <span className="text-muted">—</span>;
          const parts = row.dueDate.split("-");
          const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : row.dueDate;
          return (
            <span className={`font-monospace ${row.isOverdue ? "text-danger fw-bold" : "text-muted"}`} style={{ fontSize: 12 }}>
              {formattedDate}
            </span>
          );
        }
      },
      {
        header: "DƯ NỢ GỐC (Đ)",
        width: "150px",
        align: "right",
        render: (row) => row.isGroupHeader ? null : <span className="font-monospace fw-semibold text-dark" style={{ fontSize: 12 }}>{formatVnd(row.amount)}</span>
      },
      {
        header: "LÃI DỰ TÍNH (ĐẾN NAY)",
        width: "180px",
        align: "right",
        render: (row) => {
          if (row.isGroupHeader) return null;
          // Fake interest calculation based on amount for mockup purposes
          const interest = Math.floor(row.amount * 0.05);
          return <span className="font-monospace text-warning fw-semibold" style={{ fontSize: 12 }}>{formatVnd(interest)}</span>
        }
      },
      {
        header: "ĐÃ TRẢ GỐC (Đ)",
        width: "150px",
        align: "right",
        render: (row) => row.isGroupHeader ? null : <span className="font-monospace text-success fw-semibold" style={{ fontSize: 12 }}>{formatVnd(row.paidAmount)}</span>
      },
      {
        header: "DƯ NỢ HIỆN TẠI (Đ)",
        width: "150px",
        align: "right",
        render: (row) => {
          if (row.isGroupHeader) return null;
          return <span className="font-monospace fw-semibold text-danger" style={{ fontSize: 12 }}>{formatVnd(row.remainingAmount)}</span>
        }
      }
    ];
  }

  return [
  {
    header: "Đối tác / Giao dịch",
    align: "left",
    colSpan: (row) => (row.isGroupHeader ? 6 : 1),
    render: (row) => {
      if (row.isGroupHeader) {
        const groupLabel = row.groupHeaderLabel || "";
        const isCollapsed = !!collapsedDebts[groupLabel];
        
        // Calculate dynamic count and total remaining of items in this group
        const groupDebts = allDebts.filter(d => d.partnerName === groupLabel);
        const count = groupDebts.length;
        const remaining = groupDebts.reduce((sum, item) => sum + item.remainingAmount, 0);
        const statusLabel = type === "receivable" ? "Phải thu" : "Phải trả";
        const headerColor = type === "receivable" ? "#0f766e" : "#d94600";

        return (
          <div 
            onClick={() => toggleDebtCollapse(groupLabel)}
            className="fw-bold d-flex align-items-center gap-2 py-1" 
            style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.02em", cursor: "pointer", userSelect: "none", color: headerColor }}
          >
            <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-down"} text-muted`} style={{ fontSize: 12 }} />
            {groupLabel}
            <span className="text-muted fw-normal ms-1" style={{ fontSize: 11, textTransform: "none" }}>
              ({count} khoản - {statusLabel}: <strong className="text-dark font-monospace">{formatVnd(remaining)} đồng</strong>)
            </span>
          </div>
        );
      }
      return (
        <div className="d-flex flex-column gap-1" style={{ paddingLeft: "20px" }}>
          <div className="d-flex align-items-center flex-wrap gap-2">
            {row.referenceId ? (
              <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: 10, padding: "2px 6px", fontWeight: 500 }}>
                Đơn: {row.referenceId}
              </span>
            ) : (
              <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: 10, padding: "2px 6px", fontWeight: 500 }}>
                N/A
              </span>
            )}
            <span className="fw-semibold text-dark" style={{ fontSize: 12, lineHeight: "1.2" }}>
              {row.description ? cleanDescription(row.description) : "Chi tiết giao dịch"}
            </span>
          </div>
        </div>
      );
    }
  },
  {
    header: "Hạn thanh toán",
    width: "120px",
    align: "center",
    render: (row) => {
      if (row.isGroupHeader) return null;
      if (!row.dueDate) return <span className="text-muted">—</span>;
      const parts = row.dueDate.split("-");
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : row.dueDate;
      return (
        <span className={`font-monospace ${row.isOverdue ? "text-danger fw-bold" : "text-muted"}`} style={{ fontSize: 12 }}>
          {formattedDate}
          {row.isOverdue && <span className="ms-1 badge rounded-pill bg-danger-subtle text-danger px-1.5 py-0.5" style={{ fontSize: 9.5, verticalAlign: "middle" }}>Quá hạn</span>}
        </span>
      );
    }
  },
  {
    header: "Tổng phát sinh (đ)",
    width: "150px",
    align: "right",
    render: (row) => row.isGroupHeader ? null : <span className="font-monospace fw-semibold text-dark" style={{ fontSize: 12 }}>{formatVnd(row.amount)}</span>
  },
  {
    header: type === "receivable" ? "Đã thu hồi (đ)" : "Đã thanh toán (đ)",
    width: "150px",
    align: "right",
    render: (row) => row.isGroupHeader ? null : <span className="font-monospace text-muted" style={{ fontSize: 12 }}>{formatVnd(row.paidAmount)}</span>
  },
  {
    header: type === "receivable" ? "Còn phải thu (đ)" : "Còn phải trả (đ)",
    width: "150px",
    align: "right",
    render: (row) => {
      if (row.isGroupHeader) return null;
      const colorClass = type === "receivable" ? "text-success" : "text-danger";
      return <span className={`font-monospace fw-semibold ${colorClass}`} style={{ fontSize: 12 }}>{formatVnd(row.remainingAmount)}</span>;
    }
  },
  {
    header: "Trạng thái",
    width: "130px",
    align: "center",
    render: (row) => {
      if (row.isGroupHeader) return null;
      let badgeClass = "bg-success-subtle text-success";
      let statusText = "Đã thanh toán";
      
      const isPaid = row.remainingAmount === 0 || row.status === "PAID";
      if (!isPaid) {
        if (row.isOverdue) {
          badgeClass = "bg-danger-subtle text-danger";
          statusText = "Quá hạn";
        } else {
          const now = new Date();
          now.setHours(0,0,0,0);
          const due = row.dueDate ? new Date(row.dueDate) : null;
          if (due) {
            due.setHours(0,0,0,0);
            if (due.getTime() === now.getTime()) {
              badgeClass = "bg-warning-subtle text-warning";
              statusText = "Đến hạn";
            } else {
              badgeClass = "bg-primary-subtle text-primary";
              statusText = "Chưa đến hạn";
            }
          } else {
            badgeClass = "bg-primary-subtle text-primary";
            statusText = "Chưa đến hạn";
          }
        }
      }
      return (
        <span className={`badge rounded-pill px-2.5 py-1 ${badgeClass}`} style={{ fontSize: 11 }}>
          {statusText}
        </span>
      );
    }
  }
];
};

interface LoanRow {
  id: string;
  partnerName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  interestRate: number;
  monthlyInterest: number;
  startDate: string;
  dueDate: string;
  termMonths: number;
  status: string;
  description: string;
  referenceId: string;
  isGroupHeader?: boolean;
  groupHeaderLabel?: string;
}

interface LoansSummary {
  totalPrincipal: number;
  remainingBalance: number;
  estimatedMonthlyInterest: number;
  count: number;
}

const LOAN_COLUMNS = (
  collapsedLoans: Record<string, boolean>,
  toggleLoanCollapse: (label: string) => void,
  allLoans: LoanRow[]
): TableColumn<LoanRow>[] => [
  {
    header: "Mã khoản vay / Đối tác",
    align: "left",
    colSpan: (row) => (row.isGroupHeader ? 7 : 1),
    render: (row) => {
      if (row.isGroupHeader) {
        const groupLabel = row.groupHeaderLabel || "";
        const isCollapsed = !!collapsedLoans[groupLabel];
        
        // Calculate dynamic count and total remaining of items in this group
        const groupLoans = allLoans.filter(l => l.partnerName === groupLabel);
        const count = groupLoans.length;
        const remaining = groupLoans.reduce((sum, item) => sum + item.remainingAmount, 0);

        return (
          <div 
            onClick={() => toggleLoanCollapse(groupLabel)}
            className="fw-bold d-flex align-items-center gap-2 py-1" 
            style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.02em", cursor: "pointer", userSelect: "none", color: "#d94600" }}
          >
            <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-down"} text-muted`} style={{ fontSize: 12 }} />
            <i className="bi bi-bank" style={{ fontSize: 14, color: "#d94600" }} />
            {groupLabel}
            <span className="text-muted fw-normal ms-1" style={{ fontSize: 11, textTransform: "none" }}>
              ({count} khoản vay - Dư nợ: <strong className="text-dark font-monospace">{formatVnd(remaining)} đồng</strong>)
            </span>
          </div>
        );
      }
      return (
        <div className="d-flex flex-column gap-1" style={{ paddingLeft: "42px" }}>
          <span className="fw-bold text-dark" style={{ fontSize: 12.5, lineHeight: "1.2" }}>
            {row.referenceId ? `[HĐ: ${row.referenceId}]` : "N/A"}
          </span>
          {row.description && (
            <span className="text-muted d-block text-truncate" style={{ fontSize: 10.5, maxWidth: "320px" }}>
              {row.description.split("\n")[0]}
            </span>
          )}
        </div>
      );
    }
  },
  {
    header: "Ngày giải ngân",
    width: "120px",
    align: "center",
    render: (row) => {
      if (row.isGroupHeader) return null;
      if (!row.startDate) return <span className="text-muted">—</span>;
      const parts = row.startDate.split("-");
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : row.startDate;
      return <span className="font-monospace text-muted" style={{ fontSize: 12 }}>{formattedDate}</span>;
    }
  },
  {
    header: "Lãi suất năm",
    width: "120px",
    align: "center",
    render: (row) => row.isGroupHeader ? null : <span className="font-monospace fw-semibold text-dark" style={{ fontSize: 12 }}>{row.interestRate}%</span>
  },
  {
    header: "Thời hạn",
    width: "120px",
    align: "center",
    render: (row) => row.isGroupHeader ? null : <span className="font-monospace text-dark" style={{ fontSize: 12 }}>{row.termMonths} th</span>
  },
  {
    header: "Gốc khoản vay (đ)",
    width: "150px",
    align: "right",
    render: (row) => row.isGroupHeader ? null : <span className="font-monospace fw-semibold text-dark" style={{ fontSize: 12 }}>{formatVnd(row.amount)}</span>
  },
  {
    header: "Dư nợ còn lại (đ)",
    width: "150px",
    align: "right",
    render: (row) => row.isGroupHeader ? null : <span className="font-monospace fw-semibold text-danger" style={{ fontSize: 12 }}>{formatVnd(row.remainingAmount)}</span>
  },
  {
    header: "Trạng thái",
    width: "130px",
    align: "center",
    render: (row) => {
      if (row.isGroupHeader) return null;
      let badgeClass = "bg-primary-subtle text-primary";
      let statusText = "Đang vay";
      const statusLower = (row.status || "").toLowerCase();
      const isPaid = row.remainingAmount === 0 || statusLower === "paid" || statusLower === "da-tat-toan" || statusLower === "đã tất toán";

      if (isPaid) {
        badgeClass = "bg-success-subtle text-success";
        statusText = "Đã tất toán";
      }
      return (
        <span className={`badge rounded-pill px-2.5 py-1 ${badgeClass}`} style={{ fontSize: 11 }}>
          {statusText}
        </span>
      );
    }
  }
];

interface ExpenseRow {
  id: string;
  tenChiPhi: string;
  loai: string;
  categoryName: string;
  soTien: number;
  ngayChiTra: string;
  nguoiChiTra: string;
  trangThai: string;
  ghiChu: string;
  isGroupHeader?: boolean;
  groupHeaderLabel?: string;
}

interface ExpensesSummary {
  total: number;
  paid: number;
  unpaid: number;
  count: number;
}

const EXPENSE_COLUMNS = (
  collapsedMonths: Record<string, boolean>,
  toggleMonthCollapse: (label: string) => void,
  allExpenses: ExpenseRow[],
  openPaymentModal?: (expense: ExpenseRow) => void
): TableColumn<ExpenseRow>[] => [
  {
    header: "Khoản chi",
    align: "left",
    colSpan: (row) => (row.isGroupHeader ? 5 : 1),
    render: (row) => {
      if (row.isGroupHeader) {
        const groupLabel = row.groupHeaderLabel || "";
        const isCollapsed = !!collapsedMonths[groupLabel];
        
        // Calculate dynamic count and sum of items in this group
        const groupExpenses = allExpenses.filter(e => {
          if (e.isGroupHeader) return false;
          const statusLower = (e.trangThai || "").toLowerCase();
          const isPending = statusLower === "pending" || statusLower === "unpaid" || statusLower === "chưa thanh toán" || statusLower === "chua-thanh-toan";
          
          let eGroup = "Chi phí chờ thanh toán";
          if (!isPending) {
            if (e.ngayChiTra) {
              const parts = e.ngayChiTra.split("-");
              if (parts.length === 3) eGroup = `Tháng ${parts[1]}/${parts[0]}`;
            } else {
              const now = new Date();
              eGroup = `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            }
          } else {
            if (e.ngayChiTra) {
              const parts = e.ngayChiTra.split("-");
              if (parts.length === 3) {
                const now = new Date();
                const eYear = parseInt(parts[0], 10);
                const eMonth = parseInt(parts[1], 10);
                if (eYear > now.getFullYear() || (eYear === now.getFullYear() && eMonth > now.getMonth() + 1)) {
                  eGroup = `Tháng ${parts[1]}/${parts[0]}`;
                }
              }
            }
          }
          return eGroup === groupLabel;
        });
        const count = groupExpenses.length;
        const groupTotal = groupExpenses.reduce((sum, item) => sum + item.soTien, 0);

        return (
          <div 
            onClick={() => toggleMonthCollapse(groupLabel)}
            className="fw-bold d-flex align-items-center gap-2 py-1" 
            style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.02em", cursor: "pointer", userSelect: "none", color: "#d94600" }}
          >
            <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-down"} text-muted`} style={{ fontSize: 12 }} />
            <i className="bi bi-calendar3-event" style={{ fontSize: 14, color: "#d94600" }} />
            {groupLabel}
            <span className="text-muted fw-normal ms-1" style={{ fontSize: 11, textTransform: "none" }}>
              ({count} khoản chi - Tổng chi: <strong className="text-dark font-monospace">{formatVnd(groupTotal)} đồng</strong>)
            </span>
          </div>
        );
      }
      return (
        <div className="d-flex flex-column gap-1" style={{ paddingLeft: "42px" }}>
          <div className="d-flex align-items-center flex-wrap gap-2">
            <span className="fw-bold text-dark" style={{ fontSize: 12.5, lineHeight: "1.2" }}>
              {row.tenChiPhi}
            </span>
            <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: 10, padding: "2px 6px", fontWeight: 500 }}>
              {row.categoryName}
            </span>
          </div>
          {row.ghiChu && (
            <span className="text-muted d-block text-truncate" style={{ fontSize: 10.5, maxWidth: "320px" }}>
              {(() => {
                try {
                  if (row.ghiChu.startsWith("{")) {
                    const parsed = JSON.parse(row.ghiChu);
                    if (typeof parsed.principalPayment === "number" || typeof parsed.interestPayment === "number") {
                      return (
                        <div className="d-flex align-items-center gap-2">
                           {parsed.contractNumber && (
                             <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: 9.5 }}>
                               HĐ: {parsed.contractNumber}
                             </span>
                           )}
                           <span>Tiền gốc: {formatVnd(parsed.principalPayment || 0)}đ - Tiền lãi: {formatVnd(parsed.interestPayment || 0)}đ</span>
                        </div>
                      );
                    }
                  }
                } catch (e) {}
                return row.ghiChu;
              })()}
            </span>
          )}
        </div>
      );
    }
  },
  {
    header: "Ngày chi trả",
    width: "120px",
    align: "center",
    colSpan: (row) => (row.isGroupHeader ? 0 : 1),
    render: (row) => {
      if (!row.ngayChiTra) return <span className="text-muted">—</span>;
      const parts = row.ngayChiTra.split("-");
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : row.ngayChiTra;
      return <span className="font-monospace text-muted" style={{ fontSize: 12 }}>{formattedDate}</span>;
    }
  },
  {
    header: "Người chi trả",
    width: "150px",
    align: "left",
    colSpan: (row) => (row.isGroupHeader ? 0 : 1),
    render: (row) => <span className="text-muted" style={{ fontSize: 12 }}>{row.nguoiChiTra || "—"}</span>
  },
  {
    header: "Số tiền (đ)",
    width: "150px",
    align: "right",
    colSpan: (row) => (row.isGroupHeader ? 0 : 1),
    render: (row) => <span className="font-monospace fw-semibold text-dark" style={{ fontSize: 12 }}>{formatVnd(row.soTien)}</span>
  },
  {
    header: "Trạng thái",
    width: "160px",
    align: "center",
    colSpan: (row) => (row.isGroupHeader ? 0 : 1),
    render: (row) => {
      let badgeClass = "bg-success-subtle text-success";
      let statusText = "Đã thanh toán";
      const statusLower = (row.trangThai || "").toLowerCase();

      if (statusLower === "pending" || statusLower === "unpaid" || statusLower === "chưa thanh toán" || statusLower === "chua-thanh-toan") {
        badgeClass = "bg-warning-subtle text-warning";
        statusText = "Chưa thanh toán";
      }
      return (
        <span className={`badge rounded-pill px-2.5 py-1 ${badgeClass}`} style={{ fontSize: 11 }}>
          {statusText}
        </span>
      );
    }
  }
];

// ── Inventory Data Structures ───────────────────────────────────────────────
interface InventoryCategoryValuation {
  name: string;
  amount: number;
  pct: string;
  color: string;
}

interface InventoryAlertItem {
  name: string;
  code: string;
  current: number;
  safety: number;
  propose: number;
  level: "Critical" | "Warning";
}

const INVENTORY_KPI_CARDS = [
  {
    label: "Tổng giá trị tồn kho",
    value: "3.45 tỷ",
    icon: "bi-currency-exchange",
    accent: "#10b981",
    subtitle: "Tương đương 94% sức chứa tối đa",
  },
  {
    label: "Danh mục sản phẩm",
    value: "12 nhóm hàng",
    icon: "bi-grid-fill",
    accent: "#3b82f6",
    subtitle: "Tổng số 842 SKU đang kinh doanh",
  },
  {
    label: "Cảnh báo dưới mức an toàn",
    value: "14 SKU",
    icon: "bi-exclamation-triangle-fill",
    accent: "#ef4444",
    subtitle: "Cần duyệt kế hoạch mua hàng gấp",
  },
  {
    label: "Vòng quay tồn kho (ITR)",
    value: "4.2 vòng / năm",
    icon: "bi-arrow-repeat",
    accent: "#f59e0b",
    subtitle: "+8.2% so với quý trước",
  },
];

// Dynamic data is now fetched from the API

const INVENTORY_ALERT_COLUMNS: TableColumn<InventoryAlertItem>[] = [
  {
    header: "Sản phẩm",
    align: "left",
    render: (row) => (
      <div className="d-flex flex-column" style={{ gap: "4px" }}>
        <span 
          className="fw-bold text-dark d-block text-truncate" 
          style={{ fontSize: 12.5, lineHeight: "1.2", maxWidth: "250px" }}
          title={row.name}
        >
          {row.name}
        </span>
        <span className="text-muted font-monospace" style={{ fontSize: 10 }}>
          {row.code}
        </span>
      </div>
    )
  },
  {
    header: "Tồn hiện tại",
    width: "120px",
    align: "center",
    render: (row) => <span className="font-monospace fw-semibold text-dark" style={{ fontSize: 12 }}>{row.current}</span>
  },
  {
    header: "Tồn an toàn",
    width: "120px",
    align: "center",
    render: (row) => <span className="font-monospace text-muted" style={{ fontSize: 12 }}>{row.safety}</span>
  },
  {
    header: "Đề xuất nhập",
    width: "120px",
    align: "center",
    render: (row) => <span className="font-monospace text-primary fw-semibold" style={{ fontSize: 12 }}>+{row.propose}</span>
  },
  {
    header: "Mức cảnh báo",
    width: "135px",
    align: "center",
    render: (row) => {
      const isCritical = row.level === "Critical";
      return (
        <span 
          className={`badge rounded-pill ${isCritical ? "bg-danger-subtle text-danger border border-danger-subtle" : "bg-warning-subtle text-warning border border-warning-subtle"}`} 
          style={{ fontSize: 10, padding: "3px 8px", fontWeight: 600 }}
        >
          {isCritical ? "Nguy cấp" : "Cảnh báo"}
        </span>
      );
    }
  }
];

export default function BoardFinanceAccountingPage() {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [newLoanType, setNewLoanType] = useState("vay_von_luu_dong");
  const [newRepaymentMethod, setNewRepaymentMethod] = useState("tra_deu");
  const [newLoanAmount, setNewLoanAmount] = useState("");
  const [newBankName, setNewBankName] = useState("Vietcombank");
  const [newContractNumber, setNewContractNumber] = useState("");
  const [newDisbursementDate, setNewDisbursementDate] = useState("");
  const [newTermMonths, setNewTermMonths] = useState("");
  const [newInterestType, setNewInterestType] = useState("co_dinh");
  const [newInterestRate, setNewInterestRate] = useState("");
  const [newPaymentFrequency, setNewPaymentFrequency] = useState("hang_thang");
  const [newGracePeriod, setNewGracePeriod] = useState("");
  const [newCollateralType, setNewCollateralType] = useState("");
  const [newCollateralValue, setNewCollateralValue] = useState("");
  const [newLtvRatio, setNewLtvRatio] = useState("");
  const [newLoanPurpose, setNewLoanPurpose] = useState("");
  
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);
  const [confirmDeleteLoans, setConfirmDeleteLoans] = useState(false);
  const [isDebtCollectionModalOpen, setIsDebtCollectionModalOpen] = useState(false);
  const [selectedDebtForCollection, setSelectedDebtForCollection] = useState<{id: string, name: string, type: 'receivable' | 'payable' | 'bank', debtAmount: number} | null>(null);
  
  const [paymentExpense, setPaymentExpense] = useState<ExpenseRow | null>(null);

  const toggleLoanSelection = (id: string) => {
    setSelectedLoans(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const toggleGroupLoanSelection = (groupLabel: string, loanIds: string[]) => {
    setSelectedLoans(prev => {
      const allSelected = loanIds.length > 0 && loanIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !loanIds.includes(id));
      } else {
        const newSet = new Set([...prev, ...loanIds]);
        return Array.from(newSet);
      }
    });
  };
  const currentStepId = useMemo(() => STEP_ITEMS.find((s) => s.num === currentStep)?.id || "financial_reports", [currentStep]);

  const [financialSubTab, setFinancialSubTab] = useState<"status" | "reports">("status");
  
  // Real DB Data states
  const [loading, setLoading] = useState(true);
  const [statusRows, setStatusRows] = useState<FinancialStatusRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [indicators, setIndicators] = useState<Indicators>({
    yearlyRevenue: 0,
    monthlyRevenue: 0,
    cashAvailable: 0,
    inventoryValue: 0
  });

  // Report States
  const [reportYear, setReportYear] = useState<number>(2026);
  const [reportMonth, setReportMonth] = useState<number>(0);
  const [reportRows, setReportRows] = useState<FinancialReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState<boolean>(false);

  // Fixed Assets States
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [assetsSummary, setAssetsSummary] = useState<AssetSummary>({
    totalOriginalValue: 0,
    totalAccumulatedDepreciation: 0,
    totalRemainingValue: 0,
    totalCount: 0
  });
  const [assetsLoading, setAssetsLoading] = useState<boolean>(false);
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>("Tất cả");
  const [selectedAssetStatus, setSelectedAssetStatus] = useState<string>("Tất cả");
  const [selectedAssetUnit, setSelectedAssetUnit] = useState<string>("Tất cả");
  const [realSearchQuery, setRealSearchQuery] = useState<string>("");
  const [apiCategories, setApiCategories] = useState<{ id: string; name: string; parentId: string | null }[]>([]);
  const [apiStatuses, setApiStatuses] = useState<string[]>([]);

  // Debts States
  const [debtSubTab, setDebtSubTab] = useState<"receivable" | "payable" | "bank">("receivable");
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [debtsLoading, setDebtsLoading] = useState<boolean>(false);
  const [debtSearchQuery, setDebtSearchQuery] = useState<string>("");
  const [selectedDebtStatus, setSelectedDebtStatus] = useState<string>("Tất cả");
  const [apiDebtStatuses, setApiDebtStatuses] = useState<string[]>([]);
  const [debtsSummary, setDebtsSummary] = useState<DebtSummary>({
    receivable: { total: 0, overdue: 0, recovered: 0 },
    payable: { total: 0, overdue: 0, recovered: 0 },
    bank: { total: 0, overdue: 0, recovered: 0 }
  });

  const [collapsedDebts, setCollapsedDebts] = useState<Record<string, boolean>>({});
  const toggleDebtCollapse = (partnerLabel: string) => {
    setCollapsedDebts(prev => ({
      ...prev,
      [partnerLabel]: !prev[partnerLabel]
    }));
  };

  // Loans States
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loansLoading, setLoansLoading] = useState<boolean>(false);
  const [loanSearchQuery, setLoanSearchQuery] = useState<string>("");
  const [selectedLoanStatus, setSelectedLoanStatus] = useState<string>("Tất cả");
  const [loansSummary, setLoansSummary] = useState<LoansSummary>({
    totalPrincipal: 0,
    remainingBalance: 0,
    estimatedMonthlyInterest: 0,
    count: 0
  });

  const [collapsedLoans, setCollapsedLoans] = useState<Record<string, boolean>>({});
  const toggleLoanCollapse = (bankLabel: string) => {
    setCollapsedLoans(prev => ({
      ...prev,
      [bankLabel]: !prev[bankLabel]
    }));
  };

  // Expenses States
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [expensesLoading, setExpensesLoading] = useState<boolean>(false);
  const [expenseSearchQuery, setExpenseSearchQuery] = useState<string>("");
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>("Tất cả");
  const [selectedExpenseStatus, setSelectedExpenseStatus] = useState<string>("Tất cả");
  const [apiExpenseCategories, setApiExpenseCategories] = useState<{ id: string; code: string; name: string; parentId: string | null }[]>([]);
  const [expensesSummary, setExpensesSummary] = useState<ExpensesSummary>({
    total: 0,
    paid: 0,
    unpaid: 0,
    count: 0
  });

  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    for (let m = 1; m < currentMonth; m++) {
      const monthStr = String(m).padStart(2, '0');
      initial[`Tháng ${monthStr}/${currentYear}`] = true;
    }
    return initial;
  });
  const toggleMonthCollapse = (monthLabel: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthLabel]: !prev[monthLabel]
    }));
  };

  // Inventory States
  const [inventoryAlertFilter, setInventoryAlertFilter] = useState<"All" | "Critical" | "Warning" | string>("All");
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [categoryValuation, setCategoryValuation] = useState<InventoryCategoryValuation[]>([]);
  const [restockAlerts, setRestockAlerts] = useState<InventoryAlertItem[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<any[]>([]);

  // Fetch real data on mount
  useEffect(() => {
    setLoading(true);
    fetch("/api/board/finance-accounting")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatusRows(data.rows);
          setIndicators(data.indicators);
          if (data.inventoryValuations) setCategoryValuation(data.inventoryValuations);
          if (data.topSellingProducts) setTopSellingProducts(data.topSellingProducts);
          if (data.inventoryAlerts) {
            // Map the API alert level back to 'Critical' | 'Warning' if needed by the UI
            const alerts = data.inventoryAlerts.map((a: any) => ({
              ...a,
              level: a.level === "Nguy cấp" ? "Critical" : "Warning",
              current: a.currentStock,
              safety: a.safeStock,
              propose: a.suggestedRestock
            }));
            setRestockAlerts(alerts);
          }
          
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const monthNames = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
          const mmm = monthNames[now.getMonth()];
          const yyyy = now.getFullYear();
          setLastUpdated(`${hh}:${mm} - ${dd}/${mmm}/${yyyy}`);
        }
      })
      .catch((err) => console.error("Error fetching financial stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const loadDebts = () => {
    fetch("/api/board/finance-accounting/debts")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDebts(data.debts);
          setDebtsSummary(data.summary);
          if (data.statuses) setApiDebtStatuses(data.statuses);
        }
      })
      .catch((err) => console.error("Error fetching debts:", err));
  };

  const loadExpenses = () => {
    fetch("/api/board/finance-accounting/expenses")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setExpenses(data.expenses);
          setExpensesSummary(data.summary);
          if (data.categories) setApiExpenseCategories(data.categories);
        }
      })
      .catch((err) => console.error("Error fetching expenses:", err));
  };

  // Fetch Report Data when filters change
  useEffect(() => {
    if (financialSubTab !== "reports") return;
    setReportLoading(true);
    fetch(`/api/board/finance-accounting/report?year=${reportYear}&month=${reportMonth}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReportRows(data.rows);
        }
      })
      .catch((err) => console.error("Error fetching report rows:", err))
      .finally(() => setReportLoading(false));
  }, [financialSubTab, reportYear, reportMonth]);

  // Fetch Fixed Assets Data
  useEffect(() => {
    if (currentStepId !== "fixed_assets") return;
    setAssetsLoading(true);
    fetch("/api/board/finance-accounting/assets")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAssets(data.assets);
          setAssetsSummary(data.summary);
          if (data.categories) setApiCategories(data.categories);
          if (data.statuses) setApiStatuses(data.statuses);
        }
      })
      .catch((err) => console.error("Error fetching fixed assets:", err))
      .finally(() => setAssetsLoading(false));
  }, [currentStepId]);

  // Fetch Debts Data
  useEffect(() => {
    if (currentStepId !== "debts") return;
    setDebtsLoading(true);
    loadDebts();
    setDebtsLoading(false);
  }, [currentStepId]);

  // Fetch Loans Data
  useEffect(() => {
    if (currentStepId !== "loans") return;
    setLoansLoading(true);
    fetch("/api/board/finance-accounting/loans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLoans(data.loans);
          setLoansSummary(data.summary);
        }
      })
      .catch((err) => console.error("Error fetching loans:", err))
      .finally(() => setLoansLoading(false));
  }, [currentStepId]);

  // Fetch Expenses Data
  useEffect(() => {
    if (currentStepId !== "expenses") return;
    setExpensesLoading(true);
    loadExpenses();
    setExpensesLoading(false);
  }, [currentStepId]);

  // Structure categories hierarchically
  const structuredCategories = useMemo(() => {
    const parents = apiCategories.filter(c => !c.parentId);
    const result: { id: string; name: string; isChild: boolean; parentName: string; parentId: string | null }[] = [];
    
    parents.forEach(p => {
      result.push({ id: p.id, name: p.name, isChild: false, parentName: p.name, parentId: null });
      const children = apiCategories.filter(c => c.parentId === p.id);
      children.forEach(c => {
        result.push({ id: c.id, name: c.name, isChild: true, parentName: p.name, parentId: p.id });
      });
    });

    // Add any category that didn't have a parent resolved
    apiCategories.forEach(c => {
      if (c.parentId && !result.some(r => r.id === c.id)) {
        result.push({ id: c.id, name: c.name, isChild: true, parentName: "", parentId: c.parentId });
      }
    });

    return result;
  }, [apiCategories]);

  // Structure expense categories hierarchically
  const structuredExpenseCategories = useMemo(() => {
    const parents = apiExpenseCategories.filter(c => !c.parentId);
    const result: { id: string; code: string; name: string; isChild: boolean; parentName: string; parentId: string | null }[] = [];
    
    parents.forEach(p => {
      result.push({ id: p.id, code: p.code, name: p.name, isChild: false, parentName: p.name, parentId: null });
      const children = apiExpenseCategories.filter(c => c.parentId === p.id);
      children.forEach(c => {
        result.push({ id: c.id, code: c.code, name: c.name, isChild: true, parentName: p.name, parentId: c.parentId });
      });
    });

    // Add any category that didn't have a parent resolved
    apiExpenseCategories.forEach(c => {
      if (c.parentId && !result.some(r => r.id === c.id)) {
        result.push({ id: c.id, code: c.code, name: c.name, isChild: true, parentName: "", parentId: c.parentId });
      }
    });
    
    return result;
  }, [apiExpenseCategories]);

  // Client-side category, status and search filtering
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // Category Match
      let matchCategory = selectedAssetCategory === "Tất cả";
      if (!matchCategory) {
        // Find if the selected value is a parent in our structured categories
        const selectedRecord = structuredCategories.find(c => c.name === selectedAssetCategory);
        const childNames = selectedRecord && !selectedRecord.isChild 
          ? structuredCategories.filter(c => c.parentId === selectedRecord.id || c.parentName === selectedRecord.name).map(c => c.name.toLowerCase())
          : [];

        const aLoaiLower = (a.loai || "").toLowerCase();
        const selLower = selectedAssetCategory.toLowerCase();

        if (aLoaiLower === selLower) {
          matchCategory = true;
        } else if (childNames.includes(aLoaiLower)) {
          matchCategory = true;
        } else {
          if (selLower.includes("nhà cửa") && aLoaiLower.includes("nhà cửa")) {
            matchCategory = true;
          } else if (selLower.includes("máy móc") && aLoaiLower.includes("máy móc")) {
            matchCategory = true;
          } else if (selLower.includes("vận tải") && aLoaiLower.includes("vận tải")) {
            matchCategory = true;
          } else if (selLower.includes("văn phòng") && aLoaiLower.includes("văn phòng")) {
            matchCategory = true;
          } else if (selLower.includes("dụng cụ") && aLoaiLower.includes("dụng cụ")) {
            matchCategory = true;
          } else if (aLoaiLower.includes(selLower) || selLower.includes(aLoaiLower)) {
            matchCategory = true;
          }
        }
      }

      // Status Match
      let matchStatus = selectedAssetStatus === "Tất cả";
      if (!matchStatus) {
        const selLower = selectedAssetStatus.toLowerCase();
        const aStatusLower = (a.trangThai || "").toLowerCase();

        if (aStatusLower === selLower) {
          matchStatus = true;
        } else if (selLower.includes("sử dụng") && aStatusLower === "dang-su-dung") {
          matchStatus = true;
        } else if ((selLower.includes("bảo trì") || selLower.includes("bảo dưỡng") || selLower.includes("sửa chữa")) && aStatusLower === "dang-bao-duong") {
          matchStatus = true;
        } else if (selLower.includes("thanh lý") && aStatusLower === "da-thanh-ly") {
          matchStatus = true;
        } else if (selLower.includes("chưa") && aStatusLower === "chua-su-dung") {
          matchStatus = true;
        } else if (selLower.includes("khấu hao") && aStatusLower === "het-khau-hao") {
          matchStatus = true;
        } else if (aStatusLower.includes(selLower) || selLower.includes(aStatusLower)) {
          matchStatus = true;
        }
      }

      const matchSearch = realSearchQuery === "" || 
        a.tenTaiSan.toLowerCase().includes(realSearchQuery.toLowerCase()) ||
        a.code.toLowerCase().includes(realSearchQuery.toLowerCase()) ||
        (a.viTri || "").toLowerCase().includes(realSearchQuery.toLowerCase());

      let matchUnit = selectedAssetUnit === "Tất cả";
      if (!matchUnit) {
        matchUnit = (a.donVi || "") === selectedAssetUnit;
      }

      return matchCategory && matchStatus && matchSearch && matchUnit;
    });
  }, [assets, selectedAssetCategory, selectedAssetStatus, selectedAssetUnit, realSearchQuery, structuredCategories]);

  // Dynamic summary calculation based on filtered assets list
  const dynamicSummary = useMemo(() => {
    let original = 0;
    let accumulated = 0;
    let remaining = 0;
    filteredAssets.forEach(a => {
      original += a.originalValue;
      accumulated += a.accumulatedDepreciation;
      remaining += a.remainingValue;
    });
    return {
      original,
      accumulated,
      remaining,
      count: filteredAssets.length
    };
  }, [filteredAssets]);

  // Client-side filtering for debts
  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      // 1. Tab Match
      if (d.type !== debtSubTab) return false;

      // 2. Status Match
      let matchStatus = selectedDebtStatus === "Tất cả";
      if (!matchStatus) {
        const isPaid = d.remainingAmount === 0 || d.status === "PAID";
        let actualDueState = "Đã thanh toán";
        if (!isPaid) {
          if (d.isOverdue) {
            actualDueState = "Quá hạn";
          } else {
            const now = new Date();
            now.setHours(0,0,0,0);
            const due = d.dueDate ? new Date(d.dueDate) : null;
            if (due) {
              due.setHours(0,0,0,0);
              if (due.getTime() === now.getTime()) {
                actualDueState = "Đến hạn";
              } else {
                actualDueState = "Chưa đến hạn";
              }
            } else {
              actualDueState = "Chưa đến hạn";
            }
          }
        }

        const selLower = selectedDebtStatus.toLowerCase();
        const stateLower = actualDueState.toLowerCase();

        if (stateLower === selLower) {
          matchStatus = true;
        } else if (selLower.includes("chưa") && stateLower.includes("chưa")) {
          matchStatus = true;
        } else if (selLower.includes("đến") && stateLower.includes("đến")) {
          matchStatus = true;
        } else if (selLower.includes("quá") && stateLower.includes("quá")) {
          matchStatus = true;
        }
      }

      // 3. Search Match
      const matchSearch = debtSearchQuery.trim() === "" || 
        d.partnerName.toLowerCase().includes(debtSearchQuery.toLowerCase()) ||
        (d.description || "").toLowerCase().includes(debtSearchQuery.toLowerCase()) ||
        (d.referenceId || "").toLowerCase().includes(debtSearchQuery.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [debts, debtSubTab, selectedDebtStatus, debtSearchQuery]);

  // Dynamic debts summary based on filtered debts
  const dynamicDebtsSummary = useMemo(() => {
    let total = 0;
    let overdue = 0;
    let recovered = 0;
    filteredDebts.forEach(d => {
      total += d.remainingAmount;
      recovered += d.paidAmount;
      if (d.isOverdue) {
        overdue += d.remainingAmount;
      }
    });
    return { total, overdue, recovered };
  }, [filteredDebts]);

  // Group filtered debts by partner name
  const groupedDebts = useMemo(() => {
    const groups: Record<string, DebtRow[]> = {};
    const groupOrder: string[] = [];

    filteredDebts.forEach(d => {
      const key = d.partnerName || "Đối tác khác";
      if (!groups[key]) {
        groups[key] = [];
        groupOrder.push(key);
      }
      groups[key].push(d);
    });

    // Sort partners alphabetically
    groupOrder.sort((a, b) => a.localeCompare(b));

    // Flatten into array with headers
    const flatRows: DebtRow[] = [];
    groupOrder.forEach(groupName => {
      flatRows.push({
        id: `group-header-${groupName}`,
        type: debtSubTab,
        partnerName: groupName,
        amount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        dueDate: "",
        isOverdue: false,
        status: "",
        description: "",
        referenceId: "",
        isGroupHeader: true,
        groupHeaderLabel: groupName
      });

      const isCollapsed = !!collapsedDebts[groupName];
      if (!isCollapsed) {
        flatRows.push(...groups[groupName]);
      }
    });

    return flatRows;
  }, [filteredDebts, collapsedDebts, debtSubTab]);

  // Client-side filtering for loans
  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      // 1. Status Match
      let matchStatus = selectedLoanStatus === "Tất cả";
      if (!matchStatus) {
        const isPaid = l.remainingAmount === 0 || l.status === "PAID" || l.status === "da-tat-toan" || l.status === "đã tất toán";
        if (selectedLoanStatus === "Đang vay" && !isPaid) {
          matchStatus = true;
        } else if (selectedLoanStatus === "Đã tất toán" && isPaid) {
          matchStatus = true;
        }
      }

      // 2. Search Match
      const matchSearch = loanSearchQuery.trim() === "" || 
        l.partnerName.toLowerCase().includes(loanSearchQuery.toLowerCase()) ||
        (l.description || "").toLowerCase().includes(loanSearchQuery.toLowerCase()) ||
        (l.referenceId || "").toLowerCase().includes(loanSearchQuery.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [loans, selectedLoanStatus, loanSearchQuery]);

  // Dynamic loans summary based on filtered loans
  const dynamicLoansSummary = useMemo(() => {
    let totalPrincipal = 0;
    let remainingBalance = 0;
    let estimatedMonthlyInterest = 0;
    filteredLoans.forEach(l => {
      totalPrincipal += l.amount;
      remainingBalance += l.remainingAmount;
      estimatedMonthlyInterest += l.monthlyInterest;
    });
    return {
      totalPrincipal,
      remainingBalance,
      estimatedMonthlyInterest,
      count: filteredLoans.length
    };
  }, [filteredLoans]);

  // Group filtered loans by bank
  const groupedLoans = useMemo(() => {
    const groups: Record<string, LoanRow[]> = {};
    const groupOrder: string[] = [];

    filteredLoans.forEach(l => {
      const key = l.partnerName || "Ngân hàng khác";
      if (!groups[key]) {
        groups[key] = [];
        groupOrder.push(key);
      }
      groups[key].push(l);
    });

    // Sort banks alphabetically
    groupOrder.sort((a, b) => a.localeCompare(b));

    // Flatten into array with headers
    const flatRows: LoanRow[] = [];
    groupOrder.forEach(groupName => {
      flatRows.push({
        id: `group-header-${groupName}`,
        partnerName: groupName,
        amount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        interestRate: 0,
        monthlyInterest: 0,
        startDate: "",
        dueDate: "",
        termMonths: 0,
        status: "",
        description: "",
        referenceId: "",
        isGroupHeader: true,
        groupHeaderLabel: groupName
      } as any);

      const isCollapsed = !!collapsedLoans[groupName];
      if (!isCollapsed) {
        flatRows.push(...groups[groupName]);
      }
    });

    return flatRows;
  }, [filteredLoans, collapsedLoans]);

  // Client-side filtering for expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // 1. Group Match
      let matchGroup = selectedExpenseCategory === "Tất cả";
      if (!matchGroup) {
        // Find if the selected value is a parent in our structured categories
        const selectedRecord = structuredExpenseCategories.find(c => c.name === selectedExpenseCategory);
        const childNames = selectedRecord && !selectedRecord.isChild 
          ? structuredExpenseCategories.filter(c => c.parentId === selectedRecord.id || c.parentName === selectedRecord.name).map(c => c.name.toLowerCase())
          : [];

        const eCategoryLower = (e.categoryName || "").toLowerCase();
        const selLower = selectedExpenseCategory.toLowerCase();

        if (eCategoryLower === selLower) {
          matchGroup = true;
        } else if (childNames.includes(eCategoryLower)) {
          matchGroup = true;
        } else {
          // Fallback or sub-string matching
          if (eCategoryLower.includes(selLower) || selLower.includes(eCategoryLower)) {
            matchGroup = true;
          }
        }
      }

      // 2. Status Match
      let matchStatus = selectedExpenseStatus === "Tất cả";
      if (!matchStatus) {
        const statusLower = e.trangThai.toLowerCase();
        const isPaid = statusLower === "paid" || statusLower === "approved";
        if (selectedExpenseStatus === "Đã thanh toán" && isPaid) {
          matchStatus = true;
        } else if (selectedExpenseStatus === "Chưa thanh toán" && !isPaid) {
          matchStatus = true;
        }
      }

      // 3. Search Match
      const matchSearch = expenseSearchQuery.trim() === "" || 
        e.tenChiPhi.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
        (e.nguoiChiTra || "").toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
        (e.ghiChu || "").toLowerCase().includes(expenseSearchQuery.toLowerCase());

      return matchGroup && matchStatus && matchSearch;
    });
  }, [expenses, selectedExpenseCategory, selectedExpenseStatus, expenseSearchQuery, structuredExpenseCategories]);

  // Dynamic expenses summary based on filtered expenses
  const dynamicExpensesSummary = useMemo(() => {
    let total = 0;
    let paid = 0;
    let unpaid = 0;
    filteredExpenses.forEach(e => {
      total += e.soTien;
      const statusLower = e.trangThai.toLowerCase();
      if (statusLower === "paid" || statusLower === "approved") {
        paid += e.soTien;
      } else {
        unpaid += e.soTien;
      }
    });
    return { total, paid, unpaid, count: filteredExpenses.length };
  }, [filteredExpenses]);

  // Group filtered expenses by month
  const groupedExpenseRows = useMemo(() => {
    const groups: Record<string, ExpenseRow[]> = {};
    const groupOrder: string[] = ["Chi phí chờ thanh toán"];
    groups["Chi phí chờ thanh toán"] = [];

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Pre-populate all months of the current year from June (current month) down to 1
    for (let m = currentMonth; m >= 1; m--) {
      const monthStr = String(m).padStart(2, '0');
      const key = `Tháng ${monthStr}/${currentYear}`;
      groupOrder.push(key);
      groups[key] = [];
    }

    filteredExpenses.forEach(e => {
      let key = "Chi phí chờ thanh toán";
      const statusLower = (e.trangThai || "").toLowerCase();
      
      if (statusLower === "paid" || statusLower === "approved") {
        if (e.ngayChiTra) {
          const parts = e.ngayChiTra.split("-");
          if (parts.length === 3) {
            key = `Tháng ${parts[1]}/${parts[0]}`;
          }
        } else {
          key = `Tháng ${String(currentMonth).padStart(2, '0')}/${currentYear}`;
        }
      } else {
        // Pending expenses normally go to Chi phí chờ thanh toán, 
        // but if they are due in a future month, group them in that future month.
        if (e.ngayChiTra) {
          const parts = e.ngayChiTra.split("-");
          if (parts.length === 3) {
            const eYear = parseInt(parts[0], 10);
            const eMonth = parseInt(parts[1], 10);
            if (eYear > currentYear || (eYear === currentYear && eMonth > currentMonth)) {
              key = `Tháng ${parts[1]}/${parts[0]}`;
            }
          }
        }
      }
      
      if (!groups[key]) {
        groups[key] = [];
        groupOrder.push(key);
      }
      groups[key].push(e);
    });

    // Flatten into array with headers
    const flatRows: ExpenseRow[] = [];
    groupOrder.forEach(groupName => {
      flatRows.push({
        id: `group-header-${groupName}`,
        tenChiPhi: "",
        loai: "",
        categoryName: "",
        soTien: 0,
        ngayChiTra: "",
        nguoiChiTra: "",
        trangThai: "",
        ghiChu: "",
        isGroupHeader: true,
        groupHeaderLabel: groupName
      } as any);
      
      const isCollapsed = !!collapsedMonths[groupName];
      if (!isCollapsed && groups[groupName]) {
        flatRows.push(...groups[groupName]);
      }
    });

    return flatRows;
  }, [filteredExpenses, collapsedMonths]);

  // Sub-toolbar with tabs and inline indicators for Step 1 and Step 2
    const uniqueAssetUnits = React.useMemo(() => {
    return Array.from(new Set(assets.map(a => a.donVi).filter(Boolean))).sort();
  }, [assets]);

  const renderToolbar = () => {
    if (currentStepId === "financial_reports") {
      return (
        <div className="d-flex flex-wrap align-items-center gap-3 pb-2 border-bottom w-100">
          {/* Tab Buttons */}
          <div className="btn-group border rounded-pill p-0.5 bg-light flex-shrink-0" style={{ width: "fit-content" }}>
            <button
              onClick={() => setFinancialSubTab("status")}
              className={`btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold border-0 d-flex align-items-center transition-all ${financialSubTab === "status" ? "bg-white shadow-sm text-primary" : "text-muted bg-transparent"}`}
              style={{ fontSize: 12.5 }}
            >
              <i className="bi bi-activity me-2" />
              Trạng thái tài chính
            </button>
            <button
              onClick={() => setFinancialSubTab("reports")}
              className={`btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold border-0 d-flex align-items-center transition-all ${financialSubTab === "reports" ? "bg-white shadow-sm text-primary" : "text-muted bg-transparent"}`}
              style={{ fontSize: 12.5 }}
            >
              <i className="bi bi-file-earmark-spreadsheet-fill me-2" />
              Báo cáo hoạt động kinh doanh
            </button>
          </div>

          {/* Right side filters ONLY when financialSubTab === "reports" */}
          {financialSubTab === "reports" && (
            <div className="d-flex align-items-center gap-3 bg-light/50 py-1 px-3 rounded-pill flex-shrink-0 border ms-auto" style={{ width: "fit-content" }}>
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted fw-bold" style={{ fontSize: 12 }}>Năm báo cáo:</span>
                <select
                  className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
                  style={{ fontSize: 12, cursor: "pointer", width: "65px", outline: "none", boxShadow: "none" }}
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
              
              <div style={{ width: 1, height: 16, background: "var(--border)" }} />
              
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted fw-bold" style={{ fontSize: 12 }}>Kỳ báo cáo:</span>
                <select
                  className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
                  style={{ fontSize: 12, cursor: "pointer", width: "95px", outline: "none", boxShadow: "none" }}
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                >
                  <option value={0}>Cả năm</option>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          )}


        </div>
      );
    }

    if (currentStepId === "fixed_assets") {
      return (
        <div className="d-flex flex-wrap align-items-center gap-3 pb-2 border-bottom w-100">
          {/* Left side: Search & Dropdown Filters */}
          <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
            {/* Group Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "125px", outline: "none", boxShadow: "none" }}
              value={selectedAssetCategory}
              onChange={(e) => setSelectedAssetCategory(e.target.value)}
            >
              <option value="Tất cả">Tất cả nhóm</option>
              {structuredCategories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.isChild ? "\u00a0\u00a0\u00a0\u00a0" : ""}
                  {cat.name.replace(", vật kiến trúc", "")
                      .replace(", thiết bị truyền dẫn", "")
                      .replace(", dụng cụ quản lý", "")
                      .replace(" cố định khác", "")}
                </option>
              ))}
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

            {/* Status Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "130px", outline: "none", boxShadow: "none" }}
              value={selectedAssetStatus}
              onChange={(e) => setSelectedAssetStatus(e.target.value)}
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              {apiStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

            {/* Unit Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "130px", outline: "none", boxShadow: "none" }}
              value={selectedAssetUnit}
              onChange={(e) => setSelectedAssetUnit(e.target.value)}
            >
              <option value="Tất cả">Tất cả đơn vị</option>
              {uniqueAssetUnits.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

            {/* Search Box */}
            <div className="position-relative flex-grow-1">
              <i className="bi bi-search position-absolute text-muted" style={{ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11.5 }} />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="form-control form-control-sm border rounded-pill bg-white w-100"
                style={{ fontSize: 12, paddingLeft: "28px", outline: "none", height: "30px" }}
                value={realSearchQuery}
                onChange={(e) => setRealSearchQuery(e.target.value)}
              />
            </div>
          </div>


        </div>
      );
    }

    if (currentStepId === "debts") {
      return (
        <div className="d-flex flex-wrap align-items-center gap-3 pb-2 border-bottom w-100">
          {/* Tab Buttons */}
          <div className="btn-group border rounded-pill p-0.5 bg-light flex-shrink-0" style={{ width: "fit-content" }}>
            <button
              onClick={() => setDebtSubTab("receivable")}
              className={`btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold border-0 d-flex align-items-center transition-all ${debtSubTab === "receivable" ? "bg-white shadow-sm text-primary" : "text-muted bg-transparent"}`}
              style={{ fontSize: 12.5 }}
            >
              <i className="bi bi-arrow-down-left-circle-fill me-2" />
              Công nợ phải thu
            </button>
            <button
              onClick={() => setDebtSubTab("payable")}
              className={`btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold border-0 d-flex align-items-center transition-all ${debtSubTab === "payable" ? "bg-white shadow-sm text-primary" : "text-muted bg-transparent"}`}
              style={{ fontSize: 12.5 }}
            >
              <i className="bi bi-arrow-up-right-circle-fill me-2" />
              Công nợ phải trả
            </button>
            <button
              onClick={() => setDebtSubTab("bank")}
              className={`btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold border-0 d-flex align-items-center transition-all ${debtSubTab === "bank" ? "bg-white shadow-sm text-primary" : "text-muted bg-transparent"}`}
              style={{ fontSize: 12.5 }}
            >
              <i className="bi bi-bank me-2" />
              Nợ ngân hàng
            </button>
          </div>

          {/* Vertical Divider */}
          <div className="d-none d-lg-block" style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />

          {/* Left side: Status Filter & Search Box */}
          <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
            {/* Status Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "135px", outline: "none", boxShadow: "none" }}
              value={selectedDebtStatus}
              onChange={(e) => setSelectedDebtStatus(e.target.value)}
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              {apiDebtStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
              <option value="Đã thanh toán">Đã thanh toán</option>
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

            {/* Search Box */}
            <div className="position-relative flex-grow-1">
              <i className="bi bi-search position-absolute text-muted" style={{ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11.5 }} />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="form-control form-control-sm border rounded-pill bg-white w-100"
                style={{ fontSize: 12, paddingLeft: "28px", outline: "none", height: "30px" }}
                value={debtSearchQuery}
                onChange={(e) => setDebtSearchQuery(e.target.value)}
              />
            </div>
          </div>


        </div>
      );
    }

    if (currentStepId === "loans") {
      return (
        <div className="d-flex flex-wrap align-items-center gap-3 pb-2 border-bottom w-100">
          {/* Left side: Status Filter & Search Box */}
          <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
            {/* Status Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "135px", outline: "none", boxShadow: "none" }}
              value={selectedLoanStatus}
              onChange={(e) => setSelectedLoanStatus(e.target.value)}
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              <option value="Đang vay">Đang vay</option>
              <option value="Đã tất toán">Đã tất toán</option>
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

            {/* Search Box */}
            <div className="position-relative flex-grow-1">
              <i className="bi bi-search position-absolute text-muted" style={{ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11.5 }} />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="form-control form-control-sm border rounded-pill bg-white w-100"
                style={{ fontSize: 12, paddingLeft: "28px", outline: "none", height: "30px" }}
                value={loanSearchQuery}
                onChange={(e) => setLoanSearchQuery(e.target.value)}
              />
            </div>
          </div>


        </div>
      );
    }

    if (currentStepId === "expenses") {
      return (
        <div className="d-flex flex-wrap align-items-center gap-3 pb-2 border-bottom w-100">
          {/* Left side: Group Filter, Status Filter & Search Box */}
          <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
            {/* Group Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "145px", outline: "none", boxShadow: "none" }}
              value={selectedExpenseCategory}
              onChange={(e) => setSelectedExpenseCategory(e.target.value)}
            >
              <option value="Tất cả">Tất cả nhóm</option>
              {structuredExpenseCategories.map(cat => (
                <option key={cat.code} value={cat.name}>
                  {cat.isChild ? "\u00a0\u00a0\u00a0\u00a0" : ""}
                  {cat.name.replace(" cố định", "").replace(" sản xuất trực tiếp", "").replace(" nhân sự", "")}
                </option>
              ))}
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

            {/* Status Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "135px", outline: "none", boxShadow: "none" }}
              value={selectedExpenseStatus}
              onChange={(e) => setSelectedExpenseStatus(e.target.value)}
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              <option value="Đã thanh toán">Đã thanh toán</option>
              <option value="Chưa thanh toán">Chưa thanh toán</option>
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

            {/* Search Box */}
            <div className="position-relative flex-grow-1">
              <i className="bi bi-search position-absolute text-muted" style={{ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11.5 }} />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="form-control form-control-sm border rounded-pill bg-white w-100"
                style={{ fontSize: 12, paddingLeft: "28px", outline: "none", height: "30px" }}
                value={expenseSearchQuery}
                onChange={(e) => setExpenseSearchQuery(e.target.value)}
              />
            </div>
          </div>


        </div>
      );
    }

    if (currentStepId === "inventory") {
      return (
        <div className="d-flex flex-wrap align-items-center gap-3 pb-2 border-bottom w-100">
          {/* Left side: Alert Filter & Search Box */}
          <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
            {/* Alert Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "145px", outline: "none", boxShadow: "none" }}
              value={inventoryAlertFilter}
              onChange={(e) => setInventoryAlertFilter(e.target.value as any)}
            >
              <option value="All">Tất cả mức cảnh báo</option>
              <option value="Critical">Nguy cấp</option>
              <option value="Warning">Cảnh báo</option>
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

            {/* Search Box */}
            <div className="position-relative flex-grow-1">
              <i className="bi bi-search position-absolute text-muted" style={{ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11.5 }} />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="form-control form-control-sm border rounded-pill bg-white w-100"
                style={{ fontSize: 12, paddingLeft: "28px", outline: "none", height: "30px" }}
                value={inventorySearchQuery}
                onChange={(e) => setInventorySearchQuery(e.target.value)}
              />
            </div>
          </div>


        </div>
      );
    }

    return null;
  };

  const renderBottomToolbar = () => {
    let content = null;
    if (currentStepId === "financial_reports") {
      content = (
        <div className="d-flex align-items-center w-100 justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: 12.5, fontWeight: 500 }}>
            {(() => {
              const targetRevenue = indicators.targetRevenue || 0;
              const targetMonthlyRevenue = targetRevenue / 12;
              const now = new Date();
              const startOfYear = new Date(now.getFullYear(), 0, 1);
              const diffYear = now.getTime() - startOfYear.getTime();
              const elapsedDaysYear = Math.max(1, Math.floor(diffYear / (1000 * 60 * 60 * 24)));
              const totalDaysYear = (now.getFullYear() % 4 === 0) ? 366 : 365;
              const yearProportion = elapsedDaysYear / totalDaysYear;
              const elapsedDaysMonth = now.getDate();
              const totalDaysMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const monthProportion = elapsedDaysMonth / totalDaysMonth;
              const expectedYearlyRevenue = targetRevenue * yearProportion;
              const expectedMonthlyRevenue = targetMonthlyRevenue * monthProportion;
              const isYearlyBelow = targetRevenue > 0 && indicators.yearlyRevenue < expectedYearlyRevenue;
              const isMonthlyBelow = targetRevenue > 0 && indicators.monthlyRevenue < expectedMonthlyRevenue;
              return (
                <>
                  <span className="d-flex align-items-center">
                    Doanh thu năm:&nbsp;
                    <strong className="text-dark font-monospace">{formatVnd(indicators.yearlyRevenue)}</strong>
                    {isYearlyBelow && <i className="bi bi-caret-down-fill text-danger ms-1" style={{ fontSize: 11.5 }} />}
                  </span>
                  <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
                  <span className="d-flex align-items-center">
                    Doanh thu tháng:&nbsp;
                    <strong className="text-dark font-monospace">{formatVnd(indicators.monthlyRevenue)}</strong>
                    {isMonthlyBelow && <i className="bi bi-caret-down-fill text-danger ms-1" style={{ fontSize: 11.5 }} />}
                  </span>
                </>
              );
            })()}
            <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
            <span>Tiền mặt: <strong className="text-dark font-monospace">{formatVnd(indicators.cashAvailable)}</strong></span>
            <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
            <span>Tồn kho: <strong className="text-dark font-monospace">{formatVnd(indicators.inventoryValue)}</strong></span>
          </div>
          {lastUpdated && (
            <div className="d-flex align-items-center gap-1.5 text-muted ms-auto" style={{ fontSize: 11, fontWeight: 500 }}>
              <i className="bi bi-broadcast text-danger live-icon" style={{ fontSize: 13, marginRight: 6 }} />
              Cập nhật lúc <strong className="text-dark ms-1">{lastUpdated}</strong>
            </div>
          )}
        </div>
      );
    } else if (currentStepId === "fixed_assets") {
      content = (
        <div className="d-flex align-items-center gap-2 text-muted ms-auto flex-wrap" style={{ fontSize: 12.5, fontWeight: 500 }}>
          <span>Nguyên giá: <strong className="text-dark font-monospace">{formatVnd(dynamicSummary.original)}</strong></span>
          <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
          <span>Khấu hao: <strong className="text-danger font-monospace">{formatVnd(dynamicSummary.accumulated)}</strong></span>
          <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
          <span>Còn lại: <strong className="text-success font-monospace">{formatVnd(dynamicSummary.remaining)}</strong></span>
        </div>
      );
    } else if (currentStepId === "debts") {
      const summaryContent = (
        <div className="d-flex align-items-center gap-2 text-muted ms-auto flex-wrap" style={{ fontSize: 12.5, fontWeight: 500 }}>
          {debtSubTab === "receivable" ? (
            <>
              <span>Tổng phải thu: <strong className="text-dark font-monospace">{formatVnd(dynamicDebtsSummary.total)}</strong></span>
              <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
              <span>Quá hạn: <strong className="text-danger font-monospace">{formatVnd(dynamicDebtsSummary.overdue)}</strong></span>
              <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
              <span>Đã thu hồi: <strong className="text-success font-monospace">{formatVnd(dynamicDebtsSummary.recovered)}</strong></span>
            </>
          ) : (
            <>
              <span>Tổng phải trả: <strong className="text-dark font-monospace">{formatVnd(dynamicDebtsSummary.total)}</strong></span>
              <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
              <span>Quá hạn: <strong className="text-danger font-monospace">{formatVnd(dynamicDebtsSummary.overdue)}</strong></span>
              <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
              <span>Đã thanh toán: <strong className="text-success font-monospace">{formatVnd(dynamicDebtsSummary.recovered)}</strong></span>
            </>
          )}
        </div>
      );

      if (debtSubTab === "bank") {
        content = (
          <div className="d-flex align-items-center w-100">
            <div className="d-flex align-items-center gap-2">
              <button onClick={() => setIsAddLoanOpen(true)} className="btn btn-sm btn-primary d-flex align-items-center gap-1 fw-medium" style={{ fontSize: 12, padding: "4.5px 12px", borderRadius: 6 }}>
                <i className="bi bi-plus-circle" style={{ fontSize: 12.5 }}></i> Thêm mới
              </button>
              <button onClick={() => setIsRepaymentModalOpen(true)} className="btn btn-sm border d-flex align-items-center gap-1 fw-medium bg-white text-dark shadow-sm" style={{ fontSize: 12, padding: "4.5px 12px", borderRadius: 6 }}>
                <i className="bi bi-calendar2-date text-primary" style={{ fontSize: 12.5 }}></i> Lịch trả nợ
              </button>
              {selectedLoans.length > 0 && (
                <button 
                  className="btn btn-sm btn-danger d-flex align-items-center gap-1 fw-medium shadow-sm" 
                  style={{ fontSize: 12, padding: "4.5px 12px", borderRadius: 6 }}
                  onClick={() => setConfirmDeleteLoans(true)}
                >
                  <i className="bi bi-trash3" style={{ fontSize: 12.5 }}></i> Xóa 
                  <span className="badge rounded-circle bg-white text-danger ms-1 d-flex justify-content-center align-items-center" style={{ width: 18, height: 18, padding: 0, fontSize: 11 }}>
                    {selectedLoans.length}
                  </span>
                </button>
              )}
            </div>
            {summaryContent}
            
            <ConfirmDialog 
              open={confirmDeleteLoans} 
              variant="danger" 
              title="Xóa khoản vay" 
              message={`Bạn có chắc muốn xóa ${selectedLoans.length} khoản vay đã chọn?`} 
              confirmLabel="Xóa" 
              onConfirm={() => {
                setSelectedLoans([]);
                setConfirmDeleteLoans(false);
              }} 
              onCancel={() => setConfirmDeleteLoans(false)} 
            />
          </div>
        );
      } else {
        content = summaryContent;
      }
    } else if (currentStepId === "loans") {
      content = (
        <div className="d-flex align-items-center gap-2 text-muted ms-auto flex-wrap" style={{ fontSize: 12.5, fontWeight: 500 }}>
          <span>Tổng nợ vay: <strong className="text-dark font-monospace">{formatVnd(dynamicLoansSummary.totalPrincipal)}</strong></span>
          <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
          <span>Dư nợ còn lại: <strong className="text-danger font-monospace">{formatVnd(dynamicLoansSummary.remainingBalance)}</strong></span>
          <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
          <span>Ước tính lãi tháng này: <strong className="text-success font-monospace">{formatVnd(dynamicLoansSummary.estimatedMonthlyInterest)}</strong></span>
        </div>
      );
    } else if (currentStepId === "expenses") {
      content = (
        <div className="d-flex align-items-center gap-2 text-muted ms-auto flex-wrap" style={{ fontSize: 12.5, fontWeight: 500 }}>
          <span>Tổng chi phí: <strong className="text-dark font-monospace">{formatVnd(dynamicExpensesSummary.total)}</strong></span>
          <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
          <span>Đã thanh toán: <strong className="text-success font-monospace">{formatVnd(dynamicExpensesSummary.paid)}</strong></span>
          <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
          <span>Chưa thanh toán: <strong className="text-danger font-monospace">{formatVnd(dynamicExpensesSummary.unpaid)}</strong></span>
        </div>
      );
    } else if (currentStepId === "inventory") {
      content = (
        <div className="d-flex align-items-center gap-2 text-muted ms-auto flex-wrap" style={{ fontSize: 12.5, fontWeight: 500 }}>
          <span>Tổng giá trị kho: <strong className="text-dark font-monospace">{(indicators.inventoryValue / 1e9).toFixed(2)} tỷ</strong></span>
          <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
          <span>Danh mục: <strong className="text-dark font-monospace">{categoryValuation.length > 0 ? categoryValuation.length : 3} nhóm</strong></span>
          <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
          <span>Cảnh báo: <strong className="text-danger font-monospace">{restockAlerts.length} SKU</strong></span>
          <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
          <span>Vòng quay (ITR): <strong className="text-success font-monospace">4.2 vòng/năm</strong></span>
        </div>
      );
    }

    if (!content) return null;
    return (
      <div className="d-flex align-items-center w-100 py-1">
        {content}
      </div>
    );
  };

  const renderActiveStepContent = () => {
    if (currentStepId === "financial_reports") {
      return (
        <div className="d-flex flex-column gap-2 h-100 pt-0 mt-n2">
          {/* Sub-tab content display */}
          <div className="flex-grow-1">
            {financialSubTab === "status" ? (
              <Table<FinancialStatusRow>
                rows={statusRows}
                columns={STATUS_COLUMNS}
                compact
                loading={loading}
                fixedLayout={true}
                wrapperClassName="mkt-plan-table-no-min"
                wrapperStyle={{ overflowY: "auto", maxHeight: "calc(100vh - 340px)" }}
              />
            ) : (
              <div className="d-flex flex-column gap-2 h-100 pt-0">


                {/* Report Table */}
                <div className="flex-grow-1">
                  <Table<FinancialReportRow>
                    rows={reportRows}
                    columns={REPORT_COLUMNS}
                    compact
                    loading={reportLoading}
                    fixedLayout={true}
                    wrapperClassName="mkt-plan-table-no-min"
                    wrapperStyle={{ overflowY: "auto", maxHeight: "calc(100vh - 400px)" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentStepId === "fixed_assets") {
      return (
        <div className="d-flex flex-column gap-2 h-100 pt-0 mt-n2">
          {/* Asset List Table */}
          <div className="flex-grow-1">
            <Table<FixedAsset>
              rows={filteredAssets}
              columns={ASSET_COLUMNS}
              compact
              loading={assetsLoading}
              fixedLayout={false}
              wrapperClassName="mkt-plan-table-no-min"
              wrapperStyle={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 300px)" }}
            />
          </div>
        </div>
      );
    }

    if (currentStepId === "debts") {
      return (
        <div className="d-flex flex-column gap-2 h-100 pt-0 mt-n2">
          {/* Debt List Table */}
          <div className="flex-grow-1">
            <Table<DebtRow>
              rows={groupedDebts}
              columns={DEBT_COLUMNS(debtSubTab, collapsedDebts, toggleDebtCollapse, debts, selectedLoans, toggleLoanSelection, toggleGroupLoanSelection)}
              compact
              loading={debtsLoading}
              fixedLayout={false}
              wrapperClassName="mkt-plan-table-no-min"
              wrapperStyle={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 300px)" }}
              rowStyle={(row) => (row.isGroupHeader ? { background: "var(--light, #f8f9fa)" } : undefined)}
            />
          </div>
        </div>
      );
    }

    if (currentStepId === "loans") {
      return (
        <div className="d-flex flex-column gap-2 h-100 pt-0 mt-n2">
          {/* Loans Table */}
          <div className="flex-grow-1">
            <Table<LoanRow>
              rows={groupedLoans}
              columns={LOAN_COLUMNS(collapsedLoans, toggleLoanCollapse, loans)}
              compact
              loading={loansLoading}
              fixedLayout={false}
              wrapperClassName="mkt-plan-table-no-min"
              wrapperStyle={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 300px)" }}
              rowStyle={(row) => (row.isGroupHeader ? { background: "var(--light, #f8f9fa)" } : undefined)}
            />
          </div>
        </div>
      );
    }

    if (currentStepId === "expenses") {
      return (
        <div className="d-flex flex-column gap-2 h-100 pt-0 mt-n2">
          {/* Expenses Table */}
          <div className="flex-grow-1">
            <Table<ExpenseRow>
              rows={groupedExpenseRows}
              columns={EXPENSE_COLUMNS(collapsedMonths, toggleMonthCollapse, expenses)}
              compact
              loading={expensesLoading}
              fixedLayout={false}
              wrapperClassName="mkt-plan-table-no-min"
              wrapperStyle={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 300px)" }}
              rowStyle={(row) => (row.isGroupHeader ? { background: "var(--light, #f8f9fa)" } : undefined)}
            />
          </div>
        </div>
      );
    }

    if (currentStepId === "inventory") {
      const formatBillion = (val: number) => {
        return (val / 1e9).toFixed(2) + " tỷ VNĐ";
      };

      // Filter warnings
      const filteredAlerts = restockAlerts.filter(alert => {
        const matchLevel = inventoryAlertFilter === "All" || alert.level === inventoryAlertFilter;
        const matchSearch = inventorySearchQuery.trim() === "" || 
          alert.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()) ||
          alert.code.toLowerCase().includes(inventorySearchQuery.toLowerCase());
        return matchLevel && matchSearch;
      });

      return (
        <div className="row g-4 m-0 w-100 h-100 pt-0 mt-n2 overflow-hidden">
          {/* Left Column: Category Valuation Breakdown and Top Products */}
          <div className="col-12 col-lg-4 d-flex flex-column gap-4" style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
            
            {/* 1. Category Valuation */}
            <div>
              <span className="fw-bold text-dark d-block mb-3" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Cơ cấu giá trị kho theo nhóm hàng
              </span>
              <div className="d-flex flex-column gap-3">
                {categoryValuation.map((item, idx) => (
                  <div key={idx}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>{item.name}</span>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>
                          {(item.amount / 1e9).toFixed(2)} tỷ VNĐ
                        </span>
                        <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 99, background: `${item.color}15`, color: item.color, fontWeight: 700 }}>
                          {item.pct}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: item.pct,
                        background: item.color,
                        borderRadius: 99
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Top Selling Products */}
            <div className="mt-2">
              <span className="fw-bold text-dark d-block mb-3" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Sản phẩm bán chạy nhất
              </span>
              <div className="d-flex flex-column gap-3">
                {topSellingProducts.map((p, idx) => (
                  <div key={idx} className="d-flex justify-content-between align-items-center">
                    <div className="d-flex flex-column overflow-hidden pe-2" style={{ maxWidth: "calc(100% - 60px)" }}>
                      <span className="text-dark text-truncate" style={{ fontSize: 12.5, fontWeight: 500 }} title={p.name}>{p.name}</span>
                      <span className="text-muted font-monospace" style={{ fontSize: 10 }}>{p.code}</span>
                    </div>
                    <div className="text-end text-nowrap">
                      <span className="fw-bold" style={{ fontSize: 13, color: "#10b981" }}>{p.quantity.toLocaleString("vi-VN")}</span>
                      <span className="text-muted ms-1" style={{ fontSize: 10 }}>SP</span>
                    </div>
                  </div>
                ))}
                {topSellingProducts.length === 0 && (
                  <span className="text-muted" style={{ fontSize: 12 }}>Chưa có dữ liệu bán hàng</span>
                )}
              </div>
            </div>

          </div>


          {/* Right Column: Warning Items Table */}
          <div className="col-12 col-lg-8 d-flex flex-column" style={{ maxHeight: "calc(100vh - 300px)" }}>
            <div className="h-100 d-flex flex-column">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="fw-bold text-dark d-block" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Danh sách sản phẩm chạm mức cảnh báo
                </span>
                <span className="badge bg-danger rounded-pill" style={{ fontSize: 11, padding: "4px 8px" }}>
                  {filteredAlerts.length}
                </span>
              </div>
              <div className="flex-grow-1 overflow-hidden">
                <Table<InventoryAlertItem>
                  rows={filteredAlerts}
                  columns={INVENTORY_ALERT_COLUMNS}
                  compact
                  fixedLayout={false}
                  wrapperClassName="mkt-plan-table-no-min"
                  wrapperStyle={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 360px)" }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    const stepTitle = STEP_ITEMS.find((s) => s.id === currentStepId)?.title;
    return (
      <div 
        className="d-flex align-items-center justify-content-center border rounded-4 bg-white" 
        style={{ minHeight: 380, borderStyle: "dashed" }}
      >
        <div className="text-center text-muted p-5">
          <i className="bi bi-layout-text-window-reverse mb-3 d-block" style={{ fontSize: 32, color: "var(--muted-foreground)" }} />
          <h5 className="fw-bold mb-1" style={{ color: "var(--foreground)" }}>{stepTitle}</h5>
          <p className="mb-0" style={{ fontSize: 13 }}>Nội dung chi tiết đang được thiết kế...</p>
        </div>
      </div>
    );
  };

  return (
    <StandardPage
      title="Tài chính kế toán"
      description="Ban Giám đốc · Giám sát cơ cấu chi phí doanh nghiệp, doanh thu, quỹ tiền mặt và quản trị công nợ tồn đọng"
      icon="bi-cash-stack"
      color="rose"
      useCard={false}
      paddingClassName="px-4 pb-4 pt-1"
    >
      <div className="d-flex flex-column h-100 flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
        <WorkflowCard
          contentPadding="px-4 pb-4 pt-1"
          toolbar={renderToolbar()}
          bottomToolbar={renderBottomToolbar()}
          stepper={
            <ModernStepper
              steps={STEP_ITEMS}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingX={0}
              paddingY={8}
            />
          }
        >
          {renderActiveStepContent()}
        </WorkflowCard>
      </div>

      {/* Add Loan Offcanvas */}
      <div 
        className={`offcanvas offcanvas-end ${isAddLoanOpen ? 'show' : ''}`} 
        tabIndex={-1} 
        style={{ visibility: isAddLoanOpen ? 'visible' : 'hidden', width: 400, borderLeft: "1px solid var(--border)", zIndex: 1050 }}
      >
        <div className="offcanvas-header border-bottom py-3">
          <h5 className="offcanvas-title fw-bold" style={{ fontSize: 16 }}>Thêm khoản vay ngân hàng mới</h5>
          <button type="button" className="btn-close" onClick={() => setIsAddLoanOpen(false)}></button>
        </div>
        <div className="offcanvas-body flex-grow-1 custom-scrollbar">
          <div className="row mb-3">
            <div className="col-6">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>Hình thức vay</label>
              <select 
                className="form-select form-select-sm" 
                style={{ fontSize: 13 }}
                value={newLoanType}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewLoanType(val);
                  if (val === "vay_thau_chi") setNewRepaymentMethod("tra_theo_du_no_thuc_te");
                }}
              >
                <option value="">-- Chọn hình thức --</option>
                <option value="vay_tin_chap">Vay tín chấp</option>
                <option value="vay_the_chap">Vay thế chấp tài sản</option>
                <option value="vay_thau_chi">Vay thấu chi</option>
                <option value="vay_tra_gop">Vay trả góp</option>
                <option value="vay_von_luu_dong">Vay vốn lưu động</option>
                <option value="thue_mua_tai_chinh">Thuê mua tài chính</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>Hình thức trả nợ</label>
              <select 
                className="form-select form-select-sm" 
                style={{ fontSize: 13 }}
                value={newRepaymentMethod}
                onChange={(e) => setNewRepaymentMethod(e.target.value)}
                disabled={newLoanType === "vay_thau_chi"}
              >
                <option value="">-- Chọn cách trả --</option>
                <option value="goc_deu_lai_giam">Gốc đều, Lãi giảm dần</option>
                <option value="tra_gop_deu">Trả đều (Gốc + Lãi)</option>
                <option value="lai_hang_thang_goc_cuoi_ky">Lãi hàng tháng, Gốc cuối kỳ</option>
                <option value="goc_lai_cuoi_ky">Gốc & Lãi cuối kỳ</option>
                <option value="tra_theo_du_no_thuc_te">Theo dư nợ (Thấu chi)</option>
              </select>
            </div>
          </div>
          
          <div className="mb-3">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>Tên ngân hàng</label>
            <select className="form-select form-select-sm" style={{ fontSize: 13 }} value={newBankName} onChange={(e) => setNewBankName(e.target.value)}>
              <option value="">-- Chọn ngân hàng --</option>
              <option value="Vietcombank">Vietcombank (Ngân hàng Ngoại thương VN)</option>
              <option value="VietinBank">VietinBank (Ngân hàng Công Thương VN)</option>
              <option value="BIDV">BIDV (Ngân hàng Đầu tư và Phát triển VN)</option>
              <option value="Agribank">Agribank (Ngân hàng Nông nghiệp và PTNT VN)</option>
              <option value="Techcombank">Techcombank (Ngân hàng Kỹ Thương VN)</option>
              <option value="MB">MB (Ngân hàng Quân Đội)</option>
              <option value="VPBank">VPBank (Ngân hàng VN Thịnh Vượng)</option>
              <option value="ACB">ACB (Ngân hàng Á Châu)</option>
              <option value="Sacombank">Sacombank (Ngân hàng Sài Gòn Thương Tín)</option>
              <option value="HDBank">HDBank (Ngân hàng Phát triển TP.HCM)</option>
              <option value="VIB">VIB (Ngân hàng Quốc Tế)</option>
              <option value="TPBank">TPBank (Ngân hàng Tiên Phong)</option>
              <option value="SHB">SHB (Ngân hàng Sài Gòn - Hà Nội)</option>
              <option value="SeABank">SeABank (Ngân hàng Đông Nam Á)</option>
              <option value="OCB">OCB (Ngân hàng Phương Đông)</option>
              <option value="MSB">MSB (Ngân hàng Hàng Hải VN)</option>
              <option value="LPBank">LPBank (Ngân hàng Lộc Phát VN)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>Số hợp đồng</label>
            <input type="text" className="form-control form-control-sm" placeholder="Ví dụ: HĐTD-2026/001" style={{ fontSize: 13 }} value={newContractNumber} onChange={(e) => setNewContractNumber(e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>
              {newLoanType === "vay_thau_chi" ? "Hạn mức thấu chi (VNĐ)" : "Số tiền vay (VNĐ)"}
            </label>
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="Nhập số tiền..." 
              style={{ fontSize: 13 }} 
              value={newLoanAmount ? formatVnd(Number(newLoanAmount)) : ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setNewLoanAmount(val);
              }}
            />
          </div>

          {newLoanType === "vay_the_chap" && (
            <div className="mb-3 p-3 bg-light rounded border border-light-subtle">
              <h6 className="fw-bold mb-3" style={{ fontSize: 13, color: "var(--primary)" }}>Thông tin Tài sản đảm bảo</h6>
              <div className="mb-2">
                <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 12 }}>Loại tài sản</label>
                <select className="form-select form-select-sm" style={{ fontSize: 12 }} value={newCollateralType} onChange={(e) => setNewCollateralType(e.target.value)}>
                  <option value="">-- Chọn loại tài sản --</option>
                  <option value="bat_dong_san">Bất động sản</option>
                  <option value="may_moc">Máy móc thiết bị</option>
                  <option value="xe_co">Phương tiện vận tải</option>
                  <option value="hang_hoa">Hàng hóa luân chuyển</option>
                  <option value="so_tiet_kiem">Sổ tiết kiệm / Tiền gửi</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 12 }}>Giá trị định giá (VNĐ)</label>
                <input type="text" className="form-control form-control-sm" placeholder="Nhập giá trị định giá..." style={{ fontSize: 12 }} value={newCollateralValue ? formatVnd(Number(newCollateralValue)) : ""} onChange={(e) => setNewCollateralValue(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 12 }}>Tỷ lệ cho vay / Định giá (LTV %)</label>
                <input type="number" className="form-control form-control-sm" placeholder="Ví dụ: 70" style={{ fontSize: 12 }} value={newLtvRatio} onChange={(e) => setNewLtvRatio(e.target.value)} />
              </div>
            </div>
          )}

          {newLoanType === "vay_tin_chap" && (
            <div className="mb-3">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>Mục đích vay vốn</label>
              <input type="text" className="form-control form-control-sm" placeholder="Ví dụ: Bổ sung vốn lưu động" style={{ fontSize: 13 }} value={newLoanPurpose} onChange={(e) => setNewLoanPurpose(e.target.value)} />
            </div>
          )}

          <div className="row mb-3">
            <div className="col-6">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>Ngày giải ngân</label>
              <input type="date" className="form-control form-control-sm" style={{ fontSize: 13 }} value={newDisbursementDate} onChange={(e) => setNewDisbursementDate(e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>
                {newLoanType === "vay_thau_chi" ? "Ngày hết hạn hạn mức" : "Kỳ hạn (Tháng)"}
              </label>
              {newLoanType === "vay_thau_chi" ? (
                <input type="date" className="form-control form-control-sm" style={{ fontSize: 13 }} value={newTermMonths} onChange={(e) => setNewTermMonths(e.target.value)} />
              ) : (
                <input type="number" className="form-control form-control-sm" placeholder="Ví dụ: 36" style={{ fontSize: 13 }} value={newTermMonths} onChange={(e) => setNewTermMonths(e.target.value)} />
              )}
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-6">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>Loại lãi suất</label>
              <select className="form-select form-select-sm" style={{ fontSize: 13 }} value={newInterestType} onChange={(e) => setNewInterestType(e.target.value)}>
                <option value="co_dinh">Cố định</option>
                <option value="tha_noi">Thả nổi</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>Lãi suất (%/năm)</label>
              <input type="number" className="form-control form-control-sm" placeholder="Ví dụ: 8.5" style={{ fontSize: 13 }} value={newInterestRate} onChange={(e) => setNewInterestRate(e.target.value)} />
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-6">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13 }}>Kỳ thanh toán</label>
              <select 
                className="form-select form-select-sm" 
                style={{ fontSize: 13 }}
                disabled={newRepaymentMethod === "goc_lai_cuoi_ky"}
                value={newRepaymentMethod === "goc_lai_cuoi_ky" ? "cuoi_ky" : newPaymentFrequency}
                onChange={(e) => setNewPaymentFrequency(e.target.value)}
              >
                <option value="hang_thang">Hàng tháng</option>
                <option value="hang_quy">Hàng quý</option>
                <option value="6_thang">6 tháng / lần</option>
                <option value="cuoi_ky">Cuối kỳ</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label fw-medium text-dark mb-1" style={{ fontSize: 13, whiteSpace: "nowrap" }}>Ân hạn gốc (Tháng)</label>
              <input 
                type="number" 
                className="form-control form-control-sm" 
                placeholder="Ví dụ: 0" 
                style={{ fontSize: 13 }} 
                disabled={newRepaymentMethod === "goc_lai_cuoi_ky" || newLoanType === "vay_thau_chi"}
                value={newGracePeriod} onChange={(e) => setNewGracePeriod(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="offcanvas-footer border-top p-3 bg-white mt-auto">
          <button 
            className="btn btn-primary w-100 fw-medium" 
            style={{ fontSize: 13, padding: "8px 0" }}
            onClick={async () => {
              if (!newLoanAmount) {
                toast.error("Lỗi", "Vui lòng nhập số tiền hợp lệ!");
                return;
              }
              if (!newBankName) {
                toast.error("Lỗi", "Vui lòng chọn ngân hàng!");
                return;
              }
              
              const payload = {
                contractNumber: newContractNumber,
                bankName: newBankName,
                loanType: newLoanType || "vay_von_luu_dong",
                repaymentMethod: newRepaymentMethod || "tra_deu",
                loanAmount: Number(newLoanAmount),
                disbursementDate: newDisbursementDate,
                termMonths: newTermMonths ? Number(newTermMonths) : null,
                interestType: newInterestType,
                interestRate: newInterestRate ? Number(newInterestRate) : null,
                paymentFrequency: newPaymentFrequency,
                gracePeriodMonths: newGracePeriod ? Number(newGracePeriod) : null,
                collateralType: newCollateralType,
                collateralValue: newCollateralValue ? Number(newCollateralValue) : null,
                ltvRatio: newLtvRatio ? Number(newLtvRatio) : null,
                loanPurpose: newLoanPurpose
              };

              try {
                const res = await fetch("/api/board/finance-accounting/bank-loans", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if (data.success && data.debt) {
                  // Re-map the returned debt to DebtRow format
                  const newDebt: DebtRow = {
                    id: data.debt.id,
                    type: "bank",
                    partnerName: data.debt.partnerName,
                    amount: data.debt.amount,
                    paidAmount: data.debt.paidAmount,
                    remainingAmount: data.debt.amount - data.debt.paidAmount,
                    dueDate: data.debt.dueDate ? data.debt.dueDate.split("T")[0] : "",
                    isOverdue: false,
                    status: data.debt.status,
                    description: data.debt.description,
                    referenceId: data.debt.referenceId
                  };
                  
                  setDebts(prev => [newDebt, ...prev]);
                  toast.success("Thành công", "Đã lưu khoản vay thành công vào cơ sở dữ liệu!");
                  setIsAddLoanOpen(false);
                  
                  // Reset form fields
                  setNewLoanAmount("");
                  setNewContractNumber("");
                  setNewDisbursementDate("");
                  setNewTermMonths("");
                  setNewInterestRate("");
                  setNewGracePeriod("");
                  setNewCollateralValue("");
                  setNewLtvRatio("");
                  setNewLoanPurpose("");
                } else {
                  toast.error("Lỗi", data.error || "Có lỗi xảy ra khi lưu khoản vay");
                }
              } catch (e: any) {
                toast.error("Lỗi", "Không thể kết nối đến máy chủ");
              }
            }}
          >
            <i className="bi bi-floppy me-2"></i>Lưu khoản vay
          </button>
        </div>
      </div>
      {isAddLoanOpen && (
        <div 
          className="offcanvas-backdrop fade show" 
          onClick={() => setIsAddLoanOpen(false)}
          style={{ zIndex: 1040 }}
        ></div>
      )}

      <LoanRepaymentScheduleModal isOpen={isRepaymentModalOpen} onClose={() => setIsRepaymentModalOpen(false)} />

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;600;700&display=swap');

        /* Force Roboto Condensed on all monospace number containers */
        .font-monospace {
          font-family: 'Roboto Condensed', sans-serif !important;
          letter-spacing: -0.01em !important;
        }

        /* Responsive padding overrides for iPad */
        @media (max-width: 1024px) {
          .app-card {
            padding: 16px !important;
          }
        }

        /* Reduce table row heights slightly */
        .app-responsive-table-wrapper th,
        .app-responsive-table-wrapper td {
          padding-top: 4.5px !important;
          padding-bottom: 4.5px !important;
        }

        /* Make Table headers sticky, compact, aligned and style them cleanly */
        .app-responsive-table-wrapper th {
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
          background-color: #ffffff !important; /* Fix: use solid white background to cover scrolled rows */
          border-bottom: 2px solid var(--border) !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.05em !important;
        }

        /* Pulsing green live dot replaced by red broadcast icon pulsing animation */
        .live-icon {
          display: inline-block;
          animation: pulse-broadcast 1.4s infinite alternate;
        }

        @keyframes pulse-broadcast {
          0% {
            transform: scale(0.9);
            opacity: 0.55;
          }
          100% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
      `}} />
    </StandardPage>
  );
}
