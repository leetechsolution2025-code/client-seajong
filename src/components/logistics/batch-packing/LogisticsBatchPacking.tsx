"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";


interface BatchItem {
  id: string;
  tenHang: string;
  inventoryItemId: string | null;
  imageUrl: string | null;
  images?: string[];
  viTriKho: string | null;
  tongSoLuong: number;
  orders: {
    id: string;
    code: string;
    soLuongTrongDon: number;
  }[];
}

export function LogisticsBatchPacking() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logistics/batch-packing");
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setTotalOrders(data.totalOrders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePick = (id: string, maxQuantity: number) => {
    setPickedQuantities(prev => {
      const next = { ...prev };
      if (next[id] === maxQuantity) {
        delete next[id];
      } else {
        next[id] = maxQuantity;
      }
      return next;
    });
  };

  const handleQuantityChange = (id: string, val: string, maxQuantity: number) => {
    if (val === "") {
      setPickedQuantities(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setPickedQuantities(prev => ({
        ...prev,
        [id]: Math.max(0, Math.min(num, maxQuantity))
      }));
    }
  };

  const handleComplete = async () => {
    const pickedCount = Object.keys(pickedQuantities).length;
    if (pickedCount === 0) {
      alert("Vui lòng nhập số lượng cho ít nhất 1 mặt hàng đã gom xong.");
      return;
    }
    const confirm = window.confirm(`Bạn có chắc chắn đã hoàn tất gom ${pickedCount} mặt hàng này?`);
    if (!confirm) return;

    try {
      const res = await fetch("/api/logistics/batch-packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_picking" })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        // Refresh
        setPickedQuantities({});
        fetchData();
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (e) {
      alert("Có lỗi xảy ra");
    }
  };

  const filteredItems = items.filter(item => 
    item.tenHang.toLowerCase().includes(search.toLowerCase()) || 
    (item.inventoryItemId && item.inventoryItemId.toLowerCase().includes(search.toLowerCase()))
  );

  const pickedCount = Object.keys(pickedQuantities).length;
  const progress = items.length === 0 ? 0 : Math.round((pickedCount / items.length) * 100);

  const headerContent = (
    <div className="d-flex align-items-center gap-4">
        <div className="flex-grow-1" style={{ maxWidth: 300 }}>
          <div className="position-relative">
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
            <input 
              type="text" 
              className="form-control bg-light border-0 ps-5" 
              placeholder="Tìm tên hàng hoá..."
              style={{ borderRadius: 10, fontSize: 13.5 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-grow-1">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>Tiến độ nhặt hàng</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? "#10b981" : "#3b82f6" }}>{progress}%</span>
          </div>
          <div className="progress" style={{ height: 8, borderRadius: 4, background: "rgba(0,0,0,0.05)" }}>
            <div 
              className={`progress-bar ${progress === 100 ? "bg-success" : "bg-primary"}`} 
              style={{ width: `${progress}%`, transition: "width 0.3s ease" }} 
            />
          </div>
        </div>
      </div>
  );

  const tableContent = (
    <div className="h-100 overflow-auto custom-scrollbar">
      {loading ? (
        <div className="d-flex justify-content-center align-items-center h-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center p-5 mt-5">
          <i className="bi bi-check2-all text-success fs-1 mb-3 d-block" />
          <h5 className="fw-bold">Tuyệt vời!</h5>
          <p className="text-muted">Tất cả các lệnh xuất kho hiện tại đã được gom xong.</p>
        </div>
      ) : (
        <table className="table table-hover align-middle mb-0 bg-white" style={{ fontSize: 13.5 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--background)" }}>
            <tr>
              <th rowSpan={2} style={{ width: 60, borderBottomWidth: 1, fontSize: 11, letterSpacing: 0.5 }} className="text-center border-0 text-secondary text-uppercase fw-semibold py-3 align-middle">
                <i className="bi bi-check-all fs-6" />
              </th>
              <th rowSpan={2} style={{ borderBottomWidth: 1, fontSize: 11, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold py-3 align-middle">Mặt hàng</th>
              <th colSpan={2} style={{ borderBottomWidth: 1, fontSize: 11, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold text-center py-2 border-bottom">SỐ LƯỢNG</th>
              <th rowSpan={2} style={{ width: 300, borderBottomWidth: 1, fontSize: 11, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold py-3 align-middle">Chi tiết theo đơn</th>
              <th rowSpan={2} style={{ width: 120, borderBottomWidth: 1, fontSize: 11, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold text-end py-3 align-middle">Trạng thái</th>
            </tr>
            <tr>
              <th style={{ width: 90, borderBottomWidth: 1, fontSize: 10, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold text-center py-2">Yêu cầu</th>
              <th style={{ width: 90, borderBottomWidth: 1, fontSize: 10, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold text-center py-2">Đã nhặt</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const pickedQty = pickedQuantities[item.id];
              const isPicked = pickedQty !== undefined;
              const isFullyPicked = pickedQty === item.tongSoLuong;
              
              return (
                <tr key={item.id} style={{ transition: "all 0.2s" }} className={isFullyPicked ? "bg-success bg-opacity-10" : isPicked ? "bg-warning bg-opacity-10" : "bg-white"}>
                  <td className="text-center py-3" style={{ borderBottomColor: "rgba(0,0,0,0.05)", cursor: "pointer" }} onClick={() => handleTogglePick(item.id, item.tongSoLuong)}>
                    <div 
                      className={`d-inline-flex align-items-center justify-content-center rounded-circle border ${isFullyPicked ? "bg-success border-success text-white" : isPicked ? "bg-warning border-warning text-white" : "border-secondary text-transparent"}`}
                      style={{ width: 24, height: 24, transition: "all 0.2s" }}
                    >
                      <i className="bi bi-check" style={{ fontSize: 16 }} />
                    </div>
                  </td>
                  <td className="py-3" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)" }}>
                        {(item.imageUrl || (item.images && item.images.length > 0)) ? (
                          <img src={item.imageUrl || (item.images && item.images[0])} alt={item.tenHang} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <i className="bi bi-box-seam text-muted" />
                        )}
                      </div>
                      <div>
                        <div className={`fw-bold ${isFullyPicked ? "text-success" : isPicked ? "text-warning" : "text-dark"}`}>{item.tenHang}</div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {item.inventoryItemId && (
                            <div className="text-muted" style={{ fontSize: 12, fontFamily: "monospace" }}>{item.inventoryItemId}</div>
                          )}
                          {item.viTriKho ? (
                            <span className="badge bg-light text-primary border border-primary border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}>
                              <i className="bi bi-geo-alt me-1"></i>
                              {item.viTriKho}
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border border-secondary border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}>
                              <i className="bi bi-geo-alt-fill me-1 text-black-50"></i>
                              Không có thông tin vị trí
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-3" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                    <span className="fw-semibold text-dark fs-6">{item.tongSoLuong}</span>
                  </td>
                  <td className="text-center py-3" style={{ borderBottomColor: "rgba(0,0,0,0.05)", width: 100 }}>
                    <input 
                      type="number"
                      className={`form-control form-control-sm text-center fw-bold ${isFullyPicked ? "text-success border-success" : isPicked ? "text-warning border-warning" : "text-muted"}`}
                      value={pickedQty !== undefined ? pickedQty : ""}
                      onChange={e => handleQuantityChange(item.id, e.target.value, item.tongSoLuong)}
                      style={{ width: 70, margin: "0 auto" }}
                      min={0}
                      max={item.tongSoLuong}
                    />
                  </td>
                  <td className="py-3" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                    <div className="d-flex flex-wrap gap-1">
                      {item.orders.map((o, idx) => (
                        <span key={idx} className="badge bg-light text-dark border" style={{ fontSize: 11, fontWeight: 500 }}>
                          {o.code}: {o.soLuongTrongDon}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-end py-3" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                    {isFullyPicked ? (
                      <span className="text-success fw-bold"><i className="bi bi-check-circle-fill me-1" /> Đủ hàng</span>
                    ) : isPicked ? (
                      <span className="text-warning fw-bold"><i className="bi bi-exclamation-triangle-fill me-1" /> Thiếu hàng</span>
                    ) : (
                      <span className="text-muted"><i className="bi bi-circle me-1" /> Chờ nhặt</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <FullWidthTableLayout 
      header={headerContent}
      table={tableContent}
    />
  );
}
