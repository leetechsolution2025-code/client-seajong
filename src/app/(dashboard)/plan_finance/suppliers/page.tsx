"use client";
import React from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { AddSupplierModal } from "@/components/plan-finance/mua_hang/AddSupplierModal";

type SupplierStats = { total: number; active: number; categoryStats: { label: string; value: number }[] };
type SupplierItem  = {
  id: string; code: string | null; name: string;
  contactName: string | null; xungHo: string | null;
  phone: string | null; email: string | null; address: string | null;
  taxCode: string | null; website: string | null;
  hanMucNo: number; danhGia: number; trangThai: string; ghiChu: string | null;
  categories: { category: { id: string; name: string } }[];
  createdAt: string;
};
type CatOption = { label: string; value: string };

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Đang hoạt động", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  paused:   { label: "Tạm ngừng",      color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  inactive: { label: "Dừng hợp tác",   color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
};
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, color: "#6366f1", bg: "rgba(99,102,241,0.1)" };
  return (
    <span style={{ padding: "2px 9px", borderRadius: 9999, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const [stats, setStats]       = React.useState<SupplierStats | null>(null);
  const [loading, setLoading]   = React.useState(true);
  const [filterCategory, setFilterCategory] = React.useState("");
  const [filterStatus,   setFilterStatus]   = React.useState("");
  const [search, setSearch]     = React.useState("");
  const [categories, setCategories] = React.useState<CatOption[]>([]);
  const [items, setItems]       = React.useState<SupplierItem[]>([]);
  const [itemsLoading, setItemsLoading] = React.useState(true);
  const [page, setPage]         = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [addOpen, setAddOpen]   = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [selected, setSelected] = React.useState<SupplierItem | null>(null);

  const refreshStats = () =>
    fetch("/api/plan-finance/suppliers/stats").then(r => r.json()).then(setStats).catch(() => {});

  React.useEffect(() => {
    fetch("/api/plan-finance/suppliers/stats")
      .then(r => r.json()).then(setStats).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetch("/api/plan-finance/inventory/categories")
      .then(r => r.json())
      .then((cats: { id: string; name: string }[]) =>
        setCategories(cats.map(c => ({ label: c.name, value: c.id })))
      ).catch(() => {});
  }, []);

  React.useEffect(() => {
    setItemsLoading(true);
    const p = new URLSearchParams();
    if (filterCategory) p.set("categoryId", filterCategory);
    if (filterStatus)   p.set("trangThai",  filterStatus);
    if (search)         p.set("search",     search);
    p.set("page", String(page));
    p.set("limit", "6");
    fetch(`/api/plan-finance/suppliers?${p}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotalPages(d.totalPages ?? 1); })
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));
  }, [filterCategory, filterStatus, search, page, refreshKey]);

  React.useEffect(() => { setPage(1); }, [filterCategory, filterStatus, search]);

  const kpis = [
    { label: "Tổng số NCC",    value: loading ? "..." : String(stats?.total  ?? 0), icon: "bi-building",     accent: "#2563eb" },
    { label: "Đang hoạt động", value: loading ? "..." : String(stats?.active ?? 0), icon: "bi-check-circle", accent: "#10b981" },
  ];

  return (<>
    <SplitLayoutPage
      title="Nhà cung cấp"
      description="Quản lý danh sách nhà cung cấp và đánh giá chất lượng"
      icon="bi-building-check"
      color="blue"
      leftTopContent={
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {kpis.map(k => (
            <KPICard key={k.label} label={k.label} value={k.value} icon={k.icon} accent={k.accent} colClass="" />
          ))}
        </div>
      }
      leftContent={
        <div>
          <SectionTitle title="Cơ cấu theo danh mục hàng hoá" />
          {loading ? (
            <div style={{ height: 200, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />
          ) : (stats?.categoryStats ?? []).length === 0 ? (
            <p style={{ color: "var(--muted-foreground)", fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 24 }}>
              Chưa có dữ liệu nhà cung cấp theo danh mục
            </p>
          ) : (
            <BarChartHorizontal data={stats?.categoryStats ?? []} color="#2563eb" />
          )}
        </div>
      }
      rightContent={
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <SectionTitle title="Danh sách nhà cung cấp" />
            <FilterSelect options={categories} value={filterCategory} onChange={setFilterCategory} placeholder="Danh mục" />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <FilterSelect
              options={[
                { label: "Đang hoạt động", value: "active"   },
                { label: "Tạm ngừng",      value: "paused"   },
                { label: "Dừng hợp tác",   value: "inactive" },
              ]}
              value={filterStatus} onChange={setFilterStatus} placeholder="Trạng thái"
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm nhà cung cấp..." />
            <button
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", border: "none", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              onClick={() => setAddOpen(true)}
            >
              <i className="bi bi-plus-lg" style={{ fontSize: 13 }} /> Thêm mới
            </button>
          </div>

          {/* Bảng */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ background: "var(--muted)" }}>
                    {["Nhà cung cấp", "Thông tin liên hệ", "Trạng thái"].map(col => (
                      <th key={col} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, fontSize: 11.5, color: "var(--muted-foreground)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                        {["45%","35%","10%"].map((w, j) => (
                          <td key={j} style={{ padding: "10px 12px" }}>
                            <div style={{ height: 14, width: w, borderRadius: 6, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: "32px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, fontStyle: "italic" }}>Chưa có nhà cung cấp nào</td></tr>
                  ) : items.map(s => (
                    <tr key={s.id}
                      style={{ borderTop: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      onClick={() => setSelected(s)}
                    >
                      {/* Tên NCC */}
                      <td style={{ padding: "9px 12px" }}>
                        <p style={{ margin: 0, fontWeight: 700, color: "var(--foreground)" }}>{s.name}</p>
                        {s.code && <p style={{ margin: "1px 0 0", fontSize: 10, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{s.code}</p>}
                        {s.categories.length > 0 && (
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                            {s.categories.map(c => c.category.name).join(" · ")}
                          </p>
                        )}
                      </td>
                      {/* Liên hệ: tên người + phone */}
                      <td style={{ padding: "9px 12px", color: "var(--muted-foreground)", maxWidth: 160, overflow: "hidden" }}>
                        {s.contactName && (
                          <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            <i className="bi bi-person-fill" style={{ fontSize: 11, flexShrink: 0 }} />
                            {s.xungHo && <span style={{ color: "var(--primary)", flexShrink: 0 }}>{s.xungHo}</span>}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.contactName}</span>
                          </p>
                        )}
                        {s.phone && (
                          <p style={{ margin: 0, fontSize: 12, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                            <i className="bi bi-telephone-fill" style={{ fontSize: 11, flexShrink: 0 }} />
                            {s.phone}
                          </p>
                        )}
                        {!s.contactName && !s.phone && <span style={{ fontSize: 12 }}>—</span>}
                      </td>
                      {/* Trạng thái */}
                      <td style={{ padding: "9px 12px" }}>
                        <StatusBadge status={s.trangThai} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      }
    />

    {/* Modal thêm mới */}
    {addOpen && (
      <AddSupplierModal
        categories={categories}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setRefreshKey(k => k + 1);
          setAddOpen(false);
          refreshStats();
        }}
      />
    )}

    {/* Offcanvas chi tiết */}
    {selected && (
      <SupplierDetailOffcanvas
        supplier={selected}
        categories={categories}
        onClose={() => setSelected(null)}
        onUpdated={(updated) => {
          setItems(prev => prev.map(s => s.id === updated.id ? updated : s));
          setSelected(updated);
          refreshStats();
        }}
        onDeleted={() => {
          setSelected(null);
          setRefreshKey(k => k + 1);
          refreshStats();
        }}
      />
    )}
  </>);
}


// ── Supplier Detail Offcanvas ──────────────────────────────────────────────────
type PurchaseOrderRow = { id: string; code: string | null; ngayDat: string | null; trangThai: string; tongTien: number; daThanhToan: number };
const PO_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Nháp",    color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  ordered:   { label: "Đã đặt",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  received:  { label: "Đã nhận hàng", color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  cancelled: { label: "Huỷ",     color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
};

function SupplierDetailOffcanvas({ supplier, categories, onClose, onUpdated, onDeleted }: {
  supplier: SupplierItem; categories: CatOption[];
  onClose: () => void; onUpdated: (s: SupplierItem) => void; onDeleted: () => void;
}) {
  const [editMode,     setEditMode]     = React.useState(false);
  const [saving,       setSaving]       = React.useState(false);
  const [confirmDel,   setConfirmDel]   = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [congNo,       setCongNo]       = React.useState(0);
  const [orders,       setOrders]       = React.useState<PurchaseOrderRow[]>([]);
  const [catOpen,      setCatOpen]      = React.useState(false);
  const [form, setForm] = React.useState({
    name: supplier.name, address: supplier.address ?? "", contactName: supplier.contactName ?? "",
    xungHo: supplier.xungHo ?? "Anh", phone: supplier.phone ?? "", email: supplier.email ?? "",
    taxCode: supplier.taxCode ?? "", website: supplier.website ?? "",
    hanMucNo: String(supplier.hanMucNo), ghiChu: supplier.ghiChu ?? "", trangThai: supplier.trangThai,
  });
  const [selectedCats, setSelectedCats] = React.useState<string[]>(supplier.categories.map(c => c.category.id));

  React.useEffect(() => {
    fetch(`/api/plan-finance/suppliers/${supplier.id}`)
      .then(r => r.json())
      .then(d => { setCongNo(d.congNoHienTai ?? 0); setOrders(d.orders ?? []); })
      .catch(() => {});
  }, [supplier.id]);

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "7px 10px", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 13, background: "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  };
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleCat = (v: string) =>
    setSelectedCats(cs => cs.includes(v) ? cs.filter(c => c !== v) : [...cs, v]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plan-finance/suppliers/${supplier.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, address: form.address, contactName: form.contactName,
          xungHo: form.xungHo, phone: form.phone, email: form.email,
          taxCode: form.taxCode, website: form.website,
          hanMucNo: parseFloat(form.hanMucNo) || 0,
          ghiChu: form.ghiChu, trangThai: form.trangThai, categoryIds: selectedCats,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated({ ...updated, categories: updated.categories ?? supplier.categories });
      setEditMode(false);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleStatusChange = async (st: string) => {
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/plan-finance/suppliers/${supplier.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: st }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated({ ...supplier, ...updated, categories: supplier.categories });
    } catch { /* ignore */ } finally { setStatusSaving(false); }
  };

  const handleDelete = async () => {
    await fetch(`/api/plan-finance/suppliers/${supplier.id}`, { method: "DELETE" });
    onDeleted();
  };

  const fmt = (v: number) => v.toLocaleString("vi-VN");
  const st  = STATUS_CFG[supplier.trangThai] ?? STATUS_CFG.active;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, backdropFilter: "blur(3px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, minWidth: 400, maxWidth: 400, zIndex: 1031,
        background: "var(--background)",
        borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* HERO HEADER */}
        <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ padding: "8px 14px 10px" }}>
            {/* Tên NCC + ✕ */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: "var(--foreground)", lineHeight: 1.35, flex: 1 }}>{supplier.name}</p>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: 14, padding: "2px 4px", borderRadius: 6, flexShrink: 0, marginTop: 2 }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* Địa chỉ */}
            {supplier.address && (
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "flex-start", gap: 5 }}>
                <i className="bi bi-geo-alt" style={{ fontSize: 12, marginTop: 1, flexShrink: 0 }} />
                {supplier.address}
              </p>
            )}
            {!supplier.address && <div style={{ marginBottom: 6 }} />}

            {/* Trạng thái + Sao đánh giá */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: "3px 10px", borderRadius: 99 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color, display: "inline-block" }} />
                {st.label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {[1,2,3,4,5].map(star => (
                  <button key={star}
                    onClick={async () => {
                      const newRating = star === supplier.danhGia ? 0 : star;
                      try {
                        const res = await fetch(`/api/plan-finance/suppliers/${supplier.id}`, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ danhGia: newRating }),
                        });
                        if (res.ok) { const u = await res.json(); onUpdated({ ...supplier, ...u, categories: supplier.categories }); }
                      } catch { /* ignore */ }
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "1px 2px", lineHeight: 1 }}
                    title={star + " sao"}
                  >
                    <i className={"bi " + (star <= supplier.danhGia ? "bi-star-fill" : "bi-star")}
                      style={{ fontSize: 16, color: star <= supplier.danhGia ? "#f59e0b" : "var(--muted-foreground)", transition: "color 0.15s" }} />
                  </button>
                ))}
                {supplier.danhGia > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginLeft: 4 }}>{supplier.danhGia}/5</span>
                )}
              </div>
            </div>

            {/* Hạn mức nợ + Công nợ */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: "var(--background)", borderRadius: 8, padding: "6px 10px", border: "1px solid var(--border)" }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hạn mức nợ</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
                  {supplier.hanMucNo > 0 ? fmt(supplier.hanMucNo) + "₫" : <span style={{ color: "var(--muted-foreground)", fontWeight: 400, fontSize: 12 }}>Chưa đặt</span>}
                </p>
              </div>
              <div style={{ background: "var(--background)", borderRadius: 8, padding: "6px 10px", border: "1px solid " + (congNo > 0 ? "#f59e0b44" : "var(--border)") }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Công nợ</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 800, color: congNo > 0 ? "#f59e0b" : "#10b981" }}>
                  {fmt(congNo)}₫
                </p>
              </div>
            </div>

            {/* Progress bar công nợ */}
            {supplier.hanMucNo > 0 && (() => {
              const pct   = Math.min(100, (congNo / supplier.hanMucNo) * 100);
              const color = pct >= 90 ? "#ef4444" : pct >= 60 ? "#f59e0b" : "#10b981";
              return (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Sử dụng hạn mức
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color }}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: "var(--muted)", overflow: "hidden", position: "relative" }}>
                    <div style={{
                      height: "100%", width: pct + "%",
                      background: "linear-gradient(90deg," + color + "99," + color + ")",
                      borderRadius: 99, transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* Thông tin liên hệ */}
          <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
              <i className="bi bi-person-lines-fill" style={{ color: "var(--primary)" }} />
              Liên hệ
            </p>

            {(supplier.contactName || supplier.xungHo) && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--foreground)" }}>
                <i className="bi bi-person" style={{ fontSize: 13, color: "var(--muted-foreground)", width: 16, textAlign: "center" }} />
                <span style={{ fontWeight: 600 }}>{[supplier.xungHo, supplier.contactName].filter(Boolean).join(" ")}</span>
              </div>
            )}

            {supplier.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
                <i className="bi bi-telephone" style={{ fontSize: 12, color: "var(--muted-foreground)", width: 16, textAlign: "center" }} />
                <a href={"tel:" + supplier.phone} style={{ color: "var(--foreground)", fontWeight: 400, textDecoration: "none" }}>
                  {supplier.phone}
                </a>
              </div>
            )}

            {supplier.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, minWidth: 0 }}>
                <i className="bi bi-envelope" style={{ fontSize: 12, color: "var(--muted-foreground)", width: 16, textAlign: "center", flexShrink: 0 }} />
                <a href={"mailto:" + supplier.email} style={{ color: "var(--foreground)", fontWeight: 400, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {supplier.email}
                </a>
              </div>
            )}

            {!supplier.contactName && !supplier.phone && !supplier.email && (
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>Chưa có thông tin liên hệ</span>
            )}
          </div>

          {/* Lịch sử giao dịch */}
          <div style={{ padding: "14px 14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Lịch sử giao dịch</p>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 12%, transparent)", borderRadius: 10, padding: "1px 6px" }}>
                  {orders.filter(o => o.trangThai !== "cancelled").length}
                </span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: "var(--muted-foreground)", fontSize: 13, background: "var(--muted)", borderRadius: 12 }}>
                <i className="bi bi-bag-x" style={{ fontSize: 22, display: "block", marginBottom: 8, opacity: 0.3 }} />
                Chưa có giao dịch nào
              </div>
            ) : (
              <div style={{ position: "relative", paddingLeft: 38 }}>
                {/* Đường dọc timeline */}
                <div style={{ position: "absolute", left: 17, top: 4, bottom: 4, width: 2, background: "linear-gradient(to bottom, var(--border), rgba(226,232,240,0))", borderRadius: 4 }} />

                {orders.map((o, i) => {
                  const isCancelled = o.trangThai === "cancelled";
                  const statusCfg: Record<string, { color: string; label: string; icon: string }> = {
                    draft:     { color: "#94a3b8", label: "Nháp",     icon: "bi-file-earmark" },
                    ordered:   { color: "#3b82f6", label: "Đã đặt",   icon: "bi-bag-check"   },
                    received:  { color: "#10b981", label: "Đã nhận hàng",  icon: "bi-box-seam"    },
                    cancelled: { color: "#ef4444", label: "Huỷ",      icon: "bi-x-circle"    },
                  };
                  const cfg = statusCfg[o.trangThai] ?? statusCfg.draft;
                  const fmt = (v: number) => v.toLocaleString("vi-VN");
                  const fmtD = (s: string) => new Date(s).toLocaleDateString("vi-VN");
                  return (
                    <div key={o.id} style={{ position: "relative", marginBottom: 12, opacity: isCancelled ? 0.55 : 1 }}>
                      {/* Icon dot */}
                      <div style={{ position: "absolute", left: -31, top: 4, width: 24, height: 24, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px var(--border)" }}>
                        <i className={"bi " + cfg.icon} style={{ fontSize: 10, color: cfg.color }} />
                      </div>
                      {/* Card */}
                      <div style={{ background: "var(--card)", borderRadius: 10, padding: "8px 10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: cfg.color, padding: "2px 7px", background: "color-mix(in srgb," + cfg.color + " 10%, transparent)", borderRadius: 6 }}>{cfg.label}</span>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>• {o.ngayDat ? fmtD(o.ngayDat) : "—"}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{fmt(o.tongTien)}₫</span>
                        </div>
                        {o.daThanhToan > 0 && (
                          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                            Đã TT: <span style={{ color: "#10b981", fontWeight: 600 }}>{fmt(o.daThanhToan)}₫</span>
                            {o.tongTien - o.daThanhToan > 0 && (
                              <span> · Còn: <span style={{ color: "#f59e0b", fontWeight: 600 }}>{fmt(o.tongTien - o.daThanhToan)}₫</span></span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", flexShrink: 0, background: "var(--card)" }}>
          {editMode ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setEditMode(false)} style={{ padding: "8px 18px", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Huỷ</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", border: "none", background: saving ? "var(--muted)" : "var(--primary)", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7 }}>
                {saving && <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />}
                Lưu thay đổi
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Nút đổi trạng thái */}
              {Object.entries(STATUS_CFG).filter(([k]) => k !== supplier.trangThai).map(([k, v]) => (
                <button key={k} onClick={() => handleStatusChange(k)} disabled={statusSaving}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 13px", borderRadius: 8, border: "1px solid " + v.color + "44", background: v.bg, color: v.color, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: statusSaving ? 0.6 : 1 }}>
                  {v.label}
                </button>
              ))}

              {/* Nút Sửa + Xoá (icon only, gần nhau) */}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                {/* Sửa */}
                <button onClick={() => setEditMode(true)} title="Sửa"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--foreground)", cursor: "pointer", fontSize: 13 }}>
                  <i className="bi bi-pencil-fill" />
                </button>

                {/* Xoá */}
                {!confirmDel ? (
                  <button onClick={() => setConfirmDel(true)} title="Xoá"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "none", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 7, color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
                    <i className="bi bi-trash3" />
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap" }}>Xoá?</span>
                    <button onClick={handleDelete} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Đồng ý</button>
                    <button onClick={() => setConfirmDel(false)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "none", fontSize: 12, cursor: "pointer", color: "var(--foreground)" }}>Không</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

