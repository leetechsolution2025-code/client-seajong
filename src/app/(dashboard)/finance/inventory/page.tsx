"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { InventoryManagement } from "@/components/finance/InventoryManagement";

export default function InventoryPage() {
  return (
    <StandardPage
      title="Hàng hoá trong kho"
      description="Quản lý tồn kho tài chính và định giá hàng hoá"
      icon="bi-box-seam"
      color="emerald"
      useCard={false}
    >
      <InventoryManagement />
    </StandardPage>
  );
}
