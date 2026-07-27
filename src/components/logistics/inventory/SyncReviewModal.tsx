"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface SyncReviewModalProps {
  onClose: () => void;
}

export function SyncReviewModal({ onClose }: SyncReviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [diffs, setDiffs] = useState<{ newItems: any[], priceChanges: any[], nameChanges: any[] } | null>(null);
  
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    fetch("/api/logistics/sync-web/diff")
      .then(r => r.json())
      .then(data => {
        setDiffs(data);
        // Default select all changes
        if (data.priceChanges) setSelectedPrices(data.priceChanges.map((p: any) => p.inventoryItemId));
        if (data.nameChanges) setSelectedNames(data.nameChanges.map((n: any) => n.inventoryItemId));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleApply = async () => {
    if (!diffs) return;
    setIsApplying(true);
    try {
      const payload = {
        priceChanges: diffs.priceChanges.filter(p => selectedPrices.includes(p.inventoryItemId)),
        nameChanges: diffs.nameChanges.filter(n => selectedNames.includes(n.inventoryItemId)),
        newItems: diffs.newItems // Auto-apply all new items for now
      };
      
      const res = await fetch("/api/logistics/sync-web/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Cập nhật thất bại");
      
      toast.success("Đã đồng bộ chênh lệch thành công!");
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message);
      setIsApplying(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--card)", width: 700, maxWidth: "90%", maxHeight: "90vh", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Duyệt đồng bộ từ Web (Delta Sync)</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading ? (
            <p>Đang so sánh dữ liệu website và kho...</p>
          ) : !diffs ? (
            <p>Lỗi khi tải dữ liệu.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              
              {/* Giá */}
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: 15, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                  💰 Có {diffs.priceChanges.length} mặt hàng thay đổi giá
                </h4>
                {diffs.priceChanges.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Không có thay đổi.</p> : (
                  <div style={{ background: "var(--muted)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {diffs.priceChanges.map(p => (
                      <label key={p.inventoryItemId} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                        <input type="checkbox" 
                          checked={selectedPrices.includes(p.inventoryItemId)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPrices([...selectedPrices, p.inventoryItemId]);
                            else setSelectedPrices(selectedPrices.filter(id => id !== p.inventoryItemId));
                          }}
                        />
                        <span style={{ flex: 1 }}>{p.name} ({p.sku})</span>
                        <span style={{ color: "var(--muted-foreground)", textDecoration: "line-through" }}>{p.oldPrice?.toLocaleString()}</span>
                        <span>&rarr;</span>
                        <span style={{ fontWeight: 700, color: "#10b981" }}>{p.newPrice?.toLocaleString()}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Tên */}
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: 15, color: "#0ea5e9", display: "flex", alignItems: "center", gap: 6 }}>
                  📝 Có {diffs.nameChanges.length} mặt hàng thay đổi tên
                </h4>
                {diffs.nameChanges.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Không có thay đổi.</p> : (
                  <div style={{ background: "var(--muted)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {diffs.nameChanges.map(n => (
                      <label key={n.inventoryItemId} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                        <input type="checkbox" 
                          checked={selectedNames.includes(n.inventoryItemId)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedNames([...selectedNames, n.inventoryItemId]);
                            else setSelectedNames(selectedNames.filter(id => id !== n.inventoryItemId));
                          }}
                        />
                        <span style={{ width: 80 }}>{n.sku}</span>
                        <span style={{ color: "var(--muted-foreground)", textDecoration: "line-through", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.oldName}</span>
                        <span>&rarr;</span>
                        <span style={{ fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.newName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={isApplying} style={{ padding: "8px 16px", borderRadius: 8, background: "none", border: "1px solid var(--border)" }}>
            Huỷ bỏ
          </button>
          <button onClick={handleApply} disabled={isApplying || loading} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--primary)", color: "#fff", border: "none", fontWeight: 700 }}>
            {isApplying ? "Đang xử lý..." : "Áp dụng cập nhật"}
          </button>
        </div>

      </div>
    </div>
  );
}
