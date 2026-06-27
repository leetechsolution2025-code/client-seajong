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
    <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-3 mb-4">
      {/* Select Filters */}
      <div className="d-flex gap-2 w-md-auto-custom">
        <select
          className="form-select border-0 shadow-sm rounded-pill px-3 filter-select-dept"
          style={{ fontSize: 13, height: 42, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", minWidth: "140px" }}
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map(d => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>

        <select
          className="form-select border-0 shadow-sm rounded-pill px-3 filter-select-status"
          style={{ fontSize: 13, height: 42, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", minWidth: "130px" }}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang làm việc</option>
          <option value="probation">Thử việc</option>
          <option value="resigned">Đã nghỉ việc</option>
        </select>
      </div>

      {/* Search & Action Wrapper */}
      <div className="d-flex align-items-center gap-2 flex-grow-1">
        {/* Search Input */}
        <div className="position-relative flex-grow-1" style={{ minWidth: "200px" }}>
          <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          <input
            type="text"
            className="form-control border-0 shadow-sm rounded-pill ps-5 pe-4 w-100"
            style={{ height: 42, background: "var(--card)", color: "var(--foreground)", fontSize: 13, border: "1px solid var(--border)" }}
            placeholder="Tìm theo tên, mã NV, email hoặc chức vụ..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Action Button */}
        <button
          className="btn btn-primary rounded-pill fw-bold d-flex align-items-center justify-content-center gap-2 btn-add-responsive"
          style={{ fontSize: 13, height: 42, boxShadow: "0 4px 12px rgba(var(--primary-rgb, 67, 56, 202), 0.2)" }}
          onClick={onAddClick}
        >
          <i className="bi bi-person-plus-fill" style={{ fontSize: "16px" }} />
          <span className="d-none d-md-inline text-nowrap">Thêm mới</span>
        </button>
      </div>
    </div>
  );
}
