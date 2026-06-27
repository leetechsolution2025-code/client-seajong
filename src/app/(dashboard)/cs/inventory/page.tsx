"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Table } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { AnimatePresence, motion } from "framer-motion";

interface Warehouse {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
}

interface Stock {
  id: string;
  soLuong: number;
  soLuongMin: number;
  viTriHang?: string | null;
  viTriCot?: string | null;
  viTriTang?: string | null;
  warehouse: Warehouse;
}

interface InventoryItem {
  id: string;
  code?: string | null;
  tenHang: string;
  donVi: string | null;
  giaNhap?: number;
  giaBan?: number;
  soLuongMin?: number;
  categoryId?: string | null;
  category?: { id?: string; name: string } | null;
  categoryName?: string;
  stocks: Stock[];
  trangThai: string;
  soLuong: number;
  brand?: string | null;
  model?: string | null;
  thongSoKyThuat?: string | null;
  ghiChu?: string | null;
}

const LIMIT = 15;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  "con-hang": { label: "Còn hàng", color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "bi-check-circle-fill" },
  "sap-het":  { label: "Sắp hết",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "bi-exclamation-triangle-fill" },
  "het-hang": { label: "Đã hết",   color: "#f43f5e", bg: "rgba(244,63,94,0.12)",   icon: "bi-x-circle-fill" },
};

