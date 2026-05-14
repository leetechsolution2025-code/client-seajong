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
import { DebtFormOffcanvas } from "./DebtFormOffcanvas";
import { ExpenseFormOffcanvas } from "./ExpenseFormOffcanvas";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [expenseStatuses, setExpenseStatuses] = useState<any[]>([]);
  const [selectedExpenseStatus, setSelectedExpenseStatus] = useState("");
  const [collapsedMonths, setCollapsedMonths] = useState<string[]>([]);
  
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { success, error } = useToast();
  const currentStepId = DEBT_STEPS.find(s => s.num === currentStep)?.id || "RECEIVABLE";

  const fetchDebts = async () => {
    setLoading(true);
    try {
      if (currentStepId === "EXPENSE") {
        // Fetch expenses
        const params = new URLSearchParams({
          search: searchTerm,
          loai: selectedSubCategory || status,
          trangThai: selectedExpenseStatus,
        });
        const res = await fetch(`/api/plan-finance/expenses?${params}`);
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
      } else {
        const params = new URLSearchParams({
          type: currentStepId,
          status,
          search: searchTerm,
          daysFilter
        });
        const res = await fetch(`/api/finance/debts-v2?${params}`);
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
      const endpoint = currentStepId === "EXPENSE" 
        ? `/api/plan-finance/expenses/${deletingId}`
        : `/api/finance/debts-v2?id=${deletingId}`;
      
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
    }
  };

  const getColumns = (): TableColumn<any>[] => {
    const isLoan = currentStepId === "LOAN";
    const isExpense = currentStepId === "EXPENSE";

    const commonCols: TableColumn<any>[] = [
      {
        header: isLoan ? "Ngân hàng / Gói vay" : (isExpense ? "Khoản chi phí" : "Đối tác / Nội dung"),
        render: (row) => (
          <div>
            <div className="fw-bold text-dark">{row.partnerName}</div>
            <div className="text-muted small">
              {row.referenceId && (
                <span className="me-2">
                  {isExpense 
                    ? `Loại: ${categories.find(c => c.code === row.referenceId)?.name || row.referenceId}` 
                    : `REF: ${row.referenceId}`}
                </span>
              )}
              {row.description}
            </div>
          </div>
        ),
      },
      {
        header: isLoan ? "Số tiền vay" : (isExpense ? "Số tiền chi" : "Số tiền gốc"),
        align: "right",
        render: (row) => (
          <span className="fw-medium">
            {row.amount.toLocaleString("vi-VN")}
          </span>
        ),
      },
    ];

    if (isLoan) {
      return [
        ...commonCols,
        {
          header: "Lãi suất",
          align: "center",
          render: (row) => row.interestRate ? (
            <span className="badge rounded-pill fw-bold" style={{ background: "rgba(79, 70, 229, 0.1)", color: "#4f46e5", padding: "5px 12px", border: "1px solid rgba(79, 70, 229, 0.15)", fontSize: 10.5 }}>
              {row.interestRate}%<span className="opacity-75 ms-1" style={{ fontWeight: 400, fontSize: 9.5 }}>/năm</span>
            </span>
          ) : "---",
        },
        {
          header: "Dư nợ hiện tại",
          align: "right",
          render: (row) => {
            const remaining = row.amount - row.paidAmount;
            return (
              <div className="d-flex flex-column align-items-end">
                <span>
                  {remaining.toLocaleString("vi-VN")}
                </span>
                <div className="mt-1 bg-light rounded-pill overflow-hidden" style={{ width: 70, height: 4 }}>
                  <div 
                    className="h-100 bg-primary" 
                    style={{ width: `${Math.min(100, (row.paidAmount / row.amount) * 100)}%` }}
                  />
                </div>
              </div>
            );
          },
        },
        {
          header: "Ngày đáo hạn",
          align: "center",
          render: (row) => row.dueDate ? (
            <div className="d-flex flex-column align-items-center">
              <span className="fw-medium">{new Date(row.dueDate).toLocaleDateString("vi-VN")}</span>
              {new Date(row.dueDate) < new Date() && row.status !== "PAID" && (
                <span className="text-danger" style={{ fontSize: 10, fontWeight: 600 }}>Đã quá hạn</span>
              )}
            </div>
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
        {
          header: "",
          align: "center",
          width: 40,
          render: (row) => (
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
                <li>
                  <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                    <i className="bi bi-cash-coin text-success fs-6" />
                    <span>Ghi nhận thanh toán</span>
                  </button>
                </li>
                <li>
                  <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                    <i className="bi bi-pencil-square text-primary fs-6" />
                    <span>Chỉnh sửa thông tin</span>
                  </button>
                </li>
                <li><hr className="dropdown-divider opacity-50" /></li>
                <li>
                  <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                    <i className="bi bi-file-earmark-check text-info fs-6" />
                    <span>Đối chiếu công nợ</span>
                  </button>
                </li>
                <li>
                  <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                    <i className="bi bi-bell text-warning fs-6" />
                    <span>Gửi nhắc nợ</span>
                  </button>
                </li>
                <li><hr className="dropdown-divider opacity-50" /></li>
                <li>
                  <button className="dropdown-item d-flex align-items-center gap-2 py-1.5 text-danger" onClick={(e) => { 
                    e.stopPropagation(); 
                    setDeletingId(row.id);
                    setShowDeleteConfirm(true);
                  }}>
                    <i className="bi bi-trash fs-6" />
                    <span>Xóa khoản nợ</span>
                  </button>
                </li>
              </ul>
            </div>
          ),
        },
      ];
    }

    const resultCols: TableColumn<any>[] = [...commonCols];

    if (!isExpense) {
      resultCols.push({
        header: "Còn lại",
        align: "right",
        render: (row) => {
          const remaining = row.amount - row.paidAmount;
          return (
            <div className="d-flex flex-column align-items-end">
              <span>{remaining.toLocaleString("vi-VN")}</span>
              <div className="mt-1 bg-light rounded-pill overflow-hidden" style={{ width: 60, height: 4 }}>
                <div 
                  className="h-100 bg-success" 
                  style={{ width: `${Math.min(100, (row.paidAmount / row.amount) * 100)}%` }}
                />
              </div>
            </div>
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

    resultCols.push({
      header: "",
      align: "center",
      width: 40,
      render: (row) => {
        if (row.id?.toString().startsWith("AUTO_")) return null;
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
              <li>
                <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                  <i className="bi bi-cash-coin text-success fs-6" />
                  <span>{isExpense ? "Duyệt chi" : "Ghi nhận thanh toán"}</span>
                </button>
              </li>
              <li>
                <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                  <i className="bi bi-pencil-square text-primary fs-6" />
                  <span>Chỉnh sửa thông tin</span>
                </button>
              </li>
              {!isExpense && (
                <>
                  <li><hr className="dropdown-divider opacity-50" /></li>
                  <li>
                    <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                      <i className="bi bi-file-earmark-check text-info fs-6" />
                      <span>Đối chiếu công nợ</span>
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item d-flex align-items-center gap-2 py-1.5" onClick={(e) => { e.stopPropagation(); }}>
                      <i className="bi bi-bell text-warning fs-6" />
                      <span>Gửi nhắc nợ</span>
                    </button>
                  </li>
                </>
              )}
              <li><hr className="dropdown-divider opacity-50" /></li>
              <li>
                <button className="dropdown-item d-flex align-items-center gap-2 py-1.5 text-danger" onClick={(e) => { 
                  e.stopPropagation(); 
                  setDeletingId(row.id);
                  setShowDeleteConfirm(true);
                }}>
                  <i className="bi bi-trash fs-6" />
                  <span>{isExpense ? "Xóa chi phí" : "Xóa khoản nợ"}</span>
                </button>
              </li>
            </ul>
          </div>
        );
      },
    });

      return resultCols;
    };

  const columns = getColumns();

  const DebtHealthGauge = ({ score, type }: { score: number, type: string }) => {
    const [isHovered, setIsHovered] = useState(false);
    const isReceivable = type === "RECEIVABLE";
    const isExpense = type === "EXPENSE";
    
    // Logic xác định nhãn và màu sắc dựa trên điểm số
    let statusLabel = "";
    let themeColor = "";
    let hexColor = "";
    
    if (isReceivable || isExpense) {
      if (score >= 75) { statusLabel = isExpense ? "Ổn định" : "Tốt"; themeColor = "info"; hexColor = "#0ea5e9"; }
      else if (score >= 40) { statusLabel = isExpense ? "Bình thường" : "Trung bình"; themeColor = "warning"; hexColor = "#f59e0b"; }
      else { statusLabel = isExpense ? "Cần kiểm soát" : "Yếu"; themeColor = "danger"; hexColor = "#ef4444"; }
    } else {
      // Đối với Phải trả, điểm thu hồi cao (đã trả nhiều) -> Áp lực thấp
      if (score >= 75) { statusLabel = "Thấp"; themeColor = "info"; hexColor = "#0ea5e9"; }
      else if (score >= 40) { statusLabel = "Vừa"; themeColor = "warning"; hexColor = "#f59e0b"; }
      else { statusLabel = "Cao"; themeColor = "danger"; hexColor = "#ef4444"; }
    }

    const strokeColor = hexColor;

    return (
      <div className="bg-white rounded-3 border px-4 py-3 shadow-sm h-100 d-flex flex-column">
        <SectionTitle 
          title={isExpense ? "Phân bổ chi phí" : (isReceivable ? "Cơ cấu nợ phải thu" : "Cơ cấu nợ phải trả")} 
          className="mb-2" 
        />
        <div className="d-flex align-items-start justify-content-between">
          <div className="d-flex align-items-center gap-4">
            <div className="position-relative" style={{ width: 80, height: 80 }}>
              <svg viewBox="0 0 100 100" className="w-100 h-100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke={strokeColor} strokeWidth="8" 
                  strokeDasharray={`${(score / 100) * 283} 283`} 
                  strokeLinecap="round" 
                  transform="rotate(-90 50 50)" 
                />
              </svg>
              <div className="position-absolute top-50 start-50 translate-middle text-center">
                <div className="fw-bold" style={{ fontSize: 16, lineHeight: 1 }}>{score}</div>
                <div className="text-muted" style={{ fontSize: 8 }}>/100</div>
              </div>
            </div>
            <div>
              <div className={`text-${themeColor} fw-bold mb-0`} style={{ fontSize: 16 }}>
                {statusLabel}
              </div>
              <div className="text-muted small mb-1" style={{ fontSize: 11 }}>
                {isExpense ? "Chỉ số sử dụng ngân sách" : (isReceivable ? "Chỉ số sức khỏe công nợ" : "Chỉ số áp lực thanh toán")}
              </div>
              <div className="bg-light rounded-pill overflow-hidden" style={{ width: 110, height: 5 }}>
                <div className={`h-100 bg-${themeColor}`} style={{ width: `${score}%` }} />
              </div>
              <div className="d-flex justify-content-between mt-1 small text-muted" style={{ fontSize: 8 }}>
                <span>0</span>
                <span>100</span>
              </div>
            </div>
          </div>

          <BrandButton 
            variant="outline" 
            icon="bi-bar-chart" 
            className={`border-0 shadow-none text-${themeColor} bg-${themeColor}-subtle px-3 rounded-pill mt-1`} 
            style={{ fontSize: 10, height: 26 }}
          >
            Báo cáo
          </BrandButton>
        </div>

        <div className="mt-4 pt-3 border-top flex-grow-1 d-flex flex-column">
          <div className={`d-flex align-items-center gap-2 mb-3 text-${themeColor} fw-bold`} style={{ fontSize: 12 }}>
            <i className="bi bi-stars" />
            <span className="text-uppercase">Phân tích tình trạng</span>
          </div>
          <div className={`p-3 rounded-3 bg-${themeColor}-subtle border-start border-${themeColor} border-4 mb-3`}>
            <p className="mb-0 small" style={{ lineHeight: 1.6, fontSize: 12 }}>
              {isExpense ? (
                <>Tỷ lệ giải ngân <strong>đạt {stats.recoveryRate}%</strong> ngân sách tháng. Tình hình chi tiêu {stats.recoveryRate > 90 ? "đang ở mức cảnh báo" : "ổn định trong tầm kiểm soát"}.</>
              ) : isReceivable ? (
                <>Tỷ lệ thu hồi <strong>đạt {stats.recoveryRate}%</strong> — {stats.recoveryRate < 70 ? "cần đẩy mạnh thu hồi" : "tình hình thu hồi ổn định"}. Vòng quay nợ <strong>{stats.avgDays} ngày</strong> — {stats.avgDays < 30 ? "thu hồi nhanh" : "cần cải thiện"}.</>
              ) : (
                <>Thời gian trả nợ bình quân <strong>{stats.avgDays} ngày</strong>. Tỷ lệ thanh toán <strong>{stats.recoveryRate}%</strong> — kế hoạch tài chính {stats.recoveryRate > 80 ? "rất tốt" : "ổn định"}.</>
              )}
            </p>
          </div>

          <div className="flex-grow-1 d-flex flex-column gap-2">
            {[
              { icon: "exclamation-circle", color: stats.recoveryRate < 50 ? "danger" : "success", text: isExpense ? `Đã thanh toán ${stats.recoveryRate}%` : (isReceivable ? `Tỷ lệ thu hồi ${stats.recoveryRate}%` : `Đã thanh toán ${stats.recoveryRate}%`) },
              { icon: "clock-history", color: "success", text: isExpense ? `Tăng trưởng chi phí 5%` : (isReceivable ? `DSO ${stats.avgDays} ngày` : `DPO ${stats.avgDays} ngày`) },
              { icon: "check-circle", color: stats.overdueCount > 0 ? "danger" : "success", text: isExpense ? "Mọi khoản chi đúng hạn" : (stats.overdueCount > 0 ? `${stats.overdueCount} khoản quá hạn` : "Không có khoản quá hạn") },
              { icon: "bell", color: stats.upcomingCount > 0 ? "warning" : "success", text: isExpense ? "3 khoản chờ duyệt" : `${stats.upcomingCount} khoản đến hạn (15 ngày)` },
            ].map((item, i) => (
              <div key={i} className={`d-flex align-items-center gap-2 p-2 rounded-2 bg-${item.color}-subtle text-${item.color}`} style={{ fontSize: 11.5 }}>
                <i className={`bi bi-${item.icon}`} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 p-3 rounded-3 bg-danger-subtle border border-danger-subtle d-flex align-items-center justify-content-between mt-auto">
            <div className="d-flex align-items-center gap-2 text-danger fw-bold" style={{ fontSize: 11 }}>
              <i className="bi bi-exclamation-triangle" />
              <span>{isExpense ? "Cần rà soát 2 khoản chi" : `${stats.upcomingCount} khoản cần ${isReceivable ? "thu hồi" : "chuẩn bị trả"}`}</span>
            </div>
            <button 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="btn btn-sm px-3 rounded-pill fw-bold" 
              style={{ 
                fontSize: 10, 
                transition: "all 0.2s",
                backgroundColor: isHovered ? hexColor : "#fff",
                color: isHovered ? "#fff" : hexColor,
                border: `1.5px solid ${hexColor}`
              }}
            >
              Chi tiết →
            </button>
          </div>
        </div>
      </div>
    );
  };

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
      paddingClassName="px-4 pb-2 pt-1"
    >
      <div className="d-flex flex-column h-100 flex-grow-1 overflow-hidden">
        <div className="bg-white rounded-3 shadow-sm border mb-3">
          <ModernStepper 
            steps={DEBT_STEPS} 
            currentStep={currentStep} 
            onStepChange={setCurrentStep} 
          />
        </div>

        {currentStepId === "RECEIVABLE" || currentStepId === "PAYABLE" || currentStepId === "EXPENSE" ? (
          <div className="row g-3 flex-grow-1 overflow-hidden">
            <div className="col-lg-5 d-flex flex-column h-100">
              <DebtHealthGauge score={stats.recoveryRate} type={currentStepId} />
            </div>

            <div className="col-lg-7 d-flex flex-column h-100 overflow-hidden">
              <div className="bg-white rounded-3 shadow-sm border p-4 flex-grow-1 d-flex flex-column overflow-hidden">
                <div className="mb-2">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <SectionTitle 
                      title={
                        currentStepId === "EXPENSE" ? "Danh sách các khoản chi phí" :
                        currentStepId === "RECEIVABLE" ? "Danh sách công nợ phải thu" : "Danh sách công nợ phải trả"
                      } 
                      className="mb-0" 
                    />
                    {currentStepId === "EXPENSE" && (
                      <FilterSelect 
                        options={expenseStatuses.map(s => ({ label: s.name, value: s.code }))}
                        value={selectedExpenseStatus}
                        onChange={setSelectedExpenseStatus}
                        width={180}
                        className="rounded-pill"
                        placeholder="Tất cả trạng thái"
                      />
                    )}
                  </div>
                  
                  <div className="d-flex flex-column gap-2 mb-2">
                    {currentStepId === "EXPENSE" ? (
                      <div className="d-flex flex-column gap-2 w-100">
                        {/* 1. Nhóm chi phí */}
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                          <button 
                            onClick={() => { setStatus(""); setSelectedSubCategory(""); }}
                            className={cn(
                              "btn btn-sm rounded-pill px-3 py-1 fw-bold",
                              status === "" ? "btn-success" : "btn-light text-muted border"
                            )}
                            style={{ fontSize: 11 }}
                          >
                            Tất cả
                          </button>
                          {categories
                            .filter(c => !c.parentId)
                            .map((cat, i) => (
                              <button 
                                key={i} 
                                onClick={() => { setStatus(cat.code); setSelectedSubCategory(""); }}
                                className={cn(
                                  "btn btn-sm rounded-pill px-3 py-1 fw-bold",
                                  status === cat.code ? "btn-success" : "btn-light text-muted border"
                                )}
                                style={{ fontSize: 11 }}
                              >
                                {cat.name}
                              </button>
                            ))}
                        </div>

                        {/* 2. Dropdown & Search */}
                        <div className="d-flex align-items-center gap-2">
                          <FilterSelect
                            options={categories
                              .filter(c => {
                                if (!status) return false;
                                const parent = categories.find(p => p.code === status);
                                return c.parentId === parent?.id;
                              })
                              .map(c => ({ label: c.name, value: c.code }))
                            }
                            value={selectedSubCategory}
                            onChange={setSelectedSubCategory}
                            width={200}
                            className="rounded-pill"
                            placeholder="Tất cả loại chi phí"
                          />
                          <div className="position-relative flex-grow-1">
                            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                            <input 
                              type="text" 
                              className="form-control form-control-sm ps-5 rounded-pill border-light bg-light"
                              placeholder="Tìm khoản chi, người phụ trách..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              style={{ fontSize: 11.5, height: 34 }}
                            />
                          </div>
                          <BrandButton 
                            icon="bi-plus-lg" 
                            className="rounded-pill px-4" 
                            style={{ height: 34, fontSize: 12 }}
                            onClick={() => {
                              setEditingItem(null);
                              setShowExpenseForm(true);
                            }}
                          >
                            Ghi phí
                          </BrandButton>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                          {[
                            { label: "Tất cả", value: "ALL", count: stats.countByFilter.ALL },
                            { label: "Quá hạn", value: "OVERDUE", count: stats.countByFilter.OVERDUE },
                            { label: "Trong 30 ngày", value: "30_DAYS", count: stats.countByFilter.DAYS_30 },
                            { label: "30-60 ngày", value: "30_60_DAYS", count: stats.countByFilter.DAYS_30_60 },
                            { label: "> 60 ngày", value: "OVER_60_DAYS", count: stats.countByFilter.OVER_60 },
                          ].map((pill, i) => (
                            <button 
                              key={i} 
                              onClick={() => setDaysFilter(pill.value)}
                              className={cn(
                                "btn btn-sm rounded-pill px-3 py-1 fw-bold d-flex align-items-center gap-2",
                                daysFilter === pill.value ? "btn-success" : "btn-light text-muted border"
                              )}
                              style={{ fontSize: 11 }}
                            >
                              {pill.label}
                              <span 
                                className={cn("rounded-pill px-1.5 d-flex align-items-center justify-content-center", daysFilter === pill.value ? "bg-white text-success" : "bg-secondary-subtle")} 
                                style={{ fontSize: 10, minWidth: 20, height: 18, lineHeight: 1 }}
                              >
                                {pill.count}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="position-relative flex-grow-1">
                            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                            <input 
                              type="text" 
                              className="form-control form-control-sm ps-5 rounded-pill border-light bg-light"
                              placeholder={
                                currentStepId === "RECEIVABLE" ? "Tìm khách hàng, số điện thoại..." : "Tìm nhà cung cấp, số hóa đơn..."
                              }
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              style={{ fontSize: 11.5, height: 34 }}
                            />
                          </div>
                          <FilterSelect 
                            options={[
                              { label: "Trạng thái", value: "" },
                              ...STATUS_OPTIONS
                            ]} 
                            value={status} 
                            onChange={setStatus} 
                            width={150}
                            className="rounded-pill"
                          />
                          <BrandButton 
                            icon="bi-plus-lg" 
                            className="rounded-pill px-4" 
                            style={{ height: 34, fontSize: 12 }}
                            onClick={() => {
                              setEditingItem(null);
                              setShowDebtForm(true);
                            }}
                          >
                            Thêm
                          </BrandButton>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-grow-1 overflow-auto">
                  {(() => {
                    if (debts.length === 0) return (
                      <Table columns={columns} rows={[]} loading={loading} emptyText={currentStepId === "EXPENSE" ? "Không tìm thấy khoản chi nào" : "Không tìm thấy khoản công nợ nào"} />
                    );

                    const totalAmount = debts.reduce((sum, d) => sum + d.amount, 0);
                    const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
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
                    } as any, ...debts];

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
                          const isCollapsed = collapsedMonths.includes(monthStr);
                          
                          if (monthStr !== lastMonth) {
                            grouped.push({
                              id: `HEADER_${monthStr}`,
                              isFullWidth: true,
                              fullWidthContent: (
                                <div 
                                  className="d-flex align-items-center justify-content-between w-100 cursor-pointer"
                                  onClick={() => setCollapsedMonths(prev => 
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
                      />
                    );
                  })()}
                </div>

                <div className="mt-3 pt-3 border-top">
                  <Pagination 
                    page={1} 
                    totalPages={1} 
                    onChange={() => {}} 
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3 shadow-sm border p-3 flex-grow-1 d-flex flex-column overflow-hidden h-100">
            {/* Logic cho LOAN (Step 3) giữ nguyên */}
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="position-relative flex-grow-1">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <input 
                  type="text" 
                  className="form-control form-control-sm ps-5 rounded-pill border-light bg-light"
                  placeholder="Tìm gói vay, ngân hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: 11.5, height: 34 }}
                />
              </div>
              <FilterSelect 
                options={[
                  { label: "Trạng thái", value: "" },
                  ...STATUS_OPTIONS
                ]} 
                value={status} 
                onChange={setStatus} 
                width={150}
                className="rounded-pill"
              />
              <BrandButton 
                icon="bi-plus-lg" 
                className="rounded-pill px-4" 
                style={{ height: 34, fontSize: 12 }}
                onClick={() => {
                  setEditingItem(null);
                  setShowDebtForm(true);
                }}
              >
                Thêm
              </BrandButton>
            </div>

            <div className="flex-grow-1 overflow-auto">
              <Table 
                columns={columns} 
                rows={debts} 
                loading={loading}
                emptyText="Không tìm thấy khoản nợ vay nào"
                compact={true}
              />
            </div>

            <div className="mt-3 pt-3 border-top">
              <Pagination 
                page={1} 
                totalPages={1} 
                onChange={() => {}} 
              />
            </div>
          </div>
        )}
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

    <DebtFormOffcanvas
      open={showDebtForm}
      onClose={() => setShowDebtForm(false)}
      onSuccess={fetchDebts}
      type={currentStepId as any}
      initialData={editingItem}
    />

    <ExpenseFormOffcanvas
      open={showExpenseForm}
      onClose={() => setShowExpenseForm(false)}
      onSuccess={fetchDebts}
      initialData={editingItem}
    />
  </>
  );
}
