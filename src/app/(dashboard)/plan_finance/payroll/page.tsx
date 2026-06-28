"use client";
import React from "react";
import { SplitLayoutPage }     from "@/components/layout/SplitLayoutPage";
import { SectionTitle }        from "@/components/ui/SectionTitle";
import { KPICard }             from "@/components/ui/KPICard";
import { BarChartHorizontal }  from "@/components/ui/charts/BarChartHorizontal";
import { SearchInput }         from "@/components/ui/SearchInput";
import { FilterSelect, SELECT_STYLE } from "@/components/ui/FilterSelect";
import { Table, TableColumn }  from "@/components/ui/Table";
import { Pagination }          from "@/components/ui/Pagination";
import { useToast }            from "@/components/ui/Toast";
import { ConfirmDialog }       from "@/components/ui/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PayrollEmployee {
  id: string; fullName: string; code: string;
  departmentCode: string; departmentName: string; position: string;
}
interface Payroll {
  id: string; nam: number; thang: number;
  employee: PayrollEmployee;
  ngayCong: number; ngayNghiPhep: number; ngayNghiKhac: number; gioLamThem: number;
  luongCoBan: number; phuCap: number; thuong: number; luongLamThem: number;
  khauTruBH: number; thueTNCN: number; khauTruKhac: number;
  luongThucNhan: number; chiPhiCtyDong: number; tongChiPhiCty: number;
  trangThai: string; ngayTra: string | null; ghiChu: string | null;
}
interface Stats {
  tongNhanVien: number;
  tongLuongThucNhan: number;
  tongChiPhiCty: number;
  tongBH: number;
  tongThueTNCN: number;
  byTrangThai: { label: string; value: number }[];
}
interface EmployeeOption { id: string; fullName: string; code: string; departmentName: string; baseSalary: number | null; mealAllowance: number | null; fuelAllowance: number | null; phoneAllowance: number | null; }

