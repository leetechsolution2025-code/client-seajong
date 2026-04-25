"use client";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ChannelsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Kênh kết nối"
        description="Cấu hình và quản lý kết nối với các kênh Facebook, Zalo, Google, Showroom"
        color="rose"
        icon="bi-diagram-3"
      />
    </div>
  );
}
