"use client";

import React, { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApprovalCenter } from "@/components/approvals/ApprovalCenter";

export default function BoardApprovalsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Trung tâm phê duyệt"
        description="Quản lý và xử lý hồ sơ cần phê duyệt của Ban Giám đốc"
        color="indigo"
        icon="bi-check2-square"
      />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Suspense fallback={<div className="p-4 text-muted">Đang tải trung tâm phê duyệt...</div>}>
          <ApprovalCenter
            mode="page"
            defaultView="inbox"
          />
        </Suspense>
      </div>
    </div>
  );
}
