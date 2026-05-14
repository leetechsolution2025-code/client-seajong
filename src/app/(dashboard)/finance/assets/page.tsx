"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { Table, TableColumn } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AssetFormOffcanvas } from "./AssetFormOffcanvas";

// Types
interface AssetData {
  id: string;
  code: string | null;
  tenTaiSan: string;
  loai: string | null;
  ngayMua: string | null;
  giaTriMua: number;
  giaTriConLai: number;
  soThangKhauHao: number | null;
  ngayBatDauKhauHao: string | null;
  chuKyBaoDuong: number | null;
  trangThai: string;
  viTri: string | null;
  donVi: string | null;
  nguoiSuDungId: string | null;
}

const CATEGORY_OPTIONS = [
  { label: "Nhà cửa, vật kiến trúc", value: "Nhà cửa, vật kiến trúc" },
  { label: "Máy móc, thiết bị", value: "Máy móc, thiết bị" },
  { label: "Phương tiện vận tải", value: "Phương tiện vận tải" },
  { label: "Thiết bị, dụng cụ quản lý", value: "Thiết bị, dụng cụ quản lý" },
  { label: "Phần mềm máy tính", value: "Phần mềm máy tính" },
  { label: "Tài sản cố định khác", value: "Các loại tài sản cố định khác" },
];

