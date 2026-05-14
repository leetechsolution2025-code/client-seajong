"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";

// ── Shared types ──────────────────────────────────────────────────────────────
type EmployeeOption = { id: string; fullName: string };
type CategoryOption = { id: string; code: string; name: string };

// ── Shared styled helpers ─────────────────────────────────────────────────────
const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 5 }}>
    {text}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", transition: "border-color 0.15s, box-shadow 0.15s", ...props.style }}
    onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)"; }}
    onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
  />
);

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    style={{ width: "100%", padding: "8px 28px 8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, cursor: "pointer", appearance: "none", outline: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 16 16'%3E%3Cpath fill='%23888' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", ...props.style }}
    onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
    onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
  >{children}</select>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  employees: EmployeeOption[];
  defaultEmployeeId?: string | null; // Employee.id của người đăng nhập → auto-select
}

// ── Component ─────────────────────────────────────────────────────────────────
export function TaoKhachHangMoiModal({ open, onClose, onCreated, employees, defaultEmployeeId }: Props) {
  const toast = useToast();

  const makeDefaultForm = () => ({
    ngayTao: new Date().toISOString().split("T")[0],
    nguoiChamSocId: defaultEmployeeId ?? "", nguon: "", nhom: "",
    ten: "", diaChi: "", daiDien: "", xungHo: "Anh", chucVu: "",
    dienThoai: "", email: "", ghiChu: "",
  });

  const [form, setForm] = React.useState(makeDefaultForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // ── Fetch categories từ DB ──────────────────────────────────────────────────
  const [nguonOptions, setNguonOptions] = React.useState<CategoryOption[]>([]);
  const [nhomOptions, setNhomOptions] = React.useState<CategoryOption[]>([]);

  React.useEffect(() => {
    fetch("/api/plan-finance/categories?type=customer_source")
      .then(r => r.json()).then(d => Array.isArray(d) && setNguonOptions(d)).catch(() => {});
    fetch("/api/plan-finance/categories?type=customer_group")
      .then(r => r.json()).then(d => Array.isArray(d) && setNhomOptions(d)).catch(() => {});
  }, []);

  // Reset form mỗi khi modal mở, giữ lại defaultEmployeeId nếu có trong danh sách CRM
  React.useEffect(() => {
    if (open) {
      // Chỉ auto-select nếu employee đó thực sự có trong danh sách
      const resolvedDefault = defaultEmployeeId && employees.some(e => e.id === defaultEmployeeId)
        ? defaultEmployeeId
        : "";
      setForm({ ...makeDefaultForm(), ngayTao: new Date().toISOString().split("T")[0], nguoiChamSocId: resolvedDefault });
      setError("");
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultEmployeeId, employees]);


  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.nguon) { setError("Vui lòng chọn nguồn"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/plan-finance/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.ten, address: form.diaChi, nguon: form.nguon, nhom: form.nhom,
          daiDien: form.daiDien, xungHo: form.xungHo, chucVu: form.chucVu,
          dienThoai: form.dienThoai, email: form.email, ghiChu: form.ghiChu, ngayTao: form.ngayTao,
          nguoiChamSocId: form.nguoiChamSocId || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi tạo khách hàng"); }
      toast.success("Tạo thành công", "Khách hàng mới đã được thêm vào danh sách");
      onCreated(); onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      setError(msg);
      toast.error("Tạo thất bại", msg);
    } finally { setSaving(false); }
  };

  // Nhóm "cá nhân" hoặc "khách lẻ" thì ẩn trường Tên (dùng theo Đại diện)
  const personalCodes = ["ca-nhan", "khach-le"];
  const isPersonal = personalCodes.includes(form.nhom);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000 }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: "fixed", inset: 0, margin: "auto", zIndex: 2001, width: "min(620px, calc(100vw - 32px))", height: "fit-content", maxHeight: "calc(100vh - 40px)", background: "var(--card)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb, #6366f1 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-person-plus" style={{ fontSize: 17, color: "#6366f1" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--foreground)" }}>Thêm khách hàng mới</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>Điền thông tin để tạo hồ sơ khách hàng</p>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-x" style={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><Label text="Ngày tạo" /><Input type="date" value={form.ngayTao} onChange={set("ngayTao")} /></div>
                <div>
                  <Label text="Người chăm sóc" />
                  <Select value={form.nguoiChamSocId} onChange={set("nguoiChamSocId")}>
                    <option value="">Chọn người chăm sóc...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </Select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label text="Nguồn" required />
                  <Select value={form.nguon} onChange={set("nguon")}>
                    <option value="">Chọn nguồn...</option>
                    {nguonOptions.map(o => (
                      <option key={o.id} value={o.code}>{o.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label text="Nhóm khách hàng" />
                  <Select value={form.nhom} onChange={set("nhom")}>
                    <option value="">Chọn nhóm...</option>
                    {nhomOptions.map(o => (
                      <option key={o.id} value={o.code}>{o.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div style={isPersonal ? { opacity: 0.45, pointerEvents: "none" } : {}}>
                <Label text="Tên khách hàng" />
                <Input placeholder={isPersonal ? "Điền tên theo Đại diện..." : "Nhập tên khách hàng..."} value={form.ten} onChange={set("ten")} disabled={isPersonal} />
              </div>

              <div><Label text="Địa chỉ" /><Input placeholder="Nhập địa chỉ..." value={form.diaChi} onChange={set("diaChi")} /></div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: 12 }}>
                <div><Label text="Đại diện" /><Input placeholder="Họ và tên đại diện..." value={form.daiDien} onChange={set("daiDien")} /></div>
                <div>
                  <Label text="Xưng hô" />
                  <Select value={form.xungHo} onChange={set("xungHo")}>
                    <option>Anh</option><option>Chị</option><option>Ông</option><option>Bà</option>
                  </Select>
                </div>
                <div style={isPersonal ? { opacity: 0.45, pointerEvents: "none" } : {}}>
                  <Label text="Chức vụ" /><Input placeholder="Chức vụ..." value={form.chucVu} onChange={set("chucVu")} disabled={isPersonal} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><Label text="Điện thoại" /><Input type="tel" placeholder="Số điện thoại..." value={form.dienThoai} onChange={set("dienThoai")} /></div>
                <div><Label text="Email" /><Input type="email" placeholder="Địa chỉ email..." value={form.email} onChange={set("email")} /></div>
              </div>

              <div>
                <Label text="Ghi chú" />
                <textarea rows={3} placeholder="Lưu ý về khách hàng..." value={form.ghiChu}
                  onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", transition: "border-color 0.15s" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              {error && <p style={{ margin: 0, fontSize: 12, color: "#f43f5e", textAlign: "right" }}>{error}</p>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <button style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: "var(--radius)", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground)"; }}
                ><i className="bi bi-cart3" style={{ fontSize: 14 }} /> Bán hàng</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={onClose} style={{ padding: "8px 18px", border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: "var(--radius)" }}>Đóng</button>
                  <button onClick={handleSubmit} disabled={saving} style={{ padding: "8px 20px", border: "none", background: saving ? "var(--muted)" : "var(--primary)", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", borderRadius: "var(--radius)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {saving ? <><i className="bi bi-arrow-repeat" style={{ fontSize: 14, animation: "spin 1s linear infinite" }} /> Đang lưu...</> : <><i className="bi bi-check2" style={{ fontSize: 15 }} /> Tạo khách hàng</>}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
