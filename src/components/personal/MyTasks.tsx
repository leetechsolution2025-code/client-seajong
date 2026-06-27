"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { GanttChart } from "@/components/ui/GanttChart";

// ── Types ──────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  status: string;
  deadline?: string;
  assigneeName?: string;
  category?: string;
  taskType?: string;
  channel?: string;
  week1?: boolean;
  week2?: boolean;
  week3?: boolean;
  week4?: boolean;
  progress?: number;        // 0-100
  description?: string;
  monthlyPlan?: { month: number; year?: number };
  notes?: string;
  isGeneric?: boolean;
  createdAt?: string;
  commentsCount?: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userName?: string;
  userId?: string;
  authorName?: string; // Legacy/Compat
  authorId?: string;   // Legacy/Compat
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface MyTasksProps {
  /** Chế độ compact: ẩn PageHeader, thu gọn bố cục — dùng khi nhúng vào widget/panel */
  compact?: boolean;
  /** Giới hạn số task hiển thị (dùng khi compact) */
  maxItems?: number;
  /** Tên nhân viên cụ thể, mặc định lấy từ session */
  employeeName?: string;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getStatusMeta(task: Task): { label: string; color: string; bg: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = task.deadline ? new Date(task.deadline) : null;
  if (dl) dl.setHours(0, 0, 0, 0);

  const progress = getTaskProgress(task);

  // ✅ Hoàn thành
  if (task.status === "done" || progress >= 100)
    return { label: "Hoàn thành", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" };

  // 🔴 Quá hạn — chưa xong mà đã qua deadline
  if (dl && today > dl)
    return { label: "Quá hạn", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };

  if (task.status === "in_progress" || progress > 0) {
    const days = dl ? Math.round((dl.getTime() - today.getTime()) / 86400000) : null;
    // 🟠 Chậm tiến độ — đang làm nhưng sắp đến hạn (< 3 ngày)
    if (days !== null && days < 3)
      return { label: "Chậm tiến độ", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" };
    // 🔵 Đúng tiến độ
    return { label: "Đúng tiến độ", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" };
  }

  // ⚫ Tất cả còn lại (pending, cancelled, không xác định)
  return { label: "Chưa thực hiện", color: "var(--muted-foreground)", bg: "var(--border)" };
}

function daysUntil(deadline?: string): number | null {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline); dl.setHours(0, 0, 0, 0);
  return Math.round((dl.getTime() - today.getTime()) / 86400000);
}

function getTaskProgress(task: any): number {
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

  const weeksArr = [task.week1, task.week2, task.week3, task.week4];
  const weeksDone = weeksArr.filter(Boolean).length;
  if (task.status === "in_progress") {
    return Math.round((weeksDone / 4) * 100);
  }
  return 0;
}

/** 
 * Tính toán xem task có nằm trong 4 tuần của một tháng cụ thể hay không 
 */
function calculateTaskWeeks(task: Task, filterMonth: number) {
  // Nếu task có tuần cố định và có dữ liệu tuần thực tế được thiết lập, dùng dữ liệu gốc trực tiếp
  if (task.week1 || task.week2 || task.week3 || task.week4) {
    return [task.week1, task.week2, task.week3, task.week4];
  }

  // Mặc định hoặc Task linh hoạt: Tính toán theo [createdAt, deadline]
  const start = task.createdAt ? new Date(task.createdAt) : new Date();
  const end = task.deadline ? new Date(task.deadline) : start;
  const year = new Date().getFullYear();
  const daysInMonth = new Date(year, filterMonth, 0).getDate();

  const ranges = [
    { s: 1, e: 7 }, { s: 8, e: 14 }, { s: 15, e: 21 }, { s: 22, e: daysInMonth }
  ];

  return ranges.map(r => {
    const weekStart = new Date(year, filterMonth - 1, r.s, 0, 0, 0);
    const weekEnd = new Date(year, filterMonth - 1, r.e, 23, 59, 59);
    return (start <= weekEnd && end >= weekStart);
  });
}

/** 
 * Tính ngày bắt đầu của task dựa trên tuần hoạt động đầu tiên
 */
function getTaskStartDate(task: Task): Date {
  const planYear = task.monthlyPlan?.year || (task.createdAt ? new Date(task.createdAt).getFullYear() : new Date().getFullYear());
  const planMonth = task.monthlyPlan?.month || (task.deadline ? new Date(task.deadline).getMonth() + 1 : new Date().getMonth() + 1);

  if (task.week1 || task.week2 || task.week3 || task.week4) {
    const weeksArr = [task.week1, task.week2, task.week3, task.week4];
    const firstActiveWeek = weeksArr.indexOf(true);
    if (firstActiveWeek >= 0) {
      const startDays = [1, 8, 15, 22];
      return new Date(planYear, planMonth - 1, startDays[firstActiveWeek]);
    }
  }
  return task.createdAt ? new Date(task.createdAt) : new Date();
}

function DeadlineBadge({ deadline }: { deadline?: string }) {
  if (!deadline) return <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Không có hạn</span>;
  const days = daysUntil(deadline);
  const d = new Date(deadline);
  const date = d.toLocaleDateString("vi-VN");
  const time = d.getHours() !== 0 || d.getMinutes() !== 0 
    ? d.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) 
    : "";
  
  const displayDate = time ? `${time} - ${date}` : date;
  let color = "var(--muted-foreground)", bg = "var(--border)", text = displayDate;

  if (days !== null) {
    if (days < 0)      { color = "#ef4444"; bg = "rgba(239, 68, 68, 0.15)"; text = `${date} (trễ ${Math.abs(days)} ngày)`; }
    else if (days === 0) { color = "#f97316"; bg = "rgba(249, 115, 22, 0.15)"; text = `${date} (hôm nay)`; }
    else if (days <= 3)  { color = "#f97316"; bg = "rgba(249, 115, 22, 0.15)"; text = `${date} (còn ${days} ngày)`; }
    else                 { text = `${date} (còn ${days} ngày)`; }
  }

  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: "2px 8px", borderRadius: 5 }}>
      {text}
    </span>
  );
}

