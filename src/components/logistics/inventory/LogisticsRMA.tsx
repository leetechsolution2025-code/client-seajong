"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface RMAItem {
  id: string;
  tenHang: string;
  code: string | null;
  model: string | null;
  color: string | null;
  soLuongLoi: number;
  warehouse: string;
  reason: string;
  status: "pending" | "repairing" | "disposed" | "returned";
  updatedAt: string;
}

export function LogisticsRMA() {
  const toast = useToast();
  const [items, setItems] = useState<RMAItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for now, will connect to API later
  useEffect(() => {
    setTimeout(() => {
      setItems([
        { id: "1", tenHang: "Bồn cầu thông minh Seajong", code: "SJ-BC-0139-SR", model: "0139", color: "SR", soLuongLoi: 2, warehouse: "Kho hàng lỗi (HN)", reason: "Bể vỡ khi vận chuyển", status: "pending", updatedAt: "2024-04-28 10:00" },
        { id: "2", tenHang: "Vòi sen nóng lạnh", code: "SJ-VS-2201-GR", model: "2201", color: "GR", soLuongLoi: 5, warehouse: "Kho hàng lỗi (HCM)", reason: "Rò rỉ nước (Lỗi NSX)", status: "repairing", updatedAt: "2024-04-27 15:30" },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const getStatusBadge = (status: string) => {
    const configs: any = {
      pending: { label: "Chờ xử lý", class: "bg-danger-subtle text-danger" },
      repairing: { label: "Đang sửa chữa", class: "bg-warning-subtle text-warning" },
      disposed: { label: "Đã thanh lý", class: "bg-secondary-subtle text-secondary" },
      returned: { label: "Đã trả NCC", class: "bg-success-subtle text-success" },
    };
    const c = configs[status] || configs.pending;
    return <span className={`badge ${c.class} rounded-pill border border-opacity-10`}>{c.label}</span>;
  };

  return (
    <div className="d-flex flex-column gap-3">
      <div className="row g-2 mb-2">
        <div className="col-md-3">
          <div className="app-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: 12 }}>
            <div className="bg-danger-subtle text-danger rounded-3 p-2">
              <i className="bi bi-exclamation-octagon fs-4" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>CHỜ XỬ LÝ</div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>12 kiện</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="app-card p-3 d-flex align-items-center gap-3" style={{ borderRadius: 12 }}>
            <div className="bg-warning-subtle text-warning rounded-3 p-2">
              <i className="bi bi-tools fs-4" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>ĐANG SỬA CHỮA</div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>05 kiện</div>
            </div>
          </div>
        </div>
      </div>

      <div className="app-card overflow-hidden" style={{ borderRadius: 16 }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="bg-light">
              <tr>
                <th className="ps-4 border-0 text-muted text-uppercase" style={{ fontSize: 11, fontWeight: 700 }}>Sản phẩm lỗi</th>
                <th className="border-0 text-muted text-uppercase" style={{ fontSize: 11, fontWeight: 700 }}>Lý do / Kho</th>
                <th className="border-0 text-muted text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700 }}>Số lượng</th>
                <th className="border-0 text-muted text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700 }}>Trạng thái</th>
                <th className="border-0 text-muted text-uppercase text-end" style={{ fontSize: 11, fontWeight: 700 }}>Cập nhật</th>
                <th className="pe-4 border-0 text-muted text-uppercase text-end" style={{ fontSize: 11, fontWeight: 700 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-5">Đang tải...</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td className="ps-4">
                    <div className="fw-bold">{item.tenHang}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{item.code}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{item.reason}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{item.warehouse}</div>
                  </td>
                  <td className="text-center fw-bold text-danger">{item.soLuongLoi}</td>
                  <td className="text-center">{getStatusBadge(item.status)}</td>
                  <td className="text-end text-muted" style={{ fontSize: 11 }}>{item.updatedAt}</td>
                  <td className="pe-4 text-end">
                     <button className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" style={{ fontSize: 11 }}>Xử lý</button>
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
