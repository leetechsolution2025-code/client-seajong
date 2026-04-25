"use client";
import React from "react";
import { useToast }                  from "@/components/ui/Toast";
import { ConfirmDialog }             from "@/components/ui/ConfirmDialog";
import { TaoYeuCauMuaHangModal }     from "@/components/plan-finance/mua_hang/TaoYeuCauMuaHangModal";
import { FilterSelect }              from "@/components/ui/FilterSelect";
import { SearchInput }               from "@/components/ui/SearchInput";
import { genDocCode }                from "@/lib/genDocCode";
import { BaoCaoKiemKhoPreview }      from "@/components/plan-finance/kho_hang/BaoCaoKiemKhoPreview";
import { TheKhoModal }               from "@/components/plan-finance/kho_hang/TheKhoModal";
import { LichSuKiemKhoModal }        from "@/components/plan-finance/kho_hang/LichSuKiemKhoModal";
import { BangKeXuatNhapTonModal }    from "@/components/plan-finance/kho_hang/BangKeXuatNhapTonModal";
import { BangKeNhapKhoModal }        from "@/components/plan-finance/kho_hang/BangKeNhapKhoModal";
import { BangKeXuatKhoModal }        from "@/components/plan-finance/kho_hang/BangKeXuatKhoModal";
import type { BaoCaoKiemKhoLine }    from "@/components/plan-finance/kho_hang/BaoCaoKiemKhoPreview";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Warehouse { id: string; code: string | null; name: string; isActive: boolean; }

interface StockRow {
  inventoryItemId: string;
  tenHang:         string;
  maSku:           string | null;
  donVi:           string | null;
  giaNhap:         number;
  soLuongHeTong:   number;
  soLuongMin:      number;
  soLuongThucTe:   number | "";   // "" = chưa nhập
  trangThai:       string;
  categoryId:      string | null;
  categoryName:    string | null;
  thongSoKyThuat:  string | null;
  warehouseId?:    string;
  warehouseName?:  string;
  viTriHang?:      string | null;
  viTriCot?:       string | null;
  viTriTang?:      string | null;
  ghiChu:          string;
  chuaPhanKho:     boolean;  // true = chưa từng có trong kho nào (toàn HT)
}

type FilterTab = "all" | "match" | "under" | "over" | "belowMin" | "noWarehouse";

