import React, { ReactNode } from "react";
 
interface KPICardProps {
  label: string;
  value: number | string | ReactNode;
  icon: string;        // Bootstrap icon class vd: "bi-people-fill"
  accent?: string;     // Hex color vd: "#2563eb"
  prefix?: ReactNode;  // Tiền tố vd: "+"
  suffix?: ReactNode;  // Hậu tố vd: "%"
  colClass?: string;   // Responsive col vd: "col-6 col-lg-3"
  subtitle?: string;   // Phụ đề vự vd: tổng giá trị
}

export function KPICard({
  label, value, icon, accent = "#6366f1", prefix = "", suffix = "", colClass = "col-6 col-lg-3", subtitle,
}: KPICardProps) {
  return (
    <div className={colClass}>
      <div className="app-card p-2 ps-3 d-flex align-items-center gap-3">
        {/* Icon */}
        <div
          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 48, height: 48, background: `${accent}18` }}
        >
          <i className={`bi ${icon}`} style={{ fontSize: 20, color: accent }} />
        </div>

        {/* Content */}
        <div className="overflow-hidden">
          <p
            className="mb-1 fw-semibold text-truncate"
            style={{ fontSize: 12, color: "var(--muted-foreground)", letterSpacing: "0.01em" }}
          >
            {label}
          </p>
          <p
            className="mb-0 fw-black"
            style={{ fontSize: 19, color: "var(--foreground)", lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            {prefix}{value}{suffix}
          </p>
          {subtitle && (
            <p className="mb-0" style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 3, fontWeight: 400 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
