"use client";
import React from "react";
import { SplitLayoutPage }    from "@/components/layout/SplitLayoutPage";
import { SectionTitle }       from "@/components/ui/SectionTitle";
import { KPICard }            from "@/components/ui/KPICard";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { FilterSelect }       from "@/components/ui/FilterSelect";
import { SearchInput }        from "@/components/ui/SearchInput";
import { Pagination }         from "@/components/ui/Pagination";
import { ConfirmDialog }      from "@/components/ui/ConfirmDialog";
import { useToast }           from "@/components/ui/Toast";
import { CurrencyInput }      from "@/components/ui/CurrencyInput";
import { TaoMoiHangHoa }      from "@/components/plan-finance/kho_hang/TaoMoiHangHoa";
import { ChiTietHangHoaOffcanvas, type InventoryItemDetail } from "@/components/plan-finance/kho_hang/ChiTietHangHoaOffcanvas";
import { NhapKhoModal }       from "@/components/plan-finance/kho_hang/NhapKhoModal";
import { XuatKhoModal }       from "@/components/plan-finance/kho_hang/XuatKhoModal";
import { LuanChuyenKhoModal } from "@/components/plan-finance/kho_hang/LuanChuyenKhoModal";
import { KiemKhoModal }        from "@/components/plan-finance/kho_hang/KiemKhoModal";



const DEFAULT_FORM = {
  code: "", tenHang: "", categoryId: "", donVi: "",
  soLuong: 0, soLuongMin: 0, giaNhap: 0, giaBan: 0,
  thongSoKyThuat: "", ghiChu: "", trangThai: "con-hang", nhaCungCapId: "",
};

const DVT_OPTIONS = ["Cái","Chiếc","Bộ","Cuộn","Tấm","Thanh","Kg","Tấn","m","m²","m³","Hộp","Thùng","Lít"];

// ── Types ─────────────────────────────────────────────────────────────────────
// InventoryItem is aliased to InventoryItemDetail from the component
type InventoryItem = InventoryItemDetail;

interface InventoryStats {
  tongMatHang:        number;
  tongGiaTri:         number;
  sapHet:             number;
  hetHang:            number;
  categoryStats:      { label: string; value: number }[];
  categoryValueStats: { label: string; value: number }[];
}

interface WarehouseInfo {
  id:          string;
  code?:       string | null;
  name:        string;
  address?:    string | null;
  phone?:      string | null;
  isActive:    boolean;
  soMatHang?:  number;
  tongSoLuong?: number;
}

const EMPTY_WH = { name: "", code: "", address: "", phone: "" };

