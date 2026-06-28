"use client";

import React, { useState } from "react";
import { CreateClientModal } from "@/components/admin/CreateClientModal";
import { EditClientModal }   from "@/components/admin/EditClientModal";
import { ExportModal }       from "@/components/admin/ExportModal";

interface Client {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  address: string | null;
  slogan: string | null;
  status: string;
  config: string | null;
  _count: { modules: number; users: number };
}

export default function ClientsContent({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients]   = useState<Client[]>(initialClients);
  const [search, setSearch]     = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget]     = useState<Client | null>(null);
  const [exportTarget, setExportTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState("");

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.shortName.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreated(newClient: Client) {
    setClients(prev => [newClient, ...prev]);
    setIsCreateOpen(false);
  }

  function handleSaved(updated: Client) {
    setClients(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    // 🔒 Guard kép: tuyệt đối không xoá LEETECH
    if (deleteTarget.shortName === "leetech") {
      setDeleteError("Không thể xoá LEETECH — đây là công ty chủ quản hệ thống");
      return;
    }
    setDeletingId(deleteTarget.id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/clients/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Xoá thất bại");
      setClients(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .kh-row:hover { background: var(--muted); }
        .kh-action-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;
          border: 1px solid var(--border); background: var(--card);
          color: var(--muted-foreground); cursor: pointer;
          transition: all 0.15s; white-space: nowrap;
        }
        .kh-action-btn:hover { color: var(--foreground); background: var(--muted); }
        .kh-action-btn.export { border-color: rgba(99,102,241,0.35); color: #6366f1; background: rgba(99,102,241,0.08); }
        .kh-action-btn.export:hover { background: #6366f1; color: #fff; }
        .kh-action-btn.edit   { border-color: rgba(59,130,246,0.35); color: #3b82f6; background: rgba(59,130,246,0.08); }
        .kh-action-btn.edit:hover   { background: #3b82f6; color: #fff; }
        .kh-action-btn.delete { border-color: rgba(239,68,68,0.3); color: #ef4444; background: rgba(239,68,68,0.06); }
        .kh-action-btn.delete:hover { background: #ef4444; color: #fff; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--foreground)" }}>
            Quản lý Khách hàng
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
            {clients.length} doanh nghiệp đang sử dụng hệ thống
          </p>
        </div>
        <button
          id="btn-create-client"
          onClick={() => setIsCreateOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
          }}
        >
          <i className="bi bi-plus-lg" />
          Thêm khách hàng
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ position: "relative", maxWidth: 360, marginBottom: 20 }}>
        <i className="bi bi-search" style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          color: "var(--muted-foreground)", fontSize: 13,
        }} />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm tên hoặc mã khách hàng..."
          style={{
            width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 9, paddingBottom: 9,
            borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)",
            color: "var(--foreground)", fontSize: 13, outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* ── Table ── */}
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 16, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--muted)" }}>
              {["Khách hàng", "Trạng thái", "Modules", "Người dùng", "Thao tác"].map((h, i) => (
                <th key={h} style={{
                  padding: "12px 20px", fontSize: 11, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  color: "var(--muted-foreground)",
                  textAlign: i === 0 ? "left" : i === 4 ? "right" : "center",
                  whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                  {search ? (
                    <div>
                      <i className="bi bi-search" style={{ fontSize: 32, opacity: 0.2, display: "block", marginBottom: 8 }} />
                      <p style={{ margin: 0, fontSize: 13 }}>Không tìm thấy kết quả cho &quot;{search}&quot;</p>
                    </div>
                  ) : (
                    <div>
                      <i className="bi bi-buildings" style={{ fontSize: 36, opacity: 0.2, display: "block", marginBottom: 12 }} />
                      <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 14 }}>Chưa có khách hàng nào</p>
                      <button onClick={() => setIsCreateOpen(true)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#6366f1", fontWeight: 700, fontSize: 13,
                      }}>
                        Thêm khách hàng đầu tiên →
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((client, idx) => (
                <tr key={client.id} className="kh-row" style={{
                  borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                  transition: "background 0.12s",
                }}>
                  {/* Khách hàng */}
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, flexShrink: 0, borderRadius: 11,
                        border: "none", background: "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "hidden",
                      }}>
                        {client.logoUrl ? (
                          <img src={client.logoUrl} alt={client.name} width={42} height={42} style={{ objectFit: "contain", borderRadius: 8 }} />
                        ) : (
                          <span style={{ fontSize: 16, fontWeight: 900, color: "rgba(99,102,241,0.5)" }}>
                            {client.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>
                          {client.name}
                        </p>
                        <p style={{ margin: 0, fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)" }}>
                          @{client.shortName}
                        </p>
                        {client.address && (
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="bi bi-geo-alt" /> {client.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Trạng thái */}
                  <td style={{ padding: "14px 20px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: client.status === "active" ? "rgba(16,185,129,0.12)" : "var(--muted)",
                      color:      client.status === "active" ? "#10b981"                : "var(--muted-foreground)",
                      border:     `1px solid ${client.status === "active" ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: client.status === "active" ? "#10b981" : "var(--muted-foreground)",
                      }} />
                      {client.status === "active" ? "Hoạt động" : client.status}
                    </span>
                  </td>

                  {/* Modules */}
                  <td style={{ padding: "14px 20px", textAlign: "center" }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 800,
                      background: "rgba(99,102,241,0.1)", color: "#6366f1",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}>
                      {client._count.modules} modules
                    </span>
                  </td>

                  {/* Users */}
                  <td style={{ padding: "14px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                    <i className="bi bi-person" style={{ marginRight: 5, fontSize: 12 }} />
                    {client._count.users}
                  </td>

                  {/* Thao tác */}
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                      <button className="kh-action-btn export" onClick={() => setExportTarget(client)}>
                        <i className="bi bi-cloud-arrow-down" /> Export
                      </button>
                      <button className="kh-action-btn edit" onClick={() => setEditTarget(client)}>
                        <i className="bi bi-pencil" /> Sửa
                      </button>
                      {/* 🔒 Ẩn nút Xoá với LEETECH */}
                      {client.shortName !== "leetech" && (
                        <button className="kh-action-btn delete" onClick={() => { setDeleteTarget(client); setDeleteError(""); }}>
                          <i className="bi bi-trash" /> Xoá
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modals ── */}
      <CreateClientModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newClient) => {
          // Bỏ qua nếu shortName là leetech (chủ quản)
          if (newClient.shortName !== "leetech") {
            setClients(prev => [{ ...newClient, config: null } as Client, ...prev]);
          }
          setIsCreateOpen(false);
        }}
      />
      <EditClientModal   client={editTarget}   onClose={() => setEditTarget(null)} onSaved={(u) => handleSaved(u as Client)} />
      <ExportModal       isOpen={exportTarget !== null} onClose={() => setExportTarget(null)} client={exportTarget} onSaved={(u) => handleSaved(u as Client)} />

      {/* ── Confirm Delete ── */}
      {deleteTarget && (
        <>
          <div onClick={() => setDeleteTarget(null)} style={{
            position: "fixed", inset: 0, zIndex: 1090,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          }} />
          <div style={{
            position: "fixed", zIndex: 1100,
            top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "100%", maxWidth: 420,
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "28px 28px 24px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 44, height: 44, flexShrink: 0, borderRadius: 12,
                background: "rgba(239,68,68,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 20, color: "#ef4444" }} />
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "var(--foreground)" }}>
                  Xác nhận xoá khách hàng
                </h5>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
                  Xoá <strong>{deleteTarget.name}</strong> sẽ xoá toàn bộ dữ liệu và tài khoản liên quan. Hành động này <strong>không thể hoàn tác</strong>.
                </p>
              </div>
            </div>

            {deleteError && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.1)",
                color: "#ef4444", fontSize: 13,
              }}>
                <i className="bi bi-exclamation-circle-fill" style={{ marginRight: 6 }} />{deleteError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button onClick={() => setDeleteTarget(null)} style={{
                padding: "9px 20px", borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--muted)", color: "var(--foreground)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                Huỷ bỏ
              </button>
              <button onClick={handleDelete} disabled={!!deletingId} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 22px", borderRadius: 10, border: "none",
                background: "#ef4444", color: "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: deletingId ? "not-allowed" : "pointer", opacity: deletingId ? 0.7 : 1,
              }}>
                {deletingId
                  ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 0.7s linear infinite" }} /> Đang xoá...</>
                  : <><i className="bi bi-trash" /> Xoá khách hàng</>
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
