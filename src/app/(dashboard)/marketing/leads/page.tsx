"use client";
import { PageHeader } from "@/components/layout/PageHeader";

export default function LeadsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Leads"
        description="Quản lý và theo dõi toàn bộ leads từ các kênh marketing"
        color="rose"
        icon="bi-person-plus"
      />
    </div>
  );
}
