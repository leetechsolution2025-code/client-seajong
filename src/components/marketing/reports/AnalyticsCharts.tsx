"use client";
import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { motion } from "framer-motion";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.3 } }
};
const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

interface MonthlyBudget  { month: number; value: number; }
interface MonthlyRevenue { month: number; seajong: number; voriger: number; total: number; }
interface PlanTargets {
  monthlyBudget:  MonthlyBudget[];
  monthlyRevenue: MonthlyRevenue[];
  totalBudget:  number;
  totalRevenue: number;
}

export function AnalyticsCharts({ campaigns, filterYear }: { campaigns: any[], filterYear?: string }) {
  const [isDarkMode, setIsDarkMode]   = React.useState(false);
  const [planTargets, setPlanTargets] = React.useState<PlanTargets | null>(null);

  const activeYear = filterYear || new Date().getFullYear().toString();

  // Dark mode detector
  React.useEffect(() => {
    const check = () => setIsDarkMode(
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark")
    );
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Fetch ngân sách kế hoạch & doanh thu mục tiêu từ DB
  React.useEffect(() => {
    fetch(`/api/marketing/plan/targets?year=${activeYear}`)
      .then(r => r.json())
      .then(data => { if (data?.monthlyBudget) setPlanTargets(data); })
      .catch(console.error);
  }, [activeYear]);

  const themeMode    = isDarkMode ? "dark" : "light";
  const allInsights  = campaigns.flatMap(c => c.insights?.data || []);
  const currentMonth = new Date().getMonth(); // 0-indexed

  // ── Tính dữ liệu thực theo tháng ──
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const monthStr = monthNum.toString().padStart(2, "0");

    const inMonth = allInsights.filter(ins =>
      ins.date_start?.startsWith(`${activeYear}-${monthStr}`)
    );

    const spent = inMonth.reduce((s, x) => s + (parseFloat(x.spend)  || 0), 0);
    const leads = inMonth.reduce((s, x) => s + (parseInt(x.leads)    || 0), 0);

    return {
      month:       `T${monthNum}`,
      spent:       i <= currentMonth ? spent : null,
      leads:       i <= currentMonth ? leads : null,
      budgetPlan:  planTargets?.monthlyBudget[i]?.value  || null,
      revenuePlan: planTargets?.monthlyRevenue[i]?.total || null,
    };
  });

  // ── 1. Biểu đồ Chi phí thực tế vs Ngân sách kế hoạch ──
  const hasBudgetPlan = !!(planTargets && planTargets.totalBudget > 0);

  const budgetOptions: ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, background: "transparent", zoom: { enabled: false }, animations: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    fill:   { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [20, 100] } },
    dataLabels: { enabled: false },
    colors: hasBudgetPlan ? ["#6366f1", "#f43f5e"] : ["#f43f5e"],
    xaxis: {
      categories: monthlyData.map(d => d.month),
      labels: { style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" } }
    },
    yaxis: {
      labels: {
        style: { colors: "var(--muted-foreground)", fontFamily: "var(--font-roboto-condensed)" },
        formatter: val => `${(val / 1e6).toFixed(1)}M`
      }
    },
    grid:    { borderColor: "var(--border)", strokeDashArray: 4 },
    legend:  { show: hasBudgetPlan, position: "top", labels: { colors: "var(--foreground)" } },
    tooltip: { theme: themeMode, y: { formatter: val => val !== null ? val.toLocaleString() + " đ" : "Chưa có dữ liệu" } }
  };

  const budgetSeries = hasBudgetPlan
    ? [
        { name: "Kế hoạch", data: monthlyData.map(d => d.budgetPlan) },
        { name: "Thực chi",  data: monthlyData.map(d => d.spent)     }
      ]
    : [{ name: "Thực chi",  data: monthlyData.map(d => d.spent) }];

  // ── 2. Biểu đồ Leads ──
  const leadsOptions: ApexOptions = {
    chart:   { type: "line", toolbar: { show: false }, background: "transparent", zoom: { enabled: false } },
    stroke:  { width: 2, curve: "smooth" },
    colors:  ["#10b981"],
    xaxis:   { categories: monthlyData.map(d => d.month), labels: { style: { colors: "var(--muted-foreground)" } } },
    yaxis:   { labels: { style: { colors: "var(--muted-foreground)" } } },
    grid:    { borderColor: "var(--border)", strokeDashArray: 4 },
    tooltip: { theme: themeMode }
  };
  const leadsSeries = [{ name: "Số Leads", data: monthlyData.map(d => d.leads) }];

  // ── 3. Reach theo kênh ──
  const getPlatformReach = (name: string) =>
    allInsights.filter(i => i.platform?.toLowerCase().includes(name))
               .reduce((s, x) => s + (parseInt(x.reach) || 0), 0);

  const fbReach   = getPlatformReach("facebook");
  const ttReach   = getPlatformReach("tiktok");
  const igReach   = getPlatformReach("instagram");
  const ytReach   = getPlatformReach("youtube");
  const totalReach = fbReach + ttReach + igReach + ytReach || 1;

  const reachOptions: ApexOptions = {
    chart:        { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions:  { bar: { horizontal: true, barHeight: "60%", distributed: true } },
    colors:       ["#1877F2", "#000000", "#E4405F", "#FF0000"],
    xaxis: {
      categories: ["Facebook", "TikTok", "Instagram", "Youtube"],
      labels:     { formatter: val => `${(Number(val) / 1000).toFixed(0)}K` }
    },
    grid:    { borderColor: "var(--border)" },
    legend:  { show: false },
    tooltip: { theme: themeMode }
  };
  const reachSeries = [{ name: "Lượt tiếp cận", data: [fbReach, ttReach, igReach, ytReach] }];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 pb-4">
      <div className="row g-4">

        {/* Chi phí thực tế vs Kế hoạch */}
        <div className="col-12 col-lg-8">
          <motion.div variants={item} className="app-card p-4 h-100">
            <h6 className="fw-bold mb-1 text-foreground">Diễn biến chi phí Marketing (VND)</h6>
            {hasBudgetPlan
              ? <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 12 }}>Ngân sách kế hoạch năm: {planTargets!.totalBudget.toLocaleString("vi-VN")} đ</p>
              : <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 12 }}>Chưa có ngân sách kế hoạch</p>
            }
            <Chart options={budgetOptions} series={budgetSeries} type="area" height={280} />
          </motion.div>
        </div>

        {/* Phân bổ Reach */}
        <div className="col-12 col-lg-4">
          <motion.div variants={item} className="app-card p-4 h-100">
            <h6 className="fw-bold mb-4 text-foreground">Phân bổ lượt tiếp cận (Reach)</h6>
            <Chart options={reachOptions} series={reachSeries} type="bar" height={200} />
            <div className="mt-4 pt-2">
              <div className="d-flex" style={{ height: 22, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${fbReach / totalReach * 100}%`, background: "#1877F2" }} />
                <div style={{ width: `${ttReach / totalReach * 100}%`, background: "#000000" }} />
                <div style={{ width: `${igReach / totalReach * 100}%`, background: "#E4405F" }} />
                <div style={{ width: `${ytReach / totalReach * 100}%`, background: "#FF0000" }} />
              </div>
              <div className="d-flex justify-content-between mt-2" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                <span>Facebook ({(fbReach / totalReach * 100).toFixed(1)}%)</span>
                <span>TikTok ({(ttReach / totalReach * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Leads Trend */}
        <div className="col-12 col-lg-8">
          <motion.div variants={item} className="app-card p-4">
            <h6 className="fw-bold mb-4 text-foreground">Diễn biến số lượng Leads trong năm</h6>
            <Chart options={leadsOptions} series={leadsSeries} type="line" height={280} />
          </motion.div>
        </div>

        {/* Reach theo kênh (dạng list) */}
        <div className="col-12 col-lg-4">
          <motion.div variants={item} className="app-card p-4 h-100">
            <h6 className="fw-bold mb-4 text-foreground">Hiệu quả theo kênh (Reach)</h6>
            <div className="d-flex flex-column gap-3 mt-2">
              {[
                { name: "Facebook",  val: fbReach, color: "#1877F2" },
                { name: "TikTok",    val: ttReach, color: "#000000" },
                { name: "Instagram", val: igReach, color: "#E4405F" },
                { name: "Youtube",   val: ytReach, color: "#FF0000" }
              ].map(p => (
                <div key={p.name} className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
                    <span style={{ fontSize: 13 }}>{p.name}</span>
                  </div>
                  <span className="fw-bold" style={{ fontSize: 13 }}>{p.val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}
