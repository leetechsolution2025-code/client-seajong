"use client";

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TableColumn<T> {
  /** Tiêu đề cột */
  header: string;
  /** Key trong row hoặc render function */
  render: (row: T, index: number) => React.ReactNode;
  /** Độ rộng cố định (px hoặc %) */
  width?: number | string;
  /** Căn lề nội dung ô */
  align?: "left" | "center" | "right";
  /** Không wrap text trong header */
  noWrap?: boolean;
}

export interface TableProps<T> {
  /** Dữ liệu của bảng */
  rows: T[];
  /** Định nghĩa cột */
  columns: TableColumn<T>[];
  /** Đang fetch lần đầu → hiển thị skeleton */
  loading?: boolean;
  /** Đang refetch → mờ nhẹ, không xóa data */
  fetching?: boolean;
  /** Key duy nhất cho mỗi row (mặc định dùng index) */
  rowKey?: (row: T) => string | number;
  /** Click vào row */
  onRowClick?: (row: T) => void;
  /** Số skeleton rows khi loading */
  skeletonRows?: number;
  /** Nội dung hiển thị khi không có data */
  emptyIcon?: string;
  emptyText?: string;
  /** Zebra striping */
  striped?: boolean;
  /** Min-width cho bảng */
  minWidth?: number | string;
  /** Font size mặc định */
  fontSize?: number;
  /** Giảm chiều cao dòng (padding nhỏ hơn) */
  compact?: boolean;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} style={{ padding: "12px 14px" }}>
          <div
            style={{
              height: 12, borderRadius: 4,
              background: "var(--muted)",
              width: j === 0 ? "65%" : j === cols - 1 ? "40%" : "55%",
              animation: "tbl-pulse 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table<T>({
  rows,
  columns,
  loading = false,
  fetching = false,
  rowKey,
  onRowClick,
  skeletonRows = 7,
  emptyIcon = "bi-inbox",
  emptyText = "Không có dữ liệu",
  striped = true,
  minWidth,
  fontSize = 13,
  compact = false,
}: TableProps<T>) {
  return (
    <>
      <style>{`
        @keyframes tbl-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .app-tbl-row { transition: background 0.12s; }
        .app-tbl-row:hover td {
          background: color-mix(in srgb, var(--primary) 5%, var(--background)) !important;
        }
      `}</style>

      <div
        style={{
          overflowX: minWidth ? "auto" : "hidden",
          opacity: fetching ? 0.5 : 1,
          pointerEvents: fetching ? "none" : "auto",
          transition: "opacity 0.15s",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            ...(minWidth ? { minWidth } : {}),
            fontSize,
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  style={{
                    padding: "9px 14px",
                    textAlign: col.align ?? "left",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--muted-foreground)",
                    background: "var(--background)",
                    borderBottom: "2px solid var(--border)",
                    whiteSpace: col.noWrap !== false ? "nowrap" : undefined,
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "48px 14px",
                    textAlign: "center",
                    color: "var(--muted-foreground)",
                    fontSize: 13,
                  }}
                >
                  <i
                    className={`bi ${emptyIcon}`}
                    style={{ fontSize: 28, display: "block", marginBottom: 10, opacity: 0.25 }}
                  />
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const key = rowKey ? rowKey(row) : idx;
                const isOdd = striped && idx % 2 !== 0;
                return (
                  <tr
                    key={key}
                    className={onRowClick ? "app-tbl-row" : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      cursor: onRowClick ? "pointer" : undefined,
                      background: isOdd
                        ? "color-mix(in srgb, var(--muted) 25%, transparent)"
                        : "transparent",
                    }}
                  >
                    {columns.map((col, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: compact ? "6px 14px" : "11px 14px",
                          verticalAlign: "middle",
                          textAlign: col.align ?? "left",
                        }}
                      >
                        {col.render(row, idx)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
