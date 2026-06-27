"use client";

import React, { useState, useEffect, useRef } from "react";

interface Option { 
  label: string; 
  value: string; 
}

interface MultiFilterSelectProps {
  placeholder: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  width?: number | string;
}

export function MultiFilterSelect({ placeholder, options, selectedValues, onChange, width = 180 }: MultiFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onChange([]);
    }
  };

  const handleSelectOption = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, optionValue]);
    } else {
      onChange(selectedValues.filter(val => val !== optionValue));
    }
  };

  // Label text to display on the button
  const displayLabel = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === 1) {
      const selectedOpt = options.find(o => o.value === selectedValues[0]);
      return selectedOpt ? selectedOpt.label : placeholder;
    }
    return `${placeholder} (${selectedValues.length})`;
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: "relative", 
        width: typeof width === "number" ? `${width}px` : width,
        flexShrink: 0 
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: "100%",
          height: 34,
          fontSize: "12.5px",
          padding: "7px 12px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--card)",
          color: selectedValues.length > 0 ? "#003087" : "var(--foreground)",
          fontWeight: selectedValues.length > 0 ? 700 : 500,
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          outline: "none",
          boxShadow: isOpen ? "0 0 0 2px rgba(0, 48, 135, 0.2)" : "none",
          transition: "all 0.15s"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
          {displayLabel()}
        </span>
        <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`} style={{ fontSize: 10, opacity: 0.7 }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxHeight: 250,
            overflowY: "auto",
            padding: "6px 0"
          }}
        >
          {/* Option: Tất cả */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              margin: 0,
              cursor: "pointer",
              fontSize: "12.5px",
              fontWeight: selectedValues.length === 0 ? 700 : 500,
              background: selectedValues.length === 0 ? "rgba(0, 48, 135, 0.04)" : "transparent",
              transition: "background 0.1s"
            }}
            onMouseEnter={e => { if (selectedValues.length !== 0) e.currentTarget.style.background = "var(--muted)"; }}
            onMouseLeave={e => { if (selectedValues.length !== 0) e.currentTarget.style.background = "transparent"; }}
          >
            <input
              type="checkbox"
              className="form-check-input shadow-none m-0"
              checked={selectedValues.length === 0}
              onChange={e => handleSelectAll(e.target.checked)}
              style={{ width: 14, height: 14, cursor: "pointer" }}
            />
            <span>Tất cả</span>
          </label>

          {/* List Options */}
          {options.map((opt) => {
            const isChecked = selectedValues.includes(opt.value);
            return (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  margin: 0,
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: isChecked ? 700 : 500,
                  background: isChecked ? "rgba(0, 48, 135, 0.04)" : "transparent",
                  transition: "background 0.1s"
                }}
                onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = "var(--muted)"; }}
                onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = "transparent"; }}
              >
                <input
                  type="checkbox"
                  className="form-check-input shadow-none m-0"
                  checked={isChecked}
                  onChange={e => handleSelectOption(opt.value, e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer" }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
