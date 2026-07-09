"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
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
    const toast = useToast();
    const [isListening, setIsListening] = useState(false);

    const startVoiceSearch = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast.error('Trình duyệt không hỗ trợ tìm kiếm bằng giọng nói.');
        return;
      }
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        onChange?.(speechResult);
      };
      recognition.onerror = (event: any) => {
        toast.error('Lỗi nhận diện giọng nói: ' + event.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    };

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
            padding: "6px 50px 6px 36px", // Increased right padding from 10px to 50px to fit icons
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
        
        {/* Actions Container */}
        <div 
          className="d-flex align-items-center gap-1"
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}
        >
          {value && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onChange?.(""); }}
              style={{ border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center" }}
              title="Xóa tìm kiếm"
            >
              <i className="bi bi-x text-muted hover-text-foreground" style={{ fontSize: 16 }} />
            </button>
          )}
          {value && <div style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />}
          <button
            type="button"
            onClick={startVoiceSearch}
            style={{ border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center" }}
            title="Tìm kiếm bằng giọng nói"
          >
            <i className={`bi ${isListening ? 'bi-mic-fill text-danger' : 'bi-mic text-muted hover-text-foreground'}`} style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
