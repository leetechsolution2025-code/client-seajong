"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { MultiFilterSelect } from "@/components/ui/MultiFilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, TableColumn } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { AddSupplierModal } from "@/components/plan-finance/mua_hang/AddSupplierModal";
import { AddCarrierModal, CARRIER_SERVICE_TYPES } from "@/components/plan-finance/mua_hang/AddCarrierModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";

const STEP_ITEMS: ModernStepItem[] = [
  { num: 1, id: "suppliers", title: "Nhà cung cấp", desc: "Nguồn hàng & vật tư linh kiện", icon: "bi-building" },
  { num: 2, id: "carriers", title: "Đơn vị vận chuyển", desc: "Đối tác giao nhận & dịch vụ vận tải", icon: "bi-truck" },
];

const SUPPLIER_STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Đang hoạt động", value: "active" },
  { label: "Tạm ngừng", value: "paused" },
  { label: "Dừng hợp tác", value: "inactive" }
];

const CARRIER_STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Đang hợp tác", value: "active" },
  { label: "Tạm ngừng", value: "paused" },
  { label: "Dừng hợp tác", value: "inactive" }
];

const CARRIER_SERVICE_OPTIONS = [
  { label: "Tất cả loại dịch vụ", value: "" },
  ...CARRIER_SERVICE_TYPES.map(s => ({ label: s.label, value: s.value }))
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  "active": { label: "Đang hoạt động", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "paused": { label: "Tạm ngưng", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "inactive": { label: "Dừng hợp tác", color: "#ef4444", bg: "rgba(239,68,68,0.1)" }
};

const CARRIER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  "active": { label: "Đang hợp tác", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "paused": { label: "Tạm ngưng", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "inactive": { label: "Dừng hợp tác", color: "#ef4444", bg: "rgba(239,68,68,0.1)" }
};

/** Tách họ tên và chức vụ từ dạng "Họ Tên (Chức vụ)" hoặc "Họ Tên [Chức vụ]" */
function parseContactNameAndRole(raw?: string | null): { name: string; role: string } {
  if (!raw) return { name: "", role: "" };
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)\s*[\(\（\[]([^\)\）\]]+)[\)\）\]]\s*$/);
  if (match && match[1]) {
    return { name: match[1].trim(), role: match[2].trim() };
  }
  return { name: trimmed, role: "" };
}

