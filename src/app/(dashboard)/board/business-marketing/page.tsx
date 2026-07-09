"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { StandardPage } from "@/components/layout/StandardPage";
import { BrandButton } from "@/components/ui/BrandButton";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { YearAreaChart } from "@/components/ui/charts/YearAreaChart";
import { Table, TableColumn } from "@/components/ui/Table";

const STEP_ITEMS: ModernStepItem[] = [
  { num: 1, id: "marketing", title: "Hoạt động marketing", desc: "Chi phí & Phễu chuyển đổi", icon: "bi-megaphone" },
  { num: 2, id: "sales", title: "Hoạt động kinh doanh", desc: "Doanh số & Chiến dịch", icon: "bi-graph-up-arrow" },
];

interface MarketingCampaign {
  name: string;
  channel: string;
  spend: number;
  leads: number;
  revenue: number;
  roi: string;
  status: string;
  month: number;
}

// Actual database campaigns used instead

const renderChannelIcon = (channelName: string, dbIcon?: string | null, size = 14, marginClass = "me-2") => {
  const name = channelName.toLowerCase();

  // Prioritize official brand logos if the name matches
  if (name.includes("facebook")) {
    return <i className={`bi bi-facebook ${marginClass} text-primary`} style={{ fontSize: size, color: "#1877f2" }} />;
  } else if (name.includes("youtube")) {
    return <i className={`bi bi-youtube ${marginClass} text-danger`} style={{ fontSize: size, color: "#ff0000" }} />;
  } else if (name.includes("tiktok")) {
    return <i className={`bi bi-tiktok ${marginClass} text-dark`} style={{ fontSize: size }} />;
  } else if (name.includes("google")) {
    return <i className={`bi bi-google ${marginClass} text-success`} style={{ fontSize: size, color: "#ea4335" }} />;
  } else if (name.includes("đa kênh") || name === "multiple") {
    return <i className={`bi bi-grid-fill ${marginClass} text-info`} style={{ fontSize: size }} />;
  } else if (name.includes("crm")) {
    return <i className={`bi bi-person-lines-fill ${marginClass} text-warning`} style={{ fontSize: size }} />;
  }

  // Fallback to custom DB icon if it's not a generic folder icon
  if (dbIcon && dbIcon.startsWith("bi-") && !dbIcon.includes("folder")) {
    return <i className={`bi ${dbIcon} ${marginClass} text-muted`} style={{ fontSize: size }} />;
  }

  // General default icon
  return <i className={`bi bi-globe ${marginClass} text-muted`} style={{ fontSize: size }} />;
};

// Actual database stats used instead

const CAMPAIGN_COLUMNS: TableColumn<any>[] = [
  {
    header: "Chiến dịch",
    width: "180px",
    align: "left",
    render: (row) => (
      <div className="d-flex flex-column" style={{ gap: "2px", maxWidth: "180px" }}>
        <span className="fw-bold text-dark text-truncate d-block" style={{ fontSize: 12.5 }}>{row.name}</span>
        <span className="text-muted d-flex flex-wrap align-items-center" style={{ fontSize: 10, gap: "4px 10px" }}>
          {row.channels.map((chan: string, idx: number) => (
            <span key={idx} className="d-inline-flex align-items-center">
              {renderChannelIcon(chan, null, 11, "me-1")}
              {chan}
            </span>
          ))}
        </span>
      </div>
    )
  },
  {
    header: "Thực chi",
    width: "120px",
    align: "right",
    render: (row) => <span className="font-monospace text-dark fw-semibold" style={{ fontSize: 12 }}>{row.spend.toLocaleString("vi-VN")} đ</span>
  },
  {
    header: "Leads",
    width: "80px",
    align: "center",
    render: (row) => <span className="font-monospace fw-semibold text-primary" style={{ fontSize: 12 }}>{row.leads}</span>
  },
  {
    header: "Doanh số",
    width: "130px",
    align: "right",
    render: (row) => <span className="font-monospace text-success fw-semibold" style={{ fontSize: 12 }}>{row.revenue.toLocaleString("vi-VN")} đ</span>
  },
  {
    header: "Trạng thái",
    width: "110px",
    align: "center",
    render: (row) => {
      const isActive = row.status === "Đang chạy" || row.status === "Active" || row.status === "active";
      return (
        <span className={`badge rounded-pill ${isActive ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`} style={{ fontSize: 10 }}>
          {isActive ? "Đang chạy" : "Tạm dừng"}
        </span>
      );
    }
  }
];

