"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { InventoryManagement } from "@/components/finance/InventoryManagement";

export default function ProductionInventoryPage() {
  return (
    <StandardPage
      title="Kho hàng"
      description="Quản lý tồn kho hàng hoá sản xuất"
      icon="bi-box-seam"
      color="blue"
      useCard={false}
    >
      <InventoryManagement mode="production" allowAdd={false} />
    </StandardPage>
  );
}
