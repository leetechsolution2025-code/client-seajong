import React, { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

interface StandardPageProps {
  title: string;
  description?: string;
  icon?: string;
  color?: "blue" | "emerald" | "violet" | "rose" | "amber" | "cyan" | "indigo";
  children: ReactNode;
  /** Nội dung hiển thị bên phải header (nếu có) */
  headerActions?: ReactNode;
  /** Tùy chỉnh màu nền trang, mặc định là #EBF0F5 theo yêu cầu người dùng */
  background?: string;
  /** Tự động bọc nội dung trong Card trắng? Mặc định true */
  useCard?: boolean;
  /** Padding cho vùng nội dung, mặc định là px-4 pb-4 pt-2 */
  paddingClassName?: string;
}

export function StandardPage({
  title,
  description,
  icon = "bi-grid",
  color = "indigo",
  children,
  headerActions,
  background = "#EBF0F5",
  useCard = true,
  paddingClassName = "px-4 pb-4 pt-2",
}: StandardPageProps) {
  return (
    <div className="d-flex flex-column h-100 overflow-hidden" style={{ background }}>
      <PageHeader
        title={title}
        description={description}
        icon={icon}
        color={color}
      >
        {headerActions}
      </PageHeader>

      <div className={`flex-grow-1 d-flex flex-column ${paddingClassName}`} style={{ minHeight: 0 }}>
        {useCard ? (
          <div className="bg-white rounded-4 shadow-sm border p-4 flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
