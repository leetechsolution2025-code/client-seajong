"use client";
import React from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";

export default function BoardRetailPage() {
  return (
    <SplitLayoutPage
      title="Bán lẻ"
      description="Ban Giám đốc · Giám sát hoạt động bán lẻ và doanh thu"
      icon="bi-shop"
      color="emerald"
      leftContent={<div />}
      rightContent={<div />}
    />
  );
}
