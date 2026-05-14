"use client";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApprovalCenter } from "@/components/approvals/ApprovalCenter";

export default function PlanApprovalsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Phê duyệt kế hoạch"
        description="Quản lý và xử lý hồ sơ phê duyệt kế hoạch Marketing từ các phòng ban"
        color="rose"
        icon="bi-file-earmark-check"
      />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ApprovalCenter
          mode="page"
          entityFilter="marketing_yearly_plan,marketing_monthly_execution"
          defaultView="inbox"
        />
      </div>
    </div>
  );
}
