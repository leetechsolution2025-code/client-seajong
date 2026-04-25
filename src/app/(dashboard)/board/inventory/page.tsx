"use client";
import React from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";

export default function BoardInventoryPage() {
  return (
    <SplitLayoutPage
      title="Hàng hoá trong kho"
      description="Ban Giám đốc · Giám sát tồn kho, nhập xuất và giá trị hàng hoá"
      icon="bi-boxes"
      color="emerald"
      leftContent={<div />}
      rightContent={<div />}
    />
  );
}
