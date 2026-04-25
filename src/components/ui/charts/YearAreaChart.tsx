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

  const apexSeries = series.map((s) => ({ name: s.name, data: s.data }));

  // ── Per-series colorStops: cách duy nhất đảm bảo fill gradient đúng màu
  //    riêng biệt cho từng series trong ApexCharts area chart. ────────────────
  const colorStops = colors.map((color) => [
    { offset: 0,   color, opacity: 0.4 },
    { offset: 100, color, opacity: 0.03 },
  ]);

  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      zoom: { enabled: false },
    },
    colors,
    stroke: { curve: "smooth", width: 2.5, colors },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0,
        stops: [0, 100],
        colorStops,       // ← per-series gradient colors
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
      show: showLegend ?? series.length > 1,
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
      x: { show: true },
      y: {
        formatter: (v) =>
          v >= 1_000_000
            ? `${(v / 1_000_000).toFixed(1)}M ${unit}`.trim()
            : `${Math.round(v).toLocaleString("vi-VN")}${unit ? " " + unit : ""}`,
      },
    },
    markers: { size: 0 },
  };

  return (
    <Chart
      key={colors.join("|") + String(hideYAxis)}
      options={options}
      series={apexSeries}
      type="area"
      height={height}
      width="100%"
    />
  );
}
