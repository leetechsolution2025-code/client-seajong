"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { MultiFilterSelect } from "@/components/ui/MultiFilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TableColumn } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { AddSupplierModal } from "@/components/plan-finance/mua_hang/AddSupplierModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";

const SUPPLIER_STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Đang hoạt động", value: "active" },
  { label: "Tạm ngừng", value: "paused" },
  { label: "Dừng hợp tác", value: "inactive" }
];

const SUPPLIER_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "active": { label: "Đang hoạt động", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "paused": { label: "Tạm ngưng", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "inactive": { label: "Dừng hợp tác", color: "#ef4444", bg: "rgba(239,68,68,0.1)" }
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Selection / Edit States
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Confirm Delete States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");
  const [deleting, setDeleting] = useState<boolean>(false);

  // Filters
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);

  // Modal Open State
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

  // Fetch product categories
  useEffect(() => {
    fetch("/api/plan-finance/inventory/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        setCategoryOptions(data.map((c) => ({ label: c.name, value: c.id })));
      })
      .catch(() => {});
  }, []);

  // Fetch Suppliers
  const fetchSuppliers = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (status) p.set("trangThai", status);
    if (selectedCategoryIds.length > 0) p.set("categoryIds", selectedCategoryIds.join(","));
    if (search) p.set("search", search);
    p.set("page", String(page));
    p.set("limit", "15");

    fetch(`/api/plan-finance/suppliers?${p}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSuppliers(data.items ?? []);
          setTotal(data.total ?? 0);
        } else {
          setSuppliers([]);
          setTotal(0);
        }
      })
      .catch(() => {
        setSuppliers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [status, selectedCategoryIds, search, page]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [status, selectedCategoryIds, search]);

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/plan-finance/suppliers/${confirmDeleteId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteId(null);
        setConfirmDeleteName("");
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi khi xoá nhà cung cấp");
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setDeleting(false);
    }
  };

  // Table columns definition
  const columns: TableColumn<any>[] = [
    {
      header: (
        <input
          type="checkbox"
          className="form-check-input"
          checked={suppliers.length > 0 && selectedIds.length === suppliers.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds(suppliers.map((s) => s.id));
            } else {
              setSelectedIds([]);
            }
          }}
        />
      ),
      render: (s) => (
        <input
          type="checkbox"
          className="form-check-input shadow-none"
          checked={selectedIds.includes(s.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds((prev) => [...prev, s.id]);
            } else {
              setSelectedIds((prev) => prev.filter((id) => id !== s.id));
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: "50px",
      align: "center"
    },
    {
      header: "Tên nhà cung cấp",
      render: (s) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--foreground)" }}>{s.name}</div>
          {s.categories && s.categories.length > 0 && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
              {s.categories.map((catObj: any, idx: number) => (
                <span key={idx} style={{ fontSize: "10px", color: "var(--muted-foreground)", background: "var(--muted)", padding: "2px 6px", borderRadius: "4px" }}>
                  {catObj.category?.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      header: "Thông tin liên hệ",
      render: (s) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {s.contactName && (
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>
              <i className="bi bi-person text-muted me-1" />
              {s.contactName} {s.xungHo ? `(${s.xungHo})` : ""}
            </div>
          )}
          <div style={{ fontSize: "11.5px", color: "var(--muted-foreground)" }}>
            {s.phone && (
              <span className="me-3">
                <i className="bi bi-telephone text-muted me-1" />
                {s.phone}
              </span>
            )}
            {s.email && (
              <span>
                <i className="bi bi-envelope text-muted me-1" />
                {s.email}
              </span>
            )}
          </div>
          {s.address && (
            <div style={{ fontSize: "11px", color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "350px" }}>
              <i className="bi bi-geo-alt text-muted me-1" />
              {s.address}
            </div>
          )}
        </div>
      )
    },
    {
      header: "Trạng thái",
      align: "center",
      render: (s) => {
        const statusInfo = SUPPLIER_STATUS[s.trangThai] ?? { label: s.trangThai, color: "var(--muted-foreground)", bg: "var(--muted)" };
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 700,
              color: statusInfo.color,
              background: statusInfo.bg
            }}
          >
            {statusInfo.label}
          </span>
        );
      },
      width: "140px"
    }
  ];

  const toolbar = (
    <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2 mb-3">
      <div className="d-flex align-items-center gap-2 flex-grow-1">
        <MultiFilterSelect
          placeholder="Danh mục hàng hóa"
          options={categoryOptions}
          selectedValues={selectedCategoryIds}
          onChange={setSelectedCategoryIds}
          width={180}
        />
        
        <FilterSelect
          placeholder="Trạng thái"
          options={SUPPLIER_STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          width={150}
        />

        <div className="flex-grow-1" style={{ maxWidth: "450px" }}>
          <SearchInput
            placeholder="Tìm kiếm nhà cung cấp..."
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      <button
        onClick={() => setIsAddOpen(true)}
        className="btn btn-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
        style={{ height: 32, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}
      >
        <i className="bi bi-plus-lg" />
        Thêm mới
      </button>
    </div>
  );

  return (
    <div 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        height: "100%", 
        background: "var(--background)", 
        overflow: "hidden",
        "--primary": "#003087",
        "--bs-primary": "#003087",
        "--primary-focus": "rgba(0, 48, 135, 0.2)",
      } as React.CSSProperties}
    >
      <style>{`
        .ph-icon-box-blue {
          background: rgba(0, 48, 135, 0.1) !important;
          border-color: rgba(0, 48, 135, 0.25) !important;
        }
        .ph-icon-blue {
          color: #003087 !important;
        }
        .btn-primary {
          background-color: #003087 !important;
          border-color: #003087 !important;
        }
        .btn-primary:hover, .btn-primary:focus, .btn-primary:active {
          background-color: #002260 !important;
          border-color: #002260 !important;
          box-shadow: 0 4px 12px rgba(0, 48, 135, 0.2) !important;
        }
        .form-check-input:checked {
          background-color: #003087 !important;
          border-color: #003087 !important;
        }
        .text-primary {
          color: #003087 !important;
        }
        .app-tbl-row:hover td {
          background: rgba(0, 48, 135, 0.04) !important;
        }
        .app-responsive-table-wrapper table td {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }
        .app-responsive-table-wrapper table th {
          padding-top: 5px !important;
          padding-bottom: 5px !important;
        }
      `}</style>

      <PageHeader
        title="Nhà cung cấp"
        description="Supplier Management · Quản lý danh mục nhà cung cấp & thông tin liên lạc"
        color="blue"
        icon="bi-truck"
      />

      <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Main card */}
        <div 
          style={{ 
            flex: 1, 
            display: "flex", 
            flexDirection: "column", 
            background: "var(--card)", 
            borderRadius: "12px", 
            border: "1px solid var(--border)",
            padding: "1.5rem",
            minHeight: 0
          }}
        >
          <SectionTitle title="Danh sách nhà cung cấp" icon="bi-list-ul" className="mb-3" />

          {toolbar}

          {/* Table Container */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <Table<any>
              rows={suppliers}
              columns={columns}
              loading={loading}
              rowKey={(r) => r.id}
              onRowClick={setSelectedSupplier}
              emptyIcon="bi-truck"
              emptyText="Không có nhà cung cấp nào được tìm thấy"
              compact
            />
          </div>

          {/* Pagination Container */}
          {total > 15 && (
            <div className="pt-3 border-top mt-3 flex-shrink-0">
              <Pagination
                page={page}
                totalPages={Math.ceil(total / 15)}
                onChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      {isAddOpen && (
        <AddSupplierModal
          onClose={() => setIsAddOpen(false)}
          onSaved={() => {
            setIsAddOpen(false);
            fetchSuppliers();
          }}
        />
      )}

      {editingId && (
        <AddSupplierModal
          supplierId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            setSelectedSupplier(null); // Close the detail offcanvas
            fetchSuppliers();
          }}
        />
      )}

      {/* Offcanvas chi tiết nhà cung cấp */}
      <AnimatePresence>
        {selectedSupplier && (
          <SupplierDetailOffcanvas
            supplier={selectedSupplier}
            onClose={() => setSelectedSupplier(null)}
            onEdit={(id) => {
              setSelectedSupplier(null);
              setEditingId(id);
            }}
            onDelete={(id, name) => {
              setSelectedSupplier(null);
              setConfirmDeleteId(id);
              setConfirmDeleteName(name);
            }}
            onChanged={fetchSuppliers}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Xoá nhà cung cấp"
        message={`Bạn có chắc chắn muốn xoá nhà cung cấp "${confirmDeleteName}" không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmDeleteId(null);
          setConfirmDeleteName("");
        }}
      />
    </div>
  );
}

