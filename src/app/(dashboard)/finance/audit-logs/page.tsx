"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { LogisticsAuditLogs } from "@/components/logistics/inventory/LogisticsAuditLogs";

export default function FinanceAuditLogsPage() {
  return (
    <StandardPage
      title="Nhật ký hoạt động kho"
      description="Truy vết lịch sử thao tác và biến động dữ liệu kho hàng"
      icon="bi-journal-text"
      color="amber"
      useCard={false}
      paddingClassName="px-2 pb-2 pt-1"
    >
      <div className="flex-grow-1 d-flex flex-column h-100 overflow-hidden">
        <LogisticsAuditLogs />
      </div>
    </StandardPage>
  );
}
