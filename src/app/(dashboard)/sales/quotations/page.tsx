"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { StandardPage } from "@/components/layout/StandardPage";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TableColumn } from "@/components/ui/Table";
import { BaoGiaSanitaryModal, CustomerRow } from "@/components/plan-finance/bao_gia/BaoGiaSanitaryModal";
import { TaoDonHangModal } from "@/components/plan-finance/bao_gia/TaoDonHangModal";
import { ChiTietBaoGia } from "@/components/plan-finance/bao_gia/ChiTietBaoGia";
import { ChiTietDonHang } from "@/components/plan-finance/bao_gia/ChiTietDonHang";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OmnichannelContent } from "../omnichannel/page";
import { CreateDefectOffcanvas } from "../../production/defects/components/CreateDefectOffcanvas";

interface Quotation {
  id: string;
  soBaoGia: string;
  khachHang: string;
  diaChi: string;
  giaTri: number;
  trangThai: string;
  ngayTao: string;
}

const STATUS_OPTIONS = [
  { label: "Bản nháp", value: "draft" },
  { label: "Đang thương thảo", value: "sent" },
  { label: "Thành công", value: "won" },
  { label: "Thất bại", value: "lost" },
  { label: "Tạm dừng", value: "paused" },
  { label: "Huỷ bỏ", value: "cancelled" },
];

const ORDER_STATUS_OPTIONS = [
  { label: "Đang thực hiện", value: "active" },
  { label: "Hoàn thành", value: "done" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Bản nháp", cls: "bg-light text-muted border" },
    sent: { label: "Đang thương thảo", cls: "bg-info-subtle text-info" },
    success: { label: "Thành công", cls: "bg-success-subtle text-success" },
    failed: { label: "Thất bại", cls: "bg-danger-subtle text-danger" },
    paused: { label: "Tạm dừng", cls: "bg-warning-subtle text-warning" },
    cancelled: { label: "Huỷ bỏ", cls: "bg-secondary-subtle text-secondary" },
    approved: { label: "Đã phê duyệt", cls: "bg-success-subtle text-success" },
    pending_approval: { label: "Đang trình duyệt", cls: "bg-warning-subtle text-warning" },
    won: { label: "Thành công", cls: "bg-success-subtle text-success" },
    lost: { label: "Thất bại", cls: "bg-danger-subtle text-danger" },
    active: { label: "Đang thực hiện", cls: "bg-primary-subtle text-primary" },
    done: { label: "Hoàn thành", cls: "bg-success-subtle text-success" },
    completed: { label: "Hoàn tất", cls: "bg-success-subtle text-success" },
    in_production: { label: "Đang sản xuất", cls: "bg-warning-subtle text-warning" },
    delivering: { label: "Đang giao hàng", cls: "bg-info-subtle text-info" },
    delivered: { label: "Đã giao hàng", cls: "bg-success-subtle text-success" },
  };

  const safeStatus = status || "unknown";
  
  // Fallback formatter if status is missing in the map
  const fallbackLabel = safeStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
    
  const m = map[safeStatus.toLowerCase()] ?? { label: fallbackLabel, cls: "bg-light text-dark border" };
  
  return (
    <span className={`badge rounded-pill px-2.5 py-1.5 ${m.cls}`} style={{ fontSize: 11, fontWeight: 600 }}>
      {m.label}
    </span>
  );
}

const STEP_ITEMS: ModernStepItem[] = [
  {
    num: 1,
    id: "QUOTATION",
    title: "Báo giá",
    desc: "Lập & quản lý báo giá",
    icon: "bi-file-text",
  },
  {
    num: 2,
    id: "ORDER",
    title: "Đơn hàng",
    desc: "Xử lý đơn hàng bán lẻ",
    icon: "bi-cart3",
  },
  {
    num: 3,
    id: "OMNICHANNEL",
    title: "Bán hàng đa kênh",
    desc: "Gom đơn từ các kênh bán hàng",
    icon: "bi-shop",
  },
  {
    num: 4,
    id: "RETURN",
    title: "Hàng trả về",
    desc: "Xử lý hàng trả về",
    icon: "bi-arrow-return-left",
  },
];

