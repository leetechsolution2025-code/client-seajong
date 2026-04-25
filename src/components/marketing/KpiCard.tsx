"use client";
import React from "react";

export type KpiTrend = { val: string; up: boolean };

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  extras?: { label: string; value: string }[];
  icon: string;
  color: string;
  trend?: KpiTrend;
  progress?: { cur: number; max: number };
  progressLabel?: string;
}

export function KpiCard({ label, value, sub, extras, icon, color, trend, progress, progressLabel }: KpiCardProps) {
  const pct = progress ? Math.round((progress.cur / progress.max) * 100) : null;
  return (
    <div className="app-card h-100" style={{ padding: "18px", borderRadius: 14, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {/* color accent */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: color, borderRadius: "14px 0 0 14px" }} />
      <div style={{ paddingLeft: 8, flex: "0 0 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", opacity: 0.85 }}>{label}</p>
            <p style={{ margin: "5px 0 2px", fontSize: 22, fontWeight: 900, color: "var(--foreground)", lineHeight: 1.1 }}>{value}</p>
            {extras && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginTop: 4 }}>
                {extras.map((extra, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{extra.label}:</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--foreground)" }}>{extra.value}</span>
                    {idx < extras.length - 1 && <span style={{ color: "var(--muted-foreground)", opacity: 0.3, marginLeft: 2 }}>|</span>}
                  </div>
                ))}
              </div>
            )}
            {sub && <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>{sub}</p>}
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`bi ${icon}`} style={{ fontSize: 17, color }} />
          </div>
        </div>
        
        <div>
          {trend && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              <i className={`bi ${trend.up ? "bi-arrow-up-right" : "bi-arrow-down-right"}`} style={{ fontSize: 11, color: trend.up ? "#10b981" : "#ef4444" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: trend.up ? "#10b981" : "#ef4444" }}>{trend.val}</span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>vs tháng trước</span>
            </div>
          )}
          {pct !== null && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{progressLabel || "Tiến độ"}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color }}>{pct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, transition: "width 0.5s" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
