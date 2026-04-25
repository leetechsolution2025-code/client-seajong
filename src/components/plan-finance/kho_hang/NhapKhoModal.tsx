"use client";
import React from "react";
import { CurrencyInput }       from "@/components/ui/CurrencyInput";
import { useToast }            from "@/components/ui/Toast";
import { ConfirmDialog }       from "@/components/ui/ConfirmDialog";
import { PhieuNhapKhoPreview } from "./PhieuNhapKhoPreview";
import { genDocCode }          from "@/lib/genDocCode";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Warehouse { id: string; code: string | null; name: string; isActive: boolean; }
interface ItemSuggestion { id: string; code: string | null; tenHang: string; donVi: string | null; giaNhap: number; }
interface POSuggestion   { id: string; code: string | null; supplier?: { name: string } | null; ngayDat?: string | null; trangThai: string; }
interface POItem {
  id: string;
  inventoryItemId?: string | null;
  inventoryItem?: ItemSuggestion | null;
  tenHang: string;
  donVi?: string | null;
  soLuong: number;
  donGia: number;
}

interface StockLine {
  id:              string;
  item:            ItemSuggestion | null;
  itemSearch:      string;
  suggestions:     ItemSuggestion[];
  showSugg:        boolean;
  soLuong:         number; // theo chứng từ
  soLuongThucTe:   number; // thực tế nhập
  donGia:          number;
  viTriHang:       string;
  viTriCot:        string;
  viTriTang:       string;
  ghiChu:          string;
}

