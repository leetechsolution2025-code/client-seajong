"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

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
  { label: "Đang làm", val: 1, icon: "bi-arrow-repeat", color: "#8b5cf6" },
];

export default function MarketingTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<{ code: string; name: string }[]>([]);
  const [priorities, setPriorities] = useState<{ code: string; name: string }[]>([]);
  const [marketingEmployees, setMarketingEmployees] = useState<any[]>([]);
  const [executionStatuses, setExecutionStatuses] = useState<{ code: string; name: string }[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterExecution, setFilterExecution] = useState("all");
  const [perfMonth, setPerfMonth] = useState(new Date().getMonth() + 1);
  const [perfEmployee, setPerfEmployee] = useState("all");

  const { data: session } = useSession();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (showDetail && selectedTask) {
      fetchComments();
    }
  }, [showDetail, selectedTask]);

  const fetchComments = () => {
    if (!selectedTask) return;
    fetch(`/api/marketing/tasks/${selectedTask.id}/comments`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setComments(data);
      })
      .catch(err => console.error("Error fetching comments:", err));
  };
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState("BÁO CÁO ĐÁNH GIÁ HIỆU SUẤT NHÂN VIÊN MARKETING");
  const [reportNote, setReportNote] = useState("");
  const handleSendComment = async (attachment?: { url: string; name: string }) => {
    if ((!commentText.trim() && !attachment) || !selectedTask || sendingComment) return;
    console.log("[handleSendComment] Sending:", { content: commentText, attachment });
    setSendingComment(true);
    try {
      const res = await fetch(`/api/marketing/tasks/${selectedTask.id}/comments`, {
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
    const monthMatch = taskMonth === perfMonth;
    const employeeMatch = perfEmployee === "all" || t.assigneeName === perfEmployee;
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
    if (!t.week1 && !t.week2 && !t.week3 && !t.week4) return false;

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

    // Lấy danh sách nhân viên phòng Marketing
    fetch("/api/hr/employees?department=marketing&pageSize=100")
      .then(res => res.json())
      .then(data => {
        if (data.employees && Array.isArray(data.employees)) {
          setMarketingEmployees(data.employees);
        }
      })
      .catch(err => console.error("Error fetching marketing employees:", err));

    // Lấy thông tin công ty
    fetch("/api/company", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setCompanyInfo(data);
      })
      .catch(err => console.error("Error fetching company info:", err));

    // Lấy danh sách task
    fetch("/api/marketing/tasks")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
      })
      .catch(err => console.error("Error fetching tasks:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Quản trị công việc"
        description="Ban Giám đốc · Giám sát tiến độ và phân công công việc toàn hệ thống"
        color="indigo"
        icon="bi-kanban"
      />

      <div style={{ flex: 1, padding: "16px 24px", overflowY: "auto" }}>
        {/* ── Top Small Stats ── */}
        {(() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const filtered = tasks.filter(t => {
            const planM = t.monthlyPlan?.month;
            const dDate = t.deadline ? new Date(t.deadline) : null;
            const taskM = planM || (dDate ? (dDate.getMonth() + 1) : null);
            const monthMatch = taskM === perfMonth;
            const empMatch = perfEmployee === "all" || t.assigneeName === perfEmployee;
            const hasWeek = t.week1 || t.week2 || t.week3 || t.week4;
            return monthMatch && empMatch && hasWeek;
          });

          const totalCount = filtered.length;
          const inProgressCount = filtered.filter(t => t.status === "in_progress").length;
          const overdueCount = filtered.filter(t => t.status !== "done" && t.deadline && new Date(t.deadline) < today).length;
          // Chậm tiến độ: Đang làm nhưng đã quá hạn
          const lateCount = filtered.filter(t => t.status === "in_progress" && t.deadline && new Date(t.deadline) < today).length;

          const topStats = [
            { label: "Tổng công việc", val: totalCount, icon: "bi-list-task", color: "#6366f1" },
            { label: "Đang thực hiện", val: inProgressCount, icon: "bi-arrow-repeat", color: "#3b82f6" },
            { label: "Quá hạn", val: overdueCount, icon: "bi-exclamation-triangle", color: "#ef4444" },
            { label: "Chậm tiến độ", val: lateCount || inProgressCount, icon: "bi-clock", color: "#f59e0b" },
          ];

          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
              {topStats.map((s, i) => (
                <motion.div 
                  key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  style={{ background: "var(--card)", padding: "14px 18px", borderRadius: 12, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${s.color} 10%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize: 16, color: s.color }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 1 }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--foreground)" }}>{s.val}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "stretch" }}>
          {/* ── Left Sidebar: Performance ── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ height: "100%" }}>
            <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: "16px", height: "100%", display: "flex", flexDirection: "column" }}>
              <SectionTitle title="Đánh giá hiệu suất nhân viên" />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <select 
                  value={perfMonth}
                  onChange={(e) => setPerfMonth(parseInt(e.target.value))}
                  style={{ height: 34, borderRadius: 8, border: "1px solid var(--border)", padding: "0 8px", fontSize: 11, fontWeight: 500, background: "var(--background)", color: "var(--foreground)" }}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
                <select 
                  value={perfEmployee}
                  onChange={(e) => setPerfEmployee(e.target.value)}
                  style={{ height: 34, borderRadius: 8, border: "1px solid var(--border)", padding: "0 8px", fontSize: 11, fontWeight: 500, background: "var(--background)", color: "var(--foreground)" }}
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
                  const monthMatch = taskM === perfMonth;
                  const empMatch = perfEmployee === "all" || t.assigneeName === perfEmployee;
                  const hasWeek = t.week1 || t.week2 || t.week3 || t.week4;
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
                  <>
                    <div style={{ background: "var(--accent)", borderRadius: 12, padding: "20px 16px", position: "relative", textAlign: "center", marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 30, alignItems: "center" }}>
                        <div style={{ position: "relative", width: 80, height: 80 }}>
                          <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                            <circle cx="40" cy="40" r="34" stroke="var(--border)" strokeWidth="6" fill="none" />
                            <circle cx="40" cy="40" r="34" stroke="#6366f1" strokeWidth="6" fill="none" strokeDasharray="213" strokeDashoffset={213 - (213 * score / 100)} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 20, fontWeight: 900, color: "var(--foreground)", lineHeight: 1 }}>{score}</span>
                            <span style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 700 }}>/100 điểm</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                            <i className="bi bi-people-fill" />
                          </div>
                          <h6 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)", textTransform: "uppercase" }}>Xếp loại</h6>
                          <div style={{ display: "inline-block", background: score > 70 ? "color-mix(in srgb, #059669 15%, transparent)" : "color-mix(in srgb, #e11d48 15%, transparent)", color: score > 70 ? "#10b981" : "#fb7185", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, marginTop: 6 }}>
                             {score > 70 ? "Xuất sắc" : score > 40 ? "Đang ổn" : "Cần cải thiện"}
                          </div>
                          <p style={{ margin: "5px 0 0", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>Hoàn thành {done}/{total}</p>
                        </div>
                      </div>

                      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 20, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: total > 0 ? `${(done/total)*100}%` : "0%", background: "#10b981", height: "100%" }} />
                        <div style={{ width: total > 0 ? `${(overdue/total)*100}%` : "0%", background: "#ef4444", height: "100%" }} />
                      </div>
                    </div>

                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignContent: "start" }}>
                      {gridData.map((s, i) => (
                        <div key={i} style={{ background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 5px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          <i className={`bi ${s.icon}`} style={{ fontSize: 16, color: s.color, marginBottom: 5, display: "block" }} />
                          <div style={{ fontSize: 16, fontWeight: 900, color: "var(--foreground)" }}>{s.val}</div>
                          <div style={{ fontSize: 8, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={() => setShowReportModal(true)}
                      style={{ 
                        marginTop: 20, width: "100%", padding: "12px", 
                        borderRadius: 12, border: "none", 
                        background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", 
                        color: "#fff", fontSize: 13, fontWeight: 800, 
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
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
                                  <img src={companyInfo.logoUrl} alt="Logo" style={{ width: 60, height: 60, objectFit: "contain" }} />
                                )}
                                <div>
                                  <h2 style={{ margin: 0, fontSize: 13, color: "#1e293b", fontWeight: 900, textTransform: "uppercase" }}>
                                    {companyInfo?.name || "CÔNG TY TNHH MTV TƯ VẤN VÀ CUNG CẤP GIẢI PHÁP SỐ LEE-TECH"}
                                  </h2>
                                  <p style={{ margin: "2px 0", fontSize: 11, color: "#475569", fontWeight: 600 }}>Bộ phận Marketing - Hệ thống quản trị hiệu suất</p>
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
                                {[
                                  { label: perfEmployee === "all" ? "Tổng nhân sự" : "Nhân viên", val: perfEmployee === "all" ? marketingEmployees.length : perfEmployee },
                                  { label: "Tổng công việc", val: tasks.filter(t => (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && (perfEmployee === "all" || t.assigneeName === perfEmployee) && t.taskGroup !== "chu_de_thang").length },
                                  { label: "Hoàn thành", val: tasks.filter(t => (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && t.status === "done" && (perfEmployee === "all" || t.assigneeName === perfEmployee) && t.taskGroup !== "chu_de_thang").length },
                                  { label: "Tỷ lệ chung", val: `${Math.round((tasks.filter(t => (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && t.status === "done" && (perfEmployee === "all" || t.assigneeName === perfEmployee) && t.taskGroup !== "chu_de_thang").length / (tasks.filter(t => (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && (perfEmployee === "all" || t.assigneeName === perfEmployee) && t.taskGroup !== "chu_de_thang").length || 1)) * 100)}%` }
                                ].map((s, i) => (
                                  <div key={i} style={{ padding: "12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
                                    <p style={{ fontSize: 10, color: "#64748b", fontWeight: 700, margin: "0 0 5px", textTransform: "uppercase" }}>{s.label}</p>
                                    <p style={{ fontSize: i === 0 && perfEmployee !== "all" ? 13 : 18, color: "#1e293b", fontWeight: 900, margin: 0 }}>{s.val}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Individual Details */}
                            <div style={{ marginBottom: 30 }}>
                              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", borderLeft: "4px solid #6366f1", paddingLeft: 12, marginBottom: 15, textTransform: "uppercase" }}>2. Chi tiết hiệu suất cá nhân</h3>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: "#f1f5f9" }}>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "left" }}>Họ và tên</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center" }}>Giao</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center" }}>Xong</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center" }}>Quá hạn</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center" }}>Tỷ lệ (%)</th>
                                    <th style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center" }}>Xếp loại</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {marketingEmployees.filter(emp => perfEmployee === "all" || emp.fullName === perfEmployee).map((emp) => {
                                    const empTasks = tasks.filter(t => t.assigneeName === emp.fullName && (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && (t.week1 || t.week2 || t.week3 || t.week4));
                                    const empDone = empTasks.filter(t => t.status === "done").length;
                                    const today = new Date(); today.setHours(0,0,0,0);
                                    const empOverdue = empTasks.filter(t => t.status !== "done" && t.deadline && new Date(t.deadline) < today).length;
                                    const empRate = empTasks.length > 0 ? Math.round((empDone / empTasks.length) * 100) : 0;
                                    
                                    let grade = "---";
                                    let color = "#64748b";
                                    if (empTasks.length > 0) {
                                      if (empRate >= 90 && empOverdue === 0) { grade = "Xuất sắc"; color = "#059669"; }
                                      else if (empRate >= 70) { grade = "Tốt"; color = "#2563eb"; }
                                      else if (empRate >= 50) { grade = "Đạt"; color = "#f59e0b"; }
                                      else { grade = "Cần cải thiện"; color = "#dc2626"; }
                                    }

                                    return (
                                      <tr key={emp.id}>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "12px", fontWeight: 700 }}>{emp.fullName}</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center" }}>{empTasks.length}</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center" }}>{empDone}</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center", color: empOverdue > 0 ? "#dc2626" : "inherit", fontWeight: empOverdue > 0 ? 700 : 400 }}>{empOverdue}</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center", fontWeight: 700 }}>{empRate}%</td>
                                        <td style={{ border: "1px solid #cbd5e1", padding: "12px", textAlign: "center", fontWeight: 800, color }}>{grade}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Observations */}
                            <div>
                              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", borderLeft: "4px solid #6366f1", paddingLeft: 12, marginBottom: 15, textTransform: "uppercase" }}>3. Nhận xét & Đề xuất chung</h3>
                              <div style={{ padding: "15px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
                                {reportNote || `Dựa trên dữ liệu hệ thống, tình hình thực hiện công việc của ${perfEmployee === "all" ? "phòng" : `nhân sự ${perfEmployee}`} trong Tháng ${perfMonth} đang duy trì ở mức ${(tasks.filter(t => (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && t.status === "done" && (perfEmployee === "all" || t.assigneeName === perfEmployee) && t.taskGroup !== "chu_de_thang").length / (tasks.filter(t => (t.monthlyPlan?.month || (t.deadline ? new Date(t.deadline).getMonth()+1 : null)) === perfMonth && (perfEmployee === "all" || t.assigneeName === perfEmployee) && t.taskGroup !== "chu_de_thang").length || 1) * 100).toFixed(1)}%. Đề nghị ${perfEmployee === "all" ? "các nhân sự có nhiều công việc quá hạn" : "nhân sự"} tập trung xử lý dứt điểm trước khi kết thúc kỳ.`}
                              </div>
                            </div>
                            
                            {/* Signatures */}
                            <div style={{ marginTop: 60, display: "flex", justifyContent: "flex-end" }}>
                              <div style={{ textAlign: "center", width: 250 }}>
                                <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 5px" }}>Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                                <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>NGƯỜI LẬP BÁO CÁO</p>
                                <div style={{ height: 80 }}></div>
                                <p style={{ fontSize: 13, fontWeight: 800 }}>{session?.user?.name || "Nguyễn Thu Huyền"}</p>
                              </div>
                            </div>
                          </div>
                        }
                      />
                    )}

                  </>
                );
              })()}
              </div>

          </motion.div>

          {/* ── Right Content: Task List ── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: "16px 20px", minHeight: 550 }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
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
                <button style={{ height: 38, padding: "0 18px", borderRadius: 10, background: "#6366f1", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="bi bi-plus-lg" /> Tạo mới
                </button>
              </div>

              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0 10px 8px", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Tiêu đề</th>
                    <th style={{ textAlign: "left", padding: "0 10px 8px", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Người thực hiện</th>
                    <th style={{ textAlign: "right", padding: "0 10px 8px", fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Ngày đến hạn</th>
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
                        <td style={{ padding: "5px 10px", borderBottom: "1px solid var(--border)" }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>{t.title}</p>
                          <span style={{ 
                            fontSize: 9, fontWeight: 800, 
                            color: statusColor, 
                            marginTop: 1, display: "block", textTransform: "uppercase" 
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: "5px 10px", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: t.assigneeName ? "#6366f1" : "#ef4444", color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, textTransform: "uppercase" }}>
                              {assignee.split(" ").map((n: string) => n[0]).join("").slice(-2)}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>{assignee}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 10px", textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)" }}>
                            {t.deadline ? new Date(t.deadline).toLocaleDateString("vi-VN") : "---"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <Pagination 
                page={currentPage} 
                totalPages={Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)} 
                onChange={setCurrentPage} 
              />
            </div>
          </motion.div>
        </div>
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
                style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 450, background: "var(--card)", zIndex: 9999, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid var(--border)" }}
              >
                {/* Fixed Content Wrapper (No Scroll) */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h5 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--foreground)" }}>Chi tiết công việc</h5>
                    <button 
                      onClick={() => setShowDetail(false)}
                      style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "var(--muted-foreground)" }}
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>

                  {selectedTask && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
                      <div style={{ flexShrink: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tên công việc</span>
                        <h4 style={{ margin: "1px 0 0", fontSize: 15, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>{selectedTask.title}</h4>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10 }}>
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trạng thái & Tiến độ</span>
                          <div style={{ marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                                window.location.href = `/marketing/plan/monthly?id=${selectedTask.monthlyPlan.id}&focusTask=${selectedTask.id}`;
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


                      <div style={{ flexShrink: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mô tả</span>
                        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4, color: "var(--muted-foreground)", background: "var(--background)", padding: "10px", borderRadius: 8 }}>
                          {selectedTask.description || "Không có mô tả chi tiết."}
                        </div>
                      </div>

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
                                 <div style={{ 
                                   background: isMe ? "rgba(99, 102, 241, 0.08)" : "var(--accent)", 
                                   padding: "8px 12px", 
                                   borderRadius: isMe ? "14px 4px 14px 14px" : "4px 14px 14px 14px", 
                                   fontSize: 12, color: "var(--foreground)", 
                                   maxWidth: "85%",
                                   border: isMe ? "1px solid rgba(99, 102, 241, 0.12)" : "1px solid var(--border)",
                                   boxShadow: "0 2px 4px rgba(0,0,0,0.01)" 
                                 }}>
                                   <div style={{ fontWeight: 800, marginBottom: 2, color: isMe ? "var(--primary)" : "var(--foreground)", fontSize: 11 }}>{c.userName}</div>
                                   <div style={{ lineHeight: 1.4, fontSize: 12 }}>{c.content}</div>
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
                            );
                          })}
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
                      disabled={sendingComment || !commentText.trim()}
                      style={{ 
                        position: "absolute", right: 4, top: 4, width: 30, height: 30, borderRadius: 8, 
                        background: "#6366f1", border: "none", color: "#fff", 
                        display: "flex", alignItems: "center", justifyContent: "center", 
                        cursor: "pointer", transition: "all 0.1s", opacity: (sendingComment || !commentText.trim()) ? 0.6 : 1 
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
    </div>
  );
}
