"use client";

import React from "react";

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = "Tìm kiếm...", onKeyDown, onFocus, onBlur, className, style, disabled }, ref) => {
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
          ref={ref}
          type="text"
          value={value ?? ""}
          onChange={e => onChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: "100%", 
            padding: "6px 10px 6px 36px",
            height: 34,
            borderRadius: 8,
            border: "1px solid var(--border)", 
            background: disabled ? "var(--muted)" : "var(--card)",
            color: "var(--foreground)", 
            fontSize: 12.5, 
            outline: "none",
            transition: "all 0.2s ease-in-out",
            cursor: disabled ? "not-allowed" : "text",
            opacity: disabled ? 0.7 : 1,
          }}
          onFocus={e => {
            if (disabled) return;
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)";
            e.currentTarget.style.background = "var(--background)";
            onFocus?.(e);
          }}
          onBlur={e => {
            if (disabled) return;
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.background = "var(--card)";
            onBlur?.(e);
          }}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
