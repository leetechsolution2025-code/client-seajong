"use client";
import React, { useState, useEffect, useCallback } from "react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { KPICard } from "@/components/ui/KPICard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";

// ── Types ──────────────────────────────────────────────────────────────────────
type TaskUser = { id: string; name: string | null; email: string; role?: string; deptCode?: string | null };
type TaskComment = { id: string; userId: string; content: string; createdAt: string };
type Task = {
  id: string; title: string; description?: string;
  status: "pending" | "in-progress" | "review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: string; creatorId: string; deptCode?: string;
  dueDate?: string; completedAt?: string;
  createdAt: string; updatedAt: string;
  assignee?: TaskUser; creator?: TaskUser;
  comments: TaskComment[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES: { key: Task["status"]; label: string; color: string; bg: string }[] = [
  { key: "pending",     label: "Chờ xử lý",      color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  { key: "in-progress", label: "Đang thực hiện",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  { key: "review",      label: "Chờ review",       color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  { key: "done",        label: "Hoàn thành",       color: "#10b981", bg: "rgba(16,185,129,0.1)" },
];
const PRIORITY_CFG = {
  urgent: { label: "Khẩn",   color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  high:   { label: "Cao",    color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  medium: { label: "Thường", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  low:    { label: "Thấp",   color: "#6b7280", bg: "rgba(107,114,128,0.1)"},
};
function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(-2).map(s => s[0]).join("").toUpperCase();
}
function isOverdue(task: Task) {
  if (!task.dueDate || task.status === "done" || task.status === "cancelled") return false;
  return new Date(task.dueDate) < new Date();
}
function fmtDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// ── Avatar Component ──────────────────────────────────────────────────────────
function Avatar({ user, size = 28 }: { user?: TaskUser; size?: number }) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#10b981","#f59e0b","#3b82f6"];
  const color = colors[(user?.name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0, userSelect: "none",
    }}>{initials(user?.name)}</div>
  );
}

// ── Priority Badge ─────────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: Task["priority"] }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.medium;
  return (
    <span style={{
      padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}

// ── Task Card (Kanban) ────────────────────────────────────────────────────────
function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const overdue = isOverdue(task);
  return (
    <div onClick={onClick} style={{
      background: "var(--card)", borderRadius: 12,
      border: `1px solid ${overdue ? "rgba(239,68,68,0.35)" : "var(--border)"}`,
      padding: "11px 13px", cursor: "pointer", marginBottom: 8,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      transition: "box-shadow 0.15s, transform 0.15s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 7 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.4, flex: 1 }}>{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && (
        <p style={{ margin: "0 0 8px", fontSize: 11.5, color: "var(--muted-foreground)", lineHeight: 1.45,
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {task.description}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Avatar user={task.assignee} size={22} />
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{task.assignee?.name ?? task.assignee?.email}</span>
        </div>
        {task.dueDate && (
          <span style={{ fontSize: 10.5, fontWeight: 600, color: overdue ? "#ef4444" : "var(--muted-foreground)" }}>
            {overdue ? "⚠ " : ""}{fmtDate(task.dueDate)}
          </span>
        )}
      </div>
      {task.comments.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--muted-foreground)" }}>
          <i className="bi bi-chat" style={{ marginRight: 3 }} />{task.comments.length} bình luận
        </div>
      )}
    </div>
  );
}

// ── Create Task Modal ─────────────────────────────────────────────────────────
function CreateTaskModal({ users, departments, priorityCategories, onClose, onCreated }: {
  users: TaskUser[];
  departments: { code: string; nameVi: string }[];
  priorityCategories: { code: string; name: string; color: string | null }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ title: "", description: "", assigneeId: "", priority: "medium", dueDate: "", deptCode: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.assigneeId) { toast.error("Lỗi", "Vui lòng nhập tiêu đề và chọn người thực hiện"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/board/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) { toast.success("Thành công", "Đã tạo công việc mới"); onCreated(); onClose(); }
      else toast.error("Lỗi", json.error ?? "Không thể tạo công việc");
    } finally { setSaving(false); }
  };

  const ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 11px", borderRadius: 9, border: "1px solid var(--border)",
    background: "var(--background)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    paddingRight: 32, appearance: "none",
    background: `var(--background) ${ARROW} no-repeat right 10px center`,
    cursor: "pointer",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 2001, width: 480, background: "var(--card)", borderRadius: 18,
        border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", padding: "22px 24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Tạo công việc mới</h3>
          <button onClick={onClose} style={{ border: "none", background: "var(--muted)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Tiêu đề *</label>
            <input style={inputStyle} placeholder="Nhập tiêu đề công việc..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Mô tả</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} placeholder="Mô tả chi tiết công việc..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          {/* Phòng ban trước — lọc nhân viên theo phòng */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Phòng ban</label>
              <select style={selectStyle} value={form.deptCode} onChange={e => setForm(f => ({ ...f, deptCode: e.target.value, assigneeId: "" }))}>
                <option value="">-- Chọn phòng ban --</option>
                {departments.map(d => <option key={d.code} value={d.code}>{d.nameVi}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Người thực hiện *</label>
              <select style={selectStyle} value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}>
                <option value="">-- Chọn nhân viên --</option>
                {users
                  .filter(u => !form.deptCode || u.deptCode === form.deptCode)
                  .map(u => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
              </select>
            </div>
          </div>

          {/* Deadline + Độ ưu tiên */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Deadline</label>
              <input type="date" style={inputStyle} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Độ ưu tiên</label>
              <select style={selectStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="">-- Chọn --</option>
                {priorityCategories.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 18px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", fontSize: 13 }}>Huỷ</button>
            <button type="submit" disabled={saving} style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 13, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Đang tạo..." : "Tạo công việc"}
            </button>
          </div>
        </form>

      </div>
    </>
  );
}



// ── Task Detail Offcanvas ─────────────────────────────────────────────────────
function TaskOffcanvas({ task, users, onClose, onUpdate, onDelete }: {
  task: Task; users: TaskUser[]; onClose: () => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const toast = useToast();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const overdue = isOverdue(task);

  const pCfg = PRIORITY_CFG[task.priority];
  const sCfg = STATUSES.find(s => s.key === task.status);

  const changeStatus = async (status: Task["status"]) => {
    const res = await fetch(`/api/board/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if ((await res.json()).success) onUpdate(task.id, { status });
    else toast.error("Lỗi", "Không thể cập nhật trạng thái");
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/board/tasks/${task.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment }) });
      const json = await res.json();
      if (json.success) {
        onUpdate(task.id, { comments: [json.comment, ...task.comments] });
        setComment("");
      }
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Xoá công việc "${task.title}"?`)) return;
    const res = await fetch(`/api/board/tasks/${task.id}`, { method: "DELETE" });
    if ((await res.json()).success) { onDelete(task.id); onClose(); toast.success("Đã xoá", task.title); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1040, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        background: "var(--card)", borderLeft: "1px solid var(--border)",
        zIndex: 1050, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.15)", animation: "slideInRight 0.25s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <PriorityBadge priority={task.priority} />
              <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: sCfg?.bg, color: sCfg?.color }}>
                {sCfg?.label}
              </span>
              {overdue && <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>⚠ Quá hạn</span>}
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.4 }}>{task.title}</h3>
          </div>
          <button onClick={onClose} style={{ border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Thông tin */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Người thực hiện", value: <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Avatar user={task.assignee} size={24} /><span style={{ fontSize: 13 }}>{task.assignee?.name ?? task.assignee?.email}</span></div> },
              { label: "Người giao", value: task.creator?.name ?? task.creator?.email ?? "—" },
              { label: "Deadline", value: task.dueDate ? <span style={{ color: overdue ? "#ef4444" : "var(--foreground)", fontWeight: 600 }}>{new Date(task.dueDate).toLocaleDateString("vi-VN")}</span> : "—" },
              { label: "Phòng ban", value: task.deptCode ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--muted)" }}>
                <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>{label}</p>
                <div style={{ fontSize: 13 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Mô tả */}
          {task.description && (
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Mô tả</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--foreground)" }}>{task.description}</p>
            </div>
          )}

          {/* Đổi trạng thái */}
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Chuyển trạng thái</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {STATUSES.map(s => (
                <button key={s.key} onClick={() => changeStatus(s.key)} style={{
                  padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${task.status === s.key ? s.color : "var(--border)"}`,
                  background: task.status === s.key ? s.bg : "var(--muted)",
                  color: task.status === s.key ? s.color : "var(--muted-foreground)",
                  transition: "all 0.15s",
                }}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
              Bình luận ({task.comments.length})
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Nhập bình luận..."
                rows={2} style={{ flex: 1, borderRadius: 9, border: "1px solid var(--border)", padding: "8px 11px", fontSize: 13, resize: "none", background: "var(--background)", color: "var(--foreground)" }} />
              <button onClick={sendComment} disabled={submitting || !comment.trim()} style={{
                padding: "0 14px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, opacity: submitting ? 0.6 : 1,
              }}>Gửi</button>
            </div>
            {task.comments.length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted-foreground)", textAlign: "center", padding: "12px 0" }}>Chưa có bình luận nào</p>}
            {task.comments.map(c => {
              const u = users.find(u => u.id === c.userId);
              return (
                <div key={c.id} style={{ display: "flex", gap: 9, marginBottom: 10 }}>
                  <Avatar user={u} size={26} />
                  <div style={{ flex: 1, padding: "8px 11px", background: "var(--muted)", borderRadius: "4px 12px 12px 12px" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700 }}>{u?.name ?? u?.email ?? "Người dùng"}</p>
                    <p style={{ margin: "0 0 3px", fontSize: 13, lineHeight: 1.45 }}>{c.content}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)" }}>{new Date(c.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
          <button onClick={handleDelete} style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
            <i className="bi bi-trash" style={{ marginRight: 5 }} />Xoá công việc
          </button>
          <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)", alignSelf: "center" }}>
            Tạo {new Date(task.createdAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function QuanTriCongViec() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [priorityCategories, setPriorityCategories] = useState<{code:string;name:string;color:string|null}[]>([]);
  const [departments, setDepartments] = useState<{code:string;nameVi:string}[]>([]);
  const [filterDept, setFilterDept] = useState<string>("all");
  const [statusCategories, setStatusCategories]     = useState<{code:string;name:string;color:string|null}[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch("/api/board/tasks")
      .then(r => r.json())
      .then(d => { if (d.success) { setTasks(d.tasks); setUsers(d.users); setPriorityCategories(d.priorityCategories ?? []); setStatusCategories(d.statusCategories ?? []); setDepartments(d.departments ?? []); } })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdate = (id: string, data: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    if (selectedTask?.id === id) setSelectedTask(prev => prev ? { ...prev, ...data } : null);
  };
  const handleDelete = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  // ── Filtered tasks ─────────────────────────────────────────────────────────
  const filtered = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false; // so sánh theo tên category
    if (filterAssignee !== "all" && t.assigneeId !== filterAssignee) return false;
    if (searchText.trim() && !t.title.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total    = tasks.length;
  const inProg   = tasks.filter(t => t.status === "in-progress").length;
  const overdue  = tasks.filter(isOverdue).length;
  const doneWeek = tasks.filter(t => t.status === "done" && t.completedAt &&
    new Date(t.completedAt) > new Date(Date.now() - 7*24*60*60*1000)).length;

  // ── Employee stats & scoring ──────────────────────────────────────────────
  const employeeStats = users
    .filter(u => filterDept === "all" || u.deptCode === filterDept)
    .map(u => {
      const myTasks = tasks.filter(t => t.assigneeId === u.id);
      const done        = myTasks.filter(t => t.status === "done").length;
      const cancelled   = myTasks.filter(t => t.status === "cancelled").length;
      const pending     = myTasks.filter(t => t.status === "pending").length;
      const inProgress  = myTasks.filter(t => t.status === "in-progress").length;
      const review      = myTasks.filter(t => t.status === "review").length;
      const activeOver  = myTasks.filter(isOverdue).length; // chưa xong mà quá deadline
      // Hoàn thành đúng hạn: done AND (no dueDate OR completedAt <= dueDate)
      const doneOnTime  = myTasks.filter(t =>
        t.status === "done" && (!t.dueDate || !t.completedAt ||
        new Date(t.completedAt) <= new Date(t.dueDate))
      ).length;
      const doneLate    = done - doneOnTime;
      const total       = myTasks.length;

      // Score 0-100: completion(50) + ontime(30) - activeOverdue penalty(20)
      const score = total === 0 ? 100 : Math.max(0, Math.min(100, Math.round(
        (done / total) * 50 +
        (doneOnTime / Math.max(done, 1)) * (done / total) * 30 -
        (activeOver / total) * 20
      )));

      const tier = score >= 90 ? { label: "Xuất sắc", color: "#10b981" }
                 : score >= 75 ? { label: "Tốt",       color: "#3b82f6" }
                 : score >= 60 ? { label: "Khá",        color: "#f59e0b" }
                 : score >= 40 ? { label: "Trung bình", color: "#f97316" }
                 :               { label: "Cần cải thiện", color: "#ef4444" };

      return { user: u, total, done, doneOnTime, doneLate, pending, inProgress, review, activeOver, cancelled, score, tier };
    }).sort((a, b) => b.total - a.total);

  // Nhân viên đang được chọn
  const selectedEmp = filterAssignee !== "all"
    ? employeeStats.find(e => e.user.id === filterAssignee) ?? null
    : null;



  // ── KPI row (ngoài card chính) ────────────────────────────────────────────
  const kpiContent = (
    <div className="row g-3">
      <KPICard label="Tổng công việc"    value={total}    icon="bi-list-task"            accent="#6366f1" colClass="col-6" />
      <KPICard label="Đang thực hiện"    value={inProg}   icon="bi-arrow-repeat"         accent="#3b82f6" colClass="col-6" />
      <KPICard label="Quá hạn"           value={overdue}  icon="bi-exclamation-triangle" accent="#ef4444" colClass="col-6" />
      <KPICard label="Xong tuần này"     value={doneWeek} icon="bi-check-circle"         accent="#10b981" colClass="col-6" />
    </div>
  );

  const leftContent = (
    <div>
      <SectionTitle title="Đánh giá hiệu suất nhân viên" className="mb-3" />

      {/* Bộ lọc — cùng 1 dòng */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <select value={filterDept} onChange={e => {
          const dept = e.target.value;
          setFilterDept(dept);
          const firstUser = users.find(u => dept === "all" || u.deptCode === dept);
          setFilterAssignee(firstUser ? firstUser.id : "all");
        }} style={{
          flex: 1, padding: "6px 32px 6px 10px", borderRadius: 9, appearance: "none",
          border: "1px solid var(--border)",
          background: `var(--background) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E") no-repeat right 10px center`,
          color: "var(--foreground)", fontSize: 12, cursor: "pointer",
        }}>
          <option value="all">Tất cả phòng ban</option>
          {departments.map(d => <option key={d.code} value={d.code}>{d.nameVi}</option>)}
        </select>

        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={{
          flex: 1, padding: "6px 32px 6px 10px", borderRadius: 9, appearance: "none",
          border: `1px solid ${filterAssignee !== "all" ? "#6366f1" : "var(--border)"}`,
          background: `var(--background) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E") no-repeat right 10px center`,
          color: "var(--foreground)", fontSize: 12, cursor: "pointer",
        }}>
          <option value="all">Tất cả nhân viên</option>
          {employeeStats.map(e => (
            <option key={e.user.id} value={e.user.id}>
              {e.user.name ?? e.user.email}
            </option>
          ))}
        </select>
      </div>


      {/* ── Performance card khi chọn nhân viên cụ thể ── */}
      {selectedEmp ? (() => {
        const emp = selectedEmp;
        const R = 52, cx = 64, cy = 64, stroke = 10;
        const circumference = 2 * Math.PI * R;
        const arc = circumference * (1 - emp.score / 100);
        const statItems = [
          { label: "Được giao",     value: emp.total,       icon: "bi-list-task",       color: "#6366f1" },
          { label: "Hoàn thành",    value: emp.done,        icon: "bi-check-circle",    color: "#10b981" },
          { label: "Đúng hạn",      value: emp.doneOnTime,  icon: "bi-clock-history",   color: "#3b82f6" },
          { label: "Trễ hạn",       value: emp.doneLate,    icon: "bi-clock",           color: "#f59e0b" },
          { label: "Đang trễ",      value: emp.activeOver,  icon: "bi-exclamation-triangle", color: "#ef4444" },
          { label: "Đang làm",      value: emp.inProgress + emp.review, icon: "bi-arrow-repeat", color: "#8b5cf6" },
        ];
        return (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Score circle */}
            <div style={{ textAlign: "center", marginBottom: 10, padding: "10px 0 6px", background: "var(--muted)", borderRadius: 14, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                {/* SVG Arc gauge */}
                <svg width={96} height={96} viewBox="0 0 128 128">
                  {/* Track */}
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={stroke} />
                  {/* Score arc */}
                  <circle cx={cx} cy={cy} r={R} fill="none"
                    stroke={emp.tier.color} strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={arc}
                    strokeLinecap="round"
                    style={{ transformOrigin: "center", transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.6s ease" }}
                  />
                  <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--foreground)" fontSize={22} fontWeight={800}>{emp.score}</text>
                  <text x={cx} y={cy + 13} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10}>/100 điểm</text>
                </svg>
                {/* Info */}
                <div style={{ textAlign: "left" }}>
                  <Avatar user={emp.user} size={38} />
                  <p style={{ margin: "8px 0 2px", fontSize: 13, fontWeight: 800, color: "var(--foreground)", maxWidth: 110, lineHeight: 1.3 }}>{emp.user.name ?? emp.user.email}</p>
                  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${emp.tier.color}20`, color: emp.tier.color }}>
                    {emp.tier.label}
                  </span>
                  <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "var(--muted-foreground)" }}>
                    {emp.total === 0 ? "Chưa có công việc" : `Hoàn thành ${emp.done}/${emp.total}`}
                  </p>
                </div>
              </div>

              {/* Mini progress bar */}
              {emp.total > 0 && (
                <div style={{ margin: "10px 16px 0", background: "var(--border)", borderRadius: 6, height: 6, overflow: "hidden" }}>
                  <div style={{ display: "flex", height: "100%" }}>
                    <div style={{ width: `${emp.doneOnTime / emp.total * 100}%`, background: "#10b981", transition: "width 0.5s" }} />
                    <div style={{ width: `${emp.doneLate / emp.total * 100}%`, background: "#f59e0b", transition: "width 0.5s" }} />
                    <div style={{ width: `${emp.activeOver / emp.total * 100}%`, background: "#ef4444", transition: "width 0.5s" }} />
                  </div>
                </div>
              )}
              {emp.total > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 6, fontSize: 9.5, color: "var(--muted-foreground)" }}>
                  <span><span style={{ color: "#10b981" }}>●</span> Đúng hạn</span>
                  <span><span style={{ color: "#f59e0b" }}>●</span> Trễ</span>
                  <span><span style={{ color: "#ef4444" }}>●</span> Đang trễ</span>
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {statItems.map(s => (
                <div key={s.label} style={{ padding: "6px 4px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--border)", textAlign: "center" }}>
                  <i className={s.icon} style={{ fontSize: 13, color: s.color, display: "block", marginBottom: 2 }} />
                  <p style={{ margin: "0 0 1px", fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: 9, color: "var(--muted-foreground)", lineHeight: 1.2 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })() : (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: 12 }}>
          <i className="bi bi-person-circle" style={{ fontSize: 28, display: "block", marginBottom: 6, opacity: 0.4 }} />
          Chọn nhân viên để xem hiệu suất
        </div>
      )}
    </div>
  );






  // ── Kanban view ────────────────────────────────────────────────────────────
  const kanbanContent = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, minWidth: 900, paddingBottom: 8 }}>
      {STATUSES.map(col => {
        const colTasks = filtered.filter(t => t.status === col.key);
        return (
          <div key={col.key} style={{ background: "var(--muted)", borderRadius: 12, padding: "10px 10px 4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: col.color, display: "inline-block" }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, background: col.bg, color: col.color, padding: "1px 7px", borderRadius: 10 }}>{colTasks.length}</span>
            </div>
            {colTasks.map(t => <TaskCard key={t.id} task={t} onClick={() => setSelectedTask(t)} />)}
            {colTasks.length === 0 && <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted-foreground)", padding: "12px 0" }}>Không có</p>}
          </div>
        );
      })}
    </div>
  );

  // ── List view ──────────────────────────────────────────────────────────────
  const listContent = (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border)" }}>
            {["Tiêu đề", "Người thực hiện", "Ưu tiên", "Trạng thái", "Deadline"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map(t => {
            const overdueBool = isOverdue(t);
            const sCfg = STATUSES.find(s => s.key === t.status);
            return (
              <tr key={t.id} onClick={() => setSelectedTask(t)} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 600, maxWidth: 200 }}>
                  {t.title}
                  {overdueBool && <span style={{ marginLeft: 6, color: "#ef4444", fontSize: 10 }}>⚠ Trễ</span>}
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Avatar user={t.assignee} size={22} />
                    <span style={{ fontSize: 12 }}>{t.assignee?.name ?? t.assignee?.email}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 10px" }}><PriorityBadge priority={t.priority} /></td>
                <td style={{ padding: "10px 10px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: sCfg?.bg, color: sCfg?.color }}>{sCfg?.label}</span>
                </td>
                <td style={{ padding: "10px 10px", fontSize: 12, color: overdueBool ? "#ef4444" : "var(--muted-foreground)", fontWeight: overdueBool ? 700 : 400 }}>
                  {fmtDate(t.dueDate) ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && <p style={{ textAlign: "center", padding: "24px", color: "var(--muted-foreground)", fontSize: 13 }}>Không có công việc nào</p>}
    </div>
  );

  // ── Right content ──────────────────────────────────────────────────────────
  const rightContent = (
    <div>
      {/* Title */}
      <SectionTitle title="Danh sách công việc" className="mb-3" />

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", fontSize: 12, pointerEvents: "none" }} />
          <input
            placeholder="Tìm kiếm công việc..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{
              width: "100%", padding: "5px 10px 5px 30px", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--background)",
              color: "var(--foreground)", fontSize: 12, boxSizing: "border-box",
            }}
          />
        </div>

        {/* Status filter — từ DB */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
          padding: "5px 28px 5px 10px", borderRadius: 8, border: "1px solid var(--border)", appearance: "none",
          background: `var(--background) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E") no-repeat right 8px center`,
          color: "var(--foreground)", fontSize: 12, cursor: "pointer",
        }}>
          <option value="all">Trạng thái: Tất cả</option>
          {statusCategories.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
        </select>

        {/* Priority filter — từ DB */}
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
          padding: "5px 28px 5px 10px", borderRadius: 8, border: "1px solid var(--border)", appearance: "none",
          background: `var(--background) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E") no-repeat right 8px center`,
          color: "var(--foreground)", fontSize: 12, cursor: "pointer",
        }}>
          <option value="all">Ưu tiên: Tất cả</option>
          {priorityCategories.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
        </select>

        {/* Create button */}
        <button onClick={() => setShowCreate(true)} style={{
          padding: "5px 14px", borderRadius: 9, border: "none", flexShrink: 0,
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
          fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
        }}>
          <i className="bi bi-plus-lg" />Tạo mới
        </button>
      </div>

      {/* Content — dạng bảng */}
      {loading
        ? <div style={{ textAlign: "center", padding: 32, color: "var(--muted-foreground)" }}>Đang tải...</div>
        : <div>{listContent}</div>
      }
    </div>
  );


  return (
    <>
      <SplitLayoutPage
        title="Quản trị công việc"
        description="Ban Giám đốc · Giám sát tiến độ và phân công công việc toàn hệ thống"
        icon="bi-kanban"
        color="indigo"
        leftTopContent={kpiContent}
        leftContent={leftContent}
        rightContent={rightContent}
      />

      {showCreate && (
        <CreateTaskModal users={users} departments={departments} priorityCategories={priorityCategories} onClose={() => setShowCreate(false)} onCreated={loadData} />
      )}

      {selectedTask && (
        <TaskOffcanvas
          task={selectedTask} users={users} onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdate} onDelete={handleDelete}
        />
      )}
    </>
  );
}
