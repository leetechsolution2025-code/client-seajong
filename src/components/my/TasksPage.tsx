"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pagination } from "@/components/ui/Pagination";
import { AnimatePresence } from "framer-motion";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

// ── Mock Data ──────────────────────────────────────────────────────────────
const PERFORMANCE_GRID = [
  { label: "Được giao", val: 12, icon: "bi-list-ul", color: "#6366f1" },
  { label: "Hoàn thành", val: 4, icon: "bi-check2-circle", color: "#10b981" },
  { label: "Đúng hạn", val: 0, icon: "bi-clock-history", color: "#3b82f6" },
  { label: "Trễ hạn", val: 4, icon: "bi-clock", color: "#f59e0b" },
  { label: "Đang trễ", val: 8, icon: "bi-exclamation-triangle", color: "#ef4444" },
];

// Helper to render upgraded/structured description
function renderUpgradedDescription(desc: string) {
  if (!desc) return null;

  // Split into Details and Approval info by '---' or '—'
  const parts = desc.split(/---|—/);
  const mainPart = parts[0].trim();
  const approvalPart = parts[1] ? parts[1].trim() : "";

  const fields: { label: string; value: string }[] = [];
  
  const lines = mainPart.split("\n").map(l => l.trim()).filter(Boolean);
  
  for (const line of lines) {
    if (line.toLowerCase().startsWith("hạng mục:")) {
      const value = line.substring("hạng mục:".length).trim();
      fields.push({ label: "Hạng mục", value });
    } else if (line.toLowerCase().startsWith("chi tiết:")) {
      let remaining = line.substring("chi tiết:".length).trim();
      if (remaining.includes("|")) {
        const segments = remaining.split("|").map(s => s.trim());
        for (const seg of segments) {
          const colonIndex = seg.indexOf(":");
          if (colonIndex > 0) {
            const label = seg.substring(0, colonIndex).trim();
            const value = seg.substring(colonIndex + 1).trim();
            fields.push({ label, value });
          } else {
            fields.push({ label: "Chi tiết", value: seg });
          }
        }
      } else {
        fields.push({ label: "Chi tiết", value: remaining });
      }
    } else if (line.toLowerCase().startsWith("ghi chú:")) {
      const value = line.substring("ghi chú:".length).trim();
      fields.push({ label: "Ghi chú", value });
    } else {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const label = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        fields.push({ label, value });
      } else {
        fields.push({ label: "Chi tiết", value: line });
      }
    }
  }

  const approvalFields: { label: string; value: string }[] = [];
  if (approvalPart) {
    const cleanedApprovalPart = approvalPart.replace(/^thông tin phê duyệt:\s*/i, "").trim();
    const lines = cleanedApprovalPart.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const cleanedLine = line.replace(/^-\s*/, "");
      const colonIndex = cleanedLine.indexOf(":");
      if (colonIndex > 0) {
        const label = cleanedLine.substring(0, colonIndex).trim();
        const value = cleanedLine.substring(colonIndex + 1).trim();
        approvalFields.push({ label, value });
      } else {
        approvalFields.push({ label: "Thông tin", value: cleanedLine });
      }
    }
  }

  if (approvalFields.length > 0) {
    return null;
  }

  if (fields.length === 0) {
    return (
      <div style={{
        background: "var(--muted)", borderRadius: 12, border: "1px solid var(--border)",
        padding: "14px 16px"
      }}>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{desc}</p>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--muted)", borderRadius: 12, border: "1px solid var(--border)",
      padding: "14px 16px"
    }}>
      <div style={{ fontSize: 9, fontWeight: 900, color: "#6366f1", textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.06em" }}>
        Chi tiết công việc
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {fields.map((f, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
              {f.label}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--foreground)", lineHeight: 1.5, fontWeight: f.label === "Hạng mục" ? 700 : 500 }}>
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface TasksPageProps {
  departmentCode?: string;          // e.g. "marketing"
  tasksApiUrl?: string;             // e.g. "/api/marketing/tasks"
  title?: string;                   // e.g. "Quản trị công việc"
  description?: string;             // e.g. "Ban Giám đốc · Giám sát tiến độ..."
  planRedirectPathPattern?: string; // e.g. "/marketing/plan/monthly?id={planId}&focusTask={taskId}"
  departmentNameVi?: string;        // e.g. "Marketing"
}

export default function TasksPage({
  departmentCode = "marketing",
  tasksApiUrl = "/api/marketing/tasks",
  title = "Quản trị công việc",
  description = "Ban Giám đốc · Giám sát tiến độ và phân công công việc toàn hệ thống",
  planRedirectPathPattern = "/marketing/plan/monthly?id={planId}&focusTask={taskId}",
  departmentNameVi = "Marketing"
}: TasksPageProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<{ code: string; name: string }[]>([]);
  const [priorities, setPriorities] = useState<{ code: string; name: string }[]>([]);
  const [marketingEmployees, setMarketingEmployees] = useState<any[]>([]);
  const [executionStatuses, setExecutionStatuses] = useState<{ code: string; name: string }[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterExecution, setFilterExecution] = useState("all");
  const [perfMonth, setPerfMonth] = useState<number | "all">(new Date().getMonth() + 1);
  const [perfEmployee, setPerfEmployee] = useState("all");
  const [reportDeptFilter, setReportDeptFilter] = useState("");

  const [showCreateTask, setShowCreateTask] = useState(false);
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const [createTaskForm, setCreateTaskForm] = useState({ title: "", description: "", assigneeId: "", creatorId: "", startDate: getTodayStr(), dueDate: "", priority: "medium", filterDeptName: "" });
  const [creatingTask, setCreatingTask] = useState(false);

  const searchParams = useSearchParams();
  useEffect(() => {
    const reportMonth = searchParams.get("view_report");
    if (reportMonth) {
      const monthNum = parseInt(reportMonth, 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        setPerfMonth(monthNum);
        const empParam = searchParams.get("emp");
        if (empParam) setPerfEmployee(empParam);
        else setPerfEmployee("all");
        const dept = searchParams.get("dept");
        if (dept) {
          setReportDeptFilter(dept);
        }
        setShowReportModal(true);
      }
    }
  }, [searchParams]);

  const { data: session } = useSession();
  
  useEffect(() => {
    if (showCreateTask && session?.user?.id && !createTaskForm.creatorId) {
      setCreateTaskForm(prev => ({ ...prev, creatorId: session.user.id }));
    }
  }, [showCreateTask, session]);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);

  const seenCommentsKey = `tasks_seen_comments_${session?.user?.id || "guest"}`;
  const [seenComments, setSeenComments] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(seenCommentsKey);
      if (saved) {
        try { setSeenComments(JSON.parse(saved)); } catch(e) {}
      }
    }
  }, [seenCommentsKey]);

  const markTaskAsRead = (taskId: string, count: number) => {
    setSeenComments(prev => {
      if (prev[taskId] === count) return prev;
      const updated = { ...prev, [taskId]: count };
      localStorage.setItem(seenCommentsKey, JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (showDetail && selectedTask) {
      fetchComments();
      const interval = setInterval(fetchComments, 5000);
      return () => clearInterval(interval);
    }
  }, [showDetail, selectedTask]);

  const fetchComments = () => {
    if (!selectedTask) return;
    const apiPath = selectedTask.isGeneric
      ? `/api/board/tasks/${selectedTask.id}/comments`
      : `${tasksApiUrl}/${selectedTask.id}/comments`;
    fetch(apiPath, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setComments(data);
          markTaskAsRead(selectedTask.id, data.length);
        }
      })
      .catch(err => console.error("Error fetching comments:", err));
  };

  const prevCommentsLengthRef = useRef(0);
  useEffect(() => {
    if (comments.length > prevCommentsLengthRef.current) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCommentsLengthRef.current = comments.length;
  }, [comments]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState(`BÁO CÁO ĐÁNH GIÁ HIỆU SUẤT NHÂN VIÊN ${departmentNameVi.toUpperCase()}`);
  const [reportNote, setReportNote] = useState("");

  useEffect(() => {
    if (perfEmployee !== "all") {
      setReportTitle(`BÁO CÁO ĐÁNH GIÁ HIỆU SUẤT CÁ NHÂN`);
    } else if (reportDeptFilter) {
      const deptName = marketingEmployees.find(e => e.departmentCode === reportDeptFilter)?.departmentName || reportDeptFilter;
      setReportTitle(`BÁO CÁO ĐÁNH GIÁ HIỆU SUẤT NHÂN VIÊN PHÒNG ${deptName.toUpperCase()}`);
    } else {
      setReportTitle(`BÁO CÁO ĐÁNH GIÁ HIỆU SUẤT NHÂN VIÊN ${departmentNameVi.toUpperCase()}`);
    }
  }, [perfEmployee, reportDeptFilter, departmentNameVi, marketingEmployees]);
  const handleSendComment = async (attachment?: { url: string; name: string }) => {
    if ((!commentText.trim() && !attachment) || !selectedTask || sendingComment) return;
    console.log("[handleSendComment] Sending:", { content: commentText, attachment });
    setSendingComment(true);
    try {
      const apiPath = selectedTask.isGeneric
        ? `/api/board/tasks/${selectedTask.id}/comments`
        : `${tasksApiUrl}/${selectedTask.id}/comments`;
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: commentText,
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name
        }),
      });
      console.log("[handleSendComment] Status:", res.status);
      if (res.ok) {
        setCommentText("");
        fetchComments();
      } else {
        const errData = await res.json();
        console.error("[handleSendComment] Error:", errData);
        alert("Lỗi gửi tin nhắn: " + (errData.error || "Không rõ lỗi"));
      }
    } catch (err: any) {
      console.error("[handleSendComment] Catch:", err);
      alert("Lỗi kết nối server: " + err.message);
    } finally {
      setSendingComment(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTaskForm.title.trim()) return alert("Vui lòng nhập tiêu đề");
    if (!createTaskForm.assigneeId) return alert("Vui lòng chọn người thực hiện");
    setCreatingTask(true);
    try {
      const res = await fetch(tasksApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTaskForm.title,
          description: createTaskForm.description,
          assigneeId: createTaskForm.assigneeId,
          creatorId: createTaskForm.creatorId || undefined,
          startDate: createTaskForm.startDate || null,
          dueDate: createTaskForm.dueDate || null,
          priority: createTaskForm.priority,
          deptCode: departmentCode || null,
        }),
      });
      if (res.ok) {
        setShowCreateTask(false);
        setCreateTaskForm({ title: "", description: "", assigneeId: "", creatorId: "", startDate: getTodayStr(), dueDate: "", priority: "medium", filterDeptName: "" });
        // Reload tasks
        const r = await fetch(tasksApiUrl);
        const d = await r.json();
        if (Array.isArray(d)) setTasks(d);
        else if (d && d.success && Array.isArray(d.tasks)) {
          setTasks(d.tasks.map((t: any) => ({ ...t, isGeneric: true, assigneeName: t.assignee?.name || "Không rõ", deadline: t.dueDate })));
        }
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi tạo công việc");
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[handleFileUpload] Selected file:", file?.name);
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("[handleFileUpload] Uploading to /api/upload...");
      const resp = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await resp.json();
      console.log("[handleFileUpload] Upload result:", data);
      
      if (data.url) {
        // Automatically send a comment with the file
        await handleSendComment({ url: data.url, name: file.name });
      } else {
        alert(data.error || "Lỗi upload file");
      }
    } catch (err: any) {
      console.error("[handleFileUpload] Catch:", err);
      alert("Lỗi upload file: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredTasks = tasks.filter(t => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dDate = t.deadline ? new Date(t.deadline) : null;
    if (dDate) dDate.setHours(0, 0, 0, 0);

    // Filter by Plan Month or Deadline Month
    const planMonth = t.monthlyPlan?.month;
    const taskMonth = planMonth || (dDate ? (dDate.getMonth() + 1) : null);
    const monthMatch = perfMonth === "all" || taskMonth === perfMonth;
    const employeeMatch = perfEmployee === "all" || (t.assigneeName === perfEmployee) || (t.isGeneric && t.assignee?.name === perfEmployee);
    if (!monthMatch || !employeeMatch) return false;

    let tStatusName = "Chưa thực hiện";
    if (t.status === "done") tStatusName = "Hoàn thành";
    else if (t.status === "cancelled") tStatusName = "Huỷ bỏ";
    else if (dDate && today > dDate) tStatusName = "Quá hạn";
    else if (t.status === "in_progress") tStatusName = "Đang thực hiện";
    else if (t.status === "pending") tStatusName = "Chưa thực hiện";

    // Lọc theo Trạng thái (Tiến độ)
    let sMatch = filterStatus === "all";
    if (!sMatch) {
      const targetCat = statuses.find(s => s.code === filterStatus);
      sMatch = tStatusName === targetCat?.name || t.status === filterStatus || t.category === filterStatus;
    }

    // Lọc theo Trạng thái thực hiện
    let eMatch = filterExecution === "all";
    if (!eMatch) {
      const targetCat = executionStatuses.find(s => s.code === filterExecution);
      eMatch = tStatusName === targetCat?.name || t.category === filterExecution || t.taskType === filterExecution;
    }

    // Lọc theo Ưu tiên
    let pMatch = filterPriority === "all";
    if (!pMatch) {
      pMatch = t.taskType === filterPriority || t.category === filterPriority || t.channel === filterPriority;
    }

    const tMatch = t.title?.toLowerCase().includes(searchTerm.toLowerCase());

    // Công việc thực sự = phải có ít nhất 1 tuần được đánh dấu (xuất hiện trong cột Tuần 1–4)
    // Tất cả header, placeholder, Chủ đề tháng đều không có tuần → tự động bị loại
    if (!t.isGeneric && !t.week1 && !t.week2 && !t.week3 && !t.week4) return false;

    return sMatch && pMatch && eMatch && tMatch;
  });

  useEffect(() => {
    // Lấy danh sách trạng thái
    fetch("/api/board/categories?type=tr_ng_th_i_c_ng_vi_c")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStatuses(data);
      })
      .catch(err => console.error("Error fetching statuses:", err));

    // Lấy danh sách ưu tiên
    fetch("/api/board/categories?type=_u_ti_n")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPriorities(data);
      })
    // Lấy danh sách trạng thái thực hiện
    fetch("/api/board/categories?type=trang_th_i_th_c_hi_n")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setExecutionStatuses(data);
      })
      .catch(err => console.error("Error fetching execution statuses:", err));

    // Lấy danh sách nhân viên phòng ban
    const employeesUrl = departmentCode
      ? `/api/hr/employees?department=${departmentCode}&pageSize=100`
      : `/api/hr/employees?pageSize=100`;
    fetch(employeesUrl)
      .then(res => res.json())
      .then(data => {
        if (data.employees && Array.isArray(data.employees)) {
          setMarketingEmployees(data.employees);
        }
      })
      .catch(err => console.error("Error fetching employees:", err));

    // Lấy thông tin công ty
    fetch("/api/company", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setCompanyInfo(data);
      })
      .catch(err => console.error("Error fetching company info:", err));

    // Lấy danh sách task
    fetch(tasksApiUrl)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
        else if (data && data.success && Array.isArray(data.tasks)) {
          const mappedTasks = data.tasks.map((t: any) => ({
            ...t,
            isGeneric: true,
            assigneeName: t.assignee?.name || "Không rõ",
            creatorName: t.creator?.name || "",
            deadline: t.dueDate,
          }));
          setTasks(mappedTasks);
        }
      })
      .catch(err => console.error("Error fetching tasks:", err))
      .finally(() => setLoading(false));

    const loadTasks = () => {
      fetch(tasksApiUrl)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTasks(data);
          else if (data && data.success && Array.isArray(data.tasks)) {
            const mappedTasks = data.tasks.map((t: any) => ({
              ...t,
              isGeneric: true,
              assigneeName: t.assignee?.name || "Không rõ",
              creatorName: t.creator?.name || "",
              deadline: t.dueDate,
            }));
            setTasks(mappedTasks);
          }
        })
        .catch(err => console.error("Error fetching tasks:", err));
    };

    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title={title}
        description={description}
        color="indigo"
        icon="bi-kanban"
      />

      <div className="tasks-main-container" style={{ flex: 1, padding: "16px 24px", overflow: "hidden" }}>
        {/* ── Top Small Stats Removed ── */}
          {/* ── Left Sidebar: Performance ── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="tasks-left-panel" style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: "16px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <SectionTitle title="Đánh giá hiệu suất nhân viên" />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <select 
                  value={perfMonth}
                  onChange={(e) => setPerfMonth(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                  style={{ height: 30, borderRadius: 8, border: "1px solid var(--border)", padding: "0 8px", fontSize: 11, fontWeight: 500, background: "var(--background)", color: "var(--foreground)" }}
                >
                  <option value="all">Tất cả các tháng</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
                <select 
                  value={perfEmployee}
                  onChange={(e) => setPerfEmployee(e.target.value)}
                  style={{ height: 30, borderRadius: 8, border: "1px solid var(--border)", padding: "0 8px", fontSize: 11, fontWeight: 500, background: "var(--background)", color: "var(--foreground)" }}
                >
                  <option value="all">Tất cả nhân viên</option>
                  {marketingEmployees.map(emp => (
                    <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
               {(() => {
                const todayCurrent = new Date(); todayCurrent.setHours(0,0,0,0);
                const filteredForPerf = tasks.filter(t => {
                  const planM = t.monthlyPlan?.month;
                  const dDate = t.deadline ? new Date(t.deadline) : null;
                  const taskM = planM || (dDate ? (dDate.getMonth() + 1) : null);
                  const monthMatch = perfMonth === "all" || taskM === perfMonth;
                  const empMatch = perfEmployee === "all" || (t.assigneeName === perfEmployee) || (t.isGeneric && t.assignee?.name === perfEmployee);
                  const hasWeek = t.isGeneric || t.week1 || t.week2 || t.week3 || t.week4;
                  return monthMatch && empMatch && hasWeek;
                });

                const total = filteredForPerf.length;
                const done = filteredForPerf.filter(t => t.status === "done").length;
                const inProgress = filteredForPerf.filter(t => t.status === "in_progress").length;
                const overdue = filteredForPerf.filter(t => t.status !== "done" && t.deadline && new Date(t.deadline) < todayCurrent).length;
                const pending = filteredForPerf.filter(t => t.status === "pending").length;
                const onTrack = done;
                const score = total > 0 ? Math.round((done / total) * 100) : 0;

                const gridData = [
                  { label: "Được giao", val: total, icon: "bi-list-ul", color: "#6366f1" },
                  { label: "Chưa làm", val: pending, icon: "bi-hourglass-split", color: "#94a3b8" },
                  { label: "Hoàn thành", val: done, icon: "bi-check2-circle", color: "#10b981" },
                  { label: "Đúng tiến độ", val: done, icon: "bi-graph-up-arrow", color: "#3b82f6" },
                  { label: "Chậm tiến độ", val: inProgress, icon: "bi-arrow-repeat", color: "#f59e0b" },
                  { label: "Quá hạn", val: overdue, icon: "bi-exclamation-triangle", color: "#ef4444" },
                ];

                return (
                  <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", paddingRight: 4 }} className="custom-scrollbar">
                    <div style={{ background: "var(--accent)", borderRadius: 12, padding: "10px 14px", position: "relative", textAlign: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 16, alignItems: "center" }}>
                        <div style={{ position: "relative", width: 68, height: 68 }}>
                          <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                            <circle cx="34" cy="34" r="29" stroke="var(--border)" strokeWidth="5" fill="none" />
                            <circle cx="34" cy="34" r="29" stroke="#6366f1" strokeWidth="5" fill="none" strokeDasharray="182" strokeDashoffset={182 - (182 * score / 100)} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--foreground)", lineHeight: 1 }}>{score}</span>
                            <span style={{ fontSize: 8, color: "var(--muted-foreground)", fontWeight: 700 }}>/100đ</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                            <i className="bi bi-people-fill" style={{ fontSize: 12 }} />
                          </div>
                          <h6 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase" }}>Xếp loại</h6>
                          <div style={{ display: "inline-block", background: score > 70 ? "color-mix(in srgb, #059669 15%, transparent)" : "color-mix(in srgb, #e11d48 15%, transparent)", color: score > 70 ? "#10b981" : "#fb7185", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, marginTop: 4 }}>
                             {score > 70 ? "Xuất sắc" : score > 40 ? "Đang ổn" : "Cần cải thiện"}
                          </div>
                          <p style={{ margin: "3px 0 0", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)" }}>Hoàn thành {done}/{total}</p>
                        </div>
                      </div>

                      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 10, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: total > 0 ? `${(done/total)*100}%` : "0%", background: "#10b981", height: "100%" }} />
                        <div style={{ width: total > 0 ? `${(overdue/total)*100}%` : "0%", background: "#ef4444", height: "100%" }} />
                      </div>
                    </div>

                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, alignContent: "start" }}>
                      {gridData.map((s, i) => (
                        <div key={i} style={{ background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 12, padding: "6px 4px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                            <i className={`bi ${s.icon}`} style={{ fontSize: 13, color: s.color }} />
                            <span style={{ fontSize: 14, fontWeight: 900, color: "var(--foreground)" }}>{s.val}</span>
                          </div>
                          <div style={{ fontSize: 8, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={() => setShowReportModal(true)}
                      style={{ 
                        marginTop: 10, width: "100%", padding: "8px 12px", 
                        borderRadius: 10, border: "none", 
                        background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", 
                        color: "#fff", fontSize: 12, fontWeight: 800, 
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                        cursor: "pointer", transition: "all 0.2s ease"
                      }}>
                      <i className="bi bi-file-earmark-bar-graph" />
                      Báo cáo hiệu suất nhân viên
                    </button>

                    {/* Print Preview Modal Integration */}
                    {showReportModal && (
                      <PrintPreviewModal
                        title="In Báo cáo Hiệu suất"
                        subtitle={`Dữ liệu Tháng ${perfMonth}/${new Date().getFullYear()}`}
                        onClose={() => setShowReportModal(false)}
                        documentId="performance-report-doc"
                        actions={
                          <button
                            onClick={() => printDocumentById("performance-report-doc", "portrait", "Bao_cao_hieu_suat")}
                            style={{ padding: "6px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <i className="bi bi-printer" /> In báo cáo
                          </button>
                        }
                        sidebar={
                          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                            <div>
                              <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Tiêu đề báo cáo</p>
                              <input 
                                value={reportTitle} onChange={e => setReportTitle(e.target.value)}
                                style={{ width: "100%", padding: "8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--background)", color: "var(--foreground)", outline: "none" }}
                              />
                            </div>
                            <div>
                              <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Ghi chú bổ sung</p>
                              <textarea 
                                value={reportNote} onChange={e => setReportNote(e.target.value)}
                                placeholder="Nhập nhận xét chung..."
                                style={{ width: "100%", height: 100, padding: "8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, resize: "none", background: "var(--background)", color: "var(--foreground)", outline: "none" }}
                              />
                            </div>
                          </div>
                        }
                        document={
                          <div className="pdf-content-page">
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30, borderBottom: "2px solid #1e293b", paddingBottom: 15 }}>
                              <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
                                {companyInfo?.logoUrl && (
                                  <img src={companyInfo.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: "contain" }} />
                                )}
                                <div>
                                  <h2 style={{ margin: 0, fontSize: 13, color: "#1e293b", fontWeight: 900, textTransform: "uppercase" }}>
                                    {companyInfo?.name || "CÔNG TY TNHH MTV TƯ VẤN VÀ CUNG CẤP GIẢI PHÁP SỐ LEE-TECH"}
                                  </h2>
                                  <p style={{ margin: "2px 0", fontSize: 11, color: "#475569", fontWeight: 600 }}>Bộ phận {reportDeptFilter ? reportDeptFilter : departmentNameVi} - Hệ thống quản trị hiệu suất</p>
                                  <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>{companyInfo?.address || "Hồ Chí Minh, Việt Nam"}</p>
                                </div>
                              </div>
                              <div style={{ textAlign: "right", minWidth: 150 }}>
                                <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>Mẫu số: RP-MKT-01</p>
                                <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>Ngày lập: {new Date().toLocaleDateString("vi-VN")}</p>
                                <p style={{ margin: "4px 0 0", fontSize: 10, color: "#94a3b8" }}>ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                              </div>
                            </div>

                            {/* Title */}
                            <div style={{ textAlign: "center", marginBottom: 30 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#6366f1", letterSpacing: "0.2em", textTransform: "uppercase" }}>BÁO CÁO</p>
                              <h1 style={{ margin: "5px 0 0", fontSize: 18, fontWeight: 900, color: "#1e293b", textTransform: "uppercase", lineHeight: 1.4 }}>
                                {reportTitle.toUpperCase().startsWith("BÁO CÁO ") ? reportTitle.substring(8) : reportTitle}
                              </h1>
                              <p style={{ fontSize: 13, color: "#475569", marginTop: 6, fontWeight: 600 }}>Kỳ báo cáo: Tháng {perfMonth} Năm {new Date().getFullYear()}</p>
                            </div>

                            {/* Department Summary */}
                            <div style={{ marginBottom: 30 }}>
                              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", borderLeft: "4px solid #6366f1", paddingLeft: 12, marginBottom: 15, textTransform: "uppercase" }}>
                                {perfEmployee === "all" ? "1. Tổng quan bộ phận" : "1. Tổng quan hiệu suất cá nhân"}
                              </h3>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 15 }}>
                                {(() => {
                                  const filteredEmployees = marketingEmployees.filter(emp => !reportDeptFilter || emp.departmentCode === reportDeptFilter);
                                  const baseTasks = tasks.filter(t => (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && t.taskGroup !== "chu_de_thang" && (!reportDeptFilter || filteredEmployees.some(e => e.userId === t.assigneeId || e.fullName?.trim() === t.assigneeName?.trim())));
                                  return [
                                    { label: perfEmployee === "all" ? "Tổng nhân sự" : "Nhân viên", val: perfEmployee === "all" ? filteredEmployees.length : perfEmployee },
                                    { label: "Tổng công việc", val: baseTasks.filter(t => (perfEmployee === "all" || t.assigneeId === filteredEmployees.find(e => e.fullName === perfEmployee)?.userId || t.assigneeName?.trim() === perfEmployee?.trim())).length },
                                    { label: "Hoàn thành", val: baseTasks.filter(t => t.status === "done" && (perfEmployee === "all" || t.assigneeId === filteredEmployees.find(e => e.fullName === perfEmployee)?.userId || t.assigneeName?.trim() === perfEmployee?.trim())).length },
                                    { label: "Tỷ lệ chung", val: `${Math.round((baseTasks.filter(t => t.status === "done" && (perfEmployee === "all" || t.assigneeId === filteredEmployees.find(e => e.fullName === perfEmployee)?.userId || t.assigneeName?.trim() === perfEmployee?.trim())).length / (baseTasks.filter(t => (perfEmployee === "all" || t.assigneeId === filteredEmployees.find(e => e.fullName === perfEmployee)?.userId || t.assigneeName?.trim() === perfEmployee?.trim())).length || 1)) * 100)}%` }
                                  ];
                                })().map((s, i) => (
                                  <div key={i} style={{ padding: "12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
                                    <p style={{ fontSize: 10, color: "#64748b", fontWeight: 700, margin: "0 0 5px", textTransform: "uppercase" }}>{s.label}</p>
                                    <p style={{ fontSize: i === 0 && perfEmployee !== "all" ? 13 : 18, color: "#1e293b", fontWeight: 900, margin: 0 }}>{s.val}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Individual Details */}
                            <div style={{ marginBottom: 30 }}>
                              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", borderLeft: "4px solid #6366f1", paddingLeft: 12, marginBottom: 10, textTransform: "uppercase" }}>2. Chi tiết hiệu suất cá nhân</h3>
                              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px", fontSize: "11px", color: "#475569", background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 800, color: "#1e293b", marginBottom: 4, fontSize: 12 }}>
                                    <i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i> 
                                    <span style={{ marginLeft: 4 }}>Xuất sắc</span>
                                  </div>
                                  <div style={{ paddingLeft: 20, lineHeight: 1.5 }}>
                                    <div style={{ marginBottom: 2 }}><b>- Điều kiện:</b> Tỷ lệ hoàn thành công việc từ 90% trở lên VÀ KHÔNG có bất kỳ công việc nào bị quá hạn.</div>
                                    <div><b>- Ý nghĩa:</b> Nhân sự hoàn thành khối lượng công việc xuất sắc và đảm bảo tuyệt đối về mặt thời gian (deadline).</div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 800, color: "#1e293b", marginBottom: 4, fontSize: 12 }}>
                                    <i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i> 
                                    <span style={{ marginLeft: 4 }}>Tốt</span>
                                  </div>
                                  <div style={{ paddingLeft: 20, lineHeight: 1.5 }}>
                                    <div style={{ marginBottom: 2 }}><b>- Điều kiện:</b> Tỷ lệ hoàn thành công việc từ 70% đến dưới 90% (có thể có hoặc không có công việc quá hạn, miễn là tỷ lệ xong việc cao).</div>
                                    <div><b>- Ý nghĩa:</b> Hiệu suất làm việc ở mức tốt, khối lượng công việc hoàn thành nhiều.</div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 800, color: "#1e293b", marginBottom: 4, fontSize: 12 }}>
                                    <i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#f59e0b", fontSize: 11 }}></i> 
                                    <span style={{ marginLeft: 4 }}>Đạt</span>
                                  </div>
                                  <div style={{ paddingLeft: 20, lineHeight: 1.5 }}>
                                    <div style={{ marginBottom: 2 }}><b>- Điều kiện:</b> Tỷ lệ hoàn thành công việc từ 50% đến dưới 70%.</div>
                                    <div><b>- Ý nghĩa:</b> Hiệu suất làm việc ở mức trung bình, đạt yêu cầu cơ bản nhưng cần đốc thúc thêm.</div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 800, color: "#dc2626", marginBottom: 4, fontSize: 12 }}>
                                    <i className="bi bi-star-fill" style={{ color: "#dc2626", fontSize: 11 }}></i><i className="bi bi-star-fill" style={{ color: "#dc2626", fontSize: 11 }}></i> 
                                    <span style={{ marginLeft: 4 }}>Cần cải thiện</span>
                                  </div>
                                  <div style={{ paddingLeft: 20, lineHeight: 1.5 }}>
                                    <div style={{ marginBottom: 2 }}><b>- Điều kiện:</b> Tỷ lệ hoàn thành công việc dưới 50%.</div>
                                    <div><b>- Ý nghĩa:</b> Hiệu suất làm việc thấp, công việc tồn đọng nhiều, là mức báo động (được tô màu đỏ) để quản lý chú ý và hỗ trợ nhắc nhở.</div>
                                  </div>
                                </div>
                              </div>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: "#f1f5f9" }}>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "left" }}>Họ và tên</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center" }}>Được giao</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center" }}>Hoàn thành</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center" }}>Quá hạn</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center" }}>Tỷ lệ (%)</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center" }}>Xếp loại</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {marketingEmployees.filter(emp => (!reportDeptFilter || emp.departmentCode === reportDeptFilter) && (perfEmployee === "all" || emp.fullName === perfEmployee)).map((emp) => {
                                    const empTasks = tasks.filter(t => (t.assigneeId === emp.userId || t.assigneeName?.trim() === emp.fullName?.trim()) && (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && t.taskGroup !== "chu_de_thang");
                                    const empDone = empTasks.filter(t => t.status === "done").length;
                                    const today = new Date(); today.setHours(0,0,0,0);
                                    const empOverdue = empTasks.filter(t => t.status !== "done" && t.deadline && new Date(t.deadline) < today).length;
                                    const empRate = empTasks.length > 0 ? Math.round((empDone / empTasks.length) * 100) : 0;
                                    
                                    let grade = "---";
                                    let color = "#64748b";
                                    let stars = 0;
                                    if (empTasks.length > 0) {
                                      if (empRate >= 90 && empOverdue === 0) { grade = "Xuất sắc"; color = "#f59e0b"; stars = 5; } // Gold stars
                                      else if (empRate >= 70) { grade = "Tốt"; color = "#f59e0b"; stars = 4; }
                                      else if (empRate >= 50) { grade = "Đạt"; color = "#f59e0b"; stars = 3; }
                                      else { grade = "Cần cải thiện"; color = "#dc2626"; stars = 2; } // Red stars for needs improvement
                                    }

                                    return (
                                      <tr key={emp.id}>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "8px 12px", fontWeight: 700 }}>{emp.fullName}</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center" }}>{empTasks.length}</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center" }}>{empDone}</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center", color: empOverdue > 0 ? "#dc2626" : "inherit", fontWeight: empOverdue > 0 ? 700 : 400 }}>{empOverdue}</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>{empRate}</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center", fontWeight: 800, color }}>
                                          {stars > 0 ? (
                                            <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
                                              {Array.from({ length: stars }).map((_, idx) => (
                                                <i key={idx} className="bi bi-star-fill" style={{ fontSize: 11 }} />
                                              ))}
                                            </div>
                                          ) : (
                                            "---"
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Individual Tasks List */}
                            {perfEmployee !== "all" && (
                              <div style={{ marginBottom: 30 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", borderLeft: "4px solid #6366f1", paddingLeft: 12, marginBottom: 10, textTransform: "uppercase" }}>3. Chi tiết danh sách công việc</h3>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "#1e293b" }}>
                                  <thead>
                                    <tr style={{ background: "#f1f5f9" }}>
                                      <th style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "left" }}>Tên công việc</th>
                                      <th style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center", width: "20%" }}>Hạn chót</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tasks.filter(t => (t.assigneeId === marketingEmployees.find(e => e.fullName === perfEmployee)?.userId || t.assigneeName?.trim() === perfEmployee?.trim()) && (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && t.taskGroup !== "chu_de_thang").map(t => {
                                      const isOverdue = t.status !== "done" && t.deadline && new Date(t.deadline) < (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
                                      return (
                                        <tr key={t.id}>
                                          <td style={{ border: "1px solid #cbd5e1", padding: "8px 12px" }}>
                                            <div style={{ marginBottom: 4, lineHeight: 1.4 }}>
                                              {t.title.includes("[KH MKT]") ? (
                                                <>
                                                  <span style={{ display: "inline-block", padding: "2px 6px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#475569", marginRight: 6, verticalAlign: "middle" }}>KH MKT</span>
                                                  <span style={{ verticalAlign: "middle" }}>{t.title.replace("[KH MKT]", "").trim()}</span>
                                                </>
                                              ) : (
                                                t.title
                                              )}
                                            </div>
                                            <div style={{ fontSize: 10, color: "#64748b", display: "flex", alignItems: "center", gap: 10 }}>
                                              <span style={{ color: t.status === "done" ? "#10b981" : (isOverdue ? "#dc2626" : "#6366f1"), fontWeight: 700 }}>
                                                Trạng thái: {t.status === "done" ? "Đã xong" : (isOverdue ? "Đang trễ" : "Đang làm")}
                                              </span>
                                              <span>•</span>
                                              <span>Người giao: {t.creatorName || "Hệ thống"}</span>
                                            </div>
                                          </td>
                                          <td style={{ border: "1px solid #cbd5e1", padding: "8px 12px", textAlign: "center" }}>
                                            {t.deadline ? new Date(t.deadline).toLocaleDateString("vi-VN") : "---"}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {tasks.filter(t => (t.assigneeId === marketingEmployees.find(e => e.fullName === perfEmployee)?.userId || t.assigneeName?.trim() === perfEmployee?.trim()) && (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && t.taskGroup !== "chu_de_thang").length === 0 && (
                                      <tr>
                                        <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>Không có công việc nào trong tháng này.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Observations */}
                            <div>
                              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", borderLeft: "4px solid #6366f1", paddingLeft: 12, marginBottom: 15, textTransform: "uppercase" }}>{perfEmployee === "all" ? "3" : "4"}. Nhận xét & Đề xuất chung</h3>
                              {(() => {
                                const validEmps = marketingEmployees.filter(emp => perfEmployee === "all" || emp.fullName === perfEmployee);
                                let totalStars = 0;
                                let empCount = 0;
                                validEmps.forEach(emp => {
                                  const empTasks = tasks.filter(t => (t.assigneeId === emp.userId || t.assigneeName?.trim() === emp.fullName?.trim()) && (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && t.taskGroup !== "chu_de_thang");
                                  if (empTasks.length > 0) {
                                    empCount++;
                                    const empDone = empTasks.filter(t => t.status === "done").length;
                                    const today = new Date(); today.setHours(0,0,0,0);
                                    const empOverdue = empTasks.filter(t => t.status !== "done" && t.deadline && new Date(t.deadline) < today).length;
                                    const empRate = Math.round((empDone / empTasks.length) * 100);
                                    if (empRate >= 90 && empOverdue === 0) totalStars += 5;
                                    else if (empRate >= 70) totalStars += 4;
                                    else if (empRate >= 50) totalStars += 3;
                                    else totalStars += 2;
                                  }
                                });
                                const avgStars = empCount > 0 ? Math.round(totalStars / empCount) : 0;
                                return (
                                  <>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase" }}>Xếp loại chung:</span>
                                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                        {avgStars > 0 ? (
                                          Array.from({ length: avgStars }).map((_, idx) => (
                                            <i key={idx} className="bi bi-star-fill" style={{ color: avgStars >= 3 ? "#f59e0b" : "#dc2626", fontSize: 14 }} />
                                          ))
                                        ) : (
                                          <span style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>Chưa có dữ liệu</span>
                                        )}
                                      </div>
                                    </div>
                                    <div style={{ padding: "15px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
                                      {reportNote || `Dựa trên dữ liệu hệ thống, tình hình thực hiện công việc của ${perfEmployee === "all" ? "phòng" : `nhân sự ${perfEmployee}`} trong Tháng ${perfMonth} đang duy trì ở mức ${(tasks.filter(t => (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && t.status === "done" && (perfEmployee === "all" || t.assigneeId === marketingEmployees.find(e => e.fullName === perfEmployee)?.userId || t.assigneeName?.trim() === perfEmployee?.trim()) && t.taskGroup !== "chu_de_thang").length / (tasks.filter(t => (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && (perfEmployee === "all" || t.assigneeId === marketingEmployees.find(e => e.fullName === perfEmployee)?.userId || t.assigneeName?.trim() === perfEmployee?.trim()) && t.taskGroup !== "chu_de_thang").length || 1) * 100).toFixed(1)}%. Đề nghị ${perfEmployee === "all" ? "các nhân sự có nhiều công việc quá hạn" : "nhân sự"} tập trung xử lý dứt điểm trước khi kết thúc kỳ.`}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            
                            {/* Signatures */}
                            <div style={{ marginTop: 60, display: "flex", justifyContent: "flex-end" }}>
                              <div style={{ textAlign: "center", width: 250 }}>
                                <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 5px" }}>Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                                <p style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", margin: 0, marginTop: 10 }}>HỆ THỐNG BÁO CÁO TỰ ĐỘNG</p>
                              </div>
                            </div>
                          </div>
                        }
                      />
                    )}

                  </div>
                );
              })()}
              </div>

          </motion.div>

          {/* ── Right Content: Task List ── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="tasks-right-panel" style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div className="tasks-right-card" style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: "16px 20px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <SectionTitle 
                title="Danh sách công việc" 
                action={(
                  <select 
                    value={filterExecution}
                    onChange={(e) => setFilterExecution(e.target.value)}
                    style={{ height: 32, borderRadius: 8, border: "1px solid var(--border)", padding: "0 10px", fontSize: 11, fontWeight: 500, background: "var(--background)", color: "var(--foreground)", minWidth: 160 }}
                  >
                    <option value="all">Thực hiện: Tất cả</option>
                    {executionStatuses.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                )}
              />
              <div className="tasks-filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 10, flex: 1 }}>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ height: 38, borderRadius: 10, border: "1px solid var(--border)", padding: "0 10px", fontSize: 12, fontWeight: 500, background: "var(--background)", color: "var(--foreground)", width: 150 }}
                  >
                    <option value="all">Trạng thái: Tất cả</option>
                    {statuses.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                  <select 
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    style={{ height: 38, borderRadius: 10, border: "1px solid var(--border)", padding: "0 10px", fontSize: 12, fontWeight: 500, background: "var(--background)", color: "var(--foreground)", width: 140 }}
                  >
                    <option value="all">Ưu tiên: Tất cả</option>
                    {priorities.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                  <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                    <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 13 }} />
                    <input 
                      type="text" placeholder="Tìm kiếm công việc..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ height: 38, width: "100%", borderRadius: 10, border: "1px solid var(--border)", padding: "0 10px 0 36px", fontSize: 12, background: "var(--background)", color: "var(--foreground)" }}
                    />
                  </div>
                </div>
                <button 
                  onClick={() => setShowCreateTask(true)}
                  style={{ height: 38, padding: "0 18px", borderRadius: 10, background: "#6366f1", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
                >
                  <i className="bi bi-plus-lg" /> Tạo mới
                </button>
              </div>

              <div className="tasks-table-wrapper custom-scrollbar" style={{ flex: 1, overflowY: "auto", marginBottom: 12, minHeight: 0 }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card)" }}>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>Tiêu đề</th>
                      <th style={{ width: 170, minWidth: 170, textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>Người thực hiện</th>
                      <th style={{ width: 100, minWidth: 100, textAlign: "right", padding: "8px 10px", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>Ngày đến hạn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", padding: "40px" }}>
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600 }}>
                            <i className="bi bi-arrow-repeat spin" style={{ animation: "spin 1s linear infinite" }} /> Đang tải dữ liệu...
                          </div>
                        </td>
                      </tr>
                    ) : filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", padding: "60px" }}>
                          <div style={{ color: "var(--muted-foreground)", fontSize: 14, fontWeight: 600 }}>Không tìm thấy công việc nào</div>
                        </td>
                      </tr>
                    ) : filteredTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((t, i) => {
                      const assignee = t.assigneeName || "Chưa phân công";
                      const unreadCount = t.commentsCount !== undefined ? Math.max(0, (t.commentsCount || 0) - (seenComments[t.id] || 0)) : 0;
                      
                      // Logic tự động xác định trạng thái thực hiện
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const deadlineDate = t.deadline ? new Date(t.deadline) : null;
                      if (deadlineDate) deadlineDate.setHours(0, 0, 0, 0);

                      let statusLabel = "Chưa thực hiện";
                      let statusColor = "#3b82f6"; // Blue

                      if (t.status === "done") {
                        statusLabel = "Hoàn thành";
                        statusColor = "#10b981"; // Green
                      } else if (t.status === "cancelled") {
                        statusLabel = "Huỷ bỏ";
                        statusColor = "#94a3b8"; // Gray
                      } else if (deadlineDate && today > deadlineDate) {
                        statusLabel = "Quá hạn";
                        statusColor = "#ef4444"; // Red
                      } else if (t.status === "in_progress") {
                        statusLabel = "Đang thực hiện";
                        statusColor = "#f59e0b"; // Orange
                      } else if (t.status === "pending") {
                        statusLabel = "Chưa thực hiện";
                        statusColor = "#3b82f6";
                      }

                      return (
                        <tr 
                          key={t.id} 
                          onClick={() => { setSelectedTask(t); setShowDetail(true); }}
                          style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.2s" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "var(--muted)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "5px 10px", borderBottom: "1px solid var(--border)", maxWidth: 350, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                              {t.title?.startsWith("[KH MKT]") ? (
                                <>
                                  <span style={{
                                    fontSize: 8.5, fontWeight: 800,
                                    background: "rgba(99, 102, 241, 0.1)", color: "#6366f1",
                                    padding: "1.5px 5px", borderRadius: 4,
                                    textTransform: "uppercase", letterSpacing: "0.03em",
                                    border: "1px solid rgba(99, 102, 241, 0.18)",
                                    flexShrink: 0
                                  }}>
                                    KH MKT
                                  </span>
                                  <span style={{
                                    fontSize: 13, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2,
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0
                                  }}>
                                    {t.title.replace("[KH MKT]", "").trim()}
                                  </span>
                                </>
                              ) : (
                                <span style={{
                                  fontSize: 13, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0
                                }}>
                                  {t.title}
                                </span>
                              )}
                              {unreadCount > 0 && (
                                <span style={{
                                  background: "#ef4444", color: "#fff",
                                  fontSize: "9.5px", fontWeight: "bold",
                                  borderRadius: "50%",
                                  width: "17px", height: "17px",
                                  minWidth: "17px", minHeight: "17px",
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0, lineHeight: 1, textAlign: "center", marginLeft: "6px",
                                  boxShadow: "0 2px 5px rgba(239, 68, 68, 0.3)"
                                }}>
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                            {(() => {
                              const getTaskProgress = (task: any): number => {
                                if (task.progress !== undefined) return task.progress;
                                if (task.status === "done") return 100;
                                try {
                                  if (task.actualResult) {
                                    const parsed = JSON.parse(task.actualResult);
                                    if (Array.isArray(parsed) && parsed.length > 0) {
                                      return parsed[parsed.length - 1].p || 0;
                                    }
                                    if (parsed && parsed.p !== undefined) return parsed.p;
                                  }
                                } catch (e) {}
                                return 0;
                              };

                              const progressVal = getTaskProgress(t);
                              return (
                                <span style={{ 
                                  fontSize: 9, fontWeight: 800, 
                                  color: statusColor, 
                                  marginTop: 1, display: "block", textTransform: "uppercase" 
                                }}>
                                  {statusLabel} | Hoàn thành: {progressVal}%
                                  {t.creatorName ? ` | Người giao: ${t.creatorName}` : ""}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ width: 170, minWidth: 170, padding: "5px 10px", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                              <div style={{ width: 26, height: 26, borderRadius: "50%", background: t.assigneeName ? "#6366f1" : "#ef4444", color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, textTransform: "uppercase", flexShrink: 0 }}>
                                {assignee.split(" ").map((n: string) => n[0]).join("").slice(-2)}
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>{assignee}</span>
                            </div>
                          </td>
                          <td style={{ width: 100, minWidth: 100, padding: "14px 10px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                              {t.deadline ? new Date(t.deadline).toLocaleDateString("vi-VN") : "---"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination 
                page={currentPage} 
                totalPages={Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)} 
                onChange={setCurrentPage} 
              />
            </div>
          </motion.div>
        </div>
      
      {/* Floating Robot Icon like in image */}
      <div style={{ position: "fixed", bottom: 20, right: 30, width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 16px rgba(99, 102, 241, 0.3)", cursor: "pointer", zIndex: 10 }}>
        <i className="bi bi-robot" style={{ color: "#fff", fontSize: 20 }} />
      </div>

      {/* ── Task Detail Offcanvas ── */}
      <AnimatePresence>
        {showDetail && (
          <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowDetail(false)}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 9998, backdropFilter: "blur(4px)" }}
              />
              <motion.div 
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 400, minWidth: 400, maxWidth: 400, background: "var(--card)", zIndex: 9999, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid var(--border)" }}
              >
                {/* Fixed Content Wrapper (No Scroll) */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 16px", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Chi tiết công việc</span>
                    <button 
                      onClick={() => setShowDetail(false)}
                      style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer", color: "var(--muted-foreground)", padding: "2px 4px", lineHeight: 1 }}
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  {selectedTask && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
                      <div style={{ flexShrink: 0 }}>
                        {selectedTask.title?.startsWith("[KH MKT]") ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 1 }}>
                            <div style={{ display: "flex" }}>
                              <span style={{
                                fontSize: 8.5, fontWeight: 800,
                                background: "rgba(99, 102, 241, 0.1)", color: "#6366f1",
                                padding: "1.5px 5px", borderRadius: 4,
                                textTransform: "uppercase", letterSpacing: "0.03em",
                                border: "1px solid rgba(99, 102, 241, 0.18)"
                              }}>
                                KH MKT
                              </span>
                            </div>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>
                              {selectedTask.title.replace("[KH MKT]", "").trim()}
                            </h4>
                          </div>
                        ) : (
                          <h4 style={{ margin: "1px 0 0", fontSize: 15, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>{selectedTask.title}</h4>
                        )}
                      </div>
                      
                      {/* Status and Progress labels side-by-side without wrapping */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trạng thái & Tiến độ</span>
                          <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                             {/* Task Status */}
                             <span style={{ 
                                 fontSize: 10, fontWeight: 800, 
                                 padding: "3px 8px", borderRadius: 4,
                                 background: (() => {
                                   if (selectedTask.status === "done") return "color-mix(in srgb, #10b981 15%, transparent)";
                                   if (selectedTask.status === "in_progress") return "color-mix(in srgb, #3b82f6 15%, transparent)";
                                   if (selectedTask.status === "cancelled") return "color-mix(in srgb, #ef4444 15%, transparent)";
                                   return "var(--muted)";
                                 })(),
                                 color: (() => {
                                   if (selectedTask.status === "done") return "#10b981";
                                   if (selectedTask.status === "in_progress") return "#3b82f6";
                                   if (selectedTask.status === "cancelled") return "#ef4444";
                                   return "var(--muted-foreground)";
                                 })(), 
                                 textTransform: "uppercase" 
                              }}>
                                {(() => {
                                  if (selectedTask.status === "done") return "Hoàn thành";
                                  if (selectedTask.status === "in_progress") return "Đang thực hiện";
                                  if (selectedTask.status === "cancelled") return "Đã huỷ";
                                  return "Chờ thực hiện";
                                })()}
                              </span>

                             {/* Progress Status */}
                             <span style={{ 
                                 fontSize: 10, fontWeight: 800, 
                                 padding: "3px 8px", borderRadius: 4,
                                 background: (() => {
                                   const today = new Date(); today.setHours(0,0,0,0);
                                   const deadline = selectedTask.deadline ? new Date(selectedTask.deadline) : null;
                                   if (selectedTask.status === "done") return "color-mix(in srgb, #10b981 15%, transparent)";
                                   if (deadline && today > deadline) return "color-mix(in srgb, #ef4444 15%, transparent)";
                                   return "color-mix(in srgb, #10b981 15%, transparent)";
                                 })(),
                                 color: (() => {
                                   const today = new Date(); today.setHours(0,0,0,0);
                                   const deadline = selectedTask.deadline ? new Date(selectedTask.deadline) : null;
                                   if (selectedTask.status === "done") return "#10b981";
                                   if (deadline && today > deadline) return "#ef4444";
                                   return "#10b981";
                                 })(), 
                                 textTransform: "uppercase" 
                              }}>
                                {(() => {
                                  const today = new Date(); today.setHours(0,0,0,0);
                                  const deadline = selectedTask.deadline ? new Date(selectedTask.deadline) : null;
                                  if (selectedTask.status === "done") return "Đúng hạn";
                                  if (deadline && today > deadline) return "Quá hạn";
                                  return "Đúng hạn";
                                })()}
                              </span>
                          </div>
                        </div>

                        {/* Dates grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ngày bắt đầu</span>
                            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                               {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString("vi-VN") : "---"}
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hạn chót</span>
                            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                               {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString("vi-VN") : "---"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: "var(--background)", padding: "8px 12px", borderRadius: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 10 }}>
                              {(selectedTask.assigneeName || "CN").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>{selectedTask.assigneeName || "Chưa phân công"}</p>
                              <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>Nhân viên phụ trách</p>
                            </div>
                          </div>
                          <button 
                            disabled={!selectedTask.monthlyPlan?.id}
                            onClick={() => {
                              if (selectedTask.monthlyPlan?.id) {
                                const redirectUrl = planRedirectPathPattern
                                  ? planRedirectPathPattern.replace("{planId}", selectedTask.monthlyPlan.id).replace("{taskId}", selectedTask.id)
                                  : `/marketing/plan/monthly?id=${selectedTask.monthlyPlan.id}&focusTask=${selectedTask.id}`;
                                window.location.href = redirectUrl;
                              }
                            }}
                            style={{ 
                              padding: "6px 14px", fontSize: 11, fontWeight: 700, 
                              borderRadius: 8, border: "1px solid var(--border)", 
                              background: selectedTask.monthlyPlan?.id ? "var(--card)" : "var(--background)",
                              color: selectedTask.monthlyPlan?.id ? "#6366f1" : "var(--muted-foreground)",
                              cursor: selectedTask.monthlyPlan?.id ? "pointer" : "not-allowed",
                              display: "inline-flex", alignItems: "center", gap: 5,
                              transition: "all 0.2s",
                              boxShadow: selectedTask.monthlyPlan?.id ? "0 2px 4px rgba(99, 102, 241, 0.1)" : "none"
                            }}
                          >
                            <i className="bi bi-eye" /> Chi tiết
                          </button>
                        </div>
                      </div>




                      {/* ── Progress and Report Logs Section ── */}
                      {(() => {
                        const getParsedReports = (actualResult: string | undefined | null) => {
                          try {
                            if (!actualResult) return [];
                            const parsed = JSON.parse(actualResult);
                            if (Array.isArray(parsed)) return parsed;
                            if (parsed.p !== undefined) return [parsed];
                            return [];
                          } catch {
                            return actualResult ? [{ p: 0, c: actualResult, d: new Date().toISOString().split('T')[0] }] : [];
                          }
                        };
                        const list = getParsedReports(selectedTask.actualResult);
                        const progress = selectedTask.status === "done" ? 100 : (list.length > 0 ? (list[list.length - 1].p || 0) : 0);
                        const pColor = progress >= 80 ? "#059669" : progress >= 40 ? "#2563eb" : progress > 0 ? "#ea580c" : "#94a3b8";

                        return (
                          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tiến độ báo cáo</span>
                              <span style={{ fontSize: 11, fontWeight: 800, color: pColor }}>{progress}%</span>
                            </div>
                            <div style={{ height: 6, background: "var(--border)", borderRadius: 3, position: "relative", overflow: "hidden", marginBottom: 4 }}>
                              <div style={{ height: "100%", width: `${progress}%`, background: pColor, borderRadius: 3 }} />
                            </div>

                            {list.length > 0 && (
                              <div style={{ marginTop: 4 }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Báo cáo kết quả ({list.length})</span>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 120, overflowY: "auto", background: "var(--background)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)" }} className="custom-scrollbar">
                                  {[...list].reverse().map((rep: any, idx: number) => (
                                    <div key={rep.id || idx} style={{ borderBottom: idx < list.length - 1 ? "1px dashed var(--border)" : "none", paddingBottom: idx < list.length - 1 ? 6 : 0, marginBottom: idx < list.length - 1 ? 6 : 0 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)" }}>Tiến độ: {rep.p}%</span>
                                        <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
                                          {(() => {
                                            const dObj = new Date(rep.id || rep.d);
                                            if (isNaN(dObj.getTime())) return new Date(rep.d).toLocaleDateString('vi-VN');
                                            return `${dObj.getHours().toString().padStart(2, '0')}:${dObj.getMinutes().toString().padStart(2, '0')} ${dObj.toLocaleDateString('vi-VN')}`;
                                          })()}
                                        </span>
                                      </div>
                                      <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{rep.c}</p>
                                      {rep.f && (
                                        <div style={{ marginTop: 4 }}>
                                          <a href={rep.f} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.06)", padding: "2px 6px", borderRadius: 4, textDecoration: "none" }}>
                                            <i className="bi bi-file-earmark-text" /> {rep.fn || "Minh chứng"}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}


                      {/* ── Discussion Section (Now with dedicated Scrollbar) ── */}
                      <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 15, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Thảo luận nội bộ</span>
                        
                        <div style={{ flex: 1, marginTop: 12, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", paddingRight: 5 }}>
                          {comments.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: 12 }}>Chưa có thảo luận nào cho công việc này.</div>
                          ) : comments.map((c) => {
                            const isMe = c.userId === session?.user?.id;
                            const initials = (c.userName || "CN").split(" ").map((n: string) => n[0]).join("").slice(-2).toUpperCase();
                            
                            return (
                              <div key={c.id} style={{ display: "flex", gap: 10, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-start" }}>
                                 <div style={{ 
                                   width: 28, height: 28, borderRadius: "50%", 
                                   background: isMe ? "#6366f1" : "#8b5cf6", 
                                   color: "#fff", 
                                   display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0, marginTop: 2
                                 }}>
                                   {initials}
                                 </div>
                                 <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                                   <div style={{ 
                                     background: isMe ? "rgba(99, 102, 241, 0.08)" : "var(--accent)", 
                                     padding: "8px 12px", 
                                     borderRadius: isMe ? "14px 4px 14px 14px" : "4px 14px 14px 14px", 
                                     fontSize: 12, color: "var(--foreground)", 
                                     border: isMe ? "1px solid rgba(99, 102, 241, 0.12)" : "1px solid var(--border)",
                                     boxShadow: "0 2px 4px rgba(0,0,0,0.01)",
                                     display: "flex",
                                     flexDirection: "column",
                                     alignItems: isMe ? "flex-end" : "flex-start"
                                   }}>
                                     <div style={{ fontWeight: 800, marginBottom: 2, color: isMe ? "#6366f1" : "var(--foreground)", fontSize: 11 }}>{c.userName}</div>
                                     <div style={{ lineHeight: 1.4, fontSize: 12, textAlign: isMe ? "right" : "left" }}>{c.content}</div>
                                     {c.attachmentUrl && (
                                       <a 
                                         href={c.attachmentUrl} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         style={{ 
                                           display: "flex", alignItems: "center", gap: 6, 
                                           marginTop: 6, padding: "6px 10px", 
                                           background: "rgba(0,0,0,0.05)", borderRadius: 6,
                                           fontSize: 11, color: "#6366f1", textDecoration: "none",
                                           border: "1px dashed rgba(99, 102, 241, 0.3)"
                                         }}
                                       >
                                         <i className="bi bi-file-earmark-arrow-down" />
                                         <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                           {c.attachmentName || "Đính kèm"}
                                         </span>
                                       </a>
                                     )}
                                     <div style={{ fontSize: 9, color: "var(--muted-foreground)", marginTop: 4, opacity: 0.8 }}>
                                       {new Date(c.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                                     </div>
                                   </div>
                                 </div>
                              </div>
                            );
                          })}
                          <div ref={commentsEndRef} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fixed Input at Bottom */}
                <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", background: "var(--card)" }}>
                  <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
                  <div style={{ position: "relative" }}>
                    <div 
                      onClick={() => {
                        console.log("[Paperclip] Clicked");
                        fileInputRef.current?.click();
                      }}
                      style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: uploading ? "#cbd5e1" : "#6366f1", cursor: uploading ? "wait" : "pointer" }}
                    >
                      <i className={uploading ? "bi bi-arrow-repeat spin" : "bi bi-paperclip"} style={{ fontSize: 16 }} />
                    </div>
                    <input 
                      type="text" 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                      placeholder={uploading ? "Đang tải file..." : "Nhập nội dung thảo luận..."}
                      disabled={uploading}
                      style={{ width: "100%", height: 38, borderRadius: 10, border: "1px solid var(--border)", padding: "0 45px 0 36px", fontSize: 13, outline: "none", background: "var(--background)", color: "var(--foreground)", transition: "all 0.2s" }}
                      onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "var(--card)"; e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.background = "var(--background)"; e.target.style.boxShadow = "none"; }}
                    />
                    <button 
                      onClick={() => handleSendComment()}
                      disabled={sendingComment || uploading}
                      style={{ 
                        position: "absolute", right: 4, top: 4, width: 30, height: 30, borderRadius: 8, 
                        background: commentText.trim() ? "#6366f1" : "var(--muted)", 
                        border: "none", 
                        color: commentText.trim() ? "#fff" : "var(--muted-foreground)", 
                        display: "flex", alignItems: "center", justifyContent: "center", 
                        cursor: commentText.trim() ? "pointer" : "default", 
                        transition: "all 0.15s", 
                        boxShadow: commentText.trim() ? "0 2px 6px rgba(99,102,241,0.3)" : "none"
                      }} 
                    >
                      <i className="bi bi-send-fill" style={{ fontSize: 12 }} />
                    </button>
                  </div>
                </div>
              </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .tasks-main-container {
          display: grid;
          grid-template-columns: 340px 1fr;
          grid-template-areas:
            "left right";
          gap: 20px;
          height: calc(100vh - 120px);
          min-height: 0;
        }
        .tasks-left-panel {
          grid-area: left;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .tasks-right-panel {
          grid-area: right;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        @media (max-width: 1024px) {
          .tasks-main-container {
            grid-template-columns: 1fr 1.2fr !important;
            grid-template-areas:
              "left right" !important;
            height: auto !important;
            min-height: auto !important;
            overflow-y: auto !important;
            gap: 16px !important;
          }
          .tasks-left-panel {
            height: auto !important;
            min-height: auto !important;
          }
          .tasks-right-panel {
            height: auto !important;
            min-height: auto !important;
          }
          .tasks-right-card {
            min-height: 500px !important;
          }
          .tasks-table-wrapper {
            overflow-x: auto !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .tasks-table-wrapper table {
            min-width: 650px !important; /* Force horizontal scroll for table columns on very narrow screens */
          }
        }
        @media (max-width: 640px) {
          .tasks-main-container {
            grid-template-columns: 1fr !important;
            grid-template-areas:
              "left"
              "right" !important;
          }
          .tasks-filter-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .tasks-filter-bar > div {
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .tasks-filter-bar select, .tasks-filter-bar input {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}} />

      {/* OFF CANVAS CREATE TASK */}
      {showCreateTask && (
        <>
          <div 
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040, backdropFilter: "blur(2px)" }}
            onClick={() => setShowCreateTask(false)}
          />
          <div 
            className="offcanvas offcanvas-start show" 
            style={{ width: 400, zIndex: 1050, visibility: "visible", display: "flex", flexDirection: "column", background: "var(--background)", borderRight: "1px solid var(--border)", boxShadow: "2px 0 12px rgba(0,0,0,0.1)" }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Tạo công việc mới</h5>
              <button 
                onClick={() => setShowCreateTask(false)}
                style={{ background: "none", border: "none", fontSize: 20, color: "var(--muted-foreground)", cursor: "pointer" }}
              ><i className="bi bi-x-lg" /></button>
            </div>
            
            <form onSubmit={handleCreateTask} style={{ padding: "20px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Tiêu đề <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  value={createTaskForm.title}
                  onChange={e => setCreateTaskForm({...createTaskForm, title: e.target.value})}
                  className="form-control" 
                  style={{ fontSize: 13, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Độ ưu tiên</label>
                  <select 
                    value={createTaskForm.priority}
                    onChange={e => setCreateTaskForm({...createTaskForm, priority: e.target.value})}
                    className="form-select" 
                    style={{ fontSize: 13, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Người giao việc</label>
                  <select 
                    value={createTaskForm.creatorId}
                    onChange={e => setCreateTaskForm({...createTaskForm, creatorId: e.target.value})}
                    className="form-select" 
                    style={{ fontSize: 13, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    <option value="">Mặc định (Hệ thống)</option>
                    {marketingEmployees.map(emp => (
                      <option key={emp.userId} value={emp.userId}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Phòng ban</label>
                  <select 
                    value={createTaskForm.filterDeptName}
                    onChange={e => {
                      setCreateTaskForm({ ...createTaskForm, filterDeptName: e.target.value, assigneeId: "" });
                    }}
                    className="form-select" 
                    style={{ fontSize: 13, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    <option value="">Tất cả phòng ban</option>
                    {Array.from(new Set(marketingEmployees.map(emp => emp.departmentName).filter(Boolean))).map((deptName: any) => (
                      <option key={deptName} value={deptName}>{deptName}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Người thực hiện <span className="text-danger">*</span></label>
                  <select 
                    value={createTaskForm.assigneeId}
                    onChange={e => setCreateTaskForm({...createTaskForm, assigneeId: e.target.value})}
                    className="form-select" 
                    style={{ fontSize: 13, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                    required
                  >
                    <option value="">Chọn nhân sự...</option>
                    {marketingEmployees
                      .filter(emp => !createTaskForm.filterDeptName || emp.departmentName === createTaskForm.filterDeptName)
                      .map(emp => (
                      <option key={emp.userId} value={emp.userId}>{emp.fullName}{!createTaskForm.filterDeptName ? ` - ${emp.departmentName}` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Ngày bắt đầu</label>
                  <input 
                    type="date" 
                    value={createTaskForm.startDate}
                    onChange={e => setCreateTaskForm({...createTaskForm, startDate: e.target.value})}
                    className="form-control" 
                    style={{ fontSize: 13, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Ngày đến hạn</label>
                  <input 
                    type="date" 
                    value={createTaskForm.dueDate}
                    onChange={e => setCreateTaskForm({...createTaskForm, dueDate: e.target.value})}
                    className="form-control" 
                    style={{ fontSize: 13, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Mô tả chi tiết</label>
                <textarea 
                  value={createTaskForm.description}
                  onChange={e => setCreateTaskForm({...createTaskForm, description: e.target.value})}
                  className="form-control" 
                  style={{ flex: 1, fontSize: 13, background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", resize: "none" }}
                />
              </div>

              <div style={{ marginTop: "auto", paddingTop: 16 }}>
                <button 
                  type="submit" 
                  disabled={creatingTask}
                  style={{ width: "100%", height: 42, background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13 }}
                >
                  {creatingTask ? "Đang tạo..." : "Xác nhận tạo"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
