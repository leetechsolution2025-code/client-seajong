"use client";

import * as XLSX from "xlsx";
import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { KPICard } from "@/components/ui/KPICard";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { TreeFilterSelect } from "@/components/ui/TreeFilterSelect";
import { TableFooter } from "@/components/ui/TableFooter";
import { HoverImage } from "@/components/ui/HoverImage";
import { InventoryDetailOffcanvas } from "@/app/(dashboard)/finance/inventory/InventoryDetailOffcanvas";
import { AddLogisticsProductModal } from "@/components/logistics/inventory/AddLogisticsProductModal";
import { ProductDrawer } from "@/components/marketing/ProductDrawer";
import { MissingMaterialsOffcanvas } from "@/components/finance/MissingMaterialsOffcanvas";
import { ImportIssuesOffcanvas } from "@/components/finance/ImportIssuesOffcanvas";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import UpdatePriceOffcanvas from "@/components/ui/UpdatePriceOffcanvas";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";

// Types
export interface InventoryItem {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  soLuong: number;
  giaNhap: number;
  giaVon?: number;
  giaBan: number;
  trangThai: string;
  category?: { name: string };
  brand?: string;
  imageUrl?: string | null;
  images?: string[];
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

function InventoryItemThumbnail({ row, size = 42 }: { row: any; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const src = row.imageUrl || (row.images && row.images.length > 0 ? row.images[0] : null);
  const iconSize = Math.max(13, Math.round(size * 0.38));
  const radius = size <= 36 ? 6 : 8;

  if (!src || imgError) {
    return (
      <div 
        className="border bg-light d-flex align-items-center justify-content-center" 
        style={{ width: size, height: size, minWidth: size, borderRadius: radius, flexShrink: 0 }}
      >
        <i className="bi bi-box-seam text-muted opacity-50" style={{ fontSize: iconSize }} />
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size, minWidth: size, borderRadius: radius, overflow: "hidden", border: "1px solid var(--border)", background: "#fff", flexShrink: 0 }}>
      <HoverImage 
        src={src} 
        images={row.images} 
        alt={row.tenHang || row.name || ""} 
        onError={() => setImgError(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
      />
    </div>
  );
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
  
  const { data: session } = useSession();
  const canViewPrice = session?.user?.role === "ADMIN" || session?.user?.permissions?.includes("view_prices");
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
  const [totalItems, setTotalItems] = useState(0);
  const [warehouseCount, setWarehouseCount] = useState(0);
  
  const [pageSize, setPageSize] = useState<number>(15);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMissingMaterials, setShowMissingMaterials] = useState(false);
  const [showPriceOffcanvas, setShowPriceOffcanvas] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [skippedItems, setSkippedItems] = useState<{sku: string, name: string, reason: string}[]>([]);
  const [showSkippedOffcanvas, setShowSkippedOffcanvas] = useState(false);

  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { error, success } = useToast();

  const buildInventoryWorkbook = (
    exportItems: any[],
    whObj?: { label: string; value: string; type: string; code?: string | null }
  ) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const whTitle = whObj
      ? `${whObj.label.toUpperCase()}${whObj.code ? ` (MÃ: ${whObj.code.toUpperCase()})` : ""}`
      : "TẤT CẢ CÁC KHO";
    const defaultLoai = whObj?.code === "KVP" || whObj?.type === "MATERIAL" ? "vat-tu" : "hang-hoa";

    const dataRows = exportItems.map((it: any, idx: number) => [
      idx + 1,
      it.code ?? "",
      it.tenHang || it.name || "",
      it.loai || defaultLoai,
      it.brand || "Seajong",
      Number(it.soLuong ?? 0),
      it.donVi || it.unit || "Cái"
    ]);

    const totalQty = exportItems.reduce((sum: number, it: any) => sum + (Number(it.soLuong) || 0), 0);
    const totalRow = ["Tổng cộng", "", "", "", "", totalQty, ""];

    const aoa = [
      ["CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM", "", "", "", "", "", ""],
      [`BÁO CÁO TỒN KHO - ${whTitle}`, "", "", "", "", "", ""],
      [`Ngày xuất báo cáo: ${dateStr} | Tổng số mặt hàng: ${exportItems.length}`, "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["STT", "Mã SKU", "Tên Vật Tư / Linh Kiện", "Loại hàng", "Thương hiệu", "Số lượng tồn", "Đơn vị tính"],
      ...dataRows,
      totalRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastDataRowExcelNum = 5 + exportItems.length;
    const totalRowExcelNum = 6 + exportItems.length;

    if (exportItems.length > 0) {
      ws[`F${totalRowExcelNum}`] = {
        t: "n",
        f: `SUM(F6:F${lastDataRowExcelNum})`,
        v: totalQty,
        z: "#,##0.##"
      };
      for (let r = 6; r <= lastDataRowExcelNum; r++) {
        if (ws[`F${r}`]) {
          ws[`F${r}`].z = "#,##0.##";
        }
      }
    }

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      { s: { r: 5 + exportItems.length, c: 0 }, e: { r: 5 + exportItems.length, c: 4 } }
    ];

    ws["!cols"] = [
      { wch: 8 },
      { wch: 22 },
      { wch: 45 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 }
    ];

    const wsRows: any[] = [undefined, undefined, undefined, undefined, { hpt: 25, hpx: 25 }];
    for (let i = 0; i <= exportItems.length; i++) {
      wsRows.push({ hpt: 20, hpx: 20 });
    }
    ws["!rows"] = wsRows;

    const sheetCode = whObj?.code || "ALL";
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `TonKho_${sheetCode}`.slice(0, 31));
    return { wb, sheetCode, dateStr };
  };

  const handleDownloadTemplate = () => {
    const selectedWH = warehouses.find(w => w.value === warehouseId);
    const defaultLoai = selectedWH?.code === "KVP" || selectedWH?.type === "MATERIAL" ? "vat-tu" : "hang-hoa";
    const sampleItems = [
      { code: "ONT50", tenHang: "Ốc kết nối với chân sen ONT50", loai: defaultLoai, brand: "OEM", soLuong: 100, donVi: "cái" },
      { code: "LS40", tenHang: "Lõi sen nhựa thường dùng cho sen vòi LS40", loai: defaultLoai, brand: "Seajong", soLuong: 50, donVi: "cái" }
    ];
    const { wb } = buildInventoryWorkbook(sampleItems, selectedWH);
    XLSX.writeFile(wb, "Mau_Nhap_Kho.xlsx");
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const selectedWH = warehouses.find(w => w.value === warehouseId);
      const params = new URLSearchParams({
        nolimit: "true",
        excludeDinhMucs: "true",
        search: searchTerm,
        categoryId,
        trangThai,
        warehouseId,
        mode
      });

      const res = await fetch(`/api/logistics/inventory?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải dữ liệu tồn kho để xuất Excel");
      const data = await res.json();
      const exportItems: any[] = Array.isArray(data.items) ? [...data.items] : [];

      if (exportItems.length === 0) {
        error("Không có dữ liệu hàng hoá để xuất Excel.");
        return;
      }

      exportItems.sort((a: any, b: any) => {
        const codeA = (a.code || "").toString().trim();
        const codeB = (b.code || "").toString().trim();
        if (codeA !== codeB) return codeA.localeCompare(codeB, "vi");
        return (a.tenHang || a.name || "").toString().localeCompare((b.tenHang || b.name || "").toString(), "vi");
      });

      const { wb, sheetCode, dateStr } = buildInventoryWorkbook(exportItems, selectedWH);
      XLSX.writeFile(wb, `TonKho_${sheetCode}_${dateStr}.xlsx`);
      success(`Đã xuất ${exportItems.length} mặt hàng ra file Excel!`);
    } catch (err: any) {
      console.error(err);
      error("Lỗi khi xuất Excel: " + (err.message || "Không xác định"));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!warehouseId) {
      error("Vui lòng chọn Kho hàng cụ thể trước khi Import.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsProcessingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

      const normHeader = (val: any) =>
        String(val ?? "")
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d");

      // Tự động tìm dòng tiêu đề cột (hỗ trợ cả mẫu Báo cáo tồn kho có 4 dòng đầu và mẫu Template cũ)
      let headerRowIdx = -1;
      for (let r = 0; r < Math.min(rows.length, 15); r++) {
        const rowCells = (rows[r] || []).map(normHeader);
        const hasSkuCol = rowCells.some(c => c.includes("ma sku") || c.includes("ma hang") || c === "sku");
        const hasNameCol = rowCells.some(c => c.includes("ten vat tu") || c.includes("ten hang") || c.includes("linh kien") || c.includes("ten san pham"));
        if (hasSkuCol || hasNameCol) {
          headerRowIdx = r;
          break;
        }
      }

      const itemsToImport = [];

      if (headerRowIdx !== -1) {
        const headers = (rows[headerRowIdx] || []).map(normHeader);
        const findCol = (pred: (h: string) => boolean) => headers.findIndex(pred);

        const skuIdx = findCol(h => h === "ma sku" || h.includes("ma sku") || h.includes("ma hang hoa") || h === "ma hang" || h === "sku");
        const altCodeIdx = findCol(h => h.includes("ma thay the"));
        const nameIdx = findCol(h => h.includes("ten vat tu") || h.includes("ten hang") || h.includes("linh kien") || h.includes("ten san pham"));
        const loaiIdx = findCol(h => h === "loai hang" || h === "loai");
        const catIdx = findCol(h => h.includes("ma nhom") || h.includes("danh muc"));
        const brandIdx = findCol(h => h.includes("thuong hieu") || h.includes("nhan hieu") || h === "hang");
        const qtyIdx = findCol(h => h.includes("so luong ton") || h === "so luong" || h.includes("tong ton") || h.includes("thuc ton") || h === "ton kho");
        const unitIdx = findCol(h => h.includes("don vi tinh") || h === "dvt" || h === "don vi");
        const importPriceIdx = findCol(h => h.includes("gia nhap"));
        const costPriceIdx = findCol(h => h.includes("gia von"));
        const sellPriceIdx = findCol(h => h.includes("gia ban"));
        const noteIdx = findCol(h => h.includes("ghi chu"));

        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i] as any[];
          if (!row || row.length === 0) continue;

          const firstCellNorm = normHeader(row[0]);
          if (firstCellNorm.startsWith("tong cong") || firstCellNorm === "total") continue;

          const name = (nameIdx !== -1 ? row[nameIdx] : row[2])?.toString().trim() || "";
          if (!name) continue;

          const rawQty = qtyIdx !== -1 ? row[qtyIdx] : 0;
          const parsedQty = typeof rawQty === "number"
            ? rawQty
            : parseFloat(String(rawQty ?? "0").replace(/,/g, "")) || 0;

          itemsToImport.push({
            sku: (skuIdx !== -1 ? row[skuIdx] : "")?.toString().trim() || "",
            alternateCode: (altCodeIdx !== -1 ? row[altCodeIdx] : "")?.toString().trim() || "",
            name,
            loai: (loaiIdx !== -1 ? row[loaiIdx] : "")?.toString().trim() || "",
            categoryCode: (catIdx !== -1 ? row[catIdx] : "")?.toString().trim() || "",
            unit: (unitIdx !== -1 ? row[unitIdx] : "Cái")?.toString().trim() || "Cái",
            quantity: Math.max(0, parsedQty),
            importPrice: importPriceIdx !== -1 ? (parseFloat(String(row[importPriceIdx] ?? "0").replace(/,/g, "")) || 0) : undefined,
            costPrice: costPriceIdx !== -1 ? (parseFloat(String(row[costPriceIdx] ?? "0").replace(/,/g, "")) || 0) : undefined,
            sellPrice: sellPriceIdx !== -1 ? (parseFloat(String(row[sellPriceIdx] ?? "0").replace(/,/g, "")) || 0) : undefined,
            brand: (brandIdx !== -1 ? row[brandIdx] : "Seajong")?.toString().trim() || "Seajong",
            note: noteIdx !== -1 ? row[noteIdx]?.toString().trim() || "" : undefined
          });
        }
      } else {
        // Fallback nếu file không có dòng tiêu đề chuẩn
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as any[];
          if (!row || row.length === 0 || !row[2]) continue;
          const firstCellNorm = normHeader(row[0]);
          if (firstCellNorm.startsWith("tong cong")) continue;

          itemsToImport.push({
            sku: row[1]?.toString().trim() || "",
            name: row[2]?.toString().trim() || "",
            loai: row[3]?.toString().trim() || "",
            brand: row[4]?.toString().trim() || "Seajong",
            quantity: parseFloat(row[5]) || 0,
            unit: row[6]?.toString().trim() || "Cái"
          });
        }
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
        setSkippedItems(resData.skipped);
        setShowSkippedOffcanvas(true);
        success(`Import thành công ${resData.imported} mặt hàng. Bỏ qua ${resData.skipped.length} mặt hàng (Xem chi tiết).`);
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
      let apiPath = "/api/logistics/inventory/stats";

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
      let apiPath = "/api/logistics/inventory";

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
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
      setTotalItems(data.total ?? data.stats?.tongMatHang ?? 0);
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
      let apiPath = "/api/logistics/inventory";

      const res = await fetch(`${apiPath}?id=${deletingItem.id}&source=${(deletingItem as any).source || "inventory"}`, { method: "DELETE" });
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
  }, [page, pageSize, searchTerm, categoryId, trangThai, warehouseId]);

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
          <InventoryItemThumbnail row={row} />
          <div className="d-flex flex-column overflow-hidden flex-grow-1" style={{ minWidth: 0 }}>
            <span className="fw-semibold text-dark lh-1 mb-1 text-truncate d-block w-100" style={{ fontSize: 12.5 }} title={row.tenHang || row.name}>{row.tenHang || row.name}</span>
            <div className="d-flex align-items-center gap-2 overflow-hidden w-100">
              <small className="text-primary fw-medium flex-shrink-0" style={{ fontSize: 10, letterSpacing: 0.5 }}>{row.code || "SKU-AUTO"}</small>
              <span className="text-muted flex-shrink-0" style={{ fontSize: 10 }}>•</span>
              <small className="text-muted text-truncate flex-grow-1" style={{ fontSize: 10.5 }} title={row.categoryName || row.category?.name || row.erpCategory?.name}>{row.categoryName || row.category?.name || row.erpCategory?.name || "Chưa phân loại"}</small>
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
      header: "Thực tồn",
      width: 100,
      align: "right" as const,
      render: (row) => {
        const thucTon = row.thucTon || 0;
        return (
          <span className={cn(
            "fw-bold",
            thucTon <= 0 ? "text-danger" : "text-dark"
          )}>
            {thucTon.toLocaleString("vi-VN")}
          </span>
        );
      }
    },
    {
      header: "Đã giữ",
      width: 90,
      align: "right" as const,
      render: (row) => {
        const soLuongGiu = row.soLuongGiu || 0;
        return (
          <span className="fw-medium text-warning">
            {soLuongGiu.toLocaleString("vi-VN")}
          </span>
        );
      }
    },
    {
      header: "Tổng tồn",
      width: 90,
      align: "right" as const,
      render: (row) => {
        const soLuong = row.soLuong || 0;
        return (
          <span className="fw-medium text-muted">
            {soLuong.toLocaleString("vi-VN")}
          </span>
        );
      }
    },
    {
        header: "Giá vốn (đ)",
        width: 130,
        align: "right",
        render: (row) => {
          const val = row.giaVon !== undefined && row.giaVon !== null && Number(row.giaVon) > 0 
            ? Number(row.giaVon) 
            : (row.giaNhap || 0);
          return (
            <span className="fw-medium text-dark">
              {canViewPrice ? val.toLocaleString("vi-VN") : "*****"}
            </span>
          );
        }
    },
    {
        header: "Giá bán (đ)",
        width: 130,
        align: "right",
        render: (row) => (
          <span className="fw-medium text-dark">
            {canViewPrice ? (row.giaBan || 0).toLocaleString("vi-VN") : "*****"}
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
    if (hidePrice && ["Giá vốn (đ)", "Giá nhập (đ)", "Giá bán (đ)"].includes(c.header as string)) return false;
    return true;
  });

  const selectedWHCode = warehouses.find(w => w.value === warehouseId)?.code;

  const mobileColumns: TableColumn<InventoryItem | any>[] = [
    {
      header: isMaterial ? "Vật tư" : (isProduct ? "Thành phẩm" : (isDefect ? "Hàng lỗi" : "Hàng hoá")),
      render: (row) => {
        const name = row.tenHang || row.name || "---";
        const subInfo = isMaterial 
          ? (row.material || row.thongSoKyThuat || row.donVi || row.unit || "cái")
          : [row.donVi || row.unit || "cái", row.brand].filter(Boolean).join(" • ");

        return (
          <div className="d-flex align-items-center gap-2 py-0.5" style={{ minWidth: 0 }}>
            <InventoryItemThumbnail row={row} size={34} />
            <div className="d-flex flex-column min-w-0" style={{ minWidth: 0, overflow: "hidden" }}>
              <span
                className="fw-bold text-dark d-block lh-sm"
                style={{
                  fontSize: 12,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  wordBreak: "break-word"
                }}
                title={name}
              >
                {name}
              </span>
              <div className="d-flex align-items-center gap-1 overflow-hidden mt-0.5" style={{ fontSize: 10 }}>
                <span
                  className="fw-semibold text-primary flex-shrink-0"
                  style={{ fontFamily: "monospace", letterSpacing: "0.2px" }}
                >
                  {row.code || "SKU-AUTO"}
                </span>
                {subInfo && (
                  <>
                    <span className="text-muted flex-shrink-0">•</span>
                    <span className="text-muted text-truncate flex-grow-1" style={{ maxWidth: 85 }}>
                      {subInfo}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: "Tồn kho",
      width: 68,
      align: "right",
      render: (row) => {
        const thucTon = row.thucTon ?? row.soLuong ?? 0;
        const soLuongGiu = row.soLuongGiu || 0;
        const soLuong = row.soLuong || 0;
        return (
          <div className="d-flex flex-column align-items-end justify-content-center py-0.5">
            <span
              className={cn("fw-bold lh-1", thucTon <= 0 ? "text-danger" : "text-dark")}
              style={{ fontSize: 12.5 }}
            >
              {thucTon.toLocaleString("vi-VN")}
            </span>
            <span className="text-muted lh-1 mt-1 text-nowrap" style={{ fontSize: 9.5 }}>
              {soLuongGiu > 0 ? (
                <span className="text-warning fw-medium">Giữ: {soLuongGiu}</span>
              ) : (
                <span>Tổng: {soLuong}</span>
              )}
            </span>
          </div>
        );
      }
    },
    ...(!hidePrice ? [{
      header: "Giá bán",
      width: 78,
      align: "right" as const,
      render: (row: any) => (
        <div className="d-flex flex-column align-items-end justify-content-center py-0.5">
          <span className="fw-bold text-primary lh-1" style={{ fontSize: 12 }}>
            {canViewPrice ? (row.giaBan || 0).toLocaleString("vi-VN") : "*****"}
            <span style={{ fontSize: 9.5, fontWeight: 500, marginLeft: 1 }}>₫</span>
          </span>
          {canViewPrice && (row.giaVon || row.giaNhap) ? (
            <span className="text-muted lh-1 mt-1 text-nowrap" style={{ fontSize: 9, opacity: 0.75 }}>
              Vốn: {(row.giaVon !== undefined && row.giaVon !== null && Number(row.giaVon) > 0 ? Number(row.giaVon) : (row.giaNhap || 0)).toLocaleString("vi-VN")}
            </span>
          ) : null}
        </div>
      )
    }] : []),
    {
      header: "Trạng thái",
      width: 70,
      align: "center",
      render: (row) => {
        const soLuong = row.soLuong || 0;
        const isOut = soLuong <= 0;
        const isLow = row.trangThai === "sap-het";
        return (
          <span
            className={cn(
              "badge rounded-pill fw-medium border px-1.5 py-1",
              isOut ? "bg-danger-subtle text-danger border-danger-subtle" : 
              isLow ? "bg-warning-subtle text-warning border-warning-subtle" : "bg-success-subtle text-success border-success-subtle"
            )}
            style={{ fontSize: 9.5, whiteSpace: "nowrap" }}
          >
            {isOut ? "Hết hàng" : isLow ? "Sắp hết" : "Còn hàng"}
          </span>
        );
      }
    }
  ];

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
          value={canViewPrice ? stats.tongGiaTri.toLocaleString("vi-VN") : "*****"} 
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
          <div className="bg-white rounded-4 shadow-sm border h-100 d-flex flex-column overflow-hidden">
            <FullWidthTableLayout
              className="flex-grow-1 overflow-hidden"
              style={{ minHeight: 0 }}
              header={
                <div className="d-flex flex-column gap-2">
                  <input type="file" accept=".xlsx, .xls" hidden ref={fileInputRef} onChange={handleUploadExcel} />

                  {/* Desktop / Tablet Filters (>= 769px) */}
                  <div className="d-none d-md-flex align-items-center gap-2 flex-wrap">
                    <FilterSelect 
                        options={warehouses}
                        value={warehouseId}
                        onChange={(val) => {
                          setWarehouseId(val);
                          setPage(1);
                        }}
                        placeholder="Tất cả kho"
                        width={200}
                    />
                    <TreeFilterSelect 
                        options={categories}
                        value={categoryId}
                        onChange={(val) => {
                          setCategoryId(val);
                          setPage(1);
                        }}
                        placeholder="Tất cả các loại hàng hoá"
                        width={240}
                        disabled={!warehouseId}
                    />
                    <FilterSelect 
                        options={[
                            { label: "Còn hàng", value: "con-hang" },
                            { label: "Sắp hết", value: "sap-het" },
                            { label: "Hết hàng", value: "het-hang" },
                        ]}
                        value={trangThai}
                        onChange={(val) => {
                          setTrangThai(val);
                          setPage(1);
                        }}
                        placeholder="Trạng thái"
                        width={150}
                        disabled={!warehouseId}
                    />
                    <div className="flex-grow-1" style={{ minWidth: 200 }}>
                      <SearchInput 
                          value={searchTerm}
                          onChange={(val) => {
                            setSearchTerm(val);
                            setPage(1);
                          }}
                          onKeyDown={handleSearchKeyDown}
                          placeholder="Tìm theo tên, SKU..."
                      />
                    </div>
                    {/* Các nút thao tác cạnh ô tìm kiếm */}
                    <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                      <button 
                        className="btn btn-light btn-sm border shadow-sm d-flex align-items-center justify-content-center" 
                        style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                        title={!warehouseId ? "Vui lòng chọn Kho hàng cụ thể để tải file mẫu" : "Tải file mẫu"} 
                        onClick={handleDownloadTemplate}
                        disabled={isProcessingExcel || isExportingExcel || !warehouseId}
                      >
                        <i className="bi bi-file-earmark-arrow-down" />
                      </button>
                      <button 
                        className="btn btn-light btn-sm border shadow-sm d-flex align-items-center justify-content-center" 
                        style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                        title={!warehouseId ? "Vui lòng chọn Kho hàng cụ thể để Import" : "Import Excel"} 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingExcel || isExportingExcel || !warehouseId}
                      >
                        {isProcessingExcel ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-file-earmark-arrow-up" />}
                      </button>
                      <button 
                        className="btn btn-light btn-sm border shadow-sm text-success d-flex align-items-center justify-content-center" 
                        style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                        title="Export Excel" 
                        onClick={handleExportExcel}
                        disabled={isProcessingExcel || isExportingExcel}
                      >
                        {isExportingExcel ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-file-earmark-excel" />}
                      </button>
                      <button 
                        className="btn btn-light btn-sm border shadow-sm d-flex align-items-center justify-content-center" 
                        style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                        title="In ấn"
                      >
                        <i className="bi bi-printer" />
                      </button>
                      <button 
                        className="btn btn-light btn-sm border shadow-sm text-danger position-relative d-flex align-items-center justify-content-center" 
                        style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                        onClick={() => setShowMissingMaterials(true)}
                        title="Kiểm tra vật tư bị thiếu"
                      >
                        <i className="bi bi-exclamation-triangle-fill" />
                      </button>
                    </div>

                    {selectedWHCode === "KVP" && (
                      <button 
                        className="btn btn-outline-primary btn-sm flex-shrink-0 d-flex align-items-center gap-2"
                        style={{ height: '34px', padding: '0 16px', fontWeight: 600, borderRadius: '8px' }}
                        onClick={() => setShowPriceOffcanvas(true)}
                      >
                        <i className="bi bi-tag"></i> Giá bán linh kiện
                      </button>
                    )}
                    {allowAdd && <BrandButton icon="bi-plus-lg" className="flex-shrink-0" onClick={() => setShowAddModal(true)}>Thêm hàng hoá</BrandButton>}
                  </div>

                  {/* Mobile Filters (< 769px) */}
                  <div className="d-flex d-md-none flex-column gap-2 mt-1">
                    <div className="d-flex align-items-center gap-1.5 w-100">
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <SearchInput 
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Tìm theo tên, SKU..."
                            className="w-100"
                        />
                      </div>
                      <div className="d-flex align-items-center gap-1 flex-shrink-0">
                        <button 
                          className="btn btn-light btn-sm border shadow-sm d-flex align-items-center justify-content-center" 
                          style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                          title={!warehouseId ? "Vui lòng chọn Kho hàng cụ thể để tải file mẫu" : "Tải file mẫu"} 
                          onClick={handleDownloadTemplate}
                          disabled={isProcessingExcel || isExportingExcel || !warehouseId}
                        >
                          <i className="bi bi-file-earmark-arrow-down" />
                        </button>
                        <button 
                          className="btn btn-light btn-sm border shadow-sm d-flex align-items-center justify-content-center" 
                          style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                          title={!warehouseId ? "Vui lòng chọn Kho hàng cụ thể để Import" : "Import Excel"} 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessingExcel || isExportingExcel || !warehouseId}
                        >
                          {isProcessingExcel ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-file-earmark-arrow-up" />}
                        </button>
                        <button 
                          className="btn btn-light btn-sm border shadow-sm text-success d-flex align-items-center justify-content-center" 
                          style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                          title="Export Excel" 
                          onClick={handleExportExcel}
                          disabled={isProcessingExcel || isExportingExcel}
                        >
                          {isExportingExcel ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-file-earmark-excel" />}
                        </button>
                        <button 
                          className="btn btn-light btn-sm border shadow-sm d-flex align-items-center justify-content-center" 
                          style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                          title="In ấn"
                        >
                          <i className="bi bi-printer" />
                        </button>
                        <button 
                          className="btn btn-light btn-sm border shadow-sm text-danger d-flex align-items-center justify-content-center" 
                          style={{ height: 34, width: 34, borderRadius: 8, padding: 0 }}
                          onClick={() => setShowMissingMaterials(true)}
                          title="Kiểm tra vật tư bị thiếu"
                        >
                          <i className="bi bi-exclamation-triangle-fill" />
                        </button>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <FilterSelect 
                            options={warehouses}
                            value={warehouseId}
                            onChange={setWarehouseId}
                            placeholder="Tất cả kho"
                            width="100%"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <FilterSelect 
                            options={[
                                { label: "Còn hàng", value: "con-hang" },
                                { label: "Sắp hết", value: "sap-het" },
                                { label: "Hết hàng", value: "het-hang" },
                            ]}
                            value={trangThai}
                            onChange={setTrangThai}
                            placeholder="Trạng thái"
                            width="100%"
                            disabled={!warehouseId}
                        />
                      </div>
                    </div>
                    <div>
                      <TreeFilterSelect 
                          options={categories}
                          value={categoryId}
                          onChange={setCategoryId}
                          placeholder="Tất cả các loại hàng hoá"
                          width="100%"
                          disabled={!warehouseId}
                      />
                    </div>
                    {selectedWHCode === "KVP" && (
                      <button 
                        className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                        style={{ height: '34px', fontWeight: 600, borderRadius: '8px' }}
                        onClick={() => setShowPriceOffcanvas(true)}
                      >
                        <i className="bi bi-tag"></i> Giá bán linh kiện
                      </button>
                    )}
                    {allowAdd && (
                      <BrandButton icon="bi-plus-lg" className="w-100" onClick={() => setShowAddModal(true)}>
                        Thêm hàng hoá
                      </BrandButton>
                    )}
                  </div>
                </div>
              }
              table={
                <>
                  {/* Desktop Table (>= 769px) */}
                  <div className="d-none d-md-flex flex-column flex-grow-1 h-100" style={{ minHeight: 0 }}>
                    <Table 
                      rows={items}
                      columns={columns}
                      loading={loading}
                      onRowClick={handleRowClick}
                      minWidth={1000}
                      compact={true}
                      stickyHeader={true}
                      emptyText="Không có hàng hoá nào trong kho"
                      wrapperStyle={{ overflowY: "auto", flex: 1, minHeight: 0 }}
                    />
                  </div>

                  {/* Mobile Table View (< 769px) */}
                  <div className="d-flex d-md-none flex-column flex-grow-1 h-100" style={{ minHeight: 0 }}>
                    <Table 
                      rows={items}
                      columns={mobileColumns}
                      loading={loading}
                      onRowClick={handleRowClick}
                      minWidth={0}
                      fixedLayout={false}
                      compact={true}
                      stickyHeader={true}
                      wrapperClassName="mkt-plan-table-no-min mobile-inventory-table"
                      emptyText="Không có hàng hoá nào trong kho"
                      wrapperStyle={{ overflowX: "hidden", overflowY: "auto", flex: 1, minHeight: 0 }}
                    />
                  </div>
                </>
              }
              footerStyle={{ padding: "8px 16px", backgroundColor: "#fff" }}
              footer={
                <TableFooter
                  currentCount={(items || []).length}
                  totalCount={totalItems || stats.tongMatHang || 0}
                  itemName="mặt hàng"
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  pageSizeOptions={[15, 30, 50, 100]}
                  onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-transparent"
                />
              }
            />
            
            {/* Drawers and Modals */}
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

        </div>
      </div>
      
      <ConfirmDialog
        open={!!deletingItem}
        variant="danger"
        title="Xác nhận xoá"
        message={`Bạn có chắc chắn muốn xoá mặt hàng "${deletingItem?.tenHang || (deletingItem as any)?.name}" không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingItem(null)}
      />

      <MissingMaterialsOffcanvas 
        show={showMissingMaterials} 
        onClose={() => setShowMissingMaterials(false)} 
      />

      <ImportIssuesOffcanvas
        show={showSkippedOffcanvas}
        onClose={() => setShowSkippedOffcanvas(false)}
        skippedItems={skippedItems}
      />

      <UpdatePriceOffcanvas
        show={showPriceOffcanvas}
        onClose={() => setShowPriceOffcanvas(false)}
        itemName="Áp dụng linh kiện"
        initialCost={0}
        costLabel="Giá nhập"
        initialPrice={0}
        isBulkOnly={true}
        applyAllLabel="Áp dụng cho tất cả Linh kiện, Vật tư (không có định mức)"
        onSaveSingle={async () => {
          // No single save available for KVP bulk button right now
        }}
        onSaveAll={async (marginPct, marginType) => {
          success("Đang tính toán và áp dụng cho tất cả linh kiện...");
          const res = await fetch("/api/logistics/inventory/update-price-ratio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ marginPct, marginType, scope: "material" })
          });
          const data = await res.json().catch(() => ({}));
          if (data.success) {
            success(`Đã cập nhật giá bán cho ${data.updatedCount} linh kiện`);
            fetchItems();
            setShowPriceOffcanvas(false);
          } else {
            error(data.error || "Có lỗi xảy ra");
          }
        }}
      />
    </div>
  );
}
