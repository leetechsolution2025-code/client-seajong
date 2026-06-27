"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
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
}

export default function SalesCustomersPage() {
  // States for filters and query
  const [nhomFilter, setNhomFilter] = useState("");
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
  const nhomOptions = [
    { label: "Cá nhân", value: "ca-nhan" },
    { label: "Đại lý", value: "dai-ly" },
    { label: "Loại khác", value: "loai-khac" }
  ];

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
      if (nhomFilter) params.set("nhom", nhomFilter);
      if (hangFilter) params.set("loai", hangFilter);
      const res = await fetch(`/api/plan-finance/customers?${params}`);
      const data = await res.json();
      const fetched = data.customers ?? [];
      setCustomers(fetched);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
      if (fetched.length > 0) {
        setSelectedCustomer(fetched[0]);
      } else {
        setSelectedCustomer(null);
      }
    } catch (err) {
      console.error("Lỗi fetch khách hàng:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, nguonFilter, nhomFilter, hangFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page to 1 when filters or query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, nguonFilter, nhomFilter, hangFilter]);

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
      render: (row) => (
        <div className="d-flex flex-column">
          <span className="fw-bold text-dark">{row.name}</span>
          {row.address && (
            <span className="text-muted" style={{ fontSize: "11px" }}>
              <i className="bi bi-geo-alt me-1" />{row.address}
            </span>
          )}
        </div>
      )
    },
    {
      header: "Thông tin liên hệ",
      render: (row) => (
        <div className="d-flex flex-column" style={{ fontSize: "12.5px" }}>
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
          {!row.dienThoai && !row.email && <span className="text-muted">—</span>}
        </div>
      )
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
      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column flex-lg-row overflow-hidden" style={{ minHeight: 0 }}>
          {/* Cột trái - tỷ lệ 8/12 */}
          <div className="col-12 col-lg-8 d-flex flex-column p-4" style={{ minHeight: 0 }}>

              {/* Tiêu đề vùng */}
              <SectionTitle title="Danh sách đại lý" />

              {/* Thanh công cụ Toolbar */}
              <div className="d-flex align-items-center gap-2 mb-3">
                <FilterSelect
                  options={nhomOptions}
                  value={nhomFilter}
                  onChange={setNhomFilter}
                  placeholder="Nhóm"
                  width={120}
                />
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
                  onRowClick={(row) => setSelectedCustomer(prev => prev?.id === row.id ? prev : row)}
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

          {/* Đường chia thẳng đứng ở desktop, nằm ngang ở mobile */}
          <div className="d-none d-lg-block" style={{ width: "1px", backgroundColor: "var(--border)", alignSelf: "stretch" }} />
          <div className="d-block d-lg-none" style={{ height: "1px", backgroundColor: "var(--border)", width: "100%" }} />

          {/* Cột phải - tỷ lệ 4/12 */}
          <div className="col-12 col-lg-4 d-flex flex-column p-4 overflow-hidden" style={{ minHeight: 0 }}>
              {!selectedCustomer ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-muted p-5">
                  <i className="bi bi-person-lines-fill fs-1 opacity-25 mb-3" />
                  <h6 className="fw-semibold">Chi tiết đại lý</h6>
                  <p className="small mb-0 opacity-75" style={{ maxWidth: "240px" }}>
                    Chọn một đại lý từ danh sách bên trái để xem thông tin chi tiết
                  </p>
                </div>
              ) : (
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                  <SectionTitle title="Thông tin chi tiết" />

                  {/* Scrollable details */}
                  <div className="flex-grow-1 overflow-auto pe-1" style={{ fontSize: "13px" }}>
                    <div className="d-flex flex-column gap-3">

                      {/* Section: Contact Info */}
                      <div>
                        <div className="d-flex flex-column bg-light rounded-3 border border-light" style={{ fontSize: "12px", padding: "8px 12px", gap: "5px" }}>
                          {/* Tên khách hàng & Toggle icon */}
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person text-muted" />
                              <span className="text-dark fw-bold" style={{ fontSize: "13px" }}>
                                {selectedCustomer.nhom === "ca-nhan" && selectedCustomer.xungHo ? `${selectedCustomer.xungHo} ` : ""}{selectedCustomer.name}
                              </span>
                            </div>
                            <button
                              onClick={() => setDetailsExpanded(!detailsExpanded)}
                              className="btn btn-link p-0 text-muted d-flex align-items-center justify-content-center border-0 shadow-none"
                              style={{ textDecoration: "none", width: "20px", height: "20px" }}
                              title={detailsExpanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"}
                            >
                              <i className={`bi bi-chevron-${detailsExpanded ? "up" : "down"}`} style={{ fontSize: "14px" }} />
                            </button>
                          </div>

                          {/* Badges row */}
                          <div className="d-flex flex-wrap gap-1 mt-0.5">
                            {selectedCustomer.nhom && (
                              <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-10 rounded-pill px-2 py-0.5" style={{ fontSize: "10px" }}>
                                {selectedCustomer.nhom === "ca-nhan" ? "Cá nhân" : selectedCustomer.nhom === "dai-ly" ? "Đại lý" : "Khác"}
                              </span>
                            )}
                            {selectedCustomer.loai && (
                              <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-10 rounded-pill px-2 py-0.5" style={{ fontSize: "10px" }}>
                                {selectedCustomer.loai === "kim-cuong" ? "Kim cương" : selectedCustomer.loai === "vang" ? "Vàng" : "Bạc"}
                              </span>
                            )}
                            {selectedCustomer.nguon && (
                              <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-10 rounded-pill px-2 py-0.5" style={{ fontSize: "10px" }}>
                                {selectedCustomer.nguon === "tu-nhien" ? "Tự nhiên" : selectedCustomer.nguon === "gioi-thieu" ? "Giới thiệu" : selectedCustomer.nguon === "quang-cao" ? "Quảng cáo" : "Khác"}
                              </span>
                            )}
                          </div>

                          {/* Collapsible Content */}
                          {detailsExpanded && (
                            <div className="d-flex flex-column gap-1.5 mt-1 pt-1 border-top" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                              {selectedCustomer.daiDien && selectedCustomer.nhom !== "ca-nhan" && (
                                <div className="d-flex align-items-center gap-2">
                                  <i className="bi bi-person-badge text-muted" />
                                  <span className="text-dark">
                                    {selectedCustomer.xungHo ? `${selectedCustomer.xungHo} ` : ""}{selectedCustomer.daiDien}
                                    {selectedCustomer.chucVu && ` (${selectedCustomer.chucVu})`}
                                  </span>
                                </div>
                              )}
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <i className="bi bi-telephone text-muted" />
                                <span className="text-dark">
                                  {selectedCustomer.dienThoai || "—"}
                                </span>
                                {selectedCustomer.email && (
                                  <>
                                    <span className="text-muted mx-1">|</span>
                                    <i className="bi bi-envelope text-muted" style={{ fontSize: "12px" }} />
                                    <span className="text-dark text-break">
                                      {selectedCustomer.email}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="d-flex align-items-start gap-2">
                                <i className="bi bi-geo-alt text-muted mt-0.5" />
                                <span className="text-dark">{selectedCustomer.address || "—"}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>


                      {/* Section: Yearly Sales and Commitment */}
                      <div>
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Doanh số và doanh số cam kết năm
                        </span>
                        <div className="p-3 bg-light rounded-3 border border-light">
                          <div className="d-flex gap-4">
                            <div>
                              <span className="text-muted d-block mb-0.5" style={{ fontSize: "10px" }}>Doanh số thực tế năm</span>
                              <strong className="text-success" style={{ fontSize: "14px" }}>
                                {((selectedCustomer as any).yearlySales ?? 0).toLocaleString("vi-VN")} ₫
                              </strong>
                            </div>
                            <div style={{ width: "1px", backgroundColor: "rgba(0,0,0,0.08)" }} />
                            <div>
                              <span className="text-muted d-block mb-0.5" style={{ fontSize: "10px" }}>Doanh số cam kết năm</span>
                              <strong className="text-primary" style={{ fontSize: "14px" }}>
                                {((selectedCustomer as any).committedSales ?? 0).toLocaleString("vi-VN")} ₫
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section: Thưởng thanh toán */}
                      <div>
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Thưởng thanh toán
                        </span>
                        <div className="p-3 bg-light rounded-3 border border-light d-flex flex-column gap-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-calendar-event text-success fs-5" />
                              <span className="text-muted" style={{ fontSize: "12px" }}>Tích lũy thanh toán</span>
                            </div>
                            <strong className="text-success" style={{ fontSize: "14px" }}>
                              {((selectedCustomer as any).thuongThang ?? 0).toLocaleString("vi-VN")} ₫
                            </strong>
                          </div>
                          <div className="text-muted" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                            • Chiết khấu thanh toán 2% trên tổng giá trị hóa đơn (chưa VAT) khi Đại lý hoàn tất thanh toán trước hạn hoặc đúng hạn quy định trong Hợp đồng đại lý.
                          </div>
                          <div className="d-flex flex-column gap-1 mt-1 p-2 rounded bg-white border border-light" style={{ fontSize: "11px" }}>
                            <span className="text-secondary fw-semibold">Công thức tính:</span>
                            <span className="text-primary fw-bold" style={{ fontSize: "11.5px" }}>
                              Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section: Thưởng doanh số năm */}
                      <div>
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Thưởng doanh số năm
                        </span>
                        <div className="p-3 bg-light rounded-3 border border-light d-flex flex-column gap-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-trophy text-warning fs-5" />
                              <span className="text-muted" style={{ fontSize: "12px" }}>Thưởng đạt doanh số cam kết</span>
                            </div>
                            <strong className="text-warning" style={{ fontSize: "14px" }}>
                              {((selectedCustomer as any).thuongDoanhSoNam ?? 0).toLocaleString("vi-VN")} ₫
                            </strong>
                          </div>
                          <div className="text-muted" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                            • Mức thưởng đạt chỉ tiêu doanh thu năm cam kết tối thiểu. Được chi trả bằng hàng hóa hoặc trừ trực tiếp vào công nợ đơn hàng đầu tiên của năm tiếp theo.
                          </div>
                          <div className="d-flex flex-column gap-1 mt-1 p-2 rounded bg-white border border-light" style={{ fontSize: "11px" }}>
                            <span className="text-secondary fw-semibold">Công thức tính:</span>
                            <span className="text-primary fw-bold" style={{ fontSize: "11.5px" }}>
                              Doanh số thực tế năm &gt;= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section: Thưởng vượt doanh số năm */}
                      <div>
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Thưởng vượt doanh số năm
                        </span>
                        <div className="p-3 bg-light rounded-3 border border-light d-flex flex-column gap-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-graph-up-arrow text-danger fs-5" />
                              <span className="text-muted" style={{ fontSize: "12px" }}>Thưởng vượt doanh số cam kết</span>
                            </div>
                            <strong className="text-danger" style={{ fontSize: "14px" }}>
                              {((selectedCustomer as any).thuongVuotDoanhSoNam ?? 0).toLocaleString("vi-VN")} ₫
                            </strong>
                          </div>
                          <div className="text-muted" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                            • Mức thưởng khuyến khích vượt chỉ tiêu doanh số năm cam kết.
                          </div>
                          <div className="d-flex flex-column gap-1 mt-1 p-2 rounded bg-white border border-light" style={{ fontSize: "11px" }}>
                            <span className="text-secondary fw-semibold">Công thức tính:</span>
                            <span className="text-primary fw-bold" style={{ fontSize: "11.5px" }}>
                              Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section: Thưởng đặc biệt */}
                      <div>
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Thưởng đặc biệt
                        </span>
                        <div className="p-3 bg-light rounded-3 border border-light d-flex flex-column gap-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-star text-primary fs-5" />
                              <span className="text-muted" style={{ fontSize: "12px" }}>Chương trình thi đua đặt biệt</span>
                            </div>
                            <strong className="text-primary" style={{ fontSize: "14px" }}>
                              {((selectedCustomer as any).thuongDacBiet ?? 0).toLocaleString("vi-VN")} ₫
                            </strong>
                          </div>
                          <div className="text-muted" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                            • Thưởng đặc biệt dành cho đối tác xuất sắc đạt thứ hạng Kim Cương hoặc tham gia các chương trình thi đua đặc biệt của công ty.
                          </div>
                          <div className="d-flex flex-column gap-1 mt-1 p-2 rounded bg-white border border-light" style={{ fontSize: "11px" }}>
                            <span className="text-secondary fw-semibold">Công thức tính:</span>
                            <span className="text-primary fw-bold" style={{ fontSize: "11.5px" }}>
                              Áp dụng theo quyết định chương trình khuyến mãi cụ thể
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section: Notes */}
                      {selectedCustomer.ghiChu && (
                        <div>
                          <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                            Ghi chú
                          </span>
                          <p className="text-muted bg-light p-3 rounded-3 mb-0" style={{ fontSize: "12.5px", whiteSpace: "pre-line" }}>
                            {selectedCustomer.ghiChu}
                          </p>
                        </div>
                      )}



                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="border-top pt-3 mt-3 d-flex align-items-center gap-2 flex-shrink-0">
                    {/* Nút Báo giá */}
                    <button
                      onClick={() => {
                        setBaoGiaModalOpen(true);
                      }}
                      className="btn btn-sm btn-outline-success d-flex align-items-center gap-2"
                      style={{ borderRadius: "8px", fontSize: "12px", padding: "5px 10px", fontWeight: 500 }}
                    >
                      <i className="bi bi-file-text" /> Báo giá
                    </button>
                    {/* Nút Đơn hàng */}
                    <button
                      type="button"
                      onClick={() => {
                        setDonHangModalOpen(true);
                      }}
                      className="btn btn-sm btn-outline-success d-flex align-items-center gap-2"
                      style={{ borderRadius: "8px", fontSize: "12px", padding: "5px 10px", fontWeight: 500 }}
                    >
                      <i className="bi bi-cart3" /> Đơn hàng
                    </button>

                    {/* Nút Sửa (Icon only) */}
                    <button
                      onClick={handleOpenEdit}
                      className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center ms-auto"
                      style={{ width: "30px", height: "30px", padding: 0, borderRadius: "8px" }}
                      title="Chỉnh sửa thông tin khách hàng"
                    >
                      <i className="bi bi-pencil" style={{ fontSize: "13px" }} />
                    </button>
                    {/* Nút Xoá (Icon only) */}
                    <button
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center"
                      style={{ width: "30px", height: "30px", padding: 0, borderRadius: "8px" }}
                      title="Xoá khách hàng"
                    >
                      <i className="bi bi-trash" style={{ fontSize: "13px" }} />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

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

