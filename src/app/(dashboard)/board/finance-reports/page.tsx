"use client";
import React from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";

export default function BoardFinanceReportsPage() {
  return (
    <SplitLayoutPage
      title="Báo cáo tài chính"
      description="Ban Giám đốc · Báo cáo kết quả kinh doanh, cân đối kế toán và dòng tiền"
      icon="bi-file-earmark-bar-graph"
      color="violet"
      leftContent={<div />}
      rightContent={<div />}
    />
  );
}
