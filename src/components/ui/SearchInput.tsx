"use client";

import React from "react";

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function SearchInput({ value, onChange, placeholder = "Tìm kiếm...", onKeyDown, className, style }: SearchInputProps) {
  return (
    <div className={className} style={{ position: "relative", minWidth: 0, ...style }}>
      <i
        className="bi bi-search"
        style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          fontSize: 12, color: "var(--muted-foreground)", pointerEvents: "none",
        }}
      />
      <input
        type="text"
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%", 
          padding: "6px 10px 6px 36px",
          height: 34,
          borderRadius: 8,
          border: "1px solid var(--border)", 
          background: "var(--card)",
          color: "var(--foreground)", 
          fontSize: 12.5, 
          outline: "none",
          transition: "all 0.2s ease-in-out",
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)";
          e.currentTarget.style.background = "var(--background)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.background = "var(--card)";
        }}
      />
    </div>
  );
}
