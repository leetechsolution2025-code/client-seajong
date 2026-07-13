"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { InventoryManagement } from "@/components/finance/InventoryManagement";

export default function CSInventoryPage() {
  return (
    <StandardPage
      title="Tra cứu Kho hàng"
      description="Kiểm tra số lượng tồn kho để phản hồi khách hàng"
      icon="bi-box-seam"
      color="amber"
      useCard={false}
    >
      <InventoryManagement mode="cs" allowAdd={false} />
    </StandardPage>
  );
}
