"use client";

import React from "react";

interface Option { label: string; value: string; }

interface FilterSelectProps {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  width?: number | string;
}


export const SELECT_STYLE: React.CSSProperties = {
  fontSize: 13,
  padding: "7px 28px 7px 10px",
  flexShrink: 0,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--card)",
  color: "var(--foreground)",
};

export function FilterSelect({ options, value, onChange, placeholder = "Tất cả", width }: FilterSelectProps) {
  return (
    <select
      value={value ?? ""}
      onChange={e => onChange?.(e.target.value)}
      style={{ ...SELECT_STYLE, width: width ?? "auto" }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
