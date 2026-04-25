"use client";

import { PageHeader } from "@/components/layout/PageHeader";

export function LeaveRequest() {
  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Tạo yêu cầu"
        description="Đăng ký nghỉ phép, nghỉ ốm hoặc các loại đơn từ khác"
        icon="bi-file-earmark-plus"
        color="rose"
      />
      <div className="flex-grow-1 p-4">
        {/* Nội dung tạo đơn sẽ được cập nhật sau */}
      </div>
    </div>
  );
}
