"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useToast, ToastContainer } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useSearchParams } from "next/navigation";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

const thStyle: React.CSSProperties = {
  padding: "6px 12px", textAlign: "left", fontSize: 11, fontWeight: 800,
  color: "var(--muted-foreground)", letterSpacing: "0.5px", textTransform: "uppercase",
  borderBottom: "2px solid var(--border)", whiteSpace: "nowrap",
  fontFamily: "'Montserrat', sans-serif",
};

const tdStyle: React.CSSProperties = {
  padding: "5px 12px", fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700, marginBottom: 7,
};

// ── Constants ─────────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

// Tính ngày đầu/cuối 4 tuần trong tháng
const HOLIDAYS = [
  { m: 1, d: 1, n: "Tết Dương lịch" },
  { m: 1, d: 9, n: "Ngày Học sinh - Sinh viên VN" },
  { m: 2, d: 3, n: "Thành lập Đảng CSVN" },
  { m: 2, d: 14, n: "Lễ Tình nhân (Valentine)" },
  { m: 2, d: 27, n: "Ngày Thầy thuốc VN" },
  { m: 3, d: 3, n: "Tết Nguyên tiêu" }, // Lưu ý: Năm 2026 Rằm tháng Giêng rơi vào 03/03 Dương lịch
  { m: 3, d: 8, n: "Quốc tế Phụ nữ" },
  { m: 3, d: 20, n: "Quốc tế Hạnh phúc" },
  { m: 3, d: 21, n: "Ngày Thơ ca / Hội chứng Down T.Giới" },
  { m: 3, d: 22, n: "Ngày Nước Thế giới" },
  { m: 3, d: 26, n: "Ngày thành lập Đoàn TNCS HCM" },
  { m: 3, d: 27, n: "Ngày Thể thao VN" },
  { m: 3, d: 28, n: "Truyền thống Dân quân Tự vệ" },
  { m: 4, d: 1, n: "Cá tháng Tư" },
  { m: 4, d: 21, n: "Ngày Sách VN" },
  { m: 4, d: 30, n: "Giải phóng Miền Nam" },
  { m: 5, d: 1, n: "Quốc tế Lao động" },
  { m: 5, d: 7, n: "Chiến thắng Điện Biên Phủ" },
  { m: 5, d: 15, n: "Thành lập Đội TNTP HCM" },
  { m: 5, d: 19, n: "Sinh nhật Bác Hồ" },
  { m: 6, d: 1, n: "Quốc tế Thiếu nhi" },
  { m: 6, d: 5, n: "Môi trường Thế giới" },
  { m: 6, d: 21, n: "Báo chí CMXHCN VN" },
  { m: 6, d: 28, n: "Ngày Gia đình VN" },
  { m: 7, d: 11, n: "Dân số Thế giới" },
  { m: 7, d: 27, n: "Thương binh Liệt sĩ" },
  { m: 7, d: 28, n: "Thành lập Công đoàn VN" },
  { m: 8, d: 19, n: "Cách mạng Tháng 8" },
  { m: 9, d: 2, n: "Quốc khánh 2/9" },
  { m: 10, d: 1, n: "Quốc tế Người cao tuổi" },
  { m: 10, d: 10, n: "Giải phóng Thủ đô" },
  { m: 10, d: 13, n: "Doanh nhân VN" },
  { m: 10, d: 20, n: "Phụ nữ Việt Nam" },
  { m: 10, d: 31, n: "Halloween" },
  { m: 11, d: 9, n: "Pháp luật VN" },
  { m: 11, d: 20, n: "Nhà giáo Việt Nam" },
  { m: 12, d: 1, n: "Phòng chống HIV/AIDS" },
  { m: 12, d: 22, n: "Quân đội Nhân dân VN" },
  { m: 12, d: 24, n: "Lễ Giáng sinh (Eve)" },
  { m: 12, d: 25, n: "Lễ Giáng sinh" },
];

function getHolidaysForWeek(month: number, startDay: number, endDay: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return HOLIDAYS
    .filter(h => h.m === month && h.d >= startDay && h.d <= endDay)
    .map(h => `${pad(h.d)}/${pad(h.m)} - ${h.n}`);
}

function getWeekRanges(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: number) => `${pad(d)}/${pad(month)}`;
  const ranges = [
    { start: 1, end: 7 },
    { start: 8, end: 14 },
    { start: 15, end: 21 },
    { start: 22, end: daysInMonth },
  ];
  return ranges.map(w => ({
    ...w,
    label: `${fmt(w.start)} – ${fmt(w.end)}`
  }));
}

const MONTHS_VI = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

const STATUS_TASK = [
  { value: "pending", label: "Chờ thực hiện", color: "#6b7280" },
  { value: "in_progress", label: "Đang làm", color: "#f59e0b" },
  { value: "done", label: "Hoàn thành", color: "#10b981" },
  { value: "cancelled", label: "Huỷ", color: "#C0392B" },
];

const TASK_TYPE_OPTIONS = [
  { value: "content", label: "Nội dung", color: "#003087" },
  { value: "design", label: "Thiết kế", color: "#f59e0b" },
  { value: "ads", label: "Quảng cáo", color: "#C0392B" },
  { value: "event", label: "Sự kiện", color: "#10b981" },
  { value: "seo", label: "SEO/SEM", color: "#3b82f6" },
  { value: "email", label: "Email", color: "#C9A84C" },
  { value: "video", label: "Video", color: "#ec4899" },
  { value: "other", label: "Khác", color: "#6b7280" },
];

const CATEGORY_OPTIONS = [
  { value: "Facebook", label: "Facebook", color: "#1877f2" },
  { value: "TikTok", label: "TikTok", color: "#010101" },
  { value: "YouTube", label: "YouTube", color: "#ff0000" },
  { value: "Instagram", label: "Instagram", color: "#e1306c" },
  { value: "Zalo", label: "Zalo", color: "#0068ff" },
  { value: "Website", label: "Website/Blog", color: "#10b981" },
  { value: "Email", label: "Email Marketing", color: "#f59e0b" },
  { value: "Offline", label: "Offline/Event", color: "#C9A84C" },
  { value: "SEO", label: "SEO/SEM", color: "#3b82f6" },
  { value: "PR", label: "PR/Báo chí", color: "#6b7280" },
];

// Nhóm đầu mục cố định
const TASK_GROUPS = [
  {
    value: "chu_de_thang", label: "Chủ đề tháng", color: "#003087", icon: "bi-star-fill",
    subGroups: [
      { value: "ngay_le", label: "Ngày lễ" },
      { value: "noi_dung", label: "Nội dung" },
      { value: "san_pham", label: "Sản phẩm" },
    ],
  },
  {
    value: "content", label: "Content", color: "#10b981", icon: "bi-file-text",
    subGroups: []
  },
  {
    value: "trade", label: "Trade", color: "#f59e0b", icon: "bi-bag",
    subGroups: []
  },
  {
    value: "seo", label: "SEO", color: "#3b82f6", icon: "bi-search",
    subGroups: []
  }
];

// ── Types ─────────────────────────────────────────────────────────────────────
type MTask = {
  id: string; monthlyPlanId: string; contentId?: string;
  title: string; description?: string;
  taskType?: string; category?: string; taskGroup?: string; taskSubGroup?: string;
  week1: boolean; week2: boolean; week3: boolean; week4: boolean;
  week1Content?: string; week2Content?: string; week3Content?: string; week4Content?: string;
  assigneeName?: string; channel?: string; format?: string; deadline?: string;
  status: string; sortOrder: number; budget?: number;
  content?: { id: string; title: string; theme: { title: string; color: string } };
};

type MMonthlyPlan = {
  id: string; year: number; month: number; employeeId: string; employeeName: string;
  team?: string; summary?: string; status: string; rejectedReason?: string;
  tasks: MTask[];
  constituentIds?: string[];
};

type AnnualContent = {
  id: string; title: string; channel?: string; format?: string; targetMonth: number;
  kpi?: string; assignedTeam?: string; themeTitle: string; themeColor: string;
};

type ProductCategory = { id: number; name: string; slug: string; parent: number; count: number; };

type TaskFormState = {
  title: string; description: string; taskType: string; category: string;
  taskGroup: string; taskSubGroup: string;
  week1: boolean; week2: boolean; week3: boolean; week4: boolean;
  assigneeName: string; status: string; budget: string | number;
};

const DEFAULT_TASK_FORM: TaskFormState = {
  title: "", description: "", taskType: "", category: "",
  taskGroup: "", taskSubGroup: "",
  week1: false, week2: false, week3: false, week4: false,
  assigneeName: "", status: "pending", budget: ""
};

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; icon: string; bg: string; color: string }> = {
    draft: { label: "Bản nháp", icon: "bi-pencil", bg: "rgba(107,114,128,0.12)", color: "#6b7280" },
    submitted: { label: "Chờ duyệt", icon: "bi-clock-history", bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
    approved: { label: "Đã duyệt", icon: "bi-check-circle-fill", bg: "rgba(16,185,129,0.12)", color: "#10b981" },
    rejected: { label: "Bị từ chối", icon: "bi-x-circle-fill", bg: "rgba(192,57,43,0.12)", color: "#C0392B" },
  };
  const c = cfg[status] || cfg.draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 99, background: c.bg, color: c.color }}>
      <i className={`bi ${c.icon}`} /> {c.label}
    </span>
  );
}



