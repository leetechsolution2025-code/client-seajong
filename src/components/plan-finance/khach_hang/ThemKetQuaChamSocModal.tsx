"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import type { CareHistoryItem } from "@/components/ui/CareHistoryTimeline";

type EmployeeOption = { id: string; fullName: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (item: CareHistoryItem) => void;
  defaultNguoiChamSoc?: string;
  employees: EmployeeOption[];
  customerId: string | null;
  lastCare?: CareHistoryItem | null;
}

export function ThemKetQuaChamSocModal({
  open, onClose, onSaved, defaultNguoiChamSoc, employees, customerId, lastCare,
}: Props) {
  const toast = useToast();

  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  const DEFAULT = {
    ngayChamSoc: localISO,
    nguoiChamSocId: defaultNguoiChamSoc ?? "",
    nhuCau: "",
    nganSach: "",
    thoiGianDauTu: "",
    thanhToan: "",
    nguoiQuyetDinh: "",
    soDienThoai: "",
    thaiDo: "",
    hinhThuc: "",
    tomTat: "",
  };

  const [form, setForm] = React.useState(DEFAULT);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const lastCareRef = React.useRef(lastCare);
  lastCareRef.current = lastCare;

  const TYPE_TO_HINH_THUC: Record<string, string> = {
    call: "goi-dien", meeting: "gap-mat",
    message: "nhan-tin", email: "email", note: "khac",
  };
  const t2hRef = React.useRef(TYPE_TO_HINH_THUC);
  t2hRef.current = TYPE_TO_HINH_THUC;

  React.useEffect(() => {
    if (!open) return;

    const n = new Date();
    const iso = new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setForm({
      ...DEFAULT,
      ngayChamSoc: iso,
      nguoiChamSocId: defaultNguoiChamSoc ?? "",
      hinhThuc: lastCareRef.current ? (t2hRef.current[lastCareRef.current.type] ?? "") : "",
    });
    setErrors({});
    setSaving(false);

    if (customerId) {
      fetch(`/api/plan-finance/customers/${customerId}/care-history?limit=1`)
        .then(r => r.ok ? r.json() : null)
        .then((data: Array<{
          hinhThuc?: string; thaiDo?: string; nhuCau?: string;
          nganSach?: string; thoiGianDauTu?: string; thanhToan?: string;
          nguoiDaiDien?: string; soDienThoai?: string;
        }> | null) => {
          if (!data || data.length === 0) return;
          const lc = data[0];
          setForm(f => ({
            ...f,
            hinhThuc:       lc.hinhThuc       ?? f.hinhThuc,
            thaiDo:         lc.thaiDo         ?? f.thaiDo,
            nhuCau:         lc.nhuCau         ?? f.nhuCau,
            nganSach:       lc.nganSach       ?? f.nganSach,
            thoiGianDauTu:  lc.thoiGianDauTu  ?? f.thoiGianDauTu,
            thanhToan:      lc.thanhToan      ?? f.thanhToan,
            nguoiQuyetDinh: lc.nguoiDaiDien   ?? f.nguoiQuyetDinh,
            soDienThoai:    lc.soDienThoai    ?? f.soDienThoai,
            tomTat: "",
          }));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultNguoiChamSoc]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.ngayChamSoc) e.ngayChamSoc = "Bắt buộc";
    if (!form.nhuCau) e.nhuCau = "Bắt buộc";
    if (!form.nganSach) e.nganSach = "Bắt buộc";
    if (!form.thoiGianDauTu) e.thoiGianDauTu = "Bắt buộc";
    if (!form.thanhToan) e.thanhToan = "Bắt buộc";
    if (!form.thaiDo) e.thaiDo = "Bắt buộc";
    if (!form.hinhThuc) e.hinhThuc = "Bắt buộc";
    if (!form.tomTat.trim()) e.tomTat = "Bắt buộc";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const HINH_THUC_TO_TYPE: Record<string, string> = {
    "goi-dien": "call", "gap-mat": "meeting",
    "nhan-tin": "message", "email": "email", "khac": "note",
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!customerId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plan-finance/customers/${customerId}/care-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngayChamSoc: form.ngayChamSoc,
          nguoiChamSocId: form.nguoiChamSocId || null,
          hinhThuc: form.hinhThuc,
          thaiDo: form.thaiDo || null,
          nhuCau: form.nhuCau || null,
          nganSach: form.nganSach || null,
          thoiGianDauTu: form.thoiGianDauTu || null,
          thanhToan: form.thanhToan || null,
          nguoiDaiDien: form.nguoiQuyetDinh || null,
          soDienThoai: form.soDienThoai || null,
          tomTat: form.tomTat,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi lưu"); }
      const record = await res.json();
      const item: CareHistoryItem = {
        id: record.id,
        date: new Date(record.ngayChamSoc).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit",
          year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
        }),
        rawDate: record.ngayChamSoc,
        type: HINH_THUC_TO_TYPE[record.hinhThuc] ?? "note",
        note: record.tomTat,
        user: record.nguoiChamSoc?.fullName ?? "Nhân viên",
      };
      toast.success("Đã lưu", "Kết quả chăm sóc đã được ghi nhận");
      onSaved(item);
      onClose();
    } catch (e) {
      toast.error("Lỗi", e instanceof Error ? e.message : "Không thể lưu kết quả");
    } finally {
      setSaving(false);
    }
  };

  const FLabel = ({ text, required }: { text: string; required?: boolean }) => (
    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", display: "block", marginBottom: 5 }}>
      {text}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
    </label>
  );
  const errStyle = (k: string): React.CSSProperties =>
    errors[k] ? { borderColor: "#f43f5e", boxShadow: "0 0 0 3px rgba(244,63,94,0.12)" } : {};

  const fInput = (k: keyof typeof form, cfg?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...cfg}
      value={form[k]}
      onChange={set(k)}
      style={{
        width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
        background: "var(--background)", color: "var(--foreground)",
        fontSize: 13, outline: "none", borderRadius: "var(--radius)",
        transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "inherit",
        ...errStyle(k), ...cfg?.style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)"; }}
      onBlur={e => { if (!errors[k]) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; } }}
    />
  );

  const fSelect = (k: keyof typeof form, children: React.ReactNode) => (
    <select
      value={form[k]}
      onChange={set(k)}
      style={{
        width: "100%", padding: "8px 28px 8px 10px", border: "1px solid var(--border)",
        background: "var(--background)", color: "var(--foreground)",
        fontSize: 13, cursor: "pointer", appearance: "none", outline: "none",
        borderRadius: "var(--radius)", fontFamily: "inherit",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 16 16'%3E%3Cpath fill='%23888' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
        transition: "border-color 0.15s", ...errStyle(k),
      }}
      onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
      onBlur={e => { if (!errors[k]) e.currentTarget.style.borderColor = "var(--border)"; }}
    >{children}</select>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2100 }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "fixed", inset: 0, margin: "auto", zIndex: 2101,
              width: "min(500px, calc(100vw - 32px))",
              height: "fit-content", maxHeight: "calc(100vh - 40px)",
              background: "var(--card)", borderRadius: 16,
              boxShadow: "0 24px 64px rgba(0,0,0,0.24)",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb, #6366f1 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-clipboard2-pulse" style={{ fontSize: 17, color: "#6366f1" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--foreground)" }}>Thêm kết quả chăm sóc</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>Ghi nhận kết quả buổi chăm sóc khách hàng</p>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-x" style={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Row 1: Ngày chăm sóc + Người chăm sóc */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <FLabel text="Ngày chăm sóc" required />
                  {fInput("ngayChamSoc", { type: "datetime-local" })}
                  {errors.ngayChamSoc && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{errors.ngayChamSoc}</p>}
                </div>
                <div>
                  <FLabel text="Người chăm sóc" />
                  {fSelect("nguoiChamSocId",
                    <>
                      <option value="">-- Chọn --</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                    </>
                  )}
                </div>
              </div>

              {/* Row 2: Nhu cầu + Ngân sách */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <FLabel text="Nhu cầu" required />
                  {fSelect("nhuCau",
                    <>
                      <option value="">-- Chọn --</option>
                      <option value="cao">Cao</option>
                      <option value="trung-binh">Trung bình</option>
                      <option value="thap">Thấp</option>
                      <option value="chua-xac-dinh">Chưa xác định</option>
                    </>
                  )}
                  {errors.nhuCau && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{errors.nhuCau}</p>}
                </div>
                <div>
                  <FLabel text="Ngân sách" required />
                  {fSelect("nganSach",
                    <>
                      <option value="">-- Chọn --</option>
                      <option value="duoi-100">Dưới 100 triệu</option>
                      <option value="100-500">100 – 500 triệu</option>
                      <option value="tren-500">Trên 500 triệu</option>
                      <option value="chua-xac-dinh">Chưa xác định</option>
                    </>
                  )}
                  {errors.nganSach && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{errors.nganSach}</p>}
                </div>
              </div>

              {/* Row 3: Thời gian đầu tư + Thanh toán */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <FLabel text="Thời gian đầu tư" required />
                  {fSelect("thoiGianDauTu",
                    <>
                      <option value="">-- Chọn --</option>
                      <option value="ngay-lap-tuc">Ngay lập tức</option>
                      <option value="1-3-thang">1 – 3 tháng</option>
                      <option value="3-6-thang">3 – 6 tháng</option>
                      <option value="tren-6-thang">Trên 6 tháng</option>
                      <option value="chua-xac-dinh">Chưa xác định</option>
                    </>
                  )}
                  {errors.thoiGianDauTu && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{errors.thoiGianDauTu}</p>}
                </div>
                <div>
                  <FLabel text="Thanh toán" required />
                  {fSelect("thanhToan",
                    <>
                      <option value="">-- Chọn --</option>
                      <option value="tien-mat">Tiền mặt</option>
                      <option value="chuyen-khoan">Chuyển khoản</option>
                      <option value="tra-gop">Trả góp</option>
                      <option value="khac">Khác</option>
                    </>
                  )}
                  {errors.thanhToan && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{errors.thanhToan}</p>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <FLabel text="Người đại diện" />
                  {fInput("nguoiQuyetDinh", { placeholder: "Họ và tên..." })}
                </div>
                <div>
                  <FLabel text="Số điện thoại người đại diện" />
                  {fInput("soDienThoai", { type: "tel", placeholder: "0xxx..." })}
                </div>
              </div>

              {/* Row 5: Thái độ + Hình thức */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <FLabel text="Thái độ khách hàng" required />
                  {fSelect("thaiDo",
                    <>
                      <option value="">-- Chọn --</option>
                      <option value="tich-cuc">Tích cực</option>
                      <option value="trung-lap">Trung lập</option>
                      <option value="tieu-cuc">Tiêu cực</option>
                      <option value="do-du">Do dự</option>
                    </>
                  )}
                  {errors.thaiDo && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{errors.thaiDo}</p>}
                </div>
                <div>
                  <FLabel text="Hình thức tương tác" required />
                  {fSelect("hinhThuc",
                    <>
                      <option value="">-- Chọn --</option>
                      <option value="goi-dien">Gọi điện</option>
                      <option value="gap-mat">Gặp mặt trực tiếp</option>
                      <option value="nhan-tin">Nhắn tin</option>
                      <option value="email">Gửi Email</option>
                      <option value="khac">Khác</option>
                    </>
                  )}
                  {errors.hinhThuc && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{errors.hinhThuc}</p>}
                </div>
              </div>

              {/* Row 6: Tóm tắt */}
              <div>
                <FLabel text="Tóm tắt kết quả" required />
                <textarea
                  rows={4}
                  placeholder="Mô tả ngắn gọn kết quả buổi chăm sóc..."
                  value={form.tomTat}
                  onChange={e => setForm(f => ({ ...f, tomTat: e.target.value }))}
                  style={{
                    width: "100%", padding: "8px 10px", border: `1px solid ${errors.tomTat ? "#f43f5e" : "var(--border)"}`,
                    background: "var(--background)", color: "var(--foreground)",
                    fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit",
                    borderRadius: "var(--radius)", transition: "border-color 0.15s",
                    boxShadow: errors.tomTat ? "0 0 0 3px rgba(244,63,94,0.12)" : "none",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)"; }}
                  onBlur={e => { if (!errors.tomTat) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; } }}
                />
                {errors.tomTat && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{errors.tomTat}</p>}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
              <button onClick={onClose} style={{ padding: "9px 20px", border: "1.5px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: "var(--radius)" }}>Đóng</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "9px 22px", border: "none", background: saving ? "var(--muted)" : "var(--primary)", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", borderRadius: "var(--radius)", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang lưu...</> : <><i className="bi bi-check2" /> Lưu kết quả</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
