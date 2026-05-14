"use client";

import React, { useState, useEffect } from "react";
import { EmployeeAvatar } from "./EmployeeAvatar";

interface Employee {
  id: string;
  code: string;
  fullName: string;
  position: string;
  departmentName: string;
  status: string;
  workEmail: string;
  phone: string;
  employeeType: string;
  startDate: string | null;
  avatarUrl?: string | null;
}

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  onRowClick: (employee: Employee) => void;
  onEditClick: (employee: Employee) => void;
}

export function EmployeeTable({ employees, loading, onRowClick, onEditClick }: EmployeeTableProps) {
  const [positions, setPositions] = useState<{ code: string, name: string }[]>([]);

  useEffect(() => {
    fetch("/api/board/categories?type=position")
      .then(r => r.json())
      .then(d => setPositions(d ?? []))
      .catch(() => { });
  }, []);

  const getPositionName = (code: string) => {
    if (!code) return "—";
    const pos = positions.find(p => p.code === code);
    return pos ? pos.name : code;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="badge bg-success-subtle text-success border border-success border-opacity-20 rounded-pill">Đang làm việc</span>;
      case "probation":
        return <span className="badge bg-warning-subtle text-warning border border-warning border-opacity-20 rounded-pill">Thử việc</span>;
      case "resigned":
        return <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-20 rounded-pill">Đã nghỉ việc</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary border border-secondary border-opacity-20 rounded-pill">{status}</span>;
    }
  };

  const getEmployeeTypeBadge = (type: string) => {
    switch (type) {
      case "official":
        return <span className="badge bg-primary-subtle text-primary rounded-pill px-2">Chính thức</span>;
      case "probation":
        return <span className="badge bg-warning-subtle text-warning rounded-pill px-2">Thử việc</span>;
      case "intern":
        return <span className="badge bg-info-subtle text-info rounded-pill px-2">Thực tập</span>;
      default:
        return <span className="badge bg-light text-dark rounded-pill px-2">{type}</span>;
    }
  };

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
        <thead className="bg-light">
          <tr style={{ height: 40 }}>
            <th className="ps-4 border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Nhân viên</th>
            <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Vị trí / Phòng ban</th>
            <th className="border-0 text-uppercase" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Loại NV</th>
            <th className="border-0 text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Ngày vào làm</th>
            <th className="border-0 text-uppercase text-center" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Trạng thái</th>
            <th className="pe-4 border-0 text-uppercase text-end" style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-primary me-2" />
                Đang tải dữ liệu nhân sự...
              </td>
            </tr>
          ) : employees.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-5 text-muted">
                <i className="bi bi-person-x fs-2 d-block mb-2 opacity-25" />
                Không tìm thấy nhân viên nào
              </td>
            </tr>
          ) : (
            employees.map(emp => (
              <tr key={emp.id} style={{ height: 56, cursor: "pointer" }} onClick={() => onRowClick(emp)}>
                <td className="ps-4">
                  <div className="d-flex align-items-center gap-3">
                    <EmployeeAvatar
                      name={emp.fullName}
                      url={emp.avatarUrl}
                      size={36}
                      borderRadius={10}
                    />
                    <div>
                      <div className="fw-bold text-foreground">{emp.fullName}</div>
                      <div className="text-muted" style={{ fontSize: 11, fontFamily: "monospace" }}>{emp.code} • {emp.workEmail}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="fw-bold">{getPositionName(emp.position)}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{emp.departmentName}</div>
                </td>
                <td>
                  {getEmployeeTypeBadge(emp.employeeType)}
                </td>
                <td className="text-center" style={{ color: "var(--foreground)" }}>
                  {emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "—"}
                </td>
                <td className="text-center">
                  {getStatusBadge(emp.status)}
                </td>
                <td className="pe-4 text-end">
                  <button className="btn btn-icon btn-sm rounded-circle me-1" title="Xem chi tiết">
                    <i className="bi bi-eye text-primary" />
                  </button>
                  <button
                    className="btn btn-icon btn-sm rounded-circle"
                    title="Chỉnh sửa"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(emp);
                    }}
                  >
                    <i className="bi bi-pencil text-muted" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
