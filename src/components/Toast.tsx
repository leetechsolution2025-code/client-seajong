"use client";

import React, { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 3500
}

// ─── Config ──────────────────────────────────────────────────────────────────
const TOAST_CONFIG: Record<ToastType, { bg: string; border: string; icon: string; iconColor: string }> = {
  success: {
    bg: "linear-gradient(135deg, #0f766e 0%, #10b981 100%)",
    border: "rgba(16,185,129,0.4)",
    icon: "bi-check-circle-fill",
    iconColor: "#6ee7b7",
  },
  error: {
    bg: "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)",
    border: "rgba(239,68,68,0.4)",
    icon: "bi-x-circle-fill",
    iconColor: "#fca5a5",
  },
  warning: {
    bg: "linear-gradient(135deg, #92400e 0%, #f59e0b 100%)",
    border: "rgba(245,158,11,0.4)",
    icon: "bi-exclamation-triangle-fill",
    iconColor: "#fde68a",
  },
  info: {
    bg: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    border: "rgba(59,130,246,0.4)",
    icon: "bi-info-circle-fill",
    iconColor: "#93c5fd",
  },
};

// ─── Single Toast ─────────────────────────────────────────────────────────────
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = TOAST_CONFIG[item.type];
  const duration = item.duration ?? 3500;

  useEffect(() => {
    // mount animation
    const t1 = setTimeout(() => setVisible(true), 10);
    // auto-dismiss
    const t2 = setTimeout(() => dismiss(), duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(item.id), 320);
  };

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(110%) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)   scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0)   scale(1);    max-height: 120px; margin-bottom: 10px; }
          to   { opacity: 0; transform: translateX(110%) scale(0.95); max-height: 0;    margin-bottom: 0;   }
        }
      `}</style>
      <div
        onClick={dismiss}
        style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: 14,
          padding: "14px 16px",
          color: "#fff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.16)",
          cursor: "pointer",
          minWidth: 300, maxWidth: 400,
          animation: leaving
            ? "toastOut 0.32s cubic-bezier(0.4,0,1,1) forwards"
            : visible
              ? "toastIn 0.35s cubic-bezier(0.2,0,0,1) forwards"
              : "none",
          opacity: visible ? 1 : 0,
          overflow: "hidden",
          position: "relative",
          userSelect: "none",
        }}
      >
        {/* Icon */}
        <i
          className={`bi ${cfg.icon}`}
          style={{ fontSize: 20, flexShrink: 0, color: cfg.iconColor, marginTop: 1 }}
        />

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{item.title}</div>
          {item.message && (
            <div style={{ fontSize: 12.5, opacity: 0.88, marginTop: 3, lineHeight: 1.4 }}>
              {item.message}
            </div>
          )}
        </div>

        {/* Close btn */}
        <button
          onClick={e => { e.stopPropagation(); dismiss(); }}
          style={{
            background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 6,
            width: 22, height: 22, cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 12, padding: 0, marginTop: 1,
          }}
        >
          <i className="bi bi-x" />
        </button>

        {/* Progress bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0,
          height: 3,
          background: "rgba(255,255,255,0.35)",
          borderRadius: "0 0 14px 14px",
          animation: visible ? `toastProgress ${duration}ms linear forwards` : "none",
          width: "100%",
        }} />
        <style>{`
          @keyframes toastProgress {
            from { transform: scaleX(1);  transform-origin: left; }
            to   { transform: scaleX(0);  transform-origin: left; }
          }
        `}</style>
      </div>
    </>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────
export function ToastContainer({ toasts, onDismiss }: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column-reverse", gap: 10,
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: "all" }}>
          <ToastCard item={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = (
    type: ToastType,
    title: string,
    message?: string,
    duration?: number,
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  };

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    toasts,
    dismiss,
    success: (title: string, msg?: string, dur?: number) => show("success", title, msg, dur),
    error:   (title: string, msg?: string, dur?: number) => show("error",   title, msg, dur),
    warning: (title: string, msg?: string, dur?: number) => show("warning", title, msg, dur),
    info:    (title: string, msg?: string, dur?: number) => show("info",    title, msg, dur),
  };
}
