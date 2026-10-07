"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DynamicTicker } from "@/components/layout/DynamicTicker";
import { DealersManagementTable } from "@/components/dealers/DealersManagementTable";

export default function SalesCustomersPage() {
  const [totalAgents, setTotalAgents] = useState(0);

  useEffect(() => {
    fetch('/api/plan-finance/customers?pageSize=1&nhom=dai-ly')
      .then(res => res.json())
      .then(data => {
        if (data?.total) {
          setTotalAgents(data.total);
        }
      })
      .catch(console.error);
  }, []);

  const tickerNews = [
    { text: `• Tổng số đại lý toàn hệ thống: <strong>${totalAgents || 344}</strong>`, type: 'text' },
    { text: `• Theo dõi tiến độ cam kết doanh số và phát triển thị trường`, type: 'text' }
  ];

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Danh sách đại lý"
        description="Danh sách đại lý và các chỉ tiêu doanh số"
        color="blue"
        icon="bi-people"
      />
      <DynamicTicker pageTitle="Danh sách đại lý" customNews={tickerNews} />
      <div className="flex-grow-1 p-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: 0 }}>
          <DealersManagementTable onTotalChange={setTotalAgents} />
        </div>
      </div>
    </div>
  );
}
