"use client";

import React from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { cn } from "@/lib/utils";

export interface TableToolbarProps {
  /**
   * Search input value
   */
  searchValue?: string;
  /**
   * Search input change handler
   */
  onSearchChange?: (val: string) => void;
  /**
   * Search input placeholder (default: "Tìm kiếm...")
   */
  searchPlaceholder?: string;
  /**
   * Explicit search input width or max width (default: 280)
   */
  searchWidth?: number | string;
  /**
   * Whether search input should flex to fill available space on the left
   */
  searchFlex?: boolean;
  /**
   * Explicit toggle to show/hide search input (defaults to true if onSearchChange is provided)
   */
  showSearch?: boolean;
  /**
   * Search input disabled state
   */
  searchDisabled?: boolean;
  /**
   * Filter dropdowns or badges (e.g. FilterSelect, DatePicker)
   */
  filters?: React.ReactNode;
  /**
   * Position of filters relative to search input (default: "before-search" matching project standard)
   */
  filtersPosition?: "before-search" | "after-search";
  /**
   * Action buttons placed on the right (e.g., "+ Thêm mới", "Xuất Excel")
   */
  actions?: React.ReactNode;
  /**
   * Custom elements placed before everything on the left
   */
  leftSlot?: React.ReactNode;
  /**
   * Custom elements placed after actions on the far right
   */
  rightSlot?: React.ReactNode;
  /**
   * Custom children inside the toolbar container
   */
  children?: React.ReactNode;
  /**
   * Additional container class names
   */
  className?: string;
  /**
   * Additional container inline styles
   */
  style?: React.CSSProperties;
  /**
   * Whether to add a bottom border (default: false, as tableWrapperClassName="border-top" provides the single dividing border)
   */
  bordered?: boolean;
  /**
   * Compact height and padding for denser viewports
   */
  compact?: boolean;
}

/**
 * TableToolbar - Standardized toolbar component for tables across the application.
 * Follows the project standard: Filters + Search on Left, Actions on Right, no duplicate bottom border.
 */
export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  searchWidth = 280,
  searchFlex = false,
  showSearch = true,
  searchDisabled = false,
  filters,
  filtersPosition = "before-search",
  actions,
  leftSlot,
  rightSlot,
  children,
  className,
  style,
  bordered = false,
  compact = false,
}) => {
  const shouldRenderSearch = showSearch && onSearchChange !== undefined;
  const hasLeftContent = leftSlot || shouldRenderSearch || filters;
  const hasRightContent = actions || rightSlot;

  const renderSearch = () => {
    if (!shouldRenderSearch) return null;
    return (
      <div
        style={{
          width: searchFlex ? "100%" : typeof searchWidth === "number" ? `${searchWidth}px` : searchWidth,
          flex: searchFlex ? 1 : undefined,
          minWidth: 160,
          maxWidth: searchFlex ? undefined : typeof searchWidth === "number" ? `${searchWidth}px` : searchWidth,
        }}
      >
        <SearchInput
          value={searchValue ?? ""}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          disabled={searchDisabled}
        />
      </div>
    );
  };

  return (
    <div
      className={cn(
        "app-table-toolbar d-flex align-items-center justify-content-between flex-wrap gap-2 w-100",
        compact ? "py-1" : "py-1.5",
        bordered && "border-bottom",
        className
      )}
      style={style}
    >
      {/* Left side: LeftSlot + Filters + SearchInput */}
      {hasLeftContent && (
        <div className="d-flex align-items-center flex-wrap gap-2 flex-grow-1" style={{ minWidth: 0 }}>
          {leftSlot}

          {filtersPosition === "before-search" ? (
            <>
              {filters}
              {renderSearch()}
            </>
          ) : (
            <>
              {renderSearch()}
              {filters}
            </>
          )}
        </div>
      )}

      {/* Right side: Actions & RightSlot */}
      {hasRightContent && (
        <div className="d-flex align-items-center flex-wrap gap-2 ms-auto">
          {actions}
          {rightSlot}
        </div>
      )}

      {children}
    </div>
  );
};
