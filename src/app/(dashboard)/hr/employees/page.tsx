"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeeManagement } from "@/components/hr/EmployeeManagement";

export default function EmployeesPage() {
  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Quản lý hồ sơ nhân viên"
        description="Thông tin cá nhân, hợp đồng và lịch sử công tác của toàn bộ nhân sự"
        icon="bi-person-lines-fill"
        color="rose"
      />
      <div className="flex-grow-1 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <EmployeeManagement />
      </div>
    </div>
  );
}
