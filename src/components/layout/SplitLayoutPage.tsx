import React, { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

interface SplitLayoutPageProps {
  title: string;
  description: string;
  icon: string;
  color?: "blue" | "emerald" | "violet" | "rose" | "amber" | "cyan" | "indigo";
  /** Số cột trái (1-11), mặc định 5. Cột phải = 12 - leftCols */
  leftCols?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  leftTopContent?: ReactNode;
  leftContent?: ReactNode;
  rightTopContent?: ReactNode;
  rightContent?: ReactNode;
}

export function SplitLayoutPage({
  title,
  description,
  icon,
  color,
  leftCols = 5,
  leftTopContent,
  leftContent,
  rightTopContent,
  rightContent,
}: SplitLayoutPageProps) {
  const rightCols = 12 - leftCols;
  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title={title}
        description={description}
        icon={icon}
        color={color}
      />

      <div style={{ flex: 1, padding: "1rem", overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div className="row g-4" style={{ flex: 1, alignContent: "stretch" }}>

          {/* Cột Trái */}
          <div className={`col-12 col-xl-${leftCols} d-flex flex-column gap-3`}>
            {leftTopContent && <div>{leftTopContent}</div>}
            <div className="app-card flex-1 w-100 border-0 p-4" style={{ boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)", minHeight: 200, overflowY: "auto", maxHeight: "calc(100vh - 180px)" }}>
              {leftContent}
            </div>
          </div>

          {/* Cột Phải */}
          <div className={`col-12 col-xl-${rightCols} d-flex flex-column gap-3`}>
            {rightTopContent && <div>{rightTopContent}</div>}
            <div className="app-card flex-1 w-100 border-0 p-4" style={{ boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)", minHeight: 200, display: "flex", flexDirection: "column" }}>
              {rightContent}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