const STATUS_OPTIONS = [
  { label: "Chưa sử dụng", value: "chua-su-dung" },
  { label: "Đang sử dụng", value: "dang-su-dung" },
  { label: "Đang sửa chữa, bảo trì", value: "bao-tri" },
  { label: "Hết khấu hao", value: "het-khau-hao" },
  { label: "Đã thanh lý", value: "thanh-ly" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  "chua-su-dung": { label: "Chưa sử dụng", color: "primary" },
  "dang-su-dung": { label: "Đang sử dụng", color: "success" },
  "bao-tri": { label: "Đang sửa chữa", color: "warning" },
  "het-khau-hao": { label: "Hết khấu hao", color: "danger" },
  "thanh-ly": { label: "Đã thanh lý", color: "secondary" },
};

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetData | null>(null);
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | "liquidate">("delete");
  const [targetAsset, setTargetAsset] = useState<AssetData | null>(null);

  const { success, error } = useToast();
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [stats, setStats] = useState({
    totalValue: 0,
    totalInitialValue: 0,
    countInUse: 0,
    countMaintenance: 0,
    countDepreciated: 0,
  });

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        category,
        status,
      });
      const res = await fetch(`/api/finance/assets?${params.toString()}`);
      const data = await res.json();
      if (data.assets) {
        setAssets(data.assets);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Fetch assets failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    if (!targetAsset) return;
    setConfirmLoading(true);
    try {
      if (confirmType === "delete") {
        const res = await fetch(`/api/finance/assets/${targetAsset.id}`, { method: "DELETE" });
        if (res.ok) {
          success("Thành công", "Đã xóa tài sản");
          fetchAssets();
        } else {
          error("Lỗi", "Không thể xóa tài sản");
        }
      } else {
        // Liquidate: update status to 'thanh-ly'
        const res = await fetch(`/api/finance/assets/${targetAsset.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...targetAsset, trangThai: "thanh-ly" }),
        });
        if (res.ok) {
          success("Thành công", "Đã thanh lý tài sản");
          fetchAssets();
        } else {
          error("Lỗi", "Không thể thanh lý tài sản");
        }
      }
    } catch (err) {
      error("Lỗi", "Đã xảy ra lỗi hệ thống");
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setTargetAsset(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAssets();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [searchTerm, category, status]);

  const columns: TableColumn<AssetData>[] = [
    {
      header: "Tài sản",
      render: (row) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold">{row.tenTaiSan}</span>
          <small className="text-primary fw-medium mt-1" style={{ fontSize: 10, letterSpacing: 0.5 }}>{row.code || "---"}</small>
        </div>
      ),
    },
    {
      header: "Phân loại",
      render: (row) => (
        <div className="d-flex flex-column">
          <span className="fw-medium text-dark">{row.loai || "---"}</span>
          <small className="text-muted mt-0.5" style={{ fontSize: 10.5 }}>
            <i className="bi bi-calendar3 me-1" />
            {row.ngayMua ? new Date(row.ngayMua).toLocaleDateString("vi-VN") : "---"}
          </small>
        </div>
      ),
    },
    {
      header: "Nguyên giá",
      align: "right",
      render: (row) => {
        const depRate = row.giaTriMua > 0 ? ((row.giaTriMua - row.giaTriConLai) / row.giaTriMua) * 100 : 0;
        return (
          <div className="d-flex flex-column align-items-end">
            <span className="fw-medium">{row.giaTriMua.toLocaleString("vi-VN")}</span>
            <div 
              className="mt-1 bg-light rounded-pill overflow-hidden" 
              style={{ width: 60, height: 4, border: "1px solid var(--border)" }}
            >
              <div 
                className="h-100 bg-primary" 
                style={{ width: `${depRate}%`, transition: "width 0.3s ease" }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: "Giá trị còn lại",
      align: "right",
      render: (row) => (
        <span className={cn("fw-bold", Math.round(row.giaTriConLai) === 0 ? "text-danger" : "text-success")}>
          {Math.round(row.giaTriConLai).toLocaleString("vi-VN")}
        </span>
      ),
    },
    {
      header: "Đơn vị / Người sử dụng",
      render: (row) => (
        <div className="d-flex flex-column">
          <span className="fw-medium">{row.donVi || "---"}</span>
          <small className="text-muted" style={{ fontSize: 11 }}>
            {row.nguoiSuDungId || "Chưa bàn giao"}
          </small>
        </div>
      ),
    },
    {
      header: "Trạng thái",
      align: "center",
      width: 140,
      render: (row) => {
        const statusCfg = STATUS_MAP[row.trangThai] || { label: row.trangThai, color: "secondary" };
        return (
          <span className={cn(
            "badge rounded-pill fw-medium px-3 py-1.5",
            `bg-${statusCfg.color}-subtle text-${statusCfg.color}`
          )} style={{ fontSize: 10.5 }}>
            {statusCfg.label}
          </span>
        );
      },
    },
    {
      header: "",
      align: "center",
      width: 50,
      render: (row) => (
        <div className="dropdown">
          <button 
            className="btn btn-link btn-sm text-muted p-0 border-0"
            data-bs-toggle="dropdown"
          >
            <i className="bi bi-three-dots-vertical" />
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0" style={{ fontSize: 13 }}>
            <li>
              <button 
                className="dropdown-item d-flex align-items-center gap-2" 
                onClick={() => {
                  setEditingAsset(row);
                  setIsFormOpen(true);
                }}
              >
                <i className="bi bi-pencil small text-primary" />
                Sửa thông tin
              </button>
            </li>
            <li>
              <button 
                className="dropdown-item d-flex align-items-center gap-2" 
                onClick={() => {
                  setTargetAsset(row);
                  setConfirmType("liquidate");
                  setConfirmOpen(true);
                }}
              >
                <i className="bi bi-box-arrow-right small text-warning" />
                Thanh lý tài sản
              </button>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button 
                className="dropdown-item d-flex align-items-center gap-2 text-danger"
                onClick={() => {
                  setTargetAsset(row);
                  setConfirmType("delete");
                  setConfirmOpen(true);
                }}
              >
                <i className="bi bi-trash small" />
                Xóa tài sản
              </button>
            </li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <StandardPage
      title="Quản lý tài sản"
      description="Quản lý danh sách, khấu hao và vòng đời tài sản cố định"
      icon="bi-building"
      color="emerald"
      useCard={false}
    >
      <div className="d-flex flex-column h-100">
        
        {/* ── Thống kê ── */}
        <div className="row g-3 mb-3">
          <KPICard 
            label="Tổng giá trị hiện tại" 
            value={Math.round(stats.totalValue).toLocaleString("vi-VN")} 
            icon="bi-cash-stack" 
            accent="#6366f1" 
            suffix={stats.totalInitialValue > 0 ? (
              <span className="text-danger small ms-2" style={{ fontSize: 13, fontWeight: 600 }}>
                ↓ {Math.round(((stats.totalInitialValue - stats.totalValue) / stats.totalInitialValue) * 100)}%
              </span>
            ) : ""}
            subtitle="đồng"
          />
          <KPICard 
            label="Đang sử dụng" 
            value={stats.countInUse} 
            icon="bi-check2-circle" 
            accent="#10b981" 
            subtitle="tài sản" 
          />
          <KPICard 
            label="Cần bảo trì" 
            value={stats.countMaintenance} 
            icon="bi-tools" 
            accent="#f59e0b" 
            subtitle="đến hạn" 
          />
          <KPICard 
            label="Hết khấu hao" 
            value={stats.countDepreciated} 
            icon="bi-exclamation-triangle" 
            accent="#f43f5e" 
            subtitle="chờ thanh lý" 
          />
        </div>

        {/* ── Nội dung chính ── */}
        <div className="bg-white rounded-4 shadow-sm border p-3 flex-grow-1 d-flex flex-column overflow-hidden">
          
          {/* ── Toolbar ── */}
          <div className="d-flex align-items-center justify-content-between mb-3 gap-3">
            <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 800 }}>
              <FilterSelect 
                options={CATEGORY_OPTIONS} 
                value={category} 
                onChange={setCategory} 
                placeholder="Tất cả loại tài sản"
                width={180}
              />
              <FilterSelect 
                options={STATUS_OPTIONS} 
                value={status} 
                onChange={setStatus} 
                placeholder="Tất cả trạng thái"
                width={180}
              />
              <SearchInput 
                value={searchTerm} 
                onChange={setSearchTerm} 
                placeholder="Tìm tên, mã tài sản..." 
              />
            </div>
            
            <div className="d-flex align-items-center gap-2">
              <BrandButton variant="outline" icon="bi-bar-chart">
                Báo cáo
              </BrandButton>
              <BrandButton variant="outline" icon="bi-download">
                Xuất Excel
              </BrandButton>
              <BrandButton 
                icon="bi-plus-lg" 
                onClick={() => {
                  setEditingAsset(null);
                  setIsFormOpen(true);
                }}
              >
                Thêm mới
              </BrandButton>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="flex-grow-1" style={{ minHeight: 400, overflow: "visible" }}>
            <Table 
              rows={assets} 
              columns={columns} 
              loading={loading}
              emptyText="Không tìm thấy tài sản nào phù hợp"
            />
          </div>

          {/* ── Pagination ── */}
          <div className="pt-2">
            <div className="d-flex align-items-center justify-content-between">
              <small className="text-muted">
                Hiển thị <b>{assets.length}</b> tài sản
              </small>
              <Pagination 
                page={page} 
                totalPages={1} 
                onChange={setPage} 
              />
            </div>
          </div>

        </div>

      </div>

      <AssetFormOffcanvas 
        open={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setEditingAsset(null);
        }} 
        onSuccess={fetchAssets}
        initialData={editingAsset}
      />

      <ConfirmDialog 
        open={confirmOpen}
        variant={confirmType === "delete" ? "danger" : "warning"}
        title={confirmType === "delete" ? "Xác nhận xóa" : "Xác nhận thanh lý"}
        message={
          confirmType === "delete" 
            ? `Bạn có chắc chắn muốn xóa tài sản "${targetAsset?.tenTaiSan}"? Hành động này không thể hoàn tác.`
            : `Xác nhận chuyển trạng thái tài sản "${targetAsset?.tenTaiSan}" sang "Thanh lý"?`
        }
        confirmLabel={confirmType === "delete" ? "Xóa ngay" : "Xác nhận"}
        loading={confirmLoading}
        onConfirm={executeAction}
        onCancel={() => {
          setConfirmOpen(false);
          setTargetAsset(null);
        }}
      />
    </StandardPage>
  );
}


