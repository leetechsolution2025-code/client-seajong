"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";

export default function DefectHandlingPage() {
  return (
    <StandardPage
      title="Xử lý hàng lỗi"
      description="Quản lý và xử lý các sản phẩm lỗi, không đạt tiêu chuẩn (NG)"
      icon="bi-exclamation-octagon"
      color="rose"
    >
      <div className="text-center py-5">
        <i className="bi bi-exclamation-octagon text-muted opacity-25" style={{ fontSize: 64 }} />
        <h5 className="mt-3 fw-bold">Chức năng đang được phát triển</h5>
        <p className="text-muted small">Hệ thống xử lý hàng lỗi sẽ sớm được cập nhật.</p>
      </div>
    </StandardPage>
  );
}
