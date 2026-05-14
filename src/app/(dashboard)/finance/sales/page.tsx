"use client";

import { StandardPage } from "@/components/layout/StandardPage";

export default function SalesPage() {
  return (
    <StandardPage
      title="Bán hàng"
      description="Quản lý doanh thu bán hàng và đối soát hóa đơn"
      icon="bi-cart3"
      color="emerald"
    >
      <div className="text-center py-5 text-muted">
        <i className="bi bi-cart3 mb-3" style={{ fontSize: "3rem", opacity: 0.2 }} />
        <p>Nội dung bán hàng đang được cập nhật...</p>
      </div>
    </StandardPage>
  );
}