// ── Constants ─────────────────────────────────────────────────────────────────
const TT_META: Record<string, { label: string; color: string; bg: string }> = {
  "chua-tra": { label: "Chưa trả",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  "da-tra":   { label: "Đã trả",    color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  "tam-ung":  { label: "Tạm ứng",   color: "#6366f1", bg: "rgba(99,102,241,0.1)"  },
};
const TT_OPTIONS = [
  { value: "chua-tra", label: "Chưa trả" },
  { value: "da-tra",   label: "Đã trả" },
  { value: "tam-ung",  label: "Tạm ứng" },
];

const now = new Date();
const CUR_MONTH = now.getMonth() + 1;
const CUR_YEAR  = now.getFullYear();

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n: number) => Math.round(n).toLocaleString("vi-VN");
const fmtMini = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} tỷ`;
  if (n >= 1_000_000)     return `${Math.round(n / 1_000_000)} tr`;
  return fmt(n);
};

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ value }: { value: string }) {
  const m = TT_META[value] ?? { label: value, color: "var(--muted-foreground)", bg: "var(--muted)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

// ── Form / Offcanvas ──────────────────────────────────────────────────────────
interface FormState {
  employeeId: string; thang: string; nam: string;
  nguonChamCong: string;
  ngayCong: string; ngayNghiPhep: string; ngayNghiKhac: string; gioLamThem: string;
  luongCoBan: string; phuCap: string; thuong: string; luongLamThem: string;
  khauTruBH: string; thueTNCN: string; khauTruKhac: string;
  trangThai: string; ngayTra: string; ghiChu: string;
}
const EMPTY: FormState = {
  employeeId: "", thang: String(CUR_MONTH), nam: String(CUR_YEAR),
  nguonChamCong: "thu-cong",
  ngayCong: "22", ngayNghiPhep: "0", ngayNghiKhac: "0", gioLamThem: "0",
  luongCoBan: "", phuCap: "", thuong: "0", luongLamThem: "0",
  khauTruBH: "", thueTNCN: "0", khauTruKhac: "0",
  trangThai: "chua-tra", ngayTra: "", ghiChu: "",
};

function PayrollOffcanvas({
  item, employees, onClose, onSaved, onDeleted,
}: {
  item: Payroll | null;
  employees: EmployeeOption[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const toast    = useToast();
  const isEdit   = !!item;
  const [form, setForm]         = React.useState<FormState>(EMPTY);
  const [saving, setSaving]     = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);

  // Preview tính toán
  const cb   = parseFloat(form.luongCoBan)    || 0;
  const pc   = parseFloat(form.phuCap)        || 0;
  const tw   = parseFloat(form.thuong)        || 0;
  const lt   = parseFloat(form.luongLamThem)  || 0;
  const bh   = parseFloat(form.khauTruBH)     || 0;
  const tax  = parseFloat(form.thueTNCN)      || 0;
  const kk   = parseFloat(form.khauTruKhac)   || 0;
  const thucNhan  = (cb + pc + tw + lt) - bh - tax - kk;
  const ctyDong   = cb * 0.235;
  const tongCty   = thucNhan + ctyDong;

  React.useEffect(() => {
    if (item) {
      setForm({
        employeeId: item.employee.id, thang: String(item.thang), nam: String(item.nam),
        nguonChamCong: (item as Payroll & { nguonChamCong?: string }).nguonChamCong ?? "thu-cong",
        ngayCong: String(item.ngayCong), ngayNghiPhep: String(item.ngayNghiPhep),
        ngayNghiKhac: String(item.ngayNghiKhac), gioLamThem: String(item.gioLamThem),
        luongCoBan: String(item.luongCoBan), phuCap: String(item.phuCap),
        thuong: String(item.thuong), luongLamThem: String(item.luongLamThem),
        khauTruBH: String(item.khauTruBH), thueTNCN: String(item.thueTNCN),
        khauTruKhac: String(item.khauTruKhac),
        trangThai: item.trangThai, ngayTra: item.ngayTra?.slice(0, 10) ?? "", ghiChu: item.ghiChu ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [item]);

  // Auto-fill khi chọn nhân viên
  const onEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) { setForm(prev => ({ ...prev, employeeId: empId })); return; }
    const cb0   = emp.baseSalary       || 0;
    const meal  = emp.mealAllowance    || 0;
    const fuel  = emp.fuelAllowance    || 0;
    const phone = emp.phoneAllowance   || 0;
    const bh0   = Math.round(cb0 * 0.105);
    setForm(prev => ({
      ...prev, employeeId: empId,
      luongCoBan: String(cb0),
      phuCap:     String(meal + fuel + phone),
      khauTruBH:  String(bh0),
    }));
  };

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.employeeId) { toast.error("Thiếu thông tin", "Chọn nhân viên"); return; }
    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/plan-finance/payroll/${item!.id}` : "/api/plan-finance/payroll",
        { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }
      );
      const data = await res.json();
      if (!res.ok) { toast.error("Lỗi", data.error ?? "Không thể lưu"); return; }
      toast.success(isEdit ? "Đã cập nhật" : "Đã tạo bảng lương", `Tháng ${form.thang}/${form.nam}`);
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/plan-finance/payroll/${item!.id}`, { method: "DELETE" });
      toast.success("Đã xoá", "Bảng lương đã được xoá");
      onDeleted?.();
      onClose();
    } finally { setDeleting(false); setConfirmDel(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
    borderRadius: 8, background: "var(--background)", color: "var(--foreground)",
    fontSize: 13, fontFamily: "inherit",
  };
  const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
  const Divider = ({ label }: { label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1040, background: "rgba(0,0,0,0.3)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 460, zIndex: 1050,
        background: "var(--card)", borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.14)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-person-check" style={{ fontSize: 16, color: "#6366f1" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{isEdit ? "Chỉnh sửa bảng lương" : "Tạo bảng lương"}</p>
            {isEdit && <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>
              {item.employee.fullName} · T{item.thang}/{item.nam}
            </p>}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 17 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Divider label="Thông tin" />
          <Field label="Nhân viên" required>
            <select style={{ ...SELECT_STYLE, width: "100%", padding: "8px 28px 8px 10px" }}
              value={form.employeeId} onChange={e => onEmployeeChange(e.target.value)}
              disabled={isEdit}
            >
              <option value="">-- Chọn nhân viên --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.fullName} ({e.departmentName})</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Tháng" required>
              <input type="number" style={inputStyle} value={form.thang} onChange={set("thang")} min={1} max={12} disabled={isEdit} />
            </Field>
            <Field label="Năm" required>
              <input type="number" style={inputStyle} value={form.nam} onChange={set("nam")} min={2020} max={2099} disabled={isEdit} />
            </Field>
          </div>

          <Divider label="Chấm công" />

          {/* Toggle nguồn chấm công */}
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1.5px solid var(--border)", flexShrink: 0 }}>
            {[
              { value: "thu-cong",      label: "✏️ Nhập thủ công",       icon: "bi-pencil-square" },
              { value: "may-cham-cong", label: "⏱ Máy chấm công",   icon: "bi-fingerprint" },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, nguonChamCong: opt.value }))}
                style={{
                  flex: 1, padding: "8px 6px", border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: form.nguonChamCong === opt.value ? "#6366f1" : "var(--muted)",
                  color:      form.nguonChamCong === opt.value ? "#fff"    : "var(--muted-foreground)",
                  transition: "all 0.15s",
                }}
              >
                <i className={`bi ${opt.icon}`} />{opt.label}
              </button>
            ))}
          </div>

          {/* Nhập thủ công */}
          {form.nguonChamCong === "thu-cong" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Ngày công">
                <input type="number" style={inputStyle} value={form.ngayCong} onChange={set("ngayCong")} min={0} max={31} step={0.5} />
              </Field>
              <Field label="Nghỉ phép (ngày)">
                <input type="number" style={inputStyle} value={form.ngayNghiPhep} onChange={set("ngayNghiPhep")} min={0} step={0.5} />
              </Field>
              <Field label="Nghỉ khác (ngày)">
                <input type="number" style={inputStyle} value={form.ngayNghiKhac} onChange={set("ngayNghiKhac")} min={0} step={0.5} />
              </Field>
              <Field label="Làm thêm (giờ)">
                <input type="number" style={inputStyle} value={form.gioLamThem} onChange={set("gioLamThem")} min={0} step={0.5} />
              </Field>
            </div>
          )}

          {/* Máy chấm công */}
          {form.nguonChamCong === "may-cham-cong" && (
            <div style={{ borderRadius: 12, border: "1.5px dashed var(--border)", padding: "20px 16px", textAlign: "center", background: "rgba(99,102,241,0.03)" }}>
              <i className="bi bi-fingerprint" style={{ fontSize: 32, color: "#6366f1", display: "block", marginBottom: 10 }} />
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 13, color: "var(--foreground)" }}>Dữ liệu từ máy chấm công</p>
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                Tháng {form.thang}/{form.nam} · Nhân viên đã chọn
              </p>
              <button
                type="button"
                onClick={() => {
                  // TODO: Kết nối API máy chấm công
                  // Tạm thời nhập thủ công với dữ liệu hiện có
                  setForm(prev => ({ ...prev, ngayCong: "22", ngayNghiPhep: "0", ngayNghiKhac: "0", gioLamThem: "0" }));
                }}
                style={{ padding: "8px 18px", borderRadius: 8, border: "1.5px solid #6366f1", background: "rgba(99,102,241,0.08)", color: "#6366f1", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <i className="bi bi-cloud-download" /> Tải dữ liệu chấm công
              </button>
              {/* Hiển thị kết quả sau khi tải */}
              {parseFloat(form.ngayCong) > 0 && (
                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, textAlign: "left" }}>
                  {[
                    { label: "Ngày công",     val: form.ngayCong },
                    { label: "Nghỉ phép",     val: `${form.ngayNghiPhep} ngày` },
                    { label: "Nghỉ khác",     val: `${form.ngayNghiKhac} ngày` },
                    { label: "Làm thêm",      val: `${form.gioLamThem}h OT` },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--background)", border: "1px solid var(--border)" }}>
                      <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Divider label="Lương & Phụ cấp" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Lương cơ bản (₫)">
              <input type="number" style={inputStyle} value={form.luongCoBan} onChange={set("luongCoBan")} min={0} />
            </Field>
            <Field label="Tổng phụ cấp (₫)">
              <input type="number" style={inputStyle} value={form.phuCap} onChange={set("phuCap")} min={0} />
            </Field>
            <Field label="Thưởng (₫)">
              <input type="number" style={inputStyle} value={form.thuong} onChange={set("thuong")} min={0} />
            </Field>
            <Field label="Lương làm thêm (₫)">
              <input type="number" style={inputStyle} value={form.luongLamThem} onChange={set("luongLamThem")} min={0} />
            </Field>
          </div>

          <Divider label="Khấu trừ" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="BHXH+BHYT+BHTN (₫)">
              <input type="number" style={inputStyle} value={form.khauTruBH} onChange={set("khauTruBH")} min={0} />
            </Field>
            <Field label="Thuế TNCN (₫)">
              <input type="number" style={inputStyle} value={form.thueTNCN} onChange={set("thueTNCN")} min={0} />
            </Field>
            <Field label="Khấu trừ khác (₫)">
              <input type="number" style={inputStyle} value={form.khauTruKhac} onChange={set("khauTruKhac")} min={0} />
            </Field>
          </div>

          {/* Preview */}
          {cb > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)" }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <i className="bi bi-calculator me-1" /> Kết quả tính toán
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "Thực nhận", val: thucNhan, color: "#10b981", bold: true },
                  { label: "BH công ty đóng", val: ctyDong, color: "var(--muted-foreground)" },
                  { label: "Tổng chi phí cty", val: tongCty, color: "#f43f5e", bold: true },
                ].map(({ label, val, color, bold }) => (
                  <div key={label}>
                    <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: bold ? 800 : 600, color }}>{fmt(val)} ₫</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Divider label="Thanh toán" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Trạng thái">
              <select style={{ ...SELECT_STYLE, width: "100%", padding: "8px 28px 8px 10px" }} value={form.trangThai} onChange={set("trangThai")}>
                {TT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Ngày trả">
              <input type="date" style={inputStyle} value={form.ngayTra} onChange={set("ngayTra")} />
            </Field>
          </div>
          <Field label="Ghi chú">
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.ghiChu} onChange={set("ghiChu")} />
          </Field>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>
          {isEdit && (
            <button onClick={() => setConfirmDel(true)} style={{ width: 38, height: 38, border: "1.5px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.06)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#f43f5e", flexShrink: 0 }}>
              <i className="bi bi-trash" style={{ fontSize: 14 }} />
            </button>
          )}
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
            Huỷ
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "9px 0", border: "none", background: saving ? "var(--muted)" : "#6366f1", color: saving ? "var(--muted-foreground)" : "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {saving ? "Đang lưu..." : isEdit ? <><i className="bi bi-check-lg" />Cập nhật</> : <><i className="bi bi-plus-lg" />Tạo bảng lương</>}
          </button>
        </div>
      </div>
      <ConfirmDialog open={confirmDel} variant="danger" title="Xoá bảng lương?" message="Dữ liệu sẽ bị xoá vĩnh viễn." confirmLabel="Xoá" loading={deleting} onConfirm={handleDelete} onCancel={() => setConfirmDel(false)} />
    </>
  );
}

// ── Months / Years helpers ────────────────────────────────────────────────────
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));
const YEARS  = Array.from({ length: 5  }, (_, i) => ({ value: String(CUR_YEAR - i), label: String(CUR_YEAR - i) }));

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

export default function PayrollPage() {
  const [stats,        setStats]        = React.useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [items,        setItems]        = React.useState<Payroll[]>([]);
  const [total,        setTotal]        = React.useState(0);
  const [loading,      setLoading]      = React.useState(true);
  const [page,         setPage]         = React.useState(1);
  const [search,       setSearch]       = React.useState("");
  const [thangFilter,  setThangFilter]  = React.useState(String(CUR_MONTH));
  const [namFilter,    setNamFilter]    = React.useState(String(CUR_YEAR));
  const [ttFilter,     setTtFilter]     = React.useState("");
  const [employees,    setEmployees]    = React.useState<EmployeeOption[]>([]);
  const [selected,     setSelected]     = React.useState<Payroll | null>(null);
  const [offOpen,      setOffOpen]      = React.useState(false);
  const [isAdd,        setIsAdd]        = React.useState(false);
  const [refreshKey,   setRefreshKey]   = React.useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fetch employees for select (cần baseSalary + allowances để auto-fill)
  React.useEffect(() => {
    fetch("/api/plan-finance/payroll/employees")
      .then(r => r.json())
      .then(d => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => setEmployees([]));
  }, []);

  const fetchStats = React.useCallback(() => {
    setStatsLoading(true);
    const p = new URLSearchParams();
    if (thangFilter) p.set("thang", thangFilter);
    if (namFilter)   p.set("nam",   namFilter);
    fetch(`/api/plan-finance/payroll/stats?${p}`)
      .then(r => r.json()).then(setStats).catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [thangFilter, namFilter]);

  const fetchItems = React.useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (thangFilter) p.set("thang",    thangFilter);
    if (namFilter)   p.set("nam",      namFilter);
    if (ttFilter)    p.set("trangThai",ttFilter);
    if (search)      p.set("search",   search);
    p.set("page", String(page));
    fetch(`/api/plan-finance/payroll?${p}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [thangFilter, namFilter, ttFilter, search, page, refreshKey]); // eslint-disable-line

  React.useEffect(() => { fetchStats(); }, [fetchStats]);
  React.useEffect(() => { fetchItems(); }, [fetchItems]);
  React.useEffect(() => { setPage(1); }, [thangFilter, namFilter, ttFilter, search]);

  const refresh = () => { setRefreshKey(k => k + 1); fetchStats(); };
  const openAdd  = () => { setSelected(null); setIsAdd(true);  setOffOpen(true); };
  const openEdit = (p: Payroll) => { setSelected(p); setIsAdd(false); setOffOpen(true); };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns: TableColumn<Payroll>[] = [
    {
      header: "#", width: 28, align: "center",
      render: (_, i) => <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{(page - 1) * PAGE_SIZE + i + 1}</span>,
    },
    {
      header: "Nhân viên",
      render: p => (
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{p.employee.fullName}</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{p.employee.departmentName}</p>
        </div>
      ),
    },
    {
      header: "Tháng", width: 72, align: "center",
      render: p => <span style={{ fontWeight: 700, fontSize: 12 }}>T{p.thang}/{p.nam}</span>,
    },
    {
      header: "Ngày công", width: 80, align: "center",
      render: p => (
        <div style={{ textAlign: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{p.ngayCong}</span>
          {p.gioLamThem > 0 && <p style={{ margin: 0, fontSize: 10, color: "#f59e0b" }}>+{p.gioLamThem}h OT</p>}
        </div>
      ),
    },
    {
      header: "Lương CB", width: 100, align: "right",
      render: p => <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(p.luongCoBan)}</span>,
    },
    {
      header: "Thực nhận", width: 110, align: "right",
      render: p => <span style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>{fmt(p.luongThucNhan)}</span>,
    },
    {
      header: "Tổng chi phí cty", width: 120, align: "right",
      render: p => <span style={{ fontSize: 12, fontWeight: 600, color: "#f43f5e" }}>{fmt(p.tongChiPhiCty)}</span>,
    },
    {
      header: "Trạng thái", width: 104,
      render: p => <Badge value={p.trangThai} />,
    },
  ];

  // Phần trăm đã trả
  const pctDaTra = stats && stats.tongLuongThucNhan > 0
    ? ((items.filter(i => i.trangThai === "da-tra").reduce((s, i) => s + i.luongThucNhan, 0) / stats.tongLuongThucNhan) * 100).toFixed(0)
    : "0";

  return (
    <>
      <SplitLayoutPage
        title="Chấm công & Lương"
        description="Theo dõi bảng lương, chấm công và chi phí nhân sự hàng tháng"
        icon="bi-person-check"
        color="indigo"

        leftTopContent={
          <div className="row g-2">
            <KPICard label="Nhân viên trong kỳ"   value={statsLoading ? "—" : String(stats?.tongNhanVien ?? 0)}           icon="bi-people"       accent="#6366f1" colClass="col-6" />
            <KPICard label="Tổng lương thực nhận"  value={statsLoading ? "—" : fmtMini(stats?.tongLuongThucNhan ?? 0)}     icon="bi-cash-coin"    accent="#10b981" colClass="col-6" />
            <KPICard label="Tổng chi phí nhân sự"  value={statsLoading ? "—" : fmtMini(stats?.tongChiPhiCty ?? 0)}         icon="bi-graph-up"     accent="#f43f5e" colClass="col-6"
              subtitle={statsLoading ? undefined : `= lương + ${fmtMini((stats?.tongChiPhiCty ?? 0) - (stats?.tongLuongThucNhan ?? 0))} BH cty`} />
            <KPICard label="Đã thanh toán"         value={statsLoading ? "—" : `${pctDaTra}%`}                             icon="bi-check-circle" accent="#f59e0b" colClass="col-6" />
          </div>
        }

        leftContent={
          <div>
            <SectionTitle title="Theo trạng thái" />
            {statsLoading
              ? <div style={{ height: 3 * 48 + 25, borderRadius: 8, background: "var(--muted)", animation: "pulse 1.5s infinite" }} />
              : <BarChartHorizontal data={stats?.byTrangThai ?? []} color="#6366f1" />}
          </div>
        }

        rightContent={
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <SectionTitle title="Danh sách bảng lương" />
              <button onClick={refresh} title="Làm mới" style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--muted-foreground)", flexShrink: 0 }}>
                <i className="bi bi-arrow-clockwise" />
              </button>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
              <select style={{ ...SELECT_STYLE }} value={thangFilter} onChange={e => setThangFilter(e.target.value)}>
                <option value="">Tất cả tháng</option>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select style={{ ...SELECT_STYLE }} value={namFilter} onChange={e => setNamFilter(e.target.value)}>
                {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
              </select>
              <FilterSelect options={TT_OPTIONS} value={ttFilter} onChange={setTtFilter} placeholder="Trạng thái" />
              <SearchInput value={search} onChange={setSearch} placeholder="Tìm nhân viên..." />
              <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                <i className="bi bi-plus-lg" /> Thêm
              </button>
            </div>

            {!loading && total > 0 && (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0 }}>
                {total} bản ghi · Thực nhận: {fmtMini(items.reduce((s, i) => s + i.luongThucNhan, 0))} ₫ · Chi phí cty: {fmtMini(items.reduce((s, i) => s + i.tongChiPhiCty, 0))} ₫
              </div>
            )}

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <Table
                rows={items} columns={columns} loading={loading}
                rowKey={p => p.id} onRowClick={openEdit}
                emptyIcon="bi-person-check" emptyText="Chưa có bảng lương nào"
                minWidth={600} compact
              />
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        }
      />

      {offOpen && (
        <PayrollOffcanvas
          item={isAdd ? null : selected}
          employees={employees}
          onClose={() => setOffOpen(false)}
          onSaved={refresh}
          onDeleted={refresh}
        />
      )}
    </>
  );
}