interface NhapKhoModalProps { onClose: () => void; onSaved: () => void; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid     = () => Math.random().toString(36).slice(2);
const fmtVnd  = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";
const emptyLine = (): StockLine => ({
  id: uid(), item: null, itemSearch: "", suggestions: [], showSugg: false,
  soLuong: 1, soLuongThucTe: 1, donGia: 0, viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
});

const CSS: Record<string, React.CSSProperties> = {
  input: {
    width: "100%", padding: "8px 11px", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 13, background: "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  },
  label: { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 5 },
  section: {
    borderBottom: "1px solid var(--border)", padding: "16px 24px",
    display: "grid", gap: 12,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export function NhapKhoModal({ onClose, onSaved }: NhapKhoModalProps) {
  const [mode, setMode] = React.useState<"manual" | "po">("manual");

  // Header fields
  const [soChungTu, setSoChungTu]         = React.useState(() => genDocCode("PN"));
  const [ngayNhap, setNgayNhap]           = React.useState(() => new Date().toISOString().slice(0,10));
  const [lockDate, setLockDate]           = React.useState(true); // khoá ngày nhập vào hôm nay
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [nguoiThucHien, setNguoiThucHien] = React.useState("");
  const [lyDo, setLyDo]                   = React.useState("Nhập kho hàng hoá");
  const [ghiChu, setGhiChu]               = React.useState("");

  // PO mode
  const [poList, setPoList]         = React.useState<POSuggestion[]>([]);
  const [poLoading, setPoLoading]   = React.useState(false);
  const [selectedPO, setSelectedPO] = React.useState<POSuggestion | null>(null);

  const toast = useToast();

  // Data
  const [warehouses, setWarehouses]   = React.useState<Warehouse[]>([]);
  const [lines, setLines]             = React.useState<StockLine[]>([emptyLine()]);
  const [saving, setSaving]           = React.useState(false);
  const [success, setSuccess]         = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);

  // Fetch warehouses
  React.useEffect(() => {
    fetch("/api/plan-finance/warehouses").then(r => r.json())
      .then((d: Warehouse[]) => {
        const active = Array.isArray(d) ? d.filter(w => w.isActive) : [];
        setWarehouses(active);
        if (active.length === 1) setToWarehouseId(active[0].id);
      }).catch(() => {});
  }, []);

  // ESC close
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Fetch PO list khi chuyển sang mode PO
  React.useEffect(() => {
    if (mode !== "po") return;
    setPoLoading(true);
    setSelectedPO(null);
    fetch("/api/plan-finance/purchasing?trangThai=da-nhan-hang&page=1")
      .then(r => r.json())
      .then(d => setPoList(Array.isArray(d.items) ? d.items : []))
      .catch(() => setPoList([]))
      .finally(() => setPoLoading(false));
  }, [mode]);

  // ── PO select ──────────────────────────────────────────────────────────────
  const onSelectPOById = async (id: string) => {
    if (!id) { setSelectedPO(null); setLines([emptyLine()]); return; }
    const po = poList.find(p => p.id === id) ?? null;
    setSelectedPO(po);
    if (!po) return;
    setPoLoading(true);
    try {
      const res  = await fetch(`/api/plan-finance/purchasing/${po.id}`);
      const full = await res.json();
      if (Array.isArray(full.items) && full.items.length > 0) {
        setLines(full.items.map((it: POItem) => ({
          id: uid(),
          item: it.inventoryItem
            ? { id: it.inventoryItemId!, code: it.inventoryItem.code, tenHang: it.tenHang, donVi: it.donVi ?? null, giaNhap: it.donGia }
            : null,
          itemSearch: it.tenHang,
          suggestions: [], showSugg: false,
          soLuong: it.soLuong,
          soLuongThucTe: it.soLuong, // mặc định thực tế = chứng từ
          donGia: it.donGia,
          viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
        })));
        setLyDo(`Nhập kho theo PO: ${po.code ?? po.id}`);
      }
    } catch { /* giữ lines cũ */ }
    finally { setPoLoading(false); }
  };

  // ── Item search (per line) ─────────────────────────────────────────────────
  const searchTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const onItemSearch = (lineId: string, q: string) => {
    if (!q.trim()) {
      // Xoá tên → reset toàn bộ dữ liệu liên quan
      setLines(ls => ls.map(l => l.id === lineId ? {
        ...l,
        itemSearch: "", item: null, suggestions: [], showSugg: false,
        soLuong: 1, soLuongThucTe: 1, donGia: 0,
        viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
      } : l));
      clearTimeout(searchTimers.current[lineId]);
      return;
    }
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, itemSearch: q, showSugg: true } : l));
    clearTimeout(searchTimers.current[lineId]);
    searchTimers.current[lineId] = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=8`);
        const data: ItemSuggestion[] = await res.json();
        setLines(ls => ls.map(l => l.id === lineId ? { ...l, suggestions: Array.isArray(data) ? data : [] } : l));
      } catch { /* ignore */ }
    }, 250);
  };

  const selectItem = (lineId: string, item: ItemSuggestion) =>
    setLines(ls => ls.map(l => l.id === lineId
      ? { ...l, item, itemSearch: item.tenHang, suggestions: [], showSugg: false, donGia: item.giaNhap }
      : l));

  const updateLine = <K extends keyof StockLine>(lineId: string, key: K, val: StockLine[K]) =>
    setLines(ls => ls.map(l => {
      if (l.id !== lineId) return l;
      const updated = { ...l, [key]: val };
      // Nếu đang sửa soLuong (chứng từ) và soLuongThucTe chưa bị chỉnh tay → đồng bộ theo
      if (key === "soLuong" && (l.soLuongThucTe === l.soLuong || l.soLuongThucTe === undefined)) {
        updated.soLuongThucTe = val as number;
      }
      return updated;
    }));

  const addLine    = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (lineId: string) =>
    setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== lineId) : ls);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const validLines  = lines.filter(l => l.item && (l.soLuongThucTe ?? l.soLuong) > 0);
  const tongSL      = validLines.reduce((s, l) => s + (l.soLuongThucTe ?? l.soLuong), 0);
  const tongTien    = validLines.reduce((s, l) => s + (l.soLuongThucTe ?? l.soLuong) * l.donGia, 0);

  // ── Save (có kiểm tra vị trí kho) ───────────────────────────────────────────
  const doSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/plan-finance/stock-movements/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toWarehouseId,
          soChungTu:       soChungTu      || undefined,
          purchaseOrderId: selectedPO?.id || undefined,
          lyDo: lyDo || undefined, nguoiThucHien: nguoiThucHien || undefined,
          lines: validLines.map(l => ({
            inventoryItemId: l.item!.id,
            soLuong:   l.soLuongThucTe ?? l.soLuong,
            soLuongCT: l.soLuong,
            donGia:    l.donGia    || undefined,
            viTriHang: l.viTriHang || undefined,
            viTriCot:  l.viTriCot  || undefined,
            viTriTang: l.viTriTang || undefined,
            ghiChu:    l.ghiChu   || undefined,
          })),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi lưu"); }
      toast.success("✅ Nhập kho thành công!", `Phữu ${soChungTu} đã được xác nhận`, 5000);
      setSuccess(true);
      onSaved();
    } catch (e) {
      toast.error("Nhập kho thất bại", e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setSaving(false); }
  };

  const handleSave = () => {
    if (!toWarehouseId) { toast.error("Thiếu thông tin", "Vui lòng chọn kho nhập"); return; }
    if (!validLines.length) { toast.error("Chưa có hàng hoá", "Cần ít nhất 1 dòng hàng hoá hợp lệ"); return; }
    const missingPos = validLines.some(l => !l.viTriHang && !l.viTriCot && !l.viTriTang);
    if (missingPos) { setConfirmOpen(true); } else { doSave(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: "var(--background)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ═══ TOP BAR ═══════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, height: 56, borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", alignItems: "center", gap: 14, background: "var(--card)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="bi bi-box-arrow-in-down" style={{ fontSize: 18, color: "#10b981" }} />
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Phiếu nhập kho</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{soChungTu}</p>
        </div>

        {/* Mode toggle */}
        <div style={{ marginLeft: 16, display: "flex", background: "var(--muted)", padding: 3, borderRadius: 9, gap: 2 }}>
          {([ { val: "manual" as const, label: "Nhập thủ công", icon: "bi-pencil" },
              { val: "po"     as const, label: "Theo đơn mua (PO)", icon: "bi-file-earmark-text" }]).map(m => (
            <button key={m.val} onClick={() => setMode(m.val)} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 14px", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
              background: mode === m.val ? "var(--card)" : "transparent",
              color: mode === m.val ? "var(--foreground)" : "var(--muted-foreground)",
              boxShadow: mode === m.val ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>
              <i className={`bi ${m.icon}`} style={{ fontSize: 12 }} />
              {m.label}
            </button>
          ))}
        </div>

        {/* PO select — hiện ngay cạnh khi chọn mode PO */}
        {mode === "po" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 10 }}>
            {poLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground)", padding: "0 10px" }}>
                <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />
                Đang tải…
              </div>
            ) : (
              <select
                value={selectedPO?.id ?? ""}
                onChange={e => onSelectPOById(e.target.value)}
                style={{
                  height: 34, padding: "0 12px",
                  border: `1.5px solid ${selectedPO ? "rgba(16,185,129,0.6)" : "var(--border)"}`,
                  borderRadius: 8,
                  background: selectedPO ? "rgba(16,185,129,0.06)" : "var(--muted)",
                  color: selectedPO ? "#10b981" : "var(--foreground)",
                  fontSize: 13, fontWeight: selectedPO ? 700 : 400,
                  outline: "none", cursor: "pointer",
                  minWidth: 220, maxWidth: 340,
                  transition: "all 0.15s",
                }}
              >
                <option value="">-- Chọn đơn mua hàng (PO) --</option>
                {poList.length === 0 && (
                  <option disabled value="">Không có PO "Đã nhận hàng"</option>
                )}
                {poList.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.code ?? po.id}{po.supplier?.name ? ` — ${po.supplier.name}` : ""}
                  </option>
                ))}
              </select>
            )}
            {selectedPO && (
              <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700, background: "rgba(16,185,129,0.1)", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>
                <i className="bi bi-check-circle-fill" style={{ marginRight: 4 }} />
                Đã chọn
              </span>
            )}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {success && (
            <button onClick={() => setShowPreview(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderWidth: "1.5px", borderStyle: "solid", borderColor: "#10b981", background: "rgba(16,185,129,0.1)", color: "#10b981", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>
              <i className="bi bi-printer" style={{ fontSize: 14 }} /> In phiếu nhập kho
            </button>
          )}
          {!success && (() => {
              const canSave = !saving
                && validLines.length > 0
                && !(mode === "po" && !selectedPO);
              return (
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  title={
                    mode === "po" && !selectedPO ? "Vui lòng chọn đơn mua hàng (PO)" :
                    validLines.length === 0 ? "Chưa có hàng hoá nào trong bảng" : undefined
                  }
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 20px", border: "none", borderRadius: 8,
                    background: canSave ? "#10b981" : "var(--muted)",
                    color: canSave ? "#fff" : "var(--muted-foreground)",
                    fontSize: 13, fontWeight: 700,
                    cursor: canSave ? "pointer" : "not-allowed",
                    opacity: canSave ? 1 : 0.6,
                    transition: "all 0.15s",
                  }}
                >
                  {saving
                    ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />
                    : <i className="bi bi-check2-all" style={{ fontSize: 14 }} />}
                  Xác nhận nhập kho
                </button>
              );
            })()}

          <button onClick={onClose} style={{ width: 34, height: 34, borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)", background: "var(--muted)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* ═══ BODY: sidebar trái + nội dung phải ══════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SIDEBAR TRÁI: Thông tin phiếu ─────────────────────────────── */}
        <div style={{
          width: 272,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--card)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>



          {/* Form fields */}
          <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>

            {/* Header nhóm */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-receipt" style={{ fontSize: 13, color: "#10b981" }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 13, color: "var(--foreground)" }}>Thông tin phiếu</span>
            </div>

            {/* Số phiếu */}
            <div>
              <label style={CSS.label}>Số phiếu nhập</label>
              <input
                value={soChungTu}
                readOnly
                style={{
                  ...CSS.input,
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                  cursor: "default",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              />
            </div>

            {/* Ngày nhập */}
            <div>
              <label style={CSS.label}>Ngày nhập kho</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Date input */}
                <input
                  type="date"
                  value={ngayNhap}
                  min={lockDate ? new Date().toISOString().slice(0,10) : undefined}
                  max={lockDate ? new Date().toISOString().slice(0,10) : undefined}
                  onChange={e => !lockDate && setNgayNhap(e.target.value)}
                  readOnly={lockDate}
                  style={{
                    ...CSS.input,
                    flex: 1,
                    cursor: lockDate ? "not-allowed" : "text",
                    opacity: lockDate ? 0.7 : 1,
                    background: lockDate ? "var(--muted)" : CSS.input.background,
                  }}
                />
                {/* iOS-style switch */}
                <label
                  title={lockDate ? "Khoá ngày hôm nay — nhấn để mở" : "Đang mở — nhấn để khoá"}
                  style={{ display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
                >
                  <span
                    onClick={() => setLockDate(v => !v)}
                    style={{
                      position: "relative", display: "inline-block",
                      width: 34, height: 18, borderRadius: 9, flexShrink: 0,
                      background: lockDate ? "#10b981" : "var(--border)",
                      transition: "background 0.2s",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: 2, left: lockDate ? 18 : 2,
                      width: 14, height: 14, borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                      transition: "left 0.2s",
                    }} />
                  </span>
                </label>
              </div>
            </div>


            {/* Kho nhập */}
            <div>
              <label style={CSS.label}>Kho nhập <span style={{ color: "#f43f5e" }}>*</span></label>
              <select
                value={toWarehouseId}
                onChange={e => !success && setToWarehouseId(e.target.value)}
                disabled={success}
                style={{ ...CSS.input, appearance: "none", borderColor: toWarehouseId ? "rgba(16,185,129,0.5)" : "var(--border)", opacity: success ? 0.65 : 1, cursor: success ? "not-allowed" : "pointer" }}
              >
                <option value="">-- Chọn kho --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ""}</option>
                ))}
              </select>
            </div>

            {/* Người thực hiện */}
            <div>
              <label style={CSS.label}>Người thực hiện</label>
              <input
                value={nguoiThucHien}
                onChange={e => !success && setNguoiThucHien(e.target.value)}
                readOnly={success}
                placeholder="Tên thủ kho / người nhập"
                style={{ ...CSS.input, opacity: success ? 0.65 : 1, cursor: success ? "default" : "text" }}
              />
            </div>

            {/* Lý do */}
            <div>
              <label style={CSS.label}>Lý do nhập kho</label>
              <textarea
                value={lyDo}
                onChange={e => !success && setLyDo(e.target.value)}
                readOnly={success}
                rows={2}
                style={{ ...CSS.input, resize: success ? "none" : "vertical", lineHeight: 1.5, opacity: success ? 0.65 : 1, cursor: success ? "default" : "text" }}
              />
            </div>

            {/* Ghi chú — chiếm hết không gian còn lại */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <label style={CSS.label}>Ghi chú</label>
              <textarea
                value={ghiChu}
                onChange={e => !success && setGhiChu(e.target.value)}
                readOnly={success}
                placeholder="Ghi chú thêm..."
                style={{ ...CSS.input, flex: 1, resize: "none", lineHeight: 1.5, opacity: success ? 0.65 : 1, cursor: success ? "default" : "text" }}
              />
            </div>
          </div>
        </div>

        {/* ── NỘI DUNG PHẢI: Bảng hàng hoá ──────────────────────────────── */}
        <div style={{ flex: 1, overflowY: !toWarehouseId ? "hidden" : "auto", padding: "16px 20px 24px", position: "relative" }}>

          {/* Overlay khi chưa chọn kho */}
          {!toWarehouseId && (
            <div style={{ position: "absolute", inset: 0, zIndex: 10, backdropFilter: "blur(3px)", background: "color-mix(in srgb, var(--background) 60%, transparent)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-lock-fill" style={{ fontSize: 24, color: "#10b981" }} />
              </div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Chưa chọn kho nhập</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
                Vui lòng chọn kho nhập trong bảng bên trái<br />để mở khu vực nhập hàng hoá.
              </p>
            </div>
          )}

          {/* Tiêu đề bảng */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Danh sách hàng hoá nhập kho</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 20, padding: "2px 10px" }}>
              {lines.length} dòng
            </span>
            {mode === "po" && selectedPO && (
              <span style={{ fontSize: 11, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>
                <i className="bi bi-link-45deg" /> Từ PO: {selectedPO.code}
              </span>
            )}
            {/* Summary tổng — căn phải */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tổng SL</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#10b981", lineHeight: 1.2 }}>{tongSL.toLocaleString("vi-VN")}</div>
              </div>
              <div style={{ width: 1, height: 28, background: "var(--border)" }} />
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Giá trị</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#10b981", lineHeight: 1.2 }}>{fmtVnd(tongTien)}</div>
              </div>
            </div>
          </div>

          {/* Table header — 2 dòng, merge cột SL + merge cột Vị trí */}
          <div style={{ background: "var(--muted)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
            {/* Dòng 1: nhãn nhóm */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 60px 160px 180px 110px 110px 32px",
              gap: 5, padding: "6px 10px 0",
              fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              <div>#</div>
              <div>Hàng hoá</div>
              <div style={{ textAlign: "center" }}>ĐVT</div>
              {/* merge 2 cột SL */}
              <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>
                Số lượng nhập
              </div>
              {/* merge 3 cột Vị trí */}
              <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>
                Vị trí trong kho
              </div>
              <div style={{ textAlign: "right" }}>Đơn giá (₫)</div>
              <div style={{ textAlign: "right" }}>Thành tiền</div>
              <div />
            </div>
            {/* Dòng 2: sub-label */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 60px 80px 80px 60px 60px 60px 110px 110px 32px",
              gap: 5, padding: "2px 10px 6px",
              fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)",
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              <div /><div /><div />
              <div style={{ textAlign: "center", opacity: 0.75 }}>Theo CT</div>
              <div style={{ textAlign: "center", opacity: 0.9 }}>Thực tế</div>
              <div style={{ textAlign: "center", opacity: 0.75 }}>Hàng</div>
              <div style={{ textAlign: "center", opacity: 0.75 }}>Cột</div>
              <div style={{ textAlign: "center", opacity: 0.75 }}>Tầng</div>
              <div /><div /><div />
            </div>
          </div>


          {/* Lines */}
          <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
            {lines.map((line, idx) => (
              <LineRow key={line.id} line={line} idx={idx}
                onItemSearch={q => onItemSearch(line.id, q)}
                onSelectItem={item => selectItem(line.id, item)}
                onUpdate={(key, val) => updateLine(line.id, key, val)}
                onRemove={() => removeLine(line.id)}
                canRemove={lines.length > 1}
                locked={success}
              />
            ))}
            <div style={{ padding: "8px 10px", borderTop: "1px dashed var(--border)" }}>
              {!success ? (
                <button onClick={addLine}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#10b981"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderWidth: "1.5px", borderStyle: "dashed", borderColor: "var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, borderRadius: 7, cursor: "pointer", transition: "all 0.15s" }}>
                  <i className="bi bi-plus-lg" style={{ fontSize: 13 }} /> Thêm dòng hàng hoá
                </button>
              ) : (
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6, padding: "4px 4px" }}>
                  <i className="bi bi-lock-fill" style={{ fontSize: 11, color: "#10b981" }} />
                  Danh sách đã khoá sau khi xác nhận nhập kho
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm khi thiếu vị trí kho */}
      <ConfirmDialog
        open={confirmOpen}
        variant="warning"
        title="Chưa nhập vị trí hàng trong kho"
        message="Một số mặt hàng chưa có thông tin Hàng / Cột / Tầng. Bạn vẫn muốn xác nhận nhập kho?"
        confirmLabel="Vẫn nhập kho"
        cancelLabel="Quay lại nhập vị trí"
        loading={saving}
        onConfirm={() => { setConfirmOpen(false); doSave(); }}
        onCancel={() => setConfirmOpen(false)}
      />
      {/* Preview phieu nhap kho */}
      {showPreview && (
        <PhieuNhapKhoPreview
          soChungTu={soChungTu}
          ngayNhap={ngayNhap}
          khoName={warehouses.find(w => w.id === toWarehouseId)?.name ?? "—"}
          lyDo={lyDo || undefined}
          nguoiThucHien={nguoiThucHien || undefined}
          lines={validLines.map(l => ({
            tenHang:   l.item!.tenHang,
            maSku:     l.item!.code,
            donVi:     l.item!.donVi,
            soLuongCT: l.soLuong,
            soLuong:   l.soLuongThucTe ?? l.soLuong,
            donGia:    l.donGia,
            viTriHang: l.viTriHang || undefined,
            viTriCot:  l.viTriCot  || undefined,
            viTriTang: l.viTriTang || undefined,
            ghiChu:    l.ghiChu   || undefined,
          }))}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// ── LineRow ───────────────────────────────────────────────────────────────────
function LineRow({ line, idx, onItemSearch, onSelectItem, onUpdate, onRemove, canRemove, locked }: {
  line: StockLine; idx: number;
  onItemSearch: (q: string) => void;
  onSelectItem: (item: ItemSuggestion) => void;
  onUpdate:     <K extends keyof StockLine>(key: K, val: StockLine[K]) => void;
  onRemove:     () => void;
  canRemove:    boolean;
  locked?:      boolean;
}) {
  const cellInput: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)",
    borderRadius: 6, fontSize: 12.5, background: locked ? "var(--muted)" : "var(--background)",
    color: locked ? "var(--muted-foreground)" : "var(--foreground)",
    outline: "none", boxSizing: "border-box",
    cursor: locked ? "default" : "text",
  };
  const thanhTien = (line.soLuongThucTe ?? line.soLuong) * line.donGia;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "28px 1fr 60px 80px 80px 60px 60px 60px 110px 110px 32px",
      gap: 5, padding: "7px 10px",
      borderTop: idx === 0 ? "none" : "1px solid var(--border)",
      alignItems: "center",
      background: line.item ? "var(--background)" : `color-mix(in srgb, var(--muted) 20%, var(--background))`,
    }}>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 600 }}>{idx+1}</div>

      {/* Item search */}
      <div style={{ position: "relative" }}>
        <input value={line.itemSearch}
          onChange={e => !locked && onItemSearch(e.target.value)}
          onFocus={() => { if (line.itemSearch && !locked) onUpdate("showSugg", true); }}
          readOnly={locked}
          placeholder="Tìm hoặc nhập tên hàng..." style={{ ...cellInput, paddingRight: line.item ? 26 : 8, borderColor: line.item ? "rgba(16,185,129,0.4)" : "var(--border)" }} />
        {line.item && <i className="bi bi-check-circle-fill" style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#10b981", pointerEvents: "none" }} />}
        {line.showSugg && line.suggestions.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, zIndex: 200, background: "var(--card)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 7, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", maxHeight: 180, overflowY: "auto" }}>
            {line.suggestions.map(s => (
              <div key={s.id} onClick={() => onSelectItem(s)}
                style={{ padding: "7px 11px", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.tenHang}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.code ?? ""} · {s.donVi ?? ""} · {s.giaNhap > 0 ? s.giaNhap.toLocaleString("vi-VN") + " ₫" : "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ĐVT */}
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>{line.item?.donVi ?? "—"}</div>

      {/* SL theo chứng từ */}
      <input
        type="number" min={0}
        value={line.soLuong}
        onChange={e => !locked && onUpdate("soLuong", Math.max(0, parseFloat(e.target.value)||0))}
        readOnly={locked}
        style={{ ...cellInput, textAlign: "center", background: locked ? "var(--muted)" : "color-mix(in srgb, var(--muted) 60%, var(--background))", color: "var(--muted-foreground)" }}
        title="Số lượng theo chứng từ"
      />

      {/* SL thực tế nhập */}
      <input
        type="number" min={0}
        value={line.soLuongThucTe ?? line.soLuong}
        onChange={e => !locked && onUpdate("soLuongThucTe", Math.max(0, parseFloat(e.target.value)||0))}
        readOnly={locked}
        style={{
          ...cellInput, textAlign: "center",
          borderColor: !locked && (line.soLuongThucTe ?? line.soLuong) !== line.soLuong ? "#f59e0b" : "var(--border)",
          fontWeight: !locked && (line.soLuongThucTe ?? line.soLuong) !== line.soLuong ? 700 : 400,
          color: locked ? "var(--muted-foreground)" : (line.soLuongThucTe ?? line.soLuong) !== line.soLuong ? "#f59e0b" : "var(--foreground)",
        }}
        title="Số lượng thực tế nhập kho"
      />

      {/* Vị trí kho */}
      <input placeholder="Hàng" value={line.viTriHang} onChange={e => !locked && onUpdate("viTriHang", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Hàng" />
      <input placeholder="Cột"  value={line.viTriCot}  onChange={e => !locked && onUpdate("viTriCot",  e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Cột" />
      <input placeholder="Tầng" value={line.viTriTang} onChange={e => !locked && onUpdate("viTriTang", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Tầng" />

      {/* Đơn giá */}
      <CurrencyInput value={line.donGia} onChange={v => !locked && onUpdate("donGia", v)} placeholder="0" style={{ ...cellInput, textAlign: "right" }} />

      {/* Thành tiền */}
      <div style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: thanhTien > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>
        {thanhTien > 0 ? thanhTien.toLocaleString("vi-VN") + " ₫" : "—"}
      </div>

      {/* Remove */}
      <button onClick={onRemove} disabled={!canRemove || locked}
        onMouseEnter={e => { if (canRemove && !locked) e.currentTarget.style.background = "rgba(244,63,94,0.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        style={{ width: 26, height: 26, border: "none", background: "transparent", color: (canRemove && !locked) ? "#f43f5e" : "var(--border)", cursor: (canRemove && !locked) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, transition: "background 0.15s" }}>
        <i className="bi bi-trash3" style={{ fontSize: 12 }} />
      </button>
    </div>
  );
}
