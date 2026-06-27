"use client";

import React from "react";
import { motion } from "framer-motion";

export interface GanttTask {
  id: string;
  title: string;
  status: string;
  deadline?: string;
  assigneeName?: string;
  progress?: number;
  createdAt?: string;
  week1?: boolean;
  week2?: boolean;
  week3?: boolean;
  week4?: boolean;
  isGeneric?: boolean;
  isHeader?: boolean;
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

function getStatusMeta(task: GanttTask): { label: string; color: string; bg: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = task.deadline ? new Date(task.deadline) : null;
  if (dl) dl.setHours(0, 0, 0, 0);

  const progress = getTaskProgress(task);

  if (task.status === "done" || progress >= 100)
    return { label: "Hoàn thành", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" };

  if (dl && today > dl)
    return { label: "Quá hạn", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };

  if (task.status === "in_progress" || progress > 0) {
    const days = dl ? Math.round((dl.getTime() - today.getTime()) / 86400000) : null;
    if (days !== null && days < 3)
      return { label: "Chậm tiến độ", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" };
    return { label: "Đúng tiến độ", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" };
  }

  return { label: "Chưa thực hiện", color: "var(--muted-foreground, #64748b)", bg: "var(--border, #e2e8f0)" };
}

function daysUntil(deadline?: string): number | null {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline); dl.setHours(0, 0, 0, 0);
  return Math.round((dl.getTime() - today.getTime()) / 86400000);
}

export interface GanttChartProps {
  tasks: GanttTask[];
  filterMonth: number;
  onTaskClick: (task: GanttTask) => void;
}

export function GanttChart({ tasks, filterMonth, onTaskClick }: GanttChartProps) {
  const year = new Date().getFullYear();
  const daysInMonth = new Date(year, filterMonth, 0).getDate();
  const todayDate = new Date();
  const isCurrentMonth = todayDate.getMonth() + 1 === filterMonth && todayDate.getFullYear() === year;
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1;

  const getDayOfWeekName = (d: number) => {
    const date = new Date(year, filterMonth - 1, d);
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return dayNames[date.getDay()];
  };

  const getDayPercentage = (dayNum: number) => {
    if (dayNum <= 7) {
      return 25 * (dayNum - 1) / 7;
    }
    if (dayNum <= 14) {
      return 25 + 25 * (dayNum - 8) / 7;
    }
    if (dayNum <= 21) {
      return 50 + 25 * (dayNum - 15) / 7;
    }
    const daysInWeek4 = daysInMonth - 22 + 1;
    return 75 + 25 * (dayNum - 22) / daysInWeek4;
  };

  const getDayCenterPercentage = (dayNum: number) => {
    const startPct = getDayPercentage(dayNum);
    const endPct = dayNum === daysInMonth ? 100 : getDayPercentage(dayNum + 1);
    return (startPct + endPct) / 2;
  };

  const WEEK_RANGES = [
    { label: "Tuần 1", sub: `${getDayOfWeekName(1)} (1) – ${getDayOfWeekName(7)} (7)`,               from: 1,  to: 7  },
    { label: "Tuần 2", sub: `${getDayOfWeekName(8)} (8) – ${getDayOfWeekName(14)} (14)`,              from: 8,  to: 14 },
    { label: "Tuần 3", sub: `${getDayOfWeekName(15)} (15) – ${getDayOfWeekName(21)} (21)`,             from: 15, to: 21 },
    { label: "Tuần 4", sub: `${getDayOfWeekName(22)} (22) – ${getDayOfWeekName(daysInMonth)} (${daysInMonth})`, from: 22, to: daysInMonth },
  ];

  const todayPct = isCurrentMonth ? getDayCenterPercentage(todayDay) : -1;

  const GRADIENTS: Record<string, string> = {
    "#10b981": "linear-gradient(90deg, #047857 0%, #10b981 50%, #6ee7b7 100%)", 
    "#ef4444": "linear-gradient(90deg, #b91c1c 0%, #ef4444 50%, #fca5a5 100%)", 
    "#f97316": "linear-gradient(90deg, #c2410c 0%, #f97316 50%, #fdba74 100%)", 
    "#3b82f6": "linear-gradient(90deg, #1d4ed8 0%, #3b82f6 50%, #93c5fd 100%)", 
    "var(--muted-foreground)": "linear-gradient(90deg, #64748b 0%, #94a3b8 50%, #e2e8f0 100%)", 
  };

  if (tasks.length === 0) {
    return (
      <div style={{ padding: "70px 20px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: "var(--muted, #f1f5f9)", marginBottom: 14 }}>
          <i className="bi bi-bar-chart-gantt" style={{ fontSize: 28, color: "var(--muted-foreground, #64748b)" }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground, #0f172a)", marginBottom: 5 }}>Chưa có công việc nào</div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>Tháng {filterMonth} không có dữ liệu</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ minWidth: 640, flexShrink: 0 }}>
        {/* Column header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", alignItems: "stretch",
          background: "var(--muted, #f1f5f9)",
          borderBottom: "1px solid var(--border, #e2e8f0)",
        }}>
          <div style={{ width: 200, flexShrink: 0, padding: "9px 12px 9px 20px", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground, #64748b)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Công việc
            </span>
          </div>
          <div style={{ flex: 1, display: "flex" }}>
            {WEEK_RANGES.map((w, i) => (
              <div key={i} style={{
                flex: 1,
                borderLeft: "1px solid var(--border, #e2e8f0)",
                padding: "7px 0 4px 0",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground, #0f172a)" }}>{w.label}</div>
                  <div style={{ fontSize: 9, color: "var(--muted-foreground, #64748b)", marginTop: 1 }}>{w.sub}</div>
                </div>
                
                {/* Dải các thứ trong tuần */}
                <div style={{ display: "flex", justifyContent: "space-around", borderTop: "1px dashed var(--border, #e2e8f0)", marginTop: 4, paddingTop: 3 }}>
                  {Array.from({ length: w.to - w.from + 1 }).map((_, idx) => {
                    const dayNum = w.from + idx;
                    const dayName = getDayOfWeekName(dayNum);
                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 10 }}>
                        <span style={{ fontSize: 7.5, fontWeight: 700, color: "var(--muted-foreground, #64748b)" }}>{dayName}</span>
                        <span style={{ fontSize: 7.5, color: "var(--muted-foreground, #64748b)", scale: 0.95 }}>{dayNum}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ width: 90, flexShrink: 0, padding: "9px 16px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground, #64748b)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hạn chót</span>
          </div>
          <div style={{ width: 72, flexShrink: 0, padding: "9px 16px 9px 0", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground, #64748b)", textTransform: "uppercase", letterSpacing: "0.08em" }}>%</span>
          </div>
        </div>
      </div>

      {/* Scrollable task body */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
        <div style={{ minWidth: 640, position: "relative" }}>
          {/* Today needle */}
          {todayPct >= 0 && (
            <div style={{
              position: "absolute",
              top: 0, bottom: 0,
              left: `calc(200px + (100% - 200px - 90px - 72px) * ${todayPct / 100})`,
              width: 1.5,
              background: "#ef4444",
              zIndex: 10,
              pointerEvents: "none",
            }}>
              {/* Diamond ở đầu needle */}
              <div style={{
                position: "sticky", top: 0,
                left: "50%", transform: "translateX(-50%) rotate(45deg)",
                width: 7, height: 7, background: "#ef4444",
                borderRadius: 1.5,
              }} />
            </div>
          )}
          {tasks.map((task, idx) => {
            if (task.isHeader) {
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onTaskClick(task)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(99, 102, 241, 0.06)",
                    borderBottom: "1px solid var(--border, #e2e8f0)",
                    padding: "10px 20px",
                    cursor: "pointer",
                    transition: "background 0.12s"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.06)")}
                >
                  <i className="bi bi-shop text-primary me-2" style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary, #4f46e5)" }}>
                    {task.title}
                  </span>
                  {task.assigneeName && (
                    <span style={{ fontSize: 11, color: "var(--muted-foreground, #64748b)", marginLeft: 12 }}>
                      <i className="bi bi-geo-alt me-1" />
                      {task.assigneeName}
                    </span>
                  )}
                </motion.div>
              );
            }

            const meta = getStatusMeta(task);
            
            let startDayNum = 1;
            let endDayNum = daysInMonth;
            let hasAnyWeek = false;

            if (task.week1 || task.week2 || task.week3 || task.week4) {
              const weeksArr = [task.week1, task.week2, task.week3, task.week4];
              const firstActiveWeek = weeksArr.indexOf(true);
              const lastActiveWeek = weeksArr.lastIndexOf(true);
              
              if (firstActiveWeek >= 0) {
                hasAnyWeek = true;
                const weekRanges = [
                  { s: 1, e: 7 }, { s: 8, e: 14 }, { s: 15, e: 21 }, { s: 22, e: daysInMonth }
                ];
                startDayNum = weekRanges[firstActiveWeek].s;
                endDayNum = weekRanges[lastActiveWeek].e;
              }
            } else {
              const start = task.createdAt ? new Date(task.createdAt) : new Date();
              const end = task.deadline ? new Date(task.deadline) : start;

              const startMonth = start.getMonth() + 1;
              const startYear = start.getFullYear();
              const endMonth = end.getMonth() + 1;
              const endYear = end.getFullYear();

              if (startYear < year || (startYear === year && startMonth < filterMonth)) {
                startDayNum = 1;
              } else if (startYear === year && startMonth === filterMonth) {
                startDayNum = start.getDate();
              } else {
                startDayNum = daysInMonth + 1; 
              }

              if (endYear > year || (endYear === year && endMonth > filterMonth)) {
                endDayNum = daysInMonth;
              } else if (endYear === year && endMonth === filterMonth) {
                endDayNum = end.getDate();
              } else {
                endDayNum = 0;
              }

              hasAnyWeek = startDayNum <= daysInMonth && endDayNum >= 1 && startDayNum <= endDayNum;
            }

            const isSameDay = startDayNum === endDayNum && hasAnyWeek;

            const barLeft = hasAnyWeek ? getDayPercentage(startDayNum) : 0;
            const barRight = hasAnyWeek ? (endDayNum === daysInMonth ? 100 : getDayPercentage(endDayNum + 1)) : 0;
            const barWidth = hasAnyWeek ? (barRight - barLeft) : 0;
            const gradient = GRADIENTS[meta.color] || `linear-gradient(90deg, ${meta.color}, ${meta.color})`;

            const progress = getTaskProgress(task);
            const progressColor = progress >= 80 ? "#059669" : progress >= 40 ? "#2563eb" : progress > 0 ? "#ea580c" : "#94a3b8";

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                onClick={() => onTaskClick(task)}
                style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border, #e2e8f0)", cursor: "pointer", transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--muted, #f1f5f9)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {/* Task name */}
                <div style={{ width: 200, flexShrink: 0, padding: "6px 12px 6px 20px", borderRight: "1px solid var(--border, #e2e8f0)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden", marginBottom: 4 }}>
                    {task.title?.startsWith("[KH MKT]") ? (
                      <>
                        <span style={{
                          fontSize: 8, fontWeight: 800,
                          background: "rgba(99, 102, 241, 0.1)", color: "#6366f1",
                          padding: "1px 4px", borderRadius: 3,
                          textTransform: "uppercase", letterSpacing: "0.02em",
                          border: "1px solid rgba(99, 102, 241, 0.18)",
                          flexShrink: 0
                        }}>
                          KH MKT
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground, #0f172a)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {task.title.replace("[KH MKT]", "").trim()}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground, #0f172a)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.title}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{meta.label}</span>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ flex: 1, position: "relative", height: 24 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{
                      position: "absolute", top: 0, bottom: 0,
                      left: `${i * 25}%`, width: "25%",
                      borderLeft: i > 0 ? "1px solid var(--border, #e2e8f0)" : undefined,
                    }} />
                  ))}

                  {hasAnyWeek && isSameDay && (
                    <motion.div
                      initial={{ scale: 0, y: "-50%" }}
                      animate={{ scale: 1, y: "-50%" }}
                      style={{
                        position: "absolute",
                        top: "50%",
                        transformOrigin: "center center",
                        left: `calc(${getDayCenterPercentage(startDayNum)}% - 7px)`,
                        width: 14,
                        height: 14,
                        background: "darkblue",
                        borderRadius: 3,
                        zIndex: 2,
                        boxShadow: "0 2px 6px rgba(0, 0, 139, 0.4)",
                      }}
                      title={`${task.title} (Hoàn thành trong ngày: ${startDayNum}/${filterMonth})`}
                      transition={{ duration: 0.28 }}
                    />
                  )}

                  {hasAnyWeek && !isSameDay && (
                    <motion.div
                      initial={{ scaleX: 0, y: "-50%" }}
                      animate={{ scaleX: 1, y: "-50%" }}
                      style={{
                        position: "absolute",
                        top: "50%",
                        transformOrigin: "left center",
                        left: `calc(${barLeft}% + 2px)`,
                        width: `calc(${barWidth}% - 4px)`,
                        height: 14,
                        background: gradient,
                        borderRadius: 20,
                        zIndex: 2,
                        boxShadow: `0 2px 12px ${meta.color}55, 0 1px 3px ${meta.color}33`,
                        display: "flex", alignItems: "center", paddingLeft: 8, gap: 4, overflow: "hidden",
                      }}
                      transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <span style={{
                        marginLeft: "auto", marginRight: 8, fontSize: 9, fontWeight: 800,
                        color: "rgba(255,255,255,0.95)", letterSpacing: "0.03em", flexShrink: 0,
                      }}>
                        {progress}%
                      </span>
                    </motion.div>
                  )}

                  {!hasAnyWeek && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground, #64748b)" }}>—</span>
                    </div>
                  )}
                </div>

                {/* Deadline */}
                <div style={{ width: 90, flexShrink: 0, padding: "6px 12px 6px 8px", textAlign: "right", borderLeft: "1px solid var(--border, #e2e8f0)" }}>
                  {task.deadline ? (() => {
                    const days = daysUntil(task.deadline);
                    const d = new Date(task.deadline);
                    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
                    let color = "#10b981";
                    if (days !== null) {
                      if (days < 0) color = "#ef4444";
                      else if (days <= 3) color = "#f97316";
                    }
                    return (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color }}>{dateStr}</div>
                        {days !== null && (
                          <div style={{ fontSize: 9, color: "var(--muted-foreground, #64748b)", marginTop: 1, fontWeight: 600 }}>
                            {days < 0 ? `trễ ${Math.abs(days)}` : days === 0 ? "hôm nay" : `còn ${days} ngày`}
                          </div>
                        )}
                      </div>
                    );
                  })() : <span style={{ fontSize: 10, color: "var(--muted-foreground, #64748b)" }}>—</span>}
                </div>

                {/* Progress */}
                <div style={{ width: 72, flexShrink: 0, padding: "6px 16px 6px 0", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: progressColor }}>{progress}%</span>
                  <div style={{ width: 40, height: 4, background: "var(--border, #e2e8f0)", borderRadius: 4, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ height: "100%", background: progressColor, borderRadius: 4 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
