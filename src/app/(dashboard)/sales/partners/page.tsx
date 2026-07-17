"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DynamicTicker } from "@/components/layout/DynamicTicker";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { Table, TableColumn } from "@/components/ui/Table";
import { GanttChart } from "@/components/ui/GanttChart";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { calculateLeadStars } from "@/lib/partner-utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { docSoTien } from "@/app/(dashboard)/finance/debts/DebtPaymentOffcanvas";
import { BaoGiaSanitaryModal } from "@/components/plan-finance/bao_gia/BaoGiaSanitaryModal";
import { SignaturePad } from "@/components/ui/SignaturePad";

interface PartnerProcessItem {
  id: string;
  name: string;
  area: string;
  source: string;
  date: string;
  scale: string;
  contact: string;
  contactEmail?: string;
  needs: string;
  // Care info (Step 2)
  careStaff: string;
  lastCareDate: string;
  careChannel: "Zalo" | "Call" | "Direct Meet";
  careNote: string;
  nextSchedule: string;
  // Quote info (Step 3)
  quoteCode?: string;
  quoteValue?: number;
  discountRate?: number;
  quoteStatus?: "Draft" | "Sent" | "Approved";
  // Contract info (Step 4)
  contractNo?: string;
  contractValue?: number;
  creditLimit?: number;
  signDate?: string;
  contractStatus?: "Pending Signature" | "Signed" | "Active";
  contractPdf?: string;
  // Memorandum properties
  bbDate?: string;
  bbANguoiKy?: string;
  bbAChucVu?: string;
  bbQuoteCode?: string;
  bbDiaDiem?: string;
  bbB_Ten?: string;
  bbB_DiaChi?: string;
  bbB_MST?: string;
  bbB_DaiDien?: string;
  bbB_ChucVu?: string;
  bbB_DienThoai?: string;
  bbB_Email?: string;
  bbSupports?: any;
  bbBonuses?: any[];
  bbCode?: string;
  bbA_DienThoai?: string;
  bbPdf?: string;
  bbSigA?: string;
  bbSigB?: string;
  plPdf?: string;

  // Contract properties
  hdCode?: string;
  hdDate?: string;
  hdDiaDiem?: string;
  hdANguoiKy?: string;
  hdAChucVu?: string;
  hdB_Ten?: string;
  hdB_DiaChi?: string;
  hdB_MST?: string;
  hdB_DaiDien?: string;
  hdB_ChucVu?: string;
  hdB_DienThoai?: string;
  hdB_Email?: string;
  hdShowroomAddress?: string;
  hdShowroomArea?: string;
  hdAnnualRevenue?: string;
  hdMonthlyRevenue?: string;
  hdDurationYears?: string;
  hdExclusiveRadius?: string;
  hdExclusiveMonths?: string;
  // Construction info (Step 5)
  showroomArea?: number;
  designStatus?: "Not Started" | "Designing" | "Approved";
  constructionProgress?: number; // 0 - 100
  estOpeningDate?: string;
  constructionStatus?: "Pending" | "In Progress" | "Completed";
  consTimeline1?: string;
  consTimeline2?: string;
  consTimeline3?: string;
  consTimeline4?: string;
  consTimeline5?: string;
  consProgress1?: number;
  consProgress2?: number;
  consProgress3?: number;
  consProgress4?: number;
  consProgress5?: number;

  step: number; // 1 to 5
  stars?: number;
  reminderCount?: number;

  // Care details fields
  detailFullName?: string;
  detailPhone?: string;
  detailCompanyName?: string;
  detailBusinessAddress?: string;
  detailBusinessType?: string;
  detailPremisesScale?: string;
  detailCollabNeeds?: string;
  detailCurrentBrands?: string;
  detailDeploymentPlan?: string;
  detailExpectedInvestment?: string;
  detailInvestmentTimeframe?: string;
  detailAttitude?: string;
  detailInterests?: string;
  detailPainPoints?: string;
  detailPremisesCondition?: string;
  detailOtherRequirements?: string;
  detailRole?: string;
  detailEmail?: string;
  detailApproachStep?: string;
  detailExecutionDate?: string;
  detailExecutor?: string;
  detailSpecialRequestPending?: boolean;
  detailSpecialRequestStatus?: string;
  careHistories?: PartnerCareHistoryItem[];
  careHistoryId?: string;
  quoteId?: string;
  quoteNegotiations?: PartnerQuoteNegotiationItem[];
  quoteCreatedAt?: string;
  quoteType?: string;
  detailCabinetArea?: string;
  detailCabinetUnitPrice?: string;
  detailCabinetBrandSupportRate?: string;
  detailCabinetOtherCosts?: string;
  detailCabinetNotes?: string;

  // Appendix (Phụ lục) properties
  plNo?: string;
  plDate?: string;
  plAddress?: string;
  plCptc?: string;
  plCptcText?: string;
  plRevenueMkt?: string;
  plRevenueMktText?: string;
  plRevenueCommit?: string;
  plRevenueCommitText?: string;
  plDurationDays?: string;
  plTimeline1?: string;
  plTimeline2?: string;
  plTimeline3?: string;
  plTimeline4?: string;
  plTimeline5?: string;
  plMaxDelayDays?: string;
  plPhase1Date?: string;
  plPhase1Rate?: string;
  plPhase1Amount?: string;
  plPhase1AmountText?: string;
  plPhase2Date?: string;
  plPhase2Rate?: string;
  plPhase2Amount?: string;
  plPhase2AmountText?: string;
  plPhase3Date?: string;
  plPhase3Rate?: string;
  plPhase3Amount?: string;
  plPhase3AmountText?: string;
  plPenaltyMaxDelay?: string;
}

export interface PartnerQuoteNegotiationItem {
  id: string;
  quotationId: string;
  loai: string;
  ngay: string;
  nguoiThucHien: string;
  ketQua: string;
  createdAt?: string;
}

export interface PartnerCareHistoryItem {
  id: string;
  partnerId: string;
  fullName: string;
  role?: string;
  phone: string;
  email?: string;
  companyName: string;
  businessAddress: string;
  businessType?: string;
  premisesScale: string;
  collabNeeds: string;
  currentBrands?: string;
  deploymentPlan: string;
  expectedInvestment?: string;
  investmentTimeframe?: string;
  approachStep?: string;
  attitude?: string;
  interests?: string;
  painPoints?: string;
  premisesCondition?: string;
  otherRequirements?: string;
  stars?: number;
  executionDate: string;
  executor: string;
  cabinetArea?: string;
  cabinetUnitPrice?: string;
  cabinetBrandSupportRate?: string;
  cabinetOtherCosts?: string;
  cabinetNotes?: string;
}

const INITIAL_PARTNERS: PartnerProcessItem[] = [
  {
    id: "P1",
    name: "Đại lý Minh Quân",
    area: "Hà Nội",
    source: "Facebook Ads",
    date: "2026-06-01",
    scale: "Showroom 200m2",
    contact: "Anh Quân - 0912.345.xxx",
    contactEmail: "quan.nguyen@gmail.com",
    needs: "Đại lý độc quyền khu vực phía Nam Hà Nội",
    careStaff: "Lê Anh Văn",
    lastCareDate: "2026-06-02",
    careChannel: "Call",
    careNote: "Khách rất quan tâm đến chiết khấu và quầy kệ mẫu.",
    nextSchedule: "2026-06-04",
    step: 1
  },
  {
    id: "P2",
    name: "Showroom Hùng Phát",
    area: "Hải Phòng",
    source: "Website",
    date: "2026-05-28",
    scale: "Showroom 150m2",
    contact: "Chị Hằng - 0988.777.xxx",
    needs: "Phân phối bồn cầu và sen vòi",
    careStaff: "Nguyễn Quốc Việt",
    lastCareDate: "2026-05-30",
    careChannel: "Zalo",
    careNote: "Đã gửi bảng giá và mẫu thiết kế showroom.",
    nextSchedule: "2026-06-05",
    step: 1
  },
  {
    id: "P3",
    name: "Vật tư xây dựng An Bình",
    area: "Đà Nẵng",
    source: "Triển lãm",
    date: "2026-05-25",
    scale: "Kho vật liệu tổng hợp",
    contact: "Anh Bình - 0905.111.xxx",
    contactEmail: "binh.an@yahoo.com",
    needs: "Bổ sung mã hàng Seajong vào danh mục",
    careStaff: "Nguyễn Thu Huyền",
    lastCareDate: "2026-06-01",
    careChannel: "Direct Meet",
    careNote: "Gặp trực tiếp tại Đà Nẵng, chốt hướng trưng bày mẫu.",
    nextSchedule: "2026-06-06",
    step: 2
  },
  {
    id: "P4",
    name: "Nội thất cao cấp Gia Minh",
    area: "Quảng Ninh",
    source: "Google Search",
    date: "2026-05-24",
    scale: "Cửa hàng trung tâm",
    contact: "Anh Gia Minh - 0933.222.xxx",
    needs: "Trở thành tổng kho khu vực Quảng Ninh",
    careStaff: "Lê Anh Văn",
    lastCareDate: "2026-05-29",
    careChannel: "Call",
    careNote: "Đang cân nhắc hạn mức công nợ.",
    nextSchedule: "2026-06-03",
    step: 2
  },
  {
    id: "P5",
    name: "Showroom Toàn Cầu",
    area: "Bình Dương",
    source: "Zalo",
    date: "2026-05-20",
    scale: "Showroom lớn 300m2",
    contact: "Anh Toàn - 0909.888.xxx",
    contactEmail: "toan.global@outlook.com",
    needs: "Nhập sỉ số lượng lớn thiết bị phòng tắm",
    careStaff: "Lê Anh Văn",
    lastCareDate: "2026-05-28",
    careChannel: "Zalo",
    careNote: "Đã thương lượng xong chiết khấu 38%. Khách muốn nhận báo giá chính thức.",
    nextSchedule: "2026-06-02",
    quoteCode: "BG-2026-0089",
    quoteValue: 350000000,
    discountRate: 38,
    quoteStatus: "Draft",
    step: 3
  },
  {
    id: "P6",
    name: "Điện nước Thành Đạt",
    area: "Nghệ An",
    source: "Hotline",
    date: "2026-05-18",
    scale: "Cửa hàng bán lẻ lớn",
    contact: "Anh Đạt - 0976.555.xxx",
    needs: "Kinh doanh thiết bị nhà bếp",
    careStaff: "Nguyễn Thu Huyền",
    lastCareDate: "2026-05-25",
    careChannel: "Direct Meet",
    careNote: "Khách đồng ý ký kết hợp đồng đại lý cấp 2.",
    nextSchedule: "2026-06-01",
    quoteCode: "BG-2026-0072",
    quoteValue: 180000000,
    discountRate: 35,
    quoteStatus: "Approved",
    contractNo: "HDDL-2026-0042",
    contractValue: 180000000,
    creditLimit: 100000000,
    signDate: "2026-06-02",
    contractStatus: "Pending Signature",
    step: 4
  },
  {
    id: "P7",
    name: "Công ty TNHH Seajong Việt Nam",
    area: "Miền Bắc",
    source: "Kinh doanh tự khai thác",
    date: "2026-04-10",
    scale: "Tổng kho 500m2",
    contact: "Anh Hùng - 0904.444.xxx",
    contactEmail: "hung.seajong@gmail.com",
    needs: "Trở thành nhà phân phối độc quyền miền Bắc",
    careStaff: "Lê Anh Văn",
    lastCareDate: "2026-05-15",
    careChannel: "Direct Meet",
    careNote: "Hợp đồng đã có hiệu lực. Đang thiết kế 3D showroom và hỗ trợ kệ trưng bày.",
    nextSchedule: "2026-06-10",
    quoteCode: "BG-2026-0012",
    quoteValue: 1200000000,
    discountRate: 45,
    quoteStatus: "Approved",
    contractNo: "HDDL-2026-0001",
    contractValue: 1200000000,
    creditLimit: 500000000,
    signDate: "2026-05-01",
    contractStatus: "Active",
    showroomArea: 180,
    designStatus: "Approved",
    constructionProgress: 65,
    estOpeningDate: "2026-06-20",
    constructionStatus: "In Progress",
    step: 5
  }
];

const STEPS: ModernStepItem[] = [
  { num: 1, id: "info", title: "Thông tin", desc: "Tiếp nhận & Sàng lọc", icon: "bi-info-circle" },
  { num: 2, id: "care", title: "Chăm sóc", desc: "Liên hệ & Tư vấn", icon: "bi-chat-left-dots" },
  { num: 3, id: "quote", title: "Báo giá", desc: "Thoả thuận", icon: "bi-currency-dollar" },
  { num: 4, id: "contract", title: "Hợp đồng", desc: "Ký kết & Hạn mức", icon: "bi-file-earmark-text" },
  { num: 5, id: "construction", title: "Thi công", desc: "Thiết kế & Trưng bày", icon: "bi-tools" },
];

const SOURCE_MAP: Record<string, string> = {
  "make_com_direct": "Make.com (Trực tiếp)",
  "facebook": "Facebook Ads",
  "google": "Google Ads",
  "tiktok": "TikTok Ads",
  "Website": "Website",
  "Facebook Ads": "Facebook Ads",
  "Google Ads": "Google Ads",
  "Triển lãm": "Triển lãm",
  "Hotline": "Hotline",
  "Zalo": "Zalo",
  "Kinh doanh tự khai thác": "Tự khai thác",
};

interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: string;
  className?: string;
}

const InfoField = ({ label, value, icon, className = "col-6" }: InfoFieldProps) => {
  return (
    <div className={className}>
      <div className="bg-light p-2 rounded-2 border border-light-subtle h-100 d-flex flex-column justify-content-center">
        <div className="text-muted small fw-medium mb-1 d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
          {icon && <i className={`bi bi-${icon} text-secondary`} style={{ fontSize: '12px' }} />}
          {label}
        </div>
        <div className="fw-semibold text-dark text-break" style={{ fontSize: '13px', lineHeight: '1.4' }}>
          {value || <span className="text-muted fw-normal fst-italic">Chưa cập nhật</span>}
        </div>
      </div>
    </div>
  );
};

const getSafeTimestamp = (dateStr?: string): number => {
  if (!dateStr) return 0;
  try {
    if (dateStr.endsWith("Z") || dateStr.includes("+") || (dateStr.includes("-") && dateStr.split("-").length > 3)) {
      return new Date(dateStr).getTime();
    }
    if (dateStr.includes("T")) {
      const [datePart, timePart] = dateStr.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hour, minute).getTime();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day).getTime();
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch (e) {
    return 0;
  }
};

const formatDisplayDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${month}/${yyyy}`;
  } catch (e) {
    return dateStr;
  }
};

const formatDisplayDateTime = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${hh}:${mm} ${dd}/${month}/${yyyy}`;
  } catch (e) {
    return dateStr;
  }
};

const getElapsedTimeInfo = (dateStr?: string) => {
  if (!dateStr) return { label: "", className: "text-muted", style: {} };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { label: "", className: "text-muted", style: {} };

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return { label: "", className: "text-muted", style: {} };

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let label = "";
    if (diffSecs < 60) {
      label = "Mới nhận";
    } else if (diffMins < 60) {
      label = `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      label = `${diffHours} giờ trước`;
    } else {
      label = `${diffDays} ngày trước`;
    }

    let className = "text-muted";
    let style: React.CSSProperties = {};

    if (diffHours > 48) {
      className = "text-danger fw-semibold";
    } else if (diffHours > 24) {
      style = { color: "#fd7e14", fontWeight: 600 };
    }

    return { label, className, style };
  } catch (e) {
    return { label: "", className: "text-muted", style: {} };
  }
};

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return null;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(val);
};

const renderCareChannel = (channel: string) => {
  switch (channel) {
    case "Zalo":
      return <span className="badge bg-info-subtle text-info px-2 py-1 rounded"><i className="bi bi-chat-fill me-1"></i>Zalo</span>;
    case "Call":
      return <span className="badge bg-success-subtle text-success px-2 py-1 rounded"><i className="bi bi-telephone-fill me-1"></i>Điện thoại</span>;
    case "Direct Meet":
      return <span className="badge bg-primary-subtle text-primary px-2 py-1 rounded"><i className="bi bi-people-fill me-1"></i>Gặp trực tiếp</span>;
    default:
      return <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded">{channel}</span>;
  }
};

const renderQuoteStatus = (status?: string) => {
  switch (status) {
    case "Draft":
      return <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1 rounded">Bản nháp</span>;
    case "Sent":
      return <span className="badge bg-info-subtle text-info-emphasis px-2 py-1 rounded">Đã gửi khách</span>;
    case "Approved":
      return <span className="badge bg-success-subtle text-success px-2 py-1 rounded">Đã duyệt</span>;
    default:
      return <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded">{status}</span>;
  }
};

const renderContractStatus = (status?: string) => {
  switch (status) {
    case "Pending Signature":
      return <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1 rounded">Chờ ký kết</span>;
    case "Signed":
      return <span className="badge bg-primary-subtle text-primary px-2 py-1 rounded">Đã ký</span>;
    case "Active":
      return <span className="badge bg-success-subtle text-success px-2 py-1 rounded">Đang hiệu lực</span>;
    default:
      return <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded">{status}</span>;
  }
};

const renderDesignStatus = (status?: string) => {
  switch (status) {
    case "Not Started":
      return <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded">Chưa bắt đầu</span>;
    case "Designing":
      return <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1 rounded">Đang thiết kế</span>;
    case "Approved":
      return <span className="badge bg-success-subtle text-success px-2 py-1 rounded">Đã duyệt 3D</span>;
    default:
      return <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded">{status}</span>;
  }
};

const renderConstructionStatus = (status?: string) => {
  switch (status) {
    case "Pending":
      return <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded">Chờ triển khai</span>;
    case "In Progress":
      return <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1 rounded">Đang lắp đặt</span>;
    case "Completed":
      return <span className="badge bg-success-subtle text-success px-2 py-1 rounded">Hoàn thành bàn giao</span>;
    default:
      return <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded">{status}</span>;
  }
};

// Helper to render stars rating UI
const renderStars = (starsCount?: number) => {
  const count = starsCount || 3;
  const total = 5;
  const stars = [];
  for (let i = 1; i <= total; i++) {
    if (i <= count) {
      stars.push(<i key={i} className="bi bi-star-fill text-warning me-1" style={{ fontSize: '13px' }} />);
    } else {
      stars.push(<i key={i} className="bi bi-star text-muted me-1" style={{ fontSize: '13px' }} />);
    }
  }
  return (
    <div className="d-flex align-items-center">
      <div className="d-flex">{stars}</div>
    </div>
  );
};

const formatInvestmentInput = (value: string | number): string => {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (!str.trim()) return "";
  // Check if it's a pure number (ignoring existing dots)
  const cleanVal = str.replace(/\./g, "");
  if (/^\d+$/.test(cleanVal)) {
    const num = parseInt(cleanVal, 10);
    return num.toLocaleString("vi-VN");
  }
  return str;
};

const parseDateRange = (rangeStr?: string) => {
  if (!rangeStr) return null;
  const parts = rangeStr.split("-").map(s => s.trim());
  if (parts.length !== 2) return null;
  
  const parseSingleDate = (str: string): Date | null => {
    if (str.includes("/")) {
      const [d, m, y] = str.split("/").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };
  
  const start = parseSingleDate(parts[0]);
  const end = parseSingleDate(parts[1]);
  
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return { start, end, startStr: parts[0], endStr: parts[1] };
};

export default function PartnersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { success: toastSuccess, error: toastError } = useToast();
  const currentUserName = session?.user?.name || "Lê Anh Văn";
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [partners, setPartners] = useState<PartnerProcessItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPartner, setSelectedPartner] = useState<PartnerProcessItem | null>(null);
  const [selectedConstructionTask, setSelectedConstructionTask] = useState<any | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(0);
  const [savingProgress, setSavingProgress] = useState<boolean>(false);

  useEffect(() => {
    if (selectedConstructionTask) {
      setTempProgress(selectedConstructionTask.progress || 0);
    }
  }, [selectedConstructionTask]);

  const handleSaveTaskProgress = async () => {
    if (!selectedConstructionTask) return;
    setSavingProgress(true);

    const partner = selectedConstructionTask.partner;
    const taskNum = selectedConstructionTask.id.split("_")[1];

    const updatedProgress = {
      consProgress1: taskNum === "1" ? tempProgress : (partner.consProgress1 || 0),
      consProgress2: taskNum === "2" ? tempProgress : (partner.consProgress2 || 0),
      consProgress3: taskNum === "3" ? tempProgress : (partner.consProgress3 || 0),
      consProgress4: taskNum === "4" ? tempProgress : (partner.consProgress4 || 0),
      consProgress5: taskNum === "5" ? tempProgress : (partner.consProgress5 || 0),
    };

    // Calculate overall constructionProgress as average of the 5 milestones
    const overallProgress = Math.round(
      (updatedProgress.consProgress1 +
        updatedProgress.consProgress2 +
        updatedProgress.consProgress3 +
        updatedProgress.consProgress4 +
        updatedProgress.consProgress5) / 5
    );

    // Calculate overall constructionStatus
    const overallStatus = overallProgress === 100 ? "Completed" : overallProgress > 0 ? "In Progress" : "Pending";

    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: partner.id,
          ...updatedProgress,
          constructionProgress: overallProgress,
          constructionStatus: overallStatus
        })
      });

      if (res.ok) {
        toastSuccess("Thành công", "Đã cập nhật báo cáo tiến độ công việc.");
        setSelectedConstructionTask(null);
        await fetchPartners();
      } else {
        const errData = await res.json();
        toastError("Lỗi", errData.error || "Gặp lỗi khi cập nhật tiến độ.");
      }
    } catch (err) {
      console.error("Error saving task progress:", err);
      toastError("Lỗi", "Gặp lỗi hệ thống khi cập nhật tiến độ.");
    } finally {
      setSavingProgress(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionPartner, setExceptionPartner] = useState<PartnerProcessItem | null>(null);
  const [showTaoBaoGiaModal, setShowTaoBaoGiaModal] = useState(false);
  const [quotationEditData, setQuotationEditData] = useState<any | null>(null);

  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right: number } | null>(null);
  const [editingPartner, setEditingPartner] = useState<PartnerProcessItem | null>(null);
  const [confirmDeletePartnerOpen, setConfirmDeletePartnerOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<PartnerProcessItem | null>(null);
  const [deletingPartner, setDeletingPartner] = useState(false);

  // Company and logo info loaded on-mount
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // Memorandum of understanding states
  const [showBienBanModal, setShowBienBanModal] = useState(false);
  const [showMOUModal, setShowMOUModal] = useState(false);
  const [savingBienBan, setSavingBienBan] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfUploadingMOU, setPdfUploadingMOU] = useState(false);
  const [bbDate, setBbDate] = useState("");
  const [bbANguoiKy, setBbANguoiKy] = useState("Lê Công Vụ");
  const [bbAChucVu, setBbAChucVu] = useState("Giám đốc");
  const [bbQuoteCode, setBbQuoteCode] = useState("");
  const [bbCode, setBbCode] = useState("");
  const [bbA_DienThoai, setBbA_DienThoai] = useState("");
  const [bbDiaDiem, setBbDiaDiem] = useState("Văn phòng Công ty Seajong Faucet Việt Nam");
  const [bbB_Ten, setBbB_Ten] = useState("");
  const [bbB_DiaChi, setBbB_DiaChi] = useState("");
  const [bbB_MST, setBbB_MST] = useState("");
  const [bbB_DaiDien, setBbB_DaiDien] = useState("");
  const [bbB_ChucVu, setBbB_ChucVu] = useState("Giám đốc");
  const [bbB_DienThoai, setBbB_DienThoai] = useState("");
  const [bbB_Email, setBbB_Email] = useState("");
  const [bbSupports, setBbSupports] = useState<any>({
    thietKeQuayKe: true,
    quayKeCoBan: true,
    catalogue: true,
    brochure: true,
    tagTreo: true,
    standee: true,
    bangGia: true,
    goiQuangCao: false,
    manHinhLed: false,
    bienBangSeajong: false,
    posterKhoLon: false,
    backdropPhotoBooth: false,
    vatPhamQuaTang: false,
    posmQrCode: false,
    dongPhucNhanVien: false,
    chiPhiNoiThat: false,
  });
  const [bbBonuses, setBbBonuses] = useState<any[]>([
    {
      id: "1",
      title: "Thưởng thanh toán",
      desc: "Chiết khấu thanh toán 2% trên tổng giá trị hóa đơn (chưa VAT) khi Đại lý hoàn tất thanh toán trước hạn hoặc đúng hạn quy định trong Hợp đồng đại lý.",
      formula: "Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)"
    },
    {
      id: "2",
      title: "Thưởng doanh số năm",
      desc: "Mức thưởng đạt chỉ tiêu doanh thu năm cam kết tối thiểu. Được chi trả bằng hàng hóa hoặc trừ trực tiếp vào công nợ đơn hàng đầu tiên của năm tiếp theo.",
      formula: "Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế"
    },
    {
      id: "3",
      title: "Thưởng vượt doanh số năm",
      desc: "Mức thưởng khuyến khích vượt chỉ tiêu doanh số năm cam kết.",
      formula: "Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết"
    }
  ]);
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);

  // State for KyHopDongModal (Step 4 Contract signing)
  const [showKyHopDongModal, setShowKyHopDongModal] = useState(false);
  const [khdContractNo, setKhdContractNo] = useState("");
  const [khdContractValue, setKhdContractValue] = useState(0);
  const [khdCreditLimit, setKhdCreditLimit] = useState(0);
  const [khdSignDate, setKhdSignDate] = useState("");
  const [khdContractStatus, setKhdContractStatus] = useState<"Pending Signature" | "Signed" | "Active">("Pending Signature");
  const [khdContractPdf, setKhdContractPdf] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [savingKyHopDong, setSavingKyHopDong] = useState(false);

  // States for KyBienBanModal (Step 4 Memorandum signing)
  const [showKyBienBanModal, setShowKyBienBanModal] = useState(false);
  const [kbbQuoteCode, setKbbQuoteCode] = useState("");
  const [kbbCode, setKbbCode] = useState("");
  const [kbbDate, setKbbDate] = useState("");
  const [kbbDiaDiem, setKbbDiaDiem] = useState("");
  const [kbbPdf, setKbbPdf] = useState("");
  const [savingKyBienBan, setSavingKyBienBan] = useState(false);
  const [uploadingPdfBB, setUploadingPdfBB] = useState(false);

  // States for KyPhuLucModal (Step 4 Appendix signing)
  const [showKyPhuLucModal, setShowKyPhuLucModal] = useState(false);
  const [kplNo, setKplNo] = useState("");
  const [kplDate, setKplDate] = useState("");
  const [kplAddress, setKplAddress] = useState("");
  const [kplCptc, setKplCptc] = useState("");
  const [kplCptcText, setKplCptcText] = useState("");
  const [kplRevenueCommit, setKplRevenueCommit] = useState("");
  const [kplRevenueCommitText, setKplRevenueCommitText] = useState("");
  const [kplPdf, setKplPdf] = useState("");
  const [savingKyPhuLuc, setSavingKyPhuLuc] = useState(false);
  const [uploadingPdfPL, setUploadingPdfPL] = useState(false);

  // Contract states
  const [showHopDongModal, setShowHopDongModal] = useState(false);
  const [savingHopDong, setSavingHopDong] = useState(false);
  const [pdfUploadingHD, setPdfUploadingHD] = useState(false);
  const [hdCode, setHdCode] = useState("");
  const [hdDate, setHdDate] = useState("");
  const [hdDiaDiem, setHdDiaDiem] = useState("Văn phòng Công ty Seajong Faucet Việt Nam");
  const [hdANguoiKy, setHdANguoiKy] = useState("Lê Công Vụ");
  const [hdAChucVu, setHdAChucVu] = useState("Giám đốc");
  const [hdB_Ten, setHdB_Ten] = useState("");
  const [hdB_DiaChi, setHdB_DiaChi] = useState("");
  const [hdB_MST, setHdB_MST] = useState("");
  const [hdB_DaiDien, setHdB_DaiDien] = useState("");
  const [hdB_ChucVu, setHdB_ChucVu] = useState("Giám đốc");
  const [hdB_DienThoai, setHdB_DienThoai] = useState("");
  const [hdB_Email, setHdB_Email] = useState("");
  const [hdShowroomAddress, setHdShowroomAddress] = useState("");
  const [hdShowroomArea, setHdShowroomArea] = useState("");
  const [hdAnnualRevenue, setHdAnnualRevenue] = useState("1.200.000.000");
  const [hdMonthlyRevenue, setHdMonthlyRevenue] = useState("100.000.000");
  const [hdDurationYears, setHdDurationYears] = useState("02");
  const [hdExclusiveRadius, setHdExclusiveRadius] = useState("5");
  const [hdExclusiveMonths, setHdExclusiveMonths] = useState("06");

  // Appendix (Phụ lục) states
  const [showPhuLucModal, setShowPhuLucModal] = useState(false);
  const [savingPhuLuc, setSavingPhuLuc] = useState(false);
  const [pdfUploadingPL, setPdfUploadingPL] = useState(false);
  const [plNo, setPlNo] = useState("");
  const [plDate, setPlDate] = useState("");
  const [plAddress, setPlAddress] = useState("Văn phòng Công ty Seajong Faucet Việt Nam");
  const [plCptc, setPlCptc] = useState("16.100.000");
  const [plCptcText, setPlCptcText] = useState("Mười sáu triệu một trăm nghìn đồng");
  const [plRevenueMkt, setPlRevenueMkt] = useState("400.000.000");
  const [plRevenueMktText, setPlRevenueMktText] = useState("Bốn trăm triệu đồng");
  const [plRevenueCommit, setPlRevenueCommit] = useState("100.000.000");
  const [plRevenueCommitText, setPlRevenueCommitText] = useState("Một trăm triệu đồng");
  const [plDurationDays, setPlDurationDays] = useState("15");
  const [plTimeline1, setPlTimeline1] = useState("");
  const [plTimeline2, setPlTimeline2] = useState("");
  const [plTimeline3, setPlTimeline3] = useState("");
  const [plTimeline4, setPlTimeline4] = useState("");
  const [plTimeline5, setPlTimeline5] = useState("");
  const [plMaxDelayDays, setPlMaxDelayDays] = useState("");
  const [plPhase1Date, setPlPhase1Date] = useState("");
  const [plPhase1Rate, setPlPhase1Rate] = useState("50%");
  const [plPhase1Amount, setPlPhase1Amount] = useState("8.050.000");
  const [plPhase1AmountText, setPlPhase1AmountText] = useState("Tám triệu không trăm năm mươi nghìn đồng");
  const [plPhase2Date, setPlPhase2Date] = useState("");
  const [plPhase2Rate, setPlPhase2Rate] = useState("30%");
  const [plPhase2Amount, setPlPhase2Amount] = useState("4.830.000");
  const [plPhase2AmountText, setPlPhase2AmountText] = useState("Bốn triệu tám trăm ba mươi nghìn đồng");
  const [plPhase3Date, setPlPhase3Date] = useState("");
  const [plPhase3Rate, setPlPhase3Rate] = useState("20%");
  const [plPhase3Amount, setPlPhase3Amount] = useState("3.220.000");
  const [plPhase3AmountText, setPlPhase3AmountText] = useState("Ba triệu hai trăm hai mươi nghìn đồng");
  const [plPenaltyMaxDelay, setPlPenaltyMaxDelay] = useState("4");

  const handleOpenEditQuotation = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/plan-finance/quotations/${quoteId}`);
      if (!res.ok) throw new Error("Không thể tải thông tin báo giá");
      const q = await res.json();
      setQuotationEditData(q);
      setShowTaoBaoGiaModal(true);
    } catch (e: any) {
      toastError("Lỗi", e.message ?? "Lỗi tải báo giá");
    }
  };

  const mappedCustomerForQuotation = useMemo(() => {
    if (!selectedPartner) return null;
    const phoneOnly = selectedPartner.contact ? (selectedPartner.contact.split(" - ")[1] || null) : null;
    const nameOnly = selectedPartner.contact ? (selectedPartner.contact.split(" - ")[0] || selectedPartner.name || "") : (selectedPartner.name || "");

    return {
      id: selectedPartner.id,
      name: selectedPartner.name || "Đại lý chưa đặt tên",
      nhom: "doanh-nghiep",
      nguon: selectedPartner.source || null,
      dienThoai: phoneOnly,
      email: selectedPartner.contactEmail || null,
      address: selectedPartner.area || null,
      daiDien: nameOnly,
      xungHo: "Anh/Chị",
      chucVu: "Đại diện",
      ghiChu: selectedPartner.needs || null,
      nguoiChamSoc: null,
      nguoiChamSocId: null,
      createdAt: selectedPartner.date || new Date().toISOString()
    };
  }, [selectedPartner]);

  const handleQuotationSaved = async () => {
    setShowTaoBaoGiaModal(false);
    if (selectedPartner) {
      const res = await fetch(`/api/sales/partners`);
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
        const fresh = data.find((p: any) => p.id === selectedPartner.id);
        if (fresh) setSelectedPartner(fresh);
      }
    }
  };

  const isStep2TransitionAllowed = (partner: PartnerProcessItem | null): boolean => {
    if (!partner) return false;
    const requiredFields = [
      partner.detailFullName,
      partner.detailPhone,
      partner.detailCompanyName,
      partner.detailBusinessAddress,
      partner.detailPremisesScale,
      partner.detailBusinessType,
      partner.detailCollabNeeds,
      partner.detailDeploymentPlan,
    ];
    const allFieldsFilled = requiredFields.every(field => typeof field === "string" && field.trim() !== "");
    if (!allFieldsFilled) return false;

    // Calculate lead classification stars (requires at least 4 stars: Warm/Hot)
    const computedStars = calculateLeadStars({
      role: partner.detailRole,
      deploymentPlan: partner.detailDeploymentPlan,
      collabNeeds: partner.detailCollabNeeds,
      otherRequirements: partner.detailOtherRequirements,
      painPoints: partner.detailPainPoints,
      attitude: partner.detailAttitude,
    });
    return computedStars >= 4;
  };

  const isTransitionDisabled = (partner: PartnerProcessItem | null): boolean => {
    if (!partner) return true;
    if (partner.step >= 5) return true;
    if (partner.step === 2) {
      if (partner.detailSpecialRequestStatus === "APPROVED") return false;
      const allowed = isStep2TransitionAllowed(partner);
      if (allowed) return false;
      if (isSalesManager && partner.detailSpecialRequestPending) return false;
      return true;
    }
    if (partner.step === 3 && !partner.quoteId) {
      return true;
    }
    return false;
  };

  // Checkbox and selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [crmEmployees, setCrmEmployees] = useState<{ id: string; fullName: string; phone?: string | null; userId?: string }[]>([]);
  const [showGeneralInfo, setShowGeneralInfo] = useState(false);

  // Care details modal state
  const [showCareModal, setShowCareModal] = useState(false);
  const [careFullName, setCareFullName] = useState("");
  const [carePhone, setCarePhone] = useState("");
  const [careRole, setCareRole] = useState("Ông chủ");
  const [careEmail, setCareEmail] = useState("");
  const [careCompanyName, setCareCompanyName] = useState("");
  const [careBusinessAddress, setCareBusinessAddress] = useState("");
  const [careBusinessType, setCareBusinessType] = useState("");
  const [carePremisesScale, setCarePremisesScale] = useState("");
  const [careCollabNeeds, setCareCollabNeeds] = useState("");
  const [careCurrentBrands, setCareCurrentBrands] = useState("");
  const [careDeploymentPlan, setCareDeploymentPlan] = useState("");
  const [careExpectedInvestment, setCareExpectedInvestment] = useState("");
  const [careInvestmentTimeframe, setCareInvestmentTimeframe] = useState("");
  const [careCabinetArea, setCareCabinetArea] = useState("");
  const [careCabinetUnitPrice, setCareCabinetUnitPrice] = useState("");
  const [careCabinetBrandSupportRate, setCareCabinetBrandSupportRate] = useState("");
  const [careCabinetOtherCosts, setCareCabinetOtherCosts] = useState("");
  const [careCabinetNotes, setCareCabinetNotes] = useState("");
  const [tbCategory, setTbCategory] = useState("all");
  const [tbSize, setTbSize] = useState("");
  const [tbQuantity, setTbQuantity] = useState("1");
  const [cabinetItems, setCabinetItems] = useState<any[]>([]);
  const [showAddCabinetItemModal, setShowAddCabinetItemModal] = useState(false);

  // Form states for creating a new cabinet category item
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemUnitPrice, setNewItemUnitPrice] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("cái");
  const [newItemImageFile1, setNewItemImageFile1] = useState<File | null>(null);
  const [newItemImageFile2, setNewItemImageFile2] = useState<File | null>(null);
  const [newItemImagePreview1, setNewItemImagePreview1] = useState("");
  const [newItemImagePreview2, setNewItemImagePreview2] = useState("");
  const [savingCabinetItem, setSavingCabinetItem] = useState(false);
  const [previewImagesList, setPreviewImagesList] = useState<string[] | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number>(0);
  const [isEditCabinetMode, setIsEditCabinetMode] = useState(false);
  const [editingCabinetItemId, setEditingCabinetItemId] = useState("");
  const [existingImageUrl1, setExistingImageUrl1] = useState("");
  const [existingImageUrl2, setExistingImageUrl2] = useState("");
  const [activeCareModalTab, setActiveCareModalTab] = useState<'info' | 'finance'>('info');
  const [addedCabinetItems, setAddedCabinetItems] = useState<{
    id: string;
    code: string;
    name: string;
    unit: string;
    unitPrice: number;
    quantity: number;
    size?: string;
    description?: string;
  }[]>([]);

  const fileInputRef1 = React.useRef<HTMLInputElement>(null);
  const fileInputRef2 = React.useRef<HTMLInputElement>(null);
  const [careApproachStep, setCareApproachStep] = useState("Tiếp cận");
  const [careAttitude, setCareAttitude] = useState("Bình thường");
  const [careInterests, setCareInterests] = useState("");
  const [carePainPoints, setCarePainPoints] = useState("");
  const [carePremisesCondition, setCarePremisesCondition] = useState("");
  const [careOtherRequirements, setCareOtherRequirements] = useState("");
  const [careExecutionDate, setCareExecutionDate] = useState("");
  const [careExecutor, setCareExecutor] = useState("");
  const [careLocation, setCareLocation] = useState("Văn phòng làm việc/địa chỉ khách hàng");
  const [sigA, setSigA] = useState<string | null>(null);
  const [sigB, setSigB] = useState<string | null>(null);
  const [mouSidebarOpen, setMouSidebarOpen] = useState(false);
  const [editingCareHistoryId, setEditingCareHistoryId] = useState<string | null>(null);
  const [confirmDeleteHistoryOpen, setConfirmDeleteHistoryOpen] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [confirmAbandonOpen, setConfirmAbandonOpen] = useState(false);
  const [partnerToAbandon, setPartnerToAbandon] = useState<PartnerProcessItem | null>(null);
  const [abandoningPartner, setAbandoningPartner] = useState(false);

  // Quotation negotiation modal state
  const [showNegModal, setShowNegModal] = useState(false);
  const [negDate, setNegDate] = useState("");
  const [negExecutor, setNegExecutor] = useState("");
  const [negType, setNegType] = useState("call");
  const [negOutcome, setNegOutcome] = useState("");
  const [editingNegId, setEditingNegId] = useState<string | null>(null);
  const [confirmDeleteNegOpen, setConfirmDeleteNegOpen] = useState(false);
  const [deletingNeg, setDeletingNeg] = useState(false);
  const [confirmDeleteBatchOpen, setConfirmDeleteBatchOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [confirmDeleteHopDongOpen, setConfirmDeleteHopDongOpen] = useState(false);
  const [deletingHopDong, setDeletingHopDong] = useState(false);

  const getNowDateTimeString = () => {
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  const formatForDateTimeInput = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      const tzoffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
    } catch (e) {
      return "";
    }
  };

  const fetchCabinetItems = async (selectNewCode?: string) => {
    try {
      const res = await fetch("/api/sales/cabinet-items");
      if (res.ok) {
        const data = await res.json();
        setCabinetItems(data);
        if (data.length > 0) {
          if (selectNewCode) {
            setTbCategory(selectNewCode);
            const newItem = data.find((item: any) => item.code === selectNewCode);
            if (newItem) {
              const dims = [
                newItem.length ? `${newItem.length}m` : null,
                newItem.depth ? `${newItem.depth}m` : null,
                newItem.height ? `${newItem.height}m` : null,
              ].filter(Boolean).join(" x ");
              setTbSize(dims || "");
            }
          } else if (!tbCategory || tbCategory === "all" || !data.some((item: any) => item.code === tbCategory)) {
            setTbCategory(data[0].code);
            const firstItem = data[0];
            const dims = [
              firstItem.length ? `${firstItem.length}m` : null,
              firstItem.depth ? `${firstItem.depth}m` : null,
              firstItem.height ? `${firstItem.height}m` : null,
            ].filter(Boolean).join(" x ");
            setTbSize(dims || "");
          }
        }
      }
    } catch (err) {
      console.error("Error fetching cabinet items:", err);
    }
  };

  useEffect(() => {
    fetchCabinetItems();
  }, []);

  const uploadSingleFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Lỗi tải ảnh lên.");
    }

    const data = await res.json();
    return data.url;
  };
  const handleSelectImage = (file: File, imgIndex: 1 | 2) => {
    if (!file.type.startsWith("image/")) {
      toastError("Lỗi", "Vui lòng chọn file hình ảnh.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (imgIndex === 1) {
      if (newItemImagePreview1) URL.revokeObjectURL(newItemImagePreview1);
      setNewItemImageFile1(file);
      setNewItemImagePreview1(previewUrl);
    } else {
      if (newItemImagePreview2) URL.revokeObjectURL(newItemImagePreview2);
      setNewItemImageFile2(file);
      setNewItemImagePreview2(previewUrl);
    }
  };

  const handleRemoveSelectedImage = (imgIndex: 1 | 2) => {
    if (imgIndex === 1) {
      if (newItemImagePreview1) {
        URL.revokeObjectURL(newItemImagePreview1);
      }
      setNewItemImageFile1(null);
      setNewItemImagePreview1("");
    } else {
      if (newItemImagePreview2) {
        URL.revokeObjectURL(newItemImagePreview2);
      }
      setNewItemImageFile2(null);
      setNewItemImagePreview2("");
    }
  };

  const handleSelectCabinetItemToEdit = (itemId: string) => {
    setEditingCabinetItemId(itemId);
    const item = cabinetItems.find(i => i.id === itemId);
    if (item) {
      setNewItemName(item.name || "");
      setNewItemDescription(item.description || "");
      setNewItemUnitPrice(item.unitPrice ? formatInvestmentInput(String(Math.round(item.unitPrice))) : "");
      setNewItemUnit(item.unit || "cái");
      setExistingImageUrl1(item.imageUrl1 || "");
      setExistingImageUrl2(item.imageUrl2 || "");

      // Reset any newly chosen local files/previews
      if (newItemImagePreview1) URL.revokeObjectURL(newItemImagePreview1);
      if (newItemImagePreview2) URL.revokeObjectURL(newItemImagePreview2);
      setNewItemImageFile1(null);
      setNewItemImageFile2(null);
      setNewItemImagePreview1("");
      setNewItemImagePreview2("");
    } else {
      // Clear fields
      setNewItemName("");
      setNewItemDescription("");
      setNewItemUnitPrice("");
      setNewItemUnit("cái");
      setExistingImageUrl1("");
      setExistingImageUrl2("");
      if (newItemImagePreview1) URL.revokeObjectURL(newItemImagePreview1);
      if (newItemImagePreview2) URL.revokeObjectURL(newItemImagePreview2);
      setNewItemImageFile1(null);
      setNewItemImageFile2(null);
      setNewItemImagePreview1("");
      setNewItemImagePreview2("");
    }
  };

  const handleDeleteCabinetItem = async () => {
    if (!editingCabinetItemId) {
      toastError("Lỗi", "Vui lòng chọn một hạng mục để xoá.");
      return;
    }
    const selectedItem = cabinetItems.find(item => item.id === editingCabinetItemId);
    if (!selectedItem) return;

    if (!window.confirm(`Bạn có chắc chắn muốn xoá vĩnh viễn hạng mục "${selectedItem.name}" không? Hành động này không thể hoàn tác.`)) {
      return;
    }

    setSavingCabinetItem(true);
    try {
      const res = await fetch(`/api/sales/cabinet-items?id=${editingCabinetItemId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể xoá hạng mục");
      }

      toastSuccess("Thành công", "Đã xoá hạng mục quầy kệ.");
      setShowAddCabinetItemModal(false);
      await fetchCabinetItems();
    } catch (err: any) {
      toastError("Lỗi", err.message || "Lỗi xoá hạng mục.");
    } finally {
      setSavingCabinetItem(false);
    }
  };

  const handleSaveCabinetItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditCabinetMode && !editingCabinetItemId) {
      toastError("Lỗi", "Vui lòng chọn một hạng mục để cập nhật.");
      return;
    }
    if (!newItemName.trim()) {
      toastError("Lỗi", "Vui lòng nhập Tên gọi hạng mục.");
      return;
    }
    setSavingCabinetItem(true);

    try {
      let finalUrl1 = existingImageUrl1;
      let finalUrl2 = existingImageUrl2;

      if (newItemImageFile1) {
        finalUrl1 = await uploadSingleFile(newItemImageFile1);
      }
      if (newItemImageFile2) {
        finalUrl2 = await uploadSingleFile(newItemImageFile2);
      }

      if (isEditCabinetMode) {
        const selectedItem = cabinetItems.find(item => item.id === editingCabinetItemId);
        if (!selectedItem) throw new Error("Không tìm thấy hạng mục cần sửa.");

        const res = await fetch("/api/sales/cabinet-items", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCabinetItemId,
            code: selectedItem.code,
            name: newItemName.trim(),
            description: newItemDescription.trim(),
            unitPrice: newItemUnitPrice ? parseFloat(newItemUnitPrice.replace(/\./g, "")) : 0,
            unit: newItemUnit.trim() || "cái",
            imageUrl1: finalUrl1,
            imageUrl2: finalUrl2,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Không thể cập nhật hạng mục");
        }

        toastSuccess("Thành công", "Đã cập nhật hạng mục quầy kệ.");
        setShowAddCabinetItemModal(false);
        await fetchCabinetItems(selectedItem.code);
      } else {
        const autoCode = "KE-" + Math.random().toString(36).substring(2, 7).toUpperCase();

        const res = await fetch("/api/sales/cabinet-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: autoCode,
            name: newItemName.trim(),
            description: newItemDescription.trim(),
            unitPrice: newItemUnitPrice ? parseFloat(newItemUnitPrice.replace(/\./g, "")) : 0,
            unit: newItemUnit.trim() || "cái",
            imageUrl1: finalUrl1,
            imageUrl2: finalUrl2,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Không thể tạo hạng mục mới");
        }

        toastSuccess("Thành công", "Đã thêm hạng mục quầy kệ mới.");
        setShowAddCabinetItemModal(false);
        await fetchCabinetItems(autoCode);
      }
    } catch (err: any) {
      toastError("Lỗi", err.message || "Lỗi lưu hạng mục.");
    } finally {
      setSavingCabinetItem(false);
    }
  };

  // Clean up object URLs when modal is closed
  useEffect(() => {
    if (!showAddCabinetItemModal) {
      setNewItemName("");
      setNewItemDescription("");
      setNewItemUnitPrice("");
      setNewItemUnit("cái");
      setExistingImageUrl1("");
      setExistingImageUrl2("");
      if (newItemImagePreview1) {
        URL.revokeObjectURL(newItemImagePreview1);
      }
      if (newItemImagePreview2) {
        URL.revokeObjectURL(newItemImagePreview2);
      }
      setNewItemImageFile1(null);
      setNewItemImageFile2(null);
      setNewItemImagePreview1("");
      setNewItemImagePreview2("");
      setEditingCabinetItemId("");
    }
  }, [showAddCabinetItemModal]);

  useEffect(() => {
    if (selectedPartner) {
      setActiveCareModalTab('info');

      // Parse added cabinet items list from detailCabinetNotes JSON
      if (selectedPartner.detailCabinetNotes && selectedPartner.detailCabinetNotes.startsWith("[")) {
        try {
          setAddedCabinetItems(JSON.parse(selectedPartner.detailCabinetNotes));
        } catch (e) {
          setAddedCabinetItems([]);
        }
      } else {
        setAddedCabinetItems([]);
      }

      setShowGeneralInfo(selectedPartner.step === 1);
      const nameOnly = selectedPartner.contact ? (selectedPartner.contact.split(" - ")[0] || "") : "";
      const phoneOnly = selectedPartner.contact ? (selectedPartner.contact.split(" - ")[1] || "") : "";
      setCareFullName(selectedPartner.detailFullName || nameOnly || "");
      setCarePhone(selectedPartner.detailPhone || phoneOnly || "");
      setCareRole(selectedPartner.detailRole || "Ông chủ");
      setCareEmail(selectedPartner.detailEmail || selectedPartner.contactEmail || "");
      setCareCompanyName(selectedPartner.detailCompanyName || selectedPartner.name || "");
      setCareBusinessAddress(selectedPartner.detailBusinessAddress || "");
      setCareBusinessType(selectedPartner.detailBusinessType || "");
      setCarePremisesScale(selectedPartner.detailPremisesScale || "");
      setCareCollabNeeds(selectedPartner.detailCollabNeeds || selectedPartner.needs || "");
      setCareCurrentBrands(selectedPartner.detailCurrentBrands || "");
      setCareDeploymentPlan(selectedPartner.detailDeploymentPlan || "");
      setCareExpectedInvestment(formatInvestmentInput(selectedPartner.detailExpectedInvestment || ""));
      setCareInvestmentTimeframe(selectedPartner.detailInvestmentTimeframe || "");
      setCareCabinetArea(selectedPartner.detailCabinetArea || "");
      setCareCabinetUnitPrice(selectedPartner.detailCabinetUnitPrice ? formatInvestmentInput(selectedPartner.detailCabinetUnitPrice) : "");
      setCareCabinetBrandSupportRate(selectedPartner.detailCabinetBrandSupportRate || "");
      setCareCabinetOtherCosts(selectedPartner.detailCabinetOtherCosts ? formatInvestmentInput(selectedPartner.detailCabinetOtherCosts) : "");
      setCareCabinetNotes(selectedPartner.detailCabinetNotes || "");
      setCareApproachStep(selectedPartner.detailApproachStep || "Tiếp cận");
      setCareAttitude(selectedPartner.detailAttitude || "Bình thường");
      setCareInterests(selectedPartner.detailInterests || "");
      setCarePainPoints(selectedPartner.detailPainPoints || "");
      setCarePremisesCondition(selectedPartner.detailPremisesCondition || "");
      setCareOtherRequirements(selectedPartner.detailOtherRequirements || "");
      setCareExecutionDate(formatForDateTimeInput(selectedPartner.detailExecutionDate) || getNowDateTimeString());
      setCareExecutor(selectedPartner.careStaff || "");
    } else {
      setAddedCabinetItems([]);
      setShowGeneralInfo(false);
      setCareFullName("");
      setCarePhone("");
      setCareRole("Ông chủ");
      setCareEmail("");
      setCareCompanyName("");
      setCareBusinessAddress("");
      setCareBusinessType("");
      setCarePremisesScale("");
      setCareCollabNeeds("");
      setCareCurrentBrands("");
      setCareDeploymentPlan("");
      setCareExpectedInvestment("");
      setCareInvestmentTimeframe("");
      setCareCabinetArea("");
      setCareCabinetUnitPrice("");
      setCareCabinetBrandSupportRate("");
      setCareCabinetOtherCosts("");
      setCareCabinetNotes("");
      setCareApproachStep("Tiếp cận");
      setCareAttitude("Bình thường");
      setCareInterests("");
      setCarePainPoints("");
      setCarePremisesCondition("");
      setCareOtherRequirements("");
      setCareExecutionDate("");
      setCareExecutor("");
    }
  }, [selectedPartner]);

  useEffect(() => {
    if (!showCareModal) {
      setAddedCabinetItems([]);
      setEditingCareHistoryId(null);
    }
  }, [showCareModal]);

  const handleAddNewNeg = (partnerInput?: PartnerProcessItem) => {
    const partner = partnerInput || selectedPartner;
    setEditingNegId(null);
    setNegDate(getNowDateTimeString());
    setNegExecutor(partner?.careStaff || currentUserName);
    setNegType("call");
    setNegOutcome("");
    setShowNegModal(true);
  };

  const handleEditQuotationNegotiation = (neg: PartnerQuoteNegotiationItem) => {
    setEditingNegId(neg.id);
    setNegDate(formatForDateTimeInput(neg.ngay));
    setNegExecutor(neg.nguoiThucHien || "");
    setNegType(neg.loai || "call");
    setNegOutcome(neg.ketQua || "");
    setShowNegModal(true);
  };

  const handleSaveNegotiation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    if (!negDate || !negExecutor || !negOutcome.trim()) {
      toastError("Lỗi", "Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    try {
      let activeQuoteId = selectedPartner.quoteId;

      // If no quotation exists yet, create one on the fly first
      if (!activeQuoteId) {
        const generatedCode = `BG-2026-0${Math.floor(1000 + Math.random() * 9000)}`;
        const createRes = await fetch(`/api/sales/partners`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedPartner.id,
            action: "CREATE_QUOTATION",
            quoteCode: generatedCode,
            quoteValue: 150000000,
            discountRate: 35,
            quoteStatus: "Draft"
          })
        });

        if (!createRes.ok) {
          let errText = "Gặp lỗi khi tạo báo giá tự động.";
          try {
            const errData = await createRes.json();
            errText = errData.error || errText;
          } catch (_) { }
          toastError(errText);
          return;
        }

        const updatedPartner = await createRes.json();
        activeQuoteId = updatedPartner.quoteId;
        // Keep state in sync
        setSelectedPartner(updatedPartner);
      }

      if (!activeQuoteId) {
        toastError("Không tìm thấy thông tin báo giá của đại lý này.");
        return;
      }

      const isEditing = editingNegId && editingNegId !== "default-neg";
      const url = `/api/plan-finance/quotations/${activeQuoteId}/negotiations` + (isEditing ? `?negId=${editingNegId}` : "");
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loai: negType,
          ngay: negDate,
          nguoiThucHien: negExecutor,
          ketQua: negOutcome
        })
      });

      if (res.ok) {
        toastSuccess(isEditing ? "Cập nhật lịch sử báo giá thành công!" : "Thêm mới lịch sử báo giá thành công!");
        setShowNegModal(false);
        await fetchPartners();
      } else {
        let errMsg = "Gặp lỗi khi lưu lịch sử báo giá.";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (_) { }
        toastError(errMsg);
      }
    } catch (err) {
      console.error("Error saving negotiation:", err);
      toastError("Lỗi kết nối server.");
    }
  };

  const handleDeleteNegClick = () => {
    setConfirmDeleteNegOpen(true);
  };

  const handleDeleteNegConfirm = async () => {
    if (!selectedPartner || !selectedPartner.quoteId || !editingNegId) return;
    setDeletingNeg(true);
    try {
      const res = await fetch(`/api/plan-finance/quotations/${selectedPartner.quoteId}/negotiations?negId=${editingNegId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toastSuccess("Xoá lịch sử báo giá thành công!");
        setShowNegModal(false);
        setConfirmDeleteNegOpen(false);
        await fetchPartners();
      } else {
        const errData = await res.json();
        toastError(errData.error || "Không thể xoá lịch sử báo giá.");
      }
    } catch (err) {
      console.error("Error deleting negotiation:", err);
      toastError("Có lỗi xảy ra khi xoá.");
    } finally {
      setDeletingNeg(false);
    }
  };

  const handleCreateQuotation = async () => {
    if (!selectedPartner) return;
    try {
      const generatedCode = `BG-2026-0${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch(`/api/sales/partners`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          quoteCode: generatedCode,
          quoteValue: 150000000,
          discountRate: 35,
          quoteStatus: "Draft"
        })
      });

      if (res.ok) {
        const updatedPartner = await res.json();
        toastSuccess("Tạo báo giá thành công!");
        setSelectedPartner(updatedPartner);
        await fetchPartners();
      } else {
        const errData = await res.json();
        toastError(errData.error || "Gặp lỗi khi tạo báo giá.");
      }
    } catch (err) {
      console.error("Error creating quotation:", err);
      toastError("Lỗi kết nối server.");
    }
  };

  const handleAddNewCare = (partnerInput?: PartnerProcessItem) => {
    setEditingCareHistoryId(null);
    const partner = partnerInput || selectedPartner;
    if (partner) {
      const nameOnly = partner.contact ? (partner.contact.split(" - ")[0] || "") : "";
      const phoneOnly = partner.contact ? (partner.contact.split(" - ")[1] || "") : "";

      const latestHistory = partner.careHistories && partner.careHistories.length > 0
        ? partner.careHistories[0]
        : null;

      if (latestHistory) {
        setCareFullName(latestHistory.fullName || "");
        setCarePhone(latestHistory.phone || "");
        setCareRole(latestHistory.role || "Ông chủ");
        setCareEmail(latestHistory.email || "");
        setCareCompanyName(latestHistory.companyName || "");
        setCareBusinessAddress(latestHistory.businessAddress || "");
        setCareBusinessType(latestHistory.businessType || "");
        setCarePremisesScale(latestHistory.premisesScale || "");
        setCareCollabNeeds(latestHistory.collabNeeds || "");
        setCareCurrentBrands(latestHistory.currentBrands || "");
        setCareDeploymentPlan(latestHistory.deploymentPlan || "");
        setCareExpectedInvestment(formatInvestmentInput(latestHistory.expectedInvestment || ""));
        setCareInvestmentTimeframe(latestHistory.investmentTimeframe || "");
        setCareApproachStep(latestHistory.approachStep || "Tiếp cận");
        setCareAttitude(latestHistory.attitude || "Bình thường");
        setCareInterests(latestHistory.interests || "");
        setCarePainPoints(latestHistory.painPoints || "");
        setCarePremisesCondition(latestHistory.premisesCondition || "");
        setCareOtherRequirements(latestHistory.otherRequirements || "");

        if (latestHistory.cabinetNotes && latestHistory.cabinetNotes.startsWith("[")) {
          try {
            setAddedCabinetItems(JSON.parse(latestHistory.cabinetNotes));
          } catch (e) {
            setAddedCabinetItems([]);
          }
        } else {
          setAddedCabinetItems([]);
        }
      } else {
        setCareFullName(partner.detailFullName || nameOnly || "");
        setCarePhone(partner.detailPhone || phoneOnly || "");
        setCareRole(partner.detailRole || "Ông chủ");
        setCareEmail(partner.detailEmail || partner.contactEmail || "");
        setCareCompanyName(partner.detailCompanyName || partner.name || "");
        setCareBusinessAddress(partner.detailBusinessAddress || "");
        setCareBusinessType(partner.detailBusinessType || "");
        setCarePremisesScale(partner.detailPremisesScale || "");
        setCareCollabNeeds(partner.detailCollabNeeds || partner.needs || "");
        setCareCurrentBrands(partner.detailCurrentBrands || "");
        setCareDeploymentPlan(partner.detailDeploymentPlan || "");
        setCareExpectedInvestment(formatInvestmentInput(partner.detailExpectedInvestment || ""));
        setCareInvestmentTimeframe(partner.detailInvestmentTimeframe || "");
        setCareApproachStep(partner.detailApproachStep || "Tiếp cận");
        setCareAttitude(partner.detailAttitude || "Bình thường");
        setCareInterests(partner.detailInterests || "");
        setCarePainPoints(partner.detailPainPoints || "");
        setCarePremisesCondition(partner.detailPremisesCondition || "");
        setCareOtherRequirements(partner.detailOtherRequirements || "");
        setAddedCabinetItems([]);
      }

      setCareExecutionDate(getNowDateTimeString());
      setCareExecutor(partner.careStaff || "");
      setShowCareModal(true);
    }
  };

  const handleEditCareHistory = (history: PartnerCareHistoryItem) => {
    setEditingCareHistoryId(history.id);
    setCareFullName(history.fullName || "");
    setCarePhone(history.phone || "");
    setCareRole(history.role || "Ông chủ");
    setCareEmail(history.email || "");
    setCareCompanyName(history.companyName || "");
    setCareBusinessAddress(history.businessAddress || "");
    setCareBusinessType(history.businessType || "");
    setCarePremisesScale(history.premisesScale || "");
    setCareCollabNeeds(history.collabNeeds || "");
    setCareCurrentBrands(history.currentBrands || "");
    setCareDeploymentPlan(history.deploymentPlan || "");
    setCareExpectedInvestment(formatInvestmentInput(history.expectedInvestment || ""));
    setCareInvestmentTimeframe(history.investmentTimeframe || "");
    setCareCabinetArea(history.cabinetArea || "");
    setCareCabinetUnitPrice(history.cabinetUnitPrice ? formatInvestmentInput(history.cabinetUnitPrice) : "");
    setCareCabinetBrandSupportRate(history.cabinetBrandSupportRate || "");
    setCareCabinetOtherCosts(history.cabinetOtherCosts ? formatInvestmentInput(history.cabinetOtherCosts) : "");
    setCareCabinetNotes(history.cabinetNotes || "");

    // Parse added cabinet items list from cabinetNotes JSON
    if (history.cabinetNotes && history.cabinetNotes.startsWith("[")) {
      try {
        setAddedCabinetItems(JSON.parse(history.cabinetNotes));
      } catch (e) {
        setAddedCabinetItems([]);
      }
    } else {
      setAddedCabinetItems([]);
    }

    setCareApproachStep(history.approachStep || "Tiếp cận");
    setCareAttitude(history.attitude || "Bình thường");
    setCareInterests(history.interests || "");
    setCarePainPoints(history.painPoints || "");
    setCarePremisesCondition(history.premisesCondition || "");
    setCareOtherRequirements(history.otherRequirements || "");
    setCareExecutionDate(formatForDateTimeInput(history.executionDate));
    setCareExecutor(history.executor || "");
    setShowCareModal(true);
  };

  const isSalesManager = useMemo(() => {
    if (!session?.user) return false;
    const role = session.user.role;
    const dept = session.user.departmentCode?.toLowerCase() || "";
    const posName = session.user.positionName || "";
    return role === "SUPERADMIN" || role === "admin" || (
      dept === "sales" && posName.includes("Trưởng phòng")
    );
  }, [session]);

  useEffect(() => {
    fetch("/api/hr/employees/crm")
      .then(res => res.json())
      .then(data => {
        if (data.employees) {
          setCrmEmployees(data.employees);
        }
      })
      .catch(err => console.error("Error fetching CRM employees", err));

    fetch("/api/company")
      .then(res => res.json())
      .then(data => {
        if (data && data.phone) {
          data.phone = data.phone.replace(/^[Hh]otline:\s*/i, "");
        }
        setCompanyInfo(data);
      })
      .catch(err => console.error("Error fetching company info", err));
  }, []);

  // Fetch partners from API
  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales/partners");
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
        // Sync selected partner
        setSelectedPartner(prev => {
          if (!prev) return null;
          const fresh = data.find((p: any) => p.id === prev.id);
          return fresh || prev;
        });
      }
    } catch (e) {
      console.error("Error fetching partners", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();

    const handlePartnersUpdated = () => {
      fetchPartners();
    };
    window.addEventListener("partners-updated", handlePartnersUpdated);
    return () => {
      window.removeEventListener("partners-updated", handlePartnersUpdated);
    };
  }, []);

  // Clear selections when step, search, or filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentStep, searchTerm, areaFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredPartners.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleBatchAdvanceStep = async () => {
    const promises = partners
      .filter(p => selectedIds.has(p.id) && p.step < 5)
      .map(p => {
        const next = p.step + 1;
        const updated = { ...p, step: next };

        if (next === 2) {
          const hasCrm = crmEmployees.some(emp => emp.fullName === currentUserName);
          updated.careStaff = updated.careStaff || (hasCrm ? currentUserName : (crmEmployees[0]?.fullName || "Vũ Hoàng Long"));
          updated.careChannel = updated.careChannel || "Zalo";
          updated.careNote = updated.careNote || "Bắt đầu chăm sóc sau tiếp nhận thông tin.";
          updated.nextSchedule = updated.nextSchedule || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        } else if (next === 3) {
          updated.quoteCode = "";
          updated.quoteValue = 0;
          updated.discountRate = 0;
          updated.quoteStatus = undefined;
        } else if (next === 4) {
          updated.contractNo = updated.contractNo || `HDDL-2026-0${Math.floor(1000 + Math.random() * 9000)}`;
          updated.contractValue = updated.contractValue || updated.quoteValue || 150000000;
          updated.creditLimit = updated.creditLimit || 50000000;
          updated.signDate = updated.signDate || new Date().toISOString().split("T")[0];
          updated.contractStatus = updated.contractStatus || "Pending Signature";
        } else if (next === 5) {
          updated.showroomArea = updated.showroomArea || 100;
          updated.designStatus = updated.designStatus || "Designing";
          updated.constructionProgress = updated.constructionProgress || 10;
          updated.estOpeningDate = updated.estOpeningDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          updated.constructionStatus = updated.constructionStatus || "Pending";
        }

        const { id, name, area, source, scale, contact, contactEmail, needs, step, ...formValuesRest } = updated;
        return fetch("/api/sales/partners", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            name,
            area,
            source,
            scale,
            contact,
            contactEmail,
            needs,
            step,
            ...formValuesRest
          }),
        });
      });

    try {
      await Promise.all(promises);
      await fetchPartners();
      setSelectedIds(new Set());
    } catch (e) {
      console.error("Error batch advancing step", e);
    }
  };

  const handleBatchRegressStep = async () => {
    const promises = partners
      .filter(p => selectedIds.has(p.id) && p.step > 1)
      .map(p => {
        const updated = { ...p, step: p.step - 1 };
        const { id, name, area, source, scale, contact, contactEmail, needs, step, ...formValuesRest } = updated;
        return fetch("/api/sales/partners", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            name,
            area,
            source,
            scale,
            contact,
            contactEmail,
            needs,
            step,
            ...formValuesRest
          }),
        });
      });

    try {
      await Promise.all(promises);
      await fetchPartners();
      setSelectedIds(new Set());
    } catch (e) {
      console.error("Error batch regressing step", e);
    }
  };

  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newSource, setNewSource] = useState("Website");
  const [newScale, setNewScale] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newRole, setNewRole] = useState("Ông chủ");
  const [newPhone, setNewPhone] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newNeeds, setNewNeeds] = useState("");

  const areas = useMemo(() => {
    return Array.from(new Set(partners.map(p => p.area)));
  }, [partners]);

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const pStep = Number(p.step);
      const cStep = Number(currentStep);
      if (cStep === 4) {
        if (pStep < 4) return false;
      } else {
        if (pStep !== cStep) return false;
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match =
          p.name.toLowerCase().includes(s) ||
          p.id.toLowerCase().includes(s) ||
          p.contact.toLowerCase().includes(s) ||
          (p.contactEmail && p.contactEmail.toLowerCase().includes(s));
        if (!match) return false;
      }
      if (areaFilter && p.area !== areaFilter) return false;
      return true;
    });
  }, [partners, currentStep, searchTerm, areaFilter]);

  const ganttTasksForStep5 = useMemo(() => {
    const year = new Date().getFullYear();
    const list: any[] = [];

    const overlapsMonth = (start: Date, end: Date, month: number, yr: number) => {
      const monthStart = new Date(yr, month - 1, 1);
      const monthEnd = new Date(yr, month, 0, 23, 59, 59);
      return start <= monthEnd && end >= monthStart;
    };

    filteredPartners.forEach((partner) => {
      const subTasksRaw = [
        {
          num: 1,
          label: "Đo đạc & Thiết kế 3D",
          dateStr: partner.consTimeline1,
          color: "#3b82f6",
          getStatusAndProgress: () => {
            const progress = partner.consProgress1 || 0;
            const status = progress === 100 ? "done" : progress > 0 ? "in_progress" : "pending";
            return { status, progress };
          }
        },
        {
          num: 2,
          label: "Chuẩn bị nguyên vật liệu",
          dateStr: partner.consTimeline2,
          color: "#8b5cf6",
          getStatusAndProgress: () => {
            const progress = partner.consProgress2 || 0;
            const status = progress === 100 ? "done" : progress > 0 ? "in_progress" : "pending";
            return { status, progress };
          }
        },
        {
          num: 3,
          label: "Thi công quầy kệ",
          dateStr: partner.consTimeline3,
          color: "#f59e0b",
          getStatusAndProgress: () => {
            const progress = partner.consProgress3 || 0;
            const status = progress === 100 ? "done" : progress > 0 ? "in_progress" : "pending";
            return { status, progress };
          }
        },
        {
          num: 4,
          label: "Lắp sản phẩm trưng bày",
          dateStr: partner.consTimeline4,
          color: "#06b6d4",
          getStatusAndProgress: () => {
            const progress = partner.consProgress4 || 0;
            const status = progress === 100 ? "done" : progress > 0 ? "in_progress" : "pending";
            return { status, progress };
          }
        },
        {
          num: 5,
          label: "Bàn giao, nghiệm thu",
          dateStr: partner.consTimeline5,
          color: "#10b981",
          getStatusAndProgress: () => {
            const progress = partner.consProgress5 || 0;
            const status = progress === 100 ? "done" : progress > 0 ? "in_progress" : "pending";
            return { status, progress };
          }
        }
      ];

      const activeSubTasks = subTasksRaw
        .map(t => {
          const parsed = parseDateRange(t.dateStr);
          if (!parsed) return null;
          const { status, progress } = t.getStatusAndProgress();
          return {
            id: `${partner.id}_${t.num}`,
            title: t.label,
            status,
            progress,
            createdAt: parsed.start.toISOString(),
            deadline: parsed.end.toISOString(),
            color: t.color,
            start: parsed.start,
            end: parsed.end
          };
        })
        .filter(Boolean) as any[];

      const filteredSubTasks = activeSubTasks.filter(t => overlapsMonth(t.start, t.end, filterMonth, year));

      if (filteredSubTasks.length > 0) {
        list.push({
          id: `${partner.id}_header`,
          title: partner.name,
          assigneeName: partner.area,
          isHeader: true,
          status: "done"
        });
        filteredSubTasks.forEach(st => {
          list.push({
            id: st.id,
            title: st.title,
            status: st.status,
            progress: st.progress,
            createdAt: st.createdAt,
            deadline: st.deadline
          });
        });
      }
    });

    return list;
  }, [filteredPartners, filterMonth]);

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setEditingPartner(null);
    setNewName("");
    setNewArea("");
    setNewContact("");
    setNewRole("Ông chủ");
    setNewPhone("");
    setNewContactEmail("");
    setNewScale("");
    setNewNeeds("");
  };

  const handleEditPartnerClick = (partner: PartnerProcessItem) => {
    setEditingPartner(partner);
    setNewName(partner.name || "");
    setNewArea(partner.area || "");
    setNewSource(partner.source || "Website");
    const contactParts = partner.contact ? partner.contact.split(" - ") : [];
    setNewContact(contactParts[0] || "");
    setNewPhone(contactParts[1] || "");
    setNewContactEmail(partner.contactEmail || "");
    setNewRole(partner.detailRole || "Ông chủ");
    setNewScale(partner.scale || "");
    setNewNeeds(partner.needs || "");
    setShowCreateModal(true);
  };

  const handleSaveEditPartner = async () => {
    if (!editingPartner) return;
    if (!newArea || !newContact) {
      toastError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }
    const updated: PartnerProcessItem = {
      ...editingPartner,
      name: newName || "Chưa đặt tên",
      area: newArea,
      source: newSource,
      scale: newScale,
      contact: newPhone ? `${newContact} - ${newPhone}` : newContact,
      contactEmail: newContactEmail || undefined,
      needs: newNeeds,
      detailRole: newRole,
    };
    const success = await handleUpdatePartnerDetails(updated);
    if (success) {
      toastSuccess("Thành công", "Đã cập nhật thông tin đại lý.");
      setShowCreateModal(false);
      setEditingPartner(null);
      // Reset fields
      setNewName("");
      setNewArea("");
      setNewContact("");
      setNewRole("Ông chủ");
      setNewPhone("");
      setNewContactEmail("");
      setNewScale("");
      setNewNeeds("");
    }
  };

  const handleDeletePartnerConfirm = async () => {
    if (!partnerToDelete) return;
    setDeletingPartner(true);
    try {
      const res = await fetch(`/api/sales/partners?ids=${partnerToDelete.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toastSuccess("Thành công", `Đã xoá thành công đại lý "${partnerToDelete.name}" khỏi hệ thống.`);
        setConfirmDeletePartnerOpen(false);
        setPartnerToDelete(null);
        await fetchPartners();
      } else {
        const errData = await res.json();
        toastError("Lỗi", errData.error || "Gặp lỗi khi xoá dữ liệu đại lý.");
      }
    } catch (err) {
      console.error("Error deleting partner:", err);
      toastError("Lỗi", "Gặp lỗi hệ thống khi xoá dữ liệu.");
    } finally {
      setDeletingPartner(false);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArea || !newContact) return;

    try {
      const res = await fetch("/api/sales/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName || "Chưa đặt tên",
          area: newArea,
          source: newSource,
          scale: newScale,
          contact: newPhone ? `${newContact} - ${newPhone}` : newContact,
          contactEmail: newContactEmail || undefined,
          needs: newNeeds,
          role: newRole,
        }),
      });

      if (res.ok) {
        await fetchPartners();
        setShowCreateModal(false);
        // Reset fields
        setNewName("");
        setNewArea("");
        setNewContact("");
        setNewRole("Ông chủ");
        setNewPhone("");
        setNewContactEmail("");
        setNewScale("");
        setNewNeeds("");
      }
    } catch (e) {
      console.error("Error creating partner", e);
    }
  };

  const handleUpdatePartnerDetails = async (updated: PartnerProcessItem) => {
    try {
      const { id, name, area, source, scale, contact, contactEmail, needs, step, ...formValuesRest } = updated;
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          area,
          source,
          scale,
          contact,
          contactEmail,
          needs,
          step,
          ...formValuesRest
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === returnedPartner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
        return true;
      } else {
        const errData = await res.json();
        console.error("PATCH error response:", errData);
        toastError(errData.error || "Có lỗi xảy ra khi cập nhật dữ liệu.");
        return false;
      }
    } catch (e) {
      console.error("Error updating partner details", e);
      toastError("Lỗi kết nối server.");
      return false;
    }
  };
  const handleSaveCareDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

    if (
      !careFullName.trim() ||
      !carePhone.trim() ||
      !careCompanyName.trim() ||
      !careBusinessAddress.trim() ||
      !carePremisesScale.trim() ||
      !careCollabNeeds.trim() ||
      !careDeploymentPlan.trim() ||
      !careExecutionDate.trim() ||
      !careOtherRequirements.trim()
    ) {
      toastError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    let updatedHistories = [...(selectedPartner.careHistories || [])];
    const isEditing = editingCareHistoryId && editingCareHistoryId !== "default";

    const calculatedStars = calculateLeadStars({
      role: careRole,
      deploymentPlan: careDeploymentPlan,
      collabNeeds: careCollabNeeds,
      otherRequirements: careOtherRequirements,
      painPoints: carePainPoints,
      attitude: careAttitude,
    });

    const entryId = isEditing ? editingCareHistoryId! : Math.random().toString();
    const entry: PartnerCareHistoryItem = {
      id: entryId,
      partnerId: selectedPartner.id,
      fullName: careFullName,
      role: careRole,
      phone: carePhone,
      email: careEmail,
      companyName: careCompanyName,
      businessAddress: careBusinessAddress,
      businessType: careBusinessType,
      premisesScale: carePremisesScale,
      collabNeeds: careCollabNeeds,
      currentBrands: careCurrentBrands,
      deploymentPlan: careDeploymentPlan,
      expectedInvestment: careExpectedInvestment,
      investmentTimeframe: careInvestmentTimeframe,
      cabinetArea: careCabinetArea,
      cabinetUnitPrice: careCabinetUnitPrice.replace(/\./g, ""),
      cabinetBrandSupportRate: careCabinetBrandSupportRate,
      cabinetOtherCosts: careCabinetOtherCosts.replace(/\./g, ""),
      cabinetNotes: JSON.stringify(addedCabinetItems),
      approachStep: careApproachStep,
      attitude: careAttitude,
      interests: careInterests,
      painPoints: carePainPoints,
      premisesCondition: carePremisesCondition,
      otherRequirements: careOtherRequirements,
      stars: calculatedStars,
      executionDate: careExecutionDate,
      executor: careExecutor || selectedPartner.careStaff || "Chưa phân công",
    };

    if (isEditing) {
      updatedHistories = updatedHistories.map(h => h.id === editingCareHistoryId ? entry : h);
    } else {
      updatedHistories = [entry, ...updatedHistories];
    }

    // Sort by executionDate descending to ensure order
    const sortedHistories = [...updatedHistories].sort(
      (a, b) => getSafeTimestamp(b.executionDate) - getSafeTimestamp(a.executionDate)
    );

    const latestHistory = sortedHistories[0] || entry;
    const latestCalculatedStars = calculateLeadStars({
      role: latestHistory.role,
      deploymentPlan: latestHistory.deploymentPlan,
      collabNeeds: latestHistory.collabNeeds,
      otherRequirements: latestHistory.otherRequirements,
      painPoints: latestHistory.painPoints,
      attitude: latestHistory.attitude,
    });

    const updated: PartnerProcessItem = {
      ...selectedPartner,
      detailFullName: latestHistory.fullName,
      detailPhone: latestHistory.phone,
      detailRole: latestHistory.role,
      detailEmail: latestHistory.email,
      detailCompanyName: latestHistory.companyName,
      detailBusinessAddress: latestHistory.businessAddress,
      detailBusinessType: latestHistory.businessType,
      detailPremisesScale: latestHistory.premisesScale,
      detailCollabNeeds: latestHistory.collabNeeds,
      detailCurrentBrands: latestHistory.currentBrands,
      detailDeploymentPlan: latestHistory.deploymentPlan,
      detailExpectedInvestment: latestHistory.expectedInvestment,
      detailInvestmentTimeframe: latestHistory.investmentTimeframe,
      detailCabinetArea: latestHistory.cabinetArea,
      detailCabinetUnitPrice: latestHistory.cabinetUnitPrice,
      detailCabinetBrandSupportRate: latestHistory.cabinetBrandSupportRate,
      detailCabinetOtherCosts: latestHistory.cabinetOtherCosts,
      detailCabinetNotes: latestHistory.cabinetNotes,
      detailApproachStep: latestHistory.approachStep,
      detailAttitude: latestHistory.attitude,
      detailInterests: latestHistory.interests,
      detailPainPoints: latestHistory.painPoints,
      detailPremisesCondition: latestHistory.premisesCondition,
      detailOtherRequirements: latestHistory.otherRequirements,
      detailExecutionDate: latestHistory.executionDate,
      detailExecutor: latestHistory.executor,
      careStaff: latestHistory.executor,
      stars: latestCalculatedStars,
      careHistories: sortedHistories,
      careHistoryId: isEditing ? editingCareHistoryId! : undefined,
    };

    const success = await handleUpdatePartnerDetails(updated);
    if (success) {
      setShowCareModal(false);
      toastSuccess("Cập nhật thông tin chăm sóc thành công!");
    }
  };

  const handleRequestSpecialException = async (partner: PartnerProcessItem, reason: string) => {
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: partner.id,
          detailSpecialRequestPending: true,
          exceptionReason: reason,
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === partner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
        toastSuccess("Đã gửi yêu cầu đặc cách cho Trưởng phòng kinh doanh!");
        setShowExceptionModal(false);
      } else {
        toastError("Không thể gửi yêu cầu đặc cách. Vui lòng thử lại!");
      }
    } catch (e) {
      console.error("Error requesting special exception", e);
      toastError("Có lỗi xảy ra khi gửi yêu cầu!");
    }
  };

  const handleAbandonPartner = (partner: PartnerProcessItem) => {
    setPartnerToAbandon(partner);
    setConfirmAbandonOpen(true);
  };

  const handleAbandonPartnerConfirm = async () => {
    if (!partnerToAbandon) return;
    setAbandoningPartner(true);
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: partnerToAbandon.id,
          step: 6,
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === partnerToAbandon.id ? returnedPartner : p));
        setSelectedPartner(null);
        toastSuccess("Đã chuyển trạng thái đại lý thành Từ bỏ!");
        setConfirmAbandonOpen(false);
        setPartnerToAbandon(null);
      } else {
        toastError("Không thể cập nhật trạng thái đại lý. Vui lòng thử lại!");
      }
    } catch (e) {
      console.error("Error abandoning partner", e);
      toastError("Có lỗi xảy ra!");
    } finally {
      setAbandoningPartner(false);
    }
  };

  const getBRepresentativeName = (partner: PartnerProcessItem) => {
    const contactName = partner.contact ? partner.contact.split(" - ")[0] : "";
    if (!contactName || contactName === partner.name) {
      return "";
    }
    return contactName;
  };

  const handleOpenBienBan = () => {
    if (!selectedPartner) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    setBbDate(selectedPartner.bbDate || "");
    setBbCode(selectedPartner.bbCode || "");
    setBbA_DienThoai(selectedPartner.bbA_DienThoai || companyInfo?.phone || "1900.633.862");
    setBbANguoiKy(selectedPartner.bbANguoiKy || companyInfo?.legalRep || "Lê Công Vụ");
    setBbAChucVu(selectedPartner.bbAChucVu || "Giám đốc");
    setBbQuoteCode(selectedPartner.bbQuoteCode || selectedPartner.quoteCode || "");
    setBbDiaDiem(selectedPartner.bbDiaDiem || "Văn phòng Công ty Seajong Faucet Việt Nam");
    setBbB_Ten(selectedPartner.bbB_Ten || selectedPartner.detailCompanyName || selectedPartner.name || "");
    setBbB_DiaChi(selectedPartner.bbB_DiaChi || selectedPartner.detailBusinessAddress || selectedPartner.area || "");
    setBbB_MST(selectedPartner.bbB_MST || "");
    setBbB_DaiDien(selectedPartner.bbB_DaiDien || getBRepresentativeName(selectedPartner));
    setBbB_ChucVu(selectedPartner.bbB_ChucVu || selectedPartner.detailRole || "Giám đốc");
    const phoneOnly = selectedPartner.contact ? (selectedPartner.contact.split(" - ")[1] || "") : "";
    setBbB_DienThoai(selectedPartner.bbB_DienThoai || selectedPartner.detailPhone || phoneOnly || "");
    setBbB_Email(selectedPartner.bbB_Email || selectedPartner.detailEmail || selectedPartner.contactEmail || "");

    if (selectedPartner.bbSupports) {
      setBbSupports(selectedPartner.bbSupports);
    } else {
      setBbSupports({
        thietKeQuayKe: true,
        quayKeCoBan: true,
        catalogue: true,
        brochure: true,
        tagTreo: true,
        standee: true,
        bangGia: true,
        goiQuangCao: false,
        manHinhLed: false,
        bienBangSeajong: false,
        posterKhoLon: false,
        backdropPhotoBooth: false,
        vatPhamQuaTang: false,
        posmQrCode: false,
        dongPhucNhanVien: false,
        chiPhiNoiThat: false,
      });
    }

    if (selectedPartner.bbBonuses) {
      setBbBonuses(selectedPartner.bbBonuses);
    } else {
      setBbBonuses([
        {
          id: "1",
          title: "Thưởng thanh toán",
          desc: "Chiết khấu thanh toán 2% trên tổng giá trị hóa đơn (chưa VAT) khi Đại lý hoàn tất thanh toán trước hạn hoặc đúng hạn quy định trong Hợp đồng đại lý.",
          formula: "Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)"
        },
        {
          id: "2",
          title: "Thưởng doanh số năm",
          desc: "Mức thưởng đạt chỉ tiêu doanh thu năm cam kết tối thiểu. Được chi trả bằng hàng hóa hoặc trừ trực tiếp vào công nợ đơn hàng đầu tiên của năm tiếp theo.",
          formula: "Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế"
        },
        {
          id: "3",
          title: "Thưởng vượt doanh số năm",
          desc: "Mức thưởng khuyến khích vượt chỉ tiêu doanh số năm cam kết.",
          formula: "Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết"
        }
      ]);
    }
    setShowBienBanModal(true);
  };

  const handleSaveBienBan = async () => {
    if (!selectedPartner) return;
    setSavingBienBan(true);
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          bbDate,
          bbCode,
          bbA_DienThoai,
          bbANguoiKy,
          bbAChucVu,
          bbQuoteCode,
          bbDiaDiem,
          bbB_Ten,
          bbB_DiaChi,
          bbB_MST,
          bbB_DaiDien,
          bbB_ChucVu,
          bbB_DienThoai,
          bbB_Email,
          bbSupports,
          bbBonuses,
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === selectedPartner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
        toastSuccess("Đã lưu biên bản thỏa thuận thành công!");
      } else {
        toastError("Không thể lưu biên bản thỏa thuận!");
      }
    } catch (e) {
      console.error("Error saving memorandum", e);
      toastError("Lỗi hệ thống khi lưu biên bản!");
    } finally {
      setSavingBienBan(false);
    }
  };

  const handlePrintMOU = () => {
    const docEl = document.getElementById("mou-print-doc");
    if (!docEl) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iDoc = iframe.contentWindow?.document;
    if (!iDoc) return;

    iDoc.open();
    iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Biên bản ghi nhớ - ${careCompanyName || careFullName || ""}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4;
      margin: 2cm 2cm 2cm 3cm; /* Lề trên: 2cm, Lề phải: 2cm, Lề dưới: 2cm, Lề trái: 3cm */
    }
    body {
      font-family: 'Roboto Condensed', sans-serif;
      padding: 0;
      margin: 0;
      color: #000;
      background-color: #fff;
    }
    /* Gán cố định cỡ chữ in ấn 11px cho các thành phần nội dung */
    body, p, span, td, th, li, ol, div {
      font-family: 'Roboto Condensed', sans-serif !important;
      font-size: 11px !important;
      color: #000 !important;
    }
    /* Tiêu đề chính của biên bản ghi nhớ */
    .mou-title {
      font-size: 18px !important;
      font-weight: bold !important;
      text-align: center !important;
      text-transform: uppercase !important;
      margin-top: 20px !important;
      margin-bottom: 20px !important;
    }
    /* Tiêu đề các đề mục I, II, III */
    .mou-section-header {
      font-size: 13px !important;
      font-weight: bold !important;
      text-transform: uppercase !important;
      margin-top: 15px !important;
      margin-bottom: 8px !important;
      border-bottom: 1px solid #cbd5e1 !important;
    }
    .info-table td {
      padding: 4px 8px !important;
    }
    .cabinet-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
    }
    .cabinet-table th {
      background-color: #f1f5f9 !important;
      color: #000 !important;
      font-weight: bold !important;
      border: 1px solid #cbd5e1 !important;
      padding: 6px 8px !important;
      vertical-align: middle !important;
    }
    .cabinet-table td {
      border: 1px solid #cbd5e1 !important;
      padding: 6px 8px !important;
      vertical-align: middle !important;
      line-height: 1.4 !important;
      word-break: break-word !important;
    }
    .text-secondary, .text-muted, .text-dark {
      color: #000 !important;
    }
    @media print {
      body { padding: 0; margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${docEl.innerHTML}
</body>
</html>`);
    iDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }, 600);
  };

  const handleExportMOUPDF = async () => {
    const docEl = document.getElementById("mou-print-doc");
    if (!docEl) return;

    setPdfUploadingMOU(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const pages = docEl.getElementsByClassName("mou-print-page");
      if (pages.length === 0) return;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;

        const clonedPage = pageEl.cloneNode(true) as HTMLElement;
        clonedPage.style.boxShadow = "none";
        clonedPage.style.margin = "0";
        clonedPage.style.position = "relative";
        clonedPage.style.width = "210mm";
        clonedPage.style.height = "297mm";
        clonedPage.style.boxSizing = "border-box";
        clonedPage.style.padding = "20mm 20mm 20mm 30mm";
        clonedPage.style.background = "#fff";
        clonedPage.style.display = "flex";
        clonedPage.style.flexDirection = "column";

        const style = document.createElement("style");
        style.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap');
          * {
            font-family: 'Roboto Condensed', sans-serif !important;
            color: #000 !important;
          }
          body, p, span, td, th, li, ol, div {
            font-size: 11px !important;
          }
          .mou-title {
            font-size: 18px !important;
            font-weight: bold !important;
            text-align: center !important;
            text-transform: uppercase !important;
            margin-top: 20px !important;
            margin-bottom: 20px !important;
          }
          .mou-section-header {
            font-size: 13px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            margin-top: 15px !important;
            margin-bottom: 8px !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }
          .info-table td {
            padding: 4px 8px !important;
          }
          .cabinet-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          .cabinet-table th {
            background-color: #f1f5f9 !important;
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
            font-weight: bold !important;
          }
          .cabinet-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
          }
        `;
        clonedPage.appendChild(style);

        const tempContainer = document.createElement("div");
        tempContainer.style.position = "absolute";
        tempContainer.style.left = "-9999px";
        tempContainer.style.top = "-9999px";
        tempContainer.style.width = "210mm";
        tempContainer.style.height = "297mm";
        tempContainer.style.overflow = "hidden";
        tempContainer.appendChild(clonedPage);
        document.body.appendChild(tempContainer);

        if (document.fonts) {
          await document.fonts.ready;
        }

        const canvas = await html2canvas(clonedPage, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL("image/jpeg", 0.98);

        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }

      pdf.save(`Bien_ban_ghi_nho_MOU_${(careCompanyName || careFullName || "default").trim().replace(/\\s+/g, "_")}.pdf`);
      toastSuccess("Thành công", "Xuất PDF thành công!");
    } catch (e) {
      console.error("Error exporting PDF MOU", e);
      toastError("Lỗi", "Không thể xuất file PDF. Vui lòng thử lại!");
    } finally {
      setPdfUploadingMOU(false);
    }
  };

  const handlePrintBienBan = () => {
    const docEl = document.getElementById("bienban-print-doc");
    if (!docEl) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iDoc = iframe.contentWindow?.document;
    if (!iDoc) return;

    iDoc.open();
    iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Biên bản thống nhất đại lý - ${bbB_Ten || ""}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap">
  <style>
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    @page { 
      size: A4 portrait; 
      margin: 0 !important; 
    }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Roboto Condensed', Arial Narrow, Arial, sans-serif; 
      background: #fff;
    }
    .print-page-break {
      width: 210mm !important;
      height: 297mm !important;
      page-break-after: always !important;
      break-after: page !important;
      background: #fff !important;
      padding: 10mm 15mm 10mm 25mm !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      position: relative !important;
    }
    .print-page-footer {
      position: absolute !important;
      bottom: 10mm !important;
      left: 25mm !important;
      right: 15mm !important;
      border-top: 1px solid #e2e8f0 !important;
      padding-top: 8px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
    }
  </style>
</head>
<body>
  ${docEl.innerHTML}
</body>
</html>`);
    iDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }, 600);
  };

  const handleExportPDF = async () => {
    const docEl = document.getElementById("bienban-print-doc");
    if (!docEl) return;

    setPdfUploading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const pages = docEl.getElementsByClassName("print-page-break");
      if (pages.length === 0) return;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;

        const clonedPage = pageEl.cloneNode(true) as HTMLElement;
        clonedPage.style.boxShadow = "none";
        clonedPage.style.margin = "0";
        clonedPage.style.position = "relative";
        clonedPage.style.width = "210mm";
        clonedPage.style.height = "297mm";
        clonedPage.style.boxSizing = "border-box";
        clonedPage.style.padding = "10mm 15mm 10mm 25mm";
        clonedPage.style.background = "#fff";
        clonedPage.style.display = "flex";
        clonedPage.style.flexDirection = "column";
        clonedPage.style.justifyContent = "space-between";

        const style = document.createElement("style");
        style.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap');
          
          * {
            font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif !important;
          }
          .print-page-footer {
            position: absolute !important;
            bottom: 10mm !important;
            left: 25mm !important;
            right: 15mm !important;
            border-top: 1px solid #e2e8f0 !important;
            padding-top: 8px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
        `;
        clonedPage.appendChild(style);

        const tempContainer = document.createElement("div");
        tempContainer.style.position = "absolute";
        tempContainer.style.left = "-9999px";
        tempContainer.style.top = "-9999px";
        tempContainer.style.width = "210mm";
        tempContainer.style.height = "297mm";
        tempContainer.style.overflow = "hidden";
        tempContainer.appendChild(clonedPage);
        document.body.appendChild(tempContainer);

        // Wait for fonts to load before canvas capture
        if (document.fonts) {
          await document.fonts.ready;
        }

        const canvas = await html2canvas(clonedPage, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL("image/jpeg", 0.98);

        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }

      pdf.save(`Bien_ban_thong_nhat_dai_ly_${(bbB_Ten || "default").replace(/\s+/g, "_")}.pdf`);
      toastSuccess("Xuất PDF thành công!");
    } catch (e) {
      console.error("Error exporting PDF", e);
      toastError("Lỗi khi xuất PDF!");
    } finally {
      setPdfUploading(false);
    }
  };

  const handleOpenKyHopDongModal = (partner: PartnerProcessItem) => {
    setKhdContractNo(partner.contractNo || `HDDL-2026-0${Math.floor(1000 + Math.random() * 9000)}`);
    setKhdContractValue(partner.contractValue || partner.quoteValue || 150000000);
    setKhdCreditLimit(partner.creditLimit || 50000000);
    setKhdSignDate(partner.signDate || new Date().toISOString().split("T")[0]);
    setKhdContractStatus(partner.contractStatus || "Pending Signature");
    setKhdContractPdf(partner.contractPdf || "");
    setShowKyHopDongModal(true);
  };

  const handleSaveKyHopDong = async () => {
    if (!selectedPartner) return;
    setSavingKyHopDong(true);
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          contractNo: khdContractNo,
          contractValue: khdContractValue,
          creditLimit: khdCreditLimit,
          signDate: khdSignDate,
          contractStatus: khdContractStatus,
          contractPdf: khdContractPdf,
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === selectedPartner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
        setShowKyHopDongModal(false);
        toastSuccess("Đã cập nhật thông tin ký hợp đồng thành công!");
      } else {
        toastError("Không thể lưu thông tin hợp đồng!");
      }
    } catch (e) {
      console.error("Error saving contract details", e);
      toastError("Lỗi hệ thống khi lưu thông tin hợp đồng!");
    } finally {
      setSavingKyHopDong(false);
    }
  };

  const handleKhdPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toastError("Vui lòng chọn file định dạng PDF");
      return;
    }

    setUploadingPdf(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setKhdContractPdf(data.url);
        toastSuccess("Tải lên file PDF thành công!");
      } else {
        const errData = await res.json();
        toastError(errData.error || "Lỗi khi tải lên file!");
      }
    } catch (err) {
      console.error("Error uploading pdf", err);
      toastError("Lỗi kết nối khi tải file!");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleOpenKyBienBanModal = (partner: PartnerProcessItem) => {
    setKbbQuoteCode(partner.bbQuoteCode || partner.quoteCode || "");
    setKbbCode(partner.bbCode || "");
    setKbbDate(partner.bbDate || new Date().toISOString().split("T")[0]);
    setKbbDiaDiem(partner.bbDiaDiem || "Văn phòng Công ty Seajong Faucet Việt Nam");
    setKbbPdf(partner.bbPdf || "");
    setShowKyBienBanModal(true);
  };

  const handleSaveKyBienBan = async () => {
    if (!selectedPartner) return;
    setSavingKyBienBan(true);
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          bbQuoteCode: kbbQuoteCode,
          bbCode: kbbCode,
          bbDate: kbbDate,
          bbDiaDiem: kbbDiaDiem,
          bbPdf: kbbPdf,
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === selectedPartner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
        setShowKyBienBanModal(false);
        toastSuccess("Đã cập nhật thông tin ký biên bản thành công!");
      } else {
        toastError("Không thể lưu thông tin biên bản!");
      }
    } catch (e) {
      console.error("Error saving memorandum details", e);
      toastError("Lỗi hệ thống khi lưu thông tin biên bản!");
    } finally {
      setSavingKyBienBan(false);
    }
  };

  const handleKbbPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toastError("Vui lòng chọn file định dạng PDF");
      return;
    }

    setUploadingPdfBB(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setKbbPdf(data.url);
        toastSuccess("Tải lên file PDF biên bản thành công!");
      } else {
        const errData = await res.json();
        toastError(errData.error || "Lỗi khi tải file!");
      }
    } catch (err) {
      console.error("Error uploading pdf bb", err);
      toastError("Lỗi kết nối khi tải file!");
    } finally {
      setUploadingPdfBB(false);
    }
  };

  const handleOpenKyPhuLucModal = (partner: PartnerProcessItem) => {
    setKplNo(partner.plNo || "");
    setKplDate(partner.plDate || new Date().toISOString().split("T")[0]);
    setKplAddress(partner.plAddress || "Văn phòng Công ty Seajong Faucet Việt Nam");
    setKplCptc(partner.plCptc || "16.100.000");
    setKplCptcText(partner.plCptcText || "Mười sáu triệu một trăm nghìn đồng");
    setKplRevenueCommit(partner.plRevenueCommit || "100.000.000");
    setKplRevenueCommitText(partner.plRevenueCommitText || "Một trăm triệu đồng");
    setKplPdf(partner.plPdf || "");
    setShowKyPhuLucModal(true);
  };

  const handleSaveKyPhuLuc = async () => {
    if (!selectedPartner) return;
    setSavingKyPhuLuc(true);
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          plNo: kplNo,
          plDate: kplDate,
          plAddress: kplAddress,
          plCptc: kplCptc,
          plCptcText: kplCptcText,
          plRevenueCommit: kplRevenueCommit,
          plRevenueCommitText: kplRevenueCommitText,
          plPdf: kplPdf,
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === selectedPartner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
        setShowKyPhuLucModal(false);
        toastSuccess("Đã cập nhật thông tin ký phụ lục thành công!");
      } else {
        toastError("Không thể lưu thông tin phụ lục!");
      }
    } catch (e) {
      console.error("Error saving appendix details", e);
      toastError("Lỗi hệ thống khi lưu thông tin phụ lục!");
    } finally {
      setSavingKyPhuLuc(false);
    }
  };

  const handleKplPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toastError("Vui lòng chọn file định dạng PDF");
      return;
    }

    setUploadingPdfPL(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setKplPdf(data.url);
        toastSuccess("Tải lên file PDF phụ lục thành công!");
      } else {
        const errData = await res.json();
        toastError(errData.error || "Lỗi khi tải file!");
      }
    } catch (err) {
      console.error("Error uploading pdf pl", err);
      toastError("Lỗi kết nối khi tải file!");
    } finally {
      setUploadingPdfPL(false);
    }
  };

  const handleOpenHopDong = () => {
    if (!selectedPartner) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setHdCode(selectedPartner.hdCode || `${selectedPartner.quoteCode || ""}/HDDL-SEAJONG`);
    setHdDate(selectedPartner.hdDate || todayStr);
    setHdDiaDiem(selectedPartner.hdDiaDiem || "Văn phòng Công ty Seajong Faucet Việt Nam");
    setHdANguoiKy(selectedPartner.hdANguoiKy || companyInfo?.legalRep || "Lê Công Vụ");
    setHdAChucVu(selectedPartner.hdAChucVu || "Giám đốc");

    setHdB_Ten(selectedPartner.hdB_Ten || selectedPartner.detailCompanyName || selectedPartner.name || "");
    setHdB_DiaChi(selectedPartner.hdB_DiaChi || selectedPartner.detailBusinessAddress || selectedPartner.area || "");
    setHdB_MST(selectedPartner.hdB_MST || "");
    setHdB_DaiDien(selectedPartner.hdB_DaiDien || getBRepresentativeName(selectedPartner));
    setHdB_ChucVu(selectedPartner.hdB_ChucVu || selectedPartner.detailRole || "Giám đốc");
    const phoneOnly = selectedPartner.contact ? (selectedPartner.contact.split(" - ")[1] || "") : "";
    setHdB_DienThoai(selectedPartner.hdB_DienThoai || selectedPartner.detailPhone || phoneOnly || "");
    setHdB_Email(selectedPartner.hdB_Email || selectedPartner.detailEmail || selectedPartner.contactEmail || "");

    setHdShowroomAddress(selectedPartner.hdShowroomAddress || selectedPartner.detailBusinessAddress || selectedPartner.area || "");
    setHdShowroomArea(selectedPartner.hdShowroomArea || String(selectedPartner.showroomArea || "0"));
    setHdAnnualRevenue(selectedPartner.hdAnnualRevenue || "1.200.000.000");
    setHdMonthlyRevenue(selectedPartner.hdMonthlyRevenue || "100.000.000");
    setHdDurationYears(selectedPartner.hdDurationYears || "02");
    setHdExclusiveRadius(selectedPartner.hdExclusiveRadius || "5");
    setHdExclusiveMonths(selectedPartner.hdExclusiveMonths || "06");

    setShowHopDongModal(true);
  };

  const handleSaveHopDong = async () => {
    if (!selectedPartner) return;
    setSavingHopDong(true);
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          hdCode,
          hdDate,
          hdDiaDiem,
          hdANguoiKy,
          hdAChucVu,
          hdB_Ten,
          hdB_DiaChi,
          hdB_MST,
          hdB_DaiDien,
          hdB_ChucVu,
          hdB_DienThoai,
          hdB_Email,
          hdShowroomAddress,
          hdShowroomArea,
          hdAnnualRevenue,
          hdMonthlyRevenue,
          hdDurationYears,
          hdExclusiveRadius,
          hdExclusiveMonths,
          contractNo: hdCode,
          contractValue: parseFloat(hdAnnualRevenue.replace(/\\./g, "").replace(/,/g, "")) || 0,
          signDate: hdDate,
          contractStatus: "Active"
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === selectedPartner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
        toastSuccess("Đã lưu hợp đồng đại lý thành công!");
      } else {
        toastError("Không thể lưu hợp đồng đại lý!");
      }
    } catch (e) {
      console.error("Error saving contract", e);
      toastError("Lỗi hệ thống khi lưu hợp đồng!");
    } finally {
      setSavingHopDong(false);
    }
  };

  const handlePrintHopDong = () => {
    const docEl = document.getElementById("hopdong-print-doc");
    if (!docEl) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iDoc = iframe.contentWindow?.document;
    if (!iDoc) return;

    iDoc.open();
    iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hợp đồng đại lý - ${hdB_Ten || ""}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap">
  <style>
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    @page { 
      size: A4 portrait; 
      margin: 0 !important; 
    }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Roboto Condensed', Arial Narrow, Arial, sans-serif; 
      background: #fff;
    }
    .print-page-break {
      width: 210mm !important;
      height: 297mm !important;
      page-break-after: always !important;
      break-after: page !important;
      background: #fff !important;
      padding: 10mm 15mm 10mm 25mm !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      position: relative !important;
    }
    .print-page-footer {
      position: absolute !important;
      bottom: 10mm !important;
      left: 25mm !important;
      right: 15mm !important;
      border-top: 1px solid #e2e8f0 !important;
      padding-top: 8px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
    }
  </style>
</head>
<body>
  ${docEl.innerHTML}
</body>
</html>`);
    iDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }, 600);
  };

  const handleExportPDFHD = async () => {
    const docEl = document.getElementById("hopdong-print-doc");
    if (!docEl) return;

    setPdfUploadingHD(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const pages = docEl.getElementsByClassName("print-page-break");
      if (pages.length === 0) return;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;

        const clonedPage = pageEl.cloneNode(true) as HTMLElement;
        clonedPage.style.boxShadow = "none";
        clonedPage.style.margin = "0";
        clonedPage.style.position = "relative";
        clonedPage.style.width = "210mm";
        clonedPage.style.height = "297mm";
        clonedPage.style.boxSizing = "border-box";
        clonedPage.style.padding = "10mm 15mm 10mm 25mm";
        clonedPage.style.background = "#fff";
        clonedPage.style.display = "flex";
        clonedPage.style.flexDirection = "column";
        clonedPage.style.justifyContent = "space-between";

        const style = document.createElement("style");
        style.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap');
          
          * {
            font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif !important;
          }
          .print-page-footer {
            position: absolute !important;
            bottom: 10mm !important;
            left: 25mm !important;
            right: 15mm !important;
            border-top: 1px solid #e2e8f0 !important;
            padding-top: 8px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
        `;
        clonedPage.appendChild(style);

        const tempContainer = document.createElement("div");
        tempContainer.style.position = "absolute";
        tempContainer.style.left = "-9999px";
        tempContainer.style.top = "-9999px";
        tempContainer.style.width = "210mm";
        tempContainer.style.height = "297mm";
        tempContainer.style.overflow = "hidden";
        tempContainer.appendChild(clonedPage);
        document.body.appendChild(tempContainer);

        // Wait for fonts to load before canvas capture
        if (document.fonts) {
          await document.fonts.ready;
        }

        const canvas = await html2canvas(clonedPage, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL("image/jpeg", 0.98);

        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }

      pdf.save(`Hop_dong_dai_ly_${(hdB_Ten || "default").replace(/\s+/g, "_")}.pdf`);
      toastSuccess("Xuất PDF thành công!");
    } catch (e) {
      console.error("Error exporting PDF HD", e);
      toastError("Lỗi khi xuất PDF!");
    } finally {
      setPdfUploadingHD(false);
    }
  };

  const handleOpenPhuLuc = () => {
    if (!selectedPartner) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    setPlNo(selectedPartner.plNo || "01");
    setPlDate(selectedPartner.plDate || `${yyyy}-${mm}-${dd}`);
    setPlAddress(selectedPartner.plAddress || "Văn phòng Công ty Seajong Faucet Việt Nam");
    setPlCptc(selectedPartner.plCptc || "16.100.000");
    setPlCptcText(selectedPartner.plCptcText || "Mười sáu triệu một trăm nghìn đồng");
    setPlRevenueMkt(selectedPartner.plRevenueMkt || "400.000.000");
    setPlRevenueMktText(selectedPartner.plRevenueMktText || "Bốn trăm triệu đồng");
    setPlRevenueCommit(selectedPartner.plRevenueCommit || "100.000.000");
    setPlRevenueCommitText(selectedPartner.plRevenueCommitText || "Một trăm triệu đồng");
    setPlDurationDays(selectedPartner.plDurationDays || "15");

    // Timelines
    setPlTimeline1(selectedPartner.plTimeline1 || "");
    setPlTimeline2(selectedPartner.plTimeline2 || "");
    setPlTimeline3(selectedPartner.plTimeline3 || "");
    setPlTimeline4(selectedPartner.plTimeline4 || "");
    setPlTimeline5(selectedPartner.plTimeline5 || "");
    setPlMaxDelayDays(selectedPartner.plMaxDelayDays || "19");

    // Phase payments
    setPlPhase1Date(selectedPartner.plPhase1Date || "");
    setPlPhase1Rate(selectedPartner.plPhase1Rate || "50%");
    setPlPhase1Amount(selectedPartner.plPhase1Amount || "8.050.000");
    setPlPhase1AmountText(selectedPartner.plPhase1AmountText || "Tám triệu không trăm năm mươi nghìn đồng");

    setPlPhase2Date(selectedPartner.plPhase2Date || "");
    setPlPhase2Rate(selectedPartner.plPhase2Rate || "30%");
    setPlPhase2Amount(selectedPartner.plPhase2Amount || "4.830.000");
    setPlPhase2AmountText(selectedPartner.plPhase2AmountText || "Bốn triệu tám trăm ba mươi nghìn đồng");

    setPlPhase3Date(selectedPartner.plPhase3Date || "");
    setPlPhase3Rate(selectedPartner.plPhase3Rate || "20%");
    setPlPhase3Amount(selectedPartner.plPhase3Amount || "3.220.000");
    setPlPhase3AmountText(selectedPartner.plPhase3AmountText || "Ba triệu hai trăm hai mươi nghìn đồng");

    setPlPenaltyMaxDelay(selectedPartner.plPenaltyMaxDelay || "4");

    setHdANguoiKy(selectedPartner.hdANguoiKy || companyInfo?.legalRep || "Lê Công Vụ");
    setHdAChucVu(selectedPartner.hdAChucVu || "Giám đốc");
    setHdB_Ten(selectedPartner.hdB_Ten || selectedPartner.detailCompanyName || selectedPartner.name || "");
    setHdB_DiaChi(selectedPartner.hdB_DiaChi || selectedPartner.detailBusinessAddress || selectedPartner.area || "");
    setHdB_MST(selectedPartner.hdB_MST || "");
    setHdB_DaiDien(selectedPartner.hdB_DaiDien || getBRepresentativeName(selectedPartner));
    setHdB_ChucVu(selectedPartner.hdB_ChucVu || selectedPartner.detailRole || "Giám đốc");
    const phoneOnly = selectedPartner.contact ? (selectedPartner.contact.split(" - ")[1] || "") : "";
    setHdB_DienThoai(selectedPartner.hdB_DienThoai || selectedPartner.detailPhone || phoneOnly || "");
    setHdB_Email(selectedPartner.hdB_Email || selectedPartner.detailEmail || selectedPartner.contactEmail || "");

    setShowPhuLucModal(true);
  };

  const handleSavePhuLuc = async () => {
    if (!selectedPartner) return;
    setSavingPhuLuc(true);
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          action: "SAVE_PHU_LUC",
          plNo,
          plDate,
          plAddress,
          plCptc,
          plCptcText,
          plRevenueMkt,
          plRevenueMktText,
          plRevenueCommit,
          plRevenueCommitText,
          plDurationDays,
          plTimeline1,
          plTimeline2,
          plTimeline3,
          plTimeline4,
          plTimeline5,
          plMaxDelayDays,
          plPhase1Date,
          plPhase1Rate,
          plPhase1Amount,
          plPhase1AmountText,
          plPhase2Date,
          plPhase2Rate,
          plPhase2Amount,
          plPhase2AmountText,
          plPhase3Date,
          plPhase3Rate,
          plPhase3Amount,
          plPhase3AmountText,
          plPenaltyMaxDelay,
          hdANguoiKy,
          hdAChucVu,
          hdB_Ten,
          hdB_DiaChi,
          hdB_MST,
          hdB_DaiDien,
          hdB_ChucVu,
          hdB_DienThoai,
          hdB_Email
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === selectedPartner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
        setShowPhuLucModal(false);
        toastSuccess("Đã lưu phụ lục hợp đồng thành công!");
      } else {
        toastError("Không thể lưu phụ lục hợp đồng!");
      }
    } catch (e) {
      console.error("Error saving appendix", e);
      toastError("Lỗi hệ thống khi lưu phụ lục hợp đồng!");
    } finally {
      setSavingPhuLuc(false);
    }
  };

  const handlePrintPhuLuc = () => {
    const docEl = document.getElementById("phuluc-print-doc");
    if (!docEl) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iDoc = iframe.contentWindow?.document;
    if (!iDoc) return;

    iDoc.open();
    iDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phụ lục hợp đồng - ${hdB_Ten || ""}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap">
  <style>
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
    }
    body {
      font-family: 'Roboto Condensed', sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.45;
      background: #f1f5f9;
    }
    #phuluc-print-doc {
      display: block !important;
      gap: 0 !important;
    }
    .print-page-break {
      position: relative !important;
      width: 210mm;
      height: 296mm;
      background: #fff !important;
      margin: 0 auto;
      box-sizing: border-box !important;
      padding: 10mm 15mm 10mm 25mm !important;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .print-page-break:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .print-page-footer {
      position: absolute !important;
      bottom: 10mm !important;
      left: 25mm !important;
      right: 15mm !important;
      border-top: 1px solid #cbd5e1 !important;
      padding-top: 6px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-size: 9px !important;
      color: #000 !important;
    }
  </style>
</head>
<body>
  ${docEl.innerHTML}
</body>
</html>`);
    iDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }, 600);
  };

  const handleExportPDFPL = async () => {
    const docEl = document.getElementById("phuluc-print-doc");
    if (!docEl) return;

    setPdfUploadingPL(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const pages = docEl.getElementsByClassName("print-page-break");
      if (pages.length === 0) return;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;

        const clonedPage = pageEl.cloneNode(true) as HTMLElement;
        clonedPage.style.boxShadow = "none";
        clonedPage.style.margin = "0 auto";
        clonedPage.style.position = "relative";
        clonedPage.style.width = "210mm";
        clonedPage.style.height = "297mm";
        clonedPage.style.boxSizing = "border-box";
        clonedPage.style.padding = "10mm 15mm 10mm 25mm";
        clonedPage.style.background = "#fff";

        const style = document.createElement("style");
        style.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;800;900&display=swap');
          
          * {
            font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif !important;
          }
          .print-page-footer {
            position: absolute !important;
            bottom: 10mm !important;
            left: 25mm !important;
            right: 15mm !important;
            border-top: 1px solid #cbd5e1 !important;
            padding-top: 6px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 9px !important;
            color: #000 !important;
          }
        `;
        clonedPage.appendChild(style);

        const tempContainer = document.createElement("div");
        tempContainer.style.position = "absolute";
        tempContainer.style.left = "-9999px";
        tempContainer.style.top = "-9999px";
        tempContainer.style.width = "210mm";
        tempContainer.style.height = "297mm";
        tempContainer.style.overflow = "hidden";
        tempContainer.appendChild(clonedPage);
        document.body.appendChild(tempContainer);

        // Wait for fonts to load before canvas capture
        if (document.fonts) {
          await document.fonts.ready;
        }

        const canvas = await html2canvas(clonedPage, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL("image/jpeg", 0.98);

        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }

      pdf.save(`Phu_luc_hop_dong_${(hdB_Ten || "default").replace(/\s+/g, "_")}.pdf`);
      toastSuccess("Xuất PDF thành công!");
    } catch (e) {
      console.error("Error exporting PDF PL", e);
      toastError("Lỗi khi xuất PDF!");
    } finally {
      setPdfUploadingPL(false);
    }
  };

  const formatCurrencyHD = (val: string) => {
    if (!val) return "........................ VNĐ";
    if (val.includes("VNĐ") || val.includes("vnd")) return val;
    return val + " VNĐ";
  };

  const handleCurrencyChange = (val: string, setter: (v: string) => void) => {
    const clean = val.replace(/\./g, "").replace(/,/g, "");
    if (!clean || isNaN(clean as any)) {
      setter("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(parseInt(clean));
    setter(formatted);
  };

  const renderPage1 = () => {
    const today = bbDate && !isNaN(Date.parse(bbDate)) ? new Date(bbDate) : null;
    const dYear = today ? today.getFullYear() : "......";
    const dMonth = today ? String(today.getMonth() + 1).padStart(2, "0") : "......";
    const dDay = today ? String(today.getDate()).padStart(2, "0") : "......";

    return (
      <div className="print-page-break" style={{
        width: "794px", height: "1123px", background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", padding: "8mm 15mm 8mm 25mm",
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        justifyContent: "space-between", position: "relative"
      }}>
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #003087", paddingBottom: 4 }}>
            {companyInfo?.logoUrl ? (
              <img src={companyInfo.logoUrl} style={{ height: "36px", objectFit: "contain" }} alt="Logo" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <div style={{
                    position: "absolute",
                    left: -4, right: -4, top: -2, bottom: -2,
                    border: "1.5px solid #003087",
                    borderRadius: "50% / 40% 45% 35% 50%",
                    transform: "skewX(-10deg) rotate(-3deg)",
                    pointerEvents: "none"
                  }} />
                  <span style={{ fontFamily: "sans-serif", fontWeight: 950, fontSize: 20, color: "#003087", letterSpacing: -0.5, zIndex: 2 }}>
                    Seajong<span style={{ color: "#003087", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>®</span>
                  </span>
                </div>
                <div style={{ fontSize: 6, color: "#000", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Better than best</div>
              </div>
            )}
            <div style={{ textAlign: "right", fontSize: "9px", lineHeight: 1.3, color: "#000" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "9.5px", textTransform: "uppercase" }}>
                {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
              </div>
              <div>Địa chỉ: {companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</div>
              <div>Hotline: {(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()} | Website: {companyInfo?.website || "https://seajong.com/"}</div>
            </div>
          </div>

          {/* Title Section */}
          <div style={{ textAlign: "center", margin: "12px 0 6px 0" }}>
            <h2 style={{ margin: 0, color: "#003087", fontWeight: 900, fontSize: "16px", letterSpacing: "1px" }}>BIÊN BẢN THỐNG NHẤT</h2>
            <h3 style={{ margin: "2px 0 0", color: "#003087", fontWeight: 700, fontSize: "11.5px" }}>ĐẠI LÝ CHÍNH THỨC SEAJONG</h3>
            <div style={{ fontSize: "10px", color: "#003087", fontWeight: 600, marginTop: 8 }}>
              Số: {bbCode || "................"}/BBTN-SEAJONG
            </div>
            <div style={{ fontSize: "10px", color: "#000", marginTop: 2, fontStyle: "italic" }}>
              (Kèm theo Báo giá số: {bbQuoteCode || "......................................."})
            </div>
          </div>

          {/* Date & Location */}
          <div style={{ fontSize: "11px", margin: "15px 0 6px 0", lineHeight: 1.4, color: "#000" }}>
            Hôm nay, ngày {dDay} tháng {dMonth} năm {dYear}, tại {bbDiaDiem || "Văn phòng Công ty Seajong Faucet Việt Nam"}, chúng tôi gồm:
          </div>

          {/* Side A & B */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
            {/* Side A */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "5px 10px", background: "#f8fafc" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "11.5px", textTransform: "uppercase", marginBottom: 2 }}>
                BÊN A (BÊN GIAO ĐẠI LÝ): {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 12px", fontSize: "11px", lineHeight: 1.35 }}>
                <div style={{ gridColumn: "span 2", display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Địa chỉ:</span>
                  <span>{companyInfo?.address || "LK7-D4, KĐT mới CĐT Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</span>
                </div>
                <div style={{ gridColumn: "span 2", display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Mã số thuế:</span>
                  <span>{companyInfo?.taxCode || "0109865432"}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Đại diện:</span>
                  <span>{bbANguoiKy.startsWith("Ông") || bbANguoiKy.startsWith("Bà") ? bbANguoiKy : `Ông ${bbANguoiKy}`}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "70px", flexShrink: 0 }}>Chức vụ:</span>
                  <span>{bbAChucVu}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Điện thoại:</span>
                  <span>{bbA_DienThoai || "1900.633.862"}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "70px", flexShrink: 0 }}>Email:</span>
                  <span>{companyInfo?.email || "info@seajong.com"}</span>
                </div>
              </div>
            </div>

            {/* Side B */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "5px 10px", background: "#f8fafc" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "11.5px", textTransform: "uppercase", marginBottom: 2 }}>
                BÊN B (BÊN NHẬN ĐẠI LÝ): {bbB_Ten?.toUpperCase() || "........................................................................"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 12px", fontSize: "11px", lineHeight: 1.35 }}>
                <div style={{ gridColumn: "span 2", display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Địa chỉ:</span>
                  <span>{bbB_DiaChi || "........................................................................"}</span>
                </div>
                <div style={{ gridColumn: "span 2", display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Mã số thuế:</span>
                  <span>{bbB_MST || "...................................."}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Đại diện:</span>
                  <span>{bbB_DaiDien || "................................................"}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "70px", flexShrink: 0 }}>Chức vụ:</span>
                  <span>{bbB_ChucVu || "................................................"}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Điện thoại:</span>
                  <span>{bbB_DienThoai || "...................................."}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "70px", flexShrink: 0 }}>Email:</span>
                  <span>{bbB_Email || "................................................"}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "11px", lineHeight: 1.35, color: "#000", marginBottom: 8, textAlign: "justify" }}>
            Sau khi tiến hành trao đổi, đàm phán trên tinh thần tự nguyện, bình đẳng và cùng có lợi, hai Bên thống nhất lập biên bản ghi nhận các nội dung thỏa thuận cốt lõi sau đây làm căn cứ để ký kết Hợp đồng đại lý chính thức với thông tin chi tiết như sau:
          </div>

          {/* Clause 1 */}
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: "#003087", fontSize: "12px" }}>ĐIỀU 1: HỖ TRỢ TOÀN DIỆN TỪ BÊN A</strong>
            <div style={{ backgroundColor: "#dbeafe", padding: "4px 8px", borderRadius: "3px", fontSize: "11.5px", fontWeight: "bold", color: "#000", marginBottom: 6 }}>
              1. Hỗ trợ thiết kế và trưng bày:
            </div>
            <div style={{ marginTop: 2, paddingLeft: 8 }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#003087", margin: "2px 0 1px 0" }}>
                a. Bên A cung cấp miễn phí thi công quầy kệ trưng bày theo tiêu chuẩn Seajong và gói quảng cáo điểm bán tiêu chuẩn theo nhãn diện thương hiệu:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11px", paddingLeft: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.quayKeCoBan ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Quầy kệ trưng bày sản phẩm cơ bản</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Vách gỗ, khung kệ, đảo bếp, phòng tắm trải nghiệm... dựa theo thỏa thuận thi công giữa hai bên trước khi ký hợp đồng.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.catalogue ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Catalogue sản phẩm</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Giới thiệu đầy đủ các dòng sen vòi bồn cầu, chậu, đèn điều hoà, phụ kiện phòng tắm...</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.brochure ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Brochure/tờ rơi</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Thông tin sản phẩm mới, chương trình khuyến mãi.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.tagTreo ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Tag treo sản phẩm</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Gắn trực tiếp lên sen vòi, bồn cầu, chậu (ghi rõ model, tính năng, giá...).</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.standee ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Standee/Banner khổ nhỏ</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Quảng bá thương hiệu và sản phẩm chủ lực.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.bangGia ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Bảng giá sản phẩm</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Định dạng chuẩn Seajong.</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "11px", fontWeight: 600, color: "#003087", margin: "4px 0 1px 0" }}>
                b. Bên A cung cấp gói Quảng cáo điểm bán mở rộng chuẩn nhận diện thương hiệu Seajong theo thoả thuận:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11px", paddingLeft: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.manHinhLed ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Màn hình LED/LCD quảng bá thương hiệu</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Chiếu TVC, video hướng dẫn, case study công trình.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.bienBangSeajong ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Biển bảng thương hiệu Seajong</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Biển alu, hộp đèn hoặc pano ngoài trời theo chuẩn nhận diện.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.posterKhoLon ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Poster khổ lớn</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Treo trong showroom/cửa hàng để tăng độ nhận diện.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.backdropPhotoBooth ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Backdrop/photo booth thương hiệu</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Dùng trong sự kiện khai trương, hội thảo khách hàng.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.vatPhamQuaTang ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Vật phẩm quà tặng thương hiệu (merchandise)</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Túi vải, hộp quà, bút, sổ, ô che mưa.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.posmQrCode ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>POSM điện tử kết nối QR code</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Scan QR xem catalogue, chính sách bảo hành, video sản phẩm.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.dongPhucNhanVien ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Đồng phục nhân viên bán hàng</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Áo polo/thun + bảng tên chuẩn thương hiệu.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {bbSupports.chiPhiNoiThat ? (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "11px", height: "11px", border: "1.2px solid #003087", backgroundColor: "#003087", borderRadius: "2px", color: "#fff", fontSize: "7px", fontWeight: "bold", marginTop: 2, flexShrink: 0 }}>✓</span>
                  ) : (
                    <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1.2px solid #cbd5e1", borderRadius: "2px", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>Hỗ trợ một phần chi phí nội thất nếu phải sửa chữa về mặt bằng thô</span>
                    <span style={{ fontSize: "9px", color: "#000" }}>Chi tiết nội dung này sẽ được bên A khảo sát, bàn bạc với bên B và được lập thành văn bản coi như phụ lục của hợp đồng.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="print-page-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          <span style={{ fontSize: "8px", color: "#000" }}>Biên bản thống nhất đại lý phân phối thiết bị vệ sinh cao cấp Seajong®</span>
          <span style={{ fontSize: "8.5px", color: "#000", fontWeight: 700 }}>Trang 1 / 3</span>
        </div>
      </div>
    );
  };

  const renderPage2 = () => {
    return (
      <div className="print-page-break" style={{
        width: "794px", height: "1123px", background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", padding: "10mm 15mm 10mm 25mm",
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        justifyContent: "space-between", position: "relative"
      }}>
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #003087", paddingBottom: 10, marginBottom: 15 }}>
            {companyInfo?.logoUrl ? (
              <img src={companyInfo.logoUrl} style={{ height: "45px", objectFit: "contain" }} alt="Logo" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <div style={{
                    position: "absolute",
                    left: -4, right: -4, top: -2, bottom: -2,
                    border: "1.5px solid #003087",
                    borderRadius: "50% / 40% 45% 35% 50%",
                    transform: "skewX(-10deg) rotate(-3deg)",
                    pointerEvents: "none"
                  }} />
                  <span style={{ fontFamily: "sans-serif", fontWeight: 950, fontSize: 24, color: "#003087", letterSpacing: -0.5, zIndex: 2 }}>
                    Seajong<span style={{ color: "#003087", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>®</span>
                  </span>
                </div>
                <div style={{ fontSize: 6.5, color: "#000", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Better than best</div>
              </div>
            )}
            <div style={{ textAlign: "right", fontSize: "9px", lineHeight: 1.35, color: "#000" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "10px", textTransform: "uppercase" }}>
                {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
              </div>
              <div>Địa chỉ: {companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</div>
              <div>Hotline: {(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()} | Website: {companyInfo?.website || "https://seajong.com/"}</div>
            </div>
          </div>

          {/* Clause 1 Support continued */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ backgroundColor: "#dbeafe", padding: "4px 8px", borderRadius: "3px", fontSize: "11.5px", fontWeight: "bold", color: "#000", marginBottom: 6 }}>
              2. Hỗ trợ vận hành:
            </div>
            <ul style={{ margin: "0", paddingLeft: 16, fontSize: "11px", lineHeight: 1.4, listStyleType: "disc", color: "#000" }}>
              <li style={{ marginBottom: 3 }}>Hỗ trợ tuyển dụng và đào tạo nhân viên vận hành showroom theo tiêu chuẩn.</li>
              <li style={{ marginBottom: 3 }}>Cung cấp tài liệu hướng dẫn vận hành, quản lý bán hàng, chăm sóc khách hàng.</li>
              <li style={{ marginBottom: 3 }}>Hỗ trợ cài đặt và sử dụng phần mềm quản lý bán hàng.</li>
              <li style={{ marginBottom: 3 }}>Đội ngũ hỗ trợ khai trương và đồng hành hai tháng đầu tiên.</li>
            </ul>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ backgroundColor: "#dbeafe", padding: "4px 8px", borderRadius: "3px", fontSize: "11.5px", fontWeight: "bold", color: "#000", marginBottom: 6 }}>
              3. Hỗ trợ đào tạo và nhân sự:
            </div>
            <ul style={{ margin: "0", paddingLeft: 16, fontSize: "11px", lineHeight: 1.4, listStyleType: "disc", color: "#000" }}>
              <li style={{ marginBottom: 3 }}>Đào tạo định kỳ về sản phẩm, bán hàng, upsell, quản lý cửa hàng, chăm sóc khách hàng.</li>
              <li style={{ marginBottom: 3 }}>Hỗ trợ tuyển dụng và đào tạo ban đầu cho đội ngũ nhân viên vận hành thuần thục theo bộ quy trình vận hành tiêu chuẩn Seajong.</li>
              <li style={{ marginBottom: 3 }}>Hỗ trợ chi trả một phần thu nhập cơ bản và chi phí từng vụ việc cho nhân viên bảo hành, bảo trì lắp đặt tại đại lý theo quy định của Seajong.</li>
            </ul>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ backgroundColor: "#dbeafe", padding: "4px 8px", borderRadius: "3px", fontSize: "11.5px", fontWeight: "bold", color: "#000", marginBottom: 6 }}>
              4. Hỗ trợ Marketing và Truyền thông:
            </div>
            <ul style={{ margin: "0", paddingLeft: 16, fontSize: "11px", lineHeight: 1.4, listStyleType: "disc", color: "#000" }}>
              <li style={{ marginBottom: 3 }}>Bên A thiết lập các kênh Fanpage, Tiktok miễn phí cho Bên B và hỗ trợ đào tạo quản trị.</li>
              <li style={{ marginBottom: 3 }}>Bên A tư vấn xây dựng kế hoạch truyền thông, đăng tải 5 nội dung/tháng về Bên B trên các kênh Social và Website của Seajong.</li>
              <li style={{ marginBottom: 3 }}>Bên A cung cấp cho bên B hình ảnh sản phẩm, thiết kế ấn phẩm truyền thông, Catalogue, niêm yết thông tin trên website.</li>
              <li style={{ marginBottom: 3 }}>Được hỗ trợ lên kế hoạch các chương trình khuyến mãi, thiết kế banner POSM và in ấn theo chương trình.</li>
            </ul>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ backgroundColor: "#dbeafe", padding: "4px 8px", borderRadius: "3px", fontSize: "11.5px", fontWeight: "bold", color: "#000", marginBottom: 6 }}>
              5. Hỗ trợ sản phẩm và hàng hóa:
            </div>
            <ul style={{ margin: "0", paddingLeft: 16, fontSize: "11px", lineHeight: 1.4, listStyleType: "disc", color: "#000" }}>
              <li style={{ marginBottom: 3 }}>Được ưu tiên nhập hàng trước, có thể đặt mẫu riêng độc quyền.</li>
              <li style={{ marginBottom: 3 }}>Được độc quyền phân phối trong bán kính 3km với nội thành và 5 km với ngoại thành.</li>
              <li style={{ marginBottom: 3 }}>Chính sách đổi trả/thu hồi hàng trưng bày trong 02 năm đầu nếu đại lý ngừng hoạt động do bất khả kháng.</li>
            </ul>
          </div>

          {/* Clause 2 */}
          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: "#003087", fontSize: "12px" }}>ĐIỀU 2: CHÍNH SÁCH BÁN HÀNG VÀ CHIẾT KHẤU</strong>
            <ol style={{ margin: "4px 0 0 0", paddingLeft: 16, fontSize: "11px", lineHeight: 1.4, color: "#000", textAlign: "justify" }}>
              <li style={{ marginBottom: 4 }}>
                Bên A cam kết cung cấp cho bên B hàng hóa mới 100% đạt tiêu chuẩn của Seajong. Có đầy đủ hoá đơn chứng từ chứng minh nguồn gốc xuất xứ sản phẩm.
              </li>
              <li style={{ marginBottom: 4 }}>
                <strong>Giá đại lý:</strong> Bên A chiết khấu cho bên B <strong>50%</strong> trên bảng giá bán lẻ được ban hành tuỳ từng thời điểm.
              </li>
              <li style={{ marginBottom: 4 }}>
                Bên B được phép chiết khấu tối đa 25% cho khách hàng cuối cùng. Trong trường hợp dịp lễ đặc biệt (Tết Nguyên đán, 30/4 – 1/5, Quốc Khánh 2/9, Giáng sinh, Tết Dương lịch) chiết khấu có thể điều chỉnh giá tới 50% để thúc đẩy doanh số.
              </li>
              <li style={{ marginBottom: 4 }}>
                Với các đơn hàng lớn, hàng đặc biệt bên B phải đặt cọc 30% khi đặt hàng.
              </li>
              <li style={{ marginBottom: 4 }}>
                Thời hạn tín dụng tối đa là <strong>30 (ba mươi) ngày</strong> kể từ ngày nhận hàng. Quá thời hạn này mà Bên B chưa thanh toán, sẽ không được hưởng thưởng thanh toán và được coi là vi phạm nghĩa vụ thanh toán. Trong trường hợp đó, Bên A có quyền áp dụng các biện pháp hạn chế cung cấp hàng hóa cho Bên B.
              </li>
            </ol>
          </div>

          {/* Clause 3 */}
          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: "#003087", fontSize: "12px", textTransform: "uppercase" }}>ĐIỀU 3: CÁC ĐIỀU KHOẢN THƯỞNG ĐẠI LÝ</strong>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {bbBonuses.map((bonus, idx) => {
                const cleanTitle = bonus.title || "";
                const displayTitle = /^\d+\./.test(cleanTitle) ? cleanTitle : `${idx + 1}. ${cleanTitle}`;
                const descParagraphs = (bonus.desc || "").split("\n").filter(Boolean);

                return (
                  <div key={bonus.id || idx} style={{ marginBottom: 4 }}>
                    <div style={{ backgroundColor: "#dbeafe", padding: "4px 8px", borderRadius: "3px", fontSize: "11.5px", fontWeight: "bold", color: "#000", marginBottom: 4 }}>
                      {displayTitle}
                    </div>
                    <ul style={{ margin: "0", paddingLeft: 16, fontSize: "11px", lineHeight: 1.4, color: "#000" }}>
                      {descParagraphs.length > 0 ? (
                        descParagraphs.map((para: string, pIdx: number) => (
                          <li key={pIdx} style={{ marginBottom: 2 }}>{para}</li>
                        ))
                      ) : (
                        <li style={{ marginBottom: 2 }}>{bonus.desc}</li>
                      )}
                      {bonus.formula && (
                        <li style={{ display: "inline-block", marginTop: 2 }}>
                          Công thức tính:{' '}
                          <span style={{ display: "inline-block", border: "1px solid #cbd5e1", padding: "1px 4px", borderRadius: "3px", background: "#f8fafc", fontWeight: "bold", fontSize: "10px", color: "#003087" }}>
                            {bonus.formula}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="print-page-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          <span style={{ fontSize: "8px", color: "#000" }}>Biên bản thống nhất đại lý phân phối thiết bị vệ sinh cao cấp Seajong®</span>
          <span style={{ fontSize: "8.5px", color: "#000", fontWeight: 700 }}>Trang 2 / 3</span>
        </div>
      </div>
    );
  };

  const renderPage3 = () => {
    return (
      <div className="print-page-break" style={{
        width: "794px", height: "1123px", background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", padding: "10mm 15mm 10mm 25mm",
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        justifyContent: "space-between", position: "relative"
      }}>
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #003087", paddingBottom: 10, marginBottom: 15 }}>
            {companyInfo?.logoUrl ? (
              <img src={companyInfo.logoUrl} style={{ height: "45px", objectFit: "contain" }} alt="Logo" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <div style={{
                    position: "absolute",
                    left: -4, right: -4, top: -2, bottom: -2,
                    border: "1.5px solid #003087",
                    borderRadius: "50% / 40% 45% 35% 50%",
                    transform: "skewX(-10deg) rotate(-3deg)",
                    pointerEvents: "none"
                  }} />
                  <span style={{ fontFamily: "sans-serif", fontWeight: 950, fontSize: 24, color: "#003087", letterSpacing: -0.5, zIndex: 2 }}>
                    Seajong<span style={{ color: "#003087", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>®</span>
                  </span>
                </div>
                <div style={{ fontSize: 6.5, color: "#000", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Better than best</div>
              </div>
            )}
            <div style={{ textAlign: "right", fontSize: "9px", lineHeight: 1.35, color: "#000" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "10px", textTransform: "uppercase" }}>
                {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
              </div>
              <div>Địa chỉ: {companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</div>
              <div>Hotline: {(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()} | Website: {companyInfo?.website || "https://seajong.com/"}</div>
            </div>
          </div>

          {/* Clause 4 */}
          <div style={{ marginBottom: 20 }}>
            <strong style={{ color: "#003087", fontSize: "12px", textTransform: "uppercase" }}>ĐIỀU 4: CÁC QUY ĐỊNH CHUNG</strong>
            <ol style={{ margin: "6px 0 0 0", paddingLeft: 16, fontSize: "12px", lineHeight: 1.45, color: "#000" }}>
              <li style={{ marginBottom: 3 }}>
                Các chính sách hỗ trợ và thưởng nêu trên là một phần không tách rời của Hợp đồng Đại lý phân phối số {hdCode || "........................"}
              </li>
              <li style={{ marginBottom: 3 }}>
                Seajong có quyền điều chỉnh chi tiết chính sách để phù hợp với tình hình kinh doanh, nhưng phải thông báo cho Bên B bằng văn bản ít nhất 30 ngày trước khi áp dụng.
              </li>
              <li style={{ marginBottom: 3 }}>
                Các phụ lục này được lập thành 02 bản, mỗi bên giữ 01 bản, có giá trị pháp lý như nhau.
              </li>
            </ol>
          </div>

          {/* Signatures */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center", marginTop: 40 }}>
            <div>
              <strong style={{ fontSize: "12px", textTransform: "uppercase", color: "#000" }}>ĐẠI DIỆN BÊN A</strong>
              <div style={{ height: 120 }} />
            </div>
            <div>
              <strong style={{ fontSize: "12px", textTransform: "uppercase", color: "#000" }}>ĐẠI DIỆN BÊN B</strong>
              <div style={{ height: 120 }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="print-page-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          <span style={{ fontSize: "8px", color: "#000" }}>Biên bản thống nhất đại lý phân phối thiết bị vệ sinh cao cấp Seajong®</span>
          <span style={{ fontSize: "8.5px", color: "#000", fontWeight: 700 }}>Trang 3 / 3</span>
        </div>
      </div>
    );
  };
  const renderPage1HD = () => {
    const today = hdDate && !isNaN(Date.parse(hdDate)) ? new Date(hdDate) : null;
    const dYear = today ? today.getFullYear() : "......";
    const dMonth = today ? String(today.getMonth() + 1).padStart(2, "0") : "......";
    const dDay = today ? String(today.getDate()).padStart(2, "0") : "......";

    const bbToday = selectedPartner?.bbDate && !isNaN(Date.parse(selectedPartner.bbDate)) ? new Date(selectedPartner.bbDate) : null;
    const bbDYear = bbToday ? bbToday.getFullYear() : "......";
    const bbDMonth = bbToday ? String(bbToday.getMonth() + 1).padStart(2, "0") : "......";
    const bbDDay = bbToday ? String(bbToday.getDate()).padStart(2, "0") : "......";
    const bbDateFormatted = bbToday ? `${bbDDay}/${bbDMonth}/${bbDYear}` : "....../....../..........";

    return (
      <div className="print-page-break" style={{
        width: "794px", height: "1123px", background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", padding: "10mm 15mm 10mm 25mm",
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        justifyContent: "space-between", position: "relative"
      }}>
        <div style={{ flex: 1, overflow: "hidden", paddingBottom: 8 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #003087", paddingBottom: 4 }}>
            {companyInfo?.logoUrl ? (
              <img src={companyInfo.logoUrl} style={{ height: "36px", objectFit: "contain" }} alt="Logo" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <div style={{
                    position: "absolute",
                    left: -4, right: -4, top: -2, bottom: -2,
                    border: "1.5px solid #003087",
                    borderRadius: "50% / 40% 45% 35% 50%",
                    transform: "skewX(-10deg) rotate(-3deg)",
                    pointerEvents: "none"
                  }} />
                  <span style={{ fontFamily: "sans-serif", fontWeight: 950, fontSize: 20, color: "#003087", letterSpacing: -0.5, zIndex: 2 }}>
                    Seajong<span style={{ color: "#003087", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>®</span>
                  </span>
                </div>
                <div style={{ fontSize: 6, color: "#000", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Better than best</div>
              </div>
            )}
            <div style={{ textAlign: "right", fontSize: "9px", lineHeight: 1.3, color: "#000" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "9.5px", textTransform: "uppercase" }}>
                {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
              </div>
              <div>Địa chỉ: {companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</div>
              <div>Hotline: {(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()} | Website: {companyInfo?.website || "https://seajong.com/"}</div>
            </div>
          </div>

          {/* Title Section */}
          <div style={{ textAlign: "center", margin: "12px 0 6px 0" }}>
            <h2 style={{ margin: 0, color: "#003087", fontWeight: 900, fontSize: "17px", letterSpacing: "1px" }}>HỢP ĐỒNG ĐẠI LÝ PHÂN PHỐI</h2>
            <h3 style={{ margin: "2px 0 0", color: "#003087", fontWeight: 700, fontSize: "12px" }}>ĐẠI LÝ CHÍNH THỨC SEAJONG</h3>
            <div style={{ fontSize: "11px", color: "#000", marginTop: 4, fontWeight: "bold" }}>
              Số: {hdCode || "......................................."}
            </div>
          </div>

          {/* Legal Basis for signing Contract */}
          <div style={{ margin: "20px 0 4px 0", fontSize: "11px", lineHeight: "1.35", color: "#000" }}>
            <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "4px", fontSize: "12.5px", color: "#003087" }}>
              CÁC CĂN CỨ ĐỂ KÝ KẾT HỢP ĐỒNG
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "2px" }}>
              <span>-</span>
              <span>Bộ luật Dân sự số 91/2015/QH13 đã được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam thông qua ngày 24/11/2015.</span>
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "2px" }}>
              <span>-</span>
              <span>Luật Thương mại số 36/2005/QH11 đã được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam thông qua ngày 14/6/2005.</span>
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "2px" }}>
              <span>-</span>
              <span>
                Căn cứ nội dung Biên bản số {selectedPartner?.bbCode ? `${selectedPartner.bbCode}/BBTN-SEAJONG` : "................/BBTN-SEAJONG"}, ký ngày {bbDateFormatted} giữa {companyInfo?.name || "Công ty Cổ phần Seajong Faucet Việt Nam"} và {hdB_Ten || "................"} về việc thống nhất đại lý chính thức Seajong.
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <span>-</span>
              <span>Căn cứ vào năng lực và nhu cầu của các bên</span>
            </div>
          </div>

          {/* Parties participating in Contract */}
          <div style={{ margin: "20px 0 4px 0", fontSize: "11px", lineHeight: "1.35", color: "#000" }}>
            <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "3px", fontSize: "11.5px", color: "#003087" }}>
              CÁC BÊN THAM GIA KÝ KẾT HỢP ĐỒNG
            </div>
            <div style={{ textAlign: "justify", lineHeight: "1.35" }}>
              Hợp đồng đại lý phân phối chính thức của Seajong (sau đây gọi tắt là Hợp đồng) được lập và ký kết vào ngày {dDay} tháng {dMonth} năm {dYear} trên nguyên tắc tự nguyện và bình đẳng giữa các bên dưới đây:
            </div>
          </div>

          {/* Side A & B */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
            {/* Side A */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "3px 8px", background: "#f8fafc" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "11px", textTransform: "uppercase", marginBottom: 2 }}>
                BÊN A: {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5px 12px", fontSize: "11px", lineHeight: 1.3, color: "#000" }}>
                <div style={{ gridColumn: "span 2", display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Địa chỉ:</span>
                  <span>{companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</span>
                </div>
                <div style={{ gridColumn: "span 2", display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Mã số thuế:</span>
                  <span>{companyInfo?.taxCode || "0109865432"}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Đại diện:</span>
                  <span>{hdANguoiKy.startsWith("Ông") || hdANguoiKy.startsWith("Bà") ? hdANguoiKy : `Ông ${hdANguoiKy}`}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "70px", flexShrink: 0 }}>Chức vụ:</span>
                  <span>{hdAChucVu}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Điện thoại:</span>
                  <span>{(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "70px", flexShrink: 0 }}>Email:</span>
                  <span>{companyInfo?.email || "info@seajong.com"}</span>
                </div>
              </div>
            </div>

            {/* Side B */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "3px 8px", background: "#f8fafc" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "11px", textTransform: "uppercase", marginBottom: 2 }}>
                BÊN B: {hdB_Ten?.toUpperCase() || "........................................................................"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5px 12px", fontSize: "11px", lineHeight: 1.3, color: "#000" }}>
                <div style={{ gridColumn: "span 2", display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Địa chỉ:</span>
                  <span>{hdB_DiaChi || "........................................................................"}</span>
                </div>
                <div style={{ gridColumn: "span 2", display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Mã số thuế:</span>
                  <span>{hdB_MST || "...................................."}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Đại diện:</span>
                  <span>{hdB_DaiDien || "................................................"}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "70px", flexShrink: 0 }}>Chức vụ:</span>
                  <span>{hdB_ChucVu || "................................................"}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "90px", flexShrink: 0 }}>Điện thoại:</span>
                  <span>{hdB_DienThoai || "...................................."}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ width: "70px", flexShrink: 0 }}>Email:</span>
                  <span>{hdB_Email || "................................................"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Xét rằng (WHEREAS) section */}
          <div style={{ margin: "6px 0 4px 0", fontSize: "11px", lineHeight: "1.35", color: "#000" }}>
            <div style={{ textAlign: "left", fontWeight: "bold", marginBottom: "4px", fontSize: "12px", color: "#003087", textTransform: "uppercase" }}>
              XÉT RẰNG
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "2px", textAlign: "justify" }}>
              <span style={{ flexShrink: 0 }}>-</span>
              <span>Bên A có nhu cầu thực hiện thực hiện việc phát triển hệ thống đại lý chính thức và đang có nhu cầu tìm kiếm đối tác đáp ứng đầy đủ các yêu cầu về pháp lý và năng lực phù hợp.</span>
            </div>
            <div style={{ display: "flex", gap: "6px", textAlign: "justify" }}>
              <span style={{ flexShrink: 0 }}>-</span>
              <span>Bên B là đối tác cam kết có đủ năng lực pháp lý, điều kiện cần thiết theo yêu cầu của bên A và mong muốn được hợp tác với bên A.</span>
            </div>
          </div>

          <div style={{
            textAlign: "center",
            fontWeight: "bold",
            textTransform: "uppercase",
            fontSize: "11px",
            color: "#003087",
            marginTop: "16px",
            marginBottom: "10px",
            paddingLeft: "45px",
            paddingRight: "45px",
            lineHeight: 1.35
          }}>
            Sau khi trao đổi, hai bên thoả thuận ký kết hợp đồng đại lý phân phối chính thức Seajong với các điều khoản cụ thể dưới đây.
          </div>

          {/* Clause 1 */}
          <div style={{ marginBottom: 3, marginTop: 8 }}>
            <div style={{ color: "#003087", padding: "1px 0px", fontWeight: "bold", fontSize: "12px", marginBottom: "2px" }}>
              Điều 1: Đối tượng hợp đồng
            </div>
            <div style={{ paddingLeft: 8, fontSize: "11.5px", lineHeight: 1.4, textAlign: "justify" }}>
              Bên A chỉ định và Bên B đồng ý bán, phân phối các sản phẩm của Bên A tại khu vực kinh doanh cho các đại lý cấp dưới và cho người tiêu dùng.
            </div>
          </div>

          {/* Clause 2 */}
          <div style={{ marginBottom: 3, marginTop: 8 }}>
            <div style={{ color: "#003087", padding: "1px 0px", fontWeight: "bold", fontSize: "12px", marginBottom: "2px" }}>
              Điều 2: Điều kiện làm đại lý:
            </div>
            <ol style={{ margin: "0", paddingLeft: 20, fontSize: "11.5px", lineHeight: 1.4, textAlign: "justify" }}>
              <li style={{ marginBottom: 1 }}>
                <strong>Pháp lý:</strong> Bên B là doanh nghiệp hoặc hộ kinh doanh/cá nhân kinh doanh có giấy phép kinh doanh từ 02 năm trở lên. Không có nợ xấu hoặc đang có tranh chấp khiếu nại.
              </li>
              <li style={{ marginBottom: 1 }}>
                <strong>Vị trí showroom:</strong> {hdShowroomAddress || "......................................................................................................."}
              </li>
              <li style={{ marginBottom: 1 }}>
                <strong>Diện tích thi công quầy kệ showroom trưng bày:</strong> {hdShowroomArea ? `${hdShowroomArea} m²` : ".................................... m²"}
              </li>
            </ol>
          </div>

          {/* Clause 3 */}
          <div style={{ marginBottom: 3, marginTop: 8 }}>
            <div style={{ color: "#003087", padding: "1px 0px", fontWeight: "bold", fontSize: "12px", marginBottom: "2px" }}>
              Điều 3. Quyền lợi của Bên B
            </div>
            <ol style={{ margin: "0", paddingLeft: 20, fontSize: "11.5px", lineHeight: 1.4, textAlign: "justify" }}>
              <li style={{ marginBottom: 1 }}>Được Bên A miễn phí thiết kế thi công showroom, quầy kệ, POSM theo tiêu chuẩn.</li>
              <li style={{ marginBottom: 1 }}>Được hỗ trợ truyền thông – marketing toàn diện và xuất hiện trên tất cả các kênh chính thức của Bên A.</li>
              <li style={{ marginBottom: 1 }}>Được cung cấp sản phẩm độc quyền dành riêng cho hệ thống đại lý phân phối.</li>
              <li style={{ marginBottom: 1 }}>Được đào tạo và hướng dẫn về quản lý cửa hàng, bán hàng, chăm sóc khách hàng.</li>
              <li style={{ marginBottom: 1 }}>Được áp dụng chính sách chiết khấu, công nợ và thưởng doanh số theo quy định hiện hành của Seajong.</li>
            </ol>
          </div>

          {/* Clause 4 */}
          <div style={{ marginBottom: 3, marginTop: 8 }}>
            <div style={{ color: "#003087", padding: "1px 0px", fontWeight: "bold", fontSize: "12px", marginBottom: "2px" }}>
              Điều 4. Nghĩa vụ của Bên B
            </div>
            <ol style={{ margin: "0", paddingLeft: 20, fontSize: "11.5px", lineHeight: 1.4, textAlign: "justify" }}>
              <li style={{ marginBottom: 1 }}>Thanh toán chi phí đầu tư ban đầu (nếu có) và nhập hàng theo mức tối thiểu mà Bên A quy định.</li>
              <li style={{ marginBottom: 1 }}>Duy trì trưng bày và kinh doanh theo đúng chuẩn thương hiệu Seajong.</li>
              <li style={{ marginBottom: 1 }}>Cam kết đơn hàng đầu tiên đạt mức yêu cầu của bên A dựa trên thỏa thuận tính trên chi phí thi công cho bên B.</li>
              <li style={{ marginBottom: 1 }}>
                Thực hiện doanh số cam kết tối thiểu hàng năm là: <strong>{formatCurrencyHD(hdAnnualRevenue)}</strong>. Phân bổ tương đương tối thiểu <strong>{formatCurrencyHD(hdMonthlyRevenue)}</strong> cho mỗi tháng.
              </li>
              <li style={{ marginBottom: 1 }}>Thanh toán đúng hạn theo các quy định trong hợp đồng.</li>
              <li style={{ marginBottom: 1 }}>Tuân thủ đầy đủ các chương trình đào tạo, chính sách marketing và hướng dẫn vận hành do Bên A ban hành.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="print-page-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 6, flexShrink: 0 }}>
          <span style={{ fontSize: "8px", color: "#000" }}>Hợp đồng đại lý phân phối thiết bị vệ sinh cao cấp Seajong®</span>
          <span style={{ fontSize: "8.5px", color: "#000", fontWeight: 700 }}>Trang 1 / 2</span>
        </div>
      </div>
    );
  };

  const renderPage2HD = () => {
    const today = hdDate && !isNaN(Date.parse(hdDate)) ? new Date(hdDate) : null;
    const dYear = today ? today.getFullYear() : "......";
    const dMonth = today ? String(today.getMonth() + 1).padStart(2, "0") : "......";
    const dDay = today ? String(today.getDate()).padStart(2, "0") : "......";

    return (
      <div className="print-page-break" style={{
        width: "794px", height: "1123px", background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", padding: "10mm 15mm 12mm 25mm",
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        justifyContent: "space-between", position: "relative"
      }}>
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #003087", paddingBottom: 4, marginBottom: 6 }}>
            {companyInfo?.logoUrl ? (
              <img src={companyInfo.logoUrl} style={{ height: "36px", objectFit: "contain" }} alt="Logo" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <div style={{
                    position: "absolute",
                    left: -4, right: -4, top: -2, bottom: -2,
                    border: "1.5px solid #003087",
                    borderRadius: "50% / 40% 45% 35% 50%",
                    transform: "skewX(-10deg) rotate(-3deg)",
                    pointerEvents: "none"
                  }} />
                  <span style={{ fontFamily: "sans-serif", fontWeight: 950, fontSize: 20, color: "#003087", letterSpacing: -0.5, zIndex: 2 }}>
                    Seajong<span style={{ color: "#003087", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>®</span>
                  </span>
                </div>
                <div style={{ fontSize: 6, color: "#000", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Better than best</div>
              </div>
            )}
            <div style={{ textAlign: "right", fontSize: "9px", lineHeight: 1.3, color: "#000" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "9.5px", textTransform: "uppercase" }}>
                {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEJONG FAUCET VIỆT NAM"}
              </div>
              <div>Địa chỉ: {companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</div>
              <div>Hotline: {(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()} | Website: {companyInfo?.website || "https://seajong.com/"}</div>
            </div>
          </div>

          {/* Clause 5 */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "13px", marginBottom: "3px" }}>
              Điều 5. Quyền và nghĩa vụ của Bên A
            </div>
            <ol style={{ margin: "0", paddingLeft: 18, fontSize: "12px", lineHeight: 1.4, textAlign: "justify" }}>
              <li style={{ marginBottom: 1 }}>Thiết kế và thi công showroom chuẩn Seajong, cung cấp quầy kệ, POSM theo tiêu chuẩn.</li>
              <li style={{ marginBottom: 1 }}>Đảm bảo cung ứng hàng hóa đầy đủ, đúng chất lượng, đúng chủng loại và đúng tiến độ.</li>
              <li style={{ marginBottom: 1 }}>Hỗ trợ marketing, truyền thông, đào tạo nhân sự cho Bên B theo quy trình vận hành tiêu chuẩn Seajong.</li>
              <li style={{ marginBottom: 1 }}>
                Đảm bảo quyền lợi độc quyền khu vực cho bên B trong phạm vi bán kính <strong>{hdExclusiveRadius || "5"} km</strong> trong thời gian <strong>{hdExclusiveMonths || "06"} (sáu) tháng</strong>. Sau <strong>{hdExclusiveMonths || "06"} (sáu) tháng</strong>, nếu bên B không thực hiện đúng các nghĩa vụ Đại lý về Doanh số, Công nợ hoặc vi phạm nghiêm trọng các quy định làm ảnh hưởng đến thương hiệu của bên A, bên A có quyền chấm dứt quyền lợi độc quyền này và khai thác thêm các đại lý trong khu vực.
              </li>
              <li style={{ marginBottom: 1 }}>Được quyền kiểm tra định kỳ việc tuân thủ tiêu chuẩn vận hành, hình ảnh và chất lượng dịch vụ tại cửa hàng Bên B.</li>
            </ol>
          </div>

          {/* Clause 6 */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "13px", marginBottom: "3px" }}>
              Điều 6. Chính sách thưởng và khuyến khích
            </div>
            <div style={{ paddingLeft: 8, fontSize: "12px", lineHeight: 1.4, textAlign: "justify" }}>
              Bên B được hưởng các chính sách thưởng (thanh toán, doanh số năm) và các hỗ trợ khác theo chính sách tại biên bản thống nhất ban hành kèm theo hợp đồng này.
            </div>
          </div>

          {/* Clause 7 */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "13px", marginBottom: "3px" }}>
              Điều 7. Thời hạn hợp đồng
            </div>
            <div style={{ paddingLeft: 8, fontSize: "12px", lineHeight: 1.4, textAlign: "justify" }}>
              Hợp đồng này có hiệu lực trong thời hạn <strong>{hdDurationYears || "02"} (hai) năm</strong> kể từ ngày ký. Sau thời hạn trên, hai bên có thể gia hạn theo thỏa thuận bằng văn bản.
            </div>
          </div>

          {/* Clause 8 */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "13px", marginBottom: "3px" }}>
              Điều 8. Chấm dứt hợp đồng
            </div>
            <ol style={{ margin: "0", paddingLeft: 18, fontSize: "12px", lineHeight: 1.4, textAlign: "justify" }}>
              <li style={{ marginBottom: 1 }}>Hết thời hạn hợp đồng mà không gia hạn. Hai bên thỏa thuận chấm dứt trước thời hạn.</li>
              <li style={{ marginBottom: 1 }}>Một trong hai bên vi phạm nghiêm trọng nghĩa vụ và không khắc phục trong vòng 30 ngày kể từ khi nhận được thông báo bằng văn bản.</li>
              <li style={{ marginBottom: 1 }}>Bên B không đạt doanh số tối thiểu trong <strong>06 (sáu) tháng liên tiếp</strong> thì bên A sẽ xem xét điều chỉnh chính sách chiết khấu hoặc dừng hợp tác.</li>
            </ol>
          </div>

          {/* Clause 9 */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "13px", marginBottom: "3px" }}>
              Điều 9. Giải quyết tranh chấp
            </div>
            <ol style={{ margin: "0", paddingLeft: 18, fontSize: "12px", lineHeight: 1.4, textAlign: "justify" }}>
              <li style={{ marginBottom: 1 }}>Mọi tranh chấp phát sinh trước hết sẽ được giải quyết bằng thương lượng, hòa giải.</li>
              <li style={{ marginBottom: 1 }}>Trường hợp không đạt được thỏa thuận, tranh chấp sẽ được giải quyết tại Trọng tài Thương mại Việt Nam hoặc Tòa án có thẩm quyền theo quy định pháp luật.</li>
            </ol>
          </div>

          {/* Clause 10 */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "13px", marginBottom: "3px" }}>
              Điều 10. Điều khoản chung
            </div>
            <ol style={{ margin: "0", paddingLeft: 18, fontSize: "12px", lineHeight: 1.4, textAlign: "justify" }}>
              <li style={{ marginBottom: 1 }}>Hợp đồng này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</li>
              <li style={{ marginBottom: 1 }}>Các phụ lục kèm theo (nếu có) là một phần không tách rời của hợp đồng.</li>
              <li style={{ marginBottom: 1 }}>
                Hợp đồng có hiệu lực từ ngày <strong>{dDay && dMonth && dYear ? `${dDay}/${dMonth}/${dYear}` : ".../.../....."}</strong>
              </li>
            </ol>
          </div>

          {/* Signatures */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center", marginTop: 20 }}>
            <div>
              <strong style={{ fontSize: "11.5px", textTransform: "uppercase", color: "#000" }}>ĐẠI DIỆN BÊN A</strong>
              <div style={{ height: 85 }} />
            </div>
            <div>
              <strong style={{ fontSize: "11.5px", textTransform: "uppercase", color: "#000" }}>ĐẠI DIỆN BÊN B</strong>
              <div style={{ height: 85 }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="print-page-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          <span style={{ fontSize: "8px", color: "#000" }}>Hợp đồng đại lý phân phối thiết bị vệ sinh cao cấp Seajong®</span>
          <span style={{ fontSize: "8.5px", color: "#000", fontWeight: 700 }}>Trang 2 / 2</span>
        </div>
      </div>
    );
  };

  const renderPage1PL = () => {
    const today = plDate && !isNaN(Date.parse(plDate)) ? new Date(plDate) : null;
    const dYear = today ? today.getFullYear() : "......";
    const dMonth = today ? String(today.getMonth() + 1).padStart(2, "0") : "......";
    const dDay = today ? String(today.getDate()).padStart(2, "0") : "......";

    return (
      <div className="print-page-break" style={{
        width: "794px", height: "1123px", background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", padding: "10mm 15mm 10mm 25mm",
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        justifyContent: "space-between", position: "relative"
      }}>
        <div style={{ paddingBottom: 15 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #003087", paddingBottom: 10 }}>
            {companyInfo?.logoUrl ? (
              <img src={companyInfo.logoUrl} style={{ height: "45px", objectFit: "contain" }} alt="Logo" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <div style={{
                    position: "absolute",
                    left: -4, right: -4, top: -2, bottom: -2,
                    border: "1.5px solid #003087",
                    borderRadius: "50% / 40% 45% 35% 50%",
                    transform: "skewX(-10deg) rotate(-3deg)",
                    pointerEvents: "none"
                  }} />
                  <span style={{ fontFamily: "sans-serif", fontWeight: 950, fontSize: 24, color: "#003087", letterSpacing: -0.5, zIndex: 2 }}>
                    Seajong<span style={{ color: "#003087", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>®</span>
                  </span>
                </div>
                <div style={{ fontSize: 6.5, color: "#000", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Better than best</div>
              </div>
            )}
            <div style={{ textAlign: "right", fontSize: "9px", lineHeight: 1.35, color: "#000" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "10px", textTransform: "uppercase" }}>
                {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
              </div>
              <div>Địa chỉ: {companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</div>
              <div>Hotline: {(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()} | Website: {companyInfo?.website || "https://seajong.com/"}</div>
            </div>
          </div>

          {/* Title Section */}
          <div style={{ textAlign: "center", margin: "25px 0 8px 0" }}>
            <h2 style={{ margin: 0, color: "#003087", fontWeight: 900, fontSize: "18px", letterSpacing: "1px" }}>PHỤ LỤC HỢP ĐỒNG</h2>
            <div style={{ fontSize: "12px", color: "#000", marginTop: 2, fontStyle: "italic" }}>
              Số: {plNo ? `${plNo}/HĐĐL-SEAJONG` : "......................................."}
            </div>
          </div>

          {/* Date and Place */}
          <div style={{ fontSize: "12px", marginBottom: "12px", color: "#000" }}>
            Hôm nay, ngày <strong>{dDay}</strong> tháng <strong>{dMonth}</strong> năm <strong>{dYear}</strong>, tại: <strong>{plAddress || "......................................."}</strong>
            <br />
            Chúng tôi gồm có:
          </div>

          {/* Bên A */}
          <div style={{ marginBottom: "10px", fontSize: "11.5px", color: "#000" }}>
            <div style={{ fontWeight: "bold", textTransform: "uppercase", color: "#003087", marginBottom: 3 }}>
              Bên A (Bên giao đại lý): CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5px 12px", fontSize: "12px", lineHeight: 1.4, paddingLeft: 8 }}>
              <div style={{ gridColumn: "span 2", display: "flex" }}>
                <span style={{ width: "90px", flexShrink: 0 }}>Địa chỉ:</span>
                <span>{companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</span>
              </div>
              <div style={{ gridColumn: "span 2", display: "flex" }}>
                <span style={{ width: "90px", flexShrink: 0 }}>Mã số thuế:</span>
                <span>{companyInfo?.taxCode || "0110402350"}</span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ width: "90px", flexShrink: 0 }}>Đại diện:</span>
                <span><strong>{hdANguoiKy || "Lê Công Vụ"}</strong></span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ width: "70px", flexShrink: 0 }}>Chức vụ:</span>
                <span><strong>{hdAChucVu || "Giám đốc kinh doanh"}</strong></span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ width: "90px", flexShrink: 0 }}>Điện thoại:</span>
                <span><strong>{(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()}</strong></span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ width: "70px", flexShrink: 0 }}>Email:</span>
                <span><strong>{companyInfo?.email || "kinhdoanh@seajong.com"}</strong></span>
              </div>
            </div>
          </div>

          {/* Bên B */}
          <div style={{ marginBottom: "12px", fontSize: "11.5px", color: "#000" }}>
            <div style={{ fontWeight: "bold", textTransform: "uppercase", color: "#003087", marginBottom: 3 }}>
              Bên B (Bên Đại lý): {hdB_Ten || "......................................."}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5px 12px", fontSize: "12px", lineHeight: 1.4, paddingLeft: 8 }}>
              <div style={{ gridColumn: "span 2", display: "flex" }}>
                <span style={{ width: "90px", flexShrink: 0 }}>Địa chỉ:</span>
                <span>{hdB_DiaChi || "......................................."}</span>
              </div>
              <div style={{ gridColumn: "span 2", display: "flex" }}>
                <span style={{ width: "90px", flexShrink: 0 }}>Mã số thuế:</span>
                <span>{hdB_MST || "......................................."}</span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ width: "90px", flexShrink: 0 }}>Đại diện:</span>
                <span><strong>{hdB_DaiDien || "......................................."}</strong></span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ width: "70px", flexShrink: 0 }}>Chức vụ:</span>
                <span><strong>{hdB_ChucVu || "......................................."}</strong></span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ width: "90px", flexShrink: 0 }}>Điện thoại:</span>
                <span><strong>{hdB_DienThoai || "......................................."}</strong></span>
              </div>
              <div style={{ display: "flex" }}>
                <span style={{ width: "70px", flexShrink: 0 }}>Email:</span>
                <span><strong>{hdB_Email || "......................................."}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "12px", marginBottom: "8px", fontStyle: "italic", color: "#000" }}>
            Sau khi trao đổi và bàn bạc, hai bên nhất trí cùng ký kết Phụ lục với nội dung sau:
          </div>

          {/* Section 1 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}>
              1. Nội dung phụ lục
            </div>
            <ul style={{ margin: "0", paddingLeft: 18, fontSize: "12px", lineHeight: 1.45 }}>
              <li>Thống nhất chi phí thi công (CPTC) và doanh thu (DT) cam kết.</li>
              <li>Thống nhất thời gian thi công.</li>
              <li>Tiến độ thanh toán chi phí thi công.</li>
              <li>Thời điểm hoàn trả/khấu trừ chi phí thi công.</li>
              <li>Cam kết hai bên về thời gian thi công và thời gian thanh toán.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}>
              2. Thống nhất Chi phí thi công và Doanh thu cam kết
            </div>
            <div style={{ paddingLeft: 8, fontSize: "12px", lineHeight: 1.5 }}>
              <div style={{ marginBottom: 2 }}>
                - CPTC: <strong>{plCptc || "........................"}</strong> VNĐ
                <br />
                <span className="text-muted" style={{ fontStyle: "italic", fontSize: "11px" }}>(Bằng chữ: {plCptcText || "......................................................................................."})</span>
              </div>
              <div style={{ marginBottom: 2 }}>
                - Mức Doanh thu Đại lý nhập hàng để được hỗ trợ 100% CPTC: <strong>{plRevenueMkt || "........................"}</strong> VNĐ
                <br />
                <span className="text-muted" style={{ fontStyle: "italic", fontSize: "11px" }}>(Bằng chữ: {plRevenueMktText || "......................................................................................."})</span>
              </div>
              <div style={{ marginBottom: 2 }}>
                - Doanh thu cam kết của Đại lý (Theo thỏa thuận): <strong>{plRevenueCommit || "........................"}</strong> VNĐ
                <br />
                <span className="text-muted" style={{ fontStyle: "italic", fontSize: "11px" }}>(Bằng chữ: {plRevenueCommitText || "......................................................................................."})</span>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}>
              3. Thời gian thi công
            </div>
            <div style={{ paddingLeft: 8, fontSize: "12px", lineHeight: 1.45 }}>
              <div>Tổng thời gian: <strong>{plDurationDays || "......"} ngày</strong> (tính từ thời điểm ký kết Hợp đồng - Biên Bản Thống Nhất - Phụ Lục)</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                <span>-</span>
                <span><strong>{plTimeline1 || "......................................."}</strong>: Hoàn thiện đo đạc tính toán, lên danh sách sản phẩm trưng bày, thiết kế bản vẽ kỹ thuật và hình ảnh 3D từng khu vực.</span>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                <span>-</span>
                <span><strong>{plTimeline2 || "......................................."}</strong>: Chuẩn bị hoàn tất nguyên vật liệu phục vụ thi công.</span>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                <span>-</span>
                <span><strong>{plTimeline3 || "......................................."}</strong>: Thực hiện thi công, lắp đặt quầy, kệ, bảng biển.</span>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                <span>-</span>
                <span><strong>{plTimeline4 || "......................................."}</strong>: Lắp đặt sản phẩm trưng bày.</span>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                <span>-</span>
                <span><strong>{plTimeline5 || "......................................."}</strong>: Thực hiện bàn giao khu vực thi công và trưng bày cho Đại lý.</span>
              </div>
              <div style={{ marginTop: "4px", fontSize: "11px", lineHeight: "1.4" }}>
                <em>Lưu ý: Thời gian thi công được phép chậm tiến độ tối đa 4 ngày (tổng thời gian thi công tối đa <strong>{plMaxDelayDays || "19"} ngày</strong>) nếu có các lý do bất khả kháng về nguồn vật liệu thi công, đường sá cách trở do thời tiết, tai nạn.</em>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="print-page-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #cbd5e1", paddingTop: 6 }}>
          <span style={{ fontSize: "8px", color: "#000" }}>Phụ lục hợp đồng - Đại lý chính thức Seajong®</span>
          <span style={{ fontSize: "8.5px", color: "#000", fontWeight: 700 }}>Trang 1 / 2</span>
        </div>
      </div>
    );
  };

  const renderPage2PL = () => {
    return (
      <div className="print-page-break" style={{
        width: "794px", height: "1123px", background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", padding: "10mm 15mm 12mm 25mm",
        boxSizing: "border-box", display: "flex", flexDirection: "column",
        justifyContent: "space-between", position: "relative"
      }}>
        <div style={{ paddingBottom: 15 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #003087", paddingBottom: 6, marginBottom: 10 }}>
            {companyInfo?.logoUrl ? (
              <img src={companyInfo.logoUrl} style={{ height: "38px", objectFit: "contain" }} alt="Logo" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <div style={{
                    position: "absolute",
                    left: -4, right: -4, top: -2, bottom: -2,
                    border: "1.5px solid #003087",
                    borderRadius: "50% / 40% 45% 35% 50%",
                    transform: "skewX(-10deg) rotate(-3deg)",
                    pointerEvents: "none"
                  }} />
                  <span style={{ fontFamily: "sans-serif", fontWeight: 950, fontSize: 22, color: "#003087", letterSpacing: -0.5, zIndex: 2 }}>
                    Seajong<span style={{ color: "#003087", fontSize: 8, verticalAlign: "super", marginLeft: 1 }}>®</span>
                  </span>
                </div>
                <div style={{ fontSize: 6.5, color: "#000", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Better than best</div>
              </div>
            )}
            <div style={{ textAlign: "right", fontSize: "9px", lineHeight: 1.3, color: "#000" }}>
              <div style={{ fontWeight: 800, color: "#003087", fontSize: "9.5px", textTransform: "uppercase" }}>
                {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
              </div>
              <div>Địa chỉ: {companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}</div>
              <div>Hotline: {(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()} | Website: {companyInfo?.website || "https://seajong.com/"}</div>
            </div>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}>
              4. Tiến độ thanh toán chi phí thi công
            </div>
            <div style={{ paddingLeft: 8, fontSize: "12px", lineHeight: 1.45 }}>
              <div style={{ marginBottom: 4 }}>
                <strong>- Đợt 1 ({plPhase1Date || "........................"}):</strong> Ngay sau khi ký kết Hợp Đồng và Phụ Lục. Thanh toán đặt cọc <strong>{plPhase1Rate || "50%"}</strong> CPTC.
                <br />
                Số tiền: <strong>{plPhase1Amount || "........................"}</strong> VNĐ <span style={{ fontStyle: "italic", fontSize: "10.5px" }}>(Bằng chữ: {plPhase1AmountText || "...................................................."})</span>.
              </div>
              <div style={{ marginBottom: 4 }}>
                <strong>- Đợt 2 ({plPhase2Date || "........................"}):</strong> Thời điểm hoàn thiện bản vẽ kỹ thuật và bắt đầu mua sắm nguyên vật liệu phục vụ thi công. Thanh toán <strong>{plPhase2Rate || "30%"}</strong> CPTC.
                <br />
                Số tiền: <strong>{plPhase2Amount || "........................"}</strong> VNĐ <span style={{ fontStyle: "italic", fontSize: "10.5px" }}>(Bằng chữ: {plPhase2AmountText || "...................................................."})</span>.
              </div>
              <div style={{ marginBottom: 4 }}>
                <strong>- Đợt 3 ({plPhase3Date || "........................"}):</strong> Thời điểm hoàn tất bàn giao khu vực thi công và trưng bày. Thanh toán <strong>{plPhase3Rate || "20%"}</strong> CPTC còn lại.
                <br />
                Số tiền: <strong>{plPhase3Amount || "........................"}</strong> VNĐ <span style={{ fontStyle: "italic", fontSize: "10.5px" }}>(Bằng chữ: {plPhase3AmountText || "...................................................."})</span>.
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}>
              5. Hỗ trợ và hoàn trả chi phí thi công
            </div>
            <ul style={{ margin: "0", paddingLeft: 18, fontSize: "12px", lineHeight: 1.45 }}>
              <li>Chi phí thi công được hỗ trợ và hoàn trả 100% cho Đại lý.</li>
              <li>Phương thức hoàn trả: Khấu trừ vào giá trị đơn hàng theo Doanh thu đã cam kết.</li>
              <li>Thời điểm khấu trừ: Vào thời điểm chốt công nợ lần đầu tiên của Đại lý.</li>
            </ul>
          </div>

          {/* Section 6 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#003087", padding: "2px 0px", fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}>
              6. Cam kết
            </div>
            <div style={{ paddingLeft: 8, fontSize: "12px", lineHeight: 1.4, textAlign: "justify" }}>
              <div style={{ fontWeight: "bold", marginBottom: 2 }}>Bên A: CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM</div>
              <ul style={{ margin: "0 0 6px 0", paddingLeft: 15 }}>
                <li>Bên A cam kết thực hiện thi công đúng tiến độ đã thống nhất.</li>
                <li>Trong trường hợp thi công chậm tiến độ vượt quá thời gian tối đa cam kết (<strong>{plPenaltyMaxDelay || "4"} ngày</strong>), bên A bị phạt 5% - Tổng số tiền bên B đã thanh toán cho mỗi ngày chậm tiến độ.</li>
                <li>Bên A Chịu trách nhiệm bảo hành, sửa chữa về chất lượng quầy kệ tại mặt bằng đã thi công trong thời gian 06 tháng sau khi bàn giao.</li>
                <li>Bên A không phải chịu trách nhiệm bảo hành trong trường hợp bị thiên tai lũ lụt, hỏa hoạn, động đất, sóng thần, phá hoại, rơi vỡ hay yếu tố bên ngoài tác động... tính từ ngày bàn giao nghiệm thu công trình.</li>
              </ul>
              <div style={{ fontWeight: "bold", marginBottom: 2 }}>Bên B: {hdB_Ten || "......................................."}</div>
              <ul style={{ margin: "0", paddingLeft: 15 }}>
                <li>Bên B cam kết thanh toán Chi phí thi công theo 3 (ba) đợt đã thống nhất tại Điều khoản số 4 của Phụ Lục này.</li>
                <li>Bên B phải hỗ trợ xử lý các vật dụng cản trở tại vị trí mặt bằng trước thời điểm thi công để đảm bảo thi công thuận tiện và không bị chậm tiến độ.</li>
                <li>Trong trường hợp bên B không thực hiện Thanh toán theo tiến độ, bên A có quyền tạm dừng hợp tác, thu hồi quầy kệ và không hoàn trả số tiền đã thanh toán.</li>
              </ul>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center", fontSize: "11px", fontWeight: "bold", marginTop: "25px" }}>
            <div>
              ĐẠI DIỆN BÊN A
              <div style={{ height: "85px" }} />
            </div>
            <div>
              ĐẠI DIỆN BÊN B
              <div style={{ height: "85px" }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="print-page-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #cbd5e1", paddingTop: 6 }}>
          <span style={{ fontSize: "8px", color: "#000" }}>Phụ lục hợp đồng - Đại lý chính thức Seajong®</span>
          <span style={{ fontSize: "8.5px", color: "#000", fontWeight: 700 }}>Trang 2 / 2</span>
        </div>
      </div>
    );
  };

  const handleRestorePartner = async (partner: PartnerProcessItem) => {
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: partner.id,
          step: 2, // Restore to step 2 (Chăm sóc)
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === partner.id ? returnedPartner : p));
        setSelectedPartner(null);
        toastSuccess("Đã khôi phục đại lý về bước Chăm sóc!");
      } else {
        toastError("Không thể khôi phục đại lý. Vui lòng thử lại!");
      }
    } catch (e) {
      console.error("Error restoring partner", e);
      toastError("Có lỗi xảy ra!");
    }
  };

  const handleDeleteCareHistoryClick = () => {
    setConfirmDeleteHistoryOpen(true);
  };

  const handleDeleteCareHistoryConfirm = async () => {
    if (!selectedPartner || !editingCareHistoryId) return;

    setDeletingHistory(true);
    try {
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPartner.id,
          action: "DELETE_HISTORY",
          careHistoryId: editingCareHistoryId,
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === returnedPartner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
        setShowCareModal(false);
        setConfirmDeleteHistoryOpen(false);
        toastSuccess("Xoá lịch sử chăm sóc thành công!");
      } else {
        const errData = await res.json();
        toastError(errData.error || "Không thể xoá lịch sử chăm sóc.");
      }
    } catch (e) {
      console.error("Error deleting care history", e);
      toastError("Có lỗi xảy ra khi xoá lịch sử chăm sóc.");
    } finally {
      setDeletingHistory(false);
    }
  };

  const handleAdvanceStep = async (partner: PartnerProcessItem) => {
    if (partner.step >= 5) return;

    // Auto-fill defaults for the next step if they are missing
    const next = partner.step + 1;
    const updated = {
      ...partner,
      step: next,
      detailSpecialRequestPending: false,
      detailSpecialRequestStatus: "NONE"
    };

    if (next === 2) {
      const hasCrm = crmEmployees.some(emp => emp.fullName === currentUserName);
      updated.careStaff = updated.careStaff || (hasCrm ? currentUserName : (crmEmployees[0]?.fullName || "Vũ Hoàng Long"));
      updated.careChannel = updated.careChannel || "Zalo";
      updated.careNote = updated.careNote || "Bắt đầu chăm sóc sau tiếp nhận thông tin.";
      updated.nextSchedule = updated.nextSchedule || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    } else if (next === 3) {
      updated.quoteCode = "";
      updated.quoteValue = 0;
      updated.discountRate = 0;
      updated.quoteStatus = undefined;
    } else if (next === 4) {
      updated.contractNo = updated.contractNo || `HDDL-2026-0${Math.floor(1000 + Math.random() * 9000)}`;
      updated.contractValue = updated.contractValue || updated.quoteValue || 150000000;
      updated.creditLimit = updated.creditLimit || 50000000;
      updated.signDate = updated.signDate || new Date().toISOString().split("T")[0];
      updated.contractStatus = updated.contractStatus || "Pending Signature";
    } else if (next === 5) {
      updated.showroomArea = updated.showroomArea || 100;
      updated.designStatus = updated.designStatus || "Designing";
      updated.constructionProgress = updated.constructionProgress || 10;
      updated.estOpeningDate = updated.estOpeningDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      updated.constructionStatus = updated.constructionStatus || "Pending";
    }

    try {
      const { id, name, area, source, scale, contact, contactEmail, needs, step, ...formValuesRest } = updated;
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          area,
          source,
          scale,
          contact,
          contactEmail,
          needs,
          step,
          ...formValuesRest
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === partner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
      }
    } catch (e) {
      console.error("Error advancing step", e);
    }
  };

  const handleRegressStep = async (partner: PartnerProcessItem) => {
    if (partner.step <= 1) return;
    const updated = { ...partner, step: partner.step - 1 };

    try {
      const { id, name, area, source, scale, contact, contactEmail, needs, step, ...formValuesRest } = updated;
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          area,
          source,
          scale,
          contact,
          contactEmail,
          needs,
          step,
          ...formValuesRest
        }),
      });

      if (res.ok) {
        const returnedPartner = await res.json();
        setPartners(prev => prev.map(p => p.id === partner.id ? returnedPartner : p));
        setSelectedPartner(returnedPartner);
      }
    } catch (e) {
      console.error("Error regressing step", e);
    }
  };

  const handleSendReminder = async (partner: PartnerProcessItem) => {
    if (!partner.careStaff) {
      toastError("Lỗi", "Khách hàng này chưa được phân công người chăm sóc.");
      return;
    }

    const caregiver = crmEmployees.find(emp => emp.fullName === partner.careStaff);
    if (!caregiver?.userId) {
      toastError("Lỗi", `Không tìm thấy tài khoản người dùng của nhân viên ${partner.careStaff} để gửi thông báo.`);
      return;
    }

    // Calculate elapsed time
    const d = new Date(partner.date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let classification = "";
    let priority: "normal" | "high" = "normal";
    let type = "info";

    if (diffHours > 48) {
      classification = "Nghiêm trọng";
      priority = "high";
      type = "warning";
    } else if (diffHours > 24) {
      classification = "Cần quan tâm";
      priority = "normal";
      type = "info";
    } else {
      classification = "Bình thường";
      priority = "normal";
      type = "info";
    }

    const formattedDate = formatDisplayDateTime(partner.date);
    const title = `[Nhắc việc] Trễ hạn chăm sóc khách hàng: ${partner.name}`;
    let content = "";

    if (classification === "Nghiêm trọng") {
      content = `[Nghiêm trọng] Khách hàng ${partner.name} đã được tiếp nhận từ ngày ${formattedDate} (đã quá 48 giờ) nhưng chưa thực hiện chăm sóc. Yêu cầu bạn kiểm tra và xử lý gấp.`;
    } else if (classification === "Cần quan tâm") {
      content = `[Cần quan tâm] Khách hàng ${partner.name} đã được tiếp nhận từ ngày ${formattedDate} (đã quá 24 giờ). Vui lòng cập nhật tiến độ chăm sóc khách hàng này.`;
    } else {
      content = `[Nhắc việc] Vui lòng cập nhật tiến độ chăm sóc khách hàng ${partner.name} (tiếp nhận ngày ${formattedDate}).`;
    }

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          type,
          priority,
          audienceType: "individual",
          audienceValue: caregiver.userId,
          attachments: [{ type: "partner_reminder", partnerId: partner.id }],
        }),
      });

      if (res.ok) {
        toastSuccess("Thành công", `Đã gửi thông báo nhắc việc (${classification}) tới ${partner.careStaff}.`);
        const prevCount = partner.reminderCount || 0;
        const newCount = prevCount + 1;
        await handleUpdatePartnerDetails({ ...partner, reminderCount: newCount });
      } else {
        const errData = await res.json();
        toastError("Lỗi", errData.error || "Không thể gửi thông báo.");
      }
    } catch (err) {
      console.error("Error sending reminder notification:", err);
      toastError("Lỗi", "Lỗi mạng hoặc hệ thống khi gửi thông báo.");
    }
  };

  const handleBatchSendReminder = async () => {
    const selectedPartners = partners.filter(p => selectedIds.has(p.id));
    if (selectedPartners.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    const promises = selectedPartners.map(async (partner) => {
      if (!partner.careStaff) return;
      const caregiver = crmEmployees.find(emp => emp.fullName === partner.careStaff);
      if (!caregiver?.userId) return;

      const d = new Date(partner.date);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      let classification = "";
      let priority: "normal" | "high" = "normal";
      let type = "info";

      if (diffHours > 48) {
        classification = "Nghiêm trọng";
        priority = "high";
        type = "warning";
      } else if (diffHours > 24) {
        classification = "Cần quan tâm";
        priority = "normal";
        type = "info";
      } else {
        classification = "Bình thường";
        priority = "normal";
        type = "info";
      }

      const formattedDate = formatDisplayDateTime(partner.date);
      const title = `[Nhắc việc] Trễ hạn chăm sóc khách hàng: ${partner.name}`;
      let content = "";

      if (classification === "Nghiêm trọng") {
        content = `[Nghiêm trọng] Khách hàng ${partner.name} đã được tiếp nhận từ ngày ${formattedDate} (đã quá 48 giờ) nhưng chưa thực hiện chăm sóc. Yêu cầu bạn kiểm tra và xử lý gấp.`;
      } else if (classification === "Cần quan tâm") {
        content = `[Cần quan tâm] Khách hàng ${partner.name} đã được tiếp nhận từ ngày ${formattedDate} (đã quá 24 giờ). Vui lòng cập nhật tiến độ chăm sóc khách hàng này.`;
      } else {
        content = `[Nhắc việc] Vui lòng cập nhật tiến độ chăm sóc khách hàng ${partner.name} (tiếp nhận ngày ${formattedDate}).`;
      }

      try {
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            type,
            priority,
            audienceType: "individual",
            audienceValue: caregiver.userId,
            attachments: [{ type: "partner_reminder", partnerId: partner.id }],
          }),
        });

        if (res.ok) {
          successCount++;
          const prevCount = partner.reminderCount || 0;
          const newCount = prevCount + 1;
          const { id, name, area, source, scale, contact, contactEmail, needs, step, ...formValuesRest } = partner;
          await fetch("/api/sales/partners", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              name,
              area,
              source,
              scale,
              contact,
              contactEmail,
              needs,
              step,
              ...formValuesRest,
              reminderCount: newCount
            }),
          });
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    });

    try {
      await Promise.all(promises);
      if (successCount > 0) {
        toastSuccess("Thành công", `Đã gửi thành công ${successCount} thông báo nhắc việc.`);
        await fetchPartners();
      }
      if (failCount > 0) {
        toastError("Lỗi", `Gặp lỗi khi gửi ${failCount} thông báo.`);
      }
    } catch (err) {
      console.error("Error batch sending reminders:", err);
      toastError("Lỗi", "Gặp lỗi hệ thống khi gửi thông báo nhắc việc.");
    }
  };

  const handleBatchDeleteClick = () => {
    setConfirmDeleteBatchOpen(true);
  };

  const handleBatchDeleteConfirm = async () => {
    setDeletingBatch(true);
    try {
      const idsParam = Array.from(selectedIds).join(",");
      const res = await fetch(`/api/sales/partners?ids=${idsParam}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toastSuccess("Thành công", `Đã xoá thành công ${selectedIds.size} đại lý khỏi hệ thống.`);
        setSelectedIds(new Set());
        setConfirmDeleteBatchOpen(false);
        await fetchPartners();
      } else {
        const errData = await res.json();
        toastError("Lỗi", errData.error || "Gặp lỗi khi xoá dữ liệu đại lý.");
      }
    } catch (err) {
      console.error("Error batch deleting partners:", err);
      toastError("Lỗi", "Gặp lỗi hệ thống khi xoá dữ liệu.");
    } finally {
      setDeletingBatch(false);
    }
  };

  const handleDeleteHopDongClick = () => {
    setConfirmDeleteHopDongOpen(true);
  };

  const handleDeleteHopDongConfirm = async () => {
    if (!selectedPartner) return;
    setDeletingHopDong(true);
    try {
      const updated = {
        ...selectedPartner,
        // Main contract status fields
        contractNo: "",
        contractValue: 0,
        creditLimit: 0,
        signDate: "",
        contractStatus: "Pending Signature" as const,
        contractPdf: "",

        // Memorandum (Biên bản) fields
        bbDate: "",
        bbCode: "",
        bbA_DienThoai: "",
        bbANguoiKy: "",
        bbAChucVu: "",
        bbQuoteCode: "",
        bbDiaDiem: "",
        bbPdf: "",
        bbB_Ten: "",
        bbB_DiaChi: "",
        bbB_MST: "",
        bbB_DaiDien: "",
        bbB_ChucVu: "",
        bbB_DienThoai: "",
        bbB_Email: "",
        bbSupports: null,
        bbBonuses: [],

        // Detailed Contract (Hợp đồng) fields
        hdCode: "",
        hdDate: "",
        hdDiaDiem: "",
        hdANguoiKy: "",
        hdAChucVu: "",
        hdB_Ten: "",
        hdB_DiaChi: "",
        hdB_MST: "",
        hdB_DaiDien: "",
        hdB_ChucVu: "",
        hdB_DienThoai: "",
        hdB_Email: "",
        hdShowroomAddress: "",
        hdShowroomArea: "",
        hdAnnualRevenue: "",
        hdMonthlyRevenue: "",
        hdDurationYears: "",
        hdExclusiveRadius: "",
        hdExclusiveMonths: "",

        // Appendix (Phụ lục) fields
        plNo: "",
        plDate: "",
        plAddress: "",
        plCptc: "",
        plCptcText: "",
        plRevenueMkt: "",
        plRevenueMktText: "",
        plRevenueCommit: "",
        plRevenueCommitText: "",
        plDurationDays: "",
        plTimeline1: "",
        plTimeline2: "",
        plTimeline3: "",
        plTimeline4: "",
        plTimeline5: "",
        plMaxDelayDays: "",
        plPhase1Date: "",
        plPhase1Rate: "",
        plPhase1Amount: "",
        plPhase1AmountText: "",
        plPhase2Date: "",
        plPhase2Rate: "",
        plPhase2Amount: "",
        plPhase2AmountText: "",
        plPhase3Date: "",
        plPhase3Rate: "",
        plPhase3Amount: "",
        plPhase3AmountText: "",
        plPenaltyMaxDelay: "",
        plPdf: "",
        step: 6 // Move partner to "Đã từ bỏ" (step 6)
      };

      const { id, name, area, source, scale, contact, contactEmail, needs, step, ...formValuesRest } = updated;
      const res = await fetch("/api/sales/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          area,
          source,
          scale,
          contact,
          contactEmail,
          needs,
          step,
          ...formValuesRest
        }),
      });

      if (res.ok) {
        toastSuccess("Thành công", "Đã xoá toàn bộ hợp đồng và chuyển trạng thái đại lý thành Từ bỏ.");
        setConfirmDeleteHopDongOpen(false);
        setSelectedPartner(null);
        await fetchPartners();
      } else {
        const errData = await res.json();
        toastError("Lỗi", errData.error || "Gặp lỗi khi xoá hợp đồng.");
      }
    } catch (err) {
      console.error("Error deleting contract:", err);
      toastError("Lỗi", "Gặp lỗi hệ thống khi xoá hợp đồng.");
    } finally {
      setDeletingHopDong(false);
    }
  };



  // Define Columns based on current step
  const columns: TableColumn<PartnerProcessItem>[] = useMemo(() => {
    const checkboxColumn: TableColumn<PartnerProcessItem> = {
      header: (
        <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
          <input
            type="checkbox"
            className="form-check-input cursor-pointer"
            checked={filteredPartners.length > 0 && filteredPartners.every(p => selectedIds.has(p.id))}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        </div>
      ),
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
          <input
            type="checkbox"
            className="form-check-input cursor-pointer"
            checked={selectedIds.has(row.id)}
            onChange={(e) => handleSelectRow(row.id, e.target.checked)}
          />
        </div>
      ),
      width: "40px",
      align: "center"
    };

    console.log("DEBUG: currentStep =", currentStep, "type =", typeof currentStep, "filteredPartners count =", filteredPartners.length);
    let baseColumns: TableColumn<PartnerProcessItem>[] = [];
    switch (Number(currentStep)) {
      case 1:
        baseColumns = [
          {
            header: "Thông tin khách hàng",
            render: (row) => {
              return (
                <div>
                  <div className="fw-bold text-dark">{row.name}</div>
                  <div className="text-muted" style={{ fontSize: "11px" }}>{row.area || "—"}</div>
                </div>
              );
            },
            width: "25%",
          },
          {
            header: "Thời gian nhận",
            render: (row) => {
              let formattedDate = "";
              if (row.date) {
                try {
                  const d = new Date(row.date);
                  const hh = String(d.getHours()).padStart(2, "0");
                  const mm = String(d.getMinutes()).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  const month = String(d.getMonth() + 1).padStart(2, "0");
                  const yyyy = d.getFullYear();
                  formattedDate = `${hh}:${mm} ${dd}/${month}/${yyyy}`;
                } catch (e) {
                  formattedDate = row.date;
                }
              }
              const timeInfo = getElapsedTimeInfo(row.date);
              return (
                <div>
                  <div className="text-dark" style={{ fontSize: "12.5px" }}>{formattedDate}</div>
                  {timeInfo.label && (
                    <div className="d-flex align-items-center gap-2 mt-0.5">
                      <div
                        className={`${timeInfo.className} d-inline-flex align-items-center gap-1`}
                        style={{ fontSize: "10.5px", ...timeInfo.style }}
                      >
                        <i className="bi bi-clock" style={{ fontSize: "9px" }} />
                        {timeInfo.label}
                      </div>
                      {row.reminderCount && row.reminderCount > 0 ? (
                        <span
                          className="badge bg-danger-subtle text-danger border border-danger/20 rounded-pill px-1.5 py-0.5 d-inline-flex align-items-center justify-content-center"
                          style={{ fontSize: "9.5px", fontWeight: 600 }}
                          title={`Đã nhắc việc ${row.reminderCount} lần`}
                        >
                          {row.reminderCount}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            },
            width: "15%",
          },
          {
            header: "Liên hệ",
            render: (row) => {
              const parts = row.contact.split(" - ");
              const name = parts[0] || "";
              const phone = parts[1] || "";
              return (
                <div>
                  <div className="fw-semibold text-dark" style={{ fontSize: "13.5px", whiteSpace: "nowrap" }}>{name}</div>
                  <div className="text-muted d-flex align-items-center gap-2 mt-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                    {phone && (
                      <span className="d-inline-flex align-items-center" style={{ whiteSpace: "nowrap" }}>
                        <i className="bi bi-telephone text-muted me-1" style={{ fontSize: "11px" }} />
                        {phone}
                      </span>
                    )}
                    {phone && row.contactEmail && <span className="opacity-30">|</span>}
                    {row.contactEmail && (
                      <span className="d-inline-flex align-items-center" style={{ whiteSpace: "nowrap" }}>
                        <i className="bi bi-envelope text-muted me-1" style={{ fontSize: "11px" }} />
                        {row.contactEmail}
                      </span>
                    )}
                  </div>
                </div>
              );
            },
            width: "25%",
          },
          {
            header: "Người tiếp nhận",
            render: (row) => {
              const caregiver = crmEmployees.find(emp => emp.fullName === row.careStaff);
              return (
                <div>
                  <span className="fw-semibold text-secondary">
                    <i className="bi bi-person-circle me-1" />
                    {row.careStaff || "Chưa phân công"}
                  </span>
                  {caregiver?.phone && (
                    <div className="text-muted small mt-0.5" style={{ fontSize: "11px" }}>
                      <i className="bi bi-telephone me-1" style={{ fontSize: "10px" }} />
                      {caregiver.phone}
                    </div>
                  )}
                </div>
              );
            },
            width: "25%",
          },
          {
            header: "Nguồn",
            render: (row) => <span className="badge bg-primary-subtle text-primary">{SOURCE_MAP[row.source] || row.source}</span>,
            width: "10%",
          }
        ];
        break;
      case 2:
        baseColumns = [
          {
            header: "Khách hàng tiềm năng",
            render: (row) => (
              <div>
                <div className="fw-bold text-dark">{row.name}</div>
                <div className="text-muted" style={{ fontSize: "11px" }}>{row.area}</div>
              </div>
            ),
            width: "22%",
          },
          {
            header: "Người chăm sóc",
            render: (row) => {
              const caregiver = crmEmployees.find(emp => emp.fullName === row.careStaff);
              return (
                <div>
                  <span className="fw-semibold text-secondary">
                    <i className="bi bi-person-circle me-1" />
                    {row.careStaff || "Chưa phân công"}
                  </span>
                  {caregiver?.phone && (
                    <div className="text-muted small mt-0.5" style={{ fontSize: "11px" }}>
                      <i className="bi bi-telephone me-1" style={{ fontSize: "10px" }} />
                      {caregiver.phone}
                    </div>
                  )}
                </div>
              );
            },
            width: "20%",
          },
          {
            header: "Kết quả tương tác mới nhất",
            render: (row) => {
              const latestHistory = row.careHistories && row.careHistories.length > 0
                ? row.careHistories[0]
                : null;

              const rawDate = latestHistory
                ? latestHistory.executionDate
                : (row.detailExecutionDate || row.lastCareDate || row.date);

              const outcomeText = latestHistory
                ? latestHistory.otherRequirements
                : (row.detailOtherRequirements || row.careNote || "—");

              let formattedDate = "";
              if (rawDate) {
                try {
                  const d = new Date(rawDate);
                  const hh = String(d.getHours()).padStart(2, "0");
                  const mm = String(d.getMinutes()).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  const month = String(d.getMonth() + 1).padStart(2, "0");
                  const yyyy = d.getFullYear();
                  formattedDate = `${hh}:${mm} ${dd}/${month}/${yyyy}`;
                } catch (e) {
                  formattedDate = rawDate;
                }
              }
              return (
                <div>
                  <div className="text-truncate text-dark fw-medium" style={{ maxWidth: 280 }} title={outcomeText}>
                    {outcomeText}
                  </div>
                  {formattedDate && (
                    <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                      <i className="bi bi-clock me-1" />
                      Thời gian chăm sóc: {formattedDate}
                    </div>
                  )}
                </div>
              );
            },
            width: "38%",
          },
          {
            header: "Phân loại",
            render: (row) => {
              const latestHistory = row.careHistories && row.careHistories.length > 0
                ? row.careHistories[0]
                : null;
              const stars = calculateLeadStars({
                role: latestHistory ? latestHistory.role : row.detailRole,
                deploymentPlan: latestHistory ? latestHistory.deploymentPlan : row.detailDeploymentPlan,
                collabNeeds: latestHistory ? latestHistory.collabNeeds : row.detailCollabNeeds,
                otherRequirements: latestHistory ? latestHistory.otherRequirements : row.detailOtherRequirements,
                painPoints: latestHistory ? latestHistory.painPoints : row.detailPainPoints,
                attitude: latestHistory ? latestHistory.attitude : row.detailAttitude,
              });
              let tempLabel = "Lạnh";
              let tempClass = "text-info bg-info-subtle border-info/20";
              if (stars === 5) {
                tempLabel = "Nóng";
                tempClass = "text-danger bg-danger-subtle border-danger/20";
              } else if (stars >= 3) {
                tempLabel = "Ấm";
                tempClass = "text-warning bg-warning-subtle border-warning/20";
              }
              return (
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge border rounded-pill ${tempClass}`} style={{ fontSize: "10.5px", padding: "4px 8px" }}>{tempLabel}</span>
                  <div className="d-flex text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i key={i} className={`bi ${i < stars ? "bi-star-fill" : "bi-star"} me-0.5`} style={{ fontSize: "12px" }} />
                    ))}
                  </div>
                </div>
              );
            },
            width: "20%",
          }
        ];
        break;
      case 3:
        baseColumns = [
          {
            header: "Khách hàng",
            render: (row) => (
              <div>
                <div className="fw-bold text-dark">{row.name}</div>
                <div className="text-muted" style={{ fontSize: "11px" }}>
                  {row.detailBusinessAddress?.trim() || row.area}
                </div>
              </div>
            ),
            width: "35%",
          },
          {
            header: "Loại báo giá",
            render: (row) => {
              if (!row.quoteId || !row.quoteType) return "";
              const badgeClass = row.quoteType === "Có quầy kệ" ? "bg-info text-dark" : "bg-dark text-white";
              return <span className={`badge ${badgeClass}`}>{row.quoteType}</span>;
            },
            width: "15%",
          },
          {
            header: "Giá trị dự kiến",
            render: (row) => row.quoteId && row.quoteValue ? <span className="fw-bold text-primary">{row.quoteValue.toLocaleString("vi-VN")} đ</span> : "",
            width: "18%",
          },
          {
            header: "Chiết khấu",
            render: (row) => row.quoteId && row.discountRate ? <span className="badge bg-success-subtle text-success fs-7 fw-bold">{row.discountRate}%</span> : "",
            width: "12%",
          },
          {
            header: "Trạng thái",
            render: (row) => {
              if (!row.quoteId || !row.quoteStatus) return "";
              const statusColors = { Draft: "bg-secondary text-white", Sent: "bg-warning text-dark", Approved: "bg-success text-white" };
              const statusLabels = { Draft: "Bản nháp", Sent: "Đã gửi khách", Approved: "Đã duyệt" };
              return <span className={`badge ${statusColors[row.quoteStatus] || "bg-secondary text-white"}`}>{statusLabels[row.quoteStatus] || row.quoteStatus}</span>;
            },
            width: "20%",
          }
        ];
        break;
      case 4:
        baseColumns = [
          {
            header: "Đại lý ký kết",
            render: (row) => (
              <div>
                <div className="fw-bold text-dark">{row.name}</div>
                <div className="text-muted" style={{ fontSize: "11px" }}>{row.area}</div>
              </div>
            ),
            width: "25%",
          },
          {
            header: "Số hợp đồng",
            render: (row) => (
              <div style={{ whiteSpace: "nowrap" }}>
                <div>
                  <code className="text-dark font-monospace fw-bold">{row.contractNo || "—"}</code>
                </div>
                <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                  Giá trị: <span className="fw-semibold text-primary">{row.contractValue ? `${row.contractValue.toLocaleString("vi-VN")} đ` : "—"}</span>
                </div>
              </div>
            ),
            width: "18%",
          },
          {
            header: "Hạn mức công nợ",
            render: (row) => <span className="fw-semibold text-danger">{row.creditLimit ? `${row.creditLimit.toLocaleString("vi-VN")} đ` : "—"}</span>,
            width: "18%",
          },
          {
            header: "Ngày ký kết",
            render: (row) => {
              const formattedDate = row.signDate ? row.signDate.split("-").reverse().join("/") : "—";
              return <span className="text-muted">{formattedDate}</span>;
            },
            width: "12%",
          },
          {
            header: "Trạng thái pháp lý",
            render: (row) => {
              const statusColors = { "Pending Signature": "bg-warning text-dark", Signed: "bg-info text-white", Active: "bg-success text-white" };
              const statusLabels = { "Pending Signature": "Chờ ký kết", Signed: "Đã ký", Active: "Đang hiệu lực" };
              return <span className={`badge ${statusColors[row.contractStatus || "Pending Signature"]}`}>{statusLabels[row.contractStatus || "Pending Signature"]}</span>;
            },
            width: "15%",
          }
        ];
        break;
      case 5:
        baseColumns = [
          {
            header: "Đại lý thi công",
            render: (row) => {
              // Parse all tasks
              const rawTasks = [
                { id: 1, label: "Đo đạc & Thiết kế 3D", dateStr: row.consTimeline1, color: "#3b82f6" }, // blue
                { id: 2, label: "Chuẩn bị nguyên vật liệu", dateStr: row.consTimeline2, color: "#8b5cf6" }, // purple
                { id: 3, label: "Thi công quầy kệ", dateStr: row.consTimeline3, color: "#f59e0b" }, // orange
                { id: 4, label: "Lắp sản phẩm trưng bày", dateStr: row.consTimeline4, color: "#06b6d4" }, // cyan
                { id: 5, label: "Bàn giao, nghiệm thu", dateStr: row.consTimeline5, color: "#10b981" } // emerald
              ];

              const parsedTasks = rawTasks
                .map(t => {
                  const range = parseDateRange(t.dateStr);
                  return range ? { ...t, ...range } : null;
                })
                .filter(Boolean) as any[];

              // If no tasks have timeframes, show a fallback layout
              if (parsedTasks.length === 0) {
                return (
                  <div className="py-2">
                    <div className="fw-extrabold text-dark mb-1" style={{ fontSize: "14px", color: "#003087" }}>
                      {row.name}
                    </div>
                    <div className="text-muted mb-2" style={{ fontSize: "11px" }}>
                      <i className="bi bi-geo-alt-fill text-secondary me-1" />
                      {row.area}
                    </div>
                    <div className="text-muted small-xs font-italic" style={{ fontSize: "11px" }}>
                      Chưa cập nhật mốc thời gian thi công
                    </div>
                  </div>
                );
              }

              // Find overall bounds
              const minTime = Math.min(...parsedTasks.map(t => t.start.getTime()));
              const maxTime = Math.max(...parsedTasks.map(t => t.end.getTime()));
              const totalRange = maxTime - minTime || 1; // avoid division by 0

              return (
                <div className="py-2">
                  <div className="fw-extrabold text-dark mb-1" style={{ fontSize: "14px", color: "#003087" }}>
                    {row.name}
                  </div>
                  <div className="text-muted mb-3" style={{ fontSize: "11px" }}>
                    <i className="bi bi-geo-alt-fill text-secondary me-1" />
                    {row.area}
                  </div>

                  {/* Biểu đồ Gantt mini */}
                  <div className="gantt-chart border rounded-3 p-3 shadow-sm" style={{ maxWidth: "480px", background: "#f8fafc" }}>
                    {/* Gantt Header */}
                    <div className="d-flex justify-content-between text-muted mb-2 border-bottom pb-1.5" style={{ fontSize: "10px", fontWeight: 600 }}>
                      <span>Bắt đầu: {parsedTasks.sort((a,b) => a.start.getTime() - b.start.getTime())[0].startStr}</span>
                      <span>Hạn hoàn thành: {parsedTasks.sort((a,b) => b.end.getTime() - a.end.getTime())[0].endStr}</span>
                    </div>

                    {/* Gantt Rows */}
                    <div className="d-flex flex-column gap-2">
                      {parsedTasks.map((task) => {
                        const leftPercent = ((task.start.getTime() - minTime) / totalRange) * 100;
                        const widthPercent = ((task.end.getTime() - task.start.getTime()) / totalRange) * 100;

                        return (
                          <div key={task.id} className="row align-items-center g-0">
                            {/* Task Label column */}
                            <div className="col-5 pe-2">
                              <div className="fw-semibold text-secondary text-truncate" style={{ fontSize: "10.5px" }} title={task.label}>
                                {task.label}
                              </div>
                              <div className="text-muted" style={{ fontSize: "9px" }}>
                                {task.startStr} - {task.endStr}
                              </div>
                            </div>
                            
                            {/* Gantt Bar representation */}
                            <div className="col-7 position-relative" style={{ height: "12px", background: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                              <div
                                className="position-absolute h-100 rounded-pill"
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${Math.max(widthPercent, 5)}%`,
                                  backgroundColor: task.color,
                                  opacity: 0.9,
                                  transition: "width 0.4s ease, left 0.4s ease"
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            },
            width: "50%",
          },
          {
            header: "Tiến độ lắp đặt",
            render: (row) => (
              <div style={{ width: "100%", maxWidth: 150 }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small-xs text-muted" style={{ fontSize: 10 }}>Hoàn thiện</span>
                  <span className="small-xs fw-bold text-primary" style={{ fontSize: 10 }}>{row.constructionProgress || 0}%</span>
                </div>
                <div className="progress" style={{ height: 6, borderRadius: 3 }}>
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                    style={{ width: `${row.constructionProgress || 0}%`, borderRadius: 3 }}
                  />
                </div>
              </div>
            ),
            width: "18%",
          },
          {
            header: "Ngày khai trương",
            render: (row) => {
              const formattedDate = row.estOpeningDate ? row.estOpeningDate.split("-").reverse().join("/") : "—";
              return (
                <span className="text-muted">
                  <i className="bi bi-calendar-check me-1" />
                  {formattedDate}
                </span>
              );
            },
            width: "17%",
          },
          {
            header: "Trạng thái",
            render: (row) => {
              const statusColors = { Pending: "bg-secondary text-white", "In Progress": "bg-primary text-white", Completed: "bg-success text-white" };
              const statusLabels = { Pending: "Chờ triển khai", "In Progress": "Đang lắp đặt", Completed: "Hoàn thành" };
              return <span className={`badge ${statusColors[row.constructionStatus || "Pending"]}`}>{statusLabels[row.constructionStatus || "Pending"]}</span>;
            },
            width: "15%",
          }
        ];
        break;
      case 6:
        baseColumns = [
          {
            header: "Khách hàng / Đại lý",
            render: (row) => (
              <div>
                <div className="fw-bold text-dark">{row.name}</div>
                <div className="text-muted" style={{ fontSize: "11px" }}>{row.area}</div>
              </div>
            ),
            width: "25%",
          },
          {
            header: "Người chăm sóc",
            render: (row) => {
              const caregiver = crmEmployees.find(emp => emp.fullName === row.careStaff);
              return (
                <div>
                  <span className="fw-semibold text-secondary">
                    <i className="bi bi-person-circle me-1" />
                    {row.careStaff || "Chưa phân công"}
                  </span>
                  {caregiver?.phone && (
                    <div className="text-muted small mt-0.5" style={{ fontSize: "11px" }}>
                      <i className="bi bi-telephone me-1" style={{ fontSize: "10px" }} />
                      {caregiver.phone}
                    </div>
                  )}
                </div>
              );
            },
            width: "25%",
          },
          {
            header: "Người liên hệ",
            render: (row) => {
              const parts = row.contact.split(" - ");
              const name = parts[0] || "";
              const phone = parts[1] || "";
              return (
                <div>
                  <div className="fw-semibold text-dark" style={{ fontSize: "13.5px", whiteSpace: "nowrap" }}>{name}</div>
                  <div className="text-muted d-flex align-items-center gap-2 mt-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                    {phone && (
                      <span className="d-inline-flex align-items-center" style={{ whiteSpace: "nowrap" }}>
                        <i className="bi bi-telephone text-muted me-1" style={{ fontSize: "11px" }} />
                        {phone}
                      </span>
                    )}
                  </div>
                </div>
              );
            },
            width: "25%",
          },
          {
            header: "Lý do / Nhu cầu",
            render: (row) => <span className="text-muted" style={{ fontSize: "12px" }}>{row.needs || "—"}</span>,
            width: "25%",
          }
        ];
        break;
      default:
        baseColumns = [];
    }
    const actionColumn: TableColumn<PartnerProcessItem> = {
      header: "",
      width: "50px",
      align: "center",
      render: (row) => {
        return (
          <div style={{ position: "relative", display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-sm text-muted p-1 border-0 bg-transparent shadow-none"
              onClick={(e) => {
                e.stopPropagation();
                if (activeDropdownRowId === row.id) {
                  setActiveDropdownRowId(null);
                  setDropdownCoords(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveDropdownRowId(row.id);
                  setDropdownCoords({
                    top: rect.bottom,
                    right: window.innerWidth - rect.right
                  });
                }
              }}
            >
              <i className="bi bi-three-dots-vertical" style={{ fontSize: 15 }} />
            </button>
            {activeDropdownRowId === row.id && (
              <>
                <div 
                  style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownRowId(null);
                    setDropdownCoords(null);
                  }}
                />
                <div 
                  style={{ 
                    position: "fixed", 
                    top: dropdownCoords ? dropdownCoords.top + 4 : 0, 
                    right: dropdownCoords ? dropdownCoords.right : 0, 
                    background: "#fff", 
                    border: "1px solid var(--border)", 
                    borderRadius: 6, 
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)", 
                    zIndex: 9999, 
                    minWidth: 160,
                    display: "flex",
                    flexDirection: "column",
                    padding: "4px 0"
                  }}
                >
                  <button 
                    className="dropdown-item px-3 py-2 text-start btn-sm"
                    style={{ background: "none", border: "none", fontSize: 13, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownRowId(null);
                      setDropdownCoords(null);
                      handleEditPartnerClick(row);
                    }}
                  >
                    <i className="bi bi-pencil" /> Sửa thông tin
                  </button>
                  <button 
                    className="dropdown-item px-3 py-2 text-start btn-sm"
                    style={{ background: "none", border: "none", fontSize: 13, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownRowId(null);
                      setDropdownCoords(null);
                      setSelectedPartner(row);
                      if (Number(row.step) === 3) {
                        handleAddNewNeg(row);
                      } else {
                        handleAddNewCare(row);
                      }
                    }}
                  >
                    <i className="bi bi-file-earmark-plus" /> Thêm nội dung chi tiết
                  </button>
                  <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                  <button 
                    className="dropdown-item px-3 py-2 text-start btn-sm text-danger"
                    style={{ background: "none", border: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownRowId(null);
                      setDropdownCoords(null);
                      setPartnerToDelete(row);
                      setConfirmDeletePartnerOpen(true);
                    }}
                  >
                    <i className="bi bi-trash" /> Xoá
                  </button>
                </div>
              </>
            )}
          </div>
        );
      }
    };

    return [checkboxColumn, ...baseColumns, actionColumn];
  }, [currentStep, filteredPartners, selectedIds, crmEmployees, activeDropdownRowId, dropdownCoords]);

  const BottomToolbarContent = useMemo(() => {
    if (selectedIds.size === 0) return null;

    const selectedPartners = partners.filter(p => selectedIds.has(p.id));
    const canAdvance = selectedPartners.some(p => p.step < 5);

    return (
      <div className="d-flex align-items-center justify-content-between w-100 px-3 py-1" style={{ minHeight: 40 }}>
        <div className="d-flex align-items-center gap-2">
          <span className="text-primary fw-bold" style={{ fontSize: 13 }}>
            Đã chọn {selectedIds.size} đại lý:
          </span>
          {currentStep === 6 ? (
            <button
              type="button"
              className="btn btn-danger btn-sm d-flex align-items-center gap-1 py-1.5 px-3 border-0 shadow-sm rounded-pill"
              onClick={handleBatchDeleteClick}
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              <i className="bi bi-trash-fill" /> Xoá dữ liệu
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-success btn-sm d-flex align-items-center gap-1 py-1.5 px-3 border-0 shadow-sm rounded-pill"
                onClick={handleBatchAdvanceStep}
                disabled={!canAdvance}
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                <i className="bi bi-chevron-double-right" /> Chuyển bước
              </button>
              {isSalesManager && (
                <button
                  type="button"
                  className="btn btn-warning btn-sm d-flex align-items-center gap-1 py-1.5 px-3 border-0 shadow-sm rounded-pill text-dark"
                  onClick={handleBatchSendReminder}
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  <i className="bi bi-bell-fill" /> Nhắc việc hàng loạt
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="btn btn-light btn-sm d-flex align-items-center gap-1 py-1.5 px-3 border shadow-sm rounded-pill text-muted"
            onClick={() => setSelectedIds(new Set())}
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            Bỏ chọn
          </button>
        </div>
        <div className="text-muted fw-semibold" style={{ fontSize: 12 }}>
          Tổng số: {filteredPartners.length} đại lý
        </div>
      </div>
    );
  }, [selectedIds, partners, filteredPartners, isSalesManager, crmEmployees, currentStep]);

  // Calculations for Cabinet & Initial Investment
  const cabinetAreaNum = parseFloat(careCabinetArea) || 0;
  const cabinetUnitPriceNum = parseFloat(careCabinetUnitPrice.replace(/\./g, "")) || 0;
  const cabinetBrandSupportRateNum = parseFloat(careCabinetBrandSupportRate) || 0;
  const cabinetOtherCostsNum = parseFloat(careCabinetOtherCosts.replace(/\./g, "")) || 0;

  const calculatedCabinetCost = cabinetAreaNum * cabinetUnitPriceNum;
  const calculatedBrandSupport = (cabinetAreaNum * cabinetUnitPriceNum * cabinetBrandSupportRateNum) / 100;
  const calculatedPartnerCost = calculatedCabinetCost - calculatedBrandSupport;
  const calculatedTotalInvestment = calculatedPartnerCost + cabinetOtherCostsNum;

  // Calculate stats for ticker
  const step1Count = partners.filter(p => p.step === 1).length;
  const step2Count = partners.filter(p => p.step === 2).length;
  const step3Count = partners.filter(p => p.step === 3).length;
  const step4Count = partners.filter(p => p.step === 4).length;
  const step5Count = partners.filter(p => p.step === 5).length;
  const totalCount = partners.length;

  const tickerNews = [
    { text: `• Tổng số đối tác đang tiếp cận: ${totalCount} (Thông tin: ${step1Count}, Chăm sóc: ${step2Count}, Báo giá: ${step3Count}, Hợp đồng: ${step4Count}, Thi công: ${step5Count})`, type: 'text' },
    { text: `• Bước 1 (Tiếp nhận): Có ${step1Count} đối tác mới cần sàng lọc.`, type: 'text' },
    { text: `• Bước 2 (Chăm sóc): Đang tư vấn cho ${step2Count} đối tác tiềm năng.`, type: 'text' },
    { text: `• Bước 3 (Báo giá): Đang đàm phán và báo giá với ${step3Count} đối tác.`, type: 'text' },
    { text: `• Bước 4 (Hợp đồng): Có ${step4Count} đối tác đang chờ ký kết hợp đồng.`, type: 'text' },
    { text: `• Bước 5 (Thi công): Có ${step5Count} đại lý đang triển khai thi công showroom.`, type: 'text' },
  ];

  return (
    <div className="d-flex flex-column h-100 partners-page" style={{ background: "var(--background)" }}>
      <style>{`
        .partners-page .workflow-card-stepper-container + div > div:first-child {
          margin-bottom: 6px !important;
          padding-top: 6px !important;
        }
      `}</style>
      <PageHeader
        title="Phát triển đại lý"
        description="Quản lý phễu phát triển và danh sách đại lý chính thức"
        icon="bi-person-badge"
        color="blue"
      />
      <DynamicTicker pageTitle="Phát triển đại lý" customNews={tickerNews} />
      <div className="flex-grow-1 px-3 px-md-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <WorkflowCard
          contentPadding="p-0"
          bottomToolbar={BottomToolbarContent}
          stepper={
            <ModernStepper
              steps={STEPS}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingX={0}
            />
          }
          toolbar={
            <div className="px-4 pt-0 pb-0 d-flex justify-content-between align-items-center flex-wrap gap-2 w-100">
              <div className="d-flex align-items-center gap-2">
                {/* Search */}
                <div className="position-relative" style={{ width: "280px" }}>
                  <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: "13px" }}></i>
                  <input
                    type="text"
                    className="form-control border-0 shadow-sm rounded-pill ps-5 pe-4"
                    style={{ height: 38, background: "var(--card)", fontSize: 13, border: "1px solid var(--border)" }}
                    placeholder="Tìm tên, mã, số liên hệ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Area Filter */}
                <select
                  className="form-select border-0 shadow-sm rounded-pill px-3"
                  style={{ width: "auto", minWidth: "160px", fontSize: 13, height: 38, background: "var(--card)", border: "1px solid var(--border)" }}
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                >
                  <option value="">Tất cả khu vực</option>
                  {areas.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Add Lead button - Only in Step 1 */}
              {Number(currentStep) === 1 && (
                <button
                  className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center gap-2"
                  style={{ height: 32, fontSize: 12, fontWeight: 600 }}
                  onClick={() => { setEditingPartner(null); setShowCreateModal(true); }}
                >
                  <i className="bi bi-plus-lg" style={{ fontSize: 11 }} />
                  <span>Thêm khách hàng</span>
                </button>
              )}
            </div>
          }
        >
          <div className="h-100 bg-white border-top overflow-auto d-flex flex-column" style={{ minHeight: 0 }}>
            {Number(currentStep) === 5 ? (
              <>
                {/* Month selectors container */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 20px", borderBottom: "1px solid var(--border, #e2e8f0)",
                  background: "#f8fafc", flexWrap: "wrap", flexShrink: 0
                }}>
                  {/* Year display */}
                  <div style={{
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    borderRadius: 8, padding: "5px 11px", flexShrink: 0,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <i className="bi bi-calendar3" style={{ fontSize: 11, color: "#fff" }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.03em" }}>
                      {new Date().getFullYear()}
                    </span>
                  </div>
                  
                  <div style={{ width: 1, height: 20, background: "#e2e8f0", flexShrink: 0 }} />

                  {/* Months pills */}
                  <div style={{
                    display: "flex", gap: 4, overflowX: "auto",
                    scrollbarWidth: "none", padding: "1px 0"
                  }}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                      const isActive = m === filterMonth;
                      const isCurrent = m === new Date().getMonth() + 1;
                      return (
                        <button
                          key={m}
                          onClick={() => setFilterMonth(m)}
                          style={{
                            flexShrink: 0,
                            padding: "4px 10px",
                            borderRadius: 7,
                            border: isActive
                              ? "1.5px solid #3b82f6"
                              : isCurrent
                                ? "1.5px dashed #93c5fd"
                                : "1.5px solid var(--border, #e2e8f0)",
                            cursor: "pointer",
                            background: isActive
                              ? "rgba(59, 130, 246, 0.08)"
                              : "#fff",
                            color: isActive ? "#3b82f6" : "var(--muted-foreground, #64748b)",
                            fontSize: 12,
                            fontWeight: isActive ? 700 : 500,
                            outline: "none",
                            transition: "all 0.15s ease"
                          }}
                        >
                          T{m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gantt Chart Wrapper */}
                <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                  <GanttChart
                    tasks={ganttTasksForStep5}
                    filterMonth={filterMonth}
                    onTaskClick={(task) => {
                      const partnerId = task.id.split("_")[0];
                      const partner = filteredPartners.find(p => p.id === partnerId);
                      if (partner) {
                        if (task.isHeader) {
                          setSelectedPartner(partner);
                        } else {
                          let dateStr = "";
                          if (task.id.endsWith("_1")) dateStr = partner.consTimeline1 || "";
                          else if (task.id.endsWith("_2")) dateStr = partner.consTimeline2 || "";
                          else if (task.id.endsWith("_3")) dateStr = partner.consTimeline3 || "";
                          else if (task.id.endsWith("_4")) dateStr = partner.consTimeline4 || "";
                          else if (task.id.endsWith("_5")) dateStr = partner.consTimeline5 || "";

                          setSelectedConstructionTask({
                            id: task.id,
                            title: task.title,
                            partnerName: partner.name,
                            timeline: dateStr,
                            status: task.status,
                            progress: task.progress,
                            assigneeName: partner.careStaff || "Chưa phân công",
                            partner: partner
                          });
                        }
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <Table
                rows={filteredPartners}
                columns={columns}
                compact={true}
                loading={loading}
                rowKey={(r) => r.id}
                onRowClick={(row) => setSelectedPartner(row)}
                emptyText={`Không có đại lý nào ở bước ${STEPS.find(s => s.num === Number(currentStep))?.title}`}
              />
            )}
          </div>
        </WorkflowCard>
      </div>

      {/* ── Slide-out Construction Task Details Offcanvas ── */}
      <AnimatePresence>
        {selectedConstructionTask && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedConstructionTask(null)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
                zIndex: 1050, backdropFilter: "blur(2px)"
              }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: 400, background: "var(--background)",
                zIndex: 1051, boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
                display: "flex", flexDirection: "column",
                borderLeft: "1px solid var(--border)"
              }}
            >
              {/* Header */}
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white shadow-sm">
                <div>
                  <div className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Chi tiết hạng mục thi công</div>
                  <h6 className="mb-0 fw-bold text-primary" style={{ fontSize: 15 }}>{selectedConstructionTask.title}</h6>
                </div>
                <button
                  className="btn btn-link text-muted p-1 m-0 border-0"
                  onClick={() => setSelectedConstructionTask(null)}
                >
                  <i className="bi bi-x-lg" style={{ fontSize: "16px" }} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-4 bg-light">
                {/* Task Card */}
                <div className="bg-white border rounded-3 p-3 shadow-sm d-flex flex-column gap-3">
                  {/* Title & Icon */}
                  <div className="d-flex align-items-center gap-3">
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: "rgba(59, 130, 246, 0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <i className="bi bi-tools text-primary" style={{ fontSize: 20 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground, #0f172a)" }}>
                        {selectedConstructionTask.title}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        Hạng mục thi công
                      </div>
                    </div>
                  </div>

                  <hr className="my-1 border-top" />

                  {/* Associated Partner */}
                  <div>
                    <label className="text-secondary small fw-semibold mb-1" style={{ fontSize: 10 }}>ĐẠI LÝ / KHÁCH HÀNG</label>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-shop text-primary" style={{ fontSize: 14 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{selectedConstructionTask.partnerName}</span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <label className="text-secondary small fw-semibold mb-1" style={{ fontSize: 10 }}>THỜI GIAN THỰC HIỆN</label>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-calendar-range text-muted" style={{ fontSize: 14 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                        {selectedConstructionTask.timeline || "Chưa xác định"}
                      </span>
                    </div>
                  </div>

                  {/* Status & Progress */}
                  <div>
                    <label className="text-secondary small fw-semibold mb-1" style={{ fontSize: 10 }}>TIẾN ĐỘ & TRẠNG THÁI BÁO CÁO</label>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="badge" style={{
                        background: tempProgress === 100 ? "rgba(16, 185, 129, 0.15)" : tempProgress > 0 ? "rgba(59, 130, 246, 0.15)" : "rgba(100, 116, 139, 0.15)",
                        color: tempProgress === 100 ? "#10b981" : tempProgress > 0 ? "#3b82f6" : "#64748b",
                        fontSize: 10, fontWeight: 700
                      }}>
                        {tempProgress === 100 ? "Hoàn thành" : tempProgress > 0 ? "Đang thực hiện" : "Chưa bắt đầu"}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary, #3b82f6)" }}>
                        {tempProgress}%
                      </span>
                    </div>
                    <div className="progress" style={{ height: 6, borderRadius: 3, marginBottom: 15 }}>
                      <div
                        className="progress-bar bg-primary"
                        style={{ width: `${tempProgress}%`, borderRadius: 3 }}
                      />
                    </div>

                    {/* Progress Slider & Report Button */}
                    <div className="bg-light border rounded-3 p-3 mt-2 shadow-sm">
                      <label className="form-label text-secondary fw-bold mb-2" style={{ fontSize: "10.5px" }}>CẬP NHẬT TIẾN ĐỘ THỰC TẾ:</label>
                      <div className="d-flex align-items-center gap-3">
                        <input
                          type="range"
                          className="form-range flex-grow-1"
                          min="0"
                          max="100"
                          step="10"
                          value={tempProgress}
                          onChange={(e) => setTempProgress(Number(e.target.value))}
                        />
                        <button
                          className="btn btn-primary btn-sm px-3 rounded-pill"
                          style={{ fontSize: 11, fontWeight: 700, flexShrink: 0 }}
                          onClick={handleSaveTaskProgress}
                          disabled={savingProgress}
                        >
                          {savingProgress ? "Đang lưu..." : "Báo cáo"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignee / Person in Charge Card */}
                <div className="bg-white border rounded-3 p-3 shadow-sm">
                  <label className="text-secondary small fw-semibold mb-3 d-block" style={{ fontSize: 10, letterSpacing: "0.05em" }}>NGƯỜI PHỤ TRÁCH THI CÔNG</label>
                  <div className="d-flex align-items-center gap-3">
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800
                    }}>
                      {selectedConstructionTask.assigneeName ? selectedConstructionTask.assigneeName.split(" ").slice(-1)[0][0].toUpperCase() : "?"}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                        {selectedConstructionTask.assigneeName}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        Nhân viên phụ trách
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3 border-top bg-white d-flex justify-content-between align-items-center gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3 flex-grow-1"
                  style={{ fontWeight: 600, fontSize: 12 }}
                  onClick={() => setSelectedConstructionTask(null)}
                >
                  Đóng
                </button>
                <button
                  className="btn btn-primary btn-sm rounded-pill px-3 flex-grow-1"
                  style={{ fontWeight: 600, fontSize: 12 }}
                  onClick={() => {
                    const p = selectedConstructionTask.partner;
                    setSelectedConstructionTask(null);
                    setTimeout(() => {
                      setSelectedPartner(p);
                    }, 100);
                  }}
                >
                  <i className="bi bi-folder2-open me-1" />
                  Xem hồ sơ đại lý
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Slide-out Details Offcanvas ── */}
      <AnimatePresence>
        {selectedPartner && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPartner(null)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
                zIndex: 1050, backdropFilter: "blur(2px)"
              }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: 400, background: "var(--background)",
                zIndex: 1051, boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
                display: "flex", flexDirection: "column",
                borderLeft: "1px solid var(--border)"
              }}
            >
              {/* Header */}
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white shadow-sm">
                <div>
                  <div className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Hồ sơ phát triển đại lý</div>
                  <h6 className="mb-0 fw-bold text-primary" style={{ fontSize: 16 }}>{selectedPartner.name}</h6>
                </div>
                <button
                  className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setSelectedPartner(null)}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              {/* Special Approval Request Alert */}
              {selectedPartner.detailSpecialRequestPending && (
                <div className="bg-warning-subtle text-warning-emphasis px-3 py-2 border-bottom d-flex align-items-center justify-content-between animate__animated animate__fadeIn" style={{ fontSize: 12 }}>
                  <span className="fw-semibold">
                    <i className="bi bi-shield-fill-exclamation me-2 text-warning" />
                    Đặc cách: Chờ Trưởng phòng phê duyệt chuyển bước
                  </span>
                  {isSalesManager && (
                    <span className="badge bg-warning text-dark fw-bold">Chờ duyệt</span>
                  )}
                </div>
              )}
              {selectedPartner.detailSpecialRequestStatus === "APPROVED" && (
                <div className="bg-success-subtle text-success px-3 py-2 border-bottom d-flex align-items-center justify-content-between animate__animated animate__fadeIn" style={{ fontSize: 12 }}>
                  <span className="fw-semibold text-success">
                    <i className="bi bi-shield-fill-check me-2 text-success" />
                    Đặc cách: Đã được Trưởng phòng phê duyệt chuyển bước
                  </span>
                  <span className="badge bg-success text-white fw-bold">Đã duyệt</span>
                </div>
              )}
              {selectedPartner.detailSpecialRequestStatus === "REJECTED" && (
                <div className="bg-danger-subtle text-danger px-3 py-2 border-bottom d-flex align-items-center justify-content-between animate__animated animate__fadeIn" style={{ fontSize: 12 }}>
                  <span className="fw-semibold text-danger">
                    <i className="bi bi-shield-fill-x me-2 text-danger" />
                    Đặc cách: Yêu cầu đặc cách bị Trưởng phòng từ chối
                  </span>
                  <span className="badge bg-danger text-white fw-bold">Từ chối</span>
                </div>
              )}

              {/* Scrollable Content */}
              <div className="flex-grow-1 overflow-y-auto p-4 bg-white custom-scrollbar">

                {/* General Info Section */}
                <div className="mb-4">
                  <div
                    className="cursor-pointer select-none border-bottom pb-2 mb-3"
                    onClick={() => setShowGeneralInfo(!showGeneralInfo)}
                  >
                    <SectionTitle
                      title="Thông tin tiếp nhận"
                      className="mb-0"
                      action={<i className={`bi bi-chevron-${showGeneralInfo ? 'up' : 'down'} text-muted`} />}
                    />
                  </div>

                  {showGeneralInfo ? (
                    <div className="row g-2">
                      <InfoField
                        label="Nguồn khách hàng"
                        value={SOURCE_MAP[selectedPartner.source] || selectedPartner.source}
                        icon="funnel"
                      />
                      <InfoField
                        label="Ngày tiếp nhận"
                        value={formatDisplayDateTime(selectedPartner.date)}
                        icon="calendar-event"
                      />
                      <InfoField
                        label="Khu vực địa lý"
                        value={selectedPartner.area}
                        icon="geo-alt"
                        className="col-12"
                      />
                      <InfoField
                        label="Người liên hệ"
                        value={(() => {
                          const parts = selectedPartner.contact.split(" - ");
                          return parts[0] || "";
                        })()}
                        icon="person"
                      />
                      <InfoField
                        label="Số điện thoại"
                        value={(() => {
                          const parts = selectedPartner.contact.split(" - ");
                          return parts[1] || null;
                        })()}
                        icon="telephone"
                      />
                      <InfoField
                        label="Email liên hệ"
                        value={selectedPartner.contactEmail}
                        icon="envelope"
                        className="col-12"
                      />
                    </div>
                  ) : null}
                </div>

                {/* Lịch sử chăm sóc / thương thảo */}
                <div className="mb-4">
                  <SectionTitle
                    title={Number(selectedPartner.step) === 3 ? "Lịch sử báo giá" : "Chăm sóc và Tư vấn"}
                    className="border-bottom pb-2 mb-3"
                    action={
                      <button
                        type="button"
                        className="btn btn-primary btn-sm px-2 py-0.5 d-flex align-items-center gap-1 rounded-2 shadow-sm fw-semibold"
                        style={{ fontSize: "11px" }}
                        onClick={() => Number(selectedPartner.step) === 3 ? handleAddNewNeg() : handleAddNewCare()}
                      >
                        <i className="bi bi-plus-lg" />
                        Thêm mới
                      </button>
                    }
                  />

                  <div className="position-relative ps-3 ms-2 py-1">
                    {(() => {
                      if (Number(selectedPartner.step) === 3) {
                        const negotiations = selectedPartner.quoteNegotiations || [];
                        const sortedNegotiations = [...negotiations].sort(
                          (a, b) => getSafeTimestamp(b.ngay) - getSafeTimestamp(a.ngay)
                        );

                        const transitionTime = selectedPartner.quoteCreatedAt
                          ? formatDisplayDateTime(selectedPartner.quoteCreatedAt)
                          : (selectedPartner.date ? formatDisplayDateTime(selectedPartner.date) : "Đang thực hiện");

                        return [
                          ...sortedNegotiations.map((neg) => {
                            const negTime = neg.ngay ? formatDisplayDateTime(neg.ngay) : "Đang thực hiện";
                            const approachStep =
                              neg.loai === "create" ? "Tạo mới báo giá" :
                                neg.loai === "update" ? "Cập nhật báo giá" :
                                  neg.loai === "won" ? "Báo giá thành công" :
                                    neg.loai === "call" ? "Điện thoại thương thảo" :
                                      neg.loai === "zalo" ? "Thương thảo qua Zalo" :
                                        neg.loai === "meet" ? "Gặp trực tiếp thương thảo" :
                                          neg.loai === "system" ? (
                                            neg.ketQua?.includes("Thành công") || neg.ketQua?.includes("thành công")
                                              ? "Báo giá thành công"
                                              : neg.ketQua?.includes("cập nhật") || neg.ketQua?.includes("Cập nhật")
                                                ? "Cập nhật báo giá"
                                                : "Tạo mới báo giá"
                                          ) :
                                            "Gặp trực tiếp thương thảo";
                            const isSystemLog =
                              neg.loai === "create" ||
                              neg.loai === "update" ||
                              neg.loai === "system" ||
                              neg.loai === "won";

                            return (
                              <div key={neg.id} className="position-relative mb-4">
                                <div
                                  className="position-absolute"
                                  style={{
                                    width: "2px",
                                    top: "9px",
                                    bottom: "-25px",
                                    left: "-17px",
                                    backgroundColor: "rgba(25,135,84,0.2)",
                                    zIndex: 0
                                  }}
                                />
                                <button
                                  type="button"
                                  className="position-absolute rounded-circle p-0 border-0"
                                  style={{
                                    width: 10,
                                    height: 10,
                                    left: -21,
                                    top: 4,
                                    border: "2px solid #fff",
                                    boxShadow: `0 0 0 2px ${isSystemLog ? "#6b7280" : "var(--success, #198754)"}`,
                                    backgroundColor: isSystemLog ? "#6b7280" : "var(--success, #198754)",
                                    zIndex: 1,
                                    cursor: isSystemLog ? "default" : "pointer"
                                  }}
                                  onClick={isSystemLog ? undefined : () => handleEditQuotationNegotiation(neg)}
                                  title={isSystemLog ? "Lịch sử hệ thống" : "Chỉnh sửa lịch sử thương thảo"}
                                />
                                <div className="small text-muted fw-semibold mb-1" style={{ fontSize: '11px' }}>
                                  <i className="bi bi-clock me-1" />
                                  {negTime}
                                </div>
                                <div className="d-flex align-items-center justify-content-between">
                                  <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                                    {approachStep}
                                  </div>
                                </div>
                                <div className="text-muted small mt-1" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>
                                  <div><strong>Kết quả:</strong> {neg.ketQua}</div>
                                  <div><strong>Người thực hiện:</strong> {neg.nguoiThucHien}</div>
                                </div>
                              </div>
                            );
                          }),
                          <div key="transition-to-quote" className="position-relative mb-1">
                            <div
                              className="position-absolute rounded-circle bg-success"
                              style={{
                                width: 10,
                                height: 10,
                                left: -21,
                                top: 4,
                                border: "2px solid #fff",
                                boxShadow: "0 0 0 2px var(--success, #198754)",
                                zIndex: 1
                              }}
                            />
                            <div className="small text-muted fw-semibold mb-1" style={{ fontSize: '11px' }}>
                              <i className="bi bi-clock me-1" />
                              {transitionTime}
                            </div>
                            <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                              Chuyển sang bước Báo giá
                            </div>
                            <div className="text-muted small mt-0.5" style={{ fontSize: '11.5px' }}>
                              Bắt đầu giai đoạn thương thảo & thỏa thuận.
                            </div>
                          </div>
                        ];
                      }

                      // Otherwise render standard Care Histories
                      const sortedHistories = selectedPartner.careHistories && selectedPartner.careHistories.length > 0
                        ? [...selectedPartner.careHistories].sort(
                          (a, b) => getSafeTimestamp(b.executionDate) - getSafeTimestamp(a.executionDate)
                        )
                        : [];

                      const historiesToRender = sortedHistories.length > 0
                        ? sortedHistories
                        : [{
                          id: "default",
                          partnerId: selectedPartner.id,
                          fullName: selectedPartner.detailFullName || selectedPartner.name || "",
                          role: selectedPartner.detailRole || "Ông chủ",
                          phone: selectedPartner.detailPhone || "",
                          email: selectedPartner.detailEmail || "",
                          companyName: selectedPartner.detailCompanyName || "",
                          businessAddress: selectedPartner.detailBusinessAddress || "",
                          businessType: selectedPartner.detailBusinessType || "",
                          premisesScale: selectedPartner.detailPremisesScale || "",
                          collabNeeds: selectedPartner.detailCollabNeeds || "",
                          currentBrands: selectedPartner.detailCurrentBrands || "",
                          deploymentPlan: selectedPartner.detailDeploymentPlan || "",
                          expectedInvestment: selectedPartner.detailExpectedInvestment || "",
                          investmentTimeframe: selectedPartner.detailInvestmentTimeframe || "",
                          approachStep: selectedPartner.detailApproachStep || "Chăm sóc & Phân loại",
                          attitude: selectedPartner.detailAttitude || "Bình thường",
                          interests: selectedPartner.detailInterests || "",
                          painPoints: selectedPartner.detailPainPoints || "",
                          premisesCondition: selectedPartner.detailPremisesCondition || "",
                          otherRequirements: selectedPartner.detailOtherRequirements || "",
                          executionDate: selectedPartner.detailExecutionDate || selectedPartner.lastCareDate || "",
                          executor: selectedPartner.careStaff || "Chưa phân công",
                        } as PartnerCareHistoryItem];

                      return [
                        ...historiesToRender.map((history, idx) => {
                          const isLastHistory = idx === historiesToRender.length - 1;
                          const careTime = history.executionDate
                            ? (history.id === "default" && !selectedPartner.detailExecutionDate && selectedPartner.lastCareDate
                              ? formatDisplayDate(selectedPartner.lastCareDate)
                              : formatDisplayDateTime(history.executionDate))
                            : "Đang thực hiện";

                          const approachStep = history.approachStep || "Chăm sóc & Phân loại";

                          return (
                            <div key={history.id} className="position-relative mb-4">
                              <div
                                className="position-absolute"
                                style={{
                                  width: "2px",
                                  top: "9px",
                                  bottom: isLastHistory ? "-33px" : "-25px",
                                  left: "-17px",
                                  backgroundColor: "rgba(0,123,255,0.2)",
                                  zIndex: 0
                                }}
                              />
                              <button
                                type="button"
                                className="position-absolute rounded-circle bg-primary p-0 border-0"
                                style={{
                                  width: 10,
                                  height: 10,
                                  left: -21,
                                  top: 4,
                                  border: "2px solid #fff",
                                  boxShadow: "0 0 0 2px var(--primary)",
                                  zIndex: 1,
                                  cursor: "pointer"
                                }}
                                onClick={() => handleEditCareHistory(history)}
                                title="Chỉnh sửa thông tin chăm sóc này"
                              />
                              <div className="small text-muted fw-semibold mb-1" style={{ fontSize: '11px' }}>
                                <i className="bi bi-clock me-1" />
                                {careTime}
                              </div>
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                                  {approachStep}
                                </div>
                                <div className="pe-1">
                                  {renderStars(calculateLeadStars(history))}
                                </div>
                              </div>
                              {(history.otherRequirements || history.executor || history.cabinetNotes) && (
                                <div className="text-muted small mt-1" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>
                                  {history.otherRequirements && (
                                    <div><strong>Kết quả tóm tắt:</strong> {history.otherRequirements}</div>
                                  )}
                                  {history.executor && (
                                    <div><strong>Người thực hiện:</strong> {history.executor}</div>
                                  )}

                                  {history.cabinetNotes && history.cabinetNotes.startsWith("[") && (
                                    <div className="mt-2 bg-light p-2.5 rounded-2 border border-light-subtle text-dark">
                                      <div className="fw-semibold text-secondary mb-1" style={{ fontSize: '11px' }}>
                                        Khái toán quầy kệ:
                                      </div>
                                      {(() => {
                                        try {
                                          const items = JSON.parse(history.cabinetNotes);
                                          if (Array.isArray(items) && items.length > 0) {
                                            return (
                                              <div className="d-flex flex-column gap-1">
                                                {items.map((item: any, itemIdx: number) => (
                                                  <div key={itemIdx} className="d-flex justify-content-between text-dark" style={{ fontSize: '11px', lineHeight: '1.3' }}>
                                                    <span style={{ maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                      • {item.name} {item.size ? `(${item.size} ${item.unit || "md"})` : `(${item.unit || "md"})`}
                                                    </span>
                                                    <span className="fw-bold">x{item.quantity}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          }
                                        } catch (e) { }
                                        return null;
                                      })()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }),
                        <div key="node-1-recv" className="position-relative mb-1">
                          <div
                            className="position-absolute rounded-circle bg-primary"
                            style={{ width: 10, height: 10, left: -21, top: 4, border: "2px solid #fff", boxShadow: "0 0 0 2px var(--primary)", zIndex: 1 }}
                          />
                          <div className="small text-muted fw-semibold mb-1" style={{ fontSize: '11px' }}>
                            <i className="bi bi-calendar-event me-1" />
                            {formatDisplayDateTime(selectedPartner.date)}
                          </div>
                          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>Tiếp nhận thông tin</div>
                          <div className="text-muted small mt-0.5" style={{ fontSize: '11.5px' }}>
                            Lead được phân bổ tự động qua kênh <strong>{SOURCE_MAP[selectedPartner.source] || selectedPartner.source}</strong>.
                          </div>
                        </div>
                      ];
                    })()}
                  </div>
                </div>


                {/* Step 4: Biên bản Section (ABOVE Contract Section) */}
                {selectedPartner.step >= 4 && (
                  <div className="mb-4 p-3 rounded-3 bg-light/50 border animate__animated animate__fadeIn">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
                      <span className="fw-bold text-dark">
                        <i className="bi bi-file-earmark-text-fill text-info me-2" />Ký biên bản
                      </span>
                      <button
                        type="button"
                        className="btn btn-xs btn-info text-white fw-bold rounded-2 px-2 py-0.5"
                        style={{ fontSize: "11px" }}
                        onClick={() => handleOpenKyBienBanModal(selectedPartner)}
                      >
                        <i className="bi bi-pencil-square me-1" />Ký biên bản
                      </button>
                    </div>

                    <div className="row g-2">
                      <InfoField
                        label="Số báo giá liên quan"
                        value={selectedPartner.bbQuoteCode ? <span className="font-monospace fw-bold">{selectedPartner.bbQuoteCode}</span> : null}
                        icon="file-earmark-text"
                        className="col-6"
                      />
                      <InfoField
                        label="Số biên bản"
                        value={selectedPartner.bbCode ? <span className="font-monospace fw-bold">{selectedPartner.bbCode}</span> : null}
                        icon="file-earmark-text"
                        className="col-6"
                      />
                      <InfoField
                        label="Ngày lập biên bản"
                        value={formatDisplayDate(selectedPartner.bbDate)}
                        icon="calendar-date"
                        className={selectedPartner.bbPdf ? "col-6" : "col-12"}
                      />
                      {selectedPartner.bbPdf && (
                        <InfoField
                          label="Tệp đính kèm"
                          value={
                            <a
                              href={selectedPartner.bbPdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary fw-semibold d-inline-flex align-items-center gap-1"
                              style={{ textDecoration: "none" }}
                            >
                              <i className="bi bi-file-earmark-pdf-fill text-danger" />
                              Xem biên bản
                            </a>
                          }
                          icon="paperclip"
                          className="col-6"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Contract Section (Renamed to Ký hợp đồng) */}
                {selectedPartner.step >= 4 && (
                  <div className="mb-4 p-3 rounded-3 bg-light/50 border animate__animated animate__fadeIn">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
                      <span className="fw-bold text-dark"><i className="bi bi-file-earmark-check-fill text-warning me-2" />Ký hợp đồng</span>
                      {selectedPartner.contractStatus === "Signed" || selectedPartner.contractStatus === "Active" ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-secondary text-white fw-bold rounded-2 px-2 py-0.5"
                          style={{ fontSize: "11px", cursor: "not-allowed", opacity: 0.7 }}
                          disabled
                        >
                          <i className="bi bi-lock-fill me-1" />Đã ký kết
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-xs btn-warning text-dark fw-bold rounded-2 px-2 py-0.5 animate__animated animate__pulse animate__infinite animate__slower"
                          style={{ fontSize: "11px" }}
                          onClick={() => handleOpenKyHopDongModal(selectedPartner)}
                        >
                          <i className="bi bi-pencil-square me-1" />Ký hợp đồng
                        </button>
                      )}
                    </div>

                    <div className="row g-2">
                      <InfoField
                        label="Số hợp đồng đại lý"
                        value={
                          selectedPartner.contractNo ? (
                            <span className="font-monospace fw-bold">{selectedPartner.contractNo}</span>
                          ) : null
                        }
                        icon="file-earmark-text"
                      />
                      <InfoField
                        label="Trạng thái ký kết"
                        value={renderContractStatus(selectedPartner.contractStatus)}
                        icon="patch-check"
                      />
                      <InfoField
                        label="Giá trị cam kết"
                        value={formatCurrency(selectedPartner.contractValue)}
                        icon="cash-stack"
                      />
                      <InfoField
                        label="Hạn mức công nợ"
                        value={
                          selectedPartner.creditLimit ? (
                            <span className="text-danger fw-bold">{formatCurrency(selectedPartner.creditLimit)}</span>
                          ) : null
                        }
                        icon="credit-card"
                      />
                      <InfoField
                        label="Ngày ký hợp đồng"
                        value={formatDisplayDate(selectedPartner.signDate)}
                        icon="calendar-date"
                        className={selectedPartner.contractPdf ? "col-6" : "col-12"}
                      />
                      {selectedPartner.contractPdf && (
                        <InfoField
                          label="Tệp đính kèm"
                          value={
                            <a
                              href={selectedPartner.contractPdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary fw-semibold d-inline-flex align-items-center gap-1"
                              style={{ textDecoration: "none" }}
                            >
                              <i className="bi bi-file-earmark-pdf-fill text-danger" />
                              Xem hợp đồng
                            </a>
                          }
                          icon="paperclip"
                          className="col-6"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Phụ lục Section (BELOW Contract Section) */}
                {selectedPartner.step >= 4 && (
                  <div className="mb-4 p-3 rounded-3 bg-light/50 border animate__animated animate__fadeIn">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
                      <span className="fw-bold text-dark">
                        <i className="bi bi-file-earmark-plus-fill text-danger me-2" />Ký phụ lục
                      </span>
                      <button
                        type="button"
                        className="btn btn-xs btn-primary text-white fw-bold rounded-2 px-2 py-0.5"
                        style={{ fontSize: "11px", backgroundColor: "#003087", borderColor: "#003087" }}
                        onClick={() => handleOpenKyPhuLucModal(selectedPartner)}
                      >
                        <i className="bi bi-pencil-square me-1" />Ký phụ lục
                      </button>
                    </div>

                    <div className="row g-2">
                      <InfoField
                        label="Số phụ lục"
                        value={
                          selectedPartner.plNo ? (
                            <span className="font-monospace fw-bold">{selectedPartner.plNo}/HĐĐL-SEAJONG</span>
                          ) : null
                        }
                        icon="file-earmark-text"
                      />
                      <InfoField
                        label="Ngày lập phụ lục"
                        value={formatDisplayDate(selectedPartner.plDate)}
                        icon="calendar-date"
                        className={selectedPartner.plPdf ? "col-6" : "col-12"}
                      />
                      <InfoField
                        label="Chi phí thi công (CPTC)"
                        value={selectedPartner.plCptc ? `${selectedPartner.plCptc} VNĐ` : null}
                        icon="cash-stack"
                      />
                      <InfoField
                        label="Doanh thu cam kết"
                        value={selectedPartner.plRevenueCommit ? `${selectedPartner.plRevenueCommit} VNĐ` : null}
                        icon="graph-up-arrow"
                      />
                      {selectedPartner.plPdf && (
                        <InfoField
                          label="Tệp đính kèm"
                          value={
                            <a
                              href={selectedPartner.plPdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary fw-semibold d-inline-flex align-items-center gap-1"
                              style={{ textDecoration: "none" }}
                            >
                              <i className="bi bi-file-earmark-pdf-fill text-danger" />
                              Xem phụ lục
                            </a>
                          }
                          icon="paperclip"
                          className="col-6"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Step 5: Construction Section */}
                {selectedPartner.step >= 5 && (
                  <div className="mb-4 p-3 rounded-3 bg-light/50 border">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
                      <span className="fw-bold text-dark"><i className="bi bi-tools text-primary me-2" />Thiết kế & Thi công</span>
                      <span className="badge bg-primary">Bước 5</span>
                    </div>

                    <div className="row g-2">
                      <InfoField
                        label="Diện tích Showroom"
                        value={selectedPartner.showroomArea ? `${selectedPartner.showroomArea} m²` : null}
                        icon="ruler"
                      />
                      <InfoField
                        label="Trạng thái chốt 3D"
                        value={renderDesignStatus(selectedPartner.designStatus)}
                        icon="box"
                      />
                      <InfoField
                        label="Tiến độ lắp đặt kệ"
                        value={
                          <div>
                            <div className="fw-bold text-primary mb-1">{selectedPartner.constructionProgress || 0}%</div>
                            <div className="progress" style={{ height: 6 }}>
                              <div
                                className="progress-bar bg-primary"
                                role="progressbar"
                                style={{ width: `${selectedPartner.constructionProgress || 0}%` }}
                              />
                            </div>
                          </div>
                        }
                        icon="activity"
                      />
                      <InfoField
                        label="Trạng thái thi công"
                        value={renderConstructionStatus(selectedPartner.constructionStatus)}
                        icon="cone-striped"
                      />
                      <InfoField
                        label="Ngày khai trương dự kiến"
                        value={formatDisplayDate(selectedPartner.estOpeningDate)}
                        icon="shop-window"
                        className="col-12"
                      />
                      {(selectedPartner.consTimeline1 || selectedPartner.consTimeline2 || selectedPartner.consTimeline3 || selectedPartner.consTimeline4 || selectedPartner.consTimeline5) && (
                        <div className="col-12 mt-3 pt-3 border-top">
                          <div className="fw-bold text-dark mb-2" style={{ fontSize: "12px" }}>
                            <i className="bi bi-calendar3 text-primary me-2" />
                            Mốc thời gian thi công
                          </div>
                          <div className="position-relative ps-3 ms-2 py-1">
                            {[
                              { label: "Đo đạc & Thiết kế 3D (Đợt 1)", date: selectedPartner.consTimeline1 },
                              { label: "Chuẩn bị nguyên vật liệu (Đợt 2)", date: selectedPartner.consTimeline2 },
                              { label: "Thi công, lắp đặt quầy kệ (Đợt 3)", date: selectedPartner.consTimeline3 },
                              { label: "Lắp sản phẩm trưng bày (Đợt 4)", date: selectedPartner.consTimeline4 },
                              { label: "Bàn giao, nghiệm thu (Đợt 5)", date: selectedPartner.consTimeline5 },
                            ].map((milestone, idx, arr) => (
                              <div key={idx} className="position-relative mb-2 pb-1">
                                {idx < arr.length - 1 && (
                                  <div
                                    className="position-absolute"
                                    style={{
                                      width: "2px",
                                      top: "16px",
                                      bottom: "-10px",
                                      left: "-17px",
                                      backgroundColor: "rgba(0,48,135,0.2)",
                                      zIndex: 0
                                    }}
                                  />
                                )}
                                <div
                                  className="position-absolute rounded-circle bg-primary"
                                  style={{
                                    width: 8,
                                    height: 8,
                                    left: -20,
                                    top: 5,
                                    border: "1px solid #fff",
                                    zIndex: 1
                                  }}
                                />
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-1">
                                  <span className="small fw-semibold text-secondary" style={{ fontSize: "11px" }}>{milestone.label}</span>
                                  <span className="small fw-bold text-dark" style={{ fontSize: "11px" }}>
                                    {milestone.date ? formatDisplayDate(milestone.date) : "—"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Actions */}
              <div className="p-3 border-top bg-white d-flex justify-content-between gap-2 shadow-lg animate__animated animate__slideInUp">
                {selectedPartner.step === 4 || selectedPartner.step === 5 ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center border"
                      style={{ fontSize: 13, fontWeight: 600, gap: "6px" }}
                      onClick={handleOpenBienBan}
                    >
                      <i className="bi bi-file-earmark-text" /> Biên bản
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary rounded-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center text-white"
                      style={{ fontSize: 13, fontWeight: 600, gap: "6px", backgroundColor: "#003087", borderColor: "#003087" }}
                      onClick={handleOpenHopDong}
                    >
                      <i className="bi bi-file-earmark-check" /> Hợp đồng
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center border"
                      style={{ fontSize: 13, fontWeight: 600, gap: "6px" }}
                      onClick={handleOpenPhuLuc}
                    >
                      <i className="bi bi-file-earmark-plus" /> Phụ lục
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger rounded-3 py-2 px-3 d-flex align-items-center justify-content-center border"
                      style={{ fontSize: 13, fontWeight: 600 }}
                      onClick={handleDeleteHopDongClick}
                      title="Xoá hợp đồng"
                    >
                      <i className="bi bi-trash-fill" />
                    </button>
                  </>
                ) : (
                  <>
                    {selectedPartner.step === 6 ? (
                      <button
                        className="btn btn-outline-success rounded-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                        style={{ fontSize: 13, fontWeight: 600 }}
                        onClick={() => handleRestorePartner(selectedPartner)}
                      >
                        <i className="bi bi-arrow-counterclockwise" /> Khôi phục đại lý
                      </button>
                    ) : isSalesManager ? (
                      <button
                        className="btn btn-warning rounded-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center gap-1 text-dark"
                        style={{ fontSize: 13, fontWeight: 600 }}
                        onClick={() => handleSendReminder(selectedPartner)}
                      >
                        <i className="bi bi-bell-fill" /> Nhắc việc
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-outline-danger rounded-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                          style={{ fontSize: 13, fontWeight: 600 }}
                          onClick={() => handleAbandonPartner(selectedPartner)}
                        >
                          <i className="bi bi-trash-fill" /> Từ bỏ
                        </button>
                        {selectedPartner.step === 2 && (
                          <button
                            className={`btn rounded-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center gap-1 ${isStep2TransitionAllowed(selectedPartner) || selectedPartner.detailSpecialRequestStatus === "APPROVED"
                              ? "btn-secondary text-white-50 opacity-75"
                              : selectedPartner.detailSpecialRequestPending
                                ? "btn-light border text-muted"
                                : "btn-info text-white"
                              }`}
                            style={{ fontSize: 13, fontWeight: 600, backgroundColor: (isStep2TransitionAllowed(selectedPartner) || selectedPartner.detailSpecialRequestStatus === "APPROVED") ? undefined : (selectedPartner.detailSpecialRequestPending ? undefined : "#6f42c1"), borderColor: (isStep2TransitionAllowed(selectedPartner) || selectedPartner.detailSpecialRequestStatus === "APPROVED") ? undefined : (selectedPartner.detailSpecialRequestPending ? undefined : "#6f42c1") }}
                            disabled={
                              isStep2TransitionAllowed(selectedPartner) ||
                              selectedPartner.detailSpecialRequestPending ||
                              selectedPartner.detailSpecialRequestStatus === "APPROVED"
                            }
                            onClick={() => {
                              setExceptionPartner(selectedPartner);
                              setExceptionReason("");
                              setShowExceptionModal(true);
                            }}
                            title={
                              isStep2TransitionAllowed(selectedPartner)
                                ? "Khách hàng đã đủ điều kiện chuyển bước, không cần xin đặc cách"
                                : selectedPartner.detailSpecialRequestStatus === "APPROVED"
                                  ? "Yêu cầu đặc cách đã được duyệt"
                                  : selectedPartner.detailSpecialRequestPending
                                    ? "Đã gửi yêu cầu đặc cách, đang chờ phê duyệt"
                                    : "Gửi yêu cầu đặc cách cho Trưởng phòng phê duyệt chuyển bước"
                            }
                          >
                            {selectedPartner.detailSpecialRequestStatus === "APPROVED" ? (
                              <>
                                <i className="bi bi-shield-fill-check me-1" /> Đã được duyệt
                              </>
                            ) : selectedPartner.detailSpecialRequestPending ? (
                              <>
                                <i className="bi bi-hourglass-split me-1" /> Đang chờ duyệt
                              </>
                            ) : (
                              <>
                                <i className="bi bi-shield-fill-exclamation me-1" /> Xin đặc cách
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                    {selectedPartner.step === 3 && (
                      selectedPartner.quoteId ? (
                        <button
                          type="button"
                          className="btn btn-success rounded-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center gap-1 text-white"
                          style={{ fontSize: 13, fontWeight: 600 }}
                          onClick={() => handleOpenEditQuotation(selectedPartner.quoteId!)}
                        >
                          <i className="bi bi-file-earmark-text" /> Mở báo giá
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-success rounded-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center gap-1 text-white animate__animated animate__pulse animate__infinite animate__slower"
                          style={{ fontSize: 13, fontWeight: 600 }}
                          onClick={() => setShowTaoBaoGiaModal(true)}
                        >
                          <i className="bi bi-file-earmark-plus" /> Tạo báo giá
                        </button>
                      )
                    )}
                  </>
                )}
                {selectedPartner.step !== 4 && (
                  <button
                    className={`btn rounded-3 py-2 flex-grow-1 ${isTransitionDisabled(selectedPartner)
                      ? "btn-secondary text-white-50 opacity-75"
                      : "btn-primary"
                      }`}
                    style={{ fontSize: 13, fontWeight: 600 }}
                    disabled={isTransitionDisabled(selectedPartner)}
                    onClick={() => handleAdvanceStep(selectedPartner)}
                    title={
                      selectedPartner.step === 2 && !isStep2TransitionAllowed(selectedPartner)
                        ? isSalesManager
                          ? selectedPartner.detailSpecialRequestPending
                            ? "Mở khoá đặc cách: Khách hàng chưa đạt 4-5 sao nhưng được phê duyệt bởi Trưởng phòng"
                            : "Yêu cầu điền đủ 8 thông tin bắt buộc và đạt 4-5 sao. Cần yêu cầu đặc cách để duyệt"
                          : selectedPartner.detailSpecialRequestStatus === "APPROVED"
                            ? "Đã có phê duyệt đặc cách từ Trưởng phòng. Có thể chuyển bước"
                            : "Yêu cầu điền đủ 8 thông tin bắt buộc và phân loại khách hàng phải đạt mức Nóng/Ấm (4-5 sao) để mở khoá chuyển bước"
                        : selectedPartner.step === 3 && !selectedPartner.quoteId
                          ? "Vui lòng tạo báo giá trước khi chuyển bước"
                          : ""
                    }
                  >
                    {selectedPartner.step === 2 && !isStep2TransitionAllowed(selectedPartner) ? (
                      <>
                        {selectedPartner.detailSpecialRequestStatus === "APPROVED" ? (
                          <>
                            Chuyển bước <i className="bi bi-chevron-right ms-1" />
                          </>
                        ) : isSalesManager && selectedPartner.detailSpecialRequestPending ? (
                          <>
                            <i className="bi bi-unlock-fill me-1" /> Duyệt đặc cách
                          </>
                        ) : (
                          <>
                            <i className="bi bi-lock-fill me-1" /> Chuyển bước
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        Chuyển bước <i className="bi bi-chevron-right ms-1" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Create New Lead Modal ── */}
      {/* ── Ky Hop Dong Modal ── */}
      {showKyHopDongModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)", zIndex: 3010 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: "16px" }}>Cập nhật Hợp đồng & Hạn mức</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowKyHopDongModal(false)}
                />
              </div>
              <div className="modal-body py-3">
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Số hợp đồng đại lý</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={khdContractNo}
                      onChange={(e) => setKhdContractNo(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Trạng thái ký kết</label>
                    <select
                      className="form-select rounded-3"
                      value={khdContractStatus}
                      onChange={(e) => setKhdContractStatus(e.target.value as any)}
                    >
                      <option value="Pending Signature">Chờ ký kết</option>
                      <option value="Signed">Đã ký</option>
                      <option value="Active">Có hiệu lực</option>
                    </select>
                  </div>

                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Giá trị cam kết (VNĐ)</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={khdContractValue ? new Intl.NumberFormat("vi-VN").format(khdContractValue) : ""}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\./g, "").replace(/,/g, "");
                        if (!clean || isNaN(clean as any)) {
                          setKhdContractValue(0);
                        } else {
                          setKhdContractValue(parseInt(clean));
                        }
                      }}
                      placeholder="Ví dụ: 150.000.000"
                    />
                    <div className="text-muted small mt-1" style={{ fontSize: "11px" }}>
                      {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(khdContractValue || 0)}
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Hạn mức công nợ (VNĐ)</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={khdCreditLimit ? new Intl.NumberFormat("vi-VN").format(khdCreditLimit) : ""}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\./g, "").replace(/,/g, "");
                        if (!clean || isNaN(clean as any)) {
                          setKhdCreditLimit(0);
                        } else {
                          setKhdCreditLimit(parseInt(clean));
                        }
                      }}
                      placeholder="Ví dụ: 50.000.000"
                    />
                    <div className="text-muted small mt-1" style={{ fontSize: "11px" }}>
                      {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(khdCreditLimit || 0)}
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Ngày ký hợp đồng</label>
                    <input
                      type="date"
                      className="form-control rounded-3"
                      value={khdSignDate}
                      onChange={(e) => setKhdSignDate(e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Bản scan/PDF hợp đồng</label>
                    <div className="rounded-3 p-3 text-center bg-light position-relative" style={{ border: "2px dashed #cbd5e1" }}>
                      {uploadingPdf ? (
                        <div className="py-2">
                          <span className="spinner-border spinner-border-sm text-primary me-2" role="status" aria-hidden="true" />
                          <span className="text-secondary small">Đang tải file lên...</span>
                        </div>
                      ) : khdContractPdf ? (
                        <div className="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                          <span className="text-success small fw-medium text-truncate me-2">
                            <i className="bi bi-file-earmark-pdf-fill text-danger me-1.5" />
                            {khdContractPdf.split("/").pop()}
                          </span>
                          <div className="d-flex gap-2">
                            <a href={khdContractPdf} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary py-0.5 px-2" style={{ fontSize: 11 }}>
                              Xem tệp
                            </a>
                            <button type="button" className="btn btn-sm btn-outline-danger py-0.5 px-2" style={{ fontSize: 11 }} onClick={() => setKhdContractPdf("")}>
                              Xóa
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <i className="bi bi-cloud-arrow-up text-secondary fs-3 mb-2 d-block" />
                          <label className="btn btn-sm btn-outline-secondary px-3 cursor-pointer" style={{ fontSize: 12 }}>
                            Chọn file PDF
                            <input
                              type="file"
                              accept="application/pdf"
                              className="d-none"
                              onChange={handleKhdPdfUpload}
                            />
                          </label>
                          <span className="text-muted d-block small mt-1" style={{ fontSize: 11 }}>Hỗ trợ định dạng PDF tối đa 10MB</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top-0 pt-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-3 px-4 py-2"
                  style={{ fontSize: 13, fontWeight: 600 }}
                  onClick={() => setShowKyHopDongModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-warning rounded-3 px-4 py-2 text-dark"
                  style={{ fontSize: 13, fontWeight: 600 }}
                  disabled={savingKyHopDong || uploadingPdf}
                  onClick={handleSaveKyHopDong}
                >
                  {savingKyHopDong ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1.5" role="status" aria-hidden="true" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu thông tin"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ky Bien Ban Modal ── */}
      {showKyBienBanModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)", zIndex: 3010 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: "16px" }}>Cập nhật Biên bản thỏa thuận</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowKyBienBanModal(false)}
                />
              </div>
              <div className="modal-body py-3">
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Số báo giá liên quan</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="VD: BG-2026-001"
                      value={kbbQuoteCode}
                      onChange={(e) => setKbbQuoteCode(e.target.value)}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Số biên bản</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="VD: BBTT-2026-001"
                      value={kbbCode}
                      onChange={(e) => setKbbCode(e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Ngày lập biên bản</label>
                    <input
                      type="date"
                      className="form-control rounded-3"
                      value={kbbDate}
                      onChange={(e) => setKbbDate(e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Bản scan/PDF biên bản (bản cứng)</label>
                    <div className="rounded-3 p-3 text-center bg-light position-relative" style={{ border: "2px dashed #cbd5e1" }}>
                      {uploadingPdfBB ? (
                        <div className="py-2">
                          <span className="spinner-border spinner-border-sm text-primary me-2" role="status" aria-hidden="true" />
                          <span className="text-secondary small">Đang tải file lên...</span>
                        </div>
                      ) : kbbPdf ? (
                        <div className="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                          <span className="text-success small fw-medium text-truncate me-2">
                            <i className="bi bi-file-earmark-pdf-fill text-danger me-1.5" />
                            {kbbPdf.split("/").pop()}
                          </span>
                          <div className="d-flex gap-2">
                            <a href={kbbPdf} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary py-0.5 px-2" style={{ fontSize: 11 }}>
                              Xem tệp
                            </a>
                            <button type="button" className="btn btn-sm btn-outline-danger py-0.5 px-2" style={{ fontSize: 11 }} onClick={() => setKbbPdf("")}>
                              Xóa
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <i className="bi bi-cloud-arrow-up text-secondary fs-3 mb-2 d-block" />
                          <label className="btn btn-sm btn-outline-secondary px-3 cursor-pointer" style={{ fontSize: 12 }}>
                            Chọn file PDF
                            <input
                              type="file"
                              accept="application/pdf"
                              className="d-none"
                              onChange={handleKbbPdfUpload}
                            />
                          </label>
                          <span className="text-muted d-block small mt-1" style={{ fontSize: 11 }}>Hỗ trợ định dạng PDF tối đa 10MB</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top-0 pt-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-3 px-4 py-2"
                  style={{ fontSize: 13, fontWeight: 600 }}
                  onClick={() => setShowKyBienBanModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-info rounded-3 px-4 py-2 text-white"
                  style={{ fontSize: 13, fontWeight: 600 }}
                  disabled={savingKyBienBan || uploadingPdfBB}
                  onClick={handleSaveKyBienBan}
                >
                  {savingKyBienBan ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1.5" role="status" aria-hidden="true" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu thông tin"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ky Phu Luc Modal ── */}
      {showKyPhuLucModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)", zIndex: 3010 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: "16px" }}>Cập nhật thông tin Phụ lục</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowKyPhuLucModal(false)}
                />
              </div>
              <div className="modal-body py-3">
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Số phụ lục hợp đồng</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control rounded-start-3"
                        placeholder="VD: 01"
                        value={kplNo}
                        onChange={(e) => setKplNo(e.target.value)}
                      />
                      <span className="input-group-text bg-light text-secondary rounded-end-3" style={{ fontSize: 13 }}>/HĐĐL-SEAJONG</span>
                    </div>
                  </div>

                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Ngày lập phụ lục</label>
                    <input
                      type="date"
                      className="form-control rounded-3"
                      value={kplDate}
                      onChange={(e) => setKplDate(e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Địa điểm lập phụ lục</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="VD: Văn phòng Công ty..."
                      value={kplAddress}
                      onChange={(e) => setKplAddress(e.target.value)}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Chi phí thi công (CPTC)</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="VD: 16.100.000"
                      value={kplCptc}
                      onChange={(e) => handleCurrencyChange(e.target.value, setKplCptc)}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>CPTC bằng chữ</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="VD: Mười sáu triệu một trăm nghìn đồng"
                      value={kplCptcText}
                      onChange={(e) => setKplCptcText(e.target.value)}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Doanh thu cam kết</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="VD: 100.000.000"
                      value={kplRevenueCommit}
                      onChange={(e) => handleCurrencyChange(e.target.value, setKplRevenueCommit)}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Doanh thu cam kết bằng chữ</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="VD: Một trăm triệu đồng"
                      value={kplRevenueCommitText}
                      onChange={(e) => setKplRevenueCommitText(e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>Bản scan/PDF phụ lục (bản cứng)</label>
                    <div className="rounded-3 p-3 text-center bg-light position-relative" style={{ border: "2px dashed #cbd5e1" }}>
                      {uploadingPdfPL ? (
                        <div className="py-2">
                          <span className="spinner-border spinner-border-sm text-primary me-2" role="status" aria-hidden="true" />
                          <span className="text-secondary small">Đang tải file lên...</span>
                        </div>
                      ) : kplPdf ? (
                        <div className="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                          <span className="text-success small fw-medium text-truncate me-2">
                            <i className="bi bi-file-earmark-pdf-fill text-danger me-1.5" />
                            {kplPdf.split("/").pop()}
                          </span>
                          <div className="d-flex gap-2">
                            <a href={kplPdf} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary py-0.5 px-2" style={{ fontSize: 11 }}>
                              Xem tệp
                            </a>
                            <button type="button" className="btn btn-sm btn-outline-danger py-0.5 px-2" style={{ fontSize: 11 }} onClick={() => setKplPdf("")}>
                              Xóa
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <i className="bi bi-cloud-arrow-up text-secondary fs-3 mb-2 d-block" />
                          <label className="btn btn-sm btn-outline-secondary px-3 cursor-pointer" style={{ fontSize: 12 }}>
                            Chọn file PDF
                            <input
                              type="file"
                              accept="application/pdf"
                              className="d-none"
                              onChange={handleKplPdfUpload}
                            />
                          </label>
                          <span className="text-muted d-block small mt-1" style={{ fontSize: 11 }}>Hỗ trợ định dạng PDF tối đa 10MB</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top-0 pt-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-3 px-4 py-2"
                  style={{ fontSize: 13, fontWeight: 600 }}
                  onClick={() => setShowKyPhuLucModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary rounded-3 px-4 py-2 text-white"
                  style={{ fontSize: 13, fontWeight: 600, backgroundColor: "#dc3545", borderColor: "#dc3545" }}
                  disabled={savingKyPhuLuc || uploadingPdfPL}
                  onClick={handleSaveKyPhuLuc}
                >
                  {savingKyPhuLuc ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1.5" role="status" aria-hidden="true" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu thông tin"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.3)",
              backdropFilter: "blur(4px)",
              zIndex: 2500,
            }}
            onClick={handleCloseCreateModal}
          />

          {/* Offcanvas Drawer */}
          <div
            className="d-flex flex-column bg-white shadow-lg border-start animate__animated animate__slideInRight animate__faster"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "400px",
              zIndex: 2600,
            }}
          >
            {/* Header */}
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light">
              <span className="fw-bold text-dark" style={{ fontSize: "14px" }}>
                {editingPartner ? "Sửa thông tin khách hàng" : "Thêm khách hàng mới"}
              </span>
              <button
                type="button"
                className="btn-close"
                style={{ fontSize: "12px" }}
                onClick={handleCloseCreateModal}
              />
            </div>

            {/* Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (editingPartner) {
                  handleSaveEditPartner();
                } else {
                  handleCreatePartner(e);
                }
              }} 
              className="d-flex flex-column flex-grow-1 overflow-hidden"
            >
              {/* Body */}
              <div className="flex-grow-1 overflow-y-auto p-3 d-flex flex-column" style={{ fontSize: "13px" }}>
                <div className="d-flex flex-column gap-3 flex-grow-1">
                  <div>
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                      Tên đại lý/showroom
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{ fontSize: "13px" }}
                    />
                  </div>

                  <div className="d-flex gap-2">
                    <div className="flex-grow-1" style={{ width: "50%" }}>
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Khu vực <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select rounded-3"
                        required
                        value={newArea}
                        onChange={(e) => setNewArea(e.target.value)}
                        style={{ fontSize: "13px" }}
                      >
                        <option value="">Chọn...</option>
                        <option value="Miền Bắc">Miền Bắc</option>
                        <option value="Miền Trung">Miền Trung</option>
                        <option value="Miền Nam">Miền Nam</option>
                      </select>
                    </div>

                    <div className="flex-grow-1" style={{ width: "50%" }}>
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Nguồn
                      </label>
                      <select
                        className="form-select rounded-3"
                        value={newSource}
                        onChange={(e) => setNewSource(e.target.value)}
                        style={{ fontSize: "13px" }}
                      >
                        <option value="Website">Website</option>
                        <option value="Facebook Ads">Facebook Ads</option>
                        <option value="Google Ads">Google Ads</option>
                        <option value="Triển lãm">Triển lãm</option>
                        <option value="Hotline">Hotline</option>
                        <option value="Zalo">Zalo</option>
                        <option value="Kinh doanh tự khai thác">Tự khai thác</option>
                      </select>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <div className="flex-grow-1" style={{ width: "60%" }}>
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Người liên hệ <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        required
                        value={newContact}
                        onChange={(e) => setNewContact(e.target.value)}
                        style={{ fontSize: "13px" }}
                      />
                    </div>

                    <div className="flex-grow-1" style={{ width: "40%" }}>
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Vai trò
                      </label>
                      <select
                        className="form-select rounded-3"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        style={{ fontSize: "13px" }}
                      >
                        <option value="Ông chủ">Ông chủ</option>
                        <option value="Bà chủ">Bà chủ</option>
                        <option value="Quản lý">Quản lý</option>
                        <option value="Nhân viên">Nhân viên</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <div className="flex-grow-1" style={{ width: "60%" }}>
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Email liên hệ (nếu có)
                      </label>
                      <input
                        type="email"
                        className="form-control rounded-3"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        style={{ fontSize: "13px" }}
                      />
                    </div>

                    <div className="flex-grow-1" style={{ width: "40%" }}>
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        className="form-control rounded-3"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        style={{ fontSize: "13px" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                      Quy mô dự kiến
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={newScale}
                      onChange={(e) => setNewScale(e.target.value)}
                      style={{ fontSize: "13px" }}
                    />
                  </div>

                  <div className="d-flex flex-column flex-grow-1">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                      Mô tả nhu cầu cụ thể
                    </label>
                    <textarea
                      className="form-control rounded-3 flex-grow-1"
                      value={newNeeds}
                      onChange={(e) => setNewNeeds(e.target.value)}
                      style={{ fontSize: "13px", resize: "none", minHeight: "100px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-top d-flex gap-2 bg-light">
                <button
                  type="button"
                  className="btn btn-light rounded-3 flex-grow-1"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                  onClick={handleCloseCreateModal}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary rounded-3 flex-grow-1 text-white"
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    backgroundColor: "#0d6efd",
                    borderColor: "#0d6efd",
                    backgroundImage: "none"
                  }}
                >
                  {editingPartner ? "Lưu thay đổi" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
      {/* ── Care Details Modal ── */}
      {showCareModal && selectedPartner && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(15, 23, 42, 0.4)", zIndex: 1060, backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-fullscreen">
            <div className="modal-content border-0 h-100 d-flex flex-column bg-white">
              {/* Modal Header */}
              <div
                className="modal-header border-bottom-0 pb-2 pt-3 px-4 d-flex align-items-center justify-content-between flex-shrink-0"
                style={{ background: "linear-gradient(180deg, rgba(59, 130, 246, 0.06) 0%, transparent 100%)" }}
              >
                <div>
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: "17px" }}>
                    Cập nhật thông tin chăm sóc chi tiết
                  </h5>
                  <p className="text-muted small mb-0 mt-0.5" style={{ fontSize: "13px" }}>
                    Vui lòng hoàn thành các thông tin khảo sát để cập nhật hồ sơ phát triển đại lý
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none border-0"
                  onClick={() => setShowCareModal(false)}
                />
              </div>

              <form onSubmit={handleSaveCareDetails} className="d-flex flex-column flex-grow-1 overflow-hidden">
                {/* Responsive stylesheet for the care details modal */}
                <style>{`
                  @media (max-width: 991.98px) {
                    .care-left-col {
                      border-right: none !important;
                    }
                  }
                `}</style>
                {/* Tab Switcher for iPad & Mobile */}
                <div className="d-lg-none bg-light p-2 border-bottom flex-shrink-0">
                  <div className="nav nav-pills nav-fill bg-white p-1 rounded-3 border">
                    <button
                      type="button"
                      className={`nav-link border-0 py-2 fw-semibold transition-all ${activeCareModalTab === 'info'
                          ? 'active bg-primary text-white shadow-sm'
                          : 'text-secondary bg-transparent'
                        }`}
                      style={{ fontSize: '13.5px', borderRadius: '8px' }}
                      onClick={() => setActiveCareModalTab('info')}
                    >
                      <i className="bi bi-shop me-2" />
                      Thông tin cửa hàng
                    </button>
                    <button
                      type="button"
                      className={`nav-link border-0 py-2 fw-semibold transition-all ${activeCareModalTab === 'finance'
                          ? 'active bg-primary text-white shadow-sm'
                          : 'text-secondary bg-transparent'
                        }`}
                      style={{ fontSize: '13.5px', borderRadius: '8px' }}
                      onClick={() => setActiveCareModalTab('finance')}
                    >
                      <i className="bi bi-calculator me-2" />
                      Khái toán chi phí
                    </button>
                  </div>
                </div>
                {/* Modal Body */}
                <div className="modal-body p-0 flex-grow-1 overflow-hidden care-modal-body" style={{ background: "#f8fafc" }}>
                  <div className="row g-0 h-100 care-modal-row">
                    {/* Cột trái: Thông tin hiện có (Tỷ lệ 4) */}
                    <div className={`col-lg-4 border-end bg-white h-100 overflow-y-auto custom-scrollbar care-left-col ${activeCareModalTab === 'info' ? 'd-block' : 'd-none d-lg-block'
                      }`}>

                      {/* Card 1: Thông tin đại lý & Người liên hệ */}
                      <div className="card border-0 shadow-none mb-0 rounded-0 overflow-hidden">
                        <div className="card-header bg-white border-bottom-0 pt-3 pb-1 px-4">
                          <SectionTitle
                            title="THÔNG TIN LIÊN HỆ & CỬA HÀNG"
                            className="mb-0"
                          />
                        </div>
                        <div className="card-body px-4 pt-1 pb-3 bg-white">
                          <div className="row g-2">
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Họ và tên <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #3b82f6", fontSize: "14px" }}
                                required
                                placeholder="Nhập họ và tên..."
                                value={careFullName}
                                onChange={(e) => setCareFullName(e.target.value)}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Vai trò
                              </label>
                              <select
                                className="form-select rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #3b82f6", fontSize: "14px" }}
                                value={careRole}
                                onChange={(e) => setCareRole(e.target.value)}
                              >
                                <option value="Ông chủ">Ông chủ</option>
                                <option value="Bà chủ">Bà chủ</option>
                                <option value="Quản lý">Quản lý</option>
                                <option value="Nhân viên">Nhân viên</option>
                                <option value="Khác">Khác</option>
                              </select>
                            </div>
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Số điện thoại <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #3b82f6", fontSize: "14px" }}
                                required
                                placeholder="Nhập số điện thoại..."
                                value={carePhone}
                                onChange={(e) => setCarePhone(e.target.value)}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Email
                              </label>
                              <input
                                type="email"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #cbd5e1", fontSize: "14px" }}
                                placeholder="Nhập email..."
                                value={careEmail}
                                onChange={(e) => setCareEmail(e.target.value)}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Tên cửa hàng / Công ty <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #3b82f6", fontSize: "14px" }}
                                required
                                placeholder="Nhập tên đại lý, cửa hàng hoặc công ty..."
                                value={careCompanyName}
                                onChange={(e) => setCareCompanyName(e.target.value)}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Địa chỉ kinh doanh <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #3b82f6", fontSize: "14px" }}
                                required
                                placeholder="Nhập địa chỉ..."
                                value={careBusinessAddress}
                                onChange={(e) => setCareBusinessAddress(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Loại hình & Quy mô */}
                      <div className="card border-0 shadow-none mb-0 rounded-0 overflow-hidden">
                        <div className="card-header bg-white border-bottom-0 pt-3 pb-1 px-4">
                          <SectionTitle
                            title="MÔ HÌNH HOẠT ĐỘNG & QUY MÔ"
                            className="mb-0"
                          />
                        </div>
                        <div className="card-body px-4 pt-1 pb-3 bg-white">
                          <div className="row g-2">
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Loại hình kinh doanh <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #3b82f6", fontSize: "14px" }}
                                required
                                placeholder="VD: Cửa hàng bán lẻ, Đại lý cấp 1, Showroom..."
                                value={careBusinessType}
                                onChange={(e) => setCareBusinessType(e.target.value)}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Quy mô mặt bằng <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #198754", fontSize: "14px" }}
                                required
                                placeholder="VD: 150m2 (mặt tiền 8m, sâu 18m)..."
                                value={carePremisesScale}
                                onChange={(e) => setCarePremisesScale(e.target.value)}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Mức đầu tư dự kiến
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #cbd5e1", fontSize: "14px" }}
                                placeholder="VD: 200 - 300 triệu..."
                                value={careExpectedInvestment}
                                onChange={(e) => setCareExpectedInvestment(formatInvestmentInput(e.target.value))}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Thời gian đầu tư
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #cbd5e1", fontSize: "14px" }}
                                placeholder="VD: Q3/2026, 1 tháng..."
                                value={careInvestmentTimeframe}
                                onChange={(e) => setCareInvestmentTimeframe(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Nhu cầu & Kế hoạch hợp tác */}
                      <div className="card border-0 shadow-none mb-0 rounded-0 overflow-hidden">
                        <div className="card-header bg-white border-bottom-0 pt-3 pb-1 px-4">
                          <SectionTitle
                            title="NHU CẦU & KẾ HOẠCH HỢP TÁC CHI TIẾT"
                            className="mb-0"
                          />
                        </div>
                        <div className="card-body px-4 pt-1 pb-3 bg-white">
                          <div className="row g-2">
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Nhu cầu hợp tác cụ thể <span className="text-danger">*</span>
                              </label>
                              <textarea
                                className="form-control rounded-2 border-light-subtle shadow-none py-2 px-3"
                                style={{ borderLeft: "3px solid #0dcaf0", fontSize: "14px" }}
                                rows={2}
                                required
                                placeholder="Mô tả cụ thể mong muốn hợp tác (chính sách, danh mục sản phẩm, trưng bày kệ mẫu...)"
                                value={careCollabNeeds}
                                onChange={(e) => setCareCollabNeeds(e.target.value)}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Sản phẩm / Thương hiệu đang kinh doanh
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #cbd5e1", fontSize: "14px" }}
                                placeholder="VD: Đang phân phối Toto, Viglacera, gạch Prime..."
                                value={careCurrentBrands}
                                onChange={(e) => setCareCurrentBrands(e.target.value)}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Kế hoạch triển khai dự kiến <span className="text-danger">*</span>
                              </label>
                              <textarea
                                className="form-control rounded-2 border-light-subtle shadow-none py-2 px-3"
                                style={{ borderLeft: "3px solid #0dcaf0", fontSize: "14px" }}
                                rows={2}
                                required
                                placeholder="Lộ trình cụ thể (ngày chốt thiết kế showroom, ngày nhập hàng khai trương, v.v.)"
                                value={careDeploymentPlan}
                                onChange={(e) => setCareDeploymentPlan(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Thông tin bổ sung */}
                      <div className="card border-0 shadow-none mb-0 rounded-0 overflow-hidden">
                        <div className="card-header bg-white border-bottom-0 pt-3 pb-1 px-4">
                          <SectionTitle
                            title="THÔNG TIN BỔ SUNG"
                            className="mb-0"
                          />
                        </div>
                        <div className="card-body px-4 pt-1 pb-3 bg-white">
                          <div className="row g-2">
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Bước tiếp cận
                              </label>
                              <select
                                className="form-select rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #ffc107", fontSize: "14px" }}
                                value={careApproachStep}
                                onChange={(e) => setCareApproachStep(e.target.value)}
                              >
                                <option value="Tiếp cận">Tiếp cận</option>
                                <option value="Giới thiệu chính sách">Giới thiệu chính sách</option>
                              </select>
                            </div>
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Thái độ
                              </label>
                              <select
                                className="form-select rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #ffc107", fontSize: "14px" }}
                                value={careAttitude}
                                onChange={(e) => setCareAttitude(e.target.value)}
                              >
                                <option value="Rất hợp tác">Rất hợp tác</option>
                                <option value="Bình thường">Bình thường</option>
                                <option value="Tiêu cực">Tiêu cực</option>
                              </select>
                            </div>
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Ngày thực hiện <span className="text-danger">*</span>
                              </label>
                              <input
                                type="datetime-local"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #ffc107", fontSize: "14px" }}
                                required
                                value={careExecutionDate}
                                onChange={(e) => setCareExecutionDate(e.target.value)}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Người thực hiện
                              </label>
                              <select
                                className="form-select rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #cbd5e1", fontSize: "14px" }}
                                value={careExecutor}
                                onChange={(e) => setCareExecutor(e.target.value)}
                              >
                                <option value="" disabled>-- Chọn --</option>
                                {crmEmployees.map(emp => (
                                  <option key={emp.id} value={emp.fullName}>
                                    {emp.fullName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Quan tâm
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #cbd5e1", fontSize: "14px" }}
                                placeholder="Khách hàng quan tâm đến điều gì..."
                                value={careInterests}
                                onChange={(e) => setCareInterests(e.target.value)}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Nỗi đau
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #cbd5e1", fontSize: "14px" }}
                                placeholder="Trở ngại/Khó khăn của khách hàng..."
                                value={carePainPoints}
                                onChange={(e) => setCarePainPoints(e.target.value)}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Điều kiện mặt bằng
                              </label>
                              <input
                                type="text"
                                className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                                style={{ borderLeft: "3px solid #cbd5e1", fontSize: "14px" }}
                                placeholder="VD: Mặt đường lớn, ngã tư, khu dân cư đông đúc..."
                                value={carePremisesCondition}
                                onChange={(e) => setCarePremisesCondition(e.target.value)}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "13px" }}>
                                Tóm tắt kết quả chăm sóc <span className="text-danger">*</span>
                              </label>
                              <textarea
                                className="form-control rounded-2 border-light-subtle shadow-none py-2 px-3"
                                style={{ borderLeft: "3px solid #ffc107", fontSize: "14px" }}
                                rows={2}
                                required
                                placeholder="Tóm tắt kết quả chăm sóc (bắt buộc)..."
                                value={careOtherRequirements}
                                onChange={(e) => setCareOtherRequirements(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cột phải: Khái toán đầu tư quầy kệ và chi phí ban đầu */}
                    <div className={`col-lg-8 h-100 overflow-y-auto custom-scrollbar bg-white flex-column care-right-col ${activeCareModalTab === 'finance' ? 'd-flex' : 'd-none d-lg-flex'
                      }`}>
                      <div className="card border-0 shadow-none rounded-0 p-4 bg-white mb-0 flex-grow-1">
                        <SectionTitle
                          title="Khái toán đầu tư quầy kệ và chi phí ban đầu"
                          icon="bi-calculator"
                          className="mb-4"
                        />

                        {/* Toolbar gồm bộ lọc: Hạng mục, nút hình ảnh, Ô nhập kích thước, Số lượng */}
                        <div className="d-flex flex-wrap align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: "240px" }}>
                            <span className="text-secondary fw-semibold small flex-shrink-0" style={{ fontSize: "12.5px" }}>Hạng mục:</span>
                            <select
                              id="tbCategorySelect"
                              className="form-select form-select-sm rounded-2 border-light-subtle shadow-none py-1.5 flex-grow-1"
                              style={{ fontSize: "13px" }}
                              value={tbCategory}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "create_new") {
                                  setIsEditCabinetMode(false);
                                  setShowAddCabinetItemModal(true);
                                  return;
                                }
                                if (val === "edit_category") {
                                  setIsEditCabinetMode(true);
                                  setEditingCabinetItemId("");
                                  setShowAddCabinetItemModal(true);
                                  return;
                                }
                                setTbCategory(val);
                                // Autofill size if a matching item is selected
                                const selectedItem = cabinetItems.find(item => item.code === val);
                                if (selectedItem) {
                                  const dims = [
                                    selectedItem.length ? `${selectedItem.length}m` : null,
                                    selectedItem.depth ? `${selectedItem.depth}m` : null,
                                    selectedItem.height ? `${selectedItem.height}m` : null,
                                  ].filter(Boolean).join(" x ");
                                  setTbSize(dims || "");
                                }
                              }}
                            >
                              {cabinetItems.map((item) => (
                                <option key={item.id} value={item.code}>
                                  {item.name}
                                </option>
                              ))}
                              <option disabled style={{ color: "#cbd5e1" }}>
                                ───────────────
                              </option>
                              <option value="create_new" style={{ color: "#0d6efd", fontWeight: "bold" }}>
                                + Thêm mới hạng mục...
                              </option>
                              {cabinetItems.length > 0 && (
                                <option value="edit_category" style={{ color: "#6c757d", fontWeight: "bold" }}>
                                  - Sửa hạng mục...
                                </option>
                              )}
                            </select>
                            {/* Nút hình ảnh hạng mục */}
                            {(() => {
                              const selectedItem = cabinetItems.find(item => item.code === tbCategory);
                              const hasImages = !!(selectedItem?.imageUrl1 || selectedItem?.imageUrl2);
                              return (
                                <button
                                  type="button"
                                  className={`btn btn-sm d-flex align-items-center justify-content-center flex-shrink-0 rounded-2 shadow-none ${hasImages
                                      ? "btn-outline-primary border-primary text-primary"
                                      : "btn-outline-secondary border-light-subtle text-muted opacity-50 cursor-not-allowed"
                                    }`}
                                  style={{ width: "32px", height: "32px" }}
                                  title={hasImages ? "Xem hình ảnh hạng mục" : "Chưa có hình ảnh"}
                                  onClick={() => {
                                    if (!hasImages) {
                                      toastError("Thông tin", "Hạng mục này chưa có hình ảnh minh họa.");
                                      return;
                                    }
                                    const imgs = [selectedItem.imageUrl1, selectedItem.imageUrl2].filter(Boolean) as string[];
                                    setPreviewImagesList(imgs);
                                    setPreviewImageIndex(0);
                                  }}
                                >
                                  <i className="bi bi-image" style={{ fontSize: "16px" }} />
                                </button>
                              );
                            })()}
                          </div>



                          <div className="d-flex align-items-center gap-2 flex-shrink-0" style={{ width: "150px" }}>
                            <span className="text-secondary fw-semibold small flex-shrink-0" style={{ fontSize: "12.5px" }}>Kích thước:</span>
                            <input
                              id="tbSizeInput"
                              type="text"
                              className="form-control form-control-sm rounded-2 border-light-subtle shadow-none py-1.5 flex-grow-1"
                              style={{ fontSize: "13px" }}
                              placeholder=""
                              value={tbSize}
                              onChange={(e) => setTbSize(e.target.value)}
                            />
                            {(() => {
                              const selectedItem = cabinetItems.find(item => item.code === tbCategory);
                              return (
                                <span className="text-secondary fw-semibold small flex-shrink-0" style={{ fontSize: "12.5px" }}>
                                  {selectedItem?.unit || "md"}
                                </span>
                              );
                            })()}
                          </div>

                          <div className="d-flex align-items-center gap-2 flex-shrink-0" style={{ width: "120px" }}>
                            <span className="text-secondary fw-semibold small flex-shrink-0" style={{ fontSize: "12.5px" }}>Số lượng:</span>
                            <input
                              id="tbQuantityInput"
                              type="number"
                              min="1"
                              className="form-control form-control-sm rounded-2 border-light-subtle shadow-none py-1.5 flex-grow-1"
                              style={{ fontSize: "13px" }}
                              placeholder="Số lượng..."
                              value={tbQuantity}
                              onChange={(e) => setTbQuantity(e.target.value)}
                            />
                          </div>

                          <button
                            type="button"
                            className="btn btn-sm btn-primary rounded-2 shadow-none d-flex align-items-center justify-content-center px-3 py-1.5 text-white flex-shrink-0"
                            style={{ height: "32px", fontSize: "12.5px", fontWeight: 600 }}
                            onClick={() => {
                              const selectedItem = cabinetItems.find(item => item.code === tbCategory);
                              if (!selectedItem) {
                                toastError("Lỗi", "Vui lòng chọn một hạng mục.");
                                return;
                              }
                              const qty = parseInt(tbQuantity) || 1;

                              const existingIndex = addedCabinetItems.findIndex(
                                item => item.code === selectedItem.code && item.size === tbSize
                              );
                              if (existingIndex > -1) {
                                const newList = [...addedCabinetItems];
                                newList[existingIndex].quantity += qty;
                                setAddedCabinetItems(newList);
                              } else {
                                setAddedCabinetItems([
                                  ...addedCabinetItems,
                                  {
                                    id: selectedItem.id,
                                    code: selectedItem.code,
                                    name: selectedItem.name,
                                    unit: selectedItem.unit || "md",
                                    unitPrice: selectedItem.unitPrice || 0,
                                    quantity: qty,
                                    size: tbSize || "",
                                    description: selectedItem.description || "",
                                  }
                                ]);
                              }
                              toastSuccess("Thành công", `Đã thêm ${qty} ${selectedItem.unit || "md"} ${selectedItem.name} vào danh sách.`);
                            }}
                          >
                            <i className="bi bi-plus-lg me-1" />
                            Thêm vào bảng
                          </button>
                        </div>

                        {/* Bảng hạng mục khái toán quầy kệ */}
                        <div className="mt-4 flex-grow-1 bg-white">
                          <Table
                            rows={addedCabinetItems}
                            columns={[
                              {
                                header: "STT",
                                align: "center",
                                width: "60px",
                                render: (_, index) => index + 1,
                              },
                              {
                                header: "Hạng mục",
                                render: (row) => (
                                  <div>
                                    <div className="fw-semibold text-dark">{row.name}</div>
                                    {row.description && (
                                      <div className="small text-secondary mt-0.5" style={{ fontSize: "11.5px" }}>
                                        {row.description}
                                      </div>
                                    )}
                                    <div className="small text-primary mt-1 fw-bold" style={{ fontSize: "11.5px" }}>
                                      Số lượng: {row.quantity}
                                    </div>
                                  </div>
                                ),
                              },
                              {
                                header: "Đơn vị",
                                align: "center",
                                width: "100px",
                                render: (row) => row.unit || "md",
                              },
                              {
                                header: "Kích thước",
                                align: "center",
                                width: "120px",
                                render: (row) => row.size || "—",
                              },
                              {
                                header: "Đơn giá (đ)",
                                align: "right",
                                width: "140px",
                                render: (row) => row.unitPrice ? Math.round(row.unitPrice).toLocaleString("vi-VN") : "0",
                              },
                              {
                                header: "Thành tiền (đ)",
                                align: "right",
                                width: "160px",
                                render: (row) => {
                                  const sizeNum = parseFloat(String(row.size).replace(/[^\d.]/g, "")) || 1;
                                  return Math.round(row.unitPrice * row.quantity * sizeNum).toLocaleString("vi-VN");
                                },
                              },
                              {
                                header: "Hành động",
                                align: "center",
                                width: "80px",
                                render: (row, index) => (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger p-0 border-0"
                                    onClick={() => {
                                      const newList = [...addedCabinetItems];
                                      newList.splice(index, 1);
                                      setAddedCabinetItems(newList);
                                    }}
                                  >
                                    <i className="bi bi-trash-fill" />
                                  </button>
                                ),
                              },
                            ]}
                            emptyText="Chưa có hạng mục nào được thêm vào khái toán"
                            striped={true}
                            fontSize={13}
                            compact={true}
                          />
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer border-top bg-white py-3 px-4 d-flex align-items-center justify-content-between shadow-sm flex-shrink-0">
                  <div className="d-flex flex-wrap align-items-center gap-4">
                    {editingCareHistoryId && editingCareHistoryId !== "default" && (
                      <button
                        type="button"
                        className="btn btn-outline-danger rounded-pill px-4 d-flex align-items-center gap-1"
                        style={{ fontSize: "14px", fontWeight: 600 }}
                        onClick={handleDeleteCareHistoryClick}
                      >
                        <i className="bi bi-trash-fill" />
                        Xoá dữ liệu
                      </button>
                    )}

                    {addedCabinetItems.length > 0 && (
                      <div className="d-flex flex-column align-items-start">
                        <div className="d-flex align-items-center gap-2">
                          <span className="text-secondary fw-semibold mb-0" style={{ fontSize: "13.5px" }}>
                            Tổng chi phí khái toán đầu tư:
                          </span>
                          <span className="text-primary fw-extrabold" style={{ fontSize: "16px", fontWeight: 800 }}>
                            {(() => {
                              const total = addedCabinetItems.reduce((acc, item) => {
                                const sizeNum = parseFloat(String(item.size).replace(/[^\d.]/g, "")) || 1;
                                return acc + (item.unitPrice * item.quantity * sizeNum);
                              }, 0);
                              return <>{Math.round(total).toLocaleString("vi-VN")} đ</>;
                            })()}
                          </span>
                        </div>
                        <div className="text-muted small mt-1" style={{ fontSize: "12px", fontStyle: "italic" }}>
                          Bằng chữ: {(() => {
                            const total = addedCabinetItems.reduce((acc, item) => {
                              const sizeNum = parseFloat(String(item.size).replace(/[^\d.]/g, "")) || 1;
                              return acc + (item.unitPrice * item.quantity * sizeNum);
                            }, 0);
                            return docSoTien(Math.round(total));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-light text-secondary border rounded-pill px-4"
                      style={{ fontSize: "14px", fontWeight: 600 }}
                      onClick={() => setShowCareModal(false)}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary rounded-pill px-4 text-white d-flex align-items-center gap-1 shadow-sm"
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        backgroundColor: "#0d6efd",
                        borderColor: "#0d6efd",
                        color: "#ffffff",
                        backgroundImage: "none"
                      }}
                    >
                      <i className="bi bi-check2-circle" />
                      Cập nhật thông tin
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-pill px-4 d-flex align-items-center gap-1 shadow-sm"
                      style={{
                        fontSize: "14px",
                        fontWeight: 600
                      }}
                      onClick={() => {
                        setSigA(selectedPartner.bbSigA || null);
                        setSigB(selectedPartner.bbSigB || null);
                        setMouSidebarOpen(false);
                        setShowMOUModal(true);
                      }}
                    >
                      <i className="bi bi-file-earmark-text" />
                      Biên bản
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showNegModal && selectedPartner && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(15, 23, 42, 0.4)", zIndex: 1060, backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "450px" }}>
            <div className="modal-content border-0 shadow-2xl overflow-hidden" style={{ borderRadius: 14 }}>
              {/* Modal Header */}
              <div
                className="modal-header border-bottom-0 pb-2 pt-3 px-4 d-flex align-items-center justify-content-between"
                style={{ background: "linear-gradient(180deg, rgba(25, 135, 84, 0.06) 0%, transparent 100%)" }}
              >
                <div>
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: "15px" }}>
                    <i className="bi bi-chat-left-quote text-success me-1" />
                    {editingNegId ? "Cập nhật lịch sử báo giá" : "Thêm mới lịch sử báo giá"}
                  </h5>
                  <p className="text-muted small mb-0 mt-0.5" style={{ fontSize: "11px" }}>
                    Nhập thông tin tiến độ thương thảo báo giá thực tế
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none border-0"
                  onClick={() => setShowNegModal(false)}
                />
              </div>

              <form onSubmit={handleSaveNegotiation}>
                {/* Modal Body */}
                <div className="modal-body px-4 py-3 bg-light/50">
                  <div className="mb-3">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                      Phương thức thương thảo <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select rounded-2 border-light-subtle shadow-none py-2 px-3"
                      style={{ fontSize: "12.5px" }}
                      value={negType}
                      onChange={(e) => setNegType(e.target.value)}
                      required
                    >
                      <option value="call">Điện thoại thương thảo</option>
                      <option value="zalo">Thương thảo qua Zalo</option>
                      <option value="meet">Gặp trực tiếp thương thảo</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                      Thời gian liên hệ <span className="text-danger">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control rounded-2 border-light-subtle shadow-none py-2 px-3"
                      style={{ fontSize: "12.5px" }}
                      value={negDate}
                      onChange={(e) => setNegDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                      Người thực hiện <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-2 border-light-subtle shadow-none py-2 px-3"
                      style={{ fontSize: "12.5px" }}
                      value={negExecutor}
                      onChange={(e) => setNegExecutor(e.target.value)}
                      placeholder="Tên nhân viên thực hiện..."
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                      Kết quả chi tiết <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control rounded-2 border-light-subtle shadow-none py-2 px-3"
                      style={{ fontSize: "12.5px", resize: "none" }}
                      rows={4}
                      value={negOutcome}
                      onChange={(e) => setNegOutcome(e.target.value)}
                      placeholder="Nhập nội dung/kết quả cuộc thương thảo báo giá..."
                      required
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer border-top bg-light py-2.5 px-4 d-flex justify-content-between">
                  <div>
                    {editingNegId && editingNegId !== "default-neg" && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1"
                        style={{ fontSize: "12px" }}
                        onClick={handleDeleteNegClick}
                      >
                        <i className="bi bi-trash" />
                        Xoá lịch sử
                      </button>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-light text-secondary border rounded-pill px-3 py-1.5"
                      style={{ fontSize: "12px", fontWeight: 600 }}
                      onClick={() => setShowNegModal(false)}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success rounded-pill px-3 py-1.5 text-white d-flex align-items-center gap-1 shadow-sm"
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        backgroundColor: "#198754",
                        borderColor: "#198754",
                        color: "#ffffff",
                        backgroundImage: "none"
                      }}
                    >
                      <i className="bi bi-check2-circle" />
                      Lưu lại
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showExceptionModal && exceptionPartner && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(15, 23, 42, 0.5)", zIndex: 1060, backdropFilter: "blur(6px)" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "420px" }}>
            <div className="modal-content border-0 shadow-lg overflow-hidden" style={{ borderRadius: 16, backgroundColor: "#ffffff" }}>
              {/* Modal Header */}
              <div
                className="modal-header border-bottom-0 pb-3 pt-4 px-4 d-flex align-items-center justify-content-between"
                style={{ background: "linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%)" }}
              >
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-3" style={{ width: "32px", height: "32px" }}>
                    <i className="bi bi-shield-fill-exclamation" style={{ fontSize: "16px" }} />
                  </div>
                  <h5 className="modal-title fw-bold text-dark mb-0" style={{ fontSize: "14.5px" }}>
                    Yêu cầu phê duyệt đặc cách
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none border-0"
                  style={{ fontSize: "12px" }}
                  onClick={() => setShowExceptionModal(false)}
                />
              </div>

              {/* Modal Body */}
              <div className="modal-body px-4 py-3">
                <div className="mb-2">
                  <label className="form-label text-secondary mb-1.5 fw-semibold" style={{ fontSize: "12px" }}>
                    Lý do xin đặc cách chuyển bước <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    style={{
                      fontSize: "13px",
                      resize: "none",
                      borderRadius: "12px",
                      border: "1.5px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      padding: "12px 14px",
                      lineHeight: "1.5",
                      transition: "all 0.2s ease-in-out",
                      outline: "none",
                      boxShadow: "none"
                    }}
                    rows={4}
                    required
                    placeholder="Nhập lý do chi tiết..."
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                  />
                  <div className="d-flex align-items-center gap-2 mt-3 p-2.5 rounded-3" style={{ backgroundColor: "#f0fdf4", border: "1px solid #dcfce7" }}>
                    <i className="bi bi-info-circle-fill text-success" style={{ fontSize: "13px" }} />
                    <span className="text-success" style={{ fontSize: "11px", fontWeight: 500, lineHeight: "1.4" }}>
                      Yêu cầu sẽ được chuyển tới Trưởng phòng kinh doanh xét duyệt trực tiếp.
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-top-0 py-3 px-4 d-flex justify-content-end gap-2 bg-light-subtle">
                <button
                  type="button"
                  className="btn btn-light border px-4 py-2 text-secondary"
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    borderRadius: "10px",
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setShowExceptionModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={!exceptionReason.trim()}
                  className="btn btn-primary px-4 py-2 border-0 d-flex align-items-center gap-2 shadow-sm text-white"
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    borderRadius: "10px",
                    background: exceptionReason.trim()
                      ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                      : "#cbd5e1",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => handleRequestSpecialException(exceptionPartner, exceptionReason)}
                >
                  <i className="bi bi-send-fill" style={{ fontSize: "11px" }} />
                  Gửi yêu cầu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddCabinetItemModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(15, 23, 42, 0.4)", zIndex: 1070, backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-dialog-centered px-3" style={{ maxWidth: "550px", width: "100%" }}>
            <div className="modal-content border-0 shadow-2xl overflow-hidden animate__animated animate__fadeInUp" style={{ borderRadius: 16 }}>
              {/* Modal Header */}
              <div
                className="modal-header border-bottom pb-3 pt-4 px-3 px-sm-4 d-flex align-items-center justify-content-between"
                style={{ background: "linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%)" }}
              >
                <div>
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: "16px" }}>
                    <i className={isEditCabinetMode ? "bi bi-pencil-square text-primary" : "bi bi-folder-plus text-primary"} />
                    {isEditCabinetMode ? "Sửa hạng mục quầy kệ" : "Thêm mới hạng mục quầy kệ"}
                  </h5>
                  <p className="text-muted small mb-0 mt-0.5" style={{ fontSize: "12px" }}>
                    {isEditCabinetMode ? "Chọn hạng mục đã có để cập nhật thông tin hoặc xoá" : "Nhập thông tin hạng mục mới để lưu vào cơ sở dữ liệu"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none border-0"
                  style={{ fontSize: "12px" }}
                  onClick={() => setShowAddCabinetItemModal(false)}
                />
              </div>

              <form onSubmit={handleSaveCabinetItem}>
                {/* Modal Body */}
                <div className="modal-body px-3 px-sm-4 py-3 bg-light/30">
                  <div className="row g-3">
                    {isEditCabinetMode && (
                      <div className="col-12 animate__animated animate__fadeIn">
                        <label className="form-label text-primary mb-1 fw-bold" style={{ fontSize: "12.5px" }}>
                          Chọn hạng mục cần sửa / xoá <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select rounded-2 border-primary shadow-none py-1.5"
                          style={{ fontSize: "13px", backgroundColor: "rgba(13, 110, 253, 0.05)" }}
                          value={editingCabinetItemId}
                          onChange={(e) => handleSelectCabinetItemToEdit(e.target.value)}
                        >
                          <option value="">-- Chọn hạng mục --</option>
                          {cabinetItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="col-12">
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Tên gọi <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                        style={{ fontSize: "13px" }}
                        placeholder="VD: Kệ trưng bày sen vòi..."
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                      />
                    </div>

                    <div className="col-8">
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Đơn giá (VNĐ)
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-2 border-light-subtle shadow-none py-1.5 px-3"
                        style={{ fontSize: "13px" }}
                        placeholder="VD: 1.200.000..."
                        value={newItemUnitPrice}
                        onChange={(e) => setNewItemUnitPrice(formatInvestmentInput(e.target.value))}
                      />
                    </div>

                    <div className="col-4">
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Đơn vị tính <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select rounded-2 border-light-subtle shadow-none py-1.5"
                        style={{ fontSize: "13px" }}
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                      >
                        <option value="cái">cái</option>
                        <option value="bộ">bộ</option>
                        <option value="md">md</option>
                        <option value="m2">m²</option>
                        <option value="chiếc">chiếc</option>
                      </select>
                    </div>

                    <div className="col-12 animate__animated animate__fadeIn">
                      <label className="form-label text-secondary mb-2 fw-semibold" style={{ fontSize: "12px" }}>
                        Ảnh hạng mục (Tối đa 2 ảnh)
                      </label>
                      <div className="d-flex gap-3">
                        {/* Slot 1 */}
                        <div
                          className="position-relative d-flex flex-column align-items-center justify-content-center border rounded-3 bg-light/30 transition-all hover-shadow-sm"
                          style={{
                            width: "120px",
                            height: "120px",
                            borderStyle: (newItemImagePreview1 || existingImageUrl1) ? "solid" : "dashed",
                            borderColor: (newItemImagePreview1 || existingImageUrl1) ? "#cbd5e1" : "#a8a29e",
                            cursor: (newItemImagePreview1 || existingImageUrl1) ? "default" : "pointer",
                            overflow: "hidden"
                          }}
                          onClick={() => {
                            if (!(newItemImagePreview1 || existingImageUrl1)) fileInputRef1.current?.click();
                          }}
                        >
                          {(newItemImagePreview1 || existingImageUrl1) ? (
                            <>
                              <img
                                src={newItemImagePreview1 || existingImageUrl1}
                                alt="Ảnh 1"
                                className="w-100 h-100 object-fit-cover animate__animated animate__fadeIn"
                              />
                              <button
                                type="button"
                                className="position-absolute btn btn-danger btn-sm rounded-circle d-flex align-items-center justify-content-center shadow"
                                style={{ top: "6px", right: "6px", width: "24px", height: "24px", padding: 0 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (newItemImagePreview1) {
                                    handleRemoveSelectedImage(1);
                                  } else {
                                    setExistingImageUrl1("");
                                  }
                                }}
                              >
                                <i className="bi bi-x-lg" style={{ fontSize: "12px" }} />
                              </button>
                            </>
                          ) : (
                            <div className="text-center text-secondary py-3">
                              <i className="bi bi-image-fill text-muted" style={{ fontSize: "24px" }} />
                              <div className="small mt-1 text-muted" style={{ fontSize: "11.5px" }}>Đính kèm ảnh 1</div>
                            </div>
                          )}
                        </div>

                        {/* Slot 2 */}
                        <div
                          className="position-relative d-flex flex-column align-items-center justify-content-center border rounded-3 bg-light/30 transition-all hover-shadow-sm"
                          style={{
                            width: "120px",
                            height: "120px",
                            borderStyle: (newItemImagePreview2 || existingImageUrl2) ? "solid" : "dashed",
                            borderColor: (newItemImagePreview2 || existingImageUrl2) ? "#cbd5e1" : "#a8a29e",
                            cursor: (newItemImagePreview2 || existingImageUrl2) ? "default" : "pointer",
                            overflow: "hidden"
                          }}
                          onClick={() => {
                            if (!(newItemImagePreview2 || existingImageUrl2)) fileInputRef2.current?.click();
                          }}
                        >
                          {(newItemImagePreview2 || existingImageUrl2) ? (
                            <>
                              <img
                                src={newItemImagePreview2 || existingImageUrl2}
                                alt="Ảnh 2"
                                className="w-100 h-100 object-fit-cover animate__animated animate__fadeIn"
                              />
                              <button
                                type="button"
                                className="position-absolute btn btn-danger btn-sm rounded-circle d-flex align-items-center justify-content-center shadow"
                                style={{ top: "6px", right: "6px", width: "24px", height: "24px", padding: 0 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (newItemImagePreview2) {
                                    handleRemoveSelectedImage(2);
                                  } else {
                                    setExistingImageUrl2("");
                                  }
                                }}
                              >
                                <i className="bi bi-x-lg" style={{ fontSize: "12px" }} />
                              </button>
                            </>
                          ) : (
                            <div className="text-center text-secondary py-3">
                              <i className="bi bi-image-fill text-muted" style={{ fontSize: "24px" }} />
                              <div className="small mt-1 text-muted" style={{ fontSize: "11.5px" }}>Đính kèm ảnh 2</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hidden inputs */}
                      <input
                        type="file"
                        ref={fileInputRef1}
                        className="d-none"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSelectImage(file, 1);
                          e.target.value = "";
                        }}
                      />
                      <input
                        type="file"
                        ref={fileInputRef2}
                        className="d-none"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSelectImage(file, 2);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-secondary mb-1 fw-semibold" style={{ fontSize: "12px" }}>
                        Mô tả chi tiết
                      </label>
                      <textarea
                        className="form-control rounded-2 border-light-subtle shadow-none py-2 px-3"
                        style={{ fontSize: "13px", resize: "none" }}
                        rows={3}
                        placeholder="Nhập mô tả chi tiết sản phẩm..."
                        value={newItemDescription}
                        onChange={(e) => setNewItemDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer border-top bg-light-subtle py-3 px-3 px-sm-4 d-flex flex-column flex-sm-row justify-content-end gap-2">
                  {isEditCabinetMode && editingCabinetItemId && (
                    <button
                      type="button"
                      disabled={savingCabinetItem}
                      className="btn btn-danger px-4 py-2 w-100 w-sm-auto order-3 order-sm-1 me-sm-auto border-0 d-flex align-items-center justify-content-center gap-2 shadow-sm text-white"
                      style={{ fontSize: "13px", fontWeight: 600, borderRadius: "10px" }}
                      onClick={handleDeleteCabinetItem}
                    >
                      <i className="bi bi-trash-fill" />
                      Xoá hạng mục
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-light border px-4 py-2 w-100 w-sm-auto order-2 order-sm-2 text-secondary d-flex align-items-center justify-content-center"
                    style={{ fontSize: "13px", fontWeight: 600, borderRadius: "10px" }}
                    onClick={() => setShowAddCabinetItemModal(false)}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={savingCabinetItem || (isEditCabinetMode && !editingCabinetItemId)}
                    className="btn btn-primary px-4 py-2 w-100 w-sm-auto order-1 order-sm-3 border-0 d-flex align-items-center justify-content-center gap-2 shadow-sm text-white"
                    style={{ fontSize: "13px", fontWeight: 600, borderRadius: "10px" }}
                  >
                    {savingCabinetItem ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className={isEditCabinetMode ? "bi bi-check-lg" : "bi bi-save2-fill"} />
                        {isEditCabinetMode ? "Cập nhật" : "Lưu hạng mục"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteHistoryOpen}
        variant="danger"
        title="Xoá lịch sử chăm sóc?"
        message="Dữ liệu lịch sử chăm sóc này sẽ bị xoá vĩnh viễn và số sao đánh giá sẽ được tính toán lại."
        confirmLabel="Xoá"
        loading={deletingHistory}
        onConfirm={handleDeleteCareHistoryConfirm}
        onCancel={() => setConfirmDeleteHistoryOpen(false)}
      />

      <ConfirmDialog
        open={confirmAbandonOpen}
        variant="warning"
        title="Từ bỏ đại lý?"
        message={`Bạn có chắc chắn muốn từ bỏ đại lý "${partnerToAbandon?.name}"?`}
        confirmLabel="Từ bỏ"
        loading={abandoningPartner}
        onConfirm={handleAbandonPartnerConfirm}
        onCancel={() => {
          setConfirmAbandonOpen(false);
          setPartnerToAbandon(null);
        }}
      />

      <ConfirmDialog
        open={confirmDeleteNegOpen}
        variant="danger"
        title="Xoá lịch sử thương thảo?"
        message="Dữ liệu lịch sử thương thảo báo giá này sẽ bị xoá vĩnh viễn khỏi báo giá."
        confirmLabel="Xoá"
        loading={deletingNeg}
        onConfirm={handleDeleteNegConfirm}
        onCancel={() => setConfirmDeleteNegOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteBatchOpen}
        variant="danger"
        title="Xoá dữ liệu đại lý?"
        message={`Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedIds.size} đại lý đã chọn khỏi hệ thống không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá vĩnh viễn"
        loading={deletingBatch}
        onConfirm={handleBatchDeleteConfirm}
        onCancel={() => setConfirmDeleteBatchOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteHopDongOpen}
        variant="danger"
        title="Xoá hợp đồng?"
        message={`Bạn có chắc chắn muốn xoá toàn bộ thông tin hợp đồng cho đại lý "${selectedPartner?.name}" và chuyển đại lý này sang trạng thái "Đã từ bỏ" không? Việc này sẽ loại bỏ đại lý khỏi bảng danh sách của bước "Hợp đồng".`}
        confirmLabel="Xoá hợp đồng & Từ bỏ"
        loading={deletingHopDong}
        onConfirm={handleDeleteHopDongConfirm}
        onCancel={() => setConfirmDeleteHopDongOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeletePartnerOpen}
        variant="danger"
        title="Xoá dữ liệu đại lý?"
        message={`Bạn có chắc chắn muốn xoá vĩnh viễn đại lý "${partnerToDelete?.name}" khỏi hệ thống không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá vĩnh viễn"
        loading={deletingPartner}
        onConfirm={handleDeletePartnerConfirm}
        onCancel={() => {
          setConfirmDeletePartnerOpen(false);
          setPartnerToDelete(null);
        }}
      />

      {showBienBanModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "#f1f5f9", display: "flex", flexDirection: "column"
        }}>
          {/* Header Bar */}
          <div className="no-print" style={{
            height: 56, background: "#003087", display: "flex",
            alignItems: "center", justifyContent: "space-between",
            padding: "0 20px", color: "#fff", flexShrink: 0,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Lập biên bản thống nhất đại lý</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="btn btn-sm btn-success rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13, backgroundColor: "#22c55e", border: "none" }}
                disabled={savingBienBan}
                onClick={handleSaveBienBan}
              >
                {savingBienBan ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="bi bi-save" />
                    Lưu Biên bản
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13 }}
                onClick={handlePrintBienBan}
              >
                <i className="bi bi-printer" /> In Biên bản
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13 }}
                disabled={pdfUploading}
                onClick={handleExportPDF}
              >
                {pdfUploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Đang tạo PDF...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-pdf" /> Xuất PDF
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-close btn-close-white ms-2"
                onClick={() => setShowBienBanModal(false)}
              />
            </div>
          </div>

          {/* Modal Content Split Layout */}
          <div style={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
            {/* Left Column: Editor Form */}
            <div className="no-print" style={{
              width: "350px", borderRight: "1px solid #cbd5e1",
              background: "#fff", display: "flex", flexDirection: "column",
              flexShrink: 0
            }}>
              <div style={{ padding: "16px", overflowY: "auto", flexGrow: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Section 1: Bên A */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#003087", fontSize: 12, paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Bên A (Bên giao đại lý)
                    </h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Số báo giá</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbQuoteCode}
                          onChange={(e) => setBbQuoteCode(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Số biên bản</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbCode}
                          onChange={(e) => setBbCode(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Người ký</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbANguoiKy}
                          onChange={(e) => setBbANguoiKy(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Chức vụ</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbAChucVu}
                          onChange={(e) => setBbAChucVu(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Địa điểm lập</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbDiaDiem}
                          onChange={(e) => setBbDiaDiem(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Ngày lập</label>
                        <input
                          type="date"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbDate}
                          onChange={(e) => setBbDate(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Số điện thoại</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbA_DienThoai}
                          onChange={(e) => setBbA_DienThoai(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Bên B */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#ef4444", fontSize: 12, paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Bên B (Bên nhận đại lý)
                    </h6>
                    <div className="row g-2">
                      <div className="col-8">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Tên giao dịch</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbB_Ten}
                          onChange={(e) => setBbB_Ten(e.target.value)}
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Mã số thuế</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbB_MST}
                          onChange={(e) => setBbB_MST(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Địa chỉ</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbB_DiaChi}
                          onChange={(e) => setBbB_DiaChi(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Đại diện</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbB_DaiDien}
                          onChange={(e) => setBbB_DaiDien(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Chức vụ</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbB_ChucVu}
                          onChange={(e) => setBbB_ChucVu(e.target.value)}
                        />
                      </div>
                      <div className="col-5">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Điện thoại</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbB_DienThoai}
                          onChange={(e) => setBbB_DienThoai(e.target.value)}
                        />
                      </div>
                      <div className="col-7">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Email</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={bbB_Email}
                          onChange={(e) => setBbB_Email(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Hỗ trợ POSM */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#000", fontSize: 12, borderBottom: "1.5px solid #475569", paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Các mục hỗ trợ từ bên đại lý
                    </h6>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {Object.keys(bbSupports).map((key) => {
                        const labelMap: any = {
                          quayKeCoBan: "Quầy kệ trưng bày sản phẩm cơ bản",
                          catalogue: "Catalogue sản phẩm",
                          brochure: "Brochure/tờ rơi",
                          tagTreo: "Tag treo sản phẩm",
                          standee: "Standee/Banner khổ nhỏ",
                          bangGia: "Bảng giá sản phẩm",
                          manHinhLed: "Màn hình LED/LCD quảng bá thương hiệu",
                          bienBangSeajong: "Biên bảng thương hiệu Seajong",
                          posterKhoLon: "Poster khổ lớn",
                          backdropPhotoBooth: "Backdrop/photo booth thương hiệu",
                          vatPhamQuaTang: "Vật phẩm quà tặng thương hiệu (merchandise)",
                          posmQrCode: "POSM điện tử kết nối QR code",
                          dongPhucNhanVien: "Đồng phục nhân viên bán hàng",
                          chiPhiNoiThat: "Hỗ trợ một phần chi phí nội thất nếu phải sửa chữa về mặt bằng thô"
                        };
                        const label = labelMap[key];
                        if (!label) return null;
                        return (
                          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="checkbox"
                              id={`bb-support-${key}`}
                              checked={bbSupports[key]}
                              onChange={(e) => setBbSupports((prev: any) => ({ ...prev, [key]: e.target.checked }))}
                            />
                            <label htmlFor={`bb-support-${key}`} style={{ fontSize: "11px", cursor: "pointer", color: "#000" }}>
                              {label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 4: Thưởng & Chiết khấu */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#000", fontSize: 12, borderBottom: "1.5px solid #475569", paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Khoản thưởng doanh số
                    </h6>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {bbBonuses.map((bonus, idx) => (
                        <div key={bonus.id || idx} style={{ border: "1px solid #cbd5e1", borderRadius: "5px", padding: "8px", background: "#f8fafc" }}>
                          {editingBonusId === bonus.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <input
                                type="text"
                                className="form-control form-control-sm rounded shadow-none border"
                                style={{ fontSize: 11, fontWeight: "bold" }}
                                value={bonus.title}
                                onChange={(e) => setBbBonuses(prev => prev.map(b => b.id === bonus.id ? { ...b, title: e.target.value } : b))}
                              />
                              <textarea
                                className="form-control form-control-sm rounded shadow-none border"
                                style={{ fontSize: 10, resize: "none" }}
                                rows={2}
                                value={bonus.desc}
                                onChange={(e) => setBbBonuses(prev => prev.map(b => b.id === bonus.id ? { ...b, desc: e.target.value } : b))}
                              />
                              <input
                                type="text"
                                className="form-control form-control-sm rounded shadow-none border text-primary"
                                style={{ fontSize: 10, fontFamily: "monospace" }}
                                value={bonus.formula}
                                onChange={(e) => setBbBonuses(prev => prev.map(b => b.id === bonus.id ? { ...b, formula: e.target.value } : b))}
                              />
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-danger py-0.5 px-2"
                                  style={{ fontSize: 9 }}
                                  onClick={() => setBbBonuses(prev => prev.filter(b => b.id !== bonus.id))}
                                >
                                  Xóa
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-primary py-0.5 px-2 text-white"
                                  style={{ fontSize: 9, backgroundColor: "#003087" }}
                                  onClick={() => setEditingBonusId(null)}
                                >
                                  OK
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong style={{ fontSize: 11, color: "#000" }}>{bonus.title}</strong>
                                <i className="bi bi-pencil-square" style={{ cursor: "pointer", color: "#000", fontSize: 11 }} onClick={() => setEditingBonusId(bonus.id)} />
                              </div>
                              <div style={{ fontSize: 10, color: "#000" }}>{bonus.desc}</div>
                              <div style={{ fontSize: 10, color: "#003087", fontWeight: "bold", fontStyle: "italic", marginTop: 2 }}>{bonus.formula}</div>
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary w-100 rounded-pill py-1 fw-bold"
                        style={{ fontSize: 11 }}
                        onClick={() => {
                          const newId = String(Date.now());
                          setBbBonuses(prev => [...prev, {
                            id: newId,
                            title: "Khoản thưởng mới",
                            desc: "Chi tiết khoản thưởng và điều kiện đi kèm...",
                            formula: "Mức thưởng = ..."
                          }]);
                          setEditingBonusId(newId);
                        }}
                      >
                        + Thêm khoản thưởng
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: PDF/Print Preview Container */}
            <div style={{
              flexGrow: 1, padding: "30px 40px", overflowY: "auto",
              display: "flex", flexDirection: "column", alignItems: "center",
              background: "#cbd5e1", gap: 30
            }}>
              <div id="bienban-print-doc" style={{
                display: "flex", flexDirection: "column", gap: 30
              }}>
                {renderPage1()}
                {renderPage2()}
                {renderPage3()}
              </div>
            </div>
          </div>
        </div>
      )}

      {showMOUModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "#f8fafc", display: "flex", flexDirection: "column"
        }}>
          {/* Header Bar */}
          <div className="no-print" style={{
            height: 56, background: "#0f172a", display: "flex",
            alignItems: "center", justifyContent: "space-between",
            padding: "0 20px", color: "#fff", flexShrink: 0,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }}>
            <span style={{ fontWeight: 700, fontSize: 15 }} className="d-none d-sm-inline">Lập biên bản ghi nhớ chăm sóc khách hàng</span>
            <span style={{ fontWeight: 700, fontSize: 14 }} className="d-inline d-sm-none">Biên bản MOU</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Toggle Sidebar Button for iPad and mobile screens */}
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-circle p-0 d-flex align-items-center justify-content-center mou-mobile-toggle-btn"
                style={{ width: "32px", height: "32px" }}
                onClick={() => setMouSidebarOpen(!mouSidebarOpen)}
                title={mouSidebarOpen ? "Ẩn công cụ" : "Hiện công cụ"}
              >
                <i className={`bi bi-${mouSidebarOpen ? "x-lg" : "sliders"}`} style={{ fontSize: "14px" }} />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13, backgroundColor: "#22c55e", border: "none" }}
                onClick={async () => {
                  if (!selectedPartner) return;

                  const updated: PartnerProcessItem = {
                    ...selectedPartner,
                    bbSigA: sigA || undefined,
                    bbSigB: sigB || undefined,
                    bbDiaDiem: careLocation,
                    bbDate: careExecutionDate,
                    bbANguoiKy: careExecutor,
                    bbB_Ten: careCompanyName,
                    bbB_DaiDien: careFullName,
                    bbB_DienThoai: carePhone,
                    bbB_DiaChi: careBusinessAddress,
                  };

                  const success = await handleUpdatePartnerDetails(updated);
                  if (success) {
                    toastSuccess("Thành công", "Đã lưu biên bản ghi nhớ!");
                    setShowMOUModal(false);
                  } else {
                    toastError("Thất bại", "Không thể lưu biên bản ghi nhớ. Vui lòng thử lại!");
                  }
                }}
              >
                <i className="bi bi-save" />
                Lưu Biên bản
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13 }}
                onClick={handlePrintMOU}
              >
                <i className="bi bi-printer" /> In Biên bản
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13 }}
                onClick={handleExportMOUPDF}
                disabled={pdfUploadingMOU}
              >
                {pdfUploadingMOU ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Đang xuất...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-pdf" /> Xuất PDF
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-close btn-close-white ms-2"
                onClick={() => setShowMOUModal(false)}
              />
            </div>
          </div>

          {/* Responsive CSS Style block */}
          <style>{`
            .mou-split-container {
              display: flex;
              flex-direction: row;
              flex-grow: 1;
              overflow: hidden;
              position: relative;
            }
            .mou-editor-sidebar {
              width: 380px;
              border-right: 1px solid #cbd5e1;
              background: #fff;
              display: flex;
              flex-direction: column;
              flex-shrink: 0;
              z-index: 10;
              transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .mou-preview-column {
              flex-grow: 1;
              overflow-y: auto;
              background: #f8fafc;
              padding: 40px 20px;
            }
            .mou-print-page {
              width: 794px;
              height: 1123px;
              background: #fff;
              margin: 0 auto;
              padding: 20mm 20mm 20mm 30mm;
              box-shadow: 0 4px 20px rgba(0,0,0,0.05);
              color: #000;
              font-family: 'Roboto Condensed', sans-serif;
              font-size: 13px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              position: relative;
            }
            .mou-mobile-toggle-btn {
              display: none;
            }
            .mou-mobile-backdrop {
              display: block;
            }

            /* Responsive styling for iPad and smartphones */
            @media (max-width: 1024px) {
              .mou-mobile-toggle-btn {
                display: flex !important;
              }
              .mou-editor-sidebar {
                position: fixed !important;
                top: 56px !important;
                left: 0 !important;
                bottom: 0 !important;
                width: 340px !important;
                max-width: 85vw !important;
                height: calc(100% - 56px) !important;
                transform: translateX(-100%) !important;
                z-index: 3100 !important;
                box-shadow: none !important;
                border-right: 1px solid #cbd5e1 !important;
              }
              .mou-editor-sidebar.open {
                transform: translateX(0) !important;
                box-shadow: 5px 0 25px rgba(15, 23, 42, 0.15) !important;
              }
              .mou-preview-column {
                padding: 15px 10px !important;
              }
              .mou-print-page {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                padding: 30px 20px !important;
                margin: 0 auto !important;
                box-shadow: none !important;
              }
            }
            
            @media (max-width: 576px) {
              .mou-print-page {
                padding: 20px 10px !important;
                font-size: 12px !important;
              }
            }
            
            @media (min-width: 1025px) {
              .mou-mobile-backdrop {
                display: none !important;
              }
            }
          `}</style>

          {/* Mobile Overlay Backdrop */}
          {mouSidebarOpen && (
            <div
              style={{
                position: "fixed",
                inset: "56px 0 0 0",
                background: "rgba(15, 23, 42, 0.3)",
                backdropFilter: "blur(1.5px)",
                zIndex: 3090
              }}
              className="mou-mobile-backdrop"
              onClick={() => setMouSidebarOpen(false)}
            />
          )}

          {/* Modal Content Split Layout */}
          <div className="mou-split-container">
            {/* Left Column: Form Editor */}
            <div className={`no-print mou-editor-sidebar ${mouSidebarOpen ? "open" : ""}`}>
              <div style={{ padding: "16px", overflowY: "auto", flexGrow: 1 }}>
                <h5 className="fw-bold mb-3 text-dark" style={{ fontSize: "14px" }}>Thông tin Biên bản ghi nhớ</h5>
                <p className="text-secondary small mb-4">
                  Biên bản được tự động điền dựa trên thông tin kết quả chăm sóc khách hàng hiện tại.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label className="form-label small fw-bold text-secondary mb-1">Người lập biên bản (Bên A)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-2 text-dark"
                      value={careExecutor || ""}
                      onChange={(e) => setCareExecutor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label small fw-bold text-secondary mb-1">Khách hàng / Đại lý (Bên B)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-2 text-dark"
                      value={careCompanyName || ""}
                      onChange={(e) => setCareCompanyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label small fw-bold text-secondary mb-1">Người đại diện liên hệ</label>
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-2 text-dark"
                      value={careFullName || ""}
                      onChange={(e) => setCareFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label small fw-bold text-secondary mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-2 text-dark"
                      value={carePhone || ""}
                      onChange={(e) => setCarePhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label small fw-bold text-secondary mb-1">Địa chỉ kinh doanh</label>
                    <textarea
                      rows={2}
                      className="form-control form-control-sm rounded-2 text-dark"
                      value={careBusinessAddress || ""}
                      onChange={(e) => setCareBusinessAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label small fw-bold text-secondary mb-1">Địa điểm lập biên bản</label>
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-2 text-dark"
                      value={careLocation}
                      onChange={(e) => setCareLocation(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label small fw-bold text-secondary mb-1">Ngày lập biên bản</label>
                    <input
                      type="date"
                      className="form-control form-control-sm rounded-2 text-dark"
                      value={careExecutionDate ? careExecutionDate.split("T")[0] : ""}
                      onChange={(e) => setCareExecutionDate(e.target.value)}
                    />
                  </div>
                  <div className="mt-3">
                    <label className="form-label small fw-bold text-secondary mb-1">Chữ ký Bên A (Người lập)</label>
                    <SignaturePad
                      onSave={(dataUrl) => setSigA(dataUrl)}
                      onClear={() => setSigA(null)}
                      placeholder="Dùng tay/bút ký để ký tên"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="form-label small fw-bold text-secondary mb-1">Chữ ký Bên B (Khách hàng)</label>
                    <SignaturePad
                      onSave={(dataUrl) => setSigB(dataUrl)}
                      onClear={() => setSigB(null)}
                      placeholder="Dùng tay/bút ký để ký tên"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Document Preview */}
            <div className="custom-scrollbar mou-preview-column">
              <div id="mou-print-doc" style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                {/* PAGE 1 */}
                <div className="mou-print-page print-page-break">
                {/* Header với Logo bên trái và Thông tin công ty bên cạnh */}
                <div className="d-flex align-items-center gap-3" style={{ borderBottom: "2px solid #000", paddingBottom: 15 }}>
                  {companyInfo?.logoUrl && (
                    <img src={companyInfo.logoUrl} style={{ height: "48px", objectFit: "contain" }} alt="Logo" />
                  )}
                  <div>
                    <div className="fw-bold text-uppercase" style={{ fontSize: 13, color: "#000" }}>
                      {companyInfo?.name || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
                    </div>
                    <div style={{ fontSize: 11, color: "#000", marginTop: 2 }}>
                      Địa chỉ: {companyInfo?.address || "LK7-D4, KĐT mới Cầu Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội"}<br />
                      Hotline: {(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()} | Email: {companyInfo?.email || "info@seajong.com"} | Website: {companyInfo?.website || "seajong.com"}
                    </div>
                  </div>
                </div>

                {/* Tên biên bản */}
                <div className="mou-title" style={{ fontSize: "18px", fontWeight: "bold", textAlign: "center", textTransform: "uppercase", marginTop: "35px", marginBottom: "5px" }}>
                  BIÊN BẢN GHI NHỚ
                </div>
                <div className="text-center mb-4" style={{ fontSize: "13px", fontStyle: "italic" }}>
                  (V/v ghi nhận kết quả trao đổi và định hướng hợp tác kinh doanh)
                </div>

                {/* Thời gian địa điểm */}
                <div className="mb-4" style={{ textIndent: "20px", textAlign: "justify", lineHeight: "1.5" }}>
                  Hôm nay, ngày {careExecutionDate ? careExecutionDate.split("T")[0].split("-").reverse().join("/") : "..../..../2026"}, tại {careLocation || "...................................."}, chúng tôi gồm các bên dưới đây đã cùng nhau tiến hành trao đổi, ghi nhận nội dung cuộc họp thảo luận về phương án hợp tác đại lý Seajong:
                </div>

                {/* Thông tin Bên A */}
                <div className="mou-section-header" style={{ fontWeight: "bold", fontSize: "14px", marginTop: "15px", marginBottom: "8px", textTransform: "uppercase", borderBottom: "1px solid #cbd5e1" }}>
                  BÊN A: {companyInfo?.name?.toUpperCase() || "CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM"}
                </div>
                <table className="table table-borderless table-sm info-table mb-3" style={{ fontSize: "13px" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "150px" }}>Đại diện:</td>
                      <td className="fw-bold">{careExecutor || "Chuyên viên kinh doanh"}</td>
                    </tr>
                    <tr>
                      <td>Chức vụ:</td>
                      <td>Chuyên viên phát triển thị trường</td>
                    </tr>
                    <tr>
                      <td>Số điện thoại:</td>
                      <td>{(companyInfo?.phone || "1900.633.862").replace(/[Hh]otline:\s*/gi, "").trim()}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Thông tin Bên B */}
                <div className="mou-section-header" style={{ fontWeight: "bold", fontSize: "14px", marginTop: "15px", marginBottom: "8px", textTransform: "uppercase", borderBottom: "1px solid #cbd5e1" }}>
                  BÊN B: THÔNG TIN KHÁCH HÀNG / ĐẠI LÝ
                </div>
                <table className="table table-borderless table-sm info-table mb-3" style={{ fontSize: "13px" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "150px" }}>Tên Đại lý/Công ty:</td>
                      <td className="fw-bold">{careCompanyName || "......................................................................."}</td>
                    </tr>
                    <tr>
                      <td>Người đại diện liên hệ:</td>
                      <td>{careFullName || "......................................................................."}</td>
                    </tr>
                    <tr>
                      <td>Chức vụ/Vai trò:</td>
                      <td>{careRole || "......................................................................."}</td>
                    </tr>
                    <tr>
                      <td>Số điện thoại:</td>
                      <td>{carePhone || "......................................................................."}</td>
                    </tr>
                    <tr>
                      <td>Địa chỉ kinh doanh:</td>
                      <td>{careBusinessAddress || "......................................................................."}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Nội dung ghi nhận trao đổi */}
                <div className="mou-section-header" style={{ fontWeight: "bold", fontSize: "14px", marginTop: "20px", marginBottom: "8px", textTransform: "uppercase", borderBottom: "1px solid #cbd5e1" }}>
                  I. NỘI DUNG TRAO ĐỔI VÀ KHẢO SÁT THỰC TẾ
                </div>
                <div style={{ lineHeight: "1.6" }}>
                  <ol style={{ paddingLeft: 20 }}>
                    {careBusinessType && (
                      <li className="mb-1"><strong>Loại hình kinh doanh hiện tại:</strong> {careBusinessType}</li>
                    )}
                    {carePremisesScale && (
                      <li className="mb-1"><strong>Diện tích mặt bằng:</strong> {carePremisesScale} m² (Hiện trạng: {carePremisesCondition || "Chưa ghi nhận"})</li>
                    )}
                    {careCurrentBrands && (
                      <li className="mb-1"><strong>Thương hiệu đang kinh doanh:</strong> {careCurrentBrands}</li>
                    )}
                    {careCollabNeeds && (
                      <li className="mb-1"><strong>Nhu cầu hợp tác của Khách hàng:</strong> {careCollabNeeds}</li>
                    )}
                    {careDeploymentPlan && (
                      <li className="mb-1"><strong>Kế hoạch triển khai:</strong> {careDeploymentPlan}</li>
                    )}
                    {careExpectedInvestment && (
                      <li className="mb-1"><strong>Mức đầu tư dự kiến:</strong> {careExpectedInvestment} triệu đồng (Thời gian triển khai: {careInvestmentTimeframe || "Chưa xác định"})</li>
                    )}
                    {careInterests && (
                      <li className="mb-1"><strong>Mối quan tâm chính của khách hàng:</strong> {careInterests}</li>
                    )}
                    {carePainPoints && (
                      <li className="mb-1"><strong>Khó khăn, vướng mắc của khách hàng (Pain points):</strong> {carePainPoints}</li>
                    )}
                  </ol>
                </div>

                {/* Khái toán quầy kệ */}
                {addedCabinetItems.length > 0 && (
                  <>
                    <div className="mou-section-header" style={{ fontWeight: "bold", fontSize: "14px", marginTop: "20px", marginBottom: "8px", textTransform: "uppercase", borderBottom: "1px solid #cbd5e1" }}>
                      II. PHƯƠNG ÁN KHÁI TOÁN ĐẦU TƯ QUẦY KỆ (DỰ KIẾN)
                    </div>
                    <table className="cabinet-table w-100 mb-3" style={{ borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed", width: "100%", border: "1px solid #cbd5e1", color: "#000" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f1f5f9" }}>
                          <th className="text-center" style={{ width: "5%", border: "1px solid #cbd5e1", padding: "8px 10px", fontWeight: "bold", color: "#000", verticalAlign: "middle" }}>STT</th>
                          <th style={{ width: "49%", border: "1px solid #cbd5e1", padding: "8px 10px", fontWeight: "bold", color: "#000", verticalAlign: "middle" }}>Hạng mục đầu tư</th>
                          <th className="text-center" style={{ width: "8%", border: "1px solid #cbd5e1", padding: "8px 10px", fontWeight: "bold", color: "#000", verticalAlign: "middle" }}>Đơn vị</th>
                          <th className="text-center" style={{ width: "10%", border: "1px solid #cbd5e1", padding: "8px 10px", fontWeight: "bold", color: "#000", verticalAlign: "middle" }}>Kích thước</th>
                          <th className="text-end" style={{ width: "12%", border: "1px solid #cbd5e1", padding: "8px 10px", fontWeight: "bold", color: "#000", verticalAlign: "middle" }}>Đơn giá (đ)</th>
                          <th className="text-end" style={{ width: "16%", border: "1px solid #cbd5e1", padding: "8px 10px", fontWeight: "bold", color: "#000", verticalAlign: "middle" }}>Thành tiền (đ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addedCabinetItems.map((item, index) => {
                          const amount = (parseFloat(item.size || "") || 0) * (item.unitPrice || 0) * (item.quantity || 0);
                          return (
                            <tr key={index} style={{ color: "#000" }}>
                              <td className="text-center" style={{ border: "1px solid #cbd5e1", padding: "8px 10px", verticalAlign: "middle", color: "#000" }}>{index + 1}</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "8px 10px", verticalAlign: "middle", wordBreak: "break-word", color: "#000" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <strong>{item.name}</strong>
                                  <span style={{ fontWeight: "normal", fontSize: "12px", color: "#000" }}>Số lượng: {item.quantity}</span>
                                </div>
                                {item.description && (
                                  <div className="mt-1" style={{ fontSize: "11px", lineHeight: "1.4", fontWeight: "normal", color: "#000" }}>
                                    {item.description}
                                  </div>
                                )}
                              </td>
                              <td className="text-center" style={{ border: "1px solid #cbd5e1", padding: "8px 10px", verticalAlign: "middle", color: "#000" }}>{item.unit || "md"}</td>
                              <td className="text-center" style={{ border: "1px solid #cbd5e1", padding: "8px 10px", verticalAlign: "middle", color: "#000" }}>{item.size || "—"}</td>
                              <td className="text-end" style={{ border: "1px solid #cbd5e1", padding: "8px 10px", verticalAlign: "middle", color: "#000" }}>{item.unitPrice.toLocaleString("vi-VN")}</td>
                              <td className="text-end" style={{ border: "1px solid #cbd5e1", padding: "8px 10px", verticalAlign: "middle", color: "#000" }}>{amount.toLocaleString("vi-VN")}</td>
                            </tr>
                          );
                        })}
                        <tr style={{ backgroundColor: "#f8fafc", color: "#000" }}>
                          <td colSpan={5} className="text-end fw-bold" style={{ border: "1px solid #cbd5e1", padding: "8px 10px", verticalAlign: "middle", color: "#000" }}>Tổng chi phí dự kiến:</td>
                          <td className="text-end fw-bold" style={{ border: "1px solid #cbd5e1", padding: "8px 10px", verticalAlign: "middle", color: "#000" }}>
                            {(() => {
                              const total = addedCabinetItems.reduce((acc, item) => {
                                const amount = (parseFloat(item.size || "") || 0) * (item.unitPrice || 0) * (item.quantity || 0);
                                return acc + amount;
                              }, 0);
                              return total.toLocaleString("vi-VN") + " đ";
                            })()}
                          </td>
                        </tr>
                        <tr style={{ backgroundColor: "#f8fafc", color: "#000" }}>
                          <td colSpan={6} style={{ fontStyle: "italic", fontSize: "12px", border: "1px solid #cbd5e1", padding: "8px 10px", color: "#000" }}>
                            <strong>Bằng chữ:</strong>{" "}
                            {(() => {
                              const total = addedCabinetItems.reduce((acc, item) => {
                                const amount = (parseFloat(item.size || "") || 0) * (item.unitPrice || 0) * (item.quantity || 0);
                                return acc + amount;
                              }, 0);
                              return docSoTien(Math.round(total));
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}

              </div> {/* Close Page 1 */}

              {/* PAGE 2 */}
              <div className="mou-print-page print-page-break">
                {/* Điều khoản ghi nhớ */}
                <div className="mou-section-header" style={{ fontWeight: "bold", fontSize: "14px", marginTop: "20px", marginBottom: "8px", textTransform: "uppercase", borderBottom: "1px solid #cbd5e1" }}>
                  III. KẾT LUẬN & ĐỊNH HƯỚNG BƯỚC TIẾP THEO
                </div>
                <div className="mb-4" style={{ textAlign: "justify", lineHeight: "1.5" }}>
                  Hai bên cùng thống nhất ghi nhận các nội dung trên làm cơ sở định hướng xây dựng phương án kinh doanh, xem xét hỗ trợ thiết kế quầy kệ, cũng như chuẩn bị các hồ sơ liên quan để xúc tiến hợp tác đại lý chính thức trong thời gian tới. Biên bản này được lập làm căn cứ ghi nhớ kết quả làm việc giữa hai bên.
                </div>

                {/* Chữ ký hai bên */}
                <div className="d-flex justify-content-between mt-5 pt-3">
                  <div className="text-center" style={{ width: "45%", color: "#000" }}>
                    <div className="fw-bold text-uppercase">ĐẠI DIỆN BÊN A</div>
                    <div className="small italic" style={{ fontSize: 11, color: "#000" }}>(Ký, ghi rõ họ tên)</div>
                    <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sigA ? (
                        <img src={sigA} style={{ height: "70px", objectFit: "contain" }} alt="Chữ ký Bên A" />
                      ) : (
                        <div style={{ height: 70 }} />
                      )}
                    </div>
                    <div className="fw-bold" style={{ color: "#000" }}>{careExecutor || "...................................."}</div>
                  </div>
                  <div className="text-center" style={{ width: "45%", color: "#000" }}>
                    <div className="fw-bold text-uppercase">ĐẠI DIỆN BÊN B</div>
                    <div className="small italic" style={{ fontSize: 11, color: "#000" }}>(Ký, ghi rõ họ tên)</div>
                    <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sigB ? (
                        <img src={sigB} style={{ height: "70px", objectFit: "contain" }} alt="Chữ ký Bên B" />
                      ) : (
                        <div style={{ height: 70 }} />
                      )}
                    </div>
                    <div className="fw-bold" style={{ color: "#000" }}>{careFullName || "...................................."}</div>
                  </div>
                </div>
              </div> {/* Close Page 2 */}
            </div>
          </div>
          </div>
        </div>
      )}

      {showHopDongModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "#f1f5f9", display: "flex", flexDirection: "column"
        }}>
          {/* Header Bar */}
          <div className="no-print" style={{
            height: 56, background: "#003087", display: "flex",
            alignItems: "center", justifyContent: "space-between",
            padding: "0 20px", color: "#fff", flexShrink: 0,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Lập hợp đồng đại lý phân phối</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="btn btn-sm btn-success rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13, backgroundColor: "#22c55e", border: "none" }}
                disabled={savingHopDong}
                onClick={handleSaveHopDong}
              >
                {savingHopDong ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="bi bi-save" />
                    Lưu Hợp đồng
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13 }}
                onClick={handlePrintHopDong}
              >
                <i className="bi bi-printer" /> In Hợp đồng
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13 }}
                disabled={pdfUploadingHD}
                onClick={handleExportPDFHD}
              >
                {pdfUploadingHD ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Đang tạo PDF...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-pdf" /> Xuất PDF
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-close btn-close-white ms-2"
                onClick={() => setShowHopDongModal(false)}
              />
            </div>
          </div>

          {/* Modal Content Split Layout */}
          <div style={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
            {/* Left Column: Editor Form */}
            <div className="no-print" style={{
              width: "350px", borderRight: "1px solid #cbd5e1",
              background: "#fff", display: "flex", flexDirection: "column",
              flexShrink: 0
            }}>
              <div style={{ padding: "16px", overflowY: "auto", flexGrow: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Section A: Thông tin chung */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#003087", fontSize: 12, paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Thông tin chung hợp đồng
                    </h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Số hợp đồng</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdCode}
                          onChange={(e) => setHdCode(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Ngày ký</label>
                        <input
                          type="date"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdDate}
                          onChange={(e) => setHdDate(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Địa điểm ký</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdDiaDiem}
                          onChange={(e) => setHdDiaDiem(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section B: Bên A */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#003087", fontSize: 12, paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Bên A (Bên giao đại lý)
                    </h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Đại diện</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdANguoiKy}
                          onChange={(e) => setHdANguoiKy(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Chức vụ đại diện</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdAChucVu}
                          onChange={(e) => setHdAChucVu(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section C: Bên B */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#ef4444", fontSize: 12, paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Bên B (Bên nhận đại lý)
                    </h6>
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Tên Công ty / Cửa hàng</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdB_Ten}
                          onChange={(e) => setHdB_Ten(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Địa chỉ trụ sở</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdB_DiaChi}
                          onChange={(e) => setHdB_DiaChi(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Mã số thuế</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdB_MST}
                          onChange={(e) => setHdB_MST(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div>
                            <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Đại diện ký</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 12 }}
                              value={hdB_DaiDien}
                              onChange={(e) => setHdB_DaiDien(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Chức vụ đại diện</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 12 }}
                              value={hdB_ChucVu}
                              onChange={(e) => setHdB_ChucVu(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Điện thoại</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 12 }}
                              value={hdB_DienThoai}
                              onChange={(e) => setHdB_DienThoai(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Email</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 12 }}
                              value={hdB_Email}
                              onChange={(e) => setHdB_Email(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section D: Điều khoản Showroom */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#000", fontSize: 12, borderBottom: "1.5px solid #475569", paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Điều khoản Showroom
                    </h6>
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Địa chỉ Showroom trưng bày</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdShowroomAddress}
                          onChange={(e) => setHdShowroomAddress(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Diện tích Showroom trưng bày (m²)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdShowroomArea}
                          onChange={(e) => setHdShowroomArea(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section E: Chỉ tiêu & Độc quyền */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#000", fontSize: 12, borderBottom: "1.5px solid #475569", paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Chỉ tiêu doanh số & Độc quyền
                    </h6>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Doanh số cam kết năm (VNĐ)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border font-monospace fw-bold"
                          style={{ fontSize: 12 }}
                          value={hdAnnualRevenue}
                          onChange={(e) => handleCurrencyChange(e.target.value, setHdAnnualRevenue)}
                        />
                      </div>
                      <div>
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Doanh số cam kết tháng (VNĐ)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border font-monospace"
                          style={{ fontSize: 12 }}
                          value={hdMonthlyRevenue}
                          onChange={(e) => handleCurrencyChange(e.target.value, setHdMonthlyRevenue)}
                        />
                      </div>
                      <div>
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Thời hạn hợp đồng (Năm)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdDurationYears}
                          onChange={(e) => setHdDurationYears(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Bán kính bảo hộ độc quyền (Km)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdExclusiveRadius}
                          onChange={(e) => setHdExclusiveRadius(e.target.value)}
                        />
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Thời hạn bảo hộ độc quyền (Tháng)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={hdExclusiveMonths}
                          onChange={(e) => setHdExclusiveMonths(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: PDF/Print Preview Container */}
            <div style={{
              flexGrow: 1, padding: "30px 40px", overflowY: "auto",
              display: "flex", flexDirection: "column", alignItems: "center",
              background: "#cbd5e1", gap: 30
            }}>
              <div id="hopdong-print-doc" style={{
                display: "flex", flexDirection: "column", gap: 30
              }}>
                {renderPage1HD()}
                {renderPage2HD()}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPhuLucModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "#f1f5f9", display: "flex", flexDirection: "column"
        }}>
          {/* Header Bar */}
          <div className="no-print" style={{
            height: 56, background: "#003087", display: "flex",
            alignItems: "center", justifyContent: "space-between",
            padding: "0 20px", color: "#fff", flexShrink: 0,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Lập Phụ Lục Hợp Đồng</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="btn btn-sm btn-success rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13, backgroundColor: "#22c55e", border: "none" }}
                disabled={savingPhuLuc}
                onClick={handleSavePhuLuc}
              >
                {savingPhuLuc ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="bi bi-save" />
                    Lưu Phụ lục
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13 }}
                onClick={handlePrintPhuLuc}
              >
                <i className="bi bi-printer" /> In Phụ lục
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
                style={{ fontSize: 13 }}
                disabled={pdfUploadingPL}
                onClick={handleExportPDFPL}
              >
                {pdfUploadingPL ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Đang tạo PDF...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-pdf" /> Xuất PDF
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-close btn-close-white ms-2"
                onClick={() => setShowPhuLucModal(false)}
              />
            </div>
          </div>

          {/* Modal Content Split Layout */}
          <div style={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
            {/* Left Column: Editor Form */}
            <div className="no-print" style={{
              width: "380px", borderRight: "1px solid #cbd5e1",
              background: "#fff", display: "flex", flexDirection: "column",
              flexShrink: 0
            }}>
              <div style={{ padding: "16px", overflowY: "auto", flexGrow: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Section A: Thông tin chung */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#003087", fontSize: 12, paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Thông tin chung phụ lục
                    </h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Số phụ lục</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={plNo}
                          onChange={(e) => setPlNo(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Ngày lập</label>
                        <input
                          type="date"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={plDate}
                          onChange={(e) => setPlDate(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Địa điểm lập</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={plAddress}
                          onChange={(e) => setPlAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section B: Chi phí & Doanh thu */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#003087", fontSize: 12, paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Chi phí & Doanh thu cam kết
                    </h6>
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Chi phí thi công (CPTC)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border font-monospace fw-bold"
                          style={{ fontSize: 12 }}
                          value={plCptc}
                          onChange={(e) => handleCurrencyChange(e.target.value, setPlCptc)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Bằng chữ (CPTC)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={plCptcText}
                          onChange={(e) => setPlCptcText(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Doanh thu nhập hàng được hỗ trợ 100% CPTC</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border font-monospace"
                          style={{ fontSize: 12 }}
                          value={plRevenueMkt}
                          onChange={(e) => handleCurrencyChange(e.target.value, setPlRevenueMkt)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Bằng chữ (DT hỗ trợ)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={plRevenueMktText}
                          onChange={(e) => setPlRevenueMktText(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Doanh thu cam kết của Đại lý (Thỏa thuận)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border font-monospace"
                          style={{ fontSize: 12 }}
                          value={plRevenueCommit}
                          onChange={(e) => handleCurrencyChange(e.target.value, setPlRevenueCommit)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Bằng chữ (DT cam kết)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={plRevenueCommitText}
                          onChange={(e) => setPlRevenueCommitText(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section C: Thời gian thi công */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#000", fontSize: 12, borderBottom: "1.5px solid #475569", paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Thời gian & Tiến độ thi công
                    </h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Tổng thời gian (Ngày)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={plDurationDays}
                          onChange={(e) => {
                            setPlDurationDays(e.target.value);
                            const val = parseInt(e.target.value) || 0;
                            setPlMaxDelayDays(String(val + 4));
                          }}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Thời gian tối đa (Ngày)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={plMaxDelayDays}
                          onChange={(e) => setPlMaxDelayDays(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Timeline Đo đạc & Thiết kế 3D</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          placeholder="ví dụ: 18/06/2026 - 20/06/2026"
                          value={plTimeline1}
                          onChange={(e) => setPlTimeline1(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Timeline Chuẩn bị nguyên vật liệu</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          placeholder="ví dụ: 20/06/2026 - 22/06/2026"
                          value={plTimeline2}
                          onChange={(e) => setPlTimeline2(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Timeline Thi công, lắp đặt quầy kệ</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          placeholder="ví dụ: 22/06/2026 - 29/06/2026"
                          value={plTimeline3}
                          onChange={(e) => setPlTimeline3(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Timeline Lắp sản phẩm trưng bày</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          placeholder="ví dụ: 29/06/2026 - 02/07/2026"
                          value={plTimeline4}
                          onChange={(e) => setPlTimeline4(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Timeline Bàn giao, nghiệm thu</label>
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          placeholder="ví dụ: 02/07/2026"
                          value={plTimeline5}
                          onChange={(e) => setPlTimeline5(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section D: Tiến độ thanh toán */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#ef4444", fontSize: 12, paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Tiến độ thanh toán CPTC
                    </h6>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* Đợt 1 */}
                      <div className="border p-2 rounded-2 bg-light/30">
                        <div style={{ fontSize: 11, fontWeight: "bold", color: "#003087", marginBottom: 6 }}>Thanh toán Đợt 1</div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Mốc thời gian</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 11 }}
                              placeholder="Ký hđ & phụ lục"
                              value={plPhase1Date}
                              onChange={(e) => setPlPhase1Date(e.target.value)}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Tỷ lệ thanh toán</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 11 }}
                              value={plPhase1Rate}
                              onChange={(e) => setPlPhase1Rate(e.target.value)}
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Số tiền đợt 1</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border font-monospace"
                              style={{ fontSize: 11 }}
                              value={plPhase1Amount}
                              onChange={(e) => handleCurrencyChange(e.target.value, setPlPhase1Amount)}
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Số tiền đợt 1 bằng chữ</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 11 }}
                              value={plPhase1AmountText}
                              onChange={(e) => setPlPhase1AmountText(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Đợt 2 */}
                      <div className="border p-2 rounded-2 bg-light/30">
                        <div style={{ fontSize: 11, fontWeight: "bold", color: "#003087", marginBottom: 6 }}>Thanh toán Đợt 2</div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Mốc thời gian</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 11 }}
                              placeholder="Hoàn thiện bản vẽ 3D"
                              value={plPhase2Date}
                              onChange={(e) => setPlPhase2Date(e.target.value)}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Tỷ lệ thanh toán</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 11 }}
                              value={plPhase2Rate}
                              onChange={(e) => setPlPhase2Rate(e.target.value)}
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Số tiền đợt 2</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border font-monospace"
                              style={{ fontSize: 11 }}
                              value={plPhase2Amount}
                              onChange={(e) => handleCurrencyChange(e.target.value, setPlPhase2Amount)}
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Số tiền đợt 2 bằng chữ</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 11 }}
                              value={plPhase2AmountText}
                              onChange={(e) => setPlPhase2AmountText(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Đợt 3 */}
                      <div className="border p-2 rounded-2 bg-light/30">
                        <div style={{ fontSize: 11, fontWeight: "bold", color: "#003087", marginBottom: 6 }}>Thanh toán Đợt 3</div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Mốc thời gian</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 11 }}
                              placeholder="Bàn giao nghiệm thu"
                              value={plPhase3Date}
                              onChange={(e) => setPlPhase3Date(e.target.value)}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Tỷ lệ thanh toán</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 11 }}
                              value={plPhase3Rate}
                              onChange={(e) => setPlPhase3Rate(e.target.value)}
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Số tiền đợt 3</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border font-monospace"
                              style={{ fontSize: 11 }}
                              value={plPhase3Amount}
                              onChange={(e) => handleCurrencyChange(e.target.value, setPlPhase3Amount)}
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label small fw-bold text-secondary mb-0.5" style={{ fontSize: 9 }}>Số tiền đợt 3 bằng chữ</label>
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-2 shadow-none border"
                              style={{ fontSize: 11 }}
                              value={plPhase3AmountText}
                              onChange={(e) => setPlPhase3AmountText(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section E: Phạt chậm trễ */}
                  <div>
                    <h6 style={{ fontWeight: 800, color: "#000", fontSize: 12, borderBottom: "1.5px solid #475569", paddingBottom: 4, textTransform: "uppercase", marginBottom: 10 }}>
                      Mức phạt thi công chậm trễ
                    </h6>
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label small fw-bold text-secondary mb-1" style={{ fontSize: 10 }}>Thời gian tối đa cam kết trước phạt (Ngày)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm rounded-2 shadow-none border"
                          style={{ fontSize: 12 }}
                          value={plPenaltyMaxDelay}
                          onChange={(e) => setPlPenaltyMaxDelay(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: PDF/Print Preview Container */}
            <div style={{
              flexGrow: 1, padding: "30px 40px", overflowY: "auto",
              display: "flex", flexDirection: "column", alignItems: "center",
              background: "#cbd5e1", gap: 30
            }}>
              <div id="phuluc-print-doc" style={{
                display: "flex", flexDirection: "column", gap: 30
              }}>
                {renderPage1PL()}
                {renderPage2PL()}
              </div>
            </div>
          </div>
        </div>
      )}

      <BaoGiaSanitaryModal
        open={showTaoBaoGiaModal}
        onClose={() => {
          setShowTaoBaoGiaModal(false);
          setQuotationEditData(null);
        }}
        customer={mappedCustomerForQuotation}
        editData={quotationEditData}
        onSaved={handleQuotationSaved}
      />

      {/* Fullscreen Image Preview Overlay */}
      {previewImagesList && previewImagesList.length > 0 && (
        <div
          className="position-fixed d-flex flex-column align-items-center justify-content-center animate__animated animate__fadeIn"
          style={{
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            zIndex: 9999,
            backdropFilter: "blur(8px)"
          }}
          onClick={() => setPreviewImagesList(null)}
        >
          {/* Close Button */}
          <button
            type="button"
            className="position-absolute btn border-0 text-white shadow-none d-flex align-items-center justify-content-center"
            style={{
              top: "24px",
              right: "24px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              width: "44px",
              height: "44px",
              fontSize: "20px"
            }}
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImagesList(null);
            }}
          >
            <i className="bi bi-x-lg" />
          </button>

          {/* Main Content Area */}
          <div
            className="position-relative d-flex align-items-center justify-content-center px-4"
            style={{ width: "95vw", maxWidth: "1600px", height: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            {previewImagesList.length > 1 && (
              <button
                type="button"
                className="position-absolute btn border-0 text-white shadow-none d-flex align-items-center justify-content-center"
                style={{
                  left: "24px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  width: "48px",
                  height: "48px",
                  fontSize: "24px",
                  zIndex: 10
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImageIndex((prev) => (prev === 0 ? previewImagesList.length - 1 : prev - 1));
                }}
              >
                <i className="bi bi-chevron-left" />
              </button>
            )}

            {/* Displayed Image */}
            <img
              src={previewImagesList[previewImageIndex]}
              alt="Xem ảnh lớn"
              className="img-fluid rounded-3 shadow animate__animated animate__zoomIn"
              style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
            />

            {/* Next Button */}
            {previewImagesList.length > 1 && (
              <button
                type="button"
                className="position-absolute btn border-0 text-white shadow-none d-flex align-items-center justify-content-center"
                style={{
                  right: "24px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "50%",
                  width: "48px",
                  height: "48px",
                  fontSize: "24px",
                  zIndex: 10
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImageIndex((prev) => (prev === previewImagesList.length - 1 ? 0 : prev + 1));
                }}
              >
                <i className="bi bi-chevron-right" />
              </button>
            )}
          </div>

          {/* Dots indicator or Image Thumbnails indicator */}
          {previewImagesList.length > 1 && (
            <div className="d-flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
              {previewImagesList.map((url, idx) => (
                <button
                  key={url}
                  type="button"
                  className="border-0 p-0 rounded overflow-hidden transition-all"
                  style={{
                    width: "60px",
                    height: "60px",
                    opacity: previewImageIndex === idx ? 1 : 0.4,
                    border: previewImageIndex === idx ? "2px solid #0d6efd" : "none"
                  }}
                  onClick={() => setPreviewImageIndex(idx)}
                >
                  <img src={url} className="w-100 h-100 object-fit-cover" alt={`Thu nhỏ ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
