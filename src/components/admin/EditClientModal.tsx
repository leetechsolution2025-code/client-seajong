"use client";

import React, { useState, useRef, useEffect } from "react";

interface Client {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  address: string | null;
  slogan: string | null;
  status: string;
  _count: { modules: number; users: number };
}

interface Props {
  client: Client | null;
  onClose: () => void;
  onSaved: (updated: Client) => void;
}

export function EditClientModal({ client, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ name: "", address: "", slogan: "", logoUrl: "" });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (client) {
      setForm({
        name:     client.name     || "",
        address:  client.address  || "",
        slogan:   client.slogan   || "",
        logoUrl:  client.logoUrl  || "",
      });
      setLogoPreview(client.logoUrl || null);
      setError("");
    }
  }, [client]);

  if (!client) return null;

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setLogoPreview(url);
      setForm(prev => ({ ...prev, logoUrl: url }));
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview(null);
    setForm(prev => ({ ...prev, logoUrl: "" }));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    if (!client) return; // guard
    if (!form.name.trim()) { setError("Tên khách hàng không được để trống"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Lỗi cập nhật");
      onSaved(data.client);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    position: "fixed", zIndex: 1070,
    top: "50%", left: "50%",
    transform: "translate(-50%,-50%)",
    width: "100%", maxWidth: 520,
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
    display: "flex", flexDirection: "column",
    maxHeight: "90vh", overflow: "hidden",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 800,
    textTransform: "uppercase", letterSpacing: "0.1em",
    color: "var(--muted-foreground)", marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--card)",
    color: "var(--foreground)", fontSize: 13, outline: "none",
    boxSizing: "border-box", transition: "border-color 0.15s",
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 1060,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      }} />

      <div style={cardStyle}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(99,102,241,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="bi bi-pencil-fill" style={{ color: "#6366f1", fontSize: 15 }} />
            </div>
            <div>
              <h5 style={{ margin: 0, fontWeight: 900, fontSize: 15, color: "var(--foreground)" }}>
                Chỉnh sửa khách hàng
              </h5>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                @{client.shortName}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)", padding: "4px 8px", borderRadius: 8, fontSize: 16,
          }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Logo */}
          <div>
            <label style={labelStyle}>Logo công ty</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Preview */}
              <div style={{
                width: 64, height: 64, flexShrink: 0, borderRadius: 12,
                border: "2px dashed var(--border)", background: "var(--muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", position: "relative",
              }}>
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    <button type="button" onClick={removeLogo} style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                      border: "none", cursor: "pointer", opacity: 0, transition: "opacity 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
                      <i className="bi bi-trash" style={{ color: "#fff" }} />
                    </button>
                  </>
                ) : (
                  <i className="bi bi-image" style={{ fontSize: 24, color: "var(--muted-foreground)", opacity: 0.4 }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} id={`logo-edit-${client.id}`} style={{ display: "none" }} />
                <label htmlFor={`logo-edit-${client.id}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                  border: "1px solid var(--border)", background: "var(--muted)",
                  color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500,
                }}>
                  <i className="bi bi-upload" /> {logoPreview ? "Đổi ảnh" : "Chọn ảnh logo"}
                </label>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                  PNG, JPG, SVG — tối đa 2MB
                </p>
                <input
                  type="url"
                  value={logoPreview ? "" : form.logoUrl}
                  onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="Hoặc dán URL ảnh..."
                  disabled={!!logoPreview}
                  style={{ ...inputStyle, marginTop: 8, opacity: logoPreview ? 0.4 : 1 }}
                />
              </div>
            </div>
          </div>

          {/* Tên */}
          <div>
            <label style={labelStyle}>Tên khách hàng <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              type="text" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Công ty TNHH..." style={inputStyle}
            />
          </div>

          {/* ShortName readonly */}
          <div>
            <label style={labelStyle}>Tên viết tắt (không thể thay đổi)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="bi bi-lock-fill" style={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              <input type="text" value={client.shortName} readOnly style={{
                ...inputStyle, background: "var(--muted)", color: "var(--muted-foreground)",
                cursor: "not-allowed", fontFamily: "monospace",
              }} />
            </div>
          </div>

          {/* Địa chỉ */}
          <div>
            <label style={labelStyle}>Địa chỉ</label>
            <input
              type="text" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="123 Đường ABC, TP.HCM" style={inputStyle}
            />
          </div>

          {/* Slogan */}
          <div>
            <label style={labelStyle}>Slogan</label>
            <input
              type="text" value={form.slogan}
              onChange={e => setForm({ ...form, slogan: e.target.value })}
              placeholder="Tiên phong kiến tạo..." style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.1)",
              color: "#ef4444", fontSize: 13,
            }}>
              <i className="bi bi-exclamation-circle-fill" style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10,
          padding: "14px 24px", borderTop: "1px solid var(--border)", background: "var(--muted)",
        }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 10, border: "none",
            background: "transparent", color: "var(--muted-foreground)",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            Huỷ
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 22px", borderRadius: 10, border: "none",
            background: saving ? "var(--muted-foreground)" : "#6366f1",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            boxShadow: "0 3px 10px rgba(99,102,241,0.35)",
          }}>
            {saving ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.7s linear infinite" }} /> Đang lưu...</> : <><i className="bi bi-check-lg" /> Lưu thay đổi</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
