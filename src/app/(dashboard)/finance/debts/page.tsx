"use client";
// Finance Dashboard - Debt and Expense Management

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ExpenseFormOffcanvas } from "./ExpenseFormOffcanvas";
import { ReceivableOpeningBalanceOffcanvas } from "./ReceivableOpeningBalanceOffcanvas";
import { PayableOpeningBalanceOffcanvas } from "./PayableOpeningBalanceOffcanvas";
import { LoanFormOffcanvas } from "./LoanFormOffcanvas";
import { DisbursementFormOffcanvas } from "./DisbursementFormOffcanvas";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { DebtPaymentOffcanvas, parseDebtDescription } from "./DebtPaymentOffcanvas";
import { DebtReconciliationModal } from "./DebtReconciliationModal";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { FinanceOrderDetailsOffcanvas } from "./FinanceOrderDetailsOffcanvas";


const formatCurrency = (val: number) => (Math.round(val / 1000) * 1000).toLocaleString("vi-VN");

// Types
interface DebtData {
  id: string;
  type: string;
  partnerName: string;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  interestRate: number | null;
  status: string;
  description: string | null;
  referenceId: string | null;
}

const DEBT_STEPS: ModernStepItem[] = [
  { num: 1, id: "RECEIVABLE", title: "Công nợ phải thu", desc: "Khách hàng nợ", icon: "bi-arrow-down-left-circle" },
  { num: 2, id: "PAYABLE", title: "Công nợ phải trả", desc: "Nợ nhà cung cấp", icon: "bi-arrow-up-right-circle" },
  { num: 3, id: "LOAN", title: "Nợ vay", desc: "Nợ ngân hàng", icon: "bi-bank" },
  { num: 4, id: "EXPENSE", title: "Quản lý chi phí", desc: "Chi phí vận hành", icon: "bi-cash-stack" },
];

const STATUS_OPTIONS = [
  { label: "Chưa thanh toán", value: "UNPAID" },
  { label: "Thanh toán một phần", value: "PARTIAL" },
  { label: "Đã tất toán", value: "PAID" },
  { label: "Đến hạn", value: "DUE" },
  { label: "Quá hạn", value: "OVERDUE" },
];

// Expense categories will be loaded from DB

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "Chưa thanh toán", color: "danger" },
  PARTIAL: { label: "Trả một phần", color: "warning" },
  PAID: { label: "Đã tất toán", color: "success" },
  DUE: { label: "Đến hạn", color: "warning" },
  OVERDUE: { label: "Quá hạn", color: "danger" },
  pending: { label: "Chờ duyệt", color: "warning" },
  approved: { label: "Đã duyệt", color: "info" },
  paid: { label: "Đã thanh toán", color: "success" },
  rejected: { label: "Từ chối", color: "danger" },
};

