"use client";

import React from "react";

interface Step {
  key: string;
  label: string;
  icon?: string;
  color?: string;
}

interface Props {
  steps: Step[];
  /** key của step hiện tại (active) */
  currentKey: string;
  /** Nếu trạng thái là terminal (lost/cancelled…), hiển thị terminal banner thay timeline */
  terminalBanner?: {
    icon: string;
    label: string;
    color: string;
    bg: string;
    subText?: string;
  };
}

export function Timeline({ steps, currentKey, terminalBanner }: Props) {
  if (terminalBanner) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: 10,
        background: terminalBanner.bg,
        border: `1px solid ${terminalBanner.color}40`,
      }}>
        <i className={`bi ${terminalBanner.icon}`} style={{ fontSize: 16, color: terminalBanner.color }} />
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: terminalBanner.color }}>{terminalBanner.label}</p>
          {terminalBanner.subText && (
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{terminalBanner.subText}</p>
          )}
        </div>
      </div>
    );
  }

  const currentIdx = steps.findIndex(s => s.key === currentKey);

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {steps.map((step, idx) => {
        const stepIdx   = idx;
        const isDone    = currentIdx >= stepIdx;
        const isCurrent = currentIdx === stepIdx;
        const dotColor  = isDone ? (step.color ?? "var(--primary)") : "var(--border)";
        const nextColor = steps[idx + 1]?.color ?? "var(--primary)";

        return (
          <React.Fragment key={step.key}>
            {/* Dot + label */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 70 }}>
              <div style={{
                width: isCurrent ? 28 : 22, height: isCurrent ? 28 : 22,
                borderRadius: "50%",
                background: isDone ? dotColor : "var(--muted)",
                border: isCurrent
                  ? `3px solid ${dotColor}`
                  : `2px solid ${isDone ? dotColor : "var(--border)"}`,
                outline: isCurrent ? `3px solid ${dotColor}30` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                flexShrink: 0,
              }}>
                {isDone && (
                  <i
                    className={isCurrent && step.icon ? `bi ${step.icon}` : "bi bi-check-lg"}
                    style={{ fontSize: isCurrent ? 11 : 9, color: "#fff" }}
                  />
                )}
              </div>
              <span style={{
                fontSize: 9.5, fontWeight: isCurrent ? 800 : 600, textAlign: "center",
                color: isCurrent ? dotColor : isDone ? "var(--foreground)" : "var(--muted-foreground)",
                lineHeight: 1.3, maxWidth: 68,
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {idx < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 20,
                background: currentIdx > idx ? nextColor : "var(--border)",
                transition: "background 0.3s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
