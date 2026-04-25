"use client";

import { PageHeader } from "@/components/layout/PageHeader";

export function MyAttendance() {
  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Chấm công"
        description="Xem lịch sử và trạng thái chấm công cá nhân"
        icon="bi-clock-history"
        color="emerald"
      />
      <div className="flex-grow-1 p-4">
        {/* Nội dung chấm công sẽ được cập nhật sau */}
      </div>
    </div>
  );
}