export function QuotationsContent() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER" || session?.user?.role === "SUPERADMIN";

  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(2);
  const [statusFilter, setStatusFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Step 2: Orders state
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderTimeFilter, setOrderTimeFilter] = useState("");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orderEmployeeFilter, setOrderEmployeeFilter] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Step 4: Returns state
  const [returnStatusFilter, setReturnStatusFilter] = useState("");
  const [returnSearchTerm, setReturnSearchTerm] = useState("");
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returns, setReturns] = useState<any[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);

  useEffect(() => {
    if (isManager) {
      fetch("/api/hr/employees")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setEmployees(data);
          else if (data.data && Array.isArray(data.data)) setEmployees(data.data);
        })
        .catch(err => console.error("Error fetching employees", err));
    }
  }, [isManager]);

  // Backend quotation list state
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal control states
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isDonHangModalOpen, setIsDonHangModalOpen] = useState(false);
  const [isDirectOrder, setIsDirectOrder] = useState(false);
  const [quotationEditData, setQuotationEditData] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [selectedQ, setSelectedQ] = useState<any>(null);

  // Customer selection modal states
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false);
  const [customerTab, setCustomerTab] = useState<"dai_ly" | "vang_lai">("dai_ly");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState<string[]>([]);

  // Function to fetch customers
  const fetchCustomers = async (search: string = "") => {
    try {
      const nhom = customerTab === "dai_ly" ? "dai-ly" : "ca-nhan";
      const res = await fetch(`/api/plan-finance/customers?search=${search}&nhom=${nhom}`);
      if (res.ok) {
        const data = await res.json();
        setCustomersList(data.customers || []);
      }
    } catch (e) {
      console.error("Lỗi tải danh sách khách hàng", e);
    }
  };

  // Bulk delete states
  const [confirmDeleteBaoGia, setConfirmDeleteBaoGia] = useState(false);
  const [confirmDeleteDonHang, setConfirmDeleteDonHang] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBaoGia = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/plan-finance/quotations/${id}`, { method: "DELETE" })
        )
      );
      toast.success("Thành công", "Đã xoá các báo giá được chọn");
      setSelectedIds(new Set());
      fetchQuotations();
    } catch (e) {
      console.error(e);
      toast.error("Lỗi", "Không thể xoá báo giá");
    } finally {
      setIsDeleting(false);
      setConfirmDeleteBaoGia(false);
    }
  };

  const handleDeleteDonHang = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedOrderIds).map(id =>
          fetch(`/api/plan-finance/sales/${id}`, { method: "DELETE" })
        )
      );
      toast.success("Thành công", "Đã xoá các đơn hàng được chọn");
      setSelectedOrderIds(new Set());
      fetchOrders();
    } catch (e) {
      console.error(e);
      toast.error("Lỗi", "Không thể xoá đơn hàng");
    } finally {
      setIsDeleting(false);
      setConfirmDeleteDonHang(false);
    }
  };

  // Fetch quotations list from backend
  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("type", "retail");
      if (statusFilter) params.append("trangThai", statusFilter);
      if (timeFilter) params.append("time", timeFilter);
      if (searchTerm) params.append("search", searchTerm);
      if (employeeFilter) params.append("employeeId", employeeFilter);
      params.append("page", "1");

      const res = await fetch(`/api/plan-finance/quotations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items.map((it: any) => ({
          id: it.id,
          soBaoGia: it.code || "BG-—",
          khachHang: it.customer?.name || "Khách hàng vãng lai",
          diaChi: it.customer?.address || "Không rõ địa chỉ",
          giaTri: it.thanhTien,
          trangThai: it.trangThai || "draft",
          ngayTao: new Date(it.createdAt).toLocaleDateString("vi-VN"),
        }));
        setQuotations(items);
      }
    } catch (e) {
      console.error("Lỗi tải báo giá", e);
      toast.error("Lỗi", "Không thể tải danh sách báo giá");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter, searchTerm, timeFilter, employeeFilter]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (orderStatusFilter) params.append("trangThai", orderStatusFilter);
      if (orderTimeFilter) params.append("time", orderTimeFilter);
      if (orderSearchTerm) params.append("search", orderSearchTerm);
      if (orderEmployeeFilter) params.append("employeeId", orderEmployeeFilter);
      params.append("page", "1");

      const res = await fetch(`/api/plan-finance/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items.map((it: any) => ({
          id: it.id,
          maDonHang: it.code || "DH-—",
          khachHang: it.customer?.name || "Khách hàng vãng lai",
          diaChi: it.customer?.address || "",
          ngayTao: it.ngayDat ? new Date(it.ngayDat).toLocaleDateString("vi-VN") : "—",
          ngayGiao: it.ngayGiao ? new Date(it.ngayGiao).toLocaleDateString("vi-VN") : "—",
          giaTri: it.tongTien || 0,
          trangThai: it.trangThai || "active",
        }));
        setOrders(items);
      }
    } catch (e) {
      console.error("Lỗi tải đơn hàng", e);
      toast.error("Lỗi", "Không thể tải danh sách đơn hàng");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (showCustomerSelectModal) {
      fetchCustomers(customerSearchTerm);
      setSelectedToDelete([]);
    }
  }, [showCustomerSelectModal, customerSearchTerm, customerTab]);

  const handleBatchDeleteCustomers = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá ${selectedToDelete.length} khách hàng vãng lai đã chọn?`)) return;
    
    try {
      for (const id of selectedToDelete) {
        await fetch(`/api/plan-finance/customers/${id}`, { method: "DELETE" });
      }
      toast.success("Thành công", `Đã xoá ${selectedToDelete.length} khách hàng vãng lai.`);
      setSelectedToDelete([]);
      fetchCustomers(customerSearchTerm);
    } catch (e) {
      toast.error("Lỗi", "Không thể xoá khách hàng đã chọn.");
    }
  };

  const fetchReturns = async () => {
    setReturnsLoading(true);
    try {
      const res = await fetch(`/api/production/defects`);
      if (res.ok) {
        const data = await res.json();
        // Lọc các hồ sơ lỗi do phòng Kinh doanh (Sales) khởi tạo
        let items = data.filter((d: any) => 
          (d.reporterDepartment || '').toLowerCase().includes('kinh doanh') ||
          (d.reporterDepartment || '').toLowerCase().includes('sales')
        );
        
        if (returnStatusFilter) {
          items = items.filter((d: any) => d.status === returnStatusFilter);
        }
        if (returnSearchTerm) {
          items = items.filter((d: any) => 
            (d.code || '').toLowerCase().includes(returnSearchTerm.toLowerCase()) ||
            (d.customerName || '').toLowerCase().includes(returnSearchTerm.toLowerCase()) ||
            (d.orderNumber || '').toLowerCase().includes(returnSearchTerm.toLowerCase())
          );
        }

        setReturns(items);
      }
    } catch (e) {
      console.error("Lỗi tải danh sách hàng trả về", e);
      toast.error("Lỗi", "Không thể tải danh sách hàng trả về");
    } finally {
      setReturnsLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep === 4) {
      fetchReturns();
    }
  }, [currentStep, returnStatusFilter, returnSearchTerm]);

  useEffect(() => {
    if (currentStep === 2) {
      fetchOrders();
    }
  }, [currentStep, orderStatusFilter, orderSearchTerm, orderTimeFilter, orderEmployeeFilter]);

  // Fetch customers list for autocomplete search
  useEffect(() => {
    if (!showCustomerSelectModal) return;
    const timer = setTimeout(async () => {
      try {
        const nhom = customerTab === "dai_ly" ? "dai-ly" : "ca-nhan";
        const res = await fetch(`/api/plan-finance/customers?search=${customerSearchTerm}&nhom=${nhom}`);
        if (res.ok) {
          const data = await res.json();
          setCustomersList(data.customers || []);
        }
      } catch (e) {
        console.error("Lỗi tải danh sách khách hàng", e);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearchTerm, showCustomerSelectModal, customerTab]);

  // Trigger modal in edit mode
  const handleEditQuotation = async (row: Quotation) => {
    try {
      const res = await fetch(`/api/plan-finance/quotations/${row.id}`);
      if (res.ok) {
        const fullData = await res.json();
        const editData = {
          id: fullData.id,
          code: fullData.code,
          customerId: fullData.customerId,
          trangThai: fullData.trangThai,
          uuTien: fullData.uuTien,
          tongTien: fullData.tongTien,
          discount: fullData.discount,
          vat: fullData.vat,
          chiPhiThiCong: fullData.chiPhiThiCong,
          thanhTien: fullData.thanhTien,
          ghiChu: fullData.ghiChu,
          fileKhuVuc1: fullData.fileKhuVuc1,
          fileKhuVuc2: fullData.fileKhuVuc2,
          fileKhuVuc3: fullData.fileKhuVuc3,
          fileKhuVuc4: fullData.fileKhuVuc4,
          fileKhuVuc5: fullData.fileKhuVuc5,
          items: fullData.items.map((it: any) => ({
            id: it.id,
            tenHang: it.tenHang,
            donVi: it.donVi,
            soLuong: it.soLuong,
            donGia: it.donGia,
            thanhTien: it.thanhTien,
            ghiChu: it.ghiChu,
            sortOrder: it.sortOrder
          }))
        };
        setSelectedCustomer(fullData.customer ? {
          id: fullData.customer.id,
          name: fullData.customer.name,
          nhom: fullData.customer.nhom || "ca-nhan",
          nguon: fullData.customer.nguon || null,
          dienThoai: fullData.customer.dienThoai || null,
          email: fullData.customer.email || null,
          address: fullData.customer.address || null,
          daiDien: fullData.customer.daiDien || null,
          xungHo: fullData.customer.xungHo || null,
          chucVu: fullData.customer.chucVu || null,
          ghiChu: fullData.customer.ghiChu || null,
          nguoiChamSoc: null,
          nguoiChamSocId: null,
          createdAt: fullData.customer.createdAt
        } : null);
        setQuotationEditData(editData);
        setIsQuotationModalOpen(true);
      }
    } catch (e) {
      console.error("Lỗi tải chi tiết báo giá", e);
      toast.error("Lỗi", "Không thể tải chi tiết báo giá");
    }
  };

  // Select customer from list
  const handleSelectCustomer = (c: any) => {
    setSelectedCustomer({
      id: c.id,
      name: c.name,
      nhom: c.nhom || "ca-nhan",
      nguon: c.nguon || null,
      dienThoai: c.dienThoai || null,
      email: c.email || null,
      address: c.address || null,
      daiDien: c.daiDien || null,
      xungHo: c.xungHo || null,
      chucVu: c.chucVu || null,
      ghiChu: c.ghiChu || null,
      nguoiChamSoc: c.nguoiChamSoc || null,
      nguoiChamSocId: c.nguoiChamSocId || null,
      createdAt: c.createdAt
    });
    setQuotationEditData(null); // Create mode
    setShowCustomerSelectModal(false);
    if (isDirectOrder) {
      setIsDonHangModalOpen(true);
    } else {
      setIsQuotationModalOpen(true);
    }
  };

  // Select walk-in retail customer
  const handleSelectWalkIn = () => {
    setSelectedCustomer({
      id: "",
      name: "Khách hàng mua lẻ",
      nhom: "ca-nhan",
      nguon: "walk-in",
      dienThoai: "",
      email: "",
      address: "Khách vãng lai tại quầy",
      daiDien: "",
      xungHo: "Anh/Chị",
      chucVu: "",
      ghiChu: "",
      nguoiChamSoc: null,
      nguoiChamSocId: null,
      createdAt: new Date().toISOString()
    });
    setQuotationEditData(null); // Create mode
    setShowCustomerSelectModal(false);
    if (isDirectOrder) {
      setIsDonHangModalOpen(true);
    } else {
      setIsQuotationModalOpen(true);
    }
  };

  const returnColumns: TableColumn<any>[] = useMemo(() => {
    return [
      {
        header: "Mã lỗi",
        render: (row) => {
          const getSourceLabel = (s: string) => {
            if (s === 'INTERNAL') return "Nội bộ";
            if (s === 'WARRANTY') return "Bảo hành";
            if (s === 'RETURN') return "Trả về";
            return s;
          };
          return (
            <div>
              <div className="fw-bold text-primary cursor-pointer hover-underline">{row.code || "ERR-—"}</div>
              <div className="mt-1">
                <span className="badge bg-light border text-dark fw-normal" style={{ fontSize: "0.75rem" }}>
                  {getSourceLabel(row.source)}
                </span>
              </div>
            </div>
          );
        },
        width: "140px",
      },
      {
        header: "Khách hàng",
        render: (row) => (
          <div>
            <div className="text-dark fw-semibold">{row.customerName || "—"}</div>
            {row.customerAddress && <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>{row.customerAddress}</div>}
          </div>
        ),
      },
      {
        header: "Đơn hàng",
        render: (row) => (
          <span className="text-dark">{row.orderNumber || "—"}</span>
        ),
      },
      {
        header: "Ngày tạo",
        render: (row) => <span>{row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "—"}</span>,
        width: "140px",
      },
      {
        header: "Mô tả lỗi",
        render: (row) => <span className="text-muted text-truncate d-inline-block" style={{ maxWidth: 250 }} title={row.description}>{row.description || "—"}</span>,
      },
      {
        header: "Trạng thái",
        render: (row) => {
          const getStatusBadge = (status: string) => {
            switch (status) {
              case 'NEW': return <span className="badge bg-primary">Chưa xử lý</span>;
              case 'TECH_EVALUATING': return <span className="badge bg-info">Đang chẩn đoán</span>;
              case 'WAITING_APPROVAL': return <span className="badge bg-warning text-dark">Chờ duyệt</span>;
              case 'PROCESSING': return <span className="badge bg-secondary">Đang xử lý</span>;
              case 'WAITING_INVENTORY': return <span className="badge bg-secondary">Đang thực hiện</span>;
              case 'COMPLETED': return <span className="badge bg-success">Đã xử lý</span>;
              default: return <span className="badge bg-light text-dark">{status || 'Chưa xử lý'}</span>;
            }
          };
          return getStatusBadge(row.status);
        },
        align: "center",
        width: "120px",
      },
    ];
  }, []);

  const orderColumns: TableColumn<any>[] = useMemo(() => {
    return [
      {
        header: (
          <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
            <input
              type="checkbox"
              className="form-check-input cursor-pointer"
              checked={orders.length > 0 && orders.every(o => selectedOrderIds.has(o.id))}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedOrderIds(new Set(orders.map(o => o.id)));
                } else {
                  setSelectedOrderIds(new Set());
                }
              }}
            />
          </div>
        ),
        render: (row) => (
          <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
            <input
              type="checkbox"
              className="form-check-input cursor-pointer"
              checked={selectedOrderIds.has(row.id)}
              onChange={(e) => {
                const checked = e.target.checked;
                setSelectedOrderIds(prev => {
                  const next = new Set(prev);
                  if (checked) {
                    next.add(row.id);
                  } else {
                    next.delete(row.id);
                  }
                  return next;
                });
              }}
            />
          </div>
        ),
        width: "40px",
        align: "center",
      },
      {
        header: "Mã đơn hàng",
        render: (row) => (
          <div style={{ whiteSpace: "nowrap" }}>
            <span className="fw-bold text-primary cursor-pointer hover-underline">{row.maDonHang}</span>
          </div>
        ),
        width: "180px",
      },
      {
        header: "Khách hàng",
        render: (row) => (
          <div>
            <div className="text-dark fw-semibold">{row.khachHang}</div>
            {row.diaChi && <div className="text-muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>{row.diaChi}</div>}
          </div>
        ),
      },
      {
        header: "Ngày tạo đơn",
        render: (row) => <span>{row.ngayTao}</span>,
        width: "140px",
      },
      {
        header: "Ngày giao hàng",
        render: (row) => <span>{row.ngayGiao}</span>,
        width: "140px",
      },
      {
        header: "Giá trị (đ)",
        render: (row) => <span className="fw-bold text-dark">{row.giaTri.toLocaleString("vi-VN")}</span>,
        align: "right",
        width: "180px",
      },
      {
        header: "Trạng thái",
        render: (row) => <StatusBadge status={row.trangThai} />,
        align: "center",
        width: "140px",
      },
    ];
  }, [orders, selectedOrderIds]);

  const columns: TableColumn<Quotation>[] = useMemo(() => {
    return [
      {
        header: (
          <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
            <input
              type="checkbox"
              className="form-check-input cursor-pointer"
              checked={quotations.length > 0 && quotations.every(p => selectedIds.has(p.id))}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(new Set(quotations.map(p => p.id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
            />
          </div>
        ),
        render: (row) => (
          <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
            <input
              type="checkbox"
              className="form-check-input cursor-pointer"
              checked={selectedIds.has(row.id)}
              onChange={(e) => {
                const checked = e.target.checked;
                setSelectedIds(prev => {
                  const next = new Set(prev);
                  if (checked) {
                    next.add(row.id);
                  } else {
                    next.delete(row.id);
                  }
                  return next;
                });
              }}
            />
          </div>
        ),
        width: "40px",
        align: "center",
      },
      {
        header: "Số báo giá",
        render: (row) => (
          <div>
            <span className="fw-bold text-primary cursor-pointer hover-underline">{row.soBaoGia}</span>
            <div className="text-muted small mt-1" style={{ fontSize: "11px" }}>Ngày tạo: {row.ngayTao}</div>
          </div>
        ),
        width: "160px",
      },
      {
        header: "Khách hàng",
        render: (row) => (
          <div>
            <span className="text-dark fw-semibold">{row.khachHang}</span>
            <div className="text-muted small mt-1" style={{ fontWeight: 400, fontSize: "11px" }}>{row.diaChi}</div>
          </div>
        ),
      },
      {
        header: "Giá trị (đ)",
        render: (row) => <span className="fw-bold text-dark">{row.giaTri.toLocaleString("vi-VN")}</span>,
        align: "right",
        width: "180px",
      },
      {
        header: "Trạng thái",
        render: (row) => <StatusBadge status={row.trangThai} />,
        align: "center",
        width: "180px",
      },
    ];
  }, [quotations, selectedIds]);

  return (
    <>
      <WorkflowCard
        contentPadding="p-0"
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
        <div className="flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: 0 }}>
          {currentStep === 1 && (
            <FullWidthTableLayout
              className="flex-grow-1 overflow-hidden"
              style={{ minHeight: 0 }}
              header={
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 600 }}>
                  {/* Bộ lọc theo trạng thái */}
                  <FilterSelect
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Tất cả trạng thái"
                    width={180}
                  />

                  {/* Bộ lọc thời gian */}
                  <FilterSelect 
                    options={[
                      { label: "Hôm nay", value: "today" },
                      { label: "Hôm qua", value: "yesterday" },
                      { label: "Tuần này", value: "this_week" },
                      { label: "Tuần trước", value: "last_week" },
                      { label: "Tháng này", value: "this_month" },
                      { label: "Tháng trước", value: "last_month" },
                      { label: "Năm nay", value: "this_year" },
                    ]}
                    value={timeFilter}
                    onChange={setTimeFilter}
                    placeholder="Thời gian"
                    width={150}
                  />

                  {/* Hộp tìm kiếm */}
                  <div className="flex-grow-1" style={{ maxWidth: 300 }}>
                    <SearchInput
                      placeholder="Tìm kiếm..."
                      value={searchTerm}
                      onChange={setSearchTerm}
                    />
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  {selectedIds.size > 0 && (
                    <button
                      className="btn btn-danger px-3 d-flex align-items-center justify-content-center gap-2"
                      style={{
                        height: 34,
                        fontSize: "12.5px",
                        borderRadius: 8,
                        fontWeight: 700,
                        whiteSpace: "nowrap"
                      }}
                      onClick={() => setConfirmDeleteBaoGia(true)}
                    >
                      <i className="bi bi-trash" /> Xoá
                    </button>
                  )}
                  {/* Nút thêm mới */}
                <button
                  className="btn text-white px-3 d-flex align-items-center justify-content-center gap-2"
                  style={{
                    height: 34,
                    fontSize: "12.5px",
                    backgroundColor: "#003087",
                    borderColor: "#003087",
                    borderRadius: 8,
                    fontWeight: 700,
                    whiteSpace: "nowrap"
                  }}
                  onClick={() => {
                    setIsDirectOrder(false);
                    setSelectedCustomer(null);
                    setQuotationEditData(null);
                    setShowCustomerSelectModal(true);
                  }}
                >
                  <i className="bi bi-plus-lg" />
                  Thêm mới
                </button>
                </div>
                </div>
              }
              table={
                <Table
                  columns={columns}
                  rows={quotations}
                  loading={loading}
                  rowKey={(row) => row.id}
                  emptyText="Không tìm thấy báo giá nào phù hợp"
                  compact={true}
                  stickyHeader={true}
                  onRowClick={setSelectedQ}
                  wrapperStyle={{ overflowY: "auto", flex: 1, minHeight: 0 }}
                />
              }
            />
          )}
          {currentStep === 2 && (
            <FullWidthTableLayout
              className="flex-grow-1 overflow-hidden"
              style={{ minHeight: 0 }}
              header={
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 600 }}>
                  {/* Bộ lọc theo trạng thái */}
                  <FilterSelect
                    options={ORDER_STATUS_OPTIONS}
                    value={orderStatusFilter}
                    onChange={setOrderStatusFilter}
                    placeholder="Tất cả trạng thái"
                    width={180}
                  />

                  {/* Bộ lọc thời gian */}
                  <FilterSelect 
                    options={[
                      { label: "Hôm nay", value: "today" },
                      { label: "Hôm qua", value: "yesterday" },
                      { label: "Tuần này", value: "this_week" },
                      { label: "Tuần trước", value: "last_week" },
                      { label: "Tháng này", value: "this_month" },
                      { label: "Tháng trước", value: "last_month" },
                      { label: "Năm nay", value: "this_year" },
                    ]}
                    value={orderTimeFilter}
                    onChange={setOrderTimeFilter}
                    placeholder="Thời gian"
                    width={150}
                  />

                  {/* Hộp tìm kiếm */}
                  <div className="flex-grow-1" style={{ maxWidth: 300 }}>
                    <SearchInput 
                      placeholder="Tìm kiếm..."
                      value={orderSearchTerm}
                      onChange={setOrderSearchTerm}
                    />
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  {selectedOrderIds.size > 0 && (
                    <button
                      className="btn btn-danger px-3 d-flex align-items-center justify-content-center gap-2"
                      style={{
                        height: 34,
                        fontSize: "12.5px",
                        borderRadius: 8,
                        fontWeight: 700,
                        whiteSpace: "nowrap"
                      }}
                      onClick={() => setConfirmDeleteDonHang(true)}
                    >
                      <i className="bi bi-trash" /> Xoá
                    </button>
                  )}
                  {/* Nút thêm mới */}
                  <button
                    className="btn text-white px-3 d-flex align-items-center justify-content-center gap-2"
                    style={{
                      height: 34,
                      fontSize: "12.5px",
                      backgroundColor: "#003087",
                      borderColor: "#003087",
                      borderRadius: 8,
                      fontWeight: 700,
                      whiteSpace: "nowrap"
                    }}
                    onClick={() => {
                      setIsDirectOrder(true);
                      setSelectedCustomer(null);
                      setQuotationEditData(null);
                      setShowCustomerSelectModal(true);
                    }}
                  >
                    <i className="bi bi-plus-lg" />
                    Thêm mới
                  </button>
                </div>
                </div>
              }
              table={
                <Table
                  columns={orderColumns}
                  rows={orders}
                  loading={ordersLoading}
                  rowKey={(row) => row.id}
                  emptyText="Không tìm thấy đơn hàng nào phù hợp"
                  compact={true}
                  stickyHeader={true}
                  onRowClick={(row) => setSelectedOrderId(row.id)}
                  wrapperStyle={{ overflowY: "auto", flex: 1, minHeight: 0 }}
                />
              }
            />
          )}
          {currentStep === 3 && (
            <OmnichannelContent />
          )}
          {currentStep === 4 && (
            <FullWidthTableLayout
              className="flex-grow-1 overflow-hidden"
              style={{ minHeight: 0 }}
              header={
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                  <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 600 }}>
                    <FilterSelect
                      options={[
                        { label: "Chưa xử lý", value: "NEW" },
                        { label: "Đã xử lý", value: "COMPLETED" },
                      ]}
                      value={returnStatusFilter}
                      onChange={setReturnStatusFilter}
                      placeholder="Tất cả trạng thái"
                      width={180}
                    />
                    <div className="flex-grow-1" style={{ maxWidth: 300 }}>
                      <SearchInput
                        placeholder="Tìm kiếm..."
                        value={returnSearchTerm}
                        onChange={setReturnSearchTerm}
                      />
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn text-white px-3 d-flex align-items-center justify-content-center gap-2"
                      style={{
                        height: 34,
                        fontSize: "12.5px",
                        backgroundColor: "#003087",
                        borderColor: "#003087",
                        borderRadius: 8,
                        fontWeight: 700,
                        whiteSpace: "nowrap"
                      }}
                      onClick={() => setIsReturnModalOpen(true)}
                    >
                      <i className="bi bi-plus-lg" />
                      Tạo mới
                    </button>
                  </div>
                </div>
              }
              table={
                <Table
                  columns={returnColumns}
                  rows={returns}
                  loading={returnsLoading}
                  rowKey={(row) => row.id}
                  emptyText="Không tìm thấy hồ sơ lỗi nào"
                  compact={true}
                  stickyHeader={true}
                  wrapperStyle={{ overflowY: "auto", flex: 1, minHeight: 0 }}
                />
              }
            />
          )}
        </div>
      </WorkflowCard>

      {/* Customer Selection Offcanvas */}
      {showCustomerSelectModal && (
        <>
          <div className="offcanvas-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setShowCustomerSelectModal(false)}></div>
          <div className="offcanvas offcanvas-end show d-flex flex-column shadow-lg border-start-0" style={{ width: 400, zIndex: 1060, visibility: "visible" }} tabIndex={-1}>
            <div className="offcanvas-header bg-light border-bottom py-3 px-4 flex-shrink-0">
              <h5 className="offcanvas-title fw-bold text-dark" style={{ fontSize: 15 }}>
                {isDirectOrder ? "Chọn khách hàng cho đơn hàng" : "Chọn khách hàng cho báo giá"}
              </h5>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setShowCustomerSelectModal(false)}
                />
              </div>
              <div className="offcanvas-body p-4 d-flex flex-column overflow-hidden">
                <div className="d-flex bg-light p-1 rounded-3 mb-3 flex-shrink-0">
                  <button
                    className={`btn flex-grow-1 rounded-2 shadow-none py-1.5 ${customerTab === "dai_ly" ? "bg-white text-primary border shadow-sm" : "border-0 text-muted"}`}
                    style={{ fontSize: 13, fontWeight: customerTab === "dai_ly" ? 600 : 500, height: 36 }}
                    onClick={() => setCustomerTab("dai_ly")}
                  >
                    Đại lý
                  </button>
                  <button
                    className={`btn flex-grow-1 rounded-2 shadow-none py-1.5 ms-1 ${customerTab === "vang_lai" ? "bg-white text-primary border shadow-sm" : "border-0 text-muted"}`}
                    style={{ fontSize: 13, fontWeight: customerTab === "vang_lai" ? 600 : 500, height: 36 }}
                    onClick={() => setCustomerTab("vang_lai")}
                  >
                    Khách vãng lai
                  </button>
                </div>

                <div className="d-flex flex-column gap-3 h-100 overflow-hidden">
                  <div className="d-flex gap-2 flex-shrink-0">
                    <div className="flex-grow-1">
                      <SearchInput
                        value={customerSearchTerm}
                        onChange={(val) => setCustomerSearchTerm(val)}
                        placeholder="Tìm tên, số điện thoại..."
                        className="bg-light border-light shadow-none"
                        style={{ fontSize: 13, height: 38 }}
                      />
                    </div>
                  </div>

                  {customerTab === "vang_lai" && (
                    <div className="flex-shrink-0">
                      <button
                        className="btn w-100 d-flex align-items-center justify-content-between p-3 rounded-3 border text-start shadow-sm"
                        onClick={handleSelectWalkIn}
                        style={{
                          backgroundColor: "rgba(0, 48, 135, 0.04)",
                          borderColor: "rgba(0, 48, 135, 0.15)",
                          color: "#003087",
                          fontWeight: 700,
                          transition: "all 0.15s"
                        }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: 32, height: 32, backgroundColor: "#003087" }}>
                            <i className="bi bi-people" style={{ fontSize: 15 }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5 }}>Tạo khách vãng lai mới</div>
                            <div className="text-muted fw-normal" style={{ fontSize: 11 }}>Nhập thông tin tại màn hình tạo đơn</div>
                          </div>
                        </div>
                        <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  )}

                  <div className="border-top pt-2 mt-1 d-flex flex-column flex-grow-1 overflow-hidden">
                    <div className="text-muted small fw-bold text-uppercase mb-2 flex-shrink-0 d-flex justify-content-between align-items-center" style={{ letterSpacing: "0.04em", fontSize: 10 }}>
                      <span>Khách hàng hiện tại</span>
                      {selectedToDelete.length > 0 && (
                        <button
                          onClick={handleBatchDeleteCustomers}
                          className="btn btn-sm btn-danger py-0 px-2 fw-bold"
                          style={{ fontSize: 10 }}
                        >
                          Xoá đã chọn
                          <span className="badge rounded-pill bg-white text-danger ms-1 px-1 py-0" style={{ fontSize: 9 }}>
                            {selectedToDelete.length}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="overflow-auto list-group rounded-0 flex-grow-1">
                      {customersList.length === 0 ? (
                        <div className="text-center py-4 text-muted small">
                          <i className="bi bi-inbox fs-4 d-block mb-1 opacity-50" />
                          Không tìm thấy khách hàng nào
                        </div>
                      ) : (
                        customersList.map((c) => (
                          <div
                            key={c.id}
                            className="list-group-item list-group-item-action border rounded-3 p-3 mb-2 d-flex align-items-center cursor-pointer gap-2"
                            onClick={() => handleSelectCustomer(c)}
                          >
                            {customerTab === "vang_lai" && (
                              <div onClick={(e) => e.stopPropagation()} title={c.outstandingDebt > 0 ? "Không thể xoá khách hàng đang có công nợ" : "Chọn để xoá"}>
                                <input
                                  type="checkbox"
                                  className="form-check-input mt-0 cursor-pointer"
                                  style={{ width: 16, height: 16 }}
                                  disabled={c.outstandingDebt > 0}
                                  checked={selectedToDelete.includes(c.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedToDelete(prev => [...prev, c.id]);
                                    else setSelectedToDelete(prev => prev.filter(id => id !== c.id));
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex-grow-1 ms-1">
                              <div className="fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: 13.5 }}>
                                {c.name}
                                {c.outstandingDebt > 0 && <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25" style={{ fontSize: 9 }}>Có công nợ</span>}
                              </div>
                              <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                                {c.address ? (
                                  <span><i className="bi bi-geo-alt me-1" />{c.address}</span>
                                ) : (
                                  <span className="fst-italic opacity-75">Chưa có thông tin địa chỉ</span>
                                )}
                              </div>
                            </div>
                            <i className="bi bi-chevron-right text-muted" style={{ fontSize: 12 }} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </>
      )}

      {/* Main Fullscreen Quotation Creator Modal */}
      {isQuotationModalOpen && (
        <BaoGiaSanitaryModal
          open={isQuotationModalOpen}
          onClose={() => {
            setIsQuotationModalOpen(false);
            setQuotationEditData(null);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          editData={quotationEditData}
          type="retail"
          isDirectOrder={false}
          onSaved={() => {
            setIsQuotationModalOpen(false);
            setQuotationEditData(null);
            setSelectedCustomer(null);
            fetchQuotations();
          }}
        />
      )}

      {/* Standalone Fullscreen Order Creator Modal */}
      {isDonHangModalOpen && (
        <TaoDonHangModal
          open={isDonHangModalOpen}
          onClose={() => {
            setIsDonHangModalOpen(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          type="retail"
          onSaved={() => {
            setIsDonHangModalOpen(false);
            setSelectedCustomer(null);
            fetchOrders();
          }}
        />
      )}

      {/* Side Offcanvas Detail View */}
      <ChiTietBaoGia
        q={selectedQ}
        onClose={() => setSelectedQ(null)}
        onDeleted={fetchQuotations}
      />

      {/* Side Offcanvas Order Detail View */}
      <ChiTietDonHang
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onSaved={fetchOrders}
      />

      <ConfirmDialog
        open={confirmDeleteBaoGia}
        title="Xác nhận xoá"
        message={`Bạn có chắc chắn muốn xoá ${selectedIds.size} báo giá đã chọn không?`}
        confirmLabel={isDeleting ? "Đang xoá..." : "Xoá"}
        onConfirm={handleDeleteBaoGia}
        onCancel={() => setConfirmDeleteBaoGia(false)}
      />

      <ConfirmDialog
        open={confirmDeleteDonHang}
        title="Xác nhận xoá"
        message={`Bạn có chắc chắn muốn xoá ${selectedOrderIds.size} đơn hàng đã chọn không?`}
        confirmLabel={isDeleting ? "Đang xoá..." : "Xoá"}
        onConfirm={handleDeleteDonHang}
        onCancel={() => setConfirmDeleteDonHang(false)}
      />
      
      <CreateDefectOffcanvas 
        show={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onRefresh={fetchReturns}
        defaultSource="RETURN"
      />
    </>
  );
}

export default function QuotationsPage() {
  return (
    <StandardPage
      title="Bán hàng"
      description="Khởi tạo báo giá và chuyển đổi đơn hàng nhanh chóng"
      icon="bi-file-text"
      color="cyan"
      useCard={false}
    >
      <QuotationsContent />
    </StandardPage>
  );
}
