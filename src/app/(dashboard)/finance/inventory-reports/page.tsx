"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { LogisticsInventoryReports } from "@/components/logistics/inventory/LogisticsInventoryReports";

export default function FinanceInventoryReportsPage() {
  return (
    <StandardPage
      title="Báo cáo kho"
      description="Phân tích giá trị và số lượng tồn kho định kỳ"
      icon="bi-bar-chart-line"
      color="blue"
      useCard={false}
      paddingClassName="px-2 pb-2 pt-1"
    >
      <div className="flex-grow-1 d-flex flex-column h-100 overflow-hidden">
        <LogisticsInventoryReports />
      </div>
    </StandardPage>
  );
}
