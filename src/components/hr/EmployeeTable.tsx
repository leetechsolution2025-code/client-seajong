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
    <>
      {/* Desktop Table View */}
      <div className="d-none d-md-block">
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
      </div>

      {/* Mobile Card List View */}
      <div className="d-block d-md-none flex-grow-1 overflow-auto">
        <div className="p-3">
          {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border spinner-border-sm text-primary me-2" />
            Đang tải dữ liệu nhân sự...
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-person-x fs-2 d-block mb-2 opacity-25" />
            Không tìm thấy nhân viên nào
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {employees.map(emp => (
              <div 
                key={emp.id} 
                className="card shadow-sm border border-light p-3" 
                style={{ borderRadius: "16px", backgroundColor: "var(--card)", cursor: "pointer" }}
                onClick={() => onRowClick(emp)}
              >
                {/* Header: Avatar, Name, Status */}
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <EmployeeAvatar
                      name={emp.fullName}
                      url={emp.avatarUrl}
                      size={40}
                      borderRadius={10}
                    />
                    <div>
                      <div className="fw-bold text-foreground" style={{ fontSize: "0.95rem" }}>{emp.fullName}</div>
                      <div className="text-muted" style={{ fontSize: "11px", fontFamily: "monospace" }}>{emp.code}</div>
                    </div>
                  </div>
                  {getStatusBadge(emp.status)}
                </div>

                {/* Details */}
                <div className="mb-3 text-muted" style={{ fontSize: "0.8rem" }}>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Vị trí:</span>
                    <span className="text-foreground fw-bold">{getPositionName(emp.position)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Phòng ban:</span>
                    <span className="text-foreground fw-medium">{emp.departmentName}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Loại nhân sự:</span>
                    <span>{getEmployeeTypeBadge(emp.employeeType)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Ngày vào làm:</span>
                    <span className="text-foreground fw-medium">
                      {emp.startDate ? new Date(emp.startDate).toLocaleDateString("vi-VN") : "—"}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Email:</span>
                    <span className="text-foreground fw-medium text-truncate" style={{ maxWidth: "200px" }}>{emp.workEmail}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="d-flex gap-2 pt-2 border-top">
                  <button 
                    className="btn btn-sm btn-light border flex-1 py-1 d-flex align-items-center justify-content-center gap-1 rounded-pill"
                    style={{ fontSize: "11px", height: 32 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick(emp);
                    }}
                  >
                    <i className="bi bi-eye text-primary" /> Chi tiết
                  </button>
                  <button 
                    className="btn btn-sm btn-light border flex-1 py-1 d-flex align-items-center justify-content-center gap-1 rounded-pill"
                    style={{ fontSize: "11px", height: 32 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(emp);
                    }}
                  >
                    <i className="bi bi-pencil text-muted" /> Chỉnh sửa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