function Avatar({ name, size = 32, src, color }: { name: string; size?: number; src?: string; color?: string }) {
  const getInitials = (n: string) => {
    if (!n || n === "?") return "?";
    const parts = n.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 50%)`;
  };

  const bgColor = color || (name && name !== "?" ? stringToColor(name) : "#6366f1");
  const initials = getInitials(name);

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: src ? "transparent" : bgColor,
      color: "#fff", fontSize: size * 0.4, display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 800, flexShrink: 0,
      overflow: "hidden", border: src ? "1px solid #e2e8f0" : "none"
    }}>
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, delay = 0 }: {
  label: string; value: number; icon: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.28 }}
      style={{
        background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)",
        padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 18, color }} />
      </div>
      <div>
        <div style={{ fontSize: 21, fontWeight: 900, color: "var(--foreground)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginTop: 3 }}>{label}</div>
      </div>
    </motion.div>
  );
}

// ── Task Row (Table) ───────────────────────────────────────────────────────
function TaskRow({ task, onClick, index, filterMonth, unreadCount }: { task: Task; onClick: () => void; index: number; filterMonth: number; unreadCount: number }) {
  const meta = getStatusMeta(task);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.tr
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        background: hovered ? "var(--muted)" : "transparent",
        transition: "background 0.15s"
      }}
    >
      {/* Title */}
      <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", maxWidth: 280 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, lineHeight: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
            {task.title?.startsWith("[KH MKT]") ? (
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
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {task.title.replace("[KH MKT]", "").trim()}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.title}
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
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: meta.color, letterSpacing: "0.05em" }}>
            {meta.label}
          </span>
        </div>
      </td>

      {/* Weeks */}
      <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 3 }}>
          {calculateTaskWeeks(task, filterMonth).map((w, i) => {
            const year = new Date().getFullYear();
            const daysInMonth = new Date(year, filterMonth, 0).getDate();
            const range = [
              { s: 1, e: 7 }, { s: 8, e: 14 }, { s: 15, e: 21 }, { s: 22, e: daysInMonth }
            ][i];
            const getDayOfWeekName = (d: number) => {
              const date = new Date(year, filterMonth - 1, d);
              const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
              return dayNames[date.getDay()];
            };
            const tooltip = `Tuần ${i + 1}: ${getDayOfWeekName(range.s)} (${range.s}) - ${getDayOfWeekName(range.e)} (${range.e}) / Tháng ${filterMonth}`;
            return (
              <div key={i} title={tooltip} style={{
                width: 18, height: 18, borderRadius: 5,
                background: w ? "#6366f1" : "var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {w && <i className="bi bi-check" style={{ fontSize: 10, color: "#fff", fontWeight: 900 }} />}
                {!w && <span style={{ fontSize: 7.5, color: "var(--muted-foreground)", fontWeight: 700 }}>T{i + 1}</span>}
              </div>
            );
          })}
        </div>
      </td>

      {/* Bắt đầu */}
      <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", fontSize: 11, color: "var(--muted-foreground)" }}>
        {getTaskStartDate(task).toLocaleDateString("vi-VN")}
      </td>

      {/* Deadline */}
      <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
        <DeadlineBadge deadline={task.deadline} />
      </td>

      {/* Progress */}
      <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", width: 100 }}>
        {(() => {
          const progress = getTaskProgress(task);
          const pColor = progress >= 80 ? "#059669" : progress >= 40 ? "#2563eb" : progress > 0 ? "#ea580c" : "#94a3b8";
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
              <div style={{ flex: 1, height: 5, background: "var(--border)", borderRadius: 4, overflow: "hidden", minWidth: 50 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: index * 0.04 + 0.15, duration: 0.5, ease: "easeOut" }}
                  style={{ height: "100%", background: pColor, borderRadius: 4 }}
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: pColor, minWidth: 30, textAlign: "right" }}>
                {progress}%
              </span>
            </div>
          );
        })()}
      </td>

      {/* Arrow */}
      <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", width: 40 }}>
        <i className="bi bi-chevron-right" style={{ fontSize: 12, color: "var(--muted-foreground)" }} />
      </td>
    </motion.tr>
  );
}

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
        <div style={{ fontSize: 9, fontWeight: 900, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>
          Mô tả công việc
        </div>
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

// ── Task Detail Offcanvas ──────────────────────────────────────────────────

function TaskDetailPanel({
  task, onClose, onStatusChange, onTaskUpdate, onCommentsLoaded
}: {
  task: Task;
  onClose: () => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onTaskUpdate?: (taskId: string, partialData: any) => void;
  onCommentsLoaded?: (taskId: string, count: number) => void;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "report">("info");

  const getParsedReports = useCallback((actualResult: string | undefined | null) => {
    try {
      if (!actualResult) return [];
      const parsed = JSON.parse(actualResult);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.p !== undefined) return [parsed];
      return [];
    } catch {
      return actualResult ? [{ p: 0, c: actualResult, d: new Date().toISOString().split('T')[0] }] : [];
    }
  }, []);

  const initReports = getParsedReports((task as any).actualResult);
  const [reportHistory, setReportHistory] = useState<any[]>(initReports);
  const latestReport = initReports.length > 0 ? initReports[initReports.length - 1] : null;

  const [reportProgress, setReportProgress] = useState(latestReport?.p || 0);
  const [initialProgress, setInitialProgress] = useState(latestReport?.p || 0);
  const [reportContent, setReportContent] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [uploadingReportFile, setUploadingReportFile] = useState(false);
  const [reportFileUrl, setReportFileUrl] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const meta = getStatusMeta(task);

  // Sync state when switching task
  useEffect(() => {
    const list = getParsedReports((task as any).actualResult);
    setReportHistory(list);
    const lst = list.length > 0 ? list[list.length - 1] : null;
    setReportProgress(lst?.p || 0);
    setInitialProgress(lst?.p || 0);
    setReportContent("");
    setReportDate(new Date().toISOString().split('T')[0]);
    setReportFileUrl(null);
    setReportFileName(null);
  }, [task, getParsedReports]);

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReportFile(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setReportFileUrl(data.url);
        setReportFileName(file.name);
      }
    } catch {
       alert("Lỗi upload file minh chứng.");
    } finally {
      setUploadingReportFile(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Handle submit report
  const handleSubmitReport = async () => {
    setIsSubmittingReport(true);
    
    const finalContent = reportContent.trim() || `Cập nhật tiến độ lên ${reportProgress}%`;
    const newReport = { p: reportProgress, c: finalContent, d: new Date().toISOString(), id: Date.now(), f: reportFileUrl, fn: reportFileName };
    const newArr = [...reportHistory, newReport];
    
    try {
      const payloadStr = JSON.stringify(newArr);
      
      // Auto transition status based on progress
      let newStatus = task.status;
      const patchData: Record<string, any> = { actualResult: payloadStr };
      if (reportProgress === 100) {
        patchData.status = "done";
        newStatus = "done";
      } else if (reportProgress > 0 && task.status === "pending") {
        patchData.status = "in_progress";
        newStatus = "in_progress";
      }
      
      const apiPath = (task as any).isGeneric ? `/api/board/tasks/${task.id}` : `/api/marketing/tasks/${task.id}`;
      await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
      
      setReportHistory(newArr);
      setReportContent("");
      setReportFileUrl(null);
      setReportFileName(null);
      setInitialProgress(reportProgress);
      if (onTaskUpdate) {
        onTaskUpdate(task.id, { actualResult: payloadStr, status: newStatus });
      }
    } catch (err) {
      console.error("Submit report failed", err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Fetch comments
  const fetchComments = useCallback(() => {
    const apiPath = (task as any).isGeneric ? `/api/board/tasks/${task.id}/comments` : `/api/marketing/tasks/${task.id}/comments`;
    fetch(apiPath, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { 
        if (Array.isArray(d)) {
          setComments(d);
          if (onCommentsLoaded) onCommentsLoaded(task.id, d.length);
        }
      })
      .catch(() => {});
  }, [task.id, (task as any).isGeneric, onCommentsLoaded]);

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 5000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  const prevCommentsLengthRef = useRef(0);
  useEffect(() => {
    if (comments.length > prevCommentsLengthRef.current) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCommentsLengthRef.current = comments.length;
  }, [comments]);

  const sendComment = async (attachment?: { url: string; name: string }) => {
    if ((!commentText.trim() && !attachment) || sending) return;
    setSending(true);
    try {
      const apiPath = (task as any).isGeneric ? `/api/board/tasks/${task.id}/comments` : `/api/marketing/tasks/${task.id}/comments`;
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText, attachmentUrl: attachment?.url, attachmentName: attachment?.name }),
      });
      if (res.ok) { setCommentText(""); fetchComments(); }
    } finally { setSending(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) await sendComment({ url: d.url, name: file.name });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const apiPath = (task as any).isGeneric ? `/api/board/tasks/${task.id}` : `/api/marketing/tasks/${task.id}`;
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onStatusChange(task.id, newStatus);
      }
    } finally { setUpdatingStatus(false); }
  };

  const weeks = [task.week1, task.week2, task.week3, task.week4];
  const activeWeeks = weeks.filter(Boolean).length;

  const statusOptions = [
    { value: "pending",     label: "Chờ thực hiện",   color: "#2563eb" },
    { value: "in_progress", label: "Đang thực hiện",  color: "#d97706" },
    { value: "done",        label: "Hoàn thành",       color: "#059669" },
    { value: "cancelled",   label: "Đã huỷ",          color: "#94a3b8" },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 9998, backdropFilter: "blur(3px)" }}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 400, maxWidth: "100%",
          background: "var(--card)", zIndex: 9999, display: "flex", flexDirection: "column",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.1)"
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {activeTab === "report" && (
              <button
                onClick={() => setActiveTab("info")}
                style={{
                  border: "none", background: "rgba(255,255,255,0.2)",
                  color: "#fff", width: 28, height: 28, borderRadius: "50%",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <i className="bi bi-chevron-left" style={{ fontSize: 13 }} />
              </button>
            )}
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.2)", display: "flex",
              alignItems: "center", justifyContent: "center"
            }}>
              <i className={`bi ${activeTab === "info" ? "bi-list-check" : "bi-file-earmark-bar-graph"}`} style={{ color: "#fff", fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#fff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {activeTab === "info" ? "Chi tiết công việc" : "Báo cáo kết quả"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            border: "none", background: "rgba(255,255,255,0.15)", color: "#fff",
            width: 32, height: 32, borderRadius: 8, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <i className="bi bi-x-lg" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Content Container - Sliding between tabs */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            {activeTab === "info" ? (
              <motion.div
                key="info"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}
              >
                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                  {/* Task Title in Body */}
                  {task.title?.startsWith("[KH MKT]") ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                      <div style={{ display: "flex" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800,
                          background: "rgba(99, 102, 241, 0.12)", color: "#6366f1",
                          padding: "2px 6px", borderRadius: 5,
                          textTransform: "uppercase", letterSpacing: "0.05em",
                          border: "1px solid rgba(99, 102, 241, 0.22)"
                        }}>
                          KH MKT
                        </span>
                      </div>
                      <h2 style={{ fontSize: 13.5, fontWeight: 800, color: "var(--foreground)", margin: 0, lineHeight: 1.45 }}>
                        {task.title.replace("[KH MKT]", "").trim()}
                      </h2>
                    </div>
                  ) : (
                    <h2 style={{ fontSize: 13.5, fontWeight: 800, color: "var(--foreground)", margin: "0 0 14px", lineHeight: 1.45 }}>
                      {task.title}
                    </h2>
                  )}

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {/* Status */}
            <div style={{ padding: "10px 14px", background: "var(--muted)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>Trạng thái</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {/* Main Lifestyle Status */}
                {(() => {
                  const s = task.status || "pending";
                  const labels: Record<string, string> = { "pending": "Chưa thực hiện", "in_progress": "Đang làm", "done": "Hoàn thành", "cancelled": "Huỷ" };
                  const colors: Record<string, string> = { "pending": "var(--muted-foreground)", "in_progress": "#d97706", "done": "#059669", "cancelled": "var(--muted-foreground)" };
                  const bgs: Record<string, string> = { "pending": "var(--border)", "in_progress": "#fff7ed", "done": "#ecfdf5", "cancelled": "var(--border)" };
                  
                  return (
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
                      color: colors[s] || "var(--muted-foreground)", background: bgs[s] || "var(--border)"
                    }}>
                      {labels[s] || s}
                    </span>
                  );
                })()}

                {/* Execution Status (Only show if not redundant and task is active) */}
                {task.status !== "done" && task.status !== "cancelled" && meta.label !== "Chưa thực hiện" && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
                    color: meta.color, background: meta.bg
                  }}>
                    {meta.label}
                  </span>
                )}
              </div>
            </div>

            {/* Deadline */}
            <div style={{ padding: "10px 14px", background: "var(--muted)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>Hạn chót</div>
              <DeadlineBadge deadline={task.deadline} />
            </div>

            {/* Weeks */}
            <div style={{ padding: "10px 14px", background: "var(--muted)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>Thực hiện theo tuần</div>
              <div style={{ display: "flex", gap: 4 }}>
                {weeks.map((w, i) => (
                  <div key={i} style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: w ? "#6366f1" : "var(--border)",
                    color: w ? "#fff" : "var(--muted-foreground)",
                    fontSize: 10, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    T{i + 1}
                  </div>
                ))}
                <span style={{ fontSize: 10, color: "var(--muted-foreground)", alignSelf: "center", marginLeft: 4, fontWeight: 600 }}>
                  ({activeWeeks}/4)
                </span>
              </div>
            </div>

            {/* Refined Report Button */}
            <div style={{ display: "flex" }}>
              <button
                onClick={() => setActiveTab("report")}
                style={{
                  flex: 1, padding: "10px 14px", background: "var(--muted)", borderRadius: 10,
                  border: "1px solid var(--border)", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8, cursor: "pointer",
                  transition: "all 0.15s", color: "#6366f1"
                }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--card)";
                e.currentTarget.style.borderColor = "#6366f1";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(99,102,241,0.1)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "var(--muted)";
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
              >
                <i className="bi bi-file-earmark-bar-graph" style={{ fontSize: 13 }} />
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>Báo cáo</span>
              </button>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div style={{ marginBottom: 16 }}>
              {renderUpgradedDescription(task.description)}
            </div>
          )}


          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", margin: "0 0 20px" }} />

          {/* Comments */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 2 }}>
              Nhật ký và Trao đổi ({comments.length})
            </div>
            <div style={{ fontSize: 9.5, color: "var(--muted-foreground)", fontStyle: "italic", lineHeight: 1.3 }}>
              Kênh thảo luận trực tiếp giữa Nhân viên thực hiện và Giám đốc / Trưởng bộ phận
            </div>
          </div>

          {comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted-foreground)" }}>
              <i className="bi bi-chat-dots" style={{ fontSize: 28, marginBottom: 8, display: "block", opacity: 0.4 }} />
              <div style={{ fontSize: 12, fontWeight: 600 }}>Chưa có trao đổi nào</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {comments.map(c => {
                const authorId = c.userId || c.authorId;
                const authorName = c.userName || c.authorName;
                const isMe = authorId === session?.user?.id;
                const displayName = authorName || (isMe ? (session?.user?.name || "Bạn") : "Nhân viên");

                return (
                  <div key={c.id} style={{ display: "flex", gap: 10, flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-start" }}>
                    <Avatar name={displayName} size={28} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexDirection: isMe ? "row-reverse" : "row" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isMe ? "#6366f1" : "var(--foreground)" }}>{displayName}</span>
                        <span style={{ fontSize: 9.5, color: "var(--muted-foreground)" }}>
                          {new Date(c.createdAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {c.content && (
                        <div style={{
                          background: isMe ? "rgba(99, 102, 241, 0.08)" : "var(--accent, #f1f5f9)",
                          borderRadius: isMe ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                          padding: "8px 12px", fontSize: 12, color: "var(--foreground)", lineHeight: 1.6,
                          border: isMe ? "1px solid rgba(99, 102, 241, 0.15)" : "1px solid var(--border)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.01)"
                        }}>
                          {c.content}
                        </div>
                      )}
                      {c.attachmentUrl && (
                        <a href={c.attachmentUrl} target="_blank" rel="noreferrer" style={{
                          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6,
                          fontSize: 11, fontWeight: 600, color: "#6366f1", textDecoration: "none",
                          background: "rgba(99,102,241,0.1)", padding: "4px 10px", borderRadius: 6
                        }}>
                          <i className="bi bi-paperclip" />
                          {c.attachmentName || "File đính kèm"}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Redesigned Comment Input */}
        <div style={{
          padding: "12px 14px 16px", borderTop: "1px solid var(--border)",
          background: "var(--card)", flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            {/* File button */}
            <input ref={fileRef} type="file" onChange={handleFile} style={{ display: "none" }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Đính kèm file"
              style={{
                width: 34, height: 34, borderRadius: "50%", border: "none",
                background: "var(--muted)", color: uploading ? "var(--muted-foreground)" : "#6366f1",
                cursor: uploading ? "wait" : "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "all 0.15s"
              }}
              onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = "#eef2ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--muted)"; }}
            >
              {uploading
                ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite", fontSize: 13 }} />
                : <i className="bi bi-paperclip" style={{ fontSize: 15 }} />
              }
            </button>

            {/* Textarea */}
            <textarea
              value={commentText}
              onChange={e => {
                setCommentText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault(); sendComment();
                  e.currentTarget.style.height = "auto";
                }
              }}
              placeholder="Viết phản hồi... (Enter gửi)"
              rows={1}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 18, minHeight: 34,
                maxHeight: 120, background: "var(--muted)", border: "1.5px solid transparent",
                color: "var(--foreground)", fontSize: 13, fontFamily: "inherit",
                outline: "none", resize: "none", lineHeight: 1.5,
                transition: "all 0.15s", overflow: "hidden"
              }}
              onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "var(--card)"; }}
              onBlur={e => { e.target.style.borderColor = "transparent"; e.target.style.background = "var(--muted)"; }}
            />

            {/* Send button */}
            <button
              onClick={() => { sendComment(); }}
              disabled={sending || uploading}
              style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: (commentText.trim() && !sending && !uploading) ? "#6366f1" : "var(--muted)",
                border: "none", cursor: (commentText.trim() && !sending && !uploading) ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: (commentText.trim() && !sending && !uploading) ? "#fff" : "var(--muted-foreground)",
                transition: "all 0.15s",
                boxShadow: (commentText.trim() && !sending && !uploading) ? "0 2px 10px rgba(99,102,241,0.4)" : "none"
              }}
            >
              {sending
                ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite", fontSize: 13 }} />
                : <i className="bi bi-send-fill" style={{ fontSize: 13 }} />
              }
            </button>
          </div>
        </div>
      </motion.div>
            ) : (
              <motion.div
                key="report"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column" }}
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "12px 16px 0" }}>
                  <div style={{ marginBottom: 12 }}>
                    {task.title?.startsWith("[KH MKT]") ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                        <div style={{ display: "flex" }}>
                          <span style={{
                            fontSize: 9, fontWeight: 800,
                            background: "rgba(99, 102, 241, 0.12)", color: "#6366f1",
                            padding: "2px 6px", borderRadius: 5,
                            textTransform: "uppercase", letterSpacing: "0.05em",
                            border: "1px solid rgba(99, 102, 241, 0.22)"
                          }}>
                            KH MKT
                          </span>
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--foreground)" }}>
                          {task.title.replace("[KH MKT]", "").trim()}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--foreground)", marginBottom: 8 }}>
                        {task.title}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      {(() => {
                        const s = task.status || "pending";
                        const labels: Record<string, string> = { "pending": "Chưa thực hiện", "in_progress": "Đang thực hiện", "done": "Hoàn thành", "cancelled": "Huỷ" };
                        const colors: Record<string, string> = { "pending": "var(--muted-foreground)", "in_progress": "#d97706", "done": "#059669", "cancelled": "var(--muted-foreground)" };
                        const bgs: Record<string, string> = { "pending": "var(--border)", "in_progress": "#fff7ed", "done": "#ecfdf5", "cancelled": "var(--border)" };
                        return (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5, color: colors[s], background: bgs[s] }}>
                            {labels[s]}
                          </span>
                        );
                      })()}
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5, color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.05em" }}>Ngày báo cáo</div>
                        <input 
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={reportDate}
                          onChange={e => setReportDate(e.target.value)}
                          style={{
                            width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)",
                            background: "var(--background)", fontSize: 13, fontWeight: 700, outline: "none", color: "var(--foreground)", colorScheme: "dark light"
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.05em" }}>Tiến độ (%)</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ position: "relative", flex: 1 }}>
                            <input 
                              type="number" 
                              value={reportProgress}
                              onChange={e => setReportProgress(Number(e.target.value))}
                              onBlur={e => {
                                let val = Number(e.target.value);
                                if (val < initialProgress) setConfirmOpen(true);
                                else if (val > 100) setReportProgress(100);
                              }}
                              style={{ 
                                width: "100%", padding: "8px 25px 8px 12px", borderRadius: 10, border: "1px solid var(--border)",
                                fontSize: 13, fontWeight: 800, outline: "none", color: "#6366f1", background: "var(--background)"
                              }}
                            />
                            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)" }}>%</span>
                          </div>
                          <button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploadingReportFile}
                            title="Đính kèm minh chứng"
                            style={{
                              width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)",
                              background: "var(--background)", color: "#6366f1", cursor: uploadingReportFile ? "wait" : "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--border)"; e.currentTarget.style.borderColor = "#6366f1"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                          >
                            {uploadingReportFile ? <i className="bi bi-arrow-clockwise" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-paperclip" style={{ fontSize: 16 }} />}
                          </button>
                          <input type="file" ref={fileRef} style={{ display: "none" }} onChange={handleFileUpload} />
                        </div>
                        {reportFileUrl && (
                          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6366f1", background: "#eef2ff", padding: "4px 8px", borderRadius: 6, width: "max-content" }}>
                            <i className="bi bi-file-earmark-check-fill" />
                            <span style={{ maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{reportFileName || "Tài liệu đính kèm"}</span>
                            <i className="bi bi-x-circle-fill" style={{ cursor: "pointer", opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity="1"} onMouseLeave={e => e.currentTarget.style.opacity="0.6"} onClick={() => { setReportFileUrl(null); setReportFileName(null); }} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ height: 6, background: "var(--border)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${reportProgress}%` }}
                          style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #4f46e5)", borderRadius: 3 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16, display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.05em" }}>Nội dung báo cáo chi tiết</div>
                    <textarea
                      rows={5}
                      placeholder="Mô tả kết quả công việc đã thực hiện..."
                      value={reportContent}
                      onChange={e => setReportContent(e.target.value)}
                      style={{
                        width: "100%", height: 120, padding: "14px", borderRadius: 14, border: "1px solid var(--border)",
                        background: "var(--background)", fontSize: 13, outline: "none", resize: "none", lineHeight: 1.6,
                        color: "var(--foreground)", transition: "all 0.2s", borderStyle: "dashed"
                      }}
                      onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.borderStyle = "solid"; }}
                      onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.borderStyle = "dashed"; }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 12, letterSpacing: "0.05em" }}>Quá trình thực hiện</div>
                    <div style={{ position: "relative", paddingLeft: 24, paddingBottom: 20 }}>
                      <div style={{ position: "absolute", left: 8, top: 4, bottom: 4, width: 2, background: "var(--border)" }} />
                      
                      {/* Lịch sử báo cáo */}
                      {[...reportHistory].reverse().map((rep: any, idx: number) => (
                        <div key={rep.id || idx} style={{ marginBottom: 20, position: "relative" }}>
                          <div style={{ position: "absolute", left: -21, top: 4, width: 12, height: 12, borderRadius: "50%", background: "#10b981", border: "2px solid var(--card)", boxShadow: "0 0 0 4px var(--border)" }} />
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 2 }}>
                            Cập nhật báo cáo tiến độ ({rep.p}%)
                          </div>
                          {rep.c && (
                            <div style={{ fontSize: 13, color: "var(--foreground)", background: "var(--background)", padding: "8px 12px", borderRadius: 8, marginTop: 6, marginBottom: 6, borderLeft: "3px solid #10b981", border: "1px solid var(--border)", borderLeftWidth: 3 }}>
                              {rep.c}
                            </div>
                          )}
                          {rep.f && (
                            <div style={{ marginBottom: 8, marginTop: -2 }}>
                              <a href={rep.f} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.1)", padding: "4px 10px", borderRadius: 8, textDecoration: "none", border: "1px solid rgba(99,102,241,0.2)" }}>
                                <i className="bi bi-file-earmark-text" /> Xem {rep.fn || "Minh chứng"}
                              </a>
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            Ngày báo cáo: {(() => {
                              const dObj = new Date(rep.id || rep.d);
                              if (isNaN(dObj.getTime())) return new Date(rep.d).toLocaleDateString('vi-VN');
                              return `${dObj.getHours().toString().padStart(2, '0')}:${dObj.getMinutes().toString().padStart(2, '0')} ${dObj.toLocaleDateString('vi-VN')}`;
                            })()}
                          </div>
                        </div>
                      ))}

                      <div style={{ position: "relative" }}>
                        <div style={{ position: "absolute", left: -21, top: 4, width: 12, height: 12, borderRadius: "50%", background: "#6366f1", border: "2px solid var(--card)", boxShadow: "0 0 0 4px var(--border)" }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 2 }}>Khởi tạo công việc</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                          Bởi: {task.assigneeName || "Hệ thống"} • {(task as any).createdAt ? (() => {
                              const dObj = new Date((task as any).createdAt);
                              return `${dObj.getHours().toString().padStart(2, '0')}:${dObj.getMinutes().toString().padStart(2, '0')} ${dObj.toLocaleDateString('vi-VN')}`;
                            })() : new Date().toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nút báo cáo đóng đinh dưới màn hình */}
                <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card)", zIndex: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    Báo cáo và lưu lại thay đổi
                  </div>
                  <button 
                    onClick={handleSubmitReport}
                    disabled={isSubmittingReport}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, 
                      background: isSubmittingReport ? "var(--muted)" : "linear-gradient(135deg, #6366f1, #4f46e5)", color: isSubmittingReport ? "var(--muted-foreground)" : "#fff",
                      border: "none", cursor: isSubmittingReport ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s"
                    }}
                  >
                    {isSubmittingReport ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }}/> : <i className="bi bi-send-fill" />}
                    Báo cáo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmOpen}
        isStatic={true}
        title="Tiến độ không lùi"
        message={`Không thể cập nhật lùi tiến độ. Tiến độ gần nhất mà bạn đã báo cáo là ${initialProgress}%.`}
        variant="warning"
        confirmLabel="Đã hiểu"
        cancelLabel="Đóng"
        onConfirm={() => { setConfirmOpen(false); setReportProgress(initialProgress); }}
        onCancel={() => { setConfirmOpen(false); setReportProgress(initialProgress); }}
      />
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function MyTasks({
  compact = false,
  maxItems,
  employeeName: propEmployeeName,
  title = "Công việc của tôi",
  description = "Theo dõi tiến độ và cập nhật công việc được giao",
}: MyTasksProps) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");
  const ITEMS_PER_PAGE = compact ? (maxItems ?? 5) : 50;

  // Lấy tên từ session hoặc prop
  const employeeName = propEmployeeName || session?.user?.name || "";

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

  const handleCommentsLoaded = useCallback((taskId: string, count: number) => {
    setSeenComments(prev => {
      if (prev[taskId] === count) return prev;
      const updated = { ...prev, [taskId]: count };
      localStorage.setItem(seenCommentsKey, JSON.stringify(updated));
      return updated;
    });
  }, [seenCommentsKey]);

  const loadTasks = useCallback(() => {
    fetch("/api/my/tasks")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch("/api/my/tasks")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  // Filter tasks belonging to this employee
  const myTasks = tasks.filter(t => {
    if (!t.week1 && !t.week2 && !t.week3 && !t.week4) return false;
    const nameMatch = !employeeName || t.assigneeName === employeeName;
    const planMonth = t.monthlyPlan?.month;
    const dl = t.deadline ? new Date(t.deadline) : null;
    const taskMonth = planMonth || (dl ? dl.getMonth() + 1 : null);
    
    // Logic mới: Xuất hiện ở tất cả các tháng từ lúc tạo đến lúc kết thúc
    const today = new Date();
    const start = t.createdAt ? new Date(t.createdAt) : today;
    const end = dl || start;

    const startMonthVal = start.getFullYear() * 12 + start.getMonth();
    const endMonthVal = end.getFullYear() * 12 + end.getMonth();
    const currentFilterMonthVal = today.getFullYear() * 12 + (filterMonth - 1);
    
    // Nếu là Generic Task (Mentor, Interview...) thì dùng logic dải thời gian
    const isWithinRange = currentFilterMonthVal >= startMonthVal && currentFilterMonthVal <= endMonthVal;
    
    // Nếu là Marketing Task thì vẫn ưu tiên theo tháng kế hoạch (planMonth)
    const monthMatch = t.isGeneric ? isWithinRange : (taskMonth === filterMonth);
    
    return nameMatch && monthMatch;
  });

  const filteredTasks = myTasks.filter(t => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dl = t.deadline ? new Date(t.deadline) : null;

    let sMatch = true;
    if (filterStatus !== "all") {
      if (filterStatus === "done")        sMatch = t.status === "done" || getTaskProgress(t) >= 100;
      else if (filterStatus === "overdue") sMatch = (t.status !== "done" && getTaskProgress(t) < 100) && !!dl && dl < today;
      else if (filterStatus === "in_progress") sMatch = (t.status === "in_progress" || getTaskProgress(t) > 0) && t.status !== "done" && getTaskProgress(t) < 100;
      else if (filterStatus === "pending") sMatch = t.status === "pending" && getTaskProgress(t) === 0;
    }
    const tMatch = !searchTerm || t.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return sMatch && tMatch;
  });

  // KPI stats
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const totalCount     = myTasks.length;
  const doneCount      = myTasks.filter(t => t.status === "done" || getTaskProgress(t) >= 100).length;
  const inProgressCount = myTasks.filter(t => (t.status === "in_progress" || getTaskProgress(t) > 0) && t.status !== "done" && getTaskProgress(t) < 100).length;
  const overdueCount   = myTasks.filter(t => t.status !== "done" && getTaskProgress(t) < 100 && t.deadline && new Date(t.deadline) < today).length;
  const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const paginatedTasks = filteredTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);

  // Update task status locally
  const handleStatusChange = (taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus } : prev);
    }
  };

  // Update task data locally for arbitrary fields
  const handleTaskUpdate = (taskId: string, partialData: any) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...partialData } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...partialData } : prev);
    }
  };

  const kpiCards = [
    { label: "Tổng công việc",   value: totalCount,      icon: "bi-list-task",          color: "#6366f1" },
    { label: "Đang thực hiện",   value: inProgressCount, icon: "bi-arrow-repeat",       color: "#3b82f6" },
    { label: "Hoàn thành",       value: doneCount,        icon: "bi-check-circle",       color: "#10b981" },
    { label: "Quá hạn",          value: overdueCount,    icon: "bi-exclamation-triangle",color: "#ef4444" },
  ];

  const months = [1,2,3,4,5,6,7,8,9,10,11,12];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background, #f8fafc)" }}>

      {/* Page Header — chỉ hiện khi không compact */}
      {!compact && (
        <PageHeader
          title={title}
          description={description}
          icon="bi-person-check"
          color="indigo"
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", padding: compact ? "12px" : "20px 24px", display: "flex", flexDirection: "column" }}>

        {/* ── Year + Month timeline ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, gap: 12, flexWrap: "wrap",
        }}>

          {/* Left: year badge + month pills on same row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", overflow: "hidden" }}>

            {/* Year badge */}
            {!compact && (
              <div style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                borderRadius: 8, padding: "5px 11px", flexShrink: 0,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <i className="bi bi-calendar3" style={{ fontSize: 11, color: "#fff" }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.03em" }}>
                  {new Date().getFullYear()}
                </span>
              </div>
            )}

            {/* Separator */}
            {!compact && <div style={{ width: 1, height: 20, background: "#e2e8f0", flexShrink: 0 }} />}

            {/* 12-month pills */}
            <div style={{
              display: "flex", gap: 3, overflowX: "auto",
              scrollbarWidth: "none", padding: "1px 0",
            }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                const isActive = m === filterMonth;
                const isCurrent = m === new Date().getMonth() + 1;
                const mCount = tasks.filter(t => {
                  const planMonth = t.monthlyPlan?.month;
                  const dl = t.deadline ? new Date(t.deadline) : null;
                  const taskMonth = planMonth || (dl ? dl.getMonth() + 1 : null);
                  const nameMatch = !employeeName || t.assigneeName === employeeName;
                  return nameMatch && taskMonth === m && (t.week1 || t.week2 || t.week3 || t.week4);
                }).length;

                return (
                  <button
                    key={m}
                    onClick={() => { setFilterMonth(m); setCurrentPage(1); }}
                    title={`Tháng ${m}${mCount > 0 ? ` — ${mCount} công việc` : ""}`}
                    style={{
                      flexShrink: 0, position: "relative",
                      padding: "4px 9px",
                      borderRadius: 7,
                      border: isActive
                        ? "1.5px solid #6366f1"
                        : isCurrent
                          ? "1.5px dashed #c7d2fe"
                          : "1.5px solid var(--border)",
                      cursor: "pointer",
                      background: isActive
                        ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                        : isCurrent ? "rgba(99,102,241,0.1)" : "var(--card)",
                      color: isActive ? "#fff" : isCurrent ? "#6366f1" : "var(--muted-foreground)",
                      fontSize: 11,
                      fontWeight: isActive ? 800 : 600,
                      transition: "all 0.14s",
                      boxShadow: isActive ? "0 2px 6px rgba(99,102,241,0.3)" : "none",
                      lineHeight: 1.4,
                      minWidth: 0,
                    }}
                  >
                    T{m}
                    {/* Task count dot */}
                    {mCount > 0 && !isActive && (
                      <div style={{
                        position: "absolute", top: 2, right: 2,
                        width: 4, height: 4, borderRadius: "50%",
                        background: isCurrent ? "#6366f1" : "var(--border)",
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: completion bar */}
          {!compact && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Hoàn thành</span>
              <div style={{ width: 100, height: 7, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ height: "100%", background: completionRate >= 70 ? "#10b981" : completionRate >= 40 ? "#f59e0b" : "#ef4444", borderRadius: 4 }}
                />
              </div>
              <span style={{
                fontSize: 13, fontWeight: 900, minWidth: 36, textAlign: "right",
                color: completionRate >= 70 ? "#059669" : completionRate >= 40 ? "#d97706" : "#dc2626"
              }}>
                {completionRate}%
              </span>
            </div>
          )}
        </div>

        {/* Task List Card (The one that should fill height) */}
        <div style={{ 
          flex: 1, minHeight: 0,
          background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 2px 12px rgba(0,0,0,0.03)"
        }}>
          <div style={{
            padding: "12px 20px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12, background: "rgba(var(--primary-rgb), 0.02)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, marginRight: 24 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <i className="bi bi-list-stars" style={{ color: "#6366f1" }} />
                Danh sách công việc
                <span style={{ fontSize: 11, fontWeight: 600, background: "var(--muted)", color: "#6366f1", padding: "2px 8px", borderRadius: 20 }}>{filteredTasks.length}</span>
              </h3>
              
              {/* Search */}
              <div style={{ position: "relative", flex: 1, maxWidth: 450 }}>
                <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--muted-foreground)" }} />
                <input
                  type="text"
                  placeholder="Tìm công việc..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: "6px 12px 6px 30px", borderRadius: 10, border: "1px solid var(--border)",
                    background: "var(--muted)", fontSize: 12, width: "100%", outline: "none", color: "var(--foreground)"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* View toggle */}
              <div style={{ display: "flex", background: "var(--muted)", borderRadius: 8, padding: 3 }}>
                {[
                  { id: "table", icon: "bi-list-ul", label: "Bảng" },
                  { id: "gantt", icon: "bi-bar-chart-gantt", label: "Gantt" }
                ].map(v => (
                  <button
                    key={v.id}
                    onClick={() => setViewMode(v.id as any)}
                    style={{
                      padding: "4px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                      background: viewMode === v.id ? "var(--card)" : "transparent",
                      color: viewMode === v.id ? "#6366f1" : "var(--muted-foreground)",
                      boxShadow: viewMode === v.id ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    <i className={`bi ${v.icon}`} />
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <FilterSelect
                placeholder="Trạng thái: Tất cả"
                value={filterStatus === "all" ? "" : filterStatus}
                onChange={(val) => { setFilterStatus(val || "all"); setCurrentPage(1); }}
                options={[
                  { label: "Chưa thực hiện", value: "pending" },
                  { label: "Đang thực hiện", value: "in_progress" },
                  { label: "Hoàn thành", value: "done" },
                  { label: "Quá hạn", value: "overdue" },
                ]}
                width={160}
              />
            </div>
          </div>

          {/* Sub-legend for status colors */}
          <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 16, flexWrap: "wrap", background: "var(--card)" }}>
             {[
               { color: "#10b981", label: "Hoàn thành" },
               { color: "#3b82f6", label: "Đúng tiến độ" },
               { color: "#f97316", label: "Chậm tiến độ" },
               { color: "#ef4444", label: "Quá hạn" },
               { color: "var(--muted-foreground)", label: "Chưa thực hiện" }
             ].map((l, i) => (
               <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                 <div style={{ width: 14, height: 4, borderRadius: 2, background: l.color }} />
                 <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)" }}>{l.label}</span>
               </div>
             ))}
             <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
               <div style={{ width: 14, height: 1.5, background: "#ef4444" }} />
               <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)" }}>Hôm nay ({new Date().getDate()}/{new Date().getMonth()+1})</span>
             </div>
          </div>

          {/* Main Content Area: Table or Gantt */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {loading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : viewMode === "table" ? (
              <>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--muted)" }}>
                      <tr>
                        <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Công việc</th>
                        <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Tuần thực hiện</th>
                        <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Bắt đầu</th>
                        <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Hạn chót</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Tiến độ (%)</th>
                        <th style={{ width: 40, borderBottom: "1px solid var(--border)" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTasks.length > 0 ? paginatedTasks.map((t, i) => (
                        <TaskRow 
                          key={t.id} 
                          task={t} 
                          index={i} 
                          filterMonth={filterMonth} 
                          onClick={() => setSelectedTask(t)} 
                          unreadCount={t.commentsCount !== undefined ? Math.max(0, (t.commentsCount || 0) - (seenComments[t.id] || 0)) : 0}
                        />
                      )) : (
                        <tr>
                          <td colSpan={6} style={{ padding: "60px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                            <i className="bi bi-inbox" style={{ fontSize: 32, display: "block", marginBottom: 10, opacity: 0.3 }} />
                            Không tìm thấy công việc phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 20px", borderTop: "1px solid var(--border)", background: "rgba(99, 102, 241, 0.02)",
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)" }}>
                      Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} – {Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length)} trong {filteredTasks.length} công việc
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        style={{
                          padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          border: "1px solid var(--border)", background: currentPage === 1 ? "var(--muted)" : "var(--card)",
                          color: currentPage === 1 ? "var(--muted-foreground)" : "var(--foreground)",
                          cursor: currentPage === 1 ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s"
                        }}
                      >
                        <i className="bi bi-chevron-left" /> Trước
                      </button>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        style={{
                          padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          border: "1px solid var(--border)", background: currentPage === totalPages ? "var(--muted)" : "var(--card)",
                          color: currentPage === totalPages ? "var(--muted-foreground)" : "var(--foreground)",
                          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s"
                        }}
                      >
                        Sau <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <GanttChart tasks={filteredTasks as any} filterMonth={filterMonth} onTaskClick={setSelectedTask as any} />
            )}
          </div>

        {/* Compact KPI (when compact=true) */}
        {compact && totalCount > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
            {kpiCards.map((k, i) => (
              <div key={i} style={{
                background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
                padding: "10px 12px", textAlign: "center"
              }}>
                <i className={`bi ${k.icon}`} style={{ fontSize: 16, color: k.color, marginBottom: 4, display: "block" }} />
                <div style={{ fontSize: 16, fontWeight: 900, color: "#1e293b" }}>{k.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{k.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Task Detail Panel */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onStatusChange={handleStatusChange}
            onTaskUpdate={handleTaskUpdate}
            onCommentsLoaded={handleCommentsLoaded}
          />
        )}
      </AnimatePresence>

      {/* Spin animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
      ` }} />
    </div>
  );
}
