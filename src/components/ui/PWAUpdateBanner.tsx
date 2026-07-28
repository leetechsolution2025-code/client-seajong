"use client";

import React, { useEffect, useState, useRef } from "react";

export function PWAUpdateBanner() {
  const [showPrompt, setShowPrompt] = useState(false);
  const initialVersion = useRef<string | null>(null);

  useEffect(() => {
    // 1. Fetch the version on first load to act as the baseline
    const fetchInitialVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const data = await res.json();
          initialVersion.current = data.version;
        }
      } catch (error) {
        console.error("Failed to fetch initial version:", error);
      }
    };

    fetchInitialVersion();

    // 2. Poll every 15 seconds to check if a new version exists
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const data = await res.json();
          // If we have an initial version and the server version is different, show prompt!
          if (initialVersion.current && initialVersion.current !== data.version) {
            setShowPrompt(true);
            clearInterval(interval); // Stop polling once we know there's an update
          }
        }
      } catch (error) {
        // Ignore network errors during polling (e.g., user is offline)
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 320,
        animation: "slideInUp 0.3s ease-out"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            background: "#0ea5e915",
            color: "#0ea5e9",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <i className="bi bi-arrow-down-circle-fill" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
            Phiên bản mới đã sẵn sàng
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
            Hệ thống vừa cập nhật tính năng mới. Bạn có muốn tải lại trang để áp dụng không?
          </p>
        </div>
      </div>
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted-foreground)",
            padding: "6px 12px",
            cursor: "pointer",
            borderRadius: 6
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          Để sau
        </button>
        <button
          onClick={handleUpdate}
          style={{
            background: "#0ea5e9",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 16px",
            borderRadius: 6,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(14,165,233,0.3)"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#0284c7")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#0ea5e9")}
        >
          Cập nhật ngay
        </button>
      </div>
    </div>
  );
}
