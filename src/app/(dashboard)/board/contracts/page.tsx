"use client";
import React from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";

export default function BoardContractsPage() {
  return (
    <SplitLayoutPage
      title="Hợp đồng"
      description="Ban Giám đốc · Giám sát hợp đồng và tình trạng ký kết"
      icon="bi-file-earmark-text"
      color="amber"
      leftContent={<div />}
      rightContent={<div />}
    />
  );
}
