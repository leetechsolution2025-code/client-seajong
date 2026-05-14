"use client";
import React from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";

export default function BoardAssetsPage() {
  return (
    <SplitLayoutPage
      title="Tài sản cố định"
      description="Ban Giám đốc · Giám sát tài sản, khấu hao và giá trị còn lại"
      icon="bi-building-gear"
      color="cyan"
      leftContent={<div />}
      rightContent={<div />}
    />
  );
}
