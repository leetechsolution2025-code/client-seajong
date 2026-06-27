"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogisticsInventory } from "@/components/logistics/inventory/LogisticsInventory";

export default function LogisticsOverviewPage() {
  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Quản lý hệ thống kho"
        description="Quản lý dòng chảy hàng hóa & Cảnh báo an toàn kho thời gian thực."
        icon="bi-truck"
        color="blue"
      />

      <div className="flex-grow-1 pb-4 pt-2 px-4 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          <div 
            className="flex-grow-1 custom-scrollbar d-flex flex-column overflow-hidden pt-4 px-4 pb-3"
            style={{ minHeight: 0 }}
          >
            <LogisticsInventory />
          </div>
        </div>
      </div>
    </div>
  );
}
