import React from "react";
import { cn } from "@/lib/utils";

export interface TreeOption {
  label: string;
  value: string;
  isHeader?: boolean;
  level?: number;
}

interface TreeFilterSelectProps {
  options: TreeOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  width?: number | string;
  className?: string;
}

export const SELECT_STYLE: React.CSSProperties = {
  fontSize: 12.5,
  padding: "7px 28px 7px 10px",
  flexShrink: 0,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--card)",
  color: "var(--foreground)",
  height: 34,
};

export function TreeFilterSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Tất cả", 
  width, 
  className 
}: TreeFilterSelectProps) {
  return (
    <select
      value={value ?? ""}
      onChange={e => onChange?.(e.target.value)}
      className={cn("form-select form-select-sm", className)}
      style={{ 
        ...SELECT_STYLE, 
        width: width ?? "auto",
        borderRadius: className?.includes("rounded-pill") ? 50 : 8
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o, idx) => (
        <option 
          key={`${o.value}-${idx}`} 
          value={o.value} 
          disabled={o.isHeader}
          style={{
            color: o.isHeader ? "#94a3b8" : "inherit",
            fontWeight: o.isHeader ? "600" : "normal",
            backgroundColor: o.isHeader ? "#f8fafc" : "transparent",
            paddingLeft: o.level ? `${o.level * 12}px` : "10px"
          }}
        >
          {o.isHeader ? o.label : `${"\u00A0".repeat((o.level || 0) * 2)}${o.label}`}
        </option>
      ))}
    </select>
  );
}
