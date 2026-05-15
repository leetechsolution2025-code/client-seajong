"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PrintPreviewModal, printDocumentById, printStyles } from "@/components/ui/PrintPreviewModal";
import { ApprovalCenter } from "@/components/approvals/ApprovalCenter";

// ── TYPES ──────────────────────────────────────────────────────────────────────
type PlanGoal = "Tăng nhận diện" | "Tăng doanh số" | "Giữ chân khách hàng" | "Ra mắt sản phẩm mới";
type ContentPillar = { id: string; name: string; target: string; weight: number };
type ContentType = { id: string; pillarId: string; name: string; format: string; freq: string };
type Topic = { id: string; typeId: string; title: string; hook: string; publishDate: string };

// ── DUMMY DATA Lấy từ module khác ──────────────────────────────────────────────
const LEAD_SEGMENTS = ["Khách buôn sỉ", "Đại lý cấp 1", "Khách lẻ nhà nước", "Dự án khách sạn"];
const PLATFORMS = ["Facebook", "Zalo", "Google Ads", "TikTok", "Showroom Offline"];

type TreeTask = {
  id: string;
  name: string;
  pic: string;
  picName?: string;
  color: string;
  note?: string;
  department?: string;
  isExpanded?: boolean;
  children: TreeTask[];
};

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const AVATAR_COLORS = ["#dc2626", "#ea580c", "#d97706", "#65a30d", "#059669", "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3", "#e11d48", "#b91c1c", "#1d4ed8", "#4338ca"];
const getColorFromName = (name: string) => {
  if (!name) return "#000000";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const AutoResizeTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      if (scrollHeight > 0) {
        textareaRef.current.style.height = (scrollHeight + 2) + "px";
      }
    }
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [props.value, adjustHeight]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      adjustHeight();
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      {...props}
      style={{
        ...props.style,
        overflow: "hidden",
        height: "auto",
        display: "block",
        width: "100%",
        resize: "none"
      }}
    />
  );
};
const StrategyBulletInput = ({ value, onChange, readOnly, style }: any) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Initialize with a bullet if empty
  React.useEffect(() => {
    if (!value && !readOnly) {
      onChange("● ");
    }
  }, [value, readOnly, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;

      const newVal = val.substring(0, start) + "\n● " + val.substring(end);
      onChange(newVal);

      // Reset cursor position after render
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 3;
      }, 10);
    }
  };

  return (
    <div style={{ width: "100%", ...style }}>
      <AutoResizeTextarea
        value={value || ""}
        readOnly={readOnly}
        onChange={(e: any) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập nội dung chi tiết..."
        style={{
          border: "none",
          background: "transparent",
          outline: "none",
          width: "100%",
          fontSize: 12,
          color: "#000",
          padding: 0,
          margin: 0,
          minHeight: 18,
          lineHeight: 1.5,
          resize: "none",
          overflow: "hidden",
          display: "block",
          fontFamily: "inherit"
        }}
      />
    </div>
  );
};

const AVAILABLE_CHANNELS = ["Facebook", "Youtube", "Tiktok", "Instagram"];
const AVAILABLE_VISUALS = ["Hình ảnh", "Video"];
const AVAILABLE_WEEKS = ["1", "2", "3", "4"];

