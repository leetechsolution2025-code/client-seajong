"use client";

import React from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  siblingCount?: number; // số trang hiện bên cạnh trang hiện tại
}

function buildPages(page: number, total: number, siblings: number): (number | "...")[] {
  if (total <= 1) return [1];

  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  const left  = Math.max(2, page - siblings);
  const right = Math.min(total - 1, page + siblings);

  const pages: (number | "...")[] = [1];

  if (left > 2)  pages.push("...");
  pages.push(...range(left, right));
  if (right < total - 1) pages.push("...");
  if (total > 1) pages.push(total);

  return pages;
}

export function Pagination({ page, totalPages, onChange, siblingCount = 1 }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages, siblingCount);

  const btnBase: React.CSSProperties = {
    minWidth: 32, height: 32, display: "inline-flex", alignItems: "center",
    justifyContent: "center", padding: "0 6px",
    borderWidth: "1px", borderStyle: "solid", borderColor: "var(--border)",
    background: "var(--card)", color: "var(--foreground)", fontSize: 13,
    cursor: "pointer", borderRadius: "var(--radius)", transition: "all 0.15s",
    fontWeight: 400, userSelect: "none",
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: "var(--primary)", color: "#fff",
    borderColor: "var(--primary)", fontWeight: 600,
  };

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.35, cursor: "not-allowed",
    pointerEvents: "none",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, padding: "12px 0 0", flexWrap: "wrap" }}>
      {/* Prev */}
      <button
        style={page <= 1 ? btnDisabled : btnBase}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <i className="bi bi-chevron-left" style={{ fontSize: 12 }} />
      </button>

      {/* Pages */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} style={{ minWidth: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
            …
          </span>
        ) : (
          <button
            key={p}
            style={p === page ? btnActive : btnBase}
            onClick={() => onChange(p as number)}
            onMouseEnter={e => { if (p !== page) { e.currentTarget.style.background = "var(--muted)"; } }}
            onMouseLeave={e => { if (p !== page) { e.currentTarget.style.background = "var(--card)"; } }}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        style={page >= totalPages ? btnDisabled : btnBase}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        <i className="bi bi-chevron-right" style={{ fontSize: 12 }} />
      </button>
    </div>
  );
}