export default function SuppliersPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // ── Step 1: Suppliers State ────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Selection / Edit States for Supplier
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

  // Supplier Filters
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);

  // ── Step 2: Carriers State ─────────────────────────────────────────────────
  const [carriers, setCarriers] = useState<any[]>([]);
  const [carrierLoading, setCarrierLoading] = useState<boolean>(true);
  const [carrierTotal, setCarrierTotal] = useState<number>(0);
  const [carrierPage, setCarrierPage] = useState<number>(1);
  const [selectedCarrierIds, setSelectedCarrierIds] = useState<string[]>([]);

  // Selection / Edit States for Carrier
  const [editingCarrierId, setEditingCarrierId] = useState<string | null>(null);
  const [isAddCarrierOpen, setIsAddCarrierOpen] = useState<boolean>(false);

  // Carrier Filters
  const [carrierStatus, setCarrierStatus] = useState<string>("");
  const [carrierSearch, setCarrierSearch] = useState<string>("");
  const [carrierServiceType, setCarrierServiceType] = useState<string>("");

  // ── Confirm Delete States (Unified) ────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");
  const [confirmDeleteType, setConfirmDeleteType] = useState<"supplier" | "carrier">("supplier");
  const [deleting, setDeleting] = useState<boolean>(false);

  // Fetch product categories for supplier filter
  useEffect(() => {
    fetch("/api/plan-finance/inventory/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const rootNodes = data.filter((c) => !c.parentId || !data.some(p => p.id === c.parentId));
        
        const buildTree = (nodes: any[], level: number): any[] => {
          let result: any[] = [];
          for (const node of nodes) {
            const isRoot = level === 0;
            const prefix = isRoot ? "" : "\u00A0\u00A0\u00A0\u00A0".repeat(level);
            result.push({
              label: prefix + node.name,
              value: node.id,
              isHeader: isRoot,
              parentId: node.parentId
            });
            const children = data.filter((c) => c.parentId === node.id);
            if (children.length > 0) {
              result = result.concat(buildTree(children, level + 1));
            }
          }
          return result;
        };

        setCategoryOptions(buildTree(rootNodes, 0));
      })
      .catch(() => {});
  }, []);

  // Fetch Suppliers (Step 1)
  const fetchSuppliers = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set("partnerType", "SUPPLIER");
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
    if (currentStep === 1) {
      fetchSuppliers();
    }
  }, [fetchSuppliers, currentStep]);

  useEffect(() => {
    setPage(1);
  }, [status, selectedCategoryIds, search]);

  // Fetch Carriers (Step 2) - Dữ liệu thực tế từ bảng Carrier trong DB
  const fetchCarriers = useCallback(() => {
    setCarrierLoading(true);
    const p = new URLSearchParams();
    if (carrierStatus) p.set("trangThai", carrierStatus);
    if (carrierSearch) p.set("search", carrierSearch);
    if (carrierServiceType) p.set("serviceType", carrierServiceType);
    p.set("page", String(carrierPage));
    p.set("limit", "15");

    fetch(`/api/plan-finance/carriers?${p}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setCarriers(data.items ?? []);
          setCarrierTotal(data.total ?? 0);
        } else {
          setCarriers([]);
          setCarrierTotal(0);
        }
      })
      .catch(() => {
        setCarriers([]);
        setCarrierTotal(0);
      })
      .finally(() => setCarrierLoading(false));
  }, [carrierStatus, carrierSearch, carrierPage, carrierServiceType]);

  useEffect(() => {
    if (currentStep === 2) {
      fetchCarriers();
    }
  }, [fetchCarriers, currentStep]);

  useEffect(() => {
    setCarrierPage(1);
  }, [carrierStatus, carrierSearch, carrierServiceType]);

  // Rating updates
  const updateSupplierRating = async (id: string, newRating: number) => {
    try {
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, danhGia: newRating } : s));
      await fetch(`/api/plan-finance/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ danhGia: newRating })
      });
    } catch (error) {
      console.error("Failed to update rating", error);
    }
  };

  const updateCarrierRating = async (id: string, newRating: number) => {
    try {
      setCarriers(prev => prev.map(c => c.id === id ? { ...c, danhGia: newRating } : c));
      await fetch(`/api/plan-finance/carriers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ danhGia: newRating })
      });
    } catch (error) {
      console.error("Failed to update carrier rating", error);
    }
  };

  // Delete confirmation
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId || deleting) return;
    setDeleting(true);
    try {
      const url = confirmDeleteType === "carrier"
        ? `/api/plan-finance/carriers/${confirmDeleteId}`
        : `/api/plan-finance/suppliers/${confirmDeleteId}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setConfirmDeleteId(null);
        setConfirmDeleteName("");
        if (confirmDeleteType === "carrier") {
          fetchCarriers();
        } else {
          fetchSuppliers();
        }
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi khi xoá");
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setDeleting(false);
    }
  };

  // ── Step 1 Table Columns: Nhà cung cấp ─────────────────────────────────────
  const supplierColumns: TableColumn<any>[] = [
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
      width: "45px",
      align: "center"
    },
    {
      header: "Tên nhà cung cấp",
      render: (s) => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--foreground)" }}>{s.name}</div>
            <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map(star => (
                <i
                  key={star}
                  className={`bi ${star <= (s.danhGia || 0) ? "bi-star-fill text-warning" : "bi-star text-muted"}`}
                  style={{ cursor: "pointer", fontSize: "12px", transition: "all 0.2s" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateSupplierRating(s.id, star);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                />
              ))}
            </div>
          </div>
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
      noWrap: true,
      width: "140px",
      render: (s) => {
        const statusInfo = STATUS_MAP[s.trangThai] ?? { label: s.trangThai, color: "var(--muted-foreground)", bg: "var(--muted)" };
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 700,
              color: statusInfo.color,
              background: statusInfo.bg,
              whiteSpace: "nowrap"
            }}
          >
            {statusInfo.label}
          </span>
        );
      }
    }
  ];

  // ── Step 2 Table Columns: Đơn vị vận chuyển ────────────────────────────────
  const carrierColumns: TableColumn<any>[] = [
    {
      header: (
        <input
          type="checkbox"
          className="form-check-input"
          checked={carriers.length > 0 && selectedCarrierIds.length === carriers.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCarrierIds(carriers.map((c) => c.id));
            } else {
              setSelectedCarrierIds([]);
            }
          }}
        />
      ),
      render: (c) => (
        <input
          type="checkbox"
          className="form-check-input shadow-none"
          checked={selectedCarrierIds.includes(c.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCarrierIds((prev) => [...prev, c.id]);
            } else {
              setSelectedCarrierIds((prev) => prev.filter((id) => id !== c.id));
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: "48px",
      align: "center"
    },
    {
      header: "Đơn vị vận chuyển",
      width: "30%",
      render: (c) => {
        return (
          <div className="d-flex flex-column py-1" style={{ minWidth: 0 }}>
            {/* Tên đơn vị vận chuyển */}
            <div
              className="fw-bold text-truncate"
              style={{
                fontSize: "13.5px",
                color: "var(--foreground)",
                lineHeight: 1.35
              }}
              title={c.name}
            >
              {c.name}
            </div>

            {/* Địa chỉ giao dịch dưới tên đơn vị */}
            {c.transactionAddress ? (
              <div
                className="text-muted text-truncate mt-1 d-flex align-items-center"
                style={{ fontSize: "11.5px", lineHeight: 1.35, gap: "6px" }}
                title={c.transactionAddress}
              >
                <i className="bi bi-geo-alt text-muted flex-shrink-0" style={{ fontSize: "11.5px" }} />
                <span className="text-truncate">{c.transactionAddress}</span>
              </div>
            ) : (
              <div className="text-muted small fst-italic mt-0.5" style={{ fontSize: "11px" }}>
                Chưa có địa chỉ giao dịch
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Điều phối & Liên hệ",
      width: "28%",
      render: (c) => {
        const { name: contactName, role: contactRole } = parseContactNameAndRole(c.contactName);
        return (
          <div className="d-flex flex-column py-1" style={{ gap: "4px", minWidth: 0 }}>
            {contactName ? (
              /* Họ tên và Chức vụ trên CÙNG 1 DÒNG (đã bỏ icon person) */
              <div className="d-flex align-items-center flex-wrap" style={{ fontSize: "12.5px", color: "var(--foreground)", gap: "8px" }}>
                <span className="fw-semibold">{contactName}</span>
                {contactRole && (
                  <span
                    className="badge rounded-pill fw-medium"
                    style={{
                      fontSize: "10.5px",
                      color: "#4b5563",
                      background: "rgba(107, 114, 128, 0.1)",
                      border: "1px solid rgba(107, 114, 128, 0.2)",
                      padding: "1px 7px"
                    }}
                  >
                    {contactRole}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted small fst-italic">Chưa có người liên hệ</span>
            )}

            {(c.phone || c.email) && (
              <div className="d-flex align-items-center flex-wrap mt-0.5" style={{ fontSize: "11.5px", columnGap: "16px", rowGap: "4px" }}>
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="text-decoration-none text-body d-inline-flex align-items-center"
                    style={{ gap: "6px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <i className="bi bi-telephone text-primary flex-shrink-0" style={{ fontSize: "11.5px" }} />
                    <span className="fw-normal">{c.phone}</span>
                  </a>
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="text-decoration-none text-muted d-inline-flex align-items-center"
                    style={{ gap: "6px" }}
                    onClick={(e) => e.stopPropagation()}
                    title={c.email}
                  >
                    <i className="bi bi-envelope text-muted flex-shrink-0" style={{ fontSize: "11.5px" }} />
                    <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.email}
                    </span>
                  </a>
                )}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Bến bãi & Tuyến đường",
      width: "32%",
      render: (c) => {
        let rawNote = c.ghiChu || "";
        rawNote = rawNote.replace(/\[CARRIER\]\s*/g, "").trim();
        const routeText = c.routes?.trim() || rawNote;
        const hasExtraNote = !!rawNote && rawNote !== c.routes?.trim();

        return (
          <div className="d-flex flex-column py-1" style={{ gap: "4px", minWidth: 0 }}>
            {c.address ? (
              <div className="d-flex align-items-start" style={{ fontSize: "11.5px", color: "var(--foreground)", lineHeight: 1.35, gap: "7px" }}>
                <i className="bi bi-geo-alt-fill text-danger flex-shrink-0 mt-0.5" style={{ fontSize: "12px" }} />
                <span title={c.address} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {c.address}
                </span>
              </div>
            ) : (
              <span className="text-muted small fst-italic">Chưa có địa chỉ bến bãi</span>
            )}

            {routeText ? (
              <div className="d-flex align-items-start" style={{ fontSize: "11px", color: "var(--muted-foreground)", lineHeight: 1.35, gap: "7px" }}>
                <i className="bi bi-signpost-2 text-primary flex-shrink-0 mt-0.5" style={{ fontSize: "11.5px" }} />
                <span title={routeText} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {routeText}
                </span>
              </div>
            ) : (
              <span className="text-muted small fst-italic" style={{ fontSize: "10.5px" }}>
                Chưa có tuyến đường phục vụ
              </span>
            )}

            {hasExtraNote && c.routes?.trim() && (
              <div className="d-flex align-items-start" style={{ fontSize: "10.5px", color: "var(--muted-foreground)", lineHeight: 1.3, gap: "7px" }}>
                <i className="bi bi-info-circle text-muted flex-shrink-0 mt-0.5" style={{ fontSize: "11px" }} />
                <span title={rawNote} style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {rawNote}
                </span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Trạng thái",
      align: "center",
      noWrap: true,
      width: "135px",
      render: (c) => {
        const statusInfo = CARRIER_STATUS_MAP[c.trangThai] ?? { label: c.trangThai, color: "var(--muted-foreground)", bg: "var(--muted)" };
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 700,
              color: statusInfo.color,
              background: statusInfo.bg,
              whiteSpace: "nowrap"
            }}
          >
            {statusInfo.label}
          </span>
        );
      }
    }
  ];

  // ── Toolbars for Step 1 & Step 2 ───────────────────────────────────────────
  const supplierToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
      <div className="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
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

        <div className="flex-grow-1" style={{ minWidth: 220 }}>
          <SearchInput
            placeholder="Tìm kiếm nhà cung cấp..."
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      <button
        onClick={() => setIsAddOpen(true)}
        className="btn btn-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-2 flex-shrink-0"
        style={{ height: 32, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", background: "#003087", borderColor: "#003087" }}
      >
        <i className="bi bi-plus-lg" />
        Thêm nhà cung cấp
      </button>
    </div>
  );

  const carrierToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
      <div className="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
        <FilterSelect
          placeholder="Loại hình dịch vụ"
          options={CARRIER_SERVICE_OPTIONS}
          value={carrierServiceType}
          onChange={setCarrierServiceType}
          width={180}
        />
        
        <FilterSelect
          placeholder="Trạng thái hoạt động"
          options={CARRIER_STATUS_OPTIONS}
          value={carrierStatus}
          onChange={setCarrierStatus}
          width={160}
        />

        <div className="flex-grow-1" style={{ minWidth: 220 }}>
          <SearchInput
            placeholder="Tìm đơn vị vận chuyển, lái xe, bến bãi..."
            value={carrierSearch}
            onChange={setCarrierSearch}
          />
        </div>
      </div>

      <button
        onClick={() => setIsAddCarrierOpen(true)}
        className="btn btn-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-2 flex-shrink-0"
        style={{ height: 32, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", background: "#003087", borderColor: "#003087" }}
      >
        <i className="bi bi-plus-lg" />
        Thêm đơn vị vận chuyển
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
          padding-top: 5px !important;
          padding-bottom: 5px !important;
        }
        .app-responsive-table-wrapper table th {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
      `}</style>

      <PageHeader
        title="Nhà cung cấp và vận chuyển"
        description="Supplier & Transporter Management · Quản lý danh mục nhà cung cấp, đơn vị vận tải & thông tin liên lạc"
        color="blue"
        icon="bi-truck"
      />

      <div style={{ padding: "8px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <WorkflowCard
          stepper={
            <ModernStepper
              steps={STEP_ITEMS}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingX={0}
              paddingY={8}
            />
          }
          toolbar={currentStep === 1 ? supplierToolbar : carrierToolbar}
          contentPadding="px-4 pb-3 pt-2"
        >
          {currentStep === 1 ? (
            <div className="d-flex flex-column h-100 justify-content-between" style={{ minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                <Table<any>
                  rows={suppliers}
                  columns={supplierColumns}
                  loading={loading}
                  rowKey={(r) => r.id}
                  onRowClick={setSelectedSupplier}
                  emptyIcon="bi-building"
                  emptyText="Không có nhà cung cấp nào được tìm thấy"
                  compact
                />
              </div>

              {total > 15 && (
                <div className="pt-2 border-top mt-auto flex-shrink-0 d-flex justify-content-center">
                  <Pagination
                    page={page}
                    totalPages={Math.ceil(total / 15)}
                    onChange={setPage}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="d-flex flex-column h-100 justify-content-between" style={{ minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                <Table<any>
                  rows={carriers}
                  columns={carrierColumns}
                  loading={carrierLoading}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => setEditingCarrierId(r.id)}
                  emptyIcon="bi-truck"
                  emptyText="Không có đơn vị vận chuyển nào được tìm thấy"
                  compact
                />
              </div>

              {carrierTotal > 15 && (
                <div className="pt-2 border-top mt-auto flex-shrink-0 d-flex justify-content-center">
                  <Pagination
                    page={carrierPage}
                    totalPages={Math.ceil(carrierTotal / 15)}
                    onChange={setCarrierPage}
                  />
                </div>
              )}
            </div>
          )}
        </WorkflowCard>
      </div>

      {/* Supplier Modals & Offcanvas */}
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
            setSelectedSupplier(null);
            fetchSuppliers();
          }}
        />
      )}

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
              setConfirmDeleteType("supplier");
            }}
            onChanged={fetchSuppliers}
          />
        )}
      </AnimatePresence>

      {/* Carrier Modals & Offcanvas (Drawer 400px) */}
      <AnimatePresence>
        {isAddCarrierOpen && (
          <AddCarrierModal
            onClose={() => setIsAddCarrierOpen(false)}
            onSaved={() => {
              setIsAddCarrierOpen(false);
              fetchCarriers();
            }}
          />
        )}

        {editingCarrierId && (
          <AddCarrierModal
            carrierId={editingCarrierId}
            onClose={() => setEditingCarrierId(null)}
            onSaved={() => {
              setEditingCarrierId(null);
              fetchCarriers();
            }}
            onDelete={(id, name) => {
              setEditingCarrierId(null);
              setConfirmDeleteId(id);
              setConfirmDeleteName(name);
              setConfirmDeleteType("carrier");
            }}
          />
        )}
      </AnimatePresence>

      {/* Unified Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title={confirmDeleteType === "carrier" ? "Xoá đơn vị vận chuyển" : "Xoá nhà cung cấp"}
        message={`Bạn có chắc chắn muốn xoá ${confirmDeleteType === "carrier" ? "đơn vị vận chuyển" : "nhà cung cấp"} "${confirmDeleteName}" không? Hành động này không thể hoàn tác.`}
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

  const statusInfo = STATUS_MAP[detail?.supplier.trangThai || supplier.trangThai] ?? { label: supplier.trangThai, color: "var(--muted-foreground)", bg: "var(--muted)" };

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
          <button onClick={onClose} style={{ position: "absolute", top: 6, right: 20, width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x-lg" style={{ fontSize: 18 }} />
          </button>
          
          <h3 style={{ margin: "0 40px 0 0", fontWeight: 800, fontSize: "18px", color: "var(--foreground)", wordBreak: "break-word", lineHeight: 1.2 }}>
            {detail?.supplier.name || supplier.name}
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: "var(--muted-foreground)", fontSize: "12px" }}>
            <i className="bi bi-geo-alt" style={{ fontSize: 13 }} />
            <span>{detail?.supplier.address || supplier.address || "—"}</span>
          </div>

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

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)" }}>
              Đang tải thông tin...
            </div>
          ) : (
            <>
              {/* Info grid */}
              <div style={{ background: "var(--muted)", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Mã số thuế:</span>
                  <span style={{ fontWeight: 600 }}>{detail?.supplier.taxCode || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Người liên hệ:</span>
                  <span style={{ fontWeight: 600 }}>
                    {detail?.supplier.contactName ? `${detail.supplier.contactName} ${detail.supplier.xungHo ? `(${detail.supplier.xungHo})` : ""}` : "—"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Điện thoại:</span>
                  <span style={{ fontWeight: 600 }}>{detail?.supplier.phone || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Email:</span>
                  <span style={{ fontWeight: 600 }}>{detail?.supplier.email || "—"}</span>
                </div>
                {detail?.supplier.website && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Website:</span>
                    <a href={detail.supplier.website} target="_blank" rel="noreferrer" style={{ color: "#003087", fontWeight: 600 }}>
                      Truy cập
                    </a>
                  </div>
                )}
              </div>

              {/* Status quick switch */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Đổi trạng thái
                </label>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  {["active", "paused", "inactive"].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      style={{
                        flex: 1, padding: "6px", borderRadius: 8, fontSize: "11px", fontWeight: 600,
                        border: "1px solid var(--border)",
                        background: (detail?.supplier.trangThai || supplier.trangThai) === st ? "var(--foreground)" : "transparent",
                        color: (detail?.supplier.trangThai || supplier.trangThai) === st ? "var(--background)" : "var(--foreground)",
                        cursor: "pointer", transition: "all 0.15s"
                      }}
                    >
                      {STATUS_MAP[st]?.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px" }}>
          <button
            onClick={() => onDelete(supplier.id, supplier.name)}
            style={{
              flex: 1, padding: "8px", borderRadius: 8, fontSize: "12px", fontWeight: 600,
              border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
              color: "#ef4444", cursor: "pointer"
            }}
          >
            <i className="bi bi-trash me-1" /> Xoá
          </button>
          <button
            onClick={() => onEdit(supplier.id)}
            style={{
              flex: 2, padding: "8px", borderRadius: 8, fontSize: "12px", fontWeight: 700,
              border: "none", background: "#003087", color: "white", cursor: "pointer"
            }}
          >
            <i className="bi bi-pencil me-1" /> Chỉnh sửa
          </button>
        </div>
      </motion.div>
    </>
  );
}
