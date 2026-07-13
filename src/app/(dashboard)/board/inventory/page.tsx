"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { InventoryManagement } from "@/components/finance/InventoryManagement";

export default function BoardInventoryPage() {
  return (
    <StandardPage
      title="Tổng quan Kho hàng"
      description="Kiểm soát toàn diện tình hình tồn kho và định giá"
      icon="bi-box-seam"
      color="indigo"
      useCard={false}
    >
      <InventoryManagement mode="board" allowAdd={false} />
    </StandardPage>
  );
}
