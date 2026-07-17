"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { InventoryManagement } from "@/components/finance/InventoryManagement";

export default function SalesInventoryPage() {
  const [customTickerNews, setCustomTickerNews] = useState<any[]>([]);

  return (
    <StandardPage
      title="Hàng hoá trong kho"
      description="Tra cứu hàng hoá, tồn kho thực tế và giá bán"
      icon="bi-box-seam"
      color="emerald"
      useCard={false}
      customTickerNews={customTickerNews}
    >
      <InventoryManagement 
        mode="sales" 
        allowAdd={false} 
        onTickerUpdate={(news) => setCustomTickerNews(news)} 
      />
    </StandardPage>
  );
}
