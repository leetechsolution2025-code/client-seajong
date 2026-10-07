"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  /**
   * Trang hiện tại (1-based)
   */
  page: number;
  /**
   * Tổng số trang
   */
  totalPages: number;
  /**
   * Callback khi đổi trang
   */
  onPageChange: (page: number) => void;
  /**
   * Số lượng bản ghi trên trang hiện tại (tuỳ chọn)
   */
  currentCount?: number;
  /**
   * Tổng số bản ghi
   */
  totalCount?: number;
  /**
   * Tên định danh (vd: "bản ghi", "yêu cầu", "khách hàng", "đơn hàng")
   */
  itemName?: string;
  /**
   * Số dòng hiển thị mỗi trang
   */
  pageSize?: number;
  /**
   * Danh sách tuỳ chọn số dòng mỗi trang
   */
  pageSizeOptions?: number[];
  /**
   * Callback khi đổi số dòng mỗi trang
   */
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * ClassName bổ sung
   */
  className?: string;
  /**
   * Style bổ sung
   */
  style?: React.CSSProperties;
  /**
   * Số trang lân cận hiển thị (mặc định: 1)
   */
  siblingCount?: number;
  /**
   * Chế độ compact cho khung hẹp
   */
  compact?: boolean;
}

/**
 * Xây dựng danh sách các trang cần hiển thị với dấu "..."
 */
function buildPageItems(page: number, totalPages: number, siblingCount: number): (number | "...")[] {
  const safeTotal = Math.max(1, totalPages);
  if (safeTotal <= 5) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, safeTotal);

  const shouldShowLeftDots = leftSibling > 2;
  const shouldShowRightDots = rightSibling < safeTotal - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "...", safeTotal];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => safeTotal - rightItemCount + 1 + i
    );
    return [1, "...", ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = Array.from(
      { length: rightSibling - leftSibling + 1 },
      (_, i) => leftSibling + i
    );
    return [1, "...", ...middleRange, "...", safeTotal];
  }

  return Array.from({ length: safeTotal }, (_, i) => i + 1);
}

/**
 * TablePagination - Component phân trang chuẩn thống nhất trên toàn hệ thống.
 * Không cần bọc thêm container nào khác khi sử dụng trong Footer của bảng hoặc FullWidthTableLayout.
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  currentCount,
  totalCount,
  itemName = "bản ghi",
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageSizeChange,
  className,
  style,
  siblingCount = 1,
  compact = false,
}) => {
  const safeTotal = Math.max(1, totalPages);
  const pages = buildPageItems(page, safeTotal, siblingCount);

  // Tính số thứ tự hiển thị: "Hiển thị start - end trong tổng số totalCount..."
  let statsText = null;
  if (totalCount !== undefined) {
    if (pageSize) {
      const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, totalCount);
      statsText = (
        <span>
          Hiển thị <b>{start} - {end}</b> trong tổng số <b>{totalCount}</b> {itemName}
        </span>
      );
    } else if (currentCount !== undefined) {
      statsText = (
        <span>
          Hiển thị <b>{currentCount}/{totalCount}</b> {itemName}
        </span>
      );
    } else {
      statsText = (
        <span>
          Tổng số <b>{totalCount}</b> {itemName}
        </span>
      );
    }
  }

  return (
    <div
      className={cn(
        "d-flex flex-column flex-sm-row align-items-center justify-content-between w-100 gap-2",
        className
      )}
      style={style}
    >
      {/* ── BÊN TRÁI: THỐNG KÊ BẢN GHI & CHỌN SỐ DÒNG ── */}
      <div className="d-flex align-items-center flex-wrap gap-2 text-muted" style={{ fontSize: compact ? "11.5px" : "12px" }}>
        {statsText}

        {onPageSizeChange && pageSize && (
          <div className="d-flex align-items-center gap-1.5 ms-1 ms-sm-2">
            <span>Mỗi trang:</span>
            <select
              className="form-select form-select-sm shadow-none"
              style={{
                width: "88px",
                height: 28,
                borderRadius: "6px",
                fontSize: "12px",
                padding: "2px 24px 2px 8px",
                borderColor: "var(--border)",
                background: "var(--background)",
                color: "var(--foreground)",
                cursor: "pointer"
              }}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} dòng
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── BÊN PHẢI: CÁC NÚT ĐIỀU HƯỚNG TRANG ── */}
      <div className="d-flex align-items-center gap-1 ms-auto flex-shrink-0">
        {/* Nút về trang đầu (<<) */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="btn btn-sm btn-light border d-flex align-items-center justify-content-center p-0"
          title="Trang đầu"
          style={{
            width: 30,
            height: 30,
            borderRadius: "6px",
            borderColor: "var(--border)",
            opacity: page <= 1 ? 0.4 : 1,
            cursor: page <= 1 ? "not-allowed" : "pointer"
          }}
        >
          <i className="bi bi-chevron-double-left" style={{ fontSize: "11px" }}></i>
        </button>

        {/* Nút lùi 1 trang (<) */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn btn-sm btn-light border d-flex align-items-center justify-content-center p-0"
          title="Trang trước"
          style={{
            width: 30,
            height: 30,
            borderRadius: "6px",
            borderColor: "var(--border)",
            opacity: page <= 1 ? 0.4 : 1,
            cursor: page <= 1 ? "not-allowed" : "pointer"
          }}
        >
          <i className="bi bi-chevron-left" style={{ fontSize: "11px" }}></i>
        </button>

        {/* Các nút số trang & dấu ba chấm */}
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`dots-${idx}`}
                className="d-flex align-items-center justify-content-center text-muted"
                style={{ width: 24, height: 30, fontSize: "12px", userSelect: "none" }}
              >
                ...
              </span>
            );
          }

          const isActive = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              className="btn btn-sm d-flex align-items-center justify-content-center fw-bold p-0"
              style={{
                width: 30,
                height: 30,
                borderRadius: "6px",
                fontSize: "12px",
                background: isActive ? "#4f46e5" : "transparent",
                color: isActive ? "#ffffff" : "var(--foreground)",
                border: isActive ? "none" : "1px solid var(--border)",
                cursor: "pointer"
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Nút tiến 1 trang (>) */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeTotal, page + 1))}
          disabled={page >= safeTotal}
          className="btn btn-sm btn-light border d-flex align-items-center justify-content-center p-0"
          title="Trang sau"
          style={{
            width: 30,
            height: 30,
            borderRadius: "6px",
            borderColor: "var(--border)",
            opacity: page >= safeTotal ? 0.4 : 1,
            cursor: page >= safeTotal ? "not-allowed" : "pointer"
          }}
        >
          <i className="bi bi-chevron-right" style={{ fontSize: "11px" }}></i>
        </button>

        {/* Nút đến trang cuối (>>) */}
        <button
          type="button"
          onClick={() => onPageChange(safeTotal)}
          disabled={page >= safeTotal}
          className="btn btn-sm btn-light border d-flex align-items-center justify-content-center p-0"
          title="Trang cuối"
          style={{
            width: 30,
            height: 30,
            borderRadius: "6px",
            borderColor: "var(--border)",
            opacity: page >= safeTotal ? 0.4 : 1,
            cursor: page >= safeTotal ? "not-allowed" : "pointer"
          }}
        >
          <i className="bi bi-chevron-double-right" style={{ fontSize: "11px" }}></i>
        </button>
      </div>
    </div>
  );
};
