"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { SearchInput } from "@/components/ui/SearchInput";
import { genDocCode } from "@/lib/genDocCode";

// ── Types ─────────────────────────────────────────────────────────────────────
type CategoryTypeDef = {
  id: string; value: string; label: string; icon: string;
  color: string; prefix: string; sortOrder: number; isSystem: boolean; isActive: boolean;
};

type CategoryRow = {
  id: string; type: string; code: string; name: string;
  color: string | null; icon: string | null; description: string | null;
  sortOrder: number; isActive: boolean; createdAt: string;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
};

type FormState = {
  code: string; name: string; color: string; icon: string; description: string; sortOrder: string; isActive: boolean; parentId: string;
};

const EMPTY_FORM: FormState = { code: "", name: "", color: "#6366f1", icon: "", description: "", sortOrder: "1", isActive: true, parentId: "" };
const EMPTY_TYPE_FORM = { value: "", label: "", icon: "bi-folder", color: "#6366f1", prefix: "" };

// ── Helper components ─────────────────────────────────────────────────────────
const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 5 }}>
    {text}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props}
    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", transition: "border-color 0.15s, box-shadow 0.15s", ...props.style }}
    onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)"; }}
    onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
  />
);

// ── Modal thêm loại danh mục mới ───────────────────────────────────────────────────
// helpers

/** Bỏ dấu tiếng Việt → slug an toàn, vd: "Trạng thái" → "trang_thai" */
function toSlug(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // bỏ combining diacritics
    .replace(/đ/g, "d").replace(/Đ/g, "D")  // đ/Đ không qua NFD
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");  // trim underscores
}
function autoPrefix(label: string): string {
  return label.trim()
    .split(/\s+/)
    .map(w => w[0] ?? "")
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4) || "CAT";
}

const ICON_MAP: [string[], string][] = [
  // Liên lạc / Chăm sóc
  [["gọi điện", "điện thoại", "gọi", "phone", "call"],    "bi-telephone"],
  [["email", "thư điện tử", "mail", "e-mail"],             "bi-envelope"],
  [["sms", "nhắn tin", "tin nhắn", "zalo", "messenger"],   "bi-chat-dots"],
  [["gặp mặt", "trực tiếp", "gặp"],                        "bi-person-walking"],
  [["online", "trực tuyến", "mạng xã hội", "social"],      "bi-globe"],
  [["chăm sóc", "hỗ trợ"],                                  "bi-chat-heart"],
  // Tài chính
  [["tài chính", "doanh thu", "tiền", "ngân sách", "thu"],  "bi-cash-coin"],
  [["chi phí", "chi tiêu"],                                  "bi-receipt"],
  [["thanh toán", "payment"],                                "bi-credit-card-2-front"],
  [["công nợ", "nợ"],                                        "bi-wallet2"],
  [["lương", "thưởng", "phúc lợi"],                         "bi-currency-dollar"],
  // Tài sản / Kho
  [["tài sản", "cố định"],                                   "bi-building-gear"],
  [["hàng hoá", "sản phẩm", "hàng hóa"],                    "bi-box-seam"],
  [["kho", "tồn kho"],                                       "bi-archive"],
  [["đơn hàng", "đặt hàng", "đơn"],                         "bi-bag-check"],
  // Hợp đồng / Tài liệu
  [["hợp đồng"],                                             "bi-file-earmark-text"],
  [["tài liệu", "giấy tờ", "báo cáo", "văn bản"],           "bi-file-text"],
  [["phê duyệt", "phê"],                                     "bi-check-circle"],
  // Nhân sự
  [["nhân sự", "nhân viên"],                                 "bi-people"],
  [["chức danh", "vị trí", "chức vụ"],                       "bi-person-badge"],
  [["khách hàng", "khách"],                                  "bi-person-vcard"],
  [["đối tác", "partner"],                                   "bi-handshake"],
  // Ca làm việc / Lịch
  [["ca làm", "ca làm việc"],                                "bi-clock-history"],
  [["lịch", "kế hoạch", "timeline"],                        "bi-calendar3"],
  [["nghỉ phép", "nghỉ"],                                    "bi-calendar-x"],
  // Địa lý
  [["địa chỉ", "khu vực", "vùng", "tỉnh", "quận", "phường"], "bi-geo-alt"],
  [["chi nhánh", "văn phòng", "cơ sở"],                     "bi-building"],
  // Kinh doanh
  [["nguồn"],                                                "bi-search-heart"],
  [["ngành", "lĩnh vực", "kinh doanh"],                     "bi-briefcase"],
  [["dự án", "công việc", "task"],                           "bi-kanban"],
  [["ưu tiên", "độ ưu tiên", "mức độ"],                     "bi-star"],
  // Phân loại chung
  [["loại", "nhóm", "phân loại"],                            "bi-tags"],
  [["trạng thái"],                                           "bi-toggle-on"],
  [["thông báo", "cảnh báo"],                               "bi-bell"],
  [["bảo hiểm"],                                             "bi-shield-check"],
  [["thuế"],                                                  "bi-percent"],
  [["phiếu", "hoá đơn", "hóa đơn"],                         "bi-receipt-cutoff"],
  [["xe", "phương tiện"],                                    "bi-truck"],
  [["thiết bị", "máy"],                                      "bi-pc-display"],
];


