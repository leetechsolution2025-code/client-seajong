"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function QaReportsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const barOptions: any = {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: ['#0d6efd', '#dc3545'],
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded', borderRadius: 4 } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7'] },
    yaxis: { title: { text: 'Số lượng' } },
    fill: { opacity: 1 },
    tooltip: { y: { formatter: (val: number) => val + " SP" } }
  };

  const barSeries = [
    { name: 'Đạt chuẩn (Pass)', data: [440, 505, 414, 671, 227, 413, 500] },
    { name: 'Hàng lỗi (Fail)', data: [13, 23, 20, 8, 13, 27, 15] }
  ];

  const radarOptions: any = {
    chart: { type: 'radar', toolbar: { show: false } },
    labels: ['Nhà cung cấp A', 'Nhà cung cấp B', 'Sản xuất nội bộ (Tổ 1)', 'Sản xuất nội bộ (Tổ 2)', 'Gia công ngoài'],
    stroke: { width: 2 },
    fill: { opacity: 0.2 },
    markers: { size: 4 },
    xaxis: { labels: { style: { colors: '#6c757d', fontSize: '11px', fontFamily: 'inherit' } } }
  };

  const radarSeries = [{ name: 'Tỷ lệ phát sinh lỗi (%)', data: [20, 15, 30, 10, 25] }];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Báo cáo Chất lượng"
        description="Phân tích chuyên sâu về tỷ lệ lỗi, chi phí chất lượng kém và đánh giá nhà cung cấp"
        color="violet"
        icon="bi-file-earmark-bar-graph"
      />
      
      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column custom-scrollbar overflow-auto" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0, gap: 16 }}>
        <motion.div 
          className="container-fluid px-0"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Filters */}
          <motion.div className="row mb-4" variants={item}>
            <div className="col-12">
              <div className="bg-card border rounded-4 shadow-sm" style={{ border: "none", backgroundColor: "#fff" }}>
                <div className="card-body p-3 d-flex flex-wrap gap-3 align-items-end">
                  <div style={{ width: 200 }}>
                    <label className="form-label small text-muted mb-1">Từ ngày</label>
                    <input type="date" className="form-control form-control-sm shadow-none bg-light" defaultValue="2026-01-01" />
                  </div>
                  <div style={{ width: 200 }}>
                    <label className="form-label small text-muted mb-1">Đến ngày</label>
                    <input type="date" className="form-control form-control-sm shadow-none bg-light" defaultValue="2026-07-16" />
                  </div>
                  <div style={{ width: 200 }}>
                    <label className="form-label small text-muted mb-1">Nhóm sản phẩm</label>
                    <select className="form-select form-select-sm shadow-none bg-light">
                      <option>Tất cả</option>
                      <option>Sen tắm</option>
                      <option>Vòi chậu</option>
                      <option>Phụ kiện</option>
                    </select>
                  </div>
                  <button className="btn btn-sm btn-primary shadow-none px-4">
                    <i className="bi bi-funnel me-1"></i> Lọc dữ liệu
                  </button>
                  <button className="btn btn-sm btn-outline-secondary shadow-none px-3 ms-auto">
                    <i className="bi bi-download me-1"></i> Xuất Excel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="row g-3">
            {/* Main Bar Chart */}
            <motion.div className="col-lg-8" variants={item}>
              <div className="bg-card border rounded-4 h-100 shadow-sm" style={{ border: "none", backgroundColor: "#fff" }}>
                <div className="card-body p-4">
                  <SectionTitle title="Biểu đồ tương quan Tỷ lệ Đạt/Lỗi theo tháng" icon="bi-bar-chart" />
                  <div style={{ height: 350, marginTop: '20px' }}>
                    {mounted && <Chart options={barOptions} series={barSeries} type="bar" height="100%" />}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Radar Chart */}
            <motion.div className="col-lg-4" variants={item}>
              <div className="bg-card border rounded-4 h-100 shadow-sm" style={{ border: "none", backgroundColor: "#fff" }}>
                <div className="card-body p-4 d-flex flex-column">
                  <SectionTitle title="Nguồn gốc phát sinh lỗi" icon="bi-radar" />
                  <p className="text-muted small mb-0 mt-2">Đánh giá rủi ro chất lượng theo nhà cung cấp & tổ sản xuất</p>
                  <div className="flex-grow-1 d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
                    {mounted && <Chart options={radarOptions} series={radarSeries} type="radar" width="100%" />}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