const CONTRACT_COLUMNS: TableColumn<any>[] = [
  {
    header: "Hợp đồng & Khách hàng",
    width: "220px",
    align: "left",
    render: (row) => (
      <div className="d-flex flex-column" style={{ gap: "2px", maxWidth: "220px" }}>
        <span className="fw-bold text-dark text-truncate d-block" style={{ fontSize: 12.5 }}>
          {row.customer?.name || "Khách hàng doanh nghiệp"}
        </span>
        <span className="text-muted text-truncate d-block" style={{ fontSize: 10.5 }} title={row.customer?.address || row.address || ""}>
          {row.customer?.address || row.address || "Chưa cập nhật địa chỉ"}
        </span>
      </div>
    )
  },
  {
    header: "Giá trị cam kết",
    width: "140px",
    align: "right",
    render: (row) => <span className="font-monospace text-dark fw-semibold" style={{ fontSize: 12 }}>{row.giaTriHopDong.toLocaleString("vi-VN")} đ</span>
  },
  {
    header: "Ngày ký",
    width: "110px",
    align: "center",
    render: (row) => {
      const date = row.ngayKy ? new Date(row.ngayKy) : new Date(row.createdAt);
      return <span className="text-muted" style={{ fontSize: 12 }}>{date.toLocaleDateString("vi-VN")}</span>;
    }
  },
  {
    header: "Trạng thái",
    width: "120px",
    align: "center",
    render: (row) => {
      const statusMap: Record<string, { label: string; class: string }> = {
        active: { label: "Hiệu lực", class: "bg-success-subtle text-success" },
        pending: { label: "Chờ duyệt", class: "bg-warning-subtle text-warning" },
        done: { label: "Hoàn thành", class: "bg-info-subtle text-info" },
        expired: { label: "Hết hạn", class: "bg-secondary-subtle text-secondary" }
      };
      const mapped = statusMap[row.trangThai?.toLowerCase()] || { label: row.trangThai || "Hiệu lực", class: "bg-success-subtle text-success" };
      return (
        <span className={`badge rounded-pill ${mapped.class}`} style={{ fontSize: 10 }}>
          {mapped.label}
        </span>
      );
    }
  }
];



const QUOTATION_COLUMNS: TableColumn<any>[] = [
  {
    header: "Mã BG / Khách hàng",
    width: "250px",
    render: (row) => (
      <div className="d-flex flex-column">
        <span className="fw-bold text-dark" style={{ fontSize: 13 }}>{row.code || "N/A"}</span>
        <span className="text-muted text-truncate" style={{ fontSize: 11, maxWidth: "250px" }}>
          {row.customer?.name || "Khách lẻ"}
        </span>
      </div>
    )
  },
  {
    header: "Tổng tiền",
    width: "140px",
    align: "right",
    render: (row) => <span className="font-monospace text-dark fw-semibold" style={{ fontSize: 12 }}>{row.tongTien?.toLocaleString("vi-VN")} đ</span>
  },
  {
    header: "Hiệu lực đến",
    width: "110px",
    align: "center",
    render: (row) => {
      if (!row.hieuLucDen) return <span className="text-muted" style={{ fontSize: 12 }}>-</span>;
      return <span className="text-muted" style={{ fontSize: 12 }}>{new Date(row.hieuLucDen).toLocaleDateString("vi-VN")}</span>;
    }
  },
  {
    header: "Trạng thái",
    width: "120px",
    align: "center",
    render: (row) => {
      const statusMap: Record<string, { label: string; class: string }> = {
        draft: { label: "Nháp", class: "bg-secondary-subtle text-secondary" },
        sent: { label: "Đã gửi", class: "bg-primary-subtle text-primary" },
        accepted: { label: "Chấp nhận", class: "bg-success-subtle text-success" },
        rejected: { label: "Từ chối", class: "bg-danger-subtle text-danger" }
      };
      const mapped = statusMap[row.trangThai?.toLowerCase()] || { label: row.trangThai || "Mới", class: "bg-light text-dark" };
      return (
        <span className={`badge rounded-pill ${mapped.class}`} style={{ fontSize: 10 }}>
          {mapped.label}
        </span>
      );
    }
  }
];