const MultiDropSelect = ({ value, onChange, options, placeholder, disabled }: { value: string, onChange: (val: string) => void, options: string[], placeholder: string, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedCodes = (value || "").split(',').map(s => s.trim()).filter(Boolean);

  const toggleOption = (opt: string) => {
    if (disabled) return;
    let newSelected = [...selectedCodes];
    if (newSelected.includes(opt)) {
      newSelected = newSelected.filter(c => c !== opt);
    } else {
      newSelected.push(opt);
    }
    // Sort based on original options order
    newSelected.sort((a, b) => options.indexOf(a) - options.indexOf(b));
    onChange(newSelected.join(', '));
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", opacity: disabled ? 0.6 : 1 }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ width: "100%", fontSize: 13, color: value ? "var(--foreground)" : "var(--muted-foreground)", lineHeight: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: disabled ? "not-allowed" : "pointer", minHeight: 20 }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || placeholder}
        </span>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: 11, opacity: 0.5 }} />
      </div>

      {isOpen && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, width: 140, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px", zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          {options.map(opt => {
            const isChecked = selectedCodes.includes(opt);
            return (
              <div key={opt} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleOption(opt); }} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", cursor: "pointer", borderRadius: 4, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: "1px solid " + (isChecked ? "var(--primary)" : "var(--border)"), background: isChecked ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isChecked && <i className="bi bi-check" style={{ color: "white", fontSize: 13 }} />}
                </div>
                <span style={{ fontSize: 12, color: "#000" }}>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const updateTaskInChildren = (list: TreeTask[], parentId: string, updater: (t: TreeTask) => TreeTask): TreeTask[] => {
  return list.map(t => {
    if (t.id === parentId) return updater(t);
    if (t.children && t.children.length > 0) {
      return { ...t, children: updateTaskInChildren(t.children, parentId, updater) };
    }
    return t;
  });
};

export default function PlanYearlyPage() {
  const { data: session } = useSession();
  const toast = useToast();

  const [contentOffcanvasOpen, setContentOffcanvasOpen] = useState(false);
  const [activePillarIdForContent, setActivePillarIdForContent] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatAllocation, setNewCatAllocation] = useState<number>(0);
  const [newCatPosts, setNewCatPosts] = useState<number>(0);
  const [newCatDetail, setNewCatDetail] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const handleSaveNewContentCategory = () => {
    if (!activePillarIdForContent || !newCatName.trim()) {
      toast.error("Lỗi", "Vui lòng nhập tên nội dung");
      return;
    }

    let formattedDetail = newCatDetail;
    if (formattedDetail) {
      formattedDetail = formattedDetail.split("\n")
        .map(line => {
          let cleaned = line.trim().replace(/^[-+*]\s*/, "");
          if (!cleaned) return "";
          return cleaned.startsWith("●") ? cleaned : `● ${cleaned}`;
        })
        .filter(line => line !== "")
        .join("\n");
    }

    if (editingCatId) {
      setPillars(prev => prev.map(p => {
        if (p.id === activePillarIdForContent) {
          return {
            ...p,
            categories: p.categories.map(c => c.id === editingCatId ? {
              ...c,
              name: newCatName,
              description: formattedDetail,
              allocation: newCatAllocation,
              postsPerMonth: newCatPosts
            } : c)
          };
        }
        return p;
      }));
      toast.success("Thành công", "Đã cập nhật nội dung.");
    } else {
      const newCat = {
        id: "cat_" + Math.random().toString(36).substr(2, 9),
        name: newCatName,
        description: formattedDetail,
        allocation: newCatAllocation,
        postsPerMonth: newCatPosts,
        topics: [],
        expanded: false,
      };
      setPillars(prev => prev.map(p => {
        if (p.id === activePillarIdForContent) {
          return { ...p, categories: [...p.categories, newCat], expanded: true };
        }
        return p;
      }));
      toast.success("Thành công", "Đã thêm nội dung mới. Bạn có thể sửa chi tiết trong bảng.");
    }

    handleCloseContentOffcanvas();
  };

  const handleCloseContentOffcanvas = () => {
    setContentOffcanvasOpen(false);
    setNewCatName("");
    setNewCatDetail("");
    setNewCatAllocation(0);
    setNewCatPosts(0);
    setActivePillarIdForContent(null);
    setEditingCatId(null);
  };

  const handleDeleteNewContentCategory = () => {
    if (editingCatId && activePillarIdForContent) {
      setPillars(prev => prev.map(p => {
        if (p.id === activePillarIdForContent) {
          return {
            ...p,
            categories: p.categories.filter(c => c.id !== editingCatId)
          };
        }
        return p;
      }));
      toast.success("Thành công", "Đã xóa nội dung.");
    }
    handleCloseContentOffcanvas();
  };


  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetch("/api/company")
      .then(res => res.json())
      .then(data => {
        if (data && data.name) setCompanyInfo(data);
      })
      .catch(console.error);
  }, []);

  const [openAccordion, setOpenAccordion] = useState<number>(0);
  const [marketingStaff, setMarketingStaff] = useState<{ id: string, name: string, initials: string, status?: string }[]>([]);
  const [focusedPicTaskId, setFocusedPicTaskId] = useState<string | null>(null);
  const [staffFetchErr, setStaffFetchErr] = useState<string>("");
  const [focusNewTaskId, setFocusNewTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (focusNewTaskId) {
      setTimeout(() => {
        const input = document.getElementById(`task-input-${focusNewTaskId}`);
        if (input) input.focus();
        setFocusNewTaskId(null);
      }, 50);
    }
  }, [focusNewTaskId]);

  useEffect(() => {
    fetch('/api/hr/employees?pageSize=100', { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) {
          setStaffFetchErr(`Lỗi ${res.status}: ${await res.text()}`);
          return null; // Return null so next then block skips
        }
        return res.json();
      })
      .then(data => {
        if (!data) return; // Skip if errored above
        if (data.employees) {
          // Tải toàn bộ nhân viên Marketing (bao gồm cả người đã nghỉ để tra cứu tên cũ)
          let staff = data.employees.filter((e: any) =>
            (e.departmentCode || "").toLowerCase().includes("mkt") || (e.departmentName || "").toLowerCase().includes("marketing")
          );
          if (staff.length === 0) staff = data.employees;

          setMarketingStaff(staff.map((s: any) => ({
            id: s.id,
            name: s.fullName || "No Name",
            initials: getInitials(s.fullName),
            status: s.status // Lưu lại trạng thái để lọc ở UI
          })));
        } else {
          setStaffFetchErr("No employees array in response");
        }
      })
      .catch(err => {
        console.error(err);
        setStaffFetchErr(err.message || err.toString());
      });
  }, []);

  // ── STATE - STEP 1 ───────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [goal, setGoal] = useState<string>("Tăng doanh số"); // Mặc định tuỳ chọn đầu tiên
  const [budget, setBudget] = useState("");
  const [budgetSubTab, setBudgetSubTab] = useState<'total' | 'monthly'>('total');
  const [activeBudgetMonth, setActiveBudgetMonth] = useState(new Date().getMonth() + 1);
  const [budgetValidationAlert, setBudgetValidationAlert] = useState<{ title: string, message: string } | null>(null);
  const [agencySubRows, setAgencySubRows] = useState<{ id: string; label: string; isNew?: boolean }[]>([]);
  const [brandingSubRows, setBrandingSubRows] = useState<{ id: string; label: string; isNew?: boolean }[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("ttpd-20260423-0646-ubge"); // Default to Not Approved Code
  const isFinalized = status === "ttpd-20260423-0480-zegu"; // Đã phê duyệt (Code)
  const [targetAudience, setTargetAudience] = useState<Record<string, string>>({});
  const [goalsList, setGoalsList] = useState<any[]>([
    { id: 1, label: "", icon: "bi-record-circle", color: "#000000", placeholder: "" }
  ]);
  const [tasksList, setTasksList] = useState<TreeTask[]>([
    { id: "t1", name: "", pic: "", picName: "", color: "#ef4444", children: [] }
  ]);
  const [activeStep1Slide, setActiveStep1Slide] = useState(0); // 0: Overview, 1: Roadmap
  const [activeSubSlide, setActiveSubSlide] = useState(0); // 0: Goals, 1: Audience
  const [plansByYear, setPlansByYear] = useState<Record<number, any>>({});
  const [allVersions, setAllVersions] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Stable refs — cho phép đọc allVersions/plansByYear bên trong useEffect
  // mà không cần đưa chúng vào dependency array
  const allVersionsRef = useRef<any[]>([]);
  const plansByYearRef = useRef<Record<number, any>>({});
  allVersionsRef.current = allVersions;
  plansByYearRef.current = plansByYear;

  // Ref để pollStatuses đọc giá trị mới nhất mà không cần đưa vào dependency array
  const selectedPlanIdRef = useRef<string | null>(null);
  selectedPlanIdRef.current = selectedPlanId;

  const [isSubtaskOffcanvasOpen, setIsSubtaskOffcanvasOpen] = useState(false);
  const [targetParentTask, setTargetParentTask] = useState<TreeTask | null>(null);
  const [newSubtaskForm, setNewSubtaskForm] = useState({
    id: null as string | null,
    name: "",
    note: "",
    department: "",
    pic: "",
    picName: "",
    color: "#3b82f6"
  });
  const [showOffcanvasPicker, setShowOffcanvasPicker] = useState(false);

  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState<{ id: string, name: string } | null>(null);

  const [revisionLogs, setRevisionLogs] = useState<string[]>([]);
  const originalDataRef = useRef<string | null>(null);
  const lastSavedStateRef = useRef<string | null>(null);
  const skipRevisionCheckRef = useRef(false);
  const [isVersionSwitching, setIsVersionSwitching] = useState(false);
  const [monthlyExecutionStatuses, setMonthlyExecutionStatuses] = useState<Record<string, Record<number, any>>>({});
  const [showDiscussionOffcanvas, setShowDiscussionOffcanvas] = useState(false);
  const [discussionMessages, setDiscussionMessages] = useState<any[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Kế hoạch tổng quan, chiến lược chỉ trưởng phòng (manager/admin) mới mở khoá
  const userRole = session?.user?.role || "USER";
  const userLevelOrder = session?.user?.levelOrder ?? 99;
  const isManagerOrAdmin = ["ADMIN", "SUPERADMIN"].includes(userRole) || userLevelOrder <= 2;
  const isManager = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'TRUONG_PHONG' || userLevelOrder <= 2;
  const isStaff = userLevelOrder > 2;

  const currentPlan = allVersions.find(p => p.id === selectedPlanId) || plansByYear[selectedYear];
  const isApproved = currentPlan?.status === "ttpd-20260423-0480-zegu";
  const isIssued = currentPlan?.status === "ban-hanh" || currentPlan?.versionStatus === "ttvb-20260423-5393-chxz" || isApproved;

  const isEmployeeLocked = isStaff && !isIssued;
  const [statusCategories, setStatusCategories] = useState<{ approval: any[], document: any[] }>({ approval: [], document: [] });

  useEffect(() => {
    const fetchStatusCats = async () => {
      try {
        // Fetch approval statuses
        const resApproval = await fetch('/api/board/categories?type=trang_thai_phe_duyet');
        const approvalData = await resApproval.json();

        // Fetch document statuses
        const resDocument = await fetch('/api/board/categories?type=trang_thai_van_ban');
        const documentData = await resDocument.json();

        if (Array.isArray(approvalData) && Array.isArray(documentData)) {
          setStatusCategories({
            approval: approvalData,
            document: documentData
          });
        }
      } catch (err) {
        console.error("Failed to fetch status categories:", err);
      }
    };
    fetchStatusCats();
  }, []);

  const [showSubmissionOffcanvas, setShowSubmissionOffcanvas] = useState(false);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");

  const handleAddSubRow = (parentId: string) => {
    const newId = `${parentId}_${Date.now()}`;
    const newRow = { id: newId, label: "", isNew: true };
    if (parentId === "agency") setAgencySubRows(prev => [...prev, newRow]);
    else setBrandingSubRows(prev => [...prev, newRow]);
  };

  const handleTableNavigation = (e: React.KeyboardEvent, col: string) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const input = e.currentTarget as HTMLInputElement;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (input.selectionStart !== input.selectionEnd) return;
      if (e.key === 'ArrowLeft' && input.selectionStart !== 0) return;
      if (e.key === 'ArrowRight' && input.selectionStart !== input.value.length) return;
    }

    e.preventDefault();
    const currentTr = input.closest('tr');
    if (!currentTr) return;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      let targetTr = e.key === 'ArrowUp' ? currentTr.previousElementSibling : currentTr.nextElementSibling;
      while (targetTr && targetTr.tagName !== 'TR') {
        targetTr = e.key === 'ArrowUp' ? targetTr.previousElementSibling : targetTr.nextElementSibling;
      }
      if (targetTr) {
        const targetInput = targetTr.querySelector(`input[data-col="${col}"]`) as HTMLInputElement;
        if (targetInput) targetInput.focus();
      }
    } else {
      const allCols = ["name", "rate", "val", "note"];
      const currentIndex = allCols.indexOf(col);
      const nextIndex = e.key === 'ArrowLeft' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < allCols.length) {
        const targetInput = currentTr.querySelector(`input[data-col="${allCols[nextIndex]}"]`) as HTMLInputElement;
        if (targetInput) targetInput.focus();
      }
    }
  };

  // ── STATE - STEP 2: STRATEGY BUILDER ─────────────────────────────────────────
  type StrategyTopic = { id: string; name: string; note: string; };
  type StrategyCategory = { id: string; name: string; description: string; allocation: number; postsPerMonth: number; topics: StrategyTopic[]; expanded: boolean };
  type StrategyPillar = { id: string; name: string; role: string; goal: string; description: string; allocation: number; postsPerMonth: number; color: string; expanded: boolean; categories: StrategyCategory[] };

  const PILLAR_COLORS = ["#0B2447", "#dc2626", "#0891b2", "#059669", "#7c3aed", "#ea580c"];
  const [pillars, setPillars] = useState<StrategyPillar[]>([]);
  const [activePillarId, setActivePillarId] = useState<string | null>(null);
  const activePillar = pillars.find(p => p.id === activePillarId) ?? null;

  // Budget overflow confirm dialog
  const [budgetWarn, setBudgetWarn] = useState<{ pillarId: string; next: number; total: number } | null>(null);
  const [catWarn, setCatWarn] = useState<{ limit: number; total: number } | null>(null);

  const addPillar = () => {
    const id = Date.now().toString();
    const color = PILLAR_COLORS[pillars.length % PILLAR_COLORS.length];
    const newPillar: StrategyPillar = { id, name: "", role: "", goal: "", description: "", allocation: 0, postsPerMonth: 0, color, expanded: false, categories: [] };
    setPillars(prev => [...prev, newPillar]);
    setActivePillarId(id);
  };

  const updatePillar = (id: string, patch: Partial<StrategyPillar>) =>
    setPillars(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));

  const deletePillar = (id: string) => {
    setPillars(prev => prev.filter(p => p.id !== id));
    setActivePillarId(prev => prev === id ? null : prev);
  };

  const addCategory = (pillarId: string) => {
    const cat: StrategyCategory = { id: Date.now().toString(), name: "", description: "", allocation: 0, postsPerMonth: 0, topics: [], expanded: true };
    setPillars(prev => prev.map(p => p.id === pillarId ? { ...p, categories: [...p.categories, cat] } : p));
  };

  const updateCategory = (pillarId: string, catId: string, patch: Partial<StrategyCategory>) => {
    if (patch.allocation !== undefined) {
      const p = pillars.find(x => x.id === pillarId);
      if (p) {
        let otherTotal = 0;
        p.categories.forEach(c => {
          if (c.id !== catId) {
            otherTotal += c.allocation || 0;
          }
        });
        const currentSum = otherTotal + patch.allocation;
        if (currentSum > p.allocation) {
          setCatWarn({ limit: p.allocation, total: currentSum });
          return;
        }
      }
    }

    setPillars(prev => prev.map(p => p.id !== pillarId ? p : {
      ...p, categories: p.categories.map(c => c.id === catId ? { ...c, ...patch } : c)
    }));
  };

  const deleteCategory = (pillarId: string, catId: string) =>
    setPillars(prev => prev.map(p => p.id !== pillarId ? p : {
      ...p, categories: p.categories.filter(c => c.id !== catId)
    }));

  const addTopic = (pillarId: string, catId: string) => {
    const topic: StrategyTopic = { id: Date.now().toString(), name: "", note: "" };
    setPillars(prev => prev.map(p => p.id !== pillarId ? p : {
      ...p, categories: p.categories.map(c => c.id !== catId ? c : { ...c, topics: [...c.topics, topic] })
    }));
  };

  const updateTopic = (pillarId: string, catId: string, topicId: string, patch: Partial<StrategyTopic>) => {
    setPillars(prev => prev.map(p => p.id !== pillarId ? p : {
      ...p, categories: p.categories.map(c => c.id !== catId ? c : {
        ...c, topics: c.topics.map(t => t.id !== topicId ? t : { ...t, ...patch })
      })
    }));
  };

  const deleteTopic = (pillarId: string, catId: string, topicId: string) => {
    setPillars(prev => prev.map(p => p.id !== pillarId ? p : {
      ...p, categories: p.categories.map(c => c.id !== catId ? c : {
        ...c, topics: c.topics.filter(t => t.id !== topicId)
      })
    }));
  };

  const loadPlansFromServer = (targetYear?: number, forceActive: boolean = false) => {
    // Nếu truyền targetYear thì dùng nó, nếu không thì dùng selectedYear hiện tại
    const yearToLoad = targetYear ?? selectedYear;
    const url = isManagerOrAdmin ? `/api/marketing/plan/yearly?allVersions=true` : `/api/marketing/plan/yearly`;
    fetch(url, { cache: 'no-store' })
      .then(res => res.json())
      .then(async data => {
        if (data.success && data.plans) {
          const filteredPlans = (isManagerOrAdmin)
            ? data.plans
            : data.plans.filter((p: any) => p.versionStatus === 'ttvb-20260423-5393-chxz');

          setAllVersions(filteredPlans);
          const map: Record<number, any> = {};
          // Sort by updatedAt desc to ensure we get the latest
          const sortedPlans = [...filteredPlans].sort((a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          sortedPlans.forEach((p: any) => {
            // Prioritize: isCurrent > Most recently updated
            if (p.isCurrent || !map[p.year]) map[p.year] = p;
          });
          setPlansByYear(map);

          const plansForYear = filteredPlans.filter((p: any) => p.year === yearToLoad);

          if (plansForYear.length > 0) {
            const active = plansForYear.find((p: any) => p.isCurrent) || plansForYear[0];
            setSelectedPlanId(prev => (forceActive || !prev) ? active.id : prev);
          } else {
            // Nếu chưa có, ta mới tạo (proactive)
            setHistoryLoading(true);
            fetch("/api/marketing/plan/yearly", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ year: yearToLoad, goal: "Tăng doanh số", status: "ttpd-20260423-0646-ubge" })
            }).then(resCreate => resCreate.json())
              .then(createData => {
                if (createData.success && createData.plan) {
                  setAllVersions(prev => [createData.plan, ...prev]);
                  setPlansByYear(prev => ({ ...prev, [yearToLoad]: createData.plan }));
                  setSelectedPlanId(createData.plan.id);
                }
              }).finally(() => setHistoryLoading(false));
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadPlansFromServer();

    // Polling riêng biệt chỉ để cập nhật trạng thái và tin nhắn, không reset form (allVersions)
    const pollStatuses = () => {
      const url = isManagerOrAdmin ? `/api/marketing/plan/yearly?allVersions=true` : `/api/marketing/plan/yearly`;
      fetch(url, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.plans) {
            const filteredPlans = isManagerOrAdmin ? data.plans : data.plans.filter((p: any) => p.versionStatus === 'ttvb-20260423-5393-chxz');
            const plansForYear = filteredPlans.filter((p: any) => p.year === selectedYear);
            if (plansForYear.length > 0) {
              const active = plansForYear.find((p: any) => p.id === selectedPlanIdRef.current) || plansForYear.find((p: any) => p.isCurrent) || plansForYear[0];
              if (active && active.monthlyExecutionStatuses) {
                setMonthlyExecutionStatuses(active.monthlyExecutionStatuses);
              }
            }
          }
        }).catch(() => { });
    };

    const interval = setInterval(pollStatuses, 20000); // 20s refresh
    return () => clearInterval(interval);
  // Bỏ selectedPlanId khỏi deps để tránh vòng lặp: loadPlansFromServer → setSelectedPlanId → re-run
  // pollStatuses đọc selectedPlanId qua ref nên vẫn luôn có giá trị mới nhất
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManagerOrAdmin, selectedYear]);

  const [isViewingDraft, setIsViewingDraft] = useState(false);

  // Handle Year switching — dùng ref để không trigger khi allVersions thay đổi do auto-save
  useEffect(() => {
    const versions = allVersions;
    if (versions.length > 0) {
      const planForYear = versions.find((p: any) => p.year === selectedYear && p.isCurrent) ||
        versions.find((p: any) => p.year === selectedYear);
      if (planForYear) {
        setSelectedPlanId(planForYear.id);
      } else {
        // Nếu không có trong danh sách hiện tại, thử tải/tạo từ server
        loadPlansFromServer(selectedYear);
      }
    } else {
      loadPlansFromServer(selectedYear);
    }
  }, [selectedYear]);

  useEffect(() => {
    console.group("Version Loading Debug");
    console.log("Loading plan for ID:", selectedPlanId);
    if (allVersionsRef.current.length > 0) {
      console.table(allVersionsRef.current.map(v => ({
        id: v.id,
        code: v.code,
        status: v.status,
        version: v.versionStatus,
        isCurrent: v.isCurrent
      })));
    }

    // Xác định plan cần load
    let plan = allVersionsRef.current.find(p => p.id === selectedPlanId);
    console.log("Plan found in allVersions:", !!plan);

    if (!plan && selectedPlanId) {
      console.error("CRITICAL: Selected ID NOT FOUND in allVersions!");
      if (allVersionsRef.current.length > 0) {
        console.warn("Possible year mismatch or plan has been deleted/hidden.");
      }
      console.groupEnd();
      return;
    }

    // Nếu không có ID nào được chọn, fallback sang plan active của năm hiện tại
    if (!plan && !selectedPlanId) {
      plan = plansByYearRef.current[selectedYear];
    }
    console.groupEnd();

    // REMOVED UNCONDITIONAL RESET TO PREVENT DATA LOSS DURING NEW YEAR CREATION
    setRevisionLogs([]);
    setIsViewingDraft(false);
    originalDataRef.current = null;

    if (!plan) {
      // RESET FORM COMPLETELY nếu không tìm thấy kế hoạch (tránh dính UI rác từ năm cũ)
      setGoal("Tăng doanh số");
      setBudget("");
      setTargetAudience({});
      setSelectedPlatforms([]);
      setGoalsList([{ id: 1, label: "", icon: "bi-record-circle", color: "#000000", placeholder: "" }]);
      setTasksList([{ id: "t1", name: "", pic: "", picName: "", color: "#ef4444", children: [] }]);
      setPillars([]);
      setMonthlyPlans({});
      setAgencySubRows([]);
      setBrandingSubRows([]);
      setStatus("Chưa khởi tạo");
      return;
    }

    // Flag start of switching to prevent revision detector from running prematurely
    skipRevisionCheckRef.current = true;
    setIsVersionSwitching(true);

    // SHADOW REVISION LOGIC: 
    let activeData = plan;
    let usingDraft = false;

    if (isManagerOrAdmin && plan.revisionData) {
      try {
        const draft = JSON.parse(plan.revisionData);
        activeData = {
          ...plan,
          generalPlan: {
            ...plan.generalPlan,
            primaryGoal: draft.goal || draft.primaryGoal,
            totalBudget: Number((draft.budget || "").toString().replace(/\D/g, "")),
            platforms: draft.selectedPlatforms ? JSON.stringify(draft.selectedPlatforms) : plan.generalPlan?.platforms,
            targetAudience: draft.targetAudience ? (typeof draft.targetAudience === 'string' ? draft.targetAudience : JSON.stringify(draft.targetAudience)) : plan.generalPlan?.targetAudience,
          },
          goals: draft.goalsList?.map((g: any) => ({ ...g, description: g.placeholder })) || plan.goals,
          tasksList: draft.tasksList,
          strategyData: draft.strategyData,
          monthlyPlans: draft.monthlyPlans,
          isDraft: true
        };
        usingDraft = true;
      } catch (e) { console.error("Error parsing revisionData", e); }
    }
    setIsViewingDraft(usingDraft);
    setStatus(activeData.status || "ban-nhap");

    const buildTree = (parentId: string | null, list: any[]): TreeTask[] => {
      return list.filter((t: any) => t.parentId === parentId)
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          pic: t.assigneeId || "",
          color: t.color || "#000000",
          note: t.description || "",
          department: t.department || t.category || "",
          isExpanded: t.isExpanded,
          children: buildTree(t.id, list)
        }));
    };

    // Reset revision tracking
    setRevisionLogs([]);
    const loadedGoal = activeData.generalPlan?.primaryGoal || "Tăng doanh số";
    const loadedBudget = activeData.generalPlan?.totalBudget ? activeData.generalPlan.totalBudget.toLocaleString('vi-VN') : "";
    const loadedPlatforms = activeData.generalPlan?.platforms ? (typeof activeData.generalPlan.platforms === 'string' ? JSON.parse(activeData.generalPlan.platforms) : activeData.generalPlan.platforms) : [];
    const loadedAudience = activeData.generalPlan?.targetAudience ? (typeof activeData.generalPlan.targetAudience === 'string' ? JSON.parse(activeData.generalPlan.targetAudience) : activeData.generalPlan.targetAudience) : {};
    const loadedGoalsList = activeData.goals?.map((g: any) => ({
      id: g.id,
      label: g.label,
      icon: g.icon || "bi-record-circle",
      color: g.color || "#000000",
      placeholder: g.description || g.placeholder || ""
    })) || [];
    const loadedTasks = activeData.tasksList || (activeData.tasks && activeData.tasks.length > 0 ? buildTree(null, activeData.tasks) : []);
    const loadedPillars = activeData.strategyData ? (typeof activeData.strategyData === 'string' ? JSON.parse(activeData.strategyData) : activeData.strategyData) : [];
    const loadedMonthlyPlans = activeData.monthlyPlans || {};

    // ── Canonical snapshot — MUST match the shape used in auto-save & manual save ──
    const freshDataObj = {
      goal: loadedGoal,
      budget: loadedBudget,
      selectedPlatforms: loadedPlatforms,
      targetAudience: activeData.generalPlan?.targetAudience ? (typeof activeData.generalPlan.targetAudience === 'string' ? JSON.parse(activeData.generalPlan.targetAudience) : activeData.generalPlan.targetAudience) : {},
      goalsList: loadedGoalsList,
      tasksList: loadedTasks,
      pillars: loadedPillars,       // key: pillars (không phải strategyData)
      monthlyPlans: loadedMonthlyPlans,
      agencySubRows: [],            // sẽ được điền bởi budget effect bên dưới
      brandingSubRows: []
    };
    originalDataRef.current = JSON.stringify(freshDataObj);
    lastSavedStateRef.current = JSON.stringify(freshDataObj);

    setGoal(activeData.generalPlan?.primaryGoal || "Tăng doanh số");
    setBudget(activeData.generalPlan?.totalBudget ? activeData.generalPlan.totalBudget.toLocaleString('vi-VN') : "");
    try {
      setTargetAudience(activeData.generalPlan?.targetAudience ? (typeof activeData.generalPlan.targetAudience === 'string' ? JSON.parse(activeData.generalPlan.targetAudience) : activeData.generalPlan.targetAudience) : {});
    } catch (e) {
      setTargetAudience({});
    }
    setSelectedPlatforms(activeData.generalPlan?.platforms ? (typeof activeData.generalPlan.platforms === 'string' ? JSON.parse(activeData.generalPlan.platforms) : activeData.generalPlan.platforms) : []);

    // ── Budget Hydration (Step 4) ──
    const loadedAgencyRows: any[] = [];
    const loadedBrandingRows: any[] = [];
    const budgetTA: Record<string, string> = {};

    if (activeData.budgetPlan) {
      const bp = activeData.budgetPlan;
      budgetTA.budget_val_rev_goal = (bp.revenueGoal || 0).toLocaleString("vi-VN");
      budgetTA.budget_rate_mkt_total = (bp.mktRate || 0).toString();
      budgetTA.budget_val_mkt_total = (bp.mktValue || 0).toLocaleString("vi-VN");
      budgetTA.budget_rate_agency = (bp.agencyRate || 0).toString();
      budgetTA.budget_val_agency = (bp.agencyValue || 0).toLocaleString("vi-VN");
      budgetTA.budget_rate_branding = (bp.brandingRate || 0).toString();
      budgetTA.budget_val_branding = (bp.brandingValue || 0).toLocaleString("vi-VN");

      // Hydrate Monthly Budgets (Step 4.2)
      (bp.monthlyTotals || []).forEach((mt: any) => {
        budgetTA[`budget_m${mt.month}_monthly_total`] = (mt.totalValue || 0).toLocaleString("vi-VN");
      });

      (bp.items || []).forEach((item: any) => {
        const row = { id: item.id, label: item.name };
        if (item.type === "agency") loadedAgencyRows.push(row);
        else if (item.type === "branding") loadedBrandingRows.push(row);

        budgetTA[`budget_rate_${item.id}`] = (item.rate || 0).toString();
        budgetTA[`budget_val_${item.id}`] = (item.value || 0).toLocaleString("vi-VN");
        budgetTA[`budget_note_${item.id}`] = item.note || "";

        (item.monthlyDetails || []).forEach((md: any) => {
          const mKey = `m${md.month}`;
          budgetTA[`budget_${mKey}_rate_${item.id}`] = (md.rate || 0).toString();
          budgetTA[`budget_${mKey}_val_${item.id}`] = (md.value || 0).toLocaleString("vi-VN");
          budgetTA[`budget_${mKey}_note_${item.id}`] = md.note || "";
        });
      });
    }

    setAgencySubRows(loadedAgencyRows);
    setBrandingSubRows(loadedBrandingRows);

    if (activeData.goals && activeData.goals.length > 0) {
      setGoalsList(activeData.goals.map((g: any) => ({
        id: g.id,
        label: g.label,
        icon: g.icon || "bi-record-circle",
        color: g.color || "#000000",
        description: g.description || ""
      })));
    } else {
      setGoalsList([{ id: 1, label: "", icon: "bi-record-circle", color: "#000000", description: "" }]);
    }

    // Combine loaded audience with budget TA
    setTargetAudience({ ...loadedAudience, ...budgetTA });

    if (activeData.tasksList) {
      setTasksList(activeData.tasksList);
    } else if (activeData.tasks && activeData.tasks.length > 0) {
      setTasksList(buildTree(null, activeData.tasks));
    } else {
      setTasksList([{ id: "t1", name: "", pic: "", picName: "", color: "#ef4444", children: [] }]);
    }

    setStatus(activeData.status || "ttpd-20260423-0646-ubge");

    if (activeData.strategyData) {
      const migratedPillars = activeData.strategyData.map((p: any) => ({
        ...p,
        categories: (p.categories || []).map((cat: any) => {
          if (cat.name && !cat.description) {
            if (cat.name.includes('\n')) {
              const parts = cat.name.split('\n');
              return {
                ...cat,
                name: parts[0].trim(),
                description: parts.slice(1).join('\n')
              };
            } else if (cat.name.includes('●')) {
              const bulletIdx = cat.name.indexOf('●');
              if (bulletIdx > 0) {
                return {
                  ...cat,
                  name: cat.name.substring(0, bulletIdx).trim(),
                  description: cat.name.substring(bulletIdx).trim()
                };
              }
            }
          }
          return cat;
        })
      }));
      setPillars(migratedPillars);
    } else {
      setPillars([]);
    }

    if (activeData.monthlyPlans) {
      setMonthlyPlans(activeData.monthlyPlans);
    } else {
      setMonthlyPlans({});
    }

    // Baseline for diffing: The currently LOADED version
    const freshData = {
      goal: activeData.generalPlan?.primaryGoal || "Tăng doanh số",
      budget: activeData.generalPlan?.totalBudget ? activeData.generalPlan.totalBudget.toLocaleString('vi-VN') : "",
      selectedPlatforms: activeData.generalPlan?.platforms ? (typeof activeData.generalPlan.platforms === 'string' ? JSON.parse(activeData.generalPlan.platforms) : activeData.generalPlan.platforms) : [],
      targetAudience: activeData.generalPlan?.targetAudience ? (typeof activeData.generalPlan.targetAudience === 'string' ? JSON.parse(activeData.generalPlan.targetAudience) : activeData.generalPlan.targetAudience) : {},
      goalsList: (activeData.goals || []).map((g: any) => ({ ...g, placeholder: g.description })),
      tasksList: activeData.tasksList || buildTree(null, activeData.tasks || []),
      pillars: typeof activeData.strategyData === 'string' ? JSON.parse(activeData.strategyData) : (activeData.strategyData || []),
      monthlyPlans: activeData.monthlyPlans || {},
      monthlyExecutionStatuses: activeData.monthlyExecutionStatuses || {}
    };
    originalDataRef.current = JSON.stringify(freshData);
    setMonthlyExecutionStatuses(activeData.monthlyExecutionStatuses || {});
    setRevisionLogs([]);

    // Finishing transition
    setTimeout(() => {
      setIsVersionSwitching(false);
      skipRevisionCheckRef.current = false;
    }, 100);

    // Update charts/metrics from budgetPlan
    const budgetData = activeData.budgetPlan;
    if (budgetData && budgetData.id) {
      setAgencySubRows(budgetData.items.filter((i: any) => i.type === 'agency').map((i: any) => ({ id: i.id, label: i.name })));
      setBrandingSubRows(budgetData.items.filter((i: any) => i.type === 'branding').map((i: any) => ({ id: i.id, label: i.name })));
      setTargetAudience(prev => {
        const next = { ...prev };
        budgetData.items.forEach((item: any) => {
          next[`budget_rate_${item.id}`] = item.rate.toString();
          next[`budget_val_${item.id}`] = item.value.toLocaleString("vi-VN");
          next[`budget_note_${item.id}`] = item.note || "";
          item.monthlyDetails?.forEach((md: any) => {
            const mKey = `m${md.month}`;
            next[`budget_${mKey}_rate_${item.id}`] = md.rate % 1 === 0 ? md.rate.toString() : md.rate.toFixed(1);
            next[`budget_${mKey}_val_${item.id}`] = md.value.toLocaleString("vi-VN");
            next[`budget_${mKey}_note_${item.id}`] = md.note || "";
          });
        });
        budgetData.monthlyTotals?.forEach((mt: any) => {
          next[`budget_m${mt.month}_monthly_total`] = mt.totalValue.toLocaleString("vi-VN");
        });
        return next;
      });
    } else {
      setAgencySubRows([]);
      setBrandingSubRows([]);
    }
  // Bỏ allVersions khỏi deps để tránh vòng lặp: loadPlansFromServer → setAllVersions → re-run
  // Effect này đọc allVersions qua allVersionsRef.current nên vẫn luôn có giá trị mới nhất
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedPlanId, isManagerOrAdmin]);

  const updateTask = (id: string, newProps: Partial<TreeTask>) => {
    const updateArr = (arr: TreeTask[]): TreeTask[] =>
      arr.map(t => t.id === id ? { ...t, ...newProps } : { ...t, children: updateArr(t.children) });
    setTasksList(updateArr(tasksList));
  };

  const addSubtask = (parentId: string) => {
    if (isYearlyPlanReadOnly) return;
    const findTask = (arr: TreeTask[]): TreeTask | null => {
      for (const t of arr) {
        if (t.id === parentId) return t;
        const found = findTask(t.children);
        if (found) return found;
      }
      return null;
    };
    const task = findTask(tasksList);
    if (task) {
      setTargetParentTask(task);
      setNewSubtaskForm({
        id: null,
        name: "",
        note: "",
        department: task.name || "",
        pic: task.pic || "",
        picName: task.picName || (marketingStaff.find(s => s.id === task.pic)?.name || ""),
        color: task.color || "#3b82f6"
      });
      setIsSubtaskOffcanvasOpen(true);
    }
  };

  const editSubtask = (task: TreeTask, parentTask: TreeTask) => {
    if (isYearlyPlanReadOnly) return;
    setTargetParentTask(parentTask);
    setNewSubtaskForm({
      id: task.id,
      name: task.name || "",
      note: task.note || "",
      department: task.department || "",
      pic: task.pic || "",
      picName: task.picName || "",
      color: task.color || "#3b82f6"
    });
    setIsSubtaskOffcanvasOpen(true);
  };



  const deleteTask = (id: string) => {
    const findTask = (arr: TreeTask[]): TreeTask | null => {
      for (const t of arr) {
        if (t.id === id) return t;
        const found = findTask(t.children);
        if (found) return found;
      }
      return null;
    };

    const task = findTask(tasksList);
    if (task && task.children && task.children.length > 0) {
      setDeleteTaskConfirm({ id, name: task.name || "không tên" });
      return;
    }

    executeDelete(id);
  };

  const executeDelete = (id: string) => {
    const filterArr = (arr: TreeTask[]): TreeTask[] =>
      arr.filter(t => t.id !== id).map(t => ({ ...t, children: filterArr(t.children) }));
    setTasksList(filterArr(tasksList));
    setDeleteTaskConfirm(null);
  };

  const addSiblingTask = (targetId: string, level: number) => {
    const newId = `t-${Date.now()}`;
    const newTask: TreeTask = { id: newId, name: "", pic: session?.user?.id || "", picName: session?.user?.name || "", color: level === 0 ? "#ef4444" : "#d1d5db", children: [] };

    if (level === 0) {
      setTasksList(prev => {
        const idx = prev.findIndex(t => t.id === targetId);
        if (idx === -1) return [...prev, newTask];
        const next = [...prev];
        next.splice(idx + 1, 0, newTask);
        return next;
      });
    } else {
      const updateRecursive = (arr: TreeTask[]): TreeTask[] => {
        return arr.map(t => {
          if (t.children && t.children.some(c => c.id === targetId)) {
            const idx = t.children.findIndex(c => c.id === targetId);
            const nextChildren = [...t.children];
            nextChildren.splice(idx + 1, 0, newTask);
            return { ...t, isExpanded: true, children: nextChildren };
          }
          if (t.children && t.children.length > 0) {
            return { ...t, children: updateRecursive(t.children) };
          }
          return t;
        });
      };
      setTasksList(prev => updateRecursive(prev));
    }
    setFocusNewTaskId(newId);
  };


  const [activeMainTaskId, setActiveMainTaskId] = useState<string | null>(null);
  const mainTasks = tasksList;
  const isValidActive = activeMainTaskId && mainTasks.some(t => t.id === activeMainTaskId);
  const activeTabId = isValidActive ? activeMainTaskId : (mainTasks.length > 0 ? mainTasks[0].id : null);
  const activeTask = mainTasks.find(t => t.id === activeTabId);

  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [showTaskDetailOffcanvas, setShowTaskDetailOffcanvas] = useState(false);
  const [viewingTaskDetail, setViewingTaskDetail] = useState<any>(null);

  // Mở modal chuyên dụng "Add Media"
  const [showMediaAddModal, setShowMediaAddModal] = useState<{ insertIdx: number, parentName: string, editItem?: any } | null>(null);
  const [mediaForm, setMediaForm] = useState({
    chuDe: "", noiDung: "", quangCao: "No", doiTuong: "", nenTang: "", thoiGianQuay: "",
    thoiGianHoanThanh: "", linkSp: "", ghiChu: "", theoTuan: false, tuan: ""
  });

  const [isMounted, setIsMounted] = useState(false);
  const [platformOptions, setPlatformOptions] = useState<any[]>([]);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const platformDropdownRef = useRef<HTMLDivElement>(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const [showWeekDropdown, setShowWeekDropdown] = useState(false);
  const weekDropdownRef = useRef<HTMLDivElement>(null);
  const [expandDoiTuong, setExpandDoiTuong] = useState(false);
  const [expandNoiDung, setExpandNoiDung] = useState(false);

  useEffect(() => {
    const handleClickOutsideLoc = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    if (showLocationDropdown) {
      document.addEventListener("mousedown", handleClickOutsideLoc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideLoc);
    };
  }, [showLocationDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
        setShowPlatformDropdown(false);
      }
    };
    if (showPlatformDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPlatformDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (weekDropdownRef.current && !weekDropdownRef.current.contains(event.target as Node)) {
        setShowWeekDropdown(false);
      }
    };
    if (showWeekDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showWeekDropdown]);

  useEffect(() => {
    setIsMounted(true);
    fetch('/api/board/categories?type=nen_tang')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlatformOptions(data);
      })
      .catch(console.error);
  }, []);
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);
  const isPastYear = selectedYear < new Date().getFullYear();
  const isPastMonthMode = isPastYear || (selectedYear === new Date().getFullYear() && activeMonth < new Date().getMonth() + 1);

  const globalIsPastMode = isPastYear || isEmployeeLocked;
  const isYearlyPlanReadOnly = isStaff || globalIsPastMode;

  const canAccessTask = (taskName: string) => {
    if (!isStaff) return true; // Manager and Admin can access all
    const name = (taskName || "").toUpperCase();
    const pos = (session?.user?.positionName || "").toUpperCase();
    const dept = (session?.user?.departmentName || "").toUpperCase();

    if (name.includes("CONTENT") && (pos.includes("CONTENT") || dept.includes("CONTENT") || pos.includes("BIÊN TẬP"))) return true;
    if (name.includes("MEDIA") && (pos.includes("MEDIA") || pos.includes("QUAY") || pos.includes("DỰNG") || dept.includes("MEDIA"))) return true;
    if (name.includes("THIẾT KẾ") && (pos.includes("THIẾT KẾ") || pos.includes("DESIGN") || dept.includes("THIẾT KẾ") || pos.includes("HỌA"))) return true;
    if (name.includes("SEO") && (pos.includes("SEO") || dept.includes("SEO"))) return true;
    if (name.includes("QUẢNG CÁO") && (pos.includes("ADS") || pos.includes("QUẢNG CÁO") || dept.includes("QUẢNG CÁO") || pos.includes("CHẠY") || pos.includes("SEO") || dept.includes("SEO"))) return true;
    if (name.includes("ĐIỂM BÁN") && (pos.includes("TRADE") || pos.includes("ĐIỂM BÁN") || dept.includes("ĐIỂM BÁN"))) return true;

    return false;
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    // Xóa plan ID ngay lập tức để tránh ghi đè chéo năm
    setSelectedPlanId(null);
    setGoal("Tăng doanh số");
    setBudget("");
    setTargetAudience({});
    setSelectedPlatforms([]);
    setGoalsList([{ id: 1, label: "", icon: "bi-record-circle", color: "#000000", placeholder: "" }]);
    setTasksList([{ id: "t1", name: "", pic: "", picName: "", color: "#ef4444", children: [] }]);
    setPillars([]);
    setMonthlyPlans({});
    setHistoryLoading(true);
    // Reload để proactive tạo plan cho năm mới nếu chưa có
    setTimeout(() => loadPlansFromServer(year), 0);
  };

  // Auto-focus tab based on roles when tasksList is ready
  useEffect(() => {
    if (isStaff && tasksList.length > 0 && !activeMainTaskId) {
      const accessibleTask = tasksList.find(t => canAccessTask(t.name));
      if (accessibleTask) {
        setActiveMainTaskId(accessibleTask.id);
      }
    }
  }, [tasksList, isStaff, activeMainTaskId]);

  const [monthlyPlans, setMonthlyPlans] = useState<Record<string, Record<number, { id: string; name: string; time: string; pic: string; status: string; note: string; visual?: string; channel?: string; quantity?: string; isHeader?: boolean; isExpanded?: boolean; color?: string; isByWeek?: boolean; week?: string }[]>>>({});
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);

  // ── STATE - STEP 4 ───────────────────────────────────────────────────────────
  const [topics, setTopics] = useState<Topic[]>([]);

  // Cờ hiệu loading AI cho vui mắt
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const [isSaving, setIsSaving] = useState(false);

  // Sync budget from targetAudience['budget_val_mkt_total']
  useEffect(() => {
    const totalVal = targetAudience?.['budget_val_mkt_total'];
    if (totalVal !== undefined && totalVal !== budget) {
      setBudget(totalVal);
    }
  }, [targetAudience?.['budget_val_mkt_total'], budget]);

  const generateTopicsWithAI = () => {
    setIsGeneratingTopics(true);
    setTimeout(() => {
      setTopics(prev => [
        ...prev,
        { id: "tp2", typeId: "t2", title: "Test độ bền vòi rửa vòi sen Seajong", hook: "Sự thật về độ bền của vòi sen mạ Chrome...", publishDate: "2024-05-15" },
        { id: "tp3", typeId: "t1", title: "Cách chọn thiết bị vệ sinh cho nhà phố nhỏ", hook: "Không gian vệ sinh quá chật? Đừng lo...", publishDate: "2024-05-18" }
      ]);
      setIsGeneratingTopics(false);
    }, 1500);
  };


  // ─────────────────────────────────────────────────────────────────────────────
  // AUTO-SAVE LOGIC
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    lastSavedStateRef.current = null;
    originalDataRef.current = null; // Also reset original data when switching year
  }, [selectedYear]);

  // AUTO-SAVE HAS BEEN DISABLED by user request
  useEffect(() => {
    if (skipRevisionCheckRef.current || isVersionSwitching) return;
    if (!isFinalized || !originalDataRef.current) {
      if (revisionLogs.length > 0) setRevisionLogs([]);
      return;
    }

    const currentDataObj = {
      goal, budget, selectedPlatforms, targetAudience, goalsList, tasksList, pillars, monthlyPlans
    };

    let originalDataObj: any = {};
    try {
      originalDataObj = JSON.parse(originalDataRef.current);
    } catch (e) { return; }

    const logs: string[] = [];
    if (currentDataObj.goal !== originalDataObj.goal) logs.push(`Thay đổi mục tiêu chính: "${originalDataObj.goal}" -> "${currentDataObj.goal}"`);
    if (currentDataObj.budget !== originalDataObj.budget) logs.push(`Thay đổi tổng ngân sách: ${originalDataObj.budget} -> ${currentDataObj.budget}`);

    if (JSON.stringify(currentDataObj.selectedPlatforms) !== JSON.stringify(originalDataObj.selectedPlatforms)) {
      logs.push(`Thay đổi cấu trúc nền tảng triển khai`);
    }

    if (JSON.stringify(currentDataObj.tasksList) !== JSON.stringify(originalDataObj.tasksList)) {
      logs.push(`Cập nhật sơ đồ công việc (Bước 1)`);
    }

    if (JSON.stringify(currentDataObj.pillars) !== JSON.stringify(originalDataObj.pillars)) {
      logs.push(`Điều chỉnh Tuyến nội dung & Chiến lược (Bước 2)`);
    }

    if (JSON.stringify(currentDataObj.monthlyPlans) !== JSON.stringify(originalDataObj.monthlyPlans)) {
      logs.push(`Cập nhật chi tiết Kế hoạch thực hiện (Bước 3)`);
    }

    // Deep check targets
    if (JSON.stringify(currentDataObj.targetAudience) !== JSON.stringify(originalDataObj.targetAudience)) {
      logs.push(`Cập nhật các chỉ số KPIs / Đối tượng mục tiêu`);
    }

    setRevisionLogs(logs);
  }, [goal, budget, JSON.stringify(selectedPlatforms), JSON.stringify(targetAudience), JSON.stringify(goalsList), JSON.stringify(tasksList), JSON.stringify(pillars), JSON.stringify(monthlyPlans), isFinalized]);

  const [showApprovalDrawer, setShowApprovalDrawer] = useState(false);
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelPlan, setConfirmDelPlan] = useState(false);
  const [confirmRecall, setConfirmRecall] = useState(false);
  const isRecentlySavedRef = useRef(false);

  const handleDeletePlan = () => {
    setConfirmDelPlan(true);
  };

  const executeDeletePlan = async () => {
    if (!selectedPlanId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/marketing/plan/yearly?id=${selectedPlanId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Thành công", "Đã xoá kế hoạch");
        setSelectedPlanId(null);
        setStatus("Chưa khởi tạo");
        loadPlansFromServer(selectedYear);
      } else {
        toast.error("Thất bại", data.error || "Không thể xoá kế hoạch");
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", e.message || "Lỗi không xác định");
    } finally {
      setIsDeleting(false);
      setConfirmDelPlan(false);
    }
  };

  const handleAdjust = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch("/api/marketing/plan/yearly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: selectedYear, action: "adjust" }) });
      const data = await res.json();
      if (data.success) {
        toast.success("Thành công", "Đã tạo bản nháp điều chỉnh mới từ phiên bản hiện tại");
        loadPlansFromServer(undefined, true);
      } else throw new Error(data.error || "Không thể tạo bản điều chỉnh");
    } catch (err: any) {
      toast.error("Lỗi", err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRecallMonthlyExecution = () => {
    if (!activeTask) return;
    setConfirmRecall(true);
  };

  const executeRecallMonthlyExecution = async () => {
    if (!activeTask) return;
    setIsPublishing(true);

    try {
      const mData = (monthlyExecutionStatuses[activeTask.name.toUpperCase()] || {})[activeMonth];
      if (!mData?.requestId) return;

      const res = await fetch(`/api/approvals/${mData.requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recall', note: 'Thu hồi kế hoạch để chỉnh sửa.' })
      });

      if (res.ok) {
        toast.success("Đã thu hồi kế hoạch!");
        loadPlansFromServer();
      } else {
        const err = await res.json();
        toast.error(err.message || "Lỗi khi thu hồi.");
      }
    } catch (error) {
      toast.error("Lỗi khi kết nối máy chủ.");
    } finally {
      setIsPublishing(false);
      setConfirmRecall(false);
    }
  };

  const handlePublish = async () => {
    const plan = allVersions.find(p => p.id === selectedPlanId) || plansByYear[selectedYear];
    if (!plan) return;
    setIsPublishing(true);
    try {
      const savedPlan = await handleSavePlan("ban-hanh", true);
      if (!savedPlan) throw new Error("Không thể lưu trạng thái ban hành");
      toast.success("Thành công", "Đã ban hành phiên bản kế hoạch mới");
      loadPlansFromServer(undefined, true);
    } catch (err: any) {
      toast.error("Lỗi", err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSavePlan = async (targetStatus: string = "ttpd-20260423-0646-ubge", skipToast: boolean = false): Promise<any | null> => {
    if (!selectedPlanId) {
      toast.error("Lỗi", "Chưa có ID kế hoạch để lưu");
      return null;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: selectedPlanId,
        year: selectedYear,
        goal,
        budget,
        selectedPlatforms,
        targetAudience,
        agencySubRows,
        brandingSubRows,
        goalsList,
        tasksList,
        strategyData: pillars, // Cột pillars chính là dữ liệu chiến lược
        monthlyPlans,
        status: targetStatus
      };

      const res = await fetch("/api/marketing/plan/yearly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (!skipToast) toast.success("Thành công", "Đã lưu toàn bộ kế hoạch!");
        // Refresh data from server to ensure state is in sync
        loadPlansFromServer(undefined, true);
        return data.plan;
      } else {
        throw new Error(data.error || "Lỗi lưu dữ liệu");
      }
    } catch (err: any) {
      if (!skipToast) toast.error("Lỗi", err.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMonthlyPlanOnly = async (skipToast: boolean = false): Promise<any | null> => {
    setIsSaving(true);
    try {
      const payload = {
        id: selectedPlanId,
        year: selectedYear,
        partialUpdateMonthly: true,
        monthlyPlans: monthlyPlans
      };

      const res = await fetch("/api/marketing/plan/yearly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (!skipToast) {
          toast.success("Thành công", "Đã lưu bản nháp Kế hoạch tháng!");
        }
        loadPlansFromServer(undefined, true);
        return data.plan;
      } else {
        toast.error("Lỗi khi xử lý", data.error);
        return null;
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", e.message || "Unknown error");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    // Since status doesn't change on submission in the new workflow, 
    // we should ideally check against the active approval request, 
    // but for now, we'll allow resubmission if needed.

    if (!submissionFile) {
      toast.warning("Thiếu hồ sơ", "Vui lòng chọn file PDF kế hoạch trước khi gửi trình duyệt");
      return;
    }

    setIsSubmittingForApproval(true);
    try {
      const savedPlan = await handleSavePlan("ttpd-20260423-0646-ubge", true); // Keep as Not Approved
      if (!savedPlan) return;

      const planId = savedPlan.id;
      if (!planId) {
        toast.error("Lỗi", "Không lấy được ID kế hoạch");
        return;
      }

      let pdfUrl: string | null = null;
      try {
        toast.info("Hệ thống", "Đang tải file lên đám mây...", 3000);
        const fd = new FormData();
        fd.append("file", submissionFile);
        const res = await fetch("/api/upload/file", { method: "POST", body: fd });
        const jsData = await res.json();

        if (jsData && jsData.url) {
          pdfUrl = jsData.url;
          toast.success("Thành công", "Đã tải file hồ sơ PDF!");
        } else {
          toast.error("Lỗi Upload", jsData.error || "Không lấy được link file");
        }
      } catch (err: any) {
        toast.error("Lỗi upload file", err?.message || "Không thể tải file lên server");
      }

      // Tạo ApprovalRequest
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "marketing_yearly_plan",
          entityId: planId,
          entityCode: `MKT-${selectedYear}`,
          entityTitle: `Kế hoạch Marketing Năm ${selectedYear}`,
          department: "marketing",
          priority: "high",
          requestNotes: submissionNotes || (isFinalized && revisionLogs.length > 0
            ? `[BẢN CẬP NHẬT] Các thay đổi chính:\n- ${revisionLogs.join('\n- ')}`
            : "Trình duyệt kế hoạch năm."),
          autoAssignManager: true,
          // Đính kèm url file vào metadata
          metadata: {
            year: selectedYear,
            amount: budget.replace(/\D/g, ""),
            attachments: pdfUrl ? [{ name: submissionFile.name, url: pdfUrl }] : [],
            isRevision: isFinalized,
            // Đính kèm dữ liệu đề xuất để so sánh sau này
            proposedData: {
              goal,
              budget,
              selectedPlatforms,
              goalsList,
              tasksList
            }
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Đã gửi trình duyệt!", data.approverName ? `Hồ sơ đã được chuyển cho Quản lý trực tiếp: ${data.approverName}` : "Hồ sơ đang chờ Quản lý trực tiếp phê duyệt");
        setShowSubmissionOffcanvas(false);
        setSubmissionFile(null);
        setSubmissionNotes("");
      } else if (data.existingId || data.error?.includes("đang có")) {
        toast.info("Thông báo", "Yêu cầu đã được gửi trước đó");
      } else {
        toast.error("Lỗi gửi trình duyệt", data.error || "Không thể tạo hồ sơ phê duyệt");
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", e.message);
    } finally {
      setIsSubmittingForApproval(false);
    }
  };

  // Trình duyệt kế hoạch tháng cụ thể cho người quản lý trực tiếp
  const handleSubmitMonthlyExecutionForApproval = async (monthNum: number, taskName: string) => {
    setIsSubmittingForApproval(true);
    try {
      const savedPlan = await handleSaveMonthlyPlanOnly(true); // Chỉ lưu dữ liệu tháng, gửi thẳng
      if (!savedPlan || !savedPlan.id) return;

      const planId = savedPlan.id;
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "marketing_monthly_execution",
          entityId: `${planId}-m${monthNum}-${taskName.replace(/\s+/g, "").toUpperCase()}`,
          entityCode: `MKT-M${monthNum}-${taskName.substring(0, 5).toUpperCase()}`,
          entityTitle: `Kế hoạch tháng ${monthNum} - ${taskName}`,
          department: "marketing",
          priority: "normal",
          autoAssignManager: true, // Server sẽ tự tìm quản lý trực tiếp + gửi thông báo
          metadata: { year: selectedYear, month: monthNum, taskName: taskName, planId: planId },
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Đã gửi duyệt kế hoạch tháng", "Quản lý trực tiếp đã nhận được yêu cầu");
        loadPlansFromServer();
      } else if (data.existingId || data.error?.includes("đang có")) {
        toast.info("Thông báo", "Yêu cầu của tháng này đã được gửi trước đó");
      } else {
        toast.error("Lỗi gửi trình duyệt", data.error);
      }
    } catch (e: any) {
      toast.error("Lỗi hệ thống", e.message);
    } finally {
      setIsSubmittingForApproval(false);
    }
  };

  const renderStepIcon = (num: number, icon: string) => {
    const isActive = step === num;
    const isCompleted = step > num;
    let bg = "var(--muted)";
    let color = "var(--muted-foreground)";

    if (isActive) {
      bg = "linear-gradient(135deg, #1e3a8a, #dc2626)"; /* Navy Blue to Red for active step */
      color = "#fff";
    } else if (isCompleted) {
      bg = "rgba(30,58,138,0.15)"; /* Navy Blue light */
      color = "#1e3a8a";
    }

    return (
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, border: isCompleted ? "2px solid #10b981" : "none", transition: "all 0.3s" }}>
        {isCompleted ? <i className="bi bi-check-lg" /> : <i className={`bi ${icon}`} />}
      </div>
    );
  };

  // ── Staff Mapping Helpers ──────────────────────────────────────────────────
  const getStaffName = (id: string | null): string => {
    if (!id) return "Chưa phân công";
    const staff = marketingStaff.find(s => s.id === id);
    return staff ? staff.name : id; // Fallback to ID if not found
  };

  const getStaffInitials = (id: string | null): string => {
    if (!id) return "?";
    const staff = marketingStaff.find(s => s.id === id);
    if (staff) return staff.initials;
    return id.substring(0, 2).toUpperCase();
  };

  const getStaffColor = (id: string | null): string => {
    if (!id) return "var(--muted)";
    const name = getStaffName(id);
    return getColorFromName(name);
  };

  const renderTreeTasks = (arr: TreeTask[], level: number = 0, parentTask: TreeTask | null = null): React.ReactNode => {
    return arr.map((t) => (
      <React.Fragment key={t.id}>
        <tr style={{ background: level === 0 ? "rgba(0,0,0,0.02)" : "transparent", cursor: level > 0 ? "pointer" : "default" }}
          onClick={(e) => {
            if (level > 0 && parentTask) {
              // Prevent edit if clicking on input or buttons inside
              const target = e.target as HTMLElement;
              if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && !target.closest('button')) {
                editSubtask(t, parentTask);
              }
            }
          }}
          onMouseEnter={e => { if (level > 0) e.currentTarget.style.background = "var(--muted)"; }}
          onMouseLeave={e => { if (level > 0) e.currentTarget.style.background = "transparent"; }}
        >
          <td style={{ padding: level === 0 ? "8px 16px" : "2px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingLeft: level * 12 }}>
              {t.children && t.children.length > 0 ? (
                <button onClick={() => updateTask(t.id, { isExpanded: !t.isExpanded })} title={t.isExpanded ? "Thu gọn" : "Mở rộng"} style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 4, marginTop: level === 0 ? 0 : 2 }}>
                  <i className={`bi bi-chevron-${t.isExpanded ? 'down' : 'right'}`} style={{ fontSize: 13 }} />
                </button>
              ) : (
                <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4, marginTop: level === 0 ? 0 : 2 }}>
                  <i className="bi bi-circle-fill" style={{ fontSize: 4, color: "var(--muted-foreground)", opacity: 0.5 }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <input id={`task-input-${t.id}`} type="text" value={t.name}
                    onChange={e => updateTask(t.id, { name: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSiblingTask(t.id, level);
                      }
                    }}
                    placeholder={level === 0 ? "Tên việc chính" : "Tên việc con"}
                    style={level === 0 ? {
                      flex: 1, border: "none", background: "transparent", outline: "none",
                      fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase"
                    } : {
                      width: "100%", border: "none", background: "transparent", outline: "none",
                      fontSize: 14, color: "var(--foreground)", fontWeight: 400
                    }} />
                  {level === 0 && t.children && t.children.length > 0 && (
                    <span style={{
                      fontSize: 10, background: "var(--muted)", color: "var(--muted-foreground)",
                      padding: "1px 6px", borderRadius: 10, fontWeight: 800, whiteSpace: "nowrap"
                    }}>
                      {t.children.length}
                    </span>
                  )}
                </div>
                {t.note && (
                  <div style={{ fontSize: 12, color: "var(--foreground)", marginTop: 4, paddingLeft: 0, fontWeight: 500, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {t.note}
                  </div>
                )}
              </div>
            </div>
          </td>
          <td style={{ padding: level === 0 ? "8px 16px" : "2px 16px", borderBottom: "1px solid var(--border)" }}>
            {level === 0 && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, position: "relative", width: "100%" }}>
                {t.pic ? (
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: getStaffColor(t.pic), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {getStaffInitials(t.pic)}
                  </div>
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="bi bi-person" style={{ fontSize: 14, color: "var(--muted-foreground)" }} />
                  </div>
                )}
                <div style={{ position: "relative", width: "100%" }}>
                  <input type="text" value={t.picName !== undefined ? t.picName : (t.pic ? getStaffName(t.pic) : "")}
                    onChange={e => {
                      // Update local display value for search
                      updateTask(t.id, { picName: e.target.value });
                    }}
                    onFocus={() => setFocusedPicTaskId(t.id)}
                    onBlur={() => setTimeout(() => setFocusedPicTaskId(null), 200)}
                    placeholder="Chọn người phụ trách"
                    style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: "#000", width: "100%" }}
                  />
                  {focusedPicTaskId === t.id && (() => {
                    const searchValue = t.picName !== undefined ? t.picName : (t.pic ? getStaffName(t.pic) : "");
                    const isExactMatch = marketingStaff.some(ms => ms.name === searchValue);
                    const filterValue = isExactMatch ? "" : searchValue.toLowerCase();
                    // CHỈ HIỂN THỊ NHÂN VIÊN ĐANG LÀM VIỆC (ACTIVE) TRONG DROPDOWN
                    const filteredStaff = marketingStaff.filter(s =>
                      s.status === "active" &&
                      s.name.toLowerCase().includes(filterValue)
                    );

                    return (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, width: "200px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", padding: "4px" }}>
                        {filteredStaff.length === 0 && (
                          <div style={{ padding: "8px 12px", fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", wordBreak: "break-word" }}>
                            Không có dữ liệu...
                          </div>
                        )}
                        {filteredStaff.map((s, idx) => (
                          <div key={idx}
                            onClick={() => updateTask(t.id, { pic: s.id, picName: s.name })}
                            style={{ padding: "3px 10px", fontSize: 12, color: "#000", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "flex-start", gap: 8, background: "transparent" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: getColorFromName(s.name), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                              {s.initials}
                            </div>
                            {s.name}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </td>
          <td style={{ padding: level === 0 ? "8px 16px" : "2px 16px", width: 80, textAlign: "right", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "flex-end" }}>
              <button title="Thêm việc con" disabled={isYearlyPlanReadOnly} onClick={() => addSubtask(t.id)} className="app-btn-icon" style={{ background: "transparent", border: "none", cursor: isYearlyPlanReadOnly ? "not-allowed" : "pointer", color: "var(--muted-foreground)", padding: 4, visibility: level === 0 ? "visible" : "hidden", opacity: isYearlyPlanReadOnly ? 0.3 : 1, transition: "color 0.2s" }} onMouseEnter={e => { if (!isYearlyPlanReadOnly) e.currentTarget.style.color = "var(--foreground)" }} onMouseLeave={e => { if (!isYearlyPlanReadOnly) e.currentTarget.style.color = "var(--muted-foreground)" }}>
                <i className="bi bi-plus-circle" style={{ fontSize: 14 }} />
              </button>
              {level === 0 && (
                <button disabled={isYearlyPlanReadOnly} title="Xoá" onClick={() => deleteTask(t.id)} style={{ background: "transparent", border: "none", cursor: isYearlyPlanReadOnly ? "not-allowed" : "pointer", opacity: isYearlyPlanReadOnly ? 0.3 : 1, color: "var(--muted-foreground)", padding: 4, transition: "color 0.2s" }} onMouseEnter={e => { if (!isYearlyPlanReadOnly) e.currentTarget.style.color = "var(--destructive)" }} onMouseLeave={e => { if (!isYearlyPlanReadOnly) e.currentTarget.style.color = "var(--muted-foreground)" }}>
                  <i className="bi bi-trash" style={{ fontSize: 14 }} />
                </button>
              )}
            </div>
          </td>
        </tr>
        {t.isExpanded && t.children && t.children.length > 0 && renderTreeTasks(t.children, level + 1, t)}
      </React.Fragment>
    ));
  };

  const stepsDef = [
    { num: 1 as const, title: "Tổng quan", desc: "Mục tiêu & định hướng", icon: "bi-bullseye" },
    { num: 2 as const, title: "Chiến lược", desc: "Định vị & Phân bổ", icon: "bi-layers" },
    { num: 3 as const, title: "Kế hoạch", desc: "Roadmap & Lịch trình", icon: "bi-collection-play" },
    ...(isStaff ? [] : [
      { num: 4 as const, title: "Ngân sách", desc: "Chi phí & Nguồn lực", icon: "bi-cash-coin" },
      { num: 5 as const, title: "Doanh thu", desc: "Mục tiêu & Dự báo", icon: "bi-graph-up-arrow" },
    ])
  ];

  const renderPrintTasksTree = (tasks: TreeTask[], depth: number = 0): React.ReactNode => {
    return tasks.map(t => (
      <React.Fragment key={`print-task-${t.id}`}>
        <tr style={{ background: depth === 0 ? "rgba(0,48,135,0.04)" : "transparent" }}>
          <td style={{ ...printStyles.bodyCell, paddingLeft: `${12 + depth * 20}px` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  {depth > 0 && <i className="bi bi-chevron-right" style={{ fontSize: 8, color: "#000000" }} />}
                  {depth === 0 ? (
                    <span style={{ fontWeight: 800, color: "#000000", fontSize: 13, lineHeight: 1.5, textTransform: "uppercase" }}>{t.name || "Chưa đặt tên"}</span>
                  ) : (
                    <span style={{ color: "#000000", fontSize: 13 }}>{t.name || "Chưa đặt tên"}</span>
                  )}
                </div>
                {t.note && (
                  <div style={{ fontSize: 11, color: "#000000", paddingLeft: depth > 0 ? 16 : 0, whiteSpace: "pre-wrap", lineHeight: 1.5, marginTop: 2 }}>
                    {t.note}
                  </div>
                )}
              </div>

              {/* Hiển thị người phụ trách tại đây */}
              {t.pic && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: getStaffColor(t.pic), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>
                    {getStaffInitials(t.pic)}
                  </div>
                  <span style={{ fontSize: 12, color: "#000000", fontWeight: 500 }}>{getStaffName(t.pic)}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
        {t.children && t.children.length > 0 && renderPrintTasksTree(t.children, depth + 1)}
      </React.Fragment>
    ));
  };

  const customSecHead = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 16px",
    background: "linear-gradient(to right, #f1f5f9, transparent)",
    borderLeft: "4px solid #003087",
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: "#003087",
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 800,
    textTransform: "uppercase" as any
  };
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const hasMonthlyPlans = tasksList.some(t => monthlyPlans[t.id] && Object.values(monthlyPlans[t.id]).some(m => m.length > 0));

  const renderTaskDetailOffcanvas = () => {
    if (!isMounted || !showTaskDetailOffcanvas || !viewingTaskDetail) return null;
    const item = viewingTaskDetail;

    return createPortal(
      <>
        {/* Backdrop */}
        <div onClick={() => setShowTaskDetailOffcanvas(false)} style={{ position: "fixed", inset: 0, zIndex: 4000, background: showTaskDetailOffcanvas ? "rgba(0,0,0,0.35)" : "transparent", pointerEvents: showTaskDetailOffcanvas ? "auto" : "none", transition: "background 0.25s" }} />

        {/* Panel */}
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "var(--card)", boxShadow: "-8px 0 40px rgba(0,0,0,0.18)", zIndex: 4001, display: "flex", flexDirection: "column", transform: showTaskDetailOffcanvas ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)" }}>

          {/* Header */}
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: "color-mix(in srgb, var(--primary) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-list-task" style={{ fontSize: 19, color: "var(--primary)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)", textTransform: "uppercase" }}>Chi tiết công việc</p>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                  {item.status === 'done' && <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 700, background: "rgba(16,185,129,0.12)", color: "#10b981" }}><i className="bi bi-check-circle-fill" style={{ fontSize: 9, marginRight: 4 }} />Hoàn thành</span>}
                  {item.status === 'processing' && <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 700, background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}><i className="bi bi-gear-wide-connected" style={{ fontSize: 9, marginRight: 4 }} />Đang chạy</span>}
                  {item.status === 'pending' && <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 700, background: "rgba(148,163,184,0.12)", color: "#000000" }}><i className="bi bi-hourglass-split" style={{ fontSize: 9, marginRight: 4 }} />Chờ xử lý</span>}
                </div>
              </div>
              <button onClick={() => setShowTaskDetailOffcanvas(false)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-x" style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "4px 18px 18px" }}>

            {/* Section: Nội dung công việc */}
            <div style={{ padding: "16px 14px", background: "var(--muted)", borderRadius: 12, marginTop: 16, marginBottom: 8, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <i className="bi bi-card-text" style={{ fontSize: 14 }}></i> Nội dung công việc
              </span>
              <textarea
                value={item.name || ""}
                onChange={(e) => setViewingTaskDetail({ ...item, name: e.target.value })}
                placeholder="Nhập nội dung chi tiết công việc..."
                rows={5}
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                  background: "var(--card)", color: "var(--foreground)",
                  fontSize: 14, outline: "none", borderRadius: 8, fontFamily: "inherit",
                  resize: "vertical", lineHeight: 1.6, fontWeight: 500
                }}
              />
            </div>

            {/* Section: Thông tin chung */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "20px 0 8px", paddingBottom: 5, borderBottom: "1px solid var(--border)" }}>
              <i className="bi bi-info-circle" style={{ fontSize: 13, color: "var(--primary)" }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Thông tin chung</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--muted-foreground)", flexShrink: 0 }}>Thời gian / Tuần</span>
              <div style={{ width: 180 }}>
                <MultiDropSelect value={item.time || ""} onChange={(val: string) => setViewingTaskDetail({ ...item, time: val })} options={AVAILABLE_WEEKS} placeholder="Chọn tuần" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--muted-foreground)", flexShrink: 0 }}>Người phụ trách</span>
              <input
                value={item.pic || ""}
                onChange={e => setViewingTaskDetail({ ...item, pic: e.target.value })}
                placeholder="Tên nhân viên..."
                style={{ border: "1px solid var(--border)", background: "var(--card)", padding: "4px 8px", borderRadius: 6, fontSize: 13, width: 180, outline: "none", textAlign: "right" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--muted-foreground)", flexShrink: 0 }}>Số lượng / Tần suất</span>
              <input
                value={item.quantity || ""}
                onChange={e => setViewingTaskDetail({ ...item, quantity: e.target.value })}
                placeholder="Ví dụ: 5 bài"
                style={{ border: "1px solid var(--border)", background: "var(--card)", padding: "4px 8px", borderRadius: 6, fontSize: 13, width: 180, outline: "none", textAlign: "right" }}
              />
            </div>

            {/* Section: Triển khai dự kiến */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "16px 0 8px", paddingBottom: 5, borderBottom: "1px solid var(--border)" }}>
              <i className="bi bi-send" style={{ fontSize: 13, color: "var(--primary)" }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Nội dung triển khai</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>Kênh ưu tiên</span>
              <MultiDropSelect value={item.channel || ""} onChange={(val: string) => setViewingTaskDetail({ ...item, channel: val })} options={AVAILABLE_CHANNELS} placeholder="Chọn kênh" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>Hình thức (Visual)</span>
              <MultiDropSelect value={item.visual || ""} onChange={(val: string) => setViewingTaskDetail({ ...item, visual: val })} options={AVAILABLE_VISUALS} placeholder="Chọn hình thức" />
            </div>

            {/* Section: Chi tiết */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "16px 0 8px", paddingBottom: 5, borderBottom: "1px solid var(--border)" }}>
              <i className="bi bi-chat-text" style={{ fontSize: 13, color: "var(--primary)" }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Chi tiết / KPIs</span>
            </div>
            <textarea
              value={item.note || ""}
              onChange={e => setViewingTaskDetail({ ...item, note: e.target.value })}
              placeholder="Nhập ghi chú chi tiết hoặc các chỉ số KPIs..."
              rows={4}
              style={{
                width: "100%", padding: "10px 12px", border: "1px solid var(--border)",
                background: "var(--muted)", color: "var(--foreground)",
                fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit",
                resize: "vertical", lineHeight: 1.6
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 7, flexShrink: 0 }}>
            <button onClick={() => setShowTaskDetailOffcanvas(false)} style={{ flex: 1, padding: "8px 0", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, lineHeight: 1.5, fontWeight: 500, borderRadius: 8, cursor: "pointer" }}>
              Hủy
            </button>
            <button
              onClick={() => {
                if (activeTask && activeMonth) {
                  setMonthlyPlans(prev => {
                    const taskPlans = prev[activeTask.id] || {};
                    const monthList = taskPlans[activeMonth] || [];
                    const upd = monthList.map(p => p.id === item.id ? { ...item } : p);
                    return { ...prev, [activeTask.id]: { ...taskPlans, [activeMonth]: upd } };
                  });
                }
                setShowTaskDetailOffcanvas(false);
              }}
              style={{ flex: 2, padding: "8px 0", border: "none", background: "var(--primary)", color: "#fff", fontSize: 13, lineHeight: 1.5, fontWeight: 700, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}
            >
              <i className="bi bi-check2-circle" /> Cập nhật
            </button>
          </div>
        </div>
      </>,
      document.body
    );
  };

  const [discussionComment, setDiscussionComment] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);

  const loadDiscussionMessages = async (requestId: string) => {
    try {
      const res = await fetch(`/api/approvals/${requestId}/comments`);
      const data = await res.json();
      if (data.success) {
        setDiscussionMessages(data.data);
      }
    } catch (e) {
      console.error("Failed to load comments", e);
    }
  };

  // Ref để lưu requestId hiện tại mà không gây re-render
  const discussionRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (showDiscussionOffcanvas && activeTask) {
      const mData = (monthlyExecutionStatuses[activeTask.name.toUpperCase()] || {})[activeMonth];
      const requestId = mData?.requestId || null;
      discussionRequestIdRef.current = requestId;
      if (requestId) {
        loadDiscussionMessages(requestId);
      }
    } else {
      discussionRequestIdRef.current = null;
    }
    // Intentionally NOT including monthlyExecutionStatuses to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDiscussionOffcanvas, activeTask?.id, activeMonth]);

  // Polling riêng biệt - dùng ref để không bị re-trigger vì state thay đổi
  useEffect(() => {
    if (!showDiscussionOffcanvas) return;
    const interval = setInterval(() => {
      if (discussionRequestIdRef.current) {
        loadDiscussionMessages(discussionRequestIdRef.current);
      }
    }, 8000); // 8s để không quá nhiều request
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDiscussionOffcanvas]);

  const handleSendMessage = async (requestId: string) => {
    if (!discussionComment.trim() || isSendingComment) return;
    setIsSendingComment(true);
    try {
      const res = await fetch(`/api/approvals/${requestId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: discussionComment }),
      });
      if (res.ok) {
        setDiscussionComment("");
        toast.success("Đã gửi phản hồi");
        loadDiscussionMessages(requestId);
      }
    } catch (e) {
      toast.error("Lỗi gửi tin nhắn");
    } finally {
      setIsSendingComment(false);
    }
  };

  const renderDiscussionOffcanvas = () => {
    if (!isMounted || !showDiscussionOffcanvas || !activeTask) return null;
    const mData = (monthlyExecutionStatuses[activeTask.name.toUpperCase()] || {})[activeMonth];
    if (!mData?.requestId) return null;

    return (
      <Offcanvas
        isOpen={showDiscussionOffcanvas}
        onClose={() => setShowDiscussionOffcanvas(false)}
        title="Trao đổi công việc"
        subtitle={`Tháng ${activeMonth} • ${activeTask.name}`}
        footer={
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              value={discussionComment}
              onChange={e => setDiscussionComment(e.target.value)}
              placeholder="Nhập nội dung trao đổi..."
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if ((e.nativeEvent as any).isComposing) return;
                  e.preventDefault();
                  handleSendMessage(mData.requestId);
                }
              }}
              style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--muted)", fontSize: 13, outline: "none", resize: "none", minHeight: 80, transition: "all 0.2s" }}
              onFocus={e => e.target.style.borderColor = "var(--primary)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
            <button
              onClick={() => handleSendMessage(mData.requestId)}
              disabled={isSendingComment || !discussionComment.trim()}
              style={{ width: 44, height: 44, background: discussionComment.trim() ? "var(--primary)" : "var(--muted)", color: discussionComment.trim() ? "#fff" : "var(--muted-foreground)", border: "none", borderRadius: 12, cursor: discussionComment.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
            >
              {isSendingComment ? <span className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> : <i className="bi bi-send-fill" style={{ fontSize: 18 }} />}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
          {discussionMessages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "var(--muted-foreground)", opacity: 0.5, gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-chat-left-text" style={{ fontSize: 28 }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Chưa có trao đổi nào</span>
            </div>
          ) : (
            <div className="custom-scrollbar" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {discussionMessages.map((msg, i) => {
                const isSystem = msg.content.includes("**") && msg.content.includes("đã gửi hồ sơ");
                if (isSystem) {
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                      <div style={{ padding: "4px 12px", background: "var(--muted)", borderRadius: 20, fontSize: 11, color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                        {msg.content.replace(/\*\*/g, "")}
                      </div>
                    </div>
                  );
                }

                const isMe = msg.authorId === session?.user?.id;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      {!isMe && (
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                          {msg.authorName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{isMe ? "Bạn" : msg.authorName}</span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius: isMe ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                      background: isMe ? "var(--primary)" : "var(--card)",
                      color: isMe ? "#fff" : "var(--foreground)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      border: isMe ? "none" : "1px solid var(--border)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>
      </Offcanvas>
    );
  };

  const renderMediaAddModal = () => {
    if (!isMounted || !showMediaAddModal || !activeTask) return null;
    const { parentName, insertIdx } = showMediaAddModal;

    const IS = { width: "100%", padding: "8px 12px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit" };
    const Lbl = ({ text }: { text: string }) => <label style={{ display: "block", fontSize: 11, lineHeight: 1.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>{text}</label>;

    const PROVINCES = [
      "Toàn quốc", "Miền Bắc", "Miền Trung", "Miền Nam", "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
      "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương",
      "Bình Phước", "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
      "Gia Lai", "Hà Giang", "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang",
      "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận",
      "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La",
      "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
      "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
    ];

    const handleSave = () => {
      const compiledNote = [
        mediaForm.noiDung ? `Chi tiết: ${mediaForm.noiDung}` : "",
        mediaForm.quangCao === "Yes" ? `Quảng cáo: Có chạy Ads` : "",
        mediaForm.doiTuong ? `Đối tượng tiếp cận: ${mediaForm.doiTuong}` : "",
        mediaForm.thoiGianQuay && mediaForm.thoiGianQuay !== " ~ " ? `Thời gian quay: ${mediaForm.thoiGianQuay}` : "",
        mediaForm.theoTuan && mediaForm.tuan ? `Thời gian thực hiện: ${mediaForm.tuan}` : "",
        mediaForm.ghiChu ? `Khu vực áp dụng: ${mediaForm.ghiChu}` : ""
      ].filter(Boolean).join("\n• ").trim();

      const finalNote = compiledNote ? "• " + compiledNote : "";

      setMonthlyPlans((prev: any) => {
        const prevTaskPlans = prev[activeTask.id] || {};
        let upd = prevTaskPlans[activeMonth];
        if (upd === undefined) { upd = pillars.map(p => ({ id: `mp-init-${p.id}`, name: (p.name || "").toUpperCase(), time: "", pic: session?.user?.name || "", status: "pending", note: "", isHeader: true, isExpanded: true, color: p.color, visual: "", channel: "", quantity: "" })); }
        else { upd = [...(upd || [])]; }

        const newData = {
          name: mediaForm.chuDe,
          time: mediaForm.thoiGianHoanThanh,
          pic: showMediaAddModal.editItem?.pic || "",
          status: showMediaAddModal.editItem?.status || "pending",
          note: finalNote,
          channel: mediaForm.nenTang,
          visual: showMediaAddModal.editItem?.visual || "",
          quantity: showMediaAddModal.editItem?.quantity || "",
          isHeader: false,
          ads: mediaForm.quangCao === "Yes",
          targetAudience: mediaForm.doiTuong,
          recordTime: mediaForm.thoiGianQuay,
          location: mediaForm.ghiChu,
          isByWeek: mediaForm.theoTuan,
          week: mediaForm.tuan,
          detailContent: mediaForm.noiDung
        };

        if (showMediaAddModal.editItem) {
          upd[insertIdx] = { ...upd[insertIdx], ...newData };
        } else {
          upd.splice(insertIdx, 0, { id: `mp-${Date.now()}`, ...newData });
        }

        return { ...prev, [activeTask.id]: { ...prevTaskPlans, [activeMonth]: upd } };
      });
      setShowMediaAddModal(null);
      setMediaForm({ chuDe: "", noiDung: "", quangCao: "No", doiTuong: "", nenTang: "", thoiGianQuay: "", thoiGianHoanThanh: "", linkSp: "", ghiChu: "", theoTuan: false, tuan: "" });
    };

    return createPortal(
      <>
        <div onClick={() => setShowMediaAddModal(null)} style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,0.4)" }} />
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "90%", maxWidth: 500, height: "95vh", background: "var(--card)", borderRadius: 16, zIndex: 5001, display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--muted)", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase" }}><i className="bi bi-camera-reels me-2" style={{ color: "var(--primary)" }} />{showMediaAddModal.editItem ? "Cập nhật dữ liệu MEDIA" : "Thêm mới dữ liệu MEDIA"}</h3>
            <button onClick={() => setShowMediaAddModal(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}><i className="bi bi-x-lg" /></button>
          </div>
          <div className="custom-scrollbar" style={{ flex: 1, padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "var(--muted)", padding: "8px 12px", borderRadius: 8 }}>
              <span style={{ fontSize: 11, lineHeight: 1.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tuyến nội dung:</span>
              <span style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase" }}>{parentName}</span>
            </div>

            <div>
              <Lbl text="Chủ đề *" />
              <input value={mediaForm.chuDe} onChange={e => setMediaForm(f => ({ ...f, chuDe: e.target.value }))} placeholder="Ví dụ: TVC quảng cáo sản phẩm mới..." style={IS} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Lbl text="Quảng cáo" />
                <div style={{ display: "flex", alignItems: "center", gap: 16, height: 35 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, lineHeight: 1.5 }}>
                    <input type="radio" name="adsRadio" checked={mediaForm.quangCao === "Yes"} onChange={() => setMediaForm(f => ({ ...f, quangCao: "Yes" }))} style={{ accentColor: "var(--primary)" }} /> Có
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, lineHeight: 1.5 }}>
                    <input type="radio" name="adsRadio" checked={mediaForm.quangCao === "No"} onChange={() => setMediaForm(f => ({ ...f, quangCao: "No" }))} style={{ accentColor: "var(--primary)" }} /> Không
                  </label>
                </div>
              </div>
              <div style={{ position: "relative" }} ref={platformDropdownRef}>
                <Lbl text="Nền tảng" />
                <div
                  onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                  style={{ ...IS, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none", height: 35 }}
                >
                  <span style={{ color: mediaForm.nenTang ? "var(--foreground)" : "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {mediaForm.nenTang || "Chọn nền tảng"}
                  </span>
                  <i className={`bi bi-chevron-${showPlatformDropdown ? "up" : "down"}`} style={{ fontSize: 13, color: "var(--muted-foreground)" }} />
                </div>
                {showPlatformDropdown && (
                  <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", padding: 6, maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                    {platformOptions.map((opt: any) => {
                      const isSelected = mediaForm.nenTang.includes(opt.name);
                      return (
                        <label key={opt.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", cursor: "pointer", borderRadius: 6, background: isSelected ? "var(--muted)" : "transparent", transition: "background 0.2s" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              let arr = mediaForm.nenTang.split(", ").filter(Boolean);
                              if (e.target.checked) { if (!arr.includes(opt.name)) arr.push(opt.name); }
                              else { arr = arr.filter(x => x !== opt.name); }
                              setMediaForm(f => ({ ...f, nenTang: arr.join(", ") }));
                            }}
                            style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                          />
                          <span style={{ fontSize: 13, lineHeight: 1.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--foreground)" : "var(--muted-foreground)" }}>{opt.name}</span>
                        </label>
                      );
                    })}
                    {platformOptions.length === 0 && <span style={{ fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic", padding: 8 }}>Đang tải...</span>}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
              <div>
                <Lbl text="Thời gian quay (Từ - Đến)" />
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" value={(mediaForm.thoiGianQuay || "").split(" ~ ")[0] || ""} onChange={e => {
                    let [, den] = (mediaForm.thoiGianQuay || "").split(" ~ ");
                    setMediaForm(f => ({ ...f, thoiGianQuay: `${e.target.value} ~ ${den || ""}` }));
                  }} style={{ ...IS, padding: "7px 12px" }} />
                  <input type="date" value={(mediaForm.thoiGianQuay || "").split(" ~ ")[1] || ""} onChange={e => {
                    let [tu] = (mediaForm.thoiGianQuay || "").split(" ~ ");
                    setMediaForm(f => ({ ...f, thoiGianQuay: `${tu || ""} ~ ${e.target.value}` }));
                  }} style={{ ...IS, padding: "7px 12px" }} />
                </div>
              </div>
              <div>
                <Lbl text="Ngày hoàn thành" />
                <input 
                  type="date" 
                  disabled={mediaForm.theoTuan}
                  value={mediaForm.thoiGianHoanThanh} 
                  onChange={e => {
                    const val = e.target.value;
                    let autoWeek = "";
                    if (val) {
                      const day = parseInt(val.split("-")[2]);
                      if (day >= 1 && day <= 7) autoWeek = "Tuần 1";
                      else if (day >= 8 && day <= 14) autoWeek = "Tuần 2";
                      else if (day >= 15 && day <= 21) autoWeek = "Tuần 3";
                      else if (day >= 22) autoWeek = "Tuần 4";
                    }

                    setMediaForm(f => ({ 
                      ...f, 
                      thoiGianHoanThanh: val,
                      tuan: f.theoTuan ? (autoWeek && !f.tuan.includes(autoWeek) ? (f.tuan ? f.tuan + ", " + autoWeek : autoWeek) : f.tuan) : autoWeek
                    }));
                  }} 
                  style={{ ...IS, padding: "7px 12px", opacity: mediaForm.theoTuan ? 0.5 : 1, cursor: mediaForm.theoTuan ? "not-allowed" : "text" }} 
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <Lbl text="Theo tuần" />
                <div 
                  onClick={() => setMediaForm(f => ({ ...f, theoTuan: !f.theoTuan }))}
                  style={{
                    width: 32, height: 18, borderRadius: 20, background: mediaForm.theoTuan ? "var(--primary)" : "var(--muted)",
                    position: "relative", cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 3, left: mediaForm.theoTuan ? 17 : 3, transition: "all 0.2s"
                  }} />
                </div>
              </div>

              <div ref={weekDropdownRef} style={{ position: "relative", flex: 1 }}>
                <div
                  onClick={() => { if (mediaForm.theoTuan) setShowWeekDropdown(!showWeekDropdown); }}
                  style={{ 
                    ...IS, 
                    cursor: mediaForm.theoTuan ? "pointer" : "not-allowed", 
                    display: "flex", alignItems: "center", justifyContent: "space-between", 
                    minHeight: 35, opacity: mediaForm.theoTuan ? 1 : 0.5,
                    background: mediaForm.theoTuan ? "var(--background)" : "var(--muted)"
                  }}
                >
                  <span style={{ color: mediaForm.tuan ? "var(--foreground)" : "var(--muted-foreground)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 12 }}>
                    {mediaForm.tuan || "Chọn tuần..."}
                  </span>
                  <i className={`bi bi-chevron-${showWeekDropdown ? "up" : "down"}`} style={{ fontSize: 12, color: "var(--muted-foreground)" }}></i>
                </div>
                {showWeekDropdown && mediaForm.theoTuan && (
                  <div style={{ position: "absolute", bottom: "100%", left: 0, width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 4, zIndex: 10, boxShadow: "0 -10px 15px -3px rgba(0, 0, 0, 0.1)", padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                    {["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"].map((w) => {
                      const isSelected = mediaForm.tuan.includes(w);
                      return (
                        <label key={w} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", cursor: "pointer", borderRadius: 6, background: isSelected ? "var(--muted)" : "transparent", transition: "background 0.2s" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              let arr = mediaForm.tuan.split(", ").filter(Boolean);
                              if (e.target.checked) { if (!arr.includes(w)) arr.push(w); }
                              else { arr = arr.filter(x => x !== w); }
                              setMediaForm(f => ({ ...f, tuan: arr.join(", ") }));
                            }}
                            style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                          />
                          <span style={{ fontSize: 13, lineHeight: 1.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--foreground)" : "var(--muted-foreground)" }}>{w}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div ref={locationDropdownRef} style={{ position: "relative" }}>
              <Lbl text="Khu vực áp dụng" />
              <div
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                style={{ ...IS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 36 }}
              >
                <span style={{ color: mediaForm.ghiChu ? "var(--foreground)" : "var(--muted-foreground)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {mediaForm.ghiChu || "Chọn khu vực / tỉnh thành..."}
                </span>
                <i className="bi bi-chevron-down ms-2" style={{ fontSize: 13, color: "var(--muted-foreground)" }}></i>
              </div>
              {showLocationDropdown && (
                <div style={{ position: "absolute", bottom: "100%", left: 0, width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 4, zIndex: 10, boxShadow: "0 -10px 15px -3px rgba(0, 0, 0, 0.1)", padding: 6, maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                  {PROVINCES.map((prov) => {
                    const isSelected = mediaForm.ghiChu.includes(prov);
                    return (
                      <label key={prov} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", cursor: "pointer", borderRadius: 6, background: isSelected ? "var(--muted)" : "transparent", transition: "background 0.2s" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            let arr = mediaForm.ghiChu.split(", ").filter(Boolean);
                            if (e.target.checked) { if (!arr.includes(prov)) arr.push(prov); }
                            else { arr = arr.filter(x => x !== prov); }
                            setMediaForm(f => ({ ...f, ghiChu: arr.join(", ") }));
                          }}
                          style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                        />
                        <span style={{ fontSize: 13, lineHeight: 1.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--foreground)" : "var(--muted-foreground)" }}>{prov}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", flex: 1, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginTop: 4 }}>
              <div style={{ display: "flex", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <div
                  onClick={() => { setExpandNoiDung(false); }}
                  style={{ flex: 1, padding: "6px 12px", textAlign: "center", cursor: "pointer", userSelect: "none", background: !expandNoiDung ? "var(--background)" : "transparent", borderBottom: !expandNoiDung ? "2px solid var(--primary)" : "2px solid transparent", transition: "all 0.2s" }}
                >
                  <span style={{ fontSize: 12, fontWeight: !expandNoiDung ? 800 : 600, color: !expandNoiDung ? "var(--primary)" : "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Đối tượng tiếp cận
                  </span>
                </div>
                <div
                  onClick={() => { setExpandNoiDung(true); }}
                  style={{ flex: 1, padding: "6px 12px", textAlign: "center", cursor: "pointer", userSelect: "none", borderLeft: "1px solid var(--border)", background: expandNoiDung ? "var(--background)" : "transparent", borderBottom: expandNoiDung ? "2px solid var(--primary)" : "2px solid transparent", transition: "all 0.2s" }}
                >
                  <span style={{ fontSize: 12, fontWeight: expandNoiDung ? 800 : 600, color: expandNoiDung ? "var(--primary)" : "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Nội dung chi tiết
                  </span>
                </div>
              </div>

              <div style={{ padding: 12, background: "var(--card)", flex: 1, display: "flex", flexDirection: "column" }}>
                {!expandNoiDung ? (
                  <textarea value={mediaForm.doiTuong} onChange={e => setMediaForm(f => ({ ...f, doiTuong: e.target.value }))} placeholder="Mẹ bỉm sữa, Người đi làm..." style={{ ...IS, flex: 1, resize: "none", minHeight: 80, border: "none", background: "transparent", boxShadow: "none", padding: 4 }} />
                ) : (
                  <textarea value={mediaForm.noiDung} onChange={e => setMediaForm(f => ({ ...f, noiDung: e.target.value }))} placeholder="Mô tả kịch bản, bối cảnh, thông điệp..." style={{ ...IS, flex: 1, resize: "none", minHeight: 80, border: "none", background: "transparent", boxShadow: "none", padding: 4 }} />
                )}
              </div>
            </div>

          </div>
          <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setShowMediaAddModal(null)} style={{ padding: "8px 18px", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, lineHeight: 1.5, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>Hủy bỏ</button>
            <button onClick={handleSave} disabled={!mediaForm.chuDe.trim()} style={{ padding: "8px 20px", border: "none", background: "var(--primary)", color: "#fff", fontSize: 13, lineHeight: 1.5, fontWeight: 700, borderRadius: 8, cursor: mediaForm.chuDe.trim() ? "pointer" : "not-allowed", opacity: mediaForm.chuDe.trim() ? 1 : 0.6 }}><i className="bi bi-file-earmark-plus me-2" />{showMediaAddModal.editItem ? "Cập nhật dữ liệu" : "Tạo dữ liệu"}</button>
          </div>
        </div>
      </>,
      document.body
    );
  };

  const renderSubmissionOffcanvas = () => {
    return (
      <Offcanvas
        isOpen={showSubmissionOffcanvas}
        onClose={() => setShowSubmissionOffcanvas(false)}
        title="Trình duyệt Kế hoạch Marketing"
        subtitle={`Gửi hồ sơ kế hoạch năm ${selectedYear} cho Giám đốc phê duyệt`}
        size="md"
        footer={
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <button
              onClick={() => setShowSubmissionOffcanvas(false)}
              style={{ flex: 1, padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--foreground)" }}
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSubmitForApproval}
              disabled={isSubmittingForApproval || !submissionFile}
              style={{
                flex: 2, padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: !submissionFile ? "var(--muted)" : "linear-gradient(135deg, #1e3a8a, #dc2626)",
                color: "#fff", border: "none", cursor: !submissionFile ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, position: "relative",
                opacity: isSubmittingForApproval ? 0.7 : 1
              }}
            >
              {isSubmittingForApproval ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> : <i className="bi bi-send-fill" />}
              Xác nhận gửi trình duyệt
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* File Upload Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hồ sơ đính kèm (PDF) *</label>
            {!submissionFile ? (
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "40px 20px", border: "2px dashed var(--border)", borderRadius: 16,
                background: "rgba(0,0,0,0.01)", cursor: "pointer", transition: "all 0.2s"
              }} onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--primary)", e.currentTarget.style.background = "rgba(30, 58, 138, 0.02)")} onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)", e.currentTarget.style.background = "rgba(0,0,0,0.01)")}>
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type !== "application/pdf") {
                        toast.error("Sai định dạng", "Vui lòng chỉ chọn file PDF");
                        return;
                      }
                      setSubmissionFile(file);
                    }
                  }}
                />
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(30, 58, 138, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <i className="bi bi-cloud-arrow-up" style={{ fontSize: 24, color: "#1e3a8a" }} />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Nhấp để tải lên bản kế hoạch PDF</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>Dung lượng tối đa 10MB</p>
              </label>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px",
                background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: 16, position: "relative"
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="bi bi-file-earmark-pdf" style={{ fontSize: 20 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#065f46" }} className="text-truncate">{submissionFile.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#047857" }}>{(submissionFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={() => setSubmissionFile(null)}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#ef4444", e.currentTarget.style.color = "#fff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)", e.currentTarget.style.color = "#ef4444")}
                >
                  <i className="bi bi-trash" />
                </button>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ghi chú gửi trình (Tùy chọn)</label>
            <AutoResizeTextarea
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Nhập nội dung nhắn gửi cho Giám đốc..."
              style={{
                fontSize: 13, padding: 16, borderRadius: 16, border: "1px solid var(--border)",
                background: "var(--background)", minHeight: 120, lineHeight: 1.6
              }}
            />
          </div>

          {/* Guidelines */}
          <div style={{ padding: "16px", background: "var(--muted)", borderRadius: 16, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <i className="bi bi-info-circle-fill" style={{ color: "var(--primary)", marginTop: 2 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>Lưu ý quy trình:</p>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--muted-foreground)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <li>Dữ liệu trên dashboard sẽ được đồng bộ cùng file PDF đính kèm.</li>
                  <li>Kế hoạch sẽ chuyển sang trạng thái <strong>'Chờ duyệt'</strong> và bị khóa chỉnh sửa.</li>
                  <li>Nếu Giám đốc yêu cầu sửa, hồ sơ sẽ trả về trạng thái <strong>'Bản nháp'</strong> kèm lý do.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Offcanvas>
    );
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
        {renderTaskDetailOffcanvas()}
        {renderMediaAddModal()}
        {renderSubmissionOffcanvas()}
        <PageHeader
          title="Xây dựng kế hoạch Marketing"
          description="Xây dựng kế hoạch tổng thể, chiến lược và chi tiết công việc"
          color="blue"
          icon="bi-magic"
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, overflowY: "hidden", minHeight: 0 }}>

          {/* ── STEPPER HEADER ── */}
          <div className="app-card" style={{ padding: "8px 24px", borderRadius: "16px 16px 0 0", marginBottom: 0, position: "relative", borderBottom: "1px solid var(--border)" }}>

            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
              {stepsDef.map((s, idx) => {
                const isActive = step === s.num;
                const isPast = step > s.num;

                return (
                  <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, opacity: isActive || isPast ? 1 : 0.7, transition: "opacity 0.3s" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", padding: "4px 8px", borderRadius: 12 }}
                      onClick={() => setStep(s.num as any)}
                    >
                      {renderStepIcon(s.num, s.icon)}
                      <div>
                        <h3 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 800, color: isActive ? "var(--foreground)" : "var(--muted-foreground)", transition: "color 0.3s" }}>{s.title}</h3>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>{s.desc}</p>
                      </div>
                    </div>
                    {idx < stepsDef.length - 1 && (
                      <div style={{ flex: 1, margin: "0 10px" }}>
                        <div style={{ height: 2, background: isPast ? "#1e3a8a" : "var(--border)", borderRadius: 99, transition: "background 0.3s" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border)", paddingTop: 8, marginTop: 8 }}>
              {/* Year Filters */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {[currentYear, currentYear + 1].map(y => {
                  const isSelected = selectedYear === y;
                  return (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      style={{
                        background: isSelected ? "linear-gradient(135deg, #1e3a8a, #0B2447)" : "transparent",
                        color: isSelected ? "#fff" : "var(--muted-foreground)",
                        border: isSelected ? "none" : "1px solid var(--border)",
                        borderRadius: 20,
                        padding: isSelected ? "4px 12px" : "3px 10px", // Giữ nguyên layout lúc bỏ border
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        boxShadow: isSelected ? "0 4px 12px rgba(30, 58, 138, 0.3)" : "none",
                        transition: "all 0.3s ease"
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "rgba(220, 38, 38, 0.05)";
                          e.currentTarget.style.color = "#dc2626";
                          e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.3)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--muted-foreground)";
                          e.currentTarget.style.borderColor = "var(--border)";
                        }
                      }}
                    >
                      {y}
                    </button>
                  );
                })}

                {/* Status Badge */}
                <div style={{
                  marginLeft: 8,
                  padding: "4px 10px",
                  background: (() => {
                    const match = statusCategories.approval.find(c => c.name === status);
                    return match?.color ? `${match.color}15` : "var(--muted)";
                  })(),
                  borderRadius: 16,
                  border: "1px solid",
                  borderColor: (() => {
                    const match = statusCategories.approval.find(c => c.name === status);
                    return match?.color ? `${match.color}30` : "var(--border)";
                  })(),
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: status === "Chưa phê duyệt" ? 0.6 : 1
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: (() => {
                      const match = statusCategories.approval.find(c => c.name === status);
                      return match?.color || "var(--muted-foreground)";
                    })(),
                    boxShadow: (() => {
                      const match = statusCategories.approval.find(c => c.name === status);
                      return match?.color ? `0 0 8px ${match.color}` : "none";
                    })()
                  }}></span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: status === "Chưa phê duyệt" ? 500 : 700,
                    color: (() => {
                      const match = statusCategories.approval.find(c => c.name === status);
                      return match?.color || "var(--muted-foreground)";
                    })()
                  }}>
                    {(() => {
                      const currentP = allVersions.find(v => v.id === selectedPlanId);
                      if (!currentP) return "CHƯA KHỞI TẠO";

                      // Find Document Status (Draft, Active, Replaced)
                      const matchDoc = statusCategories.document.find(c => c.code.toLowerCase() === currentP.versionStatus.toLowerCase());
                      const docLabel = matchDoc ? matchDoc.name.toUpperCase() : "";

                      // Find Approval Status (Approved, Rejected, etc.)
                      const targetApproveStatus = currentP.status || status;
                      const matchApproval = statusCategories.approval.find(c => c.code.toLowerCase() === targetApproveStatus.toLowerCase());
                      const approvalLabel = matchApproval ? matchApproval.name.toUpperCase() : targetApproveStatus.toUpperCase();

                      // Handle Rendering Logic
                      // Nếu là Bản nháp / Bản dự thảo thì ưu tiên hiển thị Trạng thái phê duyệt
                      if (docLabel && docLabel !== "BẢN DỰ THẢO" && docLabel !== "BẢN NHÁP") {
                        return docLabel;
                      }
                      if (isViewingDraft) return "ĐANG XEM BẢN CHỈNH SỬA";
                      return approvalLabel;
                    })()}
                  </span>
                </div>

                {isManagerOrAdmin && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16, paddingLeft: 16, borderLeft: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lịch sử:</span>
                    <select
                      value={selectedPlanId || ""}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      style={{ background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "2px 8px", fontSize: 12, fontWeight: 600, color: "var(--foreground)", outline: "none" }}
                    >
                      {allVersions.filter(v => v.year === selectedYear).length === 0 && <option value="">Chưa có dữ liệu</option>}
                      {(() => {
                        const yearVersions = allVersions.filter(v => v.year === selectedYear);
                        // Ensure unique IDs for options
                        const uniqueVersions = yearVersions.filter((v, index, self) =>
                          index === self.findIndex((t) => t.id === v.id)
                        );

                        return uniqueVersions.map((v, idx) => {
                          const docMatch = statusCategories.document.find(c => c.code.toLowerCase() === v.versionStatus.toLowerCase());
                          const label = docMatch ? docMatch.name : (v.versionStatus.length > 10 ? "Văn bản" : v.versionStatus);
                          return (
                            <option key={`${v.id}-${idx}`} value={v.id}>
                              {label} - {v.code.split('-').slice(-2).join(' ')}
                            </option>
                          );
                        });
                      })()}
                    </select>
                    {/* Removing the supplementary version status badge as requested */}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const currentMonth = new Date().getMonth() + 1;
                  const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && activeMonth < currentMonth);
                  const isActionDisabled = isPastMonth || (isEmployeeLocked && (step === 1 || step === 2));
                  const isApprovedStatus = status === "ttpd-20260423-0480-zegu"; // Đã phê duyệt (Code)
                  const disableBanHanh = isActionDisabled || !isApprovedStatus || revisionLogs.length > 0;
                  return (
                    <>
                      <button onClick={() => setShowPrintModal(true)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 12px", fontSize: "small", fontWeight: 400, color: "var(--foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><i className="bi bi-printer" /> In</button>

                      {(!selectedPlanId || allVersions.find(v => v.id === selectedPlanId)?.versionStatus === 'ttvb-20260423-9046-cxbz' || status === 'ttpd-20260423-0646-ubge') && (
                        <button
                          onClick={() => handleSavePlan(status, false)}
                          disabled={isSaving}
                          style={{ background: "transparent", border: "1px solid #3b82f6", borderRadius: 8, padding: "4px 12px", fontSize: "small", fontWeight: 400, color: "#3b82f6", cursor: isSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        >
                          {isSaving ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: 1 }} /> : <i className="bi bi-save" />} Lưu
                        </button>
                      )}

                      {isManagerOrAdmin && selectedPlanId && (allVersions.find(v => v.id === selectedPlanId)?.versionStatus === 'ttvb-20260423-9046-cxbz' || status === 'ttpd-20260423-0646-ubge') && (
                        <button
                          onClick={handleDeletePlan}
                          disabled={isDeleting}
                          style={{ background: "transparent", border: "1px solid #dc2626", borderRadius: 8, padding: "4px 12px", fontSize: "small", fontWeight: 400, color: "#dc2626", cursor: isDeleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <i className="bi bi-trash3" /> Xoá
                        </button>
                      )}

                      {allVersions.find(v => v.id === selectedPlanId)?.versionStatus !== 'ttvb-20260423-5393-chxz' && (
                        <button
                          onClick={() => setShowSubmissionOffcanvas(true)}
                          disabled={isActionDisabled || isSubmittingForApproval || (isFinalized && revisionLogs.length === 0)}
                          style={{
                            background: status === "Chờ duyệt" ? "rgba(234, 88, 12, 0.1)" : isFinalized ? (revisionLogs.length > 0 ? "rgba(30, 58, 138, 0.1)" : "var(--muted)") : "rgba(220, 38, 38, 0.1)",
                            border: isFinalized && revisionLogs.length > 0 ? "1px solid rgba(30, 58, 138, 0.2)" : "none",
                            borderRadius: 8, padding: "4px 12px",
                            fontSize: "small", fontWeight: 400,
                            color: status === "Chờ duyệt" ? "#ea580c" : isFinalized ? (revisionLogs.length > 0 ? "#1e3a8a" : "var(--muted-foreground)") : "#dc2626",
                            cursor: isActionDisabled || isSubmittingForApproval || (isFinalized && revisionLogs.length === 0) ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                            opacity: isActionDisabled ? 0.4 : 1,
                            position: "relative"
                          }}
                        >
                          {isSubmittingForApproval
                            ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: 1 }} />
                            : <i className={isFinalized ? "bi bi-pencil-square" : "bi bi-send"} />
                          }
                          {isFinalized ? "Trình duyệt lại" : "Trình duyệt"}
                          {isFinalized && revisionLogs.length > 0 && (
                            <span style={{ position: "absolute", top: -8, right: -8, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)" }}>
                              {revisionLogs.length}
                            </span>
                          )}
                        </button>
                      )}

                      {isManagerOrAdmin && allVersions.find(v => v.id === selectedPlanId)?.versionStatus === 'ttvb-20260423-5393-chxz' && (
                        <button
                          onClick={handleAdjust}
                          disabled={isPublishing}
                          style={{ background: "rgba(220, 38, 38, 0.1)", border: "none", borderRadius: 8, padding: "4px 12px", fontSize: "small", fontWeight: 700, color: "#dc2626", cursor: isPublishing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <i className="bi bi-pencil-square" /> Điều chỉnh
                        </button>
                      )}

                      {allVersions.find(v => v.id === selectedPlanId)?.versionStatus === 'ttvb-20260423-9046-cxbz' && status === 'ttpd-20260423-0480-zegu' && (
                        <button
                          onClick={handlePublish}
                          disabled={isPublishing}
                          style={{
                            background: "linear-gradient(135deg, #0B2447, #1e3a8a)",
                            border: "none", borderRadius: 8, padding: "4px 12px",
                            fontSize: "small", fontWeight: 400, color: "#fff",
                            cursor: isPublishing ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 6,
                            opacity: isPublishing ? 0.4 : 0.9,
                            transition: "all 0.2s",
                            boxShadow: isPublishing ? "none" : "0 2px 8px rgba(11, 36, 71, 0.3)"
                          }}
                          onMouseEnter={e => !isPublishing && (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => !isPublishing && (e.currentTarget.style.opacity = "0.9")}
                        >
                          {isPublishing ? (
                            <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: 1 }} />
                          ) : (
                            <i className="bi bi-rocket-takeoff" />
                          )}
                          Ban hành
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
            {isViewingDraft && (
              <div style={{ background: "rgba(30, 58, 138, 0.05)", border: "1px solid rgba(30, 58, 138, 0.1)", borderRadius: 12, padding: "10px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 4px rgba(30, 58, 138, 0.05)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(30, 58, 138, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="bi bi-pencil-square" style={{ color: "#1e3a8a", fontSize: 16 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#1e3a8a", fontWeight: 600 }}>Chế độ chỉnh sửa bản cập nhật</p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(30, 58, 138, 0.7)" }}>Nhân viên vẫn thấy bản 'Đã ban hành' cũ. Mọi thay đổi của bạn sẽ chỉ có hiệu lực sau khi được phê duyệt lại.</p>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ── BƯỚC 1: TỔNG QUAN ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="app-card" style={{ padding: "16px 24px 24px 24px", borderRadius: "0 0 16px 16px", flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", minHeight: 0 }}
                >
                  <div style={{ position: "absolute", bottom: -40, right: -30, pointerEvents: "none", zIndex: 0 }}>
                    <span style={{ fontSize: "18rem", fontWeight: 900, color: "var(--border)", opacity: 0.12, display: "block", userSelect: "none" }}>{selectedYear}</span>
                  </div>

                  {isEmployeeLocked ? (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", zIndex: 1 }}>
                      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(30,58,138,0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                        <i className="bi bi-shield-lock" style={{ fontSize: "2.5rem", color: "#1e3a8a", opacity: 0.8 }} />
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>Nội dung đang được phê duyệt</h3>
                      <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
                        Kế hoạch tổng quan cho năm {selectedYear} đang được Ban quản trị xem xét và hoàn thiện.
                        Sau khi trạng thái chuyển sang <strong>'Đã ban hành'</strong>, nhân viên có thể xem toàn bộ mục tiêu và định hướng chi tiết tại đây.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative", zIndex: 1, minHeight: 0 }}>

                      {/* Slide Controls (Badge Buttons) */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ display: "flex", gap: 8, background: "var(--muted)", padding: "3px", borderRadius: 10, width: "fit-content" }}>
                          {[
                            { id: 0, label: "Mục tiêu & Định hướng", icon: "bi-compass" },
                            { id: 1, label: "Danh sách công việc", icon: "bi-list-ul" }
                          ].map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setActiveStep1Slide(s.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "6px 12px", borderRadius: 8,
                                background: activeStep1Slide === s.id ? "var(--card)" : "transparent",
                                color: activeStep1Slide === s.id ? "var(--primary)" : "var(--muted-foreground)",
                                border: activeStep1Slide === s.id ? "1px solid var(--border)" : "none",
                                fontSize: 12, fontWeight: activeStep1Slide === s.id ? 700 : 500,
                                cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: activeStep1Slide === s.id ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
                              }}
                            >
                              <i className={`bi ${s.icon}`} style={{ fontSize: 13 }} />
                              {s.label}
                            </button>
                          ))}
                        </div>

                        {activeStep1Slide === 0 && (
                          <div style={{ display: "flex", gap: 10, background: "rgba(30, 58, 138, 0.04)", padding: "4px", borderRadius: 12, border: "1px solid rgba(30, 58, 138, 0.08)" }}>
                            {[
                              { id: 0, label: "Mục tiêu", icon: "bi-bullseye" },
                              { id: 1, label: "Đối tượng khách hàng", icon: "bi-people" }
                            ].map((s) => (
                              <button
                                key={s.id}
                                onClick={() => setActiveSubSlide(s.id)}
                                style={{
                                  display: "flex", alignItems: "flex-start", gap: 8, position: "relative",
                                  padding: "6px 14px", borderRadius: 9,
                                  background: activeSubSlide === s.id ? "linear-gradient(135deg, #1e3a8a, #0B2447)" : "transparent",
                                  color: activeSubSlide === s.id ? "white" : "var(--primary)",
                                  border: "none",
                                  fontSize: 11, lineHeight: 1.5, fontWeight: 700,
                                  cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  boxShadow: activeSubSlide === s.id ? "0 4px 12px rgba(30, 58, 138, 0.2)" : "none",
                                  letterSpacing: "0.02em"
                                }}
                              >
                                <i className={`bi ${s.icon}`} style={{ fontSize: 13 }} />
                                {s.label.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}

                        {activeStep1Slide === 1 && (
                          <button
                            disabled={isYearlyPlanReadOnly}
                            onClick={() => {
                              const newId = `t-${Date.now()}`;
                              setTasksList([...tasksList, { id: newId, name: "", pic: "", color: "#3b82f6", isExpanded: true, children: [] }]);
                              setFocusNewTaskId(newId);
                            }}
                            style={{
                              background: "var(--primary)", border: "none", borderRadius: 8, padding: "6px 12px",
                              fontSize: 12, fontWeight: 700, color: "#fff",
                              cursor: isYearlyPlanReadOnly ? "not-allowed" : "pointer",
                              opacity: isYearlyPlanReadOnly ? 0.5 : 1,
                              display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                              boxShadow: "0 4px 12px rgba(30, 58, 138, 0.2)"
                            }}
                            onMouseEnter={e => { if (!isYearlyPlanReadOnly) { e.currentTarget.style.transform = "translateY(-1px)"; } }}
                            onMouseLeave={e => { if (!isYearlyPlanReadOnly) { e.currentTarget.style.transform = "translateY(0)"; } }}
                          >
                            <i className="bi bi-plus-circle" /> Thêm việc chính
                          </button>
                        )}
                      </div>

                      <div style={{ flex: 1, position: "relative", minHeight: 0, display: "flex", flexDirection: "column" }}>
                        <AnimatePresence mode="wait">
                          {activeStep1Slide === 0 ? (
                            <motion.div
                              key="goals-slide"
                              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.3 }}
                              style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%", overflowY: "auto" }}
                              className="custom-scrollbar"
                            >
                              {/* Platforms Section (Top Row) */}
                              <div className="app-card" style={{ padding: "10px 24px", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", background: "linear-gradient(to right, var(--card), rgba(30, 58, 138, 0.02))", border: "1px solid var(--border)", borderRadius: 16 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(30, 58, 138, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <i className="bi bi-megaphone" style={{ fontSize: 14, color: "var(--primary)" }} />
                                  </div>
                                  <h4 style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)" }}>KÊNH TRUYỀN THÔNG</h4>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
                                  {[
                                    { id: "Facebook", color: "#1877F2", icon: "bi-facebook" },
                                    { id: "Tiktok", color: "var(--foreground)", icon: "bi-tiktok" },
                                    { id: "Zalo", color: "#0068FF", icon: "bi-chat-dots" },
                                    { id: "Youtube", color: "#FF0000", icon: "bi-youtube" },
                                    { id: "Instagram", color: "#E4405F", icon: "bi-instagram" },
                                    { id: "Website", color: "#0ea5e9", icon: "bi-globe" },
                                    { id: "Truyền thống", color: "#64748b", icon: "bi-people-fill" },
                                  ].map(ch => {
                                    const isSelected = selectedPlatforms.includes(ch.id);
                                    return (
                                      <div
                                        key={ch.id}
                                        onClick={() => {
                                          if (isSelected) setSelectedPlatforms(selectedPlatforms.filter(p => p !== ch.id));
                                          else setSelectedPlatforms([...selectedPlatforms, ch.id]);
                                        }}
                                        style={{
                                          display: "flex", alignItems: "flex-start", gap: 8, position: "relative",
                                          padding: "4px 12px", borderRadius: 100,
                                          cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                          background: isSelected ? `color-mix(in srgb, ${ch.color} 10%, var(--card))` : "var(--muted)",
                                          border: `1px solid ${isSelected ? ch.color : "transparent"}`,
                                          color: isSelected ? ch.color : "var(--muted-foreground)",
                                          boxShadow: isSelected ? `0 4px 10px color-mix(in srgb, ${ch.color} 15%, transparent)` : "none"
                                        }}
                                      >
                                        <i className={`bi ${ch.icon}`} style={{ fontSize: 13 }} />
                                        <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500 }}>{ch.id}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
                                <AnimatePresence mode="wait">
                                  {activeSubSlide === 0 ? (
                                    <motion.div
                                      key="goals-subslide"
                                      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                                      transition={{ duration: 0.2 }}
                                      style={{ height: "100%" }}
                                    >
                                      {/* Goals Section */}
                                      <div className="app-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, height: "100%", background: "var(--card)" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <i className="bi bi-bullseye" style={{ fontSize: 14, color: "var(--primary)" }} />
                                            <h4 style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>MỤC TIÊU CHIẾN LƯỢC</h4>
                                          </div>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, overflowY: "auto" }} className="custom-scrollbar">
                                          {goalsList.map((g) => (
                                            <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 0, justifyContent: "flex-start", padding: "16px", border: "1px solid var(--border)", borderRadius: 16, background: "var(--muted)" }}>
                                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <input
                                                  value={g.label}
                                                  onChange={(e) => setGoalsList(prev => prev.map(x => x.id === g.id ? { ...x, label: e.target.value } : x))}
                                                  placeholder="Tiêu đề mục tiêu..."
                                                  style={{ fontSize: 13, fontWeight: 700, border: "none", background: "transparent", width: "100%", outline: "none" }}
                                                />
                                                {!isYearlyPlanReadOnly && goalsList.length > 1 && (
                                                  <button onClick={() => setGoalsList(prev => prev.filter(x => x.id !== g.id))} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                                                    <i className="bi bi-x-circle" style={{ fontSize: 13 }} />
                                                  </button>
                                                )}
                                              </div>
                                              <AutoResizeTextarea
                                                value={g.description}
                                                onChange={e => setGoalsList(prev => prev.map(x => x.id === g.id ? { ...x, description: e.target.value } : x))}
                                                placeholder="Chi tiết KPI..."
                                                style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 500, border: "none", background: "transparent", padding: 0, minHeight: 60 }}
                                              />
                                            </div>
                                          ))}
                                          {!isYearlyPlanReadOnly && (
                                            <div
                                              onClick={() => setGoalsList([...goalsList, { id: Date.now(), label: "", icon: "bi-record-circle", color: "#3b82f6", description: "" }])}
                                              style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: 16, padding: 20, color: "var(--muted-foreground)", cursor: "pointer", background: "var(--muted)" }}
                                            >
                                              <i className="bi bi-plus-circle" style={{ fontSize: 20 }} />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      key="audience-subslide"
                                      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                                      transition={{ duration: 0.2 }}
                                      style={{ height: "100%" }}
                                    >
                                      {/* Audience Section */}
                                      <div className="app-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, height: "100%", background: "var(--card)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                          <i className="bi bi-people" style={{ fontSize: 14, color: "var(--primary)" }} />
                                          <h4 style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>ĐỐI TƯỢNG KHÁCH HÀNG</h4>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                                          {[
                                            { view_id: "B2B", label: "B2B / Doanh nghiệp", color: "#3b82f6", desc: "Đại lý, nhà thầu, đối tác chiến lược" },
                                            { view_id: "Online", label: "Khách lẻ Online", color: "#ec4899", desc: "Mạng xã hội, sàn TMĐT, website" },
                                            { view_id: "Offline", label: "Khách lẻ Offline", color: "#14b8a6", desc: "Showroom, cửa hàng, sự kiện trực tiếp" },
                                          ].map((g, i) => (
                                            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20, background: "var(--muted)", borderRadius: 16, border: "1px solid var(--border)" }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: g.color }} />
                                                <span style={{ fontSize: 13, fontWeight: 800, color: g.color }}>{g.label}</span>
                                              </div>
                                              <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", opacity: 0.7 }}>{g.desc}</p>
                                              <AutoResizeTextarea
                                                value={targetAudience[g.view_id] || ""}
                                                onChange={e => setTargetAudience(prev => ({ ...prev, [g.view_id]: e.target.value }))}
                                                placeholder={`Nhập ghi chú cho ${g.label}...`}
                                                style={{ fontSize: 12, lineHeight: 1.5, border: "1px solid var(--border)", borderRadius: 10, padding: 12, background: "var(--background)", minHeight: 120, color: "var(--foreground)", fontWeight: 500 }}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="tasks-slide"
                              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.2 }}
                              style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}
                            >
                              <div style={{ borderRadius: 16, border: "1px solid var(--border)", flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "var(--card)" }}>
                                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }} className="custom-scrollbar">
                                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 }}>
                                    <thead>
                                      <tr>
                                        <th style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "var(--foreground)", fontSize: 13 }}>Tên công việc chính / Hạng mục triển khai</th>
                                        <th style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "var(--foreground)", fontSize: 13, width: "30%" }}>Người phụ trách</th>
                                        <th style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", width: 80 }} />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {renderTreeTasks(tasksList)}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  )}
                </motion.div>
              )}

              {/* ── BƯỚC 2: CHIẾN LƯỢC NỘI DUNG ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="app-card" style={{ padding: 28, borderRadius: "0 0 16px 16px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, position: "relative" }}
                >
                  <div style={{ position: "absolute", bottom: -40, right: -30, pointerEvents: "none", zIndex: 0 }}>
                    <span style={{ fontSize: "18rem", fontWeight: 900, color: "var(--border)", opacity: 0.12, display: "block", userSelect: "none" }}>{selectedYear}</span>
                  </div>

                  {isEmployeeLocked ? (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", zIndex: 1 }}>
                      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(30,58,138,0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                        <i className="bi bi-pin-map" style={{ fontSize: "2.5rem", color: "#1e3a8a", opacity: 0.8 }} />
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>Chiến lược đang được hoàn thiện</h3>
                      <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
                        Hệ thống trụ cột nội dung và định hướng chiến lược đang chờ Ban quản trị phê duyệt.
                        Các thông tin chi tiết sẽ được hiển thị đầy đủ ngay sau khi kế hoạch được <strong>'Ban hành'</strong> chính thức.
                      </p>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, minHeight: 0 }}>
                      <div style={{ flex: 1, overflowX: "hidden", overflowY: "auto", borderRadius: 10, border: "none" }} className="custom-scrollbar">
                        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                          <thead>
                            <tr style={{ background: "transparent", borderBottom: "1px solid var(--border)" }}>
                              {["Định hướng", "Nội dung", "Phân bổ", "Số bài", ""].map((col, i) => (
                                <th key={i} style={{
                                  padding: "12px 14px",
                                  textAlign: i === 2 || i === 3 ? "center" : "left",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "var(--muted-foreground)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.1em",
                                  whiteSpace: "nowrap",
                                  width: i === 0 ? "30%" : i === 1 ? "30%" : i === 2 ? "12%" : i === 3 ? "12%" : "16%",
                                  position: "sticky",
                                  top: 0,
                                  zIndex: 10,
                                  background: "var(--card)",
                                  borderBottom: "1px solid var(--border)"
                                }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {pillars.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ padding: "80px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                                  <i className="bi bi-diagram-3" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.4 }} />
                                  <span style={{ fontSize: 14 }}>Chưa có tuyến nội dung nào — nhấn <strong>Thêm tuyến nội dung</strong> để bắt đầu</span>
                                </td>
                              </tr>
                            ) : (
                              pillars.map((p, idx) => (
                                <React.Fragment key={p.id}>
                                  <tr style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--muted) 50%, transparent)" }}>
                                    <td colSpan={2} style={{ padding: "10px 14px", verticalAlign: "top" }}>
                                      <div style={{ display: "flex", gap: 16 }}>
                                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "35%", flexShrink: 0 }}>
                                          <button
                                            onClick={() => updatePillar(p.id, { expanded: !p.expanded })}
                                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0, display: "flex", alignItems: "center", marginTop: 2 }}
                                          >
                                            <i className={`bi bi-chevron-${p.expanded ? "up" : "down"}`} style={{ fontSize: 11 }} />
                                          </button>
                                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, justifyContent: "flex-start" }}>
                                            <input value={p.name} readOnly={isYearlyPlanReadOnly} onChange={e => updatePillar(p.id, { name: e.target.value })} placeholder="TÊN TUYẾN NỘI DUNG..." style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 12, fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase", cursor: isYearlyPlanReadOnly ? "default" : "text" }} />
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 2 }}>
                                              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", width: 50, textTransform: "uppercase" }}>Vai trò:</span>
                                              <input value={p.role} readOnly={isYearlyPlanReadOnly} onChange={e => updatePillar(p.id, { role: e.target.value })} placeholder="VD: Định vị thương hiệu..." style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: 11, color: "var(--muted-foreground)", cursor: isYearlyPlanReadOnly ? "default" : "text", fontStyle: "italic", height: 16 }} />
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 2 }}>
                                              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", width: 50, textTransform: "uppercase" }}>Mục đích:</span>
                                              <input value={p.goal} readOnly={isYearlyPlanReadOnly} onChange={e => updatePillar(p.id, { goal: e.target.value })} placeholder="VD: Tăng tỷ lệ chuyển đổi..." style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: 11, color: "var(--muted-foreground)", cursor: isYearlyPlanReadOnly ? "default" : "text", fontStyle: "italic", height: 16 }} />
                                            </div>
                                          </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <StrategyBulletInput
                                            idPrefix={`pillar-${p.id}`}
                                            value={p.description}
                                            readOnly={isYearlyPlanReadOnly}
                                            onChange={(val: string) => updatePillar(p.id, { description: val })}
                                            placeholder="NHẬP NỘI DUNG CHIẾN LƯỢC TỔNG QUAN TẠI ĐÂY..."
                                          />
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ padding: "3px 14px", verticalAlign: "middle" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                        <div style={{ display: "flex", alignItems: "center", background: "#0a213f", borderRadius: 20, padding: "0 10px", minWidth: 50, height: 26, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                                          <input
                                            type="number" min={0} max={100} value={p.allocation}
                                            readOnly={isYearlyPlanReadOnly}
                                            onChange={e => {
                                              const next = Math.max(0, Math.min(100, Number(e.target.value)));
                                              const otherTotal = pillars.filter(x => x.id !== p.id).reduce((s, x) => s + x.allocation, 0);
                                              if (otherTotal + next > 100) { setBudgetWarn({ pillarId: p.id, next, total: otherTotal + next }); return; }
                                              updatePillar(p.id, { allocation: next });
                                            }}
                                            style={{ border: "none", background: "transparent", outline: "none", width: 28, fontSize: 13, textAlign: "center", color: "#fff", fontWeight: 800, padding: 0, cursor: isYearlyPlanReadOnly ? "default" : "text" }}
                                          />
                                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700, marginLeft: 2 }}>%</span>
                                        </div>
                                        {(() => {
                                          const sum = p.categories.reduce((s: number, c: any) => s + (c.allocation || 0), 0);
                                          return (
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                              <span style={{ fontSize: 11, color: sum > p.allocation ? "#ef4444" : "var(--muted-foreground)", fontWeight: 600, whiteSpace: "nowrap" }}>
                                                | {sum}%
                                              </span>
                                              {sum > p.allocation && (
                                                <motion.div
                                                  animate={{ opacity: [1, 0, 1] }}
                                                  transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                                                  style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }}
                                                  title="Tổng % nội dung con vượt quá % tuyến nội dung"
                                                />
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </td>
                                    <td style={{ padding: "3px 14px", verticalAlign: "middle" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{p.categories.reduce((s: any, c: any) => s + (c.postsPerMonth || 0), 0)}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: "3px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                                      <button
                                        disabled={isYearlyPlanReadOnly}
                                        onClick={() => {
                                          if (!p.expanded) updatePillar(p.id, { expanded: true });
                                          setActivePillarIdForContent(p.id);
                                          setContentOffcanvasOpen(true);
                                        }}
                                        style={{ background: "rgba(0,48,135,0.05)", border: "1px solid rgba(0,48,135,0.1)", borderRadius: 8, cursor: isYearlyPlanReadOnly ? "not-allowed" : "pointer", color: "#003087", padding: "4px 10px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4, opacity: isYearlyPlanReadOnly ? 0.4 : 1, pointerEvents: isYearlyPlanReadOnly ? "none" : "auto", transition: "all 0.2s" }}
                                        onMouseEnter={e => { if (!isYearlyPlanReadOnly) { e.currentTarget.style.background = "rgba(0,48,135,0.1)"; } }}
                                        onMouseLeave={e => { if (!isYearlyPlanReadOnly) { e.currentTarget.style.background = "rgba(0,48,135,0.05)"; } }}
                                      >
                                        <i className="bi bi-plus-lg" /> Thêm nội dung
                                      </button>
                                      <button disabled={isYearlyPlanReadOnly} onClick={() => deletePillar(p.id)} style={{ background: "transparent", border: "none", cursor: isYearlyPlanReadOnly ? "not-allowed" : "pointer", color: "var(--muted-foreground)", width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4, marginLeft: 4, opacity: isYearlyPlanReadOnly ? 0.3 : 1 }} onMouseEnter={e => { if (!isYearlyPlanReadOnly) e.currentTarget.style.color = "#dc2626" }} onMouseLeave={e => { if (!isYearlyPlanReadOnly) e.currentTarget.style.color = "var(--muted-foreground)" }}>
                                        <i className="bi bi-trash" style={{ fontSize: 14 }} />
                                      </button>
                                    </td>
                                  </tr>

                                  {p.expanded && p.categories.map((cat, cIdx) => (
                                    <React.Fragment key={cat.id}>
                                      <tr style={{ borderBottom: "1px solid var(--border)", background: "transparent" }}>
                                        <td colSpan={2} style={{ padding: "1px 14px", borderBottom: "1px solid var(--border)" }}>
                                          <div
                                            onClick={() => {
                                              if (isYearlyPlanReadOnly) return;
                                              setActivePillarIdForContent(p.id);
                                              setEditingCatId(cat.id);
                                              setNewCatName(cat.name || "");
                                              setNewCatDetail((cat.description || "").split('\n').map((l: string) => l.replace(/^●\s*/, '')).join('\n'));
                                              setNewCatAllocation(cat.allocation || 0);
                                              setNewCatPosts(cat.postsPerMonth || 0);
                                              setContentOffcanvasOpen(true);
                                            }}
                                            style={{ display: "flex", alignItems: "flex-start", paddingTop: 4, width: "100%", cursor: isYearlyPlanReadOnly ? "default" : "pointer" }}
                                          >
                                            <i className="bi bi-arrow-return-right" style={{ fontSize: 13, opacity: 0.3, marginLeft: 24, marginRight: 12, marginTop: 2, flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 12, color: "var(--foreground)", marginBottom: 4 }}>
                                                {cat.name || "TÊN NỘI DUNG..."}
                                              </div>
                                              <div style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                                {cat.description || "Phần nội dung cụ thể..."}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td style={{ padding: "1px 14px", borderBottom: "1px solid var(--border)" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                                            <span style={{ fontSize: 13, color: "var(--foreground)" }}>{cat.allocation || 0}</span>
                                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>%</span>
                                          </div>
                                        </td>
                                        <td style={{ padding: "1px 14px", borderBottom: "1px solid var(--border)" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                                            <span style={{ fontSize: 13, color: "var(--foreground)" }}>{cat.postsPerMonth || 0}</span>
                                          </div>
                                        </td>
                                        <td style={{ padding: "1px 14px", textAlign: "right", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
                                        </td>
                                      </tr>
                                      {cat.topics.map((topic, tIdx) => (
                                        <tr key={topic.id} style={{ borderBottom: "1px solid var(--border)", background: "transparent" }}>
                                          <td />
                                          <td style={{ padding: "4px 14px 4px 44px", verticalAlign: "top" }}>
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>

                                              <StrategyBulletInput idPrefix={`topic-${topic.id}`} value={topic.name} readOnly={isYearlyPlanReadOnly} onChange={(val: string) => updateTopic(p.id, cat.id, topic.id, { name: val })} placeholder="Tiêu đề nội dung..." />
                                            </div>
                                          </td>
                                          <td />
                                          <td style={{ padding: "0px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                                            <button disabled={isYearlyPlanReadOnly} onClick={() => deleteTopic(p.id, cat.id, topic.id)} style={{ background: "transparent", border: "none", cursor: isYearlyPlanReadOnly ? "not-allowed" : "pointer", color: "var(--muted-foreground)", width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4, opacity: isYearlyPlanReadOnly ? 0.3 : 1 }} onMouseEnter={e => { if (!isYearlyPlanReadOnly) e.currentTarget.style.color = "#dc2626" }} onMouseLeave={e => { if (!isYearlyPlanReadOnly) e.currentTarget.style.color = "var(--muted-foreground)" }}>
                                              <i className="bi bi-trash" style={{ fontSize: 14 }} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  ))}
                                  {p.expanded && p.categories.length === 0 && (
                                    <tr style={{ borderBottom: "1px solid var(--border)", background: "transparent" }}>
                                      <td />
                                      <td colSpan={5} style={{ padding: "16px 14px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                                        Chưa có nội dung. Nhấn "Thêm nội dung" ở trên để bắt đầu.
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))
                            )}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: "rgba(0,48,135,0.02)" }}>
                              <td colSpan={7} style={{ padding: "12px 14px" }}>
                                <button disabled={isYearlyPlanReadOnly} onClick={addPillar} style={{ background: "#003087", border: "none", cursor: isYearlyPlanReadOnly ? "not-allowed" : "pointer", color: "white", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 8, opacity: isYearlyPlanReadOnly ? 0.4 : 1, pointerEvents: isYearlyPlanReadOnly ? "none" : "auto", boxShadow: "0 2px 8px rgba(0,48,135,0.2)" }}>
                                  <i className="bi bi-plus-circle-fill" /> Thêm tuyến nội dung mới
                                </button>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}


              {/* ── BƯỚC 3: KẾ HOẠCH THỰC HIỆN ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="app-card" style={{ borderRadius: "0 0 16px 16px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0, minHeight: 0, position: "relative" }}
                >
                  {/* Watermark */}
                  <div style={{ position: "absolute", bottom: -40, right: -30, pointerEvents: "none", zIndex: 0 }}>
                    <span style={{ fontSize: "18rem", fontWeight: 900, color: "var(--border)", opacity: 0.12, display: "block", userSelect: "none" }}>{selectedYear}</span>
                  </div>
                  {/* Header: Tabs (Left) + Dot-line Time (Right) */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    padding: isNavCollapsed ? "4px 24px" : "16px 24px",
                    minHeight: isNavCollapsed ? 32 : 60,
                    position: "relative",
                    zIndex: 1,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    overflow: "hidden",
                    background: isNavCollapsed ? "var(--muted)" : "transparent"
                  }}>
                    {isNavCollapsed ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase" }}>
                          {activeTask?.name} — Tháng {activeMonth}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Tabs */}
                        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingRight: 20 }} className="custom-scrollbar">
                          {mainTasks.map(t => {
                            const isActive = t.id === activeTabId;
                            const isLocked = !canAccessTask(t.name);
                            return (
                              <button
                                key={t.id}
                                onClick={() => setActiveMainTaskId(t.id)}
                                style={{
                                  padding: "4px 14px",
                                  borderRadius: 99,
                                  border: isActive ? "none" : "1px solid var(--border)",
                                  background: isActive ? "linear-gradient(135deg, #1e3a8a, #0B2447)" : "transparent",
                                  color: isActive ? "#fff" : "var(--muted-foreground)",
                                  fontSize: 11,
                                  fontWeight: isActive ? 500 : 400,
                                  textTransform: "uppercase",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  boxShadow: isActive ? "0 4px 12px rgba(30,58,138,0.3)" : "none",
                                  transition: "all 0.2s",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6
                                }}
                              >
                                {isLocked && <i className="bi bi-eye" style={{ fontSize: 11, opacity: 0.8 }} />}
                                {t.name || "CHƯA ĐẶT TÊN"}
                              </button>
                            );
                          })}
                        </div>

                        {/* Dot-line Months */}
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m, idx) => {
                            const isActive = m === activeMonth;
                            return (
                              <React.Fragment key={m}>
                                <button
                                  onClick={() => setActiveMonth(m)}
                                  title={`Tháng ${m}`}
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    border: isActive ? "none" : "1px solid var(--border)",
                                    background: isActive ? "#1e3a8a" : "var(--card)",
                                    color: isActive ? "#fff" : "var(--muted-foreground)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 11,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    boxShadow: isActive ? "0 2px 8px rgba(30,58,138,0.3)" : "none",
                                    transition: "all 0.2s",
                                    zIndex: 2
                                  }}
                                >
                                  {m}
                                </button>
                                {idx < 11 && (
                                  <div style={{ width: 10, height: 1, background: "var(--border)", borderTop: "1px dashed var(--border)", zIndex: 1 }} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => setIsNavCollapsed(!isNavCollapsed)}
                      style={{
                        marginLeft: 16,
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--foreground)",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
                      title={isNavCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
                    >
                      <i className={`bi bi-chevron-${isNavCollapsed ? "down" : "up"}`} style={{ fontSize: 13 }} />
                    </button>
                  </div>

                  {/* CONTENT BODY: BẢNG KẾ HOẠCH */}
                  <div style={{ flex: 1, padding: "24px", background: "transparent", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="bi bi-calendar3" style={{ fontSize: 14, color: "#fff" }} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)", letterSpacing: 0.1 }}>
                              Kế hoạch tháng {activeMonth}
                            </span>
                            {(() => {
                              const now = new Date();
                              const currentYear = now.getFullYear();
                              const currentMonth = now.getMonth() + 1;
                              const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && activeMonth < currentMonth);
                              const isPlanReadOnly = isPastMonth || isEmployeeLocked || !canAccessTask(activeTask?.name || "");
                              const mData = activeTask ? (monthlyExecutionStatuses[activeTask.name.toUpperCase()] || {})[activeMonth] : null;
                              const mStatus = mData?.status || "Bản nháp";
                              const isMonthlyLocked = mStatus === "Chờ duyệt" || mStatus === "Đã duyệt";
                              const isStep3ReadOnly = isPlanReadOnly || isMonthlyLocked;
                              const CUSTOM_COLORS = ["#7c3aed", "#0891b2", "#059669", "#ea580c", "#dc2626", "#0B2447"];

                              return (
                                <>
                                  {activeTask && (
                                    <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: "linear-gradient(135deg, #3b82f620, #6366f120)", color: "#6366f1", border: "1px solid #6366f130", letterSpacing: 0.3, textTransform: "uppercase" }}>
                                      {activeTask.name}
                                    </span>
                                  )}
                                  <span style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    background: mStatus === "Chờ duyệt" ? "rgba(234, 88, 12, 0.1)" :
                                      mStatus === "Đã duyệt" ? "rgba(5, 150, 105, 0.1)" :
                                        mStatus === "Từ chối" ? "rgba(220, 38, 38, 0.1)" :
                                          "rgba(100, 116, 139, 0.1)",
                                    color: mStatus === "Chờ duyệt" ? "#ea580c" :
                                      mStatus === "Đã duyệt" ? "#059669" :
                                        mStatus === "Từ chối" ? "#dc2626" :
                                          "#64748b",
                                    border: `1px solid ${mStatus === "Chờ duyệt" ? "#ea580c30" :
                                      mStatus === "Đã duyệt" ? "#05966930" :
                                        mStatus === "Từ chối" ? "#dc262630" :
                                          "#64748b30"}`,
                                    letterSpacing: 0.3,
                                    textTransform: "uppercase"
                                  }}>
                                    {mStatus}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 1 }}>
                            Chi tiết các đầu việc cần thực hiện trong tháng
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 12 }}>
                        {(() => {
                          const now = new Date();
                          const currentYear = now.getFullYear();
                          const currentMonth = now.getMonth() + 1;
                          const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && activeMonth < currentMonth);
                          const isPlanReadOnly = isPastMonth || isEmployeeLocked || !canAccessTask(activeTask?.name || "");
                          const mData = activeTask ? (monthlyExecutionStatuses[activeTask.name.toUpperCase()] || {})[activeMonth] : null;
                          const mStatus = mData?.status || "Bản nháp";
                          const isMonthlyLocked = mStatus === "Chờ duyệt" || mStatus === "Đã duyệt";
                          const isStep3ReadOnly = isPlanReadOnly || isMonthlyLocked;
                          const CUSTOM_COLORS = ["#7c3aed", "#0891b2", "#059669", "#ea580c", "#dc2626", "#0B2447"];

                          return (
                            <>
                              {!isManager ? (
                                <>
                                  {(isIssued || isMonthlyLocked) && (
                                    <button
                                      onClick={() => setShowDiscussionOffcanvas(true)}
                                      style={{
                                        padding: "6px 16px",
                                        borderRadius: 8,
                                        background: "#f1f5f9",
                                        color: "#000000",
                                        border: "none",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        position: "relative",
                                        transition: "all 0.2s"
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
                                      onMouseLeave={e => (e.currentTarget.style.background = "#f1f5f9")}
                                    >
                                      <i className="bi bi-chat-dots" /> Trao đổi công việc
                                    </button>
                                  )}

                                  <button
                                    disabled={isStep3ReadOnly}
                                    onClick={() => {
                                      if (!activeTask) return;
                                      setMonthlyPlans(prev => {
                                        const currentTaskPlans = prev[activeTask.id] || {};
                                        const currentMonthItems = (currentTaskPlans[activeMonth] || []) as any[];
                                        const itemsToProcess = currentMonthItems.map((it: any) => ({ ...it }));
                                        const customCount = itemsToProcess.filter((x: any) => x.isCustomHeader).length;
                                        return {
                                          ...prev,
                                          [activeTask.id]: {
                                            ...currentTaskPlans,
                                            [activeMonth]: [...itemsToProcess, { id: `mp-custom-${Date.now()}`, name: "Tuyến mới", time: "", pic: session?.user?.name || "", status: "pending", note: "", visual: "", channel: "", quantity: "", isHeader: true, isCustomHeader: true, isExpanded: true, color: CUSTOM_COLORS[customCount % CUSTOM_COLORS.length] }]
                                          }
                                        };
                                      });
                                    }}
                                    style={{
                                      padding: "6px 16px",
                                      borderRadius: 8,
                                      background: "#f1f5f9",
                                      color: "#000000",
                                      border: "none",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      cursor: isStep3ReadOnly ? "not-allowed" : "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8, position: "relative",
                                      transition: "all 0.2s"
                                    }}
                                    onMouseEnter={e => !isStep3ReadOnly && (e.currentTarget.style.background = "#e2e8f0")}
                                    onMouseLeave={e => !isStep3ReadOnly && (e.currentTarget.style.background = "#f1f5f9")}
                                  >
                                    <i className="bi bi-plus-circle" /> Thêm công việc
                                  </button>

                                  <button
                                    disabled={isSaving || isStep3ReadOnly}
                                    onClick={() => handleSaveMonthlyPlanOnly(false)}
                                    style={{
                                      padding: "6px 16px",
                                      borderRadius: 8,
                                      background: "#f1f5f9",
                                      color: "#000000",
                                      border: "none",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      cursor: (isSaving || isStep3ReadOnly) ? "not-allowed" : "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8, position: "relative",
                                      transition: "all 0.2s"
                                    }}
                                    onMouseEnter={e => !(isSaving || isStep3ReadOnly) && (e.currentTarget.style.background = "#e2e8f0")}
                                    onMouseLeave={e => !(isSaving || isStep3ReadOnly) && (e.currentTarget.style.background = "#f1f5f9")}
                                  >
                                    {isSaving ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> : <i className="bi bi-save" />} Lưu nháp
                                  </button>

                                  {(isIssued || isMonthlyLocked) && (
                                    <button
                                      onClick={isMonthlyLocked ? handleRecallMonthlyExecution : handleAdjust}
                                      style={{
                                        padding: "6px 16px",
                                        borderRadius: 8,
                                        background: "transparent",
                                        color: "#dc2626",
                                        border: "1px solid #dc2626",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8, position: "relative",
                                        transition: "all 0.2s"
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(220, 38, 38, 0.05)")}
                                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                    >
                                      <i className="bi bi-pencil-square" /> Điều chỉnh
                                    </button>
                                  )}

                                  <button
                                    disabled={isSubmittingForApproval || isStep3ReadOnly}
                                    onClick={() => activeTask && handleSubmitMonthlyExecutionForApproval(activeMonth, activeTask.name)}
                                    style={{
                                      padding: "6px 16px",
                                      borderRadius: 8,
                                      background: "#059669",
                                      color: "#fff",
                                      border: "none",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      cursor: isStep3ReadOnly ? "not-allowed" : "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8, position: "relative",
                                      boxShadow: "0 4px 12px rgba(5, 150, 105, 0.2)",
                                      transition: "all 0.2s"
                                    }}
                                    onMouseEnter={e => !isSaving && !isStep3ReadOnly && (e.currentTarget.style.background = "#047857")}
                                    onMouseLeave={e => !isSaving && !isStep3ReadOnly && (e.currentTarget.style.background = "#059669")}
                                  >
                                    {isSubmittingForApproval ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> : <i className="bi bi-send" />} Trình duyệt
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setShowDiscussionOffcanvas(true)}
                                    style={{
                                      padding: "6px 16px",
                                      borderRadius: 8,
                                      background: "#f1f5f9",
                                      color: "#000000",
                                      border: "none",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8, position: "relative",
                                      transition: "all 0.2s"
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#e2e8f0")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "#f1f5f9")}
                                  >
                                    <i className="bi bi-chat-dots" /> Trao đổi công việc
                                  </button>

                                  <button
                                    onClick={async () => {
                                      if (!activeTask) return;
                                      const mData = (monthlyExecutionStatuses[activeTask.name.toUpperCase()] || {})[activeMonth];
                                      if (!mData?.requestId) return;
                                      if (!confirm("Bạn có chắc chắn muốn phê duyệt kế hoạch này?")) return;

                                      try {
                                        const res = await fetch(`/api/approvals/${mData.requestId}/action`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ action: 'approve', comment: 'Phê duyệt kế hoạch tháng.' })
                                        });
                                        if (res.ok) {
                                          toast.success("Đã phê duyệt kế hoạch!");
                                          loadPlansFromServer();
                                        }
                                      } catch (error) {
                                        toast.error("Lỗi khi phê duyệt.");
                                      }
                                    }}
                                    style={{
                                      padding: "6px 16px",
                                      borderRadius: 8,
                                      background: "#3b82f6",
                                      color: "#fff",
                                      border: "none",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8, position: "relative",
                                      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)",
                                      transition: "all 0.2s"
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#2563eb")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "#3b82f6")}
                                  >
                                    <i className="bi bi-check-circle" /> Phê duyệt
                                  </button>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div style={{ flex: 1, borderRadius: 12, border: "none", background: "transparent", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
                      {(() => {
                        const mData = activeTask ? (monthlyExecutionStatuses[activeTask.name.toUpperCase()] || {})[activeMonth] : null;
                        const mStatus = mData?.status || "Bản nháp";
                        if (isManager && mStatus === "Bản nháp") {
                          return (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "var(--card)", borderRadius: 12, border: "1px dashed var(--border)" }}>
                              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                                <i className="bi bi-hourglass-top" style={{ fontSize: 28, color: "var(--muted-foreground)", opacity: 0.5 }} />
                              </div>
                              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px 0" }}>Nhân viên đang soạn thảo</h3>
                              <p style={{ fontSize: 14, color: "var(--muted-foreground)", textAlign: "center", maxWidth: 400, margin: 0 }}>
                                Kế hoạch thực hiện tháng {activeMonth} của bộ phận <strong>{activeTask?.name}</strong> hiện đang ở trạng thái bản nháp.
                                Bạn sẽ xem được nội dung và phê duyệt sau khi nhân viên nhấn <strong>Trình duyệt</strong>.
                              </p>
                            </div>
                          );
                        }

                        const isContentTask = activeTask?.name?.trim().toUpperCase() === "CONTENT";
                        const isMediaTask = activeTask?.name?.trim().toUpperCase() === "MEDIA";
                        const colGroup = (
                          <colgroup>
                            <col style={{ width: 50 }} />
                            {isContentTask ? (
                              <>
                                <col style={{ width: "36%" }} />
                                <col style={{ width: "10%" }} />
                                <col style={{ width: "12%" }} />
                                <col style={{ width: "7%" }} />
                                <col />
                              </>
                            ) : isMediaTask ? (
                              <>
                                <col />
                                <col style={{ width: "15%" }} />
                                <col style={{ width: "25%" }} />
                              </>
                            ) : (
                              <>
                                <col style={{ width: "36%" }} />
                                <col style={{ width: "10%" }} />
                                <col style={{ width: "16%" }} />
                                <col style={{ width: "13%" }} />
                                <col />
                              </>
                            )}
                            <col style={{ width: 60 }} />
                          </colgroup>
                        );

                        return (
                          <>
                            <div style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", paddingRight: 6 }}>
                              <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", borderSpacing: 0, fontSize: 14 }}>
                                {colGroup}
                                <thead>
                                  <tr>
                                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>STT</th>
                                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>Nội dung công việc</th>
                                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>Tuần thứ</th>
                                    {isContentTask ? (
                                      <>
                                        <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>Visual</th>
                                        <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>Số bài</th>
                                        <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>Kênh</th>
                                      </>
                                    ) : isMediaTask ? (
                                      <>
                                        <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>Người phụ trách</th>
                                      </>
                                    ) : (
                                      <>
                                        <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>Người phụ trách</th>
                                        <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 500, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>Trạng thái</th>
                                        <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--muted-foreground)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>Ghi chú / KPIs</th>
                                      </>
                                    )}
                                    <th style={{ width: 60 }}>&nbsp;</th>
                                  </tr>
                                </thead>
                              </table>
                            </div>
                            <div style={{ flex: 1, overflowY: "auto" }} className="custom-scrollbar">
                              <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 }}>
                                {colGroup}
                                <tbody>
                                  {activeTask && (() => {
                                    const now = new Date();
                                    const currentYear = now.getFullYear();
                                    const currentMonth = now.getMonth() + 1;
                                    const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && activeMonth < currentMonth);
                                    const isContentTask = activeTask.name.trim().toUpperCase() === "CONTENT";
                                    const isMediaTask = activeTask.name.trim().toUpperCase() === "MEDIA";
                                    type MonthlyPlanItem = { id: string; name: string; time: string; pic: string; status: string; note: string; visual?: string; channel?: string; quantity?: string; isHeader?: boolean; isCustomHeader?: boolean; isExpanded?: boolean; color?: string; isDetail?: boolean; parentId?: string; picName?: string; detailContent?: string; ads?: boolean; targetAudience?: string; recordTime?: string; linkSp?: string; location?: string; isByWeek?: boolean; week?: string };
                                    const existingItems = monthlyPlans[activeTask.id]?.[activeMonth];
                                    const items: MonthlyPlanItem[] = (() => {
                                      if (existingItems === undefined || existingItems.length === 0) {
                                        return pillars.map(p => ({
                                          id: `mp-init-${p.id}`,
                                          name: (p.name || "").toUpperCase(),
                                          time: "",
                                          pic: "",
                                          status: "pending",
                                          note: "",
                                          isHeader: true,
                                          isExpanded: true,
                                          color: p.color,
                                          visual: "",
                                          channel: "",
                                          quantity: ""
                                        }));
                                      }

                                      const merged: MonthlyPlanItem[] = [];

                                      // 1. Map existing pillars to DB content
                                      pillars.forEach(p => {
                                        const pName = (p.name || "").toUpperCase();
                                        const savedHeaderIdx = existingItems.findIndex(x => x.isHeader && (x.name || "").toUpperCase() === pName);

                                        if (savedHeaderIdx >= 0) {
                                          merged.push(existingItems[savedHeaderIdx]);
                                          for (let i = savedHeaderIdx + 1; i < existingItems.length; i++) {
                                            if (existingItems[i].isHeader) break;
                                            merged.push(existingItems[i]);
                                          }
                                        } else {
                                          merged.push({
                                            id: `mp-init-${p.id}`,
                                            name: pName,
                                            time: "",
                                            pic: "",
                                            status: "pending",
                                            note: "",
                                            isHeader: true,
                                            isExpanded: true,
                                            color: p.color,
                                            visual: "",
                                            channel: "",
                                            quantity: ""
                                          });
                                        }
                                      });

                                      // 2. Add any custom headers from DB that weren't from strategy
                                      for (let i = 0; i < existingItems.length; i++) {
                                        if (existingItems[i].isHeader && (existingItems[i] as MonthlyPlanItem).isCustomHeader) {
                                          merged.push(existingItems[i]);
                                          for (let j = i + 1; j < existingItems.length; j++) {
                                            if (existingItems[j].isHeader) break;
                                            merged.push(existingItems[j]);
                                          }
                                        }
                                      }

                                      return merged;
                                    })();

                                    const updateField = (idx: number, field: keyof typeof items[0], value: any) => {
                                      const targetId = items[idx]?.id;
                                      if (!targetId) return;

                                      setMonthlyPlans(prev => {
                                        const prevTaskPlans = prev[activeTask.id] || {};
                                        let upd = prevTaskPlans[activeMonth];

                                        if (!upd || upd.length === 0) {
                                          upd = items.map(it => ({ ...it }));
                                        } else {
                                          upd = [...upd];
                                        }

                                        const tIdx = upd.findIndex((it: any) => it.id === targetId);
                                        if (tIdx !== -1) {
                                          upd[tIdx] = { ...upd[tIdx], [field]: value };
                                        } else {
                                          // Fallback: nếu item có trong render (do ghép từ pillars) mà chưa có trong state
                                          upd = items.map(it => ({ ...it }));
                                          upd[idx] = { ...upd[idx], [field]: value };
                                        }
                                        return { ...prev, [activeTask.id]: { ...prevTaskPlans, [activeMonth]: upd } };
                                      });
                                    };

                                    if (!items || items.length === 0) {
                                      return (
                                        <tr>
                                          <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted-foreground)" }}>
                                            <i className="bi bi-inbox" style={{ fontSize: 24, display: "block", marginBottom: 8, opacity: 0.5 }} />
                                            Chưa có kế hoạch nào trong tháng này.
                                          </td>
                                        </tr>
                                      );
                                    }

                                    let currentHeaderExpanded = true;
                                    let headerCounter = 0;
                                    const isPlanReadOnly = isPastMonth || isEmployeeLocked || !canAccessTask(activeTask?.name || "");

                                    return items.map((item, idx) => {
                                      if (item.isHeader) {
                                        headerCounter++;
                                        const isExpanded = item.isExpanded !== false;
                                        currentHeaderExpanded = isExpanded;
                                        const isCustomHeader = !!(item as MonthlyPlanItem).isCustomHeader;
                                        return (
                                          <tr key={`${item.id}-${idx}`} style={{ borderBottom: "1px solid var(--border)", background: item.color ? item.color + "1A" : "var(--muted)" }}>
                                            <td style={{ padding: "6px 16px", color: "var(--muted-foreground)", fontSize: 14, borderBottom: "1px solid var(--border)" }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <button
                                                  onClick={() => updateField(idx, 'isExpanded', !isExpanded)}
                                                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--foreground)", padding: 0, outline: "none", display: "flex", alignItems: "center" }}
                                                >
                                                  <i className={`bi bi-chevron-${isExpanded ? "down" : "right"}`} style={{ color: "var(--muted-foreground)", fontSize: 12 }} />
                                                </button>
                                                <span style={{ fontWeight: 800, color: "#fff", background: item.color || "var(--primary)", width: 24, height: 24, minWidth: 24, minHeight: 24, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                                                  {headerCounter}
                                                </span>
                                              </div>
                                            </td>
                                            <td colSpan={isMediaTask ? 2 : 4} onClick={() => updateField(idx, 'isExpanded', !isExpanded)} style={{ padding: "6px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                                              {isCustomHeader ? (
                                                <input
                                                  value={item.name}
                                                  readOnly={isPlanReadOnly}
                                                  onChange={e => updateField(idx, 'name', e.target.value)}
                                                  onClick={e => e.stopPropagation()}
                                                  placeholder="Tên tuyến nội dung..."
                                                  style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14, color: item.color || "#1e3a8a", fontWeight: 800, textTransform: "uppercase", cursor: isPlanReadOnly ? "default" : "text" }}
                                                />
                                              ) : (
                                                <div style={{ width: "100%", fontSize: 14, color: item.color || "#1e3a8a", fontWeight: 800, textTransform: "uppercase" }}>
                                                  {item.name}
                                                </div>
                                              )}
                                            </td>
                                            <td style={{ padding: "3px 16px", textAlign: "right", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                              <button
                                                disabled={isPlanReadOnly}
                                                onClick={() => {
                                                  if (activeTask?.name?.toUpperCase() === 'MEDIA') {
                                                    let insertIdx = idx + 1;
                                                    const upd = items.map(it => ({ ...it }));
                                                    while (insertIdx < upd.length && !upd[insertIdx].isHeader) { insertIdx++; }
                                                    setShowMediaAddModal({ insertIdx, parentName: item.name });
                                                    return;
                                                  }

                                                  setMonthlyPlans(prev => {
                                                    const prevTaskPlans = prev[activeTask.id] || {};
                                                    const upd = items.map(it => ({ ...it }));
                                                    let insertIdx = idx + 1;
                                                    while (insertIdx < upd.length && !upd[insertIdx].isHeader) { insertIdx++; }
                                                    upd.splice(insertIdx, 0, { id: `mp-${Date.now()}`, name: "", time: "", pic: session?.user?.name || "", status: "pending", note: "", visual: "", channel: "", quantity: "", isHeader: false });
                                                    upd[idx] = { ...upd[idx], isExpanded: true };
                                                    return { ...prev, [activeTask.id]: { ...prevTaskPlans, [activeMonth]: upd } };
                                                  });
                                                }}
                                                title="Thêm chủ đề vào tuyến này"
                                                style={{ background: "transparent", border: "1px dashed", borderRadius: 6, cursor: isPlanReadOnly ? "not-allowed" : "pointer", color: item.color || "var(--muted-foreground)", padding: "2px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, borderColor: item.color ? item.color + "4D" : "var(--border)", whiteSpace: "nowrap", opacity: isPlanReadOnly ? 0.4 : 1 }}
                                                onMouseEnter={e => { if (!isPlanReadOnly) { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.borderColor = "var(--foreground)"; } }}
                                                onMouseLeave={e => { if (!isPlanReadOnly) { e.currentTarget.style.color = item.color || "var(--muted-foreground)"; e.currentTarget.style.borderColor = item.color ? item.color + "4D" : "var(--border)"; } }}
                                              >
                                                <i className="bi bi-plus" style={{ fontSize: 14 }} /> Thêm chủ đề
                                              </button>
                                            </td>
                                            <td style={{ borderBottom: "1px solid var(--border)" }}>
                                              {isCustomHeader && (
                                                <button
                                                  disabled={isPlanReadOnly}
                                                  onClick={() => {
                                                    setMonthlyPlans(prev => {
                                                      const prevTaskPlans = prev[activeTask.id] || {};
                                                      const upd = items.map(it => ({ ...it }));
                                                      upd.splice(idx, 1);
                                                      return { ...prev, [activeTask.id]: { ...prevTaskPlans, [activeMonth]: upd } };
                                                    });
                                                  }}
                                                  style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: isPlanReadOnly ? "not-allowed" : "pointer", width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", opacity: isPlanReadOnly ? 0.4 : 1 }}
                                                  onMouseEnter={e => { if (!isPlanReadOnly) { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "var(--muted)"; } }}
                                                  onMouseLeave={e => { if (!isPlanReadOnly) { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; } }}
                                                >
                                                  <i className="bi bi-trash" style={{ fontSize: 14 }} />
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      }

                                      if (!currentHeaderExpanded) return null;
                                      const isDetail = !!(item as any).isDetail;

                                      if (isDetail) {
                                        return (
                                          <tr key={`${item.id}-${idx}`} style={{ borderBottom: "1px solid var(--border)", background: "transparent" }}>
                                            <td style={{ padding: "3px 8px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", textAlign: "center" }}>
                                              {/* No icon for sub-items */}
                                            </td>
                                            <td style={{ padding: "3px 8px 3px 20px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, paddingLeft: 12, borderLeft: "2px solid var(--border)", marginLeft: 4 }}>
                                                <i className="bi bi-arrow-return-right" style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 5, opacity: 0.6 }} />
                                                <input value={item.name} readOnly={isPlanReadOnly} onChange={e => updateField(idx, 'name', e.target.value)} placeholder="Nội dung chi tiết..." style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500, lineHeight: "20px", cursor: isPlanReadOnly ? "default" : "text" }} />
                                              </div>
                                            </td>
                                            <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                              <MultiDropSelect value={item.time || ""} onChange={(val: string) => updateField(idx, 'time', val)} options={AVAILABLE_WEEKS} placeholder="Tuần" disabled={isPlanReadOnly} />
                                            </td>
                                            {isContentTask ? (
                                              <>
                                                <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                                  <MultiDropSelect value={item.visual || ""} onChange={(val: string) => updateField(idx, 'visual', val)} options={AVAILABLE_VISUALS} placeholder="Ảnh / Video" disabled={isPlanReadOnly} />
                                                </td>
                                                <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                                  <input value={item.quantity || ""} readOnly={isPlanReadOnly} onChange={e => updateField(idx, 'quantity', e.target.value)} placeholder="5 bài" style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 12, color: "#000", lineHeight: "20px", cursor: isPlanReadOnly ? "default" : "text" }} />
                                                </td>
                                                <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                                  <MultiDropSelect value={item.channel || ""} onChange={(val: string) => updateField(idx, 'channel', val)} options={AVAILABLE_CHANNELS} placeholder="Fb / Tiktok" disabled={isPlanReadOnly} />
                                                </td>
                                              </>
                                            ) : isMediaTask ? (
                                              <>
                                                <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                                  <input value={item.pic} readOnly={isPlanReadOnly} onChange={e => updateField(idx, 'pic', e.target.value)} placeholder="Người TH" style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 13, color: "var(--muted-foreground)", lineHeight: "20px", cursor: isPlanReadOnly ? "default" : "text" }} />
                                                </td>
                                              </>
                                            ) : (
                                              <>
                                                <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                                  <input value={item.pic} readOnly={isPlanReadOnly} onChange={e => updateField(idx, 'pic', e.target.value)} placeholder="Người TH" style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 13, color: "var(--muted-foreground)", lineHeight: "20px", cursor: isPlanReadOnly ? "default" : "text" }} />
                                                </td>
                                                <td style={{ padding: "3px 16px", textAlign: "center", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                                  <select value={item.status || "pending"} disabled={isPlanReadOnly} onChange={e => updateField(idx, 'status', e.target.value)} style={{ border: "1px solid var(--border)", background: "transparent", outline: "none", fontSize: 12, color: "var(--foreground)", padding: "2px 4px", borderRadius: 6, cursor: isPlanReadOnly ? "not-allowed" : "pointer" }}>
                                                    <option value="pending">Chờ xử lý</option>
                                                    <option value="processing">Đang chạy</option>
                                                    <option value="done">Hoàn thành</option>
                                                  </select>
                                                </td>
                                                <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                                  <input value={item.note} readOnly={isPlanReadOnly} onChange={e => updateField(idx, 'note', e.target.value)} placeholder="KPIs / Ghi chú" style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 12, color: "#000", lineHeight: "20px", cursor: isPlanReadOnly ? "default" : "text" }} />
                                                </td>
                                              </>
                                            )}
                                            <td style={{ padding: "3px 8px", textAlign: "right", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, opacity: isPlanReadOnly ? 0.3 : 1, pointerEvents: isPlanReadOnly ? "none" : "auto" }}>
                                                <button
                                                  onClick={() => { setViewingTaskDetail(item); setShowTaskDetailOffcanvas(true); }}
                                                  style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", width: 22, height: 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
                                                  onMouseEnter={e => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "var(--muted)"; }}
                                                  onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
                                                  title="Xem chi tiết"
                                                >
                                                  <i className="bi bi-eye" style={{ fontSize: 14 }} />
                                                </button>
                                                <button disabled={isPlanReadOnly} onClick={() => { setMonthlyPlans(prev => { const pt = prev[activeTask.id] || {}; const upd = items.map(it => ({ ...it })); upd.splice(idx, 1); return { ...prev, [activeTask.id]: { ...pt, [activeMonth]: upd } }; }); }} style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: isPlanReadOnly ? "not-allowed" : "pointer", width: 22, height: 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", opacity: isPlanReadOnly ? 0.3 : 1 }} onMouseEnter={e => { if (!isPlanReadOnly) { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "var(--muted)"; } }} onMouseLeave={e => { if (!isPlanReadOnly) { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; } }}>
                                                  <i className="bi bi-trash" style={{ fontSize: 13 }} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      }

                                      return (
                                        <tr key={`${item.id}-${idx}`} style={{ borderBottom: "1px solid var(--border)", background: "transparent" }}>
                                          <td style={{ padding: "6px 12px 6px 16px", color: "var(--muted-foreground)", fontSize: 13, borderBottom: "1px solid var(--border)", textAlign: "right", verticalAlign: "top" }}>
                                            <div style={{ height: "20px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                                              <i className="bi bi-circle-fill" style={{ fontSize: 5, color: "var(--muted-foreground)", opacity: 0.5 }} />
                                            </div>
                                          </td>
                                          <td style={{ padding: "6px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
                                            <input
                                              value={item.name}
                                              readOnly={isPlanReadOnly}
                                              onChange={e => updateField(idx, 'name', e.target.value)}
                                              placeholder="Nhập nội dung..."
                                              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 12, color: "#000", lineHeight: "20px", textTransform: "uppercase", cursor: isPlanReadOnly ? "default" : "text" }}
                                            />
                                            {activeTask?.name?.toUpperCase() === 'MEDIA' && (
                                              <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 0, justifyContent: "flex-start", fontSize: 12, color: "var(--muted-foreground)" }}>
                                                {((item as any).recordTime || item.time) && (() => {
                                                  const formatDt = (v?: string) => {
                                                    if (!v) return "...";
                                                    return v.split("~").map(p => {
                                                      const s = p.trim();
                                                      const parts = s.split("-");
                                                      return parts.length === 3 && parts[0].length === 4 ? `${parts[2]}/${parts[1]}/${parts[0]}` : s;
                                                    }).join(" ~ ");
                                                  };
                                                  const rTime = (item as any).recordTime;
                                                  const hasR = !!rTime && rTime.trim() !== "";
                                                  const hasT = !!item.time && item.time.trim() !== "";
                                                  return (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                      <i className="bi bi-clock-history" style={{ color: "var(--primary)" }} />
                                                      <span>
                                                        {hasR && (
                                                          <><span style={{ fontWeight: 500 }}>Thời gian quay:</span> {formatDt(rTime)}</>
                                                        )}
                                                        {hasR && hasT && (
                                                          <span style={{ color: "var(--border)", margin: "0 4px" }}>|</span>
                                                        )}
                                                        {hasT && (
                                                          <><span style={{ fontWeight: 500 }}>Ngày hoàn thành:</span> {formatDt(item.time)}</>
                                                        )}
                                                      </span>
                                                    </div>
                                                  );
                                                })()}
                                                {(item.channel) && (
                                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <span style={{ fontWeight: 500 }}>Nền tảng:</span>
                                                    <i className={
                                                      item.channel.toLowerCase().includes("tiktok") ? "bi bi-tiktok text-dark" :
                                                        item.channel.toLowerCase().includes("face") || item.channel.toLowerCase().includes("fb") ? "bi bi-facebook text-primary" :
                                                          item.channel.toLowerCase().includes("you") || item.channel.toLowerCase().includes("yt") ? "bi bi-youtube text-danger" :
                                                            "bi bi-display text-secondary"
                                                    } />
                                                    <span>{item.channel}</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </td>
                                          {isMediaTask ? (
                                            <td style={{ padding: "6px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", fontSize: 14, color: "var(--foreground)" }}>
                                              {(() => {
                                                const timeStr = item.time || "";
                                                const parts = timeStr.trim().split("-");
                                                if (parts.length === 3 && parts[0].length === 4) {
                                                  const d = parseInt(parts[2], 10);
                                                  if (!isNaN(d)) return `${Math.ceil(d / 7)}`;
                                                }
                                                return "";
                                              })()}
                                            </td>
                                          ) : (
                                            <td style={{ padding: "6px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }} />
                                          )}
                                          {isContentTask ? (
                                            <>
                                              <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }} />
                                              <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                                {(() => {
                                                  const details = items.filter(x => (x as any).isDetail && (x as any).parentId === item.id);
                                                  if (details.length > 0) {
                                                    const total = details.reduce((s, x) => s + (parseInt(x.quantity || "1") || 0), 0);
                                                    return <span style={{ fontSize: 14, color: "var(--foreground)" }}>{total} bài</span>;
                                                  }
                                                  return (
                                                    <input
                                                      value={item.quantity || ""}
                                                      onChange={e => updateField(idx, 'quantity', e.target.value)}
                                                      placeholder=""
                                                      style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14, color: "var(--foreground)", lineHeight: "20px" }}
                                                    />
                                                  );
                                                })()}
                                              </td>
                                              <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }} />
                                            </>
                                          ) : isMediaTask ? (
                                            <>
                                              <td style={{ padding: "6px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                                {(() => {
                                                  const finalPicName = item.picName || item.pic || session?.user?.name || "Bạn";
                                                  return (
                                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: getColorFromName(finalPicName), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                                        {getInitials(finalPicName)}
                                                      </div>
                                                      <span style={{ fontSize: 14, color: "var(--foreground)" }}>{finalPicName}</span>
                                                    </div>
                                                  );
                                                })()}
                                              </td>
                                            </>
                                          ) : (
                                            <>
                                              <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }} />
                                              <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }} />
                                              <td style={{ padding: "3px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }} />
                                            </>
                                          )}
                                          <td style={{ padding: "3px 8px", textAlign: "right", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, opacity: isPlanReadOnly ? 0.3 : 1, pointerEvents: isPlanReadOnly ? "none" : "auto" }}>
                                              <button
                                                onClick={() => {
                                                  if (activeTask?.name?.toUpperCase() === 'MEDIA') {
                                                    const parentHeader = items.slice(0, idx).reverse().find(x => x.isHeader);
                                                    setShowMediaAddModal({ insertIdx: idx, parentName: parentHeader ? parentHeader.name : "", editItem: item });
                                                    setMediaForm({
                                                      chuDe: item.name || "",
                                                      noiDung: item.detailContent || "",
                                                      quangCao: item.ads ? "Yes" : "No",
                                                      doiTuong: item.targetAudience || "",
                                                      nenTang: item.channel || "",
                                                      thoiGianQuay: item.recordTime || "",
                                                      thoiGianHoanThanh: item.time || "",
                                                      linkSp: item.linkSp || "",
                                                      ghiChu: item.location || "",
                                                      theoTuan: item.isByWeek || false,
                                                      tuan: item.week || ""
                                                    });
                                                  } else {
                                                    setViewingTaskDetail(item);
                                                    setShowTaskDetailOffcanvas(true);
                                                  }
                                                }}
                                                style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", width: 22, height: 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
                                                onMouseEnter={e => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "var(--muted)"; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
                                                title="Xem chi tiết"
                                              >
                                                <i className="bi bi-eye" style={{ fontSize: 14 }} />
                                              </button>
                                              {activeTask?.name?.toUpperCase() !== 'MEDIA' && (
                                                <button
                                                  disabled={isPlanReadOnly}
                                                  onClick={() => {
                                                    setMonthlyPlans(prev => {
                                                      const prevTaskPlans = prev[activeTask.id] || {};
                                                      let upd = prevTaskPlans[activeMonth];
                                                      if (upd === undefined) { upd = pillars.map(p => ({ id: `mp-init-${p.id}`, name: (p.name || "").toUpperCase(), time: "", pic: "", status: "pending", note: "", isHeader: true, isExpanded: true, color: p.color, visual: "", channel: "", quantity: "" })); }
                                                      else { upd = [...upd]; }
                                                      let insertIdx = idx + 1;
                                                      while (insertIdx < upd.length && (upd[insertIdx] as any).isDetail && (upd[insertIdx] as any).parentId === item.id) { insertIdx++; }
                                                      upd.splice(insertIdx, 0, { id: `mp-detail-${Date.now()}`, parentId: item.id, isDetail: true, name: "", time: "", pic: session?.user?.name || "", status: "pending", note: "", visual: "", channel: "", quantity: "1", isHeader: false } as any);
                                                      return { ...prev, [activeTask.id]: { ...prevTaskPlans, [activeMonth]: upd } };
                                                    });
                                                  }}
                                                  title="Thêm dòng bên dưới"
                                                  style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: isPlanReadOnly ? "not-allowed" : "pointer", width: 22, height: 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
                                                  onMouseEnter={e => { e.currentTarget.style.color = "#3b82f6"; e.currentTarget.style.background = "var(--muted)"; }}
                                                  onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
                                                >
                                                  <i className="bi bi-plus" style={{ fontSize: 14 }} />
                                                </button>
                                              )}
                                              <button
                                                disabled={isPlanReadOnly}
                                                onClick={() => {
                                                  setMonthlyPlans(prev => {
                                                    const pt = prev[activeTask.id] || {};
                                                    const currentItems = [...(pt[activeMonth] || [])];

                                                    // If this is a parent, delete all children too
                                                    const itemToDelete = currentItems[idx];
                                                    let indicesToRemove = [idx];

                                                    if (!(itemToDelete as any).isDetail && !(itemToDelete as any).isHeader) {
                                                      // It's a parent task, find all children
                                                      currentItems.forEach((it, i) => {
                                                        if ((it as any).parentId === itemToDelete.id) {
                                                          indicesToRemove.push(i);
                                                        }
                                                      });
                                                    }

                                                    // Remove from back to front to preserve indices
                                                    const filtered = currentItems.filter((_, i) => !indicesToRemove.includes(i));

                                                    return {
                                                      ...prev,
                                                      [activeTask.id]: { ...pt, [activeMonth]: filtered }
                                                    };
                                                  });
                                                }}
                                                style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: isPlanReadOnly ? "not-allowed" : "pointer", width: 22, height: 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
                                                onMouseEnter={e => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "var(--muted)"; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
                                              >
                                                <i className="bi bi-trash" style={{ fontSize: 14 }} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}

                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── BƯỚC 4: NGÂN SÁCH ── */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="app-card" style={{ padding: "20px 32px 32px", borderRadius: "0 0 16px 16px", flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", minHeight: "400px" }}
                >
                  {/* Header: Sub Tabs & Month Selector */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, marginBottom: 24 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      {[
                        { id: 'total', label: 'Tổng ngân sách', icon: 'bi-calculator' },
                        { id: 'monthly', label: 'Ngân sách theo tháng', icon: 'bi-calendar3' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setBudgetSubTab(tab.id as any)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8, position: "relative",
                            padding: "10px 20px",
                            borderRadius: 100,
                            fontSize: 14,
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            background: budgetSubTab === tab.id ? "var(--primary)" : "var(--muted)",
                            color: budgetSubTab === tab.id ? "white" : "var(--muted-foreground)",
                            boxShadow: budgetSubTab === tab.id ? "0 4px 12px color-mix(in srgb, var(--primary) 25%, transparent)" : "none"
                          }}
                        >
                          <i className={`bi ${tab.icon}`} />
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Compact Month Selector - Only shows for Monthly tab */}
                    {budgetSubTab === 'monthly' && (
                      <div style={{ display: "flex", alignItems: "center", position: "relative", padding: "0 10px" }}>
                        <div style={{ position: "absolute", top: "50%", left: 20, right: 20, height: 1, background: "var(--border)", transform: "translateY(-50%)", zIndex: 0 }} />
                        <div style={{ display: "flex", gap: 6, position: "relative", zIndex: 1 }}>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <button
                              key={m}
                              onClick={() => setActiveBudgetMonth(m)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                border: activeBudgetMonth === m ? "none" : "1px solid var(--border)",
                                background: activeBudgetMonth === m ? "var(--primary)" : "var(--card)",
                                color: activeBudgetMonth === m ? "white" : "var(--muted-foreground)",
                                boxShadow: activeBudgetMonth === m ? "0 4px 10px color-mix(in srgb, var(--primary) 25%, transparent)" : "none",
                              }}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tab Content Area */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {budgetSubTab === 'total' ? (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* 1. Allocation Table */}
                        <div className="custom-scrollbar" style={{ overflow: "auto", maxHeight: "calc(100vh - 450px)" }}>
                          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, minWidth: 1000, fontSize: 14 }}>
                            <thead>
                              <tr style={{ background: "var(--muted)", textAlign: "left", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 0 var(--border)" }}>
                                <th style={{ padding: "12px", fontWeight: 700, color: "var(--muted-foreground)", width: 60 }}>STT</th>
                                <th style={{ padding: "12px", fontWeight: 700, color: "var(--muted-foreground)" }}>Hạng mục - Công việc</th>
                                <th style={{ padding: "12px", fontWeight: 700, color: "var(--muted-foreground)", width: 120, textAlign: "center" }}>Tỷ lệ (%)</th>
                                <th style={{ padding: "12px", fontWeight: 700, color: "var(--muted-foreground)", width: 220, textAlign: "right" }}>Giá trị (đ)</th>
                                <th style={{ padding: "12px", fontWeight: 700, color: "var(--muted-foreground)" }}>Ghi chú</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const mainItems = [
                                  { id: "rev_goal", label: "Mục tiêu doanh thu" },
                                  { id: "mkt_total", label: "Tổng ngân sách marketing" },
                                  { id: "agency", label: "Ngân sách cho các đại lý", canAdd: true },
                                  { id: "branding", label: "Ngân sách cho Branding", canAdd: true }
                                ];

                                let sttCount = 0;
                                return mainItems.map((item) => {
                                  const subRows = item.id === "agency" ? agencySubRows : item.id === "branding" ? brandingSubRows : [];
                                  sttCount++;
                                  const currentSTT = sttCount;

                                  const updateCascades = (next: Record<string, string>, focusId?: string, isValueChange?: boolean) => {
                                    const getNum = (id: string) => Number((next[`budget_val_${id}`] || "0").replace(/\D/g, ""));
                                    const getRate = (idKey: string) => parseFloat((next[idKey] || "0").replace(/[^-0-9.]/g, ""));
                                    const setFormatVal = (id: string, num: number) => { next[`budget_val_${id}`] = num.toLocaleString("vi-VN"); };
                                    const setFormatRate = (id: string, rate: number) => { next[`budget_rate_${id}`] = rate % 1 === 0 ? rate.toString() : rate.toFixed(1); };

                                    // Special Handle: If manual value change, calculate ITS OWN rate first
                                    if (isValueChange && focusId) {
                                      const val = getNum(focusId);
                                      let base = 0;
                                      if (focusId === "mkt_total") base = getNum("rev_goal");
                                      else if (focusId === "agency" || focusId === "branding") base = getNum("mkt_total");
                                      else {
                                        // sub-row
                                        const parentId = focusId.includes("agency") ? "agency" : "branding";
                                        base = getNum(parentId);
                                      }
                                      if (base && val) setFormatRate(focusId, (val / base) * 100);
                                    }

                                    // 1. Update Mkt Total if rev or mkt_rate changed
                                    const r = getNum("rev_goal");
                                    const pMkt = getRate("budget_rate_mkt_total");
                                    if (r && pMkt && (!isValueChange || focusId !== "mkt_total")) setFormatVal("mkt_total", Math.round(r * pMkt / 100));

                                    // 2. Cascade update Agency/Branding from Mkt Total
                                    const mktTotal = getNum("mkt_total");
                                    ["agency", "branding"].forEach(pId => {
                                      const pRate = getRate(`budget_rate_${pId}`);
                                      if (mktTotal && pRate && (!isValueChange || focusId !== pId)) setFormatVal(pId, Math.round(mktTotal * pRate / 100));
                                    });

                                    // 3. Cascade update Sub-rows from Parent (Agency/Branding)
                                    ["agency", "branding"].forEach(pId => {
                                      const pVal = getNum(pId);
                                      const currentSubRows = pId === "agency" ? agencySubRows : brandingSubRows;
                                      currentSubRows.forEach(sub => {
                                        const subRate = getRate(`budget_rate_${sub.id}`);
                                        if (pVal && subRate && (!isValueChange || focusId !== sub.id)) setFormatVal(sub.id, Math.round(pVal * subRate / 100));
                                      });
                                    });
                                    return next;
                                  };

                                  return (
                                    <React.Fragment key={item.id}>
                                      <tr style={{}}>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "2px 12px", color: "var(--muted-foreground)" }}>{currentSTT}</td>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "2px 12px", fontWeight: 700, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.01em" }}>
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                            <span>{item.label}</span>
                                            {item.canAdd && (
                                              <button
                                                onClick={() => handleAddSubRow(item.id)}
                                                className="btn-primary"
                                                style={{ border: "none", background: "var(--primary)", color: "white", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                                              >
                                                <i className="bi bi-plus" />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "1px 12px" }}>
                                          <input data-col="rate"
                                            type="text"
                                            value={targetAudience[`budget_rate_${item.id}`] || ""}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setTargetAudience(prev => updateCascades({ ...prev, [`budget_rate_${item.id}`]: val }));
                                            }}
                                            onKeyDown={e => { handleTableNavigation(e, "rate"); if (e.key === "Enter") { e.preventDefault(); handleAddSubRow(item.id); } }}
                                            placeholder="..."
                                            style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 14, textAlign: "center" }}
                                            onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                            onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                          />
                                        </td>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "1px 12px" }}>
                                          <input data-col="val"
                                            type="text"
                                            value={targetAudience[`budget_val_${item.id}`] || ""}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/\D/g, "");
                                              const formatted = val ? Number(val).toLocaleString("vi-VN") : "";
                                              setTargetAudience(prev => updateCascades({ ...prev, [`budget_val_${item.id}`]: formatted }, item.id, true));
                                            }}
                                            onKeyDown={e => { handleTableNavigation(e, "rate"); if (e.key === "Enter") { e.preventDefault(); handleAddSubRow(item.id); } }}
                                            placeholder="0"
                                            style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 14, fontWeight: 800, color: "var(--primary)", textAlign: "right" }}
                                            onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                            onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                          />
                                        </td>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "1px 12px" }}>
                                          <input data-col="note"
                                            type="text"
                                            value={targetAudience[`budget_note_${item.id}`] || ""}
                                            onChange={(e) => setTargetAudience(prev => ({ ...prev, [`budget_note_${item.id}`]: e.target.value }))}
                                            onKeyDown={e => { handleTableNavigation(e, "val"); if (e.key === "Enter") { e.preventDefault(); handleAddSubRow(item.id); } }}
                                            placeholder="Ghi chú..."
                                            style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 14, color: "var(--muted-foreground)" }}
                                            onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                            onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                          />
                                        </td>
                                      </tr>
                                      {subRows.map((sub, sIdx) => (
                                        <tr key={sub.id} style={{ background: "color-mix(in srgb, var(--muted) 20%, transparent)" }}>
                                          <td style={{ borderBottom: "1px solid var(--border)", padding: "2px 12px 2px 20px", color: "var(--muted-foreground)", fontSize: 11 }}>{currentSTT}.{sIdx + 1}</td>
                                          <td style={{ borderBottom: "1px solid var(--border)", padding: "2px 12px" }}>
                                            <input data-col="name"
                                              type="text"
                                              autoFocus={sub.isNew}
                                              value={sub.label}
                                              onChange={(e) => {
                                                const newVal = e.target.value;
                                                if (item.id === "agency") setAgencySubRows(agencySubRows.map(r => r.id === sub.id ? { ...r, label: newVal } : r));
                                                else setBrandingSubRows(brandingSubRows.map(r => r.id === sub.id ? { ...r, label: newVal } : r));
                                              }}
                                              onKeyDown={e => {
                                                handleTableNavigation(e, "note");
                                                if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  handleAddSubRow(item.id);
                                                }
                                              }}
                                              placeholder="Tên hạng mục..."
                                              style={{ width: "100%", padding: "4px", borderRadius: 4, border: "1px solid transparent", background: "transparent", fontSize: 13, fontWeight: 400 }}
                                              onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                              onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                            />
                                          </td>
                                          <td style={{ borderBottom: "1px solid var(--border)", padding: "1px 12px" }}>
                                            <input data-col="rate"
                                              type="text"
                                              value={targetAudience[`budget_rate_${sub.id}`] || ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setTargetAudience(prev => updateCascades({ ...prev, [`budget_rate_${sub.id}`]: val }));
                                              }}
                                              onKeyDown={e => { handleTableNavigation(e, "name"); if (e.key === "Enter") { e.preventDefault(); handleAddSubRow(item.id); } }}
                                              placeholder="..."
                                              style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 14, textAlign: "center" }}
                                              onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                              onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                            />
                                          </td>
                                          <td style={{ borderBottom: "1px solid var(--border)", padding: "1px 12px" }}>
                                            <input data-col="val"
                                              type="text"
                                              value={targetAudience[`budget_val_${sub.id}`] || ""}
                                              onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "");
                                                const formatted = val ? Number(val).toLocaleString("vi-VN") : "";
                                                setTargetAudience(prev => updateCascades({ ...prev, [`budget_val_${sub.id}`]: formatted }, sub.id, true));
                                              }}
                                              onKeyDown={e => { handleTableNavigation(e, "rate"); if (e.key === "Enter") { e.preventDefault(); handleAddSubRow(item.id); } }}
                                              placeholder="0"
                                              style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 14, textAlign: "right", color: "var(--foreground)", fontWeight: 400 }}
                                              onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                              onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                            />
                                          </td>
                                          <td style={{ borderBottom: "1px solid var(--border)", padding: "1px 12px" }}>
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                              <input data-col="note"
                                                type="text"
                                                value={targetAudience[`budget_note_${sub.id}`] || ""}
                                                onChange={(e) => setTargetAudience(prev => ({ ...prev, [`budget_note_${sub.id}`]: e.target.value }))}
                                                onKeyDown={e => { handleTableNavigation(e, "val"); if (e.key === "Enter") { e.preventDefault(); handleAddSubRow(item.id); } }}
                                                placeholder="..."
                                                style={{ flex: 1, padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 13, color: "var(--muted-foreground)" }}
                                                onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                                onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                              />
                                              <button
                                                onClick={() => {
                                                  if (item.id === "agency") setAgencySubRows(agencySubRows.filter(r => r.id !== sub.id));
                                                  else setBrandingSubRows(brandingSubRows.filter(r => r.id !== sub.id));
                                                }}
                                                style={{ border: "none", background: "transparent", color: "var(--destructive)", cursor: "pointer", fontSize: 14, opacity: 1 }}
                                              >
                                                <i className="bi bi-trash" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ width: 4, height: 18, background: "var(--primary)", borderRadius: 2 }} />
                              <span style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>Chi tiết ngân sách Branding - Tháng {activeBudgetMonth}</span>
                            </div>
                            {(() => {
                              const mKey = `m${activeBudgetMonth}`;
                              const monthlyTotalKey = `budget_${mKey}_monthly_total`;
                              const monthlyTotalVal = Number((targetAudience[monthlyTotalKey] || "0").replace(/\D/g, ""));
                              let currentSum = 0;
                              brandingSubRows.forEach(sub => {
                                const val = (targetAudience[`budget_${mKey}_val_${sub.id}`] || "0").replace(/\D/g, "");
                                currentSum += Number(val || 0);
                              });
                              const remaining = monthlyTotalVal - currentSum;
                              return (
                                <div style={{ fontSize: 14, fontWeight: 500, color: remaining < 0 ? "var(--destructive)" : "var(--muted-foreground)" }}>
                                  Số tiền còn lại: <span style={{ color: remaining < 0 ? "var(--destructive)" : "var(--primary)", fontWeight: 800 }}>{remaining.toLocaleString("vi-VN")} đồng</span>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="custom-scrollbar" style={{ overflow: "auto", maxHeight: "calc(100vh - 450px)" }}>
                            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, minWidth: 1000 }}>
                              <thead>
                                <tr style={{ background: "var(--muted)", borderBottom: "2px solid var(--border)", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 0 var(--border)" }}>
                                  <th style={{ padding: "12px 16px", textAlign: "left", width: 60, fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>STT</th>
                                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Hạng mục - Công việc</th>
                                  <th style={{ padding: "12px 16px", textAlign: "center", width: 120, fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Tỷ lệ (%)</th>
                                  <th style={{ padding: "12px 16px", textAlign: "right", width: 220, fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Giá trị (đ)</th>
                                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>Ghi chú</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const mKey = `m${activeBudgetMonth}`;
                                  const monthlyTotalKey = `budget_${mKey}_monthly_total`;
                                  const monthlyTotalVal = Number((targetAudience[monthlyTotalKey] || "0").replace(/\D/g, ""));

                                  // Helper for validation
                                  const checkBudgetLimit = (id: string, newVal: string, isRate: boolean) => {
                                    let sum = 0;
                                    brandingSubRows.forEach(sub => {
                                      if (sub.id === id) return;
                                      const key = isRate ? `budget_${mKey}_rate_${sub.id}` : `budget_${mKey}_val_${sub.id}`;
                                      const rawVal = (targetAudience[key] || "0");
                                      const numVal = isRate ? parseFloat(rawVal.replace(/[^-0-9.]/g, "") || "0") : Number(rawVal.replace(/\D/g, "") || "0");
                                      sum += numVal;
                                    });
                                    const current = isRate ? parseFloat(newVal.replace(/[^-0-9.]/g, "") || "0") : Number(newVal.replace(/\D/g, "") || "0");
                                    const limit = isRate ? 100 : monthlyTotalVal;
                                    return (sum + current) <= limit;
                                  };

                                  return (
                                    <>
                                      <tr style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", }}>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "4px 12px" }}></td>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "4px 12px", fontWeight: 800, textTransform: "uppercase", fontSize: 13, color: "var(--primary)" }}>TỔNG CỘNG</td>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "4px 12px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                                          100
                                        </td>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "4px 12px" }}>
                                          <input data-col="val"
                                            type="text"
                                            value={targetAudience[monthlyTotalKey] || ""}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/\D/g, "");
                                              const formatted = val ? Number(val).toLocaleString("vi-VN") : "";
                                              setTargetAudience(prev => {
                                                const next = { ...prev, [monthlyTotalKey]: formatted };
                                                // If total reduced, we might need to adjust children? 
                                                // For now, just update children values based on rates
                                                brandingSubRows.forEach(sub => {
                                                  const rate = parseFloat((next[`budget_${mKey}_rate_${sub.id}`] || "0").replace(/[^-0-9.]/g, ""));
                                                  if (val && rate) {
                                                    next[`budget_${mKey}_val_${sub.id}`] = Math.round(Number(val) * rate / 100).toLocaleString("vi-VN");
                                                  }
                                                });
                                                return next;
                                              });
                                            }}
                                            placeholder="Nhập tổng..."
                                            onKeyDown={e => { handleTableNavigation(e, "val"); }} style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 14, fontWeight: 800, color: "var(--primary)", textAlign: "right" }}
                                            onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                            onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                          />
                                        </td>
                                        <td style={{ borderBottom: "1px solid var(--border)", padding: "4px 12px" }}></td>
                                      </tr>

                                      {brandingSubRows.map((sub, idx) => {
                                        const valKey = `budget_${mKey}_val_${sub.id}`;
                                        const rateKey = `budget_${mKey}_rate_${sub.id}`;
                                        const noteKey = `budget_${mKey}_note_${sub.id}`;

                                        return (
                                          <tr key={sub.id} style={{}}>
                                            <td style={{ borderBottom: "1px solid var(--border)", padding: "4px 12px", fontSize: 13, color: "var(--muted-foreground)" }}>{idx + 1}</td>
                                            <td style={{ borderBottom: "1px solid var(--border)", padding: "4px 12px", fontSize: 14, fontWeight: 500 }}>{sub.label || "Hạng mục chưa đặt tên"}</td>
                                            <td style={{ borderBottom: "1px solid var(--border)", padding: "2px 12px" }}>
                                              <input
                                                type="text"
                                                value={targetAudience[rateKey] || ""}
                                                onChange={(e) => {
                                                  const rateVal = e.target.value;
                                                  const p = parseFloat(rateVal.replace(/[^-0-9.]/g, "") || "0");

                                                  if (!checkBudgetLimit(sub.id, rateVal, true)) {
                                                    setBudgetValidationAlert({
                                                      title: "Vượt quá tỷ lệ",
                                                      message: "Tổng tỷ lệ của các hạng mục không được vượt quá 100%."
                                                    });
                                                    return;
                                                  }

                                                  setTargetAudience(prev => {
                                                    const next = { ...prev, [rateKey]: rateVal };
                                                    if (monthlyTotalVal && p) {
                                                      next[valKey] = Math.round(monthlyTotalVal * p / 100).toLocaleString("vi-VN");
                                                    } else {
                                                      next[valKey] = "0";
                                                    }
                                                    return next;
                                                  });
                                                }}
                                                placeholder="..."
                                                style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 14, textAlign: "center" }}
                                                onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                                onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                              />
                                            </td>
                                            <td style={{ borderBottom: "1px solid var(--border)", padding: "2px 12px" }}>
                                              <input
                                                type="text"
                                                value={targetAudience[valKey] || ""}
                                                onChange={(e) => {
                                                  const rawVal = e.target.value.replace(/\D/g, "");
                                                  const val = Number(rawVal || 0);

                                                  if (!checkBudgetLimit(sub.id, rawVal, false)) {
                                                    setBudgetValidationAlert({
                                                      title: "Vượt định mức ngân sách",
                                                      message: `Tổng giá trị các hạng mục vượt quá ngân sách tháng (${monthlyTotalVal.toLocaleString("vi-VN")}đ).`
                                                    });
                                                    return;
                                                  }

                                                  const formatted = rawVal ? Number(rawVal).toLocaleString("vi-VN") : "";
                                                  setTargetAudience(prev => {
                                                    const next = { ...prev, [valKey]: formatted };
                                                    if (monthlyTotalVal && val) {
                                                      const rate = (val / monthlyTotalVal) * 100;
                                                      next[rateKey] = rate % 1 === 0 ? rate.toString() : rate.toFixed(1);
                                                    }
                                                    return next;
                                                  });
                                                }}
                                                placeholder="0"
                                                style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 14, textAlign: "right", fontWeight: 400 }}
                                                onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                                onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                              />
                                            </td>
                                            <td style={{ borderBottom: "1px solid var(--border)", padding: "2px 12px" }}>
                                              <input
                                                type="text"
                                                value={targetAudience[noteKey] || ""}
                                                onChange={(e) => setTargetAudience(prev => ({ ...prev, [noteKey]: e.target.value }))}
                                                style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", background: "transparent", fontSize: 13, color: "var(--muted-foreground)" }}
                                                onFocus={(e) => e.target.style.border = "1px solid var(--border)"}
                                                onBlur={(e) => e.target.style.border = "1px solid transparent"}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {brandingSubRows.length === 0 && (
                                        <tr>
                                          <td colSpan={5} style={{ borderBottom: "1px solid var(--border)", padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14, fontStyle: "italic" }}>
                                            Chưa có hạng mục Branding nào được định nghĩa. Hãy thêm hạng mục con tại tab "Tổng ngân sách".
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="app-card" style={{ padding: 32, borderRadius: "0 0 16px 16px", flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", minHeight: 450 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 40, flex: 1 }}>
                    {/* Cột Trái (Tỉ lệ 5) */}
                    <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", paddingRight: 40 }}>
                      <SectionTitle title="Tổng hợp kế hoạch năm" />

                      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Summary Card: Agency Growth */}
                        <div style={{ background: "var(--muted)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Phát triển đại lý năm</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            {[
                              { key: "agency_ke", label: "Lắp kệ" },
                              { key: "agency_chinh_thuc", label: "Chính thức" },
                              { key: "agency_lay_hang", label: "Lấy lẻ" }
                            ].map(item => {
                              const total = Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, m) => {
                                const val = (targetAudience[`rev_m${m}_${item.key}`] || "0").replace(/\D/g, "");
                                return sum + Number(val);
                              }, 0);
                              return (
                                <div key={item.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>{item.label}</span>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{total} <span style={{ fontSize: 9, fontWeight: 400 }}>ĐL</span></span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Revenue Breakdown */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Doanh thu dự kiến năm</div>
                          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                            <tbody>
                              {[
                                {
                                  id: "seajong", label: "SEAJONG", color: "#1e3a8a",
                                  subRows: [
                                    { id: "sj_ke", qtyKey: "agency_ke", defAvg: 200000000 },
                                    { id: "sj_chinh_thuc", qtyKey: "agency_chinh_thuc", defAvg: 100000000 },
                                    { id: "sj_le", qtyKey: "agency_lay_hang", defAvg: 30000000 },
                                  ]
                                },
                                {
                                  id: "voriger", label: "VORIGER", color: "var(--foreground)",
                                  subRows: [
                                    { id: "vg_shopee" },
                                    { id: "vg_b2b" },
                                    { id: "vg_khach_ngoai" },
                                  ]
                                }
                              ].map(brand => {
                                const brandTotal = Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, m) => {
                                  return sum + brand.subRows.reduce((subSum, sub: any) => {
                                    const q = Number((targetAudience[`rev_m${m}_${sub.qtyKey || ""}`] || "0").replace(/\D/g, ""));
                                    const a = Number((targetAudience[`rev_m${m}_${sub.id}_avg`] || (sub.defAvg ? sub.defAvg.toLocaleString("vi-VN") : "0")).replace(/\D/g, ""));
                                    const mTotal = Number((targetAudience[`rev_m${m}_${sub.id}_total`] || "0").replace(/\D/g, ""));
                                    return subSum + (mTotal || (q * a));
                                  }, 0);
                                }, 0);

                                return (
                                  <tr key={brand.id}>
                                    <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, color: brand.color }}>
                                      {brand.label}
                                    </td>
                                    <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right", fontSize: 14, fontWeight: 700 }}>
                                      {brandTotal.toLocaleString("vi-VN")} <span style={{ fontSize: 9, fontWeight: 400, color: "var(--muted-foreground)" }}>đ</span>
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Grand Total */}
                              <tr style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
                                <td style={{ padding: "12px 10px", borderRadius: "8px 0 0 8px", fontSize: 12, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase" }}>TỔNG CỘNG NĂM</td>
                                <td style={{ padding: "12px 10px", borderRadius: "0 8px 8px 0", textAlign: "right", fontSize: 16, fontWeight: 900, color: "var(--primary)" }}>
                                  {
                                    [
                                      { subRows: [{ id: "sj_ke", qtyKey: "agency_ke", defAvg: 200000000 }, { id: "sj_chinh_thuc", qtyKey: "agency_chinh_thuc", defAvg: 100000000 }, { id: "sj_le", qtyKey: "agency_lay_hang", defAvg: 30000000 }] },
                                      { subRows: [{ id: "vg_shopee" }, { id: "vg_b2b" }, { id: "vg_khach_ngoai" }] }
                                    ].reduce((grand, brand) => {
                                      return grand + Array.from({ length: 12 }, (_, i) => i + 1).reduce((bSum, m) => {
                                        return bSum + brand.subRows.reduce((sSum, sub: any) => {
                                          const q = Number((targetAudience[`rev_m${m}_${sub.qtyKey || ""}`] || "0").replace(/\D/g, ""));
                                          const a = Number((targetAudience[`rev_m${m}_${sub.id}_avg`] || (sub.defAvg ? sub.defAvg.toLocaleString("vi-VN") : "0")).replace(/\D/g, ""));
                                          const mTotal = Number((targetAudience[`rev_m${m}_${sub.id}_total`] || "0").replace(/\D/g, ""));
                                          return sSum + (mTotal || (q * a));
                                        }, 0);
                                      }, 0);
                                    }, 0).toLocaleString("vi-VN")
                                  }
                                  <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 4 }}>đ</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Note / Strategy Section */}
                        <div style={{ marginTop: "auto", padding: 16, border: "1px dashed var(--border)", borderRadius: 12, background: "var(--card)" }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Ghi chú chiến lược năm:</label>
                          <textarea
                            value={targetAudience.rev_annual_note || ""}
                            onChange={(e) => setTargetAudience(prev => ({ ...prev, rev_annual_note: e.target.value }))}
                            placeholder="Nhập định hướng doanh thu năm..."
                            style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 12, color: "var(--foreground)", minHeight: 60, resize: "none", fontStyle: "italic" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cột Phải (Tỉ lệ 7) */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <SectionTitle
                        title="Mục tiêu tháng"
                        action={
                          <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m, idx) => {
                              const isSel = activeBudgetMonth === m;
                              return (
                                <React.Fragment key={m}>
                                  <div
                                    onClick={() => setActiveBudgetMonth(m)}
                                    style={{
                                      width: 24, height: 24, borderRadius: "50%",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                                      background: isSel ? "var(--primary)" : "transparent",
                                      color: isSel ? "var(--primary-foreground)" : "var(--muted-foreground)",
                                      border: `1px solid ${isSel ? "var(--primary)" : "var(--border)"}`,
                                      boxShadow: isSel ? "0 4px 10px rgba(30, 58, 138, 0.2)" : "none",
                                      transition: "all 0.2s",
                                      zIndex: 2,
                                      position: "relative"
                                    }}
                                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.borderColor = "var(--primary)"; }}
                                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.borderColor = "var(--border)"; }}
                                  >
                                    {m}
                                  </div>
                                  {idx < 11 && (
                                    <div style={{ width: 10, height: 1, background: "var(--border)", zIndex: 1 }} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        }
                      />
                      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 20 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>Phát triển đại lý:</span>
                        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                          {[
                            { id: "agency_ke", label: "Lắp kệ" },
                            { id: "agency_chinh_thuc", label: "Chính thức" },
                            { id: "agency_lay_hang", label: "Lấy hàng" }
                          ].map(item => {
                            const key = `rev_m${activeBudgetMonth}_${item.id}`;
                            return (
                              <div key={item.id} style={{
                                display: "flex", alignItems: "flex-start", gap: 8, position: "relative",
                                background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                                padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)"
                              }}>
                                <label style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500, whiteSpace: "nowrap" }}>{item.label}:</label>
                                <input
                                  type="text"
                                  placeholder="0"
                                  value={targetAudience[key] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    setTargetAudience(prev => ({ ...prev, [key]: val ? Number(val).toLocaleString("vi-VN") : "" }));
                                  }}
                                  style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, fontWeight: 700, color: "var(--primary)", textAlign: "right", width: "40px" }}
                                />
                                <span style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 500 }}>ĐL</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ marginTop: 24, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                        <div className="custom-scrollbar" style={{ overflow: "auto", flex: 1 }}>
                          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                            <thead>
                              <tr style={{ background: "var(--muted)" }}>
                                <th rowSpan={2} style={{ borderBottom: "2px solid var(--border)", borderRight: "1px solid var(--border)", padding: "8px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", width: 40, textAlign: "center" }}>STT</th>
                                <th rowSpan={2} style={{ borderBottom: "2px solid var(--border)", borderRight: "1px solid var(--border)", padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textAlign: "left" }}>Hạng mục</th>
                                <th colSpan={2} style={{ borderBottom: "1px solid var(--border)", padding: "8px", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textAlign: "center" }}>Doanh thu (đ)</th>
                              </tr>
                              <tr style={{ background: "var(--muted)" }}>
                                <th style={{ borderBottom: "2px solid var(--border)", borderRight: "1px solid var(--border)", padding: "8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textAlign: "center" }}>Trung bình</th>
                                <th style={{ borderBottom: "2px solid var(--border)", padding: "8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textAlign: "center" }}>Tổng tháng</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { id: "monthly_goal", label: "MỤC TIÊU THÁNG", isGrandTotal: true, theme: "var(--primary)" },
                                { id: "seajong", label: "SEAJONG", isMain: true, theme: "#1e3a8a" },
                                { id: "sj_ke", label: "Đại lý lắp kệ", parent: "seajong", qtyKey: "agency_ke", defAvg: 200000000 },
                                { id: "sj_chinh_thuc", label: "Đại lý chính thức", parent: "seajong", qtyKey: "agency_chinh_thuc", defAvg: 100000000 },
                                { id: "sj_le", label: "Đại lý lấy hàng lẻ", parent: "seajong", qtyKey: "agency_lay_hang", defAvg: 30000000 },
                                { id: "voriger", label: "VORIGER", isMain: true, theme: "var(--foreground)" },
                                { id: "vg_shopee", label: "Shopee", parent: "voriger" },
                                { id: "vg_b2b", label: "B2B đại lý", parent: "voriger" },
                                { id: "vg_khach_ngoai", label: "Khách ngoài", parent: "voriger" }
                              ].map((row, idx, allRows) => {
                                const avgKey = `rev_m${activeBudgetMonth}_${row.id}_avg`;
                                const totalKey = `rev_m${activeBudgetMonth}_${row.id}_total`;

                                let displayTotal = "";

                                if (row.isGrandTotal) {
                                  // Tổng cả 2 nhãn hàng
                                  const allSubRows = allRows.filter(r => !r.isMain && !r.isGrandTotal);
                                  const totalSum = allSubRows.reduce((sum, sub) => {
                                    const sQtyKey = `rev_m${activeBudgetMonth}_${sub.qtyKey}`;
                                    const sAvgKey = `rev_m${activeBudgetMonth}_${sub.id}_avg`;
                                    const q = Number((targetAudience[sQtyKey] || "0").replace(/\D/g, ""));
                                    const a = Number((targetAudience[sAvgKey] || (sub.defAvg ? sub.defAvg.toLocaleString("vi-VN") : "0")).replace(/\D/g, ""));
                                    const manualTotal = Number((targetAudience[`rev_m${activeBudgetMonth}_${sub.id}_total`] || "0").replace(/\D/g, ""));
                                    return sum + (manualTotal || (q * a));
                                  }, 0);
                                  displayTotal = totalSum ? totalSum.toLocaleString("vi-VN") : "0";
                                } else if (row.isMain) {
                                  // Tính cộng dồn cho hạng mục chính
                                  const subRows = allRows.filter(r => r.parent === row.id);
                                  const totalSum = subRows.reduce((sum, sub) => {
                                    const sQtyKey = `rev_m${activeBudgetMonth}_${sub.qtyKey}`;
                                    const sAvgKey = `rev_m${activeBudgetMonth}_${sub.id}_avg`;
                                    const q = Number((targetAudience[sQtyKey] || "0").replace(/\D/g, ""));
                                    const a = Number((targetAudience[sAvgKey] || (sub.defAvg ? sub.defAvg.toLocaleString("vi-VN") : "0")).replace(/\D/g, ""));
                                    const manualTotal = Number((targetAudience[`rev_m${activeBudgetMonth}_${sub.id}_total`] || "0").replace(/\D/g, ""));
                                    return sum + (manualTotal || (q * a));
                                  }, 0);
                                  displayTotal = totalSum ? totalSum.toLocaleString("vi-VN") : "0";
                                } else {
                                  // Tính cho hạng mục con
                                  const qtyKey = `rev_m${activeBudgetMonth}_${row.qtyKey}`;
                                  const currentAvg = targetAudience[avgKey] || (row.defAvg ? row.defAvg.toLocaleString("vi-VN") : "");
                                  const qtyVal = Number((targetAudience[qtyKey] || "0").replace(/\D/g, ""));
                                  const avgValNum = Number((currentAvg || "0").replace(/\D/g, ""));
                                  displayTotal = (qtyVal && avgValNum) ? (qtyVal * avgValNum).toLocaleString("vi-VN") : (targetAudience[totalKey] || "");
                                }

                                return (
                                  <tr key={row.id} style={{
                                    background: "transparent",
                                    transition: "background 0.2s"
                                  }} className={!row.isMain && !row.isGrandTotal ? "row-hover-effect" : ""}>
                                    <td style={{
                                      borderBottom: "1px solid var(--border)",
                                      borderRight: "1px solid var(--border)",
                                      padding: "6px 8px",
                                      textAlign: "center",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: row.isMain ? "transparent" : "var(--muted-foreground)",
                                      background: "transparent"
                                    }}>
                                      {!row.isMain && !row.isGrandTotal ? (row.id.startsWith("sj_") ? allRows.filter(r => r.parent === "seajong").indexOf(row) + 1 : allRows.filter(r => r.parent === "voriger").indexOf(row) + 5) : ""}
                                    </td>
                                    <td style={{
                                      borderBottom: "1px solid var(--border)",
                                      borderRight: "1px solid var(--border)",
                                      padding: "6px 20px",
                                      fontSize: 12,
                                      fontWeight: row.isGrandTotal ? 900 : (row.isMain ? 700 : 400),
                                      paddingLeft: row.isGrandTotal ? 12 : (row.isMain ? 20 : 36),
                                      color: row.isMain ? row.theme : "var(--foreground)",
                                      textTransform: row.isMain ? "uppercase" : "none",
                                      letterSpacing: row.isMain ? "0.1em" : "normal",
                                      background: "transparent"
                                    }}>
                                      {row.label}
                                    </td>
                                    <td style={{
                                      borderBottom: "1px solid var(--border)",
                                      borderRight: "1px solid var(--border)",
                                      padding: "2px 12px",
                                      width: "25%",
                                      background: "transparent"
                                    }}>
                                      {!row.isMain && !row.isGrandTotal && (
                                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                          {["vg_shopee", "vg_b2b", "vg_khach_ngoai"].includes(row.id) ? (
                                            <div style={{ width: "100%", fontSize: 12, fontWeight: 400, textAlign: "right", color: "var(--foreground)", opacity: 1, padding: "4px 0" }}>
                                              {(() => {
                                                const yearlyTotal = Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, m) => {
                                                  const mValStr = targetAudience[`rev_m${m}_${row.id}_total`] || "0";
                                                  return sum + Number(mValStr.replace(/\D/g, ""));
                                                }, 0);
                                                return Math.round(yearlyTotal / 12).toLocaleString("vi-VN");
                                              })()}
                                            </div>
                                          ) : (
                                            <input
                                              type="text"
                                              placeholder={row.defAvg ? row.defAvg.toLocaleString("vi-VN") : "0"}
                                              value={targetAudience[avgKey] || (row.defAvg ? row.defAvg.toLocaleString("vi-VN") : "")}
                                              onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "");
                                                const numericVal = Number(val);
                                                setTargetAudience(prev => {
                                                  const qtyValSub = Number((prev[`rev_m${activeBudgetMonth}_${row.qtyKey}`] || "0").replace(/\D/g, ""));
                                                  return {
                                                    ...prev,
                                                    [avgKey]: val ? numericVal.toLocaleString("vi-VN") : "",
                                                    [totalKey]: (val && qtyValSub) ? (numericVal * qtyValSub).toLocaleString("vi-VN") : prev[totalKey]
                                                  };
                                                });
                                              }}
                                              style={{
                                                width: "100%", border: "none", background: "transparent", outline: "none",
                                                fontSize: 12, fontWeight: 400, textAlign: "right", color: "var(--foreground)",
                                                padding: "4px 0"
                                              }}
                                            />
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{
                                      borderBottom: "1px solid var(--border)",
                                      padding: "2px 12px",
                                      width: "25%",
                                      background: row.isGrandTotal ? "transparent" : (row.isMain ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 2%, transparent)")
                                    }}>
                                      {(row.isMain || row.isGrandTotal) ? (
                                        <div style={{
                                          fontSize: row.isGrandTotal ? 12 : 11,
                                          fontWeight: 900,
                                          textAlign: "right",
                                          color: row.isGrandTotal ? "var(--foreground)" : "var(--primary)",
                                          padding: "4px 0"
                                        }}>
                                          {displayTotal}
                                        </div>
                                      ) : (
                                        <input
                                          type="text"
                                          placeholder="0"
                                          value={displayTotal}
                                          onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            setTargetAudience(prev => ({ ...prev, [totalKey]: val ? Number(val).toLocaleString("vi-VN") : "" }));
                                          }}
                                          style={{
                                            width: "100%", border: "none", background: "transparent", outline: "none",
                                            fontSize: 12, fontWeight: 500, textAlign: "right", color: "var(--primary)",
                                            padding: "4px 0"
                                          }}
                                        />
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>



        </div>

        <ConfirmDialog
          open={confirmDelPlan}
          title="Xóa kế hoạch dự thảo"
          message="Bạn có chắc chắn muốn xóa bản dự thảo này không? Dữ liệu sẽ bị mất vĩnh viễn và không thể khôi phục."
          variant="danger"
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          loading={isDeleting}
          onConfirm={executeDeletePlan}
          onCancel={() => setConfirmDelPlan(false)}
        />

        <ConfirmDialog
          open={confirmRecall}
          title="Thu hồi kế hoạch"
          message="Bạn có chắc chắn muốn thu hồi kế hoạch này để chỉnh sửa?"
          variant="warning"
          confirmLabel="Thu hồi"
          cancelLabel="Hủy"
          loading={isPublishing}
          onConfirm={executeRecallMonthlyExecution}
          onCancel={() => setConfirmRecall(false)}
        />

        <ConfirmDialog
          open={!!budgetValidationAlert}
          variant="warning"
          title={budgetValidationAlert?.title || ""}
          message={budgetValidationAlert?.message || ""}
          confirmLabel="Đã hiểu"
          onConfirm={() => setBudgetValidationAlert(null)}
          onCancel={() => setBudgetValidationAlert(null)}
        />

        <ConfirmDialog
          open={!!budgetWarn}
          variant="warning"
          title="Vượt quá tỷ lệ ngân sách"
          message={
            budgetWarn
              ? <>Tổng tỷ lệ ngân sách đang vượt quá <strong>100%</strong> (hiện tại: <strong>{budgetWarn.total}%</strong>). Bạn có muốn tiếp tục không? Hãy điều chỉnh lại tỷ lệ các tuyến cho hợp lý.</>
              : ""
          }
          confirmLabel="Vẫn áp dụng"
          cancelLabel="Huỷ"
          onConfirm={() => {
            if (budgetWarn) updatePillar(budgetWarn.pillarId, { allocation: budgetWarn.next });
            setBudgetWarn(null);
          }}
          onCancel={() => setBudgetWarn(null)}
        />

        <ConfirmDialog
          open={!!catWarn}
          variant="warning"
          title="Vượt mức ngân sách tuyến"
          message={
            catWarn
              ? <>Tổng tỷ lệ của Nội dung (<strong>{catWarn.total}%</strong>) đang vượt quá hạn mức <strong>{catWarn.limit}%</strong> của tuyến nội dung này. Vui lòng giảm bớt trước khi cập nhật.</>
              : ""
          }
          confirmLabel="Đã hiểu"
          cancelLabel="Đóng"
          onConfirm={() => setCatWarn(null)}
          onCancel={() => setCatWarn(null)}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />

        {/* ── PRINT PREVIEW MODAL ── */}
        {showPrintModal && (() => {
          const repeatHeadH1: React.CSSProperties = {
            margin: "0 0 2px 0",
            fontSize: (companyInfo?.name || "").length > 45 ? "10px" : (companyInfo?.name || "").length > 35 ? "11px" : "13px",
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            textTransform: "uppercase",
            color: "#003087",
            whiteSpace: "nowrap"
          };
          return (
            <PrintPreviewModal

              title={`In Kế hoạch Marketing ${selectedYear}`}
              subtitle={status}
              onClose={() => setShowPrintModal(false)}
              actions={
                <button
                  onClick={() => {
                    printDocumentById("print-doc");
                    setShowPrintModal(false);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #1e3a8a, #0B2447)", color: "white",
                    border: "none", padding: "6px 16px", borderRadius: 6, fontSize: 14,
                    fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  <i className="bi bi-printer-fill" /> In toàn bộ
                </button>
              }
              document={
                <>
                  {/* ── BÌA BÁO CÁO (COVER PAGE) ── */}
                  <div className="pdf-cover-page" style={{ display: "flex", flexDirection: "column" }}>
                    {/* Header (Top Left) */}
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "32px", padding: "76px 76px 0 95px" }}>
                      {companyInfo?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={companyInfo.logoUrl} alt="Logo" style={{ height: "40px", objectFit: "contain" }} />
                      ) : (
                        <div style={{ width: "40px", height: "40px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>LOGO</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{
                          margin: 0,
                          fontSize: (companyInfo?.name || "").length > 45 ? "11px" : (companyInfo?.name || "").length > 35 ? "12px" : "14px",
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          color: "#003087",
                          letterSpacing: "1px",
                          whiteSpace: "nowrap"
                        }}>{companyInfo?.name || "CÔNG TY MARKETING"}</h1>
                        <p style={{ margin: 0, fontSize: "11px", color: "#000000" }}>{companyInfo?.slogan || "Slogan công ty"}</p>
                      </div>
                    </div>


                    {/* Hero Split Area */}
                    <div style={{ display: "flex", height: "480px", position: "relative" }}>
                      {/* Left Side */}
                      <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
                        {/* Top Brand Color Section */}
                        <div style={{ flex: 1, background: "#003087", padding: "40px 0 40px 95px", color: "white", display: "flex", alignItems: "center" }}>
                          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "36px", fontWeight: 800.2, margin: 0, textTransform: "uppercase" }}>KẾ HOẠCH<br />MARKETING</h2>
                        </div>
                        {/* Bottom Blue with Clip Path */}
                        <div style={{
                          flex: 1.2,
                          background: "#000000",
                          padding: "60px 0 40px 95px",
                          color: "white",
                          clipPath: "polygon(0 0, 100% 25%, 100% 100%, 0 100%)",
                          marginTop: "-80px",
                          zIndex: 2,
                          display: "flex", alignItems: "center"
                        }}>
                          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "40px", fontWeight: 900.1, margin: 0, color: "#C9A84C" }}>
                            Năm Số Hoá<br />Và Đột Phá<br />{selectedYear}
                          </h1>
                        </div>
                      </div>
                      {/* Right Side (Image) */}
                      <div style={{ width: "45%", position: "relative" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Chiến lược" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    </div>

                    {/* Features / Details */}
                    <div style={{ flex: 1, display: "flex", gap: "40px", marginTop: "40px", padding: "0 76px 0 95px" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "28px" }}>
                        {[
                          { icon: "bi-graph-up-arrow", title: "Phát triển kinh doanh", desc: "Định vị mục tiêu dài hạn, gia tăng lợi thế cạnh tranh và hiệu quả doanh thu." },
                          { icon: "bi-lightbulb", title: "Chiến lược Marketing", desc: "Tiếp cận khách hàng mục tiêu thông qua các kênh truyền thông chiến lược." },
                          { icon: "bi-gear", title: "Quản trị khách hàng", desc: "Xây dựng tệp khách hàng trung thành, phân bổ nguồn lực vận hành tối ưu." }
                        ].map((item, idx) => (
                          <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                            <div style={{ width: "42px", height: "42px", background: "#003087", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0, clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                              <i className={`bi ${item.icon}`} />
                            </div>
                            <div>
                              <strong style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "13px", display: "block", marginBottom: "4px", color: "#000000", textTransform: "uppercase" }}>{item.title}</strong>
                              <p style={{ margin: 0, fontSize: "11px", color: "#000000", lineHeight: 1.5 }}>{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ width: "45%" }}>
                        <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "15px", color: "#003087", textTransform: "uppercase", fontWeight: 800, margin: "0 0 12px 0" }}>VỀ BẢN KẾ HOẠCH NÀY</h3>
                        <p style={{ color: "#000000", fontSize: "11px", lineHeight: 1.6, margin: "0 0 16px 0", maxWidth: "90%" }}>
                          Dữ liệu kết xuất tự động từ hệ thống quản trị, liệt kê chi tiết các chiến lược trọng tâm, phân bổ ngân sách, và lộ trình (roadmap) theo dõi KPI Marketing. Vui lòng bảo mật tài liệu và chỉ lưu hành nội bộ.
                        </p>
                        <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "14px", color: "#000000", fontWeight: 700, margin: "24px 0 8px 0" }}>THÔNG TIN BÁO CÁO</h3>
                        <ul style={{ paddingLeft: "16px", margin: "0 0 20px 0", fontSize: "11px", color: "#000000", lineHeight: 1.8 }}>
                          <li><strong>Người lập kế hoạch:</strong> {marketingStaff.find(s => s.id === session?.user?.id)?.name || session?.user?.name || "Ban Giám Đốc"}</li>
                          <li><strong>Trạng thái:</strong> {(() => {
                            const currentP = allVersions.find(v => v.id === selectedPlanId);
                            if (!currentP) return "CHƯA KHỞI TẠO";
                            const matchDoc = statusCategories.document.find(c => c.code.toLowerCase() === (currentP.versionStatus || "").toLowerCase());
                            const docLabel = matchDoc ? matchDoc.name : "";
                            const matchApproval = statusCategories.approval.find(c => c.code.toLowerCase() === (status || "").toLowerCase());
                            const approvalLabel = matchApproval ? matchApproval.name : status;
                            if (docLabel && docLabel.toUpperCase() !== "BẢN DỰ THẢO") return docLabel;
                            if (isViewingDraft) return "Đang xem bản chỉnh sửa";
                            return approvalLabel;
                          })()}</li>
                          <li><strong>Ban hành:</strong> Năm {selectedYear}</li>
                        </ul>

                      </div>
                    </div>

                    {/* Footer Strip */}
                    <div style={{ display: "flex", marginTop: "auto", background: "#003087", color: "white", padding: "24px 76px 36px 95px", position: "relative" }}>
                      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "40%", background: "#000000", clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }} />

                      <div style={{ width: "35%", position: "relative", zIndex: 2 }}>
                        <div style={{ fontSize: "10px", opacity: 0.9, color: "#C9A84C", textTransform: "uppercase", fontWeight: 700 }}>Thông tin liên hệ</div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "18px", fontWeight: 700, margin: "2px 0 0 0" }}>{companyInfo?.phone || "+84 900 123 456"}</div>
                      </div>
                      <div style={{ width: "30%", position: "relative", zIndex: 2 }}>
                        <div style={{ fontSize: "10px", opacity: 0.9 }}>Email: {companyInfo?.email || "contact@company.vn"}</div>
                        <div style={{ fontSize: "10px", opacity: 0.9, marginTop: "6px" }}>Website: {companyInfo?.website || "www.company.vn"}</div>
                      </div>
                      <div style={{ width: "35%", position: "relative", zIndex: 2, paddingLeft: "24px" }}>
                        <div style={{ fontSize: "10px", opacity: 0.9 }}>Địa chỉ: {companyInfo?.address || "Hà Nội, Việt Nam"}</div>
                      </div>
                    </div>
                  </div>

                  {/* ── NỘI DUNG BÁO CÁO (TRANG 2 TRỞ ĐI) ── */}
                  <div className="pdf-content-page">
                    <div style={{ minHeight: "970px", paddingBottom: "120px", position: "relative" }}>
                      {/* Header with Company Info (Small header) */}

                      {/* Header with Company Info (Small header) */}




                      <h2 style={{ textAlign: "center", textTransform: "uppercase", margin: "10px 0 4px", fontSize: 20, color: "#003087", fontWeight: 800, fontFamily: "'Montserrat', sans-serif" }}>
                        Kế Hoạch Marketing Năm {selectedYear}
                      </h2>
                      <p style={{ textAlign: "center", margin: "0 0 32px", color: "#000000", fontSize: 14 }}>
                        <span style={{ fontWeight: 500, color: "#003087", textTransform: "uppercase" }}>
                          {(() => {
                            const currentP = allVersions.find(v => v.id === selectedPlanId);
                            if (!currentP) return "";

                            const matchDoc = statusCategories.document.find(c => c.code.toLowerCase() === (currentP.versionStatus || "").toLowerCase());
                            const docLabel = matchDoc ? matchDoc.name : "";

                            const matchApproval = statusCategories.approval.find(c => c.code.toLowerCase() === (status || "").toLowerCase());
                            const approvalLabel = matchApproval ? matchApproval.name : status;

                            if (docLabel && docLabel.toUpperCase() !== "BẢN DỰ THẢO") return docLabel;
                            if (isViewingDraft) return "Đang xem bản chỉnh sửa";
                            return approvalLabel;
                          })()}
                        </span>
                      </p>

                      {/* 1. MỤC TIÊU */}
                      <h3 style={customSecHead}><i className="bi bi-bullseye" /> 1. Mục tiêu & Định hướng chiến lược</h3>
                      <div style={{ overflow: "hidden", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 32 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={{ ...printStyles.bodyCell, width: "30%", textAlign: "left", background: "#003087", color: "white", border: "none" }}>Mục tiêu trọng tâm</th>
                              <th style={{ ...printStyles.bodyCell, textAlign: "left", background: "#003087", color: "white", border: "none" }}>Chi tiết / Chỉ tiêu KPI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {goalsList.map((g, idx) => (
                              <tr key={g.id} style={{ background: idx % 2 === 1 ? "#f8fafc" : "transparent" }}>
                                <td style={{ ...printStyles.bodyCell, fontWeight: 700, color: "#000000", border: "none", borderBottom: "1px solid #f1f5f9" }}>{g.label}</td>
                                <td style={{ ...printStyles.bodyCell, border: "none", borderBottom: "1px solid #f1f5f9", color: "#000000" }}>{g.description || g.placeholder}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ marginTop: 32 }}></div>
                      {/* 2. WBS */}

                      <h3 style={customSecHead}><i className="bi bi-diagram-3" /> 2. Cấu trúc công việc & Phân bổ (WBS)</h3>
                      <div style={{ overflow: "hidden", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 32 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={{ ...printStyles.bodyCell, textAlign: "left", background: "#003087", color: "white", border: "none" }}>Hạng mục triển khai & Phụ trách chính</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasksList.length > 0 ? renderPrintTasksTree(tasksList) : (
                              <tr><td colSpan={1} style={{ borderBottom: "1px solid var(--border)", ...printStyles.bodyCell, textAlign: "center", color: "#000000" }}>Chưa có nội dung hạng mục</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                    </div>

                    {/* Footer Page 3 */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "85px", background: "white", padding: "10px 76px 40px 95px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748b", zIndex: 100 }}>
                      <div style={{ flex: 1, borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                        <span>{companyInfo?.name || "EOS Master"} - Kế hoạch Marketing {selectedYear}</span>
                        <span style={{ fontWeight: 700 }}>Trang 3</span>
                      </div>
                    </div>
                  </div>



                  {/* ── TRANG NỘI DUNG 3 (NGÂN SÁCH & KHÁCH HÀNG) ── */}
                  <div className="pdf-content-page">
                    <div style={{ minHeight: "970px", paddingBottom: "120px", position: "relative" }}>
                      {/* Header Repeat */}



                      {/* 3. NGÂN SÁCH & KÊNH */}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "40px", marginBottom: "32px" }}>
                        <div style={{ background: "linear-gradient(135deg, #003087, #0B2447)", padding: "24px", borderRadius: 16, color: "white", boxShadow: "0 8px 16px rgba(0,48,135,0.15)", position: "relative", overflow: "hidden", breakInside: "avoid", pageBreakInside: "avoid" }}>
                          <div style={{ position: "relative", zIndex: 2 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                              <i className="bi bi-cash-coin" style={{ fontSize: 18, color: "#C9A84C" }} />
                              <h3 style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, fontFamily: "'Montserrat', sans-serif", opacity: 0.9 }}>Tổng ngân sách dự kiến</h3>
                            </div>
                            <div style={{ color: "#C9A84C", marginBottom: 20, display: "flex", alignItems: "baseline", gap: 4 }}>
                              {(() => {
                                const val = targetAudience['budget_val_mkt_total'];
                                const displayVal = (val && val !== "0") ? val : "0";
                                return (
                                  <>
                                    <span style={{ fontSize: "22px", fontWeight: 900 }}>{displayVal}</span>
                                    <span style={{ fontSize: "12px", fontWeight: 700, opacity: 1 }}>VNĐ</span>
                                  </>
                                );
                              })()}
                            </div>

                            {/* Biểu đồ tròn đơn giản */}
                            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 24, padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 12 }}>
                              <div style={{
                                width: 60,
                                height: 60,
                                borderRadius: "50%",
                                background: pillars.length > 0 ? `conic-gradient(${(() => {
                                  let curr = 0;
                                  return pillars.map(p => {
                                    const start = curr;
                                    const end = curr + (p.allocation || 0);
                                    curr = end;
                                    return `${p.color || "#C9A84C"} ${start}% ${end}%`;
                                  }).join(", ") + (curr < 100 ? `, rgba(255,255,255,0.1) ${curr}% 100%` : "");
                                })()})` : "rgba(255,255,255,0.1)",
                                flexShrink: 0,
                                boxShadow: "0 0 10px rgba(0,0,0,0.2)"
                              }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#C9A84C" }}>PHÂN BỔ THEO TUYẾN:</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  {pillars.slice(0, 3).map(p => (
                                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                                      <span style={{ opacity: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100px" }}>{p.name || "N/A"}</span>
                                      <span style={{ fontWeight: 700 }}>{p.allocation || 0}%</span>
                                    </div>
                                  ))}
                                  {pillars.length > 3 && <div style={{ fontSize: 9, opacity: 0.5 }}>và {pillars.length - 3} tuyến khác...</div>}
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Decorative Background Icon */}
                          <i className="bi bi-graph-up-arrow" style={{ position: "absolute", right: -10, bottom: -10, fontSize: 110, opacity: 0.05, color: "white" }} />
                        </div>

                        <div style={{ background: "#fff", padding: "24px", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16 }}>
                            <i className="bi bi-broadcast-pin" style={{ fontSize: 20, color: "#dc2626" }} />
                            <h3 style={{ margin: 0, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "#000000", fontFamily: "'Montserrat', sans-serif" }}>Kênh truyền thông</h3>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {selectedPlatforms.length > 0 ? selectedPlatforms.map(p => {
                              const iconMap: { [key: string]: string } = {
                                "Facebook": "bi-facebook",
                                "Instagram": "bi-instagram",
                                "Tiktok": "bi-tiktok",
                                "Youtube": "bi-youtube",
                                "Website": "bi-globe",
                                "Zalo": "bi-chat-dots-fill",
                                "Truyền thông": "bi-megaphone",
                                "Email": "bi-envelope"
                              };
                              const icon = iconMap[p] || "bi-broadcast";
                              return (
                                <span key={p} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#f1f5f9", color: "#003087", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                  <i className={`bi ${icon}`} style={{ fontSize: 13 }} />
                                  {p}
                                </span>
                              );
                            }) : <span style={{ color: "#000000", fontStyle: "italic" }}>Chưa xác định</span>}
                          </div>
                        </div>
                      </div>

                      {/* 4. KHÁCH HÀNG MỤC TIÊU */}
                      <h3 style={customSecHead}><i className="bi bi-person-check" /> 3. Đối tượng khách hàng trọng tâm</h3>
                      <div style={{ background: "#f8fafc", padding: "24px", borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: "32px" }}>
                        {(() => {
                          const validKeys = Object.keys(targetAudience).filter(k => !k.startsWith("budget_") && !k.startsWith("rev_"));
                          if (validKeys.length === 0) return <p style={{ color: "#000000", fontSize: "13px", margin: 0, textAlign: "center" }}>Chưa có số liệu khách hàng mục tiêu</p>;

                          return (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                              {validKeys.map((k, idx) => (
                                <div key={k} style={{
                                  display: "flex",
                                  gap: 14,
                                  alignItems: "flex-start",
                                  background: "white",
                                  padding: 16,
                                  borderRadius: 12,
                                  border: "1px solid #f1f5f9",
                                  gridColumn: (idx === validKeys.length - 1 && validKeys.length % 2 !== 0) ? "1 / span 2" : "auto"
                                }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,48,135,0.1)", color: "#003087", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <i className="bi bi-check-lg" style={{ fontSize: 14, fontWeight: "bold" }} />
                                  </div>
                                  <div>
                                    <strong style={{ color: "#000000", display: "block", marginBottom: 4, fontSize: 14 }}>{k}</strong>
                                    <p style={{ color: "#000000", margin: 0, fontSize: 13, lineHeight: 1.5 }}>{targetAudience[k] || "..."}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Footer Page 4 */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "85px", background: "white", padding: "10px 76px 40px 95px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748b", zIndex: 100 }}>
                      <div style={{ flex: 1, borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                        <span>{companyInfo?.name || "EOS Master"} - Kế hoạch Marketing {selectedYear}</span>
                        <span style={{ fontWeight: 700 }}>Trang 4</span>
                      </div>
                    </div>
                  </div>


                  {/* ── TRANG NỘI DUNG 4+ (CHIẾN LƯỢC NỘI DUNG - PAGINATED) ── */}
                  {pillars.map((p, pIdx) => (
                    <div key={p.id} className="pdf-content-page">
                      <div style={{ minHeight: "970px", paddingBottom: "120px", position: "relative" }}>
                        {/* Header Repeat */}



                        <h3 style={customSecHead}>
                          <i className="bi bi-layers" /> 4. Chiến lược & Tuyến nội dung {pillars.length > 1 ? `(${pIdx + 1}/${pillars.length})` : ""}
                        </h3>


                        <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", background: "white" }}>
                          <div style={{ background: "#f8fafc", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: 15, color: "#003087", display: "block", textTransform: "uppercase", marginBottom: 2 }}>
                                {p.name || "Tuyến nội dung mới"} {p.allocation ? `(${p.allocation}%)` : ""}
                              </strong>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <span style={{ fontSize: 12, color: "#000000", opacity: 0.8 }}><strong style={{ color: "#003087" }}>Mục tiêu:</strong> {p.goal || "Chưa xác định"}</span>
                                <span style={{ fontSize: 12, color: "#000000", opacity: 0.8 }}><strong style={{ color: "#003087" }}>Vai trò:</strong> {p.role || "Chưa xác định"}</span>
                                <span style={{ fontSize: 12, color: "#000000", opacity: 0.8 }}><strong style={{ color: "#003087" }}>Chiến lược nội dung:</strong> {p.description || "Chưa xác định"}</span>
                              </div>
                            </div>
                            <div style={{ textAlign: "right", minWidth: 160 }}>
                              {(() => {
                                const totalBudgetNum = Number((targetAudience['budget_val_mkt_total'] || "0").toString().replace(/\D/g, ""));
                                const amount = (totalBudgetNum * (p.allocation || 0)) / 100;
                                return (
                                  <>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: "#003087" }}>{amount.toLocaleString("vi-VN")} VNĐ</div>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: "#003087", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ngân sách dự kiến</div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          {p.categories && p.categories.length > 0 && (
                            <div style={{ padding: "0 20px 20px" }}>
                              {p.categories.map(cat => (
                                <div key={cat.id} style={{ marginTop: 20, padding: 16, background: "#f8fafc", borderRadius: 12 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, borderBottom: "1px dashed #cbd5e1", paddingBottom: 8 }}>
                                    <strong style={{ fontSize: 13, lineHeight: 1.5, color: "#000000", textTransform: "uppercase" }}>
                                      {cat.name || "Chủ mục"} ({cat.allocation || 0}%)
                                    </strong>
                                    <div style={{ textAlign: "right" }}>
                                      {(() => {
                                        const totalBudgetNum = Number((targetAudience['budget_val_mkt_total'] || "0").toString().replace(/\D/g, ""));
                                        const amount = (totalBudgetNum * (cat.allocation || 0)) / 100;
                                        return <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444", marginBottom: 2 }}>{amount.toLocaleString("vi-VN")} VNĐ</div>;
                                      })()}
                                      <div style={{ fontSize: 10, fontWeight: 600, color: "#000000", opacity: 0.6 }}>{cat.postsPerMonth || 0} bài</div>
                                    </div>
                                  </div>
                                  {cat.description && (
                                    <div style={{ fontSize: 13, color: "#000000", opacity: 0.85, whiteSpace: "pre-wrap", marginBottom: 12, lineHeight: 1.6 }}>
                                      {cat.description}
                                    </div>
                                  )}
                                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#000000", lineHeight: 1.8 }}>
                                    {cat.topics.map(t => (
                                      <li key={t.id}>{t.name}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Paginated Pillars (Trang 5+) */}
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "85px", background: "white", padding: "10px 76px 40px 95px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748b", zIndex: 100 }}>
                        <div style={{ flex: 1, borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                          <span>Chiến lược: {p.name}</span>
                          <span style={{ fontWeight: 700 }}>Trang {5 + pIdx}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* ── TRANG NỘI DUNG 4 (NGÂN SÁCH CHI TIẾT) ── */}
                  <div className="pdf-content-page">
                    <div style={{ minHeight: "970px", paddingBottom: "120px", position: "relative" }}>
                      {/* Header Repeat */}



                      {/* 5. PHÂN BỔ NGÂN SÁCH */}
                      <h3 style={customSecHead}><i className="bi bi-cash-stack" /> 5. Phân bổ ngân sách Marketing năm</h3>

                      <div style={{ overflow: "hidden", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 32 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#003087", color: "white" }}>
                              <th style={{ ...printStyles.bodyCell, width: "50px", textAlign: "center", border: "none" }}>STT</th>
                              <th style={{ ...printStyles.bodyCell, textAlign: "left", border: "none" }}>Hạng mục - Công việc</th>
                              <th style={{ ...printStyles.bodyCell, width: "100px", textAlign: "center", border: "none" }}>Tỷ lệ (%)</th>
                              <th style={{ ...printStyles.bodyCell, width: "180px", textAlign: "right", border: "none" }}>Giá trị (VNĐ)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { id: "rev_goal", label: "MỤC TIÊU DOANH THU", isBold: true },
                              { id: "mkt_total", label: "TỔNG NGÂN SÁCH MARKETING", isBold: true },
                              { id: "agency", label: "NGÂN SÁCH CHO CÁC ĐẠI LÝ", subRows: agencySubRows },
                              { id: "branding", label: "NGÂN SÁCH CHO BRANDING", subRows: brandingSubRows }
                            ].map((item, idx) => (
                              <React.Fragment key={item.id}>
                                <tr style={{ background: item.id === "mkt_total" ? "rgba(201,168,76,0.1)" : "transparent", borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ ...printStyles.bodyCell, textAlign: "center", border: "none" }}>{idx + 1}</td>
                                  <td style={{ ...printStyles.bodyCell, fontWeight: item.isBold || (item.subRows && item.subRows.length > 0) ? 800 : 500, fontSize: 12, lineHeight: 1.5, border: "none" }}>{item.label}</td>
                                  <td style={{ ...printStyles.bodyCell, textAlign: "center", fontWeight: 700, border: "none" }}>{targetAudience[`budget_rate_${item.id}`] || "---"}</td>
                                  <td style={{ ...printStyles.bodyCell, textAlign: "right", fontWeight: 800, color: item.id === "mkt_total" ? "#003087" : "#000000", border: "none" }}>{targetAudience[`budget_val_${item.id}`] || "0"}</td>
                                </tr>
                                {item.subRows && item.subRows.map((sub, sIdx) => (
                                  <tr key={sub.id} style={{ borderBottom: "1px solid #f1f5f9", fontSize: 11, lineHeight: 1.5, color: "#000000" }}>
                                    <td style={{ ...printStyles.bodyCell, textAlign: "center", border: "none", opacity: 1 }}>{idx + 1}.{sIdx + 1}</td>
                                    <td style={{ ...printStyles.bodyCell, paddingLeft: 30, border: "none" }}>{sub.label}</td>
                                    <td style={{ ...printStyles.bodyCell, textAlign: "center", border: "none" }}>{targetAudience[`budget_rate_${sub.id}`] || "0"}</td>
                                    <td style={{ ...printStyles.bodyCell, textAlign: "right", border: "none" }}>{targetAudience[`budget_val_${sub.id}`] || "0"}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Biểu đồ phân bổ ngân sách theo tháng */}
                      <div style={{ background: "#f8fafc", padding: "24px", borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 32, breakInside: "avoid", pageBreakInside: "avoid" }}>
                        <h4 style={{ margin: "0 0 36px", fontSize: 13, color: "#000000", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>Phân bổ ngân sách Marketing theo tháng</h4>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, paddingBottom: 30, borderBottom: "1px solid #e2e8f0", position: "relative" }}>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                            const mVal = Number((targetAudience[`budget_m${m}_monthly_total`] || "0").replace(/\D/g, ""));
                            const maxVal = Math.max(...Array.from({ length: 12 }, (_, j) => j + 1).map(j => Number((targetAudience[`budget_m${j}_monthly_total`] || "0").replace(/\D/g, "")))) || 1;
                            const heightPercent = (mVal / maxVal) * 100;
                            const barHeight = Math.max(heightPercent, 2);

                            return (
                              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                                <div style={{ position: "relative", width: "100%", height: `${barHeight}%`, background: "linear-gradient(to top, #003087, #0056D2)", borderRadius: "4px 4px 0 0", minWidth: 20 }}>
                                  {mVal > 0 && (
                                    <span style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 800, color: "#003087", whiteSpace: "nowrap" }}>
                                      {mVal >= 1000000 ? (mVal / 1000000).toFixed(0) + "M" : (mVal / 1000).toFixed(0) + "K"}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#000000" }}>T{m}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "#000000", fontStyle: "italic" }}>* Đơn vị: VNĐ (M: Triệu, K: Ngàn)</span>
                        </div>
                      </div>

                      {/* BẢNG CHI TIẾT NGÂN SÁCH HÀNG THÁNG */}
                      <div style={{ marginBottom: 32, breakInside: "avoid", pageBreakInside: "avoid" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: "#64748b", fontStyle: "italic", fontWeight: 500 }}>Đơn vị tính: Triệu VNĐ</span>
                        </div>
                        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
                            <thead>
                              <tr style={{ background: "#003087" }}>
                                <th style={{ padding: "8px 10px", color: "white", textAlign: "left", fontWeight: 700, border: "1px solid #002566" }}>Hạng mục \ Tháng</th>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                  <th key={m} style={{ padding: "8px 2px", color: "white", textAlign: "center", fontWeight: 700, border: "1px solid #002566", width: "7%" }}>T{m}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {/* Dòng Tổng cộng tháng */}
                              <tr style={{ background: "rgba(0,48,135,0.05)" }}>
                                <td style={{ padding: "8px 10px", fontWeight: 800, color: "#003087", border: "1px solid #e2e8f0" }}>TỔNG NGÂN SÁCH THÁNG</td>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                                  const val = Number((targetAudience[`budget_m${m}_monthly_total`] || "0").replace(/\D/g, ""));
                                  return (
                                    <td key={m} style={{ padding: "8px 2px", textAlign: "center", fontWeight: 800, color: "#003087", border: "1px solid #e2e8f0" }}>
                                      {val > 0 ? (val / 1000000).toFixed(1) : "-"}
                                    </td>
                                  );
                                })}
                              </tr>
                              {/* Các hạng mục con */}
                              {[...agencySubRows, ...brandingSubRows].map((sub, idx) => (
                                <tr key={sub.id} style={{ background: idx % 2 === 0 ? "white" : "#f8fafc" }}>
                                  <td style={{ padding: "6px 10px", color: "#000000", border: "1px solid #e2e8f0" }}>{sub.label || "Hạng mục " + (idx + 1)}</td>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                                    const val = Number((targetAudience[`budget_m${m}_val_${sub.id}`] || "0").replace(/\D/g, ""));
                                    return (
                                      <td key={m} style={{ padding: "6px 2px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                                        {val > 0 ? (val / 1000000).toFixed(1) : "-"}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Footer Budget Detail */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "85px", background: "white", padding: "10px 76px 40px 95px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748b", zIndex: 100 }}>
                      <div style={{ flex: 1, borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                        <span>Phân bổ ngân sách chi tiết</span>
                        <span style={{ fontWeight: 700 }}>Trang {4 + pillars.length + 1}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── TRANG NỘI DUNG 5 (DỰ BÁO DOANH THU) ── */}
                  <div className="pdf-content-page">
                    <div style={{ minHeight: "970px", paddingBottom: "120px", position: "relative" }}>
                      {/* Header Repeat */}



                      {/* 6. DỰ BÁO DOANH THU */}
                      <h3 style={customSecHead}><i className="bi bi-graph-up-arrow" /> 6. Dự báo Doanh thu & Phát triển hệ thống</h3>

                      <div style={{ background: "white", padding: "30px", borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 32 }}>
                        {/* Phần 1: Phát triển đại lý */}
                        <div>
                          <h4 style={{ margin: "0 0 20px", fontSize: 14, color: "#000000", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Phát triển đại lý & Quy mô hệ thống</h4>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                            {[
                              { key: "agency_ke", label: "Lắp kệ trưng bày" },
                              { key: "agency_chinh_thuc", label: "Đại lý chính thức" },
                              { key: "agency_lay_hang", label: "Đại lý lấy lẻ" }
                            ].map(item => {
                              const total = Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, m) => {
                                const val = (targetAudience[`rev_m${m}_${item.key}`] || "0").replace(/\D/g, "");
                                return sum + Number(val);
                              }, 0);
                              return (
                                <div key={item.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "rgba(0,48,135,0.02)", padding: "12px 10px", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                                  <span style={{ fontSize: 12, color: "#000000", fontWeight: 500 }}>{item.label}</span>
                                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                                    <span style={{ fontSize: 24, fontWeight: 900, color: "#003087" }}>{total}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#003087", opacity: 1 }}>ĐL</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ height: "1px", background: "#f1f5f9", margin: "32px 0" }}></div>

                        {/* Phần 2: Doanh thu dự báo */}
                        <div>
                          <h4 style={{ margin: "0 0 20px", fontSize: 14, color: "#000000", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Dự báo doanh thu tổng hợp năm</h4>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              {[
                                {
                                  id: "seajong", label: "CHIẾN LƯỢC SEAJONG", color: "#003087",
                                  defRows: [
                                    { id: "sj_ke", qk: "agency_ke", d: 200000000, label: "Hệ thống lắp kệ trưng bày" },
                                    { id: "sj_chinh_thuc", qk: "agency_chinh_thuc", d: 100000000, label: "Đại lý chính thức" },
                                    { id: "sj_lay_hang", qk: "agency_lay_hang", d: 30000000, label: "Đại lý lấy lẻ" }
                                  ]
                                },
                                {
                                  id: "voriger", label: "CHIẾN LƯỢC VORIGER", color: "#000000",
                                  defRows: [
                                    { id: "vg_shopee", qk: "", d: 0, label: "Kênh thương mại điện tử (Shopee)" },
                                    { id: "vg_b2b", qk: "", d: 0, label: "Kênh dự án B2B" },
                                    { id: "vg_khach_ngoai", qk: "", d: 0, label: "Khách lẻ & Vãng lai" }
                                  ]
                                }
                              ].map(brand => {
                                const brandTotal = Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, m) => {
                                  return sum + brand.defRows.reduce((sSum, r) => {
                                    const q = r.qk ? Number((targetAudience[`rev_m${m}_${r.qk}`] || "0").replace(/\D/g, "")) : 0;
                                    const a = r.d ? Number((targetAudience[`rev_m${m}_${r.id}_avg`] || r.d.toLocaleString("vi-VN")).replace(/\D/g, "")) : 0;
                                    const t = Number((targetAudience[`rev_m${m}_${r.id}_total`] || "0").replace(/\D/g, ""));
                                    return sSum + (t || (q * a));
                                  }, 0);
                                }, 0);

                                return (
                                  <React.Fragment key={brand.id}>
                                    <tr style={{ background: "rgba(0,48,135,0.02)" }}>
                                      <td style={{ padding: "4px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 14, fontWeight: 800, color: brand.color }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: brand.color }}></div>
                                          {brand.label}
                                        </div>
                                      </td>
                                      <td style={{ padding: "4px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontSize: 16, fontWeight: 800 }}>
                                        {brandTotal.toLocaleString("vi-VN")} <span style={{ fontSize: 11, fontWeight: 400, color: "#000000" }}>VNĐ</span>
                                      </td>
                                    </tr>
                                    {brand.defRows.map(row => {
                                      const rowTotal = Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, m) => {
                                        const q = row.qk ? Number((targetAudience[`rev_m${m}_${row.qk}`] || "0").replace(/\D/g, "")) : 0;
                                        const a = row.d ? Number((targetAudience[`rev_m${m}_${row.id}_avg`] || row.d.toLocaleString("vi-VN")).replace(/\D/g, "")) : 0;
                                        const t = Number((targetAudience[`rev_m${m}_${row.id}_total`] || "0").replace(/\D/g, ""));
                                        return sum + (t || (q * a));
                                      }, 0);
                                      return (
                                        <tr key={row.id}>
                                          <td style={{ padding: "2px 12px 2px 32px", borderBottom: "1px solid #f8fafc", fontSize: 12, color: "#000000", fontWeight: 500 }}>
                                            {row.label}
                                          </td>
                                          <td style={{ padding: "2px 12px", borderBottom: "1px solid #f8fafc", textAlign: "right", fontSize: 12, color: "#000000", fontWeight: 500 }}>
                                            {rowTotal.toLocaleString("vi-VN")} <span style={{ fontSize: 10, opacity: 1 }}>VNĐ</span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              })}
                              <tr>
                                <td colSpan={2} style={{ padding: "24px 0 0" }}>
                                  <div style={{ background: "linear-gradient(90deg, #003087, #0B2447)", padding: "20px 24px", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", color: "white", boxShadow: "0 4px 12px rgba(0,48,135,0.15)" }}>
                                    <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.05em" }}>TỔNG DOANH THU MỤC TIÊU NĂM</span>
                                    <div style={{ textAlign: "right" }}>
                                      <span style={{ fontSize: 26, fontWeight: 900 }}>
                                        {(() => {
                                          const sjRows = [{ id: "sj_chinh_thuc", qk: "agency_chinh_thuc", d: 100000000 }, { id: "sj_ke", qk: "agency_ke", d: 200000000 }, { id: "sj_lay_hang", qk: "agency_lay_hang", d: 30000000 }];
                                          const vgRows = [{ id: "vg_shopee" }, { id: "vg_b2b" }, { id: "vg_khach_ngoai" }];
                                          const gTotal = Array.from({ length: 12 }, (_, i) => i + 1).reduce((grand, m) => {
                                            const sjMonth = sjRows.reduce((s, r) => {
                                              const q = Number((targetAudience[`rev_m${m}_${r.qk}`] || "0").replace(/\D/g, ""));
                                              const a = Number((targetAudience[`rev_m${m}_${r.id}_avg`] || r.d.toLocaleString("vi-VN")).replace(/\D/g, ""));
                                              const t = Number((targetAudience[`rev_m${m}_${r.id}_total`] || "0").replace(/\D/g, ""));
                                              return s + (t || (q * a));
                                            }, 0);
                                            const vgMonth = vgRows.reduce((s, r) => {
                                              const t = Number((targetAudience[`rev_m${m}_${r.id}_total`] || "0").replace(/\D/g, ""));
                                              return s + t;
                                            }, 0);
                                            return grand + sjMonth + vgMonth;
                                          }, 0);
                                          return gTotal.toLocaleString("vi-VN");
                                        })()}
                                      </span>
                                      <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 8, opacity: 1 }}>VNĐ</span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Biểu đồ mục tiêu doanh thu theo tháng */}
                          <div style={{ marginTop: 40, borderTop: "1px dashed #e2e8f0", paddingTop: 32, breakInside: "avoid", pageBreakInside: "avoid" }}>
                            <h4 style={{ margin: "0 0 36px", fontSize: 13, color: "#000000", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>Biểu đồ mục tiêu doanh thu chi tiết theo tháng</h4>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 160, paddingBottom: 30, borderBottom: "1px solid #e2e8f0", position: "relative" }}>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                                const sjRows = [{ id: "sj_chinh_thuc", qk: "agency_chinh_thuc", d: 100000000 }, { id: "sj_ke", qk: "agency_ke", d: 200000000 }, { id: "sj_lay_hang", qk: "agency_lay_hang", d: 30000000 }];
                                const vgRows = [{ id: "vg_shopee" }, { id: "vg_b2b" }, { id: "vg_khach_ngoai" }];

                                const sjMonth = sjRows.reduce((s, r) => {
                                  const q = Number((targetAudience[`rev_m${m}_${r.qk}`] || "0").replace(/\D/g, ""));
                                  const a = Number((targetAudience[`rev_m${m}_${r.id}_avg`] || r.d.toLocaleString("vi-VN")).replace(/\D/g, ""));
                                  const t = Number((targetAudience[`rev_m${m}_${r.id}_total`] || "0").replace(/\D/g, ""));
                                  return s + (t || (q * a));
                                }, 0);
                                const vgMonth = vgRows.reduce((s, r) => {
                                  const t = Number((targetAudience[`rev_m${m}_${r.id}_total`] || "0").replace(/\D/g, ""));
                                  return s + t;
                                }, 0);

                                const mTotal = sjMonth + vgMonth;
                                const allTotals = Array.from({ length: 12 }, (_, j) => j + 1).map(jm => {
                                  const sjM = sjRows.reduce((s, r) => {
                                    const q = Number((targetAudience[`rev_m${jm}_${r.qk}`] || "0").replace(/\D/g, ""));
                                    const a = Number((targetAudience[`rev_m${jm}_${r.id}_avg`] || r.d.toLocaleString("vi-VN")).replace(/\D/g, ""));
                                    const t = Number((targetAudience[`rev_m${jm}_${r.id}_total`] || "0").replace(/\D/g, ""));
                                    return s + (t || (q * a));
                                  }, 0);
                                  const vgM = vgRows.reduce((s, r) => { const t = Number((targetAudience[`rev_m${jm}_${r.id}_total`] || "0").replace(/\D/g, "")); return s + t; }, 0);
                                  return sjM + vgM;
                                });
                                const maxVal = Math.max(...allTotals) || 1;
                                const heightPercent = (mTotal / maxVal) * 100;
                                const barHeight = Math.max(heightPercent, 2);

                                return (
                                  <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                                    <div style={{ position: "relative", width: "100%", height: `${barHeight}%`, background: "linear-gradient(to top, #C9A84C, #E5C76B)", borderRadius: "4px 4px 0 0", minWidth: 20 }}>
                                      {mTotal > 0 && (
                                        <span style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 800, color: "#000000", whiteSpace: "nowrap" }}>
                                          {(mTotal / 1000000).toFixed(0)}M
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#000000" }}>T{m}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "#000000", fontStyle: "italic" }}>* Đơn vị: VNĐ (M: Triệu)</span>
                            </div>
                          </div>

                          {/* BẢNG CHI TIẾT DOANH THU HÀNG THÁNG */}
                          <div style={{ marginTop: 32, breakInside: "avoid", pageBreakInside: "avoid" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                              <span style={{ fontSize: 10, color: "#64748b", fontStyle: "italic", fontWeight: 500 }}>Đơn vị tính: Triệu VNĐ</span>
                            </div>
                            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
                                <thead>
                                  <tr style={{ background: "#003087" }}>
                                    <th style={{ padding: "8px 10px", color: "white", textAlign: "left", fontWeight: 700, border: "1px solid #002566" }}>Chi tiêu \ Tháng</th>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                      <th key={m} style={{ padding: "8px 2px", color: "white", textAlign: "center", fontWeight: 700, border: "1px solid #002566", width: "7.2%" }}>T{m}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Dòng Tổng cộng tháng */}
                                  <tr style={{ background: "rgba(0,48,135,0.05)" }}>
                                    <td style={{ padding: "8px 10px", fontWeight: 800, color: "#003087", border: "1px solid #e2e8f0" }}>TỔNG DOANH THU THÁNG</td>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                                      const sjRows = [{ id: "sj_chinh_thuc", qk: "agency_chinh_thuc", d: 100000000 }, { id: "sj_ke", qk: "agency_ke", d: 200000000 }, { id: "sj_lay_hang", qk: "agency_lay_hang", d: 30000000 }];
                                      const vgRows = [{ id: "vg_shopee" }, { id: "vg_b2b" }, { id: "vg_khach_ngoai" }];

                                      const sjMonth = sjRows.reduce((s, r) => {
                                        const q = Number((targetAudience[`rev_m${m}_${r.qk}`] || "0").replace(/\D/g, ""));
                                        const a = Number((targetAudience[`rev_m${m}_${r.id}_avg`] || r.d.toLocaleString("vi-VN")).replace(/\D/g, ""));
                                        const t = Number((targetAudience[`rev_m${m}_${r.id}_total`] || "0").replace(/\D/g, ""));
                                        return s + (t || (q * a));
                                      }, 0);
                                      const vgMonth = vgRows.reduce((s, r) => {
                                        const t = Number((targetAudience[`rev_m${m}_${r.id}_total`] || "0").replace(/\D/g, ""));
                                        return s + t;
                                      }, 0);
                                      const total = sjMonth + vgMonth;
                                      return (
                                        <td key={m} style={{ padding: "8px 2px", textAlign: "center", fontWeight: 800, color: "#003087", border: "1px solid #e2e8f0" }}>
                                          {total > 0 ? (total / 1000000).toFixed(1) : "-"}
                                        </td>
                                      );
                                    })}
                                  </tr>

                                  {/* SEAJONG */}
                                  <tr style={{ background: "#f1f5f9" }}>
                                    <td colSpan={13} style={{ padding: "6px 10px", fontWeight: 700, color: "#003087", border: "1px solid #e2e8f0", textTransform: "uppercase", fontSize: "8px" }}>Chiến lược Seajong</td>
                                  </tr>
                                  {[
                                    { id: "sj_ke", qk: "agency_ke", d: 200000000, label: "Hệ thống lắp kệ trưng bày" },
                                    { id: "sj_chinh_thuc", qk: "agency_chinh_thuc", d: 100000000, label: "Đại lý chính thức" },
                                    { id: "sj_lay_hang", qk: "agency_lay_hang", d: 30000000, label: "Đại lý lấy lẻ" }
                                  ].map((row, idx) => (
                                    <tr key={row.id} style={{ background: "white" }}>
                                      <td style={{ padding: "6px 10px", color: "#000000", border: "1px solid #e2e8f0", paddingLeft: "20px" }}>{row.label}</td>
                                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                                        const q = Number((targetAudience[`rev_m${m}_${row.qk}`] || "0").replace(/\D/g, ""));
                                        const a = Number((targetAudience[`rev_m${m}_${row.id}_avg`] || row.d.toLocaleString("vi-VN")).replace(/\D/g, ""));
                                        const t = Number((targetAudience[`rev_m${m}_${row.id}_total`] || "0").replace(/\D/g, ""));
                                        const val = t || (q * a);
                                        return (
                                          <td key={m} style={{ padding: "6px 2px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                                            {val > 0 ? (val / 1000000).toFixed(1) : "-"}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}

                                  {/* VORIGER */}
                                  <tr style={{ background: "#f1f5f9" }}>
                                    <td colSpan={13} style={{ padding: "6px 10px", fontWeight: 700, color: "#000000", border: "1px solid #e2e8f0", textTransform: "uppercase", fontSize: "8px" }}>Chiến lược Voriger</td>
                                  </tr>
                                  {[
                                    { id: "vg_shopee", label: "Kênh thương mại điện tử (Shopee)" },
                                    { id: "vg_b2b", label: "Kênh dự án B2B" },
                                    { id: "vg_khach_ngoai", label: "Khách lẻ & Vãng lai" }
                                  ].map((row, idx) => (
                                    <tr key={row.id} style={{ background: "white" }}>
                                      <td style={{ padding: "6px 10px", color: "#000000", border: "1px solid #e2e8f0", paddingLeft: "20px" }}>{row.label}</td>
                                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                                        const val = Number((targetAudience[`rev_m${m}_${row.id}_total`] || "0").replace(/\D/g, ""));
                                        return (
                                          <td key={m} style={{ padding: "6px 2px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                                            {val > 0 ? (val / 1000000).toFixed(1) : "-"}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* Phần 3: Ghi chú */}
                        {targetAudience.rev_annual_note && (
                          <div style={{ marginTop: 32, padding: "20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#000000", textTransform: "uppercase", display: "block", marginBottom: 8, letterSpacing: "0.02em" }}>Ghi chú chiến lược & Định hướng mục tiêu:</span>
                            <p style={{ margin: 0, fontSize: 14, color: "#000000", fontStyle: "italic", lineHeight: 1.6 }}>{targetAudience.rev_annual_note}</p>
                          </div>
                        )}
                      </div>

                    </div>


                    {/* Footer Page 5 */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "85px", background: "white", padding: "10px 76px 40px 95px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748b", zIndex: 100 }}>
                      <div style={{ flex: 1, borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                        <span>Dự báo doanh thu năm {selectedYear}</span>
                        <span style={{ fontWeight: 700 }}>Trang {4 + pillars.length + 2}</span>
                      </div>
                    </div>
                  </div>
                </>
              }
            />
          );
        })()}

      </div>

      <ConfirmDialog
        open={!!deleteTaskConfirm}
        variant="danger"
        title={`Xoá công việc này?`}
        message={
          <>
            Công việc <strong style={{ color: "var(--foreground)" }}>"{deleteTaskConfirm?.name}"</strong> có chứa các công việc con bên trong.
            Việc này sẽ xoá <strong style={{ color: "#ef4444" }}>toàn bộ</strong> các công việc con này. Bạn có chắc chắn?
          </>
        }
        confirmLabel="Xoá tất cả"
        onConfirm={() => {
          if (deleteTaskConfirm) executeDelete(deleteTaskConfirm.id);
        }}
        onCancel={() => setDeleteTaskConfirm(null)}
      />

      <Offcanvas
        isOpen={isSubtaskOffcanvasOpen}
        onClose={() => setIsSubtaskOffcanvasOpen(false)}
        title={newSubtaskForm.id ? "Chỉnh sửa công việc" : "Thêm công việc mới"}
        subtitle="Chi tiết yêu cầu triển khai công việc"
        size="md"
        footer={
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <button
              onClick={() => {
                if (newSubtaskForm.id) {
                  executeDelete(newSubtaskForm.id);
                }
                setNewSubtaskForm({ id: null, name: "", note: "", department: "", pic: "", picName: "", color: "#3b82f6" });
                setIsSubtaskOffcanvasOpen(false);
              }}
              style={{ padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "#ef4444" }}
            >
              Xoá
            </button>
            <button
              onClick={() => {
                if (!newSubtaskForm.name.trim() || !targetParentTask) return;

                if (newSubtaskForm.id) {
                  // Edit mode
                  updateTask(newSubtaskForm.id, {
                    name: newSubtaskForm.name,
                    note: newSubtaskForm.note
                  });
                } else {
                  // Create mode
                  const newId = `st-${Date.now()}`;
                  const updatedTasks = updateTaskInChildren(tasksList, targetParentTask.id, (t) => ({
                    ...t,
                    isExpanded: true,
                    children: [...(t.children || []), {
                      id: newId,
                      name: newSubtaskForm.name,
                      note: newSubtaskForm.note,
                      pic: "",
                      picName: "",
                      color: t.color || "#3b82f6",
                      children: []
                    }]
                  }));
                  setTasksList(updatedTasks);
                }
                setIsSubtaskOffcanvasOpen(false);
              }}
              style={{ padding: "10px 32px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(30, 58, 138, 0.2)" }}
            >
              {newSubtaskForm.id ? "Cập nhật" : "Thêm mới"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ padding: "16px 20px", background: "#f8fafc" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Bộ phận triển khai</label>
              <input
                value={newSubtaskForm.department}
                onChange={e => setNewSubtaskForm({ ...newSubtaskForm, department: e.target.value })}
                placeholder="Phòng Marketing..."
                style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 13, fontWeight: 700, color: "var(--foreground)", padding: 0 }}
              />
            </div>
            <div style={{ padding: "16px 20px", background: "#f8fafc" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Người phụ trách</label>
              <div style={{ position: "relative" }}>
                <input
                  value={newSubtaskForm.picName}
                  onChange={e => setNewSubtaskForm({ ...newSubtaskForm, picName: e.target.value })}
                  onFocus={() => setShowOffcanvasPicker(true)}
                  onBlur={() => setTimeout(() => setShowOffcanvasPicker(false), 200)}
                  placeholder="Chọn nhân sự..."
                  style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 13, fontWeight: 700, color: "var(--foreground)", padding: 0 }}
                />
                {showOffcanvasPicker && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
                    {marketingStaff.filter(s => s.name.toLowerCase().includes(newSubtaskForm.picName.toLowerCase())).map((s, idx) => (
                      <div key={idx} onClick={() => setNewSubtaskForm({ ...newSubtaskForm, pic: s.id, picName: s.name })} style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tên công việc */}
          <div className="form-group">
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 8, letterSpacing: "0.03em" }}>TÊN CÔNG VIỆC</label>
            <input
              autoFocus
              className="form-control"
              placeholder="Ví dụ: Thiết kế bộ nhận diện chiến dịch..."
              value={newSubtaskForm.name}
              onChange={e => setNewSubtaskForm({ ...newSubtaskForm, name: e.target.value })}
              style={{ padding: "14px 20px", borderRadius: 16, border: "1.5px solid var(--border)", background: "var(--card)", fontSize: 16, fontWeight: 700, width: "100%", outline: "none", transition: "all 0.2s" }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 4px rgba(37, 99, 235, 0.1)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          {/* Chi tiết công việc (Mở rộng cho hết body) */}
          <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>NỘI DUNG CHI TIẾT & YÊU CẦU</label>
            <textarea
              className="form-control"
              placeholder="Nhập mô tả chi tiết nội dung triển khai, mục tiêu hoặc ghi chú quan trọng tại đây..."
              value={newSubtaskForm.note}
              onChange={e => setNewSubtaskForm({ ...newSubtaskForm, note: e.target.value })}
              style={{
                flex: 1,
                padding: "20px",
                borderRadius: 20,
                border: "1.5px solid var(--border)",
                background: "#ffffff",
                fontSize: 14,
                fontWeight: 500,
                width: "100%",
                outline: "none",
                resize: "none",
                lineHeight: 1.7,
                color: "var(--foreground)",
                transition: "all 0.2s",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02), 0 0 0 4px rgba(37, 99, 235, 0.05)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
            />
          </div>
        </div>
      </Offcanvas>

      <Offcanvas
        isOpen={contentOffcanvasOpen}
        onClose={handleCloseContentOffcanvas}
        title={editingCatId ? "Cập nhật nội dung" : "Thêm tuyến nội dung"}
        subtitle={`Nhập chi tiết cho định hướng: ${pillars.find((p: any) => p.id === activePillarIdForContent)?.name || ""}`}
        footer={
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              onClick={editingCatId ? handleDeleteNewContentCategory : handleCloseContentOffcanvas}
              style={{ padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "#dc2626" }}
            >
              {editingCatId ? "Xoá nội dung" : "Huỷ bỏ"}
            </button>
            <button
              onClick={handleSaveNewContentCategory}
              style={{ padding: "10px 32px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(30,58,138,0.2)" }}
            >
              {editingCatId ? "Cập nhật" : "Lưu nội dung"}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
          <div className="form-group" style={{ flexShrink: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 8, display: "block" }}>Tên nội dung <span style={{ color: "red" }}>*</span></label>
            <input
              autoFocus
              className="form-control"
              placeholder="VD: Chuỗi bài chia sẻ kiến thức..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 14 }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flexShrink: 0 }}>
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 8, display: "block" }}>Phân bổ (%)</label>
              <input
                type="number"
                min={0} max={100}
                className="form-control"
                value={newCatAllocation || ""}
                onChange={e => setNewCatAllocation(Number(e.target.value))}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 14 }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 8, display: "block" }}>Số bài</label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={newCatPosts || ""}
                onChange={e => setNewCatPosts(Number(e.target.value))}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 14 }}
              />
            </div>
          </div>
          <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 8, display: "block" }}>Nội dung chi tiết</label>
            <textarea
              className="form-control"
              placeholder="Nhập nội dung chi tiết bài viết..."
              value={newCatDetail}
              onChange={e => setNewCatDetail(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 14, flex: 1, resize: "none", outline: "none" }}
            />
          </div>
        </div>
      </Offcanvas>

      {renderDiscussionOffcanvas()}
      <ApprovalCenter
        mode="drawer"
        isOpen={showApprovalDrawer}
        onClose={() => setShowApprovalDrawer(false)}
        entityFilter="marketing_yearly_plan"
        onApprove={() => { loadPlansFromServer(); setShowApprovalDrawer(false); }}
        onReject={() => { loadPlansFromServer(); }}
      />
    </>
  );
}

// ── Shared UI Components ──────────────────────────────────────────────────────
const Offcanvas = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md"
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const widthMap = {
    sm: 320,
    md: 420,
    lg: 640,
    xl: 800
  };

  const width = widthMap[size] || 420;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 9000,
            }}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: `min(${width}px, 100vw)`,
              background: "var(--card)",
              zIndex: 9001,
              boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid var(--border)",
            }}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <h5 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--foreground)", letterSpacing: "0.02em" }}>{title}</h5>
                {subtitle && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                style={{ border: "none", background: "var(--muted)", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in srgb, var(--muted) 80%, black)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--muted)")}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            {/* Body */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {children}
            </div>
            {/* Footer */}
            {footer && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--card)", flexShrink: 0 }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

