"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";

export default function DefectsSummaryPage() {
  return (
    <StandardPage
      title="Tổng hợp hàng lỗi"
      description="Quản lý và tổng hợp các hồ sơ hàng lỗi từ các bộ phận"
      icon="bi-exclamation-triangle"
      color="red"
    >
      <div className="card shadow-sm border-0 h-100">
        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-5">
          <div 
            className="rounded-circle d-flex align-items-center justify-content-center mb-4 bg-danger bg-opacity-10 text-danger" 
            style={{ width: 80, height: 80 }}
          >
            <i className="bi bi-exclamation-triangle-fill fs-1"></i>
          </div>
          <h4 className="fw-bold mb-3">Tính năng đang được phát triển</h4>
          <p className="text-muted mx-auto" style={{ maxWidth: 500, lineHeight: 1.6 }}>
            Trang tổng hợp hàng lỗi đang trong quá trình xây dựng và sẽ sớm ra mắt.
            Vui lòng quay lại sau!
          </p>
        </div>
      </div>
    </StandardPage>
  );
}
