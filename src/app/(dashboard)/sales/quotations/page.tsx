"use client";

import React, { useState, useMemo, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TableColumn } from "@/components/ui/Table";
import { BaoGiaSanitaryModal, CustomerRow } from "@/components/plan-finance/bao_gia/BaoGiaSanitaryModal";
import { TaoDonHangModal } from "@/components/plan-finance/bao_gia/TaoDonHangModal";
import { ChiTietBaoGia } from "@/components/plan-finance/bao_gia/ChiTietBaoGia";
import { ChiTietDonHang } from "@/components/plan-finance/bao_gia/ChiTietDonHang";
import { useToast } from "@/components/ui/Toast";

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
  };
  const m = map[status.toLowerCase()] ?? { label: status, cls: "bg-light text-dark" };
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
    id: "RESERVATION",
    title: "Báo giữ hàng",
    desc: "Quản lý giữ hàng & cọc",
    icon: "bi-bookmark-star",
  },
];

export default function QuotationsPage() {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Step 2: Orders state
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  // Quick create customer form states
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Fetch quotations list from backend
  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("type", "retail");
      if (statusFilter) params.append("trangThai", statusFilter);
      if (searchTerm) params.append("search", searchTerm);
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
  }, [statusFilter, searchTerm]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (orderStatusFilter) params.append("trangThai", orderStatusFilter);
      if (orderSearchTerm) params.append("search", orderSearchTerm);
      params.append("page", "1");

      const res = await fetch(`/api/plan-finance/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items.map((it: any) => ({
          id: it.id,
          maDonHang: it.code || "DH-—",
          khachHang: it.customer?.name || "Khách hàng vãng lai",
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
    if (currentStep === 2) {
      fetchOrders();
    }
  }, [currentStep, orderStatusFilter, orderSearchTerm]);

  // Fetch customers list for autocomplete search
  useEffect(() => {
    if (!showCustomerSelectModal) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/plan-finance/customers?search=${customerSearchTerm}`);
        if (res.ok) {
          const data = await res.json();
          setCustomersList(data.customers || []);
        }
      } catch (e) {
        console.error("Lỗi tải danh sách khách hàng", e);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearchTerm, showCustomerSelectModal]);

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
          file3DUrl: fullData.file3DUrl,
          fileDetailUrl: fullData.fileDetailUrl,
          fileLayoutUrl: fullData.fileLayoutUrl,
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

  // Handle new customer form submission
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    setIsSavingCustomer(true);
    try {
      const res = await fetch("/api/plan-finance/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          dienThoai: newCustomerPhone.trim(),
          address: newCustomerAddress.trim(),
          nhom: "ca-nhan",
        })
      });
      if (res.ok) {
        const newCust = await res.json();
        toast.success("Thành công", "Đã tạo khách hàng mới");
        handleSelectCustomer(newCust);
        setIsCreatingNewCustomer(false);
      } else {
        const errData = await res.json();
        toast.error("Lỗi", errData.error || "Không thể tạo khách hàng");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi", "Lỗi kết nối máy chủ");
    } finally {
      setIsSavingCustomer(false);
    }
  };

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
          <div>
            <span className="fw-bold text-primary cursor-pointer hover-underline">{row.maDonHang}</span>
          </div>
        ),
        width: "160px",
      },
      {
        header: "Khách hàng",
        render: (row) => (
          <div>
            <span className="text-dark fw-semibold">{row.khachHang}</span>
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
    <StandardPage
      title="Bán hàng"
      description="Khởi tạo báo giá và chuyển đổi đơn hàng nhanh chóng"
      icon="bi-file-text"
      color="cyan"
      useCard={false}
    >
      <div className="bg-white rounded-4 shadow-sm border p-3 p-sm-4 flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: 0 }}>
        {/* Stepper container */}
        <div className="border-bottom pb-1 mb-2 flex-shrink-0">
          <ModernStepper
            steps={STEP_ITEMS}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            paddingX={0}
            paddingY={0}
          />
        </div>

        {/* Step Contents */}
        <div className="flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: 0 }}>
          {currentStep === 1 && (
            <div className="py-2 d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
              {/* Toolbar */}
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 flex-shrink-0">
                <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 600 }}>
                  {/* Bộ lọc theo trạng thái */}
                  <FilterSelect
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Tất cả trạng thái"
                    width={180}
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

              {/* Table container */}
              <div className="flex-grow-1 d-flex flex-column rounded-3 bg-white" style={{ minHeight: 0 }}>
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
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="py-2 d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
              {/* Toolbar */}
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 flex-shrink-0">
                <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 600 }}>
                  {/* Bộ lọc theo trạng thái */}
                  <FilterSelect
                    options={ORDER_STATUS_OPTIONS}
                    value={orderStatusFilter}
                    onChange={setOrderStatusFilter}
                    placeholder="Tất cả trạng thái"
                    width={180}
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

              {/* Table container */}
              <div className="flex-grow-1 d-flex flex-column rounded-3 bg-white" style={{ minHeight: 0 }}>
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
              </div>
            </div>
          )}
          {currentStep === 3 && (
            <div className="py-2 flex-grow-1 overflow-auto">
              <h5 className="fw-bold mb-3">Quản lý Báo giữ hàng</h5>
              <p className="text-muted">Nội dung chi tiết của bước Báo giữ hàng sẽ được thiết kế tại đây.</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Selection Modal Overlay */}
      {showCustomerSelectModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 500 }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-light border-0 py-3 px-4">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: 15 }}>
                  {isCreatingNewCustomer ? "Tạo khách hàng mới" : (isDirectOrder ? "Chọn khách hàng cho đơn hàng" : "Chọn khách hàng cho báo giá")}
                </h5>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => {
                    setShowCustomerSelectModal(false);
                    setIsCreatingNewCustomer(false);
                  }}
                />
              </div>
              <div className="modal-body p-4">
                {!isCreatingNewCustomer ? (
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex gap-2">
                      <div className="position-relative flex-grow-1">
                        <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: 13 }} />
                        <input
                          type="text"
                          className="form-control form-control-sm ps-5 rounded-3 border-light bg-light"
                          placeholder="Tìm tên, số điện thoại..."
                          value={customerSearchTerm}
                          onChange={(e) => setCustomerSearchTerm(e.target.value)}
                          style={{ fontSize: 13, height: 38 }}
                        />
                      </div>
                      <button
                        className="btn btn-outline-primary d-flex align-items-center gap-2 rounded-3 border"
                        onClick={() => {
                          setNewCustomerName("");
                          setNewCustomerPhone("");
                          setNewCustomerAddress("");
                          setIsCreatingNewCustomer(true);
                        }}
                        style={{ fontSize: 13, fontWeight: 600, height: 38, borderColor: "#003087", color: "#003087" }}
                      >
                        <i className="bi bi-person-plus" />
                        Tạo mới
                      </button>
                    </div>

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
                          <div style={{ fontSize: 13.5 }}>Khách hàng mua lẻ vãng lai</div>
                          <div className="text-muted fw-normal" style={{ fontSize: 11 }}>Không lưu thông tin chi tiết</div>
                        </div>
                      </div>
                      <i className="bi bi-chevron-right" />
                    </button>

                    <div className="border-top pt-2 mt-1">
                      <div className="text-muted small fw-bold text-uppercase mb-2" style={{ letterSpacing: "0.04em", fontSize: 10 }}>Khách hàng hiện tại</div>
                      <div className="overflow-auto list-group rounded-0" style={{ maxHeight: 220 }}>
                        {customersList.length === 0 ? (
                          <div className="text-center py-4 text-muted small">
                            <i className="bi bi-inbox fs-4 d-block mb-1 opacity-50" />
                            Không tìm thấy khách hàng nào
                          </div>
                        ) : (
                          customersList.map((c) => (
                            <div
                              key={c.id}
                              className="list-group-item list-group-item-action border rounded-3 p-3 mb-2 d-flex align-items-center justify-content-between cursor-pointer"
                              onClick={() => handleSelectCustomer(c)}
                            >
                              <div>
                                <div className="fw-bold text-dark" style={{ fontSize: 13.5 }}>{c.name}</div>
                                <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                                  {c.dienThoai && <span className="me-3"><i className="bi bi-telephone me-1" />{c.dienThoai}</span>}
                                  {c.address && <span><i className="bi bi-geo-alt me-1" />{c.address}</span>}
                                </div>
                              </div>
                              <i className="bi bi-chevron-right text-muted" style={{ fontSize: 12 }} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateCustomerSubmit} className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label fw-bold text-muted text-uppercase mb-1" style={{ fontSize: 10.5, letterSpacing: "0.04em" }}>Tên khách hàng *</label>
                      <input
                        type="text"
                        className="form-control rounded-3 border-light bg-light"
                        placeholder="Nhập tên khách hàng..."
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        required
                        style={{ fontSize: 13, height: 38 }}
                      />
                    </div>
                    <div>
                      <label className="form-label fw-bold text-muted text-uppercase mb-1" style={{ fontSize: 10.5, letterSpacing: "0.04em" }}>Số điện thoại</label>
                      <input
                        type="text"
                        className="form-control rounded-3 border-light bg-light"
                        placeholder="Nhập số điện thoại..."
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        style={{ fontSize: 13, height: 38 }}
                      />
                    </div>
                    <div>
                      <label className="form-label fw-bold text-muted text-uppercase mb-1" style={{ fontSize: 10.5, letterSpacing: "0.04em" }}>Địa chỉ</label>
                      <input
                        type="text"
                        className="form-control rounded-3 border-light bg-light"
                        placeholder="Nhập địa chỉ..."
                        value={newCustomerAddress}
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                        style={{ fontSize: 13, height: 38 }}
                      />
                    </div>

                    <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-2">
                      <button
                        type="button"
                        className="btn btn-light rounded-3"
                        onClick={() => setIsCreatingNewCustomer(false)}
                        style={{ fontSize: 13, fontWeight: 600, height: 38 }}
                      >
                        Quay lại
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary rounded-3 text-white"
                        disabled={isSavingCustomer}
                        style={{ fontSize: 13, fontWeight: 600, height: 38, backgroundColor: "#003087", borderColor: "#003087" }}
                      >
                        {isSavingCustomer ? "Đang lưu..." : "Tạo & Tiếp tục"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
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
    </StandardPage>
  );
}
