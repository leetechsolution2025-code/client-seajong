"use client";
import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { motion } from "framer-motion";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 }
};

export function AnalyticsCharts() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const themeMode = isDarkMode ? "dark" : "light";

  // 1. Budget vs Cost Trend (Area Chart)
  const budgetOptions: ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, background: "transparent", zoom: { enabled: false } },
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100]
      }
    },
    dataLabels: { 
      enabled: false 
    },
    colors: ["#6366f1", "#f43f5e"],
    xaxis: {
      categories: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
      axisBorder: { show: false },
      labels: { style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" } }
    },
    yaxis: { 
      labels: { 
        style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" },
        formatter: (val) => `${val}M`
      } 
    },
    grid: { borderColor: "var(--border)", strokeDashArray: 4 },
    legend: { 
      show: true, 
      position: "top", 
      horizontalAlign: "left",
      labels: { colors: "var(--foreground)", fontFamily: "var(--font-roboto-condensed)" }
    },
    tooltip: { 
      theme: themeMode,
      y: {
        formatter: (val) => Number(val).toLocaleString()
      }
    }
  };

  const budgetSeries = [
    {
      name: "Ngân sách",
      data: [40, 45, 42, 50, 48, 55, 60, 58, 62, 65, 70, 75]
    },
    {
      name: "Chi phí",
      data: [38, 47, 40, 48, 52, 53, 58, 60, 61, 63, 68, 72]
    }
  ];

  // 2. Revenue Trend (Line & Column)
  const revenueOptions: ApexOptions = {
    chart: { type: "line", toolbar: { show: false }, background: "transparent", zoom: { enabled: false } },
    stroke: { width: [0, 4], curve: "smooth" },
    plotOptions: { bar: { borderRadius: 0, columnWidth: "40%" } },
    dataLabels: { enabled: true, enabledOnSeries: [1] },
    labels: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
    colors: ["#6366f1", "#10b981"],
    xaxis: { labels: { style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" } } },
    yaxis: [{
      title: { text: "Kỳ vọng (Tỷ)", style: { color: "#6366f1" } },
      labels: { style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" } }
    }, {
      opposite: true,
      title: { text: "Thực tế (Tỷ)", style: { color: "#10b981" } },
      labels: { style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" } }
    }],
    grid: { borderColor: "var(--border)", strokeDashArray: 4 },
    legend: { position: "top", labels: { colors: "var(--foreground)" } },
    tooltip: {
      theme: themeMode,
      y: {
        formatter: (val) => val !== null ? `${val} Tỷ VNĐ` : "Chưa có dữ liệu"
      }
    }
  };

  const revenueSeries = [
    { name: "Doanh số kỳ vọng", type: "column", data: [1.2, 1.3, 1.1, 1.8, 1.5, 1.7, 1.9, 2.0, 1.8, 2.1, 2.3, 2.5] },
    { name: "Doanh số thực tế", type: "line", data: [0.9, 1.2, 1.0, 2.06, null, null, null, null, null, null, null, null] }
  ];

  // 3. Reach Distribution (Horizontal Bar Chart)
  const reachOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 0,
        barHeight: "60%",
        distributed: true
      }
    },
    colors: ["#1877F2", "#000000", "#4285F4", "#FF0000"],
    dataLabels: {
      enabled: true,
      formatter: (val) => Number(val).toLocaleString(),
      style: {
        fontWeight: 400,
        fontSize: '11px',
        colors: ["#fff"],
        fontFamily: "var(--font-roboto-condensed)"
      },
      dropShadow: { enabled: false }
    },
    xaxis: {
      categories: ["Facebook Ads", "Tiktok Ads", "Google Ads", "Youtube"],
      labels: { 
        show: true,
        style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" },
        formatter: (val) => `${(Number(val) / 1000000).toFixed(1)}M`
      }
    },
    yaxis: {
      labels: { style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" } }
    },
    grid: { borderColor: "var(--border)", strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { 
      theme: themeMode,
      y: {
        formatter: (val) => Number(val).toLocaleString()
      }
    }
  };

  const reachSeries = [{
    name: "Lượt tiếp cận",
    data: [1307921, 1717294, 24492, 259575]
  }];

  // 4. Cost by Channel (Horizontal Bar Chart)
  const channelCostOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent", zoom: { enabled: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 0,
        barHeight: "60%",
        distributed: true
      }
    },
    colors: ["#1877F2", "#6366f1", "#f59e0b", "#10b981", "#000000", "#ec4899", "#4285F4", "#71717a", "#14b8a6"],
    xaxis: {
      categories: ["Facebook Ads", "Media", "POSM", "SEO", "Tiktok Ads", "Nội bộ", "Google Ads", "Trade", "Ecom"],
      labels: { 
        show: true,
        style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" },
        formatter: (val) => `${val}M`
      }
    },
    yaxis: {
      labels: { style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" } }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}M`,
      style: { fontWeight: 400, fontSize: '9px', colors: ["#fff"] },
      dropShadow: { enabled: false }
    },
    grid: { borderColor: "var(--border)", strokeDashArray: 4 },
    legend: { show: false },
    tooltip: {
      theme: themeMode,
      y: { formatter: (val) => `${val} Triệu VNĐ` }
    }
  };

  const channelCostSeries = [{
    name: "Chi phí",
    data: [46.7, 20.3, 17.3, 8.4, 7.9, 4.9, 3.8, 1.9, 1.2]
  }];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 pb-4">
      <div className="row g-4">
        {/* Budget Chart */}
        <div className="col-12 col-lg-8">
          <motion.div variants={item} className="app-card p-4 h-100">
            <h6 className="fw-bold mb-4 text-foreground" style={{ fontFamily: "var(--font-roboto-condensed)" }}>Diễn biến chi phí trong năm</h6>
            <Chart options={budgetOptions} series={budgetSeries} type="area" height={300} />
          </motion.div>
        </div>

        {/* Reach Chart */}
        <div className="col-12 col-lg-4">
          <motion.div variants={item} className="app-card p-4 h-100">
            <h6 className="fw-bold mb-4 text-foreground" style={{ fontFamily: "var(--font-roboto-condensed)" }}>Phân bổ lượt tiếp cận (Reach)</h6>
            <Chart options={reachOptions} series={reachSeries} type="bar" height={200} />
            
            {/* Percentage Bar */}
            <div className="mt-4 pt-2">
              <div className="d-flex" style={{ height: 24, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: "39.5%", background: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-roboto-condensed)" }} title="Facebook Ads: 39.5%">39.5%</div>
                <div style={{ width: "51.9%", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-roboto-condensed)" }} title="Tiktok Ads: 51.9%">51.9%</div>
                <div style={{ width: "7.8%", background: "#FF0000", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-roboto-condensed)" }} title="Youtube: 7.8%">7.8%</div>
                <div style={{ width: "0.8%", background: "#4285F4" }} title="Google Ads: 0.8%"></div>
              </div>
              <div className="d-flex justify-content-between mt-2" style={{ fontSize: 10, color: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" }}>
                <span>Facebook</span>
                <span>Tiktok</span>
                <span>Khác</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Revenue Trend */}
        <div className="col-12 col-lg-8">
          <motion.div variants={item} className="app-card p-4">
            <h6 className="fw-bold mb-4 text-foreground" style={{ fontFamily: "var(--font-roboto-condensed)" }}>Diễn biến doanh số trong năm</h6>
            <Chart options={revenueOptions} series={revenueSeries} type="line" height={300} />
          </motion.div>
        </div>

        {/* Channel Cost Card */}
        <div className="col-12 col-lg-4">
          <motion.div variants={item} className="app-card p-4 h-100">
            <h6 className="fw-bold mb-4 text-foreground" style={{ fontFamily: "var(--font-roboto-condensed)" }}>Tỷ lệ chi phí theo các kênh</h6>
            <Chart options={channelCostOptions} series={channelCostSeries} type="bar" height={300} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
