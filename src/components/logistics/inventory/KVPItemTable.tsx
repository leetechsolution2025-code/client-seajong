import React from "react";
import { HoverImage } from "@/components/ui/HoverImage";

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

interface KVPItemTableProps {
  items: InventoryItem[];
  loading: boolean;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  compactMode?: boolean;
  hideActions?: boolean;
  syncLog?: any;
  setSelectedItem: (item: InventoryItem) => void;
}

export function KVPItemTable({
  items,
  loading,
  selectedIds,
  setSelectedIds,
  compactMode,
  hideActions,
  syncLog,
  setSelectedItem
}: KVPItemTableProps) {

  // KVPItemTable logic based on User Rules (AGENTS.md):
  // 1. wrapperClassName="mkt-plan-table-no-min" to prevent 850px forced width
  // 2. fixedLayout={false}
  // 3. overflowX: "hidden" to prevent horizontal scroll

  return (
    <div className="h-100 overflow-hidden custom-scrollbar">
      <div 
        className="app-responsive-table-wrapper mkt-plan-table-no-min"
        style={{ overflowX: "hidden", height: "100%" }}
      >
        <table className="table table-hover align-middle mb-0" style={{ fontSize: 13, tableLayout: "auto" }}>
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
                      <div className="text-muted d-flex align-items-center gap-2 mt-1" style={{ fontSize: 12 }}>
                        <span className="fw-medium text-dark">{item.code || <span className="opacity-50">Không có mã</span>}</span>
                        {item.brand && (
                          <>
                            <span className="opacity-25">•</span>
                            <span>{item.brand}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                {!compactMode && <td>
                  <span className="badge bg-light text-dark border fw-medium" style={{ fontSize: 11 }}>
                    {item.category?.name || "Chưa phân loại"}
                  </span>
                </td>}
                {!compactMode && <td>
                  <div className="d-flex flex-column gap-1">
                    {item.model ? (
                      <span className="text-truncate" style={{ fontSize: 12 }}>M: <span className="fw-medium text-dark">{item.model}</span></span>
                    ) : <span className="text-muted opacity-50" style={{ fontSize: 12 }}>---</span>}
                    
                    {item.color ? (
                      <span className="text-truncate" style={{ fontSize: 12 }}>C: <span className="fw-medium text-dark">{item.color}</span></span>
                    ) : null}
                  </div>
                </td>}
                {!compactMode && <td className="text-center text-muted fw-medium" style={{ fontSize: 12 }}>
                  {item.donVi || "---"}
                </td>}
                {!compactMode && <td className="text-end">
                  <div className="fw-bold" style={{ fontSize: 13, color: item.soLuong <= 0 ? "var(--bs-danger)" : (item.soLuong <= item.soLuongMin ? "var(--bs-warning)" : "var(--bs-success)") }}>
                    {new Intl.NumberFormat("vi-VN").format(item.soLuong)}
                  </div>
                  {item.soLuongMin > 0 && (
                    <div className="text-muted" style={{ fontSize: 10 }}>Min: {item.soLuongMin}</div>
                  )}
                </td>}
                <td className="text-center">
                  <span
                    className="badge rounded-pill"
                    style={{
                      fontSize: 10,
                      padding: "4px 10px",
                      backgroundColor: item.trangThai === "con-hang" || item.soLuong > 0
                        ? "rgba(16, 185, 129, 0.1)"
                        : item.trangThai === "sap-het"
                          ? "rgba(245, 158, 11, 0.1)"
                          : "rgba(239, 68, 68, 0.1)",
                      color: item.trangThai === "con-hang" || item.soLuong > 0
                        ? "#059669"
                        : item.trangThai === "sap-het"
                          ? "#D97706"
                          : "#DC2626",
                      border: `1px solid ${
                        item.trangThai === "con-hang" || item.soLuong > 0
                          ? "rgba(16, 185, 129, 0.2)"
                          : item.trangThai === "sap-het"
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(239, 68, 68, 0.2)"
                      }`
                    }}
                  >
                    {item.soLuong > 0 ? "Còn hàng" : (item.trangThai === "het-hang" ? "Hết hàng" : (item.trangThai === "sap-het" ? "Sắp hết" : "Ngừng KD"))}
                  </span>
                </td>
                {hideActions ? null : <td className="text-end pe-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-sm btn-light rounded-circle shadow-sm"
                    style={{ width: 32, height: 32, padding: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}
                  >
                    <i className="bi bi-pencil" style={{ fontSize: 13 }} />
                  </button>
                </td>}
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
