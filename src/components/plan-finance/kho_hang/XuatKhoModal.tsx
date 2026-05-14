"use client";
import React from "react";
import { CurrencyInput }            from "@/components/ui/CurrencyInput";
import { useToast }                  from "@/components/ui/Toast";
import { ConfirmDialog }             from "@/components/ui/ConfirmDialog";
import { PhieuXuatKhoPreview }       from "./PhieuXuatKhoPreview";
import { TaoYeuCauMuaHangModal }     from "@/components/plan-finance/mua_hang/TaoYeuCauMuaHangModal";
import { TrangThaiTonKhoBadge }      from "@/components/plan-finance/dung_chung/TrangThaiTonKhoBadge";
import { genDocCode }                from "@/lib/genDocCode";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Warehouse       { id: string; code: string | null; name: string; isActive: boolean; }
interface ItemSuggestion  { id: string; code: string | null; tenHang: string; donVi: string | null; giaNhap: number; soLuongTon?: number; viTriHang?: string | null; viTriCot?: string | null; viTriTang?: string | null; }
interface SaleOrderOption {
  id: string; code: string | null;
  type: "contract" | "sale-order" | "retail-invoice";
  typeLabel: string;
  customer: string | null;
  tongTien: number;
  trangThai: string;
}
interface WorkOrderOption { id: string; code: string | null; tenLenhSX?: string | null; }

interface StockLine {
  id:          string;
  item:        ItemSuggestion | null;
  itemSearch:  string;
  suggestions: ItemSuggestion[];
  showSugg:    boolean;
  soLuongYC:   number;   // yêu cầu / chứng từ
  soLuong:     number;   // thực xuất
  soLuongTon?: number;   // tồn kho tại kho xuất (lấy từ search API)
  donGia:      number;
  viTriHang:   string;
  viTriCot:    string;
  viTriTang:   string;
  ghiChu:      string;
  error?:      string;
}

