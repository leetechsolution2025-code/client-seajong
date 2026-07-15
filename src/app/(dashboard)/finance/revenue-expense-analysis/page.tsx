"use client";

import React, { useState } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { SectionTitle } from "@/components/ui/SectionTitle";

export default function RevenueExpenseAnalysisPage() {
  const [dateRange, setDateRange] = useState("month"); // month, quarter, year

  return (
    <StandardPage
      title="Phân tích doanh thu và chi phí"
      description="Xem báo cáo chi tiết về tình hình thu chi và lợi nhuận của doanh nghiệp"
      icon="bi-pie-chart"
      color="indigo"
    >
      <div className="row g-4">
        <div className="col-12">
          <div className="app-card border-0 shadow-sm rounded-4 h-100">
            <div className="app-card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <SectionTitle title="Biểu đồ phân tích tổng quan" icon="bi-bar-chart-fill" />
                <select 
                  className="form-select form-select-sm shadow-none w-auto"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="month">Tháng này</option>
                  <option value="quarter">Quý này</option>
                  <option value="year">Năm nay</option>
                </select>
              </div>
              
              <div className="text-center py-5 text-muted bg-light rounded-3 border border-dashed">
                <i className="bi bi-graph-up-arrow mb-3 d-block" style={{ fontSize: "3rem", opacity: 0.3 }} />
                <p className="mb-0">Dữ liệu biểu đồ đang được tổng hợp...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="app-card border-0 shadow-sm rounded-4 h-100">
            <div className="app-card-body p-4">
              <SectionTitle title="Cơ cấu doanh thu" icon="bi-bag-check" />
              <div className="text-center py-4 text-muted mt-3">
                <i className="bi bi-pie-chart mb-2 d-block" style={{ fontSize: "2rem", opacity: 0.2 }} />
                <small>Chưa có dữ liệu phân tích</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="app-card border-0 shadow-sm rounded-4 h-100">
            <div className="app-card-body p-4">
              <SectionTitle title="Cơ cấu chi phí" icon="bi-wallet2" />
              <div className="text-center py-4 text-muted mt-3">
                <i className="bi bi-pie-chart mb-2 d-block" style={{ fontSize: "2rem", opacity: 0.2 }} />
                <small>Chưa có dữ liệu phân tích</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardPage>
  );
}
