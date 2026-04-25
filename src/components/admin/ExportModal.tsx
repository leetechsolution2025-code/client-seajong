"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Màu nhóm phòng ban ──────────────────────────────────────────────────── */
const GROUP_META: Record<string, { label: string; color: string; bg: string; selectedBg: string; border: string; selectedBorder: string }> = {
  management: {
    label: "Ban quản lý",
    color: "#8b5cf6", bg: "rgba(139,92,246,0.07)", selectedBg: "rgba(139,92,246,0.18)",
    border: "rgba(139,92,246,0.25)", selectedBorder: "#8b5cf6",
  },
  core: {
    label: "Cốt lõi",
    color: "#3b82f6", bg: "rgba(59,130,246,0.07)", selectedBg: "rgba(59,130,246,0.18)",
    border: "rgba(59,130,246,0.25)", selectedBorder: "#3b82f6",
  },
  business: {
    label: "Kinh doanh",
    color: "#10b981", bg: "rgba(16,185,129,0.07)", selectedBg: "rgba(16,185,129,0.18)",
    border: "rgba(16,185,129,0.25)", selectedBorder: "#10b981",
  },
  support: {
    label: "Vận hành",
    color: "#f59e0b", bg: "rgba(245,158,11,0.07)", selectedBg: "rgba(245,158,11,0.18)",
    border: "rgba(245,158,11,0.25)", selectedBorder: "#f59e0b",
  },
};

interface Department {
  id: string; code: string; nameVi: string; nameEn: string;
  group: string; icon: string | null; isActive: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client: { id: string; name: string; shortName: string } | null;
}

type Status = "idle" | "loading" | "success" | "error";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14, flexShrink: 0,
      border: "2px solid currentColor", borderTopColor: "transparent",
      borderRadius: "50%", animation: "em-spin 0.65s linear infinite",
    }} />
  );
}

