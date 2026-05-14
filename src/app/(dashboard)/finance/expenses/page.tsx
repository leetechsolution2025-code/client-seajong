"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { BarChartHorizontal } from "@/components/ui/charts/BarChartHorizontal";
import { YearAreaChart, YearSeries } from "@/components/ui/charts/YearAreaChart";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { FilterBadge } from "@/components/ui/FilterBadge";

interface CategoryItem {
  id: string;
  code: string;
  name: string;
  color: string | null;
  icon: string | null;
  parentId: string | null;
}

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Load categories from DB
  useEffect(() => {
    fetch("/api/plan-finance/categories?type=expense_type")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(err => console.error("Error fetching categories:", err))
      .finally(() => setLoadingCats(false));
  }, []);

  // Mock data for Summary
  const summaryData = [
    { label: "Tổng chi phí năm 2026", value: "59.214.502", icon: "bi-wallet2", accent: "#f59e0b" },
    { label: "Chi phí tháng này", value: "6.670.000", icon: "bi-calendar3", accent: "#8b5cf6" },
  ];

  // Mock data for Horizontal Bar Chart
  const structureData = [
    { label: "Chi phí cố định", value: 59214502 },
    { label: "Chi phí biến đổi", value: 1200000 },
    { label: "Chi phí tài chính", value: 500000 },
    { label: "Chi phí khác", value: 300000 },
  ];

  // Mock data for Area Chart
  const monthlySeries: YearSeries[] = [
    {
      name: "Chi phí cố định",
      data: [15, 15, 15, 60, 18, null, null, null, null, null, null, null],
      color: "#f59e0b",
    },
    {
      name: "Chi phí biến đổi",
      data: [2, 3, 2, 4, 3, null, null, null, null, null, null, null],
      color: "#6366f1",
    },
    {
      name: "Chi phí tài chính",
      data: [1, 1, 1, 1, 1, null, null, null, null, null, null, null],
      color: "#f43f5e",
    },
    {
      name: "Chi phí khác",
      data: [5, 5, 5, 5, 5, null, null, null, null, null, null, null],
      color: "#10b981",
    },
  ];

  return (
    <StandardPage
      title="Quản lý chi phí"
      description="Theo dõi và kiểm soát chi phí vận hành, phân bổ ngân sách"
      icon="bi-cash-stack"
      color="amber"
      useCard={false}
    >
      <div className="row g-3">
        {/* Left Column - 5 units */}
        <div className="col-lg-5 d-flex flex-column gap-3">
          {/* Summary Cards */}
          <div className="row g-3">
            {summaryData.map((item, idx) => (
              <KPICard
                key={idx}
                label={item.label}
                value={item.value}
                icon={item.icon}
                accent={item.accent}
                colClass="col-6"
              />
            ))}
          </div>

          {/* Structure Chart */}
          <div className="bg-white rounded-4 shadow-sm border p-4 flex-grow-1">
            <h6 className="fw-semibold text-uppercase mb-4 text-muted" style={{ fontSize: 11, letterSpacing: "0.05em" }}>
              CƠ CẤU CHI PHÍ THEO LOẠI
            </h6>
            <div className="mt-2">
              <BarChartHorizontal
                data={structureData}
                colors={["#6366f1", "#6366f1", "#6366f1", "#6366f1"]} // Image shows blue bars
                rowHeight={50}
              />
            </div>
          </div>
        </div>

        {/* Right Column - 7 units */}
        <div className="col-lg-7">
          <div className="bg-white rounded-4 shadow-sm border p-4 h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="fw-semibold text-uppercase mb-0 text-muted" style={{ fontSize: 11, letterSpacing: "0.05em" }}>
                CHI PHÍ THEO THÁNG
              </h6>
              <div className="d-flex align-items-center gap-3">
                <select className="form-select form-select-sm border-0 bg-light fw-semibold text-muted" style={{ width: 80, fontSize: 11 }}>
                  <option>2026</option>
                  <option>2025</option>
                </select>
              </div>
            </div>
            
            <div className="flex-grow-1" style={{ height: 250 }}>
              <YearAreaChart series={monthlySeries} height={250} unit="tr" />
            </div>

            {/* Legend at bottom - No bold font */}
            <div className="d-flex flex-wrap justify-content-center gap-4 mt-3 pt-2 border-top">
              {monthlySeries.map((s, i) => (
                <div key={i} className="d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                  <span className="rounded-circle" style={{ width: 10, height: 10, background: s.color }} />
                  <span className="text-muted">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom - List Card */}
        <div className="col-12">
          <div className="bg-white rounded-4 shadow-sm border">
            {/* Toolbar */}
            <div className="p-4 border-bottom">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <h6 className="fw-semibold text-uppercase mb-0 text-muted" style={{ fontSize: 11, letterSpacing: "0.05em" }}>
                  DANH SÁCH CÁC KHOẢN CHI PHÍ
                </h6>
                <div className="d-flex gap-2">
                  <button className="btn btn-light btn-sm rounded-3 px-2">
                    <i className="bi bi-arrow-clockwise" />
                  </button>
                </div>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                <div style={{ width: 200 }}>
                  <FilterSelect
                    options={categories.map(c => ({ label: c.name, value: c.code }))}
                    placeholder="Tất cả danh mục"
                  />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <input type="date" className="form-control form-control-sm border-0 bg-light rounded-3 text-muted" defaultValue="2026-01-01" style={{ width: 130 }} />
                  <span className="text-muted">-</span>
                  <input type="date" className="form-control form-control-sm border-0 bg-light rounded-3 text-muted" defaultValue="2026-05-06" style={{ width: 130 }} />
                </div>
                <button className="btn btn-link text-danger p-0 ms-1">
                  <i className="bi bi-x-circle-fill" />
                </button>
                <div className="flex-grow-1 mx-2" style={{ maxWidth: 400 }}>
                  <SearchInput placeholder="Tìm khoản chi..." />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-violet-soft btn-sm fw-semibold px-3 py-2 rounded-3 d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-text" /> Hồ sơ
                  </button>
                  <button className="btn btn-warning text-white btn-sm fw-semibold px-3 py-2 rounded-3 d-flex align-items-center gap-2" style={{ background: "#f59e0b" }}>
                    <i className="bi bi-plus-lg" /> Thêm mới
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="d-flex flex-wrap gap-2 mt-4">
                {[
                  { label: "Tất cả", count: 9, color: "warning" },
                  { label: "Chờ duyệt", count: 0, color: "light" },
                  { label: "Đã duyệt", count: 0, color: "light" },
                  { label: "Đã thanh toán", count: 0, color: "light" },
                  { label: "Từ chối", count: 0, color: "light" },
                ].map((tab, idx) => (
                  <FilterBadge
                    key={idx}
                    label={tab.label}
                    count={tab.count}
                    active={activeTab === tab.label}
                    onClick={() => setActiveTab(tab.label)}
                    activeColor={tab.color === "warning" ? "#f59e0b" : "#6366f1"}
                  />
                ))}
              </div>
            </div>

            {/* List */}
            <div className="p-0">
              <div className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between text-muted fw-bold text-uppercase" style={{ fontSize: 11 }}>
                <div className="d-flex align-items-center gap-4">
                  <div style={{ width: 24 }} />
                  <span>DANH MỤC CHI PHÍ · THÁNG</span>
                </div>
                <div className="d-flex align-items-center gap-5 pe-4">
                  <span style={{ width: 100 }} className="text-end">SỐ KHOẢN</span>
                  <span style={{ width: 120 }} className="text-end">TỔNG TIỀN (Đ)</span>
                </div>
              </div>

              {/* List Items */}
              {[
                { title: "Khấu hao tài sản - T5/2026", count: 1, amount: "6.670.000", color: "#6366f1" },
                { title: "Chi phí lương nhân viên - T4/2026", count: 1, amount: "13.213.213", color: "#6366f1" },
              ].map((item, idx) => (
                <div key={idx} className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between hover-bg-light transition-all cursor-pointer">
                  <div className="d-flex align-items-center gap-4">
                    <i className="bi bi-chevron-right text-muted" />
                    <div className="d-flex align-items-center gap-2">
                      <span className="rounded-circle" style={{ width: 8, height: 8, background: item.color }} />
                      <span className="fw-medium" style={{ fontSize: 13 }}>{item.title}</span>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-5 pe-4">
                    <div style={{ width: 100 }} className="text-end">
                      <span className="badge rounded-pill bg-blue-soft text-blue fw-semibold" style={{ fontSize: 10 }}>{item.count} khoản</span>
                    </div>
                    <span className="fw-black text-danger text-end" style={{ width: 120, fontSize: 14 }}>{item.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-bg-light:hover {
          background-color: #f8fafc;
        }
        .bg-blue-soft {
          background-color: #e0e7ff;
          color: #4338ca;
        }
        .btn-violet-soft {
          background-color: #f5f3ff;
          color: #7c3aed;
          border: 1px solid #ddd6fe;
        }
        .btn-violet-soft:hover {
          background-color: #ede9fe;
        }
        .fw-black {
          font-weight: 900;
        }
      `}</style>
    </StandardPage>
  );
}
