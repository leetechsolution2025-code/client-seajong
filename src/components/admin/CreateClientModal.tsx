"use client";

import React, { useState, useRef } from "react";

interface BranchInput {
  id: string; // temp id for UI
  name: string;
  address: string;
  phone: string;
}

interface FormData {
  name: string;
  shortName: string;
  address: string;
  phone: string;
  email: string;
  taxCode: string;
  slogan: string;
  logoUrl: string;
}

const EMPTY: FormData = {
  name: "", shortName: "", address: "",
  phone: "", email: "", taxCode: "",
  slogan: "", logoUrl: "",
};

export function CreateClientModal({
  isOpen, onClose, onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (client: {
    id: string; name: string; shortName: string;
    logoUrl: string | null; address: string | null;
    slogan: string | null; status: string;
    _count: { modules: number; users: number };
  }) => void;
}) {
  const [loading, setLoading]       = useState(false);
  const [form, setForm]             = useState<FormData>(EMPTY);
  const [error, setError]           = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [branches, setBranches]     = useState<BranchInput[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);


  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name") {
        next.shortName = value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
      }
      return next;
    });
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setLogoPreview(url);
      setForm((prev) => ({ ...prev, logoUrl: url }));
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview(null);
    setForm((prev) => ({ ...prev, logoUrl: "" }));
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Branch helpers ──────────────────────────────────────────────────────
  function addBranch() {
    setBranches((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", address: "", phone: "" },
    ]);
  }

  function updateBranch(id: string, field: keyof BranchInput, value: string) {
    setBranches((prev) => prev.map((b) => b.id === id ? { ...b, [field]: value } : b));
  }

  function removeBranch(id: string) {
    setBranches((prev) => prev.filter((b) => b.id !== id));
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          branches: branches
            .filter((b) => b.name.trim())
            .map(({ id, ...rest }) => rest),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        // Gọi callback với client mới — hiển thị ngay trong bảng
        onCreated?.({
          id:        data.client.id,
          name:      data.client.name,
          shortName: data.client.shortName,
          logoUrl:   data.client.logoUrl   ?? null,
          address:   data.client.address   ?? null,
          slogan:    data.client.slogan    ?? null,
          status:    data.client.status    ?? "active",
          _count:    { modules: 2, users: 1 }, // Core + HR mặc định, 1 admin
        });
        onClose();
        setForm(EMPTY);
        setLogoPreview(null);
        setBranches([]);
      }
    } catch {
      setError("Có lỗi xảy ra khi khởi tạo khách hàng.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1060,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", zIndex: 1070,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%", maxWidth: 580,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        maxHeight: "92vh",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid var(--border)",
          background: "var(--card)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "rgba(99,102,241,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="bi bi-building-add" style={{ color: "#6366f1", fontSize: 17 }} />
            </div>
            <div>
              <h5 style={{ margin: 0, fontWeight: 900, fontSize: 16, color: "var(--foreground)" }}>
                Khởi tạo khách hàng mới
              </h5>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                Tạo doanh nghiệp mới trong hệ thống quản trị
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Form body — scrollable */}
        <form
          onSubmit={handleSubmit}
          style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}
        >

          {/* ── Logo Upload ── */}
          <div>
            <label style={labelStyle}>Logo công ty</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                    >
                      <i className="bi bi-trash" style={{ color: "#fff" }} />
                    </button>
                  </>
                ) : (
                  <i className="bi bi-image" style={{ fontSize: 24, color: "var(--muted-foreground)", opacity: 0.4 }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} className="d-none" id="logo-upload" />
                <label htmlFor="logo-upload" style={uploadLabelStyle}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
                >
                  <i className="bi bi-upload" /> Chọn ảnh logo
                </label>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>PNG, JPG, SVG — tối đa 2MB</p>
                <input
                  type="url" value={logoPreview ? "" : form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="Hoặc dán URL ảnh..."
                  disabled={!!logoPreview}
                  style={{ ...inputStyle, marginTop: 8, opacity: logoPreview ? 0.4 : 1 }}
                />
              </div>
            </div>
          </div>

          {/* ── Thông tin cơ bản ── */}
          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}><i className="bi bi-info-circle me-1" />Thông tin cơ bản</legend>

            <div>
              <label style={labelStyle}>Tên công ty <span style={{ color: "#ef4444" }}>*</span></label>
              <input required type="text" value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Công ty TNHH Giải pháp Công nghệ XYZ" style={inputStyle} />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tên viết tắt <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input required type="text" value={form.shortName}
                    onChange={(e) => setForm({ ...form, shortName: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="xyz-tech"
                    style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} />
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>.vn</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Mã số thuế</label>
                <input type="text" value={form.taxCode}
                  onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                  placeholder="0123456789" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Địa chỉ</label>
              <input type="text" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 Đường ABC, Quận 1, TP.HCM" style={inputStyle} />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Điện thoại</label>
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08xxxxxxxx" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Email liên hệ</label>
                <input type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@company.vn" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Slogan</label>
              <input type="text" value={form.slogan}
                onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                placeholder="Tiên phong kiến tạo giá trị thực" style={inputStyle} />
            </div>
          </fieldset>

          {/* ── Chi nhánh ── */}
          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}><i className="bi bi-geo-alt me-1" />Chi nhánh</legend>

            {branches.length === 0 && (
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                Chưa có chi nhánh nào. Nhấn "+ Thêm chi nhánh" nếu doanh nghiệp có nhiều cơ sở.
              </p>
            )}

            {branches.map((branch, idx) => (
              <div key={branch.id} style={{
                background: "var(--muted)", borderRadius: 12, padding: "14px 16px",
                display: "flex", flexDirection: "column", gap: 10, position: "relative",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 2,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Chi nhánh {idx + 1}
                  </span>
                  <button type="button" onClick={() => removeBranch(branch.id)}
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      color: "#ef4444", fontSize: 13, padding: "2px 6px", borderRadius: 6,
                    }}>
                    <i className="bi bi-trash" />
                  </button>
                </div>

                <div>
                  <label style={labelStyle}>Tên chi nhánh <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="text" value={branch.name}
                    onChange={(e) => updateBranch(branch.id, "name", e.target.value)}
                    placeholder="Chi nhánh Hà Nội"
                    style={{ ...inputStyle, background: "var(--card)" }} />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Địa chỉ</label>
                    <input type="text" value={branch.address}
                      onChange={(e) => updateBranch(branch.id, "address", e.target.value)}
                      placeholder="123 Phố Huế, Hà Nội"
                      style={{ ...inputStyle, background: "var(--card)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Điện thoại</label>
                    <input type="tel" value={branch.phone}
                      onChange={(e) => updateBranch(branch.id, "phone", e.target.value)}
                      placeholder="024xxx"
                      style={{ ...inputStyle, background: "var(--card)" }} />
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={addBranch} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10,
              border: "1.5px dashed var(--border)", background: "transparent",
              color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s", marginTop: branches.length > 0 ? 4 : 0,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
            >
              <i className="bi bi-plus-lg" /> Thêm chi nhánh
            </button>
          </fieldset>

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
        </form>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10,
          padding: "16px 24px", borderTop: "1px solid var(--border)",
          background: "var(--muted)", flexShrink: 0,
        }}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading || !form.name || !form.shortName}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 22px", borderRadius: 10, border: "none",
              background: loading || !form.name || !form.shortName ? "var(--muted-foreground)" : "#6366f1",
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: loading || !form.name || !form.shortName ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, transition: "all 0.15s",
              boxShadow: "0 3px 10px rgba(99,102,241,0.35)",
            }}
          >
            {loading
              ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.7s linear infinite" }} /> Đang tạo...</>
              : <><i className="bi bi-rocket-takeoff" /> Khởi tạo ngay</>
            }
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

/* ─── Style helpers ──────────────────────────────────────────────────────── */
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 800,
  textTransform: "uppercase", letterSpacing: "0.1em",
  color: "var(--muted-foreground)", marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 13px", borderRadius: 9,
  border: "1px solid var(--border)", background: "var(--card)",
  color: "var(--foreground)", fontSize: 13, outline: "none",
  boxSizing: "border-box", transition: "border-color 0.15s",
};
const fieldsetStyle: React.CSSProperties = {
  border: "1px solid var(--border)", borderRadius: 12,
  padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12,
};
const legendStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, textTransform: "uppercase",
  letterSpacing: "0.1em", color: "var(--muted-foreground)",
  padding: "0 6px",
};
const closeBtnStyle: React.CSSProperties = {
  background: "transparent", border: "none", cursor: "pointer",
  color: "var(--muted-foreground)", padding: "4px 8px",
  borderRadius: 8, fontSize: 16, lineHeight: 1, transition: "background 0.15s",
};
const cancelBtnStyle: React.CSSProperties = {
  padding: "9px 18px", borderRadius: 10, border: "none",
  background: "transparent", color: "var(--muted-foreground)",
  fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "color 0.15s",
};
const uploadLabelStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "8px 14px", borderRadius: 10, cursor: "pointer",
  border: "1px solid var(--border)", background: "var(--muted)",
  color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500,
  transition: "color 0.15s",
};
