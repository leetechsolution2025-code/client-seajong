"use client";

import { StandardPage } from "@/components/layout/StandardPage";

export default function FinancePage() {
  return (
    <StandardPage
      title="Tài chính – Kế toán"
      description="Hệ thống quản lý tài chính, kế toán và báo cáo doanh nghiệp"
      icon="bi-cash-stack"
      color="emerald"
    >
      <div className="row g-4">
        {[
          { title: "Quản lý tài chính", items: ["Quản lý tài sản", "Quản lý công nợ", "Quản lý chi phí", "Hàng hoá trong kho"] },
          { title: "Kế toán", items: ["Bán hàng", "Tạm ứng"] },
          { title: "Báo cáo", items: ["Báo cáo tài chính"] }
        ].map((group, idx) => (
          <div key={idx} className="col-md-4">
            <h6 className="fw-bold mb-3">{group.title}</h6>
            <ul className="list-unstyled">
              {group.items.map((item, i) => (
                <li key={i} className="mb-2 text-muted">
                  <i className="bi bi-check2-circle me-2 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </StandardPage>
  );
}
