"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface TableInfo {
  name: string;
  count: number;
  error?: boolean;
}

export default function DataCleanupPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { success, error: showError } = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetTable, setTargetTable] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/database/tables");
      if (!res.ok) throw new Error("Failed to fetch tables");
      const data = await res.json();
      setTables(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!targetTable) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/database/tables/${targetTable}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi xoá");
      }
      success(`Đã xoá rỗng bảng ${targetTable}`);
      fetchTables();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setTargetTable(null);
    }
  };

  const confirmDelete = (tableName: string) => {
    setTargetTable(tableName);
    setDeleteModalOpen(true);
  };

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "var(--foreground)" }}>
            Làm sạch dữ liệu
          </h1>
          <p style={{ color: "var(--muted-foreground)", margin: 0, fontSize: 14 }}>
            Quản lý các bảng trong cơ sở dữ liệu và xoá rỗng (truncate) toàn bộ dữ liệu khi cần thiết. 
          </p>
        </div>
        <button 
          onClick={fetchTables} 
          disabled={loading}
          style={{ 
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", 
            background: "var(--card)", fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}
        >
          <i className="bi bi-arrow-clockwise" /> Làm mới
        </button>
      </div>

      <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <i className="bi bi-search text-muted-foreground" />
          <input 
            type="text"
            placeholder="Tìm kiếm tên bảng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: 14 }}
          />
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted-foreground)" }}>TÊN BẢNG (TABLE)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "var(--muted-foreground)" }}>SỐ BẢN GHI</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "var(--muted-foreground)", width: 120 }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)" }}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredTables.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)" }}>
                    Không tìm thấy bảng nào
                  </td>
                </tr>
              ) : filteredTables.map((t) => (
                <tr key={t.name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--foreground)" }}>
                    {t.name}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {t.error ? (
                      <span style={{ color: "#ef4444" }}>Lỗi đếm</span>
                    ) : (
                      <span style={{ 
                        display: "inline-block", padding: "2px 8px", borderRadius: 12, 
                        background: t.count > 0 ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)", 
                        color: t.count > 0 ? "#3b82f6" : "#64748b",
                        fontWeight: 700
                      }}>
                        {t.count.toLocaleString("vi-VN")}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => confirmDelete(t.name)}
                      disabled={t.count === 0}
                      style={{
                        padding: "6px 12px", borderRadius: 6, border: "none",
                        background: t.count > 0 ? "rgba(239,68,68,0.1)" : "transparent",
                        color: t.count > 0 ? "#ef4444" : "var(--muted-foreground)",
                        fontSize: 12, fontWeight: 600,
                        cursor: t.count > 0 ? "pointer" : "not-allowed",
                        opacity: t.count > 0 ? 1 : 0.5
                      }}
                    >
                      <i className="bi bi-trash3" style={{ marginRight: 4 }} /> Xoá rỗng
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(0,0,0,0.5)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--card)", padding: 24, borderRadius: 16, width: "100%", maxWidth: 400,
            border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "#ef4444", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="bi bi-exclamation-triangle-fill" /> Cảnh báo rủi ro
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Bạn chuẩn bị xoá toàn bộ dữ liệu trong bảng <strong>{targetTable}</strong>. <br /><br />
              Hành động này sẽ làm rỗng bảng ngay lập tức và <strong>KHÔNG THỂ HOÀN TÁC</strong>. Nếu bảng này đang được liên kết từ bảng khác, hệ thống sẽ báo lỗi.
              <br /><br />
              Bạn có chắc chắn muốn xoá rỗng bảng này không?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button 
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--foreground)", fontSize: 14, fontWeight: 600, cursor: "pointer"
                }}
              >
                Hủy
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: "#ef4444", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8
                }}
              >
                {deleting ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-trash3-fill" />}
                Xác nhận xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