function autoIcon(label: string): string {
  const lower = label.toLowerCase();
  for (const [keywords, icon] of ICON_MAP) {
    if (keywords.some(k => lower.includes(k))) return icon;
  }
  return "bi-folder";
}

// ── Grouping logic cho loại danh mục ─────────────────────────────────────────
const TYPE_GROUPS: { label: string; icon: string; color: string; keywords: string[] }[] = [
  { label: "Hàng hoá",   icon: "bi-box-seam",          color: "#f59e0b", keywords: ["hang", "san_pham", "nhom"] },
  { label: "Chi phí",    icon: "bi-receipt",            color: "#ef4444", keywords: ["chi_phi", "chi_tieu", "thu"] },
  { label: "Khách hàng", icon: "bi-person-vcard",       color: "#3b82f6", keywords: ["khach", "doi_tac", "nha_cung"] },
  { label: "Trạng thái", icon: "bi-toggle-on",          color: "#8b5cf6", keywords: ["trang_thai", "trang thai"] },
  { label: "Tài sản",    icon: "bi-building-gear",      color: "#10b981", keywords: ["tai_san", "co_dinh"] },
  { label: "Nhân sự",    icon: "bi-people",             color: "#ec4899", keywords: ["nhan_su", "nhan_vien", "tuyen_dung", "chuc"] },
  { label: "Hoá đơn",    icon: "bi-receipt-cutoff",    color: "#06b6d4", keywords: ["hoa_don", "phieu", "bao_gia"] },
  { label: "Khác",       icon: "bi-grid",               color: "#6b7280", keywords: [] },
];

function getTypeGroup(ct: CategoryTypeDef): string {
  const v = ct.value.toLowerCase();
  const l = ct.label.toLowerCase();
  for (const g of TYPE_GROUPS) {
    if (g.keywords.some(k => v.includes(k) || l.includes(k.replace(/_/g, " ")))) return g.label;
  }
  return "Khác";
}

