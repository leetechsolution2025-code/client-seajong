"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ConfirmDialogVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  isStatic?: boolean;   // true = click backdrop không đóng
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG: Record<ConfirmDialogVariant, {
  icon: string; iconBg: string; iconColor: string;
  btnBg: string; btnHover: string;
}> = {
  danger: {
    icon: "bi-trash3-fill",
    iconBg: "color-mix(in srgb, #f43f5e 12%, transparent)",
    iconColor: "#f43f5e",
    btnBg: "#f43f5e",
    btnHover: "#e11d48",
  },
  warning: {
    icon: "bi-exclamation-triangle-fill",
    iconBg: "color-mix(in srgb, #f59e0b 12%, transparent)",
    iconColor: "#f59e0b",
    btnBg: "#f59e0b",
    btnHover: "#d97706",
  },
  info: {
    icon: "bi-info-circle-fill",
    iconBg: "color-mix(in srgb, #6366f1 12%, transparent)",
    iconColor: "#6366f1",
    btnBg: "#6366f1",
    btnHover: "#4f46e5",
  },
};

export function ConfirmDialog({
  open, title, message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  variant = "danger",
  loading = false,
  isStatic = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const cfg = VARIANT_CONFIG[variant];
  const [shake, setShake] = React.useState(false);

  const handleBackdropClick = () => {
    if (loading) return;
    if (isStatic) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } else {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleBackdropClick}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(4px)",
              zIndex: 100100,
              cursor: isStatic ? "default" : "pointer",
            }}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: shake ? [0, -6, 6, -4, 4, 0] : 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: "fixed", inset: 0, margin: "auto",
              zIndex: 100101,
              width: "min(420px, calc(100vw - 40px))",
              height: "fit-content",
              background: "var(--card)",
              borderRadius: 18,
              boxShadow: "0 24px 60px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06)",
              padding: "28px 28px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Icon + Text */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: cfg.iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className={`bi ${cfg.icon}`} style={{ fontSize: 20, color: cfg.iconColor }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--foreground)", lineHeight: 1.3 }}>
                  {title}
                </p>
                <div style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                  {message}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={onCancel}
                disabled={loading}
                style={{
                  padding: "9px 20px", borderRadius: 10,
                  border: "1.5px solid var(--border)",
                  background: "transparent", color: "var(--foreground)",
                  fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s", opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "var(--muted)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                {cancelLabel}
              </button>

              <button
                onClick={onConfirm}
                disabled={loading}
                style={{
                  padding: "9px 22px", borderRadius: 10,
                  border: "none",
                  background: cfg.btnBg, color: "#fff",
                  fontSize: 13.5, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 7,
                  transition: "opacity 0.15s",
                  opacity: loading ? 0.7 : 1,
                  minWidth: 100, justifyContent: "center",
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                {loading
                  ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang xử lý...</>
                  : <><i className={`bi ${cfg.icon}`} style={{ fontSize: 13 }} /> {confirmLabel}</>
                }
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
