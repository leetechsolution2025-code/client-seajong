"use client";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ContentCalendarPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Lịch nội dung"
        description="Lên lịch và quản lý nội dung đăng tải trên các kênh truyền thông"
        color="rose"
        icon="bi-calendar-week"
      />
    </div>
  );
}
