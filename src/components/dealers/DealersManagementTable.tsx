"use client";

import { useSession } from "next-auth/react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TableColumn } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import Link from "next/link";
import { BaoGiaSanitaryModal } from "@/components/plan-finance/bao_gia/BaoGiaSanitaryModal";
import { TaoDonHangModal } from "@/components/plan-finance/bao_gia/TaoDonHangModal";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { useToast } from "@/components/ui/Toast";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface CustomerRow {
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
  contracts?: { giaTriHopDong: number; trangThai: string; code?: string; ngayKy?: string | Date }[];
  nguoiChamSoc?: { fullName: string };
  creditLimit?: number;
  doanhSoCamKet?: number;
  thuongThanhToan?: string;
  thuongDoanhSoNam?: string;
  thuongVuotDoanhSo?: string;
  nguoiChamSocId?: string;
}

export interface DealersManagementTableProps {
  onTotalChange?: (total: number) => void;
  className?: string;
  style?: React.CSSProperties;
  defaultNhom?: string;
}

export function DealersManagementTable({
  onTotalChange,
  className,
  style,
  defaultNhom = "dai-ly"
}: DealersManagementTableProps) {
  // States for filters and query
  const [nguonFilter, setNguonFilter] = useState("");
  const [hangFilter, setHangFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showAllCustomers, setShowAllCustomers] = useState(false);

  // States for table data
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<any[]>([]);
  const { success, error } = useToast();
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetch("/api/hr/employees")
      .then(res => res.json())
      .then(data => {
        const allEmps = Array.isArray(data.employees) ? data.employees : Array.isArray(data) ? data : [];
        const kdEmps = allEmps.filter((e: any) => e.departmentCode === "KD" || e.departmentName?.toLowerCase().includes("kinh doanh") || e.departmentCode === "sales");
        setEmployees(kdEmps);
      })
      .catch(console.error);
  }, []);

  const currentUserEmployee = employees.find(e => e.userId === (session?.user as any)?.id);
  const isDepartmentHead = currentUserEmployee?.position === "vtr-20260401-1964-sbmg" || currentUserEmployee?.position?.toLowerCase().includes("trưởng phòng");
  const isManager = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "MANAGER" || (session?.user as any)?.role === "SUPERADMIN";
  const showEmployeeFilter = isManager || isDepartmentHead;
  const employeeOptions = employees.map(e => ({ label: e.fullName, value: e.id }));

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
    code: string;
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
    hanMucCongNo: number | "";
    doanhSoCamKet: number | "";
    thuongThanhToan: string;
    thuongDoanhSoNam: string;
    thuongVuotDoanhSo: string;
    nguoiChamSocId: string;
    coCamKet: boolean;
  }>({
    code: "",
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
    hanMucCongNo: 0,
    doanhSoCamKet: 0,
    thuongThanhToan: "Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)",
    thuongDoanhSoNam: "Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế",
    thuongVuotDoanhSo: "Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết",
    nguoiChamSocId: "",
    coCamKet: true,
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

  const [sourceCategories, setSourceCategories] = useState<any[]>([]);
  const [groupCategories, setGroupCategories] = useState<any[]>([]);
  const [nhomCategories, setNhomCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/board/categories?type=customer_source")
      .then(res => res.json())
      .then(data => setSourceCategories(data))
      .catch(console.error);

    fetch("/api/board/categories?type=lo_i_kh_ch_h_ng")
      .then(res => res.json())
      .then(data => setGroupCategories(data))
      .catch(console.error);

    fetch("/api/plan-finance/categories?type=customer_group")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setNhomCategories(data);
        }
      })
      .catch(console.error);
  }, []);

  const nguonOptions = useMemo(() => sourceCategories.map(c => ({ label: c.name, value: c.code })), [sourceCategories]);
  const hangOptions = useMemo(() => groupCategories.map(c => ({ label: c.name, value: c.code })), [groupCategories]);
  const nhomOptions = useMemo(() => {
    if (nhomCategories.length > 0) {
      return nhomCategories.map(c => ({ label: c.name, value: c.code }));
    }
    return [
      { label: "Đại lý", value: "dai-ly" },
      { label: "Cá nhân", value: "ca-nhan" },
      { label: "Dự án", value: "du-an" },
      { label: "Nhà phân phối", value: "nha-phan-phoi" },
    ];
  }, [nhomCategories]);

  const onTotalChangeRef = React.useRef(onTotalChange);
  useEffect(() => {
    onTotalChangeRef.current = onTotalChange;
  }, [onTotalChange]);

  const lastReportedTotalRef = React.useRef<number | null>(null);

  // Fetch customers from API
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "15" });
      if (searchQuery) params.set("search", searchQuery);
      if (nguonFilter) params.set("nguon", nguonFilter);
      if (!showAllCustomers && defaultNhom) {
        params.set("nhom", defaultNhom); // Mặc định chỉ hiển thị đại lý
      }
      if (hangFilter) params.set("loai", hangFilter);
      if (employeeFilter) params.set("employeeId", employeeFilter);
      
      const res = await fetch(`/api/plan-finance/customers?${params}`);
      const data = await res.json();
      const fetched = data.customers ?? [];
      setCustomers(fetched);
      const serverTotalPages = data.totalPages ?? 1;
      setTotalPages(serverTotalPages);
      const totalCount = data.total ?? 0;
      setTotal(totalCount);
      if (page > serverTotalPages && serverTotalPages > 0) {
        setPage(serverTotalPages);
      }
      if (onTotalChangeRef.current && lastReportedTotalRef.current !== totalCount) {
        lastReportedTotalRef.current = totalCount;
        onTotalChangeRef.current(totalCount);
      }
    } catch (err) {
      console.error("Lỗi fetch khách hàng:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, nguonFilter, hangFilter, employeeFilter, showAllCustomers, defaultNhom]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, nguonFilter, hangFilter, employeeFilter, showAllCustomers]);

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
    setSelectedCustomer(null);
    setEditForm({
      code: "",
      name: "",
      nhom: defaultNhom || "dai-ly",
      nguon: "tu-nhien",
      loai: "bac",
      dienThoai: "",
      email: "",
      address: "",
      daiDien: "",
      xungHo: "Anh",
      chucVu: "",
      hanMucCongNo: 0,
      doanhSoCamKet: 0,
      thuongThanhToan: "Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)",
      thuongDoanhSoNam: "Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế",
      thuongVuotDoanhSo: "Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết",
      nguoiChamSocId: employees.find(e => e.userId === (session?.user as any)?.id)?.id || "",
      coCamKet: true,
    });
    setIsCreateMode(true);
    setErrorMsg("");
    setEditModalOpen(true);
  };

  const handleOpenEdit = (customer: any) => {
    setSelectedCustomer(customer);
    const fv = typeof customer.formValues === "string" ? JSON.parse(customer.formValues) : (customer.formValues || {});
    setEditForm({
      code: customer.code || "",
      name: customer.name || "",
      nhom: customer.nhom || "",
      nguon: customer.nguon || "",
      loai: customer.loai || "",
      dienThoai: customer.dienThoai || "",
      email: customer.email || "",
      address: customer.address || "",
      daiDien: customer.daiDien || "",
      xungHo: customer.xungHo || "Anh",
      chucVu: customer.chucVu || "",
      hanMucCongNo: customer.creditLimit || 0,
      doanhSoCamKet: customer.doanhSoCamKet || fv.doanhSoCamKet || 0,
      thuongThanhToan: customer.thuongThanhToan || fv.thuongThanhToan || "Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)",
      thuongDoanhSoNam: customer.thuongDoanhSoNam || fv.thuongDoanhSoNam || "Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế",
      thuongVuotDoanhSo: customer.thuongVuotDoanhSo || fv.thuongVuotDoanhSo || "Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết",
      nguoiChamSocId: customer.nguoiChamSocId || employees.find(e => e.userId === (session?.user as any)?.id)?.id || "",
      coCamKet: fv.coCamKet !== false,
    });
    setIsCreateMode(false);
    setErrorMsg("");
    setEditModalOpen(true);
  };

  const handleDownloadTemplate = () => {
    import("xlsx").then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Mã KH", "Tên khách hàng (*)", "Nhóm", "Nguồn", "Phân loại", "Điện thoại", "Email", "Địa chỉ", "Người đại diện", "Xưng hô", "Chức vụ"]
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "KhachHang");
      XLSX.writeFile(wb, "Template_KhachHang.xlsx");
    });
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (nguonFilter) params.set("nguon", nguonFilter);
      if (!showAllCustomers && defaultNhom) params.set("nhom", defaultNhom);
      if (hangFilter) params.set("loai", hangFilter);
      if (employeeFilter) params.set("employeeId", employeeFilter);
      params.set("pageSize", "10000");

      const res = await fetch(`/api/plan-finance/customers?${params}`);
      const data = await res.json();
      const exportData = data.customers || [];

      const XLSX = await import("xlsx");
      const rows = exportData.map((c: any) => {
        let fv: any = {};
        try { if (c.formValues) fv = JSON.parse(c.formValues); } catch(e){}
        
        let displayDaiDien = c.daiDien || "";
        let displayPhone = c.dienThoai || fv.phone || "";
        if (!displayDaiDien && fv.contact) {
          const parts = String(fv.contact).split("-").map(p => p.trim());
          displayDaiDien = parts[0] || "";
          if (!displayPhone && parts.length > 1) displayPhone = parts[1];
        }

        return [
          c.code || "",
          c.name || "",
          c.nhom || "dai-ly",
          c.nguon || "",
          c.loai || fv.scale || "",
          displayPhone,
          c.email || fv.email || "",
          c.address || fv.detailBusinessAddress || fv.address || "",
          displayDaiDien,
          c.xungHo || "Anh",
          c.chucVu || fv.position || ""
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([
        ["Mã KH", "Tên khách hàng (*)", "Nhóm", "Nguồn", "Phân loại", "Điện thoại", "Email", "Địa chỉ", "Người đại diện", "Xưng hô", "Chức vụ"],
        ...rows
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "KhachHang");
      XLSX.writeFile(wb, "Danh_sach_dai_ly_Export.xlsx");
    } catch (err) {
      console.error(err);
      error("Lỗi", "Có lỗi xảy ra khi xuất dữ liệu");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImporting(true);
        const XLSX = await import("xlsx");
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
           const row = data[i] || [];
           if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes("tên kh"))) {
              headerRowIdx = i;
              break;
           }
        }

        if (headerRowIdx === -1) {
           error("Lỗi", "Không tìm thấy cột 'Tên khách hàng' trong file Excel.");
           setImporting(false);
           return;
        }

        const headers = (data[headerRowIdx] || []).map(h => typeof h === 'string' ? h.toLowerCase().trim() : '');
        const colCode = headers.findIndex(h => h.includes("mã kh"));
        const colName = headers.findIndex(h => h.includes("tên kh"));
        const colAddress = headers.findIndex(h => h.includes("địa chỉ"));
        const colPhone = headers.findIndex(h => h.includes("điện thoại") || h.includes("sđt"));
        const colNhom = headers.findIndex(h => h.includes("nhóm"));
        const colNguon = headers.findIndex(h => h.includes("nguồn"));

        const rows = data.slice(headerRowIdx + 1).filter(r => r.length > 0);
        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
          const code = colCode >= 0 ? row[colCode] : undefined;
          const name = colName >= 0 ? row[colName] : undefined;
          const address = colAddress >= 0 ? row[colAddress] : undefined;
          const dienThoai = colPhone >= 0 ? row[colPhone] : undefined;
          const nhom = colNhom >= 0 ? row[colNhom] : undefined;
          const nguon = colNguon >= 0 ? row[colNguon] : undefined;

          if (!name) {
            errorCount++;
            continue;
          }

          const res = await fetch("/api/plan-finance/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: code ? String(code).trim() : undefined,
              name: String(name).trim(),
              nhom: nhom ? String(nhom).trim() : defaultNhom,
              nguon: nguon ? String(nguon).trim() : "",
              loai: "",
              dienThoai: dienThoai ? String(dienThoai).trim() : "",
              email: "",
              address: address ? String(address).trim() : "",
              daiDien: "",
              xungHo: "Anh",
              chucVu: "",
              hanMucCongNo: 0,
              doanhSoCamKet: 0,
              thuongThanhToan: "Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)",
              thuongDoanhSoNam: "Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế",
              thuongVuotDoanhSo: "Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết",
              coCamKet: true
            })
          });

          if (res.ok) successCount++;
          else errorCount++;
        }

        if (successCount > 0) {
          success("Thành công", `Đã nhập ${successCount} khách hàng (Lỗi: ${errorCount})`);
          fetchCustomers();
        } else {
          error("Lỗi", `Không thể nhập dữ liệu. Vui lòng kiểm tra file mẫu.`);
        }
      } catch (err) {
        error("Lỗi import", "Đã xảy ra lỗi khi đọc file Excel.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
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
          code: editForm.code,
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
          hanMucCongNo: editForm.hanMucCongNo === "" ? 0 : Number(editForm.hanMucCongNo),
          nguoiChamSocId: editForm.nguoiChamSocId || null,
          formValues: JSON.stringify({
            coCamKet: editForm.coCamKet,
            doanhSoCamKet: editForm.doanhSoCamKet === "" ? 0 : Number(editForm.doanhSoCamKet),
            thuongThanhToan: editForm.thuongThanhToan,
            thuongDoanhSoNam: editForm.thuongDoanhSoNam,
            thuongVuotDoanhSo: editForm.thuongVuotDoanhSo,
          })
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
      render: (row, idx) => (page - 1) * 15 + idx + 1
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
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="badge bg-secondary" style={{ fontSize: '10px' }}>{row.code || "N/A"}</span>
              <span className="fw-bold text-dark">{row.name}</span>
              {showAllCustomers && (
                (row.nhom === "ca-nhan" || row.nhom === "ca_nhan") ? (
                  <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25" style={{ fontSize: '9.5px', padding: '2px 6px' }}>Cá nhân</span>
                ) : (row.nhom === "dai-ly" || row.nhom === "dai_ly") ? (
                  <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25" style={{ fontSize: '9.5px', padding: '2px 6px' }}>Đại lý</span>
                ) : (
                  <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25" style={{ fontSize: '9.5px', padding: '2px 6px' }}>Khác</span>
                )
              )}
            </div>
            {actualAddress && (
              <span className="text-muted small mt-1">
                <i className="bi bi-geo-alt me-1" />
                {actualAddress}
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
      header: "Người phụ trách",
      render: (row) => (
        <div className="d-flex flex-column text-muted" style={{ fontSize: "12.5px" }}>
          {row.nguoiChamSoc?.fullName ? (
            <span className="fw-medium text-dark">
              <i className="bi bi-person-workspace me-1" style={{ fontSize: "11px" }}></i>
              {row.nguoiChamSoc.fullName}
            </span>
          ) : (
            <span className="text-muted fst-italic">Chưa phân công</span>
          )}
        </div>
      )
    },
    {
      header: "Doanh số năm",
      width: 220,
      render: (row) => {
        let hasCommitment = true;
        if (row.formValues) {
          try {
            const fv = typeof row.formValues === "string" ? JSON.parse(row.formValues) : row.formValues;
            if (fv.coCamKet === false) hasCommitment = false;
          } catch (e) {}
        }
        const committed = (row as any).committedSales ?? 0;
        const actual = (row as any).yearlySales ?? 0;
        const percent = (committed > 0 && hasCommitment) ? Math.round((actual / committed) * 100) : 0;

        return (
          <div className="d-grid gap-1 align-items-center" style={{ fontSize: "12.5px", gridTemplateColumns: "auto 1fr 35px" }}>
            <span className="text-muted" style={{ fontSize: "11px" }}>Cam kết:</span>
            {hasCommitment ? (
              <span className="fw-semibold text-primary text-end">{committed.toLocaleString("vi-VN")} ₫</span>
            ) : (
              <span className="fst-italic text-muted text-end" style={{ fontSize: "11px" }}>Không cam kết</span>
            )}
            <span></span>

            <span className="text-muted" style={{ fontSize: "11px" }}>Thực tế:</span>
            <span className="fw-bold text-success text-end">{actual.toLocaleString("vi-VN")} ₫</span>
            <div className="text-end ps-1">
              {hasCommitment ? (
                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-10" style={{ fontSize: "10px", padding: "2px 4px" }}>
                  {percent}%
                </span>
              ) : (
                <span></span>
              )}
            </div>
          </div>
        );
      }
    }
  ];

  const mobileColumns: TableColumn<CustomerRow>[] = [
    {
      header: "Đại lý & Liên hệ",
      render: (row) => {
        let actualAddress = row.address;
        if (!actualAddress && row.formValues) {
          try {
            const parsed = JSON.parse(row.formValues);
            actualAddress = parsed.detailBusinessAddress || parsed.address || "";
          } catch (e) { }
        }

        const committed = (row as any).committedSales ?? 0;
        const actual = (row as any).yearlySales ?? 0;
        const hasCommitment = committed > 0;
        const percent = hasCommitment ? Math.round((actual / committed) * 100) : 0;
        const rankLabel = hangOptions.find(o => o.value === row.loai)?.label || (row.loai ? row.loai.replace("-", " ") : null);

        return (
          <div className="d-flex flex-column py-1" style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
              <div className="d-flex align-items-center gap-1.5 text-truncate" style={{ minWidth: 0 }}>
                <span className="badge bg-secondary flex-shrink-0" style={{ fontSize: "10px" }}>{row.code || "N/A"}</span>
                <span className="fw-bold text-dark text-truncate" style={{ fontSize: "13px" }}>{row.name}</span>
                {showAllCustomers && (
                  (row.nhom === "ca-nhan" || row.nhom === "ca_nhan") ? (
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 flex-shrink-0" style={{ fontSize: '9px' }}>Cá nhân</span>
                  ) : (
                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 flex-shrink-0" style={{ fontSize: '9px' }}>Đại lý</span>
                  )
                )}
              </div>
              {rankLabel && (
                <span className="badge bg-primary-subtle text-primary text-uppercase flex-shrink-0" style={{ fontSize: "9.5px" }}>
                  {rankLabel}
                </span>
              )}
            </div>

            <div className="text-muted text-truncate d-flex align-items-center gap-2 mb-1" style={{ fontSize: "11.5px" }}>
              {actualAddress && (
                <span className="text-truncate"><i className="bi bi-geo-alt me-1 text-secondary" />{actualAddress}</span>
              )}
              {row.dienThoai && (
                <a
                  href={`tel:${row.dienThoai}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-decoration-none text-primary fw-medium d-inline-flex align-items-center flex-shrink-0"
                >
                  <i className="bi bi-telephone me-1" />{row.dienThoai}
                </a>
              )}
            </div>

            <div className="d-flex align-items-center justify-content-between text-muted flex-wrap gap-1" style={{ fontSize: "11px" }}>
              <span>
                Thực tế: <strong className="text-success">{actual.toLocaleString("vi-VN")} ₫</strong>
                {hasCommitment && (
                  <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-10 ms-1" style={{ fontSize: "9.5px", padding: "1px 4px" }}>
                    {percent}%
                  </span>
                )}
              </span>
              {row.nguoiChamSoc?.fullName && (
                <span className="text-secondary" style={{ fontSize: "10.5px" }}>
                  <i className="bi bi-person me-1" />{row.nguoiChamSoc.fullName}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: "",
      width: "36px",
      align: "center",
      render: (row) => (
        <div className="d-flex align-items-center justify-content-center" onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }}>
          <button className="btn btn-sm btn-light border rounded-circle shadow-none p-0 d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>
            <i className="bi bi-chevron-right text-muted" style={{ fontSize: 12 }} />
          </button>
        </div>
      )
    }
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
        const totalAmount = row.totalAmount || 0;
        const paid = row.paidAmount || 0;
        const percent = totalAmount > 0 ? Math.round((paid / totalAmount) * 100) : 0;
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
      
      let onTimePaidAmount = 0;
      let totalLinkedPayments = 0;
      if (o.paymentNotifications && Array.isArray(o.paymentNotifications)) {
        o.paymentNotifications.forEach((p: any) => {
          totalLinkedPayments += p.amount || 0;
          const pDate = p.verifiedAt ? new Date(p.verifiedAt) : new Date(p.createdAt);
          if (dateObj && !isNaN(dateObj.getTime()) && !isNaN(pDate.getTime())) {
            if (pDate.getMonth() === dateObj.getMonth() && pDate.getFullYear() === dateObj.getFullYear()) {
              onTimePaidAmount += p.amount || 0;
            }
          }
        });
      }

      const manualPaidAmount = Math.max(0, (o.daThanhToan || 0) - totalLinkedPayments);
      if (manualPaidAmount > 0) {
         const uDate = o.updatedAt ? new Date(o.updatedAt) : (dateObj || new Date());
         if (dateObj && uDate.getMonth() === dateObj.getMonth() && uDate.getFullYear() === dateObj.getFullYear()) {
             onTimePaidAmount += manualPaidAmount;
         }
      }

      return {
        id: o.id,
        orderCode: o.code || String(o.id).slice(0, 8),
        totalAmount: o.tongTien || 0,
        paidAmount: o.daThanhToan || 0,
        onTimePaidAmount,
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

    let hasCommitment = true;
    if (selectedCustomer?.formValues) {
      try {
        const fv = typeof selectedCustomer.formValues === "string" ? JSON.parse(selectedCustomer.formValues) : selectedCustomer.formValues;
        if (fv.coCamKet === false) hasCommitment = false;
      } catch (e) {}
    }
    let annualCommitment = hasCommitment ? ((selectedCustomer as any)?.committedSales ?? 0) : 0;
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
              {hasCommitment ? (
                <span className={`badge mx-1 ${percent >= 100 ? "bg-success bg-opacity-10 text-success border border-success border-opacity-10" : "bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10"}`}>
                  {percent}% | {Math.round(monthCommitment).toLocaleString("vi-VN")} ₫
                </span>
              ) : (
                <span className="fst-italic text-muted mx-1" style={{ fontSize: "11px" }}>Không cam kết</span>
              )}
            </span>
            <button
              className="btn btn-sm btn-light border-0 d-flex align-items-center justify-content-center p-0 rounded-circle"
              style={{ width: "24px", height: "24px", color: "var(--bs-gray-600)" }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMonthStr(month);
                setSelectedOrderCode("");
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
  }, [expandedMonths, selectedCustomer, formattedOrders]);

  return (
    <div className={`col-12 d-flex flex-column h-100 ${className || ""}`} style={{ minHeight: 0, ...style }}>
      <FullWidthTableLayout
        className="flex-grow-1 overflow-hidden full-width-table-wrapper"
        header={
          <div className="d-flex flex-column gap-2 mb-2 mt-2">
            {/* Thanh công cụ Toolbar */}
            <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2 w-100">
              {/* Hàng 1 trên Mobile: Search Input + Nút Thêm mới */}
              <div className="d-flex align-items-center gap-2 flex-grow-1 order-1 order-md-2" style={{ maxWidth: isMobile ? "none" : 320 }}>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={showAllCustomers ? "Tìm kiếm đại lý, khách hàng..." : "Tìm kiếm đại lý..."}
                  />
                </div>
                {isMobile && (
                  <button
                    onClick={handleOpenCreate}
                    className="btn text-white px-2.5 d-flex align-items-center justify-content-center gap-1 shadow-sm flex-shrink-0"
                    style={{
                      height: 34,
                      fontSize: "12.5px",
                      backgroundColor: "#003087",
                      borderColor: "#003087",
                      borderRadius: 8,
                      fontWeight: 700,
                      whiteSpace: "nowrap"
                    }}
                  >
                    <i className="bi bi-plus-lg" />
                    <span>Thêm</span>
                  </button>
                )}
              </div>

              {/* Bộ lọc Nguồn, Hạng, Phụ trách */}
              <div className="d-flex align-items-center gap-2 order-2 order-md-1 flex-wrap flex-md-nowrap">
                <div className="flex-fill" style={{ minWidth: isMobile ? 0 : 120 }}>
                  <FilterSelect
                    options={nguonOptions}
                    value={nguonFilter}
                    onChange={setNguonFilter}
                    placeholder="Nguồn"
                    width={isMobile ? "100%" : 120}
                  />
                </div>
                <div className="flex-fill" style={{ minWidth: isMobile ? 0 : 120 }}>
                  <FilterSelect
                    options={hangOptions}
                    value={hangFilter}
                    onChange={setHangFilter}
                    placeholder="Hạng"
                    width={isMobile ? "100%" : 120}
                  />
                </div>
                {showEmployeeFilter && (
                  <div className="flex-fill" style={{ minWidth: isMobile ? 0 : 150 }}>
                    <FilterSelect
                      options={employeeOptions}
                      value={employeeFilter}
                      onChange={setEmployeeFilter}
                      placeholder="Người phụ trách"
                      width={isMobile ? "100%" : 150}
                    />
                  </div>
                )}
              </div>
              
              {/* Hàng nút Desktop / Thao tác mở rộng */}
              <div className="d-flex align-items-center gap-2 order-3">
                <div className="form-check form-switch mb-0 d-flex align-items-center gap-2 me-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="showAllCustomersSwitch"
                    checked={showAllCustomers}
                    onChange={(e) => setShowAllCustomers(e.target.checked)}
                    style={{ cursor: 'pointer', marginTop: 0 }}
                  />
                  <label className="form-check-label text-muted" htmlFor="showAllCustomersSwitch" style={{ cursor: 'pointer', fontSize: '13px', paddingTop: '2px', whiteSpace: 'nowrap' }}>
                    Tất cả
                  </label>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: 34, height: 34, borderRadius: 8, padding: 0 }}
                  title="Tải file mẫu Excel"
                  onClick={handleDownloadTemplate}
                  disabled={importing}
                >
                  <i className="bi bi-download"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: 34, height: 34, borderRadius: 8, padding: 0 }}
                  title="Xuất dữ liệu ra Excel"
                  onClick={handleExportExcel}
                  disabled={importing}
                >
                  <i className="bi bi-file-earmark-arrow-down"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: 34, height: 34, borderRadius: 8, padding: 0 }}
                  title="Nhập dữ liệu từ Excel"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-file-earmark-excel"></i>
                  )}
                </button>
                {!isMobile && (
                  <button
                    onClick={handleOpenCreate}
                    className="btn text-white px-3 d-flex align-items-center justify-content-center gap-2 shadow-sm ms-1"
                    style={{
                      height: 34,
                      fontSize: "12.5px",
                      backgroundColor: "#003087",
                      borderColor: "#003087",
                      borderRadius: 8,
                      fontWeight: 700,
                      whiteSpace: "nowrap"
                    }}
                  >
                    <i className="bi bi-plus-lg" />
                    <span>Thêm mới</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        }
        table={
          <div className="h-100 border-top bg-white overflow-auto d-flex flex-column" style={{ minHeight: 0 }}>
            <Table
              columns={isMobile ? mobileColumns : columns}
              rows={customers}
              loading={loading}
              rowKey={(row) => row.id}
              emptyText="Không tìm thấy đại lý nào"
              compact
              onRowClick={(row) => {
                handleOpenEdit(row);
              }}
              wrapperClassName={isMobile ? "mkt-plan-table-no-min" : undefined}
              wrapperStyle={{ height: "100%", overflowY: "auto", overflowX: isMobile ? "hidden" : "auto" }}
            />
          </div>
        }
      />
      {total > 0 && (
        <div className="d-flex align-items-center justify-content-between px-4 py-2 border-top bg-white flex-shrink-0 w-100">
          <span className="text-muted small">
            Hiển thị <strong>{customers.length > 0 ? ((page - 1) * 15) + 1 : 0} - {Math.min(page * 15, total)}</strong> trong tổng số <strong>{total}</strong> {showAllCustomers ? "đại lý & khách hàng" : "đại lý"}
          </span>
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          )}
        </div>
      )}

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
                                    {displayLoai !== "—" ? (hangOptions.find(o => o.value === displayLoai)?.label || displayLoai.replace("-", " ")) : "—"}
                                  </span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted d-block fw-bold" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>NGUỒN KHÁCH HÀNG</span>
                                  <span className="text-dark fw-medium text-capitalize">
                                    {selectedCustomer.nguon ? (nguonOptions.find(o => o.value === selectedCustomer.nguon)?.label || selectedCustomer.nguon.replace("-", " ")) : "—"}
                                  </span>
                                </div>
                                <div className="col-12 mt-2">
                                  <span className="text-muted d-block fw-bold mb-1" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>DOANH SỐ NĂM</span>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-dark fw-bold text-primary" style={{ fontSize: "15px" }}>
                                      {((selectedCustomer as any).yearlySales || 0).toLocaleString("vi-VN")} ₫
                                    </span>
                                    {(() => {
                                      let hasCommitment = true;
                                      if (selectedCustomer.formValues) {
                                        try {
                                          const fv = typeof selectedCustomer.formValues === "string" ? JSON.parse(selectedCustomer.formValues) : selectedCustomer.formValues;
                                          if (fv.coCamKet === false) hasCommitment = false;
                                        } catch (e) {}
                                      }
                                      const annualCommitment = hasCommitment ? ((selectedCustomer as any).committedSales || 0) : 0;
                                      const totalSales = (selectedCustomer as any).yearlySales || 0;
                                      const percent = annualCommitment > 0 ? Math.round((totalSales / annualCommitment) * 100) : 0;
                                      return hasCommitment ? (
                                        <span className="badge border fw-medium px-2 py-1" style={{ color: "#011F58", backgroundColor: "#f8f9fa", fontSize: "11px" }}>
                                          Đạt {percent}% | Cam kết: {annualCommitment.toLocaleString("vi-VN")} ₫
                                        </span>
                                      ) : (
                                        <span className="fst-italic text-muted" style={{ fontSize: "11px" }}>Không cam kết</span>
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
                                      const totalSales = (selectedCustomer as any).yearlySales || 0;
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
                                formatter: (val: number | null | undefined) => {
                                  if (val == null) return "0";
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
                                formatter: (val: number | null | undefined) => (val || 0).toLocaleString("vi-VN") + " ₫"
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
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="btn btn-outline-danger d-flex align-items-center justify-content-center px-4"
                    style={{ borderRadius: "8px", fontWeight: 500 }}
                    title="Xoá đại lý này"
                  >
                    <i className="bi bi-trash3 me-2" /> Xoá
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offcanvas Chỉnh sửa / Thêm mới đại lý (Rộng 400px) */}
      {editModalOpen && (
        <>
          <div 
            className="position-fixed top-0 start-0 w-100 h-100" 
            style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1055, backdropFilter: "blur(1px)" }} 
            onClick={() => setEditModalOpen(false)} 
          />
          <div 
            className="position-fixed top-0 end-0 bottom-0 bg-white shadow-lg d-flex flex-column" 
            style={{ 
              width: "400px", 
              maxWidth: "100vw", 
              zIndex: 1060, 
              borderLeft: "1px solid var(--border)",
              animation: "dealerOffcanvasSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            <div className="d-flex align-items-center justify-content-between py-3 px-3 border-bottom bg-light flex-shrink-0">
              <h5 className="modal-title fw-bold text-dark mb-0 fs-6 d-flex align-items-center gap-2">
                <i className="bi bi-shop text-primary fs-5" />
                <span>{isCreateMode ? "Thêm đại lý mới" : "Chỉnh sửa đại lý"}</span>
              </h5>
              <button type="button" className="btn-close shadow-none" onClick={() => setEditModalOpen(false)}></button>
            </div>
            
            <form onSubmit={handleSaveCustomer} className="d-flex flex-column flex-grow-1 overflow-hidden">
              <div className="p-3 flex-grow-1 overflow-auto custom-scrollbar">
                {errorMsg && (
                  <div className="alert alert-danger py-2 small mb-3">{errorMsg}</div>
                )}
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label small fw-bold text-muted mb-1">Tên đại lý <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nhập tên đại lý / showroom"
                    />
                  </div>
                  <div className="col-12">
                    <div className="row g-2">
                      <div className="col-5">
                        <label className="form-label small fw-bold text-muted mb-1">Số điện thoại</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editForm.dienThoai}
                          onChange={(e) => setEditForm(p => ({ ...p, dienThoai: e.target.value }))}
                          placeholder="Số điện thoại"
                        />
                      </div>
                      <div className="col-7">
                        <label className="form-label small fw-bold text-muted mb-1">Email</label>
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          value={editForm.email}
                          onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))}
                          placeholder="Email liên hệ"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold text-muted mb-1">Địa chỉ kinh doanh / Showroom</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editForm.address}
                      onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="Địa chỉ cửa hàng / showroom"
                    />
                  </div>
                  <div className="col-12">
                    <div className="row g-2">
                      <div className="col-4">
                        <label className="form-label small fw-bold text-muted mb-1">Xưng hô</label>
                        <select
                          className="form-select form-select-sm"
                          value={editForm.xungHo}
                          onChange={(e) => setEditForm(p => ({ ...p, xungHo: e.target.value }))}
                        >
                          <option value="Anh">Anh</option>
                          <option value="Chị">Chị</option>
                        </select>
                      </div>
                      <div className="col-8">
                        <label className="form-label small fw-bold text-muted mb-1">Người đại diện</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editForm.daiDien}
                          onChange={(e) => setEditForm(p => ({ ...p, daiDien: e.target.value }))}
                          placeholder="Họ và tên người đại diện"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-muted mb-1">Chức vụ</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editForm.chucVu}
                          onChange={(e) => setEditForm(p => ({ ...p, chucVu: e.target.value }))}
                          placeholder="Chủ showroom, Giám đốc..."
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-muted mb-1">Nguồn khai thác</label>
                        <select
                          className="form-select form-select-sm"
                          value={editForm.nguon}
                          onChange={(e) => setEditForm(p => ({ ...p, nguon: e.target.value }))}
                        >
                          <option value="">Chọn nguồn</option>
                          {nguonOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-muted mb-1">Nhóm</label>
                        <select
                          className="form-select form-select-sm"
                          value={editForm.nhom || "dai-ly"}
                          onChange={(e) => setEditForm(p => ({ ...p, nhom: e.target.value }))}
                        >
                          <option value="">Chọn nhóm</option>
                          {nhomOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-muted mb-1">Hạng</label>
                        <select
                          className="form-select form-select-sm"
                          value={editForm.loai}
                          onChange={(e) => setEditForm(p => ({ ...p, loai: e.target.value }))}
                        >
                          <option value="">Chọn hạng (Vàng / Bạc / Đồng)</option>
                          {hangOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="row g-2">
                      <div className="col-5">
                        <label className="form-label small fw-bold text-muted mb-1">Hạn mức công nợ (₫)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={editForm.hanMucCongNo}
                          onChange={(e) => setEditForm(p => ({ ...p, hanMucCongNo: e.target.value === "" ? "" : Number(e.target.value) }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-7">
                        <label className="form-label small fw-bold text-muted mb-1">Nhân viên phụ trách</label>
                        <select
                          className="form-select form-select-sm"
                          value={editForm.nguoiChamSocId}
                          onChange={(e) => setEditForm(p => ({ ...p, nguoiChamSocId: e.target.value }))}
                        >
                          <option value="">Chọn nhân viên chăm sóc</option>
                          {employeeOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 mt-2 pt-3 border-top">
                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="coCamKetSwitch"
                        checked={editForm.coCamKet}
                        onChange={(e) => setEditForm(p => ({ ...p, coCamKet: e.target.checked }))}
                      />
                      <label className="form-check-label fw-bold text-dark small" htmlFor="coCamKetSwitch">
                        Có cam kết doanh số năm
                      </label>
                    </div>

                    {editForm.coCamKet && (
                      <div className="row g-2.5">
                        <div className="col-12">
                          <label className="form-label small fw-bold text-muted mb-1">Mức cam kết doanh số năm (₫)</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={editForm.doanhSoCamKet}
                            onChange={(e) => setEditForm(p => ({ ...p, doanhSoCamKet: e.target.value === "" ? "" : Number(e.target.value) }))}
                            placeholder="Ví dụ: 1000000000"
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-bold text-muted mb-1">Thưởng thanh toán đúng hạn</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.thuongThanhToan}
                            onChange={(e) => setEditForm(p => ({ ...p, thuongThanhToan: e.target.value }))}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-bold text-muted mb-1">Thưởng đạt doanh số năm</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.thuongDoanhSoNam}
                            onChange={(e) => setEditForm(p => ({ ...p, thuongDoanhSoNam: e.target.value }))}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-bold text-muted mb-1">Thưởng vượt chỉ tiêu</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.thuongVuotDoanhSo}
                            onChange={(e) => setEditForm(p => ({ ...p, thuongVuotDoanhSo: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div 
                className="border-top px-3 bg-light d-flex align-items-center justify-content-end gap-2 flex-shrink-0"
                style={{ height: "64px", minHeight: "64px" }}
              >
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-secondary rounded-3 px-3" 
                  style={{ height: "36px", fontWeight: 600 }}
                  onClick={() => setEditModalOpen(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn btn-sm text-white rounded-3 px-3.5 fw-bold d-inline-flex align-items-center gap-1.5" 
                  style={{ backgroundColor: "#003087", borderColor: "#003087", height: "36px" }} 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2" />
                      <span>{isCreateMode ? "Thêm mới đại lý" : "Lưu thay đổi"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes dealerOffcanvasSlideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}} />
        </>
      )}

      {/* Modal Báo giá */}
      {baoGiaModalOpen && selectedCustomer && (
        <BaoGiaSanitaryModal
          open={baoGiaModalOpen}
          onClose={() => setBaoGiaModalOpen(false)}
          customer={selectedCustomer as any}
          onSaved={() => {
            setBaoGiaModalOpen(false);
            success("Thành công", "Đã tạo báo giá thành công");
          }}
        />
      )}

      {/* Modal Tạo Đơn Hàng */}
      {donHangModalOpen && selectedCustomer && (
        <TaoDonHangModal
          open={donHangModalOpen}
          onClose={() => setDonHangModalOpen(false)}
          customer={selectedCustomer as any}
          onSaved={() => {
            setDonHangModalOpen(false);
            success("Thành công", "Đã tạo đơn hàng thành công");
          }}
        />
      )}

      {/* Modal In Báo Cáo */}
      {showPrintModal && selectedCustomer && (
        <PrintPreviewModal
          onClose={() => setShowPrintModal(false)}
          title={`Báo cáo hoạt động đại lý - ${selectedCustomer.name}`}
          document={(
            <div id="print-doc" className="p-4 bg-white" style={{ minHeight: "800px", fontFamily: "sans-serif" }}>
              <div className="text-center mb-4">
                <h4 className="fw-bold mb-1" style={{ color: "#003087" }}>CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM</h4>
                <h5 className="fw-bold mb-0">BÁO CÁO KẾT QUẢ KINH DOANH ĐẠI LÝ</h5>
                <p className="text-muted small">Năm {new Date().getFullYear()}</p>
              </div>
              <div className="border p-3 mb-4 rounded">
                <div className="row g-2">
                  <div className="col-6"><strong>Tên đại lý:</strong> {selectedCustomer.name}</div>
                  <div className="col-6"><strong>Mã đại lý:</strong> {selectedCustomer.code || "—"}</div>
                  <div className="col-6"><strong>Số điện thoại:</strong> {selectedCustomer.dienThoai || "—"}</div>
                  <div className="col-6"><strong>Người đại diện:</strong> {selectedCustomer.daiDien || "—"}</div>
                  <div className="col-12"><strong>Địa chỉ:</strong> {selectedCustomer.address || "—"}</div>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr className="table-light">
                      <th>Tháng</th>
                      <th className="text-end">Doanh số</th>
                      <th className="text-end">Đã thanh toán</th>
                      <th className="text-end">Dư nợ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: new Date().getMonth() + 1 }, (_, i) => {
                      const mStr = `Tháng ${i + 1}/${new Date().getFullYear()}`;
                      const mOrders = formattedOrders.filter(o => o.month === mStr);
                      const totalM = mOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                      const paidM = mOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
                      return (
                        <tr key={i}>
                          <td>{mStr}</td>
                          <td className="text-end">{totalM.toLocaleString("vi-VN")} ₫</td>
                          <td className="text-end">{paidM.toLocaleString("vi-VN")} ₫</td>
                          <td className="text-end">{(totalM - paidM).toLocaleString("vi-VN")} ₫</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        />
      )}

      {/* Modal Xác nhận xoá */}
      {deleteConfirmOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-body p-4 text-center">
                <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: "42px" }}></i>
                <h6 className="fw-bold mt-2">Xác nhận xoá đại lý?</h6>
                <p className="text-muted small mb-0">Hành động này không thể hoàn tác.</p>
              </div>
              <div className="modal-footer border-top py-2 px-3 d-flex justify-content-center gap-2">
                <button type="button" className="btn btn-sm btn-light px-3" onClick={() => setDeleteConfirmOpen(false)}>
                  Huỷ
                </button>
                <button type="button" className="btn btn-sm btn-danger px-3" onClick={handleDeleteCustomer} disabled={submitting}>
                  {submitting ? "Đang xoá..." : "Xoá"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
