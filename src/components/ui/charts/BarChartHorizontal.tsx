"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Props {
  data: { label: string; value: number }[];
  title?: string;
  color?: string;
  colors?: string[];
  rowHeight?: number;
}

import { SectionTitle } from "@/components/ui/SectionTitle";

export function BarChartHorizontal({ data, title, color = "#f43f5e", colors, rowHeight = 48 }: Props) {
  const isDistributed = Array.isArray(colors) && colors.length > 0;
  const chartHeight = data.length * rowHeight + (data.length < 5 ? 25 : 0);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 0,
        barHeight: "60%",    // 60% × 50px = 30px — đồng đều mọi chart
        distributed: isDistributed,
        dataLabels: { position: "top" },
      },
    },
    colors: isDistributed ? colors : [color],
    legend: { show: false },
    dataLabels: {
      enabled: false,
    },
    stroke: { show: false },
    xaxis: {
      categories: data.map((d) => d.label),
      tickAmount: Math.max(...data.map(d => d.value)) > 0 ? Math.min(Math.max(...data.map(d => d.value)), 5) : 5,
      labels: {
        style: { colors: "var(--muted-foreground)", fontFamily: "inherit" },
        formatter: function (val) {
          const num = Number(val);
          if (isNaN(num)) return val.toString();
          if (Math.floor(num) !== num) return ""; // Ẩn nhãn thập phân
          if (num >= 1e9) return (num / 1e9).toFixed(1) + " tỷ";
          if (num >= 1e6) return (num / 1e6).toFixed(1) + " tr";
          if (num >= 1e3) return (num / 1e3).toFixed(0) + "k";
          return num.toLocaleString("vi-VN");
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "var(--foreground)", fontWeight: 500, fontFamily: "inherit" },
      },
    },
    grid: {
      borderColor: "var(--border)",
      strokeDashArray: 0,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { left: 0, right: 4 },
    },
    tooltip: {
      theme: "light",
      x: { show: true },
      y: {
        title: { formatter: () => "" },
        formatter: (val: number) => {
          if (val >= 1e9) return (val / 1e9).toFixed(2) + " tỷ";
          if (val >= 1e6) return (val / 1e6).toFixed(2) + " tr";
          return val.toLocaleString("vi-VN");
        }
      }
    },
  };

  const series = [
    {
      name: "Nhân viên",
      data: data.map((d) => d.value),
    },
  ];

  return (
    <div className="w-100">
      {title && <SectionTitle title={title} className="mx-2" />}
      <Chart options={options} series={series} type="bar" height={chartHeight} width="100%" />
    </div>
  );
}
