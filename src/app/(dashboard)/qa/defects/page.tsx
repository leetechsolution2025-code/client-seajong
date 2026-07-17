"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import Link from "next/link";

export default function QaDefectsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");

  const defects = [
    { id: "NCR-20260716-45", ref: "QC-20260716-104", product: "Sen cây truyền thống", description: "Trầy xước bề mặt mạ (x2 SP)", severity: "Medium", status: "WAITING_ACTION", dept: "Sản xuất" },
    { id: "NCR-20260715-44", ref: "QC-20260715-089", product: "Dây cấp nước Inox 304", description: "Chiều dài hụt 2cm so với chuẩn", severity: "High", status: "IN_PROGRESS", dept: "Thu mua" },
    { id: "NCR-20260715-43", ref: "QC-20260715-087", product: "Củ sen nóng lạnh", description: "Lắp ráp sai vị trí gioăng cao su", severity: "Medium", status: "RESOLVED", dept: "Sản xuất" },
    { id: "NCR-20260714-42", ref: "QC-20260714-055", product: "Lõi đồng van chia nước", description: "Bị oxi hoá nhẹ bề mặt", severity: "Low", status: "CLOSED", dept: "Kho vật tư" },
  ];

  const filteredDefects = statusFilter === "ALL" 
    ? defects 
    : defects.filter(d => d.status === statusFilter);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "WAITING_ACTION": return <span className="badge bg-warning bg-opacity-10 text-warning px-2 py-1 rounded-pill">Chờ xử lý</span>;
      case "IN_PROGRESS": return <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-pill">Đang khắc phục</span>;
      case "RESOLVED": return <span className="badge bg-success bg-opacity-10 text-success px-2 py-1 rounded-pill">Đã khắc phục</span>;
      case "CLOSED": return <span className="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1 rounded-pill">Đã đóng</span>;
      default: return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch(severity) {
      case "High": return <span className="badge bg-danger text-white px-2 py-1 rounded-pill" style={{ fontSize: '10px' }}>Nghiêm trọng</span>;
      case "Medium": return <span className="badge bg-warning text-dark px-2 py-1 rounded-pill" style={{ fontSize: '10px' }}>Trung bình</span>;
      case "Low": return <span className="badge bg-info text-dark px-2 py-1 rounded-pill" style={{ fontSize: '10px' }}>Nhẹ</span>;
      default: return null;
    }
  };

  return (
    <StandardPage
      title="Lỗi & Báo cáo không phù hợp (NCR)"
      description="Quản lý và theo dõi tiến độ khắc phục các sản phẩm, vật tư không đạt tiêu chuẩn"
      color="red"
      icon="bi-bug"
    >
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <SectionTitle title="Danh sách Sự cố / NCR" icon="bi-exclamation-triangle" />
        
        <div className="d-flex flex-column flex-sm-row gap-2">
          <select 
            className="form-select form-select-sm shadow-none bg-light" 
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="WAITING_ACTION">Chờ xử lý</option>
            <option value="IN_PROGRESS">Đang khắc phục</option>
            <option value="RESOLVED">Đã khắc phục</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light text-muted small">
            <tr>
              <th className="fw-medium border-0 rounded-start">Mã NCR</th>
              <th className="fw-medium border-0">Phiếu QC gốc</th>
              <th className="fw-medium border-0">Sản phẩm lỗi</th>
              <th className="fw-medium border-0">Mô tả chi tiết</th>
              <th className="fw-medium border-0 text-center">Mức độ</th>
              <th className="fw-medium border-0">Bộ phận xử lý</th>
              <th className="fw-medium border-0 text-center">Trạng thái</th>
              <th className="fw-medium border-0 rounded-end text-end">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredDefects.map(defect => (
              <tr key={defect.id}>
                <td><span className="fw-bold text-danger small">{defect.id}</span></td>
                <td><span className="text-primary small text-decoration-underline" style={{ cursor: "pointer" }}>{defect.ref}</span></td>
                <td className="fw-medium text-dark small">{defect.product}</td>
                <td className="text-muted small" style={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {defect.description}
                </td>
                <td className="text-center">{getSeverityBadge(defect.severity)}</td>
                <td><span className="text-muted small"><i className="bi bi-building me-1"></i> {defect.dept}</span></td>
                <td className="text-center">{getStatusBadge(defect.status)}</td>
                <td className="text-end">
                  <div className="btn-group">
                    <Link href="/production/defects" className="btn btn-sm btn-light text-primary shadow-none border" title="Xem tiến độ bên Sản xuất">
                      <i className="bi bi-box-arrow-up-right"></i>
                    </Link>
                    <button className="btn btn-sm btn-light text-danger shadow-none border ms-1" title="Tạo Hành động Khắc phục (CAPA)">
                      <i className="bi bi-tools"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StandardPage>
  );
}
