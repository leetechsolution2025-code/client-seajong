"use client";

import React from "react";

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Tìm kiếm..." }: SearchInputProps) {
  return (
    <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
      <i
        className="bi bi-search"
        style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          fontSize: 13, color: "var(--muted-foreground)", pointerEvents: "none",
        }}
      />
      <input
        type="text"
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "6px 10px 6px 32px",
          border: "1px solid var(--border)", background: "var(--background)",
          color: "var(--foreground)", fontSize: 13, outline: "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </div>
  );
}
