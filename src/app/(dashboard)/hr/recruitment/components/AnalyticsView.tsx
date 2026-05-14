"use client";

import React from "react";
import dynamic from "next/dynamic";
import { KPICard } from "@/components/ui/KPICard";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function AnalyticsView() {
  const funnelOptions: any = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        barHeight: '70%',
        distributed: true,
      }
    },
    dataLabels: { enabled: true, formatter: (val: any) => val + " ứng viên" },
    xaxis: { categories: ['Tiếp nhận', 'Sourcing', 'Phỏng vấn', 'Offer', 'Onboarding'] },
    colors: ['#64748b', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'],
    legend: { show: false }
  };

  const funnelSeries = [{
    name: 'Ứng viên',
    data: [120, 85, 42, 12, 8]
  }];

  const sourceOptions: any = {
    chart: { type: 'donut' },
    labels: ['LinkedIn', 'Facebook', 'Referral', 'TopCV', 'Headhunter'],
    colors: ['#0077b5', '#1877f2', '#8b5cf6', '#ef4444', '#10b981'],
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '70%' } } }
  };

  const sourceSeries = [45, 20, 15, 12, 8];

  return (
    <div className="d-flex flex-column gap-4 h-100 overflow-auto custom-scrollbar">
      {/* KPI Section */}
      <div className="row g-3">
        <div className="col-md-3">
          <KPICard label="Tổng ứng viên" value={187} icon="bi-people" accent="#3b82f6" colClass="" />
        </div>
        <div className="col-md-3">
          <KPICard label="Tỷ lệ đạt (Pass)" value="12.5%" icon="bi-check-circle" accent="#10b981" colClass="" />
        </div>
        <div className="col-md-3">
          <KPICard label="Thời gian tuyển TB" value="18 ngày" icon="bi-clock" accent="#f59e0b" colClass="" />
        </div>
        <div className="col-md-3">
          <KPICard label="Chi phí / Tuyển dụng" value="2.5M" icon="bi-currency-dollar" accent="#8b5cf6" colClass="" />
        </div>
      </div>

      <div className="row g-4 flex-grow-1">
        {/* Funnel Chart */}
        <div className="col-lg-7">
          <div className="bg-card border rounded-4 p-4 h-100 shadow-sm">
            <h6 style={{ fontWeight: 800, marginBottom: "20px" }}>Phễu Tuyển dụng (Recruitment Funnel)</h6>
            <Chart options={funnelOptions} series={funnelSeries} type="bar" height="300" />
          </div>
        </div>

        {/* Source Chart */}
        <div className="col-lg-5">
          <div className="bg-card border rounded-4 p-4 h-100 shadow-sm">
            <h6 style={{ fontWeight: 800, marginBottom: "20px" }}>Nguồn Ứng viên</h6>
            <Chart options={sourceOptions} series={sourceSeries} type="donut" height="300" />
          </div>
        </div>
      </div>
    </div>
  );
}
