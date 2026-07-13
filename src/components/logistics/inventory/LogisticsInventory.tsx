"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { sj_generateSKU } from "@/lib/sku-generator";
import { AddLogisticsProductModal } from "./AddLogisticsProductModal";
import { LogisticsItemDetailOffcanvas } from "./LogisticsItemDetailOffcanvas";
import { TreeFilterSelect, TreeOption } from "@/components/ui/TreeFilterSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ProductDrawer } from "@/components/marketing/ProductDrawer";
import { SearchInput } from "@/components/ui/SearchInput";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  code: string | null;
}

interface Warehouse {
  id: string;
  name: string;
  code?: string;
  type?: string;
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
  webVariationId?: number | null;
  imageUrl: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  category: { id: string; name: string } | null;
  source?: string;
}

export function LogisticsInventory({ defaultWarehouseNameMatch, hideAddButton, hideActions, compactMode }: { defaultWarehouseNameMatch?: string, hideAddButton?: boolean, hideActions?: boolean, compactMode?: boolean } = {}) {
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
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [fullWebProduct, setFullWebProduct] = useState<any>(null);
  const [fetchingWebProduct, setFetchingWebProduct] = useState(false);

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/logistics/inventory?id=${deletingItem.id}&source=${deletingItem.source || "material"}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xoá hàng hoá");
      
      toast.success("Thành công", `Đã xoá hàng hoá "${deletingItem.tenHang}"`);
      setDeletingItem(null);
      setSelectedItem(null);
      fetchItems();
    } catch (error: any) {
      toast.error("Lỗi xoá hàng hoá", error.message);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [items]);

  useEffect(() => {
    if (hideActions && selectedItem?.webProductId) {
      setFetchingWebProduct(true);
      fetch(`/api/seajong/products/${selectedItem.webProductId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setFullWebProduct(data);
          else setFullWebProduct(null);
        })
        .catch(() => setFullWebProduct(null))
        .finally(() => setFetchingWebProduct(false));
    } else {
      setFullWebProduct(null);
    }
  }, [selectedItem, hideActions]);

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all(selectedIds.map(async (id) => {
        const item = items.find(it => it.id === id);
        const source = item?.source || "material";
        await fetch(`/api/logistics/inventory?id=${id}&source=${source}`, { method: "DELETE" });
      }));

      toast.success("Thành công", `Đã xoá ${selectedIds.length} hàng hoá`);
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      fetchItems();
    } catch (error: any) {
      toast.error("Lỗi xoá hàng loạt", error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Fetch categories, warehouses and items
  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [filterWarehouse, warehouses]);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterWarehouse]);

  useEffect(() => {
    fetchItems();
  }, [search, filterCategory, filterWarehouse, page]);

  const fetchCategories = async () => {
    try {
      let url = "/api/logistics/categories";
      if (filterWarehouse) {
        url += `?warehouseId=${filterWarehouse}`;
      }
        
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
      const wList = Array.isArray(data) ? data : [];
      setWarehouses(wList);

      if (defaultWarehouseNameMatch && wList.length > 0) {
        const match = wList.find(w => w.name.toLowerCase().includes(defaultWarehouseNameMatch.toLowerCase()));
        if (match) {
          setFilterWarehouse(match.id);
        }
      }
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
      params.append("page", "1");
      params.append("limit", "1000");
      
      const res = await fetch(`/api/logistics/inventory?${params}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
      setTotalPages(1);
      setFilteredCount(data.total || 0);
      // Nếu không có search/filter, cập nhật luôn tổng số hàng hóa
      if (!search && !filterCategory && !filterWarehouse) {
        setTotalItems(data.total || 0);
      } else {
        // Fetch tổng số thực tế nếu đang search hoặc filter
        const totalParams = new URLSearchParams();
        if (filterWarehouse) totalParams.append("warehouseId", filterWarehouse);
        totalParams.append("limit", "1");
        const totalRes = await fetch(`/api/logistics/inventory?${totalParams}`, { cache: "no-store" });
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
    
  // group items before rendering
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    const standalone: InventoryItem[] = [];
    
    items.forEach(item => {
      if (item.webProductId && item.webVariationId) {
        if (!groups[item.webProductId]) groups[item.webProductId] = [];
        groups[item.webProductId].push(item);
      } else {
        standalone.push(item);
      }
    });
    
    const result: { type: 'parent' | 'standalone', data: any, children?: InventoryItem[] }[] = [];
    
    // Add standalone items
    standalone.forEach(item => {
      // If there's a standalone item that happens to be the parent of some variations (maybe because webVariationId is null), we should group it
      if (groups[item.webProductId || ""]) {
        result.push({ type: 'parent', data: item, children: groups[item.webProductId || ""] });
        delete groups[item.webProductId || ""];
      } else {
        result.push({ type: 'standalone', data: item });
      }
    });
    
    // Add remaining grouped items where parent might not be in the current page
    Object.keys(groups).forEach(webProductId => {
      const children = groups[webProductId];
      // Create a fake parent from the first child
      const fakeParent = { ...children[0], tenHang: children[0].tenHang.split(" - ")[0], id: "parent-" + webProductId, soLuong: children.reduce((a,b)=>a+b.soLuong, 0) };
      result.push({ type: 'parent', data: fakeParent, children });
    });
    
    return result;
  }, [items]);

  const [expandedParents, setExpandedParents] = React.useState<Record<string, boolean>>({});
  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };
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

  const selectedWarehouse = warehouses.find(w => w.id === filterWarehouse);
  const isMaterialWarehouse = !!selectedWarehouse && (selectedWarehouse.code === "KVP" || selectedWarehouse.code === "KHO-PHUKIEN" || selectedWarehouse.name.toLowerCase().includes("vật tư"));
  const isDefectWarehouse = !!selectedWarehouse && (selectedWarehouse.code === "KHO-LOI" || selectedWarehouse.type === "DEFECT");

  const categoryOptions: TreeOption[] = categories
    .filter(c => !((c as any).isHeader && (c as any).level === 0))
    .map(c => ({
      label: c.name,
      value: c.id,
      isHeader: (c as any).isHeader,
      level: (c as any).level
    }));

  return (
    <div className="d-flex flex-column gap-3" style={{ height: "100%" }}>
      <div className="d-flex align-items-center justify-content-between mb-0">
        <h6 
          className="mb-0 fw-bold text-uppercase d-flex align-items-center gap-2" 
          style={{ color: "var(--muted-foreground)", fontSize: 11, letterSpacing: "0.05em", lineHeight: 1 }}
        >
          <i className="bi bi-boxes" style={{ fontSize: 13 }} />
          Danh mục hàng hoá
          <span className="badge bg-danger rounded-pill ms-2" style={{ fontSize: "9px", fontWeight: "bold", padding: "3px 7px", textTransform: "none", letterSpacing: "0.1px" }}>
            Tổng số: {items.length} sản phẩm
          </span>
        </h6>
      </div>
      {/* Search and Filter */}

      <div className="d-flex align-items-center gap-3 mb-2">
        <select 
          className="form-select border-0 shadow-sm rounded-pill px-4 text-truncate"
          style={{ width: "160px", fontSize: 13, height: 40, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          value={filterWarehouse}
          onChange={(e) => {
            setFilterWarehouse(e.target.value);
            setFilterCategory("");
          }}
        >
          <option value="">Tất cả kho hàng</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <TreeFilterSelect
          options={categoryOptions}
          value={filterCategory}
          onChange={setFilterCategory}
          placeholder="Tất cả danh mục"
          className="rounded-pill shadow-sm"
          width={160}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo tên, mã SKU hoặc Model..."
          className="flex-grow-1"
          style={{ height: 40 }}
        />
      </div>

      <AddLogisticsProductModal 
        open={isAddModalOpen || !!editingItem} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }} 
        onSaved={fetchItems}
        warehouseId={filterWarehouse}
        isMaterialWarehouse={isMaterialWarehouse}
        editItem={editingItem}
      />

      {hideActions && selectedItem ? (
        fetchingWebProduct ? (
          <div className="offcanvas offcanvas-end show" style={{ width: 600, visibility: "visible" }}>
            <div className="offcanvas-header border-bottom p-3">
              <h5 className="offcanvas-title fw-bold">Thông tin sản phẩm</h5>
              <button type="button" className="btn-close shadow-none" onClick={() => setSelectedItem(null)}></button>
            </div>
            <div className="offcanvas-body d-flex align-items-center justify-content-center">
              <div className="spinner-border text-primary" />
            </div>
          </div>
        ) : (
          <ProductDrawer 
            p={fullWebProduct || {
              id: Number(selectedItem.webProductId) || 0,
              name: selectedItem.tenHang,
              slug: "",
              url: "",
              excerpt: "",
              description: "",
              images: selectedItem.imageUrl ? [selectedItem.imageUrl] : [],
              specs: {
                "Mã sản phẩm": selectedItem.code || "",
                "Kiểu dáng": selectedItem.model || "",
                "Thương hiệu": selectedItem.brand || "",
              },
              price: 0,
              categories: [],
              updatedAt: selectedItem.updatedAt || "",
            }}
            cats={[]}
            isSalesMode={hideActions}
            onClose={() => setSelectedItem(null)}
          />
        )
      ) : (
        <LogisticsItemDetailOffcanvas 
          item={selectedItem as any} 
          open={!!selectedItem && !hideActions} 
          onClose={() => setSelectedItem(null)} 
          onEdit={hideActions ? undefined : (item) => {
            setSelectedItem(null);
            setEditingItem(item as any);
          }}
          onDelete={hideActions ? undefined : (item) => {
            setDeletingItem(item);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deletingItem}
        variant="danger"
        title="Xoá hàng hoá/vật tư?"
        message={`Bạn có chắc chắn muốn xoá "${deletingItem?.tenHang}"? Hành động này sẽ xoá toàn bộ dữ liệu tồn kho liên quan và không thể hoàn tác.`}
        confirmLabel="Xoá"
        loading={deleting}
        onConfirm={handleDeleteItem}
        onCancel={() => setDeletingItem(null)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        variant="danger"
        title="Xoá hàng hoá/vật tư hàng loạt?"
        message={`Bạn có chắc chắn muốn xoá ${selectedIds.length} sản phẩm đã chọn? Hành động này sẽ xoá toàn bộ dữ liệu tồn kho liên quan của chúng và không thể hoàn tác.`}
        confirmLabel="Xoá tất cả"
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />


      {/* Table */}
      <div className="app-card overflow-hidden flex-grow-1 d-flex flex-column" style={{ borderRadius: 16, minHeight: 0 }}>
        <div className="table-responsive flex-grow-1" style={{ overflowY: "auto", maxHeight: "calc(100vh - 290px)", minHeight: "350px" }}>
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="bg-light" style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--card)" }}>
              <tr style={{ height: 36 }}>
                <th className="ps-3 border-0" style={{ width: "1%", whiteSpace: "nowrap" }}>
                  <input 
                    type="checkbox" 
                    className="form-check-input shadow-none"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(items.map(item => item.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: compactMode ? "100%" : "30%", minWidth: "200px" }}>Sản phẩm</th>
                {!compactMode && <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "15%", minWidth: "140px" }}>Danh mục</th>}
                {!compactMode && <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "20%", minWidth: "140px" }}>Model / Màu</th>}
                {!compactMode && <th className="border-0 text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "10%", minWidth: "70px" }}>ĐVT</th>}
                {!compactMode && <th className="border-0 text-uppercase text-end" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "10%", minWidth: "80px" }}>Tồn kho</th>}
                <th className="border-0 text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "10%", minWidth: "80px" }}>Trạng thái</th>
                {hideActions ? null : <th className="pe-4 border-0 text-uppercase text-end" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "110px", minWidth: "110px" }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={hideActions ? 7 : 8} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={hideActions ? 7 : 8} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-2 opacity-25" />
                    Không tìm thấy hàng hóa nào
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr 
                    key={item.id} 
                    style={{ height: 48, cursor: "pointer" }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="ps-3" onClick={(e) => e.stopPropagation()} style={{ width: "1%", whiteSpace: "nowrap" }}>
                      <input 
                        type="checkbox" 
                        className="form-check-input shadow-none"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, item.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
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
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="fw-bold text-foreground text-truncate" 
                              style={{ maxWidth: "340px" }}
                              title={item.tenHang}
                            >
                              {item.tenHang}
                            </div>
                            {item.createdAt && syncLog?.startedAt && (new Date(item.createdAt).getTime() >= new Date(syncLog.startedAt).getTime() - 5000) && (
                              <span 
                                className="badge bg-success" 
                                style={{ 
                                  fontSize: 9, padding: "2px 6px", borderRadius: 4, 
                                  textTransform: "uppercase", letterSpacing: "0.02em",
                                  boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
                                  flexShrink: 0
                                }}
                              >
                                Mới
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {!compactMode && (
                      <td>
                        <span className="badge rounded-pill text-muted bg-light" style={{ fontSize: 11, fontWeight: 500, border: "1px solid var(--border)" }}>
                          {(item as any).categoryName || item.category?.name || "Chưa phân loại"}
                        </span>
                      </td>
                    )}
                    {!compactMode && (
                      <td style={{ color: "var(--foreground)" }}>
                        {item.model ? (
                          <div>
                            <div className="fw-bold">{item.model}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>{item.color} {item.version && `(${item.version})`}</div>
                          </div>
                        ) : "—"}
                      </td>
                    )}
                    {!compactMode && <td className="text-center" style={{ color: "var(--foreground)" }}>{item.donVi || "—"}</td>}
                    {!compactMode && (
                      <td className="text-end fw-bold" style={{ color: "var(--foreground)" }}>
                        {item.soLuong.toLocaleString("vi-VN")}
                      </td>
                    )}
                    <td className="text-center">
                      {item.trangThai === "con-hang" ? (
                        <span className="badge bg-success-subtle text-success border border-success border-opacity-20 rounded-pill">Còn hàng</span>
                      ) : item.trangThai === "sap-het" ? (
                        <span className="badge bg-warning-subtle text-warning border border-warning border-opacity-20 rounded-pill">Sắp hết</span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-20 rounded-pill">Hết hàng</span>
                      )}
                    </td>
                    {!hideActions && (
                      <td className="pe-4">
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          <button className="btn btn-icon btn-sm rounded-circle" title="Chi tiết">
                            <i className="bi bi-eye text-primary" />
                          </button>
                          <button 
                            className="btn btn-icon btn-sm rounded-circle" 
                            title="Sửa"
                            onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                          >
                            <i className="bi bi-pencil text-muted" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer for Actions */}
        {(!hideAddButton || selectedIds.length > 0) && (
          <div className="bg-light border-top p-2 d-flex align-items-center justify-content-end gap-3" style={{ backgroundColor: "var(--card)" }}>
            {selectedIds.length > 0 && (
              <button 
                className="btn btn-sm btn-outline-danger rounded-pill px-4 fw-bold" 
                style={{ fontSize: 13, height: 32 }}
                onClick={() => setConfirmBulkDelete(true)}
              >
                <i className="bi bi-trash me-2" />
                Xoá {selectedIds.length} đã chọn
              </button>
            )}

            {!hideAddButton && (
              <button 
                className="btn btn-sm rounded-pill px-4 fw-bold text-white" 
                style={{ 
                  fontSize: 13, 
                  height: 32, 
                  backgroundColor: isDefectWarehouse ? "#94a3b8" : "#011F58", 
                  borderColor: isDefectWarehouse ? "#94a3b8" : "#011F58",
                  cursor: isDefectWarehouse ? "not-allowed" : "pointer",
                  opacity: isDefectWarehouse ? 0.65 : 1
                }}
                onClick={() => !isDefectWarehouse && setIsAddModalOpen(true)}
                disabled={isDefectWarehouse}
              >
                <i className="bi bi-plus-lg me-2" />
                Thêm hàng hóa
              </button>
            )}
          </div>
        )}
      </div>


    </div>
  );
}
