"use client";

import { StandardPage } from "@/components/layout/StandardPage";

export default function AdvancesPage() {
  return (
    <StandardPage
      title="Tạm ứng"
      description="Quản lý các khoản tạm ứng nhân viên và đối soát"
      icon="bi-cash"
      color="emerald"
    >
      <div className="text-center py-5 text-muted">
        <i className="bi bi-cash mb-3" style={{ fontSize: "3rem", opacity: 0.2 }} />
        <p>Nội dung tạm ứng đang được cập nhật...</p>
      </div>
    </StandardPage>
  );
}
