"use client";
import React, { useState, useEffect } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table, TableColumn } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";

// Import existing modals from plan-finance
import { NhapKhoModal } from "@/components/plan-finance/kho_hang/NhapKhoModal";
import { XuatKhoModal } from "@/components/plan-finance/kho_hang/XuatKhoModal";
import { KiemKhoModal } from "@/components/plan-finance/kho_hang/KiemKhoModal";
import { LuanChuyenKhoModal } from "@/components/plan-finance/kho_hang/LuanChuyenKhoModal";

interface Warehouse {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  soLuong: number;
  trangThai: string;
  imageUrl?: string | null;
  categoryName?: string;
  category?: {
    name: string;
  };
  model?: string | null;
  color?: string | null;
}

export function LogisticsInbound({ onStatsChange }: { onStatsChange?: (stats: any) => void }) {
  const [activeModal, setActiveModal] = useState<"nhap" | "xuat" | "luan-chuyen" | "kiem" | null>(null);
  const [search, setSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredCount, setFilteredCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Load warehouses once on mount
  useEffect(() => {
    fetch("/api/logistics/warehouses")
      .then(res => res.json())
      .then(data => setWarehouses(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching warehouses:", err));
  }, []);

  // Fetch categories dynamically when filterWarehouse changes
  const fetchCategories = async () => {
    try {
      const url = filterWarehouse 
        ? `/api/logistics/categories?warehouseId=${filterWarehouse}`
        : "/api/logistics/categories";
      const res = await fetch(url);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch categories error:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [filterWarehouse]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterWarehouse, filterStatus]);

  // Fetch inventory items dynamically
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
      if (data.stats && onStatsChange) {
        onStatsChange(data.stats);
      }
    } catch (error) {
      console.error("Fetch items error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search, filterCategory, filterWarehouse, page]);

  const actions = [
    { label: "Nhập hàng", icon: "bi-arrow-down-left-square", fromColor: "#3b82f6", toColor: "#60a5fa", shadow: "rgba(59,130,246,0.25)" },
    { label: "Xuất hàng", icon: "bi-arrow-up-right-square", fromColor: "#ef4444", toColor: "#f87171", shadow: "rgba(239,68,68,0.25)" },
    { label: "Luân chuyển", icon: "bi-arrow-left-right", fromColor: "#f59e0b", toColor: "#fbbf24", shadow: "rgba(245,158,11,0.25)" },
    { label: "Kiểm kho", icon: "bi-clipboard2-check", fromColor: "#8b5cf6", toColor: "#a78bfa", shadow: "rgba(139,92,246,0.25)" },
  ];

  const filteredItems = items.filter(item => {
    if (!filterStatus) return true;
    return item.trangThai === filterStatus;
  });

  const columns: TableColumn<InventoryItem>[] = [
    {
      header: (
        <input 
          type="checkbox" 
          className="form-check-input shadow-none"
          checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds(filteredItems.map(item => item.id));
            } else {
              setSelectedIds([]);
            }
          }}
        />
      ),
      width: 40,
      align: "center",
      render: (row) => (
        <input 
          type="checkbox" 
          className="form-check-input shadow-none"
          checked={selectedIds.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds(prev => [...prev, row.id]);
            } else {
              setSelectedIds(prev => prev.filter(id => id !== row.id));
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
    {
      header: "Vật tư, hàng hoá",
      render: (row) => (
        <div className="d-flex align-items-center gap-3">
          <div 
            style={{ 
              width: 36, height: 36, borderRadius: 8, 
              background: "var(--border)", overflow: "hidden",
              flexShrink: 0, border: "1.5px solid rgba(0,0,0,0.05)",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
            }}
          >
            {row.imageUrl ? (
              <img 
                src={row.imageUrl} 
                alt={row.tenHang} 
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light">
                <i className="bi bi-box-seam text-muted opacity-50" style={{ fontSize: 16 }} />
              </div>
            )}
          </div>
          <div className="d-flex flex-column">
            <span className="fw-semibold text-dark lh-1 mb-1" style={{ fontSize: 12.5 }}>{row.tenHang}</span>
            <div className="d-flex align-items-center gap-2">
              <small className="text-primary fw-medium" style={{ fontSize: 10, letterSpacing: 0.5 }}>{row.code || "SKU-AUTO"}</small>
              <span className="text-muted" style={{ fontSize: 10 }}>•</span>
              <small className="text-muted" style={{ fontSize: 10.5 }}>{row.categoryName || row.category?.name || "Chưa phân loại"}</small>
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Đơn vị tính",
      width: 120,
      align: "center",
      render: (row) => <span className="text-muted small">{row.donVi || "Cái"}</span>
    },
    {
      header: "Tồn kho",
      width: 120,
      align: "right",
      render: (row) => (
        <span className="fw-bold text-dark">
          {row.soLuong.toLocaleString("vi-VN")}
        </span>
      )
    },
    {
      header: "Đã giữ",
      width: 120,
      align: "right",
      render: (row) => {
        const reserved = 0;
        return (
          <span style={{ color: "#991b1b", fontWeight: 700 }}>
            {reserved.toLocaleString("vi-VN")}
          </span>
        );
      }
    },
    {
      header: "Thực tồn",
      width: 120,
      align: "right",
      render: (row) => {
        const reserved = 0;
        const actual = row.soLuong - reserved;
        return (
          <span className="text-success fw-bold">
            {actual.toLocaleString("vi-VN")}
          </span>
        );
      }
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* Upper content */}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Tiêu đề mục */}
        <SectionTitle title="Danh sách hàng hoá trong kho" />

        {/* Thanh công cụ lọc và tìm kiếm */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
          {/* Lọc theo kho hàng */}
          <select 
            value={filterWarehouse}
            onChange={(e) => {
              setFilterWarehouse(e.target.value);
              setFilterCategory("");
            }}
            style={{
              height: "32px",
              padding: "0 10px",
              borderRadius: "8px",
              fontSize: "12px",
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              outline: "none",
              cursor: "pointer",
              minWidth: "150px"
            }}
          >
            <option value="">Tất cả kho hàng</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {/* Lọc theo danh mục */}
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              height: "32px",
              padding: "0 10px",
              borderRadius: "8px",
              fontSize: "12px",
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              outline: "none",
              cursor: "pointer",
              minWidth: "150px"
            }}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Lọc theo trạng thái */}
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              height: "32px",
              padding: "0 10px",
              borderRadius: "8px",
              fontSize: "12px",
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              outline: "none",
              cursor: "pointer",
              minWidth: "130px"
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="con-hang">Còn hàng</option>
            <option value="sap-het">Sắp hết hàng</option>
            <option value="het-hang">Đã hết hàng</option>
          </select>

          {/* Hộp tìm kiếm */}
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <i className="bi bi-search" style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: "12px" }} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, mã hàng hóa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "32px",
                padding: "0 12px 0 32px",
                borderRadius: "8px",
                fontSize: "12px",
                border: "1px solid var(--border)",
                background: "var(--background)",
                color: "var(--foreground)",
                outline: "none",
              }}
            />
          </div>

          {/* Nhóm nút tải file, import, export (chỉ dùng icon) */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {/* Tải excel mẫu */}
            <button 
              title="Tải file Excel mẫu"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
            >
              <i className="bi bi-file-earmark-arrow-down" style={{ fontSize: "14px", color: "#10b981" }} />
            </button>
            
            {/* Import */}
            <button 
              title="Nhập dữ liệu (Import)"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
            >
              <i className="bi bi-file-earmark-plus" style={{ fontSize: "14px", color: "#3b82f6" }} />
            </button>

            {/* Export */}
            <button 
              title="Xuất dữ liệu (Export)"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
            >
              <i className="bi bi-file-earmark-arrow-up" style={{ fontSize: "14px", color: "#8b5cf6" }} />
            </button>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div 
          className="rounded-3 bg-light/30 shadow-inner mb-3 flex-grow-1"
          style={{
            overflow: "hidden",
            minHeight: 0,
            display: "flex",
            flexDirection: "column"
          }}
        >
          <Table 
            rows={filteredItems}
            columns={columns}
            loading={loading}
            minWidth={800}
            compact={true}
            stickyHeader={true}
            wrapperStyle={{ height: "100%", overflowY: "auto" }}
            emptyText="Không có hàng hoá nào trong kho"
          />
        </div>
      </div>

      {/* Card Footer with Buttons */}
      <div style={{ 
        borderTop: "1px solid var(--border)", 
        paddingTop: "12px", 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        {/* Phân trang bên trái */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <Pagination 
            page={page}
            totalPages={totalPages}
            onChange={setPage}
          />
        </div>

        {/* Các nút chức năng bên phải */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {actions.map(action => (
            <button
              key={action.label}
              onClick={() => {
                if (action.label === "Nhập hàng") setActiveModal("nhap");
                else if (action.label === "Xuất hàng") setActiveModal("xuat");
                else if (action.label === "Luân chuyển") setActiveModal("luan-chuyen");
                else if (action.label === "Kiểm kho") setActiveModal("kiem");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: `linear-gradient(135deg, ${action.fromColor}, ${action.toColor})`,
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                boxShadow: `0 4px 10px ${action.shadow}`,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1.5px)";
                e.currentTarget.style.boxShadow = `0 6px 14px ${action.shadow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 4px 10px ${action.shadow}`;
              }}
            >
              <i className={`bi ${action.icon}`} style={{ fontSize: 13.5 }} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {activeModal === "nhap" && (
        <NhapKhoModal 
          onClose={() => setActiveModal(null)} 
          onSaved={() => {
            fetchItems();
          }} 
        />
      )}
      {activeModal === "xuat" && (
        <XuatKhoModal 
          onClose={() => setActiveModal(null)} 
          onSaved={() => {
            fetchItems();
          }} 
        />
      )}
      {activeModal === "kiem" && (
        <KiemKhoModal 
          onClose={() => setActiveModal(null)} 
          onSaved={() => {
            setActiveModal(null);
            fetchItems();
          }} 
        />
      )}
      {activeModal === "luan-chuyen" && (
        <LuanChuyenKhoModal 
          onClose={() => setActiveModal(null)} 
          onSaved={() => {
            setActiveModal(null);
            fetchItems();
          }} 
        />
      )}
    </div>
  );
}
