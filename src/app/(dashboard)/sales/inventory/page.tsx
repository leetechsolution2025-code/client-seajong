"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { InventoryManagement } from "@/components/finance/InventoryManagement";

export default function SalesInventoryPage() {
  return (
    <StandardPage
      title="Hàng hoá trong kho"
      description="Tra cứu hàng hoá, tồn kho thực tế và giá bán"
      icon="bi-box-seam"
      color="emerald"
      useCard={false}
    >
      <InventoryManagement mode="sales" allowAdd={false} />
    </StandardPage>
  );
}
