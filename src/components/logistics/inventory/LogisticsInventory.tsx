"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { sj_generateSKU } from "@/lib/sku-generator";
import { AddLogisticsProductModal } from "./AddLogisticsProductModal";
import { LogisticsItemDetailOffcanvas } from "./LogisticsItemDetailOffcanvas";
import { TreeFilterSelect, TreeOption } from "@/components/ui/TreeFilterSelect";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  code: string | null;
}

interface Warehouse {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  tenHang: string;
  code: string | null;
  brand: string | null;
  model: string | null;
  version: string | null;
  color: string | null;
  donVi: string | null;
  soLuong: number;
  soLuongMin: number;
  trangThai: string;
  webProductId: number | null;
  imageUrl: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  category: { id: string; name: string } | null;
}

export function LogisticsInventory() {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0); // Tổng số hàng hóa thực tế
  const [filteredCount, setFilteredCount] = useState(0); // Số lượng theo search/filter
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<any>(null);

  // Fetch categories, warehouses and items
  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [filterWarehouse]);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterWarehouse]);

  useEffect(() => {
    fetchItems();
  }, [search, filterCategory, filterWarehouse, page]);

  const fetchCategories = async () => {
    try {
      const url = filterWarehouse 
        ? `/api/production/materials/categories?warehouseId=${filterWarehouse}`
        : "/api/production/materials/categories";
      const res = await fetch(url);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch categories error:", error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/logistics/warehouses");
      const data = await res.json();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch warehouses error:", error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterCategory) params.append("categoryId", filterCategory);
      if (filterWarehouse) params.append("warehouseId", filterWarehouse);
      params.append("page", page.toString());
      
      const res = await fetch(`/api/logistics/inventory?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setFilteredCount(data.total || 0);
      // Nếu không có search/filter, cập nhật luôn tổng số hàng hóa
      if (!search && !filterCategory && !filterWarehouse) {
        setTotalItems(data.total || 0);
      } else {
        // Fetch tổng số thực tế nếu đang search hoặc filter
        const totalParams = new URLSearchParams();
        if (filterWarehouse) totalParams.append("warehouseId", filterWarehouse);
        totalParams.append("limit", "1");
        const totalRes = await fetch(`/api/logistics/inventory?${totalParams}`);
        const totalData = await totalRes.json();
        setTotalItems(totalData.total || 0);
      }
    } catch (error) {
      toast.error("Lỗi", "Không thể tải danh sách hàng hóa");
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/logistics/sync-web");
      const log = await res.json();
      if (log) {
        setSyncLog(log);
        setSyncing(log.status === "running");
        return log;
      }
    } catch (e) {
      console.error("Fetch sync status error:", e);
    }
    return null;
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const handleBulkSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/logistics/sync-web", { method: "POST", body: JSON.stringify({}) });
      if (!res.ok) throw new Error("Lỗi khởi tạo đồng bộ");
      fetchSyncStatus();
    } catch (error: any) {
      toast.error("Lỗi đồng bộ", error.message);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!syncing) return;
    const interval = setInterval(async () => {
      const log = await fetchSyncStatus();
      if (log && (log.status === "success" || log.status === "error")) {
        setSyncing(false);
        if (log.status === "success") {
          toast.success("Hoàn tất", "Đã đồng bộ xong dữ liệu kho hàng");
          fetchItems();
          fetchSyncStatus();
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [syncing]);

  const handleSingleSync = async (itemId: string) => {
    try {
      const res = await fetch("/api/logistics/sync-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi đồng bộ");
      toast.success("Thành công", "Đã cập nhật thông tin từ Website");
      fetchItems();
    } catch (error: any) {
      toast.error("Lỗi", error.message);
    }
  };

  const categoryOptions: TreeOption[] = categories.map(c => ({
    label: c.name,
    value: c.id,
    isHeader: (c as any).isHeader,
    level: (c as any).level
  }));

  return (
    <div className="d-flex flex-column gap-3">
      {/* Search and Filter */}
      {/* ── SyncPanel ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderRadius: 12, marginBottom: 16,
        background: "var(--accent-background, rgba(0,48,135,0.08))",
        border: "1px solid var(--border)",
        backdropFilter: "blur(8px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,48,135,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-database-check" style={{ fontSize: 16, color: "var(--primary)" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>
              {totalItems} hàng hóa trong kho
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
              Dữ liệu được cập nhật dựa trên nhập xuất thực tế
            </p>
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="position-relative flex-grow-1">
          <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          <input 
            type="text" 
            className="form-control border-0 shadow-sm rounded-pill ps-5 pe-4"
            style={{ height: 40, background: "var(--card)", color: "var(--foreground)", fontSize: 13, border: "1px solid var(--border)" }}
            placeholder="Tìm theo tên, mã SKU hoặc Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <TreeFilterSelect
          options={categoryOptions}
          value={filterCategory}
          onChange={setFilterCategory}
          placeholder="Tất cả danh mục"
          className="rounded-pill shadow-sm"
          width={220}
        />

        <select 
          className="form-select border-0 shadow-sm rounded-pill px-4"
          style={{ width: "auto", fontSize: 13, height: 40, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
        >
          <option value="">Tất cả kho hàng</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <button 
          className="btn btn-primary rounded-pill px-4 fw-bold" 
          style={{ fontSize: 13, height: 40 }}
          onClick={() => setIsAddModalOpen(true)}
        >
          <i className="bi bi-plus-lg me-2" />
          Thêm hàng hóa
        </button>
      </div>

      <AddLogisticsProductModal 
        open={isAddModalOpen || !!editingItem} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }} 
        onSaved={fetchItems}
        warehouseId={filterWarehouse}
        editItem={editingItem}
      />

      <LogisticsItemDetailOffcanvas 
        item={selectedItem as any} 
        open={!!selectedItem} 
        onClose={() => setSelectedItem(null)} 
      />


      {/* Table */}
      <div className="app-card overflow-hidden" style={{ borderRadius: 16 }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="bg-light">
              <tr style={{ height: 40 }}>
                <th className="ps-4 border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Sản phẩm</th>
                <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Model / Màu</th>
                <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Danh mục</th>
                <th className="border-0 text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>ĐVT</th>
                <th className="border-0 text-uppercase text-end" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Tồn kho</th>
                <th className="border-0 text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Trạng thái</th>
                <th className="pe-4 border-0 text-uppercase text-end" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-2 opacity-25" />
                    Không tìm thấy hàng hóa nào
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr 
                    key={item.id} 
                    style={{ height: 58, cursor: "pointer" }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-3">
                        <div 
                          style={{ 
                            width: 38, height: 38, borderRadius: 8, 
                            background: "var(--border)", overflow: "hidden",
                            flexShrink: 0, border: "1.5px solid rgba(0,0,0,0.05)",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                          }}
                        >
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.tenHang} 
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light">
                              <i className="bi bi-image text-muted opacity-50" style={{ fontSize: 18 }} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <div className="fw-bold text-foreground">{item.tenHang}</div>
                            {item.createdAt && syncLog?.startedAt && (new Date(item.createdAt).getTime() >= new Date(syncLog.startedAt).getTime() - 5000) && (
                              <span 
                                className="badge bg-success" 
                                style={{ 
                                  fontSize: 9, padding: "2px 6px", borderRadius: 4, 
                                  textTransform: "uppercase", letterSpacing: "0.02em",
                                  boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
                                }}
                              >
                                Mới
                              </span>
                            )}
                          </div>
                          <div className="text-muted" style={{ fontSize: 11, fontFamily: "monospace" }}>{item.code || "N/A"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--foreground)" }}>
                      {item.model ? (
                        <div>
                          <div className="fw-bold">{item.model}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{item.color} {item.version && `(${item.version})`}</div>
                        </div>
                      ) : "—"}
                    </td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary rounded-pill border border-secondary border-opacity-10">
                        {(item as any).categoryName || item.category?.name || "Chưa phân loại"}
                      </span>
                    </td>
                    <td className="text-center" style={{ color: "var(--foreground)" }}>{item.donVi || "—"}</td>
                    <td className="text-end fw-bold" style={{ color: "var(--foreground)" }}>
                      {item.soLuong.toLocaleString("vi-VN")}
                    </td>
                    <td className="text-center">
                      {item.trangThai === "con-hang" ? (
                        <span className="badge bg-success-subtle text-success border border-success border-opacity-20 rounded-pill">Còn hàng</span>
                      ) : item.trangThai === "sap-het" ? (
                        <span className="badge bg-warning-subtle text-warning border border-warning border-opacity-20 rounded-pill">Sắp hết</span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-20 rounded-pill">Hết hàng</span>
                      )}
                    </td>
                    <td className="pe-4 text-end">
                      <button className="btn btn-icon btn-sm rounded-circle me-1" title="Chi tiết">
                        <i className="bi bi-eye text-primary" />
                      </button>
                      <button 
                        className="btn btn-icon btn-sm rounded-circle" 
                        title="Sửa"
                        onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                      >
                        <i className="bi bi-pencil text-muted" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-2 px-2">
        <div className="text-muted" style={{ fontSize: 12 }}>
          Hiển thị <b>{items.length}</b> sản phẩm
        </div>
        <div className="d-flex gap-1">
          <button 
            className="btn btn-sm btn-light border-0 px-3 rounded-pill fw-bold" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Trước
          </button>
          <div className="d-flex align-items-center px-3 fw-bold" style={{ fontSize: 12 }}>
            Trang {page} / {totalPages}
          </div>
          <button 
            className="btn btn-sm btn-light border-0 px-3 rounded-pill fw-bold"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
