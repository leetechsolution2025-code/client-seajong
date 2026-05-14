"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)" }} />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      style={{
        position: "relative",
        width: 36,
        height: 36,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.06)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
      }}
    >
      {/* Sun — hiện khi đang dark */}
      <i
        className="bi bi-brightness-high-fill"
        style={{
          position: "absolute",
          fontSize: "1rem",
          color: "#f59e0b",
          opacity: isDark ? 1 : 0,
          transform: isDark ? "scale(1) rotate(0deg)" : "scale(0) rotate(90deg)",
          transition: "all 0.25s",
        }}
      />
      {/* Moon — hiện khi đang light */}
      <i
        className="bi bi-moon-stars-fill"
        style={{
          position: "absolute",
          fontSize: "1rem",
          color: "#818cf8",
          opacity: isDark ? 0 : 1,
          transform: isDark ? "scale(0) rotate(-90deg)" : "scale(1) rotate(0deg)",
          transition: "all 0.25s",
        }}
      />
    </button>
  );
}
