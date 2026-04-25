import React, { ReactNode } from "react";

interface SectionTitleProps {
  title: string;
  className?: string;
  style?: React.CSSProperties;
  action?: ReactNode; // Nếu muốn gắn thêm button nhỏ ở góc phải tiêu đề
}

export function SectionTitle({ title, className = "", style, action }: SectionTitleProps) {
  return (
    <div className={`d-flex align-items-center justify-content-between mb-3 ${className}`}>
      <h6 
        className="mb-0 fw-bold text-uppercase d-flex align-items-center" 
        style={{ color: "var(--muted-foreground)", fontSize: 11, letterSpacing: "0.05em", lineHeight: 1, ...style }}
      >
        {title}
      </h6>
      {action && <div>{action}</div>}
    </div>
  );
}