interface KiemKhoModalProps { onClose: () => void; onSaved: () => void; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const genSoPhieu = () => genDocCode("KK");
const fmtN  = (n: number) => n.toLocaleString("vi-VN");
const fmtVnd = (n: number) => n !== 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";
const today  = () => new Date().toISOString().slice(0, 10);

const CSS = {
  label: { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 5 } as React.CSSProperties,
  input: { width: "100%", padding: "8px 11px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
};

const statusOf = (row: StockRow): "unknown" | "match" | "under" | "over" => {
  if (row.soLuongThucTe === "") return "unknown";
  const tt = row.soLuongThucTe as number;
  if (tt === row.soLuongHeTong) return "match";
  return tt < row.soLuongHeTong ? "under" : "over";
};

const isBelowMin = (row: StockRow) => {
  const tt = row.soLuongThucTe === "" ? row.soLuongHeTong : row.soLuongThucTe as number;
  return row.soLuongMin > 0 && tt < row.soLuongMin;
};

// ── Breakpoint hook ───────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = React.useState<"desktop" | "tablet" | "phone">("desktop");
  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "phone" : w < 1200 ? "tablet" : "desktop");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function KiemKhoModal({ onClose, onSaved }: KiemKhoModalProps) {
  const toast    = useToast();
  const toastRef  = React.useRef(toast);
  React.useEffect(() => { toastRef.current = toast; });

  // ── State ────────────────────────────────────────────────────────────────────
  const [soChungTu, setSoChungTu]   = React.useState(genSoPhieu);
  const [ngayKiem, setNgayKiem]       = React.useState(today);
  const [lockDate, setLockDate]       = React.useState(true);
  const [nguoiKiem, setNguoiKiem]     = React.useState("");
  const [ghiChu,   setGhiChu]         = React.useState("");
  const [scope, setScope]             = React.useState<"system" | "warehouse">("system");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [warehouses, setWarehouses]   = React.useState<Warehouse[]>([]);
  const [rows,    setRows]            = React.useState<StockRow[]>([]);
  const [loading, setLoading]         = React.useState(false);
  const [saving,  setSaving]          = React.useState(false);
  const [savingDraft,  setSavingDraft]  = React.useState(false);
  const [draftId,      setDraftId]      = React.useState<string | null>(null);
  const [draftBanner,  setDraftBanner]  = React.useState<{ id: string; soChungTu: string | null; updatedAt: string } | null>(null);
  const [loadingDraft, setLoadingDraft] = React.useState(false);
  const [showBaoCao,   setShowBaoCao]   = React.useState(false);
  const [showTheKho,   setShowTheKho]   = React.useState<{ inventoryItemId: string; warehouseId?: string; warehouseName?: string } | null>(null);
  const [savedLines,   setSavedLines]   = React.useState<BaoCaoKiemKhoLine[]>([]);
  // Lines đã lưu sẽ được apply vào rows sau khi snapshot tải xong
  const pendingDraftLinesRef = React.useRef<{ inventoryItemId: string; warehouseId: string | null; soLuongThucTe: number | null; ghiChu: string | null }[]>([]);
  const [success, setSuccess]         = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [filterTab, setFilterTab]     = React.useState<FilterTab>("all");
  const [showPRModal,   setShowPRModal]   = React.useState(false);
  const [showLichSu,    setShowLichSu]    = React.useState(false);
  const [showBaoCaoMenu, setShowBaoCaoMenu] = React.useState(false);
  const [baoCaoType,     setBaoCaoType]    = React.useState<"the-kho" | "xuat-nhap-ton" | "nhap-kho" | "xuat-kho" | null>(null);
  const baoCaoMenuRef = React.useRef<HTMLDivElement>(null);
  const [assignPopover, setAssignPopover] = React.useState<{ itemId: string; top: number; left: number } | null>(null);
  const [assigning, setAssigning]         = React.useState<string | null>(null); // itemId đang xữ lý

  // Filter cục bộ (category / status / search)
  const [categories, setCategories]   = React.useState<{ id: string; name: string }[]>([]);
  const [filterCat,  setFilterCat]    = React.useState("");
  const [filterSt,   setFilterSt]     = React.useState("");
  const [searchQ,    setSearchQ]      = React.useState("");

  const locked = success;
  const bp = useBreakpoint();
  const isPhone  = bp === "phone";
  const isTablet = bp === "tablet";
  const isMobile = isPhone || isTablet;  // phone hoặc tablet
  const [sidebarOpen, setSidebarOpen] = React.useState(false); // tablet: bottom sheet; phone: not used

  // ── Load warehouses + categories ────────────────────────────────────────────
  React.useEffect(() => {
    fetch("/api/plan-finance/warehouses")
      .then(r => r.json())
      .then((d: unknown) => {
        const arr: Warehouse[] = Array.isArray(d) ? d : (d as { items?: Warehouse[] }).items ?? [];
        setWarehouses(arr.filter(w => w.isActive));
      }).catch(() => {});

    fetch("/api/plan-finance/inventory/categories")
      .then(r => r.json())
      .then((d: { id: string; name: string }[]) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Auto-detect bản nháp — chỉ khi scope=warehouse và đã chọn kho
  React.useEffect(() => {
    // Không hiện banner khi toàn hệ thống hoặc chưa chọn kho
    if (scope !== "warehouse" || !warehouseId) {
      setDraftBanner(null);
      return;
    }
    fetch("/api/plan-finance/stock-counts?trangThai=nhap")
      .then(r => r.json())
      .then((list: { id: string; soChungTu: string | null; updatedAt: string; scope: string; warehouseId: string | null }[]) => {
        if (!Array.isArray(list) || list.length === 0) return;
        // Chỉ ghi nhận nếu draft thuộc đúng kho đang chọn
        const match = list.find(d => d.scope === "warehouse" && d.warehouseId === warehouseId);
        if (match) setDraftBanner({ id: match.id, soChungTu: match.soChungTu, updatedAt: match.updatedAt });
        else        setDraftBanner(null);
      }).catch(() => {});
  }, [scope, warehouseId]);

  const loadDraft = async (id: string) => {
    setLoadingDraft(true);
    try {
      const res  = await fetch(`/api/plan-finance/stock-counts/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không tải được");
      // Apply thông tin phiếu
      if (data.soChungTu) setSoChungTu(data.soChungTu);
      if (data.nguoiKiem) setNguoiKiem(data.nguoiKiem);
      if (data.ngayKiem)  setNgayKiem(data.ngayKiem.slice(0, 10));
      if (data.ghiChu)    setGhiChu(data.ghiChu);
      if (data.scope)     setScope(data.scope as "system" | "warehouse");
      if (data.warehouseId) setWarehouseId(data.warehouseId);
      setDraftId(id);
      setDraftBanner(null);
      // Lưu lines vào ref — được apply vào rows ngay khi loadSnapshot chạy
      pendingDraftLinesRef.current = data.lines;
      // Gọi loadSnapshotRef (always latest) — kông dùng setTimeout để tránh stale closure
      loadSnapshotRef.current();
      toast.success("✅ Đã tải bản nháp!", `${data.soChungTu ?? id} — Tiếp tục kiểm kho`);
    } catch (e) {
      toast.error("Lỗi tải nháp", e instanceof Error ? e.message : "Lỗi");
    } finally { setLoadingDraft(false); }
  };

  // Đóng popover khi click ngoài
  React.useEffect(() => {
    if (!assignPopover) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".assign-popover")) setAssignPopover(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [assignPopover]);

  // Phân kho nhanh
  const assignToWarehouse = async (inventoryItemId: string, targetWarehouseId: string) => {
    setAssigning(inventoryItemId);
    try {
      const res  = await fetch("/api/plan-finance/inventory/assign-warehouse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId, warehouseId: targetWarehouseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi");
      // Cập nhật row: bỏ chuaPhanKho, gán warehouseId + soLuong mới
      setRows(rs => rs.map(r =>
        r.inventoryItemId === inventoryItemId
          ? { ...r, chuaPhanKho: false, warehouseId: data.warehouseId, warehouseName: data.warehouseName, soLuongHeTong: data.soLuong, soLuongMin: Math.max(r.soLuongMin, data.soLuongMin) }
          : r
      ));
      toast.success("✅ Đã phân kho!", `Hàng hoá đã được thêm vào ${data.warehouseName}`);
    } catch (e) {
      toast.error("Lỗi phân kho", e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setAssigning(null);
      setAssignPopover(null);
    }
  };

  // ── Load stock snapshot ─────────────────────────────────────────────────────
  const loadSnapshotRef = React.useRef<() => Promise<void>>(async () => {});

  const loadSnapshot = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = scope === "warehouse" && warehouseId
        ? `/api/plan-finance/inventory/stock-snapshot?warehouseId=${warehouseId}`
        : `/api/plan-finance/inventory/stock-snapshot`;
      const data: StockRow[] = await fetch(url).then(r => r.json());
      const mapped = data.map(r => ({ ...r, soLuongThucTe: "", ghiChu: "", chuaPhanKho: r.chuaPhanKho ?? false, thongSoKyThuat: r.thongSoKyThuat ?? null })) as StockRow[];
      // Apply dữ liệu từ bản nháp đã lưu (nếu có)
      const pending = pendingDraftLinesRef.current;
      if (pending.length > 0) {
        pending.forEach(saved => {
          const idx = mapped.findIndex(r => r.inventoryItemId === saved.inventoryItemId && (r.warehouseId ?? null) === (saved.warehouseId ?? null));
          if (idx !== -1) {
            mapped[idx].soLuongThucTe = saved.soLuongThucTe ?? "";
            mapped[idx].ghiChu       = saved.ghiChu       ?? "";
          }
        });
        pendingDraftLinesRef.current = [];
      }
      setRows(mapped);
    } catch {
      toastRef.current.error("Lỗi", "Không thể tải danh sách hàng hoá");
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, warehouseId]); // ✔ không có toast — dùng toastRef tránh re-trigger

  // Always keep ref up-to-date
  React.useEffect(() => { loadSnapshotRef.current = loadSnapshot; }, [loadSnapshot]);

  React.useEffect(() => {
    if (scope === "system" || (scope === "warehouse" && warehouseId)) {
      loadSnapshot();
    } else {
      setRows([]);
    }
  }, [scope, warehouseId, loadSnapshot]);

  // ── Update row ───────────────────────────────────────────────────────────────
  const updateRow = (itemId: string, wId: string | undefined, key: keyof StockRow, val: StockRow[keyof StockRow]) => {
    setRows(rs => rs.map(r =>
      r.inventoryItemId === itemId && (wId === undefined || r.warehouseId === wId)
        ? { ...r, [key]: val }
        : r
    ));
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const entered      = rows.filter(r => r.soLuongThucTe !== "" && !r.chuaPhanKho);
  const matchRows    = entered.filter(r => statusOf(r) === "match");
  const underRows    = entered.filter(r => statusOf(r) === "under");
  const overRows     = entered.filter(r => statusOf(r) === "over");
  const belowMinRows = rows.filter(r => !r.chuaPhanKho && isBelowMin(r));
  const noWhRows     = rows.filter(r => r.chuaPhanKho);

  const tongHaoHut = underRows.reduce((s, r) => s + ((r.soLuongHeTong - (r.soLuongThucTe as number)) * r.giaNhap), 0);
  const tongThua   = overRows.reduce((s, r)  => s + (((r.soLuongThucTe as number) - r.soLuongHeTong) * r.giaNhap), 0);

  // Filter tab (khop / thieu / thua / belowMin)
  const filteredRows = rows.filter(r => {
    const tabOk =
      filterTab === "all"         ? true :
      filterTab === "match"       ? statusOf(r) === "match" :
      filterTab === "under"       ? statusOf(r) === "under" :
      filterTab === "over"        ? statusOf(r) === "over"  :
      filterTab === "belowMin"    ? isBelowMin(r) :
      filterTab === "noWarehouse" ? r.chuaPhanKho : true;
    const catOk    = !filterCat || r.categoryId === filterCat;
    const stOk     = !filterSt  || r.trangThai === filterSt;
    const q        = searchQ.toLowerCase();
    const searchOk = !q || r.tenHang.toLowerCase().includes(q) || (r.maSku ?? "").toLowerCase().includes(q);
    return tabOk && catOk && stOk && searchOk;
  });

  // ── Save ─────────────────────────────────────────────────────────────────────
  const doSave = async () => {
    setSaving(true);
    try {
      const lines = entered.map(r => ({
        inventoryItemId: r.inventoryItemId,
        warehouseId:     (r.warehouseId ?? warehouseId) || undefined,
        soLuongThucTe:   r.soLuongThucTe as number,
        soLuongHeTong:   r.soLuongHeTong,
        ghiChu:          r.ghiChu || undefined,
      })).filter(l => l.warehouseId);

      const res = await fetch("/api/plan-finance/stock-movements/batch-kiem-kho", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: warehouseId || undefined, soChungTu, nguoiKiem, ngayKiem, ghiChu, lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi lưu");

      // Lưu phiếu hoàn thành vào DB (để xem lịch sử sau này)
      // Nếu có draft → update thành hoan-thanh + ghi đủ lines
      // Nếu không có draft → tạo mới record hoan-thanh
      const allLinesForHistory = rows.map(r => ({
        inventoryItemId: r.inventoryItemId,
        warehouseId:     r.warehouseId ?? (warehouseId || undefined),
        soLuongHeTong:   r.soLuongHeTong,
        soLuongThucTe:   r.soLuongThucTe === "" ? null : r.soLuongThucTe as number,
        chenh:           r.soLuongThucTe === "" ? null : (r.soLuongThucTe as number) - r.soLuongHeTong,
        ghiChu:          r.ghiChu || undefined,
      }));
      await fetch("/api/plan-finance/stock-counts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:          draftId || undefined,   // update nếu có draft, tạo mới nếu không
          soChungTu, scope, warehouseId: warehouseId || undefined,
          nguoiKiem, ngayKiem, ghiChu,
          trangThai:   "hoan-thanh",
          lines:       allLinesForHistory,
        }),
      });
      setDraftId(null);
      toast.success("✅ Kiểm kho hoàn tất!", `Đã điều chỉnh ${data.adjustedCount} mặt hàng chênh lệch`, 5000);
      // Lưu lại danh sách và tự động mở báo cáo
      const saved = rows.map(r => ({
        inventoryItemId: r.inventoryItemId,
        tenHang:         r.tenHang,
        maSku:           r.maSku,
        category:        r.categoryName,
        donVi:           r.donVi,
        soLuongHeTong:   r.soLuongHeTong,
        soLuongThucTe:   r.soLuongThucTe,
        chenh:           r.soLuongThucTe === "" ? 0 : (r.soLuongThucTe as number) - r.soLuongHeTong,
        giaNhap:         r.giaNhap,
        ghiChu:          r.ghiChu,
        chuaPhanKho:     r.chuaPhanKho,
      }));
      setSavedLines(saved);
      setSuccess(true);
      setShowBaoCao(true);   // ← tự động mở báo cáo; onSaved() sẽ được gọi khi user đóng báo cáo
    } catch (e) {
      toast.error("Lỗi kiểm kho", e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setSaving(false); }
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const allLines = rows.filter(r => !r.chuaPhanKho).map(r => ({
        inventoryItemId: r.inventoryItemId,
        warehouseId:     r.warehouseId ?? (warehouseId || undefined),
        soLuongHeTong:   r.soLuongHeTong,
        soLuongThucTe:   r.soLuongThucTe === "" ? null : r.soLuongThucTe as number,
        chenh:           r.soLuongThucTe === "" ? null : (r.soLuongThucTe as number) - r.soLuongHeTong,
        ghiChu:          r.ghiChu || undefined,
      }));
      const res = await fetch("/api/plan-finance/stock-counts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draftId, soChungTu, scope, warehouseId: warehouseId || undefined, nguoiKiem, ngayKiem, ghiChu, trangThai: "nhap", lines: allLines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi lưu nháp");
      if (!draftId) setDraftId(data.id);
      toast.success("💾 Đã lưu nháp!", `${soChungTu} — Đã lưu ${entered.length} dòng`, 4000);
    } catch (e) {
      toast.error("Lỗi lưu nháp", e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setSavingDraft(false); }
  };

  const totalCountable = rows.length;
  const handleSave = () => {
    if (!entered.length) { toast.error("Chưa nhập số liệu", "Cần nhập ít nhất 1 số lượng thực tế"); return; }
    setConfirmOpen(true);
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, saving]);

  const gridCols = scope === "warehouse"
    ? "28px 1fr 110px 55px 80px 60px 80px 80px 90px 32px"
    : "28px 1fr 110px 55px 1fr 80px 60px 80px 80px 90px 32px";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: "var(--background)", display: "flex", flexDirection: "column", overflow: "hidden" }}>


      {/* ═══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, minHeight: isPhone ? 52 : 56, borderBottom: "1px solid var(--border)", padding: isPhone ? "0 12px" : "0 24px", display: "flex", alignItems: "center", gap: isPhone ? 8 : 14, background: "var(--card)" }}>
        <div style={{ width: isPhone ? 30 : 36, height: isPhone ? 30 : 36, borderRadius: 10, background: "rgba(14,165,233,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="bi bi-clipboard-check" style={{ fontSize: isPhone ? 15 : 18, color: "#0ea5e9" }} />
        </div>
        <div style={{ flex: isPhone ? 1 : undefined, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: isPhone ? 13 : 15, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isPhone ? "Kiểm kho" : "Phiếu kiểm kê kho"}</p>
          {!isPhone && <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{soChungTu}</p>}
        </div>

        {/* Scope toggle — desktop only */}
        {!isMobile && (
          <div style={{ marginLeft: 20, display: "flex", gap: 0, borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden", fontSize: 12 }}>
            {(["system", "warehouse"] as const).map((s, i) => (
              <button key={s} onClick={() => !locked && setScope(s)} disabled={locked}
                style={{ padding: "5px 12px", border: "none", borderLeft: i > 0 ? "1px solid var(--border)" : "none", background: scope === s ? "#0ea5e9" : "var(--card)", color: scope === s ? "#fff" : "var(--foreground)", fontWeight: scope === s ? 700 : 400, cursor: locked ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                {s === "system" ? "🌐 Toàn hệ thống" : "🏭 Từng kho"}
              </button>
            ))}
          </div>
        )}

        {/* Warehouse select — desktop inline */}
        {scope === "warehouse" && !isMobile && (
          <select value={warehouseId} onChange={e => !locked && setWarehouseId(e.target.value)} disabled={locked}
            style={{ padding: "5px 10px", borderRadius: 7, border: `1.5px solid ${warehouseId ? "rgba(14,165,233,0.5)" : "var(--border)"}`, background: "var(--card)", color: "var(--foreground)", fontSize: 13, cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.7 : 1 }}>
            <option value="">— Chọn kho —</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ""}</option>)}
          </select>
        )}

        {/* Nút Lịch sử + Báo cáo — desktop only */}
        {!isMobile && scope === "warehouse" && warehouseId && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowLichSu(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid var(--border)", background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: "pointer" }}>
              <i className="bi bi-clock-history" style={{ fontSize: 12 }} /> Lịch sử
            </button>
            <div ref={baoCaoMenuRef} style={{ position: "relative" }}>
              <button onClick={() => setShowBaoCaoMenu(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.07)", color: "#6366f1", fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: "pointer" }}>
                <i className="bi bi-file-earmark-bar-graph" style={{ fontSize: 12 }} /> Báo cáo
                <i className="bi bi-chevron-down" style={{ fontSize: 10, marginLeft: 2 }} />
              </button>
              {showBaoCaoMenu && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setShowBaoCaoMenu(false)} />
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", minWidth: 220, zIndex: 9999, overflow: "hidden", padding: "4px 0" }}>
                    {([
                      { key: "the-kho",      icon: "bi-journal-bookmark",       label: "Thẻ kho" },
                      { key: "xuat-nhap-ton", icon: "bi-table",                  label: "Bảng kê Xuất - Nhập - Tồn" },
                      { key: "nhap-kho",     icon: "bi-box-arrow-in-down-right", label: "Bảng kê Nhập kho" },
                      { key: "xuat-kho",     icon: "bi-box-arrow-up-right",      label: "Bảng kê Xuất kho" },
                    ] as const).map(item => (
                      <button key={item.key} onClick={() => { setBaoCaoType(item.key); setShowBaoCaoMenu(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 16px", border: "none", background: "transparent", color: "var(--foreground)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <i className={`bi ${item.icon}`} style={{ fontSize: 14, color: "#6366f1", width: 18, textAlign: "center" }} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: isPhone ? 6 : 8, alignItems: "center" }}>
          {/* Mobile: toggle sidebar panel */}
          {isMobile && (
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", border: `1px solid ${sidebarOpen ? "rgba(14,165,233,0.5)" : "var(--border)"}`, background: sidebarOpen ? "rgba(14,165,233,0.08)" : "var(--muted)", borderRadius: 8, fontSize: 12, fontWeight: 600, color: sidebarOpen ? "#0ea5e9" : "var(--muted-foreground)", cursor: "pointer" }}>
              <i className="bi bi-info-circle" style={{ fontSize: 13 }} />
              {isTablet && " Chi tiết"}
            </button>
          )}

          {success ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(16,185,129,0.1)", borderRadius: 8, color: "#10b981", fontSize: isPhone ? 11 : 13, fontWeight: 700 }}>
                <i className="bi bi-check-circle-fill" /> {isPhone ? "Xong!" : "Kiểm kho thành công!"}
              </div>
              {!isPhone && (
                <button onClick={() => setShowBaoCao(true)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", border: "1px solid #6366f1", background: "rgba(99,102,241,0.08)", color: "#6366f1", fontSize: 12.5, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>
                  <i className="bi bi-file-earmark-bar-graph" /> Báo cáo kiểm kho
                </button>
              )}
            </div>
          ) : (
            <>
              {!isPhone && (
                <button onClick={saveDraft} disabled={savingDraft || locked || rows.length === 0}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", border: "1px solid var(--border)", background: "var(--card)", color: draftId ? "#10b981" : "var(--foreground)", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: (savingDraft || locked || rows.length === 0) ? "not-allowed" : "pointer", opacity: (savingDraft || locked || rows.length === 0) ? 0.5 : 1 }}>
                  {savingDraft ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : draftId ? <i className="bi bi-cloud-check-fill" style={{ color: "#10b981" }} /> : <i className="bi bi-floppy" />}
                  {savingDraft ? "Lưu..." : "Lưu nháp"}
                </button>
              )}
              {!isMobile && scope === "warehouse" && warehouseId && (
                <button onClick={handleSave} disabled={saving || locked || loading || entered.length === 0}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 20px", border: "none", background: (saving || locked || loading || entered.length === 0) ? "var(--muted)" : "#0ea5e9", color: (saving || locked || loading || entered.length === 0) ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: (saving || locked || loading || entered.length === 0) ? "not-allowed" : "pointer" }}>
                  {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-clipboard-check" />}
                  {saving ? "Xử lý…" : "Xác nhận kiểm kho"}
                </button>
              )}
            </>
          )}
          <button onClick={onClose} disabled={saving}
            style={{ width: isPhone ? 32 : 34, height: isPhone ? 32 : 34, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--muted)", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* ═══ BODY ══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>


        {/* ── MOBILE: overlay sidebar ──────────────────────────────────────── */}
        {isMobile && sidebarOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 8000, display: "flex" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setSidebarOpen(false)} />
            <div style={{ position: "relative", width: isPhone ? "90vw" : 300, maxWidth: 360, height: "100%", background: "var(--card)", display: "flex", flexDirection: "column", overflowY: "auto", zIndex: 1 }}>
              <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Thông tin phiếu</p>
                <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "2px 6px" }}><i className="bi bi-x" style={{ fontSize: 18 }} /></button>
              </div>
            {/* Số phiếu */}
            <div>
              <label style={CSS.label}>Số phiếu kiểm</label>
              <input value={soChungTu} readOnly style={{ ...CSS.input, background: "var(--muted)", fontFamily: "monospace", fontSize: 12, color: "var(--muted-foreground)", cursor: "default" }} />
            </div>

            {/* Ngày kiểm + lock */}
            <div>
              <label style={CSS.label}>Ngày kiểm kho</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="date" value={ngayKiem}
                  min={lockDate ? today() : undefined} max={lockDate ? today() : undefined}
                  onChange={e => !lockDate && !locked && setNgayKiem(e.target.value)}
                  readOnly={lockDate || locked}
                  style={{ ...CSS.input, flex: 1, cursor: (lockDate || locked) ? "not-allowed" : "text", opacity: (lockDate || locked) ? 0.7 : 1, background: (lockDate || locked) ? "var(--muted)" : CSS.input.background }}
                />
                {!locked && (
                  <span onClick={() => setLockDate(v => !v)}
                    style={{ position: "relative", display: "inline-block", width: 34, height: 18, borderRadius: 9, flexShrink: 0, background: lockDate ? "#0ea5e9" : "var(--border)", transition: "background 0.2s", cursor: "pointer" }}>
                    <span style={{ position: "absolute", top: 2, left: lockDate ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
                  </span>
                )}
              </div>
            </div>

            {/* Người kiểm */}
            <div>
              <label style={CSS.label}>Người kiểm kho</label>
              <input value={nguoiKiem} onChange={e => !locked && setNguoiKiem(e.target.value)} readOnly={locked}
                placeholder="Họ tên người kiểm" style={{ ...CSS.input, opacity: locked ? 0.7 : 1 }} />
            </div>

            {/* Ghi chú */}
            <div>
              <label style={CSS.label}>Ghi chú</label>
              <textarea value={ghiChu} onChange={e => !locked && setGhiChu(e.target.value)} readOnly={locked} rows={3}
                placeholder="Ghi chú kiểm kho..." style={{ ...CSS.input, resize: "vertical", minHeight: 72, opacity: locked ? 0.7 : 1 }} />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />

            {/* Tóm tắt */}
            <div>
              <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 12 }}>📊 Tóm tắt kiểm kê</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Tổng mặt hàng",  value: rows.length,        color: "var(--foreground)" },
                  { label: "Đã nhập thực tế", value: entered.length,     color: "#0ea5e9" },
                  { label: "✅ Khớp",          value: matchRows.length,   color: "#10b981" },
                  { label: "📉 Thiếu (hao hụt)", value: underRows.length, color: "#f43f5e" },
                  { label: "📈 Thừa",          value: overRows.length,    color: "#f59e0b" },
                  { label: "⚠️ Dưới tồn tối thiểu", value: belowMinRows.length, color: "#f97316" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                    <span style={{ color: "var(--muted-foreground)" }}>{item.label}</span>
                    <span style={{ fontWeight: 800, color: item.color }}>{item.value}</span>
                  </div>
                ))}

                {(tongHaoHut > 0 || tongThua > 0) && (
                  <>
                    <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "2px 0" }} />
                    {tongHaoHut > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>Giá trị hao hụt</span>
                        <span style={{ fontWeight: 700, color: "#f43f5e" }}>-{fmtVnd(tongHaoHut)}</span>
                      </div>
                    )}
                    {tongThua > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>Giá trị thừa</span>
                        <span style={{ fontWeight: 700, color: "#f59e0b" }}>+{fmtVnd(tongThua)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            </div>
          </div>
        )}

        {/* ── SIDEBAR: desktop only ──────────────────────────────────────────── */}
        {!isMobile && (
        <div style={{ width: 256, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--card)", overflowY: "auto" }}>
          <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Thông tin phiếu</p>
          </div>
          <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
            {/* Số phiếu */}
            <div>
              <label style={CSS.label}>Số phiếu kiểm</label>
              <input value={soChungTu} readOnly style={{ ...CSS.input, background: "var(--muted)", fontFamily: "monospace", fontSize: 12, color: "var(--muted-foreground)", cursor: "default" }} />
            </div>

            {/* Ngày kiểm + lock */}
            <div>
              <label style={CSS.label}>Ngày kiểm kho</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="date" value={ngayKiem}
                  min={lockDate ? today() : undefined} max={lockDate ? today() : undefined}
                  onChange={e => !lockDate && !locked && setNgayKiem(e.target.value)}
                  readOnly={lockDate || locked}
                  style={{ ...CSS.input, flex: 1, cursor: (lockDate || locked) ? "not-allowed" : "text", opacity: (lockDate || locked) ? 0.7 : 1, background: (lockDate || locked) ? "var(--muted)" : CSS.input.background }}
                />
                {!locked && (
                  <span onClick={() => setLockDate(v => !v)}
                    style={{ position: "relative", display: "inline-block", width: 34, height: 18, borderRadius: 9, flexShrink: 0, background: lockDate ? "#0ea5e9" : "var(--border)", transition: "background 0.2s", cursor: "pointer" }}>
                    <span style={{ position: "absolute", top: 2, left: lockDate ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
                  </span>
                )}
              </div>
            </div>

            {/* Người kiểm */}
            <div>
              <label style={CSS.label}>Người kiểm kho</label>
              <input value={nguoiKiem} onChange={e => !locked && setNguoiKiem(e.target.value)} readOnly={locked}
                placeholder="Họ tên người kiểm" style={{ ...CSS.input, opacity: locked ? 0.7 : 1 }} />
            </div>

            {/* Ghi chú */}
            <div>
              <label style={CSS.label}>Ghi chú</label>
              <textarea value={ghiChu} onChange={e => !locked && setGhiChu(e.target.value)} readOnly={locked} rows={3}
                placeholder="Ghi chú kiểm kho..." style={{ ...CSS.input, resize: "vertical", minHeight: 72, opacity: locked ? 0.7 : 1 }} />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />

            {/* Tóm tắt */}
            <div>
              <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 12 }}>📊 Tóm tắt kiểm kê</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Tổng mặt hàng",  value: rows.length,        color: "var(--foreground)" },
                  { label: "Đã nhập thực tế", value: entered.length,     color: "#0ea5e9" },
                  { label: "✅ Khớp",          value: matchRows.length,   color: "#10b981" },
                  { label: "📉 Thiếu (hao hụt)", value: underRows.length, color: "#f43f5e" },
                  { label: "📈 Thừa",          value: overRows.length,    color: "#f59e0b" },
                  { label: "⚠️ Dưới tồn tối thiểu", value: belowMinRows.length, color: "#f97316" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                    <span style={{ color: "var(--muted-foreground)" }}>{item.label}</span>
                    <span style={{ fontWeight: 800, color: item.color }}>{item.value}</span>
                  </div>
                ))}

                {(tongHaoHut > 0 || tongThua > 0) && (
                  <>
                    <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "2px 0" }} />
                    {tongHaoHut > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>Giá trị hao hụt</span>
                        <span style={{ fontWeight: 700, color: "#f43f5e" }}>-{fmtVnd(tongHaoHut)}</span>
                      </div>
                    )}
                    {tongThua > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>Giá trị thừa</span>
                        <span style={{ fontWeight: 700, color: "#f59e0b" }}>+{fmtVnd(tongThua)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ── MAIN AREA ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── MOBILE: scope + kho select bar ───────────────────────────── */}
          {isMobile && (
            <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: "var(--card)", flexWrap: "wrap" }}>
              {/* Scope toggle */}
              <div style={{ display: "flex", gap: 0, borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden", fontSize: 12 }}>
                {(["system", "warehouse"] as const).map((s, i) => (
                  <button key={s} onClick={() => !locked && setScope(s)} disabled={locked}
                    style={{ padding: "6px 12px", border: "none", borderLeft: i > 0 ? "1px solid var(--border)" : "none", background: scope === s ? "#0ea5e9" : "var(--card)", color: scope === s ? "#fff" : "var(--foreground)", fontWeight: scope === s ? 700 : 400, cursor: locked ? "not-allowed" : "pointer" }}>
                    {s === "system" ? "🌐 HT" : "🏭 Kho"}
                  </button>
                ))}
              </div>

              {/* Warehouse select */}
              {scope === "warehouse" && (
                <select value={warehouseId} onChange={e => !locked && setWarehouseId(e.target.value)} disabled={locked}
                  style={{ flex: 1, padding: "6px 10px", borderRadius: 7, border: `1.5px solid ${warehouseId ? "rgba(14,165,233,0.5)" : "var(--border)"}`, background: "var(--card)", color: "var(--foreground)", fontSize: 13, cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.7 : 1 }}>
                  <option value="">— Chọn kho —</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ""}</option>)}
                </select>
              )}

              {/* Lịch sử + Báo cáo buttons for mobile */}
              {scope === "warehouse" && warehouseId && (
                <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                  <button onClick={() => setShowLichSu(true)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", border: "1px solid var(--border)", background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: "pointer" }}>
                    <i className="bi bi-clock-history" style={{ fontSize: 12 }} />
                    {isTablet && " Lịch sử"}
                  </button>
                  <div ref={baoCaoMenuRef} style={{ position: "relative" }}>
                    <button onClick={() => setShowBaoCaoMenu(v => !v)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.07)", color: "#6366f1", fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: "pointer" }}>
                      <i className="bi bi-file-earmark-bar-graph" style={{ fontSize: 12 }} />
                      {isTablet && " Báo cáo"}
                    </button>
                    {showBaoCaoMenu && (
                      <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setShowBaoCaoMenu(false)} />
                        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", minWidth: 200, zIndex: 9999, overflow: "hidden", padding: "4px 0" }}>
                          {([
                            { key: "the-kho",      icon: "bi-journal-bookmark",       label: "Thẻ kho" },
                            { key: "xuat-nhap-ton", icon: "bi-table",                  label: "Bảng kê XNT" },
                            { key: "nhap-kho",     icon: "bi-box-arrow-in-down-right", label: "Bảng kê Nhập" },
                            { key: "xuat-kho",     icon: "bi-box-arrow-up-right",      label: "Bảng kê Xuất" },
                          ] as const).map(item => (
                            <button key={item.key} onClick={() => { setBaoCaoType(item.key); setShowBaoCaoMenu(false); }}
                              style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 14px", border: "none", background: "transparent", color: "var(--foreground)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <i className={`bi ${item.icon}`} style={{ fontSize: 13, color: "#6366f1" }} />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Banner bản nháp */}
          {draftBanner && !draftId && (
            <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", padding: "8px 20px", background: "rgba(16,185,129,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
              <i className="bi bi-cloud-arrow-down-fill" style={{ color: "#10b981", fontSize: 16 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#10b981" }}>Có bản nháp chưa hoàn thành</span>
                <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginLeft: 8 }}>{draftBanner.soChungTu ?? draftBanner.id} — đã lưu {new Date(draftBanner.updatedAt).toLocaleString("vi-VN")}</span>
              </div>
              <button onClick={() => loadDraft(draftBanner.id)} disabled={loadingDraft}
                style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 7, border: "1px solid #10b981", background: "rgba(16,185,129,0.1)", color: "#10b981", cursor: "pointer" }}>
                {loadingDraft ? "Đang tải...”" : "↩ Tiếp tục"}
              </button>
              <button onClick={() => setDraftBanner(null)}
                style={{ fontSize: 11, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}>
                bỏ qua
              </button>
            </div>
          )}

          {/* Filter bar: Category + Status + Search */}
          <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, background: "var(--background)", flexWrap: "wrap" }}>
            <FilterSelect
              options={categories.map(c => ({ label: c.name, value: c.id }))}
              value={filterCat}
              onChange={setFilterCat}
              placeholder="Danh mục"
            />
            <FilterSelect
              options={[
                { label: "Còn hàng",  value: "con-hang"  },
                { label: "Sắp hết",  value: "sap-het"  },
                { label: "Hết hàng",  value: "het-hang" },
              ]}
              value={filterSt}
              onChange={setFilterSt}
              placeholder="Trạng thái"
            />
            <SearchInput
              value={searchQ}
              onChange={setSearchQ}
              placeholder="Tìm hàng hoá, SKU..."
            />
            {(filterCat || filterSt || searchQ) && (
              <button onClick={() => { setFilterCat(""); setFilterSt(""); setSearchQ(""); }}
                style={{ fontSize: 12, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                <i className="bi bi-x-circle" style={{ fontSize: 12 }} /> Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Filter tabs + badges */}
          <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, background: "var(--card)", flexWrap: "wrap" }}>
            {([ 
              { id: "all",      label: "Tất cả",      count: rows.length,         color: "var(--foreground)" },
              { id: "match",    label: "✅ Khớp",       count: matchRows.length,   color: "#10b981" },
              { id: "under",    label: "📉 Thiếu",      count: underRows.length,   color: "#f43f5e" },
              { id: "over",     label: "📈 Thừa",       count: overRows.length,    color: "#f59e0b" },
              { id: "belowMin",    label: "⚠️ Dưới Min",        count: belowMinRows.length, color: "#f97316" },
              ...(scope === "system" && noWhRows.length > 0
                ? [{ id: "noWarehouse" as FilterTab, label: "📦 Chưa phân kho", count: noWhRows.length, color: "#8b5cf6" }]
                : []),
            ] as { id: FilterTab; label: string; count: number; color: string }[]).map(tab => (
              <button key={tab.id} onClick={() => setFilterTab(tab.id)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, border: `1px solid ${filterTab === tab.id ? tab.color : "var(--border)"}`, background: filterTab === tab.id ? `${tab.color}18` : "transparent", color: filterTab === tab.id ? tab.color : "var(--muted-foreground)", fontSize: 12, fontWeight: filterTab === tab.id ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                {tab.label}
                <span style={{ background: filterTab === tab.id ? tab.color : "var(--muted)", color: filterTab === tab.id ? "#fff" : "var(--muted-foreground)", borderRadius: 10, padding: "0 6px", fontSize: 11, fontWeight: 700 }}>{tab.count}</span>
              </button>
            ))}

            {/* Nút YCMH khi có hàng dưới tồn min */}
            {belowMinRows.length > 0 && !locked && (
              <button onClick={() => setShowPRModal(true)}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(249,115,22,0.14)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(249,115,22,0.07)"; }}
                style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.07)", borderRadius: 20, padding: "4px 14px", border: "1px solid rgba(249,115,22,0.35)", cursor: "pointer", transition: "all 0.15s" }}>
                <i className="bi bi-cart-plus" style={{ fontSize: 12 }} />
                Tạo yêu cầu mua hàng ({belowMinRows.length})
              </button>
            )}
          </div>

          {/* Table / Card */}
          <div style={{ flex: 1, overflowY: "auto", paddingTop: isPhone ? 8 : 0, paddingLeft: isPhone ? 8 : 20, paddingRight: isPhone ? 8 : 20, paddingBottom: isMobile ? 72 : 24 }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "24px 0" }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ height: 40, borderRadius: 8, background: "var(--muted)", animation: "pulse 1.5s infinite", opacity: 1 - i * 0.1 }} />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-inbox" style={{ fontSize: 40, display: "block", marginBottom: 14, opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                  {scope === "warehouse" && !warehouseId ? "Vui lòng chọn kho để bắt đầu kiểm kê" : "Không có hàng hoá trong kho"}
                </p>
              </div>
            ) : isPhone ? (
              /* ══ PHONE: Card view ══ */
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
                {filteredRows.map((row) => {
                  const st  = statusOf(row);
                  const blm = isBelowMin(row);
                  const tt  = row.soLuongThucTe === "" ? null : row.soLuongThucTe as number;
                  const diff = tt !== null ? tt - row.soLuongHeTong : null;
                  const stColor = st === "match" ? "#10b981" : st === "under" ? "#f43f5e" : st === "over" ? "#f59e0b" : blm ? "#f97316" : "var(--border)";
                  return (
                    <div key={`${row.inventoryItemId}_${row.warehouseId}`}
                      style={{ background: "var(--card)", borderRadius: 12, border: `1.5px solid ${st !== "unknown" ? stColor : "var(--border)"}`, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      {/* Header row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)", marginBottom: 2 }}>{row.tenHang}</div>
                          {row.maSku && <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{row.maSku}</div>}
                          {(row.viTriHang || row.viTriCot || row.viTriTang) && (
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                              📍 {[row.viTriHang, row.viTriCot, row.viTriTang].filter(Boolean).join("-")}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          {st === "match" && <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 8, padding: "2px 8px" }}>✅ Khớp</span>}
                          {st === "under" && <span style={{ fontSize: 11, fontWeight: 700, color: "#f43f5e", background: "rgba(244,63,94,0.1)", borderRadius: 8, padding: "2px 8px" }}>📉 Thiếu</span>}
                          {st === "over" && <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", borderRadius: 8, padding: "2px 8px" }}>📈 Thừa</span>}
                          {blm && <span style={{ fontSize: 10, fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.1)", borderRadius: 8, padding: "2px 8px" }}>⚠️ Dưới Min</span>}
                        </div>
                      </div>
                      {/* Stats row */}
                      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
                        <div style={{ flex: 1, textAlign: "center", background: "var(--muted)", borderRadius: 8, padding: "6px 0" }}>
                          <div style={{ color: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}>TỒN HT</div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--foreground)" }}>{fmtN(row.soLuongHeTong)}</div>
                          <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{row.donVi ?? "—"}</div>
                        </div>
                        {row.soLuongMin > 0 && (
                          <div style={{ flex: 1, textAlign: "center", background: blm ? "rgba(249,115,22,0.08)" : "var(--muted)", borderRadius: 8, padding: "6px 0" }}>
                            <div style={{ color: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}>TỒN MIN</div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: blm ? "#f97316" : "var(--foreground)" }}>{fmtN(row.soLuongMin)}</div>
                            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{row.donVi ?? "—"}</div>
                          </div>
                        )}
                        {diff !== null && (
                          <div style={{ flex: 1, textAlign: "center", background: diff === 0 ? "rgba(16,185,129,0.08)" : diff < 0 ? "rgba(244,63,94,0.08)" : "rgba(245,158,11,0.08)", borderRadius: 8, padding: "6px 0" }}>
                            <div style={{ color: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}>CHÊNH LỆCH</div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: diff === 0 ? "#10b981" : diff < 0 ? "#f43f5e" : "#f59e0b" }}>{diff > 0 ? "+" : ""}{fmtN(diff)}</div>
                            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>so HT</div>
                          </div>
                        )}
                      </div>
                      {/* Input row */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>THỰC TẾ KIỂM ĐƯỢC</label>
                          <input type="number" min={0} placeholder="Nhập số lượng..." disabled={locked || row.chuaPhanKho}
                            value={row.soLuongThucTe}
                            onChange={e => {
                              const v = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                              updateRow(row.inventoryItemId, row.warehouseId, "soLuongThucTe", v as never);
                            }}
                            style={{ width: "100%", padding: "10px 14px", borderWidth: 2, borderStyle: "solid", borderColor: st === "under" ? "rgba(244,63,94,0.5)" : st === "over" ? "rgba(245,158,11,0.5)" : blm ? "rgba(249,115,22,0.5)" : "var(--border)", borderRadius: 10, fontSize: 16, fontWeight: 700, background: locked ? "var(--muted)" : "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box", textAlign: "center" }} />
                        </div>
                        {/* Quick match button */}
                        {!locked && !row.chuaPhanKho && (
                          <button
                            onClick={() => updateRow(row.inventoryItemId, row.warehouseId, "soLuongThucTe", row.soLuongHeTong as never)}
                            title="Khớp HT"
                            style={{ marginTop: 20, width: 44, height: 44, borderRadius: 10, border: "1.5px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.08)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: 18 }}>
                            ✓
                          </button>
                        )}
                        {/* Clear button */}
                        {!locked && row.soLuongThucTe !== "" && (
                          <button onClick={() => updateRow(row.inventoryItemId, row.warehouseId, "soLuongThucTe", "" as never)}
                            style={{ marginTop: 20, width: 44, height: 44, borderRadius: 10, border: "1.5px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.07)", color: "#f43f5e", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                            <i className="bi bi-x" style={{ fontSize: 18 }} />
                          </button>
                        )}
                      </div>
                      {row.chuaPhanKho && (
                        <div style={{ marginTop: 8, fontSize: 11, color: "#8b5cf6", background: "rgba(139,92,246,0.08)", borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                          <i className="bi bi-boxes" style={{ fontSize: 12 }} /> Chưa phân kho — nhấn &quot;Phân kho&quot; để xác nhận
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--card)", borderRadius: "0 0 0 0" }}>
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4, padding: "10px 10px 7px", fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--muted)", borderRadius: "8px 8px 0 0", marginTop: 16 }}>
                    <div>#</div>
                    <div>Hàng hoá</div>
                    <div style={{ textAlign: "center" }}>SKU</div>
                    <div style={{ textAlign: "center" }}>ĐVT</div>
                    {scope !== "warehouse" && <div style={{ textAlign: "center" }}>Kho</div>}
                    <div style={{ textAlign: "right" }}>Tồn HT</div>
                    <div style={{ textAlign: "right" }}>Tồn Min</div>
                    <div style={{ textAlign: "center" }}>Thực tế</div>
                    <div style={{ textAlign: "center" }}>±Chênh</div>
                    <div style={{ textAlign: "center" }}>Trạng thái</div>
                    <div />
                  </div>
                </div>

                {/* Rows */}
                <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "visible" }}>
                  {filteredRows.map((row, idx) => {
                    const st   = statusOf(row);
                    const blm  = isBelowMin(row);
                    const tt   = row.soLuongThucTe === "" ? null : row.soLuongThucTe as number;
                    const diff = tt !== null ? tt - row.soLuongHeTong : null;
                    const cellInput: React.CSSProperties = { width: "100%", padding: "4px 7px", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 6, fontSize: 12, background: "var(--background)", color: "var(--foreground)", outline: "none", boxSizing: "border-box", textAlign: "center" };

                    return (
                      <div key={`${row.inventoryItemId}_${row.warehouseId}`}
                        style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4, padding: "6px 10px", borderBottom: "1px solid var(--border)", alignItems: "center",
                          background: row.chuaPhanKho ? "rgba(139,92,246,0.04)"
                            : blm ? "rgba(249,115,22,0.03)"
                            : st === "under" ? "rgba(244,63,94,0.03)"
                            : st === "over"  ? "rgba(245,158,11,0.03)"
                            : idx % 2 !== 0  ? "color-mix(in srgb, var(--muted) 25%, transparent)"
                            : "transparent" }}>
                        <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600 }}>{idx + 1}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12.5 }}>{row.tenHang}</div>
                          {row.thongSoKyThuat && (
                            <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 1 }}>{row.thongSoKyThuat}</div>
                          )}
                          {(row.viTriHang || row.viTriCot || row.viTriTang) && (
                            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                              📍 {[row.viTriHang, row.viTriCot, row.viTriTang].filter(Boolean).join("-")}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.maSku ?? "—"}</div>
                        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>{row.donVi ?? "—"}</div>
                        {scope !== "warehouse" && <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted-foreground)" }}>{row.warehouseName ?? "—"}</div>}
                        <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700 }}>{fmtN(row.soLuongHeTong)}</div>
                        <div style={{ textAlign: "right" }}>
                          {row.soLuongMin > 0 ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: blm ? "#f97316" : "var(--muted-foreground)" }}>{fmtN(row.soLuongMin)}</span>
                          ) : <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>—</span>}
                        </div>
                        {/* Nhập SL thực tế */}
                        <input type="number" min={0} placeholder="Nhập..." disabled={locked}
                          value={row.soLuongThucTe}
                          onChange={e => {
                            const v = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                            updateRow(row.inventoryItemId, row.warehouseId, "soLuongThucTe", v as never);
                          }}
                          style={{ ...cellInput,
                            borderColor: st === "under" ? "rgba(244,63,94,0.5)" : st === "over" ? "rgba(245,158,11,0.5)" : blm ? "rgba(249,115,22,0.5)" : "var(--border)",
                            background: locked ? "var(--muted)" : "var(--background)", cursor: locked ? "not-allowed" : "text",
                          }} />
                        {/* Chênh lệch */}
                        <div style={{ textAlign: "center" }}>
                          {diff !== null ? (
                            <span style={{ fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 12,
                              background: diff === 0 ? "rgba(16,185,129,0.1)" : diff < 0 ? "rgba(244,63,94,0.1)" : "rgba(245,158,11,0.1)",
                              color: diff === 0 ? "#10b981" : diff < 0 ? "#f43f5e" : "#f59e0b",
                            }}>
                              {diff > 0 ? "+" : ""}{fmtN(diff)}
                            </span>
                          ) : <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>—</span>}
                        </div>
                        {/* Badge trạng thái */}
                        <div style={{ textAlign: "center" }}>
                          {row.chuaPhanKho ? (
                            <button
                              className="assign-popover"
                              disabled={assigning === row.inventoryItemId}
                              onClick={e => {
                                if (locked) return;
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setAssignPopover(p => p?.itemId === row.inventoryItemId ? null : { itemId: row.inventoryItemId, top: rect.bottom + 4, left: rect.left });
                              }}
                              style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", background: assigning === row.inventoryItemId ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.1)", borderRadius: 10, padding: "2px 7px", border: "1px solid rgba(139,92,246,0.3)", cursor: locked ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                              {assigning === row.inventoryItemId ? <i className="bi bi-arrow-repeat" style={{ fontSize: 9, animation: "spin 1s linear infinite" }} /> : <i className="bi bi-boxes" style={{ fontSize: 9 }} />}
                              Phân kho
                            </button>
                          ) : (
                            <>
                              {st === "unknown" && !blm && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>—</span>}
                              {st === "match"   && <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>✅ Khớp</span>}
                              {st === "under"   && <span style={{ fontSize: 11, fontWeight: 700, color: "#f43f5e" }}>📉 Thiếu</span>}
                              {st === "over"    && <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>📈 Thừa</span>}
                              {blm && <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#f97316" }}>⚠️ Dưới Min</span>}
                            </>
                          )}
                        </div>
                        {/* Nút clear */}
                        <button onClick={() => updateRow(row.inventoryItemId, row.warehouseId, "soLuongThucTe", "" as never)}
                          disabled={locked || row.soLuongThucTe === "" || row.chuaPhanKho}
                          title={row.chuaPhanKho ? "Hàng chưa phân kho — không thể kiểm" : undefined}
                          style={{ width: 26, height: 26, border: "none", background: "transparent", color: (row.soLuongThucTe !== "" && !locked && !row.chuaPhanKho) ? "#f43f5e" : "var(--border)", cursor: (row.soLuongThucTe !== "" && !locked && !row.chuaPhanKho) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
                          <i className="bi bi-x" style={{ fontSize: 14 }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── MOBILE: bottom toolbar ────────────────────────────────────── */}
          {isMobile && !success && (
            <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "10px 12px", display: "flex", gap: 8, background: "var(--card)", boxShadow: "0 -4px 16px rgba(0,0,0,0.08)" }}>
              {/* Progress */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 3 }}>
                  Đã kiểm: <strong style={{ color: entered.length > 0 ? "#0ea5e9" : "var(--muted-foreground)" }}>{entered.length}/{rows.length}</strong>
                </div>
                <div style={{ height: 4, background: "var(--muted)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#0ea5e9", borderRadius: 4, width: rows.length > 0 ? `${Math.round(entered.length / rows.length * 100)}%` : "0%", transition: "width 0.3s" }} />
                </div>
              </div>
              <button onClick={saveDraft} disabled={savingDraft || locked || rows.length === 0}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", border: "1px solid var(--border)", background: "var(--muted)", color: draftId ? "#10b981" : "var(--foreground)", fontSize: 13, fontWeight: 600, borderRadius: 10, cursor: (savingDraft || locked || rows.length === 0) ? "not-allowed" : "pointer", opacity: (savingDraft || locked || rows.length === 0) ? 0.5 : 1, flexShrink: 0 }}>
                {savingDraft ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : draftId ? <i className="bi bi-cloud-check-fill" style={{ color: "#10b981" }} /> : <i className="bi bi-floppy" />}
                Lưu
              </button>
              {scope === "warehouse" && warehouseId && (
                <button onClick={handleSave} disabled={saving || locked || loading || entered.length === 0}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", border: "none", background: (saving || locked || loading || entered.length === 0) ? "var(--muted)" : "#0ea5e9", color: (saving || locked || loading || entered.length === 0) ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, borderRadius: 10, cursor: (saving || locked || loading || entered.length === 0) ? "not-allowed" : "pointer", flexShrink: 0 }}>
                  {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-clipboard-check" />}
                  {isTablet ? "Xác nhận kiểm kho" : "Xác nhận"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm kiểm kho */}
      <ConfirmDialog
        open={confirmOpen}
        variant={entered.length < totalCountable ? "warning" : "info"}
        title={entered.length < totalCountable ? "Kiểm kho chưa đủ" : "Xác nhận kiểm kho"}
        message={
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            {entered.length < totalCountable && (
              <p style={{ margin: "0 0 10px" }}>
                Hiện còn <strong style={{ color: "#f59e0b" }}>{totalCountable - entered.length}/{totalCountable}</strong> mặt hàng chưa được kiểm kê.
              </p>
            )}
            <p style={{ margin: "0 0 10px" }}>
              Xác nhận hộp thoại này sẽ thực hiện việc điều chỉnh hàng tồn kho và không thể hoàn tác.
            </p>
            <p style={{ margin: 0, fontWeight: 700, color: "#f59e0b" }}>Hãy thận trọng khi xác nhận.</p>
          </div>
        }
        confirmLabel={entered.length < totalCountable ? "Xác nhận kiểm một phần" : "Xác nhận điều chỉnh"}
        cancelLabel="Quay lại"
        loading={saving}
        onConfirm={() => { setConfirmOpen(false); doSave(); }}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Popover phân kho nhanh */}
      {assignPopover && (
        <div className="assign-popover" style={{ position: "fixed", top: assignPopover.top, left: assignPopover.left, zIndex: 9999, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 200, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)" }}>Chọn kho cho hàng này</div>
          {warehouses.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted-foreground)" }}>Không có kho nào</div>
          ) : warehouses.map(wh => (
            <button key={wh.id} onClick={() => assignToWarehouse(assignPopover.itemId, wh.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", border: "none", background: "transparent", textAlign: "left", fontSize: 13, cursor: "pointer", color: "var(--foreground)", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <i className="bi bi-building" style={{ fontSize: 12, color: "#8b5cf6", flexShrink: 0 }} />
              {wh.name}{wh.code ? <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}> ({wh.code})</span> : null}
            </button>
          ))}
        </div>
      )}

      {/* YCMH — pre-fill hàng dưới tồn min */}
      {showPRModal && (
        <TaoYeuCauMuaHangModal
          onClose={() => setShowPRModal(false)}
          onSaved={() => {
            setShowPRModal(false);
            toast.success("✅ Đã tạo yêu cầu mua hàng!", "Yêu cầu đã được gửi cho bộ phận mua hàng", 5000);
          }}
          initialData={{
            nguoiYeuCau: nguoiKiem || "",
            lyDo: `Bổ sung hàng dưới tồn tối thiểu — phiếu kiểm kho ${soChungTu}`,
            lines: belowMinRows.map(r => {
              const thucTe = r.soLuongThucTe === "" ? r.soLuongHeTong : r.soLuongThucTe as number;
              const canMua = Math.max(1, r.soLuongMin - thucTe);
              return {
                tenHang: r.tenHang,
                soLuong: canMua,
                donVi:   r.donVi ?? undefined,
                ghiChu:  `Kiểm kho ${soChungTu}: tồn ${thucTe}, min ${r.soLuongMin} → cần mua ${canMua} ${r.donVi ?? ""}`,
              };
            }),
          }}
        />
      )}

      {/* Báo cáo kiểm kho — tự mở sau save; onSaved được gọi khi đóng */}
      {showBaoCao && savedLines.length > 0 && (
        <BaoCaoKiemKhoPreview
          soChungTu={soChungTu}
          ngayKiem={ngayKiem}
          warehouseName={scope === "warehouse" && warehouseId
            ? (warehouses.find(w => w.id === warehouseId)?.name ?? warehouseId)
            : "Toàn hệ thống"}
          nguoiKiem={nguoiKiem}
          ghiChu={ghiChu}
          lines={savedLines}
          onClose={() => { setShowBaoCao(false); onSaved(); }}
        />
      )}

      {/* Thẻ kho + các báo cáo kho */}
      {baoCaoType === "the-kho" && (
        <TheKhoModal
          inventoryItemId=""
          warehouseId={warehouseId}
          warehouseName={warehouses.find(w => w.id === warehouseId)?.name ?? warehouseId}
          onClose={() => setBaoCaoType(null)}
        />
      )}

      {/* TODO: Bảng kê Xuất-Nhập-Tồn */}
      {baoCaoType === "xuat-nhap-ton" && (
        <BangKeXuatNhapTonModal
          warehouseId={warehouseId}
          warehouseName={warehouses.find(w => w.id === warehouseId)?.name ?? warehouseId}
          onClose={() => setBaoCaoType(null)}
        />
      )}

      {/* TODO: Bảng kê Nhập kho */}
      {baoCaoType === "nhap-kho" && (
        <BangKeNhapKhoModal
          warehouseId={warehouseId}
          warehouseName={warehouses.find(w => w.id === warehouseId)?.name ?? warehouseId}
          onClose={() => setBaoCaoType(null)}
        />
      )}

      {/* TODO: Bảng kê Xuất kho */}
      {baoCaoType === "xuat-kho" && (
        <BangKeXuatKhoModal
          warehouseId={warehouseId}
          warehouseName={warehouses.find(w => w.id === warehouseId)?.name ?? warehouseId}
          onClose={() => setBaoCaoType(null)}
        />
      )}

      {/* Lịch sử kiểm kho */}
      {showLichSu && (
        <LichSuKiemKhoModal
          warehouseId={scope === "warehouse" && warehouseId ? warehouseId : undefined}
          warehouseName={scope === "warehouse" && warehouseId
            ? (warehouses.find(w => w.id === warehouseId)?.name ?? warehouseId)
            : undefined}
          onClose={() => setShowLichSu(false)}
        />
      )}
    </div>
  );
}