export default function CSInventoryPage() {
  const toast = useToast();
  
  // State variables
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/logistics/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải danh mục");
        return res.json();
      })
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        toast.error("Lỗi tải danh mục", err.message);
      });
  }, [toast]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset back to page 1 on search
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch inventory items
  const fetchInventory = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: LIMIT.toString(),
    });
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (categoryFilter) params.append("categoryId", categoryFilter);

    fetch(`/api/logistics/inventory?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải dữ liệu tồn kho");
        return res.json();
      })
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => {
        toast.error("Lỗi tải tồn kho", err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, debouncedSearch, categoryFilter, toast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const formatVND = (value?: number) => {
    if (value === undefined || value === null) return "—";
    return value.toLocaleString("vi-VN") + " ₫";
  };

  const columns = [
    {
      header: "STT",
      width: 60,
      align: "center" as const,
      render: (_: any, idx: number) => (
        <span className="text-muted-foreground">{(page - 1) * LIMIT + idx + 1}</span>
      ),
    },
    {
      header: "Mã SKU",
      width: 150,
      render: (row: InventoryItem) => (
        <span className="font-monospace text-muted-foreground fw-medium" style={{ fontSize: 12 }}>
          {row.code || "—"}
        </span>
      ),
    },
    {
      header: "Tên hàng hoá",
      render: (row: InventoryItem) => (
        <div>
          <div className="fw-bold text-foreground" style={{ fontSize: 13.5 }}>
            {row.tenHang}
          </div>
          {row.categoryName && (
            <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 500 }}>
              {row.categoryName}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "ĐVT",
      width: 80,
      align: "center" as const,
      render: (row: InventoryItem) => (
        <span className="text-muted-foreground">{row.donVi || "—"}</span>
      ),
    },
    {
      header: "Giá bán",
      width: 150,
      align: "right" as const,
      render: (row: InventoryItem) => (
        <span className="text-success fw-bold" style={{ fontSize: 13 }}>
          {formatVND(row.giaBan)}
        </span>
      ),
    },
    {
      header: "Tổng tồn",
      width: 110,
      align: "right" as const,
      render: (row: InventoryItem) => (
        <span className="fw-extrabold text-foreground" style={{ fontSize: 14 }}>
          {row.soLuong?.toLocaleString("vi-VN") ?? 0}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      width: 130,
      align: "center" as const,
      render: (row: InventoryItem) => {
        const sc = STATUS_CFG[row.trangThai] || STATUS_CFG["con-hang"];
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 700,
              background: sc.bg,
              color: sc.color,
            }}
          >
            <i className={`bi ${sc.icon}`} style={{ fontSize: 10 }} />
            {sc.label}
          </span>
        );
      },
    },
  ];

  return (
    <StandardPage
      title="Hàng hoá trong kho thành phẩm"
      description="Tra cứu danh sách sản phẩm và chi tiết số lượng tồn kho thành phẩm trong hệ thống."
      icon="bi-boxes"
      color="indigo"
      headerActions={
        <div className="d-flex align-items-center gap-2">
          <FilterSelect
            value={categoryFilter}
            onChange={(val) => {
              setCategoryFilter(val);
              setPage(1);
            }}
            placeholder="Tất cả danh mục"
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
            width={220}
            className="border-0 shadow-sm"
          />
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm theo SKU, tên sản phẩm..."
            className="border-0 shadow-sm"
            style={{ width: 260 }}
          />
        </div>
      }
    >
      <div className="d-flex flex-column h-100 justify-content-between">
        <div className="flex-grow-1 overflow-auto">
          <Table
            rows={items}
            columns={columns}
            loading={loading}
            rowKey={(row) => row.id}
            onRowClick={(row) => {
              setSelectedItem(row);
              setIsDrawerOpen(true);
            }}
            emptyIcon="bi-boxes"
            emptyText="Không tìm thấy hàng hoá nào trong kho thành phẩm."
            compact={true}
          />
        </div>
        
        {totalPages > 1 && (
          <div className="border-top mt-2 pt-2 flex-shrink-0">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Slide-out Drawer Detail */}
      <AnimatePresence>
        {isDrawerOpen && selectedItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(4px)",
                zIndex: 1050,
              }}
            />

            {/* Content Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "min(460px, 100vw)",
                background: "var(--card)",
                boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.15)",
                borderLeft: "1px solid var(--border)",
                zIndex: 1060,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div className="p-4 border-bottom flex-shrink-0 d-flex align-items-start justify-content-between">
                <div className="d-flex align-items-start gap-3">
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <i className="bi bi-box-seam" style={{ fontSize: 20, color: "var(--primary)" }} />
                  </div>
                  <div>
                    <h5 className="m-0 fw-bold text-foreground" style={{ fontSize: 16, lineHeight: 1.3 }}>
                      {selectedItem.tenHang}
                    </h5>
                    <div className="mt-1 d-flex align-items-center gap-2 flex-wrap">
                      {selectedItem.code && (
                        <span className="font-monospace text-muted-foreground" style={{ fontSize: 11 }}>
                          {selectedItem.code}
                        </span>
                      )}
                      {selectedItem.category?.name && (
                        <span className="badge rounded-pill bg-light text-primary border" style={{ fontSize: 10 }}>
                          {selectedItem.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="btn btn-sm btn-light border d-flex align-items-center justify-content-center"
                  style={{ width: 30, height: 30, borderRadius: 8 }}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 flex-grow-1 overflow-auto d-flex flex-column gap-4">
                {/* Status Section */}
                <div>
                  <div className="text-muted-foreground text-uppercase fw-bold mb-2" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>
                    Trạng thái tồn kho
                  </div>
                  <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                    <div className="d-flex align-items-center gap-2">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: STATUS_CFG[selectedItem.trangThai]?.color || "#10b981",
                        }}
                      />
                      <span className="fw-semibold" style={{ fontSize: 13.5 }}>
                        {STATUS_CFG[selectedItem.trangThai]?.label || "Còn hàng"}
                      </span>
                    </div>
                    <div className="text-end">
                      <span className="fw-extrabold" style={{ fontSize: 18, color: "var(--primary)" }}>
                        {selectedItem.soLuong?.toLocaleString("vi-VN") ?? 0}
                      </span>
                      <span className="text-muted-foreground ms-1" style={{ fontSize: 12 }}>
                        {selectedItem.donVi || "đơn vị"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specs Section */}
                <div>
                  <div className="text-muted-foreground text-uppercase fw-bold mb-2" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>
                    Thông tin chi tiết
                  </div>
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span className="text-muted-foreground" style={{ fontSize: 12.5 }}>Đơn giá bán:</span>
                      <span className="fw-bold text-success" style={{ fontSize: 13 }}>
                        {formatVND(selectedItem.giaBan)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span className="text-muted-foreground" style={{ fontSize: 12.5 }}>Thương hiệu:</span>
                      <span className="fw-medium" style={{ fontSize: 13 }}>{selectedItem.brand || "—"}</span>
                    </div>
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span className="text-muted-foreground" style={{ fontSize: 12.5 }}>Model / Quy cách:</span>
                      <span className="fw-medium" style={{ fontSize: 13 }}>{selectedItem.model || "—"}</span>
                    </div>
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span className="text-muted-foreground" style={{ fontSize: 12.5 }}>Số lượng an toàn tối thiểu:</span>
                      <span className="fw-medium" style={{ fontSize: 13 }}>
                        {selectedItem.soLuongMin?.toLocaleString("vi-VN") ?? 0} {selectedItem.donVi}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Technical Specifications */}
                {selectedItem.thongSoKyThuat && (
                  <div>
                    <div className="text-muted-foreground text-uppercase fw-bold mb-2" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>
                      Thông số kỹ thuật
                    </div>
                    <div className="p-3 rounded-3 font-monospace bg-light border text-foreground" style={{ fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {selectedItem.thongSoKyThuat}
                    </div>
                  </div>
                )}

                {/* Warehouse breakdown */}
                <div>
                  <div className="text-muted-foreground text-uppercase fw-bold mb-2" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>
                    Phân bố chi tiết tại các kho
                  </div>
                  {selectedItem.stocks && selectedItem.stocks.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                      {selectedItem.stocks.map((st) => {
                        const totalStock = selectedItem.soLuong || 1;
                        const pct = Math.min(100, Math.max(0, (st.soLuong / totalStock) * 100));
                        const isSafetyViolated = st.soLuongMin > 0 && st.soLuong <= st.soLuongMin;
                        const barColor = st.soLuong === 0 ? "var(--rose)" : isSafetyViolated ? "var(--amber)" : "var(--primary)";
                        const viTri = [
                          st.viTriHang && `H${st.viTriHang}`,
                          st.viTriCot && `C${st.viTriCot}`,
                          st.viTriTang && `T${st.viTriTang}`
                        ].filter(Boolean).join("-");

                        return (
                          <div
                            key={st.id}
                            className="p-3 rounded-3 border bg-card d-flex flex-column gap-2"
                            style={{ transition: "box-shadow 0.2s" }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-2">
                                <i className="bi bi-building text-muted-foreground" style={{ fontSize: 13 }} />
                                <span className="fw-bold text-foreground" style={{ fontSize: 13 }}>
                                  {st.warehouse.name}
                                </span>
                                {st.warehouse.code && (
                                  <span className="badge bg-secondary text-white font-monospace" style={{ fontSize: 9.5 }}>
                                    {st.warehouse.code}
                                  </span>
                                )}
                              </div>
                              <span className="fw-extrabold text-foreground" style={{ fontSize: 13.5 }}>
                                {st.soLuong.toLocaleString("vi-VN")} <span className="fw-normal text-muted-foreground" style={{ fontSize: 11 }}>{selectedItem.donVi}</span>
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="progress" style={{ height: 5, background: "color-mix(in srgb, var(--border) 40%, transparent)" }}>
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: barColor,
                                  borderRadius: 5,
                                }}
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              />
                            </div>

                            <div className="d-flex justify-content-between align-items-center" style={{ fontSize: 11 }}>
                              <span className="text-muted-foreground">
                                {viTri ? `📍 Vị trí: ${viTri}` : "📍 Vị trí: Chưa xác định"}
                              </span>
                              <span className="text-muted-foreground">
                                Tỷ lệ: {pct.toFixed(0)}%
                              </span>
                            </div>

                            {isSafetyViolated && st.soLuong > 0 && (
                              <div className="d-flex align-items-center gap-1 mt-1 text-warning" style={{ fontSize: 11 }}>
                                <i className="bi bi-exclamation-triangle-fill" />
                                <span>Sắp chạm hạn mức tối thiểu ({st.soLuongMin.toLocaleString("vi-VN")} {selectedItem.donVi})</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center rounded-3 bg-light border text-muted-foreground">
                      <i className="bi bi-building-slash d-block mb-2 text-muted-foreground" style={{ fontSize: 24, opacity: 0.5 }} />
                      <span style={{ fontSize: 12.5 }}>Chưa được phân bổ vào kho thành phẩm nào.</span>
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                {selectedItem.ghiChu && (
                  <div>
                    <div className="text-muted-foreground text-uppercase fw-bold mb-2" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>
                      Ghi chú
                    </div>
                    <div className="p-3 rounded-3 bg-light border text-muted-foreground" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                      {selectedItem.ghiChu}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </StandardPage>
  );
}
