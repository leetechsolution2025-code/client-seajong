import React, { ReactNode, useState, useEffect } from "react";
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
  /** Tab hiển thị trên giao diện mobile ("left" hoặc "right") */
  mobileActiveTab?: "left" | "right";
  leftTabLabel?: string;
  rightTabLabel?: string;
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
  mobileActiveTab,
  leftTabLabel = "Thông tin chi tiết",
  rightTabLabel = "Biểu đồ & Phân tích",
}: SplitLayoutPageProps) {
  const rightCols = 12 - leftCols;
  const [internalTab, setInternalTab] = useState<"left" | "right">("left");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1200); // 1200px matches the Bootstrap xl breakpoint
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeTab = mobileActiveTab !== undefined ? mobileActiveTab : internalTab;

  return (
    <div className="d-flex flex-column" style={{ background: "var(--background)", height: "calc(100vh - 62px)", overflow: "hidden" }}>
      <PageHeader
        title={title}
        description={description}
        icon={icon}
        color={color}
      />

      <div style={{ flex: 1, padding: "1rem", overflowY: "hidden", minHeight: 0, display: "flex", flexDirection: "column" }}>
        
        {mobileActiveTab === undefined && isMobile && (
          <div 
            className="d-flex p-1 mb-3 mx-0" 
            style={{ 
              background: "var(--card)", 
              borderRadius: 12, 
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              flexShrink: 0
            }}
          >
            <button
              onClick={() => setInternalTab("left")}
              style={{
                flex: 1,
                border: "none",
                background: activeTab === "left" ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent",
                color: activeTab === "left" ? "#fff" : "var(--muted-foreground)",
                borderRadius: 9,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.2s",
                cursor: "pointer",
                boxShadow: activeTab === "left" ? "0 2px 8px rgba(139,92,246,0.25)" : "none"
              }}
            >
              <i className={`bi ${icon || "bi-grid-fill"} me-1`} />
              {leftTabLabel}
            </button>
            <button
              onClick={() => setInternalTab("right")}
              style={{
                flex: 1,
                border: "none",
                background: activeTab === "right" ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent",
                color: activeTab === "right" ? "#fff" : "var(--muted-foreground)",
                borderRadius: 9,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.2s",
                cursor: "pointer",
                boxShadow: activeTab === "right" ? "0 2px 8px rgba(139,92,246,0.25)" : "none"
              }}
            >
              <i className="bi bi-bar-chart-line me-1" />
              {rightTabLabel}
            </button>
          </div>
        )}

        <div className="row g-4" style={{ flex: 1, alignContent: "stretch", overflow: "hidden", margin: 0 }}>

          {/* Cột Trái */}
          <div className={`col-12 col-xl-${leftCols} ${activeTab === "right" ? "d-none d-xl-flex" : "d-flex"} flex-column gap-3 p-0 pe-xl-2`} style={{ height: "100%", overflow: "hidden", marginTop: 0 }}>
            {leftTopContent && <div style={{ flexShrink: 0 }}>{leftTopContent}</div>}
            <div className="app-card flex-1 w-100 border p-4" style={{ boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)", overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
              {leftContent}
            </div>
          </div>

          {/* Cột Phải */}
          <div className={`col-12 col-xl-${rightCols} ${activeTab === "left" ? "d-none d-xl-flex" : "d-flex"} flex-column gap-3 p-0 ps-xl-2`} style={{ height: "100%", overflow: "hidden", marginTop: 0 }}>
            {rightTopContent && <div style={{ flexShrink: 0 }}>{rightTopContent}</div>}
            <div className="app-card flex-1 w-100 border p-0" style={{ boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)", overflowY: "hidden", minHeight: 0, display: "flex", flexDirection: "column" }}>
              {rightContent}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