export default function BoardBusinessMarketingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const currentStepId = useMemo(() => STEP_ITEMS.find((s) => s.num === currentStep)?.id || "marketing", [currentStep]);

  // Toolbar Filter States
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedChannel, setSelectedChannel] = useState<string>("Tất cả");
  const [selectedStatus, setSelectedStatus] = useState<string>("Tất cả");
  const [salesMode, setSalesMode] = useState<"Đại lý" | "Bán hàng">("Đại lý");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");

  // Database-driven States
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [dbChannels, setDbChannels] = useState<any[]>([]);

  // Sales Database-driven States
  const [salesData, setSalesData] = useState<{contracts: any[], customers: any[], leads: any[], careHistories: any[], saleOrders?: any[], quotations?: any[], orderStatuses?: any[]} | null>(null);

  const ORDER_COLUMNS: TableColumn<any>[] = useMemo(() => [
    {
      header: "Khách hàng / Địa chỉ",
      width: "250px",
      render: (row: any) => (
        <div className="d-flex flex-column">
          <span className="fw-bold text-dark" style={{ fontSize: 13 }}>{row.customer?.name || "Khách lẻ"}</span>
          <span className="text-muted text-truncate" style={{ fontSize: 11, maxWidth: "250px" }}>
            {row.customer?.address || "Chưa cập nhật địa chỉ"}
          </span>
        </div>
      )
    },
    {
      header: "Tổng tiền",
      width: "140px",
      align: "right",
      render: (row: any) => <span className="font-monospace text-dark fw-semibold" style={{ fontSize: 12 }}>{row.tongTien?.toLocaleString("vi-VN")} đ</span>
    },
    {
      header: "Ngày đặt",
      width: "110px",
      align: "center",
      render: (row: any) => {
        const date = row.ngayDat ? new Date(row.ngayDat) : new Date(row.createdAt);
        return <span className="text-muted" style={{ fontSize: 12 }}>{date.toLocaleDateString("vi-VN")}</span>;
      }
    },
    {
      header: "Trạng thái",
      width: "120px",
      align: "center",
      render: (row: any) => {
        const categoryStatus = salesData?.orderStatuses?.find((s: any) => s.code.toLowerCase() === row.trangThai?.toLowerCase());
        if (categoryStatus) {
          return (
            <span className="badge rounded-pill" style={{ fontSize: 10, backgroundColor: categoryStatus.color || "#6366f1", color: "#fff" }}>
              {categoryStatus.name}
            </span>
          );
        }
        const statusMap: Record<string, { label: string; class: string }> = {
          draft: { label: "Nháp", class: "bg-secondary-subtle text-secondary" },
          pending: { label: "Chờ duyệt", class: "bg-warning-subtle text-warning" },
          approved: { label: "Đã duyệt", class: "bg-info-subtle text-info" },
          active: { label: "Đang thực hiện", class: "bg-primary-subtle text-primary" },
          completed: { label: "Hoàn thành", class: "bg-success-subtle text-success" },
          cancelled: { label: "Đã hủy", class: "bg-danger-subtle text-danger" }
        };
        const mapped = statusMap[row.trangThai?.toLowerCase()] || { label: row.trangThai || "Mới", class: "bg-light text-dark" };
        return (
          <span className={`badge rounded-pill ${mapped.class}`} style={{ fontSize: 10 }}>
            {mapped.label}
          </span>
        );
      }
    }
  ], [salesData?.orderStatuses]);

  useEffect(() => {
    fetch("/api/board/sales")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSalesData(data);
        }
      })
      .catch((err) => console.error("Error fetching sales data:", err));
  }, []);

  // Sales Stats
  const salesStats = useMemo(() => {
    if (!salesData) return { totalRevenue: 0, contractCount: 0, negotiatingCount: 0, officialCount: 0 };
    const totalRevenue = salesData.contracts.reduce((sum, c) => sum + (c.giaTriHopDong || 0), 0);
    const contractCount = salesData.contracts.length;
    const negotiatingCount = salesData.leads.filter((l: any) => l.status === "step_3").length;
    const officialCount = salesData.leads.filter((l: any) => l.status === "step_5" || l.status === "step_4").length;
    return { totalRevenue, contractCount, negotiatingCount, officialCount };
  }, [salesData]);

  const salesOrderStats = useMemo(() => {
    if (!salesData) return { totalOrderValue: 0, quotationCount: 0, pendingOrderCount: 0 };
    const totalOrderValue = (salesData.saleOrders || []).reduce((sum: number, o: any) => sum + (o.tongTien || 0), 0);
    const quotationCount = (salesData.quotations || []).length;
    const pendingOrderCount = (salesData.saleOrders || []).filter((o: any) => o.trangThai === "pending" || o.trangThai === "Chờ duyệt").length;
    return { totalOrderValue, quotationCount, pendingOrderCount };
  }, [salesData]);

  const pipelineStats = useMemo(() => {
    if (!salesData) return [0, 0, 0, 0, 0];
    
    // 5. Đại lý chính thức: Hợp đồng đã hiệu lực
    const activeContracts = salesData.contracts.filter((c: any) => !["pending", "cancelled", "chờ duyệt", "hủy"].includes(c.trangThai?.toLowerCase()));
    const step5 = activeContracts.length;
    
    // 4. Chờ duyệt ký HĐ: Hợp đồng pending + bước 5
    const pendingContracts = salesData.contracts.filter((c: any) => ["pending", "chờ duyệt"].includes(c.trangThai?.toLowerCase()));
    const step4 = pendingContracts.length + step5;
    
    // 3. Đàm phán chính sách: Lead đang đàm phán + bước 4
    const negotiatingLeads = salesData.leads.filter((l: any) => l.status === "step_3" || l.status === "negotiating");
    const step3 = negotiatingLeads.length + step4;
    
    // 2. Tìm hiểu nhu cầu: Số partner được chăm sóc + bước 3
    const caredPartnerIds = new Set(salesData.careHistories.map((h: any) => h.partnerId || h.customerId || h.id));
    const step2 = caredPartnerIds.size + step3;
    
    // 1. Tiếp cận đối tác: Tổng leads mới + bước 2
    const step1 = salesData.leads.length + step2;
    
    return [step1, step2, step3, step4, step5];
  }, [salesData]);

  const monthlyOfficialAgents = useMemo(() => {
    const data = new Array(12).fill(0);
    if (!salesData) return data;
    salesData.contracts.forEach((c: any) => {
      const dateStr = c.ngayKy || c.createdAt;
      if (dateStr) {
        const month = new Date(dateStr).getMonth();
        data[month]++;
      }
    });
    return data;
  }, [salesData]);

  const officialAgentsChartOptions: any = useMemo(() => ({
    chart: {
      type: 'bar',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '50%',
      }
    },
    colors: ['#10b981'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
      labels: { style: { fontSize: '10px' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { 
        style: { fontSize: '10px' },
        formatter: (val: number) => (val % 1 === 0 ? val.toString() : '')
      },
      min: 0,
      forceNiceScale: true,
      decimalsInFloat: 0,
    },
    grid: {
      borderColor: '#f1f1f1',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      padding: { top: 0, right: 10, bottom: 0, left: 10 }
    }
  }), []);

  useEffect(() => {
    fetch("/api/board/marketing/campaigns")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCampaigns(data.campaigns || []);
          setInsights(data.insights || []);
          setContracts(data.contracts || []);
          setDbChannels(data.categories || []);
        }
      })
      .catch((err) => console.error("Error fetching marketing data:", err));
  }, []);

  // Parse actual database campaigns and insights into standard schema
  const dynamicCampaigns = useMemo(() => {
    const parsedCampaigns: MarketingCampaign[] = [];

    // Calculate monthly totals for attribution
    const monthlyTotals: Record<number, { totalLeads: number; totalSpend: number; totalRevenue: number }> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyTotals[m] = { totalLeads: 0, totalSpend: 0, totalRevenue: 0 };
    }

    // Accumulate monthly revenue from actual contracts
    contracts.forEach((c: any) => {
      const date = c.ngayKy ? new Date(c.ngayKy) : new Date(c.createdAt);
      const m = date.getMonth() + 1;
      if (m >= 1 && m <= 12) {
        monthlyTotals[m].totalRevenue += c.giaTriHopDong;
      }
    });

    // Accumulate monthly spend and leads from actual insights
    insights.forEach((ins: any) => {
      const date = new Date(ins.date);
      const m = date.getMonth() + 1;
      if (m >= 1 && m <= 12) {
        monthlyTotals[m].totalSpend += ins.spend || 0;
        monthlyTotals[m].totalLeads += ins.leads || 0;
      }
    });

    // Process campaigns
    campaigns.forEach((camp: any) => {
      const campInsights = insights.filter((ins: any) => ins.campaignId === camp.id);

      // Group insights by month and platform
      const insightsByMonthAndPlatform: Record<string, any[]> = {};
      campInsights.forEach((ins: any) => {
        const m = new Date(ins.date).getMonth() + 1;
        const platform = ins.platform || camp.platform || "Khác";
        const key = `${m}_${platform}`;
        if (!insightsByMonthAndPlatform[key]) insightsByMonthAndPlatform[key] = [];
        insightsByMonthAndPlatform[key].push(ins);
      });

      const keys = Object.keys(insightsByMonthAndPlatform);
      if (keys.length > 0) {
        keys.forEach((key) => {
          const [mStr, platform] = key.split("_");
          const m = Number(mStr);
          const platformIns = insightsByMonthAndPlatform[key];
          const spend = platformIns.reduce((s, i) => s + (i.spend || 0), 0);
          const leads = platformIns.reduce((s, i) => s + (i.leads || 0), 0);

          let revenue = 0;
          const totalLeadsM = monthlyTotals[m].totalLeads;
          const totalSpendM = monthlyTotals[m].totalSpend;
          const totalRevenueM = monthlyTotals[m].totalRevenue;

          if (totalLeadsM > 0) {
            revenue = (leads / totalLeadsM) * totalRevenueM;
          } else if (totalSpendM > 0) {
            revenue = (spend / totalSpendM) * totalRevenueM;
          }

          let channel = platform;
          if (channel.toLowerCase() === "facebook") channel = "Facebook Ads";
          else if (channel.toLowerCase() === "google") channel = "Google Ads";
          else if (channel.toLowerCase() === "tiktok") channel = "Tiktok Ads";
          else if (channel.toLowerCase() === "youtube") channel = "Youtube Ads";
          else if (channel.toLowerCase() === "instagram") channel = "Instagram Ads";
          else {
            const matchedCat = dbChannels.find((cat: any) => {
              const dbName = cat.name.toLowerCase();
              const campChan = channel.toLowerCase();
              return dbName.includes(campChan) || campChan.includes(dbName);
            });
            if (matchedCat) {
              channel = matchedCat.name;
            }
          }

          const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
          parsedCampaigns.push({
            name: `${camp.name} (${platformLabel}) - T${m}`,
            channel,
            spend,
            leads,
            revenue,
            roi: spend > 0 ? `${(revenue / spend).toFixed(1)}x` : "0.0x",
            status: camp.status === "ACTIVE" || camp.status === "active" ? "Đang chạy" : "Tạm dừng",
            month: m
          });
        });
      } else {
        let channel = camp.platform || "Khác";
        if (channel.toLowerCase() === "multiple") {
          channel = "Đa kênh";
        } else if (channel.toLowerCase() === "crm") {
          channel = "Chiến dịch CRM";
        }

        const matchedCat = dbChannels.find((cat: any) => {
          const dbName = cat.name.toLowerCase();
          const campChan = channel.toLowerCase();
          return dbName.includes(campChan) || campChan.includes(dbName);
        });
        if (matchedCat) {
          channel = matchedCat.name;
        }

        parsedCampaigns.push({
          name: camp.name,
          channel,
          spend: 0,
          leads: 0,
          revenue: 0,
          roi: "0.0x",
          status: camp.status === "ACTIVE" || camp.status === "active" ? "Đang chạy" : "Tạm dừng",
          month: 6
        });
      }
    });

    return parsedCampaigns;
  }, [campaigns, insights, contracts, dbChannels]);

  // Dynamically compute budget allocation based on DB channels
  const dynamicBudgetAllocation = useMemo(() => {
    if (dbChannels.length === 0) {
      return [];
    }
    return dbChannels.map((cat) => {
      const name = cat.name.toLowerCase();
      // Find campaigns for this channel/category in the current month (or all months if selectedMonth is 0)
      const channelCampaigns = dynamicCampaigns.filter(camp => {
        const matchesChannel = camp.channel === cat.name;
        const matchesMonth = selectedMonth === 0 || camp.month === selectedMonth;
        return matchesChannel && matchesMonth;
      });

      const spend = channelCampaigns.reduce((sum, camp) => sum + camp.spend, 0);

      // Sum the actual budget of campaigns in the database for this channel
      const budget = campaigns.reduce((sum, c) => {
        const platform = (c.platform || "Khác").toLowerCase();
        if (platform === "multiple") {
          const activePlatforms = Array.from(new Set(insights.filter(ins => ins.campaignId === c.id).map(ins => (ins.platform || "").toLowerCase())));
          const platformCount = activePlatforms.length || 1;
          const matchPlatform = activePlatforms.some(p => {
            return name.includes(p) || p.includes(name);
          });
          return sum + (matchPlatform ? (c.budget / platformCount) : 0);
        } else {
          const matchedCat = dbChannels.find((ch: any) => {
            const dbName = ch.name.toLowerCase();
            return dbName.includes(platform) || platform.includes(dbName);
          });
          const matchesChannel = matchedCat && matchedCat.name === cat.name;
          return sum + (matchesChannel ? (c.budget || 0) : 0);
        }
      }, 0);

      let color = cat.color || "#6366f1";
      if (name.includes("facebook")) {
        if (!cat.color) color = "#3b82f6";
      } else if (name.includes("google")) {
        if (!cat.color) color = "#10b981";
      } else if (name.includes("tiktok") || name.includes("youtube") || name.includes("pr") || name.includes("kol") || name.includes("ads")) {
        if (!cat.color) color = "#f59e0b";
      }

      return {
        channel: cat.name,
        dbIcon: cat.icon,
        spend,
        budget,
        color
      };
    });
  }, [dbChannels, dynamicCampaigns, selectedMonth, campaigns, insights]);

  // Filter campaigns by month, channel, and status
  const filteredCampaigns = useMemo(() => {
    let result = dynamicCampaigns;
    if (selectedMonth !== 0) {
      result = result.filter(camp => camp.month === selectedMonth);
    }
    if (selectedChannel !== "Tất cả") {
      result = result.filter(camp => camp.channel === selectedChannel);
    }
    if (selectedStatus !== "Tất cả") {
      const matchVal = selectedStatus === "Active" ? "Đang chạy" : "Tạm dừng";
      result = result.filter(camp => camp.status === matchVal);
    }
    return result;
  }, [dynamicCampaigns, selectedMonth, selectedChannel, selectedStatus]);

  // Group the filteredCampaigns to display multi-channel campaigns once in the table
  const displayCampaigns = useMemo(() => {
    const grouped: Record<string, {
      name: string;
      month: number;
      status: string;
      channels: string[];
      spend: number;
      leads: number;
      revenue: number;
    }> = {};

    filteredCampaigns.forEach((camp) => {
      const parentName = camp.name.replace(/\s\([^)]+\)/g, "");
      const key = `${parentName}_${camp.month}`;

      if (!grouped[key]) {
        grouped[key] = {
          name: parentName,
          month: camp.month,
          status: camp.status,
          channels: [],
          spend: 0,
          leads: 0,
          revenue: 0
        };
      }

      grouped[key].channels.push(camp.channel);
      grouped[key].spend += camp.spend;
      grouped[key].leads += camp.leads;
      grouped[key].revenue += camp.revenue;
    });

    return Object.values(grouped).map(group => ({
      ...group,
      channels: Array.from(new Set(group.channels))
    }));
  }, [filteredCampaigns]);

  // Compute dynamic stats based on filters
  const dynamicStats = useMemo(() => {
    const spend = filteredCampaigns.reduce((sum, camp) => sum + camp.spend, 0);
    const leads = filteredCampaigns.reduce((sum, camp) => sum + camp.leads, 0);
    const revenue = filteredCampaigns.reduce((sum, camp) => sum + camp.revenue, 0);
    const cpl = leads > 0 ? Math.round(spend / leads) : 0;
    return { spend, leads, revenue, cpl };
  }, [filteredCampaigns]);

  // Format Helpers
  const formatVND = (value: number) => {
    return value.toLocaleString("vi-VN") + " đ";
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString("vi-VN");
  };

  // Compute dynamic trend chart series
  const dynamicChartSeries = useMemo(() => {
    const leadsData = Array(12).fill(null);
    const revenueData = Array(12).fill(null);

    for (let m = 1; m <= 12; m++) {
      const monthCampaigns = dynamicCampaigns.filter(camp => {
        const matchesMonth = camp.month === m;
        const matchesChannel = selectedChannel === "Tất cả" || camp.channel === selectedChannel;
        return matchesMonth && matchesChannel;
      });

      const monthLeads = monthCampaigns.reduce((sum, camp) => sum + camp.leads, 0);
      const monthRevenue = monthCampaigns.reduce((sum, camp) => sum + camp.revenue, 0);

      leadsData[m - 1] = monthLeads > 0 ? monthLeads : null;
      revenueData[m - 1] = monthRevenue > 0 ? Number((monthRevenue / 100000000).toFixed(1)) : null;
    }

    return [
      {
        name: "Số lượng Leads",
        data: leadsData,
        color: "#3b82f6",
      },
      {
        name: "Doanh thu (trăm triệu đồng)",
        data: revenueData,
        color: "#10b981",
      },
    ];
  }, [dynamicCampaigns, selectedChannel]);

  const renderBudgetAllocation = () => {
    return (
      <div className="d-flex flex-column gap-3">
        {dynamicBudgetAllocation.map((item, idx) => {
          const pct = (item.budget > 0 ? Math.round((item.spend / item.budget) * 100) : 0) + "%";
          return (
            <div key={idx}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="d-flex align-items-center" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>
                  {renderChannelIcon(item.channel, item.dbIcon, 14, "me-2")}
                  {item.channel}
                </span>
                <div className="d-flex align-items-center gap-2">
                  <span className="font-monospace text-muted" style={{ fontSize: 11 }}>
                    {item.spend.toLocaleString("vi-VN")} / {item.budget.toLocaleString("vi-VN")} đ
                  </span>
                  <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 99, background: `${item.color}15`, color: item.color, fontWeight: 700 }}>
                    {pct}
                  </span>
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: pct,
                  background: item.color,
                  borderRadius: 99
                }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderToolbar = () => {
    if (currentStepId === "marketing") {
      return (
        <div className="d-flex flex-wrap align-items-center gap-3 pb-2 border-bottom w-100">
          {/* Left side: Month & Channel Filters */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Month Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "115px", outline: "none", boxShadow: "none" }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              <option value={0}>Tất cả các tháng</option>
              <option value={1}>Tháng 1</option>
              <option value={2}>Tháng 2</option>
              <option value={3}>Tháng 3</option>
              <option value={4}>Tháng 4</option>
              <option value={5}>Tháng 5</option>
              <option value={6}>Tháng 6</option>
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

            {/* Channel Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "115px", outline: "none", boxShadow: "none" }}
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
            >
              <option value="Tất cả">Tất cả các kênh</option>
              {dbChannels.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Right side: KPI labels separated by | with icons */}
          <div className="d-flex align-items-center gap-2 text-muted ms-auto flex-wrap" style={{ fontSize: 12.5, fontWeight: 500 }}>
            <span className="d-flex align-items-center">
              <i className="bi bi-megaphone me-1 text-primary" style={{ fontSize: 13 }} />
              Chi phí: <strong className="text-dark font-monospace ms-1">{formatVND(dynamicStats.spend)}</strong>
            </span>
            <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
            <span className="d-flex align-items-center">
              <i className="bi bi-people me-1 text-success" style={{ fontSize: 13 }} />
              Leads: <strong className="text-dark font-monospace ms-1">{formatNumber(dynamicStats.leads)}</strong>
            </span>
            <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
            <span className="d-flex align-items-center">
              <i className="bi bi-tags me-1 text-warning" style={{ fontSize: 13 }} />
              CPL: <strong className="text-dark font-monospace ms-1">{formatVND(dynamicStats.cpl)}</strong>
            </span>
            <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
            <span className="d-flex align-items-center">
              <i className="bi bi-graph-up-arrow me-1 text-info" style={{ fontSize: 13 }} />
              Doanh thu: <strong className="text-dark font-monospace ms-1">{formatVND(dynamicStats.revenue)}</strong>
            </span>
          </div>
        </div>
      );
    }

    if (currentStepId === "sales") {
      return (
        <div className="d-flex flex-wrap align-items-center gap-3 pb-1 border-bottom w-100">
          {/* Left side: Month Filter & Mode Toggle */}
          <div className="d-flex flex-wrap align-items-center gap-3">
            {/* Month Filter */}
            <select
              className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
              style={{ fontSize: 12, cursor: "pointer", width: "115px", outline: "none", boxShadow: "none" }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              <option value={0}>Tất cả các tháng</option>
              <option value={1}>Tháng 1</option>
              <option value={2}>Tháng 2</option>
              <option value={3}>Tháng 3</option>
              <option value={4}>Tháng 4</option>
              <option value={5}>Tháng 5</option>
              <option value={6}>Tháng 6</option>
            </select>

            {/* Vertical Divider */}
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />

            {/* Mode Radio Buttons */}
            <div className="d-flex align-items-center gap-3">
              <label className="d-flex align-items-center gap-1 mb-0" style={{ fontSize: 12, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="salesMode"
                  value="Đại lý"
                  checked={salesMode === "Đại lý"}
                  onChange={(e) => setSalesMode(e.target.value as "Đại lý" | "Bán hàng")}
                  className="form-check-input mt-0"
                  style={{ width: "14px", height: "14px" }}
                />
                <span className={salesMode === "Đại lý" ? "fw-bold text-primary" : "text-muted fw-semibold"}>Đại lý</span>
              </label>
              <label className="d-flex align-items-center gap-1 mb-0" style={{ fontSize: 12, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="salesMode"
                  value="Bán hàng"
                  checked={salesMode === "Bán hàng"}
                  onChange={(e) => setSalesMode(e.target.value as "Đại lý" | "Bán hàng")}
                  className="form-check-input mt-0"
                  style={{ width: "14px", height: "14px" }}
                />
                <span className={salesMode === "Bán hàng" ? "fw-bold text-primary" : "text-muted fw-semibold"}>Bán hàng</span>
              </label>
            </div>
          </div>

          {/* Right side: KPI labels separated by | with icons */}
          <div className="d-flex align-items-center gap-2 text-muted ms-auto flex-wrap" style={{ fontSize: 12.5, fontWeight: 500 }}>
            {salesMode === "Đại lý" ? (
              <>
                <span className="d-flex align-items-center">
                  <i className="bi bi-wallet2 me-1 text-success" style={{ fontSize: 13 }} />
                  Doanh số ký kết: <strong className="text-dark font-monospace ms-1">{formatVND(salesStats.totalRevenue)}</strong>
                </span>
                <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
                <span className="d-flex align-items-center">
                  <i className="bi bi-file-earmark-text me-1 text-primary" style={{ fontSize: 13 }} />
                  Hợp đồng mới: <strong className="text-dark font-monospace ms-1">{formatNumber(salesStats.contractCount)}</strong>
                </span>
                <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
                <span className="d-flex align-items-center">
                  <i className="bi bi-chat-dots me-1 text-warning" style={{ fontSize: 13 }} />
                  Đang đàm phán: <strong className="text-dark font-monospace ms-1">{formatNumber(salesStats.negotiatingCount)}</strong>
                </span>
                <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
                <span className="d-flex align-items-center">
                  <i className="bi bi-patch-check me-1 text-info" style={{ fontSize: 13 }} />
                  Đại lý chính thức: <strong className="text-dark font-monospace ms-1">{formatNumber(salesStats.officialCount)}</strong>
                </span>
              </>
            ) : (
              <>
                <span className="d-flex align-items-center">
                  <i className="bi bi-cart-check me-1 text-success" style={{ fontSize: 13 }} />
                  Doanh số đơn hàng: <strong className="text-dark font-monospace ms-1">{salesOrderStats.totalOrderValue.toLocaleString("vi-VN")} đ</strong>
                </span>
                <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
                <span className="d-flex align-items-center">
                  <i className="bi bi-file-earmark-text me-1 text-primary" style={{ fontSize: 13 }} />
                  Báo giá đã gửi: <strong className="text-dark font-monospace ms-1">{salesOrderStats.quotationCount}</strong>
                </span>
                <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
                <span className="d-flex align-items-center">
                  <i className="bi bi-clock-history me-1 text-warning" style={{ fontSize: 13 }} />
                  Đơn hàng chờ duyệt: <strong className="text-dark font-monospace ms-1">{salesOrderStats.pendingOrderCount}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderActiveStepContent = () => {
    if (currentStepId === "marketing") {
      return (
        <div className="d-flex flex-column gap-4 w-100" style={{ overflowX: "hidden" }}>
          {/* Bottom Split Layout */}
          <div className="row g-4 overflow-hidden" style={{ margin: 0 }}>
            {/* Left Column: Budgets & Chart */}
            <div className="col-12 col-lg-5 d-flex flex-column gap-4" style={{ maxHeight: "calc(100vh - 280px)", overflow: "hidden" }}>
              {/* Budget Allocation Block */}
              <div>
                <SectionTitle title="Ngân sách & Thực chi theo kênh" className="mb-3" />
                {renderBudgetAllocation()}
              </div>

              {/* Chart Block (Moved from right column) */}
              <div>
                <SectionTitle title="Diễn biến Leads và Doanh thu" className="mt-3 mb-2" />
                <YearAreaChart series={dynamicChartSeries} height={220} hideYAxis={true} unit="" />
              </div>
            </div>

            {/* Right Column: Campaigns Table only */}
            <div className="col-12 col-lg-7 d-flex flex-column gap-4" style={{ maxHeight: "calc(100vh - 280px)", overflow: "hidden" }}>
              {/* Campaigns Table Block */}
               <div className="flex-grow-1 d-flex flex-column overflow-hidden">
                <SectionTitle 
                  title={
                    <span className="d-flex align-items-center gap-2">
                      Hiệu quả chiến dịch Marketing
                      <span className="badge rounded-pill bg-danger fw-bold text-white" style={{ fontSize: 9, padding: "2px 6px", lineHeight: "12px", display: "inline-block" }}>
                        Số chiến dịch: {displayCampaigns.length}
                      </span>
                    </span>
                  }
                  className="mb-3" 
                  action={
                    <select
                      className="form-select form-select-sm border-0 bg-transparent fw-semibold p-0 text-primary"
                      style={{ fontSize: 12, cursor: "pointer", width: "115px", outline: "none", boxShadow: "none" }}
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="Tất cả">Tất cả trạng thái</option>
                      <option value="Active">Đang chạy</option>
                      <option value="Paused">Tạm dừng</option>
                    </select>
                  }
                />
                <div className="flex-grow-1 overflow-hidden">
                  <Table<any>
                    rows={displayCampaigns}
                    columns={CAMPAIGN_COLUMNS}
                    compact
                    fixedLayout={false}
                    wrapperClassName="mkt-plan-table-no-min mkt-campaign-table"
                    wrapperStyle={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 340px)" }}
                  />
                </div>
                <style dangerouslySetInnerHTML={{ __html: `
                  .mkt-workflow-card .custom-scrollbar {
                    overflow-y: hidden !important;
                  }
                   .mkt-campaign-table td,
                   .mkt-campaign-table th {
                     padding-top: 4px !important;
                     padding-bottom: 4px !important;
                   }
                   .mkt-campaign-table td,
                   .mkt-campaign-table th,
                   .mkt-campaign-table span,
                   .mkt-campaign-table div {
                     font-family: var(--font-roboto-condensed), 'Roboto Condensed', sans-serif !important;
                   }
                ` }} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentStepId === "sales") {
      if (salesMode === "Đại lý") {
        return (
          <div className="d-flex flex-column gap-3 w-100" style={{ overflowX: "hidden" }}>
            {/* Bottom Split Layout */}
            <div className="row g-3 overflow-hidden" style={{ margin: 0 }}>
              {/* Left Column: Funnel & Care Log */}
              <div className="col-12 col-lg-5 d-flex flex-column gap-3" style={{ maxHeight: "calc(100vh - 280px)", overflow: "hidden" }}>
                {/* Partner Development Funnel */}
                <div className="w-100 d-flex flex-column">
                  <SectionTitle title="Phễu phát triển Đại lý" className="mb-3" />
                  <div className="d-flex flex-column gap-2">
                    {[
                      { name: "Tiếp cận đối tác", count: pipelineStats[0], color: "#3b82f6", pct: "100%" },
                      { name: "Tìm hiểu nhu cầu", count: pipelineStats[1], color: "#06b6d4", pct: `${pipelineStats[0] > 0 ? Math.round((pipelineStats[1]/pipelineStats[0])*100) : 0}%` },
                      { name: "Đàm phán chính sách", count: pipelineStats[2], color: "#f59e0b", pct: `${pipelineStats[0] > 0 ? Math.round((pipelineStats[2]/pipelineStats[0])*100) : 0}%` },
                      { name: "Chờ duyệt ký HĐ", count: pipelineStats[3], color: "#6366f1", pct: `${pipelineStats[0] > 0 ? Math.round((pipelineStats[3]/pipelineStats[0])*100) : 0}%` },
                      { name: "Đại lý chính thức", count: pipelineStats[4], color: "#10b981", pct: `${pipelineStats[0] > 0 ? Math.round((pipelineStats[4]/pipelineStats[0])*100) : 0}%` }
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)" }}>{item.name}</span>
                          <div className="d-flex align-items-center gap-2">
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{item.count}</span>
                            <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 99, background: `${item.color}15`, color: item.color, fontWeight: 700 }}>
                              {item.pct}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: item.pct,
                            background: item.color,
                            borderRadius: 99
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-100 mt-4 pt-2 d-flex flex-column flex-grow-1 min-h-0">
                  <SectionTitle title="Đại lý chính thức trong năm" className="mb-2" />
                  <div className="flex-grow-1 w-100" style={{ minHeight: "200px" }}>
                    <ReactApexChart
                      options={officialAgentsChartOptions}
                      series={[{ name: "Đại lý", data: monthlyOfficialAgents }]}
                      type="bar"
                      height="100%"
                      width="100%"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Signed Contracts Table */}
              <div className="col-12 col-lg-7 d-flex flex-column gap-4" style={{ maxHeight: "calc(100vh - 280px)", overflow: "hidden" }}>
                <div className="flex-grow-1 d-flex flex-column overflow-hidden">
                  <SectionTitle 
                    title={
                      <span className="d-flex align-items-center gap-2">
                        Hợp đồng Đại lý đã ký kết
                        <span className="badge rounded-pill bg-danger fw-bold text-white" style={{ fontSize: 9, padding: "2px 6px", lineHeight: "12px", display: "inline-block" }}>
                          Số hợp đồng: {salesData?.contracts.length || 0}
                        </span>
                      </span>
                    }
                    className="mb-3" 
                  />
                  <div className="flex-grow-1 overflow-hidden">
                    <Table<any>
                      rows={salesData?.contracts || []}
                      columns={CONTRACT_COLUMNS}
                      compact
                      fixedLayout={false}
                      wrapperClassName="mkt-plan-table-no-min mkt-campaign-table"
                      wrapperStyle={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(100vh - 340px)" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // salesMode === "Bán hàng"
      return (
        <div className="d-flex flex-column gap-3 w-100 h-100" style={{ overflowX: "hidden" }}>
          {/* Tables */}
          <div className="row g-3 flex-grow-1 overflow-hidden" style={{ margin: 0, maxHeight: "calc(100vh - 280px)" }}>
            {/* Left: Orders */}
            <div className="col-12 col-lg-12 d-flex flex-column gap-3">
              <div className="flex-grow-1 d-flex flex-column overflow-hidden h-100">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <SectionTitle 
                    title={
                      <span className="d-flex align-items-center gap-2">
                        Danh sách đơn hàng
                        <span className="badge rounded-pill bg-danger fw-bold text-white" style={{ fontSize: 9, padding: "2px 6px", lineHeight: "12px", display: "inline-block" }}>
                          Tổng số: {salesData?.saleOrders?.length || 0}
                        </span>
                      </span>
                    }
                  />
                  <select 
                    className="form-select form-select-sm border-0 bg-light rounded-pill px-3" 
                    style={{ width: "200px", fontSize: 12, fontWeight: 500 }}
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    {salesData?.orderStatuses?.map((status: any) => (
                      <option key={status.id} value={status.code.toLowerCase()}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-grow-1 overflow-hidden">
                  <Table<any>
                    rows={(salesData?.saleOrders || []).filter((o: any) => orderStatusFilter === "all" ? true : o.trangThai?.toLowerCase() === orderStatusFilter)}
                    columns={ORDER_COLUMNS}
                    compact
                    fixedLayout={false}
                    wrapperClassName="mkt-plan-table-no-min mkt-campaign-table"
                    wrapperStyle={{ overflowY: "auto", overflowX: "hidden", height: "100%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <StandardPage
      title="Kinh doanh và Marketing"
      description="Ban Giám đốc · Giám sát hiệu quả marketing đa kênh, phễu chuyển đổi và chỉ số tăng trưởng kinh doanh"
      icon="bi-megaphone-fill"
      color="indigo"
      useCard={false}
      paddingClassName="px-4 pb-4 pt-1"
    >
      <div className="d-flex flex-column h-100 flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
        <WorkflowCard
          className="mkt-workflow-card"
          contentPadding="px-4 pb-4 pt-1"
          toolbar={renderToolbar()}
          stepper={
            <div className="d-flex align-items-center justify-content-between pe-4">
              <div className="flex-grow-1">
                <ModernStepper
                  steps={STEP_ITEMS}
                  currentStep={currentStep}
                  onStepChange={setCurrentStep}
                  paddingX={0}
                  paddingY={8}
                />
              </div>
              <BrandButton 
                icon="bi-box-arrow-up-right" 
                variant="outline" 
                onClick={() => {
                  if (currentStep === 1) router.push('/marketing/reports');
                  else if (currentStep === 2) router.push('/sales/business-results');
                }}
                style={{ height: 36, fontSize: 13, borderColor: '#003087', color: '#003087' }}
              >
                Quản lý toàn diện
              </BrandButton>
            </div>
          }
        >
          {renderActiveStepContent()}
        </WorkflowCard>
      </div>
    </StandardPage>
  );
}
