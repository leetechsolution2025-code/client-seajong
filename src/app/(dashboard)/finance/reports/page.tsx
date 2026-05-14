"use client";

import { StandardPage } from "@/components/layout/StandardPage";

export default function ReportsPage() {
  return (
    <StandardPage
      title="Báo cáo tài chính"
      description="Tổng hợp báo cáo kết quả kinh doanh, bảng cân đối kế toán"
      icon="bi-file-earmark-bar-graph"
      color="emerald"
    >
      <div className="text-center py-5 text-muted">
        <i className="bi bi-file-earmark-bar-graph mb-3" style={{ fontSize: "3rem", opacity: 0.2 }} />
        <p>Nội dung báo cáo tài chính đang được cập nhật...</p>
      </div>
    </StandardPage>
  );
}
