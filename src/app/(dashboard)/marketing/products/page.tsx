"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

import { ProductDrawer, Product, Category, SyncLog } from "@/components/marketing/ProductDrawer";
// ── ProductCard ────────────────────────────────────────────────────────────────
function ProductCard({ p, cats, onClick }: { p: Product; cats: Category[]; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const catNames = p.categories
    .map(id => cats.find(c => c.id === id)?.name)
    .filter(Boolean).slice(0, 2) as string[];

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 14, border: "1.5px solid var(--border)",
        background: "var(--card)", overflow: "hidden",
        cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "none";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ height: 180, background: "#f5f5f5", overflow: "hidden", position: "relative", flexShrink: 0 }}>
        {p.images[0] && !imgError ? (
          <img src={p.images[0]} alt={p.name} onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-image" style={{ fontSize: 32, color: "#ccc" }} />
          </div>
        )}
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {catNames.map(n => (
            <span key={n} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(0,48,135,0.85)", color: "#fff", backdropFilter: "blur(4px)" }}>{n}</span>
          ))}
        </div>
        {p.images.length > 1 && (
          <span style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.45)", borderRadius: 99, padding: "2px 7px" }}>
            <i className="bi bi-images me-1" />{p.images.length} ảnh
          </span>
        )}
      </div>
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {p.name}
        </p>
        {p.excerpt && (
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {p.excerpt}
          </p>
        )}
        {Object.keys(p.specs).length > 0 && (
          <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(p.specs).slice(0, 2).map(([k, v]) => (
              <span key={k} style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>
                <b style={{ color: "var(--foreground)" }}>{k}:</b> {v}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#d97706" }}>
              {p.price > 0 ? `${p.price.toLocaleString("vi-VN")} đ` : "Liên hệ"}
            </span>
            <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
              <i className="bi bi-clock me-1" />{new Date(p.updatedAt).toLocaleDateString("vi-VN")}
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#003087" }}>
            Xem chi tiết <i className="bi bi-arrow-right" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── SyncPanel ─────────────────────────────────────────────────────────────────
function SyncPanel({ onSyncDone }: { onSyncDone: () => void }) {
  const [log, setLog]            = useState<SyncLog | null>(null);
  const [productCount, setCount] = useState(0);
  const [syncing, setSyncing]    = useState(false);

  const fetchStatus = async () => {
    try {
      const r = await fetch("/api/seajong/sync");
      if (!r.ok) return;
      const text = await r.text();
      if (!text) return;
      const d = JSON.parse(text);
      setLog(d.log ?? null);
      setCount(d.productCount ?? 0);
      setSyncing(d.log?.status === "running");
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchStatus(); }, []);
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(() => {
      fetchStatus().then(() => { if (!syncing) onSyncDone(); });
    }, 3000);
    return () => clearInterval(t);
  }, [syncing, onSyncDone]);

  const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/seajong/sync", { method: "POST" });
    fetchStatus();
  };

  const isRunning = log?.status === "running";
  const isSuccess = log?.status === "success";
  const isError   = log?.status === "error";
  const lastSynced = log?.finishedAt ? new Date(log.finishedAt).toLocaleString("vi-VN") : null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      padding: "10px 16px", borderRadius: 12, marginBottom: 16,
      background: productCount === 0 ? "rgba(239,68,68,0.06)" : "rgba(0,48,135,0.05)",
      border: `1.5px solid ${productCount === 0 ? "rgba(239,68,68,0.2)" : "rgba(0,48,135,0.15)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: productCount === 0 ? "rgba(239,68,68,0.1)" : "rgba(0,48,135,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`bi ${productCount === 0 ? "bi-database-x" : "bi-database-check"}`} style={{ fontSize: 16, color: productCount === 0 ? "#ef4444" : "#003087" }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
            {productCount === 0 ? "Chưa có dữ liệu" : `${productCount} sản phẩm trong DB`}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
            {isRunning && <><i className="bi bi-arrow-repeat spin me-1" style={{ color: "#f59e0b" }} />{log?.message}</>}
            {isSuccess && lastSynced && <><i className="bi bi-check-circle me-1" style={{ color: "#10b981" }} />Đồng bộ lúc {lastSynced}</>}
            {isError   && <><i className="bi bi-x-circle me-1" style={{ color: "#ef4444" }} />{log?.message}</>}
            {!log      && "Chưa thực hiện đồng bộ"}
          </p>
        </div>
      </div>

      {isRunning && (
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ height: 4, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#f59e0b", width: `${Math.min(100, (log.totalSynced / 216) * 100)}%`, transition: "width 0.5s", borderRadius: 99 }} />
          </div>
          <p style={{ margin: "3px 0 0", fontSize: 10, color: "var(--muted-foreground)", textAlign: "right" }}>
            {log.totalSynced} / ~216 sản phẩm
          </p>
        </div>
      )}

      <button
        onClick={handleSync} disabled={isRunning}
        style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700,
          background: isRunning ? "var(--border)" : "#003087",
          color: isRunning ? "var(--muted-foreground)" : "#fff",
          border: "none", cursor: isRunning ? "default" : "pointer",
        }}>
        <i className={`bi bi-arrow-repeat${isRunning ? " spin" : ""}`} />
        {isRunning ? "Đang đồng bộ…" : productCount === 0 ? "Đồng bộ ngay" : "Đồng bộ lại"}
      </button>
    </div>
  );
}


// Component dropdown danh mục — dùng CSS variables, tương thích cả Light/Dark mode
// Khi groupFilter được chọn, topGroups chỉ chứa 1 group → dropdown chỉ hiện cấp con (giảm nesting)
function MacCategorySelect({ categories, value, onChange, topGroups, getChildren, groupActive }: { 
  categories: Category[];
  value: string; 
  onChange: (v: string) => void;
  topGroups: Category[];
  getChildren: (id: number) => Category[];
  groupActive: boolean; // true khi đang lọc theo 1 group cụ thể
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const selectedName = value === "" ? "Tất cả danh mục" : (categories.find(c => c.id.toString() === value)?.name || "Tất cả danh mục");

  const handleSelect = (v: string) => {
    onChange(v);
    setIsOpen(false);
  };

  const renderLabel = (name: string) => (
    <div style={{
      padding: "10px 14px 4px",
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--muted-foreground)",
    }}>
      {name}
    </div>
  );

  const renderOption = (id: string, name: string, level: number) => {
    const isSelected = value === id;
    const pl = level === 0 ? 14 : level === 1 ? 28 : 40;

    return (
      <div
        key={id || `all-${name}`}
        onClick={() => handleSelect(id)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: `7px 12px 7px ${pl}px`,
          cursor: "pointer", borderRadius: 7, margin: "1px 6px",
          fontSize: level === 2 ? 12.5 : 13,
          fontWeight: isSelected ? 600 : 400,
          background: isSelected ? "rgba(79,70,229,0.1)" : "transparent",
          color: isSelected ? "var(--primary)" : "var(--foreground)",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--muted)" }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent" }}
      >
        {/* Checkmark vùng cố định */}
        <div style={{ width: 16, flexShrink: 0, display: "flex", alignItems: "center" }}>
          {isSelected && <i className="bi bi-check2" style={{ fontSize: 14, color: "var(--primary)" }} />}
        </div>
        {/* Icon phân cấp */}
        {level === 1 && !isSelected && (
          <i className="bi bi-plus" style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0, opacity: 0.7 }} />
        )}
        {level === 1 && isSelected && (
          <i className="bi bi-plus" style={{ fontSize: 13, color: "var(--primary)", flexShrink: 0 }} />
        )}
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .cat-dropdown-scroll::-webkit-scrollbar { width: 0; }
        .cat-dropdown-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div ref={ref} style={{ position: "relative", width: "fit-content", flexShrink: 0 }}>
        {/* Nút trigger */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 12px 9px 14px",
            borderRadius: 10,
            border: `1.5px solid ${isOpen ? "var(--primary)" : "var(--border)"}`,
            background: "var(--card)",
            fontSize: 13, fontWeight: 500,
            color: value ? "var(--foreground)" : "var(--muted-foreground)",
            cursor: "pointer",
            boxShadow: isOpen ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
            transition: "all 0.15s",
            minWidth: 160, maxWidth: 260,
            userSelect: "none",
          }}
        >
          <i className="bi bi-funnel" style={{ fontSize: 12, color: "var(--muted-foreground)", flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedName}
          </span>
          <i
            className={`bi bi-chevron-${isOpen ? "up" : "down"}`}
            style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0, transition: "transform 0.2s" }}
          />
        </div>

        {/* Dropdown panel */}
        {isOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            width: 260, zIndex: 9999,
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)",
            // Khoá cứng chiều cao — KHÔNG CHO PHÉP TỰ GIÃN KHI CUỘN
            height: 360,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Danh sách cuộn */}
            <div className="cat-dropdown-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 0 8px" }}>

              {/* Mục "Tất cả" */}
              {renderOption("", groupActive ? "Tất cả trong nhóm" : "Tất cả danh mục", 0)}

              <div style={{ height: 1, background: "var(--border)", margin: "6px 14px" }} />

              {topGroups.map(group => {
                const level1 = getChildren(group.id);
                if (level1.length === 0) return null;
                return (
                  <div key={group.id}>
                    {/* Khi groupActive=true, bỏ heading group → danh mục hiện thẳng từ cấp 0 */}
                    {!groupActive && renderLabel(group.name)}
                    {level1.map(cat => {
                      const level2 = getChildren(cat.id);
                      return (
                        <React.Fragment key={cat.id}>
                          {renderOption(String(cat.id), cat.name, groupActive ? 0 : 1)}
                          {level2.map(sub => renderOption(String(sub.id), sub.name, groupActive ? 1 : 2))}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MarketingProductsPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<Product | null>(null);
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid");

  // Sync state (inline, no SyncPanel component needed in toolbar)
  const [syncLog, setSyncLog]   = useState<SyncLog | null>(null);
  const [syncing, setSyncing]   = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const [search, setSearch]                   = useState("");
  const [catFilter, setCatFilter]             = useState("");
  const [groupFilter, setGroupFilter]         = useState<number | null>(null);
  const [page, setPage]                       = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/seajong/sync");
      if (!r.ok) return;
      const text = await r.text();
      if (!text) return;
      const d = JSON.parse(text);
      setSyncLog(d.log ?? null);
      setSyncing(d.log?.status === "running");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSyncStatus(); }, [fetchSyncStatus]);

  // Auto-open modal if sync is running on load
  useEffect(() => { if (syncing) setShowSyncModal(true); }, [syncing]);

  // Poll while syncing
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(fetchSyncStatus, 3000);
    return () => clearInterval(t);
  }, [syncing, fetchSyncStatus]);

  const handleSync = async () => {
    setShowSyncModal(true);
    setSyncing(true);
    await fetch("/api/seajong/sync", { method: "POST" });
    fetchSyncStatus();
  };

  // Fetch categories once
  useEffect(() => {
    fetch("/api/seajong/categories")
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "24" });
      if (catFilter)                 params.set("category", catFilter);
      else if (groupFilter !== null) params.set("category", String(groupFilter));
      if (debouncedSearch)           params.set("search", debouncedSearch);
      const res = await fetch(`/api/seajong/products?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProducts(data.products || []);
      setPagination(data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [page, catFilter, groupFilter, debouncedSearch]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Build category tree
  const topGroups   = categories.filter(c => c.parent === 0);
  const getChildren = (parentId: number) => categories.filter(c => c.parent === parentId && c.count > 0);

  const CHIP_GROUPS = ["Thiết bị vệ sinh", "Thiết bị nhà bếp"];
  const chipGroups  = topGroups.filter(g => CHIP_GROUPS.includes(g.name));
  const otherGroups = topGroups.filter(g => !CHIP_GROUPS.includes(g.name));

  const dropdownGroups = groupFilter !== null
    ? topGroups.filter(g => g.id === groupFilter)
    : otherGroups;

  const handleGroupChip = (id: number) => {
    const next = groupFilter === id ? null : id;
    setGroupFilter(next);
    setCatFilter("");
    setPage(1);
  };

  const isRunning = syncLog?.status === "running";
  const isSuccess = syncLog?.status === "success";
  const lastSynced = syncLog?.finishedAt
    ? new Date(syncLog.finishedAt).toLocaleString("vi-VN")
    : null;

  // All sub-categories of currently active group (for row-2 chips)
  const activeCatChips: Category[] = groupFilter !== null
    ? getChildren(groupFilter)
    : [];

  // ── Sync Modal ─────────────────────────────────────────────────────────────
  const syncProgress = syncLog?.totalSynced ?? 0;
  const TOTAL_PRODUCTS = 216;
  const progressPct = Math.min(100, Math.round((syncProgress / TOTAL_PRODUCTS) * 100));
  const syncStatusColor = syncLog?.status === "success" ? "#10b981"
    : syncLog?.status === "error" ? "#ef4444"
    : "#f59e0b";

  const SyncModal = showSyncModal && (
    <>
      {/* Backdrop */}
      <div
        onClick={() => { if (!isRunning) setShowSyncModal(false); }}
        style={{
          position: "fixed", inset: 0, zIndex: 1050,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        }}
      />
      {/* Modal */}
      <div style={{
        position: "fixed", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1051, width: 480,
        background: "var(--card)",
        borderRadius: 18,
        border: "1.5px solid var(--border)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isRunning ? "rgba(245,158,11,0.12)" : syncLog?.status === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i
                className={`bi ${
                  isRunning ? "bi-arrow-repeat spin"
                  : syncLog?.status === "success" ? "bi-check-circle-fill"
                  : syncLog?.status === "error" ? "bi-x-circle-fill"
                  : "bi-arrow-repeat"
                }`}
                style={{ fontSize: 17, color: syncStatusColor }}
              />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
                {isRunning ? "Đang đồng bộ dữ liệu…" : syncLog?.status === "success" ? "Đồng bộ hoàn tất" : syncLog?.status === "error" ? "Đồng bộ thất bại" : "Đồng bộ dữ liệu"}
              </p>
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)" }}>
                seajong.com → Cơ sở dữ liệu nội bộ
              </p>
            </div>
          </div>
          {!isRunning && (
            <button
              onClick={() => setShowSyncModal(false)}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: "1.5px solid var(--border)", background: "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--muted-foreground)",
              }}
            >
              <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>

          {/* Progress bar */}
          {(isRunning || syncProgress > 0) && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Tiến độ</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: syncStatusColor }}>{progressPct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: isRunning
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : syncLog?.status === "success" ? "#10b981" : "#ef4444",
                  width: `${progressPct}%`,
                  transition: "width 0.5s ease",
                  boxShadow: isRunning ? "0 0 12px rgba(245,158,11,0.5)" : "none",
                }} />
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--background)", border: "1px solid var(--border)",
            }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Sản phẩm</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>
                {syncProgress}
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)", marginLeft: 4 }}>/ ~{TOTAL_PRODUCTS}</span>
              </p>
            </div>
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--background)", border: "1px solid var(--border)",
            }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Trạng thái</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: syncStatusColor, display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                <i className={`bi ${
                  isRunning ? "bi-hourglass-split"
                  : syncLog?.status === "success" ? "bi-check2-circle"
                  : syncLog?.status === "error" ? "bi-exclamation-triangle"
                  : "bi-dash-circle"
                }`} />
                {isRunning ? "Đang chạy" : syncLog?.status === "success" ? "Thành công" : syncLog?.status === "error" ? "Lỗi" : "Chờ"}
              </p>
            </div>
          </div>

          {/* Log message */}
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: isRunning ? "rgba(245,158,11,0.06)" : "var(--background)",
            border: `1px solid ${isRunning ? "rgba(245,158,11,0.2)" : "var(--border)"}`,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <i
              className={`bi ${isRunning ? "bi-terminal" : "bi-info-circle"}`}
              style={{ fontSize: 13, color: "var(--muted-foreground)", flexShrink: 0, marginTop: 1 }}
            />
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.6, fontFamily: "monospace" }}>
              {syncLog?.message || "Bắt đầu..."}
            </p>
          </div>

          {/* Footer actions */}
          {!isRunning && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {syncLog?.status === "error" && (
                <button
                  onClick={handleSync}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                    background: "#003087", color: "#fff",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <i className="bi bi-arrow-repeat" /> Thử lại
                </button>
              )}
              {syncLog?.status === "success" && (
                <button
                  onClick={() => { fetchProducts(); setShowSyncModal(false); }}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                    background: "#003087", color: "#fff",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <i className="bi bi-grid-3x3-gap-fill" /> Xem sản phẩm
                </button>
              )}
              <button
                onClick={() => setShowSyncModal(false)}
                style={{
                  padding: "9px 18px", borderRadius: 9,
                  border: "1.5px solid var(--border)", background: "transparent",
                  color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div style={{ background: "var(--background)" }}>
      <PageHeader
        title="Sản phẩm Seajong"
        description={pagination?.total ? `${pagination.total} sản phẩm — cơ sở dữ liệu nội bộ` : "Dữ liệu sản phẩm từ seajong.com"}
        color="blue"
        icon="bi-box-seam"
      />

      {/* ── Unified Toolbar (sticky) ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--background)", padding: "10px 24px 0" }}>

        {/* ── Hàng 1: Search | Toggles | Dropdown | [right] Grid/List | Đồng bộ ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap",
          padding: "8px 14px",
          background: "var(--card)",
          border: "1.5px solid var(--border)",
          borderRadius: activeCatChips.length > 0 ? "12px 12px 0 0" : 12,
          borderBottom: activeCatChips.length > 0 ? "1px solid var(--border)" : undefined,
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 0 }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 13 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm theo tên..."
              style={{
                width: "100%", padding: "7px 10px 7px 33px",
                borderRadius: 8, border: "1.5px solid var(--border)",
                background: "var(--background)", fontSize: 13,
                outline: "none", color: "var(--foreground)",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: "var(--border)", flexShrink: 0 }} />

          {/* Toggle chips (Thiết bị vệ sinh / Thiết bị nhà bếp) */}
          {chipGroups.map(g => {
            const active = groupFilter === g.id;
            return (
              <div
                key={g.id}
                onClick={() => handleGroupChip(g.id)}
                style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", flexShrink: 0, userSelect: "none" }}
              >
                <div style={{
                  width: 34, height: 18, borderRadius: 99, flexShrink: 0,
                  background: active ? "var(--primary)" : "var(--border)",
                  position: "relative", transition: "background 0.2s ease",
                  boxShadow: active ? "0 0 0 3px rgba(79,70,229,0.15)" : "none",
                }}>
                  <div style={{
                    position: "absolute", top: 2, left: active ? 16 : 2,
                    width: 14, height: 14, borderRadius: "50%",
                    background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                    transition: "left 0.2s ease",
                  }} />
                </div>
                <span style={{
                  fontSize: 12.5, fontWeight: active ? 600 : 400,
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  whiteSpace: "nowrap", transition: "color 0.15s",
                }}>{g.name}</span>
              </div>
            );
          })}

          {/* Right-side controls */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Pagination info */}
            {pagination && (
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap", marginRight: 4 }}>
                <b style={{ color: "var(--foreground)" }}>{pagination.total}</b> sản phẩm
                &nbsp;·&nbsp; trang <b style={{ color: "var(--foreground)" }}>{pagination.page}</b>/{pagination.totalPages}
              </span>
            )}

            {/* Divider */}
            <div style={{ width: 1, height: 22, background: "var(--border)" }} />

            {/* View mode: Grid */}
            <button
              onClick={() => setViewMode("grid")}
              title="Xem dạng lưới"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: viewMode === "grid" ? "rgba(79,70,229,0.12)" : "transparent",
                color: viewMode === "grid" ? "var(--primary)" : "var(--muted-foreground)",
                transition: "all 0.15s",
              }}
            >
              <i className="bi bi-grid-3x3-gap-fill" style={{ fontSize: 15 }} />
            </button>

            {/* View mode: List */}
            <button
              onClick={() => setViewMode("list")}
              title="Xem dạng bảng"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: viewMode === "list" ? "rgba(79,70,229,0.12)" : "transparent",
                color: viewMode === "list" ? "var(--primary)" : "var(--muted-foreground)",
                transition: "all 0.15s",
              }}
            >
              <i className="bi bi-list-ul" style={{ fontSize: 16 }} />
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 22, background: "var(--border)" }} />

            {/* Sync button */}
            <button
              onClick={handleSync} disabled={isRunning}
              title={isSuccess && lastSynced ? `Đồng bộ lúc ${lastSynced}` : "Đồng bộ dữ liệu"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                background: isRunning ? "var(--border)" : "#003087",
                color: isRunning ? "var(--muted-foreground)" : "#fff",
                border: "none", cursor: isRunning ? "default" : "pointer",
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              <i className={`bi bi-arrow-repeat${isRunning ? " spin" : ""}`} style={{ fontSize: 13 }} />
              {isRunning ? "Đang đồng bộ…" : "Đồng bộ"}
            </button>
          </div>
        </div>

        {/* ── Hàng 2: Category chips (chỉ hiện khi đang chọn group hoặc có danh mục) ── */}
        {(activeCatChips.length > 0 || catFilter) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            padding: "8px 14px 10px",
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginRight: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Danh mục:
            </span>
            {/* "Tất cả" chip */}
            <button
              onClick={() => { setCatFilter(""); setPage(1); }}
              style={{
                padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: catFilter === "" ? 700 : 500,
                background: catFilter === "" ? "var(--primary)" : "var(--background)",
                color: catFilter === "" ? "#fff" : "var(--muted-foreground)",
                border: `1.5px solid ${catFilter === "" ? "var(--primary)" : "var(--border)"}`,
                cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              Tất cả
            </button>
            {activeCatChips.map(cat => {
              const active = catFilter === String(cat.id);
              const subCats = getChildren(cat.id);
              return (
                <React.Fragment key={cat.id}>
                  <button
                    onClick={() => { setCatFilter(active ? "" : String(cat.id)); setPage(1); }}
                    style={{
                      padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: active ? 700 : 500,
                      background: active ? "var(--primary)" : "var(--background)",
                      color: active ? "#fff" : "var(--foreground)",
                      border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                    }}
                  >
                    {cat.name}
                    {cat.count > 0 && (
                      <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.75 }}>({cat.count})</span>
                    )}
                  </button>
                  {/* Danh mục con nếu có và đang active */}
                  {active && subCats.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => { setCatFilter(catFilter === String(sub.id) ? String(cat.id) : String(sub.id)); setPage(1); }}
                      style={{
                        padding: "2px 10px", borderRadius: 99, fontSize: 11.5, fontWeight: catFilter === String(sub.id) ? 700 : 400,
                        background: catFilter === String(sub.id) ? "rgba(79,70,229,0.15)" : "transparent",
                        color: catFilter === String(sub.id) ? "var(--primary)" : "var(--muted-foreground)",
                        border: `1px solid ${catFilter === String(sub.id) ? "var(--primary)" : "var(--border)"}`,
                        cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                      }}
                    >
                      {sub.name}
                    </button>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        )}

      </div>

      {/* Content — flow tự nhiên */}
      <div style={{ padding: "20px 24px 24px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
            <i className="bi bi-arrow-repeat spin" style={{ fontSize: 28, display: "block", marginBottom: 12 }} />
            Đang tải dữ liệu…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#ef4444" }}>
            <i className="bi bi-exclamation-triangle" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
            {error}
            <button onClick={fetchProducts} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "1.5px solid #ef4444", background: "transparent", color: "#ef4444", cursor: "pointer", fontWeight: 600 }}>
              Thử lại
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
            <i className="bi bi-box-seam" style={{ fontSize: 32, display: "block", marginBottom: 10, color: "var(--muted-foreground)", opacity: 0.5 }} />
            <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Không tìm thấy sản phẩm nào</p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>Vui lòng thay đổi từ khóa hoặc bộ lọc danh mục.</p>
          </div>
        )}

        {/* Product Grid / List */}
        {!loading && products.length > 0 && (
          viewMode === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              {products.map(p => (
                <ProductCard key={p.id} p={p} cats={categories} onClick={() => setSelected(p)} />
              ))}
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: "1.5px solid var(--border)", overflow: "hidden", marginBottom: 24 }}>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "60px 1fr 180px 100px 120px",
                padding: "9px 14px", background: "var(--muted)",
                borderBottom: "1px solid var(--border)",
                fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)",
                letterSpacing: "0.03em", textTransform: "uppercase",
              }}>
                <span>Ảnh</span>
                <span>Tên sản phẩm</span>
                <span>Danh mục</span>
                <span>Thông số</span>
                <span style={{ textAlign: "right" }}>Cập nhật</span>
              </div>
              {products.map((p, idx) => {
                const catNames = p.categories.map(id => categories.find(c => c.id === id)?.name).filter(Boolean) as string[];
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelected(p)}
                    style={{
                      display: "grid", gridTemplateColumns: "60px 1fr 180px 100px 120px",
                      padding: "10px 14px", alignItems: "center",
                      background: idx % 2 === 0 ? "var(--card)" : "var(--background)",
                      borderBottom: idx < products.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: "pointer", transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(79,70,229,0.05)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "var(--card)" : "var(--background)"}
                  >
                    {/* Ảnh */}
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "var(--muted)", flexShrink: 0 }}>
                      {p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-image" style={{ fontSize: 16, color: "#ccc" }} />
                        </div>
                      )}
                    </div>
                    {/* Tên */}
                    <div style={{ paddingRight: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                      {p.excerpt && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.excerpt}</p>}
                    </div>
                    {/* Danh mục */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {catNames.slice(0,2).map(n => (
                        <span key={n} style={{ fontSize: 10.5, padding: "1px 8px", borderRadius: 99, background: "rgba(0,48,135,0.1)", color: "#003087", fontWeight: 600 }}>{n}</span>
                      ))}
                    </div>
                    {/* Thông số count */}
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      {Object.keys(p.specs).length > 0 ? `${Object.keys(p.specs).length} thông số` : <span style={{ opacity: 0.4 }}>—</span>}
                    </div>
                    {/* Ngày */}
                    <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted-foreground)" }}>
                      {new Date(p.updatedAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && !loading && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, paddingTop: 8 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: "7px 16px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--card)", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1, fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>
              <i className="bi bi-chevron-left me-1" />Trước
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
              const n = i + 1;
              return (
                <button key={n} onClick={() => setPage(n)} style={{
                  padding: "7px 13px", borderRadius: 9, fontWeight: 700, fontSize: 13,
                  border: `1.5px solid ${page === n ? "#003087" : "var(--border)"}`,
                  background: page === n ? "#003087" : "var(--card)",
                  color: page === n ? "#fff" : "var(--foreground)", cursor: "pointer",
                }}>{n}</button>
              );
            })}
            {pagination.totalPages > 7 && <span style={{ color: "var(--muted-foreground)" }}>…</span>}
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: "7px 16px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--card)", cursor: page >= pagination.totalPages ? "default" : "pointer", opacity: page >= pagination.totalPages ? 0.4 : 1, fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>
              Sau<i className="bi bi-chevron-right ms-1" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <ProductDrawer p={selected} cats={categories} onClose={() => setSelected(null)} />
      )}

      {/* Sync Modal */}
      {SyncModal}

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