export function ExportModal({ isOpen, onClose, client }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [resultPath, setResultPath] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [adminInfo, setAdminInfo] = useState<{ email: string; password: string } | null>(null);

  /* Fetch danh mục phòng ban khi mở */
  useEffect(() => {
    if (!isOpen) return;
    setLoadingDepts(true);
    fetch("/api/admin/departments")
      .then(r => r.ok ? r.json() : [])
      .then((data: Department[]) => {
        setDepartments(data);
        setSelected(data.filter(d => d.group === "core").map(d => d.code));
      })
      .catch(() => {})
      .finally(() => setLoadingDepts(false));
  }, [isOpen]);

  function toggle(code: string) {
    setSelected(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  }

  function selectAll()   { setSelected(departments.map(d => d.code)); }
  function deselectAll() { setSelected([]); }

  async function handleExport() {
    if (!client || selected.length === 0) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res  = await fetch("/api/admin/clients/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, selectedModules: selected }),
      });
      const data = await res.json();
      if (data.success) {
        setResultPath(data.path);
        setAdminInfo(data.adminEmail ? { email: data.adminEmail, password: data.adminPassword } : null);
        setStatus("success");
      } else {
        setErrorMsg(`${data.error || "Có lỗi không xác định."}${data.details ? ` — ${data.details}` : ""}`);
        setStatus("error");
      }
    } catch {
      setErrorMsg("Không thể kết nối đến server.");
      setStatus("error");
    }
  }

  function handleClose() {
    setStatus("idle"); setResultPath(""); setErrorMsg("");
    setSelected([]); setAdminInfo(null); onClose();
  }

  /* Nhóm phòng ban */
  const groupOrder = ["management", "core", "business", "support"] as const;
  const grouped = groupOrder.reduce<Record<string, Department[]>>((acc, g) => {
    const items = departments.filter(d => d.group === g && d.isActive !== false);
    if (items.length) acc[g] = items;
    return acc;
  }, {});

  /* ── Overlay style ── */
  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 1060,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
  };

  return (
    <>
      <style>{`
        @keyframes em-spin { to { transform: rotate(360deg); } }
        .em-dept-btn { cursor: pointer; border: none; background: none; padding: 0; text-align: left; width: 100%; transition: transform 0.1s; }
        .em-dept-btn:hover   { transform: translateY(-1px); }
        .em-dept-btn:active  { transform: scale(.97); }
        .em-copy-btn:hover   { opacity: .75; }
      `}</style>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="export-overlay"
              style={overlayStyle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={handleClose}
            />

            {/* Modal — x/y là Framer Motion transform props, không phải CSS */}
            <motion.div
              key="export-modal"
              style={{
                position: "fixed", zIndex: 1070,
                top: "50%", left: "50%",
                width: "calc(100% - 32px)", maxWidth: 640,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 18, boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
                display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden",
              }}
              initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-48%" }}
              animate={{ opacity: 1, scale: 1,    x: "-50%", y: "-50%" }}
              exit={{    opacity: 0, scale: 0.95, x: "-50%", y: "-48%" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >

        {/* ── HEADER ─────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: "rgba(99,102,241,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="bi bi-box-arrow-up-right" style={{ fontSize: 17, color: "#6366f1" }} />
            </div>
            <div>
              <h5 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "var(--foreground)" }}>
                Xuất dự án con
              </h5>
              {client && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
                  <i className="bi bi-buildings" style={{ marginRight: 5, opacity: 0.6 }} />
                  {client.name}
                  <span style={{ fontFamily: "monospace", opacity: 0.6, marginLeft: 6 }}>@{client.shortName}</span>
                </p>
              )}
            </div>
          </div>
          <button onClick={handleClose} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)", padding: "6px 10px",
            borderRadius: 8, fontSize: 16, lineHeight: 1,
            transition: "background 0.12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* ── BODY ───────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ──── STATE: IDLE / SELECT ──── */}
          {(status === "idle" || status === "loading") && (
            <>
              {/* Instruction */}
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 16px", borderRadius: 12, marginBottom: 20,
                background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)",
              }}>
                <i className="bi bi-info-circle-fill" style={{ color: "#6366f1", fontSize: 14, marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, color: "var(--foreground)", lineHeight: 1.6 }}>
                  Chọn các phòng ban / bộ phận sẽ được tích hợp vào dự án con. Dự án sẽ bao gồm toàn bộ mã nguồn, cơ sở dữ liệu và cấu hình tương ứng.
                </p>
              </div>

              {/* Select All / Deselect */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)" }}>
                  Phòng ban / Bộ phận
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={selectAll} style={{
                    fontSize: 12, fontWeight: 700, color: "#6366f1", background: "none",
                    border: "none", cursor: "pointer", padding: "3px 8px", borderRadius: 6,
                  }}>Chọn tất cả</button>
                  <span style={{ color: "var(--border)" }}>|</span>
                  <button onClick={deselectAll} style={{
                    fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", background: "none",
                    border: "none", cursor: "pointer", padding: "3px 8px", borderRadius: 6,
                  }}>Bỏ chọn</button>
                </div>
              </div>

              {/* Depts */}
              {loadingDepts ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                  <Spinner /> &nbsp;Đang tải danh mục...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {Object.entries(grouped).map(([group, items]) => {
                    const meta = GROUP_META[group] || GROUP_META.core;
                    return (
                      <div key={group}>
                        {/* Group label */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                            background: meta.color, flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: 10.5, fontWeight: 900, textTransform: "uppercase",
                            letterSpacing: "0.1em", color: meta.color,
                          }}>
                            {meta.label}
                          </span>
                          <span style={{
                            fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600,
                            background: "var(--muted)", borderRadius: 99, padding: "1px 7px",
                          }}>
                            {items.filter(d => selected.includes(d.code)).length}/{items.length} đã chọn
                          </span>
                        </div>

                        {/* Cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                          {items.map(dept => {
                            const isSelected = selected.includes(dept.code);
                            return (
                              <button key={dept.code} className="em-dept-btn" onClick={() => toggle(dept.code)}
                                disabled={status === "loading"}
                                style={{
                                  borderRadius: 12, padding: "10px 12px",
                                  border: `1.5px solid ${isSelected ? meta.selectedBorder : meta.border}`,
                                  background: isSelected ? meta.selectedBg : meta.bg,
                                  opacity: status === "loading" ? 0.6 : 1,
                                }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{
                                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                    background: isSelected ? meta.color : "var(--muted)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "background 0.15s",
                                  }}>
                                    <i className={`bi ${dept.icon || "bi-diagram-3"}`} style={{
                                      fontSize: 13,
                                      color: isSelected ? "#fff" : meta.color,
                                    }} />
                                  </div>
                                  <span style={{
                                    fontSize: 12, fontWeight: 700,
                                    color: isSelected ? meta.color : "var(--foreground)",
                                    lineHeight: 1.3,
                                  }}>
                                    {dept.nameVi}
                                  </span>
                                  {isSelected && (
                                    <i className="bi bi-check-circle-fill" style={{
                                      marginLeft: "auto", fontSize: 13, color: meta.color, flexShrink: 0,
                                    }} />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary bar */}
              {selected.length > 0 && (
                <div style={{
                  marginTop: 18, padding: "12px 16px", borderRadius: 12,
                  background: "var(--muted)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                }}>
                  <i className="bi bi-collection-fill" style={{ color: "#6366f1", fontSize: 13, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginRight: 4 }}>
                    {selected.length} phòng ban được xuất:
                  </span>
                  {selected.map(code => {
                    const d = departments.find(x => x.code === code);
                    if (!d) return null;
                    const meta = GROUP_META[d.group] || GROUP_META.core;
                    return (
                      <span key={code} style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99,
                        background: meta.selectedBg, color: meta.color,
                        border: `1px solid ${meta.selectedBorder}`,
                      }}>
                        {d.nameVi}
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ──── STATE: SUCCESS ──── */}
          {status === "success" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 8px", gap: 16 }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "rgba(16,185,129,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="bi bi-check-circle-fill" style={{ fontSize: 34, color: "#10b981" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <h4 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>
                  Xuất dự án thành công!
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
                  Dự án con đã được tạo với <strong style={{ color: "var(--foreground)" }}>{selected.length} phòng ban</strong>.
                </p>
              </div>

              {/* Path */}
              <div style={{
                width: "100%", borderRadius: 12, border: "1px solid var(--border)",
                background: "var(--muted)", overflow: "hidden",
              }}>
                <div style={{
                  padding: "8px 14px", borderBottom: "1px solid var(--border)",
                  fontSize: 11, fontWeight: 800, textTransform: "uppercase",
                  letterSpacing: "0.08em", color: "var(--muted-foreground)",
                }}>
                  Đường dẫn dự án
                </div>
                <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 10 }}>
                  <code style={{
                    flex: 1, fontSize: 12, color: "#10b981",
                    wordBreak: "break-all", lineHeight: 1.5,
                  }}>
                    {resultPath}
                  </code>
                  <button className="em-copy-btn" onClick={() => navigator.clipboard.writeText(resultPath)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--muted-foreground)", padding: "4px 6px", borderRadius: 6, flexShrink: 0,
                    transition: "opacity 0.15s",
                  }} title="Copy đường dẫn">
                    <i className="bi bi-clipboard" style={{ fontSize: 14 }} />
                  </button>
                </div>
              </div>

              {/* Admin info */}
              {adminInfo && (
                <div style={{
                  width: "100%", borderRadius: 12, border: "1px solid rgba(245,158,11,0.3)",
                  background: "rgba(245,158,11,0.06)", overflow: "hidden",
                }}>
                  <div style={{
                    padding: "8px 14px", borderBottom: "1px solid rgba(245,158,11,0.2)",
                    fontSize: 11, fontWeight: 800, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "#f59e0b",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <i className="bi bi-key-fill" /> Thông tin đăng nhập lần đầu
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Email</span>
                      <code style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{adminInfo.email}</code>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Mật khẩu tạm</span>
                      <code style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b", letterSpacing: "0.05em" }}>{adminInfo.password}</code>
                    </div>
                  </div>
                </div>
              )}

              {/* Next steps */}
              <div style={{
                width: "100%", borderRadius: 12, border: "1px solid var(--border)",
                background: "var(--muted)", padding: "12px 16px",
              }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)" }}>
                  Bước tiếp theo
                </p>
                <code style={{ fontSize: 12, color: "#6366f1", display: "block", lineHeight: 1.9 }}>
                  cd {resultPath}<br />
                  npm run start:fresh
                </code>
              </div>
            </div>
          )}

          {/* ──── STATE: ERROR ──── */}
          {status === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", gap: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(239,68,68,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="bi bi-exclamation-circle-fill" style={{ fontSize: 30, color: "#ef4444" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 900, color: "var(--foreground)" }}>
                  Xuất thất bại
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: "#ef4444", lineHeight: 1.5 }}>{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", borderTop: "1px solid var(--border)",
          background: "var(--muted)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {status === "idle" || status === "loading"
              ? `${selected.length} / ${departments.length} phòng ban được chọn`
              : status === "success"
              ? "✅ Hoàn tất"
              : "❌ Kiểm tra và thử lại"}
          </span>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleClose} style={{
              padding: "9px 18px", borderRadius: 10, border: "none",
              background: "transparent", color: "var(--muted-foreground)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              {status === "success" ? "Đóng" : "Huỷ"}
            </button>

            {(status === "idle" || status === "error") && (
              <button
                onClick={handleExport}
                disabled={selected.length === 0 || !client}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 22px", borderRadius: 10, border: "none",
                  background: selected.length === 0 || !client ? "var(--muted-foreground)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: selected.length === 0 || !client ? "not-allowed" : "pointer",
                  opacity: selected.length === 0 || !client ? 0.5 : 1,
                  boxShadow: selected.length > 0 && client ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
                  transition: "all 0.15s",
                }}>
                {status === "error" ? <><i className="bi bi-arrow-repeat" /> Thử lại</> : <><i className="bi bi-box-arrow-up-right" /> Bắt đầu xuất</>}
              </button>
            )}

            {status === "loading" && (
              <button disabled style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 22px", borderRadius: 10, border: "none",
                background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "not-allowed", opacity: 0.75,
              }}>
                <Spinner /> Đang xuất...
              </button>
            )}
          </div>
        </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
