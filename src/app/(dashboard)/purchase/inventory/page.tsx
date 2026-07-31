"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { InventoryManagement } from "@/components/finance/InventoryManagement";

export default function PurchaseInventoryPage() {
  const [customTickerNews, setCustomTickerNews] = useState<any[]>([]);

  return (
    <StandardPage
      title="Kho hàng"
      description="Tra cứu thông tin hàng hoá, tồn kho thực tế và giá nhập"
      icon="bi-box-seam"
      useCard={false}
      paddingClassName="p-1 p-sm-2"
      customTickerNews={customTickerNews}
    >
      <InventoryManagement 
        mode="finance" 
        allowAdd={false} 
        onTickerUpdate={(news) => setCustomTickerNews(news)} 
      />
    </StandardPage>
  );
}
