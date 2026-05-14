"use client";

import { PageHeader } from "@/components/layout/PageHeader";

export default function EquipmentPage() {
  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Trang thiết bị"
        description="Quản lý cấp phát máy tính, thiết bị và công cụ dụng cụ cho nhân viên"
        icon="bi-laptop"
        color="rose"
      />
      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          {/* Nội dung trang trang thiết bị */}
        </div>
      </div>
    </div>
  );
}
