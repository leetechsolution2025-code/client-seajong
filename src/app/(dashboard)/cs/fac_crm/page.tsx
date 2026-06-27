"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { ModernStepper } from "@/components/ui/ModernStepper";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";
import { Table } from "@/components/ui/Table";
import { AnimatePresence, motion } from "framer-motion";
import { ChiTietKhachHangOffcanvas } from "@/components/plan-finance/khach_hang/ChiTietKhachHangOffcanvas";
import { Pagination } from "@/components/ui/Pagination";
import { BaoGiaWoodDoorModal } from "@/components/plan-finance/bao_gia/BaoGiaWoodDoorModal";
import { useToast } from "@/components/ui/Toast";

const STEPS = [
  { num: 1, id: "customer", title: "Khách hàng", desc: "Hồ sơ & Thông tin", icon: "bi-people" },
  { num: 2, id: "quote", title: "Báo giá", desc: "Đề xuất & Đàm phán", icon: "bi-file-earmark-text" },
  { num: 3, id: "contract", title: "Hợp đồng", desc: "Cam kết & Ký kết", icon: "bi-file-earmark-check" },
  { num: 4, id: "abandoned", title: "Đã từ bỏ", desc: "Ngừng theo dõi", icon: "bi-x-circle" },
];

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  employees: any[];
  currentUserEmployeeId?: string | null;
  customerToEdit?: any | null;
}