interface XuatKhoModalProps { onClose: () => void; onSaved: () => void; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid       = () => Math.random().toString(36).slice(2);
const fmtVnd    = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";
const emptyLine = (): StockLine => ({
  id: uid(), item: null, itemSearch: "", suggestions: [], showSugg: false,
  soLuongYC: 1, soLuong: 1, donGia: 0,
  viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
});

function genSoPhieu() { return genDocCode("PX"); }

const CSS: Record<string, React.CSSProperties> = {
  input: {
    width: "100%", padding: "8px 11px", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 13, background: "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  },
  label: { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 5 },
};

const GRID = "28px 1fr 60px 80px 80px 60px 60px 60px 110px 110px 32px";

// ── Main Component ─────────────────────────────────────────────────────────────
export function XuatKhoModal({ onClose, onSaved }: XuatKhoModalProps) {
  const toast = useToast();

  const [mode, setMode]                 = React.useState<"manual" | "so" | "wo">("manual");
  const [warehouses, setWarehouses]     = React.useState<Warehouse[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = React.useState("");
  const [soChungTu]                     = React.useState(genSoPhieu);
  const [ngayXuat, setNgayXuat]         = React.useState(new Date().toISOString().slice(0,10));
  const [lockDate, setLockDate]         = React.useState(true);
  const [lyDo, setLyDo]                 = React.useState("Xuất kho hàng hoá");
  const [ghiChu, setGhiChu]             = React.useState("");
  const [nguoiThucHien, setNguoiThucHien] = React.useState("");
  const [lines, setLines]               = React.useState<StockLine[]>([emptyLine()]);
  const [saving, setSaving]             = React.useState(false);
  const [success, setSuccess]           = React.useState(false);
  const [confirmOpen, setConfirmOpen]   = React.useState(false);
  const [showPreview, setShowPreview]   = React.useState(false);
  const [insufficientItems, setInsufficient] = React.useState<{inventoryItemId:string;tenHang:string;soLuong:number;soLuongTon:number}[]>([]);

  // SO / WO
  const [saleOrders, setSaleOrders]     = React.useState<SaleOrderOption[]>([]);
  const [selectedSo, setSelectedSo]     = React.useState<SaleOrderOption | null>(null);
  const [workOrders, setWorkOrders]     = React.useState<WorkOrderOption[]>([]);
  const [selectedWo, setSelectedWo]     = React.useState<WorkOrderOption | null>(null);
  const [listLoading, setListLoading]   = React.useState(false);

  // Fetch warehouses
  React.useEffect(() => {
    fetch("/api/plan-finance/warehouses").then(r => r.json())
      .then((d: Warehouse[]) => {
        const active = Array.isArray(d) ? d.filter(w => w.isActive) : [];
        setWarehouses(active);
        if (active.length === 1) setFromWarehouseId(active[0].id);
      }).catch(() => {});
  }, []);

  // Fetch danh sách đơn bán hàng khi chuyển sang mode "so"
  React.useEffect(() => {
    if (mode !== "so") return;
    setListLoading(true); setSelectedSo(null);
    fetch("/api/plan-finance/sales-active")
      .then(r => r.json())
      .then(d => setSaleOrders(Array.isArray(d) ? d : []))
      .catch(() => setSaleOrders([]))
      .finally(() => setListLoading(false));
  }, [mode]);

  // Auto-fill khi pick SO
  const onSelectSo = (id: string) => {
    if (!id) { setSelectedSo(null); setLines([emptyLine()]); return; }
    const so = saleOrders.find(s => s.id === id) ?? null;
    setSelectedSo(so);
    if (so) {
      const prefix = so.typeLabel ?? "Đơn bán hàng";
      setLyDo(`Xuất hàng theo ${prefix.toLowerCase()} ${so.code ?? so.id}`);
      loadItemsFromOrder(so);
    }
  };

  // Auto-load items từ đơn/hợp đồng/hoá đơn vào danh sách xuất
  const loadItemsFromOrder = async (so: SaleOrderOption) => {
    try {
      let rawLines: { tenHang: string; donVi: string | null; soLuong: number; donGia: number; inventoryItemId: string | null }[] = [];

      if (so.type === "contract") {
        // Contract → lấy qua quotation.items
        const res = await fetch(`/api/plan-finance/contracts/${so.id}`);
        if (!res.ok) return;
        const detail = await res.json();
        rawLines = (detail.quotation?.items ?? []).map((it: { tenHang: string; donVi: string | null; soLuong: number; donGia: number }) => ({
          tenHang: it.tenHang,
          donVi: it.donVi,
          soLuong: it.soLuong,
          donGia: it.donGia,
          inventoryItemId: null,
        }));
      } else if (so.type === "retail-invoice") {
        // Hoá đơn bán lẻ → lấy items trực tiếp
        const res = await fetch(`/api/plan-finance/retail-invoices/${so.id}`);
        if (!res.ok) return;
        const detail = await res.json();
        rawLines = (detail.items ?? []).map((it: { tenHang: string; dvt: string | null; soLuong: number; donGia: number; inventoryItemId: string | null; inventoryItem?: { id: string; code: string | null; tenHang: string; donVi: string | null; giaNhap: number } | null }) => ({
          tenHang: it.tenHang,
          donVi: it.dvt,
          soLuong: it.soLuong,
          donGia: it.donGia,
          inventoryItemId: it.inventoryItemId,
          inventoryItem: it.inventoryItem ?? null,
        }));
      }
      // SaleOrder: không có items — giữ 1 dòng rỗng

      if (rawLines.length === 0) {
        setLines([emptyLine()]);
        return;
      }

      // Map thành StockLine, rồi nếu có inventoryItem → tìm tồn kho theo kho đã chọn
      const newLines: StockLine[] = rawLines.map(raw => {
        const l = emptyLine();
        l.itemSearch = raw.tenHang;
        l.soLuongYC  = raw.soLuong;
        l.soLuong    = raw.soLuong;
        l.donGia     = raw.donGia;
        return l;
      });

      setLines(newLines);

      // Fetch tồn kho song song cho các items có tên
      if (fromWarehouseId) {
        rawLines.forEach((raw, idx) => {
          if (!raw.tenHang) return;
          const warehouseParam = `&warehouseId=${fromWarehouseId}`;
          fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(raw.tenHang)}&limit=5${warehouseParam}`)
            .then(r => r.json())
            .then((data: { id: string; tenHang: string; soLuongTon?: number; giaNhap: number; donVi: string | null; code: string | null; viTriHang?: string | null; viTriCot?: string | null; viTriTang?: string | null }[]) => {
              if (!Array.isArray(data) || !data.length) return;
              // Match tốt nhất theo tên
              const found = data.find(d => d.tenHang.toLowerCase() === raw.tenHang.toLowerCase()) ?? data[0];
              setLines(prev => prev.map((l, i) => {
                if (i !== idx) return l;
                return {
                  ...l,
                  item: {
                    id: found.id, code: found.code, tenHang: found.tenHang,
                    donVi: found.donVi, giaNhap: found.giaNhap,
                    soLuongTon: found.soLuongTon,
                    viTriHang: found.viTriHang, viTriCot: found.viTriCot, viTriTang: found.viTriTang,
                  },
                  itemSearch: found.tenHang,
                  soLuongTon: found.soLuongTon,
                  viTriHang: found.viTriHang ?? "",
                  viTriCot:  found.viTriCot  ?? "",
                  viTriTang: found.viTriTang ?? "",
                };
              }));
            })
            .catch(() => {});
        });
      }
    } catch { /* ignore */ }
  };

  // Auto-fill khi pick WO
  const onSelectWo = (id: string) => {
    if (!id) { setSelectedWo(null); return; }
    const wo = workOrders.find(w => w.id === id) ?? null;
    setSelectedWo(wo);
    if (wo) setLyDo(`Xuất nguyên vật liệu theo lệnh sản xuất ${wo.code ?? wo.id}`);
  };

  // ESC close
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !showPreview) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, showPreview]);

  // ── Item search — debounce 250ms ────────────────────────────────────────────
  const searchTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const onItemSearch = (lineId: string, q: string) => {
    if (!q.trim()) {
      setLines(ls => ls.map(l => l.id === lineId ? {
        ...l, itemSearch: "", item: null, suggestions: [], showSugg: false,
        soLuongYC: 1, soLuong: 1, donGia: 0, viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
      } : l));
      clearTimeout(searchTimers.current[lineId]);
      return;
    }
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, itemSearch: q, showSugg: true } : l));
    clearTimeout(searchTimers.current[lineId]);
    searchTimers.current[lineId] = setTimeout(async () => {
      try {
        const whParam = fromWarehouseId ? `&warehouseId=${fromWarehouseId}` : "";
        const res  = await fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=8${whParam}`);
        const data: ItemSuggestion[] = await res.json();
        setLines(ls => ls.map(l => l.id === lineId ? { ...l, suggestions: Array.isArray(data) ? data : [] } : l));
      } catch { /* ignore */ }
    }, 250);
  };

  const selectItem = (lineId: string, item: ItemSuggestion) => setLines(ls => ls.map(l =>
    l.id === lineId
      ? {
          ...l,
          item,
          itemSearch: item.tenHang,
          suggestions: [], showSugg: false,
          donGia:    item.giaNhap,
          soLuongTon: item.soLuongTon,
          // Auto-fill vị trí từ InventoryStock (chỉ fill khi chưa nhập tay)
          viTriHang: l.viTriHang || (item.viTriHang ?? ""),
          viTriCot:  l.viTriCot  || (item.viTriCot  ?? ""),
          viTriTang: l.viTriTang || (item.viTriTang ?? ""),
          error: undefined,
        }
      : l
  ));

  const updateLine = <K extends keyof StockLine>(lineId: string, key: K, val: StockLine[K]) =>
    setLines(ls => ls.map(l => {
      if (l.id !== lineId) return l;
      const updated = { ...l, [key]: val };
      // Đồng bộ soLuong khi sửa soLuongYC (nếu chưa chỉnh tay soLuong)
      if (key === "soLuongYC" && (l.soLuong === l.soLuongYC)) updated.soLuong = val as number;
      return updated;
    }));

  const addLine    = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (lineId: string) => setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== lineId) : ls);

