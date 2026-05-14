"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export interface YearSeries {
  name: string;
  data: (number | null)[];
  color: string;
  type?: "area" | "line";
}

interface Props {
  series: YearSeries[];
  height?: number | string;
  showLegend?: boolean;
  /** Ẩn nhãn trục Y để mở rộng biểu đồ */
  hideYAxis?: boolean;
  unit?: string;
}

export function YearAreaChart({ series, height = 360, showLegend, hideYAxis, unit = "₫" }: Props) {
  const colors = series.map((s) => s.color);
  const maxVal = Math.max(
    ...series.flatMap((s) => s.data.filter((v): v is number => v !== null)),
    1,
  );

  const apexSeries = series.map((s) => ({ 
    name: s.name, 
    data: s.data,
    type: s.type || "area" 
  }));

  // ── Per-series colorStops: cách duy nhất đảm bảo fill gradient đúng màu
  //    riêng biệt cho từng series trong ApexCharts area chart. ────────────────
  const colorStops = colors.map((color) => [
    { offset: 0,   color, opacity: 0.4 },
    { offset: 100, color, opacity: 0.03 },
  ]);

  const options: ApexOptions = {
    chart: {
      type: "line", // Thay đổi từ area sang line để hỗ trợ mixed charts tốt hơn
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      zoom: { enabled: false },
    },
    colors,
    stroke: { 
      show: true,
      curve: "smooth", 
      width: 3, 
      colors: colors, // Ép màu stroke
      dashArray: 0,
    },
    fill: {
      colors: colors, // Ép màu fill
      type: series.map(s => s.type === "line" ? "solid" : "gradient"),
      gradient: {
        shadeIntensity: 0,
        stops: [0, 100],
        colorStops: colors.map((color, idx) => {
          const isLine = series[idx].type === "line";
          return [
            { offset: 0,   color, opacity: isLine ? 0 : 0.4 },
            { offset: 100, color, opacity: isLine ? 0 : 0.05 },
          ];
        }),
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: MONTHS,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "var(--muted-foreground)",
          fontFamily: "inherit",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      min: 0,
      max: maxVal,
      tickAmount: Math.min(maxVal, 5),
      labels: {
        show: !hideYAxis,
        style: {
          colors: "var(--muted-foreground)",
          fontFamily: "inherit",
          fontSize: "12px",
        },
        formatter: (val: number) => (Number.isInteger(val) ? String(val) : ""),
      },
    },
    legend: {
      show: false,
      position: "top",
      horizontalAlign: "right",
      fontFamily: "inherit",
      fontSize: "12px",
      labels: { colors: "var(--foreground)" },
    },
    grid: {
      borderColor: "var(--border)",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: "dark",
      shared: true,
      intersect: false,
      x: { show: true },
      y: {
        formatter: (v) =>
          v >= 1_000_000
            ? `${(v / 1_000_000).toFixed(1)}M ${unit}`.trim()
            : `${Math.round(v).toLocaleString("vi-VN")}${unit ? " " + unit : ""}`,
      },
      marker: { 
        show: true,
        fillColors: colors // Sử dụng fillColors thay vì fillSeriesColor
      },
    },
    markers: { 
      size: 0,
      colors: colors, // Ép màu markers
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { 
        size: 5,
        sizeOffset: 3
      }
    },
  };

  return (
    <Chart
      key={colors.join("-") + series.length + (showLegend ? "L" : "N")}
      options={options}
      series={apexSeries}
      type="line"
      height={height}
      width="100%"
    />
  );
}
