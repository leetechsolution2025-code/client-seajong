"use client";

import React, { useState, useEffect } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table } from "@/components/ui/Table";
import { motion, AnimatePresence } from "framer-motion";

import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";

import { FilterBadgeGroup } from "@/components/ui/FilterBadge";

export interface ForecastItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stockReal: number;
  stockInbound: number;
  stockReserved: number;
  rop: number;
  maxStock: number;
  suggestedQty: number;
  priority: string;
  reason: string;
  supplier: string;
  category: string;
  leadTime: number;
  dailyDemand: number;
}

export default function DemandForecast() {
  const [selectedItem, setSelectedItem] = useState<ForecastItem | null>(null);
  const [data, setData] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales/procurement/forecast");
      const json = await res.json();
      if (Array.isArray(json)) {
        setData(json);
      }
    } catch (err) {
      console.error("Fetch forecast failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => {
    const matchesCategory = filterCategory === "" || item.category === filterCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "" || item.priority === filterPriority;
    return matchesCategory && matchesSearch && matchesPriority;
  });

  const categoryOptions = Array.from(new Set(data.map(item => item.category)))
    .filter(Boolean)
    .map(c => ({ label: c, value: c }));

  const highCount = data.filter(d => d.priority === "high").length;
  const mediumCount = data.filter(d => d.priority === "medium").length;

  return (
    <div className="d-flex flex-column h-100 overflow-hidden">
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
      `}</style>
      
      <SectionTitle title="Danh sách hàng hoá" icon="bi-table" className="mb-3 px-1" />

      <div className="d-flex align-items-center justify-content-between mb-3 gap-3">
        <div className="d-flex gap-3 align-items-center flex-grow-1">
          <div className="d-flex gap-2 align-items-center" style={{ maxWidth: 600 }}>
            <FilterSelect 
              options={categoryOptions}
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="Tất cả loại hàng"
              width={200}
            />
            <SearchInput 
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm SKU, tên sản phẩm..."
            />
          </div>

          <div className="border-start ps-3">
            <FilterBadgeGroup 
              value={filterPriority}
              onChange={setFilterPriority}
              options={[
                { value: "", label: "Tất cả", count: data.length },
                { value: "medium", label: "Cần mua", count: mediumCount, activeColor: "#0d6efd" },
                { value: "high", label: "Khẩn cấp", count: highCount, activeColor: "#dc3545" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto border-top">
        <Table 
          loading={loading}
          stickyHeader={true}
          compact={true}
          columns={[
            { header: "Sản phẩm", render: (p) => (
              <div className="d-flex align-items-center gap-3 cursor-pointer" onClick={() => setSelectedItem(p)}>
                <div className="rounded bg-light p-2 text-primary">
                  <i className="bi bi-box" style={{ fontSize: 20 }} />
                </div>
                <div>
                  <div className="fw-bold text-dark">{p.sku}</div>
                  <div className="small text-muted text-truncate" style={{ maxWidth: 200 }}>{p.name}</div>
                </div>
              </div>
            )},
            { header: "Tồn sẵn dụng (Available)", render: (p) => {
              const available = p.stockReal + p.stockInbound - p.stockReserved;
              const isLow = available <= p.rop;
              return (
                <div style={{ minWidth: 180 }}>
                  <div className="d-flex justify-content-between mb-1 small">
                    <span className={`fw-bold ${isLow ? 'text-danger' : 'text-success'}`}>
                      {available} {p.unit}
                    </span>
                    <span className="text-muted">ROP: {p.rop}</span>
                  </div>
                  <div className="progress" style={{ height: 6, borderRadius: 3 }}>
                    <div 
                      className="progress-bar bg-danger bg-opacity-50" 
                      style={{ width: `${(p.stockReserved / p.maxStock) * 100}%` }}
                    />
                    <div 
                      className="progress-bar bg-primary" 
                      style={{ width: `${((p.stockReal - p.stockReserved) / p.maxStock) * 100}%` }}
                    />
                    <div 
                      className="progress-bar bg-success bg-opacity-30" 
                      style={{ width: `${(p.stockInbound / p.maxStock) * 100}%` }}
                    />
                  </div>
                  <div className="d-flex gap-2 mt-1" style={{ fontSize: 9 }}>
                    <span className="d-flex align-items-center gap-1"><span className="rounded-circle bg-danger bg-opacity-50" style={{ width: 6, height: 6 }} /> Đã giữ</span>
                    <span className="d-flex align-items-center gap-1"><span className="rounded-circle bg-primary" style={{ width: 6, height: 6 }} /> Trên kệ</span>
                    <span className="d-flex align-items-center gap-1"><span className="rounded-circle bg-success bg-opacity-30" style={{ width: 6, height: 6 }} /> Đang về</span>
                  </div>
                </div>
              );
            }},
            { header: "Đề xuất mua", render: (p) => (
              p.suggestedQty > 0 ? (
                <div>
                  <div className="fw-bold text-primary">+{p.suggestedQty} {p.unit}</div>
                  <div className="small-xs text-muted">Để đạt Max: {p.maxStock}</div>
                </div>
              ) : (
                <span className="badge bg-light text-muted">Chưa cần nhập</span>
              )
            )},
            { header: "Lý do & Ưu tiên", render: (p) => (
              <div>
                <div className="small text-dark mb-1 d-flex align-items-center gap-1">
                  <i className="bi bi-info-circle text-info" style={{ fontSize: 12 }} /> {p.reason}
                </div>
                <span className={`badge rounded-pill ${
                  p.priority === 'high' ? 'bg-danger-subtle text-danger border border-danger-subtle' : 
                  p.priority === 'medium' ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' : 
                  'bg-success-subtle text-success border border-success-subtle'
                }`}>
                  {p.priority === 'high' ? 'Khẩn cấp' : p.priority === 'medium' ? 'Cần nhập' : 'Theo dõi'}
                </span>
              </div>
            )},
            { header: "", render: (p) => (
              <div className="d-flex gap-1 justify-content-end">
                <button className="btn btn-sm btn-light border" title="Xem phân tích ROP" onClick={() => setSelectedItem(p)}>
                  <i className="bi bi-graph-up text-muted" style={{ fontSize: 14 }} />
                </button>
                <button className="btn btn-sm btn-primary shadow-sm" disabled={p.suggestedQty === 0}>
                  <i className="bi bi-plus-circle" style={{ fontSize: 14 }} />
                </button>
              </div>
            )}
          ]}
          rows={filteredData}
        />
      </div>

      {/* Tầng 3: Phân tích ROP (Offcanvas/Drawer) */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-25"
              style={{ zIndex: 1050 }}
              onClick={() => setSelectedItem(null)}
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="position-fixed top-0 end-0 h-100 bg-white shadow-lg border-start overflow-auto"
              style={{ width: 400, zIndex: 1051 }}
            >
              <div className="p-4" style={{ fontSize: 13 }}>
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <div>
                    <span className="badge bg-primary-subtle text-primary mb-2">Phân tích ROP & Nhu cầu</span>
                    <h5 className="fw-bold mb-1">{selectedItem.sku}</h5>
                    <p className="text-muted small mb-0">{selectedItem.name}</p>
                  </div>
                  <button className="btn-close" onClick={() => setSelectedItem(null)} />
                </div>

                <div className="alert alert-info border-0 bg-info bg-opacity-10 small mb-4">
                  <div className="fw-bold d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-graph-up" style={{ fontSize: 14 }} /> Thuật toán dự báo:
                  </div>
                  "Dựa trên dữ liệu bán hàng 90 ngày qua, sản phẩm này có mức tiêu thụ ổn định. Tuy nhiên, thời gian vận chuyển từ {selectedItem.supplier} đang có biến động."
                </div>

                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-file-earmark-text text-muted" style={{ fontSize: 16 }} /> Chi tiết công thức ROP
                </h6>

                <div className="bg-light rounded p-3 mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Nhu cầu TB (D)</span>
                    <span className="fw-bold">{selectedItem.dailyDemand} {selectedItem.unit}/ngày</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 align-items-center">
                    <span className="text-muted">Lead-time nhập (LT)</span>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold text-warning">{selectedItem.leadTime} ngày</span>
                      <button className="btn btn-link p-0 text-decoration-none" title="Chỉnh sửa Lead-time cho nhà cung cấp này">
                        <i className="bi bi-pencil-square text-primary" />
                      </button>
                    </div>
                  </div>
                  <div className="small-xs text-muted mb-2">* Áp dụng cho nhà cung cấp: {selectedItem.supplier}</div>
                  <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                    <span className="text-muted">Tồn kho an toàn (SS)</span>
                    <span className="fw-bold">5 {selectedItem.unit}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 fw-bold text-primary h6 mb-0">
                    <span>Điểm đặt hàng (ROP)</span>
                    <span>15.5 {selectedItem.unit}</span>
                  </div>
                  <div className="small-xs text-muted mt-2 font-italic text-end">
                    * Công thức: (D x LT) + SS
                  </div>
                </div>

                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-truck text-muted" style={{ fontSize: 16 }} /> Tối ưu Logistics
                </h6>
                <div className="card border-dashed p-3 mb-4 text-center">
                  <div className="small text-muted mb-1">Đề xuất mua thêm để tối ưu chuyến xe:</div>
                  <div className="h5 fw-bold text-success">+5 {selectedItem.unit}</div>
                  <div className="small-xs text-muted">Giúp lấp đầy xe tải 5 tấn (Tiết kiệm 12% phí ship)</div>
                </div>

                <div className="d-grid gap-2 mt-5">
                  <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 py-2">
                    Tạo đơn mua hàng ngay <i className="bi bi-arrow-right" />
                  </button>
                  <button className="btn btn-light border py-2">
                    Xem lịch sử biến động tồn kho
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
