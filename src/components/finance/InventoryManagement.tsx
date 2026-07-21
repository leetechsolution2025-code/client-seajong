"use client";

import * as XLSX from "xlsx";
import React, { useState, useEffect, useRef } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { TreeFilterSelect } from "@/components/ui/TreeFilterSelect";
import { Pagination } from "@/components/ui/Pagination";
import { InventoryDetailOffcanvas } from "@/app/(dashboard)/finance/inventory/InventoryDetailOffcanvas";
import { AddLogisticsProductModal } from "@/components/logistics/inventory/AddLogisticsProductModal";
import { ProductDrawer } from "@/components/marketing/ProductDrawer";
import { MissingMaterialsOffcanvas } from "@/components/finance/MissingMaterialsOffcanvas";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  mode?: "finance" | "production" | "sales" | "cs" | "board";
  onTickerUpdate?: (news: any[]) => void;
}

export function InventoryManagement({ allowAdd = true, mode = "finance", onTickerUpdate }: InventoryManagementProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    tongMatHang: 0,
    tongGiaTri: 0,
    hetHang: 0,
    sapHet: 0,
    categoryStats: []
  });
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ label: string; value: string; type: string; code?: string | null }[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [trangThai, setTrangThai] = useState("");

  const isCS = mode === "cs";
  const isSales = mode === "sales";
  const [warehouseId, setWarehouseId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [warehouseCount, setWarehouseCount] = useState(0);
  
  const [pageSize] = useState(100);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMissingMaterials, setShowMissingMaterials] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { error, success } = useToast();

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Mã hàng hoá (SKU)", "Tên hàng hoá", "Mã nhóm cha", "Tên phân loại", "Đơn vị tính", "Số lượng", "Giá nhập", "Giá bán", "Thương hiệu", "Ghi chú"],
      ["", "Ví dụ: Vòi chậu rửa mặt", "VTSX_VESINH", "Nhóm vật tư", "Cái", "10", "150000", "200000", "Seajong", "Hàng mới"]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Mau_Nhap_Kho.xlsx");
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!warehouseId) {
      error("Vui lòng chọn Kho hàng cụ thể trước khi Import.");
      return;
    }

    setIsProcessingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const itemsToImport = [];
      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.length === 0 || !row[1]) continue; // Skip empty rows or rows without name

        itemsToImport.push({
          sku: row[0]?.toString() || "",
          name: row[1]?.toString() || "",
          categoryCode: row[2]?.toString() || "",
          unit: row[4]?.toString() || "Cái",
          quantity: parseFloat(row[5]) || 0,
          importPrice: parseFloat(row[6]) || 0,
          sellPrice: parseFloat(row[7]) || 0,
          brand: row[8]?.toString() || "Seajong",
          note: row[9]?.toString() || ""
        });
      }

      if (itemsToImport.length === 0) {
        error("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
        return;
      }

      const res = await fetch("/api/logistics/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToImport, warehouseId })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Import failed");

      if (resData.skipped && resData.skipped.length > 0) {
        console.warn("Skipped items (duplicate SKU):", resData.skipped);
        success(`Import thành công ${resData.imported} mặt hàng. Bỏ qua ${resData.skipped.length} mặt hàng do trùng mã SKU (Xem Console log).`);
      } else {
        success(`Import thành công toàn bộ ${resData.imported} mặt hàng!`);
      }
      
      fetchItems();
      fetchStats();
    } catch (err: any) {
      console.error(err);
      error("Lỗi khi import Excel: " + err.message);
    } finally {
      setIsProcessingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchStats = async () => {
    try {
      const selectedWH = warehouses.find(w => w.value === warehouseId);
      const whType = selectedWH?.type || "SEAJONG";
      let apiPath = "/api/logistics/seajong-inventory/stats";
      if (whType === "MATERIAL") apiPath = "/api/production/materials/stats";
      else if (whType === "PRODUCT") apiPath = "/api/production/manufactured-products/stats";
      else if (whType === "DEFECT") apiPath = "/api/logistics/defects/stats";
      else if (whType === "PRODUCT_SYNC") apiPath = "/api/finance/inventory/stats";

      const params = new URLSearchParams({
        mode,
        warehouseId,
        categoryId,
        search: searchTerm
      });
      const res = await fetch(`${apiPath}?${params.toString()}`);
      const data = await res.json();
      setStats(data);

      if (onTickerUpdate) {
        const whName = selectedWH ? selectedWH.label : "Tất cả kho";
        const formatMoney = (val: number) => new Intl.NumberFormat("vi-VN").format(Math.round(val || 0)) + " đ";
        
        let assessment = "";
        if (data.hetHang > 0) {
          assessment = `Báo động đỏ (${whName}): Có ${data.hetHang} mặt hàng đã cạn kiệt, cần lên phương án nhập gấp!`;
        } else if (data.sapHet > 0) {
          assessment = `Lưu ý (${whName}): Có ${data.sapHet} mặt hàng sắp chạm ngưỡng tồn kho tối thiểu, cần theo dõi sát sao.`;
        } else if (data.tongMatHang > 0) {
          assessment = `Tình trạng tồn kho tại ${whName} an toàn, sẵn sàng đáp ứng yêu cầu kinh doanh.`;
        } else {
          assessment = `Kho ${whName} hiện chưa có dữ liệu.`;
        }

        const news = [
          { text: `• ${assessment}`, type: 'text' },
          { text: `• ${whName} - Tổng số mặt hàng: ${data.tongMatHang}`, type: 'text' },
          { text: `• ${whName} - Tổng giá trị: ${formatMoney(data.tongGiaTri)}`, type: 'text' },
          { text: `• Sắp hết: ${data.sapHet} mặt hàng`, type: 'text' },
          { text: `• Đã hết: ${data.hetHang} mặt hàng`, type: 'text' },
        ];
        onTickerUpdate(news);
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const selectedWH = warehouses.find(w => w.value === warehouseId);
      const whType = selectedWH?.type || "SEAJONG";
      let apiPath = "/api/logistics/categories";
      if (warehouseId) {
        apiPath += `?warehouseId=${warehouseId}`;
      }

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
      const mapped = data.map((w: any) => ({ label: w.name, value: w.id, type: w.type, code: w.code }));
      setWarehouses(mapped);
      setWarehouseCount(data.length);
      
      if (!warehouseId) {
        if (mode === "production") {
          const productWh = mapped.find((w: any) => w.type === "PRODUCT");
          if (productWh) setWarehouseId(productWh.value);
        }
      }
    } catch (err) {
      console.error("Fetch warehouses error:", err);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const selectedWH = warehouses.find(w => w.value === warehouseId);
      const whType = selectedWH?.type || "SEAJONG";
      let apiPath = "/api/logistics/seajong-inventory";
      if (whType === "MATERIAL") apiPath = "/api/production/materials";
      else if (whType === "PRODUCT") apiPath = "/api/production/manufactured-products";
      else if (whType === "DEFECT") apiPath = "/api/logistics/defects";
      else if (whType === "PRODUCT_SYNC") apiPath = "/api/finance/inventory";

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

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const selectedWH = warehouses.find(w => w.value === warehouseId);
      const whType = selectedWH?.type || "SEAJONG";
      let apiPath = "/api/logistics/seajong-inventory";
      if (whType === "MATERIAL") apiPath = "/api/production/materials";
      else if (whType === "PRODUCT") apiPath = "/api/production/manufactured-products";
      else if (whType === "DEFECT") apiPath = "/api/logistics/defects";
      else if (whType === "PRODUCT_SYNC") apiPath = "/api/finance/inventory";

      const res = await fetch(`${apiPath}/${deletingItem.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Xoá thất bại");
      }
      success("Xoá thành công", "Đã xoá mặt hàng");
      setShowDetail(false);
      setDeletingItem(null);
      handleRefresh();
    } catch (err: any) {
      error("Lỗi", err.message);
    } finally {
      setIsDeleting(false);
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
  const whType = selectedWH?.type || "SEAJONG";
  const isMaterial = whType === "MATERIAL";
  const isProduct = whType === "PRODUCT";
  const isDefect = whType === "DEFECT";
  const isKhoHangHoa = !warehouseId || selectedWH?.code === "KHO-CHINH";

  const rawColumns: TableColumn<InventoryItem | any>[] = [
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
      header: isMaterial ? "Vật tư / Nhóm" : (isProduct ? "Thành phẩm / Loại" : (isDefect ? "Hàng lỗi" : "Hàng hoá / Loại")),
      render: (row) => (
        <div className="d-flex align-items-center gap-3" style={{ minWidth: 0, width: "100%", maxWidth: "350px" }}>
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
          <div className="d-flex flex-column overflow-hidden flex-grow-1" style={{ minWidth: 0 }}>
            <span className="fw-semibold text-dark lh-1 mb-1 text-truncate d-block w-100" style={{ fontSize: 12.5 }} title={row.tenHang || row.name}>{row.tenHang || row.name}</span>
            <div className="d-flex align-items-center gap-2 overflow-hidden w-100">
              <small className="text-primary fw-medium flex-shrink-0" style={{ fontSize: 10, letterSpacing: 0.5 }}>{row.code || "SKU-AUTO"}</small>
              <span className="text-muted flex-shrink-0" style={{ fontSize: 10 }}>•</span>
              <small className="text-muted text-truncate flex-grow-1" style={{ fontSize: 10.5 }} title={row.category?.name}>{row.category?.name || "Chưa phân loại"}</small>
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
      width: isMaterial ? 200 : 80,
      align: isMaterial ? "left" : "center",
      render: (row) => (
        <span 
          className={isMaterial ? "text-muted small text-truncate d-inline-block" : "text-muted small"} 
          style={isMaterial ? { maxWidth: 180 } : undefined}
          title={isMaterial ? row.thongSoKyThuat : undefined}
        >
          {isMaterial ? (row.thongSoKyThuat || row.spec) : (row.donVi || row.unit || "cái")}
        </span>
      )
    },
    {
      header: "Tồn kho",
      width: 100,
      align: "right" as const,
      render: (row) => {
        const soLuong = row.soLuong || 0;
        return (
          <span className={cn(
            "fw-bold",
            soLuong <= 0 ? "text-danger" : "text-dark"
          )}>
            {soLuong.toLocaleString("vi-VN")}
          </span>
        );
      }
    },
    {
        header: "Giá nhập (đ)",
        width: 130,
        align: "right",
        render: (row) => (
          <span className="fw-medium text-dark">
            {(row.giaNhap || 0).toLocaleString("vi-VN")}
          </span>
        )
    },
    {
        header: "Giá bán (đ)",
        width: 130,
        align: "right",
        render: (row) => (
          <span className="fw-medium text-dark">
            {(row.giaBan || 0).toLocaleString("vi-VN")}
          </span>
        )
    },
    {
      header: "Trạng thái",
      width: 130,
      align: "center",
      render: (row) => {
        const soLuong = row.soLuong || 0;
        const isOut = soLuong <= 0;
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

  const isBoard = mode === "board";
  const hidePrice = isCS;
  const columns = rawColumns.filter(c => {
    if (hidePrice && ["Giá nhập (đ)", "Giá bán (đ)"].includes(c.header as string)) return false;
    return true;
  });

  return (
    <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0, gap: "1rem" }}>
      {/* KPI Cards */}
      <div className="row g-3 d-none">
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
                  <input type="file" accept=".xlsx, .xls" hidden ref={fileInputRef} onChange={handleUploadExcel} />
                  <button 
                    className="btn btn-light btn-sm border shadow-sm px-2 py-1" 
                    title="Tải file mẫu" 
                    onClick={handleDownloadTemplate}
                    disabled={isProcessingExcel}
                  >
                    <i className="bi bi-file-earmark-arrow-down" />
                  </button>
                  <button 
                    className="btn btn-light btn-sm border shadow-sm px-2 py-1" 
                    title="Import Excel" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingExcel}
                  >
                    {isProcessingExcel ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-file-earmark-arrow-up" />}
                  </button>
                  <button className="btn btn-light btn-sm border shadow-sm px-2 py-1"><i className="bi bi-printer" /></button>
                  <button 
                    className="btn btn-light btn-sm border shadow-sm px-2 py-1 text-danger position-relative" 
                    onClick={() => setShowMissingMaterials(true)}
                    title="Kiểm tra vật tư bị thiếu"
                  >
                    <i className="bi bi-exclamation-triangle-fill" />
                  </button>
                </div>
              }
            />

            {/* Filters */}
            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <FilterSelect 
                  options={warehouses}
                  value={warehouseId}
                  onChange={setWarehouseId}
                  placeholder="Tất cả kho"
                  width={200}
              />
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
              {allowAdd && <BrandButton icon="bi-plus-lg" className="flex-shrink-0" onClick={() => setShowAddModal(true)}>Thêm hàng hoá</BrandButton>}
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
            
            {isKhoHangHoa && showDetail && selectedItem && (
              <ProductDrawer 
                p={{
                  id: typeof selectedItem.id === 'number' ? selectedItem.id : 0,
                  slug: selectedItem.code || selectedItem.id,
                  url: selectedItem.webProductId ? `https://seajong.com/san-pham/${selectedItem.code}` : "#",
                  name: selectedItem.tenHang || selectedItem.name || "",
                  excerpt: selectedItem.ghiChu || "",
                  description: selectedItem.thongSoKyThuat || selectedItem.spec || "",
                  images: selectedItem.imageUrl ? [selectedItem.imageUrl] : [],
                  specs: {
                    "Mã sản phẩm": selectedItem.code || "---",
                    "Đơn vị tính": selectedItem.donVi || selectedItem.unit || "Cái",
                    "Thương hiệu": selectedItem.brand || "Seajong",
                    ...(selectedItem.material ? { "Chất liệu": selectedItem.material } : {}),
                    ...(selectedItem.color ? { "Màu sắc": selectedItem.color } : {}),
                    ...(selectedItem.kieuDang ? { "Kiểu dáng": selectedItem.kieuDang } : {})
                  },
                  price: selectedItem.giaBan || 0,
                  categories: selectedItem.category?.id ? [1] : [],
                  updatedAt: selectedItem.updatedAt || new Date().toISOString(),
                }}
                cats={selectedItem.category ? [{ id: 1, name: selectedItem.category.name, slug: "", count: 0, parent: 0 }] : []}
                onClose={() => setShowDetail(false)}
                onEdit={() => {
                  setShowDetail(false);
                  setEditItem(selectedItem);
                }}
              />
            )}

            <InventoryDetailOffcanvas 
              show={showDetail && !isKhoHangHoa}
              onClose={() => setShowDetail(false)}
              item={selectedItem}
              isMaterial={isMaterial}
              onRefresh={handleRefresh}
              onDelete={(item) => setDeletingItem(item)}
              onEdit={(item) => {
                setShowDetail(false);
                setEditItem(item);
              }}
            />
            <AddLogisticsProductModal 
              open={showAddModal || !!editItem} 
              onClose={() => { setShowAddModal(false); setEditItem(null); }} 
              onSaved={handleRefresh}
              warehouseId={warehouseId}
              warehouseType={warehouses.find(w => w.value === warehouseId)?.type}
              isMaterialWarehouse={warehouses.find(w => w.value === warehouseId)?.type === "MATERIAL"}
              editItem={editItem} 
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
      
      <ConfirmDialog
        open={!!deletingItem}
        variant="danger"
        title="Xác nhận xoá"
        message={`Bạn có chắc chắn muốn xoá mặt hàng "${deletingItem?.tenHang || deletingItem?.name}" không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingItem(null)}
      />

      <MissingMaterialsOffcanvas 
        show={showMissingMaterials} 
        onClose={() => setShowMissingMaterials(false)} 
      />
    </div>
  );
}
