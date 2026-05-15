"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

type CompanyInfo = {
  id?: string;
  name: string;
  shortName: string;
  slogan: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxCode: string;
  legalRep: string;
  logoUrl: string | null;
};

const EMPTY: CompanyInfo = {
  name: "", shortName: "", slogan: "", address: "",
  phone: "", email: "", website: "", taxCode: "", legalRep: "", logoUrl: null,
};

function Field({
  label, value, onChange, placeholder, type = "text", icon, readOnly,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; icon: string; readOnly?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <i className={`bi ${icon}`} style={{
          position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
          fontSize: 13, color: "var(--muted-foreground)", pointerEvents: "none",
        }} />
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "9px 12px 9px 32px",
            border: "1.5px solid var(--border)",
            borderRadius: 9,
            fontSize: 13,
            color: "var(--foreground)",
            background: readOnly ? "var(--muted)" : "var(--background)",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={e => { if (!readOnly) e.currentTarget.style.borderColor = "#3b82f6"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
      </div>
    </div>
  );
}

export default function CompanyPage() {
  const [data, setData] = useState<CompanyInfo>(EMPTY);
  const [draft, setDraft] = useState<CompanyInfo>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/company")
      .then(r => r.json())
      .then((d: CompanyInfo) => {
        const filled = { ...EMPTY, ...d };
        setData(filled);
        setDraft(filled);
        setLogoPreview(d.logoUrl ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = () => {
    setDraft({ ...data });
    setLogoPreview(data.logoUrl ?? null);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft({ ...data });
    setLogoPreview(data.logoUrl ?? null);
    setEditing(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      setDraft(prev => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) return showToast("Tên công ty không được để trống", false);
    if (!draft.shortName.trim()) return showToast("Tên viết tắt không được để trống", false);
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Lỗi lưu dữ liệu", false);
        return;
      }
      const updated: CompanyInfo = await res.json();
      const filled = { ...EMPTY, ...updated };
      setData(filled);
      setDraft(filled);
      setLogoPreview(updated.logoUrl ?? null);
      setEditing(false);
      showToast("Đã lưu thông tin doanh nghiệp", true);
    } catch {
      showToast("Không thể kết nối máy chủ", false);
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof CompanyInfo) => (v: string) =>
    setDraft(prev => ({ ...prev, [field]: v }));

  const current = editing ? draft : data;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Thông tin doanh nghiệp"
        description="Quản lý thông tin, hồ sơ pháp lý và cấu hình hệ thống của doanh nghiệp"
        color="blue"
        icon="bi-building"
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 80, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10,
          background: toast.ok ? "#10b981" : "#ef4444",
          color: "#fff", fontSize: 13, fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "slideIn 0.2s ease",
        }}>
          <i className={`bi ${toast.ok ? "bi-check-circle" : "bi-x-circle"}`} />
          {toast.msg}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "#3b82f6", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : (
          <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Header card: Logo + tên ── */}
            <div className="app-card" style={{ padding: "24px 28px", borderRadius: 16, display: "flex", alignItems: "center", gap: 24 }}>
              {/* Logo */}
              <div
                onClick={() => editing && fileRef.current?.click()}
                style={{
                  width: 90, height: 90, borderRadius: 14,
                  border: `2px ${editing ? "dashed #3b82f6" : "solid var(--border)"}`,
                  background: "var(--muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", flexShrink: 0,
                  cursor: editing ? "pointer" : "default",
                  transition: "border-color 0.15s",
                  position: "relative",
                }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <i className="bi bi-building" style={{ fontSize: 30, color: "var(--muted-foreground)", opacity: 0.4 }} />
                )}
                {editing && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(59,130,246,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className="bi bi-camera" style={{ fontSize: 20, color: "#3b82f6" }} />
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} />
              </div>

              {/* Name block */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "var(--foreground)", lineHeight: 1.2 }}>
                  {data.name || <span style={{ color: "var(--muted-foreground)", fontWeight: 400, fontSize: 16 }}>Chưa cập nhật tên công ty</span>}
                </p>
                {data.shortName && (
                  <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
                    {data.shortName}
                  </span>
                )}
                {data.slogan && (
                  <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--muted-foreground)", fontStyle: "italic" }}>"{data.slogan}"</p>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {editing ? (
                  <>
                    <button onClick={handleCancel} style={{
                      padding: "8px 18px", borderRadius: 9, border: "1.5px solid var(--border)",
                      background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>Huỷ</button>
                    <button onClick={handleSave} disabled={saving} style={{
                      padding: "8px 20px", borderRadius: 9, border: "none",
                      background: saving ? "var(--muted)" : "#3b82f6", color: "#fff",
                      fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.7s linear infinite" }} /> Đang lưu…</> : <><i className="bi bi-check-lg" />Lưu</>}
                    </button>
                  </>
                ) : (
                  <button onClick={handleEdit} style={{
                    padding: "8px 20px", borderRadius: 9, border: "1.5px solid #3b82f6",
                    background: "rgba(59,130,246,0.07)", color: "#3b82f6",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <i className="bi bi-pencil" />Chỉnh sửa
                  </button>
                )}
              </div>
            </div>

            {/* ── Section: Thông tin cơ bản ── */}
            <div className="app-card" style={{ padding: "22px 24px", borderRadius: 16 }}>
              <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3b82f6" }}>
                <i className="bi bi-info-circle me-2" />Thông tin cơ bản
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Tên công ty *" icon="bi-building" value={current.name} onChange={set("name")} placeholder="Công ty TNHH ABC" readOnly={!editing} />
                <Field label="Tên viết tắt *" icon="bi-badge" value={current.shortName} onChange={set("shortName")} placeholder="ABC" readOnly={!editing} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Slogan" icon="bi-chat-quote" value={current.slogan} onChange={set("slogan")} placeholder="Cam kết chất lượng – Uy tín hàng đầu" readOnly={!editing} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Địa chỉ" icon="bi-geo-alt" value={current.address} onChange={set("address")} placeholder="123 Đường ABC, Quận 1, TP.HCM" readOnly={!editing} />
                </div>
              </div>
            </div>

            {/* ── Section: Liên hệ ── */}
            <div className="app-card" style={{ padding: "22px 24px", borderRadius: 16 }}>
              <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981" }}>
                <i className="bi bi-telephone me-2" />Thông tin liên hệ
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Số điện thoại" icon="bi-telephone" value={current.phone} onChange={set("phone")} placeholder="028 1234 5678" readOnly={!editing} />
                <Field label="Email" icon="bi-envelope" value={current.email} onChange={set("email")} placeholder="info@company.vn" type="email" readOnly={!editing} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Website" icon="bi-globe" value={current.website} onChange={set("website")} placeholder="https://company.vn" readOnly={!editing} />
                </div>
              </div>
            </div>

            {/* ── Section: Pháp lý ── */}
            <div className="app-card" style={{ padding: "22px 24px", borderRadius: 16 }}>
              <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f59e0b" }}>
                <i className="bi bi-file-earmark-text me-2" />Thông tin pháp lý
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Mã số thuế" icon="bi-hash" value={current.taxCode} onChange={set("taxCode")} placeholder="0123456789" readOnly={!editing} />
                <Field label="Người đại diện pháp luật" icon="bi-person-badge" value={current.legalRep} onChange={set("legalRep")} placeholder="Nguyễn Văn A" readOnly={!editing} />
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </div>
  );
}
