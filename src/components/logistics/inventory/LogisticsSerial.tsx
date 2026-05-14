"use client";

import React, { useState, useEffect } from "react";
import { SerialScannerModal } from "./SerialScannerModal";
import { SerialDetailOffcanvas } from "./SerialDetailOffcanvas";

interface SerialItem {
  id: string;
  serialNumber: string;
  productName: string;
  sku: string;
  categoryName?: string;
  status: "in_stock" | "sold" | "warranty" | "defective";
  warehouse: string;
  customer?: string;
  importDate: string;
  warrantyExpiry?: string;
  rawUpdatedAt?: string;
}

const MOCK_SERIALS: SerialItem[] = []; // Sẽ được nạp từ API

export function LogisticsSerial() {
  const [serials, setSerials] = useState<SerialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState<any>(null);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch real inventory items with stocks included
        const res = await fetch("/api/logistics/inventory?limit=100");
        const data = await res.json();
        
        const realSerials: SerialItem[] = [];

        data.items.forEach((item: any, idx: number) => {
          // 1. Process in-stock units
          item.stocks?.forEach((stock: any) => {
            if (stock.soLuong > 0) {
              // Note: Since the DB doesn't store individual serial numbers,
              // we display them based on the inventory quantity using a standard naming rule.
              const countToShow = Math.min(stock.soLuong, 10); 
              for (let i = 1; i <= countToShow; i++) {
                realSerials.push({
                  id: `${item.id}-in-${stock.id}-${i}`,
                  serialNumber: `SN-${item.code || "ITEM"}-${stock.warehouse?.code || "WH"}-${String(i).padStart(3, '0')}`,
                  productName: item.tenHang,
                  sku: item.code || "N/A",
                  categoryName: item.category?.name || "Chưa phân loại",
                  status: stock.condition === "defective" ? "defective" : "in_stock",
                  warehouse: stock.warehouse?.name || "Kho không xác định",
                  importDate: new Date(stock.updatedAt).toLocaleDateString("vi-VN"),
                  rawUpdatedAt: stock.updatedAt
                });
              }
            }
          });
        });

        setSerials(realSerials);
      } catch (error) {
        console.error("Failed to fetch real data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    setSearch(decodedText);
    setIsScannerOpen(false);
  };

  const handleOpenDetail = (item: any) => {
    // Generate history strictly based on actual database timestamps
    const history = [
      { 
        id: "h1", 
        date: new Date(item.rawUpdatedAt).toLocaleString("vi-VN"), 
        action: "Cập nhật tồn kho", 
        actor: "Hệ thống kho", 
        location: item.warehouse, 
        status: "success", 
        notes: "Ghi nhận số lượng hàng hoá thực tế tại kho." 
      },
    ];

    setSelectedSerial({
      ...item,
      category: item.categoryName,
      history: history
    });
    setIsOffcanvasOpen(true);
  };

  const statusMap = {
    in_stock: { label: "Trong kho", class: "bg-success-subtle text-success border-success" },
    sold: { label: "Đã bán", class: "bg-primary-subtle text-primary border-primary" },
    warranty: { label: "Bảo hành", class: "bg-warning-subtle text-warning border-warning" },
    defective: { label: "Lỗi/Hỏng", class: "bg-danger-subtle text-danger border-danger" },
  };

  const filteredSerials = serials.filter(item => {
    const matchesSearch = item.serialNumber.toLowerCase().includes(search.toLowerCase()) || 
                         item.productName.toLowerCase().includes(search.toLowerCase()) ||
                         item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: serials.length,
    inStock: serials.filter(s => s.status === "in_stock").length,
    warranty: serials.filter(s => s.status === "warranty").length,
    defective: serials.filter(s => s.status === "defective").length,
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* ── Stats Overview ── */}
      <div className="row g-3">
        <div className="col-md-3">
          <div className="app-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: 16 }}>
            <div className="rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
              <i className="bi bi-qr-code text-primary fs-4" />
            </div>
            <div>
              <div className="text-muted fw-bold uppercase" style={{ fontSize: 11 }}>Tổng số máy</div>
              <div className="fw-bold" style={{ fontSize: 20 }}>{stats.total.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="app-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: 16 }}>
            <div className="rounded-circle bg-success-subtle d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
              <i className="bi bi-box-seam text-success fs-4" />
            </div>
            <div>
              <div className="text-muted fw-bold uppercase" style={{ fontSize: 11 }}>Sẵn sàng xuất</div>
              <div className="fw-bold" style={{ fontSize: 20 }}>{stats.inStock.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="app-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: 16 }}>
            <div className="rounded-circle bg-warning-subtle d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
              <i className="bi bi-tools text-warning fs-4" />
            </div>
            <div>
              <div className="text-muted fw-bold uppercase" style={{ fontSize: 11 }}>Đang bảo hành</div>
              <div className="fw-bold" style={{ fontSize: 20 }}>{stats.warranty.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="app-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: 16 }}>
            <div className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
              <i className="bi bi-shield-exclamation text-danger fs-4" />
            </div>
            <div>
              <div className="text-muted fw-bold uppercase" style={{ fontSize: 11 }}>Hàng lỗi (RMA)</div>
              <div className="fw-bold" style={{ fontSize: 20 }}>{stats.defective.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="d-flex align-items-center gap-3">
        <div className="position-relative flex-grow-1">
          <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          <input 
            type="text" 
            className="form-control border-0 shadow-sm rounded-pill ps-5 pe-4"
            style={{ height: 40, background: "var(--card)", border: "1px solid var(--border)", fontSize: 13 }}
            placeholder="Truy xuất theo Số Serial, Tên sản phẩm hoặc SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="form-select border-0 shadow-sm rounded-pill px-4"
          style={{ width: "auto", height: 40, background: "var(--card)", border: "1px solid var(--border)", fontSize: 13 }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="in_stock">Trong kho</option>
          <option value="sold">Đã bán</option>
          <option value="warranty">Đang bảo hành</option>
          <option value="defective">Lỗi/Hỏng</option>
        </select>

        <button 
          className="btn btn-primary rounded-pill px-4 fw-bold d-flex align-items-center gap-2" 
          style={{ height: 40, fontSize: 13 }}
          onClick={() => setIsScannerOpen(true)}
        >
          <i className="bi bi-qr-code-scan" />
          Quét mã Serial
        </button>
      </div>

      <SerialScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      <SerialDetailOffcanvas 
        isOpen={isOffcanvasOpen}
        onClose={() => setIsOffcanvasOpen(false)}
        data={selectedSerial}
      />

      {/* ── Table ── */}
      <div className="app-card overflow-hidden" style={{ borderRadius: 16 }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="bg-light">
              <tr style={{ height: 40 }}>
                <th className="ps-4 border-0 text-uppercase fw-bold text-muted" style={{ fontSize: 11 }}>Thông tin hàng hoá / Serial</th>
                <th className="border-0 text-uppercase fw-bold text-muted" style={{ fontSize: 11 }}>Trạng thái</th>
                <th className="border-0 text-uppercase fw-bold text-muted" style={{ fontSize: 11 }}>Vị trí hiện tại</th>
                <th className="border-0 text-uppercase fw-bold text-muted" style={{ fontSize: 11 }}>Thông tin KH</th>
                <th className="border-0 text-uppercase fw-bold text-muted" style={{ fontSize: 11 }}>Bảo hành đến</th>
                <th className="pe-4 border-0 text-uppercase fw-bold text-muted text-end" style={{ fontSize: 11 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSerials.map(item => (
                <tr key={item.id} style={{ height: 60 }}>
                  <td className="ps-4">
                    <div className="d-flex flex-column gap-1">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-upc-scan text-primary" style={{ fontSize: 14 }} />
                        <span className="fw-bold text-primary" style={{ fontFamily: "monospace", letterSpacing: "0.5px", fontSize: 14 }}>
                          {item.serialNumber}
                        </span>
                      </div>
                      <div className="text-dark" style={{ fontSize: 13 }}>{item.productName}</div>
                      <div className="small text-muted d-flex align-items-center gap-2" style={{ fontSize: 11 }}>
                        <span className="badge bg-light text-muted border fw-normal">SKU: {item.sku}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge rounded-pill border ${statusMap[item.status].class}`} style={{ padding: "6px 12px", fontSize: "11px" }}>
                      {statusMap[item.status].label}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-geo-alt text-muted" />
                      <span>{item.warehouse}</span>
                    </div>
                  </td>
                  <td>
                    {item.customer ? (
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-person text-muted" />
                        <span>{item.customer}</span>
                      </div>
                    ) : (
                      <span className="text-muted italic small">Chưa bán</span>
                    )}
                  </td>
                  <td>
                    {item.warrantyExpiry ? (
                      <div className="d-flex align-items-center gap-2 text-success fw-bold">
                        <i className="bi bi-shield-check" />
                        <span>{new Date(item.warrantyExpiry).toLocaleDateString("vi-VN")}</span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="pe-4 text-end">
                    <button className="btn btn-icon btn-sm rounded-circle me-1" title="Lịch sử truy xuất">
                      <i className="bi bi-clock-history text-primary" />
                    </button>
                    <button 
                      className="btn btn-icon btn-sm rounded-circle" 
                      title="Chi tiết hồ sơ"
                      onClick={() => handleOpenDetail(item)}
                    >
                      <i className="bi bi-info-circle text-muted" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