// ── Offcanvas chi tiết nhà cung cấp ──────────────────────────────────────────
interface SupplierDetail {
  supplier: {
    id: string;
    code: string | null;
    name: string;
    taxCode: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    contactName: string | null;
    xungHo: string | null;
    hanMucNo: number;
    danhGia: number;
    ghiChu: string | null;
    trangThai: string;
    categories: Array<{
      category: {
        id: string;
        name: string;
      };
    }>;
  };
  orders: Array<{
    id: string;
    code: string | null;
    ngayDat: string | null;
    trangThai: string;
    tongTien: number;
    daThanhToan: number;
  }>;
  congNoHienTai: number;
}

function SupplierDetailOffcanvas({ supplier, onClose, onEdit, onDelete, onChanged }: {
  supplier: any;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onChanged?: () => void;
}) {
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const fetchDetail = useCallback(() => {
    setLoading(true);
    fetch(`/api/plan-finance/suppliers/${supplier.id}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [supplier.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/plan-finance/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail((prev) => prev ? { ...prev, supplier: { ...prev.supplier, trangThai: updated.trangThai } } : null);
        onChanged?.();
      }
    } catch {}
  };

  const handleRate = async (rating: number) => {
    try {
      const res = await fetch(`/api/plan-finance/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ danhGia: rating }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail((prev) => prev ? { ...prev, supplier: { ...prev.supplier, danhGia: updated.danhGia } } : null);
        onChanged?.();
      }
    } catch {}
  };

  const fmtVnd = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "0đ";
  
  const statusInfo = SUPPLIER_STATUS[detail?.supplier.trangThai || supplier.trangThai] ?? { label: supplier.trangThai, color: "var(--muted-foreground)", bg: "var(--muted)" };

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose} 
        style={{ position: "fixed", inset: 0, zIndex: 5100, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }} 
      />

      {/* Panel */}
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 400, zIndex: 5200,
          background: "var(--card)", borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "8px 20px 6px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "relative" }}>
          {/* Close button top right */}
          <button onClick={onClose} style={{ position: "absolute", top: 6, right: 20, width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x-lg" style={{ fontSize: 18 }} />
          </button>
          
          {/* Supplier Name */}
          <h3 style={{ margin: "0 40px 0 0", fontWeight: 800, fontSize: "18px", color: "var(--foreground)", wordBreak: "break-word", lineHeight: 1.2 }}>
            {detail?.supplier.name || supplier.name}
          </h3>

          {/* Address */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: "var(--muted-foreground)", fontSize: "12px" }}>
            <i className="bi bi-geo-alt" style={{ fontSize: 13 }} />
            <span>{detail?.supplier.address || supplier.address || "—"}</span>
          </div>

          {/* Status & Stars */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 700,
                color: statusInfo.color,
                background: statusInfo.bg
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusInfo.color }} />
              {statusInfo.label}
            </span>

            {/* Stars rating */}
            <div style={{ display: "flex", cursor: "pointer" }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (detail?.supplier.danhGia ?? supplier.danhGia ?? 0);
                return (
                  <i 
                    key={star} 
                    onClick={() => handleRate(star)}
                    className={`bi ${isFilled ? "bi-star-fill text-warning" : "bi-star text-muted"}`} 
                    style={{ fontSize: 14, marginLeft: 2 }} 
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* Metrics Boxes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* Box 1: Hạn mức nợ */}
            <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "10px 14px", background: "var(--card)" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>HẠN MỨC NỢ</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>
                {supplier.hanMucNo > 0 ? fmtVnd(supplier.hanMucNo) : "Chưa đặt"}
              </div>
            </div>

            {/* Box 2: Công nợ */}
            <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "10px 14px", background: "var(--card)" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.05em", marginBottom: 4 }}>CÔNG NỢ</div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: (detail?.congNoHienTai ?? 0) > 0 ? "#ef4444" : "#10b981" }}>
                {fmtVnd(detail?.congNoHienTai ?? 0)}
              </div>
            </div>
          </div>

          {/* Status Buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              { key: "active", label: "Đang hoạt động", color: "#10b981", bg: "rgba(16,185,129,0.06)" },
              { key: "paused", label: "Tạm ngưng", color: "#f59e0b", bg: "rgba(245,158,11,0.06)" },
              { key: "inactive", label: "Dừng hợp tác", color: "#ef4444", bg: "rgba(239,68,68,0.06)" },
            ].map((st) => {
              const isActive = (detail?.supplier.trangThai ?? supplier.trangThai) === st.key;
              return (
                <button
                  key={st.key}
                  onClick={() => handleStatusChange(st.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    border: isActive ? `1.5px solid ${st.color}` : "1px solid var(--border)",
                    background: isActive ? st.bg : "transparent",
                    color: isActive ? st.color : "var(--muted-foreground)",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? st.color : "var(--muted-foreground)" }} />
                  {st.label}
                </button>
              );
            })}
          </div>


          {/* Categories */}
          {detail?.supplier.categories && detail.supplier.categories.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginBottom: 14 }}>
              <h6 style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px 0" }}>
                DANH MỤC CUNG CẤP
              </h6>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {detail.supplier.categories.map((cObj: any, idx: number) => (
                  <span key={idx} style={{ fontSize: 11, color: "#003087", background: "rgba(0, 48, 135, 0.08)", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>
                    {cObj.category?.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* LỊCH SỬ GIAO DỊCH Section */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <h6 style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px 0" }}>
              LỊCH SỬ GIAO DỊCH
              <span style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                justifyContent: "center", 
                width: 18, 
                height: 18, 
                borderRadius: "50%", 
                background: "rgba(99,102,241,0.15)", 
                color: "#6366f1", 
                fontSize: "10px", 
                fontWeight: 700 
              }}>
                {detail?.orders.length || 0}
              </span>
            </h6>

            <div>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[1, 2].map(i => (
                    <div key={i} style={{ height: 48, borderRadius: 8, background: "var(--muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : !detail?.orders.length ? (
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  padding: "32px 16px", 
                  background: "color-mix(in srgb, var(--muted) 35%, transparent)", 
                  borderRadius: "12px", 
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                  textAlign: "center"
                }}>
                  <i className="bi bi-bag-x" style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }} />
                  <span style={{ fontSize: "12.5px" }}>Chưa có giao dịch nào</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {detail.orders.map((o) => {
                    const isUnpaid = o.tongTien > o.daThanhToan;
                    return (
                      <div key={o.id} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#003087", fontFamily: "monospace" }}>{o.code || "ĐƠN-CHƯA-MÃ"}</span>
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{o.ngayDat ? new Date(o.ngayDat).toLocaleDateString("vi-VN") : "—"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
                          <span style={{ color: "var(--muted-foreground)" }}>Tổng: <strong style={{ color: "var(--foreground)" }}>{fmtVnd(o.tongTien)}</strong></span>
                          {isUnpaid && (
                            <span style={{ color: "#ef4444", fontWeight: 600 }}>
                              Nợ: {fmtVnd(o.tongTien - o.daThanhToan)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(supplier.id)}
            style={{ flex: 1, padding: "8px", border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
          >
            <i className="bi bi-pencil" />
            Sửa
          </button>
          <button
            onClick={() => onDelete(supplier.id, supplier.name)}
            style={{ flex: 1, padding: "8px", border: "none", background: "#ef4444", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
          >
            <i className="bi bi-trash" />
            Xoá
          </button>
        </div>
      </motion.div>
    </>
  );
}