// ── Main Page Content ─────────────────────────────────────────────────────────
function PlanMonthlyContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const planIdParam = searchParams.get("id");
  const focusTaskParam = searchParams.get("focusTask");

  const [year, setYear] = useState(planIdParam ? CURRENT_YEAR : CURRENT_YEAR); // Will be updated by load if param exist
  const [month, setMonth] = useState(planIdParam ? CURRENT_MONTH : CURRENT_MONTH);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [plan, setPlan] = useState<MMonthlyPlan | null>(null);
  const [annualContents, setAnnualContents] = useState<AnnualContent[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [employees, setEmployees] = useState<{ id: string, name: string, deptCode: string, deptName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);
  const [confirmAdjust, setConfirmAdjust] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const toast = useToast();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editTask, setEditTask] = useState<MTask | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>(DEFAULT_TASK_FORM);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (focusTaskId) {
      setTimeout(() => {
        const el = document.getElementById(`input-task-${focusTaskId}`);
        if (el) {
          el.focus();
        }
      }, 50);
    }
  }, [focusTaskId, plan?.tasks?.length]);
  const [yearlyGroups, setYearlyGroups] = useState<any[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allAvailableGroups = useMemo(() => {
    const allTasks = plan?.tasks || [];

    const baseGroups = [
      TASK_GROUPS[0],
      ...(yearlyGroups.length > 0 ? yearlyGroups.map(g => ({ ...g, subGroups: [...(g.subGroups || [])] })) : TASK_GROUPS.slice(1).map(g => ({ ...g, subGroups: [...(g.subGroups || [])] }))),
    ];

    allTasks.forEach((t: any) => {
      if (t.taskType === "group" && t.taskGroup) {
        const parent = baseGroups.find(g => g.value === t.taskGroup);
        if (parent) {
          const normalizedTitle = t.title.trim().toUpperCase();
          const existing = parent.subGroups.find((sg: any) =>
            sg.label.trim().toUpperCase() === normalizedTitle || sg.value === t.id
          );
          if (!existing) {
            parent.subGroups.push({
              label: t.title,
              value: normalizedTitle
            });
          }
        }
      }
    });

    const customGroups = allTasks
      .filter((t: any) => t.taskType === "group" && !t.taskGroup)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((t: any) => ({
        value: t.id,
        label: t.title || "Hạng mục mới",
        color: "#C9A84C",
        icon: "bi-plus-lg",
        subGroups: [] as any[],
        isCustom: true
      }));

    console.log("allAvailableGroups - customGroups count:", customGroups.length);
    return [...baseGroups, ...customGroups];
  }, [plan, yearlyGroups]);

  const idToTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    (plan?.tasks || []).forEach((t: any) => {
      if (t.taskType === "group") map[t.id] = t.title;
    });
    return map;
  }, [plan?.tasks]);
  const toggleTaskSelection = (taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);

      const toggleNodeAndChildren = (id: string, isCheck: boolean) => {
        if (isCheck) next.add(id); else next.delete(id);

        // Càn quét tìm tất cả con cháu trực tiếp hoặc gián tiếp
        const children = plan?.tasks.filter(t => t.taskGroup === id || t.taskSubGroup === id) || [];
        for (const child of children) {
          if (next.has(child.id) !== isCheck) {
            toggleNodeAndChildren(child.id, isCheck);
          }
        }
      };

      toggleNodeAndChildren(taskId, checked);
      return next;
    });
  };

  // Custom modal specifically for 'Nội dung'
  const [showNoiDungModal, setShowNoiDungModal] = useState(false);
  const [noiDungForm, setNoiDungForm] = useState({ title: "", content: "" });

  const toggleGroup = (val: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (next.has(val)) next.delete(val); else next.add(val);
    return next;
  });

  const [showNoiDungDetail, setShowNoiDungDetail] = useState(false);
  const [viewingNoiDungTask, setViewingNoiDungTask] = useState<MTask | null>(null);

  // Trạng thái cho popover Sản phẩm
  const [editingSanPham, setEditingSanPham] = useState<{ taskId: string, field: string, selected: Set<string> } | null>(null);

  // Trạng thái modal Print
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Company Info for Print
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const loadCompanyInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/company");
      if (res.ok) setCompanyInfo(await res.json());
    } catch { }
  }, []);

  const loadPlan = useCallback(async () => {
    if (!selectedEmployeeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const isAggregated = selectedEmployeeId === "all";
      const url = `/api/marketing/monthly-plan?year=${year}&month=${month}&employeeId=${isAggregated ? "" : selectedEmployeeId}${isAggregated ? "&aggregated=true" : ""}`;
      console.log("Fetching plan from:", url);
      const res = await fetch(url);
      const data = await res.json();
      console.log("Plan data received:", data);
      const fetchedPlan = (data as MMonthlyPlan[])[0];
      if (fetchedPlan) {
        setPlan(fetchedPlan);
      } else {
        setPlan({ id: "", year, month, status: "draft", tasks: [] } as any);
      }
    } catch (err) {
      console.error("Load plan error:", err);
      setPlan({ id: "", year, month, status: "draft", tasks: [] } as any);
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedEmployeeId]);

  const currentEmp = employees.find(e => e.id === selectedEmployeeId);
  const employeeName = currentEmp?.name || plan?.employeeName || session?.user?.name || "Nhân viên Marketing";

  const loadYearlyGroups = useCallback(async () => {
    try {
      const res = await fetch(`/api/marketing/plan/yearly?year=${year}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.plans) && data.plans.length > 0) {
        const activePlan = data.plans.find((p: any) => p.isCurrent) || data.plans[0];
        const topLevelTasks = (activePlan.tasks || [])
          .filter((t: any) => !t.parentId)
          .map((t: any) => ({
            value: t.name.replace(/\s+/g, "").toLowerCase(),
            label: t.name,
            color: t.color || "#10b981",
            icon: "bi-layers",
            subGroups: []
          }));
        setYearlyGroups(topLevelTasks);
      } else {
        setYearlyGroups([]);
      }
    } catch (err) {
      console.error("Load yearly groups error:", err);
      setYearlyGroups([]);
    }
  }, [year]);

  const loadAnnualContents = useCallback(async () => {
    try {
      const planRes = await fetch(`/api/marketing/annual-plan?year=${year}`);
      const plans = await planRes.json();
      if (plans.length > 0 && plans[0].status === "approved") {
        const contentRes = await fetch(`/api/marketing/contents?planId=${plans[0].id}`);
        const contents = await contentRes.json();
        setAnnualContents(contents.filter((c: AnnualContent) => c.targetMonth === month));
      } else { setAnnualContents([]); }
    } catch { setAnnualContents([]); }
  }, [year, month]);

  useEffect(() => {
    const init = async () => {
      if (planIdParam) {
        setLoading(true);
        try {
          const res = await fetch(`/api/marketing/monthly-plan/${planIdParam}`);
          const data = await res.json();
          if (data && !data.error) {
            setPlan(data);
            setYear(data.year);
            setMonth(data.month);
            // set selectedEmployeeId so that subsequent data loads work
            setSelectedEmployeeId(data.employeeId);
          }
        } finally { setLoading(false); }
      }
      
      loadYearlyGroups();
      loadAnnualContents();
      loadCompanyInfo();

      // Load categories
      fetch("/api/seajong/categories").then(r => r.json()).then(data => {
        if (Array.isArray(data)) setProductCategories(data);
        else if (data.categories) setProductCategories(data.categories);
        else if (data.data) setProductCategories(data.data);
      }).catch(console.error);

      // Load employees
      fetch("/api/hr/employees?pageSize=100").then(r => r.json()).then(data => {
        const empList = data.employees;
        if (Array.isArray(empList)) {
          const mapped = empList.map((d: any) => ({
            id: d.id, name: d.fullName || d.name,
            deptCode: d.departmentCode || "", deptName: d.departmentName || ""
          }));
          const marketingEmps = mapped.filter((e: any) =>
            e.deptCode?.toLowerCase().includes("mkt") || e.deptName?.toLowerCase().includes("marketing")
          );
          setEmployees(marketingEmps.length > 0 ? marketingEmps : mapped);

          // Khởi tạo selectedEmployeeId từ session nếu chưa có
          if (!selectedEmployeeId && !planIdParam) {
            const isBoss = (session?.user as any)?.role === "MANAGER" || (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.positionName?.toUpperCase()?.includes("TRƯỞNG");
            if (isBoss) {
              setSelectedEmployeeId("all");
            } else if (session?.user?.employeeId || session?.user?.id) {
              setSelectedEmployeeId((session.user as any).employeeId || (session.user as any).id);
            }
          }
        }
      }).catch(console.error);
    };

    init();
  }, [planIdParam, loadAnnualContents, loadCompanyInfo, loadYearlyGroups]);

  // Effect to load plan when selectedEmployeeId changes
  useEffect(() => {
    if (selectedEmployeeId && !planIdParam) {
      loadPlan();
    }
  }, [selectedEmployeeId, loadPlan, planIdParam]);

  // Effect to focus task
  useEffect(() => {
    if (!focusTaskParam || !plan || loading) return;

    // Expand ALL groups to ensure the target task row is rendered
    setCollapsedGroups(new Set());

    let attempts = 0;
    const maxAttempts = 20;

    const tryScroll = () => {
      const el = document.getElementById(`task-item-${focusTaskParam}`);
      if (!el) {
        if (attempts < maxAttempts) { attempts++; setTimeout(tryScroll, 200); }
        return;
      }

      const row = el.closest('tr') as HTMLElement | null;
      const target = row || el;

      // Scroll the row to vertical center of the table container
      const container = scrollContainerRef.current;
      if (container) {
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const targetCenter = container.scrollTop + (targetRect.top - containerRect.top) + (targetRect.height / 2);
        const scrollTo = targetCenter - container.clientHeight / 2;
        container.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Capture original inline styles BEFORE overriding
      const origRowBg = target.style.background;
      const origRowShadow = target.style.boxShadow;
      const origElBg = el.style.background;
      const origElOutline = el.style.outline;
      const origElOffset = el.style.outlineOffset;

      // Apply highlight
      target.style.transition = 'background 0.3s, box-shadow 0.3s';
      target.style.background = 'rgba(99, 102, 241, 0.12)';
      target.style.boxShadow = 'inset 0 0 0 2px #6366f1';
      el.style.outline = '2px solid #6366f1';
      el.style.outlineOffset = '2px';

      // Restore exact original styles after animation
      setTimeout(() => {
        target.style.background = origRowBg;
        target.style.boxShadow = origRowShadow;
        el.style.background = origElBg;
        el.style.outline = origElOutline;
        el.style.outlineOffset = origElOffset;
      }, 3000);
    };

    const timer = setTimeout(tryScroll, 500);
    return () => clearTimeout(timer);
  }, [focusTaskParam, plan, loading]);

  const ensurePlanId = async (): Promise<string | null> => {
    if (plan && plan.id && plan.id !== "aggregated") return plan.id;

    const targetEmpId = selectedEmployeeId === "all"
      ? (session?.user as any)?.employeeId || session?.user?.id
      : selectedEmployeeId;

    if (!targetEmpId) return null;

    const emp = employees.find(e => e.id === targetEmpId);

    try {
      const res = await fetch("/api/marketing/monthly-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year, month,
          employeeId: targetEmpId,
          employeeName: emp?.name || "Nhân viên MKT"
        }),
      });

      if (res.status === 409) {
        const fetchRes = await fetch(`/api/marketing/monthly-plan?year=${year}&month=${month}&employeeId=${targetEmpId}`);
        const existingPlans = await fetchRes.json();
        if (existingPlans && existingPlans.length > 0) {
          return existingPlans[0].id;
        }
      }

      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (err) {
      console.error("ensurePlanId error:", err);
    }
    return null;
  };

  const handleCreatePlan = async () => {
    setSaving(true);
    try {
      const pId = await ensurePlanId();
      if (pId) await loadPlan();
      else alert("Lỗi tạo kế hoạch");
    } finally { setSaving(false); }
  };

  const handleSavePlan = async () => {
    if (!plan?.id) return;
    setSaving(true);
    try {
      await fetch(`/api/marketing/monthly-plan/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "draft",
          summary: plan.summary
        }),
      });
      toast.success("Thành công", "Đã lưu bản nháp kế hoạch");
      await loadPlan();
    } catch (error: any) {
      toast.error("Lỗi", "Không thể lưu bản nháp");
    } finally { setSaving(false); }
  };

  const handleAdjust = async () => {
    if (!plan?.id) return;
    setConfirmAdjust(true);
  };

  const doAdjust = async () => {
    if (!plan?.id) return;
    setSaving(true);
    try {
      // In monthly plan, we'll implement "adjust" as moving back to draft for now
      // unless we implement full versioning. Moving back to draft is the simplest "adjustment".
      const res = await fetch(`/api/marketing/monthly-plan/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });

      if (res.ok) {
        const updatedPlan = await res.json();
        setPlan(updatedPlan);
        toast.success("Thành công", "Kế hoạch đã được chuyển về bản nháp để điều chỉnh");
      } else {
        toast.error("Lỗi", "Không thể thực hiện điều chỉnh");
      }
    } catch (error: any) {
      console.error("doAdjust error:", error);
      toast.error("Lỗi", "Không thể thực hiện điều chỉnh");
    } finally {
      setSaving(false);
      setConfirmAdjust(false);
    }
  };

  const handleInitProductTask = async (groupVal: string, field: string) => {
    const pId = await ensurePlanId();
    if (!pId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/marketing/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyPlanId: pId,
          title: "Sản phẩm",
          taskGroup: groupVal,
          taskSubGroup: "san_pham",
          sortOrder: plan?.tasks?.length || 0,
        }),
      });
      const data = await res.json();
      await loadPlan();
      setEditingSanPham({ taskId: data.id, field, selected: new Set() });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAll = async () => {
    if (!plan || !isAggregated || !plan.constituentIds) return;
    if (!confirm("Bạn có chắc chắn muốn duyệt và trình Giám đốc kế hoạch cho TẤT CẢ nhân viên không?")) return;

    setSaving(true);
    try {
      await Promise.all(plan.constituentIds.map(id =>
        fetch(`/api/marketing/monthly-plan/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        })
      ));
      toast.success("Thành công", "Đã trình Giám đốc kế hoạch của cả phòng");
      await loadPlan();
    } catch (err) {
      toast.error("Lỗi", "Không thể trình duyệt toàn bộ kế hoạch");
    } finally { setSaving(false); }
  };

  const handleChangeStatus = async (status: string) => {
    const pId = await ensurePlanId();
    if (!pId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/marketing/monthly-plan/${pId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlan(updated);
        toast.success("Thành công", "Đã cập nhật trạng thái");
      } else {
        toast.error("Lỗi", "Không thể cập nhật trạng thái");
      }
    } catch (err) {
      console.error("Status change error:", err);
      toast.error("Lỗi", "Không thể cập nhật trạng thái");
    } finally { setSaving(false); }
  };

  const handleSaveNoiDung = async () => {
    if (!noiDungForm.title.trim()) return;
    const pId = await ensurePlanId();
    if (!pId) return;
    setSaving(true);
    try {
      const payload = {
        monthlyPlanId: pId,
        title: noiDungForm.title,
        description: noiDungForm.content || null,
        taskType: "content",
        category: "content",
        taskGroup: "chu_de_thang",
        taskSubGroup: "noi_dung",
        status: "pending",
        sortOrder: plan?.tasks?.length || 0,
      };
      const res = await fetch(`/api/marketing/tasks`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errText = await res.text();
        let errJson = null;
        try { errJson = JSON.parse(errText); } catch { }
        throw new Error(errJson?.error || "Server error");
      }
      setShowNoiDungModal(false);
      setNoiDungForm({ title: "", content: "" });
      await loadPlan();
    } catch (error: any) {
      alert("Lỗi lưu nội dung: " + error.message);
    } finally { setSaving(false); }
  };

  const handleDeleteNoiDung = async (id: string) => {
    if (!confirm("Xoá nội dung này?")) return;
    setSaving(true);
    try {
      await fetch(`/api/marketing/tasks/${id}`, { method: "DELETE" });
      await loadPlan();
      setShowNoiDungDetail(false);
      setViewingNoiDungTask(null);
    } finally { setSaving(false); }
  };

  const handleUpdateNoiDung = async () => {
    if (!viewingNoiDungTask || !viewingNoiDungTask.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: viewingNoiDungTask.title,
        description: viewingNoiDungTask.description || null,
      };
      await fetch(`/api/marketing/tasks/${viewingNoiDungTask.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadPlan();
      setShowNoiDungDetail(false);
      setViewingNoiDungTask(null);
    } catch (error: any) {
      alert("Lỗi cập nhật: " + error.message);
    } finally { setSaving(false); }
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) return;
    const pId = await ensurePlanId();
    if (!pId) return;
    setSaving(true);
    try {
      const payload = {
        title: taskForm.title, description: taskForm.description,
        taskType: taskForm.taskType || null, category: taskForm.category || null,
        taskGroup: taskForm.taskGroup || null,
        taskSubGroup: taskForm.taskSubGroup || null,
        week1: taskForm.week1,
        week2: taskForm.week2,
        week3: taskForm.week3,
        week4: taskForm.week4,
        assigneeName: taskForm.assigneeName || null,
        status: taskForm.status || "pending",
        budget: taskForm.budget ? Number(taskForm.budget) : 0,
      };
      if (editTask) {
        await fetch(`/api/marketing/tasks/${editTask.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/marketing/tasks", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, monthlyPlanId: pId, sortOrder: plan?.tasks?.length || 0 }),
        });
      }
      await loadPlan();
      setShowTaskForm(false); setEditTask(null); setTaskForm(DEFAULT_TASK_FORM);
    } finally { setSaving(false); }
  };

  // Inline save week content
  const handleSaveWeekContent = async (taskId: string, field: string, val: string) => {
    await fetch(`/api/marketing/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: val || null }),
    });
    await loadPlan();
  };

  const handleQuickAddTopLevelGroup = async () => {
    const pId = await ensurePlanId();
    if (!pId) return;
    setSaving(true);
    try {
      console.log("Creating task with pId:", pId);
      const res = await fetch("/api/marketing/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyPlanId: pId,
          title: "Hạng mục mới",
          taskGroup: null,
          taskSubGroup: null,
          taskType: "group",
          sortOrder: (plan?.tasks?.length || 0) + 100, // Ensure it's at the end
          status: "pending",
        }),
      });
      const data = await res.json();
      console.log("Task created response:", data);
      if (data && data.id) {
        setFocusTaskId(data.id);
        setPlan((prev: any) => {
          if (!prev) return prev;
          return { ...prev, tasks: [...(prev.tasks || []), data] };
        });
        toast.success("Thành công", "Đã thêm hạng mục mới ở cuối bản kế hoạch");
      }
      await loadPlan();
    } catch (err: any) {
      toast.error("Lỗi", "Không thể thêm hạng mục mới: " + err.message);
    } finally { setSaving(false); }
  };

  const handleQuickAddSubTask = async (taskGroup: string, taskSubGroup: string) => {
    const pId = await ensurePlanId();
    if (!pId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/marketing/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyPlanId: pId,
          title: "",
          taskGroup,
          taskSubGroup: taskSubGroup || null,
          sortOrder: plan?.tasks?.length || 0,
          status: "pending",
        }),
      });
      const data = await res.json();
      if (data && data.id) {
        setFocusTaskId(data.id);
        setPlan((prev: any) => {
          if (!prev) return prev;
          return { ...prev, tasks: [...(prev.tasks || []), data] };
        });
      }
      await loadPlan();
    } catch (err: any) {
      toast.error("Lỗi", "Không thể thêm công việc con: " + err.message);
    } finally { setSaving(false); }
  };


  const handleDeleteTask = async (id: string) => {
    if (!confirm("Xoá công việc này?")) return;
    await fetch(`/api/marketing/tasks/${id}`, { method: "DELETE" });
    await loadPlan();
  };

  const handleImportContent = async (content: AnnualContent) => {
    const pId = await ensurePlanId();
    if (!pId) return;
    setSaving(true);
    try {
      await fetch("/api/marketing/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyPlanId: pId, contentId: content.id,
          title: content.title, category: content.channel || null,
          sortOrder: plan?.tasks?.length || 0,
        }),
      });
      await loadPlan();
    } finally { setSaving(false); }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedTaskIds);
      await Promise.all(ids.map(id => fetch(`/api/marketing/tasks/${id}`, { method: "DELETE" })));
      setSelectedTaskIds(new Set());
      await loadPlan();
      toast.success("Thành công", `Đã xoá ${ids.length} công việc`);
    } catch (err) {
      toast.error("Lỗi", "Không thể xoá các công việc đã chọn");
    } finally {
      setIsBulkDeleting(false);
      setConfirmBulkDel(false);
    }
  };

  const isAggregated = selectedEmployeeId === "all";
  const canEdit = plan?.status === "draft";
  const alreadyImportedIds = new Set(plan?.tasks.map(t => t.contentId).filter(Boolean));
  const weekRanges = getWeekRanges(year, month);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader title="Kế hoạch tháng" description="Bảng kế hoạch công việc marketing theo tuần" color="indigo" icon="bi-table" />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

        {/* COMPACT MODERN HEADER GROUP */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          {/* Left side: Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="app-input" style={{ appearance: "none", height: 34, paddingLeft: 14, paddingRight: 32, width: 90, fontWeight: 700, fontSize: 13, border: "1px solid rgba(0,48,135,0.15)", borderRadius: 8, color: "#003087", cursor: "pointer", background: "rgba(0,48,135,0.02)", outline: "none", transition: "all 0.2s" }} onFocus={e => e.currentTarget.style.borderColor = "#003087"} onBlur={e => e.currentTarget.style.borderColor = "rgba(0,48,135,0.15)"}>
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <i className="bi bi-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#003087", fontSize: 10, fontWeight: 800 }} />
            </div>

            {employees.length > 0 && (
              <div style={{ position: "relative" }}>
                <select
                  value={selectedEmployeeId || ""}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="app-input"
                  style={{
                    appearance: "none", height: 34, paddingLeft: 34, paddingRight: 32,
                    minWidth: 160, fontWeight: 700, fontSize: 13,
                    border: "1px solid rgba(0,48,135,0.15)", borderRadius: 8,
                    color: "#003087", cursor: "pointer", background: "rgba(0,48,135,0.02)",
                    outline: "none", transition: "all 0.2s"
                  }}
                >
                  {(session?.user as any)?.role === "MANAGER" || (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.positionName?.toUpperCase()?.includes("TRƯỞNG") ? (
                    <option value="all">👥 Tất cả nhân viên</option>
                  ) : null}
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <i className="bi bi-person" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#003087", fontSize: 14 }} />
                <i className="bi bi-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#003087", fontSize: 10, fontWeight: 800 }} />
              </div>
            )}

            <div style={{ width: 1, height: 20, background: "var(--border)" }} />

            <div style={{ display: "flex", gap: 2, background: "rgba(100,116,139,0.05)", padding: 3, borderRadius: 10, border: "1px solid rgba(100,116,139,0.05)" }}>
              {MONTHS_VI.map((m, i) => (
                <button key={i + 1} onClick={() => setMonth(i + 1)}
                  style={{
                    padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12,
                    border: "none",
                    background: (i + 1) === month ? "linear-gradient(135deg, #003087, #001f5c)" : "transparent",
                    color: (i + 1) === month ? "white" : "var(--muted-foreground)",
                    boxShadow: (i + 1) === month ? "0 2px 8px rgba(0,48,135,0.2)" : "none",
                    transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                  }}>T{i + 1}</button>
              ))}
            </div>
          </div>

          {/* Right side: Status and Workflow Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            {plan && plan.status === "draft" && (
              <button onClick={handleSavePlan} disabled={saving}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #3b82f6", background: "transparent", color: "#3b82f6", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(59, 130, 246, 0.05)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <i className="bi bi-save" /> Lưu nháp
              </button>
            )}

            {plan && plan.status === "draft" && (plan?.tasks?.length || 0) > 0 && (
              <button onClick={() => handleChangeStatus("submitted")} disabled={saving}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(245,158,11,0.2)", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                <i className="bi bi-send" /> Trình duyệt
              </button>
            )}

            {plan && plan.status === "approved" && (
              <button onClick={handleQuickAddTopLevelGroup} disabled={saving}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #003087", background: "transparent", color: "#003087", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(0, 48, 135, 0.05)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <i className="bi bi-plus-lg" /> Thêm công việc
              </button>
            )}

            {plan && plan.status === "submitted" && (
              <button onClick={() => isAggregated ? handleApproveAll() : handleChangeStatus("approved")} disabled={saving}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(16,185,129,0.2)", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                <i className="bi bi-check-all" /> Phê duyệt
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
            <div style={{ width: 40, height: 40, border: "4px solid var(--muted)", borderTopColor: "#003087", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : !plan || (plan.id === "" && !isAggregated) ? (
          <div className="app-card" style={{ padding: "60px 40px", borderRadius: 20, textAlign: "center", border: "2px dashed var(--border)" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(0,48,135,0.1)", color: "#003087", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>
              <i className="bi bi-table" />
            </div>
            <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800 }}>Chưa có kế hoạch {MONTHS_VI[month - 1]} {year}</h3>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
              Tạo bảng kế hoạch công việc marketing tháng này theo từng tuần.
            </p>
            <button onClick={handleCreatePlan} disabled={saving}
              style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #003087, #001f5c)", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,48,135,0.35)" }}>
              <i className="bi bi-plus-circle me-2" />Tạo kế hoạch {MONTHS_VI[month - 1]}
            </button>
          </div>
        ) : (
          <>

            {/* TOOLBAR */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 16, padding: "0 4px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 10, color: "var(--foreground)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, rgba(0,48,135,0.1), rgba(0,48,135,0.02))", color: "#003087", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="bi bi-table" style={{ fontSize: 16 }} />
                  </div>
                  Bảng kế hoạch công việc tháng {month}
                  {plan && <StatusBadge status={plan.status} />}
                </h3>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {selectedTaskIds.size > 0 && (
                  <button onClick={() => setConfirmBulkDel(true)} disabled={saving || isBulkDeleting}
                    style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #dc2626", background: "rgba(220, 38, 38, 0.05)", color: "#dc2626", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(220, 38, 38, 0.05)"}>
                    <i className="bi bi-trash" /> Xóa {selectedTaskIds.size}
                  </button>
                )}

                {canEdit && annualContents.length > 0 && (
                  <button onClick={() => setShowImportPanel(!showImportPanel)}
                    style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)", color: "#10b981", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.12)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,0.06)"}>
                    <i className="bi bi-cloud-download" /> KH năm ({annualContents.length})
                  </button>
                )}

                {plan && plan.status !== "draft" && (
                  <button onClick={handleAdjust} disabled={saving}
                    style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(59, 130, 246, 0.3)", background: "rgba(59, 130, 246, 0.06)", color: "#3b82f6", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(59, 130, 246, 0.12)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(59, 130, 246, 0.06)"}>
                    <i className="bi bi-pencil-square" /> Điều chỉnh
                  </button>
                )}

                {canEdit && (
                  <button onClick={handleQuickAddTopLevelGroup}
                    style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #003087, #001f5c)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(0,48,135,0.3)", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                    <i className="bi bi-plus-lg" /> Thêm công việc
                  </button>
                )}

                <button onClick={() => setShowPrintModal(true)}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"} onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}>
                  <i className="bi bi-printer" style={{ color: "#64748b" }} /> In
                </button>
              </div>
            </div>

            {/* IMPORT PANEL */}
            <AnimatePresence>
              {showImportPanel && annualContents.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden", marginBottom: 14 }}>
                  <div style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.04)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 10 }}>
                      <i className="bi bi-download me-2" />Nội dung từ kế hoạch năm — {MONTHS_VI[month - 1]} {year}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {annualContents.map(c => {
                        const imported = alreadyImportedIds.has(c.id);
                        return (
                          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 13px", background: "var(--card)", borderRadius: 9, border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.themeColor, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{c.themeTitle}</div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.title}</div>
                              </div>
                            </div>
                            <button onClick={() => !imported && handleImportContent(c)} disabled={imported || saving}
                              style={{ padding: "5px 13px", borderRadius: 7, border: "none", background: imported ? "var(--muted)" : "#10b981", color: imported ? "var(--muted-foreground)" : "white", fontWeight: 700, fontSize: 12, cursor: imported ? "default" : "pointer" }}>
                              {imported ? <><i className="bi bi-check me-1" />Đã nhập</> : <><i className="bi bi-download me-1" />Nhập</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MAIN TABLE */}

            <div className="app-card" style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
              <div ref={scrollContainerRef} style={{ overflow: "auto", maxHeight: "calc(100vh - 260px)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 36 }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "19%" }} />
                    <col style={{ width: "19%" }} />
                    <col style={{ width: "19%" }} />
                    <col style={{ width: "19%" }} />
                  </colgroup>
                  <thead style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--card)" }}>
                    <tr style={{ background: "linear-gradient(135deg, rgba(0,48,135,0.08), rgba(201,168,76,0.05))" }}>
                      <th style={{ ...thStyle, textAlign: "center" }}>#</th>
                      <th style={thStyle}>Công việc</th>
                      {["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"].map((w, i) => (
                        <th key={w} style={{ ...thStyle, textAlign: "center", borderLeft: "1px solid var(--border)" }}>
                          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <span style={{ color: "#003087" }}>{w}</span>
                            <span style={{ fontSize: 10, fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: 0 }}>
                              {weekRanges[i].label}
                            </span>
                          </span>
                        </th>
                      ))}

                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      return allAvailableGroups.map((group, gIdx) => {
                        const groupTasks = (plan?.tasks || []).filter(t => t.taskGroup === group.value);
                        const hasSubGroups = (group.subGroups && group.subGroups.length > 0) || groupTasks.length > 0;
                        const isCollapsed = collapsedGroups.has(group.value);

                        const buildPackedWeekCells = (packedRow: MTask[]) => {
                          const cells: { active: boolean; span: number; task?: MTask }[] = [];
                          let i = 0;
                          while (i < 4) {
                            const taskHere = packedRow.find(t =>
                              (i === 0 && t.week1) ||
                              (i === 1 && t.week2) ||
                              (i === 2 && t.week3) ||
                              (i === 3 && t.week4)
                            );
                            if (taskHere) {
                              let span = 1;
                              while (i + span < 4) {
                                const nextW = i + span;
                                if ((nextW === 1 && taskHere.week2) || (nextW === 2 && taskHere.week3) || (nextW === 3 && taskHere.week4)) {
                                  span++;
                                } else {
                                  break;
                                }
                              }
                              cells.push({ active: true, span, task: taskHere });
                              i += span;
                            } else {
                              cells.push({ active: false, span: 1 });
                              i++;
                            }
                          }
                          return cells;
                        };

                        return (
                          <React.Fragment key={group.value}>
                            {/* Group header row */}
                            <tr
                              style={{ background: `${group.color}12`, borderTop: gIdx === 0 ? "none" : "2px solid var(--border)", cursor: hasSubGroups ? "pointer" : "default" }}
                              onClick={(e) => {
                                if (!(e.target as HTMLElement).closest('.group-checkbox')) {
                                  hasSubGroups && toggleGroup(group.value)
                                }
                              }}
                            >
                              <td style={{ ...tdStyle, textAlign: "center", color: group.color, fontSize: 12, fontWeight: 800, verticalAlign: "middle" }}>
                                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
                                  {(group as any).isCustom ? (
                                    <input
                                      className="group-checkbox"
                                      title="Chọn để xóa"
                                      type="checkbox"
                                      checked={selectedTaskIds.has(group.value)}
                                      onChange={(e) => toggleTaskSelection(group.value, e.target.checked)}
                                      style={{ width: 14, height: 14, cursor: "pointer", marginRight: 4 }}
                                    />
                                  ) : (
                                    <span>{gIdx + 1}</span>
                                  )}
                                  {hasSubGroups && (
                                    <i className={`bi bi-chevron-${isCollapsed ? "right" : "down"}`}
                                      style={{ fontSize: 11, transition: "transform 0.2s", opacity: 0.7 }} />
                                  )}
                                </div>
                              </td>
                              <td style={{ ...tdStyle, verticalAlign: "middle" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 12, color: group.color, textTransform: "uppercase", letterSpacing: "0.5px", width: "100%" }}>
                                    {(group as any).isCustom ? (
                                      <div style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
                                        <input
                                          id={`input-task-${group.value}`}
                                          type="text"
                                          defaultValue={group.label}
                                          placeholder="TÊN HẠNG MỤC..."
                                          autoFocus={focusTaskId === group.value}
                                          onBlur={(e) => {
                                            if (e.target.value !== group.label) {
                                              handleSaveWeekContent(group.value, "title", e.target.value);
                                            }
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", outline: "none", textTransform: "uppercase", width: "100%", letterSpacing: "inherit" }}
                                        />
                                        <i
                                          className={`bi ${group.icon}`}
                                          style={{ fontSize: 14, marginLeft: 8, cursor: "pointer", color: group.color }}
                                          title={`Thêm công việc ${group.label}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickAddSubTask(group.value, "");
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <i className={`bi ${group.icon}`} style={{ fontSize: 12 }} />
                                        {group.label}
                                      </>
                                    )}
                                  </span>
                                  {canEdit && group.value !== "chu_de_thang" && (
                                    <button
                                      type="button"
                                      title={`Thêm công việc ${group.label}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (group.value !== "chu_de_thang") {
                                          handleQuickAddSubTask(group.value, "");
                                        } else {
                                          setEditTask(null);
                                          setTaskForm({ ...DEFAULT_TASK_FORM, taskGroup: group.value });
                                          setShowTaskForm(true);
                                        }
                                      }}
                                      style={{ background: "transparent", border: "none", color: group.color, cursor: "pointer", padding: "2px 6px", display: "flex", alignItems: "center" }}>
                                      <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />
                                    </button>
                                  )}
                                </div>
                              </td>
                              {[0, 1, 2, 3].map(w => <td key={w} style={{ borderLeft: "1px solid var(--border)" }} />)}
                            </tr>

                            {hasSubGroups && !isCollapsed && group.subGroups.map((sub: any, sIdx: number) => {
                              const subTasks = plan?.tasks?.filter(t => {
                                if (t.taskGroup !== group.value) return false;
                                if (!t.taskSubGroup) return false;
                                if (t.taskSubGroup === sub.value) return true;
                                const groupTitle = idToTitleMap[t.taskSubGroup];
                                return groupTitle && groupTitle.trim().toUpperCase() === sub.value;
                              }) || [];
                              const isAggregatedView = selectedEmployeeId === "all" || plan?.id === "aggregated";
                              const isSpecialSub = sub.value === "noi_dung" || sub.value === "san_pham" || sub.value === "ngay_le";

                              const packedRows: MTask[][] = [];
                              if (!isSpecialSub) {
                                for (const task of subTasks) {
                                  let placed = false;
                                  for (const row of packedRows) {
                                    const overlaps = row.some(rTask =>
                                      (task.week1 && rTask.week1) ||
                                      (task.week2 && rTask.week2) ||
                                      (task.week3 && rTask.week3) ||
                                      (task.week4 && rTask.week4)
                                    );
                                    if (!overlaps) {
                                      row.push(task);
                                      placed = true;
                                      break;
                                    }
                                  }
                                  if (!placed) packedRows.push([task]);
                                }
                              }

                              return (
                                <React.Fragment key={sub.value}>
                                  <tr style={{ borderTop: "1px solid var(--border)", background: sIdx % 2 === 0 ? "transparent" : `${group.color}04` }}>
                                    <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}>
                                      {group.value !== "chu_de_thang" && (
                                        <input
                                          title="Hoàn thành"
                                          type="checkbox"
                                          checked={subTasks.some(t => t.status === "completed")}
                                          onChange={async (e) => {
                                            const status = e.target.checked ? "completed" : "pending";
                                            if (subTasks.length > 0) {
                                              subTasks.forEach(t => handleSaveWeekContent(t.id, "status", status));
                                            } else {
                                              setSaving(true);
                                              try {
                                                const pId = await ensurePlanId();
                                                if (!pId) return;
                                                await fetch("/api/marketing/tasks", {
                                                  method: "POST", headers: { "Content-Type": "application/json" },
                                                  body: JSON.stringify({
                                                    monthlyPlanId: pId,
                                                    title: "",
                                                    taskGroup: group.value,
                                                    taskSubGroup: sub.value,
                                                    sortOrder: plan?.tasks?.length || 0,
                                                    status: status,
                                                  }),
                                                });
                                                await loadPlan();
                                              } finally { setSaving(false); }
                                            }
                                          }}
                                          style={{ width: 14, height: 14, cursor: "pointer" }}
                                        />
                                      )}
                                    </td>
                                    <td style={{ ...tdStyle, verticalAlign: "middle" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 400, fontSize: 11, color: "var(--muted-foreground)", paddingLeft: 16, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                                          {sub.label}
                                        </span>
                                        {(canEdit || (isAggregatedView && (sub.value === "ngay_le" || sub.value === "noi_dung"))) && (
                                          <button
                                            type="button"
                                            title={`Thêm ${sub.label}`}
                                            onClick={() => {
                                              if (sub.value === "noi_dung") {
                                                setNoiDungForm({ title: "", content: "" });
                                                setShowNoiDungModal(true);
                                              } else {
                                                setEditTask(null);
                                                setTaskForm({ ...DEFAULT_TASK_FORM, taskGroup: group.value, taskSubGroup: sub.value });
                                                setShowTaskForm(true);
                                              }
                                            }}
                                            style={{ background: "transparent", border: "none", color: group.color, cursor: "pointer", padding: "2px 6px", display: "flex", alignItems: "center" }}>
                                            <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />
                                          </button>
                                        )}
                                      </div>
                                    </td>

                                    {sub.value === "noi_dung" ? (
                                      <td colSpan={4} style={{ ...tdStyle, borderLeft: "1px solid var(--border)", fontSize: 13, lineHeight: 1.4 }}>
                                        {subTasks.map((t, ci) => (
                                          <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: ci < subTasks.length - 1 ? 6 : 0, paddingBottom: ci < subTasks.length - 1 ? 6 : 0, borderBottom: ci < subTasks.length - 1 ? "1px dashed var(--border)" : "none" }}>
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                              <span style={{ color: group.color, marginTop: 5, flexShrink: 0, fontSize: 8, opacity: 0.6 }}>◦</span>
                                              <strong
                                                onClick={() => { setViewingNoiDungTask(t); setShowNoiDungDetail(true); }}
                                                style={{ color: "#003087", cursor: "pointer", fontWeight: 700, textDecoration: "none" }}
                                                onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                                                onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                                              >
                                                {t.title}
                                                {isAggregatedView && t.assigneeName && <span style={{ fontWeight: 400, fontSize: 10, color: "var(--muted-foreground)", marginLeft: 6 }}>({t.assigneeName})</span>}
                                              </strong>
                                            </div>
                                            {t.description && (
                                              <div style={{ color: "var(--foreground)", paddingLeft: 16, whiteSpace: "pre-wrap" }}>
                                                {t.description}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </td>
                                    ) : sub.value === "san_pham" ? (() => {
                                      return (["week1Content", "week2Content", "week3Content", "week4Content"] as const).map((field, wi) => {
                                        let weekContents = subTasks.map(t => t[field]).filter(Boolean);
                                        weekContents = weekContents.flatMap(c => c ? c.split(", ") : []);
                                        const defaultTask = subTasks[0];
                                        return (
                                          <td key={wi} style={{ position: "relative", ...tdStyle, borderLeft: "1px solid var(--border)", fontSize: 12, lineHeight: 1.4, cursor: canEdit ? "pointer" : "default" }}
                                            onClick={() => {
                                              if (!canEdit) return;
                                              if (!defaultTask) { handleInitProductTask(group.value, field); return; }
                                              const currentArr = defaultTask[field]?.split(", ") || [];
                                              setEditingSanPham({ taskId: defaultTask.id, field, selected: new Set(currentArr.filter(Boolean)) });
                                            }}>
                                            {weekContents.length > 0 ? (
                                              weekContents.map((c, ci) => (
                                                <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: ci < weekContents.length - 1 ? 2 : 0 }}>
                                                  <span style={{ color: group.color, marginTop: 4, flexShrink: 0, fontSize: 8, opacity: 0.6 }}>◦</span>
                                                  <span style={{ color: "var(--foreground)", fontWeight: 400 }}>{c}</span>
                                                </div>
                                              ))
                                            ) : (
                                              <span style={{ color: "var(--muted-foreground)", fontSize: 11, fontStyle: "italic" }}>+ Chọn sản phẩm</span>
                                            )}
                                            <AnimatePresence>
                                              {editingSanPham?.taskId === defaultTask?.id && editingSanPham?.field === field && (
                                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                  onClick={e => e.stopPropagation()}
                                                  style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "var(--card)", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", border: "1px solid var(--border)", padding: 12, width: 240, marginTop: 4 }}>
                                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                                    <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>CHỌN SẢN PHẨM</h4>
                                                    <button type="button" onClick={() => setEditingSanPham(null)} style={{ border: "none", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                      <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
                                                    </button>
                                                  </div>
                                                  <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
                                                    {productCategories.map(cat => (
                                                      <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                                        <input type="checkbox" checked={editingSanPham.selected.has(cat.name)}
                                                          onChange={async (e) => {
                                                            const newSet = new Set(editingSanPham.selected);
                                                            if (e.target.checked) newSet.add(cat.name);
                                                            else newSet.delete(cat.name);
                                                            setEditingSanPham({ ...editingSanPham, selected: newSet });
                                                            const prodsStr = Array.from(newSet).join(", ");
                                                            await fetch(`/api/marketing/tasks/${editingSanPham.taskId}`, {
                                                              method: "PATCH", headers: { "Content-Type": "application/json" },
                                                              body: JSON.stringify({ [editingSanPham.field]: prodsStr || null }),
                                                            });
                                                            await loadPlan();
                                                          }}
                                                          style={{ width: 14, height: 14, accentColor: "#003087" }} />
                                                        <span style={{ fontSize: 13, color: "var(--foreground)" }}>{cat.name}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </td>
                                        );
                                      });
                                    })() : sub.value === "ngay_le" ? (["week1Content", "week2Content", "week3Content", "week4Content"] as const).map((field, wi) => {
                                      const weekTasks = subTasks.filter(t => {
                                        if (field === "week1Content") return t.week1;
                                        if (field === "week2Content") return t.week2;
                                        if (field === "week3Content") return t.week3;
                                        if (field === "week4Content") return t.week4;
                                        return false;
                                      });
                                      let weekContents = weekTasks.map(t => t[field]).filter(Boolean);
                                      const range = weekRanges[wi];
                                      const autoHolidays = getHolidaysForWeek(month, range.start, range.end);
                                      autoHolidays.forEach(h => {
                                        if (!weekContents.some(c => c && c.toLowerCase().includes(h.toLowerCase()))) {
                                          weekContents.push(h);
                                        }
                                      });
                                      return (
                                        <td key={wi} style={{ ...tdStyle, borderLeft: "1px solid var(--border)", fontSize: 12, lineHeight: 1.4 }}>
                                          {weekContents.map((c, ci) => (
                                            <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: ci < weekContents.length - 1 ? 2 : 0 }}>
                                              <span style={{ color: group.color, marginTop: 4, flexShrink: 0, fontSize: 8, opacity: 0.6 }}>◦</span>
                                              <span style={{ color: "var(--foreground)", fontWeight: 400 }}>{c}</span>
                                            </div>
                                          ))}
                                        </td>
                                      );
                                    }) : (
                                      packedRows.length > 0 ? buildPackedWeekCells(packedRows[0]).map((cell, ci) => cell.active && cell.task ? (
                                        <td key={ci} colSpan={cell.span} style={{ ...tdStyle, borderLeft: "1px solid var(--border)", padding: "6px 10px", verticalAlign: "middle" }}>
                                          <div id={`task-item-${cell.task.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: `${group.color}18`, borderRadius: 6, padding: "5px 10px", border: `1px solid ${group.color}30`, transition: "all 0.3s" }}>
                                            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: group.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {cell.task.title}
                                              </span>
                                              {(cell.task.assigneeName || cell.task.budget || cell.task.description) && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "var(--muted-foreground)", marginTop: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                                  {cell.task.assigneeName && <span title={`Người thực hiện: ${cell.task.assigneeName}`}><i className="bi bi-person-fill me-1" />{cell.task.assigneeName}</span>}
                                                  {cell.task.budget ? <span title={`Ngân sách: ${Number(cell.task.budget).toLocaleString("vi-VN")}đ`}><i className="bi bi-cash me-1" />{Number(cell.task.budget).toLocaleString("vi-VN")}đ</span> : null}
                                                  {cell.task.description && <span title={cell.task.description} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}><i className="bi bi-justify-left me-1" />{cell.task.description}</span>}
                                                </div>
                                              )}
                                            </div>
                                            {canEdit && (
                                              <button
                                                onClick={() => { const t = cell.task!; setEditTask(t); setTaskForm({ title: t.title, description: t.description || "", taskType: t.taskType || "", category: t.category || "", taskGroup: t.taskGroup || "", taskSubGroup: t.taskSubGroup || "", assigneeName: t.assigneeName || "", week1: t.week1, week2: t.week2, week3: t.week3, week4: t.week4, budget: t.budget?.toString() || "", status: t.status || "pending" }); setShowTaskForm(true); }}
                                                style={{ background: "transparent", border: "none", color: group.color, cursor: "pointer", padding: "0 2px", flexShrink: 0, opacity: 0.7 }}
                                                title="Sửa công việc"
                                              >
                                                <i className="bi bi-pencil" style={{ fontSize: 11 }} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      ) : (
                                        <td key={ci} style={{ ...tdStyle, borderLeft: "1px solid var(--border)" }}></td>
                                      )) : [0, 1, 2, 3].map(wi => <td key={wi} style={{ ...tdStyle, borderLeft: "1px solid var(--border)" }}></td>)
                                    )}
                                  </tr>
                                  {/* Subsequent rows for multi-row sub-groups */}
                                  {!isSpecialSub && packedRows.slice(1).map((row, rIdx) => {
                                    const cells = buildPackedWeekCells(row);
                                    return (
                                      <tr key={`row-${rIdx}`} style={{ background: `${group.color}04` }}>
                                        <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}>
                                          <input
                                            title="Chọn để xóa"
                                            type="checkbox"
                                            checked={row.every(t => selectedTaskIds.has(t.id))}
                                            onChange={(e) => row.forEach(t => toggleTaskSelection(t.id, e.target.checked))}
                                            style={{ width: 14, height: 14, cursor: "pointer", opacity: 0.8 }}
                                          />
                                        </td>
                                        <td style={{ ...tdStyle, borderRight: "1px solid var(--border)" }}></td>
                                        {cells.map((cell, ci) => cell.active && cell.task ? (
                                          <td key={ci} colSpan={cell.span} style={{ ...tdStyle, borderTop: "1px dashed var(--border)", borderLeft: "1px solid var(--border)", padding: "6px 10px", verticalAlign: "middle" }}>
                                            <div id={`task-item-${cell.task.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: `${group.color}18`, borderRadius: 6, padding: "5px 10px", border: `1px solid ${group.color}30`, transition: "all 0.3s" }}>
                                              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: group.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                  {cell.task.title}
                                                </span>
                                                {(cell.task.assigneeName || cell.task.budget || cell.task.description) && (
                                                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "var(--muted-foreground)", marginTop: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                                    {cell.task.assigneeName && <span title={`Người thực hiện: ${cell.task.assigneeName}`}><i className="bi bi-person-fill me-1" />{cell.task.assigneeName}</span>}
                                                    {cell.task.budget ? <span title={`Ngân sách: ${Number(cell.task.budget).toLocaleString("vi-VN")}đ`}><i className="bi bi-cash me-1" />{Number(cell.task.budget).toLocaleString("vi-VN")}đ</span> : null}
                                                    {cell.task.description && <span title={cell.task.description} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}><i className="bi bi-justify-left me-1" />{cell.task.description}</span>}
                                                  </div>
                                                )}
                                              </div>
                                              {canEdit && (
                                                <button
                                                  onClick={() => { const t = cell.task!; setEditTask(t); setTaskForm({ title: t.title, description: t.description || "", taskType: t.taskType || "", category: t.category || "", taskGroup: t.taskGroup || "", taskSubGroup: t.taskSubGroup || "", assigneeName: t.assigneeName || "", week1: t.week1, week2: t.week2, week3: t.week3, week4: t.week4, budget: t.budget?.toString() || "", status: t.status || "pending" }); setShowTaskForm(true); }}
                                                  style={{ background: "transparent", border: "none", color: group.color, cursor: "pointer", padding: "0 2px", flexShrink: 0, opacity: 0.7 }}
                                                  title="Sửa công việc"
                                                >
                                                  <i className="bi bi-pencil" style={{ fontSize: 11 }} />
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        ) : (
                                          <td key={ci} style={{ ...tdStyle, borderLeft: "1px solid var(--border)" }}></td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}


                            {/* Render direct tasks acting as sub-groups for non-chu_de_thang items */}
                            {group.value !== "chu_de_thang" && !isCollapsed && (plan?.tasks || []).filter(t => t.taskGroup === group.value && !t.taskSubGroup && t.taskType !== "group").map(t => {
                              const dynamicSubTasks = (plan?.tasks || []).filter(child => child.taskGroup === group.value && (child.taskSubGroup === t.id || child.taskSubGroup === t.title));

                              return (
                                <React.Fragment key={t.id}>
                                  {/* Dòng Header của Hạng mục động */}
                                  <tr style={{ borderTop: "1px solid var(--border)", background: `${group.color}02` }}>
                                    <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}>
                                      <input
                                        title="Chọn để xóa"
                                        type="checkbox"
                                        checked={selectedTaskIds.has(t.id)}
                                        onChange={(e) => toggleTaskSelection(t.id, e.target.checked)}
                                        style={{ width: 14, height: 14, cursor: "pointer" }}
                                      />
                                    </td>
                                    <td style={{ ...tdStyle, verticalAlign: "middle" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 400, fontSize: 11, color: "var(--muted-foreground)", paddingLeft: 16, textTransform: "uppercase", letterSpacing: "0.4px", width: "100%" }}>
                                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                                          <input
                                            id={`input-task-${t.id}`}
                                            type="text"
                                            defaultValue={t.title}
                                            autoFocus={focusTaskId === t.id}
                                            onBlur={(e) => {
                                              if (e.target.value !== t.title) {
                                                handleSaveWeekContent(t.id, "title", e.target.value);
                                              }
                                            }}
                                            style={{ border: "none", background: "transparent", outline: "none", fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)", width: "100%", padding: 0, textTransform: "uppercase", letterSpacing: "0.4px" }}
                                            placeholder="TÊN CÔNG VIỆC..."
                                          />
                                        </span>
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditTask(null);
                                              setTaskForm({ ...DEFAULT_TASK_FORM, taskGroup: group.value, taskSubGroup: t.id });
                                              setShowTaskForm(true);
                                            }}
                                            title="Thêm công việc con"
                                            style={{ background: "transparent", border: "none", color: group.color, cursor: "pointer", padding: "2px 6px", display: "flex", alignItems: "center" }}>
                                            <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    {(() => {
                                      const packedRows: MTask[][] = [];
                                      for (const task of dynamicSubTasks) {
                                        let placed = false;
                                        for (const row of packedRows) {
                                          const overlaps = row.some(rTask =>
                                            (task.week1 && rTask.week1) ||
                                            (task.week2 && rTask.week2) ||
                                            (task.week3 && rTask.week3) ||
                                            (task.week4 && rTask.week4)
                                          );
                                          if (!overlaps) {
                                            row.push(task);
                                            placed = true;
                                            break;
                                          }
                                        }
                                        if (!placed) packedRows.push([task]);
                                      }

                                      return packedRows.length > 0 ? (
                                        buildPackedWeekCells(packedRows[0]).map((cell, ci) => cell.active && cell.task ? (
                                          <td key={ci} colSpan={cell.span} style={{ ...tdStyle, borderLeft: "1px solid var(--border)", padding: "6px 10px", verticalAlign: "middle" }}>
                                            <div id={`task-item-${cell.task.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: `${group.color}18`, borderRadius: 6, padding: "5px 10px", border: `1px solid ${group.color}30`, transition: "all 0.3s" }}>
                                              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: group.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                  {cell.task.title}
                                                </span>
                                                {(cell.task.assigneeName || cell.task.budget || cell.task.description) && (
                                                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "var(--muted-foreground)", marginTop: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                                    {cell.task.assigneeName && <span title={`Người thực hiện: ${cell.task.assigneeName}`}><i className="bi bi-person-fill me-1" />{cell.task.assigneeName}</span>}
                                                    {cell.task.budget ? <span title={`Ngân sách: ${Number(cell.task.budget).toLocaleString("vi-VN")}đ`}><i className="bi bi-cash me-1" />{Number(cell.task.budget).toLocaleString("vi-VN")}đ</span> : null}
                                                    {cell.task.description && <span title={cell.task.description} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}><i className="bi bi-justify-left me-1" />{cell.task.description}</span>}
                                                  </div>
                                                )}
                                              </div>
                                              {canEdit && (
                                                <button
                                                  onClick={() => { const child = cell.task!; setEditTask(child); setTaskForm({ title: child.title, description: child.description || "", taskType: child.taskType || "", category: child.category || "", taskGroup: child.taskGroup || "", taskSubGroup: child.taskSubGroup || "", assigneeName: child.assigneeName || "", week1: child.week1, week2: child.week2, week3: child.week3, week4: child.week4, budget: child.budget?.toString() || "", status: child.status || "pending" }); setShowTaskForm(true); }}
                                                  style={{ background: "transparent", border: "none", color: group.color, cursor: "pointer", padding: "0 2px", flexShrink: 0, opacity: 0.7 }}
                                                  title="Sửa công việc"
                                                >
                                                  <i className="bi bi-pencil" style={{ fontSize: 11 }} />
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        ) : (
                                          <td key={ci} style={{ ...tdStyle, borderLeft: "1px solid var(--border)" }}></td>
                                        ))
                                      ) : (
                                        ([0, 1, 2, 3]).map(wi => <td key={wi} style={{ ...tdStyle, borderLeft: "1px solid var(--border)" }}></td>)
                                      );
                                    })()}
                                  </tr>

                                  {/* dynamic subTasks remainder rows */}
                                  {(() => {
                                    const packedRows: MTask[][] = [];
                                    for (const task of dynamicSubTasks) {
                                      let placed = false;
                                      for (const row of packedRows) {
                                        const overlaps = row.some(rTask =>
                                          (task.week1 && rTask.week1) ||
                                          (task.week2 && rTask.week2) ||
                                          (task.week3 && rTask.week3) ||
                                          (task.week4 && rTask.week4)
                                        );
                                        if (!overlaps) {
                                          row.push(task);
                                          placed = true;
                                          break;
                                        }
                                      }
                                      if (!placed) packedRows.push([task]);
                                    }

                                    return packedRows.slice(1).map((row, rIdx) => {
                                      const cells = buildPackedWeekCells(row);
                                      return (
                                        <tr key={`dyn-row-${rIdx}`} style={{ background: `${group.color}02` }}>
                                          <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}></td>
                                          <td style={{ ...tdStyle, borderRight: "1px solid var(--border)" }}></td>
                                          {cells.map((cell, ci) => cell.active && cell.task ? (
                                            <td key={ci} colSpan={cell.span} style={{ ...tdStyle, borderTop: "1px dashed var(--border)", borderLeft: "1px solid var(--border)", padding: "6px 10px", verticalAlign: "middle" }}>
                                              <div id={`task-item-${cell.task.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: `${group.color}18`, borderRadius: 6, padding: "5px 10px", border: `1px solid ${group.color}30`, transition: "all 0.3s" }}>
                                                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                                  <span style={{ fontSize: 12, fontWeight: 600, color: group.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {cell.task.title}
                                                  </span>
                                                  {(cell.task.assigneeName || cell.task.budget || cell.task.description) && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "var(--muted-foreground)", marginTop: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                                      {cell.task.assigneeName && <span title={`Người thực hiện: ${cell.task.assigneeName}`}><i className="bi bi-person-fill me-1" />{cell.task.assigneeName}</span>}
                                                      {cell.task.budget ? <span title={`Ngân sách: ${Number(cell.task.budget).toLocaleString("vi-VN")}đ`}><i className="bi bi-cash me-1" />{Number(cell.task.budget).toLocaleString("vi-VN")}đ</span> : null}
                                                      {cell.task.description && <span title={cell.task.description} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}><i className="bi bi-justify-left me-1" />{cell.task.description}</span>}
                                                    </div>
                                                  )}
                                                </div>
                                                {canEdit && (
                                                  <button
                                                    onClick={() => { const child = cell.task!; setEditTask(child); setTaskForm({ title: child.title, description: child.description || "", taskType: child.taskType || "", category: child.category || "", taskGroup: child.taskGroup || "", taskSubGroup: child.taskSubGroup || "", assigneeName: child.assigneeName || "", week1: child.week1, week2: child.week2, week3: child.week3, week4: child.week4, budget: child.budget?.toString() || "", status: child.status || "pending" }); setShowTaskForm(true); }}
                                                    style={{ background: "transparent", border: "none", color: group.color, cursor: "pointer", padding: "0 2px", flexShrink: 0, opacity: 0.7 }}
                                                    title="Sửa công việc"
                                                  >
                                                    <i className="bi bi-pencil" style={{ fontSize: 11 }} />
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          ) : (
                                            <td key={ci} style={{ ...tdStyle, borderLeft: "1px solid var(--border)" }}></td>
                                          ))}
                                        </tr>
                                      );
                                    });
                                  })()}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot style={{ position: "sticky", bottom: 0, zIndex: 20, background: "var(--card)", boxShadow: "0 -2px 10px rgba(0,0,0,0.02)" }}>
                    <tr style={{ background: "rgba(0,48,135,0.04)", borderTop: "2px solid var(--border)" }}>
                      <td colSpan={2} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>
                        Tổng: {plan?.tasks?.length || 0} công việc
                      </td>
                      {[1, 2, 3, 4].map(w => {
                        const field = `week${w}` as keyof MTask;
                        const cnt = (plan?.tasks || []).filter(t => !!t[field]).length;
                        return (
                          <td key={w} style={{ padding: "10px 8px", textAlign: "center", borderLeft: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: cnt > 0 ? "#003087" : "var(--muted-foreground)" }}>
                              {cnt > 0 ? `${cnt} mục` : "—"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>


            {plan.status === "rejected" && plan.rejectedReason && (
              <div style={{ marginTop: 18, padding: "13px 18px", borderRadius: 12, background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.2)" }}>
                <strong style={{ color: "#C0392B", fontSize: 13 }}><i className="bi bi-x-circle me-2" />Lý do từ chối:</strong>
                <p style={{ margin: "5px 0 0", fontSize: 13 }}>{plan.rejectedReason}</p>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmAdjust}
        title="Xác nhận điều chỉnh"
        message="Bạn có chắc chắn muốn điều chỉnh kế hoạch này? Trạng thái sẽ quay về bản nháp để chỉnh sửa."
        onConfirm={doAdjust}
        onCancel={() => setConfirmAdjust(false)}
        loading={saving}
      />

      <ConfirmDialog
        open={confirmBulkDel}
        title="Xác nhận xoá"
        message={`Bạn có chắc chắn muốn xoá ${selectedTaskIds.size} công việc đã chọn không?`}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDel(false)}
        loading={isBulkDeleting}
      />

      {/* OFFCANVAS: Task Form */}
      <AnimatePresence>
        {showTaskForm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowTaskForm(false); setEditTask(null); }}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(5px)" }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }}
              style={{
                position: "relative", width: 400, maxWidth: "100vw",
                background: "var(--card)", borderLeft: "1px solid var(--border)",
                boxShadow: "-12px 0 40px rgba(0,0,0,0.15)",
                display: "flex", flexDirection: "column", height: "100%"
              }}>

              {/* Minimal Header */}
              <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: 0.5 }}>
                  {editTask ? "CHỈNH SỬA CÔNG VIỆC" : taskForm.taskSubGroup ? "THÊM CÔNG VIỆC CON" : "THÊM CÔNG VIỆC MỚI"}
                </div>
                <button onClick={() => { setShowTaskForm(false); setEditTask(null); }}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", transition: "all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--muted)"}
                >
                  <i className="bi bi-x-lg" style={{ fontSize: 14 }} />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

                {/* Badges & Title SAME LINE */}
                <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>

                  {/* Badges exactly like screenshot: pill, text color, borders */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ padding: "4px 14px", border: "1px solid #cbd5e1", borderRadius: 99, fontSize: 12, fontWeight: 600, color: "#475569", background: "white" }}>
                      {TASK_GROUPS.find(g => g.value === taskForm.taskGroup)?.label || taskForm.taskGroup}
                    </span>
                    <span style={{ padding: "5px 14px", background: "#1e293b", color: "white", borderRadius: 99, fontSize: 12, fontWeight: 600, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                      {TASK_GROUPS.find(g => g.value === taskForm.taskGroup)?.subGroups?.find(s => s.value === taskForm.taskSubGroup)?.label || plan?.tasks?.find(pt => pt.id === taskForm.taskSubGroup)?.title || taskForm.taskSubGroup || "—"}
                    </span>
                  </div>

                  {/* Title Input right next to badges */}
                  <input style={{ flex: 1, minWidth: 200, border: "none", outline: "none", fontSize: 18, fontWeight: 800, color: "var(--foreground)", background: "transparent", padding: 0 }}
                    value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Nhập tên công việc..."
                    autoFocus
                  />
                </div>

                {/* Properties List */}
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* Tuần */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 100, fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>
                      <i className="bi bi-calendar2-week me-2" />Tiến độ
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["week1", "week2", "week3", "week4"] as const).map((field, i) => {
                        const isActive = Boolean(taskForm[field]);
                        return (
                          <div key={field} onClick={() => setTaskForm(f => ({ ...f, [field]: !isActive }))}
                            style={{
                              width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                              fontSize: 14, fontWeight: 800,
                              background: isActive ? "#10b981" : "rgba(0,0,0,0.05)",
                              color: isActive ? "white" : "var(--muted-foreground)",
                              transition: "all 0.2s"
                            }}>
                            {i + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Phụ trách & Ngân sách */}
                  <div style={{ display: "flex", gap: 20 }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>
                        <i className="bi bi-person me-2" />Người phụ trách
                      </div>
                      <select style={{ width: "100%", height: 36, fontSize: 13, fontWeight: 600, border: "none", outline: "none", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: "0 12px", cursor: "pointer", color: "var(--foreground)" }}
                        value={taskForm.assigneeName} onChange={e => setTaskForm(f => ({ ...f, assigneeName: e.target.value }))}>
                        <option value="">— Trống —</option>
                        {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                      </select>
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>
                        <i className="bi bi-cash-stack me-2" />Ngân sách dự kiến
                      </div>
                      <div style={{ position: "relative", width: "100%" }}>
                        <input type="text" style={{ width: "100%", height: 36, fontSize: 13, fontWeight: 700, border: "none", outline: "none", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: "0 12px 0 32px", color: "#10b981" }}
                          value={taskForm.budget ? Number(taskForm.budget).toLocaleString("vi-VN") : ""}
                          onChange={e => {
                            const num = e.target.value.replace(/\D/g, "");
                            setTaskForm(f => ({ ...f, budget: num }));
                          }}
                          placeholder="0" />
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 800, color: "#10b981" }}>₫</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Nội dung chi tiết */}
                <div style={{ flex: 1, padding: "0 24px 24px", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 12 }}>
                    <i className="bi bi-card-text me-2" />Nội dung chi tiết
                  </div>
                  <textarea style={{ flex: 1, width: "100%", minHeight: 120, border: "none", outline: "none", background: "transparent", borderLeft: "3px solid #e2e8f0", padding: "4px 0 4px 16px", fontSize: 13, lineHeight: 1.6, resize: "none", color: "var(--foreground)" }}
                    value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Ghi chú chi tiết công việc, các yêu cầu thêm..." />
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--background)" }}>
                <button onClick={() => { setShowTaskForm(false); setEditTask(null); }} className="app-btn-outline" style={{ height: 36, padding: "0 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
                  Huỷ
                </button>
                <button onClick={handleSaveTask} disabled={saving || !taskForm.title.trim() || !(taskForm.week1 || taskForm.week2 || taskForm.week3 || taskForm.week4)}
                  style={{
                    height: 36, padding: "0 22px", borderRadius: 8, border: "none",
                    background: (!taskForm.title.trim() || !(taskForm.week1 || taskForm.week2 || taskForm.week3 || taskForm.week4)) ? "var(--muted)" : "linear-gradient(135deg, #003087, #001f5c)",
                    color: (!taskForm.title.trim() || !(taskForm.week1 || taskForm.week2 || taskForm.week3 || taskForm.week4)) ? "var(--muted-foreground)" : "white",
                    fontWeight: 700, fontSize: 13,
                    cursor: (!taskForm.title.trim() || !(taskForm.week1 || taskForm.week2 || taskForm.week3 || taskForm.week4)) ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "all 0.2s",
                    boxShadow: (taskForm.title.trim() && (taskForm.week1 || taskForm.week2 || taskForm.week3 || taskForm.week4)) ? "0 4px 14px rgba(0,48,135,0.3)" : "none"
                  }}
                >
                  {saving && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                  {editTask ? "Lưu" : "Thêm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />

      {/* Offcanvas Modal for ADDING NỘI DUNG */}
      <AnimatePresence>
        {showNoiDungModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNoiDungModal(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />

            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }}
              style={{ position: "relative", width: 400, maxWidth: "100vw", background: "var(--card)", borderLeft: "1px solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", height: "100%" }}>

              <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: 0.5 }}>
                  THÊM MỚI NỘI DUNG
                </div>
                <button onClick={() => setShowNoiDungModal(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", transition: "all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--muted)"}
                >
                  <i className="bi bi-x-lg" style={{ fontSize: 14 }} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex" }}>
                    <span style={{ padding: "4px 14px", border: "1px solid #cbd5e1", borderRadius: 99, fontSize: 12, fontWeight: 600, color: "#475569", background: "white" }}>
                      Mục Chủ đề tháng
                    </span>
                  </div>
                  <input style={{ width: "100%", border: "none", outline: "none", fontSize: 18, fontWeight: 800, color: "var(--foreground)", background: "transparent", padding: 0 }}
                    value={noiDungForm.title} onChange={e => setNoiDungForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Nhập tiêu đề tác phẩm/bài viết..." autoFocus />
                </div>

                <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 12 }}>
                    <i className="bi bi-card-text me-2" />Nội dung chi tiết
                  </div>
                  <textarea style={{ flex: 1, width: "100%", minHeight: 200, border: "none", outline: "none", background: "transparent", borderLeft: "3px solid #e2e8f0", padding: "4px 0 4px 16px", fontSize: 13, lineHeight: 1.6, resize: "none", color: "var(--foreground)" }}
                    value={noiDungForm.content} onChange={e => setNoiDungForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Mô tả các yêu cầu, ý tưởng chính..." />
                </div>
              </div>

              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--background)" }}>
                <button type="button" onClick={() => setShowNoiDungModal(false)} className="app-btn-outline" style={{ padding: "0 18px", height: 36, borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
                  Hủy
                </button>
                <button type="button" disabled={saving || !noiDungForm.title.trim()} onClick={handleSaveNoiDung}
                  style={{ padding: "0 22px", height: 36, borderRadius: 8, border: "none", background: (!noiDungForm.title.trim() || saving) ? "var(--muted)" : "#10b981", color: (!noiDungForm.title.trim() || saving) ? "var(--muted-foreground)" : "white", fontWeight: 700, fontSize: 13, cursor: (!noiDungForm.title.trim() || saving) ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                  {saving ? "Đang lưu..." : "Thêm mới"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Offcanvas Modal for editing NOIDUNG */}
      <AnimatePresence>
        {showNoiDungDetail && viewingNoiDungTask && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNoiDungDetail(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />

            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }}
              style={{ position: "relative", width: 400, maxWidth: "100vw", background: "var(--card)", borderLeft: "1px solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", height: "100%" }}>

              <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: 0.5 }}>
                  CHI TIẾT NỘI DUNG
                </div>
                <button onClick={() => setShowNoiDungDetail(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", transition: "all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--muted)"}
                >
                  <i className="bi bi-x-lg" style={{ fontSize: 14 }} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

                {/* Title & Badge */}
                <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex" }}>
                    <span style={{ padding: "4px 14px", border: "1px solid #cbd5e1", borderRadius: 99, fontSize: 12, fontWeight: 600, color: "#475569", background: "white" }}>
                      Mục Chủ đề tháng
                    </span>
                  </div>
                  <input style={{ width: "100%", border: "none", outline: "none", fontSize: 18, fontWeight: 800, color: "var(--foreground)", background: "transparent", padding: 0 }}
                    value={viewingNoiDungTask.title}
                    onChange={e => setViewingNoiDungTask({ ...viewingNoiDungTask, title: e.target.value })}
                    placeholder="Nhập tiêu đề..."
                  />
                </div>

                {/* Content Textarea */}
                <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 12 }}>
                    <i className="bi bi-card-text me-2" />Nội dung chi tiết
                  </div>
                  <textarea style={{ flex: 1, width: "100%", minHeight: 200, border: "none", outline: "none", background: "transparent", borderLeft: "3px solid #e2e8f0", padding: "4px 0 4px 16px", fontSize: 13, lineHeight: 1.6, resize: "none", color: "var(--foreground)" }}
                    value={viewingNoiDungTask.description || ""}
                    onChange={e => setViewingNoiDungTask({ ...viewingNoiDungTask, description: e.target.value })}
                    placeholder="Nhập nội dung chi tiết..." />
                </div>
              </div>

              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--background)" }}>
                {canEdit ? (
                  <button type="button" onClick={() => handleDeleteNoiDung(viewingNoiDungTask.id)} disabled={saving} style={{ padding: "0 16px", height: 36, borderRadius: 8, border: "1px solid #C0392B", background: "rgba(192,57,43,0.05)", color: "#C0392B", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="bi bi-trash" /> Xoá
                  </button>
                ) : <div />}

                {canEdit ? (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => setShowNoiDungDetail(false)} className="app-btn-outline" style={{ padding: "0 18px", height: 36, borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
                      Huỷ
                    </button>
                    <button type="button" disabled={saving || !viewingNoiDungTask.title.trim()} onClick={handleUpdateNoiDung}
                      style={{ padding: "0 22px", height: 36, borderRadius: 8, border: "none", background: (!viewingNoiDungTask.title.trim() || saving) ? "var(--muted)" : "linear-gradient(135deg, #003087, #001f5c)", color: (!viewingNoiDungTask.title.trim() || saving) ? "var(--muted-foreground)" : "white", fontWeight: 700, fontSize: 13, cursor: (!viewingNoiDungTask.title.trim() || saving) ? "not-allowed" : "pointer" }}>
                      {saving ? "Đang lưu..." : "Cập nhật"}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowNoiDungDetail(false)} className="app-btn-outline" style={{ padding: "0 18px", height: 36, borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
                    Đóng
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmBulkDel}
        variant="danger"
        title="Xoá hàng loạt công việc?"
        message={`Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedTaskIds.size || 0} công việc đã chọn?`}
        confirmLabel="Xoá đã chọn"
        loading={isBulkDeleting}
        onConfirm={async () => {
          if (!plan) return;
          setIsBulkDeleting(true);
          try {
            const selectedTasks = Array.from(selectedTaskIds);
            for (const taskId of selectedTasks) {
              await fetch(`/api/marketing/tasks/${taskId}`, { method: "DELETE" });
            }
            toast.success("Xoá thành công", `Đã xoá ${selectedTasks.length} công việc đã chọn.`);
            setSelectedTaskIds(new Set());
            await loadPlan();
            setConfirmBulkDel(false);
          } catch (error: any) {
            toast.error("Lỗi xóa", error.message || "Có lỗi xảy ra khi xóa công việc.");
          } finally {
            setIsBulkDeleting(false);
          }
        }}
        onCancel={() => setConfirmBulkDel(false)}
      />

      <ToastContainer toasts={toast.dismiss === undefined ? [] : toast.toasts} onDismiss={toast.dismiss} />

      {/* Print Preview Modal */}
      {showPrintModal && (
        <PrintPreviewModal
          title={`Kế hoạch Marketing Tháng ${month}/${year}`}
          subtitle="Tài liệu in nội bộ"
          actions={
            <button
              onClick={() => printDocumentById("marketing-plan-print", "landscape", `Kế hoạch Marketing Tháng ${month}/${year}`)}
              style={{
                padding: "6px 16px", borderRadius: 7, border: "none",
                background: "linear-gradient(135deg, #003087, #001f5c)", color: "white",
                fontWeight: 600, fontSize: 12.5, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 3px 10px rgba(0,48,135,0.3)"
              }}
            >
              <i className="bi bi-printer-fill" /> Xác nhận In
            </button>
          }
          documentId="marketing-plan-print"
          printOrientation="landscape"
          document={
            <div className="pdf-cover-page" style={{ padding: "40px", display: "flex", flexDirection: "column" }}>
              {/* Header: Company Info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, borderBottom: "2px solid #003087", paddingBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {companyInfo?.logoUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={companyInfo.logoUrl} alt="Logo" style={{ height: 36, objectFit: "contain", maxWidth: 100 }} />
                  )}
                  <div>
                    <h1 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#003087", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "'Montserrat', sans-serif" }}>
                      {companyInfo?.name || "SEAJONG COMPANY"}
                    </h1>
                    <div style={{ height: 2 }} />
                    <p style={{ margin: 0, fontSize: 10, color: "#000000", lineHeight: 1.3 }}>
                      <strong>Trụ sở:</strong> {companyInfo?.address || "---"}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, color: "#000000", lineHeight: 1.3 }}>
                      <strong>SĐT:</strong> {companyInfo?.phone || "---"} <span style={{ margin: "0 6px", color: "#cbd5e1" }}>|</span> <strong>Email:</strong> {companyInfo?.email || "---"}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right", border: "1px dashed #C0392B", padding: "4px 8px", borderRadius: 4, background: "#fef2f2" }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: "#C0392B" }}>TÀI LIỆU NỘI BỘ</p>
                  <p style={{ margin: "2px 0 0 0", fontSize: 9, color: "#b91c1c", fontStyle: "italic" }}>Không sao chép, phát tán</p>
                </div>
              </div>

              {/* Title & Subtitle */}
              <h2 style={{ textAlign: "center", fontSize: 16, fontWeight: 800, margin: 0, color: "#003087", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'Montserrat', sans-serif" }}>
                KẾ HOẠCH MARKETING THÁNG {month} / {year}
              </h2>
              <p style={{ textAlign: "center", fontSize: 11, color: "#000000", margin: "4px 0 12px 0", fontWeight: 600 }}>
                PHỤ TRÁCH LẬP: {employeeName.toUpperCase()}
              </p>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #cbd5e1", marginBottom: 20, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "19%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "linear-gradient(135deg, rgba(0,48,135,0.08), rgba(201,168,76,0.05))" }}>
                    <th style={{ ...thStyle, textAlign: "center", border: "1px solid #cbd5e1" }}>#</th>
                    <th style={{ ...thStyle, border: "1px solid #cbd5e1" }}>Công việc</th>
                    {["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"].map((w, i) => (
                      <th key={w} style={{ ...thStyle, textAlign: "center", border: "1px solid #cbd5e1" }}>
                        <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <span style={{ color: "#003087" }}>{w}</span>
                          <span style={{ fontSize: 10, fontWeight: 500, color: "#000000", letterSpacing: 0, textTransform: "none" }}>
                            {weekRanges[i].label}
                          </span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    return allAvailableGroups.map((group, gIdx) => {
                      const groupTasks = (plan?.tasks || []).filter(t => t.taskGroup === group.value);
                      const hasSubGroups = (group.subGroups && group.subGroups.length > 0) || groupTasks.length > 0;

                      const buildPackedWeekCells = (packedRow: MTask[]) => {
                        const cells: { active: boolean; span: number; task?: MTask }[] = [];
                        let i = 0;
                        while (i < 4) {
                          const taskHere = packedRow.find(t =>
                            (i === 0 && t.week1) ||
                            (i === 1 && t.week2) ||
                            (i === 2 && t.week3) ||
                            (i === 3 && t.week4)
                          );
                          if (taskHere) {
                            let span = 1;
                            while (i + span < 4) {
                              const nextW = i + span;
                              if ((nextW === 1 && taskHere.week2) || (nextW === 2 && taskHere.week3) || (nextW === 3 && taskHere.week4)) {
                                span++;
                              } else {
                                break;
                              }
                            }
                            cells.push({ active: true, span, task: taskHere });
                            i += span;
                          } else {
                            cells.push({ active: false, span: 1 });
                            i++;
                          }
                        }
                        return cells;
                      };

                      if (groupTasks.length === 0 && !hasSubGroups) return null;

                      // Collect all subgroups including dynamic ones
                      const dynamicSubGroups = groupTasks
                        .filter(t => t.taskType === "group")
                        .map(t => ({ value: t.id, label: t.title }));

                      const allSubGroups = [...(group.subGroups || []), ...dynamicSubGroups];
                      const standaloneTasks = groupTasks.filter(t => t.taskType !== "group" && !t.taskSubGroup);

                      return (
                        <React.Fragment key={group.value}>
                          <tr style={{ background: `${group.color}12`, borderTop: gIdx === 0 ? "none" : "2px solid #cbd5e1" }}>
                            <td style={{ padding: "8px 12px", border: "1px solid #cbd5e1", textAlign: "center", color: group.color, fontSize: 13, fontWeight: 800 }}>
                              {gIdx + 1}
                            </td>
                            <td style={{ padding: "8px 12px", border: "1px solid #cbd5e1", fontWeight: 800, color: group.color, textTransform: "uppercase" }}>
                              {group.label}
                            </td>
                            <td colSpan={4} style={{ border: "1px solid #cbd5e1" }}></td>
                          </tr>

                          {/* SUBGROUPS */}
                          {allSubGroups.map(sub => {
                            const subTasks = groupTasks.filter(t => t.taskType !== "group" && (t.taskSubGroup === sub.value || t.taskSubGroup === sub.label));
                            if (subTasks.length === 0 && sub.value !== "ngay_le" && sub.value !== "noi_dung" && sub.value !== "san_pham") return null;

                            return (
                              <React.Fragment key={sub.value}>
                                <tr>
                                  <td style={{ border: "1px solid #cbd5e1", textAlign: "center", verticalAlign: "middle" }}></td>
                                  <td style={{ padding: "8px 12px", border: "1px solid #cbd5e1", verticalAlign: "middle" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12, color: "#1e293b", textTransform: "uppercase" }}>
                                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                                      {sub.label}
                                    </span>
                                  </td>
                                  {sub.value === "noi_dung" ? (
                                    <td colSpan={4} style={{ border: "1px solid #cbd5e1", padding: "8px 12px", fontSize: 12, lineHeight: 1.4 }}>
                                      {subTasks.map((t, ci) => (
                                        <div id={`task-item-${t.id}`} key={t.id} style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: ci < subTasks.length - 1 ? 6 : 0, paddingBottom: ci < subTasks.length - 1 ? 6 : 0, borderBottom: ci < subTasks.length - 1 ? "1px dashed #cbd5e1" : "none", transition: "all 0.3s" }}>
                                          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                            <span style={{ color: group.color, marginTop: 5, flexShrink: 0, fontSize: 8, opacity: 0.6 }}>◦</span>
                                            <strong style={{ color: "#003087", fontWeight: 700 }}>{t.title}</strong>
                                          </div>
                                          {t.description && (
                                            <div style={{ color: "#000000", paddingLeft: 16, whiteSpace: "pre-wrap" }}>
                                              {t.description}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </td>
                                  ) : sub.value === "san_pham" ? (
                                    (["week1Content", "week2Content", "week3Content", "week4Content"] as const).map((field, wi) => {
                                      let weekContents = subTasks.map(t => t[field]).filter(Boolean);
                                      weekContents = weekContents.flatMap(c => c ? c.split(", ") : []);
                                      return (
                                        <td key={wi} style={{ border: "1px solid #cbd5e1", padding: "6px", verticalAlign: "top" }}>
                                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            {weekContents.length > 0 ? (
                                              [...new Set(weekContents)].map((c, ci) => (
                                                <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                                                  <span style={{ color: group.color, marginTop: 4, flexShrink: 0, fontSize: 8, opacity: 0.6 }}>◦</span>
                                                  <span style={{ color: "#334155", fontWeight: 500, fontSize: 11 }}>{c}</span>
                                                </div>
                                              ))
                                            ) : <span style={{ color: "#94a3b8", fontSize: 11, fontStyle: "italic", marginLeft: 4 }}>-</span>}
                                          </div>
                                        </td>
                                      )
                                    })
                                  ) : sub.value === "ngay_le" ? (
                                    (["week1Content", "week2Content", "week3Content", "week4Content"] as const).map((field, wi) => {
                                      const weekTasks = subTasks.map(t => t[field]).filter(Boolean);
                                      let weekContents = [...weekTasks];
                                      const range = weekRanges[wi];
                                      const autoHolidays = getHolidaysForWeek(month, range.start, range.end);
                                      autoHolidays.forEach(h => {
                                        if (!weekContents.some(c => c && c.toLowerCase().includes(h.toLowerCase()))) {
                                          weekContents.push(h);
                                        }
                                      });
                                      return (
                                        <td key={wi} style={{ border: "1px solid #cbd5e1", padding: "6px", verticalAlign: "top" }}>
                                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            {weekContents.length > 0 ? (
                                              weekContents.map((c, ci) => (
                                                <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                                                  <span style={{ color: group.color, marginTop: 4, flexShrink: 0, fontSize: 8, opacity: 0.6 }}>◦</span>
                                                  <span style={{ color: "#334155", fontWeight: 500, fontSize: 11 }}>{c}</span>
                                                </div>
                                              ))
                                            ) : null}
                                          </div>
                                        </td>
                                      )
                                    })
                                  ) : (() => {
                                    const packedRows: MTask[][] = [];
                                    for (const task of subTasks) {
                                      let placed = false;
                                      for (const row of packedRows) {
                                        const overlaps = row.some(rTask =>
                                          (task.week1 && rTask.week1) ||
                                          (task.week2 && rTask.week2) ||
                                          (task.week3 && rTask.week3) ||
                                          (task.week4 && rTask.week4)
                                        );
                                        if (!overlaps) {
                                          row.push(task);
                                          placed = true;
                                          break;
                                        }
                                      }
                                      if (!placed) packedRows.push([task]);
                                    }

                                    return packedRows.length > 0 ? (
                                      buildPackedWeekCells(packedRows[0]).map((cell, ci) => cell.active && cell.task ? (
                                        <td key={ci} colSpan={cell.span} style={{ border: "1px solid #cbd5e1", padding: "6px 10px", verticalAlign: "top" }}>
                                          <div id={`task-item-${cell.task.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: `${group.color}18`, borderRadius: 6, padding: "5px 10px", border: `1px solid ${group.color}30`, transition: "all 0.3s" }}>
                                            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                              <span style={{ fontSize: 12, fontWeight: 700, color: group.color, display: "block", lineHeight: 1.3 }}>
                                                {cell.task.title}
                                              </span>
                                              {(cell.task.assigneeName || cell.task.budget || cell.task.description) && (
                                                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px", fontSize: 12, color: "#000", marginTop: 4, lineHeight: 1.3 }}>
                                                  {cell.task.assigneeName && <span><i className="bi bi-person-fill me-1" />{cell.task.assigneeName}</span>}
                                                  {cell.task.budget ? <span><i className="bi bi-cash me-1" />{Number(cell.task.budget).toLocaleString("vi-VN")}đ</span> : null}
                                                  {cell.task.description && <span style={{ flex: "1 1 100%", whiteSpace: "pre-wrap", textAlign: "justify", marginTop: 4 }}><i className="bi bi-justify-left me-1" />{cell.task.description}</span>}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                      ) : (
                                        <td key={ci} style={{ border: "1px solid #cbd5e1" }}></td>
                                      ))
                                    ) : (
                                      ([0, 1, 2, 3]).map(wi => <td key={wi} style={{ border: "1px solid #cbd5e1" }}></td>)
                                    )
                                  })()}
                                </tr>

                                {/* dynamic subTasks remainder rows */}
                                {sub.value !== "noi_dung" && sub.value !== "san_pham" && sub.value !== "ngay_le" && (() => {
                                  const packedRows: MTask[][] = [];
                                  for (const task of subTasks) {
                                    let placed = false;
                                    for (const row of packedRows) {
                                      const overlaps = row.some(rTask =>
                                        (task.week1 && rTask.week1) ||
                                        (task.week2 && rTask.week2) ||
                                        (task.week3 && rTask.week3) ||
                                        (task.week4 && rTask.week4)
                                      );
                                      if (!overlaps) {
                                        row.push(task);
                                        placed = true;
                                        break;
                                      }
                                    }
                                    if (!placed) packedRows.push([task]);
                                  }

                                  return packedRows.slice(1).map((row, rIdx) => {
                                    const cells = buildPackedWeekCells(row);
                                    return (
                                      <tr key={`dyn-row-${rIdx}`} style={{ background: `${group.color}06` }}>
                                        <td style={{ border: "1px solid #cbd5e1", textAlign: "center", verticalAlign: "middle" }}></td>
                                        <td style={{ border: "1px solid #cbd5e1" }}></td>
                                        {cells.map((cell, ci) => cell.active && cell.task ? (
                                          <td key={ci} colSpan={cell.span} style={{ borderTop: "1px dashed #cbd5e1", borderLeft: "1px solid #cbd5e1", borderRight: "1px solid #cbd5e1", borderBottom: rIdx === packedRows.length - 2 ? "1px solid #cbd5e1" : "none", padding: "6px 10px", verticalAlign: "top" }}>
                                            <div id={`task-item-${cell.task.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: `${group.color}18`, borderRadius: 6, padding: "5px 10px", border: `1px solid ${group.color}30`, transition: "all 0.3s" }}>
                                              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: group.color, display: "block", lineHeight: 1.3 }}>
                                                  {cell.task.title}
                                                </span>
                                                {(cell.task.assigneeName || cell.task.budget || cell.task.description) && (
                                                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12, color: "#000", marginTop: 3, lineHeight: 1.3 }}>
                                                    {cell.task.assigneeName && <span><i className="bi bi-person-fill me-1" />{cell.task.assigneeName}</span>}
                                                    {cell.task.budget ? <span><i className="bi bi-cash me-1" />{Number(cell.task.budget).toLocaleString("vi-VN")}đ</span> : null}
                                                    {cell.task.description && <span style={{ flex: "1 1 100%", whiteSpace: "pre-wrap", textAlign: "justify", marginTop: 4 }}><i className="bi bi-justify-left me-1" />{cell.task.description}</span>}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                        ) : (
                                          <td key={ci} style={{ borderTop: "1px dashed #cbd5e1", borderLeft: "1px solid #cbd5e1", borderRight: "1px solid #cbd5e1", borderBottom: rIdx === packedRows.length - 2 ? "1px solid #cbd5e1" : "none" }}></td>
                                        ))}
                                      </tr>
                                    );
                                  });
                                })()}
                              </React.Fragment>
                            )
                          })}
                          {/* Render direct tasks acting as sub-groups for non-chu_de_thang items */}
                          {group.value !== "chu_de_thang" && (plan?.tasks || []).filter(t => t.taskGroup === group.value && !t.taskSubGroup).map(t => {
                            const dynamicSubTasks = (plan?.tasks || []).filter(child => child.taskGroup === group.value && (child.taskSubGroup === t.id || child.taskSubGroup === t.title));

                            return (
                              <React.Fragment key={t.id}>
                                <tr>
                                  <td style={{ border: "1px solid #cbd5e1", textAlign: "center", verticalAlign: "middle" }}></td>
                                  <td style={{ padding: "8px 12px", border: "1px solid #cbd5e1", verticalAlign: "middle" }}>
                                    <span id={`task-item-${t.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12, color: "#1e293b", textTransform: "uppercase", transition: "all 0.3s" }}>
                                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                                      {t.title}
                                    </span>
                                  </td>
                                  {(() => {
                                    const packedRows: MTask[][] = [];
                                    for (const task of dynamicSubTasks) {
                                      let placed = false;
                                      for (const row of packedRows) {
                                        const overlaps = row.some(rTask =>
                                          (task.week1 && rTask.week1) ||
                                          (task.week2 && rTask.week2) ||
                                          (task.week3 && rTask.week3) ||
                                          (task.week4 && rTask.week4)
                                        );
                                        if (!overlaps) {
                                          row.push(task);
                                          placed = true;
                                          break;
                                        }
                                      }
                                      if (!placed) packedRows.push([task]);
                                    }

                                    return packedRows.length > 0 ? (
                                      buildPackedWeekCells(packedRows[0]).map((cell, ci) => cell.active && cell.task ? (
                                        <td key={ci} colSpan={cell.span} style={{ border: "1px solid #cbd5e1", padding: "6px 10px", verticalAlign: "top" }}>
                                          <div id={`task-item-${cell.task.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: `${group.color}18`, borderRadius: 6, padding: "5px 10px", border: `1px solid ${group.color}30`, transition: "all 0.3s" }}>
                                            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                              <span style={{ fontSize: 12, fontWeight: 700, color: group.color, display: "block", lineHeight: 1.3 }}>
                                                {cell.task.title}
                                              </span>
                                              {(cell.task.assigneeName || cell.task.budget || cell.task.description) && (
                                                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12, color: "#000", marginTop: 3, lineHeight: 1.3 }}>
                                                  {cell.task.assigneeName && <span><i className="bi bi-person-fill me-1" />{cell.task.assigneeName}</span>}
                                                  {cell.task.budget ? <span><i className="bi bi-cash me-1" />{Number(cell.task.budget).toLocaleString("vi-VN")}đ</span> : null}
                                                  {cell.task.description && <span style={{ flex: "1 1 100%", whiteSpace: "pre-wrap", textAlign: "justify", marginTop: 4 }}><i className="bi bi-justify-left me-1" />{cell.task.description}</span>}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                      ) : (
                                        <td key={ci} style={{ border: "1px solid #cbd5e1" }}></td>
                                      ))
                                    ) : (
                                      ([0, 1, 2, 3]).map(wi => <td key={wi} style={{ border: "1px solid #cbd5e1" }}></td>)
                                    )
                                  })()}
                                </tr>

                                {/* dynamic subTasks remainder rows */}
                                {(() => {
                                  const packedRows: MTask[][] = [];
                                  for (const task of dynamicSubTasks) {
                                    let placed = false;
                                    for (const row of packedRows) {
                                      const overlaps = row.some(rTask =>
                                        (task.week1 && rTask.week1) ||
                                        (task.week2 && rTask.week2) ||
                                        (task.week3 && rTask.week3) ||
                                        (task.week4 && rTask.week4)
                                      );
                                      if (!overlaps) {
                                        row.push(task);
                                        placed = true;
                                        break;
                                      }
                                    }
                                    if (!placed) packedRows.push([task]);
                                  }

                                  return packedRows.slice(1).map((row, rIdx) => {
                                    const cells = buildPackedWeekCells(row);
                                    return (
                                      <tr key={`dyn-row-${rIdx}`} style={{ background: `${group.color}06` }}>
                                        <td style={{ border: "1px solid #cbd5e1", textAlign: "center", verticalAlign: "middle" }}></td>
                                        <td style={{ border: "1px solid #cbd5e1" }}></td>
                                        {cells.map((cell, ci) => cell.active && cell.task ? (
                                          <td key={ci} colSpan={cell.span} style={{ borderTop: "1px dashed #cbd5e1", borderLeft: "1px solid #cbd5e1", borderRight: "1px solid #cbd5e1", borderBottom: rIdx === packedRows.length - 2 ? "1px solid #cbd5e1" : "none", padding: "6px 10px", verticalAlign: "top" }}>
                                            <div id={`task-item-${cell.task.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: `${group.color}18`, borderRadius: 6, padding: "5px 10px", border: `1px solid ${group.color}30`, transition: "all 0.3s" }}>
                                              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: group.color, display: "block", lineHeight: 1.3 }}>
                                                  {cell.task.title}
                                                </span>
                                                {(cell.task.assigneeName || cell.task.budget || cell.task.description) && (
                                                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12, color: "#000", marginTop: 3, lineHeight: 1.3 }}>
                                                    {cell.task.assigneeName && <span><i className="bi bi-person-fill me-1" />{cell.task.assigneeName}</span>}
                                                    {cell.task.budget ? <span><i className="bi bi-cash me-1" />{Number(cell.task.budget).toLocaleString("vi-VN")}đ</span> : null}
                                                    {cell.task.description && <span style={{ flex: "1 1 100%", whiteSpace: "pre-wrap", textAlign: "justify", marginTop: 4 }}><i className="bi bi-justify-left me-1" />{cell.task.description}</span>}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                        ) : (
                                          <td key={ci} style={{ borderTop: "1px dashed #cbd5e1", borderLeft: "1px solid #cbd5e1", borderRight: "1px solid #cbd5e1", borderBottom: rIdx === packedRows.length - 2 ? "1px solid #cbd5e1" : "none" }}></td>
                                        ))}
                                      </tr>
                                    );
                                  });
                                })()}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "0 60px", pageBreakInside: "avoid" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#000000" }}>NGƯỜI LẬP BẢNG</p>
                  <p style={{ margin: "4px 0 80px 0", fontSize: 12, fontStyle: "italic", color: "#000000" }}>(Ký, ghi rõ họ tên)</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, textTransform: "uppercase" }}>{employeeName}</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#000000" }}>PHÊ DUYỆT</p>
                  <p style={{ margin: "4px 0 80px 0", fontSize: 12, fontStyle: "italic", color: "#000000" }}>(Ký, ghi rõ họ tên)</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, textTransform: "uppercase" }}>{companyInfo?.legalRep || "GIÁM ĐỐC"}</p>
                </div>
              </div>
            </div>
          }
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

// ── Main Page (Wrapped in Suspense) ───────────────────────────────────────────
export default function PlanMonthlyPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ width: 40, height: 40, border: "4px solid var(--muted)", borderTopColor: "#003087", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    }>
      <PlanMonthlyContent />
    </Suspense>
  );
}