function AddCustomerModal({ isOpen, onClose, onSaved, employees, currentUserEmployeeId, customerToEdit }: AddCustomerModalProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    createdAt: new Date().toISOString().split("T")[0],
    nguoiChamSocId: "",
    nguon: "tu-nhien",
    nhom: "doanh-nghiep",
    loai: "vang",
    name: "",
    address: "",
    daiDien: "",
    xungHo: "Anh",
    chucVu: "",
    dienThoai: "",
    email: "",
    soTaiKhoan: "",
    tenNganHang: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        setForm({
          createdAt: customerToEdit.createdAt ? new Date(customerToEdit.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          nguoiChamSocId: customerToEdit.nguoiChamSocId || "",
          nguon: customerToEdit.nguon || "tu-nhien",
          nhom: customerToEdit.nhom || "doanh-nghiep",
          loai: customerToEdit.loai || "vang",
          name: customerToEdit.name || "",
          address: customerToEdit.address || "",
          daiDien: customerToEdit.daiDien || "",
          xungHo: customerToEdit.xungHo || "Anh",
          chucVu: customerToEdit.chucVu || "",
          dienThoai: customerToEdit.dienThoai || "",
          email: customerToEdit.email || "",
          soTaiKhoan: customerToEdit.soTaiKhoan || "",
          tenNganHang: customerToEdit.tenNganHang || "",
        });
      } else {
        setForm({
          createdAt: new Date().toISOString().split("T")[0],
          nguoiChamSocId: currentUserEmployeeId || (employees[0]?.id || ""),
          nguon: "tu-nhien",
          nhom: "doanh-nghiep",
          loai: "vang",
          name: "",
          address: "",
          daiDien: "",
          xungHo: "Anh",
          chucVu: "",
          dienThoai: "",
          email: "",
          soTaiKhoan: "",
          tenNganHang: "",
        });
      }
    }
  }, [isOpen, customerToEdit, currentUserEmployeeId, employees]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "nhom" && value === "ca-nhan") {
        next.name = "";
        next.chucVu = "";
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name || "Khách hàng mới",
        nhom: form.nhom,
        nguon: form.nguon,
        loai: form.loai,
        dienThoai: form.dienThoai,
        email: form.email,
        address: form.address,
        daiDien: form.daiDien,
        xungHo: form.xungHo,
        chucVu: form.chucVu,
        soTaiKhoan: form.soTaiKhoan,
        tenNganHang: form.tenNganHang,
        nguoiChamSocId: form.nguoiChamSocId || null,
        ngayTao: form.createdAt,
      };

      let res;
      if (customerToEdit) {
        res = await fetch(`/api/plan-finance/customers/${customerToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/plan-finance/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Có lỗi xảy ra");
      }

      toast.success(
        customerToEdit ? "Cập nhật thành công" : "Tạo mới thành công",
        customerToEdit ? "Đã cập nhật thông tin khách hàng" : "Khách hàng mới đã được lưu vào hệ thống"
      );
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error("Thất bại", err.message || "Không thể lưu thông tin khách hàng");
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = {
    fontSize: "12.5px",
    fontWeight: 600,
    color: "var(--foreground)",
    marginBottom: "5px",
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    height: "38px",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "var(--card)",
    color: "var(--foreground)",
    fontSize: "13px",
    outline: "none",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 2000,
              backdropFilter: "blur(2px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "fixed",
              inset: 0,
              margin: "auto",
              zIndex: 2001,
              width: "min(600px, calc(100vw - 32px))",
              height: "fit-content",
              maxHeight: "calc(100vh - 40px)",
              background: "var(--card)",
              borderRadius: "16px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "10px", background: "color-mix(in srgb, var(--primary) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={customerToEdit ? "bi bi-pencil text-primary" : "bi bi-person-plus text-primary"} style={{ fontSize: "18px" }} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: "16px", color: "var(--foreground)" }}>{customerToEdit ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}</h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--muted-foreground)" }}>{customerToEdit ? "Cập nhật thông tin chi tiết của khách hàng" : "Điền thông tin để tạo hồ sơ khách hàng"}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="bi bi-x" style={{ fontSize: "20px" }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <label style={labelStyle}>Ngày tạo</label>
                  <input
                    type="date"
                    value={form.createdAt}
                    onChange={e => handleChange("createdAt", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label style={labelStyle}>Người chăm sóc</label>
                  <select
                    value={form.nguoiChamSocId}
                    onChange={e => handleChange("nguoiChamSocId", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Chưa phân công</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-sm-4">
                  <label style={labelStyle}>Nguồn <span style={{ color: "#ef4444" }}>*</span></label>
                  <select
                    value={form.nguon}
                    onChange={e => handleChange("nguon", e.target.value)}
                    style={inputStyle}
                    required
                  >
                    <option value="tu-nhien">Tự nhiên</option>
                    <option value="gioi-thieu">Giới thiệu</option>
                    <option value="quang-cao">Quảng cáo</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>
                <div className="col-12 col-sm-4">
                  <label style={labelStyle}>Nhóm khách hàng <span style={{ color: "#ef4444" }}>*</span></label>
                  <select
                    value={form.nhom}
                    onChange={e => handleChange("nhom", e.target.value)}
                    style={inputStyle}
                    required
                  >
                    <option value="doi-tac">Đại lý / Đối tác</option>
                    <option value="doanh-nghiep">Doanh nghiệp</option>
                    <option value="ca-nhan">Cá nhân</option>
                  </select>
                </div>
                <div className="col-12 col-sm-4">
                  <label style={labelStyle}>Loại khách hàng <span style={{ color: "#ef4444" }}>*</span></label>
                  <select
                    value={form.loai}
                    onChange={e => handleChange("loai", e.target.value)}
                    style={inputStyle}
                    required
                  >
                    <option value="vang">Vàng</option>
                    <option value="bac">Bạc</option>
                    <option value="kim-cuong">Kim cương</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tên khách hàng</label>
                <input
                  type="text"
                  placeholder={form.nhom === "ca-nhan" ? "Khóa đối với nhóm Cá nhân" : "Nhập tên khách hàng..."}
                  value={form.name}
                  onChange={e => handleChange("name", e.target.value)}
                  disabled={form.nhom === "ca-nhan"}
                  style={{
                    ...inputStyle,
                    opacity: form.nhom === "ca-nhan" ? 0.6 : 1,
                    cursor: form.nhom === "ca-nhan" ? "not-allowed" : "text",
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>Địa chỉ</label>
                <input
                  type="text"
                  placeholder="Nhập địa chỉ..."
                  value={form.address}
                  onChange={e => handleChange("address", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div className="row g-3">
                <div className="col-12 col-sm-5">
                  <label style={labelStyle}>Đại diện</label>
                  <input
                    type="text"
                    placeholder="Họ và tên đại diện..."
                    value={form.daiDien}
                    onChange={e => handleChange("daiDien", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="col-12 col-sm-3">
                  <label style={labelStyle}>Xưng hô</label>
                  <select
                    value={form.xungHo}
                    onChange={e => handleChange("xungHo", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Anh">Anh</option>
                    <option value="Chị">Chị</option>
                    <option value="Ông">Ông</option>
                    <option value="Bà">Bà</option>
                  </select>
                </div>
                <div className="col-12 col-sm-4">
                  <label style={labelStyle}>Chức vụ</label>
                  <input
                    type="text"
                    placeholder={form.nhom === "ca-nhan" ? "Khóa..." : "Chức vụ..."}
                    value={form.chucVu}
                    onChange={e => handleChange("chucVu", e.target.value)}
                    disabled={form.nhom === "ca-nhan"}
                    style={{
                      ...inputStyle,
                      opacity: form.nhom === "ca-nhan" ? 0.6 : 1,
                      cursor: form.nhom === "ca-nhan" ? "not-allowed" : "text",
                    }}
                  />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <label style={labelStyle}>Điện thoại</label>
                  <input
                    type="text"
                    placeholder="Số điện thoại..."
                    value={form.dienThoai}
                    onChange={e => handleChange("dienThoai", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    placeholder="Địa chỉ email..."
                    value={form.email}
                    onChange={e => handleChange("email", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <label style={labelStyle}>Số tài khoản</label>
                  <input
                    type="text"
                    placeholder="Nhập số tài khoản..."
                    value={form.soTaiKhoan}
                    onChange={e => handleChange("soTaiKhoan", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label style={labelStyle}>Tên ngân hàng</label>
                  <input
                    type="text"
                    placeholder="Nhập tên ngân hàng..."
                    value={form.tenNganHang}
                    onChange={e => handleChange("tenNganHang", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ padding: "14px 0 0", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  style={{
                    padding: "8px 20px",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    background: "var(--muted)",
                    color: "var(--foreground)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer"
                  }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 20px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#003087",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  <i className={submitting ? "bi bi-hourglass-split" : "bi bi-check2"} /> {customerToEdit ? "Lưu thay đổi" : "Tạo khách hàng"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


export default function FacCrmPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [groupFilter, setGroupFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<any | null>(null);
  const [isBaoGiaModalOpen, setIsBaoGiaModalOpen] = useState(false);
  const [selectedCustomerForQuote, setSelectedCustomerForQuote] = useState<any | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [nhomOptions, setNhomOptions] = useState<any[]>([]);
  const [nguonOptions, setNguonOptions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [activeIndustryCode, setActiveIndustryCode] = useState<string>("wood_door");

  // Load categories and employees on mount
  useEffect(() => {
    fetch("/api/plan-finance/categories?type=customer_source")
      .then(r => r.json()).then(d => Array.isArray(d) && setNguonOptions(d)).catch(() => { });
    fetch("/api/plan-finance/categories?type=customer_group")
      .then(r => r.json()).then(d => Array.isArray(d) && setNhomOptions(d)).catch(() => { });
    fetch("/api/hr/employees/crm", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.employees)) setEmployees(d.employees);
        if (d.currentUserEmployeeId) setCurrentUserEmployeeId(d.currentUserEmployeeId);
      })
      .catch(() => { });

    if (typeof window !== "undefined") {
      const cookies = document.cookie.split("; ");
      const activeIndCookie = cookies.find(c => c.startsWith("active_industry_code="))?.split("=")[1];
      if (activeIndCookie) {
        setActiveIndustryCode(activeIndCookie);
      }
    }
  }, []);

  // Reset page when search filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, groupFilter, typeFilter]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (searchQuery) params.set("search", searchQuery);
      if (groupFilter) params.set("nhom", groupFilter);
      if (typeFilter) params.set("loai", typeFilter);

      const res = await fetch(`/api/plan-finance/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, groupFilter, typeFilter]);

  useEffect(() => {
    if (currentStep === 1) {
      fetchCustomers();
    }
  }, [currentStep, fetchCustomers]);

  // Sync selectedCustomer details after editing
  useEffect(() => {
    if (selectedCustomer) {
      const updated = customers.find(c => c.id === selectedCustomer.id);
      if (updated) {
        setSelectedCustomer(updated);
      }
    }
  }, [customers, selectedCustomer]);

  return (
    <StandardPage
      title="Chăm sóc khách hàng"
      description="Quản lý, tương tác và chăm sóc khách hàng"
      icon="bi-people"
      color="indigo"
      useCard={false}
      paddingClassName="px-4 pb-4 pt-1"
    >
      <div className="flex-grow-1 d-flex flex-column overflow-hidden">
        <WorkflowCard
          className="h-100 d-flex flex-column"
          contentPadding="px-4 pb-4 pt-2"
          stepper={
            <div style={{ paddingTop: "8px" }}>
              <ModernStepper
                steps={STEPS}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                paddingY="4px"
              />
            </div>
          }
          toolbar={
            currentStep === 1 ? (
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap pb-0" style={{ marginBottom: "-10px" }}>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <FilterSelect
                    value={groupFilter}
                    onChange={setGroupFilter}
                    placeholder="Nhóm khách hàng"
                    options={[
                      { label: "Doanh nghiệp", value: "doanh-nghiep" },
                      { label: "Cá nhân", value: "ca-nhan" },
                    ]}
                    width={200}
                    className="border-0 shadow-sm"
                  />
                  <FilterSelect
                    value={typeFilter}
                    onChange={setTypeFilter}
                    placeholder="Loại khách hàng"
                    options={[
                      { label: "Kim cương", value: "kim-cuong" },
                      { label: "Vàng", value: "vang" },
                      { label: "Bạc", value: "bac" },
                    ]}
                    width={200}
                    className="border-0 shadow-sm"
                  />
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Tìm kiếm khách hàng..."
                    className="border-0 shadow-sm"
                    style={{ width: 250 }}
                  />
                </div>
                <BrandButton
                  icon="bi-plus-lg"
                  style={{ height: 34, borderRadius: 8, padding: "0 16px" }}
                  onClick={() => {
                    setCustomerToEdit(null);
                    setIsModalOpen(true);
                  }}
                >
                  Thêm mới
                </BrandButton>
              </div>
            ) : null
          }
        >
          {currentStep === 1 ? (
            <div className="d-flex flex-column h-100 justify-content-between">
              <div className="flex-grow-1 overflow-auto">
                <Table
                  rows={customers}
                  loading={loading}
                  rowKey={c => c.id}
                  onRowClick={setSelectedCustomer}
                  emptyIcon="bi-person-lines-fill"
                  emptyText="Chưa có khách hàng nào"
                  minWidth={520}
                  compact={true}
                  columns={[
                    {
                      header: "Khách hàng",
                      render: c => {
                        const LOAI_LABEL: Record<string, string> = {
                          "vang": "Vàng", "bac": "Bạc", "kim-cuong": "Kim cương",
                        };
                        const loaiColor: Record<string, string> = {
                          "vang": "#eab308", "bac": "#94a3b8", "kim-cuong": "#06b6d4",
                        };
                        const displayName = c.nhom === "ca-nhan"
                          ? ([c.xungHo, c.daiDien].filter(Boolean).join(" ") || c.name)
                          : c.name;
                        return (
                          <>
                            <div className="d-flex align-items-center gap-2">
                              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }} title={displayName}>{displayName}</p>
                              {c.loai && (
                                <span style={{
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: `color-mix(in srgb, ${loaiColor[c.loai] ?? "#94a3b8"} 12%, transparent)`,
                                  color: loaiColor[c.loai] ?? "#94a3b8",
                                  border: `1px solid color-mix(in srgb, ${loaiColor[c.loai] ?? "#94a3b8"} 30%, transparent)`
                                }}>
                                  {LOAI_LABEL[c.loai] ?? c.loai}
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }} title={c.address || ""}>
                              {c.address || "—"}
                            </p>
                          </>
                        );
                      },
                    },
                    {
                      header: "Thông tin liên hệ",
                      render: c => (
                        <>
                          {c.dienThoai ? (
                            <p style={{ margin: 0, fontSize: 13, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                              <i className="bi bi-telephone" style={{ fontSize: 11, marginRight: 4, color: "var(--muted-foreground)" }} />{c.dienThoai}
                            </p>
                          ) : (
                            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>—</p>
                          )}
                          {c.email && (
                            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                              <i className="bi bi-envelope" style={{ fontSize: 10, marginRight: 3 }} />{c.email}
                            </p>
                          )}
                        </>
                      ),
                    },
                    {
                      header: "Người chăm sóc",
                      render: c => c.nguoiChamSoc ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "color-mix(in srgb, #10b981 15%, transparent)", display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: "#10b981", justifyContent: "center" }}>
                            {c.nguoiChamSoc.fullName.split(" ").pop()?.[0] ?? "?"}
                          </div>
                          <span style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 500 }}>{c.nguoiChamSoc.fullName}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>Chưa phân công</span>
                      ),
                    },
                  ]}
                />
              </div>
              {totalPages > 1 && (
                <div className="pt-3 border-top" style={{ display: "flex", justifyContent: "center" }}>
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
              Đang hiển thị nội dung cho bước: <strong>{STEPS[currentStep - 1].title}</strong>
            </div>
          )}
        </WorkflowCard>
      </div>

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCustomerToEdit(null);
        }}
        onSaved={fetchCustomers}
        employees={employees}
        currentUserEmployeeId={currentUserEmployeeId}
        customerToEdit={customerToEdit}
      />

      <ChiTietKhachHangOffcanvas
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onDeleted={fetchCustomers}
        onEdit={() => {
          setCustomerToEdit(selectedCustomer);
          setIsModalOpen(true);
        }}
        onQuote={() => {
          setSelectedCustomerForQuote(selectedCustomer);
          setIsBaoGiaModalOpen(true);
        }}
        employees={employees}
        currentUserEmployeeId={currentUserEmployeeId}
      />

      {activeIndustryCode === "wood_door" && (
        <BaoGiaWoodDoorModal
          isOpen={isBaoGiaModalOpen}
          onClose={() => {
            setIsBaoGiaModalOpen(false);
            setSelectedCustomerForQuote(null);
          }}
          customer={selectedCustomerForQuote}
          employees={employees}
          currentUserEmployeeId={currentUserEmployeeId}
        />
      )}
    </StandardPage>
  );
}
