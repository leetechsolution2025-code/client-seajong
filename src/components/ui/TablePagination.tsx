"use client";

import React from "react";
import { Pagination } from "./Pagination";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  /**
   * Current active page (1-based)
   */
  page: number;
  /**
   * Total number of pages
   */
  totalPages: number;
  /**
   * Callback when page changes
   */
  onPageChange: (page: number) => void;
  /**
   * Number of items displayed on current page
   */
  currentCount?: number;
  /**
   * Total number of items across all pages
   */
  totalCount?: number;
  /**
   * Item name for display (e.g. "khách hàng", "đơn hàng", "sản phẩm")
   */
  itemName?: string;
  /**
   * Current page size
   */
  pageSize?: number;
  /**
   * Page size dropdown options (default: [10, 20, 50, 100])
   */
  pageSizeOptions?: number[];
  /**
   * Callback when page size changes
   */
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * Additional container class names
   */
  className?: string;
  /**
   * Additional inline styles
   */
  style?: React.CSSProperties;
  /**
   * Sibling count on pagination buttons (default: 1)
   */
  siblingCount?: number;
  /**
   * Compact styling for smaller containers
   */
  compact?: boolean;
}

/**
 * TablePagination - Standardized pagination and table footer component.
 * Displays item count stats, page size selector, and page navigation buttons.
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  currentCount,
  totalCount,
  itemName = "mục",
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  className,
  style,
  siblingCount = 1,
  compact = false,
}) => {
  const showStats = totalCount !== undefined;

  return (
    <div
      className={cn(
        "app-table-pagination d-flex align-items-center justify-content-between flex-wrap gap-2 w-100 m-0",
        compact ? "px-3 py-1 bg-transparent" : "px-4 py-1.5 bg-transparent",
        className
      )}
      style={style}
    >
      {/* Left side: Item count statistics and Page size dropdown */}
      <div className="d-flex align-items-center flex-wrap gap-2">
        {showStats && (
          <small className="text-muted m-0 p-0" style={{ fontSize: 12.5 }}>
            Hiển thị <b>{currentCount !== undefined ? `${currentCount}/${totalCount}` : totalCount}</b> {itemName}
          </small>
        )}

        {onPageSizeChange && (
          <div className="d-flex align-items-center gap-1.5 ms-1 ms-sm-2 text-muted" style={{ fontSize: 12 }}>
            {showStats && <span className="opacity-50">•</span>}
            <span>Hiển thị:</span>
            <select
              className="form-select form-select-sm py-0 ps-2 pe-4"
              style={{
                width: "auto",
                height: 26,
                fontSize: 12,
                borderRadius: 6,
                cursor: "pointer",
                borderColor: "var(--border)",
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                boxShadow: "none",
              }}
              value={pageSize || pageSizeOptions[0]}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} dòng/trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page navigation */}
      <div className="ms-auto flex-shrink-0">
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={onPageChange}
          siblingCount={siblingCount}
        />
      </div>
    </div>
  );
};
