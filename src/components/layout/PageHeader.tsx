"use client";

import React, { useState, useEffect } from "react";

interface PageHeaderProps {
  /** Tên phòng ban / tiêu đề trang */
  title: string;
  /** Mô tả ngắn */
  description?: string;
  /** Icon Bootstrap (vd: "bi-people", "bi-cpu") */
  icon?: string;
  /** Màu accent cho icon box: "rose" | "indigo" | "emerald" | "amber" | "blue" | "violet" */
  color?: "rose" | "indigo" | "emerald" | "amber" | "blue" | "violet" | "cyan";
  children?: React.ReactNode;
}

const WEEKDAYS = [
  "Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư",
  "Thứ năm", "Thứ sáu", "Thứ bảy",
];

const COLOR_MAP: Record<string, { bg: string; icon: string }> = {
  rose:    { bg: "ph-icon-box-rose",    icon: "ph-icon-rose" },
  indigo:  { bg: "ph-icon-box-indigo",  icon: "ph-icon-indigo" },
  emerald: { bg: "ph-icon-box-emerald", icon: "ph-icon-emerald" },
  amber:   { bg: "ph-icon-box-amber",   icon: "ph-icon-amber" },
  blue:    { bg: "ph-icon-box-blue",    icon: "ph-icon-blue" },
  violet:  { bg: "ph-icon-box-violet",  icon: "ph-icon-violet" },
  cyan:    { bg: "ph-icon-box-cyan",    icon: "ph-icon-cyan" },
};

export function PageHeader({ title, description, icon = "bi-grid", color = "rose", children }: PageHeaderProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now
    ? now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "--:--:--";

  const day   = now ? String(now.getDate()).padStart(2, "0") : "00";
  const month = now ? String(now.getMonth() + 1).padStart(2, "0") : "00";
  const year  = now ? now.getFullYear() : "";

  const dateStr = now
    ? `${WEEKDAYS[now.getDay()]}, ngày ${day} tháng ${month} năm ${year}`
    : "";

  const colors = COLOR_MAP[color] ?? COLOR_MAP.rose;

  return (
    <div className="page-header-bar">

      {/* ── LEFT: Icon box + Tên phòng ban + mô tả ── */}
      <div className="page-header-left">
        {/* Icon box */}
        <div className={`ph-icon-box ${colors.bg}`}>
          <i className={`bi ${icon} ${colors.icon}`} />
        </div>

        {/* Text */}
        <div className="ph-text">
          <h1 className="page-header-title">{title}</h1>
          {description && <p className="page-header-desc">{description}</p>}
        </div>
      </div>

      {/* ── RIGHT: Đồng hồ + ngày tháng + actions ── */}
      <div className="page-header-right" style={{ gap: "24px" }}>
        {children}
        <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
          <span className="page-header-clock">{timeStr}</span>
          <span className="page-header-date">{dateStr}</span>
        </div>
      </div>

    </div>
  );
}
