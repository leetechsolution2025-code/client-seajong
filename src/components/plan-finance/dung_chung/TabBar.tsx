"use client";
import React from "react";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  /** Bootstrap icon class, e.g. "bi-bar-chart-line" */
  icon?: string;
  /** Badge number/text hiển thị sau label */
  badge?: string | number;
}

interface TabBarProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  /** Màu active — mặc định #f59e0b (amber) */
  activeColor?: string;
  /** Gap giữa các tab — mặc định 4 */
  gap?: number;
  /** Padding của wrapper — mặc định 4 */
  padding?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function TabBar<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  activeColor = "#f59e0b",
  gap = 4,
  padding = 4,
  className,
  style,
}: TabBarProps<T>) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        gap,
        background: "var(--muted)",
        borderRadius: 10,
        padding,
        ...style,
      }}
    >
      {tabs.map(t => {
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1,
              padding: "7px 4px",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              background: active ? "var(--card)" : "transparent",
              color:      active ? activeColor : "var(--muted-foreground)",
              boxShadow:  active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {t.icon && <i className={`bi ${t.icon}`} style={{ fontSize: 12 }} />}
            {t.label}
            {t.badge !== undefined && t.badge !== "" && (
              <span style={{
                background: active ? activeColor : "var(--muted-foreground)",
                color: "#fff",
                borderRadius: 99,
                fontSize: 9,
                fontWeight: 900,
                padding: "0 5px",
                lineHeight: "16px",
                minWidth: 16,
                textAlign: "center",
              }}>
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
