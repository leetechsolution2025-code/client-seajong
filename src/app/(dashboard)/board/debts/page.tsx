"use client";
import React from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";

export default function BoardDebtsPage() {
  return (
    <SplitLayoutPage
      title="Công nợ và chi phí"
      description="Ban Giám đốc · Giám sát công nợ phải thu, phải trả và cơ cấu chi phí"
      icon="bi-receipt"
      color="rose"
      leftContent={<div />}
      rightContent={<div />}
    />
  );
}
