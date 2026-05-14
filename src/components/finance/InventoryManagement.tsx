"use client";

import React, { useState, useEffect, useRef } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { TreeFilterSelect } from "@/components/ui/TreeFilterSelect";
import { Pagination } from "@/components/ui/Pagination";
import { InventoryDetailOffcanvas } from "@/app/(dashboard)/finance/inventory/InventoryDetailOffcanvas";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { SectionTitle } from "@/components/ui/SectionTitle";

// Types
export interface InventoryItem {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  soLuong: number;
  giaNhap: number;
  giaBan: number;
  trangThai: string;
  category?: { name: string };
  brand?: string;
  imageUrl?: string | null;
}

interface Stats {
  tongMatHang: number;
  tongGiaTri: number;
  hetHang: number;
  sapHet: number;
  categoryStats: { label: string; value: number }[];
}

interface InventoryManagementProps {
  allowAdd?: boolean;
  mode?: "finance" | "production";
}

export function InventoryManagement({ allowAdd = true, mode = "finance" }: InventoryManagementProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    tongMatHang: 0,
    tongGiaTri: 0,
    hetHang: 0,
    sapHet: 0,
    categoryStats: []
  });
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ label: string; value: string; type: string }[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [warehouseCount, setWarehouseCount] = useState(0);
  
  const [pageSize] = useState(100);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const { error } = useToast();

  const fetchStats = async () => {
    try {
      const selectedWH = warehouses.find(w => w.value === warehouseId);
      const isMaterial = selectedWH?.type === "MATERIAL";
      const apiPath = isMaterial ? "/api/production/materials/stats" : "/api/finance/inventory/stats";

      const params = new URLSearchParams({
        mode,
        warehouseId,
        categoryId,
        search: searchTerm
      });
      const res = await fetch(`${apiPath}?${params.toString()}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Fetch stats error:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const selectedWH = warehouses.find(w => w.value === warehouseId);
      const isMaterial = selectedWH?.type === "MATERIAL";
      const apiPath = isMaterial ? "/api/production/materials/categories" : "/api/finance/inventory/categories";

      const res = await fetch(apiPath);
      const data = await res.json();
      setCategories(data.map((c: any) => ({ 
        label: c.name, 
        value: c.id, 
        isHeader: c.isHeader,
        level: c.level
      })));
    } catch (err) {
      console.error("Fetch items error:", err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/finance/warehouses");
      const data = await res.json();
      setWarehouses(data.map((w: any) => ({ label: w.name, value: w.id, type: w.type })));
      setWarehouseCount(data.length);
    } catch (err) {
      console.error("Fetch warehouses error:", err);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const selectedWH = warehouses.find(w => w.value === warehouseId);
      const isMaterial = selectedWH?.type === "MATERIAL";
      const apiPath = isMaterial ? "/api/production/materials" : "/api/finance/inventory";

      const params = new URLSearchParams({
        page: page.toString(),
        search: searchTerm,
        categoryId,
        trangThai,
        warehouseId,
        mode
      });
      const res = await fetch(`${apiPath}?${params.toString()}`);
      const data = await res.json();
      setItems(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      error("Lỗi", "Không thể tải danh sách hàng hoá");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchItems();
    await fetchStats();
    // Update selectedItem if it exists
    if (selectedItem) {
      // Find the updated item in the newly fetched items
      // Note: items state might not be updated yet due to async nature, so we use the fetched data if possible
      // or just trust that fetchItems will trigger a re-render and we can update selectedItem manually
    }
  };

  useEffect(() => {
    // When items change, if there's a selectedItem, update it to get latest data (like dinhMuc)
    if (selectedItem) {
      const updated = items.find(it => it.id === selectedItem.id);
      if (updated) {
        // Only update if it's actually different to avoid infinite loops
        if (JSON.stringify(updated.category) !== JSON.stringify(selectedItem.category) || 
            (updated as any).dinhMucId !== (selectedItem as any).dinhMucId ||
            (updated as any).dinhMuc?.id !== (selectedItem as any).dinhMuc?.id) {
          setSelectedItem(updated);
        }
      }
    }
  }, [items]);

  const handleRowClick = (item: any) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  useEffect(() => {
    fetchStats();
    fetchCategories();
  }, [mode, warehouseId, categoryId, searchTerm]);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [page, searchTerm, categoryId, trangThai, warehouseId]);

  const tableRef = useRef<HTMLDivElement>(null);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const firstCheck = tableRef.current?.querySelector("tbody input[type='checkbox']") as HTMLElement;
      if (firstCheck) firstCheck.focus();
    }
  };

  const handleTableKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const checks = tableRef.current?.querySelectorAll("tbody input[type='checkbox']");
      const nextCheck = checks?.[index + 1] as HTMLElement;
      if (nextCheck) nextCheck.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const checks = tableRef.current?.querySelectorAll("tbody input[type='checkbox']");
      const prevCheck = checks?.[index - 1] as HTMLElement;
      if (prevCheck) {
        prevCheck.focus();
      } else {
        const searchInput = document.querySelector("input[placeholder*='Tìm theo tên']") as HTMLElement;
        if (searchInput) searchInput.focus();
      }
    }
  };

  const selectedWH = warehouses.find(w => w.value === warehouseId);
  const isMaterial = selectedWH?.type === "MATERIAL";

  const columns: TableColumn<InventoryItem | any>[] = [
    {
      header: <input type="checkbox" className="form-check-input" />,
      width: 40,
      align: "center",
      render: (_, index) => (
        <input 
          type="checkbox" 
          className="form-check-input" 
          onKeyDown={(e) => handleTableKeyDown(e, index)}
        />
      )
    },
    {
      header: isMaterial ? "Vật tư / Nhóm" : "Hàng hoá / Loại",
      render: (row) => (
        <div className="d-flex align-items-center gap-3">
          <div 
            className="flex-shrink-0 rounded-3 border bg-light d-flex align-items-center justify-content-center overflow-hidden" 
            style={{ width: 36, height: 36 }}
          >
            {row.imageUrl ? (
              <img src={row.imageUrl} alt={row.tenHang} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <i className="bi bi-box-seam text-muted opacity-50" style={{ fontSize: 16 }} />
            )}
          </div>
          <div className="d-flex flex-column">
            <span className="fw-semibold text-dark lh-1 mb-1" style={{ fontSize: 12.5 }}>{row.tenHang}</span>
            <div className="d-flex align-items-center gap-2">
              <small className="text-primary fw-medium" style={{ fontSize: 10, letterSpacing: 0.5 }}>{row.code || "SKU-AUTO"}</small>
              <span className="text-muted" style={{ fontSize: 10 }}>•</span>
              <small className="text-muted" style={{ fontSize: 10.5 }}>{row.category?.name || "Chưa phân loại"}</small>
            </div>
          </div>
        </div>
      )
    },
    {
      header: isMaterial ? "Chất liệu" : "Thương hiệu",
      width: 120,
      render: (row) => <span className="text-muted small fw-medium">{isMaterial ? row.material : (row.brand || "Seajong")}</span>
    },
    {
      header: isMaterial ? "Thông số" : "ĐVT",
      width: isMaterial ? 150 : 80,
      align: isMaterial ? "left" : "center",
      render: (row) => <span className="text-muted small">{isMaterial ? row.spec : (row.donVi || "cái")}</span>
    },
    {
      header: "Tồn kho",
      width: 100,
      align: "right",
      render: (row) => (
        <span className={cn(
          "fw-bold",
          row.soLuong <= 0 ? "text-danger" : "text-dark"
        )}>
          {row.soLuong.toLocaleString("vi-VN")}
        </span>
      )
    },
    {
        header: isMaterial ? "Đơn giá nhập" : (mode === "production" ? "Giá bán (đồng)" : "Đơn giá nhập"),
        width: 140,
        align: "right",
        render: (row) => (
          <span className="fw-medium text-dark">
            {(isMaterial ? row.giaNhap : (mode === "production" ? row.giaBan : row.giaNhap)).toLocaleString("vi-VN")}
          </span>
        )
    },
    {
      header: "Trạng thái",
      width: 130,
      align: "center",
      render: (row) => {
        const isOut = row.soLuong <= 0;
        const isLow = row.trangThai === "sap-het";
        return (
          <span className={cn(
            "badge rounded-pill px-2.5 py-1.5 fw-medium border",
            isOut ? "bg-danger-soft text-danger" : 
            isLow ? "bg-warning-soft text-warning" : "bg-success-soft text-success"
          )} style={{ fontSize: 10 }}>
            {isOut ? "Hết hàng" : isLow ? "Sắp hết hàng" : "Còn hàng"}
          </span>
        );
      }
    }
  ];

  return (
    <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0, gap: "1rem" }}>
      {/* KPI Cards */}
      <div className="row g-3">
        <KPICard 
          label="Tổng số mặt hàng" 
          value={stats.tongMatHang} 
          icon="bi-boxes" 
          accent="#6366f1" 
          subtitle="mã hàng"
        />
        <KPICard 
          label={mode === "production" ? "Tổng giá trị (giá bán)" : "Tổng giá trị kho"} 
          value={stats.tongGiaTri.toLocaleString("vi-VN")} 
          icon="bi-cash-stack" 
          accent="#10b981" 
          subtitle="đồng"
        />
        <KPICard 
          label="Sắp hết hàng" 
          value={stats.sapHet} 
          icon="bi-exclamation-triangle" 
          accent="#f59e0b" 
          subtitle="mã hàng"
        />
        <KPICard 
          label="Đã hết hàng" 
          value={stats.hetHang} 
          icon="bi-x-circle" 
          accent="#f43f5e" 
          subtitle="mã hàng"
        />
      </div>

      <div className="row g-3 flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="col-12 d-flex flex-column h-100" style={{ minHeight: 0 }}>
          <div className="bg-white rounded-4 shadow-sm border p-3 h-100 d-flex flex-column overflow-hidden">
            <SectionTitle 
              title="Danh sách hàng hoá" 
              action={
                <div className="d-flex gap-2">
                  <button className="btn btn-light btn-sm border shadow-sm px-2 py-1"><i className="bi bi-file-earmark-arrow-down" /></button>
                  <button className="btn btn-light btn-sm border shadow-sm px-2 py-1"><i className="bi bi-file-earmark-arrow-up" /></button>
                  <button className="btn btn-light btn-sm border shadow-sm px-2 py-1"><i className="bi bi-printer" /></button>
                </div>
              }
            />

            {/* Filters */}
            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <TreeFilterSelect 
                  options={categories}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Tất cả các loại hàng hoá"
                  width={240}
              />
              <FilterSelect 
                  options={[
                      { label: "Còn hàng", value: "con-hang" },
                      { label: "Sắp hết", value: "sap-het" },
                      { label: "Hết hàng", value: "het-hang" },
                  ]}
                  value={trangThai}
                  onChange={setTrangThai}
                  placeholder="Trạng thái"
                  width={150}
              />
              <div className="flex-grow-1">
                <SearchInput 
                    value={searchTerm}
                    onChange={setSearchTerm}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Tìm theo tên, SKU..."
                />
              </div>
              <FilterSelect 
                  options={warehouses}
                  value={warehouseId}
                  onChange={setWarehouseId}
                  placeholder="Tất cả kho"
                  width={200}
              />
              {allowAdd && <BrandButton icon="bi-plus-lg" className="flex-shrink-0">Thêm hàng hoá</BrandButton>}
            </div>

            {/* Table */}
            <div ref={tableRef} className="flex-grow-1 overflow-auto border rounded-3 bg-light/30 shadow-inner">
              <Table 
                  rows={items}
                  columns={columns}
                  loading={loading}
                  onRowClick={handleRowClick}
                  minWidth={1000}
                  compact={true}
                  stickyHeader={true}
                  emptyText="Không có hàng hoá nào trong kho"
              />
            </div>
            
            <InventoryDetailOffcanvas 
              show={showDetail}
              onClose={() => setShowDetail(false)}
              item={selectedItem}
              isMaterial={isMaterial}
              onRefresh={handleRefresh}
            />

            {/* Footer Actions */}
            <div className="pt-3 mt-auto">
               <div className="d-flex align-items-center justify-content-between mb-3">
                  <small className="text-muted">Hiển thị <b>{items.length}</b> mặt hàng</small>
                  <Pagination 
                      page={page}
                      totalPages={totalPages}
                      onChange={setPage}
                  />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
