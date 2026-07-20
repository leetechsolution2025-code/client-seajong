"use client";

import React, { useState, useEffect, useCallback } from "react";
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

interface CustomerRow {
  id: string;
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
          } catch(e) {}
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
      render: (row) => <span className="fw-medium text-primary">{row.orderCode || "—"}</span>
    },
    {
      header: "Giá trị",
      align: "right",
      render: (row) => <span className="fw-medium">{(row.totalAmount || 0).toLocaleString("vi-VN")} ₫</span>
    },
    {
      header: "Đã thanh toán",
      render: (row) => {
        const total = row.totalAmount || 0;
        const paid = row.paidAmount || 0;
        const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
        return (
          <div className="d-flex flex-column gap-1 w-100" style={{ minWidth: 120 }}>
            <span className="fw-medium text-dark" style={{ fontSize: "13px" }}>
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
      render: (row) => <span className="text-muted" style={{ fontSize: "13px" }}>{row.note || "—"}</span>
    }
  ];

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
                  disabled
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
                    <div className="col-12 col-lg-4">
                      <div className="bg-card rounded-4 shadow-sm border p-3 h-100">
                        <SectionTitle title="Thông tin chung" />
                      </div>
                    </div>
                    {/* Cột phải */}
                    <div className="col-12 col-lg-8">
                      <div className="bg-card rounded-4 shadow-sm border p-3 h-100 d-flex flex-column">
                        <SectionTitle title="Dữ liệu hoạt động của đại lý" />
                        <div className="flex-grow-1 mt-3" style={{ minHeight: 0 }}>
                          <Table
                            columns={orderColumns}
                            rows={[]} 
                            emptyText="Chưa có dữ liệu hoạt động"
                            compact
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
                  <button
                    onClick={() => {
                      handleOpenEdit();
                      setShowDetailOffcanvas(false);
                    }}
                    className="btn btn-outline-primary d-flex align-items-center justify-content-center px-4"
                    style={{ borderRadius: "8px", fontWeight: 500 }}
                    title="Chỉnh sửa thông tin khách hàng"
                  >
                    <i className="bi bi-pencil me-2" /> Chỉnh sửa
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirmOpen(true);
                      setShowDetailOffcanvas(false);
                    }}
                    className="btn btn-outline-danger d-flex align-items-center justify-content-center px-4"
                    style={{ borderRadius: "8px", fontWeight: 500 }}
                    title="Xoá khách hàng"
                  >
                    <i className="bi bi-trash me-2" /> Xoá
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
    </div>
  );
}