// ── Modal thêm / sửa loại danh mục ────────────────────────────────────────────
function TypeModal({ open, editing, onClose, onSaved }: {
  open: boolean;
  editing: CategoryTypeDef | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_TYPE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!editing;

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ label: editing.label, icon: editing.icon, color: editing.color, prefix: editing.prefix, value: editing.value });
      } else {
        setForm(EMPTY_TYPE_FORM);
      }
      setError(""); setSaving(false);
    }
  }, [open, editing]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    setForm(f => ({ ...f, label, ...(!isEdit && { prefix: autoPrefix(label), icon: autoIcon(label) }) }));
  };

  const refreshPrefix = () => setForm(f => ({ ...f, prefix: autoPrefix(f.label) }));
  const set = (k: keyof typeof EMPTY_TYPE_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.label.trim()) { setError("Vui lòng nhập tên loại"); return; }
    if (!form.prefix.trim()) { setError("Vui lòng nhập mã loại"); return; }
    setSaving(true); setError("");
    try {
      if (isEdit && editing) {
        const res = await fetch(`/api/board/category-types/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: form.label, icon: form.icon, color: form.color, prefix: form.prefix }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi lưu"); }
        toast.success("Đã cập nhật", `"${form.label}" đã được lưu`);
      } else {
        const value = toSlug(form.label);
        const res = await fetch("/api/board/category-types", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, value }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi lưu"); }
        toast.success("Đã thêm loại mới", `"${form.label}" đã được tạo`);
      }
      onSaved(); onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      setError(msg); toast.error("Lỗi", msg);
    } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 3000 }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}
            style={{ position: "fixed", inset: 0, margin: "auto", zIndex: 3001, width: "min(480px, calc(100vw - 32px))", height: "fit-content", background: "var(--card)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}
          >
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${form.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}>
                  <i className={`bi ${form.icon || "bi-folder-plus"}`} style={{ fontSize: 16, color: form.color }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>
                    {isEdit ? "Chỉnh sửa loại danh mục" : "Thêm loại danh mục"}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                    {isEdit ? `Đang sửa: ${editing?.label}` : "Tạo nhóm mới để phân loại danh mục hệ thống"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-x" style={{ fontSize: 18 }} />
              </button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <Label text="Tên loại" required />
                <Input placeholder="ví dụ: Loại hợp đồng thương mại" value={form.label} onChange={handleLabelChange} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div>
                  <Label text="Mã loại" required />
                  <div style={{ display: "flex", gap: 6 }}>
                    <Input value={form.prefix} readOnly
                      style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", cursor: "default", opacity: 0.85, flex: 1 }} />
                    <button type="button" onClick={refreshPrefix} title="Sinh lại mã"
                      style={{ flexShrink: 0, width: 34, height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                    >
                      <i className="bi bi-arrow-clockwise" style={{ fontSize: 13 }} />
                    </button>
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: 10, color: "var(--muted-foreground)" }}>Tự sinh từ chữ viết tắt</p>
                </div>
                <div>
                  <Label text="Biểu tượng" />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `color-mix(in srgb, ${form.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`bi ${form.icon || "bi-folder"}`} style={{ fontSize: 16, color: form.color }} />
                    </div>
                    <Input placeholder="bi-folder, bi-cash-coin, ..." value={form.icon} onChange={set("icon")} />
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: 10, color: "var(--muted-foreground)" }}>Tự gợi ý theo tên · Có thể chỉnh</p>
                </div>
              </div>
              <div>
                <Label text="Màu sắc" />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="color" value={form.color} onChange={set("color")}
                    style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", padding: 2 }} />
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{form.color}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
              {error && <p style={{ margin: 0, fontSize: 12, color: "#f43f5e", textAlign: "right" }}>{error}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ padding: "8px 18px", border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: "var(--radius)" }}>Hủy</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: "8px 20px", border: "none", background: saving ? "var(--muted)" : "#6366f1", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", borderRadius: "var(--radius)", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />Đang lưu...</> : <><i className="bi bi-check2" />{isEdit ? "Lưu thay đổi" : "Lưu loại"}</>}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


// ── Modal thêm/sửa danh mục ───────────────────────────────────────────────────
function CategoryModal({ open, editing, activeType, nextSortOrder, onClose, onSaved }: {
  open: boolean; editing: CategoryRow | null;
  activeType: CategoryTypeDef; nextSortOrder: number;
  onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [parentOptions, setParentOptions] = useState<{ id: string; name: string }[]>([]);

  const refreshCode = () =>
    setForm(f => ({ ...f, code: genDocCode(activeType.prefix) }));

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          code: editing.code, name: editing.name, color: editing.color ?? "#6366f1",
          icon: editing.icon ?? "", description: editing.description ?? "",
          sortOrder: String(editing.sortOrder), isActive: editing.isActive,
          parentId: (editing as CategoryRow & { parentId?: string }).parentId ?? "",
        });
      } else {
        setForm({ ...EMPTY_FORM, code: genDocCode(activeType.prefix), sortOrder: String(nextSortOrder) });
      }
      setError(""); setSaving(false);
      // Fetch danh sách có thể làm cha
      fetch(`/api/board/categories?type=${activeType.value}`)
        .then(r => r.json())
        .then((d: { id: string; name: string; parentId?: string | null }[]) => {
          const opts = Array.isArray(d)
            ? d.filter(c => !c.parentId && (!editing || c.id !== editing.id))
            : [];
          setParentOptions(opts);
        })
        .catch(() => {});
    }
  }, [open, editing, activeType.prefix, activeType.value, nextSortOrder]);

  // Khi gõ tên → tự cập nhật icon theo từ khóa
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm(f => ({ ...f, name, icon: autoIcon(name) }));
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.code.trim()) { setError("Vui lòng nhập mã danh mục"); return; }
    if (!form.name.trim()) { setError("Vui lòng nhập tên danh mục"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        type: activeType.value, code: form.code.trim(), name: form.name.trim(),
        color: form.color, icon: form.icon.trim() || null,
        description: form.description.trim() || null,
        sortOrder: parseInt(form.sortOrder) || 0,
        isActive: form.isActive,
        parentId: form.parentId || null,
      };
      const url = editing ? `/api/board/categories/${editing.id}` : "/api/board/categories";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi lưu"); }
      toast.success(editing ? "Đã cập nhật" : "Đã thêm mới", `Danh mục "${form.name}" đã được lưu`);
      onSaved(); onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      setError(msg); toast.error("Lỗi", msg);
    } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000 }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: "fixed", inset: 0, margin: "auto", zIndex: 2001, width: "min(520px, calc(100vw - 32px))", height: "fit-content", maxHeight: "calc(100vh - 40px)", background: "var(--card)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${activeType.color} 15%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`bi ${activeType.icon}`} style={{ fontSize: 16, color: activeType.color }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>
                    {editing ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{activeType.label}</p>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-x" style={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label text="Mã danh mục" required />
                  <div style={{ display: "flex", gap: 6 }}>
                    <Input
                      value={form.code}
                      onChange={set("code")}
                      style={{ fontFamily: "monospace", fontSize: 12, flex: 1 }}
                    />
                    <button
                      type="button" onClick={refreshCode}
                      title="Sinh mã mới"
                      style={{ flexShrink: 0, width: 36, height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = activeType.color; e.currentTarget.style.borderColor = activeType.color; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <i className="bi bi-arrow-clockwise" style={{ fontSize: 14 }} />
                    </button>
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: 10.5, color: "var(--muted-foreground)" }}>
                    Prefix: <b>{activeType.prefix}</b> · Tự sinh tự động (Có thể sửa)
                  </p>

                </div>
                <div>
                  <Label text="Thứ tự hiển thị" />
                  <Input type="number" min={0} value={form.sortOrder} onChange={set("sortOrder")} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label text="Tên hiển thị" required />
                  <Input placeholder="vd: Văn phòng phẩm" value={form.name} onChange={handleNameChange} />
                </div>
                <div>
                  <Label text="Danh mục cha" />
                  <select
                    value={form.parentId}
                    onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                    style={{
                      width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
                      borderRadius: "var(--radius)", background: "var(--background)",
                      color: "var(--foreground)", fontSize: 13, outline: "none", cursor: "pointer",
                      height: 36, boxSizing: "border-box",
                    }}
                  >
                    <option value="">— Không có (gốc) —</option>
                    {parentOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Màu sắc + Biểu tượng + Hoạt động */}
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "start" }}>
                <div>
                  <Label text="Màu sắc" />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={form.color} onChange={set("color")}
                      style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: 8, background: "var(--background)", cursor: "pointer", padding: 2 }} />
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{form.color}</span>
                  </div>
                </div>
                <div>
                  <Label text="Biểu tượng" />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 34, height: 36, borderRadius: 8, background: `color-mix(in srgb, ${form.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`bi ${form.icon || "bi-folder"}`} style={{ fontSize: 15, color: form.color }} />
                    </div>
                    <Input placeholder="bi-folder, bi-cash-coin, ..." value={form.icon} onChange={set("icon")} />
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: 10, color: "var(--muted-foreground)" }}>Tự gợi ý theo tên · Có thể chỉnh</p>
                </div>
                <div>
                  <Label text="Hoạt động" />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    style={{
                      width: 34, height: 20, borderRadius: 99, border: "none", cursor: "pointer",
                      background: form.isActive ? activeType.color : "var(--muted)",
                      position: "relative", transition: "background 0.2s", marginTop: 7,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3,
                      left: form.isActive ? "calc(100% - 17px)" : 3,
                      width: 14, height: 14, borderRadius: "50%",
                      background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                      transition: "left 0.2s",
                    }} />
                  </button>

                </div>
              </div>


              <div>
                <Label text="Mô tả" />
                <textarea rows={2} placeholder="Mô tả thêm (tuỳ chọn)..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", transition: "border-color 0.15s" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 8 }}>
              {/* Mã phát sinh — chỉ hiện khi thêm mới */}
              {!editing ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mã:</span>
                  <code style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: activeType.color, background: `color-mix(in srgb, ${activeType.color} 10%, transparent)`, padding: "3px 8px", borderRadius: 6, letterSpacing: "0.04em" }}>
                    {form.code}
                  </code>
                </div>
              ) : <div />}

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {error && <span style={{ fontSize: 12, color: "#f43f5e" }}>{error}</span>}
                <button onClick={onClose} style={{ padding: "8px 18px", border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: "var(--radius)" }}>Đóng</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: "8px 20px", border: "none", background: saving ? "var(--muted)" : activeType.color, color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", borderRadius: "var(--radius)", display: "inline-flex", alignItems: "center", gap: 6, transition: "opacity 0.15s" }}
                >
                  {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />Đang lưu...</> : <><i className="bi bi-check2" />Lưu danh mục</>}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const FALLBACK_TYPE: CategoryTypeDef = { id: "", value: "", label: "", icon: "bi-folder", color: "#6366f1", prefix: "CAT", sortOrder: 0, isSystem: false, isActive: true };

export default function BoardCategoriesPage() {
  const toast = useToast();

  // ─ types ─
  const [categoryTypes, setCategoryTypes] = useState<CategoryTypeDef[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [activeTypeIdx, setActiveTypeIdx] = useState(0);
  const activeType = categoryTypes[activeTypeIdx] ?? FALLBACK_TYPE;

  // ─ type modal ─
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [editTypeTarget, setEditTypeTarget] = useState<CategoryTypeDef | null>(null);
  const [deleteTypeTarget, setDeleteTypeTarget] = useState<CategoryTypeDef | null>(null);

  const fetchTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const res = await fetch("/api/board/category-types");
      const data = await res.json();
      setCategoryTypes(Array.isArray(data) ? data : []);
    } finally { setTypesLoading(false); }
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const handleDeleteType = async () => {
    if (!deleteTypeTarget) return;
    try {
      const res = await fetch(`/api/board/category-types/${deleteTypeTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Đã xoá loại", `"${deleteTypeTarget.label}" đã được xoá`);
      setDeleteTypeTarget(null);
      setActiveTypeIdx(0);
      fetchTypes();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi";
      toast.error("Lỗi xoá", msg); setDeleteTypeTarget(null);
    }
  };

  // ─ items ─
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/board/categories?type=${activeType.value}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [activeType.value]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = rows.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (row: CategoryRow) => {
    try {
      await fetch(`/api/board/categories/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !row.isActive }) });
      toast.success("Đã cập nhật", `Trạng thái "${row.name}" đã thay đổi`);
      fetchRows();
    } catch { toast.error("Lỗi", "Không thể cập nhật trạng thái"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/board/categories/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Đã xoá", `"${deleteTarget.name}" đã được xoá`);
      setDeleteTarget(null); fetchRows();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      toast.error("Lỗi xoá", msg); setDeleteTarget(null);
    }
  };

  const [collapsedRoots, setCollapsedRoots] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => setCollapsedRoots(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Xây cây 2 cấp từ rows phẳng
  const roots = rows.filter(r => !r.parentId);
  const childrenOf = (parentId: string) => rows.filter(r => r.parentId === parentId);

  const renderActionBtns = (r: CategoryRow) => (
    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
      <button onClick={() => { setEditing(r); setModalOpen(true); }}
        style={{ width: 28, height: 28, border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
        <i className="bi bi-pencil" style={{ fontSize: 12 }} />
      </button>
      <button onClick={() => setDeleteTarget(r)}
        style={{ width: 28, height: 28, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
        <i className="bi bi-trash3" style={{ fontSize: 12 }} />
      </button>
    </div>
  );

  const renderStatusBtn = (r: CategoryRow) => (
    <button onClick={e => { e.stopPropagation(); handleToggleActive(r); }}
      style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", background: r.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)", color: r.isActive ? "#10b981" : "#ef4444", whiteSpace: "nowrap" }}>
      {r.isActive ? "Hoạt động" : "Ẩn"}
    </button>
  );

  // Header của bảng cây
  const TreeHeader = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 84px", gap: 8, padding: "8px 12px", borderBottom: "2px solid var(--border)", marginBottom: 4 }}>
      {["Tên danh mục", "Thứ tự", "Trạng thái", ""].map((h, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", textAlign: i > 0 ? "center" : "left" }}>{h}</span>
      ))}
    </div>
  );

  const filteredRoots = roots.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase()) ||
    childrenOf(r.id).some(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
  );


  return (
    <>
      <CategoryModal
        open={modalOpen} editing={editing} activeType={activeType}
        nextSortOrder={rows.length + 1}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSaved={fetchRows}
      />

      <TypeModal open={addTypeOpen} editing={null} onClose={() => setAddTypeOpen(false)} onSaved={() => { fetchTypes(); }} />
      <TypeModal open={!!editTypeTarget} editing={editTypeTarget} onClose={() => setEditTypeTarget(null)} onSaved={() => { fetchTypes(); }} />
      <ConfirmDialog
        open={!!deleteTypeTarget}
        title="Xoá loại danh mục?"
        message={`Xoá loại "${deleteTypeTarget?.label}"? Các danh mục trong loại này sẽ không bị xóa.`}
        confirmLabel="Xoá" variant="danger"
        onConfirm={handleDeleteType}
        onCancel={() => setDeleteTypeTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá danh mục?"
        message={`Bạn có chắc muốn xoá danh mục "${deleteTarget?.name}"? Thao tác này không thể hoàn tác.`}
        confirmLabel="Xoá" variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />


      <SplitLayoutPage
        title="Quản lý danh mục"
        description="Ban Giám đốc · Cấu hình danh mục toàn hệ thống"
        icon="bi-folder2-open"
        color="indigo"
        leftCols={4}

        leftContent={
          <div>
            <SectionTitle
              title="Các loại danh mục"
              className="mb-3"
              action={
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setEditTypeTarget(activeType)}
                    title="Sửa loại đang chọn"
                    style={{ width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 7, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                  >
                    <i className="bi bi-pencil" style={{ fontSize: 12 }} />
                  </button>
                  <button
                    onClick={() => setAddTypeOpen(true)}
                    title="Thêm loại danh mục mới"
                    style={{ width: 28, height: 28, border: "none", borderRadius: 7, background: "#6366f1", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />
                  </button>
                </div>
              }
            />
            <div style={{ marginBottom: 8 }}>
              <SearchInput
                placeholder="Tìm loại danh mục..."
                value={typeSearch}
                onChange={setTypeSearch}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", maxHeight: "calc(100vh - 320px)", paddingRight: 12 }}>


              {typesLoading ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                  <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite", marginRight: 6 }} />
                  Đang tải...
                </div>
              ) : (() => {
                const filtered = categoryTypes.filter(ct => ct.label.toLowerCase().includes(typeSearch.toLowerCase()));
                // Group by TYPE_GROUPS
                const rendered: React.ReactNode[] = [];
                TYPE_GROUPS.forEach(g => {
                  const members = filtered.filter(ct => getTypeGroup(ct) === g.label);
                  if (members.length === 0) return;
                  rendered.push(
                    <div key={`grp-${g.label}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 4px 4px", marginTop: 2 }}>
                      <i className={`bi ${g.icon}`} style={{ fontSize: 10, color: g.color, opacity: 0.7 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", opacity: 0.55 }}>{g.label}</span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.6 }} />
                    </div>
                  );
                  members.forEach(ct => {
                    const idx = categoryTypes.indexOf(ct);
                    const count = idx === activeTypeIdx ? rows.length : null;
                    const isActive = idx === activeTypeIdx;
                    rendered.push(
                      <div key={ct.value} style={{ position: "relative" }}
                        onMouseEnter={e => { const btn = e.currentTarget.querySelector<HTMLButtonElement>(".del-type-btn"); if (btn) btn.style.opacity = "1"; }}
                        onMouseLeave={e => { const btn = e.currentTarget.querySelector<HTMLButtonElement>(".del-type-btn"); if (btn) btn.style.opacity = "0"; }}
                      >
                        <button onClick={() => { setActiveTypeIdx(idx); setSearch(""); }}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "9px 12px", border: isActive ? `1px solid color-mix(in srgb, ${ct.color} 40%, transparent)` : "1px solid transparent",
                            borderRadius: 10, background: isActive ? `color-mix(in srgb, ${ct.color} 10%, transparent)` : "transparent",
                            cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--muted)"; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? `color-mix(in srgb, ${ct.color} 10%, transparent)` : "transparent"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, ${ct.color} 15%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <i className={`bi ${ct.icon}`} style={{ fontSize: 14, color: ct.color }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? ct.color : "var(--foreground)" }}>{ct.label}</span>
                          </div>
                          {count !== null && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `color-mix(in srgb, ${ct.color} 15%, transparent)`, color: ct.color }}>
                              {count}
                            </span>
                          )}
                        </button>
                        {!ct.isSystem && (
                          <button className="del-type-btn" onClick={() => setDeleteTypeTarget(ct)}
                            style={{ position: "absolute", top: "50%", right: 6, transform: "translateY(-50%)", width: 22, height: 22, border: "none", borderRadius: 5, background: "rgba(239,68,68,0.12)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s", zIndex: 1 }}>
                            <i className="bi bi-trash3" style={{ fontSize: 10 }} />
                          </button>
                        )}
                      </div>
                    );
                  });
                });
                return rendered;
              })()}
            </div>
          </div>
        }
        rightContent={
          <div>
            <SectionTitle
              title={activeType.label}
              className="mb-3"
              action={
                <button
                  onClick={() => { setEditing(null); setModalOpen(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", border: "none", borderRadius: 8, background: activeType.color, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "opacity 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  <i className="bi bi-plus-lg" style={{ fontSize: 13 }} />
                  Thêm mới
                </button>
              }
            />

            <div className="mb-3">
              <SearchInput
                placeholder={`Tìm trong ${activeType.label.toLowerCase()}...`}
                value={search}
                onChange={setSearch}
              />
            </div>

            {/* Thống kê nhanh */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Tổng danh mục", val: rows.length, color: activeType.color },
                { label: "Đang hoạt động", val: rows.filter(r => r.isActive).length, color: "#10b981" },
                { label: "Đang ẩn", val: rows.filter(r => !r.isActive).length, color: "#ef4444" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1.2 }}>{s.val}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tree view */}
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                <i className="bi bi-arrow-repeat" style={{ animation: "spin 0.8s linear infinite", marginRight: 6 }} />Đang tải...
              </div>
            ) : filteredRoots.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-folder2-open" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
                <span style={{ fontSize: 13 }}>Chưa có {activeType.label.toLowerCase()} nào. Nhấn &ldquo;Thêm mới&rdquo; để bắt đầu.</span>
              </div>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <TreeHeader />
                {filteredRoots.map((root, rootIdx) => {
                  const children = childrenOf(root.id).filter(c =>
                    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
                  );
                  const isCollapsed = collapsedRoots.has(root.id);
                  const hasChildren = children.length > 0;
                  const isLast = rootIdx === filteredRoots.length - 1;

                  return (
                    <div key={root.id}>
                      {/* Hàng cha */}
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 70px 110px 84px", gap: 8,
                        alignItems: "center", padding: "10px 12px",
                        background: `color-mix(in srgb, ${root.color ?? activeType.color} 5%, var(--muted))`,
                        borderBottom: (!isLast || hasChildren && !isCollapsed) ? "1px solid var(--border)" : "none",
                        cursor: hasChildren ? "pointer" : "default",
                        transition: "background 0.15s",
                      }}
                        onClick={() => hasChildren && toggleCollapse(root.id)}
                        onMouseEnter={e => { e.currentTarget.style.background = `color-mix(in srgb, ${root.color ?? activeType.color} 10%, var(--muted))`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `color-mix(in srgb, ${root.color ?? activeType.color} 5%, var(--muted))`; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          {/* Toggle icon */}
                          <div style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {hasChildren ? (
                              <i className={`bi bi-chevron-${isCollapsed ? "right" : "down"}`}
                                style={{ fontSize: 11, color: "var(--muted-foreground)", transition: "transform 0.2s" }} />
                            ) : (
                              <span style={{ width: 10, height: 10, borderRadius: "50%", background: root.color ?? activeType.color, display: "inline-block", opacity: 0.5 }} />
                            )}
                          </div>
                          {root.icon && <i className={`bi ${root.icon}`} style={{ color: root.color ?? activeType.color, fontSize: 15, flexShrink: 0 }} />}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{root.name}</p>
                            {hasChildren && <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)" }}>{children.length} danh mục con</p>}
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}><span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{root.sortOrder}</span></div>
                        <div style={{ display: "flex", justifyContent: "center" }}>{renderStatusBtn(root)}</div>
                        <div>{renderActionBtns(root)}</div>
                      </div>

                      {/* Hàng con */}
                      {!isCollapsed && children.map((child, cIdx) => {
                        const isLastChild = cIdx === children.length - 1;
                        return (
                          <div key={child.id} style={{
                            display: "grid", gridTemplateColumns: "1fr 70px 110px 84px", gap: 8,
                            alignItems: "center", padding: "8px 12px 8px 16px",
                            background: "var(--card)",
                            borderBottom: (!isLast || !isLastChild) ? "1px solid var(--border)" : "none",
                            transition: "background 0.15s",
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--muted)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, paddingLeft: 28 }}>
                              {/* Dấu cây */}
                              <span style={{ color: "var(--border)", fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{isLastChild ? "└" : "├"}</span>
                              {child.icon && <i className={`bi ${child.icon}`} style={{ color: child.color ?? root.color ?? activeType.color, fontSize: 13, flexShrink: 0 }} />}
                              {!child.icon && <span style={{ width: 8, height: 8, borderRadius: "50%", background: child.color ?? root.color ?? activeType.color, display: "inline-block", flexShrink: 0, opacity: 0.7 }} />}
                              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{child.name}</span>
                            </div>
                            <div style={{ textAlign: "center" }}><span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{child.sortOrder}</span></div>
                            <div style={{ display: "flex", justifyContent: "center" }}>{renderStatusBtn(child)}</div>
                            <div>{renderActionBtns(child)}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        }
      />
    </>
  );
}
