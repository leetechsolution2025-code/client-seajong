"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DynamicTicker } from "@/components/layout/DynamicTicker";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TableColumn } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { BaoGiaSanitaryModal } from "@/components/plan-finance/bao_gia/BaoGiaSanitaryModal";
import { TaoDonHangModal } from "@/components/plan-finance/bao_gia/TaoDonHangModal";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CustomerRow {
  id: string;
  code?: string;
  name: string;
  nhom: string | null;
  nguon: string | null;
  loai: string | null;
  dienThoai: string | null;
  email: string | null;
  address: string | null;
  daiDien: string | null;
  xungHo: string | null;
  chucVu: string | null;
  ghiChu: string | null;
  createdAt: string;
  formValues?: string;
  contracts?: { giaTriHopDong: number, trangThai: string, code?: string, ngayKy?: string | Date }[];
}

export default function SalesCustomersPage() {
  // States for filters and query
  const [nguonFilter, setNguonFilter] = useState("");
  const [hangFilter, setHangFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // States for table data
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [showDetailOffcanvas, setShowDetailOffcanvas] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [baoGiaModalOpen, setBaoGiaModalOpen] = useState(false);
  const [donHangModalOpen, setDonHangModalOpen] = useState(false);

  // Transaction history states
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [editForm, setEditForm] = useState<{
    name: string;
    nhom: string;
    nguon: string;
    loai: string;
    dienThoai: string;
    email: string;
    address: string;
    daiDien: string;
    xungHo: string;
    chucVu: string;
    ghiChu: string;
    hanMucCongNo: number | "";
  }>({
    name: "",
    nhom: "",
    nguon: "",
    loai: "",
    dienThoai: "",
    email: "",
    address: "",
    daiDien: "",
    xungHo: "Anh",
    chucVu: "",
    ghiChu: "",
    hanMucCongNo: 0,
  });

  const currentMonthStr = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({
    [currentMonthStr]: true
  });

  const [showMonthDetailOffcanvas, setShowMonthDetailOffcanvas] = useState(false);
  const [selectedMonthStr, setSelectedMonthStr] = useState("");
  const [selectedOrderCode, setSelectedOrderCode] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    const docEl = document.getElementById("print-doc");
    if (!docEl) return;
    
    setIsExportingPDF(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      
      const opt: any = {
        margin: 15, 
        filename: `Bao_cao_dai_ly_${selectedCustomer?.code || selectedCustomer?.name || "BaoCao"}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      await html2pdf().set(opt).from(docEl).save();
    } catch (e) {
      console.error(e);
      alert("Lỗi khi xuất PDF!");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const formatNumberString = (value: string | number): string => {
    if (value === undefined || value === null || value === "") return "";
    const str = String(value).replace(/\D/g, "");
    if (!str) return "";
    const num = parseInt(str, 10);
    return num.toLocaleString("vi-VN");
  };

  // Static options lists

  const nguonOptions = [
    { label: "Tự nhiên", value: "tu-nhien" },
    { label: "Giới thiệu", value: "gioi-thieu" },
    { label: "Quảng cáo", value: "quang-cao" },
    { label: "Khác", value: "khac" }
  ];

  const hangOptions = [
    { label: "Kim cương", value: "kim-cuong" },
    { label: "Vàng", value: "vang" },
    { label: "Bạc", value: "bac" }
  ];

  // Fetch customers from API
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (searchQuery) params.set("search", searchQuery);
      if (nguonFilter) params.set("nguon", nguonFilter);
      params.set("nhom", "dai-ly"); // Chỉ hiển thị đại lý (những khách đã ký hợp đồng)
      if (hangFilter) params.set("loai", hangFilter);
      const res = await fetch(`/api/plan-finance/customers?${params}`);
      const data = await res.json();
      const fetched = data.customers ?? [];
      setCustomers(fetched);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
      if (fetched.length > 0) {
        // Do not automatically select customer and open offcanvas on load to prevent annoyance
        // setSelectedCustomer(fetched[0]);
      } else {
        setSelectedCustomer(null);
      }
    } catch (err) {
      console.error("Lỗi fetch khách hàng:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, nguonFilter, hangFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page to 1 when filters or query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, nguonFilter, hangFilter]);

  // Fetch transaction history
  useEffect(() => {
    if (!selectedCustomer?.id) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    fetch(`/api/plan-finance/customers/${selectedCustomer.id}`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.saleOrders || []);
        setSelectedCustomer(prev => prev && prev.id === data.id ? { ...prev, ...data } : prev);
      })
      .catch((err) => {
        console.error("Lỗi fetch lịch sử giao dịch:", err);
        setOrders([]);
      })
      .finally(() => {
        setOrdersLoading(false);
      });
  }, [selectedCustomer?.id]);

  const handleOpenCreate = () => {
    setEditForm({
      name: "",
      nhom: "ca-nhan",
      nguon: "tu-nhien",
      loai: "bac",
      dienThoai: "",
      email: "",
      address: "",
      daiDien: "",
      xungHo: "Anh",
      chucVu: "",
      ghiChu: "",
      hanMucCongNo: 0,
    });
    setIsCreateMode(true);
    setErrorMsg("");
    setEditModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedCustomer) return;
    setEditForm({
      name: selectedCustomer.name || "",
      nhom: selectedCustomer.nhom || "",
      nguon: selectedCustomer.nguon || "",
      loai: selectedCustomer.loai || "",
      dienThoai: selectedCustomer.dienThoai || "",
      email: selectedCustomer.email || "",
      address: selectedCustomer.address || "",
      daiDien: selectedCustomer.daiDien || "",
      xungHo: selectedCustomer.xungHo || "Anh",
      chucVu: selectedCustomer.chucVu || "",
      ghiChu: selectedCustomer.ghiChu || "",
      hanMucCongNo: (selectedCustomer as any).creditLimit || 0,
    });
    setIsCreateMode(false);
    setErrorMsg("");
    setEditModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const url = isCreateMode ? "/api/plan-finance/customers" : `/api/plan-finance/customers/${selectedCustomer?.id}`;
      const method = isCreateMode ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          nhom: editForm.nhom || null,
          nguon: editForm.nguon || null,
          loai: editForm.loai || null,
          dienThoai: editForm.dienThoai || null,
          email: editForm.email || null,
          address: editForm.address || null,
          daiDien: editForm.daiDien || null,
          xungHo: editForm.xungHo,
          chucVu: editForm.chucVu || null,
          ghiChu: editForm.ghiChu || null,
          hanMucCongNo: editForm.hanMucCongNo === "" ? 0 : Number(editForm.hanMucCongNo),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? (isCreateMode ? "Lỗi thêm mới" : "Lỗi cập nhật"));
      }

      const resultData = await res.json();

      if (isCreateMode) {
        const newCustomer = {
          ...resultData,
          creditLimit: resultData.hanMucCongNo ?? 0,
          outstandingDebt: 0,
        };
        setCustomers(prev => [newCustomer, ...prev]);
        setSelectedCustomer(newCustomer);
      } else {
        if (!selectedCustomer) return;
        const updatedCustomer = {
          ...selectedCustomer,
          ...resultData,
          creditLimit: resultData.hanMucCongNo ?? resultData.creditLimit ?? (editForm.hanMucCongNo === "" ? 0 : Number(editForm.hanMucCongNo)),
        };
        setSelectedCustomer(updatedCustomer);
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? updatedCustomer : c));
      }

      setEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Lỗi không xác định");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/plan-finance/customers/${selectedCustomer.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Lỗi xóa khách hàng");
      }
      // Remove deleted customer from lists
      setCustomers(prev => prev.filter(c => c.id !== selectedCustomer.id));
      setSelectedCustomer(null);
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Lỗi xóa khách hàng");
    } finally {
      setSubmitting(false);
    }
  };

  // Table Columns Definition
  const columns: TableColumn<CustomerRow>[] = [
    {
      header: "STT",
      align: "center",
      width: 60,
      render: (row, idx) => (page - 1) * 10 + idx + 1
    },
    {
      header: "Tên khách hàng",
      render: (row) => {
        let actualAddress = row.address;
        if (!actualAddress && row.formValues) {
          try {
            const parsed = JSON.parse(row.formValues);
            actualAddress = parsed.detailBusinessAddress || parsed.address || "";
          } catch (e) { }
        }
        return (
          <div className="d-flex flex-column">
            <span className="fw-bold text-dark">{row.name}</span>
            {actualAddress && (
              <span className="text-muted" style={{ fontSize: "11px" }}>
                <i className="bi bi-geo-alt me-1" />{actualAddress}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Thông tin liên hệ",
      render: (row) => (
        <div className="d-flex flex-column" style={{ fontSize: "12.5px" }}>
          {row.daiDien && (
            <span className="text-dark fw-medium mb-1">
              <i className="bi bi-person-badge me-1 text-muted" style={{ fontSize: "11px" }} />
              {row.xungHo ? `${row.xungHo} ` : ""}{row.daiDien}
              {row.chucVu && <span className="text-muted ms-1 fw-normal">| {row.chucVu}</span>}
            </span>
          )}
          {row.dienThoai && (
            <span className="text-dark">
              <i className="bi bi-telephone me-1 text-muted" style={{ fontSize: "11px" }} />
              {row.dienThoai}
            </span>
          )}
          {row.email && (
            <span className="text-muted">
              <i className="bi bi-envelope me-1" style={{ fontSize: "11px" }} />
              {row.email}
            </span>
          )}
          {!row.daiDien && !row.dienThoai && !row.email && <span className="text-muted">—</span>}
        </div>
      )
    },
    {
      header: "Doanh số năm",
      width: 220,
      render: (row) => {
        const committed = (row as any).committedSales ?? 0;
        const actual = (row as any).yearlySales ?? 0;
        const percent = committed > 0 ? Math.round((actual / committed) * 100) : 0;

        return (
          <div className="d-grid gap-1 align-items-center" style={{ fontSize: "12.5px", gridTemplateColumns: "auto 1fr 35px" }}>
            <span className="text-muted" style={{ fontSize: "11px" }}>Cam kết:</span>
            <span className="fw-semibold text-primary text-end">{committed.toLocaleString("vi-VN")} ₫</span>
            <span></span>

            <span className="text-muted" style={{ fontSize: "11px" }}>Thực tế:</span>
            <span className="fw-bold text-success text-end">{actual.toLocaleString("vi-VN")} ₫</span>
            <div className="text-end ps-1">
              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-10" style={{ fontSize: "10px", padding: "2px 4px" }}>
                {percent}%
              </span>
            </div>
          </div>
        );
      }
    }
  ];

  // Ticker stats
  const totalAgents = customers.filter(c => c.nhom === "dai-ly").length;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const newAgents = customers.filter(c => {
    if (c.nhom !== "dai-ly") return false;
    const d = new Date(c.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const totalCommitted = customers.reduce((sum, c) => sum + ((c as any).committedSales ?? 0), 0);
  const totalActual = customers.reduce((sum, c) => sum + ((c as any).yearlySales ?? 0), 0);
  const percent = totalCommitted > 0 ? Math.round((totalActual / totalCommitted) * 100) : 0;

  const tickerNews = [
    { text: `• Tổng số đại lý: <strong>${totalAgents}</strong>`, type: 'text' },
    { text: `• Đại lý mới trong tháng: <strong>${newAgents}</strong>`, type: 'text' },
    { text: `• Tổng doanh số cam kết: <strong class="text-primary">${formatNumberString(totalCommitted)} ₫</strong>`, type: 'text' },
    {
      text: `• Tổng doanh số thực tế: <strong class="text-success">${formatNumberString(totalActual)} ₫</strong> <span class="badge bg-success bg-opacity-10 text-success ms-1 border border-success border-opacity-10">${percent}% cam kết</span>`,
      type: 'text'
    },
  ];

  const orderColumns: TableColumn<any>[] = [
    {
      header: "STT",
      align: "center",
      width: 60,
      render: (row, idx) => idx + 1
    },
    {
      header: "Số đơn hàng",
      render: (row) => (
        <div className="d-flex flex-column">
          <span className="fw-medium text-primary" style={{ fontSize: "12px" }}>{row.orderCode || "—"}</span>
          <span className="text-muted" style={{ fontSize: "10px" }}>
            {row.createdAt || "—"} | {row.createdBy || "—"}
          </span>
        </div>
      )
    },
    {
      header: "Giá trị",
      align: "right",
      render: (row) => <span className="fw-medium" style={{ fontSize: "12px" }}>{(row.totalAmount || 0).toLocaleString("vi-VN")} ₫</span>
    },
    {
      header: "Đã thanh toán",
      render: (row) => {
        const total = row.totalAmount || 0;
        const paid = row.paidAmount || 0;
        const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
        return (
          <div className="d-flex flex-column gap-1 w-100" style={{ minWidth: 120 }}>
            <span className="fw-medium text-dark" style={{ fontSize: "12px" }}>
              {paid.toLocaleString("vi-VN")} ₫
            </span>
            <div className="progress" style={{ height: "4px" }}>
              <div className="progress-bar bg-success" style={{ width: `${percent}%` }}></div>
            </div>
          </div>
        );
      }
    },
    {
      header: "Ghi chú",
      render: (row) => <span className="text-muted" style={{ fontSize: "11px" }}>{row.note || "—"}</span>
    }
  ];

  const formattedOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    return orders.map((o: any) => {
      let dateObj = null;
      if (o.ngayDat) dateObj = new Date(o.ngayDat);
      else if (o.createdAt) dateObj = new Date(o.createdAt);
      
      const dateStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN') : "N/A";
      const monthStr = dateObj && !isNaN(dateObj.getTime()) ? `Tháng ${dateObj.getMonth() + 1}/${dateObj.getFullYear()}` : "N/A";
      const timeStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : "";
      
      return {
        id: o.id,
        orderCode: o.code || String(o.id).slice(0, 8),
        totalAmount: o.tongTien || 0,
        paidAmount: o.daThanhToan || 0,
        note: o.trangThai === "approved" ? "Thanh toán đủ" : (o.trangThai || "Chưa thanh toán"),
        createdAt: `${dateStr} ${timeStr}`.trim(),
        createdBy: o.createdBy || "Hệ thống",
        month: monthStr
      };
    }).sort((a: any, b: any) => {
      const partsA = a.createdAt.split(' ')[0].split('/');
      const partsB = b.createdAt.split(' ')[0].split('/');
      if (partsA.length !== 3 || partsB.length !== 3) return 0;
      const dateA = partsA.reverse().join('');
      const dateB = partsB.reverse().join('');
      return dateB.localeCompare(dateA);
    });
  }, [orders]);

  const tableRows = useMemo(() => {
    const groups: Record<string, any[]> = {};
    formattedOrders.forEach(o => {
      if (!groups[o.month]) groups[o.month] = [];
      groups[o.month].push(o);
    });

    let annualCommitment = 0;
    if (selectedCustomer?.contracts?.length) {
      annualCommitment = selectedCustomer.contracts.reduce((sum, c) => sum + (c.giaTriHopDong || 0), 0);
    }
    const monthCommitment = annualCommitment > 0 ? (annualCommitment / 12) : 0;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthNum = currentDate.getMonth() + 1;

    const allMonths = [];
    for (let i = currentMonthNum; i >= 1; i--) {
      allMonths.push(`Tháng ${i}/${currentYear}`);
    }

    const rows: any[] = [];
    allMonths.forEach(month => {
      const isExpanded = expandedMonths[month];
      const monthOrders = groups[month] || [];
      const monthTotal = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const percent = monthCommitment > 0 ? Math.round((monthTotal / monthCommitment) * 100) : 0;

      rows.push({
        isFullWidth: true,
        fullWidthContent: (
          <div
            className="d-flex align-items-center gap-2 cursor-pointer w-100 px-2 py-1"
            onClick={() => setExpandedMonths(p => ({ ...p, [month]: !p[month] }))}
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            <i className={isExpanded ? "bi bi-chevron-down" : "bi bi-chevron-right"} style={{ fontSize: "14px", width: "16px", color: "#011F58" }} />
            <span className="fw-bold" style={{ minWidth: "90px", color: "#011F58" }}>{month}</span>
            <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill ms-2">{monthOrders.length} đơn</span>
            <span className="text-muted ms-auto d-flex align-items-center" style={{ fontSize: "12px" }}>
              Tổng giá trị: <strong className="text-dark ms-1">{monthTotal.toLocaleString("vi-VN")} ₫</strong>
              <span className={`badge mx-1 ${percent >= 100 ? "bg-success bg-opacity-10 text-success border border-success border-opacity-10" : "bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10"}`}>
                {percent}% | {Math.round(monthCommitment).toLocaleString("vi-VN")} ₫
              </span>
            </span>
            <button
              className="btn btn-sm btn-light border-0 d-flex align-items-center justify-content-center p-0 rounded-circle"
              style={{ width: "24px", height: "24px", color: "var(--bs-gray-600)" }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMonthStr(month);
                const monthOrders = formattedOrders.filter(o => o.month === month);
                if (monthOrders.length > 0) {
                  setSelectedOrderCode(monthOrders[0].orderCode);
                } else {
                  setSelectedOrderCode("");
                }
                setShowMonthDetailOffcanvas(true);
              }}
            >
              <i className="bi bi-three-dots"></i>
            </button>
          </div>
        )
      });
      if (isExpanded && monthOrders.length > 0) {
        rows.push(...monthOrders);
      }
    });
    return rows;
  }, [expandedMonths, selectedCustomer]);

  // Real-time rank evaluation and auto-update
  useEffect(() => {
    if (!selectedCustomer || !selectedCustomer.id || ordersLoading) return;

    const currentOrders = formattedOrders;
    if (!currentOrders || currentOrders.length === 0) return;

    const fv = selectedCustomer.formValues ? (() => {
      try { return JSON.parse(selectedCustomer.formValues); }
      catch { return {}; }
    })() : {};

    let annualCommitment = 0;
    if (selectedCustomer.contracts && selectedCustomer.contracts.length > 0) {
      annualCommitment = selectedCustomer.contracts.reduce((sum: number, c: any) => sum + (c.giaTriHopDong || 0), 0);
    } else {
      annualCommitment = Number(fv.bbDoanhSoNam || fv.hdDoanhSoNam) || 0;
    }

    if (annualCommitment <= 0) return;

    const currentYear = new Date().getFullYear();
    const ytdOrders = currentOrders.filter((o: any) => {
      if (!o.createdAt) return false;
      if (typeof o.createdAt === "string" && o.createdAt.includes("/")) {
        const parts = o.createdAt.split("/");
        if (parts.length === 3) {
          return parseInt(parts[2].split(" ")[0]) === currentYear;
        }
      } else {
        const d = new Date(o.createdAt);
        if (!isNaN(d.getTime())) return d.getFullYear() === currentYear;
      }
      return false;
    });

    const totalSales = ytdOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || o.tongTien || 0), 0);
    const percent = (totalSales / annualCommitment) * 100;

    let evaluatedRank = "bac";
    if (percent >= 100) {
      evaluatedRank = "kim-cuong";
    } else if (percent >= 70) {
      evaluatedRank = "vang";
    }

    if (selectedCustomer.loai !== evaluatedRank) {
      fetch(`/api/plan-finance/customers/${selectedCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loai: evaluatedRank }),
      })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setSelectedCustomer(prev => prev ? { ...prev, loai: evaluatedRank } : prev);
          setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, loai: evaluatedRank } : c));
        }
      })
      .catch(err => console.error("Lỗi tự động cập nhật hạng đại lý:", err));
    }
  }, [selectedCustomer?.id, orders, ordersLoading, formattedOrders]);


  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Danh sách đại lý"
        description="Danh sách đại lý và các chỉ tiêu doanh số"
        color="blue"
        icon="bi-people"
      />
      <DynamicTicker pageTitle="Danh sách đại lý" customNews={tickerNews} />
      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column flex-lg-row overflow-hidden" style={{ minHeight: 0 }}>
          {/* Cột chính - full width */}
          <div className="col-12 d-flex flex-column p-4" style={{ minHeight: 0 }}>

            {/* Tiêu đề vùng */}
            <SectionTitle title="Danh sách đại lý" />

            {/* Thanh công cụ Toolbar */}
            <div className="d-flex align-items-center gap-2 mb-3">
              <FilterSelect
                options={nguonOptions}
                value={nguonFilter}
                onChange={setNguonFilter}
                placeholder="Nguồn"
                width={120}
              />
              <FilterSelect
                options={hangOptions}
                value={hangFilter}
                onChange={setHangFilter}
                placeholder="Hạng"
                width={120}
              />
              <div className="flex-grow-1">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Tìm kiếm đại lý..."
                />
              </div>
              <button
                onClick={handleOpenCreate}
                className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                style={{
                  height: 34,
                  padding: "0 14px",
                  backgroundColor: "var(--primary)",
                  borderColor: "var(--primary)",
                  borderRadius: 8
                }}
              >
                <i className="bi bi-plus-lg" />
                Thêm mới
              </button>
            </div>

            {/* Bảng danh sách khách hàng */}
            <div className="flex-grow-1" style={{ minHeight: 0, position: "relative" }}>
              <Table
                columns={columns}
                rows={customers}
                loading={loading}
                rowKey={(row) => row.id}
                emptyText="Không tìm thấy đại lý nào"
                compact
                onRowClick={(row) => {
                  setSelectedCustomer(row);
                  setShowDetailOffcanvas(true);
                }}
                wrapperStyle={{ height: "100%", overflowY: "auto" }}
              />
            </div>

            {/* Điều hướng phân trang */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-end mt-3 flex-shrink-0">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Chi tiết đại lý (Fullscreen) */}
      {showDetailOffcanvas && selectedCustomer && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
          <div className="modal-dialog modal-fullscreen">
            <div className="modal-content">
              <div className="modal-header border-bottom py-3 px-4 bg-light">
                <h5 className="modal-title fw-bold text-dark mb-0 fs-6 d-flex align-items-center">
                  <i className="bi bi-person-lines-fill me-2 text-primary fs-5" />
                  Hồ sơ chi tiết đại lý
                </h5>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowDetailOffcanvas(false)}></button>
              </div>

              <div className="modal-body p-3 bg-white" style={{ overflowY: "auto" }}>
                <div className="container-fluid h-100 px-0">
                  <div className="row g-3 h-100">
                    {/* Cột trái */}
                    <div className="col-12 col-lg-4 d-flex flex-column gap-3">
                      <div className="bg-card rounded-4 shadow-sm border p-3">
                        <SectionTitle title="Thông tin chung" />
                        {(() => {
                          const fv = selectedCustomer.formValues ? (() => {
                            try { return JSON.parse(selectedCustomer.formValues); }
                            catch { return {}; }
                          })() : {};

                          let displayAddress = selectedCustomer.address || fv.detailBusinessAddress || "—";
                          let displayPhone = selectedCustomer.dienThoai || fv.phone || "—";
                          let displayDaiDien = selectedCustomer.daiDien || "—";

                          if (displayDaiDien === "—" && fv.contact) {
                            const parts = String(fv.contact).split("-").map(p => p.trim());
                            displayDaiDien = parts[0] || "—";
                            if (displayPhone === "—" && parts.length > 1) {
                              displayPhone = parts[1];
                            }
                          }

                          let displayLoai = selectedCustomer.loai || fv.scale || "—";

                          return (
                            <div className="mt-3 d-flex flex-column gap-2" style={{ fontSize: "13px" }}>
                              <div>
                                <span className="text-muted d-block fw-bold" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>TÊN ĐẠI LÝ</span>
                                <strong className="text-primary" style={{ fontSize: "15px" }}>{selectedCustomer.name}</strong>
                              </div>
                              <div className="row g-2 mt-1">
                                <div className="col-6">
                                  <span className="text-muted d-block fw-bold" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>SỐ ĐIỆN THOẠI</span>
                                  <span className="text-dark fw-medium">{displayPhone}</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted d-block fw-bold" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>NGƯỜI ĐẠI DIỆN</span>
                                  <span className="text-dark fw-medium">{displayDaiDien}</span>
                                </div>
                                <div className="col-12">
                                  <span className="text-muted d-block fw-bold" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>ĐỊA CHỈ</span>
                                  <span className="text-dark fw-medium">{displayAddress}</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted d-block fw-bold" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>HẠNG KHÁCH HÀNG</span>
                                  <span className="text-dark fw-medium text-capitalize">
                                    {displayLoai !== "—" ? displayLoai.replace("-", " ") : "—"}
                                  </span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted d-block fw-bold" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>NGUỒN KHÁCH HÀNG</span>
                                  <span className="text-dark fw-medium text-capitalize">
                                    {selectedCustomer.nguon ? selectedCustomer.nguon.replace("-", " ") : "—"}
                                  </span>
                                </div>
                                <div className="col-12 mt-2">
                                  <span className="text-muted d-block fw-bold mb-1" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>DOANH SỐ NĂM</span>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-dark fw-bold text-primary" style={{ fontSize: "15px" }}>
                                      {formattedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString("vi-VN")} ₫
                                    </span>
                                    {(() => {
                                      const annualCommitment = (selectedCustomer.contracts || []).reduce((sum, c) => sum + (c.giaTriHopDong || 0), 0);
                                      const totalSales = formattedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                                      const percent = annualCommitment > 0 ? Math.round((totalSales / annualCommitment) * 100) : 0;
                                      return (
                                        <span className="badge border fw-medium px-2 py-1" style={{ color: "#011F58", backgroundColor: "#f8f9fa", fontSize: "11px" }}>
                                          Đạt {percent}% | Cam kết: {annualCommitment.toLocaleString("vi-VN")} ₫
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <div className="col-12 mt-2">
                                  <span className="text-muted d-block fw-bold mb-1" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>DOANH THU NĂM</span>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-dark fw-bold text-success" style={{ fontSize: "15px" }}>
                                      {formattedOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0).toLocaleString("vi-VN")} ₫
                                    </span>
                                    {(() => {
                                      const totalSales = formattedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                                      const totalPaid = formattedOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
                                      const percent = totalSales > 0 ? Math.round((totalPaid / totalSales) * 100) : 0;
                                      return (
                                        <span className="badge border fw-medium px-2 py-1 text-success bg-success bg-opacity-10 border-success border-opacity-25" style={{ fontSize: "11px" }}>
                                          Tỷ lệ thu: {percent}% doanh số
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="bg-card rounded-4 shadow-sm border p-3 flex-grow-1">
                        <SectionTitle title="Diễn biến doanh số năm" />
                        {(() => {
                          const currentMonth = new Date().getMonth() + 1;
                          const monthlyData = new Array(12).fill(null);
                          const monthlyPaidData = new Array(12).fill(null);
                          for (let i = 0; i < currentMonth; i++) {
                            monthlyData[i] = 0;
                            monthlyPaidData[i] = 0;
                          }

                          formattedOrders.forEach(o => {
                            const mMatch = o.month.match(/Tháng (\d+)/);
                            if (mMatch && mMatch[1]) {
                              const m = parseInt(mMatch[1]);
                              if (m >= 1 && m <= currentMonth) {
                                monthlyData[m - 1] += (o.totalAmount || 0);
                                monthlyPaidData[m - 1] += (o.paidAmount || 0);
                              }
                            }
                          });

                          const categories = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);

                          const chartOptions: any = {
                            chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit" },
                            colors: ["#011F58", "#dc3545"],
                            stroke: { curve: "smooth", width: [0, 2] },
                            fill: { type: "solid", opacity: [1, 0.1] },
                            plotOptions: { bar: { borderRadius: 2, columnWidth: "60%" } },
                            dataLabels: { enabled: false },
                            xaxis: {
                              categories: categories,
                              labels: { style: { fontSize: "10px" } },
                              axisBorder: { show: false },
                              axisTicks: { show: false },
                              tooltip: { enabled: false }
                            },
                            yaxis: {
                              labels: {
                                formatter: (val: number) => {
                                  if (val >= 1000000) return (val / 1000000) + "tr";
                                  return val.toLocaleString();
                                },
                                style: { fontSize: "10px" }
                              },
                            },
                            grid: { borderColor: "#f1f1f1", strokeDashArray: 3, padding: { left: 0, right: 0, top: 0, bottom: 0 } },
                            tooltip: {
                              shared: true,
                              intersect: false,
                              y: {
                                formatter: (val: number) => val.toLocaleString("vi-VN") + " ₫"
                              }
                            }
                          };
                          const chartSeries = [
                            { name: "Doanh số", type: "bar", data: monthlyData },
                            { name: "Doanh thu", type: "area", data: monthlyPaidData }
                          ];
                          return (
                            <div className="mt-3" style={{ height: "250px" }}>
                              <Chart options={chartOptions} series={chartSeries} type="line" height="100%" width="100%" />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Cột phải */}
                    <div className="col-12 col-lg-8">
                      <div className="bg-card rounded-4 shadow-sm border p-3 h-100 d-flex flex-column">
                        <SectionTitle title="Dữ liệu hoạt động của đại lý" />
                        <div className="flex-grow-1 mt-3" style={{ minHeight: 0 }}>
                          <Table
                            columns={orderColumns}
                            rows={tableRows}
                            emptyText="Chưa có dữ liệu hoạt động"
                            compact
                            cellStyle={() => ({ padding: "4px 12px" })}
                            wrapperStyle={{ height: "100%", overflowY: "auto" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top p-3 d-flex align-items-center justify-content-start gap-2 bg-light">
                <button
                  onClick={() => setBaoGiaModalOpen(true)}
                  className="btn btn-outline-success d-flex align-items-center gap-2 px-4"
                  style={{ borderRadius: "8px", fontWeight: 500 }}
                >
                  <i className="bi bi-file-text" /> Báo giá
                </button>
                <button
                  type="button"
                  onClick={() => setDonHangModalOpen(true)}
                  className="btn btn-outline-success d-flex align-items-center gap-2 px-4"
                  style={{ borderRadius: "8px", fontWeight: 500 }}
                >
                  <i className="bi bi-cart3" /> Đơn hàng
                </button>

                <div className="ms-auto d-flex gap-2">
                  {/* Báo giá và Xoá tạm thời bị ẩn */}
                  <button
                    onClick={() => {
                      setShowPrintModal(true);
                      setShowDetailOffcanvas(false);
                    }}
                    className="btn btn-outline-primary d-flex align-items-center justify-content-center px-4"
                    style={{ borderRadius: "8px", fontWeight: 500 }}
                    title="In báo cáo hoạt động đại lý"
                  >
                    <i className="bi bi-printer me-2" /> Báo cáo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Form Modal */}
      {editModalOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 10050 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "550px" }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "16px", background: "var(--card)" }}>
              <div className="modal-header border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-3 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style={{ width: 34, height: 34 }}>
                    <i className={isCreateMode ? "bi bi-person-plus" : "bi bi-pencil-square"} style={{ fontSize: "16px" }} />
                  </div>
                  <div>
                    <h6 className="modal-title fw-bold text-dark mb-0">
                      {isCreateMode ? "Thêm mới khách hàng" : "Chỉnh sửa khách hàng"}
                    </h6>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      {isCreateMode ? "Thêm khách hàng mới vào hệ thống" : "Cập nhật thông tin chi tiết khách hàng"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setEditModalOpen(false)}
                />
              </div>
              <form onSubmit={handleSaveCustomer}>
                <div className="modal-body px-4 py-4" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto", fontSize: "13px" }}>
                  {errorMsg && (
                    <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: "12px", borderRadius: "8px" }}>
                      {errorMsg}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>TÊN KHÁCH HÀNG *</label>
                      <input
                        type="text"
                        required
                        className="form-control form-control-sm rounded-3 shadow-none border"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Nhập tên khách hàng"
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>NHÓM KHÁCH HÀNG</label>
                      <select
                        className="form-select form-select-sm rounded-3 shadow-none border"
                        value={editForm.nhom}
                        onChange={e => setEditForm({ ...editForm, nhom: e.target.value })}
                      >
                        <option value="ca-nhan">Cá nhân</option>
                        <option value="dai-ly">Đại lý</option>
                        <option value="loai-khac">Loại khác</option>
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>HẠNG KHÁCH HÀNG</label>
                      <select
                        className="form-select form-select-sm rounded-3 shadow-none border"
                        value={editForm.loai}
                        onChange={e => setEditForm({ ...editForm, loai: e.target.value })}
                      >
                        <option value="kim-cuong">Kim cương</option>
                        <option value="vang">Vàng</option>
                        <option value="bac">Bạc</option>
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>NGUỒN KHÁCH HÀNG</label>
                      <select
                        className="form-select form-select-sm rounded-3 shadow-none border"
                        value={editForm.nguon}
                        onChange={e => setEditForm({ ...editForm, nguon: e.target.value })}
                      >
                        <option value="tu-nhien">Tự nhiên</option>
                        <option value="gioi-thieu">Giới thiệu</option>
                        <option value="quang-cao">Quảng cáo</option>
                        <option value="khac">Khác</option>
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>HẠN MỨC CÔNG NỢ (VND)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-3 shadow-none border"
                        value={formatNumberString(editForm.hanMucCongNo)}
                        onChange={e => {
                          const rawValue = e.target.value.replace(/\D/g, "");
                          setEditForm({ ...editForm, hanMucCongNo: rawValue ? parseInt(rawValue, 10) : "" });
                        }}
                        placeholder="Nhập hạn mức công nợ"
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>SỐ ĐIỆN THOẠI</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-3 shadow-none border"
                        value={editForm.dienThoai}
                        onChange={e => setEditForm({ ...editForm, dienThoai: e.target.value })}
                        placeholder="Nhập số điện thoại"
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>EMAIL</label>
                      <input
                        type="email"
                        className="form-control form-control-sm rounded-3 shadow-none border"
                        value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="Nhập email"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>ĐỊA CHỈ</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-3 shadow-none border"
                        value={editForm.address}
                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                        placeholder="Nhập địa chỉ"
                      />
                    </div>

                    <div className="col-3">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>DANH XƯNG ĐẠI DIỆN</label>
                      <select
                        className="form-select form-select-sm rounded-3 shadow-none border"
                        value={editForm.xungHo}
                        onChange={e => setEditForm({ ...editForm, xungHo: e.target.value })}
                      >
                        <option value="Anh">Anh</option>
                        <option value="Chị">Chị</option>
                        <option value="Ông">Ông</option>
                        <option value="Bà">Bà</option>
                      </select>
                    </div>

                    <div className="col-5">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>NGƯỜI ĐẠI DIỆN</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-3 shadow-none border"
                        value={editForm.daiDien}
                        onChange={e => setEditForm({ ...editForm, daiDien: e.target.value })}
                        placeholder="Họ tên người đại diện"
                      />
                    </div>

                    <div className="col-4">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>CHỨC VỤ</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-3 shadow-none border"
                        value={editForm.chucVu}
                        onChange={e => setEditForm({ ...editForm, chucVu: e.target.value })}
                        placeholder="Chức vụ người đại diện"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: "11px" }}>GHI CHÚ</label>
                      <textarea
                        className="form-control form-control-sm rounded-3 shadow-none border"
                        rows={2}
                        value={editForm.ghiChu}
                        onChange={e => setEditForm({ ...editForm, ghiChu: e.target.value })}
                        placeholder="Ghi chú thêm..."
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top px-4 py-3 d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border fw-semibold rounded-3 px-3"
                    onClick={() => setEditModalOpen(false)}
                    disabled={submitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary fw-semibold rounded-3 px-3"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                    ) : null}
                    {isCreateMode ? "Thêm mới" : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {deleteConfirmOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 10050 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "400px" }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "16px", background: "var(--card)" }}>
              <div className="modal-body p-4 text-center">
                <div className="rounded-circle bg-danger bg-opacity-10 text-danger d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 54, height: 54 }}>
                  <i className="bi bi-exclamation-triangle" style={{ fontSize: "24px" }} />
                </div>
                <h5 className="fw-bold text-dark mb-2">Xóa khách hàng?</h5>
                <p className="text-secondary mb-4" style={{ fontSize: "13px" }}>
                  Bạn có chắc chắn muốn xóa khách hàng <strong>{selectedCustomer?.name}</strong>? Hành động này sẽ không thể hoàn tác và xóa sạch dữ liệu liên quan.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border fw-semibold rounded-3 px-4"
                    onClick={() => setDeleteConfirmOpen(false)}
                    disabled={submitting}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger fw-semibold rounded-3 px-4"
                    onClick={handleDeleteCustomer}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                    ) : null}
                    Đồng ý xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BaoGiaSanitaryModal
        open={baoGiaModalOpen}
        onClose={() => setBaoGiaModalOpen(false)}
        customer={selectedCustomer as any}
        type={selectedCustomer?.nhom === "ca-nhan" ? "retail" : "agency"}
        isDirectOrder={false}
        onSaved={() => {
          setBaoGiaModalOpen(false);
        }}
      />

      <TaoDonHangModal
        open={donHangModalOpen}
        onClose={() => setDonHangModalOpen(false)}
        customer={selectedCustomer as any}
        type={selectedCustomer?.nhom === "ca-nhan" ? "retail" : "agency"}
        onSaved={() => {
          setDonHangModalOpen(false);
          // Refresh transaction history orders list
          if (selectedCustomer?.id) {
            setOrdersLoading(true);
            fetch(`/api/plan-finance/customers/${selectedCustomer.id}`)
              .then((res) => res.json())
              .then((data) => {
                setOrders(data.saleOrders || []);
                setSelectedCustomer(prev => prev && prev.id === data.id ? { ...prev, ...data } : prev);
              })
              .catch((err) => {
                console.error("Lỗi fetch lịch sử giao dịch:", err);
              })
              .finally(() => {
                setOrdersLoading(false);
              });
          }
        }}
      />

      {showMonthDetailOffcanvas && (
        <>
          <div
            className="offcanvas-backdrop fade show"
            style={{ zIndex: 1055 }}
            onClick={() => setShowMonthDetailOffcanvas(false)}
          ></div>
          <div
            className="offcanvas offcanvas-end show border-start-0 shadow-lg"
            tabIndex={-1}
            style={{ width: "400px", zIndex: 1060 }}
          >
            <div className="offcanvas-header border-bottom bg-light py-3">
              <h5 className="offcanvas-title fw-bold text-dark fs-6 d-flex align-items-center">
                <i className="bi bi-info-circle me-2 text-primary"></i>
                Thông tin chi tiết
              </h5>
              <button
                type="button"
                className="btn-close shadow-none"
                onClick={() => setShowMonthDetailOffcanvas(false)}
              ></button>
            </div>
            <div className="offcanvas-body p-4 bg-white" style={{ overflowY: "auto" }}>
              {(() => {
                const monthOrders = formattedOrders.filter(o => o.month === selectedMonthStr);
                const monthTotal = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                const monthPaid = monthOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);

                // Lấy tổng doanh số thực tế trong năm và cam kết năm để tính thưởng
                const totalActualSales = formattedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                let annualCommitment = 0;
                if (selectedCustomer?.contracts?.length) {
                  annualCommitment = selectedCustomer.contracts.reduce((sum, c) => sum + (c.giaTriHopDong || 0), 0);
                }

                // Mức thưởng (Giá trị các mức thưởng được áp dụng theo công thức ở biên bản đã ký với đại lý)
                const paymentBonus = monthPaid * 0.12; // Thưởng thanh toán: 12% * Doanh số thanh toán đúng hạn

                let annualSalesBonus = 0; // Thưởng doanh số năm: 1.5% tổng doanh số thực tế (nếu đạt >= 100% cam kết)
                if (annualCommitment > 0 && totalActualSales >= annualCommitment) {
                  annualSalesBonus = totalActualSales * 0.015;
                }

                let annualOverSalesBonus = 0; // Thưởng vượt doanh số năm: 3% phần vượt chỉ tiêu
                if (annualCommitment > 0 && totalActualSales > annualCommitment) {
                  annualOverSalesBonus = (totalActualSales - annualCommitment) * 0.03;
                }

                // Mock danh sách hàng hoá cho đơn hàng được chọn
                const mockProducts = [
                  { id: 1, name: "Bàn cầu điện tử TOTO Neorest LS", sku: "CS911VT", qty: 2, price: 125000000, amount: 250000000 },
                  { id: 2, name: "Nắp rửa điện tử Washlet", sku: "TCF4911Z", qty: 1, price: 35000000, amount: 35000000 }
                ];

                return (
                  <div className="d-flex flex-column gap-4">
                    {/* Danh sách đơn hàng trong tháng */}
                    <div>
                      <label className="form-label fw-semibold text-dark" style={{ fontSize: "13px" }}>Danh sách đơn hàng trong tháng</label>
                      {monthOrders.length > 1 ? (
                        <select
                          className="form-select form-select-sm shadow-none border-secondary-subtle"
                          value={selectedOrderCode}
                          onChange={(e) => setSelectedOrderCode(e.target.value)}
                        >
                          {monthOrders.map(o => (
                            <option key={o.id} value={o.orderCode}>{o.orderCode} - {o.totalAmount.toLocaleString("vi-VN")} ₫</option>
                          ))}
                        </select>
                      ) : monthOrders.length === 1 ? (
                        <div>
                          <a href="#" className="text-primary fw-medium text-decoration-none d-inline-flex align-items-center gap-1" style={{ fontSize: "13px" }}>
                            <i className="bi bi-file-earmark-text"></i>
                            {monthOrders[0].orderCode} - {monthOrders[0].totalAmount.toLocaleString("vi-VN")} ₫
                          </a>
                        </div>
                      ) : (
                        <div className="text-muted bg-light p-2 rounded text-center border" style={{ fontSize: "12px" }}>
                          Không có đơn hàng nào trong tháng này.
                        </div>
                      )}
                    </div>

                    {/* Các chỉ số */}
                    <div className="bg-light rounded-4 p-3 border">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted" style={{ fontSize: "13px" }}>Tổng doanh số:</span>
                        <strong className="text-dark">{monthTotal.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted" style={{ fontSize: "13px" }}>Tổng doanh thu đúng hạn:</span>
                        <strong className="text-success">{monthPaid.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted" style={{ fontSize: "13px" }}>Mức thưởng thanh toán:</span>
                        <strong className="text-primary">{paymentBonus.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted" style={{ fontSize: "13px" }}>Mức thưởng doanh số năm:</span>
                        <strong className="text-primary">{annualSalesBonus.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted" style={{ fontSize: "13px" }}>Mức thưởng vượt DS năm:</span>
                        <strong className="text-primary">{annualOverSalesBonus.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                    </div>

                    {/* Danh sách hàng hoá thuộc đơn hàng xxx */}
                    {selectedOrderCode && (
                      <div>
                        <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2" style={{ fontSize: "13px" }}>
                          <i className="bi bi-box-seam text-muted"></i>
                          Danh sách hàng hoá thuộc {selectedOrderCode}
                        </h6>
                        <div className="table-responsive border rounded-3 bg-white">
                          <table className="table table-hover table-borderless align-middle mb-0" style={{ fontSize: "12px" }}>
                            <thead className="table-light border-bottom">
                              <tr>
                                <th className="fw-semibold text-muted py-2 ps-3">Tên hàng hoá</th>
                                <th className="fw-semibold text-muted py-2 text-center" style={{ width: "40px" }}>SL</th>
                                <th className="fw-semibold text-muted py-2 text-end pe-3" style={{ width: "90px" }}>Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mockProducts.map((p, idx) => (
                                <tr key={p.id} className={idx < mockProducts.length - 1 ? "border-bottom" : ""}>
                                  <td className="ps-3">
                                    <div className="text-truncate fw-medium text-dark" style={{ maxWidth: "180px" }} title={p.name}>{p.name}</div>
                                    <div className="mt-1">
                                      <span className="badge bg-secondary bg-opacity-10 text-secondary" style={{ fontSize: "10px" }}>{p.sku}</span>
                                    </div>
                                  </td>
                                  <td className="text-center text-muted">{p.qty}</td>
                                  <td className="text-end fw-semibold pe-3 text-dark text-nowrap">{p.amount.toLocaleString("vi-VN")} ₫</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Print Preview Modal */}
      {showPrintModal && (
        <PrintPreviewModal
          onClose={() => setShowPrintModal(false)}
          actions={(
            <>
              <button 
                className="btn btn-primary d-inline-flex align-items-center gap-2"
                onClick={() => printDocumentById("print-doc", "portrait", `Bao_cao_dai_ly_${selectedCustomer?.code || selectedCustomer?.name || ""}`)}
                style={{ height: 32, fontSize: 12.5, padding: "0 16px" }}
              >
                <i className="bi bi-printer" /> In báo cáo
              </button>
              <button 
                className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 bg-white"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                style={{ height: 32, fontSize: 12.5, padding: "0 16px" }}
              >
                {isExportingPDF ? (
                  <i className="bi bi-arrow-repeat spin" style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <i className="bi bi-file-earmark-pdf text-danger" />
                )}
                {isExportingPDF ? "Đang xuất..." : "Xuất PDF"}
              </button>
            </>
          )}
          title={`Báo cáo hoạt động đại lý - ${selectedCustomer?.name || ''}`}
          printMargins="20mm 20mm 20mm 25mm"
          document={(
            <div className="pdf-content-page" style={{ fontFamily: "var(--font-roboto-condensed), 'Roboto Condensed', sans-serif" }}>
              <div className="d-flex justify-content-between align-items-start mb-4 border-bottom pb-4">
                <div className="text-start d-flex align-items-center gap-2">
                  <img src="/logo.png" alt="Seajong Logo" style={{ height: "32px", objectFit: "contain" }} />
                  <div>
                    <p className="mb-0 fw-bold" style={{ fontSize: "12px" }}>CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM</p>
                    <p className="mb-0 fw-semibold" style={{ fontSize: "11px" }}>PHÒNG KINH DOANH</p>
                  </div>
                </div>
                <div className="text-end mt-2">
                  <h4 className="fw-bold mb-2" style={{ color: "#003087" }}>
                    BÁO CÁO<br />HOẠT ĐỘNG ĐẠI LÝ
                  </h4>
                  <p className="mb-2 text-muted" style={{ fontSize: "13px" }}>Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
                  {(() => {
                    const fv = selectedCustomer?.formValues ? (() => {
                      try { return JSON.parse(selectedCustomer.formValues); }
                      catch { return {}; }
                    })() : {};
                    const loai = selectedCustomer?.loai || fv.scale || "—";
                    const rankMap: Record<string, string> = { "kim-cuong": "Kim cương", "vang": "Vàng", "bac": "Bạc" };
                    const rankIconMap: Record<string, { icon: string, color: string }> = {
                      "kim-cuong": { icon: "bi-gem", color: "#0ea5e9" },
                      "vang": { icon: "bi-award-fill", color: "#f59e0b" },
                      "bac": { icon: "bi-award", color: "#64748b" }
                    };
                    if (loai && rankIconMap[loai]) {
                      const r = rankIconMap[loai];
                      return (
                        <div className="d-inline-flex align-items-center px-3 py-1 rounded-pill mt-1" style={{ backgroundColor: `${r.color}15`, border: `1px solid ${r.color}40` }}>
                          <i className={`bi ${r.icon} me-2`} style={{ color: r.color, fontSize: "16px" }}></i>
                          <span className="fw-bold text-uppercase" style={{ color: r.color, fontSize: "13px", letterSpacing: "0.5px" }}>Đại lý {rankMap[loai]}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div className="mb-4">
                <h5 className="fw-bold mb-3" style={{ color: "#003087", fontSize: "16px" }}>1. THÔNG TIN CHUNG</h5>

                {(() => {
                  const fv = selectedCustomer?.formValues ? (() => {
                    try { return JSON.parse(selectedCustomer.formValues); }
                    catch { return {}; }
                  })() : {};

                  const bonuses = Array.isArray(fv.bbBonuses) && fv.bbBonuses.length > 0
                    ? fv.bbBonuses
                    : [];

                  let annualCommitment = 0;
                  let displayHdCode = fv.hdCode || '---';
                  let displayHdDate = '---';

                  if (selectedCustomer && selectedCustomer.contracts && selectedCustomer.contracts.length > 0) {
                    const activeContracts = selectedCustomer.contracts;
                    annualCommitment = activeContracts.reduce((sum: number, c: any) => sum + (c.giaTriHopDong || 0), 0);
                    displayHdCode = activeContracts[0].code || displayHdCode;
                    if (activeContracts[0].ngayKy) {
                      displayHdDate = new Date(activeContracts[0].ngayKy).toLocaleDateString('vi-VN');
                    }
                  } else if (fv.bbDoanhSoNam || fv.hdDoanhSoNam) {
                    annualCommitment = Number(fv.bbDoanhSoNam || fv.hdDoanhSoNam) || 0;
                  }

                  let displayAddress = selectedCustomer?.address || fv.detailBusinessAddress || "—";
                  let displayPhone = selectedCustomer?.dienThoai || fv.phone || "—";
                  let displayDaiDien = selectedCustomer?.daiDien || "—";

                  if (displayDaiDien === "—" && fv.contact) {
                    const parts = String(fv.contact).split("-").map((p: string) => p.trim());
                    displayDaiDien = parts[0] || "—";
                    if (displayPhone === "—" && parts.length > 1) {
                      displayPhone = parts[1];
                    }
                  }

                  let displayLoai = selectedCustomer?.loai || fv.scale || "—";

                  return (
                    <>
                      <table className="table table-sm table-borderless mb-0">
                        <tbody>
                          <tr>
                            <td style={{ width: "20%", fontWeight: 600 }} className="ps-0 py-1">Tên đại lý:</td>
                            <td style={{ width: "30%" }} className="py-1">{selectedCustomer?.name}</td>
                            <td style={{ width: "20%", fontWeight: 600 }} className="py-1">Người đại diện:</td>
                            <td style={{ width: "30%" }} className="py-1">{displayDaiDien}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600 }} className="ps-0 py-1">Số điện thoại:</td>
                            <td className="py-1">{displayPhone}</td>
                            <td style={{ fontWeight: 600 }} className="py-1">Hạng đại lý:</td>
                            <td className="py-1 text-capitalize fw-semibold">
                              {displayLoai === "kim-cuong" ? "Kim cương" : displayLoai === "vang" ? "Vàng" : displayLoai === "bac" ? "Bạc" : "—"}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600 }} className="ps-0 py-1">Địa chỉ:</td>
                            <td colSpan={3} className="py-1">{displayAddress}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600 }} className="ps-0 py-1">Số hợp đồng:</td>
                            <td className="py-1">{displayHdCode}</td>
                            <td style={{ fontWeight: 600 }} className="py-1">Ngày ký:</td>
                            <td className="py-1">{displayHdDate}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600 }} className="ps-0 py-1">Cam kết doanh số năm:</td>
                            <td className="py-1 fw-bold text-danger">{annualCommitment > 0 ? annualCommitment.toLocaleString("vi-VN") + " ₫" : '---'}</td>
                            <td style={{ fontWeight: 600 }} className="py-1">Cam kết doanh số tháng:</td>
                            <td className="py-1 fw-bold text-primary">{annualCommitment > 0 ? Math.round(annualCommitment / 12).toLocaleString("vi-VN") + " ₫" : '---'}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="mt-3 p-3 rounded" style={{ backgroundColor: "rgba(0, 48, 135, 0.04)", border: "1px solid rgba(0, 48, 135, 0.1)" }}>
                        <p className="fw-bold mb-2" style={{ color: "#003087" }}>Chính sách & Công thức thưởng áp dụng:</p>
                        {bonuses.length > 0 ? (
                          <ul className="mb-0 ps-3">
                            {bonuses.map((b: any, i: number) => (
                              <li key={i} className="mb-2">
                                <strong>{b.title}:</strong> {b.desc} <br />
                                {b.formula && (
                                  <span className="text-muted" style={{ fontStyle: "italic", fontSize: "11.5px" }}>
                                    <i className="bi bi-arrow-return-right me-1" /> {b.formula}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mb-0 text-muted" style={{ fontStyle: "italic" }}>Chưa có dữ liệu biên bản chính sách.</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="mb-4">
                <h5 className="fw-bold mb-3" style={{ color: "#003087", fontSize: "16px" }}>2. TÌNH HÌNH HOẠT ĐỘNG CỦA ĐẠI LÝ NĂM {new Date().getFullYear()}</h5>

                {(() => {
                  const totalSales = formattedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

                  let annualCommitment = 0;
                  if (selectedCustomer && selectedCustomer.contracts && selectedCustomer.contracts.length > 0) {
                    annualCommitment = selectedCustomer.contracts.reduce((sum: number, c: any) => sum + (c.giaTriHopDong || 0), 0);
                  } else {
                    const fv = selectedCustomer?.formValues ? JSON.parse(selectedCustomer.formValues) : {};
                    annualCommitment = Number(fv.bbDoanhSoNam || fv.hdDoanhSoNam) || 0;
                  }

                  const percent = annualCommitment > 0 ? Math.round((totalSales / annualCommitment) * 100) : 0;
                  const isDat = annualCommitment > 0 && totalSales >= annualCommitment;
                  const latestDate = formattedOrders.length > 0 ? formattedOrders[0].createdAt.split(' ')[0] : new Date().toLocaleDateString('vi-VN');

                      const fv = selectedCustomer?.formValues ? JSON.parse(selectedCustomer.formValues) : {};
                      const bonuses = Array.isArray(fv.bbBonuses) ? fv.bbBonuses : [];
                      
                      const dsNamBonus = bonuses.find((b: any) => b.title?.toLowerCase().includes("doanh số năm") && !b.title?.toLowerCase().includes("vượt"));
                      let dsNamPercent = 0.015; // 1.5% default
                      if (dsNamBonus && dsNamBonus.formula) {
                        const match = dsNamBonus.formula.match(/Thưởng ([\d.]+)%/i) || dsNamBonus.formula.match(/([\d.]+)%/);
                        if (match) {
                          dsNamPercent = parseFloat(match[1]) / 100;
                        }
                      }
                      const thuongDsNam = isDat ? Math.round(totalSales * dsNamPercent) : 0;
                      
                      const vuotDsBonus = bonuses.find((b: any) => b.title?.toLowerCase().includes("vượt doanh số"));
                      let vuotDsPercent = 0.03; // 3% default
                      if (vuotDsBonus && vuotDsBonus.formula) {
                        const match = vuotDsBonus.formula.match(/Thưởng ([\d.]+)%/i) || vuotDsBonus.formula.match(/([\d.]+)%/);
                        if (match) {
                          vuotDsPercent = parseFloat(match[1]) / 100;
                        }
                      }
                      const vuotSales = isDat && totalSales > annualCommitment ? totalSales - annualCommitment : 0;
                      const thuongVuotDs = vuotSales > 0 ? Math.round(vuotSales * vuotDsPercent) : 0;

                      return (
                        <div className="mb-3">
                          <p className="mb-2" style={{ fontSize: "13px" }}>
                            Tổng doanh số năm tính đến ngày <strong>{latestDate}</strong> là <strong>{totalSales.toLocaleString('vi-VN')} ₫</strong>, chiếm <strong>{percent}%</strong> giá trị cam kết năm
                          </p>
                          <ul className="mb-4 ps-4" style={{ fontSize: "13px" }}>
                            <li>Mức thưởng doanh số năm: <strong>{isDat ? thuongDsNam.toLocaleString('vi-VN') + " ₫" : "0 ₫"}</strong> / <span className={isDat ? "text-success fw-bold" : "text-danger"}>{isDat ? "Đạt" : "Chưa đạt"}</span></li>
                            <li>Mức thưởng vượt doanh số năm: <strong>{vuotSales > 0 ? thuongVuotDs.toLocaleString('vi-VN') + " ₫" : "0 ₫"}</strong> / <span className={vuotSales > 0 ? "text-success fw-bold" : "text-danger"}>{vuotSales > 0 ? "Đạt" : "Chưa đạt"}</span></li>
                          </ul>
                        </div>
                      );
                })()}

                {(() => {
                  const currentMonth = new Date().getMonth() + 1;
                  const monthlyData = new Array(12).fill(null);
                  const monthlyPaidData = new Array(12).fill(null);
                  for (let i = 0; i < currentMonth; i++) {
                    monthlyData[i] = 0;
                    monthlyPaidData[i] = 0;
                  }

                  const groupedOrders: Record<number, any[]> = {};
                  for (let i = 1; i <= currentMonth; i++) {
                    groupedOrders[i] = [];
                  }

                  formattedOrders.forEach(o => {
                    const mMatch = o.month.match(/Tháng (\d+)/);
                    if (mMatch && mMatch[1]) {
                      const m = parseInt(mMatch[1]);
                      if (m >= 1 && m <= currentMonth) {
                        monthlyData[m - 1] += (o.totalAmount || 0);
                        monthlyPaidData[m - 1] += (o.paidAmount || 0);
                        groupedOrders[m].push(o);
                      }
                    }
                  });

                  const categories = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);

                  const chartOptions: any = {
                    chart: { type: "line", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit", animations: { enabled: false } },
                    colors: ["#011F58", "#dc3545"],
                    stroke: { curve: "smooth", width: [0, 2] },
                    fill: { type: "solid", opacity: [1, 0.1] },
                    plotOptions: { bar: { borderRadius: 2, columnWidth: "50%" } },
                    dataLabels: { enabled: false },
                    xaxis: { categories: categories, labels: { style: { fontSize: "10px" } }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
                    yaxis: { labels: { formatter: (val: number) => (val >= 1000000 ? (val / 1000000) + "tr" : val.toLocaleString()), style: { fontSize: "10px" } } },
                    grid: { borderColor: "#f1f1f1", strokeDashArray: 3, padding: { left: 0, right: 0, top: 0, bottom: 0 } },
                    tooltip: { enabled: false },
                    legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '11px' }
                  };
                  const chartSeries = [
                    { name: "Doanh số", type: "bar", data: monthlyData },
                    { name: "Doanh thu", type: "area", data: monthlyPaidData }
                  ];
                  return (
                    <>
                      <div style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                        <h6 className="fw-bold mb-2 text-uppercase" style={{ fontSize: "13px" }}>Biểu đồ doanh số và doanh thu 12 tháng</h6>
                        <div className="border rounded p-2 mb-4" style={{ height: "200px" }}>
                          <Chart options={chartOptions} series={chartSeries} type="line" height="100%" width="100%" />
                        </div>
                      </div>

                      <h6 className="fw-bold mb-2 text-uppercase mt-4" style={{ fontSize: "13px" }}>Bảng kê chi tiết đơn hàng</h6>
                      <table className="table table-bordered table-sm" style={{ fontSize: "12px" }}>
                        <thead className="table-light">
                          <tr>
                            <th className="text-center align-middle" style={{ width: "50px" }}>STT</th>
                            <th className="align-middle">Số đơn hàng</th>
                            <th className="text-end align-middle">Giá trị</th>
                            <th className="text-end align-middle">Đã thanh toán</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(groupedOrders).map(Number).reverse().map((monthNum) => {
                            const monthOrders = groupedOrders[monthNum];
                            const totalAmount = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                            return (
                              <React.Fragment key={monthNum}>
                                <tr className="bg-light">
                                  <td colSpan={4} className="fw-bold text-uppercase py-2" style={{ color: "#003087", fontSize: "11px" }}>
                                    Tháng {monthNum}/{new Date().getFullYear()}
                                    <span className="ms-2 badge bg-secondary text-white" style={{ fontSize: "9px" }}>{monthOrders.length} ĐƠN</span>
                                    {totalAmount > 0 && <span className="float-end fw-semibold text-dark">TỔNG GIÁ TRỊ: {totalAmount.toLocaleString('vi-VN')} ₫</span>}
                                  </td>
                                </tr>
                                {monthOrders.length > 0 ? monthOrders.map((order, idx) => (
                                  <tr key={order.id}>
                                    <td className="text-center align-middle">{idx + 1}</td>
                                    <td className="align-middle">
                                      <div className="fw-semibold" style={{ color: "#003087" }}>{order.orderCode}</div>
                                      <div className="text-muted" style={{ fontSize: "10px" }}>Ngày tạo: {order.createdAt}</div>
                                    </td>
                                    <td className="text-end align-middle fw-medium">{order.totalAmount.toLocaleString('vi-VN')} ₫</td>
                                    <td className="text-end align-middle fw-medium">
                                      <span className={order.paidAmount >= order.totalAmount ? "text-success" : "text-danger"}>
                                        {order.paidAmount.toLocaleString('vi-VN')} ₫
                                      </span>
                                    </td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td colSpan={4} className="text-center py-2 text-muted fst-italic" style={{ fontSize: "11px" }}>Không có đơn hàng nào</td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>

              <div className="mb-4">
                <h5 className="fw-bold mb-3" style={{ color: "#003087", fontSize: "16px" }}>3. KẾT QUẢ MỨC THƯỞNG THANH TOÁN CỦA CÁC THÁNG TRONG NĂM {new Date().getFullYear()}</h5>
                <table className="table table-bordered table-sm" style={{ fontSize: "12px" }}>
                  <thead className="table-light">
                    <tr>
                      <th className="text-center align-middle" style={{ width: "50px" }}>STT</th>
                      <th className="align-middle text-center">Tháng</th>
                      <th className="text-end align-middle">Giá trị thanh toán</th>
                      <th className="text-center align-middle">Đúng hạn</th>
                      <th className="text-end align-middle">Mức thưởng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const fv = selectedCustomer?.formValues ? JSON.parse(selectedCustomer.formValues) : {};
                      const bonuses = Array.isArray(fv.bbBonuses) ? fv.bbBonuses : [];
                      const thanhToanBonus = bonuses.find((b: any) => b.title?.toLowerCase().includes("thanh toán"));
                      let bonusPercent = 0.02; // default 2%
                      if (thanhToanBonus && thanhToanBonus.formula) {
                        const match = thanhToanBonus.formula.match(/([\d.]+)%/);
                        if (match) {
                          bonusPercent = parseFloat(match[1]) / 100;
                        }
                      }

                      const currentMonth = new Date().getMonth() + 1;
                      const rows = [];
                      for (let i = 1; i <= currentMonth; i++) {
                        const monthOrders = formattedOrders.filter(o => {
                          const parts = o.createdAt.split(" ");
                          if (parts.length > 0) {
                            const dateParts = parts[0].split("/");
                            if (dateParts.length === 3) {
                              return parseInt(dateParts[1], 10) === i;
                            }
                          }
                          return false;
                        });
                        const totalPaid = monthOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
                        const onTimeAmount = totalPaid; // Simulated
                        // Calculated based on 'Chưa VAT' using typical 10% VAT deduction (amount / 1.1)
                        const bonusAmount = Math.round((onTimeAmount / 1.1) * bonusPercent);

                        rows.push(
                          <tr key={i}>
                            <td className="text-center align-middle">{i}</td>
                            <td className="text-center align-middle fw-medium">Tháng {i}</td>
                            <td className="text-end align-middle fw-medium text-success">{totalPaid.toLocaleString('vi-VN')} ₫</td>
                            <td className="text-end align-middle text-success fw-bold">
                              {onTimeAmount > 0 ? onTimeAmount.toLocaleString('vi-VN') + " ₫" : <span className="text-muted fw-normal">---</span>}
                            </td>
                            <td className="text-end align-middle fw-medium text-danger">
                              {bonusAmount > 0 ? bonusAmount.toLocaleString('vi-VN') + " ₫" : "0 ₫"}
                            </td>
                          </tr>
                        );
                      }
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="mb-4">
                <h5 className="fw-bold mb-3" style={{ color: "#003087", fontSize: "16px" }}>4. NHẬN XÉT VÀ ĐÁNH GIÁ VỀ ĐẠI LÝ</h5>
                {(() => {
                  const currentMonth = new Date().getMonth() + 1;
                  const passedMonths = currentMonth;
                  const remainingMonths = 12 - currentMonth > 0 ? 12 - currentMonth : 1;
                  
                  const totalSales = formattedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                  const totalPaid = formattedOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
                  
                  let annualCommitment = 0;
                  if (selectedCustomer && selectedCustomer.contracts && selectedCustomer.contracts.length > 0) {
                    annualCommitment = selectedCustomer.contracts.reduce((sum: number, c: any) => sum + (c.giaTriHopDong || 0), 0);
                  } else {
                    const fv = selectedCustomer?.formValues ? JSON.parse(selectedCustomer.formValues) : {};
                    annualCommitment = Number(fv.bbDoanhSoNam || fv.hdDoanhSoNam) || 0;
                  }

                  const percent = annualCommitment > 0 ? Math.round((totalSales / annualCommitment) * 100) : 0;
                  const targetPercent = Math.round((passedMonths / 12) * 100);
                  
                  let progressEval = "";
                  let progressReason = "";
                  if (annualCommitment === 0) {
                    progressEval = "chưa có cam kết doanh số";
                    progressReason = "Đại lý chưa được thiết lập doanh số mục tiêu năm.";
                  } else if (percent >= targetPercent) {
                    progressEval = "vượt tiến độ rất tốt";
                    progressReason = `Tốc độ bán hàng trung bình đạt ${(totalSales / passedMonths / 1000000).toFixed(1)} triệu/tháng, cao hơn mức kỳ vọng. Khả năng đạt thưởng doanh số năm là rất chắc chắn.`;
                  } else if (percent >= targetPercent * 0.6) {
                    progressEval = "duy trì tương đối ổn định";
                    progressReason = `Tốc độ bán hàng trung bình đạt ${(totalSales / passedMonths / 1000000).toFixed(1)} triệu/tháng. Tuy nhiên cần nỗ lực thêm vào các tháng cuối năm để đuổi kịp cam kết.`;
                  } else {
                    progressEval = "chậm nhịp đáng kể";
                    progressReason = `Tốc độ bán hàng trung bình chỉ đạt ${(totalSales / passedMonths / 1000000).toFixed(1)} triệu/tháng. Với đà này, khả năng đạt mức thưởng doanh số năm là khá thấp.`;
                  }
                  
                  let maxMonth = 0; let minMonth = Infinity;
                  let activeMonths = 0;
                  for (let i = 1; i <= currentMonth; i++) {
                    const mName = `Tháng ${i}/${new Date().getFullYear()}`;
                    const val = formattedOrders.filter(o => o.month === mName).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                    if (val > 0) {
                       activeMonths++;
                       if (val > maxMonth) maxMonth = val;
                       if (val < minMonth) minMonth = val;
                    }
                  }
                  if (minMonth === Infinity) minMonth = 0;
                  
                  let stabilityEval = "";
                  if (activeMonths === 0) {
                    stabilityEval = "Đại lý chưa có phát sinh giao dịch nào trong năm nay.";
                  } else if (activeMonths === 1) {
                    stabilityEval = "Đại lý mới phát sinh giao dịch trong 1 tháng.";
                  } else if (maxMonth > minMonth * 3 && minMonth > 0) {
                    stabilityEval = "Nhịp độ lấy hàng thiếu ổn định, có sự chênh lệch lớn giữa các tháng. Biểu đồ cho thấy đại lý có thể đang bán hàng theo tính chất công trình/dự án chứ chưa có luồng bán lẻ ổn định.";
                  } else {
                    stabilityEval = "Nhịp độ lấy hàng tương đối ổn định giữa các tháng.";
                  }
                  
                  const debt = totalSales - totalPaid;
                  let paymentEval = "";
                  let paymentDesc = "";
                  if (totalSales === 0) {
                    paymentEval = "chưa có dữ liệu thanh toán";
                    paymentDesc = "Chưa có đơn hàng phát sinh.";
                  } else if (debt <= 0) {
                    paymentEval = "một điểm sáng cực kỳ lớn";
                    paymentDesc = "Thanh toán đúng hạn 100%. Năng lực tài chính và xoay vòng vốn của đại lý rất tốt, tối ưu được chiết khấu thanh toán.";
                  } else if (debt < totalSales * 0.3) {
                    paymentEval = "một mức độ thanh toán tương đối tốt";
                    paymentDesc = `Đã thanh toán ${(totalPaid / 1000000).toFixed(1)} triệu / ${(totalSales / 1000000).toFixed(1)} triệu. Còn lại khoản nợ nhỏ nằm trong hạn mức an toàn.`;
                  } else {
                    paymentEval = "cảnh báo cần theo dõi công nợ";
                    paymentDesc = `Tỷ lệ nợ khá cao (đọng ${(debt / 1000000).toFixed(1)} triệu). Cần đôn đốc nhắc nhở thanh toán để tránh nợ xấu và giúp đại lý tối ưu phần chiết khấu.`;
                  }

                  const requiredPerMonth = annualCommitment > totalSales ? Math.round((annualCommitment - totalSales) / remainingMonths) : 0;
                  
                  return (
                    <div className="p-3 border rounded" style={{ fontSize: "13px", backgroundColor: "#f8f9fa" }}>
                      <h6 className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>1. Về tiến độ hoàn thành cam kết doanh số năm (YTD)</h6>
                      <ul className="mb-3 ps-3">
                        <li className="mb-1"><strong>Thực trạng:</strong> Tổng doanh số tính đến hiện tại đạt <strong>{totalSales.toLocaleString("vi-VN")} ₫</strong>, tương đương <strong>{percent}%</strong> so với chỉ tiêu cam kết năm là <strong>{annualCommitment > 0 ? annualCommitment.toLocaleString("vi-VN") + " ₫" : "Chưa xác định"}</strong>.</li>
                        <li className="mb-1"><strong>Đánh giá:</strong> Đại lý đang <strong>{progressEval}</strong>. {progressReason}</li>
                      </ul>

                      <h6 className="fw-bold text-dark mt-4" style={{ fontSize: "13.5px" }}>2. Về biểu đồ biến động doanh thu (Năm {new Date().getFullYear()})</h6>
                      <ul className="mb-3 ps-3">
                        <li className="mb-1"><strong>Thực trạng:</strong> Đại lý có phát sinh doanh số trong <strong>{activeMonths}/{passedMonths}</strong> tháng. Tháng cao nhất đạt <strong>{maxMonth.toLocaleString("vi-VN")} ₫</strong>, tháng thấp nhất (có phát sinh) đạt <strong>{minMonth.toLocaleString("vi-VN")} ₫</strong>.</li>
                        <li><strong>Đánh giá:</strong> {stabilityEval}</li>
                      </ul>

                      <h6 className="fw-bold text-dark mt-4" style={{ fontSize: "13.5px" }}>3. Về năng lực thanh toán và tối ưu chính sách (Dòng tiền)</h6>
                      <ul className="mb-4 ps-3">
                        <li className="mb-1"><strong>Thực trạng:</strong> Đã thanh toán <strong>{totalPaid.toLocaleString("vi-VN")} ₫</strong> trên tổng số <strong>{totalSales.toLocaleString("vi-VN")} ₫</strong>. Dư nợ hiện tại: <strong>{debt > 0 ? debt.toLocaleString("vi-VN") : "0"} ₫</strong>.</li>
                        <li><strong>Đánh giá:</strong> Đây là <strong>{paymentEval}</strong>. {paymentDesc}</li>
                      </ul>
                      
                      <hr />
                      <h6 className="fw-bold mt-3 mb-2" style={{ color: "#003087", fontSize: "13.5px" }}>💡 TÓM LẠI & ĐỀ XUẤT HÀNH ĐỘNG:</h6>
                      <p className="mb-2"><strong>Nhận xét chung:</strong> Đại lý này {percent >= targetPercent ? "đang giữ vững đà phát triển và có dòng tiền khỏe." : "cần được chăm sóc thêm để kích cầu doanh số và đảm bảo cam kết."}</p>
                      <ul className="mb-0 ps-3">
                        {debt > 0 && <li className="mb-1"><strong>Nhắc nợ khéo léo:</strong> Kế toán hoặc NVKD cần nhắc khéo khoản công nợ {(debt / 1000000).toFixed(1)} triệu để dọn sạch nợ tồn.</li>}
                        {requiredPerMonth > 0 && <li className="mb-1"><strong>Kích cầu chạy nước rút:</strong> Để đạt chỉ tiêu năm, {remainingMonths} tháng còn lại đại lý phải chạy bình quân <strong>{(requiredPerMonth / 1000000).toFixed(1)} triệu/tháng</strong>. Cần thiết kế gói "Promotion Gối Đầu" hoặc tặng kèm vật phẩm hỗ trợ.</li>}
                        <li><strong>Chăm sóc sát sao:</strong> {activeMonths <= passedMonths / 2 && activeMonths > 0 ? "Đại lý hoạt động rất thưa thớt, cần tìm hiểu nguyên nhân (kẹt hàng tồn hay đang phân phối nhãn khác)." : "Tiếp tục duy trì tương tác tốt với đại lý để nắm bắt nhu cầu thị trường."}</li>
                      </ul>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}

