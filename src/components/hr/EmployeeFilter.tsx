"use client";

import React from "react";

interface Department {
  code: string;
  name: string;
}

interface EmployeeFilterProps {
  search: string;
  onSearchChange: (val: string) => void;
  department: string;
  onDepartmentChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  departments: Department[];
  onAddClick: () => void;
}

export function EmployeeFilter({
  search, onSearchChange,
  department, onDepartmentChange,
  status, onStatusChange,
  departments,
  onAddClick
}: EmployeeFilterProps) {
  return (
    <div className="d-flex align-items-center gap-3 mb-4">
      <div className="position-relative flex-grow-1">
        <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
        <input
          type="text"
          className="form-control border-0 shadow-sm rounded-pill ps-5 pe-4"
          style={{ height: 42, background: "var(--card)", color: "var(--foreground)", fontSize: 13, border: "1px solid var(--border)" }}
          placeholder="Tìm theo tên, mã NV, email hoặc chức vụ..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="form-select border-0 shadow-sm rounded-pill px-4"
        style={{ width: "auto", fontSize: 13, height: 42, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        value={department}
        onChange={(e) => onDepartmentChange(e.target.value)}
      >
        <option value="">Tất cả phòng ban</option>
        {departments.map(d => (
          <option key={d.code} value={d.code}>{d.name}</option>
        ))}
      </select>

      <select
        className="form-select border-0 shadow-sm rounded-pill px-4"
        style={{ width: "auto", fontSize: 13, height: 42, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="">Tất cả trạng thái</option>
        <option value="active">Đang làm việc</option>
        <option value="probation">Thử việc</option>
        <option value="resigned">Đã nghỉ việc</option>
      </select>

      <button
        className="btn btn-primary rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
        style={{ fontSize: 13, height: 42, boxShadow: "0 4px 12px rgba(var(--primary-rgb, 67, 56, 202), 0.2)" }}
        onClick={onAddClick}
      >
        <i className="bi bi-person-plus-fill" />
        Thêm nhân sự
      </button>
    </div>
  );
}
