"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { SyncReviewModal } from "./SyncReviewModal";
import { sj_generateSKU } from "@/lib/sku-generator";
import { AddLogisticsProductModal } from "./AddLogisticsProductModal";
import { LogisticsItemDetailOffcanvas } from "./LogisticsItemDetailOffcanvas";
import { TreeFilterSelect, TreeOption } from "@/components/ui/TreeFilterSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ProductDrawer } from "@/components/marketing/ProductDrawer";
import { SearchInput } from "@/components/ui/SearchInput";
import { useSearchParams } from "next/navigation";
import { HoverImage } from "@/components/ui/HoverImage";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { Pagination } from "@/components/ui/Pagination";
import { KVPItemTable } from "./KVPItemTable";

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
  images?: string[];
}

export function LogisticsInventory({ defaultWarehouseNameMatch, hideAddButton, hideActions, compactMode }: { defaultWarehouseNameMatch?: string, hideAddButton?: boolean, hideActions?: boolean, compactMode?: boolean } = {}) {
  const searchParams = useSearchParams();
  const fromAdmin = searchParams.get("fromAdmin") === "true";
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
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceRatio, setPriceRatio] = useState("15");
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<any>(null);
  const [showSyncReview, setShowSyncReview] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmClearWarehouse, setConfirmClearWarehouse] = useState(false);
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
      for (const id of selectedIds) {
        const item = items.find(it => it.id === id);
        const source = item?.source || "material";
        const res = await fetch(`/api/logistics/inventory?id=${id}&source=${source}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Xoá thất bại ID ${id}`);
        }
      }

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

  const handleClearWarehouse = async () => {
    if (!filterWarehouse) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/logistics/inventory/clear-warehouse?warehouseId=${filterWarehouse}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Xoá cả kho thất bại");
      }
      toast.success("Thành công", "Đã xoá toàn bộ hàng hoá trong kho");
      setSelectedIds([]);
      setConfirmClearWarehouse(false);
      fetchItems();
    } catch (error: any) {
      toast.error("Lỗi xoá kho", error.message);
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
      const wList = Array.isArray(data) ? data.filter((w: any) => w.isActive !== false) : [];
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
      params.append("page", page.toString());
      params.append("limit", "50");

      const res = await fetch(`/api/logistics/inventory?${params}`, { cache: "no-store" });
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
    setShowSyncReview(true);
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
        const fakeParent = { ...children[0], tenHang: children[0].tenHang.split(" - ")[0], id: "parent-" + webProductId, soLuong: children.reduce((a, b) => a + b.soLuong, 0) };
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
    .map(c => ({
      label: c.name,
      value: c.id,
      isHeader: (c as any).isHeader,
      level: (c as any).level
    }));



  return (
    <>
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

      {hideActions && selectedItem && selectedItem.source !== "material" ? (
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
          open={!!selectedItem && (!hideActions || selectedItem?.source === "material")}
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

      <ConfirmDialog
        open={confirmClearWarehouse}
        variant="danger"
        title="Xoá toàn bộ hàng hoá trong kho?"
        message="Bạn có chắc chắn muốn xoá toàn bộ hàng hoá trong kho này? Thao tác này sẽ xoá lịch sử nhập xuất, số lượng tồn kho và các hàng hoá không còn trong kho nào khác. Hành động này không thể hoàn tác!"
        confirmLabel="Xoá cả kho"
        loading={deleting}
        onConfirm={handleClearWarehouse}
        onCancel={() => setConfirmClearWarehouse(false)}
      />


      {/* Table */}
      <FullWidthTableLayout 
        header={null}
        tableWrapperClassName="border-top-0"
        footerStyle={{ padding: "8px 16px", backgroundColor: "#f8f9fa" }}
        table={
          isMaterialWarehouse ? (
            <KVPItemTable
              items={items}
              loading={loading}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              compactMode={compactMode}
              hideActions={hideActions}
              syncLog={syncLog}
              setSelectedItem={setSelectedItem}
            />
          ) : (
          <div className="h-100 overflow-auto custom-scrollbar">
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
                <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: compactMode ? "100%" : "30%", minWidth: "200px", whiteSpace: "nowrap" }}>Sản phẩm</th>
                {!compactMode && <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "15%", minWidth: "140px", whiteSpace: "nowrap" }}>Danh mục</th>}
                {!compactMode && <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "20%", minWidth: "140px", whiteSpace: "nowrap" }}>Model / Màu</th>}
                {!compactMode && <th className="border-0 text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "10%", minWidth: "70px", whiteSpace: "nowrap" }}>ĐVT</th>}
                {!compactMode && <th className="border-0 text-uppercase text-end" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "10%", minWidth: "80px", whiteSpace: "nowrap" }}>Tồn kho</th>}
                <th className="border-0 text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "10%", minWidth: "80px", whiteSpace: "nowrap" }}>Trạng thái</th>
                {hideActions ? null : <th className="pe-4 border-0 text-uppercase text-end" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", width: "110px", minWidth: "110px", whiteSpace: "nowrap" }}>Thao tác</th>}
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
                          {(item.imageUrl || (item.images && item.images.length > 0)) ? (
                            <HoverImage
                              src={item.imageUrl || (item.images && item.images[0])}
                              images={item.images}
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
        )
        }
        footer={(
          <div className="d-flex align-items-center justify-content-between w-100 gap-3 flex-wrap">
            <div className="d-flex align-items-center">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>

            <div className="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
              <TreeFilterSelect
                options={warehouses.map(w => ({ label: w.name, value: w.id }))}
                value={filterWarehouse}
                onChange={(v) => {
                  setFilterWarehouse(v);
                  setFilterCategory("");
                }}
                placeholder="Tất cả kho hàng"
                className="rounded-pill shadow-sm"
                width={160}
                dropdownPosition="top"
              />

              <TreeFilterSelect
                options={categoryOptions}
                value={filterCategory}
                onChange={setFilterCategory}
                placeholder="Tất cả danh mục"
                className="rounded-pill shadow-sm"
                width={160}
                disabled={!filterWarehouse}
                dropdownPosition="top"
              />

              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Tìm theo tên, mã SKU hoặc Model..."
                className="flex-grow-1"
                style={{ height: 38, maxWidth: 300 }}
              />

              {!hideAddButton && (
                <button
                  id="logistics-add-item-btn"
                  className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
                  title="Thêm hàng hoá"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: isDefectWarehouse ? "#94a3b8" : "#011F58",
                    borderColor: isDefectWarehouse ? "#94a3b8" : "#011F58",
                    cursor: isDefectWarehouse ? "not-allowed" : "pointer",
                    opacity: isDefectWarehouse ? 0.65 : 1
                  }}
                  onClick={() => !isDefectWarehouse && setIsAddModalOpen(true)}
                  disabled={isDefectWarehouse}
                >
                  <i className="bi bi-plus-lg" />
                </button>
              )}
            </div>

            <div className="d-flex align-items-center justify-content-end gap-3">
            {fromAdmin && isMaterialWarehouse && filterWarehouse && (
              <button
                className="btn btn-sm btn-danger text-white rounded-pill px-4 fw-bold me-auto"
                style={{ fontSize: 13, height: 32, border: 'none' }}
                onClick={() => setConfirmClearWarehouse(true)}
                disabled={deleting}
              >
                <i className="bi bi-trash me-2" />
                Xoá cả kho
              </button>
            )}

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


            </div>
          </div>
        )}
      />

      {/* Price Ratio Modal */}
      {showPriceModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Cập nhật giá bán hàng loạt</h5>
                <button type="button" className="btn-close" onClick={() => setShowPriceModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">Giá bán sẽ được tính bằng: <strong>Giá nhập + (Giá nhập x Lợi nhuận %)</strong> cho toàn bộ hàng hoá trong kho vật tư và phụ kiện.</p>
                <div className="mb-3">
                  <label className="form-label fw-medium text-dark">Lợi nhuận (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={priceRatio}
                    onChange={(e) => setPriceRatio(e.target.value)}
                    placeholder="15"
                    step="1"
                    min="0"
                  />
                  <div className="form-text text-primary">Ví dụ: Lợi nhuận 15%, Giá bán = Giá nhập + (Giá nhập x 15%)</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowPriceModal(false)} disabled={isUpdatingPrice}>Hủy</button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isUpdatingPrice}
                  onClick={async () => {
                    const ratio = parseFloat(priceRatio);
                    if (isNaN(ratio) || ratio <= 0) {
                      return toast.error("Tỷ lệ không hợp lệ");
                    }
                    setIsUpdatingPrice(true);
                    try {
                      const res = await fetch("/api/logistics/inventory/update-price-ratio", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ratio })
                      });
                      if (res.ok) {
                        toast.success("Cập nhật giá bán thành công");
                        setShowPriceModal(false);
                        fetchItems();
                      } else {
                        const data = await res.json();
                        toast.error(data.error || "Lỗi cập nhật");
                      }
                    } catch (e) {
                      toast.error("Lỗi kết nối");
                    } finally {
                      setIsUpdatingPrice(false);
                    }
                  }}
                >
                  {isUpdatingPrice ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                  Xác nhận cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSyncReview && <SyncReviewModal onClose={() => setShowSyncReview(false)} />}
    </>
  );
}
