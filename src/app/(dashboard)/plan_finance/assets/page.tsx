"use client";
import React from "react";
import { SplitLayoutPage }    from "@/components/layout/SplitLayoutPage";
import { SectionTitle }       from "@/components/ui/SectionTitle";
import { KPICard }            from "@/components/ui/KPICard";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { SearchInput }        from "@/components/ui/SearchInput";
import { FilterSelect, SELECT_STYLE } from "@/components/ui/FilterSelect";
import { Table, TableColumn } from "@/components/ui/Table";
import { Pagination }         from "@/components/ui/Pagination";
import { useToast }           from "@/components/ui/Toast";
import { ConfirmDialog }      from "@/components/ui/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Asset {
  id:           string;
  code:         string | null;
  tenTaiSan:    string;
  loai:         string | null;
  ngayMua:      string | null;
  giaTriMua:    number;
  giaTriConLai: number;
  khauHao:      number;
  trangThai:    string;
  viTri:        string | null;
  ghiChu:       string | null;
}

interface AssetStats {
  tongTaiSan:     number;
  tongDangSuDung: number;
  tongNguyenGia:  number;
  tongConLai:     number;
  khauHaoThang:   number;
  khauHaoNam:     number;
  byLoaiChart:    { label: string; value: number }[];
  byStatusChart:  { label: string; value: number }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
// ── Loại tài sản (chuẩn VAS) ─────────────────────────────────────────────────
const LOAI_GROUPS = [
  {
    group: "Hữu hình",
    items: [
      { value: "nha-cua-vat-kien-truc", label: "Nhà cửa, vật kiến trúc" },
      { value: "may-moc-thiet-bi",      label: "Máy móc, thiết bị" },
      { value: "phuong-tien-van-tai",   label: "Phương tiện vận tải" },
      { value: "thiet-bi-van-phong",    label: "Thiết bị văn phòng" },
      { value: "huu-hinh-khac",         label: "Hữu hình khác" },
    ],
  },
  {
    group: "Vô hình",
    items: [
      { value: "quyen-su-dung-dat",      label: "Quyền sử dụng đất" },
      { value: "phan-mem-may-tinh",      label: "Phần mềm máy tính" },
      { value: "ban-quyen-bang-sang-che",label: "Bản quyền, bằng sáng chế" },
      { value: "nhan-hieu-thuong-mai",   label: "Nhãn hiệu thương mại" },
      { value: "vo-hinh-khac",           label: "Vô hình khác" },
    ],
  },
];

// Flat list for easy lookup
const LOAI_OPTIONS = LOAI_GROUPS.flatMap(g => g.items);
const LOAI_MAP     = Object.fromEntries(LOAI_OPTIONS.map(o => [o.value, o]));

const LOAI_COLOR: Record<string, string> = {
  "nha-cua-vat-kien-truc":   "#f59e0b",
  "may-moc-thiet-bi":        "#6366f1",
  "phuong-tien-van-tai":     "#0ea5e9",
  "thiet-bi-van-phong":      "#10b981",
  "huu-hinh-khac":           "#94a3b8",
  "quyen-su-dung-dat":       "#a855f7",
  "phan-mem-may-tinh":       "#ec4899",
  "ban-quyen-bang-sang-che": "#f43f5e",
  "nhan-hieu-thuong-mai":    "#8b5cf6",
  "vo-hinh-khac":            "#64748b",
};

// Grouped select dùng optgroup + style chuẩn từ FilterSelect
function GroupedLoaiSelect({
  value, onChange, placeholder = "Loại tài sản",
}: { value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...SELECT_STYLE }}>
      <option value="">{placeholder}</option>
      {LOAI_GROUPS.map(g => (
        <optgroup key={g.group} label={g.group}>
          {g.items.map(item => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

const TT_OPTIONS = [
  { value: "dang-su-dung", label: "Đang sử dụng" },
  { value: "bao-duong",    label: "Bảo dưỡng" },
  { value: "hong",         label: "Hỏng" },
  { value: "thanh-ly",     label: "Thanh lý" },
];
const TT_META: Record<string, { label: string; color: string; bg: string }> = {
  "dang-su-dung": { label: "Đang sử dụng", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  "bao-duong":    { label: "Bảo dưỡng",    color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "hong":         { label: "Hỏng",          color: "#f43f5e", bg: "rgba(244,63,94,0.1)"  },
  "thanh-ly":     { label: "Thanh lý",      color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n: number) => Math.round(n).toLocaleString("vi-VN");
const fmtPct  = (n: number) => `${n}%`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

// Khấu hao tháng của 1 tài sản
const khauHaoThang = (a: Asset) => (a.giaTriMua * a.khauHao) / 100 / 12;

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ value }: { value: string }) {
  const m = TT_META[value] ?? { label: value, color: "var(--muted-foreground)", bg: "var(--muted)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

// ── Depreciation bar ──────────────────────────────────────────────────────────
function DepBar({ giaTriMua, giaTriConLai }: { giaTriMua: number; giaTriConLai: number }) {
  const pct = giaTriMua > 0 ? Math.min(100, Math.max(0, ((giaTriMua - giaTriConLai) / giaTriMua) * 100)) : 0;
  return (
    <div title={`Đã khấu hao: ${pct.toFixed(1)}%`} style={{ width: 64, height: 5, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: pct > 80 ? "#f43f5e" : pct > 50 ? "#f59e0b" : "#10b981", borderRadius: 3 }} />
    </div>
  );
}

// ── Form Dialog ───────────────────────────────────────────────────────────────
interface FormState {
  code: string; tenTaiSan: string; loai: string;
  ngayMua: string; giaTriMua: string; giaTriConLai: string;
  khauHao: string; trangThai: string; viTri: string; ghiChu: string;
}

const EMPTY_FORM: FormState = {
  code: "", tenTaiSan: "", loai: "may-moc",
  ngayMua: "", giaTriMua: "", giaTriConLai: "",
  khauHao: "10", trangThai: "dang-su-dung", viTri: "", ghiChu: "",
};

function AssetOffcanvas({
  item, onClose, onSaved, onDeleted,
}: {
  item: Asset | null;  // null = thêm mới
  onClose: () => void;
  onSaved: (a: Asset) => void;
  onDeleted?: (id: string) => void;
}) {
  const toast    = useToast();
  const isEdit   = !!item;
  const [form, setForm]         = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]     = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);

  // Tính khấu hao preview
  const previewGtm  = parseFloat(form.giaTriMua.replace(/\./g, "").replace(",", ".")) || 0;
  const previewKh   = parseFloat(form.khauHao) || 0;
  const previewThang = (previewGtm * previewKh) / 100 / 12;
  const previewNam   = previewThang * 12;

  React.useEffect(() => {
    setForm(item ? {
      code:         item.code         ?? "",
      tenTaiSan:    item.tenTaiSan,
      loai:         item.loai         ?? "may-moc",
      ngayMua:      item.ngayMua ? item.ngayMua.slice(0, 10) : "",
      giaTriMua:    item.giaTriMua    > 0 ? String(item.giaTriMua)    : "",
      giaTriConLai: item.giaTriConLai > 0 ? String(item.giaTriConLai) : "",
      khauHao:      String(item.khauHao),
      trangThai:    item.trangThai,
      viTri:        item.viTri  ?? "",
      ghiChu:       item.ghiChu ?? "",
    } : EMPTY_FORM);
  }, [item]);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.tenTaiSan.trim()) { toast.error("Thiếu thông tin", "Tên tài sản không được để trống"); return; }
    setSaving(true);
    try {
      const body = {
        code:         form.code         || null,
        tenTaiSan:    form.tenTaiSan.trim(),
        loai:         form.loai         || null,
        ngayMua:      form.ngayMua      || null,
        giaTriMua:    parseFloat(form.giaTriMua)    || 0,
        giaTriConLai: parseFloat(form.giaTriConLai) || 0,
        khauHao:      parseFloat(form.khauHao)      || 0,
        trangThai:    form.trangThai,
        viTri:        form.viTri  || null,
        ghiChu:       form.ghiChu || null,
      };
      const res = await fetch(
        isEdit ? `/api/plan-finance/assets/${item!.id}` : "/api/plan-finance/assets",
        { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (!res.ok) { toast.error("Lỗi", data.error ?? "Không thể lưu"); return; }
      toast.success(isEdit ? "Đã cập nhật" : "Đã thêm mới", form.tenTaiSan);
      onSaved(data);
      onClose();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/plan-finance/assets/${item!.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Lỗi", "Không thể xoá tài sản"); return; }
      toast.success("Đã xoá", item!.tenTaiSan);
      onDeleted?.(item!.id);
      onClose();
    } finally { setDeleting(false); setConfirmDel(false); }
  };

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
    borderRadius: 8, background: "var(--background)", color: "var(--foreground)",
    fontSize: 13, outline: "none", fontFamily: "inherit",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1040, background: "rgba(0,0,0,0.3)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420, zIndex: 1050,
        background: "var(--card)", borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.14)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-building" style={{ fontSize: 16, color: "#f59e0b" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{isEdit ? "Chỉnh sửa tài sản" : "Thêm tài sản mới"}</p>
            {isEdit && <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{item.code ?? item.id.slice(0, 8)}</p>}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 17 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tên tài sản" required>
              <input style={{ ...inputStyle, gridColumn: "span 2" }} value={form.tenTaiSan} onChange={set("tenTaiSan")} placeholder="VD: Máy in Ricoh..." />
            </Field>
            <Field label="Mã tài sản">
              <input style={inputStyle} value={form.code} onChange={set("code")} placeholder="TS-001" />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Loại tài sản">
              <select style={inputStyle} value={form.loai} onChange={set("loai")}>
                {LOAI_GROUPS.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select style={inputStyle} value={form.trangThai} onChange={set("trangThai")}>
                {TT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Ngày mua">
            <input type="date" style={inputStyle} value={form.ngayMua} onChange={set("ngayMua")} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Nguyên giá (₫)">
              <input type="number" style={inputStyle} value={form.giaTriMua} onChange={set("giaTriMua")} placeholder="0" min={0} />
            </Field>
            <Field label="Giá trị còn lại (₫)">
              <input type="number" style={inputStyle} value={form.giaTriConLai} onChange={set("giaTriConLai")} placeholder="0" min={0} />
            </Field>
          </div>

          <Field label="Tỷ lệ khấu hao (%/năm)">
            <input type="number" style={inputStyle} value={form.khauHao} onChange={set("khauHao")} placeholder="10" min={0} max={100} step={0.5} />
          </Field>

          {/* Preview khấu hao */}
          {previewGtm > 0 && previewKh > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <i className="bi bi-calculator me-1" /> Khấu hao dự tính
              </p>
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Hàng tháng</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{fmt(previewThang)} ₫</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Hàng năm</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>{fmt(previewNam)} ₫</p>
                </div>
                {previewNam > 0 && (
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Thời gian KH</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>
                      {(previewGtm / previewNam).toFixed(1)} năm
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <Field label="Vị trí / Phòng ban">
            <input style={inputStyle} value={form.viTri} onChange={set("viTri")} placeholder="VD: Phòng kế toán, Kho A..." />
          </Field>

          <Field label="Ghi chú">
            <textarea style={{ ...inputStyle, minHeight: 68, resize: "vertical" }} value={form.ghiChu} onChange={set("ghiChu")} placeholder="Ghi chú thêm..." />
          </Field>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>
          {isEdit && (
            <button
              onClick={() => setConfirmDel(true)}
              style={{ width: 38, height: 38, border: "1.5px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.06)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#f43f5e", flexShrink: 0 }}
            >
              <i className="bi bi-trash" style={{ fontSize: 14 }} />
            </button>
          )}
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Huỷ
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, padding: "9px 0", border: "none", background: saving ? "var(--muted)" : "#f59e0b", color: saving ? "var(--muted-foreground)" : "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang lưu...</> : <>{isEdit ? <><i className="bi bi-check-lg" />Cập nhật</> : <><i className="bi bi-plus-lg" />Thêm mới</>}</>}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        variant="danger"
        title={`Xoá "${item?.tenTaiSan}"?`}
        message="Tài sản sẽ bị xoá vĩnh viễn. Không thể hoàn tác."
        confirmLabel="Xoá tài sản"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

export default function AssetsPage() {
  const [stats,        setStats]        = React.useState<AssetStats | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [items,        setItems]        = React.useState<Asset[]>([]);
  const [total,        setTotal]        = React.useState(0);
  const [loading,      setLoading]      = React.useState(true);
  const [page,         setPage]         = React.useState(1);
  const [search,       setSearch]       = React.useState("");
  const [loaiFilter,   setLoaiFilter]   = React.useState("");
  const [ttFilter,     setTtFilter]     = React.useState("");
  const [selected,     setSelected]     = React.useState<Asset | null>(null);
  const [offcanvasOpen, setOffcanvasOpen] = React.useState(false);
  const [isAdd,        setIsAdd]        = React.useState(false);
  const [refreshKey,   setRefreshKey]   = React.useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchStats = React.useCallback(() => {
    fetch("/api/plan-finance/assets/stats")
      .then(r => r.json()).then(setStats).catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const fetchItems = React.useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search)     p.set("search", search);
    if (loaiFilter) p.set("loai", loaiFilter);
    if (ttFilter)   p.set("trangThai", ttFilter);
    p.set("page", String(page));
    fetch(`/api/plan-finance/assets?${p}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search, loaiFilter, ttFilter, page, refreshKey]); // eslint-disable-line

  React.useEffect(() => { fetchStats(); }, [fetchStats]);
  React.useEffect(() => { fetchItems(); }, [fetchItems]);
  React.useEffect(() => { setPage(1); }, [search, loaiFilter, ttFilter]);

  const refresh = () => { setRefreshKey(k => k + 1); fetchStats(); };

  const openAdd  = () => { setSelected(null); setIsAdd(true);  setOffcanvasOpen(true); };
  const openEdit = (a: Asset) => { setSelected(a); setIsAdd(false); setOffcanvasOpen(true); };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns: TableColumn<Asset>[] = [
    {
      header: "#", width: 28, align: "center",
      render: (_, i) => <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{(page - 1) * PAGE_SIZE + i + 1}</span>,
    },
    {
      header: "Tài sản",
      render: a => {
        const loaiMeta = LOAI_MAP[a.loai ?? "khac"];
        const color    = LOAI_COLOR[a.loai ?? "khac"] ?? "#94a3b8";
        return (
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.tenTaiSan}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              {a.code && <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{a.code}</span>}
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: `${color}18`, color }}>{loaiMeta?.label ?? a.loai}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Nguyên giá", width: 110, align: "right",
      render: a => <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(a.giaTriMua)}</span>,
    },
    {
      header: "Còn lại / KH", width: 120, align: "right",
      render: a => (
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(a.giaTriConLai)}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 10, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{fmtPct(a.khauHao)}/năm</span>
            <DepBar giaTriMua={a.giaTriMua} giaTriConLai={a.giaTriConLai} />
          </div>
        </div>
      ),
    },
    {
      header: "KH/tháng", width: 96, align: "right",
      render: a => (
        <span style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", whiteSpace: "nowrap" }}>
          {fmt(khauHaoThang(a))}
        </span>
      ),
    },
    {
      header: "Trạng thái", width: 112,
      render: a => <Badge value={a.trangThai} />,
    },
  ];

  return (
    <>
      <SplitLayoutPage
        title="Tài sản cố định"
        description="Quản lý tài sản, khấu hao và hao mòn phục vụ tính lợi nhuận"
        icon="bi-building"
        color="amber"

        leftTopContent={
          <div className="row g-2">
            <KPICard
              label="Tổng tài sản"
              value={statsLoading ? "—" : String(stats?.tongTaiSan ?? 0)}
              icon="bi-layers"
              accent="#6366f1"
              colClass="col-6"
              subtitle={statsLoading ? undefined : `${stats?.tongDangSuDung ?? 0} đang sử dụng`}
            />
            <KPICard
              label="Tổng nguyên giá"
              value={statsLoading ? "—" : fmt(stats?.tongNguyenGia ?? 0)}
              icon="bi-cash-coin"
              accent="#f59e0b"
              colClass="col-6"
            />
            <KPICard
              label="Giá trị còn lại"
              value={statsLoading ? "—" : fmt(stats?.tongConLai ?? 0)}
              icon="bi-graph-down"
              accent="#10b981"
              colClass="col-6"
              subtitle={statsLoading || !stats ? undefined :
                `${stats.tongNguyenGia > 0 ? ((stats.tongConLai / stats.tongNguyenGia) * 100).toFixed(1) : 0}% còn lại`}
            />
            <KPICard
              label="Khấu hao / tháng"
              value={statsLoading ? "—" : fmt(stats?.khauHaoThang ?? 0)}
              icon="bi-calendar-minus"
              accent="#f43f5e"
              colClass="col-6"
              subtitle={statsLoading ? undefined : `${fmt(stats?.khauHaoNam ?? 0)} / năm`}
            />
          </div>
        }

        leftContent={
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <SectionTitle title="Phân bổ theo loại tài sản" />
              {statsLoading
                ? <div style={{ height: 6 * 48 + 25, borderRadius: 8, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />
                : <BarChartHorizontal data={stats?.byLoaiChart ?? []} color="#f59e0b" />}
            </div>
            <div>
              <SectionTitle title="Phân bổ theo trạng thái" />
              {statsLoading
                ? <div style={{ height: 4 * 48 + 25, borderRadius: 8, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />
                : <BarChartHorizontal data={stats?.byStatusChart ?? []} color="#6366f1" />}
            </div>
          </div>
        }

        rightContent={
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 8 }}>
              <SectionTitle title="Danh sách tài sản" />
              <button
                onClick={refresh}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--muted-foreground)", flexShrink: 0 }}
                title="Làm mới"
              >
                <i className="bi bi-arrow-clockwise" />
              </button>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
              <GroupedLoaiSelect
                value={loaiFilter}
                onChange={setLoaiFilter}
              />
              <FilterSelect
                options={TT_OPTIONS}
                value={ttFilter}
                onChange={setTtFilter}
                placeholder="Trạng thái"
              />
              <SearchInput value={search} onChange={setSearch} placeholder="Tìm tài sản..." />
              <button
                onClick={openAdd}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
              >
                <i className="bi bi-plus-lg" /> Thêm mới
              </button>
            </div>

            {/* Summary */}
            {!loading && (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0 }}>
                {total > 0
                  ? `${total} tài sản · Nguyên giá: ${fmt(items.reduce((s, a) => s + a.giaTriMua, 0))} ₫`
                  : "Không có kết quả"}
              </div>
            )}

            {/* Table */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <Table
                rows={items}
                columns={columns}
                loading={loading}
                rowKey={a => a.id}
                onRowClick={openEdit}
                emptyIcon="bi-building"
                emptyText="Chưa có tài sản nào"
                minWidth={500}
                compact
              />
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        }
      />

      {offcanvasOpen && (
        <AssetOffcanvas
          item={isAdd ? null : selected}
          onClose={() => setOffcanvasOpen(false)}
          onSaved={() => refresh()}
          onDeleted={() => refresh()}
        />
      )}
    </>
  );
}
