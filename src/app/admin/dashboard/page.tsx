"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";

// ── Types ────────────────────────────────────────────────────────────────────
type CompanyForm = {
  name: string; shortName: string; slogan: string; logoUrl: string;
  address: string; phone: string; email: string; website: string;
  taxCode: string; legalRep: string;
};

const EMPTY: CompanyForm = {
  name: "", shortName: "", slogan: "", logoUrl: "",
  address: "", phone: "", email: "", website: "", taxCode: "", legalRep: "",
};

// ── Shared UI helpers ─────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)", fontSize: 13,
  borderRadius: "var(--radius)", outline: "none", transition: "border-color 0.15s",
  boxSizing: "border-box", fontFamily: "inherit",
};

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={inputStyle}
      onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
      onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
    />
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
      {text}{required && <span style={{ color: "#f43f5e", marginLeft: 3 }}>*</span>}
    </p>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div><Label text={label} required={required} />{children}</div>;
}

function SectionCard({ icon, title, color, children }: { icon: string; title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
      overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        padding: "15px 20px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 10,
        background: `color-mix(in srgb, ${color} 4%, var(--card))`,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`bi ${icon}`} style={{ fontSize: 15, color }} />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>{title}</p>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // set helper
  const set = (k: keyof CompanyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  // Load company info
  useEffect(() => {
    fetch("/api/company", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setForm({
            name:     data.name     ?? "",
            shortName:data.shortName?? "",
            slogan:   data.slogan   ?? "",
            logoUrl:  data.logoUrl  ?? "",
            address:  data.address  ?? "",
            phone:    data.phone    ?? "",
            email:    data.email    ?? "",
            website:  data.website  ?? "",
            taxCode:  data.taxCode  ?? "",
            legalRep: data.legalRep ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Upload logo
  const handleLogoUpload = async (file: File) => {
    setUploading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload thất bại");
      setForm(f => ({ ...f, logoUrl: data.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi upload");
    } finally {
      setUploading(false);
    }
  };

  // Save
  const handleSave = async () => {
    if (!form.name.trim()) { setError("Tên công ty không được để trống"); return; }
    if (!form.shortName.trim()) { setError("Tên viết tắt không được để trống"); return; }
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi lưu");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Page Header */}
      <PageHeader
        title="Thông tin Công ty"
        description="Cập nhật logo, tên và thông tin liên hệ hiển thị trên hệ thống"
        icon="bi-building"
        color="indigo"
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted-foreground)" }}>
          <i className="bi bi-arrow-repeat" style={{ fontSize: 28, display: "block", marginBottom: 10, animation: "spin 1s linear infinite" }} />
          Đang tải thông tin công ty...
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900, width: "100%", margin: "0 auto" }}
        >
          {/* Action bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
            {error && (
              <p style={{ margin: 0, fontSize: 12, color: "#f43f5e", flex: 1 }}>
                <i className="bi bi-exclamation-triangle" style={{ marginRight: 5 }} />{error}
              </p>
            )}
            {success && (
              <p style={{ margin: 0, fontSize: 12, color: "#10b981", fontWeight: 700 }}>
                <i className="bi bi-check2-circle" style={{ marginRight: 5 }} />Đã lưu thành công!
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 22px", border: "none", borderRadius: "var(--radius)",
                background: saving ? "var(--muted)" : "var(--primary)",
                color: saving ? "var(--muted-foreground)" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {saving
                ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang lưu...</>
                : <><i className="bi bi-floppy" /> Lưu thay đổi</>
              }
            </button>
          </div>

          {/* ── Logo & Tên cơ bản ── */}
          <SectionCard icon="bi-building" title="Thông tin cơ bản" color="#6366f1">
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

              {/* Logo preview */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 100, height: 100, borderRadius: 16,
                  border: "2px dashed var(--border)",
                  background: "var(--muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", flexShrink: 0,
                }}>
                  {form.logoUrl ? (
                    <img
                      src={form.logoUrl} alt="Logo"
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <i className="bi bi-image" style={{ fontSize: 28, color: "var(--muted-foreground)", opacity: 0.4 }} />
                  )}
                </div>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                  cursor: uploading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
                  color: uploading ? "var(--primary)" : "var(--foreground)", background: "var(--muted)",
                  whiteSpace: "nowrap", transition: "all 0.15s",
                }}>
                  <i className={`bi ${uploading ? "bi-arrow-repeat" : "bi-upload"}`}
                    style={{ animation: uploading ? "spin 1s linear infinite" : "none" }} />
                  {uploading ? "Uploading..." : "Upload logo"}
                  <input
                    ref={fileRef} type="file" accept="image/*"
                    style={{ display: "none" }} disabled={uploading}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }}
                  />
                </label>
              </div>

              {/* Name fields */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                  <Field label="Tên công ty" required>
                    <Input value={form.name} onChange={set("name")} placeholder="Công ty TNHH Giải pháp Công nghệ LEETECH" />
                  </Field>
                  <Field label="Tên viết tắt" required>
                    <Input value={form.shortName} onChange={set("shortName")} placeholder="LEETECH" />
                  </Field>
                </div>
                <Field label="Khẩu hiệu (Slogan)">
                  <Input value={form.slogan} onChange={set("slogan")} placeholder="Tiên phong kiến tạo giải pháp công nghệ" />
                </Field>
                <Field label="Đường dẫn Logo (URL hoặc path)">
                  <Input value={form.logoUrl} onChange={set("logoUrl")} placeholder="/leetech-logo.png hoặc https://..." />
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* ── Liên hệ ── */}
          <SectionCard icon="bi-telephone" title="Thông tin liên hệ" color="#0ea5e9">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Số điện thoại">
                <Input value={form.phone} onChange={set("phone")} placeholder="028 XXXX XXXX" type="tel" />
              </Field>
              <Field label="Email liên hệ">
                <Input value={form.email} onChange={set("email")} placeholder="info@leetech.vn" type="email" />
              </Field>
              <Field label="Website">
                <Input value={form.website} onChange={set("website")} placeholder="https://leetech.vn" />
              </Field>
              <Field label="Địa chỉ">
                <Input value={form.address} onChange={set("address")} placeholder="Số nhà, đường, quận, tỉnh/thành phố" />
              </Field>
            </div>
          </SectionCard>

          {/* ── Pháp lý ── */}
          <SectionCard icon="bi-shield-check" title="Thông tin pháp lý" color="#10b981">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Mã số thuế">
                <Input value={form.taxCode} onChange={set("taxCode")} placeholder="0123456789" />
              </Field>
              <Field label="Người đại diện pháp luật">
                <Input value={form.legalRep} onChange={set("legalRep")} placeholder="Nguyễn Văn A" />
              </Field>
            </div>
          </SectionCard>

        </motion.div>
      )}
    </div>
  );
}