export default function DebtsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("");
  const [daysFilter, setDaysFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<any>({
    totalAmount: 0,
    totalPaid: 0,
    recoveryRate: 0,
    upcomingCount: 0,
    avgDays: 0,
    overdueCount: 0,
    countByFilter: { ALL: 0, OVERDUE: 0, DAYS_30: 0, DAYS_30_60: 0, OVER_60: 0 }
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [expenseStatuses, setExpenseStatuses] = useState<any[]>([]);
  const [selectedExpenseStatus, setSelectedExpenseStatus] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<string[]>([
    `THÁNG ${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`
  ]);
  
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showDisbursementForm, setShowDisbursementForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showPaymentOffcanvas, setShowPaymentOffcanvas] = useState(false);
  const [selectedPaymentDebt, setSelectedPaymentDebt] = useState<any>(null);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [selectedReconciliationDebt, setSelectedReconciliationDebt] = useState<any>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(null);

  const { success, error } = useToast();
  const currentStepId = DEBT_STEPS.find(s => s.num === currentStep)?.id || "RECEIVABLE";

  const fetchDebts = async (refresh = false) => {
    setLoading(true);
    try {
      if (currentStepId === "EXPENSE") {
        // Fetch expenses
        const params = new URLSearchParams({
          search: searchTerm,
          loai: selectedSubCategory || status,
          trangThai: selectedExpenseStatus,
        });
        const res = await fetch(`/api/plan-finance/expenses?${params}`, { cache: 'no-store' });
        const data = await res.json();
        
        // Map expense data to debt-like structure for the table
        const items = (data.items || []).map((ex: any) => ({
          id: ex.id,
          partnerName: ex.tenChiPhi,
          amount: ex.soTien,
          paidAmount: ex.trangThai === "paid" ? ex.soTien : 0,
          dueDate: ex.ngayChiTra,
          status: ex.trangThai,
          description: ex.ghiChu,
          responsible: ex.nguoiChiTra,
          referenceId: ex.loai,
        }));

        setDebts(items);
        
        // Simple stats for expenses
        const total = items.reduce((s: number, i: any) => s + i.amount, 0);
        const paid = items.reduce((s: number, i: any) => s + i.paidAmount, 0);
        const pending = items.filter((i: any) => i.status === "pending").length;
        const approved = items.filter((i: any) => i.status === "approved").length;

        setStats({
          totalAmount: total,
          totalPaid: paid,
          recoveryRate: total > 0 ? parseFloat(((paid / total) * 100).toFixed(1)) : 0,
          upcomingCount: items.filter((i: any) => i.status === "approved").length,
          avgDays: 0,
          overdueCount: items.filter((i: any) => i.status === "rejected").length,
          countByFilter: { ALL: items.length, PENDING: pending, APPROVED: approved, PAID: items.filter((i: any) => i.status === "paid").length, OVER_60: 0 }
        });
      } else if (currentStepId === "LOAN") {
        const params = new URLSearchParams({
          status,
          search: searchTerm,
        });
        const res = await fetch(`/api/finance/bank-loans?${params}`, { cache: 'no-store' });
        const data = await res.json();
        if (Array.isArray(data)) {
          setDebts(data);
          
          const totalAmount = data.reduce((sum, loan) => sum + loan.creditLimit, 0);
          const totalPaid = data.reduce((sum, loan) => sum + loan.totalDisbursed, 0); // Using totalPaid slot for totalDisbursed
          setStats({
            totalAmount,
            totalPaid,
            recoveryRate: 0,
            upcomingCount: data.length,
            avgDays: 0,
            overdueCount: data.filter((l: any) => l.status === "OVERDUE").length,
            countByFilter: { ALL: data.length, OVERDUE: 0, DAYS_30: 0, DAYS_30_60: 0, OVER_60: 0 }
          });
        }
      } else {
        const params = new URLSearchParams({
          type: currentStepId,
          status,
          search: searchTerm,
          daysFilter
        });
        if (refresh) params.append("_t", Date.now().toString());
        const res = await fetch(`/api/finance/debts-v2?${params}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.debts) {
          setDebts(data.debts);
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [currentStep, status, searchTerm, daysFilter, selectedSubCategory, selectedExpenseStatus]);

  useEffect(() => {
    fetch("/api/plan-finance/categories?type=expense_type")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.error("Error fetching categories:", err));

    fetch("/api/plan-finance/categories?type=trang_thai_chi_phi")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setExpenseStatuses(data);
      })
      .catch(err => console.error("Error fetching statuses:", err));
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      let endpoint = `/api/finance/debts-v2?id=${deletingId}`;
      if (currentStepId === "EXPENSE") {
        endpoint = `/api/plan-finance/expenses/${deletingId}`;
      } else if (currentStepId === "LOAN") {
        endpoint = deletingType === "disbursement" 
          ? `/api/finance/bank-disbursements/${deletingId}` 
          : `/api/finance/bank-loans/${deletingId}`;
      }
      
      const res = await fetch(endpoint, {
        method: "DELETE",
      });
      if (res.ok) {
        success("Đã xóa thành công");
        fetchDebts();
      } else {
        error("Không thể xóa. Vui lòng thử lại.");
      }
    } catch (err) {
      error("Lỗi kết nối máy chủ");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeletingId(null);
      setDeletingType(null);
    }
  };

  const getColumns = (): TableColumn<any>[] => {
    const isLoan = currentStepId === "LOAN";
    const isExpense = currentStepId === "EXPENSE";
    const isSupplier = currentStepId === "PAYABLE";

    const commonCols: TableColumn<any>[] = [
      {
        header: isLoan ? "Ngân hàng / Gói vay" : (isExpense ? "Khoản chi phí" : "Đối tác / Nội dung"),
        render: (row) => {
          if (row.isGroupHeader) {
            const isAgency = row.partnerName?.toLowerCase().startsWith("đại lý");
            
            let textColorClass = "text-dark";
            let textColorStyle = {};
            if (isSupplier) {
              textColorClass = "text-uppercase";
              textColorStyle = { color: "#8b0000" }; // Dark red
            } else if (isAgency) {
              textColorClass = "text-uppercase";
              textColorStyle = { color: "#0d6efd" }; // Blue
            }

            return (
              <div 
                className="d-flex align-items-center gap-2 cursor-pointer py-1"
                onClick={(e) => {
                  e.stopPropagation();
                  const groupKey = row.groupKey || row.items[0]?.customerId || row.items[0]?.supplierId || row.partnerName;
                  setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
                }}
              >
                <i className={`bi bi-chevron-${row.isCollapsed ? 'right' : 'down'} text-muted fs-5`} />
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`fw-bold ${textColorClass}`} style={textColorStyle}>
                      {row.partnerName}
                    </span>
                    <span className="badge bg-secondary-subtle text-secondary rounded-pill" style={{ fontSize: 10 }}>{row.items.filter((i: any) => !i.isPaymentLog).length} khoản nợ</span>
                  </div>
                  {row.address && (
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-geo-alt me-1"></i>
                      {row.address}
                    </div>
                  )}
                </div>
              </div>
            );
          }
          
          let cleanedPartnerName = row.partnerName || "";
          cleanedPartnerName = cleanedPartnerName.split(/[-–]/)[0].trim();
          const isAgencyChild = cleanedPartnerName.toLowerCase().startsWith("đại lý");

          return (
          <div className={row.isChild ? "ms-4 position-relative" : ""}>
            {row.isChild && (
              <div className="position-absolute border-start border-bottom rounded-bottom-1" style={{ width: 12, height: 16, top: -4, left: -20, opacity: 0.3 }} />
            )}
            
            {row.isChild ? (
              <div className={row.referenceId?.startsWith("DBH-") ? "cursor-pointer" : ""}>
                <div className="fw-bold text-dark">
                  {row.referenceId || (row.isPaymentLog ? "Phiếu thu/chi" : "Không có số ĐH")}
                </div>
                <div className="text-muted small">
                  {row.createdAt ? format(new Date(row.createdAt), "HH:mm:ss dd/MM/yyyy") : "---"} 
                  <span className="mx-1">|</span> 
                  {row.isPaymentLog ? row.displayDescription : "Hệ thống"}
                </div>
              </div>
            ) : (
              <>
                <div className={`fw-bold ${isAgencyChild ? 'text-uppercase' : 'text-dark'}`} style={isAgencyChild ? { color: '#0d6efd' } : {}}>
                  {cleanedPartnerName}
                </div>
                {!row.isTotalRow && (
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    REF: {row.referenceId || "N/A"} <span className="mx-1">|</span> {row.displayDescription || "Không có nội dung"}
                  </div>
                )}
              </>
            )}
          </div>
          );
        },
      },
      {
        header: isLoan ? "Số tiền vay" : (isExpense ? "Số tiền chi" : "Số tiền gốc"),
        align: "right",
        render: (row) => (
          <span className={row.isGroupHeader ? "fw-bold text-dark" : "fw-medium"}>
            {row.isPaymentLog ? null : formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        header: "Đã thanh toán",
        align: "right",
        render: (row) => {
          if (row.isGroupHeader) {
            return <span className="fw-bold text-success">{formatCurrency(row.paidAmount)}</span>;
          }
          if (row.isChild && row.amount > 0) {
            return null;
          }
          return <span className="fw-medium text-success">{formatCurrency(row.paidAmount)}</span>;
        }
      },
    ];

    const actionsCol: TableColumn<any> = {
      header: "",
      align: "center",
      width: 40,
      render: (row) => {
        if (row.isChild) return null;
        if (row.id?.toString().startsWith("AUTO_")) return null;
        
        const targetRow = row.isGroupHeader && row.originalItems?.length 
          ? { ...row.originalItems[row.originalItems.length - 1], groupItems: row.originalItems } 
          : row;

        return (
          <div className="dropdown position-static">
            <button 
              className="btn btn-link btn-sm text-muted p-0 border-0 dropdown-toggle no-caret"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="bi bi-three-dots-vertical" />
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0 py-2" style={{ fontSize: 12.5, minWidth: 200, zIndex: 1050 }}>
              {isLoan && row.isGroupHeader && (
                <>
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingItem(row);
                        setShowDisbursementForm(true); // TODO: implement this state and offcanvas
                      }}
                    >
                      <i className="bi bi-box-arrow-right text-success fs-6" />
                      <span className="fw-medium text-success">Rút vốn / Giải ngân</span>
                    </button>
                  </li>
                  <li><hr className="dropdown-divider opacity-50" /></li>
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingItem(row);
                        setShowDebtForm(true); // Edit Credit Line
                      }}
                    >
                      <i className="bi bi-pencil-square text-primary fs-6" />
                      <span>Chỉnh sửa hạn mức</span>
                    </button>
                  </li>
                </>
              )}
              
              {isLoan && !row.isGroupHeader && (
                // This is a BankDisbursement (Khế ước)
                <>
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedPaymentDebt(row);
                        setShowPaymentOffcanvas(true); // Repay a disbursement
                      }}
                    >
                      <i className="bi bi-cash-coin text-success fs-6" />
                      <span>Ghi nhận trả nợ</span>
                    </button>
                  </li>
                </>
              )}

              {!isLoan && (
                <>
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (isExpense) {
                          // Custom approval logic for expenses
                        } else {
                          setSelectedPaymentDebt(targetRow);
                          setShowPaymentOffcanvas(true);
                        }
                      }}
                    >
                      <i className="bi bi-cash-coin text-success fs-6" />
                      <span>{isExpense ? "Duyệt chi" : "Ghi nhận thanh toán"}</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (isExpense) {
                          setEditingItem(targetRow);
                          setShowExpenseForm(true);
                        } else {
                          setEditingItem(targetRow);
                          setShowDebtForm(true);
                        }
                      }}
                    >
                      <i className="bi bi-pencil-square text-primary fs-6" />
                      <span>{isExpense ? "Chỉnh sửa khoản chi" : "Chỉnh sửa thông tin"}</span>
                    </button>
                  </li>
                  {!isExpense && (
                    <>
                      <li>
                        <button 
                          className="dropdown-item d-flex align-items-center gap-2 py-1.5" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedReconciliationDebt(targetRow);
                            setShowReconciliationModal(true);
                          }}
                        >
                          <i className="bi bi-file-earmark-check text-info fs-6" />
                          <span>Đối chiếu công nợ</span>
                        </button>
                      </li>
                      {currentStepId === "RECEIVABLE" && (
                        <li>
                          <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                            <i className="bi bi-bell text-warning fs-6" />
                            <span>Gửi nhắc nợ</span>
                          </button>
                        </li>
                      )}
                      {currentStepId === "PAYABLE" && (
                        <li>
                          <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                            <i className="bi bi-send-check text-warning fs-6" />
                            <span>Đề nghị thanh toán</span>
                          </button>
                        </li>
                      )}
                    </>
                  )}
                </>
              )}

              <li><hr className="dropdown-divider opacity-50" /></li>
              <li>
                <button className="dropdown-item d-flex align-items-center gap-2 py-1.5 text-danger" onClick={(e) => { 
                  e.stopPropagation(); 
                  setDeletingId(targetRow.id);
                  setDeletingType(targetRow.isDisbursement ? "disbursement" : "loan");
                  setShowDeleteConfirm(true);
                }}>
                  <i className="bi bi-trash fs-6" />
                  <span>Xóa dữ liệu</span>
                </button>
              </li>
            </ul>
          </div>
        );
      },
    };

    if (isLoan) {
      return [
        ...commonCols,
        {
          header: "Dư nợ gốc",
          align: "right",
          render: (row) => row.isGroupHeader ? (
            <span className="fw-bold">{formatCurrency(row.remainingPrincipal)}</span>
          ) : (
            <span className="fw-medium">{formatCurrency(row.amount - row.paidPrincipal)}</span>
          ),
        },
        {
          header: "Hạn mức khả dụng",
          align: "right",
          render: (row) => row.isGroupHeader ? (
            <div className="d-flex flex-column align-items-end">
              <span className="fw-bold text-primary">{formatCurrency(row.availableLimit)}</span>
              <div className="mt-1 bg-light rounded-pill overflow-hidden" style={{ width: 70, height: 4 }}>
                <div 
                  className="h-100 bg-primary" 
                  style={{ width: `${Math.min(100, (row.availableLimit / row.creditLimit) * 100)}%` }}
                />
              </div>
            </div>
          ) : <span className="text-muted">---</span>,
        },
        {
          header: "Lãi suất",
          align: "center",
          render: (row) => row.isGroupHeader ? <span className="text-muted">---</span> : row.interestRate ? (
            <span className="badge rounded-pill fw-bold" style={{ background: "rgba(79, 70, 229, 0.1)", color: "#4f46e5", padding: "5px 12px", border: "1px solid rgba(79, 70, 229, 0.15)", fontSize: 10.5 }}>
              {row.interestRate}%<span className="opacity-75 ms-1" style={{ fontWeight: 400, fontSize: 9.5 }}>/năm</span>
            </span>
          ) : "---",
        },
        {
          header: "Trạng thái",
          align: "center",
          render: (row) => {
            const s = STATUS_MAP[row.status] || { label: row.status, color: "secondary" };
            return <span className={`badge bg-${s.color}-subtle text-${s.color} rounded-pill px-3 py-1.5`} style={{ fontSize: 10.5 }}>{s.label}</span>;
          },
        },
        actionsCol
      ];
    }

    const resultCols: TableColumn<any>[] = [...commonCols];

    if (!isExpense && !isLoan) {
      resultCols.push({
        header: "Hạn thanh toán",
        align: "center",
        render: (row) => {
          if (row.isGroupHeader) return <span className="text-muted">---</span>;
          if (row.isChild) return null;
          return row.dueDate ? (
          <div className="d-flex flex-column align-items-center">
            <span className="fw-medium">{new Date(row.dueDate).toLocaleDateString("vi-VN")}</span>
            {new Date(row.dueDate) < new Date() && row.status !== "PAID" && (
              <span className="text-danger" style={{ fontSize: 10, fontWeight: 600 }}>Quá hạn</span>
            )}
          </div>
          ) : "---";
        },
      });
    }

    if (!isExpense) {
      resultCols.push({
        header: "Còn lại",
        align: "right",
        render: (row) => {
          if (row.isChild) return null;
          const remaining = row.amount - row.paidAmount;
          return (
            <span className={row.isGroupHeader ? "fw-bold text-primary" : "fw-bold text-primary"}>
              {formatCurrency(remaining)}
            </span>
          );
        },
      });
    }

    // Chỉ hiển thị Trạng thái cho EXPENSE (hoặc LOAN đã có ở trên)
    if (isExpense) {
      resultCols.push({
        header: "Trạng thái",
        align: "center",
        render: (row) => {
          const s = STATUS_MAP[row.status] || { label: row.status, color: "secondary" };
          return <span className={`badge bg-${s.color}-subtle text-${s.color} rounded-pill px-3 py-1.5`} style={{ fontSize: 10.5 }}>{s.label}</span>;
        },
      });
    }



      resultCols.push(actionsCol);
    return resultCols;
    };

  const columns = getColumns();

  return (
    <>
      <style>{`
        .no-caret::after { display: none !important; }
      `}</style>
      <StandardPage
        title="Quản lý tài chính"
        description="Theo dõi công nợ phải thu, phải trả và kiểm soát chi phí vận hành"
        icon="bi-receipt"
        color="indigo"
        useCard={false}
        paddingClassName="px-2 pb-2 pt-1"
      >
        <div className="d-flex flex-column h-100 flex-grow-1 overflow-hidden">
          <FullWidthTableLayout
            className="bg-white rounded-4 shadow-sm border flex-grow-1 overflow-hidden"
            header={
              <>
                <div className="px-4 py-1 border-bottom flex-shrink-0 bg-white workflow-card-stepper-container">
                  <ModernStepper 
                    steps={DEBT_STEPS} 
                    currentStep={currentStep} 
                    onStepChange={setCurrentStep} 
                    paddingX={0}
                    paddingY={8}
                  />
                </div>
                
              </>
            }
            footer={
              <div className="d-flex align-items-center w-100 px-4 py-2 border-top bg-light">
                <div className="flex-grow-1">
                  
                  {currentStepId === "EXPENSE" ? (
                    <div className="d-flex align-items-center flex-wrap gap-2 w-100">
                      {/* Dropdown & Search */}
                      <FilterSelect
                        options={[
                          { label: "Tất cả loại chi phí", value: "" },
                          ...categories
                            .filter(c => !c.parentId)
                            .map(c => ({ label: c.name, value: c.code }))
                        ]}
                        value={status}
                        onChange={setStatus}
                        width={180}
                      />
                      <div className="flex-grow-1" style={{ minWidth: 200 }}>
                        <SearchInput 
                          placeholder="Tìm khoản chi, người phụ trách..."
                          value={searchTerm}
                          onChange={setSearchTerm}
                        />
                      </div>
                      <FilterSelect 
                        options={expenseStatuses.map(s => ({ label: s.name, value: s.code }))}
                        value={selectedExpenseStatus}
                        onChange={setSelectedExpenseStatus}
                        width={160}
                        placeholder="Tất cả trạng thái"
                      />
                      <BrandButton 
                        icon="bi-plus-lg" 
                        style={{ height: 34, fontSize: 12, padding: "0 16px" }}
                        onClick={() => {
                          setEditingItem(null);
                          setShowExpenseForm(true);
                        }}
                      >
                        Ghi phí
                      </BrandButton>
                    </div>
                  ) : (
                    <div className="d-flex align-items-center flex-wrap gap-2 w-100">
                      <div className="flex-grow-1" style={{ minWidth: 200 }}>
                        <SearchInput 
                          placeholder={
                            currentStepId === "RECEIVABLE" ? "Tìm khách hàng, số điện thoại..." : 
                            currentStepId === "PAYABLE" ? "Tìm nhà cung cấp, số hóa đơn..." : 
                            "Tìm gói vay, ngân hàng..."
                          }
                          value={searchTerm}
                          onChange={setSearchTerm}
                        />
                      </div>
                      <FilterSelect 
                        options={[
                          { label: "Trạng thái", value: "" },
                          ...STATUS_OPTIONS
                        ]} 
                        value={status} 
                        onChange={setStatus} 
                        width={140}
                      />
                      <BrandButton 
                        icon="bi-plus-lg" 
                        style={{ height: 34, fontSize: 12, padding: "0 16px" }}
                        onClick={() => {
                          setEditingItem(null);
                          if (currentStepId === "EXPENSE") {
                            setShowExpenseForm(true);
                          } else {
                            setShowDebtForm(true);
                          }
                        }}
                      >
                        {currentStepId === "EXPENSE" ? "Thêm chi phí" : currentStepId === "LOAN" ? "Thêm Hợp đồng Hạn mức" : "Nhập dư nợ cũ"}
                      </BrandButton>
                    </div>
                  )}
          
                </div>
                <div className="flex-shrink-0 ms-3">
                  <Pagination 
                    page={1} 
                    totalPages={1} 
                    onChange={() => {}} 
                  />
                </div>
              </div>
            }
            table={
              <div className="flex-grow-1 d-flex flex-column position-relative" style={{ minHeight: 400 }}>
                {(() => {
                  if (true) {
                    if (debts.length === 0) return (
                  <Table columns={columns} rows={[]} loading={loading} emptyText={currentStepId === "EXPENSE" ? "Không tìm thấy khoản chi nào" : "Không tìm thấy khoản công nợ nào"} />
                );

                const groupedDebts: any[] = [];
                if (currentStepId === "RECEIVABLE" || currentStepId === "PAYABLE") {
                  const groupedByPartner = debts.reduce((acc, curr) => {
                    // Ưu tiên nhóm theo ID, nếu không có thì nhóm theo Tên
                    const groupKey = curr.customerId || curr.supplierId || curr.partnerName;
                    if (!acc[groupKey]) acc[groupKey] = [];
                    acc[groupKey].push(curr);
                    return acc;
                  }, {} as Record<string, any[]>);

                  const groupsArray = Object.entries(groupedByPartner).map(([groupKey, itemsValue]) => {
                    const items = itemsValue as any[];
                    items.sort((a, b) => {
                      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return dateB - dateA;
                    });
                    return { groupKey, items };
                  });

                  groupsArray.sort((a, b) => {
                    const aHasMany = a.items.length > 1;
                    const bHasMany = b.items.length > 1;
                    if (aHasMany && !bHasMany) return -1;
                    if (!aHasMany && bHasMany) return 1;
                    
                    const dateA = a.items[0]?.createdAt ? new Date(a.items[0].createdAt).getTime() : 0;
                    const dateB = b.items[0]?.createdAt ? new Date(b.items[0].createdAt).getTime() : 0;
                    return dateB - dateA;
                  });

                  groupsArray.forEach(({ groupKey, items }) => {
                    // Lọc số điện thoại ra khỏi tên (VD: "Đại lý Hồng Liên - 0934...")
                    let displayName = items[0].partnerName || "";
                    displayName = displayName.split(/[-–]/)[0].trim();
                    const address = items[0].customerAddress || items[0].supplierAddress || "Chưa cập nhật địa chỉ";
                    
                    // Expand payment logs into separate items
                    const expandedItems: any[] = [];
                    items.forEach((item: any) => {
                      const parsed = parseDebtDescription(item.description || "");
                      const isReceiptRecord = item.amount === 0 && item.paidAmount > 0;
                      
                      if (isReceiptRecord) {
                        expandedItems.push({
                          ...item,
                          displayDescription: parsed.originalDesc,
                          isOriginalDebt: true,
                          isPaymentLog: true
                        });
                      } else {
                        expandedItems.push({
                          ...item,
                          displayDescription: parsed.originalDesc,
                          isOriginalDebt: true
                        });
                        
                        if (parsed.history && parsed.history.length > 0) {
                          parsed.history.forEach((hist: any) => {
                            expandedItems.push({
                              ...item, // Inherit base properties for safety
                              id: hist.id,
                              partnerName: item.partnerName,
                              referenceId: hist.ref,
                              description: item.description, // keep original description
                              displayDescription: hist.note || (hist.method ? `Thanh toán qua ${hist.method}` : "Phiếu thu/chi"),
                              amount: 0,
                              paidAmount: hist.amount,
                              createdAt: hist.date,
                              dueDate: null,
                              status: "PAID",
                              isPaymentLog: true,
                              isOriginalDebt: false
                            });
                          });
                        }
                      }
                    });
                    
                    expandedItems.sort((a, b) => {
                      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return dateB - dateA;
                    });
                    
                    if (expandedItems.length > 1) {
                      const isCollapsed = !expandedGroups[groupKey];
                      groupedDebts.push({
                        id: `group_${groupKey}`,
                        groupKey,
                        isGroupHeader: true,
                        partnerName: displayName,
                        address,
                        items: expandedItems,
                        originalItems: items,
                        amount: items.reduce((s: number, i: any) => s + (i.amount || 0), 0),
                        paidAmount: items.reduce((s: number, i: any) => s + (i.paidAmount || 0), 0),
                        isCollapsed,
                      });
                      if (!isCollapsed) {
                        expandedItems.forEach((item: any) => groupedDebts.push({ 
                          ...item, 
                          isChild: true, 
                          groupItems: items 
                        }));
                      }
                    } else {
                      groupedDebts.push({ 
                        ...expandedItems[0], 
                        partnerName: displayName, 
                        groupItems: items 
                      });
                    }
                  });
                } else if (currentStepId === "LOAN") {
                  debts.forEach(loan => {
                    const isCollapsed = !expandedGroups[loan.id];
                    groupedDebts.push({
                      ...loan,
                      id: loan.id,
                      isGroupHeader: true,
                      partnerName: loan.bankName,
                      referenceId: loan.contractNumber,
                      amount: loan.creditLimit,
                      paidAmount: loan.totalDisbursed,
                      isCollapsed,
                      items: loan.disbursements || []
                    });
                    if (!isCollapsed && loan.disbursements) {
                      loan.disbursements.forEach((d: any) => {
                        groupedDebts.push({
                          ...d,
                          isChild: true,
                          isDisbursement: true,
                          partnerName: "Giải ngân",
                          referenceId: d.disbursementNumber,
                          amount: d.amount,
                          paidAmount: d.paidPrincipal,
                        });
                      });
                    }
                  });
                } else {
                  groupedDebts.push(...debts.map(d => ({ ...d, groupItems: [d] })));
                }

                const totalAmount = debts.reduce((sum, d) => sum + (currentStepId === "LOAN" ? d.creditLimit : d.amount), 0);
                const totalPaid = debts.reduce((sum, d) => sum + (currentStepId === "LOAN" ? d.totalDisbursed : d.paidAmount), 0);
                const totalRows = [{
                  id: "TOTAL_ROW",
                  partnerName: "TỔNG CỘNG",
                  amount: totalAmount,
                  paidAmount: totalPaid,
                  type: currentStepId,
                  dueDate: null,
                  interestRate: null,
                  status: totalPaid === 0 ? "UNPAID" : (totalPaid >= totalAmount ? "PAID" : "PARTIAL"),
                  description: null,
                  referenceId: null,
                  isTotalRow: true
                } as any, ...groupedDebts];

                let finalRows = totalRows;

                if (currentStepId === "EXPENSE" && debts.length > 0) {
                  const sorted = [...debts].sort((a, b) => {
                    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                    return dateB - dateA;
                  });

                  // Pre-calculate totals per month
                  const monthlyTotals: Record<string, number> = {};
                  sorted.forEach(d => {
                    if (d.dueDate) {
                      const date = new Date(d.dueDate);
                      const mKey = `THÁNG ${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
                      monthlyTotals[mKey] = (monthlyTotals[mKey] || 0) + d.amount;
                    }
                  });

                  const grouped: any[] = [];
                  let lastMonth = "";
                  sorted.forEach(d => {
                    if (d.dueDate) {
                      const date = new Date(d.dueDate);
                      const monthStr = `THÁNG ${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
                      const isCollapsed = !expandedMonths.includes(monthStr);
                      
                      if (monthStr !== lastMonth) {
                        grouped.push({
                          id: `HEADER_${monthStr}`,
                          isFullWidth: true,
                          fullWidthContent: (
                            <div 
                              className="d-flex align-items-center justify-content-between w-100 cursor-pointer"
                              onClick={() => setExpandedMonths(prev => 
                                prev.includes(monthStr) ? prev.filter(m => m !== monthStr) : [...prev, monthStr]
                              )}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <div className="d-flex align-items-center gap-2">
                                  <i className="bi bi-calendar-check text-primary" />
                                  <span>{monthStr}</span>
                                </div>
                                <div className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1" style={{ fontSize: 10.5, fontWeight: 700 }}>
                                  Tổng: {monthlyTotals[monthStr]?.toLocaleString("vi-VN")} đồng
                                </div>
                              </div>
                              <i className={cn("bi text-muted ms-auto", isCollapsed ? "bi-chevron-down" : "bi-chevron-up")} />
                            </div>
                          )
                        });
                        lastMonth = monthStr;
                      }
                      
                      if (!isCollapsed) {
                        grouped.push(d);
                      }
                    } else {
                       grouped.push(d);
                    }
                  });
                  finalRows = [totalRows[0], ...grouped];
                }

                return (
                  <Table 
                    columns={columns.map(col => ({
                      ...col,
                      render: (row: any, index: number) => {
                        const isTotal = row.id === "TOTAL_ROW";
                        const content = col.render 
                          ? (col.render as any)(row, index) 
                          : (typeof col.header === "string" ? (row as any)[col.header.toLowerCase()] : null);
                        
                        if (isTotal) {
                          if (col.header?.toString().toUpperCase() === "TRẠNG THÁI" || col.header === "") return null;
                          return <div className="fw-bold text-primary">{content}</div>;
                        }
                        return content;
                      }
                    }))} 
                    rows={finalRows} 
                    loading={loading}
                    emptyText={currentStepId === "EXPENSE" ? "Không tìm thấy khoản chi nào" : "Không tìm thấy khoản công nợ nào"}
                    stickyFirstRow={true}
                    compact={true}
                    onRowClick={(row: any) => {
                      if (row.isChild && row.referenceId?.startsWith("DBH-")) {
                        setSelectedOrderCode(row.referenceId);
                      }
                    }}
                  />
                );
              }
              })()}
              </div>
            }
          />
        </div>
      </StandardPage>

      <ConfirmDialog 
        open={showDeleteConfirm}
        title="Xác nhận xóa"
        message={<>Bạn có chắc chắn muốn xóa? Hành động này không thể hoàn tác.</>}
        variant="danger"
        confirmLabel="Xóa ngay"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showExpenseForm && (
        <ExpenseFormOffcanvas
          open={showExpenseForm}
          onClose={() => setShowExpenseForm(false)}
          onSuccess={fetchDebts}
          initialData={editingItem}
        />
      )}
      
      {showDebtForm && currentStepId === "RECEIVABLE" && (
        <ReceivableOpeningBalanceOffcanvas
          open={showDebtForm}
          onClose={() => setShowDebtForm(false)}
          onSuccess={fetchDebts}
          initialData={editingItem}
        />
      )}

      {showDebtForm && currentStepId === "PAYABLE" && (
        <PayableOpeningBalanceOffcanvas
          open={showDebtForm}
          onClose={() => setShowDebtForm(false)}
          onSuccess={fetchDebts}
          initialData={editingItem}
        />
      )}

      {showDebtForm && currentStepId === "LOAN" && (
        <LoanFormOffcanvas
          open={showDebtForm}
          onClose={() => setShowDebtForm(false)}
          onSuccess={fetchDebts}
          initialData={editingItem}
        />
      )}

      {showDisbursementForm && currentStepId === "LOAN" && (
        <DisbursementFormOffcanvas
          open={showDisbursementForm}
          onClose={() => setShowDisbursementForm(false)}
          onSuccess={fetchDebts}
          initialData={editingItem}
        />
      )}

      <DebtPaymentOffcanvas
        open={showPaymentOffcanvas}
        onClose={() => {
          setShowPaymentOffcanvas(false);
          setSelectedPaymentDebt(null);
        }}
        onSuccess={fetchDebts}
        debt={selectedPaymentDebt}
      />

      <DebtReconciliationModal
        open={showReconciliationModal}
        onClose={() => {
          setShowReconciliationModal(false);
          setSelectedReconciliationDebt(null);
        }}
        onSuccess={fetchDebts}
        debt={selectedReconciliationDebt}
      />

      {selectedOrderCode && (
        <FinanceOrderDetailsOffcanvas
          orderId={selectedOrderCode}
          onClose={() => setSelectedOrderCode(null)}
        />
      )}
    </>
  );
}