  // Re-fetch tồn kho cho tất cả item đã chọn khi đổi kho
  React.useEffect(() => {
    if (!fromWarehouseId) return;
    setLines(ls => ls.map(l => {
      if (!l.item) return l;
      // Reset tồn — sẽ được cập nhật khi search lại
      return { ...l, soLuongTon: undefined };
    }));
    // Fetch tồn mới theo kho vừa chọn
    const cur = lines.filter(l => l.item);
    if (!cur.length) return;
    // Fetch từng item theo kho mới
    cur.forEach(l => {
      if (!l.item) return;
      fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(l.item.tenHang)}&limit=20&warehouseId=${fromWarehouseId}`)
        .then(r => r.json())
        .then((data: { id: string; soLuongTon?: number }[]) => {
          const found = Array.isArray(data) ? data.find(x => x.id === l.item!.id) : null;
          setLines(prev => prev.map(pl =>
            pl.id === l.id ? { ...pl, soLuongTon: found?.soLuongTon } : pl
          ));
        })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromWarehouseId]);

  // ── Totals + Realtime stock check ───────────────────────────────────────────
  const validLines = lines.filter(l => l.item && l.soLuong > 0);
  const tongSL     = validLines.reduce((s, l) => s + l.soLuong, 0);
  const tongTien   = validLines.reduce((s, l) => s + l.soLuong * l.donGia, 0);
  // Nếu đã chọn kho: soLuongTon undefined = chưa có tồn = coi như 0 (thiếu hàng)
  const deficientLines = validLines.filter(l => {
    const ton = l.soLuongTon ?? (fromWarehouseId ? 0 : undefined);
    return ton !== undefined && l.soLuong > ton;
  });
  const stockStatus: "ok" | "insufficient" | "unknown" =
    validLines.length === 0 || !fromWarehouseId ? "unknown" :
    deficientLines.length > 0 ? "insufficient" : "ok";

  // ── Mở modal Tạo yêu cầu mua hàng ────────────────────────────────────────────────
  const [showPRModal, setShowPRModal] = React.useState(false);
  const openPurchaseRequestModal = () => {
    if (!deficientLines.length) return;
    setShowPRModal(true);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const doSave = async () => {
    setSaving(true); setInsufficient([]);
    try {
      const res = await fetch("/api/plan-finance/stock-movements/batch-xuat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId,
          soChungTu:     soChungTu     || undefined,
          lyDo:          lyDo          || undefined,
          nguoiThucHien: nguoiThucHien || undefined,
          lines: validLines.map(l => ({
            inventoryItemId: l.item!.id,
            soLuong:   l.soLuong,
            soLuongYC: l.soLuongYC,
            donGia:    l.donGia    || undefined,
            viTriHang: l.viTriHang || undefined,
            viTriCot:  l.viTriCot  || undefined,
            viTriTang: l.viTriTang || undefined,
            ghiChu:    l.ghiChu   || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.insufficient?.length) {
          setInsufficient(data.insufficient);
          const errMap = new Map<string, number>(data.insufficient.map((x: {inventoryItemId:string;soLuongTon:number}) => [x.inventoryItemId, x.soLuongTon] as [string, number]));
          setLines(ls => ls.map(l => ({
            ...l,
            error: l.item && errMap.has(l.item.id)
              ? `Tồn kho chỉ còn ${(errMap.get(l.item.id) ?? 0).toLocaleString("vi-VN")} ${l.item.donVi ?? ""}`
              : undefined,
          })));
        }
        throw new Error(data.error ?? "Lỗi lưu");
      }
      toast.success("✅ Xuất kho thành công!", `Phiếu ${soChungTu} đã được xác nhận`, 5000);
      setSuccess(true);
      onSaved();
    } catch (e) {
      toast.error("Xuất kho thất bại", e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setSaving(false); }
  };

  const handleSave = () => {
    if (!fromWarehouseId) { toast.error("Thiếu thông tin", "Vui lòng chọn kho xuất"); return; }
    if (!validLines.length) { toast.error("Chưa có hàng hoá", "Cần ít nhất 1 dòng hợp lệ"); return; }
    // Tất cả hàng đều thiếu tồn → không thể xuất, cảnh báo và đóng modal
    if (deficientLines.length === validLines.length && deficientLines.length > 0) {
      toast.error(
        "Không thể xuất kho",
        "Không có bất kỳ mặt hàng nào đủ tồn kho để xuất. Vui lòng bổ sung hàng trước.",
        6000
      );
      onClose();
      return;
    }
    // Một phần thiếu → hỏi xem có muốn xuất thiếu không
    if (stockStatus === "insufficient") { setConfirmOpen(true); return; }
    doSave();
  };

  const locked = success;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: "var(--background)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ═══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, height: 56, borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", alignItems: "center", gap: 14, background: "var(--card)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="bi bi-box-arrow-up" style={{ fontSize: 18, color: "#f59e0b" }} />
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Phiếu xuất kho</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{soChungTu}</p>
        </div>

        {/* Mode toggle */}
        <div style={{ marginLeft: 16, display: "flex", background: "var(--muted)", padding: 3, borderRadius: 9, gap: 2 }}>
          {([
            { val: "manual" as const, label: "Xuất thủ công",        icon: "bi-pencil" },
            { val: "so"     as const, label: "Theo đơn bán hàng",    icon: "bi-bag-check" },
            { val: "wo"     as const, label: "Theo lệnh sản xuất",   icon: "bi-gear" },
          ]).map(m => (
            <button key={m.val} onClick={() => !locked && setMode(m.val)} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 14px", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600,
              cursor: locked ? "not-allowed" : "pointer", transition: "all 0.15s",
              background: mode === m.val ? "var(--card)"  : "transparent",
              color:      mode === m.val ? "var(--foreground)" : "var(--muted-foreground)",
              boxShadow:  mode === m.val ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>
              <i className={`bi ${m.icon}`} style={{ fontSize: 12 }} />
              {m.label}
            </button>
          ))}
        </div>

        {/* SO select — ngay trong top bar khi mode = so */}
        {mode === "so" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 10 }}>
            {listLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground)", padding: "0 10px" }}>
                <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang tải…
              </div>
            ) : (
              <select
                value={selectedSo?.id ?? ""}
                onChange={e => !locked && onSelectSo(e.target.value)}
                style={{
                  height: 34, padding: "0 12px",
                  border: `1.5px solid ${selectedSo ? "rgba(245,158,11,0.6)" : "var(--border)"}`,
                  borderRadius: 8,
                  background: selectedSo ? "rgba(245,158,11,0.06)" : "var(--muted)",
                  color: selectedSo ? "#f59e0b" : "var(--foreground)",
                  fontSize: 13, fontWeight: selectedSo ? 700 : 400,
                  outline: "none", cursor: locked ? "not-allowed" : "pointer",
                  minWidth: 260, maxWidth: 380, transition: "all 0.15s",
                }}
              >
                <option value="">-- Chọn đơn bán hàng / hợp đồng --</option>
                {saleOrders.length === 0 && <option disabled value="">Không có đơn đang thực hiện</option>}
                {/* Group by type */}
                {(["contract", "sale-order", "retail-invoice"] as const).map(type => {
                  const group = saleOrders.filter(s => s.type === type);
                  if (!group.length) return null;
                  const groupLabel = group[0].typeLabel;
                  return (
                    <optgroup key={type} label={`— ${groupLabel} —`}>
                      {group.map(so => (
                        <option key={so.id} value={so.id}>
                          {so.code ?? so.id}
                          {so.customer ? ` — ${so.customer}` : ""}
                          {so.tongTien ? ` (${so.tongTien.toLocaleString("vi-VN")}₫)` : ""}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            )}
            {selectedSo && (
              <span style={{
                fontSize: 11.5, color: "var(--muted-foreground)", fontStyle: "italic",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <i className="bi bi-check-circle-fill" style={{ color: "#10b981", fontSize: 12 }} />
                Đã chọn {selectedSo.typeLabel?.toLowerCase()}
              </span>
            )}
          </div>
        )}

        {/* WO select — ngay trong top bar khi mode = wo */}
        {mode === "wo" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 10 }}>
            <select
              value={selectedWo?.id ?? ""}
              onChange={e => !locked && onSelectWo(e.target.value)}
              style={{
                height: 34, padding: "0 12px",
                border: `1.5px solid ${selectedWo ? "rgba(99,102,241,0.6)" : "var(--border)"}`,
                borderRadius: 8,
                background: selectedWo ? "rgba(99,102,241,0.06)" : "var(--muted)",
                color: selectedWo ? "#6366f1" : "var(--foreground)",
                fontSize: 13, fontWeight: selectedWo ? 700 : 400,
                outline: "none", cursor: locked ? "not-allowed" : "pointer",
                minWidth: 240, maxWidth: 360, transition: "all 0.15s",
              }}
            >
              <option value="">-- Chọn lệnh sản xuất --</option>
              {workOrders.length === 0 && <option disabled value="">Chưa có lệnh sản xuất</option>}
              {workOrders.map(wo => (
                <option key={wo.id} value={wo.id}>{wo.code ?? wo.id}{wo.tenLenhSX ? ` — ${wo.tenLenhSX}` : ""}</option>
              ))}
            </select>
            {selectedWo && (
              <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, background: "rgba(99,102,241,0.1)", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>
                <i className="bi bi-check-circle-fill" style={{ marginRight: 4 }} />Đã chọn
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {success && (
            <button onClick={() => setShowPreview(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderWidth: "1.5px", borderStyle: "solid", borderColor: "#f59e0b", background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>
              <i className="bi bi-printer" style={{ fontSize: 14 }} /> In phiếu xuất kho
            </button>
          )}
          {!success && (() => {
            const canSave = !saving && validLines.length > 0 && !!fromWarehouseId
              && !(mode === "so" && !selectedSo)
              && !(mode === "wo" && !selectedWo);
            return (
              <button onClick={handleSave} disabled={!canSave} title={
                mode === "so" && !selectedSo ? "Vui lòng chọn đơn bán hàng" :
                mode === "wo" && !selectedWo ? "Vui lòng chọn lệnh sản xuất" :
                validLines.length === 0 ? "Chưa có hàng hoá" : undefined
              } style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 20px", border: "none", borderRadius: 8,
                background: canSave ? "#f59e0b" : "var(--muted)",
                color: canSave ? "#fff" : "var(--muted-foreground)",
                fontSize: 13, fontWeight: 700,
                cursor: canSave ? "pointer" : "not-allowed",
                opacity: canSave ? 1 : 0.6, transition: "all 0.15s",
              }}>
                {saving
                  ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />
                  : <i className="bi bi-check2-all" style={{ fontSize: 14 }} />}
                Xác nhận xuất kho
              </button>
            );
          })()}
          <button onClick={onClose} style={{ width: 34, height: 34, borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)", background: "var(--muted)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* ═══ BODY ═════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SIDEBAR TRÁI ────────────────────────────────────────────────── */}
        <div style={{ width: 272, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--card)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>

            {/* Header nhóm */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-receipt" style={{ fontSize: 13, color: "#f59e0b" }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 13 }}>Thông tin phiếu</span>
            </div>

            {/* Số phiếu — readOnly monospace */}
            <div>
              <label style={CSS.label}>Số phiếu xuất</label>
              <input value={soChungTu} readOnly style={{ ...CSS.input, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "default", fontFamily: "monospace", fontSize: 12 }} />
            </div>

            {/* Ngày xuất + lock toggle */}
            <div>
              <label style={CSS.label}>Ngày xuất kho</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="date"
                  value={ngayXuat}
                  min={lockDate ? new Date().toISOString().slice(0,10) : undefined}
                  max={lockDate ? new Date().toISOString().slice(0,10) : undefined}
                  onChange={e => !lockDate && !locked && setNgayXuat(e.target.value)}
                  readOnly={lockDate || locked}
                  style={{ ...CSS.input, flex: 1, cursor: (lockDate || locked) ? "not-allowed" : "text", opacity: (lockDate || locked) ? 0.7 : 1, background: (lockDate || locked) ? "var(--muted)" : CSS.input.background }}
                />
                {/* iOS-style toggle */}
                {!locked && (
                  <span onClick={() => setLockDate(v => !v)} title={lockDate ? "Khoá ngày hôm nay — nhấn để mở" : "Đang mở — nhấn để khoá"}
                    style={{ position: "relative", display: "inline-block", width: 34, height: 18, borderRadius: 9, flexShrink: 0, background: lockDate ? "#f59e0b" : "var(--border)", transition: "background 0.2s", cursor: "pointer" }}>
                    <span style={{ position: "absolute", top: 2, left: lockDate ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
                  </span>
                )}
              </div>
            </div>

            {/* Kho xuất */}
            <div>
              <label style={CSS.label}>Kho xuất <span style={{ color: "#f43f5e" }}>*</span></label>
              <select value={fromWarehouseId} onChange={e => !locked && setFromWarehouseId(e.target.value)} disabled={locked}
                style={{ ...CSS.input, appearance: "none", borderColor: fromWarehouseId ? "rgba(245,158,11,0.5)" : "var(--border)", opacity: locked ? 0.65 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
                <option value="">-- Chọn kho --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ""}</option>)}
              </select>
            </div>

            {/* Người thực hiện */}
            <div>
              <label style={CSS.label}>Người thực hiện</label>
              <input value={nguoiThucHien} onChange={e => !locked && setNguoiThucHien(e.target.value)} readOnly={locked}
                placeholder="Tên người xuất kho"
                style={{ ...CSS.input, opacity: locked ? 0.65 : 1, cursor: locked ? "default" : "text" }} />
            </div>

            {/* Lý do — textarea */}
            <div>
              <label style={CSS.label}>Lý do xuất kho</label>
              <textarea value={lyDo} onChange={e => !locked && setLyDo(e.target.value)} readOnly={locked} rows={2}
                style={{ ...CSS.input, resize: locked ? "none" : "vertical", lineHeight: 1.5, opacity: locked ? 0.65 : 1, cursor: locked ? "default" : "text" }} />
            </div>

            {/* Ghi chú — chiếm hết không gian còn lại */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <label style={CSS.label}>Ghi chú</label>
              <textarea value={ghiChu} onChange={e => !locked && setGhiChu(e.target.value)} readOnly={locked}
                placeholder="Ghi chú thêm..."
                style={{ ...CSS.input, flex: 1, resize: "none", lineHeight: 1.5, opacity: locked ? 0.65 : 1, cursor: locked ? "default" : "text" }} />
            </div>

            {/* Cảnh báo thiếu tồn */}
            {insufficientItems.length > 0 && (
              <div style={{ padding: 10, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 700, color: "#f43f5e" }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 4 }} />Thiếu tồn kho
                </p>
                {insufficientItems.map(x => (
                  <p key={x.inventoryItemId} style={{ margin: "2px 0", fontSize: 11, color: "var(--foreground)" }}>
                    • {x.tenHang}: cần <b>{x.soLuong}</b>, còn <b style={{ color: "#f43f5e" }}>{x.soLuongTon}</b>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── TABLE AREA ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: !fromWarehouseId ? "hidden" : "auto", padding: "16px 20px 24px", position: "relative" }}>

          {/* Overlay khi chưa chọn kho */}
          {!fromWarehouseId && (
            <div style={{ position: "absolute", inset: 0, zIndex: 10, backdropFilter: "blur(3px)", background: "color-mix(in srgb, var(--background) 60%, transparent)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-lock-fill" style={{ fontSize: 24, color: "#f59e0b" }} />
              </div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Chưa chọn kho xuất</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
                Vui lòng chọn kho xuất trong bảng bên trái<br />để mở khu vực nhập hàng hoá.
              </p>
            </div>
          )}

          {/* Tiêu đề bảng + tổng */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Danh sách hàng hoá xuất kho</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 20, padding: "2px 10px" }}>
              {lines.length} dòng
            </span>
            {mode === "so" && selectedSo && (
              <span style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.1)", borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>
                <i className="bi bi-link-45deg" /> Từ SO: {selectedSo.code}
              </span>
            )}
            {mode === "wo" && selectedWo && (
              <span style={{ fontSize: 11, color: "#6366f1", background: "rgba(99,102,241,0.1)", borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>
                <i className="bi bi-link-45deg" /> Từ lệnh: {selectedWo.code}
              </span>
            )}

            {validLines.length > 0 && stockStatus !== "unknown" && (
              <TrangThaiTonKhoBadge
                items={validLines.map(l => ({
                  ten: l.item?.tenHang ?? "",
                  soLuong: l.soLuong,
                  soLuongTon: l.soLuongTon,
                }))}
                showPurchaseRequest={!locked}
                onCreatePR={openPurchaseRequestModal}
              />
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tổng SL</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b", lineHeight: 1.2 }}>{tongSL.toLocaleString("vi-VN")}</div>
              </div>
              <div style={{ width: 1, height: 28, background: "var(--border)" }} />
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Giá trị</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b", lineHeight: 1.2 }}>{fmtVnd(tongTien)}</div>
              </div>
            </div>
          </div>

          {/* Table header — 2 dòng */}
          <div style={{ background: "var(--muted)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
            {/* Dòng 1 — group labels */}
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 60px 160px 180px 110px 110px 32px", gap: 5, padding: "6px 10px 0", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <div>#</div>
              <div>Hàng hoá</div>
              <div style={{ textAlign: "center" }}>ĐVT</div>
              <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>Số lượng</div>
              <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>Vị trí trong kho</div>
              <div style={{ textAlign: "right" }}>Đơn giá (₫)</div>
              <div style={{ textAlign: "right" }}>Thành tiền</div>
              <div />
            </div>
            {/* Dòng 2 — sub-labels */}
            <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 5, padding: "2px 10px 6px", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <div /><div /><div />
              <div style={{ textAlign: "center", opacity: 0.75 }}>Yêu cầu</div>
              <div style={{ textAlign: "center", opacity: 0.9 }}>Thực xuất</div>
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
                locked={locked}
              />
            ))}
            <div style={{ padding: "8px 10px", borderTop: "1px dashed var(--border)" }}>
              {!locked ? (
                <button onClick={addLine}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.color = "#f59e0b"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderWidth: "1.5px", borderStyle: "dashed", borderColor: "var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, borderRadius: 7, cursor: "pointer", transition: "all 0.15s" }}>
                  <i className="bi bi-plus-lg" style={{ fontSize: 13 }} /> Thêm dòng hàng hoá
                </button>
              ) : (
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6, padding: "4px 4px" }}>
                  <i className="bi bi-lock-fill" style={{ fontSize: 11, color: "#f59e0b" }} />
                  Danh sách đã khoá sau khi xác nhận xuất kho
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm khi kho thiếu hàng */}
      <ConfirmDialog
        open={confirmOpen}
        variant="warning"
        title="Kho không đủ hàng"
        message={
          <div>
            <p style={{ margin: "0 0 10px" }}>
              Có <strong style={{ color: "#f43f5e" }}>{deficientLines.length} mặt hàng</strong> không đủ tồn kho:
            </p>
            <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 13 }}>
              {deficientLines.map(l => (
                <li key={l.id}>
                  <strong>{l.item?.tenHang}</strong>: cần {l.soLuong}, tồn&nbsp;
                  <span style={{ color: "#f43f5e", fontWeight: 700 }}>{l.soLuongTon ?? 0}</span>
                  {l.item?.donVi ? ` ${l.item.donVi}` : ""}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 12.5 }}>
              Bạn có muốn xuất kho với số lượng hiện có hoặc đợi bổ sung hàng?
            </p>
          </div>
        }
        confirmLabel="Xuất kho ngay"
        cancelLabel="Đợi đủ hàng"
        loading={saving}
        onConfirm={() => { setConfirmOpen(false); doSave(); }}
        onCancel={() => setConfirmOpen(false)}
      />

      {showPreview && (
        <PhieuXuatKhoPreview
          soChungTu={soChungTu}
          ngayXuat={ngayXuat}
          khoName={warehouses.find(w => w.id === fromWarehouseId)?.name ?? "—"}
          lyDo={lyDo || undefined}
          nguoiThucHien={nguoiThucHien || undefined}
          lines={validLines.map(l => ({
            tenHang:   l.item!.tenHang,
            maSku:     l.item!.code,
            donVi:     l.item!.donVi,
            soLuongYC: l.soLuongYC,
            soLuong:   l.soLuong,
            donGia:    l.donGia,
            viTriHang: l.viTriHang || undefined,
            viTriCot:  l.viTriCot  || undefined,
            viTriTang: l.viTriTang || undefined,
            ghiChu:    l.ghiChu   || undefined,
          }))}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Tạo yêu cầu mua hàng — pre-filled với hàng thiếu tồn */}
      {showPRModal && (
        <TaoYeuCauMuaHangModal
          onClose={() => setShowPRModal(false)}
          onSaved={() => {
            setShowPRModal(false);
            toast.success("✅ Đã tạo yêu cầu mua hàng!", "Yêu cầu đã được gửi cho bộ phận mua hàng", 5000);
          }}
          initialData={{
            nguoiYeuCau: nguoiThucHien || "",
            lyDo: `Bổ sung hàng thiếu khi xuất kho ${soChungTu}`,
            lines: deficientLines.map(l => ({
              tenHang: l.item!.tenHang,
              soLuong: Math.max(1, l.soLuong - (l.soLuongTon ?? 0)),
              donVi:   l.item!.donVi ?? undefined,
              ghiChu:  `Xuất ${soChungTu}: thiếu ${l.soLuong - (l.soLuongTon ?? 0)} ${l.item!.donVi ?? ""}`,
            })),
          }}
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
    outline: "none", boxSizing: "border-box", cursor: locked ? "default" : "text",
  };
  const thanhTien = line.soLuong * line.donGia;
  const hasError  = !!line.error;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: GRID,
      gap: 5, padding: "7px 10px",
      borderTop: idx === 0 ? "none" : "1px solid var(--border)",
      alignItems: "center",
      background: hasError ? "rgba(244,63,94,0.04)" : line.item ? "var(--background)" : `color-mix(in srgb, var(--muted) 20%, var(--background))`,
    }}>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 600 }}>{idx+1}</div>

      {/* Item search */}
      <div style={{ position: "relative" }}>
        <input
          value={line.itemSearch}
          onChange={e => !locked && onItemSearch(e.target.value)}
          onFocus={() => { if (line.itemSearch && !locked) onUpdate("showSugg", true); }}
          readOnly={locked}
          placeholder="Tìm hoặc nhập tên hàng..."
          style={{
            ...cellInput, paddingRight: line.item ? 26 : 8,
            borderColor: hasError ? "rgba(244,63,94,0.5)" : line.item ? "rgba(245,158,11,0.4)" : "var(--border)",
          }}
        />
        {line.item && !hasError && <i className="bi bi-check-circle-fill" style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#f59e0b", pointerEvents: "none" }} />}
        {hasError && <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "#f43f5e" }}>{line.error}</p>}
        {line.showSugg && line.suggestions.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, zIndex: 200, background: "var(--card)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 7, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", maxHeight: 180, overflowY: "auto" }}>
            {line.suggestions.map(s => (
              <div key={s.id} onClick={() => onSelectItem(s)}
                style={{ padding: "7px 11px", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.tenHang}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                  {s.code ?? ""} · {s.donVi ?? ""} · {s.giaNhap > 0 ? s.giaNhap.toLocaleString("vi-VN") + " ₫" : "—"}
                  {s.soLuongTon !== undefined && (
                    <span style={{ marginLeft: 8, fontWeight: 700, color: s.soLuongTon > 0 ? "#10b981" : "#f43f5e" }}>
                      Tồn: {s.soLuongTon}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>{line.item?.donVi ?? "—"}</div>

      {/* SL yêu cầu */}
      <input type="number" min={0} value={line.soLuongYC}
        onChange={e => !locked && onUpdate("soLuongYC", Math.max(0, parseFloat(e.target.value)||0))}
        readOnly={locked} title="Số lượng yêu cầu"
        style={{ ...cellInput, textAlign: "center", background: locked ? "var(--muted)" : "color-mix(in srgb, var(--muted) 60%, var(--background))", color: "var(--muted-foreground)" }} />

      {/* SL thực xuất */}
      <input type="number" min={0} value={line.soLuong}
        onChange={e => !locked && onUpdate("soLuong", Math.max(0, parseFloat(e.target.value)||0))}
        readOnly={locked} title="Số lượng thực tế xuất kho"
        style={{
          ...cellInput, textAlign: "center",
          borderColor: hasError ? "rgba(244,63,94,0.5)" : (!locked && line.soLuong !== line.soLuongYC ? "#f59e0b" : "var(--border)"),
          fontWeight:  !locked && line.soLuong !== line.soLuongYC ? 700 : 400,
          color: hasError ? "#f43f5e" : locked ? "var(--muted-foreground)" : line.soLuong !== line.soLuongYC ? "#f59e0b" : "var(--foreground)",
        }} />

      {/* Vị trí */}
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