function WarehouseOffcanvas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();

  const [warehouses, setWarehouses]     = React.useState<WarehouseInfo[]>([]);
  const [loading, setLoading]           = React.useState(false);
  const [saving, setSaving]             = React.useState(false);
  const [deleting, setDeleting]         = React.useState(false);
  const [error, setError]               = React.useState("");
  const [form, setForm]                 = React.useState(EMPTY_WH);
  const [editId, setEditId]             = React.useState<string | null>(null);
  const [showForm, setShowForm]         = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<WarehouseInfo | null>(null);


  const fetchWarehouses = React.useCallback(() => {
    setLoading(true);
    fetch("/api/plan-finance/warehouses")
      .then(r => r.json())
      .then(d => setWarehouses(Array.isArray(d) ? d : []))
      .catch(() => setWarehouses([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (open) fetchWarehouses();
  }, [open, fetchWarehouses]);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const openAdd = () => { setForm(EMPTY_WH); setEditId(null); setError(""); setShowForm(true); };
  const openEdit = (w: WarehouseInfo) => {
    setForm({ name: w.name, code: w.code ?? "", address: w.address ?? "", phone: w.phone ?? "" });
    setEditId(w.id);
    setError("");
    setShowForm(true);
  };
  const cancelForm = () => { setShowForm(false); setEditId(null); setError(""); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Tên kho không được để trống"); return; }
    setSaving(true); setError("");
    try {
      const url    = editId ? `/api/plan-finance/warehouses/${editId}` : "/api/plan-finance/warehouses";
      const method = editId ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data   = await res.json();
      if (!res.ok) { setError(data.error ?? "Lỗi không xác định"); return; }
      toast.success(editId ? "Cập nhật thành công" : "Tạo kho thành công", editId ? `Kho "${form.name}" đã được cập nhật.` : `Kho "${form.name}" đã được tạo.`);
      await fetchWarehouses();
      cancelForm();
    } catch { setError("Lỗi kết nối"); }
    finally { setSaving(false); }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/plan-finance/warehouses/${confirmDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Không thể xóa kho", data.error ?? "Lỗi không xác định");
        setConfirmDelete(null);
        return;
      }
      toast.success("Xóa kho thành công", `Kho "${confirmDelete.name}" đã bị xóa.`);
      setConfirmDelete(null);
      fetchWarehouses();
    } catch {
      toast.error("Lỗi kết nối", "Không thể kết nối đến server.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (w: WarehouseInfo) => {
    const res = await fetch(`/api/plan-finance/warehouses/${w.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !w.isActive }),
    });
    if (res.ok) {
      toast.info(w.isActive ? `Đã tạm dừng kho "${w.name}"` : `Đã kích hoạt kho "${w.name}"`);
      fetchWarehouses();
    }
  };


  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 8,
    border: "1.5px solid var(--border)", background: "var(--background)",
    color: "var(--foreground)", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)",
    textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4,
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 4000,
        background: open ? "rgba(0,0,0,0.35)" : "transparent",
        pointerEvents: open ? "auto" : "none",
        transition: "background 0.25s",
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        minWidth: 420, maxWidth: 420,
        background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        zIndex: 4001,
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>

        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb, var(--primary) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-building" style={{ fontSize: 18, color: "var(--primary)" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Quản lý kho</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>{warehouses.length} kho được cấu hình</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
              <i className="bi bi-x" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {/* Form thêm / sửa kho */}
          {showForm && (
            <div style={{ marginBottom: 16, padding: "16px", borderRadius: 12, border: "1.5px solid var(--primary)", background: "color-mix(in srgb, var(--primary) 5%, var(--card))" }}>
              <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 13, color: "var(--foreground)" }}>
                {editId ? "Ðiều chỉnh kho" : "Thêm kho mới"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Tên kho *</label>
                  <input style={inputStyle} value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Kho Hà Nội" autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Mã kho</label>
                  <input style={inputStyle} value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="KHO-HN" />
                </div>
                <div>
                  <label style={labelStyle}>Điện thoại</label>
                  <input style={inputStyle} value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="0912345678" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Địa chỉ kho</label>
                  <input style={inputStyle} value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="123 Đường ABC, Hà Nội" />
                </div>
              </div>
              {error && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f43f5e" }}><i className="bi bi-exclamation-circle-fill" /> {error}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={cancelForm} style={{ flex: 1, padding: "8px 0", background: "transparent", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", cursor: "pointer" }}>Hủy</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "8px 0", background: "var(--primary)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : (editId ? "Cập nhật" : "Tạo kho")}
                </button>
              </div>
            </div>
          )}

          {/* Danh sách kho */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : warehouses.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
              <i className="bi bi-building-slash" style={{ fontSize: 30, display: "block", marginBottom: 8, opacity: 0.3 }} />
              Chưa có kho nào
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {warehouses.map(w => (
                <div key={w.id} style={{
                  padding: "12px 14px", borderRadius: 12,
                  border: "1px solid var(--border)", background: "var(--card)",
                  opacity: w.isActive ? 1 : 0.55,
                  transition: "opacity 0.2s",
                }}>
                  {/* Row 1: tên + actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <i className="bi bi-building-fill" style={{ fontSize: 13, color: "var(--primary)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, fontSize: 14, color: "var(--foreground)" }}>{w.name}</span>
                        {w.code && <span style={{ fontSize: 10.5, fontFamily: "monospace", color: "var(--muted-foreground)", background: "var(--muted)", padding: "1px 6px", borderRadius: 5 }}>{w.code}</span>}
                        {!w.isActive && <span style={{ fontSize: 10, color: "#f43f5e", background: "rgba(244,63,94,0.1)", borderRadius: 5, padding: "1px 6px", fontWeight: 700 }}>Đóng</span>}
                      </div>
                      {w.address && <p style={{ margin: "3px 0 0 20px", fontSize: 11.5, color: "var(--muted-foreground)" }}>{w.address}</p>}
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openEdit(w)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
                        <i className="bi bi-pencil" style={{ fontSize: 11 }} />
                      </button>
                      <button onClick={() => toggleActive(w)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: w.isActive ? "#f59e0b" : "#10b981" }}>
                        <i className={`bi ${w.isActive ? "bi-pause-fill" : "bi-play-fill"}`} style={{ fontSize: 11 }} />
                      </button>
                      <button onClick={() => setConfirmDelete(w)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#f43f5e" }}>
                        <i className="bi bi-trash" style={{ fontSize: 11 }} />
                      </button>
                    </div>

                  </div>
                  {/* Row 2: stats */}
                  <div style={{ display: "flex", gap: 12, marginLeft: 20 }}>
                    <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                      <i className="bi bi-boxes" style={{ marginRight: 4 }} />
                      {w.soMatHang ?? 0} mặt hàng
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                      <i className="bi bi-stack" style={{ marginRight: 4 }} />
                      Tổng: {(w.tongSoLuong ?? 0).toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button
            onClick={openAdd}
            style={{
              width: "100%", padding: "10px", border: "none",
              background: "var(--primary)", color: "#fff",
              fontSize: 13, fontWeight: 700, borderRadius: 10, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            <i className="bi bi-plus-lg" style={{ fontSize: 13 }} />
            Thêm kho mới
          </button>
        </div>
      </div>

      {/* Confirm xoá kho */}
      <ConfirmDialog
        open={!!confirmDelete}
        variant="danger"
        title={`Xoá kho "${confirmDelete?.name}"?`}
        message={`Thao tác này sẽ xoá toàn bộ dữ liệu tồn kho tại "${confirmDelete?.name ?? ""}". Lịch sử biến động vẫn được giữ lại. Không thể hoàn tác.`}
        confirmLabel="Xoá kho"
        loading={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}


// ── Inventory Detail Offcanvas ────────────────────────────────────────────────
interface StockByWarehouse {
  id:           string;
  soLuong:      number;
  soLuongMin:   number;
  viTriHang?:   string | null;
  viTriCot?:    string | null;
  viTriTang?:   string | null;
  warehouse: { id: string; code: string | null; name: string; isActive: boolean };
}

function InventoryDetailOffcanvas({ open, item, onClose, onDeleted, onUpdated }: {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: (updated: InventoryItem) => void;
}) {
  const toast = useToast();
  const [stocks, setStocks]         = React.useState<StockByWarehouse[]>([]);
  const [stocksLoading, setLoading] = React.useState(false);
  const [deleting, setDeleting]     = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);

  // ── Nhập hàng (phân vào kho) ────────────────────────────────────────────────────────────────
  const [nhapHangMode, setNhapHangMode]   = React.useState(false);
  const [nhapHangWh, setNhapHangWh]       = React.useState("");
  const [nhapHangSL, setNhapHangSL]       = React.useState(1);
  const [nhapHangSaving, setNhapHangSaving] = React.useState(""); // "" | "saving" | "ok"
  const [warehouseList, setWarehouseList] = React.useState<{id:string;name:string;code:string|null}[]>([]);

  // ── Edit mode ────────────────────────────────────────────────────────────────
  const [editMode, setEditMode]       = React.useState(false);
  const [editSaving, setEditSaving]   = React.useState(false);
  const [editErrors, setEditErrors]   = React.useState<Record<string,string>>({});
  const [editCategories, setEditCategories] = React.useState<{id:string;name:string;code?:string|null}[]>([]);
  const [editForm, setEditForm] = React.useState({
    tenHang: "", code: "", categoryId: "", donVi: "",
    soLuong: 0, soLuongMin: 0, giaNhap: 0, giaBan: 0,
    nhaCungCap: "", thongSoKyThuat: "", ghiChu: "",
  });

  // Populate edit form khi mở edit mode
  const openEditMode = React.useCallback(() => {
    if (!item) return;
    setEditForm({
      tenHang:        item.tenHang         ?? "",
      code:           item.code            ?? "",
      categoryId:     "",
      donVi:          item.donVi           ?? "",
      soLuong:        item.soLuong         ?? 0,
      soLuongMin:     item.soLuongMin      ?? 0,
      giaNhap:        item.giaNhap         ?? 0,
      giaBan:         item.giaBan          ?? 0,
      nhaCungCap:     item.nhaCungCap      ?? "",
      thongSoKyThuat: item.thongSoKyThuat  ?? "",
      ghiChu:         item.ghiChu          ?? "",
    });
    setEditErrors({});
    setEditMode(true);
    // Fetch categories
    fetch("/api/plan-finance/inventory/categories")
      .then(r => r.json())
      .then((d: {id:string;name:string;code?:string|null}[]) => {
        setEditCategories(Array.isArray(d) ? d : []);
        // Pre-select category nếu item có
        if (item.category) {
          const found = (Array.isArray(d) ? d : []).find((c: {id:string;name:string}) => c.name === item.category?.name);
          if (found) setEditForm(f => ({ ...f, categoryId: found.id }));
        }
      })
      .catch(() => {});
  }, [item]);

  const cancelEdit = () => { setEditMode(false); setEditErrors({}); };

  const handleSaveEdit = async () => {
    if (!item) return;
    const errs: Record<string,string> = {};
    if (!editForm.tenHang.trim()) errs.tenHang = "Bắt buộc";
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setEditSaving(true); setEditErrors({});
    try {
      const res = await fetch(`/api/plan-finance/inventory/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code:           editForm.code           || undefined,
          tenHang:        editForm.tenHang.trim(),
          categoryId:     editForm.categoryId     || undefined,
          donVi:          editForm.donVi          || undefined,
          soLuong:        Number(editForm.soLuong),
          soLuongMin:     Number(editForm.soLuongMin),
          giaNhap:        Number(editForm.giaNhap),
          giaBan:         Number(editForm.giaBan),
          nhaCungCap:     editForm.nhaCungCap     || undefined,
          thongSoKyThuat: editForm.thongSoKyThuat || undefined,
          ghiChu:         editForm.ghiChu         || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setEditErrors({ _: data.error ?? "Lỗi không xác định" }); return; }
      toast.success("Cập nhật thành công", `Hàng hoá "${data.tenHang}" đã được lưu.`);
      setEditMode(false);
      onUpdated(data as InventoryItem);
    } catch {
      setEditErrors({ _: "Lỗi kết nối" });
    } finally {
      setEditSaving(false);
    }
  };

  // Fetch InventoryStock khi mở offcanvas với item mới
  React.useEffect(() => {
    if (!open || !item) { setStocks([]); setEditMode(false); setNhapHangMode(false); return; }
    setEditMode(false);
    setNhapHangMode(false);
    setNhapHangSL(1);
    setNhapHangSaving("");
    setLoading(true);
    fetch(`/api/plan-finance/inventory/${item.id}/stocks`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setStocks(Array.isArray(d) ? d : []))
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
    // Fetch kho
    fetch("/api/plan-finance/warehouses")
      .then(r => r.json())
      .then((d: {id:string;name:string;code:string|null;isActive:boolean}[]) => {
        const active = Array.isArray(d) ? d.filter(w => w.isActive) : [];
        setWarehouseList(active);
        if (active.length === 1) setNhapHangWh(active[0].id);
        else setNhapHangWh("");
      })
      .catch(() => {});
  }, [open, item?.id]);

  const handleNhapHang = async () => {
    if (!item || !nhapHangWh || nhapHangSL <= 0) return;
    setNhapHangSaving("saving");
    try {
      const res = await fetch("/api/plan-finance/stock-movements/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toWarehouseId: nhapHangWh,
          lyDo: `Phân kho từ màn hình hàng hoá`,
          lines: [{ inventoryItemId: item.id, soLuong: nhapHangSL }],
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi"); }
      toast.success("Phân kho thành công", `Đã nhập ${nhapHangSL} ${item.donVi ?? ""} vào kho.`);
      setNhapHangSaving("ok");
      setNhapHangMode(false);
      // Refresh stocks
      setLoading(true);
      fetch(`/api/plan-finance/inventory/${item.id}/stocks`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setStocks(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch (e) {
      toast.error("Không thể nhập", e instanceof Error ? e.message : "Lỗi không xác định");
      setNhapHangSaving("");
    }
  };

  // Close on Escape
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    "con-hang": { label: "Còn hàng",  color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: "bi-check-circle-fill" },
    "sap-het":  { label: "Sắp hết",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "bi-exclamation-triangle-fill" },
    "het-hang": { label: "Đã hết",   color: "#f43f5e", bg: "rgba(244,63,94,0.12)",   icon: "bi-x-circle-fill" },
  };
  const sc = item ? (STATUS_CFG[item.trangThai] ?? STATUS_CFG["con-hang"]) : STATUS_CFG["con-hang"];

  const fmt    = (n?: number) => (n ?? 0).toLocaleString("vi-VN");
  const fmtVnd = (n?: number) => {
    if (!n) return "0 đ";
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(".", ",") + " tỷ đ";
    if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2).replace(".", ",") + " triệu đ";
    return n.toLocaleString("vi-VN") + " đ";
  };

  const Section = ({ title, icon }: { title: string; icon: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "18px 0 10px", paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
      <i className={`bi ${icon}`} style={{ fontSize: 12, color: "var(--primary)" }} />
      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</span>
    </div>
  );

  const Row = ({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", gap: 12 }}>
      <span style={{ fontSize: 12.5, color: "var(--muted-foreground)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: bold ? 700 : 500, color: "var(--foreground)", textAlign: "right" }}>{value ?? "—"}</span>
    </div>
  );

  // Tổng tồn: ưu tiên tổng từ InventoryStock thực tế.
  // Nếu chưa phân bổ vào kho nào (stocks rỗng), fallback về item.soLuong (trường LEGACY khi tạo).
  const stocksTotal = stocks.reduce((s, st) => s + st.soLuong, 0);
  const tongTon = stocksLoading
    ? (item?.soLuong ?? 0)
    : stocks.length > 0
      ? stocksTotal
      : (item?.soLuong ?? 0);

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/plan-finance/inventory/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Không thể xóa", data.error ?? "Lỗi không xác định");
        setConfirmDel(false);
        return;
      }
      toast.success("Xóa thành công", `Hàng hoá "${item.tenHang}" đã bị xóa.`);
      setConfirmDel(false);
      onClose();
      onDeleted();
    } catch {
      toast.error("Lỗi kết nối", "Không thể kết nối đến server.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 4000,
          background: open ? "rgba(0,0,0,0.35)" : "transparent",
          pointerEvents: open ? "auto" : "none",
          transition: "background 0.25s",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, minWidth: 400, maxWidth: 400,
        background: "var(--card)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        zIndex: 4001,
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        {!item ? null : (
          <>
            {/* Header */}
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className="bi bi-box-seam" style={{ fontSize: 20, color: "var(--primary)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)", lineHeight: 1.3 }}>{item.tenHang}</p>
                  {item.code && (
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{item.code}</p>
                  )}
                </div>
                <button onClick={onClose} style={{
                  flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--muted-foreground)",
                }}>
                  <i className="bi bi-x" style={{ fontSize: 16 }} />
                </button>
              </div>
              {/* Status + Category badges */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
                  background: sc.bg, color: sc.color,
                }}>
                  <i className={`bi ${sc.icon}`} style={{ fontSize: 10 }} />
                  {sc.label}
                </span>
                {item.category?.name && (
                  <span style={{
                    padding: "3px 10px", borderRadius: 9999, fontSize: 11.5, fontWeight: 600,
                    background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: "var(--primary)",
                  }}>
                    {item.category.name}
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 20px" }}>

              {/* ── EDIT FORM ── */}
              {editMode && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 12 }}>
                  {editErrors._ && (
                    <div style={{ padding: "8px 12px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8, fontSize: 13, color: "#f43f5e" }}>
                      {editErrors._}
                    </div>
                  )}

                  {/* Tên sản phẩm */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tên hàng hoá *</label>
                    <input
                      value={editForm.tenHang}
                      onChange={e => setEditForm(f => ({ ...f, tenHang: e.target.value }))}
                      style={{
                        width: "100%", padding: "8px 10px", border: `1px solid ${editErrors.tenHang ? "#f43f5e" : "var(--border)"}`,
                        background: "var(--background)", color: "var(--foreground)",
                        fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit",
                      }}
                    />
                    {editErrors.tenHang && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{editErrors.tenHang}</p>}
                  </div>

                  {/* Mã SKU + Danh mục */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mã SKU</label>
                      <input
                        value={editForm.code}
                        onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
                        placeholder="VD: HH-260101-..."
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Danh mục</label>
                      <select
                        value={editForm.categoryId}
                        onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit", appearance: "none" }}
                      >
                        <option value="">Chọn danh mục</option>
                        {editCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* ĐVT + Nhà cung cấp */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Đơn vị tính</label>
                      <select
                        value={editForm.donVi}
                        onChange={e => setEditForm(f => ({ ...f, donVi: e.target.value }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit", appearance: "none" }}
                      >
                        <option value="">Chọn</option>
                        {DVT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Nhà cung cấp</label>
                      <input
                        value={editForm.nhaCungCap}
                        onChange={e => setEditForm(f => ({ ...f, nhaCungCap: e.target.value }))}
                        placeholder="Tên nhà cung cấp"
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit" }}
                      />
                    </div>
                  </div>

                  {/* Số lượng + Tồn tối thiểu */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tồn đầu kỳ</label>
                      <input
                        type="number" min={0}
                        value={editForm.soLuong}
                        onChange={e => setEditForm(f => ({ ...f, soLuong: Number(e.target.value) }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tồn tối thiểu</label>
                      <input
                        type="number" min={0}
                        value={editForm.soLuongMin}
                        onChange={e => setEditForm(f => ({ ...f, soLuongMin: Number(e.target.value) }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit" }}
                      />
                    </div>
                  </div>

                  {/* Giá nhập + Giá bán */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Giá nhập (₫)</label>
                      <CurrencyInput
                        value={Number(editForm.giaNhap)}
                        onChange={v => setEditForm(f => ({ ...f, giaNhap: v }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Giá bán (₫)</label>
                      <CurrencyInput
                        value={Number(editForm.giaBan)}
                        onChange={v => setEditForm(f => ({ ...f, giaBan: v }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit" }}
                      />
                    </div>
                  </div>

                  {/* Thông số kỹ thuật */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Thông số kỹ thuật</label>
                    <textarea
                      rows={3}
                      value={editForm.thongSoKyThuat}
                      onChange={e => setEditForm(f => ({ ...f, thongSoKyThuat: e.target.value }))}
                      placeholder="Nhập thông số kỹ thuật..."
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit", resize: "vertical" }}
                    />
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ghi chú</label>
                    <textarea
                      rows={2}
                      value={editForm.ghiChu}
                      onChange={e => setEditForm(f => ({ ...f, ghiChu: e.target.value }))}
                      placeholder="Ghi chú thêm..."
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit", resize: "vertical" }}
                    />
                  </div>
                </div>
              )}

              {/* ── VIEW MODE (read-only detail) ── */}
              {!editMode && (
              <>

              <Section title="Thông tin chung" icon="bi-info-circle" />
              <Row label="Đơn vị tính" value={item.donVi} />
              {item.loai && <Row label="Loại hàng" value={item.loai} />}
              {item.nhaCungCap && <Row label="Nhà cung cấp" value={item.nhaCungCap} />}

              <Section title="Tồn kho theo từng kho" icon="bi-bar-chart" />

              {/* Tổng tồn */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: sc.bg }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>Tổng tồn toàn hệ thống</span>
                  {!stocksLoading && stocks.length === 0 && item.soLuong > 0 && (
                    <div style={{ fontSize: 10.5, color: sc.color, opacity: 0.7, marginTop: 2 }}>(tồn đầu kỳ — chưa phân bổ vào kho)</div>
                  )}
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: sc.color }}>
                  {stocksLoading
                    ? <i className="bi bi-arrow-repeat" style={{ fontSize: 14, animation: "spin 1s linear infinite" }} />
                    : <>{fmt(tongTon)} <span style={{ fontSize: 12 }}>{item.donVi ?? ""}</span></>
                  }
                </span>
              </div>

              {stocksLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[1,2].map(i => <div key={i} style={{ height: 52, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />)}
                </div>
              ) : stocks.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, background: "var(--muted)", borderRadius: 10 }}>
                  <i className="bi bi-building-slash" style={{ fontSize: 22, display: "block", marginBottom: 6, opacity: 0.4 }} />
                  Chưa phân bổ vào kho nào
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stocks.map(st => {
                    const pct = tongTon > 0 ? (st.soLuong / tongTon) * 100 : 0;
                    const isLow = st.soLuongMin > 0 && st.soLuong <= st.soLuongMin;
                    const isEmpty = st.soLuong === 0;
                    const barColor = isEmpty ? "#f43f5e" : isLow ? "#f59e0b" : "var(--primary)";
                    const viTri = [st.viTriHang && `H${st.viTriHang}`, st.viTriCot && `C${st.viTriCot}`, st.viTriTang && `T${st.viTriTang}`].filter(Boolean).join("-");
                    return (
                      <div key={st.id} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="bi bi-building" style={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)" }}>{st.warehouse.name}</span>
                            {st.warehouse.code && <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>({st.warehouse.code})</span>}
                            {!st.warehouse.isActive && <span style={{ fontSize: 10, color: "#f43f5e", background: "rgba(244,63,94,0.1)", borderRadius: 4, padding: "1px 5px" }}>Đóng</span>}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 800, color: barColor }}>
                            {fmt(st.soLuong)} <span style={{ fontSize: 11, fontWeight: 500 }}>{item.donVi ?? ""}</span>
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 5, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          {viTri ? <span style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>📍 {viTri}</span> : <span />}
                          <span style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>{pct.toFixed(0)}% tổng tồn</span>
                        </div>
                        {isLow && (
                          <div style={{ marginTop: 5, fontSize: 10.5, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 10 }} />
                            Sắp hết — tối thiểu: {fmt(st.soLuongMin)} {item.donVi ?? ""}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Giá nhập / Giá bán */}
              <Section title="Giá" icon="bi-tag" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[{
                  label: "Giá nhập", value: fmtVnd(item.giaNhap),
                  color: "#f59e0b", bg: "rgba(245,158,11,0.08)",
                }, {
                  label: "Giá bán", value: fmtVnd(item.giaBan),
                  color: "#10b981", bg: "rgba(16,185,129,0.08)",
                }].map(card => (
                  <div key={card.label} style={{
                    padding: "10px 12px", borderRadius: 10,
                    background: card.bg, border: `1px solid ${card.color}22`,
                  }}>
                    <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: card.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800, color: card.color }}>{card.value}</p>
                  </div>
                ))}
              </div>
              {(item.giaNhap ?? 0) > 0 && (item.giaBan ?? 0) > 0 && (
                <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 8, background: "var(--muted)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Biên lợi nhuận</span>
                  <span style={{ fontWeight: 700, color: "var(--foreground)" }}>
                    {(((item.giaBan ?? 0) - (item.giaNhap ?? 0)) / (item.giaBan ?? 1) * 100).toFixed(1)}%
                  </span>
                </div>
              )}

              {item.viTri && (
                <>
                  <Section title="Vị trí trong kho" icon="bi-geo-alt" />
                  <div style={{ padding: "9px 12px", background: "var(--muted)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 7 }}>
                    <i className="bi bi-geo-alt-fill" style={{ color: "var(--primary)", fontSize: 13 }} />
                    {item.viTri}
                  </div>
                </>
              )}

              {item.thongSoKyThuat && (
                <>
                  <Section title="Thông số kỹ thuật" icon="bi-cpu" />
                  <div style={{
                    padding: "10px 12px", background: "var(--muted)", borderRadius: 8,
                    fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.7,
                    whiteSpace: "pre-wrap", fontFamily: "monospace",
                  }}>
                    {item.thongSoKyThuat}
                  </div>
                </>
              )}

              {item.ghiChu && (
                <>
                  <Section title="Ghi chú" icon="bi-chat-text" />
                  <div style={{ padding: "10px 12px", background: "var(--muted)", borderRadius: 8, fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {item.ghiChu}
                  </div>
                </>
              )}

              {/* Meta info */}
              {item.createdAt && (
                <>
                  <Section title="Thông tin hệ thống" icon="bi-clock-history" />
                  <Row label="Ngày tạo" value={new Date(item.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                  {item.updatedAt && item.updatedAt !== item.createdAt && (
                    <Row label="Cập nhật" value={new Date(item.updatedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                  )}
                </>
              )}
              </>
              )}

              {/* ── NHẬP HÀNG (chọn kho inline) ── */}
              {nhapHangMode && (
                <div style={{
                  marginTop: 16,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1.5px solid #10b98133",
                  background: "rgba(16,185,129,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                    <i className="bi bi-box-arrow-in-down" style={{ fontSize: 13, color: "#10b981" }} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#10b981" }}>Phân hàng vào kho</span>
                  </div>

                  {/* Chọn kho */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Kho nhập *</label>
                    <select
                      value={nhapHangWh}
                      onChange={e => setNhapHangWh(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${nhapHangWh ? "rgba(16,185,129,0.5)" : "var(--border)"}`, background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit", appearance: "none" }}
                    >
                      <option value="">-- Chọn kho --</option>
                      {warehouseList.map(w => (
                        <option key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ""}</option>
                      ))}
                    </select>
                  </div>

                  {/* Số lượng */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Số lượng nhập {item?.donVi ? `(${item.donVi})` : ""}</label>
                    <input
                      type="number"
                      min={1}
                      value={nhapHangSL}
                      onChange={e => setNhapHangSL(Math.max(1, Number(e.target.value)))}
                      style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit" }}
                    />
                  </div>
                </div>
              )}


            </div>{/* end body */}

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>

              {editMode ? (
                <>
                  {/* Huỷ edit */}
                  <button
                    onClick={cancelEdit}
                    style={{
                      flex: 1, padding: "9px 0", border: "1.5px solid var(--border)",
                      background: "transparent", color: "var(--foreground)",
                      fontSize: 13, fontWeight: 600, borderRadius: 9, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
                    Huỷ
                  </button>
                  {/* Lưu */}
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    style={{
                      flex: 2, padding: "9px 0", border: "none",
                      background: editSaving ? "var(--muted)" : "var(--primary)",
                      color: editSaving ? "var(--muted-foreground)" : "#fff",
                      fontSize: 13, fontWeight: 700, borderRadius: 9,
                      cursor: editSaving ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "background 0.15s",
                    }}
                  >
                    {editSaving
                      ? <i className="bi bi-arrow-repeat" style={{ fontSize: 13, animation: "spin 1s linear infinite" }} />
                      : <i className="bi bi-check-lg" style={{ fontSize: 13 }} />}
                    {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </>
              ) : (
                <>
                  {/* Xóa */}
                  <button
                    onClick={() => setConfirmDel(true)}
                    style={{
                      width: 38, height: 38, border: "1.5px solid #f43f5e22", background: "rgba(244,63,94,0.06)",
                      borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#f43f5e", flexShrink: 0, transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,0.14)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(244,63,94,0.06)"}
                    title="Xóa hàng hoá"
                  >
                    <i className="bi bi-trash" style={{ fontSize: 14 }} />
                  </button>
                  {/* Nhập hàng / Xác nhận nhập */}
                  {nhapHangMode ? (
                    <>
                      <button
                        onClick={() => { setNhapHangMode(false); }}
                        style={{
                          flex: 1, padding: "9px 0",
                          border: "1.5px solid var(--border)",
                          background: "transparent", color: "var(--muted-foreground)",
                          fontSize: 13, fontWeight: 600, borderRadius: 9, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <i className="bi bi-x" style={{ fontSize: 14 }} />
                        Huỷ
                      </button>
                      <button
                        onClick={handleNhapHang}
                        disabled={!nhapHangWh || nhapHangSL <= 0 || nhapHangSaving === "saving"}
                        style={{
                          flex: 2, padding: "9px 0", border: "none",
                          background: !nhapHangWh || nhapHangSaving === "saving" ? "var(--muted)" : "#10b981",
                          color: !nhapHangWh || nhapHangSaving === "saving" ? "var(--muted-foreground)" : "#fff",
                          fontSize: 13, fontWeight: 700, borderRadius: 9,
                          cursor: !nhapHangWh || nhapHangSaving === "saving" ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          transition: "background 0.15s",
                        }}
                      >
                        {nhapHangSaving === "saving"
                          ? <i className="bi bi-arrow-repeat" style={{ fontSize: 13, animation: "spin 1s linear infinite" }} />
                          : <i className="bi bi-check2-all" style={{ fontSize: 13 }} />}
                        {nhapHangSaving === "saving" ? "Đang nhập..." : "Xác nhận nhập kho"}
                      </button>
                    </>
                  ) : (
                  <button
                    onClick={() => { setNhapHangMode(true); }}
                    style={{
                      flex: 1, padding: "9px 0",
                      border: "1.5px solid var(--border)",
                      background: "transparent", color: "var(--foreground)",
                      fontSize: 13, fontWeight: 600, borderRadius: 9, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "all 0.15s",
                    }}
                  >
                    <i className="bi bi-box-arrow-in-down" style={{ fontSize: 13 }} />
                    Nhập hàng
                  </button>
                  )}
                  {/* Chỉnh sửa */}
                  <button
                    onClick={openEditMode}
                    style={{
                      flex: 1, padding: "9px 0", border: "none",
                      background: "var(--primary)", color: "#fff",
                      fontSize: 13, fontWeight: 700, borderRadius: 9, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <i className="bi bi-pencil" style={{ fontSize: 12 }} />
                    Chỉnh sửa
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirm xóa hàng hoá */}
      <ConfirmDialog
        open={confirmDel}
        variant="danger"
        title={`Xóa "${item?.tenHang}"?`}
        message={`Hàng hoá này sẽ bị xóa vĩnh viễn cùng toàn bộ dữ liệu tồn kho liên quan. Không thể hoàn tác.`}
        confirmLabel="Xóa hàng hoá"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  );
}

// ── KPI Grid (2×2) ────────────────────────────────────────────────────────────
function InventoryKpis({ stats, loading }: { stats: InventoryStats | null; loading: boolean }) {
  const fmt    = (n: number) => n.toLocaleString("vi-VN");
  const fmtVnd = (n: number) => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(".", ",") + " tỷ ₫";
    if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace(".", ",") + " triệu ₫";
    return fmt(n) + " ₫";
  };

  if (loading) return (
    <div className="row g-2">
      {[0,1,2,3].map(i => (
        <div key={i} className="col-6">
          <div className="app-card p-3" style={{ height: 72, background: "var(--muted)", animation: "pulse 1.5s infinite", borderRadius: 12 }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="row g-2">
      <KPICard label="Tổng số mặt hàng" value={fmt(stats?.tongMatHang ?? 0)} icon="bi-boxes"               accent="#6366f1" colClass="col-6" />
      <KPICard label="Tổng giá trị kho"  value={fmtVnd(stats?.tongGiaTri ?? 0)} icon="bi-cash-stack"       accent="#10b981" colClass="col-6" />
      <KPICard label="Sắp hết hàng"      value={fmt(stats?.sapHet ?? 0)}     icon="bi-exclamation-triangle" accent="#f59e0b" colClass="col-6" />
      <KPICard label="Đã hết hàng"       value={fmt(stats?.hetHang ?? 0)}    icon="bi-x-circle"             accent="#f43f5e" colClass="col-6" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const toast = useToast();
  const [stats, setStats]               = React.useState<InventoryStats | null>(null);
  const [loading, setLoading]           = React.useState(true);
  const [chartMode, setChartMode]       = React.useState<"quantity" | "value">("quantity");
  const [filterCategory, setFilterCategory] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("");
  const [search, setSearch]             = React.useState("");
  const [categories, setCategories]     = React.useState<{id:string;name:string}[]>([]);
  const [items, setItems]               = React.useState<InventoryItem[]>([]);
  const [itemsLoading, setItemsLoading] = React.useState(true);
  const [page, setPage]                 = React.useState(1);
  const [totalPages, setTotalPages]     = React.useState(1);
  const [addOpen, setAddOpen]             = React.useState(false);
  const [refreshKey, setRefreshKey]       = React.useState(0);
  const [selectedItem, setSelectedItem]   = React.useState<InventoryItem | null>(null);
  const [detailOpen, setDetailOpen]       = React.useState(false);
  const [warehouseOpen, setWarehouseOpen] = React.useState(false);
  const [hasWarehouses, setHasWarehouses]         = React.useState<boolean | null>(null);
  const [activeWarehouseCount, setActiveWarehouseCount] = React.useState(0);
  const [nhapKhoOpen, setNhapKhoOpen]                 = React.useState(false);
  const [xuatKhoOpen, setXuatKhoOpen]                 = React.useState(false);
  const [luanChuyenOpen, setLuanChuyenOpen]           = React.useState(false);
  const [kiemKhoOpen, setKiemKhoOpen]                 = React.useState(false);

  // ── Excel import/export ────────────────────────────────────────────────────
  const importFileRef = React.useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading]   = React.useState(false);
  const [importResult, setImportResult]     = React.useState<{
    message: string; created: number; skipped: number; errors?: string[];
  } | null>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/plan-finance/inventory/import-excel", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Import thất bại", data.error ?? "Lỗi không xác định");
        return;
      }
      setImportResult(data);
      setRefreshKey(k => k + 1);
      fetch("/api/plan-finance/inventory/stats").then(r => r.json()).then(setStats).catch(() => {});
    } catch {
      toast.error("Lỗi kết nối", "Không thể tải file lên server.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch("/api/plan-finance/inventory/export-excel");
      if (!res.ok) { toast.error("Xuất thất bại", "Không thể xuất dữ liệu"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `hang-hoa-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Xuất thành công", "Dữ liệu hàng hoá đã được xuất ra file Excel.");
    } catch {
      toast.error("Lỗi kết nối", "Không thể tải file xuất.");
    }
  };

  const checkWarehouses = React.useCallback(() => {
    fetch("/api/plan-finance/warehouses")
      .then(r => r.json())
      .then((d: { isActive?: boolean }[]) => {
        if (!Array.isArray(d)) { setHasWarehouses(false); setActiveWarehouseCount(0); return; }
        const active = d.filter(w => w.isActive !== false).length;
        setHasWarehouses(d.length > 0);
        setActiveWarehouseCount(active);
      })
      .catch(() => { setHasWarehouses(false); setActiveWarehouseCount(0); });
  }, []);

  // Kiểm tra kho khi lần đầu + fetch danh mục
  React.useEffect(() => {
    checkWarehouses();
    fetch("/api/plan-finance/inventory/categories")
      .then(r => r.json())
      .then((d: {id:string;name:string}[]) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [checkWarehouses]);

  const openDetail = (it: InventoryItem) => { setSelectedItem(it); setDetailOpen(true); };
  const closeDetail = React.useCallback(() => setDetailOpen(false), []);

  // Đóng warehouse offcanvas → refresh kiểm tra
  const closeWarehouse = React.useCallback(() => {
    setWarehouseOpen(false);
    checkWarehouses();
  }, [checkWarehouses]);

  // Fetch stats (chỉ 1 lần)
  React.useEffect(() => {
    fetch("/api/plan-finance/inventory/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch items khi filter hoặc page thay đổi
  React.useEffect(() => {
    setItemsLoading(true);
    const params = new URLSearchParams();
    if (filterCategory) params.set("categoryId", filterCategory);
    if (filterStatus)   params.set("trangThai", filterStatus);
    if (search)         params.set("search", search);
    params.set("page", String(page));
    fetch(`/api/plan-finance/inventory?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotalPages(d.totalPages ?? 1); })
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));
  }, [filterCategory, filterStatus, search, page, refreshKey]);

  // Reset về trang 1 khi filter thay đổi
  React.useEffect(() => { setPage(1); }, [filterCategory, filterStatus, search]);

  const chartData = chartMode === "quantity"
    ? (stats?.categoryStats ?? [])
    : (stats?.categoryValueStats ?? []);

  return (
    <>
    <SplitLayoutPage
      title="Hàng hoá trong kho"
      description="Quản lý tồn kho, nhập xuất hàng hoá và kiểm kê kho"
      icon="bi-boxes"
      color="indigo"
      leftTopContent={<InventoryKpis stats={stats} loading={loading} />}
      leftContent={
        <div>
          <SectionTitle title="Cơ cấu hàng hoá trong kho" />
          {loading ? (
            <div style={{ height: 300, borderRadius: 10, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />
          ) : (
            <>
              <BarChartHorizontal
                data={chartData}
                color="#6366f1"
              />

              {/* Radio buttons */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 20, marginTop: 8,
              }}>
                {([
                  { val: "quantity", label: "Số lượng" },
                  { val: "value",    label: "Giá trị"  },
                ] as { val: "quantity" | "value"; label: string }[]).map(opt => (
                  <label
                    key={opt.val}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      cursor: "pointer", fontSize: 13, fontWeight: 600,
                      color: chartMode === opt.val ? "var(--primary)" : "var(--muted-foreground)",
                      transition: "color 0.15s",
                    }}
                  >
                    <input
                      type="radio"
                      name="chartMode"
                      value={opt.val}
                      checked={chartMode === opt.val}
                      onChange={() => setChartMode(opt.val)}
                      style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      }
      rightContent={
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
          {/* hidden file input */}
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleImportExcel}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionTitle title="Danh sách hàng hoá" />
            <div style={{ display: "flex", gap: 6 }}>
              {/* Tải tệp mẫu */}
              <a
                href="/inventory_template.xlsx"
                download
                title="Tải tệp mẫu Excel"
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)",
                  background: "var(--muted)", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "var(--muted-foreground)",
                  textDecoration: "none", flexShrink: 0,
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#10b981"; (e.currentTarget as HTMLElement).style.color = "#10b981"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
              >
                <i className="bi bi-file-earmark-arrow-down" style={{ fontSize: 14 }} />
              </a>
              {/* Import Excel */}
              <button
                onClick={() => importFileRef.current?.click()}
                disabled={importLoading}
                title="Nhập dữ liệu từ Excel"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: "1.5px solid var(--border)", background: "var(--muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: importLoading ? "var(--muted-foreground)" : "var(--muted-foreground)",
                  cursor: importLoading ? "not-allowed" : "pointer",
                  flexShrink: 0, transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { if (!importLoading) { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
              >
                {importLoading
                  ? <i className="bi bi-arrow-repeat" style={{ fontSize: 14, animation: "spin 1s linear infinite" }} />
                  : <i className="bi bi-file-earmark-arrow-up" style={{ fontSize: 14 }} />}
              </button>
              {/* Export Excel */}
              <button
                onClick={handleExportExcel}
                title="Xuất dữ liệu ra Excel"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: "1.5px solid var(--border)", background: "var(--muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--muted-foreground)", cursor: "pointer",
                  flexShrink: 0, transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.color = "#f59e0b"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
              >
                <i className="bi bi-file-earmark-spreadsheet" style={{ fontSize: 14 }} />
              </button>
            </div>
          </div>

          {/* Dòng filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FilterSelect
              options={categories.map(c => ({ label: c.name, value: c.id }))}
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="Danh mục"
            />
            <FilterSelect
              options={[
                { label: "Còn hàng",  value: "con-hang"  },
                { label: "Sắp hết",  value: "sap-het"  },
                { label: "Đã hết",   value: "het-hang" },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Trạng thái"
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm hàng hoá..."
            />
          </div>

          {/* Banner cảnh báo chưa có kho */}
          {hasWarehouses === false && (
            <div style={{
              marginBottom: 10, padding: "10px 14px",
              borderRadius: 10, border: "1.5px solid #f59e0b",
              background: "rgba(245,158,11,0.08)",
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 13,
            }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span style={{ color: "var(--foreground)" }}>
                Chưa có kho nào được cấu hình. Hãy —{" "}
                <button
                  onClick={() => setWarehouseOpen(true)}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
                >
                  tạo kho đầu tiên
                </button>
                {" "}— trước khi thêm hàng hoá.
              </span>
            </div>
          )}

          {/* Dòng action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {([
              { icon: "bi-plus-lg",          label: "Thêm mới",    color: "var(--primary)", bg: "var(--primary)",  textColor: "#fff",              onClick: () => setAddOpen(true),           locked: !hasWarehouses },
              { icon: "bi-box-arrow-in-down", label: "Nhập",        color: "#10b981",        bg: "transparent",   textColor: "#10b981",           onClick: () => setNhapKhoOpen(true),              locked: !hasWarehouses },
              { icon: "bi-box-arrow-up",      label: "Xuất",        color: "#f59e0b",        bg: "transparent",   textColor: "#f59e0b",           onClick: () => setXuatKhoOpen(true),       locked: !hasWarehouses },
              { icon: "bi-arrow-left-right",  label: "Chuyển",      color: "#6366f1",        bg: "transparent",   textColor: "#6366f1",           onClick: () => setLuanChuyenOpen(true),    locked: activeWarehouseCount < 2 },
              { icon: "bi-clipboard-check",   label: "Kiểm kho",    color: "#0ea5e9",        bg: "transparent",   textColor: "#0ea5e9",           onClick: () => setKiemKhoOpen(true),         locked: !hasWarehouses },
              { icon: "bi-building",           label: "Quản lý kho", color: "var(--border)",  bg: "transparent",   textColor: "var(--foreground)", onClick: () => setWarehouseOpen(true),     locked: false },
            ] as { icon: string; label: string; color: string; bg: string; textColor: string; onClick: () => void; locked: boolean }[]).map(btn => (
              <button
                key={btn.label}
                onClick={btn.locked ? undefined : btn.onClick}
                disabled={btn.locked && btn.label !== "Quản lý kho"}
                title={btn.locked ? "Cần có ít nhất 1 kho trước khi thực hiện thao tác này" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${btn.locked ? "var(--border)" : btn.color}`,
                  background: btn.locked ? "var(--muted)" : btn.bg,
                  color: btn.locked ? "var(--muted-foreground)" : btn.textColor,
                  borderRadius: 8,
                  cursor: btn.locked ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s",
                  whiteSpace: "nowrap",
                  opacity: btn.locked ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!btn.locked) e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={e => { if (!btn.locked) e.currentTarget.style.opacity = "1"; }}
              >
                <i className={`bi ${btn.icon}`} style={{ fontSize: 13 }} />
                {btn.label}
              </button>
            ))}
          </div>

          {/* Bảng danh sách */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ background: "var(--muted)" }}>
                    <th style={{ padding: "9px 12px", textAlign: "left",   fontWeight: 700, fontSize: 11.5, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>Tên hàng hoá</th>
                    <th style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700, fontSize: 11.5, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", width: 80 }}>Đơn vị</th>
                    <th style={{ padding: "9px 12px", textAlign: "right",  fontWeight: 700, fontSize: 11.5, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", width: 100 }}>Tồn kho</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    // Skeleton rows
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        {["60%", "40px", "60px"].map((w, j) => (
                          <td key={j} style={{ padding: "10px 12px" }}>
                            <div style={{ height: 14, width: w, borderRadius: 6, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: "48px 0", textAlign: "center", color: "var(--muted-foreground)" }}>
                        <i className="bi bi-inbox" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.3 }} />
                        Không có hàng hoá nào
                      </td>
                    </tr>
                  ) : (
                    items.map(it => {
                      const statusColor: Record<string, string> = {
                        "con-hang": "#10b981",
                        "sap-het":  "#f59e0b",
                        "het-hang": "#f43f5e",
                      };
                      const color = statusColor[it.trangThai] ?? "var(--muted-foreground)";
                      return (
                        <tr key={it.id}
                          style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s", cursor: "pointer" }}
                          onClick={() => openDetail(it)}
                          onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"}
                          onMouseLeave={e => e.currentTarget.style.background = ""}>
                          <td style={{ padding: "8px 12px" }}>
                            <p style={{ margin: 0, fontWeight: 600, color: "var(--foreground)", fontSize: 13 }}>{it.tenHang}</p>
                            {it.thongSoKyThuat && (
                              <p style={{
                                margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)",
                                display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
                                overflow: "hidden", maxWidth: 260,
                              }}>
                                <i className="bi bi-cpu" style={{ fontSize: 10, marginRight: 3, opacity: 0.7 }} />
                                {it.thongSoKyThuat}
                              </p>
                            )}
                            {!it.thongSoKyThuat && it.category?.name && (
                              <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                                <i className="bi bi-tag" style={{ fontSize: 10, marginRight: 3, opacity: 0.7 }} />
                                {it.category.name}
                              </p>
                            )}
                            {it.thongSoKyThuat && it.category?.name && (
                              <p style={{ margin: "1px 0 0", fontSize: 10, color: "var(--muted-foreground)", opacity: 0.7 }}>
                                <i className="bi bi-tag" style={{ fontSize: 9, marginRight: 3 }} />
                                {it.category.name}
                              </p>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>{it.donVi ?? "—"}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color }}>{it.soLuong.toLocaleString("vi-VN")}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      }
    />

    <TaoMoiHangHoa
      open={addOpen}
      onClose={() => setAddOpen(false)}
      onSaved={() => {
        setRefreshKey(k => k + 1);
        fetch("/api/plan-finance/inventory/stats")
          .then(r => r.json()).then(setStats).catch(() => {});
      }}
    />

    <ChiTietHangHoaOffcanvas
      open={detailOpen}
      item={selectedItem}
      onClose={closeDetail}
      onDeleted={() => {
        setRefreshKey(k => k + 1);
        fetch("/api/plan-finance/inventory/stats")
          .then(r => r.json()).then(setStats).catch(() => {});
      }}
      onUpdated={(updated) => {
        // Cập nhật selectedItem để offcanvas phản ánh dữ liệu mới
        setSelectedItem(updated);
        // Refresh danh sách và stats
        setRefreshKey(k => k + 1);
        fetch("/api/plan-finance/inventory/stats")
          .then(r => r.json()).then(setStats).catch(() => {});
      }}
    />


    <WarehouseOffcanvas
      open={warehouseOpen}
      onClose={closeWarehouse}
    />

    {nhapKhoOpen && (
      <NhapKhoModal
        onClose={() => setNhapKhoOpen(false)}
        onSaved={() => {
          setRefreshKey(k => k + 1);
          fetch("/api/plan-finance/inventory/stats")
            .then(r => r.json()).then(setStats).catch(() => {});
        }}
      />
    )}

    {xuatKhoOpen && (
      <XuatKhoModal
        onClose={() => setXuatKhoOpen(false)}
        onSaved={() => {
          setRefreshKey(k => k + 1);
          fetch("/api/plan-finance/inventory/stats")
            .then(r => r.json()).then(setStats).catch(() => {});
        }}
      />
    )}
    {luanChuyenOpen && (
      <LuanChuyenKhoModal
        onClose={() => setLuanChuyenOpen(false)}
        onSaved={() => {
          setLuanChuyenOpen(false);
          setRefreshKey(k => k + 1);
          fetch("/api/plan-finance/inventory/stats")
            .then(r => r.json()).then(setStats).catch(() => {});
        }}
      />
    )}
    {kiemKhoOpen && (
      <KiemKhoModal
        onClose={() => setKiemKhoOpen(false)}
        onSaved={() => {
          setKiemKhoOpen(false);
          setRefreshKey(k => k + 1);
          fetch("/api/plan-finance/inventory/stats")
            .then(r => r.json()).then(setStats).catch(() => {});
        }}
      />
    )}

    {/* ── Import Result Modal ── */}
    {importResult && (
      <>
        <div
          onClick={() => setImportResult(null)}
          style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,0.45)" }}
        />
        <div style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 5001, minWidth: 380, maxWidth: 480,
          background: "var(--card)", borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "18px 20px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: importResult!.created > 0 ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i
                className={`bi ${importResult!.created > 0 ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`}
                style={{ fontSize: 18, color: importResult!.created > 0 ? "#10b981" : "#f43f5e" }}
              />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Kết quả import Excel</p>
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>Nhập dữ liệu hàng hoá từ file</p>
            </div>
          </div>
          {/* Body */}
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: importResult!.created > 0 ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
              border: `1px solid ${importResult!.created > 0 ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)"}`,
              fontSize: 13, color: "var(--foreground)", lineHeight: 1.6,
            }}>
              {importResult!.message}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{importResult!.created}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600 }}>Đã tạo</div>
              </div>
              {importResult!.skipped > 0 && (
                <div style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 10, background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.15)" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f43f5e" }}>{importResult!.skipped}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600 }}>Bỏ qua</div>
                </div>
              )}
            </div>
            {importResult!.errors && importResult!.errors!.length > 0 && (
              <div style={{
                maxHeight: 140, overflowY: "auto", padding: "10px 12px",
                background: "rgba(244,63,94,0.05)", borderRadius: 8,
                border: "1px solid rgba(244,63,94,0.15)",
              }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#f43f5e", textTransform: "uppercase", letterSpacing: "0.05em" }}>Chi tiết lỗi</p>
                {importResult!.errors!.map((err, i) => (
                  <p key={i} style={{ margin: "2px 0", fontSize: 11.5, color: "var(--muted-foreground)" }}>
                    <i className="bi bi-exclamation-circle" style={{ marginRight: 5, color: "#f43f5e" }} />{err}
                  </p>
                ))}
              </div>
            )}
          </div>
          {/* Footer */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setImportResult(null)}
              style={{
                width: "100%", padding: "9px", border: "none",
                background: "var(--primary)", color: "#fff",
                fontSize: 13, fontWeight: 700, borderRadius: 9, cursor: "pointer",
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </>
    )}

    </>
  );
}
