"use client";
import { PageHeader } from "@/components/layout/PageHeader";

export default function PlanBudgetPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Ngân sách"
        description="Quản lý và phân bổ ngân sách marketing theo chiến dịch và kênh"
        color="rose"
        icon="bi-wallet2"
      />
    </div>
  );
}
