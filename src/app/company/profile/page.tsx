"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type CompanyForm = {
  name: string; shortName: string; slogan: string;
  address: string; phone: string; email: string;
  website: string; taxCode: string; legalRep: string; logoUrl: string;
};

const EMPTY: CompanyForm = {
  name: "", shortName: "", slogan: "", address: "", phone: "",
  email: "", website: "", taxCode: "", legalRep: "", logoUrl: "",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px", border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)", fontSize: 13,
  borderRadius: "var(--radius)", outline: "none", transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input ref={ref} {...props} style={inputStyle}
      onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
    />
  );
};

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
    {text}{required && <span style={{ color: "#f43f5e", marginLeft: 3 }}>*</span>}
  </p>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div><Label text={label} required={required} />{children}</div>
);

const Card = ({ icon, title, color, children }: { icon: string; title: string; color: string; children: React.ReactNode }) => (
  <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, background: `color-mix(in srgb, ${color} 5%, var(--card))` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`bi ${icon}`} style={{ fontSize: 15, color }} />
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>{title}</p>
    </div>
    <div style={{ padding: "20px" }}>{children}</div>
  </div>
);

export default function CompanyProfilePage() {
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof CompanyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    fetch("/api/company", { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (data && !data.error) setForm({ name: data.name ?? "", shortName: data.shortName ?? "", slogan: data.slogan ?? "", address: data.address ?? "", phone: data.phone ?? "", email: data.email ?? "", website: data.website ?? "", taxCode: data.taxCode ?? "", legalRep: data.legalRep ?? "", logoUrl: data.logoUrl ?? "" }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogoUpload = async (file: File) => {
    setUploading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload thất bại");
      setForm(f => ({ ...f, logoUrl: data.url }));
    } catch (e) { setError(e instanceof Error ? e.message : "Lỗi upload"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Vui lòng nhập tên công ty"); return; }
    if (!form.shortName.trim()) { setError("Vui lòng nhập tên viết tắt"); return; }
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi lưu");
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : "Lỗi không xác định"); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860, margin: "0 auto", width: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em" }}>Thông tin Công ty</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>Cập nhật thông tin tổ chức của doanh nghiệp</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {error && <p style={{ margin: 0, fontSize: 12, color: "#f43f5e", textAlign: "right", maxWidth: 260 }}>{error}</p>}
          {success && <p style={{ margin: 0, fontSize: 12, color: "#10b981", fontWeight: 600 }}><i className="bi bi-check2-circle" /> Đã lưu thành công</p>}
          <button onClick={handleSave} disabled={saving || loading} style={{ padding: "9px 22px", border: "none", borderRadius: "var(--radius)", background: saving ? "var(--muted)" : "var(--primary)", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang lưu...</> : <><i className="bi bi-floppy" /> Lưu thay đổi</>}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
          <i className="bi bi-arrow-repeat" style={{ fontSize: 24, animation: "spin 1s linear infinite", display: "block", marginBottom: 8 }} />
          Đang tải dữ liệu...
        </div>
      ) : (
        <>
          <Card icon="bi-building" title="Thông tin cơ bản" color="#6366f1">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 16 }}>
                <Field label="Tên công ty" required><Input value={form.name} onChange={set("name")} placeholder="Công ty TNHH ABC" /></Field>
                <Field label="Tên viết tắt" required><Input value={form.shortName} onChange={set("shortName")} placeholder="abc" /></Field>
              </div>
              <Field label="Khẩu hiệu (Slogan)">
                <textarea rows={2} value={form.slogan} onChange={set("slogan")} placeholder="Tiên phong kiến tạo giá trị..." style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
              </Field>
              <Field label="Địa chỉ"><Input value={form.address} onChange={set("address")} placeholder="Số nhà, đường, quận, tỉnh/thành phố" /></Field>
            </div>
          </Card>

          <Card icon="bi-telephone" title="Thông tin liên hệ" color="#0ea5e9">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Field label="Số điện thoại"><Input value={form.phone} onChange={set("phone")} placeholder="0901 234 567" type="tel" /></Field>
              <Field label="Email"><Input value={form.email} onChange={set("email")} placeholder="info@company.vn" type="email" /></Field>
              <Field label="Website"><Input value={form.website} onChange={set("website")} placeholder="https://company.vn" /></Field>
            </div>
          </Card>

          <Card icon="bi-shield-check" title="Thông tin pháp lý" color="#10b981">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Mã số thuế"><Input value={form.taxCode} onChange={set("taxCode")} placeholder="0123456789" /></Field>
              <Field label="Người đại diện pháp luật"><Input value={form.legalRep} onChange={set("legalRep")} placeholder="Nguyễn Văn A" /></Field>
            </div>
          </Card>

          <Card icon="bi-image" title="Logo công ty" color="#f59e0b">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "flex-end" }}>
                <Field label="Đường dẫn Logo"><Input value={form.logoUrl} onChange={set("logoUrl")} placeholder="/uploads/logo.png hoặc https://..." /></Field>
                <div>
                  <Label text="Upload ảnh" />
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `1px solid ${uploading ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius)", cursor: uploading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, color: uploading ? "var(--primary)" : "var(--foreground)", background: "var(--muted)", whiteSpace: "nowrap" }}>
                    <i className={`bi ${uploading ? "bi-arrow-repeat" : "bi-upload"}`} style={{ animation: uploading ? "spin 1s linear infinite" : "none" }} />
                    {uploading ? "Đang upload..." : "Chọn ảnh"}
                    <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading} onChange={e => { const file = e.target.files?.[0]; if (file) handleLogoUpload(file); e.target.value = ""; }} />
                  </label>
                </div>
              </div>
              {form.logoUrl && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "var(--muted)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <img src={form.logoUrl} alt="Logo preview" style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", padding: 4 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>Xem trước logo</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.logoUrl}</p>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, logoUrl: "" }))} style={{ padding: "4px 8px", border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 11, cursor: "pointer", borderRadius: "var(--radius)" }}>
                    <i className="bi bi-x" /> Xóa
                  </button>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </motion.div>
  );
}
