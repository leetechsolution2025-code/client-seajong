"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log lỗi để debug
    console.error("Dashboard Level Error:", error);
  }, [error]);

  return (
    <div style={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      padding: "40px",
      textAlign: "center",
      background: "var(--background)",
      color: "var(--foreground)"
    }}>
      <div style={{ 
        width: "64px", 
        height: "64px", 
        borderRadius: "50%", 
        background: "rgba(239, 68, 68, 0.1)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        marginBottom: "20px"
      }}>
        <i className="bi bi-exclamation-triangle" style={{ fontSize: "32px", color: "#ef4444" }} />
      </div>
      
      <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
        Đã xảy ra lỗi không mong muốn
      </h2>
      
      <p style={{ 
        color: "var(--muted-foreground)", 
        maxWidth: "480px", 
        marginBottom: "32px",
        lineHeight: 1.6 
      }}>
        Hệ thống gặp sự cố khi tải trang này. Chúng tôi đã ghi nhận lỗi và sẽ khắc phục sớm. 
        Vui lòng thử lại hoặc quay lại trang chủ.
      </p>
      
      <div style={{ display: "flex", gap: "12px" }}>
        <button 
          onClick={() => reset()}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--foreground)",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Thử lại
        </button>
        
        <button 
          onClick={() => window.location.href = "/"}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            border: "none",
            background: "var(--primary)",
            color: "white",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Về trang chủ
        </button>
      </div>
      
      {process.env.NODE_ENV === "development" && (
        <div style={{ 
          marginTop: "40px", 
          padding: "16px", 
          background: "var(--muted)", 
          borderRadius: "8px",
          textAlign: "left",
          maxWidth: "100%",
          overflow: "auto",
          fontSize: "12px",
          fontFamily: "monospace"
        }}>
          <p style={{ fontWeight: "bold", color: "#ef4444", marginBottom: "8px" }}>Debug Info:</p>
          <pre>{error.message}</pre>
          <pre style={{ opacity: 0.5 }}>{error.stack}</pre>
        </div>
      )}
    </div>
  );
}
