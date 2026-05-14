"use client";
import React from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";

export default function BoardOrdersPage() {
  return (
    <SplitLayoutPage
      title="Thực hiện đơn hàng"
      description="Ban Giám đốc · Giám sát tiến độ và hiệu suất thực hiện đơn hàng"
      icon="bi-box-seam"
      color="blue"
      leftContent={<div />}
      rightContent={<div />}
    />
  );
}
