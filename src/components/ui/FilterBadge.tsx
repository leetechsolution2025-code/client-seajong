"use client";

/**
 * FilterBadge — bộ lọc dạng pill badge có số đếm.
 *
 * Dùng như sau:
 * ```tsx
 * <FilterBadgeGroup
 *   value={qFilter}
 *   onChange={setQFilter}
 *   options={[
 *     { value: "",     label: "Tất cả",  count: total },
 *     { value: "sent", label: "Đã gửi", count: sentCount },
 *     { value: "won",  label: "Thắng",  count: wonCount },
 *   ]}
 * />
 * ```
 */

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface FilterBadgeOption {
  /** Giá trị filter (chuỗi rỗng = "Tất cả") */
  value: string;
  /** Nhãn hiển thị */
  label: string;
  /** Số đếm hiển thị bên cạnh nhãn */
  count: number;
  /** Màu khi active (mặc định: #6366f1) */
  activeColor?: string;
}

interface FilterBadgeGroupProps {
  options: FilterBadgeOption[];
  value: string;
  onChange: (value: string) => void;
  /** Màu active mặc định cho toàn bộ group (có thể override từng option) */
  activeColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

// ── Single Badge ──────────────────────────────────────────────────────────────
export function FilterBadge({
  label, count, active, onClick, activeColor = "#6366f1",
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 99,
        border: "none", cursor: "pointer",
        fontSize: 11, fontWeight: 700,
        background: active ? activeColor : "var(--muted)",
        color: active ? "#fff" : "var(--muted-foreground)",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {label}
      <span style={{
        fontSize: 9.5, fontWeight: 800,
        padding: "1px 5px", borderRadius: 99,
        minWidth: 16, textAlign: "center",
        background: active ? "rgba(255,255,255,0.25)" : "var(--border)",
        color: active ? "#fff" : "var(--muted-foreground)",
      }}>
        {count}
      </span>
    </button>
  );
}

// ── Group (recommended) ───────────────────────────────────────────────────────
export function FilterBadgeGroup({
  options, value, onChange, activeColor = "#6366f1", className, style,
}: FilterBadgeGroupProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex", alignItems: "center",
        gap: 6, flexWrap: "wrap",
        ...style,
      }}
    >
      {options.map(opt => (
        <FilterBadge
          key={opt.value}
          label={opt.label}
          count={opt.count}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
          activeColor={opt.activeColor ?? activeColor}
        />
      ))}
    </div>
  );
}
