"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";

export default function MarketAnalysisPage() {
  return (
    <StandardPage
      title="Phân tích thị trường"
      description="Phân tích quy mô, xu hướng và cơ hội trên thị trường"
      icon="bi-graph-up"
      color="indigo"
      useCard={true}
    >
      <div className="p-4 text-center text-muted">
        Nội dung đang được cập nhật...
      </div>
    </StandardPage>
  );
}
