import { PageHeader } from "@/components/layout/PageHeader";

export default function FinancePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Tài chính – Kế toán"
        description="Finance & Accounting · Quản lý thu chi & báo cáo tài chính"
        color="emerald"
        icon="bi-cash-stack"
      />
      <div style={{ padding: "2rem", flex: 1 }}></div>
    </div>
  );
}
