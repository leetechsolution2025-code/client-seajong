"use client";

import React from "react";
import { TreeFilterSelect } from "@/components/ui/TreeFilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";

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
  className?: string;
}

export function EmployeeFilter({
  search, onSearchChange,
  department, onDepartmentChange,
  status, onStatusChange,
  departments,
  onAddClick,
  className
}: EmployeeFilterProps) {
  return (
    <div className={`d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-3 ${className || ''}`}>
      {/* Select Filters */}
      <div className="d-flex gap-2 w-md-auto-custom">
        <TreeFilterSelect
          options={departments.map(d => ({ label: d.name, value: d.code }))}
          value={department}
          onChange={onDepartmentChange}
          placeholder="Tất cả phòng ban"
          className="shadow-sm rounded-pill"
          width={180}
        />

        <TreeFilterSelect
          options={[
            { label: "Đang làm việc", value: "active" },
            { label: "Thử việc", value: "probation" },
            { label: "Đã nghỉ việc", value: "resigned" }
          ]}
          value={status}
          onChange={onStatusChange}
          placeholder="Tất cả trạng thái"
          className="shadow-sm rounded-pill"
          width={160}
        />
      </div>

      {/* Search & Action Wrapper */}
      <div className="d-flex align-items-center gap-2 flex-grow-1">
        {/* Search Input */}
        <div className="flex-grow-1" style={{ minWidth: "200px" }}>
          <SearchInput
            placeholder="Tìm theo tên, mã NV, email hoặc chức vụ..."
            value={search}
            onChange={onSearchChange}
            className="shadow-sm rounded-pill w-100"
            style={{ fontSize: 13 }}
          />
        </div>

        <BrandButton
          className="btn-add-responsive"
          icon="bi-plus-lg"
          onClick={onAddClick}
          style={{ height: 34 }}
        >
          <span className="d-none d-md-inline text-nowrap">Thêm mới</span>
        </BrandButton>
      </div>
    </div>
  );
}
