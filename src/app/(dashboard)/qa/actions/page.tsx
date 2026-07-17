"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { SectionTitle } from "@/components/ui/SectionTitle";

export default function QaActionsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");

  const actions = [
    { id: "CAPA-202607-01", ncrRef: "NCR-20260715-43", rootCause: "Công nhân lắp nhầm mặt gioăng", actionPlan: "Đào tạo lại tổ lắp ráp, thêm hướng dẫn bằng hình ảnh tại line", deadline: "20/07/2026", status: "OPEN", owner: "Quản đốc PX Lắp ráp" },
    { id: "CAPA-202607-02", ncrRef: "NCR-20260715-44", rootCause: "NCC cắt hụt kích thước dây", actionPlan: "Gửi công văn cảnh cáo NCC, tăng cường IQC lấy mẫu 100%", deadline: "18/07/2026", status: "INVESTIGATING", owner: "Trưởng phòng Thu mua" },
    { id: "CAPA-202606-15", ncrRef: "NCR-20260628-112", rootCause: "Khuôn dập bị mài mòn", actionPlan: "Thay khuôn mới, lên lịch bảo dưỡng khuôn định kỳ 3 tháng/lần", deadline: "05/07/2026", status: "CLOSED", owner: "Kỹ sư Cơ điện" },
  ];

  const filteredActions = statusFilter === "ALL" 
    ? actions 
    : actions.filter(a => a.status === statusFilter);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "OPEN": return <span className="badge bg-warning bg-opacity-10 text-warning px-2 py-1 rounded-pill">Mới mở</span>;
      case "INVESTIGATING": return <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-pill">Đang thực hiện</span>;
      case "CLOSED": return <span className="badge bg-success bg-opacity-10 text-success px-2 py-1 rounded-pill">Đã đóng (Hoàn thành)</span>;
      default: return null;
    }
  };

  return (
    <StandardPage
      title="Hành động Khắc phục (CAPA)"
      description="Quản lý nguyên nhân gốc rễ và biện pháp cải tiến hệ thống (Corrective and Preventive Action)"
      color="orange"
      icon="bi-tools"
    >
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <SectionTitle title="Danh sách Cải tiến quy trình (CAPA)" icon="bi-wrench-adjustable" />
        
        <div className="d-flex flex-column flex-sm-row gap-2">
          <select 
            className="form-select form-select-sm shadow-none bg-light" 
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="OPEN">Mới mở</option>
            <option value="INVESTIGATING">Đang thực hiện</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
          <button className="btn btn-sm btn-primary shadow-none d-flex align-items-center gap-2">
            <i className="bi bi-plus-lg"></i> Tạo CAPA mới
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light text-muted small">
            <tr>
              <th className="fw-medium border-0 rounded-start">Mã CAPA</th>
              <th className="fw-medium border-0">Lỗi liên quan (NCR)</th>
              <th className="fw-medium border-0">Nguyên nhân gốc rễ</th>
              <th className="fw-medium border-0">Biện pháp khắc phục/Phòng ngừa</th>
              <th className="fw-medium border-0">Người phụ trách</th>
              <th className="fw-medium border-0 text-center">Hạn chót</th>
              <th className="fw-medium border-0 text-center">Trạng thái</th>
              <th className="fw-medium border-0 rounded-end text-end">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredActions.map(action => (
              <tr key={action.id}>
                <td><span className="fw-bold text-dark small">{action.id}</span></td>
                <td><span className="text-danger small fw-medium">{action.ncrRef}</span></td>
                <td className="fw-medium text-dark small" style={{ maxWidth: 180 }}>{action.rootCause}</td>
                <td className="text-muted small" style={{ maxWidth: 250, whiteSpace: "normal" }}>
                  {action.actionPlan}
                </td>
                <td><span className="text-muted small"><i className="bi bi-person me-1"></i> {action.owner}</span></td>
                <td className="text-center text-muted small fw-medium">{action.deadline}</td>
                <td className="text-center">{getStatusBadge(action.status)}</td>
                <td className="text-end">
                  <button className="btn btn-sm btn-light text-secondary shadow-none px-2 py-1" title="Cập nhật tiến độ">
                    <i className="bi bi-pencil-square"></i> Cập nhật
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StandardPage>
  );
}
